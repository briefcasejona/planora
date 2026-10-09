// Minimal, explicit bridge between the Planora page and the desktop app.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('planoraDesktop', {
  saveFile: (name, content) => ipcRenderer.invoke('save-file', String(name), String(content)),
  onOpenFile: (cb) => ipcRenderer.on('open-file', (_e, name, content) => cb(String(name), String(content))),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSettings: (s) => ipcRenderer.invoke('set-settings', s),
  onUpdateStatus: (cb) => ipcRenderer.on('update-status', (_e, status) => cb(status)),
  getUpdateStatus: () => ipcRenderer.invoke('update-status'),
  checkForUpdate: () => ipcRenderer.invoke('check-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  googleSignIn: (url, state) => ipcRenderer.invoke('google-sign-in', String(url), String(state)),
});
