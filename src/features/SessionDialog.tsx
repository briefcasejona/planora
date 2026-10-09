import { useState } from 'react';
import { Icon } from '../components/Icon';
import { Modal } from '../components/ui';
import { actions, useStore } from '../data/store';
import { sessionMinutes } from '../domain/scheduler';
import { useFormat } from '../lib/format';

export function SessionDialog({
  sessionId,
  onClose,
  onOpenTask,
}: {
  sessionId: string;
  onClose: () => void;
  onOpenTask: (taskId: string) => void;
}) {
  const { t, date, time, duration } = useFormat();
  const session = useStore((s) => s.sessions.find((x) => x.id === sessionId));
  const task = useStore((s) => s.tasks.find((x) => x.id === session?.taskId));
  const [actual, setActual] = useState(session ? sessionMinutes(session) : 0);
  if (!session || !task) return null;
  const step = task.steps?.find((x) => x.id === session.stepId);
  const started = new Date(session.start) <= new Date();

  const act = async (fn: () => Promise<void>) => {
    await fn();
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={task.title}
      footer={
        <>
          <button
            className="btn-ghost mr-auto"
            onClick={() => {
              onClose();
              onOpenTask(task.id);
            }}
          >
            {t('session.openTask')}
          </button>
          {session.status !== 'planned' && (
            <button
              className="btn-secondary"
              onClick={() => act(() => actions.setSessionStatus(session.id, 'planned'))}
            >
              {t('session.reset')}
            </button>
          )}
          {session.status === 'planned' && started && (
            <button className="btn-secondary" onClick={() => act(() => actions.setSessionStatus(session.id, 'missed'))}>
              {t('today.didNot')}
            </button>
          )}
          {session.status === 'planned' && (
            <button
              className="btn-primary"
              onClick={() => act(() => actions.setSessionStatus(session.id, 'done', actual))}
            >
              <Icon name="check" className="h-4 w-4" />
              {t('session.markDone')}
            </button>
          )}
        </>
      }
    >
      <p className="text-sm text-slate-600 dark:text-slate-300">
        {date(session.start, 'EEEE d MMMM')} · {time(session.start)} - {time(session.end)} (
        {duration(sessionMinutes(session))})
      </p>
      <p className="mt-1 text-sm">
        {t('kind.' + session.kind)}
        {step ? ' · ' + step.title : ''} · {t('session.' + session.status)}
      </p>
      {session.status === 'planned' && (
        <label className="mt-4 flex items-center gap-2 text-sm">
          {t('today.actualMinutes')}
          <input
            type="number"
            min={0}
            max={600}
            step={5}
            className="input w-24"
            value={actual}
            onChange={(e) => setActual(Number(e.target.value) || 0)}
          />
        </label>
      )}
      {session.locked ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
          <Icon name="pin" className="h-4 w-4" />
          <span className="flex-1">{t('session.lockedHint')}</span>
          <button className="btn-secondary" onClick={() => act(() => actions.unlockSession(session.id))}>
            {t('session.unlock')}
          </button>
        </div>
      ) : (
        session.status === 'planned' && <p className="mt-4 text-xs text-slate-500">{t('session.dragHint')}</p>
      )}
    </Modal>
  );
}
