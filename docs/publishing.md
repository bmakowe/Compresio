# Rechteinhaberschaft und Veröffentlichung

## Rechteinhaberschaft
| | |
|---|---|
| Rechteinhaber | Björn Makowe |
| Entstehung | private, persönliche Entwicklung, nicht im Auftrag eines Vereins |
| Lizenz | [Compresio Community License 1.0](../LICENSE) und kommerzielle Einzellizenzen ([LICENSE-COMMERCIAL.md](../LICENSE-COMMERCIAL.md)), Hintergrund in [licensing.md](licensing.md) |
| Beiträge Dritter | nur mit Zustimmung zum [CLA](CLA.md) |
| Kontakt | ohne E-Mail-Adresse: GitHub-Issue-Vorlage „Lizenzanfrage“, Sicherheitsmeldungen über GitHub Private Vulnerability Reporting ([SECURITY.md](../SECURITY.md)) |

## Fremdkomponenten
Siehe [THIRD_PARTY_LICENSES.md](../THIRD_PARTY_LICENSES.md). Ausgeliefert werden nur MIT-lizenzierte Komponenten (ApexCharts 4.7.0 samt Einbettungen), die Lizenztexte liegen unter `LICENSES/`. Grafana (AGPL-3.0) und Mosquitto (EPL-2.0) werden nicht verteilt. Grafana-Dashboard-JSON und Node-RED-Flows sind eigenständige Werke dieses Projekts. ApexCharts nicht auf Version ≥ 5 aktualisieren (andere Lizenz).

## Geheimnisse und Datenschutz
| Prüfpunkt | Regel |
|---|---|
| Tokens, Passwörter, Tailscale-Schlüssel, Zertifikate, Backups, Datenbanken | nie im Repository; Zugangsdaten nur in der lokalen `.env` (Vorlage `.env.example`) |
| Netzangaben, Hostnamen | nur Platzhalter (`vereinsheim.<tailnet>.ts.net`, `homeassistant.example`) |
| Commit-Autor | GitHub-Konto `bmakowe` mit GitHub-noreply-Adresse, keine persönliche E-Mail-Adresse |
| Screenshots | nur eigene Oberfläche mit Simulationsdaten, ohne Metadaten |

## Vor jedem Push
- [ ] Geheimnis-Scan (`git grep` nach Tokens, Passwörtern, IP-Adressen, E-Mail-Adressen)
- [ ] Keine Betriebssystemdateien (`.DS_Store`) und keine lokalen Testbilder (`dashboard/test/shots/`)

## GitHub-Einstellungen
- [ ] „Private vulnerability reporting“ aktivieren (Settings → Security)
- [ ] Im Konto „Keep my email addresses private“ und „Block command line pushes that expose my email“ aktivieren
- [ ] Social Preview hochladen (Settings → General → Social preview → `assets/branding/social-preview.png`)
