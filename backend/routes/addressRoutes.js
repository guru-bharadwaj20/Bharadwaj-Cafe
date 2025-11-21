import express from 'express';
import {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress
} from '../controllers/addressController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .get(protect, getAddresses)
  .post(protect, createAddress);

router.route('/:id')
  .put(protect, updateAddress)
  .delete(protect, deleteAddress);

router.put('/:id/default', protect, setDefaultAddress);

export default router;
