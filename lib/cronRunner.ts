import { listAllJobs, deleteJob, saveJob } from "./jobStore";
import { decryptCredential } from "./crypto";
import { KTUSessionExpiredError, scrapeKTUResults } from "./ktuScraprt";
import { sendResultNotificationEmail } from "./emailService";

export interface CronRunResult {
  processed: number;
  resultsFound: number;
  stillPending: number;
  errors: Array<{ jobId: string; error: string }>;
  timestamp: string;
}

export async function runCronWatcherCheck(): Promise<CronRunResult> {
  const jobs = await listAllJobs();
  console.log(`[CRON] Starting check for ${jobs.length} registered watcher jobs...`);

  let resultsFound = 0;
  let stillPending = 0;
  const errors: Array<{ jobId: string; error: string }> = [];

  for (const job of jobs) {
    try {
      const scrapeResult = await scrapeKTUResults({
        sessionToken: decryptCredential(job.encryptedSessionToken),
        semesterId: job.semesterId,
        studentId: job.studentId,
      });

      if (scrapeResult.courses.length > 0) {
        await sendResultNotificationEmail({
          to: job.email,
          semesterId: job.semesterId,
          courses: scrapeResult.courses,
          sgpa: scrapeResult.sgpa,
          sourceMode: "background_cron",
        });

        await deleteJob(job.id);
        resultsFound++;
      } else {
        await saveJob({
          ...job,
          lastCheckedAt: Date.now(),
          checkCount: (job.checkCount || 0) + 1,
        }, true);

        stillPending++;
      }
    } catch (err) {
      if (err instanceof KTUSessionExpiredError) {
        await deleteJob(job.id);
        continue;
      }
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[CRON ERROR] Failed checking job ${job.id}:`, errorMessage);
      errors.push({ jobId: job.id, error: errorMessage });
    }
  }

  return {
    processed: jobs.length,
    resultsFound,
    stillPending,
    errors,
    timestamp: new Date().toISOString(),
  };
}
