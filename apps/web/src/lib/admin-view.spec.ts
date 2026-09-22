import { describe, expect, it } from 'vitest';
import {
  buildStatCards,
  canViewAdmin,
  formatBytes,
  formatWorkedMinutes,
  sparklineHeights,
  trendTotal,
  type AdminStats,
} from './admin-view';

const baseStats: AdminStats = {
  totalMembers: 12,
  activeMembers: 9,
  totalChannels: 4,
  totalMessages: 1234,
  totalProjects: 3,
  openTasks: 5,
  totalTasks: 20,
  storageUsedBytes: 1536 * 1024 * 1024,
  totalFiles: 7,
  pendingRequests: 2,
  totalWorkedMinutes: 125,
  unreadNotifications: 4,
};

describe('canViewAdmin', () => {
  it('allows OWNER and ADMIN only', () => {
    expect(canViewAdmin('OWNER')).toBe(true);
    expect(canViewAdmin('ADMIN')).toBe(true);
    expect(canViewAdmin('MANAGER')).toBe(false);
    expect(canViewAdmin('MEMBER')).toBe(false);
    expect(canViewAdmin(undefined)).toBe(false);
  });
});

describe('formatBytes', () => {
  it('formats human-readable sizes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
    expect(formatBytes(1536 * 1024 * 1024)).toBe('1.5 GB');
  });
});

describe('formatWorkedMinutes', () => {
  it('formats minutes and hours', () => {
    expect(formatWorkedMinutes(0)).toBe('0 mnt');
    expect(formatWorkedMinutes(45)).toBe('45 mnt');
    expect(formatWorkedMinutes(120)).toBe('2 jam');
    expect(formatWorkedMinutes(125)).toBe('2 jam 5 mnt');
  });
});

describe('buildStatCards', () => {
  it('builds six cards with derived hints', () => {
    const cards = buildStatCards(baseStats);
    expect(cards).toHaveLength(6);
    expect(cards[0]).toMatchObject({ value: '12', hint: '9 aktif' });
    expect(cards[3]).toMatchObject({ value: '1.5 GB', hint: '7 file' });
    expect(cards[4]?.tone).toBe('danger'); // pending requests > 0
  });

  it('turns the pending tone green when nothing is pending', () => {
    const cards = buildStatCards({ ...baseStats, pendingRequests: 0 });
    expect(cards[4]?.tone).toBe('success');
  });
});

describe('sparklineHeights', () => {
  it('scales counts into 0..100 with zero-day floor', () => {
    const counts = [
      { date: '2026-09-15', count: 0 },
      { date: '2026-09-16', count: 5 },
      { date: '2026-09-17', count: 10 },
    ];
    expect(sparklineHeights(counts)).toEqual([0, 50, 100]);
    expect(sparklineHeights([])).toEqual([]);
  });
});

describe('trendTotal', () => {
  it('sums the series', () => {
    expect(trendTotal([{ date: 'a', count: 2 }, { date: 'b', count: 3 }])).toBe(5);
    expect(trendTotal([])).toBe(0);
  });
});
