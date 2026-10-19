# Betriebsstunden und Wartung

## Betriebsstundenerfassung (Node-RED Tab 05)
| Größe | Entität | Quelle |
|---|---|---|
| Gesamtbetriebsstunden | `sensor.kompressor_betriebsstunden` | Laufzeit aufsummiert, wenn Motor läuft **und** Motorstrom aktuell ist |
| Stunden seit Wartung | `sensor.kompressor_stunden_seit_wartung` | wird beim Taster „Wartung durchgeführt“ zurückgesetzt |
| Stunden seit Filterwechsel | `sensor.kompressor_stunden_seit_filterwechsel` | wird beim Taster „Filterwechsel durchgeführt“ zurückgesetzt |
| Motorstarts | `sensor.kompressor_starts` | je erkanntem Start |
| aktueller und letzter Zyklus | `sensor.kompressor_zyklus_aktuell`, `_zyklus_letzter` | Dauer von Start bis Stopp |
| Wartungsereignisse | InfluxDB `events` (`maintenance`, `filter_change`, `maintenance_config`) | Wartungshistorie in Grafana |

Die Zähler für `real` und `sim` sind getrennt. Die HA-Entitäten zeigen die Zähler der aktuell aktiven Quelle.

**Abgleich mit dem mechanischen Betriebsstundenzähler:** Hat der Kompressor einen eigenen Zähler, wird bei Inbetriebnahme der Sensorik dessen Stand als Startwert übernommen. Dazu einmalig `kompressor/counters` mit `real.total_s` = Stand × 3600 publizieren, retained, während Node-RED gestoppt ist. Danach regelmäßig vergleichen.

## Wartungsintervalle: NOCH NICHT FESTGELEGT
- `number.kompressor_wartungsintervall`, `number.kompressor_filterintervall` (h). **0 = nicht festgelegt.** Das ist der aktuelle Stand.
- Die Werte dürfen erst nach Prüfung der Betriebsanleitung des Herstellers und des Wartungsplans eingetragen werden. Bei Filterpatronen hängt die Standzeit typischerweise auch von Umgebungstemperatur und Liefermenge ab; die Herstellerangaben sind entscheidend.
- Status: `nicht_festgelegt` | `ok` | `bald_faellig` (≥ 90 % des Intervalls) | `faellig`. Bei `faellig` gibt es eine Warnung.

## Offene Punkte
- Echte Intervalle (Ölwechsel, Ventile, Filterpatrone, Sicherheitsventilprüfung, Atemluftanalyse) aus den Herstellerunterlagen und Prüfvorschriften übernehmen. Eventuell sind weitere Zähler oder Kalendertermine nötig, z. B. für eine jährliche Prüfung unabhängig von der Laufzeit.
- Bei Filterwechsel kann man später die Liefermenge oder Temperaturkorrektur berücksichtigen, falls der Hersteller das vorsieht.
