import { createHash } from "node:crypto";
import * as cheerio from "cheerio";

export interface CourseResult {
  courseCode: string;
  courseName: string;
  credit: string;
  grade: string;
}

export interface ScraperInput {
  sessionToken: string;
  semesterId: number;
  studentId?: string;
}

export interface ScraperResult {
  courses: CourseResult[];
  sgpa?: string;
  cgpa?: string;
}

const gradeCardUrl = "https://app.ktu.edu.in/eu/res/semesterGradeCardListing.htm";
const csrfTokenInput = "input[name='CSRF_TOKEN']";
const routingCookieCacheTtlMs = 30 * 60 * 1000;
const routingCookieCacheLimit = 256;

interface CachedRoutingCookies {
  cookies: ReadonlyMap<string, string>;
  expiresAt: number;
}

declare global {
  var __ktuRoutingCookieCache: Map<string, CachedRoutingCookies> | undefined;
}

const routingCookieCache = (
  globalThis.__ktuRoutingCookieCache ??= new Map<string, CachedRoutingCookies>()
);

export class KTUSessionExpiredError extends Error {
  constructor() {
    super("Your KTU session is invalid or expired. Sign in on the official portal and enter a fresh JSESSION TOKEN.");
    this.name = "KTUSessionExpiredError";
  }
}

export class KTUPortalResponseError extends Error {
  constructor(readonly status: number) {
    super(`KTU portal responded with HTTP ${status}. Try again shortly.`);
    this.name = "KTUPortalResponseError";
  }
}

function mergeRoutingCookies(cookies: Map<string, string>, headers: Headers): void {
  for (const header of headers.getSetCookie()) {
    const [pair] = header.split(";", 1);
    const separator = pair.indexOf("=");
    if (separator < 1) continue;

    const name = pair.slice(0, separator).trim();
    if (name !== "AWSALB" && name !== "AWSALBCORS") continue;

    const value = pair.slice(separator + 1).trim();
    if (!value || value === "deleteMe") {
      cookies.delete(name);
    } else {
      cookies.set(name, value);
    }
  }
}

function cacheRoutingCookies(key: string, cookies: ReadonlyMap<string, string>): void {
  routingCookieCache.delete(key);
  if (!cookies.size) return;

  routingCookieCache.set(key, {
    cookies,
    expiresAt: Date.now() + routingCookieCacheTtlMs,
  });

  if (routingCookieCache.size > routingCookieCacheLimit) {
    const oldestKey = routingCookieCache.keys().next().value;
    if (oldestKey !== undefined) routingCookieCache.delete(oldestKey);
  }
}

async function requestGradeCard(
  sessionToken: string,
  routingCookies: ReadonlyMap<string, string>,
  body?: URLSearchParams,
) {
  const method = body ? "POST" : "GET";
  const cookies = [`JSESSIONID=${sessionToken}`];
  for (const [name, value] of routingCookies) {
    cookies.push(`${name}=${value}`);
  }

  const response = await fetch(gradeCardUrl, {
    method,
    body,
    redirect: "manual",
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
    headers: {
      Accept: "text/html,application/xhtml+xml",
      Cookie: cookies.join("; "),
      ...(body && {
        Origin: "https://app.ktu.edu.in",
        Referer: gradeCardUrl,
      }),
    },
  });

  const location = response.headers.get("location") ?? "";
  const redirectedToLogin = response.status >= 300 && response.status < 400 &&
    /(?:^|\/)login(?:\.htm)?(?:[?#]|$)/i.test(location);
  console.log("[KTU] Grade card response", {
    method,
    upstreamStatus: response.status,
    redirectedToLogin,
    hasSetCookie: response.headers.has("set-cookie"),
    routingCookiesSent: [...routingCookies.keys()],
  });

  if (response.status === 401 || redirectedToLogin) {
    throw new KTUSessionExpiredError();
  }
  if (!response.ok) {
    throw new KTUPortalResponseError(response.status);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const hasSessionExpiredText = html.toLowerCase().includes("session expired");
  const hasLoginForm = $("input[name='password']").length > 0;
  if (hasSessionExpiredText || hasLoginForm) {
    console.log("[KTU] Grade card response indicates an expired session", {
      method,
      upstreamStatus: response.status,
      hasSessionExpiredText,
      hasLoginForm,
    });
    throw new KTUSessionExpiredError();
  }

  return { page: $, headers: response.headers };
}

async function loadGradeCardForm(
  { sessionToken, semesterId, studentId }: ScraperInput,
  routingCookies: Map<string, string>,
): Promise<URLSearchParams> {
  const gradeCard = await requestGradeCard(sessionToken, routingCookies);
  const csrfToken = gradeCard.page(csrfTokenInput).first().attr("value");
  if (!csrfToken) {
    throw new Error("Could not read the CSRF token from the KTU grade card.");
  }

  mergeRoutingCookies(routingCookies, gradeCard.headers);
  return new URLSearchParams({
    CSRF_TOKEN: csrfToken,
    form_name: "semesterGradeCardListingSearchForm",
    semesterId: semesterId.toString(),
    stdId: studentId ?? "",
    search: "Search",
  });
}

export async function scrapeKTUResults(input: ScraperInput): Promise<ScraperResult> {
  const { sessionToken } = input;
  const cacheKey = createHash("sha256").update(sessionToken).digest("hex");
  const cached = routingCookieCache.get(cacheKey);
  if (cached && cached.expiresAt <= Date.now()) routingCookieCache.delete(cacheKey);
  const routingCookies = new Map(routingCookieCache.get(cacheKey)?.cookies);

  let form;
  try {
    form = await loadGradeCardForm(input, routingCookies);
  } catch (error) {
    if (!(error instanceof KTUSessionExpiredError) || !routingCookies.size) throw error;

    if (routingCookieCache.get(cacheKey) === cached) routingCookieCache.delete(cacheKey);
    routingCookies.clear();
    form = await loadGradeCardForm(input, routingCookies);
  }

  let resultResponse;
  try {
    resultResponse = await requestGradeCard(sessionToken, routingCookies, form);
  } catch (error) {
    if (!(error instanceof KTUPortalResponseError) || error.status !== 412) throw error;

    const refreshedForm = await loadGradeCardForm(input, routingCookies);
    resultResponse = await requestGradeCard(sessionToken, routingCookies, refreshedForm);
  }

  const courses = parseResultTable(resultResponse.page);
  const sgpa = calculateSGPA(courses);

  mergeRoutingCookies(routingCookies, resultResponse.headers);
  cacheRoutingCookies(cacheKey, routingCookies);

  return {
    courses,
    sgpa
  };
}

function parseResultTable($: cheerio.CheerioAPI): CourseResult[] {
  const courses: CourseResult[] = [];

  const table = $("table").filter((_, table) => {
    const header = $(table).text().toLowerCase();
    return (
      header.includes("course") &&
      header.includes("credit") &&
      header.includes("grade")
    );
  }).first();

  if (!table.length) return [];

  let codeIdx = -1;
  let nameIdx = -1;
  let creditIdx = -1;
  let gradeIdx = -1;

  table
    .find("tr")
    .first()
    .find("th, td")
    .each((i, cell) => {
      const text = $(cell).text().trim().toLowerCase();

      if (text.includes("course code") || text === "code") codeIdx = i;
      else if (text.includes("course name")) nameIdx = i;
      else if (text.includes("credit")) creditIdx = i;
      else if (text.includes("grade")) gradeIdx = i;
    });

  if (codeIdx === -1) codeIdx = 1;
  if (nameIdx === -1) nameIdx = 2;
  if (creditIdx === -1) creditIdx = 3;
  if (gradeIdx === -1) gradeIdx = 4;

  table.find("tr").each((_, row) => {
    const cells = $(row).find("td");

    if (cells.length < 3) return;

    const courseCode = $(cells[codeIdx]).text().trim();
    const courseName = $(cells[nameIdx]).text().trim();
    const credit = $(cells[creditIdx]).text().trim();
    const grade = $(cells[gradeIdx]).text().trim();

    if (
      !courseCode ||
      courseCode.toLowerCase() === "code" ||
      courseCode.toLowerCase().includes("course")
    ) {
      return;
    }

    courses.push({
      courseCode,
      courseName,
      credit,
      grade,
    });
  });

  return courses;
}

function calculateSGPA(courses: CourseResult[]): string {
  const gradePoints: Record<string, number> = {
    "S": 10,
    "A+": 9,
    "A": 8.5,
    "B+": 8,
    "B": 7.5,
    "C+": 7,
    "C": 6.5,
    "D": 6,
    "P": 5.5,
    "F": 0,
    "FE": 0,
    "ABSENT": 0
  };

  let totalCredits = 0;
  let weightedPoints = 0;

  for (const course of courses) {
    const credit = Number(course.credit);
    const grade = course.grade.trim().toUpperCase();

    const gradePoint = gradePoints[grade] ?? 0;

    totalCredits += credit;
    weightedPoints += credit * gradePoint;
  }

  if (totalCredits === 0) {
    return "0.00";
  }

  const sgpa = weightedPoints / totalCredits;

  return sgpa.toFixed(2);
}
