/** Pure helpers for the Organization Tree UI (PRD §28, §77) — framework-free. */

export interface OrgUnitNode {
  id: string;
  name: string;
  kind: 'DEPARTMENT' | 'DIVISION' | 'TEAM';
  parentId: string | null;
}

export interface OrgTreeItem extends OrgUnitNode {
  depth: number;
  hasChildren: boolean;
}

const KIND_ORDER: Record<OrgUnitNode['kind'], number> = {
  DEPARTMENT: 0,
  DIVISION: 1,
  TEAM: 2,
};

/**
 * Flattens a flat unit list into a depth-first ordered tree with depth info.
 * Orphans (parent missing/cyclic) are appended at the end at depth 0 so no
 * data is ever lost in the UI.
 */
export function flattenOrgTree(units: readonly OrgUnitNode[]): OrgTreeItem[] {
  const childrenOf = new Map<string | null, OrgUnitNode[]>();
  for (const unit of units) {
    const list = childrenOf.get(unit.parentId) ?? [];
    list.push(unit);
    childrenOf.set(unit.parentId, list);
  }

  const sortUnits = (a: OrgUnitNode, b: OrgUnitNode) =>
    KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.name.localeCompare(b.name);

  const output: OrgTreeItem[] = [];
  const visited = new Set<string>();

  const walk = (parentId: string | null, depth: number): void => {
    const children = (childrenOf.get(parentId) ?? []).slice().sort(sortUnits);
    for (const child of children) {
      if (visited.has(child.id)) continue; // cycle guard
      visited.add(child.id);
      output.push({ ...child, depth, hasChildren: childrenOf.has(child.id) });
      walk(child.id, depth + 1);
    }
  };

  walk(null, 0);

  // Orphans last (parent not in list or cycle participants).
  for (const unit of units) {
    if (!visited.has(unit.id)) {
      visited.add(unit.id);
      output.push({ ...unit, depth: 0, hasChildren: false });
    }
  }

  return output;
}

/** Count of direct children per unit id. */
export function countChildren(units: readonly OrgUnitNode[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const unit of units) {
    if (unit.parentId) {
      counts.set(unit.parentId, (counts.get(unit.parentId) ?? 0) + 1);
    }
  }
  return counts;
}

export function canManageOrganization(role: string | undefined, mode: string | undefined): boolean {
  return mode === 'ENTERPRISE' && ['OWNER', 'ADMIN', 'MANAGER'].includes(role ?? '');
}

export const ORG_KIND_LABELS: Record<OrgUnitNode['kind'], string> = {
  DEPARTMENT: 'Departemen',
  DIVISION: 'Divisi',
  TEAM: 'Tim',
};
