/**
 * Analytics aggregations.
 *
 * These are the numbers a business would act on, so the tests assert exact
 * values against known data rather than just "returns an array".
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import { createUser, createAdmin, createMenuItem, placeOrder } from './factories.js';

const app = createApp();

const daysAgo = (days: number): Date => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

/**
 * Places an order and backdates it, so time-windowed queries can be tested.
 *
 * The write goes through the native driver on purpose: Mongoose marks
 * `createdAt` immutable when `timestamps` is enabled, so a normal update to
 * it is silently discarded and every order stays "today".
 */
const orderOn = async (token: string, itemId: unknown, quantity: number, days: number) => {
  const res = await placeOrder(app, token, [{ menuItem: itemId, quantity }]);
  await Order.collection.updateOne(
    { _id: new mongoose.Types.ObjectId(res.body._id as string) },
    { $set: { createdAt: daysAgo(days) } }
  );
  return res.body as { _id: string; totalAmount: number };
};

describe('access control', () => {
  it('is admin-only across the board', async () => {
    const { token } = await createUser(app);

    for (const path of ['summary', 'revenue', 'top-items', 'peak-hours']) {
      await request(app).get(`/api/analytics/${path}`).expect(401);
      await request(app)
        .get(`/api/analytics/${path}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    }
  });
});

describe('revenue over time', () => {
  it('buckets orders by day and includes days with no sales', async () => {
    const { token: adminToken } = await createAdmin(app);
    const { token } = await createUser(app);
    const item = await createMenuItem({ price: 100 }); // 105 with tax

    await orderOn(token, item._id, 1, 1);
    await orderOn(token, item._id, 2, 1); // same day
    await orderOn(token, item._id, 1, 3);

    const res = await request(app)
      .get('/api/analytics/revenue?days=7')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // A gap day must appear as zero, not be missing — otherwise a chart draws
    // a straight line across it and implies steady sales.
    expect(res.body.series).toHaveLength(7);

    const yesterday = res.body.series.find(
      (point: { date: string }) => point.date === daysAgo(1).toISOString().slice(0, 10)
    );
    expect(yesterday.orders).toBe(2);
    expect(yesterday.revenue).toBe(105 + 210);

    const quiet = res.body.series.find(
      (point: { date: string }) => point.date === daysAgo(2).toISOString().slice(0, 10)
    );
    expect(quiet.revenue).toBe(0);
  });

  it('excludes cancelled orders from revenue', async () => {
    const { token: adminToken } = await createAdmin(app);
    const { token } = await createUser(app);
    const item = await createMenuItem({ price: 1000 });

    const kept = await orderOn(token, item._id, 1, 1);
    const cancelled = await orderOn(token, item._id, 1, 1);
    await Order.findByIdAndUpdate(cancelled._id, { status: 'cancelled' });

    const res = await request(app)
      .get('/api/analytics/revenue?days=7')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const total = res.body.series.reduce(
      (sum: number, point: { revenue: number }) => sum + point.revenue,
      0
    );
    expect(total).toBe(kept.totalAmount);
  });

  it('rejects an out-of-range window', async () => {
    const { token } = await createAdmin(app);

    await request(app)
      .get('/api/analytics/revenue?days=0')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
    await request(app)
      .get('/api/analytics/revenue?days=9999')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });
});

describe('top items', () => {
  it('ranks by units sold and reports revenue per product', async () => {
    const { token: adminToken } = await createAdmin(app);
    const { token } = await createUser(app);

    const popular = await createMenuItem({ name: 'Filter Coffee', price: 100 });
    const premium = await createMenuItem({ name: 'Single Origin', price: 500 });

    await orderOn(token, popular._id, 10, 1);
    await orderOn(token, premium._id, 2, 1);

    const res = await request(app)
      .get('/api/analytics/top-items?days=7')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.items[0].name).toBe('Filter Coffee');
    expect(res.body.items[0].unitsSold).toBe(10);
    // Revenue is line price x quantity, excluding tax.
    expect(res.body.items[0].revenue).toBe(1000);

    expect(res.body.items[1].name).toBe('Single Origin');
    expect(res.body.items[1].revenue).toBe(1000);
  });

  it('aggregates the same product across separate orders', async () => {
    const { token: adminToken } = await createAdmin(app);
    const { token } = await createUser(app);
    const item = await createMenuItem({ name: 'Latte', price: 150 });

    await orderOn(token, item._id, 3, 1);
    await orderOn(token, item._id, 4, 2);

    const res = await request(app)
      .get('/api/analytics/top-items?days=7')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].unitsSold).toBe(7);
  });

  it('respects the window', async () => {
    const { token: adminToken } = await createAdmin(app);
    const { token } = await createUser(app);
    const item = await createMenuItem({ name: 'Old Favourite', price: 100 });

    await orderOn(token, item._id, 5, 60); // outside a 30-day window

    const res = await request(app)
      .get('/api/analytics/top-items?days=30')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.items).toHaveLength(0);
  });
});

describe('peak hours', () => {
  it('reports all 24 hours and all 7 weekdays', async () => {
    const { token: adminToken } = await createAdmin(app);
    const { token } = await createUser(app);
    const item = await createMenuItem();
    await orderOn(token, item._id, 1, 1);

    const res = await request(app)
      .get('/api/analytics/peak-hours?days=7')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // Quiet hours are meaningful on this chart, so none are omitted.
    expect(res.body.hours).toHaveLength(24);
    expect(res.body.weekdays).toHaveLength(7);

    const total = res.body.hours.reduce(
      (sum: number, point: { orders: number }) => sum + point.orders,
      0
    );
    expect(total).toBe(1);
  });
});

describe('summary', () => {
  it('compares the window against the one before it', async () => {
    const { token: adminToken } = await createAdmin(app);
    const { token } = await createUser(app);
    const item = await createMenuItem({ price: 1000 }); // 1050 with tax

    // Two orders this week, one the week before: 100% growth.
    await orderOn(token, item._id, 1, 2);
    await orderOn(token, item._id, 1, 3);
    await orderOn(token, item._id, 1, 10);

    const res = await request(app)
      .get('/api/analytics/summary?days=7')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.current.orders).toBe(2);
    expect(res.body.current.revenue).toBe(2100);
    expect(res.body.previous.orders).toBe(1);
    expect(res.body.growth.revenue).toBe(100);
    expect(res.body.current.averageOrderValue).toBe(1050);
  });

  it('reports null growth rather than infinity from a zero baseline', async () => {
    const { token: adminToken } = await createAdmin(app);
    const { token } = await createUser(app);
    const item = await createMenuItem({ price: 500 });

    await orderOn(token, item._id, 1, 1); // nothing in the prior window

    const res = await request(app)
      .get('/api/analytics/summary?days=7')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // Dividing by zero would render as "Infinity%" on the dashboard.
    expect(res.body.growth.revenue).toBeNull();
  });

  it('counts customers who ordered more than once', async () => {
    const { token: adminToken } = await createAdmin(app);
    const loyal = await createUser(app);
    const oneOff = await createUser(app);
    const item = await createMenuItem({ price: 100 });

    await orderOn(loyal.token, item._id, 1, 1);
    await orderOn(loyal.token, item._id, 1, 2);
    await orderOn(oneOff.token, item._id, 1, 1);

    const res = await request(app)
      .get('/api/analytics/summary?days=7')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.repeatCustomers).toBe(1);
  });

  it('handles an empty dataset without dividing by zero', async () => {
    const { token } = await createAdmin(app);

    const res = await request(app)
      .get('/api/analytics/summary?days=30')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.current.revenue).toBe(0);
    expect(res.body.current.averageOrderValue).toBe(0);
    expect(res.body.growth.revenue).toBeNull();
  });
});
