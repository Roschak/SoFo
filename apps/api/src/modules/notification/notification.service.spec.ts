import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let prisma: any;
  let socketServer: { to: jest.Mock; emit: jest.Mock };
  let loggerError: jest.SpyInstance;

  const row = (overrides: Record<string, unknown> = {}) => ({
    id: 'n-1',
    workspaceId: 'ws-1',
    userId: 'u-recipient',
    actorId: 'u-actor',
    type: 'request.approved',
    title: 'Disetujui',
    body: null,
    refType: 'request',
    refId: 'r-1',
    status: 'UNREAD',
    createdAt: new Date('2026-09-18T00:00:00.000Z'),
    actor: { displayName: 'Owner' },
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      notification: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([row()]),
        count: jest.fn().mockResolvedValue(3),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    service = new NotificationService(prisma as never);

    // Stub the socket server singleton used for realtime push.
    const socketModule = await import('../../infrastructure/realtime/socket-server');
    socketServer = { to: jest.fn().mockReturnThis(), emit: jest.fn() };
    (socketModule as unknown as { setSocketServer: (s: unknown) => void }).setSocketServer(
      socketServer as never,
    );

    loggerError = jest
      .spyOn((service as unknown as { logger: { error: jest.Mock } }).logger, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    loggerError.mockRestore();
  });

  describe('handleDomainEvent', () => {
    it('filters out the actor so nobody is notified for their own action', async () => {
      await service.handleDomainEvent({
        workspaceId: 'ws-1',
        actorId: 'u-actor',
        recipientIds: ['u-actor', 'u-recipient'],
        type: 'request.approved',
        title: 'Disetujui',
      });

      expect(prisma.notification.createMany).toHaveBeenCalledWith({
        data: [expect.objectContaining({ userId: 'u-recipient' })],
      });
    });

    it('skips entirely when no recipient remains', async () => {
      await service.handleDomainEvent({
        workspaceId: 'ws-1',
        actorId: 'u-actor',
        recipientIds: ['u-actor'],
        type: 'request.approved',
        title: 'Disetujui',
      });

      expect(prisma.notification.createMany).not.toHaveBeenCalled();
    });

    it('pushes notification.created into the recipient user room', async () => {
      await service.handleDomainEvent({
        workspaceId: 'ws-1',
        actorId: 'u-actor',
        recipientIds: ['u-recipient'],
        type: 'request.approved',
        title: 'Disetujui',
      });

      expect(socketServer.to).toHaveBeenCalledWith('user:u-recipient');
      expect(socketServer.emit).toHaveBeenCalledWith(
        'notification.created',
        expect.objectContaining({ id: 'n-1', actorName: 'Owner', type: 'request.approved' }),
      );
    });

    it('never throws when the write fails', async () => {
      prisma.notification.createMany.mockRejectedValue(new Error('db down'));

      await expect(
        service.handleDomainEvent({
          workspaceId: 'ws-1',
          actorId: 'u-actor',
          recipientIds: ['u-recipient'],
          type: 'request.approved',
          title: 'Disetujui',
        }),
      ).resolves.toBeUndefined();
      expect(loggerError).toHaveBeenCalledTimes(1);
    });
  });

  describe('reads', () => {
    it('counts unread for the user only', async () => {
      const result = await service.unreadCount('u-recipient');
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'u-recipient', status: 'UNREAD' },
      });
      expect(result.count).toBe(3);
    });

    it('marks one read scoped to the owner', async () => {
      await service.markRead('u-recipient', 'n-1');
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'n-1', userId: 'u-recipient', status: 'UNREAD' },
        data: expect.objectContaining({ status: 'READ' }),
      });
      expect(socketServer.emit).toHaveBeenCalledWith(
        'notification.read',
        expect.objectContaining({ notificationId: 'n-1' }),
      );
    });

    it('marks all read for the user only', async () => {
      await service.markAllRead('u-recipient');
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u-recipient', status: 'UNREAD' },
        data: expect.objectContaining({ status: 'READ' }),
      });
    });
  });
});
