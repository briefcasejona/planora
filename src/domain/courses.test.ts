import { describe, expect, it } from 'vitest';
import { courseList, findCourse, MAX_WEEKS, seriesScope, upsertCourse, weeklyDeadlines } from './courses';
import { makeTask } from './testUtils';

describe('courses', () => {
  it('lists courses with dates and every subject already used on a task, once each', () => {
    const list = courseList(
      [{ name: 'Biology', termEnd: '2026-12-20' }],
      [{ subject: 'biology' }, { subject: 'Statistics' }, { subject: undefined }, { subject: '  ' }],
    );
    expect(list).toEqual([{ name: 'Biology', termEnd: '2026-12-20' }, { name: 'Statistics' }]);
  });

  it('finds a course by name regardless of capitals', () => {
    expect(findCourse([{ name: 'Biology', termEnd: '2026-12-20' }], ' biology ')?.termEnd).toBe('2026-12-20');
    expect(findCourse([{ name: 'Biology' }], undefined)).toBeUndefined();
  });

  it('saves a course with dates and drops it again once its dates are cleared', () => {
    const saved = upsertCourse([], { name: 'Biology', examStart: '2027-01-11', examEnd: '2027-01-22' });
    expect(saved).toHaveLength(1);
    expect(upsertCourse(saved, { name: 'biology' })).toEqual([]);
  });
});

describe('weekly tasks', () => {
  it('repeats every week at the same time up to and including the last day', () => {
    const first = new Date(2026, 9, 14, 9, 0);
    const dates = weeklyDeadlines(first, '2026-11-04');
    expect(dates.map((d) => [d.getMonth() + 1, d.getDate(), d.getHours()])).toEqual([
      [10, 14, 9],
      [10, 21, 9],
      [10, 28, 9],
      [11, 4, 9],
    ]);
  });

  it('keeps the same clock time across the change to winter time', () => {
    const dates = weeklyDeadlines(new Date(2026, 9, 21, 9, 0), '2026-10-28');
    expect(dates[1].getHours()).toBe(9);
  });

  it('never creates more than a year of weeks, and nothing when the end is before the start', () => {
    expect(weeklyDeadlines(new Date(2026, 9, 14), '2030-01-01')).toHaveLength(MAX_WEEKS);
    expect(weeklyDeadlines(new Date(2026, 9, 14), '2026-10-01')).toEqual([]);
  });

  it('applies a change to one week, or to that week and every later one', () => {
    const week = (n: number) =>
      makeTask({ id: 'w' + n, seriesId: 's', deadline: new Date(2026, 9, 7 + 7 * n).toISOString() });
    const other = makeTask({ id: 'x', deadline: new Date(2026, 9, 30).toISOString() });
    const tasks = [week(3), week(1), week(2), other];
    expect(seriesScope(tasks, week(2), 'one').map((t) => t.id)).toEqual(['w2']);
    expect(seriesScope(tasks, week(2), 'later').map((t) => t.id)).toEqual(['w2', 'w3']);
    expect(seriesScope(tasks, other, 'later').map((t) => t.id)).toEqual(['x']);
  });
});
