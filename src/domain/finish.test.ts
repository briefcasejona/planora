import { describe, expect, it } from 'vitest';
import { canUndoFinish, finishTask } from './finish';
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

  it('remembers the task and its planned blocks exactly as they were', () => {
    const { undo } = finishTask(task, sessions, now);
    expect(undo.task).toBe(task);
    expect(undo.task.steps?.map((s) => s.done)).toEqual([false, true]);
    expect(undo.sessions.map((s) => s.id)).toEqual(['past', 'future', 'locked']);
    expect(undo.sessions.every((s) => s.status === 'planned')).toBe(true);
    expect(undo.sessions.find((s) => s.id === 'locked')?.locked).toBe(true);
  });

  it('can be undone only while the task is still done', () => {
    const r = finishTask(task, sessions, now);
    expect(canUndoFinish(r.undo, [r.task])).toBe(true);
    expect(canUndoFinish(null, [r.task])).toBe(false);
    expect(canUndoFinish(r.undo, [])).toBe(false);
    expect(canUndoFinish(r.undo, [{ ...r.task, status: 'open', completedAt: undefined }])).toBe(false);
  });
});
