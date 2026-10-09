import { addDays } from 'date-fns';
import { useState } from 'react';
import { DurationInput, Field, Modal, toLocalInput } from '../components/ui';
import { actions, useStore } from '../data/store';
import { useFormat } from '../lib/format';

/** Replan a task that was not finished or must be redone. */
export function ReopenDialog({
  taskId,
  onClose,
  fromFeedback,
}: {
  taskId: string;
  onClose: () => void;
  fromFeedback?: boolean;
}) {
  const { t } = useFormat();
  const task = useStore((s) => s.tasks.find((x) => x.id === taskId));
  const deadlinePassed = task ? new Date(task.deadline) <= new Date() : false;
  const [remaining, setRemaining] = useState(Math.max(30, Math.round((task?.plannedEstimateMin ?? 120) / 2 / 5) * 5));
  const [deadline, setDeadline] = useState(
    toLocalInput(deadlinePassed || !task ? addDays(new Date(), 7) : new Date(task.deadline)),
  );
  const [error, setError] = useState('');
  if (!task) return null;

  const save = async () => {
    const dl = new Date(deadline);
    if (Number.isNaN(dl.getTime()) || dl <= new Date()) return setError(t('form.errPast'));
    await actions.reopenTask(task.id, remaining, dl.toISOString());
    onClose();
  };
  const drop = async () => {
    await actions.dropTask(task.id);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t('reopen.title', { title: task.title })}
      footer={
        <>
          {fromFeedback && (
            <button className="btn-ghost" onClick={drop}>
              {t('reopen.drop')}
            </button>
          )}
          <button className="btn-secondary" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="btn-primary" onClick={save}>
            {t('reopen.replan')}
          </button>
        </>
      }
    >
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
        {fromFeedback ? t('reopen.introFeedback') : t('reopen.intro')}
      </p>
      <div className="mb-4">
        <span className="label">{t('reopen.remaining')}</span>
        <DurationInput value={remaining} onChange={setRemaining} />
      </div>
      <Field label={t('reopen.deadline')} hint={deadlinePassed ? t('reopen.deadlineHint') : undefined}>
        <input className="input" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      </Field>
      {error && (
        <p role="alert" className="text-sm font-medium text-rose-600">
          {error}
        </p>
      )}
    </Modal>
  );
}
