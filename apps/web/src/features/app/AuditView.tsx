import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../state/AuthContext';
import { useWorkspace } from '../../state/WorkspaceContext';
import { api } from '../../lib/api';
import { canViewAudit } from '../../lib/audit-view';
import {
  AUDIT_RESULT_LABEL,
  appendAuditPage,
  formatAuditTime,
} from '../../lib/audit-view';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { Button } from '../../components/ui/Button';
import type { AuditLogPage, AuditLogView } from '../../lib/types';
import './AuditView.css';

const PAGE_SIZE = 50;

const ACTION_PRESETS = [
  { value: '', label: 'Semua aksi' },
  { value: 'workspace.create', label: 'workspace.create' },
  { value: 'member.role.set', label: 'member.role.set' },
  { value: 'member.remove', label: 'member.remove' },
  { value: 'message.delete', label: 'message.delete' },
  { value: 'meeting.start', label: 'meeting.start' },
  { value: 'meeting.end', label: 'meeting.end' },
  { value: 'meeting.archive', label: 'meeting.archive' },
  { value: 'project.delete', label: 'project.delete' },
  { value: 'auth.login', label: 'auth.login' },
  { value: 'user.register', label: 'user.register' },
] as const;

export function AuditView() {
  const { session } = useAuth();
  const { activeWorkspace, members } = useWorkspace();
  const token = session?.token;
  const cursorRef = useRef<string | null>(null);

  const [logs, setLogs] = useState<AuditLogView[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [action, setAction] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const myRole = members.find((member) => member.user.id === session?.user.id)?.role;
  const memberName = (userId: string | null): string => {
    if (!userId) return '—';
    if (userId === session?.user.id) return 'Kamu';
    return members.find((member) => member.user.id === userId)?.user.displayName ?? userId;
  };

  const buildQuery = useCallback(
    (nextCursor?: string | null) => {
      const params = new URLSearchParams();
      if (action) params.set('action', action);
      if (result) params.set('result', result);
      params.set('limit', String(PAGE_SIZE));
      if (nextCursor) params.set('cursor', nextCursor);
      return params.toString();
    },
    [action, result],
  );

  const fetchPage = useCallback(
    async (mode: 'replace' | 'append') => {
      if (!token || !activeWorkspace) return;
      const workspaceId = activeWorkspace.id;
      if (mode === 'replace') setLoading(true);
      else setLoadingMore(true);
      setError(null);
      try {
        const nextCursor = mode === 'append' ? cursorRef.current : null;
        const page = await api<AuditLogPage>(
          `/workspaces/${workspaceId}/audit?${buildQuery(nextCursor)}`,
          { method: 'GET', token, workspaceId },
        );
        setLogs((current) =>
          mode === 'replace' ? appendAuditPage([], page.items) : appendAuditPage(current, page.items),
        );
        setCursor(page.nextCursor);
        cursorRef.current = page.nextCursor;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Gagal memuat audit log');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [token, activeWorkspace?.id, buildQuery],
  );

  // Reset + fetch whenever filters or workspace change.
  useEffect(() => {
    setLogs([]);
    setCursor(null);
    cursorRef.current = null;
    void fetchPage('replace');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace?.id, action, result]);

  // Scroll reveal: rows fade in as a staggered wave; re-runs when the list grows
  // (including 'load more') so appended rows animate too.
  const tableRef = useScrollReveal<HTMLDivElement>([logs.length, loading], { stagger: 12 });

  if (!canViewAudit(myRole)) {
    return (
      <div className="audit">
        <div className="shell__placeholder">
          <h2>Audit log</h2>
          <p>Hanya OWNER, ADMIN, atau MANAGER yang dapat melihat audit log.</p>
        </div>
      </div>
    );
  }

  const hasActiveFilters = Boolean(action || result);

  return (
    <div className="audit">
      <header className="audit__header">
        <div>
          <h2 className="audit__title">Audit log</h2>
          <p className="audit__subtitle">{activeWorkspace?.name}</p>
        </div>
        <div className="audit__filters">
          <select
            className="audit__select"
            value={action}
            onChange={(event) => setAction(event.target.value)}
            aria-label="Filter aksi"
          >
            {ACTION_PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
          <select
            className="audit__select"
            value={result}
            onChange={(event) => setResult(event.target.value)}
            aria-label="Filter hasil"
          >
            <option value="">Semua hasil</option>
            <option value="SUCCESS">{AUDIT_RESULT_LABEL.SUCCESS}</option>
            <option value="FAILURE">{AUDIT_RESULT_LABEL.FAILURE}</option>
          </select>
          {hasActiveFilters ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setAction('');
                setResult('');
              }}
            >
              Reset
            </Button>
          ) : null}
        </div>
      </header>

      {error ? (
        <p className="audit__error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="audit__table" role="table" aria-label="Daftar audit log" ref={tableRef}>
        <div className="audit__row audit__row--head" role="row">
          <span role="columnheader">Waktu</span>
          <span role="columnheader">Aktor</span>
          <span role="columnheader">Aksi</span>
          <span role="columnheader">Target</span>
          <span role="columnheader">Hasil</span>
        </div>

        {loading ? <p className="audit__empty">Memuat audit log…</p> : null}
        {!loading && logs.length === 0 ? (
          <p className="audit__empty">
            {hasActiveFilters ? 'Tidak ada entri untuk filter ini.' : 'Belum ada aktivitas tercatat.'}
          </p>
        ) : null}

        {logs.map((entry) => {
          const expanded = expandedId === entry.id;
          return (
            <div
              key={entry.id}
              className="audit__row-wrap"
              data-reveal
              data-reveal-direction="up"
            >
              <button
                className={`audit__row${entry.result === 'FAILURE' ? ' audit__row--failure' : ''}`}
                role="row"
                onClick={() => setExpandedId(expanded ? null : entry.id)}
                aria-expanded={expanded}
                title="Klik untuk detail"
              >
                <span role="cell" className="audit__time">
                  {formatAuditTime(entry.createdAt)}
                </span>
                <span role="cell" className="audit__actor">
                  {entry.actorName ?? memberName(entry.actorId)}
                </span>
                <span role="cell" className="audit__action">
                  {entry.action}
                </span>
                <span role="cell" className="audit__target">
                  {entry.target}
                </span>
                <span role="cell">
                  <span
                    className={`audit__badge ${
                      entry.result === 'FAILURE' ? 'audit__badge--failure' : 'audit__badge--success'
                    }`}
                  >
                    {AUDIT_RESULT_LABEL[entry.result] ?? entry.result}
                  </span>
                </span>
              </button>
              {expanded ? (
                <div className="audit__detail">
                  <p>
                    <strong>Actor ID:</strong> {entry.actorId ?? '—'}
                  </p>
                  <p>
                    <strong>Target:</strong> {entry.target}
                  </p>
                  <p>
                    <strong>Metadata:</strong>
                  </p>
                  <pre className="audit__metadata">
                    {entry.metadata ? JSON.stringify(entry.metadata, null, 2) : '—'}
                  </pre>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {cursor ? (
        <div className="audit__more">
          <Button variant="ghost" loading={loadingMore} onClick={() => void fetchPage('append')}>
            Muat lebih banyak
          </Button>
        </div>
      ) : null}
    </div>
  );
}
