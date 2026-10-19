// Wrapper um ApexCharts (MIT, lokal gebündelt) mit dem dunklen Compresio-Theme.
import ApexCharts from '../../../vendor/apexcharts.esm.js';

const de = {
  name: 'de',
  options: {
    months: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
    shortMonths: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'],
    days: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
    shortDays: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
    toolbar: { exportToSVG: 'SVG speichern', exportToPNG: 'PNG speichern', exportToCSV: 'CSV speichern', menu: 'Menü',
               selection: 'Auswahl', selectionZoom: 'Auswahl vergrößern', zoomIn: 'Vergrößern', zoomOut: 'Verkleinern', pan: 'Verschieben', reset: 'Zoom zurücksetzen' },
  },
};

// Eigene Zoom-Synchronisierung (statt chart.group, das auch Daten-Updates über alle Diagramme verteilt)
const SYNC = new Map();
function syncZoom(group, src, min, max) {
  for (const c of SYNC.get(group) || []) if (c !== src) { try { if (min === undefined) c.chart.resetSeries(false, false); else c.chart.zoomX(min, max); } catch (e) { /* noop */ } }
}

export function baseOptions({ height = 200, type = 'line', id, toolbar = true, legend = true, stacked = false, zoom = true } = {}) {
  return {
    chart: {
      type, height, stacked, id, locales: [de], defaultLocale: 'de', background: 'transparent', foreColor: '#a8bed0',
      fontFamily: 'Inter, "Segoe UI", Roboto, system-ui, sans-serif', parentHeightOffset: 0,
      animations: { enabled: false },
      toolbar: { show: toolbar, autoSelected: 'zoom', tools: { download: true, selection: false, zoom: true, zoomin: true, zoomout: true, pan: true, reset: true } },
      zoom: { enabled: zoom, type: 'x', autoScaleYaxis: false },
    },
    theme: { mode: 'dark' },
    grid: { borderColor: '#1d3548', strokeDashArray: 0, padding: { left: 6, right: 8, top: -8, bottom: -4 },
            xaxis: { lines: { show: true } }, yaxis: { lines: { show: true } } },
    stroke: { width: 2.2, curve: 'straight' },
    dataLabels: { enabled: false },
    markers: { size: 0, hover: { size: 4 } },
    legend: { show: legend, position: 'top', horizontalAlign: toolbar ? 'left' : 'right', fontSize: '12px', offsetY: -2, markers: { size: 5, shape: 'square' },
              itemMargin: { horizontal: 10, vertical: 0 }, labels: { colors: '#a8bed0' } },
    tooltip: { theme: 'dark', shared: true, intersect: false, x: { format: 'dd.MM. HH:mm:ss' } },
    xaxis: { type: 'datetime', labels: { datetimeUTC: false, style: { fontSize: '11.5px' }, datetimeFormatter: { year: 'yyyy', month: 'MMM yy', day: 'dd.MM.', hour: 'HH:mm', minute: 'HH:mm' } },
             axisBorder: { color: '#24425a' }, axisTicks: { color: '#24425a' }, tooltip: { enabled: false } },
    noData: { text: 'Keine Daten im Zeitraum', style: { color: '#6f8aa0', fontSize: '13px' } },
  };
}

export function yAxis(title, opts = {}) {
  return {
    title: { text: title, style: { fontSize: '11.5px', fontWeight: 400, color: '#a8bed0' } },
    labels: { style: { fontSize: '11.5px' }, formatter: (v) => (v === null || v === undefined ? '' : Number(v).toLocaleString('de-DE', { maximumFractionDigits: opts.dec ?? 0 })) },
    forceNiceScale: true, ...opts,
  };
}

/** Diagramm verwalten: einmal erzeugen, danach nur Daten/Optionen aktualisieren */
export class Chart {
  /** sync: Name einer Synchronisationsgruppe – Zoom/Verschieben wird auf alle Diagramme der Gruppe übertragen */
  constructor(el, options, sync) {
    this.el = el;
    this.options = options;
    if (sync) {
      this.sync = sync;
      if (!SYNC.has(sync)) SYNC.set(sync, new Set());
      SYNC.get(sync).add(this);
      let busy = false;
      const relay = (min, max) => { if (busy) return; busy = true; syncZoom(sync, this, min, max); setTimeout(() => (busy = false), 50); };
      options.chart.events = { ...(options.chart.events || {}),
        zoomed: (_c, { xaxis }) => relay(xaxis?.min, xaxis?.max),
        scrolled: (_c, { xaxis }) => relay(xaxis?.min, xaxis?.max) };
    }
    this.chart = new ApexCharts(el, options);
    this.ready = this.chart.render();
  }
  async set(series, extra) {
    await this.ready;
    if (extra) await this.chart.updateOptions({ ...extra, series }, false, false);
    else await this.chart.updateSeries(series, false);
  }
  async options_(o) { await this.ready; await this.chart.updateOptions(o, false, false); }
  destroy() { if (this.sync) SYNC.get(this.sync)?.delete(this); try { this.chart.destroy(); } catch (e) { /* bereits entfernt */ } }
}

export { ApexCharts };
