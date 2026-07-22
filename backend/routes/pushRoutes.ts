import express from 'express';
import { getPushConfig, sendTest, subscribe, unsubscribe } from '../controllers/pushController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/config', getPushConfig);
router.post('/subscribe', protect, subscribe);
router.delete('/subscribe', protect, unsubscribe);
router.post('/test', protect, sendTest);

export default router;
