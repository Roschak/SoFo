import { describe, expect, it } from 'vitest';
import {
  canManageOrganization,
  countChildren,
  flattenOrgTree,
  type OrgUnitNode,
} from './org-tree';

const units: OrgUnitNode[] = [
  { id: 'eng', name: 'Engineering', kind: 'DEPARTMENT', parentId: null },
  { id: 'fe', name: 'Frontend', kind: 'TEAM', parentId: 'eng' },
  { id: 'be', name: 'Backend', kind: 'TEAM', parentId: 'eng' },
  { id: 'ops', name: 'Operations', kind: 'DIVISION', parentId: null },
];

describe('flattenOrgTree', () => {
  it('orders depth-first and computes depth', () => {
    const flat = flattenOrgTree(units);
    expect(flat.map((item) => item.id)).toEqual(['eng', 'be', 'fe', 'ops']);
    expect(flat[0]?.depth).toBe(0);
    expect(flat[1]?.depth).toBe(1);
    expect(flat[0]?.hasChildren).toBe(true);
    expect(flat[3]?.hasChildren).toBe(false);
  });

  it('keeps orphan units instead of dropping them', () => {
    const orphaned: OrgUnitNode[] = [
      { id: 'a', name: 'A', kind: 'TEAM', parentId: 'missing' },
      { id: 'b', name: 'B', kind: 'TEAM', parentId: null },
    ];
    const flat = flattenOrgTree(orphaned);
    expect(flat.map((item) => item.id)).toEqual(['b', 'a']);
    expect(flat[1]?.depth).toBe(0);
  });

  it('survives cyclic parent references', () => {
    const cyclic: OrgUnitNode[] = [
      { id: 'x', name: 'X', kind: 'TEAM', parentId: 'y' },
      { id: 'y', name: 'Y', kind: 'TEAM', parentId: 'x' },
    ];
    const flat = flattenOrgTree(cyclic);
    expect(flat).toHaveLength(2);
  });

  it('handles an empty list', () => {
    expect(flattenOrgTree([])).toEqual([]);
  });
});

describe('countChildren', () => {
  it('counts direct children per parent', () => {
    const counts = countChildren(units);
    expect(counts.get('eng')).toBe(2);
    expect(counts.get('ops')).toBeUndefined();
  });
});

describe('canManageOrganization', () => {
  it('requires enterprise mode and a managerial role', () => {
    expect(canManageOrganization('OWNER', 'ENTERPRISE')).toBe(true);
    expect(canManageOrganization('MANAGER', 'ENTERPRISE')).toBe(true);
    expect(canManageOrganization('OWNER', 'COMMUNITY')).toBe(false);
    expect(canManageOrganization('MEMBER', 'ENTERPRISE')).toBe(false);
  });
});
