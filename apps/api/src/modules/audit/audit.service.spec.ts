import { AuditService } from './audit.service';

describe('AuditService', () => {
  let service: AuditService;
  let prisma: any;
  let loggerError: jest.SpyInstance;

  beforeEach(() => {
    prisma = {
      auditLog: {
        create: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    service = new AuditService(prisma as never);
    loggerError = jest.spyOn((service as unknown as { logger: { error: jest.Mock } }).logger, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    loggerError.mockRestore();
  });

  describe('record', () => {
    it('writes the WHO/WHAT/WHERE/RESULT entry (PRD §49)', async () => {
      await service.record({
        workspaceId: 'ws-1',
        actorId: 'u-1',
        action: 'channel.delete',
        target: 'channel:general',
        result: 'SUCCESS',
        metadata: { channelId: 'c-1' },
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workspaceId: 'ws-1',
          actorId: 'u-1',
          action: 'channel.delete',
          target: 'channel:general',
          result: 'SUCCESS',
        }),
      });
    });

    it('never breaks the business flow when the write fails', async () => {
      prisma.auditLog.create.mockRejectedValue(new Error('db down'));

      await expect(
        service.record({
          workspaceId: 'ws-1',
          actorId: 'u-1',
          action: 'channel.delete',
          target: 'channel:general',
          result: 'SUCCESS',
        }),
      ).resolves.toBeUndefined();
      expect(loggerError).toHaveBeenCalledTimes(1);
    });
  });

  describe('listLogs', () => {
    it('is tenant-scoped by workspaceId and forwards filters', async () => {
      prisma.auditLog.findMany.mockResolvedValue([
        {
          id: 'a-1',
          workspaceId: 'ws-1',
          actorId: 'u-1',
          action: 'channel.delete',
          target: 'channel:general',
          result: 'SUCCESS',
          metadata: null,
          createdAt: new Date('2026-09-18T00:00:00.000Z'),
          actor: { displayName: 'Ana' },
        },
      ]);

      const result = await service.listLogs('u-viewer', 'ws-1', {
        action: 'channel.delete',
        actorId: 'u-1',
        result: 'SUCCESS',
        limit: 10,
      });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            workspaceId: 'ws-1',
            action: 'channel.delete',
            actorId: 'u-1',
            result: 'SUCCESS',
          }),
          take: 11, // limit + 1 lookahead
        }),
      );
      expect(result.items[0]).toMatchObject({
        id: 'a-1',
        actorName: 'Ana',
        action: 'channel.delete',
      });
      expect(result.nextCursor).toBeNull();
    });

    it('returns nextCursor only when more rows exist', async () => {
      const row = (id: string) => ({
        id,
        workspaceId: 'ws-1',
        actorId: 'u-1',
        action: 'channel.delete',
        target: 'channel:general',
        result: 'SUCCESS',
        metadata: null,
        createdAt: new Date(),
        actor: { displayName: 'Ana' },
      });
      prisma.auditLog.findMany.mockResolvedValue([row('a-1'), row('a-2'), row('a-3')]);

      const result = await service.listLogs('u-viewer', 'ws-1', { limit: 2 });

      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).toBe('a-2');
    });

    it('clamps limit to the 200 maximum', async () => {
      await service.listLogs('u-viewer', 'ws-1', { limit: 5000 });
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 201 }),
      );
    });
  });
});
