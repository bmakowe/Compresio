# Lizenzierung – Analyse und Empfehlung

> **Keine Rechtsberatung.** Diese Analyse bereitet eine Entscheidung vor. Vor der Veröffentlichung ist eine rechtliche Prüfung vorgesehen (siehe [legal-review.md](legal-review.md)).

## Festlegungen des Rechteinhabers (Björn Makowe, private Entwicklung)
| # | Anforderung |
|---|---|
| A1 | Kostenlos für **jeden eingetragenen Verein (e.V.)** für seinen eigenen Vereinsbetrieb, unabhängig von der Gemeinnützigkeit, auch bei Flaschenfüllung gegen Entgelt und auch wenn er einer Tauchschule angegliedert ist |
| A2 | Kostenlos für **Privatpersonen** zur privaten Nutzung |
| A3 | **Nicht** kostenlos für nicht eingetragene Vereine; **keine verdeckte gewerbliche Nutzung**, d. h. kein Betrieb durch oder für eine Tauchschule über einen Verein |
| A4 | Installation, Betrieb, Vervielfältigung, Veränderung, eigene Erweiterungen, Veröffentlichung und Weitergabe erlaubt (für Berechtigte) |
| A5 | Weitergabe veränderter Versionen nur unter den Community-Bedingungen (keine restriktivere Neulizenzierung) |
| A6 | Jede gewerbliche Nutzung lizenzpflichtig, **auch rein interne** |
| A7 | Parallele kommerzielle Lizenz per Einzelvertrag (Dual Licensing) |

Eine Lizenz mit Nutzungsbeschränkungen ist **keine Open-Source-Lizenz im Sinne der OSI**. Das Projekt heißt deshalb **„Source Available“**.

## Geprüfte bestehende Lizenzen
| Anforderung | PolyForm Noncommercial 1.0.0 | PolyForm Strict 1.0.0 | Prosperity 3.0.0 | CC BY-NC-SA 4.0 | GPL/AGPL + Commons Clause | Business Source License 1.1 |
|---|---|---|---|---|---|---|
| A1 nur e.V. kostenlos | ⚠ **zu weit**: erlaubt *alle* nichtkommerziellen Zwecke und u. a. Bildungseinrichtungen, Behörden, „charitable organizations“; ⚠ **zu eng**: e.V. mit Entgelt-Füllung evtl. „kommerziell“ | wie PolyForm NC | wie PolyForm NC | ⚠ wie PolyForm NC | ✘ jeder darf nutzen | ⚠ nur über frei formulierten „Additional Use Grant“ |
| A2 Privatpersonen | ✔ | ✔ | ✔ | ✔ | ✔ | (je nach Grant) |
| A3 Umgehungsverbot (verdeckte gewerbliche Nutzung) | ✘ nicht abbildbar | ✘ | ✘ | ✘ | ✘ | (je nach Grant) |
| A4 Ändern und Weitergeben | ✔ | **✘** | ✔ | ✔ | ✔ | ✔ |
| A5 gleiche Bedingungen | ✘ | – | ✘ | ✔ | ✔ (GPL) | ✘ |
| A6 interne gewerbliche Nutzung ausgeschlossen | ✔ | ✔ | ✘ 30-Tage-Test | ⚠ umstritten | ✘ | ⚠ |
| A7 Dual Licensing | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| für Software geeignet | ✔ | ✔ | ✔ | ✘ | ⚠ | ✔ |

**Ergebnis:** Keine bestehende Lizenz bildet den Kreis der Berechtigten „nur e.V. + Privatpersonen“ ab. Am nächsten kommt die **PolyForm Noncommercial 1.0.0** ([Originaltext](references/PolyForm-Noncommercial-1.0.0.md)). Sie wäre aber an mehreren Stellen zu großzügig: nicht eingetragene nichtkommerzielle Vereinigungen, Schulen und Bildungseinrichtungen, Behörden. Ein e.V. mit entgeltlicher Füllung könnte dagegen als kommerziell gelten. Eine Zusatzerlaubnis kann Rechte nur **erweitern**, nicht einschränken. Die Einschränkung auf e.V. lässt sich mit PolyForm deshalb nicht erreichen.

## Empfehlung
1. **Eigene Community-Lizenz** auf Grundlage des Entwurfs [community-license-draft.md](community-license-draft.md), **anwaltlich ausarbeiten lassen**. Kernpunkte: Berechtigte sind Vereine mit Eintragung im Vereinsregister („e.V.“) für den eigenen Vereinsbetrieb und natürliche Personen für private Zwecke; Umgehungsverbot gegen verdeckte gewerbliche Nutzung; Weitergabe nur unter denselben Bedingungen; Vorbehalt kommerzieller Lizenzen.
   Die Formulierung kann sich an der PolyForm-Struktur orientieren (Rechteeinräumung, Hinweise, Patent, Heilungsfrist, Haftung). Das ist eine **Orientierung**, kein Zusammenkopieren von Lizenztexten.
2. **Kommerzielle Lizenzen** per Einzelvertrag ([commercial-licensing.md](commercial-licensing.md)).
3. **Bis die Lizenz geprüft ist:** `LICENSE` bleibt „alle Rechte vorbehalten“. Einzelne Vereine können bis dahin eine **schriftliche Einzelerlaubnis** erhalten (E-Mail genügt als Nachweis; rechtlich prüfen lassen).

### Alternative mit geringerem Aufwand (nicht empfohlen, dokumentiert)
PolyForm Noncommercial 1.0.0 unverändert verwenden und die abweichende Absicht nur im README beschreiben. **Nachteil:** Rechtlich gilt der Lizenztext, nicht das README. Nicht eingetragene, nichtkommerzielle Vereinigungen, Bildungseinrichtungen und Behörden dürften die Software dann kostenlos nutzen. Das widerspricht A1 und A3.

## Konsequenzen für Formulierungen
- Nicht „Open Source“, sondern „Source Available“ bzw. „Free for Noncommercial Use – Commercial License Required“.
- Die Kurzbeschreibung im README nennt den genauen Kreis: e.V. und Privatpersonen.
- Fremdkomponenten behalten ihre Lizenzen (MIT, Apache-2.0 usw.), siehe [THIRD_PARTY_LICENSES.md](../THIRD_PARTY_LICENSES.md).
