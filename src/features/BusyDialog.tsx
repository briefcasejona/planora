import { addMonths } from 'date-fns';
import { useState } from 'react';
import { Chips, Field, Modal, toLocalInput } from '../components/ui';
import { actions } from '../data/store';
import { type BusyBlock, EVENT_CATEGORIES, type EventCategory } from '../domain/types';
import { setEventCategory } from '../integrations/calendarFiles';
import { useFormat } from '../lib/format';

/**
 * Create or edit an event in the in-app calendar (time when you cannot work).
 * Events from other calendars can't be edited here; only their category can be changed.
 */
export function BusyDialog({
  block,
  start,
  end,
  onClose,
}: {
  block?: BusyBlock;
  start?: Date;
  end?: Date;
  onClose: () => void;
}) {
  const { t, locale } = useFormat();
  const external = !!block && block.source !== 'local';
  const [category, setCategory] = useState<EventCategory>(block?.category ?? (external ? 'lesson' : 'personal'));
  const [title, setTitle] = useState(block?.title ?? '');
  const [from, setFrom] = useState(toLocalInput(block ? new Date(block.start) : (start ?? new Date())));
  const [to, setTo] = useState(toLocalInput(block ? new Date(block.end) : (end ?? new Date(Date.now() + 3600000))));
  const [repeat, setRepeat] = useState<number[]>(block?.repeatWeekdays ?? []);
  const [until, setUntil] = useState((block?.repeatUntil ?? addMonths(new Date(), 4).toISOString()).slice(0, 10));
  const [error, setError] = useState('');
  const days = [1, 2, 3, 4, 5, 6, 0];
  const dayName = (d: number) => locale.localize.day(d as 0, { width: 'short' });

  const categoryChips = (
    <div className="mb-3">
      <span className="label">{t('busy.category')}</span>
      <Chips
        label={t('busy.category')}
        value={category}
        onChange={setCategory}
        options={EVENT_CATEGORIES.map((c) => ({ value: c, label: t('category.' + c) }))}
      />
    </div>
  );

  if (external) {
    return (
      <Modal
        open
        onClose={onClose}
        title={block.title ?? t('calendar.busy')}
        footer={
          <>
            <button className="btn-secondary" onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button
              className="btn-primary"
              onClick={async () => {
                await setEventCategory(block, category);
                onClose();
              }}
            >
              {t('common.save')}
            </button>
          </>
        }
      >
        <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
          {t('busy.externalIntro', { source: t('source.' + block.source) })}
        </p>
        {categoryChips}
      </Modal>
    );
  }

  const save = async () => {
    const s = new Date(from);
    const e = new Date(to);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e <= s) return setError(t('busy.errTime'));
    await actions.saveBusy([
      {
        id: block?.id ?? crypto.randomUUID(),
        source: 'local',
        category,
        title: title.trim() || undefined,
        start: s.toISOString(),
        end: e.toISOString(),
        repeatWeekdays: repeat.length ? repeat : undefined,
        repeatUntil: repeat.length ? new Date(until + 'T23:59').toISOString() : undefined,
      },
    ]);
    onClose();
  };
  const remove = async () => {
    if (block) await actions.deleteBusy([block.id]);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={block ? t('busy.edit') : t('busy.new')}
      footer={
        <>
          {block && (
            <button className="btn-ghost mr-auto text-rose-600" onClick={remove}>
              {t('common.delete')}
            </button>
          )}
          <button className="btn-secondary" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="btn-primary" onClick={save}>
            {t('common.save')}
          </button>
        </>
      }
    >
      <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">{t('busy.intro')}</p>
      <Field label={t('busy.title')}>
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('busy.titlePlaceholder')}
          maxLength={80}
        />
      </Field>
      {categoryChips}
      <div className="grid gap-x-3 sm:grid-cols-2">
        <Field label={t('busy.start')}>
          <input className="input" type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label={t('busy.end')}>
          <input className="input" type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
      </div>
      <span className="label">{t('busy.repeat')}</span>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {days.map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={repeat.includes(d)}
            className={`chip ${repeat.includes(d) ? 'chip-active' : ''}`}
            onClick={() => setRepeat(repeat.includes(d) ? repeat.filter((x) => x !== d) : [...repeat, d])}
          >
            {dayName(d)}
          </button>
        ))}
      </div>
      {repeat.length > 0 && (
        <Field label={t('busy.until')}>
          <input className="input" type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
        </Field>
      )}
      {error && (
        <p role="alert" className="text-sm font-medium text-rose-600">
          {error}
        </p>
      )}
    </Modal>
  );
}
