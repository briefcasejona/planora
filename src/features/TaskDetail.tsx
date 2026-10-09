import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Banner, Modal, Progress, TypeBadge } from '../components/ui';
import { actions, useStore } from '../data/store';
import { remainingMinutes, sessionMinutes, stepScale, workedMinutes } from '../domain/scheduler';
import { useFormat } from '../lib/format';
import { FeedbackDialog } from './FeedbackDialog';
import { ReopenDialog } from './ReopenDialog';
import { TaskForm } from './TaskForm';

type Mode = 'view' | 'edit' | 'reopen' | 'feedback' | 'confirmDelete';

export function TaskDetail({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const { t, date, time, duration, relativeDay } = useFormat();
  const navigate = useNavigate();
  const task = useStore((s) => s.tasks.find((x) => x.id === taskId));
  const allSessions = useStore((s) => s.sessions);
  const allWarnings = useStore((s) => s.warnings);
  const [mode, setMode] = useState<Mode>('view');
  if (!task) return null;
  if (mode === 'edit') return <TaskForm open task={task} onClose={() => setMode('view')} />;
  if (mode === 'reopen') return <ReopenDialog taskId={task.id} onClose={() => setMode('view')} />;
  if (mode === 'feedback') return <FeedbackDialog taskId={task.id} onClose={onClose} />;

  const warnings = allWarnings.filter((w) => w.taskId === taskId);
  const sessions = allSessions.filter((s) => s.taskId === task.id).sort((a, b) => a.start.localeCompare(b.start));
  const done = sessions.filter((s) => s.status === 'done').reduce((a, s) => a + workedMinutes(s), 0);
  const planned = sessions.filter((s) => s.status === 'planned').reduce((a, s) => a + sessionMinutes(s), 0);
  const open = task.status === 'open';
  const unplanned = open ? remainingMinutes(task, sessions) : 0;

  const toggleStep = (stepId: string) =>
    actions.updateTask({ ...task, steps: task.steps?.map((s) => (s.id === stepId ? { ...s, done: !s.done } : s)) });
  const complete = async () => {
    await actions.completeTask(task.id);
    setMode('feedback');
  };
  const remove = async () => {
    await actions.deleteTask(task.id);
    onClose();
  };

  const footer =
    mode === 'confirmDelete' ? (
      <>
        <span className="mr-auto self-center text-sm">{t('detail.confirmDelete')}</span>
        <button className="btn-secondary" onClick={() => setMode('view')}>
          {t('common.cancel')}
        </button>
        <button className="btn-danger" onClick={remove}>
          {t('common.delete')}
        </button>
      </>
    ) : (
      <>
        <button className="btn-ghost mr-auto text-rose-600" onClick={() => setMode('confirmDelete')}>
          <Icon name="trash" className="h-4 w-4" />
          {t('common.delete')}
        </button>
        {open && planned > 0 && (
          <button
            className="btn-secondary"
            onClick={() => void import('../integrations/calendarFiles').then((m) => m.exportTask(task.id))}
            title={t('detail.addToCalendarHint')}
          >
            <Icon name="calendar" className="h-4 w-4" />
            {t('detail.addToCalendar')}
          </button>
        )}
        <button className="btn-secondary" onClick={() => setMode('edit')}>
          {t('common.edit')}
        </button>
        {open ? (
          <button className="btn-primary" onClick={complete}>
            <Icon name="check" className="h-4 w-4" />
            {t('detail.complete')}
          </button>
        ) : (
          <button className="btn-primary" onClick={() => setMode('reopen')}>
            <Icon name="refresh" className="h-4 w-4" />
            {t('detail.redo')}
          </button>
        )}
      </>
    );

  const statusLabel = {
    planned: t('session.planned'),
    done: t('session.done'),
    missed: t('session.missed'),
    skipped: t('session.skipped'),
  };

  return (
    <Modal open onClose={onClose} title={task.title} wide footer={footer}>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <TypeBadge type={task.type} />
        {task.subject && <span className="font-medium">{task.subject}</span>}
        <span>
          · {t('detail.deadline')}: {date(task.deadline, 'EEEE d MMMM HH:mm')} ({relativeDay(task.deadline)})
        </span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">
          {t('status.' + task.status)}
        </span>
      </div>

      {warnings.map((w) => (
        <div className="mb-3" key={w.kind}>
          <Banner
            tone="warn"
            icon="alert"
            action={
              w.kind === 'infeasible' ? (
                <button
                  className="btn-secondary"
                  onClick={() => {
                    onClose();
                    navigate('/settings');
                  }}
                >
                  {t('warning.adjustAvailability')}
                </button>
              ) : undefined
            }
          >
            {t('warning.' + w.kind, { d: duration(w.unplacedMin ?? 0) })}
          </Banner>
        </div>
      ))}

      <div className="mb-4 grid grid-cols-3 gap-2 text-center">
        <Stat
          label={t('detail.estimate')}
          value={duration(task.plannedEstimateMin)}
          sub={
            task.plannedEstimateMin !== task.userEstimateMin
              ? t('detail.yourEstimate', { d: duration(task.userEstimateMin) })
              : undefined
          }
        />
        <Stat label={t('detail.worked')} value={duration(done)} />
        <Stat
          label={t('detail.planned')}
          value={duration(planned)}
          sub={unplanned > 0 ? t('detail.unplanned', { d: duration(unplanned) }) : undefined}
        />
      </div>
      <Progress value={done / Math.max(1, task.plannedEstimateMin)} label={t('detail.progress')} />

      {task.steps && task.steps.length > 0 && (
        <div className="mt-5">
          <h3 className="mb-2 text-sm font-semibold">{t('detail.steps')}</h3>
          <ul className="space-y-1.5">
            {[...task.steps]
              .sort((a, b) => a.order - b.order)
              .map((s) => (
                <li key={s.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={s.done} onChange={() => toggleStep(s.id)} aria-label={s.title} />
                  <span className={s.done ? 'text-slate-400 line-through' : ''}>{s.title}</span>
                  <span className="ml-auto text-slate-500">
                    {duration(Math.round(s.estimateMin * stepScale(task)))}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      )}

      <div className="mt-5">
        <h3 className="mb-2 text-sm font-semibold">{t('detail.sessions', { n: sessions.length })}</h3>
        {sessions.length === 0 ? (
          <p className="text-sm text-slate-500">{t('detail.noSessions')}</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {sessions.map((s) => (
              <li key={s.id} className="flex items-center gap-2 py-1.5">
                <span className="w-28 shrink-0">{date(s.start, 'EEE d MMM')}</span>
                <span className="text-slate-500">
                  {time(s.start)} - {time(s.end)}
                </span>
                {s.locked && <Icon name="pin" className="h-4 w-4 text-slate-400" />}
                <span className="ml-auto text-xs text-slate-500">{statusLabel[s.status]}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {task.notes && (
        <p className="mt-4 text-sm whitespace-pre-wrap text-slate-600 dark:text-slate-300">{task.notes}</p>
      )}
      {task.status !== 'open' && !task.feedbackGiven && (
        <button className="btn-secondary mt-4" onClick={() => setMode('feedback')}>
          {t('detail.giveFeedback')}
        </button>
      )}
    </Modal>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60">
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
      {sub && <div className="text-xs text-slate-500 dark:text-slate-400">{sub}</div>}
    </div>
  );
}
