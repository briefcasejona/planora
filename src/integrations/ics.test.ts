import { describe, expect, it } from 'vitest';
import { buildIcs, importIdFor, parseIcs } from './ics';
import { makeTask } from '../domain/testUtils';
import type { WorkSession } from '../domain/types';

const SAMPLE = [
  'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:test',
  'BEGIN:VEVENT', 'UID:a1', 'DTSTAMP:20261001T000000Z', 'DTSTART:20261013T150000Z', 'DTEND:20261013T170000Z', 'SUMMARY:Training', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:a2', 'DTSTAMP:20261001T000000Z', 'DTSTART:20261012T080000Z', 'DTEND:20261012T090000Z', 'RRULE:FREQ=WEEKLY;COUNT=3', 'SUMMARY:Les', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:a3', 'DTSTAMP:20261001T000000Z', 'DTSTART:20261014T080000Z', 'DTEND:20261014T090000Z', 'TRANSP:TRANSPARENT', 'SUMMARY:Vrij', 'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

const session = (id: string, taskId: string, start: string, end: string): WorkSession => ({ id, taskId, start, end, status: 'planned', kind: 'work', locked: false });
const NOW = new Date('2026-10-12T00:00:00Z');

describe('ics import', () => {
  it('parses events, expands recurrences and skips free time', () => {
    const blocks = parseIcs(SAMPLE, NOW, 'school');
    expect(blocks).toHaveLength(4);
    expect(blocks.filter((b) => b.title === 'Les')).toHaveLength(3);
    expect(blocks.find((b) => b.title === 'Vrij')).toBeUndefined();
    expect(blocks.every((b) => b.source === 'ics' && b.importId === 'school')).toBe(true);
  });

  it('gives events the chosen category, recognises tests and keeps per-event choices', () => {
    const withTest = SAMPLE.replace('SUMMARY:Training', 'SUMMARY:Toets Biologie');
    const blocks = parseIcs(withTest, NOW, 'school', 'lesson', { a2: 'meeting' });
    expect(blocks.find((b) => b.externalUid === 'a1')?.category).toBe('test');
    expect(blocks.filter((b) => b.externalUid === 'a2').every((b) => b.category === 'meeting')).toBe(true);
    expect(parseIcs(SAMPLE, NOW, 'school', 'lesson').find((b) => b.title === 'Training')?.category).toBe('lesson');
  });

  it('derives a stable import id from the file name', () => {
    expect(importIdFor('Rooster School.ics')).toBe('rooster-school');
    expect(importIdFor('rooster school.ICS')).toBe('rooster-school');
  });
});

describe('ics export for Apple Calendar', () => {
  const task = makeTask({ title: 'Geheim essay' });

  it('exports private events; generic titles hide task names', () => {
    const s = [session('s1', task.id, '2026-10-13T15:00:00.000Z', '2026-10-13T16:00:00.000Z')];
    const generic = buildIcs(s, [task], { generic: true, deadlines: false, now: NOW }).text;
    expect(generic).toContain('CLASS:PRIVATE');
    expect(generic).toContain('X-WR-CALNAME:Planora');
    expect(generic).toContain('DTSTART:20261013T150000Z');
    expect(generic).not.toContain('Geheim');
    const titled = buildIcs(s, [task], { generic: false, deadlines: true, reminderMin: 10, now: NOW }).text;
    expect(titled).toContain('SUMMARY:Planora: Geheim essay');
    expect(titled).toContain('TRIGGER:-PT10M');
    expect(parseIcs(titled, NOW).length).toBe(1);
  });

  it('keeps UIDs stable when sessions are replanned with new ids', () => {
    const before = buildIcs(
      [session('a', task.id, '2026-10-13T15:00:00.000Z', '2026-10-13T16:00:00.000Z'), session('b', task.id, '2026-10-15T15:00:00.000Z', '2026-10-15T16:00:00.000Z')],
      [task], { generic: true, deadlines: false, now: NOW },
    );
    const after = buildIcs(
      [session('x', task.id, '2026-10-14T15:00:00.000Z', '2026-10-14T16:00:00.000Z'), session('y', task.id, '2026-10-16T15:00:00.000Z', '2026-10-16T16:00:00.000Z')],
      [task], { generic: true, deadlines: false, now: new Date(NOW.getTime() + 60000) },
    );
    expect(after.uids).toEqual(before.uids);
    expect(Number(after.text.match(/SEQUENCE:(\d+)/)![1])).toBeGreaterThan(Number(before.text.match(/SEQUENCE:(\d+)/)![1]));
  });

  it('cancels events from an earlier export that are no longer planned', () => {
    const out = buildIcs([], [task], { generic: true, deadlines: false, cancelUids: ['planora-old-1@planora.local'], now: NOW });
    expect(out.text).toContain('UID:planora-old-1@planora.local');
    expect(out.text).toContain('STATUS:CANCELLED');
    expect(parseIcs(out.text, NOW)).toEqual([]);
  });

  it('exports a single task when asked', () => {
    const other = makeTask({ title: 'Ander' });
    const s = [session('a', task.id, '2026-10-13T15:00:00.000Z', '2026-10-13T16:00:00.000Z'), session('b', other.id, '2026-10-13T17:00:00.000Z', '2026-10-13T18:00:00.000Z')];
    const out = buildIcs(s, [task, other], { generic: false, deadlines: true, taskIds: [task.id], now: NOW });
    expect(out.text).toContain('Geheim essay');
    expect(out.text).not.toContain('Ander');
  });
});
