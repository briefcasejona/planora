// Update notices for the installed apps. The website and the iPhone
// home-screen app update themselves (service worker) and never check here.
// Desktop: the desktop app's own updater (electron/updater.cjs) reports here.
// Android: Planora asks GitHub for the newest version and offers the new APK.
import { create } from 'zustand';
import { repo } from '../data/repo';
import { isNativeApp } from '../lib/platform';
import { LATEST_RELEASE_API, pickUpdate, type GithubRelease } from '../lib/updates';

export interface UpdateState {
  /** Only the installed apps (desktop, Android) have updates to offer. */
  supported: boolean;
  auto: boolean;
  state: 'idle' | 'checking' | 'none' | 'available' | 'downloading' | 'ready' | 'error';
  /** 'install': replaces itself on restart; 'notify': a download button; 'android': the new APK. */
  kind: 'install' | 'notify' | 'android';
  current?: string;
  version?: string;
  lastCheck?: string;
  error?: string;
  url?: string;
}

export const useUpdates = create<UpdateState>(() => ({ supported: false, auto: true, state: 'idle', kind: 'notify' }));

const SETTINGS_KEY = 'updates';
const EVERY_MS = 6 * 60 * 60 * 1000;
let started = false;

async function androidCheck(force: boolean): Promise<void> {
  const s = useUpdates.getState();
  if (!force && (!s.auto || (s.lastCheck && Date.now() - Date.parse(s.lastCheck) < EVERY_MS))) return;
  useUpdates.setState({ state: 'checking', error: undefined });
  try {
    const { App } = await import('@capacitor/app');
    const current = (await App.getInfo()).version;
    const res = await fetch(LATEST_RELEASE_API, { credentials: 'omit', referrerPolicy: 'no-referrer', headers: { Accept: 'application/vnd.github+json' } });
    if (!res.ok) throw new Error('http-' + res.status);
    const found = pickUpdate((await res.json()) as GithubRelease, current, 'android');
    const lastCheck = new Date().toISOString();
    useUpdates.setState(found ? { state: 'available', current, version: found.version, url: found.url, lastCheck } : { state: 'none', current, version: undefined, lastCheck });
    await repo.setKv(SETTINGS_KEY, { auto: useUpdates.getState().auto, lastCheck });
  } catch (e) {
    useUpdates.setState({ state: 'error', error: String((e as Error).message ?? e), lastCheck: new Date().toISOString() });
  }
}

/** Called once at startup. */
export async function startUpdates(): Promise<void> {
  if (started) return;
  started = true;
  const bridge = typeof window !== 'undefined' ? window.planoraDesktop : undefined;
  if (bridge?.getUpdateStatus && bridge.onUpdateStatus) {
    const settings = await bridge.getSettings();
    bridge.onUpdateStatus((s) => useUpdates.setState({ ...s }));
    useUpdates.setState({ supported: true, auto: settings.autoUpdate !== false, ...(await bridge.getUpdateStatus()) });
    return;
  }
  if (isNativeApp()) {
    const stored = await repo.getKv<{ auto?: boolean; lastCheck?: string }>(SETTINGS_KEY, {});
    useUpdates.setState({ supported: true, kind: 'android', auto: stored.auto !== false, lastCheck: stored.lastCheck });
    void androidCheck(false);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void androidCheck(false);
    });
  }
}

export async function checkForUpdateNow(): Promise<void> {
  const bridge = window.planoraDesktop;
  if (bridge?.checkForUpdate) {
    useUpdates.setState({ ...(await bridge.checkForUpdate()) });
    return;
  }
  if (isNativeApp()) await androidCheck(true);
}

/** Restart into the update (Windows/Linux), open the download page (Mac), or get the new APK (Android). */
export async function installUpdate(): Promise<void> {
  const s = useUpdates.getState();
  const bridge = window.planoraDesktop;
  if (bridge?.installUpdate) {
    await bridge.installUpdate();
    return;
  }
  if (s.kind === 'android' && s.url) {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url: s.url });
  }
}

export async function setAutoUpdate(auto: boolean): Promise<void> {
  useUpdates.setState({ auto });
  const bridge = window.planoraDesktop;
  if (bridge?.getUpdateStatus) await bridge.setSettings({ autoUpdate: auto });
  else await repo.setKv(SETTINGS_KEY, { auto, lastCheck: useUpdates.getState().lastCheck });
}
