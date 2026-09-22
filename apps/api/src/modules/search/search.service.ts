import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { SearchQueryDto } from './search.dto';

export interface SearchResultItem {
  id: string;
  type: 'channel' | 'message' | 'project' | 'task' | 'file' | 'member';
  title: string;
  snippet: string | null;
  refId: string;
  createdAt?: string;
}

export interface SearchResponse {
  query: string;
  total: number;
  items: SearchResultItem[];
}

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async search(
    actorId: string,
    workspaceId: string,
    dto: SearchQueryDto,
  ): Promise<SearchResponse> {
    // Assert member of workspace (throws 403 if outsider, PRD §66)
    await this.authorizationService.assertPermission(actorId, workspaceId, 'workspace.view');

    const term = dto.q.trim();
    const filterType = dto.type ?? 'all';
    const items: SearchResultItem[] = [];

    const canViewChannel = await this.authorizationService.hasPermission(
      actorId,
      workspaceId,
      'channel.view',
    );
    const canViewProject = await this.authorizationService.hasPermission(
      actorId,
      workspaceId,
      'project.view',
    );
    const canViewFile = await this.authorizationService.hasPermission(
      actorId,
      workspaceId,
      'file.download',
    );
    const canViewMember = await this.authorizationService.hasPermission(
      actorId,
      workspaceId,
      'member.view',
    );

    // 1. Channels
    if (canViewChannel && (filterType === 'all' || filterType === 'channel')) {
      const channels = await this.prisma.channel.findMany({
        where: {
          workspaceId,
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { topic: { contains: term, mode: 'insensitive' } },
          ],
        },
        take: 10,
        select: { id: true, name: true, topic: true, createdAt: true },
      });
      for (const c of channels) {
        items.push({
          id: `channel:${c.id}`,
          type: 'channel',
          title: `# ${c.name}`,
          snippet: c.topic,
          refId: c.id,
          createdAt: c.createdAt.toISOString(),
        });
      }
    }

    // 2. Messages
    if (canViewChannel && (filterType === 'all' || filterType === 'message')) {
      const messages = await this.prisma.message.findMany({
        where: {
          channel: { workspaceId },
          content: { contains: term, mode: 'insensitive' },
          deletedAt: null,
        },
        take: 15,
        select: {
          id: true,
          content: true,
          channelId: true,
          createdAt: true,
          author: { select: { displayName: true } },
        },
      });
      for (const m of messages) {
        items.push({
          id: `message:${m.id}`,
          type: 'message',
          title: `Pesan oleh ${m.author?.displayName ?? 'Pengguna'}`,
          snippet: m.content.length > 80 ? `${m.content.slice(0, 80)}…` : m.content,
          refId: m.channelId,
          createdAt: m.createdAt.toISOString(),
        });
      }
    }

    // 3. Projects
    if (canViewProject && (filterType === 'all' || filterType === 'project')) {
      const projects = await this.prisma.project.findMany({
        where: {
          workspaceId,
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } },
          ],
        },
        take: 10,
        select: { id: true, name: true, description: true, createdAt: true },
      });
      for (const p of projects) {
        items.push({
          id: `project:${p.id}`,
          type: 'project',
          title: p.name,
          snippet: p.description,
          refId: p.id,
          createdAt: p.createdAt.toISOString(),
        });
      }
    }

    // 4. Tasks
    if (canViewProject && (filterType === 'all' || filterType === 'task')) {
      const tasks = await this.prisma.task.findMany({
        where: {
          project: { workspaceId },
          OR: [
            { title: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } },
          ],
        },
        take: 15,
        select: { id: true, title: true, description: true, projectId: true, createdAt: true },
      });
      for (const t of tasks) {
        items.push({
          id: `task:${t.id}`,
          type: 'task',
          title: t.title,
          snippet: t.description,
          refId: t.projectId,
          createdAt: t.createdAt.toISOString(),
        });
      }
    }

    // 5. Files
    if (canViewFile && (filterType === 'all' || filterType === 'file')) {
      const files = await this.prisma.file.findMany({
        where: {
          workspaceId,
          deletedAt: null,
          fileName: { contains: term, mode: 'insensitive' },
        },
        take: 10,
        select: { id: true, fileName: true, mimeType: true, createdAt: true },
      });
      for (const f of files) {
        items.push({
          id: `file:${f.id}`,
          type: 'file',
          title: f.fileName,
          snippet: f.mimeType,
          refId: f.id,
          createdAt: f.createdAt.toISOString(),
        });
      }
    }


    // 6. Members
    if (canViewMember && (filterType === 'all' || filterType === 'member')) {
      const members = await this.prisma.workspaceMember.findMany({
        where: {
          workspaceId,
          user: {
            OR: [
              { displayName: { contains: term, mode: 'insensitive' } },
              { email: { contains: term, mode: 'insensitive' } },
            ],
          },
        },
        take: 10,
        select: {
          id: true,
          role: { select: { name: true } },
          user: { select: { id: true, displayName: true, email: true } },
          joinedAt: true,
        },
      });
      for (const m of members) {
        items.push({
          id: `member:${m.id}`,
          type: 'member',
          title: m.user.displayName,
          snippet: `${m.user.email} (${m.role.name})`,
          refId: m.user.id,
          createdAt: m.joinedAt.toISOString(),
        });
      }
    }

    return {
      query: term,
      total: items.length,
      items,
    };
  }
}
