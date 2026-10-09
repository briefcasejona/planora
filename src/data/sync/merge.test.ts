import { describe, expect, it } from 'vitest';
import { diffTables, emptySnapshot, mergeSnapshots, stableStringify, type SyncSnapshot } from './merge';
import { makeTask } from '../../domain/testUtils';
import type { WorkSession } from '../../domain/types';

const NOW = new Date('2026-10-12T12:00:00Z');
const at = (h: number) => new Date(Date.UTC(2026, 9, 12, h)).toISOString();
const snap = (patch: Partial<SyncSnapshot['tables']> = {}, extra: Partial<SyncSnapshot> = {}): SyncSnapshot => {
  const s = emptySnapshot();
  return { ...s, ...extra, tables: { ...s.tables, ...patch } };
};
const session = (id: string, taskId: string, status: WorkSession['status'], startH: number, updatedAt = at(1)): WorkSession => ({
  id, taskId, status, start: at(startH), end: at(startH + 1), kind: 'work', locked: false, updatedAt,
});

describe('mergeSnapshots', () => {
  const task = makeTask({ id: 't1', title: 'Essay', updatedAt: at(1) });

  it('keeps records from both devices and takes the newest version of each', () => {
    const edited = { ...task, title: 'Essay (edited)', updatedAt: at(3) };
    const other = makeTask({ id: 't2', updatedAt: at(2) });
    const merged = mergeSnapshots(snap({ tasks: [task, other] }), snap({ tasks: [edited] }), NOW);
    expect(merged.tables.tasks.map((t) => t.title).sort()).toEqual(['Essay (edited)', 'Task']);
  });

  it('a deletion beats an older version, but a later edit brings the record back', () => {
    const deleted = snap({}, { tombstones: { 'tasks:t1': at(2) } });
    expect(mergeSnapshots(snap({ tasks: [task] }), deleted, NOW).tables.tasks).toEqual([]);
    const editedLater = { ...task, updatedAt: at(4) };
    const merged = mergeSnapshots(snap({ tasks: [editedLater] }), deleted, NOW);
    expect(merged.tables.tasks).toHaveLength(1);
    expect(merged.tombstones['tasks:t1']).toBeUndefined();
  });

  it('drops study blocks of a deleted task', () => {
    const merged = mergeSnapshots(snap({ sessions: [session('s1', 't1', 'done', 9)] }), snap({}, { tombstones: { 'tasks:t1': at(2) } }), NOW);
    expect(merged.tables.sessions).toEqual([]);
    expect(merged.tombstones['sessions:s1']).toBeDefined();
  });

  it('counts the same block recorded on two devices once, preferring "done"', () => {
    const a = snap({ tasks: [task], sessions: [session('a1', 't1', 'missed', 9)] });
    const b = snap({ tasks: [task], sessions: [session('b1', 't1', 'done', 9)] });
    const merged = mergeSnapshots(a, b, NOW);
    expect(merged.tables.sessions.map((s) => s.id)).toEqual(['b1']);
  });

  it('takes the newest preferences, the newest Outlook writer, and all hidden tests', () => {
    const prefs = (h: number, max: number) => ({ value: { ...emptyPrefs(), maxMinutesPerDay: max }, updatedAt: at(h) });
    const merged = mergeSnapshots(
      snap({}, { prefs: prefs(1, 100), dismissedTests: ['x'], outlookWriter: { device: 'A', at: at(1) } }),
      snap({}, { prefs: prefs(2, 200), dismissedTests: ['y'], outlookWriter: { device: 'B', at: at(2) } }),
      NOW,
    );
    expect(merged.prefs?.value.maxMinutesPerDay).toBe(200);
    expect(merged.dismissedTests).toEqual(['x', 'y']);
    expect(merged.outlookWriter?.device).toBe('B');
  });

  it('gives the same result in either order and when merged again', () => {
    const a = snap({ tasks: [task], sessions: [session('a1', 't1', 'done', 9)] }, { tombstones: { 'tasks:t9': at(1) } });
    const b = snap({ tasks: [{ ...task, title: 'X', updatedAt: at(5) }], sessions: [session('b1', 't1', 'missed', 14)] });
    const ab = mergeSnapshots(a, b, NOW);
    expect(stableStringify(ab)).toBe(stableStringify(mergeSnapshots(b, a, NOW)));
    expect(stableStringify(mergeSnapshots(a, ab, NOW))).toBe(stableStringify(ab));
  });

  it('forgets deletions after 90 days', () => {
    const old = snap({}, { tombstones: { 'tasks:gone': '2026-01-01T00:00:00.000Z' } });
    expect(mergeSnapshots(old, emptySnapshot(), NOW).tombstones).toEqual({});
  });
});

describe('diffTables', () => {
  it('lists what to write and delete on this device', () => {
    const t1 = makeTask({ id: 't1', updatedAt: at(1) });
    const t2 = makeTask({ id: 't2', updatedAt: at(1) });
    const { put, del } = diffTables(snap({ tasks: [t1, t2] }).tables, snap({ tasks: [{ ...t1, title: 'new', updatedAt: at(2) }] }).tables);
    expect(put.tasks?.map((t) => t.id)).toEqual(['t1']);
    expect(del.tasks).toEqual(['t2']);
  });
});

function emptyPrefs() {
  return {} as import('../../domain/types').Preferences;
}
