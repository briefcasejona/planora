import { useMemo, useState } from 'react';
import { addDays, setHours, setMinutes, startOfDay } from 'date-fns';
import { actions, useStore, type NewTaskInput } from '../data/store';
import { STUDENT_TYPES, TEACHER_TYPES, type Task, type TaskType } from '../domain/types';
import { useFormat } from '../lib/format';
import { Chips, DurationInput, Field, Modal, toLocalInput } from '../components/ui';
import { Icon } from '../components/Icon';

interface StepDraft {
  id?: string;
  title: string;
  estimateMin: number;
  done?: boolean;
}

export function TaskForm({ open, onClose, initialTitle = '', task }: { open: boolean; onClose: () => void; initialTitle?: string; task?: Task }) {
  if (!open) return null;
  return <TaskFormInner onClose={onClose} initialTitle={initialTitle} task={task} />;
}

function TaskFormInner({ onClose, initialTitle, task }: { onClose: () => void; initialTitle: string; task?: Task }) {
  const { t, duration, msg } = useFormat();
  const prefs = useStore((s) => s.prefs);
  const allTasks = useStore((s) => s.tasks);
  const types = prefs.role === 'teacher' ? TEACHER_TYPES : STUDENT_TYPES;
  const defaultDeadline = setMinutes(setHours(startOfDay(addDays(new Date(), 7)), 9), 0);

  const [title, setTitle] = useState(task?.title ?? initialTitle);
  const [type, setType] = useState<TaskType>(task?.type ?? types[0]);
  const [subject, setSubject] = useState(task?.subject ?? '');
  const [deadline, setDeadline] = useState(toLocalInput(task ? new Date(task.deadline) : defaultDeadline));
  const [estimate, setEstimate] = useState(task?.userEstimateMin ?? 120);
  const [difficulty, setDifficulty] = useState<number>(task?.difficulty ?? 3);
  const [notes, setNotes] = useState(task?.notes ?? '');
  const [steps, setSteps] = useState<StepDraft[]>(task?.steps?.map((s) => ({ ...s })) ?? [{ title: '', estimateMin: 120 }]);
  const [useSuggestion, setUseSuggestion] = useState(task ? task.plannedEstimateMin !== task.userEstimateMin : true);
  const [error, setError] = useState('');

  const subjects = useMemo(() => [...new Set(allTasks.map((x) => x.subject).filter(Boolean))] as string[], [allTasks]);
  const isProject = type === 'project';
  const validSteps = steps.filter((s) => s.title.trim() && s.estimateMin > 0);
  const userEstimate = isProject ? validSteps.reduce((a, s) => a + s.estimateMin, 0) : estimate;
  const suggestion = actions.suggest({ type, subject, userEstimateMin: userEstimate || 1 });
  const hasSuggestion = suggestion.basis !== 'none' && Math.abs(suggestion.suggestedMin - userEstimate) >= 5;

  const save = async () => {
    const dl = new Date(deadline);
    if (!title.trim()) return setError(t('form.errTitle'));
    if (isNaN(dl.getTime())) return setError(t('form.errDeadline'));
    if (!task && dl <= new Date()) return setError(t('form.errPast'));
    if (isProject ? validSteps.length === 0 : estimate < 5) return setError(t('form.errEstimate'));
    const unchanged = !!task && userEstimate === task.userEstimateMin && type === task.type && (subject.trim() || undefined) === task.subject;
    // Keep the current plan (e.g. a redo estimate) when the estimate itself was not touched.
    const planned = unchanged ? task.plannedEstimateMin : hasSuggestion && useSuggestion ? suggestion.suggestedMin : userEstimate;
    if (task) {
      await actions.updateTask({
        ...task,
        title: title.trim(),
        type,
        subject: subject.trim() || undefined,
        deadline: dl.toISOString(),
        userEstimateMin: userEstimate,
        plannedEstimateMin: planned,
        difficulty: difficulty as Task['difficulty'],
        notes: notes.trim() || undefined,
        steps: isProject
          ? validSteps.map((s, i) => ({ id: s.id ?? crypto.randomUUID(), title: s.title.trim(), estimateMin: s.estimateMin, order: i, done: !!s.done }))
          : undefined,
      });
    } else {
      const input: NewTaskInput = {
        title,
        type,
        subject,
        deadline: dl.toISOString(),
        userEstimateMin: userEstimate,
        useSuggestion: hasSuggestion && useSuggestion,
        difficulty: difficulty as Task['difficulty'],
        notes: notes.trim() || undefined,
        steps: isProject ? validSteps.map((s) => ({ title: s.title.trim(), estimateMin: s.estimateMin })) : undefined,
      };
      await actions.addTask(input);
    }
    onClose();
  };

  const moveStep = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= steps.length) return;
    const next = [...steps];
    [next[i], next[j]] = [next[j], next[i]];
    setSteps(next);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={task ? t('form.editTitle') : t('form.newTitle')}
      wide={isProject}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn-primary" onClick={save}>{task ? t('common.save') : t('form.addAndPlan')}</button>
        </>
      }
    >
      <Field label={t('form.title')}>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('form.titlePlaceholder')} maxLength={140} />
      </Field>
      <div className="mb-3">
        <span className="label">{t('form.type')}</span>
        <Chips label={t('form.type')} value={type} onChange={setType} options={types.map((x) => ({ value: x, label: t('type.' + x) }))} />
      </div>
      <div className="grid gap-x-3 sm:grid-cols-2">
        <Field label={t('form.subject')}>
          <input className="input" list="planora-subjects" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t('form.subjectPlaceholder')} maxLength={60} />
          <datalist id="planora-subjects">
            {subjects.map((s) => <option key={s} value={s} />)}
          </datalist>
        </Field>
        <Field label={t('form.deadline')}>
          <input className="input" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </Field>
      </div>

      {isProject ? (
        <div className="mb-3">
          <span className="label">{t('form.steps')}</span>
          <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">{t('form.stepsHint')}</p>
          <ol className="space-y-2">
            {steps.map((s, i) => (
              <li key={i} className="rounded-xl border border-slate-200 p-2 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-5 text-center text-sm text-slate-400">{i + 1}</span>
                  <input className="input" value={s.title} placeholder={t('form.stepPlaceholder')} aria-label={t('form.stepTitle', { n: i + 1 })}
                    onChange={(e) => setSteps(steps.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                  <button type="button" className="btn-ghost p-1.5" onClick={() => moveStep(i, -1)} aria-label={t('form.moveUp')}><Icon name="up" className="h-4 w-4" /></button>
                  <button type="button" className="btn-ghost p-1.5" onClick={() => moveStep(i, 1)} aria-label={t('form.moveDown')}><Icon name="down" className="h-4 w-4" /></button>
                  <button type="button" className="btn-ghost p-1.5" onClick={() => setSteps(steps.filter((_, j) => j !== i))} aria-label={t('common.remove')}><Icon name="trash" className="h-4 w-4" /></button>
                </div>
                <div className="mt-2 pl-7">
                  <DurationInput value={s.estimateMin} onChange={(v) => setSteps(steps.map((x, j) => (j === i ? { ...x, estimateMin: v } : x)))} />
                </div>
              </li>
            ))}
          </ol>
          <button type="button" className="btn-secondary mt-2" onClick={() => setSteps([...steps, { title: '', estimateMin: 60 }])}>
            <Icon name="plus" className="h-4 w-4" /> {t('form.addStep')}
          </button>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t('form.stepsTotal', { d: duration(userEstimate) })}</p>
        </div>
      ) : (
        <div className="mb-3">
          <span className="label">{t('form.estimate')}</span>
          <DurationInput value={estimate} onChange={setEstimate} />
        </div>
      )}

      {hasSuggestion && (
        <div className="mb-3 rounded-2xl border border-brand-200 bg-brand-50 p-3 text-sm dark:border-brand-700 dark:bg-brand-700/20">
          <div className="flex items-start gap-2">
            <Icon name="sparkle" className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
            <div>
              <p className="font-medium">{t('form.suggestion', { mine: duration(userEstimate), ours: duration(suggestion.suggestedMin) })}</p>
              <p className="text-slate-600 dark:text-slate-300">{msg(suggestion.explanation)}</p>
              <label className="mt-2 flex items-center gap-2">
                <input type="checkbox" checked={useSuggestion} onChange={(e) => setUseSuggestion(e.target.checked)} />
                {t('form.useSuggestion')}
              </label>
            </div>
          </div>
        </div>
      )}

      <div className="mb-3">
        <span className="label">{t('form.difficulty')}</span>
        <Chips label={t('form.difficulty')} value={difficulty} onChange={setDifficulty}
          options={[1, 2, 3, 4, 5].map((d) => ({ value: d, label: t('difficulty.' + d) }))} />
      </div>
      <Field label={t('form.notes')}>
        <textarea className="input min-h-16" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
      </Field>
      {error && <p role="alert" className="text-sm font-medium text-rose-600">{error}</p>}
    </Modal>
  );
}
