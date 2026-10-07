'use strict';
const { app, BrowserWindow, ipcMain, session, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { APP_ID, PROTOCOL } = require('./constants');
const { assetPath } = require('./paths');
const { createTray } = require('./tray');
const notifications = require('./notifications');
const i18n = require('./i18n');
const settings = require('./settings');
const autostart = require('./autostart');

const RENDERER_INDEX = path.join(__dirname, '..', 'renderer', 'index.html');
const isDev = process.defaultApp === true; // gestartet über "electron ."

let mainWindow = null;
let isQuitting = false;
let snoozeTimer = null;
let pendingView = null; // Ansicht, die nach dem Laden des Fensters geöffnet werden soll

const SNOOZE_MINUTES = 10;

// Getrunkene Mengen liegen noch nur im Speicher. Die Persistenz folgt in Schritt 3.
const state = { confirmedToday: 0 };

// ---------------------------------------------------------------------------
// Nur eine Instanz
// ---------------------------------------------------------------------------
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    const url = findProtocolUrl(argv);
    if (url) handleProtocolUrl(url);
    else showWindow(); // App wurde erneut gestartet -> vorhandenes Fenster zeigen
  });
  start();
}

function start() {
  setupAppUserModelId();
  registerProtocol();

  app.whenReady().then(() => {
    lockDownNetwork();

    const s = settings.load();
    i18n.setLanguage(s.language);
    autostart.apply(s.autostart);
    settings.events.on('changed', onSettingsChanged);

    registerIpc();

    createTray({
      onOpen: showWindow,
      onSettings: () => showWindow('settings'),
      onTestNotification: showReminder,
      onQuit: () => {
        isQuitting = true;
        app.quit();
      },
    });

    // Wurde die App durch Klick auf einen Toast gestartet (z. B. aus dem
    // Info-Center, nachdem sie beendet war), steht die URL in process.argv.
    const startUrl = findProtocolUrl(process.argv);
    if (startUrl) handleProtocolUrl(startUrl);
    else if (!s.setupDone || !process.argv.includes('--hidden')) showWindow();
  });

  app.on('before-quit', () => {
    isQuitting = true;
  });

  // Fenster schließen beendet die App nicht – sie läuft im Tray weiter.
  app.on('window-all-closed', () => {});
}

// ---------------------------------------------------------------------------
// AppUserModelID & Protokoll
// ---------------------------------------------------------------------------
function setupAppUserModelId() {
  if (process.platform !== 'win32') return;
  // In MSIX-Paketen vergibt Windows die AUMID aus dem Paket-Manifest
  // (PackageFamilyName!App). Eine eigene ID würde die Toasts dort kaputt machen.
  if (process.windowsStore) return;

  app.setAppUserModelId(APP_ID);

  // Unpaketierte Apps brauchen eine Startmenü-Verknüpfung mit dieser AUMID,
  // sonst zeigt Windows die Toasts nicht (zuverlässig) an. Der NSIS-Installer
  // legt sie an; im Entwicklungsmodus und für die ZIP-Version (portabel)
  // erzeugen wir sie selbst.
  const startMenu = path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs');
  if (isDev) {
    // 'create' überschreibt eine vorhandene Verknüpfung.
    shell.writeShortcutLink(path.join(startMenu, 'Trinkwasser (Dev).lnk'), 'create', {
      target: process.execPath,
      args: `"${app.getAppPath()}"`,
      appUserModelId: APP_ID,
    });
  } else if (isPortable()) {
    shell.writeShortcutLink(path.join(startMenu, 'Trinkwasser (portabel).lnk'), 'create', {
      target: process.execPath,
      appUserModelId: APP_ID,
    });
  }
}

// Der NSIS-Installer legt neben der .exe ein Deinstallationsprogramm ab.
// Fehlt es, läuft die App aus dem entpackten ZIP.
function isPortable() {
  return !fs.existsSync(path.join(path.dirname(process.execPath), `Uninstall ${app.getName()}.exe`));
}

function registerProtocol() {
  if (process.windowsStore) return; // im MSIX-Manifest deklariert
  if (isDev) {
    // Electron-Binary + Projektpfad registrieren, damit "trinkwasser://" im Dev-Modus funktioniert
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [app.getAppPath()]);
  } else {
    app.setAsDefaultProtocolClient(PROTOCOL); // schreibt nach HKCU, keine Adminrechte nötig
  }
}

function findProtocolUrl(argv) {
  return argv.find((a) => typeof a === 'string' && a.startsWith(`${PROTOCOL}://`));
}

function handleProtocolUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    return;
  }
  if (url.hostname !== 'action') return;

  const action = url.pathname.replace(/^\//, '');
  switch (action) {
    case 'open':
      showWindow();
      break;
    case 'drank':
      state.confirmedToday += 1;
      broadcastState();
      break;
    case 'snooze': {
      const min = clampInt(url.searchParams.get('min'), 1, 120, SNOOZE_MINUTES);
      clearTimeout(snoozeTimer);
      snoozeTimer = setTimeout(showReminder, min * 60 * 1000);
      break;
    }
    default:
      // Unbekannte Aktionen ignorieren – die URL kann von außen kommen.
      break;
  }
}

function clampInt(value, min, max, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

// ---------------------------------------------------------------------------
// Fenster
// ---------------------------------------------------------------------------
// view: optional "settings", um direkt die Einstellungen zu öffnen
function showWindow(view) {
  const target = typeof view === 'string' ? view : null;
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    if (target) send('navigate', target);
    return;
  }

  pendingView = target;
  mainWindow = new BrowserWindow({
    width: 560,
    height: 720,
    minWidth: 420,
    minHeight: 560,
    show: false,
    title: i18n.t('app.name'),
    icon: assetPath('icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  mainWindow.removeMenu();
  mainWindow.loadFile(RENDERER_INDEX);
  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function showReminder() {
  notifications.showReminder({ amountMl: settings.get().glassMl, snoozeMinutes: SNOOZE_MINUTES });
}

function onSettingsChanged(next, prev) {
  if (next.language !== prev.language) i18n.setLanguage(next.language);
  if (next.autostart !== prev.autostart) autostart.apply(next.autostart);
  send('settings:changed', next);
}

// ---------------------------------------------------------------------------
// IPC
// ---------------------------------------------------------------------------
function isTrustedSender(event) {
  const url = event.senderFrame?.url;
  return typeof url === 'string' && url.startsWith('file://') && decodeURIComponent(new URL(url).pathname).endsWith('/renderer/index.html');
}

function handle(channel, fn) {
  ipcMain.handle(channel, (event, ...args) => {
    if (!isTrustedSender(event)) throw new Error('Unerlaubter IPC-Aufruf');
    return fn(...args);
  });
}

function registerIpc() {
  handle('i18n:get', (lang) => {
    const l = i18n.available.includes(lang) ? lang : i18n.getLanguage();
    return { lang: l, strings: i18n.getStrings(l) };
  });
  handle('state:get', () => ({ ...state }));
  handle('settings:get', () => settings.get());
  handle('settings:save', (patch) => settings.update(patch));
  handle('app:info', () => ({ autostart: autostart.info(), limits: settings.LIMITS, initialView: takePendingView() }));
  handle('autostart:openWindowsSettings', () => autostart.openWindowsSettings());
  handle('notification:test', () => showReminder());

  i18n.events.on('changed', () => send('i18n:changed', { lang: i18n.getLanguage(), strings: i18n.getStrings() }));
}

function takePendingView() {
  const v = pendingView;
  pendingView = null;
  return v;
}

function send(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, payload);
}

function broadcastState() {
  send('state:changed', { ...state });
}

// ---------------------------------------------------------------------------
// Sicherheit: keine Netzwerkzugriffe, keine Navigation, keine Popups
// ---------------------------------------------------------------------------
function lockDownNetwork() {
  const allowed = /^(file|devtools|data|blob|chrome-extension):/;
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    callback({ cancel: !allowed.test(details.url) });
  });
  session.defaultSession.setPermissionRequestHandler((_wc, _perm, cb) => cb(false));
  session.defaultSession.setPermissionCheckHandler(() => false);

  app.on('web-contents-created', (_e, contents) => {
    contents.on('will-navigate', (e) => e.preventDefault());
    contents.on('will-attach-webview', (e) => e.preventDefault());
    contents.setWindowOpenHandler(() => ({ action: 'deny' }));
  });
}
