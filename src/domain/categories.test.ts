import { describe, expect, it } from 'vitest';
import {
  classKindFromText,
  courseName,
  deadlineKey,
  deadlineOf,
  deadlineSuggestions,
  detectCategory,
  eventKey,
  guessSubject,
  isDeadlineEvent,
  testSuggestions,
  timetableCourses,
} from './categories';
import { makeTask } from './testUtils';
import type { BusyBlock } from './types';

describe('detectCategory', () => {
  it('recognises tests, also inside Dutch compounds', () => {
    for (const title of [
      'Toets Biologie H3',
      'Wiskundetoets',
      'Hertentamen Statistiek',
      'Proefwerk Duits',
      'Eindexamen Nederlands',
      'SO Frans',
      'Exam Physics',
      'Chemistry quiz',
    ]) {
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
    expect(testSuggestions([later, sooner], [], [], now).map((b) => b.title)).toEqual([
      'Toets Biologie',
      'Toets Duits',
    ]);
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

describe('deadline entries', () => {
  const now = new Date(2026, 9, 12, 9, 0);
  const at = (d: number, title: string, extra: Partial<BusyBlock> = {}): BusyBlock => ({
    id: 'ics:' + title + d,
    source: 'ics',
    importId: 'semester',
    externalUid: title,
    category: 'lecture',
    title,
    start: new Date(2026, 9, d, 23, 59).toISOString(),
    end: new Date(2026, 9, d, 23, 59).toISOString(),
    ...extra,
  });
  const allDay = (d: number, title: string, extra: Partial<BusyBlock> = {}) =>
    at(d, title, {
      allDay: true,
      start: new Date(2026, 9, d).toISOString(),
      end: new Date(2026, 9, d + 1).toISOString(),
      ...extra,
    });

  it('recognises hand-in moments in Dutch and English, and all-day entries that are not days off', () => {
    for (const title of [
      'Deadline essay Filosofie',
      'Inleveren verslag Statistiek',
      'Paper due',
      'Hand in lab report',
      'Assignment 2 submission',
    ])
      expect(isDeadlineEvent(at(20, title)), title).toBe(true);
    expect(isDeadlineEvent(allDay(20, 'Reflectieverslag'))).toBe(true);
    for (const title of ['Herfstvakantie', 'Reading week', 'Studiedag'])
      expect(isDeadlineEvent(allDay(20, title)), title).toBe(false);
    expect(isDeadlineEvent(at(20, 'Hoorcollege Statistiek'))).toBe(false);
    expect(isDeadlineEvent(at(20, 'Dueling banjos'))).toBe(false);
    expect(isDeadlineEvent(allDay(20, 'Tentamen', { category: 'test' }))).toBe(false);
  });

  it('is due at the end of the day for an all-day entry', () => {
    const due = deadlineOf(allDay(20, 'Reflectieverslag'));
    expect([due.getDate(), due.getHours(), due.getMinutes()]).toEqual([20, 23, 59]);
  });

  it('lists new deadlines once, and not those already added, hidden, past or in other calendars', () => {
    const essay = at(20, 'Deadline essay');
    const report = at(27, 'Inleveren verslag');
    const hidden = at(22, 'Deadline poster');
    const added = at(24, 'Paper due');
    const list = deadlineSuggestions(
      [
        report,
        essay,
        { ...essay, id: 'copy', importId: 'semester-v2' },
        hidden,
        added,
        at(10, 'Deadline old'),
        at(21, 'Deadline outlook', { source: 'microsoft' }),
      ],
      [makeTask({ deadline: deadlineOf(added).toISOString() })],
      [deadlineKey(hidden)],
      now,
    );
    expect(list.map((b) => b.title)).toEqual(['Deadline essay', 'Inleveren verslag']);
  });

  it('reads course names from the classes in the timetable', () => {
    const lecture = (title: string, category: BusyBlock['category'] = 'lecture') =>
      at(13, title, { category, start: new Date(2026, 9, 13, 11).toISOString() });
    expect(
      timetableCourses([
        lecture('Hoorcollege Statistiek'),
        lecture('Werkcollege statistiek', 'tutorial'),
        lecture('Practicum Biologie', 'lab'),
        lecture('Tentamen Statistiek', 'test'),
        lecture('Deadline essay Filosofie'),
        lecture('Sport', 'sport'),
      ]),
    ).toEqual(['Statistiek', 'Biologie']);
  });

  it('guesses the course without the deadline words', () => {
    expect(guessSubject('Deadline essay Filosofie', ['Filosofie'])).toBe('Filosofie');
    expect(guessSubject('Inleveren Statistiek opdracht 2')).toBe('Statistiek');
  });
});

describe('timetable details', () => {
  it('reads the kind of class from a description, the first one named', () => {
    expect(classKindFromText('AB, LW \nPracticum \n1AA1-01')).toBe('lab');
    expect(classKindFromText('Practicum, Hoorcollege')).toBe('lab');
    expect(classKindFromText('Hoorcollege')).toBe('lecture');
    expect(classKindFromText('Werkcollege')).toBe('tutorial');
    expect(classKindFromText('Toetsing / Assessments \nSummatieve toets')).toBe('test');
    expect(classKindFromText('Excursie')).toBe('excursion');
    expect(classKindFromText('Hoorcollege \ntentamenvoorbereiding')).toBe('lecture');
    expect(classKindFromText('Coaching \nID 381064')).toBeUndefined();
    expect(classKindFromText(undefined)).toBeUndefined();
  });

  it('reads the course from a title, without code or topic', () => {
    expect(courseName('AA1445. Wereldwijs, GIS analyse 2')).toBe('Wereldwijs');
    expect(courseName('AA1405 . Data & AI 101, AI vaardigheden')).toBe('Data & AI 101');
    expect(courseName('Werkcollege Filosofie')).toBe('Filosofie');
  });
});
