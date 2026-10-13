import type { Task, WorkSession } from './types';

/** Actions that lose something another tap can't bring back, so they offer Undo. */
export type UndoKind = 'complete' | 'drop' | 'sessionStatus' | 'move';

export interface Records {
  tasks: Task[];
  sessions: WorkSession[];
}

/**
 * What one action changed: the records it touched as they were before, and as they were
 * right after (a record missing from `after` was removed). Kept in memory only.
 */
export interface UndoEntry {
  id: number;
  kind: UndoKind;
  /** The task the action was about, for the message and the task window. */
  taskId: string;
  title: string;
  before: Records;
  after: Records;
}

/** Copy the records with these ids out of the current state (missing ones are left out). */
export function pick(state: Records, taskIds: string[], sessionIds: string[]): Records {
  const t = new Set(taskIds);
  const s = new Set(sessionIds);
  return { tasks: state.tasks.filter((x) => t.has(x.id)), sessions: state.sessions.filter((x) => s.has(x.id)) };
}

function same<T extends { updatedAt?: string }>(a: T | undefined, b: T | undefined): boolean {
  if (!a || !b) return a === b;
  const { updatedAt: _a, ...ra } = a;
  const { updatedAt: _b, ...rb } = b;
  return JSON.stringify(ra) === JSON.stringify(rb);
}

/**
 * Undo is only safe while nothing else changed the same records since the action
 * (a sync from another device, a later edit, a rating). Otherwise it would overwrite newer data.
 */
export function canUndo(entry: UndoEntry | null, state: Records): entry is UndoEntry {
  if (!entry) return false;
  const ids = (xs: { id: string }[]) => xs.map((x) => x.id);
  const now = pick(state, ids(entry.before.tasks), ids(entry.before.sessions));
  const tasksOk = entry.before.tasks.every((b) =>
    same(
      entry.after.tasks.find((x) => x.id === b.id),
      now.tasks.find((x) => x.id === b.id),
    ),
  );
  const sessionsOk = entry.before.sessions.every((b) =>
    same(
      entry.after.sessions.find((x) => x.id === b.id),
      now.sessions.find((x) => x.id === b.id),
    ),
  );
  return tasksOk && sessionsOk;
}
