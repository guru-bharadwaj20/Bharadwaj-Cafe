import { runJob } from './handlers.js';
import { getQueue, QUEUE_FOR, type JobName, type JobPayloads } from './queues.js';

/**
 * Hands work to a queue, or runs it inline when no queue is configured.
 *
 * Callers never await the outcome of the work itself — only that it has been
 * accepted. That is the whole point: a slow SMTP server must not slow down a
 * registration response.
 */
export const enqueue = async <K extends JobName>(
  name: K,
  payload: JobPayloads[K]
): Promise<void> => {
  const queue = getQueue(QUEUE_FOR[name]);

  if (queue) {
    await queue.add(name, payload);
    return;
  }

  // No Redis: run it here, but never let a failed side effect fail the
  // request that triggered it. Errors are logged, not propagated.
  try {
    await runJob(name, payload);
  } catch (error) {
    console.error(`[jobs] inline "${name}" failed:`, error);
  }
};

/**
 * Fire-and-forget variant for request handlers, which should not wait even
 * for the enqueue round-trip.
 */
export const enqueueDetached = <K extends JobName>(name: K, payload: JobPayloads[K]): void => {
  void enqueue(name, payload).catch((error: unknown) => {
    console.error(`[jobs] could not enqueue "${name}":`, error);
  });
};

// Re-exported here so callers import one module rather than three.
export { QUEUE_EMAIL, QUEUE_MAINTENANCE } from './queues.js';
