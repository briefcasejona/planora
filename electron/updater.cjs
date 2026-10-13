// Updates for the desktop app, without extra libraries. Planora asks GitHub
// which release is the newest (only a version number, nothing about the user).
// Windows (installed) and Linux (AppImage): the new file is downloaded, its
// sha256 is checked against the one GitHub publishes, and it replaces the app
// on restart. Mac, and the portable Windows .exe, can't replace themselves:
// they only show that a new version is available, with a download button.
const crypto = require('node:crypto');
const fs = require('node:fs');
const https = require('node:https');
const path = require('node:path');
const childProcess = require('node:child_process');

const LATEST = 'https://api.github.com/repos/briefcasejona/planora/releases/latest';
const DOWNLOAD_PAGE = 'https://briefcasejona.github.io/planora/download.html';

function compareVersions(a, b) {
  const parts = (v) =>
    String(v)
      .replace(/^v/i, '')
      .split(/[.-]/)
      .map((x) => parseInt(x, 10) || 0);
  const pa = parts(a);
  const pb = parts(b);
  for (let i = 0; i < Math.max(pa.length, pb.length, 3); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d < 0 ? -1 : 1;
  }
  return 0;
}

/** How this copy of Planora can be updated. */
function updateKind(platform, env) {
  if (platform === 'win32') return env.PORTABLE_EXECUTABLE_FILE ? 'notify' : 'install';
  if (platform === 'linux') return env.APPIMAGE ? 'install' : 'notify';
  return 'notify';
}

function assetName(platform, arch) {
  if (platform === 'win32') return 'Planora-Setup.exe';
  if (platform === 'linux') return 'Planora.AppImage';
  return arch === 'arm64' ? 'Planora-Mac-AppleSilicon.dmg' : 'Planora-Mac-Intel.dmg';
}

/** The newer release's file for this computer, or null. */
function pickAsset(release, current, platform, arch) {
  if (!release || compareVersions(release.tag_name, current) <= 0) return null;
  const asset = (release.assets || []).find((a) => a.name === assetName(platform, arch));
  if (!asset) return null;
  const digest = typeof asset.digest === 'string' && asset.digest.startsWith('sha256:') ? asset.digest.slice(7) : null;
  return { version: String(release.tag_name).replace(/^v/i, ''), url: asset.browser_download_url, sha256: digest };
}

function sha256File(file) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    fs.createReadStream(file)
      .on('error', reject)
      .on('data', (d) => hash.update(d))
      .on('end', () => resolve(hash.digest('hex')));
  });
}

/** GET over HTTPS (following GitHub's redirects to its download servers). */
function request(url, onResponse, redirects = 5) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      { headers: { 'User-Agent': 'Planora-updater', Accept: 'application/vnd.github+json' } },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects > 0) {
          res.resume();
          resolve(request(new URL(res.headers.location, url).toString(), onResponse, redirects - 1));
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error('http-' + res.statusCode));
          return;
        }
        onResponse(res, resolve, reject);
      },
    );
    req.setTimeout(60_000, () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

const getJson = (url) =>
  request(url, (res, resolve, reject) => {
    let body = '';
    res.setEncoding('utf8');
    res.on('data', (c) => (body += c));
    res.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(e);
      }
    });
  });

const download = (url, file) =>
  request(url, (res, resolve, reject) => {
    const out = fs.createWriteStream(file);
    res.pipe(out);
    out.on('finish', () => out.close(() => resolve(file)));
    out.on('error', reject);
  });

/**
 * Start a program and wait until Windows has actually started it. Resolves with
 * the error when it couldn't (for example when antivirus or a policy blocks it):
 * Node reports some of these by throwing and others later as an 'error' event.
 */
function launch(spawn, file, args) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(file, args, { detached: true, stdio: 'ignore' });
    } catch (e) {
      resolve(e);
      return;
    }
    child.once('error', resolve);
    child.once('spawn', () => {
      child.unref();
      resolve(null);
    });
  });
}

/**
 * The updater. `send(status)` tells the window what's going on:
 * { state: 'idle'|'checking'|'none'|'available'|'downloading'|'ready'|'error', version?, lastCheck?, error?, kind }
 */
function createUpdater({
  app,
  send,
  platform = process.platform,
  arch = process.arch,
  env = process.env,
  spawn = childProcess.spawn,
  // Replaceable in tests:
  latestRelease = () => getJson(LATEST),
  fetchFile = download,
}) {
  const kind = updateKind(platform, env);
  let status = { state: 'idle', kind, current: app.getVersion() };
  let file = null;
  let busy = null;

  const set = (patch) => {
    status = { ...status, ...patch };
    send(status);
  };

  async function run() {
    const readyVersion = status.state === 'ready' && file ? status.version : null;
    set({ state: 'checking', error: undefined });
    const found = pickAsset(await latestRelease(), app.getVersion(), platform, arch);
    const lastCheck = new Date().toISOString();
    if (!found) return set({ state: 'none', lastCheck, version: undefined });
    if (kind === 'notify') return set({ state: 'available', lastCheck, version: found.version, url: DOWNLOAD_PAGE });
    if (readyVersion === found.version) return set({ state: 'ready', lastCheck });
    set({ state: 'downloading', lastCheck, version: found.version });
    const target = path.join(
      app.getPath('temp'),
      platform === 'win32' ? `Planora-Setup-${found.version}.exe` : `Planora-${found.version}.AppImage`,
    );
    await fetchFile(found.url, target);
    if (!found.sha256 || (await sha256File(target)) !== found.sha256) {
      fs.rmSync(target, { force: true });
      throw new Error('update-checksum');
    }
    file = target;
    set({ state: 'ready' });
  }

  return {
    status: () => status,
    /** Check now (never twice at the same time). */
    check() {
      if (!busy) {
        busy = run()
          .catch((e) => set({ state: 'error', error: String(e.message || e), lastCheck: new Date().toISOString() }))
          .finally(() => (busy = null));
      }
      return busy;
    },
    /**
     * Install the downloaded update. `restart`: start Planora again afterwards.
     * Resolves to false when the installer couldn't be started; the window then
     * offers the download page instead, so the button never silently does nothing.
     */
    async install(restart = true) {
      if (status.state !== 'ready' || !file) return false;
      const target = file;
      file = null; // a second click while this one is busy does nothing
      let error = null;
      if (platform === 'win32') {
        // The one-click installer installs silently over the current version. --updated: it is an
        // update, so the installer gives Planora a moment to close by itself before stopping it.
        // --force-run starts Planora again afterwards.
        const args = restart ? ['/S', '--updated', '--force-run'] : ['/S', '--updated'];
        error = await launch(spawn, target, args);
      } else {
        try {
          const appImage = env.APPIMAGE;
          fs.copyFileSync(target, appImage + '.new');
          fs.chmodSync(appImage + '.new', 0o755);
          fs.renameSync(appImage + '.new', appImage);
          if (restart) app.relaunch({ execPath: appImage });
        } catch (e) {
          error = e;
        }
      }
      if (error) {
        file = target;
        set({
          state: 'available',
          url: DOWNLOAD_PAGE,
          // Only the error code: messages can hold file paths, and with them the Windows user name.
          error: 'install-failed:' + (error.code || 'unknown'),
        });
        return false;
      }
      status = { ...status, state: 'idle' };
      return true;
    },
  };
}

module.exports = { compareVersions, updateKind, pickAsset, sha256File, createUpdater, DOWNLOAD_PAGE };
