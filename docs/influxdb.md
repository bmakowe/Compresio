# InfluxDB

## Entscheidung: InfluxDB 1.x (vorhandene App) beibehalten
| Kriterium | Bewertung |
|---|---|
| Eignung | Retention Policies und Continuous Queries leisten genau das geforderte Downsampling und die automatische Bereinigung |
| ARM64 | App `a0d7b954_influxdb` 6.0.0 unterstützt `aarch64` (Raspberry Pi 5) |
| Ressourcen | gering. Bei rund 3 Messwerten pro Sekunde bleibt die Last auch auf dem Pi niedrig |
| Backup | vollständig im HA-Backup enthalten, keine Sonderbehandlung nötig |
| Alternative v2/v3 | keine offizielle HA-App mit vergleichbarer Integration; ein Umstieg brächte nur Aufwand |

## Ist-Zustand
| Objekt | Wert |
|---|---|
| Datenbank | `kompressor` |
| Erreichbar | `http://a0d7b954-influxdb:8086` (intern), Port 8086 auch im LAN/Tailnet, Authentifizierung ist an |
| Benutzer | `kompressor-nodered` (ALL auf die DB, schreibt), `kompressor-grafana` (READ). Die App-internen Benutzer `chronograf` und `kapacitor` bleiben unverändert |
| Schema | `config/influxdb/schema.influxql`, anlegen mit `python tools/setup_influx.py` (idempotent) |

### Retention Policies
| RP | Dauer | Shard | Inhalt |
|---|---|---|---|
| `raw` (DEFAULT) | **30 Tage** | 1 Tag | Rohdaten, Zähler, Systemwerte |
| `agg_1m` | **1 Jahr** | 7 Tage | Minutenaggregate (`mean_*`, `min_*`, `max_*`, `count_*`) |
| `agg_15m` | **unbegrenzt** | 26 Wochen | 15-Minuten-Aggregate |
| `events` | unbegrenzt | 26 Wochen | Ereignisse: Start/Stopp, Zyklen, Meldungen, Wartungen, Simulation |

`autogen` (unbegrenzt) wurde gelöscht. Es gibt damit keinen Speicherort, an dem Rohdaten unbegrenzt liegen bleiben.

### Continuous Queries
- `cq_1m`: alle 1 min, Fenster 10 min (`RESAMPLE … FOR 10m` fängt verspätete Daten auf), Ergebnis in `agg_1m`
- `cq_15m`: alle 15 min, Fenster 2 h, Ergebnis in `agg_15m`
- Beide aggregieren nur die numerischen Measurements `sensor`, `state`, `counter` und `system`, gruppiert nach allen Tags.

### Measurements
| Measurement | Tags | Felder | Intervall |
|---|---|---|---|
| `sensor` | `sensor`, `source` (real/sim) | `value`, `rate` (Druck/Temperatur) | je Messung (Simulation: 2 s) |
| `state` | `source` | `running` (je Motorstrom-Messung); `status_code` 0–3, `alerts`, `faults`, `warnings` (5 s) | |
| `counter` | `source` | `total_s`, `since_maint_s`, `since_filter_s`, `starts`, `cycle_s` | 10 s |
| `maintenance` | `source` | `status_code`, `filter_status_code`, `hours_since`, `filter_hours_since`, `interval_h`, `filter_interval_h`, `remaining_h`, `filter_remaining_h` | 10 s |
| `system` | `host` | `influx_ok`, `db_buffer`, `rx_per_min`, `invalid_total`, `duplicates_total`, `ts_corrected_total`, `data_age_s` | 15 s |
| `events` (RP events) | `type`, `source`, `id`, `severity`, `key` | `value`, `text` | ereignisgesteuert |

Zeitstempel: Sie werden in ms von der Quelle übernommen und in Node-RED geprüft (siehe [nodered.md](nodered.md)).

### Geschätztes Datenvolumen
Bei Dauerbetrieb der Simulation fallen etwa 6 Sensoren × 0,5 Hz an, plus Zustand und Zähler, zusammen rund 4–5 Punkte pro Sekunde. Das ergibt in der RP `raw` grob 0,3–0,5 GB in 30 Tagen. Echter Betrieb mit Messung nur während der Laufzeit liegt deutlich darunter.

## Simulationsdaten entfernen
```sql
DROP SERIES FROM /.*/ WHERE "source" = 'sim'
```
Das betrifft alle RPs. Ereignisse der Simulation haben ebenfalls `source=sim`.
