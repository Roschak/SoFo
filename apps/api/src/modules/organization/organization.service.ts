import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { conflict, forbidden, notFound } from '@sofo/shared';

export interface OrgUnitView {
  readonly id: string;
  readonly name: string;
  readonly kind: string;
  readonly parentId: string | null;
}

/**
 * Organization domain (PRD §24): department → division → team hierarchy.
 * Enterprise Mode only (PRD §22).
 */
@Injectable()
export class OrganizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async createUnit(
    actorId: string,
    workspaceId: string,
    input: { name: string; kind: 'DEPARTMENT' | 'DIVISION' | 'TEAM'; parentId?: string },
  ): Promise<OrgUnitView> {
    await this.assertEnterpriseMode(workspaceId);
    await this.authorizationService.assertPermission(actorId, workspaceId, 'organization.manage');

    if (input.parentId) {
      const parent = await this.prisma.orgUnit.findUnique({ where: { id: input.parentId } });
      if (!parent || parent.workspaceId !== workspaceId) {
        throw notFound('Parent organization unit');
      }
    }

    const existing = await this.prisma.orgUnit.findFirst({
      where: { workspaceId, name: input.name },
    });
    if (existing) {
      throw conflict('An organization unit with this name already exists');
    }

    const unit = await this.prisma.orgUnit.create({
      data: {
        workspaceId,
        name: input.name,
        kind: input.kind,
        parentId: input.parentId,
      },
    });
    return this.toView(unit);
  }

  async listUnits(actorId: string, workspaceId: string): Promise<OrgUnitView[]> {
    await this.authorizationService.assertPermission(actorId, workspaceId, 'workspace.view');
    const units = await this.prisma.orgUnit.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
    });
    return units.map((unit) => this.toView(unit));
  }

  private async assertEnterpriseMode(workspaceId: string): Promise<void> {
    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) {
      throw notFound('Workspace');
    }
    if (workspace.mode !== 'ENTERPRISE') {
      throw forbidden('This feature requires an ENTERPRISE workspace');
    }
  }

  private toView(unit: { id: string; name: string; kind: string; parentId: string | null }): OrgUnitView {
    return { id: unit.id, name: unit.name, kind: unit.kind, parentId: unit.parentId };
  }
}
