import { create } from 'zustand';
import { repo } from '../data/repo';

export interface MicrosoftSettings {
  connected: boolean;
  accountLabel?: string;
  /** Read busy/free from Outlook (start, end, availability only). */
  readBusy: boolean;
  /** Also read event subjects (off by default: only times are fetched). */
  showTitles: boolean;
  includeTentative: boolean;
  /** Write Planora sessions to Outlook as private events. */
  writeSessions: boolean;
  /** Use a generic title instead of the task name for events written to Outlook. */
  genericTitles: boolean;
  importTodo: boolean;
  importTeams: boolean;
  /** Keep the sign-in across browser restarts (stored on this device only). */
  staySignedIn: boolean;
  lastSync?: string;
}

export interface GoogleSettings {
  connected: boolean;
  lastSync?: string;
}

export interface IntegrationSettings {
  microsoft: MicrosoftSettings;
  google: GoogleSettings;
  icsImportedAt?: string;
}

export const DEFAULT_INTEGRATIONS: IntegrationSettings = {
  microsoft: {
    connected: false,
    readBusy: true,
    showTitles: false,
    includeTentative: true,
    writeSessions: false,
    genericTitles: true,
    importTodo: false,
    importTeams: false,
    staySignedIn: false,
  },
  google: { connected: false },
};

export const useIntegrations = create<IntegrationSettings>(() => DEFAULT_INTEGRATIONS);

export async function loadIntegrations(): Promise<void> {
  const stored = await repo.getKv<Partial<IntegrationSettings>>('integrations', {});
  useIntegrations.setState({
    ...DEFAULT_INTEGRATIONS,
    ...stored,
    microsoft: { ...DEFAULT_INTEGRATIONS.microsoft, ...stored.microsoft },
    google: { ...DEFAULT_INTEGRATIONS.google, ...stored.google },
  });
}

export async function saveIntegrations(patch: Partial<IntegrationSettings>): Promise<void> {
  const next = { ...useIntegrations.getState(), ...patch };
  useIntegrations.setState(next);
  await repo.setKv('integrations', next);
}

export async function patchMicrosoft(patch: Partial<MicrosoftSettings>): Promise<void> {
  await saveIntegrations({ microsoft: { ...useIntegrations.getState().microsoft, ...patch } });
}

export async function patchGoogle(patch: Partial<GoogleSettings>): Promise<void> {
  await saveIntegrations({ google: { ...useIntegrations.getState().google, ...patch } });
}
