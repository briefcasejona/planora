import 'fake-indexeddb/auto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PlanoraDB } from '../db';
import { useDatabase } from '../repo';
import { actions, useStore } from '../store';
import { DEFAULT_PREFERENCES } from '../../domain/types';
import { loadIntegrations } from '../../integrations/settings';
import { enableSync, loadSyncState, resetSyncMemory, syncNow, useSync } from './engine';
import { memoryTransport, type SyncTransport } from './onedrive';

const PASS = 'zomer-fiets-boek';
const cloud = memoryTransport();
const devices = { laptop: new PlanoraDB('sync-laptop'), phone: new PlanoraDB('sync-phone') };

/** Switch the app to another device, as if Planora was opened there. */
async function on(device: keyof typeof devices) {
  useDatabase(devices[device]);
  resetSyncMemory();
  await loadSyncState();
  await loadIntegrations();
  await actions.init();
}
const titles = () => useStore.getState().tasks.map((t) => t.title).sort();
const addTask = (title: string) =>
  actions.addTask({ title, type: 'assignment', deadline: new Date(2026, 9, 28, 17).toISOString(), userEstimateMin: 120, useSuggestion: false });

describe('sync between two devices through OneDrive', () => {
  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 12, 9, 0));
    await on('laptop');
    await actions.savePrefs({ ...DEFAULT_PREFERENCES, onboarded: true, maxMinutesPerDay: 200 });
    await addTask('Essay Engels');
    await on('phone');
    vi.setSystemTime(new Date(2026, 9, 12, 9, 5));
    await actions.savePrefs({ ...DEFAULT_PREFERENCES, onboarded: true });
  });
  afterAll(() => vi.useRealTimers());

  it('first device creates the encrypted sync file', async () => {
    await on('laptop');
    await enableSync(PASS, cloud);
    expect(useSync.getState()).toMatchObject({ enabled: true, error: undefined });
    expect(cloud.file?.text).not.toContain('Essay');
  });

  it('second device needs the same passphrase, then gets the tasks and the settings', async () => {
    await on('phone');
    await expect(enableSync('verkeerd', cloud)).rejects.toThrow('wrong-passphrase');
    expect(useSync.getState().enabled).toBe(false);
    await enableSync(PASS, cloud);
    expect(titles()).toEqual(['Essay Engels']);
    expect(useStore.getState().prefs.maxMinutesPerDay).toBe(200);
    expect(useStore.getState().sessions.length).toBeGreaterThan(0); // planned here, from the synced task
  });

  it('a task added on the phone shows up on the laptop', async () => {
    await addTask('Toets Biologie');
    await syncNow(cloud);
    await on('laptop');
    await syncNow(cloud);
    expect(titles()).toEqual(['Essay Engels', 'Toets Biologie']);
  });

  it('keeps both changes when two devices save at the same time', async () => {
    const stale = await cloud.get(); // the laptop read the file...
    await on('phone');
    await addTask('Verslag Scheikunde');
    await syncNow(cloud); // ...then the phone saved first
    await on('laptop');
    await addTask('Presentatie Geschiedenis');
    let first = true;
    const racing: SyncTransport = { ...cloud, get: async () => (first ? ((first = false), stale) : cloud.get()) };
    expect(await syncNow(racing)).toBe('ok');
    expect(titles()).toEqual(['Essay Engels', 'Presentatie Geschiedenis', 'Toets Biologie', 'Verslag Scheikunde']);
    await on('phone');
    await syncNow(cloud);
    expect(titles()).toEqual(['Essay Engels', 'Presentatie Geschiedenis', 'Toets Biologie', 'Verslag Scheikunde']);
  });

  it('a task deleted on one device is deleted on the other', async () => {
    vi.setSystemTime(new Date(2026, 9, 12, 10, 0));
    const id = useStore.getState().tasks.find((t) => t.title === 'Verslag Scheikunde')!.id;
    await actions.deleteTask(id);
    await syncNow(cloud);
    await on('laptop');
    await syncNow(cloud);
    expect(titles()).not.toContain('Verslag Scheikunde');
  });

  it('a block checked off on one device is not asked about again on the other', async () => {
    vi.setSystemTime(new Date(2026, 9, 12, 23, 0));
    await on('laptop');
    const past = useStore.getState().sessions.filter((s) => s.status === 'planned' && new Date(s.end) < new Date());
    expect(past.length).toBeGreaterThan(0);
    for (const s of past) await actions.setSessionStatus(s.id, 'done', 60);
    await syncNow(cloud);
    await on('phone');
    await syncNow(cloud);
    const now = new Date();
    const open = useStore.getState().sessions.filter((s) => s.status === 'planned' && new Date(s.end) < now);
    const done = useStore.getState().sessions.filter((s) => s.status === 'done');
    expect(done.length).toBe(past.length);
    expect(open).toEqual([]);
  });

  it('does not touch data when sync is off', async () => {
    await on('phone');
    const before = cloud.file?.etag;
    useSync.setState({ enabled: false });
    expect(await syncNow(cloud)).toBe('skipped');
    expect(cloud.file?.etag).toBe(before);
  });
});
