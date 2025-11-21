import express from 'express';
import {
  getUserChat,
  sendMessage,
  getAllChats,
  sendAdminMessage,
  closeChat,
  markAsRead
} from '../controllers/chatController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, getUserChat);
router.post('/message', protect, sendMessage);
router.get('/admin', protect, admin, getAllChats);
router.post('/:chatId/admin-message', protect, admin, sendAdminMessage);
router.put('/:chatId/close', protect, admin, closeChat);
router.put('/:chatId/read', protect, markAsRead);

export default router;
