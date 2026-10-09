import Dexie, { type Table } from 'dexie';

export interface StoredRow {
  id: string;
  /** Encrypted payload of all non-indexed fields when encryption is on. */
  _enc?: { iv: string; ct: string };
  [field: string]: unknown;
}

export interface KvRow {
  key: string;
  value: unknown;
}

export interface SyncLogEntry {
  id?: number;
  at: string;
  provider: 'microsoft' | 'google' | 'ics' | 'onedrive';
  action: string;
  /** Counts only; never content. */
  count: number;
  ok: boolean;
  detail?: string;
}

export class PlanoraDB extends Dexie {
  tasks!: Table<StoredRow, string>;
  sessions!: Table<StoredRow, string>;
  busy!: Table<StoredRow, string>;
  feedback!: Table<StoredRow, string>;
  reports!: Table<StoredRow, string>;
  kv!: Table<KvRow, string>;
  syncLog!: Table<SyncLogEntry, number>;

  constructor(name = 'planora') {
    super(name);
    this.version(1).stores({
      tasks: 'id, status, deadline, type',
      sessions: 'id, taskId, start, status',
      busy: 'id, source, start',
      feedback: 'id, taskId, taskType, createdAt',
      reports: 'id, kind, weekStart',
      kv: 'key',
      syncLog: '++id, provider, at',
    });
  }
}

export const db = new PlanoraDB();
