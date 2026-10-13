import type { Task, WorkSession } from './types';

/** What finishing a task changed, kept in memory so an accidental "Finish" can be undone. */
export interface FinishUndo {
  /** The task as it was before it was finished. */
  task: Task;
  /** Its planned sessions as they were before: the future ones were removed, the past ones marked skipped. */
  sessions: WorkSession[];
}

export interface FinishResult {
  task: Task;
  removedIds: string[];
  skipped: WorkSession[];
  undo: FinishUndo;
}

/** Finish a task: every step done, future planned sessions removed, past planned ones skipped. */
export function finishTask(task: Task, sessions: WorkSession[], now: Date): FinishResult {
  const leftovers = sessions.filter((s) => s.taskId === task.id && s.status === 'planned');
  return {
    task: {
      ...task,
      status: 'done',
      completedAt: now.toISOString(),
      steps: task.steps?.map((s) => ({ ...s, done: true })),
    },
    removedIds: leftovers.filter((s) => new Date(s.start) >= now).map((s) => s.id),
    skipped: leftovers.filter((s) => new Date(s.start) < now).map((s) => ({ ...s, status: 'skipped' as const })),
    undo: { task, sessions: leftovers },
  };
}

/**
 * Whether a finish can still be undone: the task must still exist and still be done.
 * After that the user may have reopened, edited or deleted it, possibly on another device.
 */
export function canUndoFinish(undo: FinishUndo | null, tasks: Task[]): undo is FinishUndo {
  if (!undo) return false;
  const current = tasks.find((t) => t.id === undo.task.id);
  return !!current && current.status === 'done' && current.completedAt !== undefined;
}
