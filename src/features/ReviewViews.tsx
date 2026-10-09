import { addDays } from 'date-fns';
import type { ReactNode } from 'react';
import { Icon } from '../components/Icon';
import { Section, TypeBadge } from '../components/ui';
import type { WeeklyPlanData, WeeklyReviewData } from '../domain/insights';
import { useFormat } from '../lib/format';

export function PlanView({ data }: { data: WeeklyPlanData }) {
  const { t, date, time, duration, msg } = useFormat();
  const start = new Date(data.weekStart);
  return (
    <div>
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
        {t('review.weekOf', { from: date(start, 'd MMM'), to: date(addDays(start, 6), 'd MMM') })} ·{' '}
        {t('review.totalPlanned', { d: duration(data.totalMin) })}
      </p>
      <Section title={t('review.focus')}>
        <ul className="space-y-2">
          {data.focus.map((f, i) => (
            <li
              key={i}
              className="card flex items-start gap-3 border-brand-200 bg-brand-50 dark:border-brand-700 dark:bg-brand-700/20"
            >
              <Icon name="sparkle" className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
              <span className="text-sm">{msg(f)}</span>
            </li>
          ))}
        </ul>
      </Section>
      {data.deadlines.length > 0 && (
        <Section title={t('review.deadlines')}>
          <ul className="card divide-y divide-slate-100 p-0 dark:divide-slate-800">
            {data.deadlines.map((d) => (
              <li key={d.taskId} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <TypeBadge type={d.type} />
                <span className="min-w-0 flex-1 truncate font-medium">{d.title}</span>
                <span className="text-slate-500">{date(d.deadline, 'EEE d MMM HH:mm')}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
      <Section title={t('review.perDay')}>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {data.days.map((d) => (
            <div key={d.date} className={`card ${d.heavy ? 'border-amber-300 dark:border-amber-700' : ''}`}>
              <div className="mb-2 flex items-baseline justify-between">
                <span className="font-semibold capitalize">{date(d.date, 'EEEE d')}</span>
                <span className="text-xs text-slate-500">{duration(d.totalMin)}</span>
              </div>
              {d.sessions.length === 0 ? (
                <p className="text-xs text-slate-400">{t('review.free')}</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {d.sessions.map((s) => (
                    <li key={s.sessionId} className="flex gap-2">
                      <span className="w-11 shrink-0 text-slate-500">{time(s.start)}</span>
                      <span className="min-w-0 truncate">{s.title}</span>
                    </li>
                  ))}
                </ul>
              )}
              {d.heavy && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{t('review.heavy')}</p>}
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="card text-center">
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function List({
  items,
  empty,
  tone,
}: {
  items: { key: string; title: string; sub: string }[];
  empty: string;
  tone: 'good' | 'bad';
}) {
  if (!items.length) return <p className="text-sm text-slate-500">{empty}</p>;
  return (
    <ul className="card divide-y divide-slate-100 p-0 dark:divide-slate-800">
      {items.map((x) => (
        <li key={x.key} className="flex items-start gap-2 px-4 py-2.5 text-sm">
          <Icon
            name={tone === 'good' ? 'check' : 'alert'}
            className={`mt-0.5 h-4 w-4 shrink-0 ${tone === 'good' ? 'text-emerald-600' : 'text-amber-600'}`}
          />
          <div>
            <p className="font-medium">{x.title}</p>
            <p className="text-slate-500 dark:text-slate-400">{x.sub}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ReviewView({ data }: { data: WeeklyReviewData }) {
  const { t, date, duration, msg, label } = useFormat();
  const start = new Date(data.weekStart);
  const maxDaypart = Math.max(1, ...Object.values(data.missedByDaypart));
  const accuracyText = (ratio: number) =>
    ratio > 1.05
      ? t('review.needsMore', { pct: Math.round((ratio - 1) * 100) })
      : ratio < 0.95
        ? t('review.needsLess', { pct: Math.round((1 - ratio) * 100) })
        : t('review.spotOn');
  return (
    <div>
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
        {t('review.weekOf', { from: date(start, 'd MMM'), to: date(addDays(start, 6), 'd MMM') })}
      </p>
      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile
          label={t('review.completion')}
          value={data.sessionsDone + data.sessionsMissed ? Math.round(data.completionRate * 100) + '%' : '–'}
        />
        <Tile label={t('review.sessionsDone')} value={data.sessionsDone} />
        <Tile label={t('review.sessionsMissed')} value={data.sessionsMissed} />
        <Tile label={t('review.timeWorked')} value={duration(data.minutesDone)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Section title={t('review.wentWell')}>
          <List
            items={data.wentWell.map((x) => ({ key: x.taskId, title: x.title, sub: msg(x.reason) }))}
            empty={t('review.nothingYet')}
            tone="good"
          />
          {data.tasksCompleted.length > 0 && (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {t('review.completedTasks', { list: data.tasksCompleted.map((x) => x.title).join(', ') })}
            </p>
          )}
        </Section>
        <Section title={t('review.struggled')}>
          <List
            items={[
              ...data.struggled.map((x) => ({ key: x.taskId, title: x.title, sub: msg(x.reason) })),
              ...data.missedDeadlines.map((x) => ({
                key: 'd' + x.taskId,
                title: x.title,
                sub: t('review.missedDeadline'),
              })),
            ]}
            empty={t('review.nothingStruggled')}
            tone="bad"
          />
        </Section>
      </div>
      <Section title={t('review.improve')}>
        <ul className="space-y-2">
          {data.improvements.map((m, i) => (
            <li key={i} className="card flex items-start gap-3">
              <Icon name="sparkle" className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
              <span className="text-sm">{msg(m)}</span>
            </li>
          ))}
        </ul>
      </Section>
      <div className="grid gap-4 sm:grid-cols-2">
        <Section title={t('review.accuracy')}>
          {data.accuracy.length === 0 ? (
            <p className="text-sm text-slate-500">{t('review.noAccuracy')}</p>
          ) : (
            <ul className="card space-y-2 text-sm">
              {data.accuracy.slice(0, 6).map((a) => (
                <li key={a.label} className="flex items-center gap-2">
                  <span className="w-28 truncate">{label(a.label)}</span>
                  <span className="flex-1 text-slate-600 dark:text-slate-300">{accuracyText(a.ratio)}</span>
                  <span className="text-xs text-slate-400">n={a.n}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title={t('review.missedWhen')}>
          <ul className="card space-y-2 text-sm">
            {(['morning', 'afternoon', 'evening'] as const).map((d) => (
              <li key={d} className="flex items-center gap-2">
                <span className="w-24">{t('daypart.' + d)}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <span
                    className="block h-full rounded-full bg-amber-500"
                    style={{ width: (data.missedByDaypart[d] / maxDaypart) * 100 + '%' }}
                  />
                </span>
                <span className="w-6 text-right">{data.missedByDaypart[d]}</span>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </div>
  );
}
