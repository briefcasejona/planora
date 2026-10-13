import type { Task, WorkSession } from './types';

export interface FinishResult {
  task: Task;
  removedIds: string[];
  skipped: WorkSession[];
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
  };
}
