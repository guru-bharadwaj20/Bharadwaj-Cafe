/**
 * Signed upload issuance.
 *
 * The security properties: the API secret never leaves the server, a
 * signature cannot be requested for an arbitrary folder, and a URL claiming
 * to be an uploaded image must actually be one of ours.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { isOwnedAssetUrl, publicIdFromUrl } from '../config/uploads.js';
import { createUser, createAdmin } from './factories.js';

const CLOUD = 'test-cloud';
const SECRET = 'super-secret-api-key-value';

const app = createApp();

beforeAll(() => {
  process.env.CLOUDINARY_CLOUD_NAME = CLOUD;
  process.env.CLOUDINARY_API_KEY = '123456789';
  process.env.CLOUDINARY_API_SECRET = SECRET;
});

afterAll(() => {
  delete process.env.CLOUDINARY_CLOUD_NAME;
  delete process.env.CLOUDINARY_API_KEY;
  delete process.env.CLOUDINARY_API_SECRET;
});

describe('GET /api/uploads/config', () => {
  it('reports availability without exposing credentials', async () => {
    const res = await request(app).get('/api/uploads/config').expect(200);

    expect(res.body.enabled).toBe(true);
    expect(JSON.stringify(res.body)).not.toContain(SECRET);
  });
});

describe('POST /api/uploads/signature', () => {
  it('requires authentication', async () => {
    await request(app).post('/api/uploads/signature').send({ kind: 'menu' }).expect(401);
  });

  it('issues a signature to an admin without leaking the secret', async () => {
    const { token } = await createAdmin(app);

    const res = await request(app)
      .post('/api/uploads/signature')
      .set('Authorization', `Bearer ${token}`)
      .send({ kind: 'menu' })
      .expect(200);

    expect(res.body.signature).toMatch(/^[a-f0-9]{40}$/); // sha1 hex
    expect(res.body.folder).toBe('bharadwaj-cafe/menu');
    expect(typeof res.body.timestamp).toBe('number');

    // The signing secret must never reach the browser — only the API key,
    // which is public by design.
    expect(JSON.stringify(res.body)).not.toContain(SECRET);
  });

  it('refuses an arbitrary folder', async () => {
    const { token } = await createAdmin(app);

    // The client picks a *kind*, not a path, so it cannot write outside the
    // folders this application owns.
    await request(app)
      .post('/api/uploads/signature')
      .set('Authorization', `Bearer ${token}`)
      .send({ kind: '../../etc' })
      .expect(400);

    await request(app)
      .post('/api/uploads/signature')
      .set('Authorization', `Bearer ${token}`)
      .send({ folder: 'anything-i-like' })
      .expect(400);
  });

  it('lets a customer upload a review photo but not menu imagery', async () => {
    const { token } = await createUser(app);

    await request(app)
      .post('/api/uploads/signature')
      .set('Authorization', `Bearer ${token}`)
      .send({ kind: 'review' })
      .expect(200);

    await request(app)
      .post('/api/uploads/signature')
      .set('Authorization', `Bearer ${token}`)
      .send({ kind: 'menu' })
      .expect(400);
  });

  it('constrains formats and size in the signed parameters', async () => {
    const { token } = await createAdmin(app);

    const res = await request(app)
      .post('/api/uploads/signature')
      .set('Authorization', `Bearer ${token}`)
      .send({ kind: 'blog' })
      .expect(200);

    expect(res.body.allowedFormats).toContain('webp');
    expect(res.body.allowedFormats).not.toContain('svg'); // scriptable
    expect(res.body.maxBytes).toBe(5 * 1024 * 1024);
  });
});

describe('asset URL validation', () => {
  const ours = `https://res.cloudinary.com/${CLOUD}/image/upload/v1700000000/bharadwaj-cafe/menu/latte.webp`;

  it('accepts a URL from our own account and folder', () => {
    expect(isOwnedAssetUrl(ours)).toBe(true);
  });

  it('rejects anything else', () => {
    // Otherwise an admin could point a menu image at a URL they do not
    // control, whose contents can change after review.
    expect(isOwnedAssetUrl('https://evil.example.com/pwn.png')).toBe(false);
    expect(isOwnedAssetUrl('https://res.cloudinary.com/someone-else/image/upload/v1/x/y.png')).toBe(
      false
    );
    expect(
      isOwnedAssetUrl(`https://res.cloudinary.com/${CLOUD}/image/upload/v1/other-app/y.png`)
    ).toBe(false);
    expect(
      isOwnedAssetUrl(`http://res.cloudinary.com/${CLOUD}/image/upload/v1/bharadwaj-cafe/y.png`)
    ).toBe(false);
    expect(isOwnedAssetUrl(null)).toBe(false);
    expect(isOwnedAssetUrl('not a url at all')).toBe(false);
  });

  it('extracts the public id, including through transformations', () => {
    expect(publicIdFromUrl(ours)).toBe('bharadwaj-cafe/menu/latte');

    const transformed = `https://res.cloudinary.com/${CLOUD}/image/upload/c_limit,w_800/v1700000000/bharadwaj-cafe/blog/post.jpg`;
    expect(publicIdFromUrl(transformed)).toBe('bharadwaj-cafe/blog/post');

    expect(publicIdFromUrl('https://evil.example.com/x.png')).toBeNull();
  });
});

describe('DELETE /api/uploads', () => {
  it('is admin-only', async () => {
    const { token } = await createUser(app);

    await request(app).delete('/api/uploads').send({ url: 'x' }).expect(401);
    await request(app)
      .delete('/api/uploads')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'x' })
      .expect(403);
  });

  it('refuses a URL that is not one of our assets', async () => {
    const { token } = await createAdmin(app);

    await request(app)
      .delete('/api/uploads')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'https://res.cloudinary.com/another-account/image/upload/v1/a/b.png' })
      .expect(400);
  });
});
