import { RealtimeService } from './realtime.service';

describe('RealtimeService', () => {
  let service: RealtimeService;

  beforeEach(() => {
    service = new RealtimeService();
  });

  describe('presence', () => {
    it('adds a user as online', () => {
      const entry = service.addPresence('ws-1', 'u-1');
      expect(entry.status).toBe('online');
      expect(entry.onlineUserIds).toEqual(['u-1']);
    });

    it('is multi-device aware: offline only after last socket leaves', () => {
      service.addPresence('ws-1', 'u-1'); // device 1
      service.addPresence('ws-1', 'u-1'); // device 2

      const stillOnline = service.removePresence('ws-1', 'u-1'); // device 1 keluar
      expect(stillOnline.onlineUserIds).toEqual(['u-1']);

      const nowOffline = service.removePresence('ws-1', 'u-1'); // device 2 keluar
      expect(nowOffline.onlineUserIds).toEqual([]);
    });

    it('tracks workspaces independently', () => {
      service.addPresence('ws-1', 'u-1');
      const other = service.addPresence('ws-2', 'u-2');
      expect(other.onlineUserIds).toEqual(['u-2']);
    });
  });

  describe('typing', () => {
    it('returns typing users', () => {
      service.setTyping('ws-1', 'c-1', 'u-1', true);
      expect(service.getTypingUserIds('ws-1', 'c-1')).toEqual(['u-1']);
    });

    it('removes on explicit stop', () => {
      service.setTyping('ws-1', 'c-1', 'u-1', true);
      service.setTyping('ws-1', 'c-1', 'u-1', false);
      expect(service.getTypingUserIds('ws-1', 'c-1')).toEqual([]);
    });

    it('expires entries after the TTL', () => {
      jest.useFakeTimers();
      service.setTyping('ws-1', 'c-1', 'u-1', true);

      jest.advanceTimersByTime(7_000);
      expect(service.getTypingUserIds('ws-1', 'c-1')).toEqual([]);
      jest.useRealTimers();
    });

    it('scopes typing by channel', () => {
      service.setTyping('ws-1', 'c-1', 'u-1', true);
      expect(service.getTypingUserIds('ws-1', 'c-2')).toEqual([]);
    });
  });
});
