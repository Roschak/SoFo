import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../../state/AuthContext';
import { useWorkspace } from '../../state/WorkspaceContext';
import { api } from '../../lib/api';
import { canViewAudit as canManageCalendar } from '../../lib/audit-view';
import {
  KIND_CLASS,
  buildMonthGrid,
  dateKey,
  formatDayLabel,
  formatDueIn,
} from '../../lib/calendar-view';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import {
  CALENDAR_KIND_LABEL,
  type CalendarEntry,
  type CalendarReminder,
} from '../../lib/types';
import './CalendarView.css';

const MONTH_LABELS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const REMINDER_HORIZON_DAYS = 7;

export function CalendarView() {
  const { session } = useAuth();
  const { activeWorkspace, members } = useWorkspace();
  const token = session?.token;

  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [reminders, setReminders] = useState<CalendarReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState(() => new Date());
  const [dialog, setDialog] = useState(false);
  const [title, setTitle] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const myRole = members.find((member) => member.user.id === session?.user.id)?.role;
  const canCreateEvent = canManageCalendar(myRole);

  const fetchCalendar = useCallback(async () => {
    if (!token || !activeWorkspace) return;
    const workspaceId = activeWorkspace.id;
    setLoading(true);
    setError(null);
    try {
      const page = await api<{ items: CalendarEntry[] }>(
        `/workspaces/${workspaceId}/calendar`,
        { method: 'GET', token, workspaceId },
      );
      setEntries(page.items);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal memuat kalender');
    } finally {
      setLoading(false);
    }
  }, [token, activeWorkspace?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchReminders = useCallback(async () => {
    if (!token || !activeWorkspace) return;
    const workspaceId = activeWorkspace.id;
    try {
      const page = await api<{ items: CalendarReminder[] }>(
        `/workspaces/${workspaceId}/calendar/reminders?horizonDays=${REMINDER_HORIZON_DAYS}`,
        { method: 'GET', token, workspaceId },
      );
      setReminders(page.items);
    } catch {
      // reminders are best-effort — main grid shows the error
    }
  }, [token, activeWorkspace?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setEntries([]);
    setReminders([]);
    void fetchCalendar();
    void fetchReminders();
  }, [fetchCalendar, fetchReminders]);

  const year = cursor.getFullYear();
  const monthIndex = cursor.getMonth();
  const cells = useMemo(() => buildMonthGrid(year, monthIndex, entries), [year, monthIndex, entries]);

  // Scroll/entrance reveal: cells pop in as a wave; side panels slide in.
  // Re-runs on month navigation and whenever data length changes.
  const layoutRef = useScrollReveal<HTMLDivElement>(
    [year, monthIndex, loading, entries.length, reminders.length],
    { stagger: 15 },
  );

  const monthEntries = useMemo(
    () =>
      entries.filter((entry) => {
        const start = new Date(entry.startAt);
        return start.getFullYear() === year && start.getMonth() === monthIndex;
      }),
    [entries, year, monthIndex],
  );

  function shiftMonth(delta: number) {
    setCursor((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setDialogError(null);
    try {
      await api(`/workspaces/${activeWorkspace?.id}/calendar/events`, {
        method: 'POST',
        token,
        workspaceId: activeWorkspace?.id,
        body: {
          title: title.trim(),
          startAt: new Date(startAt).toISOString(),
          endAt: new Date(endAt).toISOString(),
          description: description.trim() || undefined,
        },
      });
      setDialog(false);
      setTitle('');
      setStartAt('');
      setEndAt('');
      setDescription('');
      await fetchCalendar();
      await fetchReminders();
    } catch (cause) {
      setDialogError(cause instanceof Error ? cause.message : 'Gagal membuat event');
    } finally {
      setBusy(false);
    }
  }

  const todayKey = dateKey(new Date());

  return (
    <div className="calendar">
      <header className="calendar__header">
        <div>
          <h2 className="calendar__title">Kalender</h2>
          <p className="calendar__subtitle">{activeWorkspace?.name}</p>
        </div>
        <div className="calendar__controls">
          <Button variant="ghost" size="sm" onClick={() => shiftMonth(-1)} aria-label="Bulan sebelumnya">
            ←
          </Button>
          <span className="calendar__month">
            {MONTH_LABELS[monthIndex]} {year}
          </span>
          <Button variant="ghost" size="sm" onClick={() => shiftMonth(1)} aria-label="Bulan berikutnya">
            →
          </Button>
          {canCreateEvent ? (
            <Button size="sm" onClick={() => setDialog(true)}>
              + Event
            </Button>
          ) : null}
        </div>
      </header>

      {error ? (
        <p className="calendar__error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="calendar__layout" ref={layoutRef}>
        <section className="calendar__grid-wrap" aria-label="Kalender bulanan">
          <div className="calendar__weekdays">
            {WEEKDAYS.map((day) => (
              <span key={day} className="calendar__weekday">
                {day}
              </span>
            ))}
          </div>
          <div className="calendar__grid">
            {cells.map((cell) => (
              <div
                key={cell.key}
                className={`calendar__cell${cell.inMonth ? '' : ' calendar__cell--outside'}${
                  cell.key === todayKey ? ' calendar__cell--today' : ''
                }`}
                data-reveal
                data-reveal-direction="scale"
              >
                <span className="calendar__day">{cell.dayOfMonth}</span>
                <div className="calendar__entries">
                  {cell.entries.slice(0, 3).map((entry) => (
                    <span
                      key={entry.id}
                      className={`calendar__entry ${KIND_CLASS[entry.kind]}`}
                      title={`${entry.title} · ${CALENDAR_KIND_LABEL[entry.kind]} · ${formatDayLabel(entry.startAt)}`}
                    >
                      {entry.title}
                    </span>
                  ))}
                  {cell.entries.length > 3 ? (
                    <span className="calendar__more">+{cell.entries.length - 3} lagi</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          {loading ? <p className="calendar__empty">Memuat kalender…</p> : null}
          {!loading && monthEntries.length === 0 ? (
            <p className="calendar__empty">Tidak ada agenda bulan ini.</p>
          ) : null}
        </section>

        <aside className="calendar__side" aria-label="Pengingat 7 hari ke depan">
          <h3 className="calendar__side-title">Pengingat — 7 hari</h3>
          <ul className="calendar__reminders">
            {reminders.map((reminder) => (
              <li
                key={reminder.id}
                className="calendar__reminder"
                data-reveal
                data-reveal-direction="right"
              >
                <span className={`calendar__pill ${KIND_CLASS[reminder.kind]}`}>
                  {CALENDAR_KIND_LABEL[reminder.kind]}
                </span>
                <div className="calendar__reminder-body">
                  <p className="calendar__reminder-title">{reminder.title}</p>
                  <p className="calendar__reminder-when">
                    {formatDayLabel(reminder.startAt)} · {formatDueIn(reminder.dueInDays)}
                  </p>
                </div>
              </li>
            ))}
            {reminders.length === 0 ? (
              <li className="calendar__empty">Tidak ada agenda 7 hari ke depan.</li>
            ) : null}
          </ul>

          <h3 className="calendar__side-title">Agenda bulan ini — {monthEntries.length}</h3>
          <ul className="calendar__agenda">
            {monthEntries.slice(0, 12).map((entry) => (
              <li
                key={entry.id}
                className="calendar__agenda-item"
                data-reveal
                data-reveal-direction="right"
              >
                <span className={`calendar__dot ${KIND_CLASS[entry.kind]}`} />
                <div>
                  <p className="calendar__reminder-title">{entry.title}</p>
                  <p className="calendar__reminder-when">
                    {CALENDAR_KIND_LABEL[entry.kind]} · {formatDayLabel(entry.startAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      {dialog ? (
        <Modal title="Event baru" onClose={() => setDialog(false)}>
          <form onSubmit={handleCreate} className="calendar__form">
            <Field
              label="Judul"
              placeholder="mis. Workshop desain"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              minLength={2}
              maxLength={120}
              required
            />
            <Field
              label="Mulai"
              type="datetime-local"
              value={startAt}
              onChange={(event) => setStartAt(event.target.value)}
              required
            />
            <Field
              label="Selesai"
              type="datetime-local"
              value={endAt}
              onChange={(event) => setEndAt(event.target.value)}
              required
            />
            <Field
              label="Deskripsi (opsional)"
              placeholder="Detail event…"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={2000}
            />
            {dialogError ? <p className="calendar__error">{dialogError}</p> : null}
            <Button type="submit" loading={busy} disabled={title.trim().length < 2 || !startAt || !endAt}>
              Buat event
            </Button>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
