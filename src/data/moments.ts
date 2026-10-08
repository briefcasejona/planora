import { addDays } from 'date-fns';
import type { WeeklyMoment } from '../domain/types';
import { parseHM } from '../domain/time';
import { weekStartOf } from '../domain/insights';

/** Monday-based offset of a weekday (Monday 0 ... Sunday 6). */
const mondayOffset = (weekday: number) => (weekday + 6) % 7;

function at(day: Date, hm: string): Date {
  const d = new Date(day);
  const m = parseHM(hm);
  d.setHours(Math.floor(m / 60), m % 60, 0, 0);
  return d;
}

/** When the plan for the week starting `weekStart` is presented (in the week before). */
export function planMoment(weekStart: Date, m: WeeklyMoment): Date {
  return at(addDays(weekStart, mondayOffset(m.weekday) - 7), m.time);
}

/** When the review of the week starting `weekStart` is presented (within that week). */
export function reviewMoment(weekStart: Date, m: WeeklyMoment): Date {
  return at(addDays(weekStart, mondayOffset(m.weekday)), m.time);
}

/** The week whose plan is current: next week once its plan moment has passed. */
export function currentPlanWeek(now: Date, m: WeeklyMoment): Date {
  const next = addDays(weekStartOf(now), 7);
  return planMoment(next, m) <= now ? next : weekStartOf(now);
}

/** The most recent week whose review moment has passed. */
export function latestReviewWeek(now: Date, m: WeeklyMoment): Date {
  const thisWeek = weekStartOf(now);
  return reviewMoment(thisWeek, m) <= now ? thisWeek : addDays(thisWeek, -7);
}

export function nextOccurrence(now: Date, m: WeeklyMoment, kind: 'plan' | 'review'): Date {
  const base = weekStartOf(now);
  for (let i = 0; i < 3; i++) {
    const week = addDays(base, 7 * i);
    const t = kind === 'plan' ? planMoment(addDays(week, 7), m) : reviewMoment(week, m);
    if (t > now) return t;
  }
  return addDays(now, 7);
}
