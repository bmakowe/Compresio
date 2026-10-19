// Zentrale Zuordnung der Entitäten und Darstellungsbereiche.
// Echte Sensorik ersetzt die Simulation ohne Änderung: dieselben Entitäten, Quelle über sensor.kompressor_quelle.
// Fehlende Messgrößen = null → werden in der Oberfläche als „Kein Sensor“ gekennzeichnet.

const E = 'kompressor';

export const DEFAULT_CONFIG = {
  title: 'Compresio',
  subtitle: 'Smart Compressor Monitoring & Diagnostics',
  compressor_label: 'KOMPRESSOR',   // Aufschrift in der schematischen Darstellung (z. B. Hersteller/Typ)
  entities: {
    status: `sensor.${E}_status`,
    source: `sensor.${E}_quelle`,
    last_update: `sensor.${E}_letzte_aktualisierung`,
    alerts: `sensor.${E}_meldungen`,
    event: `event.${E}_ereignis`,
    motor: `binary_sensor.${E}_motor`,
    current: `sensor.${E}_motorstrom`,
    current_l1: null, current_l2: null, current_l3: null,          // dreiphasige Messung: noch nicht vorhanden
    voltage: `sensor.${E}_spannung`,
    p_suction: null,                                               // Ansaugdruck: noch kein Sensor
    p_stage1: null,                                                // Zwischendruck Stufe 1: noch kein Sensor
    p_stage2: null,                                                // Zwischendruck Stufe 2: noch kein Sensor
    p_final: `sensor.${E}_enddruck`,
    p_rate: `sensor.${E}_druckanstieg`,
    // Temperaturmessstellen in Verdichtungsfolge: T1 → T12 → T2 → T23 → T3, dazu Raumtemperatur TR
    t1: 'sensor.kompressor_temperatur_stufe_1',              // Zylinder Stufe 1
    t12: 'sensor.kompressor_temperatur_kuehlspirale_1_2',    // Kühlspirale zwischen Stufe 1 und 2
    t2: 'sensor.kompressor_temperatur_stufe_2',              // Zylinder Stufe 2
    t23: 'sensor.kompressor_temperatur_kuehlspirale_2_3',    // Kühlspirale zwischen Stufe 2 und 3
    t3: 'sensor.kompressor_temperatur_stufe_3',              // Zylinder Stufe 3
    tr: 'sensor.kompressor_raumtemperatur',                  // Raumtemperatur (Ansaugluft-Umgebung)
    // Template-Sensoren: Differenz zur Raumtemperatur (Diagnoseindikatoren, keine Kühlleistung)
    dt1: 'sensor.kompressor_delta_t1', dt2: 'sensor.kompressor_delta_t2', dt3: 'sensor.kompressor_delta_t3',
    dt12: 'sensor.kompressor_delta_t12', dt23: 'sensor.kompressor_delta_t23',
    hours: `sensor.${E}_betriebsstunden`,
    starts: `sensor.${E}_starts`,
    cycle_current: `sensor.${E}_zyklus_aktuell`,
    cycle_last: `sensor.${E}_zyklus_letzter`,
    cycle_rate: `sensor.${E}_zyklus_druckanstieg`,
    maint_status: `sensor.${E}_wartung_status`,
    filter_status: `sensor.${E}_filter_status`,
    hours_since_maint: `sensor.${E}_stunden_seit_wartung`,
    hours_since_filter: `sensor.${E}_stunden_seit_filterwechsel`,
    remaining_maint: `sensor.${E}_rest_bis_wartung`,
    remaining_filter: `sensor.${E}_rest_bis_filterwechsel`,
    interval_maint: `number.${E}_wartungsintervall`,
    interval_filter: `number.${E}_filterintervall`,
    setpoint: `number.${E}_enddruck_soll`,
    rate_reference: `number.${E}_druckanstieg_referenz`,
    btn_maint: `button.${E}_wartung_erfasst`,
    btn_filter: `button.${E}_filter_erfasst`,
    sim_switch: `switch.${E}_simulation`,
    // Betriebsfreigabe (Steuerung, siehe docs/steuerung.md): Ausgang steht zentral in diesem Helfer
    release_output_helper: 'input_text.kompressor_freigabe_ausgang',
    release_on_script: 'script.kompressor_freigabe_erteilen',
    release_off_script: 'script.kompressor_freigabe_entziehen',
    sim_scenario: `select.${E}_simulation_szenario`,
    sim_room: `select.${E}_simulation_raumklima`,
    cat: {
      comm: `binary_sensor.${E}_meldung_comm`,
      sensor_data: `binary_sensor.${E}_meldung_sensor_data`,
      temperature: `binary_sensor.${E}_meldung_temperature`,
      pressure: `binary_sensor.${E}_meldung_pressure`,
      maintenance: `binary_sensor.${E}_meldung_maintenance`,
      database: `binary_sensor.${E}_meldung_database`,
    },
    sensor_status: {
      p_final: `sensor.${E}_sensorstatus_pressure_final`,
      t1: `sensor.${E}_sensorstatus_temp_stage1`,
      t12: `sensor.${E}_sensorstatus_temp_coil12`,
      t2: `sensor.${E}_sensorstatus_temp_stage2`,
      t23: `sensor.${E}_sensorstatus_temp_coil23`,
      t3: `sensor.${E}_sensorstatus_temp_stage3`,
      tr: `sensor.${E}_sensorstatus_temp_room`,
      current: `sensor.${E}_sensorstatus_motor_current`,
      voltage: `sensor.${E}_sensorstatus_supply_voltage`,
    },
    system: {
      cpu: 'sensor.system_monitor_prozessornutzung',
      ram: 'sensor.system_monitor_arbeitsspeicherauslastung',
      disk: 'sensor.system_monitor_massenspeicher_auslastung',
      disk_used: 'sensor.home_assistant_host_disk_used',
      disk_total: 'sensor.home_assistant_host_disk_total',
      load: 'sensor.system_monitor_last_15_min',
      boot: 'sensor.system_monitor_betriebszeit',
      mqtt: 'binary_sensor.mosquitto_broker_aktiv',
      nodered: 'binary_sensor.node_red_aktiv',
      influx: 'binary_sensor.influxdb_v1_aktiv',
      grafana: 'binary_sensor.grafana_aktiv',
      tailscale: 'binary_sensor.tailscale_aktiv',
      nodered_ram: 'sensor.node_red_arbeitsspeicher_in_prozent',
      influx_ram: 'sensor.influxdb_v1_arbeitsspeicher_in_prozent',
      heartbeat: `sensor.${E}_heartbeat`,
      db_state: `sensor.${E}_influxdb`,
      db_buffer: `sensor.${E}_db_puffer`,
      rx_rate: `sensor.${E}_nachrichtenrate`,
      data_age: `sensor.${E}_datenalter`,
      invalid: `sensor.${E}_ungueltige_nachrichten`,
      duplicates: `sensor.${E}_duplikate`,
      ts_fixed: `sensor.${E}_zeitstempel_korrigiert`,
      uptime: `sensor.${E}_nodered_laufzeit`,
    },
  },
  // VORLÄUFIGE DARSTELLUNGSBEREICHE – keine Herstellerangaben, keine freigegebenen Betriebsgrenzen.
  // warn/crit: optional; nur gesetzt, wo Node-RED dieselben TEST-Schwellen verwendet.
  gauges: {
    p_suction: { label: 'Ansaugdruck', unit: 'bar', min: 0, max: 5, dec: 1 },
    p_stage1: { label: 'Zwischendruck Stufe 1', unit: 'bar', min: 0, max: 50, dec: 1 },
    p_stage2: { label: 'Zwischendruck Stufe 2', unit: 'bar', min: 0, max: 150, dec: 1 },
    p_final: { label: 'Enddruck', unit: 'bar', min: 0, max: 250, dec: 1, warn: 220, crit: 240 },
    t1: { label: 'Zylinder Stufe 1 (T1)', unit: '°C', min: 0, max: 150, dec: 1, warn: 150, crit: 180 },
    t2: { label: 'Zylinder Stufe 2 (T2)', unit: '°C', min: 0, max: 150, dec: 1, warn: 150, crit: 180 },
    t3: { label: 'Zylinder Stufe 3 (T3)', unit: '°C', min: 0, max: 150, dec: 1, warn: 150, crit: 180 },
    current: { label: 'Motorstrom', unit: 'A', min: 0, max: 40, dec: 1 },
  },
  scale_note: 'Skala vorläufig – keine Betriebsgrenze',
  // Vergleichbarkeit von Zyklen (identisch mit Node-RED cfg.cycle)
  cycle: { min_duration_s: 120, min_delta_bar: 50, moving_avg: 5, overlay_max: 8 },
  links: {
    grafana: '/hassio/ingress/a0d7b954_grafana',
    nodered: '/hassio/ingress/a0d7b954_nodered',
  },
};

export function mergeConfig(user) {
  const out = structuredClone(DEFAULT_CONFIG);
  const deep = (t, s) => {
    for (const [k, v] of Object.entries(s || {})) {
      if (v && typeof v === 'object' && !Array.isArray(v) && t[k] && typeof t[k] === 'object') deep(t[k], v);
      else t[k] = v;
    }
  };
  deep(out, user);
  return out;
}

// Messreihen für Diagramme (Farben gemäß Designvorlage)
export const SERIES = {
  p_suction: { name: 'Ansaugdruck', color: '#2F8CF0', unit: 'bar' },
  p_stage1: { name: 'Zwischendruck 1', color: '#F2B544', unit: 'bar' },
  p_stage2: { name: 'Zwischendruck 2', color: '#EF5350', unit: 'bar' },
  p_final: { name: 'Enddruck', color: '#20D978', unit: 'bar' },
  t1: { name: 'T1 Zylinder 1', short: 'T1', color: '#2F8CF0', unit: '°C' },
  t12: { name: 'T12 Kühlspirale 1–2', short: 'T12', color: '#8ED9D3', unit: '°C' },
  t2: { name: 'T2 Zylinder 2', short: 'T2', color: '#F2B544', unit: '°C' },
  t23: { name: 'T23 Kühlspirale 2–3', short: 'T23', color: '#FF8A65', unit: '°C' },
  t3: { name: 'T3 Zylinder 3', short: 'T3', color: '#EF5350', unit: '°C' },
  tr: { name: 'TR Raum', short: 'TR', color: '#C9D6E2', unit: '°C' },
  dt1: { name: 'ΔT1 (T1−TR)', color: '#2F8CF0', unit: '°C' },
  dt2: { name: 'ΔT2 (T2−TR)', color: '#F2B544', unit: '°C' },
  dt3: { name: 'ΔT3 (T3−TR)', color: '#EF5350', unit: '°C' },
  dt12: { name: 'ΔT12 (T12−TR)', color: '#8ED9D3', unit: '°C' },
  dt23: { name: 'ΔT23 (T23−TR)', color: '#FF8A65', unit: '°C' },
  current: { name: 'Motorstrom', color: '#20D978', unit: 'A' },
  current_l1: { name: 'Strom L1', color: '#20D978', unit: 'A' },
  current_l2: { name: 'Strom L2', color: '#F2B544', unit: 'A' },
  current_l3: { name: 'Strom L3', color: '#55B5FF', unit: 'A' },
  voltage: { name: 'Spannung', color: '#A8BED0', unit: 'V' },
  p_rate: { name: 'Druckanstieg', color: '#55B5FF', unit: 'bar/min' },
  motor: { name: 'Motorzustand', color: '#2F8CF0', unit: '' },
};
