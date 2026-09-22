import { describe, expect, it } from 'vitest';
import {
  canModerate,
  MODERATION_STATUS_LABEL,
  queueStats,
  waitingSince,
} from './moderation-view';
import type { Message } from './types';

const make = (overrides: Partial<Message> = {}): Message => ({
  id: 'm-1',
  channelId: 'c-1',
  authorId: 'u-1',
  authorName: 'Ana',
  content: 'hello',
  replyToId: null,
  status: 'PENDING_REVIEW',
  editedAt: null,
  createdAt: '2026-09-17T10:00:00.000Z',
  attachments: [],
  ...overrides,
});

describe('moderation-view helpers', () => {
  it('queueStats counts pending items and finds the oldest', () => {
    const stats = queueStats([
      make({ id: 'm-1', createdAt: '2026-09-17T10:05:00.000Z' }),
      make({ id: 'm-2', createdAt: '2026-09-17T10:00:00.000Z' }),
      make({ id: 'm-3', createdAt: '2026-09-17T10:10:00.000Z' }),
    ]);
    expect(stats.total).toBe(3);
    expect(stats.oldestAt).toBe('2026-09-17T10:00:00.000Z');
  });

  it('queueStats is empty-safe', () => {
    expect(queueStats([])).toEqual({ total: 0, oldestAt: null });
  });

  it('canModerate mirrors the API permission matrix', () => {
    expect(canModerate('OWNER')).toBe(true);
    expect(canModerate('ADMIN')).toBe(true);
    expect(canModerate('MODERATOR')).toBe(true);
    expect(canModerate('MEMBER')).toBe(false);
    expect(canModerate('CLIENT')).toBe(false);
    expect(canModerate(undefined)).toBe(false);
  });

  it('waitingSince formats human-readable age', () => {
    const now = new Date('2026-09-17T10:30:00.000Z').getTime();
    expect(waitingSince('2026-09-17T10:30:20.000Z', now)).toBe('baru saja');
    expect(waitingSince('2026-09-17T10:15:00.000Z', now)).toBe('15 menit lalu');
    expect(waitingSince('2026-09-17T08:00:00.000Z', now)).toBe('2 jam lalu');
    expect(waitingSince('2026-09-15T10:00:00.000Z', now)).toBe('2 hari lalu');
  });

  it('status labels cover the full lifecycle', () => {
    expect(MODERATION_STATUS_LABEL.VISIBLE).toBe('Tampil');
    expect(MODERATION_STATUS_LABEL.PENDING_REVIEW).toBe('Menunggu review');
    expect(MODERATION_STATUS_LABEL.REMOVED).toBe('Dihapus');
  });
});
