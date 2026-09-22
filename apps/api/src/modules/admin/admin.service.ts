import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { notFound } from '@sofo/shared';

/**
 * Admin dashboard domain (PRD §92): aggregated workspace statistics and
 * workspace-level administration for OWNER/ADMIN (permission-gated by
 * `workspace.settings.manage`). Every query is tenant-scoped by workspaceId
 * (PRD §19): cross-tenant aggregation is impossible by construction.
 */

export interface AdminStatsView {
  readonly totalMembers: number;
  readonly activeMembers: number;
  readonly totalChannels: number;
  readonly totalMessages: number;
  readonly totalProjects: number;
  readonly openTasks: number;
  readonly totalTasks: number;
  readonly storageUsedBytes: number;
  readonly totalFiles: number;
  readonly pendingRequests: number;
  readonly totalWorkedMinutes: number;
  readonly unreadNotifications: number;
}

export interface AdminDailyCount {
  readonly date: string; // YYYY-MM-DD
  readonly count: number;
}

export interface AdminTrendView {
  readonly messages: AdminDailyCount[];
  readonly clockIns: AdminDailyCount[];
  readonly clockOuts: AdminDailyCount[];
  readonly requestsCreated: AdminDailyCount[];
}

export interface AdminRecentUserView {
  readonly userId: string;
  readonly displayName: string;
  readonly role: string;
  readonly joinedAt: string;
}

export interface AdminOverviewView {
  readonly workspace: {
    readonly id: string;
    readonly name: string;
    readonly mode: string;
    readonly createdAt: string;
  };
  readonly stats: AdminStatsView;
  readonly activityTrend: AdminTrendView;
  readonly recentMembers: AdminRecentUserView[];
}

const RECENT_MEMBERS_LIMIT = 10;
/** Upper bound for the worked-minutes scan — plenty for a dashboard, keeps memory flat. */
const WORKED_MINUTES_SCAN_LIMIT = 10_000;

function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Sum of closed attendance durations in minutes (clockOut − clockIn). */
export function sumWorkedMinutes(
  records: readonly { clockInAt: Date; clockOutAt: Date | null }[],
): number {
  return records.reduce((total, record) => {
    if (!record.clockOutAt) return total;
    const minutes = Math.round((record.clockOutAt.getTime() - record.clockInAt.getTime()) / 60_000);
    return total + Math.max(0, minutes);
  }, 0);
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async getOverview(
    actorId: string,
    workspaceId: string,
    trendDays = 14,
  ): Promise<AdminOverviewView> {
    await this.authorizationService.assertPermission(
      actorId,
      workspaceId,
      'workspace.settings.manage',
    );

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, name: true, mode: true, createdAt: true },
    });
    if (!workspace) {
      throw notFound('Workspace');
    }

    const stats = await this.getStats(workspaceId);
    const activityTrend = await this.getActivityTrend(workspaceId, trendDays);
    const recentMembers = await this.getRecentMembers(workspaceId);

    return {
      workspace: {
        id: workspace.id,
        name: workspace.name,
        mode: workspace.mode,
        createdAt: workspace.createdAt.toISOString(),
      },
      stats,
      activityTrend,
      recentMembers,
    };
  }

  async getStats(workspaceId: string): Promise<AdminStatsView> {
    const [
      memberCount,
      activeMemberCount,
      channelCount,
      messageCount,
      projectCount,
      openTaskCount,
      totalTaskCount,
      fileAggregate,
      pendingRequestCount,
      attendanceRecords,
      unreadNotificationCount,
    ] = await Promise.all([
      this.prisma.workspaceMember.count({ where: { workspaceId } }),
      this.prisma.workspaceMember.count({
        where: { workspaceId, user: { status: 'ACTIVE' } },
      }),
      this.prisma.channel.count({ where: { workspaceId } }),
      this.prisma.message.count({
        where: { channel: { workspaceId }, deletedAt: null },
      }),
      this.prisma.project.count({ where: { workspaceId, status: { not: 'ARCHIVED' } } }),
      this.prisma.task.count({
        where: { project: { workspaceId }, status: { not: 'DONE' } },
      }),
      this.prisma.task.count({ where: { project: { workspaceId } } }),
      this.prisma.file.aggregate({
        where: { workspaceId, deletedAt: null },
        _sum: { sizeBytes: true },
        _count: true,
      }),
      this.prisma.request.count({ where: { workspaceId, status: 'PENDING' } }),
      this.prisma.attendanceRecord.findMany({
        where: { workspaceId, clockOutAt: { not: null } },
        select: { clockInAt: true, clockOutAt: true },
        orderBy: { workDate: 'desc' },
        take: WORKED_MINUTES_SCAN_LIMIT,
      }),
      this.prisma.notification.count({
        where: { workspaceId, status: 'UNREAD' },
      }),
    ]);

    return {
      totalMembers: memberCount,
      activeMembers: activeMemberCount,
      totalChannels: channelCount,
      totalMessages: messageCount,
      totalProjects: projectCount,
      openTasks: openTaskCount,
      totalTasks: totalTaskCount,
      storageUsedBytes: fileAggregate._sum.sizeBytes ?? 0,
      totalFiles: fileAggregate._count ?? 0,
      pendingRequests: pendingRequestCount,
      totalWorkedMinutes: sumWorkedMinutes(attendanceRecords),
      unreadNotifications: unreadNotificationCount,
    };
  }

  async getActivityTrend(workspaceId: string, days: number): Promise<AdminTrendView> {
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (days - 1));

    const [messages, clockIns, clockOuts, requests] = await Promise.all([
      this.prisma.message.findMany({
        where: { channel: { workspaceId }, deletedAt: null, createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      this.prisma.attendanceRecord.findMany({
        where: { workspaceId, clockInAt: { gte: since } },
        select: { clockInAt: true },
      }),
      this.prisma.attendanceRecord.findMany({
        where: { workspaceId, clockOutAt: { gte: since } },
        select: { clockOutAt: true },
      }),
      this.prisma.request.findMany({
        where: { workspaceId, createdAt: { gte: since } },
        select: { createdAt: true },
      }),
    ]);

    const bucketize = (dates: Date[]): AdminDailyCount[] => {
      const buckets = new Map<string, number>();
      for (let i = 0; i < days; i += 1) {
        const day = new Date(since);
        day.setDate(since.getDate() + i);
        buckets.set(dayKey(day), 0);
      }
      for (const value of dates) {
        const key = dayKey(value);
        if (buckets.has(key)) {
          buckets.set(key, (buckets.get(key) ?? 0) + 1);
        }
      }
      return Array.from(buckets, ([date, count]) => ({ date, count }));
    };

    return {
      messages: bucketize(messages.map((m) => m.createdAt)),
      clockIns: bucketize(clockIns.map((c) => c.clockInAt)),
      clockOuts: bucketize(clockOuts.map((c) => c.clockOutAt).filter((d): d is Date => d !== null)),
      requestsCreated: bucketize(requests.map((r) => r.createdAt)),
    };
  }

  async getRecentMembers(workspaceId: string): Promise<AdminRecentUserView[]> {
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      orderBy: { joinedAt: 'desc' },
      take: RECENT_MEMBERS_LIMIT,
      include: {
        user: { select: { displayName: true } },
        role: { select: { name: true } },
      },
    });
    return members.map((member) => ({
      userId: member.userId,
      displayName: member.user.displayName,
      role: member.role.name,
      joinedAt: member.joinedAt.toISOString(),
    }));
  }

  /**
   * Workspace-level administration (PRD §92): listing members whose accounts
   * are not ACTIVE (suspended/deactivated) for follow-up by OWNER/ADMIN.
   */
  async listSuspendedUsers(actorId: string, workspaceId: string): Promise<AdminRecentUserView[]> {
    await this.authorizationService.assertPermission(
      actorId,
      workspaceId,
      'workspace.settings.manage',
    );
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId, user: { status: { not: 'ACTIVE' } } },
      include: {
        user: { select: { displayName: true } },
        role: { select: { name: true } },
      },
    });
    return members.map((member) => ({
      userId: member.userId,
      displayName: member.user.displayName,
      role: member.role.name,
      joinedAt: member.joinedAt.toISOString(),
    }));
  }
}
