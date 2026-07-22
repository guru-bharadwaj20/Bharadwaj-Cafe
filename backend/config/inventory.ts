import mongoose, { type ClientSession } from 'mongoose';
import MenuItem from '../models/MenuItem.js';
import type { IOrderItem } from '../models/Order.js';
import { ConflictError } from '../utils/errors.js';
import { childLogger } from '../utils/logger.js';

const log = childLogger({ module: 'inventory' });

/**
 * Stock reservation.
 *
 * The hard part is concurrency: two customers buying the last croissant at
 * the same moment must not both succeed. Read-then-write cannot guarantee
 * that — between the read and the write, the other request can slip in.
 *
 * Every decrement here is a single conditional update:
 *
 *   updateOne({ _id, stock: { $gte: qty } }, { $inc: { stock: -qty } })
 *
 * MongoDB applies that atomically to one document, so exactly one of two
 * racing requests matches and the other sees modifiedCount === 0. The check
 * and the write are the same operation, so there is no window between them.
 *
 * Across *several* items an order also needs all-or-nothing, which a single
 * document update cannot give. That is what the transaction adds — but
 * transactions need a replica set, so `reserveStock` works either way and
 * compensates manually when they are unavailable.
 */

export interface StockShortfall {
  name: string;
  requested: number;
  available: number;
}

/**
 * Are we on a deployment that supports multi-document transactions?
 *
 * They require a replica set or a sharded cluster. Atlas provides one; a
 * plain local mongod and the in-memory server used by tests do not.
 */
const transactionsSupported = (): boolean => {
  const description = (
    mongoose.connection.getClient() as unknown as {
      topology?: { description?: { type?: string } };
    }
  ).topology?.description?.type;

  return description === 'ReplicaSetWithPrimary' || description === 'Sharded';
};

/**
 * Decrements stock for one item, atomically.
 * @returns true if the reservation succeeded.
 */
const decrement = async (
  menuItemId: unknown,
  quantity: number,
  session?: ClientSession
): Promise<boolean> => {
  const result = await MenuItem.updateOne(
    // The condition is the guard: it only matches if enough is left *now*.
    { _id: menuItemId, stock: { $ne: null, $gte: quantity } },
    { $inc: { stock: -quantity } },
    session ? { session } : {}
  );

  return result.modifiedCount === 1;
};

/** Puts stock back, used to compensate a partial reservation. */
const restore = async (
  menuItemId: unknown,
  quantity: number,
  session?: ClientSession
): Promise<void> => {
  await MenuItem.updateOne(
    { _id: menuItemId, stock: { $ne: null } },
    { $inc: { stock: quantity } },
    session ? { session } : {}
  );
};

/**
 * Reserves stock for an entire order, all-or-nothing.
 *
 * Items with `stock: null` are not tracked and always succeed.
 *
 * @throws ConflictError naming every item that could not be satisfied.
 */
export const reserveStock = async (items: IOrderItem[]): Promise<void> => {
  const tracked = await MenuItem.find({
    _id: { $in: items.map((item) => item.menuItem) },
    stock: { $ne: null },
  })
    .select('_id name stock')
    .lean();

  if (tracked.length === 0) return; // nothing on this order is stock-tracked

  const trackedIds = new Set(tracked.map((item) => item._id.toString()));
  const toReserve = items.filter((item) => trackedIds.has(item.menuItem.toString()));

  if (transactionsSupported()) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        for (const item of toReserve) {
          const ok = await decrement(item.menuItem, item.quantity, session);
          if (!ok) {
            // Aborting rolls back every decrement in this transaction.
            throw new ConflictError(
              buildShortfallMessage(tracked, item.menuItem.toString(), item.quantity)
            );
          }
        }
      });
    } finally {
      await session.endSession();
    }
    return;
  }

  // No transactions available (standalone mongod, and in tests). Each
  // decrement is still individually atomic, so overselling is impossible;
  // only the all-or-nothing property needs compensating by hand.
  const reserved: IOrderItem[] = [];

  for (const item of toReserve) {
    const ok = await decrement(item.menuItem, item.quantity);
    if (ok) {
      reserved.push(item);
      continue;
    }

    // Roll back what we already took before reporting the failure.
    for (const done of reserved) {
      await restore(done.menuItem, done.quantity);
    }

    throw new ConflictError(
      buildShortfallMessage(tracked, item.menuItem.toString(), item.quantity)
    );
  }
};

/** Returns stock after an order is cancelled. */
export const releaseStock = async (items: IOrderItem[]): Promise<void> => {
  for (const item of items) {
    await restore(item.menuItem, item.quantity);
  }
  log.info({ items: items.length }, 'released stock for a cancelled order');
};

const buildShortfallMessage = (
  tracked: { _id: unknown; name: string; stock: number | null }[],
  menuItemId: string,
  requested: number
): string => {
  const item = tracked.find((candidate) => String(candidate._id) === menuItemId);
  const name = item?.name ?? 'An item';
  const available = item?.stock ?? 0;

  return available === 0
    ? `${name} is out of stock`
    : `Only ${available} of ${name} left (you asked for ${requested})`;
};

/** Items at or below their low-stock threshold, for the admin dashboard. */
export const getLowStockItems = () =>
  MenuItem.find({
    stock: { $ne: null },
    $expr: { $lte: ['$stock', '$lowStockThreshold'] },
  })
    .select('name stock lowStockThreshold category')
    .sort({ stock: 1 })
    .lean();
