// Planora desktop app. Serves the built web app from a tiny local server on
// this computer only (127.0.0.1) and shows it in a hardened window. No data
// leaves the device unless the user links Microsoft or Google in the app.
const { app, BrowserWindow, Menu, Tray, dialog, ipcMain, nativeImage, session, shell } = require('electron');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const CSP = require('../csp.cjs');

const PORT = 47823; // fixed, so stored data and the sign-in redirect address stay the same
const ORIGIN = `http://localhost:${PORT}`;
const DIST = path.join(__dirname, '..', 'dist');
const ICON = path.join(__dirname, '..', 'build', 'icon.png');
const AUTH_HOSTS = new Set(['login.microsoftonline.com', 'login.live.com', 'login.microsoft.com', 'account.live.com', 'accounts.google.com']);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2',
};

// Tests run with a throwaway data folder.
if (process.env.PLANORA_USER_DATA) app.setPath('userData', process.env.PLANORA_USER_DATA);

let win = null;
let tray = null;
let quitting = false;
let pendingFiles = [];

// ---------- settings (stored next to the app data, on this device) ----------
const settingsFile = () => path.join(app.getPath('userData'), 'desktop-settings.json');
function readSettings() {
  try {
    return { closeToTray: true, openAtLogin: false, ...JSON.parse(fs.readFileSync(settingsFile(), 'utf8')) };
  } catch {
    return { closeToTray: true, openAtLogin: false };
  }
}
function writeSettings(patch) {
  const next = { ...readSettings(), ...patch };
  fs.writeFileSync(settingsFile(), JSON.stringify(next));
  app.setLoginItemSettings({ openAtLogin: next.openAtLogin, args: ['--hidden'] });
  return next;
}

// ---------- local static server ----------
function startServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, ORIGIN);
    let file = path.normalize(path.join(DIST, decodeURIComponent(url.pathname)));
    if (file !== DIST && !file.startsWith(DIST + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html');
    const ext = path.extname(file);
    res.writeHead(200, {
      'Content-Type': TYPES[ext] || 'application/octet-stream',
      'Content-Security-Policy': CSP + "; frame-ancestors 'none'",
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'max-age=31536000, immutable',
    });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

// ---------- .ics files opened with Planora ----------
function icsArgs(argv) {
  return argv.filter((a) => a.toLowerCase().endsWith('.ics') && fs.existsSync(a));
}
function deliverFiles() {
  if (!win || win.webContents.isLoading()) return;
  for (const f of pendingFiles) {
    win.webContents.send('open-file', path.basename(f), fs.readFileSync(f, 'utf8'));
  }
  pendingFiles = [];
}

// ---------- window ----------
function createWindow(hidden) {
  win = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 380,
    minHeight: 560,
    show: !hidden,
    title: 'Planora',
    icon: ICON,
    autoHideMenuBar: true,
    backgroundColor: '#f8fafc',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });
  // Sign-in windows for Microsoft/Google open inside Planora; every other link opens in the browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    let host = '';
    try {
      host = new URL(url).hostname;
    } catch {
      /* about:blank */
    }
    if (url === 'about:blank' || url.startsWith(ORIGIN) || AUTH_HOSTS.has(host)) {
      return { action: 'allow', overrideBrowserWindowOptions: { width: 520, height: 720, autoHideMenuBar: true, icon: ICON, webPreferences: { sandbox: true, contextIsolation: true } } };
    }
    if (url.startsWith('https://')) void shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(ORIGIN)) {
      event.preventDefault();
      if (url.startsWith('https://')) void shell.openExternal(url);
    }
  });
  win.webContents.on('did-finish-load', deliverFiles);
  win.on('close', (event) => {
    if (!quitting && readSettings().closeToTray) {
      event.preventDefault();
      win.hide();
    }
  });
  void win.loadURL(ORIGIN + '/');
}

function show() {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function createTray() {
  tray = new Tray(nativeImage.createFromPath(ICON).resize({ width: 16, height: 16 }));
  tray.setToolTip('Planora');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Planora', click: show },
      { type: 'separator' },
      { label: app.getLocale().startsWith('nl') ? 'Afsluiten' : 'Quit', click: () => { quitting = true; app.quit(); } },
    ]),
  );
  tray.on('click', show);
}

// ---------- IPC (only what the page needs; see preload.cjs) ----------
ipcMain.handle('save-file', async (_e, name, content) => {
  const { canceled, filePath } = await dialog.showSaveDialog(win, { defaultPath: String(name) });
  if (canceled || !filePath) return false;
  await fs.promises.writeFile(filePath, String(content), 'utf8');
  return true;
});
ipcMain.handle('get-settings', () => readSettings());
ipcMain.handle('set-settings', (_e, patch) => {
  const clean = {};
  if (typeof patch?.closeToTray === 'boolean') clean.closeToTray = patch.closeToTray;
  if (typeof patch?.openAtLogin === 'boolean') clean.openAtLogin = patch.openAtLogin;
  writeSettings(clean);
});

// ---------- startup ----------
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  pendingFiles = icsArgs(process.argv);
  app.on('second-instance', (_e, argv) => {
    pendingFiles.push(...icsArgs(argv));
    show();
    deliverFiles();
  });
  app.on('open-file', (event, file) => {
    event.preventDefault();
    pendingFiles.push(file);
    deliverFiles();
  });
  app.setAppUserModelId('app.planora');
  app.whenReady().then(async () => {
    // Only notifications may be requested; camera, microphone, location etc. are always refused.
    session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => cb(permission === 'notifications'));
    try {
      await startServer();
    } catch (err) {
      dialog.showErrorBox('Planora', `Planora kan niet starten: poort ${PORT} is al in gebruik.\n\n${err.message}`);
      app.exit(1);
      return;
    }
    Menu.setApplicationMenu(null);
    createWindow(process.argv.includes('--hidden'));
    createTray();
  });
  app.on('before-quit', () => { quitting = true; });
  app.on('activate', show);
}
