import express from 'express';
import {
  submitContact,
  getContacts,
  updateContactStatus,
} from '../controllers/contactController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .post(submitContact)
  .get(protect, admin, getContacts);

router.put('/:id', protect, admin, updateContactStatus);

export default router;
