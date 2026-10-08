import { describe, expect, it } from 'vitest';
import { buildWeeklyPlan, buildWeeklyReview, upcomingWeekStart, weekStartOf } from './insights';
import { feedbackDue, findMissed, reopenTask } from './replan';
import type { WorkSession } from './types';
import { makeFeedback, makeTask, prefsEveryEvening } from './testUtils';

const at = (d: number, h: number) => new Date(2026, 9, d, h, 0).toISOString();
const session = (id: string, taskId: string, d: number, h: number, status: WorkSession['status']): WorkSession => ({
  id, taskId, start: at(d, h), end: at(d, h + 1), status, kind: 'work', locked: false,
});

describe('replan helpers', () => {
  it('finds planned sessions that ended without being checked off', () => {
    const s = [session('a', 't', 12, 16, 'planned'), session('b', 't', 12, 20, 'planned'), session('c', 't', 12, 10, 'done')];
    expect(findMissed(s, new Date(2026, 9, 12, 19)).map((x) => x.id)).toEqual(['a']);
  });

  it('asks feedback for done tasks and tasks past their deadline', () => {
    const now = new Date(2026, 9, 20);
    const done = makeTask({ status: 'done' });
    const late = makeTask({ deadline: at(18, 9) });
    const future = makeTask({ deadline: at(30, 9) });
    expect(feedbackDue([done, late, future], now).map((t) => t.id)).toEqual([done.id, late.id]);
  });

  it('reopens a task with a new remaining estimate on top of the work done', () => {
    const task = makeTask({ status: 'done', feedbackGiven: true, plannedEstimateMin: 120 });
    const sessions = [session('a', task.id, 12, 16, 'done'), session('b', task.id, 13, 16, 'done')];
    const re = reopenTask(task, sessions, 90, at(30, 9));
    expect(re.status).toBe('open');
    expect(re.plannedEstimateMin).toBe(120 + 90);
    expect(re.redoCount).toBe(1);
    expect(re.feedbackGiven).toBe(false);
    expect(re.deadline).toBe(at(30, 9));
  });
});

describe('weekly insights', () => {
  const now = new Date(2026, 9, 17, 15, 0); // Saturday afternoon
  const weekStart = weekStartOf(now);
  const math = makeTask({ title: 'Wiskunde toets', subject: 'Wiskunde', type: 'test', status: 'done', completedAt: at(15, 20), deadline: at(16, 9) });
  const essay = makeTask({ title: 'Essay', subject: 'Engels', deadline: at(16, 23) });
  const sessions = [
    session('1', math.id, 12, 19, 'done'),
    session('2', math.id, 13, 19, 'missed'),
    session('3', math.id, 14, 20, 'missed'),
    session('4', essay.id, 15, 19, 'missed'),
    session('5', essay.id, 16, 10, 'done'),
  ];
  const feedback = [
    makeFeedback({ taskId: math.id, userEstimateMin: 120, plannedEstimateMin: 120, actualMin: 200, enoughTime: 'too-little', createdAt: at(16, 12) }),
    makeFeedback({ subject: 'Wiskunde', userEstimateMin: 60, actualMin: 90, createdAt: at(2, 12) }),
  ];
  const input = { now, tasks: [math, essay], sessions, feedback, prefs: prefsEveryEvening() };

  it('summarises the past week', () => {
    const r = buildWeeklyReview(weekStart, input);
    expect(r.sessionsDone).toBe(2);
    expect(r.sessionsMissed).toBe(3);
    expect(r.tasksCompleted.map((t) => t.title)).toEqual(['Wiskunde toets']);
    expect(r.struggled.map((t) => t.title)).toEqual(['Wiskunde toets']);
    expect(r.missedDeadlines.map((t) => t.title)).toEqual(['Essay']);
    expect(r.missedByDaypart.evening).toBe(3);
    const keys = r.improvements.map((m) => m.key);
    expect(keys).toContain('improve.daypart');
    expect(keys).toContain('improve.estimate');
    expect(keys).toContain('improve.deadlines');
  });

  it('builds a Sunday plan for the coming week with focus points from last week', () => {
    const sunday = new Date(2026, 9, 18, 19, 0);
    const next = upcomingWeekStart(sunday);
    expect(next.getDay()).toBe(1);
    expect(next.getDate()).toBe(19);
    const test2 = makeTask({ title: 'Wiskunde toets 2', subject: 'Wiskunde', type: 'test', deadline: at(23, 9) });
    const planSessions = [session('p1', test2.id, 19, 16, 'planned'), session('p2', test2.id, 21, 16, 'planned')];
    const review = buildWeeklyReview(weekStart, input);
    const plan = buildWeeklyPlan(next, { ...input, now: sunday, tasks: [test2], sessions: planSessions }, review);
    expect(plan.days).toHaveLength(7);
    expect(plan.days[0].sessions).toHaveLength(1);
    expect(plan.totalMin).toBe(120);
    expect(plan.deadlines.map((d) => d.title)).toEqual(['Wiskunde toets 2']);
    const keys = plan.focus.map((m) => m.key);
    expect(keys).toContain('focus.underestimate');
    expect(keys).toContain('focus.lowCompletion');
    expect(plan.focus.length).toBeLessThanOrEqual(3);
  });
});
