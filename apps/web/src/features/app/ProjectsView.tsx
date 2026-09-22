import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../../state/AuthContext';
import { useWorkspace } from '../../state/WorkspaceContext';
import { api } from '../../lib/api';
import type { Project, Task } from '../../lib/types';
import {
  PRIORITY_CLASS,
  PRIORITY_LABEL,
  PROJECT_STATUS_LABEL,
  TASK_COLUMN_LABEL,
  TASK_COLUMNS,
  canManageProjects,
  canManageTasks,
  groupByColumn,
  sortByPriority,
} from '../../lib/project-view';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import './ProjectsView.css';

export function ProjectsView() {
  const { session } = useAuth();
  const { activeWorkspace, members } = useWorkspace();
  const token = session?.token;
  const userId = session?.user.id;

  const [projects, setProjects] = useState<Project[]>([]);
  const [tasksByProject, setTasksByProject] = useState<Record<string, Task[]>>({});
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectDialog, setProjectDialog] = useState(false);
  const [taskDialog, setTaskDialog] = useState(false);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // New project form
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectDeadline, setProjectDeadline] = useState('');
  const [projectPriority, setProjectPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');

  // New task form
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [taskAssigneeId, setTaskAssigneeId] = useState('');

  const myRole = members.find((member) => member.user.id === userId)?.role;
  const manageProjects = canManageProjects(myRole);
  const manageTasks = canManageTasks(myRole);

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null;
  const selectedTasks = useMemo(
    () => (selectedProjectId ? tasksByProject[selectedProjectId] ?? [] : []),
    [selectedProjectId, tasksByProject],
  );

  const fetchProjects = useCallback(async () => {
    if (!token || !activeWorkspace) return;
    const workspaceId = activeWorkspace.id;
    setLoading(true);
    setError(null);
    try {
      const list = await api<Project[]>(`/workspaces/${workspaceId}/projects`, {
        method: 'GET',
        token,
        workspaceId,
      });
      setProjects(list);
      setSelectedProjectId((current) =>
        current && list.some((project) => project.id === current) ? current : list[0]?.id ?? null,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal memuat proyek');
    } finally {
      setLoading(false);
    }
  }, [token, activeWorkspace?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchTasks = useCallback(async (projectId: string) => {
    if (!token || !activeWorkspace) return;
    try {
      const list = await api<Task[]>(
        `/workspaces/${activeWorkspace.id}/projects/${projectId}/tasks`,
        { method: 'GET', token, workspaceId: activeWorkspace.id },
      );
      setTasksByProject((current) => ({ ...current, [projectId]: list }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal memuat tugas');
    }
  }, [token, activeWorkspace?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setProjects([]);
    setTasksByProject({});
    setSelectedProjectId(null);
    void fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (selectedProjectId) {
      void fetchTasks(selectedProjectId);
    }
  }, [selectedProjectId, fetchTasks]);

  const grouped = useMemo(() => groupByColumn(sortByPriority(selectedTasks)), [selectedTasks]);
  const boardRef = useScrollReveal<HTMLDivElement>([selectedProjectId, selectedTasks.length], { stagger: 35 });

  async function handleCreateProject(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await api<Project>(`/workspaces/${activeWorkspace?.id}/projects`, {
        method: 'POST',
        token,
        workspaceId: activeWorkspace?.id,
        body: {
          name: projectName.trim(),
          ...(projectDescription.trim() ? { description: projectDescription.trim() } : {}),
          priority: projectPriority,
          ...(projectDeadline ? { deadline: new Date(projectDeadline).toISOString() } : {}),
        },
      });
      setProjectDialog(false);
      setProjectName('');
      setProjectDescription('');
      setProjectDeadline('');
      setProjects((current) => [created, ...current]);
      setSelectedProjectId(created.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal membuat proyek');
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateTask(event: FormEvent) {
    event.preventDefault();
    if (!selectedProjectId) return;
    setBusy(true);
    setError(null);
    try {
      await api<Task>(`/workspaces/${activeWorkspace?.id}/projects/${selectedProjectId}/tasks`, {
        method: 'POST',
        token,
        workspaceId: activeWorkspace?.id,
        body: {
          title: taskTitle.trim(),
          priority: taskPriority,
          ...(taskDeadline ? { deadline: new Date(taskDeadline).toISOString() } : {}),
          ...(taskAssigneeId ? { assigneeId: taskAssigneeId } : {}),
        },
      });
      setTaskDialog(false);
      setTaskTitle('');
      setTaskDeadline('');
      setTaskAssigneeId('');
      await fetchTasks(selectedProjectId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal membuat tugas');
    } finally {
      setBusy(false);
    }
  }

  async function moveTask(taskId: string, status: string) {
    if (!selectedProjectId) return;
    setTasksByProject((current) => ({
      ...current,
      [selectedProjectId]: (current[selectedProjectId] ?? []).map((task) =>
        task.id === taskId ? { ...task, status } : task,
      ),
    }));
    try {
      await api<Task>(
        `/workspaces/${activeWorkspace?.id}/projects/${selectedProjectId}/tasks/${taskId}`,
        {
          method: 'PATCH',
          token,
          workspaceId: activeWorkspace?.id,
          body: { status },
        },
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal memindahkan tugas');
      await fetchTasks(selectedProjectId);
    }
  }

  return (
    <div className="projects">
      <header className="projects__header">
        <div>
          <h2 className="projects__title">Proyek & Tugas</h2>
          <p className="projects__subtitle">{activeWorkspace?.name}</p>
        </div>
        {manageProjects ? (
          <Button size="sm" onClick={() => setProjectDialog(true)}>
            + Proyek
          </Button>
        ) : null}
      </header>

      {error ? (
        <p className="projects__error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="projects__body">
        <aside className="projects__list" aria-label="Daftar proyek">
          {loading ? <p className="projects__empty">Memuat proyek…</p> : null}
          {!loading && projects.length === 0 ? (
            <p className="projects__empty">Belum ada proyek.</p>
          ) : null}
          {projects.map((project) => {
            const tasks = tasksByProject[project.id] ?? [];
            const done = tasks.filter((task) => task.status === 'DONE').length;
            return (
              <button
                key={project.id}
                className={`projects__item${project.id === selectedProjectId ? ' projects__item--active' : ''}`}
                onClick={() => setSelectedProjectId(project.id)}
              >
                <span className="projects__item-name">{project.name}</span>
                <span className="projects__item-meta">
                  {PROJECT_STATUS_LABEL[project.status] ?? project.status}
                  {tasks.length > 0 ? ` · ${done}/${tasks.length}` : ''}
                </span>
              </button>
            );
          })}
        </aside>

        <section className="projects__board-wrap" aria-label="Papan tugas">
          {selectedProject ? (
            <>
              <div className="projects__board-head">
                <div>
                  <h3 className="projects__board-title">{selectedProject.name}</h3>
                  {selectedProject.description ? (
                    <p className="projects__board-desc">{selectedProject.description}</p>
                  ) : null}
                </div>
                <div className="projects__board-head-actions">
                  <span className={`projects__priority ${PRIORITY_CLASS[selectedProject.priority] ?? ''}`}>
                    {PRIORITY_LABEL[selectedProject.priority] ?? selectedProject.priority}
                  </span>
                  {selectedProject.deadline ? (
                    <span className="projects__deadline">
                      Deadline {new Date(selectedProject.deadline).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                    </span>
                  ) : null}
                  {manageTasks ? (
                    <Button size="sm" onClick={() => setTaskDialog(true)}>
                      + Tugas
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="projects__board" ref={boardRef}>
                {TASK_COLUMNS.map((column) => (
                  <div
                    key={column}
                    className={`projects__column${dragOverColumn === column ? ' projects__column--over' : ''}`}
                    data-reveal
                    data-reveal-direction="up"
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragOverColumn(column);
                    }}
                    onDragLeave={() => setDragOverColumn((current) => (current === column ? null : current))}
                    onDrop={(event) => {
                      event.preventDefault();
                      setDragOverColumn(null);
                      if (dragTaskId && manageTasks) {
                        void moveTask(dragTaskId, column);
                      }
                      setDragTaskId(null);
                    }}
                  >
                    <h4 className="projects__column-title">
                      {TASK_COLUMN_LABEL[column]}
                      <span className="projects__column-count">{grouped[column].length}</span>
                    </h4>
                    <div className="projects__column-cards">
                      {grouped[column].map((task) => {
                        const assignee = members.find((member) => member.user.id === task.assigneeId);
                        const overdue =
                          task.deadline && task.status !== 'DONE'
                            ? new Date(task.deadline).getTime() < Date.now()
                            : false;
                        return (
                          <article
                            key={task.id}
                            className="projects__task"
                            draggable={manageTasks}
                            onDragStart={() => setDragTaskId(task.id)}
                            onDragEnd={() => setDragTaskId(null)}
                          >
                            <p className="projects__task-title">{task.title}</p>
                            {task.description ? (
                              <p className="projects__task-desc">{task.description}</p>
                            ) : null}
                            <div className="projects__task-meta">
                              <span className={`projects__priority ${PRIORITY_CLASS[task.priority] ?? ''}`}>
                                {PRIORITY_LABEL[task.priority] ?? task.priority}
                              </span>
                              {task.deadline ? (
                                <span className={overdue ? 'projects__deadline projects__deadline--late' : 'projects__deadline'}>
                                  {new Date(task.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                </span>
                              ) : null}
                              {assignee ? (
                                <span className="projects__assignee" title={assignee.user.displayName}>
                                  {assignee.user.displayName.slice(0, 2).toUpperCase()}
                                </span>
                              ) : null}
                            </div>
                          </article>
                        );
                      })}
                      {grouped[column].length === 0 ? (
                        <p className="projects__column-empty">—</p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            !loading && <p className="projects__empty">Pilih atau buat proyek untuk melihat papan tugas.</p>
          )}
        </section>
      </div>

      {projectDialog ? (
        <Modal title="Proyek baru" onClose={() => setProjectDialog(false)}>
          <form onSubmit={handleCreateProject}>
            <Field
              label="Nama proyek"
              placeholder="mis. Rilis v1.0"
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              minLength={2}
              maxLength={80}
              required
            />
            <Field
              label="Deskripsi (opsional)"
              placeholder="Tujuan proyek…"
              value={projectDescription}
              onChange={(event) => setProjectDescription(event.target.value)}
              maxLength={2000}
            />
            <div className="projects__form-row">
              <label className="field__label" htmlFor="project-priority">
                Prioritas
              </label>
              <select
                id="project-priority"
                className="projects__select"
                value={projectPriority}
                onChange={(event) => setProjectPriority(event.target.value as 'LOW' | 'MEDIUM' | 'HIGH')}
              >
                <option value="LOW">Rendah</option>
                <option value="MEDIUM">Sedang</option>
                <option value="HIGH">Tinggi</option>
              </select>
            </div>
            <Field
              label="Deadline (opsional)"
              type="date"
              value={projectDeadline}
              onChange={(event) => setProjectDeadline(event.target.value)}
            />
            <Button type="submit" loading={busy} disabled={projectName.trim().length < 2}>
              Buat proyek
            </Button>
          </form>
        </Modal>
      ) : null}

      {taskDialog && selectedProject ? (
        <Modal title={`Tugas baru — ${selectedProject.name}`} onClose={() => setTaskDialog(false)}>
          <form onSubmit={handleCreateTask}>
            <Field
              label="Judul tugas"
              placeholder="mis. Desain halaman login"
              value={taskTitle}
              onChange={(event) => setTaskTitle(event.target.value)}
              minLength={2}
              maxLength={200}
              required
            />
            <div className="projects__form-row">
              <label className="field__label" htmlFor="task-priority">
                Prioritas
              </label>
              <select
                id="task-priority"
                className="projects__select"
                value={taskPriority}
                onChange={(event) => setTaskPriority(event.target.value as 'LOW' | 'MEDIUM' | 'HIGH')}
              >
                <option value="LOW">Rendah</option>
                <option value="MEDIUM">Sedang</option>
                <option value="HIGH">Tinggi</option>
              </select>
            </div>
            <div className="projects__form-row">
              <label className="field__label" htmlFor="task-assignee">
                Assignee
              </label>
              <select
                id="task-assignee"
                className="projects__select"
                value={taskAssigneeId}
                onChange={(event) => setTaskAssigneeId(event.target.value)}
              >
                <option value="">— Belum ditentukan —</option>
                {members.map((member) => (
                  <option key={member.id} value={member.user.id}>
                    {member.user.displayName}
                  </option>
                ))}
              </select>
            </div>
            <Field
              label="Deadline (opsional)"
              type="date"
              value={taskDeadline}
              onChange={(event) => setTaskDeadline(event.target.value)}
            />
            <Button type="submit" loading={busy} disabled={taskTitle.trim().length < 2}>
              Buat tugas
            </Button>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
