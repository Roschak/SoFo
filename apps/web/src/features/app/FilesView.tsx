import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../state/AuthContext';
import { useWorkspace } from '../../state/WorkspaceContext';
import { api } from '../../lib/api';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { Button } from '../../components/ui/Button';
import './FilesView.css';

interface FileItem {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploaderId: string;
  uploaderName: string | null;
  createdAt: string;
}

const IMAGE_MIMES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const MAX_FILE_MB = 25;

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isImage(mimeType: string): boolean {
  return IMAGE_MIMES.includes(mimeType);
}

export function FilesView() {
  const { session } = useAuth();
  const { activeWorkspace, members } = useWorkspace();
  const token = session?.token;
  const userId = session?.user.id;
  const inputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [preview, setPreview] = useState<FileItem | null>(null);

  const myRole = members.find((member) => member.user.id === userId)?.role;
  const canUpload = ['OWNER', 'ADMIN', 'MANAGER', 'STAFF', 'MEMBER'].includes(myRole ?? '');
  const canDelete = ['OWNER', 'ADMIN'].includes(myRole ?? '');

  const fetchFiles = useCallback(async () => {
    if (!token || !activeWorkspace) return;
    const workspaceId = activeWorkspace.id;
    setLoading(true);
    setError(null);
    try {
      const list = await api<FileItem[]>(`/workspaces/${workspaceId}/files`, {
        method: 'GET',
        token,
        workspaceId,
      });
      setFiles(list);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal memuat file');
    } finally {
      setLoading(false);
    }
  }, [token, activeWorkspace?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setFiles([]);
    void fetchFiles();
  }, [fetchFiles]);

  const gridRef = useScrollReveal<HTMLDivElement>([files.length], { stagger: 30 });

  async function handleUpload() {
    const input = inputRef.current;
    const file = input?.files?.[0];
    if (!file || !activeWorkspace) return;
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`Ukuran file melebihi ${MAX_FILE_MB} MB`);
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
      headers['x-workspace-id'] = activeWorkspace.id;
      const body = new FormData();
      body.append('file', file);
      const response = await fetch(`/api/v1/workspaces/${activeWorkspace.id}/files`, {
        method: 'POST',
        headers,
        body,
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? 'Gagal mengunggah file');
      }
      if (input) input.value = '';
      await fetchFiles();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal mengunggah file');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(fileId: string) {
    setBusyId(fileId);
    setError(null);
    try {
      await api(`/workspaces/${activeWorkspace?.id}/files/${fileId}`, {
        method: 'DELETE',
        token,
        workspaceId: activeWorkspace?.id,
      });
      setPreview((current) => (current?.id === fileId ? null : current));
      await fetchFiles();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal menghapus file');
    } finally {
      setBusyId(null);
    }
  }

  function downloadUrl(fileId: string): string {
    return `/api/v1/workspaces/${activeWorkspace?.id}/files/${fileId}`;
  }

  return (
    <div className="files">
      <header className="files__header">
        <div>
          <h2 className="files__title">File</h2>
          <p className="files__subtitle">
            {activeWorkspace?.name} — maks {MAX_FILE_MB} MB per file
          </p>
        </div>
        {canUpload ? (
          <div className="files__upload">
            <input
              ref={inputRef}
              type="file"
              id="files-input"
              className="files__input"
              onChange={() => void handleUpload()}
            />
            <Button size="sm" loading={uploading} onClick={() => inputRef.current?.click()}>
              ⬆ Unggah file
            </Button>
          </div>
        ) : null}
      </header>

      {error ? (
        <p className="files__error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="files__grid" ref={gridRef} aria-label="Daftar file">
        {loading ? <p className="files__empty">Memuat file…</p> : null}
        {!loading && files.length === 0 ? (
          <p className="files__empty">Belum ada file. Unggah yang pertama!</p>
        ) : null}

        {files.map((file) => (
          <article key={file.id} className="files__card" data-reveal data-reveal-direction="up">
            <button
              className="files__preview"
              onClick={() => setPreview(file)}
              title={`Pratinjau ${file.fileName}`}
              disabled={!isImage(file.mimeType)}
            >
              {isImage(file.mimeType) ? (
                <img src={downloadUrl(file.id)} alt={file.fileName} loading="lazy" />
              ) : (
                <span className="files__file-icon" aria-hidden="true">
                  {file.mimeType.includes('pdf') ? '📕' : file.mimeType.startsWith('text/') ? '📄' : '📦'}
                </span>
              )}
            </button>
            <div className="files__card-body">
              <p className="files__name" title={file.fileName}>
                {file.fileName}
              </p>
              <p className="files__meta">
                {formatBytes(file.sizeBytes)} · {file.uploaderName ?? '—'} ·{' '}
                {new Date(file.createdAt).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
              </p>
              <div className="files__actions">
                <a
                  className="files__download"
                  href={downloadUrl(file.id)}
                  download={file.fileName}
                  onClick={(event) => event.stopPropagation()}
                >
                  Unduh
                </a>
                {canDelete ? (
                  <button
                    className="files__delete"
                    onClick={() => void handleDelete(file.id)}
                    disabled={busyId === file.id}
                  >
                    Hapus
                  </button>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>

      {preview ? (
        <div className="files__modal" role="dialog" aria-modal="true" aria-label={preview.fileName} onClick={() => setPreview(null)}>
          <div className="files__modal-body" onClick={(event) => event.stopPropagation()}>
            <header className="files__modal-head">
              <span className="files__name">{preview.fileName}</span>
              <button className="files__modal-close" onClick={() => setPreview(null)} aria-label="Tutup pratinjau">
                ×
              </button>
            </header>
            {isImage(preview.mimeType) ? (
              <img src={downloadUrl(preview.id)} alt={preview.fileName} />
            ) : (
              <p className="files__modal-fallback">Pratinjau tidak tersedia — unduh untuk melihat.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
