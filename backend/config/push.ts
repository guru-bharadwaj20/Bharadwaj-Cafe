import webpush from 'web-push';
import PushSubscription from '../models/PushSubscription.js';
import type { Types } from 'mongoose';
import { childLogger } from '../utils/logger.js';

const log = childLogger({ module: 'push' });

/**
 * Web Push notifications.
 *
 * Push is optional: without VAPID keys the app runs exactly as before and the
 * UI never offers to enable notifications.
 *
 * A subscription is a capability — anyone holding it can push to that device.
 * They are therefore stored per user, never returned to a client, and pruned
 * the moment the browser tells us they are dead.
 */

export const pushEnabled = (): boolean =>
  Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

let configured = false;

const configure = (): void => {
  if (configured || !pushEnabled()) return;

  webpush.setVapidDetails(
    // The subject identifies us to the push service if delivery goes wrong.
    process.env.VAPID_SUBJECT ?? 'mailto:support@bharadwajscafe.com',
    process.env.VAPID_PUBLIC_KEY as string,
    process.env.VAPID_PRIVATE_KEY as string
  );
  configured = true;
};

/** The public half only. Safe to hand to a browser; the private key never is. */
export const publicKey = (): string | null => process.env.VAPID_PUBLIC_KEY ?? null;

export interface PushPayload {
  title: string;
  body: string;
  /** Where clicking the notification should take the customer. */
  url?: string;
  /** Replaces an earlier notification with the same tag rather than stacking. */
  tag?: string;
}

/**
 * Sends a notification to every device a customer has registered.
 *
 * Dead subscriptions are deleted rather than retried: 404 and 410 mean the
 * browser has permanently discarded it, so keeping it would mean failing on
 * every future send forever.
 */
export const sendToUser = async (
  userId: Types.ObjectId | string,
  payload: PushPayload
): Promise<number> => {
  if (!pushEnabled()) return 0;
  configure();

  const subscriptions = await PushSubscription.find({ user: userId });
  if (subscriptions.length === 0) return 0;

  const body = JSON.stringify(payload);
  let delivered = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          body
        );
        delivered += 1;
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;

        if (statusCode === 404 || statusCode === 410) {
          // Gone for good — stop trying.
          await subscription.deleteOne();
          log.info({ endpoint: subscription.endpoint.slice(-12) }, 'pruned dead subscription');
        } else {
          log.warn({ err: error, statusCode }, 'push delivery failed');
        }
      }
    })
  );

  return delivered;
};
