import { describe, expect, it } from 'vitest';
import { makeTask } from '../domain/testUtils';
import type { WorkSession } from '../domain/types';
import { buildIcs, importIdFor, parseIcs } from './ics';

const SAMPLE = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:test',
  'BEGIN:VEVENT',
  'UID:a1',
  'DTSTAMP:20261001T000000Z',
  'DTSTART:20261013T150000Z',
  'DTEND:20261013T170000Z',
  'SUMMARY:Training',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:a2',
  'DTSTAMP:20261001T000000Z',
  'DTSTART:20261012T080000Z',
  'DTEND:20261012T090000Z',
  'RRULE:FREQ=WEEKLY;COUNT=3',
  'SUMMARY:Les',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:a3',
  'DTSTAMP:20261001T000000Z',
  'DTSTART:20261014T080000Z',
  'DTEND:20261014T090000Z',
  'TRANSP:TRANSPARENT',
  'SUMMARY:Vrij',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

const session = (id: string, taskId: string, start: string, end: string): WorkSession => ({
  id,
  taskId,
  start,
  end,
  status: 'planned',
  kind: 'work',
  locked: false,
});
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

  it('reads the kind of class from a TimeEdit description and leaves out week labels', () => {
    const event = (uid: string, start: string, end: string, summary: string, description: string) => [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      'DTSTAMP:20261009T123429Z',
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      'END:VEVENT',
    ];
    const timeEdit = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//TimeEdit//EN',
      ...event('w', '20261012T060000Z', '20261012T063000Z', 'S1-wk7', 'ID 330393'),
      ...event(
        'p',
        '20261012T070000Z',
        '20261012T090000Z',
        'AA1445. Wereldwijs\\, GIS Storymap 2',
        'AB \\nPracticum \\n1AA1-01\\nID 1',
      ),
      ...event(
        'h',
        '20261013T090000Z',
        '20261013T100000Z',
        'AA1445. Wereldwijs\\, SDG',
        'AB \\nHoorcollege \\n1AA1-01\\nID 2',
      ),
      ...event(
        'c',
        '20261013T100000Z',
        '20261013T110000Z',
        'AA1445. Wereldwijs\\, Inloop',
        'AB \\nWerkcollege \\nID 3',
      ),
      ...event(
        't',
        '20261015T070000Z',
        '20261015T093000Z',
        'AA1445. Wereldwijs\\, ANS geografie',
        'AB \\nToetsing / Assessments \\nID 4',
      ),
      ...event(
        'x',
        '20261013T120000Z',
        '20261013T130000Z',
        'AA1445. Wereldwijs\\, Weekvoortgang',
        'AB \\nCoaching \\nID 5',
      ),
      ...event('v', '20261019T060000Z', '20261019T070000Z', 'Herfstvakantie', 'ID 6'),
      'END:VCALENDAR',
    ].join('\r\n');
    const kinds = Object.fromEntries(parseIcs(timeEdit, NOW, 'te', 'lecture').map((b) => [b.externalUid, b.category]));
    expect(kinds).toEqual({ p: 'lab', h: 'lecture', c: 'tutorial', t: 'test', x: 'lecture', v: undefined });
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
      [
        session('a', task.id, '2026-10-13T15:00:00.000Z', '2026-10-13T16:00:00.000Z'),
        session('b', task.id, '2026-10-15T15:00:00.000Z', '2026-10-15T16:00:00.000Z'),
      ],
      [task],
      { generic: true, deadlines: false, now: NOW },
    );
    const after = buildIcs(
      [
        session('x', task.id, '2026-10-14T15:00:00.000Z', '2026-10-14T16:00:00.000Z'),
        session('y', task.id, '2026-10-16T15:00:00.000Z', '2026-10-16T16:00:00.000Z'),
      ],
      [task],
      { generic: true, deadlines: false, now: new Date(NOW.getTime() + 60000) },
    );
    expect(after.uids).toEqual(before.uids);
    expect(Number(after.text.match(/SEQUENCE:(\d+)/)![1])).toBeGreaterThan(
      Number(before.text.match(/SEQUENCE:(\d+)/)![1]),
    );
  });

  it('cancels events from an earlier export that are no longer planned', () => {
    const out = buildIcs([], [task], {
      generic: true,
      deadlines: false,
      cancelUids: ['planora-old-1@planora.local'],
      now: NOW,
    });
    expect(out.text).toContain('UID:planora-old-1@planora.local');
    expect(out.text).toContain('STATUS:CANCELLED');
    expect(parseIcs(out.text, NOW)).toEqual([]);
  });

  it('exports a single task when asked', () => {
    const other = makeTask({ title: 'Ander' });
    const s = [
      session('a', task.id, '2026-10-13T15:00:00.000Z', '2026-10-13T16:00:00.000Z'),
      session('b', other.id, '2026-10-13T17:00:00.000Z', '2026-10-13T18:00:00.000Z'),
    ];
    const out = buildIcs(s, [task, other], { generic: false, deadlines: true, taskIds: [task.id], now: NOW });
    expect(out.text).toContain('Geheim essay');
    expect(out.text).not.toContain('Ander');
  });
});
