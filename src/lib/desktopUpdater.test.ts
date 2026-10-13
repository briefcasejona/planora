import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  compareVersions,
  createUpdater,
  DOWNLOAD_PAGE,
  pickAsset,
  sha256File,
  updateKind,
} from '../../electron/updater.cjs';

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

  describe('restart and update', () => {
    const SHA_ABC = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
    const newer = {
      tag_name: 'v9.0.0',
      assets: [{ name: 'Planora-Setup.exe', browser_download_url: 'https://x/setup', digest: `sha256:${SHA_ABC}` }],
    };

    /** A fake child process that starts (or fails to start) a moment later, like Node's. */
    function fakeChild(error?: Error) {
      const handlers: Record<string, (arg?: unknown) => void> = {};
      queueMicrotask(() => (error ? handlers.error?.(error) : handlers.spawn?.()));
      return {
        once(event: string, handler: (arg?: unknown) => void) {
          handlers[event] = handler;
        },
        unref: vi.fn(),
      };
    }

    async function readyUpdater(spawn: (file: string, args: string[], options: object) => unknown) {
      const dir = mkdtempSync(join(tmpdir(), 'planora-upd-'));
      const sent: string[] = [];
      const fetchFile = vi.fn(async (_url: string, file: string) => writeFileSync(file, 'abc'));
      const updater = createUpdater({
        app: { getVersion: () => '0.4.3', getPath: () => dir, relaunch: () => {} },
        send: (s) => sent.push(s.state),
        platform: 'win32',
        env: {},
        spawn,
        latestRelease: async () => newer,
        fetchFile,
      });
      await updater.check();
      expect(updater.status().state).toBe('ready');
      return { updater, fetchFile };
    }

    it('starts the installer as an update, and only reports success once it runs', async () => {
      const spawn = vi.fn(() => fakeChild());
      const { updater } = await readyUpdater(spawn);
      expect(await updater.install(true)).toBe(true);
      expect(spawn).toHaveBeenCalledWith(
        expect.stringContaining('Planora-Setup-9.0.0.exe'),
        ['/S', '--updated', '--force-run'],
        {
          detached: true,
          stdio: 'ignore',
        },
      );
      expect(await updater.install(true)).toBe(false); // already installing
    });

    it('offers the download page when Windows refuses to start the installer', async () => {
      const blocked = Object.assign(new Error('spawn UNKNOWN'), { code: 'UNKNOWN' });
      const { updater } = await readyUpdater(() => {
        throw blocked;
      });
      expect(await updater.install(true)).toBe(false);
      expect(updater.status()).toMatchObject({
        state: 'available',
        error: 'install-failed:UNKNOWN',
        url: DOWNLOAD_PAGE,
      });
    });

    it('also handles a failure Node reports after starting', async () => {
      const denied = Object.assign(new Error('spawn EACCES'), { code: 'EACCES' });
      const { updater } = await readyUpdater(() => fakeChild(denied));
      expect(await updater.install(true)).toBe(false);
      expect(updater.status().error).toBe('install-failed:EACCES');
    });

    it('does not download the same update again on the next check', async () => {
      const { updater, fetchFile } = await readyUpdater(() => fakeChild());
      await updater.check();
      expect(updater.status().state).toBe('ready');
      expect(fetchFile).toHaveBeenCalledTimes(1);
    });
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
