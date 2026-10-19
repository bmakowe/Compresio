# Architektur

Stand: 2026-10-19 (Entwicklungsumgebung Entwicklungs-VM, Simulation statt Sensorik).

## Ist-Zustand
```
                        ┌──────────────── Home Assistant OS (Entwicklungs-VM → später Raspberry Pi 5) ─────────────────┐
 Sensorknoten (geplant) │                                                                                       │
 oder SIMULATION ──MQTT─┼─► Mosquitto ◄──► Node-RED ──HTTP /write──► InfluxDB 1.x ◄── Grafana (Dashboard)       │
 kompressor/raw/*  │   (core-mosquitto)  │  00 Konfiguration            raw 30 d                             │
                        │        ▲            │  01 Eingang  02 Validierung  agg_1m 1 a  (CQ)                     │
                        │        │            │  03 Aufbereitung 04 Zustand  agg_15m ∞   (CQ)                     │
                        │        │            │  05 Betriebsstunden 06 Wartung events ∞                           │
                        │        │            │  07 Fehler 08 Alarm 09 DB 10 Diagnose 11 Discovery 90 SIM         │
                        │        │            ▼                                                                   │
                        │        └──── kompressor/* (retained) + homeassistant/* (Discovery)                 │
                        │                     ▼                                                                   │
                        │   Home Assistant Core: MQTT-Entitäten „Kompressor“, Dashboard,      Automationen,       │
                        │   System Monitor, Supervisor-Status der Apps, Backups                                    │
                        └──────────────────────────────── Tailscale (Tailnet des Vereins, Serve/HTTPS) ─────────────┘
```

## Verantwortlichkeiten
| Komponente | Aufgabe | Nicht zuständig für |
|---|---|---|
| **Kompressor + eigene Schutzeinrichtungen** | **Sicherheit** (Druckschalter, Sicherheitsventile, Motorschutz, NOT-HALT) | – |
| Sensorknoten / Simulation | Messwerte auf `kompressor/raw/*` | Logik |
| Mosquitto | Transport, retained Zustände, Last Will | – |
| Node-RED | Validierung, Aufbereitung, Zustand, Zähler, Wartung, Fehler, Alarm, DB-Schreiben, Discovery | Steuerung (keine Steuerbefehle) |
| InfluxDB | historische Daten, Downsampling, Bereinigung | – |
| Grafana | Detailauswertung, Langzeit, Diagnose | Bedienung |
| Home Assistant | zentrale Plattform, Bedien-Dashboard, Benachrichtigungen, Systemüberwachung, Backup | Sicherheitsfunktionen |

## Entscheidungen
| # | Entscheidung | Begründung |
|---|---|---|
| E1 | Sensorik → MQTT im Format `raw/<sensor>` (JSON v/ts/src/seq) | herstellerneutral; die Simulation nutzt dieselbe Schnittstelle |
| E2 | Verarbeitung in Node-RED, HA-Entitäten per MQTT Discovery | modular, Logik an einem Ort, HA bleibt ohne Templates |
| E3 | InfluxDB 1.x (vorhandene App) mit RP und CQ | erfüllt die Anforderungen, aarch64, im HA-Backup enthalten |
| E4 | Node-RED schreibt per HTTP-Line-Protocol mit eigenem Puffer | Wiederholung bei Ausfall ohne Datenverlust, Zeitstempel bleiben korrekt |
| E5 | Zähler persistent als retained MQTT, Fallback aus InfluxDB | robust bei Neustart, ohne Dateisystemzugriff, wird mitmigriert |
| E6 | Zähler je Datenquelle getrennt (`real`/`sim`) | Simulation verfälscht keine echten Betriebsstunden |
| E7 | Konfiguration als Code (`tools/build_*.py`) | reproduzierbar auf dem Pi, versioniert, keine Klickkonfiguration |
| E8 | Alle Schwellwerte zentral als TEST-Werte in Node-RED Tab 00 | eindeutig gekennzeichnet, später an einer Stelle zu ersetzen |
| E9 | Interne Adressen nur als App-Hostnamen, extern nur MagicDNS | unabhängig von VM, IP und Hardware |

## Datenfluss
1. Messwert → `kompressor/raw/<sensor>`
2. Node-RED validiert (Bereich, Zeitstempel, Duplikat) → `global.latest`
3. aufbereitete Werte (retained) → HA-Entitäten; InfluxDB-Punkte → Puffer → `raw`
4. CQs → `agg_1m`, `agg_15m`
5. Zustand, Zähler, Wartung, Prüfungen (5–10 s) → Meldungen → `status`/`alerts` → HA-Banner und Benachrichtigung; Ereignisse → `events`

## Benennung
Das Produkt heißt **Compresio** (Untertitel „Smart Compressor Monitoring & Diagnostics“, Logo und Farben: [BRANDING.md](../assets/branding/BRANDING.md)). „Kompressor“ bezeichnet die Maschine, „Kompressorraum“ den Raum bzw. Standort. Deshalb heißt der Seitenleisteneintrag in Home Assistant „Kompressorraum“.

Technische Kennungen verwenden den Fachbegriff und bleiben stabil, weil Verläufe, Statistiken und Konfigurationen darauf aufbauen:

| Kennung | Wert |
|---|---|
| Entitäten | `sensor.kompressor_*`, `binary_sensor.kompressor_*`, `event.kompressor_ereignis`, Skripte und Helfer `*kompressor*` |
| MQTT | Topics `kompressor/…`, Discovery-Knoten und Geräte-ID `kompressor`, `unique_id`s |
| InfluxDB | Datenbank, Retention Policies, Continuous Queries, Benutzer `kompressor-*` |
| Grafana | UIDs `kompressorraum` (Dashboard) und `kompressor-influx` (Datenquelle) |
| Node-RED | Node-IDs (Präfix `krm`) |
| Dashboard | Karte `custom:kompressorraum-card`, Bundle `kompressorraum.js`, Pfad `/local/kompressorraum/`, URL `/vereinsheim-kompressorraum`, Theme „Kompressorraum“ |

Entitäten, MQTT-Topics und die Datenbank nicht umbenennen: Verläufe und Statistiken würden abreißen.
