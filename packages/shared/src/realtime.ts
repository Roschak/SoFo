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

export const ROOM_VOICE_PREFIX = 'voice:';

/** Per-meeting voice call room (WebRTC signaling scope). */
export const voiceRoom = (meetingId: string): string => `${ROOM_VOICE_PREFIX}${meetingId}`;

export interface MessageRealtimeView {
  readonly id: string;
  readonly channelId: string;
  readonly authorId: string;
  readonly authorName: string;
  readonly content: string;
  readonly replyToId: string | null;
  /** Moderation lifecycle (PRD §93): VISIBLE | PENDING_REVIEW | REMOVED. */
  readonly status: 'VISIBLE' | 'PENDING_REVIEW' | 'REMOVED';
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

/** Fired after a moderator decision (PRD §93). */
export interface MessageModerationEvent {
  readonly messageId: string;
  readonly channelId: string;
  readonly status: 'VISIBLE' | 'REMOVED';
  readonly moderatedById: string;
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

/* ------------------------------------------------------------------ */
/* Voice chat (WebRTC signaling) — Discord-style in-app meeting calls  */
/* ------------------------------------------------------------------ */

/** One participant of an active in-meeting voice call. */
export interface VoiceParticipant {
  /** Signaling socket id — the peer connection target. */
  readonly socketId: string;
  readonly userId: string;
  readonly displayName: string;
  readonly muted: boolean;
  /** Camera on when present (audio-only participants have it false). */
  readonly cameraOn: boolean;
}

export interface VoiceJoinPayload {
  readonly workspaceId: string;
  readonly meetingId: string;
}

/** Broadcast when the participant list or mute/camera states change. */
export interface VoiceParticipantsEvent {
  readonly workspaceId: string;
  readonly meetingId: string;
  readonly participants: readonly VoiceParticipant[];
}

/** SDP offer/answer relay — directed at one peer, relayed by the server. */
export interface VoiceSdpPayload {
  readonly workspaceId: string;
  readonly meetingId: string;
  readonly targetSocketId: string;
  readonly sdp: string;
  readonly type: 'offer' | 'answer';
}

/** ICE candidate relay. */
export interface VoiceIcePayload {
  readonly workspaceId: string;
  readonly meetingId: string;
  readonly targetSocketId: string;
  readonly candidate: string;
  readonly sdpMid: string | null;
  readonly sdpMLineIndex: number | null;
}

/** A peer left the voice call (graceful leave or abrupt disconnect). */
export interface VoiceLeftEvent {
  readonly workspaceId: string;
  readonly meetingId: string;
  readonly socketId: string;
  readonly userId: string;
}

export const VOICE_SERVER_EVENTS = [
  'voice.join',
  'voice.leave',
  'voice.mute',
  'voice.camera',
  'voice.sdp',
  'voice.ice',
] as const;

export const VOICE_CLIENT_EVENTS = [
  'voice.participants',
  'voice.sdp',
  'voice.ice',
  'voice.left',
] as const;

export const REALTIME_CLIENT_EVENTS = [
  'message.created',
  'message.updated',
  'message.deleted',
  'message.moderated',
  'presence.updated',
  'typing.updated',
  'notification.created',
  'notification.read',
] as const;

export type NotificationType =
  | 'request.created'
  | 'request.approved'
  | 'request.rejected'
  | 'member.invited'
  | 'task.assigned'
  | 'message.pending'
  | 'feedback.submitted'
  | 'feedback.decided';

export interface NotificationView {
  readonly id: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly actorId: string | null;
  readonly actorName: string | null;
  readonly type: NotificationType;
  readonly title: string;
  readonly body: string | null;
  readonly refType: string | null;
  readonly refId: string | null;
  readonly status: 'UNREAD' | 'READ';
  readonly createdAt: string;
}

export interface NotificationEventPayload {
  readonly workspaceId: string;
  readonly actorId: string;
  readonly recipientIds: readonly string[];
  readonly type: NotificationType;
  readonly title: string;
  readonly body?: string;
  readonly refType?: string;
  readonly refId?: string;
}

export interface NotificationReadEvent {
  readonly notificationId: string;
  readonly readAt: string;
}

export type RealtimeClientEvent = (typeof REALTIME_CLIENT_EVENTS)[number];

export const REALTIME_SERVER_EVENTS = [
  'workspace.join',
  'workspace.leave',
  'typing.start',
  'typing.stop',
] as const;

export type RealtimeServerEvent = (typeof REALTIME_SERVER_EVENTS)[number];
