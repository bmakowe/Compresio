// Erzeugt die Compresio-Branding-Dateien in assets/branding/ (SVG von Hand definiert, PNG per Chromium gerendert).
// Aufruf: node tools/build_branding.mjs   (nutzt Playwright aus dashboard/test, vorher dort npm install)
// Der Schriftzug besteht aus eigenen Pfaden (keine Schriftart, keine Schriftlizenz nötig).
import { createRequire } from 'module';
import { writeFileSync, readFileSync, mkdirSync, statSync } from 'fs';
import { crc32 } from 'zlib';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT = join(ROOT, 'assets', 'branding');
const require = createRequire(join(ROOT, 'dashboard', 'test', 'package.json'));

// ---- Farben (Dokumentation: assets/branding/BRANDING.md) ----
export const COLORS = {
  primary: '#1685e5',     // Compresio Blue
  secondary: '#0b4f8a',   // Deep Blue
  accent: '#0f9a90',      // Signal Teal (Kontrast ≥ 3:1 auf Weiß und auf Anthrazit)
  accentLight: '#2fd6c8', // Signal Teal hell (auf Dunkel)
  blueLight: '#55b5ff',   // Blau hell (auf Dunkel)
  accentDark: '#0f8f86',  // Signal Teal dunkel (auf Hell)
  background: '#081522',  // Anthrazit-Blau
  surface: '#0d2030',
  foreground: '#f3f7fc',  // Text auf Dunkel
  ink: '#0b1b2b',         // Text auf Hell
};
const V = {
  primary: { c: COLORS.primary, p: COLORS.accent, t: COLORS.ink },
  dark: { c: COLORS.blueLight, p: COLORS.accentLight, t: COLORS.foreground },   // für dunkle Hintergründe
  light: { c: COLORS.secondary, p: COLORS.accentDark, t: COLORS.ink },          // für helle Hintergründe
};

// ---- Symbol: „C“ als Zylinderwand, einfahrender Kolben, digitale Bewegungsspur (Raster 64 × 64) ----
export const symbol = ({ c, p }, trail = true) =>
  `<path d="M47.6 16.4A22 22 0 1 0 47.6 47.6" fill="none" stroke="${c}" stroke-width="8" stroke-linecap="round"/>` +
  `<rect x="28" y="27" width="30" height="10" rx="2.5" fill="${p}"/>` +
  (trail ? `<rect x="22" y="27" width="4" height="10" rx="1.5" fill="${p}" fill-opacity=".65"/>` +
           `<rect x="16" y="27" width="3" height="10" rx="1.5" fill="${p}" fill-opacity=".35"/>` : '');

// ---- Schriftzug „Compresio“: geometrische Linienschrift, Grundlinie y=40, x-Höhe 19.5, Strichstärke 4.2 ----
const O = 'M10.5 21.6A8.4 8.4 0 1 1 10.5 38.4A8.4 8.4 0 1 1 10.5 21.6';
const GLYPHS = [   // [Zeichen, Breite, Abstand zum nächsten Zeichen, Pfad]
  ['C', 25, 2.4, 'M23.27 17.23A12.4 12.4 0 1 0 23.27 34.77'],
  ['o', 21, 3.6, O],
  ['m', 24.2, 3.6, 'M2.1 38.4V27A5 5 0 0 1 12.1 27V38.4M12.1 27A5 5 0 0 1 22.1 27V38.4'],
  ['p', 23.1, 3.4, 'M2.1 48.5V21.6M12.6 21.6A8.4 8.4 0 1 1 12.6 38.4A8.4 8.4 0 1 1 12.6 21.6'],
  ['r', 12.5, 2.6, 'M2.1 38.4V28.5A8.4 8.4 0 0 1 10.5 20.1H12.5'],
  ['e', 21, 3.4, 'M2.1 30H18.9A8.4 8.4 0 1 0 16.44 35.94'],
  ['s', 17.5, 3.6, 'M15 23.6C13.6 22.2 11.6 21.6 9 21.6C5.4 21.6 3.2 23.2 3.2 25.7C3.2 28.4 5.8 29.2 9 30C12.6 30.8 15.4 31.8 15.4 34.6C15.4 37 12.9 38.4 9.3 38.4C6.5 38.4 4.3 37.6 2.6 36'],
  ['i', 4.2, 3.6, 'M2.1 21.6V38.4'],
  ['o', 21, 0, O],
];
export function wordmark(color) {
  let x = 0, d = '', dots = '';
  for (const [ch, w, gap, path] of GLYPHS) {
    d += `<path transform="translate(${x.toFixed(1)} 0)" d="${path}"/>`;
    if (ch === 'i') dots += `<circle cx="${(x + 2.1).toFixed(1)}" cy="13.4" r="2.7" fill="${color}"/>`;
    x += w + gap;
  }
  return { width: x, svg: `<g fill="none" stroke="${color}" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round">${d}</g>${dots}` };
}

const svgDoc = (vb, body, title = 'Compresio') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img" aria-label="${title}"><title>${title}</title>${body}</svg>\n`;

export const FILES = {
  'logo.svg': svgDoc('0 0 64 64', symbol(V.primary)),
  'logo-dark.svg': svgDoc('0 0 64 64', symbol(V.dark)),
  'logo-light.svg': svgDoc('0 0 64 64', symbol(V.light)),
  // Favicon: ohne Bewegungsspur, kräftiger Strich, auf eigener Fläche (funktioniert in hellen und dunklen Browser-Tabs)
  'favicon.svg': svgDoc('0 0 64 64', `<rect width="64" height="64" rx="14" fill="${COLORS.background}"/>` +
    `<path d="M45.4 18.6A19 19 0 1 0 45.4 45.4" fill="none" stroke="${COLORS.blueLight}" stroke-width="9" stroke-linecap="round"/>` +
    `<rect x="27" y="26.5" width="28" height="11" rx="3" fill="${COLORS.accentLight}"/>`),
};
function horizontal(v) {
  // Schriftzug optisch mittig zum Symbol: Mitte zwischen Versalhöhe (11.5) und Grundlinie (40.5) = 26
  const w = wordmark(v.t), s = 1.25, gap = 14;
  const width = Math.ceil(64 + gap + w.width * s + 2);
  return svgDoc(`0 0 ${width} 64`, symbol(v) + `<g transform="translate(${64 + gap} ${32 - 26 * s}) scale(${s})">${w.svg}</g>`);
}
FILES['logo-horizontal.svg'] = horizontal(V.light);        // Standard: helle Hintergründe
FILES['logo-horizontal-dark.svg'] = horizontal(V.dark);    // dunkle Hintergründe

const socialHtml = () => {
  const w = wordmark(COLORS.foreground);
  return `<body style="margin:0;width:1280px;height:640px;overflow:hidden;background:${COLORS.background};font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif">
<svg width="1280" height="640" style="position:absolute;inset:0">
 <defs><pattern id="g" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#12293d" stroke-width="1"/></pattern></defs>
 <rect width="1280" height="640" fill="url(#g)"/>
 <path d="M0 590 C180 590 300 586 420 580 S640 572 760 568 L960 566 L985 540 L1010 600 L1030 556 L1050 566 C1120 566 1200 568 1280 568" fill="none" stroke="${COLORS.accentLight}" stroke-opacity=".22" stroke-width="3"/>
</svg>
<div style="position:absolute;left:112px;top:150px;display:flex;align-items:center;gap:56px">
 <svg width="240" height="240" viewBox="0 0 64 64">${symbol(V.dark)}</svg>
 <div>
  <svg width="${Math.ceil(w.width * 3)}" height="153" viewBox="0 9 ${w.width} 42.5">${w.svg}</svg>
  <div style="color:#c9d6e3;font-size:40px;font-weight:500;margin-top:14px">Smart Compressor Monitoring &amp; Diagnostics</div>
  <div style="color:#7f95a9;font-size:26px;margin-top:22px">Home Assistant · Node-RED · InfluxDB · Grafana</div>
 </div>
</div>
<div style="position:absolute;right:64px;top:56px;border:2px solid ${COLORS.accentLight};color:${COLORS.accentLight};font-size:22px;font-weight:700;letter-spacing:3px;padding:10px 20px;border-radius:8px">SOURCE AVAILABLE</div>
</body>`;
};

// sRGB-Chunk nach IHDR einfügen (Chromium-Screenshots enthalten keine Farbraumangabe)
function markSrgb(file) {
  const png = readFileSync(file);
  if (png.includes('sRGB')) return;
  const data = Buffer.from([0x73, 0x52, 0x47, 0x42, 0]);   // 'sRGB', Rendering Intent 0 (perzeptiv)
  const chunk = Buffer.alloc(13);
  chunk.writeUInt32BE(1, 0); data.copy(chunk, 4); chunk.writeUInt32BE(crc32(data), 9);
  writeFileSync(file, Buffer.concat([png.subarray(0, 33), chunk, png.subarray(33)]));
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  for (const [name, svg] of Object.entries(FILES)) writeFileSync(join(OUT, name), svg);
  const { chromium } = require('playwright');
  const b = await chromium.launch();
  for (const size of [512, 1024]) {
    const pg = await b.newPage({ viewport: { width: size, height: size } });
    await pg.setContent(`<body style="margin:0;background:transparent">${FILES['logo.svg'].replace('<svg ', `<svg width="${size}" height="${size}" `)}</body>`);
    await pg.screenshot({ path: join(OUT, `logo-${size}.png`), omitBackground: true });
    await pg.close();
  }
  const pg = await b.newPage({ viewport: { width: 1280, height: 640 } });
  await pg.setContent(socialHtml());
  await pg.screenshot({ path: join(OUT, 'social-preview.png') });
  await b.close();
  for (const n of ['logo-512.png', 'logo-1024.png', 'social-preview.png']) markSrgb(join(OUT, n));
  console.log('Branding erzeugt:', Object.keys(FILES).join(', '), '+ logo-512.png, logo-1024.png, social-preview.png',
    `(${(statSync(join(OUT, 'social-preview.png')).size / 1024).toFixed(0)} KB)`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
