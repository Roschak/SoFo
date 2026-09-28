/**
 * Realtime event contract (ADR-004).
 * The single source of truth is @sofo/shared — this module re-exports it for
 * API-side imports so server and clients can never drift (PRD §66).
 */

export type {
  MessageDeletedEvent,
  MessageModerationEvent,
  MessageRealtimeView,
  NotificationEventPayload,
  NotificationView,
  PresenceUpdatedEvent,
  TypingUpdatedEvent,
  TypingPayload,
  VoiceIcePayload,
  VoiceJoinPayload,
  VoiceLeftEvent,
  VoiceParticipantsEvent,
  VoiceParticipant,
  VoiceSdpPayload,
  WorkspaceJoinPayload,
} from '@sofo/shared';

export {
  ROOM_USER_PREFIX,
  ROOM_VOICE_PREFIX,
  ROOM_WORKSPACE_PREFIX,
  TYPING_TTL_MS,
  userRoom,
  voiceRoom,
  workspaceRoom,
} from '@sofo/shared';
