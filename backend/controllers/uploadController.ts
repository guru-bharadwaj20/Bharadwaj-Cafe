import type { RequestHandler } from 'express';
import {
  createUploadSignature,
  isUploadKind,
  publicIdFromUrl,
  deleteAsset,
  uploadsEnabled,
} from '../config/uploads.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { BadRequestError, ServiceUnavailableError } from '../utils/errors.js';
import { childLogger } from '../utils/logger.js';

const log = childLogger({ module: 'uploads' });

// @desc    Report whether uploads are available
// @route   GET /api/uploads/config
// @access  Public
export const getUploadConfig: RequestHandler = (_req, res) => {
  res.json({ enabled: uploadsEnabled() });
};

// @desc    Issue a signature for one direct-to-Cloudinary upload
// @route   POST /api/uploads/signature
// @access  Private/Admin (or any authenticated user for review photos)
export const getUploadSignature: RequestHandler = asyncHandler((req, res) => {
  if (!uploadsEnabled()) {
    throw new ServiceUnavailableError('Image uploads are not configured');
  }

  const { kind } = req.body as { kind?: unknown };

  if (!isUploadKind(kind)) {
    throw new BadRequestError('kind must be one of: menu, blog, review');
  }

  // Only staff may upload menu and blog imagery; review photos are open to
  // any signed-in customer.
  if (kind !== 'review' && req.user?.role !== 'admin') {
    throw new BadRequestError('Not authorized to upload this kind of image');
  }

  const signature = createUploadSignature(kind);
  log.info({ kind, userId: req.user?._id.toString() }, 'issued upload signature');

  res.json(signature);
});

// @desc    Delete an uploaded asset
// @route   DELETE /api/uploads
// @access  Private/Admin
export const deleteUpload: RequestHandler = asyncHandler(async (req, res) => {
  const { url } = req.body as { url?: unknown };

  // Only assets in our own account can be targeted, so this cannot be used
  // to probe or delete anything else.
  const publicId = typeof url === 'string' ? publicIdFromUrl(url) : null;

  if (!publicId) {
    throw new BadRequestError('That is not an asset belonging to this application');
  }

  await deleteAsset(publicId);
  log.info({ publicId }, 'deleted asset');

  res.json({ message: 'Image deleted' });
});
