import { Queue, type JobsOptions } from 'bullmq';
import { redisEnabled } from '../config/redis.js';

/**
 * Job queues.
 *
 * Like Redis itself, queues are optional: without REDIS_URL, `enqueue` runs
 * the work inline instead. That keeps local development single-process while
 * production gets retries, backoff and a request path that does not wait on
 * SMTP.
 */

export const QUEUE_EMAIL = 'email';
export const QUEUE_MAINTENANCE = 'maintenance';

/** Named payloads, so a typo in a job name is a compile error. */
export interface JobPayloads {
  'verification-email': { email: string; token: string };
  'password-reset-email': { email: string; token: string };
  'order-confirmation-email': { email: string; orderId: string };
  'order-status-email': { email: string; orderId: string; status: string };
  'recalculate-loyalty-tiers': Record<string, never>;
}

export type JobName = keyof JobPayloads;

/** Which queue each job belongs to. */
export const QUEUE_FOR: Record<JobName, string> = {
  'verification-email': QUEUE_EMAIL,
  'password-reset-email': QUEUE_EMAIL,
  'order-confirmation-email': QUEUE_EMAIL,
  'order-status-email': QUEUE_EMAIL,
  'recalculate-loyalty-tiers': QUEUE_MAINTENANCE,
};

// Retries with exponential backoff: SMTP failures are usually transient, and
// hammering a rate-limited provider makes them worse.
export const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 4,
  backoff: { type: 'exponential', delay: 5000 },
  // Keep a short tail for debugging without growing Redis unbounded.
  removeOnComplete: { age: 3600, count: 100 },
  removeOnFail: { age: 24 * 3600, count: 500 },
};

const queues = new Map<string, Queue>();

export const getQueue = (name: string): Queue | null => {
  if (!redisEnabled()) return null;

  let queue = queues.get(name);
  if (!queue) {
    queue = new Queue(name, {
      connection: { url: process.env.REDIS_URL as string },
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });
    queues.set(name, queue);
  }
  return queue;
};

export const closeQueues = async (): Promise<void> => {
  await Promise.all([...queues.values()].map((queue) => queue.close()));
  queues.clear();
};
