import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { forbidden } from '@sofo/shared';

export interface MembershipView {
  readonly userId: string;
  readonly workspaceId: string;
  readonly role: string;
}

/**
 * Authorization domain (PRD §16): decides "what may this user do?".
 * Roles are resolved through workspace membership; permissions are checked
 * per-operation — role names alone are never a security boundary (PRD §25).
 */
@Injectable()
export class AuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  /** Returns the member's permission set, or null when not a member. */
  async getMembership(userId: string, workspaceId: string): Promise<MembershipView | null> {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      include: { role: true },
    });
    if (!member) {
      return null;
    }
    return { userId, workspaceId, role: member.role.name };
  }

  async assertPermission(userId: string, workspaceId: string, permission: string): Promise<void> {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      include: { role: true },
    });
    if (!member) {
      // Not a member: indistinguishable from a missing resource (no tenant leak).
      throw forbidden('Access denied');
    }
    const permissions = member.role.permissions as readonly string[];
    if (!permissions.includes(permission)) {
      throw forbidden(`Missing required permission: ${permission}`);
    }
  }

  /** Non-throwing check used for domain rules (e.g. self-approval ban). */
  async hasPermission(userId: string, workspaceId: string, permission: string): Promise<boolean> {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      include: { role: true },
    });
    if (!member) {
      return false;
    }
    return (member.role.permissions as readonly string[]).includes(permission);
  }
}
