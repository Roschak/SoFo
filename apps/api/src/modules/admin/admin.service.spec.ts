import { AdminService, sumWorkedMinutes } from './admin.service';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: any;
  let authorization: any;

  beforeEach(() => {
    prisma = {
      workspace: { findUnique: jest.fn().mockResolvedValue({ id: 'ws-1', name: 'HQ', mode: 'ENTERPRISE', createdAt: new Date('2026-01-01T00:00:00Z') }) },
      workspaceMember: {
        count: jest.fn().mockResolvedValue(3),
        findMany: jest.fn().mockResolvedValue([
          {
            userId: 'u-1',
            joinedAt: new Date('2026-09-01T00:00:00Z'),
            user: { displayName: 'Ana' },
            role: { name: 'ADMIN' },
          },
        ]),
      },
      channel: { count: jest.fn().mockResolvedValue(2) },
      message: { count: jest.fn().mockResolvedValue(42), findMany: jest.fn().mockResolvedValue([]) },
      project: { count: jest.fn().mockResolvedValue(1) },
      task: { count: jest.fn().mockResolvedValue(4) },
      file: { aggregate: jest.fn().mockResolvedValue({ _sum: { sizeBytes: 1500 }, _count: 3 }) },
      request: { count: jest.fn().mockResolvedValue(1), findMany: jest.fn().mockResolvedValue([]) },
      attendanceRecord: {
        findMany: jest.fn().mockResolvedValue([
          { clockInAt: new Date('2026-09-20T01:00:00Z'), clockOutAt: new Date('2026-09-20T03:00:00Z') },
          { clockInAt: new Date('2026-09-19T01:00:00Z'), clockOutAt: null },
        ]),
      },
      notification: { count: jest.fn().mockResolvedValue(5) },
    };
    authorization = { assertPermission: jest.fn().mockResolvedValue(undefined) };
    service = new AdminService(prisma as never, authorization as never);
  });

  describe('getOverview', () => {
    it('is permission-gated by workspace.settings.manage', async () => {
      await service.getOverview('u-admin', 'ws-1', 14);
      expect(authorization.assertPermission).toHaveBeenCalledWith('u-admin', 'ws-1', 'workspace.settings.manage');
    });

    it('aggregates tenant-scoped stats (PRD §92)', async () => {
      const overview = await service.getOverview('u-admin', 'ws-1', 7);

      expect(overview.workspace).toMatchObject({ id: 'ws-1', name: 'HQ', mode: 'ENTERPRISE' });
      expect(overview.stats).toMatchObject({
        totalMembers: 3,
        totalChannels: 2,
        totalMessages: 42,
        totalFiles: 3,
        storageUsedBytes: 1500,
        pendingRequests: 1,
        totalWorkedMinutes: 120, // 2h closed record; open record excluded
        unreadNotifications: 5,
      });
      // every count query must be scoped to the workspace
      expect(prisma.channel.count).toHaveBeenCalledWith({ where: { workspaceId: 'ws-1' } });
      expect(prisma.request.count).toHaveBeenCalledWith({
        where: { workspaceId: 'ws-1', status: 'PENDING' },
      });
    });

    it('throws NOT_FOUND for a missing workspace', async () => {
      prisma.workspace.findUnique.mockResolvedValue(null);
      await expect(service.getOverview('u-admin', 'ws-x', 14)).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('buckets the activity trend into daily counts covering the window', async () => {
      const overview = await service.getOverview('u-admin', 'ws-1', 7);
      expect(overview.activityTrend.messages).toHaveLength(7);
      expect(overview.activityTrend.clockIns).toHaveLength(7);
      expect(overview.activityTrend.requestsCreated).toHaveLength(7);
      expect(overview.activityTrend.messages[0]).toHaveProperty('date');
      expect(overview.activityTrend.messages[0]).toHaveProperty('count', 0);
    });
  });

  describe('listSuspendedUsers', () => {
    it('lists only non-active members, tenant-scoped', async () => {
      const items = await service.listSuspendedUsers('u-admin', 'ws-1');
      expect(prisma.workspaceMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ workspaceId: 'ws-1' }),
        }),
      );
      expect(items[0]).toMatchObject({ displayName: 'Ana', role: 'ADMIN' });
    });
  });

  describe('sumWorkedMinutes', () => {
    it('sums only closed records and clamps negatives', () => {
      const base = Date.parse('2026-09-20T00:00:00Z');
      expect(
        sumWorkedMinutes([
          { clockInAt: new Date(base), clockOutAt: new Date(base + 90 * 60_000) },
          { clockInAt: new Date(base), clockOutAt: null },
          { clockInAt: new Date(base), clockOutAt: new Date(base - 5 * 60_000) },
        ]),
      ).toBe(90);
    });
  });
});
