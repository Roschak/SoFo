import { describe, expect, it } from 'vitest';
import {
  appendMessage,
  updateMessage,
  updateMessageStatus,
  deleteMessage,
  mergePage,
} from './message-store';
import type { Message } from './types';

const base: Message = {
  id: 'm-1',
  channelId: 'c-1',
  authorId: 'u-1',
  authorName: 'Ana',
  content: 'hello',
  replyToId: null,
  status: 'VISIBLE',
  editedAt: null,
  createdAt: '2026-09-17T10:00:00.000Z',
  attachments: [],
};

describe('message store', () => {
  it('appendMessage ignores duplicate realtime deliveries', () => {
    const once = appendMessage([], base);
    const twice = appendMessage(once, base);
    expect(twice).toHaveLength(1);
  });

  it('appendMessage adds new messages at the end', () => {
    const newer = { ...base, id: 'm-2', createdAt: '2026-09-17T10:01:00.000Z' };
    const list = appendMessage([base], newer);
    expect(list.map((message) => message.id)).toEqual(['m-1', 'm-2']);
  });

  it('updateMessage replaces by id only', () => {
    const edited = { ...base, content: 'edited', editedAt: '2026-09-17T10:05:00.000Z' };
    const list = updateMessage([base], edited);
    expect(list[0]?.content).toBe('edited');
  });

  it('deleteMessage removes by id', () => {
    const list = deleteMessage([base], base.id);
    expect(list).toHaveLength(0);
  });

  it('updateMessageStatus applies a moderation decision by id', () => {
    const list = updateMessageStatus([base], base.id, 'REMOVED');
    expect(list[0]?.status).toBe('REMOVED');
    expect(list).toHaveLength(1);
  });

  it('mergePage unions without duplicates and sorts chronologically', () => {
    const older = { ...base, id: 'm-0', createdAt: '2026-09-17T09:59:00.000Z' };
    const merged = mergePage([base], [older, base]);
    expect(merged.map((message) => message.id)).toEqual(['m-0', 'm-1']);
  });
});
