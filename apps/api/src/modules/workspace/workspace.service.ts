import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { conflict, forbidden, notFound } from '@sofo/shared';
import { DEFAULT_ROLE_PERMISSIONS } from '@sofo/shared';

export interface WorkspaceView {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly mode: string;
  readonly description: string | null;
  readonly ownerId: string;
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

/**
 * Workspace domain (PRD §20): root container of all organization activity.
 * Creating a workspace atomically seeds default roles and the owner membership
 * inside one transaction (PRD §59).
 */
@Injectable()
export class WorkspaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async createWorkspace(ownerId: string, input: { name: string; mode: 'ENTERPRISE' | 'COMMUNITY'; description?: string }) {
    const baseSlug = toSlug(input.name);
    const slug = await this.unusedSlugFor(baseSlug);

    const roleSeed = Object.entries(DEFAULT_ROLE_PERMISSIONS).map(([name, permissions]) => ({
      name,
      isSystem: true,
      permissions: [...permissions],
    }));

    const workspace = await this.prisma.$transaction(async (tx) => {
      const created = await tx.workspace.create({
        data: {
          name: input.name,
          slug,
          mode: input.mode,
          description: input.description,
          ownerId,
        },
      });

      await tx.role.createMany({ data: roleSeed.map((role) => ({ ...role, workspaceId: created.id })) });

      const ownerRole = await tx.role.findFirstOrThrow({
        where: { workspaceId: created.id, name: 'OWNER' },
      });

      await tx.workspaceMember.create({
        data: { workspaceId: created.id, userId: ownerId, roleId: ownerRole.id },
      });

      return created;
    });

    return this.toView(workspace);
  }

  async getWorkspace(actorId: string, workspaceId: string): Promise<WorkspaceView> {
    const membership = await this.authorizationService.getMembership(actorId, workspaceId);
    if (!membership) {
      throw forbidden('Access denied');
    }
    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) {
      throw notFound('Workspace');
    }
    return this.toView(workspace);
  }

  async listWorkspacesForUser(userId: string): Promise<WorkspaceView[]> {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId },
      include: { workspace: true },
    });
    return memberships.map((membership) => this.toView(membership.workspace));
  }

  async updateWorkspace(actorId: string, workspaceId: string, input: { name?: string; description?: string }) {
    await this.authorizationService.assertPermission(actorId, workspaceId, 'workspace.update');
    const workspace = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: input,
    });
    return this.toView(workspace);
  }

  async listMembers(actorId: string, workspaceId: string) {
    await this.authorizationService.assertPermission(actorId, workspaceId, 'member.view');
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, email: true, displayName: true } }, role: true },
    });
    return members.map((member) => ({
      id: member.id,
      user: member.user,
      role: member.role.name,
      joinedAt: member.joinedAt,
    }));
  }

  async inviteMember(actorId: string, workspaceId: string, input: { userId: string; roleName: string }) {
    await this.authorizationService.assertPermission(actorId, workspaceId, 'member.invite');

    const [user, role] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: input.userId } }),
      this.prisma.role.findFirst({ where: { workspaceId, name: input.roleName } }),
    ]);
    if (!user) {
      throw notFound('User');
    }
    if (!role) {
      throw notFound('Role');
    }

    const existing = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: input.userId } },
    });
    if (existing) {
      throw conflict('User is already a member of this workspace');
    }

    await this.prisma.workspaceMember.create({
      data: { workspaceId, userId: input.userId, roleId: role.id },
    });
    return { success: true };
  }

  async setMemberRole(actorId: string, workspaceId: string, memberId: string, roleName: string) {
    await this.authorizationService.assertPermission(actorId, workspaceId, 'member.role.set');

    const role = await this.prisma.role.findFirst({ where: { workspaceId, name: roleName } });
    if (!role) {
      throw notFound('Role');
    }

    const member = await this.prisma.workspaceMember.findUnique({ where: { id: memberId } });
    if (!member || member.workspaceId !== workspaceId) {
      throw notFound('Member');
    }
    if (member.roleId === role.id) {
      throw conflict('Member already has this role');
    }

    await this.prisma.workspaceMember.update({ where: { id: memberId }, data: { roleId: role.id } });
    return { success: true };
  }

  async removeMember(actorId: string, workspaceId: string, memberId: string) {
    await this.authorizationService.assertPermission(actorId, workspaceId, 'member.remove');

    const member = await this.prisma.workspaceMember.findUnique({ where: { id: memberId } });
    if (!member || member.workspaceId !== workspaceId) {
      throw notFound('Member');
    }

    const workspace = await this.prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
    if (member.userId === workspace.ownerId) {
      throw conflict('Workspace owner cannot be removed');
    }

    await this.prisma.workspaceMember.delete({ where: { id: memberId } });
    return { success: true };
  }

  private async unusedSlugFor(baseSlug: string): Promise<string> {
    let candidate = baseSlug;
    let suffix = 1;
    while (await this.prisma.workspace.findUnique({ where: { slug: candidate } })) {
      suffix += 1;
      candidate = `${baseSlug}-${suffix}`;
    }
    return candidate;
  }

  private toView(workspace: {
    id: string;
    name: string;
    slug: string;
    mode: string;
    description: string | null;
    ownerId: string;
  }): WorkspaceView {
    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      mode: workspace.mode,
      description: workspace.description,
      ownerId: workspace.ownerId,
    };
  }
}
