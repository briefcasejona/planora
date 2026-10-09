import { useMemo, useRef, useState } from 'react';
import { actions, useStore } from '../../data/store';
import { repo } from '../../data/repo';
import { useFormat } from '../../lib/format';
import { googleConfigured, googleDisconnect, googleSignIn, pullGoogleBusy } from '../../integrations/google';
import { exportPlan, importCalendarFile, removeCalendarImport, setImportCategory } from '../../integrations/calendarFiles';
import { EVENT_CATEGORIES, type EventCategory } from '../../domain/types';
import { Chips } from '../../components/ui';
import { patchGoogle, saveIntegrations, useIntegrations } from '../../integrations/settings';
import { isNativeApp, platform } from '../../lib/platform';
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
      {isNativeApp() ? (
        <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">{t('integrations.googleNative')}</p>
      ) : !googleConfigured ? (
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

/** Apple Calendar (and any other calendar app) through .ics files: no account or password needed. */
export function IcsCard() {
  const { t, date } = useFormat();
  const imports = useIntegrations((s) => s.icsImports);
  const exp = useIntegrations((s) => s.icsExport);
  const busy = useStore((s) => s.busy);
  const alsoInOutlook = useMemo(() => {
    const outlook = new Set(busy.filter((b) => b.source === 'microsoft').map((b) => b.start + b.end));
    const result = new Set<string>();
    if (!outlook.size) return result;
    for (const i of imports) {
      const own = busy.filter((b) => b.source === 'ics' && b.importId === i.id);
      if (own.length && own.filter((b) => outlook.has(b.start + b.end)).length / own.length >= 0.8) result.add(i.id);
    }
    return result;
  }, [busy, imports]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const [category, setCategory] = useState<EventCategory>('lesson');
  const categoryOptions = EVENT_CATEGORIES.map((c) => <option key={c} value={c}>{t('category.' + c)}</option>);
  const setExport = (patch: Partial<typeof exp>) => saveIntegrations({ icsExport: { ...exp, ...patch } });

  const onFile = async (file: File) => {
    try {
      setMsg(t('ics.imported', { count: await importCalendarFile(file.name, await file.text(), category) }));
    } catch {
      setMsg(t('ics.invalid'));
    }
  };
  const doExport = async () => {
    try {
      await exportPlan();
      setMsg(t('ics.exported'));
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setMsg(t('integrations.error', { msg: String((e as Error).message ?? e) }));
    }
  };

  return (
    <div className="card mb-4">
      <h3 className="font-semibold">{t('ics.title')}</h3>
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">{t('ics.intro')}</p>

      <h4 className="mb-1 text-sm font-semibold">{t('ics.toPlanora')}</h4>
      <ul className="mb-3 list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
        <li>{t('ics.howMac')}</li>
        <li>{t('ics.howIphone')}</li>
        <li>{t('ics.howOther')}</li>
      </ul>
      <input ref={fileRef} type="file" accept=".ics,text/calendar" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); e.target.value = ''; }} />
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-40">
          <span className="label">{t('ics.category')}</span>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value as EventCategory)}>{categoryOptions}</select>
        </label>
        <button className="btn-secondary" onClick={() => fileRef.current?.click()}>{t('ics.import')}</button>
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('ics.categoryHint')}</p>
      {imports.length > 0 && (
        <ul className="mt-3 divide-y divide-slate-100 text-sm dark:divide-slate-800">
          {imports.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center gap-2 py-1.5">
              <span className="min-w-0 flex-1 truncate font-medium">{i.name}</span>
              <span className="text-xs text-slate-500">{t('ics.status', { count: i.count, when: date(i.importedAt, 'd MMM HH:mm') })}</span>
              <select className="input w-auto py-1 text-xs" aria-label={t('ics.categoryOf', { name: i.name })} value={i.category ?? 'lesson'}
                onChange={(e) => void setImportCategory(i.id, e.target.value as EventCategory)}>{categoryOptions}</select>
              <button className="btn-ghost px-2 py-1 text-rose-600" onClick={() => removeCalendarImport(i.id)}>{t('common.remove')}</button>
              {alsoInOutlook.has(i.id) && <span className="basis-full text-xs text-slate-500 dark:text-slate-400">{t('ics.alsoInOutlook')}</span>}
            </li>
          ))}
        </ul>
      )}

      <h4 className="mt-5 mb-1 border-t border-slate-100 pt-4 text-sm font-semibold dark:border-slate-800">{t('ics.fromPlanora')}</h4>
      <ul className="mb-2 list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
        <li>{platform() === 'android' ? t('ics.exportAndroid') : t('ics.exportIphone')}</li>
        <li>{t('ics.exportMac')}</li>
        <li>{t('ics.exportRefresh')}</li>
      </ul>
      <Toggle checked={exp.generic} onChange={(v) => setExport({ generic: v })} label={t('integrations.genericTitles')} description={t('ics.genericHint')} />
      <Toggle checked={exp.deadlines} onChange={(v) => setExport({ deadlines: v })} label={t('ics.includeDeadlines')} />
      <div className="my-2">
        <span className="label">{t('ics.reminder')}</span>
        <Chips label={t('ics.reminder')} value={exp.reminderMin} onChange={(v) => setExport({ reminderMin: v })}
          options={[0, 10, 30].map((m) => ({ value: m, label: m ? t('ics.reminderMin', { n: m }) : t('ics.noReminder') }))} />
      </div>
      <button className="btn-primary mt-2" onClick={doExport}>{t('ics.export')}</button>
      {msg && <p className="mt-2 text-sm">{msg}</p>}
    </div>
  );
}
