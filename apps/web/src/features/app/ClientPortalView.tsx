import { useEffect, useState } from 'react';
import { useAuth } from '../../state/AuthContext';
import { useWorkspace } from '../../state/WorkspaceContext';
import { api } from '../../lib/api';
import type { Channel, Message, Project } from '../../lib/types';
import { Avatar } from '../../components/ui/Avatar';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import './ClientPortalView.css';

interface FileItem {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

/**
 * Client/Guest portal (PRD §51, §94): a deliberately minimal, read-oriented
 * surface for external users. It only renders resources the shared permission
 * matrix already allows (workspace.view / channel.view / project.view /
 * task.view / file.download) — every fetch is re-authorized server-side, so
 * this layout is UX, not a security boundary (PRD §113).
 */
export function ClientPortalView() {
  const { session } = useAuth();
  const { activeWorkspace, channels, members } = useWorkspace();
  const token = session?.token;

  const [projects, setProjects] = useState<Project[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [channelMessages, setChannelMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (!token || !activeWorkspace) return;
    const workspaceId = activeWorkspace.id;
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      api<Project[]>(`/workspaces/${workspaceId}/projects`, {
        method: 'GET',
        token,
        workspaceId,
      }),
      api<FileItem[]>(`/workspaces/${workspaceId}/files`, {
        method: 'GET',
        token,
        workspaceId,
      }),
    ])
      .then(([projectList, filePage]) => {
        if (cancelled) return;
        setProjects(projectList ?? []);
        setFiles(filePage ?? []);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Gagal memuat data portal');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeWorkspace, token]);

  // Channel reading lane: pick the first channel, load its visible history.
  useEffect(() => {
    if (!token || !activeWorkspace || channels.length === 0) {
      setChannelMessages([]);
      return;
    }
    const channel = channels[0] as Channel;
    let cancelled = false;
    api<{ items: Message[] }>(
      `/workspaces/${activeWorkspace.id}/channels/${channel.id}/messages`,
      { method: 'GET', token, workspaceId: activeWorkspace.id },
    )
      .then((page) => {
        if (!cancelled) setChannelMessages([...page.items].reverse());
      })
      .catch(() => {
        if (!cancelled) setChannelMessages([]);
      });
    return () => {
      cancelled = true;
    };
  }, [activeWorkspace, channels, token]);

  const containerRef = useScrollReveal<HTMLDivElement>([projects.length, files.length, loading]);

  return (
    <div className="cportal" ref={containerRef}>
      <header className="cportal__hero" data-reveal data-reveal-direction="up">
        <span className="cportal__badge">Portal Klien</span>
        <h2 className="cportal__title">{activeWorkspace?.name ?? 'SOFO'}</h2>
        <p className="cportal__subtitle">
          Ruang baca khusus untuk klien &amp; tamu — hanya progres proyek, pengumuman, dan dokumen
          yang dibagikan untuk Anda.
        </p>
      </header>

      {error ? (
        <p className="cportal__error" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="cportal__loading">Memuat…</p>
      ) : (
        <>
          <section className="cportal__section" data-reveal data-reveal-direction="up">
            <h3 className="cportal__section-title">Pengumuman &amp; Diskusi</h3>
            {channelMessages.length === 0 ? (
              <p className="cportal__empty">Belum ada pengumuman yang dibagikan.</p>
            ) : (
              <ul className="cportal__feed">
                {channelMessages.slice(-12).map((message) => (
                  <li key={message.id} className="cportal__feed-item">
                    <Avatar name={message.authorName} size="sm" />
                    <div>
                      <div className="cportal__feed-meta">
                        <span className="cportal__feed-author">{message.authorName}</span>
                        <time className="cportal__feed-time">
                          {new Date(message.createdAt).toLocaleDateString('id-ID', {
                            dateStyle: 'medium',
                          })}
                        </time>
                      </div>
                      <p className="cportal__feed-content">{message.content}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="cportal__section" data-reveal data-reveal-direction="up">
            <h3 className="cportal__section-title">Proyek Anda</h3>
            {projects.length === 0 ? (
              <p className="cportal__empty">Belum ada proyek yang dibagikan.</p>
            ) : (
              <ul className="cportal__projects">
                {projects.map((project) => (
                  <li key={project.id} className="cportal__project-card">
                    <span className="cportal__project-name">{project.name}</span>
                    <span className={`cportal__project-status cportal__project-status--${project.status.toLowerCase()}`}>
                      {project.status}
                    </span>
                    {project.description ? (
                      <p className="cportal__project-desc">{project.description}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="cportal__section" data-reveal data-reveal-direction="up">
            <h3 className="cportal__section-title">Dokumen</h3>
            {files.length === 0 ? (
              <p className="cportal__empty">Belum ada dokumen yang dibagikan.</p>
            ) : (
              <ul className="cportal__files">
                {files.slice(0, 10).map((file) => (
                  <li key={file.id} className="cportal__file-row">
                    <span className="cportal__file-name">{file.fileName}</span>
                    <span className="cportal__file-size">
                      {(file.sizeBytes / 1024).toFixed(0)} KB
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {members.length > 0 ? (
        <footer className="cportal__footer" data-reveal data-reveal-direction="up">
          {members.length} anggota tim siap membantu Anda.
        </footer>
      ) : null}
    </div>
  );
}
