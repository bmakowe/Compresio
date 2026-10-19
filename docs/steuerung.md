# Betriebsfreigabe (Steuerung)

**Status (2026-10-19):** eingespielt und getestet mit dem virtuellen Testausgang und der Simulation:
gesperrt → Motor läuft nicht an; Freigeben → Motor läuft; Sperren → Motor stoppt (8 s); Störung → Freigabe verweigert;
Knopf im Dashboard mit Bestätigung; Protokoll im Logbuch und in den Ereignissen („Betriebsfreigabe erteilt/entzogen“,
„vor Ort/App geschaltet“). Ausgeführt im Auftrag des Betreibers (Elektrofachkraft).

## Grundsätze
1. Home Assistant ist **keine Sicherheitsebene**. NOT-HALT, Enddruckschalter, Sicherheitsventile, Motorschutz und Temperaturabschaltung arbeiten unabhängig und haben immer Vorrang. Nichts davon wird überbrückt.
2. HA erteilt oder entzieht nur eine **Freigabe**. Ohne Freigabe kann die Maschine nicht laufen. Mit Freigabe läuft sie nur, wenn alle vorhandenen Schutzkontakte geschlossen sind.
3. **Sperren ist immer erlaubt, Freigeben nur bewusst:** mit Bestätigung, nicht bei aktiver Störung, nur bei erreichbarem Ausgang.
4. Bei Ausfall von WLAN, Zigbee oder HA behält eine Steckdose ihren letzten Zustand. Ein laufender Kompressor wird also **nicht** automatisch gestoppt. Gestoppt wird vor Ort (Stopp/NOT-HALT).

## Verdrahtung (Prinzip – Ausführung nur durch eine Elektrofachkraft)
```
HA-Ausgang (Steckdose / Relais) ──► Spule Hilfsschütz K-FREIGABE
                                     │
Steuerstromkreis der Maschine:  … ─ NOT-HALT ─ Stopp ─ Druckschalter ─ Motorschutz ─ [Schließer K-FREIGABE] ─ … ─ Schütz Motor
```
- Der Ausgang schaltet **nur die Spule** des Hilfsschützes, nie den Motorstrom. Eine Steckdose (IKEA/Shelly) ist dafür ausreichend. Besser ist ein Relais mit potenzialfreiem Kontakt (z. B. Shelly 1) in einem Gehäuse.
- Der Schließer von K-FREIGABE liegt **in Reihe** mit den vorhandenen Stopp- und Schutzkontakten. Er kann die Maschine nur zusätzlich stoppen bzw. am Anlaufen hindern, nie eine Schutzfunktion überbrücken.
- Ob die Maschine nach einer Freigabe selbst anläuft (Druckschalter-Automatik) oder vor Ort gestartet werden muss, hängt von der vorhandenen Steuerung ab. **Empfehlung:** Nach dem Erteilen der Freigabe ist ein Start vor Ort nötig (Selbsthaltung mit Starttaster). Dann läuft die Maschine nie unbeaufsichtigt per Fernzugriff an.
- **Verhalten nach Stromausfall:** Die Steckdose bzw. das Relais auf „AUS nach Stromausfall“ stellen (fail-safe).
- Prüfung und Abnahme durch eine Elektrofachkraft. Die Gefährdungsbeurteilung (Fernzugriff, unbeaufsichtigter Betrieb) dokumentieren.

## Umsetzung in Home Assistant
| Element | Zweck |
|---|---|
| `input_text.kompressor_freigabe_ausgang` | **zentrale Einstellung**, welcher Ausgang geschaltet wird (z. B. `switch.ikea_steckdose_kompressor`). Standard: virtueller Testausgang |
| `input_boolean.kompressor_freigabe_testausgang` | virtueller Ausgang für Tests und Simulation (keine Hardware) |
| `script.kompressor_freigabe_erteilen` | prüft den Ausgang (erreichbar?) und den Status (keine Störung?), schaltet ein, kontrolliert die Rückmeldung nach 10 s und protokolliert |
| `script.kompressor_freigabe_entziehen` | schaltet aus (immer erlaubt), kontrolliert die Rückmeldung, bei Fehler: Meldung „Maschine vor Ort stoppen“ |
| Automation „Freigabe-Zustand melden“ | meldet jede Änderung (auch vor Ort oder per App geschaltet) per MQTT `kompressor/control/release` |
| Automation „Motor läuft ohne Freigabe“ | Warnung, wenn der Motor > 30 s ohne Freigabe läuft (Verdrahtung prüfen) |
| Automation „Freigabe bei Störung entziehen“ | wird **deaktiviert** angelegt. Erst aktivieren, wenn die Grenzwerte validiert sind (sonst brechen TEST-Schwellen echte Füllungen ab) |

Dashboard (Übersicht): Karte „Betriebsfreigabe“ mit Zustand (Freigegeben / Gesperrt / Ausgang nicht konfiguriert / Ausgang nicht erreichbar), Knopf **Freigeben** (mit Bestätigung und Hinweisen) bzw. **Sperren**, Warnung bei „Motor läuft ohne Freigabe“. Jede Schaltung steht im HA-Logbuch mit dem auslösenden Benutzer.

## Einspielen / erneut einspielen
```bash
.venv/bin/python tools/build_control.py      # Helfer, Skripte, Automationen
.venv/bin/python tools/build_dashboard.py    # Dashboard mit Karte „Betriebsfreigabe“
```
**Echten Ausgang aktivieren** (nach Verdrahtung und Prüfung): Einstellungen → Geräte & Dienste → Helfer → „Kompressor Freigabe-Ausgang“ → z. B. `switch.ikea_steckdose_kompressor`.

## Test vor der Inbetriebnahme
1. Mit Testausgang: Freigeben/Sperren im Dashboard, Logbuch und Ereignisse prüfen.
2. Mit echtem Ausgang, **Maschine spannungsfrei bzw. Motor abgeklemmt**: Hilfsschütz zieht und fällt, Rückmeldung im Dashboard stimmt.
3. Stromausfall simulieren: Ausgang bleibt aus.
4. Ausfall WLAN/HA simulieren und Verhalten dokumentieren.
5. Stopp und NOT-HALT vor Ort wirken unabhängig von der Freigabe.
