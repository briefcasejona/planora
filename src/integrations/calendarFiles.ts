import { actions, useStore } from '../data/store';
import { repo } from '../data/repo';
import { exportFile } from '../lib/files';
import { buildIcs, importIdFor, parseIcs } from './ics';
import { saveIntegrations, useIntegrations } from './settings';

/** Import an .ics file (e.g. exported from Apple Calendar). The same file name replaces its earlier import. */
export async function importCalendarFile(name: string, text: string): Promise<number> {
  const id = importIdFor(name);
  const blocks = parseIcs(text, new Date(), id);
  await actions.replaceBusySource('ics', blocks, id);
  const imports = useIntegrations.getState().icsImports.filter((i) => i.id !== id);
  await saveIntegrations({ icsImports: [...imports, { id, name, importedAt: new Date().toISOString(), count: blocks.length }] });
  await repo.addLog({ provider: 'ics', action: 'import-file', count: blocks.length, ok: true });
  return blocks.length;
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
