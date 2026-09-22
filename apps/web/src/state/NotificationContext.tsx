import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from '../lib/api';
import type { Notification } from '../lib/types';
import { useAuth } from './AuthContext';

/**
 * Notification inbox state (PRD §89, ADR-005). Realtime arrivals come via
 * `notification.created` on the user room; history loads once per session.
 */

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  markRead: (notificationId: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const token = session?.token;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const page = await api<{ items: Notification[] }>('/notifications', { method: 'GET', token });
      setNotifications(page.items);
      const count = await api<{ count: number }>('/notifications/unread-count', {
        method: 'GET',
        token,
      });
      setUnreadCount(count.count);
    } catch {
      // inbox is best-effort; the bell hides errors
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    void refresh();
  }, [token, refresh]);

  // Realtime arrivals are re-broadcast here via window events from
  // WorkspaceContext (single socket owner pattern).
  useEffect(() => {
    const onCreated = (event: Event) => {
      const notification = (event as CustomEvent<Notification>).detail;
      if (!notification) return;
      setNotifications((current) =>
        current.some((item) => item.id === notification.id)
          ? current
          : [notification, ...current].slice(0, 50),
      );
      setUnreadCount((count) => count + 1);
    };
    const onRead = (event: Event) => {
      const detail = (event as CustomEvent<{ notificationId: string }>).detail;
      if (!detail) return;
      setNotifications((current) =>
        current.map((item) =>
          item.id === detail.notificationId ? { ...item, status: 'READ' } : item,
        ),
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    };
    window.addEventListener('sofo:notification.created', onCreated);
    window.addEventListener('sofo:notification.read', onRead);
    return () => {
      window.removeEventListener('sofo:notification.created', onCreated);
      window.removeEventListener('sofo:notification.read', onRead);
    };
  }, []);

  const markRead = useCallback(
    async (notificationId: string) => {
      if (!token) return;
      await api(`/notifications/${notificationId}/read`, { method: 'POST', token });
      setNotifications((current) =>
        current.map((item) =>
          item.id === notificationId ? { ...item, status: 'READ' } : item,
        ),
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    },
    [token],
  );

  const markAllRead = useCallback(async () => {
    if (!token) return;
    await api('/notifications/read-all', { method: 'POST', token });
    setNotifications((current) =>
      current.map((item) => ({ ...item, status: 'READ' as const })),
    );
    setUnreadCount(0);
  }, [token]);

  const value = useMemo(
    () => ({ notifications, unreadCount, markRead, markAllRead, refresh }),
    [notifications, unreadCount, markRead, markAllRead, refresh],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
