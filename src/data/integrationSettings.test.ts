import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { PlanoraDB } from './db';
import { DEFAULT_INTEGRATIONS, loadIntegrations, saveIntegrations, useIntegrations } from './integrationSettings';
import { repo, useDatabase } from './repo';

let n = 0;

describe('integration settings', () => {
  beforeEach(async () => {
    // biome-ignore lint/correctness/useHookAtTopLevel: useDatabase is not a React hook
    useDatabase(new PlanoraDB(`integration-settings-${n++}`));
    useIntegrations.setState(DEFAULT_INTEGRATIONS);
  });

  it('are stored under the "integrations" key, which existing installs already use', async () => {
    await saveIntegrations({ dismissedTests: ['toets-1'] });
    const stored = await repo.getKv<{ dismissedTests?: string[] }>('integrations', {});
    expect(stored.dismissedTests).toEqual(['toets-1']);
  });

  it('settings saved by an older version load, with defaults for what it did not know', async () => {
    await repo.setKv('integrations', {
      microsoft: { connected: true, readBusy: false },
      icsImports: [{ id: 'ics-1', name: 'Rooster', importedAt: '2026-09-01T08:00:00.000Z', count: 3 }],
    });
    await loadIntegrations();
    const s = useIntegrations.getState();
    expect(s.microsoft).toMatchObject({ connected: true, readBusy: false, genericTitles: true });
    expect(s.icsImports.map((i) => i.id)).toEqual(['ics-1']);
    expect(s.dismissedTests).toEqual([]);
    expect(s.icsExport).toEqual(DEFAULT_INTEGRATIONS.icsExport);
  });
});
