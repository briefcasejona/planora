import { type FormEvent, useState } from 'react';
import { Icon } from '../components/Icon';
import { actions } from '../data/store';
import { useFormat } from '../lib/format';

export function LockScreen() {
  const { t } = useFormat();
  const [pw, setPw] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const ok = await actions.unlock(pw);
    setBusy(false);
    setError(!ok);
    if (ok) setPw('');
  };
  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <form onSubmit={submit} className="card w-full max-w-sm p-6 text-center">
        <Icon name="lock" className="mx-auto mb-3 h-10 w-10 text-brand-600" />
        <h1 className="mb-1 text-xl font-bold">{t('lock.title')}</h1>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">{t('lock.intro')}</p>
        <label className="sr-only" htmlFor="unlock-pw">
          {t('lock.passphrase')}
        </label>
        <input
          id="unlock-pw"
          className="input mb-3"
          type="password"
          autoFocus
          autoComplete="current-password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder={t('lock.passphrase')}
        />
        {error && (
          <p role="alert" className="mb-3 text-sm text-rose-600">
            {t('lock.wrong')}
          </p>
        )}
        <button className="btn-primary w-full" disabled={busy || !pw}>
          {busy ? t('common.loading') : t('lock.unlock')}
        </button>
      </form>
    </div>
  );
}
