import { describe, expect, it } from 'vitest';
import { finishTask } from './finish';
import { makeTask } from './testUtils';
import type { WorkSession } from './types';
import { canUndo, pick, type UndoEntry } from './undo';

const now = new Date('2026-10-13T10:00:00.000Z');
const session = (id: string, taskId: string, start: string): WorkSession => ({
  id,
  taskId,
  start,
  end: new Date(new Date(start).getTime() + 45 * 60_000).toISOString(),
  status: 'planned',
  kind: 'study',
  locked: id === 'locked',
});

describe('undo', () => {
  const task = makeTask();
  const sessions = [
    session('future', task.id, '2026-10-14T15:00:00.000Z'),
    session('locked', task.id, '2026-10-15T15:00:00.000Z'),
  ];
  const before = { tasks: [task], sessions };
  const r = finishTask(task, sessions, now);
  const afterState = { tasks: [r.task], sessions: [] };
  const entry: UndoEntry = {
    id: 1,
    kind: 'complete',
    taskId: task.id,
    title: task.title,
    before: pick(before, [task.id], ['future', 'locked']),
    after: pick(afterState, [task.id], ['future', 'locked']),
  };

  it('keeps the task and its blocks exactly as they were', () => {
    expect(entry.before.tasks).toEqual([task]);
    expect(entry.before.sessions.map((s) => [s.id, s.locked])).toEqual([
      ['future', false],
      ['locked', true],
    ]);
    expect(entry.after.sessions).toEqual([]);
  });

  it('is possible while nothing else changed those records', () => {
    expect(canUndo(entry, afterState)).toBe(true);
    // A new database stamp alone is not a change.
    expect(canUndo(entry, { tasks: [{ ...r.task, updatedAt: 'later' }], sessions: [] })).toBe(true);
    expect(canUndo(null, afterState)).toBe(false);
  });

  it('is cancelled once something newer touched them', () => {
    expect(canUndo(entry, { tasks: [{ ...r.task, feedbackGiven: true }], sessions: [] })).toBe(false);
    expect(canUndo(entry, { tasks: [], sessions: [] })).toBe(false);
    expect(canUndo(entry, { tasks: [r.task], sessions: [sessions[0]] })).toBe(false);
  });

  it('checks a moved or re-marked block the same way', () => {
    const moved = { ...sessions[0], start: '2026-10-14T18:00:00.000Z', locked: true };
    const e: UndoEntry = {
      ...entry,
      kind: 'move',
      before: { tasks: [], sessions: [sessions[0]] },
      after: { tasks: [], sessions: [moved] },
    };
    expect(canUndo(e, { tasks: [], sessions: [moved] })).toBe(true);
    expect(canUndo(e, { tasks: [], sessions: [{ ...moved, start: '2026-10-14T19:00:00.000Z' }] })).toBe(false);
  });
});
