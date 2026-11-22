import { describe, expect, it } from 'vitest';
import { stepDateIssues, stepWindows } from './stepDue';
import { makeTask } from './testUtils';
import type { ProjectStep } from './types';

const earliest = new Date(2026, 9, 12, 9, 0);
const latest = new Date(2026, 9, 22, 9, 0);
const day = (d: number) => new Date(2026, 9, d, 23, 59, 59, 999);
const span = latest.getTime() - earliest.getTime();

describe('stepWindows', () => {
  it('splits the window in proportion to remaining minutes when no step has a due date', () => {
    const w = stepWindows([{ remainingMin: 60 }, { remainingMin: 180 }], earliest, latest);
    expect(w[0].earliest).toEqual(earliest);
    expect(w[0].latest.getTime()).toBe(earliest.getTime() + span * 0.25);
    expect(w[1].earliest).toEqual(w[0].latest);
    expect(w[1].latest).toEqual(latest);
  });

  it('ends a step at its due date and shares the rest between the steps around it', () => {
    const due = day(15).toISOString();
    const w = stepWindows([{ remainingMin: 60 }, { due, remainingMin: 60 }, { remainingMin: 60 }], earliest, latest);
    expect(w[0].latest.getTime()).toBeCloseTo(earliest.getTime() + (day(15).getTime() - earliest.getTime()) / 2, -1);
    expect(w[1].latest).toEqual(day(15));
    expect(w[2].earliest).toEqual(day(15));
    expect(w[2].latest).toEqual(latest);
  });

  it('clamps due dates to the project window', () => {
    const w = stepWindows(
      [
        { due: new Date(2026, 9, 1).toISOString(), remainingMin: 60 },
        { due: new Date(2026, 10, 30).toISOString(), remainingMin: 60 },
      ],
      earliest,
      latest,
    );
    expect(w[0].latest).toEqual(earliest);
    expect(w[1].earliest).toEqual(earliest);
    expect(w[1].latest).toEqual(latest);
  });

  it('never goes backwards when due dates are out of order', () => {
    const w = stepWindows(
      [
        { due: day(18).toISOString(), remainingMin: 60 },
        { due: day(14).toISOString(), remainingMin: 60 },
        { remainingMin: 60 },
      ],
      earliest,
      latest,
    );
    for (let i = 0; i < w.length; i++) {
      expect(w[i].latest.getTime()).toBeGreaterThanOrEqual(w[i].earliest.getTime());
      if (i > 0) expect(w[i].earliest).toEqual(w[i - 1].latest);
    }
    expect(w[1].latest).toEqual(day(18));
  });
});

describe('stepDateIssues', () => {
  const now = new Date(2026, 9, 12, 9, 0);
  const step = (id: string, order: number, over: Partial<ProjectStep> = {}): ProjectStep => ({
    id,
    title: id,
    estimateMin: 60,
    order,
    done: false,
    ...over,
  });
  const project = (steps: ProjectStep[]) =>
    makeTask({ type: 'project', deadline: new Date(2026, 9, 30, 23, 59).toISOString(), steps });

  it('finds a due date before an earlier step, after the deadline, or in the past', () => {
    const task = project([
      step('a', 0, { due: day(20).toISOString() }),
      step('b', 1, { due: day(16).toISOString() }),
      step('c', 2, { due: new Date(2026, 10, 5).toISOString() }),
      step('d', 3, { due: new Date(2026, 9, 1).toISOString() }),
    ]);
    const kinds = Object.fromEntries(stepDateIssues(task, now).map((i) => [i.stepId, i.kind]));
    expect(kinds).toEqual({ b: 'before-previous', c: 'after-deadline', d: 'before-previous' });
  });

  it('flags a passed due date that is not done and ignores done steps', () => {
    const task = project([
      step('a', 0, { due: new Date(2026, 9, 1).toISOString() }),
      step('b', 1, { due: new Date(2026, 9, 2).toISOString(), done: true }),
    ]);
    expect(stepDateIssues(task, now)).toEqual([{ stepId: 'a', kind: 'in-past' }]);
  });

  it('reports nothing without due dates', () => {
    expect(stepDateIssues(project([step('a', 0), step('b', 1)]), now)).toEqual([]);
  });
});
