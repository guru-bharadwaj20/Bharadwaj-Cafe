import type { Request, RequestHandler } from 'express';
import type { Server } from 'socket.io';
import Order, {
  type HydratedOrder,
  type OrderStatus,
  type OrderType,
  type PaymentMethod,
} from '../models/Order.js';
import type { HydratedUser } from '../models/User.js';
import { updateLoyalty } from './loyaltyController.js';
import { priceOrder } from '../config/pricing.js';
import { releaseStock, reserveStock } from '../config/inventory.js';
import { emitToAdmins, emitToUser } from '../utils/realtime.js';
import { enqueueDetached } from '../jobs/enqueue.js';
import { sendToUser } from '../config/push.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';
import { childLogger } from '../utils/logger.js';

const log = childLogger({ module: 'orders' });

const ORDER_TYPES: readonly OrderType[] = ['dine-in', 'takeaway', 'delivery'];
const PAYMENT_METHODS: readonly PaymentMethod[] = ['card', 'upi', 'wallet', 'cod'];
const ORDER_STATUSES: readonly OrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'delivered',
  'cancelled',
];

const getIo = (req: Request): Server | undefined => req.app.get('io') as Server | undefined;

/**
 * Which status changes are worth interrupting someone for.
 * 'confirmed' and 'preparing' are deliberately absent — a push for every
 * step trains people to disable notifications entirely.
 */
const PUSH_COPY: Partial<Record<OrderStatus, { title: string; body: string }>> = {
  ready: { title: 'Your order is ready', body: 'is ready for collection.' },
  delivered: { title: 'Order delivered', body: 'has been delivered. Enjoy!' },
  cancelled: { title: 'Order cancelled', body: 'was cancelled.' },
};

const isOwnerOrAdmin = (order: HydratedOrder, user: HydratedUser): boolean =>
  user.role === 'admin' || (order.user != null && order.user.equals(user._id));

interface CreateOrderBody {
  customerName?: string;
  customerPhone?: string;
  items?: unknown;
  orderType?: OrderType;
  specialInstructions?: string;
  deliveryAddress?: string;
  paymentMethod?: PaymentMethod;
}

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
export const createOrder: RequestHandler = asyncHandler(async (req, res) => {
  const {
    customerName,
    customerPhone,
    items,
    orderType,
    specialInstructions,
    deliveryAddress,
    paymentMethod,
  } = req.body as CreateOrderBody;

  // `protect` guarantees this; the assertion documents that contract.
  const user = req.user as HydratedUser;

  // Prices, subtotal, tax and total are all recomputed here. Anything the
  // client sent about money is discarded. A PricingError thrown by this call
  // is translated to a 400 by the error middleware.
  const priced = await priceOrder(items);

  if (orderType && !ORDER_TYPES.includes(orderType)) {
    throw new BadRequestError('Invalid order type');
  }

  if (paymentMethod && !PAYMENT_METHODS.includes(paymentMethod)) {
    throw new BadRequestError('Invalid payment method');
  }

  if (orderType === 'delivery' && !deliveryAddress) {
    throw new BadRequestError('A delivery address is required for delivery orders');
  }

  if (!customerPhone) {
    throw new BadRequestError('A contact phone number is required');
  }

  // Reserved *before* the order is written, so a sold-out item fails the
  // request rather than creating an order that cannot be fulfilled.
  await reserveStock(priced.items);

  const order = await Order.create({
    user: user._id,
    // Identity comes from the authenticated session, not the request body,
    // so an order cannot be filed under someone else's account or email.
    customerName: customerName || user.name,
    customerEmail: user.email,
    customerPhone,
    items: priced.items,
    subtotal: priced.subtotal,
    tax: priced.tax,
    totalAmount: priced.totalAmount,
    orderType: orderType || 'takeaway',
    specialInstructions: specialInstructions || '',
    deliveryAddress,
    paymentMethod: paymentMethod || 'card',
    // Payment state is never set from user input. It only advances when a
    // payment provider confirms it with a verified signature.
    paymentStatus: 'pending',
  });

  // Order contents are personal data: notify only the customer and staff,
  // never every connected socket.
  const io = getIo(req);
  emitToAdmins(io, 'newOrder', order);
  emitToUser(io, order.user, 'orderCreated', order);

  enqueueDetached('order-confirmation-email', {
    email: order.customerEmail,
    orderId: order._id.toString(),
  });

  res.status(201).json(order);
});

// @desc    Get user's orders
// @route   GET /api/orders/myorders
// @access  Private
export const getMyOrders: RequestHandler = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user?._id })
    .sort({ createdAt: -1 })
    .populate('items.menuItem');
  res.json(orders);
});

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private/Admin
export const getOrders: RequestHandler = asyncHandler(async (_req, res) => {
  const orders = await Order.find({}).populate('items.menuItem').sort({ createdAt: -1 });
  res.json(orders);
});

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private (owner or admin)
export const getOrderById: RequestHandler = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('items.menuItem');

  // Knowing an order id is not authorisation to read it, so a stranger sees
  // the same 404 as a genuinely missing order.
  if (!order || !isOwnerOrAdmin(order, req.user as HydratedUser)) {
    throw new NotFoundError('Order not found');
  }

  res.json(order);
});

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
export const updateOrderStatus: RequestHandler = asyncHandler(async (req, res) => {
  const { status } = req.body as { status?: OrderStatus };

  if (!status || !ORDER_STATUSES.includes(status)) {
    throw new BadRequestError('Invalid order status');
  }

  const order = await Order.findById(req.params.id);

  if (!order) {
    throw new NotFoundError('Order not found');
  }

  const oldStatus = order.status;

  // Cancelling returns the stock, but only once — re-cancelling an already
  // cancelled order must not inflate inventory.
  if (status === 'cancelled' && oldStatus !== 'cancelled') {
    await releaseStock(order.items);
  }

  order.status = status;
  const updatedOrder = await order.save();

  // Award loyalty points when order is delivered
  if (oldStatus !== 'delivered' && updatedOrder.status === 'delivered' && updatedOrder.user) {
    const pointsEarned = await updateLoyalty(updatedOrder.user, updatedOrder.totalAmount);
    log.info({ orderId: updatedOrder._id.toString(), pointsEarned }, 'awarded loyalty points');
  }

  const payload = {
    orderId: updatedOrder._id,
    status: updatedOrder.status,
  };
  const io = getIo(req);
  emitToUser(io, updatedOrder.user, 'orderStatusUpdated', payload);
  emitToAdmins(io, 'orderStatusUpdated', payload);

  // Customers who are not watching the page still get told.
  enqueueDetached('order-status-email', {
    email: updatedOrder.customerEmail,
    orderId: updatedOrder._id.toString(),
    status: updatedOrder.status,
  });

  // A push arrives even when the tab is closed — the whole point for
  // "your order is ready". Detached: a push failure must not fail the
  // status update an admin just made.
  const reference = updatedOrder._id.toString().slice(-8).toUpperCase();
  const push = PUSH_COPY[updatedOrder.status];
  if (push) {
    void sendToUser(updatedOrder.user, {
      title: push.title,
      body: `Order #${reference} ${push.body}`,
      url: '/order-history',
      // Tagged per order, so a later update replaces the previous
      // notification instead of stacking five of them.
      tag: `order-${reference}`,
    }).catch((error: unknown) => log.error({ err: error }, 'order push failed'));
  }

  res.json(updatedOrder);
});

// @desc    Look up orders for any customer email
// @route   GET /api/orders/customer/:email
// @access  Private/Admin
export const getOrdersByEmail: RequestHandler = asyncHandler(async (req, res) => {
  const orders = await Order.find({ customerEmail: (req.params.email as string).toLowerCase() })
    .populate('items.menuItem')
    .sort({ createdAt: -1 });
  res.json(orders);
});
