import { addWeeks, endOfDay, parseISO } from 'date-fns';
import type { Course, Task } from './types';

/** The most weeks one "repeat every week" creates (a full academic year). */
export const MAX_WEEKS = 52;

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Every course the user has: the ones with dates plus every subject used on a task, sorted by name. */
export function courseList(courses: Course[] = [], tasks: Pick<Task, 'subject'>[] = []): Course[] {
  const out = [...courses.filter((c) => c.name.trim())];
  for (const t of tasks) {
    const name = t.subject?.trim();
    if (name && !out.some((c) => same(c.name, name))) out.push({ name });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export function findCourse(courses: Course[] = [], name?: string): Course | undefined {
  return name?.trim() ? courses.find((c) => same(c.name, name)) : undefined;
}

/** Save one course's dates; a course left without dates is removed (it lives on as a task subject). */
export function upsertCourse(courses: Course[] = [], course: Course): Course[] {
  const rest = courses.filter((c) => !same(c.name, course.name));
  const hasDates = !!(course.termEnd || course.examStart || course.examEnd);
  return hasDates ? [...rest, course] : rest;
}

/** The deadlines of a weekly task: the first one, then every 7 days up to and including the `until` day. */
export function weeklyDeadlines(first: Date, until: string): Date[] {
  const last = endOfDay(parseISO(until));
  const out: Date[] = [];
  for (let i = 0; i < MAX_WEEKS; i++) {
    const d = addWeeks(first, i);
    if (d > last) break;
    out.push(d);
  }
  return out;
}

/** The weeks of a series an edit or deletion applies to: just this one, or this one and every later one. */
export function seriesScope(tasks: Task[], task: Task, scope: 'one' | 'later'): Task[] {
  if (scope === 'one' || !task.seriesId) return [task];
  return tasks
    .filter((t) => t.seriesId === task.seriesId && t.deadline >= task.deadline)
    .sort((a, b) => a.deadline.localeCompare(b.deadline));
}
