import { describe, expect, it } from 'vitest';
import {
  canChangeRole,
  canManageMembers,
  canRemoveMember,
  initialsOf,
} from './member-view';

describe('canManageMembers', () => {
  it('allows OWNER and ADMIN only', () => {
    expect(canManageMembers('OWNER')).toBe(true);
    expect(canManageMembers('ADMIN')).toBe(true);
    expect(canManageMembers('MANAGER')).toBe(false);
    expect(canManageMembers('STAFF')).toBe(false);
    expect(canManageMembers(undefined)).toBe(false);
  });
});

describe('canRemoveMember', () => {
  it('never removes the workspace owner', () => {
    expect(canRemoveMember('OWNER', true, 'OWNER')).toBe(false);
  });

  it('allows OWNER/ADMIN to remove non-owner members', () => {
    expect(canRemoveMember('STAFF', false, 'OWNER')).toBe(true);
    expect(canRemoveMember('STAFF', false, 'ADMIN')).toBe(true);
    expect(canRemoveMember('STAFF', false, 'MANAGER')).toBe(false);
  });
});

describe('canChangeRole', () => {
  it('blocks role changes on the owner', () => {
    expect(canChangeRole('OWNER', true, 'OWNER')).toBe(false);
  });

  it('allows OWNER/ADMIN to change others', () => {
    expect(canChangeRole('STAFF', false, 'OWNER')).toBe(true);
    expect(canChangeRole('STAFF', false, 'ADMIN')).toBe(true);
    expect(canChangeRole('STAFF', false, 'MODERATOR')).toBe(false);
  });
});

describe('initialsOf', () => {
  it('takes up to two leading initials', () => {
    expect(initialsOf('Budi Santoso')).toBe('BS');
    expect(initialsOf('ana')).toBe('A');
    expect(initialsOf('  ')).toBe('?');
  });
});
