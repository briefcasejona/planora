import { describe, expect, it } from 'vitest';
import { compareVersions, type GithubRelease, pickUpdate } from './updates';

const release: GithubRelease = {
  tag_name: 'v0.3.4',
  assets: [
    { name: 'Planora-Setup.exe', browser_download_url: 'https://x/Planora-Setup.exe', digest: 'sha256:abc' },
    { name: 'Planora.apk', browser_download_url: 'https://x/Planora.apk', digest: 'sha256:def' },
    { name: 'Planora.AppImage', browser_download_url: 'https://x/Planora.AppImage', digest: null },
  ],
};

describe('compareVersions', () => {
  it('compares number by number, with or without v', () => {
    expect(compareVersions('0.3.3', 'v0.3.4')).toBe(-1);
    expect(compareVersions('0.3.10', '0.3.9')).toBe(1);
    expect(compareVersions('v1.0.0', '1.0.0')).toBe(0);
    expect(compareVersions('0.4', '0.3.9')).toBe(1);
  });
});

describe('pickUpdate', () => {
  it('offers the file for this platform when the release is newer', () => {
    expect(pickUpdate(release, '0.3.3', 'windows')).toEqual({
      version: '0.3.4',
      url: 'https://x/Planora-Setup.exe',
      sha256: 'abc',
    });
    expect(pickUpdate(release, '0.3.3', 'android')?.url).toBe('https://x/Planora.apk');
    expect(pickUpdate(release, '0.3.3', 'linux')?.sha256).toBeUndefined();
  });

  it('offers nothing when up to date, newer, or when the file is missing', () => {
    expect(pickUpdate(release, '0.3.4', 'windows')).toBeNull();
    expect(pickUpdate(release, '0.4.0', 'windows')).toBeNull();
    expect(pickUpdate(release, '0.3.3', 'mac-arm')).toBeNull();
  });
});
