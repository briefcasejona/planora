import { addDays } from 'date-fns';
import { useEffect, useState } from 'react';
import { Icon } from '../components/Icon';
import { DurationInput, toLocalInput } from '../components/ui';
import { repo } from '../data/repo';
import { actions, useStore } from '../data/store';
import { findManualMatch } from '../domain/matching';
import { STUDENT_TYPES, type TaskType, TEACHER_TYPES } from '../domain/types';
import { useFormat } from '../lib/format';
import { MS_SCOPES } from './microsoft/auth';
import { fetchTeamsAssignments, fetchTodoTasks, type ImportCandidate } from './microsoft/graph';
import { microsoftToken } from './microsoft/sync';
import { useIntegrations } from './settings';

interface Draft extends ImportCandidate {
  type: TaskType;
  estimate: number;
  deadline: string;
}

/** Review items from Microsoft To Do / Teams before they become Planora tasks. */
export function ImportPanel() {
  const { t } = useFormat();
  const ms = useIntegrations((s) => s.microsoft);
  const tasks = useStore((s) => s.tasks);
  const role = useStore((s) => s.prefs.role);
  const [items, setItems] = useState<Draft[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ignored, setIgnored] = useState<string[]>([]);
  useEffect(() => {
    void repo.getKv<string[]>('import-ignored', []).then(setIgnored);
  }, []);

  if (!ms.connected || (!ms.importTodo && !ms.importTeams)) return null;

  const load = async () => {
    setBusy(true);
    setError('');
    try {
      const token = await microsoftToken(true, [
        ...(ms.importTodo ? MS_SCOPES.importTodo : []),
        ...(ms.importTeams ? MS_SCOPES.importTeams : []),
      ]);
      const found = [
        ...(ms.importTodo ? await fetchTodoTasks(token) : []),
        ...(ms.importTeams ? await fetchTeamsAssignments(token) : []),
      ];
      const known = new Set([...tasks.map((x) => x.externalId).filter(Boolean), ...ignored]);
      const fresh = found.filter((c) => !known.has(c.externalId));
      await repo.addLog({ provider: 'microsoft', action: 'read-tasks', count: found.length, ok: true });
      setItems(
        fresh.map((c) => ({
          ...c,
          type: c.source === 'ms-teams' ? 'assignment' : 'task',
          estimate: 60,
          deadline: toLocalInput(c.due && new Date(c.due) > new Date() ? new Date(c.due) : addDays(new Date(), 7)),
        })),
      );
    } catch (e) {
      await repo.addLog({
        provider: 'microsoft',
        action: 'read-tasks',
        count: 0,
        ok: false,
        detail: String((e as Error).message),
      });
      setError(t('import.error'));
    } finally {
      setBusy(false);
    }
  };

  const update = (id: string, patch: Partial<Draft>) =>
    setItems((list) => list?.map((x) => (x.externalId === id ? { ...x, ...patch } : x)) ?? null);
  const add = async (d: Draft) => {
    await actions.addTask({
      title: d.title,
      type: d.type,
      deadline: new Date(d.deadline).toISOString(),
      userEstimateMin: d.estimate,
      useSuggestion: true,
      source: d.source,
      externalId: d.externalId,
    });
    setItems((list) => list?.filter((x) => x.externalId !== d.externalId) ?? null);
  };
  /** The user already added this item by hand: link it instead of planning the work twice. */
  const link = async (d: Draft, taskId: string) => {
    await actions.linkTask(taskId, d.source, d.externalId);
    setItems((list) => list?.filter((x) => x.externalId !== d.externalId) ?? null);
  };
  const ignore = async (d: Draft) => {
    const next = [...ignored, d.externalId];
    setIgnored(next);
    await repo.setKv('import-ignored', next);
    setItems((list) => list?.filter((x) => x.externalId !== d.externalId) ?? null);
  };
  const types = role === 'teacher' ? TEACHER_TYPES : STUDENT_TYPES;

  return (
    <div className="card mb-4">
      <div className="flex flex-wrap items-center gap-2">
        <Icon name="link" className="h-5 w-5 text-brand-600" />
        <p className="flex-1 text-sm font-medium">{t('import.title')}</p>
        <button className="btn-secondary" onClick={load} disabled={busy}>
          {busy ? t('common.loading') : t('import.fetch')}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
      {items && items.length === 0 && <p className="mt-2 text-sm text-slate-500">{t('import.none')}</p>}
      {items && items.length > 0 && (
        <ul className="mt-3 space-y-3">
          {items.map((d) => {
            const match = findManualMatch(d, tasks);
            return (
              <li key={d.externalId} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <p className="font-medium">{d.title}</p>
                <p className="mb-2 text-xs text-slate-500">{t('source.' + d.source)}</p>
                {match && (
                  <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl bg-brand-50 p-2 text-sm dark:bg-brand-700/20">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{t('import.looksLike', { title: match.title })}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300">{t('import.linkHint')}</p>
                    </div>
                    <button className="btn-primary" onClick={() => link(d, match.id)}>
                      {t('import.link')}
                    </button>
                  </div>
                )}
                <div className="grid gap-2 sm:grid-cols-2">
                  <select
                    className="input"
                    value={d.type}
                    aria-label={t('form.type')}
                    onChange={(e) => update(d.externalId, { type: e.target.value as TaskType })}
                  >
                    {types.map((x) => (
                      <option key={x} value={x}>
                        {t('type.' + x)}
                      </option>
                    ))}
                  </select>
                  <input
                    className="input"
                    type="datetime-local"
                    aria-label={t('form.deadline')}
                    value={d.deadline}
                    onChange={(e) => update(d.externalId, { deadline: e.target.value })}
                  />
                </div>
                <div className="mt-2">
                  <DurationInput value={d.estimate} onChange={(v) => update(d.externalId, { estimate: v })} />
                </div>
                <div className="mt-2 flex justify-end gap-2">
                  <button className="btn-ghost" onClick={() => ignore(d)}>
                    {t('import.ignore')}
                  </button>
                  <button className={match ? 'btn-secondary' : 'btn-primary'} onClick={() => add(d)}>
                    {match ? t('import.addSeparately') : t('import.add')}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
