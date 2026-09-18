import { describe, expect, it } from 'vitest';
import { appendAuditPage, canViewAudit } from './audit-view';
import type { AuditLogView } from './types';

const log = (overrides: Partial<AuditLogView> = {}): AuditLogView => ({
  id: 'a-1',
  workspaceId: 'ws-1',
  actorId: 'u-1',
  actorName: 'Ana',
  action: 'workspace.create',
  target: 'workspace:ws-1',
  result: 'SUCCESS',
  metadata: { name: 'Acme' },
  createdAt: '2026-09-18T08:00:00.000Z',
  ...overrides,
});

describe('canViewAudit', () => {
  it('accepts owner, admin, manager only', () => {
    expect(canViewAudit('OWNER')).toBe(true);
    expect(canViewAudit('ADMIN')).toBe(true);
    expect(canViewAudit('MANAGER')).toBe(true);
    expect(canViewAudit('STAFF')).toBe(false);
    expect(canViewAudit('CLIENT')).toBe(false);
    expect(canViewAudit(undefined)).toBe(false);
  });
});

describe('appendAuditPage', () => {
  it('unions pages without duplicates and sorts newest first', () => {
    const older = log({ id: 'a-0', createdAt: '2026-09-18T07:00:00.000Z' });
    const newer = log({ id: 'a-2', createdAt: '2026-09-18T09:00:00.000Z' });
    const merged = appendAuditPage([log()], [older, newer, log()]);
    expect(merged.map((item) => item.id)).toEqual(['a-2', 'a-1', 'a-0']);
  });

  it('lets the fetched row win when ids collide', () => {
    const merged = appendAuditPage([log({ actorName: 'stale' })], [log({ actorName: 'fresh' })]);
    expect(merged[0]?.actorName).toBe('fresh');
  });

  it('breaks ties on equal timestamps deterministically by id', () => {
    const a = log({ id: 'a', createdAt: '2026-09-18T08:00:00.000Z' });
    const b = log({ id: 'b', createdAt: '2026-09-18T08:00:00.000Z' });
    const merged = appendAuditPage([], [a, b]);
    expect(merged.map((item) => item.id)).toEqual(['b', 'a']);
  });

  it('does not mutate the input arrays', () => {
    const existing = [log()];
    const incoming = [log({ id: 'a-2' })];
    const snapshotExisting = [...existing];
    const snapshotIncoming = [...incoming];
    appendAuditPage(existing, incoming);
    expect(existing).toEqual(snapshotExisting);
    expect(incoming).toEqual(snapshotIncoming);
  });
});
