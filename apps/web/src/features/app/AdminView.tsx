import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../state/AuthContext';
import { useWorkspace } from '../../state/WorkspaceContext';
import { api } from '../../lib/api';
import {
  buildStatCards,
  canViewAdmin,
  sparklineHeights,
  trendTotal,
  type AdminOverview,
} from '../../lib/admin-view';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import './AdminView.css';

export function AdminView() {
  const { session } = useAuth();
  const { activeWorkspace, members } = useWorkspace();
  const token = session?.token;

  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const myRole = members.find((member) => member.user.id === session?.user.id)?.role;
  const allowed = canViewAdmin(myRole);

  const loadOverview = useCallback(async () => {
    if (!token || !activeWorkspace) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api<AdminOverview>(
        `/workspaces/${activeWorkspace.id}/admin/stats?days=14`,
        { method: 'GET', token, workspaceId: activeWorkspace.id },
      );
      setOverview(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal memuat statistik');
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace, token]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const containerRef = useScrollReveal<HTMLDivElement>([overview !== null]);

  if (!allowed) {
    return (
      <div className="admin admin--disabled">
        <div className="admin__empty-box">
          <span className="admin__empty-icon">🛡️</span>
          <h3>Admin Dashboard</h3>
          <p>
            Statistik agregasi dan administrasi workspace hanya tersedia untuk peran OWNER dan
            ADMIN.
          </p>
        </div>
      </div>
    );
  }

  const cards = overview ? buildStatCards(overview.stats) : [];
  const trend = overview?.activityTrend;
  const messageBars = sparklineHeights(trend?.messages ?? []);
  const clockInBars = sparklineHeights(trend?.clockIns ?? []);
  const requestBars = sparklineHeights(trend?.requestsCreated ?? []);

  return (
    <div className="admin" ref={containerRef}>
      <header className="admin__header">
        <div>
          <h2 className="admin__title">Admin Dashboard</h2>
          <p className="admin__subtitle">
            {overview
              ? `${overview.workspace.name} — mode ${overview.workspace.mode}`
              : 'Statistik agregasi workspace'}
          </p>
        </div>
        <button className="admin__refresh" onClick={() => void loadOverview()} disabled={loading}>
          {loading ? 'Menyegarkan…' : '⟳ Segarkan'}
        </button>
      </header>

      {error ? (
        <p className="admin__error" role="alert">
          {error}
        </p>
      ) : null}

      {overview ? (
        <>
          {/* Headline metric cards — staggered scroll reveal */}
          <div className="admin__stat-grid">
            {cards.map((card, index) => (
              <div
                key={card.label}
                className={`admin__stat-card admin__stat-card--${card.tone}`}
                data-reveal
                data-reveal-direction="scale"
                style={{ transitionDelay: `${index * 60}ms` }}
              >
                <span className="admin__stat-label">{card.label}</span>
                <span className="admin__stat-value">{card.value}</span>
                <span className="admin__stat-hint">{card.hint}</span>
              </div>
            ))}
          </div>

          {/* Activity trend sparklines */}
          <section className="admin__trend-section" data-reveal data-reveal-direction="up">
            <h3 className="admin__section-title">Aktivitas 14 Hari Terakhir</h3>
            <div className="admin__trend-grid">
              <TrendCard
                title="Pesan per hari"
                total={trendTotal(trend?.messages ?? [])}
                bars={messageBars}
                tone="info"
              />
              <TrendCard
                title="Presensi masuk"
                total={trendTotal(trend?.clockIns ?? [])}
                bars={clockInBars}
                tone="success"
              />
              <TrendCard
                title="Pengajuan dibuat"
                total={trendTotal(trend?.requestsCreated ?? [])}
                bars={requestBars}
                tone="warning"
              />
            </div>
          </section>

          {/* Recent members */}
          <section className="admin__members-section" data-reveal data-reveal-direction="right">
            <h3 className="admin__section-title">Anggota Terbaru</h3>
            <ul className="admin__member-list">
              {overview.recentMembers.map((member) => (
                <li key={member.userId} className="admin__member-row">
                  <span className="admin__member-name">{member.displayName}</span>
                  <span className="admin__member-role">{member.role}</span>
                  <span className="admin__member-date">
                    {new Date(member.joinedAt).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                  </span>
                </li>
              ))}
              {overview.recentMembers.length === 0 ? (
                <li className="admin__member-row admin__member-row--empty">
                  Belum ada anggota.
                </li>
              ) : null}
            </ul>
          </section>
        </>
      ) : !loading ? (
        <p className="admin__empty">Tidak ada data untuk ditampilkan.</p>
      ) : null}
    </div>
  );
}

interface TrendCardProps {
  title: string;
  total: number;
  bars: number[];
  tone: 'info' | 'success' | 'warning';
}

function TrendCard({ title, total, bars, tone }: TrendCardProps) {
  return (
    <div className={`admin__trend-card admin__trend-card--${tone}`}>
      <div className="admin__trend-head">
        <span className="admin__trend-title">{title}</span>
        <span className="admin__trend-total">{total.toLocaleString('id-ID')}</span>
      </div>
      <div className="admin__sparkline" role="img" aria-label={`${title}: total ${total}`}>
        {bars.map((height, index) => (
          <span
            key={index}
            className="admin__sparkline-bar"
            style={{ height: `${Math.max(height, 4)}%` }}
          />
        ))}
      </div>
    </div>
  );
}
