// Ansicht WARTUNG – Status, Intervalle (noch nicht festgelegt), Wartungseinträge, Historie, offene Aufgaben
import { st, num, fmt, fmtHours, fmtTime, esc, MAINT_TEXT, MAINT_LEVEL } from '../util.js';
import { fetchEvents } from '../data.js';

const LOG_TOPIC = 'kompressor/maintenance/log/add';

export class WartungView {
  constructor(app) { this.app = app; }

  render() {
    const n = new Date(), today = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
    return `
<div class="page">
  <div class="alertbox warn"><b>Wartungsintervalle noch nicht festgelegt.</b> Die Intervalle werden erst nach Prüfung der Herstellerunterlagen eingetragen.
    Bis dahin zeigt die Plattform nur Betriebsstunden seit der letzten erfassten Wartung. Sie ersetzt nicht das Wartungs-/Prüfbuch.</div>
  <div class="cols-4">
    ${stat('Gesamtbetriebsstunden', 'tot', 'tot-s')}${stat('Letzte Wartung', 'last', 'last-s')}${stat('Nächste Wartung', 'next', 'next-s')}${stat('Betriebsstunden seit Wartung', 'since', 'since-s')}
  </div>
  <div class="cols-4">
    ${stat('Wartungsstatus', 'ms', 'ms-s')}${stat('Filterstatus', 'fs', 'fs-s')}${stat('Letzter Filterwechsel', 'lf', 'lf-s')}${stat('Restlaufzeit Filter', 'fr', 'fr-s')}
  </div>
  <div class="cols-2">
    <div class="card"><h3 class="ct">Wartung dokumentieren</h3>
      <div class="form">
        <label>Wartungsdatum<input type="date" data-f="datum" value="${today}"></label>
        <label>Betriebsstundenstand [h]<input type="number" step="0.1" min="0" data-f="betriebsstunden" placeholder="aktueller Stand"></label>
        <label class="full">Durchgeführte Arbeiten *<textarea data-f="arbeiten" placeholder="z. B. Ölwechsel, Filterpatrone gewechselt, Ventile geprüft"></textarea></label>
        <label class="full">Verwendete Ersatzteile<textarea data-f="ersatzteile" placeholder="Teilenummern, Mengen"></textarea></label>
        <label class="full">Bemerkungen<textarea data-f="bemerkungen"></textarea></label>
        <label class="check"><input type="checkbox" data-f="reset_wartung"> Zähler „seit Wartung“ zurücksetzen</label>
        <label class="check"><input type="checkbox" data-f="reset_filter"> Filterwechsel durchgeführt (Zähler zurücksetzen)</label>
        <div class="full" style="display:flex; gap:10px; align-items:center"><button class="btn" data-act="save">Eintrag speichern</button>
          <span class="hint">Gespeichert als Ereignis (HA-Recorder 31 Tage, InfluxDB dauerhaft, Grafana → Wartungshistorie).</span></div>
      </div></div>
    <div class="grid" style="align-content: start">
      <div class="card"><h3 class="ct">Offene Wartungsaufgaben</h3><div data-b="tasks"></div></div>
      <div class="card"><h3 class="ct">Intervalle (vorläufig, 0 = nicht festgelegt)</h3>
        <div class="form">
          <label>Wartungsintervall [h]<input type="number" min="0" step="0.01" data-i="interval_maint"></label>
          <label>Filterwechselintervall [h]<input type="number" min="0" step="0.01" data-i="interval_filter"></label>
          <label>Enddruck-Sollwert (Anzeige) [bar]<input type="number" min="0" step="1" data-i="setpoint"></label>
          <div style="display:flex; align-items:end"><button class="btn ghost" data-act="intervals">Übernehmen</button></div>
        </div><div class="hint" style="margin-top:6px">Erst nach Prüfung der Herstellerunterlagen eintragen.</div></div>
    </div>
  </div>
  <div class="card"><h3 class="ct">Wartungshistorie (letzte 31 Tage)</h3><div class="scroll" data-b="hist"></div>
    <div class="hint" style="margin-top:6px">Ältere Einträge: <a href="${this.app.cfg.links.grafana}" target="_top" style="color: var(--t-blue-light)">Grafana → Wartung</a>.</div></div>
</div>`;
  }

  mount(root) {
    this.root = root;
    root.querySelector('[data-act="save"]').addEventListener('click', () => this.save());
    root.querySelector('[data-act="intervals"]').addEventListener('click', () => this.saveIntervals());
    const E = this.app.cfg.entities;
    for (const k of ['interval_maint', 'interval_filter', 'setpoint']) root.querySelector(`[data-i="${k}"]`).value = num(this.app.hass, E[k]) ?? 0;
    this.loadHistory();
  }

  async save() {
    const f = (k) => this.root.querySelector(`[data-f="${k}"]`);
    const p = { datum: f('datum').value, betriebsstunden: f('betriebsstunden').value === '' ? null : Number(f('betriebsstunden').value),
                arbeiten: f('arbeiten').value.trim(), ersatzteile: f('ersatzteile').value.trim(), bemerkungen: f('bemerkungen').value.trim(),
                reset_wartung: f('reset_wartung').checked, reset_filter: f('reset_filter').checked };
    if (!p.arbeiten) { this.app.toast('Bitte die durchgeführten Arbeiten eintragen'); return; }
    if ((p.reset_wartung || p.reset_filter) && !confirm('Zähler wirklich zurücksetzen?')) return;
    try {
      await this.app.hass.callService('mqtt', 'publish', { topic: LOG_TOPIC, payload: JSON.stringify(p), qos: 1, retain: false });
      this.app.toast('Wartungseintrag gespeichert');
      ['arbeiten', 'ersatzteile', 'bemerkungen', 'betriebsstunden'].forEach((k) => (f(k).value = ''));
      f('reset_wartung').checked = false; f('reset_filter').checked = false;
      setTimeout(() => this.loadHistory(true), 2500);
    } catch (e) { this.app.toast('Speichern fehlgeschlagen: ' + (e.message || e)); }
  }

  async saveIntervals() {
    const E = this.app.cfg.entities;
    if (!confirm('Werte übernehmen? Intervalle nur nach Prüfung der Herstellerunterlagen eintragen.')) return;
    for (const k of ['interval_maint', 'interval_filter', 'setpoint']) {
      const v = Number(this.root.querySelector(`[data-i="${k}"]`).value) || 0;
      await this.app.hass.callService('number', 'set_value', { entity_id: E[k], value: v });
    }
    this.app.toast('Werte übernommen');
  }

  async loadHistory() {
    const end = new Date(), start = new Date(end - 31 * 86400e3);
    try {
      const ev = await fetchEvents(this.app.hass, this.app.cfg.entities.event, start, end);
      this.maintEvents = ev.filter((e) => ['wartung', 'filterwechsel', 'wartungseintrag', 'konfiguration'].includes(e.type));
      const rows = this.maintEvents.map((e) => {
        const isLog = e.type === 'wartungseintrag';
        return `<tr><td style="white-space:nowrap">${fmtTime(e.t, true)}</td><td>${{ wartung: 'Wartung', filterwechsel: 'Filterwechsel', wartungseintrag: 'Eintrag', konfiguration: 'Konfiguration' }[e.type]}</td>
          <td>${isLog ? `<b>${esc(e.arbeiten)}</b>${e.ersatzteile ? `<div class="detail">Ersatzteile: ${esc(e.ersatzteile)}</div>` : ''}${e.bemerkungen ? `<div class="detail">Bemerkung: ${esc(e.bemerkungen)}</div>` : ''}` : esc(e.text)}</td>
          <td>${isLog ? `${esc(e.datum)}<div class="detail">${fmt(Number(e.betriebsstunden), 1)} Bh</div>` : ''}</td><td>${e.quelle === 'sim' ? '<span class="badge sim">SIM</span>' : ''}</td></tr>`;
      });
      this.root.querySelector('[data-b="hist"]').innerHTML = rows.length
        ? `<table><thead><tr><th>Zeit</th><th>Art</th><th>Inhalt</th><th>Datum / Stand</th><th></th></tr></thead><tbody>${rows.join('')}</tbody></table>`
        : '<div class="hint">Noch keine Wartungsereignisse erfasst.</div>';
      this.update(this.app.hass);
    } catch (e) { console.error(e); }
  }

  update(hass) {
    if (!this.root) return;
    const E = this.app.cfg.entities, set = (k, v, cls) => { const el = this.root.querySelector(`[data-b="${k}"]`); if (el) { el.textContent = v; if (cls) el.className = cls; } };
    const tot = num(hass, E.hours), since = num(hass, E.hours_since_maint), rem = num(hass, E.remaining_maint), iv = num(hass, E.interval_maint);
    const fsince = num(hass, E.hours_since_filter), frem = num(hass, E.remaining_filter), fiv = num(hass, E.interval_filter);
    const ms = st(hass, E.maint_status)?.state, fs = st(hass, E.filter_status)?.state;
    set('tot', fmtHours(tot)); set('tot-s', st(hass, E.source)?.state === 'simulation' ? 'Simulationszähler (getrennt von realen Stunden)' : 'Betriebsstundenzähler der Plattform');
    const lastM = (this.maintEvents || []).find((e) => e.type === 'wartung' || (e.type === 'wartungseintrag' && Number(e.reset_wartung) === 1));
    set('last', lastM ? fmtTime(lastM.t, true).slice(0, 10) : 'Keine erfasst'); set('last-s', lastM ? (lastM.text || '').slice(0, 60) : 'in den letzten 31 Tagen');
    set('next', iv ? (rem <= 0 ? 'Fällig' : `in ${fmt(rem, 1)} h`) : 'Nicht festgelegt', `v ${iv ? (rem <= 0 ? 'c-crit' : '') : 'c-na'}`);
    set('next-s', iv ? `Intervall ${fmt(iv, 1)} h (vorläufig)` : 'Intervall aus Herstellerunterlagen festlegen');
    set('since', fmtHours(since)); set('since-s', 'seit letzter erfasster Wartung');
    set('ms', MAINT_TEXT[ms] || 'Unbekannt', `v c-${MAINT_LEVEL[ms] || 'na'}`); set('ms-s', '');
    set('fs', MAINT_TEXT[fs] || 'Unbekannt', `v c-${MAINT_LEVEL[fs] || 'na'}`); set('fs-s', fiv ? `Intervall ${fmt(fiv, 1)} h (vorläufig)` : 'Intervall nicht festgelegt');
    const lastF = (this.maintEvents || []).find((e) => e.type === 'filterwechsel');
    set('lf', lastF ? fmtTime(lastF.t, true).slice(0, 10) : 'Keiner erfasst'); set('lf-s', `seit Wechsel ${fmtHours(fsince)}`);
    set('fr', fiv ? (frem <= 0 ? 'Fällig' : `${fmt(frem, 1)} h`) : 'Nicht festgelegt', `v ${fiv ? (frem <= 0 ? 'c-crit' : '') : 'c-na'}`); set('fr-s', '');

    const tasks = [];
    if (!iv) tasks.push(['warn', 'Wartungsintervall anhand der Betriebsanleitung des Herstellers festlegen']);
    if (!fiv) tasks.push(['warn', 'Filterwechselintervall (Filterpatrone) anhand der Herstellerangaben festlegen']);
    if (ms === 'faellig') tasks.push(['crit', 'Wartung fällig']);
    if (ms === 'bald_faellig') tasks.push(['warn', 'Wartung bald fällig']);
    if (fs === 'faellig') tasks.push(['crit', 'Filterwechsel fällig']);
    if (fs === 'bald_faellig') tasks.push(['warn', 'Filterwechsel bald fällig']);
    tasks.push(['info', 'Abgleich mit mechanischem Betriebsstundenzähler bei Inbetriebnahme der Sensorik (docs/maintenance.md)']);
    tasks.push(['info', 'Weitere Prüffristen (Atemluftanalyse, Sicherheitsventile, Druckbehälter) aus Prüfvorschriften übernehmen']);
    this.root.querySelector('[data-b="tasks"]').innerHTML = tasks.map(([l, t]) =>
      `<div style="display:flex; gap:10px; align-items:flex-start; padding:6px 0; border-bottom:1px solid var(--t-border)">
        <ha-icon icon="${l === 'crit' ? 'mdi:alert-octagon' : l === 'warn' ? 'mdi:alert' : 'mdi:information-outline'}" class="c-${l === 'info' ? 'blue' : l}" style="--mdc-icon-size:20px"></ha-icon>
        <span style="font-size:13.5px">${esc(t)}</span></div>`).join('');
    const bh = this.root.querySelector('[data-f="betriebsstunden"]');
    if (bh && document.activeElement !== bh && !bh.value && tot !== null) bh.placeholder = `aktuell ${fmt(tot, 1)} h`;
  }

  destroy() {}
}

function stat(label, b, s) {
  return `<div class="card stat"><div class="k">${label}</div><div class="v" data-b="${b}">–</div><div class="s" data-b="${s}"></div></div>`;
}
