import { describe, expect, it } from 'vitest';
import {
  FEEDBACK_STATUS_LABEL,
  FEEDBACK_TYPE_LABEL,
  canDecideFeedback,
  sortFeedback,
} from './feedback-view';
import type { Feedback } from './types';

const feedback = (overrides: Partial<Feedback> = {}): Feedback => ({
  id: 'fb-1',
  workspaceId: 'ws-1',
  reporterId: 'u-1',
  reporterName: 'Staff',
  type: 'BUG',
  message: 'Tombol rusak',
  status: 'OPEN',
  decisionNote: null,
  decidedByName: null,
  decidedAt: null,
  voteCount: 0,
  votedByMe: false,
  createdAt: '2026-09-26T08:00:00.000Z',
  ...overrides,
});

describe('feedback-view helpers (PRD §98)', () => {
  it('label tipe & status lengkap', () => {
    expect(FEEDBACK_TYPE_LABEL.BUG).toBe('Bug');
    expect(FEEDBACK_TYPE_LABEL.UX).toBe('UX');
    expect(FEEDBACK_TYPE_LABEL.FEATURE_REQUEST).toBe('Usulan fitur');
    expect(FEEDBACK_STATUS_LABEL.OPEN).toBe('Terbuka');
    expect(FEEDBACK_STATUS_LABEL.ACCEPTED).toBe('Diterima');
    expect(FEEDBACK_STATUS_LABEL.REJECTED).toBe('Ditolak');
  });

  it('hanya pemegang feedback.decide (OWNER/ADMIN) boleh memutuskan', () => {
    expect(canDecideFeedback('OWNER')).toBe(true);
    expect(canDecideFeedback('ADMIN')).toBe(true);
    expect(canDecideFeedback('MANAGER')).toBe(false);
    expect(canDecideFeedback('STAFF')).toBe(false);
    expect(canDecideFeedback('MEMBER')).toBe(false);
    expect(canDecideFeedback(undefined)).toBe(false);
  });

  it('sortFeedback: OPEN dulu, lalu vote terbanyak, lalu terbaru', () => {
    const items = [
      feedback({ id: 'a', status: 'ACCEPTED', createdAt: '2026-09-20T08:00:00.000Z', voteCount: 9 }),
      feedback({ id: 'b', status: 'OPEN', voteCount: 0, createdAt: '2026-09-25T08:00:00.000Z' }),
      feedback({ id: 'c', status: 'OPEN', voteCount: 3, createdAt: '2026-09-21T08:00:00.000Z' }),
      feedback({ id: 'd', status: 'OPEN', voteCount: 3, createdAt: '2026-09-24T08:00:00.000Z' }),
    ];
    const sorted = sortFeedback(items).map((item) => item.id);
    expect(sorted).toEqual(['d', 'c', 'b', 'a']);
  });

  it('sortFeedback tidak memutasi input', () => {
    const items = [feedback({ id: 'a', voteCount: 1 }), feedback({ id: 'b', voteCount: 5 })];
    sortFeedback(items);
    expect(items.map((item) => item.id)).toEqual(['a', 'b']);
  });
});
