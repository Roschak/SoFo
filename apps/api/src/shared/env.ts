import 'dotenv/config';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/** Typed environment access. Fail fast on missing config (PRD §10 foundation). */
export const env = {
  get nodeEnv(): string {
    return process.env.NODE_ENV ?? 'development';
  },
  get port(): number {
    return Number(process.env.PORT ?? '3001');
  },
  get databaseUrl(): string {
    return requireEnv('DATABASE_URL');
  },
  get sessionTtlHours(): number {
    return Number(process.env.SESSION_TTL_HOURS ?? '72');
  },
  get uploadDir(): string {
    return process.env.UPLOAD_DIR ?? '../../data/uploads';
  },
  get corsOrigin(): string {
    return process.env.CORS_ORIGIN ?? 'http://localhost:5173';
  },
  /**
   * CORS origins as a list — CORS_ORIGIN accepts a comma-separated list so the
   * Capacitor Android shell (custom origin) and LAN testers can call the API
   * alongside the Vite dev server (Phase 26 beta, PRD §102).
   */
  get corsOrigins(): string[] {
    return this.corsOrigin
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  },
};
