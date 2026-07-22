/**
 * Background worker process.
 *
 * Run alongside the API: `npm run worker`. Deliberately a separate process —
 * a burst of email retries then competes for its own CPU rather than the
 * event loop that is serving customer requests, and the worker can be scaled
 * or restarted independently.
 */
import dotenv from 'dotenv';
import { Worker, type Job } from 'bullmq';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import { redisEnabled } from '../config/redis.js';
import { handlers, runJob } from './handlers.js';
import {
  getQueue,
  QUEUE_EMAIL,
  QUEUE_MAINTENANCE,
  type JobName,
  type JobPayloads,
} from './queues.js';

dotenv.config();

if (!redisEnabled()) {
  console.error('REDIS_URL is not set. Without it, jobs run inline in the API');
  console.error('and this worker has nothing to do.');
  process.exit(1);
}

const connection = { url: process.env.REDIS_URL as string };

const process_ = async (job: Job): Promise<void> => {
  const name = job.name as JobName;

  if (!(name in handlers)) {
    // Unknown job names are dropped rather than retried forever — they only
    // appear after a deploy removes a handler that still has queued work.
    console.warn(`[worker] no handler for job "${job.name}", discarding`);
    return;
  }

  await runJob(name, job.data as JobPayloads[typeof name]);
};

const workers = [QUEUE_EMAIL, QUEUE_MAINTENANCE].map((queueName) => {
  const worker = new Worker(queueName, process_, {
    connection,
    // Email is IO-bound; a handful in flight is plenty and keeps well inside
    // provider rate limits.
    concurrency: queueName === QUEUE_EMAIL ? 5 : 1,
  });

  worker.on('completed', (job) => {
    console.log(`[worker:${queueName}] ${job.name} ${job.id ?? ''} completed`);
  });

  worker.on('failed', (job, error) => {
    const attempts = job ? `${job.attemptsMade}/${job.opts.attempts ?? 1}` : 'unknown';
    console.error(
      `[worker:${queueName}] ${job?.name ?? 'job'} failed (attempt ${attempts}):`,
      error.message
    );
  });

  return worker;
});

const start = async (): Promise<void> => {
  await connectDB();

  // Nightly reconciliation. Registered by a stable key so restarting the
  // worker replaces the schedule rather than stacking duplicates.
  const maintenance = getQueue(QUEUE_MAINTENANCE);
  await maintenance?.add(
    'recalculate-loyalty-tiers',
    {},
    { repeat: { pattern: '0 3 * * *' }, jobId: 'nightly-loyalty-reconciliation' }
  );

  console.log(`[worker] listening on: ${QUEUE_EMAIL}, ${QUEUE_MAINTENANCE}`);
  console.log('[worker] scheduled: loyalty reconciliation daily at 03:00');
};

// Close workers before exiting so an in-flight job is finished rather than
// abandoned mid-send.
const shutdown = async (signal: string): Promise<void> => {
  console.log(`[worker] ${signal} received, finishing in-flight jobs...`);
  await Promise.all(workers.map((worker) => worker.close()));
  await mongoose.disconnect();
  process.exit(0);
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

void start().catch((error: unknown) => {
  console.error('[worker] failed to start:', error);
  process.exit(1);
});
