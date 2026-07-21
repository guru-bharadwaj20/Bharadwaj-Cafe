import { Types } from 'mongoose';
import MenuItem from '../models/MenuItem.js';
import type { IOrderItem } from '../models/Order.js';

export const TAX_RATE = 0.05;

/** Narrows an untrusted value to a usable ObjectId string, or null. */
const asObjectIdString = (value: unknown): string | null => {
  if (value instanceof Types.ObjectId) return value.toString();
  if (typeof value === 'string' && Types.ObjectId.isValid(value)) return value;
  return null;
};

export class PricingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PricingError';
  }
}

/** What a client is allowed to say about a line item: which, and how many. */
export interface RequestedItem {
  menuItem?: unknown;
  _id?: unknown;
  quantity?: unknown;
}

export interface PricedOrder {
  items: Required<IOrderItem>[];
  subtotal: number;
  tax: number;
  totalAmount: number;
}

/**
 * Rebuilds an order's line items and totals from the database.
 *
 * The client is only trusted to say *which* item and *how many* — never what
 * anything costs. Prices, the subtotal, tax and the grand total are all read
 * from the current menu, which makes it impossible to tamper with the amount
 * charged by editing the request body.
 */
export const priceOrder = async (requestedItems: unknown): Promise<PricedOrder> => {
  if (!Array.isArray(requestedItems) || requestedItems.length === 0) {
    throw new PricingError('No order items');
  }

  if (requestedItems.length > 100) {
    throw new PricingError('Too many line items in a single order');
  }

  // Collapse duplicate references so the same item cannot be listed twice to
  // sidestep per-line validation.
  const quantityById = new Map<string, number>();

  for (const line of requestedItems as RequestedItem[]) {
    const id = line?.menuItem ?? line?._id;
    const quantity = Number(line?.quantity ?? 1);

    // Only a string or an ObjectId is a usable reference. Accepting anything
    // else would stringify to "[object Object]" and quietly become a lookup
    // for an id that cannot exist.
    const key = asObjectIdString(id);
    if (!key) {
      throw new PricingError('Each order item must reference a menu item');
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
      throw new PricingError('Item quantity must be a whole number between 1 and 50');
    }

    quantityById.set(key, (quantityById.get(key) ?? 0) + quantity);
  }

  const ids = [...quantityById.keys()];
  const menuItems = await MenuItem.find({ _id: { $in: ids } });

  if (menuItems.length !== ids.length) {
    throw new PricingError('One or more items are no longer on the menu');
  }

  const unavailable = menuItems.filter((item) => !item.available);
  if (unavailable.length > 0) {
    throw new PricingError(
      `Currently unavailable: ${unavailable.map((item) => item.name).join(', ')}`
    );
  }

  const items = menuItems.map((menuItem) => ({
    menuItem: menuItem._id,
    name: menuItem.name,
    // Every id came from quantityById, so this lookup cannot miss.
    quantity: quantityById.get(menuItem._id.toString()) as number,
    price: menuItem.price, // authoritative unit price
  }));

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = Math.round(subtotal * TAX_RATE);

  return { items, subtotal, tax, totalAmount: subtotal + tax };
};
