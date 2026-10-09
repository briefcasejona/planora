import { describe, expect, it } from 'vitest';
import { dedupeBusy } from './busy';
import { testSuggestions } from './categories';
import { findManualMatch, similarTitles } from './matching';
import { makeTask } from './testUtils';
import type { BusyBlock } from './types';

describe('connecting Microsoft after importing a timetable by hand', () => {
  const at = (h: number, source: BusyBlock['source'], title?: string, minuteShift = 0): BusyBlock => ({
    id: source + h + (title ?? ''),
    source,
    title,
    category: source === 'ics' ? 'lesson' : undefined,
    start: new Date(2026, 9, 13, h, minuteShift).toISOString(),
    end: new Date(2026, 9, 13, h + 1, minuteShift).toISOString(),
  });
  const occ = (b: BusyBlock) => ({ start: new Date(b.start), end: new Date(b.end), block: b });

  it('shows a lesson once when it is in the .ics file and in Outlook, keeping the .ics one', () => {
    const shown = dedupeBusy([occ(at(9, 'microsoft')), occ(at(9, 'ics', 'Wiskunde'))]);
    expect(shown).toHaveLength(1);
    expect(shown[0].block.source).toBe('ics');
    expect(dedupeBusy([occ(at(9, 'microsoft', 'wiskunde!')), occ(at(9, 'ics', 'Wiskunde'))])).toHaveLength(1);
  });

  it('keeps events that differ in title or time', () => {
    expect(dedupeBusy([occ(at(9, 'microsoft', 'Mentoruur')), occ(at(9, 'ics', 'Wiskunde'))])).toHaveLength(2);
    expect(dedupeBusy([occ(at(9, 'microsoft', 'Wiskunde', 15)), occ(at(9, 'ics', 'Wiskunde'))])).toHaveLength(2);
    expect(dedupeBusy([occ(at(9, 'ics', 'Wiskunde')), occ(at(9, 'ics', 'Engels'))])).toHaveLength(2);
  });

  it('suggests a test once, and not again when a study task for it exists', () => {
    const now = new Date(2026, 9, 12, 9, 0);
    const ics = { ...at(10, 'ics', 'Toets Biologie'), category: 'test' as const };
    const outlook = { ...at(10, 'microsoft', 'Toets Biologie'), category: 'test' as const };
    expect(testSuggestions([outlook, ics], [], [], now)).toEqual([ics]);
    const task = makeTask({ type: 'test', title: 'Leren Biologie', deadline: ics.start });
    expect(testSuggestions([outlook, ics], [task], [], now)).toEqual([]);
  });
});

describe('Teams assignment that was already entered by hand', () => {
  const due = new Date(2026, 9, 20, 23, 59).toISOString();
  const manual = makeTask({ title: 'essay engels h4', deadline: new Date(2026, 9, 20, 17, 0).toISOString() });

  it('matches a similar title on the same day', () => {
    expect(findManualMatch({ title: 'Essay Engels H4', due }, [manual])?.id).toBe(manual.id);
    expect(findManualMatch({ title: 'Essay Engels H4 - inleveren', due }, [manual])?.id).toBe(manual.id);
  });

  it('does not match another day, another title, or a task that is already linked', () => {
    expect(
      findManualMatch({ title: 'Essay Engels H4', due: new Date(2026, 9, 21, 9).toISOString() }, [manual]),
    ).toBeUndefined();
    expect(findManualMatch({ title: 'Verslag Scheikunde', due }, [manual])).toBeUndefined();
    expect(findManualMatch({ title: 'Essay Engels H4', due }, [{ ...manual, externalId: 'teams:1' }])).toBeUndefined();
    expect(findManualMatch({ title: 'Essay Engels H4' }, [manual])).toBeUndefined();
  });

  it('compares titles without case and punctuation', () => {
    expect(similarTitles('Werkstuk: Klimaat!', 'werkstuk klimaat')).toBe(true);
    expect(similarTitles('H4', 'Essay H4')).toBe(false);
  });
});
