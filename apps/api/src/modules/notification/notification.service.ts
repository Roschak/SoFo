import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { getSocketServer } from '../../infrastructure/realtime/socket-server';
import { userRoom } from '@sofo/shared';
import type { NotificationEventPayload, NotificationView } from '@sofo/shared';

/**
 * Centralized notification handler (PRD §46, §47, §89; ADR-005).
 * The ONLY place that converts domain events into stored notifications.
 * Failures are swallowed (logged) — notifications must never break the
 * business flow that triggered them, mirroring AuditService.
 */
@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    // no-op; kept for clarity that the service subscribes via @OnEvent
  }

  // 'notification.**' (bukan '%'): '**' match semua segmen setelah 'notification.',
  // sedangkan '%'/* hanya match tepat satu segmen (eventemitter2). Event nyata
  // seperti 'notification.request.created' punya >1 segmen.
  @OnEvent('notification.**')
  async handleDomainEvent(payload: NotificationEventPayload): Promise<void> {
    try {
      const recipients = payload.recipientIds.filter(
        (userId) => userId && userId !== payload.actorId,
      );
      if (recipients.length === 0) {
        return;
      }

      const created = await this.prisma.notification.createMany({
        data: recipients.map((userId) => ({
          workspaceId: payload.workspaceId,
          userId,
          actorId: payload.actorId,
          type: payload.type,
          title: payload.title,
          body: payload.body ?? null,
          refType: payload.refType ?? null,
          refId: payload.refId ?? null,
        })),
      });

      // Read back the rows we just created for these recipients to push exact views.
      const rows = await this.prisma.notification.findMany({
        where: {
          workspaceId: payload.workspaceId,
          userId: { in: recipients },
          type: payload.type,
          refId: payload.refId ?? null,
          status: 'UNREAD',
          actorId: payload.actorId,
        },
        include: { actor: { select: { displayName: true } } },
        orderBy: { createdAt: 'desc' },
        take: recipients.length,
      });

      const server = getSocketServer();
      for (const row of rows) {
        if (server) {
          server.to(userRoom(row.userId)).emit('notification.created', this.toView(row));
        }
      }

      this.logger.debug(
        `notification.${payload.type} persisted ${created.count} row(s) for ${recipients.length} recipient(s)`,
      );
    } catch (cause) {
      this.logger.error(`Failed to handle notification event: ${String(cause)}`);
    }
  }

  async listMine(userId: string): Promise<NotificationView[]> {
    const rows = await this.prisma.notification.findMany({
      where: { userId },
      include: { actor: { select: { displayName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map((row) => this.toView(row));
  }

  async unreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({
      where: { userId, status: 'UNREAD' },
    });
    return { count };
  }

  async markRead(userId: string, notificationId: string): Promise<{ success: boolean }> {
    const result = await this.prisma.notification.updateMany({
      where: { id: notificationId, userId, status: 'UNREAD' },
      data: { status: 'READ', readAt: new Date() },
    });
    if (result.count > 0) {
      const server = getSocketServer();
      server
        ?.to(userRoom(userId))
        .emit('notification.read', { notificationId, readAt: new Date().toISOString() });
    }
    return { success: true };
  }

  async markAllRead(userId: string): Promise<{ success: boolean }> {
    await this.prisma.notification.updateMany({
      where: { userId, status: 'UNREAD' },
      data: { status: 'READ', readAt: new Date() },
    });
    return { success: true };
  }

  private toView(row: {
    id: string;
    workspaceId: string;
    userId: string;
    actorId: string | null;
    type: string;
    title: string;
    body: string | null;
    refType: string | null;
    refId: string | null;
    status: string;
    createdAt: Date;
    actor?: { displayName: string } | null;
  }): NotificationView {
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      userId: row.userId,
      actorId: row.actorId,
      actorName: row.actor?.displayName ?? null,
      type: row.type as NotificationView['type'],
      title: row.title,
      body: row.body,
      refType: row.refType,
      refId: row.refId,
      status: row.status as NotificationView['status'],
      createdAt: row.createdAt.toISOString(),
    };
  }
}
