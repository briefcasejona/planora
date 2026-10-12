import { format } from 'date-fns';
import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { actions, useStore } from './data/store';
import { planReminders } from './domain/reminders';
import { LockScreen } from './features/LockScreen';
import { Onboarding } from './features/Onboarding';
import i18n from './i18n';
import { startIntegrations } from './integrations';
import { useIntegrations } from './integrations/settings';
import { useFormat } from './lib/format';
import { scheduleTaskReminders, scheduleWeeklyReminders } from './notifications';
import { Shell } from './Shell';

let openFileHooked = false;

export default function App() {
  const ready = useStore((s) => s.ready);
  const locked = useStore((s) => s.locked);
  const prefs = useStore((s) => s.prefs);
  const tasks = useStore((s) => s.tasks);
  const sessions = useStore((s) => s.sessions);
  const ms = useIntegrations((s) => s.microsoft);
  const neutral = ms.connected && ms.writeSessions && ms.genericTitles;
  const { t } = useFormat();

  useEffect(() => {
    void actions.init();
  }, []);

  useEffect(() => {
    if (i18n.language !== prefs.language) void i18n.changeLanguage(prefs.language);
    document.documentElement.lang = prefs.language;
  }, [prefs.language]);

  useEffect(() => {
    if (!ready || locked) return;
    void startIntegrations();
    // Desktop app: .ics files opened with Planora are imported as busy time.
    if (!openFileHooked)
      window.planoraDesktop?.onOpenFile((name, text) => {
        void import('./integrations/calendarFiles').then((m) => m.importCalendarFile(name, text));
      });
    openFileHooked = true;
    // Re-check for missed sessions, passed deadlines and weekly overviews regularly.
    const tick = () => void actions.replan();
    const timer = setInterval(tick, 10 * 60 * 1000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [ready, locked]);

  useEffect(() => {
    if (!ready || locked || !prefs.onboarded) return;
    void scheduleWeeklyReminders(prefs, {
      planTitle: t('notify.planTitle'),
      planBody: t('notify.planBody'),
      reviewTitle: t('notify.reviewTitle'),
      reviewBody: t('notify.reviewBody'),
    });
  }, [ready, locked, prefs, t]);

  // Reminders follow every change to the plan; a short wait bundles the changes of one replan.
  useEffect(() => {
    if (!ready || locked || !prefs.onboarded) return;
    const timer = setTimeout(() => {
      const list = prefs.reminders === false ? [] : planReminders(new Date(), tasks, sessions);
      void scheduleTaskReminders(list, {
        neutralTitle: neutral ? 'Planora focus' : undefined,
        block: (minutes, start) => t('notify.blockBody', { minutes, time: format(start, 'HH:mm') }),
        deadline: (deadline) => t('notify.deadlineBody', { time: format(deadline, 'HH:mm') }),
      }).catch(() => undefined);
    }, 2000);
    return () => clearTimeout(timer);
  }, [ready, locked, prefs.onboarded, prefs.reminders, tasks, sessions, neutral, t]);

  if (!ready)
    return <div className="flex h-full items-center justify-center text-slate-500">{t('common.loading')}</div>;
  if (locked) return <LockScreen />;
  if (!prefs.onboarded) return <Onboarding />;
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Shell />
    </BrowserRouter>
  );
}
