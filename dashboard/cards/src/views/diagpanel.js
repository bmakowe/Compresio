// Gemeinsame Bausteine der Diagramm-Ansichten: Zeitraumauswahl, Messreihen
import { fmt, fmtDuration, num } from '../util.js';
import { SERIES } from '../config.js';
import { RANGES, fetchSeries, fetchEvents, fetchStats, cyclesFrom } from '../data.js';
import { Chart, baseOptions, yAxis } from '../components/chart.js';

export const PANEL_RANGES = ['1h', '6h', '24h', '7d', '30d'];
const REFRESH = { '1h': 30e3, '6h': 60e3, '24h': 120e3, '7d': 600e3, '30d': 900e3, custom: 0 };

export function rangeBar(active, keys = PANEL_RANGES, withCal = true) {
  return `<div style="display:flex; align-items:center">
    <div class="ranges">${keys.map((k) => `<button data-range="${k}" class="${active === k ? 'active' : ''}">${RANGES[k].label}</button>`).join('')}</div>
    ${withCal ? `<button class="cal ${active === 'custom' ? 'active' : ''}" data-range="custom" title="Benutzerdefinierter Zeitraum"><ha-icon icon="mdi:calendar-month-outline"></ha-icon></button>` : ''}
  </div>`;
}

export function customRangeForm(app) {
  const c = app.custom || { start: new Date(Date.now() - 86400e3), end: new Date() };
  const v = (d) => new Date(d - new Date().getTimezoneOffset() * 60e3).toISOString().slice(0, 16);
  return `<div class="custom-range" ${app.range === 'custom' ? '' : 'hidden'}>
    Von <input type="datetime-local" data-cr="start" value="${v(new Date(c.start))}">
    bis <input type="datetime-local" data-cr="end" value="${v(new Date(c.end))}">
    <button class="btn" data-cr="apply">Anzeigen</button><span class="tiny">Bis 2 Tage: Einzelwerte (Recorder, 31 Tage). Länger: Statistik (Mittel/Min/Max).</span></div>`;
}

export function wireRange(app, root, onChange) {
  root.querySelectorAll('[data-range]').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.range;
    if (k === 'custom') {
      const f = root.querySelector('.custom-range'); f.hidden = !f.hidden; return;
    }
    app.setRange(k); onChange();
  }));
  const ap = root.querySelector('[data-cr="apply"]');
  if (ap) ap.addEventListener('click', () => {
    const s = new Date(root.querySelector('[data-cr="start"]').value), e = new Date(root.querySelector('[data-cr="end"]').value);
    if (isNaN(s) || isNaN(e) || e <= s) { app.toast('Ungültiger Zeitraum'); return; }
    app.setRange('custom', { start: s, end: e }); onChange();
  });
}

export function syncRangeButtons(app, root) {
  root.querySelectorAll('[data-range]').forEach((b) => b.classList.toggle('active', b.dataset.range === app.range));
}

/** Serie für ApexCharts; fehlende Sensoren als leere, gekennzeichnete Serie */
export function seriesFor(cfg, key, data, type, short = false) {
  const id = cfg.entities[key], meta = SERIES[key];
  const name = id ? meta.name : short ? `${meta.name}*` : `${meta.name} (kein Sensor)`;
  const s = { name, data: id && data[id] ? data[id] : [], color: meta.color };
  if (type) s.type = type;
  return s;
}

export function extendToNow(points, end) {
  if (!points.length) return points;
  const last = points[points.length - 1];
  return last[0] < +end ? [...points, [+end, last[1]]] : points;
}
