import { workedMinutes } from './scheduler';
import type { Task, WorkSession } from './types';

/** Planned sessions whose end time has passed without being checked off. */
export function findMissed(sessions: WorkSession[], now: Date): WorkSession[] {
  return sessions.filter((s) => s.status === 'planned' && new Date(s.end) < now);
}

export function markMissed(sessions: WorkSession[], now: Date): WorkSession[] {
  return findMissed(sessions, now).map((s) => ({ ...s, status: 'missed' as const, locked: false }));
}

/** Open tasks whose deadline has passed. */
export function findOverdue(tasks: Task[], now: Date): Task[] {
  return tasks.filter((t) => t.status === 'open' && new Date(t.deadline) <= now);
}

/** Tasks that should get a feedback card: finished, or past the deadline. */
export function feedbackDue(tasks: Task[], now: Date): Task[] {
  return tasks.filter(
    (t) =>
      !t.feedbackGiven &&
      (t.status === 'done' || t.status === 'overdue' || (t.status === 'open' && new Date(t.deadline) <= now)),
  );
}

export function doneMinutesFor(taskId: string, sessions: WorkSession[]): number {
  return sessions.filter((s) => s.taskId === taskId && s.status === 'done').reduce((a, s) => a + workedMinutes(s), 0);
}

/**
 * Reopen a task that was not finished or must be redone. The new plan covers
 * `remainingMin` on top of what was already worked.
 */
export function reopenTask(task: Task, sessions: WorkSession[], remainingMin: number, newDeadline?: string): Task {
  const done = doneMinutesFor(task.id, sessions);
  return {
    ...task,
    status: 'open',
    deadline: newDeadline ?? task.deadline,
    plannedEstimateMin: done + Math.max(5, remainingMin),
    completedAt: undefined,
    feedbackGiven: false,
    redoCount: task.redoCount + 1,
    steps: task.steps?.map((s) => ({ ...s })),
  };
}
