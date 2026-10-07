'use strict';
const { app, shell } = require('electron');

// NSIS / Entwicklung: Eintrag unter HKCU\…\Run über die Electron-API.
// MSIX: Paket-Apps dürfen sich dort nicht eintragen. Der Autostart läuft über
// die StartupTask im Manifest, an- und abschalten kann ihn nur der Benutzer in
// den Windows-Einstellungen.
const isStore = () => Boolean(process.windowsStore);

function loginItemOptions(openAtLogin) {
  const args = ['--hidden'];
  if (process.defaultApp) args.unshift(app.getAppPath()); // "electron ." im Dev-Modus
  return { openAtLogin, path: process.execPath, args };
}

function apply(enabled) {
  if (process.platform !== 'win32' || isStore()) return;
  app.setLoginItemSettings(loginItemOptions(enabled));
}

function info() {
  return {
    supported: process.platform === 'win32',
    managedByWindows: isStore(),
  };
}

function openWindowsSettings() {
  return shell.openExternal('ms-settings:startupapps');
}

module.exports = { apply, info, openWindowsSettings };
