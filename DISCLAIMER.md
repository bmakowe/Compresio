# Sicherheits- und Haftungshinweise / Safety and Liability Notice

## Deutsch

### Zweck der Software
Diese Software dient der **Überwachung, Visualisierung, Betriebsdatenerfassung, Wartungsunterstützung und Zustandsdiagnose** von Atemluftkompressoren.

### Kein Sicherheitssystem
Die Software ist **kein zertifiziertes Sicherheitssystem** und keine Sicherheitseinrichtung im Sinne von Maschinen-, Druckgeräte- oder Betriebssicherheitsvorschriften. Sie darf insbesondere **nicht ersetzen**:

- Sicherheitsventile
- Druckschalter und Enddruckabschaltungen
- elektrische Schutzeinrichtungen (NOT-HALT, Motorschutz, Sicherungen)
- herstellerseitige Schutzfunktionen
- vorgeschriebene Prüfungen, Wartungen und Atemluftanalysen

Alle Schutzfunktionen des Kompressors müssen unabhängig von dieser Software, von Home Assistant, vom Netzwerk und von Cloud-Diensten wirksam bleiben. Bestehende Schutzeinrichtungen dürfen nicht überbrückt werden.

### Messwerte, Grenzwerte, Simulation
- Angezeigte Werte können falsch, veraltet oder unvollständig sein (Sensorfehler, Kommunikationsausfall).
- Mitgelieferte Schwellwerte, Skalen und Intervalle sind **Beispiel- bzw. TEST-Werte**, keine Herstellerangaben. Sie müssen anhand der Herstellerunterlagen festgelegt werden.
- Die eingebaute Simulation erzeugt **synthetische Daten**. Sie dürfen nie als reale Messwerte verwendet werden.

### Betriebsfreigabe (optional)
Die optionale Fernfreigabe über einen Home-Assistant-Ausgang darf nur einen zusätzlichen Freigabekontakt **in Reihe** mit den vorhandenen Schutzkontakten schalten. Planung, Installation und Prüfung nur durch eine **Elektrofachkraft**, mit dokumentierter Gefährdungsbeurteilung. Ein Ausfall von Netzwerk oder Software darf keinen gefährlichen Zustand verursachen.

### Arbeiten an Hochdruckanlagen
Eingriffe in Hochdruckanlagen, den Atemluftpfad und elektrische Anlagen dürfen ausschließlich **entsprechend qualifizierte Personen** durchführen. In den Atemluft-Hochdruckpfad dürfen nur dafür freigegebene Bauteile eingebracht werden.

### Haftung
Die Software wird ohne Gewähr bereitgestellt. Maßgeblich ist der Haftungsausschluss der jeweils geltenden Lizenz, soweit gesetzlich zulässig. Die Verantwortung für den sicheren Betrieb des Kompressors liegt beim Betreiber.

## English

This software is intended for **monitoring, visualisation, operating data acquisition, maintenance support and condition diagnostics** of breathing-air compressors. It is **not a certified safety system** and must not replace safety valves, pressure switches, electrical protective devices, manufacturer safety functions, or mandatory inspections, maintenance and air quality tests. All protective functions must remain effective independently of this software, Home Assistant, the network and any cloud service, and must never be bypassed.

Displayed values may be wrong, outdated or incomplete. Supplied thresholds and intervals are **examples/test values**, not manufacturer data. The built-in simulation produces **synthetic data**. The optional remote release must only switch an additional enable contact **in series** with existing protective contacts and must be installed and verified by a qualified electrician. Work on high-pressure systems, the breathing-air path and electrical installations must only be carried out by **qualified persons**. The software is provided without warranty; the liability disclaimer of the applicable license applies to the extent permitted by law. The operator remains responsible for safe operation.
