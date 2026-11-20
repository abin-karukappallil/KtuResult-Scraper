import { NextRequest, NextResponse } from "next/server";
import { runCronWatcherCheck } from "@/lib/cronRunner";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;

  const urlSecret = request.nextUrl.searchParams.get("secret");
  if (urlSecret === secret) return true;

  return false;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await runCronWatcherCheck();
    return NextResponse.json(summary);
  } catch (error) {
    console.error("[CRON ROUTE ERROR]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
