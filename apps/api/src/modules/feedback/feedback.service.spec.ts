import { FeedbackService } from './feedback.service';

describe('FeedbackService (PRD §98, Phase 27)', () => {
  let service: FeedbackService;
  let prisma: any;
  let authorizationService: { assertPermission: jest.Mock; hasPermission: jest.Mock };
  let auditService: { record: jest.Mock };
  let eventEmitter: { emit: jest.Mock };

  const feedbackRow = (overrides: Record<string, unknown> = {}) => ({
    id: 'fb-1',
    workspaceId: 'ws-1',
    reporterId: 'u-staff',
    type: 'BUG',
    message: 'Tombol clock-in kadang double submit',
    status: 'OPEN',
    decisionNote: null,
    decidedById: null,
    decidedAt: null,
    createdAt: new Date('2026-09-26T08:00:00.000Z'),
    reporter: { displayName: 'Staff' },
    decidedBy: null,
    votes: [{ userId: 'u-staff' }],
    ...overrides,
  });

  beforeEach(() => {
    prisma = {
      feedback: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      feedbackVote: {
        create: jest.fn(),
        findUnique: jest.fn().mockResolvedValue(null),
      },
      workspaceMember: { findMany: jest.fn().mockResolvedValue([]) },
    };
    authorizationService = { assertPermission: jest.fn(), hasPermission: jest.fn() };
    auditService = { record: jest.fn() };
    eventEmitter = { emit: jest.fn() };
    service = new FeedbackService(
      prisma as never,
      authorizationService as never,
      auditService as never,
      eventEmitter as never,
    );
  });

  describe('submitFeedback', () => {
    it('creates feedback, audits, and notifies deciders', async () => {
      prisma.feedback.create.mockResolvedValue(feedbackRow());
      prisma.workspaceMember.findMany.mockResolvedValue([{ userId: 'u-owner' }]);

      const view = await service.submitFeedback('u-staff', 'ws-1', {
        type: 'BUG',
        message: 'Tombol clock-in kadang double submit',
      });

      expect(view).toMatchObject({ id: 'fb-1', status: 'OPEN', voteCount: 1, votedByMe: true });
      expect(authorizationService.assertPermission).toHaveBeenCalledWith(
        'u-staff',
        'ws-1',
        'workspace.view',
      );
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'feedback.submit', target: 'feedback:fb-1' }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'notification.feedback.submitted',
        expect.objectContaining({
          type: 'feedback.submitted',
          recipientIds: ['u-owner'],
        }),
      );
    });
  });

  describe('vote', () => {
    it('records a new vote', async () => {
      prisma.feedback.findFirst.mockResolvedValue(feedbackRow());

      const view = await service.vote('u-owner', 'ws-1', 'fb-1');

      expect(prisma.feedbackVote.create).toHaveBeenCalledWith({
        data: { feedbackId: 'fb-1', userId: 'u-owner' },
      });
      expect(view.voteCount).toBe(1);
    });

    it('rejects a duplicate vote with 409', async () => {
      prisma.feedback.findFirst.mockResolvedValue(feedbackRow());
      prisma.feedbackVote.findUnique.mockResolvedValue({ id: 'v-1' });

      await expect(service.vote('u-staff', 'ws-1', 'fb-1')).rejects.toMatchObject({
        code: 'CONFLICT',
      });
    });

    it('is tenant-scoped: feedback of another workspace is 404', async () => {
      prisma.feedback.findFirst.mockResolvedValue(null);

      await expect(service.vote('u-1', 'ws-OTHER', 'fb-1')).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });
  });

  describe('decide', () => {
    it('gates on feedback.decide and stores decision + note', async () => {
      prisma.feedback.findFirst.mockResolvedValue(feedbackRow());
      prisma.feedback.update.mockResolvedValue(
        feedbackRow({
          status: 'ACCEPTED',
          decisionNote: 'Masuk backlog sprint depan',
          decidedById: 'u-owner',
          decidedAt: new Date('2026-09-26T09:00:00.000Z'),
          decidedBy: { displayName: 'Owner' },
        }),
      );

      const view = await service.decide('u-owner', 'ws-1', 'fb-1', {
        status: 'ACCEPTED',
        decisionNote: 'Masuk backlog sprint depan',
      });

      expect(view).toMatchObject({ status: 'ACCEPTED', decidedByName: 'Owner' });
      expect(authorizationService.assertPermission).toHaveBeenCalledWith(
        'u-owner',
        'ws-1',
        'feedback.decide',
      );
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'feedback.decide' }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'notification.feedback.decided',
        expect.objectContaining({ type: 'feedback.decided', recipientIds: ['u-staff'] }),
      );
    });

    it('rejects a second decision with 409', async () => {
      prisma.feedback.findFirst.mockResolvedValue(feedbackRow({ status: 'ACCEPTED' }));

      await expect(
        service.decide('u-owner', 'ws-1', 'fb-1', { status: 'REJECTED' }),
      ).rejects.toMatchObject({ code: 'CONFLICT' });
    });
  });

  describe('listFeedback', () => {
    it('filters by mine and status, tenant-scoped', async () => {
      prisma.feedback.findMany.mockResolvedValue([]);

      await service.listFeedback('u-staff', 'ws-1', { mine: true, status: 'OPEN' });

      expect(prisma.feedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { workspaceId: 'ws-1', reporterId: 'u-staff', status: 'OPEN' },
        }),
      );
    });
  });
});
