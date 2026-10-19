# Diagnose

Grundsatz: Die Diagnose zeigt **Auffälligkeiten und Trends**. Sie trifft keine sicherheitskritischen Entscheidungen und verwendet für die Thermik **keine festen Fehlergrenzen**. Grenzen werden erst nach Herstellerinformationen und validierten Messdaten festgelegt. Bewertet wird vorrangig im **Vergleich ähnlicher Betriebsbedingungen**.

## Temperaturmessstellen
Dreistufiger Kolbenverdichter in Sternbauweise, Verdichtungsfolge:

```
Ansaugluft → Zylinder Stufe 1 [T1] → Kühlspirale 1–2 [T12] → Zylinder Stufe 2 [T2]
           → Kühlspirale 2–3 [T23] → Zylinder Stufe 3 [T3] → Enddruck / Luftaufbereitung
Raumtemperatur [TR] – separater Sensor im Kompressorraum
```

| Kürzel | Messstelle | Entität |
|---|---|---|
| T1 | Zylindertemperatur Stufe 1 | `sensor.kompressor_temperatur_stufe_1` |
| T12 | Kühlspirale zwischen Stufe 1 und 2 | `sensor.kompressor_temperatur_kuehlspirale_1_2` |
| T2 | Zylindertemperatur Stufe 2 | `sensor.kompressor_temperatur_stufe_2` |
| T23 | Kühlspirale zwischen Stufe 2 und 3 | `sensor.kompressor_temperatur_kuehlspirale_2_3` |
| T3 | Zylindertemperatur Stufe 3 | `sensor.kompressor_temperatur_stufe_3` |
| TR | Raumtemperatur Kompressorraum | `sensor.kompressor_raumtemperatur` |
| ΔT1…ΔT23 | T1 − TR, T2 − TR, T3 − TR, T12 − TR, T23 − TR | `sensor.kompressor_delta_t1/_t2/_t3/_t12/_t23` (Template-Sensoren, °C) |

T1 bis T3 hießen bis 2026-10-19 `sensor.kompressor_temperatur_stufe1..3`. Sie wurden über die Entitäts-Registry umbenannt, nicht neu angelegt; Verlauf und Statistik sind erhalten.

**Montage Raumtemperatursensor:** nicht am Kompressor, nicht an den Kühlspiralen, nicht im warmen Abluftstrom. Er soll die Temperatur der angesaugten Umgebungsluft möglichst repräsentativ erfassen, z. B. auf Höhe des Ansaugfilters mit Abstand zur Maschine und geschützt vor Wärmestrahlung.

## Thermische Diagramme (Ansicht Diagnose)
| Diagramm | Zweck |
|---|---|
| Temperaturen – alle Messstellen | T1, T12, T2, T23, T3 und TR gemeinsam. Zylinder durchgezogen, Kühlspiralen gestrichelt, Raum gepunktet |
| Zylindertemperaturen T1–T3 | Vergleich der Verläufe, Aufwärmen und Abkühlen |
| Maximale Zylindertemperatur pro Zyklus | ungewöhnliche Erwärmung einzelner Zylinder über die Zeit |
| Zwischenkühler T12/T23 | Temperaturentwicklung während des Betriebs |
| Kühlspiralen pro Zyklus | max. ΔT12/ΔT23 je Zyklus, um verändertes Kühlverhalten zu erkennen |
| Stufe 1: T1 + T12, Stufe 2: T2 + T23 | jeweils mit Differenz T1 − T12 bzw. T2 − T23 |
| Zylinder bzw. Kühlspiralen relativ zur Raumtemperatur | ΔT1–ΔT3 bzw. ΔT12/ΔT23, um den Einfluss der Raumtemperatur herauszurechnen |
| Temperaturverhalten pro Betriebszyklus | bis zu 8 Zyklen übereinander, Zeitachse ab Motorstart, ab Motorstopp (Abkühlen) oder relativ zur Laufzeit. **Referenzzyklus** wählbar (weiß gestrichelt), Filter **ähnliche Raumtemperatur** (±2 / ±5 °C). Tabelle mit Dauer, Druckverlauf, Ø Motorstrom, TR, Ausgangstemperaturen vor dem Start und Maxima samt Abweichung zur Referenz |
| Temperaturen vs. Enddruck | alle fünf Messstellen über dem Enddruck bei laufendem Motor. Zeigt auffällige Temperaturverhältnisse bei vergleichbarem Druck |
| Einfluss der Raumtemperatur | je Zyklus max. ΔT über mittlerer TR |
| Aufwärmgeschwindigkeit | Anstieg in den ersten 5 min nach Start (°C/min) je Zyklus, um langfristige Veränderungen zu sehen |
| Abkühlverhalten | Abnahme in den ersten 10 min nach Stopp (°C/min) je Zyklus |

### Interpretation – Einschränkungen
- **Temperaturdifferenzen (ΔT zur Raumtemperatur, T1 − T12, T2 − T23) sind Diagnoseindikatoren, keine Messwerte der Kühlleistung.** Ihre Aussagekraft hängt von Sensorposition, Wärmeübergang (Anlegefühler!), Betriebszustand, Laufzeit, Druckniveau und Umgebungstemperatur ab.
- Vergleiche nur bei ähnlichen Bedingungen: ähnliche Raumtemperatur, Laufzeit, Druckbereich und Ausgangstemperatur (Kaltstart oder warmer Wiederanlauf).
- Aufwärmraten hängen von der Ausgangstemperatur ab, Abkühlraten vom Lüfter-Nachlauf und der Raumtemperatur.
- Langfristige Veränderungen (Wochen, Monate) sind aussagekräftiger als Einzelzyklen.

### Vorbereitete Fehlerdiagnosen (ohne feste Grenzen)
| Fragestellung | Hilfsmittel |
|---|---|
| Ungewöhnliche Erwärmung einzelner Zylinder | Max. pro Zyklus, Vergleich zur Referenz, ΔT zur Raumtemperatur |
| Verändertes Verhalten der Zwischenkühler | ΔT12/ΔT23 pro Zyklus, T1 − T12 bzw. T2 − T23 |
| Auffällige Anstiege nach Motorstart | Aufwärmgeschwindigkeit, Overlay ab Start |
| Verändertes Abkühlverhalten | Abkühlrate, Overlay ab Stopp |
| Abweichung von Referenzzyklen | Referenz im Zyklusvergleich, Abweichungsspalten |
| Auffällige Temperaturverhältnisse bei vergleichbarem Druck | Temperaturen vs. Enddruck |
| Einfluss der Raumtemperatur | Streudiagramm, Raumtemperaturfilter |

Nur für die Zylinder T1 bis T3 gibt es Meldungen in Node-RED, und zwar mit TEST-Schwellen (150 / 180 °C, Anstieg 20 °C/min), damit die Kette getestet werden kann. Für Kühlspiralen, Raum und Differenzen gibt es bewusst keine Meldungen.

## Druck, Motor, Zyklen
| Diagramm | Hinweise |
|---|---|
| Druckverlauf | getrennte Skalen je Druckstufe, normalisierte Ansicht (0–100 %). Ansaug- und Zwischendrücke sind vorbereitet, aber nicht gemessen |
| Druckanstieg pro Zyklus | (p_end − p_start) / Dauer. Als **vergleichbar** gelten Zyklen ≥ 2 min mit Δp ≥ 50 bar (`cycle.min_duration_s`, `min_delta_bar`, gleich in Node-RED und Dashboard). Gleitender Mittelwert über 5 Zyklen, Referenz optional |
| Einschränkung bar/min | hängt von Flaschenvolumen, Anfangs- und Enddruck, Temperatur, Entnahme und parallelen Füllungen ab. Nur vergleichbare Abschnitte vergleichen |
| Motorstrom | mit Motorzustand und Spannung. Ein veränderter Strom allein ist kein Fehlernachweis. L1 bis L3 sind vorbereitet |
| Betriebszyklen | Anzahl und Laufzeit aus der Langzeitstatistik (Starts, Betriebsstunden) für 24 h, 7 d, 30 d und 12 Monate, dazu Ø Zyklusdauer |
| Sensorqualität | Status, letzte Aktualisierung und Datenlücken je Sensor, ungültige Werte, Duplikate, korrigierte Zeitstempel, Kommunikationsabbrüche |
| Referenzbetrieb | einen vergleichbaren Zyklus als Referenz für den Druckanstieg übernehmen. **Nur nach technischer Prüfung**; aus Simulationsdaten gesetzte Referenzen vor dem Echtbetrieb entfernen |

## Datenquellen
- Zyklen: Ereignis `motorstopp` der Entität `event.kompressor_ereignis` mit Dauer, p_start/p_end, rate, comparable, Maxima und Ausgangstemperaturen (`t1_max … tr_max`, `t1_start … tr_start`), tr_mean, i_max/i_mean, u_mean. Recorder 31 Tage, dauerhaft in InfluxDB (`events`).
- Verläufe ≤ 2 Tage: HA-Recorder. Länger: HA-Langzeitstatistik. Rohdaten und Archiv: InfluxDB/Grafana.
