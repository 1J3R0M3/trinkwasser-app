'use strict';
const { app } = require('electron');
const path = require('node:path');

// Dateien, die Windows selbst lesen muss (z. B. das Toast-Bild), dürfen nicht
// im asar-Archiv liegen. Sie werden per "asarUnpack" ausgepackt.
function assetPath(name) {
  return path.join(app.getAppPath(), 'assets', name).replace(`app.asar${path.sep}`, `app.asar.unpacked${path.sep}`);
}

module.exports = { assetPath };
