import { createRateLimiter } from './rate-limiter';

/**
 * Per-route-class rate limit presets (PRD §139). Applied in AppModule via
 * configure(consumer). Values are generous for real users, hostile to scripts.
 */
export const RATE_LIMITS = {
  /** register + login: 20 attempts / 5 minutes per identity. */
  auth: createRateLimiter({ bucket: 'auth', limit: 20, windowMs: 5 * 60_000 }),
  /** file uploads: 30 files / 10 minutes per identity. */
  file: createRateLimiter({ bucket: 'file', limit: 30, windowMs: 10 * 60_000 }),
} as const;
