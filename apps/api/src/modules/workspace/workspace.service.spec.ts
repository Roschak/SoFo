import { WorkspaceService } from './workspace.service';

describe('WorkspaceService', () => {
  let service: WorkspaceService;
  let prisma: any;
  let authorizationService: { getMembership: jest.Mock; assertPermission: jest.Mock };

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(),
      workspace: {
        create: jest.fn().mockResolvedValue({
          id: 'ws-1',
          name: 'Acme',
          slug: 'acme',
          mode: 'ENTERPRISE',
          description: null,
          ownerId: 'owner-1',
        }),
        findUnique: jest.fn().mockResolvedValue(null),
      },
      role: {
        createMany: jest.fn().mockResolvedValue({ count: 8 }),
        findFirstOrThrow: jest.fn().mockResolvedValue({ id: 'role-owner', name: 'OWNER' }),
      },
      workspaceMember: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    (prisma.$transaction as jest.Mock).mockImplementation(
      async (callback: (tx: unknown) => Promise<unknown>) => callback(prisma),
    );

    authorizationService = { getMembership: jest.fn(), assertPermission: jest.fn() };

    service = new WorkspaceService(prisma as never, authorizationService as never);
  });

  describe('createWorkspace', () => {
    it('seeds default roles and owner membership atomically', async () => {
      const result = await service.createWorkspace('owner-1', {
        name: 'Acme Corp',
        mode: 'ENTERPRISE',
      });

      expect(prisma.role.createMany).toHaveBeenCalledTimes(1);
      expect(prisma.workspaceMember.create).toHaveBeenCalledWith({
        data: { workspaceId: 'ws-1', userId: 'owner-1', roleId: 'role-owner' },
      });
      expect(result.slug).toBe('acme');
    });
  });
});
