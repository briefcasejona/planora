import { addDays, getISOWeek, startOfDay, startOfWeek } from 'date-fns';
import { expandBusy } from './busy';
import type { BusyBlock, Task, WorkSession } from './types';

interface TimelineWeek {
  start: Date;
  /** ISO week number, for the header ("wk 49"). */
  week: number;
}

interface TimelineRow {
  stepId: string;
  title: string;
  who?: string;
  done: boolean;
  due?: Date;
  /** First start and last end of the step's planned or done blocks. Missing when the step has none. */
  barStart?: Date;
  barEnd?: Date;
  /** The bar ends after the due date, or the due date has passed while the step is not done. */
  late: boolean;
}

export interface Timeline {
  range: { start: Date; end: Date };
  weeks: TimelineWeek[];
  rows: TimelineRow[];
  /** Days (start of day) with a meeting. Titles are left out on purpose. */
  meetings: Date[];
  /** Only when today falls inside the range. */
  today?: Date;
  deadline: Date;
}

const inRange = (d: Date, start: Date, end: Date) => d >= start && d <= end;

/**
 * The read-only plan of a project: one row per step with a bar from its first to its last
 * block, a week grid from the Monday of the earliest relevant day to the deadline (at least a week).
 */
export function buildTimeline(task: Task, sessions: WorkSession[], busy: BusyBlock[], now: Date): Timeline {
  const mine = sessions.filter((s) => s.taskId === task.id);
  const live = mine.filter((s) => s.status !== 'missed' && s.status !== 'skipped');
  const deadline = startOfDay(new Date(task.deadline));
  const earliest = [now, new Date(task.createdAt), ...mine.map((s) => new Date(s.start))].reduce((a, b) =>
    b < a ? b : a,
  );
  const start = startOfWeek(earliest, { weekStartsOn: 1 });
  const minEnd = addDays(start, 7);
  const end = deadline > minEnd ? deadline : minEnd;

  const weeks: TimelineWeek[] = [];
  for (let w = start; w < end; w = addDays(w, 7)) weeks.push({ start: w, week: getISOWeek(w) });

  const rows = [...(task.steps ?? [])]
    .sort((a, b) => a.order - b.order)
    .map((step): TimelineRow => {
      const blocks = live.filter((s) => s.stepId === step.id);
      const barStart = blocks.length ? new Date(Math.min(...blocks.map((s) => +new Date(s.start)))) : undefined;
      const barEnd = blocks.length ? new Date(Math.max(...blocks.map((s) => +new Date(s.end)))) : undefined;
      const due = step.due ? new Date(step.due) : undefined;
      const late = !!due && ((!!barEnd && barEnd > due) || (!step.done && due < now));
      return { stepId: step.id, title: step.title, who: step.who, done: step.done, due, barStart, barEnd, late };
    });

  const meetingDays = new Map<number, Date>();
  const meetings = busy.filter((b) => b.category === 'meeting');
  for (const m of expandBusy(meetings, start, addDays(end, 1))) {
    const day = startOfDay(m.start);
    meetingDays.set(+day, day);
  }

  return {
    range: { start, end },
    weeks,
    rows,
    meetings: [...meetingDays.values()].sort((a, b) => +a - +b),
    today: inRange(now, start, addDays(end, 1)) ? now : undefined,
    deadline,
  };
}

/** `strokenplanning-<slug of the title>.png`, safe as a file name on every platform. */
export function timelineFileName(title: string): string {
  const slug = title
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
    .replace(/-+$/, '');
  return `strokenplanning-${slug || 'project'}.png`;
}
