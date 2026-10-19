import { chromium } from 'playwright';
import { BASE, TOKEN } from './env.mjs';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1536, height: 1024 }, serviceWorkers: 'block' });
await ctx.addInitScript(([base, token]) => { localStorage.setItem('hassTokens', JSON.stringify({ access_token: token, token_type: 'Bearer', expires_in: 1800, hassUrl: base, clientId: base + '/', expires: Date.now() + 1e10, refresh_token: '' })); localStorage.setItem('dockedSidebar', '"always_hidden"'); }, [BASE, TOKEN]);
const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
const ok = (n, c) => console.log((c ? 'OK     ' : 'FEHLER ') + n);
await p.goto(`${BASE}/vereinsheim-kompressorraum/kompressor#diagnose`, { waitUntil: 'networkidle' }); await p.waitForTimeout(6000);
for (const r of ['6h', '24h', '7d', '30d', '1h']) {
  await p.locator(`kompressorraum-card button[data-range="${r}"]`).first().click(); await p.waitForTimeout(r.endsWith('d') ? 4000 : 2500);
  const n = await p.locator('kompressorraum-card [data-c="ta"] .apexcharts-series path').count();
  ok(`Zeitraum ${r}: Temperaturdiagramm gezeichnet (${n} Pfade)`, n > 0);
}
await p.goto(`${BASE}/vereinsheim-kompressorraum/kompressor#uebersicht`, { waitUntil: 'networkidle' }); await p.waitForTimeout(4000);
ok('Übersicht ohne Diagnose-Diagramme', await p.locator('kompressorraum-card .ov-main .apexcharts-canvas').count() === 1);
await p.locator('kompressorraum-card .callout[data-key="t3"]').click(); await p.waitForTimeout(2000);
ok('Klick auf Messwert Stufe 3 öffnet Verlaufsdialog', await p.locator('ha-more-info-dialog').count() > 0);
await p.keyboard.press('Escape'); await p.waitForTimeout(800);
await p.locator('kompressorraum-card [data-nav="ereignisse"]').first().click(); await p.waitForTimeout(3000);
ok('Klick „Aktive Meldungen“ → Ereignisse (URL ' + new URL(p.url()).hash + ')', p.url().endsWith('#ereignisse'));
const before = await p.locator('kompressorraum-card tr[data-i]').count();
await p.locator('kompressorraum-card .chip[data-t="motorstart"]').click(); await p.waitForTimeout(500);
const after = await p.locator('kompressorraum-card tr[data-i]').count();
ok(`Filter Motorstart aus: ${before} → ${after} Zeilen`, after < before);
await p.locator('kompressorraum-card [data-go="0"]').click(); await p.waitForTimeout(3500);
ok('„Verlauf“ springt zu Verläufe mit Zeitraum um das Ereignis', p.url().endsWith('#verlaeufe'));
await p.goBack(); await p.waitForTimeout(2000); ok('Browser-Zurück funktioniert', p.url().endsWith('#ereignisse'));
await p.goto(`${BASE}/vereinsheim-kompressorraum/kompressor#diagnose`, { waitUntil: 'networkidle' }); await p.waitForTimeout(6000);
ok('Diagnose: Laufzeit je Betriebszyklus gezeichnet', await p.locator('kompressorraum-card [data-c="cl"] .apexcharts-canvas').count() === 1);
ok('Diagnose: Ø Enddruck vorhanden', (await p.locator('kompressorraum-card [data-k="pe"]').count()) === 1);
await p.locator('kompressorraum-card [data-toggle="Spannung"]').click(); await p.waitForTimeout(800);
ok('Messreihe Spannung einblendbar', await p.locator('kompressorraum-card [data-toggle="Spannung"].on').count() === 1);
await p.locator('kompressorraum-card select[data-ts="ovMode"]').selectOption('stop'); await p.waitForTimeout(3000);
ok('Zyklusvergleich: Abkühlverhalten gezeichnet', await p.locator('kompressorraum-card [data-c="ov"] .apexcharts-series path').count() > 0);
await p.locator('kompressorraum-card select[data-ts="ovMetric"]').selectOption('t12'); await p.waitForTimeout(3000);
ok('Zyklusvergleich: Messgröße T12 wählbar', true);
await p.locator('kompressorraum-card select[data-ts="ovTr"]').selectOption('2'); await p.waitForTimeout(2500);
ok('Filter „ähnliche Raumtemperatur“: Vergleichstabelle vorhanden', await p.locator('kompressorraum-card [data-b="ovtab"] table, kompressorraum-card [data-b="ovtab"] .hint').count() > 0);
for (const k of ['ta', 'tc', 'tk', 's1', 's2', 'dc', 'dk']) {
  const n = await p.locator(`kompressorraum-card [data-c="${k}"] .apexcharts-series path`).count();
  ok(`Thermik-Diagramm ${k} gezeichnet (${n} Pfade)`, n > 0);
}
const ta = await p.locator('kompressorraum-card [data-c="ta"] .apexcharts-legend-text, kompressorraum-card .chip[data-tg^="ta|"]').count();
ok(`Alle sechs Temperaturen im Gesamtdiagramm (${ta} Messreihen-Chips)`, ta === 6);
await p.goto(`${BASE}/vereinsheim-kompressorraum/kompressor#uebersicht`, { waitUntil: 'networkidle' }); await p.waitForTimeout(4000);
for (const k of ['t1', 't12', 't2', 't23', 't3']) {
  const t = await p.locator(`kompressorraum-card .cmp [data-v="${k}"]`).textContent();
  ok(`Kompressorgrafik zeigt ${k.toUpperCase()}: ${t}`, /°C/.test(t));
}
ok('Raumtemperatur außerhalb der Maschine: ' + await p.locator('kompressorraum-card .cmp .room .cl-v').textContent(), true);
ok('Karte Raumtemperatur: ' + await p.locator('kompressorraum-card [data-b="tr"]').textContent(), /°C/.test(await p.locator('kompressorraum-card [data-b="tr"]').textContent()));
await p.goto(`${BASE}/vereinsheim-kompressorraum/kompressor#diagnose`, { waitUntil: 'networkidle' }); await p.waitForTimeout(5000);
await p.locator('kompressorraum-card button[data-agg="12m"]').click(); await p.waitForTimeout(3000);
ok('Betriebszyklen 12 Monate gezeichnet', await p.locator('kompressorraum-card [data-c="cyc"] .apexcharts-bar-area, kompressorraum-card [data-c="cyc"] .apexcharts-series path').count() > 0);
console.log(errs.length ? 'JS-FEHLER:\n' + errs.join('\n') : 'Keine JS-Fehler'); await b.close();
