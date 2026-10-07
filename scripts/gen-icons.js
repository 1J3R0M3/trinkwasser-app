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
function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // Bittiefe
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
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

function render(size, color) {
  const rgba = Buffer.alloc(size * size * 4);
  const SS = 4;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let cov = 0, hl = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = (px + (sx + 0.5) / SS) / size;
          const y = (py + (sy + 0.5) / SS) / size;
          if (insideDrop(x, y)) {
            cov++;
            if (size >= 32 && insideHighlight(x, y)) hl++;
          }
        }
      }
      const i = (py * size + px) * 4;
      const a = cov / (SS * SS);
      const h = cov ? hl / cov : 0;
      rgba[i] = Math.round(color[0] + (255 - color[0]) * h * 0.7);
      rgba[i + 1] = Math.round(color[1] + (255 - color[1]) * h * 0.7);
      rgba[i + 2] = Math.round(color[2] + (255 - color[2]) * h * 0.7);
      rgba[i + 3] = Math.round(a * 255);
    }
  }
  return encodePng(size, rgba);
}

const BLUE = [33, 136, 229];
const files = {
  'icon.png': [256, BLUE], // Quelle für electron-builder (.ico wird daraus erzeugt)
  'toast-logo.png': [96, BLUE],
  'tray.png': [16, BLUE],
  'tray@2x.png': [32, BLUE],
};
for (const [name, [size, color]] of Object.entries(files)) {
  fs.writeFileSync(path.join(OUT, name), render(size, color));
  console.log('geschrieben:', name);
}
