import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { actions, useStore } from './data/store';
import { useFormat } from './lib/format';
import i18n from './i18n';
import { Onboarding } from './features/Onboarding';
import { LockScreen } from './features/LockScreen';
import { Shell } from './Shell';
import { startIntegrations } from './integrations';
import { scheduleWeeklyReminders } from './notifications';

export default function App() {
  const ready = useStore((s) => s.ready);
  const locked = useStore((s) => s.locked);
  const prefs = useStore((s) => s.prefs);
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

  if (!ready) return <div className="flex h-full items-center justify-center text-slate-500">{t('common.loading')}</div>;
  if (locked) return <LockScreen />;
  if (!prefs.onboarded) return <Onboarding />;
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}
