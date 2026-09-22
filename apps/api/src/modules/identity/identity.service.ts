import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { conflict, notFound } from '@sofo/shared';

export interface CreateIdentityInput {
  readonly email: string;
  readonly displayName: string;
  readonly passwordHash: string;
}

export interface UpdateProfileInput {
  readonly displayName?: string;
}

/**
 * Identity domain (PRD §14): owns account identity and its lifecycle.
 * Authentication depends on it; authorization never reads passwords from here.
 */
@Injectable()
export class IdentityService {
  constructor(private readonly prisma: PrismaService) {}

  async createIdentity(input: CreateIdentityInput) {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw conflict('An account with this email already exists');
    }
    return this.prisma.user.create({
      data: {
        email: input.email,
        displayName: input.displayName,
        passwordHash: input.passwordHash,
      },
      select: IDENTITY_SELECT,
    });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: IDENTITY_SELECT,
    });
    if (!user) {
      throw notFound('User');
    }
    return user;
  }

  async lookupByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: IDENTITY_SELECT,
    });
    if (!user) {
      throw notFound('User');
    }
    return user;
  }

  async updateProfile(userId: string, input: UpdateProfileInput) {
    await this.getProfile(userId);
    return this.prisma.user.update({
      where: { id: userId },
      data: { displayName: input.displayName },
      select: IDENTITY_SELECT,
    });
  }
}

const IDENTITY_SELECT = {
  id: true,
  email: true,
  displayName: true,
  status: true,
  createdAt: true,
} as const;
