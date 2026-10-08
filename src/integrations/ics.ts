import ICAL from 'ical.js';
import { addDays } from 'date-fns';
import type { BusyBlock, Task, WorkSession } from '../domain/types';

/**
 * Parse an .ics file entirely on this device into busy blocks. Recurring
 * events are expanded within a window around today.
 */
export function parseIcs(text: string, now = new Date()): BusyBlock[] {
  const from = addDays(now, -14);
  const to = addDays(now, 180);
  const root = new ICAL.Component(ICAL.parse(text));
  const out: BusyBlock[] = [];
  for (const vevent of root.getAllSubcomponents('vevent')) {
    const event = new ICAL.Event(vevent);
    const transp = vevent.getFirstPropertyValue('transp');
    if (transp === 'TRANSPARENT') continue; // marked as "free"
    const push = (start: Date, end: Date, allDay: boolean) => {
      if (end <= from || start >= to) return;
      out.push({
        id: 'ics:' + event.uid + ':' + start.toISOString(),
        source: 'ics',
        title: event.summary || undefined,
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

const icsDate = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const escapeText = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

/** Export planned sessions (and optionally deadlines) as an .ics file for any calendar app. */
export function buildIcs(sessions: WorkSession[], tasks: Task[], opts: { generic: boolean; deadlines: boolean }): string {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const stamp = icsDate(new Date().toISOString());
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Planora//Planora//NL', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const s of sessions) {
    const task = byId.get(s.taskId);
    if (!task || s.status !== 'planned') continue;
    lines.push(
      'BEGIN:VEVENT',
      'UID:' + s.id + '@planora.local',
      'DTSTAMP:' + stamp,
      'DTSTART:' + icsDate(s.start),
      'DTEND:' + icsDate(s.end),
      'SUMMARY:' + escapeText(opts.generic ? 'Planora focus' : 'Planora: ' + task.title),
      'CLASS:PRIVATE',
      'TRANSP:OPAQUE',
      'END:VEVENT',
    );
  }
  if (opts.deadlines) {
    for (const t of tasks) {
      if (t.status !== 'open') continue;
      lines.push(
        'BEGIN:VEVENT',
        'UID:deadline-' + t.id + '@planora.local',
        'DTSTAMP:' + stamp,
        'DTSTART:' + icsDate(t.deadline),
        'DTEND:' + icsDate(t.deadline),
        'SUMMARY:' + escapeText(opts.generic ? 'Deadline' : 'Deadline: ' + t.title),
        'CLASS:PRIVATE',
        'TRANSP:TRANSPARENT',
        'END:VEVENT',
      );
    }
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}
