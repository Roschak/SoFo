import { AttendanceService, computeStatusAndLate } from './attendance.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { AuditService } from '../audit/audit.service';

describe('AttendanceService (PRD §42, §87 — enterprise only)', () => {
  let service: AttendanceService;
  let prisma: any;
  let authorizationService: { assertPermission: jest.Mock; hasPermission: jest.Mock };
  let auditService: { record: jest.Mock };

  /** 2026-09-21 is a Monday; base date used across tests. */
  const day = (hours: number, minutes: number) =>
    new Date(2026, 8, 21, hours, minutes, 0, 0);

  beforeEach(() => {
    prisma = {
      workspace: { findUnique: jest.fn().mockResolvedValue({ mode: 'ENTERPRISE' }) },
      attendanceRecord: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    authorizationService = { assertPermission: jest.fn(), hasPermission: jest.fn().mockResolvedValue(true) };
    auditService = { record: jest.fn().mockResolvedValue(undefined) };
    service = new AttendanceService(
      prisma as never,
      authorizationService as unknown as AuthorizationService,
      auditService as unknown as AuditService,
    );
  });

  describe('computeStatusAndLate (late status, PRD §42)', () => {
    it('ON_TIME at 09:00 and within the 15-minute grace', () => {
      expect(computeStatusAndLate(day(9, 0))).toEqual({ status: 'ON_TIME', minutesLate: 0 });
      expect(computeStatusAndLate(day(9, 15))).toEqual({ status: 'ON_TIME', minutesLate: 0 });
    });

    it('LATE after 09:15 with minutes counted past the threshold', () => {
      expect(computeStatusAndLate(day(9, 45))).toEqual({ status: 'LATE', minutesLate: 30 });
      expect(computeStatusAndLate(day(11, 0)).minutesLate).toBe(105);
    });
  });

  describe('enterprise gate (PRD §42)', () => {
    it('rejects COMMUNITY workspaces with 403 before permission checks', async () => {
      prisma.workspace.findUnique.mockResolvedValue({ mode: 'COMMUNITY' });
      await expect(service.clockIn('u1', 'ws1')).rejects.toMatchObject({ code: 'FORBIDDEN' });
      expect(authorizationService.assertPermission).not.toHaveBeenCalled();
    });

    it('rejects unknown workspaces with 403 (no tenant probing)', async () => {
      prisma.workspace.findUnique.mockResolvedValue(null);
      await expect(service.clockIn('u1', 'ws-missing')).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });
  });

  describe('clockIn', () => {
    it('creates an ON_TIME record when clocking in before the threshold', async () => {
      jest.useFakeTimers().setSystemTime(day(8, 55));
      prisma.attendanceRecord.create.mockResolvedValue({
        id: 'a1',
        userId: 'u1',
        workDate: new Date(2026, 8, 21),
        clockInAt: day(8, 55),
        clockOutAt: null,
        status: 'ON_TIME',
        minutesLate: 0,
        note: null,
      });

      const view = await service.clockIn('u1', 'ws1');

      expect(view).toMatchObject({ status: 'ON_TIME', minutesLate: 0, clockOutAt: null });
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'attendance.clock_in', target: 'attendance:a1' }),
      );
      jest.useRealTimers();
    });

    it('creates a LATE record with minutesLate after the threshold', async () => {
      jest.useFakeTimers().setSystemTime(day(10, 10));
      prisma.attendanceRecord.create.mockImplementation(async ({ data }: { data: any }) => ({
        id: 'a2',
        userId: data.userId,
        workDate: data.workDate,
        clockInAt: data.clockInAt,
        clockOutAt: null,
        status: data.status,
        minutesLate: data.minutesLate,
        note: null,
      }));

      const view = await service.clockIn('u1', 'ws1');

      expect(view.status).toBe('LATE');
      expect(view.minutesLate).toBe(55); // 10:10 = 610 min; threshold 555
      jest.useRealTimers();
    });

    it('409 CONFLICT on a second clock-in the same day (unique per user/day)', async () => {
      jest.useFakeTimers().setSystemTime(day(8, 0));
      prisma.attendanceRecord.findUnique.mockResolvedValue({ id: 'a1' });
      await expect(service.clockIn('u1', 'ws1')).rejects.toMatchObject({ code: 'CONFLICT' });
      expect(prisma.attendanceRecord.create).not.toHaveBeenCalled();
      jest.useRealTimers();
    });
  });

  describe('clockOut', () => {
    it('409 CONFLICT when there is no clock-in today', async () => {
      jest.useFakeTimers().setSystemTime(day(17, 0));
      prisma.attendanceRecord.findUnique.mockResolvedValue(null);
      await expect(service.clockOut('u1', 'ws1')).rejects.toMatchObject({ code: 'CONFLICT' });
      jest.useRealTimers();
    });

    it('409 CONFLICT when already clocked out', async () => {
      jest.useFakeTimers().setSystemTime(day(18, 0));
      prisma.attendanceRecord.findUnique.mockResolvedValue({
        id: 'a1',
        clockInAt: day(9, 0),
        clockOutAt: day(17, 0),
      });
      await expect(service.clockOut('u1', 'ws1')).rejects.toMatchObject({ code: 'CONFLICT' });
      jest.useRealTimers();
    });

    it('closes the record and computes workedMinutes', async () => {
      jest.useFakeTimers().setSystemTime(day(17, 0));
      prisma.attendanceRecord.findUnique.mockResolvedValue({
        id: 'a1',
        userId: 'u1',
        workDate: new Date(2026, 8, 21),
        clockInAt: day(9, 0),
        clockOutAt: null,
        status: 'ON_TIME',
        minutesLate: 0,
        note: null,
      });
      prisma.attendanceRecord.update.mockResolvedValue({
        id: 'a1',
        userId: 'u1',
        workDate: new Date(2026, 8, 21),
        clockInAt: day(9, 0),
        clockOutAt: day(17, 0),
        status: 'ON_TIME',
        minutesLate: 0,
        note: null,
      });

      const view = await service.clockOut('u1', 'ws1');

      expect(view.workedMinutes).toBe(480);
      expect(view.clockOutAt).toBe(day(17, 0).toISOString());
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'attendance.clock_out' }),
      );
      jest.useRealTimers();
    });
  });

  describe('listHistory', () => {
    it('is tenant-scoped and maps rows with userName + workedMinutes', async () => {
      prisma.attendanceRecord.findMany.mockResolvedValue([
        {
          id: 'a9',
          userId: 'u2',
          workDate: new Date(2026, 8, 20),
          clockInAt: new Date(2026, 8, 20, 9, 40),
          clockOutAt: new Date(2026, 8, 20, 17, 40),
          status: 'LATE',
          minutesLate: 25,
          note: 'hujan',
          user: { displayName: 'Budi' },
        },
      ]);

      const { items } = await service.listHistory('u1', 'ws1', {});

      expect(prisma.attendanceRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ workspaceId: 'ws1' }) }),
      );
      expect(items[0]).toMatchObject({
        userName: 'Budi',
        status: 'LATE',
        minutesLate: 25,
        workedMinutes: 480,
      });
    });

    it('rejects non-holders via attendance.view', async () => {
      authorizationService.assertPermission.mockRejectedValue({ code: 'FORBIDDEN' });
      await expect(service.listHistory('u1', 'ws1', {})).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });
  });

  describe('getTodayStatus', () => {
    it('returns null when the user has not clocked in today', async () => {
      jest.useFakeTimers().setSystemTime(day(8, 0));
      await expect(service.getTodayStatus('u1', 'ws1')).resolves.toBeNull();
      jest.useRealTimers();
    });
  });
});
