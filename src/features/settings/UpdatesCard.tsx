import { useState } from 'react';
import { checkForUpdateNow, installUpdate, setAutoUpdate, useUpdates } from '../../integrations/updates';
import { useFormat } from '../../lib/format';
import { Toggle } from './Toggle';

/** Updates for the installed apps (desktop and Android). The website updates itself, so this is hidden there. */
export function UpdatesCard() {
  const { t, date } = useFormat();
  const u = useUpdates();
  const [busy, setBusy] = useState(false);
  if (!u.supported) return null;
  const check = async () => {
    setBusy(true);
    try {
      await checkForUpdateNow();
    } finally {
      setBusy(false);
    }
  };
  const status =
    u.state === 'checking' ? t('updates.checking')
    : u.state === 'downloading' ? t('updates.downloading', { version: u.version })
    : u.state === 'ready' || u.state === 'available' ? t('updates.found', { version: u.version })
    : u.state === 'none' ? t('updates.upToDate')
    : u.state === 'error' ? t('updates.failed')
    : '';
  return (
    <div className="card mb-4">
      <h3 className="mb-1 font-semibold">{t('updates.title')}</h3>
      <p className="mb-2 text-sm text-slate-600 dark:text-slate-300">
        {u.current && t('updates.current', { version: u.current })} {status}
        {u.lastCheck && <span className="block text-xs text-slate-500">{t('updates.lastCheck', { when: date(u.lastCheck, 'd MMM HH:mm') })}</span>}
      </p>
      <Toggle checked={u.auto} onChange={(v) => void setAutoUpdate(v)} label={t('updates.auto')} description={t('updates.autoHint')} />
      <div className="mt-2 flex flex-wrap gap-2">
        <button className="btn-secondary" disabled={busy || u.state === 'checking' || u.state === 'downloading'} onClick={check}>{t('updates.checkNow')}</button>
        {(u.state === 'ready' || u.state === 'available') && <button className="btn-primary" onClick={() => void installUpdate()}>{t(updateAction(u.kind, u.state))}</button>}
      </div>
    </div>
  );
}

/** The label of the update button: restart (installs itself), download (Mac/portable) or update (Android). */
export function updateAction(kind: 'install' | 'notify' | 'android', state: string): string {
  if (kind === 'android') return 'updates.androidUpdate';
  if (kind === 'install' && state === 'ready') return 'updates.restart';
  return 'updates.download';
}
