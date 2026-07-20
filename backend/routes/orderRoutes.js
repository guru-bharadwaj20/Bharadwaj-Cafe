import express from 'express';
import {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  getOrdersByEmail,
  getMyOrders,
} from '../controllers/orderController.js';
import { protect, admin, requireVerified } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .post(protect, requireVerified, createOrder)
  .get(protect, admin, getOrders);

// Declared before '/:id' so 'myorders' is not swallowed as an order id.
router.get('/myorders', protect, getMyOrders);

// Was public: any email address returned that customer's full order history,
// including their phone number and delivery address.
router.get('/customer/:email', protect, admin, getOrdersByEmail);

// Was public: guessing or leaking an order id exposed the whole order.
// The controller additionally enforces owner-or-admin access.
router.get('/:id', protect, getOrderById);

router.put('/:id/status', protect, admin, updateOrderStatus);

export default router;
