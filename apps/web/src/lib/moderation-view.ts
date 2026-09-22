import type { Message } from './types';

/**
 * Pure helpers for the community moderation queue UI (PRD §93) —
 * framework-free so they stay unit-testable.
 */

export interface ModerationStats {
  readonly total: number;
  readonly oldestAt: string | null;
}

export function queueStats(messages: readonly Message[]): ModerationStats {
  if (messages.length === 0) {
    return { total: 0, oldestAt: null };
  }
  const oldest = messages.reduce((current, message) =>
    new Date(message.createdAt).getTime() < new Date(current.createdAt).getTime()
      ? message
      : current,
  );
  return { total: messages.length, oldestAt: oldest.createdAt };
}

/** Can this viewer open the moderation queue? Mirrors the API permission gate. */
export function canModerate(role: string | undefined): boolean {
  return ['OWNER', 'ADMIN', 'MODERATOR'].includes(role ?? '');
}

export const MODERATION_STATUS_LABEL: Record<Message['status'], string> = {
  VISIBLE: 'Tampil',
  PENDING_REVIEW: 'Menunggu review',
  REMOVED: 'Dihapus',
};

/** "x minutes ago" style age for queue triage (id-ID, human readable). */
export function waitingSince(createdAt: string, now: number = Date.now()): string {
  const minutes = Math.max(0, Math.round((now - new Date(createdAt).getTime()) / 60_000));
  if (minutes < 1) return 'baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return `${Math.floor(hours / 24)} hari lalu`;
}
