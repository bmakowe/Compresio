# Simulation

## Architektur
Die Simulation läuft im Node-RED-Tab **„90 SIMULATION“** und verhält sich wie ein echter Sensorknoten:

```
Simulator ──MQTT──► kompressor/raw/<sensor>  {"v":…, "ts":…, "src":"sim", "seq":…}
                    kompressor/raw/status    online / offline / (gelöscht)
          ──► dieselbe Kette wie echte Sensorik: Validierung → Aufbereitung → Zustand → Zähler → Fehler → Alarm → InfluxDB / HA
```

## Kennzeichnung
- Jeder Datenpunkt hat `src: "sim"`. In InfluxDB steht der Tag `source=sim`, die Zähler laufen getrennt (`counters.sim`).
- HA: `sensor.kompressor_quelle` = `simulation`, dazu ein orangefarbenes Banner „SIMULATION aktiv“.
- Grafana: Variable „Datenquelle“ = `sim`.
- Es werden keine Steuerbefehle erzeugt. Der Simulator publiziert nur auf `kompressor/raw/*`.

## Bedienung
Im Dashboard über den Schalter „Simulation“ oben rechts oder über die Entitäten:
- `switch.kompressor_simulation`: an/aus. Beim Ausschalten meldet sich der simulierte Sensorknoten ab, danach zeigt das System „Keine Daten“.
- `select.kompressor_simulation_szenario`:

| Szenario | Verhalten | Erwartete Reaktion |
|---|---|---|
| `normal` | 90 s Stillstand → Start (Anlaufstrom) → Druck von ca. 30–70 auf 200 bar (0,35 bar/s) → Stopp → Abkühlung | Status normal, Zyklen/Starts/Betriebsstunden werden gezählt |
| `sensorfehler` | Stufe 2 sendet abwechselnd `null` und 999,9 °C | Warnung „Unplausible Messwerte“, Stufe 2 nicht verfügbar |
| `kommunikationsausfall` | keine Daten, Sensorknoten bleibt online | nach 60 s Störung „Datenübertragung ausgefallen“, keine Betriebsstunden |
| `sensorknoten_offline` | publiziert `raw/status=offline` | Störung „Sensorknoten offline“ |
| `uebertemperatur` | Stufe 3 strebt 260 °C an | Warnung Temperaturanstieg, Warnung ≥ 150 °C, Störung ≥ 180 °C (TEST-Schwellen) |
| `druckanomalie` | kein Druckanstieg bei laufendem Motor | nach 3 min Warnung „Kein Druckanstieg“ |
| `zeitstempelfehler` | Druck mit Zeitstempel +1 h, Stufe 1 doppelt | Zähler „Korrigierte Zeitstempel“ und „Duplikate“ steigen |

### Temperaturen und Raumklima
`select.kompressor_simulation_raumklima`, unabhängig vom Szenario:

| Raumklima | Basistemperatur des Raums |
|---|---|
| `normal` | 18 °C |
| `sommer` | 30 °C |
| `winter` | 8 °C |
| `erwaermung` | steigt langsam um 3 °C/h bis 35 °C |

Modell (alle Werte frei gewählt, synthetisch):
- **Raum TR:** strebt mit Zeitkonstante ca. 30 min gegen Basis + 6 °C Abwärme bei laufendem Motor. Im Stillstand kühlt er zur Basis ab. Die Basis folgt einem Wechsel des Raumklimas mit ca. 20 min Trägheit.
- **Zylinder T1/T2/T3:** streben mit ca. 5 min Zeitkonstante gegen TR + Übertemperatur (50 / 70 / 85 K × Lastfaktor 0,6…1 je nach Druck). Im Stillstand kühlen sie auf TR ab. Damit reagieren alle Temperaturen auf das Raumklima.
- **Kühlspiralen T12/T23:** eigene Dynamik (Zeitkonstante ca. 2 min) gegen TR + 35 % der Übertemperatur des vorgelagerten Zylinders. Sie folgen den Zylindern verzögert, die Differenz ändert sich also über den Zyklus und ist kein konstanter Abstand.

„Wartung fällig“: In HA das Wartungsintervall auf einen kleinen Wert setzen (z. B. 0,05 h). Danach mit „Wartung durchgeführt“ zurücksetzen und das Intervall wieder auf 0 stellen.

**Alle Zahlen der Simulation sind frei gewählte Parameter, keine Kenndaten eines realen Kompressors.**

## Entfernen (nach Inbetriebnahme der Sensorik)
1. HA: Simulation ausschalten.
2. `tools/build_nodered.py`: den Abschnitt „90 Simulation“ und die Entitäten `simulation`, `simulation_szenario` und `simulation_raumklima` in `build_discovery()` entfernen, dann deployen.
3. Discovery der beiden Entitäten löschen, d. h. leere retained Nachrichten senden an
   `homeassistant/switch/kompressor/simulation/config`, `homeassistant/select/kompressor/simulation_szenario/config` und `…/simulation_raumklima/config`,
   außerdem `kompressor/sim/enabled`, `…/sim/scenario` und `…/sim/room` leeren.
4. InfluxDB: `DROP SERIES FROM /.*/ WHERE "source" = 'sim'`.
5. Grafana: Voreinstellung der Variablen `source` auf `real` setzen.
