import { SearchService } from './search.service';

describe('SearchService', () => {
  let service: SearchService;
  let mockPrisma: any;
  let mockAuth: any;

  beforeEach(() => {
    mockPrisma = {
      channel: { findMany: jest.fn().mockResolvedValue([]) },
      message: { findMany: jest.fn().mockResolvedValue([]) },
      project: { findMany: jest.fn().mockResolvedValue([]) },
      task: { findMany: jest.fn().mockResolvedValue([]) },
      file: { findMany: jest.fn().mockResolvedValue([]) },
      workspaceMember: { findMany: jest.fn().mockResolvedValue([]) },
    };

    mockAuth = {
      assertPermission: jest.fn().mockResolvedValue(undefined),
      hasPermission: jest.fn().mockResolvedValue(true),
    };

    service = new SearchService(mockPrisma as never, mockAuth as never);
  });

  it('searches across authorized sources and aggregates items', async () => {
    mockPrisma.channel.findMany.mockResolvedValue([
      { id: 'c1', name: 'general', topic: 'Main channel', createdAt: new Date() },
    ]);
    mockPrisma.message.findMany.mockResolvedValue([
      {
        id: 'm1',
        content: 'Hello general world',
        channelId: 'c1',
        createdAt: new Date(),
        author: { displayName: 'Alice' },
      },
    ]);

    const result = await service.search('user-1', 'ws-1', { q: 'general', type: 'all' });

    expect(mockAuth.assertPermission).toHaveBeenCalledWith('user-1', 'ws-1', 'workspace.view');
    expect(result.query).toBe('general');
    expect(result.total).toBe(2);
    expect(result.items[0]?.type).toBe('channel');
    expect(result.items[1]?.type).toBe('message');
  });

  it('filters by specific search type', async () => {
    mockPrisma.channel.findMany.mockResolvedValue([
      { id: 'c1', name: 'general', topic: 'Main channel', createdAt: new Date() },
    ]);

    const result = await service.search('user-1', 'ws-1', { q: 'general', type: 'channel' });

    expect(mockPrisma.channel.findMany).toHaveBeenCalled();
    expect(mockPrisma.message.findMany).not.toHaveBeenCalled();
    expect(result.items).toHaveLength(1);
  });

  it('skips restricted modules if user lacks permission', async () => {
    mockAuth.hasPermission.mockImplementation(async (_uid: string, _wid: string, perm: string) => {
      if (perm === 'channel.view') return false;
      return true;
    });

    await service.search('user-1', 'ws-1', { q: 'secret', type: 'all' });

    expect(mockPrisma.channel.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.message.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.project.findMany).toHaveBeenCalled();
  });
});
