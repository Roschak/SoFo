import { useState } from 'react';
import { useAuth } from '../../state/AuthContext';
import { useWorkspace } from '../../state/WorkspaceContext';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { Avatar } from '../../components/ui/Avatar';
import { ChannelView } from './ChannelView';
import './ChatShell.css';

type Dialog = 'none' | 'workspace' | 'channel';

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

  const [dialog, setDialog] = useState<Dialog>('none');
  const [wsName, setWsName] = useState('');
  const [wsMode, setWsMode] = useState<'ENTERPRISE' | 'COMMUNITY'>('COMMUNITY');
  const [channelName, setChannelName] = useState('');
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const isOnline = (userId: string) => onlineUserIds.includes(userId);

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

  return (
    <div className="shell">
      <aside className="shell__nav">
        <div className="shell__brand">SOFO</div>

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
                      channel.id === activeChannel?.id ? ' shell__item--active' : ''
                    }`}
                    onClick={() => setActiveChannel(channel)}
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

        <div className="shell__me">
          <Avatar name={session?.user.displayName ?? '?'} size="sm" />
          <span className="shell__me-name">{session?.user.displayName}</span>
          <Button variant="ghost" size="sm" onClick={() => void logout()}>
            Keluar
          </Button>
        </div>
      </aside>

      <main className="shell__main">
        {activeChannel && activeWorkspace ? (
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
    </div>
  );
}
