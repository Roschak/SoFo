import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthenticationService } from '../authentication/authentication.service';
import { AuthorizationService } from '../authorization/authorization.service';
import {
  PresenceUpdatedEvent,
  TypingPayload,
  TypingUpdatedEvent,
  WorkspaceJoinPayload,
  workspaceRoom,
} from './realtime.types';
import { RealtimeService } from './realtime.service';
import { setSocketServer } from '../../infrastructure/realtime/socket-server';

interface AuthenticatedSocket extends Socket {
  data: { userId: string };
}

/**
 * Realtime gateway (ADR-004).
 * Handshake requires a valid session token; room joins are server-side only
 * and always gated by a workspace permission check (PRD §19, §113).
 */
@WebSocketGateway({ cors: { origin: '*', credentials: true } })
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  /** socketId → workspaceIds, because socket.io clears rooms before disconnect fires. */
  private readonly joinedWorkspaces = new Map<string, Set<string>>();

  constructor(
    private readonly authenticationService: AuthenticationService,
    private readonly authorizationService: AuthorizationService,
    private readonly realtimeService: RealtimeService,
  ) {}

  afterInit(): void {
    // Handshake middleware: the session is validated BEFORE the connection is
    // accepted, so no event can race ahead of authentication (PRD §33).
    this.server.use((client, next) => {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) {
        next(new Error('UNAUTHENTICATED: missing token'));
        return;
      }
      this.authenticationService
        .validateSession(token)
        .then((user) => {
          client.data = { userId: user.id };
          next();
        })
        .catch(() => {
          next(new Error('UNAUTHENTICATED: session is invalid or expired'));
        });
    });
    setSocketServer(this.server);
    this.logger.log('Realtime gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    if (!client.data?.userId) {
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: AuthenticatedSocket): Promise<void> {
    const userId = client.data?.userId;
    const workspaces = this.joinedWorkspaces.get(client.id);
    this.joinedWorkspaces.delete(client.id);
    if (!userId || !workspaces) {
      return;
    }
    for (const workspaceId of workspaces) {
      await this.broadcastPresence(workspaceId, userId, 'offline');
    }
  }

  @SubscribeMessage('workspace.join')
  async handleWorkspaceJoin(client: AuthenticatedSocket, payload: WorkspaceJoinPayload) {
    const userId = client.data.userId;
    const membership = await this.authorizationService.getMembership(userId, payload.workspaceId);
    if (!membership) {
      return { code: 'FORBIDDEN', message: 'Access denied' };
    }
    // Idempotent join (PRD §33: duplicate event handling) — a repeated join
    // from the same socket must not double-count presence.
    if (this.joinedWorkspaces.get(client.id)?.has(payload.workspaceId)) {
      return { code: 'OK', onlineUserIds: this.realtimeService.onlineUsers(payload.workspaceId) };
    }
    await client.join(workspaceRoom(payload.workspaceId));
    this.trackJoin(client.id, payload.workspaceId);
    const presence = this.realtimeService.addPresence(payload.workspaceId, userId);
    const event: PresenceUpdatedEvent = {
      workspaceId: payload.workspaceId,
      ...presence,
    };
    this.server.to(workspaceRoom(payload.workspaceId)).emit('presence.updated', event);
    return { code: 'OK', onlineUserIds: presence.onlineUserIds };
  }

  @SubscribeMessage('workspace.leave')
  async handleWorkspaceLeave(client: AuthenticatedSocket, payload: WorkspaceJoinPayload) {
    const userId = client.data.userId;
    if (!this.joinedWorkspaces.get(client.id)?.has(payload.workspaceId)) {
      return { code: 'OK' };
    }
    await client.leave(workspaceRoom(payload.workspaceId));
    this.trackLeave(client.id, payload.workspaceId);
    const presence = this.realtimeService.removePresence(payload.workspaceId, userId);
    const event: PresenceUpdatedEvent = {
      workspaceId: payload.workspaceId,
      ...presence,
    };
    this.server.to(workspaceRoom(payload.workspaceId)).emit('presence.updated', event);
    return { code: 'OK' };
  }

  @SubscribeMessage('typing.start')
  async handleTypingStart(client: AuthenticatedSocket, payload: TypingPayload) {
    return this.handleTyping(client, payload, true);
  }

  @SubscribeMessage('typing.stop')
  async handleTypingStop(client: AuthenticatedSocket, payload: TypingPayload) {
    return this.handleTyping(client, payload, false);
  }

  private async handleTyping(
    client: AuthenticatedSocket,
    payload: TypingPayload,
    isTyping: boolean,
  ) {
    const userId = client.data.userId;
    await this.authorizationService.assertPermission(
      userId,
      payload.workspaceId,
      'message.send',
    );

    this.realtimeService.setTyping(payload.workspaceId, payload.channelId, userId, isTyping);
    const event: TypingUpdatedEvent = {
      workspaceId: payload.workspaceId,
      channelId: payload.channelId,
      userIds: this.realtimeService.getTypingUserIds(payload.workspaceId, payload.channelId),
    };
    this.server.to(workspaceRoom(payload.workspaceId)).emit('typing.updated', event);
    return { code: 'OK' };
  }

  private trackJoin(socketId: string, workspaceId: string): void {
    const joined = this.joinedWorkspaces.get(socketId) ?? new Set<string>();
    joined.add(workspaceId);
    this.joinedWorkspaces.set(socketId, joined);
  }

  private trackLeave(socketId: string, workspaceId: string): void {
    const joined = this.joinedWorkspaces.get(socketId);
    if (joined) {
      joined.delete(workspaceId);
      if (joined.size === 0) {
        this.joinedWorkspaces.delete(socketId);
      }
    }
  }

  private async broadcastPresence(
    workspaceId: string,
    userId: string,
    status: 'online' | 'offline',
  ): Promise<void> {
    const presence =
      status === 'offline'
        ? this.realtimeService.removePresence(workspaceId, userId)
        : this.realtimeService.addPresence(workspaceId, userId);
    const event: PresenceUpdatedEvent = { workspaceId, ...presence };
    this.server.to(workspaceRoom(workspaceId)).emit('presence.updated', event);
  }
}
