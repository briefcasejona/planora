import { InteractionRequiredAuthError, PublicClientApplication, type AccountInfo } from '@azure/msal-browser';

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
} as const;

export type MsFeature = keyof typeof MS_SCOPES;

let pca: PublicClientApplication | null = null;
let pcaPersist: boolean | null = null;

async function client(persist: boolean): Promise<PublicClientApplication> {
  if (!clientId) throw new Error('ms-not-configured');
  if (pca && pcaPersist === persist) return pca;
  pca = new PublicClientApplication({
    auth: {
      clientId,
      authority: 'https://login.microsoftonline.com/' + tenant,
      redirectUri: window.location.origin + '/auth-redirect.html',
      postLogoutRedirectUri: window.location.origin,
    },
    // Tokens stay in this browser only: sessionStorage by default, localStorage when the user opts in.
    cache: { cacheLocation: persist ? 'localStorage' : 'sessionStorage' },
  });
  await pca.initialize();
  pcaPersist = persist;
  return pca;
}

function account(app: PublicClientApplication): AccountInfo | null {
  return app.getActiveAccount() ?? app.getAllAccounts()[0] ?? null;
}

export async function msSignIn(scopes: readonly string[], persist: boolean): Promise<AccountInfo> {
  const app = await client(persist);
  const result = await app.loginPopup({ scopes: [...scopes], prompt: 'select_account' });
  app.setActiveAccount(result.account);
  return result.account;
}

/** Get a token for the given scopes, asking for consent in a popup only when needed. */
export async function msToken(scopes: readonly string[], persist: boolean, interactive = false): Promise<string> {
  const app = await client(persist);
  const acc = account(app);
  if (!acc) {
    if (!interactive) throw new Error('ms-signed-out');
    await msSignIn(scopes, persist);
    return msToken(scopes, persist, false);
  }
  try {
    return (await app.acquireTokenSilent({ scopes: [...scopes], account: acc })).accessToken;
  } catch (e) {
    if (interactive && e instanceof InteractionRequiredAuthError) {
      return (await app.acquireTokenPopup({ scopes: [...scopes], account: acc })).accessToken;
    }
    throw e;
  }
}

export async function msIsSignedIn(persist: boolean): Promise<boolean> {
  if (!clientId) return false;
  return !!account(await client(persist));
}

/** Forget the sign-in on this device (no data is sent anywhere). */
export async function msSignOut(): Promise<void> {
  for (const persist of [false, true]) {
    try {
      const app = await client(persist);
      await app.clearCache();
    } catch {
      /* nothing cached */
    }
  }
  pca = null;
  pcaPersist = null;
}

/** Where users can revoke the consent they granted Planora at Microsoft. */
export const MS_REVOKE_URL = 'https://myapps.microsoft.com';
