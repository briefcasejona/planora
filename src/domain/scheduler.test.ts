import { describe, expect, it } from 'vitest';
import { differenceInCalendarDays, startOfDay } from 'date-fns';
import { schedule, sessionMinutes } from './scheduler';
import type { BusyBlock, WorkSession } from './types';
import { makeTask, prefsEveryEvening, seqId } from './testUtils';

// Monday 12 October 2026, 09:00 local time.
const NOW = new Date(2026, 9, 12, 9, 0);

function overlaps(a: { start: string; end: string }, b: { start: string; end: string }) {
  return new Date(a.start) < new Date(b.end) && new Date(b.start) < new Date(a.end);
}

describe('schedule: test in two weeks', () => {
  const test = makeTask({
    type: 'test',
    title: 'Biologie toets',
    deadline: new Date(2026, 9, 26, 9, 0).toISOString(),
    userEstimateMin: 360,
    plannedEstimateMin: 360,
  });
  const busy: BusyBlock[] = [
    { id: 'b1', source: 'local', start: new Date(2026, 9, 14, 16, 0).toISOString(), end: new Date(2026, 9, 14, 21, 0).toISOString() },
    {
      id: 'b2',
      source: 'local',
      start: new Date(2026, 9, 12, 17, 0).toISOString(),
      end: new Date(2026, 9, 12, 19, 0).toISOString(),
      repeatWeekdays: [1, 3],
    },
  ];
  const prefs = prefsEveryEvening();
  const result = schedule({ now: NOW, tasks: [test], sessions: [], busy, prefs, feedback: [], newId: seqId });

  it('plans all 6 hours across several spaced days', () => {
    const total = result.created.reduce((a, s) => a + sessionMinutes(s), 0);
    expect(total).toBeGreaterThanOrEqual(345);
    const days = new Set(result.created.map((s) => startOfDay(new Date(s.start)).getTime()));
    expect(days.size).toBeGreaterThanOrEqual(5);
    expect(result.warnings).toEqual([]);
  });

  it('gets denser toward the test and ends before the test day', () => {
    const offsets = result.created.map((s) => differenceInCalendarDays(new Date(s.start), NOW));
    expect(Math.max(...offsets)).toBe(13); // the day before the test
    const firstHalf = offsets.filter((o) => o < 7).length;
    const secondHalf = offsets.filter((o) => o >= 7).length;
    expect(secondHalf).toBeGreaterThan(firstHalf);
    for (const s of result.created) expect(new Date(s.end) <= startOfDay(new Date(test.deadline))).toBe(true);
  });

  it('never overlaps busy time (including weekly repeats) and respects availability', () => {
    for (const s of result.created) {
      expect(overlaps(s, busy[0])).toBe(false);
      const st = new Date(s.start);
      if (st.getDay() === 1 || st.getDay() === 3) {
        const busyStart = new Date(st);
        busyStart.setHours(17, 0, 0, 0);
        const busyEnd = new Date(st);
        busyEnd.setHours(19, 0, 0, 0);
        expect(overlaps(s, { start: busyStart.toISOString(), end: busyEnd.toISOString() })).toBe(false);
      }
      expect(st.getHours()).toBeGreaterThanOrEqual(16);
      const end = new Date(s.end);
      expect(end.getHours() * 60 + end.getMinutes()).toBeLessThanOrEqual(21 * 60);
      expect(sessionMinutes(s)).toBeLessThanOrEqual(prefs.maxBlockMin);
    }
  });

  it('marks the last session as review', () => {
    expect(result.created[result.created.length - 1].kind).toBe('review');
  });
});

describe('schedule: project in seven weeks', () => {
  const steps = [
    { id: 's1', title: 'Onderzoek', estimateMin: 240, order: 0, done: false },
    { id: 's2', title: 'Opzet', estimateMin: 120, order: 1, done: false },
    { id: 's3', title: 'Schrijven', estimateMin: 480, order: 2, done: false },
    { id: 's4', title: 'Feedback verwerken', estimateMin: 120, order: 3, done: false },
    { id: 's5', title: 'Presentatie', estimateMin: 120, order: 4, done: false },
  ];
  const total = steps.reduce((a, s) => a + s.estimateMin, 0);
  const project = makeTask({
    type: 'project',
    steps,
    userEstimateMin: total,
    plannedEstimateMin: total,
    deadline: new Date(2026, 10, 30, 23, 59).toISOString(),
  });
  const result = schedule({ now: NOW, tasks: [project], sessions: [], busy: [], prefs: prefsEveryEvening(), feedback: [], newId: seqId });

  it('plans every step and keeps steps in order', () => {
    expect(result.warnings).toEqual([]);
    let lastEnd = 0;
    for (const step of steps) {
      const ss = result.created.filter((s) => s.stepId === step.id);
      expect(ss.reduce((a, s) => a + sessionMinutes(s), 0)).toBeGreaterThanOrEqual(step.estimateMin - 15);
      const first = Math.min(...ss.map((s) => +new Date(s.start)));
      expect(first).toBeGreaterThanOrEqual(lastEnd);
      lastEnd = Math.max(...ss.map((s) => +new Date(s.end)));
    }
  });

  it('spreads the work over the weeks and finishes before the buffer', () => {
    const weeks = new Set(result.created.map((s) => Math.floor(differenceInCalendarDays(new Date(s.start), NOW) / 7)));
    expect(weeks.size).toBeGreaterThanOrEqual(5);
    const deadline = new Date(project.deadline);
    for (const s of result.created) expect(differenceInCalendarDays(deadline, new Date(s.end))).toBeGreaterThanOrEqual(1);
  });

  it('scales step estimates with the learned correction', () => {
    const scaled = { ...project, plannedEstimateMin: Math.round(total * 1.5) };
    const r = schedule({ now: NOW, tasks: [scaled], sessions: [], busy: [], prefs: prefsEveryEvening(), feedback: [], newId: seqId });
    const planned = r.created.reduce((a, s) => a + sessionMinutes(s), 0);
    expect(planned).toBeGreaterThanOrEqual(total * 1.5 - 30);
  });
});

describe('schedule: infeasible and replanning', () => {
  it('reports work that does not fit before the deadline', () => {
    const task = makeTask({ deadline: new Date(2026, 9, 14, 12, 0).toISOString(), userEstimateMin: 900, plannedEstimateMin: 900 });
    const result = schedule({ now: NOW, tasks: [task], sessions: [], busy: [], prefs: prefsEveryEvening(), feedback: [], newId: seqId });
    const warning = result.warnings.find((w) => w.kind === 'infeasible');
    expect(warning?.taskId).toBe(task.id);
    expect(warning?.unplacedMin).toBeGreaterThan(0);
  });

  it('keeps locked and missed sessions, replaces future planned ones', () => {
    const task = makeTask({ userEstimateMin: 180, plannedEstimateMin: 180 });
    const at = (d: number, h: number) => new Date(2026, 9, d, h, 0).toISOString();
    const locked: WorkSession = { id: 'L', taskId: task.id, start: at(15, 18), end: at(15, 19), status: 'planned', kind: 'work', locked: true };
    const missed: WorkSession = { id: 'M', taskId: task.id, start: at(11, 16), end: at(11, 17), status: 'missed', kind: 'work', locked: false };
    const future: WorkSession = { id: 'F', taskId: task.id, start: at(20, 16), end: at(20, 17), status: 'planned', kind: 'work', locked: false };
    const sessions = [locked, missed, future];
    const result = schedule({ now: NOW, tasks: [task], sessions, busy: [], prefs: prefsEveryEvening(), feedback: [], newId: seqId });
    expect(result.keep.map((s) => s.id).sort()).toEqual(['L', 'M']);
    expect(result.removedIds).toEqual(['F']);
    // 180 total minus 60 locked = 120 still to plan; the missed hour does not count as done.
    expect(result.created.reduce((a, s) => a + sessionMinutes(s), 0)).toBe(120);
    for (const s of result.created) expect(overlaps(s, locked)).toBe(false);
  });

  it('respects the daily maximum across tasks', () => {
    const tasks = [1, 2, 3].map(() => makeTask({ userEstimateMin: 300, plannedEstimateMin: 300 }));
    const prefs = prefsEveryEvening({ maxMinutesPerDay: 120 });
    const result = schedule({ now: NOW, tasks, sessions: [], busy: [], prefs, feedback: [], newId: seqId });
    const perDay = new Map<number, number>();
    for (const s of result.created) {
      const d = startOfDay(new Date(s.start)).getTime();
      perDay.set(d, (perDay.get(d) ?? 0) + sessionMinutes(s));
    }
    for (const m of perDay.values()) expect(m).toBeLessThanOrEqual(120);
  });

  it('warns for open tasks whose deadline already passed', () => {
    const task = makeTask({ deadline: new Date(2026, 9, 10).toISOString() });
    const result = schedule({ now: NOW, tasks: [task], sessions: [], busy: [], prefs: prefsEveryEvening(), feedback: [], newId: seqId });
    expect(result.warnings).toEqual([{ taskId: task.id, kind: 'deadline-passed' }]);
    expect(result.created).toEqual([]);
  });
});
