import { useEffect, useState } from 'react';
import { addDays } from 'date-fns';
import { actions, useStore } from '../data/store';
import { repo } from '../data/repo';
import { STUDENT_TYPES, TEACHER_TYPES, type TaskType } from '../domain/types';
import { useFormat } from '../lib/format';
import { DurationInput, toLocalInput } from '../components/ui';
import { Icon } from '../components/Icon';
import { useIntegrations } from './settings';
import { microsoftToken } from './microsoft/sync';
import { MS_SCOPES } from './microsoft/auth';
import { fetchTeamsAssignments, fetchTodoTasks, type ImportCandidate } from './microsoft/graph';

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
      const token = await microsoftToken(true, [...(ms.importTodo ? MS_SCOPES.importTodo : []), ...(ms.importTeams ? MS_SCOPES.importTeams : [])]);
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
      await repo.addLog({ provider: 'microsoft', action: 'read-tasks', count: 0, ok: false, detail: String((e as Error).message) });
      setError(t('import.error'));
    } finally {
      setBusy(false);
    }
  };

  const update = (id: string, patch: Partial<Draft>) => setItems((list) => list?.map((x) => (x.externalId === id ? { ...x, ...patch } : x)) ?? null);
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
        <button className="btn-secondary" onClick={load} disabled={busy}>{busy ? t('common.loading') : t('import.fetch')}</button>
      </div>
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
      {items && items.length === 0 && <p className="mt-2 text-sm text-slate-500">{t('import.none')}</p>}
      {items && items.length > 0 && (
        <ul className="mt-3 space-y-3">
          {items.map((d) => (
            <li key={d.externalId} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <p className="font-medium">{d.title}</p>
              <p className="mb-2 text-xs text-slate-500">{t('source.' + d.source)}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <select className="input" value={d.type} aria-label={t('form.type')} onChange={(e) => update(d.externalId, { type: e.target.value as TaskType })}>
                  {types.map((x) => <option key={x} value={x}>{t('type.' + x)}</option>)}
                </select>
                <input className="input" type="datetime-local" aria-label={t('form.deadline')} value={d.deadline} onChange={(e) => update(d.externalId, { deadline: e.target.value })} />
              </div>
              <div className="mt-2"><DurationInput value={d.estimate} onChange={(v) => update(d.externalId, { estimate: v })} /></div>
              <div className="mt-2 flex justify-end gap-2">
                <button className="btn-ghost" onClick={() => ignore(d)}>{t('import.ignore')}</button>
                <button className="btn-primary" onClick={() => add(d)}>{t('import.add')}</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
