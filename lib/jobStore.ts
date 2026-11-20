import { createHash } from "node:crypto";
import { Redis } from "@upstash/redis";
import type { EncryptedData } from "./crypto";

export interface WatchJob {
  id: string;
  encryptedSessionToken: EncryptedData;
  semesterId: number;
  studentId?: string;
  email: string;
  createdAt: number;
  expiresAt: number;
  lastCheckedAt?: number;
  checkCount: number;
}

export const JOB_TTL_SECONDS = 12 * 60 * 60;
export const JOB_TTL_MS = JOB_TTL_SECONDS * 1000;

class MemoryJobStore {
  private store = new Map<string, WatchJob>();

  set(job: WatchJob, updateExisting: boolean): void {
    if (updateExisting && !this.get(job.id)) return;
    this.store.set(job.id, job);
  }

  get(id: string): WatchJob | null {
    const job = this.store.get(id);
    if (!job) return null;
    if (Date.now() > job.expiresAt) {
      this.store.delete(id);
      return null;
    }
    return job;
  }

  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }

  async listAll(): Promise<WatchJob[]> {
    const now = Date.now();
    const jobs: WatchJob[] = [];
    for (const [id, job] of this.store.entries()) {
      if (now > job.expiresAt) {
        this.store.delete(id);
      } else {
        jobs.push(job);
      }
    }
    return jobs;
  }
}

const memoryStore = new MemoryJobStore();

function getRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    return new Redis({ url, token });
  }
  return null;
}

export function getJobKey(jobId: string): string {
  return `ktu_session_job:${createHash("sha256").update(jobId).digest("hex")}`;
}

export async function saveJob(job: WatchJob, updateExisting = false): Promise<void> {
  const ttlSeconds = Math.ceil((job.expiresAt - Date.now()) / 1000);
  if (ttlSeconds <= 0) return;

  const redis = getRedisClient();
  if (redis) {
    await redis.set(job.id, JSON.stringify(job), updateExisting
      ? { ex: ttlSeconds, xx: true }
      : { ex: ttlSeconds });
  } else {
    memoryStore.set(job, updateExisting);
  }
}

export async function getJob(id: string): Promise<WatchJob | null> {
  const redis = getRedisClient();
  if (redis) {
    const data = await redis.get<WatchJob | string>(id);
    if (!data) return null;
    return typeof data === "string" ? JSON.parse(data) : data;
  }
  return memoryStore.get(id);
}

export async function deleteJob(id: string): Promise<boolean> {
  const redis = getRedisClient();
  if (redis) {
    const deletedCount = await redis.del(id);
    console.log(`[JOB_STORE] Job purged from Redis: ${id}`);
    return deletedCount > 0;
  }
  console.log(`[JOB_STORE] Job purged from Memory store: ${id}`);
  return memoryStore.delete(id);
}

export async function listAllJobs(): Promise<WatchJob[]> {
  const redis = getRedisClient();
  if (redis) {
    const keys = await redis.keys("ktu_session_job:*");
    if (!keys || keys.length === 0) return [];

    const jobs: WatchJob[] = [];
    for (const key of keys) {
      const data = await redis.get<WatchJob | string>(key);
      if (data) {
        const parsed = typeof data === "string" ? JSON.parse(data) : data;
        jobs.push(parsed);
      }
    }
    return jobs;
  }
  return memoryStore.listAll();
}
