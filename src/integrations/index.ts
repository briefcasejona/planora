import { onPlanChanged } from '../data/store';
import { pullGoogleBusy } from './google';
import { loadIntegrations, useIntegrations } from './settings';

const PULL_EVERY_MS = 15 * 60 * 1000;
let started = false;
let lastPull = 0;

/** The Microsoft code (and its sign-in library) only loads once the user connected an account. */
const microsoft = () => import('./microsoft/sync');

/** Pull busy time from linked calendars (only when the user linked them). */
export function pullAll(): void {
  lastPull = Date.now();
  if (useIntegrations.getState().microsoft.connected) void microsoft().then((m) => m.pullMicrosoftBusy());
  void pullGoogleBusy();
}

/**
 * Background sync. Nothing runs unless the user connected an account; all
 * requests go straight from this device to Microsoft or Google.
 */
export async function startIntegrations(): Promise<void> {
  await loadIntegrations();
  if (started) return;
  started = true;
  let pushTimer: ReturnType<typeof setTimeout> | undefined;
  onPlanChanged(() => {
    const ms = useIntegrations.getState().microsoft;
    if (!ms.connected || !ms.writeSessions) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => void microsoft().then((m) => m.pushMicrosoftSessions()), 4000);
  });
  pullAll();
  setInterval(pullAll, PULL_EVERY_MS);
  window.addEventListener('focus', () => {
    if (Date.now() - lastPull > 2 * 60 * 1000) pullAll();
  });
}
