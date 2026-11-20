import { runCronWatcherCheck } from "./cronRunner";

declare global {
  var __ktu_scheduler_started: boolean | undefined;
}

const CHECK_INTERVAL_MS = 10 * 60 * 1000;

export function startSelfHostedScheduler(): void {
  if (typeof window !== "undefined") return;
  if (process.env.DISABLE_INTERNAL_CRON === "true") return;
  if (globalThis.__ktu_scheduler_started) return;

  globalThis.__ktu_scheduler_started = true;
  console.log("[SCHEDULER] Self-hosted internal cron runner active (interval: 10m)");

  const timer = setInterval(async () => {
    try {
      await runCronWatcherCheck();
    } catch (error) {
      console.error("[SCHEDULER ERROR]:", error);
    }
  }, CHECK_INTERVAL_MS);

  if (typeof timer.unref === "function") {
    timer.unref();
  }
}
