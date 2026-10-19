"""Erzeugt Datenquelle + Grafana-Dashboard von Compresio und spielt sie in Grafana ein.

  python tools/build_grafana.py            # erzeugen + deployen (Passwort aus .env)
  python tools/build_grafana.py --export   # nur config/grafana/*.json schreiben

Zugriff auf Grafana erfolgt über HA-Ingress (Grafana-App, Admin über Auth-Proxy).
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DS_UID = "kompressor-influx"
DS = {"type": "influxdb", "uid": DS_UID}
DASH_UID = "kompressorraum"

DATASOURCE = {
    "name": "InfluxDB Compresio", "uid": DS_UID, "type": "influxdb", "access": "proxy",
    "url": "http://a0d7b954-influxdb:8086", "user": "kompressor-grafana", "isDefault": True,
    "jsonData": {"dbName": "kompressor", "httpMode": "GET", "version": "InfluxQL", "timeInterval": "5s"},
}

SRC = "\"source\" =~ /^$source$/"
panels = []
_id = [0]
_y = [0]


def pid():
    _id[0] += 1
    return _id[0]


def q(query, ref="A", alias=None, fmt="time_series"):
    t = {"refId": ref, "datasource": DS, "query": query, "rawQuery": True, "resultFormat": fmt}
    if alias:
        t["alias"] = alias
    return t


def row(title):
    panels.append({"type": "row", "title": title, "id": pid(), "collapsed": False,
                   "gridPos": {"h": 1, "w": 24, "x": 0, "y": _y[0]}, "panels": []})
    _y[0] += 1


def panel(type_, title, x, w, h, targets, desc="", field=None, options=None, overrides=None, time_from=None, newrow=False):
    p = {"type": type_, "title": title, "id": pid(), "datasource": DS, "description": desc,
         "gridPos": {"h": h, "w": w, "x": x, "y": _y[0]}, "targets": targets,
         "fieldConfig": {"defaults": field or {}, "overrides": overrides or []}, "options": options or {}}
    if time_from:
        p["timeFrom"] = time_from
        p["hideTimeOverride"] = True
    panels.append(p)
    return p


def advance(h):
    _y[0] += h


def thr(*steps):
    s = [{"color": steps[0], "value": None}]
    for i in range(1, len(steps), 2):
        s.append({"value": steps[i], "color": steps[i + 1]})
    return {"mode": "absolute", "steps": s}


def stat_opts(text_mode="value", color_mode="background", graph="none", calc="lastNotNull", fields=""):
    return {"reduceOptions": {"calcs": [calc], "fields": fields, "values": False}, "colorMode": color_mode,
            "graphMode": graph, "textMode": text_mode, "justifyMode": "center", "orientation": "auto",
            "showPercentChange": False, "wideLayout": True}


def ts_field(unit="", decimals=None, fill=10, draw="line", stack=False, min_=None):
    f = {"unit": unit, "custom": {"drawStyle": draw, "lineWidth": 2, "fillOpacity": fill, "spanNulls": False,
                                  "showPoints": "never", "lineInterpolation": "smooth" if draw == "line" else "linear",
                                  "stacking": {"mode": "normal" if stack else "none"}, "axisBorderShow": False}}
    if decimals is not None:
        f["decimals"] = decimals
    if min_ is not None:
        f["min"] = min_
    return f


TS_OPTS = {"legend": {"displayMode": "list", "placement": "bottom", "showLegend": True},
           "tooltip": {"mode": "multi", "sort": "none"}}
STATUS_MAP = [{"type": "value", "options": {
    "0": {"text": "NORMAL", "color": "green", "index": 0}, "1": {"text": "WARNUNG", "color": "orange", "index": 1},
    "2": {"text": "STÖRUNG", "color": "red", "index": 2}, "3": {"text": "KEINE DATEN", "color": "#8e8e8e", "index": 3}}}]
RUN_MAP = [{"type": "value", "options": {"0": {"text": "STEHT", "color": "#5a6b7d", "index": 0},
                                          "1": {"text": "LÄUFT", "color": "green", "index": 1}}}]
MAINT_MAP = [{"type": "value", "options": {
    "0": {"text": "OK", "color": "green", "index": 0}, "1": {"text": "BALD FÄLLIG", "color": "orange", "index": 1},
    "2": {"text": "FÄLLIG", "color": "red", "index": 2}, "3": {"text": "NICHT FESTGELEGT", "color": "#8e8e8e", "index": 3}}}]
NODATA = "Keine Daten"
TEST = "Schwellwerte sind TEST-Werte, keine Herstellerangaben."

# ------------------------------------------------------------------ ÜBERSICHT
row("Übersicht")
panel("stat", "Gesamtstatus", 0, 5, 5, [q("SELECT last(\"status_code\") FROM \"raw\".\"state\" WHERE $timeFilter AND \"status_code\" >= 0")],
      desc="Aus Node-RED (Alarmierung). Ohne Daten in den letzten 2 Minuten: Keine Daten.",
      field={"mappings": STATUS_MAP, "noValue": NODATA, "color": {"mode": "thresholds"}, "thresholds": thr("green")},
      options=stat_opts(), time_from="2m")
panel("stat", "Betriebszustand", 5, 4, 5, [q(f"SELECT last(\"running\") FROM \"raw\".\"state\" WHERE $timeFilter AND {SRC} AND \"running\" >= 0")],
      field={"mappings": RUN_MAP, "noValue": NODATA, "color": {"mode": "thresholds"}, "thresholds": thr("#5a6b7d")},
      options=stat_opts(), time_from="1m")
panel("stat", "Aktuelle Laufzeit", 9, 3, 5, [q(f"SELECT last(\"cycle_s\") FROM \"raw\".\"counter\" WHERE $timeFilter AND {SRC}")],
      field={"unit": "s", "noValue": NODATA, "color": {"mode": "fixed", "fixedColor": "blue"}}, options=stat_opts(color_mode="value"), time_from="1m")
panel("stat", "Gesamtbetriebsstunden", 12, 4, 5, [q(f"SELECT last(\"total_s\") / 3600 FROM \"raw\".\"counter\" WHERE $timeFilter AND {SRC}")],
      field={"unit": "h", "decimals": 2, "noValue": NODATA, "color": {"mode": "fixed", "fixedColor": "text"}},
      options=stat_opts(color_mode="value"), time_from="1h")
panel("stat", "Aktive Meldungen", 16, 3, 5, [q("SELECT last(\"alerts\") FROM \"raw\".\"state\" WHERE $timeFilter AND \"alerts\" >= 0")],
      field={"noValue": NODATA, "color": {"mode": "thresholds"}, "thresholds": thr("green", 1, "orange")},
      options=stat_opts(), time_from="2m")
panel("stat", "Letzte Aktualisierung", 19, 5, 5, [q(f"SELECT last(\"value\") FROM \"raw\".\"sensor\" WHERE $timeFilter AND {SRC}", fmt="table")],
      field={"unit": "dateTimeFromNow", "noValue": NODATA, "color": {"mode": "fixed", "fixedColor": "text"}},
      options=stat_opts(color_mode="value", fields="/^Time$/"), time_from="24h")
advance(5)

# ------------------------------------------------------------------ DRUCK
row("Druck")
panel("gauge", "Enddruck aktuell", 0, 5, 8,
      [q(f"SELECT last(\"value\") FROM \"raw\".\"sensor\" WHERE \"sensor\" = 'pressure_final' AND {SRC} AND $timeFilter")],
      desc="Skala und Farbschwellen sind Darstellungs-/TEST-Werte. " + TEST,
      field={"unit": "pressurebar", "decimals": 1, "min": 0, "max": 300, "noValue": NODATA,
             "thresholds": thr("blue", 220, "orange", 240, "red"), "color": {"mode": "thresholds"}},
      options={"reduceOptions": {"calcs": ["lastNotNull"], "fields": "", "values": False}, "showThresholdMarkers": True,
               "showThresholdLabels": False}, time_from="1m")
panel("timeseries", "Druckverlauf", 5, 11, 8,
      [q(f"SELECT mean(\"value\") FROM \"raw\".\"sensor\" WHERE \"sensor\" = '{sid}' AND {SRC} AND $timeFilter GROUP BY time($__interval) fill(null)", ref, alias=name)
       for ref, sid, name in [("A", "pressure_final", "Enddruck"), ("B", "pressure_cascade", "Kaskade"), ("C", "pressure_stage2", "Zwischendruck 2"),
                              ("D", "pressure_stage1", "Zwischendruck 1"), ("E", "pressure_suction", "Ansaugdruck")]],
      desc="Kaskade, Zwischen- und Ansaugdruck nur, wenn die Sensoren vorhanden sind (Ausstattung).",
      field=ts_field("pressurebar", 1), options=TS_OPTS)
panel("timeseries", "Druckanstieg", 16, 8, 8,
      [q(f"SELECT mean(\"rate\") FROM \"raw\".\"sensor\" WHERE \"sensor\" = 'pressure_final' AND {SRC} AND $timeFilter GROUP BY time($__interval) fill(null)", alias="bar/min")],
      desc="Änderungsrate über 60 s (Node-RED).", field=ts_field("bar/min", 1, fill=0), options=TS_OPTS)
advance(8)
panel("timeseries", "Historische Druckkurven (Minutenaggregate, 30 Tage)", 0, 24, 7,
      [q(f"SELECT max(\"max_value\") FROM \"agg_1m\".\"sensor\" WHERE \"sensor\" = 'pressure_final' AND {SRC} AND $timeFilter GROUP BY time($__interval) fill(null)", alias="max"),
       q(f"SELECT mean(\"mean_value\") FROM \"agg_1m\".\"sensor\" WHERE \"sensor\" = 'pressure_final' AND {SRC} AND $timeFilter GROUP BY time($__interval) fill(null)", "B", alias="Mittel")],
      desc="Aus der Retention Policy agg_1m (1 Jahr).", field=ts_field("pressurebar", 1, fill=5), options=TS_OPTS, time_from="30d")
advance(7)

# ------------------------------------------------------------------ TEMPERATUREN
row("Temperaturen")
TEMPS = [("temp_stage1", "T1 Zylinder 1", "#2F8CF0", 0), ("temp_coil12", "T12 Kühlspirale 1–2", "#8ED9D3", 1), ("temp_stage2", "T2 Zylinder 2", "#F2B544", 0),
         ("temp_coil23", "T23 Kühlspirale 2–3", "#FF8A65", 1), ("temp_stage3", "T3 Zylinder 3", "#EF5350", 0), ("temp_room", "TR Raum", "#C9D6E2", 2)]
TEMP_OVR = [{"matcher": {"id": "byName", "options": n}, "properties": [{"id": "color", "value": {"mode": "fixed", "fixedColor": c}}]
             + ([{"id": "custom.lineStyle", "value": {"fill": "dash" if d == 1 else "dot", "dash": [6, 4] if d == 1 else [2, 3]}}] if d else [])} for _, n, c, d in TEMPS]
panel("bargauge", "Temperaturen aktuell (T1 → T12 → T2 → T23 → T3, Raum)", 0, 6, 8,
      [q(f"SELECT last(\"value\") FROM \"raw\".\"sensor\" WHERE \"sensor\" = '{sid}' AND {SRC} AND $timeFilter", chr(65 + i), alias=n) for i, (sid, n, _, _) in enumerate(TEMPS)],
      desc=TEST, field={"unit": "celsius", "decimals": 1, "min": 0, "max": 200, "noValue": NODATA,
                        "thresholds": thr("green", 150, "orange", 180, "red"), "color": {"mode": "thresholds"}},
      options={"reduceOptions": {"calcs": ["lastNotNull"], "fields": "", "values": False}, "orientation": "horizontal",
               "displayMode": "gradient", "showUnfilled": True, "valueMode": "color", "namePlacement": "auto", "sizing": "auto"},
      time_from="1m")
panel("timeseries", "Temperaturverläufe (Zylinder durchgezogen, Kühlspiralen gestrichelt, Raum gepunktet)", 6, 12, 8,
      [q(f"SELECT mean(\"value\") FROM \"raw\".\"sensor\" WHERE \"sensor\" = '{sid}' AND {SRC} AND $timeFilter GROUP BY time($__interval) fill(null)", chr(65 + i), alias=n) for i, (sid, n, _, _) in enumerate(TEMPS)],
      field=ts_field("celsius", 1, fill=0), options=TS_OPTS, overrides=TEMP_OVR)
panel("barchart", "Vergleich: Tagesmaxima je Messstelle", 18, 6, 8,
      [q(f"SELECT max(\"max_value\") FROM \"agg_1m\".\"sensor\" WHERE \"sensor\" = '{sid}' AND {SRC} AND $timeFilter GROUP BY time(1d) fill(none)", chr(65 + i), alias=n) for i, (sid, n, _, _) in enumerate(TEMPS[:5])],
      field={"unit": "celsius", "decimals": 0, "color": {"mode": "palette-classic"}}, overrides=TEMP_OVR,
      options={"orientation": "auto", "xTickLabelRotation": 0, "showValue": "auto", "groupWidth": 0.7, "barWidth": 0.9,
               "legend": {"displayMode": "list", "placement": "bottom", "showLegend": True}, "xField": "Time"},
      time_from="14d")
advance(8)

# ------------------------------------------------------------------ MOTOR
row("Motor")
panel("state-timeline", "Motorstatus / Betriebszeiten", 0, 16, 5,
      [q(f"SELECT last(\"running\") FROM \"raw\".\"state\" WHERE {SRC} AND $timeFilter AND \"running\" >= 0 GROUP BY time($__interval) fill(null)", alias="Motor")],
      field={"mappings": RUN_MAP, "color": {"mode": "thresholds"}, "thresholds": thr("#5a6b7d"), "custom": {"fillOpacity": 80, "lineWidth": 0}},
      options={"showValue": "never", "mergeValues": True, "alignValue": "left", "rowHeight": 0.8,
               "legend": {"showLegend": False, "displayMode": "list", "placement": "bottom"}})
panel("stat", "Motorstarts gesamt", 16, 4, 5, [q(f"SELECT last(\"starts\") FROM \"raw\".\"counter\" WHERE $timeFilter AND {SRC}")],
      field={"noValue": NODATA, "decimals": 0, "color": {"mode": "fixed", "fixedColor": "text"}}, options=stat_opts(color_mode="value"), time_from="1h")
panel("stat", "Starts im Zeitraum", 20, 4, 5,
      [q(f"SELECT count(\"value\") FROM \"events\".\"events\" WHERE \"type\" = 'motor_start' AND {SRC} AND $timeFilter")],
      field={"noValue": "0", "decimals": 0, "color": {"mode": "fixed", "fixedColor": "blue"}}, options=stat_opts(color_mode="value"))
advance(5)
panel("timeseries", "Motorstrom", 0, 12, 8,
      [q(f"SELECT mean(\"value\") FROM \"raw\".\"sensor\" WHERE \"sensor\" = 'motor_current' AND {SRC} AND $timeFilter GROUP BY time($__interval) fill(null)", alias="Motorstrom"),
       q(f"SELECT mean(\"value\") FROM \"raw\".\"sensor\" WHERE \"sensor\" = 'supply_voltage' AND {SRC} AND $timeFilter GROUP BY time($__interval) fill(null)", "B", alias="Spannung")],
      field=ts_field("amp", 1, fill=10),
      overrides=[{"matcher": {"id": "byName", "options": "Spannung"}, "properties": [
          {"id": "unit", "value": "volt"}, {"id": "custom.axisPlacement", "value": "right"}, {"id": "custom.fillOpacity", "value": 0},
          {"id": "color", "value": {"mode": "fixed", "fixedColor": "#8e8e8e"}}]}], options=TS_OPTS)
panel("barchart", "Betriebsstunden pro Tag", 12, 6, 8,
      [q(f"SELECT spread(\"total_s\") / 3600 FROM \"raw\".\"counter\" WHERE {SRC} AND $timeFilter GROUP BY time(1d) fill(0)", alias="Betriebsstunden")],
      field={"unit": "h", "decimals": 2, "color": {"mode": "fixed", "fixedColor": "blue"}},
      options={"orientation": "auto", "showValue": "auto", "xField": "Time", "groupWidth": 0.7, "barWidth": 0.9,
               "legend": {"showLegend": False, "displayMode": "list", "placement": "bottom"}}, time_from="14d")
panel("table", "Letzte Betriebszyklen", 18, 6, 8,
      [q(f"SELECT \"value\" / 60 AS \"Dauer\" FROM \"events\".\"events\" WHERE \"type\" = 'cycle' AND {SRC} AND $timeFilter ORDER BY time DESC LIMIT 20", fmt="table")],
      field={"unit": "m", "decimals": 1, "noValue": "Noch keine Zyklen"},
      options={"showHeader": True, "cellHeight": "sm", "sortBy": [{"displayName": "Time", "desc": True}]}, time_from="30d")
advance(8)

# ------------------------------------------------------------------ WARTUNG
row("Wartung")
panel("stat", "Wartungsstatus", 0, 4, 5, [q(f"SELECT last(\"status_code\") FROM \"raw\".\"maintenance\" WHERE $timeFilter AND {SRC}")],
      desc="Intervalle sind noch nicht nach Herstellerunterlagen festgelegt.",
      field={"mappings": MAINT_MAP, "noValue": NODATA, "color": {"mode": "thresholds"}, "thresholds": thr("green")},
      options=stat_opts(), time_from="10m")
panel("stat", "Restlaufzeit bis Wartung", 4, 4, 5, [q(f"SELECT last(\"remaining_h\") FROM \"raw\".\"maintenance\" WHERE $timeFilter AND {SRC}")],
      field={"unit": "h", "decimals": 1, "noValue": "nicht festgelegt", "color": {"mode": "thresholds"}, "thresholds": thr("red", 0, "green")},
      options=stat_opts(color_mode="value"), time_from="10m")
panel("stat", "Betriebsstunden seit Wartung", 8, 4, 5, [q(f"SELECT last(\"hours_since\") FROM \"raw\".\"maintenance\" WHERE $timeFilter AND {SRC}")],
      field={"unit": "h", "decimals": 2, "noValue": NODATA, "color": {"mode": "fixed", "fixedColor": "text"}},
      options=stat_opts(color_mode="value"), time_from="10m")
panel("stat", "Filterstatus", 12, 4, 5, [q(f"SELECT last(\"filter_status_code\") FROM \"raw\".\"maintenance\" WHERE $timeFilter AND {SRC}")],
      field={"mappings": MAINT_MAP, "noValue": NODATA, "color": {"mode": "thresholds"}, "thresholds": thr("green")},
      options=stat_opts(), time_from="10m")
panel("stat", "Betriebsstunden seit Filterwechsel", 16, 4, 5, [q(f"SELECT last(\"filter_hours_since\") FROM \"raw\".\"maintenance\" WHERE $timeFilter AND {SRC}")],
      field={"unit": "h", "decimals": 2, "noValue": NODATA, "color": {"mode": "fixed", "fixedColor": "text"}},
      options=stat_opts(color_mode="value"), time_from="10m")
panel("stat", "Intervalle (vorläufig)", 20, 4, 5,
      [q(f"SELECT last(\"interval_h\") AS \"Wartung\", last(\"filter_interval_h\") AS \"Filter\" FROM \"raw\".\"maintenance\" WHERE $timeFilter AND {SRC}")],
      desc="0 = noch nicht festgelegt (Herstellerunterlagen prüfen).",
      field={"unit": "h", "mappings": [{"type": "value", "options": {"0": {"text": "nicht festgelegt", "index": 0}}}],
             "noValue": NODATA, "color": {"mode": "fixed", "fixedColor": "text"}},
      options=stat_opts(text_mode="value_and_name", color_mode="value"), time_from="10m")
advance(5)
panel("table", "Wartungshistorie", 0, 24, 6,
      [q("SELECT \"text\" AS \"Ereignis\", \"type\" AS \"Art\" FROM \"events\".\"events\" WHERE \"type\" =~ /^(maintenance|filter_change|maintenance_config)$/ AND $timeFilter ORDER BY time DESC LIMIT 100", fmt="table")],
      field={"noValue": "Noch keine Wartungsereignisse"},
      options={"showHeader": True, "cellHeight": "sm"}, time_from="5y")
advance(6)

# ------------------------------------------------------------------ DIAGNOSE
row("Diagnose")
panel("timeseries", "Sensorverfügbarkeit (Messwerte pro Minute)", 0, 12, 8,
      [q(f"SELECT count(\"value\") FROM \"raw\".\"sensor\" WHERE {SRC} AND $timeFilter GROUP BY time(1m), \"sensor\" fill(0)", alias="$tag_sensor")],
      desc="Einbrüche auf 0 = Datenlücke.", field=ts_field("", 0, fill=0, min_=0), options=TS_OPTS)
panel("timeseries", "Alter der letzten Messung / Meldungen", 12, 12, 8,
      [q("SELECT max(\"data_age_s\") FROM \"raw\".\"system\" WHERE $timeFilter GROUP BY time($__interval) fill(null)", alias="Datenalter (s)"),
       q("SELECT max(\"faults\") FROM \"raw\".\"state\" WHERE $timeFilter GROUP BY time($__interval) fill(null)", "B", alias="Störungen"),
       q("SELECT max(\"warnings\") FROM \"raw\".\"state\" WHERE $timeFilter GROUP BY time($__interval) fill(null)", "C", alias="Warnungen")],
      field=ts_field("", 0, fill=0, min_=0),
      overrides=[{"matcher": {"id": "byName", "options": "Störungen"}, "properties": [{"id": "color", "value": {"mode": "fixed", "fixedColor": "red"}}, {"id": "custom.axisPlacement", "value": "right"}]},
                 {"matcher": {"id": "byName", "options": "Warnungen"}, "properties": [{"id": "color", "value": {"mode": "fixed", "fixedColor": "orange"}}, {"id": "custom.axisPlacement", "value": "right"}]}],
      options=TS_OPTS)
advance(8)
for i, (title, field, unit) in enumerate([("InfluxDB", "influx_ok", None), ("DB-Puffer", "db_buffer", "short"),
                                          ("Nachrichten/min", "rx_per_min", "short"), ("Ungültige Nachrichten", "invalid_total", "short"),
                                          ("Verworfene Duplikate", "duplicates_total", "short"), ("Korrigierte Zeitstempel", "ts_corrected_total", "short")]):
    fc = {"noValue": NODATA, "decimals": 0, "color": {"mode": "fixed", "fixedColor": "text"}, "unit": unit or "short"}
    opts = stat_opts(color_mode="value", graph="area")
    if field == "influx_ok":
        fc = {"noValue": NODATA, "mappings": [{"type": "value", "options": {"1": {"text": "OK", "color": "green"}, "0": {"text": "FEHLER", "color": "red"}}}],
              "color": {"mode": "thresholds"}, "thresholds": thr("red", 1, "green")}
        opts = stat_opts()
    panel("stat", title, i * 4, 4, 4, [q(f"SELECT last(\"{field}\") FROM \"raw\".\"system\" WHERE $timeFilter")], field=fc, options=opts, time_from="2m" if field == "influx_ok" else None)
advance(4)
panel("table", "Ereignisse (Meldungen, Starts/Stopps, Wartung, Simulation)", 0, 24, 9,
      [q("SELECT \"text\" AS \"Ereignis\", \"type\" AS \"Art\", \"severity\" AS \"Schwere\", \"source\" AS \"Quelle\" FROM \"events\".\"events\" WHERE $timeFilter ORDER BY time DESC LIMIT 200", fmt="table")],
      field={"noValue": "Keine Ereignisse im Zeitraum"},
      overrides=[{"matcher": {"id": "byName", "options": "Schwere"}, "properties": [
          {"id": "custom.cellOptions", "value": {"type": "color-text"}},
          {"id": "mappings", "value": [{"type": "value", "options": {"stoerung": {"text": "STÖRUNG", "color": "red"}, "warnung": {"text": "Warnung", "color": "orange"}}}]}]}],
      options={"showHeader": True, "cellHeight": "sm"})
advance(9)

DASHBOARD = {
    "uid": DASH_UID, "title": "Compresio – Kompressorraum", "tags": ["kompressor"],
    "timezone": "browser", "refresh": "10s", "time": {"from": "now-3h", "to": "now"},
    "schemaVersion": 39, "editable": True, "graphTooltip": 1, "liveNow": False,
    "description": "Überwachung des Atemluftkompressors. Reine Diagnose – keine Steuerung. "
                   "Schwellwerte sind TEST-Werte. Quelle 'sim' = synthetische Simulationsdaten.",
    "templating": {"list": [{
        "name": "source", "label": "Datenquelle", "type": "custom", "query": "real,sim",
        "current": {"text": "sim", "value": "sim", "selected": True},
        "options": [{"text": "real", "value": "real", "selected": False}, {"text": "sim", "value": "sim", "selected": True}],
        "description": "real = Messwerte der Sensorik, sim = SIMULATION (synthetisch)"}]},
    "annotations": {"list": [
        {"builtIn": 1, "datasource": {"type": "grafana", "uid": "-- Grafana --"}, "enable": True, "hide": True,
         "iconColor": "rgba(0, 211, 255, 1)", "name": "Annotations & Alerts", "type": "dashboard"},
        {"name": "Meldungen", "datasource": DS, "enable": True, "iconColor": "red",
         "query": "SELECT \"text\" FROM \"events\".\"events\" WHERE \"type\" = 'alert' AND $timeFilter", "textColumn": "text"},
        {"name": "Wartung", "datasource": DS, "enable": True, "iconColor": "blue",
         "query": "SELECT \"text\" FROM \"events\".\"events\" WHERE \"type\" =~ /^(maintenance|filter_change)$/ AND $timeFilter", "textColumn": "text"}]},
    "links": [], "panels": panels,
}


def export():
    d = os.path.join(ROOT, "config/grafana")
    os.makedirs(d, exist_ok=True)
    json.dump(DATASOURCE, open(os.path.join(d, "datasource.json"), "w"), ensure_ascii=False, indent=1)
    json.dump(DASHBOARD, open(os.path.join(d, "dashboard-kompressorraum.json"), "w"), ensure_ascii=False, indent=1)
    print(f"exportiert: config/grafana/ ({len(panels)} Panels)")


def deploy():
    import ha
    env = dict(l.strip().split("=", 1) for l in open(os.path.join(ROOT, ".env")) if "=" in l)
    ig = ha.Ingress("a0d7b954_grafana")
    ig.s.headers["Content-Type"] = "application/json"
    ds = dict(DATASOURCE, secureJsonData={"password": env["INFLUX_GRAFANA_PASSWORD"]})
    existing = {d["uid"]: d for d in ig.req("GET", "/api/datasources")}
    if DS_UID in existing:
        ig.req("PUT", f"/api/datasources/uid/{DS_UID}", json=ds)
        print("Datenquelle aktualisiert")
    else:
        ig.req("POST", "/api/datasources", json=ds)
        print("Datenquelle angelegt")
    print("Datenquellen-Test:", ig.req("GET", f"/api/datasources/uid/{DS_UID}/health"))
    res = ig.req("POST", "/api/dashboards/db", json={"dashboard": DASHBOARD, "overwrite": True, "message": "tools/build_grafana.py"})
    print("Dashboard:", res.get("status"), res.get("url"))
    ig.req("PUT", "/api/org/preferences", json={"homeDashboardUID": DASH_UID, "timezone": "browser", "weekStart": "monday"})
    print("Startseite gesetzt")


if __name__ == "__main__":
    export()
    if "--export" not in sys.argv:
        deploy()
