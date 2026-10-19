"""Betriebsfreigabe des Kompressors über einen Home-Assistant-Ausgang (bewusst getrennt von der Diagnose).

  python tools/build_control.py            # Helfer, Skripte, Automationen anlegen/aktualisieren
  python tools/build_control.py --export   # nur config/homeassistant/control.json schreiben

Prinzip (siehe docs/steuerung.md):
  Ausgang (z. B. IKEA-/Shelly-Steckdose, Relais) → Spule eines Hilfsschützes → Freigabekontakt im Steuerstromkreis
  der Maschine, in Reihe mit den vorhandenen Stopp-/NOT-HALT-/Schutzkontakten. Nichts wird überbrückt.
  Home Assistant ist KEINE Sicherheitsebene: NOT-HALT, Druckschalter, Sicherheitsventile und Motorschutz
  arbeiten unabhängig und haben Vorrang.

Welcher Ausgang geschaltet wird, steht zentral im Helfer input_text.kompressor_freigabe_ausgang
(Standard: virtueller Testausgang input_boolean.kompressor_freigabe_testausgang – keine Hardware).
"""
import asyncio
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

OUT_HELPER = "input_text.kompressor_freigabe_ausgang"
TEST_OUTPUT = "input_boolean.kompressor_freigabe_testausgang"
STATUS = "sensor.kompressor_status"
MOTOR = "binary_sensor.kompressor_motor"
TOPIC = "kompressor/control/release"          # Zustand der Freigabe → Node-RED (Protokoll, Simulation)
AUSGANG = "{{ states('" + OUT_HELPER + "') | trim }}"
VALID = "{{ ausgang | length > 3 and '.' in ausgang and states(ausgang) not in ['unavailable', 'unknown'] }}"

HELPERS = {
    "input_boolean": [{"name": "Kompressor Freigabe-Testausgang", "icon": "mdi:electric-switch", "id_hint": "kompressor_freigabe_testausgang"}],
    "input_text": [{"name": "Kompressor Freigabe-Ausgang", "icon": "mdi:electric-switch-closed", "min": 0, "max": 100, "mode": "text",
                    "initial": TEST_OUTPUT, "id_hint": "kompressor_freigabe_ausgang"}],
}

PUBLISH = {"action": "mqtt.publish", "data": {"topic": TOPIC, "retain": True,
           "payload": "{{ {'zustand': states(ausgang), 'ausgang': ausgang, 'aktion': aktion, 'zeit': now().isoformat()} | to_json }}"}}

SCRIPTS = {
    "kompressor_freigabe_erteilen": {
        "alias": "Kompressor: Betriebsfreigabe erteilen",
        "icon": "mdi:power-plug",
        "description": "Schaltet den Freigabe-Ausgang ein (Hilfsschütz → Freigabekontakt im Steuerstromkreis). "
                       "Gesperrt bei aktiver Störung oder nicht erreichbarem Ausgang. Prüft die Rückmeldung des Ausgangs.",
        "mode": "single",
        "sequence": [
            {"variables": {"ausgang": AUSGANG, "aktion": "freigabe"}},
            {"if": [{"condition": "template", "value_template": "{{ not (" + VALID[3:-3] + ") }}"}],
             "then": [{"action": "persistent_notification.create", "data": {"notification_id": "kompressor_freigabe",
                       "title": "Kompressor: Freigabe nicht möglich", "message": "Freigabe-Ausgang „{{ ausgang }}“ ist nicht konfiguriert oder nicht erreichbar."}},
                      {"stop": "Ausgang nicht verfügbar", "error": True}]},
            {"if": [{"condition": "state", "entity_id": STATUS, "state": "stoerung"}],
             "then": [{"action": "persistent_notification.create", "data": {"notification_id": "kompressor_freigabe",
                       "title": "Kompressor: Freigabe gesperrt", "message": "Es ist eine Störung aktiv. Bitte Ursache vor Ort prüfen; die Freigabe ist erst nach Behebung möglich."}},
                      {"stop": "Störung aktiv", "error": True}]},
            {"action": "homeassistant.turn_on", "target": {"entity_id": "{{ ausgang }}"}},
            {"wait_template": "{{ is_state(ausgang, 'on') }}", "timeout": "00:00:10", "continue_on_timeout": True},
            {"if": [{"condition": "template", "value_template": "{{ not is_state(ausgang, 'on') }}"}],
             "then": [{"action": "persistent_notification.create", "data": {"notification_id": "kompressor_freigabe",
                       "title": "Kompressor: Ausgang reagiert nicht", "message": "„{{ ausgang }}“ hat nach 10 s nicht eingeschaltet. Freigabe NICHT erteilt."}},
                      {"variables": {"aktion": "freigabe_fehlgeschlagen"}}]},
            PUBLISH,
            {"action": "persistent_notification.dismiss", "data": {"notification_id": "kompressor_freigabe"}},
        ],
    },
    "kompressor_freigabe_entziehen": {
        "alias": "Kompressor: Betriebsfreigabe entziehen",
        "icon": "mdi:power-plug-off",
        "description": "Schaltet den Freigabe-Ausgang aus. Immer erlaubt. Ersetzt NICHT den NOT-HALT an der Maschine.",
        "mode": "queued",
        "sequence": [
            {"variables": {"ausgang": AUSGANG, "aktion": "sperre"}},
            {"action": "homeassistant.turn_off", "target": {"entity_id": "{{ ausgang }}"}, "continue_on_error": True},
            {"wait_template": "{{ is_state(ausgang, 'off') }}", "timeout": "00:00:10", "continue_on_timeout": True},
            {"if": [{"condition": "template", "value_template": "{{ not is_state(ausgang, 'off') }}"}],
             "then": [{"action": "persistent_notification.create", "data": {"notification_id": "kompressor_freigabe",
                       "title": "Kompressor: Sperren fehlgeschlagen!", "message": "„{{ ausgang }}“ hat nach 10 s nicht ausgeschaltet. Maschine vor Ort stoppen (Stopp/NOT-HALT)!"}},
                      {"variables": {"aktion": "sperre_fehlgeschlagen"}}]},
            PUBLISH,
        ],
    },
}

AUTOMATIONS = {
    "kompressor_freigabe_melden": {
        "alias": "Kompressor: Freigabe-Zustand melden",
        "description": "Meldet jede Änderung des Freigabe-Ausgangs (auch vor Ort/über die App geschaltet) an Node-RED: Protokoll und Simulation.",
        "mode": "queued", "max": 10,
        "triggers": [
            {"trigger": "template", "value_template": "{{ is_state(states('" + OUT_HELPER + "') | trim, 'on') }}", "id": "ein"},
            {"trigger": "template", "value_template": "{{ is_state(states('" + OUT_HELPER + "') | trim, 'off') }}", "id": "aus"},
            {"trigger": "state", "entity_id": OUT_HELPER, "id": "ausgang_geaendert"},
            {"trigger": "homeassistant", "event": "start", "id": "start"},
        ],
        "actions": [{"variables": {"ausgang": AUSGANG, "aktion": "{{ 'zustand_' ~ trigger.id }}"}}, PUBLISH],
    },
    "kompressor_lauf_ohne_freigabe": {
        "alias": "Kompressor: Motor läuft ohne Freigabe",
        "description": "Warnt, wenn der Motor länger als 30 s läuft, obwohl der Freigabe-Ausgang aus ist (Verdrahtung/Ausgang prüfen).",
        "mode": "single",
        "triggers": [{"trigger": "state", "entity_id": MOTOR, "to": "on", "for": "00:00:30"}],
        "conditions": [{"condition": "template", "value_template": "{{ is_state(states('" + OUT_HELPER + "') | trim, 'off') }}"}],
        "actions": [{"action": "persistent_notification.create", "data": {"notification_id": "kompressor_lauf_ohne_freigabe",
                     "title": "Kompressor: Motor läuft ohne Freigabe",
                     "message": "Der Motor läuft, obwohl die Betriebsfreigabe aus ist. Verdrahtung des Hilfsschützes und Ausgang prüfen."}}],
    },
    "kompressor_freigabe_bei_stoerung_entziehen": {
        "alias": "Kompressor: Freigabe bei Störung entziehen (erst nach Validierung aktivieren)",
        "description": "DEAKTIVIERT angelegt: Die Störschwellen sind noch TEST-Werte. Nach Validierung der Grenzwerte "
                       "aktivieren – dann wird bei jeder Störung (≥ 10 s) die Freigabe entzogen.",
        "mode": "single",
        "triggers": [{"trigger": "state", "entity_id": STATUS, "to": "stoerung", "for": "00:00:10"}],
        "conditions": [{"condition": "template", "value_template": "{{ is_state(states('" + OUT_HELPER + "') | trim, 'on') }}"}],
        "actions": [{"action": "script.kompressor_freigabe_entziehen"},
                    {"action": "persistent_notification.create", "data": {"notification_id": "kompressor_freigabe",
                     "title": "Kompressor: Freigabe wegen Störung entzogen",
                     "message": "{{ state_attr('sensor.kompressor_meldungen', 'text') }}"}}],
    },
}
DISABLED_BY_DEFAULT = {"kompressor_freigabe_bei_stoerung_entziehen"}


def export():
    d = os.path.join(ROOT, "config/homeassistant")
    os.makedirs(d, exist_ok=True)
    json.dump({"helpers": HELPERS, "scripts": SCRIPTS, "automations": AUTOMATIONS}, open(os.path.join(d, "control.json"), "w"),
              ensure_ascii=False, indent=1)
    print("exportiert: config/homeassistant/control.json")


async def deploy():
    import ha
    async with ha.WS() as w:
        for domain, items in HELPERS.items():
            existing = {x.get("name") for x in await w.cmd(f"{domain}/list")}
            for h in items:
                if h["name"] in existing:
                    print("Helfer vorhanden:", h["name"])
                    continue
                data = {k: v for k, v in h.items() if k != "id_hint"}
                res = await w.cmd(f"{domain}/create", **data)
                print("Helfer angelegt:", domain, res.get("id"))
        # Entitäts-IDs der Helfer festlegen
        reg = await w.cmd("config/entity_registry/list")
        for domain, items in HELPERS.items():
            for h in items:
                target = f"{domain}.{h['id_hint']}"
                cur = [e for e in reg if e["entity_id"].startswith(domain + ".") and e.get("original_name") in (h["name"], None)
                       and e["platform"] == domain and e["entity_id"] != target and h["id_hint"].split("_")[-1] in e["entity_id"]]
                for e in cur[:1]:
                    await w.cmd("config/entity_registry/update", entity_id=e["entity_id"], new_entity_id=target)
                    print("Entität:", e["entity_id"], "→", target)
    for sid, cfg in SCRIPTS.items():
        print("Skript", sid, ha.rest("POST", f"/api/config/script/config/{sid}", cfg))
    for aid, cfg in AUTOMATIONS.items():
        print("Automation", aid, ha.rest("POST", f"/api/config/automation/config/{aid}", cfg))
    import time
    time.sleep(3)
    states = {s["entity_id"]: s for s in ha.rest("GET", "/api/states")}
    for aid in DISABLED_BY_DEFAULT:
        ent = [e for e, s in states.items() if e.startswith("automation.") and s["attributes"].get("id") == aid]
        for e in ent:
            if states[e]["state"] == "on" and "--keep-enabled" not in sys.argv:
                ha.rest("POST", "/api/services/automation/turn_off", {"entity_id": e})
                print("deaktiviert (bis Validierung):", e)
    out = states.get(OUT_HELPER, {}).get("state")
    if not out or out in ("unknown", ""):
        ha.rest("POST", "/api/services/input_text/set_value", {"entity_id": OUT_HELPER, "value": TEST_OUTPUT})
    print("Freigabe-Ausgang:", ha.rest("GET", f"/api/states/{OUT_HELPER}")["state"])


if __name__ == "__main__":
    export()
    if "--export" not in sys.argv:
        asyncio.run(deploy())
