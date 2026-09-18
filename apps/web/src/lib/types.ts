import type { SofoErrorBody } from '@sofo/shared';

export interface User {
  id: string;
  email: string;
  displayName: string;
  status: string;
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  mode: 'ENTERPRISE' | 'COMMUNITY';
  description: string | null;
  ownerId: string;
}

export interface Member {
  id: string;
  user: Pick<User, 'id' | 'email' | 'displayName'>;
  role: string;
  joinedAt: string;
}

export interface Channel {
  id: string;
  name: string;
  type: 'TEXT' | 'VOICE' | 'ANNOUNCEMENT';
  visibility: 'PUBLIC' | 'PRIVATE';
  topic: string | null;
}

export type Message = import('@sofo/shared').MessageRealtimeView;

export interface MeetingParticipantView {
  userId: string;
  joinedAt: string;
}

export interface MeetingNoteView {
  id: string;
  authorId: string;
  content: string;
  createdAt?: string;
}

export interface Meeting {
  id: string;
  workspaceId: string;
  title: string;
  description: string | null;
  status: 'SCHEDULED' | 'ACTIVE' | 'ENDED' | 'ARCHIVED';
  scheduledAt: string;
  startedAt: string | null;
  endedAt: string | null;
  hostId: string;
  participants: MeetingParticipantView[];
  notes: MeetingNoteView[];
}

export const MEETING_STATUS_LABEL: Record<Meeting['status'], string> = {
  SCHEDULED: 'Terjadwal',
  ACTIVE: 'Berlangsung',
  ENDED: 'Selesai',
  ARCHIVED: 'Arsip',
};

export interface AuditLogView {
  id: string;
  workspaceId: string | null;
  actorId: string | null;
  actorName: string | null;
  action: string;
  target: string;
  result: string;
  metadata: unknown;
  createdAt: string;
}

export interface AuditLogPage {
  items: AuditLogView[];
  nextCursor: string | null;
}

export type ApiError = SofoErrorBody;

export interface AuthSession {
  user: User;
  token: string;
}

export const SESSION_STORAGE_KEY = 'sofo.session';

export function loadSession(): AuthSession | null {
  const raw = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthSession;
    return parsed.token && parsed.user ? parsed : null;
  } catch {
    return null;
  }
}

export function saveSession(session: AuthSession): void {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}
