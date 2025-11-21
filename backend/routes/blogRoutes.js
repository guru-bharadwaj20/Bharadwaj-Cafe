import express from 'express';
import {
  getBlogs,
  getBlogBySlug,
  createBlog,
  updateBlog,
  deleteBlog,
  likeBlog
} from '../controllers/blogController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .get(getBlogs)
  .post(protect, admin, createBlog);

router.route('/:slug')
  .get(getBlogBySlug);

router.route('/:id')
  .put(protect, admin, updateBlog)
  .delete(protect, admin, deleteBlog);

router.put('/:id/like', protect, likeBlog);

export default router;
