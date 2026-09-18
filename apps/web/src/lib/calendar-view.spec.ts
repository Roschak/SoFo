import { describe, expect, it } from 'vitest';
import { buildMonthGrid, dateKey, formatDueIn } from './calendar-view';
import type { CalendarEntry } from './types';

const entry = (id: string, startAt: string): CalendarEntry => ({
  kind: 'meeting',
  id: `meeting:${id}`,
  title: `Entry ${id}`,
  description: null,
  startAt,
  endAt: null,
  allDay: false,
  status: 'SCHEDULED',
  refId: id,
});

describe('dateKey', () => {
  it('formats local YYYY-MM-DD with zero padding', () => {
    expect(dateKey(new Date(2026, 8, 5))).toBe('2026-09-05');
  });
});

describe('buildMonthGrid', () => {
  it('always returns 42 cells (6 weeks)', () => {
    const cells = buildMonthGrid(2026, 8, [], new Date(2026, 8, 18));
    expect(cells).toHaveLength(42);
  });

  it('starts on Monday and marks out-of-month days', () => {
    // Sep 1 2026 is a Tuesday → grid starts Mon Aug 31.
    const cells = buildMonthGrid(2026, 8, [], new Date(2026, 8, 18));
    expect(cells[0]?.dayOfMonth).toBe(31);
    expect(cells[0]?.inMonth).toBe(false);
    expect(cells[1]?.dayOfMonth).toBe(1);
    expect(cells[1]?.inMonth).toBe(true);
  });

  it('flags today', () => {
    const cells = buildMonthGrid(2026, 8, [], new Date(2026, 8, 18));
    const today = cells.find((cell) => cell.isToday);
    expect(today?.dayOfMonth).toBe(18);
    expect(cells.filter((cell) => cell.isToday)).toHaveLength(1);
  });

  it('buckets entries into the right day', () => {
    const cells = buildMonthGrid(
      2026,
      8,
      [entry('a', '2026-09-14T09:00:00.000Z'), entry('b', '2026-09-14T15:00:00.000Z'), entry('c', '2026-09-15T09:00:00.000Z')],
      new Date(2026, 8, 18),
    );
    const day14 = cells.find((cell) => cell.key === '2026-09-14');
    const day15 = cells.find((cell) => cell.key === '2026-09-15');
    expect(day14?.entries).toHaveLength(2);
    expect(day15?.entries).toHaveLength(1);
  });

  it('does not mutate the entries input', () => {
    const input = [entry('a', '2026-09-14T09:00:00.000Z')];
    const snapshot = [...input];
    buildMonthGrid(2026, 8, input, new Date(2026, 8, 18));
    expect(input).toEqual(snapshot);
  });
});

describe('formatDueIn', () => {
  it('labels today, tomorrow, and later', () => {
    expect(formatDueIn(0)).toBe('Hari ini');
    expect(formatDueIn(1)).toBe('Besok');
    expect(formatDueIn(3)).toBe('3 hari lagi');
  });
});
