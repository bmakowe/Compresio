"""Legt die Template-Sensoren für die Temperaturdifferenzen zur Raumtemperatur an (idempotent).

ΔT1 = T1 − TR, ΔT2 = T2 − TR, ΔT3 = T3 − TR, ΔT12 = T12 − TR, ΔT23 = T23 − TR  (Einheit °C)
Anlage über den Konfigurationsfluss der Template-Integration (wie in der HA-Oberfläche: Helfer → Template → Sensor).
Bewusst ohne device_class „temperature“: Differenzen dürfen nicht wie absolute Temperaturen umgerechnet werden.
Diagnoseindikatoren – keine direkten Messwerte der Kühlleistung.
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
import ha  # noqa: E402

TR = "sensor.kompressor_raumtemperatur"
DEF = [("t1", "ΔT1 Zylinder Stufe 1 – Raum", "sensor.kompressor_temperatur_stufe_1"),
       ("t2", "ΔT2 Zylinder Stufe 2 – Raum", "sensor.kompressor_temperatur_stufe_2"),
       ("t3", "ΔT3 Zylinder Stufe 3 – Raum", "sensor.kompressor_temperatur_stufe_3"),
       ("t12", "ΔT12 Kühlspirale 1→2 – Raum", "sensor.kompressor_temperatur_kuehlspirale_1_2"),
       ("t23", "ΔT23 Kühlspirale 2→3 – Raum", "sensor.kompressor_temperatur_kuehlspirale_2_3")]


def template(src):
    return ("{% set t = states('" + src + "') | float(none) %}{% set r = states('" + TR + "') | float(none) %}"
            "{{ (t - r) | round(1) if t is not none and r is not none else none }}")


async def main():
    async with ha.WS() as w:
        dev = [d for d in await w.cmd("config/device_registry/list") if any(i[1] == "kompressor" for i in d["identifiers"])][0]
        have = {e["entity_id"] for e in await w.cmd("config/entity_registry/list")}
        for key, name, src in DEF:
            target = f"sensor.kompressor_delta_{key}"
            if target in have:
                print("vorhanden:", target)
                continue
            r = ha.rest("POST", "/api/config/config_entries/flow", {"handler": "template"})
            ha.rest("POST", f"/api/config/config_entries/flow/{r['flow_id']}", {"next_step_id": "sensor"})
            res = ha.rest("POST", f"/api/config/config_entries/flow/{r['flow_id']}",
                          {"name": name, "state": template(src), "unit_of_measurement": "°C", "state_class": "measurement", "device_id": dev["id"]})
            eid = res["result"]["entry_id"]
            ent = [e for e in await w.cmd("config/entity_registry/list") if e.get("config_entry_id") == eid][0]
            await w.cmd("config/entity_registry/update", entity_id=ent["entity_id"], new_entity_id=target, icon="mdi:thermometer-chevron-up")
            print("angelegt:", target)


if __name__ == "__main__":
    asyncio.run(main())
