// Fester Einstiegspunkt (wird von HA lange gecacht). Lädt die aktuelle Version des Bundles ohne Cache-Probleme.
// Top-Level-await: HA erzeugt das Panel-Element erst, wenn die Komponente definiert ist.
const base = new URL('.', import.meta.url).pathname;
let v = 'dev';
try {
  const r = await fetch(`${base}version.json`, { cache: 'no-store' });
  if (r.ok) v = (await r.json()).version;
} catch (e) { /* offline → letzte gecachte Version */ }
await import(`${base}kompressorraum.js?v=${encodeURIComponent(v)}`);
