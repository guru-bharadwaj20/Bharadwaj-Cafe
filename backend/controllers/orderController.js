import Order from '../models/Order.js';
import { updateLoyalty } from './loyaltyController.js';

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
export const createOrder = async (req, res) => {
  try {
    const {
      customerName,
      customerEmail,
      customerPhone,
      items,
      totalAmount,
      orderType,
      specialInstructions,
      deliveryAddress,
      paymentMethod,
      paymentId,
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'No order items' });
    }

    const order = await Order.create({
      user: req.userId,
      customerName,
      customerEmail,
      customerPhone,
      items,
      totalAmount,
      orderType,
      specialInstructions,
      deliveryAddress,
      paymentMethod,
      paymentId,
      paymentStatus: paymentId ? 'completed' : 'pending',
    });

    // Emit socket event for real-time order notification
    const io = req.app.get('io');
    io.emit('newOrder', order);

    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get user's orders
// @route   GET /api/orders/myorders
// @access  Private
export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.userId })
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
    const orders = await Order.find({})
      .populate('items.menuItem')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Public
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('items.menuItem');
    
    if (order) {
      res.json(order);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
export const updateOrderStatus = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (order) {
      const oldStatus = order.status;
      order.status = req.body.status || order.status;
      const updatedOrder = await order.save();

      // Award loyalty points when order is delivered
      if (oldStatus !== 'delivered' && updatedOrder.status === 'delivered' && updatedOrder.user) {
        const pointsEarned = await updateLoyalty(updatedOrder.user, updatedOrder.totalAmount);
        console.log(`Awarded ${pointsEarned} loyalty points for order ${updatedOrder._id}`);
      }

      // Emit socket event for real-time status update
      const io = req.app.get('io');
      io.emit('orderStatusUpdated', {
        orderId: updatedOrder._id,
        status: updatedOrder.status,
        userId: updatedOrder.user
      });

      res.json(updatedOrder);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get orders by email
// @route   GET /api/orders/customer/:email
// @access  Public
export const getOrdersByEmail = async (req, res) => {
  try {
    const orders = await Order.find({ customerEmail: req.params.email })
      .populate('items.menuItem')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
