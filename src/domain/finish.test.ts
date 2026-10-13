import { describe, expect, it } from 'vitest';
import { finishTask } from './finish';
import { makeTask } from './testUtils';
import type { WorkSession } from './types';

const now = new Date('2026-10-13T10:00:00.000Z');
const session = (
  id: string,
  taskId: string,
  start: string,
  status: WorkSession['status'] = 'planned',
): WorkSession => ({
  id,
  taskId,
  start,
  end: new Date(new Date(start).getTime() + 45 * 60_000).toISOString(),
  status,
  kind: 'study',
  locked: id === 'locked',
});

describe('finishing a task', () => {
  const task = makeTask({
    steps: [
      { id: 's1', title: 'Read', done: false, order: 0, estimateMin: 60 },
      { id: 's2', title: 'Write', done: true, order: 1, estimateMin: 60 },
    ],
  });
  const sessions = [
    session('past', task.id, '2026-10-12T15:00:00.000Z'),
    session('worked', task.id, '2026-10-11T15:00:00.000Z', 'done'),
    session('future', task.id, '2026-10-14T15:00:00.000Z'),
    session('locked', task.id, '2026-10-15T15:00:00.000Z'),
    session('other', 'someone-else', '2026-10-14T15:00:00.000Z'),
  ];

  it('marks it done, removes future blocks and skips past ones', () => {
    const r = finishTask(task, sessions, now);
    expect(r.task.status).toBe('done');
    expect(r.task.completedAt).toBe(now.toISOString());
    expect(r.task.steps?.every((s) => s.done)).toBe(true);
    expect(r.removedIds).toEqual(['future', 'locked']);
    expect(r.skipped.map((s) => [s.id, s.status])).toEqual([['past', 'skipped']]);
  });

  it('leaves the original task untouched, so it can be put back', () => {
    finishTask(task, sessions, now);
    expect(task.status).toBe('open');
    expect(task.steps?.map((s) => s.done)).toEqual([false, true]);
  });
});
