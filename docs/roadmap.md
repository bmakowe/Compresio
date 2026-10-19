# Roadmap und Stand

Stand: 2026-10-19.

| Phase | Inhalt | Status |
|---|---|---|
| 0 | Administrationszugang, Bestandsaufnahme HA | erledigt |
| 1 | Bestandsaufnahme Kompressor ([compressor.md](compressor.md)) | **offen**: Typenschild, Unterlagen, Fotos fehlen |
| 2 | Sensorkonzept ([sensors.md](sensors.md)) | Messstellen festgelegt (T1, T12, T2, T23, T3, TR, Enddruck, Strom, Spannung), Hardware offen |
| 3 | Datenerfassung: MQTT → Node-RED → InfluxDB → Grafana, HA | **funktionsfähig** (mit Simulation) |
| 4 | Diagnose und Wartung | **funktionsfähig**: Betriebsstunden, Zyklen, Meldungen (TEST-Schwellen), thermische Diagnose, Wartungsprotokoll |
| UI | Compresio-Dashboard nach Designvorlage | **funktionsfähig** ([dashboard.md](dashboard.md)) |
| 5 | Steuerung | **nur konzeptionell**, Umsetzung erst nach Risikoanalyse und Fachprüfung |
| M | Migration Raspberry Pi 5 | vorbereitet ([migration.md](migration.md)) |

## Funktioniert (getestet)
| Komponente | Test |
|---|---|
| Mosquitto, MQTT-Integration, Discovery | Anmeldung, Pub/Sub, falsches Passwort abgelehnt |
| InfluxDB (RP/CQ/Benutzer) | Schreiben/Lesen mit Rechten, CQ-Aggregate vorhanden, keine Zukunftsdaten |
| Node-RED-Flows | End-to-End-Test `tools/e2e_test.py` (39 Prüfungen): alle Fehlschläge der Läufe lagen im Test (Rundung, umbenannte Meldungstexte), behoben und gezielt nachgeprüft |
| Persistenz der Zähler | Node-RED-Neustart: Betriebsstunden und Starts erhalten (retained MQTT) |
| Alarmierung | Warnungen/Störungen für alle Szenarien, HA-Benachrichtigung erscheint und verschwindet |
| Grafana | alle Panel-Abfragen fehlerfrei (`tools/check_grafana.py`) |
| Dashboard | alle 6 Ansichten bei 1536 × 1024, 1024 × 1366 und 390 × 844; 30/30 Interaktionsprüfungen (`dashboard/test/interact.mjs`), keine JS-Fehler im Normalbetrieb |
| Darstellung ohne Daten | Simulation aus: überall „Keine Daten“/„Unbekannt“, nichts fälschlich OK |
| Temperaturerweiterung | 6 Temperaturen, 5 ΔT-Template-Sensoren, Raumklima-Simulation, thermische Diagramme |
| Backups | manuell vor Änderungen, täglich automatisch |

## Offen
1. Kompressor-Bestandsaufnahme (Phase 1) → echte Grenzwerte, Wartungsintervalle, Sollwerte.
2. Sensorhardware auswählen und anschließen. Danach Simulation entfernen ([simulation.md](simulation.md)) und die Grafana-Variable auf `real` setzen.
3. Abgleich mit dem mechanischen Betriebsstundenzähler.
4. Backup-Passwort im Vereins-Passwortmanager ablegen, externes Backup-Ziel einrichten.
5. Temporären Admin-Token nach der Einrichtung löschen ([security.md](security.md) S1).
6. Benachrichtigung zusätzlich über Mobile App / E-Mail (Automation `kompressor_meldungen`).
7. Foto des realen Kompressors für die Übersicht (`compressor_image`).
8. Migration auf den Raspberry Pi 5.
