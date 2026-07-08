import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export interface PlayerData {
  player_id: number;
  nombre: string;
  apellido1: string;
  apellido2: string;
  category_id: number;
  posicion: string;
  fecha_nacimiento: string;
  club?: string;
  club_name?: string;
  id_club?: number;
  phv_status?: 'Pre-Peak' | 'Peak' | 'Post-Peak';
  injury_status?: 'Disponible' | 'RTP' | 'Lesionado';
}

export interface IMTPData {
  jugador: string;
  player_id: number;
  fecha_test: string;
  peso?: number;
  imtp_fuerza_n: number;
  imtp_f_relativa_n_kg?: number;
  imtp_force_50ms?: number;
  imtp_rfd_100ms?: number;
  imtp_rfd_150ms?: number;
  imtp_rfd_200ms?: number;
  imtp_asimetria?: number;
  imtp_debil?: string;
  fuerza_cmj?: number;
  cmj_rsi_mod?: number;
  cmj_altura_salto_im?: number;
  cmj_salto_tv?: number;
  cmj_peak_pot_relativa?: number;
  cmj_asimetria_aterrizaje?: number;
  landing_n?: number;
  landing_relativo?: number;
  cmj_pierna_debil?: string;
  dsi_valor?: number;
  avk_peak_pot_relativa?: number;
  avk_indice_uso_brazos_tv?: number;
  avk_x_tv?: number;
  avk_x_im?: number;
  avk_indice_uso_brazos_im?: number;
  avk_indice_brazos_im?: number;
  slcmj_izq_altura_im?: number;
  slcmj_izq_altura_tv?: number;
  slcmj_der_altura_im?: number;
  slcmj_der_altura_tv?: number;
  slcmj_diferencia_pct_im?: number;
  slcmj_diferencia_pct_tv?: number;
  deficit_bilateral?: number;
  altura_x_rsi_mod?: number;
  concentric_peak_force_n?: number;
  rsi_modified_m_s?: number;
  jump_height_impmom_cm?: number;
  peak_power_bm_w_kg?: number;
  peak_power_w?: number;
  observaciones?: string;
  countermovement_depth_cm?: number;
  concentric_duration_ms?: number;
  concentric_impulse_ns?: number;
  take_off_momentum_kg_m_s?: number;
}

export interface CMJReboundData {
  id?: string;
  created_at?: string;
  player_id: number;
  jugador?: string;
  fecha_test: string;
  bw_kg?: number;
  reps?: number;
  rebound_rsi?: number;
  rebound_contact_time_ms?: number;
  rebound_flight_time_ms?: number;
  take_off_momentum_kg_m_s?: number;
  observaciones?: string;
}

export interface SpeedTestData {
  player_id: number;
  fecha: string;
  tiempo_10m?: number;
  vel_10m?: number;
  tiempo_10_20m?: number;
  vel_10_20m?: number;
  tiempo_20_30m?: number;
  vel_20_30m?: number;
  tiempo_total: number;
  observaciones?: string;
}

export interface VO2MaxData {
  player_id: number;
  fecha: string;
  vo2_max: number;
  vam?: number;
  fc_max?: number;
  nivel?: number;
  pasada?: number;
  mts?: number;
  vt1_vel?: number;
  vt1_pct?: number;
  vt1_fc?: number;
  vt2_vel?: number;
  vt2_pct?: number;
  vt2_fc?: number;
  vfa?: number;
  peso?: number;
  observaciones?: string;
  jugador?: string;
}

export interface MetricConfig {
  key: string;
  label: string;
  unit: string;
  lowerIsBetter: boolean;
  thresholds: {
    excellent: number;
    normal: number;
  };
}

// Global default limits for backup evaluation when N is small
export const ALL_METRIC_CONFIGS: Record<string, MetricConfig> = {
  imtp_fuerza_n: { key: 'imtp_fuerza_n', label: 'IMTP Fuerza Máxima', unit: 'N', lowerIsBetter: false, thresholds: { excellent: 3500, normal: 2800 } },
  imtp_f_relativa_n_kg: { key: 'imtp_f_relativa_n_kg', label: 'IMTP F. Relativa', unit: 'N/kg', lowerIsBetter: false, thresholds: { excellent: 45, normal: 35 } },
  imtp_asimetria: { key: 'imtp_asimetria', label: 'IMTP Asimetría', unit: '%', lowerIsBetter: true, thresholds: { excellent: 5, normal: 10 } },
  fuerza_cmj: { key: 'fuerza_cmj', label: 'Fuerza CMJ', unit: 'N', lowerIsBetter: false, thresholds: { excellent: 3500, normal: 2800 } },
  cmj_rsi_mod: { key: 'cmj_rsi_mod', label: 'CMJ RSI Mod', unit: '', lowerIsBetter: false, thresholds: { excellent: 0.55, normal: 0.45 } },
  cmj_altura_salto_im: { key: 'cmj_altura_salto_im', label: 'CMJ Altura', unit: 'cm', lowerIsBetter: false, thresholds: { excellent: 42, normal: 35 } },
  cmj_peak_pot_relativa: { key: 'cmj_peak_pot_relativa', label: 'CMJ Peak Pot. Rel.', unit: 'W/kg', lowerIsBetter: false, thresholds: { excellent: 65, normal: 50 } },
  tiempo_10m: { key: 'tiempo_10m', label: 'Tiempo 10m', unit: 's', lowerIsBetter: true, thresholds: { excellent: 1.65, normal: 1.85 } },
  vel_10m: { key: 'vel_10m', label: 'Velocidad 10m', unit: 'm/s', lowerIsBetter: false, thresholds: { excellent: 7.5, normal: 6.5 } },
  tiempo_total: { key: 'tiempo_total', label: 'Tiempo Total 30m', unit: 's', lowerIsBetter: true, thresholds: { excellent: 4.10, normal: 4.40 } },
  vo2_max: { key: 'vo2_max', label: 'VO2 Max', unit: 'ml/kg/min', lowerIsBetter: false, thresholds: { excellent: 58, normal: 52 } },
  vam: { key: 'vam', label: 'VMA', unit: 'km/h', lowerIsBetter: false, thresholds: { excellent: 18, normal: 16 } },
  t_acel_2m: { key: 't_acel_2m', label: '505 T. Acel 2m', unit: 's', lowerIsBetter: true, thresholds: { excellent: 2.10, normal: 2.40 } },
  t_desacel_2m: { key: 't_desacel_2m', label: '505 T. Desacel 2m', unit: 's', lowerIsBetter: true, thresholds: { excellent: 2.10, normal: 2.40 } },
  t_cod_2m: { key: 't_cod_2m', label: '505 T. COD 2m', unit: 's', lowerIsBetter: true, thresholds: { excellent: 2.10, normal: 2.40 } },
  t_reacel_1_2m: { key: 't_reacel_1_2m', label: '505 T. Reacel 1.2m', unit: 's', lowerIsBetter: true, thresholds: { excellent: 2.10, normal: 2.40 } },
  z_score_acel: { key: 'z_score_acel', label: '505 Z-Score Acel', unit: '', lowerIsBetter: false, thresholds: { excellent: 1.5, normal: 0.5 } }
};

export const METRIC_METADATA: Record<string, { lowerIsBetter: boolean; label: string; table: string }> = {
  imtp_fuerza_n: { lowerIsBetter: false, label: 'IMTP Fuerza Máxima', table: 'imtp' },
  imtp_f_relativa_n_kg: { lowerIsBetter: false, label: 'F. Relativa IMTP', table: 'imtp' },
  imtp_rfd_100ms: { lowerIsBetter: false, label: 'RFD 100ms', table: 'imtp' },
  imtp_rfd_150ms: { lowerIsBetter: false, label: 'RFD 150ms', table: 'imtp' },
  imtp_rfd_200ms: { lowerIsBetter: false, label: 'RFD 200ms', table: 'imtp' },
  imtp_force_50ms: { lowerIsBetter: false, label: 'Fuerza a 50ms', table: 'imtp' },
  peak_power_w: { lowerIsBetter: false, label: 'Potencia Pico', table: 'imtp' },
  peak_power_bm_w_kg: { lowerIsBetter: false, label: 'Pot. Pico Relativa', table: 'imtp' },
  cmj_altura_salto_im: { lowerIsBetter: false, label: 'Altura Salto (IM)', table: 'imtp' },
  concentric_impulse_ns: { lowerIsBetter: false, label: 'Impulso Concéntrico', table: 'imtp' },
  take_off_momentum_kg_m_s: { lowerIsBetter: false, label: 'Momento Despegue', table: 'imtp' },
  rebound_rsi: { lowerIsBetter: false, label: 'Rebound RSI', table: 'rebound' },
  rebound_contact_time_ms: { lowerIsBetter: true, label: 'Tiempo Contacto', table: 'rebound' },
  rebound_flight_time_ms: { lowerIsBetter: false, label: 'Tiempo Vuelo', table: 'rebound' },
  vel_10m: { lowerIsBetter: false, label: 'Velocidad 10m', table: 'speed' },
  vel_10_20m: { lowerIsBetter: false, label: 'Velocidad 10-20m', table: 'speed' },
  vel_20_30m: { lowerIsBetter: false, label: 'Velocidad 20-30m', table: 'speed' },
  tiempo_total: { lowerIsBetter: true, label: 'Tiempo Total 30m', table: 'speed' },
  t_acel_2m: { lowerIsBetter: true, label: 'T. Aceleración 2m', table: 'test505' },
  vel_acel_kmh: { lowerIsBetter: false, label: 'Vel Aceleración', table: 'test505' },
  t_desacel_2m: { lowerIsBetter: true, label: 'T. Desaceleración 2m', table: 'test505' },
  vel_desacel_kmh: { lowerIsBetter: false, label: 'Vel Desaceleración', table: 'test505' },
  t_cod_2m: { lowerIsBetter: true, label: 'T. COD 2m', table: 'test505' },
  vel_cod_kmh: { lowerIsBetter: false, label: 'Vel COD', table: 'test505' },
  t_reacel_1_2m: { lowerIsBetter: true, label: 'T. Reaceleración 1.2m', table: 'test505' },
  t_reacel_2_2m: { lowerIsBetter: true, label: 'T. Reaceleración 2.2m', table: 'test505' },
  z_score_acel: { lowerIsBetter: false, label: 'Z-Score Acel', table: 'test505' },
  vo2_max: { lowerIsBetter: false, label: 'VO2 Máx', table: 'vo2max' },
  vam: { lowerIsBetter: false, label: 'VAM', table: 'vo2max' },
  vt1_vel: { lowerIsBetter: false, label: 'VT1 Velocidad', table: 'vo2max' },
  vt2_vel: { lowerIsBetter: false, label: 'VT2 Velocidad', table: 'vo2max' }
};

// Check normality of values using skewness & kurtosis
export function checkNormality(values: number[]): { isNormal: boolean; skewness: number; kurtosis: number } {
  if (values.length < 4) {
    return { isNormal: false, skewness: 0, kurtosis: 0 };
  }
  const n = values.length;
  const mean = values.reduce((sum, v) => sum + v, 0) / n;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
  if (variance === 0) return { isNormal: false, skewness: 0, kurtosis: 0 };
  const stdDev = Math.sqrt(variance);

  const m3 = values.reduce((sum, v) => sum + Math.pow(v - mean, 3), 0) / n;
  const m4 = values.reduce((sum, v) => sum + Math.pow(v - mean, 4), 0) / n;

  const skewness = m3 / Math.pow(stdDev, 3);
  const kurtosis = (m4 / Math.pow(stdDev, 4)) - 3;

  // Normal if skewness in [-1.0, 1.0] and kurtosis in [-1.5, 1.5]
  const isNormal = Math.abs(skewness) <= 1.0 && Math.abs(kurtosis) <= 1.5;
  return { isNormal, skewness, kurtosis };
}

// Compute percentile rank of value in sample
export function getPercentile(values: number[], val: number): number {
  if (values.length === 0) return 50;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = sorted.filter(v => v < val).length;
  const countSame = sorted.filter(v => v === val).length;
  const percentile = ((rank + 0.5 * countSame) / sorted.length) * 100;
  return Math.min(100, Math.max(0, percentile));
}

// Helper to safely extract metric from a row object
export function resolveMetricValue(row: any, key: string): number | null {
  if (!row) return null;
  let val = row[key];
  if (val === undefined || val === null || val === '') {
    // Fallbacks
    if (key === 'imtp_fuerza_n') val = row['Peak Vertical Force [N]'] || row.imtp_fuerza_n;
    if (key === 'imtp_f_relativa_n_kg') val = row['Peak Vertical Force / BM'] || row['Peak Vertical Force / BM [N/kg]'] || row.imtp_f_relativa_n_kg;
    if (key === 'imtp_force_50ms') val = row['Force (Net of BW) at 50ms [N]'] || row['Force (Net of BW) at 50ms'] || row.imtp_force_50ms;
    if (key === 'imtp_rfd_100ms') val = row['RFD - 100ms [N/s]'] || row.imtp_rfd_100ms;
    if (key === 'imtp_rfd_150ms') val = row['RFD - 150ms [N/s]'] || row.imtp_rfd_150ms;
    if (key === 'imtp_rfd_200ms') val = row['RFD - 200ms [N/s]'] || row.imtp_rfd_200ms;
    if (key === 'fuerza_cmj') val = row.concentric_peak_force_n || row.fuerza_cmj;
    if (key === 'cmj_rsi_mod') val = row.rsi_modified_m_s || row.cmj_rsi_mod;
    if (key === 'cmj_altura_salto_im') val = row.jump_height_impmom_cm || row.cmj_altura_salto_im;
    if (key === 'cmj_peak_pot_relativa') val = row.peak_power_bm_w_kg || row.cmj_peak_pot_relativa;
    if (key === 'peak_power_w') val = row.peak_power_w;
    if (key === 'concentric_impulse_ns') val = row.concentric_impulse_ns;
    if (key === 'take_off_momentum_kg_m_s') val = row.take_off_momentum_kg_m_s || row.take_off_momentum_kg_m_s_val;
  }
  return val !== undefined && val !== null && val !== '' && !isNaN(Number(val)) ? Number(val) : null;
}

// React component: Individual Training Orientation Card
export const FichaOrientacionAtleta: React.FC<{
  player: PlayerData;
  imtp: IMTPData[];
  speed: SpeedTestData[];
  vo2max: VO2MaxData[];
  test505: any[];
  cmjRebound: CMJReboundData[];
  allPlayers: PlayerData[];
  allImtp: IMTPData[];
  allSpeed: SpeedTestData[];
  allVo2: VO2MaxData[];
  allTest505: any[];
  allCmjRebound: CMJReboundData[];
}> = ({
  player, imtp, speed, vo2max, test505, cmjRebound,
  allPlayers, allImtp, allSpeed, allVo2, allTest505, allCmjRebound
}) => {
  // State for user configuration of rules
  const [validityDays, setValidityDays] = useState(() => Number(localStorage.getItem('fo_validityDays') || '30'));
  const [asymmetryThreshold, setAsymmetryThreshold] = useState(() => Number(localStorage.getItem('fo_asymmetryThreshold') || '10'));
  const [nLowConfidence, setNLowConfidence] = useState(() => Number(localStorage.getItem('fo_nLowConfidence') || '40'));
  const [selectedRefGroup, setSelectedRefGroup] = useState<'cohorte' | 'todos'>(() => (localStorage.getItem('fo_selectedRefGroup') || 'cohorte') as any);
  const [showConfig, setShowConfig] = useState(false);
  
  // Persist configurations
  useEffect(() => {
    localStorage.setItem('fo_validityDays', String(validityDays));
    localStorage.setItem('fo_asymmetryThreshold', String(asymmetryThreshold));
    localStorage.setItem('fo_nLowConfidence', String(nLowConfidence));
    localStorage.setItem('fo_selectedRefGroup', selectedRefGroup);
  }, [validityDays, asymmetryThreshold, nLowConfidence, selectedRefGroup]);

  // Derive player birth year
  const playerYear = useMemo(() => {
    if (!player) return null;
    return player.fecha_nacimiento 
      ? new Date(player.fecha_nacimiento).getFullYear() 
      : ((player as any).anio ? Number((player as any).anio) : null);
  }, [player]);

  // Determine latest evaluation date for player to anchor the 30-day validity window
  const latestEvaluationDate = useMemo(() => {
    let latest = 0;
    const check = (dateStr?: string) => {
      if (!dateStr) return;
      const t = new Date(dateStr).getTime();
      if (t > latest) latest = t;
    };
    imtp.forEach(x => check(x.fecha_test));
    speed.forEach(x => check(x.fecha));
    vo2max.forEach(x => check(x.fecha));
    test505.forEach(x => check(x.fecha));
    cmjRebound.forEach(x => check(x.fecha_test));

    return latest > 0 ? new Date(latest) : new Date();
  }, [imtp, speed, vo2max, test505, cmjRebound]);

  const isTestValid = (testDateStr?: string) => {
    if (!testDateStr) return false;
    const testTime = new Date(testDateStr).getTime();
    const diffTime = latestEvaluationDate.getTime() - testTime;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= validityDays;
  };

  // reference player IDs
  const referencePlayerIds = useMemo(() => {
    let list = allPlayers || [];
    if (selectedRefGroup === 'cohorte' && playerYear) {
      list = list.filter(p => {
        const pYear = p.fecha_nacimiento 
          ? new Date(p.fecha_nacimiento).getFullYear() 
          : ((p as any).anio ? Number((p as any).anio) : null);
        return pYear === playerYear;
      });
    }
    return list.map(p => p.player_id);
  }, [allPlayers, selectedRefGroup, playerYear]);

  // Resolve single metric latest value in window for player
  const getLatestPlayerMetricInWindow = (metricKey: string): number | null => {
    let source: any[] = [];
    let dateKey = 'fecha';
    switch (METRIC_METADATA[metricKey]?.table) {
      case 'imtp': source = imtp; dateKey = 'fecha_test'; break;
      case 'rebound': source = cmjRebound; dateKey = 'fecha_test'; break;
      case 'speed': source = speed; dateKey = 'fecha'; break;
      case 'test505': source = test505; dateKey = 'fecha'; break;
      case 'vo2max': source = vo2max; dateKey = 'fecha'; break;
    }

    const validRecords = source
      .filter(row => isTestValid(row[dateKey]))
      .sort((a, b) => new Date(b[dateKey]).getTime() - new Date(a[dateKey]).getTime());

    if (validRecords.length === 0) return null;
    return resolveMetricValue(validRecords[0], metricKey);
  };

  // Resolve reference values
  const getReferenceMetricValues = (metricKey: string): number[] => {
    let source: any[] = [];
    let dateKey = 'fecha';
    switch (METRIC_METADATA[metricKey]?.table) {
      case 'imtp': source = allImtp; dateKey = 'fecha_test'; break;
      case 'rebound': source = allCmjRebound; dateKey = 'fecha_test'; break;
      case 'speed': source = allSpeed; dateKey = 'fecha'; break;
      case 'test505': source = allTest505; dateKey = 'fecha'; break;
      case 'vo2max': source = allVo2; dateKey = 'fecha'; break;
    }

    return source
      .filter(row => referencePlayerIds.includes(row.player_id) && isTestValid(row[dateKey]))
      .map(row => resolveMetricValue(row, metricKey))
      .filter((val): val is number => val !== null);
  };

  // Evaluate single metric against reference group
  const evaluatePlayerMetric = (metricKey: string) => {
    const playerVal = getLatestPlayerMetricInWindow(metricKey);
    if (playerVal === null) {
      return { status: 'DATOS INSUFICIENTES', value: null, isNormal: false, method: '-', n: 0, zScore: 0, percentile: 50, mean: 0 };
    }

    const refValues = getReferenceMetricValues(metricKey);
    const meta = METRIC_METADATA[metricKey] || { lowerIsBetter: false, label: metricKey };
    const n = refValues.length;

    if (n < 4) {
      const config = ALL_METRIC_CONFIGS[metricKey];
      let level: 'Élite' | 'Competitivo' | 'En desarrollo' | 'Atención' = 'Competitivo';
      if (config) {
        const { excellent, normal } = config.thresholds;
        if (meta.lowerIsBetter) {
          if (playerVal <= excellent) level = 'Élite';
          else if (playerVal <= normal) level = 'Competitivo';
          else level = 'Atención';
        } else {
          if (playerVal >= excellent) level = 'Élite';
          else if (playerVal >= normal) level = 'Competitivo';
          else level = 'Atención';
        }
      }
      return {
        status: level,
        value: playerVal,
        isNormal: false,
        method: 'Límites Absolutos (N Chico)',
        n,
        zScore: 0,
        percentile: 50,
        mean: config?.thresholds.normal || 0,
        stdDev: 1
      };
    }

    const norm = checkNormality(refValues);
    const mean = refValues.reduce((s, v) => s + v, 0) / n;
    const variance = refValues.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance) || 1;

    let level: 'Élite' | 'Competitivo' | 'En desarrollo' | 'Atención' = 'Competitivo';
    const zScore = (playerVal - mean) / stdDev;
    const percentile = getPercentile(refValues, playerVal);

    if (norm.isNormal) {
      if (meta.lowerIsBetter) {
        if (zScore <= -1.0) level = 'Élite';
        else if (zScore <= 0.5) level = 'Competitivo';
        else if (zScore <= 1.5) level = 'En desarrollo';
        else level = 'Atención';
      } else {
        if (zScore >= 1.0) level = 'Élite';
        else if (zScore >= -0.5) level = 'Competitivo';
        else if (zScore >= -1.5) level = 'En desarrollo';
        else level = 'Atención';
      }
    } else {
      if (meta.lowerIsBetter) {
        if (percentile <= 10) level = 'Élite';
        else if (percentile <= 75) level = 'Competitivo';
        else if (percentile <= 90) level = 'En desarrollo';
        else level = 'Atención';
      } else {
        if (percentile >= 90) level = 'Élite';
        else if (percentile >= 25) level = 'Competitivo';
        else if (percentile >= 10) level = 'En desarrollo';
        else level = 'Atención';
      }
    }

    return {
      status: level,
      value: playerVal,
      isNormal: norm.isNormal,
      method: norm.isNormal ? 'μ/σ (Normal)' : 'Percentiles (No Normal)',
      n,
      zScore,
      percentile,
      mean,
      stdDev,
      isLowConfidence: n < nLowConfidence && (level === 'Élite' || level === 'Atención')
    };
  };

  const getDomainStatus = (domainName: string, metricKeys: string[]) => {
    const evaluations = metricKeys.map(k => ({ key: k, label: METRIC_METADATA[k]?.label || k, result: evaluatePlayerMetric(k) }));
    const validEvaluations = evaluations.filter(e => e.result.status !== 'DATOS INSUFICIENTES');

    if (validEvaluations.length === 0) {
      return {
        status: 'DATOS INSUFICIENTES' as const,
        metrics: evaluations,
        badgeColor: 'bg-slate-100 text-slate-500 border-slate-200',
        textColor: 'text-slate-500',
        desc: 'No se registran datos para este dominio en los últimos 30 días.'
      };
    }

    if (validEvaluations.length < 2) {
      return {
        status: 'DATO PARCIAL' as const,
        metrics: evaluations,
        badgeColor: 'bg-cyan-50 text-cyan-600 border-cyan-200',
        textColor: 'text-cyan-600',
        desc: 'Datos parciales (se requiere al menos 2 métricas para clasificar el dominio).'
      };
    }

    const levelValues = { 'Élite': 3, 'Competitivo': 2, 'En desarrollo': 1, 'Atención': 0 };
    const sum = validEvaluations.reduce((acc, curr) => acc + levelValues[curr.result.status as keyof typeof levelValues], 0);
    const avg = sum / validEvaluations.length;

    let finalStatus: 'Élite' | 'Competitivo' | 'En desarrollo' | 'Atención' = 'Competitivo';
    let badgeColor = '';
    let textColor = '';

    if (avg >= 2.5) {
      finalStatus = 'Élite';
      badgeColor = 'bg-emerald-500 text-white border-emerald-600';
      textColor = 'text-emerald-500';
    } else if (avg >= 1.5) {
      finalStatus = 'Competitivo';
      badgeColor = 'bg-emerald-50 text-emerald-600 border-emerald-200';
      textColor = 'text-emerald-600';
    } else if (avg >= 0.5) {
      finalStatus = 'En desarrollo';
      badgeColor = 'bg-amber-50 text-amber-600 border-amber-200';
      textColor = 'text-amber-500';
    } else {
      finalStatus = 'Atención';
      badgeColor = 'bg-rose-50 text-rose-600 border-rose-200';
      textColor = 'text-rose-600';
    }

    const isLowConfidence = validEvaluations.some(e => e.result.isLowConfidence);

    return {
      status: finalStatus,
      metrics: evaluations,
      badgeColor,
      textColor,
      isLowConfidence,
      desc: `Clasificación promedio del dominio: ${finalStatus}.`
    };
  };

  // Evaluate all 7 domains
  const domainsData = useMemo(() => {
    return {
      fuerza: getDomainStatus('FUERZA MÁXIMA', ['imtp_fuerza_n', 'imtp_f_relativa_n_kg']),
      rfd: getDomainStatus('RFD/EXPLOSIVIDAD', ['imtp_rfd_100ms', 'imtp_rfd_150ms', 'imtp_rfd_200ms', 'imtp_force_50ms']),
      potencia: getDomainStatus('POTENCIA', ['peak_power_w', 'peak_power_bm_w_kg', 'cmj_altura_salto_im', 'concentric_impulse_ns', 'take_off_momentum_kg_m_s']),
      reactivo: getDomainStatus('CAPACIDAD REACTIVA', ['rebound_rsi', 'rebound_contact_time_ms', 'rebound_flight_time_ms']),
      velocidad: getDomainStatus('VELOCIDAD/ACELERACIÓN', ['vel_10m', 'vel_10_20m', 'vel_20_30m', 'tiempo_total']),
      cod: getDomainStatus('CAMBIO DE DIRECCIÓN', ['t_acel_2m', 'vel_acel_kmh', 't_desacel_2m', 'vel_desacel_kmh', 't_cod_2m', 'vel_cod_kmh', 't_reacel_1_2m', 't_reacel_2_2m', 'z_score_acel']),
      resistencia: getDomainStatus('RESISTENCIA AERÓBICA', ['vo2_max', 'vam', 'vt1_vel', 'vt2_vel']),
    };
  }, [referencePlayerIds, latestEvaluationDate, validityDays, nLowConfidence, selectedRefGroup]);

  // Lateral Asymmetry
  const asymmetryData = useMemo(() => {
    const val = getLatestPlayerMetricInWindow('imtp_asimetria');
    // search imtp_debil in latest valid record
    const validImtp = imtp
      .filter(row => isTestValid(row.fecha_test))
      .sort((a, b) => new Date(b.fecha_test).getTime() - new Date(a.fecha_test).getTime());
    const debil = validImtp.length > 0 ? validImtp[0].imtp_debil : null;
    const hasAsymmetry = val !== null && val > asymmetryThreshold;
    return { val, debil, hasAsymmetry };
  }, [imtp, latestEvaluationDate, validityDays, asymmetryThreshold]);

  // Training Decision Tree Rules Engine
  const trainingOrientations = useMemo(() => {
    const triggered: {
      id: string;
      type: 'GIMNASIO' | 'CANCHA';
      title: string;
      priority: 'ALTA' | 'MEDIA' | 'MANTENIMIENTO';
      description: string;
      ruleText: string;
      targetDomain: string;
    }[] = [];

    const { fuerza, rfd, potencia, reactivo, velocidad, cod, resistencia } = domainsData;

    // --- GIMNASIO RULES ---
    const isPotBaja = potencia.status === 'Atención' || potencia.status === 'En desarrollo';
    const isPotAlta = potencia.status === 'Élite' || potencia.status === 'Competitivo';
    const isFmAlta = fuerza.status === 'Élite' || fuerza.status === 'Competitivo';
    const isFmBaja = fuerza.status === 'Atención' || fuerza.status === 'En desarrollo';
    const isRfdBaja = rfd.status === 'Atención' || rfd.status === 'En desarrollo';

    // 1. Potencia baja + Fuerza alta
    if (potencia.status !== 'DATOS INSUFICIENTES' && potencia.status !== 'DATO PARCIAL' &&
        fuerza.status !== 'DATOS INSUFICIENTES' && fuerza.status !== 'DATO PARCIAL') {
      if (isPotBaja && isFmAlta) {
        triggered.push({
          id: 'POT_FM_1',
          type: 'GIMNASIO',
          title: 'Optimización de RFD y Velocidad-Fuerza',
          priority: 'ALTA',
          description: 'Dado que el jugador posee excelentes niveles de Fuerza Máxima pero no logra transferirla a Potencia, el entrenamiento en gimnasio debe priorizar la tasa de desarrollo de fuerza (RFD). Se prescribe trabajo dinámico con cargas ligeras a moderadas (30-50% 1RM) ejecutadas a la máxima velocidad concéntrica posible, derivados olímpicos y saltos balísticos.',
          ruleText: 'Potencia es Baja (Atención/En desarrollo) y Fuerza Máxima es Alta (Élite/Competitivo)',
          targetDomain: 'Potencia'
        });
      }
      // 2. Potencia baja + Fuerza baja
      else if (isPotBaja && isFmBaja) {
        triggered.push({
          id: 'POT_FM_2',
          type: 'GIMNASIO',
          title: 'Desarrollo de la Fuerza Base',
          priority: 'ALTA',
          description: 'El déficit de potencia está limitado principalmente por una baja base de fuerza absoluta. Se recomienda priorizar el trabajo de fuerza estructural y fuerza máxima en gimnasio (75-85% 1RM en ejercicios multiarticulares) antes de realizar entrenamientos específicos de velocidad de contracción.',
          ruleText: 'Potencia es Baja (Atención/En desarrollo) y Fuerza Máxima es Baja (Atención/En desarrollo)',
          targetDomain: 'Fuerza Máxima'
        });
      }
    }

    // 3. RFD bajo + Fuerza alta
    if (rfd.status !== 'DATOS INSUFICIENTES' && rfd.status !== 'DATO PARCIAL' &&
        fuerza.status !== 'DATOS INSUFICIENTES' && fuerza.status !== 'DATO PARCIAL') {
      if (isRfdBaja && isFmAlta) {
        triggered.push({
          id: 'RFD_FM_1',
          type: 'GIMNASIO',
          title: 'Explosividad y RFD Específico',
          priority: 'ALTA',
          description: 'El jugador es fuerte pero produce fuerza con lentitud en las bandas iniciales del movimiento. Se prescribe entrenamiento de transferencia de fuerza a velocidad con saltos balísticos, lanzamientos cargados, y contracciones pliométricas de corto tiempo de acoplamiento.',
          ruleText: 'RFD es Baja (Atención/En desarrollo) y Fuerza Máxima es Alta (Élite/Competitivo)',
          targetDomain: 'RFD/Explosividad'
        });
      }
    }

    // 4. Capacidad reactiva baja
    if (reactivo.status === 'Atención' || reactivo.status === 'En desarrollo') {
      triggered.push({
        id: 'REA_1',
        type: 'GIMNASIO',
        title: 'Pliometría Reactiva (SSC Rápido)',
        priority: 'ALTA',
        description: 'La capacidad elástica de amortiguación y rebote es deficiente. Se prescribe trabajo pliométrico de rebote rápido, pogo jumps y drop jumps enfocados en la rigidez músculo-tendinosa del tobillo (stiffness) para minimizar los tiempos de contacto con el suelo.',
        ruleText: 'Capacidad Reactiva es Baja (Atención/En desarrollo)',
        targetDomain: 'Capacidad Reactiva'
      });
    }

    // 5. Asimetría IMTP alta
    if (asymmetryData.hasAsymmetry) {
      triggered.push({
        id: 'ASIM_1',
        type: 'GIMNASIO',
        title: 'Prevención Unilateral por Asimetría Lateral',
        priority: 'ALTA',
        description: `Se detecta una asimetría del ${asymmetryData.val?.toFixed(1)}% superando el umbral de seguridad. Se prescribe trabajo unilateral enfocado en equiparar la fuerza de la extremidad deficiente (${asymmetryData.debil}) mediante estocadas búlgaras, peso muerto rumano unilateral y ejercicios excéntricos de cadena posterior unipodales.`,
        ruleText: `Asimetría IMTP (${asymmetryData.val?.toFixed(1)}%) supera el umbral configurado (${asymmetryThreshold}%)`,
        targetDomain: 'Asimetría (Transversal)'
      });
    }

    // --- CANCHA RULES ---

    // 6. COD deficiente con desglose de fases
    if (cod.status === 'Atención' || cod.status === 'En desarrollo') {
      const tDesacel = getLatestPlayerMetricInWindow('t_desacel_2m');
      const tReacel = getLatestPlayerMetricInWindow('t_reacel_1_2m');
      
      const refDesacel = getReferenceMetricValues('t_desacel_2m');
      const refReacel = getReferenceMetricValues('t_reacel_1_2m');
      
      const meanDesacel = refDesacel.length > 0 ? refDesacel.reduce((s, v) => s + v, 0) / refDesacel.length : 2.25;
      const meanReacel = refReacel.length > 0 ? refReacel.reduce((s, v) => s + v, 0) / refReacel.length : 2.25;

      const isDesacelLenta = tDesacel !== null && tDesacel > meanDesacel;
      const isReacelLenta = tReacel !== null && tReacel > meanReacel;

      if (isDesacelLenta) {
        triggered.push({
          id: 'COD_DESACEL_1',
          type: 'CANCHA',
          title: 'Trabajo Excéntrico y Técnica de Desaceleración',
          priority: 'ALTA',
          description: 'El desglose del test 505 revela una debilidad severa en la fase de desaceleración y frenado inicial. Se prescribe trabajo de frenados secos en cancha a alta intensidad y sobrecarga excéntrica (polea cónica en gimnasio) para entrenar la tolerancia a la fuerza excéntrica en frenado.',
          ruleText: 'Cambio de Dirección deficiente y Tiempo de Desaceleración > Promedio del grupo',
          targetDomain: 'Cambio de Dirección'
        });
      }
      
      if (isReacelLenta) {
        triggered.push({
          id: 'COD_REACEL_1',
          type: 'CANCHA',
          title: 'Técnica de Reaceleración y Primer Paso Explosivo',
          priority: 'ALTA',
          description: 'La fase de salida y reaceleración tras el giro de 180° es lenta. Se prescribe entrenamiento de reaceleraciones explosivas asistidas por gomas elásticas, técnica de empuje horizontal del primer paso de carrera y driles de salida lateral en cancha.',
          ruleText: 'Cambio de Dirección deficiente y Tiempo de Reaceleración > Promedio del grupo',
          targetDomain: 'Cambio de Dirección'
        });
      }

      if (!isDesacelLenta && !isReacelLenta) {
        triggered.push({
          id: 'COD_GENERAL',
          type: 'CANCHA',
          title: 'Driles de Agilidad y Técnica de Corte',
          priority: 'MEDIA',
          description: 'Se requiere mejorar la técnica general de cambio de dirección. Se recomienda practicar ángulos de corte cerrados en cancha, minimizando la pérdida de inercia y controlando la altura del centro de masas en el giro.',
          ruleText: 'Cambio de Dirección deficiente con fases equilibradas',
          targetDomain: 'Cambio de Dirección'
        });
      }
    }

    // 7. Velocidad baja con potencia adecuada
    if (velocidad.status === 'Atención' || velocidad.status === 'En desarrollo') {
      if (isPotAlta) {
        triggered.push({
          id: 'VEL_1',
          type: 'CANCHA',
          title: 'Sprint Específico en Cancha (Mecánica y Transferencia)',
          priority: 'ALTA',
          description: 'El jugador tiene niveles altos de potencia muscular en gimnasio pero baja velocidad en carrera. Se prescribe entrenamiento de sprints resistidos ligeros (trineos al 10% de masa corporal) para mejorar la aplicación horizontal de fuerza y corrección de la mecánica de zancada en cancha.',
          ruleText: 'Velocidad es Baja (Atención/En desarrollo) y Potencia es Alta (Élite/Competitivo)',
          targetDomain: 'Velocidad/Aceleración'
        });
      } else {
        triggered.push({
          id: 'VEL_2',
          type: 'CANCHA',
          title: 'Fuerza Horizontal y Aceleración de Cancha',
          priority: 'MEDIA',
          description: 'La velocidad lineal máxima es deficiente. Se prescribe trabajo de aceleraciones cortas (10-30m) con descansos completos y empujes intensivos de trineo en cancha para estimular fibras rápidas.',
          ruleText: 'Velocidad es Baja (Atención/En desarrollo)',
          targetDomain: 'Velocidad/Aceleración'
        });
      }
    }

    // 8. Resistencia baja (vam/vo2max)
    if (resistencia.status === 'Atención' || resistencia.status === 'En desarrollo') {
      triggered.push({
        id: 'AER_1',
        type: 'CANCHA',
        title: 'Prescripción de HIIT Específico y Pasadas Intermitentes',
        priority: 'ALTA',
        description: 'La capacidad aeróbica y velocidad aeróbica máxima (VAM) se encuentran bajas. Se prescribe entrenamiento de pasadas intermitentes basadas en el 100-105% de su VAM personal en cancha (p.ej. bloques de 15s carrera / 15s pausa pasiva) o driles de espacio reducido de alta densidad aeróbica.',
        ruleText: 'Resistencia Aeróbica es Baja (Atención/En desarrollo)',
        targetDomain: 'Resistencia Aeróbica'
      });
    }

    if (triggered.length === 0) {
      triggered.push({
        id: 'MANTENIMIENTO_GENERAL',
        type: 'GIMNASIO',
        title: 'Programa de Mantenimiento de Élite',
        priority: 'MANTENIMIENTO',
        description: 'Todas las capacidades atléticas evaluadas demuestran niveles óptimos. Se recomienda sostener el volumen actual de entrenamiento preventivo, trabajo reactivo de baja intensidad y fuerza submáxima para mantener estos estándares y prevenir la fatiga.',
        ruleText: 'Todas las evaluaciones vigentes se encuentran en rangos de excelencia',
        targetDomain: 'General'
      });
    }

    return triggered;
  }, [domainsData, asymmetryData, asymmetryThreshold]);

  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);

  return (
    <div className="bg-slate-900 text-white rounded-[40px] p-8 shadow-2xl border border-slate-800 space-y-8 my-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* HEADER DE LA FICHA */}
      <div className="flex flex-wrap justify-between items-start gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-6 bg-red-600 rounded-full"></span>
            <h3 className="text-xl font-black uppercase tracking-tighter italic">Ficha de Orientación de Entrenamiento</h3>
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
            Motor de reglas auditable de Sport Science · Analizado en base a la cohorte de selección nacional
          </p>
        </div>

        <div className="flex gap-2 items-center">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="w-10 h-10 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl flex items-center justify-center transition cursor-pointer"
            title="Configurar Umbrales y Motor de Reglas"
          >
            <i className={`fa-solid ${showConfig ? 'fa-xmark' : 'fa-sliders'} text-xs`}></i>
          </button>
          
          <select
            value={selectedRefGroup}
            onChange={(e) => setSelectedRefGroup(e.target.value as any)}
            className="bg-slate-800 border-none rounded-xl px-4 py-2.5 text-[10px] font-black text-slate-300 outline-none focus:ring-2 focus:ring-red-600 uppercase tracking-widest"
          >
            <option value="cohorte">Cohorte ({playerYear || 'S/D'})</option>
            <option value="todos">Todos los Atletas</option>
          </select>
        </div>
      </div>

      {/* CONFIGURACIÓN DEL MOTOR DE REGLAS */}
      <AnimatePresence>
        {showConfig && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-slate-850 rounded-3xl p-6 border border-slate-800 space-y-6 overflow-hidden"
          >
            <h4 className="text-xs font-black uppercase tracking-widest text-red-500 flex items-center gap-2">
              <i className="fa-solid fa-gear"></i> Ajustes de Umbrales y Algoritmo de Decisión (Cuerpo Técnico)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Ventana de Vigencia de Tests (Días)</label>
                <input
                  type="number"
                  value={validityDays}
                  onChange={(e) => setValidityDays(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-red-600"
                />
                <span className="text-[8px] text-slate-500 font-bold block">Filtra evaluaciones realizadas en los últimos N días.</span>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Umbral de Alerta Asimetría IMTP (%)</label>
                <input
                  type="number"
                  value={asymmetryThreshold}
                  onChange={(e) => setAsymmetryThreshold(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-red-600"
                />
                <span className="text-[8px] text-slate-500 font-bold block">Porcentaje de diferencia lateral que gatilla alerta médica.</span>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">N Mínimo para Confianza (Muestra)</label>
                <input
                  type="number"
                  value={nLowConfidence}
                  onChange={(e) => setNLowConfidence(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-red-600"
                />
                <span className="text-[8px] text-slate-500 font-bold block">Indica alertas de baja confiabilidad estadística en colas si N es chico.</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* METRIC CARD RESUMEN Y SEMÁFORO DE DOMINIOS */}
      <div className="space-y-4">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Semáforo de Desempeño por Dominios Físicos</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Object.entries(domainsData).map(([key, data]) => {
            const isExpanded = expandedDomain === key;
            return (
              <div 
                key={key} 
                className="bg-slate-800/60 rounded-3xl p-5 border border-slate-800 hover:border-slate-700 transition cursor-pointer flex flex-col justify-between"
                onClick={() => setExpandedDomain(isExpanded ? null : key)}
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      {key === 'fuerza' ? 'Fuerza Máxima' :
                       key === 'rfd' ? 'RFD / Explosividad' :
                       key === 'potencia' ? 'Potencia' :
                       key === 'reactivo' ? 'Capacidad Reactiva' :
                       key === 'velocidad' ? 'Velocidad' :
                       key === 'cod' ? 'Cambio de Dirección' : 'Resistencia Aeróbica'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase border ${data.badgeColor}`}>
                      {data.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold mt-2 leading-relaxed">
                    {data.desc}
                  </p>
                </div>

                {data.isLowConfidence && (
                  <div className="mt-3 flex items-center gap-1 bg-amber-500/10 text-amber-500 px-2 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest border border-amber-500/20">
                    <i className="fa-solid fa-triangle-exclamation"></i> Baja Confianza (N Chico)
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-slate-750 flex items-center justify-between text-[9px] text-slate-400 font-bold uppercase">
                  <span>{isExpanded ? 'Ocultar Detalles' : 'Ver Detalles'}</span>
                  <i className={`fa-solid ${isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'} text-[8px]`}></i>
                </div>

                {/* DETALLE DESPLEGABLE DE MÉTRICAS */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-750 space-y-3 cursor-default" onClick={e => e.stopPropagation()}>
                    {data.metrics.map((m, mIdx) => (
                      <div key={mIdx} className="bg-slate-850 p-2.5 rounded-xl border border-slate-800 space-y-1">
                        <div className="flex justify-between text-[9px] font-black uppercase tracking-wider">
                          <span className="text-slate-300">{m.label}</span>
                          <span className={m.result.status === 'Élite' ? 'text-emerald-500' : m.result.status === 'Competitivo' ? 'text-emerald-400' : m.result.status === 'En desarrollo' ? 'text-amber-500' : 'text-rose-500'}>
                            {m.result.value !== null ? `${m.result.value.toFixed(1)}` : 'S/D'}
                          </span>
                        </div>
                        {m.result.value !== null && (
                          <div className="flex justify-between text-[8px] font-bold text-slate-500">
                            <span>Promedio Cohorte: {m.result.mean?.toFixed(1)}</span>
                            <span>Muestra: N={m.result.n} ({m.result.method})</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* RECOMENDACIONES Y PLAN DE TRABAJO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-800">
        
        {/* COLUMNA GIMNASIO */}
        <div className="space-y-4">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <i className="fa-solid fa-dumbbell text-red-500"></i> Orientaciones de Gimnasio (Fuerza, RFD, Potencia, Prevención)
          </h4>
          <div className="space-y-4">
            {trainingOrientations.filter(o => o.type === 'GIMNASIO').map((o) => (
              <div key={o.id} className="bg-slate-850 rounded-3xl p-6 border border-slate-800 relative overflow-hidden space-y-3">
                <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{o.targetDomain}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-black ${o.priority === 'ALTA' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : o.priority === 'MEDIA' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'}`}>
                    PRIORIDAD: {o.priority}
                  </span>
                </div>
                <h5 className="text-sm font-black text-white uppercase tracking-tight">{o.title}</h5>
                <p className="text-[11px] text-slate-300 leading-relaxed font-bold">
                  {o.description}
                </p>
                <div className="pt-2 border-t border-slate-800 text-[8px] font-black text-slate-500 uppercase tracking-widest">
                  Regla disparada: {o.ruleText}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COLUMNA CANCHA */}
        <div className="space-y-4">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <i className="fa-solid fa-person-running text-emerald-500"></i> Orientaciones de Cancha (Velocidad, COD, Resistencia)
          </h4>
          <div className="space-y-4">
            {trainingOrientations.filter(o => o.type === 'CANCHA').map((o) => (
              <div key={o.id} className="bg-slate-850 rounded-3xl p-6 border border-slate-800 relative overflow-hidden space-y-3">
                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{o.targetDomain}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-black ${o.priority === 'ALTA' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : o.priority === 'MEDIA' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'}`}>
                    PRIORIDAD: {o.priority}
                  </span>
                </div>
                <h5 className="text-sm font-black text-white uppercase tracking-tight">{o.title}</h5>
                <p className="text-[11px] text-slate-300 leading-relaxed font-bold">
                  {o.description}
                </p>
                <div className="pt-2 border-t border-slate-800 text-[8px] font-black text-slate-500 uppercase tracking-widest">
                  Regla disparada: {o.ruleText}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* DISCLAIMERS OBLIGATORIOS */}
      <div className="pt-6 border-t border-slate-800 space-y-2 text-[9px] text-slate-500 font-bold leading-relaxed">
        <p>
          ⚠️ <strong>Disclaimer de Referencia:</strong> Clasificación relativa a jugadores de selección nacional (grupo ya seleccionado); el rótulo de "Atención" indica un cuartil bajo dentro de un grupo homogéneo de alto nivel, no un déficit físico absoluto para el deporte convencional.
        </p>
        <p>
          ⚠️ <strong>Disclaimer Biológico:</strong> El grupo de referencia se define por cohorte cronológica (año de nacimiento) y no ajusta por maduración biológica interna; interpretar con cautela extrema en jugadores que estén en ventana de crecimiento acelerado (pre o circum-PHV).
        </p>
        <p>
          📊 <strong>Métrica y Ventana:</strong> Se consideran vigentes únicamente las pruebas realizadas dentro de los últimos {validityDays} días. El cálculo de normalidad utiliza skewness y kurtosis de la muestra de referencia, alternando a percentiles en distribuciones no normales.
        </p>
      </div>

    </div>
  );
};


// React Component: Group Training Orientation Card
export const FichaOrientacionGrupal: React.FC<{
  players: PlayerData[];
  imtp: IMTPData[];
  speed: SpeedTestData[];
  vo2max: VO2MaxData[];
  test505: any[];
  cmjRebound: CMJReboundData[];
}> = ({
  players, imtp, speed, vo2max, test505, cmjRebound
}) => {
  const [validityDays] = useState(30);

  // Group evaluations computation
  const groupReport = useMemo(() => {
    const totalPlayers = players.length;
    if (totalPlayers === 0) return null;

    // Define standard domains and metrics keys
    const DOMAIN_METRICS: Record<string, string[]> = {
      'Fuerza Máxima': ['imtp_fuerza_n', 'imtp_f_relativa_n_kg'],
      'RFD / Explosividad': ['imtp_rfd_100ms', 'imtp_rfd_150ms', 'imtp_rfd_200ms', 'imtp_force_50ms'],
      'Potencia': ['peak_power_w', 'peak_power_bm_w_kg', 'cmj_altura_salto_im'],
      'Capacidad Reactiva': ['rebound_rsi', 'rebound_contact_time_ms', 'rebound_flight_time_ms'],
      'Velocidad': ['vel_10m', 'tiempo_total'],
      'Cambio de Dirección': ['t_cod_2m', 't_acel_2m', 't_desacel_2m'],
      'Resistencia Aeróbica': ['vo2_max', 'vam']
    };

    const domainDistribution: Record<string, { elite: number; competitive: number; dev: number; attention: number; incomplete: number }> = {};
    Object.keys(DOMAIN_METRICS).forEach(d => {
      domainDistribution[d] = { elite: 0, competitive: 0, dev: 0, attention: 0, incomplete: 0 };
    });

    const totalReferencedRecords: Record<string, number[]> = {};
    Object.entries(DOMAIN_METRICS).forEach(([_, keys]) => {
      keys.forEach(k => {
        totalReferencedRecords[k] = [];
      });
    });

    // Populate overall reference values from current squad to run cohort evaluations
    players.forEach(p => {
      const pId = p.player_id;
      // Resolve latest values in 30 days
      const checkValid = (row: any, dateKey: string) => {
        if (!row[dateKey]) return false;
        const diffDays = (new Date().getTime() - new Date(row[dateKey]).getTime()) / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= validityDays;
      };

      const pImtp = imtp.filter(r => r.player_id === pId && checkValid(r, 'fecha_test')).sort((a, b) => new Date(b.fecha_test).getTime() - new Date(a.fecha_test).getTime());
      const pSpeed = speed.filter(r => r.player_id === pId && checkValid(r, 'fecha')).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      const pVo2 = vo2max.filter(r => r.player_id === pId && checkValid(r, 'fecha')).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      const p505 = test505.filter(r => r.player_id === pId && checkValid(r, 'fecha')).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      const pRebound = cmjRebound.filter(r => r.player_id === pId && checkValid(r, 'fecha_test')).sort((a, b) => new Date(b.fecha_test).getTime() - new Date(a.fecha_test).getTime());

      Object.entries(DOMAIN_METRICS).forEach(([_, keys]) => {
        keys.forEach(k => {
          let row = null;
          switch (METRIC_METADATA[k]?.table) {
            case 'imtp': row = pImtp[0]; break;
            case 'rebound': row = pRebound[0]; break;
            case 'speed': row = pSpeed[0]; break;
            case 'test505': row = p505[0]; break;
            case 'vo2max': row = pVo2[0]; break;
          }
          const val = resolveMetricValue(row, k);
          if (val !== null) {
            totalReferencedRecords[k].push(val);
          }
        });
      });
    });

    // Run evaluations per player
    players.forEach(p => {
      const pId = p.player_id;
      const checkValid = (row: any, dateKey: string) => {
        if (!row[dateKey]) return false;
        const diffDays = (new Date().getTime() - new Date(row[dateKey]).getTime()) / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= validityDays;
      };

      const pImtp = imtp.filter(r => r.player_id === pId && checkValid(r, 'fecha_test')).sort((a, b) => new Date(b.fecha_test).getTime() - new Date(a.fecha_test).getTime());
      const pSpeed = speed.filter(r => r.player_id === pId && checkValid(r, 'fecha')).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      const pVo2 = vo2max.filter(r => r.player_id === pId && checkValid(r, 'fecha')).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      const p505 = test505.filter(r => r.player_id === pId && checkValid(r, 'fecha')).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      const pRebound = cmjRebound.filter(r => r.player_id === pId && checkValid(r, 'fecha_test')).sort((a, b) => new Date(b.fecha_test).getTime() - new Date(a.fecha_test).getTime());

      Object.entries(DOMAIN_METRICS).forEach(([dName, keys]) => {
        const statuses: string[] = [];
        keys.forEach(k => {
          let row = null;
          switch (METRIC_METADATA[k]?.table) {
            case 'imtp': row = pImtp[0]; break;
            case 'rebound': row = pRebound[0]; break;
            case 'speed': row = pSpeed[0]; break;
            case 'test505': row = p505[0]; break;
            case 'vo2max': row = pVo2[0]; break;
          }
          const val = resolveMetricValue(row, k);
          if (val !== null) {
            const refValues = totalReferencedRecords[k];
            const meta = METRIC_METADATA[k] || { lowerIsBetter: false };
            if (refValues.length >= 4) {
              const norm = checkNormality(refValues);
              const mean = refValues.reduce((s, v) => s + v, 0) / refValues.length;
              const variance = refValues.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / refValues.length;
              const stdDev = Math.sqrt(variance) || 1;
              const zScore = (val - mean) / stdDev;
              const percentile = getPercentile(refValues, val);

              if (norm.isNormal) {
                if (meta.lowerIsBetter) {
                  if (zScore <= -1.0) statuses.push('Élite');
                  else if (zScore <= 0.5) statuses.push('Competitivo');
                  else if (zScore <= 1.5) statuses.push('En desarrollo');
                  else statuses.push('Atención');
                } else {
                  if (zScore >= 1.0) statuses.push('Élite');
                  else if (zScore >= -0.5) statuses.push('Competitivo');
                  else if (zScore >= -1.5) statuses.push('En desarrollo');
                  else statuses.push('Atención');
                }
              } else {
                if (meta.lowerIsBetter) {
                  if (percentile <= 10) statuses.push('Élite');
                  else if (percentile <= 75) statuses.push('Competitivo');
                  else if (percentile <= 90) statuses.push('En desarrollo');
                  else statuses.push('Atención');
                } else {
                  if (percentile >= 90) statuses.push('Élite');
                  else if (percentile >= 25) statuses.push('Competitivo');
                  else if (percentile >= 10) statuses.push('En desarrollo');
                  else statuses.push('Atención');
                }
              }
            } else {
              // Abs backup
              const config = ALL_METRIC_CONFIGS[k];
              if (config) {
                const { excellent, normal } = config.thresholds;
                if (meta.lowerIsBetter) {
                  if (val <= excellent) statuses.push('Élite');
                  else if (val <= normal) statuses.push('Competitivo');
                  else statuses.push('Atención');
                } else {
                  if (val >= excellent) statuses.push('Élite');
                  else if (val >= normal) statuses.push('Competitivo');
                  else statuses.push('Atención');
                }
              }
            }
          }
        });

        if (statuses.length === 0) {
          domainDistribution[dName].incomplete++;
        } else {
          // Average numeric mapping: Élite=3, Competitivo=2, En desarrollo=1, Atención=0
          const levelMap = { 'Élite': 3, 'Competitivo': 2, 'En desarrollo': 1, 'Atención': 0 };
          const sum = statuses.reduce((acc, curr) => acc + levelMap[curr as keyof typeof levelMap], 0);
          const avg = sum / statuses.length;

          if (avg >= 2.5) domainDistribution[dName].elite++;
          else if (avg >= 1.5) domainDistribution[dName].competitive++;
          else if (avg >= 0.5) domainDistribution[dName].dev++;
          else domainDistribution[dName].attention++;
        }
      });
    });

    // Derive collective priorities
    const priorities: {
      domain: string;
      pctDeficit: number;
      type: 'GIMNASIO' | 'CANCHA';
      title: string;
      desc: string;
    }[] = [];

    Object.entries(domainDistribution).forEach(([dName, counts]) => {
      const activeTotal = totalPlayers - counts.incomplete;
      if (activeTotal === 0) return;
      const pctDeficit = ((counts.dev + counts.attention) / activeTotal) * 100;

      if (pctDeficit >= 25) {
        let title = '';
        let desc = '';
        let type: 'GIMNASIO' | 'CANCHA' = 'GIMNASIO';

        if (dName === 'Fuerza Máxima') {
          title = 'Ciclo de Fuerza Estructural de Grupo';
          desc = 'Más de un cuarto de la cohorte muestra deficiencia en Fuerza Máxima. Se prescribe una fase de hipertrofia funcional y fuerza absoluta colectiva con ejercicios multiarticulares (Sentadillas, IMTP).';
          type = 'GIMNASIO';
        } else if (dName === 'RFD / Explosividad') {
          title = 'Entrenamiento Dinámico de Explosividad Colectiva';
          desc = 'Bajo ratio de desarrollo de fuerza en las colas. Integrar bloques de intención explosiva, saltos cargados y lanzamientos rápidos antes de las sesiones tácticas.';
          type = 'GIMNASIO';
        } else if (dName === 'Potencia') {
          title = 'Optimización del Vector de Fuerza-Velocidad Grupal';
          desc = 'Niveles de potencia promedio bajos. Programar entrenamientos dinámicos con cargas óptimas y contrastes (fuerza máxima seguida de pliometría).';
          type = 'GIMNASIO';
        } else if (dName === 'Capacidad Reactiva') {
          title = 'Módulo Colectivo de Pliometría Reactiva (Stiffness)';
          desc = 'Falta de rigidez de tobillo generalizada. Se prescribe un bloque de 5-10 minutos de pliometría reactiva rápida (pogo jumps) en la entrada en calor grupal.';
          type = 'GIMNASIO';
        } else if (dName === 'Velocidad') {
          title = 'Módulo Grupal de Sprint y Mecánica Lineal';
          desc = 'Aceleración lineal deficiente. Integrar series de sprints cortos (10-20m) con recuperación completa al inicio de las sesiones de entrenamiento.';
          type = 'CANCHA';
        } else if (dName === 'Cambio de Dirección') {
          title = 'Taller de Desaceleración y Agilidad Multidireccional';
          desc = 'Deficiencias colectivas en driles con cambio de dirección. Realizar trabajos cerrados de técnica de frenado y primer paso de aceleración.';
          type = 'CANCHA';
        } else if (dName === 'Resistencia Aeróbica') {
          title = 'Programación Colectiva de HIIT y Pasadas Intermitentes';
          desc = 'La cohorte tiene niveles de VO2 Máx promedio subóptimos. Implementar pasadas intermitentes en cancha de 15s al 105% de la VAM del grupo por 15s de pausa activa.';
          type = 'CANCHA';
        }

        priorities.push({ domain: dName, pctDeficit, type, title, desc });
      }
    });

    return { domainDistribution, totalPlayers, priorities: priorities.sort((a, b) => b.pctDeficit - a.pctDeficit) };
  }, [players, imtp, speed, vo2max, test505, cmjRebound]);

  if (!groupReport) return null;

  return (
    <div className="bg-slate-900 text-white rounded-[40px] p-8 shadow-2xl border border-slate-800 space-y-8 my-6">
      <div className="flex items-center gap-3 pb-6 border-b border-slate-800">
        <span className="w-2.5 h-6 bg-emerald-500 rounded-full"></span>
        <div>
          <h3 className="text-xl font-black uppercase tracking-tighter italic">Ficha de Orientación de Entrenamiento Grupal</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
            Resumen consolidado para un grupo de {groupReport.totalPlayers} jugadores · Identificación colectiva de prioridades
          </p>
        </div>
      </div>

      {/* DISTRIBUCIÓN POR DOMINIOS */}
      <div className="space-y-6">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Distribución Porcentual del Desempeño por Dominio</h4>
        <div className="space-y-5">
          {Object.entries(groupReport.domainDistribution).map(([dName, counts]) => {
            const activeTotal = groupReport.totalPlayers - counts.incomplete;
            const pctElite = activeTotal > 0 ? (counts.elite / activeTotal) * 100 : 0;
            const pctComp = activeTotal > 0 ? (counts.competitive / activeTotal) * 100 : 0;
            const pctDev = activeTotal > 0 ? (counts.dev / activeTotal) * 100 : 0;
            const pctAtt = activeTotal > 0 ? (counts.attention / activeTotal) * 100 : 0;
            const pctInc = (counts.incomplete / groupReport.totalPlayers) * 100;

            return (
              <div key={dName} className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold uppercase">
                  <span className="text-slate-300 font-black">{dName}</span>
                  <span className="text-[10px] text-slate-500">Muestra evaluada: {activeTotal}/{groupReport.totalPlayers} jugadores</span>
                </div>
                
                {/* Segmented Progress Bar */}
                <div className="w-full h-5 rounded-full bg-slate-800 flex overflow-hidden border border-slate-750">
                  {pctElite > 0 && <div className="bg-emerald-600 h-full text-[8px] font-black flex items-center justify-center" style={{ width: `${pctElite}%` }} title={`Élite: ${counts.elite} (${pctElite.toFixed(0)}%)`}>{pctElite >= 10 && `${pctElite.toFixed(0)}%`}</div>}
                  {pctComp > 0 && <div className="bg-emerald-400 h-full text-[8px] font-black flex items-center justify-center text-slate-900" style={{ width: `${pctComp}%` }} title={`Competitivo: ${counts.competitive} (${pctComp.toFixed(0)}%)`}>{pctComp >= 10 && `${pctComp.toFixed(0)}%`}</div>}
                  {pctDev > 0 && <div className="bg-amber-500 h-full text-[8px] font-black flex items-center justify-center text-slate-950" style={{ width: `${pctDev}%` }} title={`En desarrollo: ${counts.dev} (${pctDev.toFixed(0)}%)`}>{pctDev >= 10 && `${pctDev.toFixed(0)}%`}</div>}
                  {pctAtt > 0 && <div className="bg-red-500 h-full text-[8px] font-black flex items-center justify-center" style={{ width: `${pctAtt}%` }} title={`Atención: ${counts.attention} (${pctAtt.toFixed(0)}%)`}>{pctAtt >= 10 && `${pctAtt.toFixed(0)}%`}</div>}
                  {pctInc > 0 && <div className="bg-slate-700 h-full text-[8px] font-black flex items-center justify-center text-slate-400" style={{ width: `${pctInc}%` }} title={`S/D: ${counts.incomplete} (${pctInc.toFixed(0)}%)`}>{pctInc >= 10 && `S/D`}</div>}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Leyenda de la barra */}
        <div className="flex flex-wrap gap-4 text-[9px] font-black uppercase tracking-wider justify-center pt-2">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-emerald-600 rounded-lg"></span> Élite</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-emerald-400 rounded-lg"></span> Competitivo</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-amber-500 rounded-lg"></span> En desarrollo</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-red-500 rounded-lg"></span> Atención</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-slate-700 rounded-lg"></span> Sin Datos Vigentes</span>
        </div>
      </div>

      {/* PLAN COLECTIVO */}
      <div className="pt-6 border-t border-slate-800 space-y-4">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Prioridades de Trabajo Colectivo Detectadas</h4>
        
        {groupReport.priorities.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {groupReport.priorities.map((p, idx) => (
              <div key={idx} className="bg-slate-850 p-6 rounded-3xl border border-slate-800 relative overflow-hidden space-y-3">
                <div className={`absolute top-0 left-0 w-1 h-full ${p.type === 'GIMNASIO' ? 'bg-red-600' : 'bg-emerald-500'}`}></div>
                <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider">
                  <span className="text-slate-400">{p.domain}</span>
                  <span className="text-red-500">Deficiencia: {p.pctDeficit.toFixed(0)}% del grupo</span>
                </div>
                <h5 className="text-sm font-black text-white uppercase tracking-tight">{p.title}</h5>
                <p className="text-[11px] text-slate-300 font-bold leading-relaxed">
                  {p.desc}
                </p>
                <div className="pt-2 border-t border-slate-800 text-[8px] font-black text-slate-500 uppercase tracking-widest">
                  Tipo de Prescripción: Colectiva de {p.type === 'GIMNASIO' ? 'Gimnasio' : 'Cancha (Cuerpo Técnico)'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-800/40 p-6 rounded-3xl text-center text-slate-400 font-bold uppercase text-xs border border-dashed border-slate-850">
            <i className="fa-solid fa-square-check text-emerald-500 text-3xl mb-3 block"></i>
            Excelente Consistencia. No se observan deficiencias colectivas mayores al 25% en ningún dominio físico.
          </div>
        )}
      </div>
    </div>
  );
};
