import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

/**
 * Audit domain (PRD §49): every critical action is traceable as
 * WHO (actorId) did WHAT (action) to WHICH TARGET, WHEN (createdAt),
 * with WHAT RESULT — scoped per workspace (tenant isolation, PRD §19).
 *
 * Logging NEVER breaks the business flow: failures are swallowed and logged
 * after the primary write has already committed.
 */

const LOG_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 200;

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          workspaceId: entry.workspaceId,
          actorId: entry.actorId,
          action: entry.action,
          target: entry.target,
          result: entry.result,
          metadata: entry.metadata as never,
        },
      });
    } catch (cause) {
      // PRD §49: audit must not break the flow it observes.
      this.logger.error(
        `Failed to write audit log for ${entry.action} on ${entry.target}: ${String(cause)}`,
      );
    }
  }

  async listLogs(
    actorId: string,
    workspaceId: string,
    filters: {
      action?: string;
      actorId?: string;
      result?: 'SUCCESS' | 'FAILURE';
      from?: string;
      to?: string;
      cursor?: string;
      limit?: number;
    },
  ): Promise<{
    items: AuditLogView[];
    nextCursor: string | null;
  }> {
    const limit = Math.min(Math.max(filters.limit ?? LOG_PAGE_SIZE, 1), MAX_PAGE_SIZE);

    const logs = await this.prisma.auditLog.findMany({
      where: {
        workspaceId,
        ...(filters.action ? { action: filters.action } : {}),
        ...(filters.actorId ? { actorId: filters.actorId } : {}),
        ...(filters.result ? { result: filters.result } : {}),
        ...(filters.from || filters.to
          ? {
              createdAt: {
                ...(filters.from ? { gte: new Date(filters.from) } : {}),
                ...(filters.to ? { lte: new Date(filters.to) } : {}),
              },
            }
          : {}),
      },
      include: { actor: { select: { displayName: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
    });

    const hasMore = logs.length > limit;
    const page = hasMore ? logs.slice(0, limit) : logs;

    return {
      items: page.map((log) => this.toView(log)),
      nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
    };
  }

  private toView(log: {
    id: string;
    workspaceId: string | null;
    actorId: string | null;
    action: string;
    target: string;
    result: string;
    metadata: unknown;
    createdAt: Date;
    actor?: { displayName: string } | null;
  }): AuditLogView {
    return {
      id: log.id,
      workspaceId: log.workspaceId,
      actorId: log.actorId,
      actorName: log.actor?.displayName ?? null,
      action: log.action,
      target: log.target,
      result: log.result,
      metadata: log.metadata,
      createdAt: log.createdAt,
    };
  }
}

export interface AuditEntry {
  readonly workspaceId: string | null;
  readonly actorId: string | null;
  readonly action: string;
  readonly target: string;
  readonly result: 'SUCCESS' | 'FAILURE';
  readonly metadata?: Record<string, unknown>;
}

export interface AuditLogView {
  readonly id: string;
  readonly workspaceId: string | null;
  readonly actorId: string | null;
  readonly actorName: string | null;
  readonly action: string;
  readonly target: string;
  readonly result: string;
  readonly metadata: unknown;
  readonly createdAt: Date;
}
