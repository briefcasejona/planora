import { addDays } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Chips, Empty } from '../components/ui';
import { currentPlanWeek } from '../data/moments';
import { actions, useStore } from '../data/store';
import {
  buildWeeklyPlan,
  buildWeeklyReview,
  type WeeklyPlanData,
  type WeeklyReviewData,
  weekStartOf,
} from '../domain/insights';
import { useFormat } from '../lib/format';
import { PlanView, ReviewView } from './ReviewViews';

type Tab = 'plan' | 'review' | 'history';

export function ReviewPage() {
  const { t, date } = useFormat();
  const state = useStore();
  const [params, setParams] = useSearchParams();
  const reportId = params.get('report');
  const report = state.reports.find((r) => r.id === reportId);
  const [tab, setTab] = useState<Tab>(report?.kind ?? 'plan');

  useEffect(() => {
    if (!report) return;
    if (!report.seenAt) void actions.markReportSeen(report.id);
    setTab(report.kind);
  }, [report]);

  const live = useMemo(() => {
    const now = new Date();
    const input = {
      now,
      tasks: state.tasks,
      sessions: state.sessions,
      feedback: state.feedback,
      prefs: state.prefs,
      warnings: state.warnings,
    };
    const planWeek = currentPlanWeek(now, state.prefs.weeklyPlan);
    const lastReview = buildWeeklyReview(addDays(planWeek, -7), input);
    return { plan: buildWeeklyPlan(planWeek, input, lastReview), review: buildWeeklyReview(weekStartOf(now), input) };
  }, [state.tasks, state.sessions, state.feedback, state.prefs, state.warnings]);

  const history = [...state.reports].sort(
    (a, b) => b.weekStart.localeCompare(a.weekStart) || a.kind.localeCompare(b.kind),
  );
  const showSaved = !!report && tab === report.kind;
  const changeTab = (v: Tab) => {
    setTab(v);
    if (reportId) setParams({});
  };

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t('nav.review')}</h1>
      <div className="mb-5">
        <Chips
          label={t('nav.review')}
          value={tab}
          onChange={changeTab}
          options={[
            { value: 'plan', label: t('review.tabPlan') },
            { value: 'review', label: t('review.tabReview') },
            { value: 'history', label: t('review.tabHistory') },
          ]}
        />
      </div>
      {showSaved && (
        <p className="mb-3 text-xs text-slate-500">
          {t('review.snapshot', { date: date(report.generatedAt, 'EEEE d MMMM HH:mm') })}
        </p>
      )}
      {tab === 'plan' && <PlanView data={showSaved ? (report.data as WeeklyPlanData) : live.plan} />}
      {tab === 'review' && <ReviewView data={showSaved ? (report.data as WeeklyReviewData) : live.review} />}
      {tab === 'history' &&
        (history.length === 0 ? (
          <div className="card">
            <Empty icon="review" title={t('review.noHistory')}>
              <p className="text-sm">{t('review.noHistoryHint')}</p>
            </Empty>
          </div>
        ) : (
          <ul className="card divide-y divide-slate-100 p-0 dark:divide-slate-800">
            {history.map((r) => (
              <li key={r.id}>
                <button
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm"
                  onClick={() => setParams({ report: r.id })}
                >
                  <span className="font-medium">{r.kind === 'plan' ? t('review.tabPlan') : t('review.tabReview')}</span>
                  <span className="text-slate-500">
                    {t('review.weekOf', {
                      from: date(r.weekStart, 'd MMM'),
                      to: date(addDays(new Date(r.weekStart), 6), 'd MMM'),
                    })}
                  </span>
                  {!r.seenAt && (
                    <span className="ml-auto rounded-full bg-brand-600 px-2 py-0.5 text-xs text-white">
                      {t('review.new')}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
