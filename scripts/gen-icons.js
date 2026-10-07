// Erzeugt die PNG-Icons (Wassertropfen) ohne externe Abhängigkeiten.
// Aufruf: node scripts/gen-icons.js
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const OUT = path.join(__dirname, '..', 'assets');

const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf) {
  let c = -1;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bittiefe
  ihdr[9] = 6; // RGBA
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0; // Filtertyp "None"
    rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Tropfen = Kreis unten + Dreieck mit Spitze oben (normierte Koordinaten 0..1).
const CX = 0.5, CY = 0.62, R = 0.32, TIP_Y = 0.06;
function insideDrop(x, y) {
  if ((x - CX) ** 2 + (y - CY) ** 2 <= R * R) return true;
  // Tangentenpunkte vom Scheitel an den Kreis
  const d = CY - TIP_Y;
  const ty = CY - (R * R) / d;
  if (y < TIP_Y || y > ty) return false;
  const halfW = (Math.sqrt(d * d - R * R) * R / d) * ((y - TIP_Y) / (ty - TIP_Y));
  return Math.abs(x - CX) <= halfW;
}
function insideHighlight(x, y) {
  const hx = 0.39, hy = 0.66, rx = 0.06, ry = 0.13;
  return ((x - hx) / rx) ** 2 + ((y - hy) / ry) ** 2 <= 1;
}

// Zeichnet den Tropfen zentriert auf eine (auch nicht quadratische) Fläche.
// dropSize: Kantenlänge des Quadrats, in das der Tropfen gezeichnet wird.
function render(width, height, dropSize, color) {
  const rgba = Buffer.alloc(width * height * 4);
  const SS = 4;
  const ox = (width - dropSize) / 2;
  const oy = (height - dropSize) / 2;
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      let cov = 0, hl = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = (px - ox + (sx + 0.5) / SS) / dropSize;
          const y = (py - oy + (sy + 0.5) / SS) / dropSize;
          if (insideDrop(x, y)) {
            cov++;
            if (dropSize >= 32 && insideHighlight(x, y)) hl++;
          }
        }
      }
      const i = (py * width + px) * 4;
      const a = cov / (SS * SS);
      const h = cov ? hl / cov : 0;
      rgba[i] = Math.round(color[0] + (255 - color[0]) * h * 0.7);
      rgba[i + 1] = Math.round(color[1] + (255 - color[1]) * h * 0.7);
      rgba[i + 2] = Math.round(color[2] + (255 - color[2]) * h * 0.7);
      rgba[i + 3] = Math.round(a * 255);
    }
  }
  return encodePng(width, height, rgba);
}

function write(dir, name, png) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), png);
  console.log('geschrieben:', path.relative(path.join(__dirname, '..'), path.join(dir, name)));
}

const BLUE = [33, 136, 229];
const square = (size, fill = 1) => render(size, size, Math.round(size * fill), BLUE);

// App-Icons (Fenster, Tray, Toast, Installer)
write(OUT, 'icon.png', square(256)); // Quelle für electron-builder (.ico wird daraus erzeugt)
write(OUT, 'toast-logo.png', square(96));
write(OUT, 'tray.png', square(16));
write(OUT, 'tray@2x.png', square(32));

// MSIX/Store-Grafiken: build/appx/<Name>.scale-<n>.png bzw. .targetsize-<n>.png.
// electron-builder erzeugt daraus mit makepri die resources.pri.
const APPX = path.join(__dirname, '..', 'build', 'appx');
for (const scale of [100, 125, 150, 200, 400]) {
  const f = scale / 100;
  write(APPX, `StoreLogo.scale-${scale}.png`, square(Math.round(50 * f), 0.9));
  write(APPX, `Square44x44Logo.scale-${scale}.png`, square(Math.round(44 * f), 0.8));
  write(APPX, `Square150x150Logo.scale-${scale}.png`, square(Math.round(150 * f), 0.5));
  write(APPX, `Wide310x150Logo.scale-${scale}.png`, render(Math.round(310 * f), Math.round(150 * f), Math.round(75 * f), BLUE));
}
// Taskleiste/Startmenü: ohne farbige Kachel ("unplated") in festen Pixelgrößen
for (const size of [16, 20, 24, 30, 32, 36, 40, 48, 60, 64, 72, 80, 96, 256]) {
  write(APPX, `Square44x44Logo.targetsize-${size}.png`, square(size, 0.9));
  write(APPX, `Square44x44Logo.targetsize-${size}_altform-unplated.png`, square(size, 0.9));
  write(APPX, `Square44x44Logo.targetsize-${size}_altform-lightunplated.png`, square(size, 0.9));
}
