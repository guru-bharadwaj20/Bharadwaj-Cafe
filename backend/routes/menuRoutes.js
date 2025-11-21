import express from 'express';
import {
  getMenuItems,
  getMenuItem,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} from '../controllers/menuController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .get(getMenuItems)
  .post(protect, admin, createMenuItem);

router.route('/:id')
  .get(getMenuItem)
  .put(protect, admin, updateMenuItem)
  .delete(protect, admin, deleteMenuItem);

export default router;
