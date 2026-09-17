import { Injectable } from '@nestjs/common';
import { TYPING_TTL_MS } from './realtime.types';

export interface PresenceEntry {
  readonly userId: string;
  readonly status: 'online' | 'offline';
  readonly onlineUserIds: readonly string[];
}

/**
 * Server-authoritative ephemeral state for presence and typing (ADR-004).
 * Typing entries expire via TTL so a crashed client cannot leave stale state.
 */
@Injectable()
export class RealtimeService {
  /** workspaceId → userId → socket count (multi-device aware). */
  private readonly presence = new Map<string, Map<string, number>>();
  /** `${workspaceId}:${channelId}` → userId → typing expiry timestamp. */
  private readonly typing = new Map<string, Map<string, number>>();

  addPresence(workspaceId: string, userId: string): PresenceEntry {
    const users = this.presence.get(workspaceId) ?? new Map<string, number>();
    users.set(userId, (users.get(userId) ?? 0) + 1);
    this.presence.set(workspaceId, users);
    return { userId, status: 'online', onlineUserIds: this.onlineUsers(workspaceId) };
  }

  removePresence(workspaceId: string, userId: string): PresenceEntry {
    const users = this.presence.get(workspaceId);
    if (users) {
      const sockets = (users.get(userId) ?? 0) - 1;
      if (sockets <= 0) {
        users.delete(userId);
      } else {
        users.set(userId, sockets);
      }
      if (users.size === 0) {
        this.presence.delete(workspaceId);
      }
    }
    return { userId, status: 'offline', onlineUserIds: this.onlineUsers(workspaceId) };
  }

  onlineUsers(workspaceId: string): readonly string[] {
    return [...(this.presence.get(workspaceId)?.keys() ?? [])];
  }

  setTyping(workspaceId: string, channelId: string, userId: string, isTyping: boolean): void {
    const key = `${workspaceId}:${channelId}`;
    const users = this.typing.get(key) ?? new Map<string, number>();
    if (isTyping) {
      users.set(userId, Date.now() + TYPING_TTL_MS);
    } else {
      users.delete(userId);
    }
    if (users.size === 0) {
      this.typing.delete(key);
    } else {
      this.typing.set(key, users);
    }
  }

  /** Returns typing users for a channel, pruning expired TTL entries. */
  getTypingUserIds(workspaceId: string, channelId: string): readonly string[] {
    const key = `${workspaceId}:${channelId}`;
    const users = this.typing.get(key);
    if (!users) {
      return [];
    }
    const now = Date.now();
    for (const [userId, expiry] of users) {
      if (expiry <= now) {
        users.delete(userId);
      }
    }
    if (users.size === 0) {
      this.typing.delete(key);
      return [];
    }
    return [...users.keys()];
  }
}
