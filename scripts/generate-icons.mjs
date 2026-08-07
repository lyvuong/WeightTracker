// Rasterizes the WeightTracker app icon (see public/favicon.svg) into the PNG sizes
// PWA installers and iOS need. Pure Node — no native image deps to install.
// Run with: npm run icons
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const SS = 4; // supersampling factor per axis, for antialiased edges

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

const VIOLET_500 = hex('#8b5cf6');
const VIOLET_700 = hex('#6d28d9');
const VIOLET_600 = hex('#7c3aed');
const VIOLET_200 = hex('#ddd6fe');
const WHITE = hex('#ffffff');

// --- geometry helpers, all in the 512x512 design space -------------------

const inRoundRect = (x, y, rx, ry, w, h, r) => {
  if (x < rx || y < ry || x > rx + w || y > ry + h) return false;
  const cx = Math.min(Math.max(x, rx + r), rx + w - r);
  const cy = Math.min(Math.max(y, ry + r), ry + h - r);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
};

const inPolygon = (x, y, pts) => {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
};

// Upper half-ring: the gauge arc on the scale's readout. Screen y grows
// downward, so "above the centre" is dy < 0.
const inUpperRing = (x, y, cx, cy, rInner, rOuter) => {
  const dy = y - cy;
  if (dy > 0) return false;
  const d = Math.hypot(x - cx, dy);
  return d >= rInner && d <= rOuter;
};

const DIAL_CX = 256;
const DIAL_CY = 236;
const needle = [[250, 238], [262, 238], [238, 200]];

const colorAt = (x, y) => {
  // Gauge needle and arc
  if (inPolygon(x, y, needle)) return VIOLET_600;
  if (inUpperRing(x, y, DIAL_CX, DIAL_CY, 28, 40)) return VIOLET_600;

  // Readout window and the two foot pads
  if (inRoundRect(x, y, 186, 168, 140, 92, 24)) return VIOLET_200;
  if (inRoundRect(x, y, 156, 296, 88, 76, 22)) return VIOLET_200;
  if (inRoundRect(x, y, 268, 296, 88, 76, 22)) return VIOLET_200;

  // Scale body, seen from above
  if (inRoundRect(x, y, 116, 116, 280, 280, 56)) return WHITE;

  // Rounded app tile with a diagonal violet gradient
  if (inRoundRect(x, y, 0, 0, 512, 512, 116)) {
    const t = (x + y) / 1024;
    return [
      Math.round(VIOLET_500[0] + (VIOLET_700[0] - VIOLET_500[0]) * t),
      Math.round(VIOLET_500[1] + (VIOLET_700[1] - VIOLET_500[1]) * t),
      Math.round(VIOLET_500[2] + (VIOLET_700[2] - VIOLET_500[2]) * t)
    ];
  }
  return null; // transparent outside the tile
};

// --- PNG encoding --------------------------------------------------------

const crcTable = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

const encodePNG = (size, pixels) => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0; // no filter
    pixels.copy(raw, rowStart + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
};

const render = (size) => {
  const pixels = Buffer.alloc(size * size * 4);
  const scale = 512 / size;
  const samples = SS * SS;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const c = colorAt((px + (sx + 0.5) / SS) * scale, (py + (sy + 0.5) / SS) * scale);
          if (c) {
            r += c[0];
            g += c[1];
            b += c[2];
            a += 255;
          }
        }
      }
      const i = (py * size + px) * 4;
      const cover = a / 255;
      pixels[i] = cover ? Math.round(r / cover) : 0;
      pixels[i + 1] = cover ? Math.round(g / cover) : 0;
      pixels[i + 2] = cover ? Math.round(b / cover) : 0;
      pixels[i + 3] = Math.round(a / samples);
    }
  }
  return encodePNG(size, pixels);
};

for (const [name, size] of [
  ['pwa-512x512.png', 512],
  ['pwa-192x192.png', 192],
  ['apple-touch-icon.png', 180],
  ['favicon-32x32.png', 32]
]) {
  writeFileSync(join(OUT_DIR, name), render(size));
  console.log(`[icons] wrote public/${name} (${size}x${size})`);
}
