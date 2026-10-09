// Background sync between the user's own devices (optional, see data/sync/engine.ts).
// Nothing here contacts Microsoft unless the user turned sync on; the sign-in
// library only loads at that moment.
import { useStore } from '../data/store';
import { loadSyncState, syncNow, useSync } from '../data/sync/engine';
import { oneDriveTransport, type SyncTransport } from '../data/sync/onedrive';

const EVERY_MS = 5 * 60 * 1000;
const AFTER_CHANGE_MS = 5000;
let started = false;
let lastRun = 0;

/** Access to the sync file in OneDrive, signed in with the account chosen for sync. */
export async function syncTransport(interactive = false): Promise<SyncTransport> {
  const auth = await import('./microsoft/auth');
  return oneDriveTransport(() => auth.msToken(auth.MS_SCOPES.sync, true, interactive, { kind: 'syncSetup' }, 'sync'));
}

export async function syncInBackground(): Promise<void> {
  if (!useSync.getState().enabled) return;
  lastRun = Date.now();
  await syncNow(await syncTransport());
}

/** Called once at startup: syncs now, every few minutes, when Planora comes back into view, and shortly after changes. */
export async function startDeviceSync(): Promise<void> {
  await loadSyncState();
  if (started) return;
  started = true;
  setInterval(() => void syncInBackground(), EVERY_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() - lastRun > 60_000) void syncInBackground();
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  useStore.subscribe((s, prev) => {
    if (!useSync.getState().enabled) return;
    const changed =
      s.tasks !== prev.tasks ||
      s.busy !== prev.busy ||
      s.feedback !== prev.feedback ||
      s.prefs !== prev.prefs ||
      s.reports !== prev.reports;
    if (!changed) return;
    clearTimeout(timer);
    timer = setTimeout(() => void syncInBackground(), AFTER_CHANGE_MS);
  });
  void syncInBackground();
}
