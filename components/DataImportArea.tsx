import React, { useState, useCallback, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { supabase } from '../lib/supabase';
import { User } from '../types';

import { fetchCatapultActivities, fetchCatapultActivityStats, fetchCatapultActivityDetail, testCatapultConnection } from '../services/catapultService';

type ImportType = 'gps_totales' | 'gps_tareas' | 'antropometria' | 'imtp' | 'cmj' | 'velocidad' | 'aceleracion' | 'vo2max' | 'wellness' | 'load' | 'catapult_api';

interface ImportConfig {
  label: string;
  table: string;
  icon: string;
  description: string;
  fields: { key: string; label: string; required: boolean; type: 'number' | 'string' | 'date' }[];
  conflictColumns: string[];
}

const IMPORT_CONFIGS: Record<ImportType, ImportConfig> = {
  gps_totales: {
    label: 'GPS Totales',
    table: 'gps_import',
    icon: 'fa-solid fa-satellite-dish',
    description: 'Carga de datos GPS acumulados por sesión.',
    conflictColumns: ['player_id', 'fecha', 'nombre_sesion'],
    fields: [
      { key: 'player_id', label: 'ID Jugador', required: true, type: 'number' },
      { key: 'fecha', label: 'Date', required: true, type: 'date' },
      { key: 'nombre_sesion', label: 'Nombre Sesión', required: false, type: 'string' },
      { key: 'minutos', label: 'Min', required: false, type: 'number' },
      { key: 'dist_total_m', label: 'Total Distance (m)', required: false, type: 'number' },
      { key: 'm_por_min', label: 'Metros/min', required: false, type: 'number' },
      { key: 'dist_ai_m_15_kmh', label: 'AInt >15 km/h', required: false, type: 'number' },
      { key: 'dist_mai_m_20_kmh', label: 'MAInt >20km/h', required: false, type: 'number' },
      { key: 'dist_sprint_m_25_kmh', label: 'Sprint >25 km/h', required: false, type: 'number' },
      { key: 'sprints_n', label: '# SP', required: false, type: 'number' },
      { key: 'vel_max_kmh', label: 'Max Vel (km/h)', required: false, type: 'number' },
      { key: 'acc_decc_ai_n', label: '#Acc+Decc AI', required: false, type: 'number' },
    ]
  },
  gps_tareas: {
    label: 'GPS por Tarea',
    table: 'gps_tareas',
    icon: 'fa-solid fa-stopwatch-20',
    description: 'Carga de datos GPS desglosados por ejercicio o tarea.',
    conflictColumns: ['player_id', 'fecha', 'tarea'],
    fields: [
      { key: 'player_id', label: 'ID Jugador', required: true, type: 'number' },
      { key: 'fecha', label: 'Date', required: true, type: 'date' },
      { key: 'tarea', label: 'Name', required: true, type: 'string' },
      { key: 'jugador_nombre', label: 'Nombre Jugador', required: false, type: 'string' },
      { key: 'bloque', label: 'Bloque', required: false, type: 'number' },
      { key: 'minutos', label: 'Min', required: false, type: 'number' },
      { key: 'dist_total_m', label: 'Total Distance (m)', required: false, type: 'number' },
      { key: 'm_por_min', label: 'Metros/min', required: false, type: 'number' },
      { key: 'dist_ai_m_15_kmh', label: 'AInt >15 km/h', required: false, type: 'number' },
      { key: 'dist_mai_m_20_kmh', label: 'MAInt >20km/h', required: false, type: 'number' },
      { key: 'dist_sprint_m_25_kmh', label: 'Sprint >25 km/h', required: false, type: 'number' },
      { key: 'sprints_n', label: '# SP', required: false, type: 'number' },
      { key: 'vel_max_kmh', label: 'Max Vel (km/h)', required: false, type: 'number' },
      { key: 'acc_decc_ai_n', label: '#Acc+Decc AI', required: false, type: 'number' },
    ]
  },
  antropometria: {
    label: 'Antropometría',
    table: 'antropometria',
    icon: 'fa-solid fa-ruler-combined',
    description: 'Carga de mediciones corporales y composición.',
    conflictColumns: ['player_id', 'fecha_medicion'],
    fields: [
      { key: 'player_id', label: 'ID Jugador', required: true, type: 'number' },
      { key: 'fecha_medicion', label: 'Fecha Medición', required: true, type: 'date' },
      { key: 'masa_corporal_kg', label: 'Masa Corporal (kg)', required: true, type: 'number' },
      { key: 'talla_cm', label: 'Talla (cm)', required: true, type: 'number' },
      { key: 'talla_sentada_cm', label: 'Talla Sentada (cm)', required: false, type: 'number' },
      { key: 'masa_muscular_kg', label: 'Masa Muscular (kg)', required: false, type: 'number' },
      { key: 'masa_muscular_pct', label: 'Masa Muscular (%)', required: false, type: 'number' },
      { key: 'masa_adiposa_kg', label: 'Masa Adiposa (kg)', required: false, type: 'number' },
      { key: 'masa_adiposa_pct', label: 'Masa Adiposa (%)', required: false, type: 'number' },
      { key: 'masa_osea_kg', label: 'Masa Ósea (kg)', required: false, type: 'number' },
      { key: 'masa_osea_pct', label: 'Masa Ósea (%)', required: false, type: 'number' },
      { key: 'indice_imo', label: 'Índice IMO', required: false, type: 'number' },
      { key: 'indice_imc', label: 'Índice IMC', required: false, type: 'number' },
      { key: 'sum_pliegues_6_mm', label: 'Suma 6 Pliegues (mm)', required: false, type: 'number' },
      { key: 'sum_pliegues_8_mm', label: 'Suma 8 Pliegues (mm)', required: false, type: 'number' },
      { key: 'somatotipo_endo', label: 'Somatotipo Endo', required: false, type: 'number' },
      { key: 'somatotipo_meso', label: 'Somatotipo Meso', required: false, type: 'number' },
      { key: 'somatotipo_ecto', label: 'Somatotipo Ecto', required: false, type: 'number' },
      { key: 'somatotipo_eje_x', label: 'Somatotipo Eje X', required: false, type: 'number' },
      { key: 'somatotipo_eje_y', label: 'Somatotipo Eje Y', required: false, type: 'number' },
      { key: 'maduracion_media', label: 'Maduración Media', required: false, type: 'number' },
      { key: 'phv_media', label: 'PHV Media', required: false, type: 'number' },
      { key: 'cm_por_crecer_media', label: 'CM por Crecer (Media)', required: false, type: 'number' },
      { key: 'estatura_proy_media_cm', label: 'Estatura Proy Media (cm)', required: false, type: 'number' },
    ]
  },
  imtp: {
    label: 'IMTP (Fuerza)',
    table: 'evaluaciones_imtp',
    icon: 'fa-solid fa-dumbbell',
    description: 'Isometric Mid-Thigh Pull - Test de fuerza máxima.',
    conflictColumns: ['player_id', 'fecha_test'],
    fields: [
      { key: 'jugador', label: 'NOMBRE JUGADOR', required: true, type: 'string' },
      { key: 'player_id', label: 'ID JUGADOR', required: true, type: 'number' },
      { key: 'fecha_test', label: 'FECHA TEST', required: true, type: 'date' },
      { key: 'peso', label: 'PESO (kg)', required: false, type: 'number' },
      { key: 'imtp_fuerza_n', label: 'IMTP FUERZA (N)', required: true, type: 'number' },
      { key: 'imtp_f_relativa_n_kg', label: 'IMTP F. RELATIVA (N/kg)', required: false, type: 'number' },
      { key: 'imtp_asimetria', label: 'IMTP ASIMETRIA (%)', required: false, type: 'number' },
      { key: 'imtp_debil', label: 'IMTP DEBIL', required: false, type: 'string' },
      { key: 'observaciones', label: 'OBSERVACIONES', required: false, type: 'string' },
    ]
  },
  cmj: {
    label: 'CMJ (Saltos)',
    table: 'evaluaciones_cmj',
    icon: 'fa-solid fa-arrows-up-down',
    description: 'Countermovement Jump - Tests de saltos y asimetrías.',
    conflictColumns: ['player_id', 'fecha_test'],
    fields: [
      { key: 'jugador', label: 'NOMBRE JUGADOR', required: true, type: 'string' },
      { key: 'player_id', label: 'ID JUGADOR', required: true, type: 'number' },
      { key: 'fecha_test', label: 'FECHA TEST', required: true, type: 'date' },
      { key: 'peso', label: 'PESO (kg)', required: false, type: 'number' },
      { key: 'fuerza_cmj', label: 'FUERZA CMJ', required: false, type: 'number' },
      { key: 'cmj_rsi_mod', label: 'CMJ RSI MOD', required: false, type: 'number' },
      { key: 'cmj_altura_salto_im', label: 'CMJ ALTURA IM (cm)', required: false, type: 'number' },
      { key: 'cmj_salto_tv', label: 'CMJ SALTO TV', required: false, type: 'number' },
      { key: 'cmj_peak_pot_relativa', label: 'CMJ POT. RELATIVA', required: false, type: 'number' },
      { key: 'cmj_asimetria_aterrizaje', label: 'CMJ ASIM. ATERRIZAJE (%)', required: false, type: 'number' },
      { key: 'landing_n', label: 'LANDING (N)', required: false, type: 'number' },
      { key: 'landing_relativo', label: 'LANDING RELATIVO', required: false, type: 'number' },
      { key: 'cmj_pierna_debil', label: 'CMJ PIERNA DEBIL', required: false, type: 'string' },
      { key: 'dsi_valor', label: 'DSI VALOR', required: false, type: 'number' },
      { key: 'avk_peak_pot_relativa', label: 'AVK POT. RELATIVA', required: false, type: 'number' },
      { key: 'avk_indice_uso_brazos_tv', label: 'AVK INDICE BRAZOS TV', required: false, type: 'number' },
      { key: 'avk_x_tv', label: 'AVK X TV', required: false, type: 'number' },
      { key: 'avk_x_im', label: 'AVK X IM', required: false, type: 'number' },
      { key: 'avk_indice_uso_brazos_im', label: 'AVK INDICE BRAZOS IM', required: false, type: 'number' },
      { key: 'slcmj_izq_altura_im', label: 'SLCJ IZQ ALTURA IM', required: false, type: 'number' },
      { key: 'slcmj_izq_altura_tv', label: 'SLCJ IZQ ALTURA TV', required: false, type: 'number' },
      { key: 'slcmj_der_altura_im', label: 'SLCJ DER ALTURA IM', required: false, type: 'number' },
      { key: 'slcmj_der_altura_tv', label: 'SLCJ DER ALTURA TV', required: false, type: 'number' },
      { key: 'slcmj_diferencia_pct_im', label: 'SLCJ DIFERENCIA % IM', required: false, type: 'number' },
      { key: 'slcmj_diferencia_pct_tv', label: 'SLCJ DIFERENCIA % TV', required: false, type: 'number' },
      { key: 'deficit_bilateral', label: 'DEFICIT BILATERAL', required: false, type: 'number' },
      { key: 'altura_x_rsi_mod', label: 'ALTURA X RSI MOD', required: false, type: 'number' },
      { key: 'observaciones', label: 'OBSERVACIONES', required: false, type: 'string' },
    ]
  },
  velocidad: {
    label: 'Velocidad',
    table: 'velocidad_tests',
    icon: 'fa-solid fa-bolt',
    description: 'Tests de velocidad con splits (10m, 20m, 30m).',
    conflictColumns: ['player_id', 'fecha'],
    fields: [
      { key: 'player_id', label: 'ID JUGADOR', required: true, type: 'number' },
      { key: 'jugador', label: 'NOMBRE JUGADOR', required: true, type: 'string' },
      { key: 'fecha', label: 'FECHA TEST', required: true, type: 'date' },
      { key: 'tiempo_10m', label: 'TIEMPO 10mts', required: false, type: 'number' },
      { key: 'vel_10m', label: 'VEL 10mts', required: false, type: 'number' },
      { key: 'tiempo_10_20m', label: 'TIEMPO 10-20mts', required: false, type: 'number' },
      { key: 'vel_10_20m', label: 'VEL 10-20mts', required: false, type: 'number' },
      { key: 'tiempo_20_30m', label: 'TIEMPO 20-30mts', required: false, type: 'number' },
      { key: 'vel_20_30m', label: 'VEL 20-30mts', required: false, type: 'number' },
      { key: 'vel_max_kmh', label: 'VEL MAX (km/h)', required: false, type: 'number' },
      { key: 'tiempo_total', label: 'TIEMPO TOTAL', required: true, type: 'number' },
    ]
  },
  aceleracion: {
    label: 'Aceleración',
    table: 'physical_tests',
    icon: 'fa-solid fa-gauge-high',
    description: 'Tests de aceleración específica.',
    conflictColumns: ['player_id', 'fecha', 'test_type'],
    fields: [
      { key: 'player_id', label: 'ID Jugador', required: true, type: 'number' },
      { key: 'fecha', label: 'Fecha', required: true, type: 'date' },
      { key: 'value', label: 'Valor (m/s²)', required: true, type: 'number' },
      { key: 'observation', label: 'Observación', required: false, type: 'string' },
    ]
  },
  vo2max: {
    label: 'Consumo Oxígeno',
    table: 'vo2max_tests',
    icon: 'fa-solid fa-lungs',
    description: 'VO2 Max - Capacidad aeróbica detallada.',
    conflictColumns: ['player_id', 'fecha'],
    fields: [
      { key: 'player_id', label: 'ID JUGADOR', required: true, type: 'number' },
      { key: 'jugador', label: 'NOMBRE JUGADOR', required: true, type: 'string' },
      { key: 'fecha', label: 'FECHA TEST', required: true, type: 'date' },
      { key: 'peso', label: 'PESO (kg)', required: false, type: 'number' },
      { key: 'vt1_vel', label: 'VT1 VEL', required: false, type: 'number' },
      { key: 'vt1_pct', label: 'VT1 %', required: false, type: 'number' },
      { key: 'vt1_fc', label: 'VT1 FC', required: false, type: 'number' },
      { key: 'vt2_vel', label: 'VT2 VEL', required: false, type: 'number' },
      { key: 'vt2_pct', label: 'VT2 %', required: false, type: 'number' },
      { key: 'vt2_fc', label: 'VT2 FC', required: false, type: 'number' },
      { key: 'vo2_max', label: 'VO2 MAX', required: true, type: 'number' },
      { key: 'vam', label: 'VMA (km/h)', required: false, type: 'number' },
      { key: 'fc_max', label: 'FC MAX', required: false, type: 'number' },
      { key: 'nivel', label: 'NIVEL', required: false, type: 'number' },
      { key: 'pasada', label: 'PASADA', required: false, type: 'number' },
      { key: 'mts', label: 'DISTANCIA (m)', required: false, type: 'number' },
      { key: 'vfa', label: 'VFA', required: false, type: 'number' },
      { key: 'observaciones', label: 'OBSERVACIONES', required: false, type: 'string' },
    ]
  },
  wellness: {
    label: 'Wellness',
    table: 'wellness_checkin',
    icon: 'fa-solid fa-sun',
    description: 'Carga masiva de reportes de bienestar (Fatiga, Sueño, Estrés).',
    conflictColumns: ['player_id', 'checkin_date'],
    fields: [
      { key: 'player_id', label: 'ID Jugador', required: true, type: 'number' },
      { key: 'checkin_date', label: 'Fecha', required: true, type: 'date' },
      { key: 'fatigue', label: 'Fatiga (1-5)', required: true, type: 'number' },
      { key: 'sleep_quality', label: 'Calidad Sueño (1-5)', required: true, type: 'number' },
      { key: 'stress', label: 'Estrés (1-5)', required: true, type: 'number' },
      { key: 'mood', label: 'Estado Ánimo (1-5)', required: true, type: 'number' },
      { key: 'soreness', label: 'Dolor (1-5)', required: false, type: 'number' },
      { key: 'molestias', label: 'Molestias (Texto)', required: false, type: 'string' },
      { key: 'enfermedad', label: 'Enfermedad (Texto)', required: false, type: 'string' },
    ]
  },
  load: {
    label: 'Carga Interna',
    table: 'internal_load',
    icon: 'fa-solid fa-chart-line',
    description: 'Carga masiva de PSE y duración de sesiones.',
    conflictColumns: ['player_id', 'session_date'],
    fields: [
      { key: 'player_id', label: 'ID Jugador', required: true, type: 'number' },
      { key: 'session_date', label: 'Fecha', required: true, type: 'date' },
      { key: 'rpe', label: 'RPE (1-10)', required: true, type: 'number' },
      { key: 'duration_min', label: 'Duración (min)', required: true, type: 'number' },
      { key: 'type', label: 'Tipo (FIELD/GYM/MATCH)', required: false, type: 'string' },
      { key: 'molestias', label: 'Molestias (Texto)', required: false, type: 'string' },
      { key: 'enfermedad', label: 'Enfermedad (Texto)', required: false, type: 'string' },
    ]
  },
  catapult_api: {
    label: 'Catapult Cloud Sync',
    table: 'gps_import',
    icon: 'fa-solid fa-cloud-arrow-down',
    description: 'Sincronización directa con la nube de Catapult Sports.',
    conflictColumns: ['player_id', 'fecha'],
    fields: [
      { key: 'player_id', label: 'ID Jugador', required: true, type: 'number' },
      { key: 'fecha', label: 'Fecha', required: true, type: 'date' },
    ]
  }
};

export default function DataImportArea() {
  const [selectedType, setSelectedType] = useState<ImportType | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [unmatchedRows, setUnmatchedRows] = useState<any[]>([]);
  const [resolvedIds, setResolvedIds] = useState<Record<number, number>>({}); // rowIndex -> playerId
  const [nameHeader, setNameHeader] = useState<string | null>(null);
  const [catapultActivities, setCatapultActivities] = useState<any[]>([]);
  const [syncingCatapult, setSyncingCatapult] = useState(false);
  const [selectedActivityStats, setSelectedActivityStats] = useState<any>(null);
  const [inspectingStats, setInspectingStats] = useState(false);

  const [catapultAthletes, setCatapultAthletes] = useState<any[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [syncingToSupabase, setSyncingToSupabase] = useState(false);
  const [sessionErrors, setSessionErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    const { data } = await supabase.from('players').select('*');
    if (data) setPlayers(data);
  };

  const normalizeString = (str: any) => {
    if (!str) return '';
    return String(str)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  };

  // Helper to extract session name/player name
  const extractName = (fullName: string) => {
    if (!fullName) return '';
    // Formato Catapult suele ser similar: "Nombre Apellido"
    if (fullName.includes(' - ')) {
      const parts = fullName.split(' - ');
      return parts[parts.length - 1].trim();
    }
    return fullName.trim();
  };

  const getRowName = useCallback((row: any) => {
    if (!row) return '';
    const rawName = row[nameHeader || ''] || row['Name'] || row['Jugador'] || row['nombre'] || row['JUGADOR'] || row['athlete_name'] || '';
    return ['gps_totales', 'gps_tareas'].includes(selectedType!) ? extractName(rawName) : rawName;
  }, [nameHeader, selectedType]);

  const findPlayerByName = (name: string) => {
    if (!name || !players.length) return null;
    const searchName = normalizeString(name);
    
    // Split search name into individual word tokens (skip short words like "de", "del", etc.)
    const searchTokens = searchName.split(/\s+/).filter(t => t.length > 2);
    if (searchTokens.length === 0) return null;
    
    let bestMatch = null;
    let maxOverlapScore = 0;
    
    for (const p of players) {
      const nombre = normalizeString(p.nombre || '');
      const apellido1 = normalizeString(p.apellido1 || '');
      const apellido2 = normalizeString(p.apellido2 || '');
      
      const pFullName = `${nombre} ${apellido1} ${apellido2}`.trim();
      const pFullNormalized = normalizeString(pFullName);
      
      // Exact match after normalization
      if (pFullNormalized === searchName) {
        return p;
      }
      
      // Split database player names into tokens
      const dbTokens = pFullNormalized.split(/\s+/).filter(t => t.length > 2);
      
      // Count token overlap
      let overlapCount = 0;
      for (const token of searchTokens) {
        if (dbTokens.includes(token)) {
          overlapCount++;
        }
      }
      
      if (overlapCount > 0) {
        // Boost priority if first name (first word of search name) and last name (last word of search name) match
        const firstSearchToken = searchTokens[0];
        const lastSearchToken = searchTokens[searchTokens.length - 1];
        
        const dbNameTokens = nombre.split(/\s+/).filter(t => t.length > 2);
        const dbLastNameTokens = `${apellido1} ${apellido2}`.split(/\s+/).filter(t => t.length > 2);
        
        const firstMatches = dbNameTokens.some(t => normalizeString(t) === firstSearchToken);
        const lastMatches = dbLastNameTokens.some(t => normalizeString(t) === lastSearchToken);
        
        if (firstMatches && lastMatches) {
          overlapCount += 3; // Huge priority boost for matching first and last name tokens
        } else if (firstMatches || lastMatches) {
          overlapCount += 0.5; // Minor boost for partial name matching, but don't count it as a full overlap
        }
        
        // Strict mapping check:
        // If searching with 2 or more names/tokens, require at least 2 exact token matches to prevent false positives!
        if (searchTokens.length >= 2 && overlapCount < 2) {
          continue;
        }
        
        if (overlapCount > maxOverlapScore) {
          maxOverlapScore = overlapCount;
          bestMatch = p;
        }
      }
    }
    
    // Require a minimum overlap score to avoid false positives
    // If we have a single search token, we require at least 1 match. If multi-token, we require at least 2.
    const requiredScore = searchTokens.length >= 2 ? 2 : 1;
    if (maxOverlapScore >= requiredScore) {
      return bestMatch;
    }
    
    // Fallback search: ONLY if they match both first and last name exactly
    return players.find(p => {
      const nombre = normalizeString(p.nombre || '');
      const apellido1 = normalizeString(p.apellido1 || '');
      if (searchName.includes(nombre) && searchName.includes(apellido1)) return true;
      return false;
    }) || null;
  };

  // Metric Mapper for Catapult -> gps_import
  const mapCatapultMetrics = (catStats: any) => {
    const findMetric = (keys: string[]) => {
      for (const k of keys) {
        if (catStats[k] !== undefined && catStats[k] !== null) return Number(catStats[k]);
      }
      return 0;
    };

    // Duration is often in seconds in Catapult API, but can vary
    let durationSec = findMetric(['duration', 'total_duration', 'TotalDuration', 'Duration', 'minutes', 'Minutes']);
    // If it's less than 10, it's likely hours, if it's > 10000 likely seconds or ms.
    // Usually minutes is what we want for the UI, but GPS import expects minutes.
    // If duration was found in 'minutes' field, use it as is.
    let durationMin = 0;
    if (catStats.minutes !== undefined || catStats.Minutes !== undefined) {
      durationMin = findMetric(['minutes', 'Minutes']);
    } else {
      durationMin = durationSec / 60;
    }

    return {
      minutos: durationMin || 0,
      dist_total_m: findMetric(['total_distance', 'TotalDistance', 'distance', 'Distance', 'total_dist', 'Distance_m', 'Total_Distance']),
      m_por_min: findMetric(['meters_per_minute', 'MetresPerMinute', 'metres_per_minute', 'relative_distance', 'RelativeDistance', 'MetersPerMinute']),
      dist_ai_m_15_kmh: findMetric(['high_intensity_distance', 'HighIntensityDistance', 'hi_intensity_dist', 'band4_distance', 'Band4Distance', 'VelocityBand4Distance', 'High_Intensity_Distance']),
      dist_mai_m_20_kmh: findMetric(['very_high_intensity_distance', 'VeryHighIntensityDistance', 'vhi_intensity_dist', 'band5_distance', 'Band5Distance', 'VelocityBand5Distance', 'Very_High_Intensity_Distance']),
      dist_sprint_m_25_kmh: findMetric(['sprint_distance', 'SprintDistance', 'band6_distance', 'Band6Distance', 'VelocityBand6Distance', 'Sprint_Distance']),
      sprints_n: findMetric(['sprint_count', 'SprintCount', 'sprints', 'Sprints', 'Number_of_Sprints']),
      vel_max_kmh: findMetric(['max_velocity', 'MaxVelocity', 'top_speed', 'TopSpeed', 'velocity_max', 'Maximum_Velocity']),
      acc_decc_ai_n: findMetric(['accelerations_count', 'AccelerationsCount', 'accel_count', 'Total_Accelerations']) + findMetric(['decelerations_count', 'DecelerationsCount', 'decel_count', 'Total_Decelerations'])
    };
  };

  const excelDateToJSDate = (serial: number) => {
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    const fractional_day = serial - Math.floor(serial) + 0.0000001;
    let total_seconds = Math.floor(86400 * fractional_day);
    const seconds = total_seconds % 60;
    total_seconds -= seconds;
    const hours = Math.floor(total_seconds / (60 * 60));
    const minutes = Math.floor(total_seconds / 60) % 60;
    const d = new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds);
    return d.toISOString().split('T')[0];
  };

  const parseCsvFloat = (val: any) => {
    if (val === undefined || val === null || val === '') return null;
    const cleanStr = val.toString().replace(/,/g, '.').replace(/\s/g, '');
    const numVal = Number(cleanStr);
    return isNaN(numVal) ? null : numVal;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (selectedType === 'antropometria') {
        Papa.parse(file, {
          header: false,
          skipEmptyLines: 'greedy',
          delimiter: "", // auto-detect
          complete: (results) => {
            const rawRows = results.data as string[][];
            // Find header row containing "PACIENTES"
            let headerIndex = rawRows.findIndex(row => 
              row && row[0] && normalizeString(row[0]).includes('paciente')
            );
            if (headerIndex === -1) {
              headerIndex = rawRows.findIndex(row => 
                row && row.some(cell => cell && normalizeString(cell).includes('paciente'))
              );
            }
            if (headerIndex === -1) {
              setMessage({ type: 'error', text: 'No se encontró la cabecera "PACIENTES" en el archivo CSV.' });
              return;
            }

            const rawHeaders = rawRows[headerIndex];
            const dataRows = rawRows.slice(headerIndex + 1).filter(row => 
              row && row[0] && row[0].trim() !== '' && row[1] && row[1].trim() !== ''
            );

            // Create unique header names to prevent duplication issues
            const headersList = rawHeaders.map((h, idx) => {
              const trimmed = (h || '').trim();
              return trimmed ? `${trimmed} (col ${idx})` : `Columna ${idx}`;
            });

            const formattedData = dataRows.map((row, rIdx) => {
              const obj: Record<string, string> = { _rowIndex: String(rIdx) };
              headersList.forEach((h, idx) => {
                obj[h] = row[idx] || '';
              });
              obj._rawRow = JSON.stringify(row);
              return obj;
            });

            setCsvData(formattedData);
            setHeaders(headersList);

            const unmatched: any[] = [];
            const initialResolved: Record<number, number> = {};

            // Set name header
            setNameHeader(headersList[0]); // PACIENTES column

            formattedData.forEach((rowObj: any, index: number) => {
              const rawRow = JSON.parse(rowObj._rawRow);
              const cleanName = (rawRow[0] || '').trim();
              const player = findPlayerByName(cleanName);
              if (player) {
                initialResolved[index] = player.player_id;
              } else if (cleanName) {
                unmatched.push({ ...rowObj, _rowIndex: index, _cleanName: cleanName });
              }
            });

            setMapping({});
            setUnmatchedRows(unmatched);
            setResolvedIds(initialResolved);
          }
        });
      } else {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: 'greedy',
          delimiter: "", // auto-detect
          complete: (results) => {
            const data = results.data;
            setCsvData(data);
            if (results.meta.fields) {
              setHeaders(results.meta.fields);
              
              const newMapping: Record<string, string> = {};
              const unmatched: any[] = [];
              const initialResolved: Record<number, number> = {};

              if (selectedType) {
                const config = IMPORT_CONFIGS[selectedType];
                const detectedNameHeader = results.meta.fields.find(h => {
                  const low = h.toLowerCase();
                  return low === 'name' || low === 'jugador' || low === 'nombre' || low === 'atleta' || low.includes('jugador');
                });
                setNameHeader(detectedNameHeader || null);

                config.fields.forEach(field => {
                  const match = results.meta.fields?.find(h => 
                    h.toLowerCase().includes(field.key.toLowerCase()) || 
                    h.toLowerCase().includes(field.label.toLowerCase())
                  );
                  if (match) newMapping[field.key] = match;
                });

                // Special logic for name matching
                const needsNameMatching = ['gps_totales', 'gps_tareas', 'imtp', 'cmj', 'velocidad', 'aceleracion', 'vo2max'].includes(selectedType);
                
                if (needsNameMatching && detectedNameHeader) {
                  const seenNames = new Set<string>();
                  data.forEach((row: any, index: number) => {
                    const cleanName = getRowName(row);
                    const player = findPlayerByName(cleanName);
                    if (player) {
                      initialResolved[index] = player.player_id;
                    } else if (cleanName && !seenNames.has(normalizeString(cleanName))) {
                      unmatched.push({ ...row, _rowIndex: index, _cleanName: cleanName });
                      seenNames.add(normalizeString(cleanName));
                    }
                  });
                }
              }
              setMapping(newMapping);
              setUnmatchedRows(unmatched);
              setResolvedIds(initialResolved);
            }
          }
        });
      }
    }
  };

  const handleImport = async () => {
    if (!selectedType || csvData.length === 0) return;
    
    const config = IMPORT_CONFIGS[selectedType];
    const requiredFields = config.fields.filter(f => f.required && f.key !== 'player_id');
    const missingFields = requiredFields.filter(f => !mapping[f.key]);

    if (selectedType !== 'antropometria' && missingFields.length > 0) {
      setMessage({ type: 'error', text: `Faltan campos obligatorios: ${missingFields.map(f => f.label).join(', ')}` });
      return;
    }

    setImporting(true);
    setMessage(null);

    try {
      // 1. Map all rows
      const mappedData = csvData.map((row, index) => {
        const item: any = {};
        const cleanName = getRowName(row);

        if (selectedType === 'antropometria') {
          if (row._rawRow) {
            const rawRow = JSON.parse(row._rawRow);
            item.nombre_raw = (rawRow[0] || '').trim();
            
            let rawDate = (rawRow[1] || '').trim();
            if (rawDate) {
              if (rawDate.includes('/') || rawDate.includes('-')) {
                const separator = rawDate.includes('/') ? '/' : '-';
                const parts = rawDate.split(separator);
                if (parts.length === 3) {
                  const [d, m, y] = parts;
                  const fullYear = y.length === 2 ? `20${y}` : y;
                  item.fecha_medicion = `${fullYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                }
              }
            }

            item.edad_cronologica = parseCsvFloat(rawRow[2]);
            item.masa_corporal_kg = parseCsvFloat(rawRow[3]);
            item.talla_cm = parseCsvFloat(rawRow[4]);
            item.talla_sentada_cm = parseCsvFloat(rawRow[5]);
            item.masa_muscular_kg = parseCsvFloat(rawRow[30]);
            item.masa_muscular_pct = parseCsvFloat(rawRow[31]);
            item.masa_adiposa_kg = parseCsvFloat(rawRow[33]);
            item.masa_adiposa_pct = parseCsvFloat(rawRow[34]);
            item.masa_osea_kg = parseCsvFloat(rawRow[43]);
            item.masa_osea_pct = parseCsvFloat(rawRow[44]);
            item.somatotipo_endo = parseCsvFloat(rawRow[45]);
            item.somatotipo_meso = parseCsvFloat(rawRow[46]);
            item.somatotipo_ecto = parseCsvFloat(rawRow[47]);
            item.somatotipo_eje_x = parseCsvFloat(rawRow[48]);
            item.somatotipo_eje_y = parseCsvFloat(rawRow[49]);
            item.indice_imo = parseCsvFloat(rawRow[62]);
            item.indice_imc = parseCsvFloat(rawRow[63]);
            item.sum_pliegues_6_mm = parseCsvFloat(rawRow[66]);
            item.sum_pliegues_8_mm = parseCsvFloat(rawRow[67]);
            item.maduracion_mirwald = parseCsvFloat(rawRow[68]);
            item.maduracion_moore = parseCsvFloat(rawRow[69]);
            item.maduracion_media = parseCsvFloat(rawRow[70]);
            item.phv_mirwald = parseCsvFloat(rawRow[71]);
            item.phv_moore = parseCsvFloat(rawRow[72]);
            item.phv_media = parseCsvFloat(rawRow[73]);
            item.cm_por_crecer_mirwald = parseCsvFloat(rawRow[74]);
            item.cm_por_crecer_moore = parseCsvFloat(rawRow[75]);
            item.cm_por_crecer_media = parseCsvFloat(rawRow[76]);
            item.estatura_proy_mirwald_cm = parseCsvFloat(rawRow[77]);
            item.estatura_proy_moore_cm = parseCsvFloat(rawRow[78]);
            item.estatura_proy_media_cm = parseCsvFloat(rawRow[79]);
          }
        } else {
          // Special logic for GPS Tareas
          if (selectedType === 'gps_tareas') {
            const nameVal = row[nameHeader || 'Name'] || row['Name'] || '';
            if (nameVal && String(nameVal).includes(' - ')) {
              const parts = String(nameVal).split(' - ');
              const playerName = parts.pop()?.trim();
              const taskName = parts.join(' - ').trim();
              item.tarea = taskName;
              if (config.fields.some(f => f.key === 'jugador_nombre')) {
                item.jugador_nombre = playerName;
              }
            }
          }

          config.fields.forEach(field => {
            const csvHeader = mapping[field.key];
            if (csvHeader && row[csvHeader] !== undefined && row[csvHeader] !== '') {
              let val = row[csvHeader];
              
              // Cleanup for Tarea
              if (selectedType === 'gps_tareas' && field.key === 'tarea' && typeof val === 'string' && val.includes(' - ')) {
                val = val.split(' - ')[0].trim();
              }

              if (field.type === 'number') {
                const numVal = Number(val.toString().replace(',', '.'));
                val = isNaN(numVal) ? null : numVal;
              }
              if (field.type === 'date') {
                if (val.includes('/') || val.includes('-')) {
                  const separator = val.includes('/') ? '/' : '-';
                  const parts = val.split(separator);
                  if (parts.length === 3) {
                    const [d, m, y] = parts;
                    const fullYear = y.length === 2 ? `20${y}` : y;
                    val = `${fullYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                  }
                } else if (!isNaN(Number(val)) && Number(val) > 30000) {
                  val = excelDateToJSDate(Number(val));
                }
              }
              item[field.key] = val;
            }
          });
        }

        // Use resolved IDs
        const manualId = resolvedIds[index];
        const normalizedCleanName = normalizeString(cleanName);
        const sharedId = Object.entries(resolvedIds).find(([idx, id]) => {
          const rName = getRowName(csvData[Number(idx)]);
          return normalizeString(rName) === normalizedCleanName;
        })?.[1];

        if (manualId || sharedId) {
          const pId = manualId || sharedId;
          item.player_id = pId;
          const player = players.find(p => p.player_id === pId);
          if (player) {
            if (!item.jugador && config.fields.some(f => f.key === 'jugador')) item.jugador = `${player.nombre} ${player.apellido1}`;
            if (!item.jugador_nombre && config.fields.some(f => f.key === 'jugador_nombre')) item.jugador_nombre = `${player.nombre} ${player.apellido1}`;
          }
        }

        if (config.table === 'physical_tests') {
          item.test_type = selectedType.toUpperCase();
        }

        return item;
      });

      let dataToInsert = mappedData.filter(item => {
        return config.fields.every(f => !f.required || (item[f.key] !== undefined && item[f.key] !== null));
      });

      if (dataToInsert.length === 0) {
        setMessage({ type: 'error', text: 'No se encontraron datos válidos.' });
        setImporting(false);
        return;
      }

      if (selectedType === 'antropometria') {
        const uniqueMap = new Map<string, any>();
        dataToInsert.forEach(item => {
          const key = `${item.player_id}-${item.fecha_medicion}`;
          uniqueMap.set(key, item);
        });
        dataToInsert = Array.from(uniqueMap.values());
      }

      if (selectedType === 'imtp' || selectedType === 'cmj') {
        const uniqueMap = new Map<string, any>();
        dataToInsert.forEach(item => {
          const key = `${item.player_id}-${item.fecha_test}`;
          uniqueMap.set(key, item);
        });
        dataToInsert = Array.from(uniqueMap.values());
      }

      // NUEVO: Agregación de Sesiones para GPS Totales (Opción A)
      // Si el archivo contiene múltiples filas por jugador/fecha/sesión, las sumamos antes de upsert
      if (selectedType === 'gps_totales') {
        const aggregatedMap = new Map<string, any>();
        
        // Asignar nombre_sesion incremental si hay varias filas para el mismo jugador y fecha en el archivo sin nombre
        const counts = new Map<string, number>();
        
        dataToInsert.forEach(item => {
          const dayKey = `${item.player_id}-${item.fecha}`;
          let sName = item.nombre_sesion;
          if (!sName) {
            const currentIdx = (counts.get(dayKey) || 0) + 1;
            counts.set(dayKey, currentIdx);
            sName = currentIdx > 1 ? `Sesión ${currentIdx}` : 'Sesión';
          }
          item.nombre_sesion = sName;
          
          const key = `${item.player_id}-${item.fecha}-${sName}`;
          if (aggregatedMap.has(key)) {
            const existing = aggregatedMap.get(key);
            existing.minutos = (existing.minutos || 0) + (item.minutos || 0);
            existing.dist_total_m = (existing.dist_total_m || 0) + (item.dist_total_m || 0);
            existing.dist_ai_m_15_kmh = (existing.dist_ai_m_15_kmh || 0) + (item.dist_ai_m_15_kmh || 0);
            existing.dist_mai_m_20_kmh = (existing.dist_mai_m_20_kmh || 0) + (item.dist_mai_m_20_kmh || 0);
            existing.dist_sprint_m_25_kmh = (existing.dist_sprint_m_25_kmh || 0) + (item.dist_sprint_m_25_kmh || 0);
            existing.sprints_n = (existing.sprints_n || 0) + (item.sprints_n || 0);
            existing.acc_decc_ai_n = (existing.acc_decc_ai_n || 0) + (item.acc_decc_ai_n || 0);
            existing.vel_max_kmh = Math.max(existing.vel_max_kmh || 0, item.vel_max_kmh || 0);
            if (existing.minutos > 0) {
              existing.m_por_min = existing.dist_total_m / existing.minutos;
            }
          } else {
            aggregatedMap.set(key, { ...item });
          }
        });
        
        // NOTA: Para permitir sesiones independientes, NO las sumamos con los registros de la DB si corresponden a sesiones con nombres distintos.
        // Solo sumamos si el registro en DB tiene exactamente el MISMO nombre de sesión.
        const playerIds = Array.from(new Set(dataToInsert.map(d => d.player_id)));
        const dates = Array.from(new Set(dataToInsert.map(d => d.fecha)));

        const { data: dbRecords } = await supabase
          .from('gps_import')
          .select('*')
          .in('player_id', playerIds)
          .in('fecha', dates);

        if (dbRecords && dbRecords.length > 0) {
          dbRecords.forEach(dbRow => {
            const dbSessionName = dbRow.nombre_sesion || 'Sesión';
            const key = `${dbRow.player_id}-${dbRow.fecha}-${dbSessionName}`;
            if (aggregatedMap.has(key)) {
              const current = aggregatedMap.get(key);
              // Solo sumamos si es exactamente el mismo nombre de sesión que el que estamos cargando en este lote.
              current.minutos = (current.minutos || 0) + (dbRow.minutos || 0);
              current.dist_total_m = (current.dist_total_m || 0) + (dbRow.dist_total_m || 0);
              current.dist_ai_m_15_kmh = (current.dist_ai_m_15_kmh || 0) + (dbRow.dist_ai_m_15_kmh || 0);
              current.dist_mai_m_20_kmh = (current.dist_mai_m_20_kmh || 0) + (dbRow.dist_mai_m_20_kmh || 0);
              current.dist_sprint_m_25_kmh = (current.dist_sprint_m_25_kmh || 0) + (dbRow.dist_sprint_m_25_kmh || 0);
              current.sprints_n = (current.sprints_n || 0) + (dbRow.sprints_n || 0);
              current.acc_decc_ai_n = (current.acc_decc_ai_n || 0) + (dbRow.acc_decc_ai_n || 0);
              current.vel_max_kmh = Math.max(current.vel_max_kmh || 0, dbRow.vel_max_kmh || 0);
              if (current.minutos > 0) {
                current.m_por_min = current.dist_total_m / current.minutos;
              }
            }
          });
        }
        
        dataToInsert = Array.from(aggregatedMap.values());
      }

      // Clean data to insert to prevent non-existant column errors (like virtual field 'jugador')
      let sanitizedData = dataToInsert.map(item => {
        const cleanItem: any = {};
        
        // Only include fields that are defined in config.fields
        config.fields.forEach(f => {
          if (item[f.key] !== undefined && item[f.key] !== null) {
            cleanItem[f.key] = item[f.key];
          }
        });

        // Ensure physical_tests has test_type
        if (config.table === 'physical_tests') {
          cleanItem.test_type = selectedType.toUpperCase();
        }

        // Include any extra explicit conflictColumns just in case
        config.conflictColumns.forEach(cc => {
          if (item[cc] !== undefined && item[cc] !== null) {
            cleanItem[cc] = item[cc];
          }
        });

        return cleanItem;
      });

      // Filter out records without a valid player_id
      sanitizedData = sanitizedData.filter(item => {
        const pId = Number(item.player_id);
        return !isNaN(pId) && pId > 0;
      });

      let uploadError = null;
      try {
        const { error } = await supabase.from(config.table).upsert(sanitizedData, {
          onConflict: config.conflictColumns.join(',')
        });
        if (error) {
          uploadError = error;
        }
      } catch (upsertCatchError: any) {
        uploadError = upsertCatchError;
      }

      if (uploadError) {
        console.warn("⚠️ Native upsert failed, attempting custom self-healing merge fallback...", uploadError);
        
        try {
          const tableName = config.table;
          const conflictCols = config.conflictColumns;

          const dateCol = conflictCols.find(col => ['fecha', 'fecha_medicion', 'fecha_test', 'checkin_date', 'session_date'].includes(col));
          
          const validPlayerIds = Array.from(new Set(
            sanitizedData
              .map(d => Number(d.player_id))
              .filter(id => !isNaN(id) && id > 0)
          ));

          if (validPlayerIds.length === 0) {
            throw new Error("No hay registros con un ID de jugador registrado en el sistema. Asegúrate de que los nombres de los jugadores en el archivo coincidan exactamente con la base de datos.");
          }

          let query = supabase.from(tableName).select('*').in('player_id', validPlayerIds);

          if (dateCol) {
            const uniqDates = Array.from(new Set(sanitizedData.map((d: any) => d[dateCol]).filter(Boolean)));
            if (uniqDates.length > 0) {
              query = query.in(dateCol, uniqDates);
            }
          }

          const { data: existingData, error: selectError } = await query;
          if (selectError) throw selectError;

          const existingMap = new Map<string, any>();
          if (existingData) {
            existingData.forEach((row: any) => {
              const key = conflictCols.map(col => String(row[col] ?? '')).join('|');
              existingMap.set(key, row);
            });
          }

          const toInsert: any[] = [];
          const toUpdate: { id: any; data: any; filters: any }[] = [];
          const processedKeysInBatch = new Set<string>();

          sanitizedData.forEach(item => {
            const key = conflictCols.map(col => String(item[col] ?? '')).join('|');
            
            // Avoid local batch duplicates
            if (processedKeysInBatch.has(key)) {
              const insertIdx = toInsert.findIndex(x => conflictCols.map(col => String(x[col] ?? '')).join('|') === key);
              if (insertIdx !== -1) {
                toInsert[insertIdx] = item;
              } else {
                const updateIdx = toUpdate.findIndex(x => conflictCols.map(col => String(x.data[col] ?? '')).join('|') === key);
                if (updateIdx !== -1) {
                  toUpdate[updateIdx].data = item;
                }
              }
              return;
            }
            
            processedKeysInBatch.add(key);
            const matchedRow = existingMap.get(key);

            if (matchedRow) {
              const filters: any = {};
              conflictCols.forEach(col => {
                filters[col] = item[col];
              });
              toUpdate.push({
                id: matchedRow.id || null,
                data: item,
                filters
              });
            } else {
              toInsert.push(item);
            }
          });

          // Perform Inserts in a single batch
          if (toInsert.length > 0) {
            const { error: insertErr } = await supabase.from(tableName).insert(toInsert);
            if (insertErr) throw insertErr;
          }

          // Perform Updates in safe chunks of 25 parallel requests to avoid DB choke
          if (toUpdate.length > 0) {
            const batchSize = 25;
            for (let i = 0; i < toUpdate.length; i += batchSize) {
              const chunk = toUpdate.slice(i, i + batchSize);
              await Promise.all(
                chunk.map(async (up) => {
                  let updateQuery = supabase.from(tableName).update(up.data);
                  if (up.id) {
                    updateQuery = updateQuery.eq('id', up.id);
                  } else {
                    Object.entries(up.filters).forEach(([col, val]) => {
                      updateQuery = updateQuery.eq(col, val);
                    });
                  }
                  const { error: updateErr } = await updateQuery;
                  if (updateErr) {
                    console.error(`Error updating record in fallback merge for ${tableName}:`, updateErr);
                  }
                })
              );
            }
          }

          console.log(`✅ Custom fallback merge successfully premium processed: ${toInsert.length} inserts & ${toUpdate.length} updates.`);
        } catch (fallbackError: any) {
          console.error("❌ Custom self-healing merge fallback also failed:", fallbackError);
          throw fallbackError;
        }
      }

      setMessage({ type: 'success', text: `Se han importado ${dataToInsert.length} registros correctamente.` });
      setCsvData([]);
      setHeaders([]);
      setMapping({});
      setUnmatchedRows([]);
      setResolvedIds({});
    } catch (err: any) {
      console.error("Error importing:", err);
      setMessage({ type: 'error', text: `Error al importar: ${err.message}` });
    } finally {
      setImporting(false);
    }
  };

  const updateResolvedId = (rowIndex: number, playerId: number) => {
    const row = csvData[rowIndex];
    const cleanName = getRowName(row);
    const newResolved = { ...resolvedIds };
    const normalizedCleanName = normalizeString(cleanName);
    
    csvData.forEach((r, idx) => {
      if (normalizeString(getRowName(r)) === normalizedCleanName) {
        if (!playerId || isNaN(playerId) || playerId <= 0) {
          delete newResolved[idx];
        } else {
          newResolved[idx] = playerId;
        }
      }
    });

    setResolvedIds(newResolved);
  };

  const handleCatapultSync = async () => {
    setSyncingCatapult(true);
    setMessage(null);
    try {
      const response = await fetchCatapultActivities(90); // Search last 90 days
      let activities = [];
      let regionInfo = '';

      if (response && response.activities) {
        activities = response.activities;
        regionInfo = response.metadata?.region ? ` (${response.metadata.region})` : '';
      } else if (Array.isArray(response)) {
        activities = response;
      } else if (response && typeof response === 'object') {
        activities = response.data || response.results || [];
      }

      const rawActivities = activities;
      console.log("Raw activities received:", rawActivities.length > 0 ? rawActivities[0] : "Empty");

      // Helper to format session status beautifully
      const formatBakeStatus = (statusStr: string): string => {
        if (!statusStr) return 'READY';
        let s = String(statusStr).trim();
        
        // Strip "status:" or "STATUS:" prefix
        if (s.toLowerCase().startsWith('status:')) {
          s = s.substring(7).trim(); // removes "status:"
        }
        
        if (s.toLowerCase().includes('no files synced')) {
          return 'SIN ARCHIVOS';
        }
        
        return s.toUpperCase();
      };

      // Helper to format session name with DD/MM/YYYY and HH:MM
      const getFormattedSessionName = (act: any): string => {
        const dateStr = act.modifiedDate || act.ModifiedTime || act.startTime || act.start_time || act.start_at || act.Date;
        if (!dateStr) return 'SESIÓN · FECHA N/A';
        try {
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return 'SESIÓN · FECHA N/A';
          
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          const fecha = `${day}/${month}/${year}`;
          
          const hrs = String(d.getHours()).padStart(2, '0');
          const mins = String(d.getMinutes()).padStart(2, '0');
          const hora = `${hrs}:${mins}`;
          
          return `SESIÓN · ${fecha} · ${hora}`;
        } catch (e) {
          return 'SESIÓN · FECHA N/A';
        }
      };

      // Grouping helper by date and hour (rounded to minutes)
      const getGroupKey = (act: any): string => {
        const dateStr = act.modifiedDate || act.ModifiedTime || act.startTime || act.start_time || act.start_at || act.Date;
        if (!dateStr) return '';
        try {
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return '';
          const yr = d.getFullYear();
          const mo = String(d.getMonth() + 1).padStart(2, '0');
          const dy = String(d.getDate()).padStart(2, '0');
          const hr = String(d.getHours()).padStart(2, '0');
          const mn = String(d.getMinutes()).padStart(2, '0');
          return `${yr}-${mo}-${dy} ${hr}:${mn}`;
        } catch (e) {
          return '';
        }
      };

      const normalizedActivities = rawActivities.map((item: any) => {
        // Resolve nested activity if present
        let a = item;
        if (item.Activity && typeof item.Activity === 'object') a = item.Activity;
        else if (item.activity && typeof item.activity === 'object') a = item.activity;
        else if (item.session && typeof item.session === 'object') a = item.session;

        // Pattern matching helper
        const findVal = (obj: any, patterns: string[]) => {
          if (!obj || typeof obj !== 'object') return null;
          for (const p of patterns) {
            const pLower = p.toLowerCase();
            const key = Object.keys(obj).find(k => k.toLowerCase() === pLower || k.toLowerCase().includes(pLower));
            if (key !== undefined && obj[key] !== null && obj[key] !== undefined) {
              const strVal = String(obj[key]).trim();
              if (strVal !== '' && strVal.toLowerCase() !== 'null' && strVal.toLowerCase() !== 'undefined') {
                return obj[key];
              }
            }
          }
          return null;
        };

        // Robust detection for IDs
        const id = findVal(a, ['id', 'Identifier', 'activity_id', 'ExternalId', 'ActivityId']) || findVal(item, ['Identifier', 'id']);
        
        // Robust detection for Times
        const parseTime = (time: any) => {
          if (!time) return null;
          try {
            if (typeof time === 'number') {
              return time < 2000000000 ? new Date(time * 1000).toISOString() : new Date(time).toISOString();
            }
            if (typeof time === 'string') {
              // Handle DD/MM/YYYY
              if (time.includes('/') && time.split('/').length === 3) {
                const parts = time.split(' ');
                const dateParts = parts[0].split('/');
                const [d, m, y] = dateParts;
                const timeStr = parts[1] || '00:00:00';
                const iso = `${y.length === 2 ? '20' + y : y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T${timeStr}`;
                const validDate = new Date(iso);
                if (!isNaN(validDate.getTime())) return validDate.toISOString();
              }
            }
            const date = new Date(time);
            if (isNaN(date.getTime())) return null;
            return date.toISOString();
          } catch (e) {
            return null;
          }
        };

        const startTime = parseTime(findVal(a, ['StartTime', 'start_at', 'start_time', 'Date', 'ModifiedTime']) || findVal(item, ['StartTime', 'startTime', 'Date']));
        const endTime = parseTime(findVal(a, ['EndTime', 'end_at', 'end_time', 'FinishTime']) || findVal(item, ['EndTime', 'endTime']));
        const mDate = findVal(a, ['modifiedDate', 'ModifiedDate', 'ModifiedTime', 'modified_date']) || item.modifiedDate || item.ModifiedDate;
        
        // Robust athlete count detection
        const athleteCount = findVal(a, ['AthleteCount', 'athlete_count', 'athletes']) || 
                          findVal(item, ['AthleteCount', 'athlete_count']) ||
                          (Array.isArray(a.athlete_ids) ? a.athlete_ids.length : 
                          (Array.isArray(a.athletes) ? a.athletes.length : 0));
        
        let durationMin = findVal(a, ['duration', 'total_time', 'Duration', 'Minutes']) || findVal(item, ['duration', 'minutes']) || 0;
        
        if (durationMin > 600 && !String(durationMin).includes('min')) {
          durationMin = Math.round(Number(durationMin) / 60);
        }

        if (!durationMin && startTime && endTime) {
          try {
            const start = new Date(startTime).getTime();
            const end = new Date(endTime).getTime();
            if (!isNaN(start) && !isNaN(end)) {
              durationMin = Math.round((end - start) / 60000);
            }
          } catch (e) {}
        }

        const rawStatus = findVal(a, ['Bakestatus', 'status', 'Status', 'baking_status']) || findVal(item, ['Bakestatus', 'status', 'Status']) || 'Ready';

        return {
          ...item,
          ...a,
          id,
          name: '', // Will be set nicely
          modifiedDate: mDate,
          startTime,
          endTime,
          athleteCount: Number(athleteCount) || 0,
          duration: Number(durationMin) || 0,
          bakestatus: formatBakeStatus(rawStatus)
        };
      });

      // Paso de deduplicación / agrupación por ventana de ±10 minutos el mismo día
      const timeActivities: { act: any; ts: number }[] = [];
      const noTimeActivities: any[] = [];

      normalizedActivities.forEach((act: any) => {
        const dateStr = act.modifiedDate || act.ModifiedTime || act.startTime || act.start_time || act.start_at || act.Date;
        if (!dateStr) {
          noTimeActivities.push(act);
          return;
        }
        const d = new Date(dateStr);
        const ts = d.getTime();
        if (isNaN(ts)) {
          noTimeActivities.push(act);
        } else {
          timeActivities.push({ act, ts });
        }
      });

      // Ordenar cronológicamente
      timeActivities.sort((a, b) => a.ts - b.ts);

      const groups: any[][] = [];

      timeActivities.forEach((item) => {
        // Encontrar algún grupo existente donde la diferencia de tiempo con el primer elemento del grupo sea < 10 mins (y en el mismo día)
        const matchedGroup = groups.find((group) => {
          const firstAct = group[0];
          const firstDateStr = firstAct.modifiedDate || firstAct.ModifiedTime || firstAct.startTime || firstAct.start_time || firstAct.start_at || firstAct.Date;
          const firstTs = new Date(firstDateStr).getTime();
          
          const diffMs = Math.abs(item.ts - firstTs);
          const LIMIT_MS = 10 * 60 * 1000; // 10 minutos
          
          if (diffMs < LIMIT_MS) {
            const d1 = new Date(item.ts);
            const d2 = new Date(firstTs);
            return d1.getFullYear() === d2.getFullYear() &&
                   d1.getMonth() === d2.getMonth() &&
                   d1.getDate() === d2.getDate();
          }
          return false;
        });

        if (matchedGroup) {
          matchedGroup.push(item.act);
        } else {
          groups.push([item.act]);
        }
      });

      const deduplicatedActivities: any[] = [];

      groups.forEach((group) => {
        if (group.length > 0) {
          const first = group[0];
          
          // De cada grupo, conserva solo una tarjeta representativa y muestra en ella el conteo total de entradas del grupo como número de atletas
          const totalAthleteCount = group.length;

          // Usar el campo Identifier del primer item del grupo como ID representativo
          const reprId = first.Identifier || first.id || first.activity_id || first.activityId || 'unknown-session';

          deduplicatedActivities.push({
            ...first,
            id: reprId,
            Identifier: reprId,
            activity_id: reprId,
            activityId: reprId,
            athleteCount: totalAthleteCount,
            name: getFormattedSessionName(first),
            _originalGroup: group
          });
        }
      });

      // Incluir las actividades que no tienen startTime
      noTimeActivities.forEach((act: any) => {
        deduplicatedActivities.push({
          ...act,
          name: getFormattedSessionName(act)
        });
      });

      setCatapultActivities(deduplicatedActivities);
      
      if (deduplicatedActivities.length === 0) {
        setMessage({ 
          type: 'success', 
          text: `Conexión establecida con éxito${regionInfo}. No se encontraron sesiones recientes.` 
        });
      } else {
        setMessage({ type: 'success', text: `¡Conexión Exitosa${regionInfo}! Se encontraron ${deduplicatedActivities.length} sesiones recientes.` });
      }
    } catch (err: any) {
      console.error("Sync Error:", err);
      // Try to parse details if it's a JSON string we threw
      let errorMsg = err.message;
      let attemptsStr = '';
      try {
        if (errorMsg.startsWith('{')) {
          const detailObj = JSON.parse(errorMsg);
          errorMsg = detailObj.error || errorMsg;
          if (detailObj.attempts) {
            attemptsStr = detailObj.attempts.join(', ');
          }
        }
      } catch (e) {}
      
      setMessage({ 
        type: 'error', 
        text: `Error de conexión: ${errorMsg}${attemptsStr ? ` (Intentos: ${attemptsStr})` : ''}` 
      });
    } finally {
      setSyncingCatapult(false);
    }
  };

  const handleInspectActivity = async (activity: any) => {
    setSyncingCatapult(true);
    // Clear previous error for this specific session when user tries again
    const activityId = activity?.id || activity?.Identifier || activity?.activity_id;
    if (activityId) {
      setSessionErrors(prev => {
        const copy = { ...prev };
        delete copy[activityId];
        return copy;
      });
    }
    setMessage(null);
    
    // Set initial activity object
    setSelectedActivity(activity);
    console.log("Inspecting Activity:", activity);
    
    try {
      if (activity?.bakestatus === 'SIN ARCHIVOS') {
        throw new Error("Esta sesión no tiene archivos sincronizados en Catapult Cloud.");
      }
      if (activity?.bakestatus === 'Baking' || activity?.status === 'Baking') {
        throw new Error("La sesión aún se está procesando (Baking). Espera unos minutos y vuelve a intentar.");
      }

      // Prioritize identifying the best ID for the stats call
      const bestId = activity.id || activity.Identifier || activity.identifier || activity.activity_id;
      console.log(`Fetching stats for ID: ${bestId}`);

      // Try to fetch real session details to resolve the actual registered name
      let realSessionName = activity.name || activity.Name || '';
      try {
        console.log(`Fetching detail for activity: ${bestId}`);
        const detail = await fetchCatapultActivityDetail(bestId);
        if (detail) {
          const fetchedName = detail.name || detail.Name || detail.tag || detail.activity_name || detail.SessionName;
          if (fetchedName && fetchedName !== 'Sesión sin nombre' && fetchedName !== 'SESIÓN SIN NOMBRE' && String(fetchedName).toLowerCase() !== 'null' && fetchedName !== 'Sesión Registrada Catapult') {
            realSessionName = fetchedName;
            activity.name = fetchedName;
            activity.Name = fetchedName;
          }
        }
      } catch (detailErr) {
        console.log("Failed to fetch activity detail on inspect:", detailErr);
      }
      
      // Resolve name - fallback to bestId if empty or generic
      let finalResolvedName = realSessionName;
      if (finalResolvedName) {
        const lowerName = finalResolvedName.trim().toLowerCase();
        if (lowerName === 'sesión registrada catapult' || lowerName === 'sesión sin nombre' || lowerName === 'null' || lowerName === 'undefined') {
          finalResolvedName = bestId || 'Sesión sin ID';
        }
      } else {
        finalResolvedName = bestId || 'Sesión sin ID';
      }
      
      // Update selected activity with resolved real name
      setSelectedActivity({ ...activity, name: finalResolvedName });
      
      let statsResponse;
      try {
        statsResponse = await fetchCatapultActivityStats(bestId);
      } catch (statsErr: any) {
        console.error("Initial stats fetch failed:", statsErr);
        
        // Fallback 1: Try activity_id or other IDs
        const fallbackId = activity.activity_id || activity.activityId || (bestId === activity.Identifier ? activity.id : activity.Identifier);
        
        let fallbackSucceeded = false;
        if (fallbackId && fallbackId !== bestId) {
          console.log(`Attempting fallback with ID: ${fallbackId}`);
          try {
            statsResponse = await fetchCatapultActivityStats(fallbackId);
            fallbackSucceeded = true;
          } catch (e2) {
            console.log("Fallback ID check failed:", e2);
          }
        }
        
        if (!fallbackSucceeded) {
          // Fallback 2: Maybe fetch the full activity and check if stats are embedded
          try {
            console.log("Trying to fetch full activity detail as fallback...");
            const detail = await fetchCatapultActivityDetail(bestId);
            if (detail && (detail.stats || detail.results)) {
              statsResponse = detail.stats || detail.results;
              fallbackSucceeded = true;
            }
          } catch (e3) {
            console.log("Activity detail fallback failed:", e3);
          }
        }
        
        if (!fallbackSucceeded) {
          throw new Error("Esta sesión no tiene archivos sincronizados en Catapult Cloud.");
        }
      }

      console.log("Catapult Stats Received:", statsResponse);
      
      // Normalize stats to an array of athletes
      let athletesData = [];
      if (Array.isArray(statsResponse)) {
        athletesData = statsResponse;
      } else if (statsResponse && statsResponse.data) {
        athletesData = statsResponse.data;
      } else if (statsResponse && statsResponse.results) {
        athletesData = statsResponse.results;
      }

      if (athletesData.length === 0) {
        throw new Error("Esta sesión no tiene archivos sincronizados en Catapult Cloud.");
      }

      // Initial auto-mapping
      const initialAthletes = athletesData.map((ath: any, index: number) => {
        const athName = ath.athlete_name || ath.name || ath.athlete?.name || ath.AthleteName || ath.Athlete?.Name || '';
        const matchedPlayer = findPlayerByName(athName);
        return {
          id: index,
          catapult_name: athName,
          stats: ath,
          supabase_player_id: matchedPlayer ? matchedPlayer.player_id : null,
          matched_player: matchedPlayer
        };
      });

      setCatapultAthletes(initialAthletes);
      setInspectingStats(true);
    } catch (err: any) {
      console.error("Critical error in handleInspectActivity:", err);
      if (activityId) {
        setSessionErrors(prev => ({
          ...prev,
          [activityId]: err.message || "Esta sesión no tiene archivos sincronizados en Catapult Cloud."
        }));
      }
      setInspectingStats(false);
      setSelectedActivity(null);
    } finally {
      setSyncingCatapult(false);
    }
  };

  const handleSyncToSupabase = async () => {
    if (!selectedActivity || catapultAthletes.length === 0) return;
    
    // Validate that at least some are mapped
    const validMappings = catapultAthletes.filter(a => a.supabase_player_id);
    if (validMappings.length === 0) {
      alert("Debes asociar al menos un atleta a un jugador del sistema.");
      return;
    }

    setSyncingToSupabase(true);
    try {
      // ✅ NUEVO: Extraer datos de sesión
      const sessionDate = selectedActivity.startTime 
        ? selectedActivity.startTime.split('T')[0] 
        : (() => {
            const d = new Date();
            const offset = d.getTimezoneOffset();
            const localDate = new Date(d.getTime() - (offset * 60 * 1000));
            return localDate.toISOString().split('T')[0];
          })();
      
      const sessionName = selectedActivity.name || 'Sesión sin nombre';
      const catapultId = selectedActivity.id || null;
      
      console.log(`📊 Sincronizando sesión: ${sessionName} (${sessionDate})`);
      console.log(`🔗 Catapult ID: ${catapultId}`);
      
      let recordsToInsert = validMappings.map(ath => {
        const metrics = mapCatapultMetrics(ath.stats);
        const player = players.find(p => p.player_id === ath.supabase_player_id);
        
        return {
          player_id: ath.supabase_player_id,
          fecha: sessionDate,
          // ✅ NUEVO: Campos de sesión
          nombre_sesion: sessionName,
          catapult_sync_id: catapultId,
          // Métricas GPS
          ...metrics
        };
      });

      // NUEVO: Agregación para Catapult Sync
      const playerIds = Array.from(new Set(recordsToInsert.map(d => d.player_id)));
      const { data: existingDBRecords } = await supabase
        .from('gps_import')
        .select('*')
        .in('player_id', playerIds)
        .eq('fecha', sessionDate)
        .eq('catapult_sync_id', catapultId || null);

      const aggregatedMap = new Map<number, any>();
      recordsToInsert.forEach(item => {
        if (aggregatedMap.has(item.player_id)) {
          const existing = aggregatedMap.get(item.player_id);
          existing.minutos = (existing.minutos || 0) + (item.minutos || 0);
          existing.dist_total_m = (existing.dist_total_m || 0) + (item.dist_total_m || 0);
          existing.dist_ai_m_15_kmh = (existing.dist_ai_m_15_kmh || 0) + (item.dist_ai_m_15_kmh || 0);
          existing.dist_mai_m_20_kmh = (existing.dist_mai_m_20_kmh || 0) + (item.dist_mai_m_20_kmh || 0);
          existing.dist_sprint_m_25_kmh = (existing.dist_sprint_m_25_kmh || 0) + (item.dist_sprint_m_25_kmh || 0);
          existing.sprints_n = (existing.sprints_n || 0) + (item.sprints_n || 0);
          existing.acc_decc_ai_n = (existing.acc_decc_ai_n || 0) + (item.acc_decc_ai_n || 0);
          existing.vel_max_kmh = Math.max(existing.vel_max_kmh || 0, item.vel_max_kmh || 0);
          if (existing.minutos > 0) {
            existing.m_por_min = existing.dist_total_m / existing.minutos;
          }
          // ✅ Mantener datos de sesión
          existing.nombre_sesion = sessionName;
          existing.catapult_sync_id = catapultId;
        } else {
          aggregatedMap.set(item.player_id, { ...item });
        }
      });

      recordsToInsert = Array.from(aggregatedMap.values());

      let uploadError = null;
      try {
        const { error } = await supabase.from('gps_import').upsert(recordsToInsert, {
          onConflict: 'player_id,fecha,nombre_sesion'
        });
        if (error) {
          uploadError = error;
        }
      } catch (upsertCatchError: any) {
        uploadError = upsertCatchError;
      }

      if (uploadError) {
        console.warn("⚠️ Native upsert for gps_import failed, attempting custom self-healing merge fallback...", uploadError);
        try {
          const tableName = 'gps_import';
          const conflictCols = ['player_id', 'fecha', 'nombre_sesion'];
          
          const validPlayerIds = Array.from(new Set(
            recordsToInsert
              .map(d => Number(d.player_id))
              .filter(id => !isNaN(id) && id > 0)
          ));

          if (validPlayerIds.length === 0) {
            throw new Error("No hay registros válidos con un ID de jugador registrado en el sistema.");
          }

          let query = supabase.from(tableName).select('*').in('player_id', validPlayerIds);
          const uniqDates = Array.from(new Set(recordsToInsert.map(d => d.fecha).filter(Boolean)));
          if (uniqDates.length > 0) {
            query = query.in('fecha', uniqDates);
          }

          const { data: existingData, error: selectError } = await query;
          if (selectError) throw selectError;

          const existingMap = new Map<string, any>();
          if (existingData) {
            existingData.forEach((row: any) => {
              const key = conflictCols.map(col => String(row[col] ?? '')).join('|');
              existingMap.set(key, row);
            });
          }

          const toInsert: any[] = [];
          const toUpdate: { id: any; data: any; filters: any }[] = [];

          recordsToInsert.forEach(item => {
            const key = conflictCols.map(col => String(item[col] ?? '')).join('|');
            const matchedRow = existingMap.get(key);

            if (matchedRow) {
              const filters: any = {};
              conflictCols.forEach(col => {
                filters[col] = item[col];
              });
              toUpdate.push({
                id: matchedRow.id || null,
                data: item,
                filters
              });
            } else {
              toInsert.push(item);
            }
          });

          if (toInsert.length > 0) {
            const { error: insertErr } = await supabase.from(tableName).insert(toInsert);
            if (insertErr) throw insertErr;
          }

          if (toUpdate.length > 0) {
            const batchSize = 25;
            for (let i = 0; i < toUpdate.length; i += batchSize) {
              const chunk = toUpdate.slice(i, i + batchSize);
              await Promise.all(
                chunk.map(async (up) => {
                  let updateQuery = supabase.from(tableName).update(up.data);
                  if (up.id) {
                    updateQuery = updateQuery.eq('id', up.id);
                  } else {
                    Object.entries(up.filters).forEach(([col, val]) => {
                      updateQuery = updateQuery.eq(col, val);
                    });
                  }
                  const { error: updateErr } = await updateQuery;
                  if (updateErr) {
                    console.error(`Error updating record in fallback merge for ${tableName}:`, updateErr);
                  }
                })
              );
            }
          }
          console.log(`✅ Custom fallback merge for gps_import successfully processed: ${toInsert.length} inserts & ${toUpdate.length} updates.`);
        } catch (fallbackError: any) {
          console.error("❌ Custom self-healing merge fallback for gps_import also failed:", fallbackError);
          throw uploadError;
        }
      }

      console.log(`✅ ${recordsToInsert.length} registros sincronizados`);
      setMessage({ type: 'success', text: `✅ Sincronización Exitosa: ${recordsToInsert.length} registros. Sesión: "${sessionName}"` });
      setInspectingStats(false);
      setCatapultAthletes([]);
      setSelectedActivity(null);
    } catch (err: any) {
      console.error("❌ Error sincronizando:", err);
      setMessage({ type: 'error', text: `Error al sincronizar: ${err.message}` });
    } finally {
      setSyncingToSupabase(false);
    }
  };

  const updateAthleteMapping = (athId: number, playerId: number) => {
    setCatapultAthletes(prev => prev.map(ath => {
      if (ath.id === athId) {
        const player = players.find(p => p.player_id === playerId);
        return { ...ath, supabase_player_id: playerId, matched_player: player };
      }
      return ath;
    }));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Centro de Importación de Datos</h2>
        <p className="text-slate-500 text-sm font-medium">Carga masiva de registros mediante archivos CSV o Catapult API.</p>
      </div>

      {!selectedType ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(Object.keys(IMPORT_CONFIGS) as ImportType[]).map((type) => {
            const config = IMPORT_CONFIGS[type];
            const isCatapult = type === 'catapult_api';
            
            return (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`bg-white p-8 rounded-[32px] border ${isCatapult ? 'border-sky-100 bg-sky-50/20' : 'border-slate-100'} shadow-sm hover:shadow-xl hover:border-red-100 transition-all text-left group`}
              >
                <div className={`w-14 h-14 ${isCatapult ? 'bg-sky-50 text-sky-600' : 'bg-slate-50 text-slate-400'} rounded-2xl flex items-center justify-center group-hover:bg-red-50 group-hover:text-red-600 transition-colors mb-6`}>
                  <i className={`${config.icon} text-2xl`}></i>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{config.label}</h3>
                  {isCatapult && <span className="bg-sky-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-black">API</span>}
                </div>
                <p className="text-slate-500 text-xs font-medium leading-relaxed">{config.description}</p>
              </button>
            );
          })}
        </div>
      ) : selectedType === 'catapult_api' ? (
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
          <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-sky-50/30">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => { setSelectedType(null); setCatapultActivities([]); }}
                className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-600 hover:border-red-100 transition-all"
              >
                <i className="fa-solid fa-arrow-left"></i>
              </button>
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Catapult Cloud Sync</h3>
                <p className="text-sky-600 text-[10px] font-bold uppercase tracking-widest italic">Conexión directa vía Catapult API</p>
              </div>
            </div>
            
            <button
              onClick={handleCatapultSync}
              disabled={syncingCatapult}
              className="bg-sky-600 text-white px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest hover:bg-sky-700 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {syncingCatapult ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-sync"></i>}
              {catapultActivities.length > 0 ? 'Actualizar Sesiones' : 'Conectar y Buscar Sesiones'}
            </button>
          </div>

          <div className="p-8">
            {message && (
              <div className={`mb-8 p-4 rounded-2xl border flex items-center gap-4 ${message.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                <i className={`fa-solid ${message.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'} text-lg`}></i>
                <p className="text-xs font-bold">{message.text}</p>
              </div>
            )}

            {Array.isArray(catapultActivities) && catapultActivities.length > 0 && (
              <div className="mb-6 flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                    {catapultActivities.length} Sesiones encontradas
                  </span>
                  <div className="w-1 h-4 bg-slate-200 rounded-full"></div>
                  <button
                    onClick={async () => {
                      try {
                        const res = await testCatapultConnection();
                        setMessage({ type: 'success', text: `Conexión API: ${res.message}` });
                      } catch (e: any) {
                        setMessage({ type: 'error', text: 'Fallo enlace con el proxy de Catapult.' });
                      }
                    }}
                    className="text-[10px] font-black text-sky-600 hover:text-sky-700 uppercase tracking-widest transition-colors"
                  >
                    Verificar Enlace
                  </button>
                </div>
                <button 
                  onClick={() => setCatapultActivities([])}
                  className="text-[10px] font-black text-slate-400 hover:text-red-600 uppercase tracking-widest transition-colors"
                >
                  Limpiar Lista
                </button>
              </div>
            )}

            {(!Array.isArray(catapultActivities) || catapultActivities.length === 0) && !syncingCatapult ? (
              <div className="py-20 flex flex-col items-center justify-center">
                <div className="w-24 h-24 bg-sky-50 rounded-full flex items-center justify-center text-sky-200 mb-6">
                  <i className="fa-solid fa-tower-broadcast text-4xl"></i>
                </div>
                <h4 className="text-slate-900 font-black uppercase tracking-widest text-xs mb-2">No hay sesiones cargadas</h4>
                <p className="text-slate-400 text-[10px] font-medium max-w-sm text-center">Haz clic en el botón superior para obtener las últimas sesiones registradas en tu cuenta de Catapult Sport.</p>
              </div>
            ) : Array.isArray(catapultActivities) ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {catapultActivities.map((session) => (
                  <div key={session.id || Math.random()} className="bg-white rounded-3xl border border-slate-100 p-6 hover:shadow-lg transition-all group border-l-4 border-l-sky-500">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-col gap-1">
                        <span className="bg-sky-50 text-sky-600 text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest w-fit">
                          {session.startTime ? new Date(session.startTime).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'FECHA N/A'}
                        </span>
                        {session.startTime && (
                          <span className="text-[8px] font-bold text-slate-400 ml-1">
                            {new Date(session.startTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <i className="fa-solid fa-chevron-right text-slate-200 group-hover:text-sky-500 transition-colors"></i>
                    </div>
                    <h5 className="text-slate-900 font-black uppercase tracking-tight text-sm mb-1">{session.name || 'Sesión sin nombre'}</h5>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-slate-400 text-[10px] font-bold uppercase">{session.athleteCount || 1} {Number(session.athleteCount) === 1 ? 'ATLETA' : 'ATLETAS'} • {session.duration || 0} min</p>
                      {session.bakestatus && (
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${
                          session.bakestatus.toUpperCase().includes('READY') || session.bakestatus.toUpperCase().includes('BAKED') ? 'bg-emerald-50 text-emerald-600' : 
                          session.bakestatus.toUpperCase().includes('BAKING') || session.bakestatus.toUpperCase().includes('BAKE') ? 'bg-amber-50 text-amber-600 animate-pulse' : 
                          session.bakestatus.toUpperCase().includes('SIN ARCHIVOS') ? 'bg-red-50 text-red-600' :
                          'bg-slate-50 text-slate-400'
                        }`}>
                          {session.bakestatus}
                        </span>
                      )}
                    </div>
                    {/* Render inline error message if present */}
                    {(sessionErrors[session.id] || session.bakestatus === 'SIN ARCHIVOS') && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-2xl text-red-700 text-[10px] font-bold flex items-start gap-2">
                        <i className="fa-solid fa-circle-exclamation mt-0.5"></i>
                        <span>{sessionErrors[session.id] || "Esta sesión no tiene archivos sincronizados en Catapult Cloud."}</span>
                      </div>
                    )}
                    <button 
                      className="w-full bg-slate-50 text-slate-900 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-sky-600 hover:text-white transition-all disabled:opacity-50 disabled:hover:bg-slate-50 disabled:hover:text-slate-900"
                      disabled={syncingCatapult || session.bakestatus === 'SIN ARCHIVOS' || !!sessionErrors[session.id]}
                      onClick={() => handleInspectActivity(session)}
                    >
                      {syncingCatapult && selectedActivity?.id === session.id ? <i className="fa-solid fa-spinner fa-spin mr-2"></i> : null}
                      Analizar Parametros y Mapear
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            {/* SYNC WIZARD MODAL */}
            {inspectingStats && catapultAthletes.length > 0 && (
              <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-6xl max-h-[90vh] rounded-[48px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-300 border border-white/20">
                  <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/80">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-sky-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-sky-600/20">
                        <i className="fa-solid fa-link text-xl"></i>
                      </div>
                      <div>
                        <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">Sincronización Inteligente Catapult</h4>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-none mt-1">Sesión: <span className="text-sky-600">{selectedActivity?.name}</span> • {new Date(selectedActivity?.startTime).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleSyncToSupabase}
                        disabled={syncingToSupabase}
                        className="bg-emerald-600 text-white px-8 py-4 rounded-full text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-emerald-900/20"
                      >
                        {syncingToSupabase ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-cloud-arrow-up"></i>}
                        Sincronizar {catapultAthletes.filter(a => a.supabase_player_id).length} jugadores
                      </button>
                      <button 
                        onClick={() => setInspectingStats(false)}
                        className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all shadow-sm"
                      >
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-10 bg-slate-50/30">
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                      {catapultAthletes.map((ath) => {
                        const metrics = mapCatapultMetrics(ath.stats);
                        const isMapped = !!ath.supabase_player_id;
                        
                        return (
                          <div key={ath.id} className={`bg-white p-6 rounded-[32px] border ${isMapped ? 'border-emerald-100 shadow-sm' : 'border-amber-200 border-dashed bg-amber-50/5'} transition-all`}>
                            <div className="flex justify-between items-start mb-6">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Nombre en Catapult</span>
                                <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{ath.catapult_name}</span>
                              </div>
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isMapped ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-500'}`}>
                                <i className={`fa-solid ${isMapped ? 'fa-check-double' : 'fa-user-plus'}`}></i>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div className="flex flex-col gap-1.5">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Enlace en Plataforma (Por ID o Nombre)</span>
                                <div className="relative">
                                  <input
                                    type="text"
                                    placeholder="Ingresa ID o escribe para buscar..."
                                    value={ath.input_id !== undefined ? ath.input_id : (ath.supabase_player_id ? String(ath.supabase_player_id) : '')}
                                    onChange={(e) => {
                                      const text = e.target.value;
                                      const cleanText = text.trim();
                                      const numId = cleanText === '' ? null : Number(cleanText);
                                      
                                      let matchedPlayer = null;
                                      if (numId !== null && !isNaN(numId)) {
                                        matchedPlayer = players.find(p => p.player_id === numId);
                                      } else if (cleanText !== '') {
                                        matchedPlayer = players.find(p => {
                                          const fullName = `${p.nombre} ${p.apellido1}`.toLowerCase();
                                          return fullName.includes(cleanText.toLowerCase());
                                        });
                                      }

                                      setCatapultAthletes(prev => prev.map(item => {
                                        if (item.id === ath.id) {
                                          return {
                                            ...item,
                                            input_id: text,
                                            supabase_player_id: matchedPlayer ? matchedPlayer.player_id : null,
                                            matched_player: matchedPlayer
                                          };
                                        }
                                        return item;
                                      }));
                                    }}
                                    className={`w-full ${isMapped ? 'bg-emerald-50/50 border-emerald-100 focus:border-emerald-500 font-bold text-emerald-800' : 'bg-slate-50 border-slate-200 focus:border-sky-500 text-slate-900'} border rounded-2xl pl-10 pr-4 py-3 text-[11px] outline-none transition-all placeholder:text-slate-400`}
                                  />
                                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                                    <i className="fa-solid fa-keyboard text-[10px]"></i>
                                  </div>
                                </div>
                                {isMapped ? (
                                  <div className="p-2 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between mt-1">
                                    <div className="flex items-center gap-2">
                                      <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[7px]" style={{ minWidth: '20px', minHeight: '20px' }}>
                                        <i className="fa-solid fa-check"></i>
                                      </div>
                                      <span className="text-[10px] font-black text-emerald-800 uppercase tracking-tight truncate max-w-[130px]">
                                        {ath.matched_player ? `${ath.matched_player.nombre} ${ath.matched_player.apellido1}` : 'Jugador Enlazado'}
                                      </span>
                                    </div>
                                    <span className="font-mono text-[9px] font-bold text-emerald-600 bg-white px-2 py-0.5 rounded-lg border border-emerald-100 shrink-0">
                                      ID: {ath.supabase_player_id}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="p-2 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2 mt-1">
                                    <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[7px]" style={{ minWidth: '20px', minHeight: '20px' }}>
                                      <i className="fa-solid fa-triangle-exclamation"></i>
                                    </div>
                                    <span className="text-[10px] font-bold text-rose-700 uppercase tracking-tight truncate">
                                      {ath.input_id ? 'ID / Jugador no encontrado' : 'Sin vincular - Ingresar ID'}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="pt-4 border-t border-slate-50 grid grid-cols-2 gap-y-3 gap-x-6">
                                <div className="flex flex-col">
                                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Dist. Total</span>
                                  <span className="text-xs font-black text-sky-600 tracking-tight">{metrics.dist_total_m.toFixed(0)}m</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Vel. Max</span>
                                  <span className="text-xs font-black text-red-600 tracking-tight">{metrics.vel_max_kmh.toFixed(1)} km/h</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">AInt (+15)</span>
                                  <span className="text-xs font-black text-slate-700 tracking-tight">{metrics.dist_ai_m_15_kmh.toFixed(0)}m</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Sprint (+25)</span>
                                  <span className="text-xs font-black text-amber-600 tracking-tight">{metrics.dist_sprint_m_25_kmh.toFixed(0)}m</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Acc+Decc AI</span>
                                  <span className="text-xs font-black text-indigo-600 tracking-tight">{metrics.acc_decc_ai_n}</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Minutos</span>
                                  <span className="text-xs font-black text-slate-400 tracking-tight">{(metrics.minutos).toFixed(0)} min</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-8 border-t border-slate-50 bg-slate-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{catapultAthletes.filter(a => a.supabase_player_id).length} Enlazados</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{catapultAthletes.filter(a => !a.supabase_player_id).length} Pendientes</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-slate-400 text-[10px] font-medium max-w-[300px] text-right">
                        Los datos se guardarán automáticamente en la tabla <b>gps_import</b> vinculando la actividad física con la ficha del jugador.
                      </p>
                      <button 
                        onClick={handleSyncToSupabase}
                        disabled={syncingToSupabase || catapultAthletes.filter(a => a.supabase_player_id).length === 0}
                        className="bg-sky-600 text-white px-10 py-4 rounded-full text-xs font-black uppercase tracking-widest hover:bg-sky-700 transition-all shadow-xl shadow-sky-600/20 disabled:opacity-30"
                      >
                        Iniciar Carga de Datos
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => { setSelectedType(null); setCsvData([]); setHeaders([]); }}
                className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-600 hover:border-red-100 transition-all"
              >
                <i className="fa-solid fa-arrow-left"></i>
              </button>
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{IMPORT_CONFIGS[selectedType].label}</h3>
                <p className="text-slate-500 text-xs font-medium italic">Configuración de mapeo de columnas</p>
              </div>
            </div>
            {csvData.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{csvData.length} Filas detectadas</span>
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="bg-[#CF1B2B] text-white px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest hover:bg-red-700 transition-all disabled:opacity-50 shadow-lg shadow-red-900/20"
                >
                  {importing ? <i className="fa-solid fa-spinner fa-spin mr-2"></i> : <i className="fa-solid fa-cloud-arrow-up mr-2"></i>}
                  Procesar Importación
                </button>
              </div>
            )}
          </div>

          <div className="p-8">
            {message && (
              <div className={`mb-8 p-4 rounded-2xl border flex items-center gap-4 ${message.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                <i className={`fa-solid ${message.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'} text-lg`}></i>
                <p className="text-xs font-bold">{message.text}</p>
              </div>
            )}

            {csvData.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-[32px] bg-slate-50/30">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-slate-300 mb-6 shadow-sm">
                  <i className="fa-solid fa-file-csv text-4xl"></i>
                </div>
                <p className="text-slate-900 font-black uppercase tracking-widest text-xs mb-2">Selecciona un archivo CSV</p>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-tighter mb-8">El archivo debe contener encabezados de columna</p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className="bg-white border border-slate-200 text-slate-900 px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest hover:border-red-600 hover:text-red-600 transition-all cursor-pointer shadow-sm"
                >
                  Explorar Archivos
                </label>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-1.5 h-6 bg-red-600 rounded-full"></div>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Mapeo de Columnas</h4>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {IMPORT_CONFIGS[selectedType].fields.map((field) => (
                      <div key={field.key} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                          </span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{field.type}</span>
                        </div>
                        <select
                          value={mapping[field.key] || ''}
                          onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                          className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-bold text-slate-900 outline-none focus:border-red-600 transition-all min-w-[200px]"
                        >
                          <option value="">Seleccionar columna...</option>
                          {headers.map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-1.5 h-6 bg-slate-900 rounded-full"></div>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Previsualización (Primeras 5 filas)</h4>
                  </div>
                  <div className="overflow-x-auto rounded-2xl border border-slate-100">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50">
                          {headers.map(h => (
                            <th key={h} className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvData.slice(0, 5).map((row, i) => (
                          <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                            {headers.map(h => (
                              <td key={h} className="px-4 py-3 text-[10px] font-bold text-slate-600 border-b border-slate-50">{row[h]}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[9px] font-bold text-slate-400 italic">* Asegúrate de que los IDs de jugador coincidan con los registrados en el sistema.</p>
                </div>
              </div>
            )}

            {unmatchedRows.length > 0 && (
              <div className="mt-12 p-8 bg-amber-50 rounded-[32px] border border-amber-100 animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white text-xl">
                    <i className="fa-solid fa-user-slash"></i>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-amber-900 uppercase tracking-tight">Jugadores no identificados</h4>
                    <p className="text-amber-700 text-[10px] font-bold uppercase tracking-tighter">Asocia manualmente los nombres del CSV con los jugadores del sistema</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {unmatchedRows.map((row) => {
                    const resolvedId = resolvedIds[row._rowIndex];
                    const matchedPlayer = players.find(p => p.player_id === resolvedId);
                    
                    return (
                      <div key={row._rowIndex} className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm flex flex-col gap-3">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Nombre en CSV</span>
                          <span className="text-[11px] font-black text-slate-900 truncate">{row._cleanName}</span>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Buscar en la lista</label>
                            <select
                              value={resolvedId || ''}
                              onChange={(e) => updateResolvedId(row._rowIndex, Number(e.target.value))}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-black text-slate-950 outline-none focus:border-amber-500 transition-all appearance-none cursor-pointer"
                            >
                              <option value="">Seleccionar Jugador...</option>
                              {players.map(p => (
                                <option key={p.player_id} value={p.player_id}>
                                  {p.nombre} {p.apellido1} (ID: {p.player_id})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="h-px bg-slate-100 flex-1"></div>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">O</span>
                            <div className="h-px bg-slate-100 flex-1"></div>
                          </div>

                          <div>
                            <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Manual ID Jugador</label>
                            <input
                              type="number"
                              placeholder="Escribe ID aquí (ej: 527)"
                              value={resolvedId || ''}
                              onChange={(e) => {
                                const val = e.target.value === '' ? 0 : Number(e.target.value);
                                updateResolvedId(row._rowIndex, val);
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-black text-slate-950 outline-none focus:border-amber-500 transition-all"
                            />
                          </div>

                          {matchedPlayer && (
                            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-emerald-50 rounded-lg border border-emerald-100 animate-in fade-in duration-300">
                              <i className="fa-solid fa-check text-emerald-500 text-[8px]"></i>
                              <span className="text-[9px] font-black text-emerald-700 uppercase truncate">
                                Confirmado: {matchedPlayer.nombre} {matchedPlayer.apellido1}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}