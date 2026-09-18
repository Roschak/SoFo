import type { Meeting, MeetingNoteView } from './types';

const STATUS_ORDER: Record<Meeting['status'], number> = {
  ACTIVE: 0,
  SCHEDULED: 1,
  ENDED: 2,
  ARCHIVED: 3,
};

/**
 * Display order: running meetings first, then scheduled (soonest first),
 * then ended/archived (most recent first). Pure — no mutation.
 */
export function sortMeetings(meetings: Meeting[]): Meeting[] {
  return [...meetings].sort((a, b) => {
    const byStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (byStatus !== 0) return byStatus;
    const time =
      new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
    return a.status === 'SCHEDULED' ? time : -time;
  });
}

/** Merge fetched notes into existing ones: same id → incoming wins, new id → appended. */
export function mergeNotes(
  existing: MeetingNoteView[],
  incoming: MeetingNoteView[],
): MeetingNoteView[] {
  const byId = new Map(existing.map((note) => [note.id, note]));
  for (const note of incoming) {
    byId.set(note.id, note);
  }
  return [...byId.values()];
}

/** Hosts and joined participants may write live notes (mirrors API rule). */
export function canWriteNotes(meeting: Meeting | null, myUserId: string | undefined): boolean {
  if (!meeting || !myUserId) return false;
  return (
    meeting.hostId === myUserId ||
    meeting.participants.some((participant) => participant.userId === myUserId)
  );
}

/** UI guard only — the API remains the source of truth for meeting.manage. */
export function roleCanManageMeetings(role: string | undefined): boolean {
  return role === 'OWNER' || role === 'ADMIN' || role === 'MANAGER';
}

export function formatMeetingTime(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
