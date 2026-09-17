import { SOFO_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, roleHasPermission } from './permissions';

describe('permission matrix (PRD §25, §27, §51)', () => {
  it('gives OWNER every permission', () => {
    for (const permission of SOFO_PERMISSIONS) {
      expect(roleHasPermission('OWNER', permission)).toBe(true);
    }
  });

  it('never gives ADMIN workspace.delete', () => {
    expect(roleHasPermission('ADMIN', 'workspace.delete')).toBe(false);
  });

  it('keeps CLIENT read-oriented (no delete/create/update anywhere)', () => {
    const clientPermissions = DEFAULT_ROLE_PERMISSIONS.CLIENT;
    for (const permission of clientPermissions) {
      expect(permission.endsWith('.delete')).toBe(false);
      expect(permission.endsWith('.create')).toBe(false);
      expect(permission.endsWith('.update')).toBe(false);
    }
    expect(clientPermissions).toContain('workspace.view');
    expect(clientPermissions).toContain('project.view');
  });

  it('gives GUEST the minimum set', () => {
    expect(DEFAULT_ROLE_PERMISSIONS.GUEST).toEqual(['workspace.view']);
  });

  it('always lets members view the workspace', () => {
    for (const role of Object.keys(DEFAULT_ROLE_PERMISSIONS) as (keyof typeof DEFAULT_ROLE_PERMISSIONS)[]) {
      expect(DEFAULT_ROLE_PERMISSIONS[role]).toContain('workspace.view');
    }
  });
});
