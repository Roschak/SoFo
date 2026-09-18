import { CommunicationService } from './communication.service';

describe('CommunicationService', () => {
  let service: CommunicationService;
  let prisma: any;
  let authorizationService: { assertPermission: jest.Mock };

  const messageWithChannel = (overrides: Record<string, unknown> = {}) => ({
    id: 'm-1',
    channelId: 'c-1',
    authorId: 'author-1',
    author: { displayName: 'Author One' },
    content: 'hello',
    replyToId: null,
    editedAt: null,
    deletedAt: null,
    createdAt: new Date(),
    attachments: [],
    channel: { workspaceId: 'ws-1' },
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
      workspace: { findUniqueOrThrow: jest.fn() },
    };
    authorizationService = { assertPermission: jest.fn() };
    service = new CommunicationService(
      prisma as never,
      authorizationService as never,
      { broadcastMessageCreated: jest.fn(), broadcastMessageUpdated: jest.fn(), broadcastMessageDeleted: jest.fn() } as never,
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
});
