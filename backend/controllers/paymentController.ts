import type { Request, RequestHandler, Response } from 'express';
import Order, { type HydratedOrder } from '../models/Order.js';
import type { HydratedUser } from '../models/User.js';
import {
  createPaymentOrder,
  PaymentError,
  paymentsEnabled,
  publishableKey,
  verifyCheckoutSignature,
  verifyWebhookSignature,
} from '../config/payments.js';
import { emitToAdmins, emitToUser } from '../utils/realtime.js';
import type { Server } from 'socket.io';
import { childLogger } from '../utils/logger.js';

const log = childLogger({ module: 'payments' });

const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

const getIo = (req: Request): Server | undefined => req.app.get('io') as Server | undefined;

/**
 * Marks an order paid, exactly once.
 *
 * Both the checkout callback and the webhook can arrive for the same payment,
 * in either order, and the webhook may be retried for days. Guarding on
 * `paymentStatus` makes the transition idempotent: whichever proof arrives
 * first wins, and every later one is a no-op.
 */
const markPaid = async (
  order: HydratedOrder,
  paymentId: string,
  io: Server | undefined
): Promise<boolean> => {
  if (order.paymentStatus === 'completed') {
    return false;
  }

  order.paymentStatus = 'completed';
  order.paymentId = paymentId;
  order.paidAt = new Date();
  // A paid order is confirmed; leave any later status (preparing, ready)
  // alone so a webhook retry cannot walk the order backwards.
  if (order.status === 'pending') {
    order.status = 'confirmed';
  }
  await order.save();

  emitToUser(io, order.user, 'orderPaid', { orderId: order._id, status: order.status });
  emitToAdmins(io, 'orderPaid', { orderId: order._id, totalAmount: order.totalAmount });
  return true;
};

// @desc    Report whether online payment is available, and with which key
// @route   GET /api/payments/config
// @access  Public
export const getPaymentConfig: RequestHandler = (_req, res) => {
  res.json({ enabled: paymentsEnabled(), keyId: publishableKey() });
};

// @desc    Open a payment against an existing order
// @route   POST /api/payments/orders/:orderId
// @access  Private (owner only)
export const createPaymentForOrder: RequestHandler = async (req, res) => {
  try {
    if (!paymentsEnabled()) {
      res.status(503).json({ message: 'Online payment is not configured' });
      return;
    }

    const order = await Order.findById(req.params.orderId);
    const user = req.user as HydratedUser;

    if (!order || !order.user.equals(user._id)) {
      // 404 rather than 403: an order id is not a capability.
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    if (order.paymentStatus === 'completed') {
      res.status(409).json({ message: 'This order has already been paid' });
      return;
    }

    if (order.status === 'cancelled') {
      res.status(409).json({ message: 'This order was cancelled' });
      return;
    }

    // The amount comes from the stored, server-computed total. The request
    // body is not consulted at all.
    const payment = await createPaymentOrder(order._id.toString(), order.totalAmount);

    order.providerOrderId = payment.providerOrderId;
    await order.save();

    res.status(201).json({
      providerOrderId: payment.providerOrderId,
      amount: payment.amount,
      currency: payment.currency,
      keyId: payment.keyId,
      orderId: order._id,
    });
  } catch (error) {
    if (error instanceof PaymentError) {
      res.status(503).json({ message: error.message });
      return;
    }
    log.error({ err: error }, 'Create payment error');
    res.status(502).json({ message: errorMessage(error, 'Could not start payment') });
  }
};

// @desc    Confirm a payment using the signature returned by checkout
// @route   POST /api/payments/verify
// @access  Private (owner only)
export const verifyPayment: RequestHandler = async (req, res) => {
  try {
    const { providerOrderId, paymentId, signature } = req.body as {
      providerOrderId?: string;
      paymentId?: string;
      signature?: string;
    };

    if (!providerOrderId || !paymentId || !signature) {
      res.status(400).json({ message: 'providerOrderId, paymentId and signature are required' });
      return;
    }

    // Verify before touching the database, so a forged call cannot even
    // confirm whether an order exists.
    if (!verifyCheckoutSignature(providerOrderId, paymentId, signature)) {
      res.status(400).json({ message: 'Payment signature verification failed' });
      return;
    }

    const order = await Order.findOne({ providerOrderId });
    const user = req.user as HydratedUser;

    if (!order || !order.user.equals(user._id)) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    await markPaid(order, paymentId, getIo(req));

    res.json({
      orderId: order._id,
      paymentStatus: order.paymentStatus,
      status: order.status,
    });
  } catch (error) {
    log.error({ err: error }, 'Verify payment error');
    res.status(500).json({ message: errorMessage(error, 'Could not verify payment') });
  }
};

/**
 * Razorpay webhook.
 *
 * The authoritative confirmation: it arrives even if the customer closes the
 * tab mid-payment, and Razorpay retries it until we answer 2xx. `req.body` is
 * a Buffer here — the raw bytes are what the signature covers, so this route
 * is mounted with express.raw() rather than express.json().
 *
 * @route POST /api/payments/webhook
 * @access Public (authenticated by signature)
 */
export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  const signature = req.header('x-razorpay-signature');
  const rawBody = req.body as Buffer;

  if (!signature || !verifyWebhookSignature(rawBody, signature)) {
    res.status(400).json({ message: 'Invalid signature' });
    return;
  }

  let event: {
    event?: string;
    payload?: { payment?: { entity?: { id?: string; order_id?: string } } };
  };

  try {
    event = JSON.parse(rawBody.toString('utf8')) as typeof event;
  } catch {
    res.status(400).json({ message: 'Malformed payload' });
    return;
  }

  try {
    const entity = event.payload?.payment?.entity;
    const providerOrderId = entity?.order_id;
    const paymentId = entity?.id;

    if (event.event === 'payment.captured' && providerOrderId && paymentId) {
      const order = await Order.findOne({ providerOrderId });
      if (order) {
        await markPaid(order, paymentId, getIo(req));
      }
    } else if (event.event === 'payment.failed' && providerOrderId) {
      const order = await Order.findOne({ providerOrderId });
      // Never overwrite a completed payment: a failed retry can be delivered
      // after a successful one.
      if (order && order.paymentStatus !== 'completed') {
        order.paymentStatus = 'failed';
        await order.save();
      }
    }

    // Acknowledge anything we understood, including events we ignore —
    // otherwise Razorpay retries them indefinitely.
    res.json({ received: true });
  } catch (error) {
    // A 5xx asks for a retry, which is what we want if our own write failed.
    log.error({ err: error }, 'Webhook processing error');
    res.status(500).json({ message: 'Webhook processing failed' });
  }
};
