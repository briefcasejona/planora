import { describe, expect, it } from 'vitest';
import { buildTimeline, timelineFileName } from './timeline';
import type { BusyBlock, Task, WorkSession } from './types';

const now = new Date(2026, 11, 2, 10); // Wed 2 Dec 2026, ISO week 49
const task = {
  id: 't',
  title: 'Project',
  type: 'project',
  deadline: new Date(2026, 11, 24, 23, 59).toISOString(),
  createdAt: new Date(2026, 11, 1).toISOString(),
  steps: [
    { id: 'b', title: 'B', estimateMin: 60, order: 1, done: false },
    {
      id: 'a',
      title: 'A',
      estimateMin: 60,
      order: 0,
      done: false,
      who: 'Sanne',
      due: new Date(2026, 11, 8, 23, 59).toISOString(),
    },
  ],
} as Task;
const session = (id: string, stepId: string, d: number, h: number, status: WorkSession['status'] = 'planned') =>
  ({
    id,
    taskId: 't',
    stepId,
    start: new Date(2026, 11, d, h).toISOString(),
    end: new Date(2026, 11, d, h + 1).toISOString(),
    status,
  }) as WorkSession;

describe('buildTimeline range', () => {
  it('starts on the Monday of the week of the earliest day and ends at the deadline', () => {
    const tl = buildTimeline(task, [], [], now);
    expect(tl.range.start).toEqual(new Date(2026, 10, 30));
    expect(tl.range.end).toEqual(new Date(2026, 11, 24));
    expect(tl.weeks[0].week).toBe(49);
    expect(tl.weeks).toHaveLength(4);
  });
  it('covers a session before today', () => {
    const tl = buildTimeline(
      task,
      [session('s', 'a', 25, 9)].map((s) => ({ ...s, start: new Date(2026, 10, 25, 9).toISOString() })),
      [],
      now,
    );
    expect(tl.range.start).toEqual(new Date(2026, 10, 23));
  });
  it('lasts at least a week', () => {
    const near = { ...task, deadline: new Date(2026, 11, 3).toISOString() };
    const tl = buildTimeline(near, [], [], now);
    expect(tl.range.end).toEqual(new Date(2026, 11, 7));
    expect(tl.weeks).toHaveLength(1);
  });
  it('marks today only when inside the range', () => {
    expect(buildTimeline(task, [], [], now).today).toEqual(now);
    expect(buildTimeline(task, [], [], new Date(2027, 0, 20)).today).toBeUndefined();
  });
});

describe('buildTimeline rows', () => {
  it('orders by step order and spans first to last live session', () => {
    const sessions = [
      session('1', 'a', 3, 9),
      session('2', 'a', 7, 14),
      session('3', 'a', 20, 9, 'missed'),
      session('4', 'a', 1, 9, 'skipped'),
    ];
    const rows = buildTimeline(task, sessions, [], now).rows;
    expect(rows.map((r) => r.stepId)).toEqual(['a', 'b']);
    expect(rows[0].barStart).toEqual(new Date(2026, 11, 3, 9));
    expect(rows[0].barEnd).toEqual(new Date(2026, 11, 7, 15));
    expect(rows[0].who).toBe('Sanne');
    expect(rows[1].barStart).toBeUndefined();
  });
  it('flags late when the bar ends after the due date', () => {
    const rows = buildTimeline(task, [session('1', 'a', 10, 9)], [], now).rows;
    expect(rows[0].late).toBe(true);
  });
  it('flags late when the due date passed and the step is open, not when done', () => {
    const later = new Date(2026, 11, 10);
    expect(buildTimeline(task, [], [], later).rows[0].late).toBe(true);
    const done = { ...task, steps: task.steps?.map((s) => ({ ...s, done: true })) } as Task;
    expect(buildTimeline(done, [], [], later).rows[0].late).toBe(false);
  });
  it('is on time inside the due date', () => {
    expect(buildTimeline(task, [session('1', 'a', 7, 9)], [], now).rows[0].late).toBe(false);
  });
});

describe('buildTimeline meetings', () => {
  const block = (id: string, d: number, category: BusyBlock['category'], extra: Partial<BusyBlock> = {}) =>
    ({
      id,
      source: 'local',
      category,
      start: new Date(2026, 11, d, 10).toISOString(),
      end: new Date(2026, 11, d, 11).toISOString(),
      title: 'Secret',
      ...extra,
    }) as BusyBlock;
  it('lists meeting days only, once per day, inside the range', () => {
    const busy = [
      block('1', 3, 'meeting'),
      block('2', 3, 'meeting'),
      block('3', 4, 'lesson'),
      block('4', 28, 'meeting'),
    ];
    expect(buildTimeline(task, [], busy, now).meetings).toEqual([new Date(2026, 11, 3)]);
  });
  it('expands recurring meetings', () => {
    const rec = block('r', 2, 'meeting', { repeatWeekdays: [3], repeatUntil: new Date(2026, 11, 31).toISOString() });
    const days = buildTimeline(task, [], [rec], now).meetings;
    expect(days).toEqual([
      new Date(2026, 11, 2),
      new Date(2026, 11, 9),
      new Date(2026, 11, 16),
      new Date(2026, 11, 23),
    ]);
  });
});

describe('timelineFileName', () => {
  it('slugs the title', () => {
    expect(timelineFileName('Werkstuk Économie: H4/H5!')).toBe('strokenplanning-werkstuk-economie-h4-h5.png');
  });
  it('falls back for empty slugs', () => {
    expect(timelineFileName('???')).toBe('strokenplanning-project.png');
  });
});
