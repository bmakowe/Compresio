# Node-RED

App `a0d7b954_nodered` 22.1.0 (Node-RED 5.0.7). **Korrektur:** Die App stand vorher auf `error`, weil `ssl: true` ohne Zertifikate gesetzt war. Jetzt gilt `ssl: false`, der Zugriff läuft über HA-Ingress bzw. Tailscale-HTTPS. Zusätzliches Paket: `node-red-contrib-influxdb` (über die App-Option `npm_packages`).

## Quelle und Deployment
Die Flows werden **erzeugt**, nicht von Hand gepflegt:
```bash
python tools/build_nodered.py            # erzeugen + deployen (Credentials aus .env)
python tools/build_nodered.py --export   # nur config/nodered/flows.json schreiben
```
`config/nodered/flows.json` ist ein Export **ohne Credentials**. Alle IDs beginnen mit `krm`. Ein erneutes Deployment ersetzt diese Knoten, fremde Knoten (z. B. der HA-Server-Knoten) bleiben erhalten. Änderungen also immer in `tools/build_nodered.py` vornehmen und neu deployen.

## Tabs
| Tab | Aufgabe |
|---|---|
| 00 Konfiguration | `global.cfg`: Sensoren, Messbereiche, **TEST-Schwellwerte**, Timeouts; **Ausstattung** (`global.equipment`, Schalter je Sensor, Voreinstellung `default_on`) |
| 01 MQTT-Eingang | `kompressor/raw/+` empfangen, Sensorknoten-Status (LWT), zentraler MQTT-Ausgang |
| 02 Datenvalidierung | Typ und Messbereich, Zeitstempel (fehlend/Zukunft → Empfangszeit, > 1 h alt → verwerfen), Duplikate (Zeitstempel/`seq`) |
| 03 Datenaufbereitung | letzter Wert je Sensor, Änderungsraten (60 s), aufbereitete MQTT-Werte, InfluxDB-Punkte |
| 04 Betriebszustand | Motor läuft/steht aus dem Motorstrom (Hysterese 2,0/1,0 A, 4 s Entprellung, TEST), Start/Stopp-Ereignisse |
| 05 Betriebsstunden | Zähler je Quelle `real`/`sim`: gesamt, seit Wartung, seit Filterwechsel, Starts, Zyklen |
| 06 Wartungsmanagement | Intervalle aus HA (0 = nicht festgelegt), Status ok/bald_faellig/faellig, Erfassung von Wartung und Filterwechsel |
| 07 Fehlererkennung | alle 5 s: Sensorstatus (nicht vorhandene Sensoren: `nicht_vorhanden`, keine Meldung), Kommunikation, Grenzwerte (TEST), Verläufe, Wartung, DB |
| 08 Alarmierung | aktive Meldungen mit Beginnzeit, Gesamtstatus, Ereignisprotokoll |
| 09 Datenbankanbindung | Puffer (50 000 Zeilen) → `POST /write` in Blöcken, Wiederholung bei Fehlern, Ping |
| 10 Systemdiagnose | Heartbeat, DB-Status, Raten, Fehlerzähler, Datenalter |
| 11 HA-Discovery | Entitäten per MQTT Discovery (u. a. sechs Temperaturen, Ereignis-Entität) |
| 12 Ereignisse (HA) | Ereigniszeilen → `kompressor/event` → `event.kompressor_ereignis` (Ereignisansicht, Zyklusdiagnose) |
| **90 SIMULATION** | synthetischer Sensorknoten, siehe [simulation.md](simulation.md) |

## Robustheit
| Situation | Behandlung |
|---|---|
| Fehlende Sensordaten | Nach `stale_s` (30 s, Spannung 60 s) gilt der Sensor als `keine_daten`: HA-Entität nicht verfügbar, Warnung, falls andere Sensoren noch liefern |
| Ungültige Messwerte | werden verworfen; Sensor 60 s lang `ungueltig`, Warnung mit Grund |
| Verbindungsabbruch Sensorik | Last Will → Störung „Sensorknoten offline“. Bleiben die Daten aus, obwohl der Knoten online ist, folgt nach 60 s die Störung „Datenübertragung ausgefallen“ |
| Verbindungsabbruch Node-RED ↔ Broker | Last Will `availability=offline`, alle HA-Entitäten nicht verfügbar, HA-Automation meldet nach 2 min |
| InfluxDB nicht erreichbar | Daten bleiben im Puffer und werden nachgeschrieben (Zeitstempel bleiben erhalten). Nach 60 s Warnung `influx_down` |
| Neustart Node-RED | Zähler aus retained MQTT, sonst aus InfluxDB (letzter `counter`-Wert), sonst neu initialisiert (Herkunft in `system/attr`). Die Lücke wird nicht als Laufzeit gezählt |
| Doppelte Nachrichten | Zeitstempel ≤ letzter oder gleiche `seq` → verworfen und gezählt |
| Unplausible Zeitstempel | Zukunft > 30 s → Empfangszeit (gezählt); älter als 1 h → verworfen |
| Simulation und echte Daten gleichzeitig | Warnung `source_conflict`, die Zähler bleiben getrennt |

Node-RED erzeugt **keine** Steuerbefehle. Ausgehende Nachrichten gehen nur an `kompressor/*` (Zustände) und an `homeassistant/*` (Discovery).

## TEST-Schwellwerte (Tab 00)
| Parameter | Wert | Bedeutung |
|---|---|---|
| `running.on_a` / `off_a` | 2,0 / 1,0 A | Laufzustandserkennung |
| `alerts.temp_warn_c` / `temp_crit_c` | 150 / 180 °C | Temperatur-Warnung/-Störung |
| `alerts.temp_rate_warn_c_min` | 20 °C/min | ungewöhnlicher Anstieg |
| `alerts.pressure_warn_bar` / `crit_bar` | 220 / 240 bar | Enddruck |
| `alerts.no_rise_after_min` / `no_rise_rate_bar_min` | 3 min / 0,5 bar/min | kein Druckanstieg |
| `sensors.*.min/max` | Messbereich | nur Plausibilität (Temperaturen −40…300 °C, Raum −30…60 °C) |
| `cycle.min_duration_s` / `min_delta_bar` | 120 s / 50 bar | „vergleichbarer“ Zyklus für Druckanstieg |

Für Kühlspiralen T12/T23 und Raum TR gibt es **keine** Meldeschwellen (Vorgabe: keine Grenzwerte ohne Validierung).

**Das sind keine Herstellerwerte.** Sie werden ersetzt, sobald die Herstellerunterlagen geprüft sind ([compressor.md](compressor.md)).
