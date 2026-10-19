# Compresio-Dashboard

Eigene Web Component in Home Assistant, umgesetzt nach einer Designvorlage (die ursprüngliche Vorlage ist nicht im Repository). Alle Screenshots zeigen Simulationsdaten.

![Ansicht Übersicht](images/dashboard-uebersicht.png)

## Aufruf
Seitenleiste → **Kompressorraum** (`/vereinsheim-kompressorraum`). Der Eintrag in der Seitenleiste trägt den Raum- bzw. Standortnamen, der Kopf des Dashboards zeigt das Compresio-Logo. Das ist ein normales Lovelace-Dashboard mit einer Panel-Ansicht und der Karte `custom:kompressorraum-card`. Es lässt sich unter Profil → Dashboard als **Standard-Dashboard** wählen (beim Admin-Benutzer bereits gesetzt).

Für einen Wandbildschirm im Vereinsheim: Seitenleiste ausblenden (Profil) und den Browser im Vollbild- oder Kiosk-Modus starten. Die HA-Kopfleiste (56 px) bleibt sichtbar; die Übersicht passt trotzdem vollständig auf 1536 × 1024.

Herstellerunabhängig: Titel, Untertitel, Aufschrift der Kompressorgrafik (`compressor_label`), Entitäten und Darstellungsbereiche stehen zentral in `dashboard/cards/src/config.js` und lassen sich auch in der Kartenkonfiguration überschreiben, z. B.:
```yaml
type: custom:kompressorraum-card
title: Compresio
subtitle: Kompressorraum Vereinsheim
compressor_label: MEIN KOMPRESSOR
```

## Ansichten
| Ansicht | Inhalt |
|---|---|
| **Übersicht** | Statuskarten (Kompressor, Enddruck mit Sollwert, Druckanstieg mit Referenz, Speicherkaskade (nur wenn vorhanden), **Betriebsfreigabe mit Knopf Freigeben/Sperren** – siehe [steuerung.md](steuerung.md), Meldungen), schematischer Verdichter mit allen Messstellen, Betriebsdaten, Raumtemperatur (aktuell, 24-h-Verlauf, Min/Max, Sensorstatus), 8 Instrumente in einer Reihe, Statusleiste – **ohne Diagramme** |
| **Diagnose** | Kennzahlen des Zeitraums, Druckverlauf (getrennte Skalen, normalisierbar), thermische Diagnose (siehe [diagnostics.md](diagnostics.md)), Motorstrom mit Motorzustand und Spannung, Druckanstieg pro Zyklus, Laufzeit je Betriebszyklus, Ø Enddruck mit gleitendem Mittel und Referenz, Betriebszyklen über 24 h / 7 d / 30 d / 12 Monate, Motorstrom vs. Enddruck, Sensorqualität, Referenzbetrieb |
| **Verläufe** | frei wählbare Messreihen (Druck, Temperatur, Differenzen zur Raumtemperatur, Motor), 1 h bis 12 Monate, bei Statistik-Zeiträumen optional mit Min/Max |
| **Wartung** | Gesamtbetriebsstunden, letzte und nächste Wartung, Filter, offene Aufgaben, Intervalle (0 = nicht festgelegt), Formular für Wartungseinträge (Datum, Betriebsstunden, Arbeiten, Ersatzteile, Bemerkungen, Zähler zurücksetzen), Historie |
| **Ereignisse** | chronologische Liste, Filter nach Typ und Zeitraum, Details per Klick, Sprung in den Messwertverlauf |
| **System** | CPU/RAM/Datenträger, Dienste (MQTT, Node-RED, InfluxDB, Grafana, Tailscale), Datenerfassung, CPU/RAM-Verlauf, **Ausstattung**: Schalter je Sensor und Nenndruck der Speicherkaskade |

## Ausstattung und Speicherkaskade
Nicht jede Anlage hat alle Sensoren. Unter **System → Ausstattung** wird je Messstelle festgelegt, ob sie vorhanden ist (Schalter `switch.kompressor_ausstattung_<sensor>`, gespeichert in Node-RED).
- Nicht vorhandene Messstellen erscheinen als „Kein Sensor“ (Grafik, Instrumente, Diagramm-Chips), erzeugen keine Meldung „liefert keine Daten“ und werden nicht simuliert.
- Voreinstellung: Enddruck, T1–T3, T12, T23, Raum, Motorstrom und Spannung vorhanden; Ansaug-, Zwischendrücke und Speicherkaskade nicht vorhanden.
- Motorstrom ist die Grundlage für Betriebszustand und Betriebsstunden. Das Dashboard fragt beim Abschalten nach.

**Speicherkaskade** (optional, Gesamtdruck `sensor.kompressor_kaskadendruck`): Ist sie vorhanden, zeigt die Übersicht eine Statuskarte „Speicherkaskade“ (teilt sich die Spalten mit dem Druckanstieg) und in der Grafik ein Flaschengestell mit Sammelleitung, Manometer und Druckwert. Die **Anzahl der Flaschen** (1–6, `number.kompressor_kaskade_flaschen`, Voreinstellung 3) wird unter System → Ausstattung gewählt: 1–4 stehen in einer Reihe, bei 5 stehen 3 hinten und 2 davor auf Lücke, bei 6 zwei versetzte Reihen zu je 3. Die Flaschenschulter trägt die Kennfarbe für Atemluft (weiß/schwarz). Füllstand und Manometer beziehen sich auf den eingetragenen **Nenndruck** (`number.kompressor_kaskade_nenndruck`, 0 = nicht festgelegt, dann ohne Zeiger). Der Nenndruck ist ein Anzeigewert, keine Betriebsgrenze; Meldungen gibt es nur bei Sensorausfall.

## Screenshots
| Ansicht | |
|---|---|
| **Übersicht** | [![Übersicht](images/dashboard-uebersicht.png)](images/dashboard-uebersicht.png) |
| **Diagnose** | [![Diagnose](images/dashboard-diagnose.png)](images/dashboard-diagnose.png) |
| **Verläufe** | [![Verläufe](images/dashboard-verlaeufe.png)](images/dashboard-verlaeufe.png) |
| **Wartung** | [![Wartung](images/dashboard-wartung.png)](images/dashboard-wartung.png) |
| **Ereignisse** | [![Ereignisse](images/dashboard-ereignisse.png)](images/dashboard-ereignisse.png) |
| **System** | [![System](images/dashboard-system.png)](images/dashboard-system.png) |

Neue Screenshots: Simulation einschalten, Browserfenster ca. 1640 px breit, Datei unter `docs/images/dashboard-<ansicht>.png` ersetzen. Automatisch erzeugte Testbilder (`dashboard/test/shots/`) sind nicht versioniert.

## Bedienung
- Ein Klick auf einen Messwert (Karte, Instrument, Wert in der Grafik) öffnet den HA-Verlaufsdialog der Entität.
- Diagramme: Zoom per Ziehen, Werkzeugleiste (Zoom, Verschieben, Zurücksetzen, Export), Tooltips. Ein Klick auf Legende oder Chip blendet eine Messreihe ein oder aus. Die Zeitreihen der Diagnose sind beim Zoomen synchronisiert.
- Simulation: Schalter oben rechts. Bei aktiver Simulation erscheinen ein „AKTIV“-Kennzeichen, ein gelber Hinweisbalken, die Datenquelle „Simulation“ und SIM-Kennzeichen in Ereignissen und Tabellen.

## Zustandsdarstellung
| Zustand | Darstellung |
|---|---|
| Im Betrieb | grüner, leuchtender Indikator |
| Außer Betrieb | grau |
| Warnung | gelb |
| Störung | rot, pulsierend |
| Keine Daten | grau schraffiert, Text „Keine Daten“ |

**Fehlende Daten werden nie als OK dargestellt:** Statusleiste, Instrumente, Grafik und Meldungskarte zeigen ohne aktuelle Messwerte „Keine Daten“ bzw. „Unbekannt“. Messgrößen ohne Sensor (Ansaug- und Zwischenstufendrücke, Strom L1 bis L3) sind als „Kein Sensor“ gekennzeichnet und gestrichelt dargestellt.

## Technik
| Punkt | Umsetzung |
|---|---|
| Quellcode | `dashboard/cards/src/` (ES-Module: `main.js`, `config.js`, `data.js`, `logic.js`, `styles.js`, `components/`, `views/`) |
| Diagramme | ApexCharts **4.7.0 (MIT)**, lokal gebündelt (`dashboard/vendor/`). Neuere Versionen stehen unter einer Doppellizenz |
| Build | esbuild → `dashboard/dist/kompressorraum.js` (~690 KB, minifiziert) |
| Auslieferung | `/local/kompressorraum/` (`www/kompressorraum` in HA). Fester Loader `kompressorraum-loader.js` + `version.json` (Inhalts-Hash) → neue Versionen ohne Cache-Probleme und ohne HA-Neustart |
| Registrierung | Lovelace-Ressource (Modul) `/local/kompressorraum/kompressorraum-loader.js`, Dashboard `/vereinsheim-kompressorraum`, Theme „Kompressorraum“ (`dashboard/styles/kompressorraum-theme.yaml`, Standard für Hell- und Dunkelmodus) |
| Daten | nur HA-WebSocket-APIs: Live-Zustände, `history/history_during_period` (Recorder, 31 Tage), `recorder/statistics_during_period` (Langzeitstatistik), Ereignis-Entität |
| Zentrale Zuordnung | `dashboard/cards/src/config.js`: alle Entitäten, Darstellungsbereiche und fehlende Sensoren (`null`) |
| Deployment | `python tools/build_dashboard.py` |
| Tests | `dashboard/test/shoot.mjs` (Screenshots aller Ansichten, JS-Fehler, defekte Ressourcen), `interact.mjs` (30 Interaktionsprüfungen) |

## Performance (Raspberry Pi 5)
- Live-Werte kommen per Push über die HA-Verbindung, die Oberfläche aktualisiert höchstens einmal pro Frame.
- Diagramme laden zeitgesteuert neu: 1 h alle 30 s, 6 h alle 60 s, 24 h alle 2 min, 7 d / 30 d alle 10 bis 15 min, und nur bei sichtbarer Seite. Ergebnisse werden 20 s zwischengespeichert.
- Lange Zeiträume kommen aus aggregierten Statistiken (5 min, 1 h, 1 Tag). Einzelwerte werden auf höchstens ca. 1200 Punkte je Reihe reduziert, Extremwerte bleiben erhalten.
- Node-RED drosselt die HA-Aktualisierung der Messwerte (≤ 10 s bzw. bei deutlicher Änderung). Die volle Auflösung liegt in InfluxDB.

## Abweichungen von der Vorlage
| Punkt | Grund |
|---|---|
| HA-Kopfleiste über dem Dashboard | Lovelace-Dashboard, damit es als Standard-Dashboard wählbar ist |
| Diagnose-Diagramme nicht in der Übersicht, sondern nur im Tab Diagnose | Wunsch: Übersicht nur mit dem aktuellen Zustand |
| Kompressorbild: schematische SVG-Zeichnung statt Foto-Rendering | Kein Foto des realen Geräts vorhanden; Vorgabe „nur technisch korrekte Zuordnung“. Mit Foto: `compressor_image` in der Konfiguration |
| Dreistufiger Sternkolbenverdichter mit Kühlspiralen und Raumtemperatur statt Reihenanordnung der Vorlage | Korrektur der Temperatursensorik (5 Messstellen + Raum) |
| Gelber Hinweisbalken „SIMULATION AKTIV“ unter der Kopfzeile | Vorgabe: Simulation eindeutig kennzeichnen |
| Ansaug- und Zwischendrücke als „Kein Sensor“ | nicht gemessen, keine erfundenen Werte |
| Druckanstieg „–“ bei Stillstand, „Normalbereich“ nur mit Referenz | ohne laufenden Motor bzw. ohne Referenz nicht aussagekräftig |
| „Soll“ nur bei gesetztem Sollwert | kein Herstellerwert vorhanden (`number.kompressor_enddruck_soll`) |
| Statusleiste „Wartung: Offen“ | Intervalle noch nicht festgelegt, deshalb nicht „OK“ |
| Instrumentenskalen mit Hinweis „Skala vorläufig“ | keine Herstellerwerte |
| Raumtemperaturkarte zusätzlich in der Übersicht | Erweiterung Raumtemperatur |
