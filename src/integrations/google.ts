import { addDays } from 'date-fns';
import { actions, useStore } from '../data/store';
import { repo } from '../data/repo';
import type { BusyBlock } from '../domain/types';
import { patchGoogle, useIntegrations } from './settings';
import { appUrl, isIosStandalone, isNativeApp } from '../lib/platform';

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
export const googleConfigured = !!clientId;

/**
 * Narrowest Google scope there is: free/busy only. Planora can never see event
 * titles, descriptions, attendees or locations from Google Calendar.
 */
const SCOPE = 'https://www.googleapis.com/auth/calendar.freebusy';
/** On this device only (never synced); Google tokens for apps without a server last one hour. */
const TOKEN_KEY = 'planora-google-token';
/** iPhone home-screen app: the sign-in leaves the app and comes back through auth-redirect.html. */
const PENDING_KEY = 'planora-google-pending';
export const RESPONSE_KEY = 'planora-google-response';

interface StoredToken {
  token: string;
  expires: number;
}

/**
 * How to sign in with Google here. Google refuses sign-ins inside app windows,
 * so the desktop app and the Android app use the system browser.
 */
export type GoogleMethod = 'popup' | 'redirect' | 'desktop' | 'android';
export function googleMethod(): GoogleMethod {
  if (typeof window !== 'undefined' && window.planoraDesktop?.googleSignIn) return 'desktop';
  if (isNativeApp()) return 'android';
  if (isIosStandalone()) return 'redirect';
  return 'popup';
}

/** Read Google's answer (the part after # in the redirect) and check it belongs to our request. */
export function parseGoogleResponse(hash: string, expectedState: string, now = Date.now()): StoredToken {
  const p = new URLSearchParams(hash.replace(/^#/, ''));
  if (!expectedState || p.get('state') !== expectedState) throw new Error('google-state-mismatch');
  const token = p.get('access_token');
  if (!token) throw new Error(p.get('error') ?? 'google-auth-failed');
  return { token, expires: now + Number(p.get('expires_in') ?? '3600') * 1000 };
}

function saveToken(t: StoredToken): void {
  try {
    localStorage.setItem(TOKEN_KEY, JSON.stringify(t));
  } catch {
    /* not kept; asked again next time */
  }
  void patchGoogle({ tokenExpires: t.expires });
}

function readToken(): string | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const t = JSON.parse(raw) as StoredToken;
    return t.expires > Date.now() + 60000 ? t.token : null;
  } catch {
    return null;
  }
}

/** Is the one-hour Google sign-in still valid on this device? */
export const googleTokenValid = () => !!readToken();

function authUrl(state: string): string {
  return (
    'https://accounts.google.com/o/oauth2/v2/auth?' +
    new URLSearchParams({
      client_id: clientId!,
      redirect_uri: appUrl('auth-redirect.html'),
      response_type: 'token',
      scope: SCOPE,
      include_granted_scopes: 'false',
      state,
      // After the first time Google only asks which account; the permission screen is skipped.
      prompt: 'select_account',
    })
  );
}

/** Sign in with Google (no Google scripts are loaded). Resolves with a token valid for about an hour. */
export function googleSignIn(): Promise<string> {
  if (!clientId) return Promise.reject(new Error('google-not-configured'));
  const method = googleMethod();
  const prefix = method === 'popup' ? 'google-' : `google-${method === 'redirect' ? 'ios' : method}-`;
  const state = prefix + crypto.randomUUID();
  const url = authUrl(state);
  const accept = (hash: string): string => {
    const t = parseGoogleResponse(hash, state);
    saveToken(t);
    return t.token;
  };

  if (method === 'redirect') {
    sessionStorage.setItem(PENDING_KEY, state);
    window.location.assign(url);
    return new Promise<never>(() => undefined); // the app navigates to Google and comes back
  }

  if (method === 'desktop') {
    // The desktop app opens the system browser and waits until auth-redirect.html reports back.
    return window.planoraDesktop!.googleSignIn!(url, state).then(accept);
  }

  if (method === 'android') {
    return new Promise((resolve, reject) => {
      void (async () => {
        const [{ App }, { Browser }] = await Promise.all([import('@capacitor/app'), import('@capacitor/browser')]);
        const timer = setTimeout(() => done(new Error('google-auth-timeout')), 5 * 60 * 1000);
        // auth-redirect.html (opened in the system browser) hands the answer back via app.planora://google#…
        const handle = await App.addListener('appUrlOpen', ({ url: back }) => {
          if (!back.startsWith('app.planora://google')) return;
          try {
            done(null, accept(back.slice(back.indexOf('#'))));
          } catch (e) {
            done(e as Error);
          }
        });
        function done(err: Error | null, token?: string) {
          clearTimeout(timer);
          void handle.remove();
          void Browser.close().catch(() => undefined);
          if (err || !token) reject(err ?? new Error('google-auth-failed'));
          else resolve(token);
        }
        await Browser.open({ url });
      })().catch(reject);
    });
  }

  // Browser: a popup; the redirect page hands the answer back over a same-origin channel, which keeps
  // working even when Google's popup isolation (COOP) cuts the link to the popup window.
  if (!window.open(url, 'planora-google', 'width=480,height=640')) return Promise.reject(new Error('popup-blocked'));
  return new Promise((resolve, reject) => {
    const channel = new BroadcastChannel('planora-oauth');
    const timer = setTimeout(() => finish(new Error('google-auth-timeout')), 5 * 60 * 1000);
    function finish(err: Error | null, token?: string) {
      clearTimeout(timer);
      channel.close();
      if (err || !token) reject(err ?? new Error('google-auth-failed'));
      else resolve(token);
    }
    channel.onmessage = (e: MessageEvent<{ hash?: string }>) => {
      const hash = e.data?.hash ?? '';
      if (new URLSearchParams(hash.slice(1)).get('state') !== state) return;
      try {
        finish(null, accept(hash));
      } catch (err) {
        finish(err as Error);
      }
    };
  });
}

/** iPhone home-screen app: finish a Google sign-in that just came back to the app. */
export async function completeGoogleRedirect(): Promise<void> {
  let hash: string | null = null;
  let state: string | null = null;
  try {
    hash = sessionStorage.getItem(RESPONSE_KEY);
    state = sessionStorage.getItem(PENDING_KEY);
    sessionStorage.removeItem(RESPONSE_KEY);
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    return;
  }
  if (!hash || !state) return;
  try {
    saveToken(parseGoogleResponse(hash, state));
    await patchGoogle({ connected: true });
    await pullGoogleBusy();
  } catch (e) {
    await repo.addLog({ provider: 'google', action: 'connect', count: 0, ok: false, detail: String((e as Error).message ?? e) });
  }
}

async function token(interactive: boolean): Promise<string | null> {
  const t = readToken();
  if (t) return t;
  if (!interactive) return null;
  return googleSignIn();
}

const WINDOW_DAYS = 45;

/** The period Planora reads (a week back, 90 days ahead), in windows Google accepts. */
export function freeBusyWindows(now: Date, from = -7, to = 90): { start: Date; end: Date }[] {
  const out: { start: Date; end: Date }[] = [];
  for (let d = from; d < to; d += WINDOW_DAYS) out.push({ start: addDays(now, d), end: addDays(now, Math.min(d + WINDOW_DAYS, to)) });
  return out;
}

/** Google's own explanation of an error (e.g. "timeRangeTooLong"), so a failure says what went wrong. */
async function googleErrorReason(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: { message?: string; errors?: { reason?: string }[] } };
    return body.error?.errors?.[0]?.reason ?? body.error?.message ?? '';
  } catch {
    return '';
  }
}

export async function pullGoogleBusy(interactive = false): Promise<void> {
  if (!useIntegrations.getState().google.connected || !useStore.getState().ready || useStore.getState().locked) return;
  try {
    const access = await token(interactive);
    // Sign-in expired: keep the busy times already fetched; the user refreshes with one click.
    if (!access) return;
    const now = new Date();
    const byId = new Map<string, BusyBlock>();
    // Google refuses long ranges in one request (timeRangeTooLong), so ask per window.
    for (const w of freeBusyWindows(now)) {
      const res = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
        method: 'POST',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        headers: { Authorization: 'Bearer ' + access, 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeMin: w.start.toISOString(), timeMax: w.end.toISOString(), items: [{ id: 'primary' }] }),
      });
      if (res.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        await patchGoogle({ tokenExpires: undefined });
        if (interactive) return pullGoogleBusy(true);
        return;
      }
      if (!res.ok) throw new Error(('google-' + res.status + ' ' + (await googleErrorReason(res))).trim());
      const data = (await res.json()) as {
        calendars: Record<string, { busy?: { start: string; end: string }[]; errors?: { reason: string }[] }>;
      };
      const cal = data.calendars.primary;
      if (cal?.errors?.length) throw new Error('google-' + cal.errors[0].reason);
      for (const b of cal?.busy ?? []) {
        const id = 'g:' + b.start + ':' + b.end;
        byId.set(id, { id, source: 'google', start: new Date(b.start).toISOString(), end: new Date(b.end).toISOString() });
      }
    }
    const blocks = [...byId.values()];
    const current = useStore.getState().busy.filter((b) => b.source === 'google');
    if (JSON.stringify(current.map((b) => b.id).sort()) !== JSON.stringify(blocks.map((b) => b.id).sort())) {
      await actions.replaceBusySource('google', blocks);
    }
    await patchGoogle({ lastSync: now.toISOString() });
    await repo.addLog({ provider: 'google', action: 'read-freebusy', count: blocks.length, ok: true });
  } catch (e) {
    await repo.addLog({ provider: 'google', action: 'read-freebusy', count: 0, ok: false, detail: String((e as Error).message ?? e) });
    if (interactive) throw e;
  }
}

/** Revoke the token at Google and forget it locally. */
export async function googleDisconnect(): Promise<void> {
  const t = readToken();
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* nothing stored */
  }
  await patchGoogle({ tokenExpires: undefined });
  if (t) {
    try {
      // Token in the request body, not the URL, so it never ends up in logs.
      await fetch('https://oauth2.googleapis.com/revoke', {
        method: 'POST',
        credentials: 'omit',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: t }),
      });
    } catch {
      /* revocation is best effort; the token expires within an hour anyway */
    }
  }
}
