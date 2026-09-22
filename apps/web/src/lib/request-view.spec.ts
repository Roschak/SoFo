import { describe, expect, it } from 'vitest';
import {
  canCancel,
  canDecide,
  filterByStatus,
  sortRequests,
} from './request-view';

const base = {
  requesterId: 'u1',
  requesterName: 'Ana',
  approverName: null,
  decisionNote: null,
};

function item(overrides: Partial<Parameters<typeof sortRequests>[0][number]>) {
  return {
    id: 'r',
    type: 'LEAVE',
    title: 'Cuti 1 hari',
    status: 'PENDING',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...base,
    ...overrides,
  };
}

describe('sortRequests', () => {
  it('floats PENDING above decided requests', () => {
    const sorted = sortRequests([
      item({ id: 'a', status: 'APPROVED', createdAt: '2026-01-03T00:00:00.000Z' }),
      item({ id: 'b', status: 'PENDING', createdAt: '2026-01-01T00:00:00.000Z' }),
      item({ id: 'c', status: 'REJECTED', createdAt: '2026-01-02T00:00:00.000Z' }),
    ]);
    expect(sorted.map((entry) => entry.id)).toEqual(['b', 'a', 'c']);
  });

  it('sorts same-status newest first', () => {
    const sorted = sortRequests([
      item({ id: 'old', createdAt: '2026-01-01T00:00:00.000Z' }),
      item({ id: 'new', createdAt: '2026-02-01T00:00:00.000Z' }),
    ]);
    expect(sorted.map((entry) => entry.id)).toEqual(['new', 'old']);
  });
});

describe('filterByStatus', () => {
  it('returns everything when no status filter', () => {
    const items = [item({ id: 'a', status: 'APPROVED' }), item({ id: 'b' })];
    expect(filterByStatus(items, '')).toHaveLength(2);
  });

  it('keeps only matching status', () => {
    const items = [item({ id: 'a', status: 'APPROVED' }), item({ id: 'b' })];
    expect(filterByStatus(items, 'APPROVED').map((entry) => entry.id)).toEqual(['a']);
  });
});

describe('canDecide / canCancel', () => {
  it('blocks deciding your own request even with permission', () => {
    expect(
      canDecide(item({ requesterId: 'me', status: 'PENDING' }), 'me', true),
    ).toBe(false);
  });

  it('allows deciding others’ pending requests with permission', () => {
    expect(canDecide(item({ status: 'PENDING' }), 'me', true)).toBe(true);
  });

  it('blocks deciding decided requests', () => {
    expect(canDecide(item({ status: 'APPROVED' }), 'me', true)).toBe(false);
  });

  it('blocks deciding without permission', () => {
    expect(canDecide(item({ status: 'PENDING' }), 'me', false)).toBe(false);
  });

  it('cancel is requester-only and pending-only', () => {
    expect(canCancel(item({ requesterId: 'me' }), 'me')).toBe(true);
    expect(canCancel(item({ requesterId: 'other' }), 'me')).toBe(false);
    expect(canCancel(item({ requesterId: 'me', status: 'APPROVED' }), 'me')).toBe(false);
  });
});
