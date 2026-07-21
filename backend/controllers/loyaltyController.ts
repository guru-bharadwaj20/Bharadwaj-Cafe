import type { RequestHandler } from 'express';
import type { Types } from 'mongoose';
import User, { type LoyaltyTier } from '../models/User.js';

const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

interface TierRange {
  min: number;
  max: number;
}

const TIERS: Record<LoyaltyTier, TierRange> = {
  Bronze: { min: 0, max: 1000 },
  Silver: { min: 1000, max: 5000 },
  Gold: { min: 5000, max: 10000 },
  Platinum: { min: 10000, max: Infinity },
};

const NEXT_TIER: Record<LoyaltyTier, LoyaltyTier | null> = {
  Bronze: 'Silver',
  Silver: 'Gold',
  Gold: 'Platinum',
  Platinum: null,
};

// @desc    Get user's loyalty info
// @route   GET /api/loyalty
// @access  Private
export const getLoyaltyInfo: RequestHandler = async (req, res) => {
  try {
    const user = await User.findById(req.user?._id).select('loyaltyPoints loyaltyTier totalSpent');

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const currentTier = TIERS[user.loyaltyTier];
    const progress =
      currentTier.max === Infinity
        ? 100
        : ((user.totalSpent - currentTier.min) / (currentTier.max - currentTier.min)) * 100;

    res.json({
      points: user.loyaltyPoints,
      tier: user.loyaltyTier,
      totalSpent: user.totalSpent,
      progress: Math.min(progress, 100),
      nextTier: NEXT_TIER[user.loyaltyTier],
      pointsToNextTier: currentTier.max === Infinity ? 0 : currentTier.max - user.totalSpent,
    });
  } catch (error) {
    res.status(500).json({ message: errorMessage(error, 'Failed to load loyalty info') });
  }
};

// @desc    Redeem loyalty points
// @route   POST /api/loyalty/redeem
// @access  Private
export const redeemPoints: RequestHandler = async (req, res) => {
  try {
    const { points } = req.body as { points?: number };
    const user = await User.findById(req.user?._id);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const requested = Number(points);
    if (!Number.isInteger(requested) || requested <= 0) {
      res.status(400).json({ message: 'Points must be a positive whole number' });
      return;
    }

    if (user.loyaltyPoints < requested) {
      res.status(400).json({ message: 'Insufficient points' });
      return;
    }

    // 100 points = Rs.10 discount
    const discount = requested / 10;
    user.loyaltyPoints -= requested;
    await user.save();

    res.json({
      discount,
      remainingPoints: user.loyaltyPoints,
      message: `Redeemed ${requested} points for Rs.${discount} discount`,
    });
  } catch (error) {
    res.status(500).json({ message: errorMessage(error, 'Failed to redeem points') });
  }
};

// @desc    Get rewards catalog
// @route   GET /api/loyalty/rewards
// @access  Private
export const getRewards: RequestHandler = (_req, res) => {
  const rewards = [
    { id: 1, name: 'Free Coffee', points: 100, description: 'Get a free coffee of your choice' },
    { id: 2, name: '10% Off', points: 200, description: '10% off on your next order' },
    { id: 3, name: 'Free Pastry', points: 150, description: 'Get a free pastry of your choice' },
    { id: 4, name: '20% Off', points: 400, description: '20% off on your next order' },
    { id: 5, name: 'Free Meal Combo', points: 500, description: 'Get a free meal combo' },
    { id: 6, name: 'Premium Membership', points: 1000, description: '1 month premium benefits' },
  ];

  res.json(rewards);
};

/**
 * Awards points and re-evaluates the tier after an order is delivered.
 * Returns the number of points earned, or 0 if the update failed.
 */
export const updateLoyalty = async (
  userId: Types.ObjectId | string,
  orderTotal: number
): Promise<number> => {
  try {
    const user = await User.findById(userId);
    if (!user) return 0;

    // Add points (1 point per Rs.10 spent)
    const pointsEarned = Math.floor(orderTotal / 10);
    user.loyaltyPoints += pointsEarned;
    user.totalSpent += orderTotal;

    // Update tier
    if (user.totalSpent >= 10000) {
      user.loyaltyTier = 'Platinum';
    } else if (user.totalSpent >= 5000) {
      user.loyaltyTier = 'Gold';
    } else if (user.totalSpent >= 1000) {
      user.loyaltyTier = 'Silver';
    }

    await user.save();
    return pointsEarned;
  } catch (error) {
    console.error('Error updating loyalty:', error);
    return 0;
  }
};
