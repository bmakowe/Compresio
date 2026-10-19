// Ansicht DIAGNOSE – interaktive Analyse (Zoom, Zeitraum, Messreihen ein/aus, Tooltips, synchronisierte Zeitachsen)
import { st, num, fmt, fmtDuration, fmtTime, esc } from '../util.js';
import { SERIES } from '../config.js';
import { fetchSeries, fetchEvents, fetchStats, fetchHistory, cyclesFrom, rangeWindow, modeFor } from '../data.js';
import { Chart, baseOptions, yAxis } from '../components/chart.js';
import { rangeBar, customRangeForm, wireRange, syncRangeButtons, seriesFor, extendToNow } from './diagpanel.js';
import { ThermalSection, T_ALL, DT_KEYS } from './thermal.js';

const P_KEYS = ['p_suction', 'p_stage1', 'p_stage2', 'p_final', 'p_cascade'];
const T_KEYS = [...T_ALL, ...DT_KEYS];
const I_KEYS = ['current', 'current_l1', 'current_l2', 'current_l3'];
const AGG = { '24h': { label: '24 h', ms: 86400e3, period: 'hour' }, '7d': { label: '7 Tage', ms: 7 * 86400e3, period: 'day' },
              '30d': { label: '30 Tage', ms: 30 * 86400e3, period: 'day' }, '12m': { label: '12 Monate', ms: 365 * 86400e3, period: 'month' } };

export class DiagnoseView {
  constructor(app) {
    this.app = app; this.charts = {}; this.timer = null;
    this.norm = false; this.agg = '7d';
    this.thermal = new ThermalSection(this);
  }

  chips(keys) {
    const E = this.app.cfg.entities;
    return `<div class="chips">${keys.map((k) => E[k]
      ? `<span class="chip on clickable" data-toggle="${SERIES[k].name}"><i style="background:${SERIES[k].color}"></i>${SERIES[k].name}</span>`
      : `<span class="chip miss" title="Messgröße noch nicht vorhanden – Visualisierung vorbereitet"><i style="background:${SERIES[k].color}"></i>${SERIES[k].name}: kein Sensor</span>`).join('')}</div>`;
  }

  render() {
    return `
<div class="page">
  <section class="panel">
    <div class="dhdr"><div class="t"><ha-icon icon="mdi:stethoscope" style="--mdc-icon-size: 34px"></ha-icon><h2>Diagnose</h2>
      <span class="small muted" data-b="mode"></span></div>${rangeBar(this.app.range)}</div>
    ${customRangeForm(this.app)}
    <div class="kv kv-wide" data-kpis>
      ${[['n', 'Betriebszyklen'], ['rt', 'Gesamtlaufzeit'], ['avg', 'Ø Zyklusdauer'], ['rate', 'Ø Druckanstieg'], ['pmax', 'Max. Enddruck'], ['pe', 'Ø Enddruck (Zyklusende)'],
         ['t1', 'Max. T1'], ['t12', 'Max. T12'], ['t2', 'Max. T2'], ['t23', 'Max. T23'], ['t3', 'Max. T3'], ['trm', 'Raum min/max'], ['imax', 'Max. Motorstrom'], ['nw', 'Warnungen'], ['nf', 'Störungen']]
        .map(([k, l]) => `<div><div class="k">${l}</div><div class="v" data-k="${k}">–</div></div>`).join('')}
    </div>
    <div class="tiny" style="margin: -2px 2px 8px">Kennzahlen aus Messdaten des Zeitraums; Zyklen/Meldungen aus Ereignissen (Recorder, max. 31 Tage). Ø Druckanstieg nur über vergleichbare Zyklen. <span data-b="srcnote"></span></div>

    <div class="card chart-card"><div class="ch"><h3>Druckverlauf</h3>
      <label class="small muted" style="display:flex; gap:6px; align-items:center"><input type="checkbox" data-opt="norm" ${this.norm ? 'checked' : ''}> normalisiert (0–100 % je Messreihe)</label></div>
      ${this.chips(P_KEYS)}<div class="chart" data-c="p"></div>
      <div class="hint">Getrennte Skalen je Druckstufe (unterschiedliche Druckniveaus). Nicht vorhandene Messstellen sind als „kein Sensor“ markiert (Ausstattung: System). Druckverhältnisse der Stufen sind nur mit Zwischendrucksensoren auswertbar.</div></div>

    ${this.thermal.render()}

    <div class="card chart-card"><div class="ch"><h3>Motorstrom, Motorzustand und Versorgung</h3></div>${this.chips(['current', 'current_l1', 'current_l2', 'current_l3', 'voltage'])}
      <div class="chart" data-c="m"></div><div class="chart" data-c="ms"></div>
      <div class="hint">Ein veränderter Motorstrom ist allein kein Fehlernachweis – immer zusammen mit Druck, Spannung und Betriebszustand bewerten. Dreiphasige Messung (L1–L3) ist vorbereitet.</div></div>
  </section>

  <div class="cols-2">
    <div class="card chart-card"><div class="ch"><h3>Druckanstieg pro Betriebszyklus</h3><span class="small muted" data-b="rate-info"></span></div>
      <div class="chart" data-c="rc"></div>
      <div class="hint">Grün: vergleichbare Zyklen (≥ ${this.app.cfg.cycle.min_duration_s / 60} min, Δp ≥ ${this.app.cfg.cycle.min_delta_bar} bar), grau: nicht vergleichbar. Linie: gleitender Mittelwert über ${this.app.cfg.cycle.moving_avg} Zyklen. bar/min hängt u. a. von Flaschenvolumen, Anfangs-/Enddruck, Temperatur, Entnahme und parallelen Füllungen ab – siehe docs/diagnostics.md.</div></div>
    <div class="card chart-card"><div class="ch"><h3>Laufzeit je Betriebszyklus</h3><span class="small muted" data-b="cl-info"></span></div>
      <div class="chart" data-c="cl"></div><div class="hint">Je Zyklus (Ereignis „Motorstopp“) im gewählten Zeitraum. Häufige sehr kurze Zyklen oder veränderte Laufzeiten können auf veränderte Nutzung oder Probleme hindeuten.</div></div>
  </div>
  <div class="cols-2">
    <div class="card chart-card"><div class="ch"><h3>Betriebszyklen</h3>
      <div class="ranges" data-agg>${Object.entries(AGG).map(([k, v]) => `<button data-agg="${k}" class="${k === this.agg ? 'active' : ''}">${v.label}</button>`).join('')}</div></div>
      <div class="chart" data-c="cyc"></div><div class="small muted" data-b="cyc-info"></div>
      <div class="hint">Aus der Langzeitstatistik von Motorstarts und Betriebsstunden (je Stunde/Tag/Monat).</div></div>
  </div>


  <div class="card chart-card"><div class="ch"><h3>Motorstrom vs. Enddruck</h3></div>
    <div class="chart" data-c="sci"></div><div class="hint">Motorbelastung während des Druckaufbaus. Nur bei laufendem Motor, Zeiträume bis 24 h.</div></div>

  <div class="cols-2">
    <div class="card"><h3 class="ct">Sensorqualität</h3><div data-b="quality"></div></div>
    <div class="card"><h3 class="ct">Referenzbetrieb</h3><div data-b="reference"></div></div>
  </div>
</div>`;
  }

  mount(root) {
    this.root = root;
    const c = (k) => root.querySelector(`[data-c="${k}"]`);
    const g = 'kr-diag';
    this.charts.p = new Chart(c('p'), { ...baseOptions({ height: 260, id: 'dg-p', legend: false }), series: [], yaxis: [yAxis('Druck [bar]')] }, g);
    this.charts.m = new Chart(c('m'), { ...baseOptions({ height: 220, id: 'dg-m', legend: false }), series: [],
      yaxis: [yAxis('Strom [A]', { min: 0, seriesName: 'Motorstrom' }), yAxis('Strom [A]', { show: false, seriesName: 'Motorstrom' }),
              yAxis('Strom [A]', { show: false, seriesName: 'Motorstrom' }), yAxis('Strom [A]', { show: false, seriesName: 'Motorstrom' }),
              yAxis('Spannung [V]', { opposite: true, seriesName: 'Spannung' })] }, g);
    this.charts.ms = new Chart(c('ms'), { ...baseOptions({ height: 90, id: 'dg-ms', legend: false, toolbar: false }), series: [],
      stroke: { width: 2, curve: 'stepline' }, colors: ['#2f8cf0'],
      yaxis: [{ min: 0, max: 1.2, tickAmount: 1, title: { text: 'Motor', style: { color: '#a8bed0', fontWeight: 400 } },
                labels: { formatter: (v) => (v >= 1 ? 'Ein' : v <= 0 ? 'Aus' : ''), style: { fontSize: '11.5px' } } }] }, g);
    this.charts.rc = new Chart(c('rc'), { ...baseOptions({ height: 260, type: 'line', id: 'dg-rc', toolbar: true }), series: [],
      stroke: { width: [0, 0, 2.5], curve: 'smooth' }, plotOptions: { bar: { columnWidth: '60%' } },
      yaxis: [yAxis('bar/min', { min: 0, dec: 1 })], tooltip: { theme: 'dark', shared: true, intersect: false, x: { format: 'dd.MM. HH:mm' } } });
    this.charts.cl = new Chart(c('cl'), { ...baseOptions({ height: 260, type: 'bar', id: 'dg-cl' }), series: [], colors: ['#1685e5'],
      yaxis: [yAxis('Laufzeit [min]', { min: 0, dec: 0 })], tooltip: { theme: 'dark', x: { format: 'dd.MM. HH:mm' } } });
    this.charts.cyc = new Chart(c('cyc'), { ...baseOptions({ height: 260, type: 'line', id: 'dg-cyc', toolbar: true }), series: [],
      stroke: { width: [0, 2.5], curve: 'smooth' }, colors: ['#1685e5', '#20d978'],
      yaxis: [yAxis('Zyklen', { min: 0, dec: 0 }), yAxis('Laufzeit [h]', { min: 0, opposite: true, dec: 1 })] });
    const scat = (id, xT, yT) => new Chart(c(id), { ...baseOptions({ height: 260, type: 'scatter', id: 'dg-' + id, legend: false }), series: [],
      markers: { size: 3, strokeWidth: 0 }, xaxis: { type: 'numeric', title: { text: xT, style: { color: '#a8bed0', fontWeight: 400 } }, labels: { formatter: (v) => fmt(Number(v), 0) } },
      yaxis: [yAxis(yT)], tooltip: { theme: 'dark', shared: false, intersect: true } });
    this.charts.sci = scat('sci', 'Enddruck [bar]', 'Motorstrom [A]');

    wireRange(this.app, root, () => { syncRangeButtons(this.app, root); this.refresh(true); });
    root.querySelectorAll('[data-toggle]').forEach((chip) => chip.addEventListener('click', () => {
      const card = chip.closest('.chart-card'), key = card.querySelector('.chart').dataset.c, ch = this.charts[key];
      try { ch.chart.toggleSeries(chip.dataset.toggle); chip.classList.toggle('on'); } catch (e) { /* Serie ohne Daten */ }
    }));
    root.querySelector('[data-opt="norm"]').addEventListener('change', (e) => { this.norm = e.target.checked; this.drawPressure(); });
    root.querySelectorAll('[data-agg] button').forEach((b) => b.addEventListener('click', () => {
      this.agg = b.dataset.agg; root.querySelectorAll('[data-agg] button').forEach((x) => x.classList.toggle('active', x === b)); this.drawCycleStats();
    }));
    this.thermal.mount(root);
    this.refresh(true);
  }

  async refresh(force) {
    const app = this.app, cfg = app.cfg, E = cfg.entities, hass = app.hass;
    if (!hass || !this.root) return;
    clearTimeout(this.timer);
    try {
      const win = rangeWindow(app.range, app.custom), mode = modeFor(app.range, win);
      this.root.querySelector('[data-b="mode"]').textContent = mode.mode === 'history' ? 'Einzelwerte' : `Statistik (${{ '5minute': '5 min', hour: '1 h', day: '1 Tag' }[mode.period]}-Mittelwerte)`;
      const ids = [...P_KEYS, ...T_KEYS, ...I_KEYS, 'voltage'].map((k) => E[k]);
      const [ser, mot, events] = await Promise.all([
        fetchSeries(hass, ids, app.range, app.custom),
        fetchHistory(hass, [E.motor], win.start, win.end).catch(() => ({})),
        fetchEvents(hass, E.event, win.start, win.end).catch(() => []),
      ]);
      this.ser = ser; this.win = win; this.events = events; this.cycles = cyclesFrom(events, cfg);
      this.motor = extendToNow((mot[E.motor] || []).filter((p) => p[1] !== null), win.end);
      const xr = { xaxis: { type: 'datetime', min: +win.start, max: +win.end } };
      this.drawPressure();
      await this.charts.m.set([...I_KEYS.map((k) => seriesFor(cfg, k, ser.data)), seriesFor(cfg, 'voltage', ser.data)], xr);
      await this.charts.ms.set([{ name: 'Motorzustand', data: this.motor }], xr);
      // Spannung zunächst ausgeblendet (eigene Achse, sonst dominiert ihr Rauschen) – per Chip einblendbar
      if (!this._vHidden) { this._vHidden = true; try { this.charts.m.chart.hideSeries('Spannung'); } catch (e) { /* keine Daten */ } }
      const vc = this.root.querySelector('[data-toggle="Spannung"]'); if (vc) vc.classList.toggle('on', !this.charts.m.chart.w.globals.collapsedSeriesIndices.includes(4));
      this.drawRate(); this.drawCycleLengths(); this.drawCycleStats(); this.drawScatter(); this.drawKpis(); this.drawQuality(); this.drawReference();
      this.thermal.refresh(ser, win, this.cycles, this.motor).catch((e) => console.error('Thermik', e));
      const src = st(hass, E.source)?.state;
      this.root.querySelector('[data-b="srcnote"]').innerHTML = src === 'simulation' ? '<span class="badge sim">SIMULATION</span> Werte sind synthetisch.' : '';
    } catch (e) {
      console.error('Diagnose', e); app.toast('Diagnose konnte nicht geladen werden: ' + (e.message || e));
    }
    const ms = { '1h': 60e3, '6h': 120e3, '24h': 300e3 }[app.range];
    if (ms) this.timer = setTimeout(() => this.refresh(), ms);
  }

  async drawPressure() {
    if (!this.ser) return;
    const cfg = this.app.cfg, d = this.ser.data;
    let series = P_KEYS.map((k) => seriesFor(cfg, k, d));
    const yaxes = [];
    if (this.norm) {
      series = series.map((s) => {
        const vals = s.data.map((p) => p[1]).filter((v) => v !== null);
        const mn = Math.min(...vals), mx = Math.max(...vals), span = mx - mn || 1;
        return { ...s, data: s.data.map((p) => [p[0], p[1] === null ? null : +(((p[1] - mn) / span) * 100).toFixed(1)]) };
      });
      yaxes.push(yAxis('normalisiert [%]', { min: 0, max: 100 }));
    } else {
      let side = 0;
      series.forEach((s, i) => { const has = s.data.length > 0; yaxes.push(yAxis(`${s.name} [bar]`, { seriesName: s.name, opposite: has && side++ % 2 === 1, show: has, dec: i === 0 ? 1 : 0 })); });
    }
    await this.charts.p.set(series, { yaxis: yaxes, xaxis: { type: 'datetime', min: +this.win.start, max: +this.win.end } });
  }

  async drawRate() {
    const cfg = this.app.cfg, cyc = this.cycles.filter((c) => c.rate !== null);
    const comp = cyc.filter((c) => c.comparable);
    const n = cfg.cycle.moving_avg, ma = [];
    comp.forEach((c, i) => { const w = comp.slice(Math.max(0, i - n + 1), i + 1); ma.push([c.end, +(w.reduce((s, x) => s + x.rate, 0) / w.length).toFixed(2)]); });
    const ref = num(this.app.hass, cfg.entities.rate_reference);
    const ann = { yaxis: ref ? [{ y: ref, borderColor: '#55b5ff', strokeDashArray: 4, label: { text: `Referenz ${fmt(ref, 1)} bar/min`, style: { background: '#0d2030', color: '#55b5ff' }, borderWidth: 0 } }] : [] };
    const bw = (n) => ({ plotOptions: { bar: { columnWidth: n <= 4 ? '4%' : n <= 15 ? '30%' : '70%' } } });
    await this.charts.rc.set([
      { name: 'vergleichbar', type: 'column', color: '#20d978', data: comp.map((c) => [c.end, +c.rate.toFixed(2)]) },
      { name: 'nicht vergleichbar', type: 'column', color: '#4b5d6c', data: cyc.filter((c) => !c.comparable).map((c) => [c.end, +c.rate.toFixed(2)]) },
      { name: `gleitender Mittelwert (${n})`, type: 'line', color: '#f3f7fc', data: ma },
    ], { annotations: ann, xaxis: { type: 'datetime', min: +this.win.start, max: +this.win.end }, ...bw(cyc.length) });
    const last = comp[comp.length - 1];
    let info = `${comp.length} vergleichbare von ${cyc.length} Zyklen`;
    if (ref && last) info += ` · letzter: ${fmt(last.rate, 1)} bar/min (${last.rate >= ref ? '+' : ''}${fmt(((last.rate - ref) / ref) * 100, 0)} % zur Referenz)`;
    else if (!ref) info += ' · keine Referenz festgelegt';
    this.root.querySelector('[data-b="rate-info"]').textContent = info;
  }

  async drawCycleLengths() {
    const cyc = this.cycles;
    await this.charts.cl.set([{ name: 'Laufzeit', data: cyc.map((c) => [c.end, +(c.dur / 60).toFixed(1)]) }],
      { xaxis: { type: 'datetime', min: +this.win.start, max: +this.win.end }, plotOptions: { bar: { columnWidth: cyc.length <= 4 ? '4%' : cyc.length <= 15 ? '30%' : '70%' } } });
    const rt = cyc.reduce((s, c) => s + c.dur, 0);
    this.root.querySelector('[data-b="cl-info"]').textContent = cyc.length ? `${cyc.length} Zyklen · Ø ${fmtDuration(rt / cyc.length)}` : 'keine Zyklen im Zeitraum';
  }

  async drawCycleStats() {
    const app = this.app, E = app.cfg.entities, a = AGG[this.agg];
    const end = new Date(), start = new Date(end - a.ms);
    try {
      const s = await fetchStats(app.hass, [E.starts, E.hours], start, end, a.period, ['change']);
      const starts = (s[E.starts] || []).map((r) => [r.ts, r.change ?? 0]);
      const hours = (s[E.hours] || []).map((r) => [r.ts, +(r.change ?? 0).toFixed(2)]);
      await this.charts.cyc.set([{ name: 'Betriebszyklen', type: 'column', data: starts }, { name: 'Laufzeit [h]', type: 'line', data: hours }],
                                { xaxis: { type: 'datetime', min: +start, max: +end }, plotOptions: { bar: { columnWidth: starts.length <= 3 ? '6%' : '60%' } } });
      const n = starts.reduce((x, p) => x + p[1], 0), h = hours.reduce((x, p) => x + p[1], 0);
      this.root.querySelector('[data-b="cyc-info"]').textContent =
        `${a.label}: ${fmt(n, 0)} Zyklen · ${fmt(h, 2)} h Laufzeit · Ø Zyklusdauer ${n ? fmtDuration((h * 3600) / n) : '–'}`;
    } catch (e) { console.error(e); }
  }


  async drawScatter() {
    const app = this.app, E = app.cfg.entities;
    if (!this.ser || this.ser.mode !== 'history' || this.win.end - this.win.start > 86400e3 * 1.01) { await this.charts.sci.set([]); return; }
    const d = this.ser.data, mot = this.motor;
    const isRunning = (t) => { let v = 0; for (const p of mot) { if (p[0] > t) break; v = p[1]; } return v === 1; };
    const pair = (yId) => {
      const P = d[E.p_final] || [], Y = d[yId] || [], out = [];
      let j = 0;
      for (const [t, y] of Y) {
        if (y === null || !isRunning(t)) continue;
        while (j < P.length - 1 && P[j + 1][0] <= t) j++;
        const p = P[j]; if (p && p[1] !== null && Math.abs(p[0] - t) < 30e3) out.push([+p[1].toFixed(1), y]);
      }
      return out;
    };
    await this.charts.sci.set([{ name: 'Motorstrom', color: '#20d978', data: pair(E.current) }]);
  }

  async drawKpis() {
    const app = this.app, E = app.cfg.entities, cyc = this.cycles, ev = this.events, q = (k) => this.root.querySelector(`[data-k="${k}"]`);
    const span = this.win.end - this.win.start;
    const stats = await fetchStats(app.hass, [E.p_final, E.t1, E.t12, E.t2, E.t23, E.t3, E.tr, E.current], this.win.start, this.win.end, span <= 2 * 86400e3 ? '5minute' : 'hour', ['max', 'min']).catch(() => ({}));
    const mn = (id) => { const r = (stats[id] || []).map((x) => x.min).filter((x) => x !== null && x !== undefined); return r.length ? Math.min(...r) : null; };
    const mx = (id) => { const r = (stats[id] || []).map((x) => x.max).filter((x) => x !== null && x !== undefined); return r.length ? Math.max(...r) : null; };
    const rt = cyc.reduce((s, c) => s + c.dur, 0), comp = cyc.filter((c) => c.comparable && c.rate !== null);
    q('n').textContent = String(cyc.length);
    q('rt').textContent = cyc.length ? fmtDuration(rt) : '–';
    q('avg').textContent = cyc.length ? fmtDuration(rt / cyc.length) : '–';
    q('rate').textContent = comp.length ? `${fmt(comp.reduce((s, c) => s + c.rate, 0) / comp.length, 1)} bar/min` : '–';
    const pm = mx(E.p_final); q('pmax').textContent = pm === null ? '–' : `${fmt(pm, 1)} bar`;
    const pe = cyc.filter((c) => c.p_end !== null); q('pe').textContent = pe.length ? `${fmt(pe.reduce((s, c) => s + c.p_end, 0) / pe.length, 1)} bar` : '–';
    for (const k of ['t1', 't12', 't2', 't23', 't3']) { const v = mx(E[k]); q(k).textContent = v === null ? '–' : `${fmt(v, 1)} °C`; }
    const a = mn(E.tr), b = mx(E.tr); q('trm').textContent = a === null ? '–' : `${fmt(a, 1)} / ${fmt(b, 1)} °C`;
    const im = mx(E.current); q('imax').textContent = im === null ? '–' : `${fmt(im, 1)} A`;
    q('nw').textContent = String(ev.filter((e) => e.type === 'warnung' || e.type === 'sensorfehler').length);
    q('nf').textContent = String(ev.filter((e) => e.type === 'stoerung' || e.type === 'kommunikationsausfall').length);
  }

  drawQuality() {
    const app = this.app, hass = app.hass, cfg = app.cfg, E = cfg.entities, d = this.ser?.data || {};
    const rows = Object.entries(E.sensor_status).map(([k, sid]) => {
      const s = st(hass, sid)?.state, ent = st(hass, E[k]);
      const pts = d[E[k]] || [];
      let gaps = 0, gapMs = 0;
      for (let i = 0; i < pts.length; i++) if (pts[i][1] === null) { gaps++; gapMs += ((pts[i + 1]?.[0] ?? +this.win.end) - pts[i][0]); }
      const lvl = s === 'ok' ? 'ok' : s === 'ungueltig' ? 'warn' : 'na';
      return `<tr><td>${esc(SERIES[k]?.name || k)}</td><td class="c-${lvl}">${{ ok: 'OK', ungueltig: 'ungültig', keine_daten: 'keine Daten', nicht_vorhanden: 'nicht vorhanden' }[s] || 'unbekannt'}</td>
        <td>${ent ? fmtTime(ent.last_updated, true) : '–'}</td><td>${this.ser?.mode === 'history' ? `${gaps} (${fmtDuration(gapMs / 1000)})` : 'n/a'}</td></tr>`;
    });
    const missing = ['p_suction', 'p_stage1', 'p_stage2', 'p_cascade', 'current_l1', 'current_l2', 'current_l3'].filter((k) => !E[k]).map((k) => SERIES[k].name);
    const ev = this.events || [];
    const sv = (k) => num(hass, E.system[k]);
    this.root.querySelector('[data-b="quality"]').innerHTML = `
      <div class="cols-4" style="margin-bottom: 10px">
        <div class="stat"><div class="k">Letzter Datenempfang</div><div class="v" style="font-size:17px">${sv('data_age') === null ? '–' : `vor ${fmt(sv('data_age'), 0)} s`}</div></div>
        <div class="stat"><div class="k">Ungültige Werte</div><div class="v" style="font-size:17px">${fmt(sv('invalid'), 0)}</div><div class="s">seit Node-RED-Start</div></div>
        <div class="stat"><div class="k">Duplikate / korr. Zeitstempel</div><div class="v" style="font-size:17px">${fmt(sv('duplicates'), 0)} / ${fmt(sv('ts_fixed'), 0)}</div></div>
        <div class="stat"><div class="k">Kommunikationsabbrüche</div><div class="v" style="font-size:17px">${ev.filter((e) => e.type === 'kommunikationsausfall').length}</div><div class="s">im Zeitraum</div></div>
      </div>
      <table><thead><tr><th>Sensor</th><th>Status</th><th>Letzte Aktualisierung</th><th>Datenlücken im Zeitraum</th></tr></thead><tbody>${rows.join('')}</tbody></table>
      <div class="hint" style="margin-top:8px">Noch nicht vorhandene Messgrößen: ${missing.join(', ')}.</div>`;
  }

  drawReference() {
    const app = this.app, E = app.cfg.entities, ref = num(app.hass, E.rate_reference);
    const comp = this.cycles.filter((c) => c.comparable && c.rate !== null).slice(-10).reverse();
    const el = this.root.querySelector('[data-b="reference"]');
    el.innerHTML = `
      <div class="alertbox info" style="margin-bottom:10px">Ein Referenzbetrieb darf erst nach <b>technischer Prüfung</b> des Kompressors (Wartung, Dichtheit, Atemluftqualität) festgelegt werden.
        Er dient nur als Vergleichsbasis für Trends, nicht als Grenzwert.</div>
      <div class="stat" style="margin-bottom:10px"><div class="k">Aktuelle Referenz Druckanstieg</div><div class="v">${ref ? `${fmt(ref, 2)} bar/min` : 'nicht festgelegt'}</div></div>
      ${comp.length ? `<table><thead><tr><th>Zyklus (Ende)</th><th>Dauer</th><th>Δp</th><th>bar/min</th><th></th></tr></thead><tbody>
        ${comp.map((c) => `<tr><td>${fmtTime(c.end, true)}</td><td>${fmtDuration(c.dur)}</td><td>${fmt(c.p_start, 0)} → ${fmt(c.p_end, 0)} bar</td><td>${fmt(c.rate, 2)}</td>
          <td><button class="btn ghost" data-ref="${c.rate.toFixed(2)}" style="padding:4px 10px">Als Referenz</button></td></tr>`).join('')}</tbody></table>`
        : '<div class="hint">Keine vergleichbaren Zyklen im Zeitraum.</div>'}
      ${ref ? '<button class="btn ghost" data-ref="0" style="margin-top:10px">Referenz entfernen</button>' : ''}
      ${st(app.hass, E.source)?.state === 'simulation' ? '<div class="hint" style="margin-top:8px"><span class="badge sim">SIMULATION</span> Eine aus Simulationsdaten gesetzte Referenz muss vor dem Echtbetrieb entfernt werden.</div>' : ''}`;
    el.querySelectorAll('[data-ref]').forEach((b) => b.addEventListener('click', async () => {
      const v = Number(b.dataset.ref);
      if (!confirm(v ? `Druckanstieg ${fmt(v, 2)} bar/min als Referenz übernehmen?\nNur nach technischer Prüfung verwenden.` : 'Referenz entfernen?')) return;
      await app.hass.callService('number', 'set_value', { entity_id: E.rate_reference, value: v });
      app.toast(v ? 'Referenz gespeichert' : 'Referenz entfernt'); setTimeout(() => { this.drawReference(); this.drawRate(); }, 1500);
    }));
  }

  update() { /* zeitgesteuert über refresh() */ }
  destroy() { clearTimeout(this.timer); this.thermal.destroy(); Object.values(this.charts).forEach((c) => c.destroy()); this.charts = {}; }
}
