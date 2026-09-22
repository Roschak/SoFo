import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../../state/AuthContext';
import { useWorkspace } from '../../state/WorkspaceContext';
import { api } from '../../lib/api';
import {
  REQUEST_STATUS_CLASS,
  REQUEST_STATUS_LABEL,
  REQUEST_TYPE_LABEL,
  canCancel,
  canDecide,
  filterByStatus,
  sortRequests,
} from '../../lib/request-view';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import './RequestsView.css';

interface RequestItem {
  id: string;
  requesterId: string;
  requesterName: string | null;
  type: string;
  title: string;
  payload: unknown;
  status: string;
  approverName: string | null;
  decisionNote: string | null;
  decidedAt: string | null;
  createdAt: string;
}

const REQUEST_TYPES = ['LEAVE', 'REIMBURSEMENT', 'OPERATIONAL', 'DOCUMENT', 'PERMISSION'] as const;
const STATUS_FILTERS = ['', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as const;

export function RequestsView() {
  const { session } = useAuth();
  const { activeWorkspace, members } = useWorkspace();
  const token = session?.token;
  const userId = session?.user.id;

  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dialog, setDialog] = useState(false);
  const [type, setType] = useState<(typeof REQUEST_TYPES)[number]>('LEAVE');
  const [title, setTitle] = useState('');
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const myRole = members.find((member) => member.user.id === userId)?.role;
  const canApprove = ['OWNER', 'ADMIN', 'MANAGER'].includes(myRole ?? '');

  const fetchRequests = useCallback(async () => {
    if (!token || !activeWorkspace) return;
    const workspaceId = activeWorkspace.id;
    setLoading(true);
    setError(null);
    try {
      const page = await api<{ items: RequestItem[] }>(
        `/workspaces/${workspaceId}/requests`,
        { method: 'GET', token, workspaceId },
      );
      setRequests(page.items);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal memuat permintaan');
    } finally {
      setLoading(false);
    }
  }, [token, activeWorkspace?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setRequests([]);
    void fetchRequests();
  }, [fetchRequests]);

  const visible = useMemo(
    () => sortRequests(filterByStatus(requests, statusFilter)),
    [requests, statusFilter],
  );

  const listRef = useScrollReveal<HTMLDivElement>([visible.length], { stagger: 40 });

  async function decide(requestId: string, decision: 'approve' | 'reject') {
    setBusyId(requestId);
    setError(null);
    try {
      await api(`/workspaces/${activeWorkspace?.id}/requests/${requestId}/${decision}`, {
        method: 'POST',
        token,
        workspaceId: activeWorkspace?.id,
        body: {},
      });
      await fetchRequests();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal memutus permintaan');
    } finally {
      setBusyId(null);
    }
  }

  async function cancel(requestId: string) {
    setBusyId(requestId);
    setError(null);
    try {
      await api(`/workspaces/${activeWorkspace?.id}/requests/${requestId}`, {
        method: 'DELETE',
        token,
        workspaceId: activeWorkspace?.id,
      });
      await fetchRequests();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal membatalkan permintaan');
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setDialogError(null);
    try {
      await api(`/workspaces/${activeWorkspace?.id}/requests`, {
        method: 'POST',
        token,
        workspaceId: activeWorkspace?.id,
        body: { type, title: title.trim() },
      });
      setDialog(false);
      setTitle('');
      await fetchRequests();
    } catch (cause) {
      setDialogError(cause instanceof Error ? cause.message : 'Gagal membuat permintaan');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="requests">
      <header className="requests__header">
        <div>
          <h2 className="requests__title">Permintaan</h2>
          <p className="requests__subtitle">{activeWorkspace?.name}</p>
        </div>
        <div className="requests__controls">
          <select
            className="requests__select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter status"
          >
            {STATUS_FILTERS.map((status) => (
              <option key={status} value={status}>
                {status === '' ? 'Semua status' : REQUEST_STATUS_LABEL[status]}
              </option>
            ))}
          </select>
          <Button size="sm" onClick={() => setDialog(true)}>
            + Permintaan
          </Button>
        </div>
      </header>

      {error ? (
        <p className="requests__error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="requests__list" ref={listRef} aria-label="Daftar permintaan">
        {loading ? <p className="requests__empty">Memuat permintaan…</p> : null}
        {!loading && visible.length === 0 ? (
          <p className="requests__empty">
            {statusFilter
              ? `Tidak ada permintaan berstatus ${REQUEST_STATUS_LABEL[statusFilter] ?? statusFilter}.`
              : 'Belum ada permintaan. Buat yang pertama!'}
          </p>
        ) : null}

        {visible.map((request) => {
          const decider = canDecide(request, userId ?? '', canApprove);
          const canceller = canCancel(request, userId ?? '');
          return (
            <article key={request.id} className="requests__card" data-reveal data-reveal-direction="up">
              <div className="requests__card-head">
                <span className="requests__type">{REQUEST_TYPE_LABEL[request.type] ?? request.type}</span>
                <span className={`requests__badge ${REQUEST_STATUS_CLASS[request.status] ?? ''}`}>
                  {REQUEST_STATUS_LABEL[request.status] ?? request.status}
                </span>
              </div>
              <h3 className="requests__card-title">{request.title}</h3>
              <p className="requests__card-meta">
                Diajukan oleh <strong>{request.requesterName ?? '—'}</strong>
                {' · '}
                {new Date(request.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
              {request.decisionNote || request.approverName ? (
                <p className="requests__card-decision">
                  {request.approverName ? `Diputuskan oleh ${request.approverName}` : ''}
                  {request.approverName && request.decisionNote ? ' — ' : ''}
                  {request.decisionNote ? `“${request.decisionNote}”` : ''}
                </p>
              ) : null}
              {decider || canceller ? (
                <div className="requests__actions">
                  {decider ? (
                    <>
                      <Button
                        size="sm"
                        loading={busyId === request.id}
                        onClick={() => void decide(request.id, 'approve')}
                      >
                        ✓ Setujui
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        loading={busyId === request.id}
                        onClick={() => void decide(request.id, 'reject')}
                      >
                        ✕ Tolak
                      </Button>
                    </>
                  ) : null}
                  {canceller ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={busyId === request.id}
                      onClick={() => void cancel(request.id)}
                    >
                      Batalkan
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {dialog ? (
        <Modal title="Permintaan baru" onClose={() => setDialog(false)}>
          <form onSubmit={handleCreate}>
            <label className="field__label" htmlFor="request-type">
              Jenis
            </label>
            <select
              id="request-type"
              className="requests__select requests__select--full"
              value={type}
              onChange={(event) => setType(event.target.value as (typeof REQUEST_TYPES)[number])}
            >
              {REQUEST_TYPES.map((option) => (
                <option key={option} value={option}>
                  {REQUEST_TYPE_LABEL[option]}
                </option>
              ))}
            </select>
            <Field
              label="Judul"
              placeholder="mis. Cuti 2 hari — keluarga"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              minLength={3}
              maxLength={120}
              required
            />
            {dialogError ? <p className="requests__error">{dialogError}</p> : null}
            <Button type="submit" loading={busy} disabled={title.trim().length < 3}>
              Ajukan
            </Button>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
