import { chromium } from 'playwright';
import { BASE, TOKEN } from './env.mjs';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1536, height: 1024 } });
await ctx.addInitScript(([base, token]) => { localStorage.setItem('hassTokens', JSON.stringify({ access_token: token, token_type: 'Bearer', expires_in: 1800, hassUrl: base, clientId: base + '/', expires: Date.now() + 1e10, refresh_token: '' })); localStorage.setItem('dockedSidebar', '"always_hidden"'); }, [BASE, TOKEN]);
const p = await ctx.newPage(); p.on('console', (m) => console.log('[console]', m.type(), m.text().slice(0, 300)));
await p.goto(`${BASE}/vereinsheim-kompressorraum/kompressor#${process.argv[2] || 'uebersicht'}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(6000);
const r = await p.evaluate(process.argv[3] || `(() => {
  const find = (root) => { const el = root.querySelector('kompressorraum-card'); if (el) return el; for (const n of root.querySelectorAll('*')) if (n.shadowRoot) { const r = find(n.shadowRoot); if (r) return r; } return null; };
  const el = find(document); const ch = el.view.diag.charts;
  return Object.fromEntries(Object.entries(ch).map(([k, c]) => [k, c.chart.w.config.series.map(s => s.name + ':' + (s.data||[]).length)]));
})()`);
console.log(JSON.stringify(r, null, 1)); await b.close();
