import { Injectable } from '@nestjs/common';
import { getSocketServer } from '../../infrastructure/realtime/socket-server';
import {
  MessageDeletedEvent,
  MessageRealtimeView,
  workspaceRoom,
} from './realtime.types';

/**
 * Pushes domain events to workspace rooms (ADR-004).
 * Called from CommunicationService AFTER the database commit so event order
 * follows commit order.
 */
@Injectable()
export class RealtimeBroadcaster {
  broadcastMessageCreated(workspaceId: string, message: MessageRealtimeView): void {
    this.emit(workspaceId, 'message.created', message);
  }

  broadcastMessageUpdated(workspaceId: string, message: MessageRealtimeView): void {
    this.emit(workspaceId, 'message.updated', message);
  }

  broadcastMessageDeleted(workspaceId: string, event: MessageDeletedEvent): void {
    this.emit(workspaceId, 'message.deleted', event);
  }

  private emit(workspaceId: string, event: string, payload: unknown): void {
    const server = getSocketServer();
    server?.to(workspaceRoom(workspaceId)).emit(event, payload);
  }
}
