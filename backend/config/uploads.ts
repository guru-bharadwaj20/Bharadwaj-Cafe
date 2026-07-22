import { v2 as cloudinary } from 'cloudinary';
import { BadRequestError, ServiceUnavailableError } from '../utils/errors.js';

/**
 * Image uploads via Cloudinary, using *signed direct uploads*.
 *
 * The browser uploads straight to Cloudinary; the file never passes through
 * this server. That avoids holding multi-megabyte buffers in Node's memory,
 * avoids a request timeout on a slow connection, and means no disk to fill.
 *
 * What the server keeps is control: it signs each upload with parameters the
 * client cannot alter. The signature covers the folder, the timestamp and the
 * allowed formats, so a leaked signature cannot be reused to upload anything,
 * anywhere, forever.
 */

export const uploadsEnabled = (): boolean =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );

let configured = false;

const configure = (): void => {
  if (configured) return;
  if (!uploadsEnabled()) {
    throw new ServiceUnavailableError('Image uploads are not configured');
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  configured = true;
};

/** Where each kind of image lives. An arbitrary folder is never accepted. */
const FOLDERS = {
  menu: 'bharadwaj-cafe/menu',
  blog: 'bharadwaj-cafe/blog',
  review: 'bharadwaj-cafe/reviews',
} as const;

export type UploadKind = keyof typeof FOLDERS;

export const isUploadKind = (value: unknown): value is UploadKind =>
  typeof value === 'string' && value in FOLDERS;

export interface UploadSignature {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
  uploadUrl: string;
  /** Enforced by Cloudinary, not merely suggested to the client. */
  maxBytes: number;
  allowedFormats: string[];
}

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'avif'];

/**
 * Issues a short-lived signature for one upload.
 *
 * Every signed parameter is fixed here. The client supplies only the file.
 */
export const createUploadSignature = (kind: UploadKind): UploadSignature => {
  configure();

  const timestamp = Math.round(Date.now() / 1000);
  const folder = FOLDERS[kind];

  // Only these params are signed, and Cloudinary rejects the upload if the
  // request does not match them exactly.
  const params = {
    timestamp,
    folder,
    allowed_formats: ALLOWED_FORMATS.join(','),
    // Normalises anything huge down to a sane size at ingest, so a 20MP
    // photo does not become a 20MP menu thumbnail.
    transformation: 'c_limit,w_1600,h_1600,q_auto:good',
  };

  const signature = cloudinary.utils.api_sign_request(
    params,
    process.env.CLOUDINARY_API_SECRET as string
  );

  return {
    signature,
    timestamp,
    apiKey: process.env.CLOUDINARY_API_KEY as string,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME as string,
    folder,
    uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME as string}/image/upload`,
    maxBytes: MAX_BYTES,
    allowedFormats: ALLOWED_FORMATS,
  };
};

/**
 * Confirms that a URL the client reports really is an asset in our account.
 *
 * Without this check a client could set any menu image to any URL on the
 * internet — including one that later changes to something we would not host.
 */
export const isOwnedAssetUrl = (url: unknown): url is string => {
  if (typeof url !== 'string') return false;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) return false;

  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname === 'res.cloudinary.com' &&
      parsed.pathname.startsWith(`/${cloudName}/`) &&
      parsed.pathname.includes('/bharadwaj-cafe/')
    );
  } catch {
    return false;
  }
};

/** Removes an asset, e.g. when a menu item is deleted. */
export const deleteAsset = async (publicId: string): Promise<void> => {
  configure();
  await cloudinary.uploader.destroy(publicId);
};

/** Extracts the Cloudinary public id from a delivery URL. */
export const publicIdFromUrl = (url: string): string | null => {
  if (!isOwnedAssetUrl(url)) return null;

  // .../upload/<optional transformations>/v1234567890/<folder>/<name>.<ext>
  const match = /\/upload\/(?:[^/]+\/)*v\d+\/(.+)\.[a-z0-9]+$/i.exec(new URL(url).pathname);
  return match?.[1] ?? null;
};

export const assertValidImageUrl = (url: unknown): string => {
  if (!isOwnedAssetUrl(url)) {
    throw new BadRequestError('Image must be uploaded through this application');
  }
  return url;
};
