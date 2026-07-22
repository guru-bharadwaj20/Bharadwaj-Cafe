import express from 'express';
import {
  deleteUpload,
  getUploadConfig,
  getUploadSignature,
} from '../controllers/uploadController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

router.get('/config', getUploadConfig);

// Signature issuing is authenticated; the controller decides which kinds a
// given role may request.
router.post('/signature', protect, getUploadSignature);
router.delete('/', protect, admin, deleteUpload);

export default router;
