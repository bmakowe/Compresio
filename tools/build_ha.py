"""Home-Assistant-Automationen von Compresio (Meldungen, Plattform-Überwachung).

  python tools/build_ha.py            # exportieren + per API einspielen
  python tools/build_ha.py --export   # nur config/homeassistant/*.json schreiben

Einspielen ausschließlich über die HA-Konfigurations-API (REST/WebSocket), keine YAML-Dateien.
"""
import asyncio
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
E = "kompressor"
GRAFANA = "/hassio/ingress/a0d7b954_grafana"


def s(x):
    return f"sensor.{E}_{x}"


# ------------------------------------------------------------------ Automationen
AUTOMATIONS = {
    "kompressor_meldungen": {
        "alias": "Kompressor: Meldungen anzeigen",
        "description": "Zeigt aktive Meldungen (Warnungen/Störungen aus Node-RED) als HA-Benachrichtigung an und "
                       "entfernt sie, sobald keine Meldung mehr aktiv ist. Weitere Kanäle (Mobile App, E-Mail) "
                       "können hier später ergänzt werden. Keine Eingriffe in den Kompressor.",
        "mode": "queued", "max": 10,
        "triggers": [{"trigger": "state", "entity_id": s("meldungen"), "attribute": "text", "id": "text"},
                     {"trigger": "state", "entity_id": s("meldungen"), "id": "anzahl"}],
        "conditions": [{"condition": "not", "conditions": [
            {"condition": "state", "entity_id": s("meldungen"), "state": ["unavailable", "unknown"]}]}],
        "actions": [{"if": [{"condition": "numeric_state", "entity_id": s("meldungen"), "below": 1}],
                     "then": [{"action": "persistent_notification.dismiss",
                               "data": {"notification_id": "kompressor_meldungen"}}],
                     "else": [{"action": "persistent_notification.create",
                               "data": {"notification_id": "kompressor_meldungen",
                                        "title": "Kompressor: {{ states('" + s("meldungen") + "') }} aktive Meldung(en)",
                                        "message": "{{ state_attr('" + s("meldungen") + "', 'text') }}\n\n"
                                                   "Datenquelle: {{ states('" + s("quelle") + "') }} – "
                                                   "Schwellwerte sind TEST-Werte."}}]}],
    },
    "kompressor_plattform": {
        "alias": "Kompressor: Plattform-Ausfall melden",
        "description": "Meldet, wenn eine Komponente der Datenerfassung (MQTT, Node-RED, InfluxDB) länger als "
                       "2 Minuten nicht läuft oder die Verarbeitung offline ist (Last Will).",
        "mode": "parallel", "max": 10,
        "triggers": [
            {"trigger": "state", "entity_id": ["binary_sensor.mosquitto_broker_aktiv", "binary_sensor.node_red_aktiv",
                                              "binary_sensor.influxdb_v1_aktiv"], "to": "off", "for": "00:02:00", "id": "app"},
            {"trigger": "state", "entity_id": s("status"), "to": "unavailable", "for": "00:02:00", "id": "nodered"},
            {"trigger": "state", "entity_id": s("influxdb"), "to": ["schreibfehler", "nicht_erreichbar"], "for": "00:02:00", "id": "influx"}],
        "actions": [{"action": "persistent_notification.create",
                     "data": {"notification_id": "kompressor_plattform_{{ trigger.id }}",
                              "title": "Kompressor: Datenerfassung gestört",
                              "message": "{{ trigger.to_state.name }} ist seit 2 Minuten „{{ trigger.to_state.state }}“."}}],
    },
    "kompressor_plattform_ok": {
        "alias": "Kompressor: Plattform wieder in Ordnung",
        "description": "Entfernt die Ausfallmeldung, sobald die Komponente wieder läuft.",
        "mode": "parallel", "max": 10,
        "triggers": [
            {"trigger": "state", "entity_id": ["binary_sensor.mosquitto_broker_aktiv", "binary_sensor.node_red_aktiv",
                                              "binary_sensor.influxdb_v1_aktiv"], "to": "on", "id": "app"},
            {"trigger": "state", "entity_id": s("status"), "from": "unavailable", "id": "nodered"},
            {"trigger": "state", "entity_id": s("influxdb"), "to": "ok", "id": "influx"}],
        "actions": [{"action": "persistent_notification.dismiss",
                     "data": {"notification_id": "kompressor_plattform_{{ trigger.id }}"}}],
    },
}


LEGACY_AUTOMATIONS = []
LEGACY_DASHBOARDS = []


def export():
    d = os.path.join(ROOT, "config/homeassistant")
    os.makedirs(d, exist_ok=True)
    json.dump(AUTOMATIONS, open(os.path.join(d, "automations.json"), "w"), ensure_ascii=False, indent=1)
    print("exportiert: config/homeassistant/automations.json")


async def deploy():
    import ha
    for aid in LEGACY_AUTOMATIONS:      # zuerst entfernen, damit die neuen Entitäts-IDs frei sind
        try:
            ha.rest("DELETE", f"/api/config/automation/config/{aid}")
            print("alte Automation entfernt:", aid)
        except RuntimeError:
            pass
    import time
    time.sleep(3)
    for aid, cfg in AUTOMATIONS.items():
        print("Automation", aid, ha.rest("POST", f"/api/config/automation/config/{aid}", cfg))
    async with ha.WS() as w:
        for b in await w.cmd("lovelace/dashboards/list"):
            if b["url_path"] in LEGACY_DASHBOARDS:
                await w.cmd("lovelace/dashboards/delete", dashboard_id=b["id"])
                print("altes Dashboard entfernt:", b["url_path"])


if __name__ == "__main__":
    export()
    if "--export" not in sys.argv:
        asyncio.run(deploy())
