import { RequestService } from './request.service';

describe('RequestService', () => {
  let service: RequestService;
  let prisma: any;
  let authorizationService: { assertPermission: jest.Mock; hasPermission: jest.Mock };
  let auditService: { record: jest.Mock };

  const row = (overrides: Record<string, unknown> = {}) => ({
    id: 'r-1',
    workspaceId: 'ws-1',
    requesterId: 'u-staff',
    type: 'LEAVE',
    title: 'Cuti 2 hari',
    payload: { days: 2 },
    status: 'PENDING',
    approverId: null,
    decisionNote: null,
    decidedAt: null,
    createdAt: new Date('2026-09-18T00:00:00.000Z'),
    requester: { displayName: 'Staff' },
    approver: null,
    ...overrides,
  });

  beforeEach(() => {
    prisma = {
      request: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    authorizationService = { assertPermission: jest.fn(), hasPermission: jest.fn().mockResolvedValue(true) };
    auditService = { record: jest.fn() };
    service = new RequestService(
      prisma as never,
      authorizationService as never,
      auditService as never,
    );
  });

  describe('createRequest', () => {
    it('gates by request.create and writes audit', async () => {
      prisma.request.create.mockResolvedValue(row());

      const created = await service.createRequest('u-staff', 'ws-1', {
        type: 'LEAVE',
        title: 'Cuti 2 hari',
        payload: { days: 2 },
      });

      expect(authorizationService.assertPermission).toHaveBeenCalledWith('u-staff', 'ws-1', 'request.create');
      expect(created).toMatchObject({ type: 'LEAVE', status: 'PENDING', requesterName: 'Staff' });
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'request.create', target: 'request:r-1' }),
      );
    });
  });

  describe('listRequests', () => {
    it('shows all requests to approvers', async () => {
      await service.listRequests('u-manager', 'ws-1', {});
      expect(prisma.request.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ workspaceId: 'ws-1' }) }),
      );
      const where = prisma.request.findMany.mock.calls[0][0].where;
      expect(where.requesterId).toBeUndefined();
    });

    it('scopes non-approvers to their own requests', async () => {
      authorizationService.hasPermission.mockResolvedValue(false);

      await service.listRequests('u-staff', 'ws-1', {});

      const where = prisma.request.findMany.mock.calls[0][0].where;
      expect(where.requesterId).toBe('u-staff');
    });

    it('forces own-scope for approvers when mine=1', async () => {
      await service.listRequests('u-manager', 'ws-1', { mine: true });
      const where = prisma.request.findMany.mock.calls[0][0].where;
      expect(where.requesterId).toBe('u-manager');
    });

    it('forwards status filter', async () => {
      await service.listRequests('u-manager', 'ws-1', { status: 'PENDING' });
      const where = prisma.request.findMany.mock.calls[0][0].where;
      expect(where.status).toBe('PENDING');
    });
  });

  describe('decideRequest', () => {
    it('approves a pending request and audits with action request.approve', async () => {
      prisma.request.findFirst.mockResolvedValue(row());
      prisma.request.update.mockResolvedValue(
        row({ status: 'APPROVED', approverId: 'u-manager', decidedAt: new Date() }),
      );

      const result = await service.decideRequest('u-manager', 'ws-1', 'r-1', 'APPROVED', 'OK');

      expect(result.status).toBe('APPROVED');
      expect(prisma.request.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'APPROVED', approverId: 'u-manager' }),
        }),
      );
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'request.approve' }),
      );
    });

    it('bans deciding your own request (separation of duties)', async () => {
      prisma.request.findFirst.mockResolvedValue(row({ requesterId: 'u-manager' }));

      await expect(
        service.decideRequest('u-manager', 'ws-1', 'r-1', 'APPROVED'),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });

    it('rejects double decisions', async () => {
      prisma.request.findFirst.mockResolvedValue(row({ status: 'APPROVED' }));

      await expect(
        service.decideRequest('u-manager', 'ws-1', 'r-1', 'REJECTED'),
      ).rejects.toMatchObject({ code: 'CONFLICT' });
    });

    it('404s for requests from another workspace (no tenant leak)', async () => {
      prisma.request.findFirst.mockResolvedValue(null);

      await expect(
        service.decideRequest('u-manager', 'ws-OTHER', 'r-1', 'APPROVED'),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });

  describe('cancelRequest', () => {
    it('lets the requester withdraw a pending request', async () => {
      prisma.request.findFirst.mockResolvedValue(row());
      prisma.request.update.mockResolvedValue(row({ status: 'CANCELLED' }));

      const result = await service.cancelRequest('u-staff', 'ws-1', 'r-1');

      expect(result.status).toBe('CANCELLED');
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'request.cancel' }),
      );
    });

    it('blocks cancel by anyone other than the requester', async () => {
      prisma.request.findFirst.mockResolvedValue(row());

      await expect(service.cancelRequest('u-manager', 'ws-1', 'r-1')).rejects.toMatchObject({
        code: 'FORBIDDEN',
      });
    });

    it('blocks cancel after a decision', async () => {
      prisma.request.findFirst.mockResolvedValue(row({ status: 'APPROVED' }));

      await expect(service.cancelRequest('u-staff', 'ws-1', 'r-1')).rejects.toMatchObject({
        code: 'CONFLICT',
      });
    });
  });
});
