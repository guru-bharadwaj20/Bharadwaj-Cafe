import express from 'express';
import {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  changePassword,
  deleteAccount,
  verifyEmail,
  forgotPassword,
  resetPassword,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.put('/password', protect, changePassword);
router.delete('/account', protect, deleteAccount);
router.get('/verify/:token', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

export default router;
