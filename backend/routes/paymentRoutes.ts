import express from 'express';
import {
  createPaymentForOrder,
  getPaymentConfig,
  verifyPayment,
} from '../controllers/paymentController.js';
import { protect, requireVerified } from '../middleware/auth.js';

const router = express.Router();

// Tells the client whether to show an online-payment button at all.
router.get('/config', getPaymentConfig);

router.post('/orders/:orderId', protect, requireVerified, createPaymentForOrder);
router.post('/verify', protect, verifyPayment);

// The webhook is mounted separately in app.ts: it needs the raw body for
// signature verification, so it must bypass express.json().

export default router;
