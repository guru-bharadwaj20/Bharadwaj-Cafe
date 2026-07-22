/**
 * Background job behaviour.
 *
 * The property that matters: side effects must never be able to fail the
 * request that triggered them. Registration succeeds whether SMTP is up,
 * down, or hanging.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import User from '../models/User.js';
import Order from '../models/Order.js';
import { runJob } from '../jobs/handlers.js';
import { enqueue } from '../jobs/enqueue.js';
import * as email from '../utils/email.js';
import { createUser, createAdmin, createMenuItem, placeOrder, expectFound } from './factories.js';

const app = createApp();

beforeEach(() => {
  vi.clearAllMocks();
});

describe('inline execution without Redis', () => {
  it('runs the job immediately when no queue is configured', async () => {
    await enqueue('verification-email', { email: 'a@example.com', token: 'tok' });

    expect(email.sendVerificationEmail).toHaveBeenCalledWith('a@example.com', 'tok');
  });

  it('swallows a job failure rather than propagating it', async () => {
    vi.mocked(email.sendVerificationEmail).mockRejectedValueOnce(new Error('SMTP down'));

    // Must not reject: the caller is a request handler.
    await expect(
      enqueue('verification-email', { email: 'a@example.com', token: 'tok' })
    ).resolves.toBeUndefined();
  });
});

describe('registration is not coupled to email delivery', () => {
  it('still succeeds when the mailer throws', async () => {
    vi.mocked(email.sendVerificationEmail).mockRejectedValueOnce(new Error('SMTP down'));

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Resilient', email: 'resilient@example.com', password: 'password123' })
      .expect(201);

    expect(res.body.email).toBe('resilient@example.com');
    expect(await User.findOne({ email: 'resilient@example.com' })).toBeTruthy();
  });

  it('keeps the reset token valid even when the email fails', async () => {
    const { user } = await createUser(app);
    vi.mocked(email.sendPasswordResetEmail).mockRejectedValueOnce(new Error('SMTP down'));

    await request(app).post('/api/auth/forgot-password').send({ email: user.email }).expect(200);

    // Previously a send failure rolled the token back, leaving the user
    // unable to reset at all. The queue retries instead.
    const stored = expectFound(
      await User.findById(user._id).select('+resetPasswordToken +resetPasswordExpire')
    );
    expect(stored.resetPasswordToken).toMatch(/^[a-f0-9]{64}$/);
    expect(expectFound(stored.resetPasswordExpire).getTime()).toBeGreaterThan(Date.now());
  });
});

describe('order emails', () => {
  it('queues a confirmation when an order is placed', async () => {
    const { token } = await createUser(app);
    const item = await createMenuItem();

    await placeOrder(app, token, [{ menuItem: item._id, quantity: 1 }]);

    // Detached by design: the response does not wait for the send, so the
    // assertion has to.
    await vi.waitFor(() => expect(email.sendOrderConfirmationEmail).toHaveBeenCalledTimes(1));
  });

  it('queues a status email when an admin advances the order', async () => {
    const { token: adminToken } = await createAdmin(app);
    const { token } = await createUser(app);
    const item = await createMenuItem();
    const { body: order } = await placeOrder(app, token, [{ menuItem: item._id, quantity: 1 }]);

    await request(app)
      .put(`/api/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ready' })
      .expect(200);

    await vi.waitFor(() => expect(email.sendOrderStatusEmail).toHaveBeenCalledTimes(1));
  });

  it('does nothing if the order was deleted before the job ran', async () => {
    const { token } = await createUser(app);
    const item = await createMenuItem();
    const { body: order } = await placeOrder(app, token, [{ menuItem: item._id, quantity: 1 }]);

    await Order.findByIdAndDelete(order._id);
    vi.clearAllMocks();

    // A queued job can outlive its subject; it must not throw.
    await expect(
      runJob('order-confirmation-email', { email: 'x@example.com', orderId: order._id })
    ).resolves.toBeUndefined();
    expect(email.sendOrderConfirmationEmail).not.toHaveBeenCalled();
  });
});

describe('loyalty tier reconciliation', () => {
  it('corrects a tier that drifted from actual spend', async () => {
    const { token: adminToken } = await createAdmin(app);
    const { user, token } = await createUser(app);
    const item = await createMenuItem({ price: 6000 });

    const { body: order } = await placeOrder(app, token, [{ menuItem: item._id, quantity: 1 }]);
    await request(app)
      .put(`/api/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'delivered' })
      .expect(200);

    // Simulate drift: a manual correction left the tier wrong.
    await User.findByIdAndUpdate(user._id, { loyaltyTier: 'Bronze', totalSpent: 0 });

    await runJob('recalculate-loyalty-tiers', {});

    // 6000 + 5% = 6300 lifetime -> Gold.
    const fixed = expectFound(await User.findById(user._id));
    expect(fixed.loyaltyTier).toBe('Gold');
    expect(fixed.totalSpent).toBe(6300);
  });

  it('counts only delivered orders', async () => {
    const { user, token } = await createUser(app);
    const item = await createMenuItem({ price: 9000 });

    // Placed but never delivered: it must not count toward a tier.
    await placeOrder(app, token, [{ menuItem: item._id, quantity: 1 }]);

    await runJob('recalculate-loyalty-tiers', {});

    const unchanged = expectFound(await User.findById(user._id));
    expect(unchanged.loyaltyTier).toBe('Bronze');
  });

  it('is safe to run repeatedly', async () => {
    const { token: adminToken } = await createAdmin(app);
    const { user, token } = await createUser(app);
    const item = await createMenuItem({ price: 2000 });

    const { body: order } = await placeOrder(app, token, [{ menuItem: item._id, quantity: 1 }]);
    await request(app)
      .put(`/api/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'delivered' })
      .expect(200);

    await runJob('recalculate-loyalty-tiers', {});
    const first = expectFound(await User.findById(user._id));

    await runJob('recalculate-loyalty-tiers', {});
    const second = expectFound(await User.findById(user._id));

    // Totals must not accumulate on each run.
    expect(second.totalSpent).toBe(first.totalSpent);
    expect(second.loyaltyTier).toBe(first.loyaltyTier);
  });
});
