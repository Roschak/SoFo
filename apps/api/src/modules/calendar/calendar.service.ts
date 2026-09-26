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
 *
 * Recurring manual events (§86 lanjutan): DAILY/WEEKLY events expand into
 * concrete occurrences between the query range — stored rows never multiply.
 */

export type CalendarEntryKind = 'event' | 'meeting' | 'project_deadline' | 'task_deadline';

/** Supported recurrence kinds (kept minimal & predictable, PRD §62). */
export const RECURRENCE_KINDS = ['NONE', 'DAILY', 'WEEKLY'] as const;
export type RecurrenceKind = (typeof RECURRENCE_KINDS)[number];

/** Longest horizon an occurrence expansion may reach (2 years guard rail). */
const MAX_RECURRENCE_SPAN_MS = 730 * 86_400_000;
const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

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
  /** Non-null only for expanded occurrences of recurring events. */
  readonly occurrenceIndex: number | null;
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
        where: {
          workspaceId,
          OR: [
            // One-shot events inside the range...
            { recurrence: 'NONE', startAt: { gte: from, lte: to } },
            // ...or recurring events whose series can still reach the range.
            {
              recurrence: { not: 'NONE' },
              startAt: { lte: to },
              OR: [{ recurrenceUntil: { gte: from } }, { recurrenceUntil: null }],
            },
          ],
        },
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
      ...events.flatMap((event) =>
        event.recurrence === 'NONE'
          ? [
              {
                kind: 'event' as const,
                id: `event:${event.id}`,
                title: event.title,
                description: event.description,
                startAt: event.startAt.toISOString(),
                endAt: event.endAt.toISOString(),
                allDay: event.allDay,
                status: null,
                refId: event.id,
                occurrenceIndex: null,
              },
            ]
          : expandRecurrence(event, from, to),
      ),
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
        occurrenceIndex: null,
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
        occurrenceIndex: null,
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
        occurrenceIndex: null,
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
    const startOfToday = this.startOfDay(now);

    const { items } = await this.getCalendar(actorId, workspaceId, {
      from: startOfToday.toISOString(),
      to: horizon.toISOString(),
    });

    return {
      items: items.map((entry) => ({
        ...entry,
        // Calendar-date difference, not ms-ceil: an event tonight is "0 hari
        // lagi" (Hari ini), not "Besok".
        dueInDays: Math.max(
          0,
          Math.round(
            (this.startOfDay(new Date(entry.startAt)).getTime() - startOfToday.getTime()) /
              86_400_000,
          ),
        ),
      })),
    };
  }

  async createEvent(
    actorId: string,
    workspaceId: string,
    input: {
      title: string;
      startAt: string;
      endAt: string;
      allDay?: boolean;
      description?: string;
      recurrence?: string;
      recurrenceUntil?: string;
    },
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

    const recurrence = input.recurrence ?? 'NONE';
    if (!RECURRENCE_KINDS.includes(recurrence as RecurrenceKind)) {
      throw conflict(`recurrence must be one of: ${RECURRENCE_KINDS.join(', ')}`);
    }
    let recurrenceUntil: Date | null = null;
    if (recurrence !== 'NONE') {
      if (!input.recurrenceUntil) {
        throw conflict('recurrenceUntil is required for recurring events');
      }
      recurrenceUntil = new Date(input.recurrenceUntil);
      if (Number.isNaN(recurrenceUntil.getTime())) {
        throw conflict('recurrenceUntil must be a valid date');
      }
      if (recurrenceUntil.getTime() < startAt.getTime()) {
        throw conflict('recurrenceUntil must not be earlier than startAt');
      }
      if (recurrenceUntil.getTime() - startAt.getTime() > MAX_RECURRENCE_SPAN_MS) {
        throw conflict('recurrence span must not exceed 2 years');
      }
    }

    const event = await this.prisma.calendarEvent.create({
      data: {
        workspaceId,
        title: input.title,
        description: input.description,
        startAt,
        endAt,
        allDay: input.allDay ?? false,
        recurrence,
        recurrenceUntil,
        createdById: actorId,
      },
    });

    await this.auditService.record({
      workspaceId,
      actorId,
      action: 'calendar.event.create',
      target: `event:${event.id}`,
      result: 'SUCCESS',
      metadata: {
        title: event.title,
        startAt: event.startAt.toISOString(),
        recurrence: event.recurrence,
      },
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

  private startOfDay(date: Date): Date {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
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
    recurrence: string;
    recurrenceUntil: Date | null;
  }) {
    return {
      id: event.id,
      title: event.title,
      description: event.description,
      startAt: event.startAt.toISOString(),
      endAt: event.endAt.toISOString(),
      allDay: event.allDay,
      recurrence: event.recurrence,
      recurrenceUntil: event.recurrenceUntil?.toISOString() ?? null,
    };
  }
}

export interface ReminderView extends CalendarEntryView {
  readonly dueInDays: number;
}

interface RecurringEventRow {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly startAt: Date;
  readonly endAt: Date;
  readonly allDay: boolean;
  readonly recurrence: string;
  readonly recurrenceUntil: Date | null;
}

/**
 * Expands a DAILY/WEEKLY series into concrete occurrences overlapping
 * [from, to]. Pure — no mutation, no store writes. Occurrence id is stable
 * (`event:<id>#<n>`) so the client can key on it without duplicates.
 */
export function expandRecurrence(
  event: RecurringEventRow,
  from: Date,
  to: Date,
): CalendarEntryView[] {
  const stepMs = event.recurrence === 'DAILY' ? DAY_MS : WEEK_MS;
  const durationMs = event.endAt.getTime() - event.startAt.getTime();
  const seriesEnd = event.recurrenceUntil
    ? event.recurrenceUntil.getTime()
    : event.startAt.getTime() + MAX_RECURRENCE_SPAN_MS;

  // First occurrence at-or-after `from` (aligned to the series grid), then
  // walk forward while occurrences still start within [from, to].
  const elapsed = from.getTime() - event.startAt.getTime();
  const stepsFromStart = elapsed <= 0 ? 0 : Math.ceil(elapsed / stepMs);

  const items: CalendarEntryView[] = [];
  for (let index = stepsFromStart; ; index += 1) {
    const occurrenceStart = event.startAt.getTime() + index * stepMs;
    if (occurrenceStart > to.getTime() || occurrenceStart > seriesEnd) break;
    if (occurrenceStart + durationMs < from.getTime()) continue;
    items.push({
      kind: 'event',
      id: `event:${event.id}#${index}`,
      title: event.title,
      description: event.description,
      startAt: new Date(occurrenceStart).toISOString(),
      endAt: new Date(occurrenceStart + durationMs).toISOString(),
      allDay: event.allDay,
      status: null,
      refId: event.id,
      occurrenceIndex: index,
    });
  }
  return items;
}
