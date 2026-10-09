import 'fake-indexeddb/auto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PlanoraDB } from './db';
import { useDatabase } from './repo';
import { actions, useStore } from './store';
import { DEFAULT_PREFERENCES } from '../domain/types';
import { sessionMinutes } from '../domain/scheduler';
import { currentPlanWeek, latestReviewWeek, planMoment, reviewMoment } from './moments';

const evening = Array.from({ length: 7 }, () => ({ enabled: true, start: '16:00', end: '21:00' }));

describe('store: plan, learn, replan', () => {
  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 12, 9, 0)); // Monday morning
    useDatabase(new PlanoraDB('store-test'));
    await actions.init();
    await actions.savePrefs({ ...DEFAULT_PREFERENCES, onboarded: true, availability: evening });
  });
  afterAll(() => vi.useRealTimers());

  it('schedules a new test right away', async () => {
    const task = await actions.addTask({
      title: 'Biologie H1', type: 'test', subject: 'Biologie', deadline: new Date(2026, 9, 26, 9).toISOString(),
      userEstimateMin: 240, useSuggestion: true,
    });
    const sessions = useStore.getState().sessions.filter((s) => s.taskId === task.id);
    expect(sessions.length).toBeGreaterThanOrEqual(3);
    expect(sessions.reduce((a, s) => a + sessionMinutes(s), 0)).toBeGreaterThanOrEqual(225);
  });

  it('learns from feedback and predicts more time for the next similar task', async () => {
    for (const title of ['Biologie H2', 'Biologie H3']) {
      const t = await actions.addTask({
        title, type: 'test', subject: 'Biologie', deadline: new Date(2026, 9, 30, 9).toISOString(), userEstimateMin: 120, useSuggestion: false,
      });
      await actions.completeTask(t.id);
      await actions.submitFeedback({
        taskId: t.id, completed: true, actualMin: 240, enoughTime: 'too-little', sessionsNeeded: 'more', difficulty: 4, spacing: 'spread',
      });
    }
    const s = actions.suggest({ type: 'test', subject: 'Biologie', userEstimateMin: 120 });
    expect(s.basis).toBe('subject');
    expect(s.suggestedMin).toBeGreaterThan(150);
    const next = await actions.addTask({
      title: 'Biologie H4', type: 'test', subject: 'Biologie', deadline: new Date(2026, 10, 2, 9).toISOString(), userEstimateMin: 120, useSuggestion: true,
    });
    expect(next.plannedEstimateMin).toBe(s.suggestedMin);
  });

  it('links a hand-made task to Teams without touching its plan', async () => {
    const task = await actions.addTask({
      title: 'Essay Engels', type: 'assignment', deadline: new Date(2026, 9, 28, 17).toISOString(), userEstimateMin: 180, useSuggestion: false,
    });
    const before = useStore.getState().sessions.filter((s) => s.taskId === task.id);
    await actions.linkTask(task.id, 'ms-teams', 'teams:abc');
    const linked = useStore.getState().tasks.find((t) => t.id === task.id)!;
    expect(linked).toMatchObject({ source: 'ms-teams', externalId: 'teams:abc', userEstimateMin: 180, plannedEstimateMin: 180 });
    expect(useStore.getState().sessions.filter((s) => s.taskId === task.id)).toEqual(before);
  });

  it('replans a missed session into the future', async () => {
    const task = useStore.getState().tasks.find((t) => t.title === 'Biologie H1')!;
    const first = useStore.getState().sessions.filter((s) => s.taskId === task.id).sort((a, b) => a.start.localeCompare(b.start))[0];
    vi.setSystemTime(new Date(new Date(first.end).getTime() + 60_000));
    await actions.setSessionStatus(first.id, 'missed');
    const after = useStore.getState().sessions.filter((s) => s.taskId === task.id && s.status === 'planned');
    const planned = after.reduce((a, s) => a + sessionMinutes(s), 0);
    expect(planned).toBeGreaterThanOrEqual(225);
    expect(after.every((s) => new Date(s.start) > new Date())).toBe(true);
  });

  it('marks tasks overdue after the deadline and asks for feedback', async () => {
    vi.setSystemTime(new Date(2026, 9, 27, 12));
    await actions.replan();
    const task = useStore.getState().tasks.find((t) => t.title === 'Biologie H1')!;
    expect(task.status).toBe('overdue');
    expect(useStore.getState().warnings.some((w) => w.taskId === task.id)).toBe(false);
  });
});

describe('weekly moments', () => {
  const plan = { weekday: 0, time: '19:00' };
  const review = { weekday: 6, time: '15:00' };
  it('presents the plan for next week on Sunday evening', () => {
    const sundayBefore = new Date(2026, 9, 18, 18, 0);
    const sundayAfter = new Date(2026, 9, 18, 19, 30);
    expect(currentPlanWeek(sundayBefore, plan).getDate()).toBe(12);
    expect(currentPlanWeek(sundayAfter, plan).getDate()).toBe(19);
    expect(planMoment(new Date(2026, 9, 19), plan)).toEqual(new Date(2026, 9, 18, 19, 0));
  });
  it('presents the review on Saturday afternoon', () => {
    expect(reviewMoment(new Date(2026, 9, 12), review)).toEqual(new Date(2026, 9, 17, 15, 0));
    expect(latestReviewWeek(new Date(2026, 9, 17, 14, 0), review).getDate()).toBe(5);
    expect(latestReviewWeek(new Date(2026, 9, 17, 16, 0), review).getDate()).toBe(12);
  });
});
