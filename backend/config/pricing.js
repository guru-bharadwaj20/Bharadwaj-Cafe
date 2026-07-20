import MenuItem from '../models/MenuItem.js';

export const TAX_RATE = 0.05;

export class PricingError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PricingError';
  }
}

/**
 * Rebuilds an order's line items and totals from the database.
 *
 * The client is only trusted to say *which* item and *how many* — never what
 * anything costs. Prices, the subtotal, tax and the grand total are all read
 * from the current menu, which makes it impossible to tamper with the amount
 * charged by editing the request body.
 *
 * @param {Array<{menuItem?: string, _id?: string, quantity?: number}>} requestedItems
 * @returns {Promise<{items: Array, subtotal: number, tax: number, totalAmount: number}>}
 */
export const priceOrder = async (requestedItems) => {
  if (!Array.isArray(requestedItems) || requestedItems.length === 0) {
    throw new PricingError('No order items');
  }

  if (requestedItems.length > 100) {
    throw new PricingError('Too many line items in a single order');
  }

  // Collapse duplicate references so the same item cannot be listed twice to
  // sidestep per-line validation.
  const quantityById = new Map();

  for (const line of requestedItems) {
    const id = line?.menuItem ?? line?._id;
    const quantity = Number(line?.quantity ?? 1);

    if (!id) {
      throw new PricingError('Each order item must reference a menu item');
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
      throw new PricingError('Item quantity must be a whole number between 1 and 50');
    }

    quantityById.set(String(id), (quantityById.get(String(id)) || 0) + quantity);
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

  const items = menuItems.map((menuItem) => {
    const quantity = quantityById.get(menuItem._id.toString());
    return {
      menuItem: menuItem._id,
      name: menuItem.name,
      quantity,
      price: menuItem.price, // authoritative unit price
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = Math.round(subtotal * TAX_RATE);

  return { items, subtotal, tax, totalAmount: subtotal + tax };
};
