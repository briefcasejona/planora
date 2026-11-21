import { addDays, addWeeks, format, setHours, setMinutes, startOfDay } from 'date-fns';
import { useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { Chips, DurationInput, Field, Modal, toLocalInput } from '../components/ui';
import { actions, type NewTaskInput, type SeriesScope, useStore } from '../data/store';
import { courseList, findCourse, weeklyDeadlines } from '../domain/courses';
import { locationSuggestions } from '../domain/locations';
import { type StepDraft, toSavedSteps } from '../domain/stepDraft';
import { STUDENT_TYPES, type Task, type TaskType, TEACHER_TYPES } from '../domain/types';
import { useFormat } from '../lib/format';
import { StepsEditor } from './StepsEditor';

/** Values to start a new task with, e.g. a test found in the timetable. */
export type TaskPrefill = Partial<Pick<Task, 'title' | 'type' | 'deadline' | 'subject' | 'source' | 'externalId'>>;

export function TaskForm({
  open,
  onClose,
  initialTitle = '',
  initial,
  task,
}: {
  open: boolean;
  onClose: () => void;
  initialTitle?: string;
  initial?: TaskPrefill;
  task?: Task;
}) {
  if (!open) return null;
  return <TaskFormInner onClose={onClose} initial={{ title: initialTitle, ...initial }} task={task} />;
}

function TaskFormInner({ onClose, initial, task }: { onClose: () => void; initial: TaskPrefill; task?: Task }) {
  const { t, duration, msg } = useFormat();
  const prefs = useStore((s) => s.prefs);
  const allTasks = useStore((s) => s.tasks);
  const types = prefs.role === 'teacher' ? TEACHER_TYPES : STUDENT_TYPES;
  const defaultDeadline = setMinutes(setHours(startOfDay(addDays(new Date(), 7)), 9), 0);

  const [title, setTitle] = useState(task?.title ?? initial.title ?? '');
  const [type, setType] = useState<TaskType>(task?.type ?? initial.type ?? types[0]);
  const [subject, setSubject] = useState(task?.subject ?? initial.subject ?? '');
  const [deadline, setDeadline] = useState(
    toLocalInput(new Date(task?.deadline ?? initial.deadline ?? defaultDeadline)),
  );
  const [estimate, setEstimate] = useState(task?.userEstimateMin ?? 120);
  const [difficulty, setDifficulty] = useState<number>(task?.difficulty ?? 3);
  const [notes, setNotes] = useState(task?.notes ?? '');
  const [location, setLocation] = useState(task?.location ?? '');
  const [showLocation, setShowLocation] = useState(!!task?.location);
  const [steps, setSteps] = useState<StepDraft[]>(
    task?.steps?.map((s) => ({ ...s })) ?? [{ title: '', estimateMin: 120 }],
  );
  const [useSuggestion, setUseSuggestion] = useState(task ? task.plannedEstimateMin !== task.userEstimateMin : true);
  const [error, setError] = useState('');
  const [repeat, setRepeat] = useState(false);
  const [repeatUntil, setRepeatUntil] = useState('');
  const [scope, setScope] = useState<SeriesScope>('one');

  const subjects = useMemo(() => courseList(prefs.courses, allTasks).map((c) => c.name), [prefs.courses, allTasks]);
  const locations = useMemo(() => locationSuggestions(allTasks, new Date()), [allTasks]);
  const isProject = type === 'project';
  const canRepeat = !task && !isProject;
  // Until the user picks an end: the end of the course's term, otherwise ten weeks.
  const until =
    repeatUntil ||
    findCourse(prefs.courses, subject)?.termEnd ||
    format(addWeeks(new Date(deadline || Date.now()), 9), 'yyyy-MM-dd');
  const weeks = repeat && canRepeat && deadline ? weeklyDeadlines(new Date(deadline), until).length : 0;
  const validSteps = steps.filter((s) => s.title.trim() && s.estimateMin > 0);
  const userEstimate = isProject ? validSteps.reduce((a, s) => a + s.estimateMin, 0) : estimate;
  const suggestion = actions.suggest({ type, subject, userEstimateMin: userEstimate || 1 });
  const hasSuggestion = suggestion.basis !== 'none' && Math.abs(suggestion.suggestedMin - userEstimate) >= 5;

  const save = async () => {
    const dl = new Date(deadline);
    if (!title.trim()) return setError(t('form.errTitle'));
    if (Number.isNaN(dl.getTime())) return setError(t('form.errDeadline'));
    if (!task && dl <= new Date()) return setError(t('form.errPast'));
    if (isProject ? validSteps.length === 0 : estimate < 5) return setError(t('form.errEstimate'));
    const unchanged =
      !!task &&
      userEstimate === task.userEstimateMin &&
      type === task.type &&
      (subject.trim() || undefined) === task.subject;
    // Keep the current plan (e.g. a redo estimate) when the estimate itself was not touched.
    const planned = unchanged
      ? task.plannedEstimateMin
      : hasSuggestion && useSuggestion
        ? suggestion.suggestedMin
        : userEstimate;
    const savedSteps = isProject ? toSavedSteps(validSteps, () => crypto.randomUUID()) : undefined;
    if (task) {
      await actions.updateTask(
        {
          ...task,
          title: title.trim(),
          type,
          subject: subject.trim() || undefined,
          deadline: dl.toISOString(),
          userEstimateMin: userEstimate,
          plannedEstimateMin: planned,
          difficulty: difficulty as Task['difficulty'],
          notes: notes.trim() || undefined,
          location: location.trim() || undefined,
          steps: savedSteps,
        },
        scope,
      );
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
        location: location.trim() || undefined,
        steps: savedSteps,
        source: initial.source,
        externalId: initial.externalId,
        repeatUntil: weeks > 1 ? until : undefined,
      };
      await actions.addTask(input);
    }
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={task ? t('form.editTitle') : t('form.newTitle')}
      wide={isProject}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="btn-primary" onClick={save}>
            {task ? t('common.save') : t('form.addAndPlan')}
          </button>
        </>
      }
    >
      <Field label={t('form.title')}>
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('form.titlePlaceholder')}
          maxLength={140}
        />
      </Field>
      <div className="mb-3">
        <span className="label">{t('form.type')}</span>
        <Chips
          label={t('form.type')}
          value={type}
          onChange={setType}
          options={types.map((x) => ({ value: x, label: t('type.' + x) }))}
        />
      </div>
      <div className="grid gap-x-3 sm:grid-cols-2">
        <Field label={t('form.subject')}>
          <input
            className="input"
            list="planora-subjects"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t('form.subjectPlaceholder')}
            maxLength={60}
          />
          <datalist id="planora-subjects">
            {subjects.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </Field>
        <Field label={t('form.deadline')}>
          <input
            className="input"
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </Field>
      </div>
      {canRepeat && (
        <div className="mb-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} />
            {t('form.repeat')}
          </label>
          {repeat && (
            <div className="mt-2 flex flex-wrap items-center gap-2 pl-6 text-sm">
              <label htmlFor="planora-repeat-until">{t('form.repeatUntil')}</label>
              <input
                id="planora-repeat-until"
                className="input w-auto"
                type="date"
                value={until}
                onChange={(e) => setRepeatUntil(e.target.value)}
              />
              <span className="text-slate-500">{t('form.repeatCount', { count: weeks })}</span>
            </div>
          )}
        </div>
      )}
      {task?.seriesId && (
        <div className="mb-3">
          <span className="label">{t('form.applyTo')}</span>
          <Chips
            label={t('form.applyTo')}
            value={scope}
            onChange={setScope}
            options={[
              { value: 'one', label: t('form.applyOne') },
              { value: 'later', label: t('form.applyLater') },
            ]}
          />
        </div>
      )}

      {isProject ? (
        <StepsEditor steps={steps} onChange={setSteps} deadline={new Date(deadline)} total={userEstimate} />
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
              <p className="font-medium">
                {t('form.suggestion', { mine: duration(userEstimate), ours: duration(suggestion.suggestedMin) })}
              </p>
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
        <Chips
          label={t('form.difficulty')}
          value={difficulty}
          onChange={setDifficulty}
          options={[1, 2, 3, 4, 5].map((d) => ({ value: d, label: t('difficulty.' + d) }))}
        />
      </div>
      {showLocation ? (
        <Field label={t('form.location')}>
          <input
            className="input"
            list="planora-locations"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={t('form.locationPlaceholder')}
            maxLength={60}
          />
          <datalist id="planora-locations">
            {locations.map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>
        </Field>
      ) : (
        <button type="button" className="btn-ghost mb-3 px-0 text-sm" onClick={() => setShowLocation(true)}>
          <Icon name="plus" className="h-4 w-4" /> {t('form.addLocation')}
        </button>
      )}
      <Field label={t('form.notes')}>
        <textarea
          className="input min-h-16"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={1000}
        />
      </Field>
      {error && (
        <p role="alert" className="text-sm font-medium text-rose-600">
          {error}
        </p>
      )}
    </Modal>
  );
}
