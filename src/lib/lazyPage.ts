import { type ComponentType, lazy } from 'react';

const RELOAD_KEY = 'planora-page-reload';
/** A reload this recent didn't help, so don't try again (avoids a reload loop when offline). */
const RETRY_AFTER_MS = 30_000;

/** Whether a failed page download should reload the app, given when it last did so. */
export function shouldReload(lastReload: string | null, now: number): boolean {
  const last = Number(lastReload);
  return !lastReload || !Number.isFinite(last) || now - last > RETRY_AFTER_MS;
}

function reloadOnce(): boolean {
  try {
    if (!shouldReload(sessionStorage.getItem(RELOAD_KEY), Date.now())) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    // Without storage we can't tell a first try from a loop, so leave it to the error screen.
    return false;
  }
  window.location.reload();
  return true;
}

/**
 * Like React.lazy for a page. A page's code is downloaded the first time it is
 * opened; when a new version was published while the app stayed open (common for
 * the iPhone home-screen app), the old file is gone and the download fails. Then
 * reload once to get the new version instead of showing an empty screen.
 */
export function lazyPage(load: () => Promise<ComponentType>) {
  return lazy(async () => {
    try {
      return { default: await load() };
    } catch (err) {
      // Keep showing "Loading…" while the page reloads.
      if (reloadOnce()) return new Promise<never>(() => {});
      throw err;
    }
  });
}
