# Compresio – Sicherheit / Security Policy

## Sicherheitslücken melden
Bitte melde Schwachstellen **vertraulich** und nicht als öffentliches Issue:

- Über die **private Sicherheitsmeldung von GitHub**: Repository → Reiter „Security“ → „Report a vulnerability“. Die Meldung ist nur für den Rechteinhaber sichtbar.
- Bitte keine Schwachstellen in öffentlichen Issues beschreiben.

Bitte angeben: betroffene Komponente und Version, Beschreibung, Schritte zur Reproduktion, mögliche Auswirkungen. Wir bestätigen den Eingang so bald wie möglich und stimmen eine Veröffentlichung mit dir ab.

Für Gefahren am Kompressor selbst (Druck, Elektrik) gilt: zuerst die Maschine sichern. Diese Software ist kein Sicherheitssystem ([DISCLAIMER.md](DISCLAIMER.md)).

## Betriebshinweise
- **Keine Zugangsdaten im Repository.** `.env` (Vorlage: [.env.example](.env.example)) und Tokens bleiben lokal.
- Home Assistant **nicht öffentlich** im Internet exponieren. Zugriff über VPN (z. B. Tailscale ohne Funnel) oder das lokale Netz.
- Eigene Dienstkonten mit minimalen Rechten verwenden: MQTT (Sensor, Node-RED), InfluxDB (Schreiben/Lesen getrennt).
- Admin-Tokens nur befristet für die Einrichtung nutzen und danach löschen.
- Regelmäßige, verschlüsselte Backups. Das Backup-Passwort getrennt aufbewahren.
- Die optionale Betriebsfreigabe nur nach Prüfung durch eine Elektrofachkraft verwenden ([docs/steuerung.md](docs/steuerung.md)).

## English
Please report vulnerabilities privately via **GitHub private vulnerability reporting** (Security tab → "Report a vulnerability"), not as public issues. Never commit credentials; do not expose Home Assistant to the public internet; use least-privilege service accounts; this software is not a safety system.
