import type { Feedback, FeedbackStatus, FeedbackType } from './types';

/** Label tipe feedback (PRD §98). */
export const FEEDBACK_TYPE_LABEL: Record<FeedbackType, string> = {
  BUG: 'Bug',
  UX: 'UX',
  FEATURE_REQUEST: 'Usulan fitur',
};

/** Label status triage. */
export const FEEDBACK_STATUS_LABEL: Record<FeedbackStatus, string> = {
  OPEN: 'Terbuka',
  REVIEWED: 'Ditinjau',
  ACCEPTED: 'Diterima',
  REJECTED: 'Ditolak',
};

/**
 * Hanya pemegang permission `feedback.decide` boleh memutuskan.
 * Default seed: OWNER & ADMIN (sinkron dengan packages/shared permissions).
 */
export function canDecideFeedback(role: string | undefined): boolean {
  return role === 'OWNER' || role === 'ADMIN';
}

/**
 * Urutan tampil: OPEN dulu (butuh triage), lalu vote terbanyak,
 * lalu yang terbaru. Pure — input tidak dimutasi.
 */
export function sortFeedback(items: readonly Feedback[]): Feedback[] {
  return [...items].sort((a, b) => {
    if ((a.status === 'OPEN') !== (b.status === 'OPEN')) {
      return a.status === 'OPEN' ? -1 : 1;
    }
    if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
    return b.createdAt.localeCompare(a.createdAt);
  });
}
