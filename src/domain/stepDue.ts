import type { ScheduleWarning, Task, WorkSession } from './types';

interface StepWindow {
  earliest: Date;
  latest: Date;
}

export interface StepDateIssue {
  stepId: string;
  kind: 'before-previous' | 'after-deadline' | 'in-past';
}

/**
 * Consecutive windows, one per step in step order. A step with a due date ends its window there
 * (clamped to the project window and never before the previous window's end). Steps without a due
 * date share the stretch up to the next due date (or the project end) in proportion to their
 * remaining minutes; a step with a due date is the last one of its stretch.
 */
export function stepWindows(
  steps: { due?: string; remainingMin: number }[],
  earliest: Date,
  latest: Date,
): StepWindow[] {
  const windows: StepWindow[] = [];
  let runStart = 0;
  let segStart = earliest.getTime();
  const end = latest.getTime();
  while (runStart < steps.length) {
    let runEnd = runStart;
    while (runEnd < steps.length - 1 && !steps[runEnd].due) runEnd++;
    const anchored = steps[runEnd].due;
    const segEnd = anchored
      ? Math.max(segStart, Math.min(end, Math.max(earliest.getTime(), new Date(anchored).getTime())))
      : Math.max(segStart, end);
    const run = steps.slice(runStart, runEnd + 1);
    const total = run.reduce((a, s) => a + Math.max(0, s.remainingMin), 0);
    const span = segEnd - segStart;
    let cumulative = 0;
    for (const s of run) {
      const rem = Math.max(0, s.remainingMin);
      const from = total > 0 ? segStart + (span * cumulative) / total : segStart;
      cumulative += rem;
      const to = total > 0 ? segStart + (span * cumulative) / total : segEnd;
      windows.push({ earliest: new Date(from), latest: new Date(to) });
    }
    segStart = segEnd;
    runStart = runEnd + 1;
  }
  return windows;
}

/** Problems with the due dates of a project's open steps. */
export function stepDateIssues(task: Pick<Task, 'steps' | 'deadline'>, now: Date): StepDateIssue[] {
  if (!task.steps) return [];
  const ordered = [...task.steps].sort((a, b) => a.order - b.order);
  const deadline = new Date(task.deadline).getTime();
  const issues: StepDateIssue[] = [];
  let latestDue = Number.NEGATIVE_INFINITY;
  for (const step of ordered) {
    if (!step.due) continue;
    const due = new Date(step.due).getTime();
    if (!step.done) {
      if (due < latestDue) issues.push({ stepId: step.id, kind: 'before-previous' });
      else if (due > deadline) issues.push({ stepId: step.id, kind: 'after-deadline' });
      else if (due < now.getTime()) issues.push({ stepId: step.id, kind: 'in-past' });
    }
    latestDue = Math.max(latestDue, due);
  }
  return issues;
}

function lateStepIds(task: Task, sessions: WorkSession[], unplaced: ReadonlyMap<string, number>): string[] {
  const late: string[] = [];
  for (const step of task.steps ?? []) {
    if (step.done || !step.due) continue;
    const due = new Date(step.due).getTime();
    const endsLate = sessions.some(
      (s) =>
        s.taskId === task.id &&
        s.stepId === step.id &&
        (s.status === 'planned' || s.status === 'done') &&
        new Date(s.end).getTime() > due,
    );
    if (endsLate || (unplaced.get(step.id) ?? 0) > 0) late.push(step.id);
  }
  return late;
}

/** A 'step-late' warning for each open step whose planned work ends after its due date or is not fully placed. */
export function stepLateWarnings(
  tasks: Task[],
  sessions: WorkSession[],
  unplaced: ReadonlyMap<string, number>,
): ScheduleWarning[] {
  return tasks.flatMap((task) =>
    lateStepIds(task, sessions, unplaced).map((stepId) => ({ taskId: task.id, stepId, kind: 'step-late' as const })),
  );
}
