/** Pure helpers for the Admin dashboard UI (PRD §92) — framework-free for unit tests. */

export interface AdminStats {
  totalMembers: number;
  activeMembers: number;
  totalChannels: number;
  totalMessages: number;
  totalProjects: number;
  openTasks: number;
  totalTasks: number;
  storageUsedBytes: number;
  totalFiles: number;
  pendingRequests: number;
  totalWorkedMinutes: number;
  unreadNotifications: number;
}

export interface AdminDailyCount {
  date: string;
  count: number;
}

export interface AdminRecentUser {
  userId: string;
  displayName: string;
  role: string;
  joinedAt: string;
}

export interface AdminOverview {
  workspace: { id: string; name: string; mode: string; createdAt: string };
  stats: AdminStats;
  activityTrend: {
    messages: AdminDailyCount[];
    clockIns: AdminDailyCount[];
    clockOuts: AdminDailyCount[];
    requestsCreated: AdminDailyCount[];
  };
  recentMembers: AdminRecentUser[];
}

export function canViewAdmin(role: string | undefined): boolean {
  return ['OWNER', 'ADMIN'].includes(role ?? '');
}

/** "1.5 GB" / "300 MB" — human-readable storage usage. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  const digits = value >= 100 || exponent === 0 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[exponent]}`;
}

/** "128 jam 5 mnt" / "45 mnt" — human-readable worked time. */
export function formatWorkedMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0 mnt';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} mnt`;
  return rest === 0 ? `${hours} jam` : `${hours} jam ${rest} mnt`;
}

export interface StatCard {
  label: string;
  value: string;
  hint: string;
  tone: 'accent' | 'success' | 'warning' | 'danger' | 'info';
}

/** Builds the headline metric cards for the dashboard. */
export function buildStatCards(stats: AdminStats): StatCard[] {
  return [
    {
      label: 'Total Anggota',
      value: String(stats.totalMembers),
      hint: `${stats.activeMembers} aktif`,
      tone: 'accent',
    },
    {
      label: 'Pesan Terkirim',
      value: stats.totalMessages.toLocaleString('id-ID'),
      hint: `${stats.totalChannels} channel`,
      tone: 'info',
    },
    {
      label: 'Proyek & Tugas',
      value: String(stats.totalProjects),
      hint: `${stats.openTasks}/${stats.totalTasks} tugas terbuka`,
      tone: 'success',
    },
    {
      label: 'Storage Terpakai',
      value: formatBytes(stats.storageUsedBytes),
      hint: `${stats.totalFiles} file`,
      tone: 'warning',
    },
    {
      label: 'Pengajuan Pending',
      value: String(stats.pendingRequests),
      hint: 'menunggu keputusan',
      tone: stats.pendingRequests > 0 ? 'danger' : 'success',
    },
    {
      label: 'Total Jam Kerja',
      value: formatWorkedMinutes(stats.totalWorkedMinutes),
      hint: 'akumulasi presensi',
      tone: 'accent',
    },
  ];
}

/**
 * Sparkline bar heights (0..100) from daily counts — pure so the trend can be
 * unit-tested without DOM.
 */
export function sparklineHeights(counts: AdminDailyCount[]): number[] {
  const max = Math.max(1, ...counts.map((c) => c.count));
  return counts.map((c) => Math.round((c.count / max) * 100));
}

/** 7-bar total across a trend series. */
export function trendTotal(counts: AdminDailyCount[]): number {
  return counts.reduce((total, item) => total + item.count, 0);
}
