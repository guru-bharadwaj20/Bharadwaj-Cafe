import User from '../models/User.js';
import Order from '../models/Order.js';

// @desc    Get user's loyalty info
// @route   GET /api/loyalty
// @access  Private
export const getLoyaltyInfo = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('loyaltyPoints loyaltyTier totalSpent');
    
    // Calculate tier progress
    const tiers = {
      Bronze: { min: 0, max: 1000 },
      Silver: { min: 1000, max: 5000 },
      Gold: { min: 5000, max: 10000 },
      Platinum: { min: 10000, max: Infinity }
    };

    const currentTier = tiers[user.loyaltyTier];
    const progress = currentTier.max === Infinity 
      ? 100 
      : ((user.totalSpent - currentTier.min) / (currentTier.max - currentTier.min)) * 100;

    res.json({
      points: user.loyaltyPoints,
      tier: user.loyaltyTier,
      totalSpent: user.totalSpent,
      progress: Math.min(progress, 100),
      nextTier: user.loyaltyTier === 'Platinum' ? null : 
        user.loyaltyTier === 'Gold' ? 'Platinum' :
        user.loyaltyTier === 'Silver' ? 'Gold' : 'Silver',
      pointsToNextTier: currentTier.max === Infinity ? 0 : currentTier.max - user.totalSpent
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Redeem loyalty points
// @route   POST /api/loyalty/redeem
// @access  Private
export const redeemPoints = async (req, res) => {
  try {
    const { points } = req.body;
    const user = await User.findById(req.user._id);

    if (user.loyaltyPoints < points) {
      return res.status(400).json({ message: 'Insufficient points' });
    }

    // 100 points = ₹10 discount
    const discount = points / 10;
    user.loyaltyPoints -= points;
    await user.save();

    res.json({
      discount,
      remainingPoints: user.loyaltyPoints,
      message: `Redeemed ${points} points for ₹${discount} discount`
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get rewards catalog
// @route   GET /api/loyalty/rewards
// @access  Private
export const getRewards = async (req, res) => {
  try {
    const rewards = [
      { id: 1, name: 'Free Coffee', points: 100, description: 'Get a free coffee of your choice' },
      { id: 2, name: '10% Off', points: 200, description: '10% off on your next order' },
      { id: 3, name: 'Free Pastry', points: 150, description: 'Get a free pastry of your choice' },
      { id: 4, name: '20% Off', points: 400, description: '20% off on your next order' },
      { id: 5, name: 'Free Meal Combo', points: 500, description: 'Get a free meal combo' },
      { id: 6, name: 'Premium Membership', points: 1000, description: '1 month premium benefits' }
    ];

    res.json(rewards);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Helper function to update user loyalty (call this after order completion)
export const updateLoyalty = async (userId, orderTotal) => {
  try {
    const user = await User.findById(userId);
    
    // Add points (1 point per ₹10 spent)
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
