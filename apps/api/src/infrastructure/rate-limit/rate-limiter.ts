import type { NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

/**
 * Dependency-free fixed-window rate limiter (PRD §139 anti-abuse).
 * Keyed by route class + client identity (user id when authenticated,
 * else IP). Configured per route via factory — see rate-limits.ts.
 *
 * Storage is in-memory: correct for the current single-instance deployment
 * (ADR-004). When scaling horizontally, move the counter store to Redis —
 * the middleware contract stays identical.
 */

export interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface RateLimitOptions {
  /** Maximum requests inside the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
  /** Stable bucket key, e.g. 'auth:login'. */
  bucket: string;
}

const store = new Map<string, RateLimitEntry>();

/** Exported for tests — resets all counters. */
export function resetRateLimiter(): void {
  store.clear();
}

export function clientKey(request: Request & { userId?: string }): string {
  const header = request.headers.authorization;
  const bearer = typeof header === 'string' ? header.slice(7) : '';
  return (
    (request as unknown as { userId?: string }).userId ??
    (bearer ? `t:${bearer.slice(-24)}` : `ip:${request.ip ?? 'unknown'}`)
  );
}

/** True when the request is allowed; also stamps rate-limit headers. */
export function consumeRateLimit(
  key: string,
  options: RateLimitOptions,
  response: Response,
): boolean {
  const now = Date.now();
  const composite = `${options.bucket}:${key}`;
  const entry = store.get(composite);

  if (!entry || entry.resetAt <= now) {
    store.set(composite, { count: 1, resetAt: now + options.windowMs });
  } else {
    entry.count += 1;
  }

  const current = store.get(composite) as RateLimitEntry;
  const remaining = Math.max(0, options.limit - current.count);
  response.setHeader('X-RateLimit-Limit', String(options.limit));
  response.setHeader('X-RateLimit-Remaining', String(remaining));
  response.setHeader('X-RateLimit-Reset', String(Math.ceil(current.resetAt / 1000)));

  // Opportunistic cleanup so the map cannot grow unbounded.
  if (store.size > 10_000) {
    for (const [mapKey, value] of store) {
      if (value.resetAt <= now) store.delete(mapKey);
    }
  }

  return current.count <= options.limit;
}

export function createRateLimiter(options: RateLimitOptions) {
  return class RateLimiterMiddleware implements NestMiddleware {
    use(request: Request & { userId?: string }, response: Response, next: NextFunction): void {
      const key = clientKey(request);
      if (!consumeRateLimit(key, options, response)) {
        response.status(429).json({
          code: 'RATE_LIMITED',
          message: 'Too many requests — slow down and try again shortly',
        });
        return;
      }
      next();
    }
  };
}
