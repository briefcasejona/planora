import { useRef, useState } from 'react';
import { actions, useStore } from '../../data/store';
import { repo } from '../../data/repo';
import { downloadBlob } from '../../data/backup';
import { useFormat } from '../../lib/format';
import { googleConfigured, googleDisconnect, googleSignIn, pullGoogleBusy } from '../../integrations/google';
import { buildIcs, parseIcs } from '../../integrations/ics';
import { patchGoogle, saveIntegrations, useIntegrations } from '../../integrations/settings';
import { Toggle } from './Toggle';

export function GoogleCard() {
  const { t, date } = useFormat();
  const g = useIntegrations((s) => s.google);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(t('integrations.error', { msg: String((e as Error).message ?? e) }));
    } finally {
      setBusy(false);
    }
  };
  const connect = () =>
    run(async () => {
      await googleSignIn();
      await patchGoogle({ connected: true });
      await pullGoogleBusy(true);
    });
  const disconnect = () =>
    run(async () => {
      await googleDisconnect();
      await actions.replaceBusySource('google', []);
      await repo.clearLog('google');
      await patchGoogle({ connected: false, lastSync: undefined });
    });

  return (
    <div className="card mb-4">
      <h3 className="font-semibold">{t('integrations.google')}</h3>
      <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">{t('integrations.googleIntro')}</p>
      {!googleConfigured ? (
        <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">{t('integrations.notConfigured')}</p>
      ) : g.connected ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm">{g.lastSync ? t('integrations.lastSync', { when: date(g.lastSync, 'd MMM HH:mm') }) : t('integrations.connected')}</span>
          <button className="btn-secondary" disabled={busy} onClick={() => run(() => pullGoogleBusy(true))}>{t('integrations.syncNow')}</button>
          <button className="btn-ghost text-rose-600" disabled={busy} onClick={disconnect}>{t('integrations.disconnect')}</button>
        </div>
      ) : (
        <>
          <code className="mb-2 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[11px] dark:bg-slate-800">calendar.freebusy</code>
          <div><button className="btn-primary" disabled={busy} onClick={connect}>{t('integrations.connectGoogle')}</button></div>
        </>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-rose-600">{error}</p>}
    </div>
  );
}

export function IcsCard() {
  const { t, date } = useFormat();
  const { tasks, sessions, busy } = useStore();
  const importedAt = useIntegrations((s) => s.icsImportedAt);
  const fileRef = useRef<HTMLInputElement>(null);
  const [generic, setGeneric] = useState(true);
  const [deadlines, setDeadlines] = useState(true);
  const [msg, setMsg] = useState('');
  const count = busy.filter((b) => b.source === 'ics').length;

  const onFile = async (file: File) => {
    try {
      const blocks = parseIcs(await file.text());
      await actions.replaceBusySource('ics', blocks);
      await saveIntegrations({ icsImportedAt: new Date().toISOString() });
      await repo.addLog({ provider: 'ics', action: 'import-file', count: blocks.length, ok: true });
      setMsg(t('ics.imported', { count: blocks.length }));
    } catch {
      setMsg(t('ics.invalid'));
    }
  };
  const clear = async () => {
    await actions.replaceBusySource('ics', []);
    await saveIntegrations({ icsImportedAt: undefined });
    setMsg('');
  };
  const exportIcs = () => {
    const text = buildIcs(sessions, tasks, { generic, deadlines });
    downloadBlob(new Blob([text], { type: 'text/calendar' }), 'planora.ics');
  };

  return (
    <div className="card mb-4">
      <h3 className="font-semibold">{t('ics.title')}</h3>
      <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">{t('ics.intro')}</p>
      <div className="flex flex-wrap items-center gap-2">
        <input ref={fileRef} type="file" accept=".ics,text/calendar" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        <button className="btn-secondary" onClick={() => fileRef.current?.click()}>{t('ics.import')}</button>
        {count > 0 && <button className="btn-ghost" onClick={clear}>{t('ics.clear')}</button>}
      </div>
      {count > 0 && importedAt && <p className="mt-2 text-xs text-slate-500">{t('ics.status', { count, when: date(importedAt, 'd MMM HH:mm') })}</p>}
      {msg && <p className="mt-2 text-sm">{msg}</p>}
      <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
        <Toggle checked={generic} onChange={setGeneric} label={t('integrations.genericTitles')} description={t('ics.genericHint')} />
        <Toggle checked={deadlines} onChange={setDeadlines} label={t('ics.includeDeadlines')} />
        <button className="btn-secondary mt-2" onClick={exportIcs}>{t('ics.export')}</button>
      </div>
    </div>
  );
}
