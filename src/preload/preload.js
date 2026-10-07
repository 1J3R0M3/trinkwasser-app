'use strict';
const { contextBridge, ipcRenderer } = require('electron');

// Einzige Brücke zwischen Renderer und Main. Der Renderer bekommt nur diese
// Funktionen – kein ipcRenderer, kein Node.
function subscribe(channel, callback) {
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('api', {
  getAppInfo: () => ipcRenderer.invoke('app:info'),
  onNavigate: (cb) => subscribe('navigate', cb),

  // lang optional: Texte einer anderen Sprache nur zur Vorschau laden
  getI18n: (lang) => ipcRenderer.invoke('i18n:get', lang),
  onI18nChanged: (cb) => subscribe('i18n:changed', cb),

  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (patch) => ipcRenderer.invoke('settings:save', patch),
  onSettingsChanged: (cb) => subscribe('settings:changed', cb),
  openStartupSettings: () => ipcRenderer.invoke('autostart:openWindowsSettings'),

  getState: () => ipcRenderer.invoke('state:get'),
  onStateChanged: (cb) => subscribe('state:changed', cb),

  sendTestNotification: () => ipcRenderer.invoke('notification:test'),
});
