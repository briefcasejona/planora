import { describe, expect, it } from 'vitest';
import { correctionFactor, suggestEstimate, suggestSessionCount } from './estimator';
import { spacedDayOffsets, splitMinutes } from './spacing';
import { makeFeedback } from './testUtils';

describe('estimator', () => {
  it('keeps the user estimate when there is no data', () => {
    const s = suggestEstimate({ type: 'test', subject: 'Wiskunde', userEstimateMin: 120 }, []);
    expect(s.suggestedMin).toBe(120);
    expect(s.basis).toBe('none');
    expect(s.explanation.key).toBe('estimate.noData');
  });

  it('barely moves on a single outlier (shrinkage)', () => {
    const f = [makeFeedback({ actualMin: 360 }), makeFeedback({ actualMin: 120 })];
    const factor = correctionFactor(f);
    expect(factor).toBeGreaterThan(1);
    expect(factor).toBeLessThan(1.4);
  });

  it('converges to the true bias with repeated feedback', () => {
    const many = Array.from({ length: 20 }, () => makeFeedback({ actualMin: 180 }));
    const s = suggestEstimate({ type: 'test', subject: 'wiskunde', userEstimateMin: 100 }, many);
    expect(s.basis).toBe('subject');
    expect(s.factor).toBeGreaterThan(1.4);
    expect(s.factor).toBeLessThan(1.5);
    expect(s.explanation.key).toBe('estimate.under');
  });

  it('falls back from subject to type to everything', () => {
    const f = [makeFeedback({ subject: 'Engels' }), makeFeedback({ subject: 'Frans' })];
    expect(suggestEstimate({ type: 'test', subject: 'Wiskunde', userEstimateMin: 60 }, f).basis).toBe('type');
    const g = [...f, makeFeedback({ taskType: 'assignment' })];
    expect(suggestEstimate({ type: 'project', userEstimateMin: 60 }, g).basis).toBe('all');
  });

  it('learns to plan more sessions when feedback says more were needed', () => {
    const base = suggestSessionCount({ type: 'test', subject: 'Wiskunde' }, 240, 90, []);
    const more = Array.from({ length: 6 }, () => makeFeedback({ plannedSessions: 4, sessionsNeeded: 'more' }));
    expect(suggestSessionCount({ type: 'test', subject: 'Wiskunde' }, 240, 90, more)).toBeGreaterThan(base);
  });
});

describe('spacing', () => {
  it('produces increasing offsets that end on the last day and get denser', () => {
    const o = spacedDayOffsets(14, 7);
    expect(o[0]).toBe(0);
    expect(o[o.length - 1]).toBe(13);
    for (let i = 1; i < o.length; i++) expect(o[i]).toBeGreaterThan(o[i - 1]);
    expect(o[1] - o[0]).toBeGreaterThan(o[o.length - 1] - o[o.length - 2]);
  });

  it('handles short windows', () => {
    expect(spacedDayOffsets(3, 5)).toEqual([0, 1, 2]);
    expect(spacedDayOffsets(5, 1)).toEqual([4]);
  });

  it('splits minutes within block limits and keeps the total', () => {
    const b = splitMinutes(360, 5, 25, 90, true);
    expect(b.reduce((a, x) => a + x, 0)).toBe(360);
    for (const x of b) {
      expect(x).toBeGreaterThanOrEqual(25);
      expect(x).toBeLessThanOrEqual(90);
    }
    expect(b[b.length - 1]).toBeLessThan(b[0]);
  });
});
