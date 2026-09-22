import {
  consumeRateLimit,
  createRateLimiter,
  clientKey,
  resetRateLimiter,
} from './rate-limiter';

describe('rate limiter', () => {
  beforeEach(() => {
    resetRateLimiter();
  });

  function fakeResponse(): { headers: Record<string, string>; setHeader: (k: string, v: string) => void } {
    const headers: Record<string, string> = {};
    return { headers, setHeader: (k, v) => { headers[k] = v; } };
  }

  it('allows requests under the limit and rejects beyond it', () => {
    const options = { bucket: 'test', limit: 3, windowMs: 60_000 };
    const response = fakeResponse();

    expect(consumeRateLimit('k1', options, response as never)).toBe(true);
    expect(consumeRateLimit('k1', options, response as never)).toBe(true);
    expect(consumeRateLimit('k1', options, response as never)).toBe(true);
    expect(consumeRateLimit('k1', options, response as never)).toBe(false);
  });

  it('counts identities independently', () => {
    const options = { bucket: 'test', limit: 1, windowMs: 60_000 };
    const response = fakeResponse();

    expect(consumeRateLimit('a', options, response as never)).toBe(true);
    expect(consumeRateLimit('b', options, response as never)).toBe(true);
    expect(consumeRateLimit('a', options, response as never)).toBe(false);
  });

  it('resets after the window elapses', () => {
    const options = { bucket: 'test', limit: 1, windowMs: 20 };
    const response = fakeResponse();

    expect(consumeRateLimit('k', options, response as never)).toBe(true);
    expect(consumeRateLimit('k', options, response as never)).toBe(false);
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(consumeRateLimit('k', options, response as never)).toBe(true);
        resolve();
      }, 30);
    });
  });

  it('stamps rate-limit headers', () => {
    const options = { bucket: 'test', limit: 5, windowMs: 60_000 };
    const response = fakeResponse();

    consumeRateLimit('k', options, response as never);
    expect(response.headers['X-RateLimit-Limit']).toBe('5');
    expect(response.headers['X-RateLimit-Remaining']).toBe('4');
  });

  it('derives the identity key from bearer token when no userId', () => {
    const request = { headers: { authorization: 'Bearer abcdefghijklmnop' }, ip: '1.2.3.4' };
    expect(clientKey(request as never)).toBe('t:abcdefghijklmnop');
  });

  it('falls back to the client IP', () => {
    const request = { headers: {}, ip: '10.0.0.1' };
    expect(clientKey(request as never)).toBe('ip:10.0.0.1');
  });

  it('middleware returns 429 body with RATE_LIMITED code', () => {
    const Middleware = createRateLimiter({ bucket: 'mw', limit: 0, windowMs: 60_000 });
    const middleware = new Middleware();

    const response = {
      headers: {} as Record<string, string>,
      setHeader(k: string, v: string) { this.headers[k] = v; },
      status(code: number) { expect(code).toBe(429); return this; },
      json(body: { code: string }) { expect(body.code).toBe('RATE_LIMITED'); return this; },
    };

    middleware.use({ headers: {}, ip: '9.9.9.9' } as never, response as never, () => {
      throw new Error('next() must not run when limited');
    });
  });
});
