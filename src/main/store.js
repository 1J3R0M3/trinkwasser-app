'use strict';
const { app } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

// Kleine JSON-Datei im Benutzerprofil (%APPDATA%\Trinkwasser\<name>.json).
// Geschrieben wird atomar: erst in eine Temp-Datei, dann umbenennen. So bleibt
// bei einem Absturz mitten im Schreiben die alte Datei intakt.
function filePath(name) {
  return path.join(app.getPath('userData'), `${name}.json`);
}

function readJson(name, fallback) {
  const file = filePath(name);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') {
      // Kaputte Datei nicht stillschweigend überschreiben, sondern sichern.
      console.error(`${file} konnte nicht gelesen werden:`, err.message);
      try {
        fs.renameSync(file, `${file}.broken-${Date.now()}`);
      } catch {}
    }
    return fallback;
  }
}

function writeJson(name, data) {
  const file = filePath(name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

module.exports = { readJson, writeJson, filePath };
