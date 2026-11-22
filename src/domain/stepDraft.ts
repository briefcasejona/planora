import { endOfDay, format } from 'date-fns';
import { type StepDateIssue, stepDateIssues } from './stepDue';
import type { ProjectStep } from './types';

/** A project step while it is being edited: not saved yet, so most fields are optional. */
export type StepDraft = Pick<ProjectStep, 'title' | 'estimateMin'> &
  Partial<Omit<ProjectStep, 'title' | 'estimateMin'>>;

export const STEP_WHO_MAX = 40;

/** The value of a date input (yyyy-MM-dd) as a step's due: the end of that local day. Empty or invalid gives none. */
export function dueFromDateInput(value: string): string | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? undefined : endOfDay(date).toISOString();
}

/** A step's due as the value of a date input (local day). */
export function dueToDateInput(due: string | undefined): string {
  return due ? format(new Date(due), 'yyyy-MM-dd') : '';
}

/**
 * Drafts as saved steps. Spreads each draft so fields this version does not know survive; trims the
 * title and "who" and drops an empty "who" or "due".
 */
export function toSavedSteps(drafts: StepDraft[], newId: () => string): ProjectStep[] {
  return drafts.map((s, i) => {
    const { who, due, ...rest } = s;
    const trimmedWho = who?.trim().slice(0, STEP_WHO_MAX);
    return {
      ...rest,
      id: s.id ?? newId(),
      title: s.title.trim(),
      order: i,
      done: !!s.done,
      ...(due ? { due } : {}),
      ...(trimmedWho ? { who: trimmedWho } : {}),
    };
  });
}

/** Date problems of the steps being edited; `index` is the position in `drafts`. */
export function draftStepIssues(
  drafts: StepDraft[],
  deadline: Date,
  now: Date,
): { index: number; kind: StepDateIssue['kind'] }[] {
  if (Number.isNaN(deadline.getTime())) return [];
  const steps = drafts.map((s, i) => ({ ...s, id: String(i), order: i, done: !!s.done }));
  return stepDateIssues({ steps, deadline: deadline.toISOString() }, now).map((x) => ({
    index: Number(x.stepId),
    kind: x.kind,
  }));
}
