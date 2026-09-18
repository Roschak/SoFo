/**
 * SOFO permission catalog and default role matrix (PRD §25, §27, §57).
 * Roles are labels; permissions are the real security mechanism.
 * This matrix is the DEFAULT seed — workspaces may create custom roles later.
 */

export const SOFO_PERMISSIONS = [
  // workspace
  'workspace.view',
  'workspace.update',
  'workspace.delete',
  'workspace.settings.manage',
  // membership
  'member.view',
  'member.invite',
  'member.remove',
  'member.role.set',
  // organization
  'organization.manage',
  // channel
  'channel.view',
  'channel.create',
  'channel.update',
  'channel.delete',
  // message
  'message.send',
  'message.edit',
  'message.delete',
  // file
  'file.upload',
  'file.download',
  'file.delete',
  // meeting
  'meeting.create',
  'meeting.join',
  'meeting.manage',
  // project
  'project.view',
  'project.create',
  'project.update',
  'project.delete',
  // task
  'task.view',
  'task.create',
  'task.update',
  'task.assign',
  'task.delete',
  // request & approval
  'request.create',
  'request.approve',
  // audit (PRD §49)
  'audit.view',
  // calendar (PRD §41, §86)
  'calendar.event.create',
] as const;

export type SofoPermission = (typeof SOFO_PERMISSIONS)[number];

export const SOFO_ROLES = [
  'OWNER',
  'ADMIN',
  'MANAGER',
  'STAFF',
  'MEMBER',
  'MODERATOR',
  'CLIENT',
  'GUEST',
] as const;

export type SofoRole = (typeof SOFO_ROLES)[number];

/** Client access is strictly read-oriented (PRD §51). */
const CLIENT_PERMISSIONS: readonly SofoPermission[] = [
  'workspace.view',
  'channel.view',
  'message.send',
  'file.download',
  'meeting.join',
  'project.view',
  'task.view',
];

export const DEFAULT_ROLE_PERMISSIONS: Readonly<Record<SofoRole, readonly SofoPermission[]>> = {
  OWNER: SOFO_PERMISSIONS,
  ADMIN: SOFO_PERMISSIONS.filter((permission) => permission !== 'workspace.delete'),
  MANAGER: [
    'workspace.view',
    'member.view',
    'member.invite',
    'channel.view',
    'channel.create',
    'channel.update',
    'message.send',
    'message.edit',
    'message.delete',
    'file.upload',
    'file.download',
    'meeting.create',
    'meeting.join',
    'meeting.manage',
    'project.view',
    'project.create',
    'project.update',
    'project.delete',
    'task.create',
    'task.update',
    'task.assign',
    'task.delete',
    'request.approve',
    'audit.view',
    'calendar.event.create',
  ],
  STAFF: [
    'workspace.view',
    'member.view',
    'channel.view',
    'message.send',
    'message.edit',
    'file.upload',
    'file.download',
    'meeting.join',
    'project.view',
    'task.view',
    'task.create',
    'task.update',
    'request.create',
  ],
  MEMBER: [
    'workspace.view',
    'channel.view',
    'message.send',
    'message.edit',
    'file.upload',
    'file.download',
    'meeting.join',
    'project.view',
    'task.view',
    'task.update',
    'request.create',
  ],
  MODERATOR: [
    'workspace.view',
    'member.view',
    'member.remove',
    'channel.view',
    'channel.create',
    'channel.update',
    'channel.delete',
    'message.send',
    'message.edit',
    'message.delete',
    'file.download',
    'meeting.join',
  ],
  CLIENT: CLIENT_PERMISSIONS,
  GUEST: ['workspace.view'],
};
export const roleHasPermission = (
  role: SofoRole,
  permission: SofoPermission,
): boolean => DEFAULT_ROLE_PERMISSIONS[role].includes(permission);
