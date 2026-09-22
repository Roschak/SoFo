import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { AuditService } from '../audit/audit.service';
import { conflict, forbidden } from '@sofo/shared';

/**
 * Attendance domain (PRD §42, §87) — **Enterprise Mode only**.
 *
 * Rules:
 * - Every entry point first requires the workspace to be in ENTERPRISE mode
 *   (COMMUNITY workspaces get 403 before any permission check).
 * - `attendance.clock` lets a member clock in/out for themselves.
 * - `attendance.view` (OWNER/ADMIN/MANAGER) sees the whole workspace history;
 *   regular members only see their own rows.
 * - One record per user per local day: a second clock-in on the same day
 *   conflicts (409); clock-out requires an open record.
 * - LATE when clock-in is after start-of-day + workStartHour + graceMinutes.
 * - Working hours = clock-out − clock-in, reported in minutes.
 * Every query is tenant-scoped by workspaceId (PRD §19, §66).
 */

/** Default working-hours policy (PRD §42 "Working Hours"). */
export const WORK_START_HOUR = 9; // 09:00 local time
export const LATE_GRACE_MINUTES = 15; // until 09:15 counts as ON_TIME

export interface AttendanceView {
  readonly id: string;
  readonly userId: string;
  readonly userName: string | null;
  readonly workDate: string;
  readonly clockInAt: string;
  readonly clockOutAt: string | null;
  readonly status: string;
  readonly minutesLate: number;
  readonly workedMinutes: number | null;
  readonly note: string | null;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Minutes after local midnight by which clock-in must happen to be ON_TIME. */
export function lateThresholdMinutes(): number {
  return WORK_START_HOUR * 60 + LATE_GRACE_MINUTES;
}

export function computeStatusAndLate(clockInAt: Date): { status: 'ON_TIME' | 'LATE'; minutesLate: number } {
  const minutesSinceMidnight = clockInAt.getHours() * 60 + clockInAt.getMinutes();
  const threshold = lateThresholdMinutes();
  if (minutesSinceMidnight > threshold) {
    return { status: 'LATE', minutesLate: minutesSinceMidnight - threshold };
  }
  return { status: 'ON_TIME', minutesLate: 0 };
}

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
    private readonly auditService: AuditService,
  ) {}

  /** Enterprise gate (PRD §42): COMMUNITY workspaces never reach attendance. */
  private async assertEnterprise(workspaceId: string): Promise<void> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { mode: true },
    });
    if (!workspace) {
      // Not a member / not found: uniform 403, no tenant probing (PRD §66).
      throw forbidden('Access denied');
    }
    if (workspace.mode !== 'ENTERPRISE') {
      throw forbidden('Attendance is only available in ENTERPRISE mode workspaces');
    }
  }

  async clockIn(actorId: string, workspaceId: string, note?: string): Promise<AttendanceView> {
    await this.assertEnterprise(workspaceId);
    await this.authorizationService.assertPermission(actorId, workspaceId, 'attendance.clock');

    const now = new Date();
    const workDate = startOfLocalDay(now);
    const existing = await this.prisma.attendanceRecord.findUnique({
      where: {
        workspaceId_userId_workDate: { workspaceId, userId: actorId, workDate },
      },
    });
    if (existing) {
      throw conflict('You have already clocked in today');
    }

    const { status, minutesLate } = computeStatusAndLate(now);
    const created = await this.prisma.attendanceRecord.create({
      data: {
        workspaceId,
        userId: actorId,
        workDate,
        clockInAt: now,
        status,
        minutesLate,
        note: note ?? null,
      },
    });

    await this.auditService.record({
      workspaceId,
      actorId,
      action: 'attendance.clock_in',
      target: `attendance:${created.id}`,
      result: 'SUCCESS',
      metadata: { status, minutesLate },
    });

    return this.toView(created);
  }

  async clockOut(actorId: string, workspaceId: string): Promise<AttendanceView> {
    await this.assertEnterprise(workspaceId);
    await this.authorizationService.assertPermission(actorId, workspaceId, 'attendance.clock');

    const workDate = startOfLocalDay(new Date());
    const record = await this.prisma.attendanceRecord.findUnique({
      where: {
        workspaceId_userId_workDate: { workspaceId, userId: actorId, workDate },
      },
    });
    if (!record) {
      throw conflict('You have not clocked in today');
    }
    if (record.clockOutAt) {
      throw conflict('You have already clocked out today');
    }

    const now = new Date();
    const updated = await this.prisma.attendanceRecord.update({
      where: { id: record.id },
      data: { clockOutAt: now },
    });

    await this.auditService.record({
      workspaceId,
      actorId,
      action: 'attendance.clock_out',
      target: `attendance:${record.id}`,
      result: 'SUCCESS',
      metadata: { workedMinutes: Math.round((now.getTime() - record.clockInAt.getTime()) / 60_000) },
    });

    return this.toView(updated);
  }

  /**
   * History: `attendance.view` holders see everyone in the workspace,
   * others only their own rows (same scoping pattern as requests).
   */
  async listHistory(
    actorId: string,
    workspaceId: string,
    filters: { from?: string; to?: string; userId?: string },
  ): Promise<{ items: AttendanceView[] }> {
    await this.assertEnterprise(workspaceId);
    await this.authorizationService.assertPermission(actorId, workspaceId, 'attendance.view');

    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        workspaceId,
        ...(filters.userId ? { userId: filters.userId } : {}),
        ...(filters.from || filters.to
          ? {
              workDate: {
                ...(filters.from ? { gte: new Date(filters.from) } : {}),
                ...(filters.to ? { lte: new Date(filters.to) } : {}),
              },
            }
          : {}),
      },
      orderBy: { workDate: 'desc' },
      take: 200,
      include: { user: { select: { displayName: true } } },
    });

    return { items: records.map((record) => this.toView(record)) };
  }

  /** Today's record for the caller (or null) — drives the clock UI state. */
  async getTodayStatus(actorId: string, workspaceId: string): Promise<AttendanceView | null> {
    await this.assertEnterprise(workspaceId);
    await this.authorizationService.assertPermission(actorId, workspaceId, 'attendance.clock');

    const workDate = startOfLocalDay(new Date());
    const record = await this.prisma.attendanceRecord.findUnique({
      where: {
        workspaceId_userId_workDate: { workspaceId, userId: actorId, workDate },
      },
    });
    return record ? this.toView(record) : null;
  }

  private toView(record: {
    id: string;
    userId: string;
    workDate: Date;
    clockInAt: Date;
    clockOutAt: Date | null;
    status: string;
    minutesLate: number;
    note: string | null;
    user?: { displayName: string } | null;
  }): AttendanceView {
    const workedMinutes = record.clockOutAt
      ? Math.max(0, Math.round((record.clockOutAt.getTime() - record.clockInAt.getTime()) / 60_000))
      : null;
    return {
      id: record.id,
      userId: record.userId,
      userName: record.user?.displayName ?? null,
      workDate: record.workDate.toISOString(),
      clockInAt: record.clockInAt.toISOString(),
      clockOutAt: record.clockOutAt?.toISOString() ?? null,
      status: record.status,
      minutesLate: record.minutesLate,
      workedMinutes,
      note: record.note,
    };
  }
}
