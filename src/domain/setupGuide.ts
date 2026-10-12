import type { BusyBlock, Preferences, Task } from './types';

export type SetupStep = 'timetable' | 'task' | 'reminders';

export interface SetupState {
  /** The steps in order, each with whether it is done. */
  steps: { step: SetupStep; done: boolean }[];
  /** Whether the "Get started" card shows at all. */
  visible: boolean;
}

/**
 * The first-time "Get started" card: import a timetable, add a first deadline, allow reminders.
 * Each step counts as done from the data itself, so the card also fits users who did a step elsewhere.
 * `notifications` is the device's permission; 'unsupported' skips the reminders step.
 */
export function setupState(
  prefs: Preferences,
  busy: BusyBlock[],
  tasks: Task[],
  notifications: 'granted' | 'denied' | 'default' | 'unsupported',
): SetupState {
  const steps: SetupState['steps'] = [
    // Appointments typed in by hand are not a timetable; imported or connected calendars are.
    { step: 'timetable', done: busy.some((b) => b.source !== 'local') },
    { step: 'task', done: tasks.length > 0 },
  ];
  if (notifications !== 'unsupported')
    steps.push({ step: 'reminders', done: prefs.reminders !== false && notifications === 'granted' });
  return { steps, visible: !prefs.setupGuideHidden && steps.some((s) => !s.done) };
}
