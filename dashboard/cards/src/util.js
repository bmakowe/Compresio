// Hilfsfunktionen: Zustände, Formatierung, Dienste

export const NA = new Set(['unavailable', 'unknown', 'none', '', undefined, null]);

export function st(hass, id) {
  return id ? hass?.states?.[id] : undefined;
}

export function avail(hass, id) {
  const s = st(hass, id);
  return !!s && !NA.has(s.state);
}

export function num(hass, id) {
  const s = st(hass, id);
  if (!s || NA.has(s.state)) return null;
  const v = Number(s.state);
  return Number.isFinite(v) ? v : null;
}

const nf = {};
export function fmt(v, dec = 1) {
  if (v === null || v === undefined || !Number.isFinite(v)) return '–';
  const k = String(dec);
  nf[k] ||= new Intl.NumberFormat('de-DE', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  return nf[k].format(v);
}

export function fmtHours(h) {
  if (h === null || h === undefined || !Number.isFinite(h)) return '–';
  const total = Math.round(h * 60);
  return `${Math.floor(total / 60)} h ${total % 60} min`;
}

export function fmtMinutes(m, withSec = false) {
  if (m === null || m === undefined || !Number.isFinite(m)) return '–';
  const s = Math.round(m * 60);
  const h = Math.floor(s / 3600), mi = Math.floor((s % 3600) / 60), se = s % 60;
  return withSec ? `${h} h ${mi} min ${se} sek` : `${h} h ${mi} min`;
}

export function fmtDuration(sec) {
  if (sec === null || sec === undefined || !Number.isFinite(sec)) return '–';
  const s = Math.round(sec);
  if (s < 60) return `${s} s`;
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h ? `${h} h ${m} min` : `${m} min ${s % 60} s`;
}

export function fmtTime(d, withDate = false) {
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt)) return '–';
  return dt.toLocaleString('de-DE', withDate
    ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }
    : { hour: '2-digit', minute: '2-digit' });
}

export function fmtAgo(d) {
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt)) return '–';
  const s = Math.round((Date.now() - dt) / 1000);
  if (s < 5) return 'gerade eben';
  if (s < 60) return `vor ${s} s`;
  if (s < 3600) return `vor ${Math.round(s / 60)} min`;
  if (s < 86400) return `vor ${Math.round(s / 3600)} h`;
  return fmtTime(dt, true);
}

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function moreInfo(el, entityId) {
  if (!entityId) return;
  el.dispatchEvent(new CustomEvent('hass-more-info', { bubbles: true, composed: true, detail: { entityId } }));
}

export function navigate(path) {
  history.pushState(null, '', path);
  window.dispatchEvent(new CustomEvent('location-changed', { detail: { replace: false } }));
}

// Zustandsklassen des Designsystems
export const LEVEL = { ok: 'ok', warn: 'warn', crit: 'crit', off: 'off', na: 'na' };
export const LEVEL_TEXT = { ok: 'OK', warn: 'Warnung', crit: 'Störung', off: 'Aus', na: 'Unbekannt' };

export const STATUS_TEXT = { normal: 'Normal', warnung: 'Warnung', stoerung: 'Störung', keine_daten: 'Keine Daten' };
export const MAINT_TEXT = { ok: 'OK', bald_faellig: 'Bald fällig', faellig: 'Fällig', nicht_festgelegt: 'Nicht festgelegt' };
export const MAINT_LEVEL = { ok: 'ok', bald_faellig: 'warn', faellig: 'crit', nicht_festgelegt: 'na' };
export const SOURCE_TEXT = { simulation: 'Simulation', real: 'Reale Sensorik', keine: 'Keine Daten' };

export function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
