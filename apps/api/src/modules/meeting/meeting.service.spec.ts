import { MeetingService } from './meeting.service';

describe('MeetingService', () => {
  let service: MeetingService;
  let prisma: any;
  let authorizationService: { assertPermission: jest.Mock };

  const meeting = (overrides: Record<string, unknown> = {}) => ({
    id: 'mt-1',
    workspaceId: 'ws-1',
    title: 'Standup',
    status: 'SCHEDULED',
    hostId: 'host-1',
    participants: [],
    notes: [],
    ...overrides,
  });

  beforeEach(() => {
    prisma = {
      meeting: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      meetingParticipant: { findUnique: jest.fn(), create: jest.fn() },
      meetingNote: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    };
    authorizationService = { assertPermission: jest.fn() };
    service = new MeetingService(prisma as never, authorizationService as never, {
      record: jest.fn(),
    } as never);
  });

  describe('lifecycle', () => {
    it('rejects starting a non-scheduled meeting', async () => {
      prisma.meeting.findFirst.mockResolvedValue(meeting({ status: 'ACTIVE' }));

      await expect(
        service.startMeeting('host-1', 'ws-1', 'mt-1'),
      ).rejects.toMatchObject({ code: 'CONFLICT' });
    });

    it('rejects ending a meeting that never started', async () => {
      prisma.meeting.findFirst.mockResolvedValue(meeting({ status: 'SCHEDULED' }));

      await expect(
        service.endMeeting('host-1', 'ws-1', 'mt-1'),
      ).rejects.toMatchObject({ code: 'CONFLICT' });
    });

    it('rejects archiving a meeting that has not ended', async () => {
      prisma.meeting.findFirst.mockResolvedValue(meeting({ status: 'SCHEDULED' }));

      await expect(
        service.archiveMeeting('host-1', 'ws-1', 'mt-1'),
      ).rejects.toMatchObject({ code: 'CONFLICT' });
    });

    it('ends an active meeting and stamps endedAt', async () => {
      prisma.meeting.findFirst.mockResolvedValue(meeting({ status: 'ACTIVE' }));
      prisma.meeting.update.mockResolvedValue(meeting({ status: 'ENDED' }));

      await service.endMeeting('host-1', 'ws-1', 'mt-1');
      expect(prisma.meeting.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'mt-1' } }),
      );
    });
  });

  describe('upsertNote', () => {
    it('rejects notes from users who never joined', async () => {
      prisma.meeting.findFirst.mockResolvedValue(meeting({ hostId: 'host-1' }));
      prisma.meetingParticipant.findUnique.mockResolvedValue(null);

      await expect(
        service.upsertNote('outsider', 'ws-1', 'mt-1', 'notes'),
      ).rejects.toMatchObject({ code: 'CONFLICT' });
    });

    it('allows the host to write notes without joining first', async () => {
      prisma.meeting.findFirst.mockResolvedValue(meeting({ hostId: 'host-1' }));
      prisma.meetingParticipant.findUnique.mockResolvedValue(null);
      prisma.meetingNote.findFirst.mockResolvedValue(null);
      prisma.meetingNote.create.mockResolvedValue({
        id: 'n-1',
        meetingId: 'mt-1',
        authorId: 'host-1',
        content: 'decisions',
      });

      const note = await service.upsertNote('host-1', 'ws-1', 'mt-1', 'decisions');
      expect(note.content).toBe('decisions');
    });
  });
});
