import { useState } from 'react';
import { actions, useStore } from '../../data/store';
import type { Preferences, WeeklyMoment } from '../../domain/types';
import { useFormat } from '../../lib/format';
import { Chips, Field } from '../../components/ui';
import { requestWebNotificationPermission, notificationsSupported } from '../../notifications';

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function PlanningSettings() {
  const { t, locale } = useFormat();
  const prefs = useStore((s) => s.prefs);
  const [draft, setDraft] = useState<Preferences>(prefs);
  const [saved, setSaved] = useState(false);
  const [notif, setNotif] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'default');
  const dayName = (d: number) => locale.localize.day(d as 0, { width: 'wide' });
  const dirty = JSON.stringify(draft) !== JSON.stringify(prefs);

  const set = (patch: Partial<Preferences>) => {
    setDraft({ ...draft, ...patch });
    setSaved(false);
  };
  const setDay = (d: number, patch: Partial<Preferences['availability'][number]>) =>
    set({ availability: draft.availability.map((a, i) => (i === d ? { ...a, ...patch } : a)) });
  const save = async () => {
    await actions.savePrefs(draft);
    setSaved(true);
  };
  const num = (v: string, min: number, max: number) => Math.min(max, Math.max(min, Number(v) || min));

  const moment = (label: string, value: WeeklyMoment, onChange: (m: WeeklyMoment) => void) => (
    <div className="mb-3">
      <span className="label">{label}</span>
      <div className="flex gap-2">
        <select className="input" value={value.weekday} aria-label={label} onChange={(e) => onChange({ ...value, weekday: Number(e.target.value) })}>
          {WEEK_ORDER.map((d) => <option key={d} value={d}>{dayName(d)}</option>)}
        </select>
        <input className="input w-32" type="time" value={value.time} aria-label={label} onChange={(e) => onChange({ ...value, time: e.target.value })} />
      </div>
    </div>
  );

  return (
    <div>
      <div className="card mb-4">
        <h3 className="mb-3 font-semibold">{t('settings.general')}</h3>
        <div className="mb-3">
          <span className="label">{t('settings.language')}</span>
          <Chips label={t('settings.language')} value={draft.language} onChange={(v) => set({ language: v })}
            options={[{ value: 'nl', label: 'Nederlands' }, { value: 'en', label: 'English' }]} />
        </div>
        <div>
          <span className="label">{t('settings.role')}</span>
          <Chips label={t('settings.role')} value={draft.role} onChange={(v) => set({ role: v })}
            options={[{ value: 'student', label: t('role.student') }, { value: 'teacher', label: t('role.teacher') }]} />
        </div>
      </div>

      <div className="card mb-4">
        <h3 className="mb-1 font-semibold">{t('settings.availability')}</h3>
        <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">{t('settings.availabilityHint')}</p>
        <ul className="space-y-2">
          {WEEK_ORDER.map((d) => {
            const a = draft.availability[d];
            return (
              <li key={d} className="flex flex-wrap items-center gap-2">
                <label className="flex w-36 items-center gap-2 text-sm capitalize">
                  <input type="checkbox" checked={a.enabled} onChange={(e) => setDay(d, { enabled: e.target.checked })} />
                  {dayName(d)}
                </label>
                <input className="input w-28" type="time" value={a.start} disabled={!a.enabled} aria-label={t('settings.from', { day: dayName(d) })} onChange={(e) => setDay(d, { start: e.target.value })} />
                <span className="text-slate-400">-</span>
                <input className="input w-28" type="time" value={a.end} disabled={!a.enabled} aria-label={t('settings.to', { day: dayName(d) })} onChange={(e) => setDay(d, { end: e.target.value })} />
              </li>
            );
          })}
        </ul>
        <div className="mt-4 grid gap-x-3 sm:grid-cols-2">
          <Field label={t('settings.maxPerDay')} hint={t('settings.minutes')}>
            <input className="input" type="number" min={30} max={720} step={15} value={draft.maxMinutesPerDay} onChange={(e) => set({ maxMinutesPerDay: num(e.target.value, 30, 720) })} />
          </Field>
          <Field label={t('settings.buffer')} hint={t('settings.bufferHint')}>
            <input className="input" type="number" min={0} max={7} value={draft.deadlineBufferDays} onChange={(e) => set({ deadlineBufferDays: num(e.target.value, 0, 7) })} />
          </Field>
          <Field label={t('settings.minBlock')} hint={t('settings.minutes')}>
            <input className="input" type="number" min={10} max={120} step={5} value={draft.minBlockMin} onChange={(e) => set({ minBlockMin: num(e.target.value, 10, 120) })} />
          </Field>
          <Field label={t('settings.maxBlock')} hint={t('settings.minutes')}>
            <input className="input" type="number" min={20} max={240} step={5} value={draft.maxBlockMin} onChange={(e) => set({ maxBlockMin: Math.max(draft.minBlockMin, num(e.target.value, 20, 240)) })} />
          </Field>
          <Field label={t('settings.break')} hint={t('settings.minutes')}>
            <input className="input" type="number" min={0} max={60} step={5} value={draft.breakMin} onChange={(e) => set({ breakMin: num(e.target.value, 0, 60) })} />
          </Field>
        </div>
      </div>

      <div className="card mb-4">
        <h3 className="mb-3 font-semibold">{t('settings.weekly')}</h3>
        {moment(t('settings.weeklyPlan'), draft.weeklyPlan, (m) => set({ weeklyPlan: m }))}
        {moment(t('settings.weeklyReview'), draft.weeklyReview, (m) => set({ weeklyReview: m }))}
        {notificationsSupported() && notif !== 'granted' && (
          <button className="btn-secondary" onClick={async () => setNotif((await requestWebNotificationPermission()) ? 'granted' : 'denied')}>
            {t('settings.enableNotifications')}
          </button>
        )}
        {notif === 'granted' && <p className="text-sm text-emerald-600">{t('settings.notificationsOn')}</p>}
      </div>

      <div className="sticky bottom-20 z-10 flex items-center justify-end gap-3 md:bottom-4">
        {saved && !dirty && <span className="text-sm text-emerald-600">{t('settings.saved')}</span>}
        <button className="btn-primary shadow-lg" disabled={!dirty} onClick={save}>{t('settings.saveReplan')}</button>
      </div>
    </div>
  );
}
