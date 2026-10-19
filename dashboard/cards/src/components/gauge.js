// Halbkreis-Instrument (SVG), angelehnt an die Designvorlage.
// Skalen sind VORLÄUFIGE Darstellungsbereiche (config.gauges) – keine Betriebsgrenzen.

const CX = 100, CY = 84, R = 66, SW = 13;
const A0 = 162, A1 = 378; // Winkel (Grad) – 216°-Bogen wie in der Vorlage (Enden unterhalb der Mitte)

function pt(angle, r = R) {
  const a = (angle * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}
function arc(a0, a1, r = R) {
  const [x0, y0] = pt(a0, r), [x1, y1] = pt(a1, r);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

let gid = 0;

/** Erzeugt das statische SVG. Werte werden später mit updateGauge() gesetzt. */
export function gaugeSVG(g) {
  const id = `gg${gid++}`;
  const ticks = [];
  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const a = A0 + ((A1 - A0) * i) / steps;
    const [x0, y0] = pt(a, R - SW / 2 - 3), [x1, y1] = pt(a, R - SW / 2 - 8);
    ticks.push(`<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="#4d6478" stroke-width="1.3"/>`);
  }
  const bands = [];
  if (g.warn !== undefined && g.warn < g.max) {
    const aw = A0 + ((A1 - A0) * (g.warn - g.min)) / (g.max - g.min);
    const ac = g.crit !== undefined && g.crit < g.max ? A0 + ((A1 - A0) * (g.crit - g.min)) / (g.max - g.min) : A1;
    bands.push(`<path d="${arc(aw, ac, R + SW / 2 + 3)}" stroke="#f2b544" stroke-width="2.5" fill="none" opacity=".8"/>`);
    if (ac < A1) bands.push(`<path d="${arc(ac, A1, R + SW / 2 + 3)}" stroke="#ef5350" stroke-width="2.5" fill="none" opacity=".85"/>`);
  }
  const [lx, ly] = pt(A0, R + 4), [rx, ry] = pt(A1, R + 4);
  return `
<svg viewBox="0 0 200 122" aria-hidden="true">
  <defs>
    <linearGradient id="${id}" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" style="stop-color: var(--g-c0, #13a85a)"/><stop offset="1" style="stop-color: var(--g-c1, #3cf08f)"/>
    </linearGradient>
  </defs>
  <path d="${arc(A0, A1)}" stroke="#203a4f" stroke-width="${SW}" fill="none" stroke-linecap="round"/>
  <path class="g-val" d="${arc(A0, A0 + 0.01)}" stroke="url(#${id})" stroke-width="${SW}" fill="none" stroke-linecap="round" style="filter: drop-shadow(0 0 4px var(--g-glow, rgba(32,217,120,.45)))"/>
  ${bands.join('')}
  ${ticks.join('')}
  <text class="gs" x="${lx - 6}" y="${ly + 14}" text-anchor="middle">${g.min}</text>
  <text class="gs" x="${rx + 6}" y="${ry + 14}" text-anchor="middle">${g.max}</text>
  <text class="gv" x="100" y="106" text-anchor="middle">–</text>
</svg>`;
}

const LEVEL_COLORS = {
  ok: ['#13a85a', '#3cf08f', 'rgba(32,217,120,.45)'],
  warn: ['#c98a1c', '#f2b544', 'rgba(242,181,68,.45)'],
  crit: ['#b3221f', '#ef5350', 'rgba(239,83,80,.5)'],
  na: ['#4b5d6c', '#6f8496', 'transparent'],
};

export function updateGauge(el, g, value, level, text) {
  const svg = el.querySelector('svg');
  if (!svg) return;
  const pathEl = svg.querySelector('.g-val'), t = svg.querySelector('.gv');
  const c = LEVEL_COLORS[level] || LEVEL_COLORS.ok;
  svg.style.setProperty('--g-c0', c[0]); svg.style.setProperty('--g-c1', c[1]); svg.style.setProperty('--g-glow', c[2]);
  if (value === null || value === undefined) {
    pathEl.setAttribute('d', arc(A0, A0 + 0.01)); pathEl.style.opacity = 0;
  } else {
    const f = Math.max(0, Math.min(1, (value - g.min) / (g.max - g.min)));
    pathEl.setAttribute('d', arc(A0, A0 + Math.max(0.5, (A1 - A0) * f))); pathEl.style.opacity = 1;
  }
  if (t.textContent !== text) t.textContent = text;
}
