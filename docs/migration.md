# Migration auf Raspberry Pi 5

Ziel: Raspberry Pi 5 (8 GB, 256 GB NVMe), Home Assistant OS, Ethernet, Tailnet des Vereins, eigenständig im Vereinsheim.

## Kompatibilität (geprüft 2026-10-19)
| Komponente | aarch64 | Bemerkung |
|---|---|---|
| HA OS / Core / Supervisor | ja | offizielles Image „Raspberry Pi 5“ |
| Mosquitto broker 7.1.1 | ja | |
| Node-RED 22.1.0 (+ node-red-contrib-influxdb) | ja | Das npm-Paket ist reines JavaScript |
| InfluxDB v1 6.0.0 | ja | |
| Grafana 13.0.3 | ja | |
| Tailscale 0.30.2 | ja | **Neuanmeldung nötig**, siehe unten |
| SSH, Studio Code Server, File Editor | ja | für den Betrieb nicht notwendig |
| System Monitor, MQTT, Backup | ja | Kern-Integrationen |

## Keine Abhängigkeit von VM oder IP
- Alle internen Verbindungen laufen über App-Hostnamen (`core-mosquitto`, `a0d7b954-influxdb`), keine IP-Adressen.
- Externer Zugriff läuft über den MagicDNS-Namen `vereinsheim.<tailnet>.ts.net`, keine LAN-IP.
- Es gibt keine Proxmox-Pfade oder Gerätedurchreichungen (USB, seriell).
- `internal_url` und `external_url` in HA sind nicht gesetzt.
- Zu prüfen nach der Migration: System-Monitor-Entitäten mit Schnittstellennamen (`enp6s18`) heißen auf dem Pi anders (`end0`). Sie werden im Dashboard **nicht** verwendet. Die Speicherbelegung (`massenspeicher_auslastung` für `/`) bleibt gleich.

## Backups
- Automatisch täglich um 03:30, verschlüsselt, alle Apps, Datenbank, Ordner `share`, `ssl`, `media`, 7 Generationen, lokal.
- **Das Backup-Passwort (`HA_BACKUP_PASSWORD` in `.env`) unbedingt zusätzlich im Vereins-Passwortmanager ablegen.** Ohne Passwort lässt sich kein Backup wiederherstellen.
- Empfehlung: zusätzlich ein externes Backup-Ziel (NAS, Cloud des Vereins), damit ein Defekt des Pi nicht alle Backups mitnimmt.
- Manuelles Backup vor dem Umbau: Slug `a8dec34e`; vor der Neutralisierung der Namen: Slug `bd5e255a`.

## Ablauf
1. **Vorbereitung (VM):** HA, OS und Apps aktualisieren. Prüfen, dass alle Apps laufen (Dashboard → System). Dann ein **manuelles vollständiges Backup** erstellen und herunterladen (Einstellungen → System → Backups).
2. **Pi installieren:** Mit dem Raspberry Pi Imager HA OS für den Pi 5 auf die NVMe schreiben (bzw. per USB/SD booten und dann auf NVMe umziehen). Ethernet anschließen und hochfahren.
3. **Wiederherstellen:** Beim Onboarding „Aus Backup wiederherstellen“ wählen, die Backup-Datei hochladen und das Passwort eingeben. Alle Apps und ihre Daten (InfluxDB, Node-RED-Flows inkl. Credentials, Grafana, Mosquitto inkl. retained Zähler) werden mitgenommen.
4. **VM stoppen,** bevor der Pi online geht. Sonst laufen zwei Instanzen gegen dasselbe Tailnet und denselben MQTT-Namen.
5. **Tailscale:** Das Gerät `vereinsheim` in der Tailscale-Admin-Konsole des Vereins entfernen bzw. umbenennen und die Tailscale-App auf dem Pi neu anmelden (Auth-Link im Log der App). Hostname wieder `vereinsheim`, damit der MagicDNS-Name gleich bleibt. **Funnel nicht aktivieren.**
6. **Prüfen:**
   - Compresio-Dashboard („Kompressorraum“) → System: alle Dienste `an`, InfluxDB `ok`, Heartbeat aktuell
   - `python tools/check_grafana.py` (Grafana-Abfragen)
   - `sensor.kompressor_heartbeat`, Attribut `zaehler_herkunft` = `MQTT (retained)`
   - Betriebsstunden entsprechen dem Stand vor der Migration
   - Administrationszugang (`HA_TOKEN` in `.env`): Der Token ist im Backup enthalten und gilt weiter
7. **Netzwerk im Vereinsheim:** Am Router eine feste DHCP-Reservierung einrichten (optional, nur Komfort, nichts hängt davon ab). Ausgehender Zugang ins Internet für Tailscale und Updates.

## Rollback
Entwicklungs-VM bleibt bis zur erfolgreichen Prüfung unverändert gestoppt erhalten. Bei Problemen: Pi ausschalten, VM starten, Tailscale-Gerät der VM wieder aktivieren.

## Ressourcenbedarf (gemessen in der VM)
CPU ca. 2 %, RAM ca. 38 % der VM, Datenträger 12,4 von 30,8 GB. Der Pi 5 mit 8 GB und 256 GB NVMe ist dafür reichlich bemessen.
