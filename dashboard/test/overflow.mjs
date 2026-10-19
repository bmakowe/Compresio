import { chromium } from 'playwright';
import { BASE, TOKEN } from './env.mjs';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', isMobile: true, hasTouch: true });
await ctx.addInitScript(([base, token]) => localStorage.setItem('hassTokens', JSON.stringify({ access_token: token, token_type: 'Bearer', expires_in: 1800, hassUrl: base, clientId: base + '/', expires: Date.now() + 1e10, refresh_token: '' })), [BASE, TOKEN]);
const p = await ctx.newPage();
for (const v of ['uebersicht', 'diagnose', 'verlaeufe', 'wartung', 'ereignisse', 'system']) {
  await p.goto(`${BASE}/vereinsheim-kompressorraum/kompressor#${v}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(5000);
  const r = await p.evaluate(() => {
    const find = (root) => { const el = root.querySelector('kompressorraum-card'); if (el) return el; for (const n of root.querySelectorAll('*')) if (n.shadowRoot) { const x = find(n.shadowRoot); if (x) return x; } return null; };
    const card = find(document), sr = card.shadowRoot, W = window.innerWidth, bad = [];
    for (const el of sr.querySelectorAll('*')) {
      const rc = el.getBoundingClientRect();
      if (rc.width && rc.right > W + 1 && !el.closest('.scroll, .ranges, .nav, table, .apexcharts-canvas, svg, .chips')) bad.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} →${Math.round(rc.right)}px`);
    }
    return { W, scrollW: document.scrollingElement.scrollWidth, cardW: Math.round(card.getBoundingClientRect().width), bad: [...new Set(bad)].slice(0, 6) };
  });
  console.log(v.padEnd(11), r.bad.length ? 'ÜBERLAUF ' + JSON.stringify(r.bad) : 'ok', `(Karte ${r.cardW}px / Viewport ${r.W}px)`);
  if (v === 'diagnose') await p.screenshot({ path: 'shots/diagnose-mobil.png' });
}
await b.close();
