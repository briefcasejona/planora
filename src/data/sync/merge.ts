// Merging two copies of a user's Planora data (this device and the sync file).
// Pure functions only: no storage, no network. Every record carries `updatedAt`;
// the newest version wins. Deletions are kept as tombstones so a record removed
// on one device is not brought back by another.
import type { BusyBlock, FeedbackRecord, Preferences, Task, WeekReport, WorkSession } from '../../domain/types';
import type { IcsImport } from '../../integrations/settings';

export const SYNC_TABLES = ['tasks', 'sessions', 'busy', 'feedback', 'reports'] as const;
export type SyncTable = (typeof SYNC_TABLES)[number];

export interface SyncRecords {
  tasks: Task[];
  sessions: WorkSession[];
  busy: BusyBlock[];
  feedback: FeedbackRecord[];
  reports: WeekReport[];
}

export interface SyncSnapshot {
  tables: SyncRecords;
  prefs?: { value: Preferences; updatedAt: string };
  icsImports: IcsImport[];
  dismissedTests: string[];
  /** The one device that writes study blocks to Outlook (so they aren't written twice). */
  outlookWriter?: { device: string; at: string };
  /** `${table}:${id}` → when it was deleted. */
  tombstones: Record<string, string>;
}

const TOMBSTONE_DAYS = 90;

/**
 * Which study blocks are shared between devices: the ones with a history
 * (done, missed, skipped) or moved by hand. Ordinary planned blocks are
 * recomputed by each device from the same tasks.
 */
export function isSyncedSession(s: WorkSession): boolean {
  return s.status !== 'planned' || s.locked;
}

/** Only events the user made or imported are shared; Outlook/Google busy time is fetched per device. */
export function isSyncedBusy(b: BusyBlock): boolean {
  return b.source === 'local' || b.source === 'ics';
}

/** JSON with sorted keys, so equal content always gives the same text. */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return '{' + entries.map(([k, v]) => JSON.stringify(k) + ':' + stableStringify(v)).join(',') + '}';
  }
  return JSON.stringify(value) ?? 'null';
}

/** Same content apart from the `updatedAt` stamp. */
export function sameContent(a: object, b: object): boolean {
  const strip = (o: object) => ({ ...o, updatedAt: undefined });
  return stableStringify(strip(a)) === stableStringify(strip(b));
}

type Stamped = { id: string; updatedAt?: string };

/** The newer of two versions; on an exact tie the result doesn't depend on the order. */
function newer<T extends Stamped>(a: T, b: T): T {
  const ta = a.updatedAt ?? '';
  const tb = b.updatedAt ?? '';
  if (ta !== tb) return ta > tb ? a : b;
  return stableStringify(a) >= stableStringify(b) ? a : b;
}

function mergeTable<T extends Stamped>(table: string, a: T[], b: T[], tombstones: Record<string, string>): T[] {
  const byId = new Map<string, T>();
  for (const r of [...a, ...b]) {
    const seen = byId.get(r.id);
    byId.set(r.id, seen ? newer(seen, r) : r);
  }
  const out: T[] = [];
  for (const r of byId.values()) {
    const key = table + ':' + r.id;
    const deletedAt = tombstones[key];
    // Deleted at or after its last change: stays deleted. (Storing it again locally clears the tombstone.)
    if (deletedAt && (r.updatedAt ?? '') <= deletedAt) continue;
    if (deletedAt) delete tombstones[key]; // changed again after it was deleted: it's back
    out.push(r);
  }
  return out.sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
}

const SESSION_RANK: Record<WorkSession['status'], number> = { done: 0, skipped: 1, missed: 2, planned: 3 };

/**
 * Two devices can each record the same study block (e.g. both marked it missed
 * after it passed). Overlapping synced blocks of one task count once: done
 * beats skipped beats missed beats moved.
 */
function dedupeSessions(sessions: WorkSession[], tombstones: Record<string, string>, nowIso: string): WorkSession[] {
  const better = (a: WorkSession, b: WorkSession) =>
    SESSION_RANK[a.status] - SESSION_RANK[b.status] || (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '') || a.id.localeCompare(b.id);
  const sorted = [...sessions].sort(better);
  const kept: WorkSession[] = [];
  for (const s of sorted) {
    const clash = kept.some((k) => k.taskId === s.taskId && k.stepId === s.stepId && k.start < s.end && s.start < k.end);
    if (clash) {
      const at = s.updatedAt && s.updatedAt > nowIso ? s.updatedAt : nowIso;
      tombstones['sessions:' + s.id] = at;
    } else kept.push(s);
  }
  return kept.sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
}

export function emptySnapshot(): SyncSnapshot {
  return { tables: { tasks: [], sessions: [], busy: [], feedback: [], reports: [] }, icsImports: [], dismissedTests: [], tombstones: {} };
}

/** Combine this device's data with the sync file. Commutative: merge(a, b) equals merge(b, a). */
export function mergeSnapshots(a: SyncSnapshot, b: SyncSnapshot, now = new Date()): SyncSnapshot {
  const nowIso = now.toISOString();
  const pruneBefore = new Date(now.getTime() - TOMBSTONE_DAYS * 86400000).toISOString();
  const tombstones: Record<string, string> = {};
  for (const [k, v] of [...Object.entries(a.tombstones), ...Object.entries(b.tombstones)]) {
    if (v >= pruneBefore && (!tombstones[k] || v > tombstones[k])) tombstones[k] = v;
  }

  const tasks = mergeTable('tasks', a.tables.tasks, b.tables.tasks, tombstones);
  const taskIds = new Set(tasks.map((t) => t.id));
  let sessions = mergeTable('sessions', a.tables.sessions, b.tables.sessions, tombstones).filter((s) => {
    if (taskIds.has(s.taskId)) return true;
    tombstones['sessions:' + s.id] = nowIso; // its task was deleted
    return false;
  });
  sessions = dedupeSessions(sessions, tombstones, nowIso);

  const imports = mergeTable(
    'icsImports',
    a.icsImports.map((i) => ({ ...i, updatedAt: i.updatedAt ?? i.importedAt })),
    b.icsImports.map((i) => ({ ...i, updatedAt: i.updatedAt ?? i.importedAt })),
    tombstones,
  );

  const prefs = !a.prefs ? b.prefs : !b.prefs ? a.prefs : a.prefs.updatedAt >= b.prefs.updatedAt ? a.prefs : b.prefs;
  const outlookWriter = !a.outlookWriter ? b.outlookWriter : !b.outlookWriter ? a.outlookWriter : a.outlookWriter.at >= b.outlookWriter.at ? a.outlookWriter : b.outlookWriter;

  return {
    tables: {
      tasks,
      sessions,
      busy: mergeTable('busy', a.tables.busy, b.tables.busy, tombstones),
      feedback: mergeTable('feedback', a.tables.feedback, b.tables.feedback, tombstones),
      reports: mergeTable('reports', a.tables.reports, b.tables.reports, tombstones),
    },
    prefs,
    icsImports: imports,
    dismissedTests: [...new Set([...a.dismissedTests, ...b.dismissedTests])].sort(),
    outlookWriter,
    tombstones,
  };
}

/** What has to change on this device to match the merged data. */
export function diffTables(local: SyncRecords, merged: SyncRecords): { put: Partial<Record<SyncTable, Stamped[]>>; del: Partial<Record<SyncTable, string[]>> } {
  const put: Partial<Record<SyncTable, Stamped[]>> = {};
  const del: Partial<Record<SyncTable, string[]>> = {};
  for (const table of SYNC_TABLES) {
    const mine = new Map((local[table] as Stamped[]).map((r) => [r.id, r]));
    const theirs = merged[table] as Stamped[];
    const toPut = theirs.filter((r) => {
      const m = mine.get(r.id);
      return !m || stableStringify(m) !== stableStringify(r);
    });
    const ids = new Set(theirs.map((r) => r.id));
    const toDel = [...mine.keys()].filter((id) => !ids.has(id));
    if (toPut.length) put[table] = toPut;
    if (toDel.length) del[table] = toDel;
  }
  return { put, del };
}
