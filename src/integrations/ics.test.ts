import { describe, expect, it } from 'vitest';
import { buildIcs, parseIcs } from './ics';
import { makeTask } from '../domain/testUtils';

const SAMPLE = [
  'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:test',
  'BEGIN:VEVENT', 'UID:a1', 'DTSTAMP:20261001T000000Z', 'DTSTART:20261013T150000Z', 'DTEND:20261013T170000Z', 'SUMMARY:Training', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:a2', 'DTSTAMP:20261001T000000Z', 'DTSTART:20261012T080000Z', 'DTEND:20261012T090000Z', 'RRULE:FREQ=WEEKLY;COUNT=3', 'SUMMARY:Les', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:a3', 'DTSTAMP:20261001T000000Z', 'DTSTART:20261014T080000Z', 'DTEND:20261014T090000Z', 'TRANSP:TRANSPARENT', 'SUMMARY:Vrij', 'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

describe('ics', () => {
  it('parses events, expands recurrences and skips free time', () => {
    const blocks = parseIcs(SAMPLE, new Date('2026-10-12T00:00:00Z'));
    expect(blocks).toHaveLength(4);
    expect(blocks.filter((b) => b.title === 'Les')).toHaveLength(3);
    expect(blocks.find((b) => b.title === 'Vrij')).toBeUndefined();
    expect(blocks.every((b) => b.source === 'ics')).toBe(true);
  });

  it('exports private events, generic titles hide task names', () => {
    const task = makeTask({ title: 'Geheim essay' });
    const session = { id: 's1', taskId: task.id, start: '2026-10-13T15:00:00.000Z', end: '2026-10-13T16:00:00.000Z', status: 'planned' as const, kind: 'work' as const, locked: false };
    const generic = buildIcs([session], [task], { generic: true, deadlines: false });
    expect(generic).toContain('CLASS:PRIVATE');
    expect(generic).toContain('DTSTART:20261013T150000Z');
    expect(generic).not.toContain('Geheim');
    const titled = buildIcs([session], [task], { generic: false, deadlines: true });
    expect(titled).toContain('SUMMARY:Planora: Geheim essay');
    expect(parseIcs(titled, new Date('2026-10-12T00:00:00Z')).length).toBe(1);
  });
});
