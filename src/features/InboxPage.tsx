import { lazy, Suspense, useState, type FormEvent } from 'react';
import { differenceInCalendarDays } from 'date-fns';
import { useStore } from '../data/store';
import { workedMinutes } from '../domain/scheduler';
import type { Task } from '../domain/types';
import { useFormat } from '../lib/format';
import { Chips, Empty, Progress, Section, TypeBadge } from '../components/ui';
import { Icon } from '../components/Icon';
import { TaskForm } from './TaskForm';
import { TaskDetail } from './TaskDetail';
import { useIntegrations } from '../integrations/settings';

const ImportPanel = lazy(() => import('../integrations/ImportPanel').then((m) => ({ default: m.ImportPanel })));

type Filter = 'open' | 'done' | 'all';

export function InboxPage() {
  const { t } = useFormat();
  const tasks = useStore((s) => s.tasks);
  const [quick, setQuick] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [openTask, setOpenTask] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('open');
  const showImport = useIntegrations((s) => s.microsoft.connected && (s.microsoft.importTodo || s.microsoft.importTeams));
  const now = new Date();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setFormOpen(true);
  };

  const visible = tasks
    .filter((x) => (filter === 'all' ? true : filter === 'open' ? x.status === 'open' || x.status === 'overdue' : x.status === 'done' || x.status === 'dropped'))
    .sort((a, b) => a.deadline.localeCompare(b.deadline));
  const groups: { key: string; items: Task[] }[] = [
    { key: 'overdue', items: visible.filter((x) => x.status === 'overdue') },
    { key: 'thisWeek', items: visible.filter((x) => x.status === 'open' && differenceInCalendarDays(new Date(x.deadline), now) < 7) },
    { key: 'later', items: visible.filter((x) => x.status === 'open' && differenceInCalendarDays(new Date(x.deadline), now) >= 7) },
    { key: 'finished', items: visible.filter((x) => x.status === 'done' || x.status === 'dropped') },
  ];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t('nav.inbox')}</h1>
      <form onSubmit={submit} className="card mb-4 flex gap-2">
        <label className="sr-only" htmlFor="quick-add">{t('inbox.quickAdd')}</label>
        <input id="quick-add" className="input" value={quick} onChange={(e) => setQuick(e.target.value)} placeholder={t('inbox.quickAddPlaceholder')} />
        <button className="btn-primary shrink-0" type="submit"><Icon name="plus" className="h-4 w-4" />{t('inbox.add')}</button>
      </form>

      {showImport && (
        <Suspense fallback={null}>
          <ImportPanel />
        </Suspense>
      )}

      <div className="mb-4">
        <Chips label={t('inbox.filter')} value={filter} onChange={setFilter}
          options={[{ value: 'open', label: t('inbox.filterOpen') }, { value: 'done', label: t('inbox.filterDone') }, { value: 'all', label: t('inbox.filterAll') }]} />
      </div>

      {visible.length === 0 ? (
        <div className="card">
          <Empty icon="inbox" title={t('inbox.empty')}>
            <p className="max-w-sm text-sm">{t('inbox.emptyHint')}</p>
          </Empty>
        </div>
      ) : (
        groups.filter((g) => g.items.length).map((g) => (
          <Section key={g.key} title={t('inbox.group.' + g.key)}>
            <ul className="space-y-2">
              {g.items.map((x) => <TaskRow key={x.id} task={x} onOpen={() => setOpenTask(x.id)} />)}
            </ul>
          </Section>
        ))
      )}

      <TaskForm open={formOpen} initialTitle={quick} onClose={() => { setFormOpen(false); setQuick(''); }} />
      {openTask && <TaskDetail taskId={openTask} onClose={() => setOpenTask(null)} />}
    </div>
  );
}

function TaskRow({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const { t, relativeDay, duration, date } = useFormat();
  const sessions = useStore((s) => s.sessions);
  const warned = useStore((s) => s.warnings.some((w) => w.taskId === task.id && w.kind === 'infeasible'));
  const mine = sessions.filter((s) => s.taskId === task.id);
  const done = mine.filter((s) => s.status === 'done').reduce((a, s) => a + workedMinutes(s), 0);
  const upcoming = mine.filter((s) => s.status === 'planned' && new Date(s.start) > new Date()).length;
  return (
    <li>
      <button className="card flex w-full flex-col gap-2 text-left transition hover:border-brand-300" onClick={onOpen}>
        <div className="flex w-full items-center gap-2">
          <TypeBadge type={task.type} />
          <span className="min-w-0 flex-1 truncate font-medium">{task.title}</span>
          {warned && <Icon name="alert" className="h-4 w-4 text-amber-500" />}
          <span className="text-sm text-slate-500" title={date(task.deadline, 'PPPp')}>{relativeDay(task.deadline)}</span>
        </div>
        <div className="flex w-full items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          {task.subject && <span>{task.subject}</span>}
          <span>{duration(done)} / {duration(task.plannedEstimateMin)}</span>
          {task.status === 'open' && <span>{t('inbox.upcomingSessions', { count: upcoming })}</span>}
          {task.steps && <span>{t('inbox.stepsDone', { done: task.steps.filter((s) => s.done).length, total: task.steps.length })}</span>}
        </div>
        <Progress value={done / Math.max(1, task.plannedEstimateMin)} label={t('detail.progress')} />
      </button>
    </li>
  );
}
