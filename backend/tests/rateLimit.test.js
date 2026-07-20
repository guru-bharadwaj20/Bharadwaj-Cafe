/**
 * Rate limiting is skipped for the rest of the suite (see middleware/rateLimit.js),
 * so these tests opt back in explicitly. Without them, disabling the limiter for
 * tests would leave the protection completely unverified.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';

let app;

beforeAll(async () => {
  process.env.ENFORCE_RATE_LIMITS = 'true';
  // Imported after the flag is set; the limiter reads it per-request via skip().
  const { createApp } = await import('../app.js');
  app = createApp();
});

afterAll(() => {
  delete process.env.ENFORCE_RATE_LIMITS;
});

describe('Credential rate limiting', () => {
  it('blocks sustained failed login attempts', async () => {
    const attempt = () =>
      request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: 'wrong' });

    const statuses = [];
    for (let i = 0; i < 14; i += 1) {
      const res = await attempt();
      statuses.push(res.status);
    }

    // The first 10 failures are allowed through as 401s, the rest are refused.
    expect(statuses.filter((s) => s === 401).length).toBe(10);
    expect(statuses.filter((s) => s === 429).length).toBeGreaterThan(0);
    expect(statuses.at(-1)).toBe(429);
  });
});

describe('Outbound-email rate limiting', () => {
  it('caps password reset requests', async () => {
    const attempt = () =>
      request(app).post('/api/auth/forgot-password').send({ email: 'someone@example.com' });

    const statuses = [];
    for (let i = 0; i < 8; i += 1) {
      const res = await attempt();
      statuses.push(res.status);
    }

    expect(statuses.filter((s) => s === 200).length).toBe(5);
    expect(statuses.at(-1)).toBe(429);
  });
});
