import { useState } from 'react';
import { actions, useStore } from '../data/store';
import { doneMinutesFor } from '../domain/replan';
import type { FeedbackRecord } from '../domain/types';
import { useFormat } from '../lib/format';
import { Chips, DurationInput, Field, Modal } from '../components/ui';
import { ReopenDialog } from './ReopenDialog';

export function FeedbackDialog({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const { t, duration } = useFormat();
  const task = useStore((s) => s.tasks.find((x) => x.id === taskId));
  const sessions = useStore((s) => s.sessions);
  const worked = task ? doneMinutesFor(task.id, sessions) : 0;
  const [completed, setCompleted] = useState(task?.status === 'done');
  const [actualMin, setActualMin] = useState(worked || task?.plannedEstimateMin || 60);
  const [enoughTime, setEnoughTime] = useState<FeedbackRecord['enoughTime']>('right');
  const [sessionsNeeded, setSessionsNeeded] = useState<FeedbackRecord['sessionsNeeded']>('same');
  const [difficulty, setDifficulty] = useState<number>(task?.difficulty ?? 3);
  const [spacing, setSpacing] = useState<FeedbackRecord['spacing']>('spread');
  const [grade, setGrade] = useState('');
  const [followUp, setFollowUp] = useState(false);

  if (!task) return null;
  if (followUp) return <ReopenDialog taskId={task.id} onClose={onClose} fromFeedback />;

  const submit = async () => {
    await actions.submitFeedback({
      taskId: task.id,
      completed,
      actualMin,
      enoughTime,
      sessionsNeeded,
      difficulty: difficulty as FeedbackRecord['difficulty'],
      spacing,
      grade,
    });
    if (!completed) setFollowUp(true);
    else onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t('feedback.title', { title: task.title })}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>{t('feedback.later')}</button>
          <button className="btn-primary" onClick={submit}>{t('feedback.submit')}</button>
        </>
      }
    >
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">{t('feedback.intro')}</p>
      {task.status !== 'done' && (
        <div className="mb-4">
          <span className="label">{t('feedback.completed')}</span>
          <Chips label={t('feedback.completed')} value={completed ? 'yes' : 'no'} onChange={(v) => setCompleted(v === 'yes')}
            options={[{ value: 'yes', label: t('common.yes') }, { value: 'no', label: t('feedback.notYet') }]} />
        </div>
      )}
      <div className="mb-4">
        <span className="label">{t('feedback.actual')}</span>
        <DurationInput value={actualMin} onChange={setActualMin} />
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {t('feedback.actualHint', { planned: duration(task.plannedEstimateMin), logged: duration(worked) })}
        </p>
      </div>
      <div className="mb-4">
        <span className="label">{t('feedback.enough')}</span>
        <Chips label={t('feedback.enough')} value={enoughTime} onChange={setEnoughTime}
          options={(['too-little', 'right', 'too-much'] as const).map((v) => ({ value: v, label: t('feedback.enough_' + v) }))} />
      </div>
      <div className="mb-4">
        <span className="label">{t('feedback.sessions')}</span>
        <Chips label={t('feedback.sessions')} value={sessionsNeeded} onChange={setSessionsNeeded}
          options={(['fewer', 'same', 'more'] as const).map((v) => ({ value: v, label: t('feedback.sessions_' + v) }))} />
      </div>
      <div className="mb-4">
        <span className="label">{t('feedback.difficulty')}</span>
        <Chips label={t('feedback.difficulty')} value={difficulty} onChange={setDifficulty}
          options={[1, 2, 3, 4, 5].map((d) => ({ value: d, label: t('difficulty.' + d) }))} />
      </div>
      <div className="mb-4">
        <span className="label">{t('feedback.spacing')}</span>
        <Chips label={t('feedback.spacing')} value={spacing} onChange={setSpacing}
          options={(['spread', 'mixed', 'crammed'] as const).map((v) => ({ value: v, label: t('feedback.spacing_' + v) }))} />
      </div>
      {(task.type === 'test' || task.type === 'assignment' || task.type === 'project') && (
        <Field label={t('feedback.grade')} hint={t('feedback.gradeHint')}>
          <input className="input" value={grade} onChange={(e) => setGrade(e.target.value)} maxLength={20} />
        </Field>
      )}
    </Modal>
  );
}
