import express from 'express';
import {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  getOrdersByEmail,
  getMyOrders,
} from '../controllers/orderController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .post(protect, createOrder)
  .get(protect, admin, getOrders);

router.get('/myorders', protect, getMyOrders);

router.get('/customer/:email', getOrdersByEmail);

router.get('/:id', getOrderById);

router.put('/:id/status', protect, admin, updateOrderStatus);

export default router;
