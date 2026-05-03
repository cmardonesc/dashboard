
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
    conflictColumns: ['id_del_jugador', 'fecha'],
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

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    const { data } = await supabase.from('players').select('*');
    if (data) setPlayers(data);
  };

  const extractName = (fullName: string) => {
    if (!fullName) return '';
    // Formato: "S15 Sesion 3 - Aaron Cornejo"
    const parts = fullName.split(' - ');
    return parts[parts.length - 1].trim();
  };

  const normalizeString = (str: any) => {
    if (!str) return '';
    return String(str)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  };

  const getRowName = useCallback((row: any) => {
    if (!row) return '';
    const rawName = row[nameHeader || ''] || row['Name'] || row['Jugador'] || row['nombre'] || row['JUGADOR'] || '';
    return ['gps_totales', 'gps_tareas'].includes(selectedType!) ? extractName(rawName) : rawName;
  }, [nameHeader, selectedType]);

  const findPlayerByName = (name: string) => {
    if (!name || !players.length) return null;
    const searchName = normalizeString(name);
    
    return players.find(p => {
      const nombre = normalizeString(p.nombre || '');
      const apellido1 = normalizeString(p.apellido1 || '');
      const apellido2 = normalizeString(p.apellido2 || '');
      
      const pFullName = `${nombre} ${apellido1}`.trim();
      const pShortName = `${nombre} ${apellido1}`.trim();
      
      // Check for exact match of normalized full name or short name
      if (pFullName === searchName || pShortName === searchName) return true;
      
      // Check if search name contains both first name and first apellido
      if (searchName.includes(nombre) && searchName.includes(apellido1)) return true;
      
      // Check if the system name is contained within the search name (handles extra middle names in CSV)
      if (searchName.includes(pShortName)) return true;

      return false;
    });
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

              // Special logic for name matching across different test types
              const needsNameMatching = ['gps_totales', 'gps_tareas', 'imtp', 'velocidad', 'aceleracion', 'vo2max'].includes(selectedType);
              
              if (needsNameMatching && detectedNameHeader) {
                const seenNames = new Set<string>();
                data.forEach((row: any, index: number) => {
                  const cleanName = ['gps_totales', 'gps_tareas'].includes(selectedType) ? extractName(row[detectedNameHeader]) : row[detectedNameHeader];
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
            
            if (unmatched.length > 0) {
              setTimeout(() => {
                window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
              }, 100);
            }
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

        // Handle GPS Tareas specific logic: Split Name into tarea and jugador_nombre
        const nameVal = row[nameHeader || 'Name'] || row['Name'] || '';
        if (selectedType === 'gps_tareas' && nameVal) {
          const parts = String(nameVal).split(' - ');
          if (parts.length >= 2) {
            const playerName = parts.pop()?.trim();
            const taskName = parts.join(' - ').trim();
            item.tarea = taskName;
            if (config.fields.some(f => f.key === 'jugador_nombre')) {
              item.jugador_nombre = playerName;
            }
          } else {
            item.tarea = nameVal;
            if (config.fields.some(f => f.key === 'jugador_nombre')) {
              item.jugador_nombre = nameVal;
            }
          }
        }

        config.fields.forEach(field => {
          const csvHeader = mapping[field.key];
          if (csvHeader && row[csvHeader] !== undefined && row[csvHeader] !== '') {
            let val = row[csvHeader];
            // Clean 'tarea' field for GPS Tasks (remove " - Player Name")
            if (selectedType === 'gps_tareas' && field.key === 'tarea' && typeof val === 'string') {
              if (val.includes(' - ')) {
                val = val.split(' - ')[0].trim();
              }
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
                // Handle Excel serial date
                val = excelDateToJSDate(Number(val));
              }
            }
            item[field.key] = val;
          }
        });

        // Override ID if resolved manually or automatically
        const manualId = resolvedIds[index];
        const normalizedCleanName = normalizeString(cleanName);
        const sharedId = Object.entries(resolvedIds).find(([idx, id]) => {
          const otherRow = csvData[Number(idx)];
          const otherCleanName = getRowName(otherRow);
          return normalizeString(otherCleanName) === normalizedCleanName;
        })?.[1];

        if (manualId || sharedId) {
          const pId = manualId || sharedId;
          item.id_del_jugador = pId;
          
          // Auto-populate 'jugador' name if missing but we have the player
          const player = players.find(p => (p as any).id_del_jugador === pId);
          if (player && !item.jugador && config.fields.some(f => f.key === 'jugador')) {
            item.jugador = `${(player as any).nombre} ${(player as any).apellido1}`;
          }
          if (player && !item.jugador_nombre && config.fields.some(f => f.key === 'jugador_nombre')) {
            item.jugador_nombre = `${(player as any).nombre} ${(player as any).apellido1}`;
          }
        }

        // Add test_type for physical_tests table
        if (config.table === 'physical_tests') {
          item.test_type = selectedType.toUpperCase();
        }

        return item;
      });

      // 2. Filter out invalid rows (missing required fields like date)
      const dataToInsert = mappedData.filter(item => {
        return config.fields.every(f => !f.required || (item[f.key] !== undefined && item[f.key] !== null));
      });

      if (dataToInsert.length === 0) {
        setMessage({ type: 'error', text: 'No se encontraron datos válidos para importar. Verifica el mapeo de columnas.' });
        setImporting(false);
        return;
      }

      // 3. Check if any row to be inserted is missing id_del_jugador
      const missingIds = dataToInsert.some(item => !item.id_del_jugador);
      if (missingIds) {
        setMessage({ type: 'error', text: 'Hay jugadores que no han sido asociados a un ID. Por favor, asócialos manualmente.' });
        setImporting(false);
        return;
      }

      // 4. Deduplicate dataToInsert based on conflictColumns to avoid "ON CONFLICT DO UPDATE" error
      // This happens if the CSV has multiple rows for the same player/date/task
      const deduplicatedData = dataToInsert.reduce((acc: any[], current) => {
        const conflictKey = config.conflictColumns.map(col => String(current[col])).join('|');
        const existingIndex = acc.findIndex(item => 
          config.conflictColumns.map(col => String(item[col])).join('|') === conflictKey
        );
        
        if (existingIndex > -1) {
          acc[existingIndex] = current; // Keep the last occurrence in the file
        } else {
          acc.push(current);
        }
        return acc;
      }, []);

      const { error } = await supabase.from(config.table).upsert(deduplicatedData, {
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
      console.error("Error importing data:", err);
      setMessage({ type: 'error', text: `Error al importar: ${err.message}` });
    } finally {
      setImporting(false);
    }
  };

  const handleCatapultSync = async () => {
    setSyncingCatapult(true);
    setMessage(null);
    try {
      const data = await fetchCatapultActivities();
      console.log("Catapult Data Received:", data);
      
      // Catapult API sometimes returns nested arrays or objects
      let activities = [];
      if (Array.isArray(data)) {
        activities = data;
      } else if (data && typeof data === 'object') {
        // Look for common array keys in API responses
        activities = data.activities || data.data || data.results || [];
      }

      setCatapultActivities(activities);
      
      if (activities.length === 0) {
        if (data && data.error) {
          setMessage({ type: 'error', text: `API: ${data.error}` });
        } else {
          setMessage({ type: 'error', text: 'No se encontraron sesiones. Verifica la fecha en Catapult OpenField.' });
        }
      } else {
        setMessage({ type: 'success', text: `Se encontraron ${activities.length} sesiones. Selecciona una para analizar.` });
      }
    } catch (err: any) {
      console.error("Sync Error:", err);
      let errorMsg = err.message;
      if (errorMsg.includes('Invalid path') || errorMsg.includes('404')) {
        errorMsg = 'Error Catapult: La ruta API es inválida. Verifica la región en Cloud OpenField.';
      }
      setMessage({ type: 'error', text: `Error de conexión: ${errorMsg}` });
    } finally {
      setSyncingCatapult(false);
    }
  };

  const handleInspectActivity = async (activityId: string) => {
    setSyncingCatapult(true);
    setMessage(null);
    try {
      const stats = await fetchCatapultActivityStats(activityId);
      console.log("Catapult Stats Received:", stats);
      setSelectedActivityStats(stats);
      setInspectingStats(true);
    } catch (err: any) {
      setMessage({ type: 'error', text: `Error obteniendo métricas: ${err.message}` });
    } finally {
      setSyncingCatapult(false);
    }
  };

  const updateResolvedId = (rowIndex: number, playerId: number) => {
    const row = csvData[rowIndex];
    const cleanName = getRowName(row);

    const newResolved = { ...resolvedIds };
    const normalizedCleanName = normalizeString(cleanName);
    
    // Update all rows that share this clean name
    csvData.forEach((r, idx) => {
      const rCleanName = getRowName(r);
      if (normalizeString(rCleanName) === normalizedCleanName) {
        newResolved[idx] = playerId;
      }
    });

    setResolvedIds(newResolved);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Centro de Importación de Datos</h2>
        <p className="text-slate-500 text-sm font-medium">Carga masiva de registros mediante archivos CSV.</p>
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
                <p className="text-sky-600 text-[10px] font-bold uppercase tracking-widest italic">Conectado vía Catapult API</p>
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
                      className="w-full bg-slate-50 text-slate-900 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-sky-600 hover:text-white transition-all"
                      onClick={() => handleInspectActivity(session.id)}
                    >
                      {syncingCatapult ? <i className="fa-solid fa-spinner fa-spin mr-2"></i> : null}
                      Analizar Parámetros
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            {/* DEBUG MODAL / RAW DATA INSPECTOR */}
            {inspectingStats && selectedActivityStats && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-4xl max-h-[85vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-300">
                  <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                    <div>
                      <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">Inspección de Parámetros Catapult</h4>
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Analizando estructura de datos para mapeo automatizado</p>
                    </div>
                    <button 
                      onClick={() => setInspectingStats(false)}
                      className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-8 font-mono text-[11px] bg-slate-900 text-sky-400">
                    <pre>{JSON.stringify(selectedActivityStats, null, 2)}</pre>
                  </div>
                  <div className="p-8 border-t border-slate-50 flex items-center justify-between">
                    <p className="text-slate-400 text-[10px] font-medium max-w-md">
                      Esta es la respuesta cruda de la API. Debemos identificar las llaves que corresponden a 
                      <b>distancia</b>, <b>velocidad máxima</b>, <b>aceleraciones</b>, etc.
                    </p>
                    <button 
                      onClick={() => setInspectingStats(false)}
                      className="bg-sky-600 text-white px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-sky-700 transition-all"
                    >
                      Continuar al Mapeo
                    </button>
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
                          <input
                            type="number"
                            placeholder="ID Jugador..."
                            value={resolvedId || ''}
                            onChange={(e) => updateResolvedId(row._rowIndex, Number(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-bold text-slate-900 outline-none focus:border-amber-500 transition-all"
                          />
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
