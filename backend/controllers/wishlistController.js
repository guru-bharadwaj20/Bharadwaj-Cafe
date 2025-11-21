import Wishlist from '../models/Wishlist.js';

// @desc    Get user's wishlist
// @route   GET /api/wishlist
// @access  Private
export const getWishlist = async (req, res) => {
  try {
    let wishlist = await Wishlist.findOne({ user: req.user._id })
      .populate('items.menuItem');

    if (!wishlist) {
      wishlist = await Wishlist.create({ user: req.user._id, items: [] });
    }

    res.json(wishlist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add item to wishlist
// @route   POST /api/wishlist
// @access  Private
export const addToWishlist = async (req, res) => {
  try {
    const { menuItemId } = req.body;

    let wishlist = await Wishlist.findOne({ user: req.user._id });

    if (!wishlist) {
      wishlist = await Wishlist.create({
        user: req.user._id,
        items: [{ menuItem: menuItemId }]
      });
    } else {
      const itemExists = wishlist.items.some(
        item => item.menuItem.toString() === menuItemId
      );

      if (itemExists) {
        return res.status(400).json({ message: 'Item already in wishlist' });
      }

      wishlist.items.push({ menuItem: menuItemId });
      await wishlist.save();
    }

    wishlist = await wishlist.populate('items.menuItem');
    res.json(wishlist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Remove item from wishlist
// @route   DELETE /api/wishlist/:itemId
// @access  Private
export const removeFromWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user._id });

    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }

    wishlist.items = wishlist.items.filter(
      item => item.menuItem.toString() !== req.params.itemId
    );

    await wishlist.save();
    await wishlist.populate('items.menuItem');

    res.json(wishlist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Clear wishlist
// @route   DELETE /api/wishlist
// @access  Private
export const clearWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user._id });

    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }

    wishlist.items = [];
    await wishlist.save();

    res.json({ message: 'Wishlist cleared' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
