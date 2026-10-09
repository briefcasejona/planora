import { addDays, differenceInCalendarDays, startOfDay, startOfWeek } from 'date-fns';
import { comparableFeedback, correctionFactor } from './estimator';
import { sessionMinutes, workedMinutes } from './scheduler';
import type { FeedbackRecord, Message, Preferences, ScheduleWarning, Task, WorkSession } from './types';

export type Daypart = 'morning' | 'afternoon' | 'evening';

export function daypartOf(d: Date): Daypart {
  const h = d.getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

/** Weeks run Monday to Sunday. */
export function weekStartOf(d: Date): Date {
  return startOfWeek(d, { weekStartsOn: 1 });
}

/** The week a Sunday-evening plan is about: the upcoming Monday to Sunday. */
export function upcomingWeekStart(now: Date): Date {
  return now.getDay() === 0 ? startOfDay(addDays(now, 1)) : weekStartOf(now);
}

export interface PlanSession {
  sessionId: string;
  taskId: string;
  title: string;
  start: string;
  end: string;
  kind: WorkSession['kind'];
}

export interface PlanDay {
  date: string;
  sessions: PlanSession[];
  totalMin: number;
  heavy: boolean;
}

export interface WeeklyPlanData {
  weekStart: string;
  days: PlanDay[];
  deadlines: { taskId: string; title: string; deadline: string; type: Task['type'] }[];
  totalMin: number;
  focus: Message[];
  warnings: number;
}

export interface ReviewTaskItem {
  taskId: string;
  title: string;
  reason: Message;
}

export interface AccuracyRow {
  label: string;
  /** actual / estimated, e.g. 1.3 = needed 30% more than estimated */
  ratio: number;
  n: number;
}

export interface WeeklyReviewData {
  weekStart: string;
  sessionsPlanned: number;
  sessionsDone: number;
  sessionsMissed: number;
  completionRate: number;
  minutesDone: number;
  tasksCompleted: { taskId: string; title: string }[];
  wentWell: ReviewTaskItem[];
  struggled: ReviewTaskItem[];
  missedDeadlines: { taskId: string; title: string }[];
  accuracy: AccuracyRow[];
  missedByDaypart: Record<Daypart, number>;
  improvements: Message[];
}

export interface InsightInput {
  now: Date;
  tasks: Task[];
  sessions: WorkSession[];
  feedback: FeedbackRecord[];
  prefs: Preferences;
  warnings?: ScheduleWarning[];
}

function inWeek(iso: string, weekStart: Date): boolean {
  const diff = differenceInCalendarDays(new Date(iso), weekStart);
  return diff >= 0 && diff < 7;
}

/** Estimation accuracy grouped by subject (or task type when there is no subject). */
export function accuracyRows(feedback: FeedbackRecord[]): AccuracyRow[] {
  const groups = new Map<string, FeedbackRecord[]>();
  for (const f of feedback) {
    if (!(f.actualMin > 0 && f.userEstimateMin > 0)) continue;
    const label = f.subject?.trim() || 'type:' + f.taskType;
    groups.set(label, [...(groups.get(label) ?? []), f]);
  }
  return [...groups.entries()]
    .map(([label, recs]) => ({
      label,
      ratio: Math.exp(recs.reduce((a, f) => a + Math.log(f.actualMin / f.userEstimateMin), 0) / recs.length),
      n: recs.length,
    }))
    .sort((a, b) => Math.abs(Math.log(b.ratio)) - Math.abs(Math.log(a.ratio)));
}

function countMissedByDaypart(sessions: WorkSession[]): Record<Daypart, number> {
  const out: Record<Daypart, number> = { morning: 0, afternoon: 0, evening: 0 };
  for (const s of sessions) if (s.status === 'missed') out[daypartOf(new Date(s.start))]++;
  return out;
}

function worstDaypart(counts: Record<Daypart, number>): Daypart | null {
  const entries = Object.entries(counts) as [Daypart, number][];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][1] >= 2 ? entries[0][0] : null;
}

export function buildWeeklyReview(weekStart: Date, input: InsightInput): WeeklyReviewData {
  const { tasks, sessions, feedback, now } = input;
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const weekSessions = sessions.filter((s) => inWeek(s.start, weekStart) && new Date(s.start) <= now);
  const done = weekSessions.filter((s) => s.status === 'done');
  const missed = weekSessions.filter((s) => s.status === 'missed' || s.status === 'skipped');
  const counted = done.length + missed.length;
  const weekFeedback = feedback.filter((f) => inWeek(f.createdAt, weekStart));

  const wentWell: ReviewTaskItem[] = [];
  const struggled: ReviewTaskItem[] = [];
  for (const f of weekFeedback) {
    const title = byId.get(f.taskId)?.title ?? '?';
    const ratio = f.actualMin / Math.max(1, f.plannedEstimateMin);
    if (!f.completed) {
      struggled.push({ taskId: f.taskId, title, reason: { key: 'review.reason.notCompleted' } });
    } else if (ratio > 1.2 || f.enoughTime === 'too-little') {
      struggled.push({
        taskId: f.taskId,
        title,
        reason: { key: 'review.reason.moreTime', params: { pct: Math.max(0, Math.round((ratio - 1) * 100)) } },
      });
    } else if (f.difficulty >= 4) {
      struggled.push({ taskId: f.taskId, title, reason: { key: 'review.reason.hard' } });
    } else if (ratio <= 1.05 && f.difficulty <= 3) {
      wentWell.push({
        taskId: f.taskId,
        title,
        reason: { key: 'review.reason.easy', params: { pct: Math.max(0, Math.round((1 - ratio) * 100)) } },
      });
    } else {
      wentWell.push({ taskId: f.taskId, title, reason: { key: 'review.reason.onTrack' } });
    }
  }

  const tasksCompleted = tasks
    .filter((t) => t.status === 'done' && t.completedAt && inWeek(t.completedAt, weekStart))
    .map((t) => ({ taskId: t.id, title: t.title }));
  const missedDeadlines = tasks
    .filter(
      (t) =>
        (t.status === 'overdue' || t.status === 'open') && inWeek(t.deadline, weekStart) && new Date(t.deadline) < now,
    )
    .map((t) => ({ taskId: t.id, title: t.title }));

  const dayparts = countMissedByDaypart(weekSessions);
  const completionRate = counted ? done.length / counted : 1;
  const accuracy = accuracyRows(feedback);

  const improvements: Message[] = [];
  const dp = worstDaypart(dayparts);
  if (dp) improvements.push({ key: 'improve.daypart', params: { daypart: dp, n: dayparts[dp] } });
  const under = accuracy.find((a) => a.n >= 2 && a.ratio > 1.15);
  if (under)
    improvements.push({
      key: 'improve.estimate',
      params: { label: under.label, pct: Math.round((under.ratio - 1) * 100) },
    });
  const tooLittle = weekFeedback.filter((f) => f.enoughTime === 'too-little').length;
  if (tooLittle >= 2) improvements.push({ key: 'improve.moreTime', params: { n: tooLittle } });
  if (counted >= 3 && completionRate < 0.6)
    improvements.push({ key: 'improve.lessPerDay', params: { pct: Math.round(completionRate * 100) } });
  if (missedDeadlines.length > 0)
    improvements.push({ key: 'improve.deadlines', params: { n: missedDeadlines.length } });
  if (improvements.length === 0) improvements.push({ key: 'improve.none' });

  return {
    weekStart: weekStart.toISOString(),
    sessionsPlanned: weekSessions.length,
    sessionsDone: done.length,
    sessionsMissed: missed.length,
    completionRate,
    minutesDone: done.reduce((a, s) => a + workedMinutes(s), 0),
    tasksCompleted,
    wentWell,
    struggled,
    missedDeadlines,
    accuracy,
    missedByDaypart: dayparts,
    improvements,
  };
}

export function buildWeeklyPlan(weekStart: Date, input: InsightInput, lastReview?: WeeklyReviewData): WeeklyPlanData {
  const { tasks, sessions, feedback, prefs } = input;
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const days: PlanDay[] = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);
    const daySessions = sessions
      .filter(
        (s) =>
          (s.status === 'planned' || s.status === 'done') && differenceInCalendarDays(new Date(s.start), date) === 0,
      )
      .sort((a, b) => a.start.localeCompare(b.start))
      .map((s) => ({
        sessionId: s.id,
        taskId: s.taskId,
        title: byId.get(s.taskId)?.title ?? '?',
        start: s.start,
        end: s.end,
        kind: s.kind,
      }));
    const totalMin = daySessions.reduce((a, s) => a + sessionMinutes({ start: s.start, end: s.end } as WorkSession), 0);
    days.push({
      date: date.toISOString(),
      sessions: daySessions,
      totalMin,
      heavy: totalMin >= prefs.maxMinutesPerDay * 0.85,
    });
  }
  const deadlines = tasks
    .filter((t) => t.status === 'open' && inWeek(t.deadline, weekStart))
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .map((t) => ({ taskId: t.id, title: t.title, deadline: t.deadline, type: t.type }));

  const focus: Message[] = [];
  // Estimation bias for the kinds of work that are on the plan this week.
  const seen = new Set<string>();
  for (const day of days) {
    for (const s of day.sessions) {
      const task = byId.get(s.taskId);
      if (!task) continue;
      const label = task.subject?.trim() || task.type;
      if (seen.has(label)) continue;
      seen.add(label);
      const { basis, records } = comparableFeedback(task, feedback);
      if (basis === 'none' || basis === 'all') continue;
      const f = correctionFactor(records);
      if (f > 1.15) focus.push({ key: 'focus.underestimate', params: { label, pct: Math.round((f - 1) * 100) } });
      else if (f < 0.85) focus.push({ key: 'focus.overestimate', params: { label, pct: Math.round((1 - f) * 100) } });
    }
  }
  if (lastReview) {
    if (lastReview.sessionsDone + lastReview.sessionsMissed >= 3 && lastReview.completionRate < 0.7) {
      focus.push({ key: 'focus.lowCompletion', params: { pct: Math.round(lastReview.completionRate * 100) } });
    }
    const dp = worstDaypart(lastReview.missedByDaypart);
    if (dp) focus.push({ key: 'focus.daypart', params: { daypart: dp } });
  }
  const heavy = days.filter((d) => d.heavy);
  if (heavy.length > 0) focus.push({ key: 'focus.heavyDay', params: { date: heavy[0].date } });
  if (deadlines.length >= 3) focus.push({ key: 'focus.busyWeek', params: { n: deadlines.length } });
  if (focus.length === 0) focus.push({ key: 'focus.keepGoing' });

  return {
    weekStart: weekStart.toISOString(),
    days,
    deadlines,
    totalMin: days.reduce((a, d) => a + d.totalMin, 0),
    focus: focus.slice(0, 3),
    warnings: input.warnings?.length ?? 0,
  };
}
