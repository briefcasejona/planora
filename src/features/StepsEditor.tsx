import { Icon } from '../components/Icon';
import { DurationInput } from '../components/ui';
import { draftStepIssues, dueFromDateInput, dueToDateInput, STEP_WHO_MAX, type StepDraft } from '../domain/stepDue';
import { useFormat } from '../lib/format';

export type { StepDraft };

/** The step list of a project: title, estimate, optional due date and "who", with date hints underneath. */
export function StepsEditor({
  steps,
  onChange,
  deadline,
  total,
}: {
  steps: StepDraft[];
  onChange: (steps: StepDraft[]) => void;
  deadline: Date;
  total: number;
}) {
  const { t, duration } = useFormat();
  const issues = draftStepIssues(steps, deadline, new Date());
  const patch = (i: number, change: Partial<StepDraft>) =>
    onChange(steps.map((x, j) => (j === i ? { ...x, ...change } : x)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= steps.length) return;
    const next = [...steps];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="mb-3">
      <span className="label">{t('form.steps')}</span>
      <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">{t('form.stepsHint')}</p>
      <ol className="space-y-2">
        {steps.map((s, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: drafts have no id yet; the inputs are controlled
          <li key={i} className="rounded-xl border border-slate-200 p-2 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-5 text-center text-sm text-slate-400">{i + 1}</span>
              <input
                className="input"
                value={s.title}
                placeholder={t('form.stepPlaceholder')}
                aria-label={t('form.stepTitle', { n: i + 1 })}
                onChange={(e) => patch(i, { title: e.target.value })}
              />
              <button
                type="button"
                className="btn-ghost p-1.5"
                onClick={() => move(i, -1)}
                aria-label={t('form.moveUp')}
              >
                <Icon name="up" className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="btn-ghost p-1.5"
                onClick={() => move(i, 1)}
                aria-label={t('form.moveDown')}
              >
                <Icon name="down" className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="btn-ghost p-1.5"
                onClick={() => onChange(steps.filter((_, j) => j !== i))}
                aria-label={t('common.remove')}
              >
                <Icon name="trash" className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 pl-7">
              <DurationInput value={s.estimateMin} onChange={(v) => patch(i, { estimateMin: v })} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 pl-7 text-xs text-slate-500 dark:text-slate-400">
              <label className="flex items-center gap-1">
                {t('form.stepDue')}
                <input
                  className="input w-auto px-2 py-1 text-sm"
                  type="date"
                  value={dueToDateInput(s.due)}
                  onChange={(e) => patch(i, { due: dueFromDateInput(e.target.value) })}
                />
              </label>
              <label className="flex items-center gap-1">
                {t('form.stepWho')}
                <input
                  className="input w-28 px-2 py-1 text-sm"
                  value={s.who ?? ''}
                  maxLength={STEP_WHO_MAX}
                  onChange={(e) => patch(i, { who: e.target.value })}
                />
              </label>
            </div>
          </li>
        ))}
      </ol>
      {issues.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-xs text-amber-700 dark:text-amber-400">
          {issues.map((x) => (
            <li key={`${x.index}-${x.kind}`}>{t('form.stepIssue.' + x.kind, { n: x.index + 1 })}</li>
          ))}
        </ul>
      )}
      <button
        type="button"
        className="btn-secondary mt-2"
        onClick={() => onChange([...steps, { title: '', estimateMin: 60 }])}
      >
        <Icon name="plus" className="h-4 w-4" /> {t('form.addStep')}
      </button>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t('form.stepsTotal', { d: duration(total) })}</p>
    </div>
  );
}
