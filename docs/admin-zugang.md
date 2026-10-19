# Administrationszugang

Die Werkzeuge in `tools/` und die UI-Tests in `dashboard/test/` richten Home Assistant, Node-RED, InfluxDB und Grafana ein. Sie brauchen einen Zugang zu Home Assistant:

| Punkt | Wert |
|---|---|
| `HA_URL` | Adresse von Home Assistant, z. B. `https://homeassistant.example` (Tailscale: `https://<gerät>.<tailnet>.ts.net`) |
| `HA_TOKEN` | Long-Lived Access Token eines Admin-Benutzers (HA → Profil → Sicherheit) |
| Ablage | lokale Datei `.env` (Vorlage: [.env.example](../.env.example)) oder Umgebungsvariablen – **nie im Repository** |

**Nur temporär verwenden:** Den Token nach der Einrichtung in HA löschen und für den Betrieb keinen Admin-Token dauerhaft vorhalten (siehe [security.md](security.md)).

## Verwendete Schnittstellen
| Schnittstelle | Verwendung |
|---|---|
| REST API (`/api/states`, `/api/services`, `/api/config/automation/config/*`, `/api/config/script/config/*`, `/api/config/config_entries/flow`) | Zustände, Dienste, Automationen, Skripte, Integrations-Flows |
| WebSocket API (`config_entries/*`, `config/entity_registry/*`, `config/device_registry/*`, `lovelace/*`, `backup/*`, Helfer) | Integrationen, Registries, Dashboards, Backups, Helfer |
| Supervisor-API über WebSocket `supervisor/api` | Apps installieren, konfigurieren, starten; Backups |
| HA-Ingress-Sessions | Node-RED-Admin-API (`/flows`), Grafana-HTTP-API, Chronograf-Proxy zur InfluxDB, Dateiablage über die File-Editor-App |

Alle Zugriffe laufen mit dem Admin-Token, so wie im HA-Frontend. Es wird keine Authentifizierung umgangen.
