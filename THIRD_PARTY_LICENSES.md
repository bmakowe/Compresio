# Fremdkomponenten und Lizenzen / Third-Party Components and Licenses

Stand: 2026-10-19. Die Community-Lizenz dieses Projekts gilt nur für die eigenen Bestandteile. Sie schränkt die Rechte an Fremdkomponenten **nicht** ein. Für diese gelten ausschließlich deren eigene Lizenzen.

## A. Im Repository enthalten und mit dem Dashboard ausgeliefert
| Komponente | Version | Lizenz | Herkunft | Pflichten bei Weitergabe |
|---|---|---|---|---|
| ApexCharts | 4.7.0 | MIT | npm `apexcharts` (`dashboard/vendor/apexcharts.esm.js`, gebündelt in `dashboard/dist/kompressorraum.js`) | Copyright- und Lizenzhinweis beilegen: [LICENSES/MIT-ApexCharts.txt](LICENSES/MIT-ApexCharts.txt). Der Hinweis ist auch im Bundle als Kommentar enthalten |
| @svgdotjs/svg.js | 3.2.4 | MIT | Abhängigkeit von ApexCharts, im ESM-Build eingebettet | MIT-Hinweis (über ApexCharts-Bundle) |
| @svgdotjs/svg.select.js | 4.0.1 | MIT | eingebettet über ApexCharts | MIT-Hinweis (im Bundle enthalten) |
| @svgdotjs/svg.resize.js | 2.0.4 | MIT | eingebettet über ApexCharts | MIT-Hinweis (im Bundle enthalten) |
| @svgdotjs/svg.draggable.js | 3.0.x | MIT | eingebettet über ApexCharts | MIT-Hinweis |
| @svgdotjs/svg.filter.js | 3.0.x | MIT | eingebettet über ApexCharts | MIT-Hinweis |
| @yr/monotone-cubic-spline | 1.0.x | MIT | eingebettet über ApexCharts | MIT-Hinweis |

ApexCharts ab Version 5 steht **nicht** mehr unter MIT, sondern unter einer Doppellizenz mit Umsatzgrenzen. Ein Update über 4.x hinaus erfordert eine erneute Lizenzprüfung.

Die vollständigen MIT-Lizenztexte liegen unter [`LICENSES/`](LICENSES/) (`MIT-ApexCharts.txt`, `MIT-svgdotjs-*.txt`, `MIT-yr-monotone-cubic-spline.txt`). Sie stammen aus den Original-npm-Paketen. Für svg.draggable.js und svg.filter.js wurde der Text der aktuellen 3.0.x-Version übernommen; die im Bundle eingebettete Unterversion kann abweichen, die Lizenz (MIT) ist identisch. **Bei Weitergabe des Dashboards den Ordner `LICENSES/` immer mitgeben.**

## B. Laufzeitplattform – nicht im Repository, nicht mitverteilt
Diese Software setzt auf folgende Systeme auf, die der Betreiber selbst installiert. Sie werden **nicht** mit diesem Repository verteilt. Das Projekt liefert nur eigene Konfigurationen und Flows dafür.

| Komponente | Version (Referenzinstallation) | Lizenz | Hinweis |
|---|---|---|---|
| Home Assistant (Core/OS/Supervisor) | 2026.10.2 / OS 18.3 | Apache-2.0 | – |
| Node-RED (HA-App `a0d7b954_nodered`) | 5.0.7 (App 22.1.0) | Apache-2.0 (App: MIT) | Flows in `config/nodered/` sind eigene Werke |
| node-red-contrib-influxdb | über App installiert | MIT | – |
| Eclipse Mosquitto (HA-App `core_mosquitto`) | App 7.1.1 | EPL-2.0 / EDL-1.0 | – |
| InfluxDB 1.x (HA-App `a0d7b954_influxdb`) | App 6.0.0 | MIT | – |
| Grafana (HA-App `a0d7b954_grafana`) | 13.2.3 (App 13.0.3) | **AGPL-3.0** | Nur das Dashboard-JSON (`config/grafana/`) ist Teil dieses Projekts. Es wird von Grafana eingelesen und ist kein abgeleitetes Werk von Grafana (Einschätzung, siehe docs/legal-review.md). Grafana selbst wird weder verändert noch verteilt |
| Tailscale (HA-App) | App 0.30.2 | BSD-3-Clause (Client) | optional |
| Material Design Icons | über Home Assistant (`ha-icon`) | Pictogrammers Free License / Apache-2.0 | werden vom HA-Frontend geladen, nicht mitverteilt |
| Schriftarten | Systemschriften (Inter/Segoe UI/Roboto, falls installiert) | – | keine Schriftdateien im Repository |

## C. Entwicklungs- und Testwerkzeuge – nicht ausgeliefert
| Komponente | Version | Lizenz | Verwendung |
|---|---|---|---|
| esbuild | 0.25.10 | MIT | Build (`npx`), nicht im Repository |
| Playwright / playwright-core | 1.56.1 | Apache-2.0 | UI-Tests (`dashboard/test`, `node_modules` nicht versioniert) |
| websockets | 17.2 | BSD-3-Clause | Admin-Werkzeuge (`tools/`, `.venv` nicht versioniert) |
| requests | 2.34.2 | Apache-2.0 | Admin-Werkzeuge |
| paho-mqtt | 2.1.0 | EPL-2.0 OR BSD-3-Clause | Admin-Werkzeuge, Tests |

## D. Grafiken und eigene Inhalte
| Inhalt | Herkunft | Rechte / Hinweis |
|---|---|---|
| Schematische Kompressor-SVG (`dashboard/cards/src/components/compressor.js`), Instrumente | im Projekt erstellt | keine fremden Vorlagen übernommen |
| Compresio-Logo, Schriftzug, Favicon, Social Preview (`assets/branding/`, erzeugt mit `tools/build_branding.mjs`) | im Projekt erstellt; Schriftzug aus eigenen Pfaden, keine Schriftart eingebettet | keine fremden Vorlagen übernommen; Nutzung von Name und Logo siehe [BRANDING.md](assets/branding/BRANDING.md) |
| Quellcode, Konfiguration, Dokumentation | im Projekt erstellt | Rechteinhaber Björn Makowe |
| Screenshots `docs/images/dashboard-*.png` | Screenshots der eigenen Software | enthält nur eigene Oberfläche und Simulationsdaten |
