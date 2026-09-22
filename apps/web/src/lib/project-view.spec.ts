import { describe, expect, it } from 'vitest';
import {
  groupByColumn,
  isOverdue,
  sortByPriority,
  toProjectSummary,
} from './project-view';
import type { Task } from './types';

function task(overrides: Partial<Task>): Task {
  return {
    id: 't',
    projectId: 'p',
    title: 'Task',
    description: null,
    status: 'TO_DO',
    priority: 'MEDIUM',
    assigneeId: null,
    deadline: null,
    ...overrides,
  };
}

describe('groupByColumn', () => {
  it('groups tasks into the four kanban columns', () => {
    const grouped = groupByColumn([
      task({ id: '1', status: 'TO_DO' }),
      task({ id: '2', status: 'IN_PROGRESS' }),
      task({ id: '3', status: 'REVIEW' }),
      task({ id: '4', status: 'DONE' }),
      task({ id: '5', status: 'TO_DO' }),
    ]);
    expect(grouped.TO_DO.map((entry) => entry.id)).toEqual(['1', '5']);
    expect(grouped.IN_PROGRESS.map((entry) => entry.id)).toEqual(['2']);
    expect(grouped.REVIEW.map((entry) => entry.id)).toEqual(['3']);
    expect(grouped.DONE.map((entry) => entry.id)).toEqual(['4']);
  });

  it('routes unknown statuses to TO_DO instead of dropping them', () => {
    const grouped = groupByColumn([task({ id: 'x', status: 'WEIRD' })]);
    expect(grouped.TO_DO.map((entry) => entry.id)).toEqual(['x']);
  });
});

describe('sortByPriority', () => {
  it('orders HIGH before MEDIUM before LOW', () => {
    const sorted = sortByPriority([
      task({ id: 'low', priority: 'LOW' }),
      task({ id: 'high', priority: 'HIGH' }),
      task({ id: 'med', priority: 'MEDIUM' }),
    ]);
    expect(sorted.map((entry) => entry.id)).toEqual(['high', 'med', 'low']);
  });

  it('breaks ties by earliest deadline first', () => {
    const sorted = sortByPriority([
      task({ id: 'late', deadline: '2026-06-01T00:00:00.000Z' }),
      task({ id: 'soon', deadline: '2026-01-01T00:00:00.000Z' }),
    ]);
    expect(sorted.map((entry) => entry.id)).toEqual(['soon', 'late']);
  });
});

describe('isOverdue', () => {
  it('flags past deadlines on unfinished tasks', () => {
    expect(isOverdue(task({ deadline: '2000-01-01T00:00:00.000Z' }))).toBe(true);
  });

  it('ignores done tasks and missing deadlines', () => {
    expect(isOverdue(task({ status: 'DONE', deadline: '2000-01-01T00:00:00.000Z' }))).toBe(false);
    expect(isOverdue(task({ deadline: null }))).toBe(false);
    expect(isOverdue(task({ deadline: '2999-01-01T00:00:00.000Z' }))).toBe(false);
  });
});

describe('toProjectSummary', () => {
  it('counts total and done tasks', () => {
    const summary = toProjectSummary(
      {
        id: 'p',
        name: 'Proyek',
        description: null,
        status: 'ACTIVE',
        priority: 'HIGH',
        deadline: null,
        ownerId: 'u',
      },
      [task({ status: 'DONE' }), task({}), task({})],
    );
    expect(summary.taskCount).toBe(3);
    expect(summary.doneCount).toBe(1);
  });
});
