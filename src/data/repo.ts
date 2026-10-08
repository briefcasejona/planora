import type { BusyBlock, FeedbackRecord, Preferences, Task, WeekReport, WorkSession } from '../domain/types';
import { DEFAULT_PREFERENCES } from '../domain/types';
import { db, type PlanoraDB, type StoredRow, type SyncLogEntry } from './db';
import { decryptJSON, encryptJSON, type CryptoConfig } from './crypto';

type TableName = 'tasks' | 'sessions' | 'busy' | 'feedback' | 'reports';

/**
 * Fields that stay readable so IndexedDB can index and sort them. Everything
 * else (titles, subjects, notes, grades, report contents) is encrypted when
 * encryption is on. Sessions hold no free text, so they stay plain.
 */
const PLAIN_FIELDS: Record<TableName, string[] | 'all'> = {
  tasks: ['id', 'status', 'deadline', 'type'],
  sessions: 'all',
  busy: ['id', 'source', 'importId', 'start', 'end', 'allDay', 'repeatWeekdays', 'repeatUntil'],
  feedback: ['id', 'taskId', 'taskType', 'createdAt'],
  reports: ['id', 'kind', 'weekStart'],
};

let activeKey: CryptoKey | null = null;
/** True when encryption is configured: then nothing may be written without the key. */
let requireKey = false;
let database: PlanoraDB = db;

export function setEncryptionKey(key: CryptoKey | null): void {
  activeKey = key;
}

export function setRequireKey(required: boolean): void {
  requireKey = required;
}

/** For tests: use a separate database instance. */
export function useDatabase(instance: PlanoraDB): void {
  database = instance;
}

async function encode(table: TableName, value: object): Promise<StoredRow> {
  const plain = PLAIN_FIELDS[table];
  if (requireKey && !activeKey) throw new Error('locked');
  if (!activeKey || plain === 'all') return { ...(value as StoredRow) };
  const row: StoredRow = { id: (value as { id: string }).id };
  const secret: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    if (plain.includes(k)) row[k] = v;
    else secret[k] = v;
  }
  row._enc = await encryptJSON(activeKey, secret);
  return row;
}

async function decode<T>(row: StoredRow): Promise<T> {
  if (!row._enc) return row as unknown as T;
  if (!activeKey) throw new Error('locked');
  const { _enc, ...rest } = row;
  const secret = await decryptJSON<Record<string, unknown>>(activeKey, _enc);
  return { ...rest, ...secret } as T;
}

async function listAll<T>(table: TableName): Promise<T[]> {
  const rows = await database[table].toArray();
  return Promise.all(rows.map((r) => decode<T>(r)));
}

async function putAll(table: TableName, values: object[]): Promise<void> {
  if (values.length === 0) return;
  const rows = await Promise.all(values.map((v) => encode(table, v)));
  await database[table].bulkPut(rows);
}

export const repo = {
  listTasks: () => listAll<Task>('tasks'),
  putTasks: (tasks: Task[]) => putAll('tasks', tasks),
  deleteTask: async (id: string) => {
    await database.transaction('rw', database.tasks, database.sessions, async () => {
      await database.tasks.delete(id);
      await database.sessions.where('taskId').equals(id).delete();
    });
  },

  listSessions: () => listAll<WorkSession>('sessions'),
  putSessions: (sessions: WorkSession[]) => putAll('sessions', sessions),
  deleteSessions: (ids: string[]) => database.sessions.bulkDelete(ids),

  listBusy: () => listAll<BusyBlock>('busy'),
  putBusy: (blocks: BusyBlock[]) => putAll('busy', blocks),
  deleteBusy: (ids: string[]) => database.busy.bulkDelete(ids),
  deleteBusyBySource: (source: BusyBlock['source']) => database.busy.where('source').equals(source).delete(),

  listFeedback: () => listAll<FeedbackRecord>('feedback'),
  putFeedback: (records: FeedbackRecord[]) => putAll('feedback', records),

  listReports: () => listAll<WeekReport>('reports'),
  putReports: (reports: WeekReport[]) => putAll('reports', reports),

  async getKv<T>(key: string, fallback: T): Promise<T> {
    const row = await database.kv.get(key);
    return row ? (row.value as T) : fallback;
  },
  setKv: (key: string, value: unknown) => database.kv.put({ key, value }),
  deleteKv: (key: string) => database.kv.delete(key),

  async getPrefs(): Promise<Preferences> {
    const stored = await repo.getKv<Partial<Preferences>>('prefs', {});
    return { ...DEFAULT_PREFERENCES, ...stored };
  },
  savePrefs: (prefs: Preferences) => database.kv.put({ key: 'prefs', value: prefs }),

  getCryptoConfig: () => repo.getKv<CryptoConfig | null>('crypto', null),

  addLog: (entry: Omit<SyncLogEntry, 'id' | 'at'>) => database.syncLog.add({ ...entry, at: new Date().toISOString() }),
  listLog: () => database.syncLog.orderBy('at').reverse().limit(200).toArray(),
  clearLog: (provider?: SyncLogEntry['provider']) =>
    provider ? database.syncLog.where('provider').equals(provider).delete() : database.syncLog.clear(),

  /** Re-encode every record (after turning encryption on or off). */
  async reencodeAll(newKey: CryptoKey | null): Promise<void> {
    const tables: TableName[] = ['tasks', 'sessions', 'busy', 'feedback', 'reports'];
    const snapshot: Record<string, object[]> = {};
    for (const t of tables) snapshot[t] = await listAll<object>(t);
    activeKey = newKey;
    requireKey = !!newKey;
    for (const t of tables) {
      const rows = await Promise.all(snapshot[t].map((v) => encode(t, v)));
      await database.transaction('rw', database[t], async () => {
        await database[t].clear();
        if (rows.length) await database[t].bulkPut(rows);
      });
    }
  },

  /** Permanently remove everything Planora stored on this device. */
  async wipeAll(): Promise<void> {
    activeKey = null;
    requireKey = false;
    await Promise.all(database.tables.map((t) => t.clear()));
  },
};
