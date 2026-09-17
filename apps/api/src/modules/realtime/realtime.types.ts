/**
 * Realtime event contract (ADR-004).
 * Server → client events carry full payloads so clients can idempotently
 * apply them by id (duplicate delivery must be a no-op).
 */

export interface MessageRealtimeView {
  readonly id: string;
  readonly channelId: string;
  readonly authorId: string;
  readonly content: string;
  readonly replyToId: string | null;
  readonly editedAt: Date | null;
  readonly createdAt: Date;
  readonly attachments: {
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

export const ROOM_WORKSPACE_PREFIX = 'ws:';
export const ROOM_USER_PREFIX = 'user:';

export const workspaceRoom = (workspaceId: string): string =>
  `${ROOM_WORKSPACE_PREFIX}${workspaceId}`;

export const userRoom = (userId: string): string => `${ROOM_USER_PREFIX}${userId}`;

export const TYPING_TTL_MS = 6_000;
