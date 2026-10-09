import { create } from 'zustand';
import { addDays, addHours } from 'date-fns';
import type {
  BusyBlock,
  FeedbackRecord,
  Preferences,
  ProjectStep,
  ScheduleWarning,
  SessionStatus,
  Task,
  TaskSource,
  TaskType,
  WeekReport,
  WorkSession,
} from '../domain/types';
import { DEFAULT_PREFERENCES } from '../domain/types';
import { schedule } from '../domain/scheduler';
import { suggestEstimate } from '../domain/estimator';
import { reopenTask as reopen } from '../domain/replan';
import { buildWeeklyPlan, buildWeeklyReview, type WeeklyReviewData } from '../domain/insights';
import { repo, setEncryptionKey, setRequireKey } from './repo';
import { unlock } from './crypto';
import { currentPlanWeek, latestReviewWeek, planMoment, reviewMoment } from './moments';

export interface NewTaskInput {
  title: string;
  type: TaskType;
  subject?: string;
  deadline: string;
  userEstimateMin: number;
  useSuggestion: boolean;
  difficulty?: Task['difficulty'];
  notes?: string;
  steps?: Omit<ProjectStep, 'id' | 'done' | 'order'>[];
  source?: TaskSource;
  externalId?: string;
}

export interface FeedbackInput {
  taskId: string;
  completed: boolean;
  actualMin: number;
  enoughTime: FeedbackRecord['enoughTime'];
  sessionsNeeded: FeedbackRecord['sessionsNeeded'];
  difficulty: FeedbackRecord['difficulty'];
  spacing: FeedbackRecord['spacing'];
  grade?: string;
}

export interface AppState {
  ready: boolean;
  locked: boolean;
  tasks: Task[];
  sessions: WorkSession[];
  busy: BusyBlock[];
  feedback: FeedbackRecord[];
  reports: WeekReport[];
  prefs: Preferences;
  warnings: ScheduleWarning[];
}

type Listener = (state: AppState) => void;
const planListeners = new Set<Listener>();
/** Integrations (e.g. writing sessions to Outlook) subscribe to plan changes. */
export function onPlanChanged(fn: Listener): () => void {
  planListeners.add(fn);
  return () => planListeners.delete(fn);
}

/** Planned sessions that ended this long ago without a check-off become missed. */
const AUTO_MISS_AFTER_HOURS = 12;

export const useStore = create<AppState>(() => ({
  ready: false,
  locked: false,
  tasks: [],
  sessions: [],
  busy: [],
  feedback: [],
  reports: [],
  prefs: DEFAULT_PREFERENCES,
  warnings: [],
}));

const get = useStore.getState;
const set = useStore.setState;

let queue: Promise<void> = Promise.resolve();
/** Serialise all mutations so replans never interleave. */
function serial<T>(fn: () => Promise<T>): Promise<T> {
  // While locked nothing may read or write data (e.g. a background sync tick).
  const run = queue.then(() => (get().locked ? (undefined as T) : fn()));
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function loadAll(): Promise<void> {
  const [tasks, sessions, busy, feedback, reports, prefs] = await Promise.all([
    repo.listTasks(),
    repo.listSessions(),
    repo.listBusy(),
    repo.listFeedback(),
    repo.listReports(),
    repo.getPrefs(),
  ]);
  set({ tasks, sessions, busy, feedback, reports, prefs, locked: false });
}

async function replanNow(): Promise<void> {
  const now = new Date();
  const { tasks, sessions, busy, feedback, prefs } = get();
  const autoMissBefore = addHours(now, -AUTO_MISS_AFTER_HOURS);
  const changedSessions: WorkSession[] = [];
  const workingSessions = sessions.map((s) => {
    if (s.status === 'planned' && new Date(s.end) < autoMissBefore) {
      const m = { ...s, status: 'missed' as const, locked: false };
      changedSessions.push(m);
      return m;
    }
    return s;
  });
  const changedTasks: Task[] = [];
  const workingTasks = tasks.map((t) => {
    if (t.status === 'open' && new Date(t.deadline) <= now) {
      const o = { ...t, status: 'overdue' as const };
      changedTasks.push(o);
      return o;
    }
    return t;
  });

  const result = schedule({ now, tasks: workingTasks, sessions: workingSessions, busy, prefs, feedback });
  await repo.deleteSessions(result.removedIds);
  await repo.putSessions([...changedSessions, ...result.created]);
  await repo.putTasks(changedTasks);
  set({ tasks: workingTasks, sessions: [...result.keep, ...result.created], warnings: result.warnings });
  await ensureReportsNow();
  const state = get();
  for (const fn of planListeners) {
    try {
      fn(state);
    } catch (e) {
      console.error(e);
    }
  }
}

async function ensureReportsNow(): Promise<void> {
  const now = new Date();
  const state = get();
  if (!state.prefs.onboarded) return;
  const input = { now, tasks: state.tasks, sessions: state.sessions, feedback: state.feedback, prefs: state.prefs, warnings: state.warnings };
  const existing = new Set(state.reports.map((r) => r.id));
  const fresh: WeekReport[] = [];

  const reviewWeek = latestReviewWeek(now, state.prefs.weeklyReview);
  const reviewId = 'review:' + reviewWeek.toISOString();
  const hadActivity = state.sessions.some((s) => {
    const d = new Date(s.start);
    return d >= reviewWeek && d < addDays(reviewWeek, 7);
  });
  if (!existing.has(reviewId) && hadActivity && reviewMoment(reviewWeek, state.prefs.weeklyReview) <= now) {
    fresh.push({ id: reviewId, kind: 'review', weekStart: reviewWeek.toISOString(), generatedAt: now.toISOString(), data: buildWeeklyReview(reviewWeek, input) });
  }

  const planWeek = currentPlanWeek(now, state.prefs.weeklyPlan);
  const planId = 'plan:' + planWeek.toISOString();
  if (!existing.has(planId) && planMoment(planWeek, state.prefs.weeklyPlan) <= now) {
    const prevWeek = addDays(planWeek, -7);
    const prevReport = [...state.reports, ...fresh].find((r) => r.id === 'review:' + prevWeek.toISOString());
    const lastReview = (prevReport?.data as WeeklyReviewData | undefined) ?? buildWeeklyReview(prevWeek, input);
    fresh.push({ id: planId, kind: 'plan', weekStart: planWeek.toISOString(), generatedAt: now.toISOString(), data: buildWeeklyPlan(planWeek, input, lastReview) });
  }

  if (fresh.length) {
    await repo.putReports(fresh);
    set({ reports: [...state.reports, ...fresh] });
  }
}

function patchTask(task: Task): Promise<void> {
  set({ tasks: get().tasks.map((t) => (t.id === task.id ? task : t)) });
  return repo.putTasks([task]);
}

export const actions = {
  async init(): Promise<void> {
    const config = await repo.getCryptoConfig();
    if (config) {
      setRequireKey(true);
      const prefs = await repo.getPrefs();
      set({ ready: true, locked: true, prefs });
      return;
    }
    await loadAll();
    set({ ready: true });
    await serial(replanNow);
  },

  async unlock(passphrase: string): Promise<boolean> {
    const config = await repo.getCryptoConfig();
    if (!config) return true;
    const key = await unlock(passphrase, config);
    if (!key) return false;
    setEncryptionKey(key);
    await loadAll();
    await serial(replanNow);
    return true;
  },

  lock(): void {
    setEncryptionKey(null);
    set({ locked: true, tasks: [], sessions: [], busy: [], feedback: [], reports: [], warnings: [] });
  },

  reload: () =>
    serial(async () => {
      await loadAll();
      await replanNow();
    }),
  replan: () => serial(replanNow),
  ensureReports: () => serial(ensureReportsNow),

  suggest(input: Pick<NewTaskInput, 'type' | 'subject' | 'userEstimateMin'>) {
    return suggestEstimate(input, get().feedback);
  },

  addTask: (input: NewTaskInput) =>
    serial(async () => {
      const steps: ProjectStep[] | undefined = input.steps?.map((s, i) => ({ ...s, id: crypto.randomUUID(), order: i, done: false }));
      const userEstimateMin = steps && steps.length ? steps.reduce((a, s) => a + s.estimateMin, 0) : input.userEstimateMin;
      const suggestion = suggestEstimate({ type: input.type, subject: input.subject, userEstimateMin }, get().feedback);
      const task: Task = {
        id: crypto.randomUUID(),
        title: input.title.trim(),
        type: input.type,
        subject: input.subject?.trim() || undefined,
        deadline: input.deadline,
        userEstimateMin,
        plannedEstimateMin: input.useSuggestion ? suggestion.suggestedMin : userEstimateMin,
        difficulty: input.difficulty,
        status: 'open',
        steps,
        notes: input.notes,
        source: input.source ?? 'manual',
        externalId: input.externalId,
        createdAt: new Date().toISOString(),
        feedbackGiven: false,
        redoCount: 0,
      };
      await repo.putTasks([task]);
      set({ tasks: [...get().tasks, task] });
      await replanNow();
      return task;
    }),

  updateTask: (task: Task) =>
    serial(async () => {
      await patchTask(task);
      await replanNow();
    }),

  /**
   * Link a task the user entered by hand to the same item in Microsoft Teams or To Do,
   * so it isn't imported twice. Only the link changes: estimate, plan and progress stay.
   */
  linkTask: (id: string, source: TaskSource, externalId: string) =>
    serial(async () => {
      const task = get().tasks.find((t) => t.id === id);
      if (task) await patchTask({ ...task, source, externalId });
    }),

  deleteTask: (id: string) =>
    serial(async () => {
      await repo.deleteTask(id);
      set({ tasks: get().tasks.filter((t) => t.id !== id), sessions: get().sessions.filter((s) => s.taskId !== id) });
      await replanNow();
    }),

  completeTask: (id: string) =>
    serial(async () => {
      const task = get().tasks.find((t) => t.id === id);
      if (!task) return;
      const now = new Date();
      await patchTask({ ...task, status: 'done', completedAt: now.toISOString(), steps: task.steps?.map((s) => ({ ...s, done: true })) });
      // Leftover sessions for a finished task are no longer needed.
      const leftovers = get().sessions.filter((s) => s.taskId === id && s.status === 'planned');
      const future = leftovers.filter((s) => new Date(s.start) >= now).map((s) => s.id);
      const past = leftovers.filter((s) => new Date(s.start) < now).map((s) => ({ ...s, status: 'skipped' as const }));
      await repo.deleteSessions(future);
      await repo.putSessions(past);
      const pastById = new Map(past.map((s) => [s.id, s]));
      set({ sessions: get().sessions.filter((s) => !future.includes(s.id)).map((s) => pastById.get(s.id) ?? s) });
      await replanNow();
    }),

  dropTask: (id: string) =>
    serial(async () => {
      const task = get().tasks.find((t) => t.id === id);
      if (!task) return;
      await patchTask({ ...task, status: 'dropped', feedbackGiven: true });
      await replanNow();
    }),

  reopenTask: (id: string, remainingMin: number, newDeadline?: string) =>
    serial(async () => {
      const task = get().tasks.find((t) => t.id === id);
      if (!task) return;
      await patchTask(reopen(task, get().sessions, remainingMin, newDeadline));
      await replanNow();
    }),

  setSessionStatus: (id: string, status: SessionStatus, actualMin?: number) =>
    serial(async () => {
      const s = get().sessions.find((x) => x.id === id);
      if (!s) return;
      const updated: WorkSession = { ...s, status, actualMin: status === 'done' ? actualMin : undefined };
      await repo.putSessions([updated]);
      set({ sessions: get().sessions.map((x) => (x.id === id ? updated : x)) });
      await replanNow();
    }),

  /** The user moved a session: pin it there so the scheduler plans around it. */
  moveSession: (id: string, start: Date, end: Date) =>
    serial(async () => {
      const s = get().sessions.find((x) => x.id === id);
      if (!s) return;
      const updated: WorkSession = { ...s, start: start.toISOString(), end: end.toISOString(), locked: true };
      await repo.putSessions([updated]);
      set({ sessions: get().sessions.map((x) => (x.id === id ? updated : x)) });
      await replanNow();
    }),

  unlockSession: (id: string) =>
    serial(async () => {
      const s = get().sessions.find((x) => x.id === id);
      if (!s) return;
      const updated = { ...s, locked: false };
      await repo.putSessions([updated]);
      set({ sessions: get().sessions.map((x) => (x.id === id ? updated : x)) });
      await replanNow();
    }),

  saveBusy: (blocks: BusyBlock[]) =>
    serial(async () => {
      await repo.putBusy(blocks);
      const ids = new Set(blocks.map((b) => b.id));
      set({ busy: [...get().busy.filter((b) => !ids.has(b.id)), ...blocks] });
      await replanNow();
    }),

  deleteBusy: (ids: string[]) =>
    serial(async () => {
      await repo.deleteBusy(ids);
      set({ busy: get().busy.filter((b) => !ids.includes(b.id)) });
      await replanNow();
    }),

  /**
   * Replace all busy blocks of one external source (a sync result, or [] on disconnect).
   * With `importId`, only the blocks of that imported .ics file are replaced.
   */
  replaceBusySource: (source: BusyBlock['source'], blocks: BusyBlock[], importId?: string) =>
    serial(async () => {
      const replaced = (b: BusyBlock) => b.source === source && (importId === undefined || b.importId === importId);
      if (importId === undefined) await repo.deleteBusyBySource(source);
      else await repo.deleteBusy(get().busy.filter(replaced).map((b) => b.id));
      await repo.putBusy(blocks);
      set({ busy: [...get().busy.filter((b) => !replaced(b)), ...blocks] });
      await replanNow();
    }),

  /** Store bookkeeping changes to sessions (e.g. Outlook event ids) without replanning. */
  patchSessions: (updated: WorkSession[]) =>
    serial(async () => {
      if (!updated.length) return;
      await repo.putSessions(updated);
      const byId = new Map(updated.map((s) => [s.id, s]));
      set({ sessions: get().sessions.map((s) => byId.get(s.id) ?? s) });
    }),

  submitFeedback: (input: FeedbackInput) =>
    serial(async () => {
      const task = get().tasks.find((t) => t.id === input.taskId);
      if (!task) return;
      const now = new Date();
      const plannedSessions = get().sessions.filter(
        (s) => s.taskId === task.id && (s.status === 'done' || s.status === 'missed' || new Date(s.start) < now),
      ).length;
      const record: FeedbackRecord = {
        id: crypto.randomUUID(),
        taskId: task.id,
        taskType: task.type,
        subject: task.subject,
        userEstimateMin: task.userEstimateMin,
        plannedEstimateMin: task.plannedEstimateMin,
        actualMin: Math.max(1, input.actualMin),
        plannedSessions: Math.max(1, plannedSessions),
        enoughTime: input.enoughTime,
        sessionsNeeded: input.sessionsNeeded,
        difficulty: input.difficulty,
        spacing: input.spacing,
        grade: input.grade?.trim() || undefined,
        completed: input.completed,
        createdAt: now.toISOString(),
      };
      await repo.putFeedback([record]);
      const finished = input.completed && task.status !== 'done';
      await patchTask({ ...task, feedbackGiven: true, ...(finished ? { status: 'done' as const, completedAt: now.toISOString() } : {}) });
      set({ feedback: [...get().feedback, record] });
      await replanNow();
    }),

  savePrefs: (prefs: Preferences) =>
    serial(async () => {
      await repo.savePrefs(prefs);
      set({ prefs });
      await replanNow();
    }),

  markReportSeen: (id: string) =>
    serial(async () => {
      const r = get().reports.find((x) => x.id === id);
      if (!r || r.seenAt) return;
      const updated = { ...r, seenAt: new Date().toISOString() };
      await repo.putReports([updated]);
      set({ reports: get().reports.map((x) => (x.id === id ? updated : x)) });
    }),

  wipeAll: () =>
    serial(async () => {
      await repo.wipeAll();
      set({ tasks: [], sessions: [], busy: [], feedback: [], reports: [], warnings: [], prefs: DEFAULT_PREFERENCES, locked: false });
    }),
};
