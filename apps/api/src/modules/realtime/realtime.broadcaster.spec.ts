import { RealtimeBroadcaster } from './realtime.broadcaster';
import { setSocketServer } from '../../infrastructure/realtime/socket-server';
import type { Server } from 'socket.io';

describe('RealtimeBroadcaster', () => {
  it('emits message.created to the workspace room', () => {
    const emit = jest.fn();
    setSocketServer({ to: jest.fn().mockReturnValue({ emit }) } as unknown as Server);
    const broadcaster = new RealtimeBroadcaster();

    broadcaster.broadcastMessageCreated('ws-1', {
      id: 'm-1',
      channelId: 'c-1',
      authorId: 'u-1',
      authorName: 'User One',
      content: 'hi',
      replyToId: null,
      status: 'VISIBLE',
      editedAt: null,
      createdAt: new Date().toISOString(),
      attachments: [],
    });

    expect(emit).toHaveBeenCalledWith('message.created', expect.objectContaining({ id: 'm-1' }));
  });

  it('is a safe no-op before the gateway initializes', () => {
    setSocketServer(null);
    const broadcaster = new RealtimeBroadcaster();
    expect(() =>
      broadcaster.broadcastMessageDeleted('ws-1', { messageId: 'm-1', channelId: 'c-1' }),
    ).not.toThrow();
  });
});
