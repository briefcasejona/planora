// Core domain model for Planora. All dates are ISO-8601 strings (local time is
// derived when needed); durations are whole minutes.

export type Role = 'student' | 'teacher';
export type Language = 'nl' | 'en';

export type TaskType =
  | 'test'
  | 'assignment'
  | 'project'
  | 'task'
  | 'grading'
  | 'lessonprep';

export const STUDENT_TYPES: TaskType[] = ['test', 'assignment', 'project', 'task'];
export const TEACHER_TYPES: TaskType[] = ['grading', 'lessonprep', 'project', 'task', 'test'];

export type TaskStatus = 'open' | 'done' | 'overdue' | 'dropped';
export type TaskSource = 'manual' | 'ms-todo' | 'ms-teams' | 'ics';

export interface ProjectStep {
  id: string;
  title: string;
  estimateMin: number;
  order: number;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  type: TaskType;
  subject?: string;
  deadline: string;
  /** What the user predicted. Used by the estimator to learn the user's bias. */
  userEstimateMin: number;
  /** What the scheduler plans with (user estimate, or the accepted suggestion). */
  plannedEstimateMin: number;
  difficulty?: 1 | 2 | 3 | 4 | 5;
  status: TaskStatus;
  steps?: ProjectStep[];
  notes?: string;
  source: TaskSource;
  externalId?: string;
  createdAt: string;
  completedAt?: string;
  feedbackGiven: boolean;
  redoCount: number;
}

export type SessionStatus = 'planned' | 'done' | 'missed' | 'skipped';
export type SessionKind = 'work' | 'study' | 'review';

export interface WorkSession {
  id: string;
  taskId: string;
  stepId?: string;
  start: string;
  end: string;
  status: SessionStatus;
  kind: SessionKind;
  /** A locked session is never moved by the scheduler (user dragged/pinned it). */
  locked: boolean;
  actualMin?: number;
  /** Id of the event Planora created in an external calendar (Outlook). */
  externalEventId?: string;
}

export type BusySource = 'local' | 'microsoft' | 'google' | 'ics';

export interface BusyBlock {
  id: string;
  start: string;
  end: string;
  /** Only stored for local/ics events, or Microsoft when the user opts in. */
  title?: string;
  source: BusySource;
  allDay?: boolean;
  /** Local recurring events: repeat weekly on these weekdays (0 = Sunday) until `repeatUntil`. */
  repeatWeekdays?: number[];
  repeatUntil?: string;
}

export type EnoughTime = 'too-little' | 'right' | 'too-much';
export type SessionsNeeded = 'fewer' | 'same' | 'more';
export type SpacingPreference = 'spread' | 'crammed' | 'mixed';

export interface FeedbackRecord {
  id: string;
  taskId: string;
  taskType: TaskType;
  subject?: string;
  userEstimateMin: number;
  plannedEstimateMin: number;
  actualMin: number;
  plannedSessions: number;
  enoughTime: EnoughTime;
  sessionsNeeded: SessionsNeeded;
  difficulty: 1 | 2 | 3 | 4 | 5;
  spacing: SpacingPreference;
  grade?: string;
  completed: boolean;
  createdAt: string;
}

export interface DayAvailability {
  enabled: boolean;
  /** "HH:mm" local time */
  start: string;
  end: string;
}

export interface WeeklyMoment {
  /** 0 = Sunday … 6 = Saturday */
  weekday: number;
  time: string;
}

export interface Preferences {
  onboarded: boolean;
  role: Role;
  language: Language;
  /** Index 0 = Sunday … 6 = Saturday */
  availability: DayAvailability[];
  maxMinutesPerDay: number;
  minBlockMin: number;
  maxBlockMin: number;
  breakMin: number;
  deadlineBufferDays: number;
  weeklyPlan: WeeklyMoment;
  weeklyReview: WeeklyMoment;
}

export const DEFAULT_PREFERENCES: Preferences = {
  onboarded: false,
  role: 'student',
  language: 'nl',
  availability: [
    { enabled: true, start: '10:00', end: '17:00' },
    { enabled: true, start: '16:00', end: '21:00' },
    { enabled: true, start: '16:00', end: '21:00' },
    { enabled: true, start: '13:00', end: '21:00' },
    { enabled: true, start: '16:00', end: '21:00' },
    { enabled: true, start: '15:00', end: '19:00' },
    { enabled: true, start: '10:00', end: '14:00' },
  ],
  maxMinutesPerDay: 240,
  minBlockMin: 25,
  maxBlockMin: 90,
  breakMin: 15,
  deadlineBufferDays: 1,
  weeklyPlan: { weekday: 0, time: '19:00' },
  weeklyReview: { weekday: 6, time: '15:00' },
};

/** A localisable message: an i18n key plus interpolation values. */
export interface Message {
  key: string;
  params?: Record<string, string | number>;
}

export type WarningKind = 'infeasible' | 'buffer-squeezed' | 'deadline-passed';

export interface ScheduleWarning {
  taskId: string;
  kind: WarningKind;
  unplacedMin?: number;
}

export interface WeekReport {
  /** `${kind}:${weekStart}` */
  id: string;
  kind: 'plan' | 'review';
  weekStart: string;
  generatedAt: string;
  seenAt?: string;
  data: unknown;
}
