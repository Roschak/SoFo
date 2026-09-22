import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../state/AuthContext';
import { useWorkspace } from '../../state/WorkspaceContext';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { Avatar } from '../../components/ui/Avatar';
import { ChannelView } from './ChannelView';
import { MeetingsView } from './MeetingsView';
import { AuditView } from './AuditView';
import { CalendarView } from './CalendarView';
import { RequestsView } from './RequestsView';
import { ProjectsView } from './ProjectsView';
import { FilesView } from './FilesView';
import { MembersView } from './MembersView';
import { AttendanceView } from './AttendanceView';
import { AdminView } from './AdminView';
import { OrgTreeView } from './OrgTreeView';
import { ModerationQueueView } from './ModerationQueueView';
import { ClientPortalView } from './ClientPortalView';
import { NotificationBell } from './NotificationBell';
import { canViewAudit } from '../../lib/audit-view';
import { canViewAdmin } from '../../lib/admin-view';
import { canModerate } from '../../lib/moderation-view';
import './ChatShell.css';

interface SearchItem {
  id: string;
  type: 'channel' | 'message' | 'project' | 'task' | 'file' | 'member';
  title: string;
  snippet: string | null;
  refId: string;
}

type Dialog = 'none' | 'workspace' | 'channel' | 'search';
type View =
  | 'chat'
  | 'meetings'
  | 'audit'
  | 'calendar'
  | 'requests'
  | 'projects'
  | 'files'
  | 'members'
  | 'attendance'
  | 'admin'
  | 'orgtree'
  | 'moderation'
  | 'client-portal';

export function ChatShell() {
  const { session, logout } = useAuth();
  const {
    workspaces,
    activeWorkspace,
    channels,
    activeChannel,
    members,
    onlineUserIds,
    connection,
    loadingWorkspaces,
    setActiveWorkspace,
    setActiveChannel,
    createWorkspace,
    createChannel,
  } = useWorkspace();

  const [view, setView] = useState<View>('chat');
  const [dialog, setDialog] = useState<Dialog>('none');
  const [wsName, setWsName] = useState('');
  const [wsMode, setWsMode] = useState<'ENTERPRISE' | 'COMMUNITY'>('COMMUNITY');
  const [channelName, setChannelName] = useState('');
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<string>('all');
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);


  const isOnline = (userId: string) => onlineUserIds.includes(userId);
  const myRole = members.find((member) => member.user.id === session?.user.id)?.role;
  const auditVisible = canViewAudit(myRole);
  const adminVisible = canViewAdmin(myRole);
  const moderationVisible = canModerate(myRole) && activeWorkspace?.mode === 'COMMUNITY';
  // Client/Guest users get the dedicated read-only portal instead of the full
  // workspace shell (PRD §51, §94).
  const isExternalUser = myRole === 'CLIENT' || myRole === 'GUEST';

  // External users (CLIENT/GUEST) start in their dedicated portal view.
  useEffect(() => {
    if (isExternalUser) {
      setView('client-portal');
    }
  }, [isExternalUser]);

  async function handleCreateWorkspace() {
    setBusy(true);
    setDialogError(null);
    try {
      await createWorkspace({ name: wsName, mode: wsMode });
      setDialog('none');
      setWsName('');
    } catch (cause) {
      setDialogError(cause instanceof Error ? cause.message : 'Gagal membuat workspace');
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateChannel() {
    setBusy(true);
    setDialogError(null);
    try {
      await createChannel({ name: channelName, type: 'TEXT', visibility: 'PUBLIC' });
      setDialog('none');
      setChannelName('');
    } catch (cause) {
      setDialogError(cause instanceof Error ? cause.message : 'Gagal membuat channel');
    } finally {
      setBusy(false);
    }
  }

  const triggerSearch = useCallback(
    async (query: string, type: string) => {
      if (!session?.token || !activeWorkspace || query.trim().length === 0) {
        setSearchResults([]);
        return;
      }
      setSearchLoading(true);
      try {
        const res = await api<{ items: SearchItem[] }>(
          `/workspaces/${activeWorkspace.id}/search?q=${encodeURIComponent(query.trim())}&type=${type}`,
          {
            method: 'GET',
            token: session.token,
            workspaceId: activeWorkspace.id,
          },
        );
        setSearchResults(res.items ?? []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    },
    [activeWorkspace, session?.token],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length > 0) {
        void triggerSearch(searchQuery, searchType);
      } else {
        setSearchResults([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, searchType, triggerSearch]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (activeWorkspace) {
          setDialog((prev) => (prev === 'search' ? 'none' : 'search'));
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeWorkspace]);

  function handleSelectSearchResult(item: SearchItem) {
    setDialog('none');
    if (item.type === 'channel' || item.type === 'message') {
      const ch = channels.find((c) => c.id === item.refId);
      if (ch) {
        setActiveChannel(ch);
      }
      setView('chat');
    } else if (item.type === 'project' || item.type === 'task') {
      setView('projects');
    } else if (item.type === 'file') {
      setView('files');
    } else if (item.type === 'member') {
      setView('members');
    }
  }

  return (
    <div className="shell">
      <aside className="shell__nav">
        <div className="shell__brand">SOFO</div>

        {activeWorkspace ? (
          <button
            className="shell__search-trigger"
            onClick={() => setDialog('search')}
            title="Cari di workspace (Ctrl+K)"
          >
            <span>🔍</span>
            <span className="shell__search-trigger-text">Cari...</span>
            <kbd className="shell__search-trigger-kbd">Ctrl K</kbd>
          </button>
        ) : null}

        <div className="shell__section">
          <div className="shell__section-head">

            <span>Workspace</span>
            <button
              className="shell__add"
              onClick={() => setDialog('workspace')}
              aria-label="Buat workspace baru"
            >
              +
            </button>
          </div>
          {loadingWorkspaces ? (
            <p className="shell__empty">Memuat…</p>
          ) : (
            <ul className="shell__list">
              {workspaces.map((workspace) => (
                <li key={workspace.id}>
                  <button
                    className={`shell__item${
                      workspace.id === activeWorkspace?.id ? ' shell__item--active' : ''
                    }`}
                    onClick={() => setActiveWorkspace(workspace)}
                  >
                    {workspace.name}
                  </button>
                </li>
              ))}
              {workspaces.length === 0 ? (
                <li className="shell__empty">Belum ada workspace</li>
              ) : null}
            </ul>
          )}
        </div>

        {activeWorkspace ? (
          <div className="shell__section shell__section--grow">
            <div className="shell__section-head">
              <span>Channel</span>
              <button
                className="shell__add"
                onClick={() => setDialog('channel')}
                aria-label="Buat channel baru"
              >
                +
              </button>
            </div>
            <ul className="shell__list">
              {channels.map((channel) => (
                <li key={channel.id}>
                  <button
                    className={`shell__item${
                      view === 'chat' && channel.id === activeChannel?.id ? ' shell__item--active' : ''
                    }`}
                    onClick={() => {
                      setActiveChannel(channel);
                      setView('chat');
                    }}
                  >
                    <span className="shell__hash">#</span>
                    {channel.name}
                  </button>
                </li>
              ))}
              {channels.length === 0 ? <li className="shell__empty">Belum ada channel</li> : null}
            </ul>
          </div>
        ) : null}

        {activeWorkspace ? (
          <div className="shell__section">
            <div className="shell__section-head">
              <span>Menu</span>
            </div>
            <ul className="shell__list">
              <li>
                <button
                  className={`shell__item${view === 'meetings' ? ' shell__item--active' : ''}`}
                  onClick={() => setView('meetings')}
                >
                  <span className="shell__hash">▦</span>
                  Meetings
                </button>
              </li>
              <li>
                <button
                  className={`shell__item${view === 'calendar' ? ' shell__item--active' : ''}`}
                  onClick={() => setView('calendar')}
                >
                  <span className="shell__hash">▤</span>
                  Kalender
                </button>
              </li>
              <li>
                <button
                  className={`shell__item${view === 'projects' ? ' shell__item--active' : ''}`}
                  onClick={() => setView('projects')}
                >
                  <span className="shell__hash">▣</span>
                  Proyek
                </button>
              </li>
              <li>
                <button
                  className={`shell__item${view === 'requests' ? ' shell__item--active' : ''}`}
                  onClick={() => setView('requests')}
                >
                  <span className="shell__hash">✓</span>
                  Permintaan
                </button>
              </li>
              <li>
                <button
                  className={`shell__item${view === 'files' ? ' shell__item--active' : ''}`}
                  onClick={() => setView('files')}
                >
                  <span className="shell__hash">▣</span>
                  File
                </button>
              </li>
              <li>
                <button
                  className={`shell__item${view === 'members' ? ' shell__item--active' : ''}`}
                  onClick={() => setView('members')}
                >
                  <span className="shell__hash">◉</span>
                  Anggota
                </button>
              </li>
              {activeWorkspace.mode === 'ENTERPRISE' ? (
                <>
                  <li>
                    <button
                      className={`shell__item${view === 'attendance' ? ' shell__item--active' : ''}`}
                      onClick={() => setView('attendance')}
                    >
                      <span className="shell__hash">⏱</span>
                      Presensi
                    </button>
                  </li>
                  <li>
                    <button
                      className={`shell__item${view === 'orgtree' ? ' shell__item--active' : ''}`}
                      onClick={() => setView('orgtree')}
                    >
                      <span className="shell__hash">⌗</span>
                      Organisasi
                    </button>
                  </li>
                </>
              ) : null}
              {auditVisible ? (
                <li>
                  <button
                    className={`shell__item${view === 'audit' ? ' shell__item--active' : ''}`}
                    onClick={() => setView('audit')}
                  >
                    <span className="shell__hash">☰</span>
                    Audit log
                  </button>
                </li>
              ) : null}
              {moderationVisible ? (
                <li>
                  <button
                    className={`shell__item${view === 'moderation' ? ' shell__item--active' : ''}`}
                    onClick={() => setView('moderation')}
                  >
                    <span className="shell__hash">⚑</span>
                    Moderasi
                  </button>
                </li>
              ) : null}
              {adminVisible ? (
                <li>
                  <button
                    className={`shell__item${view === 'admin' ? ' shell__item--active' : ''}`}
                    onClick={() => setView('admin')}
                  >
                    <span className="shell__hash">⬛</span>
                    Admin
                  </button>
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}


        <div className="shell__me">
          <Avatar name={session?.user.displayName ?? '?'} size="sm" />
          <span className="shell__me-name">{session?.user.displayName}</span>
          <Button variant="ghost" size="sm" onClick={() => void logout()}>
            Keluar
          </Button>
        </div>
      </aside>

      <main className="shell__main">
        {view === 'client-portal' && activeWorkspace && isExternalUser ? (
          <ClientPortalView key={activeWorkspace.id} />
        ) : view === 'meetings' && activeWorkspace ? (
          <MeetingsView key={activeWorkspace.id} />
        ) : view === 'calendar' && activeWorkspace ? (
          <CalendarView key={activeWorkspace.id} />
        ) : view === 'audit' && activeWorkspace && auditVisible ? (
          <AuditView key={activeWorkspace.id} />
        ) : view === 'requests' && activeWorkspace ? (
          <RequestsView key={activeWorkspace.id} />
        ) : view === 'projects' && activeWorkspace ? (
          <ProjectsView key={activeWorkspace.id} />
        ) : view === 'files' && activeWorkspace ? (
          <FilesView key={activeWorkspace.id} />
        ) : view === 'members' && activeWorkspace ? (
          <MembersView key={activeWorkspace.id} />
        ) : view === 'attendance' && activeWorkspace ? (
          <AttendanceView key={activeWorkspace.id} />
        ) : view === 'admin' && activeWorkspace && adminVisible ? (
          <AdminView key={activeWorkspace.id} />
        ) : view === 'orgtree' && activeWorkspace ? (
          <OrgTreeView key={activeWorkspace.id} />
        ) : view === 'moderation' && activeWorkspace && moderationVisible ? (
          <ModerationQueueView key={activeWorkspace.id} />
        ) : activeChannel && activeWorkspace ? (

          <ChannelView key={activeChannel.id} />
        ) : (
          <div className="shell__placeholder">
            <h2>Selamat datang di SOFO</h2>
            <p>
              {activeWorkspace
                ? 'Pilih atau buat channel pertama untuk mulai berkomunikasi.'
                : 'Buat workspace pertama kamu untuk mulai.'}
            </p>
          </div>
        )}
      </main>

      {activeWorkspace && members.length > 0 ? (
        <aside className="shell__members">
          <h3 className="shell__members-title">
            Anggota — {members.length}
          </h3>
          <ul className="shell__members-list">
            {members.map((member) => (
              <li key={member.id} className="shell__member">
                <Avatar
                  name={member.user.displayName}
                  size="sm"
                  online={isOnline(member.user.id)}
                />
                <span className="shell__member-name">{member.user.displayName}</span>
                <span className="shell__member-role">{member.role}</span>
              </li>
            ))}
          </ul>
        </aside>
      ) : null}

      <span
        className={`shell__conn shell__conn--${connection}`}
        role="status"
        title={`Koneksi realtime: ${connection}`}
      >
        {connection === 'online' ? '● Live' : connection === 'connecting' ? '◐ Menyambung' : '○ Offline'}
      </span>

      <NotificationBell />

      {dialog === 'workspace' ? (
        <Modal title="Workspace baru" onClose={() => setDialog('none')}>
          <Field
            label="Nama workspace"
            placeholder="mis. Tim Produk"
            value={wsName}
            onChange={(event) => setWsName(event.target.value)}
            minLength={2}
            maxLength={60}
          />
          <div className="shell__mode">
            {(['COMMUNITY', 'ENTERPRISE'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className={`shell__mode-item${wsMode === mode ? ' shell__mode-item--active' : ''}`}
                onClick={() => setWsMode(mode)}
              >
                {mode}
              </button>
            ))}
          </div>
          {dialogError ? <p className="shell__dialog-error">{dialogError}</p> : null}
          <Button
            onClick={() => void handleCreateWorkspace()}
            loading={busy}
            disabled={wsName.trim().length < 2}
          >
            Buat workspace
          </Button>
        </Modal>
      ) : null}

      {dialog === 'channel' ? (
        <Modal title="Channel baru" onClose={() => setDialog('none')}>
          <Field
            label="Nama channel"
            placeholder="mis. general"
            value={channelName}
            onChange={(event) => setChannelName(event.target.value)}
            minLength={1}
            maxLength={40}
          />
          {dialogError ? <p className="shell__dialog-error">{dialogError}</p> : null}
          <Button
            onClick={() => void handleCreateChannel()}
            loading={busy}
            disabled={channelName.trim().length < 1}
          >
            Buat channel
          </Button>
        </Modal>
      ) : null}

      {dialog === 'search' ? (
        <Modal title="Pencarian Global Workspace" onClose={() => setDialog('none')}>
          <div className="shell__search-box">
            <input
              type="text"
              className="shell__search-input"
              placeholder="Cari saluran, pesan, tugas, berkas, atau anggota..."
              value={searchQuery}
              autoFocus
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="shell__search-types">
              {(['all', 'channel', 'message', 'project', 'task', 'file', 'member'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`shell__search-type-btn${searchType === t ? ' shell__search-type-btn--active' : ''}`}
                  onClick={() => setSearchType(t)}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="shell__search-results">
              {searchLoading ? (
                <p className="shell__search-empty">Mencari…</p>
              ) : searchResults.length > 0 ? (
                <ul className="shell__search-list">
                  {searchResults.map((item) => (
                    <li
                      key={item.id}
                      className="shell__search-item"
                      onClick={() => handleSelectSearchResult(item)}
                    >
                      <div className="shell__search-item-top">
                        <span className={`shell__search-badge shell__search-badge--${item.type}`}>
                          {item.type}
                        </span>
                        <span className="shell__search-item-title">{item.title}</span>
                      </div>
                      {item.snippet ? (
                        <p className="shell__search-item-snippet">{item.snippet}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : searchQuery.trim().length > 0 ? (
                <p className="shell__search-empty">Tidak ada hasil untuk "{searchQuery}".</p>
              ) : (
                <p className="shell__search-empty">Ketik kata kunci untuk memulai pencarian di seluruh workspace.</p>
              )}
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

