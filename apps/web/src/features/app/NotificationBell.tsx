import { useEffect, useRef, useState } from 'react';
import { useNotifications } from '../../state/NotificationContext';
import { formatAuditTime } from '../../lib/audit-view';
import './NotificationBell.css';

const TYPE_LABEL: Record<string, string> = {
  'request.created': 'Permintaan baru',
  'request.approved': 'Disetujui',
  'request.rejected': 'Ditolak',
  'member.invited': 'Undangan',
  'task.assigned': 'Tugas baru',
  'message.pending': 'Moderasi',
};

export function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  return (
    <div className="notif" ref={rootRef}>
      <button
        className="notif__bell"
        onClick={() => setOpen((current) => !current)}
        aria-label={`Notifikasi — ${unreadCount} belum dibaca`}
        aria-expanded={open}
      >
        <span aria-hidden="true">🔔</span>
        {unreadCount > 0 ? (
          <span className="notif__badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        ) : null}
      </button>

      {open ? (
        <div className="notif__panel" role="dialog" aria-label="Daftar notifikasi">
          <header className="notif__panel-head">
            <span className="notif__panel-title">Notifikasi</span>
            {unreadCount > 0 ? (
              <button className="notif__mark-all" onClick={() => void markAllRead()}>
                Tandai semua dibaca
              </button>
            ) : null}
          </header>
          <ul className="notif__list">
            {notifications.map((notification) => (
              <li key={notification.id}>
                <button
                  className={`notif__item${notification.status === 'UNREAD' ? ' notif__item--unread' : ''}`}
                  onClick={() => {
                    if (notification.status === 'UNREAD') {
                      void markRead(notification.id);
                    }
                  }}
                  title={notification.status === 'UNREAD' ? 'Tandai dibaca' : undefined}
                >
                  <span className="notif__item-top">
                    <span className="notif__type">{TYPE_LABEL[notification.type] ?? notification.type}</span>
                    <span className="notif__time">{formatAuditTime(notification.createdAt)}</span>
                  </span>
                  <span className="notif__title">{notification.title}</span>
                  {notification.body ? <span className="notif__body">{notification.body}</span> : null}
                </button>
              </li>
            ))}
            {notifications.length === 0 ? (
              <li className="notif__empty">Belum ada notifikasi.</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
