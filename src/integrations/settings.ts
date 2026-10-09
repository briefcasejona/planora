import { create } from 'zustand';
import { repo } from '../data/repo';
import type { EventCategory } from '../domain/types';

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

export interface IcsImport {
  id: string;
  name: string;
  importedAt: string;
  count: number;
  /** What the events of this file are, unless their title says otherwise (default: lessons). */
  category?: EventCategory;
  /** Categories the user set on single events, by event UID; kept when the file is imported again. */
  overrides?: Record<string, EventCategory>;
  /** Last change to this entry (for sync between devices). */
  updatedAt?: string;
}

export interface IcsExportSettings {
  generic: boolean;
  deadlines: boolean;
  reminderMin: number;
  /** UIDs of the last full export, so events that disappeared can be cancelled next time. */
  lastUids: string[];
}

export interface IntegrationSettings {
  microsoft: MicrosoftSettings;
  google: GoogleSettings;
  icsImports: IcsImport[];
  icsExport: IcsExportSettings;
  /** Tests in the calendar the user chose not to make a study task for (see eventKey). */
  dismissedTests: string[];
  /** With sync on: the device that writes study blocks to Outlook, so they are written only once. */
  outlookWriter?: { device: string; at: string };
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
  icsImports: [],
  icsExport: { generic: true, deadlines: true, reminderMin: 10, lastUids: [] },
  dismissedTests: [],
};

export const useIntegrations = create<IntegrationSettings>(() => DEFAULT_INTEGRATIONS);

export async function loadIntegrations(): Promise<void> {
  const stored = await repo.getKv<Partial<IntegrationSettings>>('integrations', {});
  useIntegrations.setState({
    ...DEFAULT_INTEGRATIONS,
    ...stored,
    microsoft: { ...DEFAULT_INTEGRATIONS.microsoft, ...stored.microsoft },
    google: { ...DEFAULT_INTEGRATIONS.google, ...stored.google },
    icsImports: stored.icsImports ?? [],
    icsExport: { ...DEFAULT_INTEGRATIONS.icsExport, ...stored.icsExport },
    dismissedTests: stored.dismissedTests ?? [],
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
