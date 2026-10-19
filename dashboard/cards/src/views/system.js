// Ansicht SYSTEM – Host, Dienste, Datenerfassung (passend zum Kompressor-Design)
import { st, num, fmt, fmtTime, fmtAgo, esc } from '../util.js';
import { SERIES } from '../config.js';
import { gaugeSVG, updateGauge } from '../components/gauge.js';
import { fetchHistory } from '../data.js';
import { Chart, baseOptions, yAxis } from '../components/chart.js';

const HOST = [['cpu', 'CPU-Auslastung'], ['ram', 'RAM-Auslastung'], ['disk', 'Datenträger']];
const SERVICES = [['mqtt', 'MQTT-Broker', 'mdi:transit-connection-variant'], ['nodered', 'Node-RED', 'mdi:sitemap-outline'],
                  ['influx', 'InfluxDB', 'mdi:database'], ['grafana', 'Grafana', 'mdi:chart-areaspline'], ['tailscale', 'Tailscale', 'mdi:vpn']];
const G = { min: 0, max: 100, unit: '%', dec: 0, warn: 75, crit: 90 };
// Ausstattung: vorhandene Messstellen (Schalter je Sensor in Node-RED)
const EQUIP = [['Druck', ['p_suction', 'p_stage1', 'p_stage2', 'p_final', 'p_cascade']], ['Temperatur', ['t1', 't12', 't2', 't23', 't3', 'tr']],
               ['Motor', ['current', 'voltage']]];
const EQ_WARN = { current: 'Ohne Motorstrom gibt es keine Erkennung des Betriebszustands und keine Betriebsstundenzählung.',
                  p_final: 'Ohne Enddruck entfallen Druckanstieg, Zyklusdiagnose und Druckmeldungen.' };
const EQ_LABEL = { p_cascade: 'Speicherkaskade (Gesamtdruck)' };
const SS_TEXT = { ok: 'Daten OK', keine_daten: 'keine Daten', ungueltig: 'ungültig', nicht_vorhanden: '' };

export class SystemView {
  constructor(app) { this.app = app; this.charts = {}; }

  render() {
    return `
<div class="page"><section class="panel">
  <div class="dhdr"><div class="t"><ha-icon icon="mdi:server-network" style="--mdc-icon-size: 32px"></ha-icon><h2>System</h2></div>
    <span class="small muted">Home Assistant und Datenerfassung</span></div>
  <div class="cols-2">
    <div class="card"><h3 class="ct">Host</h3>
      <div class="cols-3">${HOST.map(([k, l]) => `<div class="gauge clickable" data-more="${k}" data-g="${k}"><div class="gl">${l}</div>${gaugeSVG(G)}</div>`).join('')}</div>
      <div class="cols-3" style="margin-top:6px">
        <div class="stat"><div class="k">Belegt / gesamt</div><div class="v" style="font-size:17px" data-b="disk"></div></div>
        <div class="stat"><div class="k">Last (15 min)</div><div class="v" style="font-size:17px" data-b="load"></div></div>
        <div class="stat"><div class="k">Letzter Systemstart</div><div class="v" style="font-size:15px" data-b="boot"></div></div>
      </div><div class="tiny" style="margin-top:6px">Farbmarken 75 % / 90 %: Orientierungswerte für die Anzeige.</div></div>
    <div class="card"><h3 class="ct">Dienste</h3>
      ${SERVICES.map(([k, l, i]) => `<div class="li" data-more="${k}"><ha-icon icon="${i}"></ha-icon><div style="display:flex; justify-content:space-between; gap:10px">
        <div><div class="k">${l}</div><div class="v" data-b="svc-${k}">–</div></div><div class="tiny" data-b="svc-${k}-s" style="text-align:right"></div></div></div>`).join('')}
    </div>
  </div>
  <div class="cols-4" style="margin-top:8px">
    ${[['last', 'Letzter Datenempfang'], ['db', 'Datenbankstatus'], ['buf', 'DB-Puffer'], ['rate', 'Nachrichten/min'],
       ['hb', 'Node-RED Heartbeat'], ['inv', 'Ungültige Nachrichten'], ['dup', 'Duplikate / korr. Zeitstempel'], ['up', 'Node-RED seit Deploy']]
      .map(([k, l]) => `<div class="card stat"><div class="k">${l}</div><div class="v" style="font-size:19px" data-b="${k}">–</div><div class="s" data-b="${k}-s"></div></div>`).join('')}
  </div>
  <div class="card" style="margin-top:8px"><h3 class="ct">Ausstattung <span class="small muted" style="font-weight:400">– welche Sensoren sind vorhanden?</span></h3>
    <div class="cols-3">${EQUIP.map(([g, keys]) => `<div><div class="small muted" style="margin-bottom:4px">${g}</div>
      ${keys.map((k) => `<div class="eq-row"><div><div class="k">${esc(EQ_LABEL[k] || SERIES[k].name)}</div><div class="tiny" data-b="eq-${k}-s"></div></div>
        <button class="toggle" data-eq="${k}" title="vorhanden / nicht vorhanden"></button></div>`).join('')}</div>`).join('')}</div>
    <div class="eq-casc"><label>Nenndruck Speicherkaskade [bar]<input type="number" min="0" step="1" data-i="cascade_nominal"></label>
      <button class="btn ghost" data-act="cascade">Übernehmen</button>
      <span class="tiny">für die Füllstandsanzeige (0 = nicht festgelegt), keine Betriebsgrenze</span></div>
    <div class="tiny" style="margin-top:6px">Nicht vorhandene Sensoren erzeugen keine Meldungen, werden nicht simuliert und erscheinen im Dashboard als „Kein Sensor“.</div></div>
  <div class="card chart-card" style="margin-top:8px"><div class="ch"><h3>CPU und RAM (24 h)</h3></div><div class="chart" data-c="cr"></div></div>
  <div class="hint">Weboberflächen: <a href="${this.app.cfg.links.grafana}" target="_top" style="color: var(--t-blue-light)">Grafana</a> ·
    <a href="${this.app.cfg.links.nodered}" target="_top" style="color: var(--t-blue-light)">Node-RED</a></div>
</section></div>`;
  }

  mount(root) {
    this.root = root;
    const S = this.app.cfg.entities.system;
    root.querySelectorAll('[data-more]').forEach((el) => el.addEventListener('click', () =>
      el.dispatchEvent(new CustomEvent('hass-more-info', { bubbles: true, composed: true, detail: { entityId: S[el.dataset.more] } }))));
    root.querySelectorAll('[data-eq]').forEach((el) => el.addEventListener('click', () => this.toggleEquip(el.dataset.eq)));
    root.querySelector('[data-act="cascade"]').addEventListener('click', () => this.saveNominal());
    this.charts.cr = new Chart(root.querySelector('[data-c="cr"]'), { ...baseOptions({ height: 220, id: 'sys-cr' }), series: [], yaxis: [yAxis('%', { min: 0, max: 100 })] });
    this.loadChart();
  }

  async toggleEquip(k) {
    const hass = this.app.hass, id = this.app.base.entities.equipment[k], s = st(hass, id);
    if (!s || s.state === 'unavailable') { this.app.toast('Ausstattungsschalter nicht verfügbar (Node-RED)'); return; }
    const on = s.state === 'on', name = EQ_LABEL[k] || SERIES[k].name;
    if (on && !confirm(`„${name}“ als NICHT VORHANDEN markieren?${EQ_WARN[k] ? '\n\n' + EQ_WARN[k] : ''}`)) return;
    await hass.callService('switch', on ? 'turn_off' : 'turn_on', { entity_id: id });
    this.app.toast(`${name}: ${on ? 'nicht vorhanden' : 'vorhanden'}`);
  }

  async saveNominal() {
    const el = this.root.querySelector('[data-i="cascade_nominal"]'), v = Number(el.value);
    if (!Number.isFinite(v) || v < 0 || v > 450) { this.app.toast('Nenndruck 0–450 bar'); return; }
    await this.app.hass.callService('number', 'set_value', { entity_id: this.app.base.entities.cascade_nominal, value: v });
    el.dataset.dirty = ''; this.app.toast('Nenndruck übernommen');
  }

  async loadChart() {
    const S = this.app.cfg.entities.system, end = new Date(), start = new Date(end - 86400e3);
    try {
      const h = await fetchHistory(this.app.hass, [S.cpu, S.ram], start, end);
      await this.charts.cr.set([{ name: 'CPU', color: '#55b5ff', data: h[S.cpu] || [] }, { name: 'RAM', color: '#20d978', data: h[S.ram] || [] }],
                               { xaxis: { type: 'datetime', min: +start, max: +end } });
    } catch (e) { console.error(e); }
    clearTimeout(this.timer); this.timer = setTimeout(() => this.loadChart(), 300e3);
  }

  update(hass) {
    if (!this.root) return;
    const S = this.app.cfg.entities.system, set = (k, v, cls) => { const el = this.root.querySelector(`[data-b="${k}"]`); if (el) { el.textContent = v; if (cls) el.className = cls; } };
    for (const [k] of HOST) {
      const v = num(hass, S[k]); const lvl = v === null ? 'na' : v >= 90 ? 'crit' : v >= 75 ? 'warn' : 'ok';
      updateGauge(this.root.querySelector(`[data-g="${k}"]`), G, v, lvl, v === null ? 'Keine Daten' : `${fmt(v, 0)} %`);
    }
    set('disk', `${fmt(num(hass, S.disk_used), 1)} / ${fmt(num(hass, S.disk_total), 1)} GB`);
    set('load', fmt(num(hass, S.load), 2));
    const boot = st(hass, S.boot)?.state; set('boot', boot ? fmtTime(boot, true) : '–');
    for (const [k] of SERVICES) {
      const s = st(hass, S[k]);
      const on = s?.state === 'on', known = s && (s.state === 'on' || s.state === 'off');
      set(`svc-${k}`, !known ? 'Unbekannt' : on ? 'Läuft' : 'Gestoppt', `v ${!known ? 'c-na' : on ? 'c-ok' : 'c-crit'}`);
      set(`svc-${k}-s`, s ? `seit ${fmtAgo(s.last_changed)}` : '');
    }
    const age = num(hass, S.data_age);
    set('last', age === null ? 'Keine Daten' : `vor ${fmt(age, 0)} s`, `v ${age === null ? 'c-na' : age > 60 ? 'c-crit' : 'c-ok'}`);
    set('last-s', st(hass, this.app.cfg.entities.last_update) ? fmtTime(st(hass, this.app.cfg.entities.last_update).state, true) : '');
    const db = st(hass, S.db_state)?.state;
    set('db', { ok: 'OK', schreibfehler: 'Schreibfehler', nicht_erreichbar: 'Nicht erreichbar' }[db] || 'Unbekannt', `v ${db === 'ok' ? 'c-ok' : db === 'schreibfehler' ? 'c-warn' : db === 'nicht_erreichbar' ? 'c-crit' : 'c-na'}`);
    const attr = st(hass, S.heartbeat)?.attributes || {};
    set('db-s', attr.influx_letzter_fehler ? `Letzter Fehler: ${attr.influx_letzter_fehler}` : `${fmt(attr.influx_geschrieben, 0)} Punkte geschrieben`);
    const buf = num(hass, S.db_buffer); set('buf', buf === null ? '–' : `${fmt(buf, 0)}`, `v ${buf > 1000 ? 'c-warn' : ''}`); set('buf-s', 'Datenpunkte im Puffer');
    set('rate', fmt(num(hass, S.rx_rate), 0));
    const hb = st(hass, S.heartbeat)?.state; set('hb', hb && hb !== 'unavailable' ? fmtAgo(hb) : 'Keine Daten', `v ${hb && hb !== 'unavailable' && Date.now() - Date.parse(hb) < 60e3 ? 'c-ok' : 'c-crit'}`);
    set('hb-s', esc(attr.zaehler_herkunft ? `Zähler: ${attr.zaehler_herkunft}` : ''));
    set('inv', fmt(num(hass, S.invalid), 0)); set('dup', `${fmt(num(hass, S.duplicates), 0)} / ${fmt(num(hass, S.ts_fixed), 0)}`);
    // Ausstattung
    const B = this.app.base.entities;
    for (const [, keys] of EQUIP) for (const k of keys) {
      const sw = st(hass, B.equipment[k]), el = this.root.querySelector(`[data-eq="${k}"]`);
      el.classList.toggle('on', sw?.state === 'on'); el.disabled = !sw || sw.state === 'unavailable';
      const ss = st(hass, B.sensor_status[k])?.state;
      set(`eq-${k}-s`, !sw ? 'Schalter fehlt' : sw.state === 'off' ? 'nicht vorhanden' : SS_TEXT[ss] ?? 'Status unbekannt',
          `tiny c-${!sw || sw.state === 'off' ? 'na' : ss === 'ok' ? 'ok' : ss === 'ungueltig' ? 'warn' : 'na'}`);
    }
    const ni = this.root.querySelector('[data-i="cascade_nominal"]'), nv = num(hass, B.cascade_nominal);
    if (ni && this.root.getRootNode().activeElement !== ni && nv !== null && ni.value !== String(nv)) ni.value = String(nv);
    set('up', `${fmt(num(hass, S.uptime), 1)} h`); set('up-s', attr.flows_version ? `Flows ${attr.flows_version}` : '');
  }

  destroy() { clearTimeout(this.timer); Object.values(this.charts).forEach((c) => c.destroy()); }
}
