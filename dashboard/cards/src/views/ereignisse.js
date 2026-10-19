// Ansicht EREIGNISSE – chronologisch, filterbar, mit Details und Sprung in den Messwertverlauf
import { fmtTime, fmtDuration, fmt, esc } from '../util.js';
import { fetchEvents } from '../data.js';

export const EVENT_TYPES = {
  motorstart: { label: 'Motorstart', icon: 'mdi:play-circle-outline', color: '#20d978' },
  motorstopp: { label: 'Motorstopp', icon: 'mdi:stop-circle-outline', color: '#a8bed0' },
  warnung: { label: 'Warnung', icon: 'mdi:alert', color: '#f2b544' },
  stoerung: { label: 'Störung', icon: 'mdi:alert-octagon', color: '#ef5350' },
  kommunikationsausfall: { label: 'Kommunikationsausfall', icon: 'mdi:wifi-off', color: '#ef5350' },
  sensorfehler: { label: 'Sensorfehler', icon: 'mdi:access-point-remove', color: '#f2b544' },
  behoben: { label: 'Behoben', icon: 'mdi:check-circle-outline', color: '#20d978' },
  wartung: { label: 'Wartung', icon: 'mdi:wrench', color: '#55b5ff' },
  filterwechsel: { label: 'Filterwechsel', icon: 'mdi:air-filter', color: '#55b5ff' },
  wartungseintrag: { label: 'Wartungseintrag', icon: 'mdi:notebook-edit-outline', color: '#55b5ff' },
  konfiguration: { label: 'Konfiguration', icon: 'mdi:cog-outline', color: '#8e9baa' },
  simulation: { label: 'Simulation', icon: 'mdi:test-tube', color: '#f2b544' },
  sensorknoten: { label: 'Sensorknoten', icon: 'mdi:access-point', color: '#8e9baa' },
  freigabe: { label: 'Betriebsfreigabe', icon: 'mdi:power-plug', color: '#55b5ff' },
};
const PERIODS = { '24h': ['24 h', 86400e3], '7d': ['7 Tage', 7 * 86400e3], '30d': ['30 Tage', 30 * 86400e3] };
const DEFAULT_ON = ['freigabe', 'motorstart', 'motorstopp', 'warnung', 'stoerung', 'kommunikationsausfall', 'sensorfehler', 'behoben', 'wartung', 'filterwechsel', 'wartungseintrag'];
const HIDE = new Set(['text', 'zeit', 'event_type', 'type', 't', 'friendly_name', 'icon', 'event_types']);

export class EreignisseView {
  constructor(app) { this.app = app; this.types = new Set(DEFAULT_ON); this.period = '7d'; this.custom = null; this.open = new Set(); }

  render() {
    return `
<div class="page"><section class="panel">
  <div class="dhdr"><div class="t"><ha-icon icon="mdi:timeline-clock-outline" style="--mdc-icon-size: 32px"></ha-icon><h2>Ereignisse</h2><span class="small muted" data-b="count"></span></div>
    <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap">
      <div class="ranges">${Object.entries(PERIODS).map(([k, v]) => `<button data-p="${k}" class="${k === this.period ? 'active' : ''}">${v[0]}</button>`).join('')}</div>
      <input type="date" data-d="start" title="von"> <input type="date" data-d="end" title="bis"> <button class="btn ghost" data-d="apply">Zeitraum</button></div></div>
  <div class="card" style="margin-bottom:8px"><div class="chips">${Object.entries(EVENT_TYPES).map(([k, v]) =>
    `<span class="chip ${this.types.has(k) ? 'on' : ''}" data-t="${k}"><i style="background:${v.color}"></i>${v.label}</span>`).join('')}</div></div>
  <div class="card"><div class="scroll" style="max-height: 70vh" data-b="list"></div></div>
  <div class="hint" style="margin-top:6px">Quelle: Ereignis-Entität (HA-Recorder, 31 Tage). Vollständiges Archiv in InfluxDB/Grafana.</div>
</section></div>`;
  }

  mount(root) {
    this.root = root;
    root.querySelectorAll('[data-t]').forEach((c) => c.addEventListener('click', () => {
      const t = c.dataset.t; if (this.types.has(t)) this.types.delete(t); else this.types.add(t); c.classList.toggle('on'); this.draw();
    }));
    root.querySelectorAll('[data-p]').forEach((b) => b.addEventListener('click', () => {
      this.period = b.dataset.p; this.custom = null; root.querySelectorAll('[data-p]').forEach((x) => x.classList.toggle('active', x === b)); this.load();
    }));
    root.querySelector('[data-d="apply"]').addEventListener('click', () => {
      const s = new Date(root.querySelector('[data-d="start"]').value), e = new Date(root.querySelector('[data-d="end"]').value);
      if (isNaN(s) || isNaN(e) || e < s) { this.app.toast('Ungültiger Zeitraum'); return; }
      e.setHours(23, 59, 59); this.custom = { start: s, end: e }; root.querySelectorAll('[data-p]').forEach((x) => x.classList.remove('active')); this.load();
    });
    this.load();
  }

  async load() {
    const end = this.custom ? this.custom.end : new Date(), start = this.custom ? this.custom.start : new Date(end - PERIODS[this.period][1]);
    try { this.events = await fetchEvents(this.app.hass, this.app.cfg.entities.event, start, end); this.draw(); }
    catch (e) { console.error(e); this.app.toast('Ereignisse konnten nicht geladen werden'); }
  }

  draw() {
    const list = (this.events || []).filter((e) => this.types.has(e.type));
    this.root.querySelector('[data-b="count"]').textContent = `${list.length} Ereignisse`;
    const el = this.root.querySelector('[data-b="list"]');
    if (!list.length) { el.innerHTML = '<div class="hint" style="padding:12px">Keine Ereignisse für die gewählten Filter.</div>'; return; }
    el.innerHTML = `<table><thead><tr><th style="width:150px">Zeit</th><th style="width:190px">Ereignis</th><th>Beschreibung</th><th style="width:70px">Quelle</th><th style="width:110px"></th></tr></thead><tbody>
      ${list.slice(0, 500).map((e, i) => {
        const m = EVENT_TYPES[e.type] || { label: e.type, icon: 'mdi:circle-small', color: '#8e9baa' };
        const key = `${e.t}-${e.type}`;
        const details = Object.entries(e).filter(([k, v]) => !HIDE.has(k) && v !== null && v !== '').map(([k, v]) => `${k}: ${k === 'dauer_s' ? fmtDuration(Number(v)) : typeof v === 'number' ? fmt(v, 2) : v}`).join('\n');
        return `<tr class="clickable" data-i="${i}"><td style="white-space:nowrap">${fmtTime(e.t, true)}</td>
          <td><span style="display:inline-flex; gap:8px; align-items:center"><span class="ev-ico" style="background:${m.color}22; color:${m.color}"><ha-icon icon="${m.icon}" style="--mdc-icon-size:16px"></ha-icon></span>${m.label}</span></td>
          <td>${esc(e.text)}${this.open.has(key) ? `<div class="detail" style="margin-top:6px">${esc(details)}</div>` : ''}</td>
          <td>${e.quelle === 'sim' ? '<span class="badge sim">SIM</span>' : e.quelle === 'real' ? '<span class="badge">real</span>' : ''}</td>
          <td><button class="btn ghost" data-go="${i}" style="padding:4px 10px; font-size:12.5px">Verlauf</button></td></tr>`;
      }).join('')}</tbody></table>`;
    el.querySelectorAll('tr[data-i]').forEach((tr) => tr.addEventListener('click', () => {
      const e = list[Number(tr.dataset.i)], key = `${e.t}-${e.type}`; if (this.open.has(key)) this.open.delete(key); else this.open.add(key); this.draw();
    }));
    el.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const e = list[Number(b.dataset.go)];
      const s = e.type === 'motorstopp' && e.start ? Number(e.start) - 10 * 60e3 : e.t - 30 * 60e3;
      this.app.setRange('custom', { start: new Date(s), end: new Date(Math.min(Date.now(), e.t + 30 * 60e3)) });
      this.app.go('verlaeufe');
    }));
  }

  update() {}
  destroy() {}
}
