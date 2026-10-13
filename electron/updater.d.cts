// Types for updater.cjs, so the unit tests can use it.
export function compareVersions(a: string, b: string): number;
export function updateKind(platform: string, env: Record<string, string | undefined>): 'install' | 'notify';
export function pickAsset(
  release: {
    tag_name: string;
    assets?: { name: string; browser_download_url: string; digest?: string | null }[];
  } | null,
  current: string,
  platform: string,
  arch: string,
): { version: string; url: string; sha256: string | null } | null;
export function sha256File(file: string): Promise<string>;
export const DOWNLOAD_PAGE: string;
export interface UpdateStatus {
  state: 'idle' | 'checking' | 'none' | 'available' | 'downloading' | 'ready' | 'error';
  kind: 'install' | 'notify';
  current: string;
  version?: string;
  lastCheck?: string;
  error?: string;
  url?: string;
}
export function createUpdater(options: {
  app: { getVersion(): string; getPath(name: string): string; relaunch(options?: { execPath?: string }): void };
  send: (status: UpdateStatus) => void;
  platform?: string;
  arch?: string;
  env?: Record<string, string | undefined>;
  spawn?: (file: string, args: string[], options: object) => unknown;
  latestRelease?: () => Promise<unknown>;
  fetchFile?: (url: string, file: string) => Promise<unknown>;
}): {
  status(): UpdateStatus;
  check(): Promise<unknown>;
  install(restart?: boolean): Promise<boolean>;
};
