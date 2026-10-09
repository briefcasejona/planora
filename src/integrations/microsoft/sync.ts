import { addDays } from 'date-fns';
import { repo } from '../../data/repo';
import { actions, useStore } from '../../data/store';
import { deviceId, useSync } from '../../data/sync/engine';
import { patchMicrosoft, saveIntegrations, useIntegrations } from '../settings';
import { MS_SCOPES, type MsPending, msHandleRedirect, msToken } from './auth';
import { createEvent, deleteEvent, fetchBusy, type OutlookEventInput, updateEvent } from './graph';

interface MappedEvent {
  taskId: string;
  start: string;
  end: string;
  /** Hash of the subject, so task titles are never stored outside the (encrypted) task table. */
  subjectHash: string;
}
type EventMap = Record<string, MappedEvent>;

const MAP_KEY = 'ms-events';
const PUSH_DAYS = 28;
const PULL_DAYS = 120;
const MAX_WRITES = 60;

export const loadEventMap = () => repo.getKv<EventMap>(MAP_KEY, {});
const saveEventMap = (m: EventMap) => repo.setKv(MAP_KEY, m);

function hash(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** Sync never runs while Planora is locked: the store is empty then and nothing may be decided from it. */
const unavailable = () => !useStore.getState().ready || useStore.getState().locked;

function scopesFor(): string[] {
  const s = useIntegrations.getState().microsoft;
  return [
    ...(s.writeSessions ? MS_SCOPES.writeSessions : s.readBusy ? MS_SCOPES.readBusy : []),
    ...(s.importTodo ? MS_SCOPES.importTodo : []),
    ...(s.importTeams ? MS_SCOPES.importTeams : []),
  ];
}

export async function microsoftToken(
  interactive = false,
  extra: readonly string[] = [],
  pending?: MsPending,
): Promise<string> {
  const s = useIntegrations.getState().microsoft;
  return msToken([...new Set([...scopesFor(), ...extra])], s.staySignedIn, interactive, pending);
}

/** Native app: finish a sign-in or consent that went through a redirect. */
export async function completeMsRedirect(): Promise<void> {
  const result = await msHandleRedirect(useIntegrations.getState().microsoft.staySignedIn);
  if (!result) return;
  const { pending, account } = result;
  // Signing in for sync (Settings > Sync) is separate from the Outlook/Teams connection.
  if (pending?.kind === 'syncSetup') return;
  if (pending?.kind === 'connect' || !useIntegrations.getState().microsoft.connected) {
    await patchMicrosoft({ connected: true, accountLabel: account.username });
    await repo.addLog({ provider: 'microsoft', action: 'connect', count: 0, ok: true });
  }
  if (pending?.kind === 'feature') await patchMicrosoft({ [pending.key]: true });
  await pullMicrosoftBusy();
  await pushMicrosoftSessions();
}

/** Pull busy time from Outlook into the local planner (times only unless titles are enabled). */
export async function pullMicrosoftBusy(interactive = false): Promise<void> {
  const s = useIntegrations.getState().microsoft;
  if (!s.connected || !s.readBusy || unavailable()) return;
  try {
    const token = await microsoftToken(interactive, MS_SCOPES.readBusy);
    const map = await loadEventMap();
    const now = new Date();
    const blocks = await fetchBusy(token, addDays(now, -7), addDays(now, PULL_DAYS), {
      showTitles: s.showTitles,
      includeTentative: s.includeTentative,
      ownEventIds: new Set(Object.keys(map)),
    });
    const current = useStore.getState().busy.filter((b) => b.source === 'microsoft');
    const key = (list: typeof blocks) =>
      JSON.stringify([...list].sort((a, b) => a.id.localeCompare(b.id) || a.start.localeCompare(b.start)));
    if (key(current) !== key(blocks)) await actions.replaceBusySource('microsoft', blocks);
    await patchMicrosoft({ lastSync: now.toISOString() });
    await repo.addLog({ provider: 'microsoft', action: 'read-busy', count: blocks.length, ok: true });
  } catch (e) {
    await repo.addLog({
      provider: 'microsoft',
      action: 'read-busy',
      count: 0,
      ok: false,
      detail: String((e as Error).message ?? e),
    });
    if (interactive) throw e;
  }
}

/** Mirror planned sessions to Outlook as private events, touching only events Planora created. */
export async function pushMicrosoftSessions(interactive = false): Promise<void> {
  const s = useIntegrations.getState().microsoft;
  if (!s.connected || !s.writeSessions || unavailable()) return;
  // With sync on, only one device writes to Outlook; otherwise every block would appear twice.
  const writer = useIntegrations.getState().outlookWriter;
  if (useSync.getState().enabled && writer && writer.device !== (await deviceId())) return;
  const { sessions, tasks } = useStore.getState();
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const now = new Date();
  const horizon = addDays(now, PUSH_DAYS);
  const desired: (OutlookEventInput & { taskId: string })[] = sessions
    .filter(
      (x) => x.status === 'planned' && new Date(x.start) > now && new Date(x.start) < horizon && byId.has(x.taskId),
    )
    .map((x) => ({
      sessionId: x.id,
      taskId: x.taskId,
      start: new Date(x.start).toISOString(),
      end: new Date(x.end).toISOString(),
      subject: s.genericTitles ? 'Planora focus' : 'Planora: ' + byId.get(x.taskId)!.title,
    }));
  let writes = 0;
  try {
    const token = await microsoftToken(interactive, MS_SCOPES.writeSessions);
    const map = await loadEventMap();
    const free = new Set(Object.keys(map));
    const pending: typeof desired = [];
    // 1. Exact matches stay; fix subjects if needed.
    for (const d of desired) {
      const hit = [...free].find(
        (id) => map[id].taskId === d.taskId && map[id].start === d.start && map[id].end === d.end,
      );
      if (!hit) {
        pending.push(d);
        continue;
      }
      free.delete(hit);
      if (map[hit].subjectHash !== hash(d.subject) && writes++ < MAX_WRITES) {
        await updateEvent(token, hit, d);
        map[hit] = { ...map[hit], subjectHash: hash(d.subject) };
      }
    }
    // 2. Move existing events of the same task; 3. create the rest.
    for (const d of pending) {
      if (writes++ >= MAX_WRITES) break;
      const reuse = [...free].find((id) => map[id].taskId === d.taskId) ?? [...free][0];
      if (reuse) {
        free.delete(reuse);
        await updateEvent(token, reuse, d);
        map[reuse] = { taskId: d.taskId, start: d.start, end: d.end, subjectHash: hash(d.subject) };
      } else {
        const id = await createEvent(token, d);
        map[id] = { taskId: d.taskId, start: d.start, end: d.end, subjectHash: hash(d.subject) };
      }
    }
    // 4. Remove Planora events that are no longer planned.
    for (const id of free) {
      if (new Date(map[id].end) < now) {
        delete map[id];
        continue;
      }
      if (writes++ >= MAX_WRITES) break;
      await deleteEvent(token, id);
      delete map[id];
    }
    await saveEventMap(map);
    await repo.addLog({
      provider: 'microsoft',
      action: 'write-sessions',
      count: Math.min(writes, MAX_WRITES),
      ok: true,
    });
  } catch (e) {
    await repo.addLog({
      provider: 'microsoft',
      action: 'write-sessions',
      count: 0,
      ok: false,
      detail: String((e as Error).message ?? e),
    });
    if (interactive) throw e;
  }
}

/** Delete every Outlook event Planora created (used when turning writing off or disconnecting). */
export async function removeMicrosoftEvents(): Promise<number> {
  const map = await loadEventMap();
  const ids = Object.keys(map);
  if (!ids.length) return 0;
  const token = await microsoftToken(true, MS_SCOPES.writeSessions);
  for (const id of ids) await deleteEvent(token, id);
  await saveEventMap({});
  await repo.addLog({ provider: 'microsoft', action: 'remove-events', count: ids.length, ok: true });
  return ids.length;
}

export async function forgetMicrosoftEvents(): Promise<void> {
  await saveEventMap({});
}

/** This device becomes the one that writes study blocks to Outlook (shared with other devices through sync). */
export async function claimOutlookWriter(): Promise<void> {
  await saveIntegrations({ outlookWriter: { device: await deviceId(), at: new Date().toISOString() } });
}
