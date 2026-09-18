import type { AuditLogView } from './types';

/** UI guard only — the API remains the source of truth for audit.view. */
export function canViewAudit(role: string | undefined): boolean {
  return role === 'OWNER' || role === 'ADMIN' || role === 'MANAGER';
}

/** Sorted newest-first, stable on equal timestamps by id. */
export function appendAuditPage(
  existing: AuditLogView[],
  incoming: AuditLogView[],
): AuditLogView[] {
  const byId = new Map(existing.map((log) => [log.id, log]));
  for (const log of incoming) {
    byId.set(log.id, log);
  }
  return [...byId.values()].sort((a, b) => {
    const time = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return time !== 0 ? time : b.id.localeCompare(a.id);
  });
}

export const AUDIT_RESULT_LABEL: Record<string, string> = {
  SUCCESS: 'Sukses',
  FAILURE: 'Gagal',
};

export function formatAuditTime(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
