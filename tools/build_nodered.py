"""Erzeugt die Node-RED-Flows von Compresio und spielt sie ein.

  python tools/build_nodered.py            # erzeugen + deployen (Credentials aus .env)
  python tools/build_nodered.py --export   # nur config/nodered/flows.json schreiben (ohne Credentials)

Die Flows sind in Tabs 00–11 + 90 (Simulation) gegliedert, siehe docs/nodered.md.
Alle Node-IDs sind deterministisch (Präfix "krm"), damit ein erneutes Deployment
die bestehenden Knoten ersetzt statt sie zu duplizieren. Fremde Knoten bleiben erhalten.
"""
import hashlib
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VERSION = "1.1.0"
INFLUX = "http://a0d7b954-influxdb:8086"      # Hostname der InfluxDB-App (unabhängig von IP/Hardware)
BROKER = "core-mosquitto"                      # Hostname der Mosquitto-App
T = "kompressor"

nodes = []


def nid(*parts):
    return "krm" + hashlib.sha1("/".join(parts).encode()).hexdigest()[:12]


def tab(key, label, info):
    t = {"id": nid("tab", key), "type": "tab", "label": label, "disabled": False, "info": info}
    nodes.append(t)
    return t["id"]


def add(z, type_, name, x, y, wires=None, **kw):
    n = {"id": nid(z, name), "type": type_, "z": z, "name": name, "x": x, "y": y}
    if wires is not None:
        n["wires"] = wires
    n.update(kw)
    nodes.append(n)
    return n["id"]


def comment(z, name, info, x=170, y=40):
    return add(z, "comment", name, x, y, wires=[], info=info)


def func(z, name, code, x, y, wires, outputs=None, **kw):
    return add(z, "function", name, x, y, wires=wires, func=code.strip(),
               outputs=outputs if outputs is not None else len(wires),
               timeout=0, noerr=0, initialize="", finalize="", libs=[], **kw)


def inject(z, name, x, y, wires, repeat="", once=True, delay="0.5", topic="tick"):
    return add(z, "inject", name, x, y, wires=wires,
               props=[{"p": "payload"}, {"p": "topic", "vt": "str"}],
               repeat=str(repeat), crontab="", once=once, onceDelay=str(delay),
               topic=topic, payload="", payloadType="date")


def mqtt_in(z, name, topic, x, y, wires, datatype="auto-detect"):
    return add(z, "mqtt in", name, x, y, wires=wires, topic=topic, qos="1", datatype=datatype,
               broker=BROKER_ID, nl=False, rap=True, rh=0, inputs=0)


def link_in(z, name, x, y, wires):
    return add(z, "link in", name, x, y, wires=wires, links=[])


def link_out(z, name, x, y, targets):
    return add(z, "link out", name, x, y, mode="link", links=targets)


def http(z, name, x, y, wires, method="use", auth=True):
    kw = dict(method=method, ret="txt", paytoqs="ignore", url="", tls="", persist=False,
              proxy="", insecureHTTPParser=False, authType="basic" if auth else "",
              senderr=False, headers=[])
    return add(z, "http request", name, x, y, wires=wires, **kw)


def connect_links():
    """Trägt die Gegenrichtung der link-Verbindungen ein (Node-RED erwartet beide)."""
    by_id = {n["id"]: n for n in nodes}
    for n in nodes:
        if n.get("type") == "link out":
            for t in n["links"]:
                if n["id"] not in by_id[t]["links"]:
                    by_id[t]["links"].append(n["id"])


# ---------------------------------------------------------------- Konfigurationsknoten
BROKER_ID = nid("cfg", "mqtt-broker")
nodes.append({
    "id": BROKER_ID, "type": "mqtt-broker", "name": "Mosquitto (lokal)", "broker": BROKER, "port": "1883",
    "clientid": "kompressor-nodered", "autoConnect": True, "usetls": False, "protocolVersion": "4",
    "keepalive": "30", "cleansession": True, "autoUnsubscribe": True,
    # Birth / Close / Last Will: Verfügbarkeit der gesamten Verarbeitung für Home Assistant
    "birthTopic": f"{T}/availability", "birthQos": "1", "birthRetain": "true", "birthPayload": "online", "birthMsg": {},
    "closeTopic": f"{T}/availability", "closeQos": "1", "closeRetain": "true", "closePayload": "offline", "closeMsg": {},
    "willTopic": f"{T}/availability", "willQos": "1", "willRetain": "true", "willPayload": "offline", "willMsg": {},
    "userProps": "", "sessionExpiry": "",
})

# Zentrale Ziele (werden in mehreren Tabs verlinkt) – IDs vorab festlegen
L_MQTT_OUT = nid("t01", "MQTT senden")
L_VALIDATE = nid("t02", "von Eingang")
L_PREPARE = nid("t03", "von Validierung")
L_RUNSTATE = nid("t04", "Motorstrom")
L_COUNTER = nid("t05", "Zähler-Ereignisse")
L_MAINT_STATUS = nid("t06", "Zählerstand")
L_INVALID = nid("t07", "ungültige Werte")
L_ALERTS = nid("t08", "Alarmprüfung")
L_DB = nid("t09", "Datenpunkte")

# ================================================================ 00 Konfiguration
z = tab("t00", "00 Konfiguration", "Zentrale Parameter. ALLE Schwellwerte sind TEST-Werte, keine Herstellerangaben.")
comment(z, "Zentrale Konfiguration – TEST-Werte", """\
Alle Grenz- und Schwellwerte in diesem Tab sind **vorläufige TEST-Werte**.
Sie sind KEINE Herstellerangaben und dienen nur dem Test der
Verarbeitungskette. Vor dem Echtbetrieb anhand der Betriebsanleitung ersetzen.

- `sensors.*.min/max`: Plausibilitätsbereich (Messbereich), nicht Betriebsgrenze
- `sensors.*.stale_s`: nach dieser Zeit ohne Wert gilt ein Sensor als "keine Daten"
- `running`: Motorstrom-Schwellen für die Laufzustandserkennung (mit Hysterese)
- `alerts`: Warn-/Störschwellen (TEST)""")
CFG_JS = r"""
// ALLE Schwellwerte sind vorläufige TEST-WERTE und KEINE Herstellerangaben.
// Sie dienen ausschließlich dem Test der Verarbeitungskette und müssen nach
// Prüfung der Herstellerunterlagen ersetzt werden (docs/nodered.md, docs/maintenance.md).
global.set('cfg', {
    version: '%VERSION%',
    thresholds_are_test_values: true,
    sensors: {
        pressure_final: { name: 'Enddruck',             unit: 'bar', min: -1,  max: 450, stale_s: 30, dec: 1, topic: 'pressure/final' },
        temp_stage1:    { name: 'Zylindertemperatur Stufe 1', unit: '°C', min: -40, max: 300, stale_s: 30, dec: 1, topic: 'temperature/stage1' },
        temp_coil12:    { name: 'Kühlspirale Stufe 1→2',      unit: '°C', min: -40, max: 300, stale_s: 30, dec: 1, topic: 'temperature/coil12' },
        temp_stage2:    { name: 'Zylindertemperatur Stufe 2', unit: '°C', min: -40, max: 300, stale_s: 30, dec: 1, topic: 'temperature/stage2' },
        temp_coil23:    { name: 'Kühlspirale Stufe 2→3',      unit: '°C', min: -40, max: 300, stale_s: 30, dec: 1, topic: 'temperature/coil23' },
        temp_stage3:    { name: 'Zylindertemperatur Stufe 3', unit: '°C', min: -40, max: 300, stale_s: 30, dec: 1, topic: 'temperature/stage3' },
        temp_room:      { name: 'Raumtemperatur',             unit: '°C', min: -30, max: 60,  stale_s: 120, dec: 1, topic: 'temperature/room' },
        motor_current:  { name: 'Motorstrom',           unit: 'A',   min: 0,   max: 100, stale_s: 30, dec: 2, topic: 'motor/current' },
        supply_voltage: { name: 'Versorgungsspannung',  unit: 'V',   min: 0,   max: 500, stale_s: 60, dec: 0, topic: 'supply/voltage' }
    },
    running: { on_a: 2.0, off_a: 1.0, debounce_s: 4 },               // TEST
    alerts: {                                                          // TEST
        temp_warn_c: 150, temp_crit_c: 180, temp_rate_warn_c_min: 20,
        pressure_warn_bar: 220, pressure_crit_bar: 240,
        no_rise_after_min: 3, no_rise_rate_bar_min: 0.5,
        maint_soon_ratio: 0.9
    },
    // Vergleichbare Betriebszyklen für Druckanstieg/Referenz (Annahme, siehe docs/diagnostics.md)
    cycle: { min_duration_s: 120, min_delta_bar: 50 },
    comm_timeout_s: 60,      // keine Messdaten -> Kommunikationsausfall
    ts_max_future_s: 30,     // Zeitstempel weiter in der Zukunft -> durch Empfangszeit ersetzt
    ts_max_past_s: 3600,     // Zeitstempel älter -> verworfen
    invalid_hold_s: 60       // so lange bleibt ein Sensor nach ungültigem Wert "ungültig"
});
node.status({ fill: 'yellow', shape: 'dot', text: 'TEST-Schwellwerte aktiv' });
return null;
""".replace("%VERSION%", VERSION)
f = func(z, "Konfiguration setzen (TEST-Werte)", CFG_JS, 480, 120, [], outputs=0)
inject(z, "beim Start", 190, 120, [[f]], delay="0.1")

# ================================================================ 01 MQTT-Eingang
z = tab("t01", "01 MQTT-Eingang", "Empfang der Rohdaten der Sensorik (bzw. Simulation) und zentraler MQTT-Ausgang.")
comment(z, "Rohdaten-Eingang", f"""\
Sensorik (oder Simulation) publiziert je Messgröße auf `{T}/raw/<sensor>`:
`{{"v": <Zahl>, "ts": <Unix-ms>, "src": "real"|"sim", "seq": <laufende Nr.>}}`

`{T}/raw/status` = `online`/`offline` (retained, Last Will des Sensorknotens).
Alle ausgehenden MQTT-Nachrichten laufen über den Link "MQTT senden".""")
ROUTE_JS = r"""
// raw/status = Verfügbarkeit des Sensorknotens (LWT), alles andere = Messwerte
if (msg.topic.endsWith('/status')) return [null, msg];
return [msg, null];
"""
NODE_STATUS_JS = r"""
const p = String(msg.payload === undefined || msg.payload === null ? '' : msg.payload).trim().toLowerCase();
const st = p === 'online' ? 'online' : (p === 'offline' ? 'offline' : undefined);
const prev = global.get('sensor_node_status');
global.set('sensor_node_status', st);
node.status({ fill: st === 'online' ? 'green' : (st === 'offline' ? 'red' : 'grey'), shape: 'dot', text: st || 'nicht angemeldet' });
if (prev === st) return null;
return { payload: [{ rp: 'events', line: 'events,type=sensor_node value=' + (st === 'online' ? 1 : 0) + ',text="Sensorknoten: ' + (st || 'abgemeldet') + '"' }] };
"""
lo_val = link_out(z, "→ Validierung", 640, 120, [L_VALIDATE])
lo_db1 = link_out(z, "→ Datenbank", 640, 180, [L_DB])
fs = func(z, "Sensorknoten-Status", NODE_STATUS_JS, 470, 180, [[lo_db1]])
fr = func(z, "Routing", ROUTE_JS, 300, 140, [[lo_val], [fs]])
mqtt_in(z, "Rohdaten", f"{T}/raw/+", 130, 140, [[fr]])
mo = add(z, "mqtt out", "MQTT-Ausgang", 330, 300, wires=[], topic="", qos="1", retain="", respTopic="",
         contentType="", userProps="", correl="", expiry="", broker=BROKER_ID)
nodes.append({"id": L_MQTT_OUT, "type": "link in", "z": z, "name": "MQTT senden", "links": [], "x": 135, "y": 300, "wires": [[mo]]})
comment(z, "Zentraler MQTT-Ausgang", "msg.topic / msg.payload / msg.retain werden aus der Nachricht übernommen.", 170, 260)

# ================================================================ 02 Validierung
z = tab("t02", "02 Datenvalidierung", "Plausibilität, Zeitstempel, Duplikate.")
comment(z, "Validierung", """\
Prüft jede Rohnachricht:
1. bekannter Sensor, numerischer Wert, innerhalb des Messbereichs (cfg.sensors.*.min/max)
2. Zeitstempel: fehlend oder > 30 s in der Zukunft → Empfangszeit; > 1 h alt → verworfen
3. Duplikate: gleicher/älterer Zeitstempel oder gleiche `seq` je Sensor+Quelle → verworfen

Ausgang 1: gültig → Aufbereitung. Ausgang 2: ungültig → Fehlererkennung.
Zähler in `global.stats` (rx/valid/invalid/dup/ts_fixed) für die Systemdiagnose.""")
VALIDATE_JS = r"""
const cfg = global.get('cfg'); if (!cfg) return [null, null];
const stats = global.get('stats') || { rx: 0, valid: 0, invalid: 0, dup: 0, ts_fixed: 0 };
stats.rx++;
const now = Date.now();
const sensor = msg.topic.split('/').pop();
let p = msg.payload;
if (typeof p !== 'object' || p === null) p = { v: p };
const def = cfg.sensors[sensor];
const src = p.src === 'sim' ? 'sim' : 'real';
function reject(reason) {
    stats.invalid++; global.set('stats', stats);
    node.status({ fill: 'red', shape: 'ring', text: sensor + ': ' + reason });
    return [null, { topic: 'invalid', payload: { sensor: sensor, reason: reason, src: src, ts: now } }];
}
if (!def) return reject('unbekannter Sensor');
const v = (p.v === null || p.v === undefined || p.v === '') ? NaN : Number(p.v);
if (!Number.isFinite(v)) return reject('kein gültiger Zahlenwert');
if (v < def.min || v > def.max) return reject('außerhalb Messbereich: ' + v + ' ' + def.unit);
let ts = Number(p.ts), tsNote = null;
if (!Number.isFinite(ts) || ts <= 0) { ts = now; tsNote = 'Zeitstempel fehlte'; }
else if (ts > now + cfg.ts_max_future_s * 1000) { ts = now; tsNote = 'Zeitstempel in der Zukunft, korrigiert'; }
else if (ts < now - cfg.ts_max_past_s * 1000) return reject('Zeitstempel zu alt');
const last = context.get('last') || {};
const key = sensor + '|' + src;
const l = last[key];
if (l && (ts <= l.ts || (p.seq !== undefined && p.seq === l.seq))) {
    stats.dup++; global.set('stats', stats);
    node.status({ fill: 'yellow', shape: 'ring', text: sensor + ': Duplikat verworfen' });
    return [null, null];
}
last[key] = { ts: ts, seq: p.seq }; context.set('last', last);
if (tsNote) stats.ts_fixed++;
stats.valid++; global.set('stats', stats);
node.status({ fill: 'green', shape: 'dot', text: 'gültig ' + stats.valid + ' | ungültig ' + stats.invalid + ' | Duplikate ' + stats.dup });
msg.payload = { sensor: sensor, v: v, ts: ts, src: src, ts_note: tsNote };
return [msg, null];
"""
lo_prep = link_out(z, "→ Aufbereitung", 620, 120, [L_PREPARE])
lo_inv = link_out(z, "→ Fehlererkennung", 620, 180, [L_INVALID])
fv = func(z, "Validieren", VALIDATE_JS, 400, 140, [[lo_prep], [lo_inv]])
nodes.append({"id": L_VALIDATE, "type": "link in", "z": z, "name": "von Eingang", "links": [], "x": 175, "y": 140, "wires": [[fv]]})

# ================================================================ 03 Aufbereitung
z = tab("t03", "03 Datenaufbereitung", "Aktuelle Werte, Änderungsraten, MQTT-Statuswerte, Datenbankpunkte.")
comment(z, "Aufbereitung", f"""\
- hält den letzten gültigen Wert je Sensor in `global.latest`
- berechnet Änderungsraten (Druck bar/min, Temperaturen °C/min) über 60 s
- publiziert aufbereitete Werte (retained) unter `{T}/<gruppe>/<wert>` – gedrosselt: max. alle 10 s oder bei deutlicher Änderung
- erzeugt InfluxDB-Punkte `sensor,sensor=<id>,source=<real|sim> value=…,rate=…`
- leitet den Motorstrom an die Betriebszustandserkennung weiter""")
PREPARE_JS = r"""
const cfg = global.get('cfg'); const m = msg.payload; const def = cfg.sensors[m.sensor];
const now = Date.now();
const latest = global.get('latest') || {};
latest[m.sensor] = { v: m.v, ts: m.ts, src: m.src, rx: now };
global.set('latest', latest);
global.set('last_rx', now);
global.set('source_last', m.src);
// HA-Aktualisierung drosseln (Recorder-Datenbank schonen): höchstens alle 10 s oder bei deutlicher Änderung.
// InfluxDB erhält weiterhin jeden Messwert.
const DEADBAND = { pressure_final: 2, temp_stage1: 1, temp_stage2: 1, temp_stage3: 1, temp_coil12: 1, temp_coil23: 1, temp_room: 0.2, motor_current: 0.5, supply_voltage: 5 };
const pub = context.get('pub') || {};
const lp = pub[m.sensor];
// Kennwerte des laufenden Betriebszyklus sammeln (für Zyklus-Ereignis und Diagnose)
const run = global.get('run_state');
if (run && run.running && run.src === m.src) {
    let acc = global.get('cycle_acc');
    if (!acc || acc.start !== run.since) {
        // Ausgangstemperaturen = letzte Werte vor/bei Motorstart
        const t0 = {};
        for (const k of ['temp_stage1', 'temp_coil12', 'temp_stage2', 'temp_coil23', 'temp_stage3', 'temp_room']) if (latest[k] && now - latest[k].rx < 120000) t0[k] = latest[k].v;
        acc = { start: run.since, src: m.src, p_start: null, p_max: null, t_max: {}, t0: t0, tr_sum: 0, tr_n: 0, i_max: null, i_sum: 0, i_n: 0, u_sum: 0, u_n: 0 };
    }
    if (m.sensor === 'pressure_final') { if (acc.p_start === null) acc.p_start = m.v; acc.p_max = Math.max(acc.p_max === null ? m.v : acc.p_max, m.v); }
    else if (m.sensor === 'temp_room') { acc.tr_sum += m.v; acc.tr_n++; }
    else if (m.sensor.startsWith('temp_')) acc.t_max[m.sensor] = Math.max(acc.t_max[m.sensor] === undefined ? m.v : acc.t_max[m.sensor], m.v);
    else if (m.sensor === 'motor_current' && m.ts - run.since > 5000) { acc.i_max = Math.max(acc.i_max === null ? m.v : acc.i_max, m.v); acc.i_sum += m.v; acc.i_n++; }
    else if (m.sensor === 'supply_voltage') { acc.u_sum += m.v; acc.u_n++; }
    global.set('cycle_acc', acc);
}
const mq = [];
if (!lp || now - lp.t >= 10000 || Math.abs(m.v - lp.v) >= (DEADBAND[m.sensor] || 0)) {
    pub[m.sensor] = { t: now, v: m.v }; context.set('pub', pub);
    mq.push({ topic: 'kompressor/' + def.topic, payload: String(Number(m.v.toFixed(def.dec))), retain: true });
}
const rates = global.get('rates') || {};
if (m.sensor === 'pressure_final' || m.sensor.startsWith('temp_')) {
    const h = (context.get('hist_' + m.sensor) || []).filter(x => x[0] >= m.ts - 60000);
    h.push([m.ts, m.v]); context.set('hist_' + m.sensor, h);
    const dt = h[h.length - 1][0] - h[0][0];
    rates[m.sensor] = dt >= 20000 ? (h[h.length - 1][1] - h[0][1]) / (dt / 60000) : null;
    global.set('rates', rates);
    if (m.sensor === 'pressure_final' && rates[m.sensor] !== null && mq.length)
        mq.push({ topic: 'kompressor/pressure/rate', payload: String(Number(rates[m.sensor].toFixed(1))), retain: true });
}
if (now - (context.get('last_update_pub') || 0) >= 5000) {
    context.set('last_update_pub', now);
    mq.push({ topic: 'kompressor/last_update', payload: new Date(m.ts).toISOString(), retain: true });
}
let line = 'sensor,sensor=' + m.sensor + ',source=' + m.src + ' value=' + m.v;
if (rates[m.sensor] !== undefined && rates[m.sensor] !== null) line += ',rate=' + rates[m.sensor].toFixed(3);
line += ' ' + m.ts;
node.status({ fill: 'green', shape: 'dot', text: m.sensor + ' = ' + m.v + ' ' + def.unit + ' (' + m.src + ')' });
return [mq, { payload: [line] }, m.sensor === 'motor_current' ? msg : null];
"""
lo1 = link_out(z, "→ MQTT", 640, 100, [L_MQTT_OUT])
lo2 = link_out(z, "→ Datenbank", 640, 140, [L_DB])
lo3 = link_out(z, "→ Betriebszustand", 640, 180, [L_RUNSTATE])
fp = func(z, "Aufbereiten", PREPARE_JS, 420, 140, [[lo1], [lo2], [lo3]])
nodes.append({"id": L_PREPARE, "type": "link in", "z": z, "name": "von Validierung", "links": [], "x": 185, "y": 140, "wires": [[fp]]})

# ================================================================ 04 Betriebszustand
z = tab("t04", "04 Betriebszustand", "Laufzustand des Motors aus dem Motorstrom (Hysterese + Entprellung).")
comment(z, "Betriebszustandserkennung", """\
Motor läuft, wenn Motorstrom ≥ `cfg.running.on_a`; steht, wenn ≤ `cfg.running.off_a`
(Hysterese). Ein Wechsel wird erst nach `debounce_s` übernommen (Anlaufspitzen/Rauschen).
Start/Stopp → Betriebsstundenerfassung + Ereignis in InfluxDB (RP `events`).
Rein beobachtend – es werden keinerlei Steuerbefehle erzeugt.""")
RUN_JS = r"""
const cfg = global.get('cfg'); const m = msg.payload;
let st = context.get('st') || { running: false, cand: null, cand_since: 0, since: m.ts, published: false };
st.src = m.src;
const want = st.running ? (m.v > cfg.running.off_a) : (m.v >= cfg.running.on_a);
let changed = false;
if (want === st.running) st.cand = null;
else {
    if (st.cand !== want) { st.cand = want; st.cand_since = m.ts; }
    if (m.ts - st.cand_since >= cfg.running.debounce_s * 1000) { st.running = want; st.since = st.cand_since; st.cand = null; changed = true; }
}
const out = [];
if (changed || !st.published) { st.published = true; out.push({ topic: 'kompressor/motor/running', payload: st.running ? 'ON' : 'OFF', retain: true }); }
context.set('st', st);
global.set('run_state', { running: st.running, since: st.since, src: st.src, ts: m.ts });
const lines = ['state,source=' + m.src + ' running=' + (st.running ? 1 : 0) + ' ' + m.ts];
let ev = null;
if (changed) {
    ev = { topic: st.running ? 'start' : 'stop', payload: { ts: st.since, src: st.src } };
    lines.push({ rp: 'events', line: 'events,type=' + (st.running ? 'motor_start' : 'motor_stop') + ',source=' + st.src +
        ' value=1,text="' + (st.running ? 'Motor gestartet' : 'Motor gestoppt') + '" ' + st.since });
}
node.status({ fill: st.running ? 'green' : 'grey', shape: 'dot', text: (st.running ? 'läuft' : 'steht') + ' (' + st.src + ')' });
return [out, { payload: lines }, ev];
"""
lo1 = link_out(z, "→ MQTT", 620, 100, [L_MQTT_OUT])
lo2 = link_out(z, "→ Datenbank", 620, 140, [L_DB])
lo3 = link_out(z, "→ Betriebsstunden", 620, 180, [L_COUNTER])
fr = func(z, "Laufzustand erkennen", RUN_JS, 400, 140, [[lo1], [lo2], [lo3]])
nodes.append({"id": L_RUNSTATE, "type": "link in", "z": z, "name": "Motorstrom", "links": [], "x": 175, "y": 140, "wires": [[fr]]})

# ================================================================ 05 Betriebsstunden
z = tab("t05", "05 Betriebsstunden", "Gesamtbetriebsstunden, Stunden seit Wartung/Filterwechsel, Starts, Zyklen.")
comment(z, "Betriebsstundenerfassung", f"""\
Zähler getrennt je Quelle (`real` / `sim`), damit Simulationsdaten niemals die
echten Betriebsstunden verfälschen.

**Persistenz:** retained MQTT `{T}/counters` (Mosquitto speichert persistent),
zusätzlich alle 10 s in InfluxDB (`counter`). Beim Start: erst MQTT laden,
sonst aus InfluxDB wiederherstellen, sonst neu initialisieren.

Gezählt wird nur, wenn der Motor läuft UND der Motorstrom aktuell ist (kein Zählen
bei Datenausfall). Lücken > 60 s (Neustart) werden nicht mitgezählt.""")
LOAD_JS = r"""
if (global.get('counters_loaded')) return null;
const p = msg.payload;
if (p && typeof p === 'object' && (p.sim || p.real)) {
    global.set('counters', p); global.set('counters_loaded', true); global.set('counters_origin', 'MQTT (retained)');
    node.status({ fill: 'green', shape: 'dot', text: 'aus MQTT geladen' });
}
return null;
"""
FALLBACK_Q_JS = r"""
if (global.get('counters_loaded')) { node.status({ fill: 'green', shape: 'dot', text: 'nicht nötig' }); return null; }
const q = 'SELECT last(total_s) AS total_s, last(since_maint_s) AS since_maint_s, last(since_filter_s) AS since_filter_s, last(starts) AS starts FROM "raw"."counter" GROUP BY "source"';
msg.url = '%INFLUX%/query?db=kompressor&q=' + encodeURIComponent(q);
msg.method = 'GET';
node.status({ fill: 'yellow', shape: 'dot', text: 'frage InfluxDB ab' });
return msg;
""".replace("%INFLUX%", INFLUX)
FALLBACK_P_JS = r"""
if (global.get('counters_loaded')) return null;
const counters = {};
let origin = 'neu initialisiert (keine gespeicherten Zähler)';
try {
    if (Number(msg.statusCode) !== 200) throw new Error('HTTP ' + msg.statusCode);
    const res = typeof msg.payload === 'string' ? JSON.parse(msg.payload) : msg.payload;
    const series = (res.results && res.results[0] && res.results[0].series) || [];
    for (const s of series) {
        const o = {}; s.columns.forEach((c, i) => o[c] = s.values[0][i]);
        counters[s.tags.source] = { total_s: o.total_s || 0, since_maint_s: o.since_maint_s || 0, since_filter_s: o.since_filter_s || 0,
                                    starts: o.starts || 0, last_cycle_s: null, cycle_start: null };
    }
    if (series.length) origin = 'aus InfluxDB wiederhergestellt';
} catch (e) { origin = 'neu initialisiert (InfluxDB: ' + e.message + ')'; }
global.set('counters', counters); global.set('counters_loaded', true); global.set('counters_origin', origin);
node.status({ fill: origin.startsWith('neu') ? 'yellow' : 'green', shape: 'dot', text: origin });
return null;
"""
LAST_RESORT_JS = r"""
if (global.get('counters_loaded')) return null;
global.set('counters', {}); global.set('counters_loaded', true);
global.set('counters_origin', 'neu initialisiert (weder MQTT noch InfluxDB verfügbar)');
node.status({ fill: 'red', shape: 'dot', text: 'neu initialisiert' });
return null;
"""
COUNTER_JS = r"""
if (!global.get('counters_loaded')) return null;
const cfg = global.get('cfg');
const counters = global.get('counters') || {};
const blank = () => ({ total_s: 0, since_maint_s: 0, since_filter_s: 0, starts: 0, last_cycle_s: null, cycle_start: null });
for (const s of ['sim', 'real']) if (!counters[s]) counters[s] = blank();
const now = Date.now();
const run = global.get('run_state');
const lastRx = global.get('last_rx') || 0;
const fresh = now - lastRx <= cfg.comm_timeout_s * 1000;
const display = (fresh && global.get('source_last')) || context.get('display') || 'real';
context.set('display', display);
const lines = [];
const out_extra = [];
const ev = (type, src, value, text) => lines.push({ rp: 'events', line: 'events,type=' + type + ',source=' + src + ' value=' + value + ',text="' + text + '"' });
switch (msg.topic) {
    case 'start': { const c = counters[msg.payload.src]; c.starts += 1; c.cycle_start = msg.payload.ts; break; }
    case 'stop': {
        const c = counters[msg.payload.src];
        if (c.cycle_start) {
            const dur = Math.max(0, (msg.payload.ts - c.cycle_start) / 1000);
            c.last_cycle_s = dur;
            const acc = global.get('cycle_acc');
            let f = 'value=' + dur.toFixed(0), info = '';
            if (acc && acc.start === c.cycle_start && acc.src === msg.payload.src) {
                if (acc.p_start !== null && dur > 0) {
                    const dp = acc.p_max - acc.p_start, rate = dp / (dur / 60);
                    const comparable = dur >= cfg.cycle.min_duration_s && dp >= cfg.cycle.min_delta_bar;
                    f += ',p_start=' + acc.p_start.toFixed(1) + ',p_end=' + acc.p_max.toFixed(1) + ',rate=' + rate.toFixed(2) + ',comparable=' + (comparable ? 1 : 0);
                    info = ', ' + acc.p_start.toFixed(0) + '→' + acc.p_max.toFixed(0) + ' bar, ' + rate.toFixed(1) + ' bar/min';
                    if (comparable) out_extra.push({ topic: 'kompressor/cycle/last_rate', payload: rate.toFixed(2), retain: true });
                }
                const SH = { temp_stage1: 't1', temp_coil12: 't12', temp_stage2: 't2', temp_coil23: 't23', temp_stage3: 't3', temp_room: 'tr' };
                for (const [k, sh] of Object.entries(SH)) {
                    if (acc.t_max[k] !== undefined) f += ',' + sh + '_max=' + acc.t_max[k].toFixed(1);
                    if (acc.t0 && acc.t0[k] !== undefined) f += ',' + sh + '_start=' + acc.t0[k].toFixed(1);
                }
                if (acc.tr_n) f += ',tr_mean=' + (acc.tr_sum / acc.tr_n).toFixed(1);
                if (acc.i_n) f += ',i_max=' + acc.i_max.toFixed(2) + ',i_mean=' + (acc.i_sum / acc.i_n).toFixed(2);
                if (acc.u_n) f += ',u_mean=' + (acc.u_sum / acc.u_n).toFixed(1);
                f += ',start=' + c.cycle_start;
            }
            lines.push({ rp: 'events', line: 'events,type=cycle,source=' + msg.payload.src + ' ' + f + ',text="Betriebszyklus beendet: ' + (dur / 60).toFixed(1) + ' min' + info + '" ' + msg.payload.ts });
        }
        c.cycle_start = null; break;
    }
    case 'reset_maint': {
        const c = counters[display];
        ev('maintenance', display, (c.since_maint_s / 3600).toFixed(2), 'Wartung erfasst bei ' + (c.total_s / 3600).toFixed(1) + ' Bh (' + (c.since_maint_s / 3600).toFixed(1) + ' h seit letzter Wartung)');
        c.since_maint_s = 0; break;
    }
    case 'reset_filter': {
        const c = counters[display];
        ev('filter_change', display, (c.since_filter_s / 3600).toFixed(2), 'Filterwechsel erfasst bei ' + (c.total_s / 3600).toFixed(1) + ' Bh (' + (c.since_filter_s / 3600).toFixed(1) + ' h seit letztem Wechsel)');
        c.since_filter_s = 0; break;
    }
    default: {
        const last = context.get('last_tick') || now; const dt = (now - last) / 1000; context.set('last_tick', now);
        const mc = (global.get('latest') || {}).motor_current;
        const mcFresh = mc && (now - mc.rx) <= cfg.sensors.motor_current.stale_s * 1000;
        if (run && run.running && mcFresh && dt > 0 && dt <= 60) {
            const c = counters[run.src]; c.total_s += dt; c.since_maint_s += dt; c.since_filter_s += dt;
        }
    }
}
global.set('counters', counters);
const c = counters[display];
const curCycle = (run && run.running && run.src === display && c.cycle_start) ? (now - c.cycle_start) / 60000 : 0;
const out = [
    { topic: 'kompressor/counters', payload: JSON.stringify(counters), retain: true },
    { topic: 'kompressor/operating_hours', payload: (c.total_s / 3600).toFixed(2), retain: true },
    { topic: 'kompressor/maintenance/hours_since', payload: (c.since_maint_s / 3600).toFixed(2), retain: true },
    { topic: 'kompressor/maintenance/filter_hours_since', payload: (c.since_filter_s / 3600).toFixed(2), retain: true },
    { topic: 'kompressor/motor/starts', payload: String(c.starts), retain: true },
    { topic: 'kompressor/cycle/current_minutes', payload: curCycle.toFixed(1), retain: true },
    { topic: 'kompressor/cycle/last_minutes', payload: c.last_cycle_s === null ? 'None' : (c.last_cycle_s / 60).toFixed(1), retain: true },
    ...out_extra
];
for (const s of ['sim', 'real']) {
    const k = counters[s];
    const cyc = (run && run.running && run.src === s && k.cycle_start) ? (now - k.cycle_start) / 1000 : 0;
    lines.push('counter,source=' + s + ' total_s=' + k.total_s.toFixed(1) + ',since_maint_s=' + k.since_maint_s.toFixed(1) +
               ',since_filter_s=' + k.since_filter_s.toFixed(1) + ',starts=' + k.starts + ',cycle_s=' + cyc.toFixed(0) + ' ' + now);
}
node.status({ fill: 'green', shape: 'dot', text: display + ': ' + (c.total_s / 3600).toFixed(2) + ' Bh, ' + c.starts + ' Starts (' + (global.get('counters_origin') || '') + ')' });
return [out, lines.length ? { payload: lines } : null,
        { payload: { display: display, total_h: c.total_s / 3600, since_maint_h: c.since_maint_s / 3600, since_filter_h: c.since_filter_s / 3600 } }];
"""
lo1 = link_out(z, "→ MQTT", 760, 300, [L_MQTT_OUT])
lo2 = link_out(z, "→ Datenbank", 760, 340, [L_DB])
lo3 = link_out(z, "→ Wartungsstatus", 760, 380, [L_MAINT_STATUS])
fc = func(z, "Betriebsstunden-Zähler", COUNTER_JS, 540, 340, [[lo1], [lo2], [lo3]])
inject(z, "alle 10 s", 170, 300, [[fc]], repeat=10, delay="10")
nodes.append({"id": L_COUNTER, "type": "link in", "z": z, "name": "Zähler-Ereignisse", "links": [], "x": 175, "y": 360, "wires": [[fc]]})
fl = func(z, "Zähler aus MQTT laden", LOAD_JS, 420, 120, [], outputs=0)
mqtt_in(z, "gespeicherte Zähler", f"{T}/counters", 170, 120, [[fl]], datatype="json")
fpp = func(z, "Fallback auswerten", FALLBACK_P_JS, 800, 180, [], outputs=0)
hq = http(z, "InfluxDB abfragen", 610, 180, [[fpp]])
fq = func(z, "Fallback: InfluxDB", FALLBACK_Q_JS, 410, 180, [[hq]])
inject(z, "nach 8 s", 170, 180, [[fq]], delay="8")
flr = func(z, "Notfall-Initialisierung", LAST_RESORT_JS, 420, 230, [], outputs=0)
inject(z, "nach 25 s", 170, 230, [[flr]], delay="25")

# ================================================================ 06 Wartung
z = tab("t06", "06 Wartungsmanagement", "Wartungs-/Filterintervalle (konfigurierbar, noch nicht festgelegt) und Status.")
comment(z, "Wartungsmanagement", f"""\
Intervalle werden in Home Assistant gesetzt (MQTT-Number, Wert 0 = **noch nicht festgelegt**).
Die echten Intervalle dürfen erst nach Prüfung der Herstellerunterlagen eingetragen werden.

- `{T}/maintenance/config/<interval_h|filter_interval_h>` (retained Zustand)
- `…/config/<key>/set` (Befehl aus HA)
- `{T}/maintenance/<service_done|filter_done>/set` (Taster in HA → Zähler zurücksetzen + Ereignis)
- Status: `ok`, `bald_faellig` (≥ 90 %), `faellig`, `nicht_festgelegt`""")
CFG_RESTORE_JS = r"""
const key = msg.topic.split('/').pop();
if (!['interval_h', 'filter_interval_h', 'pressure_setpoint_bar', 'rate_reference_bar_min'].includes(key)) return null;
const mc = global.get('maint_cfg') || {};
const v = Number(msg.payload);
mc[key] = Number.isFinite(v) && v > 0 ? v : null;
global.set('maint_cfg', mc);
node.status({ fill: 'green', shape: 'dot', text: JSON.stringify(mc) });
return null;
"""
CFG_SET_JS = r"""
const tp = msg.topic.split('/'); const key = tp[tp.lastIndexOf('config') + 1];   // <präfix>/maintenance/config/<key>/set
if (!['interval_h', 'filter_interval_h', 'pressure_setpoint_bar', 'rate_reference_bar_min'].includes(key)) return [null, null];
const v = Number(msg.payload);
const val = Number.isFinite(v) && v > 0 ? v : 0;
const label = { interval_h: 'Wartungsintervall', filter_interval_h: 'Filterwechselintervall', pressure_setpoint_bar: 'Enddruck-Sollwert (Anzeige)', rate_reference_bar_min: 'Referenz Druckanstieg' }[key];
const unit = { interval_h: ' h', filter_interval_h: ' h', pressure_setpoint_bar: ' bar', rate_reference_bar_min: ' bar/min' }[key];
return [{ topic: 'kompressor/maintenance/config/' + key, payload: String(val), retain: true },
        { payload: [{ rp: 'events', line: 'events,type=maintenance_config,key=' + key + ' value=' + val + ',text="' + label + ' auf ' + (val ? val + unit : 'nicht festgelegt') + ' gesetzt"' }] }];
"""
CFG_DEFAULT_JS = r"""
// Falls noch nie ein Intervall gesetzt wurde: 0 (= nicht festgelegt) publizieren, damit HA einen Zustand hat
const mc = global.get('maint_cfg') || {};
const out = [];
for (const k of ['interval_h', 'filter_interval_h', 'pressure_setpoint_bar', 'rate_reference_bar_min']) if (mc[k] === undefined) {
    mc[k] = null; out.push({ topic: 'kompressor/maintenance/config/' + k, payload: '0', retain: true });
}
global.set('maint_cfg', mc);
return [out];
"""
BUTTON_JS = r"""
const tp = msg.topic.split('/'); const what = tp[tp.length - 2];               // <präfix>/maintenance/<what>/set
if (what === 'service_done') return { topic: 'reset_maint' };
if (what === 'filter_done') return { topic: 'reset_filter' };
return null;
"""
STATUS_JS = r"""
const s = msg.payload; const cfg = global.get('cfg'); const mc = global.get('maint_cfg') || {};
function evaluate(hours, interval) {
    if (!interval) return { status: 'nicht_festgelegt', remaining: null };
    const rem = interval - hours;
    if (rem <= 0) return { status: 'faellig', remaining: rem };
    if (hours >= interval * cfg.alerts.maint_soon_ratio) return { status: 'bald_faellig', remaining: rem };
    return { status: 'ok', remaining: rem };
}
const m = evaluate(s.since_maint_h, mc.interval_h), f = evaluate(s.since_filter_h, mc.filter_interval_h);
const r2 = x => x === null ? null : Math.round(x * 100) / 100;
const st = {
    wartung: m.status, filter: f.status,
    wartungsintervall_h: mc.interval_h || null, filterintervall_h: mc.filter_interval_h || null,
    stunden_seit_wartung: r2(s.since_maint_h), stunden_seit_filterwechsel: r2(s.since_filter_h),
    rest_bis_wartung_h: r2(m.remaining), rest_bis_filterwechsel_h: r2(f.remaining),
    quelle: s.display,
    hinweis: 'Intervalle noch nicht nach Herstellerunterlagen festgelegt – vorläufig konfigurierbar.'
};
global.set('maint_status', { service: m.status, filter: f.status, hours_since: st.stunden_seit_wartung, filter_hours_since: st.stunden_seit_filterwechsel,
                              interval_h: st.wartungsintervall_h, filter_interval_h: st.filterintervall_h });
node.status({ fill: m.status === 'faellig' || f.status === 'faellig' ? 'red' : (m.status === 'ok' ? 'green' : 'yellow'), shape: 'dot', text: 'Wartung: ' + m.status + ' | Filter: ' + f.status });
const n = x => x === null ? 'None' : String(x);
const code = { ok: 0, bald_faellig: 1, faellig: 2, nicht_festgelegt: 3 };
let line = 'maintenance,source=' + s.display + ' status_code=' + code[m.status] + ',filter_status_code=' + code[f.status] +
           ',hours_since=' + s.since_maint_h.toFixed(3) + ',filter_hours_since=' + s.since_filter_h.toFixed(3) +
           ',interval_h=' + (mc.interval_h || 0) + ',filter_interval_h=' + (mc.filter_interval_h || 0);
if (m.remaining !== null) line += ',remaining_h=' + m.remaining.toFixed(3);
if (f.remaining !== null) line += ',filter_remaining_h=' + f.remaining.toFixed(3);
return [[
    { topic: 'kompressor/maintenance/status', payload: m.status, retain: true },
    { topic: 'kompressor/maintenance/filter_status', payload: f.status, retain: true },
    { topic: 'kompressor/maintenance/remaining_h', payload: n(st.rest_bis_wartung_h), retain: true },
    { topic: 'kompressor/maintenance/filter_remaining_h', payload: n(st.rest_bis_filterwechsel_h), retain: true },
    { topic: 'kompressor/maintenance/attr', payload: JSON.stringify(st), retain: true }
], { payload: [line + ' ' + Date.now()] }];
"""
lo_m = link_out(z, "→ MQTT", 720, 120, [L_MQTT_OUT])
lo_db = link_out(z, "→ Datenbank", 720, 160, [L_DB])
lo_cnt = link_out(z, "→ Betriebsstunden", 720, 280, [L_COUNTER])
f1 = func(z, "Intervall-Konfiguration laden", CFG_RESTORE_JS, 470, 220, [], outputs=0)
mqtt_in(z, "Intervalle (Zustand)", f"{T}/maintenance/config/+", 180, 220, [[f1]])
f2 = func(z, "Intervall setzen", CFG_SET_JS, 450, 140, [[lo_m], [lo_db]])
mqtt_in(z, "Intervalle (Befehl aus HA)", f"{T}/maintenance/config/+/set", 190, 140, [[f2]])
f3 = func(z, "Standardwerte (0 = nicht festgelegt)", CFG_DEFAULT_JS, 480, 80, [[lo_m]])
inject(z, "nach 6 s", 170, 80, [[f3]], delay="6")
f4 = func(z, "Wartung / Filter erfasst", BUTTON_JS, 460, 280, [[lo_cnt]])
mqtt_in(z, "Taster (aus HA)", f"{T}/maintenance/+/set", 170, 280, [[f4]])
LOG_JS = r"""
// Wartungseintrag aus dem Dashboard: {datum, betriebsstunden, arbeiten, ersatzteile, bemerkungen, reset_wartung, reset_filter}
const p = msg.payload;
if (!p || typeof p !== 'object' || !String(p.arbeiten || '').trim()) { node.warn('Wartungseintrag ohne Arbeiten verworfen'); return [null, null]; }
const clean = v => String(v === undefined || v === null ? '' : v).replace(/["\\]/g, "'").replace(/[\r\n]+/g, ' / ').slice(0, 500);
const counters = global.get('counters') || {}; const src = (global.get('source_last') || 'real');
const bh = Number(p.betriebsstunden);
const bhTxt = Number.isFinite(bh) && bh >= 0 ? bh.toFixed(1) : ((counters[src] ? counters[src].total_s / 3600 : 0).toFixed(1));
const datum = clean(p.datum) || new Date().toISOString().slice(0, 10);
const f = 'value=1,datum="' + datum + '",betriebsstunden=' + bhTxt + ',arbeiten="' + clean(p.arbeiten) + '",ersatzteile="' + clean(p.ersatzteile) +
          '",bemerkungen="' + clean(p.bemerkungen) + '",reset_wartung=' + (p.reset_wartung ? 1 : 0) + ',reset_filter=' + (p.reset_filter ? 1 : 0) +
          ',text="Wartungseintrag ' + datum + ': ' + clean(p.arbeiten).slice(0, 120) + '"';
const resets = [];
if (p.reset_wartung) resets.push({ topic: 'reset_maint' });
if (p.reset_filter) resets.push({ topic: 'reset_filter' });
node.status({ fill: 'green', shape: 'dot', text: 'Eintrag ' + datum });
return [{ payload: [{ rp: 'events', line: 'events,type=maintenance_log,source=' + src + ' ' + f }] }, resets];
"""
lo_db3 = link_out(z, "→ Datenbank  ", 720, 460, [L_DB])
lo_cnt2 = link_out(z, "→ Betriebsstunden ", 720, 500, [L_COUNTER])
f6 = func(z, "Wartungseintrag erfassen", LOG_JS, 460, 480, [[lo_db3], [lo_cnt2]])
mqtt_in(z, "Wartungseintrag (aus Dashboard)", f"{T}/maintenance/log/add", 200, 480, [[f6]], datatype="json")
lo_m2 = link_out(z, "→ MQTT ", 720, 360, [L_MQTT_OUT])
lo_db2 = link_out(z, "→ Datenbank ", 720, 400, [L_DB])
f5 = func(z, "Wartungsstatus berechnen", STATUS_JS, 460, 360, [[lo_m2], [lo_db2]])
nodes.append({"id": L_MAINT_STATUS, "type": "link in", "z": z, "name": "Zählerstand", "links": [], "x": 175, "y": 360, "wires": [[f5]]})

# ================================================================ 07 Fehlererkennung
z = tab("t07", "07 Fehlererkennung", "Sensorverfügbarkeit, Plausibilität, Grenzwerte (TEST), Verläufe.")
comment(z, "Fehlererkennung (alle 5 s)", """\
Regelbasierte Prüfungen – Schwellwerte sind TEST-Werte aus `cfg.alerts`:
- Sensorknoten offline (LWT) / Datenübertragung ausgefallen
- Sensor ohne aktuelle Daten / unplausible Werte
- Temperatur ≥ Warn-/Störschwelle, ungewöhnlicher Temperaturanstieg (°C/min)
- Enddruck ≥ Warn-/Störschwelle, kein Druckanstieg trotz laufendem Motor
- Wartung/Filter fällig, InfluxDB nicht erreichbar, Simulation + reale Daten gleichzeitig
Ergebnis → Alarmierung. Sensorstatus je Sensor → MQTT (Verfügbarkeit in HA).
Es werden KEINE Eingriffe in den Kompressor ausgelöst.""")
INVALID_JS = r"""
const inv = global.get('invalid_recent') || {};
inv[msg.payload.sensor] = { ts: msg.payload.ts, reason: msg.payload.reason };
global.set('invalid_recent', inv);
node.status({ fill: 'red', shape: 'ring', text: msg.payload.sensor + ': ' + msg.payload.reason });
return null;
"""
CHECK_JS = r"""
const cfg = global.get('cfg'); if (!cfg || !global.get('counters_loaded')) return [null, null];
const now = Date.now(); const A = cfg.alerts;
const latest = global.get('latest') || {}; const inv = global.get('invalid_recent') || {};
const rates = global.get('rates') || {}; const run = global.get('run_state');
const nodeStatus = global.get('sensor_node_status');
const lastRx = global.get('last_rx') || 0;
const dataFresh = now - lastRx <= cfg.comm_timeout_s * 1000;
const alerts = [];
const add = (id, cat, severity, text) => alerts.push({ id: id, cat: cat, severity: severity, text: text });
const sstat = {};
for (const [s, d] of Object.entries(cfg.sensors)) {
    const l = latest[s], i = inv[s];
    if (i && now - i.ts <= cfg.invalid_hold_s * 1000) sstat[s] = 'ungueltig';
    else if (l && now - l.rx <= d.stale_s * 1000) sstat[s] = 'ok';
    else sstat[s] = 'keine_daten';
    if (sstat[s] === 'ungueltig') add('invalid_' + s, 'sensor_data', 'warnung', 'Unplausible Messwerte: ' + d.name + ' (' + i.reason + ')');
    if (sstat[s] === 'keine_daten' && dataFresh) add('stale_' + s, 'sensor_data', 'warnung', d.name + ' liefert keine Daten');
}
if (nodeStatus === 'offline') add('sensor_offline', 'comm', 'stoerung', 'Sensorknoten offline (Last Will empfangen)');
else if (nodeStatus === 'online' && !dataFresh)
    add('comm_loss', 'comm', 'stoerung', 'Datenübertragung ausgefallen – keine Messdaten seit ' + (lastRx ? Math.round((now - lastRx) / 1000) + ' s' : 'dem Start'));
const val = s => sstat[s] === 'ok' ? latest[s].v : null;
for (const s of ['temp_stage1', 'temp_stage2', 'temp_stage3']) {
    const v = val(s); if (v === null) continue; const n = cfg.sensors[s].name;
    if (v >= A.temp_crit_c) add('temp_crit_' + s, 'temperature', 'stoerung', n + ' ' + v.toFixed(1) + ' °C ≥ ' + A.temp_crit_c + ' °C (TEST-Schwelle)');
    else if (v >= A.temp_warn_c) add('temp_warn_' + s, 'temperature', 'warnung', n + ' ' + v.toFixed(1) + ' °C ≥ ' + A.temp_warn_c + ' °C (TEST-Schwelle)');
    const r = rates[s];
    if (r !== null && r !== undefined && r >= A.temp_rate_warn_c_min)
        add('temp_rate_' + s, 'temperature', 'warnung', n + ': ungewöhnlicher Anstieg ' + r.toFixed(1) + ' °C/min (TEST-Schwelle ' + A.temp_rate_warn_c_min + ')');
}
const p = val('pressure_final');
if (p !== null) {
    if (p >= A.pressure_crit_bar) add('pressure_crit', 'pressure', 'stoerung', 'Enddruck ' + p.toFixed(1) + ' bar ≥ ' + A.pressure_crit_bar + ' bar (TEST-Schwelle)');
    else if (p >= A.pressure_warn_bar) add('pressure_warn', 'pressure', 'warnung', 'Enddruck ' + p.toFixed(1) + ' bar ≥ ' + A.pressure_warn_bar + ' bar (TEST-Schwelle)');
    const r = rates.pressure_final;
    if (run && run.running && sstat.motor_current === 'ok' && now - run.since >= A.no_rise_after_min * 60000 && r !== null && r !== undefined && r < A.no_rise_rate_bar_min)
        add('pressure_no_rise', 'pressure', 'warnung', 'Kein Druckanstieg trotz laufendem Motor (' + r.toFixed(2) + ' bar/min, TEST-Schwelle ' + A.no_rise_rate_bar_min + ')');
}
const ms = global.get('maint_status');
if (ms && ms.service === 'faellig') add('maintenance_due', 'maintenance', 'warnung', 'Wartung fällig: ' + ms.hours_since + ' h seit Wartung (Intervall ' + ms.interval_h + ' h, vorläufig)');
if (ms && ms.filter === 'faellig') add('filter_due', 'maintenance', 'warnung', 'Filterwechsel fällig: ' + ms.filter_hours_since + ' h seit Wechsel (Intervall ' + ms.filter_interval_h + ' h, vorläufig)');
const ix = global.get('influx') || {};
if (ix.ok === false && ix.since_fail && now - ix.since_fail > 60000)
    add('influx_down', 'database', 'warnung', 'InfluxDB nicht erreichbar – ' + (ix.buffer || 0) + ' Datenpunkte gepuffert');
const sim = global.get('sim') || {};
if (sim.enabled && Object.values(latest).some(l => l.src === 'real' && now - l.rx <= 60000))
    add('source_conflict', 'sensor_data', 'warnung', 'Simulation aktiv, gleichzeitig treffen reale Messwerte ein');
const prev = context.get('sstat') || {};
const mq = [];
for (const s in sstat) if (prev[s] !== sstat[s]) mq.push({ topic: 'kompressor/sensor_status/' + s, payload: sstat[s], retain: true });
context.set('sstat', sstat);
node.status({ fill: alerts.length ? 'red' : 'green', shape: 'dot', text: alerts.length + ' aktive Meldung(en)' });
return [mq, { payload: { alerts: alerts, dataFresh: dataFresh, sstat: sstat } }];
"""
lo_m = link_out(z, "→ MQTT", 640, 200, [L_MQTT_OUT])
lo_a = link_out(z, "→ Alarmierung", 640, 240, [L_ALERTS])
fck = func(z, "Prüfen", CHECK_JS, 420, 220, [[lo_m], [lo_a]])
inject(z, "alle 5 s", 180, 220, [[fck]], repeat=5, delay="12")
fi = func(z, "ungültige Werte merken", INVALID_JS, 420, 120, [], outputs=0)
nodes.append({"id": L_INVALID, "type": "link in", "z": z, "name": "ungültige Werte", "links": [], "x": 185, "y": 120, "wires": [[fi]]})

# ================================================================ 08 Alarmierung
z = tab("t08", "08 Alarmierung", "Aktive Meldungen, Gesamtstatus, Ereignisprotokoll.")
comment(z, "Alarmierung", f"""\
Verwaltet aktive Meldungen (seit wann), schreibt Auftreten/Behebung als Ereignis
nach InfluxDB und publiziert (retained):
- `{T}/status`: `normal` | `warnung` | `stoerung` | `keine_daten`
- `{T}/alerts`: JSON mit allen aktiven Meldungen
- `{T}/alert/<kategorie>`: `ON`/`OFF` (comm, sensor_data, temperature, pressure, maintenance, database)
Benachrichtigungen erzeugt Home Assistant (Automation „Kompressor: Meldungen anzeigen“).""")
ALERT_JS = r"""
const now = Date.now(); const alerts = msg.payload.alerts; const dataFresh = msg.payload.dataFresh;
const prev = context.get('active') || {};
const active = {}; const lines = [];
const q = s => s.replace(/"/g, "'");
const srcTag = global.get('source_last') || 'real';
for (const a of alerts) {
    active[a.id] = Object.assign({}, a, { since: prev[a.id] ? prev[a.id].since : now });
    if (!prev[a.id]) lines.push({ rp: 'events', line: 'events,type=alert,id=' + a.id + ',severity=' + a.severity + ',source=' + srcTag + ' value=1,text="' + q(a.text) + '"' });
}
for (const id in prev) if (!active[id])
    lines.push({ rp: 'events', line: 'events,type=alert_cleared,id=' + id + ',severity=' + prev[id].severity + ',source=' + srcTag + ' value=0,text="Behoben: ' + q(prev[id].text) + '"' });
context.set('active', active);
global.set('alerts_active', active);
const list = Object.values(active).sort((a, b) => ((a.severity === 'stoerung' ? 0 : 1) - (b.severity === 'stoerung' ? 0 : 1)) || (a.since - b.since));
const faults = list.filter(a => a.severity === 'stoerung').length;
const warns = list.filter(a => a.severity === 'warnung').length;
let status = 'normal';
if (faults) status = 'stoerung'; else if (!dataFresh) status = 'keine_daten'; else if (warns) status = 'warnung';
const src = dataFresh ? (global.get('source_last') === 'sim' ? 'simulation' : 'real') : 'keine';
const mq = [];
const sig = JSON.stringify([status, src, list.map(a => a.id + a.text)]);
if (sig !== context.get('sig') || now - (context.get('last_pub') || 0) > 60000) {
    context.set('sig', sig); context.set('last_pub', now);
    mq.push({ topic: 'kompressor/status', payload: status, retain: true });
    mq.push({ topic: 'kompressor/source', payload: src, retain: true });
    mq.push({ topic: 'kompressor/status/attr', retain: true, payload: JSON.stringify({
        status: status, quelle: src, stoerungen: faults, warnungen: warns, schwellwerte: 'TEST-Werte, keine Herstellerangaben',
        aktualisiert: new Date(now).toISOString() }) });
    mq.push({ topic: 'kompressor/alerts', retain: true, payload: JSON.stringify({
        count: list.length, stoerungen: faults, warnungen: warns,
        text: list.length ? list.map(a => (a.severity === 'stoerung' ? 'STÖRUNG: ' : 'Warnung: ') + a.text).join('\n') : 'Keine aktiven Meldungen',
        active: list.map(a => ({ id: a.id, kategorie: a.cat, schwere: a.severity, text: a.text, seit: new Date(a.since).toISOString() })) }) });
    for (const c of ['comm', 'sensor_data', 'temperature', 'pressure', 'maintenance', 'database'])
        mq.push({ topic: 'kompressor/alert/' + c, payload: list.some(a => a.cat === c) ? 'ON' : 'OFF', retain: true });
}
const code = { normal: 0, warnung: 1, stoerung: 2, keine_daten: 3 }[status];
lines.push('state,source=' + (global.get('source_last') || 'real') + ' status_code=' + code + ',alerts=' + list.length + ',faults=' + faults + ',warnings=' + warns + ' ' + now);
node.status({ fill: { normal: 'green', warnung: 'yellow', stoerung: 'red', keine_daten: 'grey' }[status], shape: 'dot', text: status + ' – ' + faults + ' Störung(en), ' + warns + ' Warnung(en)' });
return [mq, { payload: lines }];
"""
lo_m = link_out(z, "→ MQTT", 640, 120, [L_MQTT_OUT])
lo_d = link_out(z, "→ Datenbank", 640, 160, [L_DB])
fa = func(z, "Meldungen verwalten", ALERT_JS, 420, 140, [[lo_m], [lo_d]])
nodes.append({"id": L_ALERTS, "type": "link in", "z": z, "name": "Alarmprüfung", "links": [], "x": 175, "y": 140, "wires": [[fa]]})

# ================================================================ 09 Datenbank
z = tab("t09", "09 Datenbankanbindung", "Gepuffertes Schreiben nach InfluxDB 1.x (Line Protocol).")
comment(z, "InfluxDB-Anbindung", f"""\
Alle Tabs liefern Line-Protocol-Zeilen (String → RP `raw`, oder `{{rp, line}}`).
Zeilen ohne Zeitstempel erhalten beim Puffern die aktuelle Zeit (ms) – so bleiben
Zeitstempel auch bei verzögertem Schreiben korrekt.

Puffer im Speicher (max. 50 000 Zeilen, älteste werden verworfen). Alle 2 s wird
ein Block (≤ 5000 Zeilen, gleiche RP) an `{INFLUX}/write` gesendet. Bei Fehler
bleibt der Block im Puffer und wird erneut gesendet; HTTP 400 (ungültige Daten)
wird verworfen, um Endlosschleifen zu vermeiden.
Zugang: Benutzer `kompressor-nodered` (Credentials im Knoten, nicht im Export).""")
BUF_JS = r"""
const items = Array.isArray(msg.payload) ? msg.payload : [msg.payload];
const buf = flow.get('buf') || [];
const now = Date.now();
const events = [];
for (const it of items) {
    if (!it) continue;
    const e = typeof it === 'string' ? { rp: 'raw', line: it } : { rp: it.rp || 'raw', line: it.line };
    if (!/ \d{13}$/.test(e.line)) e.line += ' ' + now;
    buf.push(e);
    if (e.rp === 'events') events.push({ payload: e.line });
}
const MAX = 50000;
const ix = global.get('influx') || {};
if (buf.length > MAX) {
    const drop = buf.length - MAX; buf.splice(0, drop);
    ix.dropped = (ix.dropped || 0) + drop;
    flow.set('inflight', Math.max(0, (flow.get('inflight') || 0) - drop));
}
flow.set('buf', buf);
ix.buffer = buf.length; global.set('influx', ix);
return [events];
"""
SEND_JS = r"""
const buf = flow.get('buf') || []; const now = Date.now();
if ((flow.get('inflight') || 0) > 0) {
    if (now - (flow.get('inflight_since') || 0) < 60000) return null;
    flow.set('inflight', 0);    // Antwort hängt > 60 s: Block erneut senden
}
if (!buf.length) return null;
const rp = buf[0].rp; let n = 0;
while (n < buf.length && n < 5000 && buf[n].rp === rp) n++;
flow.set('inflight', n); flow.set('inflight_since', now);
msg.url = '%INFLUX%/write?db=kompressor&rp=' + rp + '&precision=ms';
msg.method = 'POST';
msg.headers = { 'Content-Type': 'text/plain; charset=utf-8' };
msg.payload = buf.slice(0, n).map(x => x.line).join('\n');
return msg;
""".replace("%INFLUX%", INFLUX)
RESP_JS = r"""
const ix = global.get('influx') || {}; const now = Date.now();
const n = flow.get('inflight') || 0; const buf = flow.get('buf') || [];
const code = Number(msg.statusCode);
if (code === 204) {
    buf.splice(0, n); ix.ok = true; ix.last_ok = now; ix.since_fail = null; ix.last_error = null; ix.written = (ix.written || 0) + n;
} else if (code === 400) {
    buf.splice(0, n); ix.bad = (ix.bad || 0) + n;
    ix.last_error = 'Ungültige Daten verworfen: ' + String(msg.payload).slice(0, 200); node.warn(ix.last_error);
} else {
    if (ix.ok !== false) ix.since_fail = now;
    ix.ok = false; ix.last_error = 'HTTP ' + (msg.statusCode || '-') + ': ' + String(msg.payload || '').slice(0, 200);
}
flow.set('buf', buf); flow.set('inflight', 0);
ix.buffer = buf.length; global.set('influx', ix);
node.status({ fill: ix.ok ? 'green' : 'red', shape: 'dot', text: (ix.ok ? 'OK' : 'Fehler') + ' – geschrieben ' + (ix.written || 0) + ', Puffer ' + buf.length });
return null;
"""
PING_JS = r"""
global.set('influx_ping', Number(msg.statusCode) === 204);
node.status({ fill: Number(msg.statusCode) === 204 ? 'green' : 'red', shape: 'dot', text: 'Ping: ' + msg.statusCode });
return null;
"""
PING_REQ_JS = "msg.url = '%INFLUX%/ping'; msg.method = 'GET'; return msg;".replace("%INFLUX%", INFLUX)
L_EVENTS = nid("t12", "Ereignis-Zeilen")
lo_ev = link_out(z, "→ Ereignisse (HA)", 620, 140, [L_EVENTS])
fb = func(z, "Puffern", BUF_JS, 400, 140, [[lo_ev]])
nodes.append({"id": L_DB, "type": "link in", "z": z, "name": "Datenpunkte", "links": [], "x": 175, "y": 140, "wires": [[fb]]})
fresp = func(z, "Antwort auswerten", RESP_JS, 780, 220, [], outputs=0)
hw = http(z, "InfluxDB /write", 590, 220, [[fresp]])
fsend = func(z, "Block senden", SEND_JS, 400, 220, [[hw]])
inject(z, "alle 2 s", 180, 220, [[fsend]], repeat=2, delay="3")
fpg = func(z, "Erreichbarkeit merken", PING_JS, 780, 300, [], outputs=0)
hp = http(z, "InfluxDB /ping", 590, 300, [[fpg]], auth=False)
fpr = func(z, "Ping vorbereiten", PING_REQ_JS, 400, 300, [[hp]])
inject(z, "alle 30 s", 180, 300, [[fpr]], repeat=30, delay="5")

# ================================================================ 10 Systemdiagnose
z = tab("t10", "10 Systemdiagnose", "Zustand der Verarbeitungskette.")
comment(z, "Systemdiagnose (alle 15 s)", f"""\
Publiziert unter `{T}/system/*` (retained) und schreibt `system` nach InfluxDB:
Heartbeat, InfluxDB-Status, Puffergröße, Nachrichtenrate, ungültige/doppelte
Nachrichten, korrigierte Zeitstempel, Alter der letzten Messung, Herkunft der Zähler.
Verfügbarkeit von Node-RED selbst: Last Will `{T}/availability`.
CPU/RAM/Speicher des Hosts liefert die HA-Integration „System Monitor“.""")
SYS_JS = r"""
const now = Date.now();
const stats = global.get('stats') || { rx: 0, valid: 0, invalid: 0, dup: 0, ts_fixed: 0 };
const prev = context.get('prev') || { t: now - 15000, rx: stats.rx };
const rate = (stats.rx - prev.rx) / Math.max(1 / 60, (now - prev.t) / 60000);
context.set('prev', { t: now, rx: stats.rx });
const start = context.get('start') || now; context.set('start', start);
const ix = global.get('influx') || {};
const lastRx = global.get('last_rx');
const age = lastRx ? Math.round((now - lastRx) / 1000) : null;
let influx = 'unbekannt';
if (global.get('influx_ping') === false) influx = 'nicht_erreichbar';
else if (ix.ok === false) influx = 'schreibfehler';
else if (ix.ok) influx = 'ok';
const P = 'kompressor/system/';
const mq = [
    { topic: P + 'heartbeat', payload: new Date(now).toISOString(), retain: true },
    { topic: P + 'influxdb', payload: influx, retain: true },
    { topic: P + 'db_buffer', payload: String(ix.buffer || 0), retain: true },
    { topic: P + 'rx_per_min', payload: rate.toFixed(1), retain: true },
    { topic: P + 'invalid_total', payload: String(stats.invalid), retain: true },
    { topic: P + 'duplicates_total', payload: String(stats.dup), retain: true },
    { topic: P + 'ts_corrected_total', payload: String(stats.ts_fixed), retain: true },
    { topic: P + 'data_age_s', payload: age === null ? 'None' : String(age), retain: true },
    { topic: P + 'uptime_h', payload: ((now - start) / 3600000).toFixed(2), retain: true },
    { topic: P + 'attr', retain: true, payload: JSON.stringify({ zaehler_herkunft: global.get('counters_origin') || 'noch nicht geladen',
        influx_letzter_fehler: ix.last_error || null, influx_geschrieben: ix.written || 0, influx_verworfen: (ix.dropped || 0) + (ix.bad || 0),
        flows_version: (global.get('cfg') || {}).version }) }
];
let line = 'system,host=kompressorraum influx_ok=' + (influx === 'ok' ? 1 : 0) + ',db_buffer=' + (ix.buffer || 0) + ',rx_per_min=' + rate.toFixed(2) +
           ',invalid_total=' + stats.invalid + ',duplicates_total=' + stats.dup + ',ts_corrected_total=' + stats.ts_fixed;
if (age !== null) line += ',data_age_s=' + age;
line += ' ' + now;
node.status({ fill: influx === 'ok' ? 'green' : 'yellow', shape: 'dot', text: 'InfluxDB ' + influx + ', ' + rate.toFixed(0) + ' Msg/min, Datenalter ' + (age === null ? '–' : age + ' s') });
return [mq, { payload: [line] }];
"""
lo_m = link_out(z, "→ MQTT", 640, 120, [L_MQTT_OUT])
lo_d = link_out(z, "→ Datenbank", 640, 160, [L_DB])
fsys = func(z, "Diagnose erfassen", SYS_JS, 420, 140, [[lo_m], [lo_d]])
inject(z, "alle 15 s", 180, 140, [[fsys]], repeat=15, delay="15")

# ================================================================ 12 Ereignisse
z = tab("t12", "12 Ereignisse (HA)", "Ereignisse als HA-Event-Entität für Ereignisansicht und Zyklusdiagnose.")
comment(z, "Ereignisse → Home Assistant", f"""\
Jede Ereigniszeile (RP `events`) wird zusätzlich als JSON auf `{T}/event` publiziert
und erscheint in HA als `event.kompressor_ereignis` (Recorder → Ereignisansicht,
Zyklusdiagnose). Ereignistypen: motorstart, motorstopp (mit Zykluskennwerten),
warnung, stoerung, behoben, kommunikationsausfall, sensorfehler, wartung,
filterwechsel, wartungseintrag, konfiguration, simulation, sensorknoten.""")
EVENT_JS = r"""
function split(str, sep) {               // trennt an sep außerhalb von "…"
    const out = []; let cur = '', q = false;
    for (const ch of str) { if (ch === '"') q = !q; if (ch === sep && !q) { out.push(cur); cur = ''; } else cur += ch; }
    out.push(cur); return out;
}
const parts = split(msg.payload, ' ');
const tags = {}; split(parts[0], ',').slice(1).forEach(kv => { const i = kv.indexOf('='); tags[kv.slice(0, i)] = kv.slice(i + 1); });
const fields = {};
split(parts[1], ',').forEach(kv => { const i = kv.indexOf('='); let v = kv.slice(i + 1); fields[kv.slice(0, i)] = v.startsWith('"') ? v.slice(1, -1) : Number(v); });
const ts = Number(parts[2]);
const id = tags.id || '';
const MAP = { motor_start: 'motorstart', cycle: 'motorstopp', alert_cleared: 'behoben', maintenance: 'wartung', filter_change: 'filterwechsel',
              maintenance_log: 'wartungseintrag', maintenance_config: 'konfiguration', simulation: 'simulation', sensor_node: 'sensorknoten', release: 'freigabe' };
let et = MAP[tags.type];
if (tags.type === 'alert') et = (id === 'comm_loss' || id === 'sensor_offline') ? 'kommunikationsausfall'
    : (id.startsWith('invalid_') || id.startsWith('stale_')) ? 'sensorfehler' : (tags.severity === 'stoerung' ? 'stoerung' : 'warnung');
if (!et) return null;                     // motor_stop wird über "cycle" (mit Dauer) gemeldet
const p = { event_type: et, text: fields.text || '', zeit: new Date(ts).toISOString(), quelle: tags.source || null };
if (tags.severity) p.schwere = tags.severity;
if (id) p.meldung_id = id;
if (tags.key) p.schluessel = tags.key;
for (const [k, v] of Object.entries(fields)) if (k !== 'text' && k !== 'value') p[k] = v;
if (et === 'motorstopp') p.dauer_s = fields.value;
if (et === 'wartung' || et === 'filterwechsel') p.stunden_seit_vorher = fields.value;
if (et === 'konfiguration') p.wert = fields.value;
node.status({ fill: 'blue', shape: 'dot', text: et + ' ' + new Date(ts).toLocaleTimeString() });
return { topic: 'kompressor/event', payload: JSON.stringify(p), retain: false };
"""
lo_m = link_out(z, "→ MQTT", 640, 140, [L_MQTT_OUT])
fe = func(z, "Ereignis für HA aufbereiten", EVENT_JS, 400, 140, [[lo_m]])
nodes.append({"id": L_EVENTS, "type": "link in", "z": z, "name": "Ereignis-Zeilen", "links": [], "x": 175, "y": 140, "wires": [[fe]]})
RELEASE_JS = r"""
// Betriebsfreigabe aus HA (Skripte/Automation, retained): {zustand: on|off, ausgang, aktion, zeit}
// Zustandsänderungen werden 3 s gesammelt, damit die Meldung des Skripts („erteilt/entzogen“) Vorrang hat.
const p = msg.payload; if (!p || typeof p !== 'object') return null;
const r = { on: p.zustand === 'on', state: p.zustand, ausgang: p.ausgang, aktion: p.aktion, ts: Date.now() };
const prev = global.get('release') || {};
global.set('release', r);
node.status({ fill: r.on ? 'green' : 'grey', shape: 'dot', text: (r.on ? 'freigegeben' : 'gesperrt') + ' (' + p.ausgang + ')' });
const TEXT = { freigabe: 'Betriebsfreigabe erteilt', sperre: 'Betriebsfreigabe entzogen',
               freigabe_fehlgeschlagen: 'Freigabe fehlgeschlagen (Ausgang reagiert nicht)', sperre_fehlgeschlagen: 'Sperren fehlgeschlagen (Ausgang reagiert nicht)' };
const pend = context.get('pend');
if (pend && pend.state === r.state) { if (TEXT[p.aktion]) pend.text = TEXT[p.aktion]; return null; }
if (prev.state === r.state && !TEXT[p.aktion]) return null;
if (prev.state === r.state && !String(p.aktion).includes('fehlgeschlagen')) return null;
const entry = { state: r.state, ausgang: p.ausgang, text: TEXT[p.aktion] || ('Freigabe-Ausgang ' + (r.on ? 'ein' : 'aus') + ' (vor Ort/App geschaltet)') };
context.set('pend', entry);
setTimeout(() => {
    const e = context.get('pend'); context.set('pend', null); if (!e) return;
    node.send({ payload: [{ rp: 'events', line: 'events,type=release,source=' + (global.get('source_last') || 'real') + ' value=' + (e.state === 'on' ? 1 : 0) +
                          ',ausgang="' + String(e.ausgang).replace(/"/g, "'") + '",text="' + e.text + '"' }] });
}, 3000);
return null;
"""
lo_rd = link_out(z, "→ Datenbank", 640, 240, [L_DB])
frl = func(z, "Freigabe-Zustand", RELEASE_JS, 400, 240, [[lo_rd]])
mqtt_in(z, "Betriebsfreigabe (aus HA)", f"{T}/control/release", 170, 240, [[frl]], datatype="json")

# ================================================================ 11 HA-Discovery
z = tab("t11", "11 Home-Assistant-Discovery", "MQTT-Discovery-Konfiguration der HA-Entitäten.")
comment(z, "MQTT Discovery", """\
Legt beim Start und nach jedem HA-Neustart (`homeassistant/status` = online) alle
Entitäten des Geräts „Kompressor“ per MQTT Discovery an (retained).
Die Definitionen werden von `tools/build_nodered.py` erzeugt (siehe docs/mqtt.md).""")


def build_discovery():
    dev = {"identifiers": ["kompressor"], "name": "Kompressor", "manufacturer": "Compresio",
           "model": "Atemluftkompressor, dreistufig", "sw_version": f"Compresio-Flows {VERSION}", "suggested_area": "Kompressorraum"}
    origin = {"name": "Compresio Node-RED", "sw_version": VERSION}
    avail = [{"topic": f"{T}/availability"}]
    out = []

    def ent(component, obj, name, **kw):
        cfg = {"name": name, "unique_id": f"kompressor_{obj}", 
               "default_entity_id": f"{component}.kompressor_{obj}",
               "device": dev, "origin": origin, "availability": list(avail), "availability_mode": "all"}
        if "sensor_avail" in kw:
            s = kw.pop("sensor_avail")
            cfg["availability"] = avail + [{"topic": f"{T}/sensor_status/{s}", "value_template": "{{ 'online' if value == 'ok' else 'offline' }}"}]
        cfg.update(kw)
        out.append([f"homeassistant/{component}/kompressor/{obj}/config", cfg])

    # Übersicht
    ent("sensor", "status", "Status", state_topic=f"{T}/status", json_attributes_topic=f"{T}/status/attr",
        device_class="enum", options=["normal", "warnung", "stoerung", "keine_daten"], icon="mdi:list-status")
    ent("sensor", "quelle", "Datenquelle", state_topic=f"{T}/source", device_class="enum",
        options=["real", "simulation", "keine"], icon="mdi:database-eye")
    ent("sensor", "letzte_aktualisierung", "Letzte Aktualisierung", state_topic=f"{T}/last_update", device_class="timestamp")
    # Motor
    ent("binary_sensor", "motor", "Motor", state_topic=f"{T}/motor/running", payload_on="ON", payload_off="OFF",
        device_class="running", sensor_avail="motor_current")
    ent("sensor", "motorstrom", "Motorstrom", state_topic=f"{T}/motor/current", unit_of_measurement="A",
        device_class="current", state_class="measurement", suggested_display_precision=1, sensor_avail="motor_current")
    ent("sensor", "spannung", "Versorgungsspannung", state_topic=f"{T}/supply/voltage", unit_of_measurement="V",
        device_class="voltage", state_class="measurement", suggested_display_precision=0, sensor_avail="supply_voltage")
    # Druck
    ent("sensor", "enddruck", "Enddruck", state_topic=f"{T}/pressure/final", unit_of_measurement="bar",
        device_class="pressure", state_class="measurement", suggested_display_precision=1, sensor_avail="pressure_final")
    ent("sensor", "druckanstieg", "Druckanstieg", state_topic=f"{T}/pressure/rate", unit_of_measurement="bar/min",
        state_class="measurement", icon="mdi:trending-up", suggested_display_precision=1, sensor_avail="pressure_final")
    # Temperaturen
    for i in (1, 2, 3):
        ent("sensor", f"temperatur_stufe{i}", f"Zylindertemperatur Stufe {i}", state_topic=f"{T}/temperature/stage{i}",
            unit_of_measurement="°C", device_class="temperature", state_class="measurement",
            suggested_display_precision=1, sensor_avail=f"temp_stage{i}")
        out[-1][1]["default_entity_id"] = f"sensor.kompressor_temperatur_stufe_{i}"
    for a, b in ((1, 2), (2, 3)):
        ent("sensor", f"temperatur_kuehlspirale{a}{b}", f"Kühlspirale Stufe {a}→{b}", state_topic=f"{T}/temperature/coil{a}{b}",
            unit_of_measurement="°C", device_class="temperature", state_class="measurement",
            suggested_display_precision=1, sensor_avail=f"temp_coil{a}{b}", icon="mdi:coolant-temperature")
        out[-1][1]["default_entity_id"] = f"sensor.kompressor_temperatur_kuehlspirale_{a}_{b}"
    ent("sensor", "raumtemperatur", "Raumtemperatur Kompressorraum", state_topic=f"{T}/temperature/room",
        unit_of_measurement="°C", device_class="temperature", state_class="measurement",
        suggested_display_precision=1, sensor_avail="temp_room", icon="mdi:home-thermometer-outline")
    out[-1][1]["default_entity_id"] = "sensor.kompressor_raumtemperatur"
    # Betriebsstunden
    ent("sensor", "betriebsstunden", "Betriebsstunden", state_topic=f"{T}/operating_hours", unit_of_measurement="h",
        device_class="duration", state_class="total_increasing", suggested_display_precision=2, icon="mdi:timer-cog-outline")
    ent("sensor", "starts", "Motorstarts", state_topic=f"{T}/motor/starts", state_class="total_increasing", icon="mdi:counter")
    ent("sensor", "zyklus_aktuell", "Aktuelle Laufzeit", state_topic=f"{T}/cycle/current_minutes", unit_of_measurement="min",
        device_class="duration", state_class="measurement", suggested_display_precision=1)
    ent("sensor", "zyklus_letzter", "Letzter Betriebszyklus", state_topic=f"{T}/cycle/last_minutes", unit_of_measurement="min",
        device_class="duration", suggested_display_precision=1)
    # Wartung
    ent("sensor", "wartung_status", "Wartungsstatus", state_topic=f"{T}/maintenance/status", json_attributes_topic=f"{T}/maintenance/attr",
        device_class="enum", options=["ok", "bald_faellig", "faellig", "nicht_festgelegt"], icon="mdi:wrench-clock")
    ent("sensor", "filter_status", "Filterstatus", state_topic=f"{T}/maintenance/filter_status",
        device_class="enum", options=["ok", "bald_faellig", "faellig", "nicht_festgelegt"], icon="mdi:air-filter")
    ent("sensor", "stunden_seit_wartung", "Betriebsstunden seit Wartung", state_topic=f"{T}/maintenance/hours_since",
        unit_of_measurement="h", device_class="duration", state_class="measurement", suggested_display_precision=2)
    ent("sensor", "stunden_seit_filterwechsel", "Betriebsstunden seit Filterwechsel", state_topic=f"{T}/maintenance/filter_hours_since",
        unit_of_measurement="h", device_class="duration", state_class="measurement", suggested_display_precision=2)
    ent("sensor", "rest_bis_wartung", "Restlaufzeit bis Wartung", state_topic=f"{T}/maintenance/remaining_h",
        unit_of_measurement="h", device_class="duration", suggested_display_precision=1)
    ent("sensor", "rest_bis_filterwechsel", "Restlaufzeit bis Filterwechsel", state_topic=f"{T}/maintenance/filter_remaining_h",
        unit_of_measurement="h", device_class="duration", suggested_display_precision=1)
    ent("number", "wartungsintervall", "Wartungsintervall (0 = nicht festgelegt)", state_topic=f"{T}/maintenance/config/interval_h",
        command_topic=f"{T}/maintenance/config/interval_h/set", min=0, max=10000, step=0.01, mode="box",
        unit_of_measurement="h", entity_category="config", icon="mdi:wrench-cog", retain=False)
    ent("number", "filterintervall", "Filterwechselintervall (0 = nicht festgelegt)", state_topic=f"{T}/maintenance/config/filter_interval_h",
        command_topic=f"{T}/maintenance/config/filter_interval_h/set", min=0, max=10000, step=0.01, mode="box",
        unit_of_measurement="h", entity_category="config", icon="mdi:air-filter", retain=False)
    ent("button", "wartung_erfasst", "Wartung durchgeführt", command_topic=f"{T}/maintenance/service_done/set",
        payload_press="PRESS", icon="mdi:wrench-check", entity_category="config")
    ent("button", "filter_erfasst", "Filterwechsel durchgeführt", command_topic=f"{T}/maintenance/filter_done/set",
        payload_press="PRESS", icon="mdi:air-filter", entity_category="config")
    # Konfigurationswerte für die Anzeige (0 = nicht festgelegt)
    ent("number", "enddruck_soll", "Enddruck-Sollwert (Anzeige, 0 = nicht festgelegt)", state_topic=f"{T}/maintenance/config/pressure_setpoint_bar",
        command_topic=f"{T}/maintenance/config/pressure_setpoint_bar/set", min=0, max=450, step=1, mode="box",
        unit_of_measurement="bar", entity_category="config", icon="mdi:target", retain=False)
    ent("number", "druckanstieg_referenz", "Referenz Druckanstieg (0 = nicht festgelegt)", state_topic=f"{T}/maintenance/config/rate_reference_bar_min",
        command_topic=f"{T}/maintenance/config/rate_reference_bar_min/set", min=0, max=100, step=0.1, mode="box",
        unit_of_measurement="bar/min", entity_category="config", icon="mdi:chart-bell-curve", retain=False)
    ent("sensor", "zyklus_druckanstieg", "Druckanstieg letzter vergleichbarer Zyklus", state_topic=f"{T}/cycle/last_rate",
        unit_of_measurement="bar/min", state_class="measurement", icon="mdi:chart-line-variant", suggested_display_precision=1)
    ent("event", "ereignis", "Ereignis", state_topic=f"{T}/event", icon="mdi:timeline-text-outline",
        event_types=["motorstart", "motorstopp", "warnung", "stoerung", "behoben", "kommunikationsausfall", "sensorfehler",
                     "wartung", "filterwechsel", "wartungseintrag", "konfiguration", "simulation", "sensorknoten", "freigabe"])
    # Meldungen
    ent("sensor", "meldungen", "Aktive Meldungen", state_topic=f"{T}/alerts", value_template="{{ value_json.count }}",
        json_attributes_topic=f"{T}/alerts", state_class="measurement", icon="mdi:alert-circle-outline")
    for cat, name in [("comm", "Kommunikation"), ("sensor_data", "Sensordaten"), ("temperature", "Temperatur"),
                      ("pressure", "Druck"), ("maintenance", "Wartung"), ("database", "Datenbank")]:
        ent("binary_sensor", f"meldung_{cat}", f"Meldung {name}", state_topic=f"{T}/alert/{cat}",
            payload_on="ON", payload_off="OFF", device_class="problem")
    # Sensorstatus
    for s, name in [("pressure_final", "Enddruck"), ("temp_stage1", "Zylinder Stufe 1"), ("temp_coil12", "Kühlspirale 1→2"),
                    ("temp_stage2", "Zylinder Stufe 2"), ("temp_coil23", "Kühlspirale 2→3"), ("temp_stage3", "Zylinder Stufe 3"),
                    ("temp_room", "Raumtemperatur"), ("motor_current", "Motorstrom"), ("supply_voltage", "Versorgungsspannung")]:
        ent("sensor", f"sensorstatus_{s}", f"Sensorstatus {name}", state_topic=f"{T}/sensor_status/{s}", device_class="enum",
            options=["ok", "keine_daten", "ungueltig"], entity_category="diagnostic", icon="mdi:access-point-check")
    # System
    S = f"{T}/system"
    ent("sensor", "heartbeat", "Node-RED Heartbeat", state_topic=f"{S}/heartbeat", device_class="timestamp",
        entity_category="diagnostic", json_attributes_topic=f"{S}/attr")
    ent("sensor", "influxdb", "InfluxDB", state_topic=f"{S}/influxdb", device_class="enum",
        options=["ok", "schreibfehler", "nicht_erreichbar", "unbekannt"], entity_category="diagnostic", icon="mdi:database")
    ent("sensor", "db_puffer", "DB-Puffer", state_topic=f"{S}/db_buffer", unit_of_measurement="Punkte",
        state_class="measurement", entity_category="diagnostic", icon="mdi:tray-full")
    ent("sensor", "nachrichtenrate", "Nachrichtenrate", state_topic=f"{S}/rx_per_min", unit_of_measurement="1/min",
        state_class="measurement", entity_category="diagnostic", icon="mdi:swap-vertical")
    ent("sensor", "ungueltige_nachrichten", "Ungültige Nachrichten", state_topic=f"{S}/invalid_total",
        state_class="total_increasing", entity_category="diagnostic", icon="mdi:alert-octagon-outline")
    ent("sensor", "duplikate", "Verworfene Duplikate", state_topic=f"{S}/duplicates_total",
        state_class="total_increasing", entity_category="diagnostic", icon="mdi:content-duplicate")
    ent("sensor", "zeitstempel_korrigiert", "Korrigierte Zeitstempel", state_topic=f"{S}/ts_corrected_total",
        state_class="total_increasing", entity_category="diagnostic", icon="mdi:clock-alert-outline")
    ent("sensor", "datenalter", "Alter der letzten Messung", state_topic=f"{S}/data_age_s", unit_of_measurement="s",
        device_class="duration", state_class="measurement", entity_category="diagnostic")
    ent("sensor", "nodered_laufzeit", "Node-RED Laufzeit seit Deploy", state_topic=f"{S}/uptime_h", unit_of_measurement="h",
        device_class="duration", entity_category="diagnostic", suggested_display_precision=1)
    # Simulation
    ent("switch", "simulation", "Simulation", state_topic=f"{T}/sim/enabled", command_topic=f"{T}/sim/enabled/set",
        payload_on="ON", payload_off="OFF", icon="mdi:test-tube", entity_category="config", retain=False)
    ent("select", "simulation_szenario", "Simulationsszenario", state_topic=f"{T}/sim/scenario",
        command_topic=f"{T}/sim/scenario/set", options=SIM_SCENARIOS, icon="mdi:script-text-play-outline",
        entity_category="config", retain=False)
    ent("select", "simulation_raumklima", "Simulation Raumklima", state_topic=f"{T}/sim/room",
        command_topic=f"{T}/sim/room/set", options=SIM_ROOM, icon="mdi:home-thermometer-outline",
        entity_category="config", retain=False)
    return out


SIM_SCENARIOS = ["normal", "sensorfehler", "kommunikationsausfall", "sensorknoten_offline",
                 "uebertemperatur", "druckanomalie", "zeitstempelfehler"]
SIM_ROOM = ["normal", "sommer", "winter", "erwaermung"]
DISCOVERY = build_discovery()
DISC_JS = ("const D = " + json.dumps(DISCOVERY, ensure_ascii=False) + ";\n" + r"""
if (msg.topic === 'homeassistant/status' && String(msg.payload) !== 'online') return null;
node.status({ fill: 'green', shape: 'dot', text: D.length + ' Entitäten publiziert ' + new Date().toLocaleTimeString() });
return [D.map(d => ({ topic: d[0], payload: JSON.stringify(d[1]), retain: true }))];
""")
lo_m = link_out(z, "→ MQTT", 640, 140, [L_MQTT_OUT])
fd = func(z, "Discovery publizieren", DISC_JS, 420, 140, [[lo_m]])
inject(z, "beim Start", 180, 120, [[fd]], delay="3", topic="start")
mqtt_in(z, "HA-Neustart", "homeassistant/status", 170, 170, [[fd]], datatype="utf8")

# ================================================================ 90 Simulation
z = tab("t90", "90 SIMULATION", "SIMULATION – erzeugt synthetische Daten. Später komplett löschbar.")
comment(z, "⚠ SIMULATION – synthetische Daten", f"""\
Dieser Tab erzeugt **synthetische** Kompressordaten (keine Messwerte!) und
publiziert sie wie ein echter Sensorknoten auf `{T}/raw/<sensor>` mit `"src": "sim"`.
Die Daten durchlaufen damit exakt dieselbe Kette (MQTT → Validierung → … → InfluxDB/HA).

Steuerung aus HA: Schalter „Simulation“ (`{T}/sim/enabled/set`) und Auswahl
„Simulationsszenario“ (`{T}/sim/scenario/set`). Szenarien:
normal, sensorfehler, kommunikationsausfall, sensorknoten_offline, uebertemperatur,
druckanomalie, zeitstempelfehler. „Wartung fällig“: Intervall in HA klein setzen.

Alle Zahlenwerte hier sind frei gewählte Simulationsparameter, KEINE Kenndaten
des realen Kompressors. Es werden keine Steuerbefehle erzeugt.
Entfernen: Tab löschen + `DROP SERIES WHERE source='sim'` (siehe docs/simulation.md).""")
SIM_CTRL_JS = ("const SCEN = " + json.dumps(SIM_SCENARIOS) + ";\nconst ROOM = " + json.dumps(SIM_ROOM) + ";\n" + r"""
// Topic: <präfix>/sim/<key>[/set] – Auswertung relativ zu „sim“, unabhängig vom Präfix
const parts = msg.topic.split('/'); const i = parts.lastIndexOf('sim');
const key = parts[i + 1]; const isSet = parts[i + 2] === 'set';
const sim = global.get('sim') || { enabled: false, scenario: 'normal', room: 'normal' };
if (!sim.room) sim.room = 'normal';
const val = String(msg.payload === undefined || msg.payload === null ? '' : msg.payload);
const restored = context.get('restored') || {};
const mq = [], lines = [];
if (!isSet && restored[key]) return [null, null];   // eigenes Echo des Zustands ignorieren
restored[key] = true; context.set('restored', restored);
if (key === 'enabled') {
    const en = val.toUpperCase() === 'ON';
    const changed = en !== sim.enabled;
    sim.enabled = en;
    if (isSet) mq.push({ topic: 'kompressor/sim/enabled', payload: en ? 'ON' : 'OFF', retain: true });
    if (changed || isSet) {
        // Simulation verhält sich wie ein Sensorknoten: online beim Einschalten, abgemeldet beim Ausschalten
        mq.push({ topic: 'kompressor/raw/status', payload: en ? 'online' : '', retain: true });
        lines.push({ rp: 'events', line: 'events,type=simulation,source=sim value=' + (en ? 1 : 0) + ',text="Simulation ' + (en ? 'eingeschaltet' : 'ausgeschaltet') + '"' });
    }
} else if (key === 'scenario') {
    if (!SCEN.includes(val)) return [null, null];
    const changed = val !== sim.scenario;
    sim.scenario = val;
    if (isSet) mq.push({ topic: 'kompressor/sim/scenario', payload: val, retain: true });
    if (changed && isSet) lines.push({ rp: 'events', line: 'events,type=simulation,source=sim value=2,text="Simulationsszenario: ' + val + '"' });
} else if (key === 'room') {
    if (!ROOM.includes(val)) return [null, null];
    const changed = val !== sim.room;
    sim.room = val;
    if (isSet) mq.push({ topic: 'kompressor/sim/room', payload: val, retain: true });
    if (changed && isSet) lines.push({ rp: 'events', line: 'events,type=simulation,source=sim value=3,text="Simulation Raumklima: ' + val + '"' });
} else return [null, null];
global.set('sim', sim);
node.status({ fill: sim.enabled ? 'blue' : 'grey', shape: 'dot', text: (sim.enabled ? 'AN' : 'AUS') + ' – ' + sim.scenario });
return [mq, lines.length ? { payload: lines } : null];
""")
SIM_DEFAULT_JS = r"""
// Beim allerersten Start (kein retained Zustand vorhanden): Simulation AUS, Szenario normal
const sim = global.get('sim');
if (sim) {
    // bestehende Installation: fehlenden Zustand des Raumklimas einmalig nachreichen
    if (context.get('room_done')) return null;
    context.set('room_done', true);
    if (!sim.room) { sim.room = 'normal'; global.set('sim', sim); }
    return [[{ topic: 'kompressor/sim/room', payload: sim.room, retain: true }]];
}
global.set('sim', { enabled: false, scenario: 'normal', room: 'normal' });
return [[{ topic: 'kompressor/sim/enabled', payload: 'OFF', retain: true },
         { topic: 'kompressor/sim/scenario', payload: 'normal', retain: true },
         { topic: 'kompressor/sim/room', payload: 'normal', retain: true }]];
"""
SIM_ENGINE_JS = r"""
// SIMULATION – synthetische Werte, KEINE Kenndaten eines realen Kompressors.
const sim = global.get('sim') || { enabled: false, scenario: 'normal' };
const now = Date.now();
let s = context.get('s');
if (!sim.enabled) { if (s) context.set('s', null); node.status({ fill: 'grey', shape: 'ring', text: 'Simulation aus' }); return null; }
if (!s) s = { phase: 'idle', t: 0, p: 0, T: [18, 18, 18], C: [18, 18], TR: 18, base: 18, seq: 0, last: now, scen: null };
if (s.TR === undefined) { s.TR = 18; s.base = 18; s.C = [s.T[0], s.T[1]]; }
const dt = Math.min(Math.max((now - s.last) / 1000, 0), 10); s.last = now; s.t += dt;
const sc = sim.scenario; const out = [];
if (sc !== s.scen) {
    if (sc === 'sensorknoten_offline') out.push({ topic: 'kompressor/raw/status', payload: 'offline', retain: true });
    else if (s.scen === 'sensorknoten_offline') out.push({ topic: 'kompressor/raw/status', payload: 'online', retain: true });
    s.scen = sc;
}
const noise = a => (Math.random() * 2 - 1) * a;
// Simulationsparameter (frei gewählt):
const P_END = 200, P_RATE = 0.35, TAU = 300, IDLE_S = 90, MAX_RUN_S = 900;
// Raumklima (unabhängig von den Zylindern): Gebäude-/Außeneinfluss + Abwärme des Kompressors
const ROOM_BASE = { normal: 18, sommer: 30, winter: 8, erwaermung: null }[sim.room || 'normal'];
if (ROOM_BASE === null) s.base = Math.min(35, s.base + dt * 3 / 3600);      // langsame Erwärmung: +3 °C/h bis 35 °C
else s.base += (ROOM_BASE - s.base) * (1 - Math.exp(-dt / 1200));          // Umstellung über ca. 20 min
// Betriebsfreigabe: ohne Freigabe läuft der simulierte Motor nicht an bzw. stoppt sofort
const rel = global.get('release');
const released = !rel || rel.on;
if (!released && s.phase === 'running') { s.phase = 'idle'; s.t = 0; }
if (s.phase === 'idle' && s.t >= IDLE_S && released) { s.phase = 'running'; s.t = 0; s.p = 30 + Math.random() * 40; }
else if (s.phase === 'running' && ((s.p >= P_END && sc !== 'uebertemperatur') || s.t >= MAX_RUN_S)) { s.phase = 'idle'; s.t = 0; }
const run = s.phase === 'running';
if (run && sc !== 'druckanomalie') s.p = Math.min(P_END, s.p + P_RATE * dt);
if (!run) s.p = Math.max(0, s.p - 0.5 * dt);
// Raum: erwärmt sich bei laufendem Motor (Abwärme), kühlt im Stillstand zur Basistemperatur ab
const ROOM_HEAT = run ? 6 : 0, TAU_ROOM = 1800;
s.TR += ((s.base + ROOM_HEAT) - s.TR) * (1 - Math.exp(-dt / TAU_ROOM));
// Zylinder: Übertemperatur gegenüber Raum, abhängig vom Druckniveau
const load = 0.6 + 0.4 * Math.min(1, s.p / P_END);
const rise = run ? [50 * load, 70 * load, 85 * load] : [0, 0, 0];
if (run && sc === 'uebertemperatur') rise[2] = 240;
for (let i = 0; i < 3; i++) s.T[i] += ((s.TR + rise[i]) - s.T[i]) * (1 - Math.exp(-dt / TAU));
// Kühlspiralen: Gas nach Stufe 1 bzw. 2, durch Kühlluft auf ca. 35 % der Zylinder-Übertemperatur gekühlt
for (let i = 0; i < 2; i++) s.C[i] += ((s.TR + 0.35 * (s.T[i] - s.TR)) - s.C[i]) * (1 - Math.exp(-dt / 120));
const I = run ? (s.t < 4 ? 28 : 11.5 + s.p / 100) + noise(0.3) : Math.abs(noise(0.05));
const U = 400 + noise(3);
context.set('s', s);
node.status({ fill: 'blue', shape: 'dot', text: 'SIM ' + sc + '/' + (sim.room || 'normal') + ': ' + (run ? 'läuft' : 'steht') + ', ' + s.p.toFixed(0) + ' bar, T3 ' + s.T[2].toFixed(0) + ' °C, Raum ' + s.TR.toFixed(1) + ' °C' });
if (sc === 'kommunikationsausfall' || sc === 'sensorknoten_offline') return [out];
s.seq++;
const vals = { pressure_final: s.p + noise(0.3), temp_stage1: s.T[0] + noise(0.2), temp_coil12: s.C[0] + noise(0.2), temp_stage2: s.T[1] + noise(0.2),
               temp_coil23: s.C[1] + noise(0.2), temp_stage3: s.T[2] + noise(0.2), temp_room: s.TR + noise(0.05), motor_current: I, supply_voltage: U };
for (const [k, v] of Object.entries(vals)) {
    let pv = Math.round(v * 100) / 100, ts = now;
    if (sc === 'sensorfehler' && k === 'temp_stage2') pv = (s.seq % 2) ? null : 999.9;
    if (sc === 'zeitstempelfehler' && k === 'pressure_final') ts = now + 3600 * 1000;
    const m = { topic: 'kompressor/raw/' + k, payload: JSON.stringify({ v: pv, ts: ts, src: 'sim', seq: s.seq }), retain: false };
    out.push(m);
    if (sc === 'zeitstempelfehler' && k === 'temp_stage1') out.push(Object.assign({}, m));   // Duplikat
}
return [out];
"""
lo_m = link_out(z, "→ MQTT", 660, 140, [L_MQTT_OUT])
lo_d = link_out(z, "→ Datenbank", 660, 180, [L_DB])
fsc = func(z, "Simulation steuern", SIM_CTRL_JS, 430, 160, [[lo_m], [lo_d]])
mqtt_in(z, "Simulation (aus HA)", f"{T}/sim/#", 180, 160, [[fsc]], datatype="utf8")
lo_m3 = link_out(z, "→ MQTT  ", 660, 240, [L_MQTT_OUT])
fsd = func(z, "Standard: AUS", SIM_DEFAULT_JS, 430, 240, [[lo_m3]])
inject(z, "nach 6 s", 180, 240, [[fsd]], delay="6")
lo_m2 = link_out(z, "→ MQTT (wie Sensorknoten)", 700, 320, [L_MQTT_OUT])
fse = func(z, "Simulator (synthetisch)", SIM_ENGINE_JS, 430, 320, [[lo_m2]])
inject(z, "alle 2 s", 180, 320, [[fse]], repeat=2, delay="7")

connect_links()


# ---------------------------------------------------------------- Ausgabe / Deployment
def export(path):
    clean = [{k: v for k, v in n.items() if k != "credentials"} for n in nodes]
    with open(path, "w") as fh:
        json.dump(clean, fh, ensure_ascii=False, indent=1)
    print(f"exportiert: {path} ({len(clean)} Knoten)")


def deploy():
    import ha
    env = dict(l.strip().split("=", 1) for l in open(os.path.join(ROOT, ".env")) if "=" in l)
    for n in nodes:
        if n["type"] == "mqtt-broker":
            n["credentials"] = {"user": "kompressor-nodered", "password": env["MQTT_NODERED_PASSWORD"]}
        if n["type"] == "http request" and n.get("authType") == "basic":
            n["credentials"] = {"user": "kompressor-nodered", "password": env["INFLUX_NODERED_PASSWORD"]}
    ig = ha.Ingress("a0d7b954_nodered")
    ig.s.headers["Node-RED-API-Version"] = "v2"
    cur = ig.req("GET", "/flows")
    ours = {n["id"] for n in nodes}
    foreign = [n for n in cur["flows"] if not n["id"].startswith("krm") and n.get("z", "") not in ours]
    body = {"rev": cur["rev"], "flows": foreign + nodes}
    res = ig.req("POST", "/flows", json=body, headers={"Node-RED-Deployment-Type": "full"})
    print("deployed, rev:", res.get("rev") if isinstance(res, dict) else res, f"({len(nodes)} eigene + {len(foreign)} fremde Knoten)")


if __name__ == "__main__":
    os.makedirs(os.path.join(ROOT, "config/nodered"), exist_ok=True)
    export(os.path.join(ROOT, "config/nodered/flows.json"))
    if "--export" not in sys.argv:
        deploy()
