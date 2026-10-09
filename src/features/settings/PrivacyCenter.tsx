import { useEffect, useRef, useState } from 'react';
import { actions } from '../../data/store';
import { repo, setEncryptionKey } from '../../data/repo';
import { createCryptoConfig, unlock, type CryptoConfig } from '../../data/crypto';
import { createBackup, downloadBlob, restoreBackup } from '../../data/backup';
import type { SyncLogEntry } from '../../data/db';
import { useFormat } from '../../lib/format';
import { Field, Modal } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { useIntegrations, saveIntegrations, DEFAULT_INTEGRATIONS } from '../../integrations/settings';
import { msSignOut } from '../../integrations/microsoft/auth';
import { disableSync } from '../../data/sync/engine';
import { googleDisconnect } from '../../integrations/google';
import { BASE } from '../../lib/platform';

export function PrivacyCenter() {
  const { t } = useFormat();
  const integ = useIntegrations();
  const connections = [
    integ.microsoft.connected && t('integrations.microsoft'),
    integ.google.connected && t('integrations.google'),
  ].filter(Boolean) as string[];
  return (
    <div>
      <div className="card mb-4 border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40">
        <div className="flex items-start gap-3">
          <Icon name="shield" className="h-6 w-6 shrink-0 text-emerald-600" />
          <div className="text-sm">
            <p className="mb-1 font-semibold">{t('privacy.summaryTitle')}</p>
            <ul className="list-disc space-y-1 pl-4 text-slate-700 dark:text-slate-300">
              <li>{t('privacy.local')}</li>
              <li>{t('privacy.noServer')}</li>
              <li>{t('privacy.noTracking')}</li>
              <li>{connections.length ? t('privacy.connections', { list: connections.join(', ') }) : t('privacy.noConnections')}</li>
            </ul>
          </div>
        </div>
      </div>
      <EncryptionCard />
      <BackupCard />
      <ActivityLog />
      <DeleteAll />
    </div>
  );
}

function EncryptionCard() {
  const { t } = useFormat();
  const [config, setConfig] = useState<CryptoConfig | null | undefined>(undefined);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void repo.getCryptoConfig().then(setConfig);
  }, []);

  const enable = async () => {
    if (pw.length < 8) return setError(t('privacy.pwShort'));
    if (pw !== pw2) return setError(t('privacy.pwMismatch'));
    setBusy(true);
    const { config: c, key } = await createCryptoConfig(pw);
    await repo.reencodeAll(key);
    await repo.setKv('crypto', c);
    setConfig(c);
    setPw('');
    setPw2('');
    setError('');
    setBusy(false);
  };
  const disable = async () => {
    if (!config) return;
    setBusy(true);
    const key = await unlock(pw, config);
    if (!key) {
      setBusy(false);
      return setError(t('lock.wrong'));
    }
    setEncryptionKey(key);
    await repo.reencodeAll(null);
    await repo.deleteKv('crypto');
    setConfig(null);
    setPw('');
    setError('');
    setBusy(false);
  };

  if (config === undefined) return null;
  return (
    <div className="card mb-4">
      <h3 className="font-semibold">{t('privacy.encryption')}</h3>
      <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">{config ? t('privacy.encryptionOn') : t('privacy.encryptionIntro')}</p>
      {config ? (
        <div className="flex flex-wrap items-end gap-2">
          <button className="btn-primary" onClick={() => actions.lock()}><Icon name="lock" className="h-4 w-4" />{t('privacy.lockNow')}</button>
          <input className="input max-w-56" type="password" placeholder={t('lock.passphrase')} aria-label={t('lock.passphrase')} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" />
          <button className="btn-secondary" disabled={busy || !pw} onClick={disable}>{t('privacy.disableEncryption')}</button>
        </div>
      ) : (
        <div className="grid gap-x-3 sm:grid-cols-2">
          <Field label={t('lock.passphrase')}>
            <input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
          </Field>
          <Field label={t('privacy.repeat')}>
            <input className="input" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
          </Field>
          <p className="text-xs text-amber-700 sm:col-span-2 dark:text-amber-300">{t('privacy.pwWarning')}</p>
          <div className="mt-2 sm:col-span-2"><button className="btn-primary" disabled={busy} onClick={enable}>{t('privacy.enableEncryption')}</button></div>
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-rose-600">{error}</p>}
    </div>
  );
}

function BackupCard() {
  const { t } = useFormat();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'export' | 'import' | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState('');

  const close = () => {
    setMode(null);
    setPw('');
    setFile(null);
  };
  const go = async () => {
    try {
      if (mode === 'export') {
        if (pw.length < 8) return setMsg(t('privacy.pwShort'));
        downloadBlob(await createBackup(pw), 'planora-backup-' + new Date().toISOString().slice(0, 10) + '.json');
        setMsg(t('privacy.backupDone'));
      } else if (file) {
        await restoreBackup(await file.text(), pw);
        await actions.reload();
        setMsg(t('privacy.restoreDone'));
      }
      close();
    } catch (e) {
      setMsg((e as Error).message === 'wrong-passphrase' ? t('lock.wrong') : t('privacy.restoreFailed'));
    }
  };

  return (
    <div className="card mb-4">
      <h3 className="font-semibold">{t('privacy.backup')}</h3>
      <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">{t('privacy.backupIntro')}</p>
      <div className="flex flex-wrap gap-2">
        <button className="btn-secondary" onClick={() => { setMsg(''); setMode('export'); }}><Icon name="download" className="h-4 w-4" />{t('privacy.export')}</button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFile(f); setMsg(''); setMode('import'); } e.target.value = ''; }} />
        <button className="btn-secondary" onClick={() => fileRef.current?.click()}><Icon name="upload" className="h-4 w-4" />{t('privacy.import')}</button>
      </div>
      {msg && <p className="mt-2 text-sm">{msg}</p>}
      <Modal open={mode !== null} onClose={close} title={mode === 'export' ? t('privacy.export') : t('privacy.import')}
        footer={<><button className="btn-secondary" onClick={close}>{t('common.cancel')}</button><button className="btn-primary" onClick={go}>{t('common.ok')}</button></>}>
        <p className="mb-3 text-sm">{mode === 'export' ? t('privacy.exportHint') : t('privacy.importHint')}</p>
        <Field label={t('lock.passphrase')}>
          <input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete={mode === 'export' ? 'new-password' : 'current-password'} />
        </Field>
        {msg && <p role="alert" className="text-sm text-rose-600">{msg}</p>}
      </Modal>
    </div>
  );
}

function ActivityLog() {
  const { t, date } = useFormat();
  const [log, setLog] = useState<SyncLogEntry[]>([]);
  useEffect(() => {
    void repo.listLog().then(setLog);
  }, []);
  return (
    <div className="card mb-4">
      <h3 className="font-semibold">{t('privacy.log')}</h3>
      <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">{t('privacy.logIntro')}</p>
      {log.length === 0 ? (
        <p className="text-sm text-slate-500">{t('privacy.logEmpty')}</p>
      ) : (
        <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto text-sm dark:divide-slate-800">
          {log.map((l) => (
            <li key={l.id} className="flex gap-2 py-1.5">
              <span className="w-28 shrink-0 text-slate-500">{date(l.at, 'd MMM HH:mm')}</span>
              <span className="flex-1">{t('source.' + l.provider)} · {t('log.' + l.action, { count: l.count })}</span>
              <span className={l.ok ? 'text-emerald-600' : 'text-rose-600'}>{l.ok ? t('log.ok') : t('log.failed')}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DeleteAll() {
  const { t } = useFormat();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const word = t('privacy.deleteWord');
  const wipe = async () => {
    await disableSync(); // stop syncing first; the copy in OneDrive and on other devices stays
    await msSignOut().catch(() => undefined);
    await googleDisconnect().catch(() => undefined);
    await actions.wipeAll();
    await saveIntegrations(DEFAULT_INTEGRATIONS);
    await repo.wipeAll();
    window.location.href = BASE;
  };
  return (
    <div className="card mb-4 border-rose-200 dark:border-rose-900">
      <h3 className="font-semibold text-rose-700 dark:text-rose-300">{t('privacy.deleteAll')}</h3>
      <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">{t('privacy.deleteIntro')}</p>
      <button className="btn-danger" onClick={() => setOpen(true)}><Icon name="trash" className="h-4 w-4" />{t('privacy.deleteAll')}</button>
      <Modal open={open} onClose={() => setOpen(false)} title={t('privacy.deleteAll')}
        footer={<><button className="btn-secondary" onClick={() => setOpen(false)}>{t('common.cancel')}</button><button className="btn-danger" disabled={typed.trim().toLowerCase() !== word.toLowerCase()} onClick={wipe}>{t('common.delete')}</button></>}>
        <p className="mb-3 text-sm">{t('privacy.deleteConfirm', { word })}</p>
        <input className="input" value={typed} onChange={(e) => setTyped(e.target.value)} aria-label={t('privacy.deleteConfirm', { word })} />
      </Modal>
    </div>
  );
}
