import { describe, expect, it } from 'vitest';
import { schedule } from './scheduler';
import { makeTask, prefsEveryEvening, seqId } from './testUtils';
import type { ProjectStep } from './types';

const NOW = new Date(2026, 9, 12, 9, 0);

function project(steps: ProjectStep[]) {
  return makeTask({
    type: 'project',
    deadline: new Date(2026, 9, 30, 9, 0).toISOString(),
    userEstimateMin: 240,
    plannedEstimateMin: 240,
    steps,
  });
}

const step = (id: string, order: number, due?: string): ProjectStep => ({
  id,
  title: id,
  estimateMin: 120,
  order,
  done: false,
  due,
});

function run(task: ReturnType<typeof project>) {
  return schedule({
    now: NOW,
    tasks: [task],
    sessions: [],
    busy: [],
    prefs: prefsEveryEvening(),
    feedback: [],
    newId: seqId,
  });
}

describe('schedule with step due dates', () => {
  it('plans a step with an early due date before that date', () => {
    const due = new Date(2026, 9, 16, 23, 59, 59, 999);
    const task = project([step('a', 0, due.toISOString()), step('b', 1)]);
    const result = run(task);
    const a = result.created.filter((s) => s.stepId === 'a');
    expect(a.length).toBeGreaterThan(0);
    expect(a.every((s) => new Date(s.end) <= due)).toBe(true);
    expect(result.warnings.filter((w) => w.kind === 'step-late')).toEqual([]);
  });

  it('warns when a due date cannot be met', () => {
    const due = new Date(2026, 9, 12, 17, 0);
    const task = project([step('a', 0, due.toISOString()), step('b', 1)]);
    const result = run(task);
    expect(result.warnings).toContainEqual({ taskId: task.id, stepId: 'a', kind: 'step-late' });
    expect(result.warnings.some((w) => w.kind === 'step-late' && w.stepId === 'b')).toBe(false);
  });
});
