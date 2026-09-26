import { CalendarService, expandRecurrence } from './calendar.service';

describe('CalendarService', () => {
  let service: CalendarService;
  let prisma: any;
  let authorizationService: { assertPermission: jest.Mock };
  let auditService: { record: jest.Mock };

  const iso = (offsetDays: number) =>
    new Date(Date.now() + offsetDays * 86_400_000).toISOString();

  beforeEach(() => {
    prisma = {
      calendarEvent: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
      },
      meeting: { findMany: jest.fn().mockResolvedValue([]) },
      project: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      task: { findMany: jest.fn().mockResolvedValue([]) },
    };
    authorizationService = { assertPermission: jest.fn() };
    auditService = { record: jest.fn() };
    service = new CalendarService(
      prisma as never,
      authorizationService as never,
      auditService as never,
    );
  });

  describe('getCalendar', () => {
    it('merges 4 sources and sorts by startAt ascending', async () => {
      prisma.calendarEvent.findMany.mockResolvedValue([
        {
          id: 'e1',
          title: 'Offsite',
          description: null,
          startAt: new Date(iso(3)),
          endAt: new Date(iso(4)),
          allDay: true,
          recurrence: 'NONE',
          recurrenceUntil: null,
        },
      ]);
      prisma.meeting.findMany.mockResolvedValue([
        { id: 'm1', title: 'Standup', description: null, scheduledAt: new Date(iso(1)), endedAt: null, status: 'SCHEDULED' },
      ]);
      prisma.project.findMany
        .mockResolvedValueOnce([{ id: 'p1', name: 'Apollo', description: null, deadline: new Date(iso(7)), status: 'ACTIVE' }]) // projects
        .mockResolvedValueOnce([{ id: 'p1' }]); // projectIdsIn
      prisma.task.findMany.mockResolvedValue([
        { id: 't1', title: 'Spec API', description: null, deadline: new Date(iso(2)), status: 'TO_DO' },
      ]);

      const { items } = await service.getCalendar('u-1', 'ws-1', {});

      expect(items.map((item) => item.kind)).toEqual([
        'meeting',
        'task_deadline',
        'event',
        'project_deadline',
      ]);
      expect(items[3]).toMatchObject({ id: 'project_deadline:p1', allDay: true, status: 'ACTIVE' });
    });

    it('is tenant-scoped on every source query', async () => {
      await service.getCalendar('u-1', 'ws-42', {});
      expect(prisma.calendarEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ workspaceId: 'ws-42' }) }),
      );
      expect(prisma.meeting.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ workspaceId: 'ws-42' }) }),
      );
      expect(prisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ workspaceId: 'ws-42' }) }),
      );
    });
  });

  describe('listReminders', () => {
    it('returns upcoming entries with dueInDays', async () => {
      prisma.meeting.findMany.mockResolvedValue([
        { id: 'm1', title: 'Retro', description: null, scheduledAt: new Date(iso(2)), endedAt: null, status: 'SCHEDULED' },
      ]);
      prisma.project.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      prisma.task.findMany.mockResolvedValue([]);

      const { items } = await service.listReminders('u-1', 'ws-1', 7);
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({ kind: 'meeting', dueInDays: 2 });
    });
  });

  describe('createEvent', () => {
    it('validates endAt not earlier than startAt', async () => {
      await expect(
        service.createEvent('u-1', 'ws-1', {
          title: 'Backwards',
          startAt: iso(2),
          endAt: iso(1),
        }),
      ).rejects.toMatchObject({ code: 'CONFLICT' });
    });

    it('creates the event, gates permission, and writes audit', async () => {
      prisma.calendarEvent.create.mockResolvedValue({
        id: 'e9',
        title: 'Hacknight',
        description: null,
        startAt: new Date(iso(1)),
        endAt: new Date(iso(2)),
        allDay: false,
      });

      const created = await service.createEvent('u-1', 'ws-1', {
        title: 'Hacknight',
        startAt: iso(1),
        endAt: iso(2),
      });

      expect(created).toMatchObject({ id: 'e9' });
      expect(authorizationService.assertPermission).toHaveBeenCalledWith(
        'u-1',
        'ws-1',
        'calendar.event.create',
      );
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'calendar.event.create', target: 'event:e9' }),
      );
    });
  });

  describe('recurring events (PRD §86 lanjutan)', () => {
    const day = 86_400_000;
    const base = new Date('2026-10-01T09:00:00.000Z'); // Kamis

    const recurringRow = (overrides: Partial<Parameters<typeof expandRecurrence>[0]> = {}) => ({
      id: 'r1',
      title: 'Daily standup',
      description: null,
      startAt: base,
      endAt: new Date(base.getTime() + 3_600_000),
      allDay: false,
      recurrence: 'DAILY',
      recurrenceUntil: null,
      ...overrides,
    });

    it('expandRecurrence DAILY menghasilkan satu occurence per hari dalam rentang', () => {
      const from = new Date(base.getTime() + 2 * day);
      const to = new Date(base.getTime() + 4 * day + 3_600_000);
      const items = expandRecurrence(recurringRow(), from, to);
      expect(items.map((item) => item.occurrenceIndex)).toEqual([2, 3, 4]);
      expect(items[0]?.startAt).toBe(new Date(base.getTime() + 2 * day).toISOString());
      expect(items.every((item) => item.refId === 'r1')).toBe(true);
      // id stabil & unik per occurence
      expect(new Set(items.map((item) => item.id)).size).toBe(items.length);
    });

    it('expandRecurrence WEEKLY memakai jarak 7 hari mengikuti startAt asli', () => {
      const items = expandRecurrence(
        recurringRow({ recurrence: 'WEEKLY' }),
        new Date(base.getTime() + 7 * day),
        new Date(base.getTime() + 21 * day),
      );
      expect(items.map((item) => item.occurrenceIndex)).toEqual([1, 2, 3]);
    });

    it('berhenti di recurrenceUntil', () => {
      const items = expandRecurrence(
        recurringRow({ recurrenceUntil: new Date(base.getTime() + 2 * day) }),
        base,
        new Date(base.getTime() + 30 * day),
      );
      expect(items.map((item) => item.occurrenceIndex)).toEqual([0, 1, 2]);
    });

    it('occurence yang melewati tengah malam tetap muncul bila durasinya menyentuh rentang', () => {
      // Event 10 jam mulai 23:00 — occurence hari sebelumnya masih menyentuh `from`.
      const lateEvent = recurringRow({
        startAt: new Date('2026-10-01T23:00:00.000Z'),
        endAt: new Date('2026-10-02T09:00:00.000Z'),
      });
      const from = new Date('2026-10-02T00:00:00.000Z');
      const to = new Date('2026-10-02T23:59:59.000Z');
      const items = expandRecurrence(lateEvent, from, to);
      expect(items.length).toBeGreaterThanOrEqual(1);
    });

    it('createEvent menolak recurrence tanpa recurrenceUntil', async () => {
      await expect(
        service.createEvent('u-1', 'ws-1', {
          title: 'Berulang',
          startAt: iso(1),
          endAt: iso(2),
          recurrence: 'DAILY',
        }),
      ).rejects.toMatchObject({ code: 'CONFLICT' });
    });

    it('createEvent menolak recurrenceUntil sebelum startAt', async () => {
      await expect(
        service.createEvent('u-1', 'ws-1', {
          title: 'Mundur',
          startAt: iso(5),
          endAt: iso(6),
          recurrence: 'WEEKLY',
          recurrenceUntil: iso(1),
        }),
      ).rejects.toMatchObject({ code: 'CONFLICT' });
    });

    it('createEvent menolak kind recurrence tidak dikenal', async () => {
      await expect(
        service.createEvent('u-1', 'ws-1', {
          title: 'Aneh',
          startAt: iso(1),
          endAt: iso(2),
          recurrence: 'MONTHLY',
          recurrenceUntil: iso(30),
        }),
      ).rejects.toMatchObject({ code: 'CONFLICT' });
    });

    it('createEvent menyimpan recurrence + recurrenceUntil dan mencatatnya di audit', async () => {
      prisma.calendarEvent.create.mockResolvedValue({
        id: 'e10',
        title: 'Weekly sync',
        description: null,
        startAt: new Date(iso(1)),
        endAt: new Date(iso(2)),
        allDay: false,
        recurrence: 'WEEKLY',
        recurrenceUntil: new Date(iso(30)),
      });

      const created = await service.createEvent('u-1', 'ws-1', {
        title: 'Weekly sync',
        startAt: iso(1),
        endAt: iso(2),
        recurrence: 'WEEKLY',
        recurrenceUntil: iso(30),
      });

      expect(created).toMatchObject({ id: 'e10', recurrence: 'WEEKLY' });
      expect(prisma.calendarEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ recurrence: 'WEEKLY' }),
        }),
      );
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({ recurrence: 'WEEKLY' }),
        }),
      );
    });

    it('getCalendar meng-query deret berulang yang masih relevan dengan rentang', async () => {
      prisma.project.findMany.mockResolvedValue([]);
      prisma.task.findMany.mockResolvedValue([]);
      await service.getCalendar('u-1', 'ws-1', {});
      expect(prisma.calendarEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ recurrence: 'NONE' }),
              expect.objectContaining({ recurrence: { not: 'NONE' } }),
            ]),
          }),
        }),
      );
    });
  });

  describe('deleteEvent', () => {
    it('404s for events from another workspace (no tenant leak)', async () => {
      prisma.calendarEvent.findFirst.mockResolvedValue(null);
      await expect(service.deleteEvent('u-1', 'ws-OTHER', 'e9')).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('deletes and writes audit when owned by the workspace', async () => {
      prisma.calendarEvent.findFirst.mockResolvedValue({ id: 'e9', title: 'Hacknight' });
      await expect(service.deleteEvent('u-1', 'ws-1', 'e9')).resolves.toMatchObject({
        success: true,
      });
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'calendar.event.delete' }),
      );
    });
  });
});
