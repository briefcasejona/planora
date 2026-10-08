import { addDays } from 'date-fns';
import { actions, useStore } from '../data/store';
import { repo } from '../data/repo';
import type { BusyBlock } from '../domain/types';
import { patchGoogle, useIntegrations } from './settings';

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
export const googleConfigured = !!clientId;

/**
 * Narrowest Google scope there is: free/busy only. Planora can never see event
 * titles, descriptions, attendees or locations from Google Calendar.
 */
const SCOPE = 'https://www.googleapis.com/auth/calendar.freebusy';
const TOKEN_KEY = 'planora-google-token';

interface StoredToken {
  token: string;
  expires: number;
}

function readToken(): string | null {
  try {
    const raw = sessionStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const t = JSON.parse(raw) as StoredToken;
    return t.expires > Date.now() + 60000 ? t.token : null;
  } catch {
    return null;
  }
}

/** OAuth in a popup (no Google scripts are loaded); the token stays in this tab session. */
export function googleSignIn(): Promise<string> {
  if (!clientId) return Promise.reject(new Error('google-not-configured'));
  const state = 'google-' + crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: window.location.origin + '/auth-redirect.html',
    response_type: 'token',
    scope: SCOPE,
    include_granted_scopes: 'false',
    state,
    prompt: 'consent',
  });
  if (!window.open('https://accounts.google.com/o/oauth2/v2/auth?' + params, 'planora-google', 'width=480,height=640')) {
    return Promise.reject(new Error('popup-blocked'));
  }
  return new Promise((resolve, reject) => {
    // The redirect page hands the response back over a same-origin channel; this keeps
    // working even when Google's popup isolation (COOP) cuts the link to the popup window.
    const channel = new BroadcastChannel('planora-oauth');
    const timer = setTimeout(() => finish(new Error('google-auth-timeout')), 5 * 60 * 1000);
    function finish(err: Error | null, token?: string) {
      clearTimeout(timer);
      channel.close();
      if (err || !token) reject(err ?? new Error('google-auth-failed'));
      else resolve(token);
    }
    channel.onmessage = (e: MessageEvent<{ hash?: string }>) => {
      const p = new URLSearchParams((e.data?.hash ?? '').slice(1));
      if (p.get('state') !== state) return;
      const token = p.get('access_token');
      if (!token) return finish(new Error(p.get('error') ?? 'google-auth-failed'));
      const expires = Date.now() + Number(p.get('expires_in') ?? '3600') * 1000;
      sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ token, expires } satisfies StoredToken));
      finish(null, token);
    };
  });
}

async function token(interactive: boolean): Promise<string> {
  const t = readToken();
  if (t) return t;
  if (!interactive) throw new Error('google-signed-out');
  return googleSignIn();
}

export async function pullGoogleBusy(interactive = false): Promise<void> {
  if (!useIntegrations.getState().google.connected || !useStore.getState().ready || useStore.getState().locked) return;
  try {
    const access = await token(interactive);
    const now = new Date();
    const res = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
      method: 'POST',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      headers: { Authorization: 'Bearer ' + access, 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeMin: addDays(now, -7).toISOString(), timeMax: addDays(now, 90).toISOString(), items: [{ id: 'primary' }] }),
    });
    if (!res.ok) throw new Error('google-' + res.status);
    const data = (await res.json()) as { calendars: Record<string, { busy: { start: string; end: string }[] }> };
    const blocks: BusyBlock[] = (data.calendars.primary?.busy ?? []).map((b) => ({
      id: 'g:' + b.start + ':' + b.end,
      source: 'google',
      start: new Date(b.start).toISOString(),
      end: new Date(b.end).toISOString(),
    }));
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
  sessionStorage.removeItem(TOKEN_KEY);
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
