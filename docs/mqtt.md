# MQTT

## Broker (Ist-Zustand)
| Punkt | Wert |
|---|---|
| App | Mosquitto broker (`core_mosquitto`) 7.1.1, aarch64/amd64 |
| Start | `boot: auto`, Watchdog an. Retained Messages werden persistent in `/data` gespeichert (Standard der App) |
| Ports | **nur 1883/tcp** (MQTT ohne TLS). 1884 (WebSocket) sowie 8883/8884 (TLS) sind deaktiviert |
| Anonym | nicht erlaubt |
| Benutzer | `kompressor-nodered` (Node-RED), `kompressor-sensor` (künftige Sensorknoten, Tests). HA nutzt den internen Benutzer der App (Discovery über den Supervisor) |
| Passwörter | in `.env` (nicht im Repository) |
| HA-Integration | MQTT, eingerichtet über Supervisor-Discovery |
| Erreichbarkeit | im Container-Netz `core-mosquitto:1883`, im LAN/Tailnet `vereinsheim.<tailnet>.ts.net:1883` |

## Topic-Struktur

```
kompressor/
├─ raw/<sensor>            Rohdaten der Sensorik/Simulation (JSON, nicht retained)
├─ raw/status              online/offline – Last Will des Sensorknotens (retained)
├─ availability            online/offline – Birth/Last Will von Node-RED (retained)
├─ status                  normal | warnung | stoerung | keine_daten (retained)
├─ status/attr             JSON-Attribute zum Status
├─ source                  real | simulation | keine
├─ last_update             ISO-Zeitstempel der letzten Messung
├─ motor/running           ON/OFF
├─ motor/current           A
├─ motor/starts            Anzahl
├─ supply/voltage          V
├─ pressure/final          bar
├─ pressure/cascade        bar (Speicherkaskade, Gesamtdruck – optional)
├─ pressure/suction|stage1|stage2  bar (Ansaug-, Zwischendrücke – optional)
├─ pressure/rate           bar/min
├─ temperature/stage1..3   °C  (T1, T2, T3 – Zylinder)
├─ temperature/coil12|coil23 °C (T12, T23 – Kühlspiralen)
├─ temperature/room        °C  (TR – Raum)
├─ operating_hours         h (Anzeigequelle)
├─ counters                JSON: Zähler je Quelle (Persistenz!)
├─ cycle/current_minutes   laufender Zyklus
├─ cycle/last_minutes      letzter Zyklus
├─ maintenance/status | filter_status | hours_since | filter_hours_since | remaining_h | filter_remaining_h | attr
├─ maintenance/config/<interval_h|filter_interval_h|pressure_setpoint_bar|rate_reference_bar_min|cascade_nominal_bar>[/set]
├─ maintenance/<service_done|filter_done>/set
├─ alerts                  JSON: aktive Meldungen
├─ alert/<kategorie>       ON/OFF: comm, sensor_data, temperature, pressure, maintenance, database
├─ sensor_status/<sensor>  ok | keine_daten | ungueltig | nicht_vorhanden
├─ equipment/<sensor>[/set]  ON/OFF: Ausstattung – Sensor vorhanden (retained)
├─ system/*                heartbeat, influxdb, db_buffer, rx_per_min, invalid_total, duplicates_total,
│                          ts_corrected_total, data_age_s, uptime_h, attr
├─ event                   JSON-Ereignisse → event.kompressor_ereignis
├─ maintenance/log/add     Wartungseintrag aus dem Dashboard
└─ sim/<enabled|scenario|room>[/set]   Steuerung der SIMULATION
```
Alle aufbereiteten Werte sind **retained**. Nach einem Neustart von HA oder Node-RED ist der letzte Zustand also sofort wieder da. Veraltete Werte erkennt man am Sensorstatus: Ist er nicht `ok`, zeigt HA die Entität als nicht verfügbar an.

## Schnittstelle für die künftige Sensorik
Der Sensorknoten (z. B. ESP32 oder Shelly mit eigener Firmware) muss nur Folgendes tun:

1. Mit Benutzer `kompressor-sensor` verbinden. Last Will: `kompressor/raw/status` = `offline`, retained. Nach dem Verbinden `online` publizieren, ebenfalls retained.
2. Je Messgröße auf `kompressor/raw/<sensor>` publizieren:
   ```json
   {"v": 187.4, "ts": 1792359845000, "src": "real", "seq": 4711}
   ```
   `ts` ist optional (Unix-Zeit in ms, sonst wird die Empfangszeit genommen). `seq` ist optional und dient der Duplikaterkennung.
3. Sensor-IDs: `pressure_final`, `temp_stage1`, `temp_coil12`, `temp_stage2`, `temp_coil23`, `temp_stage3`, `temp_room`, `motor_current`, `supply_voltage`, optional `pressure_suction`, `pressure_stage1`, `pressure_stage2`, `pressure_cascade`.
   Welche Sensoren vorhanden sind, legt die Ausstattung fest (`equipment/<sensor>`, im Dashboard unter System). Nicht vorhandene Sensoren erzeugen keine Meldungen.
   Neue Messgrößen: Eintrag in `cfg.sensors` (Node-RED, Tab 00) und Discovery in `tools/build_nodered.py` ergänzen.

## MQTT Discovery
Node-RED (Tab 11) publiziert 49 Entitäten unter `homeassistant/<komponente>/kompressor/<objekt>/config`, alle retained. Das passiert beim Start und nach jedem HA-Neustart (`homeassistant/status`). Alle Entitäten gehören zum Gerät **„Kompressor“**.

Verfügbarkeit: Jede Entität hängt an `kompressor/availability` (Node-RED). Messwerte hängen zusätzlich an `sensor_status/<sensor>` (`availability_mode: all`).

## Wiederverbindung
- Node-RED: `autoConnect`, Keepalive 30 s, QoS 1. Bei Verbindungsverlust setzt der Broker `availability` = `offline` (Last Will), HA zeigt die Entitäten dann als nicht verfügbar an.
- HA: Die MQTT-Integration verbindet sich automatisch neu. Nach einem Neustart von HA publiziert Node-RED die Discovery erneut.
