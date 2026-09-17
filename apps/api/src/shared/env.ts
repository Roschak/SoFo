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
};
