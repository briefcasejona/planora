// Minimal, explicit bridge between the Planora page and the desktop app.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('planoraDesktop', {
  saveFile: (name, content) => ipcRenderer.invoke('save-file', String(name), String(content)),
  onOpenFile: (cb) => ipcRenderer.on('open-file', (_e, name, content) => cb(String(name), String(content))),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSettings: (s) => ipcRenderer.invoke('set-settings', s),
  googleSignIn: (url, state) => ipcRenderer.invoke('google-sign-in', String(url), String(state)),
});
