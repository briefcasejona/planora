import { describe, expect, it } from 'vitest';
import { draftStepIssues, dueFromDateInput, dueToDateInput, toSavedSteps } from './stepDraft';

const day = (d: number) => new Date(2026, 9, d, 23, 59, 59, 999);

describe('step editing helpers', () => {
  it('turns a date input into the end of that local day and back', () => {
    const due = dueFromDateInput('2026-10-15');
    expect(due).toBe(day(15).toISOString());
    expect(dueToDateInput(due)).toBe('2026-10-15');
    expect(dueFromDateInput('')).toBeUndefined();
    expect(dueToDateInput(undefined)).toBe('');
  });

  it('saves drafts with due, trimmed who and unknown fields, and drops empty ones', () => {
    const drafts = [
      { id: 'a', title: ' One ', estimateMin: 30, done: true, due: day(14).toISOString(), who: '  Sanne ', future: 1 },
      { title: 'Two', estimateMin: 60, who: '   ', due: '' },
    ];
    const saved = toSavedSteps(drafts, () => 'new');
    expect(saved[0]).toEqual({
      id: 'a',
      title: 'One',
      estimateMin: 30,
      order: 0,
      done: true,
      due: day(14).toISOString(),
      who: 'Sanne',
      future: 1,
    });
    expect(saved[1]).toEqual({ id: 'new', title: 'Two', estimateMin: 60, order: 1, done: false });
  });

  it('reports date issues by draft position', () => {
    const drafts = [
      { title: 'a', estimateMin: 30, due: day(15).toISOString() },
      { title: 'b', estimateMin: 30, due: day(14).toISOString() },
    ];
    expect(draftStepIssues(drafts, day(20), new Date(2026, 9, 10))).toEqual([{ index: 1, kind: 'before-previous' }]);
    expect(draftStepIssues(drafts, new Date('x'), new Date(2026, 9, 10))).toEqual([]);
  });
});
