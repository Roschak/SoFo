import { createContext, useContext, type ReactNode } from 'react';
import { useWorkspace } from './WorkspaceContext';
import { useVoiceChat } from '../hooks/useVoiceChat';

interface VoiceContextValue {
  state: ReturnType<typeof useVoiceChat>['state'];
  join: (workspaceId: string, meetingId: string, withCamera: boolean) => Promise<void>;
  leave: () => Promise<void>;
  toggleMute: () => void;
  toggleCamera: () => Promise<void>;
  getLocalStream: () => MediaStream | null;
  remoteStreamBySocket: (socketId: string) => MediaStream | null;
}

const VoiceContext = createContext<VoiceContextValue | null>(null);

/**
 * App-level voice call state. Lives above the views so an active call keeps
 * running while the user browses chat, notes, or other tabs (Discord-style).
 */
export function VoiceProvider({ children }: { children: ReactNode }) {
  const { socket } = useWorkspace();
  const voice = useVoiceChat(socket);

  return <VoiceContext.Provider value={voice}>{children}</VoiceContext.Provider>;
}

export function useVoice(): VoiceContextValue {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error('useVoice must be used within VoiceProvider');
  }
  return context;
}
