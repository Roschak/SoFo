import type { CalendarEntry, CalendarEntryKind } from './types';

export interface CalendarDayCell {
  /** ISO date key `YYYY-MM-DD` in local time. */
  readonly key: string;
  readonly dayOfMonth: number;
  readonly inMonth: boolean;
  readonly isToday: boolean;
  readonly entries: CalendarEntry[];
}

/** Local-time `YYYY-MM-DD` key for a date. */
export function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Builds a 6-week (42 cells) month grid starting Monday, buckets entries
 * per day. Pure — inputs are not mutated.
 */
export function buildMonthGrid(
  year: number,
  monthIndex: number,
  entries: CalendarEntry[],
  today = new Date(),
): CalendarDayCell[] {
  const byDay = new Map<string, CalendarEntry[]>();
  for (const entry of entries) {
    const key = dateKey(new Date(entry.startAt));
    const bucket = byDay.get(key);
    if (bucket) {
      bucket.push(entry);
    } else {
      byDay.set(key, [entry]);
    }
  }

  const firstOfMonth = new Date(year, monthIndex, 1);
  const gridStart = new Date(firstOfMonth);
  const mondayOffset = (firstOfMonth.getDay() + 6) % 7; // Monday = 0
  gridStart.setDate(firstOfMonth.getDate() - mondayOffset);

  const todayKey = dateKey(today);
  const cells: CalendarDayCell[] = [];
  for (let index = 0; index < 42; index += 1) {
    const current = new Date(gridStart);
    current.setDate(gridStart.getDate() + index);
    const key = dateKey(current);
    cells.push({
      key,
      dayOfMonth: current.getDate(),
      inMonth: current.getMonth() === monthIndex,
      isToday: key === todayKey,
      entries: byDay.get(key) ?? [],
    });
  }
  return cells;
}

export const KIND_CLASS: Record<CalendarEntryKind, string> = {
  event: 'calendar__entry--event',
  meeting: 'calendar__entry--meeting',
  project_deadline: 'calendar__entry--deadline',
  task_deadline: 'calendar__entry--deadline',
};

export function formatDayLabel(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** "Hari ini", "Besok", "3 hari lagi", atau "terlambat/2 hari lalu". */
export function formatDueIn(days: number): string {
  if (days === 0) return 'Hari ini';
  if (days === 1) return 'Besok';
  return `${days} hari lagi`;
}
