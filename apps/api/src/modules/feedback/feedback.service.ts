import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { AuditService } from '../audit/audit.service';
import { conflict, notFound } from '@sofo/shared';
import type { NotificationEventPayload } from '@sofo/shared';

/**
 * Feedback loop domain (PRD §98, Phase 27):
 * USER → FEEDBACK → TRIAGE (decide) → PRIORITY → IMPLEMENTATION.
 * Members report bugs/UX/feature requests; holders of `feedback.decide`
 * triage them (ACCEPTED/REJECTED/REVIEWED). Every query is tenant-scoped
 * by workspaceId (PRD §19).
 */

const DECIDE_PERMISSION = 'feedback.decide';

export interface FeedbackView {
  readonly id: string;
  readonly workspaceId: string;
  readonly reporterId: string;
  readonly reporterName: string | null;
  readonly type: string;
  readonly message: string;
  readonly status: string;
  readonly decisionNote: string | null;
  readonly decidedById: string | null;
  readonly decidedByName: string | null;
  readonly decidedAt: string | null;
  readonly voteCount: number;
  readonly votedByMe: boolean;
  readonly createdAt: string;
}

const FEEDBACK_INCLUDE = {
  reporter: { select: { displayName: true } },
  decidedBy: { select: { displayName: true } },
  votes: { select: { userId: true } },
} as const;

@Injectable()
export class FeedbackService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async submitFeedback(
    actorId: string,
    workspaceId: string,
    input: { type: string; message: string },
  ): Promise<FeedbackView> {
    // Any member (workspace.view) may report feedback — the loop must be open.
    await this.authorizationService.assertPermission(actorId, workspaceId, 'workspace.view');

    const created = await this.prisma.feedback.create({
      data: {
        workspaceId,
        reporterId: actorId,
        type: input.type as never,
        message: input.message,
      },
      include: FEEDBACK_INCLUDE,
    });

    await this.auditService.record({
      workspaceId,
      actorId,
      action: 'feedback.submit',
      target: `feedback:${created.id}`,
      result: 'SUCCESS',
      metadata: { type: created.type },
    });

    // ADR-005: triagers (feedback.decide holders) learn about new feedback.
    this.eventEmitter.emit('notification.feedback.submitted', {
      workspaceId,
      actorId,
      recipientIds: await this.deciderIds(workspaceId),
      type: 'feedback.submitted',
      title: `Feedback baru (${created.type.toLowerCase()})`,
      body: created.message.slice(0, 140),
      refType: 'feedback',
      refId: created.id,
    } satisfies NotificationEventPayload);

    return this.toView(created, actorId);
  }

  async listFeedback(
    actorId: string,
    workspaceId: string,
    filters: { status?: string; mine?: boolean },
  ): Promise<{ items: FeedbackView[] }> {
    await this.authorizationService.assertPermission(actorId, workspaceId, 'workspace.view');

    const feedbacks = await this.prisma.feedback.findMany({
      where: {
        workspaceId,
        ...(filters.mine ? { reporterId: actorId } : {}),
        ...(filters.status ? { status: filters.status as never } : {}),
      },
      include: FEEDBACK_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return { items: feedbacks.map((row) => this.toView(row, actorId)) };
  }

  /** Idempotency by unique(feedbackId, userId): a second vote is a 409. */
  async vote(
    actorId: string,
    workspaceId: string,
    feedbackId: string,
  ): Promise<FeedbackView> {
    await this.authorizationService.assertPermission(actorId, workspaceId, 'workspace.view');

    const feedback = await this.prisma.feedback.findFirst({
      where: { id: feedbackId, workspaceId },
      include: FEEDBACK_INCLUDE,
    });
    if (!feedback) {
      throw notFound('Feedback');
    }

    const existingVote = await this.prisma.feedbackVote.findUnique({
      where: { feedbackId_userId: { feedbackId, userId: actorId } },
    });
    if (existingVote) {
      throw conflict('You have already voted for this feedback');
    }

    await this.prisma.feedbackVote.create({
      data: { feedbackId, userId: actorId },
    });

    // Refetch supaya voteByMe & count akurat setelah vote tersimpan.
    const refreshed = await this.prisma.feedback.findFirst({
      where: { id: feedbackId, workspaceId },
      include: FEEDBACK_INCLUDE,
    });
    return this.toView(refreshed ?? feedback, actorId);
  }

  async decide(
    actorId: string,
    workspaceId: string,
    feedbackId: string,
    input: { status: string; decisionNote?: string },
  ): Promise<FeedbackView> {
    await this.authorizationService.assertPermission(actorId, workspaceId, DECIDE_PERMISSION);

    const feedback = await this.prisma.feedback.findFirst({
      where: { id: feedbackId, workspaceId },
      include: FEEDBACK_INCLUDE,
    });
    if (!feedback) {
      throw notFound('Feedback');
    }
    if (feedback.status !== 'OPEN') {
      throw conflict(`Feedback is already ${feedback.status.toLowerCase()}`);
    }

    const updated = await this.prisma.feedback.update({
      where: { id: feedbackId },
      data: {
        status: input.status as never,
        decisionNote: input.decisionNote ?? null,
        decidedById: actorId,
        decidedAt: new Date(),
      },
      include: FEEDBACK_INCLUDE,
    });

    await this.auditService.record({
      workspaceId,
      actorId,
      action: 'feedback.decide',
      target: `feedback:${feedbackId}`,
      result: 'SUCCESS',
      metadata: { status: updated.status, note: input.decisionNote ?? null },
    });

    // ADR-005: the reporter learns the triage decision (PRD §98 loop close).
    this.eventEmitter.emit('notification.feedback.decided', {
      workspaceId,
      actorId,
      recipientIds: [updated.reporterId],
      type: 'feedback.decided',
      title: `Feedback ${updated.status.toLowerCase()}: ${updated.type.toLowerCase()}`,
      body: input.decisionNote ?? undefined,
      refType: 'feedback',
      refId: updated.id,
    } satisfies NotificationEventPayload);

    return this.toView(updated, actorId);
  }

  private async deciderIds(workspaceId: string): Promise<string[]> {
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId, role: { permissions: { has: DECIDE_PERMISSION } } },
      select: { userId: true },
    });
    return members.map((member) => member.userId);
  }

  private toView(
    row: {
      id: string;
      workspaceId: string;
      reporterId: string;
      type: string;
      message: string;
      status: string;
      decisionNote: string | null;
      decidedById: string | null;
      decidedAt: Date | null;
      createdAt: Date;
      reporter?: { displayName: string } | null;
      decidedBy?: { displayName: string } | null;
      votes?: { userId: string }[];
    },
    actorId: string,
    voteCountOverride?: number,
  ): FeedbackView {
    const votes = row.votes ?? [];
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      reporterId: row.reporterId,
      reporterName: row.reporter?.displayName ?? null,
      type: row.type,
      message: row.message,
      status: row.status,
      decisionNote: row.decisionNote,
      decidedById: row.decidedById,
      decidedByName: row.decidedBy?.displayName ?? null,
      decidedAt: row.decidedAt?.toISOString() ?? null,
      voteCount: voteCountOverride ?? votes.length,
      votedByMe: votes.some((vote) => vote.userId === actorId),
      createdAt: row.createdAt.toISOString(),
    };
  }
}
