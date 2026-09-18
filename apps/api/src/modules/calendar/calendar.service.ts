import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { AuditService } from '../audit/audit.service';
import { conflict, notFound } from '@sofo/shared';

/**
 * Calendar domain (PRD §41, §86): one workspace calendar assembled from
 * 4 sources — manual events, meetings (scheduledAt), project deadlines,
 * task deadlines — plus reminders computed by horizon windows.
 * Every read is tenant-scoped by workspaceId (PRD §19).
 */

export type CalendarEntryKind = 'event' | 'meeting' | 'project_deadline' | 'task_deadline';

export interface CalendarEntryView {
  readonly kind: CalendarEntryKind;
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly startAt: string;
  readonly endAt: string | null;
  readonly allDay: boolean;
  readonly status: string | null;
  readonly refId: string;
}

@Injectable()
export class CalendarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
    private readonly auditService: AuditService,
  ) {}

  async getCalendar(
    actorId: string,
    workspaceId: string,
    range: { from?: string; to?: string },
  ): Promise<{ items: CalendarEntryView[] }> {
    await this.authorizationService.assertPermission(actorId, workspaceId, 'workspace.view');

    // Generous defaults: past year → next year. Range filters are applied in
    // memory so each source keeps its own simple query shape.
    const now = new Date();
    const from = range.from ? new Date(range.from) : new Date(now.getTime() - 365 * 86_400_000);
    const to = range.to ? new Date(range.to) : new Date(now.getTime() + 365 * 86_400_000);

    const [events, meetings, projects, tasks] = await Promise.all([
      this.prisma.calendarEvent.findMany({
        where: { workspaceId, startAt: { gte: from, lte: to } },
        orderBy: { startAt: 'asc' },
      }),
      this.prisma.meeting.findMany({
        where: { workspaceId, scheduledAt: { gte: from, lte: to } },
        orderBy: { scheduledAt: 'asc' },
      }),
      this.prisma.project.findMany({
        where: { workspaceId, deadline: { not: null, gte: from, lte: to } },
      }),
      this.prisma.task.findMany({
        where: { projectId: { in: await this.projectIdsIn(workspaceId) }, deadline: { not: null, gte: from, lte: to } },
      }),
    ]);

    const items: CalendarEntryView[] = [
      ...events.map((event) => ({
        kind: 'event' as const,
        id: `event:${event.id}`,
        title: event.title,
        description: event.description,
        startAt: event.startAt.toISOString(),
        endAt: event.endAt.toISOString(),
        allDay: event.allDay,
        status: null,
        refId: event.id,
      })),
      ...meetings.map((meeting) => ({
        kind: 'meeting' as const,
        id: `meeting:${meeting.id}`,
        title: meeting.title,
        description: meeting.description,
        startAt: meeting.scheduledAt.toISOString(),
        endAt: meeting.endedAt?.toISOString() ?? null,
        allDay: false,
        status: meeting.status,
        refId: meeting.id,
      })),
      ...projects.map((project) => ({
        kind: 'project_deadline' as const,
        id: `project_deadline:${project.id}`,
        title: `${project.name} — deadline`,
        description: project.description,
        startAt: (project.deadline as Date).toISOString(),
        endAt: null,
        allDay: true,
        status: project.status,
        refId: project.id,
      })),
      ...tasks.map((task) => ({
        kind: 'task_deadline' as const,
        id: `task_deadline:${task.id}`,
        title: `${task.title} — deadline`,
        description: task.description,
        startAt: (task.deadline as Date).toISOString(),
        endAt: null,
        allDay: true,
        status: task.status,
        refId: task.id,
      })),
    ].sort((a, b) => a.startAt.localeCompare(b.startAt));

    return { items };
  }

  async listReminders(
    actorId: string,
    workspaceId: string,
    horizonDays: number,
  ): Promise<{ items: ReminderView[] }> {
    await this.authorizationService.assertPermission(actorId, workspaceId, 'workspace.view');

    const now = new Date();
    const horizon = new Date(now.getTime() + horizonDays * 86_400_000);
    // Start of today so events happening later today are included
    // (comparing against `now` drops same-instant entries).
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const { items } = await this.getCalendar(actorId, workspaceId, {
      from: startOfToday.toISOString(),
      to: horizon.toISOString(),
    });

    return {
      items: items.map((entry) => ({
        ...entry,
        dueInDays: Math.max(
          0,
          Math.ceil((new Date(entry.startAt).getTime() - now.getTime()) / 86_400_000),
        ),
      })),
    };
  }

  async createEvent(
    actorId: string,
    workspaceId: string,
    input: { title: string; startAt: string; endAt: string; allDay?: boolean; description?: string },
  ) {
    await this.authorizationService.assertPermission(actorId, workspaceId, 'calendar.event.create');

    const startAt = new Date(input.startAt);
    const endAt = new Date(input.endAt);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      throw conflict('startAt and endAt must be valid dates');
    }
    if (endAt.getTime() < startAt.getTime()) {
      throw conflict('endAt must not be earlier than startAt');
    }

    const event = await this.prisma.calendarEvent.create({
      data: {
        workspaceId,
        title: input.title,
        description: input.description,
        startAt,
        endAt,
        allDay: input.allDay ?? false,
        createdById: actorId,
      },
    });

    await this.auditService.record({
      workspaceId,
      actorId,
      action: 'calendar.event.create',
      target: `event:${event.id}`,
      result: 'SUCCESS',
      metadata: { title: event.title, startAt: event.startAt.toISOString() },
    });

    return this.toEventView(event);
  }

  async deleteEvent(actorId: string, workspaceId: string, eventId: string) {
    await this.authorizationService.assertPermission(actorId, workspaceId, 'calendar.event.create');

    const event = await this.prisma.calendarEvent.findFirst({
      where: { id: eventId, workspaceId },
    });
    if (!event) {
      throw notFound('Event');
    }

    await this.prisma.calendarEvent.delete({ where: { id: eventId } });
    await this.auditService.record({
      workspaceId,
      actorId,
      action: 'calendar.event.delete',
      target: `event:${eventId}`,
      result: 'SUCCESS',
      metadata: { title: event.title },
    });
    return { success: true };
  }

  private async projectIdsIn(workspaceId: string): Promise<string[]> {
    const projects = await this.prisma.project.findMany({
      where: { workspaceId },
      select: { id: true },
    });
    return projects.map((project) => project.id);
  }

  private toEventView(event: {
    id: string;
    title: string;
    description: string | null;
    startAt: Date;
    endAt: Date;
    allDay: boolean;
  }) {
    return {
      id: event.id,
      title: event.title,
      description: event.description,
      startAt: event.startAt.toISOString(),
      endAt: event.endAt.toISOString(),
      allDay: event.allDay,
    };
  }
}

export interface ReminderView extends CalendarEntryView {
  readonly dueInDays: number;
}
