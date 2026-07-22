import type { RequestHandler } from 'express';
import type { Types } from 'mongoose';
import Review from '../models/Review.js';
import MenuItem from '../models/MenuItem.js';
import type { HydratedUser } from '../models/User.js';
import { invalidateMenuCache } from '../utils/menuCache.js';

const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

/** Recomputes the cached rating/count on a menu item from its reviews. */
const refreshMenuItemRating = async (menuItemId: Types.ObjectId): Promise<void> => {
  const reviews = await Review.find({ menuItem: menuItemId });
  const avgRating =
    reviews.length > 0 ? reviews.reduce((acc, item) => acc + item.rating, 0) / reviews.length : 0;

  await MenuItem.findByIdAndUpdate(menuItemId, {
    rating: avgRating,
    reviewCount: reviews.length,
  });

  // A new review changes the rating shown on the menu, so the cached
  // listing is now stale.
  await invalidateMenuCache();
};

// @desc    Create a new review
// @route   POST /api/reviews
// @access  Private
export const createReview: RequestHandler = async (req, res) => {
  try {
    const { menuItem, rating, comment, images } = req.body as {
      menuItem?: string;
      rating?: number;
      comment?: string;
      images?: string[];
    };
    const user = req.user as HydratedUser;

    // Check if user already reviewed this item
    const existingReview = await Review.findOne({ user: user._id, menuItem });

    if (existingReview) {
      res.status(400).json({ message: 'You have already reviewed this item' });
      return;
    }

    const review = await Review.create({
      user: user._id,
      menuItem,
      rating,
      comment,
      images: images ?? [],
    });

    await refreshMenuItemRating(review.menuItem);

    const populatedReview = await Review.findById(review._id)
      .populate('user', 'name')
      .populate('menuItem', 'name');

    res.status(201).json(populatedReview);
  } catch (error) {
    res.status(500).json({ message: errorMessage(error, 'Failed to create review') });
  }
};

// @desc    Get reviews for a menu item
// @route   GET /api/reviews/menu/:menuItemId
// @access  Public
export const getMenuItemReviews: RequestHandler = async (req, res) => {
  try {
    const reviews = await Review.find({ menuItem: req.params.menuItemId })
      .populate('user', 'name')
      .sort('-createdAt');

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: errorMessage(error, 'Failed to load reviews') });
  }
};

// @desc    Update a review
// @route   PUT /api/reviews/:id
// @access  Private
export const updateReview: RequestHandler = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      res.status(404).json({ message: 'Review not found' });
      return;
    }

    const user = req.user as HydratedUser;
    if (!review.user.equals(user._id)) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const body = req.body as { rating?: number; comment?: string; images?: string[] };
    review.rating = body.rating ?? review.rating;
    review.comment = body.comment ?? review.comment;
    review.images = body.images ?? review.images;

    const updatedReview = await review.save();
    await refreshMenuItemRating(review.menuItem);

    res.json(updatedReview);
  } catch (error) {
    res.status(500).json({ message: errorMessage(error, 'Failed to update review') });
  }
};

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private
export const deleteReview: RequestHandler = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      res.status(404).json({ message: 'Review not found' });
      return;
    }

    const user = req.user as HydratedUser;
    if (!review.user.equals(user._id) && user.role !== 'admin') {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const menuItemId = review.menuItem;
    await review.deleteOne();
    await refreshMenuItemRating(menuItemId);

    res.json({ message: 'Review deleted' });
  } catch (error) {
    res.status(500).json({ message: errorMessage(error, 'Failed to delete review') });
  }
};

// @desc    Mark review as helpful
// @route   PUT /api/reviews/:id/helpful
// @access  Private
export const markHelpful: RequestHandler = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      res.status(404).json({ message: 'Review not found' });
      return;
    }

    const user = req.user as HydratedUser;
    const alreadyMarked = review.helpful.some((id) => id.equals(user._id));

    if (alreadyMarked) {
      review.helpful = review.helpful.filter((id) => !id.equals(user._id));
    } else {
      review.helpful.push(user._id);
    }

    await review.save();
    res.json({ helpful: review.helpful.length });
  } catch (error) {
    res.status(500).json({ message: errorMessage(error, 'Failed to update review') });
  }
};
