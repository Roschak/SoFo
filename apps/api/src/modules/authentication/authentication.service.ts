import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { hash as bcryptHash, compare as bcryptVerify } from 'bcryptjs';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { env } from '../../shared/env';
import { IdentityService } from '../identity/identity.service';
import {
  forbidden,
  unauthenticated,
  validationError,
} from '@sofo/shared';

export interface RegisterInput {
  readonly email: string;
  readonly displayName: string;
  readonly password: string;
}

export interface AuthenticatedUser {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
}

const SESSION_SELECT = { token: true, expiresAt: true } as const;

const SESSION_TTL_MS_PER_HOUR = 3_600_000;
const BCRYPT_SALT_ROUNDS = 12;

/**
 * Authentication domain (PRD §15): registration, login, logout, session.
 * It never decides what a user may do — that is authorization's job (PRD §16).
 */
@Injectable()
export class AuthenticationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly identityService: IdentityService,
  ) {}

  async register(input: RegisterInput): Promise<AuthenticatedUser> {
    const details: string[] = [];
    if (!isValidEmail(input.email)) details.push('email must be a valid address');
    if (input.displayName.trim().length < 1) details.push('displayName must not be empty');
    if (!isStrongPassword(input.password)) details.push('password must be at least 8 characters and contain letters and numbers');

    if (details.length > 0) {
      throw validationError(details);
    }

    const passwordHash = await hashPassword(input.password);
    const user = await this.identityService.createIdentity({
      email: input.email.toLowerCase(),
      displayName: input.displayName,
      passwordHash,
    });
    return { id: user.id, email: user.email, displayName: user.displayName };
  }

  async login(email: string, password: string): Promise<{ user: AuthenticatedUser; token: string; expiresAt: Date }> {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      // Same error for unknown email and wrong password (no account enumeration).
      throw unauthenticated('Invalid email or password');
    }
    if (user.status === 'SUSPENDED' || user.status === 'DEACTIVATED') {
      throw forbidden('This account is not allowed to sign in');
    }

    return this.createSession(user.id, { id: user.id, email: user.email, displayName: user.displayName });
  }

  async logout(token: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { token: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async validateSession(token: string): Promise<AuthenticatedUser> {
    const session = await this.prisma.session.findUnique({
      where: { token: hashToken(token) },
      include: { user: true },
    });
    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw unauthenticated('Session is invalid or expired');
    }
    if (session.user.status !== 'ACTIVE') {
      throw forbidden('This account is not allowed to sign in');
    }
    return { id: session.user.id, email: session.user.email, displayName: session.user.displayName };
  }

  private async createSession(userId: string, user: AuthenticatedUser) {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + env.sessionTtlHours * SESSION_TTL_MS_PER_HOUR);
    const session = await this.prisma.session.create({
      data: { token: hashToken(token), userId, expiresAt },
      select: SESSION_SELECT,
    });
    return { user, token, expiresAt: session.expiresAt };
  }
}

/** Only token hashes are stored; a database leak must not yield usable sessions. */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function hashPassword(plain: string): Promise<string> {
  return bcryptHash(plain, BCRYPT_SALT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcryptVerify(plain, hash);
}

function isStrongPassword(password: string): boolean {
  return password.length >= 8 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
