import Review from '../models/Review.js';
import MenuItem from '../models/MenuItem.js';

// @desc    Create a new review
// @route   POST /api/reviews
// @access  Private
export const createReview = async (req, res) => {
  try {
    const { menuItem, rating, comment, images } = req.body;

    // Check if user already reviewed this item
    const existingReview = await Review.findOne({
      user: req.user._id,
      menuItem
    });

    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this item' });
    }

    const review = await Review.create({
      user: req.user._id,
      menuItem,
      rating,
      comment,
      images: images || []
    });

    // Update menu item rating
    const reviews = await Review.find({ menuItem });
    const avgRating = reviews.reduce((acc, item) => item.rating + acc, 0) / reviews.length;
    
    await MenuItem.findByIdAndUpdate(menuItem, {
      rating: avgRating,
      reviewCount: reviews.length
    });

    const populatedReview = await Review.findById(review._id)
      .populate('user', 'name')
      .populate('menuItem', 'name');

    res.status(201).json(populatedReview);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get reviews for a menu item
// @route   GET /api/reviews/menu/:menuItemId
// @access  Public
export const getMenuItemReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ menuItem: req.params.menuItemId })
      .populate('user', 'name')
      .sort('-createdAt');

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a review
// @route   PUT /api/reviews/:id
// @access  Private
export const updateReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    if (review.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    review.rating = req.body.rating || review.rating;
    review.comment = req.body.comment || review.comment;
    review.images = req.body.images || review.images;

    const updatedReview = await review.save();

    // Update menu item rating
    const reviews = await Review.find({ menuItem: review.menuItem });
    const avgRating = reviews.reduce((acc, item) => item.rating + acc, 0) / reviews.length;
    
    await MenuItem.findByIdAndUpdate(review.menuItem, {
      rating: avgRating
    });

    res.json(updatedReview);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private
export const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const menuItemId = review.menuItem;
    await review.deleteOne();

    // Update menu item rating
    const reviews = await Review.find({ menuItem: menuItemId });
    const avgRating = reviews.length > 0 
      ? reviews.reduce((acc, item) => item.rating + acc, 0) / reviews.length 
      : 0;
    
    await MenuItem.findByIdAndUpdate(menuItemId, {
      rating: avgRating,
      reviewCount: reviews.length
    });

    res.json({ message: 'Review deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark review as helpful
// @route   PUT /api/reviews/:id/helpful
// @access  Private
export const markHelpful = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    const alreadyMarked = review.helpful.includes(req.user._id);

    if (alreadyMarked) {
      review.helpful = review.helpful.filter(
        id => id.toString() !== req.user._id.toString()
      );
    } else {
      review.helpful.push(req.user._id);
    }

    await review.save();
    res.json({ helpful: review.helpful.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
