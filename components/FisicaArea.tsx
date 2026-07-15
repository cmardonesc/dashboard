
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { AthletePerformanceRecord, Category, CATEGORY_ID_MAP } from '../types';
import { supabase } from '../lib/supabase';
import { normalizeClub, getDriveDirectLink } from '../lib/utils';
import { FEDERATION_LOGO } from '../constants';
import ClubBadge from './ClubBadge';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

const DEFAULT_GPS_REFS = [
  { Tipo: 'PROMEDIO', Categoria: 'SUB_13', Posicion: 'DELANTERO', dist_total_m: 3800, m_por_min: 60, dist_ai_m_15_kmh: 350, dist_mai_m_20_kmh: 60, dist_sprint_m_25_kmh: 5, acc_decc_ai_n: 70 },
  { Tipo: 'PROMEDIO', Categoria: 'SUB_13', Posicion: 'MEDIO', dist_total_m: 4200, m_por_min: 65, dist_ai_m_15_kmh: 400, dist_mai_m_20_kmh: 70, dist_sprint_m_25_kmh: 3, acc_decc_ai_n: 85 },
  { Tipo: 'PROMEDIO', Categoria: 'SUB_13', Posicion: 'DEFENSA', dist_total_m: 3500, m_por_min: 55, dist_ai_m_15_kmh: 300, dist_mai_m_20_kmh: 50, dist_sprint_m_25_kmh: 4, acc_decc_ai_n: 65 },
  { Tipo: 'PROMEDIO', Categoria: 'SUB_13', Posicion: 'PORTERO', dist_total_m: 1200, m_por_min: 20, dist_ai_m_15_kmh: 30, dist_mai_m_20_kmh: 5, dist_sprint_m_25_kmh: 1, acc_decc_ai_n: 20 },
  { Tipo: 'PROMEDIO', Categoria: 'SUB_14', Posicion: 'DELANTERO', dist_total_m: 4000, m_por_min: 62, dist_ai_m_15_kmh: 380, dist_mai_m_20_kmh: 70, dist_sprint_m_25_kmh: 6, acc_decc_ai_n: 80 },
  { Tipo: 'PROMEDIO', Categoria: 'SUB_14', Posicion: 'MEDIO', dist_total_m: 4400, m_por_min: 68, dist_ai_m_15_kmh: 450, dist_mai_m_20_kmh: 80, dist_sprint_m_25_kmh: 4, acc_decc_ai_n: 95 },
  { Tipo: 'PROMEDIO', Categoria: 'SUB_14', Posicion: 'DEFENSA', dist_total_m: 3800, m_por_min: 58, dist_ai_m_15_kmh: 330, dist_mai_m_20_kmh: 60, dist_sprint_m_25_kmh: 5, acc_decc_ai_n: 75 },
  { Tipo: 'PROMEDIO', Categoria: 'SUB_14', Posicion: 'PORTERO', dist_total_m: 1300, m_por_min: 22, dist_ai_m_15_kmh: 40, dist_mai_m_20_kmh: 8, dist_sprint_m_25_kmh: 1, acc_decc_ai_n: 25 },
  { Tipo: 'PROMEDIO', Categoria: 'SUB_15', Posicion: 'DELANTERO', dist_total_m: 4200, m_por_min: 65, dist_ai_m_15_kmh: 420, dist_mai_m_20_kmh: 80, dist_sprint_m_25_kmh: 8, acc_decc_ai_n: 90 },
  { Tipo: 'PROMEDIO', Categoria: 'SUB_15', Posicion: 'MEDIO', dist_total_m: 4600, m_por_min: 70, dist_ai_m_15_kmh: 500, dist_mai_m_20_kmh: 90, dist_sprint_m_25_kmh: 5, acc_decc_ai_n: 105 },
  { Tipo: 'PROMEDIO', Categoria: 'SUB_15', Posicion: 'DEFENSA', dist_total_m: 4000, m_por_min: 62, dist_ai_m_15_kmh: 360, dist_mai_m_20_kmh: 70, dist_sprint_m_25_kmh: 6, acc_decc_ai_n: 85 },
  { Tipo: 'PROMEDIO', Categoria: 'SUB_15', Posicion: 'PORTERO', dist_total_m: 1400, m_por_min: 24, dist_ai_m_15_kmh: 45, dist_mai_m_20_kmh: 10, dist_sprint_m_25_kmh: 2, acc_decc_ai_n: 28 },
  { Tipo: 'PROMEDIO', Categoria: 'SUB_16', Posicion: 'DELANTERO', dist_total_m: 4400, m_por_min: 68, dist_ai_m_15_kmh: 460, dist_mai_m_20_kmh: 90, dist_sprint_m_25_kmh: 9, acc_decc_ai_n: 95 },
  { Tipo: 'PROMEDIO', Categoria: 'SUB_16', Posicion: 'MEDIO', dist_total_m: 4800, m_por_min: 72, dist_ai_m_15_kmh: 550, dist_mai_m_20_kmh: 110, dist_sprint_m_25_kmh: 5, acc_decc_ai_n: 115 },
  { Tipo: 'PROMEDIO', Categoria: 'SUB_16', Posicion: 'DEFENSA', dist_total_m: 4100, m_por_min: 64, dist_ai_m_15_kmh: 380, dist_mai_m_20_kmh: 75, dist_sprint_m_25_kmh: 7, acc_decc_ai_n: 88 },
  { Tipo: 'PROMEDIO', Categoria: 'SUB_16', Posicion: 'PORTERO', dist_total_m: 1450, m_por_min: 24, dist_ai_m_15_kmh: 48, dist_mai_m_20_kmh: 10, dist_sprint_m_25_kmh: 2, acc_decc_ai_n: 29 },
  { Tipo: 'PROMEDIO', Categoria: 'SUB_17', Posicion: 'DELANTERO', dist_total_m: 4500, m_por_min: 70, dist_ai_m_15_kmh: 500, dist_mai_m_20_kmh: 100, dist_sprint_m_25_kmh: 10, acc_decc_ai_n: 100 },
  { Tipo: 'PROMEDIO', Categoria: 'SUB_17', Posicion: 'MEDIO', dist_total_m: 5000, m_por_min: 75, dist_ai_m_15_kmh: 600, dist_mai_m_20_kmh: 120, dist_sprint_m_25_kmh: 5, acc_decc_ai_n: 120 },
  { Tipo: 'PROMEDIO', Categoria: 'SUB_17', Posicion: 'DEFENSA', dist_total_m: 4200, m_por_min: 65, dist_ai_m_15_kmh: 400, dist_mai_m_20_kmh: 80, dist_sprint_m_25_kmh: 8, acc_decc_ai_n: 90 },
  { Tipo: 'PROMEDIO', Categoria: 'SUB_17', Posicion: 'PORTERO', dist_total_m: 1500, m_por_min: 25, dist_ai_m_15_kmh: 50, dist_mai_m_20_kmh: 10, dist_sprint_m_25_kmh: 2, acc_decc_ai_n: 30 },
  { Tipo: 'PROMEDIO', Categoria: 'SUB_20', Posicion: 'DELANTERO', dist_total_m: 4800, m_por_min: 75, dist_ai_m_15_kmh: 550, dist_mai_m_20_kmh: 110, dist_sprint_m_25_kmh: 12, acc_decc_ai_n: 110 },
  { Tipo: 'PROMEDIO', Categoria: 'SUB_20', Posicion: 'MEDIO', dist_total_m: 5300, m_por_min: 80, dist_ai_m_15_kmh: 650, dist_mai_m_20_kmh: 130, dist_sprint_m_25_kmh: 6, acc_decc_ai_n: 130 },
  { Tipo: 'PROMEDIO', Categoria: 'SUB_20', Posicion: 'DEFENSA', dist_total_m: 4500, m_por_min: 70, dist_ai_m_15_kmh: 450, dist_mai_m_20_kmh: 90, dist_sprint_m_25_kmh: 10, acc_decc_ai_n: 100 },
  { Tipo: 'PROMEDIO', Categoria: 'ADULTA', Posicion: 'DELANTERO', dist_total_m: 5000, m_por_min: 80, dist_ai_m_15_kmh: 600, dist_mai_m_20_kmh: 120, dist_sprint_m_25_kmh: 15, acc_decc_ai_n: 120 },
  { Tipo: 'PROMEDIO', Categoria: 'ADULTA', Posicion: 'MEDIO', dist_total_m: 5500, m_por_min: 85, dist_ai_m_15_kmh: 700, dist_mai_m_20_kmh: 140, dist_sprint_m_25_kmh: 8, acc_decc_ai_n: 140 },
  { Tipo: 'PROMEDIO', Categoria: 'ADULTA', Posicion: 'DEFENSA', dist_total_m: 4800, m_por_min: 75, dist_ai_m_15_kmh: 500, dist_mai_m_20_kmh: 100, dist_sprint_m_25_kmh: 12, acc_decc_ai_n: 110 }
];

interface FisicaAreaProps {
  performanceRecords: AthletePerformanceRecord[];
  view?: 'wellness' | 'pse' | 'external_total' | 'report';
  userRole?: string;
  userClub?: string;
  userClubId?: number | null;
  highlightPlayerId?: number | null;
  clubs?: any[];
  categoryName?: string | null;
}

type MainTab = 'carga_interna' | 'carga_externa' | 'reporte_diario';

export default function FisicaArea({ performanceRecords, view = 'wellness', userRole, userClub, userClubId, highlightPlayerId, clubs = [], categoryName }: FisicaAreaProps) {
  const activeMainTab: MainTab = useMemo(() => {
    if (view === 'external_total') return 'carga_externa';
    if (view === 'report') return 'reporte_diario';
    return 'carga_interna';
  }, [view]);
  
  // Filtros Globales
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  });
  const [selectedCategories, setSelectedCategories] = useState<string[]>(Object.values(Category));
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [athleteSearch, setAthleteSearch] = useState(''); 

  // Sincronizar selección de categoría con la prop categoryName del padre
  useEffect(() => {
    if (categoryName) {
      const formattedPropName = categoryName.trim().toLowerCase().replace('sub ', 'sub_');
      const matchingCat = Object.values(Category).find(c => c.toLowerCase() === formattedPropName);
      if (matchingCat) {
        setSelectedCategories([matchingCat]);
      }
    }
  }, [categoryName]);

  // Filtro de búsqueda interno específico del Reporte Diario
  const [reportPlayerSearch, setReportPlayerSearch] = useState('');

  // Filtro de minutos para Carga Externa
  const [minDuration, setMinDuration] = useState<number>(0);
  const [maxDuration, setMaxDuration] = useState<number>(240);

  // Estados de Contexto
  const [activeMicrocycle, setActiveMicrocycle] = useState<any>(null);
  const [citedPlayerIds, setCitedPlayerIds] = useState<number[]>([]);
  const [playerCitedCategoryMap, setPlayerCitedCategoryMap] = useState<Record<number, Category>>({});
  const [loadingContext, setLoadingContext] = useState(false);

  // Filtros específicos del Reporte Diario
  const [selectedPlayersReport, setSelectedPlayersReport] = useState<Set<number>>(new Set());
  
  // NUEVO: Estado de Ordenamiento
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // NUEVO: Estado de Ordenamiento para Datos GPS
  const [gpsSortField, setGpsSortField] = useState<string>('name');
  const [gpsSortDirection, setGpsSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // NUEVO: Filtro de Sesión para Doble Jornada
  const [selectedSessionFilter, setSelectedSessionFilter] = useState<string>('all');
  // NUEVO: Unificación de sesiones para evitar distorsión de registros/pendientes
  const [unifySessions, setUnifySessions] = useState<boolean>(true);

  const [dailyTaskGps, setDailyTaskGps] = useState<any[]>([]);
  const [specialNote, setSpecialNote] = useState('');
  const [exportingWellness, setExportingWellness] = useState(false);
  const [exportingReport, setExportingReport] = useState(false);

  // NUEVO: Estado para datos de gps_import (Totales)
  const [gpsImportData, setGpsImportData] = useState<any[]>([]);
  const [loadingGpsImport, setLoadingGpsImport] = useState(false);
  const [gpsReferences, setGpsReferences] = useState<any[]>([]);

  // Fetch GPS References
  useEffect(() => {
    const fetchReferences = async () => {
      try {
        const { data, error } = await supabase
          .from('referencias_gps')
          .select('*');
        if (error) throw error;
        setGpsReferences(data || []);
      } catch (err) {
        console.error("Error fetching gps references:", err);
      }
    };
    fetchReferences();
  }, []);

  // NUEVO: Estados para Planificación y Pronóstico de Cargas
  const [plannedValues, setPlannedValues] = useState<any>({});
  const [dayIntensities, setDayIntensities] = useState<any>({});

  const METRIC_FALLBACKS: Record<string, Record<'Baja' | 'Media' | 'Alta', [number, number, number]>> = {
    dist_total_m: {
      Baja: [3000, 4000, 5000],
      Media: [5000, 6500, 8000],
      Alta: [8000, 10000, 12000]
    },
    dist_ai_m_15_kmh: {
      Baja: [100, 200, 300],
      Media: [300, 500, 700],
      Alta: [700, 1000, 1400]
    },
    dist_mai_m_20_kmh: {
      Baja: [20, 50, 80],
      Media: [80, 120, 180],
      Alta: [180, 250, 350]
    },
    dist_sprint_m_25_kmh: {
      Baja: [0, 10, 20],
      Media: [20, 40, 60],
      Alta: [60, 100, 150]
    },
    acc_decc_ai_n: {
      Baja: [40, 60, 80],
      Media: [80, 110, 140],
      Alta: [140, 180, 220]
    }
  };

  const fetchPlanning = useCallback(async (ignore = { val: false }) => {
    if (!activeMicrocycle?.id) {
      setPlannedValues({});
      setDayIntensities({});
      return;
    }

    // 1. Cargar desde localStorage de inmediato para rendimiento fluido y estado offline
    const valuesKey = `gps_planning_mc_values_${activeMicrocycle.id}`;
    const intensitiesKey = `gps_planning_mc_intensities_${activeMicrocycle.id}`;
    const storedValues = localStorage.getItem(valuesKey);
    const storedIntensities = localStorage.getItem(intensitiesKey);
    
    let localValues = {};
    let localIntensities = {};

    if (storedValues) {
      try {
        localValues = JSON.parse(storedValues);
      } catch (e) {
        console.error(e);
      }
    }
    if (storedIntensities) {
      try {
        localIntensities = JSON.parse(storedIntensities);
      } catch (e) {
        console.error(e);
      }
    }

    if (ignore.val) return;
    // Establecer valores locales de inmediato
    setPlannedValues(localValues);
    setDayIntensities(localIntensities);

    // 2. Intentar sincronizar con la base de datos de Supabase de manera asíncrona
    try {
      const { data, error } = await supabase
        .from('gps_planificaciones')
        .select('planned_data, intensities_data')
        .eq('microcycle_id', activeMicrocycle.id)
        .maybeSingle();

      if (error) throw error;
      if (ignore.val) return;
      if (data) {
        const vals = data.planned_data || {};
        const ints = data.intensities_data || {};
        setPlannedValues(vals);
        setDayIntensities(ints);
        localStorage.setItem(valuesKey, JSON.stringify(vals));
        localStorage.setItem(intensitiesKey, JSON.stringify(ints));
      }
    } catch (err: any) {
      console.log("Supabase planning load bypassed (using offline local state):", err?.message || err);
      // NO sobreescribimos los valores locales con objetos vacíos aquí, preservando la planificación local.
    }
  }, [activeMicrocycle?.id]);

  useEffect(() => {
    const ignore = { val: false };
    fetchPlanning(ignore);
    return () => {
      ignore.val = true;
    };
  }, [fetchPlanning]);

  // Escuchar actualizaciones externas de la planificación para sincronización en tiempo real
  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (!customEvent.detail?.microcycleId || customEvent.detail?.microcycleId === activeMicrocycle?.id) {
        fetchPlanning();
      }
    };
    window.addEventListener('gps-planning-updated', handleUpdate);
    return () => {
      window.removeEventListener('gps-planning-updated', handleUpdate);
    };
  }, [activeMicrocycle?.id, fetchPlanning]);

  const getDayIndex = () => {
    if (!activeMicrocycle || !selectedDate) return -1;
    const start = new Date(activeMicrocycle.start_date + 'T00:00:00');
    const current = new Date(selectedDate + 'T00:00:00');
    const diffTime = current.getTime() - start.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleGpsSort = (field: string) => {
    if (gpsSortField === field) {
      setGpsSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setGpsSortField(field);
      setGpsSortDirection(field === 'name' || field === 'categoria' ? 'asc' : 'desc');
    }
  };

  const getIFRColor = (ifr: number) => {
    if (ifr < 50) return '#2ecc71'; // Verde
    if (ifr < 85) return '#f1c40f'; // Amarillo
    if (ifr < 110) return '#e67e22'; // Naranja
    return '#e74c3c'; // Rojo
  };

  const matchPosition = (playerPosStr: string, refPosStr: string): boolean => {
    const p = (playerPosStr || '').toUpperCase().replace(/[^A-Z]/g, '');
    const r = (refPosStr || '').toUpperCase().replace(/[^A-Z]/g, '');

    if (!p || !r) return false;

    // Exact match
    if (p === r) return true;

    // Substring matches
    if (p.includes(r) || r.includes(p)) return true;

    // Key mappings for DB positions:
    // "DEFENSACENTRAL", "DEFENSALATERAL", "VOLANTE", "DELANTEROEXTREMO", "DELANTEROCENTRO"
    const isLateral = p.includes('LATERAL') || p.includes('BANDA') || p.includes('CARRILERO') || p.includes('WINGBACK');
    const isCentral = p.includes('CENTRAL') || p.includes('ZAGUERO') || p.includes('LIBERO') || p.includes('DEFENSA');
    const isExtremo = p.includes('EXTREMO') || p.includes('PUNTERO') || p.includes('WING');
    const isCentroDelantero = p.includes('DELANTERO') || p.includes('PUNTA') || p.includes('CENTRO') || p.includes('ATACANTE') || p.includes('9');
    const isVolante = p.includes('VOLANTE') || p.includes('MEDIO') || p.includes('CENTRAL') || p.includes('MC') || p.includes('MCO') || p.includes('MCD');

    if (r.includes('LATERAL') && isLateral) return true;
    if (r.includes('CENTRAL') && isCentral && !isLateral) return true;
    if (r.includes('EXTREMO') && isExtremo) return true;
    if (r.includes('CENTRO') && isCentroDelantero && !isExtremo) return true;
    if (r.includes('VOLANTE') && isVolante) return true;

    // Fallbacks for DEFAULT_GPS_REFS (which uses DELANTERO, MEDIO, DEFENSA, PORTERO)
    if (r === 'DEFENSA' && (isCentral || isLateral || p.includes('DEFENSA'))) return true;
    if (r === 'MEDIO' && (isVolante || p.includes('MEDIO') || p.includes('VOLANTE'))) return true;
    if (r === 'DELANTERO' && (isCentroDelantero || isExtremo || p.includes('DELANTERO'))) return true;
    if (r === 'PORTERO' && (p.includes('PORTERO') || p.includes('ARQUERO') || p.includes('GK'))) return true;

    return false;
  };

  const obtenerReferenciaJugador = (player: any) => {
    if (!player) return null;
    const refs = gpsReferences.length > 0 ? gpsReferences : DEFAULT_GPS_REFS;

    const normalizeStr = (str: string) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const pCat = normalizeStr(player.categoria || '');

    // 1. Try exact player match if player_id matches
    if (player.player_id) {
      const pIdRef = refs.find(r => r.player_id && Number(r.player_id) === Number(player.player_id));
      if (pIdRef) return pIdRef;
    }

    // 2. Try match category + position
    let ref = refs.find(r => {
      const rCat = normalizeStr(r.Categoria || r.categoria || '');
      const rPos = r.Posicion || r.posicion || '';
      return rCat === pCat && matchPosition(player.posicion, rPos);
    });

    // 3. Fallback: match position across any category
    if (!ref) {
      ref = refs.find(r => {
        const rPos = r.Posicion || r.posicion || '';
        return matchPosition(player.posicion, rPos);
      });
    }

    return ref || null;
  };

  const getParamCellProps = (actualVal: number | undefined | null, refVal: number | undefined | null) => {
    if (actualVal === undefined || actualVal === null || !refVal || isNaN(actualVal) || isNaN(refVal)) {
      return { className: '', style: {} };
    }
    const pct = (actualVal / refVal) * 100;
    if (pct < 50) {
      return {
        className: 'transition-all duration-200',
        style: { backgroundColor: 'rgba(46, 204, 113, 0.15)', color: '#27ae60' }
      };
    }
    if (pct < 85) {
      return {
        className: 'transition-all duration-200',
        style: { backgroundColor: 'rgba(241, 196, 15, 0.15)', color: '#b7950b' }
      };
    }
    if (pct < 110) {
      return {
        className: 'transition-all duration-200',
        style: { backgroundColor: 'rgba(230, 126, 34, 0.15)', color: '#d35400' }
      };
    }
    return {
      className: 'transition-all duration-200 font-extrabold',
      style: { backgroundColor: 'rgba(231, 76, 60, 0.15)', color: '#c0392b' }
    };
  };

  const calcularIFR = (gpsData: any, player: any) => {
    if (!player) return null;
    const ref = obtenerReferenciaJugador(player);
    if (!ref) return null;

    // Weights: 0.2 Volumen, 0.3 Intensidad, 0.5 Neuromuscular
    
    // 1. Volumen (20%): Distancia Total y Metros/min
    const refDistTotal = Number(ref['Total Distance (m)'] || ref.distancia_total || ref.dist_total_m) || 1;
    const refMetrosMin = Number(ref['Metros/min'] || ref.metros_minuto || ref.m_por_min) || 1;
    
    const volDT = (Number(gpsData.dist_total_m || 0) / refDistTotal) * 100;
    const volMM = (Number(gpsData.m_por_min || 0) / refMetrosMin) * 100;
    const volumen = (volDT + volMM) / 2;

    // 2. Intensidad (30%): >15km/h (Dist. AI) y >20km/h (Dist. MAI)
    const refDistAI = Number(ref['AInt >15 km/h'] || ref.distancia_ai || ref.dist_ai_m_15_kmh) || 1;
    const refDistMAI = Number(ref['MAInt >20km/h'] || ref.distancia_mai || ref.dist_mai_m_20_kmh) || 1;
    
    const intAI = (Number(gpsData.dist_ai_m_15_kmh || 0) / refDistAI) * 100;
    const intMAI = (Number(gpsData.dist_mai_m_20_kmh || 0) / refDistMAI) * 100;
    const intensidad = (intAI + intMAI) / 2;

    // 3. Neuromuscular (50%): Sprint >25km/h y #Acc+Decc AI
    const refDistSprint = Number(ref['Sprint >25 km/h'] || ref.distancia_sprint || ref.dist_sprint_m_25_kmh) || 1;
    const refAccDecc = Number(ref['#Acc+Decc AI'] || ref.acc_decc_ai || ref.acc_decc_ai_n) || 1;
    
    const neuroSprint = (Number(gpsData.dist_sprint_m_25_kmh || 0) / refDistSprint) * 100;
    const neuroAccDecc = (Number(gpsData.acc_decc_ai_n || 0) / refAccDecc) * 100;
    const neuromuscular = (neuroSprint + neuroAccDecc) / 2;

    const ifr = (volumen * 0.2) + (intensidad * 0.3) + (neuromuscular * 0.5);
    return ifr;
  };

  // Efecto: Sincronizar Microciclo y Nómina
  useEffect(() => {
    let active = true;
    const fetchContext = async () => {
      setLoadingContext(true);
      if (active) {
        setActiveMicrocycle(null);
        setCitedPlayerIds([]);
        setPlayerCitedCategoryMap({});
      }

      try {
        const allCitedIds = new Set<number>();
        const citedCatMap: Record<number, Category> = {};
        let primaryMicro = null;

        for (const cat of selectedCategories) {
          const catId = CATEGORY_ID_MAP[cat as Category];
          const { data: mc } = await supabase
            .from('microcycles')
            .select('*')
            .eq('category_id', catId)
            .lte('start_date', selectedDate)
            .gte('end_date', selectedDate)
            .maybeSingle();

          if (!active) return;

          if (mc) {
            if (!primaryMicro) primaryMicro = mc; // Keep the first one found as primary for display
            
            const { data: citaciones } = await supabase
              .from('citaciones')
              .select('player_id')
              .eq('microcycle_id', mc.id);

            if (!active) return;

            if (citaciones) {
              citaciones.forEach(c => {
                allCitedIds.add(c.player_id);
                citedCatMap[c.player_id] = cat as Category;
              });
            }
          }
        }

        if (!active) return;

        if (primaryMicro) {
          setActiveMicrocycle(primaryMicro);
          setCitedPlayerIds(Array.from(allCitedIds));
          setPlayerCitedCategoryMap(citedCatMap);
          setSelectedPlayersReport(allCitedIds);
        } else {
          // Si no hay microciclo activo, seleccionamos por defecto todos los jugadores
          // que pertenecen a las categorías seleccionadas para el reporte
          const fallbackIds = new Set<number>();
          performanceRecords.forEach(r => {
            if (r.player.player_id) {
              const playerCat = r.player.category;
              const playerAnio = r.player.anio;
              const currentYear = new Date().getFullYear();
              const age = playerAnio ? (currentYear - playerAnio) : null;
              
              let calculatedCat: Category | null = null;
              if (age !== null) {
                if (age <= 13) calculatedCat = Category.SUB_13;
                else if (age === 14) calculatedCat = Category.SUB_14;
                else if (age === 15) calculatedCat = Category.SUB_15;
                else if (age === 16) calculatedCat = Category.SUB_16;
                else if (age === 17) calculatedCat = Category.SUB_17;
                else if (age === 18) calculatedCat = Category.SUB_18;
                else if (age <= 20) calculatedCat = Category.SUB_20;
                else if (age <= 21) calculatedCat = Category.SUB_21;
                else if (age <= 23) calculatedCat = Category.SUB_23;
                else calculatedCat = Category.ADULTA;
              }
              
              const matchesCategory = selectedCategories.some(cat => 
                cat === calculatedCat || 
                cat === playerAnio?.toString() || 
                cat === playerCat
              );
              if (matchesCategory) {
                fallbackIds.add(r.player.player_id);
              }
            }
          });
          setSelectedPlayersReport(fallbackIds);
        }
      } catch (err) {
        console.error("Error context sync:", err);
      } finally {
        if (active) {
          setLoadingContext(false);
        }
      }
    };
    fetchContext();
    return () => {
      active = false;
    };
  }, [selectedDate, selectedCategories, performanceRecords]);

  // Efecto: Cargar Tareas GPS para Reporte
  useEffect(() => {
    if (activeMainTab === 'reporte_diario' && selectedDate) {
      const fetchDailyTasks = async () => {
        try {
          const { data } = await supabase
            .from('gps_tareas')
            .select('*')
            .eq('fecha', selectedDate);
          if (data) setDailyTaskGps(data);
        } catch (err) {
          console.error("Error fetch tasks:", err);
        }
      };
      fetchDailyTasks();
    }
  }, [activeMainTab, selectedDate]);

  // Efecto: Cargar datos de gps_import para Carga Externa Totales y Reporte
  useEffect(() => {
    if ((view === 'external_total' || activeMainTab === 'carga_externa' || activeMainTab === 'reporte_diario') && selectedDate) {
      const fetchGpsImport = async () => {
        setLoadingGpsImport(true);
        try {
          // Fetch GPS data
          const { data: gpsData, error: gpsError } = await supabase
            .from('gps_import')
            .select('*')
            .eq('fecha', selectedDate)
            .order('minutos', { ascending: false });
          
          if (gpsError) throw gpsError;
          
          if (!gpsData || gpsData.length === 0) {
            setGpsImportData([]);
            return;
          }

          // Fetch Players data
          const playerIds = Array.from(new Set(gpsData.map(d => d.player_id)));
          const { data: playersData, error: playersError } = await supabase
            .from('players')
            .select('player_id, nombre, apellido1, apellido2, posicion, anio, id_club, clubes!fk_players_clubes(id_club, nombre)')
            .in('player_id', playerIds);
          
          if (playersError) throw playersError;

          // Fetch active microcycles and citations for the day to determine "real" category
          const { data: activeMicros } = await supabase
            .from('microcycles')
            .select('id, category_id')
            .lte('start_date', selectedDate)
            .gte('end_date', selectedDate);

          const microIds = activeMicros?.map(m => m.id) || [];
          const { data: activeCitaciones } = await supabase
            .from('citaciones')
            .select('player_id, microcycle_id')
            .in('microcycle_id', microIds);

          const playerCategoryMap: Record<number, string> = {};
          activeCitaciones?.forEach(cit => {
            const mc = activeMicros?.find(m => m.id === cit.microcycle_id);
            if (mc) {
              const catName = Object.entries(CATEGORY_ID_MAP).find(([_, id]) => id === mc.category_id)?.[0];
              if (catName) {
                playerCategoryMap[cit.player_id] = catName;
              }
            }
          });

          // Aggregate data by player_id
          const aggregatedMap = new Map<number, any>();
          gpsData.forEach(gps => {
            const pid = gps.player_id;
            if (!aggregatedMap.has(pid)) {
              aggregatedMap.set(pid, { ...gps });
            } else {
              const existing = aggregatedMap.get(pid);
              existing.minutos = (existing.minutos || 0) + (gps.minutos || 0);
              existing.dist_total_m = (existing.dist_total_m || 0) + (gps.dist_total_m || 0);
              existing.dist_ai_m_15_kmh = (existing.dist_ai_m_15_kmh || 0) + (gps.dist_ai_m_15_kmh || 0);
              existing.dist_mai_m_20_kmh = (existing.dist_mai_m_20_kmh || 0) + (gps.dist_mai_m_20_kmh || 0);
              existing.dist_sprint_m_25_kmh = (existing.dist_sprint_m_25_kmh || 0) + (gps.dist_sprint_m_25_kmh || 0);
              existing.sprints_n = (existing.sprints_n || 0) + (gps.sprints_n || 0);
              existing.acc_decc_ai_n = (existing.acc_decc_ai_n || 0) + (gps.acc_decc_ai_n || 0);
              existing.vel_max_kmh = Math.max(existing.vel_max_kmh || 0, gps.vel_max_kmh || 0);
            }
          });

          // Join and finalize
          const joinedData = Array.from(aggregatedMap.values()).map(gps => {
            const player = playersData?.find(p => p.player_id === gps.player_id) as any;
            if (player) {
              // Recalculate metros por minuto reliably
              if (gps.minutos > 0) {
                gps.m_por_min = gps.dist_total_m / gps.minutos;
              }

              // Prioritize category from active citation
              if (playerCategoryMap[gps.player_id]) {
                player.categoria = playerCategoryMap[gps.player_id];
              } else if (player.category) {
                player.categoria = player.category;
              } else if (!player.categoria && player.anio) {
                const age = 2026 - player.anio;
                if (age <= 13) player.categoria = 'sub_13';
                else if (age === 14) player.categoria = 'sub_14';
                else if (age === 15) player.categoria = 'sub_15';
                else if (age === 16) player.categoria = 'sub_16';
                else if (age === 17) player.categoria = 'sub_17';
                else if (age === 18) player.categoria = 'sub_18';
                else if (age <= 20) player.categoria = 'sub_20';
                else if (age <= 21) player.categoria = 'sub_21';
                else if (age <= 23) player.categoria = 'sub_23';
                else player.categoria = 'adulta';
              }
            }
            return {
              ...gps,
              players: player || null
            };
          });

          setGpsImportData(joinedData);
        } catch (err) {
          console.error("Error fetching gps_import:", err);
        } finally {
          setLoadingGpsImport(false);
        }
      };
      fetchGpsImport();
    }
  }, [view, activeMainTab, selectedDate]);

  const anonymizedGpsImport = useMemo(() => {
    if (userRole !== 'club') return gpsImportData;
    
    return gpsImportData.map(row => {
      const player = row.players;
      let isOwnClub = false;
      if (userClubId) {
        isOwnClub = player?.id_club === userClubId;
      } else if (userClub) {
        const uClubNorm = normalizeClub(userClub);
        const pClub = player?.club_name || player?.club || '';
        isOwnClub = normalizeClub(pClub) === uClubNorm;
      }
      
      if (!isOwnClub) {
        return {
          ...row,
          players: {
            ...player,
            nombre: 'Jugador',
            apellido1: `[${row.player_id}]`,
            apellido2: '',
            club_name: 'OTRO CLUB',
            club: 'OTRO CLUB'
          }
        };
      }
      return row;
    });
  }, [gpsImportData, userRole, userClub, userClubId]);

  const togglePlayerInReport = (id: number) => {
    const next = new Set(selectedPlayersReport);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedPlayersReport(next);
  };

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return 'bg-emerald-200 text-black font-black';
    if (score >= 3.5) return 'bg-emerald-100 text-black font-black';
    if (score >= 2.5) return 'bg-amber-100 text-black font-black';
    return 'bg-red-200 text-black font-black';
  };

  const getIntensityStyle = (val: number) => {
    if (val > 110) return 'bg-red-600 text-white';
    if (val > 90) return 'bg-[#0b1220] text-white';
    return 'bg-slate-50 text-slate-600';
  };

  const getLoadStatus = (load: number) => {
    if (load > 800) return { label: 'CRÍTICA', color: 'text-red-600' };
    if (load > 600) return { label: 'ALTA', color: 'text-orange-600' };
    if (load > 400) return { label: 'ÓPTIMA', color: 'text-emerald-600' };
    return { label: 'BAJA', color: 'text-blue-600' };
  };

  const getRpeStyle = (rpe: number | null | undefined) => {
    if (rpe === null || rpe === undefined) return { backgroundColor: 'transparent', color: '#64748b' };
    const val = Math.max(1, Math.min(10, Number(rpe)));
    // Hue ranges from 120 (emerald green/light green) down to 0 (crimson red)
    const hue = 120 - Math.round(((val - 1) / 9) * 120);
    return {
      backgroundColor: `hsl(${hue}, 80%, 85%)`,
      color: '#000000',
      fontWeight: '900'
    };
  };

  const getCargaStyle = (carga: number | null | undefined) => {
    if (carga === null || carga === undefined) return { backgroundColor: 'transparent', color: '#64748b' };
    const val = Math.max(1, Math.min(1000, Number(carga)));
    // Hue ranges from 120 (emerald green) down to 0 (crimson red)
    const hue = 120 - Math.round(((val - 1) / 999) * 120);
    return {
      backgroundColor: `hsl(${hue}, 80%, 85%)`,
      color: '#000000',
      fontWeight: '900'
    };
  };

  // Lógica de Impresión Directa
  const handleTriggerPrint = () => {
    window.print();
  };

  const downloadTechnicalReportPDF = async () => {
    setExportingReport(true);
    try {
      const elements = document.querySelectorAll('.print-page-section');
      if (!elements || elements.length === 0) {
        throw new Error("No se encontraron páginas del reporte para exportar.");
      }

      // Initialize jsPDF A4 in landscape orientation (297 x 210 mm)
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const isAllCategories = selectedCategories.length === Object.values(Category).length;
      const categorySlug = isAllCategories 
        ? 'todas' 
        : selectedCategories.map(c => c.toLowerCase().replace(/_/g, '-')).join('-');
      const fileName = `reporte-tecnico-${categorySlug}-${selectedDate}.pdf`;

      for (let i = 0; i < elements.length; i++) {
        const element = elements[i] as HTMLElement;
        const isDark = element.classList.contains('bg-[#0b1220]');
        
        const canvas = await html2canvas(element, {
          scale: 2, // High resolution
          useCORS: true,
          scrollY: 0,
          scrollX: 0,
          backgroundColor: isDark ? '#0b1220' : '#ffffff',
          logging: false,
        });

        // Use JPEG to keep PDF size small but crystal clear
        const imgData = canvas.toDataURL('image/jpeg', 0.95);

        if (i > 0) {
          doc.addPage();
        }

        // Draw the image to fit the entire landscape A4 sheet (297mm x 210mm)
        doc.addImage(imgData, 'JPEG', 0, 0, 297, 210);
      }

      doc.save(fileName);
    } catch (err) {
      console.error("Error al descargar PDF del reporte técnico:", err);
      alert("Hubo un error al generar el PDF del reporte técnico.");
    } finally {
      setExportingReport(false);
    }
  };

  const downloadTechnicalReportJPG = async () => {
    setExportingReport(true);
    try {
      const elements = document.querySelectorAll('.print-page-section');
      if (!elements || elements.length === 0) {
        throw new Error("No se encontraron páginas del reporte para exportar.");
      }

      const isAllCategories = selectedCategories.length === Object.values(Category).length;
      const categorySlug = isAllCategories 
        ? 'todas' 
        : selectedCategories.map(c => c.toLowerCase().replace(/_/g, '-')).join('-');
      const fileName = `reporte-tecnico-${categorySlug}-${selectedDate}.jpg`;

      // Capture all pages
      const canvasPromises = Array.from(elements).map(async (el) => {
        const element = el as HTMLElement;
        const isDark = element.classList.contains('bg-[#0b1220]');
        return html2canvas(element, {
          scale: 2,
          useCORS: true,
          scrollY: 0,
          scrollX: 0,
          backgroundColor: isDark ? '#0b1220' : '#ffffff',
          logging: false,
        });
      });

      const canvases = await Promise.all(canvasPromises);

      // Create a master stitching canvas
      const masterCanvas = document.createElement('canvas');
      const ctx = masterCanvas.getContext('2d');
      if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas maestro.");

      const width = canvases[0].width;
      const totalHeight = canvases.reduce((sum, c) => sum + c.height, 0);

      masterCanvas.width = width;
      masterCanvas.height = totalHeight;

      let currentY = 0;
      for (const canvas of canvases) {
        ctx.drawImage(canvas, 0, currentY);
        currentY += canvas.height;
      }

      const imgData = masterCanvas.toDataURL('image/jpeg', 0.95);

      const link = document.createElement('a');
      link.href = imgData;
      link.download = fileName;
      link.click();
    } catch (err) {
      console.error("Error al descargar JPG del reporte técnico:", err);
      alert("Hubo un error al generar la imagen JPG del reporte técnico.");
    } finally {
      setExportingReport(false);
    }
  };

  // DERIVED DATA
  const rawCitadosPlayers = useMemo(() => {
    // 1. Jugadores citados (siempre visibles, para club de forma anonimizada)
    let cited = performanceRecords.filter(r => r.player.player_id && citedPlayerIds.includes(r.player.player_id));
    
    // Filtrar citados por las categorías seleccionadas si hay filtro activo
    if (selectedCategories.length > 0) {
      cited = cited.filter(r => {
        const playerCat = r.player.category;
        const playerAnio = r.player.anio;
        const currentYear = new Date().getFullYear();
        const age = playerAnio ? (currentYear - playerAnio) : null;
        
        let calculatedCat: Category | null = null;
        if (age !== null) {
          if (age <= 13) calculatedCat = Category.SUB_13;
          else if (age === 14) calculatedCat = Category.SUB_14;
          else if (age === 15) calculatedCat = Category.SUB_15;
          else if (age === 16) calculatedCat = Category.SUB_16;
          else if (age === 17) calculatedCat = Category.SUB_17;
          else if (age === 18) calculatedCat = Category.SUB_18;
          else if (age <= 20) calculatedCat = Category.SUB_20;
          else if (age <= 21) calculatedCat = Category.SUB_21;
          else if (age <= 23) calculatedCat = Category.SUB_23;
          else calculatedCat = Category.ADULTA;
        }

        const effectiveCategory = (r.player.player_id && playerCitedCategoryMap[r.player.player_id]) || calculatedCat || playerCat;
        
        return selectedCategories.some(cat => 
          cat === effectiveCategory || 
          cat === playerAnio?.toString() || 
          cat === playerCat
        );
      });
    }

    // Fallback: si no hay jugadores citados (porque no hay microciclo activo),
    // mostramos todos los jugadores de performanceRecords que pertenecen a las categorías seleccionadas
    if (cited.length === 0 && selectedCategories.length > 0) {
      cited = performanceRecords.filter(r => {
        const playerCat = r.player.category;
        const playerAnio = r.player.anio;
        const currentYear = new Date().getFullYear();
        const age = playerAnio ? (currentYear - playerAnio) : null;
        
        let calculatedCat: Category | null = null;
        if (age !== null) {
          if (age <= 13) calculatedCat = Category.SUB_13;
          else if (age === 14) calculatedCat = Category.SUB_14;
          else if (age === 15) calculatedCat = Category.SUB_15;
          else if (age === 16) calculatedCat = Category.SUB_16;
          else if (age === 17) calculatedCat = Category.SUB_17;
          else if (age === 18) calculatedCat = Category.SUB_18;
          else if (age <= 20) calculatedCat = Category.SUB_20;
          else if (age <= 21) calculatedCat = Category.SUB_21;
          else if (age <= 23) calculatedCat = Category.SUB_23;
          else calculatedCat = Category.ADULTA;
        }

        const effectiveCategory = (r.player.player_id && playerCitedCategoryMap[r.player.player_id]) || calculatedCat || playerCat;
        
        return selectedCategories.some(cat => 
          cat === effectiveCategory || 
          cat === playerAnio?.toString() || 
          cat === playerCat
        );
      });
    }
    
    // 2. Si es CLUB, asegurar que sus propios jugadores estén incluidos, incluso si no hay microciclo
    if (userRole === 'club') {
      const myPlayers = performanceRecords.filter(r => {
        let isMyPlayer = false;
        if (userClubId) {
          isMyPlayer = r.player.id_club === userClubId;
        } else if (userClub) {
          const uClubNorm = normalizeClub(userClub);
          const pClub = r.player.club_name || r.player.club || '';
          isMyPlayer = normalizeClub(pClub) === uClubNorm;
        }
        
        if (!isMyPlayer) return false;
        
        // Si hay categorías seleccionadas, intentamos filtrar por ellas para mantener coherencia con la UI
        if (selectedCategories.length > 0 && r.player.anio) {
          const currentYear = new Date().getFullYear();
          const age = currentYear - r.player.anio;
          const playerCat = `sub_${age}`;
          
          // Verificamos si la categoría del jugador coincide con alguna seleccionada
          const matchesCategory = selectedCategories.some(cat => 
            cat === playerCat || cat === r.player.anio?.toString() || cat === r.player.category
          );
          
          if (!matchesCategory) return false;
        }
        
        return true;
      });
      
      // Combinar citados con jugadores propios sin duplicados
      const combined = [...cited];
      myPlayers.forEach(p => {
        if (!combined.some(c => c.player.player_id === p.player.player_id)) {
          combined.push(p);
        }
      });
      return combined;
    }

    return cited;
  }, [performanceRecords, citedPlayerIds, userRole, userClub, selectedCategories, userClubId]);

  const currentCitadosPlayers = useMemo(() => {
    // Verificar si algún jugador reportó más de una sesión en el día seleccionado
    const hasAnyDoubleSession = rawCitadosPlayers.some(record => {
      const dayLoads = record.loads.filter(l => l.date === selectedDate);
      return dayLoads.length > 1;
    });

    if (hasAnyDoubleSession) {
      // Si realmente hay jornada doble registrada, respetamos los índices tal cual
      return rawCitadosPlayers;
    }

    // Si no hay jornada doble (ningún jugador tiene más de un registro de carga hoy),
    // normalizamos todas las cargas del día para que se muestren en la Sesión 1
    return rawCitadosPlayers.map(record => {
      const hasLoadsOnDate = record.loads.some(l => l.date === selectedDate);
      if (!hasLoadsOnDate) return record;

      return {
        ...record,
        loads: record.loads.map(l => {
          if (l.date === selectedDate) {
            return {
              ...l,
              session_index: 1 // Forzar a sesión 1
            };
          }
          return l;
        })
      };
    });
  }, [rawCitadosPlayers, selectedDate]);

  const reportData = useMemo(() => {
    const currentCitadosIds = new Set(currentCitadosPlayers.map(r => r.player.player_id!));
    const filteredRecords = currentCitadosPlayers.filter(r => selectedPlayersReport.has(r.player.player_id!));
    
    const wellnessList = filteredRecords.map(r => ({
      player: r.player,
      data: r.wellness.find(x => x.date === selectedDate)
    }));

    const loadList = filteredRecords.map(r => ({
      player: r.player,
      sessions: r.loads.filter(l => l.date === selectedDate)
    }));

    const gpsList = filteredRecords.map(r => ({
      player: r.player,
      sessions: r.gps.filter(g => g.date === selectedDate)
    }));

    const allGpsSessions = gpsList.flatMap(g => g.sessions);
    const gpsKPIs = {
      dist: allGpsSessions.length ? allGpsSessions.reduce((acc, c) => acc + c.totalDistance, 0) / allGpsSessions.length : 0,
      hsr: allGpsSessions.length ? allGpsSessions.reduce((acc, c) => acc + c.hsrDistance, 0) / allGpsSessions.length : 0,
      velMax: allGpsSessions.length ? Math.max(...allGpsSessions.map(s => s.maxSpeed)) : 0,
      int: allGpsSessions.length ? allGpsSessions.reduce((acc, c) => acc + (c.intensity || 0), 0) / allGpsSessions.length : 0
    };

    const tasksMap: Record<string, any> = {};
    const filteredDailyTasks = dailyTaskGps.filter(t => 
      selectedPlayersReport.has(t.player_id) && currentCitadosIds.has(t.player_id)
    );

    filteredDailyTasks.forEach(t => {
      if (!tasksMap[t.tarea]) {
        tasksMap[t.tarea] = { name: t.tarea, min: 0, dist: 0, mpm: 0, hsr: 0, ai: 0, sprint: 0, nsp: 0, vmax: 0, acc: 0, count: 0 };
      }
      const s = tasksMap[t.tarea];
      s.min += Number(t.minutos) || 0;
      s.dist += Number(t.dist_total_m) || 0;
      s.mpm += Number(t.m_por_min) || 0;
      s.hsr += Number(t.dist_mai_m_20_kmh) || 0;
      s.ai += Number(t.dist_ai_m_15_kmh) || 0;
      s.sprint += Number(t.dist_sprint_m_25_kmh) || 0;
      s.nsp += Number(t.sprints_n) || 0;
      s.vmax = Math.max(s.vmax, Number(t.vel_max_kmh) || 0);
      s.acc += Number(t.acc_decc_ai_n) || 0;
      s.count += 1;
    });
    
    const taskSummary = Object.values(tasksMap).map((s: any) => ({
      name: s.name,
      min: s.min / s.count, dist: s.dist / s.count, mpm: s.mpm / s.count, hsr: s.hsr / s.count,
      ai: s.ai / s.count, sprint: s.sprint / s.count, nsp: s.nsp / s.count, vmax: s.vmax, acc: s.acc / s.count
    }));

    const athleteTotalsMap: Record<number, any> = {};
    filteredDailyTasks.forEach(t => {
      const pid = t.player_id;
      if (!athleteTotalsMap[pid]) {
        athleteTotalsMap[pid] = { min: 0, dist: 0, mpm: 0, hsr: 0, ai: 0, sprint: 0, nsp: 0, vmax: 0, acc: 0, count: 0 };
      }
      const s = athleteTotalsMap[pid];
      s.min += Number(t.minutos) || 0;
      s.dist += Number(t.dist_total_m) || 0;
      s.mpm += Number(t.m_por_min) || 0;
      s.hsr += Number(t.dist_mai_m_20_kmh) || 0;
      s.ai += Number(t.dist_ai_m_15_kmh) || 0;
      s.sprint += Number(t.dist_sprint_m_25_kmh) || 0;
      s.nsp += Number(t.sprints_n) || 0;
      s.vmax = Math.max(s.vmax, Number(t.vel_max_kmh) || 0);
      s.acc += Number(t.acc_decc_ai_n) || 0;
      s.count += 1;
    });

    const athleteGpsTotals = filteredRecords.map(r => {
      const stats = athleteTotalsMap[r.player.player_id!];
      return {
        player: r.player,
        stats: stats ? { ...stats, mpm: stats.mpm / stats.count } : null
      };
    });

    // NUEVO: Datos de gps_import para el reporte (Totales Reales)
    const gpsImportReport = anonymizedGpsImport.filter(row => 
      selectedPlayersReport.has(row.player_id) && currentCitadosIds.has(row.player_id)
    );

    // NUEVO: Cálculo de Promedios para Wellness
    const wellValid = wellnessList.filter(w => w.data);
    const wellAvg = wellValid.length ? {
      fatigue: wellValid.reduce((acc, w) => acc + w.data.fatigue, 0) / wellValid.length,
      sleep: wellValid.reduce((acc, w) => acc + w.data.sleep, 0) / wellValid.length,
      soreness: wellValid.reduce((acc, w) => acc + w.data.soreness, 0) / wellValid.length,
      stress: wellValid.reduce((acc, w) => acc + w.data.stress, 0) / wellValid.length,
      mood: wellValid.reduce((acc, w) => acc + w.data.mood, 0) / wellValid.length,
    } : null;

    // NUEVO: Cálculo de Promedios para Carga Interna
    const loadValid = loadList.filter(l => l.sessions.length > 0);
    const loadAvg = loadValid.length ? {
      rpe: loadValid.reduce((acc, l) => acc + (l.sessions.reduce((sacc: number, s: any) => sacc + s.rpe, 0) / l.sessions.length), 0) / loadValid.length,
      duration: loadValid.reduce((acc, l) => acc + l.sessions.reduce((sacc: number, s: any) => sacc + s.duration, 0), 0) / loadValid.length,
      load: loadValid.reduce((acc, l) => acc + l.sessions.reduce((sacc: number, s: any) => sacc + s.load, 0), 0) / loadValid.length,
    } : null;

    // NUEVO: Cálculo de Promedios para GPS Totales
    const gpsAvg = gpsImportReport.length ? {
      minutos: gpsImportReport.reduce((acc, g) => acc + (g.minutos || 0), 0) / gpsImportReport.length,
      dist: gpsImportReport.reduce((acc, g) => acc + (g.dist_total_m || 0), 0) / gpsImportReport.length,
      mpm: gpsImportReport.reduce((acc, g) => acc + (g.m_por_min || 0), 0) / gpsImportReport.length,
      hsr: gpsImportReport.reduce((acc, g) => acc + (g.dist_mai_m_20_kmh || 0), 0) / gpsImportReport.length,
      ai: gpsImportReport.reduce((acc, g) => acc + (g.dist_ai_m_15_kmh || 0), 0) / gpsImportReport.length,
      sprint: gpsImportReport.reduce((acc, g) => acc + (g.dist_sprint_m_25_kmh || 0), 0) / gpsImportReport.length,
      nsp: gpsImportReport.reduce((acc, g) => acc + (g.sprints_n || 0), 0) / gpsImportReport.length,
      vmax: gpsImportReport.reduce((acc, g) => acc + (g.vel_max_kmh || 0), 0) / gpsImportReport.length,
      acc: gpsImportReport.reduce((acc, g) => acc + (g.acc_decc_ai_n || 0), 0) / gpsImportReport.length,
    } : null;

    // NUEVO: Resumen de Tareas con Min, Avg, Max
    const tasksAnalysis: Record<string, any> = {};
    filteredDailyTasks.forEach(t => {
      if (!tasksAnalysis[t.tarea]) {
        tasksAnalysis[t.tarea] = { name: t.tarea, dist: [], mpm: [], hsr: [], vmax: [], acc: [] };
      }
      const s = tasksAnalysis[t.tarea];
      s.dist.push(Number(t.dist_total_m) || 0);
      s.mpm.push(Number(t.m_por_min) || 0);
      s.hsr.push(Number(t.dist_mai_m_20_kmh) || 0);
      s.vmax.push(Number(t.vel_max_kmh) || 0);
      s.acc.push(Number(t.acc_decc_ai_n) || 0);
    });

    const taskSummaryDetailed = Object.values(tasksAnalysis).map((s: any) => ({
      name: s.name,
      dist: { min: Math.min(...s.dist), avg: s.dist.reduce((a:any,b:any)=>a+b,0)/s.dist.length, max: Math.max(...s.dist) },
      mpm: { min: Math.min(...s.mpm), avg: s.mpm.reduce((a:any,b:any)=>a+b,0)/s.mpm.length, max: Math.max(...s.mpm) },
      hsr: { min: Math.min(...s.hsr), avg: s.hsr.reduce((a:any,b:any)=>a+b,0)/s.hsr.length, max: Math.max(...s.hsr) },
      vmax: { min: Math.min(...s.vmax), avg: s.vmax.reduce((a:any,b:any)=>a+b,0)/s.vmax.length, max: Math.max(...s.vmax) },
      acc: { min: Math.min(...s.acc), avg: s.acc.reduce((a:any,b:any)=>a+b,0)/s.acc.length, max: Math.max(...s.acc) },
    }));

    return { wellnessList, loadList, gpsKPIs, taskSummary: taskSummaryDetailed, athleteGpsTotals, gpsImportReport, wellAvg, loadAvg, gpsAvg };
  }, [currentCitadosPlayers, selectedPlayersReport, selectedDate, dailyTaskGps, anonymizedGpsImport]);

  // LOGICA DE PAGINACION Y CHUNKING PARA PDF
  const wellnessChunks = useMemo(() => {
    const list = reportData.wellnessList;
    if (list.length === 0) return [];
    const chunks = [];
    // Sin KPIs en la primera página, podemos usar el mismo tamaño para todas.
    for (let i = 0; i < list.length; i += 14) {
      chunks.push(list.slice(i, i + 14));
    }
    return chunks;
  }, [reportData.wellnessList]);

  const loadChunks = useMemo(() => {
    const list = reportData.loadList;
    if (list.length === 0) return [];
    const chunks = [];
    // Páginas sin KPIs: Header + Margins.
    // 14 filas es seguro.
    for (let i = 0; i < list.length; i += 14) {
      chunks.push(list.slice(i, i + 14));
    }
    return chunks;
  }, [reportData.loadList]);

  const gpsChunks = useMemo(() => {
    const list = reportData.gpsImportReport;
    if (list.length === 0) return [];
    const chunks = [];
    for (let i = 0; i < list.length; i += 14) {
      chunks.push(list.slice(i, i + 14));
    }
    return chunks;
  }, [reportData.gpsImportReport]);

  const totalPages = wellnessChunks.length + loadChunks.length + gpsChunks.length + 1;

  const availableSessionIndexes = useMemo(() => {
    const indexes = new Set<number>([1]); // Default always includes Session 1
    currentCitadosPlayers.forEach(record => {
      record.loads.forEach(l => {
        if (l.date === selectedDate && l.session_index) {
          indexes.add(l.session_index);
        }
      });
    });
    return Array.from(indexes).sort((a, b) => a - b);
  }, [currentCitadosPlayers, selectedDate]);

  const stats = useMemo(() => {
    let checkInDone = 0;
    let sorenessAlerts = 0;
    let healthAlerts = 0;
    let checkOutDoneUnified = 0;
    
    const checkOutsBySession: Record<number, number> = {};
    availableSessionIndexes.forEach(idx => {
      checkOutsBySession[idx] = 0;
    });

    currentCitadosPlayers.forEach(record => {
      const dayWellness = record.wellness.find(w => w.date === selectedDate);
      const dayLoads = record.loads.filter(l => l.date === selectedDate);
      
      if (dayWellness) {
        checkInDone++;
        if ((dayWellness.soreness !== undefined && dayWellness.soreness < 5) || 
            (dayWellness.soreness_areas && dayWellness.soreness_areas.length > 0)) {
          sorenessAlerts++;
        }
        if (dayWellness.illness_symptoms && dayWellness.illness_symptoms.length > 0) {
          healthAlerts++;
        }
      }
      
      if (dayLoads.length > 0) {
        checkOutDoneUnified++;
      }
      
      dayLoads.forEach(l => {
        const sIdx = l.session_index || 1;
        checkOutsBySession[sIdx] = (checkOutsBySession[sIdx] || 0) + 1;
      });
    });

    // Para compatibilidad hacia atrás
    const primarySessionIdx = availableSessionIndexes[0] || 1;
    const checkOutDone = unifySessions ? checkOutDoneUnified : (checkOutsBySession[primarySessionIdx] || 0);

    return {
      checkInDone,
      checkInPending: currentCitadosPlayers.length - checkInDone,
      checkOutDone,
      checkOutPending: currentCitadosPlayers.length - checkOutDone,
      checkOutsBySession,
      sorenessAlerts,
      healthAlerts
    };
  }, [currentCitadosPlayers, selectedDate, availableSessionIndexes, unifySessions]);

  const { reported, pending, unifiedList } = useMemo(() => {
    const reportedList: any[] = [];
    const pendingList: any[] = [];
    const fullList: any[] = [];

    currentCitadosPlayers.forEach(record => {
      const dayWellness = record.wellness.find(w => w.date === selectedDate);
      const dayLoads = record.loads.filter(l => l.date === selectedDate);
      const matchesSearch = record.player.name.toLowerCase().includes(athleteSearch.toLowerCase());
      if (!matchesSearch) return;

      if (unifySessions) {
        // Modo Unificado: cada jugador se muestra exactamente una vez
        if (dayLoads.length > 0) {
          // Tomar la primera sesión o la que tenga datos. Si hay doble jornada, tomamos la primera de hoy.
          const matchingLoad = dayLoads[0];
          const item = { 
            player: record.player, 
            wellness: dayWellness, 
            load: matchingLoad, 
            sessionIndex: matchingLoad.session_index || 1, 
            sessionCount: dayLoads.length,
            allSessionIndexes: dayLoads.map(l => l.session_index || 1),
            hasReported: true 
          };
          reportedList.push(item);
          fullList.push(item);
        } else {
          // No ha reportado ninguna sesión hoy
          const item = { 
            player: record.player, 
            wellness: dayWellness, 
            load: null, 
            sessionIndex: 1, 
            sessionCount: 0,
            allSessionIndexes: [],
            hasReported: false 
          };
          if (!dayWellness) {
            pendingList.push(record);
          }
          fullList.push(item);
        }
      } else {
        // Modo Desglosado: iterar por índices de sesión para separar registros
        availableSessionIndexes.forEach(sIdx => {
          const matchingLoad = dayLoads.find(l => (l.session_index || 1) === sIdx);
          if (matchingLoad) {
            const item = { 
              player: record.player, 
              wellness: dayWellness, 
              load: matchingLoad, 
              sessionIndex: sIdx, 
              hasReported: true 
            };
            reportedList.push(item);
            fullList.push(item);
          } else {
            // No ha reportado para esta sesión
            const item = { 
              player: record.player, 
              wellness: dayWellness, 
              load: null, 
              sessionIndex: sIdx, 
              hasReported: false 
            };
            if (!dayWellness) {
              pendingList.push(record);
            }
            fullList.push(item);
          }
        });
      }
    });

    // Sort fullList: reported first, then pending
    let sortedFullList = [...fullList].sort((a, b) => {
      if (a.hasReported && !b.hasReported) return -1;
      if (!a.hasReported && b.hasReported) return 1;
      return 0;
    });

    // NUEVO: Ordenamiento dinámico
    sortedFullList = [...sortedFullList].sort((a, b) => {
      let valA: any;
      let valB: any;

      switch (sortField) {
        case 'name':
          valA = a.player.name?.toLowerCase() || '';
          valB = b.player.name?.toLowerCase() || '';
          break;
        case 'fatigue':
          valA = a.wellness?.fatigue ?? -1;
          valB = b.wellness?.fatigue ?? -1;
          break;
        case 'sleep':
          valA = a.wellness?.sleep ?? -1;
          valB = b.wellness?.sleep ?? -1;
          break;
        case 'soreness':
          valA = a.wellness?.soreness ?? -1;
          valB = b.wellness?.soreness ?? -1;
          break;
        case 'stress':
          valA = a.wellness?.stress ?? -1;
          valB = b.wellness?.stress ?? -1;
          break;
        case 'mood':
          valA = a.wellness?.mood ?? -1;
          valB = b.wellness?.mood ?? -1;
          break;
        case 'avg':
          valA = a.wellness ? (a.wellness.fatigue + a.wellness.sleep + a.wellness.mood) / 3 : -1;
          valB = b.wellness ? (b.wellness.fatigue + b.wellness.sleep + b.wellness.mood) / 3 : -1;
          break;
        case 'soreness_areas':
          valA = a.wellness?.soreness_areas?.join(', ').toLowerCase() || '';
          valB = b.wellness?.soreness_areas?.join(', ').toLowerCase() || '';
          break;
        case 'health_status':
          valA = a.wellness?.illness_symptoms?.join(', ').toLowerCase() || (a.hasReported ? 'sano' : '');
          valB = b.wellness?.illness_symptoms?.join(', ').toLowerCase() || (b.hasReported ? 'sano' : '');
          break;
        case 'rpe':
          valA = a.load?.rpe ?? -1;
          valB = b.load?.rpe ?? -1;
          break;
        case 'duration':
          valA = a.load?.duration ?? -1;
          valB = b.load?.duration ?? -1;
          break;
        case 'load':
          valA = a.load?.load ?? -1;
          valB = b.load?.load ?? -1;
          break;
        case 'pse_molestias':
          valA = a.load?.molestias?.toLowerCase() || '';
          valB = b.load?.molestias?.toLowerCase() || '';
          break;
        case 'pse_enfermedad':
          valA = a.load?.enfermedad?.toLowerCase() || '';
          valB = b.load?.enfermedad?.toLowerCase() || '';
          break;
        default:
          valA = '';
          valB = '';
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    // NUEVO: Filtrar por sesión seleccionada
    if (selectedSessionFilter !== 'all') {
      const filterIndex = Number(selectedSessionFilter);
      sortedFullList = sortedFullList.filter(item => item.sessionIndex === filterIndex);
    }

    return { reported: reportedList, pending: pendingList, unifiedList: sortedFullList };
  }, [currentCitadosPlayers, selectedDate, athleteSearch, sortField, sortDirection, availableSessionIndexes, selectedSessionFilter, unifySessions]);

  const gpsRows = useMemo(() => {
    const rows: any[] = [];
    currentCitadosPlayers.forEach(record => {
      const dayGpsEntries = record.gps.filter(g => g.date === selectedDate);
      const matchesSearch = record.player.name.toLowerCase().includes(athleteSearch.toLowerCase());
      if (!matchesSearch) return;
      dayGpsEntries.forEach((gps, idx) => {
        if (gps.duration < minDuration || gps.duration > maxDuration) return;
        const intensity = gps.intensity || (gps.totalDistance / Math.max(gps.duration, 1));
        rows.push({ player: record.player, gps, intensity, sessionIndex: idx + 1 });
      });
    });
    return rows;
  }, [currentCitadosPlayers, selectedDate, athleteSearch, minDuration, maxDuration]);

  const filteredGpsImport = useMemo(() => {
    const filtered = anonymizedGpsImport.filter(row => {
      const player = row.players;
      
      // Filtro por Categoría
      if (selectedCategories.length > 0) {
        if (!player || !player.categoria) return false;
        const matchesCategory = selectedCategories.some(cat => cat.toLowerCase() === player.categoria.toLowerCase());
        if (!matchesCategory) return false;
      }

      const playerName = player ? `${player.nombre} ${player.apellido1} ${player.apellido2 || ''}`.trim().toLowerCase() : 'atleta desconocido';
      const matchesSearch = playerName.includes(athleteSearch.toLowerCase());
      const duration = row.minutos || 0;
      const matchesDuration = duration >= minDuration && duration <= maxDuration;
      return matchesSearch && matchesDuration;
    });

    filtered.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      switch (gpsSortField) {
        case 'name': {
          const pA = a.players;
          const pB = b.players;
          valA = pA ? `${pA.nombre} ${pA.apellido1} ${pA.apellido2 || ''}`.trim().toLowerCase() : 'atleta desconocido';
          valB = pB ? `${pB.nombre} ${pB.apellido1} ${pB.apellido2 || ''}`.trim().toLowerCase() : 'atleta desconocido';
          break;
        }
        case 'categoria': {
          valA = (a.players?.categoria || '').toLowerCase();
          valB = (b.players?.categoria || '').toLowerCase();
          break;
        }
        case 'minutos':
          valA = a.minutos || 0;
          valB = b.minutos || 0;
          break;
        case 'dist_total_m':
          valA = a.dist_total_m || 0;
          valB = b.dist_total_m || 0;
          break;
        case 'm_por_min':
          valA = a.m_por_min || 0;
          valB = b.m_por_min || 0;
          break;
        case 'dist_ai_m_15_kmh':
          valA = a.dist_ai_m_15_kmh || 0;
          valB = b.dist_ai_m_15_kmh || 0;
          break;
        case 'dist_mai_m_20_kmh':
          valA = a.dist_mai_m_20_kmh || 0;
          valB = b.dist_mai_m_20_kmh || 0;
          break;
        case 'dist_sprint_m_25_kmh':
          valA = a.dist_sprint_m_25_kmh || 0;
          valB = b.dist_sprint_m_25_kmh || 0;
          break;
        case 'sprints_n':
          valA = a.sprints_n || 0;
          valB = b.sprints_n || 0;
          break;
        case 'vel_max_kmh':
          valA = a.vel_max_kmh || 0;
          valB = b.vel_max_kmh || 0;
          break;
        case 'acc_decc_ai_n':
          valA = a.acc_decc_ai_n || 0;
          valB = b.acc_decc_ai_n || 0;
          break;
        default:
          valA = 0;
          valB = 0;
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return gpsSortDirection === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else {
        return gpsSortDirection === 'asc'
          ? (valA as number) - (valB as number)
          : (valB as number) - (valA as number);
      }
    });

    return filtered;
  }, [anonymizedGpsImport, athleteSearch, minDuration, maxDuration, selectedCategories, gpsSortField, gpsSortDirection]);

  const { leftWellnessList, rightWellnessList, wellnessDayAvg } = useMemo(() => {
    const half = Math.ceil(unifiedList.length / 2);
    const left = unifiedList.slice(0, half);
    const right = unifiedList.slice(half);

    let sum = 0;
    let count = 0;
    unifiedList.forEach(item => {
      if (item.wellness) {
        const itemAvg = (item.wellness.fatigue + item.wellness.sleep + item.wellness.mood) / 3;
        sum += itemAvg;
        count++;
      }
    });
    const avg = count > 0 ? (sum / count).toFixed(1) : '—';

    return { leftWellnessList: left, rightWellnessList: right, wellnessDayAvg: avg };
  }, [unifiedList]);

  const downloadWellnessReportPDF = async () => {
    setExportingWellness(true);
    try {
      const doc = new jsPDF({
        orientation: 'l',
        unit: 'mm',
        format: 'a4'
      });

      const primaryColor = [2, 66, 140] as [number, number, number];
      const secondaryColor = [226, 35, 26] as [number, number, number];
      const darkColor = [26, 35, 51] as [number, number, number];
      const margin = 8;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // --- TOP COLOR BAR ---
      doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.rect(0, 0, pageWidth, 4, 'F');

      // --- CONTAINER HEADER (DARK NAVY RIBBON) ---
      doc.setFillColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.rect(margin, 8, pageWidth - (margin * 2), 16, 'F');

      // Left Title Block
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(margin, 8, 70, 16, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(view === 'pse' ? 'REPORTE DE CARGA INTERNA (PSE)' : 'REPORTE BIENESTAR FISIOLÓGICO', margin + 4, 18);

      // Logo
      const logoUrl = getDriveDirectLink(FEDERATION_LOGO);
      try {
        doc.addImage(logoUrl, 'PNG', margin + 76, 9, 14, 14);
      } catch (e) {
        console.error("Error loading logo for PDF:", e);
      }

      // Category text
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text('SELECCIÓN NACIONAL', margin + 96, 15);
      
      doc.setFontSize(8);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      const catLabel = selectedCategories.length === Object.values(Category).length 
        ? 'TODAS LAS CATEGORÍAS' 
        : selectedCategories.map(c => c.replace('SUB_', 'SUB ')).join(', ').toUpperCase();
      doc.text(catLabel, margin + 96, 19);

      // --- METADATA BOXES ---
      const boxY = 28;
      const boxW = (pageWidth - (margin * 2) - 8) / 3;
      const boxH = 10;

      // Box 1: Proceso
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(margin, boxY, boxW, boxH, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(140, 140, 140);
      doc.text('PROCESO / MICROCICLO', margin + 4, boxY + 3.5);
      doc.setFontSize(7.5);
      doc.setTextColor(40, 40, 40);
      const microText = activeMicrocycle?.nombre_display || (activeMicrocycle ? `MICROCICLO #${activeMicrocycle.micro_number || activeMicrocycle.id}` : 'SIN MICROCICLO ACTIVO');
      doc.text(microText.toUpperCase(), margin + 4, boxY + 7.5);

      // Box 2: Periodo/Fecha
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(margin + boxW + 4, boxY, boxW, boxH, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(140, 140, 140);
      doc.text('FECHA DEL REPORTE', margin + boxW + 8, boxY + 3.5);
      doc.setFontSize(7.5);
      doc.setTextColor(40, 40, 40);
      const reportDateText = new Date(selectedDate + 'T12:00:00')
        .toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
      doc.text(reportDateText.toUpperCase(), margin + boxW + 8, boxY + 7.5);

      // Box 3: Ciudad
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(margin + (boxW * 2) + 8, boxY, boxW, boxH, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(140, 140, 140);
      doc.text('CIUDAD / UBICACIÓN', margin + (boxW * 2) + 12, boxY + 3.5);
      doc.setFontSize(7.5);
      doc.setTextColor(40, 40, 40);
      const concText = activeMicrocycle?.city ? `${activeMicrocycle.city}, ${activeMicrocycle.country || 'CHILE'}` : 'SANTIAGO, CHILE';
      doc.text(concText.toUpperCase(), margin + (boxW * 2) + 12, boxY + 7.5);

      // --- STATS KPIs ---
      const kpiY = 41;
      const kpiW = (pageWidth - (margin * 2) - 12) / 4;
      const kpiH = 10;

      // KPI 1: Check-in / Check-out Done
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(margin, kpiY, kpiW, kpiH, 1.5, 1.5, 'F');
      doc.setFontSize(5);
      doc.setTextColor(140, 140, 140);
      doc.text(view === 'pse' ? 'CHECK-OUT COMPLETADOS' : 'CHECK-IN COMPLETADOS', margin + 3, kpiY + 3);
      doc.setFontSize(8.5);
      doc.setTextColor(2, 66, 140);
      doc.text(`${view === 'pse' ? stats.checkOutDone : stats.checkInDone} / ${currentCitadosPlayers.length}`, margin + 3, kpiY + 7.5);

      // KPI 2: Dolor Alertas
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(margin + kpiW + 4, kpiY, kpiW, kpiH, 1.5, 1.5, 'F');
      doc.setFontSize(5);
      doc.setTextColor(140, 140, 140);
      doc.text('ALERTAS DOLOR MUSCULAR', margin + kpiW + 7, kpiY + 3);
      doc.setFontSize(8.5);
      doc.setTextColor(stats.sorenessAlerts > 0 ? 226 : 40, stats.sorenessAlerts > 0 ? 35 : 40, stats.sorenessAlerts > 0 ? 26 : 40);
      doc.text(`${stats.sorenessAlerts} alertas`, margin + kpiW + 7, kpiY + 7.5);

      // KPI 3: Alertas Salud
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(margin + (kpiW * 2) + 8, kpiY, kpiW, kpiH, 1.5, 1.5, 'F');
      doc.setFontSize(5);
      doc.setTextColor(140, 140, 140);
      doc.text('ALERTAS ESTADO SALUD', margin + (kpiW * 2) + 11, kpiY + 3);
      doc.setFontSize(8.5);
      doc.setTextColor(stats.healthAlerts > 0 ? 226 : 40, stats.healthAlerts > 0 ? 35 : 40, stats.healthAlerts > 0 ? 26 : 40);
      doc.text(`${stats.healthAlerts} alertas`, margin + (kpiW * 2) + 11, kpiY + 7.5);

      // KPI 4: Promedio General / Carga Promedio
      let kpi4Label = 'PROMEDIO BIENESTAR JORNADA';
      let kpi4Value = '';
      if (view === 'pse') {
        kpi4Label = 'CARGA PROMEDIO JORNADA';
        let sumLoads = 0;
        let countLoads = 0;
        unifiedList.forEach(item => {
          if (item.load?.load) {
            sumLoads += Number(item.load.load);
            countLoads++;
          }
        });
        kpi4Value = countLoads > 0 ? `${(sumLoads / countLoads).toFixed(0)} u.a.` : '—';
      } else {
        let sumAvg = 0;
        let countAvg = 0;
        unifiedList.forEach(item => {
          if (item.wellness) {
            const itemAvg = (item.wellness.fatigue + item.wellness.sleep + item.wellness.mood) / 3;
            sumAvg += itemAvg;
            countAvg++;
          }
        });
        const wellnessDayAvgDecimal = countAvg > 0 ? (sumAvg / countAvg).toFixed(1) : '—';
        kpi4Value = `${wellnessDayAvgDecimal} / 5.0`;
      }

      doc.setFillColor(245, 247, 250);
      doc.roundedRect(margin + (kpiW * 3) + 12, kpiY, kpiW, kpiH, 1.5, 1.5, 'F');
      doc.setFontSize(5);
      doc.setTextColor(140, 140, 140);
      doc.text(kpi4Label, margin + (kpiW * 3) + 15, kpiY + 3);
      doc.setFontSize(8.5);
      doc.setTextColor(40, 40, 40);
      doc.text(kpi4Value, margin + (kpiW * 3) + 15, kpiY + 7.5);

      const tableStartY = 54;

      // Dividir unifiedList en 2 grupos para las dos columnas similares
      const halfLength = Math.ceil(unifiedList.length / 2);
      const leftGroup = unifiedList.slice(0, halfLength);
      const rightGroup = unifiedList.slice(halfLength);

      const formatRow = (r: any) => {
        if (view === 'pse') {
          const isPending = !r.load;
          const duration = r.load?.duration ? String(r.load.duration) : '-';
          const rpe = r.load?.rpe !== undefined && r.load?.rpe !== null ? String(r.load.rpe) : '-';
          const loadVal = r.load?.load !== undefined && r.load?.load !== null ? String(r.load.load) : '-';
          
          let painText = 'Sin Dolor';
          if (r.load?.molestias) {
            painText = r.load.molestias;
          }
          let healthText = 'Sano';
          if (r.load?.enfermedad) {
            healthText = r.load.enfermedad;
          }
          const painAndHealth = isPending ? '-' : `${painText} | ${healthText}`;
          return [
            `${r.player?.name || ''}\n${r.player?.club_name || r.player?.club || 'SIN CLUB'}`,
            duration,
            rpe,
            loadVal,
            painAndHealth.toUpperCase(),
            isPending ? 'PENDIENTE' : 'OK'
          ];
        } else {
          const isPending = !r.wellness;
          const playerAvg = r.wellness ? ((r.wellness.fatigue + r.wellness.sleep + r.wellness.mood) / 3).toFixed(1) : '-';
          
          let painText = 'Sin Dolor';
          if (r.wellness?.soreness_areas && r.wellness.soreness_areas.length > 0) {
            painText = r.wellness.soreness_areas.join(', ');
          }
          
          let healthText = 'Sano';
          if (r.wellness?.illness_symptoms && r.wellness.illness_symptoms.length > 0) {
            healthText = r.wellness.illness_symptoms.join(', ');
          }
          
          const painAndHealth = isPending ? '-' : `${painText} | ${healthText}`;

          return [
            `${r.player?.name || ''}\n${r.player?.club_name || r.player?.club || 'SIN CLUB'}`,
            r.wellness ? String(r.wellness.fatigue) : '-',
            r.wellness ? String(r.wellness.sleep) : '-',
            r.wellness ? String(r.wellness.soreness) : '-',
            r.wellness ? String(r.wellness.stress || '-') : '-',
            r.wellness ? String(r.wellness.mood || '-') : '-',
            playerAvg,
            painAndHealth.toUpperCase(),
            isPending ? 'PENDIENTE' : 'OK'
          ];
        }
      };

      const leftRows = leftGroup.map(formatRow);
      const rightRows = rightGroup.map(formatRow);

      const spacing = 4;
      const colWidth = (pageWidth - (margin * 2) - spacing) / 2;

      const cellStylesParser = (data: any) => {
        // Estilos para headers de las tablas
        if (data.section === 'head') {
          data.cell.styles.fillColor = [11, 18, 32];
          data.cell.styles.textColor = [255, 255, 255];
          data.cell.styles.fontSize = 5;
          data.cell.styles.valign = 'middle';
          data.cell.styles.halign = 'center';
          return;
        }

        // Estilos por defecto de las celdas
        data.cell.styles.fontSize = 4.8;
        data.cell.styles.textColor = [40, 40, 40];
        data.cell.styles.lineColor = [240, 240, 240];
        data.cell.styles.lineWidth = 0.1;

        if (view === 'pse') {
          const isRowPending = data.row.cells[5].text[0] === 'PENDIENTE';
          if (isRowPending) {
            data.cell.styles.textColor = [180, 180, 180];
          }

          // Alinear la columna de nombre/club a la izquierda
          if (data.column.index === 0) {
            data.cell.styles.halign = 'left';
            data.cell.styles.fontStyle = 'bold';
          } else if (data.column.index === 4) {
            data.cell.styles.halign = 'left'; // dolores / sintomas
            const text = (data.cell.text && data.cell.text[0]) || '';
            if (text && text !== '-' && text !== 'SIN DOLOR | SANO') {
              data.cell.styles.fillColor = [254, 226, 226]; // Light red background
              data.cell.styles.textColor = [0, 0, 0];       // Black text
              data.cell.styles.fontStyle = 'bold';
            }
          } else {
            data.cell.styles.halign = 'center';
          }

          // Colorear RPE (col 2)
          if (data.column.index === 2) {
            const val = parseFloat(data.cell.text[0]);
            if (!isNaN(val)) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.textColor = [0, 0, 0]; // Black text
              if (val >= 8) {
                data.cell.styles.fillColor = [254, 226, 226]; // Light red
              } else if (val >= 5) {
                data.cell.styles.fillColor = [254, 243, 199]; // Light amber
              } else {
                data.cell.styles.fillColor = [220, 252, 231]; // Light green
              }
            }
          }

          // Colorear Carga (col 3)
          if (data.column.index === 3) {
            const val = parseFloat(data.cell.text[0]);
            if (!isNaN(val)) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.textColor = [0, 0, 0]; // Black text
              if (val >= 600) {
                data.cell.styles.fillColor = [254, 226, 226]; // Light red
              } else if (val >= 300) {
                data.cell.styles.fillColor = [254, 243, 199]; // Light amber
              } else {
                data.cell.styles.fillColor = [220, 252, 231]; // Light green
              }
            }
          }

          // Colorear status
          if (data.column.index === 5) {
            data.cell.styles.fontStyle = 'bold';
            if (data.cell.text[0] === 'PENDIENTE') {
              data.cell.styles.textColor = [230, 126, 34];
            } else {
              data.cell.styles.textColor = [39, 174, 96];
            }
          }
        } else {
          const isRowPending = data.row.cells[8].text[0] === 'PENDIENTE';
          if (isRowPending) {
            data.cell.styles.textColor = [180, 180, 180];
          }

          // Alinear la columna de nombre/club a la izquierda
          if (data.column.index === 0) {
            data.cell.styles.halign = 'left';
            data.cell.styles.fontStyle = 'bold';
          } else if (data.column.index === 7) {
            data.cell.styles.halign = 'left'; // dolores / sintomas
            const text = (data.cell.text && data.cell.text[0]) || '';
            if (text && text !== '-' && text !== 'SIN DOLOR | SANO') {
              data.cell.styles.fillColor = [254, 226, 226]; // Light red background
              data.cell.styles.textColor = [0, 0, 0];       // Black text
              data.cell.styles.fontStyle = 'bold';
            }
          } else {
            data.cell.styles.halign = 'center';
          }

          // Colorear las notas 1-5 (Fatigue, Sleep, Soreness, Stress, Mood)
          if (data.column.index >= 1 && data.column.index <= 5) {
            const val = parseFloat(data.cell.text[0]);
            if (!isNaN(val)) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.textColor = [0, 0, 0]; // Black text
              if (val >= 4.0) {
                data.cell.styles.fillColor = [220, 252, 231]; // Light green
              } else if (val >= 3.0) {
                data.cell.styles.fillColor = [254, 243, 199]; // Light amber
              } else {
                data.cell.styles.fillColor = [254, 226, 226]; // Light red
              }
            }
          }

          // Colorear el promedio general
          if (data.column.index === 6) {
            const val = parseFloat(data.cell.text[0]);
            if (!isNaN(val)) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.textColor = [0, 0, 0]; // Black text
              if (val >= 4.0) {
                data.cell.styles.fillColor = [220, 252, 231]; // Light green
              } else if (val >= 3.0) {
                data.cell.styles.fillColor = [254, 243, 199]; // Light amber
              } else {
                data.cell.styles.fillColor = [254, 226, 226]; // Light red
              }
            }
          }

          // Colorear "PENDIENTE" vs "OK"
          if (data.column.index === 8) {
            data.cell.styles.fontStyle = 'bold';
            if (data.cell.text[0] === 'PENDIENTE') {
              data.cell.styles.textColor = [230, 126, 34]; // Naranja descriptivo
            } else {
              data.cell.styles.textColor = [39, 174, 96];  // Verde
            }
          }
        }
      };

      const columnsToUse = view === 'pse' ? [
        { header: 'ATLETA', dataKey: 0 },
        { header: 'DUR', dataKey: 1 },
        { header: 'RPE', dataKey: 2 },
        { header: 'CARGA', dataKey: 3 },
        { header: 'MOLESTIA / ENFERMEDAD', dataKey: 4 },
        { header: 'ESTADO', dataKey: 5 }
      ] : [
        { header: 'ATLETA', dataKey: 0 },
        { header: 'FAT', dataKey: 1 },
        { header: 'SUE', dataKey: 2 },
        { header: 'DOL', dataKey: 3 },
        { header: 'EST', dataKey: 4 },
        { header: 'ÁNÍ', dataKey: 5 },
        { header: 'PROM', dataKey: 6 },
        { header: 'ZONA MOLESTIA / SÍNTOMAS', dataKey: 7 },
        { header: 'ESTADO', dataKey: 8 }
      ];

      const columnStylesToUse: any = view === 'pse' ? {
        0: { cellWidth: 32 },
        1: { cellWidth: 10 },
        2: { cellWidth: 10 },
        3: { cellWidth: 14 },
        4: { cellWidth: 'auto' },
        5: { cellWidth: 16 }
      } : {
        0: { cellWidth: 25 },
        1: { cellWidth: 7 },
        2: { cellWidth: 7 },
        3: { cellWidth: 7 },
        4: { cellWidth: 7 },
        5: { cellWidth: 7 },
        6: { cellWidth: 9 },
        7: { cellWidth: 'auto' },
        8: { cellWidth: 14 }
      };

      // Tabla Izquierda
      autoTable(doc, {
        head: [columnsToUse.map(col => col.header)],
        body: leftRows,
        startY: tableStartY,
        margin: { left: margin },
        tableWidth: colWidth,
        styles: { overflow: 'linebreak', cellPadding: 1 },
        headStyles: { fillColor: [11, 18, 32] },
        columnStyles: columnStylesToUse,
        didParseCell: cellStylesParser
      });

      // Tabla Derecha (solo si hay datos)
      if (rightRows.length > 0) {
        autoTable(doc, {
          head: [columnsToUse.map(col => col.header)],
          body: rightRows,
          startY: tableStartY,
          margin: { left: margin + colWidth + spacing },
          tableWidth: colWidth,
          styles: { overflow: 'linebreak', cellPadding: 1 },
          headStyles: { fillColor: [11, 18, 32] },
          columnStyles: columnStylesToUse,
          didParseCell: cellStylesParser
        });
      }

      // --- SIGNATURE FOOTER ---
      const finalY = (doc as any).lastAutoTable?.finalY || tableStartY + 20;
      doc.setDrawColor(220, 224, 230);
      doc.setLineWidth(0.2);
      doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(140, 140, 140);
      doc.text('ELITE FOOTBALL PERFORMANCE PRO • ÁREA BIOMÉDICA & PREPARACIÓN FÍSICA', margin, pageHeight - 8);
      doc.text(`EXPORTADO EL ${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`, pageWidth - margin - 42, pageHeight - 8);

      const isAllCategories = selectedCategories.length === Object.values(Category).length;
      const categorySlug = isAllCategories 
        ? 'todas' 
        : selectedCategories.map(c => c.toLowerCase().replace(/_/g, '-')).join('-');
      const fileName = view === 'pse' 
        ? `reporte-pse-${categorySlug}-${selectedDate}.pdf` 
        : `reporte-wellness-${categorySlug}-${selectedDate}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error("Error al descargar PDF:", err);
      alert(`Hubo un error al generar el PDF del reporte de ${view === 'pse' ? 'carga interna' : 'bienestar'}.`);
    } finally {
      setExportingWellness(false);
    }
  };

  const downloadWellnessReportJPG = async () => {
    setExportingWellness(true);
    try {
      const container = document.getElementById('wellness-report-container');
      if (!container) throw new Error("Contenedor del reporte no encontrado");

      // Capturamos el contenedor con nitidez premium
      const canvas = await html2canvas(container, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const isAllCategories = selectedCategories.length === Object.values(Category).length;
      const categorySlug = isAllCategories 
        ? 'todas' 
        : selectedCategories.map(c => c.toLowerCase().replace(/_/g, '-')).join('-');
      const fileName = view === 'pse' 
        ? `reporte-pse-${categorySlug}-${selectedDate}.jpg` 
        : `reporte-wellness-${categorySlug}-${selectedDate}.jpg`;

      const link = document.createElement('a');
      link.href = imgData;
      link.download = fileName;
      link.click();
    } catch (err) {
      console.error("Error al descargar JPG:", err);
      alert(`Hubo un error al generar la imagen JPG de ${view === 'pse' ? 'carga interna' : 'bienestar'}.`);
    } finally {
      setExportingWellness(false);
    }
  };

  const averages = useMemo(() => {
    let fatigueSum = 0, fatigueCount = 0;
    let sleepSum = 0, sleepCount = 0;
    let sorenessSum = 0, sorenessCount = 0;
    let stressSum = 0, stressCount = 0;
    let moodSum = 0, moodCount = 0;
    let avgSum = 0, avgCount = 0;
    
    let durationSum = 0, durationCount = 0;
    let rpeSum = 0, rpeCount = 0;
    let loadSum = 0, loadCount = 0;

    unifiedList.forEach(row => {
      if (row.wellness) {
        const fatVal = Number(row.wellness.fatigue);
        if (!isNaN(fatVal) && row.wellness.fatigue !== null && row.wellness.fatigue !== undefined) {
          fatigueSum += fatVal;
          fatigueCount++;
        }
        const sleepVal = Number(row.wellness.sleep);
        if (!isNaN(sleepVal) && row.wellness.sleep !== null && row.wellness.sleep !== undefined) {
          sleepSum += sleepVal;
          sleepCount++;
        }
        const soreVal = Number(row.wellness.soreness);
        if (!isNaN(soreVal) && row.wellness.soreness !== null && row.wellness.soreness !== undefined) {
          sorenessSum += soreVal;
          sorenessCount++;
        }
        const stressVal = Number(row.wellness.stress);
        if (!isNaN(stressVal) && row.wellness.stress !== null && row.wellness.stress !== undefined) {
          stressSum += stressVal;
          stressCount++;
        }
        const moodVal = Number(row.wellness.mood);
        if (!isNaN(moodVal) && row.wellness.mood !== null && row.wellness.mood !== undefined) {
          moodSum += moodVal;
          moodCount++;
        }
        if (!isNaN(fatVal) && !isNaN(sleepVal) && !isNaN(moodVal)) {
          const rowAvg = (fatVal + sleepVal + moodVal) / 3;
          avgSum += rowAvg;
          avgCount++;
        }
      }

      if (row.load) {
        const durVal = Number(row.load.duration);
        if (!isNaN(durVal) && durVal > 0 && row.load.duration !== null && row.load.duration !== undefined) {
          durationSum += durVal;
          durationCount++;
        }
        const rpeVal = Number(row.load.rpe);
        if (!isNaN(rpeVal) && rpeVal > 0 && row.load.rpe !== null && row.load.rpe !== undefined) {
          rpeSum += rpeVal;
          rpeCount++;
        }
        const loadVal = Number(row.load.load);
        if (!isNaN(loadVal) && loadVal > 0 && row.load.load !== null && row.load.load !== undefined) {
          loadSum += loadVal;
          loadCount++;
        }
      }
    });

    return {
      fatigueNum: fatigueCount > 0 ? fatigueSum / fatigueCount : null,
      sleepNum: sleepCount > 0 ? sleepSum / sleepCount : null,
      sorenessNum: sorenessCount > 0 ? sorenessSum / sorenessCount : null,
      stressNum: stressCount > 0 ? stressSum / stressCount : null,
      moodNum: moodCount > 0 ? moodSum / moodCount : null,
      avgNum: avgCount > 0 ? avgSum / avgCount : null,
      durationNum: durationCount > 0 ? Math.round(durationSum / durationCount) : null,
      rpeNum: rpeCount > 0 ? rpeSum / rpeCount : null,
      loadNum: loadCount > 0 ? Math.round(loadSum / loadCount) : null,
    };
  }, [unifiedList]);

  let currentPageNum = 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 print:space-y-0">
      
      {/* 1. HEADER INSTITUCIONAL (Global) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 print:hidden bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">ÁREA FÍSICA <span className="text-red-500">LR</span></h2>
            <div className="bg-red-50 px-3 py-1 rounded-lg border border-red-100">
               <span className="text-[9px] font-black text-red-600 uppercase tracking-widest">Live Sync v2.0</span>
            </div>
          </div>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest italic opacity-70">Monitoreo dinámico de rendimiento institucional</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Botón negro removido por redundancia con el rojo en reporte */}
        </div>
      </div>

      {/* 2. SELECTOR DE PESTAÑAS (Global) - REMOVIDO POR SIDEBAR */}
      {/* <div className="bg-white/50 p-1.5 rounded-[24px] border border-slate-100 flex items-center gap-2 max-w-fit shadow-sm overflow-x-auto print:hidden"> ... </div> */}

      {/* 3. BARRA DE FILTROS UNIFICADA (Global) */}
      <div className="bg-white rounded-[32px] md:rounded-[40px] p-6 md:p-8 border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-end print:hidden">
        <div className="md:col-span-2 space-y-2">
          <label className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 italic block">Selección de Fecha</label>
          <input 
            type="date" 
            className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl px-4 md:px-5 py-3 md:py-4 text-[10px] md:text-xs font-black outline-none focus:ring-4 focus:ring-red-500/10 shadow-inner transition-all appearance-none" 
            value={selectedDate} 
            onChange={e => setSelectedDate(e.target.value)} 
          />
        </div>
        <div className="md:col-span-3 space-y-2 relative">
          <label className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 italic block">Categoría Oficial</label>
          <button 
            onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
            className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl px-4 md:px-5 py-3 md:py-4 text-[10px] md:text-xs font-black outline-none shadow-inner focus:ring-4 focus:ring-slate-100 transition-all flex justify-between items-center text-left"
          >
            <span className="truncate">
              {selectedCategories.length === Object.values(Category).length ? 'TODAS LAS CATEGORÍAS' : selectedCategories.map(c => c.replace('SUB_', 'SUB ')).join(', ')}
            </span>
            <i className={`fa-solid fa-chevron-down text-slate-300 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''} text-[10px]`}></i>
          </button>
          
          {showCategoryDropdown && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-200 max-h-60 overflow-y-auto">
              <button
                onClick={() => {
                  if (selectedCategories.length === Object.values(Category).length) {
                    setSelectedCategories([Category.SUB_17]); // Default to one if unselecting all
                  } else {
                    setSelectedCategories(Object.values(Category));
                  }
                  setShowCategoryDropdown(false);
                }}
                className={`p-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-left transition-all flex justify-between items-center ${selectedCategories.length === Object.values(Category).length ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                TODAS LAS CATEGORÍAS
                {selectedCategories.length === Object.values(Category).length && <i className="fa-solid fa-check"></i>}
              </button>
              {Object.values(Category).map(cat => {
                const isSelected = selectedCategories.length === 1 && selectedCategories[0] === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategories([cat]);
                      setShowCategoryDropdown(false);
                    }}
                    className={`p-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-left transition-all flex justify-between items-center ${isSelected ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    {cat.toUpperCase().replace('_', ' ')}
                    {isSelected && <i className="fa-solid fa-check"></i>}
                  </button>
                )
              })}
            </div>
          )}
        </div>
        {activeMainTab !== 'reporte_diario' && (
          <div className="md:col-span-4 space-y-2">
            <label className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 italic block">Buscador Global de Atleta</label>
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-4 md:left-5 top-1/2 -translate-y-1/2 text-slate-300 text-[10px] md:text-xs"></i>
              <input 
                type="text" 
                placeholder="Nombre, apellido, club..." 
                className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl px-10 md:px-12 py-3 md:py-4 text-[10px] md:text-xs font-black outline-none focus:ring-4 focus:ring-red-500/10 shadow-inner transition-all" 
                value={athleteSearch} 
                onChange={e => setAthleteSearch(e.target.value)} 
              />
            </div>
          </div>
        )}
        <div className="md:col-span-3">
          {activeMicrocycle ? (
            <div className="bg-[#0b1220] border border-white/5 p-3 md:p-4 rounded-2xl md:rounded-3xl flex items-center justify-between shadow-xl h-[48px] md:h-[54px]">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-7 h-7 md:w-8 md:h-8 bg-red-600 rounded-lg md:rounded-xl flex items-center justify-center text-white text-[9px] md:text-[10px] shadow-lg">
                  <i className="fa-solid fa-calendar-check"></i>
                </div>
                <div>
                  <p className="text-[7px] md:text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-0.5">MICROCICLO ACTIVO</p>
                  <p className="text-[10px] md:text-[11px] font-black text-white italic truncate w-24 md:w-32 uppercase leading-none">{activeMicrocycle.city}</p>
                </div>
              </div>
              <div className="text-right pr-1 md:pr-2">
                <p className="text-[7px] md:text-[8px] font-bold text-red-500 uppercase tracking-widest leading-none mb-0.5">CITADOS</p>
                <p className="text-xs md:text-sm font-black text-white italic leading-none">{citedPlayerIds.length}</p>
              </div>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-100 p-3 md:p-4 rounded-2xl md:rounded-3xl flex items-center gap-2 md:gap-3 h-[48px] md:h-[54px] justify-center">
              <i className="fa-solid fa-triangle-exclamation text-red-500 text-[10px] md:text-xs"></i>
              <p className="text-[8px] md:text-[9px] font-black text-red-600 uppercase tracking-tight leading-none">SIN MICROCICLO ACTIVO</p>
            </div>
          )}
        </div>
      </div>

      {/* 4. CONTENIDO DINÁMICO SEGÚN PESTAÑA */}
      {activeMainTab === 'carga_interna' && (
        <div className="space-y-6 animate-in fade-in duration-300 print:hidden">
          
          {/* SUMMARY CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* CHECK-IN CARD */}
            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-xl shadow-inner">
                  <i className="fa-solid fa-user-check"></i>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Check-in</p>
                  <p className="text-xl font-black text-slate-900 italic uppercase tracking-tighter">
                    {stats.checkInDone} / {currentCitadosPlayers.length}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-1">Pendientes</p>
                <p className="text-lg font-black text-slate-300 italic leading-none">{stats.checkInPending}</p>
              </div>
            </div>

            {/* CHECK-OUT CARD */}
            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-xl shadow-inner">
                  <i className="fa-solid fa-user-clock"></i>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Check-out</p>
                  {availableSessionIndexes.length > 1 && !unifySessions ? (
                    <div className="flex flex-col gap-1.5 mt-1 text-xs font-black text-slate-900 italic uppercase tracking-tighter">
                      {availableSessionIndexes.map(sIdx => {
                        const done = stats.checkOutsBySession[sIdx] || 0;
                        return (
                          <div key={sIdx} className="flex items-center gap-1.5">
                            <span className="text-[8px] bg-blue-100 text-blue-700 font-bold px-1 rounded uppercase tracking-wider">S{sIdx}</span>
                            <span>{done} / {currentCitadosPlayers.length}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div>
                      <p className="text-xl font-black text-slate-900 italic uppercase tracking-tighter">
                        {stats.checkOutDone} / {currentCitadosPlayers.length}
                      </p>
                      {availableSessionIndexes.length > 1 && unifySessions && (
                        <p className="text-[8px] text-slate-400 font-bold mt-0.5 tracking-wider uppercase">
                          S1: {stats.checkOutsBySession[1] || 0} • S2: {stats.checkOutsBySession[2] || 0}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest mb-1">Pendientes</p>
                {availableSessionIndexes.length > 1 && !unifySessions ? (
                  <div className="flex flex-col gap-1.5 mt-1 text-sm font-black text-slate-300 italic leading-none">
                    {availableSessionIndexes.map(sIdx => {
                      const done = stats.checkOutsBySession[sIdx] || 0;
                      const pending = currentCitadosPlayers.length - done;
                      return (
                        <div key={sIdx} className="h-[15px] flex items-center justify-end">
                          <span>{pending}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-lg font-black text-slate-300 italic leading-none">{stats.checkOutPending}</p>
                )}
              </div>
            </div>

            {/* SORENESS CARD */}
            <div className={`p-6 rounded-[32px] border shadow-sm flex items-center justify-between group hover:shadow-md transition-all ${stats.sorenessAlerts > 0 ? 'bg-red-50 border-red-100' : 'bg-white border-slate-100'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner ${stats.sorenessAlerts > 0 ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-50 text-slate-300'}`}>
                  <i className="fa-solid fa-face-frown"></i>
                </div>
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-widest leading-none mb-1 ${stats.sorenessAlerts > 0 ? 'text-red-600' : 'text-slate-400'}`}>Zona Molestia</p>
                  <p className="text-xl font-black text-slate-900 italic uppercase tracking-tighter">
                    {stats.sorenessAlerts} ALERTAS
                  </p>
                </div>
              </div>
              {stats.sorenessAlerts > 0 && (
                <div className="w-2 h-2 bg-red-600 rounded-full animate-ping"></div>
              )}
            </div>

            {/* HEALTH CARD */}
            <div className={`p-6 rounded-[32px] border shadow-sm flex items-center justify-between group hover:shadow-md transition-all ${stats.healthAlerts > 0 ? 'bg-amber-50 border-amber-100' : 'bg-white border-slate-100'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner ${stats.healthAlerts > 0 ? 'bg-amber-500 text-white animate-pulse' : 'bg-slate-50 text-slate-300'}`}>
                  <i className="fa-solid fa-shield-halved"></i>
                </div>
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-widest leading-none mb-1 ${stats.healthAlerts > 0 ? 'text-amber-600' : 'text-slate-400'}`}>Estado Salud</p>
                  <p className="text-xl font-black text-slate-900 italic uppercase tracking-tighter">
                    {stats.healthAlerts} ALERTAS
                  </p>
                </div>
              </div>
              {stats.healthAlerts > 0 && (
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-ping"></div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-2 gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] italic flex items-center gap-2">
                <i className="fa-solid fa-clipboard-list text-red-600"></i> CONTROL DETALLADO ({unifiedList.length})
              </h3>
              {availableSessionIndexes.length > 1 && (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex bg-slate-100 p-1 rounded-xl max-w-fit print:hidden">
                    <button
                      onClick={() => !unifySessions && setSelectedSessionFilter('all')}
                      disabled={unifySessions}
                      className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${unifySessions ? 'opacity-40 cursor-not-allowed text-slate-400' : selectedSessionFilter === 'all' ? 'bg-[#0b1220] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                      title={unifySessions ? "Desactiva 'Unificar Jornada' para filtrar por sesión" : "Ver todas las sesiones desglosadas"}
                    >
                      Todas
                    </button>
                    {availableSessionIndexes.map(sIdx => (
                      <button
                        key={sIdx}
                        onClick={() => !unifySessions && setSelectedSessionFilter(sIdx.toString())}
                        disabled={unifySessions}
                        className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${unifySessions ? 'opacity-40 cursor-not-allowed text-slate-400' : selectedSessionFilter === sIdx.toString() ? 'bg-[#0b1220] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                        title={unifySessions ? "Desactiva 'Unificar Jornada' para filtrar por sesión" : `Ver Sesión ${sIdx}`}
                      >
                        Sesión {sIdx}
                      </button>
                    ))}
                  </div>

                  <label className="flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-100 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-red-100 cursor-pointer transition-all select-none print:hidden shadow-sm">
                    <input
                      type="checkbox"
                      checked={unifySessions}
                      onChange={(e) => {
                        setUnifySessions(e.target.checked);
                        if (e.target.checked) {
                          setSelectedSessionFilter('all');
                        }
                      }}
                      className="rounded border-red-300 text-red-600 focus:ring-red-500 w-3 h-3 cursor-pointer"
                    />
                    <span>Unificar Jornada</span>
                  </label>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 print:hidden">
              <button
                type="button"
                onClick={downloadWellnessReportPDF}
                disabled={exportingWellness}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all active:scale-95 duration-200"
              >
                <i className="fa-solid fa-file-pdf"></i>
                {exportingWellness ? 'PDF...' : 'Descargar PDF'}
              </button>
              <button
                type="button"
                onClick={downloadWellnessReportJPG}
                disabled={exportingWellness}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all active:scale-95 duration-200"
              >
                <i className="fa-solid fa-image"></i>
                {exportingWellness ? 'JPG...' : 'Descargar JPG'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[32px] md:rounded-[40px] border border-slate-100 shadow-xl overflow-hidden overflow-x-auto">
            <table className="w-full text-center min-w-full md:min-w-[1000px] border-separate border-spacing-y-2 px-1 md:px-4">
              <thead className="bg-[#0b1220] text-white font-black uppercase text-[8px] md:text-[10px]">
                <tr>
                  <th className="px-2 md:px-8 py-3 md:py-5 text-left first:rounded-l-2xl group cursor-pointer" onClick={() => { setSortField('name'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                    <div className="flex items-center gap-1">
                      Atleta
                      <div className="flex flex-col opacity-30 group-hover:opacity-100 transition-opacity">
                        <i className={`fa-solid fa-caret-up leading-none text-[8px] ${sortField === 'name' && sortDirection === 'asc' ? 'text-red-500 opacity-100' : ''}`}></i>
                        <i className={`fa-solid fa-caret-down leading-none text-[8px] ${sortField === 'name' && sortDirection === 'desc' ? 'text-red-500 opacity-100' : ''}`}></i>
                      </div>
                    </div>
                  </th>
                  {(view === 'wellness' || view === 'report') && (
                    <>
                      <th className="px-1 py-3 md:py-5 group cursor-pointer" onClick={() => { setSortField('fatigue'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                        <div className="flex flex-col items-center gap-1">
                          Fat
                          <div className="flex gap-1 opacity-10 group-hover:opacity-100 transition-opacity">
                            <i className={`fa-solid fa-caret-up ${sortField === 'fatigue' && sortDirection === 'asc' ? 'text-red-500 opacity-100' : ''}`}></i>
                            <i className={`fa-solid fa-caret-down ${sortField === 'fatigue' && sortDirection === 'desc' ? 'text-red-500 opacity-100' : ''}`}></i>
                          </div>
                        </div>
                      </th>
                      <th className="px-1 py-3 md:py-5 group cursor-pointer" onClick={() => { setSortField('sleep'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                        <div className="flex flex-col items-center gap-1">
                          Sue
                          <div className="flex gap-1 opacity-10 group-hover:opacity-100 transition-opacity">
                            <i className={`fa-solid fa-caret-up ${sortField === 'sleep' && sortDirection === 'asc' ? 'text-red-500 opacity-100' : ''}`}></i>
                            <i className={`fa-solid fa-caret-down ${sortField === 'sleep' && sortDirection === 'desc' ? 'text-red-500 opacity-100' : ''}`}></i>
                          </div>
                        </div>
                      </th>
                      <th className="px-1 py-3 md:py-5 group cursor-pointer" onClick={() => { setSortField('soreness'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                        <div className="flex flex-col items-center gap-1">
                          Dol
                          <div className="flex gap-1 opacity-10 group-hover:opacity-100 transition-opacity">
                            <i className={`fa-solid fa-caret-up ${sortField === 'soreness' && sortDirection === 'asc' ? 'text-red-500 opacity-100' : ''}`}></i>
                            <i className={`fa-solid fa-caret-down ${sortField === 'soreness' && sortDirection === 'desc' ? 'text-red-500 opacity-100' : ''}`}></i>
                          </div>
                        </div>
                      </th>
                      <th className="px-1 py-3 md:py-5 hidden sm:table-cell group cursor-pointer" onClick={() => { setSortField('stress'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                        <div className="flex flex-col items-center gap-1">
                          Est
                          <div className="flex gap-1 opacity-10 group-hover:opacity-100 transition-opacity">
                            <i className={`fa-solid fa-caret-up ${sortField === 'stress' && sortDirection === 'asc' ? 'text-red-500 opacity-100' : ''}`}></i>
                            <i className={`fa-solid fa-caret-down ${sortField === 'stress' && sortDirection === 'desc' ? 'text-red-500 opacity-100' : ''}`}></i>
                          </div>
                        </div>
                      </th>
                      <th className="px-1 py-3 md:py-5 hidden sm:table-cell group cursor-pointer" onClick={() => { setSortField('mood'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                        <div className="flex flex-col items-center gap-1">
                          Áni
                          <div className="flex gap-1 opacity-10 group-hover:opacity-100 transition-opacity">
                            <i className={`fa-solid fa-caret-up ${sortField === 'mood' && sortDirection === 'asc' ? 'text-red-500 opacity-100' : ''}`}></i>
                            <i className={`fa-solid fa-caret-down ${sortField === 'mood' && sortDirection === 'desc' ? 'text-red-500 opacity-100' : ''}`}></i>
                          </div>
                        </div>
                      </th>
                      <th className="px-1 py-3 md:py-5 group cursor-pointer" onClick={() => { setSortField('avg'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                        <div className="flex flex-col items-center gap-1">
                          Prom
                          <div className="flex gap-1 opacity-10 group-hover:opacity-100 transition-opacity">
                            <i className={`fa-solid fa-caret-up ${sortField === 'avg' && sortDirection === 'asc' ? 'text-red-500 opacity-100' : ''}`}></i>
                            <i className={`fa-solid fa-caret-down ${sortField === 'avg' && sortDirection === 'desc' ? 'text-red-500 opacity-100' : ''}`}></i>
                          </div>
                        </div>
                      </th>
                      <th className="px-1 py-3 md:py-5 hidden lg:table-cell group cursor-pointer" onClick={() => { setSortField('soreness_areas'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                        <div className="flex flex-col items-center gap-1">
                          Zona Molestia
                          <div className="flex gap-1 opacity-10 group-hover:opacity-100 transition-opacity">
                            <i className={`fa-solid fa-arrow-down-a-z ${sortField === 'soreness_areas' && sortDirection === 'asc' ? 'text-red-500 opacity-100' : ''}`}></i>
                            <i className={`fa-solid fa-arrow-up-z-a ${sortField === 'soreness_areas' && sortDirection === 'desc' ? 'text-red-500 opacity-100' : ''}`}></i>
                          </div>
                        </div>
                      </th>
                      <th className="px-1 py-3 md:py-5 hidden lg:table-cell group cursor-pointer" onClick={() => { setSortField('health_status'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                        <div className="flex flex-col items-center gap-1">
                          Estado Salud
                          <div className="flex gap-1 opacity-10 group-hover:opacity-100 transition-opacity">
                            <i className={`fa-solid fa-arrow-down-a-z ${sortField === 'health_status' && sortDirection === 'asc' ? 'text-red-500 opacity-100' : ''}`}></i>
                            <i className={`fa-solid fa-arrow-up-z-a ${sortField === 'health_status' && sortDirection === 'desc' ? 'text-red-500 opacity-100' : ''}`}></i>
                          </div>
                        </div>
                      </th>
                    </>
                  )}
                  {(view === 'pse' || view === 'report') && (
                    <>
                      <th className="px-1 py-3 md:py-5 hidden sm:table-cell">Dur</th>
                      <th className="px-1 py-3 md:py-5 group cursor-pointer" onClick={() => { setSortField('rpe'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                        <div className="flex flex-col items-center gap-1">
                          RPE
                          <div className="flex gap-1 opacity-10 group-hover:opacity-100 transition-opacity">
                            <i className={`fa-solid fa-caret-up ${sortField === 'rpe' && sortDirection === 'asc' ? 'text-red-500 opacity-100' : ''}`}></i>
                            <i className={`fa-solid fa-caret-down ${sortField === 'rpe' && sortDirection === 'desc' ? 'text-red-500 opacity-100' : ''}`}></i>
                          </div>
                        </div>
                      </th>
                      <th className="px-1 py-3 md:py-5 group cursor-pointer" onClick={() => { setSortField('load'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                        <div className="flex flex-col items-center gap-1">
                          Carga
                          <div className="flex gap-1 opacity-10 group-hover:opacity-100 transition-opacity">
                            <i className={`fa-solid fa-caret-up ${sortField === 'load' && sortDirection === 'asc' ? 'text-red-500 opacity-100' : ''}`}></i>
                            <i className={`fa-solid fa-caret-down ${sortField === 'load' && sortDirection === 'desc' ? 'text-red-500 opacity-100' : ''}`}></i>
                          </div>
                        </div>
                      </th>
                      <th className="px-1 py-3 md:py-5 hidden lg:table-cell group cursor-pointer" onClick={() => { setSortField('pse_molestias'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                        <div className="flex flex-col items-center gap-1">
                          Molestias
                          <div className="flex gap-1 opacity-10 group-hover:opacity-100 transition-opacity">
                            <i className={`fa-solid fa-arrow-down-a-z ${sortField === 'pse_molestias' && sortDirection === 'asc' ? 'text-red-500 opacity-100' : ''}`}></i>
                            <i className={`fa-solid fa-arrow-up-z-a ${sortField === 'pse_molestias' && sortDirection === 'desc' ? 'text-red-500 opacity-100' : ''}`}></i>
                          </div>
                        </div>
                      </th>
                      <th className="px-1 py-3 md:py-5 hidden lg:table-cell group cursor-pointer" onClick={() => { setSortField('pse_enfermedad'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                        <div className="flex flex-col items-center gap-1">
                          Enfermedad
                          <div className="flex gap-1 opacity-10 group-hover:opacity-100 transition-opacity">
                            <i className={`fa-solid fa-arrow-down-a-z ${sortField === 'pse_enfermedad' && sortDirection === 'asc' ? 'text-red-500 opacity-100' : ''}`}></i>
                            <i className={`fa-solid fa-arrow-up-z-a ${sortField === 'pse_enfermedad' && sortDirection === 'desc' ? 'text-red-500 opacity-100' : ''}`}></i>
                          </div>
                        </div>
                      </th>
                    </>
                  )}
                  <th className="px-2 md:px-8 py-3 md:py-5 text-right last:rounded-r-2xl">Status</th>
                </tr>
              </thead>
              <tbody className="">
                {unifiedList.map((row, idx) => {
                  const isPending = view === 'wellness' 
                    ? !row.wellness 
                    : view === 'pse' 
                      ? !row.load 
                      : !row.hasReported;
                  const avg = row.wellness ? (row.wellness.fatigue + row.wellness.sleep + row.wellness.mood) / 3 : 0;
                  
                  const isHighlighted = highlightPlayerId && Number(row.player.player_id) === Number(highlightPlayerId);
                  
                  return (
                    <tr key={idx} className={`transition-all font-black uppercase italic text-[8px] md:text-xs shadow-sm hover:scale-[1.01] hover:shadow-md ${isHighlighted ? 'bg-blue-50 ring-2 ring-blue-500' : isPending ? 'bg-slate-50/50 text-slate-300' : (row.player && normalizeClub(row.player.club_name || row.player.club || '') === normalizeClub(userClub || '') ? 'bg-slate-100/80 hover:bg-slate-100' : 'bg-white hover:bg-slate-50 text-slate-900')} rounded-2xl overflow-hidden`}>
                      <td className={`px-2 md:px-8 py-3 md:py-5 text-left rounded-l-2xl ${isHighlighted ? 'bg-blue-50' : ''}`}>
                        <div className="flex flex-col min-w-[70px]">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate max-w-[80px] md:max-w-none">{row.player.name}</span>
                            {availableSessionIndexes.length > 1 && (
                              <span className="bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded text-[7px] md:text-[8px] uppercase tracking-wider leading-none">
                                {unifySessions && row.sessionCount > 1 
                                  ? `S${row.allSessionIndexes.join('+')}` 
                                  : `S${row.sessionIndex}`}
                              </span>
                            )}
                          </div>
                          <div className="hidden md:block">
                            <ClubBadge 
                              clubName={row.player.club_name || row.player.club} 
                              idClub={row.player.id_club}
                              clubs={clubs}
                              className="mt-0.5"
                              logoSize="w-3 h-3"
                              showName={true}
                            />
                          </div>
                        </div>
                      </td>
                      
                      {(view === 'wellness' || view === 'report') && (
                        <>
                          <td className="px-1 py-3 md:py-5">
                            {row.wellness ? <span className={`w-6 md:w-8 h-6 md:h-8 flex items-center justify-center mx-auto rounded-lg text-[7px] md:text-[10px] ${getScoreColor(row.wellness.fatigue)}`}>{row.wellness.fatigue}</span> : '-'}
                          </td>
                          <td className="px-1 py-3 md:py-5">
                            {row.wellness ? <span className={`w-6 md:w-8 h-6 md:h-8 flex items-center justify-center mx-auto rounded-lg text-[7px] md:text-[10px] ${getScoreColor(row.wellness.sleep)}`}>{row.wellness.sleep}</span> : '-'}
                          </td>
                          <td className="px-1 py-3 md:py-5">
                            {row.wellness ? <span className={`w-6 md:w-8 h-6 md:h-8 flex items-center justify-center mx-auto rounded-lg text-[7px] md:text-[10px] ${getScoreColor(row.wellness.soreness)}`}>{row.wellness.soreness}</span> : '-'}
                          </td>
                          <td className="px-1 py-3 md:py-5 hidden sm:table-cell">
                            {row.wellness ? <span className={`w-8 h-8 flex items-center justify-center mx-auto rounded-lg ${getScoreColor(row.wellness.stress)}`}>{row.wellness.stress}</span> : '-'}
                          </td>
                          <td className="px-1 py-3 md:py-5 hidden sm:table-cell">
                            {row.wellness ? <span className={`w-8 h-8 flex items-center justify-center mx-auto rounded-lg ${getScoreColor(row.wellness.mood)}`}>{row.wellness.mood}</span> : '-'}
                          </td>
                          <td className="px-1 py-3 md:py-5">
                            {row.wellness ? <span className="font-black text-slate-900">{avg.toFixed(1)}</span> : '-'}
                          </td>
                          <td className="px-1 py-3 md:py-5 hidden lg:table-cell">
                            {row.wellness?.soreness_areas && row.wellness.soreness_areas.length > 0 ? (
                              <div className="flex flex-wrap gap-1 justify-center">
                                {row.wellness.soreness_areas.map((area, i) => (
                                  <span key={i} className="bg-red-100 text-red-600 px-1.5 md:px-2 py-0.5 rounded text-[8px] md:text-[9px] font-bold uppercase">{area}</span>
                                ))}
                              </div>
                            ) : (
                              !isPending && <span className="text-slate-300 text-[9px] md:text-[10px] font-bold uppercase">SIN DOLOR</span>
                            )}
                          </td>
                          <td className="px-1 py-3 md:py-5 hidden lg:table-cell">
                            {row.wellness?.illness_symptoms && row.wellness.illness_symptoms.length > 0 ? (
                              <div className="flex flex-wrap gap-1 justify-center">
                                {row.wellness.illness_symptoms.map((sym, i) => (
                                  <span key={i} className="bg-red-100 text-red-600 px-1.5 md:px-2 py-0.5 rounded text-[8px] md:text-[9px] font-bold uppercase">{sym}</span>
                                ))}
                              </div>
                            ) : (
                              !isPending && <span className="text-emerald-500 text-[9px] md:text-[10px] font-bold uppercase">SANO</span>
                            )}
                          </td>
                        </>
                      )}

                      {(view === 'pse' || view === 'report') && (
                        <>
                          <td className="px-1 py-3 md:py-5 hidden sm:table-cell">{row.load?.duration || '-'}</td>
                          <td className="px-1 py-3 md:py-5 text-center text-sm md:text-lg">
                            {row.load?.rpe ? (
                              <span 
                                className="inline-flex items-center justify-center w-8 h-8 rounded-full shadow-sm text-xs md:text-sm text-white font-black"
                                style={getRpeStyle(row.load.rpe)}
                              >
                                {row.load.rpe}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-1 py-3 md:py-5 text-center">
                            {row.load?.load ? (
                              <span 
                                className="inline-flex items-center justify-center px-2 py-1 min-w-[54px] rounded-lg shadow-sm text-[10px] md:text-xs text-white font-black"
                                style={getCargaStyle(row.load.load)}
                              >
                                {row.load.load}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-1 py-3 md:py-5 hidden lg:table-cell">
                            {row.load?.molestias ? (
                              <span className="bg-red-100 text-red-600 px-2 py-1 rounded-lg text-[10px] font-black uppercase max-w-[100px] truncate block mx-auto" title={row.load.molestias}>
                                {row.load.molestias}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-1 py-3 md:py-5 hidden lg:table-cell">
                            {row.load?.enfermedad ? (
                              <span className="bg-red-100 text-red-600 px-2 py-1 rounded-lg text-[10px] font-black uppercase max-w-[100px] truncate block mx-auto" title={row.load.enfermedad}>
                                {row.load.enfermedad}
                              </span>
                            ) : '-'}
                          </td>
                        </>
                      )}

                      <td className="px-2 md:px-8 py-3 md:py-5 text-right rounded-r-2xl">
                        {isPending ? (
                          <span className="text-slate-300 flex items-center justify-end gap-1"><i className="fa-solid fa-clock scale-75"></i> <span className="hidden xs:inline">PEN</span></span>
                        ) : (
                          <span className="text-emerald-500 flex items-center justify-end gap-1"><i className="fa-solid fa-check-double scale-75"></i> <span className="hidden xs:inline">OK</span></span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {/* FILA DE PROMEDIO GRUPAL */}
                {unifiedList.length > 0 && (
                  <tr className="transition-all font-black uppercase italic text-[8px] md:text-xs bg-[#0b1220] text-white rounded-2xl overflow-hidden border-2 border-red-500 shadow-md">
                    <td className="px-2 md:px-8 py-4 md:py-6 text-left rounded-l-2xl">
                      <div className="flex flex-col min-w-[70px]">
                        <div className="flex items-center gap-1.5">
                          <span className="text-red-500 text-[10px] md:text-sm font-black tracking-wider">PROMEDIO</span>
                        </div>
                        <div className="text-[7px] md:text-[9px] text-slate-400 font-bold not-italic normal-case">
                          Columnas Respondidas
                        </div>
                      </div>
                    </td>

                    {(view === 'wellness' || view === 'report') && (
                      <>
                        <td className="px-1 py-3 md:py-5">
                          {averages.fatigueNum !== null ? (
                            <span className="w-6 md:w-8 h-6 md:h-8 flex items-center justify-center mx-auto rounded-lg text-[8px] md:text-xs bg-slate-800 text-white font-black">
                              {averages.fatigueNum.toFixed(1)}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-1 py-3 md:py-5">
                          {averages.sleepNum !== null ? (
                            <span className="w-6 md:w-8 h-6 md:h-8 flex items-center justify-center mx-auto rounded-lg text-[8px] md:text-xs bg-slate-800 text-white font-black">
                              {averages.sleepNum.toFixed(1)}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-1 py-3 md:py-5">
                          {averages.sorenessNum !== null ? (
                            <span className="w-6 md:w-8 h-6 md:h-8 flex items-center justify-center mx-auto rounded-lg text-[8px] md:text-xs bg-slate-800 text-white font-black">
                              {averages.sorenessNum.toFixed(1)}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-1 py-3 md:py-5 hidden sm:table-cell">
                          {averages.stressNum !== null ? (
                            <span className="w-8 h-8 flex items-center justify-center mx-auto rounded-lg bg-slate-800 text-white font-black text-xs">
                              {averages.stressNum.toFixed(1)}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-1 py-3 md:py-5 hidden sm:table-cell">
                          {averages.moodNum !== null ? (
                            <span className="w-8 h-8 flex items-center justify-center mx-auto rounded-lg bg-slate-800 text-white font-black text-xs">
                              {averages.moodNum.toFixed(1)}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-1 py-3 md:py-5">
                          {averages.avgNum !== null ? (
                            <span className="font-black text-red-400 text-xs md:text-sm">
                              {averages.avgNum.toFixed(1)}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-1 py-3 md:py-5 hidden lg:table-cell text-slate-400">-</td>
                        <td className="px-1 py-3 md:py-5 hidden lg:table-cell text-slate-400">-</td>
                      </>
                    )}

                    {(view === 'pse' || view === 'report') && (
                      <>
                        <td className="px-1 py-3 md:py-5 hidden sm:table-cell text-center">
                          {averages.durationNum !== null ? (
                            <span className="font-black text-white text-xs md:text-sm">
                              {averages.durationNum} <span className="text-[8px] font-normal text-slate-400">min</span>
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-1 py-3 md:py-5 text-center">
                          {averages.rpeNum !== null ? (
                            <span 
                              className="inline-flex items-center justify-center w-8 h-8 rounded-full shadow-sm text-xs md:text-sm text-white font-black"
                              style={getRpeStyle(averages.rpeNum)}
                            >
                              {averages.rpeNum.toFixed(1)}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-1 py-3 md:py-5 text-center">
                          {averages.loadNum !== null ? (
                            <span 
                              className="inline-flex items-center justify-center px-3 py-1.5 min-w-[54px] rounded-lg shadow-sm text-[10px] md:text-xs text-white font-black"
                              style={getCargaStyle(averages.loadNum)}
                            >
                              {averages.loadNum}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-1 py-3 md:py-5 hidden lg:table-cell text-slate-400">-</td>
                        <td className="px-1 py-3 md:py-5 hidden lg:table-cell text-slate-400">-</td>
                      </>
                    )}

                    <td className="px-2 md:px-8 py-3 md:py-5 text-right rounded-r-2xl text-slate-400">
                      -
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* REPORTE DE WELLNESS DIARIO (DISEÑO PREMIUM EN UNA SOLA HOJA DE DOS GRUPOS EN FILAS SIMILARES) */}
          <div className="mt-12 space-y-4 font-sans focus-within:outline-none" style={{ pageBreakInside: 'avoid' }}>
            <div className="flex items-center justify-between px-2 print:hidden">
              <h4 className="text-xs font-black text-slate-400 DevOnly tracking-[0.2em] italic flex items-center gap-2">
                <i className="fa-solid fa-file-invoice text-[#02428c]"></i> VISTA PREVIA DE REPORTE PREMIUM (A4)
              </h4>
            </div>

            <div id="wellness-report-container" className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-xl relative overflow-hidden text-slate-800">
              {/* Cabecera Oficial Selección Nacional */}
              <div className="mb-8 border-b border-slate-200 pb-6">
                {/* Ribbon visual premium */}
                <div className="flex flex-col md:flex-row md:items-center min-h-[7rem] bg-[#1a2333] rounded-3xl overflow-hidden relative shadow-md mb-6 p-4 md:p-0">
                  {/* Título de Reporte con Clip Path */}
                  <div className="bg-[#02428c] h-full flex items-center pl-6 pr-12 py-4 md:py-0 md:absolute md:left-0 md:top-0 md:bottom-0 relative z-20 shadow-lg" style={{ clipPath: 'polygon(0 0, 90% 0, 100% 100%, 0% 100%)' }}>
                    <span className="text-md md:text-xl font-black text-white uppercase italic tracking-tighter whitespace-nowrap pr-4">
                      {view === 'pse' ? 'REPORTE DE CARGA INTERNA (PSE)' : 'REPORTE BIENESTAR FISIOLÓGICO'}
                    </span>
                  </div>
                  
                  {/* Cuña roja decorativa */}
                  <div className="hidden md:block bg-[#e2231a] h-full w-20 relative z-10 shadow-lg left-[24rem]" style={{ clipPath: 'polygon(25% 0, 100% 0, 75% 100%, 0% 100%)' }}></div>
                  
                  {/* Información de Identidad */}
                  <div className="flex-1 flex items-center gap-4 mt-4 md:mt-0 md:ml-[29rem] overflow-hidden relative z-30">
                    <div className="w-14 h-14 md:w-16 md:h-16 flex-shrink-0 flex items-center justify-center p-1.5 bg-white rounded-full shadow-md">
                      <img 
                        src={getDriveDirectLink(FEDERATION_LOGO)} 
                        alt="Logo Selección" 
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="h-10 w-[1.5px] bg-slate-700 flex-shrink-0"></div>
                    <div className="flex flex-col min-w-0">
                      <h2 className="text-sm md:text-base font-black text-white uppercase tracking-tighter leading-tight">
                        SELECCIÓN NACIONAL CHILE
                      </h2>
                      <span className="text-xs md:text-sm font-black text-red-500 uppercase tracking-tighter leading-tight">
                        {selectedCategories.length === Object.values(Category).length ? 'TODAS LAS CATEGORÍAS' : selectedCategories.map(c => c.replace('SUB_', 'SUB ')).join(', ').toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Grid de Metadatos del Microciclo */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-4 mt-4">
                  <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="w-2 h-2 rounded-full bg-[#02428c]"></div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">PROCESO / MICROCICLO</span>
                      <span className="text-xs font-black text-slate-800 uppercase tracking-tight mt-1.5 truncate">
                        {activeMicrocycle?.nombre_display || (activeMicrocycle ? `MICROCICLO #${activeMicrocycle.micro_number || activeMicrocycle.id}` : 'SIN MICROCICLO ACTIVO')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="w-2 h-2 rounded-full bg-red-600"></div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">FECHA DEL REPORTE</span>
                      <span className="text-xs font-black text-slate-800 tracking-tight mt-1.5">
                        {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">CIUDAD / UBICACIÓN</span>
                      <span className="text-xs font-black text-slate-800 uppercase tracking-tight mt-1.5 truncate">
                        {activeMicrocycle?.city ? `${activeMicrocycle.city}, ${activeMicrocycle.country || 'CHILE'}` : 'SANTIAGO, CHILE'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid de KPIs / Estadísticas Clave */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {/* KPI 1: Check-ins / Check-outs */}
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between shadow-sm">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                    {view === 'pse' ? 'CHECK-OUT COMPLETADOS' : 'CHECK-IN COMPLETADOS'}
                  </span>
                  <div className="my-3 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-[#02428c] leading-none">
                      {view === 'pse' ? stats.checkOutDone : stats.checkInDone}
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      / {currentCitadosPlayers.length}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-[#02428c] h-full rounded-full transition-all duration-500" 
                      style={{ width: `${currentCitadosPlayers.length > 0 ? ((view === 'pse' ? stats.checkOutDone : stats.checkInDone) / currentCitadosPlayers.length) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>

                {/* KPI 2: Alertas Dolor */}
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between shadow-sm">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">ALERTAS DOLOR MUSCULAR</span>
                  <div className="my-3 flex items-baseline gap-1">
                    <span className={`text-2xl font-black leading-none ${stats.sorenessAlerts > 0 ? 'text-red-500' : 'text-slate-800'}`}>
                      {stats.sorenessAlerts}
                    </span>
                    <span className="text-xs font-bold text-slate-400">caso(s)</span>
                  </div>
                  <span className={`text-[9px] font-black uppercase ${stats.sorenessAlerts > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                    {stats.sorenessAlerts > 0 ? 'Requieren fisioterapia' : 'Sin sobrecargas clínicas'}
                  </span>
                </div>

                {/* KPI 3: Alertas Salud */}
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between shadow-sm">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">ALERTAS ESTADO SALUD</span>
                  <div className="my-3 flex items-baseline gap-1">
                    <span className={`text-2xl font-black leading-none ${stats.healthAlerts > 0 ? 'text-amber-500' : 'text-slate-800'}`}>
                      {stats.healthAlerts}
                    </span>
                    <span className="text-xs font-bold text-slate-400">caso(s)</span>
                  </div>
                  <span className={`text-[9px] font-black uppercase ${stats.healthAlerts > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
                    {stats.healthAlerts > 0 ? 'Requieren evaluación médica' : 'Plantel en óptimo estado'}
                  </span>
                </div>

                {/* KPI 4: Promedio Bienestar / Carga Promedio */}
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between shadow-sm">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                    {view === 'pse' ? 'CARGA PROMEDIO JORNADA' : 'PROMEDIO BIENESTAR'}
                  </span>
                  <div className="my-3 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-emerald-600 leading-none">
                      {view === 'pse' ? (
                        (() => {
                          let sumLoads = 0;
                          let countLoads = 0;
                          unifiedList.forEach(item => {
                            if (item.load?.load) {
                              sumLoads += Number(item.load.load);
                              countLoads++;
                            }
                          });
                          return countLoads > 0 ? (sumLoads / countLoads).toFixed(0) : '—';
                        })()
                      ) : wellnessDayAvg}
                    </span>
                    <span className="text-xs font-bold text-slate-400">{view === 'pse' ? 'u.a.' : '/ 5.0'}</span>
                  </div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none">
                    {view === 'pse' ? 'Intensidad x Duración media' : 'Puntuación general del día'}
                  </span>
                </div>
              </div>

              {/* LISTADO DE DOS COLUMNAS PARALELAS */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {/* Columna Izquierda */}
                <div className="border border-slate-100 rounded-3xl p-4 bg-white shadow-sm overflow-x-auto">
                  <table className="w-full text-left text-[9px]">
                    <thead>
                      {view === 'pse' ? (
                        <tr className="border-b border-slate-100 text-[8px] text-slate-400 font-black uppercase tracking-wider">
                          <th className="pb-2">ATLETA</th>
                          <th className="pb-2 text-center">DUR</th>
                          <th className="pb-2 text-center">RPE</th>
                          <th className="pb-2 text-center">CARGA</th>
                          <th className="pb-2 pl-2 text-left">MOLESTIA / ENFERMEDAD</th>
                          <th className="pb-2 text-center">CHECK</th>
                        </tr>
                      ) : (
                        <tr className="border-b border-slate-100 text-[8px] text-slate-400 font-black uppercase tracking-wider">
                          <th className="pb-2">ATLETA</th>
                          <th className="pb-2 text-center">FAT</th>
                          <th className="pb-2 text-center">SUE</th>
                          <th className="pb-2 text-center">DOL</th>
                          <th className="pb-2 text-center">EST</th>
                          <th className="pb-2 text-center">ÁNI</th>
                          <th className="pb-2 text-center font-black">PROM</th>
                          <th className="pb-2 pl-2">ZONA MOLESTIA / SÍNTOMAS</th>
                          <th className="pb-2 text-center">CHECK</th>
                        </tr>
                      )}
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {leftWellnessList.map((row, idx) => {
                        const isPending = view === 'pse' ? !row.load : !row.wellness;
                        const avgValue = row.wellness ? ((row.wellness.fatigue + row.wellness.sleep + row.wellness.mood) / 3).toFixed(1) : '-';
                        const hasPseAlert = row.load && (row.load.molestias || row.load.enfermedad);
                        const hasWellnessAlert = row.wellness && (
                          (row.wellness.soreness_areas && row.wellness.soreness_areas.length > 0) ||
                          (row.wellness.illness_symptoms && row.wellness.illness_symptoms.length > 0)
                        );
                        return (
                          <tr key={`left-well-${idx}`} className={`hover:bg-slate-50/50 transition-all ${isPending ? 'opacity-40' : ''}`}>
                            <td className="py-2.5 font-bold text-slate-800">
                              <span className="block font-black uppercase text-[10px]">{row.player?.name}</span>
                              <span className="text-[7.5px] uppercase tracking-wider text-slate-400 font-bold leading-none">{row.player?.club_name || row.player?.club || 'SIN CLUB'}</span>
                            </td>
                            {view === 'pse' ? (
                              <>
                                <td className="py-2.5 text-center font-black">
                                  {row.load?.duration ? `${row.load.duration}` : '-'}
                                </td>
                                <td className="py-2.5 text-center">
                                  {row.load?.rpe ? (
                                    <span 
                                      className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[8.5px] text-black font-black"
                                      style={getRpeStyle(row.load.rpe)}
                                    >
                                      {row.load.rpe}
                                    </span>
                                  ) : '-'}
                                </td>
                                <td className="py-2.5 text-center">
                                  {row.load?.load ? (
                                    <span 
                                      className="inline-flex items-center justify-center px-1.5 py-0.5 min-w-[36px] rounded text-[8.5px] text-black font-black"
                                      style={getCargaStyle(row.load.load)}
                                    >
                                      {row.load.load}
                                    </span>
                                  ) : '-'}
                                </td>
                                <td className={`py-2.5 px-2 text-[8px] font-black uppercase tracking-tight max-w-[130px] truncate text-left transition-all ${hasPseAlert ? 'bg-red-100 text-black rounded-md' : ''}`}>
                                  {!row.load ? '-' : (
                                    <div className="flex flex-col gap-0.5">
                                      {row.load?.molestias ? (
                                        <span className="text-black font-bold">痛 {row.load.molestias}</span>
                                      ) : (
                                        <span className={hasPseAlert ? "text-black/60 font-bold justify-start text-left block" : "text-slate-400 font-bold justify-start text-left block"}>SIN MOL.</span>
                                      )}
                                      {row.load?.enfermedad ? (
                                        <span className="text-black font-bold">🏥 {row.load.enfermedad}</span>
                                      ) : (
                                        <span className={hasPseAlert ? "text-black/60 font-bold justify-start text-left block" : "text-slate-400 font-bold justify-start text-left block"}>SANO</span>
                                      )}
                                    </div>
                                  )}
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="py-2.5 text-center">
                                  {row.wellness ? <span className={`w-5 h-5 flex items-center justify-center mx-auto rounded-full text-[8.5px] font-black ${getScoreColor(row.wellness.fatigue)}`}>{row.wellness.fatigue}</span> : '-'}
                                </td>
                                <td className="py-2.5 text-center">
                                  {row.wellness ? <span className={`w-5 h-5 flex items-center justify-center mx-auto rounded-full text-[8.5px] font-black ${getScoreColor(row.wellness.sleep)}`}>{row.wellness.sleep}</span> : '-'}
                                </td>
                                <td className="py-2.5 text-center">
                                  {row.wellness ? <span className={`w-5 h-5 flex items-center justify-center mx-auto rounded-full text-[8.5px] font-black ${getScoreColor(row.wellness.soreness)}`}>{row.wellness.soreness}</span> : '-'}
                                </td>
                                <td className="py-2.5 text-center">
                                  {row.wellness ? <span className={`w-5 h-5 flex items-center justify-center mx-auto rounded-full text-[8.5px] font-black ${getScoreColor(row.wellness.stress || 0)}`}>{row.wellness.stress || 0}</span> : '-'}
                                </td>
                                <td className="py-2.5 text-center">
                                  {row.wellness ? <span className={`w-5 h-5 flex items-center justify-center mx-auto rounded-full text-[8.5px] font-black ${getScoreColor(row.wellness.mood || 0)}`}>{row.wellness.mood || 0}</span> : '-'}
                                </td>
                                <td className="py-2.5 text-center font-black text-[10px]">
                                  {row.wellness ? <span className="text-slate-800">{avgValue}</span> : '-'}
                                </td>
                                <td className={`py-2.5 px-2 text-[8px] font-black uppercase tracking-tight max-w-[130px] truncate text-left transition-all ${hasWellnessAlert ? 'bg-red-100 text-black rounded-md' : ''}`}>
                                  {isPending ? '-' : (
                                    <div className="flex flex-col gap-0.5">
                                      {row.wellness?.soreness_areas && row.wellness.soreness_areas.length > 0 ? (
                                        <span className="text-black font-bold">痛 {row.wellness.soreness_areas.join(', ')}</span>
                                      ) : (
                                        <span className={hasWellnessAlert ? "text-black/60 font-bold" : "text-slate-400 font-bold"}>SIN MOL.</span>
                                      )}
                                      {row.wellness?.illness_symptoms && row.wellness.illness_symptoms.length > 0 ? (
                                        <span className="text-black font-bold">🏥 {row.wellness.illness_symptoms.join(', ')}</span>
                                      ) : (
                                        <span className={hasWellnessAlert ? "text-black/60 font-bold" : "text-slate-400 font-bold"}>SANO</span>
                                      )}
                                    </div>
                                  )}
                                </td>
                              </>
                            )}
                            <td className="py-2.5 text-center">
                              {isPending ? (
                                <span className="px-1.5 py-0.5 bg-amber-50 text-amber-500 rounded text-[7.5px] font-black tracking-widest uppercase">PEND.</span>
                              ) : (
                                <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[7.5px] font-black tracking-widest uppercase">Listo</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Columna Derecha */}
                <div className="border border-slate-100 rounded-3xl p-4 bg-white shadow-sm overflow-x-auto">
                  <table className="w-full text-left text-[9px]">
                    <thead>
                      {view === 'pse' ? (
                        <tr className="border-b border-slate-100 text-[8px] text-slate-400 font-black uppercase tracking-wider">
                          <th className="pb-2">ATLETA</th>
                          <th className="pb-2 text-center">DUR</th>
                          <th className="pb-2 text-center">RPE</th>
                          <th className="pb-2 text-center">CARGA</th>
                          <th className="pb-2 pl-2 text-left">MOLESTIA / ENFERMEDAD</th>
                          <th className="pb-2 text-center">CHECK</th>
                        </tr>
                      ) : (
                        <tr className="border-b border-slate-100 text-[8px] text-slate-400 font-black uppercase tracking-wider">
                          <th className="pb-2">ATLETA</th>
                          <th className="pb-2 text-center">FAT</th>
                          <th className="pb-2 text-center">SUE</th>
                          <th className="pb-2 text-center">DOL</th>
                          <th className="pb-2 text-center">EST</th>
                          <th className="pb-2 text-center">ÁNI</th>
                          <th className="pb-2 text-center font-black">PROM</th>
                          <th className="pb-2 pl-2">ZONA MOLESTIA / SÍNTOMAS</th>
                          <th className="pb-2 text-center">CHECK</th>
                        </tr>
                      )}
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {rightWellnessList.map((row, idx) => {
                        const isPending = view === 'pse' ? !row.load : !row.wellness;
                        const avgValue = row.wellness ? ((row.wellness.fatigue + row.wellness.sleep + row.wellness.mood) / 3).toFixed(1) : '-';
                        const hasPseAlert = row.load && (row.load.molestias || row.load.enfermedad);
                        const hasWellnessAlert = row.wellness && (
                          (row.wellness.soreness_areas && row.wellness.soreness_areas.length > 0) ||
                          (row.wellness.illness_symptoms && row.wellness.illness_symptoms.length > 0)
                        );
                        return (
                          <tr key={`right-well-${idx}`} className={`hover:bg-slate-50/50 transition-all ${isPending ? 'opacity-40' : ''}`}>
                            <td className="py-2.5 font-bold text-slate-800">
                              <span className="block font-black uppercase text-[10px]">{row.player?.name}</span>
                              <span className="text-[7.5px] uppercase tracking-wider text-slate-400 font-bold leading-none">{row.player?.club_name || row.player?.club || 'SIN CLUB'}</span>
                            </td>
                            {view === 'pse' ? (
                              <>
                                <td className="py-2.5 text-center font-black">
                                  {row.load?.duration ? `${row.load.duration}` : '-'}
                                </td>
                                <td className="py-2.5 text-center">
                                  {row.load?.rpe ? (
                                    <span 
                                      className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[8.5px] text-black font-black"
                                      style={getRpeStyle(row.load.rpe)}
                                    >
                                      {row.load.rpe}
                                    </span>
                                  ) : '-'}
                                </td>
                                <td className="py-2.5 text-center">
                                  {row.load?.load ? (
                                    <span 
                                      className="inline-flex items-center justify-center px-1.5 py-0.5 min-w-[36px] rounded text-[8.5px] text-black font-black"
                                      style={getCargaStyle(row.load.load)}
                                    >
                                      {row.load.load}
                                    </span>
                                  ) : '-'}
                                </td>
                                <td className={`py-2.5 px-2 text-[8px] font-black uppercase tracking-tight max-w-[130px] truncate text-left transition-all ${hasPseAlert ? 'bg-red-100 text-black rounded-md' : ''}`}>
                                  {!row.load ? '-' : (
                                    <div className="flex flex-col gap-0.5">
                                      {row.load?.molestias ? (
                                        <span className="text-black font-bold">痛 {row.load.molestias}</span>
                                      ) : (
                                        <span className={hasPseAlert ? "text-black/60 font-bold justify-start text-left block" : "text-slate-400 font-bold justify-start text-left block"}>SIN MOL.</span>
                                      )}
                                      {row.load?.enfermedad ? (
                                        <span className="text-black font-bold">🏥 {row.load.enfermedad}</span>
                                      ) : (
                                        <span className={hasPseAlert ? "text-black/60 font-bold justify-start text-left block" : "text-slate-400 font-bold justify-start text-left block"}>SANO</span>
                                      )}
                                    </div>
                                  )}
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="py-2.5 text-center">
                                  {row.wellness ? <span className={`w-5 h-5 flex items-center justify-center mx-auto rounded-full text-[8.5px] font-black ${getScoreColor(row.wellness.fatigue)}`}>{row.wellness.fatigue}</span> : '-'}
                                </td>
                                <td className="py-2.5 text-center">
                                  {row.wellness ? <span className={`w-5 h-5 flex items-center justify-center mx-auto rounded-full text-[8.5px] font-black ${getScoreColor(row.wellness.sleep)}`}>{row.wellness.sleep}</span> : '-'}
                                </td>
                                <td className="py-2.5 text-center">
                                  {row.wellness ? <span className={`w-5 h-5 flex items-center justify-center mx-auto rounded-full text-[8.5px] font-black ${getScoreColor(row.wellness.soreness)}`}>{row.wellness.soreness}</span> : '-'}
                                </td>
                                <td className="py-2.5 text-center">
                                  {row.wellness ? <span className={`w-5 h-5 flex items-center justify-center mx-auto rounded-full text-[8.5px] font-black ${getScoreColor(row.wellness.stress || 0)}`}>{row.wellness.stress || 0}</span> : '-'}
                                </td>
                                <td className="py-2.5 text-center">
                                  {row.wellness ? <span className={`w-5 h-5 flex items-center justify-center mx-auto rounded-full text-[8.5px] font-black ${getScoreColor(row.wellness.mood || 0)}`}>{row.wellness.mood || 0}</span> : '-'}
                                </td>
                                <td className="py-2.5 text-center font-black text-[10px]">
                                  {row.wellness ? <span className="text-slate-800">{avgValue}</span> : '-'}
                                </td>
                                <td className={`py-2.5 px-2 text-[8px] font-black uppercase tracking-tight max-w-[130px] truncate text-left transition-all ${hasWellnessAlert ? 'bg-red-100 text-black rounded-md' : ''}`}>
                                  {isPending ? '-' : (
                                    <div className="flex flex-col gap-0.5">
                                      {row.wellness?.soreness_areas && row.wellness.soreness_areas.length > 0 ? (
                                        <span className="text-black font-bold">痛 {row.wellness.soreness_areas.join(', ')}</span>
                                      ) : (
                                        <span className={hasWellnessAlert ? "text-black/60 font-bold" : "text-slate-400 font-bold"}>SIN MOL.</span>
                                      )}
                                      {row.wellness?.illness_symptoms && row.wellness.illness_symptoms.length > 0 ? (
                                        <span className="text-black font-bold">🏥 {row.wellness.illness_symptoms.join(', ')}</span>
                                      ) : (
                                        <span className={hasWellnessAlert ? "text-black/60 font-bold" : "text-slate-400 font-bold"}>SANO</span>
                                      )}
                                    </div>
                                  )}
                                </td>
                              </>
                            )}
                            <td className="py-2.5 text-center">
                              {isPending ? (
                                <span className="px-1.5 py-0.5 bg-amber-50 text-amber-500 rounded text-[7.5px] font-black tracking-widest uppercase">PEND.</span>
                              ) : (
                                <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[7.5px] font-black tracking-widest uppercase">Listo</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pie de Reporte */}
              <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-[8px] font-bold text-slate-400 uppercase tracking-widest xl:col-span-2">
                <span>ELITE FOOTBALL PERFORMANCE PRO • ÁREA BIOMÉDICA & PREPARACIÓN FÍSICA</span>
                <span>FECHA: {new Date().toLocaleDateString('es-ES')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeMainTab === 'carga_externa' && (
        <div className="bg-white rounded-[32px] md:rounded-[40px] border border-slate-100 shadow-2xl overflow-hidden overflow-x-auto animate-in fade-in duration-300 print:hidden">
           {loadingGpsImport ? (
             <div className="p-20 text-center">
               <div className="w-12 h-12 border-4 border-slate-100 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
               <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Cargando datos GPS...</p>
             </div>
           ) : filteredGpsImport.length === 0 ? (
             <div className="p-20 text-center">
               <i className="fa-solid fa-satellite-dish text-slate-200 text-5xl mb-6"></i>
               <p className="text-slate-900 font-black uppercase italic tracking-tighter text-xl">Sin datos para esta fecha</p>
               <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">No se encontraron registros en la tabla gps_import</p>
             </div>
           ) : (
             <table className="w-full text-center min-w-[1200px]">
               <thead className="bg-[#0b1220] text-white font-black uppercase text-[9px] md:text-[10px]">
                 <tr>
                   <th className="px-4 md:px-8 py-1.5 md:py-2 text-left sticky left-0 bg-[#0b1220] z-10 cursor-pointer group select-none" onClick={() => handleGpsSort('name')}>
                     <div className="flex items-center gap-1.5 justify-start">
                       <span>Atleta</span>
                       <div className="flex flex-col text-[7px] leading-none opacity-30 group-hover:opacity-100 transition-opacity">
                         <i className={`fa-solid fa-caret-up ${gpsSortField === 'name' && gpsSortDirection === 'asc' ? 'text-red-500 font-bold' : 'text-slate-400'}`}></i>
                         <i className={`fa-solid fa-caret-down ${gpsSortField === 'name' && gpsSortDirection === 'desc' ? 'text-red-500 font-bold' : 'text-slate-400'}`}></i>
                       </div>
                     </div>
                   </th>
                   <th className="px-2 md:px-4 py-1.5 md:py-2 cursor-pointer group select-none" onClick={() => handleGpsSort('categoria')}>
                     <div className="flex items-center gap-1.5 justify-center">
                       <span>Categoría</span>
                       <div className="flex flex-col text-[7px] leading-none opacity-30 group-hover:opacity-100 transition-opacity">
                         <i className={`fa-solid fa-caret-up ${gpsSortField === 'categoria' && gpsSortDirection === 'asc' ? 'text-red-500 font-bold' : 'text-slate-400'}`}></i>
                         <i className={`fa-solid fa-caret-down ${gpsSortField === 'categoria' && gpsSortDirection === 'desc' ? 'text-red-500 font-bold' : 'text-slate-400'}`}></i>
                       </div>
                     </div>
                   </th>
                   <th className="px-2 md:px-4 py-1.5 md:py-2 cursor-pointer group select-none" onClick={() => handleGpsSort('minutos')}>
                     <div className="flex items-center gap-1.5 justify-center">
                       <span>Minutos</span>
                       <div className="flex flex-col text-[7px] leading-none opacity-30 group-hover:opacity-100 transition-opacity">
                         <i className={`fa-solid fa-caret-up ${gpsSortField === 'minutos' && gpsSortDirection === 'asc' ? 'text-red-500 font-bold' : 'text-slate-400'}`}></i>
                         <i className={`fa-solid fa-caret-down ${gpsSortField === 'minutos' && gpsSortDirection === 'desc' ? 'text-red-500 font-bold' : 'text-slate-400'}`}></i>
                       </div>
                     </div>
                   </th>
                   <th className="px-2 md:px-4 py-1.5 md:py-2 cursor-pointer group select-none" onClick={() => handleGpsSort('dist_total_m')}>
                     <div className="flex items-center gap-1.5 justify-center">
                       <span>Dist. Total (m)</span>
                       <div className="flex flex-col text-[7px] leading-none opacity-30 group-hover:opacity-100 transition-opacity">
                         <i className={`fa-solid fa-caret-up ${gpsSortField === 'dist_total_m' && gpsSortDirection === 'asc' ? 'text-red-500 font-bold' : 'text-slate-400'}`}></i>
                         <i className={`fa-solid fa-caret-down ${gpsSortField === 'dist_total_m' && gpsSortDirection === 'desc' ? 'text-red-500 font-bold' : 'text-slate-400'}`}></i>
                       </div>
                     </div>
                   </th>
                   <th className="px-2 md:px-4 py-1.5 md:py-2 cursor-pointer group select-none" onClick={() => handleGpsSort('m_por_min')}>
                     <div className="flex items-center gap-1.5 justify-center">
                       <span>m/min</span>
                       <div className="flex flex-col text-[7px] leading-none opacity-30 group-hover:opacity-100 transition-opacity">
                         <i className={`fa-solid fa-caret-up ${gpsSortField === 'm_por_min' && gpsSortDirection === 'asc' ? 'text-red-500 font-bold' : 'text-slate-400'}`}></i>
                         <i className={`fa-solid fa-caret-down ${gpsSortField === 'm_por_min' && gpsSortDirection === 'desc' ? 'text-red-500 font-bold' : 'text-slate-400'}`}></i>
                       </div>
                     </div>
                   </th>
                   <th className="px-2 md:px-4 py-1.5 md:py-2 cursor-pointer group select-none" onClick={() => handleGpsSort('dist_ai_m_15_kmh')}>
                     <div className="flex items-center gap-1.5 justify-center">
                       <span>Dist. AI (&gt;15)</span>
                       <div className="flex flex-col text-[7px] leading-none opacity-30 group-hover:opacity-100 transition-opacity">
                         <i className={`fa-solid fa-caret-up ${gpsSortField === 'dist_ai_m_15_kmh' && gpsSortDirection === 'asc' ? 'text-red-500 font-bold' : 'text-slate-400'}`}></i>
                         <i className={`fa-solid fa-caret-down ${gpsSortField === 'dist_ai_m_15_kmh' && gpsSortDirection === 'desc' ? 'text-red-500 font-bold' : 'text-slate-400'}`}></i>
                       </div>
                     </div>
                   </th>
                   <th className="px-2 md:px-4 py-1.5 md:py-2 cursor-pointer group select-none" onClick={() => handleGpsSort('dist_mai_m_20_kmh')}>
                     <div className="flex items-center gap-1.5 justify-center">
                       <span>Dist. MAI (&gt;20)</span>
                       <div className="flex flex-col text-[7px] leading-none opacity-30 group-hover:opacity-100 transition-opacity">
                         <i className={`fa-solid fa-caret-up ${gpsSortField === 'dist_mai_m_20_kmh' && gpsSortDirection === 'asc' ? 'text-red-500 font-bold' : 'text-slate-400'}`}></i>
                         <i className={`fa-solid fa-caret-down ${gpsSortField === 'dist_mai_m_20_kmh' && gpsSortDirection === 'desc' ? 'text-red-500 font-bold' : 'text-slate-400'}`}></i>
                       </div>
                     </div>
                   </th>
                   <th className="px-2 md:px-4 py-1.5 md:py-2 cursor-pointer group select-none" onClick={() => handleGpsSort('dist_sprint_m_25_kmh')}>
                     <div className="flex items-center gap-1.5 justify-center">
                       <span>Dist. Sprint (&gt;25)</span>
                       <div className="flex flex-col text-[7px] leading-none opacity-30 group-hover:opacity-100 transition-opacity">
                         <i className={`fa-solid fa-caret-up ${gpsSortField === 'dist_sprint_m_25_kmh' && gpsSortDirection === 'asc' ? 'text-red-500 font-bold' : 'text-slate-400'}`}></i>
                         <i className={`fa-solid fa-caret-down ${gpsSortField === 'dist_sprint_m_25_kmh' && gpsSortDirection === 'desc' ? 'text-red-500 font-bold' : 'text-slate-400'}`}></i>
                       </div>
                     </div>
                   </th>
                   <th className="px-2 md:px-4 py-1.5 md:py-2 cursor-pointer group select-none" onClick={() => handleGpsSort('sprints_n')}>
                     <div className="flex items-center gap-1.5 justify-center">
                       <span>Sprints (n)</span>
                       <div className="flex flex-col text-[7px] leading-none opacity-30 group-hover:opacity-100 transition-opacity">
                         <i className={`fa-solid fa-caret-up ${gpsSortField === 'sprints_n' && gpsSortDirection === 'asc' ? 'text-red-500 font-bold' : 'text-slate-400'}`}></i>
                         <i className={`fa-solid fa-caret-down ${gpsSortField === 'sprints_n' && gpsSortDirection === 'desc' ? 'text-red-500 font-bold' : 'text-slate-400'}`}></i>
                       </div>
                     </div>
                   </th>
                   <th className="px-2 md:px-4 py-1.5 md:py-2 cursor-pointer group select-none" onClick={() => handleGpsSort('vel_max_kmh')}>
                     <div className="flex items-center gap-1.5 justify-center">
                       <span>Vel. Máx (km/h)</span>
                       <div className="flex flex-col text-[7px] leading-none opacity-30 group-hover:opacity-100 transition-opacity">
                         <i className={`fa-solid fa-caret-up ${gpsSortField === 'vel_max_kmh' && gpsSortDirection === 'asc' ? 'text-red-500 font-bold' : 'text-slate-400'}`}></i>
                         <i className={`fa-solid fa-caret-down ${gpsSortField === 'vel_max_kmh' && gpsSortDirection === 'desc' ? 'text-red-500 font-bold' : 'text-slate-400'}`}></i>
                       </div>
                     </div>
                   </th>
                   <th className="px-2 md:px-4 py-1.5 md:py-2 cursor-pointer group select-none" onClick={() => handleGpsSort('acc_decc_ai_n')}>
                     <div className="flex items-center gap-1.5 justify-center">
                       <span>Acc/Decc AI</span>
                       <div className="flex flex-col text-[7px] leading-none opacity-30 group-hover:opacity-100 transition-opacity">
                         <i className={`fa-solid fa-caret-up ${gpsSortField === 'acc_decc_ai_n' && gpsSortDirection === 'asc' ? 'text-red-500 font-bold' : 'text-slate-400'}`}></i>
                         <i className={`fa-solid fa-caret-down ${gpsSortField === 'acc_decc_ai_n' && gpsSortDirection === 'desc' ? 'text-red-500 font-bold' : 'text-slate-400'}`}></i>
                       </div>
                     </div>
                   </th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 font-black italic uppercase text-[10px] md:text-xs">
                 {filteredGpsImport.map((row, idx) => {
                   const player = row.players;
                   const playerName = player ? `${player.nombre} ${player.apellido1}`.trim() : `ID: ${row.player_id}`;
                   const isOwnPlayer = player && normalizeClub(player.club_name || player.club || '') === normalizeClub(userClub || '');
                   
                   const isHighlighted = highlightPlayerId && Number(row.player_id) === Number(highlightPlayerId);
                   const ifrValue = calcularIFR(row, player);
                   const ifrColor = ifrValue !== null ? getIFRColor(ifrValue) : null;

                    const playerRef = obtenerReferenciaJugador(player);
                    const refDistTotal = playerRef ? Number(playerRef['Total Distance (m)'] || playerRef.distancia_total || playerRef.dist_total_m) || null : null;
                    const refMetrosMin = playerRef ? Number(playerRef['Metros/min'] || playerRef.metros_minuto || playerRef.m_por_min) || null : null;
                    const refDistAI = playerRef ? Number(playerRef['AInt >15 km/h'] || playerRef.distancia_ai || playerRef.dist_ai_m_15_kmh) || null : null;
                    const refDistMAI = playerRef ? Number(playerRef['MAInt >20km/h'] || playerRef.distancia_mai || playerRef.dist_mai_m_20_kmh) || null : null;
                    const refDistSprint = playerRef ? Number(playerRef['Sprint >25 km/h'] || playerRef.distancia_sprint || playerRef.dist_sprint_m_25_kmh) || null : null;
                    const refAccDecc = playerRef ? Number(playerRef['#Acc+Decc AI'] || playerRef.acc_decc_ai || playerRef.acc_decc_ai_n) || null : null;

                    const styleDistTotal = getParamCellProps(row.dist_total_m, refDistTotal);
                    const styleMetrosMin = getParamCellProps(row.m_por_min, refMetrosMin);
                    const styleDistAI = getParamCellProps(row.dist_ai_m_15_kmh, refDistAI);
                    const styleDistMAI = getParamCellProps(row.dist_mai_m_20_kmh, refDistMAI);
                    const styleDistSprint = getParamCellProps(row.dist_sprint_m_25_kmh, refDistSprint);
                    const styleAccDecc = getParamCellProps(row.acc_decc_ai_n, refAccDecc);
                   
                   return (
                     <tr 
                       key={idx} 
                       className={`hover:bg-slate-50 transition-colors ${isHighlighted ? 'bg-blue-50 border-l-4 border-blue-500' : isOwnPlayer ? 'bg-slate-100/80' : ''}`}
                       style={{ 
                         backgroundColor: ifrColor ? `${ifrColor}25` : undefined 
                       }}
                     >
                       <td className={`px-4 md:px-8 py-1 md:py-1 text-left sticky left-0 group-hover:bg-slate-50 border-r border-slate-50 ${isHighlighted ? 'bg-blue-50' : isOwnPlayer ? 'bg-slate-100/80' : 'bg-white'}`} style={{ backgroundColor: ifrColor ? `${ifrColor}25` : undefined }}>
                          {player?.player_id ? (
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                sessionStorage.setItem('selectedPlayerIdForProfile', String(player.player_id));
                                window.dispatchEvent(new CustomEvent('navigate-to-profile', { detail: { playerId: player.player_id } }));
                              }}
                              className="hover:text-emerald-500 hover:underline cursor-pointer transition-all duration-200 block font-black uppercase text-slate-900"
                              title={`Ver perfil de ${playerName}`}
                            >
                              {playerName}
                            </span>
                          ) : (
                            playerName
                          )}
                        </td>
                       <td className="px-2 md:px-4 py-1 md:py-1 text-slate-500 font-bold tracking-tight">
                         {player?.categoria ? player.categoria.toUpperCase() : 'S/D'}
                       </td>
                       <td className="px-2 md:px-4 py-1 md:py-1">{row.minutos?.toFixed(1) || '0.0'}</td>
                       <td className={`px-2 md:px-4 py-1 md:py-1 ${styleDistTotal.className}`} style={styleDistTotal.style}>{row.dist_total_m?.toFixed(0) || '0'}</td>
                       <td className={`px-2 md:px-4 py-1 md:py-1 ${styleMetrosMin.className}`} style={styleMetrosMin.style}>
                         {row.m_por_min?.toFixed(1) || '0.0'}
                       </td>
                       <td className={`px-2 md:px-4 py-1 md:py-1 ${styleDistAI.className}`} style={styleDistAI.style}>{row.dist_ai_m_15_kmh?.toFixed(0) || '0'}</td>
                       <td className={`px-2 md:px-4 py-1 md:py-1 ${styleDistMAI.className}`} style={styleDistMAI.style}>{row.dist_mai_m_20_kmh?.toFixed(0) || '0'}</td>
                       <td className={`px-2 md:px-4 py-1 md:py-1 ${styleDistSprint.className}`} style={styleDistSprint.style}>{row.dist_sprint_m_25_kmh?.toFixed(0) || '0'}</td>
                       <td className="px-2 md:px-4 py-1 md:py-1">{row.sprints_n?.toFixed(0) || '0'}</td>
                       <td className="px-2 md:px-4 py-1 md:py-1 text-red-600 font-black">{row.vel_max_kmh?.toFixed(1) || '0.0'}</td>
                       <td className={`px-2 md:px-4 py-1 md:py-1 ${styleAccDecc.className}`} style={styleAccDecc.style}>{row.acc_decc_ai_n?.toFixed(0) || '0'}</td>

                     </tr>
                   );
                 })}
               </tbody>
             </table>
           )}
        </div>
      )}

      {activeMainTab === 'reporte_diario' && (
        <div className="space-y-10 animate-in fade-in duration-300">
          {/* PANEL DE SELECCIÓN INTEGRADO */}
          <div className="bg-white rounded-[48px] p-10 border border-slate-100 shadow-sm space-y-10 print:hidden">
             <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">CONFIGURACIÓN DE REPORTE TÉCNICO</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">Seleccione los atletas que desea incluir en el documento oficial.</p>
                </div>
                <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-full border border-slate-100 shadow-inner">
                  <button 
                    onClick={() => {
                      const next = new Set(selectedPlayersReport);
                      currentCitadosPlayers.forEach(p => {
                        if (p.player.player_id) next.add(p.player.player_id);
                      });
                      setSelectedPlayersReport(next);
                    }} 
                    className="px-6 py-3 bg-[#0b1220] text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-md"
                  >
                    Seleccionar Todo
                  </button>
                  <button 
                    onClick={() => {
                      const next = new Set(selectedPlayersReport);
                      currentCitadosPlayers.forEach(p => {
                        if (p.player.player_id) next.delete(p.player.player_id);
                      });
                      setSelectedPlayersReport(next);
                    }} 
                    className="px-6 py-3 bg-slate-200 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-slate-300 transition-all shadow-md"
                  >
                    Quitar Todo
                  </button>
                  <div className="h-8 w-px bg-slate-200 mx-2"></div>
                  <div className="pr-4">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Incluidos</span>
                    <span className="text-sm font-black text-[#0b1220] italic">
                      {currentCitadosPlayers.filter(p => p.player.player_id && selectedPlayersReport.has(p.player.player_id)).length}
                    </span>
                  </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={downloadTechnicalReportPDF}
                      disabled={exportingReport}
                      className="bg-red-600 text-white px-8 py-5 rounded-full text-[11px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-red-700 transition-all shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <i className="fa-solid fa-file-pdf text-lg"></i>
                      {exportingReport ? 'GENERANDO PDF...' : 'DESCARGAR PDF'}
                    </button>
                    <button 
                      onClick={downloadTechnicalReportJPG}
                      disabled={exportingReport}
                      className="bg-emerald-600 text-white px-8 py-5 rounded-full text-[11px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-emerald-700 transition-all shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <i className="fa-solid fa-file-image text-lg"></i>
                      {exportingReport ? 'GENERANDO JPG...' : 'DESCARGAR JPG'}
                    </button>
                  </div>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                <div className="md:col-span-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Buscador Local</label>
                  <input 
                    type="text" 
                    placeholder="Atleta específico..." 
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-xs font-bold shadow-inner outline-none focus:ring-2 focus:ring-red-500" 
                    value={reportPlayerSearch}
                    onChange={e => setReportPlayerSearch(e.target.value)}
                  />
                </div>
                <div className="md:col-span-9">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Listado de Citados (Presione para incluir/excluir)</label>
                  <div className="flex flex-wrap gap-2 max-h-[160px] overflow-y-auto pr-2 p-1 custom-scrollbar">
                    {currentCitadosPlayers
                      .filter(p => p.player.name.toLowerCase().includes(reportPlayerSearch.toLowerCase()))
                      .map(p => {
                        const active = selectedPlayersReport.has(p.player.player_id!);
                        return (
                          <button 
                           key={p.player.id}
                           onClick={() => togglePlayerInReport(p.player.player_id!)}
                           className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-sm border-2 ${active ? 'bg-[#0b1220] border-[#0b1220] text-white' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}
                          >
                            {active && <i className="fa-solid fa-check text-red-500 mr-2"></i>}
                            {p.player.name}
                          </button>
                        );
                      })
                    }
                  </div>
                </div>

                <div className="md:col-span-12 mt-6">
                   <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3 italic">Mensaje Especial (Opcional - Sólo aparecerá si escribes algo)</label>
                      <textarea 
                        className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500 transition-all resize-none shadow-sm"
                        placeholder="Escribe un mensaje que aparecerá al final del reporte..."
                        rows={3}
                        value={specialNote}
                        onChange={(e) => setSpecialNote(e.target.value)}
                      />
                   </div>
                </div>
             </div>
          </div>

          {/* VISTA PREVIA DEL PDF (Solo visible en pantalla o impresión) */}
          <div className="space-y-0 print:bg-white print:m-0 print:p-0">
            {(() => {
              const sortedWellnessList = [...reportData.wellnessList].sort((a, b) => {
                let valA: any;
                let valB: any;

                switch (sortField) {
                  case 'name':
                    valA = a.player.name?.toLowerCase() || '';
                    valB = b.player.name?.toLowerCase() || '';
                    break;
                  case 'fatigue':
                    valA = a.data?.fatigue ?? -1;
                    valB = b.data?.fatigue ?? -1;
                    break;
                  case 'sleep':
                    valA = a.data?.sleep ?? -1;
                    valB = b.data?.sleep ?? -1;
                    break;
                  case 'soreness':
                    valA = a.data?.soreness ?? -1;
                    valB = b.data?.soreness ?? -1;
                    break;
                  case 'stress':
                    valA = (a.data?.stress || (a.data as any)?.stres) ?? -1;
                    valB = (b.data?.stress || (b.data as any)?.stres) ?? -1;
                    break;
                  case 'mood':
                    valA = (a.data?.mood || (a.data as any)?.ani) ?? -1;
                    valB = (b.data?.mood || (b.data as any)?.ani) ?? -1;
                    break;
                  case 'avg':
                    valA = a.data ? ((a.data.fatigue + a.data.sleep + (a.data.mood || (a.data as any).ani || 0)) / 3) : -1;
                    valB = b.data ? ((b.data.fatigue + b.data.sleep + (b.data.mood || (b.data as any).ani || 0)) / 3) : -1;
                    break;
                  case 'soreness_areas':
                    valA = a.data?.soreness_areas?.join(', ').toLowerCase() || '';
                    valB = b.data?.soreness_areas?.join(', ').toLowerCase() || '';
                    break;
                  case 'health_status':
                    valA = a.data?.illness_symptoms?.join(', ').toLowerCase() || '';
                    valB = b.data?.illness_symptoms?.join(', ').toLowerCase() || '';
                    break;
                  default:
                    valA = a.player.name?.toLowerCase() || '';
                    valB = b.player.name?.toLowerCase() || '';
                }

                if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
                if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
                return 0;
              });

              const sortedLoadList = [...reportData.loadList].sort((a, b) => {
                let valA: any;
                let valB: any;

                switch (sortField) {
                  case 'name':
                    valA = a.player.name?.toLowerCase() || '';
                    valB = b.player.name?.toLowerCase() || '';
                    break;
                  case 'rpe':
                    valA = a.sessions.length ? (a.sessions.reduce((acc: any, c: any) => acc + c.rpe, 0) / a.sessions.length) : -1;
                    valB = b.sessions.length ? (b.sessions.reduce((acc: any, c: any) => acc + c.rpe, 0) / b.sessions.length) : -1;
                    break;
                  case 'duration':
                    valA = a.sessions.reduce((acc: any, c: any) => acc + c.duration, 0);
                    valB = b.sessions.reduce((acc: any, c: any) => acc + c.duration, 0);
                    break;
                  case 'load':
                    valA = a.sessions.reduce((acc: any, c: any) => acc + c.load, 0);
                    valB = b.sessions.reduce((acc: any, c: any) => acc + c.load, 0);
                    break;
                  default:
                    valA = a.player.name?.toLowerCase() || '';
                    valB = b.player.name?.toLowerCase() || '';
                }

                if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
                if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
                return 0;
              });

              const halfWellness = Math.ceil(sortedWellnessList.length / 2);
              const leftWellness = sortedWellnessList.slice(0, halfWellness);
              const rightWellness = sortedWellnessList.slice(halfWellness);

              const halfLoads = Math.ceil(sortedLoadList.length / 2);
              const leftLoads = sortedLoadList.slice(0, halfLoads);
              const rightLoads = sortedLoadList.slice(halfLoads);

              const gpsParameters = [
                { name: 'Distancia Total Promedio (m)', value: reportData.gpsAvg?.dist ? `${reportData.gpsAvg.dist.toFixed(0)} m` : '—' },
                { name: 'Distancia HSR Promedio (m)', value: reportData.gpsAvg?.hsr ? `${reportData.gpsAvg.hsr.toFixed(0)} m` : '—' },
                { name: 'Distancia Sprint Promedio (m)', value: reportData.gpsAvg?.sprint ? `${reportData.gpsAvg.sprint.toFixed(0)} m` : '—' },
                { name: 'Acc/Decc AI Promedio', value: reportData.gpsAvg?.acc ? `${reportData.gpsAvg.acc.toFixed(1)}` : '—' },
              ];

              const gpsList = reportData.gpsImportReport || [];
              const needsGpsSplit = gpsList.length > 25;

              let gpsPage1 = gpsList;
              let gpsPage2: any[] = [];

              if (needsGpsSplit) {
                const half = Math.ceil(gpsList.length / 2);
                gpsPage1 = gpsList.slice(0, half);
                gpsPage2 = gpsList.slice(half);
              }

              const gpsByPositionPageNo = needsGpsSplit ? 6 : 5;
              const comparePageNo = needsGpsSplit ? 7 : 6;
              const nextDayForecastPageNo = needsGpsSplit ? 8 : 7;
              const totalPages = needsGpsSplit ? 8 : 7;

              const getNextDayDate = (dateStr: string) => {
                try {
                  const d = new Date(dateStr + 'T12:00:00');
                  d.setDate(d.getDate() + 1);
                  const year = d.getFullYear();
                  const month = (d.getMonth() + 1).toString().padStart(2, '0');
                  const day = d.getDate().toString().padStart(2, '0');
                  return `${year}-${month}-${day}`;
                } catch {
                  return dateStr;
                }
              };

              const getNextDayFormatted = (dateStr: string) => {
                try {
                  const d = new Date(dateStr + 'T12:00:00');
                  d.setDate(d.getDate() + 1);
                  const weekday = d.toLocaleDateString('es-ES', { weekday: 'long' });
                  const day = d.getDate().toString().padStart(2, '0');
                  const month = (d.getMonth() + 1).toString().padStart(2, '0');
                  return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)} ${day}/${month}`;
                } catch {
                  return dateStr;
                }
              };

              const nextDayIdx = getDayIndex() !== -1 ? getDayIndex() + 1 : -1;
              const nextIntensity = (nextDayIdx !== -1 && dayIntensities) ? (dayIntensities[nextDayIdx] || 'Media') : 'Media';

              const nextDayGpsParams = [
                { id: 'dist_total_m', name: 'DISTANCIA TOTAL PROMEDIO OBJETIVO' },
                { id: 'dist_ai_m_15_kmh', name: 'DISTANCIA HSR PROMEDIO OBJETIVO (>15 KM/H)' },
                { id: 'dist_sprint_m_25_kmh', name: 'DISTANCIA SPRINT PROMEDIO OBJETIVO (>25 KM/H)' },
                { id: 'acc_decc_ai_n', name: 'ACC/DECC AI PROMEDIO OBJETIVO' },
              ].map(item => {
                const percentage = (nextDayIdx !== -1 && plannedValues) ? (plannedValues[`${nextDayIdx}_${item.id}`] || 0) : 0;
                const factor = 1 + (percentage / 100);
                const baseRange = METRIC_FALLBACKS[item.id]?.[nextIntensity as 'Baja' | 'Media' | 'Alta'] || [0, 0, 0];
                const adjustedRange = [
                  Math.round(baseRange[0] * factor),
                  Math.round(baseRange[1] * factor),
                  Math.round(baseRange[2] * factor)
                ];
                const unit = item.id.includes('dist_') ? ' m' : '';
                return {
                  name: item.name,
                  range: `${adjustedRange[0]} - ${adjustedRange[2]}${unit}`,
                  percentage
                };
              });

              // Agrupar métricas de GPS por posición
              const gpsByPositionData = (() => {
                const groups: Record<string, {
                  minutos: number[];
                  dist_total_m: number[];
                  m_por_min: number[];
                  dist_mai_m_20_kmh: number[];
                  dist_ai_m_15_kmh: number[];
                  dist_sprint_m_25_kmh: number[];
                  vel_max_kmh: number[];
                  acc_decc_ai_n: number[];
                  count: number;
                }> = {};

                gpsList.forEach((row: any) => {
                  const rawPos = row.players?.posicion || 'S/D';
                  const pos = rawPos.trim().toUpperCase();
                  if (!groups[pos]) {
                    groups[pos] = {
                      minutos: [],
                      dist_total_m: [],
                      m_por_min: [],
                      dist_mai_m_20_kmh: [],
                      dist_ai_m_15_kmh: [],
                      dist_sprint_m_25_kmh: [],
                      vel_max_kmh: [],
                      acc_decc_ai_n: [],
                      count: 0
                    };
                  }
                  
                  groups[pos].count += 1;
                  if (row.minutos !== undefined && row.minutos !== null) groups[pos].minutos.push(row.minutos);
                  if (row.dist_total_m !== undefined && row.dist_total_m !== null) groups[pos].dist_total_m.push(row.dist_total_m);
                  if (row.m_por_min !== undefined && row.m_por_min !== null) groups[pos].m_por_min.push(row.m_por_min);
                  if (row.dist_mai_m_20_kmh !== undefined && row.dist_mai_m_20_kmh !== null) groups[pos].dist_mai_m_20_kmh.push(row.dist_mai_m_20_kmh);
                  if (row.dist_ai_m_15_kmh !== undefined && row.dist_ai_m_15_kmh !== null) groups[pos].dist_ai_m_15_kmh.push(row.dist_ai_m_15_kmh);
                  if (row.dist_sprint_m_25_kmh !== undefined && row.dist_sprint_m_25_kmh !== null) groups[pos].dist_sprint_m_25_kmh.push(row.dist_sprint_m_25_kmh);
                  if (row.vel_max_kmh !== undefined && row.vel_max_kmh !== null) groups[pos].vel_max_kmh.push(row.vel_max_kmh);
                  if (row.acc_decc_ai_n !== undefined && row.acc_decc_ai_n !== null) groups[pos].acc_decc_ai_n.push(row.acc_decc_ai_n);
                });

                const getAvg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
                const getMax = (arr: number[]) => arr.length ? Math.max(...arr) : 0;

                const order = ['ARQUERO', 'DEFENSA', 'MEDIOCAMPO', 'DELANTERO'];

                return Object.entries(groups)
                  .map(([pos, g]) => ({
                    posicion: pos,
                    count: g.count,
                    minutos: getAvg(g.minutos),
                    dist_total_m: getAvg(g.dist_total_m),
                    m_por_min: getAvg(g.m_por_min),
                    dist_mai_m_20_kmh: getAvg(g.dist_mai_m_20_kmh),
                    dist_ai_m_15_kmh: getAvg(g.dist_ai_m_15_kmh),
                    dist_sprint_m_25_kmh: getAvg(g.dist_sprint_m_25_kmh),
                    vel_max_kmh: getMax(g.vel_max_kmh),
                    acc_decc_ai_n: getAvg(g.acc_decc_ai_n)
                  }))
                  .sort((a, b) => {
                    const idxA = order.indexOf(a.posicion);
                    const idxB = order.indexOf(b.posicion);
                    if (idxA === -1 && idxB === -1) return a.posicion.localeCompare(b.posicion);
                    if (idxA === -1) return 1;
                    if (idxB === -1) return -1;
                    return idxA - idxB;
                  });
              })();

              const renderGpsPage = (pageNo: number, list: any[], isLast: boolean) => {
                return (
                  <div className="print-page-section font-sans text-slate-900 flex flex-col justify-between bg-white">
                    <div>
                      <PrintHeader 
                        selectedDate={selectedDate} 
                        selectedCategory={selectedCategories.length === Object.values(Category).length ? 'TODAS LAS CATEGORÍAS' : selectedCategories[0]} 
                        activeMicrocycle={activeMicrocycle} 
                        page={pageNo} 
                        total={totalPages} 
                      />
                      
                      <section className="mt-4">
                        <h3 className="text-xs font-black text-slate-900 border-l-4 border-[#02428c] pl-3 mb-4 uppercase tracking-widest italic flex items-center justify-between">
                          <span>{pageNo}._ DESEMPEÑO GPS COMPLETO DE LA JORNADA {needsGpsSplit ? `(PARTE ${pageNo === 4 ? 'I' : 'II'})` : '(TOTAL DE CARGA EXTERNA)'}</span>
                          {isLast && reportData.gpsAvg && (
                            <span className="bg-[#02428c] text-white text-[10px] font-black tracking-widest px-3 py-1 rounded-full font-mono">
                              DIST. PROMEDIO: {reportData.gpsAvg.dist.toFixed(0)} M | M/MIN HISTÓRICO: {reportData.gpsAvg.mpm.toFixed(1)}
                            </span>
                          )}
                        </h3>

                        <div className="overflow-hidden rounded-2xl border border-slate-100 shadow-sm">
                          <table className="w-full text-center border-separate border-spacing-0 bg-white">
                            <thead className="bg-[#0b1220] text-white text-[7px] font-black uppercase tracking-[0.1em]">
                              <tr>
                                <th className="px-4 py-2 text-left bg-[#0b1220] min-w-[140px]">ATLETA</th>
                                <th className="px-1 py-2">CATEGORÍA</th>
                                <th className="px-1 py-2">DURACIÓN (MIN)</th>
                                <th className="px-1 py-2">DIST. TOTAL (M)</th>
                                <th className="px-1 py-2">M/MIN</th>
                                <th className="px-1 py-2">DIST. HSR (&gt;20)</th>
                                <th className="px-1 py-2">DIST. AI (&gt;15)</th>
                                <th className="px-1 py-2">DIST. SPRINT (&gt;25)</th>
                                <th className="px-1 py-2">VEL. MÁX (KM/H)</th>
                                <th className="px-1 py-2">ACC/DECC AI</th>
                              </tr>
                            </thead>
                            <tbody className="text-[7.5px] font-sans font-bold text-slate-900">
                              {list.map((row: any, idx: number) => {
                                const player = row.players;
                                const playerName = player ? `${player.nombre} ${player.apellido1} ${player.apellido2 || ''}`.trim() : `ID: ${row.player_id}`;

                                const playerRef = obtenerReferenciaJugador(player);
                                const refDistTotal = playerRef ? Number(playerRef['Total Distance (m)'] || playerRef.distancia_total || playerRef.dist_total_m) || null : null;
                                const refMetrosMin = playerRef ? Number(playerRef['Metros/min'] || playerRef.metros_minuto || playerRef.m_por_min) || null : null;
                                const refDistAI = playerRef ? Number(playerRef['AInt >15 km/h'] || playerRef.distancia_ai || playerRef.dist_ai_m_15_kmh) || null : null;
                                const refDistMAI = playerRef ? Number(playerRef['MAInt >20km/h'] || playerRef.distancia_mai || playerRef.dist_mai_m_20_kmh) || null : null;
                                const refDistSprint = playerRef ? Number(playerRef['Sprint >25 km/h'] || playerRef.distancia_sprint || playerRef.dist_sprint_m_25_kmh) || null : null;
                                const refAccDecc = playerRef ? Number(playerRef['#Acc+Decc AI'] || playerRef.acc_decc_ai || playerRef.acc_decc_ai_n) || null : null;

                                const styleDistTotal = getParamCellProps(row.dist_total_m, refDistTotal);
                                const styleMetrosMin = getParamCellProps(row.m_por_min, refMetrosMin);
                                const styleDistAI = getParamCellProps(row.dist_ai_m_15_kmh, refDistAI);
                                const styleDistMAI = getParamCellProps(row.dist_mai_m_20_kmh, refDistMAI);
                                const styleDistSprint = getParamCellProps(row.dist_sprint_m_25_kmh, refDistSprint);
                                const styleAccDecc = getParamCellProps(row.acc_decc_ai_n, refAccDecc);

                                return (
                                  <tr key={`gps-rep-${pageNo}-${idx}`} className="border-b border-slate-50 hover:bg-slate-50/50">
                                    <td className="px-4 py-1 text-left font-sans font-black text-[#0b1220] overflow-visible whitespace-nowrap max-w-[140px] uppercase">{playerName}</td>
                                    <td className="px-1 py-1 text-slate-500 font-sans font-bold text-center">
                                      {player?.categoria ? player.categoria.toUpperCase() : 'S/D'}
                                    </td>
                                    <td className="px-1 py-1 text-slate-400 font-bold font-mono">{row.minutos?.toFixed(0) || '0'}</td>
                                    <td className={`px-1 py-1 font-mono ${styleDistTotal.className}`} style={styleDistTotal.style}>{row.dist_total_m?.toFixed(0) || '0'}</td>
                                    <td className={`px-1 py-1 font-mono ${styleMetrosMin.className}`} style={styleMetrosMin.style}>
                                      {row.m_por_min?.toFixed(1) || '0.0'}
                                    </td>
                                    <td className={`px-1 py-1 font-mono ${styleDistMAI.className}`} style={styleDistMAI.style}>{row.dist_mai_m_20_kmh?.toFixed(0) || '0'}</td>
                                    <td className={`px-1 py-1 font-mono ${styleDistAI.className}`} style={styleDistAI.style}>{row.dist_ai_m_15_kmh?.toFixed(0) || '0'}</td>
                                    <td className={`px-1 py-1 font-mono ${styleDistSprint.className}`} style={styleDistSprint.style}>{row.dist_sprint_m_25_kmh?.toFixed(0) || '0'}</td>
                                    <td className="px-1 py-1 text-red-655 font-extrabold font-mono">{row.vel_max_kmh?.toFixed(1) || '0.0'}</td>
                                    <td className={`px-1 py-1 font-mono ${styleAccDecc.className}`} style={styleAccDecc.style}>{row.acc_decc_ai_n?.toFixed(0) || '0'}</td>
                                  </tr>
                                );
                              })}
                              
                              {/* FILA DE PROMEDIOS GRUPALES */}
                              {isLast && reportData.gpsAvg && (
                                <tr className="bg-[#0b1220] text-emerald-400 font-black italic">
                                  <td className="px-4 py-1 text-left font-sans uppercase tracking-[0.1em] text-[8px] text-white">PROMEDIO GRUPAL</td>
                                  <td className="px-1 py-1 text-[8px] font-sans text-slate-500">-</td>
                                  <td className="px-1 py-1 text-xs text-white font-mono">{reportData.gpsAvg.minutos.toFixed(0)}'</td>
                                  <td className="px-1 py-1 text-xs text-white font-mono">{reportData.gpsAvg.dist.toFixed(0)}M</td>
                                  <td className="px-1 py-1 text-sm text-red-500 bg-[#0c1930] font-mono">{reportData.gpsAvg.mpm.toFixed(1)}</td>
                                  <td className="px-1 py-1 text-xs font-mono">{reportData.gpsAvg.hsr.toFixed(0)}M</td>
                                  <td className="px-1 py-1 text-xs font-mono">{reportData.gpsAvg.ai.toFixed(0)}M</td>
                                  <td className="px-1 py-1 text-xs font-mono">{reportData.gpsAvg.sprint.toFixed(0)}M</td>
                                  <td className="px-1 py-1 text-sm text-red-500 font-mono">{reportData.gpsAvg.vmax.toFixed(1)}</td>
                                  <td className="px-1 py-1 text-xs text-white font-mono">{reportData.gpsAvg.acc.toFixed(1)}</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </section>
                    </div>
                    <PrintFooter page={pageNo} />
                  </div>
                );
              };

              return (
                <>
                  {/* HOJA 1: PORTADA */}
                  <div className="print-page-section flex flex-col justify-between items-center text-center bg-[#961215] border border-red-900 text-white p-12 min-h-[170mm] print:h-[200mm]">
                    <div className="w-full flex justify-between items-center opacity-80">
                      <span className="text-[10px] font-black tracking-[0.25em] text-red-100 uppercase">LA ROJA PERFORMANCE HUB</span>
                      <span className="text-[10px] font-black tracking-widest text-white uppercase bg-white/15 px-3 py-1 rounded-full">CONFIDENCIAL</span>
                    </div>

                    <div className="my-auto space-y-10 max-w-3xl">
                      <div className="w-32 h-32 bg-white p-4 rounded-full shadow-2xl mx-auto flex items-center justify-center border-4 border-slate-100">
                        <img 
                          src={getDriveDirectLink(FEDERATION_LOGO)} 
                          alt="Federation Logo" 
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      <div className="space-y-4">
                        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic text-white font-['Bebas_Neue']">
                          REPORTE TÉCNICO DE RENDIMIENTO
                        </h1>
                        <p className="text-sm font-bold text-red-100/90 uppercase tracking-[0.25em] mt-2">
                          MONITOREO CIENTÍFICO Y CONTROL DE CARGAS
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-6 pt-10 border-t border-white/15">
                        <div className="text-center">
                          <span className="text-[9px] font-black text-white/70 tracking-widest block uppercase">FECHA REPORTE</span>
                          <span className="text-sm font-black text-white uppercase italic mt-2 block">
                            {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </span>
                        </div>
                        <div className="text-center border-x border-white/15 px-4">
                          <span className="text-[9px] font-black text-white/70 tracking-widest block uppercase">CATEGORÍA OFICIAL</span>
                          <span className="text-sm font-black text-white uppercase italic mt-2 block overflow-visible whitespace-nowrap">
                            {selectedCategories.length === Object.values(Category).length ? 'TODAS LAS CATEGORÍAS' : selectedCategories.map(c => c.replace('SUB_', 'SUB ')).join(', ').toUpperCase()}
                          </span>
                        </div>
                        <div className="text-center">
                          <span className="text-[9px] font-black text-white/70 tracking-widest block uppercase">MICROCICLO ACTIVO</span>
                          <span className="text-sm font-black text-white uppercase italic mt-2 block overflow-visible whitespace-nowrap">
                            {activeMicrocycle?.nombre_display || (activeMicrocycle ? `MICROCICLO #${activeMicrocycle.micro_number || activeMicrocycle.id}` : 'SIN MICROCICLO ACTIVO')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="w-full flex justify-between items-center text-[8px] font-black tracking-widest text-red-200/60 uppercase border-t border-white/10 pt-4">
                      <span>ELITE FOOTBALL PERFORMANCE PRO • AMB</span>
                      <span>HOJA 1 / {totalPages}</span>
                    </div>
                  </div>

                  {/* HOJA 2: CHECK IN (WELLNESS) */}
                  <div className="print-page-section font-sans text-slate-900 flex flex-col justify-between bg-white">
                    <div>
                      <PrintHeader 
                        selectedDate={selectedDate} 
                        selectedCategory={selectedCategories.length === Object.values(Category).length ? 'TODAS LAS CATEGORÍAS' : selectedCategories[0]} 
                        activeMicrocycle={activeMicrocycle} 
                        page={2} 
                        total={totalPages} 
                      />

                      <section className="mt-2">
                        <h3 className="text-xs font-black text-slate-900 border-l-4 border-[#02428c] pl-3 mb-3 uppercase tracking-widest italic flex items-center justify-between">
                          <span>2._ EVALUACIÓN DE BIENESTAR DIARIO (CHECK-IN WELLNESS)</span>
                        </h3>

                        {/* Grid de KPIs / Estadísticas Clave */}
                        <div className="grid grid-cols-4 gap-2.5 mb-2.5">
                          {/* KPI 1: Check-ins */}
                          <div className="p-2 bg-slate-50 border border-slate-100/80 rounded-lg flex flex-col justify-center shadow-xs">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[6.5px] font-black text-slate-400 uppercase tracking-wider leading-normal">CHECK-IN COMPLETADOS</span>
                              <span className="text-[9px] font-black text-[#02428c] leading-tight">
                                {stats.checkInDone} <span className="text-[7px] font-bold text-slate-400">/ {currentCitadosPlayers.length}</span>
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-1 overflow-hidden">
                              <div 
                                className="bg-[#02428c] h-full rounded-full transition-all duration-500" 
                                style={{ width: `${currentCitadosPlayers.length > 0 ? (stats.checkInDone / currentCitadosPlayers.length) * 100 : 0}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* KPI 2: Alertas Dolor */}
                          <div className="p-2 bg-slate-50 border border-slate-100/80 rounded-lg flex flex-col justify-center shadow-xs">
                            <div className="flex justify-between items-center mb-0.5">
                              <span className="text-[6.5px] font-black text-slate-400 uppercase tracking-wider leading-normal">ALERTAS DOLOR MUSCULAR</span>
                              <span className={`text-[10px] font-black leading-tight ${stats.sorenessAlerts > 0 ? 'text-red-500' : 'text-slate-800'}`}>
                                {stats.sorenessAlerts} <span className="text-[7px] font-bold text-slate-400">ALERTAS</span>
                              </span>
                            </div>
                            <span className={`text-[5.5px] font-black uppercase ${stats.sorenessAlerts > 0 ? 'text-red-500' : 'text-slate-400'} leading-tight overflow-visible whitespace-nowrap`}>
                              {stats.sorenessAlerts > 0 ? 'REQUIEREN FISIOTERAPIA' : 'SIN SOBRECARGAS CLÍNICAS'}
                            </span>
                          </div>

                          {/* KPI 3: Alertas Salud */}
                          <div className="p-2 bg-slate-50 border border-slate-100/80 rounded-lg flex flex-col justify-center shadow-xs">
                            <div className="flex justify-between items-center mb-0.5">
                              <span className="text-[6.5px] font-black text-slate-400 uppercase tracking-wider leading-normal">ALERTAS ESTADO SALUD</span>
                              <span className={`text-[10px] font-black leading-tight ${stats.healthAlerts > 0 ? 'text-amber-500' : 'text-slate-800'}`}>
                                {stats.healthAlerts} <span className="text-[7px] font-bold text-slate-400">ALERTAS</span>
                              </span>
                            </div>
                            <span className={`text-[5.5px] font-black uppercase ${stats.healthAlerts > 0 ? 'text-amber-500' : 'text-slate-400'} leading-tight overflow-visible whitespace-nowrap`}>
                              {stats.healthAlerts > 0 ? 'EVALUACIÓN MÉDICA' : 'PLANTEL EN ÓPTIMO ESTADO'}
                            </span>
                          </div>

                          {/* KPI 4: Promedio Bienestar */}
                          <div className="p-2 bg-slate-50 border border-slate-100/80 rounded-lg flex flex-col justify-center shadow-xs">
                            <div className="flex justify-between items-center mb-0.5">
                              <span className="text-[6.5px] font-black text-slate-400 uppercase tracking-wider leading-normal">PROMEDIO BIENESTAR JORNADA</span>
                              <span className="text-[10px] font-black text-emerald-600 leading-tight">
                                {wellnessDayAvg} <span className="text-[7px] font-bold text-slate-400">/ 5.0</span>
                              </span>
                            </div>
                            <span className="text-[5.5px] text-slate-400 font-bold uppercase tracking-wider leading-tight overflow-visible whitespace-nowrap">
                              PUNTUACIÓN GENERAL DEL DÍA
                            </span>
                          </div>
                        </div>

                      {/* Tablas lado-a-lado */}
                      <div className="grid grid-cols-2 gap-4">
                        {/* Left Wellness Table */}
                        <div className="overflow-hidden rounded-xl border border-slate-100 shadow-sm">
                          <table className="w-full text-center border-separate border-spacing-0 bg-white">
                            <thead className="bg-[#0b1220] text-white text-[6.5px] font-black uppercase tracking-[0.05em] select-none">
                              <tr>
                                <th className="px-2 py-1 text-left cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => { setSortField('name'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                                  <span className="inline-flex items-center gap-1">
                                    ATLETA
                                    <i className={`fa-solid ${sortField === 'name' ? (sortDirection === 'asc' ? 'fa-sort-up text-red-500' : 'fa-sort-down text-red-500') : 'fa-sort text-slate-500'} text-[6px] print:hidden`}></i>
                                  </span>
                                </th>
                                <th className="px-0.5 py-1 cursor-pointer hover:bg-slate-800 transition-colors text-center" onClick={() => { setSortField('fatigue'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                                  <span className="inline-flex items-center gap-0.5 justify-center">
                                    FAT
                                    <i className={`fa-solid ${sortField === 'fatigue' ? (sortDirection === 'asc' ? 'fa-sort-up text-red-500' : 'fa-sort-down text-red-500') : 'fa-sort text-slate-500'} text-[6px] print:hidden`}></i>
                                  </span>
                                </th>
                                <th className="px-0.5 py-1 cursor-pointer hover:bg-slate-800 transition-colors text-center" onClick={() => { setSortField('sleep'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                                  <span className="inline-flex items-center gap-0.5 justify-center">
                                    SUE
                                    <i className={`fa-solid ${sortField === 'sleep' ? (sortDirection === 'asc' ? 'fa-sort-up text-red-500' : 'fa-sort-down text-red-500') : 'fa-sort text-slate-500'} text-[6px] print:hidden`}></i>
                                  </span>
                                </th>
                                <th className="px-0.5 py-1 cursor-pointer hover:bg-slate-800 transition-colors text-center" onClick={() => { setSortField('soreness'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                                  <span className="inline-flex items-center gap-0.5 justify-center">
                                    DOL
                                    <i className={`fa-solid ${sortField === 'soreness' ? (sortDirection === 'asc' ? 'fa-sort-up text-red-500' : 'fa-sort-down text-red-500') : 'fa-sort text-slate-500'} text-[6px] print:hidden`}></i>
                                  </span>
                                </th>
                                <th className="px-0.5 py-1 cursor-pointer hover:bg-slate-800 transition-colors text-center" onClick={() => { setSortField('stress'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                                  <span className="inline-flex items-center gap-0.5 justify-center">
                                    EST
                                    <i className={`fa-solid ${sortField === 'stress' ? (sortDirection === 'asc' ? 'fa-sort-up text-red-500' : 'fa-sort-down text-red-500') : 'fa-sort text-slate-500'} text-[6px] print:hidden`}></i>
                                  </span>
                                </th>
                                <th className="px-0.5 py-1 cursor-pointer hover:bg-slate-800 transition-colors text-center" onClick={() => { setSortField('mood'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                                  <span className="inline-flex items-center gap-0.5 justify-center">
                                    ÁNI
                                    <i className={`fa-solid ${sortField === 'mood' ? (sortDirection === 'asc' ? 'fa-sort-up text-red-500' : 'fa-sort-down text-red-500') : 'fa-sort text-slate-500'} text-[6px] print:hidden`}></i>
                                  </span>
                                </th>
                                <th className="px-0.5 py-1 cursor-pointer hover:bg-slate-800 transition-colors text-center" onClick={() => { setSortField('avg'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                                  <span className="inline-flex items-center gap-0.5 justify-center">
                                    PROM
                                    <i className={`fa-solid ${sortField === 'avg' ? (sortDirection === 'asc' ? 'fa-sort-up text-red-500' : 'fa-sort-down text-red-500') : 'fa-sort text-slate-500'} text-[6px] print:hidden`}></i>
                                  </span>
                                </th>
                                <th className="px-2 py-1 text-left cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => { setSortField('soreness_areas'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                                  <span className="inline-flex items-center gap-1">
                                    ZONA MOLESTIA / SÍNTOMAS
                                    <i className={`fa-solid ${sortField === 'soreness_areas' ? (sortDirection === 'asc' ? 'fa-sort-up text-red-500' : 'fa-sort-down text-red-500') : 'fa-sort text-slate-500'} text-[6px] print:hidden`}></i>
                                  </span>
                                </th>
                                <th className="px-0.5 py-1 cursor-pointer hover:bg-slate-800 transition-colors text-center" onClick={() => { setSortField('health_status'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                                  <span className="inline-flex items-center gap-0.5 justify-center">
                                    ESTADO
                                    <i className={`fa-solid ${sortField === 'health_status' ? (sortDirection === 'asc' ? 'fa-sort-up text-red-500' : 'fa-sort-down text-red-500') : 'fa-sort text-slate-500'} text-[6px] print:hidden`}></i>
                                  </span>
                                </th>
                              </tr>
                            </thead>
                            <tbody className="text-[7px] font-bold text-slate-900">
                              {leftWellness.map(({ player, data }: any, idx: number) => {
                                const avg = data ? (data.fatigue + data.sleep + data.mood) / 3 : 0;
                                const hasPain = data?.soreness_areas && data.soreness_areas.length > 0;
                                const painText = hasPain ? data.soreness_areas.join(', ') : 'SIN DOLOR';
                                const isSano = !data?.illness_symptoms || data.illness_symptoms.length === 0;
                                const illnessText = !isSano ? data.illness_symptoms.join(', ') : 'SANO';
                                const detailText = `${painText} | ${illnessText}`.toUpperCase();
                                const hasAlert = hasPain || !isSano;
                                const isPending = !data;

                                return (
                                  <tr key={`lwell-${player.player_id}-${idx}`} className="border-b border-slate-100/60 hover:bg-slate-50/50">
                                    <td className="px-2 py-0.5 text-left">
                                      <span className="block font-black text-[#0b1220] text-[7.4px] uppercase overflow-visible whitespace-nowrap max-w-[115px] leading-normal tracking-tighter">{player.name}</span>
                                      <span className="block text-[5.5px] font-black text-slate-400 uppercase tracking-tighter overflow-visible whitespace-nowrap max-w-[115px] leading-normal mt-0.5">{player.club_name || player.club || 'SIN CLUB'}</span>
                                    </td>
                                    <td className={`px-0.25 py-0.5 text-center text-[7px] font-black tracking-tighter ${data ? getScoreColor(data.fatigue) : "text-slate-300"}`}>{data ? data.fatigue : "-"}</td>
                                    <td className={`px-0.25 py-0.5 text-center text-[7px] font-black tracking-tighter ${data ? getScoreColor(data.sleep) : "text-slate-300"}`}>{data ? data.sleep : "-"}</td>
                                    <td className={`px-0.25 py-0.5 text-center text-[7px] font-black tracking-tighter ${data ? getScoreColor(data.soreness) : "text-slate-300"}`}>{data ? data.soreness : "-"}</td>
                                    <td className={`px-0.25 py-0.5 text-center text-[7px] font-black tracking-tighter ${data ? getScoreColor(data.stress || data.stres || 0) : "text-slate-300"}`}>{data ? (data.stress || data.stres || 0) : "-"}</td>
                                    <td className={`px-0.25 py-0.5 text-center text-[7px] font-black tracking-tighter ${data ? getScoreColor(data.mood || data.ani || 0) : "text-slate-300"}`}>{data ? (data.mood || data.ani || 0) : "-"}</td>
                                    <td className="px-0.25 py-0.5 text-center text-[7px] font-black text-[#0b1220] font-mono tracking-tighter">
                                      {avg ? avg.toFixed(1) : '-'}
                                    </td>
                                    <td className={`px-1.5 py-0.5 text-left overflow-visible whitespace-nowrap max-w-[140px] transition-all ${hasAlert ? 'bg-red-100 text-black rounded-sm' : ''}`}>
                                      {isPending ? (
                                        <span className="text-slate-300 font-bold">—</span>
                                      ) : hasAlert ? (
                                        <span className="text-black font-extrabold text-[6.5px] uppercase tracking-tighter">{detailText}</span>
                                      ) : (
                                        <span className="text-slate-400 font-bold text-[6.5px] uppercase tracking-tighter">{detailText}</span>
                                      )}
                                    </td>
                                    <td className="px-0.25 py-0.5 text-center">
                                      {isPending ? (
                                        <span className="px-1 py-0.5 bg-amber-50 text-amber-600 rounded-sm text-[5px] font-black border border-amber-100 uppercase tracking-tighter">PEND</span>
                                      ) : (
                                        <span className="px-1 py-0.5 bg-emerald-50 text-emerald-600 rounded-sm text-[5px] font-black border border-emerald-100 uppercase tracking-tighter">OK</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Right Wellness Table */}
                        <div className="overflow-hidden rounded-xl border border-slate-100 shadow-sm">
                          <table className="w-full text-center border-separate border-spacing-0 bg-white">
                            <thead className="bg-[#0b1220] text-white text-[6.5px] font-black uppercase tracking-[0.05em] select-none">
                              <tr>
                                <th className="px-2 py-1 text-left cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => { setSortField('name'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                                  <span className="inline-flex items-center gap-1">
                                    ATLETA
                                    <i className={`fa-solid ${sortField === 'name' ? (sortDirection === 'asc' ? 'fa-sort-up text-red-500' : 'fa-sort-down text-red-500') : 'fa-sort text-slate-500'} text-[6px] print:hidden`}></i>
                                  </span>
                                </th>
                                <th className="px-0.5 py-1 cursor-pointer hover:bg-slate-800 transition-colors text-center" onClick={() => { setSortField('fatigue'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                                  <span className="inline-flex items-center gap-0.5 justify-center">
                                    FAT
                                    <i className={`fa-solid ${sortField === 'fatigue' ? (sortDirection === 'asc' ? 'fa-sort-up text-red-500' : 'fa-sort-down text-red-500') : 'fa-sort text-slate-500'} text-[6px] print:hidden`}></i>
                                  </span>
                                </th>
                                <th className="px-0.5 py-1 cursor-pointer hover:bg-slate-800 transition-colors text-center" onClick={() => { setSortField('sleep'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                                  <span className="inline-flex items-center gap-0.5 justify-center">
                                    SUE
                                    <i className={`fa-solid ${sortField === 'sleep' ? (sortDirection === 'asc' ? 'fa-sort-up text-red-500' : 'fa-sort-down text-red-500') : 'fa-sort text-slate-500'} text-[6px] print:hidden`}></i>
                                  </span>
                                </th>
                                <th className="px-0.5 py-1 cursor-pointer hover:bg-slate-800 transition-colors text-center" onClick={() => { setSortField('soreness'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                                  <span className="inline-flex items-center gap-0.5 justify-center">
                                    DOL
                                    <i className={`fa-solid ${sortField === 'soreness' ? (sortDirection === 'asc' ? 'fa-sort-up text-red-500' : 'fa-sort-down text-red-500') : 'fa-sort text-slate-500'} text-[6px] print:hidden`}></i>
                                  </span>
                                </th>
                                <th className="px-0.5 py-1 cursor-pointer hover:bg-slate-800 transition-colors text-center" onClick={() => { setSortField('stress'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                                  <span className="inline-flex items-center gap-0.5 justify-center">
                                    EST
                                    <i className={`fa-solid ${sortField === 'stress' ? (sortDirection === 'asc' ? 'fa-sort-up text-red-500' : 'fa-sort-down text-red-500') : 'fa-sort text-slate-500'} text-[6px] print:hidden`}></i>
                                  </span>
                                </th>
                                <th className="px-0.5 py-1 cursor-pointer hover:bg-slate-800 transition-colors text-center" onClick={() => { setSortField('mood'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                                  <span className="inline-flex items-center gap-0.5 justify-center">
                                    ÁNI
                                    <i className={`fa-solid ${sortField === 'mood' ? (sortDirection === 'asc' ? 'fa-sort-up text-red-500' : 'fa-sort-down text-red-500') : 'fa-sort text-slate-500'} text-[6px] print:hidden`}></i>
                                  </span>
                                </th>
                                <th className="px-0.5 py-1 cursor-pointer hover:bg-slate-800 transition-colors text-center" onClick={() => { setSortField('avg'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                                  <span className="inline-flex items-center gap-0.5 justify-center">
                                    PROM
                                    <i className={`fa-solid ${sortField === 'avg' ? (sortDirection === 'asc' ? 'fa-sort-up text-red-500' : 'fa-sort-down text-red-500') : 'fa-sort text-slate-500'} text-[6px] print:hidden`}></i>
                                  </span>
                                </th>
                                <th className="px-2 py-1 text-left cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => { setSortField('soreness_areas'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                                  <span className="inline-flex items-center gap-1">
                                    ZONA MOLESTIA / SÍNTOMAS
                                    <i className={`fa-solid ${sortField === 'soreness_areas' ? (sortDirection === 'asc' ? 'fa-sort-up text-red-500' : 'fa-sort-down text-red-500') : 'fa-sort text-slate-500'} text-[6px] print:hidden`}></i>
                                  </span>
                                </th>
                                <th className="px-0.5 py-1 cursor-pointer hover:bg-slate-800 transition-colors text-center" onClick={() => { setSortField('health_status'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                                  <span className="inline-flex items-center gap-0.5 justify-center">
                                    ESTADO
                                    <i className={`fa-solid ${sortField === 'health_status' ? (sortDirection === 'asc' ? 'fa-sort-up text-red-500' : 'fa-sort-down text-red-500') : 'fa-sort text-slate-500'} text-[6px] print:hidden`}></i>
                                  </span>
                                </th>
                              </tr>
                            </thead>
                            <tbody className="text-[7px] font-bold text-slate-900">
                              {rightWellness.map(({ player, data }: any, idx: number) => {
                                const avg = data ? (data.fatigue + data.sleep + data.mood) / 3 : 0;
                                const hasPain = data?.soreness_areas && data.soreness_areas.length > 0;
                                const painText = hasPain ? data.soreness_areas.join(', ') : 'SIN DOLOR';
                                const isSano = !data?.illness_symptoms || data.illness_symptoms.length === 0;
                                const illnessText = !isSano ? data.illness_symptoms.join(', ') : 'SANO';
                                const detailText = `${painText} | ${illnessText}`.toUpperCase();
                                const hasAlert = hasPain || !isSano;
                                const isPending = !data;

                                return (
                                  <tr key={`rwell-${player.player_id}-${idx}`} className="border-b border-slate-100/60 hover:bg-slate-50/50">
                                    <td className="px-2 py-0.5 text-left">
                                      <span className="block font-black text-[#0b1220] text-[7.4px] uppercase overflow-visible whitespace-nowrap max-w-[115px] leading-normal tracking-tighter">{player.name}</span>
                                      <span className="block text-[5.5px] font-black text-slate-400 uppercase tracking-tighter overflow-visible whitespace-nowrap max-w-[115px] leading-normal mt-0.5">{player.club_name || player.club || 'SIN CLUB'}</span>
                                    </td>
                                    <td className={`px-0.25 py-0.5 text-center text-[7px] font-black tracking-tighter ${data ? getScoreColor(data.fatigue) : "text-slate-300"}`}>{data ? data.fatigue : "-"}</td>
                                    <td className={`px-0.25 py-0.5 text-center text-[7px] font-black tracking-tighter ${data ? getScoreColor(data.sleep) : "text-slate-300"}`}>{data ? data.sleep : "-"}</td>
                                    <td className={`px-0.25 py-0.5 text-center text-[7px] font-black tracking-tighter ${data ? getScoreColor(data.soreness) : "text-slate-300"}`}>{data ? data.soreness : "-"}</td>
                                    <td className={`px-0.25 py-0.5 text-center text-[7px] font-black tracking-tighter ${data ? getScoreColor(data.stress || data.stres || 0) : "text-slate-300"}`}>{data ? (data.stress || data.stres || 0) : "-"}</td>
                                    <td className={`px-0.25 py-0.5 text-center text-[7px] font-black tracking-tighter ${data ? getScoreColor(data.mood || data.ani || 0) : "text-slate-300"}`}>{data ? (data.mood || data.ani || 0) : "-"}</td>
                                    <td className="px-0.25 py-0.5 text-center text-[7px] font-black text-[#0b1220] font-mono tracking-tighter">
                                      {avg ? avg.toFixed(1) : '-'}
                                    </td>
                                    <td className={`px-1.5 py-0.5 text-left overflow-visible whitespace-nowrap max-w-[140px] transition-all ${hasAlert ? 'bg-red-100 text-black rounded-sm' : ''}`}>
                                      {isPending ? (
                                        <span className="text-slate-300 font-bold">—</span>
                                      ) : hasAlert ? (
                                        <span className="text-black font-extrabold text-[6.5px] uppercase tracking-tighter">{detailText}</span>
                                      ) : (
                                        <span className="text-slate-400 font-bold text-[6.5px] uppercase tracking-tighter">{detailText}</span>
                                      )}
                                    </td>
                                    <td className="px-0.25 py-0.5 text-center">
                                      {isPending ? (
                                        <span className="px-1 py-0.5 bg-amber-50 text-amber-600 rounded-sm text-[5px] font-black border border-amber-100 uppercase tracking-tighter">PEND</span>
                                      ) : (
                                        <span className="px-1 py-0.5 bg-emerald-50 text-emerald-600 rounded-sm text-[5px] font-black border border-emerald-100 uppercase tracking-tighter">OK</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      </section>
                    </div>
                    <PrintFooter page={2} />
                  </div>

                  {/* HOJA 3: CHECK OUT (PSE) */}
                  <div className="print-page-section font-sans text-slate-900 flex flex-col justify-between bg-white">
                    <div>
                      <PrintHeader 
                        selectedDate={selectedDate} 
                        selectedCategory={selectedCategories.length === Object.values(Category).length ? 'TODAS LAS CATEGORÍAS' : selectedCategories[0]} 
                        activeMicrocycle={activeMicrocycle} 
                        page={3} 
                        total={totalPages} 
                      />
                      
                      <section className="mt-2">
                        <h3 className="text-xs font-black text-slate-900 border-l-4 border-red-655 pl-3 mb-3 uppercase tracking-widest italic flex items-center justify-between">
                          <span>3._ CONTROL DE CARGA INTERNA DE LA SESIÓN (CHECK-OUT PSE)</span>
                        </h3>

                        {/* Grid de KPIs / Estadísticas Clave (Idéntico en estructura a Hoja 2) */}
                        <div className="grid grid-cols-4 gap-2.5 mb-2.5">
                          {/* KPI 1: Check-outs */}
                          <div className="p-2 bg-slate-50 border border-slate-100/80 rounded-lg flex flex-col justify-center shadow-xs">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[6.5px] font-black text-slate-400 uppercase tracking-wider leading-normal">CHECK-OUT COMPLETADOS</span>
                              <span className="text-[9px] font-black text-[#02428c] leading-tight">
                                {stats.checkOutDone} <span className="text-[7px] font-bold text-slate-400">/ {currentCitadosPlayers.length}</span>
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-1 overflow-hidden">
                              <div 
                                className="bg-[#02428c] h-full rounded-full transition-all duration-500" 
                                style={{ width: `${currentCitadosPlayers.length > 0 ? (stats.checkOutDone / currentCitadosPlayers.length) * 100 : 0}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* KPI 2: RPE Promedio */}
                          <div className="p-2 bg-slate-50 border border-slate-100/80 rounded-lg flex flex-col justify-center shadow-xs">
                            <div className="flex justify-between items-center mb-0.5">
                              <span className="text-[6.5px] font-black text-slate-400 uppercase tracking-wider leading-normal">RPE PROMEDIO SESIÓN</span>
                              <span className="text-[10px] font-black leading-tight text-slate-800">
                                {reportData.loadAvg ? reportData.loadAvg.rpe.toFixed(1) : '—'} <span className="text-[7px] font-bold text-slate-400">/ 10</span>
                              </span>
                            </div>
                            <span className="text-[5.5px] text-slate-400 font-bold uppercase tracking-wider leading-tight overflow-visible whitespace-nowrap">
                              PERCEPCIÓN DE ESFUERZO GRUPAL
                            </span>
                          </div>

                          {/* KPI 3: Duración Promedio */}
                          <div className="p-2 bg-slate-50 border border-slate-100/80 rounded-lg flex flex-col justify-center shadow-xs">
                            <div className="flex justify-between items-center mb-0.5">
                              <span className="text-[6.5px] font-black text-slate-400 uppercase tracking-wider leading-normal">DURACIÓN PROMEDIO</span>
                              <span className="text-[10px] font-black leading-tight text-slate-800">
                                {reportData.loadAvg ? reportData.loadAvg.duration.toFixed(0) : '—'} <span className="text-[7px] font-bold text-slate-400">MIN</span>
                              </span>
                            </div>
                            <span className="text-[5.5px] text-slate-400 font-bold uppercase tracking-wider leading-tight overflow-visible whitespace-nowrap">
                              TIEMPO EFECTIVO DE TRABAJO
                            </span>
                          </div>

                          {/* KPI 4: Carga Promedio */}
                          <div className="p-2 bg-slate-50 border border-slate-100/80 rounded-lg flex flex-col justify-center shadow-xs">
                            <div className="flex justify-between items-center mb-0.5">
                              <span className="text-[6.5px] font-black text-slate-400 uppercase tracking-wider leading-normal">CARGA PROMEDIO JORNADA</span>
                              <span className="text-[10px] font-black text-emerald-600 leading-tight">
                                {reportData.loadAvg ? reportData.loadAvg.load.toFixed(0) : '—'} <span className="text-[7px] font-bold text-slate-400">u.a.</span>
                              </span>
                            </div>
                            <span className="text-[5.5px] text-slate-400 font-bold uppercase tracking-wider leading-tight overflow-visible whitespace-nowrap">
                              CARGA INTERNA TOTAL DEL DÍA
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          {/* Left loads table */}
                          <div className="overflow-hidden rounded-xl border border-slate-100 shadow-sm">
                            <table className="w-full text-center border-separate border-spacing-0 bg-white">
                              <thead className="bg-[#0b1220] text-white text-[6.5px] font-black uppercase tracking-[0.05em] select-none">
                                <tr>
                                  <th className="px-2 py-1 text-left cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => { setSortField('name'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                                    <span className="inline-flex items-center gap-1">
                                      ATLETA
                                      <i className={`fa-solid ${sortField === 'name' ? (sortDirection === 'asc' ? 'fa-sort-up text-red-500' : 'fa-sort-down text-red-500') : 'fa-sort text-slate-500'} text-[6px] print:hidden`}></i>
                                    </span>
                                  </th>
                                  <th className="px-0.5 py-1 text-center">SES</th>
                                  <th className="px-0.5 py-1 cursor-pointer hover:bg-slate-800 transition-colors text-center" onClick={() => { setSortField('rpe'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                                    <span className="inline-flex items-center gap-0.5 justify-center">
                                      RPE
                                      <i className={`fa-solid ${sortField === 'rpe' ? (sortDirection === 'asc' ? 'fa-sort-up text-red-500' : 'fa-sort-down text-red-500') : 'fa-sort text-slate-500'} text-[6px] print:hidden`}></i>
                                    </span>
                                  </th>
                                  <th className="px-0.5 py-1 cursor-pointer hover:bg-slate-800 transition-colors text-center" onClick={() => { setSortField('duration'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                                    <span className="inline-flex items-center gap-0.5 justify-center">
                                      DUR
                                      <i className={`fa-solid ${sortField === 'duration' ? (sortDirection === 'asc' ? 'fa-sort-up text-red-500' : 'fa-sort-down text-red-500') : 'fa-sort text-slate-500'} text-[6px] print:hidden`}></i>
                                    </span>
                                  </th>
                                  <th className="px-0.5 py-1 cursor-pointer hover:bg-slate-800 transition-colors text-center" onClick={() => { setSortField('load'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                                    <span className="inline-flex items-center gap-0.5 justify-center">
                                      CARGA
                                      <i className={`fa-solid ${sortField === 'load' ? (sortDirection === 'asc' ? 'fa-sort-up text-red-500' : 'fa-sort-down text-red-500') : 'fa-sort text-slate-500'} text-[6px] print:hidden`}></i>
                                    </span>
                                  </th>
                                  <th className="px-2 py-1 text-left cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => { setSortField('pse_molestias'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                                    <span className="inline-flex items-center gap-1">
                                      ZONA MOLESTIA / SÍNTOMAS
                                      <i className={`fa-solid ${sortField === 'pse_molestias' ? (sortDirection === 'asc' ? 'fa-sort-up text-red-500' : 'fa-sort-down text-red-500') : 'fa-sort text-slate-500'} text-[6px] print:hidden`}></i>
                                    </span>
                                  </th>
                                  <th className="px-0.5 py-1 text-center">ESTADO</th>
                                </tr>
                              </thead>
                              <tbody className="text-[7px] font-bold text-slate-900">
                                {leftLoads.map(({ player, sessions }: any, idx: number) => {
                                  const rpeAvg = sessions.length ? sessions.reduce((acc: any, c: any) => acc + c.rpe, 0) / sessions.length : 0;
                                  const totalMin = sessions.reduce((acc: any, c: any) => acc + c.duration, 0);
                                  const totalLoad = sessions.reduce((acc: any, c: any) => acc + c.load, 0);
                                  const allMolestias = Array.from(new Set(sessions.map((s: any) => s.molestias).filter((m: any) => m && m.trim() !== ''))).join(', ');
                                  const allEnfermedad = Array.from(new Set(sessions.map((s: any) => s.enfermedad).filter((e: any) => e && e.trim() !== ''))).join(', ');
                                  const loadDetails = [allMolestias, allEnfermedad].filter(Boolean).join(' | ');
                                  const isPending = sessions.length === 0;

                                  return (
                                    <tr key={`lload-${player.player_id}-${idx}`} className="border-b border-slate-100/60 hover:bg-slate-50/50">
                                      <td className="px-2 py-0.5 text-left">
                                        <span className="block font-black text-[#0b1220] text-[7.4px] uppercase overflow-visible whitespace-nowrap max-w-[115px] leading-normal tracking-tighter">{player.name}</span>
                                        <span className="block text-[5.5px] font-black text-slate-400 uppercase tracking-tighter overflow-visible whitespace-nowrap max-w-[115px] leading-normal mt-0.5">{player.club_name || player.club || 'SIN CLUB'}</span>
                                      </td>
                                      <td className="px-0.25 py-0.5 text-slate-400 font-black font-mono text-[7px] tracking-tighter text-center">{sessions.length}</td>
                                      <td className={`px-0.25 py-0.5 text-center font-black font-mono text-[7px] tracking-tighter ${rpeAvg ? "" : "text-slate-300"}`} style={rpeAvg ? getRpeStyle(rpeAvg) : undefined}>{rpeAvg ? rpeAvg.toFixed(1) : "-"}</td>
                                      <td className="px-0.25 py-0.5 text-slate-500 font-black font-mono text-[7px] tracking-tighter text-center">{totalMin ? `${totalMin}'` : "-"}</td>
                                      <td className={`px-0.25 py-0.5 text-center font-black font-mono text-[7px] tracking-tighter ${totalLoad ? "" : "text-slate-300"}`} style={totalLoad ? getCargaStyle(totalLoad) : undefined}>{totalLoad || "-"}</td>
                                      <td className={`px-1.5 py-0.5 text-left overflow-visible whitespace-nowrap max-w-[140px] transition-all ${loadDetails ? 'bg-red-100 text-black rounded-sm' : ''}`}>
                                        {isPending ? (
                                          <span className="text-slate-300 font-bold">—</span>
                                        ) : loadDetails ? (
                                          <span className="text-black font-extrabold text-[6.5px] uppercase tracking-tighter">{loadDetails.toUpperCase()}</span>
                                        ) : (
                                          <span className="text-slate-400 font-bold text-[6.5px] uppercase tracking-tighter">SIN MOL. | SANO</span>
                                        )}
                                      </td>
                                      <td className="px-0.25 py-0.5 text-center">
                                        {isPending ? (
                                          <span className="px-1 py-0.5 bg-amber-50 text-amber-600 rounded-sm text-[5px] font-black border border-amber-100 uppercase tracking-tighter">PEND</span>
                                        ) : (
                                          <span className="px-1 py-0.5 bg-emerald-50 text-emerald-600 rounded-sm text-[5px] font-black border border-emerald-100 uppercase tracking-tighter">OK</span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* Right loads table */}
                          <div className="overflow-hidden rounded-xl border border-slate-100 shadow-sm">
                            <table className="w-full text-center border-separate border-spacing-0 bg-white">
                              <thead className="bg-[#0b1220] text-white text-[6.5px] font-black uppercase tracking-[0.05em] select-none">
                                <tr>
                                  <th className="px-2 py-1 text-left cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => { setSortField('name'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                                    <span className="inline-flex items-center gap-1">
                                      ATLETA
                                      <i className={`fa-solid ${sortField === 'name' ? (sortDirection === 'asc' ? 'fa-sort-up text-red-500' : 'fa-sort-down text-red-500') : 'fa-sort text-slate-500'} text-[6px] print:hidden`}></i>
                                    </span>
                                  </th>
                                  <th className="px-0.5 py-1 text-center">SES</th>
                                  <th className="px-0.5 py-1 cursor-pointer hover:bg-slate-800 transition-colors text-center" onClick={() => { setSortField('rpe'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                                    <span className="inline-flex items-center gap-0.5 justify-center">
                                      RPE
                                      <i className={`fa-solid ${sortField === 'rpe' ? (sortDirection === 'asc' ? 'fa-sort-up text-red-500' : 'fa-sort-down text-red-500') : 'fa-sort text-slate-500'} text-[6px] print:hidden`}></i>
                                    </span>
                                  </th>
                                  <th className="px-0.5 py-1 cursor-pointer hover:bg-slate-800 transition-colors text-center" onClick={() => { setSortField('duration'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                                    <span className="inline-flex items-center gap-0.5 justify-center">
                                      DUR
                                      <i className={`fa-solid ${sortField === 'duration' ? (sortDirection === 'asc' ? 'fa-sort-up text-red-500' : 'fa-sort-down text-red-500') : 'fa-sort text-slate-500'} text-[6px] print:hidden`}></i>
                                    </span>
                                  </th>
                                  <th className="px-0.5 py-1 cursor-pointer hover:bg-slate-800 transition-colors text-center" onClick={() => { setSortField('load'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                                    <span className="inline-flex items-center gap-0.5 justify-center">
                                      CARGA
                                      <i className={`fa-solid ${sortField === 'load' ? (sortDirection === 'asc' ? 'fa-sort-up text-red-500' : 'fa-sort-down text-red-500') : 'fa-sort text-slate-500'} text-[6px] print:hidden`}></i>
                                    </span>
                                  </th>
                                  <th className="px-2 py-1 text-left cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => { setSortField('pse_molestias'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                                    <span className="inline-flex items-center gap-1">
                                      ZONA MOLESTIA / SÍNTOMAS
                                      <i className={`fa-solid ${sortField === 'pse_molestias' ? (sortDirection === 'asc' ? 'fa-sort-up text-red-500' : 'fa-sort-down text-red-500') : 'fa-sort text-slate-500'} text-[6px] print:hidden`}></i>
                                    </span>
                                  </th>
                                  <th className="px-0.5 py-1 text-center">ESTADO</th>
                                </tr>
                              </thead>
                              <tbody className="text-[7px] font-bold text-slate-900">
                                {rightLoads.map(({ player, sessions }: any, idx: number) => {
                                  const rpeAvg = sessions.length ? sessions.reduce((acc: any, c: any) => acc + c.rpe, 0) / sessions.length : 0;
                                  const totalMin = sessions.reduce((acc: any, c: any) => acc + c.duration, 0);
                                  const totalLoad = sessions.reduce((acc: any, c: any) => acc + c.load, 0);
                                  const allMolestias = Array.from(new Set(sessions.map((s: any) => s.molestias).filter((m: any) => m && m.trim() !== ''))).join(', ');
                                  const allEnfermedad = Array.from(new Set(sessions.map((s: any) => s.enfermedad).filter((e: any) => e && e.trim() !== ''))).join(', ');
                                  const loadDetails = [allMolestias, allEnfermedad].filter(Boolean).join(' | ');
                                  const isPending = sessions.length === 0;

                                  return (
                                    <tr key={`rload-${player.player_id}-${idx}`} className="border-b border-slate-100/60 hover:bg-slate-50/50">
                                      <td className="px-2 py-0.5 text-left">
                                        <span className="block font-black text-[#0b1220] text-[7.4px] uppercase overflow-visible whitespace-nowrap max-w-[115px] leading-normal tracking-tighter">{player.name}</span>
                                        <span className="block text-[5.5px] font-black text-slate-400 uppercase tracking-tighter overflow-visible whitespace-nowrap max-w-[115px] leading-normal mt-0.5">{player.club_name || player.club || 'SIN CLUB'}</span>
                                      </td>
                                      <td className="px-0.25 py-0.5 text-slate-400 font-black font-mono text-[7px] tracking-tighter text-center">{sessions.length}</td>
                                      <td className={`px-0.25 py-0.5 text-center font-black font-mono text-[7px] tracking-tighter ${rpeAvg ? "" : "text-slate-300"}`} style={rpeAvg ? getRpeStyle(rpeAvg) : undefined}>{rpeAvg ? rpeAvg.toFixed(1) : "-"}</td>
                                      <td className="px-0.25 py-0.5 text-slate-500 font-black font-mono text-[7px] tracking-tighter text-center">{totalMin ? `${totalMin}'` : "-"}</td>
                                      <td className={`px-0.25 py-0.5 text-center font-black font-mono text-[7px] tracking-tighter ${totalLoad ? "" : "text-slate-300"}`} style={totalLoad ? getCargaStyle(totalLoad) : undefined}>{totalLoad || "-"}</td>
                                      <td className={`px-1.5 py-0.5 text-left overflow-visible whitespace-nowrap max-w-[140px] transition-all ${loadDetails ? 'bg-red-100 text-black rounded-sm' : ''}`}>
                                        {isPending ? (
                                          <span className="text-slate-300 font-bold">—</span>
                                        ) : loadDetails ? (
                                          <span className="text-black font-extrabold text-[6.5px] uppercase tracking-tighter">{loadDetails.toUpperCase()}</span>
                                        ) : (
                                          <span className="text-slate-400 font-bold text-[6.5px] uppercase tracking-tighter">SIN MOL. | SANO</span>
                                        )}
                                      </td>
                                      <td className="px-0.25 py-0.5 text-center">
                                        {isPending ? (
                                          <span className="px-1 py-0.5 bg-amber-50 text-amber-600 rounded-sm text-[5px] font-black border border-amber-100 uppercase tracking-tighter">PEND</span>
                                        ) : (
                                          <span className="px-1 py-0.5 bg-emerald-50 text-emerald-600 rounded-sm text-[5px] font-black border border-emerald-100 uppercase tracking-tighter">OK</span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </section>
                    </div>
                    <PrintFooter page={3} />
                  </div>

                  {/* HOJA 4: DATOS GPS (Can render on single or split pages) */}
                  {renderGpsPage(4, gpsPage1, !needsGpsSplit)}

                  {needsGpsSplit && renderGpsPage(5, gpsPage2, true)}

                  {/* NUEVA HOJA: RENDIMIENTO GPS POR POSICIÓN */}
                  <div className="print-page-section font-sans text-slate-900 flex flex-col justify-between bg-white">
                    <div>
                      <PrintHeader 
                        selectedDate={selectedDate} 
                        selectedCategory={selectedCategories.length === Object.values(Category).length ? 'TODAS LAS CATEGORÍAS' : selectedCategories[0]} 
                        activeMicrocycle={activeMicrocycle} 
                        page={gpsByPositionPageNo} 
                        total={totalPages} 
                      />

                      <section className="mt-4">
                        <h3 className="text-xs font-black text-slate-900 border-l-4 border-red-650 pl-3 mb-4 uppercase tracking-widest italic flex items-center justify-between">
                          <span>{gpsByPositionPageNo}._ DESEMPEÑO GPS PROMEDIO POR POSICIÓN</span>
                        </h3>

                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-4">
                          * ANÁLISIS AGRUPADO DE LA CARGA EXTERNA POR DEMARCACIÓN TÁCTICA PARA EVALUAR COMPORTAMIENTO DE GRUPOS.
                        </p>

                        {/* TABLA DE PROMEDIOS POR POSICIÓN */}
                        <div className="overflow-hidden rounded-2xl border border-slate-100 shadow-sm mb-6">
                          <table className="w-full text-center border-separate border-spacing-0 bg-white">
                            <thead className="bg-[#0b1220] text-white text-[7px] font-black uppercase tracking-[0.1em]">
                              <tr>
                                <th className="px-4 py-2.5 text-left bg-[#0b1220] min-w-[140px]">POSICIÓN</th>
                                <th className="px-1 py-2.5">JUGADORES</th>
                                <th className="px-1 py-2.5">DURACIÓN PROMEDIO</th>
                                <th className="px-1 py-2.5">DIST. TOTAL (M)</th>
                                <th className="px-1 py-2.5">M/MIN</th>
                                <th className="px-1 py-2.5">DIST. HSR (&gt;20)</th>
                                <th className="px-1 py-2.5">DIST. AI (&gt;15)</th>
                                <th className="px-1 py-2.5">DIST. SPRINT (&gt;25)</th>
                                <th className="px-1 py-2.5">VEL. MÁXIMA</th>
                                <th className="px-1 py-2.5">ACC/DECC AI</th>
                              </tr>
                            </thead>
                            <tbody className="text-[7.5px] font-sans font-bold text-slate-900">
                              {gpsByPositionData.map((row: any, idx: number) => {
                                const pos = row.posicion;
                                const theme = {
                                  'ARQUERO': { bg: 'bg-amber-50', text: 'text-amber-800' },
                                  'DEFENSA': { bg: 'bg-blue-50', text: 'text-blue-800' },
                                  'MEDIOCAMPO': { bg: 'bg-emerald-50', text: 'text-emerald-800' },
                                  'DELANTERO': { bg: 'bg-rose-50', text: 'text-rose-800' },
                                }[pos as string] || { bg: 'bg-slate-50', text: 'text-slate-800' };

                                return (
                                  <tr key={`gps-pos-${idx}`} className="border-b border-slate-50 hover:bg-slate-50/50">
                                    <td className="px-4 py-2 text-left font-black text-[#0b1220]">
                                      <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-wider ${theme.bg} ${theme.text}`}>
                                        {pos}
                                      </span>
                                    </td>
                                    <td className="px-1 py-2 text-slate-500 font-sans font-bold text-center">
                                      {row.count} {row.count === 1 ? 'Jugador' : 'Jugadores'}
                                    </td>
                                    <td className="px-1 py-2 text-slate-400 font-bold font-mono">{row.minutos.toFixed(0)}'</td>
                                    <td className="px-1 py-2 text-slate-900 font-mono font-black">{row.dist_total_m.toFixed(0)} m</td>
                                    <td className="px-1 py-2 text-red-500 bg-red-50/35 font-mono font-black">{row.m_por_min.toFixed(1)}</td>
                                    <td className="px-1 py-2 text-[#02428c] font-mono font-bold">{row.dist_mai_m_20_kmh.toFixed(0)} m</td>
                                    <td className="px-1 py-2 text-emerald-600 font-mono font-bold">{row.dist_ai_m_15_kmh.toFixed(0)} m</td>
                                    <td className="px-1 py-2 text-indigo-600 font-mono font-bold">{row.dist_sprint_m_25_kmh.toFixed(0)} m</td>
                                    <td className="px-1 py-2 text-red-655 font-extrabold font-mono">{row.vel_max_kmh.toFixed(1)} km/h</td>
                                    <td className="px-1 py-2 text-slate-700 font-mono font-bold">{row.acc_decc_ai_n.toFixed(1)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </section>
                    </div>
                    <PrintFooter page={gpsByPositionPageNo} />
                  </div>

                  {/* HOJA DE PRONÓSTICO / COMPARATIVA DE CARGA */}
                  <div className="print-page-section font-sans text-slate-900 flex flex-col justify-between bg-white">
                    <div>
                      <PrintHeader 
                        selectedDate={selectedDate} 
                        selectedCategory={selectedCategories.length === Object.values(Category).length ? 'TODAS LAS CATEGORÍAS' : selectedCategories[0]} 
                        activeMicrocycle={activeMicrocycle} 
                        page={comparePageNo} 
                        total={totalPages} 
                      />
                      
                      <section className="mt-4 text-slate-900">
                        <h3 className="text-xs font-black text-slate-900 border-l-4 border-red-650 pl-3 mb-4 uppercase tracking-widest italic">
                          {comparePageNo}._ COMPARATIVA CLASIFICATORIA: PRONÓSTICO DE CARGA (PREDICTIVO VS REAL)
                        </h3>
                        
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-6">
                          * TABLA DE CONTRASTE ESTRUCTURADA ESTRICTAMENTE EN 3 COLUMNAS PARA VALIDAR LA PLANIFICACIÓN PREDICTIVA VERSUS LA REALIDAD FÍSICA CUANTIFICADA.
                        </p>

                        <div className="overflow-hidden rounded-2xl border border-slate-100 shadow-sm max-w-4xl mx-auto">
                          <table className="w-full text-center border-collapse bg-white">
                            <thead className="bg-[#0b1220] text-white text-[9px] font-black uppercase tracking-[0.15em] h-12">
                              <tr>
                                <th className="px-6 py-3 text-left w-2/5">PARÁMETRO</th>
                                <th className="px-6 py-3 border-x border-slate-800 w-1/3">PRONÓSTICO</th>
                                <th className="px-6 py-3 w-1/4">VALORES (PROMEDIOS REALES)</th>
                              </tr>
                            </thead>
                            <tbody className="text-[11px] font-black uppercase text-slate-800">
                              {gpsParameters.map((param, index) => {
                                const dayIdx = getDayIndex();
                                const intensity = (dayIdx !== -1 && dayIntensities) ? (dayIntensities[dayIdx] || 'Media') : 'Media';

                                const getParamMapping = (paramName: string) => {
                                  if (paramName.includes('Distancia Total')) {
                                    return {
                                      metricId: 'dist_total_m',
                                      realValue: reportData.gpsAvg?.dist || 0,
                                      unit: 'm'
                                    };
                                  }
                                  if (paramName.includes('Distancia HSR')) {
                                    return {
                                      metricId: 'dist_ai_m_15_kmh',
                                      realValue: reportData.gpsAvg?.hsr || 0,
                                      unit: 'm'
                                    };
                                  }
                                  if (paramName.includes('Distancia Sprint')) {
                                    return {
                                      metricId: 'dist_sprint_m_25_kmh',
                                      realValue: reportData.gpsAvg?.sprint || 0,
                                      unit: 'm'
                                    };
                                  }
                                  if (paramName.includes('Acc/Decc')) {
                                    return {
                                      metricId: 'acc_decc_ai_n',
                                      realValue: reportData.gpsAvg?.acc || 0,
                                      unit: ''
                                    };
                                  }
                                  return null;
                                };

                                const mapping = getParamMapping(param.name);
                                const percentage = (mapping && dayIdx !== -1 && plannedValues) ? (plannedValues[`${dayIdx}_${mapping.metricId}`] || 0) : 0;
                                const factor = 1 + (percentage / 100);
                                
                                let baseRange = null;
                                let adjustedRange = null;
                                let statusBadge = null;

                                if (mapping) {
                                  baseRange = METRIC_FALLBACKS[mapping.metricId]?.[intensity as 'Baja' | 'Media' | 'Alta'] || [0, 0, 0];
                                  adjustedRange = [
                                    Math.round(baseRange[0] * factor),
                                    Math.round(baseRange[1] * factor),
                                    Math.round(baseRange[2] * factor)
                                  ];
                                  
                                  const [adjP25, adjP50, adjP75] = adjustedRange;
                                  const realVal = mapping.realValue;

                                  if (realVal > 0 && (adjP25 >= 0 && adjP75 > 0)) {
                                    if (realVal >= adjP25 && realVal <= adjP75) {
                                      statusBadge = {
                                        text: 'EN RANGO ÓPTIMO',
                                        style: 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      };
                                    } else if (realVal < adjP25) {
                                      if (realVal < 0.7 * adjP25) {
                                        statusBadge = {
                                          text: 'MUY BAJO',
                                          style: 'bg-blue-50 text-blue-700 border border-blue-200'
                                        };
                                      } else {
                                        statusBadge = {
                                          text: 'CARGA BAJA',
                                          style: 'bg-amber-50 text-amber-700 border border-amber-200'
                                        };
                                      }
                                    } else {
                                      if (realVal <= 1.15 * adjP75) {
                                        statusBadge = {
                                          text: 'CARGA ELEVADA',
                                          style: 'bg-orange-50 text-orange-700 border border-orange-200'
                                        };
                                      } else {
                                        statusBadge = {
                                          text: 'SOBRECARGA',
                                          style: 'bg-red-50 text-red-700 border border-red-200'
                                        };
                                      }
                                    }
                                  }
                                }

                                return (
                                  <tr key={`param-p5-${index}`} className="border-b border-slate-100 h-13 hover:bg-slate-50/50">
                                    <td className="px-6 py-3 text-left text-slate-900 font-bold">{param.name}</td>
                                    <td className="px-6 py-3 border-x border-slate-100 bg-slate-50/20">
                                      {mapping && adjustedRange ? (
                                        <div className="flex flex-col items-center justify-center py-1.5">
                                          {statusBadge && (
                                            <div className="mb-1">
                                              <span className={`text-[10px] font-black px-2.5 py-0.5 rounded uppercase tracking-wider ${statusBadge.style}`}>
                                                {statusBadge.text}
                                              </span>
                                            </div>
                                          )}
                                          <span className="text-[10.5px] font-bold text-slate-600 uppercase tracking-wide">
                                            RANGO ÓPTIMO: {adjustedRange[0]} - {adjustedRange[2]} {mapping.unit}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-[10px] text-slate-400 italic font-medium">—</span>
                                      )}
                                    </td>
                                    <td className="px-6 py-3 text-[#02428c] font-black italic bg-blue-50/20 font-mono">{param.value}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </section>
                    </div>
                    <PrintFooter page={comparePageNo} />
                  </div>

                  {/* NUEVA HOJA: PRONÓSTICO DEL DÍA SIGUIENTE */}
                  <div className="print-page-section font-sans text-slate-900 flex flex-col justify-between bg-white">
                    <div>
                      <PrintHeader 
                        selectedDate={getNextDayDate(selectedDate)} 
                        selectedCategory={selectedCategories.length === Object.values(Category).length ? 'TODAS LAS CATEGORÍAS' : selectedCategories[0]} 
                        activeMicrocycle={activeMicrocycle} 
                        page={nextDayForecastPageNo} 
                        total={totalPages} 
                      />
                      
                      <section className="mt-4 text-slate-900">
                        <h3 className="text-xs font-black text-slate-900 border-l-4 border-red-650 pl-3 mb-4 uppercase tracking-widest italic flex items-center justify-between">
                          <span>{nextDayForecastPageNo}._ PRONÓSTICO DE CARGA PREVENTIVA PARA MAÑANA ({getNextDayFormatted(selectedDate)})</span>
                          <span className={`px-2.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                            nextIntensity === 'Alta' ? 'bg-red-50 text-red-700 border border-red-200' :
                            nextIntensity === 'Media' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            INTENSIDAD PLANIFICADA: {nextIntensity}
                          </span>
                        </h3>
                        
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-6">
                          * PLANIFICACIÓN FÍSICA PREDICTIVA Y OBJETIVOS DE CARGA EXTERNA SELECCIONADOS PARA LA PRÓXIMA JORNADA DE ENTRENAMIENTO.
                        </p>

                        <div className="grid grid-cols-4 gap-3 mt-6 mb-6">
                          {nextDayGpsParams.map((param: any, idx: number) => {
                            return (
                              <div key={`next-param-${idx}`} className="p-4 rounded-xl border border-slate-100 bg-slate-50/30 flex flex-col justify-between">
                                <div className="text-[8px] font-black text-slate-500 uppercase tracking-wider mb-2 leading-snug">
                                  {param.name}
                                </div>
                                <div>
                                  <div className="text-[13px] font-black text-[#0b1220] font-mono tracking-tight">
                                    {param.range}
                                  </div>
                                  <div className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                                    DIFERENCIAL: {param.percentage > 0 ? `+${param.percentage}%` : `${param.percentage}%`}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    </div>
                    <PrintFooter page={nextDayForecastPageNo} />
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ESTILOS GLOBALES DE IMPRESIÓN */}
      <style>{`
        /* UNIFY ALL FONTS FOR PRINT AND SCREEN PDF VIEW */
        @media screen, print {
          .print-page-section,
          .print-page-section * {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
          }
          
          /* Specific overrides for Bebas Neue and Mono font tags */
          .font-bebas, 
          .font-bebas *,
          [class*="font-['Bebas_Neue']"],
          [class*="font-['Bebas_Neue']"] *,
          [class*="font-bebas"],
          [class*="font-bebas"] * {
            font-family: 'Bebas Neue', 'Inter', -apple-system, sans-serif !important;
          }

          .font-mono,
          .font-mono *,
          [class*="font-mono"],
          [class*="font-mono"] * {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
          }
        }

        @media screen {
          .print-page-section {
            width: 100% !important;
            max-width: 1122px !important; /* Ancho de un A4 Landscape */
            aspect-ratio: 297 / 210 !important; /* Proporción horizontal exacta de A4 */
            margin: 0 auto 24px auto !important;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06) !important;
            border-radius: 20px !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            padding: 24px !important;
            background-color: white;
            overflow: hidden !important;
            position: relative !important;
          }
          .print-page-section.bg-\\[\\#0b1220\\] {
            background-color: #0b1220 !important;
          }
          .print-page-section.bg-\\[\\#961215\\] {
            background-color: #961215 !important;
            background: #961215 !important;
          }
        }

        @media print {
          body { background: white !important; margin: 0; padding: 0; overflow: visible !important; }
          aside, nav, header, footer, .sidebar, .navbar, .ai-chat-button, .print\\:hidden { display: none !important; }
          
          main, #root, #root > div, .flex-1 {
            display: block !important;
            position: static !important;
            overflow: visible !important;
            height: auto !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          
          .print-page-section {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            position: relative !important;
            height: 210mm !important; /* Alto completo de A4 */
            width: 297mm !important;  /* Ancho completo de A4 */
            margin: 0 auto !important;
            padding: 8mm !important;
            background: white !important;
            border: none !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
          }
          .print-page-section.bg-\\[\\#961215\\] {
            background-color: #961215 !important;
            background: #961215 !important;
          }

          table { page-break-inside: avoid !important; }
          tr { page-break-inside: avoid !important; break-inside: avoid !important; }

          .print-page-section:last-child { 
            break-after: auto !important; 
          }
          
          * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
          
          @page { 
            size: A4 landscape; 
            margin: 0; 
          }
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
}

// Subcomponente de Encabezado para Impresión (Rediseñado FIFA-Style con Diagonales, Compacto)
function PrintHeader({ selectedDate, selectedCategory, activeMicrocycle, page, total }: any) {
  const formatCategoryLabel = (idOrName: any) => {
    if (typeof idOrName === 'string' && isNaN(Number(idOrName))) return idOrName.toUpperCase().replace('_', ' ');
    const entry = Object.entries(CATEGORY_ID_MAP).find(([_, val]) => Number(val) === Number(idOrName));
    return entry ? entry[0].toUpperCase().replace('_', ' ') : 'N/A';
  };

  const microNumber = activeMicrocycle?.micro_number || activeMicrocycle?.id || '—';
  const location = activeMicrocycle?.city || 'SANTIAGO';

  const dateDisplay = useMemo(() => {
    try {
      const d = new Date(selectedDate + 'T12:00:00');
      const weekday = d.toLocaleDateString('es-ES', { weekday: 'long' });
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)} ${day}/${month}`;
    } catch { return selectedDate; }
  }, [selectedDate]);

  return (
    <div className="mb-3 font-sans">
      {/* Top Graphic Bar */}
      <div className="flex items-center h-14 relative overflow-hidden">
        {/* Blue Segment */}
        <div className="bg-[#02428c] h-full flex items-center px-6 relative z-20 min-w-[280px]" style={{ clipPath: 'polygon(0 0, 92% 0, 100% 100%, 0% 100%)' }}>
          <span className="text-2xl font-black text-white uppercase italic tracking-tighter whitespace-nowrap font-['Bebas_Neue']">
            {dateDisplay}
          </span>
        </div>
        
        {/* Red Segment */}
        <div className="bg-[#e2231a] h-full w-16 -ml-8 relative z-10 shadow-lg" style={{ clipPath: 'polygon(25% 0, 100% 0, 75% 100%, 0% 100%)' }}></div>
        
        {/* Logo Section */}
        <div className="flex items-center gap-4 ml-8">
          <div className="w-14 h-14 flex items-center justify-center p-1 bg-white rounded-full shadow-md">
            <img 
              src={getDriveDirectLink(FEDERATION_LOGO)} 
              alt="Logo" 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="h-8 w-[2px] bg-slate-200"></div>
          <div className="flex flex-col">
            <h2 className="text-lg font-black text-[#02428c] uppercase tracking-tighter leading-tight font-['Bebas_Neue']">
              SELECCIÓN NACIONAL
            </h2>
            <span className="text-lg font-black text-red-600 uppercase tracking-tighter leading-none font-['Bebas_Neue']">
              {formatCategoryLabel(selectedCategory)}
            </span>
          </div>
        </div>
      </div>

      {/* Metadata Section */}
      <div className="mt-3 px-6 border-b-2 border-[#02428c] pb-1.5">
        <div className="grid grid-cols-3 gap-6">
          <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-[#02428c]"></div>
             <span className="text-[10px] font-black text-slate-900 uppercase">MICROCICLO</span>
             <div className="h-3 w-px bg-slate-300"></div>
             <span className="text-xs font-black text-red-600">#{microNumber}</span>
          </div>
          <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-[#02428c]"></div>
             <span className="text-[10px] font-black text-slate-900 uppercase">SESIÓN</span>
             <div className="h-3 w-px bg-slate-300"></div>
             <span className="text-xs font-black text-red-600">AM</span>
          </div>
          <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-[#02428c]"></div>
             <span className="text-[10px] font-black text-slate-900 uppercase">LUGARES</span>
             <div className="h-3 w-px bg-slate-300"></div>
             <span className="text-xs font-black text-red-600 truncate">{location.toUpperCase()}</span>
          </div>
        </div>
      </div>
      
      <div className="mt-1 flex justify-end px-6">
         <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">
           HOJA {page} / {total} — GENERADO EL {new Date().toLocaleDateString()}
         </span>
      </div>
    </div>
  );
}

function PrintFooter({ page }: { page: number }) {
  return (
    <div className="absolute bottom-4 left-10 right-10 border-t border-slate-100 pt-1">
      <div className="flex justify-between items-center">
        <p className="text-[5px] font-black text-slate-300 uppercase tracking-[0.2em]">Documento Confidencial • Área Física Selección Nacional • © 2026</p>
        <div className="flex items-center gap-4">
          <p className="text-[7px] font-black text-slate-300 italic tracking-widest">CMSPORTECH.COM</p>
          <p className="text-[6px] font-black text-slate-900">Pág {page}</p>
        </div>
      </div>
    </div>
  );
}

function KPIReportCard({ label, value, icon }: { label: string, value: string | number, icon: string }) {
  return (
    <div className="bg-slate-50 p-1.5 rounded-[15px] border border-slate-100 flex items-center gap-2 transition-all print:h-10 shadow-sm">
      <div className="w-5 h-5 bg-white text-red-600 rounded-full flex items-center justify-center text-[10px] shadow-sm border border-slate-50">
        <i className={`fa-solid ${icon}`}></i>
      </div>
      <div>
        <p className="text-[4px] font-black text-slate-400 uppercase tracking-[0.15em] leading-none mb-0.5">{label}</p>
        <p className="text-[10px] font-black italic tracking-tighter text-[#0b1220] leading-none">{value}</p>
      </div>
    </div>
  );
}
