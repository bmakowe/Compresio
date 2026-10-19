// Thermische Diagnose des dreistufigen Sternkolbenverdichters (Teil der Ansicht DIAGNOSE)
// Messstellen: T1, T12, T2, T23, T3 (Verdichtungsfolge) und TR (Raum).
// Grundsätze: Temperaturdifferenzen sind Diagnoseindikatoren, KEINE Messwerte der Kühlleistung.
// Es werden keine festen Fehlergrenzen verwendet – Bewertung über Vergleich ähnlicher Betriebsbedingungen.
import { num, fmt, fmtDuration, esc } from '../util.js';
import { SERIES } from '../config.js';
import { fetchHistory } from '../data.js';
import { Chart, baseOptions, yAxis } from '../components/chart.js';
import { seriesFor } from './diagpanel.js';

export const T_ALL = ['t1', 't12', 't2', 't23', 't3', 'tr'];
export const T_MACHINE = ['t1', 't12', 't2', 't23', 't3'];
export const DT_KEYS = ['dt1', 'dt2', 'dt3', 'dt12', 'dt23'];
const CYL = ['t1', 't2', 't3'], COILS = ['t12', 't23'];
const DASH = { t1: 0, t12: 5, t2: 0, t23: 5, t3: 0, tr: 2 };
const OV_METRIC = { t1: 'T1 Zylinder 1', t12: 'T12 Kühlspirale 1–2', t2: 'T2 Zylinder 2', t23: 'T23 Kühlspirale 2–3', t3: 'T3 Zylinder 3',
                    dt3: 'ΔT3 (T3 − TR)', p_final: 'Enddruck', current: 'Motorstrom' };
const OV_MODE = { start: 'ab Motorstart (Aufwärmen)', stop: 'ab Motorstopp (Abkühlen, 20 min)', rel: 'relative Laufzeit (%)' };
const OV_TR = { all: 'alle Raumtemperaturen', 2: 'Raumtemp. ±2 °C zum Referenzzyklus', 5: 'Raumtemp. ±5 °C zum Referenzzyklus' };
const WARM_MIN = 5, COOL_MIN = 10, TREND_MAX = 20;

const unitOf = (k) => (k === 'p_final' ? 'bar' : k === 'current' ? 'A' : '°C');
const opt = (o, cur) => Object.entries(o).map(([k, v]) => `<option value="${k}" ${String(k) === String(cur) ? 'selected' : ''}>${v}</option>`).join('');

export class ThermalSection {
  constructor(view) {
    this.v = view; this.app = view.app; this.charts = {};
    this.ovMetric = 't3'; this.ovMode = 'start'; this.ovTr = 'all'; this.ovRef = null;
  }

  chips(keys, chart) {
    const E = this.app.cfg.entities;
    return `<div class="chips">${keys.map((k) => E[k]
      ? `<span class="chip on clickable" data-tg="${chart}|${SERIES[k].name}"><i style="background:${SERIES[k].color}"></i>${SERIES[k].name}</span>`
      : `<span class="chip miss"><i style="background:${SERIES[k].color}"></i>${SERIES[k].name}: kein Sensor</span>`).join('')}</div>`;
  }

  render() {
    const card = (k, title, extra = '', hint = '') => `<div class="card chart-card"><div class="ch"><h3>${title}</h3>${extra}</div><div class="chart" data-c="${k}"></div>${hint ? `<div class="hint">${hint}</div>` : ''}</div>`;
    return `
  <div class="card chart-card"><div class="ch"><h3>Temperaturen – alle Messstellen</h3><span class="small muted">Verdichtungsfolge T1 → T12 → T2 → T23 → T3 · Raum TR</span></div>
    ${this.chips(T_ALL, 'ta')}<div class="chart" data-c="ta"></div>
    <div class="hint">Durchgezogen: Zylinder, gestrichelt: Kühlspiralen, gepunktet: Raumtemperatur. Absolutwerte hängen von Raumtemperatur, Laufzeit, Druckniveau und Sensorposition ab.</div></div>
  <div class="cols-2">
    ${card('tc', 'Zylindertemperaturen T1 · T2 · T3')}
    ${card('tcm', 'Maximale Zylindertemperatur pro Betriebszyklus', '', 'Je Zyklus (Ereignis „Motorstopp“). Zum Erkennen einer ungewöhnlichen Erwärmung einzelner Zylinder über die Zeit.')}
  </div>
  <div class="cols-2">
    ${card('tk', 'Zwischenkühler T12 · T23 (Kühlspiralen)')}
    ${card('tkm', 'Kühlspiralen pro Betriebszyklus (max. ΔT zur Raumtemperatur)', '', 'Veränderungen bei vergleichbaren Bedingungen können auf ein verändertes Kühlverhalten hindeuten (z. B. Verschmutzung, Lüfter) – keine direkte Kühlleistung.')}
  </div>
  <div class="cols-2">
    ${card('s1', 'Stufe 1: Zylinder T1 und Kühlspirale T12', '<span class="small muted" data-b="s1i"></span>')}
    ${card('s2', 'Stufe 2: Zylinder T2 und Kühlspirale T23', '<span class="small muted" data-b="s2i"></span>')}
  </div>
  <div class="alertbox info" style="margin-bottom: 8px">Die Differenz zwischen Zylinder- und Kühlspiralentemperatur (T1−T12, T2−T23) ist <b>kein direkter Messwert der Kühlleistung</b>.
    Ihre Aussagekraft hängt von Sensorposition, Wärmeübergang, Betriebszustand und Umgebungstemperatur ab. Bewertung nur im Vergleich ähnlicher Betriebsbedingungen.</div>
  <div class="cols-2">
    ${card('dc', 'Zylinder relativ zur Raumtemperatur: ΔT1 · ΔT2 · ΔT3')}
    ${card('dk', 'Kühlspiralen relativ zur Raumtemperatur: ΔT12 · ΔT23')}
  </div>
  <div class="card chart-card"><div class="ch"><h3>Temperaturverhalten pro Betriebszyklus</h3>
    <div style="display:flex; gap:8px; flex-wrap:wrap">
      <select data-ts="ovMetric">${opt(OV_METRIC, this.ovMetric)}</select><select data-ts="ovMode">${opt(OV_MODE, this.ovMode)}</select>
      <select data-ts="ovTr">${opt(OV_TR, this.ovTr)}</select><select data-ts="ovRef"></select></div></div>
    <div class="chart" data-c="ov"></div>
    <div class="scroll" style="max-height: 260px; margin-top: 6px" data-b="ovtab"></div>
    <div class="hint">Bis zu ${this.app.cfg.cycle.overlay_max} Zyklen übereinandergelegt, Zeitachse relativ zum Motorstart bzw. -stopp. Der Referenzzyklus ist weiß gestrichelt.
      Vergleich bevorzugt bei ähnlicher Raumtemperatur, ähnlicher Laufzeit, ähnlichem Druckverlauf und ähnlicher Ausgangstemperatur vor dem Start (Tabelle).</div></div>
  <div class="cols-2">
    ${card('tp', 'Temperaturen vs. Enddruck', '', 'Alle fünf Messstellen über dem Enddruck, nur bei laufendem Motor, Zeiträume bis 24 h. Zeigt auffällige Temperaturverhältnisse bei vergleichbarem Druck.')}
    ${card('rr', 'Einfluss der Raumtemperatur', '', 'Je Zyklus: maximale Übertemperatur ΔT (Max. − Raumtemperatur) über der mittleren Raumtemperatur. Ohne Einfluss der Raumtemperatur lägen die Punkte waagerecht.')}
  </div>
  <div class="cols-2">
    ${card('wu', `Aufwärmgeschwindigkeit (erste ${WARM_MIN} min nach Start)`, '', 'Temperaturanstieg je Zyklus in °C/min – langfristige Veränderungen deuten auf veränderte Wärmeentwicklung oder Kühlung hin.')}
    ${card('cd', `Abkühlverhalten (erste ${COOL_MIN} min nach Stopp)`, '', 'Temperaturabnahme je Zyklus in °C/min. Abhängig von Raumtemperatur und Lüfter-Nachlauf.')}
  </div>`;
  }

  mount(root) {
    this.root = root;
    const c = (k) => root.querySelector(`[data-c="${k}"]`);
    const ts = (k, h, extra = {}) => new Chart(c(k), { ...baseOptions({ height: h, id: `th-${k}`, legend: extra.legend ?? true }), series: [], yaxis: [yAxis('°C')], ...extra.o }, 'kr-diag');
    this.charts.ta = ts('ta', 260, { legend: false });
    this.charts.tc = ts('tc', 220);
    this.charts.tk = ts('tk', 220);
    this.charts.s1 = ts('s1', 220, { o: { yaxis: [yAxis('Temperatur [°C]'), yAxis('°C', { show: false }), yAxis('Differenz [°C]', { opposite: true })] } });
    this.charts.s2 = ts('s2', 220, { o: { yaxis: [yAxis('Temperatur [°C]'), yAxis('°C', { show: false }), yAxis('Differenz [°C]', { opposite: true })] } });
    this.charts.dc = ts('dc', 220, { o: { yaxis: [yAxis('ΔT [°C]')] } });
    this.charts.dk = ts('dk', 220, { o: { yaxis: [yAxis('ΔT [°C]')] } });
    const bars = (k) => new Chart(c(k), { ...baseOptions({ height: 220, type: 'bar', id: `th-${k}` }), series: [], plotOptions: { bar: { columnWidth: '60%' } },
      yaxis: [yAxis('°C', { min: 0 })], tooltip: { theme: 'dark', shared: true, intersect: false, x: { format: 'dd.MM. HH:mm' } } });
    this.charts.tcm = bars('tcm'); this.charts.tkm = bars('tkm');
    this.charts.ov = new Chart(c('ov'), { ...baseOptions({ height: 300, id: 'th-ov' }), series: [],
      xaxis: { type: 'numeric', labels: { formatter: (v) => fmt(Number(v), 0) } }, yaxis: [yAxis('')],
      tooltip: { theme: 'dark', shared: false, intersect: false, x: { formatter: (v) => fmt(Number(v), 1) } } });
    const scat = (k, xT, yT) => new Chart(c(k), { ...baseOptions({ height: 260, type: 'scatter', id: `th-${k}` }), series: [],
      markers: { size: 3, strokeWidth: 0 }, xaxis: { type: 'numeric', title: { text: xT, style: { color: '#a8bed0', fontWeight: 400 } }, labels: { formatter: (v) => fmt(Number(v), 0) } },
      yaxis: [yAxis(yT)], tooltip: { theme: 'dark', shared: false, intersect: true } });
    this.charts.tp = scat('tp', 'Enddruck [bar]', 'Temperatur [°C]');
    this.charts.rr = scat('rr', 'Raumtemperatur [°C]', 'max. ΔT [°C]');
    const trend = (k, yT) => new Chart(c(k), { ...baseOptions({ height: 230, id: `th-${k}` }), series: [], markers: { size: 4 }, stroke: { width: 1.5 },
      yaxis: [yAxis(yT, { dec: 1 })], tooltip: { theme: 'dark', shared: true, intersect: false, x: { format: 'dd.MM. HH:mm' } } });
    this.charts.wu = trend('wu', '°C/min'); this.charts.cd = trend('cd', '°C/min');
    root.querySelectorAll('[data-tg]').forEach((chip) => chip.addEventListener('click', () => {
      const [k, name] = chip.dataset.tg.split('|');
      try { this.charts[k].chart.toggleSeries(name); chip.classList.toggle('on'); } catch (e) { /* ohne Daten */ }
    }));
    root.querySelectorAll('[data-ts]').forEach((s) => s.addEventListener('change', () => { this[s.dataset.ts] = s.value; this.drawOverlay(); }));
  }

  async refresh(ser, win, cycles, motor) {
    this.ser = ser; this.win = win; this.cycles = cycles; this.motor = motor;
    const cfg = this.app.cfg, d = ser.data, xr = { xaxis: { type: 'datetime', min: +win.start, max: +win.end } };
    const S = (k, extra = {}) => ({ ...seriesFor(cfg, k, d), ...extra });
    await this.charts.ta.set(T_ALL.map((k) => S(k)), { ...xr, stroke: { width: T_ALL.map((k) => (k === 'tr' ? 1.5 : 2)), dashArray: T_ALL.map((k) => DASH[k]) } });
    await this.charts.tc.set(CYL.map((k) => S(k)), xr);
    await this.charts.tk.set(COILS.map((k) => S(k)), { ...xr, stroke: { width: 2, dashArray: 0 } });
    for (const [ch, cyl, coil] of [['s1', 't1', 't12'], ['s2', 't2', 't23']]) {
      const diff = this.diffSeries(d[cfg.entities[cyl]] || [], d[cfg.entities[coil]] || []);
      await this.charts[ch].set([S(cyl), S(coil), { name: `${SERIES[cyl].short} − ${SERIES[coil].short}`, color: '#c9d6e2', data: diff }],
                                { ...xr, stroke: { width: [2, 2, 1.4], dashArray: [0, 5, 2] } });
      const last = diff.filter((p) => p[1] !== null).slice(-1)[0];
      this.root.querySelector(`[data-b="${ch}i"]`).textContent = last ? `aktuell ${SERIES[cyl].short} − ${SERIES[coil].short} = ${fmt(last[1], 1)} °C` : '';
    }
    await this.charts.dc.set(['dt1', 'dt2', 'dt3'].map((k) => S(k)), xr);
    await this.charts.dk.set(['dt12', 'dt23'].map((k) => S(k)), { ...xr, stroke: { width: 2, dashArray: 0 } });
    // pro Zyklus
    const bw = { plotOptions: { bar: { columnWidth: cycles.length <= 4 ? '6%' : cycles.length <= 15 ? '40%' : '75%' } } };
    await this.charts.tcm.set(CYL.map((k) => ({ name: SERIES[k].short, color: SERIES[k].color, data: cycles.filter((c) => c.max[k] !== null).map((c) => [c.end, c.max[k]]) })),
                              { ...xr, ...bw });
    await this.charts.tkm.set(COILS.map((k) => ({ name: `Δ${SERIES[k].short}`, color: SERIES[k].color,
      data: cycles.filter((c) => c.max[k] !== null && c.tr !== null).map((c) => [c.end, +(c.max[k] - c.tr).toFixed(1)]) })), { ...xr, ...bw });
    await this.charts.rr.set(['t1', 't2', 't3', 't12', 't23'].map((k) => ({ name: `Δ${SERIES[k].short}`, color: SERIES[k].color,
      data: cycles.filter((c) => c.max[k] !== null && c.tr !== null).map((c) => [+c.tr.toFixed(1), +(c.max[k] - c.tr).toFixed(1)]) })));
    this.drawScatter(); this.fillRefSelect(); this.drawOverlay(); this.drawRates();
  }

  diffSeries(a, b) {
    // b zeitlich zu a zuordnen (nächster Wert ≤ 30 s)
    const out = []; let j = 0;
    for (const [t, v] of a) {
      while (j < b.length - 1 && b[j + 1][0] <= t) j++;
      const w = b[j];
      out.push([t, v === null || !w || w[1] === null || Math.abs(w[0] - t) > 30e3 ? null : +(v - w[1]).toFixed(1)]);
    }
    return out;
  }

  async drawScatter() {
    const E = this.app.cfg.entities, ser = this.ser;
    if (ser.mode !== 'history' || this.win.end - this.win.start > 86400e3 * 1.01) { await this.charts.tp.set([]); return; }
    const mot = this.motor, P = ser.data[E.p_final] || [];
    const running = (t) => { let v = 0; for (const p of mot) { if (p[0] > t) break; v = p[1]; } return v === 1; };
    const series = T_MACHINE.filter((k) => E[k]).map((k) => {
      const Y = ser.data[E[k]] || [], out = []; let j = 0;
      for (const [t, y] of Y) {
        if (y === null || !running(t)) continue;
        while (j < P.length - 1 && P[j + 1][0] <= t) j++;
        const p = P[j]; if (p && p[1] !== null && Math.abs(p[0] - t) < 30e3) out.push([+p[1].toFixed(1), y]);
      }
      return { name: SERIES[k].short, color: SERIES[k].color, data: out };
    });
    await this.charts.tp.set(series);
  }

  fillRefSelect() {
    const sel = this.root.querySelector('[data-ts="ovRef"]');
    const cyc = this.cycles.slice(-30).reverse();
    if (!this.ovRef || !cyc.some((c) => String(c.start) === String(this.ovRef))) this.ovRef = cyc[0] ? String(cyc[0].start) : null;
    sel.innerHTML = cyc.length ? cyc.map((c) => `<option value="${c.start}" ${String(c.start) === this.ovRef ? 'selected' : ''}>Referenz: ${label(c)}${c.tr !== null ? ` · TR ${fmt(c.tr, 1)} °C` : ''}</option>`).join('')
      : '<option>keine Zyklen im Zeitraum</option>';
  }

  selectedCycles() {
    const ref = this.cycles.find((c) => String(c.start) === String(this.ovRef));
    let list = this.cycles;
    if (this.ovTr !== 'all' && ref && ref.tr !== null) list = list.filter((c) => c.tr !== null && Math.abs(c.tr - ref.tr) <= Number(this.ovTr));
    list = list.filter((c) => c !== ref).slice(-(this.app.cfg.cycle.overlay_max - 1));
    return { ref, list: ref ? [...list, ref] : list };
  }

  async drawOverlay() {
    const E = this.app.cfg.entities, metric = this.ovMetric, mode = this.ovMode, id = E[metric];
    const { ref, list } = this.selectedCycles();
    const unit = unitOf(metric);
    this.drawTable(ref, list);
    if (!list.length || !id) { await this.charts.ov.set([], { yaxis: [yAxis(unit)] }); return; }
    const after = 20 * 60e3;
    const hist = await Promise.all(list.map((c) => {
      const s = mode === 'stop' ? c.end : c.start, e = mode === 'stop' ? c.end + after : c.end;
      return fetchHistory(this.app.hass, [id], new Date(s), new Date(Math.min(e, Date.now()))).then((h) => ({ c, pts: h[id] || [], s }));
    }));
    const palette = ['#55b5ff', '#20d978', '#f2b544', '#ef5350', '#c77dff', '#8ed9d3', '#ff8a65'];
    const series = hist.map(({ c, pts, s }, i) => ({
      name: `${c === ref ? 'REF ' : ''}${label(c)}`, color: c === ref ? '#f3f7fc' : palette[i % palette.length],
      data: pts.filter((p) => p[1] !== null).map((p) => [mode === 'rel' ? +(((p[0] - c.start) / (c.end - c.start)) * 100).toFixed(2) : +((p[0] - s) / 60e3).toFixed(2), p[1]]),
    }));
    await this.charts.ov.set(series, {
      stroke: { width: series.map((s) => (s.name.startsWith('REF') ? 3 : 1.8)), dashArray: series.map((s) => (s.name.startsWith('REF') ? 6 : 0)) },
      xaxis: { type: 'numeric', min: 0, max: mode === 'rel' ? 100 : undefined, labels: { formatter: (v) => fmt(Number(v), 0) },
               title: { text: mode === 'rel' ? 'Anteil der Zykluslaufzeit [%]' : mode === 'stop' ? 'Minuten nach Motorstopp' : 'Minuten nach Motorstart', style: { color: '#a8bed0', fontWeight: 400 } } },
      yaxis: [yAxis(`${OV_METRIC[metric]} [${unit}]`)],
    });
  }

  drawTable(ref, list) {
    const el = this.root.querySelector('[data-b="ovtab"]');
    if (!list.length) { el.innerHTML = '<div class="hint">Keine Zyklen für die gewählte Auswahl.</div>'; return; }
    const dev = (v, r) => (r === null || r === undefined || v === null || v === undefined || ref === undefined ? '' : ` <span class="tiny">(${v - r >= 0 ? '+' : ''}${fmt(v - r, 1)})</span>`);
    el.innerHTML = `<table><thead><tr><th>Zyklus</th><th>Dauer</th><th>Druck</th><th>Ø Strom</th><th>TR</th><th>T1/T2/T3 vor Start</th><th>max. T1/T2/T3</th><th>max. T12/T23</th></tr></thead><tbody>
      ${[...list].reverse().map((c) => `<tr ${c === ref ? 'style="background: rgba(243,247,252,.06)"' : ''}><td style="white-space:nowrap">${c === ref ? '<b>REF</b> ' : ''}${label(c)}</td>
        <td>${fmtDuration(c.dur)}</td><td>${c.p_start !== null ? `${fmt(c.p_start, 0)}→${fmt(c.p_end, 0)} bar` : '–'}</td>
        <td>${c.i_mean !== null ? `${fmt(c.i_mean, 1)} A` : '–'}${c !== ref ? dev(c.i_mean, ref?.i_mean) : ''}</td>
        <td>${c.tr !== null ? `${fmt(c.tr, 1)} °C` : '–'}${c !== ref ? dev(c.tr, ref?.tr) : ''}</td>
        <td>${['t1', 't2', 't3'].map((k) => (c.t0[k] !== null ? fmt(c.t0[k], 0) : '–')).join(' / ')}</td>
        <td>${['t1', 't2', 't3'].map((k) => (c.max[k] !== null ? fmt(c.max[k], 0) : '–')).join(' / ')}${c !== ref && ref ? dev(c.max.t3, ref.max.t3) : ''}</td>
        <td>${['t12', 't23'].map((k) => (c.max[k] !== null ? fmt(c.max[k], 0) : '–')).join(' / ')}</td></tr>`).join('')}</tbody></table>
      <div class="tiny" style="margin-top:4px">Werte in Klammern: Abweichung zum Referenzzyklus (T3 bzw. Strom/TR). ${list.some((c) => c.source === 'sim') ? '<span class="badge sim">SIMULATION</span>' : ''}</div>`;
  }

  /** Aufwärm- und Abkühlraten je Zyklus (aus History, max. TREND_MAX Zyklen) */
  async drawRates() {
    const E = this.app.cfg.entities, hass = this.app.hass;
    const cyc = this.cycles.filter((c) => c.dur >= WARM_MIN * 60).slice(-TREND_MAX);
    const keys = ['t1', 't2', 't3', 't12', 't23'].filter((k) => E[k]);
    const ids = keys.map((k) => E[k]);
    const at = (pts, t) => { let v = null; for (const p of pts) { if (p[0] > t) break; if (p[1] !== null) v = p[1]; } return v; };
    const res = await Promise.all(cyc.map(async (c) => {
      const h = await fetchHistory(hass, ids, new Date(c.start - 60e3), new Date(Math.min(Date.now(), c.end + COOL_MIN * 60e3)));
      const warm = {}, cool = {};
      for (const k of keys) {
        const pts = h[E[k]] || [];
        const a = at(pts, c.start), b = at(pts, c.start + WARM_MIN * 60e3);
        warm[k] = a !== null && b !== null ? (b - a) / WARM_MIN : null;
        const s = at(pts, c.end), e = c.end + COOL_MIN * 60e3 <= Date.now() ? at(pts, c.end + COOL_MIN * 60e3) : null;
        cool[k] = s !== null && e !== null ? (s - e) / COOL_MIN : null;
      }
      return { c, warm, cool };
    }));
    const mk = (field) => keys.map((k) => ({ name: SERIES[k].short, color: SERIES[k].color,
      data: res.filter((r) => r[field][k] !== null).map((r) => [r.c.end, +r[field][k].toFixed(2)]) }));
    const xr = { xaxis: { type: 'datetime', min: +this.win.start, max: +this.win.end }, stroke: { width: 1.5, dashArray: keys.map((k) => DASH[k]) } };
    await this.charts.wu.set(mk('warm'), xr);
    await this.charts.cd.set(mk('cool'), xr);
  }

  destroy() { Object.values(this.charts).forEach((c) => c.destroy()); this.charts = {}; }
}

function label(c) {
  return new Date(c.start).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + ` (${fmtDuration(c.dur)})`;
}
export { esc };
