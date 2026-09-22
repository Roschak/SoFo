import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../state/AuthContext';
import { useWorkspace } from '../../state/WorkspaceContext';
import { api } from '../../lib/api';
import type { Message } from '../../lib/types';
import { canModerate, queueStats, waitingSince } from '../../lib/moderation-view';
import { Avatar } from '../../components/ui/Avatar';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import './ModerationQueueView.css';

/**
 * Community moderation queue (PRD §93): MODERATOR/ADMIN/OWNER review
 * PENDING_REVIEW posts of a COMMUNITY workspace and approve or remove them.
 * Decisions land through the same realtime lane (`message.moderated`) that
 * also updates open chat views.
 */
export function ModerationQueueView() {
  const { session } = useAuth();
  const { activeWorkspace, members } = useWorkspace();
  const token = session?.token;

  const [items, setItems] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const myRole = members.find((member) => member.user.id === session?.user.id)?.role;
  const allowed = canModerate(myRole);

  const loadQueue = useCallback(async () => {
    if (!token || !activeWorkspace) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api<{ items: Message[] }>(
        `/workspaces/${activeWorkspace.id}/moderation/queue`,
        { method: 'GET', token, workspaceId: activeWorkspace.id },
      );
      setItems(data.items ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal memuat antrean moderasi');
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace, token]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const decide = useCallback(
    async (messageId: string, action: 'approve' | 'remove') => {
      if (!token || !activeWorkspace) return;
      setBusyId(messageId);
      try {
        await api(`/workspaces/${activeWorkspace.id}/messages/${messageId}/${action}`, {
          method: 'POST',
          token,
          workspaceId: activeWorkspace.id,
        });
        setItems((current) => current.filter((message) => message.id !== messageId));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Keputusan moderasi gagal');
      } finally {
        setBusyId(null);
      }
    },
    [activeWorkspace, token],
  );

  const containerRef = useScrollReveal<HTMLDivElement>([items.length, loading]);

  if (!allowed) {
    return (
      <div className="modq modq--disabled">
        <div className="modq__empty-box">
          <span className="modq__empty-icon">🛡️</span>
          <h3>Antrean Moderasi</h3>
          <p>Hanya MODERATOR, ADMIN, dan OWNER yang dapat meninjau pesan komunitas.</p>
        </div>
      </div>
    );
  }

  const stats = queueStats(items);

  return (
    <div className="modq" ref={containerRef}>
      <header className="modq__header">
        <div>
          <h2 className="modq__title">Antrean Moderasi</h2>
          <p className="modq__subtitle">
            {activeWorkspace?.name} — {stats.total} pesan menunggu keputusan
            {stats.oldestAt ? ` · tertua ${waitingSince(stats.oldestAt)}` : ''}
          </p>
        </div>
        <button className="modq__refresh" onClick={() => void loadQueue()} disabled={loading}>
          {loading ? 'Menyegarkan…' : '⟳ Segarkan'}
        </button>
      </header>

      {error ? (
        <p className="modq__error" role="alert">
          {error}
        </p>
      ) : null}

      {loading && items.length === 0 ? (
        <p className="modq__empty">Memuat antrean…</p>
      ) : items.length === 0 ? (
        <div className="modq__empty-box" data-reveal data-reveal-direction="scale">
          <span className="modq__empty-icon">✅</span>
          <h3>Tidak ada antrean</h3>
          <p>Semua pesan komunitas sudah ditinjau. Kerja bagus!</p>
        </div>
      ) : (
        <ul className="modq__list">
          {items.map((message, index) => (
            <li
              key={message.id}
              className="modq__row"
              data-reveal
              data-reveal-direction="up"
              style={{ transitionDelay: `${Math.min(index, 8) * 60}ms` }}
            >
              <Avatar name={message.authorName} size="sm" />
              <div className="modq__body">
                <div className="modq__meta">
                  <span className="modq__author">{message.authorName}</span>
                  <span className="modq__channel">#{message.channelId.slice(0, 8)}</span>
                  <span className="modq__age">{waitingSince(message.createdAt)}</span>
                </div>
                <p className="modq__content">{message.content}</p>
                {message.replyToId ? (
                  <span className="modq__reply-tag">membalas pesan lain</span>
                ) : null}
              </div>
              <div className="modq__actions">
                <button
                  className="modq__approve"
                  disabled={busyId === message.id}
                  onClick={() => void decide(message.id, 'approve')}
                >
                  ✓ Setujui
                </button>
                <button
                  className="modq__remove"
                  disabled={busyId === message.id}
                  onClick={() => void decide(message.id, 'remove')}
                >
                  ✕ Hapus
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
