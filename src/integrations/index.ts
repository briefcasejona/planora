import { onPlanChanged } from '../data/store';
import { completeGoogleRedirect, pullGoogleBusy } from './google';
import { loadIntegrations, useIntegrations } from './settings';
import { startDeviceSync } from './deviceSync';
import { isIosStandalone, isNativeApp } from '../lib/platform';

/** Same check as microsoft/auth.ts, without loading the Microsoft library. */
const msConfigured = !!import.meta.env.VITE_MS_CLIENT_ID;

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
  // Native app or iPhone home-screen app: a Microsoft sign-in may just have returned via redirect.
  // iPhone home-screen app: a Google sign-in may just have returned the same way.
  if (isIosStandalone()) await completeGoogleRedirect();
  if ((isNativeApp() || isIosStandalone()) && msConfigured) await microsoft().then((m) => m.completeMsRedirect()).catch(console.error);
  let pushTimer: ReturnType<typeof setTimeout> | undefined;
  onPlanChanged(() => {
    const ms = useIntegrations.getState().microsoft;
    if (!ms.connected || !ms.writeSessions) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => void microsoft().then((m) => m.pushMicrosoftSessions()), 4000);
  });
  pullAll();
  setInterval(pullAll, PULL_EVERY_MS);
  void startDeviceSync();
  window.addEventListener('focus', () => {
    if (Date.now() - lastPull > 2 * 60 * 1000) pullAll();
  });
}
