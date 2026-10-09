import { useState } from 'react';
import { Link } from 'react-router-dom';
import { addDays, differenceInCalendarDays, isSameDay, startOfDay } from 'date-fns';
import { actions, useStore } from '../data/store';
import { dedupeBusy, expandBusy } from '../domain/busy';
import { eventKey, guessSubject, testSuggestions } from '../domain/categories';
import { feedbackDue } from '../domain/replan';
import { sessionMinutes } from '../domain/scheduler';
import type { WorkSession } from '../domain/types';
import { saveIntegrations, useIntegrations } from '../integrations/settings';
import { useFormat } from '../lib/format';
import { Banner, CategoryBadge, Empty, Section, TypeBadge } from '../components/ui';
import { Icon } from '../components/Icon';
import { TaskDetail } from './TaskDetail';
import { FeedbackDialog } from './FeedbackDialog';
import { TaskForm, type TaskPrefill } from './TaskForm';

export function TodayPage() {
  const { t, date, time, duration, relativeDay } = useFormat();
  const { tasks, sessions, warnings, reports, busy } = useStore();
  const dismissedTests = useIntegrations((s) => s.dismissedTests);
  const [openTask, setOpenTask] = useState<string | null>(null);
  const [prefill, setPrefill] = useState<TaskPrefill | null>(null);
  const [feedbackFor, setFeedbackFor] = useState<string | null>(null);
  const now = new Date();
  const byId = new Map(tasks.map((x) => [x.id, x]));

  const checkIn = sessions
    .filter((s) => s.status === 'planned' && new Date(s.end) <= now)
    .sort((a, b) => a.start.localeCompare(b.start));
  const today = sessions
    .filter((s) => isSameDay(new Date(s.start), now) && !(s.status === 'planned' && new Date(s.end) <= now))
    .sort((a, b) => a.start.localeCompare(b.start));
  const due = feedbackDue(tasks, now);
  const upcoming = tasks
    .filter((x) => x.status === 'open' && differenceInCalendarDays(new Date(x.deadline), now) <= 7)
    .sort((a, b) => a.deadline.localeCompare(b.deadline));
  const unseen = reports.filter((r) => !r.seenAt).sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
  const todayMin = today.reduce((a, s) => a + sessionMinutes(s), 0);
  const tomorrow = sessions.filter((s) => s.status === 'planned' && isSameDay(new Date(s.start), addDays(now, 1)));

  const agenda = dedupeBusy(expandBusy(busy, startOfDay(now), addDays(startOfDay(now), 1)));
  const tests = testSuggestions(busy, tasks, dismissedTests, now);
  const subjects = [...new Set(tasks.map((x) => x.subject).filter(Boolean))] as string[];

  const hour = now.getHours();
  const greeting = hour < 12 ? t('today.morning') : hour < 18 ? t('today.afternoon') : t('today.evening');

  return (
    <div>
      <header className="mb-5">
        <p className="text-sm text-slate-500 dark:text-slate-400">{date(now, 'EEEE d MMMM')}</p>
        <h1 className="text-2xl font-bold">{greeting}</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {today.length ? t('today.summary', { count: today.length, d: duration(todayMin) }) : t('today.free')}
        </p>
      </header>

      <div className="mb-5 space-y-2">
        {unseen.map((r) => (
          <Banner key={r.id} icon="review" action={<Link className="btn-primary" to={'/review?report=' + encodeURIComponent(r.id)}>{t('common.open')}</Link>}>
            <p className="font-medium">{r.kind === 'plan' ? t('today.planReady') : t('today.reviewReady')}</p>
          </Banner>
        ))}
        {warnings.filter((w) => w.kind !== 'buffer-squeezed').map((w) => (
          <Banner key={w.taskId + w.kind} tone="warn" icon="alert"
            action={<button className="btn-secondary" onClick={() => setOpenTask(w.taskId)}>{t('common.view')}</button>}>
            <span className="font-medium">{byId.get(w.taskId)?.title}: </span>
            {t('warning.' + w.kind, { d: duration(w.unplacedMin ?? 0) })}
          </Banner>
        ))}
      </div>

      {tests.length > 0 && (
        <Section title={t('today.testsFound', { count: tests.length })}>
          <p className="mb-2 text-sm text-slate-600 dark:text-slate-300">{t('today.testsHint')}</p>
          <ul className="space-y-2">
            {tests.slice(0, 5).map((b) => (
              <li key={eventKey(b)} className="card flex flex-wrap items-center gap-3">
                <CategoryBadge category="test" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{b.title ?? t('category.test')}</p>
                  <p className="text-xs text-slate-500">{relativeDay(b.start)} {time(b.start)}</p>
                </div>
                <button className="btn-primary" onClick={() => setPrefill({
                  title: b.title ?? t('category.test'),
                  type: 'test',
                  deadline: b.start,
                  subject: b.title ? guessSubject(b.title, subjects) : undefined,
                  source: b.source === 'ics' ? 'ics' : 'manual',
                  externalId: eventKey(b),
                })}>
                  <Icon name="plus" className="h-4 w-4" />{t('today.addStudyTask')}
                </button>
                <button className="btn-ghost" onClick={() => saveIntegrations({ dismissedTests: [...dismissedTests, eventKey(b)] })}>{t('today.hideTest')}</button>
              </li>
            ))}
          </ul>
          {tests.length > 5 && <p className="mt-2 text-sm text-slate-500">{t('today.moreTests', { count: tests.length - 5 })}</p>}
        </Section>
      )}

      {checkIn.length > 0 && (
        <Section title={t('today.checkIn')}>
          <p className="mb-2 text-sm text-slate-600 dark:text-slate-300">{t('today.checkInHint')}</p>
          <ul className="space-y-2">
            {checkIn.map((s) => (
              <CheckInRow key={s.id} session={s} title={byId.get(s.taskId)?.title ?? '?'} when={relativeDay(s.start) + ' ' + time(s.start)} />
            ))}
          </ul>
        </Section>
      )}

      {due.length > 0 && (
        <Section title={t('today.feedback')}>
          <ul className="space-y-2">
            {due.map((x) => (
              <li key={x.id} className="card flex items-center gap-3">
                <Icon name="sparkle" className="h-5 w-5 text-brand-600" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{x.title}</p>
                  <p className="text-xs text-slate-500">{x.status === 'done' ? t('today.feedbackDone') : t('today.feedbackDeadline')}</p>
                </div>
                <button className="btn-primary" onClick={() => setFeedbackFor(x.id)}>{t('today.giveFeedback')}</button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {agenda.length > 0 && (
        <Section title={t('today.schedule')}>
          <ul className="card divide-y divide-slate-100 p-0 dark:divide-slate-800">
            {agenda.map((x) => {
              const active = x.start <= now && now < x.end;
              return (
                <li key={x.block.id + x.start.getTime()} className={`flex items-center gap-3 px-4 py-2.5 ${x.end <= now ? 'opacity-60' : ''}`}>
                  <div className="w-14 shrink-0 text-center">
                    {x.block.allDay ? (
                      <div className="text-xs text-slate-500">{t('today.allDay')}</div>
                    ) : (
                      <>
                        <div className={`text-sm font-semibold ${active ? 'text-brand-600' : ''}`}>{time(x.start)}</div>
                        <div className="text-xs text-slate-500">{time(x.end)}</div>
                      </>
                    )}
                  </div>
                  <span className="min-w-0 flex-1 truncate font-medium">{x.block.title ?? (x.block.category ? t('category.' + x.block.category) : t('calendar.busy'))}</span>
                  <CategoryBadge category={x.block.category} />
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      <Section title={t('today.sessions')}>
        {today.length === 0 ? (
          <div className="card">
            <Empty icon="today" title={t('today.noSessions')}>
              {tomorrow.length > 0 && <p className="text-sm">{t('today.tomorrow', { count: tomorrow.length })}</p>}
            </Empty>
          </div>
        ) : (
          <ul className="space-y-2">
            {today.map((s) => {
              const task = byId.get(s.taskId);
              const active = new Date(s.start) <= now && now < new Date(s.end);
              return (
                <li key={s.id} className={`card flex items-center gap-3 ${active ? 'ring-2 ring-brand-500' : ''}`}>
                  <div className="w-14 shrink-0 text-center">
                    <div className="text-sm font-semibold">{time(s.start)}</div>
                    <div className="text-xs text-slate-500">{time(s.end)}</div>
                  </div>
                  <button className="min-w-0 flex-1 text-left" onClick={() => task && setOpenTask(task.id)}>
                    <p className="truncate font-medium">{task?.title}</p>
                    <p className="flex items-center gap-2 text-xs text-slate-500">
                      {task && <TypeBadge type={task.type} />}
                      {t('kind.' + s.kind)}
                      {task?.steps && s.stepId && <span>· {task.steps.find((x) => x.id === s.stepId)?.title}</span>}
                    </p>
                  </button>
                  {s.status === 'done' ? (
                    <span className="flex items-center gap-1 text-sm text-emerald-600"><Icon name="check" className="h-4 w-4" />{t('session.done')}</span>
                  ) : (
                    <button className="btn-secondary" onClick={() => actions.setSessionStatus(s.id, 'done', sessionMinutes(s))}>
                      <Icon name="check" className="h-4 w-4" />{t('session.markDone')}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title={t('today.deadlines')}>
        {upcoming.length === 0 ? (
          <p className="text-sm text-slate-500">{t('today.noDeadlines')}</p>
        ) : (
          <ul className="card divide-y divide-slate-100 p-0 dark:divide-slate-800">
            {upcoming.map((x) => (
              <li key={x.id}>
                <button className="flex w-full items-center gap-3 px-4 py-3 text-left" onClick={() => setOpenTask(x.id)}>
                  <TypeBadge type={x.type} />
                  <span className="min-w-0 flex-1 truncate font-medium">{x.title}</span>
                  <span className="text-sm text-slate-500">{relativeDay(x.deadline)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {openTask && <TaskDetail taskId={openTask} onClose={() => setOpenTask(null)} />}
      {prefill && <TaskForm open initial={prefill} onClose={() => setPrefill(null)} />}
      {feedbackFor && <FeedbackDialog taskId={feedbackFor} onClose={() => setFeedbackFor(null)} />}
    </div>
  );
}

function CheckInRow({ session, title, when }: { session: WorkSession; title: string; when: string }) {
  const { t, duration } = useFormat();
  const [actual, setActual] = useState(sessionMinutes(session));
  return (
    <li className="card flex flex-wrap items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{title}</p>
        <p className="text-xs text-slate-500">{when} · {duration(sessionMinutes(session))}</p>
      </div>
      <label className="flex items-center gap-1 text-sm">
        <span className="sr-only">{t('today.actualMinutes')}</span>
        <input type="number" min={0} max={600} step={5} className="input w-20" value={actual} onChange={(e) => setActual(Number(e.target.value) || 0)} />
        <span className="text-slate-500">{t('units.minutes')}</span>
      </label>
      <button className="btn-primary" onClick={() => actions.setSessionStatus(session.id, 'done', actual)}>
        <Icon name="check" className="h-4 w-4" />{t('today.didIt')}
      </button>
      <button className="btn-secondary" onClick={() => actions.setSessionStatus(session.id, 'missed')}>{t('today.didNot')}</button>
    </li>
  );
}
