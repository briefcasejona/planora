import { dedupeBusy } from './busy';
import type { BusyBlock, EventCategory, Task } from './types';

/** Categories that come from a school or university timetable; the "buffer after lessons" applies to these. */
export const SCHOOL_CATEGORIES: EventCategory[] = ['lesson', 'lecture', 'tutorial', 'lab', 'test', 'excursion'];

// Dutch words are matched inside compounds too ("wiskundetoets", "hertentamen", "eindexamen").
const TEST_NL = /(toets|tentamen|proefwerk|examen)/i;
// English words only as whole words, so "Testosteron" or "examples" don't match.
const TEST_EN = /\b(test|tests|exam|exams|quiz|midterm)\b/i;
// Common school abbreviations, only in capitals: "SO Frans", "PW Engels".
const TEST_ABBR = /\b(SO|PW)\b/;
const EXCURSION = /(excursie|excursion|field ?trip|studiereis)/i;
// Hand-in moments from timetables and learning platforms ("Deadline essay", "Paper due", "Inleveren verslag").
const DEADLINE =
  /(deadline|inleveren|inlevermoment|inleverdatum|indienen|\bdue\b|\bhand[- ]?in\b|\bsubmission\b|\bsubmit\b)/i;
// All-day entries that are days off, not something to hand in.
const DAY_OFF = /(vakantie|vrije? dag|feestdag|holiday|vacation|\bbreak\b|reading week|studiedag|no classes|geen les)/i;

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

// The kind of class as timetables (TimeEdit, MyTimetable) write it in the event description.
const KIND_IN_TEXT: [RegExp, EventCategory][] = [
  [/(toetsing|assessment|tentamen|toets|\bexams?\b)/i, 'test'],
  [EXCURSION, 'excursion'],
  [/\b(practicum|lab|laboratorium)\b/i, 'lab'],
  [/\b(werkcollege|responsiecollege|werkgroep|tutorial|seminar|workgroup)\b/i, 'tutorial'],
  [/\b(hoorcollege|gastcollege|lecture)\b/i, 'lecture'],
];

/**
 * The kind of class named in an event's description ("Practicum", "Hoorcollege", "Toetsing / Assessments"),
 * or undefined. The kind mentioned first wins, so "Hoorcollege, tentamenvoorbereiding" stays a lecture.
 */
export function classKindFromText(text: string | undefined): EventCategory | undefined {
  if (!text) return undefined;
  let best: { at: number; kind: EventCategory } | undefined;
  for (const [re, kind] of KIND_IN_TEXT) {
    const at = text.search(re);
    if (at >= 0 && (!best || at < best.at)) best = { at, kind };
  }
  return best?.kind;
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
    .replace(new RegExp(TEST_ABBR.source, 'g'), ' ')
    .replace(new RegExp(DEADLINE.source, 'gi'), ' ');
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

/** A day off such as "Herfstvakantie" or "Reading week": not a class, whatever file it came from. */
export function isDayOff(title: string | undefined): boolean {
  return !!title && DAY_OFF.test(title);
}

/** A hand-in moment: the title says so (in Dutch or English), or an all-day entry that isn't a day off. */
export function isDeadlineEvent(block: BusyBlock): boolean {
  if (!block.title || block.repeatWeekdays?.length) return false;
  if (DEADLINE.test(block.title)) return true;
  return !!block.allDay && !DAY_OFF.test(block.title) && block.category !== 'test' && block.category !== 'excursion';
}

/**
 * A hand-in moment named in the title that doesn't take up time: all day, or a short entry such as
 * "Deadline essay 23:59". A one-hour "Deadline discussion" meeting is still busy time.
 */
export function isNamedDeadline(block: BusyBlock): boolean {
  if (!block.title || !DEADLINE.test(block.title)) return false;
  return !!block.allDay || new Date(block.end).getTime() - new Date(block.start).getTime() <= 30 * 60000;
}

/** When the work is due: the event's start, or the end of the day for an all-day entry. */
export function deadlineOf(block: BusyBlock): Date {
  const start = new Date(block.start);
  if (!block.allDay) return start;
  start.setHours(23, 59, 0, 0);
  return start;
}

/**
 * Stable key of a deadline entry. It leaves out which file it came from, so a newer export saved under
 * another file name doesn't bring back deadlines that were already added or hidden.
 */
export function deadlineKey(block: BusyBlock): string {
  return ['deadline', block.externalUid ?? block.title ?? '', deadlineOf(block).toISOString()].join('|');
}

/**
 * Deadline entries in imported calendars that have no task yet and were not hidden, earliest first.
 * Importing a newer export of the same calendar again brings back only entries that are new.
 * A task with its deadline at the same moment counts as already added.
 */
export function deadlineSuggestions(
  busy: BusyBlock[],
  tasks: Task[],
  dismissed: string[],
  now: Date,
  horizonDays = 180,
): BusyBlock[] {
  const taken = new Set([...dismissed, ...tasks.map((t) => t.externalId).filter(Boolean)]);
  const deadlines = tasks.filter((t) => t.status !== 'dropped').map((t) => new Date(t.deadline).getTime());
  const until = now.getTime() + horizonDays * 86400000;
  const seen = new Set<string>();
  return busy
    .filter((b) => b.source === 'ics' && isDeadlineEvent(b))
    .filter((b) => deadlineOf(b).getTime() > now.getTime() && deadlineOf(b).getTime() <= until)
    .sort((a, b) => deadlineOf(a).getTime() - deadlineOf(b).getTime())
    .filter((b) => {
      const key = deadlineKey(b);
      if (seen.has(key) || taken.has(key)) return false;
      seen.add(key);
      return !deadlines.some((d) => Math.abs(d - deadlineOf(b).getTime()) <= 60000);
    });
}

// Words for the kind of class, left out when reading a course name from a timetable entry.
const CLASS_WORDS =
  /\b(hoorcollege|werkcollege|responsiecollege|college|practicum|lecture|tutorial|seminar|lab|workshop|les|lesson)\b/gi;

/** Course names read from the classes in imported timetables ("Werkcollege Filosofie" → "Filosofie"). */
export function timetableCourses(busy: BusyBlock[]): string[] {
  const names = new Map<string, string>();
  for (const b of busy) {
    if (b.source !== 'ics' || !b.title || !b.category || !SCHOOL_CATEGORIES.includes(b.category)) continue;
    if (b.category === 'test' || b.category === 'excursion' || isDeadlineEvent(b) || isDayOff(b.title)) continue;
    const name = courseName(b.title);
    if (name.length >= 3 && !names.has(name.toLowerCase())) names.set(name.toLowerCase(), name);
  }
  return [...names.values()];
}

/**
 * The course in a timetable entry's title: "AA1445. Wereldwijs, GIS analyse 2" → "Wereldwijs" (course code
 * and topic left out), "Werkcollege Filosofie" → "Filosofie".
 */
export function courseName(title: string): string {
  const withoutCode = title.replace(/^\s*[A-Z]{1,5}\s?\d{2,6}\s*\.?\s*/, '');
  const coded = withoutCode !== title;
  const main = coded || withoutCode.includes(',') ? withoutCode.split(',')[0] : withoutCode;
  return main.replace(CLASS_WORDS, ' ').replace(/\s+/g, ' ').trim();
}
