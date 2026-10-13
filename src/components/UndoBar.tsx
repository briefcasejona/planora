import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { actions, useStore } from '../data/store';
import { canUndo } from '../domain/undo';
import { Icon } from './Icon';
import { useOpenModals } from './ui';

/** How long the bar stays when nobody touches it. Long enough for slow readers. */
const VISIBLE_MS = 10_000;

/**
 * "Completed: Essay · Undo" bar after an action that loses something another tap can't bring back.
 * Sits above the bottom menu and the round + button on phones, and steps aside while a dialog is open
 * (the dialog then offers Undo itself where it matters).
 */
export function UndoBar() {
  const { t } = useTranslation();
  const entry = useStore((s) => (canUndo(s.undo, s) ? s.undo : null));
  const modalOpen = useOpenModals((s) => s.count > 0);
  const [hidden, setHidden] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const visible = !!entry && !modalOpen && hidden !== entry.id;

  useEffect(() => {
    if (!visible || paused || !entry) return;
    const id = entry.id;
    const timer = setTimeout(() => setHidden(id), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [visible, paused, entry]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = el?.closest('input, textarea, select, [contenteditable="true"]');
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && !typing) {
        e.preventDefault();
        void actions.undoLast();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [visible]);

  if (!visible || !entry) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-[calc(9rem+var(--safe-bottom))] z-40 mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg md:bottom-6 dark:bg-slate-100 dark:text-slate-900"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <span className="min-w-0 flex-1 truncate">{t('undo.' + entry.kind, { title: entry.title })}</span>
      <button
        className="shrink-0 rounded-lg px-2 py-1 font-semibold text-brand-200 hover:bg-white/10 dark:text-brand-700 dark:hover:bg-slate-900/10"
        onClick={() => void actions.undoLast()}
      >
        {t('detail.undoComplete')}
      </button>
      <button
        className="-mr-2 shrink-0 rounded-lg p-1 hover:bg-white/10 dark:hover:bg-slate-900/10"
        onClick={() => actions.dismissUndo()}
        aria-label={t('common.close')}
      >
        <Icon name="x" className="h-4 w-4" />
      </button>
    </div>
  );
}
