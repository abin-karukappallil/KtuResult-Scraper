import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../init";
import { KTUPortalResponseError, KTUSessionExpiredError, scrapeKTUResults } from "@/lib/ktuScraprt";
import { generateToken } from "@/lib/apiToken";
import { encryptCredential } from "@/lib/crypto";
import {
  saveJob,
  deleteJob,
  getJob,
  getJobKey,
  JOB_TTL_MS,
} from "@/lib/jobStore";
import { sendResultNotificationEmail } from "@/lib/emailService";
import { TRPCError } from "@trpc/server";

const getResultsInputSchema = z.object({
  sessionToken: z.string()
    .trim()
    .transform((value) => value.replace(/^JSESSIONID=/i, ""))
    .pipe(
      z.string()
        .min(1, "JSESSION TOKEN is required")
        .max(4096)
        .regex(/^[\x21\x23-\x2B\x2D-\x3A\x3C-\x5B\x5D-\x7E]+$/, "Enter a single JSESSIONID cookie value"),
    ),
  semesterId: z.number().int().min(1).max(8),
  studentId: z.string().optional(),
});

const subscribeWatcherSchema = getResultsInputSchema.extend({
  email: z.string().email("Please provide a valid email address"),
});

const sendEmailResultSchema = z.object({
  to: z.string().email("Invalid email"),
  semesterId: z.number().int().min(1).max(8),
  courses: z.array(
    z.object({
      courseCode: z.string(),
      courseName: z.string(),
      credit: z.string(),
      grade: z.string(),
    })
  ),
  sgpa: z.string().optional(),
  sourceMode: z.enum(["live_watcher", "background_cron"]).default("live_watcher"),
});

const watcherJobInputSchema = z.object({ jobId: z.uuid() });

async function getPortalResults(input: z.output<typeof getResultsInputSchema>) {
  try {
    return await scrapeKTUResults(input);
  } catch (error) {
    if (error instanceof KTUSessionExpiredError) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: error.message });
    }
    if (error instanceof KTUPortalResponseError) {
      throw new TRPCError({ code: "BAD_GATEWAY", message: error.message });
    }
    throw error;
  }
}

export const resultRouter = createTRPCRouter({
  getToken: publicProcedure.query(() => generateToken()),

  getResults: protectedProcedure
    .input(getResultsInputSchema)
    .mutation(async ({ input }) => {
      try {
        const result = await getPortalResults(input);

        return {
          courses: result.courses,
          sgpa: result.sgpa,
          count: result.courses.length,
          message: result.courses.length === 0 ? "No results found for this semester." : undefined,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[TRPC] KTU SCRAPER ERROR:", error);

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Unknown scraper error",
        });
      }
    }),

  subscribeWatcher: protectedProcedure
    .input(subscribeWatcherSchema)
    .mutation(async ({ input }) => {
      try {
        const existingResults = await getPortalResults(input);

        if (existingResults.courses.length > 0) {
          await sendResultNotificationEmail({
            to: input.email,
            semesterId: input.semesterId,
            courses: existingResults.courses,
            sgpa: existingResults.sgpa,
            sourceMode: "background_cron",
          });

          return {
            status: "already_available" as const,
            courses: existingResults.courses,
            sgpa: existingResults.sgpa,
            message: "Results are already published! An email has been sent right away, no background job needed.",
          };
        }

        const jobId = randomUUID();
        const now = Date.now();

        await saveJob({
          id: getJobKey(jobId),
          encryptedSessionToken: encryptCredential(input.sessionToken),
          semesterId: input.semesterId,
          studentId: input.studentId,
          email: input.email,
          createdAt: now,
          expiresAt: now + JOB_TTL_MS,
          checkCount: 1,
          lastCheckedAt: now,
        });

        return {
          status: "subscribed" as const,
          jobId,
          expiresAt: now + JOB_TTL_MS,
          message:
            "Background watcher active while your KTU session is valid.",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[WATCHER] Registration failed:", error);
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error
              ? error.message
              : "Failed to start the background watcher",
        });
      }
    }),

  cancelWatcher: protectedProcedure
    .input(watcherJobInputSchema)
    .mutation(async ({ input }) => {
      const deleted = await deleteJob(getJobKey(input.jobId));
      return { success: deleted };
    }),

  getWatcherStatus: protectedProcedure
    .input(watcherJobInputSchema)
    .mutation(async ({ input }) => {
      const job = await getJob(getJobKey(input.jobId));
      if (!job) {
        return { active: false };
      }
      return {
        active: true,
        email: job.email,
        expiresAt: job.expiresAt,
        checkCount: job.checkCount,
        lastCheckedAt: job.lastCheckedAt,
      };
    }),

  sendEmailResult: protectedProcedure
    .input(sendEmailResultSchema)
    .mutation(async ({ input }) => {
      try {
        const result = await sendResultNotificationEmail({
          to: input.to,
          semesterId: input.semesterId,
          courses: input.courses,
          sgpa: input.sgpa,
          sourceMode: input.sourceMode,
        });
        return result;
      } catch (error) {
        console.error("[TRPC] Failed to dispatch email:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to send email",
        });
      }
    }),
});
