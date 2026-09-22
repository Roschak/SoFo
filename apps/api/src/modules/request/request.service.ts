import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { AuditService } from '../audit/audit.service';
import { conflict, forbidden, notFound } from '@sofo/shared';
import type { NotificationEventPayload } from '@sofo/shared';

/**
 * Request & Approval domain (PRD §44, §45, §88).
 * Workflow: requester creates → approver reviews → approve/reject → audit.
 * (The notification hop of PRD §45 lands with the notification system, §89.)
 * Every query is tenant-scoped by workspaceId (PRD §19, §66 tenant validation).
 */

const DECIDE_PERMISSION = 'request.approve';

export interface RequestView {
  readonly id: string;
  readonly workspaceId: string;
  readonly requesterId: string;
  readonly requesterName: string | null;
  readonly type: string;
  readonly title: string;
  readonly payload: unknown;
  readonly status: string;
  readonly approverId: string | null;
  readonly approverName: string | null;
  readonly decisionNote: string | null;
  readonly decidedAt: string | null;
  readonly createdAt: string;
}

@Injectable()
export class RequestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createRequest(
    actorId: string,
    workspaceId: string,
    input: { type: string; title: string; payload?: unknown },
  ): Promise<RequestView> {
    await this.authorizationService.assertPermission(actorId, workspaceId, 'request.create');

    const created = await this.prisma.request.create({
      data: {
        workspaceId,
        requesterId: actorId,
        type: input.type as never,
        title: input.title,
        payload: (input.payload ?? undefined) as never,
      },
      include: REQUEST_INCLUDE,
    });

    await this.auditService.record({
      workspaceId,
      actorId,
      action: 'request.create',
      target: `request:${created.id}`,
      result: 'SUCCESS',
      metadata: { type: created.type, title: created.title },
    });

    // ADR-005: notify potential approvers (holders of request.approve).
    this.eventEmitter.emit('notification.request.created', {
      workspaceId,
      actorId,
      recipientIds: await this.approverIds(workspaceId),
      type: 'request.created',
      title: `Permintaan baru: ${created.title}`,
      body: `${created.requester?.displayName ?? 'Seseorang'} mengajukan ${created.type.toLowerCase()}`,
      refType: 'request',
      refId: created.id,
    } satisfies NotificationEventPayload);

    return this.toView(created);
  }

  /** Members see their own requests; request.approve holders see all. */
  async listRequests(
    actorId: string,
    workspaceId: string,
    filters: { status?: string; mine?: boolean },
  ): Promise<{ items: RequestView[] }> {
    const canApprove = await this.authorizationService.hasPermission(
      actorId,
      workspaceId,
      DECIDE_PERMISSION,
    );
    const seeAll = canApprove && !filters.mine;

    await this.authorizationService.assertPermission(actorId, workspaceId, 'request.create');

    const requests = await this.prisma.request.findMany({
      where: {
        workspaceId,
        ...(seeAll ? {} : { requesterId: actorId }),
        ...(filters.status ? { status: filters.status as never } : {}),
      },
      include: REQUEST_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return { items: requests.map((request) => this.toView(request)) };
  }

  async decideRequest(
    actorId: string,
    workspaceId: string,
    requestId: string,
    decision: 'APPROVED' | 'REJECTED',
    decisionNote?: string,
  ): Promise<RequestView> {
    await this.authorizationService.assertPermission(actorId, workspaceId, DECIDE_PERMISSION);

    const request = await this.prisma.request.findFirst({
      where: { id: requestId, workspaceId },
      include: REQUEST_INCLUDE,
    });
    if (!request) {
      throw notFound('Request');
    }
    if (request.status !== 'PENDING') {
      throw conflict(`Request is already ${request.status.toLowerCase()}`);
    }
    if (request.requesterId === actorId) {
      // Separation of duties: nobody approves their own request (PRD §45).
      throw forbidden('You cannot decide your own request');
    }

    const updated = await this.prisma.request.update({
      where: { id: requestId },
      data: {
        status: decision,
        approverId: actorId,
        decisionNote: decisionNote ?? null,
        decidedAt: new Date(),
      },
      include: REQUEST_INCLUDE,
    });

    await this.auditService.record({
      workspaceId,
      actorId,
      action: decision === 'APPROVED' ? 'request.approve' : 'request.reject',
      target: `request:${requestId}`,
      result: 'SUCCESS',
      metadata: { type: updated.type, requesterId: updated.requesterId, note: decisionNote ?? null },
    });

    // ADR-005: PRD §45 notification hop — the requester learns the decision.
    this.eventEmitter.emit(
      decision === 'APPROVED' ? 'notification.request.approved' : 'notification.request.rejected',
      {
        workspaceId,
        actorId,
        recipientIds: [updated.requesterId],
        type: decision === 'APPROVED' ? 'request.approved' : 'request.rejected',
        title:
          decision === 'APPROVED'
            ? `Permintaan disetujui: ${updated.title}`
            : `Permintaan ditolak: ${updated.title}`,
        body: decisionNote ?? undefined,
        refType: 'request',
        refId: updated.id,
      } satisfies NotificationEventPayload,
    );

    return this.toView(updated);
  }

  async cancelRequest(
    actorId: string,
    workspaceId: string,
    requestId: string,
  ): Promise<RequestView> {
    const request = await this.prisma.request.findFirst({
      where: { id: requestId, workspaceId },
      include: REQUEST_INCLUDE,
    });
    if (!request) {
      throw notFound('Request');
    }
    if (request.requesterId !== actorId) {
      // Only the requester may withdraw; others get the standard 403.
      throw forbidden('Only the requester can cancel a request');
    }
    if (request.status !== 'PENDING') {
      throw conflict(`Request is already ${request.status.toLowerCase()}`);
    }

    const updated = await this.prisma.request.update({
      where: { id: requestId },
      data: { status: 'CANCELLED', decidedAt: new Date() },
      include: REQUEST_INCLUDE,
    });

    await this.auditService.record({
      workspaceId,
      actorId,
      action: 'request.cancel',
      target: `request:${requestId}`,
      result: 'SUCCESS',
      metadata: { type: updated.type },
    });

    return this.toView(updated);
  }

  /** Users holding request.approve — potential approvers to notify. */
  private async approverIds(workspaceId: string): Promise<string[]> {
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId, role: { permissions: { has: DECIDE_PERMISSION } } },
      select: { userId: true },
    });
    return members.map((member) => member.userId);
  }

  private toView(request: RequestWithRelations): RequestView {
    return {
      id: request.id,
      workspaceId: request.workspaceId,
      requesterId: request.requesterId,
      requesterName: request.requester?.displayName ?? null,
      type: request.type,
      title: request.title,
      payload: request.payload,
      status: request.status,
      approverId: request.approverId,
      approverName: request.approver?.displayName ?? null,
      decisionNote: request.decisionNote,
      decidedAt: request.decidedAt?.toISOString() ?? null,
      createdAt: request.createdAt.toISOString(),
    };
  }
}

const REQUEST_INCLUDE = {
  requester: { select: { displayName: true } },
  approver: { select: { displayName: true } },
} as const;

type RequestWithRelations = {
  id: string;
  workspaceId: string;
  requesterId: string;
  type: string;
  title: string;
  payload: unknown;
  status: string;
  approverId: string | null;
  decisionNote: string | null;
  decidedAt: Date | null;
  createdAt: Date;
  requester?: { displayName: string } | null;
  approver?: { displayName: string } | null;
};
