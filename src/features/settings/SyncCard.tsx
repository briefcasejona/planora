import { useEffect, useState } from 'react';
import { Icon } from '../../components/Icon';
import { Field, Modal } from '../../components/ui';
import { deleteRemote, disableSync, enableSync, hasRemote, type SyncError, useSync } from '../../data/sync/engine';
import { syncInBackground, syncTransport } from '../../integrations/deviceSync';
import { useFormat } from '../../lib/format';

const msConfigured = !!import.meta.env.VITE_MS_CLIENT_ID;
const MIN_PASSPHRASE = 8;

/**
 * Optional sync between the user's own devices through their OneDrive.
 * Planora works fully without it; nothing here runs until the user starts it.
 */
export function SyncCard() {
  const { t, date } = useFormat();
  const sync = useSync();
  const [account, setAccount] = useState<string | null | undefined>(undefined);
  const [remote, setRemote] = useState<boolean | null>(null);
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Only look up the sync account when the user already set one up (no Microsoft code otherwise).
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-check the account when sync is switched on or off
  useEffect(() => {
    let alive = true;
    let hasSlot = false;
    try {
      hasSlot = !!localStorage.getItem('planora-ms-account-sync');
    } catch {
      /* no storage */
    }
    if (!msConfigured || !hasSlot) {
      setAccount(null);
      return;
    }
    void import('../../integrations/microsoft/auth')
      .then((a) => a.msAccountLabel('sync'))
      .then((label) => alive && setAccount(label ?? null));
    return () => {
      alive = false;
    };
  }, [sync.enabled]);

  // Signed in but not on yet: is there already a sync file from another device?
  useEffect(() => {
    if (!account || sync.enabled) return;
    setRemote(null);
    void syncTransport()
      .then(hasRemote)
      .then(setRemote)
      .catch(() => setError(t('sync.errors.failed')));
  }, [account, sync.enabled, t]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      const msg = String((e as Error).message ?? e);
      setError(
        msg === 'wrong-passphrase'
          ? t('sync.errors.wrong-passphrase')
          : msg === 'user_cancelled'
            ? ''
            : t('sync.errors.failed'),
      );
    } finally {
      setBusy(false);
    }
  };

  const signIn = () =>
    run(async () => {
      const auth = await import('../../integrations/microsoft/auth');
      const acc = await auth.msSignIn(auth.MS_SCOPES.sync, true, { kind: 'syncSetup' }, 'sync');
      setAccount(acc.username);
    });

  const signOut = () =>
    run(async () => {
      const auth = await import('../../integrations/microsoft/auth');
      await auth.msSignOut('sync');
      setAccount(null);
      setRemote(null);
    });

  const turnOn = () => {
    if (pass.length < MIN_PASSPHRASE) return setError(t('sync.passTooShort', { n: MIN_PASSPHRASE }));
    if (remote === false && pass !== pass2) return setError(t('sync.passMismatch'));
    return run(async () => {
      await enableSync(pass, await syncTransport(true));
      setPass('');
      setPass2('');
    });
  };
  const signInAgain = () =>
    run(async () => {
      await (await syncTransport(true)).get(); // asks Microsoft to sign in again
      await syncInBackground();
    });

  const errorText = (e: SyncError) => t('sync.errors.' + e);

  if (!msConfigured) {
    return (
      <div className="card mb-4">
        <h3 className="font-semibold">{t('sync.title')}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300">{t('sync.notAvailable')}</p>
      </div>
    );
  }

  return (
    <div className="card mb-4">
      <h3 className="mb-1 flex items-center gap-2 font-semibold">
        <Icon name="link" className="h-5 w-5" />
        {t('sync.title')}
      </h3>
      <p className="mb-2 text-sm text-slate-600 dark:text-slate-300">{t('sync.intro')}</p>
      <ul className="mb-4 list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
        <li>{t('sync.point1')}</li>
        <li>{t('sync.point2')}</li>
        <li>{t('sync.point3')}</li>
      </ul>

      {sync.enabled ? (
        <div className="space-y-3">
          <p className="text-sm">
            {account && <span className="block text-slate-500">{t('sync.as', { account })}</span>}
            {sync.running
              ? t('sync.running')
              : sync.lastSync
                ? t('sync.last', { when: date(sync.lastSync, 'd MMM HH:mm') })
                : t('sync.never')}
          </p>
          {sync.error && (
            <div
              role="alert"
              className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
            >
              <p>{errorText(sync.error)}</p>
              {sync.error === 'signed-out' && (
                <button className="btn-secondary mt-2" disabled={busy} onClick={signInAgain}>
                  {t('sync.signInAgain')}
                </button>
              )}
              {sync.error === 'wrong-passphrase' && (
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <input
                    className="input max-w-60"
                    type="password"
                    autoComplete="current-password"
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                    aria-label={t('sync.passphrase')}
                  />
                  <button
                    className="btn-secondary"
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        await enableSync(pass, await syncTransport(true));
                        setPass('');
                      })
                    }
                  >
                    {t('sync.retry')}
                  </button>
                </div>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" disabled={busy || sync.running} onClick={() => run(syncInBackground)}>
              {t('sync.now')}
            </button>
            <button className="btn-secondary" disabled={busy} onClick={() => run(disableSync)}>
              {t('sync.stop')}
            </button>
            <button className="btn-ghost text-rose-600" disabled={busy} onClick={() => setConfirmDelete(true)}>
              {t('sync.deleteRemote')}
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('sync.stopHint')}</p>
        </div>
      ) : account === undefined ? null : !account ? (
        <div>
          <button className="btn-primary" disabled={busy} onClick={signIn}>
            {t('sync.signIn')}
          </button>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t('sync.signInHint')}</p>
        </div>
      ) : (
        <div>
          <p className="mb-3 text-sm text-slate-500">
            {t('sync.as', { account })} ·{' '}
            <button className="underline" onClick={signOut}>
              {t('sync.otherAccount')}
            </button>
          </p>
          {remote === null ? (
            <p className="text-sm text-slate-500">{t('common.loading')}</p>
          ) : (
            <>
              <p className="mb-2 text-sm">{remote ? t('sync.joinIntro') : t('sync.createIntro')}</p>
              <Field label={t('sync.passphrase')}>
                <input
                  className="input"
                  type="password"
                  autoComplete={remote ? 'current-password' : 'new-password'}
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                />
              </Field>
              {!remote && (
                <Field label={t('sync.passphraseAgain')}>
                  <input
                    className="input"
                    type="password"
                    autoComplete="new-password"
                    value={pass2}
                    onChange={(e) => setPass2(e.target.value)}
                  />
                </Field>
              )}
              <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{t('sync.passHint')}</p>
              <button className="btn-primary" disabled={busy} onClick={turnOn}>
                {busy ? t('common.loading') : t('sync.turnOn')}
              </button>
            </>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-rose-600">
          {error}
        </p>
      )}

      {confirmDelete && (
        <Modal
          open
          onClose={() => setConfirmDelete(false)}
          title={t('sync.deleteRemote')}
          footer={
            <>
              <button className="btn-secondary" onClick={() => setConfirmDelete(false)}>
                {t('common.cancel')}
              </button>
              <button
                className="btn-danger"
                onClick={() =>
                  run(async () => {
                    await deleteRemote(await syncTransport(true));
                    setConfirmDelete(false);
                  })
                }
              >
                {t('common.delete')}
              </button>
            </>
          }
        >
          <p className="text-sm">{t('sync.deleteRemoteIntro')}</p>
        </Modal>
      )}
    </div>
  );
}
