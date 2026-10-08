import { startOfDay } from 'date-fns';

export const SLOT_MIN = 15;

export function parseHM(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function atMinutes(day: Date, minutes: number): Date {
  // Set the wall-clock time so daylight-saving days (23 or 25 hours) stay correct.
  const d = startOfDay(day);
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d;
}

export function minutesBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 60000);
}

export function roundUpToSlot(d: Date): Date {
  const ms = SLOT_MIN * 60000;
  return new Date(Math.ceil(d.getTime() / ms) * ms);
}

export function roundTo5(min: number): number {
  return Math.max(5, Math.round(min / 5) * 5);
}

export interface Interval {
  start: Date;
  end: Date;
}

/** Subtract `cuts` from `base`, returning the remaining (sorted, non-empty) intervals. */
export function subtractIntervals(base: Interval[], cuts: Interval[]): Interval[] {
  let result = base.map((b) => ({ ...b }));
  for (const c of cuts) {
    const next: Interval[] = [];
    for (const r of result) {
      if (c.end <= r.start || c.start >= r.end) {
        next.push(r);
        continue;
      }
      if (c.start > r.start) next.push({ start: r.start, end: c.start });
      if (c.end < r.end) next.push({ start: c.end, end: r.end });
    }
    result = next;
  }
  return result.filter((r) => r.end > r.start).sort((a, b) => +a.start - +b.start);
}

export function formatDuration(min: number, hourUnit = 'h'): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}${hourUnit}`;
  return `${h}${hourUnit}${String(m).padStart(2, '0')}`;
}
