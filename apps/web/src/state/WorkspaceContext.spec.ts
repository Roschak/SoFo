import { describe, expect, it } from 'vitest';
import { appendMessage, mergePage } from '../lib/message-store';
import type { Message } from '../lib/types';

/**
 * Simulates the PRD §33 race: history page fetch and a realtime broadcast
 * for the same message arriving in either order must converge to one copy.
 */
describe('realtime vs history convergence', () => {
  const make = (id: string, createdAt: string): Message => ({
    id,
    channelId: 'c-1',
    authorId: 'u-1',
    authorName: 'Ana',
    content: `content-${id}`,
    replyToId: null,
    status: 'VISIBLE',
    editedAt: null,
    createdAt,
    attachments: [],
  });

  it('realtime first, history second → one copy', () => {
    const realtime = appendMessage([], make('m-2', '2026-09-17T10:01:00.000Z'));
    const history = [make('m-1', '2026-09-17T10:00:00.000Z'), make('m-2', '2026-09-17T10:01:00.000Z')];
    const merged = mergePage(realtime, history);
    expect(merged).toHaveLength(2);
  });

  it('history first, realtime second → one copy', () => {
    const history = mergePage([], [make('m-1', '2026-09-17T10:00:00.000Z')]);
    const withRealtime = appendMessage(history, make('m-1', '2026-09-17T10:00:00.000Z'));
    expect(withRealtime).toHaveLength(1);
  });
});
