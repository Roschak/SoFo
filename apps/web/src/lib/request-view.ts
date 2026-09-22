/** Pure helpers for the Requests UI — kept framework-free for unit tests. */

export const REQUEST_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Menunggu',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
  CANCELLED: 'Dibatalkan',
};

export const REQUEST_TYPE_LABEL: Record<string, string> = {
  LEAVE: 'Cuti',
  REIMBURSEMENT: 'Reimbursement',
  OPERATIONAL: 'Operasional',
  DOCUMENT: 'Dokumen',
  PERMISSION: 'Izin',
};

export const REQUEST_STATUS_CLASS: Record<string, string> = {
  PENDING: 'requests__badge--pending',
  APPROVED: 'requests__badge--approved',
  REJECTED: 'requests__badge--rejected',
  CANCELLED: 'requests__badge--cancelled',
};

export interface RequestListItem {
  id: string;
  type: string;
  title: string;
  status: string;
  requesterId: string;
  requesterName: string | null;
  approverName: string | null;
  decisionNote: string | null;
  createdAt: string;
}

/** Newest first, PENDING floats above the rest. */
export function sortRequests<T extends RequestListItem>(items: readonly T[]): T[] {
  const weight = (status: string): number => (status === 'PENDING' ? 0 : 1);
  return [...items].sort((a, b) => {
    const byStatus = weight(a.status) - weight(b.status);
    if (byStatus !== 0) return byStatus;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function filterByStatus<T extends RequestListItem>(
  items: readonly T[],
  status: string,
): T[] {
  if (!status) return [...items];
  return items.filter((item) => item.status === status);
}

/** Who can act on this request: approver role + not own + still pending. */
export function canDecide(
  request: RequestListItem,
  viewerId: string,
  canApprove: boolean,
): boolean {
  return canApprove && request.status === 'PENDING' && request.requesterId !== viewerId;
}

/** Only the requester, only while pending. */
export function canCancel(request: RequestListItem, viewerId: string): boolean {
  return request.status === 'PENDING' && request.requesterId === viewerId;
}
