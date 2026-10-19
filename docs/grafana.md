# Grafana

App `a0d7b954_grafana` 13.0.3 (Grafana 13.2.3). Aufruf: HA-Seitenleiste → Grafana (Ingress, Anmeldung über HA). Das Dashboard „Compresio – Kompressorraum“ ist als Startseite eingestellt.

## Deployment
```bash
python tools/build_grafana.py            # Datenquelle + Dashboard einspielen
python tools/build_grafana.py --export   # nur config/grafana/*.json schreiben
python tools/check_grafana.py [sim|real] # führt alle Panel-Abfragen aus und meldet Fehler
```
- `config/grafana/datasource.json`: Datenquelle „InfluxDB Compresio“ (uid `kompressor-influx`, InfluxQL, Benutzer `kompressor-grafana`, nur lesend; Passwort nicht im Repository)
- `config/grafana/dashboard-kompressorraum.json`: Dashboard (uid `kompressorraum`)

## Dashboard
Variable **Datenquelle** (`$source`): `real` oder `sim`. Voreingestellt ist derzeit `sim`. Nach Inbetriebnahme der Sensorik in `tools/build_grafana.py` auf `real` umstellen.

| Bereich | Panels |
|---|---|
| Übersicht | Gesamtstatus (Normal/Warnung/Störung/Keine Daten), Betriebszustand, aktuelle Laufzeit, Gesamtbetriebsstunden, aktive Meldungen, letzte Aktualisierung |
| Druck | Gauge Enddruck, Druckverlauf, Druckanstieg (bar/min), historische Druckkurven (Minutenaggregate, 30 Tage) |
| Temperaturen | aktuelle Werte der Stufen 1–3, Verläufe, Vergleich der Tagesmaxima |
| Motor | Statusverlauf (läuft/steht), Starts gesamt und im Zeitraum, Motorstrom + Spannung, Betriebsstunden pro Tag, letzte Zyklen |
| Wartung | Wartungs-/Filterstatus, Restlaufzeit, Stunden seit Wartung/Filterwechsel, Intervalle (vorläufig), Wartungshistorie |
| Diagnose | Sensorverfügbarkeit (Werte/min, Lücken = 0), Datenalter und Meldungen, InfluxDB-Status, Puffer, Raten, Fehlerzähler, Ereignistabelle |

Annotationen: Meldungen (rot) und Wartungen (blau) erscheinen in allen Zeitreihen. Die Farbschwellen sind TEST-Werte, das steht in den Panel-Beschreibungen. Ohne aktuelle Daten zeigen die Statuspanels „Keine Daten“, keine alten Werte.
