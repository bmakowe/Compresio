# Infrastruktur

Stand: 2026-10-19. Legende: **[A]** vorhanden (geprüft), **[B]** konfiguriert und getestet, **[C]** geplant, **[D]** unbekannt.

## Plattform
| Komponente | Status | Details |
|---|---|---|
| Virtualisierung (Proxmox VE, Entwicklungs-VM) | [D] | Angabe Projektbeschreibung; Host `qemux86-64`, amd64 |
| Home Assistant OS 18.3 / Core 2026.10.2 / Supervisor 2026.10.2 | [A] | |
| Zielhardware Raspberry Pi 5 (8 GB, 256 GB NVMe) | [C] | siehe [migration.md](migration.md) |

## Netzwerk
| Komponente | Status | Details |
|---|---|---|
| LAN | [A] | Die Entwicklungs-VM steht in einem lokalen Netz zusammen mit anderen Geräten. Von HA automatisch erkannte, nicht zum Projekt gehörende Geräte werden **nicht** übernommen. Für den Betrieb wird ein eigenes Netz/VLAN empfohlen |
| HA HTTP | [A] | Port 80 (intern) |
| Tailscale | [B] | Tailnet des Vereins (`<tailnet>.ts.net`), Gerät `vereinsheim`, Serve/HTTPS, kein Funnel (Angabe) |
| Offene Ports der VM | [B] | 80 (HA), 1883 (MQTT, Auth), 8086 (InfluxDB, Auth), 8088 (InfluxDB RPC, Voreinstellung der App), 1880 (Node-RED, HA-Auth), 22 (SSH-App, sofern konfiguriert) |

## Apps
| App | Version | aarch64 | Status | Konfiguration |
|---|---|---|---|---|
| Mosquitto broker | 7.1.1 | ja | [B] läuft | **neu installiert**, Benutzer `kompressor-nodered`/`kompressor-sensor`, nur Port 1883 |
| Node-RED | 22.1.0 | ja | [B] läuft | **repariert** (`ssl: false`), `node-red-contrib-influxdb`, Compresio-Flows |
| InfluxDB v1 | 6.0.0 | ja | [B] läuft | DB `kompressor`, RPs, CQs, Benutzer |
| Grafana | 13.0.3 | ja | [B] läuft | Datenquelle, Dashboard, Startseite |
| Tailscale | 0.30.2 | ja | [B] läuft | |
| Advanced SSH & Web Terminal | 24.1.7 | ja | [A] läuft | nicht geändert |
| Studio Code Server | 7.2.0 | ja | [A] läuft | nicht geändert |
| File Editor | 6.2.0 | ja | [A] läuft | nicht geändert |

## Integrationen (neu)
MQTT (Mosquitto), System Monitor. Außerdem wurden die Supervisor-Entitäten aktiviert: „aktiv“ für Mosquitto, Node-RED, InfluxDB, Grafana und Tailscale, RAM/CPU für Node-RED und InfluxDB, Speicherbelegung des Hosts.

## Backups
| Backup | Status |
|---|---|
| manuell, Slug `a8dec34e` (2,46 MB) | [B] vor allen Änderungen |
| manuell, Slug `bd5e255a` | [B] vor der Umstellung auf neutrale Namen |
| automatisch täglich 03:30, verschlüsselt, alle Apps, 7 Generationen, lokal | [B] |
| externes Backup-Ziel | [C] offen |
| Proxmox-Backup der VM | [D] |
