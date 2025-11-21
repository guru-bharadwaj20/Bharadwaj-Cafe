import express from 'express';
import {
  getLoyaltyInfo,
  redeemPoints,
  getRewards
} from '../controllers/loyaltyController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, getLoyaltyInfo);
router.post('/redeem', protect, redeemPoints);
router.get('/rewards', protect, getRewards);

export default router;
