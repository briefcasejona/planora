import type { BusyBlock } from '../../domain/types';

const GRAPH = 'https://graph.microsoft.com/v1.0';

/** Extended property used to recognise events Planora created (never touches other events). */
export const PLANORA_PROP = 'String {6f1c3a52-8f4e-4c55-9d7a-2b6f0d1e9a11} Name PlanoraSessionId';

async function graph<T>(token: string, path: string, init: RequestInit = {}, attempt = 0): Promise<T> {
  const res = await fetch(path.startsWith('http') ? path : GRAPH + path, {
    ...init,
    // No cookies or referrer go to Microsoft; only the bearer token for this request.
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      Prefer: 'outlook.timezone="UTC"',
      ...(init.headers ?? {}),
    },
  });
  if (res.status === 429 && attempt < 3) {
    const wait = Number(res.headers.get('Retry-After') ?? '2') * 1000;
    await new Promise((r) => setTimeout(r, wait));
    return graph<T>(token, path, init, attempt + 1);
  }
  if (!res.ok) throw new Error('graph-' + res.status);
  return (res.status === 204 ? undefined : await res.json()) as T;
}

interface GraphEvent {
  id: string;
  start: { dateTime: string };
  end: { dateTime: string };
  showAs: string;
  isAllDay: boolean;
  subject?: string;
}

const utc = (s: string) => new Date(s.endsWith('Z') ? s : s + 'Z');

/**
 * Busy time from the Outlook calendar (this includes Teams meetings). Only
 * id, start, end, availability and the all-day flag are requested via
 * $select; subjects only when the user explicitly enabled that.
 */
export async function fetchBusy(
  token: string,
  from: Date,
  to: Date,
  opts: { showTitles: boolean; includeTentative: boolean; ownEventIds: Set<string> },
): Promise<BusyBlock[]> {
  const fields = ['id', 'start', 'end', 'showAs', 'isAllDay', ...(opts.showTitles ? ['subject'] : [])].join(',');
  let url: string | undefined =
    `/me/calendarView?startDateTime=${from.toISOString()}&endDateTime=${to.toISOString()}&$select=${fields}&$top=250`;
  const busyKinds = new Set(['busy', 'oof', 'workingElsewhere', ...(opts.includeTentative ? ['tentative'] : [])]);
  const out: BusyBlock[] = [];
  for (let page = 0; url && page < 20; page++) {
    const data: { value: GraphEvent[]; '@odata.nextLink'?: string } = await graph(token, url);
    for (const e of data.value) {
      if (!busyKinds.has(e.showAs) || opts.ownEventIds.has(e.id)) continue;
      out.push({
        id: 'ms:' + e.id,
        source: 'microsoft',
        start: utc(e.start.dateTime).toISOString(),
        end: utc(e.end.dateTime).toISOString(),
        allDay: e.isAllDay || undefined,
        title: opts.showTitles ? e.subject : undefined,
      });
    }
    url = data['@odata.nextLink'];
  }
  return out;
}

export interface OutlookEventInput {
  sessionId: string;
  subject: string;
  start: string;
  end: string;
}

function eventBody(e: OutlookEventInput) {
  return {
    subject: e.subject,
    start: { dateTime: e.start.replace('Z', ''), timeZone: 'UTC' },
    end: { dateTime: e.end.replace('Z', ''), timeZone: 'UTC' },
    sensitivity: 'private',
    showAs: 'busy',
    isReminderOn: false,
    body: { contentType: 'text', content: '' },
  };
}

export async function createEvent(token: string, e: OutlookEventInput): Promise<string> {
  const created = await graph<{ id: string }>(token, '/me/events', {
    method: 'POST',
    body: JSON.stringify({ ...eventBody(e), singleValueExtendedProperties: [{ id: PLANORA_PROP, value: e.sessionId }] }),
  });
  return created.id;
}

export async function updateEvent(token: string, eventId: string, e: OutlookEventInput): Promise<void> {
  await graph(token, '/me/events/' + encodeURIComponent(eventId), { method: 'PATCH', body: JSON.stringify(eventBody(e)) });
}

export async function deleteEvent(token: string, eventId: string): Promise<void> {
  try {
    await graph(token, '/me/events/' + encodeURIComponent(eventId), { method: 'DELETE' });
  } catch (err) {
    if (!(err instanceof Error && err.message === 'graph-404')) throw err;
  }
}

export interface ImportCandidate {
  externalId: string;
  source: 'ms-todo' | 'ms-teams';
  title: string;
  due?: string;
}

export async function fetchTodoTasks(token: string): Promise<ImportCandidate[]> {
  const lists = await graph<{ value: { id: string }[] }>(token, '/me/todo/lists?$select=id');
  const out: ImportCandidate[] = [];
  for (const list of lists.value.slice(0, 20)) {
    const tasks = await graph<{ value: { id: string; title: string; status: string; dueDateTime?: { dateTime: string } }[] }>(
      token,
      `/me/todo/lists/${encodeURIComponent(list.id)}/tasks?$select=id,title,status,dueDateTime&$top=100`,
    );
    for (const t of tasks.value) {
      if (t.status === 'completed') continue;
      out.push({ externalId: 'todo:' + t.id, source: 'ms-todo', title: t.title, due: t.dueDateTime ? utc(t.dueDateTime.dateTime).toISOString() : undefined });
    }
  }
  return out;
}

export async function fetchTeamsAssignments(token: string): Promise<ImportCandidate[]> {
  const data = await graph<{ value: { id: string; displayName: string; dueDateTime?: string; status: string }[] }>(
    token,
    '/education/me/assignments?$select=id,displayName,dueDateTime,status',
  );
  return data.value
    .filter((a) => a.status === 'assigned' || a.status === 'published')
    .map((a) => ({ externalId: 'teams:' + a.id, source: 'ms-teams' as const, title: a.displayName, due: a.dueDateTime }));
}
