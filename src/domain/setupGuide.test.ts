import { describe, expect, it } from 'vitest';
import { setupState } from './setupGuide';
import { makeTask } from './testUtils';
import { type BusyBlock, DEFAULT_PREFERENCES } from './types';

const prefs = { ...DEFAULT_PREFERENCES, onboarded: true };
const busy = (source: BusyBlock['source']): BusyBlock => ({
  id: source,
  start: '2026-10-13T09:00:00.000Z',
  end: '2026-10-13T11:00:00.000Z',
  source,
});
const done = (s: ReturnType<typeof setupState>) => s.steps.map((x) => [x.step, x.done]);

describe('setup guide', () => {
  it('shows three open steps to a new user', () => {
    const s = setupState(prefs, [], [], 'default');
    expect(done(s)).toEqual([
      ['timetable', false],
      ['task', false],
      ['reminders', false],
    ]);
    expect(s.visible).toBe(true);
  });

  it('ticks off each step from the data', () => {
    expect(done(setupState(prefs, [busy('ics')], [makeTask()], 'granted'))).toEqual([
      ['timetable', true],
      ['task', true],
      ['reminders', true],
    ]);
  });

  it('does not count a hand-made appointment as a timetable', () => {
    expect(setupState(prefs, [busy('local')], [], 'default').steps[0].done).toBe(false);
    expect(setupState(prefs, [busy('microsoft')], [], 'default').steps[0].done).toBe(true);
  });

  it('needs both the permission and reminders switched on', () => {
    expect(setupState(prefs, [], [], 'denied').steps[2].done).toBe(false);
    expect(setupState({ ...prefs, reminders: false }, [], [], 'granted').steps[2].done).toBe(false);
  });

  it('skips the reminders step where the device has no notifications', () => {
    const s = setupState(prefs, [busy('ics')], [makeTask()], 'unsupported');
    expect(s.steps.map((x) => x.step)).toEqual(['timetable', 'task']);
    expect(s.visible).toBe(false);
  });

  it('hides once everything is done or the user closed it', () => {
    expect(setupState(prefs, [busy('ics')], [makeTask()], 'granted').visible).toBe(false);
    expect(setupState({ ...prefs, setupGuideHidden: true }, [], [], 'default').visible).toBe(false);
  });
});
