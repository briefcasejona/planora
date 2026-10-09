import { type AccountInfo, InteractionRequiredAuthError, PublicClientApplication } from '@azure/msal-browser';
import { appUrl, isIosStandalone, isNativeApp } from '../../lib/platform';

/** Popups don't work in the native app or in an iPhone home-screen app: sign in by redirect there. */
const signInByRedirect = () => isNativeApp() || isIosStandalone();

const clientId = import.meta.env.VITE_MS_CLIENT_ID as string | undefined;
const tenant = (import.meta.env.VITE_MS_TENANT as string | undefined) || 'common';

/** The Microsoft integration only exists when the app is built with a client id. */
export const msConfigured = !!clientId;

/**
 * Least-privilege scopes, requested only when the matching feature is turned
 * on. Planora never asks for mail, files, contacts or chat access.
 */
export const MS_SCOPES = {
  readBusy: ['Calendars.Read'],
  writeSessions: ['Calendars.ReadWrite'],
  importTodo: ['Tasks.Read'],
  importTeams: ['EduAssignments.ReadBasic'],
  /** Only Planora's own hidden folder in OneDrive (Apps/Planora), never the user's files. */
  sync: ['Files.ReadWrite.AppFolder'],
} as const;

/**
 * Planora can hold two Microsoft sign-ins: one for Outlook/Teams ("calendar")
 * and one for syncing through OneDrive ("sync"), e.g. a school account and a
 * personal account. Which account belongs to which is remembered on this device.
 */
export type AccountSlot = 'calendar' | 'sync';
const SLOT_KEY = 'planora-ms-account-';

function slotAccountId(slot: AccountSlot): string | null {
  try {
    return localStorage.getItem(SLOT_KEY + slot);
  } catch {
    return null;
  }
}
function setSlotAccountId(slot: AccountSlot, id: string | null): void {
  try {
    if (id) localStorage.setItem(SLOT_KEY + slot, id);
    else localStorage.removeItem(SLOT_KEY + slot);
  } catch {
    /* not remembered */
  }
}

export type MsFeature = keyof typeof MS_SCOPES;

let pca: PublicClientApplication | null = null;
let pcaPersist: boolean | null = null;

async function client(requested: boolean): Promise<PublicClientApplication> {
  if (!clientId) throw new Error('ms-not-configured');
  // Sync runs in the background across restarts, so with sync on the sign-in is always kept.
  const persist = requested || !!slotAccountId('sync');
  if (pca && pcaPersist === persist) return pca;
  pca = new PublicClientApplication({
    auth: {
      clientId,
      authority: 'https://login.microsoftonline.com/' + tenant,
      redirectUri: appUrl('auth-redirect.html'),
      postLogoutRedirectUri: appUrl(''),
    },
    // Tokens stay in this browser only: sessionStorage by default, localStorage when the user opts in.
    cache: { cacheLocation: persist ? 'localStorage' : 'sessionStorage' },
  });
  await pca.initialize();
  pcaPersist = persist;
  return pca;
}

function account(app: PublicClientApplication, slot: AccountSlot = 'calendar'): AccountInfo | null {
  const id = slotAccountId(slot);
  if (slot === 'sync') return id ? app.getAccount({ homeAccountId: id }) : null;
  const syncId = slotAccountId('sync');
  return (
    (id ? app.getAccount({ homeAccountId: id }) : null) ??
    app.getActiveAccount() ??
    app.getAllAccounts().find((a) => a.homeAccountId !== syncId) ??
    null
  );
}

/** Remember which account a sign-in was for. */
function assign(app: PublicClientApplication, acc: AccountInfo, slot: AccountSlot): void {
  setSlotAccountId(slot, acc.homeAccountId);
  if (slot === 'calendar') app.setActiveAccount(acc);
}

/**
 * Inside the Android/iOS app popups do not work, so sign-in navigates to
 * Microsoft and back (redirect). What the user was doing is remembered here and
 * finished by completeMsRedirect() after the app reloads.
 */
export type MsPending =
  | { kind: 'connect' }
  | { kind: 'feature'; key: string }
  | { kind: 'sync' }
  | { kind: 'syncSetup' };
const PENDING_KEY = 'planora-ms-pending';

async function redirectTo(
  scopes: readonly string[],
  persist: boolean,
  pending: MsPending,
  acc?: AccountInfo | null,
): Promise<never> {
  if (pending.kind === 'syncSetup') persist = true;
  const app = await client(persist);
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  if (acc) await app.acquireTokenRedirect({ scopes: [...scopes], account: acc });
  else await app.loginRedirect({ scopes: [...scopes], prompt: 'select_account' });
  return new Promise<never>(() => undefined); // the page is navigating away
}

/** Call once at startup in the native app; returns what was pending, if a redirect just completed. */
export async function msHandleRedirect(
  persist: boolean,
): Promise<{ account: AccountInfo; pending: MsPending | null } | null> {
  if (!clientId || !signInByRedirect()) return null;
  const app = await client(persist);
  const result = await app.handleRedirectPromise();
  const raw = sessionStorage.getItem(PENDING_KEY);
  sessionStorage.removeItem(PENDING_KEY);
  if (!result?.account) return null;
  const pending = raw ? (JSON.parse(raw) as MsPending) : null;
  assign(app, result.account, pending?.kind === 'syncSetup' ? 'sync' : 'calendar');
  return { account: result.account, pending };
}

export async function msSignIn(
  scopes: readonly string[],
  persist: boolean,
  pending: MsPending = { kind: 'connect' },
  slot: AccountSlot = 'calendar',
): Promise<AccountInfo> {
  const keep = persist || slot === 'sync';
  const app = await client(keep);
  if (signInByRedirect()) return redirectTo(scopes, keep, slot === 'sync' ? { kind: 'syncSetup' } : pending);
  const result = await app.loginPopup({ scopes: [...scopes], prompt: 'select_account' });
  assign(app, result.account, slot);
  return result.account;
}

/** Get a token for the given scopes, asking for consent in a popup only when needed. */
export async function msToken(
  scopes: readonly string[],
  persist: boolean,
  interactive = false,
  pending: MsPending = { kind: 'sync' },
  slot: AccountSlot = 'calendar',
): Promise<string> {
  const app = await client(persist);
  const acc = account(app, slot);
  if (!acc) {
    if (!interactive) throw new Error('ms-signed-out');
    await msSignIn(scopes, persist, pending, slot);
    return msToken(scopes, persist, false, pending, slot);
  }
  try {
    return (await app.acquireTokenSilent({ scopes: [...scopes], account: acc })).accessToken;
  } catch (e) {
    if (interactive && e instanceof InteractionRequiredAuthError) {
      if (signInByRedirect()) return redirectTo(scopes, persist, pending, acc);
      return (await app.acquireTokenPopup({ scopes: [...scopes], account: acc })).accessToken;
    }
    throw e;
  }
}

export async function msIsSignedIn(persist: boolean, slot: AccountSlot = 'calendar'): Promise<boolean> {
  if (!clientId) return false;
  return !!account(await client(persist), slot);
}

/** The account used for a slot, e.g. to show "Syncing as name@outlook.com". */
export async function msAccountLabel(slot: AccountSlot): Promise<string | undefined> {
  if (!clientId) return undefined;
  return account(await client(false), slot)?.username;
}

/**
 * Forget a sign-in on this device (no data is sent anywhere). Without a slot,
 * every Microsoft sign-in is forgotten. The other slot's account stays when it
 * is a different account.
 */
export async function msSignOut(slot?: AccountSlot): Promise<void> {
  const other = slot === 'calendar' ? slotAccountId('sync') : slot === 'sync' ? slotAccountId('calendar') : null;
  for (const persist of [false, true]) {
    try {
      const app = await client(persist);
      const acc = slot ? account(app, slot) : null;
      if (slot && acc && acc.homeAccountId === other) continue; // the same account is still used for the other slot
      if (slot && acc) await app.clearCache({ account: acc });
      else if (!slot) await app.clearCache();
    } catch {
      /* nothing cached */
    }
  }
  if (slot) setSlotAccountId(slot, null);
  else {
    setSlotAccountId('calendar', null);
    setSlotAccountId('sync', null);
  }
  pca = null;
  pcaPersist = null;
}

/** Where users can revoke the consent they granted Planora at Microsoft. */
export const MS_REVOKE_URL = 'https://myapps.microsoft.com';
