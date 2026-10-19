// Ansicht VERLÄUFE – frei wählbare Messreihen, Zeiträume bis 12 Monate (Statistik mit Min/Max)
import { esc, fmt } from '../util.js';
import { SERIES } from '../config.js';
import { fetchSeries, RANGES } from '../data.js';
import { Chart, baseOptions, yAxis } from '../components/chart.js';
import { customRangeForm, wireRange, syncRangeButtons } from './diagpanel.js';

const GROUPS = [
  ['Druck', 'bar', ['p_final', 'p_rate', 'p_suction', 'p_stage1', 'p_stage2', 'p_cascade']],
  ['Temperatur', '°C', ['t1', 't12', 't2', 't23', 't3', 'tr']],
  ['Differenz zu Raum', '°C', ['dt1', 'dt2', 'dt3', 'dt12', 'dt23']],
  ['Motor', 'A / V', ['current', 'voltage', 'current_l1', 'current_l2', 'current_l3']],
];
const KEYS = ['1h', '6h', '24h', '7d', '30d', '12m'];

export class VerlaeufeView {
  constructor(app) { this.app = app; this.charts = {}; this.sel = new Set(['p_final', 't1', 't12', 't2', 't23', 't3', 'tr', 'dt3', 'current']); this.band = true; }

  render() {
    const E = this.app.cfg.entities;
    return `
<div class="page"><section class="panel">
  <div class="dhdr"><div class="t"><ha-icon icon="mdi:chart-timeline-variant" style="--mdc-icon-size: 32px"></ha-icon><h2>Verläufe</h2><span class="small muted" data-b="mode"></span></div>
    <div style="display:flex; align-items:center">
      <div class="ranges">${KEYS.map((k) => `<button data-range="${k}" class="${this.app.range === k ? 'active' : ''}">${RANGES[k].label}</button>`).join('')}</div>
      <button class="cal ${this.app.range === 'custom' ? 'active' : ''}" data-range="custom"><ha-icon icon="mdi:calendar-month-outline"></ha-icon></button></div></div>
  ${customRangeForm(this.app)}
  <div class="card" style="margin-bottom: 8px; display: grid; gap: 8px">
    ${GROUPS.map(([g, , keys]) => `<div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap"><span class="small muted" style="width:90px">${g}</span>
      <div class="chips">${keys.map((k) => E[k]
        ? `<span class="chip ${this.sel.has(k) ? 'on' : ''}" data-k="${k}"><i style="background:${SERIES[k].color}"></i>${esc(SERIES[k].name)}</span>`
        : `<span class="chip miss" title="Noch kein Sensor"><i style="background:${SERIES[k].color}"></i>${esc(SERIES[k].name)}: kein Sensor</span>`).join('')}</div></div>`).join('')}
    <label class="small muted" style="display:flex; gap:6px; align-items:center"><input type="checkbox" data-opt="band" ${this.band ? 'checked' : ''}> Min/Max anzeigen (bei Statistik-Zeiträumen)</label>
  </div>
  ${GROUPS.map(([g, u], i) => `<div class="card chart-card"><div class="ch"><h3>${g}</h3><span class="small muted">${u}</span></div><div class="chart" data-c="g${i}"></div></div>`).join('')}
  <div class="hint">≤ 2 Tage: Einzelwerte aus dem Recorder (31 Tage). 7 d: 5-Minuten-, 30 d: Stunden-, 12 Monate: Tagesstatistik (Mittelwert, optional Min/Max).
    Vollständige Rohdaten und Langzeitarchiv: <a href="${this.app.cfg.links.grafana}" target="_top" style="color: var(--t-blue-light)">Grafana</a>.</div>
</section></div>`;
  }

  mount(root) {
    this.root = root;
    GROUPS.forEach((g, i) => {
      this.charts[i] = new Chart(root.querySelector(`[data-c="g${i}"]`), { ...baseOptions({ height: 250, id: `vl-${i}` }), series: [], yaxis: [yAxis(g[1])] }, 'kr-vl');
    });
    root.querySelectorAll('.chip[data-k]').forEach((c) => c.addEventListener('click', () => {
      const k = c.dataset.k; if (this.sel.has(k)) this.sel.delete(k); else this.sel.add(k); c.classList.toggle('on'); this.draw();
    }));
    root.querySelector('[data-opt="band"]').addEventListener('change', (e) => { this.band = e.target.checked; this.draw(); });
    wireRange(this.app, root, () => { syncRangeButtons(this.app, root); this.refresh(); });
    this.refresh();
  }

  async refresh() {
    const E = this.app.cfg.entities;
    const ids = GROUPS.flatMap((g) => g[2]).map((k) => E[k]).filter(Boolean);
    try {
      this.ser = await fetchSeries(this.app.hass, ids, this.app.range, this.app.custom);
      this.root.querySelector('[data-b="mode"]').textContent = this.ser.mode === 'history' ? 'Einzelwerte' : `Statistik (${{ '5minute': '5 min', hour: '1 h', day: '1 Tag' }[this.ser.period]})`;
      this.draw();
    } catch (e) { console.error(e); this.app.toast('Verläufe konnten nicht geladen werden'); }
  }

  async draw() {
    if (!this.ser) return;
    const E = this.app.cfg.entities;
    for (const [i, g] of GROUPS.entries()) {
      const series = [];
      for (const k of g[2]) {
        if (!E[k] || !this.sel.has(k)) continue;
        series.push({ name: SERIES[k].name, color: SERIES[k].color, data: this.ser.data[E[k]] || [] });
        if (this.band && this.ser.band && this.ser.band[E[k]]) {
          series.push({ name: `${SERIES[k].name} min`, color: SERIES[k].color, data: this.ser.band[E[k]].map((r) => [r[0], r[1]]) });
          series.push({ name: `${SERIES[k].name} max`, color: SERIES[k].color, data: this.ser.band[E[k]].map((r) => [r[0], r[2]]) });
        }
      }
      const dash = series.map((s) => (s.name.endsWith(' min') || s.name.endsWith(' max') ? 3 : 0));
      const width = series.map((s) => (s.name.endsWith(' min') || s.name.endsWith(' max') ? 1 : 2));
      await this.charts[i].set(series, { stroke: { width, dashArray: dash, curve: 'straight' }, xaxis: { type: 'datetime', min: +this.ser.win.start, max: +this.ser.win.end } });
    }
  }

  update() {}
  destroy() { Object.values(this.charts).forEach((c) => c.destroy()); this.charts = {}; }
}
