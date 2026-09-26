import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../../state/AuthContext';
import { useWorkspace } from '../../state/WorkspaceContext';
import { api } from '../../lib/api';
import {
  FEEDBACK_STATUS_LABEL,
  FEEDBACK_TYPE_LABEL,
  canDecideFeedback,
  sortFeedback,
} from '../../lib/feedback-view';
import type { Feedback, FeedbackStatus, FeedbackType } from '../../lib/types';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import './FeedbackView.css';

const STATUS_FILTERS = ['ALL', 'OPEN', 'REVIEWED', 'ACCEPTED', 'REJECTED'] as const;
const SUBMIT_TYPES: FeedbackType[] = ['BUG', 'UX', 'FEATURE_REQUEST'];
const DECISION_STATUSES: FeedbackStatus[] = ['REVIEWED', 'ACCEPTED', 'REJECTED'];

export function FeedbackView() {
  const { session } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const token = session?.token;
  const workspaceId = activeWorkspace?.id;

  const [items, setItems] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('ALL');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>('BUG');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [decisionStatus, setDecisionStatus] = useState<FeedbackStatus>('ACCEPTED');
  const [decisionNote, setDecisionNote] = useState('');

  const fetchFeedback = useCallback(async () => {
    if (!token || !workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const page = await api<{ items: Feedback[] }>(`/workspaces/${workspaceId}/feedback`, {
        method: 'GET',
        token,
        workspaceId,
      });
      setItems(page.items ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal memuat feedback');
    } finally {
      setLoading(false);
    }
  }, [token, workspaceId]);

  useEffect(() => {
    void fetchFeedback();
  }, [fetchFeedback]);

  const layoutRef = useScrollReveal<HTMLDivElement>(
    [items.length, loading, statusFilter],
    { stagger: 12 },
  );

  const { members } = useWorkspace();
  const myResolvedRole = members.find(
    (member) => member.user.id === session?.user.id,
  )?.role;
  const canDecide = canDecideFeedback(myResolvedRole);

  const visible = statusFilter === 'ALL' ? items : items.filter((item) => item.status === statusFilter);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setDialogError(null);
    try {
      await api(`/workspaces/${workspaceId}/feedback`, {
        method: 'POST',
        token,
        workspaceId,
        body: { type, message: message.trim() },
      });
      setDialogOpen(false);
      setMessage('');
      await fetchFeedback();
    } catch (cause) {
      setDialogError(cause instanceof Error ? cause.message : 'Gagal mengirim feedback');
    } finally {
      setBusy(false);
    }
  }

  async function handleVote(feedbackId: string) {
    try {
      await api(`/workspaces/${workspaceId}/feedback/${feedbackId}/vote`, {
        method: 'POST',
        token,
        workspaceId,
      });
      await fetchFeedback();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal vote');
    }
  }

  async function handleDecide(feedbackId: string) {
    setBusy(true);
    try {
      await api(`/workspaces/${workspaceId}/feedback/${feedbackId}/decision`, {
        method: 'POST',
        token,
        workspaceId,
        body: {
          status: decisionStatus,
          decisionNote: decisionNote.trim() || undefined,
        },
      });
      setDecidingId(null);
      setDecisionNote('');
      await fetchFeedback();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal memutuskan feedback');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="feedback">
      <header className="feedback__header">
        <div>
          <h2 className="feedback__title">Feedback</h2>
          <p className="feedback__subtitle">
            Laporkan bug, usulkan fitur — semuanya mengikuti loop PRD §98.
          </p>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          + Kirim feedback
        </Button>
      </header>

      {error ? (
        <p className="feedback__error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="feedback__filters">
        {STATUS_FILTERS.map((status) => (
          <button
            key={status}
            type="button"
            className={`feedback__filter${statusFilter === status ? ' feedback__filter--active' : ''}`}
            onClick={() => setStatusFilter(status)}
          >
            {status === 'ALL' ? 'Semua' : FEEDBACK_STATUS_LABEL[status]}
          </button>
        ))}
      </div>

      <div className="feedback__list" ref={layoutRef}>
        {loading ? <p className="feedback__empty">Memuat feedback…</p> : null}
        {!loading && visible.length === 0 ? (
          <p className="feedback__empty">Belum ada feedback pada filter ini.</p>
        ) : null}
        {sortFeedback(visible).map((item) => (
          <article key={item.id} className="feedback__card" data-reveal data-reveal-direction="up">
            <div className="feedback__card-top">
              <span className={`feedback__badge feedback__badge--${item.type}`}>
                {FEEDBACK_TYPE_LABEL[item.type]}
              </span>
              <span className={`feedback__status feedback__status--${item.status}`}>
                {FEEDBACK_STATUS_LABEL[item.status]}
              </span>
            </div>
            <p className="feedback__message">{item.message}</p>
            <div className="feedback__meta">
              <span>{item.reporterName ?? 'Anonim'}</span>
              <span>·</span>
              <span>{new Date(item.createdAt).toLocaleDateString('id-ID')}</span>
            </div>
            {item.decisionNote ? (
              <p className="feedback__decision-note">Catatan: {item.decisionNote}</p>
            ) : null}
            <div className="feedback__actions">
              <Button
                variant={item.votedByMe ? 'ghost' : 'primary'}
                size="sm"
                disabled={item.votedByMe}
                onClick={() => void handleVote(item.id)}
              >
                ▲ {item.voteCount} dukungan
              </Button>
              {canDecide && item.status === 'OPEN' ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDecidingId(item.id);
                    setDecisionStatus('ACCEPTED');
                    setDecisionNote('');
                  }}
                >
                  Putuskan
                </Button>
              ) : null}
            </div>
            {decidingId === item.id ? (
              <div className="feedback__decision">
                <div className="feedback__decision-status">
                  {DECISION_STATUSES.map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={`feedback__decision-option${
                        decisionStatus === status ? ' feedback__decision-option--active' : ''
                      }`}
                      onClick={() => setDecisionStatus(status)}
                    >
                      {FEEDBACK_STATUS_LABEL[status]}
                    </button>
                  ))}
                </div>
                <Field
                  label="Catatan keputusan (opsional)"
                  placeholder="mis. Masuk backlog sprint depan"
                  value={decisionNote}
                  onChange={(event) => setDecisionNote(event.target.value)}
                  maxLength={500}
                />
                <div className="feedback__decision-actions">
                  <Button size="sm" loading={busy} onClick={() => void handleDecide(item.id)}>
                    Simpan keputusan
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDecidingId(null)}>
                    Batal
                  </Button>
                </div>
              </div>
            ) : null}
          </article>
        ))}
      </div>

      {dialogOpen ? (
        <Modal title="Feedback baru" onClose={() => setDialogOpen(false)}>
          <form onSubmit={handleSubmit} className="feedback__form">
            <div className="feedback__types">
              {SUBMIT_TYPES.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`feedback__type${type === option ? ' feedback__type--active' : ''}`}
                  onClick={() => setType(option)}
                >
                  {FEEDBACK_TYPE_LABEL[option]}
                </button>
              ))}
            </div>
            <Field
              label="Pesan"
              placeholder="Jelaskan bug atau usulanmu (min. 8 karakter)…"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              minLength={8}
              maxLength={2000}
              required
            />
            {dialogError ? <p className="feedback__error">{dialogError}</p> : null}
            <Button type="submit" loading={busy} disabled={message.trim().length < 8}>
              Kirim feedback
            </Button>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
