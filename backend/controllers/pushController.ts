import type { RequestHandler } from 'express';
import PushSubscription from '../models/PushSubscription.js';
import type { HydratedUser } from '../models/User.js';
import { publicKey, pushEnabled, sendToUser } from '../config/push.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { BadRequestError } from '../utils/errors.js';

// @desc    Report whether push is available, and the public VAPID key
// @route   GET /api/push/config
// @access  Public
export const getPushConfig: RequestHandler = (_req, res) => {
  res.json({ enabled: pushEnabled(), publicKey: publicKey() });
};

// @desc    Register a device for notifications
// @route   POST /api/push/subscribe
// @access  Private
export const subscribe: RequestHandler = asyncHandler(async (req, res) => {
  const { endpoint, keys } = req.body as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };

  if (!endpoint || !keys?.p256dh || !keys.auth) {
    throw new BadRequestError('A complete push subscription is required');
  }

  const user = req.user as HydratedUser;

  // Upsert on endpoint: re-subscribing the same device replaces its keys
  // (they rotate) and re-points it at the current user rather than leaving a
  // stale row that would push to whoever used this browser before.
  await PushSubscription.findOneAndUpdate(
    { endpoint },
    { user: user._id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    { upsert: true, new: true }
  );

  res.status(201).json({ message: 'Notifications enabled' });
});

// @desc    Remove a device
// @route   DELETE /api/push/subscribe
// @access  Private
export const unsubscribe: RequestHandler = asyncHandler(async (req, res) => {
  const { endpoint } = req.body as { endpoint?: string };

  if (!endpoint) {
    throw new BadRequestError('endpoint is required');
  }

  const user = req.user as HydratedUser;
  // Scoped to the caller, so one customer cannot unsubscribe another's device.
  await PushSubscription.deleteOne({ endpoint, user: user._id });

  res.json({ message: 'Notifications disabled' });
});

// @desc    Send a test notification to the caller's own devices
// @route   POST /api/push/test
// @access  Private
export const sendTest: RequestHandler = asyncHandler(async (req, res) => {
  const user = req.user as HydratedUser;

  const delivered = await sendToUser(user._id, {
    title: "Bharadwaj's Cafe",
    body: 'Notifications are working. We will let you know when your order is ready.',
    url: '/order-history',
    tag: 'test',
  });

  res.json({ delivered });
});
