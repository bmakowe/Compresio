# Designsystem

Referenz: [`docs/images/dashboard-uebersicht.png`](images/dashboard-uebersicht.png) (umgesetzte Übersicht; die ursprüngliche Designvorlage ist nicht im Repository). Markenfarben und Logo: [BRANDING.md](../assets/branding/BRANDING.md). Die Vorlage hat Vorrang vor Beispielwerten.

## Farben (CSS-Variablen in `dashboard/cards/src/styles.js`, Theme `dashboard/styles/kompressorraum-theme.yaml`)
| Variable | Wert | Verwendung |
|---|---|---|
| `--t-bg` | `#081522` | Hintergrund (mit dezentem radialem Verlauf oben links) |
| `--t-panel` | `#0a1a29` | große Bereichsrahmen (linke/rechte Hälfte) |
| `--t-card` | `#0d2030` | Karten |
| `--t-card-hi` | `#11283a` | hervorgehobene Karten, Kennwertkacheln |
| `--t-border` / `--t-border-hi` | `#1b3346` / `#24425a` | dezente Rahmen |
| `--t-blue` | `#1685e5` | Primärblau, aktive Navigation, Zeitraumauswahl |
| `--t-blue-light` | `#55b5ff` | Icons, Akzente, Enddruck-Callout |
| `--t-green` | `#20d978` | OK, im Betrieb |
| `--t-yellow` | `#f2b544` | Warnung, Simulation |
| `--t-red` | `#ef5350` | Störung |
| `--t-grey` | `#6f8496` | Unbekannt, keine Daten, außer Betrieb |
| `--t-text` / `--t-text-2` / `--t-text-3` | `#f3f7fc` / `#a8bed0` / `#6f8aa0` | Text, Sekundärtext, Hinweise |

Messreihen: T1 `#2F8CF0`, T12 `#8ED9D3`, T2 `#F2B544`, T23 `#FF8A65`, T3 `#EF5350`, TR `#C9D6E2`, Enddruck `#20D978`, Motorstrom `#20D978`, Motorzustand `#2F8CF0`. Linienstil: Zylinder durchgezogen, Kühlspiralen gestrichelt, Raum gepunktet.

**WLT-Farbcode** (aus `~/git/WLT`, zum Abgleich): Navy `#0B2E4F`, Blau `#004E73`, Cyan `#0097B2`, Aqua `#8ED9D3`, Koralle `#FF6F4F`, Off-White `#F3F6F8`. Laut Auftrag hat die Vorlage Vorrang. Aqua ist als Farbe der Kühlspirale T12 übernommen, die Rahmenfarbe ist an WLT „navy-line“ `#234966` angelehnt.

## Typografie
Schrift: Inter, Segoe UI, Roboto, Systemschrift. Größen: Titel 25 px / 700, Navigation 15 px / 500, Kartentitel 15–16,5 px / 600, Messwerte 21–29 px / 600–700 (tabellarische Ziffern), Sekundärtext 12,5–13 px, Hinweise 11–12 px.

## Formen und Abstände
Kartenradius 12 px, Bereichsradius 14 px, Kartenabstand 8 px, Innenabstand 12–16 px. Icons: Material Design Icons über `ha-icon`, 24–32 px.

## Zustände
Grün = OK bzw. im Betrieb (leuchtend), Gelb = Warnung, Rot = Störung (pulsierend), Grau = unbekannt bzw. keine Daten (schraffiert), gestrichelte Rahmen = Messstelle ohne Sensor.

## Breakpoints
| Breite | Layout |
|---|---|
| > 1280 px | Desktop wie Vorlage: links Kompressor, rechts Diagnose |
| ≤ 1280 px | Navigation unter dem Titel, Diagnose unter der Übersicht |
| ≤ 900 px | Tablet: Statuskarten 2×2, Instrumente 2-spaltig, Grafik volle Breite |
| ≤ 640 px | Smartphone: einspaltig, Reihenfolge Status → Enddruck → Meldungen → Druckanstieg → Grafik/Temperaturen → Motor. Kompakte Kopfzeile mit Menüknopf und SIM-Kennzeichen |

## Raster der Übersicht
**Ein gemeinsames Spaltenraster** für Statuskarten, Mittelteil und Instrumente: alle drei Bereiche verwenden `repeat(var(--ov-n), minmax(0, 1fr))` mit demselben Abstand (8 px). Dadurch liegen alle senkrechten Kartenkanten auf denselben Linien, die Rahmen bilden durchgehende Kreuze. Karten überspannen nur ganze Spalten:

| Breite | Spalten | Statuskarten (Spans) | Mittelteil |
|---|---|---|---|
| > 1280 px | 8 | Kompressor 2 · Enddruck 1 · Druckanstieg 2 · Freigabe 2 · Meldungen 1 | Visualisierung 4 · Mitte 2 · rechts 2 |
| ≤ 1280 px | 4 | 2 · 1 · 1 / 2 · 2 | 2 · 1 · 1 |
| ≤ 900 px | 2 | Kompressor volle Breite, übrige je 1 | Visualisierung oben, darunter 2 Spalten |
| ≤ 640 px | 1 | untereinander | untereinander |

Mittelteil: 4 gleich hohe Zeilen (`repeat(4, minmax(0, 1fr))`), explizite Platzierung, Raumtemperatur über die Zeilen 3–4. Visualisierung und Raumtemperatur-Diagramm tragen nicht zur Zeilenhöhe bei (positionierter Container, SVG mit `preserveAspectRatio="xMidYMid meet"`, keine Verzerrung). Schmale Statuskarten passen ihren Inhalt per Container Query an (Icon aus, Wert kleiner) statt die Spaltenbreite zu verändern.

Die Systemstatusleiste ist **eine** Karte über die volle Breite. Ihre 6 inneren Bereiche sind gleichmäßig verteilt, sind aber keine eigenen Karten im 8er-Raster.

Prüfung: `dashboard/test/layout_check.mjs` misst die Bounding-Boxes bei 1920×1080, 1536×1024, 1366×768, 1024×768 und 390×844. Kriterien: Rasterlinien innerhalb jedes Bereichs **und bereichsübergreifend** (linke/rechte Kanten) ±1 px, kein Überlauf in Karten, keine abgeschnittenen Texte, kein horizontales Scrollen.
