// Zugang für die UI-Tests: HA_URL und HA_TOKEN aus der lokalen .env (Projektwurzel) oder aus Umgebungsvariablen.
import fs from 'node:fs';
import path from 'node:path';

const file = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..', '.env');
const env = fs.existsSync(file)
  ? Object.fromEntries(fs.readFileSync(file, 'utf8').split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
  : {};
export const BASE = (process.env.HA_URL || env.HA_URL || '').replace(/\/$/, '');
export const TOKEN = process.env.HA_TOKEN || env.HA_TOKEN || '';
if (!BASE || !TOKEN) { console.error('HA_URL und HA_TOKEN fehlen (.env anlegen, Vorlage: .env.example)'); process.exit(1); }
