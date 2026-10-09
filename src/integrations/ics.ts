import ICAL from 'ical.js';
import { addDays } from 'date-fns';
import type { BusyBlock, EventCategory, Task, WorkSession } from '../domain/types';
import { detectCategory } from '../domain/categories';

/**
 * Parse an .ics file entirely on this device into busy blocks. Recurring
 * events are expanded within a window around today. `importId` groups the
 * blocks of one imported file so it can be replaced or removed on its own.
 * Every event gets `category` (what the user picked for the file), unless its
 * title says it is a test or excursion, or `overrides` has a choice for its UID.
 */
export function parseIcs(
  text: string,
  now = new Date(),
  importId?: string,
  category?: EventCategory,
  overrides: Record<string, EventCategory> = {},
): BusyBlock[] {
  const from = addDays(now, -14);
  const to = addDays(now, 180);
  const root = new ICAL.Component(ICAL.parse(text));
  const out: BusyBlock[] = [];
  for (const vevent of root.getAllSubcomponents('vevent')) {
    const event = new ICAL.Event(vevent);
    const transp = vevent.getFirstPropertyValue('transp');
    if (transp === 'TRANSPARENT') continue; // marked as "free"
    if (vevent.getFirstPropertyValue('status') === 'CANCELLED') continue;
    const title = event.summary || undefined;
    const eventCategory = overrides[event.uid] ?? detectCategory(title, category);
    const push = (start: Date, end: Date, allDay: boolean) => {
      if (end <= from || start >= to) return;
      out.push({
        id: 'ics:' + (importId ? importId + ':' : '') + event.uid + ':' + start.toISOString(),
        source: 'ics',
        importId,
        externalUid: event.uid,
        category: eventCategory,
        title,
        start: start.toISOString(),
        end: end.toISOString(),
        allDay: allDay || undefined,
      });
    };
    if (event.isRecurring()) {
      const it = event.iterator();
      for (let i = 0; i < 1000; i++) {
        const next = it.next();
        if (!next) break;
        const occ = event.getOccurrenceDetails(next);
        const start = occ.startDate.toJSDate();
        if (start >= to) break;
        push(start, occ.endDate.toJSDate(), occ.startDate.isDate);
      }
    } else if (event.startDate) {
      const end = event.endDate ?? event.startDate;
      push(event.startDate.toJSDate(), end.toJSDate(), event.startDate.isDate);
    }
  }
  return out;
}

/** A stable id for an imported file, so importing the same file again replaces it. */
export function importIdFor(fileName: string): string {
  return fileName.toLowerCase().replace(/\.ics$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'calendar';
}

const icsDate = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const escapeText = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

export interface IcsExportOptions {
  /** "Planora focus" instead of task names. */
  generic: boolean;
  deadlines: boolean;
  /** Minutes before each block for a reminder; 0 = none. */
  reminderMin?: number;
  /** Only these tasks (e.g. "add this task to my calendar"). */
  taskIds?: string[];
  /** UIDs exported earlier that are no longer planned; sent as cancelled so calendars remove them. */
  cancelUids?: string[];
  now?: Date;
}

export interface IcsExport {
  text: string;
  uids: string[];
}

/**
 * Export planned sessions (and optionally deadlines) for Apple Calendar or any
 * other calendar app. UIDs are stable per task and block number, so importing
 * a newer export updates the same events instead of adding duplicates.
 */
export function buildIcs(sessions: WorkSession[], tasks: Task[], opts: IcsExportOptions): IcsExport {
  const now = opts.now ?? new Date();
  const stamp = icsDate(now.toISOString());
  const sequence = Math.floor(now.getTime() / 1000);
  const wanted = (id: string) => !opts.taskIds || opts.taskIds.includes(id);
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Planora//Planora//NL',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Planora',
  ];
  const uids: string[] = [];
  const event = (uid: string, start: string, end: string, summary: string, opaque: boolean, alarm: boolean) => {
    uids.push(uid);
    lines.push(
      'BEGIN:VEVENT',
      'UID:' + uid,
      'DTSTAMP:' + stamp,
      'SEQUENCE:' + sequence,
      'DTSTART:' + icsDate(start),
      'DTEND:' + icsDate(end),
      'SUMMARY:' + escapeText(summary),
      'CLASS:PRIVATE',
      'TRANSP:' + (opaque ? 'OPAQUE' : 'TRANSPARENT'),
    );
    if (alarm && opts.reminderMin) {
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + escapeText(summary), 'TRIGGER:-PT' + opts.reminderMin + 'M', 'END:VALARM');
    }
    lines.push('END:VEVENT');
  };

  const perTask = new Map<string, WorkSession[]>();
  for (const s of sessions) {
    if (s.status !== 'planned' || !byId.has(s.taskId) || !wanted(s.taskId)) continue;
    perTask.set(s.taskId, [...(perTask.get(s.taskId) ?? []), s]);
  }
  for (const [taskId, list] of perTask) {
    const task = byId.get(taskId)!;
    list.sort((a, b) => a.start.localeCompare(b.start));
    list.forEach((s, i) => {
      event('planora-' + taskId + '-' + (i + 1) + '@planora.local', s.start, s.end, opts.generic ? 'Planora focus' : 'Planora: ' + task.title, true, true);
    });
  }
  if (opts.deadlines) {
    for (const t of tasks) {
      if (t.status !== 'open' || !wanted(t.id)) continue;
      event('planora-deadline-' + t.id + '@planora.local', t.deadline, t.deadline, opts.generic ? 'Deadline' : 'Deadline: ' + t.title, false, false);
    }
  }
  const current = new Set(uids);
  for (const uid of opts.cancelUids ?? []) {
    if (current.has(uid)) continue;
    lines.push('BEGIN:VEVENT', 'UID:' + uid, 'DTSTAMP:' + stamp, 'SEQUENCE:' + sequence, 'DTSTART:' + stamp, 'DTEND:' + stamp, 'SUMMARY:Planora', 'STATUS:CANCELLED', 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return { text: lines.join('\r\n') + '\r\n', uids };
}
