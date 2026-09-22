import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { AuditService } from '../audit/audit.service';
import { RealtimeBroadcaster } from '../realtime/realtime.broadcaster';
import { conflict, forbidden, notFound } from '@sofo/shared';
import type { MessageRealtimeView, NotificationEventPayload } from '@sofo/shared';

/**
 * Communication domain (PRD §28-§31): channels and messages with threads.
 * Every read and write is tenant-scoped by workspaceId (PRD §19).
 */
@Injectable()
export class CommunicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
    private readonly realtimeBroadcaster: RealtimeBroadcaster,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createChannel(
    actorId: string,
    workspaceId: string,
    input: { name: string; type: string; visibility: string; topic?: string },
  ) {
    await this.authorizationService.assertPermission(actorId, workspaceId, 'channel.create');

    const existing = await this.prisma.channel.findFirst({
      where: { workspaceId, name: input.name },
    });
    if (existing) {
      throw conflict('A channel with this name already exists');
    }

    const channel = await this.prisma.channel.create({
      data: {
        workspaceId,
        name: input.name,
        type: input.type as never,
        visibility: input.visibility as never,
        topic: input.topic,
        createdById: actorId,
      },
    });
    return this.toChannelView(channel);
  }

  async listChannels(actorId: string, workspaceId: string) {
    await this.authorizationService.assertPermission(actorId, workspaceId, 'channel.view');
    const channels = await this.prisma.channel.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
    });
    return channels.map((channel) => this.toChannelView(channel));
  }

  async sendMessage(
    actorId: string,
    workspaceId: string,
    channelId: string,
    input: { content: string; replyToId?: string },
  ) {
    await this.authorizationService.assertPermission(actorId, workspaceId, 'message.send');

    const channel = await this.prisma.channel.findFirst({
      where: { id: channelId, workspaceId },
      select: { id: true, workspace: { select: { mode: true } } },
    });
    if (!channel) {
      throw notFound('Channel');
    }

    if (input.replyToId) {
      const parent = await this.prisma.message.findFirst({
        where: { id: input.replyToId, channelId },
        select: { id: true },
      });
      if (!parent) {
        throw notFound('Parent message');
      }
    }

    // Community moderation (PRD §93): posts from regular members land in
    // PENDING_REVIEW in COMMUNITY workspaces; trusted roles post directly.
    const needsReview =
      channel.workspace.mode === 'COMMUNITY' &&
      !(await this.authorizationService.hasPermission(actorId, workspaceId, 'message.moderate'));

    const message = await this.prisma.message.create({
      data: {
        channelId,
        authorId: actorId,
        content: input.content,
        replyToId: input.replyToId,
        status: needsReview ? 'PENDING_REVIEW' : 'VISIBLE',
      },
      include: MESSAGE_INCLUDE,
    });
    const view = this.toMessageView(message);
    this.realtimeBroadcaster.broadcastMessageCreated(workspaceId, view);
    if (needsReview) {
      await this.notifyModerators(workspaceId, actorId, view);
    }
    return view;
  }

  /** ADR-005: alert MODERATOR+ (holders of message.moderate) about a pending post. */
  private async notifyModerators(
    workspaceId: string,
    authorId: string,
    message: MessageRealtimeView,
  ): Promise<void> {
    const moderators = await this.prisma.workspaceMember.findMany({
      where: { workspaceId, role: { permissions: { has: 'message.moderate' } } },
      select: { userId: true },
    });
    this.eventEmitter.emit(
      'notification.moderation.pending',
      {
        workspaceId,
        actorId: authorId,
        recipientIds: moderators.map((member) => member.userId),
        type: 'message.pending',
        title: 'Pesan menunggu moderasi',
        body: `${message.authorName}: ${message.content.slice(0, 120)}`,
        refType: 'moderation',
        refId: message.id,
      } satisfies NotificationEventPayload,
    );
  }

  async listMessages(
    actorId: string,
    workspaceId: string,
    channelId: string,
    cursor?: string,
  ) {
    await this.authorizationService.assertPermission(actorId, workspaceId, 'channel.view');

    const channel = await this.prisma.channel.findFirst({
      where: { id: channelId, workspaceId },
      select: { id: true },
    });
    if (!channel) {
      throw notFound('Channel');
    }

    const PAGE_SIZE = 50;
    const isTrustedViewer = await this.authorizationService.hasPermission(
      actorId,
      workspaceId,
      'message.moderate',
    );
    const messages = await this.prisma.message.findMany({
      where: {
        channelId,
        deletedAt: null,
        // Members only ever see VISIBLE messages; moderators see the queue too
        // so they can decide inline (PRD §93).
        status: isTrustedViewer ? undefined : 'VISIBLE',
      },
      include: MESSAGE_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = messages.length > PAGE_SIZE;
    const page = hasMore ? messages.slice(0, PAGE_SIZE) : messages;
    return {
      items: page.map((message) => this.toMessageView(message)),
      nextCursor: hasMore ? page[PAGE_SIZE - 1]?.id ?? null : null,
    };
  }

  async editMessage(actorId: string, workspaceId: string, messageId: string, content: string) {
    await this.authorizationService.assertPermission(actorId, workspaceId, 'message.edit');

    const message = await this.prisma.message.findFirst({
      where: { id: messageId, channel: { workspaceId }, deletedAt: null },
      include: MESSAGE_INCLUDE,
    });
    if (!message) {
      throw notFound('Message');
    }
    if (message.authorId !== actorId) {
      throw forbidden('Only the author can edit a message');
    }

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: { content, editedAt: new Date() },
      include: MESSAGE_INCLUDE,
    });
    const view = this.toMessageView(updated);
    this.realtimeBroadcaster.broadcastMessageUpdated(workspaceId, view);
    return view;
  }

  async deleteMessage(actorId: string, workspaceId: string, messageId: string) {
    await this.authorizationService.assertPermission(actorId, workspaceId, 'message.delete');

    const message = await this.prisma.message.findFirst({
      where: { id: messageId, channel: { workspaceId }, deletedAt: null },
      include: MESSAGE_INCLUDE,
    });
    if (!message) {
      throw notFound('Message');
    }
    if (message.authorId !== actorId && actorId !== (await this.requireWorkspaceOwner(workspaceId))) {
      throw forbidden('Only the author or workspace owner can delete a message');
    }

    await this.prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });
    await this.auditService.record({
      workspaceId,
      actorId,
      action: 'message.delete',
      target: `message:${messageId}`,
      result: 'SUCCESS',
      metadata: { channelId: message.channelId },
    });
    this.realtimeBroadcaster.broadcastMessageDeleted(workspaceId, {
      messageId,
      channelId: message.channelId,
    });
    return { success: true };
  }

  /**
   * Moderation queue (PRD §93): list PENDING_REVIEW messages across the
   * workspace for MODERATOR+ (permission `moderation.queue.view`).
   */
  async listModerationQueue(actorId: string, workspaceId: string) {
    await this.authorizationService.assertPermission(
      actorId,
      workspaceId,
      'moderation.queue.view',
    );

    const messages = await this.prisma.message.findMany({
      where: {
        channel: { workspaceId },
        deletedAt: null,
        status: 'PENDING_REVIEW',
      },
      include: MESSAGE_INCLUDE,
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    return {
      items: messages.map((message) => this.toMessageView(message)),
    };
  }

  /** Approve a pending message → VISIBLE for everyone. */
  async approveMessage(actorId: string, workspaceId: string, messageId: string) {
    return this.decideMessage(actorId, workspaceId, messageId, 'VISIBLE', 'approve');
  }

  /** Remove a pending (or visible) message → hidden from members. */
  async removeMessage(actorId: string, workspaceId: string, messageId: string) {
    return this.decideMessage(actorId, workspaceId, messageId, 'REMOVED', 'remove');
  }

  private async decideMessage(
    actorId: string,
    workspaceId: string,
    messageId: string,
    targetStatus: 'VISIBLE' | 'REMOVED',
    action: 'approve' | 'remove',
  ) {
    await this.authorizationService.assertPermission(actorId, workspaceId, 'message.moderate');

    const message = await this.prisma.message.findFirst({
      where: { id: messageId, channel: { workspaceId }, deletedAt: null },
      include: MESSAGE_INCLUDE,
    });
    if (!message) {
      throw notFound('Message');
    }
    if (message.status === 'REMOVED' && targetStatus === 'REMOVED') {
      throw conflict('Message is already removed');
    }
    if (message.status === 'VISIBLE' && targetStatus === 'VISIBLE') {
      throw conflict('Message is already visible');
    }

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        status: targetStatus,
        moderatedById: actorId,
        moderatedAt: new Date(),
      },
      include: MESSAGE_INCLUDE,
    });
    const view = this.toMessageView(updated);

    await this.auditService.record({
      workspaceId,
      actorId,
      action: `message.${action}`,
      target: `message:${messageId}`,
      result: 'SUCCESS',
      metadata: { channelId: message.channelId, authorId: message.authorId },
    });

    this.realtimeBroadcaster.broadcastMessageModerated(workspaceId, {
      messageId,
      channelId: message.channelId,
      status: targetStatus,
      moderatedById: actorId,
    });
    return view;
  }

  private async requireWorkspaceOwner(workspaceId: string): Promise<string> {
    const workspace = await this.prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
      select: { ownerId: true },
    });
    return workspace.ownerId;
  }

  private toChannelView(channel: {
    id: string;
    name: string;
    type: string;
    visibility: string;
    topic: string | null;
  }) {
    return {
      id: channel.id,
      name: channel.name,
      type: channel.type,
      visibility: channel.visibility,
      topic: channel.topic,
    };
  }

  private toMessageView(message: MessageWithRelations): MessageRealtimeView {
    return {
      id: message.id,
      channelId: message.channelId,
      authorId: message.authorId,
      authorName: message.author.displayName,
      content: message.content,
      replyToId: message.replyToId,
      status: message.status,
      editedAt: message.editedAt?.toISOString() ?? null,
      createdAt: message.createdAt.toISOString(),
      attachments: message.attachments.map((file) => ({
        id: file.id,
        fileName: file.fileName,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
      })),
    };
  }
}

const MESSAGE_INCLUDE = {
  author: { select: { displayName: true } },
  channel: { select: { workspace: { select: { mode: true } } } },
  attachments: {
    where: { deletedAt: null },
    select: { id: true, fileName: true, mimeType: true, sizeBytes: true },
  },
} as const;

type MessageWithRelations = {
  id: string;
  channelId: string;
  authorId: string;
  content: string;
  replyToId: string | null;
  status: 'VISIBLE' | 'PENDING_REVIEW' | 'REMOVED';
  editedAt: Date | null;
  createdAt: Date;
  author: { displayName: string };
  channel: { workspace: { mode: 'ENTERPRISE' | 'COMMUNITY' } };
  attachments: { id: string; fileName: string; mimeType: string; sizeBytes: number }[];
};
