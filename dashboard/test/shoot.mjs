// UI-Test: öffnet alle Ansichten im headless Chromium, prüft JS-Fehler/defekte Ressourcen, erstellt Screenshots.
//   node shoot.mjs [ansicht ...] [--size=1536x1024] [--sidebar]
// Anmeldung: HA_URL/HA_TOKEN aus .env (siehe env.mjs) → localStorage hassTokens (nur lokal im Testbrowser).
import { chromium } from 'playwright';
import { BASE, TOKEN } from './env.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const views = args.filter((a) => !a.startsWith('--'));
const size = (args.find((a) => a.startsWith('--size=')) || '--size=1536x1024').split('=')[1].split('x').map(Number);
const showSidebar = args.includes('--sidebar');
const list = views.length ? views : ['uebersicht', 'diagnose', 'verlaeufe', 'wartung', 'ereignisse', 'system'];
const outDir = path.join(path.dirname(new URL(import.meta.url).pathname), 'shots');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: size[0], height: size[1] }, deviceScaleFactor: 1, locale: 'de-DE', timezoneId: 'Europe/Berlin', colorScheme: 'dark', serviceWorkers: 'block' });
await ctx.addInitScript(([base, token, sidebar]) => {
  localStorage.setItem('hassTokens', JSON.stringify({ access_token: token, token_type: 'Bearer', expires_in: 1800, hassUrl: base, clientId: base + '/', expires: Date.now() + 1e10, refresh_token: '' }));
  localStorage.setItem('dockedSidebar', sidebar ? '"docked"' : '"always_hidden"');
  localStorage.setItem('selectedLanguage', '"de"');
}, [BASE, TOKEN, showSidebar]);
const page = await ctx.newPage();
const problems = [];
page.on('console', (m) => { if (m.type() === 'error' || (m.type() === 'warning' && /kompressor|apex/i.test(m.text()))) problems.push(`[console.${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => problems.push(`[pageerror] ${e.message}`));
page.on('response', (r) => { if (r.status() >= 400 && !r.url().includes('/auth/')) problems.push(`[HTTP ${r.status()}] ${r.url()}`); });

for (const v of list) {
  await page.goto(`${BASE}/vereinsheim-kompressorraum/kompressor#${v}`, { waitUntil: 'networkidle', timeout: 60000 }).catch((e) => problems.push(`[goto] ${v}: ${e.message}`));
  await page.waitForTimeout(v === 'uebersicht' || v === 'diagnose' ? 6000 : 4000);
  const file = path.join(outDir, `${v}-${size[0]}x${size[1]}.png`);
  await page.screenshot({ path: file, fullPage: args.includes('--full') });
  const info = await page.evaluate(() => {
    const p = document.querySelector('home-assistant')?.shadowRoot?.querySelector('home-assistant-main')?.shadowRoot?.querySelector('ha-panel-custom kompressorraum-card, kompressorraum-card');
    const find = (root) => { if (!root) return null; const el = root.querySelector('kompressorraum-card'); if (el) return el; for (const n of root.querySelectorAll('*')) if (n.shadowRoot) { const r = find(n.shadowRoot); if (r) return r; } return null; };
    const el = p || find(document);
    if (!el) return { found: false };
    const sr = el.shadowRoot;
    return { found: true, active: sr.querySelector('.nav button.active')?.textContent?.trim(), charts: sr.querySelectorAll('.apexcharts-canvas').length,
             height: sr.querySelector('.app')?.scrollHeight };
  });
  console.log(`${v}: ${JSON.stringify(info)} → ${path.basename(file)}`);
}
console.log(problems.length ? `PROBLEME (${problems.length}):\n` + [...new Set(problems)].join('\n') : 'Keine JS-Fehler / defekten Ressourcen');
await browser.close();
