// Which newer Planora version exists for this device, based on GitHub's
// "latest release" answer. Pure functions: no network, easy to test.

export interface GithubRelease {
  tag_name: string;
  html_url?: string;
  assets: { name: string; browser_download_url: string; digest?: string | null }[];
}

export type UpdatePlatform = 'windows' | 'mac-arm' | 'mac-intel' | 'linux' | 'android';

export interface AvailableUpdate {
  version: string;
  url: string;
  /** Hex sha256 of the file as GitHub reports it, to check the download. */
  sha256?: string;
}

const ASSETS: Record<UpdatePlatform, string> = {
  windows: 'Planora-Setup.exe',
  'mac-arm': 'Planora-Mac-AppleSilicon.dmg',
  'mac-intel': 'Planora-Mac-Intel.dmg',
  linux: 'Planora.AppImage',
  android: 'Planora.apk',
};

/** -1, 0 or 1, comparing versions like "0.3.10" and "v0.3.9" number by number. */
export function compareVersions(a: string, b: string): number {
  const parts = (v: string) =>
    v
      .replace(/^v/i, '')
      .split(/[.-]/)
      .map((x) => parseInt(x, 10) || 0);
  const pa = parts(a);
  const pb = parts(b);
  for (let i = 0; i < Math.max(pa.length, pb.length, 3); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d < 0 ? -1 : 1;
  }
  return 0;
}

/** The update for this platform, or null when this version is current (or the file is missing). */
export function pickUpdate(release: GithubRelease, current: string, platform: UpdatePlatform): AvailableUpdate | null {
  if (compareVersions(release.tag_name, current) <= 0) return null;
  const asset = release.assets.find((a) => a.name === ASSETS[platform]);
  if (!asset) return null;
  const sha = asset.digest?.startsWith('sha256:') ? asset.digest.slice(7) : undefined;
  return { version: release.tag_name.replace(/^v/i, ''), url: asset.browser_download_url, sha256: sha };
}

export const LATEST_RELEASE_API = 'https://api.github.com/repos/briefcasejona/planora/releases/latest';
