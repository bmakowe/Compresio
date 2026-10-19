# Sensorik

Status: **[C] geplant.** Die Plattform, die Schnittstellen und die Simulation sind vorbereitet ([mqtt.md](mqtt.md)). Die Hardwareauswahl folgt nach der Bestandsaufnahme ([compressor.md](compressor.md)).

## Vorgaben
- Zuerst **nichtinvasive** Verfahren. Kein Eingriff in den Atemluft-Hochdruckpfad ohne Herstellerfreigabe.
- Kein Eingriff in Schutz- und Steuerkreise. Arbeiten am Schaltkasten nur durch eine Elektrofachkraft.
- Sensoren melden nur, sie schalten nichts.

## Messgrößen und Zuordnung
Welche Messgrößen vorhanden sind, wird im Dashboard unter **System → Ausstattung** festgelegt ([dashboard.md](dashboard.md)).

| ID (MQTT `raw/<id>`) | Messgröße | HA-Entität | Status |
|---|---|---|---|
| `temp_stage1` | T1 Zylinder Stufe 1 | `sensor.kompressor_temperatur_stufe_1` | Simulation |
| `temp_coil12` | T12 Kühlspirale 1–2 | `sensor.kompressor_temperatur_kuehlspirale_1_2` | Simulation |
| `temp_stage2` | T2 Zylinder Stufe 2 | `sensor.kompressor_temperatur_stufe_2` | Simulation |
| `temp_coil23` | T23 Kühlspirale 2–3 | `sensor.kompressor_temperatur_kuehlspirale_2_3` | Simulation |
| `temp_stage3` | T3 Zylinder Stufe 3 | `sensor.kompressor_temperatur_stufe_3` | Simulation |
| `temp_room` | TR Raumtemperatur | `sensor.kompressor_raumtemperatur` | Simulation |
| `pressure_final` | Enddruck | `sensor.kompressor_enddruck` | Simulation |
| `motor_current` | Motorstrom | `sensor.kompressor_motorstrom` | Simulation |
| `supply_voltage` | Versorgungsspannung | `sensor.kompressor_spannung` | Simulation |
| `pressure_suction` | Ansaugdruck | `sensor.kompressor_ansaugdruck` | optional (Ausstattung), Voreinstellung nicht vorhanden; nur nach Herstellerfreigabe |
| `pressure_stage1` / `pressure_stage2` | Zwischendruck Stufe 1 / 2 | `sensor.kompressor_zwischendruck_stufe_1` / `_2` | optional, wie oben |
| `pressure_cascade` | Speicherkaskade, Gesamtdruck | `sensor.kompressor_kaskadendruck` | optional, Voreinstellung nicht vorhanden |
| – | Motorstrom L1/L2/L3 | – (vorbereitet) | optional |

## Hinweise zur Temperaturmessung (Vorschlag, noch nicht bewertet)
- **Zylinder T1–T3:** Anlegefühler (z. B. Pt100/Pt1000 bzw. Thermoelement Typ K mit Messumformer) an einer repräsentativen, gleichbleibenden Stelle des Zylinders bzw. Zylinderkopfs, mit Wärmeleitpaste und hitzebeständiger Befestigung. Die Position dokumentieren und später nicht ändern, sonst sind Vergleiche ungültig.
- **Kühlspiralen T12/T23:** Anlegefühler außen an der Kühlschlange, jeweils an definierter Position (z. B. Austritt der Spirale vor der nächsten Stufe). Nichtinvasiv, nichts im Gasweg.
- **Raum TR:** separater Fühler, nicht am Kompressor, nicht an den Kühlspiralen, nicht im warmen Abluftstrom. Er soll die Temperatur der angesaugten Umgebungsluft erfassen, z. B. auf Höhe des Ansaugfilters mit Abstand zur Maschine und Strahlungsschutz.
- Anlegefühler messen eine Oberflächentemperatur, nicht die Gas- oder Kühlleistungstemperatur. Siehe [diagnostics.md](diagnostics.md).

## Weitere Kandidaten
| Messgröße | Nichtinvasiver Ansatz |
|---|---|
| Betriebszustand, Laufzeit, Motorstrom | Strom- oder Leistungsmessung in der Zuleitung (Hutschienen-Energiezähler durch Elektrofachkraft) oder Stromwandler |
| Enddruck | zunächst nicht invasiv (Kamera, Manometer ablesen). Drucktransmitter nur nach Herstellerfreigabe |
| Filter, Kondensat | über Laufzeit/Zähler, Sensoren erst nach Klärung des Systems |
