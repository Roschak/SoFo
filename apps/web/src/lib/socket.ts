import { io, type Socket } from 'socket.io-client';
import type {
  MessageDeletedEvent,
  MessageModerationEvent,
  MessageRealtimeView,
  NotificationReadEvent,
  NotificationView,
  PresenceUpdatedEvent,
  TypingPayload,
  TypingUpdatedEvent,
  WorkspaceJoinPayload,
} from '@sofo/shared';
import { isNativePlatform, loadServerUrl } from './server-config';

/**
 * Socket client (ADR-004). Token goes in the handshake; the server rejects
 * invalid sessions before accepting the connection. The native shell connects
 * to the tester-configurable server URL; web builds stay same-origin.
 */
export function createSocketConnection(token: string): Socket {
  const uri = isNativePlatform() ? loadServerUrl() : '/';
  return io(uri, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 4000,
  });
}

export interface RealtimeHandlers {
  onMessageCreated: (message: MessageRealtimeView) => void;
  onMessageUpdated: (message: MessageRealtimeView) => void;
  onMessageDeleted: (event: MessageDeletedEvent) => void;
  onMessageModerated: (event: MessageModerationEvent) => void;
  onPresenceUpdated: (event: PresenceUpdatedEvent) => void;
  onTypingUpdated: (event: TypingUpdatedEvent) => void;
  onNotificationCreated: (notification: NotificationView) => void;
  onNotificationRead: (event: NotificationReadEvent) => void;
  onDisconnected: () => void;
  onReconnected: () => void;
}

export function bindRealtimeHandlers(socket: Socket, handlers: RealtimeHandlers): void {
  socket.on('message.created', handlers.onMessageCreated);
  socket.on('message.updated', handlers.onMessageUpdated);
  socket.on('message.deleted', handlers.onMessageDeleted);
  socket.on('message.moderated', handlers.onMessageModerated);
  socket.on('presence.updated', handlers.onPresenceUpdated);
  socket.on('typing.updated', handlers.onTypingUpdated);
  socket.on('notification.created', handlers.onNotificationCreated);
  socket.on('notification.read', handlers.onNotificationRead);
  socket.on('disconnect', handlers.onDisconnected);
  socket.on('reconnect', handlers.onReconnected);
}

export function joinWorkspace(socket: Socket, payload: WorkspaceJoinPayload): void {
  socket.emit('workspace.join', payload);
}

export function leaveWorkspace(socket: Socket, payload: WorkspaceJoinPayload): void {
  socket.emit('workspace.leave', payload);
}

export function emitTyping(socket: Socket, payload: TypingPayload, isTyping: boolean): void {
  socket.emit(isTyping ? 'typing.start' : 'typing.stop', payload);
}
