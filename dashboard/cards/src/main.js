// Compresio-Dashboard – Web Component für Home Assistant
//  Lovelace-Karte: type: custom:kompressorraum-card (in HA als Dashboard „Kompressorraum“, Panel-Ansicht)
// Datenquellen ausschließlich HA-Entitäten/-APIs, keine Cloud, alles lokal ausgeliefert.
import { STYLES } from './styles.js';
import { COMPRESSOR_CSS } from './components/compressor.js';
import { mergeConfig } from './config.js';
import { st, navigate } from './util.js';
import { OverviewView } from './views/overview.js';
import { DiagnoseView } from './views/diagnose.js';
import { VerlaeufeView } from './views/verlaeufe.js';
import { WartungView } from './views/wartung.js';
import { EreignisseView } from './views/ereignisse.js';
import { SystemView } from './views/system.js';

export const VERSION = '1.0.0';

const VIEWS = {
  uebersicht: { label: 'Übersicht', icon: 'mdi:compass-outline', cls: OverviewView },
  diagnose: { label: 'Diagnose', cls: DiagnoseView },
  verlaeufe: { label: 'Verläufe', cls: VerlaeufeView },
  wartung: { label: 'Wartung', cls: WartungView },
  ereignisse: { label: 'Ereignisse', cls: EreignisseView },
  system: { label: 'System', cls: SystemView },
};

// Compresio-Symbol (Quelle: tools/build_branding.mjs, Variante für dunkle Hintergründe)
const LOGO = `<svg width="46" height="46" viewBox="0 0 64 64" aria-hidden="true">
  <path d="M47.6 16.4A22 22 0 1 0 47.6 47.6" fill="none" stroke="#55b5ff" stroke-width="8" stroke-linecap="round"/>
  <rect x="28" y="27" width="30" height="10" rx="2.5" fill="#2fd6c8"/>
  <rect x="22" y="27" width="4" height="10" rx="1.5" fill="#2fd6c8" fill-opacity=".65"/>
  <rect x="16" y="27" width="3" height="10" rx="1.5" fill="#2fd6c8" fill-opacity=".35"/></svg>`;

class CompresioApp extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.cfg = mergeConfig({});
    this.range = sessionStorage.getItem('kompressorraum-range') || '1h';
    this.custom = null;
    this.viewKey = null;
    this._raf = null;
  }

  // ---- Lovelace-Karte
  setConfig(config) { this.cfg = mergeConfig(config || {}); this.isCard = true; }
  getCardSize() { return 20; }
  static getStubConfig() { return {}; }

  // ---- Custom Panel
  set panel(p) { this._panel = p; this.cfg = mergeConfig(p?.config || {}); }
  set narrow(n) { this._narrow = n; this.shadowRoot.querySelector('.menu-btn')?.toggleAttribute('hidden', !n); }
  set route(r) { this._route = r; if (this._built) this.showView(this.viewFromRoute()); }

  set hass(h) {
    const first = !this._hass;
    this._hass = h;
    if (!this._built) this.build();
    // Ansicht erst aufbauen, wenn die Karte im Dokument hängt (ApexCharts benötigt ein eingehängtes Element)
    if (first && this.isConnected) this.showView(this.viewFromRoute());
    if (!this._raf) this._raf = requestAnimationFrame(() => { this._raf = null; this.updateAll(); });
  }
  get hass() { return this._hass; }

  connectedCallback() {
    // Eigenschaften, die HA vor der Registrierung gesetzt hat, an die Setter weiterreichen
    for (const p of ['panel', 'narrow', 'route', 'hass']) {
      if (Object.prototype.hasOwnProperty.call(this, p)) { const v = this[p]; delete this[p]; this[p] = v; }
    }
    this._clock = setInterval(() => this.updateClock(), 1000);
    if (this._hass && !this.view) { if (!this._built) this.build(); requestAnimationFrame(() => this.showView(this.viewFromRoute())); }
    this._onLoc = () => this.showView(this.viewFromRoute());
    window.addEventListener('location-changed', this._onLoc);
    window.addEventListener('popstate', this._onLoc);
  }
  disconnectedCallback() {
    clearInterval(this._clock);
    window.removeEventListener('location-changed', this._onLoc);
    window.removeEventListener('popstate', this._onLoc);
    this.view?.destroy();
    this.view = null; this.viewKey = null;
  }

  basePath() {
    if (this._route?.prefix) return this._route.prefix;
    return location.pathname.split('/').slice(0, 2).join('/');
  }

  viewFromRoute() {
    let key;
    if (this.isCard) key = location.hash.replace('#', '');
    else key = (this._route?.path || '').split('/').filter(Boolean)[0];
    return VIEWS[key] ? key : 'uebersicht';
  }

  go(key) {
    if (!VIEWS[key]) return;
    if (this.isCard) { location.hash = key; this.showView(key); return; }
    navigate(`${this.basePath()}/${key}`);
  }

  setRange(k, custom) {
    this.range = k; this.custom = custom || null;
    if (k !== 'custom') sessionStorage.setItem('kompressorraum-range', k);
  }

  build() {
    this._built = true;
    if (this.isCard) this.setAttribute('card', '');   // in Lovelace: HA-Kopfleiste ist vorhanden
    const nav = Object.entries(VIEWS).map(([k, v]) =>
      `<button data-view="${k}">${v.icon ? `<ha-icon icon="${v.icon}" style="--mdc-icon-size:18px"></ha-icon>` : ''}${v.label}</button>`).join('');
    this.shadowRoot.innerHTML = `<style>${STYLES}${COMPRESSOR_CSS}
      ha-icon { --mdc-icon-size: 24px; }
      .li ha-icon { --mdc-icon-size: 26px; color: var(--t-blue-light); }
      .mini ha-icon { --mdc-icon-size: 32px; color: var(--t-blue-light); }
      .sb ha-icon { --mdc-icon-size: 28px; }
      .ico-round ha-icon { --mdc-icon-size: 26px; }
      .cal ha-icon { --mdc-icon-size: 22px; }</style>
    <div class="app">
      <header class="hdr">
        <div class="brand"><button class="menu-btn" hidden title="Menü"><ha-icon icon="mdi:menu"></ha-icon></button>${LOGO}
          <div><h1>${this.cfg.title}</h1><p>${this.cfg.subtitle}</p></div></div>
        <nav class="nav">${nav}</nav>
        <div class="hdr-right">
          <div class="sim-box"><span class="sim-tag">AKTIV</span><span>Simulation</span><button class="toggle" data-sim title="Simulation ein-/ausschalten"></button></div>
          <div class="clock"><div data-clock="d"></div><div data-clock="t"></div></div>
        </div>
      </header>
      <div class="simbar" hidden><ha-icon icon="mdi:test-tube" style="--mdc-icon-size:18px"></ha-icon>
        SIMULATION AKTIV – alle angezeigten Messwerte sind synthetische Testdaten, keine realen Messungen.</div>
      <main class="main"></main>
      <div class="toast" hidden></div>
    </div>`;
    const sr = this.shadowRoot;
    sr.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => this.go(b.dataset.view)));
    sr.querySelector('.menu-btn').addEventListener('click', () => this.dispatchEvent(new Event('hass-toggle-menu', { bubbles: true, composed: true })));
    sr.querySelector('.menu-btn').toggleAttribute('hidden', !this._narrow);
    sr.querySelector('[data-sim]').addEventListener('click', () => this.toggleSim());
    this.updateClock();
  }

  showView(key) {
    if (!this._built || !this._hass || key === this.viewKey) return;
    this.view?.destroy();
    this.viewKey = key;
    const main = this.shadowRoot.querySelector('.main');
    this.view = new VIEWS[key].cls(this);
    main.innerHTML = this.view.render();
    this.shadowRoot.querySelectorAll('[data-view]').forEach((b) => b.classList.toggle('active', b.dataset.view === key));
    this.view.mount(main);
    this.updateAll();
    main.scrollTop = 0;
  }

  updateAll() {
    const h = this._hass;
    if (!h || !this.view) return;
    const E = this.cfg.entities;
    const sim = st(h, E.sim_switch), src = st(h, E.source)?.state;
    const t = this.shadowRoot.querySelector('[data-sim]');
    t.classList.toggle('on', sim?.state === 'on');
    t.disabled = !sim || sim.state === 'unavailable';
    this.shadowRoot.querySelector('.sim-box').classList.toggle('active', sim?.state === 'on');
    this.shadowRoot.querySelector('.simbar').hidden = !(src === 'simulation' || sim?.state === 'on');
    try { this.view.update(h); } catch (e) { console.error('Compresio update', e); }
  }

  async toggleSim() {
    const E = this.cfg.entities, on = st(this._hass, E.sim_switch)?.state === 'on';
    if (!on && st(this._hass, E.source)?.state === 'real') {
      if (!confirm('Es treffen reale Messwerte ein. Simulation trotzdem einschalten?')) return;
    }
    await this._hass.callService('switch', on ? 'turn_off' : 'turn_on', { entity_id: E.sim_switch });
    this.toast(on ? 'Simulation ausgeschaltet' : 'Simulation eingeschaltet');
  }

  updateClock() {
    const d = new Date(), sr = this.shadowRoot;
    const a = sr.querySelector('[data-clock="d"]'), b = sr.querySelector('[data-clock="t"]');
    if (!a) return;
    a.textContent = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    b.textContent = d.toLocaleTimeString('de-DE');
  }

  toast(msg) {
    const t = this.shadowRoot.querySelector('.toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(this._tt); this._tt = setTimeout(() => (t.hidden = true), 3500);
  }
}

if (!customElements.get('kompressorraum-card')) {
  customElements.define('kompressorraum-card', class extends CompresioApp {});
  window.customCards = window.customCards || [];
  window.customCards.push({ type: 'kompressorraum-card', name: 'Compresio', description: 'Smart Compressor Monitoring & Diagnostics' });
  console.info(`%c Compresio ${VERSION} `, 'background:#1685e5;color:#fff;border-radius:3px');
}
