import { CommunicationService } from './communication.service';

describe('CommunicationService', () => {
  let service: CommunicationService;
  let prisma: any;
  let authorizationService: { assertPermission: jest.Mock; hasPermission: jest.Mock };
  let eventEmitter: { emit: jest.Mock };

  const messageWithChannel = (overrides: Record<string, unknown> = {}) => ({
    id: 'm-1',
    channelId: 'c-1',
    authorId: 'author-1',
    author: { displayName: 'Author One' },
    channel: { workspace: { mode: 'ENTERPRISE' } },
    content: 'hello',
    replyToId: null,
    editedAt: null,
    deletedAt: null,
    createdAt: new Date(),
    attachments: [],
    status: 'VISIBLE',
    ...overrides,
  });

  beforeEach(() => {
    prisma = {
      channel: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
      },
      message: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
      },
      workspaceMember: { findMany: jest.fn().mockResolvedValue([]) },
      workspace: { findUniqueOrThrow: jest.fn() },
    };
    authorizationService = { assertPermission: jest.fn(), hasPermission: jest.fn().mockResolvedValue(false) };
    eventEmitter = { emit: jest.fn() };
    service = new CommunicationService(
      prisma as never,
      authorizationService as never,
      {
        broadcastMessageCreated: jest.fn(),
        broadcastMessageUpdated: jest.fn(),
        broadcastMessageDeleted: jest.fn(),
        broadcastMessageModerated: jest.fn(),
      } as never,
      { record: jest.fn() } as never,
      eventEmitter as never,
    );
  });

  describe('editMessage', () => {
    it('rejects edits by non-authors', async () => {
      prisma.message.findFirst.mockResolvedValue(messageWithChannel({ authorId: 'someone-else' }));

      await expect(
        service.editMessage('intruder-1', 'ws-1', 'm-1', 'hacked'),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });

    it('allows the author to edit', async () => {
      prisma.message.findFirst.mockResolvedValue(messageWithChannel());
      prisma.message.update.mockResolvedValue(
        messageWithChannel({ content: 'edited', editedAt: new Date() }),
      );

      const result = await service.editMessage('author-1', 'ws-1', 'm-1', 'edited');
      expect(result.content).toBe('edited');
    });

    it('never finds messages from another workspace (tenant isolation)', async () => {
      prisma.message.findFirst.mockResolvedValue(null);

      await expect(
        service.editMessage('author-1', 'ws-OTHER', 'm-1', 'edited'),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });

  describe('deleteMessage', () => {
    it('allows the workspace owner to delete any message', async () => {
      prisma.message.findFirst.mockResolvedValue(messageWithChannel({ authorId: 'author-1' }));
      prisma.workspace.findUniqueOrThrow.mockResolvedValue({ ownerId: 'owner-9' });
      prisma.message.update.mockResolvedValue({});

      await expect(
        service.deleteMessage('owner-9', 'ws-1', 'm-1'),
      ).resolves.toMatchObject({ success: true });
    });

    it('rejects deletion by regular non-author members', async () => {
      prisma.message.findFirst.mockResolvedValue(messageWithChannel({ authorId: 'author-1' }));
      prisma.workspace.findUniqueOrThrow.mockResolvedValue({ ownerId: 'owner-9' });

      await expect(
        service.deleteMessage('random-user', 'ws-1', 'm-1'),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });
  });

  describe('sendMessage moderation (PRD §93)', () => {
    it('marks messages PENDING_REVIEW in COMMUNITY workspaces for regular members', async () => {
      prisma.channel.findFirst.mockResolvedValue({
        id: 'c-1',
        workspace: { mode: 'COMMUNITY' },
      });
      authorizationService.hasPermission.mockResolvedValue(false);
      prisma.message.create.mockResolvedValue(
        messageWithChannel({ status: 'PENDING_REVIEW' }),
      );
      prisma.workspaceMember.findMany.mockResolvedValue([{ userId: 'mod-1' }]);

      const view = await service.sendMessage('member-1', 'ws-1', 'c-1', { content: 'halo' });
      expect(view.status).toBe('PENDING_REVIEW');
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'notification.moderation.pending',
        expect.objectContaining({ recipientIds: ['mod-1'], type: 'message.pending' }),
      );
    });

    it('posts directly for trusted members (message.moderate holders)', async () => {
      prisma.channel.findFirst.mockResolvedValue({
        id: 'c-1',
        workspace: { mode: 'COMMUNITY' },
      });
      authorizationService.hasPermission.mockResolvedValue(true);
      prisma.message.create.mockResolvedValue(messageWithChannel());

      const view = await service.sendMessage('mod-1', 'ws-1', 'c-1', { content: 'halo' });
      expect(view.status).toBe('VISIBLE');
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('posts directly in ENTERPRISE workspaces (no moderation lane)', async () => {
      prisma.channel.findFirst.mockResolvedValue({
        id: 'c-1',
        workspace: { mode: 'ENTERPRISE' },
      });
      prisma.message.create.mockResolvedValue(messageWithChannel());

      const view = await service.sendMessage('member-1', 'ws-1', 'c-1', { content: 'halo' });
      expect(view.status).toBe('VISIBLE');
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('listMessages visibility (PRD §93)', () => {
    it('hides non-VISIBLE messages from members without message.moderate', async () => {
      prisma.channel.findFirst.mockResolvedValue({ id: 'c-1' });
      prisma.message.findMany.mockResolvedValue([]);

      await service.listMessages('member-1', 'ws-1', 'c-1');
      expect(prisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'VISIBLE' }),
        }),
      );
    });

    it('shows the whole lane (including pending) to moderators', async () => {
      prisma.channel.findFirst.mockResolvedValue({ id: 'c-1' });
      authorizationService.hasPermission.mockResolvedValue(true);
      prisma.message.findMany.mockResolvedValue([]);

      await service.listMessages('mod-1', 'ws-1', 'c-1');
      const call = prisma.message.findMany.mock.calls[0][0] as { where: Record<string, unknown> };
      expect(call.where.status).toBeUndefined();
    });
  });

  describe('moderation decisions (PRD §93)', () => {
    it('approve moves PENDING_REVIEW → VISIBLE and audits', async () => {
      authorizationService.assertPermission.mockResolvedValue(undefined);
      prisma.message.findFirst.mockResolvedValue(
        messageWithChannel({ status: 'PENDING_REVIEW' }),
      );
      prisma.message.update.mockResolvedValue(messageWithChannel({ status: 'VISIBLE' }));

      const view = await service.approveMessage('mod-1', 'ws-1', 'm-1');
      expect(view.status).toBe('VISIBLE');
      expect(prisma.message.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'VISIBLE', moderatedById: 'mod-1' }),
        }),
      );
    });

    it('remove hides a message and audits', async () => {
      authorizationService.assertPermission.mockResolvedValue(undefined);
      prisma.message.findFirst.mockResolvedValue(messageWithChannel());
      prisma.message.update.mockResolvedValue(messageWithChannel({ status: 'REMOVED' }));

      const view = await service.removeMessage('mod-1', 'ws-1', 'm-1');
      expect(view.status).toBe('REMOVED');
    });

    it('rejects duplicate decisions (409 CONFLICT)', async () => {
      authorizationService.assertPermission.mockResolvedValue(undefined);
      // Approving an already-VISIBLE message is a no-op decision → 409.
      prisma.message.findFirst.mockResolvedValue(messageWithChannel({ status: 'VISIBLE' }));

      await expect(
        service.approveMessage('mod-1', 'ws-1', 'm-1'),
      ).rejects.toMatchObject({ code: 'CONFLICT' });
    });

    it('never finds messages from another workspace (tenant isolation)', async () => {
      authorizationService.assertPermission.mockResolvedValue(undefined);
      prisma.message.findFirst.mockResolvedValue(null);

      await expect(
        service.approveMessage('mod-1', 'ws-OTHER', 'm-1'),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('moderation queue lists PENDING_REVIEW only, oldest first', async () => {
      authorizationService.assertPermission.mockResolvedValue(undefined);
      prisma.message.findMany.mockResolvedValue([
        messageWithChannel({ id: 'm-1', status: 'PENDING_REVIEW' }),
        messageWithChannel({ id: 'm-2', status: 'PENDING_REVIEW' }),
      ]);

      const result = await service.listModerationQueue('mod-1', 'ws-1');
      expect(result.items).toHaveLength(2);
      expect(prisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'PENDING_REVIEW' }),
          orderBy: { createdAt: 'asc' },
        }),
      );
    });
  });
});
