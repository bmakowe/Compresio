// Ansicht ÜBERSICHT – Umsetzung der Designvorlage (links Kompressor, rechts Diagnose-Panel)
import { st, avail, num, fmt, fmtHours, fmtMinutes, esc, moreInfo, MAINT_TEXT, MAINT_LEVEL } from '../util.js';
import { compressorState, measureLevel, categoryState, CAT_LABEL, sourceState, activeAlerts } from '../logic.js';
import { gaugeSVG, updateGauge } from '../components/gauge.js';
import { compressorSVG, CASCADE_BOX } from '../components/compressor.js';
import { fetchHistory } from '../data.js';
import { Chart } from '../components/chart.js';

const GAUGES = ['p_suction', 'p_stage1', 'p_stage2', 'p_final', 't1', 't2', 't3', 'current'];
const CAT_SHORT = { 'Nicht festgelegt': 'Offen', 'Nicht erreichbar': 'Offline', 'Unvollständig': 'Lücken', 'Keine Daten': 'k. Daten' };
const CATS = [['comm', 'mdi:wifi'], ['sensor_data', 'mdi:database-outline'], ['temperature', 'mdi:thermometer'], ['pressure', 'mdi:gauge'],
              ['maintenance', 'mdi:wrench'], ['database', 'mdi:layers-triple']];

export class OverviewView {
  constructor(app) { this.app = app; }

  render() {
    const cfg = this.app.cfg;
    const g = (k) => {
      const gc = cfg.gauges[k], missing = !cfg.entities[k];
      return `<div class="card gauge ${missing ? 'missing' : 'clickable'}" data-gauge="${k}" ${missing ? '' : `data-more="${k}"`}>
        <div class="gl">${esc(gc.label)}</div>${gaugeSVG(gc)}
</div>`;
    };
    const casc = !!cfg.entities.p_cascade;
    return `
<section class="panel ov-main">
    <div class="kpis ${casc ? 'has-casc' : ''}">
      <div class="card kpi kpi-status clickable" data-more="status">
        <div class="orb" data-b="orb"><i></i></div>
        <div><div class="t1">Kompressor</div><div class="t2" data-b="cs-title">–</div><div class="t3" data-b="cs-sub">–</div></div>
      </div>
      <div class="card kpi kpi-pressure clickable" data-more="p_final">
        <div class="lbl">Enddruck</div>
        <div class="row"><span class="ico-round" style="background: rgba(242,181,68,.16); color: #f2b544"><ha-icon icon="mdi:gauge"></ha-icon></span>
          <div><div class="val" data-b="pf">–</div><div class="sub" data-b="pf-sub">–</div></div></div>
      </div>
      <div class="card kpi kpi-rate clickable" data-more="p_rate">
        <div class="lbl">Druckanstieg</div>
        <div class="row"><span class="ico-round" style="color: #f2b544"><ha-icon icon="mdi:trending-up"></ha-icon></span>
          <div><div class="val" data-b="pr">–</div><div class="sub" data-b="pr-sub">–</div></div></div>
      </div>
      ${casc ? `<div class="card kpi kpi-cascade clickable" data-more="p_cascade">
        <div class="lbl">Speicherkaskade</div>
        <div class="row"><span class="ico-round" style="background: rgba(179,136,255,.16); color: #b388ff"><ha-icon icon="mdi:propane-tank-outline"></ha-icon></span>
          <div><div class="val" data-b="kc">–</div><div class="sub" data-b="kc-sub">–</div></div></div>
      </div>` : ''}
      <div class="card kpi kpi-release">
        <div class="lbl">Betriebsfreigabe</div>
        <div class="row"><span class="ico-round" data-b="rl-ico"><ha-icon icon="mdi:power-plug-off"></ha-icon></span>
          <div style="flex:1"><div class="val" data-b="rl">–</div><div class="sub" data-b="rl-sub">–</div></div>
          <button class="btn rl-btn" data-act="release" disabled>–</button></div>
      </div>
      <div class="card kpi kpi-alerts clickable" data-nav="ereignisse">
        <div class="lbl">Aktive Meldungen</div>
        <div class="row"><span class="ico-round" data-b="al-ico"><ha-icon icon="mdi:check-circle"></ha-icon></span>
          <div><div class="val" data-b="al" style="font-size: 26px">–</div><div class="sub" data-b="al-sub">–</div></div></div>
      </div>
    </div>

    <!-- Mittlerer Bereich: EIN Raster (3 Spalten × 4 gleich hohe Zeilen), alle Karten explizit platziert -->
    <div class="mid">
      <div class="card vis m-vis"><div class="vis-box">${compressorSVG(cfg.compressor_image, cfg.compressor_label, { cascade: casc })}</div>
        <div class="note">${cfg.compressor_image ? 'Foto' : 'Schematische Darstellung – Bauteilanordnung nicht am realen Gerät verifiziert'}</div></div>
      <div class="card list m-motor">
        ${li('motor', 'mdi:engine', 'Motor', 'mo')}
        ${li('current', 'mdi:current-ac', 'Motorstrom', 'mi')}
        ${li('voltage', 'mdi:sine-wave', 'Versorgung', 'mu')}
      </div>
      <div class="card list m-run">
        ${li('hours', 'mdi:clock-outline', 'Betriebsstunden', 'bh')}
        ${li('starts', 'mdi:numeric', 'Motorstarts', 'ms')}
        ${li('cycle_current', 'mdi:timer-outline', 'Aktuelle Laufzeit', 'cl')}
      </div>
      <div class="card room-card m-room clickable" data-more="tr">
        <div class="rc-top"><ha-icon icon="mdi:home-thermometer-outline"></ha-icon>
          <div><div class="k">Raumtemperatur</div><div class="v" data-b="tr">–</div></div></div>
        <div class="spark"><div class="spark-in" data-c="tr"></div></div>
        <div class="rc-mm">24 h: Min <b data-b="tr-min">–</b> · Max <b data-b="tr-max">–</b></div>
        <div class="s" data-b="tr-s">–</div>
      </div>
      ${mini('cycle_last', 'mdi:timer-check-outline', 'Letzter Zyklus', 'lz', 'm-c1')}
      ${mini('filter_status', 'mdi:air-filter', 'Filterstatus', 'fs', 'm-c2')}
      ${mini('maint_status', 'mdi:wrench-clock', 'Wartungsstatus', 'ws', 'm-c3')}
      ${mini('source', 'mdi:database', 'Datenquelle', 'dq', 'm-c4')}
    </div>

    <div class="gauges gauges-8">${GAUGES.map(g).join('')}</div>
    <div class="tiny" style="margin: -5px 4px 3px; text-align: right">${esc(cfg.scale_note)}. Farbmarken: TEST-Schwellen aus Node-RED.</div>

    <div class="card statusbar">
      ${CATS.map(([c, i]) => `<div class="sb" data-cat="${c}" data-nav="ereignisse"><ha-icon icon="${i}"></ha-icon>
        <div><div class="k">${CAT_LABEL[c]}</div><div class="v" data-b="cat-${c}">–</div></div></div>`).join('')}
    </div>
</section>`;
  }

  mount(root) {
    this.root = root;
    root.querySelectorAll('[data-more]').forEach((el) => el.addEventListener('click', () => {
      const k = el.dataset.more; moreInfo(this.app, this.app.cfg.entities[k]);
    }));
    root.querySelectorAll('.cmp .callout, .cmp .room').forEach((el) => el.addEventListener('click', () => moreInfo(this.app, this.app.cfg.entities[el.dataset.key])));
    this.spark = new Chart(root.querySelector('[data-c="tr"]'), {
      chart: { type: 'area', height: '100%', sparkline: { enabled: true }, animations: { enabled: false }, background: 'transparent' },
      stroke: { width: 1.6, curve: 'smooth' }, colors: ['#c9d6e2'], fill: { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0.02 } },
      tooltip: { theme: 'dark', x: { format: 'dd.MM. HH:mm' }, y: { formatter: (v) => `${fmt(v, 1)} °C` } }, xaxis: { type: 'datetime' }, series: [] });
    this.loadRoom();
    root.querySelector('[data-act="release"]').addEventListener('click', () => this.toggleRelease());
    root.querySelectorAll('[data-nav]').forEach((el) => el.addEventListener('click', (ev) => { ev.stopPropagation(); this.app.go(el.dataset.nav); }));
  }

  releaseState(hass) {
    const E = this.app.cfg.entities;
    const helper = st(hass, E.release_output_helper);
    if (!helper || !st(hass, E.release_on_script)) return { level: 'na', text: 'Nicht eingerichtet', sub: 'siehe docs/steuerung.md', can: false };
    const out = String(helper.state || '').trim(), o = st(hass, out);
    if (!o) return { level: 'na', text: 'Kein Ausgang', sub: out ? `„${out}“ nicht gefunden` : 'Ausgang nicht konfiguriert', can: false };
    if (o.state === 'unavailable' || o.state === 'unknown') return { level: 'crit', text: 'Ausgang offline', sub: o.attributes.friendly_name || out, can: false, on: false };
    const on = o.state === 'on', test = out.startsWith('input_boolean.');
    const motorOn = st(hass, E.motor)?.state === 'on';
    if (!on && motorOn) return { level: 'warn', text: 'Gesperrt', sub: 'Motor läuft trotzdem – prüfen!', can: true, on, test };
    return { level: on ? 'ok' : 'off', text: on ? 'Freigegeben' : 'Gesperrt', sub: test ? 'Testausgang (keine Hardware)' : (o.attributes.friendly_name || out), title: out, can: true, on, test };
  }

  async toggleRelease() {
    const hass = this.app.hass, E = this.app.cfg.entities, r = this.releaseState(hass);
    if (!r.can) return;
    if (r.on) {
      if (!confirm('Betriebsfreigabe ENTZIEHEN?\n\nDer Kompressor wird über das Hilfsschütz gestoppt bzw. kann nicht anlaufen.\nDies ersetzt NICHT den NOT-HALT an der Maschine.')) return;
      await hass.callService('script', 'turn_on', { entity_id: E.release_off_script });
      this.app.toast('Freigabe wird entzogen …');
    } else {
      if (st(hass, E.status)?.state === 'stoerung') { this.app.toast('Freigabe gesperrt: Störung aktiv'); return; }
      if (!confirm('Kompressor FREIGEBEN?\n\nVor Ort sicherstellen:\n• niemand arbeitet an der Maschine\n• Füllanschlüsse/Flaschen korrekt angeschlossen\n• Raum belüftet, Ansaugluft frei\n\nNOT-HALT, Druckschalter und Sicherheitsventile bleiben unabhängig wirksam.')) return;
      await hass.callService('script', 'turn_on', { entity_id: E.release_on_script });
      this.app.toast('Freigabe wird erteilt …');
    }
  }

  async loadRoom() {
    const E = this.app.cfg.entities, end = new Date(), start = new Date(end - 86400e3);
    clearTimeout(this.roomTimer);
    try {
      const h = await fetchHistory(this.app.hass, [E.tr], start, end);
      const pts = (h[E.tr] || []).filter((p) => p[1] !== null);
      this.roomMinMax = pts.length ? [Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[1]))] : null;
      await this.spark.set([{ name: 'Raumtemperatur', data: pts }], { xaxis: { type: 'datetime', min: +start, max: +end } });
      this.update(this.app.hass);
    } catch (e) { console.error(e); }
    this.roomTimer = setTimeout(() => this.loadRoom(), 300e3);
  }

  update(hass) {
    const cfg = this.app.cfg, E = cfg.entities, b = (k) => this.root.querySelector(`[data-b="${k}"]`);
    const set = (k, v, cls) => { const el = b(k); if (!el) return; if (el.textContent !== v) el.textContent = v; if (cls !== undefined) el.className = cls; };

    // Kompressorstatus
    const cs = compressorState(hass, cfg);
    b('orb').className = `orb ${cs.level}`;
    set('cs-title', cs.title, `t2 c-${cs.level}`);
    set('cs-sub', cs.sub, `t3 c-${cs.level}`);

    // Enddruck + Sollwert
    const pf = num(hass, E.p_final), sp = num(hass, E.setpoint);
    set('pf', pf === null ? 'Keine Daten' : `${fmt(pf, 1)} bar`, pf === null ? 'val c-na' : 'val');
    set('pf-sub', sp ? `Soll: ${fmt(sp, 0)} bar` : 'Kein Sollwert');

    // Druckanstieg + Referenz
    const pr = num(hass, E.p_rate), ref = num(hass, E.rate_reference), running = st(hass, E.motor)?.state === 'on';
    // Druckanstieg ist nur bei laufendem Motor aussagekräftig (Stillstand: Entlüften/Flaschenwechsel)
    set('pr', pr === null ? 'Keine Daten' : running ? `${fmt(pr, 1)} bar/min` : '–', pr === null ? 'val c-na' : 'val');
    let prSub = running ? 'Keine Referenz' : 'Motor steht';
    if (ref && pr !== null && running) {
      const dev = ((pr - ref) / ref) * 100;
      prSub = `${Math.abs(dev) <= 10 ? 'Normalbereich' : 'Abweichung'} ${dev >= 0 ? '+' : ''}${fmt(dev, 0)} % zur Ref.`;
    }
    set('pr-sub', prSub);

    // Betriebsfreigabe
    const rl = this.releaseState(hass), rb = this.root.querySelector('[data-act="release"]'), ri = b('rl-ico');
    set('rl', rl.text, `val c-${rl.level}`); set('rl-sub', rl.sub); b('rl-sub').title = rl.title || rl.sub;
    rb.disabled = !rl.can; rb.textContent = rl.can ? (rl.on ? 'Sperren' : 'Freigeben') : '–';
    rb.classList.toggle('danger', !!rl.on);
    const ic = rl.on ? ['mdi:power-plug', '#20d978'] : rl.level === 'crit' ? ['mdi:power-plug-off', '#ef5350'] : rl.level === 'warn' ? ['mdi:alert', '#f2b544'] : ['mdi:power-plug-off', '#6f8496'];
    if (ri.dataset.icon !== ic[0]) { ri.dataset.icon = ic[0]; ri.innerHTML = `<ha-icon icon="${ic[0]}"></ha-icon>`; }
    ri.style.cssText = `color: ${ic[1]}; background: ${ic[1]}22`;

    // Meldungen
    const al = activeAlerts(hass, cfg);
    const ico = b('al-ico');
    const noData = cs.level === 'na';
    if (al !== null && !al.length && noData) {
      // keine Meldungen, aber auch keine Messdaten → nicht als „OK“ darstellen
      set('al', '0', 'val c-na'); set('al-sub', 'Keine Messdaten');
      ico.dataset.icon = ''; ico.style.cssText = 'color: #6f8496; background: #6f849622'; ico.innerHTML = '<ha-icon icon="mdi:help-circle-outline"></ha-icon>';
    } else if (al === null) {
      set('al', '–', 'val c-na'); set('al-sub', 'Status unbekannt');
      ico.style.cssText = 'color: #6f8496'; ico.innerHTML = '<ha-icon icon="mdi:help-circle-outline"></ha-icon>';
    } else {
      const nf = al.filter((a) => a.schwere === 'stoerung').length, nw = al.length - nf;
      set('al', String(al.length), `val ${nf ? 'c-crit' : nw ? 'c-warn' : ''}`);
      set('al-sub', al.length ? `${nw} Warnung${nw === 1 ? '' : 'en'} · ${nf} Störung${nf === 1 ? '' : 'en'}` : 'Alle Systeme OK');
      const want = nf ? ['mdi:alert-octagon', '#ef5350'] : nw ? ['mdi:alert', '#f2b544'] : ['mdi:check-circle', '#20d978'];
      if (ico.dataset.icon !== want[0]) { ico.dataset.icon = want[0]; ico.innerHTML = `<ha-icon icon="${want[0]}"></ha-icon>`; }
      ico.style.cssText = `color: ${want[1]}; background: ${want[1]}22`;
    }

    // Kompressor-Grafik
    const svg = this.root.querySelector('.cmp');
    svg.classList.toggle('running', running && cs.level !== 'na');
    for (const k of ['t1', 't12', 't2', 't23', 't3', 'p_final', 'motor']) {
      const call = svg.querySelector(`.callout[data-key="${k}"]`), v = call.querySelector('.cl-v');
      let lvl, txt;
      if (k === 'motor') {
        const m = st(hass, E.motor)?.state;
        lvl = m === 'on' ? 'ok' : m === 'off' ? 'off' : 'na'; txt = m === 'on' ? 'Ein' : m === 'off' ? 'Aus' : 'Keine Daten';
      } else {
        lvl = measureLevel(hass, cfg, k); const val = num(hass, E[k]);
        txt = val === null ? '– – –' : `${fmt(val, 1)} ${k === 'p_final' ? 'bar' : '°C'}`;
      }
      if (lvl === 'missing') txt = 'kein Sensor';
      call.setAttribute('class', `callout ${k === 'p_final' || k === 'motor' ? 'small ' : ''}${lvl === 'ok' ? '' : lvl === 'off' ? 'na' : lvl}`);
      if (v.textContent !== txt) v.textContent = txt;
      const ld = svg.querySelector(`.ld-${k}`); if (ld) ld.setAttribute('class', `ld-${k} ${lvl === 'ok' ? '' : lvl}`);
    }

    // Speicherkaskade (optional): Gesamtdruck, Füllstand bezogen auf den eingetragenen Nenndruck
    if (E.p_cascade) {
      const kc = num(hass, E.p_cascade), nom = num(hass, E.cascade_nominal), lvl = measureLevel(hass, cfg, 'p_cascade');
      const frac = kc !== null && nom ? Math.max(0, Math.min(1, kc / nom)) : null;
      set('kc', kc === null ? 'Keine Daten' : `${fmt(kc, 0)} bar`, kc === null ? 'val c-na' : 'val');
      set('kc-sub', kc === null ? 'Sensor ohne Daten' : frac !== null ? `${fmt(frac * 100, 0)} % von ${fmt(nom, 0)} bar` : 'Nenndruck nicht festgelegt');
      const call = svg.querySelector('.callout[data-key="p_cascade"]'), cv = call.querySelector('.cl-v');
      const txt = kc === null ? '– – –' : `${fmt(kc, 0)} bar`;
      if (cv.textContent !== txt) cv.textContent = txt;
      call.setAttribute('class', `callout small ${kc === null ? 'na' : lvl === 'ok' ? '' : lvl}`);
      const h = (CASCADE_BOX.bottom - CASCADE_BOX.top) * (frac ?? 0), fill = svg.querySelector('.casc-fill');
      fill.setAttribute('y', CASCADE_BOX.bottom - h); fill.setAttribute('height', h);
    }

    // Raumtemperatur (außerhalb der Maschine)
    const tr = num(hass, E.tr), trLvl = measureLevel(hass, cfg, 'tr');
    const room = svg.querySelector('.room');
    room.setAttribute('class', `room ${tr === null ? 'na' : ''}`);
    room.querySelector('.cl-v').textContent = tr === null ? (E.tr ? '– – –' : 'kein Sensor') : `${fmt(tr, 1)} °C`;
    set('tr', tr === null ? 'Keine Daten' : `${fmt(tr, 1)} °C`, `v ${tr === null ? 'c-na' : ''}`);
    const mm = this.roomMinMax && tr !== null ? [Math.min(this.roomMinMax[0], tr), Math.max(this.roomMinMax[1], tr)] : this.roomMinMax;
    set('tr-min', mm ? `${fmt(mm[0], 1)} °C` : '–'); set('tr-max', mm ? `${fmt(mm[1], 1)} °C` : '–');
    const ss = st(hass, E.sensor_status.tr)?.state;
    set('tr-s', `Sensor ${{ ok: 'OK', keine_daten: 'keine Daten', ungueltig: 'ungültig' }[ss] || 'unbekannt'}${sourceState(hass, cfg).level === 'sim' ? ' · SIMULATION' : ''}`,
        `s c-${ss === 'ok' ? 'ok' : ss === 'ungueltig' ? 'warn' : 'na'}`);

    // Betriebsdaten
    const m = st(hass, E.motor)?.state;
    set('mo', m === 'on' ? 'Ein' : m === 'off' ? 'Aus' : 'Keine Daten', `v ${m === 'on' ? 'c-ok' : m === 'off' ? '' : 'c-na'}`);
    const vi = num(hass, E.current), vu = num(hass, E.voltage);
    set('mi', vi === null ? 'Keine Daten' : `${fmt(vi, 1)} A`, `v ${vi === null ? 'c-na' : ''}`);
    set('mu', vu === null ? 'Keine Daten' : `${fmt(vu, 0)} V`, `v ${vu === null ? 'c-na' : ''}`);
    set('bh', fmtHours(num(hass, E.hours)));
    const ns = num(hass, E.starts); set('ms', ns === null ? '–' : String(ns));
    set('cl', running ? fmtMinutes(num(hass, E.cycle_current)) : '–');
    const lz = num(hass, E.cycle_last);
    set('lz', lz === null ? 'Noch kein Zyklus' : fmtMinutes(lz, true));
    const fs = st(hass, E.filter_status)?.state, ws = st(hass, E.maint_status)?.state;
    set('fs', MAINT_TEXT[fs] || 'Unbekannt', `v c-${MAINT_LEVEL[fs] || 'na'}`);
    set('ws', MAINT_TEXT[ws] || 'Unbekannt', `v c-${MAINT_LEVEL[ws] || 'na'}`);
    const hs = num(hass, E.hours_since_maint), rem = num(hass, E.remaining_maint);
    set('ws-s', `seit Wartung ${fmt(hs, 1)} h · Rest ${rem === null ? 'nicht festgelegt' : fmt(rem, 1) + ' h'}`);
    const src = sourceState(hass, cfg);
    set('dq', src.text, `v ${src.level === 'sim' ? 'c-warn' : src.level === 'ok' ? 'c-blue' : 'c-na'}`);
    set('dq-s', src.level === 'sim' ? 'synthetische Testdaten' : src.level === 'ok' ? 'Messwerte der Sensorik' : 'keine Messwerte');
    set('lz-s', lz === null ? '' : 'Dauer des letzten Zyklus');
    set('fs-s', `seit Wechsel ${fmt(num(hass, E.hours_since_filter), 1)} h`);

    // Instrumente
    for (const k of GAUGES) {
      const el = this.root.querySelector(`[data-gauge="${k}"]`), gc = cfg.gauges[k];
      if (!E[k]) { updateGauge(el, gc, null, 'na', 'Kein Sensor'); continue; }
      const v = num(hass, E[k]); const lvl = measureLevel(hass, cfg, k);
      updateGauge(el, gc, v, v === null ? 'na' : lvl, v === null ? 'Keine Daten' : `${fmt(v, gc.dec)} ${gc.unit}`);
      el.classList.toggle('nodata', v === null);
    }

    // Statusleiste
    for (const [c] of CATS) {
      const s = categoryState(hass, cfg, c);
      set(`cat-${c}`, CAT_SHORT[s.text] || s.text, `v c-${s.level}`);
      this.root.querySelector(`[data-cat="${c}"]`).title = `${CAT_LABEL[c]}: ${s.text}`;
      const ic = this.root.querySelector(`[data-cat="${c}"] ha-icon`);
      ic.style.color = { ok: '#20d978', warn: '#f2b544', crit: '#ef5350', na: '#6f8496' }[s.level];
    }
  }

  destroy() { clearTimeout(this.roomTimer); this.spark?.destroy(); }
}

function li(key, icon, label, b) {
  return `<div class="li" data-more="${key}"><ha-icon icon="${icon}"></ha-icon><div><div class="k">${label}</div><div class="v" data-b="${b}">–</div></div></div>`;
}
function mini(key, icon, label, b, cls = '') {
  return `<div class="card mini clickable ${cls}" data-more="${key}"><ha-icon icon="${icon}"></ha-icon>
    <div><div class="k">${label}</div><div class="v" data-b="${b}">–</div><div class="s" data-b="${b}-s"></div></div></div>`;
}
