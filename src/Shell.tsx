import { lazy, Suspense, useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useStore } from './data/store';
import { useFormat } from './lib/format';
import { Icon, type IconName } from './components/Icon';
import { TodayPage } from './features/TodayPage';
import { InboxPage } from './features/InboxPage';
import { TaskForm } from './features/TaskForm';

const CalendarPage = lazy(() => import('./features/CalendarPage').then((m) => ({ default: m.CalendarPage })));
const ReviewPage = lazy(() => import('./features/ReviewPage').then((m) => ({ default: m.ReviewPage })));
const SettingsPage = lazy(() => import('./features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })));

const NAV: { to: string; icon: IconName; key: string }[] = [
  { to: '/', icon: 'today', key: 'nav.today' },
  { to: '/inbox', icon: 'inbox', key: 'nav.inbox' },
  { to: '/calendar', icon: 'calendar', key: 'nav.calendar' },
  { to: '/review', icon: 'review', key: 'nav.review' },
  { to: '/settings', icon: 'settings', key: 'nav.settings' },
];

const sideLink = (active: boolean) =>
  `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium ${
    active ? 'bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
  }`;

export function Shell() {
  const { t } = useFormat();
  const [adding, setAdding] = useState(false);
  const unseen = useStore((s) => s.reports.some((r) => !r.seenAt));
  return (
    <div className="flex min-h-full">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white p-4 md:flex dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 flex items-center gap-2 px-2">
          <img src="/icon.svg" alt="" className="h-8 w-8" />
          <span className="text-lg font-bold">Planora</span>
        </div>
        <button className="btn-primary mb-4" onClick={() => setAdding(true)}>
          <Icon name="plus" className="h-4 w-4" />
          {t('nav.newTask')}
        </button>
        <nav className="flex flex-col gap-1" aria-label={t('nav.main')}>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => sideLink(isActive)}>
              <Icon name={n.icon} />
              {t(n.key)}
              {n.to === '/review' && unseen && <span className="ml-auto h-2 w-2 rounded-full bg-brand-600" aria-label={t('review.new')} />}
            </NavLink>
          ))}
        </nav>
        <p className="mt-auto flex items-center gap-2 px-2 text-xs text-slate-500">
          <Icon name="shield" className="h-4 w-4 text-emerald-600" />
          {t('privacy.badge')}
        </p>
      </aside>

      <main className="min-w-0 flex-1 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-28 md:px-8 md:py-8">
        <div className="mx-auto max-w-5xl">
          <Suspense fallback={<p className="text-sm text-slate-500">{t('common.loading')}</p>}>
          <Routes>
            <Route path="/" element={<TodayPage />} />
            <Route path="/inbox" element={<InboxPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/review" element={<ReviewPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </div>
      </main>

      <button
        className="btn-primary fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 h-14 w-14 rounded-full p-0 shadow-lg md:hidden"
        onClick={() => setAdding(true)}
        aria-label={t('nav.newTask')}
      >
        <Icon name="plus" className="h-6 w-6" />
      </button>
      <nav
        className="fixed inset-x-0 bottom-0 z-20 flex border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-900/95"
        aria-label={t('nav.main')}
      >
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            className={({ isActive }) => `relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${isActive ? 'text-brand-600' : 'text-slate-500'}`}
          >
            <Icon name={n.icon} />
            {t(n.key)}
            {n.to === '/review' && unseen && <span className="absolute top-1.5 right-1/4 h-2 w-2 rounded-full bg-brand-600" />}
          </NavLink>
        ))}
      </nav>
      <TaskForm open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}
