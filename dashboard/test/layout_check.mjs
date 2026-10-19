// Geometrie-Prüfung der Übersicht: Rasterlinien (±1 px), Überlauf, abgeschnittene Texte, horizontales Scrollen.
//   node layout_check.mjs            (alle Auflösungen)
import { chromium } from 'playwright';
import { BASE, TOKEN } from './env.mjs';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';

const SIZES = [[1920, 1080], [1536, 1024], [1366, 768], [1024, 768], [390, 844]];
const TOL = 1;
const b = await chromium.launch();
let total = 0;
for (const [w, h] of SIZES) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block', isMobile: w < 500, hasTouch: w < 500 });
  await ctx.addInitScript(([base, token]) => { localStorage.setItem('hassTokens', JSON.stringify({ access_token: token, token_type: 'Bearer', expires_in: 1800, hassUrl: base, clientId: base + '/', expires: Date.now() + 1e10, refresh_token: '' })); localStorage.setItem('dockedSidebar', '"always_hidden"'); }, [BASE, TOKEN]);
  const p = await ctx.newPage();
  await p.goto(`${BASE}/vereinsheim-kompressorraum/kompressor#uebersicht`, { waitUntil: 'networkidle' }); await p.waitForTimeout(5000);
  const r = await p.evaluate((TOL) => {
    const find = (root) => { const el = root.querySelector('kompressorraum-card'); if (el) return el; for (const n of root.querySelectorAll('*')) if (n.shadowRoot) { const x = find(n.shadowRoot); if (x) return x; } return null; };
    const sr = find(document).shadowRoot, issues = [];
    const R = (el) => el.getBoundingClientRect();
    // Rasterlinien eines Grid-Containers prüfen
    const grid = (sel, name) => {
      const g = sr.querySelector(sel); if (!g) return;
      const kids = [...g.children].filter((k) => k.offsetParent !== null);
      const rows = {}, cols = {};
      const add = (map, key, val, who) => { (map[key] ||= []).push([val, who]); };
      for (const k of kids) {
        const cs = getComputedStyle(k), rc = R(k);
        // tatsächliche Linien aus Position bestimmen (robust gegenüber auto-Platzierung)
        add(rows, 't' + Math.round(rc.top), rc.top, k.className.split(' ').slice(-1)[0]);
        add(rows, 'b' + Math.round(rc.bottom), rc.bottom, k.className.split(' ').slice(-1)[0]);
        add(cols, 'l' + Math.round(rc.left), rc.left, k.className.split(' ').slice(-1)[0]);
        add(cols, 'r' + Math.round(rc.right), rc.right, k.className.split(' ').slice(-1)[0]);
      }
      // Kanten clustern: Kanten, die < 8 px auseinanderliegen, müssen ≤ TOL übereinstimmen
      const check = (map, label) => {
        const vals = Object.values(map).flat().sort((a, b) => a[0] - b[0]);
        for (let i = 1; i < vals.length; i++) {
          const d = vals[i][0] - vals[i - 1][0];
          if (d > TOL && d < 8) issues.push(`${name}: ${label}-Kanten weichen um ${d.toFixed(1)} px ab (${vals[i - 1][1]} / ${vals[i][1]})`);
        }
      };
      check(rows, 'horizontale'); check(cols, 'vertikale');
      return kids.length;
    };
    const n = { kpis: grid('.kpis', 'Statuskarten'), mid: grid('.mid', 'Mittelteil'), gauges: grid('.gauges-8', 'Instrumente'), status: grid('.statusbar', 'Statusleiste') };
    // BEREICHSÜBERGREIFEND: senkrechte Kanten von Statuskarten, Mittelteil und Instrumenten müssen ein gemeinsames Raster bilden
    const v = [];
    for (const [sel, name] of [['.kpis', 'Statuskarten'], ['.mid', 'Mittelteil'], ['.gauges-8', 'Instrumente']]) {
      const g = sr.querySelector(sel); if (!g) continue;
      for (const k of g.children) { if (k.offsetParent === null) continue; const rc = R(k); v.push(['links', rc.left, name], ['rechts', rc.right, name]); }
    }
    for (const side of ['links', 'rechts']) {           // linke mit linken, rechte mit rechten Kanten vergleichen
      const e = v.filter((x) => x[0] === side).sort((a, b) => a[1] - b[1]);
      for (let i = 1; i < e.length; i++) {
        const d = e[i][1] - e[i - 1][1];
        if (d > TOL && d < 40 && e[i][2] !== e[i - 1][2]) issues.push(`Kreuz nicht sauber: ${side}e Kante ${e[i - 1][2]} ${e[i - 1][1].toFixed(0)} px vs. ${e[i][2]} ${e[i][1].toFixed(0)} px (Δ ${d.toFixed(1)})`);
      }
    }
    // Mittelteil desktop: Gesamthöhe Visualisierung = rechte Spalten
    const vis = sr.querySelector('.m-vis'), c4 = sr.querySelector('.m-c4'), room = sr.querySelector('.m-room'), c1 = sr.querySelector('.m-c1');
    const midInfo = vis && c4 ? { vis: [Math.round(R(vis).top), Math.round(R(vis).bottom)], rechts: [Math.round(R(c1).top), Math.round(R(c4).bottom)], raum: [Math.round(R(room).top), Math.round(R(room).bottom)] } : null;
    // SVG vollständig innerhalb der Karte
    const svg = sr.querySelector('.vis-box svg'), vb = sr.querySelector('.m-vis');
    if (svg && vb) { const a = R(svg), c = R(vb); if (a.left < c.left - TOL || a.right > c.right + TOL || a.top < c.top - TOL || a.bottom > c.bottom + TOL) issues.push('SVG ragt über die Karte'); }
    // Überlauf in Karten / abgeschnittene Texte
    for (const el of sr.querySelectorAll('.ov-main .card')) {
      if (el.scrollHeight > el.clientHeight + 1 && !el.querySelector('.apexcharts-canvas')) issues.push(`Inhalt höher als Karte: ${el.className}`);
    }
    for (const el of sr.querySelectorAll('.ov-main .k, .ov-main .v, .ov-main .gl, .ov-main .lbl, .ov-main .sub, .ov-main .t2, .ov-main .val')) {
      if (el.scrollWidth > el.clientWidth + 1 && el.textContent.trim()) issues.push(`Text abgeschnitten: „${el.textContent.trim().slice(0, 30)}“ (${el.className})`);
    }
    const hscroll = document.scrollingElement.scrollWidth > window.innerWidth + 1;
    if (hscroll) issues.push('horizontales Scrollen der Seite');
    return { n, midInfo, issues };
  }, TOL);
  total += r.issues.length;
  console.log(`\n== ${w}×${h}  Karten: ${JSON.stringify(r.n)}  Mittelteil(y): ${JSON.stringify(r.midInfo)}`);
  console.log(r.issues.length ? r.issues.map((x) => '  ✗ ' + x).join('\n') : '  ✓ alle Rasterlinien ±1 px, kein Überlauf, keine abgeschnittenen Texte');
  await p.screenshot({ path: `shots/layout-${w}x${h}.png`, fullPage: false });
  await ctx.close();
}
await b.close();
console.log(`\nGesamt: ${total} Befund(e)`);
