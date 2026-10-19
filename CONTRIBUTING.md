# Mitwirken / Contributing

Danke für dein Interesse an Compresio! Verbesserungen von eingetragenen Vereinen (e.V.) und Einzelpersonen sind willkommen.

> **Vorläufig:** Solange Lizenz und CLA noch nicht abschließend geprüft sind ([docs/legal-review.md](docs/legal-review.md)), werden Beiträge **nur nach vorheriger Absprache** angenommen. Bitte zuerst ein Issue eröffnen.

## Lizenzbedingungen für Beiträge
- Das Projekt ist **Source Available** (Community-Lizenz für eingetragene Vereine und Privatpersonen + kommerzielle Einzellizenzen, siehe [LICENSE](LICENSE), [docs/licensing.md](docs/licensing.md)).
- Damit der Rechteinhaber Beiträge auch in kommerziellen Lizenzen verwenden darf, ist voraussichtlich ein **Contributor License Agreement** nötig ([Entwurf](docs/CLA-draft.md), noch unverbindlich).
- Reiche nur Beiträge ein, an denen du die Rechte hast. Kläre gegebenenfalls mit deinem Arbeitgeber, ob du beitragen darfst.
- Übernimm keinen Code mit unklarer oder inkompatibler Lizenz. Neue Fremdkomponenten bitte in [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md) eintragen (Name, Version, Lizenz, Herkunft) und die Lizenztexte unter `LICENSES/` ablegen. Copyleft-Bibliotheken (GPL/AGPL) dürfen nicht in das Dashboard-Bundle aufgenommen werden.

## Ablauf
1. Issue eröffnen: Problem bzw. Vorschlag beschreiben, bei Fehlern mit Version, Umgebung und Schritten zur Reproduktion.
2. Fork und Branch (`feature/…`, `fix/…`).
3. Änderung umsetzen und testen (siehe unten).
4. Pull Request mit Beschreibung: Was, warum, wie getestet? Screenshots bei Oberflächenänderungen.
5. Review durch die Projektverantwortlichen. Bei Änderungen an Steuerungs- oder Sicherheitsthemen ist zusätzlich eine fachliche Prüfung nötig.

## Konventionen
- **Konfiguration als Code:** Änderungen an Node-RED, Grafana, HA-Automationen und Dashboard nur über die Generatoren in `tools/` bzw. die Quellen in `dashboard/cards/src/`, nicht per Klick in der Oberfläche.
- **Keine Zugangsdaten** im Repository (`.env` aus `.env.example` erzeugen).
- **Keine erfundenen Grenzwerte.** Schwellwerte sind als TEST-/Beispielwerte zu kennzeichnen, bis Herstellerangaben vorliegen.
- **Sicherheit:** Keine Änderungen, die Schutzeinrichtungen überbrücken oder die Software zur Sicherheitsebene machen ([DISCLAIMER.md](DISCLAIMER.md)). Steuerfunktionen nur als „Freigabe/Sperre“ mit Bestätigung.
- **Stil:** JavaScript als ES-Module ohne Framework, 2 Leerzeichen; Python 3, PEP 8 im Rahmen des bestehenden Stils. Kommentare und Dokumentation auf Deutsch.
- **Sprache der Oberfläche:** Deutsch.

## Tests
- `python tools/e2e_test.py`: End-to-End-Test mit Simulation
- `dashboard/test`: `node shoot.mjs`, `node interact.mjs`, `node layout_check.mjs`, `node overflow.mjs`
- `python tools/check_grafana.py`: Grafana-Abfragen

## Dokumentation
Jede funktionale Änderung aktualisiert die passende Datei in `docs/`. Ist-Zustand und Planung getrennt halten.

## Sicherheitslücken
Bitte **nicht** öffentlich als Issue melden, sondern nach [SECURITY.md](SECURITY.md).
