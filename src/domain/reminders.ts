import { addDays, differenceInMinutes, parseISO, setHours, startOfDay, subDays, subMinutes } from 'date-fns';
import type { Task, WorkSession } from './types';

/** Minutes before a study block that its reminder fires. */
export const BLOCK_LEAD_MIN = 10;
/** Hour on the day before a deadline that its reminder fires. */
export const DEADLINE_HOUR = 18;
/** How far ahead reminders are scheduled on the device. */
export const HORIZON_DAYS = 7;
/** Phones cap scheduled notifications (iOS at 64); stay well below. */
export const MAX_REMINDERS = 60;
/** Ids below this are the weekly plan and review notifications. */
export const FIRST_REMINDER_ID = 1000;

export interface Reminder {
  /** Stable for the same block or deadline, so rescheduling replaces rather than duplicates. */
  id: number;
  at: Date;
  kind: 'block' | 'deadline';
  task: Task;
  session?: WorkSession;
}

const ACTIVE: Task['status'][] = ['open', 'overdue'];

/** A positive 31-bit id (Android notification ids are ints) from a string key. */
export function reminderId(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (Math.imul(h, 31) + key.charCodeAt(i)) | 0;
  return FIRST_REMINDER_ID + (Math.abs(h) % (2 ** 31 - 1 - FIRST_REMINDER_ID));
}

/**
 * Reminders for the coming days: 10 minutes before each planned study block and at 18:00 the day
 * before each deadline. Blocks already done, skipped or missed, and tasks that are done or dropped,
 * get none.
 */
export function planReminders(
  now: Date,
  tasks: Task[],
  sessions: WorkSession[],
  horizonDays = HORIZON_DAYS,
): Reminder[] {
  const until = addDays(now, horizonDays);
  const inWindow = (at: Date) => at > now && at <= until;
  const byId = new Map(tasks.filter((t) => ACTIVE.includes(t.status)).map((t) => [t.id, t]));
  const out: Reminder[] = [];
  for (const s of sessions) {
    const task = byId.get(s.taskId);
    if (!task || s.status !== 'planned') continue;
    const at = subMinutes(parseISO(s.start), BLOCK_LEAD_MIN);
    if (inWindow(at)) out.push({ id: reminderId(`block:${s.id}`), at, kind: 'block', task, session: s });
  }
  for (const task of byId.values()) {
    const at = setHours(startOfDay(subDays(parseISO(task.deadline), 1)), DEADLINE_HOUR);
    if (inWindow(at)) out.push({ id: reminderId(`deadline:${task.id}`), at, kind: 'deadline', task });
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, MAX_REMINDERS);
}

/** Length of a block in whole minutes. */
export function blockMinutes(s: WorkSession): number {
  return differenceInMinutes(parseISO(s.end), parseISO(s.start));
}
