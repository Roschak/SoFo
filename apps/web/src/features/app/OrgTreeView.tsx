import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../../state/AuthContext';
import { useWorkspace } from '../../state/WorkspaceContext';
import { api } from '../../lib/api';
import {
  canManageOrganization,
  flattenOrgTree,
  ORG_KIND_LABELS,
  type OrgUnitNode,
} from '../../lib/org-tree';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import './OrgTreeView.css';

export function OrgTreeView() {
  const { session } = useAuth();
  const { activeWorkspace, members } = useWorkspace();
  const token = session?.token;

  const [units, setUnits] = useState<OrgUnitNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState(false);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<OrgUnitNode['kind']>('DEPARTMENT');
  const [parentId, setParentId] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const myRole = members.find((member) => member.user.id === session?.user.id)?.role;
  const canManage = canManageOrganization(myRole, activeWorkspace?.mode);

  const loadUnits = useCallback(async () => {
    if (!token || !activeWorkspace) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api<{ items?: OrgUnitNode[] } | OrgUnitNode[]>(
        `/workspaces/${activeWorkspace.id}/organization`,
        { method: 'GET', token, workspaceId: activeWorkspace.id },
      );
      setUnits(Array.isArray(data) ? data : (data.items ?? []));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal memuat struktur organisasi');
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace, token]);

  useEffect(() => {
    void loadUnits();
  }, [loadUnits]);

  const treeRef = useScrollReveal<HTMLUListElement>([units.length, loading]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!activeWorkspace) return;
    setBusy(true);
    setDialogError(null);
    try {
      await api(`/workspaces/${activeWorkspace.id}/organization`, {
        method: 'POST',
        token,
        workspaceId: activeWorkspace.id,
        body: {
          name: name.trim(),
          kind,
          ...(parentId ? { parentId } : {}),
        },
      });
      setDialog(false);
      setName('');
      setParentId('');
      await loadUnits();
    } catch (cause) {
      setDialogError(cause instanceof Error ? cause.message : 'Gagal membuat unit organisasi');
    } finally {
      setBusy(false);
    }
  }

  const tree = flattenOrgTree(units);

  return (
    <div className="orgtree">
      <header className="orgtree__header">
        <div>
          <h2 className="orgtree__title">Struktur Organisasi</h2>
          <p className="orgtree__subtitle">
            Hierarki departemen → divisi → tim (Enterprise Mode).
          </p>
        </div>
        {canManage ? (
          <Button size="sm" onClick={() => setDialog(true)}>
            + Unit baru
          </Button>
        ) : null}
      </header>

      {error ? (
        <p className="orgtree__error" role="alert">
          {error}
        </p>
      ) : null}

      {activeWorkspace?.mode !== 'ENTERPRISE' ? (
        <div className="orgtree__empty-box">
          <span className="orgtree__empty-icon">🏢</span>
          <h3>Fitur Enterprise</h3>
          <p>Struktur organisasi hanya aktif untuk workspace bertipe ENTERPRISE.</p>
        </div>
      ) : loading ? (
        <p className="orgtree__empty">Memuat…</p>
      ) : tree.length === 0 ? (
        <div className="orgtree__empty-box">
          <span className="orgtree__empty-icon">🗂️</span>
          <h3>Belum ada struktur</h3>
          <p>Mulai dengan membuat departemen pertama, lalu tambahkan divisi dan tim di bawahnya.</p>
        </div>
      ) : (
        <ul className="orgtree__list" ref={treeRef} aria-label="Struktur organisasi">
          {tree.map((item) => (
            <li
              key={item.id}
              className="orgtree__row"
              data-reveal
              data-reveal-direction="left"
              style={{ marginLeft: `${item.depth * 28}px` }}
            >
              <span className={`orgtree__kind orgtree__kind--${item.kind.toLowerCase()}`}>
                {ORG_KIND_LABELS[item.kind]}
              </span>
              <span className="orgtree__name">{item.name}</span>
              {item.hasChildren ? (
                <span className="orgtree__children-count">
                  {units.filter((unit) => unit.parentId === item.id).length} sub-unit
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {dialog ? (
        <Modal title="Unit organisasi baru" onClose={() => setDialog(false)}>
          <form onSubmit={handleCreate}>
            <Field
              label="Nama unit"
              placeholder="mis. Engineering"
              value={name}
              onChange={(event) => setName(event.target.value)}
              minLength={2}
              maxLength={60}
              required
            />
            <div className="orgtree__form-row">
              <label className="field__label" htmlFor="org-kind">
                Jenis
              </label>
              <select
                id="org-kind"
                className="orgtree__select"
                value={kind}
                onChange={(event) => setKind(event.target.value as OrgUnitNode['kind'])}
              >
                <option value="DEPARTMENT">Departemen</option>
                <option value="DIVISION">Divisi</option>
                <option value="TEAM">Tim</option>
              </select>
            </div>
            <div className="orgtree__form-row">
              <label className="field__label" htmlFor="org-parent">
                Induk (opsional)
              </label>
              <select
                id="org-parent"
                className="orgtree__select"
                value={parentId}
                onChange={(event) => setParentId(event.target.value)}
              >
                <option value="">— Tanpa induk —</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </div>
            {dialogError ? <p className="orgtree__error">{dialogError}</p> : null}
            <Button type="submit" loading={busy} disabled={name.trim().length < 2}>
              Buat unit
            </Button>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
