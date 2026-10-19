# Rechtsfragen und Veröffentlichungs-Checkliste

> Stand 2026-10-19. Diese Liste enthält **Fragen und Festlegungen**, keine Rechtsberatung.

## 1. Rechteinhaberschaft
| Frage | Stand |
|---|---|
| Wurde der Code privat entwickelt? | **Ja.** Private, persönliche Entwicklung von Björn Makowe (Festlegung des Rechteinhabers) |
| Wurde er im Auftrag eines Vereins entwickelt? | **Nein** (Festlegung des Rechteinhabers) |
| Gibt es weitere Mitwirkende? | Nein |
| Bestehen Rechte Dritter (z. B. Arbeitgeber)? | Vom Rechteinhaber als private Entwicklung angegeben. **Empfehlung:** Arbeitsvertragliche Regelungen zu privaten Softwareprojekten einmal formal gegenprüfen lassen |
| Ist eine kommerzielle Zweitlizenzierung zulässig? | Bei privater Alleinurheberschaft grundsätzlich ja. Steuerliche Behandlung der Einnahmen klären |

## 2. Lizenz
- [x] Rechteinhaber: Björn Makowe. Kontakt ohne E-Mail-Adresse: GitHub-Issue-Vorlage „Lizenzanfrage“, Sicherheitsmeldungen über GitHub Private Vulnerability Reporting
- [x] Kreis der Berechtigten festgelegt: jeder eingetragene Verein (e.V.) für seinen eigenen Vereinsbetrieb, auch bei Füllung gegen Entgelt und auch wenn einer Tauchschule angegliedert; Privatpersonen für private Zwecke. Nicht berechtigt: nicht eingetragene Vereine, jede gewerbliche Nutzung, auch intern. Umgehungsverbot: kein Betrieb durch oder für eine Tauchschule über einen Verein
- [ ] **Community-Lizenz anwaltlich ausarbeiten lassen** ([Entwurf](community-license-draft.md)). PolyForm NC bildet die Festlegungen nicht ab ([licensing.md](licensing.md))
- [ ] Grenzfälle in der Lizenz regeln:
  - Umgehungsverbot wirksam formulieren (Nutzung für den eigenen Vereinsbetrieb, keine Überlassung an eine Tauchschule)
  - ausländische Vereine: Was entspricht einem „e.V.“?
  - Vereinsmitglieder, die die Software privat für den Verein betreiben
- [ ] CLA prüfen lassen ([CLA-draft.md](CLA-draft.md)). Bis dahin Beiträge nur nach Absprache
- [ ] Danach `LICENSE` durch den endgültigen Text ersetzen

## 3. Fremdkomponenten
Siehe [THIRD_PARTY_LICENSES.md](../THIRD_PARTY_LICENSES.md). Ausgeliefert werden nur MIT-lizenzierte Komponenten (ApexCharts 4.7.0 samt Einbettungen). Die Lizenztexte liegen unter `LICENSES/`. Grafana (AGPL-3.0) und Mosquitto (EPL-2.0) werden nicht verteilt. Zu bestätigen bleibt die Einschätzung, dass Grafana-Dashboard-JSON und Node-RED-Flows eigenständige Werke sind. ApexCharts nicht auf Version ≥ 5 aktualisieren.

## 4. Geheimnisse und Datenschutz – Prüfung 2026-10-19
| Prüfpunkt | Ergebnis |
|---|---|
| Tokens, Passwörter, Tailscale-Schlüssel, Zertifikate, Backups, Datenbanken | keine (Arbeitsbaum und Historie) |
| Private Netzangaben und erkannte Geräte im Arbeitsbaum | **bereinigt**: in `docs/infrastructure.md` und `docs/security.md` verallgemeinert |
| Installationsspezifische Hostnamen | nur Platzhalter (`vereinsheim.<tailnet>.ts.net`) |
| Alte Git-Historie (Netz-, Host-, Vereinsangaben, frühere Designvorlage) | **bereinigt durch Neustart**: Das öffentliche Repository beginnt mit einem einzigen Commit. Die alte Historie liegt nur lokal als Bundle (siehe 5) |
| Commit-Autor | GitHub-Konto `bmakowe` mit GitHub-noreply-Adresse (keine persönliche E-Mail-Adresse) |
| Screenshot | nur eigene Oberfläche mit Simulationsdaten |

## 5. Durchgeführte Bereinigung der Historie
- Die alte Historie ist als Bundle gesichert, **außerhalb** des Repositorys: lokal beim Rechteinhaber (`kompressor-historie-2026-10-19.bundle`, nicht veröffentlicht) (wiederherstellbar mit `git clone <bundle>`).
- Der Branch `main` beginnt mit einem neuen Start-Commit, der den bereinigten Stand enthält. Der alte Branch wurde nach erfolgreicher Prüfung des Bundles entfernt, damit er nicht versehentlich gepusht wird.

## 6. Veröffentlichung
- [x] GitHub-Repository `bmakowe/compresio` angelegt. Empfehlung: **privat**, bis die Lizenz geprüft ist
- [ ] In den Repository-Einstellungen „Private vulnerability reporting“ aktivieren (Settings → Security)
- [ ] Im GitHub-Konto „Keep my email addresses private“ und „Block command line pushes that expose my email“ aktivieren
- [ ] Erneuter Geheimnis-Scan unmittelbar vor dem Push
- [ ] Markenrechtliche Prüfung des Namens „Compresio“ (Register DPMA/EUIPO/WIPO, Verwechslungsgefahr) und Freigabe der Markenrichtlinie ([BRANDING.md](../assets/branding/BRANDING.md))
