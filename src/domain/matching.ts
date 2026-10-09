import { isSameDay } from 'date-fns';
import type { Task } from './types';

const words = (s: string) =>
  s
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

/** Titles that are very likely the same thing, ignoring case and punctuation. */
export function similarTitles(a: string, b: string): boolean {
  const wa = words(a);
  const wb = words(b);
  if (!wa.length || !wb.length) return false;
  const ja = wa.join(' ');
  const jb = wb.join(' ');
  if (ja === jb) return true;
  const [short, long] = ja.length <= jb.length ? [ja, jb] : [jb, ja];
  if (short.length >= 4 && (' ' + long + ' ').includes(' ' + short + ' ')) return true;
  const sb = new Set(wb);
  const common = new Set(wa.filter((w) => sb.has(w))).size;
  return common / Math.max(new Set(wa).size, sb.size) >= 0.8;
}

/**
 * A task the user already entered by hand for an item from Teams or To Do:
 * still open, not linked to anything yet, a similar title and the deadline on the same day.
 */
export function findManualMatch(candidate: { title: string; due?: string }, tasks: Task[]): Task | undefined {
  if (!candidate.due) return undefined;
  const due = new Date(candidate.due);
  return tasks.find(
    (t) =>
      !t.externalId &&
      (t.status === 'open' || t.status === 'overdue') &&
      isSameDay(new Date(t.deadline), due) &&
      similarTitles(t.title, candidate.title),
  );
}
