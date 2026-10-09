import { addDays, differenceInCalendarDays, startOfDay } from 'date-fns';
import { expandBusy } from './busy';
import { SCHOOL_CATEGORIES } from './categories';
import { suggestSessionCount } from './estimator';
import { evenDayOffsets, spacedDayOffsets, splitMinutes } from './spacing';
import { atMinutes, type Interval, minutesBetween, parseHM, roundUpToSlot, subtractIntervals } from './time';
import type { BusyBlock, FeedbackRecord, Preferences, ScheduleWarning, SessionKind, Task, WorkSession } from './types';

export interface ScheduleInput {
  now: Date;
  tasks: Task[];
  sessions: WorkSession[];
  busy: BusyBlock[];
  prefs: Preferences;
  feedback: FeedbackRecord[];
  newId?: () => string;
}

export interface ScheduleResult {
  /** Sessions that stay as they are (done, missed, locked, past or in progress). */
  keep: WorkSession[];
  /** Freshly planned sessions. */
  created: WorkSession[];
  /** Ids of future, unlocked planned sessions that were replaced. */
  removedIds: string[];
  warnings: ScheduleWarning[];
}

interface Chunk {
  taskId: string;
  stepId?: string;
  kind: SessionKind;
  minutes: number;
  targetDay: number;
  earliest: Date;
  latest: Date;
  hardLatest: Date;
  /** Project step order (1-based); later steps may not start before earlier steps end. */
  order: number;
}

interface DayState {
  free: Interval[];
  usedMin: number;
  taskIds: Set<string>;
}

const DAY_MS = 86400000;

export function sessionMinutes(s: WorkSession): number {
  return minutesBetween(new Date(s.start), new Date(s.end));
}

/** Minutes of real work recorded on a session (actual if given, else its length). */
export function workedMinutes(s: WorkSession): number {
  return s.actualMin ?? sessionMinutes(s);
}

export function isFixed(s: WorkSession, now: Date): boolean {
  return s.status !== 'planned' || s.locked || new Date(s.start) < now;
}

/** Projects: step estimates are the user's; scale them by the estimator correction. */
export function stepScale(task: Task): number {
  const sum = (task.steps ?? []).reduce((a, s) => a + s.estimateMin, 0);
  if (!sum || !task.userEstimateMin) return 1;
  return task.plannedEstimateMin / task.userEstimateMin;
}

/** Remaining minutes still to plan for a task (or one step), given kept sessions. */
export function remainingMinutes(task: Task, kept: WorkSession[], stepId?: string): number {
  const relevant = kept.filter((s) => s.taskId === task.id && (stepId === undefined || s.stepId === stepId));
  const accounted = relevant.reduce((acc, s) => {
    if (s.status === 'done') return acc + workedMinutes(s);
    if (s.status === 'planned') return acc + sessionMinutes(s);
    return acc; // missed and skipped sessions do not count as work
  }, 0);
  let target = task.plannedEstimateMin;
  if (stepId !== undefined && task.steps) {
    const step = task.steps.find((st) => st.id === stepId);
    if (!step || step.done) return 0;
    target = Math.round(step.estimateMin * stepScale(task));
  }
  return Math.max(0, target - accounted);
}

function latestFor(task: Task, prefs: Preferences, earliest: Date): { latest: Date; hardLatest: Date } {
  const deadline = new Date(task.deadline);
  if (task.type === 'test') {
    // Study up to the evening before; on the test day itself only if nothing else fits.
    const dayBefore = startOfDay(deadline);
    return { latest: dayBefore > earliest ? dayBefore : deadline, hardLatest: deadline };
  }
  const buffered = addDays(deadline, -prefs.deadlineBufferDays);
  return { latest: buffered > earliest ? buffered : deadline, hardLatest: deadline };
}

function buildChunks(task: Task, kept: WorkSession[], input: ScheduleInput, earliest: Date, today: Date): Chunk[] {
  const { prefs, feedback } = input;
  const { latest, hardLatest } = latestFor(task, prefs, earliest);
  const windowDays = Math.max(1, differenceInCalendarDays(new Date(latest.getTime() - 1), today) + 1);
  const chunks: Chunk[] = [];

  if (task.type === 'project' && task.steps && task.steps.length > 0) {
    const steps = [...task.steps].sort((a, b) => a.order - b.order).filter((s) => !s.done);
    const remaining = steps.map((s) => remainingMinutes(task, kept, s.id));
    const total = remaining.reduce((a, b) => a + b, 0);
    if (total === 0) return [];
    const span = latest.getTime() - earliest.getTime();
    let cumulative = 0;
    steps.forEach((step, i) => {
      const rem = remaining[i];
      if (rem <= 0) return;
      const startShare = cumulative / total;
      cumulative += rem;
      const endShare = cumulative / total;
      const stepEarliest = new Date(earliest.getTime() + span * startShare);
      const stepLatest = new Date(earliest.getTime() + span * endShare);
      const firstDay = Math.max(0, differenceInCalendarDays(stepEarliest, today));
      const lastDay = Math.max(firstDay, differenceInCalendarDays(new Date(stepLatest.getTime() - 1), today));
      const blocks = splitMinutes(rem, Math.ceil(rem / prefs.maxBlockMin), prefs.minBlockMin, prefs.maxBlockMin);
      const offsets = evenDayOffsets(lastDay - firstDay + 1, blocks.length);
      blocks.forEach((minutes, j) =>
        chunks.push({
          taskId: task.id,
          stepId: step.id,
          kind: 'work',
          minutes,
          targetDay: firstDay + (offsets[j] ?? 0),
          earliest,
          // Soft step deadline; the second pass may use the whole project window.
          latest: stepLatest > earliest ? stepLatest : latest,
          hardLatest,
          order: i + 1,
        }),
      );
    });
    return chunks;
  }

  const rem = remainingMinutes(task, kept);
  if (rem <= 0) return [];
  const n = suggestSessionCount(task, rem, prefs.maxBlockMin, feedback);
  const isTest = task.type === 'test';
  const blocks = splitMinutes(rem, n, prefs.minBlockMin, prefs.maxBlockMin, isTest);
  let offsets: number[];
  if (isTest) offsets = spacedDayOffsets(windowDays, blocks.length);
  else if (task.type === 'task' && blocks.length === 1) offsets = [0];
  else offsets = evenDayOffsets(windowDays, blocks.length);
  blocks.forEach((minutes, j) =>
    chunks.push({
      taskId: task.id,
      kind: isTest ? (j === blocks.length - 1 && blocks.length > 2 ? 'review' : 'study') : 'work',
      minutes,
      targetDay: offsets[Math.min(j, offsets.length - 1)] ?? 0,
      earliest,
      latest,
      hardLatest,
      order: 0,
    }),
  );
  return chunks;
}

function buildDays(
  input: ScheduleInput,
  kept: WorkSession[],
  earliest: Date,
  today: Date,
  horizonDays: number,
): DayState[] {
  const { prefs, busy } = input;
  const horizonEnd = addDays(today, horizonDays);
  const lessonPad = prefs.lessonBufferMin * 60000;
  const busyIntervals = expandBusy(busy, today, horizonEnd).map((x) =>
    lessonPad && x.block.category && SCHOOL_CATEGORIES.includes(x.block.category)
      ? { ...x, end: new Date(x.end.getTime() + lessonPad) }
      : x,
  );
  const keptActive = kept.filter((s) => s.status === 'planned' || s.status === 'done');
  const pad = prefs.breakMin * 60000;
  const keptCuts: Interval[] = keptActive.map((s) => ({
    start: new Date(new Date(s.start).getTime() - pad),
    end: new Date(new Date(s.end).getTime() + pad),
  }));

  const days: DayState[] = [];
  for (let i = 0; i < horizonDays; i++) {
    const day = addDays(today, i);
    const avail = prefs.availability[day.getDay()];
    const state: DayState = { free: [], usedMin: 0, taskIds: new Set() };
    for (const s of keptActive) {
      if (differenceInCalendarDays(new Date(s.start), day) === 0) {
        state.usedMin += sessionMinutes(s);
        state.taskIds.add(s.taskId);
      }
    }
    if (avail?.enabled) {
      let start = atMinutes(day, parseHM(avail.start));
      const end = atMinutes(day, parseHM(avail.end));
      if (start < earliest) start = earliest;
      if (end > start) {
        state.free = subtractIntervals([{ start, end }], [...busyIntervals, ...keptCuts]);
      }
    }
    days.push(state);
  }
  return days;
}

/** Find a slot in `day` for up to `wanted` minutes between `from` and `until`. */
function findSlot(
  day: DayState,
  wanted: number,
  minBlock: number,
  from: Date,
  until: Date,
  cap: number,
): Interval | null {
  const budget = Math.min(wanted, cap - day.usedMin);
  if (budget < Math.min(wanted, minBlock)) return null;
  let best: Interval | null = null;
  for (const f of day.free) {
    const s = f.start < from ? roundUpToSlot(from) : f.start;
    const e = f.end > until ? until : f.end;
    const len = minutesBetween(s, e);
    if (len <= 0) continue;
    if (len >= budget) return { start: s, end: new Date(s.getTime() + budget * 60000) };
    if (len >= minBlock && (!best || len > minutesBetween(best.start, best.end))) {
      best = { start: s, end: e };
    }
  }
  return best;
}

function occupy(day: DayState, slot: Interval, breakMin: number, taskId: string): void {
  const pad = breakMin * 60000;
  day.free = subtractIntervals(day.free, [
    { start: new Date(slot.start.getTime() - pad), end: new Date(slot.end.getTime() + pad) },
  ]);
  day.usedMin += minutesBetween(slot.start, slot.end);
  day.taskIds.add(taskId);
}

/** Day indices to try: the target first, then alternating later/earlier. */
function dayOrder(target: number, first: number, last: number): number[] {
  const order: number[] = [];
  const t = Math.min(Math.max(target, first), last);
  for (let d = 0; t + d <= last || t - d >= first; d++) {
    if (t + d <= last) order.push(t + d);
    if (d > 0 && t - d >= first) order.push(t - d);
  }
  return order;
}

/**
 * Rebuild the future plan. Everything already done, missed, locked, in the past
 * or in progress is kept; all other planned sessions are replaced by a fresh,
 * deadline-aware distribution of the remaining work.
 */
export function schedule(input: ScheduleInput): ScheduleResult {
  const { now, prefs } = input;
  const newId = input.newId ?? (() => crypto.randomUUID());
  const keep = input.sessions.filter((s) => isFixed(s, now));
  const removedIds = input.sessions.filter((s) => !isFixed(s, now)).map((s) => s.id);
  const warnings: ScheduleWarning[] = [];

  const earliest = roundUpToSlot(now);
  const today = startOfDay(now);
  const plannable: Task[] = [];
  for (const t of input.tasks) {
    if (t.status !== 'open') continue;
    if (new Date(t.deadline) <= now) {
      if (remainingMinutes(t, keep) > 0) warnings.push({ taskId: t.id, kind: 'deadline-passed' });
      continue;
    }
    plannable.push(t);
  }
  const maxDeadline = plannable.reduce((m, t) => Math.max(m, new Date(t.deadline).getTime()), now.getTime());
  const horizonDays = Math.max(1, Math.min(366, Math.ceil((maxDeadline - today.getTime()) / DAY_MS) + 1));
  const days = buildDays(input, keep, earliest, today, horizonDays);

  const chunks = plannable.flatMap((t) => buildChunks(t, keep, input, earliest, today));
  // Earliest deadline first; project steps in order.
  chunks.sort((a, b) => +a.latest - +b.latest || a.order - b.order || a.targetDay - b.targetDay);

  const created: WorkSession[] = [];
  const stepEnd = new Map<string, Date>();
  const stepKey = (taskId: string, order: number) => taskId + '|' + order;

  const place = (chunk: Chunk, until: Date): number => {
    let remaining = chunk.minutes;
    let from = chunk.earliest;
    for (let o = 1; o < chunk.order; o++) {
      const end = stepEnd.get(stepKey(chunk.taskId, o));
      if (end && end > from) from = end;
    }
    const firstDay = Math.max(0, differenceInCalendarDays(from, today));
    const lastDay = Math.min(days.length - 1, differenceInCalendarDays(new Date(until.getTime() - 1), today));
    if (lastDay < firstDay) return remaining;
    const order = dayOrder(chunk.targetDay, firstDay, lastDay);
    // Prefer days without another session of the same task (spacing), then any day.
    for (const allowSameDay of [false, true]) {
      for (const d of order) {
        if (remaining <= 0) break;
        const day = days[d];
        if (!allowSameDay && day.taskIds.has(chunk.taskId)) continue;
        const slot = findSlot(day, remaining, prefs.minBlockMin, from, until, prefs.maxMinutesPerDay);
        if (!slot) continue;
        const len = minutesBetween(slot.start, slot.end);
        occupy(day, slot, prefs.breakMin, chunk.taskId);
        created.push({
          id: newId(),
          taskId: chunk.taskId,
          stepId: chunk.stepId,
          start: slot.start.toISOString(),
          end: slot.end.toISOString(),
          status: 'planned',
          kind: chunk.kind,
          locked: false,
        });
        const key = stepKey(chunk.taskId, chunk.order);
        const prev = stepEnd.get(key);
        if (!prev || slot.end > prev) stepEnd.set(key, slot.end);
        remaining -= len;
        // Tiny leftovers are absorbed rather than scheduled as a separate block.
        if (remaining < Math.min(prefs.minBlockMin, 15)) remaining = 0;
      }
      if (remaining <= 0) break;
    }
    return remaining;
  };

  const leftovers: Chunk[] = [];
  for (const chunk of chunks) {
    const rest = place(chunk, chunk.latest);
    if (rest > 0) leftovers.push({ ...chunk, minutes: rest });
  }
  const unplaced = new Map<string, number>();
  const squeezed = new Set<string>();
  for (const chunk of leftovers) {
    const rest = place(chunk, chunk.hardLatest);
    if (rest < chunk.minutes) squeezed.add(chunk.taskId);
    if (rest > 0) unplaced.set(chunk.taskId, (unplaced.get(chunk.taskId) ?? 0) + rest);
  }

  for (const [taskId, min] of unplaced) warnings.push({ taskId, kind: 'infeasible', unplacedMin: min });
  for (const taskId of squeezed) {
    if (!unplaced.has(taskId)) warnings.push({ taskId, kind: 'buffer-squeezed' });
  }

  created.sort((a, b) => a.start.localeCompare(b.start));
  return { keep, created, removedIds, warnings };
}
