import { useEffect, useMemo, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { VoiceChat, type VoiceChatState } from '../lib/voice-chat';

/**
 * Binds a VoiceChat engine to React state. One engine per socket — memoized
 * on the socket identity so reconnects do not lose call state mid-session.
 */
export function useVoiceChat(socket: Socket | null): {
  state: VoiceChatState;
  join: (workspaceId: string, meetingId: string, withCamera: boolean) => Promise<void>;
  leave: () => Promise<void>;
  toggleMute: () => void;
  toggleCamera: () => Promise<void>;
  getLocalStream: () => MediaStream | null;
  remoteStreamBySocket: (socketId: string) => MediaStream | null;
} {
  const voiceChat = useMemo(() => (socket ? new VoiceChat(socket) : null), [socket]);
  const [, forceRender] = useState(0);

  useEffect(() => {
    if (!voiceChat) return;
    const unsubscribe = voiceChat.subscribe(() => forceRender((n) => n + 1));
    return unsubscribe;
  }, [voiceChat]);

  useEffect(() => {
    // The engine outlives the component (voice keeps running while the user
    // browses other tabs) — teardown happens explicitly via leave().
    return () => voiceChat?.setWorkspaceId('');
  }, [voiceChat]);

  if (!voiceChat) {
    const idle: VoiceChatState = {
      inCall: false,
      selfSocketId: '',
      selfMuted: false,
      selfCameraOn: false,
      micError: null,
      peers: [],
    };
    return {
      state: idle,
      join: async () => undefined,
      leave: async () => undefined,
      toggleMute: () => undefined,
      toggleCamera: async () => undefined,
      getLocalStream: () => null,
      remoteStreamBySocket: () => null,
    };
  }

  return {
    state: voiceChat.state,
    join: (workspaceId, meetingId, withCamera) => voiceChat.join(workspaceId, meetingId, withCamera),
    leave: () => voiceChat.leave(),
    toggleMute: () => voiceChat.toggleMute(),
    toggleCamera: () => voiceChat.toggleCamera(),
    getLocalStream: () => voiceChat.getLocalStream(),
    remoteStreamBySocket: (socketId: string) =>
      voiceChat.state.peers.find((peer) => peer.socketId === socketId)?.stream ?? null,
  };
}
