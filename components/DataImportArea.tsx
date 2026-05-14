
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { supabase } from '../lib/supabase';
import { User } from '../types';

import { fetchCatapultActivities, fetchCatapultActivityStats, testCatapultConnection } from '../services/catapultService';

type ImportType = 'gps_totales' | 'gps_tareas' | 'antropometria' | 'imtp' | 'velocidad' | 'aceleracion' | 'vo2max' | 'catapult_api';

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
    conflictColumns: ['id_del_jugador', 'fecha'],
    fields: [
      { key: 'id_del_jugador', label: 'ID Jugador', required: true, type: 'number' },
      { key: 'fecha', label: 'Date', required: true, type: 'date' },
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
    conflictColumns: ['id_del_jugador', 'fecha', 'tarea'],
    fields: [
      { key: 'id_del_jugador', label: 'ID Jugador', required: true, type: 'number' },
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
    conflictColumns: ['id_del_jugador', 'fecha_medicion'],
    fields: [
      { key: 'id_del_jugador', label: 'ID Jugador', required: true, type: 'number' },
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
      { key: 'maduracion_media', label: 'Maduración Media', required: false, type: 'number' },
      { key: 'phv_media', label: 'PHV Media', required: false, type: 'number' },
      { key: 'estatura_proy_media_cm', label: 'Estatura Proy Media (cm)', required: false, type: 'number' },
    ]
  },
  imtp: {
    label: 'IMTP (Fuerza)',
    table: 'evaluaciones_imtp_salto',
    icon: 'fa-solid fa-dumbbell',
    description: 'Isometric Mid-Thigh Pull - Test de fuerza máxima.',
    conflictColumns: ['id_del_jugador', 'fecha_test'],
    fields: [
      { key: 'jugador', label: 'NOMBRE JUGADOR', required: true, type: 'string' },
      { key: 'id_del_jugador', label: 'ID JUGADOR', required: true, type: 'number' },
      { key: 'fecha_test', label: 'FECHA TEST', required: true, type: 'date' },
      { key: 'peso', label: 'PESO (kg)', required: false, type: 'number' },
      { key: 'imtp_fuerza_n', label: 'IMTP FUERZA (N)', required: true, type: 'number' },
      { key: 'imtp_f_relativa_n_kg', label: 'IMTP F. RELATIVA', required: false, type: 'number' },
      { key: 'imtp_asimetria', label: 'IMTP ASIMETRIA', required: false, type: 'number' },
      { key: 'imtp_debil', label: 'IMTP DEBIL', required: false, type: 'string' },
      { key: 'fuerza_cmj', label: 'FUERZA CMJ', required: false, type: 'number' },
      { key: 'cmj_rsi_mod', label: 'CMJ RSI MOD', required: false, type: 'number' },
      { key: 'cmj_altura_salto_im', label: 'CMJ ALTURA IM (cm)', required: false, type: 'number' },
      { key: 'cmj_salto_tv', label: 'CMJ SALTO TV', required: false, type: 'number' },
      { key: 'cmj_peak_pot_relativa', label: 'CMJ POT. RELATIVA', required: false, type: 'number' },
      { key: 'cmj_asimetria_aterrizaje', label: 'CMJ ASIM. ATERRIZAJE', required: false, type: 'number' },
      { key: 'landing_n', label: 'LANDING (N)', required: false, type: 'number' },
      { key: 'landing_relativo', label: 'LANDING RELATIVO', required: false, type: 'number' },
      { key: 'cmj_pierna_debil', label: 'CMJ PIERNA DEBIL', required: false, type: 'string' },
      { key: 'dsi_valor', label: 'DSI VALOR', required: false, type: 'number' },
      { key: 'avk_peak_pot_relativa', label: 'AVK POT. RELATIVA', required: false, type: 'number' },
      { key: 'avk_indice_uso_brazos_tv', label: 'AVK INDICE BRAZOS TV', required: false, type: 'number' },
      { key: 'avk_x_tv', label: 'AVK X TV', required: false, type: 'number' },
      { key: 'avk_x_im', label: 'AVK X IM', required: false, type: 'number' },
      { key: 'avk_indice_uso_brazos_im', label: 'AVK INDICE BRAZOS IM', required: false, type: 'number' },
      { key: 'avk_indice_brazos_im', label: 'AVK INDICE BRAZOS IM (Alt)', required: false, type: 'number' },
      { key: 'slcmj_izq_altura_im', label: 'SLCJ IZQ ALTURA IM', required: false, type: 'number' },
      { key: 'slcmj_izq_altura_tv', label: 'SLCJ IZQ ALTURA TV', required: false, type: 'number' },
      { key: 'slcmj_der_altura_im', label: 'SLCJ DER ALTURA IM', required: false, type: 'number' },
      { key: 'slcmj_der_altura_tv', label: 'SLCJ DER ALTURA TV', required: false, type: 'number' },
      { key: 'slcmj_diferencia_pct_im', label: 'SLCJ DIFERENCIA % IM', required: false, type: 'number' },
      { key: 'slcmj_diferencia_pct_tv', label: 'SLCJ DIFERENCIA % TV', required: false, type: 'number' },
      { key: 'deficit_bilateral', label: 'DEFICIT BILATERAL', required: false, type: 'number' },
      { key: 'altura_x_rsi_mod', label: 'ALTURA X RSI MOD', required: false, type: 'number' },
    ]
  },
  velocidad: {
    label: 'Velocidad',
    table: 'velocidad_tests',
    icon: 'fa-solid fa-bolt',
    description: 'Tests de velocidad con splits (10m, 20m, 30m).',
    conflictColumns: ['id_del_jugador', 'fecha'],
    fields: [
      { key: 'id_del_jugador', label: 'ID JUGADOR', required: true, type: 'number' },
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
    conflictColumns: ['id_del_jugador', 'fecha', 'test_type'],
    fields: [
      { key: 'id_del_jugador', label: 'ID Jugador', required: true, type: 'number' },
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
    conflictColumns: ['id_del_jugador', 'fecha'],
    fields: [
      { key: 'id_del_jugador', label: 'ID JUGADOR', required: true, type: 'number' },
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
  catapult_api: {
    label: 'Catapult Cloud Sync',
    table: 'gps_import',
    icon: 'fa-solid fa-cloud-arrow-down',
    description: 'Sincronización directa con la nube de Catapult Sports.',
    conflictColumns: ['id_del_jugador', 'fecha'],
    fields: [
      { key: 'id_del_jugador', label: 'ID Jugador', required: true, type: 'number' },
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
  const [players, setPlayers] = useState<User[]>([]);
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
    
    return players.find(p => {
      const nombre = normalizeString(p.nombre || '');
      const apellido1 = normalizeString(p.apellido1 || '');
      
      const pFullName = `${nombre} ${apellido1}`.trim();
      
      // Exact match
      if (pFullName === searchName) return true;
      
      // Contains
      if (searchName.includes(nombre) && searchName.includes(apellido1)) return true;
      
      return false;
    });
  };

  // Metric Mapper for Catapult -> gps_import
  const mapCatapultMetrics = (catStats: any) => {
    const findMetric = (keys: string[]) => {
      for (const k of keys) {
        if (catStats[k] !== undefined) return Number(catStats[k]);
      }
      return 0;
    };

    return {
      minutos: findMetric(['duration', 'total_duration', 'minutes']) / 60 || 0, // Convert to minutes if seconds
      dist_total_m: findMetric(['total_distance', 'distance', 'total_dist']),
      m_por_min: findMetric(['meters_per_minute', 'metres_per_minute', 'relative_distance']),
      dist_ai_m_15_kmh: findMetric(['high_intensity_distance', 'hi_intensity_dist', 'band4_distance']),
      dist_mai_m_20_kmh: findMetric(['very_high_intensity_distance', 'vhi_intensity_dist', 'band5_distance']),
      dist_sprint_m_25_kmh: findMetric(['sprint_distance', 'band6_distance']),
      sprints_n: findMetric(['sprint_count', 'sprints']),
      vel_max_kmh: findMetric(['max_velocity', 'top_speed', 'velocity_max']),
      acc_decc_ai_n: findMetric(['accelerations_count', 'accel_count']) + findMetric(['decelerations_count', 'decel_count'])
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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
              const needsNameMatching = ['gps_totales', 'gps_tareas', 'imtp', 'velocidad', 'aceleracion', 'vo2max'].includes(selectedType);
              
              if (needsNameMatching && detectedNameHeader) {
                const seenNames = new Set<string>();
                data.forEach((row: any, index: number) => {
                  const cleanName = getRowName(row);
                  const player = findPlayerByName(cleanName);
                  if (player) {
                    initialResolved[index] = player.id_del_jugador;
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
  };

  const handleImport = async () => {
    if (!selectedType || csvData.length === 0) return;
    
    const config = IMPORT_CONFIGS[selectedType];
    const requiredFields = config.fields.filter(f => f.required && f.key !== 'id_del_jugador');
    const missingFields = requiredFields.filter(f => !mapping[f.key]);

    if (missingFields.length > 0) {
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

        // Use resolved IDs
        const manualId = resolvedIds[index];
        const normalizedCleanName = normalizeString(cleanName);
        const sharedId = Object.entries(resolvedIds).find(([idx, id]) => {
          const rName = getRowName(csvData[Number(idx)]);
          return normalizeString(rName) === normalizedCleanName;
        })?.[1];

        if (manualId || sharedId) {
          const pId = manualId || sharedId;
          item.id_del_jugador = pId;
          const player = players.find(p => p.id_del_jugador === pId);
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

      // NUEVO: Agregación de Sesiones para GPS Totales (Opción A)
      // Si el archivo contiene múltiples filas por jugador/fecha, las sumamos antes de upsert
      if (selectedType === 'gps_totales') {
        const aggregatedMap = new Map<string, any>();
        dataToInsert.forEach(item => {
          const key = `${item.id_del_jugador}-${item.fecha}`;
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
        
        // NUEVO: Contrastamos con lo que YA existe en la base de datos para SUMAR (no sobrescribir)
        // Esto permite que si cargan la sesión AM ahora y la PM después en archivos distintos, se acumulen correctamente.
        const playerIds = Array.from(new Set(dataToInsert.map(d => d.id_del_jugador)));
        const dates = Array.from(new Set(dataToInsert.map(d => d.fecha)));

        const { data: dbRecords } = await supabase
          .from('gps_import')
          .select('*')
          .in('id_del_jugador', playerIds)
          .in('fecha', dates);

        if (dbRecords && dbRecords.length > 0) {
          dbRecords.forEach(dbRow => {
            const key = `${dbRow.id_del_jugador}-${dbRow.fecha}`;
            if (aggregatedMap.has(key)) {
              const current = aggregatedMap.get(key);
              // Sumamos lo de la DB a lo que estamos cargando (Opción A)
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

      const { error } = await supabase.from(config.table).upsert(dataToInsert, {
        onConflict: config.conflictColumns.join(',')
      });

      if (error) throw error;

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
        newResolved[idx] = playerId;
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

      setCatapultActivities(activities);
      
      if (activities.length === 0) {
        setMessage({ 
          type: 'success', 
          text: `Conexión establecida con éxito${regionInfo}. No se encontraron sesiones recientes.` 
        });
      } else {
        setMessage({ type: 'success', text: `¡Conexión Exitosa${regionInfo}! Se encontraron ${activities.length} sesiones recientes.` });
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
    setMessage(null);
    setSelectedActivity(activity);
    try {
      const statsResponse = await fetchCatapultActivityStats(activity.id);
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

      // Initial auto-mapping
      const initialAthletes = athletesData.map((ath: any, index: number) => {
        const athName = ath.athlete_name || ath.name || ath.athlete?.name || '';
        const matchedPlayer = findPlayerByName(athName);
        return {
          id: index,
          catapult_name: athName,
          stats: ath,
          supabase_player_id: matchedPlayer ? matchedPlayer.id_del_jugador : null,
          matched_player: matchedPlayer
        };
      });

      setCatapultAthletes(initialAthletes);
      setInspectingStats(true);
    } catch (err: any) {
      setMessage({ type: 'error', text: `Error obteniendo métricas: ${err.message}` });
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
      const sessionDate = selectedActivity.startTime ? selectedActivity.startTime.split('T')[0] : new Date().toISOString().split('T')[0];
      
      let recordsToInsert = validMappings.map(ath => {
        const metrics = mapCatapultMetrics(ath.stats);
        const player = players.find(p => p.id_del_jugador === ath.supabase_player_id);
        
        return {
          id_del_jugador: ath.supabase_player_id,
          fecha: sessionDate,
          jugador: player ? `${player.nombre} ${player.apellido1}` : ath.catapult_name,
          ...metrics
        };
      });

      // NUEVO: Agregación para Catapult Sync (Opción A)
      const playerIds = Array.from(new Set(recordsToInsert.map(d => d.id_del_jugador)));
      const { data: existingDBRecords } = await supabase
        .from('gps_import')
        .select('*')
        .in('id_del_jugador', playerIds)
        .eq('fecha', sessionDate);

      const aggregatedMap = new Map<number, any>();
      recordsToInsert.forEach(item => {
        if (aggregatedMap.has(item.id_del_jugador)) {
          const existing = aggregatedMap.get(item.id_del_jugador);
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
          aggregatedMap.set(item.id_del_jugador, { ...item });
        }
      });

      // Sumar con lo que ya existe en la DB
      if (existingDBRecords) {
        existingDBRecords.forEach(dbRow => {
          if (aggregatedMap.has(dbRow.id_del_jugador)) {
            const current = aggregatedMap.get(dbRow.id_del_jugador);
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

      recordsToInsert = Array.from(aggregatedMap.values());

      const { error } = await supabase.from('gps_import').upsert(recordsToInsert, {
        onConflict: 'id_del_jugador,fecha'
      });

      if (error) throw error;

      setMessage({ type: 'success', text: `¡Sincronización Exitosa! Se han guardado ${recordsToInsert.length} registros en gps_import.` });
      setInspectingStats(false);
      setCatapultAthletes([]);
      setSelectedActivity(null);
    } catch (err: any) {
      console.error("Error syncing to Supabase:", err);
      alert("Error al sincronizar: " + err.message);
    } finally {
      setSyncingToSupabase(false);
    }
  };

  const updateAthleteMapping = (athId: number, playerId: number) => {
    setCatapultAthletes(prev => prev.map(ath => {
      if (ath.id === athId) {
        const player = players.find(p => p.id_del_jugador === playerId);
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
                      <span className="bg-sky-50 text-sky-600 text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest">
                        {session.startTime ? new Date(session.startTime).toLocaleDateString() : 'N/A'}
                      </span>
                      <i className="fa-solid fa-chevron-right text-slate-200 group-hover:text-sky-500 transition-colors"></i>
                    </div>
                    <h5 className="text-slate-900 font-black uppercase tracking-tight text-sm mb-1">{session.name || 'Sesión sin nombre'}</h5>
                    <p className="text-slate-400 text-[10px] font-bold mb-4 uppercase">{session.athleteCount || 0} Atletas • {session.duration || 0} min</p>
                    <button 
                      className="w-full bg-slate-50 text-slate-900 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-sky-600 hover:text-white transition-all disabled:opacity-50"
                      disabled={syncingCatapult}
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
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Enlace en Plataforma</span>
                                <select
                                  value={ath.supabase_player_id || ''}
                                  onChange={(e) => updateAthleteMapping(ath.id, Number(e.target.value))}
                                  className={`w-full ${isMapped ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50 border-slate-200'} border rounded-2xl px-4 py-3 text-[10px] font-bold text-slate-900 outline-none focus:border-sky-500 transition-all`}
                                >
                                  <option value="">-- Vincular Jugador --</option>
                                  {players.map(p => (
                                    <option key={p.id_del_jugador} value={p.id_del_jugador}>
                                      {p.nombre} {p.apellido1} ({p.id_del_jugador})
                                    </option>
                                  ))}
                                </select>
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
                    const matchedPlayer = players.find(p => p.id_del_jugador === resolvedId);
                    
                    return (
                      <div key={row._rowIndex} className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm flex flex-col gap-3">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Nombre en CSV</span>
                          <span className="text-[11px] font-black text-slate-900 truncate">{row._cleanName}</span>
                        </div>
                        <div className="space-y-2">
                          <select
                            value={resolvedId || ''}
                            onChange={(e) => updateResolvedId(row._rowIndex, Number(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-black text-slate-900 outline-none focus:border-amber-500 transition-all appearance-none cursor-pointer"
                          >
                            <option value="">Seleccionar Jugador...</option>
                            {players.map(p => (
                              <option key={p.id_del_jugador} value={p.id_del_jugador}>
                                {p.nombre} {p.apellido1} (ID: {p.id_del_jugador})
                              </option>
                            ))}
                          </select>
                          {matchedPlayer && (
                            <div className="flex items-center gap-2 px-2 py-1 bg-emerald-50 rounded-lg border border-emerald-100 animate-in fade-in duration-300">
                              <i className="fa-solid fa-check text-emerald-500 text-[8px]"></i>
                              <span className="text-[9px] font-black text-emerald-700 uppercase truncate">
                                {matchedPlayer.nombre} {matchedPlayer.apellido1}
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
