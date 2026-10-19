# Sicherheit

## Grundsätze (verbindlich)
1. Alle Schutzfunktionen des Kompressors (Sicherheitsventile, Druckschalter, Temperaturabschaltung, Motorschutz, NOT-HALT) arbeiten **unabhängig** von HA, Netzwerk und Software und werden nie überbrückt.
2. HA, Node-RED und die Administrationswerkzeuge sind **keine** Sicherheitsebene, sondern reine Diagnose.
3. Diagnose und Steuerung bleiben getrennt. Einziger Steuerpfad ist die **Betriebsfreigabe** über einen HA-Ausgang und ein Hilfsschütz in Reihe mit den vorhandenen Schutzkontakten ([steuerung.md](steuerung.md)). Sie kann nur freigeben oder sperren und nichts überbrücken.
4. Nichts wird ohne Herstellerfreigabe in den Atemluft-Hochdruckpfad eingebracht (Werkstoffe, Atemluftqualität nach EN 12021).
5. Keine öffentliche Exponierung: **kein Tailscale Funnel**, keine Portfreigaben am Router.
6. Das Tailnet der Kompressor-Installation bleibt von anderen (privaten) Netzen getrennt. Es gibt keine Verbindung zu anderen Home-Assistant-Instanzen.
7. Vor Konfigurationsänderungen ein Backup anlegen. Konfiguration liegt als Code im Repository und ist damit nachvollziehbar.

## Umgesetzt
| Maßnahme | Stand |
|---|---|
| MQTT nur mit Anmeldung, eigene Benutzer je Rolle, TLS- und WebSocket-Ports zu | umgesetzt |
| InfluxDB mit Anmeldung; Grafana nur lesend, Node-RED nur auf die eigene DB | umgesetzt |
| Zugangsdaten nur in `.env` (chmod 600, in `.gitignore`), in den Node-RED-Credentials (verschlüsselt) und in der Grafana-Datenquelle (secure) | umgesetzt |
| Exporte (`config/**`) ohne Passwörter | umgesetzt |
| Backup vor den Änderungen, tägliche verschlüsselte Backups | umgesetzt |
| Testschwellwerte eindeutig gekennzeichnet; Automationen nur mit Benachrichtigungen | umgesetzt |
| Simulation getrennt gekennzeichnet (`source=sim`), Zähler getrennt | umgesetzt |

## Offene Punkte / Befunde
| # | Befund | Bewertung | Empfehlung |
|---|---|---|---|
| S1 | Admin-Token (Long-Lived Access Token, Admin) für die Entwicklung | **bewusst temporär** (Vorgabe des Projekts) | Nach Abschluss der Einrichtung in HA löschen und aus der lokalen `.env` entfernen; für den Betrieb einen Nicht-Admin-Zugang |
| S2 | Die Entwicklungs-VM steht in einem gemeinsam genutzten lokalen Netz; Ports 1883, 8086, 8088 und 1880 sind dort erreichbar (mit Anmeldung) | mittel, endet mit dem Umzug auf den Pi | Im Vereinsheim eigenes Netz/VLAN nutzen. Nicht benötigte Ports schließen: 8088 (InfluxDB RPC) und ggf. 8086 nach außen (Node-RED und Grafana nutzen das interne Netz) |
| S3 | Backup-Passwort liegt nur in `.env` | hoch für die Wiederherstellung | Im Vereins-Passwortmanager ablegen |
| S4 | Funnel/ACL nicht direkt geprüft | niedrig | In der Tailscale-Admin-Konsole kontrollieren |
| S5 | Die SSH-App läuft (Konfiguration nicht geprüft) | niedrig | Nur mit Schlüssel nutzen, oder stoppen, wenn nicht gebraucht |
