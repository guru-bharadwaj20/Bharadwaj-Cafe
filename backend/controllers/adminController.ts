import type { RequestHandler } from 'express';
import User, { type UserRole } from '../models/User.js';
import Order from '../models/Order.js';
import MenuItem, { type IMenuItem } from '../models/MenuItem.js';
import Contact from '../models/Contact.js';
import { invalidateMenuCache } from '../utils/menuCache.js';

const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

const USER_ROLES: readonly UserRole[] = ['customer', 'admin'];

// @desc    Get admin dashboard stats
// @route   GET /api/admin/stats
// @access  Private/Admin
export const getDashboardStats: RequestHandler = async (_req, res) => {
  try {
    const [totalUsers, totalOrders, totalMenuItems, pendingContacts] = await Promise.all([
      User.countDocuments(),
      Order.countDocuments(),
      MenuItem.countDocuments(),
      Contact.countDocuments({ status: 'new' }),
    ]);

    // Revenue is summed in the database rather than by loading every order.
    const [revenue] = await Order.aggregate<{ total: number }>([
      { $match: { status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);

    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'name email');

    const ordersByStatus = await Order.aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    res.json({
      totalUsers,
      totalOrders,
      totalMenuItems,
      pendingContacts,
      totalRevenue: revenue?.total ?? 0,
      recentOrders,
      ordersByStatus,
    });
  } catch (error) {
    res.status(500).json({ message: errorMessage(error, 'Failed to load dashboard') });
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
export const getAllUsers: RequestHandler = async (_req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: errorMessage(error, 'Failed to load users') });
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
export const deleteUser: RequestHandler = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (user.role === 'admin') {
      res.status(400).json({ message: 'Cannot delete admin user' });
      return;
    }

    await user.deleteOne();
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: errorMessage(error, 'Failed to delete user') });
  }
};

// @desc    Update user role
// @route   PUT /api/admin/users/:id/role
// @access  Private/Admin
export const updateUserRole: RequestHandler = async (req, res) => {
  try {
    const { role } = req.body as { role?: UserRole };

    if (role && !USER_ROLES.includes(role)) {
      res.status(400).json({ message: 'Invalid role' });
      return;
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    user.role = role ?? user.role;
    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
    });
  } catch (error) {
    res.status(500).json({ message: errorMessage(error, 'Failed to update role') });
  }
};

// @desc    Get all orders for admin
// @route   GET /api/admin/orders
// @access  Private/Admin
export const getAllOrders: RequestHandler = async (_req, res) => {
  try {
    const orders = await Order.find({}).populate('user', 'name email').sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: errorMessage(error, 'Failed to load orders') });
  }
};

// Order status updates live in orderController.updateOrderStatus, which is
// mounted on this router. Keeping a second copy here meant the admin path
// skipped status validation, loyalty points and real-time notifications.

// @desc    Create menu item
// @route   POST /api/admin/menu
// @access  Private/Admin
export const createMenuItem: RequestHandler = async (req, res) => {
  try {
    const { name, description, price, image, category } = req.body as Partial<IMenuItem>;

    const menuItem = await MenuItem.create({ name, description, price, image, category });
    await invalidateMenuCache();

    res.status(201).json(menuItem);
  } catch (error) {
    res.status(400).json({ message: errorMessage(error, 'Failed to create menu item') });
  }
};

// @desc    Update menu item
// @route   PUT /api/admin/menu/:id
// @access  Private/Admin
export const updateMenuItem: RequestHandler = async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);

    if (!menuItem) {
      res.status(404).json({ message: 'Menu item not found' });
      return;
    }

    const body = req.body as Partial<IMenuItem>;
    menuItem.name = body.name ?? menuItem.name;
    menuItem.description = body.description ?? menuItem.description;
    menuItem.price = body.price ?? menuItem.price;
    menuItem.image = body.image ?? menuItem.image;
    menuItem.category = body.category ?? menuItem.category;
    menuItem.available = body.available ?? menuItem.available;

    const updatedMenuItem = await menuItem.save();
    await invalidateMenuCache();

    res.json(updatedMenuItem);
  } catch (error) {
    res.status(400).json({ message: errorMessage(error, 'Failed to update menu item') });
  }
};

// @desc    Delete menu item
// @route   DELETE /api/admin/menu/:id
// @access  Private/Admin
export const deleteMenuItem: RequestHandler = async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);

    if (!menuItem) {
      res.status(404).json({ message: 'Menu item not found' });
      return;
    }

    await menuItem.deleteOne();
    await invalidateMenuCache();

    res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: errorMessage(error, 'Failed to delete menu item') });
  }
};
