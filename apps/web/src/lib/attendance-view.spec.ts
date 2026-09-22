import { describe, expect, it } from 'vitest';
import {
  canClock,
  canViewAllAttendance,
  filterAttendance,
  formatTime,
  formatWorkedTime,
  getAttendanceStatusBadge,
} from './attendance-view';
import type { AttendanceRecord } from './types';

describe('attendance-view helpers', () => {
  it('correctly gates clock action by role', () => {
    expect(canClock('OWNER')).toBe(true);
    expect(canClock('MEMBER')).toBe(true);
    expect(canClock('GUEST')).toBe(false);
    expect(canClock('CLIENT')).toBe(false);
    expect(canClock(undefined)).toBe(false);
  });

  it('correctly gates view-all permission by role', () => {
    expect(canViewAllAttendance('OWNER')).toBe(true);
    expect(canViewAllAttendance('ADMIN')).toBe(true);
    expect(canViewAllAttendance('MANAGER')).toBe(true);
    expect(canViewAllAttendance('MEMBER')).toBe(false);
  });

  it('formats worked minutes into human hours and minutes', () => {
    expect(formatWorkedTime(null)).toBe('-');
    expect(formatWorkedTime(0)).toBe('0 mnt');
    expect(formatWorkedTime(45)).toBe('45 mnt');
    expect(formatWorkedTime(60)).toBe('1 jam 0 mnt');
    expect(formatWorkedTime(150)).toBe('2 jam 30 mnt');
  });

  it('formats time string into human readable time', () => {
    expect(formatTime(null)).toBe('-');
    expect(formatTime('invalid')).toBe('-');
    expect(formatTime('2026-09-19T08:30:00Z')).toMatch(/\d{2}[:.]\d{2}/);
  });


  it('computes status badge and variant', () => {
    expect(getAttendanceStatusBadge('ON_TIME', 0)).toEqual({
      label: 'Tepat Waktu',
      variant: 'success',
    });
    expect(getAttendanceStatusBadge('LATE', 15)).toEqual({
      label: 'Terlambat (15 mnt)',
      variant: 'warning',
    });
    expect(getAttendanceStatusBadge('LATE', 75)).toEqual({
      label: 'Terlambat (75 mnt)',
      variant: 'danger',
    });
  });

  it('filters attendance records by status and search keyword', () => {
    const records: AttendanceRecord[] = [
      {
        id: '1',
        userId: 'u1',
        userName: 'Budi Santoso',
        workDate: '2026-09-19',
        clockInAt: '2026-09-19T08:50:00Z',
        clockOutAt: '2026-09-19T17:00:00Z',
        status: 'ON_TIME',
        minutesLate: 0,
        workedMinutes: 490,
        note: 'Hadir di kantor',
      },
      {
        id: '2',
        userId: 'u2',
        userName: 'Siti Rahma',
        workDate: '2026-09-19',
        clockInAt: '2026-09-19T09:40:00Z',
        clockOutAt: null,
        status: 'LATE',
        minutesLate: 25,
        workedMinutes: null,
        note: 'Macet jalan layang',
      },
    ];

    expect(filterAttendance(records, { status: 'ALL' })).toHaveLength(2);
    expect(filterAttendance(records, { status: 'LATE' })).toHaveLength(1);
    expect(filterAttendance(records, { search: 'budi' })).toHaveLength(1);
    expect(filterAttendance(records, { search: 'layang' })).toHaveLength(1);
    expect(filterAttendance(records, { search: 'tidak ada' })).toHaveLength(0);
  });
});
