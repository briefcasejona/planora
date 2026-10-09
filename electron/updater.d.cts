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
