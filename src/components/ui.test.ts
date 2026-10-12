import { describe, expect, it } from 'vitest';
import type { EventCategory } from '../domain/types';
import { BUSY_HEX, CATEGORY_HEX, categoryHex, categoryLabel } from './ui';

const known: Record<string, string> = { 'category.lecture': 'Lecture', 'calendar.busy': 'Busy' };
const t = ((key: string, opts?: { defaultValue?: string }) => known[key] ?? opts?.defaultValue ?? key) as never;

describe('event kinds', () => {
  it('shows the name and colour of a known kind', () => {
    expect(categoryLabel(t, 'lecture')).toBe('Lecture');
    expect(categoryHex('lecture')).toBe(CATEGORY_HEX.lecture);
  });

  it('shows a kind from a newer device as plain busy time', () => {
    const future = 'seminar' as EventCategory;
    expect(categoryLabel(t, future)).toBe('Busy');
    expect(categoryHex(future)).toBe(BUSY_HEX);
    expect(categoryLabel(t, undefined)).toBe('Busy');
  });
});
