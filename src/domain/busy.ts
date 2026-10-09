import { addDays, differenceInMinutes, startOfDay } from 'date-fns';
import type { Interval } from './time';
import type { BusyBlock } from './types';

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

const SOURCE_RANK: Record<BusyBlock['source'], number> = { local: 0, ics: 1, microsoft: 2, google: 3 };
const normalize = (title?: string) => title?.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '') || undefined;

/**
 * The same appointment can arrive twice, e.g. a lesson from an imported timetable
 * and again from Outlook. Occurrences with the same start and end (within a
 * minute) and the same title (when both have one) are shown once, keeping the
 * one with the most information: your own events, then .ics, then Outlook, then Google.
 * Planning doesn't need this: overlapping busy time is simply busy.
 */
export function dedupeBusy<T extends Interval & { block: BusyBlock }>(items: T[]): T[] {
  const kept: T[] = [];
  const sorted = [...items].sort(
    (a, b) => +a.start - +b.start || SOURCE_RANK[a.block.source] - SOURCE_RANK[b.block.source],
  );
  for (const item of sorted) {
    let duplicate = false;
    for (let i = kept.length - 1; i >= 0 && +item.start - +kept[i].start <= 60000; i--) {
      const other = kept[i];
      const sameTime = Math.abs(+item.end - +other.end) <= 60000 && Math.abs(+item.start - +other.start) <= 60000;
      const a = normalize(item.block.title);
      const b = normalize(other.block.title);
      if (sameTime && (!a || !b || a === b) && item.block.source !== other.block.source) {
        if (SOURCE_RANK[item.block.source] < SOURCE_RANK[other.block.source]) kept[i] = item;
        duplicate = true;
        break;
      }
    }
    if (!duplicate) kept.push(item);
  }
  return kept;
}
