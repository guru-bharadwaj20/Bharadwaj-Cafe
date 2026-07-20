import rateLimit from 'express-rate-limit';

const message = (text) => ({ message: text });

// Test suites deliberately hammer the failure paths (wrong passwords, expired
// tokens), which would otherwise exhaust the limit and produce 429s that have
// nothing to do with what is under test. Limits are exercised by their own
// dedicated tests, which opt back in.
const skipInTests = () => process.env.NODE_ENV === 'test' && !process.env.ENFORCE_RATE_LIMITS;

/**
 * Credential endpoints (login, register). Tight enough to make online
 * password guessing impractical without punishing real users.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  skipSuccessfulRequests: true, // only failed attempts count toward the limit
  message: message('Too many attempts. Please try again in 15 minutes.'),
});

/**
 * Endpoints that trigger an outbound email. Stricter, because abuse here
 * costs real money and can be used to spam a third party's inbox.
 */
export const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  message: message('Too many requests. Please try again in an hour.'),
});

/**
 * Broad backstop for the rest of the API.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  message: message('Too many requests. Please slow down.'),
});
