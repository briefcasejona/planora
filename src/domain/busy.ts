import { addDays, differenceInMinutes, startOfDay } from 'date-fns';
import type { BusyBlock } from './types';
import type { Interval } from './time';

/** Expand weekly-recurring local events into concrete intervals within [from, to). */
export function expandBusy(blocks: BusyBlock[], from: Date, to: Date): (Interval & { block: BusyBlock })[] {
  const out: (Interval & { block: BusyBlock })[] = [];
  for (const b of blocks) {
    const start = new Date(b.start);
    const end = new Date(b.end);
    if (!b.repeatWeekdays || b.repeatWeekdays.length === 0) {
      if (end > from && start < to) out.push({ start, end, block: b });
      continue;
    }
    const duration = differenceInMinutes(end, start);
    const until = b.repeatUntil ? new Date(b.repeatUntil) : to;
    let day = startOfDay(start > from ? start : from);
    while (day < to && day <= until) {
      if (b.repeatWeekdays.includes(day.getDay())) {
        const s = new Date(day);
        s.setHours(start.getHours(), start.getMinutes(), 0, 0);
        const e = new Date(s.getTime() + duration * 60000);
        if (s >= start && e > from && s < to) out.push({ start: s, end: e, block: b });
      }
      day = addDays(day, 1);
    }
  }
  return out.sort((a, b) => +a.start - +b.start);
}
