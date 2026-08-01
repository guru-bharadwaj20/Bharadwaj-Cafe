import express from 'express';
import {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  changePassword,
  deleteAccount,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  googleLogin,
  getGoogleConfig,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { authLimiter, emailLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

router.post('/register', authLimiter, registerUser);
router.post('/login', authLimiter, loginUser);

// Rate limited like any other credential exchange: an ID token is a credential.
router.get('/google/config', getGoogleConfig);
router.post('/google', authLimiter, googleLogin);
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.put('/password', protect, changePassword);
router.delete('/account', protect, deleteAccount);
router.get('/verify/:token', verifyEmail);
router.post('/resend-verification', emailLimiter, resendVerification);
router.post('/forgot-password', emailLimiter, forgotPassword);
router.post('/reset-password/:token', authLimiter, resetPassword);

export default router;
