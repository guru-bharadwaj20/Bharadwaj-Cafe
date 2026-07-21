import type { RequestHandler } from 'express';
import Wishlist from '../models/Wishlist.js';
import type { HydratedUser } from '../models/User.js';

const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

// @desc    Get user's wishlist
// @route   GET /api/wishlist
// @access  Private
export const getWishlist: RequestHandler = async (req, res) => {
  try {
    const user = req.user as HydratedUser;
    let wishlist = await Wishlist.findOne({ user: user._id }).populate('items.menuItem');

    if (!wishlist) {
      wishlist = await Wishlist.create({ user: user._id, items: [] });
    }

    res.json(wishlist);
  } catch (error) {
    res.status(500).json({ message: errorMessage(error, 'Failed to load wishlist') });
  }
};

// @desc    Add item to wishlist
// @route   POST /api/wishlist
// @access  Private
export const addToWishlist: RequestHandler = async (req, res) => {
  try {
    const { menuItemId } = req.body as { menuItemId?: string };

    if (!menuItemId) {
      res.status(400).json({ message: 'menuItemId is required' });
      return;
    }

    const user = req.user as HydratedUser;
    let wishlist = await Wishlist.findOne({ user: user._id });

    if (!wishlist) {
      wishlist = await Wishlist.create({
        user: user._id,
        items: [{ menuItem: menuItemId, addedAt: new Date() }],
      });
    } else {
      const itemExists = wishlist.items.some((item) => item.menuItem.toString() === menuItemId);

      if (itemExists) {
        res.status(400).json({ message: 'Item already in wishlist' });
        return;
      }

      wishlist.items.push({ menuItem: menuItemId, addedAt: new Date() });
      await wishlist.save();
    }

    wishlist = await wishlist.populate('items.menuItem');
    res.json(wishlist);
  } catch (error) {
    res.status(500).json({ message: errorMessage(error, 'Failed to update wishlist') });
  }
};

// @desc    Remove item from wishlist
// @route   DELETE /api/wishlist/:itemId
// @access  Private
export const removeFromWishlist: RequestHandler = async (req, res) => {
  try {
    const user = req.user as HydratedUser;
    const wishlist = await Wishlist.findOne({ user: user._id });

    if (!wishlist) {
      res.status(404).json({ message: 'Wishlist not found' });
      return;
    }

    wishlist.items = wishlist.items.filter(
      (item) => item.menuItem.toString() !== req.params.itemId
    ) as typeof wishlist.items;

    await wishlist.save();
    await wishlist.populate('items.menuItem');

    res.json(wishlist);
  } catch (error) {
    res.status(500).json({ message: errorMessage(error, 'Failed to update wishlist') });
  }
};

// @desc    Clear wishlist
// @route   DELETE /api/wishlist
// @access  Private
export const clearWishlist: RequestHandler = async (req, res) => {
  try {
    const user = req.user as HydratedUser;
    const wishlist = await Wishlist.findOne({ user: user._id });

    if (!wishlist) {
      res.status(404).json({ message: 'Wishlist not found' });
      return;
    }

    wishlist.items.splice(0, wishlist.items.length);
    await wishlist.save();

    res.json({ message: 'Wishlist cleared' });
  } catch (error) {
    res.status(500).json({ message: errorMessage(error, 'Failed to clear wishlist') });
  }
};
