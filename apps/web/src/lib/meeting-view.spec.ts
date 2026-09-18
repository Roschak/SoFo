import { describe, expect, it } from 'vitest';
import {
  canWriteNotes,
  mergeNotes,
  roleCanManageMeetings,
  sortMeetings,
} from './meeting-view';
import type { Meeting, MeetingNoteView } from './types';

const meeting = (overrides: Partial<Meeting> = {}): Meeting => ({
  id: 'mt-1',
  workspaceId: 'ws-1',
  title: 'Daily standup',
  description: null,
  status: 'SCHEDULED',
  scheduledAt: '2026-09-18T09:00:00.000Z',
  startedAt: null,
  endedAt: null,
  hostId: 'u-host',
  participants: [],
  notes: [],
  ...overrides,
});

const note = (overrides: Partial<MeetingNoteView> = {}): MeetingNoteView => ({
  id: 'n-1',
  authorId: 'u-1',
  content: 'hello',
  ...overrides,
});

describe('sortMeetings', () => {
  it('puts active meetings first regardless of date', () => {
    const list = sortMeetings([
      meeting({ id: 'a', status: 'SCHEDULED', scheduledAt: '2026-09-20T09:00:00.000Z' }),
      meeting({ id: 'b', status: 'ACTIVE', scheduledAt: '2026-09-10T09:00:00.000Z' }),
    ]);
    expect(list.map((item) => item.id)).toEqual(['b', 'a']);
  });

  it('orders scheduled meetings soonest-first and ended meetings newest-first', () => {
    const list = sortMeetings([
      meeting({ id: 'far', status: 'SCHEDULED', scheduledAt: '2026-10-01T09:00:00.000Z' }),
      meeting({ id: 'soon', status: 'SCHEDULED', scheduledAt: '2026-09-19T09:00:00.000Z' }),
      meeting({ id: 'old-end', status: 'ENDED', scheduledAt: '2026-09-01T09:00:00.000Z' }),
      meeting({ id: 'new-end', status: 'ENDED', scheduledAt: '2026-09-15T09:00:00.000Z' }),
    ]);
    expect(list.map((item) => item.id)).toEqual(['soon', 'far', 'new-end', 'old-end']);
  });

  it('does not mutate the input array', () => {
    const input = [meeting({ id: 'z' }), meeting({ id: 'a', status: 'ACTIVE' })];
    const snapshot = [...input];
    sortMeetings(input);
    expect(input).toEqual(snapshot);
  });
});

describe('mergeNotes', () => {
  it('keeps existing notes and appends new ones', () => {
    const merged = mergeNotes([note()], [note({ id: 'n-2', content: 'fresh' })]);
    expect(merged).toHaveLength(2);
  });

  it('lets the fetched note win when ids collide', () => {
    const merged = mergeNotes([note({ content: 'stale draft' })], [note({ content: 'saved' })]);
    expect(merged[0]?.content).toBe('saved');
  });
});

describe('canWriteNotes', () => {
  it('allows the host without joining', () => {
    expect(canWriteNotes(meeting({ hostId: 'u-me' }), 'u-me')).toBe(true);
  });

  it('allows joined participants', () => {
    const m = meeting({ participants: [{ userId: 'u-me', joinedAt: 'x' }] });
    expect(canWriteNotes(m, 'u-me')).toBe(true);
  });

  it('rejects members who never joined and anonymous users', () => {
    expect(canWriteNotes(meeting(), 'u-other')).toBe(false);
    expect(canWriteNotes(meeting(), undefined)).toBe(false);
  });
});

describe('roleCanManageMeetings', () => {
  it('accepts owner, admin, manager only', () => {
    expect(roleCanManageMeetings('OWNER')).toBe(true);
    expect(roleCanManageMeetings('ADMIN')).toBe(true);
    expect(roleCanManageMeetings('MANAGER')).toBe(true);
    expect(roleCanManageMeetings('STAFF')).toBe(false);
    expect(roleCanManageMeetings('CLIENT')).toBe(false);
    expect(roleCanManageMeetings(undefined)).toBe(false);
  });
});
