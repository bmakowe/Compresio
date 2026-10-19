"""End-to-End-Test der Plattform mit der Simulation.

Steuert ausschließlich die Simulations- und Wartungs-Entitäten in HA (keine Geräte!)
und prüft für jedes Szenario: HA-Entitäten (MQTT → HA) und InfluxDB (MQTT → Node-RED → InfluxDB).
Dauer ca. 15–20 Minuten.  python tools/e2e_test.py
"""
import os
import sys
import time

import requests

sys.path.insert(0, os.path.dirname(__file__))
import ha  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV = dict(l.strip().split("=", 1) for l in open(os.path.join(ROOT, ".env")) if "=" in l)
INFLUX = "http://" + ha.BASE.split("://")[1] + ":8086"
E = "kompressor"
results = []


def st(x):
    return ha.rest("GET", f"/api/states/{x}")


def state(x):
    return st(x)["state"]


def call(domain, service, data):
    ha.rest("POST", f"/api/services/{domain}/{service}", data)


def scenario(name):
    call("select", "select_option", {"entity_id": f"select.{E}_simulation_szenario", "option": name})


def influx(q):
    r = requests.get(INFLUX + "/query", params={"db": "kompressor", "q": q},
                     auth=("kompressor-grafana", ENV["INFLUX_GRAFANA_PASSWORD"]), timeout=20)
    return r.json()["results"][0].get("series", [])


def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))
    print(("OK    " if ok else "FEHLER") + f"  {name}  {detail}", flush=True)


def wait_for(desc, fn, timeout, interval=5):
    t0 = time.time()
    while time.time() - t0 < timeout:
        try:
            v = fn()
            if v:
                return v
        except Exception:
            pass
        time.sleep(interval)
    return None


def alerts_text():
    return st(f"sensor.{E}_meldungen")["attributes"].get("text", "")


def wait_running(want=True, timeout=200):
    return wait_for("motor", lambda: state(f"binary_sensor.{E}_motor") == ("on" if want else "off"), timeout, 3)


print("== Vorbereitung")
call("switch", "turn_on", {"entity_id": f"switch.{E}_simulation"})
print("== Betriebsfreigabe (Testausgang)")
call("script", "turn_on", {"entity_id": "script.kompressor_freigabe_entziehen"}); time.sleep(100)
check("Ohne Freigabe läuft der Motor nicht an", state(f"binary_sensor.{E}_motor") != "on", state(f"binary_sensor.{E}_motor"))
call("script", "turn_on", {"entity_id": "script.kompressor_freigabe_erteilen"}); time.sleep(8)
check("Freigabe erteilt (Testausgang ein)", state("input_boolean.kompressor_freigabe_testausgang") == "on")
scenario("normal")
check("Simulation eingeschaltet", wait_for("", lambda: state(f"sensor.{E}_quelle") == "simulation", 60), state(f"sensor.{E}_quelle"))

print("== Normalbetrieb")
check("Motor läuft (Simulation)", wait_running(True), "")
check("Status normal", wait_for("", lambda: state(f"sensor.{E}_status") == "normal", 60), state(f"sensor.{E}_status"))
p1 = float(state(f"sensor.{E}_enddruck")); time.sleep(20); p2 = float(state(f"sensor.{E}_enddruck"))
check("Druckanstieg bei laufendem Motor", p2 > p1, f"{p1} → {p2} bar")
h1 = float(state(f"sensor.{E}_betriebsstunden")); time.sleep(45); h2 = float(state(f"sensor.{E}_betriebsstunden"))  # Auflösung 0,01 h = 36 s
check("Betriebsstunden zählen", h2 > h1, f"{h1} → {h2} h")
n = influx("SELECT count(value) FROM raw.sensor WHERE source='sim' AND time > now() - 1m")
check("InfluxDB: Rohdaten der letzten Minute", n and n[0]["values"][0][1] > 100, str(n and n[0]["values"][0][1]))
n = influx("SELECT count(mean_value) FROM agg_1m.sensor WHERE source='sim' AND time > now() - 10m")
check("InfluxDB: Minutenaggregate (CQ)", n and n[0]["values"][0][1] > 0, str(n and n[0]["values"][0][1]))
check("Motor stoppt bei Enddruck", wait_running(False, 600), "")
check("Abkühlung (Stufe 3 sinkt)", wait_for("", lambda: (lambda a: (time.sleep(15), a > float(state(f"sensor.kompressor_temperatur_stufe_3")))[1])(float(state(f"sensor.kompressor_temperatur_stufe_3"))), 60, 1), "")
ev = influx("SELECT count(value) FROM events.events WHERE type='cycle' AND source='sim'")
check("Zyklus als Ereignis gespeichert", ev and ev[0]["values"][0][1] >= 1, str(ev and ev[0]["values"][0][1]))
check("Letzter Zyklus in HA", state(f"sensor.{E}_zyklus_letzter") not in ("unknown", "unavailable"), state(f"sensor.{E}_zyklus_letzter") + " min")

print("== Ausstattung und Speicherkaskade")
SW_K, SW_T = f"switch.{E}_ausstattung_pressure_cascade", f"switch.{E}_ausstattung_temp_coil23"
orig = {SW_K: state(SW_K), SW_T: state(SW_T)}
call("switch", "turn_on", {"entity_id": SW_K})
def _num(x):
    try:
        return float(state(x))
    except ValueError:
        return None
check("Kaskadendruck in HA (Simulation)", wait_for("", lambda: _num(f"sensor.{E}_kaskadendruck") is not None, 40), state(f"sensor.{E}_kaskadendruck") + " bar")
check("Sensorstatus Kaskade = ok", state(f"sensor.{E}_sensorstatus_pressure_cascade") == "ok", state(f"sensor.{E}_sensorstatus_pressure_cascade"))
kc = wait_for("", lambda: influx("SELECT count(value) FROM raw.sensor WHERE sensor='pressure_cascade' AND time > now() - 1m"), 30)
check("InfluxDB: Kaskadendruck gespeichert", kc and kc[0]["values"][0][1] > 0, str(kc and kc[0]["values"][0][1]))
call("switch", "turn_off", {"entity_id": SW_T})
check("Nicht vorhandener Sensor: Status nicht_vorhanden", wait_for("", lambda: state(f"sensor.{E}_sensorstatus_temp_coil23") == "nicht_vorhanden", 20), "")
time.sleep(45)   # länger als stale_s (30 s): ein vorhandener Sensor würde jetzt „liefert keine Daten“ melden
check("Nicht vorhandener Sensor: keine Meldung", "2→3 liefert keine Daten" not in alerts_text(), alerts_text().split("\n")[0])
for sw, v in orig.items():
    call("switch", "turn_on" if v == "on" else "turn_off", {"entity_id": sw})
check("Ausstattung wiederhergestellt", wait_for("", lambda: all(state(sw) == v for sw, v in orig.items()), 20), str(orig))

print("== Sensorfehler")
scenario("sensorfehler")
check("Warnung unplausible Messwerte", wait_for("", lambda: "Unplausible" in alerts_text(), 40), alerts_text().split("\n")[0])
check("Status warnung", state(f"sensor.{E}_status") == "warnung", state(f"sensor.{E}_status"))
check("Stufe 2 in HA nicht verfügbar", state(f"sensor.kompressor_temperatur_stufe_2") == "unavailable", state(f"sensor.kompressor_temperatur_stufe_2"))
check("Sensorstatus Stufe 2 = ungueltig", state(f"sensor.{E}_sensorstatus_temp_stage2") == "ungueltig", "")
check("HA-Benachrichtigung vorhanden", wait_for("", lambda: any(n.get("notification_id") == "kompressor_meldungen" for n in ha.ws("persistent_notification/get")), 30), "")
scenario("normal")
check("Warnung behoben (nach Haltezeit 60 s)", wait_for("", lambda: "Unplausible" not in alerts_text(), 120), "")

print("== Zeitstempelfehler / Duplikate")
d1 = int(state(f"sensor.{E}_duplikate")); t1 = int(state(f"sensor.{E}_zeitstempel_korrigiert"))
scenario("zeitstempelfehler"); time.sleep(30); scenario("normal"); time.sleep(16)
d2 = int(state(f"sensor.{E}_duplikate")); t2 = int(state(f"sensor.{E}_zeitstempel_korrigiert"))
check("Duplikate verworfen", d2 > d1, f"{d1} → {d2}")
check("Zukunfts-Zeitstempel korrigiert", t2 > t1, f"{t1} → {t2}")
fut = influx("SELECT count(value) FROM raw.sensor WHERE time > now() + 1m")
check("Keine Zukunftsdaten in InfluxDB", not fut, str(fut))

print("== Kommunikationsausfall")
scenario("kommunikationsausfall")
check("Störung Datenübertragung", wait_for("", lambda: "Datenübertragung ausgefallen" in alerts_text(), 120), "")
check("Status stoerung", state(f"sensor.{E}_status") == "stoerung", state(f"sensor.{E}_status"))
check("Messwerte in HA nicht verfügbar", state(f"sensor.{E}_enddruck") == "unavailable", state(f"sensor.{E}_enddruck"))
h1 = float(state(f"sensor.{E}_betriebsstunden")); time.sleep(20); h2 = float(state(f"sensor.{E}_betriebsstunden"))
check("Keine Betriebsstunden ohne Daten", h2 == h1, f"{h1} → {h2}")
scenario("normal")
check("Wieder normal / warnung nach Ausfall", wait_for("", lambda: state(f"sensor.{E}_status") in ("normal",), 120), state(f"sensor.{E}_status"))

print("== Sensorknoten offline (Last Will)")
scenario("sensorknoten_offline")
check("Störung Sensorknoten offline", wait_for("", lambda: "Sensorknoten offline" in alerts_text(), 30), "")
scenario("normal")
check("Sensorknoten wieder online", wait_for("", lambda: "Sensorknoten offline" not in alerts_text(), 60), "")

print("== Wartung fällig")
call("number", "set_value", {"entity_id": f"number.{E}_wartungsintervall", "value": 0.01})
check("Wartungsstatus faellig", wait_for("", lambda: state(f"sensor.{E}_wartung_status") == "faellig", 40), state(f"sensor.{E}_wartung_status"))
check("Warnung Wartung fällig", wait_for("", lambda: "Wartung fällig" in alerts_text(), 20), "")
call("button", "press", {"entity_id": f"button.{E}_wartung_erfasst"})
check("Zähler seit Wartung zurückgesetzt", wait_for("", lambda: float(state(f"sensor.{E}_stunden_seit_wartung")) < 0.01, 30), state(f"sensor.{E}_stunden_seit_wartung"))
call("number", "set_value", {"entity_id": f"number.{E}_wartungsintervall", "value": 0})
check("Intervall zurück auf nicht festgelegt", wait_for("", lambda: state(f"sensor.{E}_wartung_status") == "nicht_festgelegt", 30), "")
ev = influx("SELECT count(value) FROM events.events WHERE type='maintenance'")
check("Wartung in Historie (InfluxDB)", ev and ev[0]["values"][0][1] >= 1, "")

print("== Übertemperatur + Druckanomalie (benötigt Laufphase)")
scenario("uebertemperatur")
wait_running(True, 200)
check("Warnung Temperatur (TEST-Schwelle)", wait_for("", lambda: "Stufe 3" in alerts_text() and "TEST" in alerts_text(), 420, 5), alerts_text().split("\n")[0])
check("Störung Temperatur ≥ 180 °C (TEST)", wait_for("", lambda: state(f"sensor.{E}_status") == "stoerung", 300, 5), state(f"sensor.kompressor_temperatur_stufe_3"))
scenario("druckanomalie")
check("Warnung kein Druckanstieg", wait_for("", lambda: "Kein Druckanstieg" in alerts_text(), 300, 5), "")
scenario("normal")

print("== Persistenz der Zähler (Node-RED-Neustart)")
h1 = float(state(f"sensor.{E}_betriebsstunden")); s1 = int(state(f"sensor.{E}_starts"))
ha.sv("/addons/a0d7b954_nodered/restart", "post")
check("Node-RED nach Neustart wieder verfügbar", wait_for("", lambda: state(f"sensor.{E}_status") not in ("unavailable",) and float(state(f"sensor.{E}_betriebsstunden")) > 0, 180, 5), "")
time.sleep(15)
h2 = float(state(f"sensor.{E}_betriebsstunden")); s2 = int(state(f"sensor.{E}_starts"))
check("Betriebsstunden nach Neustart erhalten", h2 >= h1, f"{h1} → {h2}")
check("Starts nach Neustart erhalten", s2 >= s1, f"{s1} → {s2}")
herk = st(f"sensor.{E}_heartbeat")["attributes"].get("zaehler_herkunft")
check("Zähler aus MQTT (retained) geladen", herk == "MQTT (retained)", herk)

print("== Aufräumen")
call("script", "turn_on", {"entity_id": "script.kompressor_freigabe_entziehen"}); time.sleep(8)
check("Freigabe wieder entzogen", state("input_boolean.kompressor_freigabe_testausgang") == "off")
call("switch", "turn_off", {"entity_id": f"switch.{E}_simulation"})

ok = sum(r[1] for r in results)
print(f"\n== Ergebnis: {ok}/{len(results)} Prüfungen bestanden")
for r in results:
    if not r[1]:
        print("   FEHLER:", r[0], r[2])
