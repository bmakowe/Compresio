# Compresio – Branding

<p>
  <img src="logo-horizontal.svg" alt="Compresio" width="320">
</p>

| | |
|---|---|
| **Produktname** | Compresio (immer so geschrieben: großes C, sonst klein, ein Wort) |
| **Untertitel** | Smart Compressor Monitoring & Diagnostics |
| **Kennzeichnung** | Source Available (keine Open-Source-Lizenz im Sinne der OSI) |

Alle Dateien in diesem Verzeichnis erzeugt `tools/build_branding.mjs` (`node tools/build_branding.mjs`). Änderungen am Logo nur dort vornehmen und die Dateien neu erzeugen. Das Symbol im Dashboard-Kopf (`dashboard/cards/src/main.js`, `LOGO`) ist eine Kopie der Variante für dunkle Hintergründe.

## Logo-Konzept
Das Symbol verbindet Kompressormechanik und Monitoring:
- **„C“ als Zylinderwand:** ein offener Ring, zugleich Anfangsbuchstabe von Compresio.
- **Kolben:** ein Balken, der von rechts in den Zylinder einfährt.
- **Digitale Bewegungsspur:** zwei abgestufte, kleiner werdende Balken hinter dem Kolben. Sie stehen für die erfasste und aufgezeichnete Bewegung.

Das Symbol funktioniert ohne Schriftzug. Es zeigt bewusst keine Herstellertechnik im Detail und soll als Softwaremarke wirken, nicht als Marke eines Kompressorherstellers.

## Farbpalette
| Rolle | Name | HEX | Verwendung |
|---|---|---|---|
| Primary | Compresio Blue | `#1685e5` | Symbol im Standardlogo, Akzente im Dashboard |
| Secondary | Deep Blue | `#0b4f8a` | Symbol auf hellen Hintergründen |
| Accent | Signal Teal | `#0f9a90` | Kolben im Standardlogo |
| Accent hell | Signal Teal Light | `#2fd6c8` | Kolben auf dunklen Hintergründen |
| Accent dunkel | Signal Teal Dark | `#0f8f86` | Kolben auf hellen Hintergründen |
| Blau hell | Light Blue | `#55b5ff` | Symbol auf dunklen Hintergründen |
| Background | Anthrazit-Blau | `#081522` | dunkle Flächen, Favicon, Social Preview |
| Surface | Panel | `#0d2030` | Karten und Flächen im Dashboard |
| Foreground | Hellgrau | `#f3f7fc` | Text auf Dunkel |
| Ink | Tintenblau | `#0b1b2b` | Text auf Hell |

Die Palette baut auf dem bestehenden Dashboard-Theme auf (`dashboard/cards/src/styles.js`). Sie übernimmt keine Markenfarben von Home Assistant, Grafana oder anderen Projekten.

**Kontraste (WCAG 2.x):** Für Grafik gilt mindestens 3 : 1, für Text 4,5 : 1.

| Kombination | Kontrast |
|---|---|
| Primary auf Weiß / auf Background | 3,80 / 4,84 |
| Accent auf Weiß / auf Background | 3,47 / 5,30 |
| Deep Blue auf Weiß | 8,40 |
| Signal Teal Dark auf Weiß | 3,97 |
| Light Blue / Signal Teal Light auf Background | 8,28 / 10,15 |
| Foreground auf Background, Ink auf Weiß (Text) | 17,1 / 17,4 |

## Typografie
- **Schriftzug „Compresio“:** eine eigene geometrische Linienschrift aus SVG-Pfaden mit gleichmäßiger Strichstärke und runden Enden. Die Formen passen zum Ring des Symbols. Es ist **keine Schriftart eingebettet** und keine Schriftlizenz nötig. Die Pfade stehen in `tools/build_branding.mjs` (`GLYPHS`).
- **Fließtext und Untertitel** (Social Preview, Dashboard, Website): die Systemschrift (`-apple-system, "Segoe UI", Helvetica, Arial, sans-serif`). Den Untertitel nicht im Schriftzug-Stil nachbauen.

## Dateien
| Datei | Inhalt | Einsatz |
|---|---|---|
| `logo.svg` | Symbol, Standardfarben, transparent, 1 : 1 | allgemein, auf hellen und dunklen Hintergründen |
| `logo-light.svg` | Symbol für helle Hintergründe | Dokumente, Druck, helle Webseiten |
| `logo-dark.svg` | Symbol für dunkle Hintergründe | Dashboard, dunkle Webseiten |
| `logo-512.png`, `logo-1024.png` | Standardsymbol als PNG, transparent | Avatare, App-Icons, Präsentationen |
| `logo-horizontal.svg` | Symbol + Schriftzug für helle Hintergründe | README (Hellmodus), Dokumente |
| `logo-horizontal-dark.svg` | Symbol + Schriftzug für dunkle Hintergründe | README (Dunkelmodus), dunkle Flächen |
| `favicon.svg` | vereinfacht (ohne Bewegungsspur, kräftigerer Strich) auf dunkler Fläche | Browser-Tab, Lesezeichen, Website |
| `social-preview.png` | 1280 × 640 px, sRGB, ca. 60 KB | GitHub Social Preview, LinkedIn |

Alle SVGs: keine externen Ressourcen, keine Rasterbilder, keine Schriftarten, `viewBox`-skaliert.

## Mindestgrößen und Schutzraum
- **Symbol:** mindestens 24 px. Darunter (16–24 px) `favicon.svg` verwenden.
- **Horizontales Logo:** mindestens 120 px breit.
- **Schutzraum:** rundherum mindestens die halbe Kolbenhöhe des Symbols (bei 64 px Symbolhöhe also 5 px; besser die Strichstärke des Rings, 8 px). In den Schutzraum kommen keine Texte, Kanten oder anderen Logos.

## Helle und dunkle Hintergründe
- Auf **hellen** Hintergründen: `logo-light.svg` bzw. `logo-horizontal.svg`.
- Auf **dunklen** Hintergründen: `logo-dark.svg` bzw. `logo-horizontal-dark.svg`.
- Auf **unruhigen oder unbekannten** Hintergründen (Fotos): `favicon.svg` mit eigener Fläche oder das Logo auf einer ruhigen Fläche platzieren.
- Nicht erlaubt: das Logo verzerren, drehen, umfärben, mit Schatten oder 3D-Effekten versehen, Teile entfernen oder den Schriftzug durch eine andere Schrift ersetzen.

## GitHub Social Preview
`social-preview.png` enthält das Symbol, den Schriftzug, den Untertitel, die Technologien als reinen Text (Home Assistant · Node-RED · InfluxDB · Grafana) und die Kennzeichnung „SOURCE AVAILABLE“. Fremde Logos sind nicht enthalten. Hochladen: Repository → Settings → General → Social preview → Edit → Upload an image.

## Markenrichtlinie
Diese Richtlinie ergänzt [LICENSE](../../LICENSE) Nr. 8.

1. Name und Logo „Compresio“ kennzeichnen das Projekt des Rechteinhabers Björn Makowe.
2. Weder die Compresio Community License noch eine kommerzielle Lizenz räumen Rechte an Name und Logo ein, soweit im Einzelvertrag nichts anderes vereinbart ist.
3. Erlaubt ist ein **sachlicher Hinweis** auf das Projekt, z. B. „basiert auf Compresio“ oder ein Link auf das Repository.
4. Veränderte Versionen und Forks dürfen **nicht** unter dem Namen oder mit dem Logo „Compresio“ verbreitet werden und nicht den Eindruck erwecken, offiziell zu sein.
5. Name und Logo dürfen nicht für Produkte, Dienstleistungen oder Werbung genutzt werden, die eine Zertifizierung, Sicherheitsfunktion oder garantierte Betriebssicherheit nahelegen ([DISCLAIMER.md](../../DISCLAIMER.md)).
