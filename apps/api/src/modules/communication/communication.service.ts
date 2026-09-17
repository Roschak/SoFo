import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { conflict, forbidden, notFound } from '@sofo/shared';

/**
 * Communication domain (PRD §28-§31): channels and messages with threads.
 * Every read and write is tenant-scoped by workspaceId (PRD §19).
 */
@Injectable()
export class CommunicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
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

    const message = await this.prisma.message.create({
      data: {
        channelId,
        authorId: actorId,
        content: input.content,
        replyToId: input.replyToId,
      },
      include: MESSAGE_INCLUDE,
    });
    return this.toMessageView(message);
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
    const messages = await this.prisma.message.findMany({
      where: { channelId, deletedAt: null },
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
    return this.toMessageView(updated);
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
    return { success: true };
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

  private toMessageView(message: MessageWithRelations) {
    return {
      id: message.id,
      channelId: message.channelId,
      authorId: message.authorId,
      content: message.content,
      replyToId: message.replyToId,
      editedAt: message.editedAt,
      createdAt: message.createdAt,
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
  editedAt: Date | null;
  createdAt: Date;
  attachments: { id: string; fileName: string; mimeType: string; sizeBytes: number }[];
};
