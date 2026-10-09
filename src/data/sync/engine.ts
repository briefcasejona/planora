// Optional sync between the user's own devices through an encrypted file in
// their OneDrive. Off unless the user turns it on in Settings > Sync.
// The passphrase never leaves the device; only the key derived from it is
// kept (non-extractable) so syncing can run in the background.
import { create } from 'zustand';
import { patchMicrosoft, saveIntegrations, useIntegrations } from '../../integrations/settings';
import { createCryptoConfig, decryptJSON, deriveKey, type EncryptedBlob, encryptJSON } from '../crypto';
import { repo } from '../repo';
import { actions, useStore } from '../store';
import {
  diffTables,
  emptySnapshot,
  isSyncedSession,
  mergeSnapshots,
  type SyncSnapshot,
  stableStringify,
} from './merge';
import type { SyncTransport } from './onedrive';

interface SyncFile {
  app: 'planora-sync';
  version: 1;
  salt: string;
  data: EncryptedBlob;
}

export type SyncError = 'wrong-passphrase' | 'signed-out' | 'too-large' | 'offline' | 'failed';

export interface SyncState {
  enabled: boolean;
  salt?: string;
  lastSync?: string;
  error?: SyncError;
  /** True while a sync is running (not stored). */
  running?: boolean;
}

const STATE_KEY = 'sync-state';
const KEY_KEY = 'sync-key';

export const useSync = create<SyncState>(() => ({ enabled: false }));

let memoryKey: CryptoKey | null = null;
let running: Promise<'ok' | 'skipped'> | null = null;

async function saveState(patch: Partial<SyncState>): Promise<void> {
  const next = { ...useSync.getState(), ...patch };
  useSync.setState(next);
  const { running: _, ...stored } = next;
  await repo.setKv(STATE_KEY, stored);
}

export async function loadSyncState(): Promise<SyncState> {
  const stored = await repo.getKv<SyncState>(STATE_KEY, { enabled: false });
  useSync.setState({ ...stored, running: false });
  return stored;
}

/** A random id for this device, so devices can tell each other apart (e.g. who writes to Outlook). */
export async function deviceId(): Promise<string> {
  let id = await repo.getKv<string | null>('device-id', null);
  if (!id) {
    id = crypto.randomUUID();
    await repo.setKv('device-id', id);
  }
  return id;
}

async function storeKey(key: CryptoKey): Promise<void> {
  memoryKey = key;
  try {
    await repo.setKv(KEY_KEY, key); // CryptoKeys can be stored in IndexedDB without exposing the key bytes
  } catch {
    /* kept in memory for this session only */
  }
}

async function loadKey(): Promise<CryptoKey | null> {
  if (memoryKey) return memoryKey;
  try {
    memoryKey = await repo.getKv<CryptoKey | null>(KEY_KEY, null);
  } catch {
    memoryKey = null;
  }
  return memoryKey;
}

function parseFile(text: string): SyncFile {
  const file = JSON.parse(text) as SyncFile;
  if (file.app !== 'planora-sync' || file.version !== 1) throw new Error('invalid-sync-file');
  return file;
}

/** Is there already a sync file (made on another device)? */
export async function hasRemote(transport: SyncTransport): Promise<boolean> {
  return !!(await transport.get());
}

/**
 * Turn sync on for this device. If another device already syncs, the
 * passphrase must match; otherwise it becomes the passphrase for all devices.
 */
export async function enableSync(passphrase: string, transport: SyncTransport): Promise<void> {
  const remote = await transport.get();
  let salt: string;
  let key: CryptoKey;
  if (remote) {
    const file = parseFile(remote.text);
    key = await deriveKey(passphrase, file.salt);
    try {
      await decryptJSON(key, file.data);
    } catch {
      throw new Error('wrong-passphrase');
    }
    salt = file.salt;
    // Joining existing devices: their settings win over this (probably new) device's defaults.
    await repo.deleteKv('prefs-updatedAt');
  } else {
    ({
      key,
      config: { salt },
    } = await createCryptoConfig(passphrase));
  }
  await storeKey(key);
  await saveState({ enabled: true, salt, error: undefined });
  await syncNow(transport);
}

/** Stop syncing on this device. Data on this device and in OneDrive stays as it is. */
export async function disableSync(): Promise<void> {
  memoryKey = null;
  await repo.deleteKv(KEY_KEY);
  await saveState({ enabled: false, salt: undefined, lastSync: undefined, error: undefined });
}

/** Remove the sync file from OneDrive and stop syncing here. Other devices stop with an error. */
export async function deleteRemote(transport: SyncTransport): Promise<void> {
  await transport.remove();
  await disableSync();
  await repo.addLog({ provider: 'onedrive', action: 'sync-delete', count: 0, ok: true });
}

async function localSnapshot(): Promise<SyncSnapshot> {
  const integrations = useIntegrations.getState();
  const prefsAt = await repo.getPrefsUpdatedAt();
  return {
    tables: await repo.syncRecords(),
    prefs: prefsAt ? { value: await repo.getPrefs(), updatedAt: prefsAt } : undefined,
    icsImports: integrations.icsImports,
    dismissedTests: integrations.dismissedTests,
    outlookWriter: integrations.outlookWriter,
    tombstones: await repo.getTombstones(),
  };
}

/** Make this device match the merged data. Returns whether planner data changed. */
async function applyLocal(local: SyncSnapshot, merged: SyncSnapshot): Promise<boolean> {
  const { put, del } = diffTables(local.tables, merged.tables);
  let changed = Object.keys(put).length > 0 || Object.keys(del).length > 0;
  await repo.applySynced(put, del);

  // This device's own planned blocks that another device already checked off are gone now.
  const synced = merged.tables.sessions;
  const own = (await repo.listSessions()).filter((s) => !isSyncedSession(s));
  const covered = own.filter((s) => synced.some((x) => x.taskId === s.taskId && x.start < s.end && s.start < x.end));
  if (covered.length) {
    await repo.dropLocalSessions(covered.map((s) => s.id));
    changed = true;
  }

  await repo.setTombstones(merged.tombstones);
  if (merged.prefs && merged.prefs.updatedAt !== local.prefs?.updatedAt) {
    await repo.savePrefs(merged.prefs.value, merged.prefs.updatedAt);
    changed = true;
  }

  const integrations = useIntegrations.getState();
  if (
    stableStringify(merged.icsImports) !== stableStringify(integrations.icsImports) ||
    stableStringify(merged.dismissedTests) !== stableStringify(integrations.dismissedTests) ||
    stableStringify(merged.outlookWriter ?? null) !== stableStringify(integrations.outlookWriter ?? null)
  ) {
    await saveIntegrations({
      icsImports: merged.icsImports,
      dismissedTests: merged.dismissedTests,
      outlookWriter: merged.outlookWriter,
    });
  }
  // Another device took over writing study blocks to Outlook.
  if (
    merged.outlookWriter &&
    merged.outlookWriter.device !== (await deviceId()) &&
    useIntegrations.getState().microsoft.writeSessions
  ) {
    await patchMicrosoft({ writeSessions: false });
  }
  return changed;
}

function errorOf(e: unknown): SyncError {
  const msg = String((e as Error)?.message ?? e);
  if (msg === 'wrong-passphrase') return 'wrong-passphrase';
  if (msg === 'sync-too-large') return 'too-large';
  if (msg === 'ms-signed-out' || /interaction|login|consent|401/i.test(msg)) return 'signed-out';
  if (/fetch|network|offline/i.test(msg)) return 'offline';
  return 'failed';
}

async function syncOnce(transport: SyncTransport): Promise<'ok' | 'skipped'> {
  const state = useSync.getState();
  const store = useStore.getState();
  if (!state.enabled || !store.ready || store.locked) return 'skipped';
  const key = await loadKey();
  if (!key || !state.salt) throw new Error('wrong-passphrase');

  for (let attempt = 0; attempt < 4; attempt++) {
    const remote = await transport.get();
    let remoteSnap = emptySnapshot();
    if (remote) {
      const file = parseFile(remote.text);
      // A different salt means the sync data was deleted and set up again with a new passphrase.
      if (file.salt !== state.salt) throw new Error('wrong-passphrase');
      try {
        remoteSnap = await decryptJSON<SyncSnapshot>(key, file.data);
      } catch {
        throw new Error('wrong-passphrase');
      }
    }
    let merged: SyncSnapshot = emptySnapshot();
    let local: SyncSnapshot = emptySnapshot();
    await actions.applyExternal(async () => {
      local = await localSnapshot();
      merged = mergeSnapshots(local, remoteSnap);
      return applyLocal(local, merged);
    });
    if (remote && stableStringify(merged) === stableStringify(remoteSnap)) return 'ok';
    const file: SyncFile = { app: 'planora-sync', version: 1, salt: state.salt, data: await encryptJSON(key, merged) };
    const result = await transport.put(JSON.stringify(file), remote?.etag ?? null);
    if (result !== 'conflict') {
      const t = merged.tables;
      await repo.addLog({
        provider: 'onedrive',
        action: 'sync',
        count: t.tasks.length + t.sessions.length + t.busy.length,
        ok: true,
      });
      return 'ok';
    }
    // Another device saved in the meantime: merge again with its version.
  }
  throw new Error('sync-conflict');
}

/** Sync now. Never runs twice at the same time; errors end up in useSync().error. */
export function syncNow(transport: SyncTransport): Promise<'ok' | 'skipped'> {
  if (running) return running;
  useSync.setState({ running: true });
  running = syncOnce(transport)
    .then(async (r) => {
      if (r === 'ok') await saveState({ lastSync: new Date().toISOString(), error: undefined });
      return r;
    })
    .catch(async (e) => {
      const error = errorOf(e);
      await saveState({ error });
      await repo.addLog({ provider: 'onedrive', action: 'sync', count: 0, ok: false, detail: error });
      return 'skipped' as const;
    })
    .finally(() => {
      running = null;
      useSync.setState({ running: false });
    });
  return running;
}

/** For tests: forget what is cached in memory (as if the app restarted). */
export function resetSyncMemory(): void {
  memoryKey = null;
  running = null;
}
