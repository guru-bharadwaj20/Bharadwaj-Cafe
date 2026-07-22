import express from 'express';
import {
  getPeakHours,
  getRevenueSeries,
  getSummary,
  getTopItems,
} from '../controllers/analyticsController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

// Business metrics are commercially sensitive; every route is staff-only.
router.use(protect, admin);

router.get('/summary', getSummary);
router.get('/revenue', getRevenueSeries);
router.get('/top-items', getTopItems);
router.get('/peak-hours', getPeakHours);

export default router;
