import type { RequestHandler } from 'express';
import type { Server } from 'socket.io';
import Order, {
  type HydratedOrder,
  type OrderStatus,
  type OrderType,
  type PaymentMethod,
} from '../models/Order.js';
import type { HydratedUser } from '../models/User.js';
import { updateLoyalty } from './loyaltyController.js';
import { priceOrder, PricingError } from '../config/pricing.js';
import { emitToAdmins, emitToUser } from '../utils/realtime.js';
import { sendOrderConfirmationEmail } from '../utils/email.js';

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

const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

const getIo = (req: { app: { get(name: string): unknown } }): Server | undefined =>
  req.app.get('io') as Server | undefined;

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
export const createOrder: RequestHandler = async (req, res) => {
  try {
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
    // client sent about money is discarded.
    const priced = await priceOrder(items);

    if (orderType && !ORDER_TYPES.includes(orderType)) {
      res.status(400).json({ message: 'Invalid order type' });
      return;
    }

    if (paymentMethod && !PAYMENT_METHODS.includes(paymentMethod)) {
      res.status(400).json({ message: 'Invalid payment method' });
      return;
    }

    if (orderType === 'delivery' && !deliveryAddress) {
      res.status(400).json({ message: 'A delivery address is required for delivery orders' });
      return;
    }

    if (!customerPhone) {
      res.status(400).json({ message: 'A contact phone number is required' });
      return;
    }

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
      // payment provider confirms it (see the planned webhook integration);
      // until then every order starts unpaid.
      paymentStatus: 'pending',
    });

    // Order contents are personal data: notify only the customer and staff,
    // never every connected socket.
    const io = getIo(req);
    emitToAdmins(io, 'newOrder', order);
    emitToUser(io, order.user, 'orderCreated', order);

    void sendOrderConfirmationEmail(order.customerEmail, order).catch((error: unknown) =>
      console.error('Failed to send order confirmation email:', error)
    );

    res.status(201).json(order);
  } catch (error) {
    if (error instanceof PricingError) {
      res.status(400).json({ message: error.message });
      return;
    }
    console.error('Create order error:', error);
    res.status(400).json({ message: errorMessage(error, 'Failed to create order') });
  }
};

// @desc    Get user's orders
// @route   GET /api/orders/myorders
// @access  Private
export const getMyOrders: RequestHandler = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user?._id })
      .sort({ createdAt: -1 })
      .populate('items.menuItem');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: errorMessage(error, 'Failed to load orders') });
  }
};

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private/Admin
export const getOrders: RequestHandler = async (_req, res) => {
  try {
    const orders = await Order.find({}).populate('items.menuItem').sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: errorMessage(error, 'Failed to load orders') });
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private (owner or admin)
export const getOrderById: RequestHandler = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('items.menuItem');

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    // Knowing an order id is not authorisation to read it.
    if (!isOwnerOrAdmin(order, req.user as HydratedUser)) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: errorMessage(error, 'Failed to load order') });
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
export const updateOrderStatus: RequestHandler = async (req, res) => {
  try {
    const { status } = req.body as { status?: OrderStatus };

    if (!status || !ORDER_STATUSES.includes(status)) {
      res.status(400).json({ message: 'Invalid order status' });
      return;
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    const oldStatus = order.status;
    order.status = status;
    const updatedOrder = await order.save();

    // Award loyalty points when order is delivered
    if (oldStatus !== 'delivered' && updatedOrder.status === 'delivered' && updatedOrder.user) {
      const pointsEarned = await updateLoyalty(updatedOrder.user, updatedOrder.totalAmount);
      console.log(
        `Awarded ${pointsEarned} loyalty points for order ${updatedOrder._id.toString()}`
      );
    }

    const payload = {
      orderId: updatedOrder._id,
      status: updatedOrder.status,
    };
    const io = getIo(req);
    emitToUser(io, updatedOrder.user, 'orderStatusUpdated', payload);
    emitToAdmins(io, 'orderStatusUpdated', payload);

    res.json(updatedOrder);
  } catch (error) {
    res.status(400).json({ message: errorMessage(error, 'Failed to update order') });
  }
};

// @desc    Look up orders for any customer email
// @route   GET /api/orders/customer/:email
// @access  Private/Admin
export const getOrdersByEmail: RequestHandler = async (req, res) => {
  try {
    const orders = await Order.find({ customerEmail: (req.params.email as string).toLowerCase() })
      .populate('items.menuItem')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: errorMessage(error, 'Failed to load orders') });
  }
};
