import type { AttendanceRecord } from './types';

/**
 * Pure helpers for the Attendance feature (Enterprise Mode, PRD §42, §87).
 */

export function canClock(role?: string): boolean {
  if (!role) return false;
  // All active internal roles can clock in/out
  return ['OWNER', 'ADMIN', 'MANAGER', 'MEMBER', 'MODERATOR'].includes(role);
}

export function canViewAllAttendance(role?: string): boolean {
  if (!role) return false;
  // Privileged roles can view the whole workspace attendance history
  return ['OWNER', 'ADMIN', 'MANAGER'].includes(role);
}

export function formatWorkedTime(minutes: number | null): string {
  if (minutes === null || minutes === undefined || minutes < 0) return '-';
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes} mnt`;
  return `${hours} jam ${remainingMinutes} mnt`;
}

export function formatTime(isoString: string | null): string {
  if (!isoString) return '-';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '-';
  }
}

export function getAttendanceStatusBadge(
  status: 'ON_TIME' | 'LATE',
  minutesLate: number,
): { label: string; variant: 'success' | 'warning' | 'danger' } {
  if (status === 'ON_TIME') {
    return { label: 'Tepat Waktu', variant: 'success' };
  }
  return {
    label: `Terlambat (${minutesLate} mnt)`,
    variant: minutesLate > 60 ? 'danger' : 'warning',
  };
}

export function filterAttendance(
  items: AttendanceRecord[],
  query: { status?: string; search?: string },
): AttendanceRecord[] {
  let result = items;
  if (query.status && query.status !== 'ALL') {
    result = result.filter((item) => item.status === query.status);
  }
  if (query.search && query.search.trim() !== '') {
    const term = query.search.trim().toLowerCase();
    result = result.filter(
      (item) =>
        (item.userName && item.userName.toLowerCase().includes(term)) ||
        (item.note && item.note.toLowerCase().includes(term)),
    );
  }
  return result;
}
