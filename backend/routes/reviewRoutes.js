import express from 'express';
import {
  createReview,
  getMenuItemReviews,
  updateReview,
  deleteReview,
  markHelpful
} from '../controllers/reviewController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/', protect, createReview);
router.get('/menu/:menuItemId', getMenuItemReviews);
router.put('/:id', protect, updateReview);
router.delete('/:id', protect, deleteReview);
router.put('/:id/helpful', protect, markHelpful);

export default router;
