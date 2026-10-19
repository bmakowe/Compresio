import { chromium } from 'playwright';
import { BASE, TOKEN } from './env.mjs';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1536, height: 1024 }, serviceWorkers: 'block' });
await ctx.addInitScript(([base, token]) => localStorage.setItem('hassTokens', JSON.stringify({ access_token: token, token_type: 'Bearer', expires_in: 1800, hassUrl: base, clientId: base + '/', expires: Date.now() + 1e10, refresh_token: '' })), [BASE, TOKEN]);
const p = await ctx.newPage(); const dialogs = [];
p.on('dialog', async (d) => { dialogs.push(d.message().split('\n')[0]); await d.accept(); });
const ok = (n, c, x = '') => console.log((c ? 'OK     ' : 'FEHLER ') + n, x);
await p.goto(`${BASE}/vereinsheim-kompressorraum/kompressor#uebersicht`, { waitUntil: 'networkidle' }); await p.waitForTimeout(5000);
const st = async () => (await p.locator('kompressorraum-card [data-b="rl"]').textContent()).trim();
const btn = p.locator('kompressorraum-card [data-act="release"]');
ok('Ausgangszustand', true, `${await st()} / Knopf „${(await btn.textContent()).trim()}“`);
if ((await btn.textContent()).trim() === 'Sperren') { await btn.click(); await p.waitForTimeout(8000); }
await btn.click(); await p.waitForTimeout(8000);
ok('Knopf „Freigeben“ → Freigegeben', (await st()) === 'Freigegeben', `${await st()} · Dialog: ${dialogs.at(-1)}`);
await p.screenshot({ path: 'shots/freigabe-ein.png' });
await btn.click(); await p.waitForTimeout(8000);
ok('Knopf „Sperren“ → Gesperrt', (await st()) === 'Gesperrt', `${await st()} · Dialog: ${dialogs.at(-1)}`);
await b.close();
