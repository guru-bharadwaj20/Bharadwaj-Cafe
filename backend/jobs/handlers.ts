import Order from '../models/Order.js';
import User from '../models/User.js';
import {
  sendOrderConfirmationEmail,
  sendOrderStatusEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from '../utils/email.js';
import type { JobName, JobPayloads } from './queues.js';

/**
 * What each job actually does.
 *
 * Kept separate from the queue wiring so the same functions can run inside a
 * worker or inline when no queue exists — and so they can be tested without
 * Redis at all.
 *
 * Every handler must be safe to run more than once: BullMQ retries, and a
 * retry after a partial failure will re-execute the whole handler.
 */
type Handlers = {
  [K in JobName]: (payload: JobPayloads[K]) => Promise<void>;
};

/**
 * Dispatches a job by name with its payload.
 *
 * The indirection exists because indexing `handlers` with a union of names
 * gives a union of function types, which TypeScript will only call with the
 * *intersection* of their parameters. Narrowing inside a generic keeps each
 * handler's payload type intact at every call site.
 */
export const runJob = async <K extends JobName>(
  name: K,
  payload: JobPayloads[K]
): Promise<void> => {
  const handler = handlers[name] as (p: JobPayloads[K]) => Promise<void>;
  await handler(payload);
};

export const handlers: Handlers = {
  'verification-email': ({ email, token }) => sendVerificationEmail(email, token),

  'password-reset-email': ({ email, token }) => sendPasswordResetEmail(email, token),

  'order-confirmation-email': async ({ email, orderId }) => {
    // The order is re-read rather than carried in the payload: a queued job
    // may run seconds later, and the stored order is the source of truth.
    const order = await Order.findById(orderId);
    if (!order) return; // deleted before the job ran; nothing to send
    await sendOrderConfirmationEmail(email, order);
  },

  'order-status-email': async ({ email, orderId, status }) => {
    const order = await Order.findById(orderId);
    if (!order) return;
    await sendOrderStatusEmail(email, order, status);
  },

  /**
   * Recomputes every customer's loyalty tier from their lifetime spend.
   *
   * Tiers are normally updated when an order is delivered, but that can drift:
   * a refund, a manual correction or a changed threshold leaves stale tiers.
   * This is the periodic reconciliation.
   */
  'recalculate-loyalty-tiers': async () => {
    const tierFor = (spent: number): string => {
      if (spent >= 10000) return 'Platinum';
      if (spent >= 5000) return 'Gold';
      if (spent >= 1000) return 'Silver';
      return 'Bronze';
    };

    // Lifetime spend is summed in the database, not by loading every order.
    const totals = await Order.aggregate<{ _id: string; total: number }>([
      { $match: { status: 'delivered' } },
      { $group: { _id: '$user', total: { $sum: '$totalAmount' } } },
    ]);

    let corrected = 0;

    for (const { _id: userId, total } of totals) {
      const expected = tierFor(total);
      const result = await User.updateOne(
        { _id: userId, loyaltyTier: { $ne: expected } },
        { $set: { loyaltyTier: expected, totalSpent: total } }
      );
      corrected += result.modifiedCount;
    }

    if (corrected > 0) {
      console.log(`[jobs] loyalty reconciliation corrected ${corrected} tier(s)`);
    }
  },
};
