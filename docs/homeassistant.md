# Home Assistant

Stand: 2026-10-19. Instanzname: **Vereinsheim**. Entitäten herstellerneutral `*.kompressor_*`. Alle Änderungen liefen über die HA-APIs (REST, WebSocket, Supervisor). Es wurden **keine** YAML- oder `.storage`-Dateien von Hand bearbeitet.

## Konfiguration (Ist-Zustand)
| Bereich | Inhalt | Quelle im Repository |
|---|---|---|
| Integration MQTT | Mosquitto (Supervisor-Discovery) | – |
| Integration System Monitor | CPU, RAM, Speicher, Last, Systemstart (ausgewählte Entitäten aktiviert) | `docs/infrastructure.md` |
| Gerät „Kompressor“ | MQTT-Entitäten (Discovery aus Node-RED) | `tools/build_nodered.py` → `build_discovery()` |
| Automationen | 3 (Meldungen, Plattform-Ausfall, Plattform ok) | `config/homeassistant/automations.json` |
| Dashboard | **„Kompressorraum“** (Compresio-Dashboard, `/vereinsheim-kompressorraum`, Lovelace, Karte `custom:kompressorraum-card`, Standard-Dashboard) – siehe [dashboard.md](dashboard.md) | `dashboard/` |
| `configuration.yaml` | `recorder: purge_keep_days: 31` | `config/homeassistant/configuration.yaml` |
| Theme | „Kompressorraum“ (Standard, dunkel) | `dashboard/styles/kompressorraum-theme.yaml` |
| Backups | automatisch täglich | `docs/migration.md` |

Einspielen: `python tools/build_ha.py`.

## Entitäten (Auszug)
| Bereich | Entitäten |
|---|---|
| Übersicht | `sensor.kompressor_status` (normal/warnung/stoerung/keine_daten), `_quelle`, `_letzte_aktualisierung`, `_meldungen` (+ Attribute `active`, `text`) |
| Motor | `binary_sensor.kompressor_motor`, `sensor.kompressor_motorstrom`, `_spannung`, `_starts`, `_zyklus_aktuell`, `_zyklus_letzter` |
| Druck | `sensor.kompressor_enddruck`, `_druckanstieg`; optional `_ansaugdruck`, `_zwischendruck_stufe_1/_2`, `_kaskadendruck` (Speicherkaskade) |
| Temperatur | `sensor.kompressor_temperatur_stufe_1/_2/_3` (Zylinder), `sensor.kompressor_temperatur_kuehlspirale_1_2/_2_3`, `sensor.kompressor_raumtemperatur` |
| Temperaturdifferenzen | `sensor.kompressor_delta_t1/_t2/_t3/_t12/_t23` (Template-Helfer, °C, ohne device_class; `tools/setup_templates.py`) |
| Ereignisse | `event.kompressor_ereignis` (Motorstart/-stopp mit Zykluskennwerten, Meldungen, Wartung …) |
| Konfiguration | `number.kompressor_enddruck_soll`, `number.kompressor_druckanstieg_referenz`, `number.kompressor_kaskade_nenndruck` (0 = nicht festgelegt) |
| Ausstattung | `switch.kompressor_ausstattung_<sensor>` je Messstelle (vorhanden ja/nein), bedienbar im Dashboard unter System |
| Wartung | `_betriebsstunden`, `_stunden_seit_wartung`, `_stunden_seit_filterwechsel`, `_wartung_status`, `_filter_status`, `_rest_bis_wartung`, `_rest_bis_filterwechsel`, `number.…_wartungsintervall`, `number.…_filterintervall`, `button.…_wartung_erfasst`, `button.…_filter_erfasst` |
| Meldungen | `binary_sensor.kompressor_meldung_{comm,sensor_data,temperature,pressure,maintenance,database}` |
| Diagnose | `sensor.kompressor_sensorstatus_*`, `_heartbeat`, `_influxdb`, `_db_puffer`, `_nachrichtenrate`, `_ungueltige_nachrichten`, `_duplikate`, `_zeitstempel_korrigiert`, `_datenalter`, `_nodered_laufzeit` |
| Simulation | `switch.kompressor_simulation`, `select.kompressor_simulation_szenario`, `select.kompressor_simulation_raumklima` |

## Hinweise
- Messwerte zeigt HA **nicht verfügbar** an, wenn der Sensorstatus nicht `ok` ist oder Node-RED offline ist.
- Die einzigen schreibenden Entitäten sind Simulation, Wartungsintervalle und Wartungstaster. Keine davon wirkt auf den Kompressor.
- Recorder: Standard (10 Tage). Node-RED drosselt die Aktualisierung der HA-Messwerte auf höchstens alle 10 s bzw. bei deutlicher Änderung. Die volle Auflösung liegt in InfluxDB.
