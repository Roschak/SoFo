/** Pure helpers for the Members management UI — framework-free for unit tests. */

export const ASSIGNABLE_ROLES = [
  'ADMIN',
  'MANAGER',
  'STAFF',
  'MEMBER',
  'MODERATOR',
  'CLIENT',
  'GUEST',
] as const;

export function canManageMembers(role: string | undefined): boolean {
  return ['OWNER', 'ADMIN'].includes(role ?? '');
}

/** Who may be removed: anyone but the workspace owner. */
export function canRemoveMember(
  targetRole: string,
  isOwner: boolean,
  viewerRole: string | undefined,
): boolean {
  if (isOwner) return false;
  return ['OWNER', 'ADMIN'].includes(viewerRole ?? '');
}

/** Role change rules: cannot change own role, cannot touch the owner. */
export function canChangeRole(
  targetRole: string,
  isOwner: boolean,
  viewerRole: string | undefined,
): boolean {
  if (isOwner) return false;
  return canManageMembers(viewerRole);
}

export function initialsOf(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join('') || '?';
}
