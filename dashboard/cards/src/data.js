// Datenzugriff ausschließlich über Home-Assistant-APIs (WebSocket):
//  - history/history_during_period   (Recorder, 31 Tage)          → kurze Zeiträume, hohe Auflösung
//  - recorder/statistics_during_period (Langzeitstatistik)       → 7 d / 30 d / 12 Monate, aggregiert
//  - Ereignisse: History der Event-Entität (mit Attributen)       → Zyklen, Meldungen, Wartung
// Ergebnisse werden kurz zwischengespeichert, Abfragen sind auf das Nötige begrenzt.

export const RANGES = {
  '1h': { label: '1 h', ms: 3600e3, mode: 'history' },
  '6h': { label: '6 h', ms: 6 * 3600e3, mode: 'history' },
  '24h': { label: '24 h', ms: 24 * 3600e3, mode: 'history' },
  '7d': { label: '7 d', ms: 7 * 86400e3, mode: 'stats', period: '5minute' },
  '30d': { label: '30 d', ms: 30 * 86400e3, mode: 'stats', period: 'hour' },
  '12m': { label: '12 M', ms: 365 * 86400e3, mode: 'stats', period: 'day' },
};

const cache = new Map();
const CACHE_MS = 20e3;

async function cached(key, fn) {
  const c = cache.get(key);
  if (c && Date.now() - c.t < CACHE_MS) return c.p;
  const p = fn();
  cache.set(key, { t: Date.now(), p });
  if (cache.size > 60) cache.delete(cache.keys().next().value);
  try { return await p; } catch (e) { cache.delete(key); throw e; }
}

export function rangeWindow(rangeKey, custom) {
  if (rangeKey === 'custom' && custom) return { start: new Date(custom.start), end: new Date(custom.end) };
  const end = new Date();
  return { start: new Date(end - RANGES[rangeKey].ms), end };
}

export function modeFor(rangeKey, win) {
  if (rangeKey !== 'custom') return RANGES[rangeKey];
  const span = win.end - win.start;
  const ageStart = Date.now() - win.start;
  if (span <= 2 * 86400e3 && ageStart <= 30 * 86400e3) return { mode: 'history' };
  return { mode: 'stats', period: span > 60 * 86400e3 ? 'day' : span > 7 * 86400e3 ? 'hour' : '5minute' };
}

// Downsampling auf max. n Punkte (Bucket-Mittelwert, Extremwerte bleiben erhalten)
export function downsample(points, n = 1200) {
  if (points.length <= n) return points;
  const size = Math.ceil(points.length / (n / 2));
  const out = [];
  for (let i = 0; i < points.length; i += size) {
    const b = points.slice(i, i + size);
    let mn = b[0], mx = b[0];
    for (const p of b) { if (p[1] < mn[1]) mn = p; if (p[1] > mx[1]) mx = p; }
    if (mn[0] <= mx[0]) out.push(mn, mx); else out.push(mx, mn);
  }
  return out;
}

/** Numerische History: { entity_id: [[ts, value|null], ...] } (null = Lücke / nicht verfügbar) */
export async function fetchHistory(hass, ids, start, end) {
  ids = ids.filter(Boolean);
  if (!ids.length) return {};
  const key = `h|${ids.join(',')}|${Math.round(start / 10e3)}|${Math.round(end / 10e3)}`;
  return cached(key, async () => {
    const res = await hass.callWS({
      type: 'history/history_during_period', start_time: start.toISOString(), end_time: end.toISOString(),
      entity_ids: ids, minimal_response: true, no_attributes: true, significant_changes_only: false,
    });
    const out = {};
    for (const id of ids) {
      const rows = res[id] || [];
      out[id] = rows.map((r) => {
        const t = (r.lu ?? r.lc ?? 0) * 1000;
        const raw = r.s;
        if (raw === 'on') return [t, 1];
        if (raw === 'off') return [t, 0];
        if (raw === null || raw === undefined || raw === '') return [t, null];   // kein Wert ≠ 0
        const v = Number(raw);
        return [t, Number.isFinite(v) ? v : null];
      });
    }
    return out;
  });
}

/** Langzeitstatistik: { id: [{ts, mean, min, max, change}] } */
export async function fetchStats(hass, ids, start, end, period, types = ['mean', 'min', 'max']) {
  ids = ids.filter(Boolean);
  if (!ids.length) return {};
  const key = `s|${ids.join(',')}|${period}|${types}|${Math.round(start / 60e3)}|${Math.round(end / 60e3)}`;
  return cached(key, async () => {
    const res = await hass.callWS({
      type: 'recorder/statistics_during_period', start_time: start.toISOString(), end_time: end.toISOString(),
      statistic_ids: ids, period, types, units: {},
    });
    const out = {};
    for (const id of ids) out[id] = (res[id] || []).map((r) => ({ ts: r.start, mean: r.mean, min: r.min, max: r.max, change: r.change }));
    return out;
  });
}

/** Messreihe für einen Zeitraum – automatisch History oder Statistik */
export async function fetchSeries(hass, ids, rangeKey, custom) {
  const win = rangeWindow(rangeKey, custom);
  const m = modeFor(rangeKey, win);
  if (m.mode === 'history') {
    const h = await fetchHistory(hass, ids, win.start, win.end);
    const out = {};
    for (const [id, pts] of Object.entries(h)) out[id] = downsample(pts.filter((p) => p[1] !== null || true));
    return { win, mode: 'history', data: out };
  }
  const s = await fetchStats(hass, ids, win.start, win.end, m.period);
  const out = {}, band = {};
  for (const [id, rows] of Object.entries(s)) {
    out[id] = rows.map((r) => [r.ts, r.mean ?? null]);
    band[id] = rows.map((r) => [r.ts, r.min ?? null, r.max ?? null]);
  }
  return { win, mode: 'stats', period: m.period, data: out, band };
}

/** Ereignisse der Event-Entität im Zeitraum (neueste zuerst) */
export async function fetchEvents(hass, eventEntity, start, end) {
  if (!eventEntity) return [];
  const key = `e|${eventEntity}|${Math.round(start / 10e3)}|${Math.round(end / 10e3)}`;
  return cached(key, async () => {
    const res = await hass.callWS({
      type: 'history/history_during_period', start_time: start.toISOString(), end_time: end.toISOString(),
      entity_ids: [eventEntity], minimal_response: false, no_attributes: false, significant_changes_only: false,
    });
    const rows = res[eventEntity] || [];
    const out = [];
    for (const r of rows) {
      const a = r.a || r.attributes || {};
      if (!a.event_type) continue;
      const t = a.zeit ? Date.parse(a.zeit) : (r.lu ?? r.lc) * 1000;
      if (t < start || t > end) continue;
      out.push({ t, type: a.event_type, ...a });
    }
    const seen = new Set();
    const uniq = out.filter((e) => { const k = `${e.t}|${e.type}|${e.text}`; if (seen.has(k)) return false; seen.add(k); return true; });
    uniq.sort((x, y) => y.t - x.t);
    return uniq;
  });
}

/** Betriebszyklen aus den Ereignissen (motorstopp enthält die Zykluskennwerte) */
export function cyclesFrom(events, cfg) {
  return events
    .filter((e) => e.type === 'motorstopp' && Number.isFinite(Number(e.dauer_s)))
    .map((e) => {
      const dur = Number(e.dauer_s);
      const pS = num0(e.p_start), pE = num0(e.p_end), rate = num0(e.rate);
      const start = num0(e.start) ?? (e.t - dur * 1000);
      const comparable = Number(e.comparable) === 1 || (dur >= cfg.cycle.min_duration_s && pS !== null && pE !== null && pE - pS >= cfg.cycle.min_delta_bar);
      const mx = {}, t0 = {};
      for (const k of ['t1', 't12', 't2', 't23', 't3', 'tr']) { mx[k] = num0(e[`${k}_max`]); t0[k] = num0(e[`${k}_start`]); }
      return { end: e.t, start, dur, p_start: pS, p_end: pE, rate, comparable, t1: mx.t1, t2: mx.t2, t3: mx.t3, max: mx, t0,
               tr: num0(e.tr_mean) ?? t0.tr, i_max: num0(e.i_max), i_mean: num0(e.i_mean), u_mean: num0(e.u_mean), source: e.quelle };
    })
    .sort((a, b) => a.end - b.end);
}

function num0(v) { const n = Number(v); return v === undefined || v === null || v === '' || !Number.isFinite(n) ? null : n; }

export function invalidateCache() { cache.clear(); }
