import { esc } from '../util.js';
// SCHEMATISCHE Darstellung eines dreistufigen Kolbenverdichters in Sternbauweise (herstellerneutral):
// drei radial angeordnete Zylinder um das Kurbelgehäuse, zwei Zwischenkühler als Kühlspiralen.
// Verdichtungsfolge (animierter Luftweg):
//   Ansaugluft → Zylinder Stufe 1 [T1] → Kühlspirale 1–2 [T12] → Zylinder Stufe 2 [T2]
//   → Kühlspirale 2–3 [T23] → Zylinder Stufe 3 [T3] → Luftaufbereitung / Enddruck
// Raumtemperatur [TR] wird außerhalb der Maschine angezeigt (Sensor nicht am Kompressor montiert).
// Optional: Speicherkaskade (drei Flaschen, Gesamtdruck) rechts unten, gespeist über die Luftaufbereitung.
// Maße/Anordnung sind schematisch und NICHT am realen Gerät verifiziert.

const C = { x: 230, y: 238 };                 // Kurbelgehäuse
const R_HEAD = 104;                           // Abstand Zylinderkopf
const STAGES = [                              // Winkel (SVG, Grad) · Zylinderbreite
  { a: 210, w: 42, n: 1 }, { a: 270, w: 34, n: 2 }, { a: 330, w: 26, n: 3 },
];

const head = (a, r = R_HEAD) => [C.x + r * Math.cos((a * Math.PI) / 180), C.y + r * Math.sin((a * Math.PI) / 180)];

function cylinder({ a, w, n }) {
  const rot = a - 270;
  let fins = '';
  for (let y = -94; y <= -46; y += 5) fins += `<rect x="${-w / 2 - 5}" y="${y}" width="${w + 10}" height="2.6" rx="1.2" fill="#b9c3cc"/>`;
  return `<g class="cyl" data-stage="${n}" transform="translate(${C.x} ${C.y}) rotate(${rot})">
    <rect x="${-w / 2}" y="-98" width="${w}" height="62" rx="4" fill="url(#cSteel)"/>${fins}
    <rect x="${-w / 2 - 4}" y="-110" width="${w + 8}" height="13" rx="3" fill="#8996a2"/>
    <text x="0" y="-40" text-anchor="middle" font-size="9" fill="#24323e" font-weight="700" transform="rotate(${-rot} 0 -40)">${n}</text></g>`;
}

/** Kühlspirale als Wendel (Ellipsen-Windungen) zwischen x0 und x1 auf Höhe y */
function coil(x0, x1, y, cls) {
  let s = `<g class="coil ${cls}">`;
  const turns = 9, step = (x1 - x0) / turns;
  s += `<path d="M ${x0} ${y} L ${x1} ${y}" stroke="#53636f" stroke-width="3"/>`;
  for (let i = 0; i <= turns; i++) {
    const x = x0 + i * step;
    s += `<ellipse cx="${x.toFixed(1)}" cy="${y}" rx="${(step * 0.42).toFixed(1)}" ry="13" fill="none" stroke="url(#cCopper)" stroke-width="3.2"/>`;
  }
  return s + '</g>';
}

/** Speicherkaskade: 1–6 stehende Flaschen im Gestell mit Sammelleitung und Manometer.
 *  1–4 in einer Reihe; 5 = 3 hinten + 2 vorn auf Lücke; 6 = 3 hinten + 3 vorn versetzt.
 *  Schulter in der Kennfarbe für Atemluft (weiß/schwarz). Manometerzeiger per JS (setCascadeGauge). */
const CW = 20, CH = 56, CCX = 380, MANIFOLD_Y = 231;
function bottle(x, top, w, h, back) {
  const m = x + w / 2, k = w / CW;                 // k: Maßstab (hintere Reihe kleiner)
  return `<g class="bottle${back ? ' back' : ''}">
    <path d="M ${m + 3.5 * k} ${top - 6 * k} L ${m + 6 * k} ${top - 6 * k} L ${m + 6 * k} ${MANIFOLD_Y}" class="casc-pipe thin"/>
    <rect x="${x}" y="${top + 6 * k}" width="${w}" height="${h - 6 * k}" rx="${3 * k}" fill="url(#cCyl)"/>
    <g clip-path="url(#cDome)"><rect x="${x}" y="${top}" width="${w}" height="${9 * k}" fill="#eef1f4"/>
      <rect x="${x + w * 0.25}" y="${top}" width="${w * 0.25}" height="${9 * k}" fill="#1d2329"/><rect x="${x + w * 0.75}" y="${top}" width="${w * 0.25}" height="${9 * k}" fill="#1d2329"/></g>
    <rect x="${x + w * 0.2}" y="${top + 11 * k}" width="${2 * k}" height="${h - 16 * k}" rx="1" fill="#fff" opacity=".28"/>
    <rect x="${m - 2 * k}" y="${top - 3 * k}" width="${4 * k}" height="${4 * k}" fill="#8d99a4"/>
    <rect x="${m - 3.5 * k}" y="${top - 8 * k}" width="${7 * k}" height="${5.5 * k}" rx="1" fill="url(#cChrome)"/>
    <rect x="${m - 5 * k}" y="${top - 10.5 * k}" width="${10 * k}" height="${2.4 * k}" rx="1.2" fill="#2b3742"/>
    <rect x="${x - 0.5}" y="${top + h - 3 * k}" width="${w + 1}" height="${3 * k}" rx="1" fill="#36424d"/></g>`;
}
function bottleRow(count, cx, bottom, k, pitch, back) {
  const w = CW * k, h = CH * k, top = bottom - h;
  const span = (count - 1) * pitch + w, x0 = cx - span / 2;
  const xs = Array.from({ length: count }, (_, i) => x0 + i * pitch);
  const strap = `<rect x="${x0 - 3}" y="${(top + h * 0.5).toFixed(1)}" width="${span + 6}" height="${2.2 * k}" rx="1" class="casc-strap"/>`;
  const posts = [x0 - 5, x0 + span + 2].map((px) => `<rect x="${px}" y="${top + 14 * k}" width="${3 * k}" height="${h - 14 * k}" class="casc-strap"/>`).join('');
  return { svg: `<g class="casc-row${back ? ' back' : ''}">${posts}${xs.map((x) => bottle(x, top, w, h, back)).join('')}${strap}</g>`, left: x0 - 5 };
}
function cascade(n) {
  n = Math.max(1, Math.min(6, Math.round(n) || 3));
  // 1–4: eine Reihe; 5/6: hintere Reihe höher und kleiner (Tiefe), vordere auf Lücke
  const rows = n <= 4 ? [bottleRow(n, CCX, 306, 1, 25, false)]
    : [bottleRow(3, n === 6 ? CCX - 5.5 : CCX, 289, 0.78, 22, true), bottleRow(n - 3, n === 6 ? CCX + 5.5 : CCX, 306, 0.86, 22, false)];
  const left = Math.min(...rows.map((r) => r.left)), gx = left - 9;
  return `<g class="casc">
    <path d="M ${gx} ${MANIFOLD_Y} L 438 ${MANIFOLD_Y}" class="casc-pipe"/>
    ${rows.map((r) => r.svg).join('')}
    <g class="casc-gauge" transform="translate(${gx} ${MANIFOLD_Y})"><circle r="8.5" fill="#e9eef2" stroke="#7d8a95" stroke-width="1.6"/>
      <path d="M -5.2 3.6 A 6.3 6.3 0 1 1 5.2 3.6" fill="none" stroke="#9aa6b1" stroke-width="1"/>
      <line class="casc-needle" x1="0" y1="0" x2="0" y2="-6" stroke="#ef5350" stroke-width="1.4" stroke-linecap="round" transform="rotate(-120)"/>
      <circle r="1.4" fill="#29323a"/></g>
  </g>`;
}
/** Manometer der Kaskade: Anteil 0–1 vom Nenndruck; null = Zeiger ausblenden */
export function setCascadeGauge(svg, frac) {
  const n = svg.querySelector('.casc-needle'); if (!n) return;
  n.style.display = frac === null ? 'none' : '';
  if (frac !== null) n.setAttribute('transform', `rotate(${(-120 + 240 * frac).toFixed(1)})`);
}

export function compressorSVG(imageUrl, label = 'KOMPRESSOR', opts = {}) {
  const [h1x, h1y] = head(210, 112), [h2x, h2y] = head(270, 112), [h3x, h3y] = head(330, 112);
  const COIL_Y = 104;
  // Luftweg in Verdichtungsfolge
  const flow = [
    `M 22 150 C 70 150, 100 160, ${h1x - 4} ${h1y + 2}`,                                           // Ansaugluft → Stufe 1
    `M ${h1x} ${h1y} C ${h1x - 4} 130, 136 ${COIL_Y}, 150 ${COIL_Y}`,                              // Stufe 1 → Kühlspirale 1–2
    `M 150 ${COIL_Y} L 204 ${COIL_Y}`,                                                              // durch Kühlspirale 1–2
    `M 204 ${COIL_Y} C 218 ${COIL_Y}, ${h2x - 6} ${h2y - 14}, ${h2x - 6} ${h2y}`,                   // → Stufe 2
    `M ${h2x + 6} ${h2y} C ${h2x + 6} ${h2y - 14}, 242 ${COIL_Y}, 256 ${COIL_Y}`,                  // Stufe 2 → Kühlspirale 2–3
    `M 256 ${COIL_Y} L 310 ${COIL_Y}`,                                                              // durch Kühlspirale 2–3
    `M 310 ${COIL_Y} C 324 ${COIL_Y}, ${h3x + 4} 130, ${h3x} ${h3y}`,                              // → Stufe 3
    `M ${h3x + 4} ${h3y + 4} C 370 ${h3y}, 400 176, 438 178`,                                      // Stufe 3 → Luftaufbereitung
    `M 476 236 L 494 236 L 494 224`,                                                                // → Füllanschluss
  ];
  const body = imageUrl
    ? `<image href="${imageUrl}" x="20" y="70" width="480" height="250" preserveAspectRatio="xMidYMid meet"/>`
    : `
  <ellipse cx="250" cy="330" rx="240" ry="13" fill="url(#cShadow)"/>
  <rect x="18" y="306" width="470" height="14" rx="3" fill="#59656f"/><rect x="18" y="306" width="470" height="4" rx="2" fill="#8b98a3"/>
  <!-- Motor mit Lüfterrad -->
  <rect x="24" y="200" width="96" height="106" rx="6" fill="url(#cBlueSide)"/>
  <rect x="24" y="200" width="96" height="10" rx="4" fill="#3d8be0"/>
  <g class="fan"><circle cx="72" cy="254" r="34" fill="#0c2f57" stroke="#3a7fcf" stroke-width="2"/>
    <g class="fan-blades" fill="#2a6cb8">
      <path d="M72 254 L72 224 A 30 30 0 0 1 94 234 Z"/><path d="M72 254 L102 254 A 30 30 0 0 1 92 276 Z"/>
      <path d="M72 254 L72 284 A 30 30 0 0 1 50 274 Z"/><path d="M72 254 L42 254 A 30 30 0 0 1 52 232 Z"/>
    </g><circle cx="72" cy="254" r="7" fill="#9fb6cc"/></g>
  <rect x="120" y="248" width="70" height="10" rx="3" fill="#7d8a95"/>
  <!-- Kurbelgehäuse mit Typschild -->
  <rect x="176" y="250" width="110" height="56" rx="5" fill="url(#cBlue)"/>
  <circle cx="${C.x}" cy="${C.y}" r="44" fill="url(#cBlue)" stroke="#4a97e6" stroke-width="2"/>
  <circle cx="${C.x}" cy="${C.y}" r="16" fill="#0d3d70" stroke="#4a97e6"/>
  <rect x="196" y="282" width="68" height="20" rx="3" fill="url(#cPanel)"/>
  <text x="230" y="291" text-anchor="middle" font-size="7.5" font-weight="800" fill="#1b2a38" font-family="Arial, sans-serif">${esc(label)}</text>
  <text x="230" y="299" text-anchor="middle" font-size="6" fill="#46525d" font-family="Arial, sans-serif">schematisch</text>
  ${STAGES.map(cylinder).join('')}
  <!-- Zwischenkühler (Kühlspiralen) -->
  ${coil(150, 204, COIL_Y, 'c12')}${coil(256, 310, COIL_Y, 'c23')}
  <!-- Verbindungsleitungen -->
  <g class="pipes" fill="none" stroke="#a7b3bd" stroke-width="5" stroke-linecap="round">${flow.filter((_, i) => ![2, 5].includes(i)).map((d) => `<path d="${d}"/>`).join('')}</g>
  <!-- Luftaufbereitung (Abscheider/Filter) und Füllanschluss -->
  <rect x="438" y="168" width="38" height="138" rx="12" fill="url(#cTower)"/><rect x="438" y="168" width="38" height="16" rx="8" fill="#3c97f0"/>
  <text x="457" y="250" text-anchor="middle" font-size="8" fill="#cfe6ff" transform="rotate(-90 457 250)">Luftaufbereitung</text>
  <circle cx="494" cy="212" r="12" fill="#e9eef2" stroke="#7d8a95" stroke-width="2"/>
  <path d="M 494 212 L 501 205" stroke="#ef5350" stroke-width="2"/><circle cx="494" cy="212" r="2" fill="#29323a"/>
  <!-- Ansaugluft -->
  <text x="20" y="142" font-size="10" fill="#8ed9d3">Ansaugluft</text>`;
  const call = (key, label, x, y, w = 88, cls = '') =>
    `<g class="callout ${cls}" data-key="${key}" transform="translate(${x} ${y})"><rect width="${w}" height="42" rx="7"/>
       <text x="9" y="16" class="cl-k">${label}</text><text x="9" y="35" class="cl-v" data-v="${key}">–</text></g>`;
  return `
<svg viewBox="6 6 514 330" class="cmp" role="img" aria-label="Schematische Darstellung des dreistufigen Sternkolbenverdichters">
  <defs>
    <linearGradient id="cBlue" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#2d7fd6"/><stop offset="1" stop-color="#14467f"/></linearGradient>
    <linearGradient id="cBlueSide" x1="0" x2="1"><stop offset="0" stop-color="#103a69"/><stop offset="1" stop-color="#1f62ad"/></linearGradient>
    <linearGradient id="cSteel" x1="0" x2="1"><stop offset="0" stop-color="#5d6b78"/><stop offset=".45" stop-color="#d6dde3"/><stop offset="1" stop-color="#6c7a87"/></linearGradient>
    <linearGradient id="cPanel" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#d9e0e6"/><stop offset="1" stop-color="#9aa6b1"/></linearGradient>
    <linearGradient id="cTower" x1="0" x2="1"><stop offset="0" stop-color="#0f4f99"/><stop offset=".5" stop-color="#2f8be8"/><stop offset="1" stop-color="#0e3f7c"/></linearGradient>
    <linearGradient id="cCyl" x1="0" x2="1"><stop offset="0" stop-color="#3e4a55"/><stop offset=".32" stop-color="#b9c4cd"/><stop offset=".55" stop-color="#7f8c98"/><stop offset="1" stop-color="#35414c"/></linearGradient>
    <linearGradient id="cChrome" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#f1f4f6"/><stop offset="1" stop-color="#8e99a3"/></linearGradient>
    <clipPath id="cDome" clipPathUnits="objectBoundingBox"><path d="M 0 1 C 0 .25 .16 0 .5 0 C .84 0 1 .25 1 1 Z"/></clipPath>
    <linearGradient id="cCopper" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#f0c9a0"/><stop offset=".5" stop-color="#c47a45"/><stop offset="1" stop-color="#7d4423"/></linearGradient>
    <radialGradient id="cShadow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
    <marker id="cArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#55b5ff"/></marker>
  </defs>
  ${body}
  <g class="flow" fill="none" stroke="#55b5ff" stroke-width="2" stroke-linecap="round" stroke-dasharray="5 8">${flow.map((d) => `<path d="${d}"/>`).join('')}</g>
  <path d="M 22 150 L 40 150" stroke="#8ed9d3" stroke-width="2" marker-end="url(#cArrow)"/>
  <!-- Verbindungslinien zu den Messstellen -->
  <g class="leaders" fill="none" stroke-width="1.3">
    <path class="ld-t1" d="M 70 166 L ${h1x - 14} ${h1y + 6}"/>
    <path class="ld-t12" d="M 142 60 L 172 ${COIL_Y - 14}"/>
    <path class="ld-t2" d="M 232 60 L ${h2x} ${h2y - 8}"/>
    <path class="ld-t23" d="M 322 60 L 288 ${COIL_Y - 14}"/>
    <path class="ld-t3" d="M 380 166 L ${h3x + 14} ${h3y + 6}"/>
    <path class="ld-p_final" d="M 474 142 L 492 199"/>
  </g>
  ${call('t12', 'T12 Kühler 1–2', 98, 18)}${call('t2', 'T2 Zylinder 2', 188, 18)}${call('t23', 'T23 Kühler 2–3', 278, 18)}
  ${call('t1', 'T1 Zylinder 1', 14, 166)}${call('t3', 'T3 Zylinder 3', 346, 124)}
  ${call('p_final', 'Enddruck', 430, 100, 86, 'small')}
  <g class="room" data-key="tr" transform="translate(430 14)"><rect width="86" height="42" rx="7"/>
    <text x="9" y="16" class="cl-k">TR Raum</text><text x="9" y="35" class="cl-v" data-v="tr">–</text></g>
  ${call('motor', 'Motor', 14, 300, 86, 'small')}
  ${opts.cascade ? cascade(opts.bottles) + call('p_cascade', 'Kaskade', 352, 186, 86, 'small') : ''}
</svg>`;
}

export const COMPRESSOR_CSS = `
.cmp .callout rect { fill: rgba(9, 23, 36, .93); stroke: #20d978; stroke-width: 1.2; }
.cmp .callout, .cmp .room { cursor: pointer; }
.cmp .callout:hover rect, .cmp .room:hover rect { fill: rgba(20, 48, 73, .96); }
.cmp .callout.na rect { stroke: #6f8496; } .cmp .callout.warn rect { stroke: #f2b544; } .cmp .callout.crit rect { stroke: #ef5350; }
.cmp .callout.small rect { stroke: #55b5ff; } .cmp .callout.small.na rect { stroke: #6f8496; }
.cmp .callout.missing rect { stroke: #6f8496; stroke-dasharray: 4 3; }
.cmp .callout.missing .cl-v { font-size: 13px; font-weight: 600; }
.cmp .leaders path.missing { stroke: #6f8496; stroke-dasharray: 3 3; }
.cmp .cl-k { font-size: 11px; fill: #c8d6e2; }
.cmp .cl-v { font-size: 16px; font-weight: 700; fill: #3cf08f; }
.cmp .callout.small .cl-v { font-size: 14.5px; fill: #55b5ff; }
.cmp .callout.na .cl-v, .cmp .callout.missing .cl-v { fill: #8a9caa; } .cmp .callout.warn .cl-v { fill: #f2b544; } .cmp .callout.crit .cl-v { fill: #ef5350; }
.cmp .room rect { fill: rgba(9, 23, 36, .6); stroke: #a8bed0; stroke-width: 1.1; stroke-dasharray: 5 3; }
.cmp .room .cl-v { font-size: 15px; font-weight: 700; fill: #e6eef5; }
.cmp .room.na .cl-v { fill: #8a9caa; }
.cmp .leaders path { stroke: #20d978; } .cmp .leaders path.na { stroke: #6f8496; } .cmp .leaders path.warn { stroke: #f2b544; } .cmp .leaders path.crit { stroke: #ef5350; }
.cmp .leaders path.ld-p_final { stroke: #55b5ff; }
.cmp .casc-pipe { stroke: #a7b3bd; stroke-width: 3.5; fill: none; stroke-linecap: round; stroke-linejoin: round; }
.cmp .casc-pipe.thin { stroke-width: 2; }
.cmp .casc-strap { fill: #4b5763; }
.cmp .casc-row.back { filter: brightness(.72); }
.cmp .flow { opacity: 0; }
.cmp.running .flow { opacity: .9; animation: flow 1s linear infinite; }
.cmp .fan-blades { transform-origin: 72px 254px; transform-box: view-box; }
.cmp.running .fan-blades { animation: spin .5s linear infinite; }
@keyframes flow { to { stroke-dashoffset: -13; } }
@keyframes spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .cmp.running .flow, .cmp.running .fan-blades { animation: none; } }
`;
