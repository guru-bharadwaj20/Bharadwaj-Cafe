import express from 'express';
import {
  getDashboardStats,
  getAllUsers,
  deleteUser,
  updateUserRole,
  getAllOrders,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} from '../controllers/adminController.js';
// Single source of truth for status transitions: validates the status,
// awards loyalty points and emits the real-time update.
import { updateOrderStatus } from '../controllers/orderController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

// Dashboard
router.get('/stats', protect, admin, getDashboardStats);

// User Management
router.get('/users', protect, admin, getAllUsers);
router.delete('/users/:id', protect, admin, deleteUser);
router.put('/users/:id/role', protect, admin, updateUserRole);

// Order Management
router.get('/orders', protect, admin, getAllOrders);
router.put('/orders/:id/status', protect, admin, updateOrderStatus);

// Menu Management
router.post('/menu', protect, admin, createMenuItem);
router.put('/menu/:id', protect, admin, updateMenuItem);
router.delete('/menu/:id', protect, admin, deleteMenuItem);

export default router;
