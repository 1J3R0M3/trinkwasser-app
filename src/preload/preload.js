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
  getI18n: () => ipcRenderer.invoke('i18n:get'),
  onI18nChanged: (cb) => subscribe('i18n:changed', cb),

  getState: () => ipcRenderer.invoke('state:get'),
  onStateChanged: (cb) => subscribe('state:changed', cb),

  sendTestNotification: () => ipcRenderer.invoke('notification:test'),
});
