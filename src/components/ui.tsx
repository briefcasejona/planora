import { type ReactNode, useEffect, useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { EventCategory, TaskType } from '../domain/types';
import { Icon, type IconName } from './Icon';

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('input, select, textarea, button:not([data-close])')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-white shadow-xl sm:rounded-3xl dark:bg-slate-900 ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'}`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-800">
          <h2 id={titleId} className="text-base font-semibold">
            {title}
          </h2>
          <button data-close className="btn-ghost -mr-2 p-2" onClick={onClose} aria-label={t('common.close')}>
            <Icon name="x" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-3 dark:border-slate-800">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="mb-3 block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{hint}</span>}
    </label>
  );
}

export function Chips<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          type="button"
          key={String(o.value)}
          role="radio"
          aria-checked={o.value === value}
          className={`chip ${o.value === value ? 'chip-active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Minutes input as hours + minutes with quick picks. */
export function DurationInput({
  value,
  onChange,
  id,
}: {
  value: number;
  onChange: (min: number) => void;
  id?: string;
}) {
  const { t } = useTranslation();
  const h = Math.floor(value / 60);
  const m = value % 60;
  const quick = [30, 60, 120, 240, 480];
  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="number"
          min={0}
          max={200}
          className="input w-20"
          value={h}
          aria-label={t('units.hours')}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0) * 60 + m)}
        />
        <span className="text-sm text-slate-500">{t('units.hours')}</span>
        <select
          className="input w-24"
          value={m - (m % 5)}
          aria-label={t('units.minutes')}
          onChange={(e) => onChange(h * 60 + Number(e.target.value))}
        >
          {Array.from({ length: 12 }, (_, i) => i * 5).map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
        <span className="text-sm text-slate-500">{t('units.minutes')}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {quick.map((q) => (
          <button
            type="button"
            key={q}
            className={`chip px-2.5 py-0.5 text-xs ${value === q ? 'chip-active' : ''}`}
            onClick={() => onChange(q)}
          >
            {q < 60 ? q + 'm' : q / 60 + t('units.hour')}
          </button>
        ))}
      </div>
    </div>
  );
}

const TYPE_COLORS: Record<TaskType, string> = {
  test: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200',
  assignment: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  project: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200',
  task: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
  grading: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  lessonprep: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200',
};

export const TYPE_HEX: Record<TaskType, string> = {
  test: '#e11d48',
  assignment: '#d97706',
  project: '#7c3aed',
  task: '#0284c7',
  grading: '#059669',
  lessonprep: '#0d9488',
};

/** Colours of appointment categories; chosen to stay apart from the task-type colours above. */
export const CATEGORY_HEX: Record<EventCategory, string> = {
  lesson: '#2563eb',
  test: '#e11d48',
  excursion: '#0891b2',
  meeting: '#c026d3',
  work: '#78716c',
  sport: '#65a30d',
  personal: '#db2777',
};
/** Events whose kind is unknown (free/busy from Outlook or Google). */
export const BUSY_HEX = '#64748b';

/** Light fill with a coloured edge, so appointments never look like (solid) study blocks. */
export function eventColors(category?: EventCategory) {
  const hex = category ? CATEGORY_HEX[category] : BUSY_HEX;
  return {
    backgroundColor: `color-mix(in srgb, ${hex} 18%, var(--planora-event-base))`,
    borderColor: hex,
    textColor: 'var(--planora-event-text)',
  };
}

export function CategoryBadge({ category }: { category?: EventCategory }) {
  const { t } = useTranslation();
  const hex = category ? CATEGORY_HEX[category] : BUSY_HEX;
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium"
      style={{ borderColor: hex, color: hex }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: hex }} aria-hidden />
      {category ? t('category.' + category) : t('calendar.busy')}
    </span>
  );
}

export function TypeBadge({ type }: { type: TaskType }) {
  const { t } = useTranslation();
  return (
    <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[type]}`}>
      {t('type.' + type)}
    </span>
  );
}

export function Progress({ value, label }: { value: number; label: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
      role="progressbar"
      aria-label={label}
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-full rounded-full bg-brand-600" style={{ width: pct + '%' }} />
    </div>
  );
}

export function Empty({ icon, title, children }: { icon: IconName; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center text-slate-500 dark:text-slate-400">
      <Icon name={icon} className="h-10 w-10 text-slate-300 dark:text-slate-600" />
      <p className="font-medium text-slate-700 dark:text-slate-300">{title}</p>
      {children}
    </div>
  );
}

export function Banner({
  tone = 'info',
  icon,
  children,
  action,
}: {
  tone?: 'info' | 'warn' | 'success';
  icon: IconName;
  children: ReactNode;
  action?: ReactNode;
}) {
  const tones = {
    info: 'border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-700/20 dark:text-brand-100',
    warn: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100',
    success:
      'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100',
  };
  return (
    <div className={`flex flex-wrap items-start gap-3 rounded-2xl border p-3 text-sm ${tones[tone]}`}>
      <Icon name={icon} className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
      {action}
    </div>
  );
}

export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Local datetime-input value (YYYY-MM-DDTHH:mm) for a Date. */
export function toLocalInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
