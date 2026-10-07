'use strict';
const { execFile } = require('node:child_process');

const LOGIN_WINDOW_MS = 3 * 60 * 1000;

// Soll die App nur im Tray starten (ohne Fenster)?
// - NSIS/ZIP: Der Autostart-Eintrag übergibt "--hidden".
// - MSIX: Die StartupTask kann keine Argumente übergeben, und ohne WinRT-Zugriff
//   lässt sich die Aktivierungsart nicht abfragen. Näherung: Läuft der Explorer
//   (= die Anmeldung) erst seit wenigen Minuten, war es sehr wahrscheinlich der
//   Autostart. Im Zweifel wird das Fenster gezeigt.
async function shouldStartHidden(argv) {
  if (argv.includes('--hidden')) return true;
  if (!process.windowsStore) return false;
  const loginAt = await explorerStartTime();
  return loginAt != null && Date.now() - loginAt < LOGIN_WINDOW_MS;
}

function explorerStartTime() {
  const script =
    "(Get-Process explorer -ErrorAction Stop | Sort-Object StartTime | Select-Object -First 1).StartTime.ToUniversalTime().ToString('o')";
  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { timeout: 5000, windowsHide: true },
      (err, stdout) => {
        const t = err ? NaN : Date.parse(String(stdout).trim());
        resolve(Number.isFinite(t) ? t : null);
      },
    );
  });
}

module.exports = { shouldStartHidden };
