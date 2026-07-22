import type { RequestHandler } from 'express';
import Order from '../models/Order.js';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { BadRequestError } from '../utils/errors.js';
import { cached, cacheKey } from '../utils/cache.js';

/**
 * Business analytics.
 *
 * Everything here is computed by MongoDB's aggregation pipeline rather than
 * by loading documents into Node and reducing them. That difference matters:
 * summing revenue in application code means transferring every order over the
 * wire, and it stops working long before the dataset is genuinely large.
 *
 * Results are cached briefly — a dashboard refreshed every few seconds should
 * not re-scan the orders collection each time.
 */

const CACHE_TTL_SECONDS = 120;

/** Orders that represent real money: cancelled ones never count. */
const REVENUE_MATCH = { status: { $ne: 'cancelled' } } as const;

const parseDays = (value: unknown, fallback: number): number => {
  if (value === undefined) return fallback;

  const days = Number(value);
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    throw new BadRequestError('days must be a whole number between 1 and 365');
  }
  return days;
};

const daysAgo = (days: number): Date => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

// @desc    Revenue and order count per day
// @route   GET /api/analytics/revenue?days=30
// @access  Private/Admin
export const getRevenueSeries: RequestHandler = asyncHandler(async (req, res) => {
  const days = parseDays(req.query.days, 30);
  const since = daysAgo(days);

  const series = await cached(cacheKey('analytics', 'revenue', days), CACHE_TTL_SECONDS, () =>
    Order.aggregate<{ date: string; revenue: number; orders: number }>([
      { $match: { ...REVENUE_MATCH, createdAt: { $gte: since } } },
      {
        $group: {
          // Grouping on a formatted date rather than a raw timestamp is what
          // collapses individual orders into daily buckets.
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: '$_id', revenue: 1, orders: 1 } },
    ])
  );

  // Days with no orders are absent from the aggregation, which would draw a
  // misleading chart: a flat line between two points instead of a dip to
  // zero. They are filled in here.
  const byDate = new Map(series.map((point) => [point.date, point]));
  const filled: { date: string; revenue: number; orders: number }[] = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = daysAgo(offset).toISOString().slice(0, 10);
    filled.push(byDate.get(date) ?? { date, revenue: 0, orders: 0 });
  }

  res.json({ days, series: filled });
});

// @desc    Best-selling items by units and by revenue
// @route   GET /api/analytics/top-items?days=30&limit=10
// @access  Private/Admin
export const getTopItems: RequestHandler = asyncHandler(async (req, res) => {
  const days = parseDays(req.query.days, 30);
  const limit = Math.min(Math.max(Number(req.query.limit ?? 10), 1), 50);
  const since = daysAgo(days);

  const items = await cached(
    cacheKey('analytics', 'top-items', days, limit),
    CACHE_TTL_SECONDS,
    () =>
      Order.aggregate<{
        menuItem: string;
        name: string;
        unitsSold: number;
        revenue: number;
      }>([
        { $match: { ...REVENUE_MATCH, createdAt: { $gte: since } } },
        // One document per line item, so quantities can be summed per product.
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.menuItem',
            name: { $first: '$items.name' },
            unitsSold: { $sum: '$items.quantity' },
            revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          },
        },
        { $sort: { unitsSold: -1 } },
        { $limit: limit },
        { $project: { _id: 0, menuItem: '$_id', name: 1, unitsSold: 1, revenue: 1 } },
      ])
  );

  res.json({ days, items });
});

// @desc    Order volume by hour of day and day of week
// @route   GET /api/analytics/peak-hours?days=30
// @access  Private/Admin
export const getPeakHours: RequestHandler = asyncHandler(async (req, res) => {
  const days = parseDays(req.query.days, 30);
  const since = daysAgo(days);

  const [byHour, byWeekday] = await Promise.all([
    cached(cacheKey('analytics', 'by-hour', days), CACHE_TTL_SECONDS, () =>
      Order.aggregate<{ hour: number; orders: number }>([
        { $match: { ...REVENUE_MATCH, createdAt: { $gte: since } } },
        { $group: { _id: { $hour: '$createdAt' }, orders: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, hour: '$_id', orders: 1 } },
      ])
    ),
    cached(cacheKey('analytics', 'by-weekday', days), CACHE_TTL_SECONDS, () =>
      Order.aggregate<{ weekday: number; orders: number }>([
        { $match: { ...REVENUE_MATCH, createdAt: { $gte: since } } },
        // $dayOfWeek is 1=Sunday .. 7=Saturday.
        { $group: { _id: { $dayOfWeek: '$createdAt' }, orders: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, weekday: '$_id', orders: 1 } },
      ])
    ),
  ]);

  // Quiet hours are meaningful on this chart, so every slot is present.
  const hours = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    orders: byHour.find((point) => point.hour === hour)?.orders ?? 0,
  }));

  const weekdays = Array.from({ length: 7 }, (_, index) => ({
    weekday: index + 1,
    orders: byWeekday.find((point) => point.weekday === index + 1)?.orders ?? 0,
  }));

  res.json({ days, hours, weekdays });
});

// @desc    Headline metrics with period-over-period comparison
// @route   GET /api/analytics/summary?days=30
// @access  Private/Admin
export const getSummary: RequestHandler = asyncHandler(async (req, res) => {
  const days = parseDays(req.query.days, 30);
  const since = daysAgo(days);
  // The equally long window immediately before, so growth is like-for-like.
  const previousSince = daysAgo(days * 2);

  const summary = await cached(
    cacheKey('analytics', 'summary', days),
    CACHE_TTL_SECONDS,
    async () => {
      const totalsFor = async (from: Date, to: Date) => {
        const [result] = await Order.aggregate<{
          revenue: number;
          orders: number;
          averageOrderValue: number;
        }>([
          { $match: { ...REVENUE_MATCH, createdAt: { $gte: from, $lt: to } } },
          {
            $group: {
              _id: null,
              revenue: { $sum: '$totalAmount' },
              orders: { $sum: 1 },
              averageOrderValue: { $avg: '$totalAmount' },
            },
          },
        ]);

        return {
          revenue: result?.revenue ?? 0,
          orders: result?.orders ?? 0,
          averageOrderValue: Math.round(result?.averageOrderValue ?? 0),
        };
      };

      const now = new Date();
      const [current, previous, newCustomers, repeatCustomers] = await Promise.all([
        totalsFor(since, now),
        totalsFor(previousSince, since),
        User.countDocuments({ createdAt: { $gte: since } }),
        // Customers with more than one order in the window: the single best
        // indicator that the product is working.
        Order.aggregate<{ count: number }>([
          { $match: { ...REVENUE_MATCH, createdAt: { $gte: since } } },
          { $group: { _id: '$user', orders: { $sum: 1 } } },
          { $match: { orders: { $gt: 1 } } },
          { $count: 'count' },
        ]).then(([result]) => result?.count ?? 0),
      ]);

      // Guarded: growth from a zero baseline is undefined, not infinite.
      const growth = (now_: number, before: number): number | null =>
        before === 0 ? null : Math.round(((now_ - before) / before) * 100);

      return {
        current,
        previous,
        growth: {
          revenue: growth(current.revenue, previous.revenue),
          orders: growth(current.orders, previous.orders),
        },
        newCustomers,
        repeatCustomers,
      };
    }
  );

  res.json({ days, ...summary });
});
