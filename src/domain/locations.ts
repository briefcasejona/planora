import type { Task } from './types';

/** How long a location stays a suggestion after its task's deadline. */
export const LOCATION_MEMORY_DAYS = 60;
const MAX_SUGGESTIONS = 20;

/**
 * Locations to suggest when adding a task: the ones on open tasks and on tasks whose deadline
 * was in the last 60 days, most recent deadline first, each name once (ignoring capitals).
 * A typo disappears when the user corrects the task, or after 60 days.
 */
export function locationSuggestions(tasks: Task[], now: Date): string[] {
  const since = now.getTime() - LOCATION_MEMORY_DAYS * 86400000;
  const recent = tasks
    .filter((t) => t.location?.trim() && (t.status === 'open' || new Date(t.deadline).getTime() >= since))
    .sort((a, b) => b.deadline.localeCompare(a.deadline));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of recent) {
    const name = (t.location ?? '').trim();
    const key = name.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
    if (out.length === MAX_SUGGESTIONS) break;
  }
  return out;
}
