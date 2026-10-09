import { describe, expect, it } from 'vitest';
import { detectCategory, eventKey, guessSubject, testSuggestions } from './categories';
import type { BusyBlock } from './types';
import { makeTask } from './testUtils';

describe('detectCategory', () => {
  it('recognises tests, also inside Dutch compounds', () => {
    for (const title of ['Toets Biologie H3', 'Wiskundetoets', 'Hertentamen Statistiek', 'Proefwerk Duits', 'Eindexamen Nederlands', 'SO Frans', 'Exam Physics', 'Chemistry quiz']) {
      expect(detectCategory(title, 'lesson'), title).toBe('test');
    }
  });

  it('recognises excursions', () => {
    expect(detectCategory('Excursie Rijksmuseum', 'lesson')).toBe('excursion');
    expect(detectCategory('Biology field trip', 'lesson')).toBe('excursion');
  });

  it('falls back for ordinary events and does not match parts of English words', () => {
    expect(detectCategory('Wiskunde B', 'lesson')).toBe('lesson');
    expect(detectCategory('Testosteron en hormonen', 'lesson')).toBe('lesson');
    expect(detectCategory('Examples of good essays', 'lesson')).toBe('lesson');
    expect(detectCategory('so far so good', 'lesson')).toBe('lesson');
    expect(detectCategory(undefined, 'meeting')).toBe('meeting');
    expect(detectCategory('Training')).toBeUndefined();
  });
});

describe('guessSubject', () => {
  it('prefers a subject the user already uses', () => {
    expect(guessSubject('Toets biologie H3', ['Biologie', 'Wiskunde'])).toBe('Biologie');
  });

  it('otherwise takes the first word without the test keyword', () => {
    expect(guessSubject('Toets Geschiedenis H3')).toBe('Geschiedenis');
    expect(guessSubject('Wiskundetoets')).toBe('Wiskunde');
    expect(guessSubject('SO Frans')).toBe('Frans');
    expect(guessSubject('Toets')).toBeUndefined();
  });
});

describe('testSuggestions', () => {
  const now = new Date(2026, 9, 12, 9, 0);
  const at = (d: number, title: string, extra: Partial<BusyBlock> = {}): BusyBlock => ({
    id: 'ics:' + title + d,
    source: 'ics',
    importId: 'rooster',
    externalUid: title,
    category: 'test',
    title,
    start: new Date(2026, 9, d, 10, 0).toISOString(),
    end: new Date(2026, 9, d, 11, 0).toISOString(),
    ...extra,
  });

  it('lists upcoming tests without a study task, earliest first', () => {
    const later = at(20, 'Toets Duits');
    const sooner = at(15, 'Toets Biologie');
    expect(testSuggestions([later, sooner], [], [], now).map((b) => b.title)).toEqual(['Toets Biologie', 'Toets Duits']);
  });

  it('skips past tests, lessons, dismissed tests and tests that already have a task', () => {
    const past = at(5, 'Toets oud');
    const lesson = at(15, 'Wiskunde', { category: 'lesson' });
    const dismissed = at(16, 'Toets Frans');
    const linked = at(17, 'Toets Engels');
    const task = makeTask({ source: 'ics', externalId: eventKey(linked) });
    expect(testSuggestions([past, lesson, dismissed, linked], [task], [eventKey(dismissed)], now)).toEqual([]);
  });
});
