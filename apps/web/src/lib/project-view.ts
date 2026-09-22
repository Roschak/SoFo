import type { Project, Task } from './types';

/** Pure helpers for the Projects kanban UI — framework-free for unit tests. */

export const TASK_COLUMNS = ['TO_DO', 'IN_PROGRESS', 'REVIEW', 'DONE'] as const;
export type TaskColumn = (typeof TASK_COLUMNS)[number];

export const TASK_COLUMN_LABEL: Record<TaskColumn, string> = {
  TO_DO: 'To Do',
  IN_PROGRESS: 'In Progress',
  REVIEW: 'Review',
  DONE: 'Done',
};

export const PRIORITY_CLASS: Record<string, string> = {
  LOW: 'projects__priority--low',
  MEDIUM: 'projects__priority--medium',
  HIGH: 'projects__priority--high',
};

export const PRIORITY_LABEL: Record<string, string> = {
  LOW: 'Rendah',
  MEDIUM: 'Sedang',
  HIGH: 'Tinggi',
};

export const PROJECT_STATUS_LABEL: Record<string, string> = {
  PLANNING: 'Perencanaan',
  ACTIVE: 'Aktif',
  COMPLETED: 'Selesai',
  ARCHIVED: 'Arsip',
};

/** Group tasks by their status column, preserving TASK_COLUMNS order. */
export function groupByColumn(tasks: readonly Task[]): Record<TaskColumn, Task[]> {
  const grouped: Record<TaskColumn, Task[]> = {
    TO_DO: [],
    IN_PROGRESS: [],
    REVIEW: [],
    DONE: [],
  };
  for (const task of tasks) {
    const column = (TASK_COLUMNS as readonly string[]).includes(task.status)
      ? (task.status as TaskColumn)
      : 'TO_DO';
    grouped[column].push(task);
  }
  return grouped;
}

/** High first, then medium, then low; ties broken by newest deadline. */
export function sortByPriority(tasks: readonly Task[]): Task[] {
  const weight: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  return [...tasks].sort((a, b) => {
    const byPriority = (weight[a.priority] ?? 1) - (weight[b.priority] ?? 1);
    if (byPriority !== 0) return byPriority;
    const aDeadline = a.deadline ? new Date(a.deadline).getTime() : Number.POSITIVE_INFINITY;
    const bDeadline = b.deadline ? new Date(b.deadline).getTime() : Number.POSITIVE_INFINITY;
    return aDeadline - bDeadline;
  });
}

/** Deadline is in the past and the task is not done. */
export function isOverdue(task: Task): boolean {
  if (!task.deadline || task.status === 'DONE') return false;
  return new Date(task.deadline).getTime() < Date.now();
}

export function canManageProjects(role: string | undefined): boolean {
  return ['OWNER', 'ADMIN', 'MANAGER'].includes(role ?? '');
}

export function canManageTasks(role: string | undefined): boolean {
  return ['OWNER', 'ADMIN', 'MANAGER', 'STAFF', 'MEMBER'].includes(role ?? '');
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  deadline: string | null;
  taskCount: number;
  doneCount: number;
}

/** Shape a Project + its tasks into a summary row. */
export function toProjectSummary(project: Project, tasks: readonly Task[]): ProjectSummary {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
    priority: project.priority,
    deadline: project.deadline,
    taskCount: tasks.length,
    doneCount: tasks.filter((task) => task.status === 'DONE').length,
  };
}
