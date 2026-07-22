import crypto from 'crypto';
import Razorpay from 'razorpay';

/**
 * Razorpay integration.
 *
 * Two rules govern everything here:
 *
 * 1. The amount is always taken from the order we already priced server-side.
 *    A client never states what it is about to pay.
 * 2. An order only becomes `paid` when a signature we can verify says so —
 *    either the checkout handshake signature or a webhook signature. A client
 *    reporting "payment succeeded" proves nothing.
 */

export class PaymentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaymentError';
  }
}

/** Payments are optional: without keys the app runs in cash-on-delivery mode. */
export const paymentsEnabled = (): boolean =>
  Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

let client: Razorpay | null = null;

const getClient = (): Razorpay => {
  if (!paymentsEnabled()) {
    throw new PaymentError('Online payment is not configured');
  }
  client ??= new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  return client;
};

/** The publishable key. Safe to hand to the browser; the secret never is. */
export const publishableKey = (): string | null => process.env.RAZORPAY_KEY_ID ?? null;

export interface CreatedPaymentOrder {
  providerOrderId: string;
  amount: number; // paise
  currency: string;
  keyId: string;
}

/**
 * Opens a payment against an order that has already been priced.
 *
 * @param orderId   our own order id, echoed back by the provider
 * @param amountInr the authoritative rupee total from priceOrder()
 */
export const createPaymentOrder = async (
  orderId: string,
  amountInr: number
): Promise<CreatedPaymentOrder> => {
  // Razorpay works in the smallest currency unit. Rounding here rather than
  // trusting float arithmetic avoids amounts like 31499.999999999996.
  const amount = Math.round(amountInr * 100);

  const providerOrder = await getClient().orders.create({
    amount,
    currency: 'INR',
    receipt: orderId,
    // Lets us find the local order from a webhook without a second lookup.
    notes: { orderId },
  });

  return {
    providerOrderId: providerOrder.id,
    amount,
    currency: providerOrder.currency,
    keyId: process.env.RAZORPAY_KEY_ID as string,
  };
};

/**
 * Verifies the signature the browser receives when checkout completes.
 *
 * This is what stops a client from POSTing an arbitrary payment id: the
 * signature is an HMAC over `<providerOrderId>|<paymentId>` keyed with the
 * secret, which only Razorpay and this server know.
 */
export const verifyCheckoutSignature = (
  providerOrderId: string,
  paymentId: string,
  signature: string
): boolean => {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${providerOrderId}|${paymentId}`)
    .digest('hex');

  return timingSafeEqual(expected, signature);
};

/**
 * Verifies a webhook delivery. Signed with a different secret from checkout,
 * over the exact raw body — which is why the webhook route must be mounted
 * with a raw body parser rather than express.json().
 */
export const verifyWebhookSignature = (rawBody: Buffer | string, signature: string): boolean => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return timingSafeEqual(expected, signature);
};

/** Constant-time compare, so a wrong signature cannot be brute-forced byte by byte. */
const timingSafeEqual = (a: string, b: string): boolean => {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};
