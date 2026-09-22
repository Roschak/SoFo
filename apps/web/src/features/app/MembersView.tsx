import { useCallback, useState, type FormEvent } from 'react';
import { useAuth } from '../../state/AuthContext';
import { useWorkspace } from '../../state/WorkspaceContext';
import { api } from '../../lib/api';
import type { Member } from '../../lib/types';
import {
  ASSIGNABLE_ROLES,
  canChangeRole,
  canManageMembers,
  canRemoveMember,
} from '../../lib/member-view';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { Avatar } from '../../components/ui/Avatar';
import './MembersView.css';

interface InviteLookupResponse {
  id: string;
  email: string;
  displayName: string;
}

export function MembersView() {
  const { session } = useAuth();
  const { activeWorkspace, members, refreshMembers } = useWorkspace();
  const token = session?.token;
  const userId = session?.user.id;

  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState(false);
  const [email, setEmail] = useState('');
  const [roleName, setRoleName] = useState<(typeof ASSIGNABLE_ROLES)[number]>('MEMBER');
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const myRole = members.find((member) => member.user.id === userId)?.role;
  const manageMembers = canManageMembers(myRole);

  const listRef = useScrollReveal<HTMLUListElement>([members.length], { stagger: 40 });

  const reload = useCallback(async () => {
    if (typeof refreshMembers === 'function') {
      await refreshMembers();
    }
  }, [refreshMembers]);

  async function handleInvite(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setDialogError(null);
    try {
      // Resolve the email to a user id, then invite.
      const user = await api<InviteLookupResponse>(
        `/users/lookup?email=${encodeURIComponent(email.trim().toLowerCase())}`,
        { method: 'GET', token },
      );
      await api(`/workspaces/${activeWorkspace?.id}/members`, {
        method: 'POST',
        token,
        workspaceId: activeWorkspace?.id,
        body: { userId: user.id, roleName },
      });
      setDialog(false);
      setEmail('');
      await reload();
    } catch (cause) {
      setDialogError(cause instanceof Error ? cause.message : 'Gagal mengundang anggota');
    } finally {
      setBusy(false);
    }
  }

  async function handleRoleChange(memberId: string, nextRole: string) {
    setLoadingId(memberId);
    setError(null);
    try {
      await api(`/workspaces/${activeWorkspace?.id}/members/${memberId}`, {
        method: 'PATCH',
        token,
        workspaceId: activeWorkspace?.id,
        body: { roleName: nextRole },
      });
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal mengubah peran');
    } finally {
      setLoadingId(null);
    }
  }

  async function handleRemove(memberId: string) {
    setLoadingId(memberId);
    setError(null);
    try {
      await api(`/workspaces/${activeWorkspace?.id}/members/${memberId}`, {
        method: 'DELETE',
        token,
        workspaceId: activeWorkspace?.id,
      });
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal menghapus anggota');
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="members">
      <header className="members__header">
        <div>
          <h2 className="members__title">Anggota — {members.length}</h2>
          <p className="members__subtitle">{activeWorkspace?.name}</p>
        </div>
        {manageMembers ? (
          <Button size="sm" onClick={() => setDialog(true)}>
            + Undang anggota
          </Button>
        ) : null}
      </header>

      {error ? (
        <p className="members__error" role="alert">
          {error}
        </p>
      ) : null}

      <ul className="members__list" ref={listRef} aria-label="Daftar anggota">
        {members.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            isOwner={member.user.id === activeWorkspace?.ownerId}
            isSelf={member.user.id === userId}
            manageMembers={manageMembers}
            busy={loadingId === member.id}
            onRoleChange={handleRoleChange}
            onRemove={handleRemove}
          />
        ))}
      </ul>

      {dialog ? (
        <Modal title="Undang anggota" onClose={() => setDialog(false)}>
          <form onSubmit={handleInvite}>
            <Field
              label="Email pengguna"
              type="email"
              placeholder="orang@perusahaan.id"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <div className="members__form-row">
              <label className="field__label" htmlFor="member-role">
                Peran
              </label>
              <select
                id="member-role"
                className="members__select"
                value={roleName}
                onChange={(event) => setRoleName(event.target.value as (typeof ASSIGNABLE_ROLES)[number])}
              >
                {ASSIGNABLE_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
            {dialogError ? <p className="members__error">{dialogError}</p> : null}
            <Button type="submit" loading={busy} disabled={!email.trim()}>
              Undang
            </Button>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

interface MemberRowProps {
  member: Member;
  isOwner: boolean;
  isSelf: boolean;
  manageMembers: boolean;
  busy: boolean;
  onRoleChange: (memberId: string, role: string) => Promise<void>;
  onRemove: (memberId: string) => Promise<void>;
}

function MemberRow({ member, isOwner, isSelf, manageMembers, busy, onRoleChange, onRemove }: MemberRowProps) {
  const canRole = manageMembers && canChangeRole(member.role, isOwner, 'OWNER') && !isSelf;
  const canRemove = manageMembers && canRemoveMember(member.role, isOwner, 'OWNER') && !isSelf;

  return (
    <li className="members__row" data-reveal data-reveal-direction="up">
      <Avatar name={member.user.displayName} size="sm" />
      <div className="members__who">
        <span className="members__name">
          {member.user.displayName}
          {isSelf ? <span className="members__you"> (kamu)</span> : null}
          {isOwner ? <span className="members__owner-tag">OWNER</span> : null}
        </span>
        <span className="members__email">{member.user.email}</span>
      </div>
      {canRole ? (
        <select
          className="members__select"
          value={member.role}
          disabled={busy}
          onChange={(event) => void onRoleChange(member.id, event.target.value)}
          aria-label={`Peran ${member.user.displayName}`}
        >
          <option value={member.role}>{member.role}</option>
          {ASSIGNABLE_ROLES.filter((role) => role !== member.role).map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      ) : (
        <span className="members__role">{member.role}</span>
      )}
      {canRemove ? (
        <Button
          variant="ghost"
          size="sm"
          loading={busy}
          onClick={() => void onRemove(member.id)}
        >
          Hapus
        </Button>
      ) : null}
    </li>
  );
}
