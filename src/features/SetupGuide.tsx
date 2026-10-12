import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { actions, useStore } from '../data/store';
import { type SetupStep, setupState } from '../domain/setupGuide';
import { useFormat } from '../lib/format';
import { platform } from '../lib/platform';
import { notificationPermission, requestWebNotificationPermission } from '../notifications';
import { TaskForm } from './TaskForm';

type Permission = Awaited<ReturnType<typeof notificationPermission>>;

/** The first-time "Get started" card on Today: timetable, first deadline, reminders. */
export function SetupGuide() {
  const { t } = useFormat();
  const { prefs, busy, tasks } = useStore();
  const [permission, setPermission] = useState<Permission | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    void notificationPermission()
      .then(setPermission)
      .catch(() => setPermission('unsupported'));
  }, []);

  const state = permission && setupState(prefs, busy, tasks, permission);
  const allDone = !!state && state.steps.every((s) => s.done);

  // Once every step is done the card stays away, even if the data changes later.
  useEffect(() => {
    if (allDone && !prefs.setupGuideHidden)
      void actions.savePrefs({ ...useStore.getState().prefs, setupGuideHidden: true });
  }, [allDone, prefs.setupGuideHidden]);

  if (!state?.visible) return null;

  const hide = () => void actions.savePrefs({ ...useStore.getState().prefs, setupGuideHidden: true });
  const allowReminders = async () => {
    const granted = await requestWebNotificationPermission().catch(() => false);
    if (granted && useStore.getState().prefs.reminders === false)
      await actions.savePrefs({ ...useStore.getState().prefs, reminders: true });
    setPermission(await notificationPermission().catch(() => (granted ? 'granted' : 'denied')));
  };

  const action = (step: SetupStep) => {
    if (step === 'timetable')
      return (
        <Link className="btn-secondary" to="/inbox">
          {t('setup.timetableAction')}
        </Link>
      );
    if (step === 'task')
      return (
        <button className="btn-secondary" onClick={() => setAdding(true)}>
          {t('setup.taskAction')}
        </button>
      );
    if (permission === 'denied')
      return <p className="text-sm text-amber-700 dark:text-amber-300">{t('setup.remindersDenied')}</p>;
    return (
      <button className="btn-secondary" onClick={allowReminders}>
        {t('setup.remindersAction')}
      </button>
    );
  };

  return (
    <section className="card mb-6 p-4" aria-labelledby="setup-title">
      <div className="mb-3 flex items-start gap-2">
        <Icon name="sparkle" className="mt-0.5 h-5 w-5 text-brand-600" />
        <div className="min-w-0 flex-1">
          <h2 id="setup-title" className="font-semibold">
            {t('setup.title')}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">{t('setup.intro')}</p>
        </div>
        <button className="btn-ghost text-sm" onClick={hide}>
          {t('setup.hide')}
        </button>
      </div>
      <ol className="space-y-3">
        {state.steps.map(({ step, done }, i) => (
          <li key={step} className="flex gap-3" data-step={step} data-done={done}>
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                done ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {done ? <Icon name="check" className="h-4 w-4" /> : i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className={`font-medium ${done ? 'text-slate-500 line-through' : ''}`}>{t(`setup.${step}Title`)}</p>
              {!done && (
                <>
                  <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{t(`setup.${step}Hint`)}</p>
                  {step === 'reminders' && platform() === 'web' && (
                    <p className="mt-1 text-sm text-slate-500">{t('setup.remindersHintWeb')}</p>
                  )}
                  <div className="mt-2">{action(step)}</div>
                </>
              )}
            </div>
          </li>
        ))}
      </ol>
      {adding && <TaskForm open onClose={() => setAdding(false)} />}
    </section>
  );
}
