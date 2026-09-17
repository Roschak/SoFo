import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  MessageDeletedEvent,
  MessageRealtimeView,
  PresenceUpdatedEvent,
  TypingUpdatedEvent,
} from '@sofo/shared';
import { api } from '../lib/api';
import type { Channel, Member, Message, Workspace } from '../lib/types';
import {
  appendMessage,
  deleteMessage as removeMessageFromList,
  mergePage,
  updateMessage,
} from '../lib/message-store';
import {
  bindRealtimeHandlers,
  createSocketConnection,
  emitTyping,
  joinWorkspace,
  leaveWorkspace,
} from '../lib/socket';
import { useAuth } from './AuthContext';

export type ConnectionStatus = 'connecting' | 'online' | 'offline';

interface WorkspaceContextValue {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  channels: Channel[];
  activeChannel: Channel | null;
  messages: Message[];
  members: Member[];
  onlineUserIds: string[];
  typingUserIds: string[];
  connection: ConnectionStatus;
  loadingWorkspaces: boolean;
  loadingMessages: boolean;
  error: string | null;
  setActiveWorkspace: (workspace: Workspace) => void;
  setActiveChannel: (channel: Channel) => void;
  refreshWorkspaces: () => Promise<void>;
  createWorkspace: (input: { name: string; mode: 'ENTERPRISE' | 'COMMUNITY' }) => Promise<void>;
  createChannel: (input: { name: string; type: string; visibility: string }) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  notifyTyping: (isTyping: boolean) => void;
  dismissError: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const token = session?.token;

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannelState] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);
  const [connection, setConnection] = useState<ConnectionStatus>('connecting');
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<ReturnType<typeof createSocketConnection> | null>(null);
  const activeWorkspaceIdRef = useRef<string | null>(null);
  const typingTimerRef = useRef<number | null>(null);

  const refreshWorkspaces = useCallback(async () => {
    if (!token) return;
    const list = await api<Workspace[]>('/workspaces/mine', { method: 'GET', token });
    setWorkspaces(list);
    return;
  }, [token]);

  // Initial load: workspaces for the logged-in user.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoadingWorkspaces(true);
    api<Workspace[]>('/workspaces/mine', { method: 'GET', token })
      .then((list) => {
        if (!cancelled) {
          setWorkspaces(list);
          setActiveWorkspaceState((current) => current ?? list[0] ?? null);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Failed to load workspaces');
      })
      .finally(() => {
        if (!cancelled) setLoadingWorkspaces(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Realtime socket lifecycle — one socket per session.
  useEffect(() => {
    if (!token) return;
    const socket = createSocketConnection(token);
    socketRef.current = socket;

    socket.on('connect', () => setConnection('online'));
    socket.on('disconnect', () => setConnection('offline'));

    const handleJoinPresence = (event: PresenceUpdatedEvent) => {
      if (event.workspaceId === activeWorkspaceIdRef.current) {
        setOnlineUserIds([...event.onlineUserIds]);
      }
    };

    bindRealtimeHandlers(socket, {
      onMessageCreated: (message: MessageRealtimeView) => {
        if (message.channelId === activeChannelIdRef.current) {
          setMessages((current) => appendMessage(current, message));
        }
      },
      onMessageUpdated: (message: MessageRealtimeView) => {
        if (message.channelId === activeChannelIdRef.current) {
          setMessages((current) => updateMessage(current, message));
        }
      },
      onMessageDeleted: (event: MessageDeletedEvent) => {
        if (event.channelId === activeChannelIdRef.current) {
          setMessages((current) => removeMessageFromList(current, event.messageId));
        }
      },
      onPresenceUpdated: handleJoinPresence,
      onTypingUpdated: (event: TypingUpdatedEvent) => {
        if (
          event.workspaceId === activeWorkspaceIdRef.current &&
          event.channelId === activeChannelIdRef.current
        ) {
          setTypingUserIds(event.userIds.filter((userId) => userId !== session?.user.id));
        }
      },
      onDisconnected: () => setConnection('offline'),
      onReconnected: () => {
        setConnection('online');
        const workspaceId = activeWorkspaceIdRef.current;
        if (workspaceId) {
          joinWorkspace(socket, { workspaceId });
        }
      },
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, session?.user.id]);

  const activeChannelIdRef = useRef<string | null>(null);
  activeChannelIdRef.current = activeChannel?.id ?? null;
  activeWorkspaceIdRef.current = activeWorkspace?.id ?? null;

  // Load channels + members + join realtime room when the workspace changes.
  useEffect(() => {
    const socket = socketRef.current;
    if (!token || !activeWorkspace || !socket) return;
    const workspaceId = activeWorkspace.id;
    let cancelled = false;

    joinWorkspace(socket, { workspaceId });

    api<Channel[]>(`/workspaces/${workspaceId}/channels`, { method: 'GET', token, workspaceId })
      .then((list) => {
        if (!cancelled) {
          setChannels(list);
          setActiveChannelState((current) =>
            current && list.some((channel) => channel.id === current.id) ? current : list[0] ?? null,
          );
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Failed to load channels');
      });

    api<Member[]>(`/workspaces/${workspaceId}/members`, { method: 'GET', token, workspaceId })
      .then((list) => {
        if (!cancelled) setMembers(list);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      leaveWorkspace(socket, { workspaceId });
      setChannels([]);
      setActiveChannelState(null);
      setMessages([]);
      setOnlineUserIds([]);
      setTypingUserIds([]);
    };
  }, [token, activeWorkspace]);

  // Load message history when the channel changes.
  useEffect(() => {
    if (!token || !activeWorkspace || !activeChannel) return;
    const channelId = activeChannel.id;
    let cancelled = false;
    setLoadingMessages(true);
    setTypingUserIds([]);

    api<{ items: Message[] }>(
      `/workspaces/${activeWorkspace.id}/channels/${channelId}/messages`,
      { method: 'GET', token, workspaceId: activeWorkspace.id },
    )
      .then((page) => {
        if (!cancelled) setMessages((current) => mergePage(current, page.items));
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Failed to load messages');
      })
      .finally(() => {
        if (!cancelled) setLoadingMessages(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, activeWorkspace, activeChannel]);

  const setActiveWorkspace = useCallback((workspace: Workspace) => {
    setActiveWorkspaceState(workspace);
  }, []);

  const setActiveChannel = useCallback((channel: Channel) => {
    setActiveChannelState(channel);
    setMessages([]);
  }, []);

  const createWorkspace = useCallback(
    async (input: { name: string; mode: 'ENTERPRISE' | 'COMMUNITY' }) => {
      if (!token) return;
      const created = await api<Workspace>('/workspaces', { method: 'POST', token, body: input });
      setWorkspaces((current) => [...current, created]);
      setActiveWorkspaceState(created);
    },
    [token],
  );

  const createChannel = useCallback(
    async (input: { name: string; type: string; visibility: string }) => {
      if (!token || !activeWorkspace) return;
      const created = await api<Channel>(`/workspaces/${activeWorkspace.id}/channels`, {
        method: 'POST',
        token,
        workspaceId: activeWorkspace.id,
        body: input,
      });
      setChannels((current) => [...current, created]);
      setActiveChannelState(created);
    },
    [token, activeWorkspace],
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!token || !activeWorkspace || !activeChannel) return;
      await api(`/workspaces/${activeWorkspace.id}/channels/${activeChannel.id}/messages`, {
        method: 'POST',
        token,
        workspaceId: activeWorkspace.id,
        body: { content },
      });
    },
    [token, activeWorkspace, activeChannel],
  );

  const editMessage = useCallback(
    async (messageId: string, content: string) => {
      if (!token || !activeWorkspace) return;
      await api(`/workspaces/${activeWorkspace.id}/messages/${messageId}`, {
        method: 'PATCH',
        token,
        workspaceId: activeWorkspace.id,
        body: { content },
      });
    },
    [token, activeWorkspace],
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!token || !activeWorkspace) return;
      await api(`/workspaces/${activeWorkspace.id}/messages/${messageId}`, {
        method: 'DELETE',
        token,
        workspaceId: activeWorkspace.id,
      });
    },
    [token, activeWorkspace],
  );

  const notifyTyping = useCallback(
    (isTyping: boolean) => {
      const socket = socketRef.current;
      if (!socket || !activeWorkspace || !activeChannel) return;
      emitTyping(
        socket,
        { workspaceId: activeWorkspace.id, channelId: activeChannel.id },
        isTyping,
      );
      if (typingTimerRef.current) {
        window.clearTimeout(typingTimerRef.current);
      }
      if (isTyping) {
        typingTimerRef.current = window.setTimeout(() => {
          emitTyping(
            socket,
            { workspaceId: activeWorkspace.id, channelId: activeChannel.id },
            false,
          );
        }, 4000);
      }
    },
    [activeWorkspace, activeChannel],
  );

  const dismissError = useCallback(() => setError(null), []);

  const value = useMemo(
    () => ({
      workspaces,
      activeWorkspace,
      channels,
      activeChannel,
      messages,
      members,
      onlineUserIds,
      typingUserIds,
      connection,
      loadingWorkspaces,
      loadingMessages,
      error,
      setActiveWorkspace,
      setActiveChannel,
      refreshWorkspaces,
      createWorkspace,
      createChannel,
      sendMessage,
      editMessage,
      deleteMessage,
      notifyTyping,
      dismissError,
    }),
    [
      workspaces,
      activeWorkspace,
      channels,
      activeChannel,
      messages,
      members,
      onlineUserIds,
      typingUserIds,
      connection,
      loadingWorkspaces,
      loadingMessages,
      error,
      setActiveWorkspace,
      setActiveChannel,
      refreshWorkspaces,
      createWorkspace,
      createChannel,
      sendMessage,
      editMessage,
      deleteMessage,
      notifyTyping,
      dismissError,
    ],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return context;
}
