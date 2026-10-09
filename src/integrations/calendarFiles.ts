import { actions, useStore } from '../data/store';
import { repo } from '../data/repo';
import { exportFile } from '../lib/files';
import { detectCategory } from '../domain/categories';
import type { BusyBlock, EventCategory } from '../domain/types';
import { buildIcs, importIdFor, parseIcs } from './ics';
import { saveIntegrations, useIntegrations } from './settings';

/**
 * Import an .ics file (e.g. exported from Apple Calendar or a school timetable).
 * The same file name replaces its earlier import, keeping the categories the user set on single events.
 */
export async function importCalendarFile(name: string, text: string, category: EventCategory = 'lesson'): Promise<number> {
  const id = importIdFor(name);
  const previous = useIntegrations.getState().icsImports.find((i) => i.id === id);
  const overrides = previous?.overrides ?? {};
  const blocks = parseIcs(text, new Date(), id, category, overrides);
  await actions.replaceBusySource('ics', blocks, id);
  const imports = useIntegrations.getState().icsImports.filter((i) => i.id !== id);
  await saveIntegrations({ icsImports: [...imports, { id, name, importedAt: new Date().toISOString(), count: blocks.length, category, overrides }] });
  await repo.addLog({ provider: 'ics', action: 'import-file', count: blocks.length, ok: true });
  return blocks.length;
}

/** Change what the events of an imported file are; tests, excursions and single-event choices stay. */
export async function setImportCategory(importId: string, category: EventCategory): Promise<void> {
  const imp = useIntegrations.getState().icsImports.find((i) => i.id === importId);
  if (!imp) return;
  const overrides = imp.overrides ?? {};
  const blocks = useStore.getState().busy.filter((b) => b.source === 'ics' && b.importId === importId);
  await actions.saveBusy(
    blocks.map((b) => ({ ...b, category: (b.externalUid && overrides[b.externalUid]) || detectCategory(b.title, category) })),
  );
  await saveIntegrations({ icsImports: useIntegrations.getState().icsImports.map((i) => (i.id === importId ? { ...i, category } : i)) });
}

/** Set the category of one imported event (all occurrences of it), remembered across re-imports. */
export async function setEventCategory(block: BusyBlock, category: EventCategory): Promise<void> {
  const uid = block.externalUid;
  const imp = useIntegrations.getState().icsImports.find((i) => i.id === block.importId);
  if (!uid || !imp) return actions.saveBusy([{ ...block, category }]);
  const same = useStore.getState().busy.filter((b) => b.source === 'ics' && b.importId === block.importId && b.externalUid === uid);
  await actions.saveBusy(same.map((b) => ({ ...b, category })));
  await saveIntegrations({
    icsImports: useIntegrations.getState().icsImports.map((i) => (i.id === imp.id ? { ...i, overrides: { ...i.overrides, [uid]: category } } : i)),
  });
}

export async function removeCalendarImport(id: string): Promise<void> {
  await actions.replaceBusySource('ics', [], id);
  await saveIntegrations({ icsImports: useIntegrations.getState().icsImports.filter((i) => i.id !== id) });
}

/**
 * Export the whole plan. Blocks that were in the previous export but are no
 * longer planned are included as cancelled, so re-importing cleans them up.
 */
export async function exportPlan(): Promise<void> {
  const { sessions, tasks } = useStore.getState();
  const settings = useIntegrations.getState().icsExport;
  const { text, uids } = buildIcs(sessions, tasks, { ...settings, cancelUids: settings.lastUids });
  await exportFile('planora.ics', text, 'text/calendar');
  await saveIntegrations({ icsExport: { ...settings, lastUids: uids } });
}

/** "Add to calendar" for one task: its planned blocks and deadline. */
export async function exportTask(taskId: string): Promise<void> {
  const { sessions, tasks } = useStore.getState();
  const settings = useIntegrations.getState().icsExport;
  const { text } = buildIcs(sessions, tasks, { ...settings, deadlines: true, taskIds: [taskId] });
  await exportFile('planora-taak.ics', text, 'text/calendar');
}
