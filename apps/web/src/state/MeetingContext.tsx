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
import { api } from '../lib/api';
import { canWriteNotes, mergeNotes } from '../lib/meeting-view';
import type { Meeting, MeetingNoteView } from '../lib/types';
import { useAuth } from './AuthContext';
import { useWorkspace } from './WorkspaceContext';

/**
 * Meetings + Live Notes state (PRD §34-§37). Notes refresh by polling while a
 * meeting view is open — realtime push for meetings is not part of ADR-004 yet.
 */

const NOTES_POLL_MS = 5000;

interface MeetingContextValue {
  meetings: Meeting[];
  activeMeeting: Meeting | null;
  notes: MeetingNoteView[];
  loadingMeetings: boolean;
  canManage: boolean;
  canWriteNotes: boolean;
  error: string | null;
  loadMeetings: () => Promise<void>;
  openMeeting: (meeting: Meeting | null) => void;
  createMeeting: (input: { title: string; scheduledAt: string; description?: string }) => Promise<void>;
  transition: (meetingId: string, action: 'start' | 'end' | 'archive') => Promise<void>;
  joinMeeting: (meetingId: string) => Promise<void>;
  saveNote: (meetingId: string, content: string) => Promise<void>;
  dismissError: () => void;
}

const MeetingContext = createContext<MeetingContextValue | null>(null);

export function MeetingProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const { activeWorkspace, members } = useWorkspace();
  const token = session?.token;

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [activeMeeting, setActiveMeeting] = useState<Meeting | null>(null);
  const [notes, setNotes] = useState<MeetingNoteView[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeWorkspaceIdRef = useRef<string | null>(null);
  activeWorkspaceIdRef.current = activeWorkspace?.id ?? null;

  const myRole = members.find((member) => member.user.id === session?.user.id)?.role;
  const canManage = myRole === 'OWNER' || myRole === 'ADMIN' || myRole === 'MANAGER';

  const loadMeetings = useCallback(async () => {
    if (!token || !activeWorkspace) return;
    setLoadingMeetings(true);
    try {
      const list = await api<Meeting[]>(`/workspaces/${activeWorkspace.id}/meetings`, {
        method: 'GET',
        token,
        workspaceId: activeWorkspace.id,
      });
      setMeetings(list);
      setActiveMeeting((current) =>
        current ? list.find((meeting) => meeting.id === current.id) ?? current : null,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal memuat meetings');
    } finally {
      setLoadingMeetings(false);
    }
  }, [token, activeWorkspace]);

  // Load meetings when the workspace changes; clear on leave.
  useEffect(() => {
    if (!token || !activeWorkspace) {
      setMeetings([]);
      setActiveMeeting(null);
      return;
    }
    void loadMeetings();
    return () => {
      setMeetings([]);
      setActiveMeeting(null);
      setNotes([]);
    };
  }, [token, activeWorkspace, loadMeetings]);

  const openMeeting = useCallback((meeting: Meeting | null) => {
    setActiveMeeting(meeting);
    setNotes(meeting ? [...meeting.notes] : []);
  }, []);

  const meetingId = activeMeeting?.id ?? null;

  // Live notes polling — only while a meeting view is open.
  useEffect(() => {
    if (!token || !activeWorkspace || !meetingId) return;
    let cancelled = false;
    const workspaceId = activeWorkspace.id;
    const poll = () => {
      api<MeetingNoteView[]>(`/workspaces/${workspaceId}/meetings/${meetingId}/notes`, {
        method: 'GET',
        token,
        workspaceId,
      })
        .then((fresh) => {
          if (!cancelled) setNotes((current) => mergeNotes(current, fresh));
        })
        .catch(() => undefined); // transient errors stay silent between polls
    };
    poll();
    const timer = window.setInterval(poll, NOTES_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [token, activeWorkspace, meetingId]);

  const createMeeting = useCallback(
    async (input: { title: string; scheduledAt: string; description?: string }) => {
      if (!token || !activeWorkspace) return;
      const created = await api<Meeting>(`/workspaces/${activeWorkspace.id}/meetings`, {
        method: 'POST',
        token,
        workspaceId: activeWorkspace.id,
        body: input,
      });
      setMeetings((current) => [...current, created]);
    },
    [token, activeWorkspace],
  );

  const transition = useCallback(
    async (meetingIdToTransition: string, action: 'start' | 'end' | 'archive') => {
      if (!token || !activeWorkspace) return;
      const updated = await api<Meeting>(
        `/workspaces/${activeWorkspace.id}/meetings/${meetingIdToTransition}/${action}`,
        { method: 'POST', token, workspaceId: activeWorkspace.id },
      );
      setMeetings((current) =>
        current.map((meeting) => (meeting.id === updated.id ? updated : meeting)),
      );
      setActiveMeeting((current) => (current?.id === updated.id ? updated : current));
    },
    [token, activeWorkspace],
  );

  const joinMeeting = useCallback(
    async (meetingIdToJoin: string) => {
      if (!token || !activeWorkspace) return;
      await api(`/workspaces/${activeWorkspace.id}/meetings/${meetingIdToJoin}/join`, {
        method: 'POST',
        token,
        workspaceId: activeWorkspace.id,
      });
      setMeetings((current) =>
        current.map((meeting) =>
          meeting.id === meetingIdToJoin
            ? {
                ...meeting,
                participants: [
                  ...meeting.participants,
                  { userId: session?.user.id ?? '', joinedAt: new Date().toISOString() },
                ],
              }
            : meeting,
        ),
      );
      setActiveMeeting((current) =>
        current?.id === meetingIdToJoin
          ? {
              ...current,
              participants: [
                ...current.participants,
                { userId: session?.user.id ?? '', joinedAt: new Date().toISOString() },
              ],
            }
          : current,
      );
    },
    [token, activeWorkspace, session?.user.id],
  );

  const saveNote = useCallback(
    async (meetingIdToSave: string, content: string) => {
      if (!token || !activeWorkspace) return;
      const saved = await api<MeetingNoteView>(
        `/workspaces/${activeWorkspace.id}/meetings/${meetingIdToSave}/notes`,
        { method: 'PUT', token, workspaceId: activeWorkspace.id, body: { content } },
      );
      setNotes((current) => mergeNotes(current, [saved]));
    },
    [token, activeWorkspace],
  );

  const dismissError = useCallback(() => setError(null), []);

  const value = useMemo(
    () => ({
      meetings,
      activeMeeting,
      notes,
      loadingMeetings,
      canManage,
      canWriteNotes: canWriteNotes(activeMeeting, session?.user.id),
      error,
      loadMeetings,
      openMeeting,
      createMeeting,
      transition,
      joinMeeting,
      saveNote,
      dismissError,
    }),
    [
      meetings,
      activeMeeting,
      notes,
      loadingMeetings,
      canManage,
      session?.user.id,
      error,
      loadMeetings,
      openMeeting,
      createMeeting,
      transition,
      joinMeeting,
      saveNote,
      dismissError,
    ],
  );

  return <MeetingContext.Provider value={value}>{children}</MeetingContext.Provider>;
}

export function useMeetings(): MeetingContextValue {
  const context = useContext(MeetingContext);
  if (!context) {
    throw new Error('useMeetings must be used within MeetingProvider');
  }
  return context;
}
