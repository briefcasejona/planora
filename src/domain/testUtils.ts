import { DEFAULT_PREFERENCES, type FeedbackRecord, type Preferences, type Task } from './types';

let counter = 0;
export const seqId = () => 'id' + ++counter;

export function prefsEveryEvening(overrides: Partial<Preferences> = {}): Preferences {
  return {
    ...DEFAULT_PREFERENCES,
    availability: Array.from({ length: 7 }, () => ({ enabled: true, start: '16:00', end: '21:00' })),
    ...overrides,
  };
}

export function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: seqId(),
    title: 'Task',
    type: 'assignment',
    deadline: new Date(2026, 9, 26, 9, 0).toISOString(),
    userEstimateMin: 120,
    plannedEstimateMin: 120,
    status: 'open',
    source: 'manual',
    createdAt: new Date(2026, 9, 12).toISOString(),
    feedbackGiven: false,
    redoCount: 0,
    ...overrides,
  };
}

export function makeFeedback(overrides: Partial<FeedbackRecord> = {}): FeedbackRecord {
  return {
    id: seqId(),
    taskId: seqId(),
    taskType: 'test',
    subject: 'Wiskunde',
    userEstimateMin: 120,
    plannedEstimateMin: 120,
    actualMin: 120,
    plannedSessions: 4,
    enoughTime: 'right',
    sessionsNeeded: 'same',
    difficulty: 3,
    spacing: 'spread',
    completed: true,
    createdAt: new Date(2026, 9, 1).toISOString(),
    ...overrides,
  };
}
