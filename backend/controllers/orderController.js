import Order from '../models/Order.js';
import { updateLoyalty } from './loyaltyController.js';
import { priceOrder, PricingError } from '../config/pricing.js';
import { emitToAdmins, emitToUser } from '../utils/realtime.js';
import { sendOrderConfirmationEmail } from '../utils/email.js';

const ORDER_TYPES = ['dine-in', 'takeaway', 'delivery'];
const PAYMENT_METHODS = ['card', 'upi', 'wallet', 'cod'];
const ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];

const isOwnerOrAdmin = (order, user) =>
  user.role === 'admin' || (order.user && order.user.equals(user._id));

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
export const createOrder = async (req, res) => {
  try {
    const {
      customerName,
      customerPhone,
      items,
      orderType,
      specialInstructions,
      deliveryAddress,
      paymentMethod,
    } = req.body;

    // Prices, subtotal, tax and total are all recomputed here. Anything the
    // client sent about money is discarded.
    const priced = await priceOrder(items);

    if (orderType && !ORDER_TYPES.includes(orderType)) {
      return res.status(400).json({ message: 'Invalid order type' });
    }

    if (paymentMethod && !PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({ message: 'Invalid payment method' });
    }

    if (orderType === 'delivery' && !deliveryAddress) {
      return res
        .status(400)
        .json({ message: 'A delivery address is required for delivery orders' });
    }

    if (!customerPhone) {
      return res.status(400).json({ message: 'A contact phone number is required' });
    }

    const order = await Order.create({
      user: req.user._id,
      // Identity comes from the authenticated session, not the request body,
      // so an order cannot be filed under someone else's account or email.
      customerName: customerName || req.user.name,
      customerEmail: req.user.email,
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
    emitToAdmins(req.app.get('io'), 'newOrder', order);
    emitToUser(req.app.get('io'), order.user, 'orderCreated', order);

    sendOrderConfirmationEmail(order.customerEmail, order).catch((error) =>
      console.error('Failed to send order confirmation email:', error)
    );

    res.status(201).json(order);
  } catch (error) {
    if (error instanceof PricingError) {
      return res.status(400).json({ message: error.message });
    }
    console.error('Create order error:', error);
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get user's orders
// @route   GET /api/orders/myorders
// @access  Private
export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('items.menuItem');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private/Admin
export const getOrders = async (req, res) => {
  try {
    const orders = await Order.find({}).populate('items.menuItem').sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private (owner or admin)
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('items.menuItem');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Knowing an order id is not authorisation to read it.
    if (!isOwnerOrAdmin(order, req.user)) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Invalid order status' });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const oldStatus = order.status;
    order.status = status;
    const updatedOrder = await order.save();

    // Award loyalty points when order is delivered
    if (oldStatus !== 'delivered' && updatedOrder.status === 'delivered' && updatedOrder.user) {
      const pointsEarned = await updateLoyalty(updatedOrder.user, updatedOrder.totalAmount);
      console.log(`Awarded ${pointsEarned} loyalty points for order ${updatedOrder._id}`);
    }

    const payload = {
      orderId: updatedOrder._id,
      status: updatedOrder.status,
    };
    emitToUser(req.app.get('io'), updatedOrder.user, 'orderStatusUpdated', payload);
    emitToAdmins(req.app.get('io'), 'orderStatusUpdated', payload);

    res.json(updatedOrder);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Look up orders for any customer email
// @route   GET /api/orders/customer/:email
// @access  Private/Admin
export const getOrdersByEmail = async (req, res) => {
  try {
    const orders = await Order.find({ customerEmail: req.params.email.toLowerCase() })
      .populate('items.menuItem')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
