import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '../../state/AuthContext';
import { useWorkspace } from '../../state/WorkspaceContext';
import { useMeetings } from '../../state/MeetingContext';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { Avatar } from '../../components/ui/Avatar';
import {
  formatMeetingTime,
  roleCanManageMeetings,
  sortMeetings,
} from '../../lib/meeting-view';
import { MEETING_STATUS_LABEL } from '../../lib/types';
import type { Meeting } from '../../lib/types';
import './MeetingsView.css';

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

      <div className="meetings__layout">
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
                  <li key={note.id} className="meetings__note">
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
