import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '../../state/AuthContext';
import { useWorkspace } from '../../state/WorkspaceContext';
import { useMeetings } from '../../state/MeetingContext';
import { useVoice } from '../../state/VoiceContext';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { Avatar } from '../../components/ui/Avatar';
import {
  formatMeetingTime,
  roleCanManageMeetings,
  sortMeetings,
} from '../../lib/meeting-view';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { MEETING_STATUS_LABEL } from '../../lib/types';
import type { Meeting } from '../../lib/types';
import './MeetingsView.css';

/** One remote participant tile: audio sink + state badges. */
function VoicePeerTile({
  socketId,
  displayName,
  muted,
  cameraOn,
  connectionState,
  stream,
}: {
  socketId: string;
  displayName: string;
  muted: boolean;
  cameraOn: boolean;
  connectionState: string;
  stream: MediaStream | null;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (audioRef.current && stream) {
      audioRef.current.srcObject = stream;
    }
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <li className="meetings__voice-peer" data-socket={socketId}>
      {cameraOn && stream ? (
        <video ref={videoRef} autoPlay playsInline className="meetings__voice-video" />
      ) : (
        <Avatar name={displayName} size="md" />
      )}
      <div>
        <p className="meetings__voice-name">{displayName}</p>
        <p className="meetings__voice-state">
          {connectionState === 'connected' || connectionState === 'completed'
            ? muted
              ? '🔇 mic mati'
              : '🎙️ bicara'
            : `⏳ ${connectionState}`}
          {cameraOn ? ' · 📷' : ''}
        </p>
      </div>
      <audio ref={audioRef} autoPlay playsInline className="meetings__voice-audio" />
    </li>
  );
}

function statusClass(status: Meeting['status']): string {
  if (status === 'ACTIVE') return 'meetings__badge--active';
  if (status === 'SCHEDULED') return 'meetings__badge--scheduled';
  return 'meetings__badge--ended';
}

export function MeetingsView() {
  const { session } = useAuth();
  const { members, activeWorkspace } = useWorkspace();
  const {
    meetings,
    activeMeeting,
    notes,
    loadingMeetings,
    canManage,
    canWriteNotes,
    error,
    openMeeting,
    createMeeting,
    transition,
    joinMeeting,
    saveNote,
    dismissError,
  } = useMeetings();

  const [dialog, setDialog] = useState(false);
  const [title, setTitle] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);
  const noteTimerRef = useRef<number | null>(null);
  const voice = useVoice();
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  // Live local camera preview while the camera is on.
  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = voice.getLocalStream();
    }
  }, [voice.state.selfCameraOn, voice.state.inCall]); // eslint-disable-line react-hooks/exhaustive-deps

  const myUserId = session?.user.id;
  const myRole = members.find((member) => member.user.id === myUserId)?.role;
  const manageAllowed = canManage || roleCanManageMeetings(myRole);
  const memberName = (userId: string): string =>
    members.find((member) => member.user.id === userId)?.user.displayName ?? userId;

  // Reveal existing note content when switching meeting.
  useEffect(() => {
    const mine = activeMeeting?.notes.find((note) => note.authorId === myUserId);
    setNoteDraft(mine?.content ?? '');
  }, [activeMeeting?.id, myUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Own-note optimistic refresh: when polling merges my note, keep draft in sync.
  useEffect(() => {
    if (!activeMeeting || !myUserId) return;
    const mine = notes.find((note) => note.authorId === myUserId);
    if (mine && mine.content !== noteDraft) {
      setNoteDraft(mine.content);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, activeMeeting?.id]);

  useEffect(() => {
    return () => {
      if (noteTimerRef.current) window.clearTimeout(noteTimerRef.current);
    };
  }, []);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!scheduledAt) return;
    setBusy(true);
    setDialogError(null);
    try {
      await createMeeting({
        title: title.trim(),
        scheduledAt: new Date(scheduledAt).toISOString(),
        description: description.trim() || undefined,
      });
      setDialog(false);
      setTitle('');
      setScheduledAt('');
      setDescription('');
    } catch (cause) {
      setDialogError(cause instanceof Error ? cause.message : 'Gagal membuat meeting');
    } finally {
      setBusy(false);
    }
  }

  async function handleTransition(meeting: Meeting, action: 'start' | 'end' | 'archive') {
    setBusy(true);
    try {
      await transition(meeting.id, action);
    } catch (cause) {
      dismissError();
      window.alert(cause instanceof Error ? cause.message : 'Aksi gagal'); // PRD §56 error surfacing
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin(meeting: Meeting) {
    setBusy(true);
    try {
      await joinMeeting(meeting.id);
    } catch (cause) {
      dismissError();
      window.alert(cause instanceof Error ? cause.message : 'Gagal join');
    } finally {
      setBusy(false);
    }
  }

  function handleNoteChange(content: string) {
    setNoteDraft(content);
    setNoteSaved(false);
    if (noteTimerRef.current) window.clearTimeout(noteTimerRef.current);
    noteTimerRef.current = window.setTimeout(() => {
      if (activeMeeting && content.trim()) {
        void saveNote(activeMeeting.id, content);
        setNoteSaved(true);
      }
    }, 1200);
  }

  function handleNoteBlur() {
    if (activeMeeting && noteDraft.trim()) {
      void saveNote(activeMeeting.id, noteDraft);
      setNoteSaved(true);
    }
  }

  const sorted = sortMeetings(meetings);

  // Scroll reveal: meeting cards slide up in a wave; notes panel items fade in.
  // Re-runs when the list grows or the opened meeting changes.
  const listRef = useScrollReveal<HTMLDivElement>(
    [sorted.length, activeMeeting?.id],
    { stagger: 40 },
  );

  return (
    <div className="meetings">
      <header className="meetings__header">
        <div>
          <h2 className="meetings__title">Meetings</h2>
          <p className="meetings__subtitle">{activeWorkspace?.name}</p>
        </div>
        {manageAllowed ? (
          <Button onClick={() => setDialog(true)}>+ Jadwalkan</Button>
        ) : null}
      </header>

      {error ? (
        <p className="meetings__error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="meetings__layout" ref={listRef}>
        <section className="meetings__list" aria-label="Daftar meeting">
          {loadingMeetings && meetings.length === 0 ? (
            <p className="meetings__empty">Memuat meetings…</p>
          ) : null}
          {!loadingMeetings && sorted.length === 0 ? (
            <p className="meetings__empty">
              Belum ada meeting{manageAllowed ? ' — jadwalkan yang pertama!' : '.'}
            </p>
          ) : null}
          {sorted.map((meeting) => {
            const joined = meeting.participants.some((p) => p.userId === myUserId);
            const isHost = meeting.hostId === myUserId;
            const joinable = meeting.status === 'SCHEDULED' || meeting.status === 'ACTIVE';
            return (
              <article
                key={meeting.id}
                className={`meetings__card${activeMeeting?.id === meeting.id ? ' meetings__card--open' : ''}`}
                data-reveal
                data-reveal-direction="up"
              >
                <button
                  className="meetings__card-main"
                  onClick={() => openMeeting(meeting)}
                  aria-expanded={activeMeeting?.id === meeting.id}
                >
                  <div className="meetings__card-head">
                    <h3 className="meetings__card-title">{meeting.title}</h3>
                    <span className={`meetings__badge ${statusClass(meeting.status)}`}>
                      {MEETING_STATUS_LABEL[meeting.status]}
                    </span>
                  </div>
                  <p className="meetings__when">{formatMeetingTime(meeting.scheduledAt)}</p>
                  {meeting.description ? (
                    <p className="meetings__desc">{meeting.description}</p>
                  ) : null}
                  <p className="meetings__meta">
                    Host: {memberName(meeting.hostId)} · {meeting.participants.length} peserta
                    {isHost ? ' · kamu host' : joined ? ' · kamu ikut' : ''}
                  </p>
                </button>
                <div className="meetings__card-actions">
                  {joinable && !joined && !isHost ? (
                    <Button size="sm" variant="ghost" loading={busy} onClick={() => void handleJoin(meeting)}>
                      Ikut
                    </Button>
                  ) : null}
                  {manageAllowed && meeting.status === 'SCHEDULED' ? (
                    <Button size="sm" loading={busy} onClick={() => void handleTransition(meeting, 'start')}>
                      Mulai
                    </Button>
                  ) : null}
                  {manageAllowed && meeting.status === 'ACTIVE' ? (
                    <Button size="sm" variant="danger" loading={busy} onClick={() => void handleTransition(meeting, 'end')}>
                      Akhiri
                    </Button>
                  ) : null}
                  {manageAllowed && meeting.status === 'ENDED' ? (
                    <Button size="sm" variant="ghost" loading={busy} onClick={() => void handleTransition(meeting, 'archive')}>
                      Arsipkan
                    </Button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>

        <section className="meetings__notes" aria-label="Live notes">
          {!activeMeeting ? (
            <p className="meetings__empty">Pilih meeting untuk melihat live notes.</p>
          ) : (
            <>
              <header className="meetings__notes-head">
                <h3 className="meetings__notes-title">{activeMeeting.title}</h3>
                <span className={`meetings__badge ${statusClass(activeMeeting.status)}`}>
                  {MEETING_STATUS_LABEL[activeMeeting.status]}
                </span>
              </header>

              {/* Voice chat — Discord-style in-app call (beta: mesh audio + camera). */}
              <div className="meetings__voice" aria-label="Voice chat meeting">
                {!voice.state.inCall ? (
                  <div className="meetings__voice-actions">
                    <Button
                      size="sm"
                      onClick={() =>
                        void voice.join(activeWorkspace?.id ?? '', activeMeeting.id, false)
                      }
                    >
                      🎙️ Ikut voice
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        void voice.join(activeWorkspace?.id ?? '', activeMeeting.id, true)
                      }
                    >
                      📷 Ikut dengan kamera
                    </Button>
                  </div>
                ) : (
                  <div className="meetings__voice-actions">
                    <Button
                      size="sm"
                      variant={voice.state.selfMuted ? 'danger' : 'ghost'}
                      onClick={() => voice.toggleMute()}
                    >
                      {voice.state.selfMuted ? '🔇 Mic mati' : '🎙️ Mic hidup'}
                    </Button>
                    <Button
                      size="sm"
                      variant={voice.state.selfCameraOn ? 'primary' : 'ghost'}
                      onClick={() => void voice.toggleCamera()}
                    >
                      {voice.state.selfCameraOn ? '📷 Kamera hidup' : '📷 Kamera mati'}
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => void voice.leave()}>
                      ⎋ Keluar voice
                    </Button>
                  </div>
                )}
                {voice.state.micError ? (
                  <p className="meetings__voice-error" role="alert">
                    Mic/kamera ditolak: {voice.state.micError}
                  </p>
                ) : null}
                {voice.state.selfCameraOn ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="meetings__voice-video meetings__voice-video--self"
                  />
                ) : null}
                {voice.state.peers.length > 0 ? (
                  <ul className="meetings__voice-peers">
                    {voice.state.peers.map((peer) => (
                      <VoicePeerTile
                        key={peer.socketId}
                        socketId={peer.socketId}
                        displayName={peer.displayName}
                        muted={peer.muted}
                        cameraOn={peer.cameraOn}
                        connectionState={peer.connectionState}
                        stream={peer.stream}
                      />
                    ))}
                  </ul>
                ) : voice.state.inCall ? (
                  <p className="meetings__voice-state">
                    Terhubung ke voice room — menunggu peserta lain ikut…
                  </p>
                ) : null}
              </div>
              {canWriteNotes ? (
                <>
                  <textarea
                    className="meetings__note-input"
                    placeholder="Tulis catatan… tersimpan otomatis saat berhenti mengetik."
                    value={noteDraft}
                    onChange={(event) => handleNoteChange(event.target.value)}
                    onBlur={handleNoteBlur}
                    rows={10}
                    maxLength={20000}
                  />
                  <p className="meetings__note-status" aria-live="polite">
                    {noteSaved ? 'Tersimpan ✓' : '\u00A0'}
                  </p>
                </>
              ) : (
                <p className="meetings__empty">
                  Ikut meeting dulu untuk menulis catatan.
                </p>
              )}
              <ul className="meetings__notes-list">
                {notes.map((note) => (
                  <li
                    key={note.id}
                    className="meetings__note"
                    data-reveal
                    data-reveal-direction="right"
                  >
                    <Avatar name={memberName(note.authorId)} size="sm" />
                    <div>
                      <p className="meetings__note-author">
                        {note.authorId === myUserId ? 'Kamu' : memberName(note.authorId)}
                      </p>
                      <p className="meetings__note-content">{note.content}</p>
                    </div>
                  </li>
                ))}
                {notes.length === 0 ? (
                  <li className="meetings__empty">Belum ada catatan.</li>
                ) : null}
              </ul>
            </>
          )}
        </section>
      </div>

      {dialog ? (
        <Modal title="Meeting baru" onClose={() => setDialog(false)}>
          <form onSubmit={handleCreate} className="meetings__form">
            <Field
              label="Judul"
              placeholder="mis. Sprint planning"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              minLength={2}
              maxLength={120}
              required
            />
            <Field
              label="Waktu"
              type="datetime-local"
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
              required
            />
            <Field
              label="Deskripsi (opsional)"
              placeholder="Agenda singkat…"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={2000}
            />
            {dialogError ? <p className="meetings__error">{dialogError}</p> : null}
            <Button type="submit" loading={busy} disabled={title.trim().length < 2 || !scheduledAt}>
              Jadwalkan
            </Button>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
