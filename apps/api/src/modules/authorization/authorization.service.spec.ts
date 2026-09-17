import { AuthorizationService } from './authorization.service';

describe('AuthorizationService', () => {
  let service: AuthorizationService;
  let prisma: { workspaceMember: { findUnique: jest.Mock } };

  beforeEach(() => {
    prisma = {
      workspaceMember: {
        findUnique: jest.fn(),
      },
    };
    service = new AuthorizationService(prisma as never);
  });

  describe('assertPermission', () => {
    it('throws FORBIDDEN when the user is not a member (tenant isolation)', async () => {
      prisma.workspaceMember.findUnique.mockResolvedValue(null);

      await expect(
        service.assertPermission('user-1', 'ws-1', 'channel.view'),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });

    it('throws FORBIDDEN when the role lacks the permission', async () => {
      prisma.workspaceMember.findUnique.mockResolvedValue({
        role: { name: 'STAFF', permissions: ['workspace.view'] },
      });

      await expect(
        service.assertPermission('user-1', 'ws-1', 'workspace.update'),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });

    it('allows when the role has the permission', async () => {
      prisma.workspaceMember.findUnique.mockResolvedValue({
        role: { name: 'ADMIN', permissions: ['workspace.update'] },
      });

      await expect(
        service.assertPermission('user-1', 'ws-1', 'workspace.update'),
      ).resolves.toBeUndefined();
    });
  });

  describe('getMembership', () => {
    it('returns null for non-members', async () => {
      prisma.workspaceMember.findUnique.mockResolvedValue(null);
      const membership = await service.getMembership('user-1', 'ws-1');
      expect(membership).toBeNull();
    });

    it('returns the role name for members', async () => {
      prisma.workspaceMember.findUnique.mockResolvedValue({
        role: { name: 'OWNER' },
      });
      const membership = await service.getMembership('user-1', 'ws-1');
      expect(membership).toEqual({
        userId: 'user-1',
        workspaceId: 'ws-1',
        role: 'OWNER',
      });
    });
  });
});
