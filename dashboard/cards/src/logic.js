// Zustandslogik der Oberfläche. Grundsatz: Fehlende Daten werden NIE als OK dargestellt.
import { st, avail, num, NA } from './util.js';

import { SENSOR_ID } from './config.js';

export function activeAlerts(hass, cfg) {
  const a = st(hass, cfg.entities.alerts);
  if (!a || NA.has(a.state)) return null;               // unbekannt
  return Array.isArray(a.attributes.active) ? a.attributes.active : [];
}

export function systemOnline(hass, cfg) {
  return avail(hass, cfg.entities.status);
}

export function compressorState(hass, cfg) {
  const s = st(hass, cfg.entities.status);
  const motor = st(hass, cfg.entities.motor);
  const running = motor && motor.state === 'on';
  const motorTxt = running ? 'im Betrieb' : (motor && motor.state === 'off' ? 'außer Betrieb' : 'Motorzustand unbekannt');
  if (!s || NA.has(s.state)) return { level: 'na', title: 'Keine Daten', sub: 'Verarbeitung nicht erreichbar' };
  if (s.state === 'keine_daten') return { level: 'na', title: 'Keine Daten', sub: 'Keine aktuellen Messwerte' };
  const alerts = activeAlerts(hass, cfg) || [];
  if (s.state === 'stoerung') {
    const f = alerts.find((x) => x.schwere === 'stoerung');
    return { level: 'crit', title: 'Störung', sub: f ? shorten(f.text) : motorTxt };
  }
  if (s.state === 'warnung') {
    const w = alerts.find((x) => x.schwere === 'warnung');
    return { level: 'warn', title: 'Warnung', sub: w ? shorten(w.text) : motorTxt };
  }
  if (running) return { level: 'ok', title: 'im Betrieb', sub: 'Normalbetrieb' };
  return { level: 'off', title: 'außer Betrieb', sub: 'Stillstand' };
}

function shorten(t, n = 34) { t = String(t || ''); return t.length > n ? t.slice(0, n - 1) + '…' : t; }

/** Messwert-Zustand: missing (kein Sensor konfiguriert) | na (keine Daten) | ok | warn | crit */
export function measureLevel(hass, cfg, key) {
  const id = cfg.entities[key];
  if (!id) return 'missing';
  if (!avail(hass, id)) return 'na';
  const alerts = activeAlerts(hass, cfg) || [];
  const sid = SENSOR_ID[key];
  let lvl = 'ok';
  for (const a of alerts) {
    const aid = a.id || '';
    const hit = (sid && aid.endsWith(sid)) || (key === 'p_final' && aid.startsWith('pressure'));
    if (!hit) continue;
    if (a.schwere === 'stoerung') return 'crit';
    lvl = 'warn';
  }
  return lvl;
}

const CAT_LABEL = {
  comm: 'Kommunikation', sensor_data: 'Sensordaten', temperature: 'Temperatur', pressure: 'Druck', maintenance: 'Wartung', database: 'Datenbank',
};

/** Statusleiste: Kategorie → {level, text} */
export function categoryState(hass, cfg, cat) {
  if (!systemOnline(hass, cfg)) return { level: 'na', text: 'Unbekannt' };
  const alerts = activeAlerts(hass, cfg);
  if (alerts === null) return { level: 'na', text: 'Unbekannt' };
  const mine = alerts.filter((a) => a.kategorie === cat);
  if (mine.some((a) => a.schwere === 'stoerung')) return { level: 'crit', text: 'Störung' };
  if (mine.length) return { level: 'warn', text: 'Warnung' };
  const E = cfg.entities;
  const status = st(hass, E.status)?.state;
  switch (cat) {
    case 'comm':
      if (status === 'keine_daten') return { level: 'na', text: 'Keine Daten' };
      break;
    case 'sensor_data': {
      // nur vorhandene Messstellen (Ausstattung): nicht vorhandene sind null bzw. „nicht_vorhanden“
      const ss = Object.values(E.sensor_status).filter(Boolean).map((id) => st(hass, id)?.state).filter((x) => x !== 'nicht_vorhanden');
      if (ss.every((x) => x !== 'ok')) return { level: 'na', text: 'Keine Daten' };
      if (ss.some((x) => x !== 'ok')) return { level: 'warn', text: 'Unvollständig' };
      break;
    }
    case 'temperature':
      if (!['t1', 't12', 't2', 't23', 't3'].some((k) => avail(hass, E[k]))) return { level: 'na', text: 'Keine Daten' };
      break;
    case 'pressure':
      if (!avail(hass, E.p_final)) return { level: 'na', text: 'Keine Daten' };
      break;
    case 'maintenance': {
      const m = st(hass, E.maint_status)?.state, f = st(hass, E.filter_status)?.state;
      if (!m || NA.has(m)) return { level: 'na', text: 'Unbekannt' };
      if (m === 'bald_faellig' || f === 'bald_faellig') return { level: 'warn', text: 'Bald fällig' };
      if (m === 'nicht_festgelegt' && f === 'nicht_festgelegt') return { level: 'na', text: 'Nicht festgelegt' };
      break;
    }
    case 'database': {
      const d = st(hass, E.system.db_state)?.state;
      if (d === 'nicht_erreichbar') return { level: 'crit', text: 'Nicht erreichbar' };
      if (d === 'schreibfehler') return { level: 'warn', text: 'Schreibfehler' };
      if (d !== 'ok') return { level: 'na', text: 'Unbekannt' };
      break;
    }
  }
  return { level: 'ok', text: 'OK' };
}

export { CAT_LABEL, SENSOR_ID };

export function sourceState(hass, cfg) {
  const s = st(hass, cfg.entities.source)?.state;
  if (s === 'simulation') return { level: 'sim', text: 'Simulation' };
  if (s === 'real') return { level: 'ok', text: 'Reale Sensorik' };
  return { level: 'na', text: 'Keine Daten' };
}

export function numOr(hass, id) { return num(hass, id); }
