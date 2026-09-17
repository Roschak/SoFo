/**
 * Shared realtime event contract (ADR-004).
 * Used by the API gateway and the web client so both sides can never drift.
 */

export const ROOM_WORKSPACE_PREFIX = 'ws:';
export const ROOM_USER_PREFIX = 'user:';

export const TYPING_TTL_MS = 6_000;

export const workspaceRoom = (workspaceId: string): string =>
  `${ROOM_WORKSPACE_PREFIX}${workspaceId}`;

export const userRoom = (userId: string): string => `${ROOM_USER_PREFIX}${userId}`;

export interface MessageRealtimeView {
  readonly id: string;
  readonly channelId: string;
  readonly authorId: string;
  readonly authorName: string;
  readonly content: string;
  readonly replyToId: string | null;
  readonly editedAt: string | null;
  readonly createdAt: string;
  readonly attachments: readonly {
    readonly id: string;
    readonly fileName: string;
    readonly mimeType: string;
    readonly sizeBytes: number;
  }[];
}

export interface MessageDeletedEvent {
  readonly messageId: string;
  readonly channelId: string;
}

export interface PresenceUpdatedEvent {
  readonly workspaceId: string;
  readonly userId: string;
  readonly status: 'online' | 'offline';
  readonly onlineUserIds: readonly string[];
}

export interface TypingUpdatedEvent {
  readonly workspaceId: string;
  readonly channelId: string;
  readonly userIds: readonly string[];
}

export interface WorkspaceJoinPayload {
  readonly workspaceId: string;
}

export interface TypingPayload {
  readonly workspaceId: string;
  readonly channelId: string;
}

export const REALTIME_CLIENT_EVENTS = [
  'message.created',
  'message.updated',
  'message.deleted',
  'presence.updated',
  'typing.updated',
] as const;

export type RealtimeClientEvent = (typeof REALTIME_CLIENT_EVENTS)[number];

export const REALTIME_SERVER_EVENTS = [
  'workspace.join',
  'workspace.leave',
  'typing.start',
  'typing.stop',
] as const;

export type RealtimeServerEvent = (typeof REALTIME_SERVER_EVENTS)[number];
