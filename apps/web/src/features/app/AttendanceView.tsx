import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../state/AuthContext';
import { useWorkspace } from '../../state/WorkspaceContext';
import { api } from '../../lib/api';
import type { AttendanceRecord } from '../../lib/types';
import {
  canClock,
  canViewAllAttendance,
  filterAttendance,
  formatTime,
  formatWorkedTime,
  getAttendanceStatusBadge,
} from '../../lib/attendance-view';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import './AttendanceView.css';

export function AttendanceView() {
  const { session } = useAuth();
  const { activeWorkspace, members } = useWorkspace();
  const token = session?.token;
  const userId = session?.user.id;

  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const myRole = members.find((member) => member.user.id === userId)?.role;
  const isEnterprise = activeWorkspace?.mode === 'ENTERPRISE';
  const userCanClock = canClock(myRole);
  const userCanViewAll = canViewAllAttendance(myRole);

  const fetchAttendanceData = useCallback(async () => {
    if (!token || !activeWorkspace || !isEnterprise) return;
    const workspaceId = activeWorkspace.id;
    setLoading(true);
    setError(null);

    try {
      // Fetch today status
      const todayRes = await api<AttendanceRecord | null>(
        `/workspaces/${workspaceId}/attendance/today`,
        { method: 'GET', token, workspaceId },
      );
      setTodayRecord(todayRes);

      // Fetch history
      const historyRes = await api<{ items: AttendanceRecord[] }>(
        `/workspaces/${workspaceId}/attendance/history`,
        { method: 'GET', token, workspaceId },
      );
      setHistory(historyRes.items ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal memuat data presensi');
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace, isEnterprise, token]);

  useEffect(() => {
    fetchAttendanceData();
  }, [fetchAttendanceData]);

  const listRef = useScrollReveal<HTMLDivElement>([history.length, todayRecord]);

  async function handleClockIn() {
    if (!token || !activeWorkspace || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api<AttendanceRecord>(
        `/workspaces/${activeWorkspace.id}/attendance/clock-in`,
        {
          method: 'POST',
          token,
          workspaceId: activeWorkspace.id,
          body: { note: note.trim() || undefined },
        },
      );
      setTodayRecord(res);
      setNote('');
      fetchAttendanceData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal mencatat presensi masuk');
    } finally {
      setBusy(false);
    }
  }

  async function handleClockOut() {
    if (!token || !activeWorkspace || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api<AttendanceRecord>(
        `/workspaces/${activeWorkspace.id}/attendance/clock-out`,
        {
          method: 'POST',
          token,
          workspaceId: activeWorkspace.id,
        },
      );
      setTodayRecord(res);
      fetchAttendanceData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal mencatat presensi keluar');
    } finally {
      setBusy(false);
    }
  }

  const filteredHistory = useMemo(() => {
    return filterAttendance(history, { status: statusFilter, search: searchQuery });
  }, [history, statusFilter, searchQuery]);

  if (!isEnterprise) {
    return (
      <div className="attendance attendance--disabled">
        <div className="attendance__empty-box">
          <span className="attendance__empty-icon">🏢</span>
          <h3>Modul Presensi Khusus Mode Enterprise</h3>
          <p>
            Presensi dan pencatatan jam kerja karyawan hanya diaktifkan untuk workspace bertipe
            ENTERPRISE. Workspace ini bertipe COMMUNITY.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="attendance" ref={listRef}>
      <div className="attendance__header">
        <div>
          <h2 className="attendance__title">Presensi & Jam Kerja</h2>
          <p className="attendance__subtitle">
            Pencatatan kehadiran real-time terisolasi per tenant (Enterprise Mode).
          </p>
        </div>
        <Button variant="ghost" onClick={fetchAttendanceData} disabled={loading}>
          {loading ? 'Menyegarkan…' : 'Segarkan'}
        </Button>
      </div>


      {error ? <div className="attendance__error">{error}</div> : null}

      {/* Today's Punch Clock Card */}
      <div className="attendance__punch-card" data-reveal data-reveal-direction="up">
        <div className="attendance__punch-info">
          <span className="attendance__badge-enterprise">ENTERPRISE ATTENDANCE</span>
          <h3 className="attendance__today-label">
            Presensi Hari Ini — {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}
          </h3>

          {!todayRecord ? (
            <p className="attendance__status-text attendance__status-text--pending">
              Anda belum mencatat presensi masuk hari ini.
            </p>
          ) : todayRecord.clockOutAt ? (
            <p className="attendance__status-text attendance__status-text--done">
              ✔ Presensi hari ini telah selesai (Total jam kerja:{' '}
              {formatWorkedTime(todayRecord.workedMinutes)}).
            </p>
          ) : (
            <p className="attendance__status-text attendance__status-text--active">
              ● Sedang bekerja sejak {formatTime(todayRecord.clockInAt)} (
              {todayRecord.status === 'LATE'
                ? `Terlambat ${todayRecord.minutesLate} mnt`
                : 'Tepat Waktu'}
              ).
            </p>
          )}
        </div>

        {userCanClock ? (
          <div className="attendance__punch-actions">
            {!todayRecord ? (
              <div className="attendance__clock-form">
                <Field
                  label="Catatan masuk (opsional)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Contoh: WFO Kantor Pusat"
                />
                <Button variant="primary" onClick={handleClockIn} disabled={busy}>
                  {busy ? 'Mencatat…' : 'Presensi Masuk (Clock In)'}
                </Button>
              </div>
            ) : !todayRecord.clockOutAt ? (
              <Button variant="primary" onClick={handleClockOut} disabled={busy}>
                {busy ? 'Mencatat…' : 'Presensi Keluar (Clock Out)'}
              </Button>
            ) : (
              <span className="attendance__completed-pill">Presensi Lengkap</span>
            )}
          </div>
        ) : null}
      </div>

      {/* History Controls */}
      <div className="attendance__section-head" data-reveal data-reveal-direction="up">
        <h3 className="attendance__section-title">
          {userCanViewAll ? 'Riwayat Kehadiran Seluruh Anggota' : 'Riwayat Kehadiran Anda'}
        </h3>
        <div className="attendance__filters">
          <input
            type="text"
            className="attendance__search"
            placeholder="Cari nama / catatan…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            className="attendance__select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">Semua Status</option>
            <option value="ON_TIME">Tepat Waktu</option>
            <option value="LATE">Terlambat</option>
          </select>
        </div>
      </div>

      {/* History Table */}
      <div className="attendance__table-container" data-reveal data-reveal-direction="up">
        <table className="attendance__table">
          <thead>
            <tr>
              <th>Tanggal</th>
              {userCanViewAll ? <th>Nama Anggota</th> : null}
              <th>Masuk</th>
              <th>Keluar</th>
              <th>Durasi Kerja</th>
              <th>Status</th>
              <th>Catatan</th>
            </tr>
          </thead>
          <tbody>
            {filteredHistory.map((item) => {
              const badge = getAttendanceStatusBadge(item.status, item.minutesLate);
              return (
                <tr key={item.id}>
                  <td>{item.workDate}</td>
                  {userCanViewAll ? <td>{item.userName ?? item.userId}</td> : null}
                  <td>{formatTime(item.clockInAt)}</td>
                  <td>{formatTime(item.clockOutAt)}</td>
                  <td>{formatWorkedTime(item.workedMinutes)}</td>
                  <td>
                    <span className={`attendance__status-badge attendance__status-badge--${badge.variant}`}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="attendance__note-cell">{item.note ?? '-'}</td>
                </tr>
              );
            })}
            {filteredHistory.length === 0 ? (
              <tr>
                <td
                  colSpan={userCanViewAll ? 7 : 6}
                  style={{ textAlign: 'center', padding: 'var(--sofo-sp-6)' }}
                >
                  Belum ada rekaman presensi.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
