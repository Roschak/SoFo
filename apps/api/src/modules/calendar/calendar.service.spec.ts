import { CalendarService } from './calendar.service';

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
        { id: 'e1', title: 'Offsite', description: null, startAt: new Date(iso(3)), endAt: new Date(iso(4)), allDay: true },
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
