import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compareVersions, pickAsset, sha256File, updateKind } from '../../electron/updater.cjs';

const release = {
  tag_name: 'v0.3.4',
  assets: [
    { name: 'Planora-Setup.exe', browser_download_url: 'https://x/setup', digest: 'sha256:aa' },
    { name: 'Planora.AppImage', browser_download_url: 'https://x/appimage', digest: 'sha256:bb' },
    { name: 'Planora-Mac-AppleSilicon.dmg', browser_download_url: 'https://x/arm', digest: null },
    { name: 'Planora-Mac-Intel.dmg', browser_download_url: 'https://x/intel', digest: null },
  ],
};

describe('desktop updater', () => {
  it('picks the right file for each computer, only when newer', () => {
    expect(pickAsset(release, '0.3.3', 'win32', 'x64')).toEqual({
      version: '0.3.4',
      url: 'https://x/setup',
      sha256: 'aa',
    });
    expect(pickAsset(release, '0.3.3', 'linux', 'x64')?.url).toBe('https://x/appimage');
    expect(pickAsset(release, '0.3.3', 'darwin', 'arm64')?.url).toBe('https://x/arm');
    expect(pickAsset(release, '0.3.3', 'darwin', 'x64')?.url).toBe('https://x/intel');
    expect(pickAsset(release, '0.3.4', 'win32', 'x64')).toBeNull();
    expect(compareVersions('0.3.10', '0.3.9')).toBe(1);
  });

  it('only replaces itself where that is possible', () => {
    expect(updateKind('win32', {})).toBe('install');
    expect(updateKind('win32', { PORTABLE_EXECUTABLE_FILE: 'C:/Planora.exe' })).toBe('notify');
    expect(updateKind('linux', { APPIMAGE: '/home/x/Planora.AppImage' })).toBe('install');
    expect(updateKind('linux', {})).toBe('notify');
    expect(updateKind('darwin', {})).toBe('notify');
  });

  it('computes the fingerprint used to refuse a changed download', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'planora-upd-'));
    const file = join(dir, 'f');
    writeFileSync(file, 'abc');
    expect(await sha256File(file)).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    writeFileSync(file, 'abd');
    expect(await sha256File(file)).not.toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});
