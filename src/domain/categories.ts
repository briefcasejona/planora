import { dedupeBusy } from './busy';
import type { BusyBlock, EventCategory, Task } from './types';

/** Categories that come from a school timetable; the "buffer after lessons" applies to these. */
export const SCHOOL_CATEGORIES: EventCategory[] = ['lesson', 'test', 'excursion'];

// Dutch words are matched inside compounds too ("wiskundetoets", "hertentamen", "eindexamen").
const TEST_NL = /(toets|tentamen|proefwerk|examen)/i;
// English words only as whole words, so "Testosteron" or "examples" don't match.
const TEST_EN = /\b(test|tests|exam|exams|quiz|midterm)\b/i;
// Common school abbreviations, only in capitals: "SO Frans", "PW Engels".
const TEST_ABBR = /\b(SO|PW)\b/;
const EXCURSION = /(excursie|excursion|field ?trip|studiereis)/i;

/**
 * The category of an event, guessed from its title. Tests and excursions are
 * recognised by keyword; anything else gets `fallback` (e.g. the category the
 * user picked for the whole imported file).
 */
export function detectCategory(title: string | undefined, fallback?: EventCategory): EventCategory | undefined {
  if (title) {
    if (TEST_NL.test(title) || TEST_EN.test(title) || TEST_ABBR.test(title)) return 'test';
    if (EXCURSION.test(title)) return 'excursion';
  }
  return fallback;
}

/** Stable key of one event occurrence, used to link a study task to the test it prepares for. */
export function eventKey(block: BusyBlock): string {
  return [block.source, block.importId ?? '', block.externalUid ?? block.id, block.start].join('|');
}

/**
 * Guess the subject of a test from its title: a subject the user already uses,
 * otherwise the first real word once the test keywords are removed
 * ("Toets Biologie H3" → "Biologie", "Wiskundetoets" → "Wiskunde").
 */
export function guessSubject(title: string, knownSubjects: string[] = []): string | undefined {
  const lower = title.toLowerCase();
  const known = knownSubjects.find((s) => s && lower.includes(s.toLowerCase()));
  if (known) return known;
  const rest = title
    .replace(new RegExp(TEST_NL.source, 'gi'), ' ')
    .replace(new RegExp(TEST_EN.source, 'gi'), ' ')
    .replace(new RegExp(TEST_ABBR.source, 'g'), ' ');
  const word = rest.split(/[^\p{L}]+/u).find((w) => w.length >= 3);
  return word ? word[0].toUpperCase() + word.slice(1) : undefined;
}

/**
 * Upcoming tests in the calendar that have no study task yet and were not
 * dismissed, earliest first. Repeating events are skipped: a test happens once.
 * The same test from two calendars (timetable file and Outlook) is suggested
 * once, and a test task with its deadline at the test's start counts as done.
 */
export function testSuggestions(
  busy: BusyBlock[],
  tasks: Task[],
  dismissed: string[],
  now: Date,
  horizonDays = 60,
): BusyBlock[] {
  const taken = new Set([...dismissed, ...tasks.map((t) => t.externalId).filter(Boolean)]);
  const testDeadlines = tasks
    .filter((t) => t.type === 'test' && t.status !== 'dropped')
    .map((t) => new Date(t.deadline).getTime());
  const until = now.getTime() + horizonDays * 86400000;
  const candidates = busy
    .filter((b) => b.category === 'test' && !b.repeatWeekdays?.length)
    .map((block) => ({ start: new Date(block.start), end: new Date(block.end), block }))
    .filter((x) => +x.start > now.getTime() && +x.start <= until);
  return dedupeBusy(candidates)
    .map((x) => x.block)
    .filter(
      (b) => !taken.has(eventKey(b)) && !testDeadlines.some((d) => Math.abs(d - new Date(b.start).getTime()) <= 60000),
    );
}
