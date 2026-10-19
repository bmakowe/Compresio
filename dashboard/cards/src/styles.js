// Designsystem (siehe docs/design-system.md). Alle Farben zentral als CSS-Variablen.
export const STYLES = `
:host {
  --t-bg: #081522;
  --t-bg-deep: #06111c;
  --t-panel: #0a1a29;
  --t-card: #0d2030;
  --t-card-hi: #11283a;
  --t-card-hover: #143049;
  --t-border: #1b3346;
  --t-border-hi: #24425a;
  --t-blue: #1685e5;
  --t-blue-light: #55b5ff;
  --t-green: #20d978;
  --t-yellow: #f2b544;
  --t-red: #ef5350;
  --t-grey: #6f8496;
  --t-text: #f3f7fc;
  --t-text-2: #a8bed0;
  --t-text-3: #6f8aa0;
  --t-radius: 12px;
  --t-radius-sm: 8px;
  --t-gap: 8px;
  --t-font: "Inter", "Segoe UI", Roboto, system-ui, -apple-system, sans-serif;
  display: block;
  min-height: 100%;
  background: var(--t-bg);
  color: var(--t-text);
  font-family: var(--t-font);
  -webkit-font-smoothing: antialiased;
}
* { box-sizing: border-box; }
button { font-family: inherit; }
:host([card]) .app { min-height: calc(100vh - var(--header-height, 56px)); }
:host([card]) .menu-btn { display: none !important; }
.app { container-type: inline-size; container-name: app; min-height: 100vh; display: flex; flex-direction: column;
  background: radial-gradient(1200px 600px at 20% -10%, #0e2a44 0%, transparent 60%), var(--t-bg); }

/* ---------------- Kopfzeile ---------------- */
.hdr { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 24px; padding: 10px 22px 8px; }
.brand { display: flex; align-items: center; gap: 14px; min-width: 0; }
.brand svg { flex: none; }
.brand h1 { margin: 0; font-size: 25px; line-height: 1.1; font-weight: 700; letter-spacing: .2px; white-space: nowrap; }
.brand p { margin: 3px 0 0; font-size: 14.5px; color: var(--t-text-2); white-space: nowrap; }
.menu-btn { display: none; background: none; border: 0; color: var(--t-text); padding: 6px; cursor: pointer; }
.nav { display: flex; gap: 6px; justify-content: center; }
.nav button { background: transparent; border: 0; color: var(--t-text); font-size: 15px; font-weight: 500; padding: 11px 18px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 7px; transition: background .15s; }
.nav button:hover { background: var(--t-card); }
.nav button.active { background: var(--t-blue); box-shadow: 0 0 0 1px #2b97f5 inset, 0 4px 18px rgba(22,133,229,.35); }
.nav button svg { width: 18px; height: 18px; }
.hdr-right { display: flex; align-items: center; gap: 26px; }
.sim-box { display: flex; align-items: center; gap: 14px; background: var(--t-card); border: 1px solid var(--t-border-hi); border-radius: 10px; padding: 9px 12px 9px 16px; font-size: 15px; }
.sim-box.active { border-color: #f2b544; background: rgba(242,181,68,.12); box-shadow: 0 0 0 1px rgba(242,181,68,.35), 0 0 18px rgba(242,181,68,.25); }
.sim-box .sim-tag { display: none; font-size: 11px; font-weight: 800; letter-spacing: .6px; color: #1b1200; background: #f2b544; border-radius: 4px; padding: 2px 6px; }
.sim-box.active .sim-tag { display: inline-block; }
.toggle { width: 42px; height: 24px; border-radius: 12px; background: #2a3f52; position: relative; cursor: pointer; border: 0; padding: 0; transition: background .15s; }
.toggle::after { content: ""; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #d7e3ee; transition: left .15s; }
.toggle.on { background: var(--t-blue); }
.toggle.on::after { left: 21px; background: #fff; }
.toggle:disabled { opacity: .4; cursor: not-allowed; }
.clock { text-align: right; font-size: 14px; line-height: 1.45; color: var(--t-text); font-variant-numeric: tabular-nums; }
.simbar { margin: 0 12px 6px; padding: 3px 14px; border-radius: 8px; font-size: 11.5px; font-weight: 700; letter-spacing: .3px; color: #1b1200;
  background: repeating-linear-gradient(135deg, #f2b544 0 14px, #e7a935 14px 28px); display: flex; gap: 10px; align-items: center; }
.simbar[hidden] { display: none; }

/* ---------------- Grundlayout ---------------- */
.main { flex: 1; padding: 0 12px 12px; }
.split { display: grid; grid-template-columns: minmax(0, 1.335fr) minmax(0, 1fr); gap: 8px; align-items: stretch; }
.ov-main { display: flex; flex-direction: column; }
.ov-main .statusbar { margin-top: auto; }
.rl-btn { padding: 7px 12px; font-size: 13px; white-space: nowrap; }
.rl-btn.danger { background: #b3261e; }
.c-off { color: var(--t-text-2); }

.panel { background: rgba(10, 26, 41, .82); border: 1px solid var(--t-border); border-radius: 14px; padding: 10px; min-width: 0; }
.card { background: var(--t-card); border: 1px solid var(--t-border); border-radius: var(--t-radius); padding: 14px 16px; min-width: 0; position: relative; }
.card.hi { background: var(--t-card-hi); }
.clickable { cursor: pointer; transition: border-color .15s, background .15s; }
.clickable:hover { border-color: var(--t-border-hi); background: var(--t-card-hover); }
.grid { display: grid; gap: var(--t-gap); }
h2.sec { margin: 0; font-size: 18px; font-weight: 600; }
h3.ct { margin: 0 0 6px; font-size: 16.5px; font-weight: 600; }
.muted { color: var(--t-text-2); }
.small { font-size: 12.5px; }
.tiny { font-size: 11px; color: var(--t-text-3); }
.c-ok { color: var(--t-green); } .c-warn { color: var(--t-yellow); } .c-crit { color: var(--t-red); }
.c-na, .c-off { color: var(--t-grey); } .c-blue { color: var(--t-blue-light); }
.badge { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; padding: 2px 8px; border-radius: 999px; border: 1px solid var(--t-border-hi); color: var(--t-text-2); }
.badge.sim { color: #1b1200; background: var(--t-yellow); border-color: var(--t-yellow); font-weight: 700; }
.badge.miss { border-style: dashed; color: var(--t-text-3); }

/* ---------------- Übersicht: Statuskarten ---------------- */
.kpis { display: grid; grid-template-columns: 1.65fr 1fr 1fr 0.97fr; gap: 8px; margin-bottom: 8px; }
.kpi { min-height: 100px; padding: 10px 14px; display: flex; flex-direction: column; justify-content: center; }
.kpi .lbl { font-size: 15.5px; font-weight: 600; margin-bottom: 6px; }
.kpi .row { display: flex; align-items: center; gap: 10px; }
.kpi .val { font-size: 21px; font-weight: 600; white-space: nowrap; font-variant-numeric: tabular-nums; letter-spacing: -.2px; }
.kpi .sub { font-size: 12.5px; color: var(--t-text-2); margin-top: 6px; line-height: 1.3; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.kpi .row > div { min-width: 0; }
/* schmale Statuskarten (1 Rasterspalte): Icon ausblenden bzw. Wert verkleinern – Inhalt passt sich der Karte an, nicht umgekehrt */
.ov-main .kpi { container-type: inline-size; container-name: kpi; }
@container kpi (max-width: 200px) { .kpi .ico-round { display: none; } }
@container kpi (max-width: 165px) { .kpi .val { font-size: 18px; } }
.kpi-status { flex-direction: row; justify-content: flex-start; gap: 22px; padding-left: 14px; }
.orb { width: 76px; height: 76px; border-radius: 50%; flex: none; position: relative; display: grid; place-items: center; background: radial-gradient(circle, rgba(32,217,120,.15), transparent 70%); }
.orb::before { content: ""; position: absolute; inset: 0; border-radius: 50%; border: 2px solid rgba(32,217,120,.35); }
.orb i { width: 50px; height: 50px; border-radius: 50%; background: radial-gradient(circle at 40% 35%, #8dffc1, #20d978 45%, #0f9c50 100%); box-shadow: 0 0 22px 6px rgba(32,217,120,.55); }
.orb.warn::before { border-color: rgba(242,181,68,.4); } .orb.warn i { background: radial-gradient(circle at 40% 35%, #ffe2a6, #f2b544 45%, #b97c12); box-shadow: 0 0 22px 6px rgba(242,181,68,.5); }
.orb.crit::before { border-color: rgba(239,83,80,.45); } .orb.crit i { background: radial-gradient(circle at 40% 35%, #ffb3b1, #ef5350 45%, #a51d1a); box-shadow: 0 0 24px 8px rgba(239,83,80,.55); animation: pulse 1.4s infinite; }
.orb.off::before, .orb.na::before { border-color: rgba(111,132,150,.35); } .orb.off i, .orb.na i { background: radial-gradient(circle at 40% 35%, #c3ced8, #6f8496 50%, #3e4f5e); box-shadow: 0 0 12px 2px rgba(111,132,150,.25); }
.orb.na i { background: repeating-linear-gradient(45deg, #3e4f5e 0 6px, #52677a 6px 12px); }
@keyframes pulse { 50% { box-shadow: 0 0 34px 14px rgba(239,83,80,.75); } }
.kpi-status .t1 { font-size: 16px; font-weight: 600; }
.kpi-status .t2 { font-size: 29px; font-weight: 700; line-height: 1.15; white-space: nowrap; letter-spacing: -.3px; }
.kpi-status .t3 { font-size: 14.5px; font-weight: 600; margin-top: 4px; }
.ico-round { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; flex: none; }

/* ---------------- Übersicht: Mittelteil – ein gemeinsames Raster ---------------- */
/* EIN gemeinsames Spaltenraster für Statuskarten, Mittelteil und Instrumente:
   gleiche Spalten + gleicher Abstand ⇒ alle senkrechten Kartenkanten liegen auf denselben Linien (saubere Kreuze).
   Karten überspannen nur ganze Spalten. Spaltenzahl je Breakpoint: 8 / 4 / 2 / 1. */
.ov-main { --ov-n: 8; }
.ov-main .kpis, .ov-main .mid, .ov-main .gauges-8 { grid-template-columns: repeat(var(--ov-n), minmax(0, 1fr)); gap: var(--t-gap); }
.ov-main .kpi-status { grid-column: span 2; } .ov-main .kpi-pressure { grid-column: span 1; } .ov-main .kpi-rate { grid-column: span 2; }
.ov-main .kpi-release { grid-column: span 2; } .ov-main .kpi-alerts { grid-column: span 1; }
.mid { display: grid; margin-bottom: var(--t-gap); grid-template-rows: repeat(4, minmax(0, 1fr)); }   /* 4 gleich hohe Zeilen */
.mid > .card { min-width: 0; min-height: 0; }
.m-vis   { grid-column: 1 / 5; grid-row: 1 / span 4; }
.m-motor { grid-column: 5 / 7; grid-row: 1; }
.m-run   { grid-column: 5 / 7; grid-row: 2; }
.m-room  { grid-column: 5 / 7; grid-row: 3 / span 2; }
.m-c1 { grid-column: 7 / 9; grid-row: 1; } .m-c2 { grid-column: 7 / 9; grid-row: 2; }
.m-c3 { grid-column: 7 / 9; grid-row: 3; } .m-c4 { grid-column: 7 / 9; grid-row: 4; }
/* Visualisierung: trägt nicht zur Zeilenhöhe bei, füllt die Fläche ohne Verzerrung (preserveAspectRatio meet) */
.vis { padding: 6px; display: flex; flex-direction: column; overflow: hidden; }
.vis-box { position: relative; flex: 1 1 0; min-height: 0; }
.vis-box > svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.m-room { display: flex; flex-direction: column; }
.room-card .rc-top { display: grid; grid-template-columns: 30px minmax(0, 1fr); gap: 10px; align-items: center; }
.room-card .spark { position: relative; flex: 1 1 0; min-height: 34px; margin: 4px -4px 0; }
.room-card .spark-in { position: absolute; inset: 0; }   /* Diagramm füllt die Fläche, beeinflusst die Zeilenhöhe nicht */
.vis .note { font-size: 10.5px; color: var(--t-text-3); text-align: right; padding: 0 6px 2px; }
.list { padding: 3px 14px; display: grid; grid-template-rows: repeat(3, minmax(0, 1fr)); }
.li { display: grid; grid-template-columns: 28px minmax(0, 1fr); align-items: center; gap: 12px; padding: 1px 0; min-height: 0; border-bottom: 1px solid var(--t-border); cursor: pointer; }
.li:last-child { border-bottom: 0; }
.li svg { width: 30px; height: 30px; color: var(--t-blue-light); }
.li .k { font-size: 13px; color: var(--t-text); }
.li .v { font-size: 14.5px; line-height: 1.25; font-weight: 500; margin-top: 0; color: var(--t-text-2); font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.li .k { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2; }
.mini { display: grid; grid-template-columns: 34px minmax(0, 1fr); align-items: center; gap: 12px; padding: 6px 12px; }
.mini svg { width: 32px; height: 32px; color: var(--t-blue-light); }
.mini .k { font-size: 13px; }
.mini .v { font-size: 15px; font-weight: 600; margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mini .s { font-size: 11px; color: var(--t-text-3); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.room-card { padding: 7px 12px 6px; }
.room-card ha-icon { --mdc-icon-size: 28px; color: #c9d6e2; }
.room-card .k { font-size: 13px; } .room-card .v { font-size: 17px; font-weight: 600; margin-top: 2px; }
.room-card .rc-mm { font-size: 11px; color: var(--t-text-2); margin-top: 3px; white-space: nowrap; } .room-card .rc-mm b { color: var(--t-text); font-weight: 600; }
.room-card .s { font-size: 10.5px; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* ---------------- Instrumente ---------------- */
.gauges { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 8px; }
.gauge.missing .gv, .gauge.nodata .gv { fill: var(--t-text-3); font-size: 15px; }
.gauge { padding: 6px 8px 0; text-align: center; cursor: pointer; }
.gauge .gl { font-size: 14.5px; font-weight: 600; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.gauge svg { width: 100%; max-width: 156px; height: auto; display: block; margin: 0 auto; }
.gauge .gv { font-size: 19px; font-weight: 600; fill: var(--t-text); }
.gauge .gs { font-size: 11px; fill: var(--t-text-2); }
.gauge .gt { font-size: 9px; fill: var(--t-text-3); }
.gauge.missing { cursor: default; }
.gauge .gnote { font-size: 10px; color: var(--t-text-3); margin-top: -2px; min-height: 13px; }

/* ---------------- Statusleiste ---------------- */
.statusbar { display: grid; grid-template-columns: repeat(6, 1fr); padding: 10px 8px; }
.sb { display: flex; align-items: center; gap: 10px; padding: 0 10px; border-right: 1px solid var(--t-border); cursor: pointer; min-width: 0; }
.sb:last-child { border-right: 0; }
.sb svg { width: 32px; height: 32px; flex: none; }
.sb .k { font-size: 12.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sb .v { font-size: 14.5px; font-weight: 600; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sb > div { min-width: 0; }

/* ---------------- Diagnose-Panel ---------------- */
.dhdr { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 6px 6px 12px; flex-wrap: wrap; }
.dhdr .t { display: flex; align-items: center; gap: 12px; }
.dhdr .t svg { width: 34px; height: 34px; color: var(--t-blue-light); }
.dhdr h2 { margin: 0; font-size: 23px; font-weight: 600; }
.ranges { display: flex; gap: 0; align-items: center; background: var(--t-card); border: 1px solid var(--t-border); border-radius: 8px; overflow: hidden; }
.ranges button { background: transparent; border: 0; border-right: 1px solid var(--t-border); color: var(--t-text); font-size: 14px; padding: 8px 20px; cursor: pointer; }
.ranges button:last-child { border-right: 0; }
.ranges button.active { background: var(--t-blue); }
.cal { background: var(--t-card); border: 1px solid var(--t-border); border-radius: 8px; color: var(--t-text); width: 46px; height: 36px; cursor: pointer; display: grid; place-items: center; margin-left: 12px; }
.cal.active { background: var(--t-blue); }
.chart-card { padding: 10px 12px 2px; margin-bottom: 8px; }
.chart-card .ch { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.chart-card .ch h3 { margin: 0; font-size: 16.5px; font-weight: 600; }
.chart { width: 100%; min-height: 60px; }
.chart.empty { display: grid; place-items: center; color: var(--t-text-3); font-size: 13px; }
.duo { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.kv { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; margin-top: 6px; }
.kv-wide { grid-template-columns: repeat(8, minmax(0, 1fr)); margin: 0 0 8px; }
.kv > div { min-width: 0; }
.kv .v { overflow: hidden; text-overflow: ellipsis; }
.kv > div { background: var(--t-card-hi); border: 1px solid var(--t-border); border-radius: 8px; padding: 8px 10px; }
.kv .k { font-size: 11.5px; color: var(--t-text-2); }
.kv .v { font-size: 15.5px; font-weight: 600; margin-top: 4px; white-space: nowrap; font-variant-numeric: tabular-nums; }
.custom-range { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; padding: 0 6px 10px; font-size: 13px; color: var(--t-text-2); }
.custom-range[hidden] { display: none; }
input, select, textarea { background: var(--t-bg-deep); color: var(--t-text); border: 1px solid var(--t-border-hi); border-radius: 6px; padding: 7px 9px; font: inherit; font-size: 13.5px; color-scheme: dark; }
textarea { width: 100%; min-height: 64px; resize: vertical; }
.btn { background: var(--t-blue); color: #fff; border: 0; border-radius: 8px; padding: 8px 16px; font-size: 14px; cursor: pointer; font-weight: 500; }
.btn.ghost { background: var(--t-card-hi); border: 1px solid var(--t-border-hi); color: var(--t-text); }
.btn:disabled { opacity: .5; cursor: not-allowed; }
.chips { display: flex; gap: 6px; flex-wrap: wrap; }
.chip { border: 1px solid var(--t-border-hi); background: var(--t-card); color: var(--t-text-2); border-radius: 999px; padding: 5px 12px; font-size: 12.5px; cursor: pointer; display: inline-flex; gap: 6px; align-items: center; }
.chip.on { background: rgba(22,133,229,.18); border-color: var(--t-blue); color: var(--t-text); }
.chip i { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
.chip.miss { border-style: dashed; opacity: .55; cursor: not-allowed; }

/* ---------------- Weitere Ansichten ---------------- */
.page { display: grid; gap: 8px; }
.cols-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.cols-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.cols-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.stat .k { font-size: 12.5px; color: var(--t-text-2); }
.stat .v { font-size: 22px; font-weight: 600; margin-top: 6px; font-variant-numeric: tabular-nums; }
.stat .s { font-size: 11.5px; color: var(--t-text-3); margin-top: 4px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; color: var(--t-text-2); font-weight: 500; padding: 8px 8px; border-bottom: 1px solid var(--t-border-hi); position: sticky; top: 0; background: var(--t-card); }
td { padding: 8px; border-bottom: 1px solid var(--t-border); vertical-align: top; }
tr.clickable:hover td { background: var(--t-card-hover); }
.scroll { max-height: 560px; overflow: auto; }
.form { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 14px; }
.form label { display: grid; gap: 4px; font-size: 12.5px; color: var(--t-text-2); }
.form .full { grid-column: 1 / -1; }
.check { display: flex !important; grid-template-columns: none; align-items: center; gap: 8px; color: var(--t-text) !important; font-size: 13.5px !important; }
.hint { font-size: 12px; color: var(--t-text-3); line-height: 1.45; }
.alertbox { border-radius: 10px; padding: 10px 14px; font-size: 13px; line-height: 1.45; border: 1px solid; }
.alertbox.warn { border-color: rgba(242,181,68,.45); background: rgba(242,181,68,.08); }
.alertbox.info { border-color: rgba(22,133,229,.45); background: rgba(22,133,229,.08); }
.alertbox.crit { border-color: rgba(239,83,80,.5); background: rgba(239,83,80,.08); }
.ev-ico { width: 26px; height: 26px; border-radius: 50%; display: inline-grid; place-items: center; font-size: 13px; }
.detail { font-size: 12px; color: var(--t-text-2); white-space: pre-wrap; }
.toast { position: fixed; bottom: 18px; left: 50%; transform: translateX(-50%); background: var(--t-card-hi); border: 1px solid var(--t-border-hi); padding: 10px 18px; border-radius: 10px; font-size: 14px; z-index: 10; }
.toast[hidden] { display: none; }

/* ApexCharts – dunkles Theme */
.apexcharts-tooltip.apexcharts-theme-dark { background: #0b1d2c !important; border: 1px solid var(--t-border-hi) !important; box-shadow: 0 6px 20px rgba(0,0,0,.4) !important; }
.apexcharts-tooltip.apexcharts-theme-dark .apexcharts-tooltip-title { background: #10273a !important; border-bottom: 1px solid var(--t-border) !important; }
.apexcharts-xaxistooltip { background: #10273a !important; border-color: var(--t-border-hi) !important; color: var(--t-text) !important; }
.apexcharts-legend-text { color: var(--t-text-2) !important; }
.apexcharts-menu { background: #0d2030 !important; border-color: var(--t-border-hi) !important; }
.apexcharts-menu-item:hover { background: #143049 !important; }
.apexcharts-toolbar svg { fill: var(--t-text-3) !important; }
.apexcharts-toolbar .apexcharts-selected svg { fill: var(--t-blue-light) !important; }

/* ---------------- Responsive ---------------- */
@container app (max-width: 1280px) {
  .ov-main { --ov-n: 4; }
  .ov-main .kpi-status { grid-column: span 2; } .ov-main .kpi-pressure, .ov-main .kpi-rate { grid-column: span 1; }
  .ov-main .kpi-release, .ov-main .kpi-alerts { grid-column: span 2; }
  .m-vis { grid-column: 1 / 3; } .m-motor, .m-run, .m-room { grid-column: 3 / 4; }
  .m-c1, .m-c2, .m-c3, .m-c4 { grid-column: 4 / 5; }
  .hdr { grid-template-columns: auto 1fr; }
  .nav { grid-column: 1 / -1; order: 3; justify-content: flex-start; overflow-x: auto; }
  .split { grid-template-columns: 1fr; }
}
@container app (max-width: 1450px) {
  .gauge .gl { font-size: 13px; }
}
@container app (max-width: 900px) {
  .ov-main { --ov-n: 2; }
  .ov-main .kpis > .kpi { grid-column: span 1; } .ov-main .kpi-status { grid-column: 1 / -1; }
  /* Tablet: gleiches Raster mit 2 Spalten – Visualisierung oben über volle Breite */
  .mid { grid-template-rows: auto repeat(4, minmax(0, 1fr)); }
  .m-vis { grid-column: 1 / -1; grid-row: 1; }
  .m-motor { grid-column: 1; grid-row: 2; } .m-run { grid-column: 1; grid-row: 3; } .m-room { grid-column: 1; grid-row: 4 / span 2; }
  .m-c1 { grid-column: 2; grid-row: 2; } .m-c2 { grid-column: 2; grid-row: 3; } .m-c3 { grid-column: 2; grid-row: 4; } .m-c4 { grid-column: 2; grid-row: 5; }
  .vis-box { flex: none; aspect-ratio: 514 / 330; }
  .statusbar { grid-template-columns: repeat(3, 1fr); row-gap: 14px; }
  .sb:nth-child(3) { border-right: 0; }
  .cols-3, .cols-4 { grid-template-columns: 1fr 1fr; }
  .kv, .kv-wide { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@container app (max-width: 640px) {
  .hdr { padding: 10px 12px; gap: 10px; }
  .menu-btn { display: block; }
  .brand h1 { font-size: 19px; } .brand p { display: none; }
  .brand > svg { display: none; }
  .hdr-right { gap: 10px; } .clock { display: none; }
  .sim-box { padding: 6px 8px; font-size: 13px; gap: 6px; }
  .sim-box > span:not(.sim-tag) { display: none; }
  .sim-box .sim-tag::after { content: " SIM"; }
  .brand { min-width: 0; } .brand > div { min-width: 0; }
  .brand h1 { overflow: hidden; text-overflow: ellipsis; }
  .hdr { grid-template-columns: minmax(0, 1fr) auto; }
  .nav button { padding: 9px 12px; font-size: 14px; }
  .main { padding: 0 6px 8px; }
  .panel { padding: 6px; }
  .ov-main { --ov-n: 1; }
  .ov-main .kpis > .kpi { grid-column: 1 / -1 !important; }
  .kpi-status { order: 1; } .kpi-release { order: 2; } .kpi-pressure { order: 3; } .kpi-alerts { order: 4; } .kpi-rate { order: 5; }
  .duo, .cols-2, .cols-3, .cols-4, .form { grid-template-columns: 1fr; }
  .mid { grid-template-rows: none; grid-auto-rows: auto; }
  .mid > .card { grid-column: 1 !important; grid-row: auto !important; }
  .vis-box { flex: none; aspect-ratio: 514 / 330; }
  .m-room { min-height: 150px; }
  .statusbar { grid-template-columns: 1fr 1fr; }
  .sb { border-right: 0 !important; }
  .kv, .kv-wide { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .dhdr { padding: 4px 2px 10px; }
  .ranges { overflow-x: auto; max-width: 100%; }
  .chart-card .ch { flex-wrap: wrap; }
  select { max-width: 100%; }
  table { font-size: 12px; }
  .scroll, .card { overflow-x: auto; }
  .ranges button { padding: 7px 11px; }
}
`;
