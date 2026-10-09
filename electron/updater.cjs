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
const { spawn } = require('node:child_process');

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
 * The updater. `send(status)` tells the window what's going on:
 * { state: 'idle'|'checking'|'none'|'available'|'downloading'|'ready'|'error', version?, lastCheck?, error?, kind }
 */
function createUpdater({ app, send, platform = process.platform, arch = process.arch, env = process.env }) {
  const kind = updateKind(platform, env);
  let status = { state: 'idle', kind, current: app.getVersion() };
  let file = null;
  let busy = null;

  const set = (patch) => {
    status = { ...status, ...patch };
    send(status);
  };

  async function run() {
    set({ state: 'checking', error: undefined });
    const found = pickAsset(await getJson(LATEST), app.getVersion(), platform, arch);
    const lastCheck = new Date().toISOString();
    if (!found) return set({ state: 'none', lastCheck, version: undefined });
    if (kind === 'notify') return set({ state: 'available', lastCheck, version: found.version, url: DOWNLOAD_PAGE });
    if (status.state === 'ready' && status.version === found.version) return set({ lastCheck });
    set({ state: 'downloading', lastCheck, version: found.version });
    const target = path.join(
      app.getPath('temp'),
      platform === 'win32' ? `Planora-Setup-${found.version}.exe` : `Planora-${found.version}.AppImage`,
    );
    await download(found.url, target);
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
    /** Install the downloaded update. `restart`: start Planora again afterwards. */
    install(restart = true) {
      if (status.state !== 'ready' || !file) return false;
      if (platform === 'win32') {
        // The one-click installer installs silently over the current version; --force-run starts Planora again.
        spawn(file, restart ? ['/S', '--force-run'] : ['/S'], { detached: true, stdio: 'ignore' }).unref();
      } else {
        const appImage = env.APPIMAGE;
        fs.copyFileSync(file, appImage + '.new');
        fs.chmodSync(appImage + '.new', 0o755);
        fs.renameSync(appImage + '.new', appImage);
        if (restart) app.relaunch({ execPath: appImage });
      }
      file = null;
      status = { ...status, state: 'idle' };
      return true;
    },
  };
}

module.exports = { compareVersions, updateKind, pickAsset, sha256File, createUpdater, DOWNLOAD_PAGE };
