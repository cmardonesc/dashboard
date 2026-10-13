import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Category, CATEGORY_ID_MAP } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FEDERATION_LOGO } from '../constants';
import { getDriveDirectLink } from '../lib/utils';
import { MOCK_PLAYERS } from '../mockData';

interface ReporteMicrocicloAreaProps {
  userRole?: string;
  userClub?: string;
  userClubId?: number | null;
  clubs?: any[];
  performanceRecords?: any[];
}

const CATEGORY_LABELS: Record<Category, string> = {
  [Category.SUB_13]: 'SUB 13',
  [Category.SUB_14]: 'SUB 14',
  [Category.SUB_15]: 'SUB 15',
  [Category.SUB_16]: 'SUB 16',
  [Category.SUB_17]: 'SUB 17',
  [Category.SUB_18]: 'SUB 18',
  [Category.SUB_20]: 'SUB 20',
  [Category.SUB_21]: 'SUB 21',
  [Category.SUB_23]: 'SUB 23',
  [Category.ADULTA]: 'ADULTA / ABSOLUTA',
};

// Target reference ranges per intensity tier
const METRIC_FORECAST_TARGETS: Record<string, { Baja: string; Media: string; Alta: string; minMedia: number; maxMedia: number }> = {
  dist_total_m: { Baja: '3000 - 5000 M', Media: '5000 - 8000 M', Alta: '8000 - 12000 M', minMedia: 5000, maxMedia: 8000 },
  dist_ai_m_15_kmh: { Baja: '100 - 300 M', Media: '300 - 700 M', Alta: '700 - 1400 M', minMedia: 300, maxMedia: 700 },
  dist_mai_m_20_kmh: { Baja: '20 - 80 M', Media: '80 - 180 M', Alta: '180 - 350 M', minMedia: 80, maxMedia: 180 },
  dist_sprint_m_25_kmh: { Baja: '0 - 20 M', Media: '20 - 60 M', Alta: '60 - 150 M', minMedia: 20, maxMedia: 60 },
  acc_decc_ai_n: { Baja: '40 - 80 N', Media: '80 - 140 N', Alta: '140 - 220 N', minMedia: 80, maxMedia: 140 },
  player_load: { Baja: '150 - 300 UA', Media: '300 - 500 UA', Alta: '500 - 800 UA', minMedia: 300, maxMedia: 500 },
  pse: { Baja: '2.0 - 5.0', Media: '5.0 - 7.5', Alta: '7.5 - 10.0', minMedia: 5.0, maxMedia: 7.5 }
};

export const ReporteMicrocicloArea: React.FC<ReporteMicrocicloAreaProps> = ({
  userRole,
  userClub,
  userClubId,
  clubs = [],
  performanceRecords = [],
}) => {
  const [loading, setLoading] = useState(true);
  const [categories] = useState<Category[]>(Object.values(Category));
  const [selectedCategory, setSelectedCategory] = useState<Category>(Category.SUB_17);
  const [microcycles, setMicrocycles] = useState<any[]>([]);
  const [selectedMicrocycle, setSelectedMicrocycle] = useState<any | null>(null);

  // Raw data
  const [gpsData, setGpsData] = useState<any[]>([]);
  const [wellnessData, setWellnessData] = useState<any[]>([]);
  const [checkoutData, setCheckoutData] = useState<any[]>([]);
  const [tasksData, setTasksData] = useState<any[]>([]);
  const [matchesData, setMatchesData] = useState<any[]>([]);
  const [medicalData, setMedicalData] = useState<any[]>([]);
  const [playersList, setPlayersList] = useState<any[]>([]);

  // Selected Day Filter for Section 6 (Forecast vs Real)
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('ALL');

  // 1. Fetch Microcycles & Players
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [mcRes, pRes, profRes] = await Promise.all([
        supabase.from('microcycles').select('*').order('start_date', { ascending: false }),
        supabase.from('players').select('*'),
        supabase.from('profiles').select('*')
      ]);

      if (mcRes.data && mcRes.data.length > 0) {
        setMicrocycles(mcRes.data);
        setSelectedMicrocycle(mcRes.data[0]);
        const foundCat = Object.entries(CATEGORY_ID_MAP).find(([_, v]) => v === mcRes.data[0].category_id)?.[0] as Category;
        if (foundCat) setSelectedCategory(foundCat);
      }

      const combinedPlayers: any[] = [];
      if (pRes.data) combinedPlayers.push(...pRes.data);
      if (profRes.data) {
        profRes.data.forEach(prof => {
          if (!combinedPlayers.some(p => p.player_id === prof.player_id || p.id === prof.id)) {
            combinedPlayers.push(prof);
          }
        });
      }
      setPlayersList(combinedPlayers);
    } catch (err) {
      console.error("Error fetching initial microcycles data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Comprehensive player lookup map (numeric + string IDs)
  const playerMap = useMemo(() => {
    const map = new Map<number | string, any>();

    // 1. MOCK_PLAYERS
    MOCK_PLAYERS.forEach(mp => {
      if (mp.player_id) map.set(Number(mp.player_id), mp);
      if (mp.id) map.set(String(mp.id), mp);
    });

    // 2. performanceRecords prop
    performanceRecords.forEach(pr => {
      if (pr.player?.player_id) {
        map.set(Number(pr.player.player_id), pr.player);
        map.set(String(pr.player.player_id), pr.player);
      }
      if (pr.player?.id) {
        map.set(String(pr.player.id), pr.player);
      }
    });

    // 3. Database players & profiles
    playersList.forEach(p => {
      if (p.player_id) {
        map.set(Number(p.player_id), p);
        map.set(String(p.player_id), p);
      }
      if (p.id) {
        map.set(String(p.id), p);
      }
    });

    return map;
  }, [playersList, performanceRecords]);

  // Helper to format player names cleanly
  const getPlayerName = (pId: any, fallbackStr?: string): string => {
    if (!pId) return fallbackStr || 'Atleta';
    const numId = Number(pId);

    const p = playerMap.get(numId) || playerMap.get(String(pId));
    if (p) {
      const fn = p.nombre || p.nombre_completo || p.name;
      const ln = p.apellido1 || p.apellido || '';
      if (fn && ln) return `${fn} ${ln}`.trim();
      if (fn) return fn.trim();
      if (p.name) return p.name.trim();
    }

    if (fallbackStr && !fallbackStr.toLowerCase().includes('atleta #') && !fallbackStr.toLowerCase().includes('jugador #')) {
      return fallbackStr;
    }

    return `Atleta #${pId}`;
  };

  const categoryMicrocycles = useMemo(() => {
    const catId = CATEGORY_ID_MAP[selectedCategory];
    return microcycles.filter(m => m.category_id === catId);
  }, [microcycles, selectedCategory]);

  useEffect(() => {
    if (categoryMicrocycles.length > 0) {
      if (!selectedMicrocycle || selectedMicrocycle.category_id !== CATEGORY_ID_MAP[selectedCategory]) {
        setSelectedMicrocycle(categoryMicrocycles[0]);
      }
    } else {
      setSelectedMicrocycle(null);
    }
  }, [selectedCategory, categoryMicrocycles]);

  // 2. Fetch Microcycle Detailed Data
  useEffect(() => {
    if (selectedMicrocycle) {
      fetchMicrocycleDetails(selectedMicrocycle);
    } else {
      setGpsData([]);
      setWellnessData([]);
      setCheckoutData([]);
      setTasksData([]);
      setMatchesData([]);
      setMedicalData([]);
    }
  }, [selectedMicrocycle]);

  const fetchMicrocycleDetails = async (mc: any) => {
    setLoading(true);
    const startDate = mc.start_date.split('T')[0];
    const endDate = mc.end_date.split('T')[0];

    try {
      const [gpsRes, wellRes, checkRes, tasksRes, matchRes, medRes] = await Promise.all([
        supabase.from('gps_tareas').select('*').gte('fecha', startDate).lte('fecha', endDate),
        supabase.from('wellness_checkin').select('*').gte('checkin_date', startDate).lte('checkin_date', endDate),
        supabase.from('internal_load').select('*').gte('session_date', startDate).lte('session_date', endDate),
        supabase.from('cronograma').select('*').gte('fecha', startDate).lte('fecha', endDate),
        supabase.from('partidos').select('*').gte('fecha', startDate).lte('fecha', endDate),
        supabase.from('fisioterapia_atenciones').select('*').gte('fecha_atencion', startDate).lte('fecha_atencion', endDate)
      ]);

      let finalGps = gpsRes.data || [];
      if (finalGps.length === 0) {
        const fallbackGps = await supabase.from('gps_import').select('*').gte('fecha', startDate).lte('fecha', endDate);
        finalGps = fallbackGps.data || [];
      }

      setGpsData(finalGps);
      setWellnessData(wellRes.data || []);
      setCheckoutData(checkRes.data || []);
      setTasksData(tasksRes.data || []);
      setMatchesData(matchRes.data || []);
      setMedicalData(medRes.data || []);
    } catch (err) {
      console.error("Error fetching microcycle detailed records:", err);
    } finally {
      setLoading(false);
    }
  };

  const daysCount = useMemo(() => {
    if (!selectedMicrocycle) return 0;
    const s = new Date(selectedMicrocycle.start_date + 'T00:00:00');
    const e = new Date(selectedMicrocycle.end_date + 'T00:00:00');
    const diff = Math.abs(e.getTime() - s.getTime());
    return Math.ceil(diff / (1000 * 3600 * 24)) + 1;
  }, [selectedMicrocycle]);

  const microcycleDates = useMemo(() => {
    if (!selectedMicrocycle) return [];
    const dates: string[] = [];
    const cur = new Date(selectedMicrocycle.start_date + 'T00:00:00');
    for (let i = 0; i < daysCount; i++) {
      const year = cur.getFullYear();
      const month = String(cur.getMonth() + 1).padStart(2, '0');
      const day = String(cur.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  }, [selectedMicrocycle, daysCount]);

  // CUMULATIVE PLAYER TOTALS
  const playerTotals = useMemo(() => {
    const map = new Map<number, {
      player_id: number;
      name: string;
      club: string;
      id_club?: number;
      posicion?: string;
      dist_total_m: number;
      dist_mai_m_20_kmh: number;
      dist_sprint_m_25_kmh: number;
      player_load: number;
      acc_decc_ai_n: number;
      sessionsCount: number;
    }>();

    gpsData.forEach(r => {
      const pId = Number(r.player_id);
      if (!pId || isNaN(pId)) return;

      const name = getPlayerName(pId, r.jugador_nombre || r.nombre_jugador);
      const pInfo = playerMap.get(pId);
      const club = pInfo?.club || r.club || 'La Roja';
      const id_club = pInfo?.id_club;
      const posicion = pInfo?.posicion || r.posicion || 'JUG';

      if (!map.has(pId)) {
        map.set(pId, {
          player_id: pId,
          name,
          club,
          id_club,
          posicion,
          dist_total_m: 0,
          dist_mai_m_20_kmh: 0,
          dist_sprint_m_25_kmh: 0,
          player_load: 0,
          acc_decc_ai_n: 0,
          sessionsCount: 0
        });
      }

      const item = map.get(pId)!;
      item.dist_total_m += Number(r.dist_total_m || r.distancia_total_m || 0);
      item.dist_mai_m_20_kmh += Number(r.dist_mai_m_20_kmh || r.hsr_m || 0);
      item.dist_sprint_m_25_kmh += Number(r.dist_sprint_m_25_kmh || r.sprint_m || 0);
      item.player_load += Number(r.player_load || r.carga_mecanica || 0);
      item.acc_decc_ai_n += Number(r.acc_decc_ai_n || r.aceleraciones_alta || 0);
      item.sessionsCount += 1;
    });

    return Array.from(map.values());
  }, [gpsData, playerMap]);

  const top3Distancia = useMemo(() => [...playerTotals].sort((a, b) => b.dist_total_m - a.dist_total_m).slice(0, 3), [playerTotals]);
  const top3HSR = useMemo(() => [...playerTotals].sort((a, b) => b.dist_mai_m_20_kmh - a.dist_mai_m_20_kmh).slice(0, 3), [playerTotals]);
  const top3Sprint = useMemo(() => [...playerTotals].sort((a, b) => b.dist_sprint_m_25_kmh - a.dist_sprint_m_25_kmh).slice(0, 3), [playerTotals]);
  const top3PlayerLoad = useMemo(() => [...playerTotals].sort((a, b) => b.player_load - a.player_load).slice(0, 3), [playerTotals]);
  const top3AccDec = useMemo(() => [...playerTotals].sort((a, b) => b.acc_decc_ai_n - a.acc_decc_ai_n).slice(0, 3), [playerTotals]);

  // DAILY GPS AVERAGES
  const dailyGpsAverages = useMemo(() => {
    return microcycleDates.map((dateStr, idx) => {
      const recordsForDate = gpsData.filter(r => r.fecha?.startsWith(dateStr));
      const count = recordsForDate.length;

      const dateObj = new Date(dateStr + 'T12:00:00');
      const dayNames = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
      const dayName = dayNames[dateObj.getDay()];
      const formattedDate = dateObj.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' });

      const mdLabel = `Día ${idx + 1}`;

      if (count === 0) {
        return {
          dateStr,
          dayName: `${dayName} ${formattedDate}`,
          mdLabel,
          hasData: false,
          dist_total_m: 0,
          dist_ai_m_15_kmh: 0,
          dist_mai_m_20_kmh: 0,
          dist_sprint_m_25_kmh: 0,
          acc_decc_ai_n: 0,
          player_load: 0,
          pse: 0,
          count: 0
        };
      }

      const dist_total_m = Math.round(recordsForDate.reduce((s, r) => s + Number(r.dist_total_m || r.distancia_total_m || 0), 0) / count);
      const dist_ai_m_15_kmh = Math.round(recordsForDate.reduce((s, r) => s + Number(r.dist_ai_m_15_kmh || 0), 0) / count);
      const dist_mai_m_20_kmh = Math.round(recordsForDate.reduce((s, r) => s + Number(r.dist_mai_m_20_kmh || r.hsr_m || 0), 0) / count);
      const dist_sprint_m_25_kmh = Math.round(recordsForDate.reduce((s, r) => s + Number(r.dist_sprint_m_25_kmh || r.sprint_m || 0), 0) / count);
      const acc_decc_ai_n = Math.round(recordsForDate.reduce((s, r) => s + Number(r.acc_decc_ai_n || r.aceleraciones_alta || 0), 0) / count);
      const player_load = Math.round(recordsForDate.reduce((s, r) => s + Number(r.player_load || r.carga_mecanica || 0), 0) / count);
      const pse = Number((recordsForDate.reduce((s, r) => s + Number(r.pse || 0), 0) / count).toFixed(1));

      return {
        dateStr,
        dayName: `${dayName} ${formattedDate}`,
        mdLabel,
        hasData: true,
        dist_total_m,
        dist_ai_m_15_kmh,
        dist_mai_m_20_kmh,
        dist_sprint_m_25_kmh,
        acc_decc_ai_n,
        player_load,
        pse,
        count
      };
    });
  }, [microcycleDates, gpsData]);

  // FORECAST VS REAL COMPARISON PER DAY (ALL PARAMETERS)
  const dailyForecastVsReal = useMemo(() => {
    return dailyGpsAverages.map(d => {
      // Determine intensity tier of day for forecast target
      let tier: 'Baja' | 'Media' | 'Alta' = 'Media';
      if (d.dist_total_m > 0) {
        if (d.dist_total_m < 4500) tier = 'Baja';
        else if (d.dist_total_m > 7500) tier = 'Alta';
      }

      const metricsList = [
        {
          id: 'dist_total_m',
          name: 'DISTANCIA TOTAL (M)',
          targetRange: METRIC_FORECAST_TARGETS.dist_total_m[tier],
          realVal: d.hasData ? `${d.dist_total_m.toLocaleString()} M` : 'SIN DATOS',
          numVal: d.dist_total_m,
          minVal: METRIC_FORECAST_TARGETS.dist_total_m.minMedia,
          maxVal: METRIC_FORECAST_TARGETS.dist_total_m.maxMedia,
          unit: 'M'
        },
        {
          id: 'dist_ai_m_15_kmh',
          name: 'DISTANCIA AI >15 KM/H (M)',
          targetRange: METRIC_FORECAST_TARGETS.dist_ai_m_15_kmh[tier],
          realVal: d.hasData ? `${d.dist_ai_m_15_kmh} M` : '-',
          numVal: d.dist_ai_m_15_kmh,
          minVal: METRIC_FORECAST_TARGETS.dist_ai_m_15_kmh.minMedia,
          maxVal: METRIC_FORECAST_TARGETS.dist_ai_m_15_kmh.maxMedia,
          unit: 'M'
        },
        {
          id: 'dist_mai_m_20_kmh',
          name: 'DISTANCIA HSR >21 KM/H (M)',
          targetRange: METRIC_FORECAST_TARGETS.dist_mai_m_20_kmh[tier],
          realVal: d.hasData ? `${d.dist_mai_m_20_kmh} M` : '-',
          numVal: d.dist_mai_m_20_kmh,
          minVal: METRIC_FORECAST_TARGETS.dist_mai_m_20_kmh.minMedia,
          maxVal: METRIC_FORECAST_TARGETS.dist_mai_m_20_kmh.maxMedia,
          unit: 'M'
        },
        {
          id: 'dist_sprint_m_25_kmh',
          name: 'DISTANCIA SPRINT >25 KM/H (M)',
          targetRange: METRIC_FORECAST_TARGETS.dist_sprint_m_25_kmh[tier],
          realVal: d.hasData ? `${d.dist_sprint_m_25_kmh} M` : '-',
          numVal: d.dist_sprint_m_25_kmh,
          minVal: METRIC_FORECAST_TARGETS.dist_sprint_m_25_kmh.minMedia,
          maxVal: METRIC_FORECAST_TARGETS.dist_sprint_m_25_kmh.maxMedia,
          unit: 'M'
        },
        {
          id: 'acc_decc_ai_n',
          name: 'ACC / DEC AI (N)',
          targetRange: METRIC_FORECAST_TARGETS.acc_decc_ai_n[tier],
          realVal: d.hasData ? `${d.acc_decc_ai_n} N` : '-',
          numVal: d.acc_decc_ai_n,
          minVal: METRIC_FORECAST_TARGETS.acc_decc_ai_n.minMedia,
          maxVal: METRIC_FORECAST_TARGETS.acc_decc_ai_n.maxMedia,
          unit: 'N'
        },
        {
          id: 'player_load',
          name: 'PLAYER LOAD (UA)',
          targetRange: METRIC_FORECAST_TARGETS.player_load[tier],
          realVal: d.hasData ? `${d.player_load} UA` : '-',
          numVal: d.player_load,
          minVal: METRIC_FORECAST_TARGETS.player_load.minMedia,
          maxVal: METRIC_FORECAST_TARGETS.player_load.maxMedia,
          unit: 'UA'
        },
        {
          id: 'pse',
          name: 'PSE / RPE (ESFUERZO 1-10)',
          targetRange: METRIC_FORECAST_TARGETS.pse[tier],
          realVal: d.hasData ? `${d.pse}` : '-',
          numVal: d.pse,
          minVal: METRIC_FORECAST_TARGETS.pse.minMedia,
          maxVal: METRIC_FORECAST_TARGETS.pse.maxMedia,
          unit: ''
        }
      ].map(m => {
        let status: 'EN RANGO ÓPTIMO' | 'SOBRECARGA' | 'SUBCARGA' = 'EN RANGO ÓPTIMO';
        let badgeColor = 'bg-emerald-100 text-emerald-800';

        if (d.hasData && m.numVal > 0) {
          if (m.numVal > m.maxVal * 1.15) {
            status = 'SOBRECARGA';
            badgeColor = 'bg-red-100 text-red-800';
          } else if (m.numVal < m.minVal * 0.85) {
            status = 'SUBCARGA';
            badgeColor = 'bg-amber-100 text-amber-800';
          }
        }

        return { ...m, status, badgeColor };
      });

      return {
        dateStr: d.dateStr,
        dayName: d.dayName,
        mdLabel: d.mdLabel,
        hasData: d.hasData,
        tier,
        metricsList
      };
    });
  }, [dailyGpsAverages]);

  // POSITION TACTICAL GROUPING
  const positionAverages = useMemo(() => {
    const posGroups = ['VOLANTE', 'DEFENSA CENTRAL', 'DEFENSA LATERAL', 'CENTRO DELANTERO', 'DELANTERO EXTREMO', 'PORTERO'];
    
    return posGroups.map(posName => {
      const records = gpsData.filter(r => {
        const pInfo = playerMap.get(Number(r.player_id)) || playerMap.get(String(r.player_id));
        const pos = (pInfo?.posicion || r.posicion || '').toUpperCase();
        return pos.includes(posName.split(' ')[0]);
      });

      const count = records.length;
      if (count === 0) {
        return {
          posicion: posName,
          jugadores: 0,
          dist_total_m: 0,
          m_min: 0,
          dist_ai_15: 0,
          dist_hsr_20: 0,
          dist_sprint_25: 0,
          vel_max: 0,
          acc_dec: 0
        };
      }

      return {
        posicion: posName,
        jugadores: new Set(records.map(r => r.player_id)).size,
        dist_total_m: Math.round(records.reduce((s, r) => s + Number(r.dist_total_m || 0), 0) / count),
        m_min: Number((records.reduce((s, r) => s + Number(r.m_por_min || 65), 0) / count).toFixed(1)),
        dist_ai_15: Math.round(records.reduce((s, r) => s + Number(r.dist_ai_m_15_kmh || 0), 0) / count),
        dist_hsr_20: Math.round(records.reduce((s, r) => s + Number(r.dist_mai_m_20_kmh || 0), 0) / count),
        dist_sprint_25: Math.round(records.reduce((s, r) => s + Number(r.dist_sprint_m_25_kmh || 0), 0) / count),
        vel_max: Number((records.reduce((s, r) => s + Number(r.vel_max_kmh || 25), 0) / count).toFixed(1)),
        acc_dec: Math.round(records.reduce((s, r) => s + Number(r.acc_decc_ai_n || 0), 0) / count)
      };
    });
  }, [gpsData, playerMap]);

  // WELLNESS AVERAGES
  const wellnessAverages = useMemo(() => {
    if (wellnessData.length === 0) return { readinessAvg: 0, suenoAvg: 0, fatigaAvg: 0, dolorAvg: 0, totalReports: 0 };
    const n = wellnessData.length;
    return {
      readinessAvg: Math.round(wellnessData.reduce((s, w) => s + Number(w.readiness_score || w.readiness || 80), 0) / n),
      suenoAvg: Number((wellnessData.reduce((s, w) => s + Number(w.sueño || w.calidad_sueno || 7), 0) / n).toFixed(1)),
      fatigaAvg: Number((wellnessData.reduce((s, w) => s + Number(w.fatiga || 3), 0) / n).toFixed(1)),
      dolorAvg: Number((wellnessData.reduce((s, w) => s + Number(w.dolor_muscular || w.dolor || 2), 0) / n).toFixed(1)),
      totalReports: n
    };
  }, [wellnessData]);

  // CHECKOUT AVERAGES
  const checkoutAverages = useMemo(() => {
    if (checkoutData.length === 0) return { rpeAvg: 0, sRpeTotalAvg: 0, durationAvg: 0, totalReports: 0 };
    const n = checkoutData.length;
    const rpeSum = checkoutData.reduce((s, c) => s + Number(c.pse || c.rpe || 0), 0);
    const durSum = checkoutData.reduce((s, c) => s + Number(c.duration_minutes || c.duracion_min || 75), 0);
    const srpeSum = checkoutData.reduce((s, c) => s + (Number(c.pse || c.rpe || 0) * Number(c.duration_minutes || c.duracion_min || 75)), 0);

    return {
      rpeAvg: Number((rpeSum / n).toFixed(1)),
      durationAvg: Math.round(durSum / n),
      sRpeTotalAvg: Math.round(srpeSum / n),
      totalReports: n
    };
  }, [checkoutData]);

  // AUTOMATED NARRATIVE SUMMARY
  const summaryNarrative = useMemo(() => {
    if (!selectedMicrocycle) return "Selecciona un microciclo para generar el resumen narrativo.";

    const mcType = selectedMicrocycle.type || 'Especial';
    const mcNum = selectedMicrocycle.micro_number || selectedMicrocycle.id || 1;
    const daysStr = `${daysCount} días de entrenamiento`;

    const activeDaysWithGps = dailyGpsAverages.filter(d => d.hasData);
    let busiestDayText = "Sin registros GPS reportados en la semana";
    let busiestSprintDayText = "Sin picos de sprint registrados";

    if (activeDaysWithGps.length > 0) {
      const busiestDistDay = [...activeDaysWithGps].sort((a, b) => b.dist_total_m - a.dist_total_m)[0];
      busiestDayText = `${busiestDistDay.dayName} con un promedio de ${busiestDistDay.dist_total_m.toLocaleString()} m por jugador`;

      const busiestSprintDay = [...activeDaysWithGps].sort((a, b) => b.dist_sprint_m_25_kmh - a.dist_sprint_m_25_kmh)[0];
      busiestSprintDayText = `${busiestSprintDay.dayName} acumulando ${busiestSprintDay.dist_sprint_m_25_kmh} m de sprint (>25 km/h) y ${busiestSprintDay.dist_mai_m_20_kmh} m de alta velocidad (>21 km/h)`;
    }

    let topPlayerText = "No hay datos de jugadores registrados";
    if (playerTotals.length > 0) {
      const topGlobalPlayer = [...playerTotals].sort((a, b) => b.dist_total_m - a.dist_total_m)[0];
      topPlayerText = `${topGlobalPlayer.name} (${topGlobalPlayer.club}) con un total acumulado de ${topGlobalPlayer.dist_total_m.toLocaleString()} m, ${topGlobalPlayer.dist_mai_m_20_kmh.toLocaleString()} m de HSR y ${topGlobalPlayer.dist_sprint_m_25_kmh} m de Sprint`;
    }

    const numMatches = matchesData.length;
    const matchText = numMatches > 0
      ? `Durante el periodo se disputó ${numMatches} partido${numMatches > 1 ? 's' : ''}`
      : `No se disputaron partidos en este microciclo`;

    const numMedical = medicalData.length;
    const medicalText = numMedical > 0
      ? `se registraron ${numMedical} atenciones médico-fisioterapéuticas`
      : `no se reportaron incidencias médicas de gravedad`;

    return `El Microciclo #${mcNum} (${mcType}) completó ${daysStr}. La jornada de mayor carga de volumen fue ${busiestDayText}. La sesión de mayor estimulación neuromuscular y sprint máximo fue ${busiestSprintDayText}. A nivel individual, el atleta con mayor demanda acumulada global fue ${topPlayerText}. ${matchText} y ${medicalText}.`;
  }, [selectedMicrocycle, daysCount, dailyGpsAverages, playerTotals, matchesData, medicalData]);

  // MULTI-PAGE EXECUTIVE PDF EXPORT
  const handleExportPDF = () => {
    if (!selectedMicrocycle) return;

    const doc = new jsPDF('l', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;

    const brandRed = [139, 0, 0] as [number, number, number];
    const darkNavy = [11, 18, 32] as [number, number, number];

    const drawHeaderRibbon = (pageNum: number, totalPages: number, pageTitle: string) => {
      doc.setFillColor(darkNavy[0], darkNavy[1], darkNavy[2]);
      doc.rect(margin, 8, pageWidth - (margin * 2), 16, 'F');

      doc.setFillColor(brandRed[0], brandRed[1], brandRed[2]);
      doc.rect(margin, 8, 48, 16, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      const startStr = selectedMicrocycle.start_date.split('T')[0];
      doc.text(startStr, margin + 4, 18);

      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text('SELECCIÓN NACIONAL', margin + 54, 15);
      doc.setFontSize(8);
      doc.setTextColor(239, 68, 68);
      doc.text(CATEGORY_LABELS[selectedCategory], margin + 54, 20);

      doc.setFontSize(7);
      doc.setTextColor(200, 200, 200);
      doc.text(`• MICROCICLO #${selectedMicrocycle.micro_number || selectedMicrocycle.id}`, margin + 115, 18);
      doc.text(`• TIPO: ${selectedMicrocycle.type || 'Especial'}`, margin + 165, 18);
      doc.text(`• DÍAS: ${daysCount}`, margin + 215, 18);

      doc.setFontSize(6.5);
      doc.setTextColor(150, 150, 150);
      doc.text(`HOJA ${pageNum} / ${totalPages} - GENERADO EL ${new Date().toLocaleDateString('es-CL')}`, pageWidth - margin - 60, 12);
    };

    // PAGE 1: COVER PAGE
    doc.setFillColor(brandRed[0], brandRed[1], brandRed[2]);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    doc.setFillColor(255, 255, 255, 0.15);
    doc.roundedRect(pageWidth - margin - 35, 10, 35, 8, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text('CONFIDENCIAL', pageWidth - margin - 28, 15);

    doc.setFontSize(7);
    doc.text('LA ROJA PERFORMANCE HUB', margin, 15);

    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTE TÉCNICO DE RENDIMIENTO', pageWidth / 2, pageHeight / 2 - 10, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('MONITOREO CIENTÍFICO Y CONTROL DE CARGAS DEL MICROCICLO', pageWidth / 2, pageHeight / 2, { align: 'center' });

    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.5);
    doc.line(margin + 40, pageHeight / 2 + 8, pageWidth - margin - 40, pageHeight / 2 + 8);

    const metaY = pageHeight - 45;
    doc.setFontSize(7);
    doc.setTextColor(220, 220, 220);
    doc.text('PERIODO MICROCICLO', pageWidth / 4, metaY);
    doc.text('CATEGORÍA OFICIAL', pageWidth / 2, metaY, { align: 'center' });
    doc.text('MICROCICLO ACTIVO', (pageWidth * 3) / 4, metaY, { align: 'right' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`${selectedMicrocycle.start_date.split('T')[0]} - ${selectedMicrocycle.end_date.split('T')[0]}`, pageWidth / 4, metaY + 6);
    doc.text(CATEGORY_LABELS[selectedCategory], pageWidth / 2, metaY + 6, { align: 'center' });
    doc.text(`MICROCICLO #${selectedMicrocycle.micro_number || selectedMicrocycle.id}`, (pageWidth * 3) / 4, metaY + 6, { align: 'right' });

    doc.setFontSize(6);
    doc.setTextColor(200, 200, 200);
    doc.text('ELITE FOOTBALL PERFORMANCE PRO • AMB', margin, pageHeight - 8);
    doc.text('HOJA 1 / 6', pageWidth - margin - 15, pageHeight - 8);

    // PAGE 2: CHECK-IN WELLNESS WITH REAL NAMES
    doc.addPage('a4', 'l');
    drawHeaderRibbon(2, 6, 'EVALUACIÓN DE BIENESTAR DIARIO');

    let currentY = 32;
    doc.setFillColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.rect(margin, currentY, 3, 7, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('1._ SÍNTESIS EJECUTIVA Y PROMEDIO WELLNESS (CHECK-IN)', margin + 6, currentY + 5.5);

    currentY += 10;
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 18, 2, 2, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    const splitNarrative = doc.splitTextToSize(summaryNarrative, pageWidth - (margin * 2) - 8);
    doc.text(splitNarrative, margin + 4, currentY + 5);

    currentY += 22;
    const wellTableHead = ['ATLETA', 'FAT', 'SUE', 'DOL', 'EST', 'ÁNI', 'PROM', 'ESTADO'];
    const wellTableBody = wellnessData.slice(0, 14).map(w => {
      const name = getPlayerName(w.player_id, w.jugador_nombre || w.nombre_jugador);
      const prom = ((Number(w.fatiga || 3) + Number(w.sueño || 3) + Number(w.dolor || 3)) / 3).toFixed(1);
      return [name, w.fatiga || 4, w.sueño || 4, w.dolor || 4, w.estres || 4, w.animo || 4, prom, 'OK'];
    });

    autoTable(doc, {
      startY: currentY,
      head: [wellTableHead],
      body: wellTableBody.length > 0 ? wellTableBody : [['Sin datos de check-in', '-', '-', '-', '-', '-', '-', 'OK']],
      theme: 'grid',
      headStyles: { fillColor: [11, 18, 32], textColor: [255, 255, 255], fontSize: 7, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7 },
      margin: { left: margin, right: margin }
    });

    // PAGE 3: CHECK-OUT PSE WITH REAL NAMES
    doc.addPage('a4', 'l');
    drawHeaderRibbon(3, 6, 'CHECK-OUT PSE');

    currentY = 32;
    doc.setFillColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.rect(margin, currentY, 3, 7, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('2._ CONTROL DE CARGA INTERNA DE LA SESIÓN (PROMEDIOS CHECK-OUT PSE)', margin + 6, currentY + 5.5);

    const checkTableHead = ['ATLETA', 'SES', 'RPE', 'DUR (MIN)', 'CARGA (SRPE)', 'ESTADO'];
    const checkTableBody = checkoutData.slice(0, 16).map(c => {
      const name = getPlayerName(c.player_id, c.jugador_nombre || c.nombre_jugador);
      const rpe = Number(c.pse || c.rpe || 4);
      const dur = Number(c.duration_minutes || c.duracion_min || 75);
      return [name, '1', `${rpe.toFixed(1)}`, `${dur}'`, `${Math.round(rpe * dur)} ua`, 'OK'];
    });

    autoTable(doc, {
      startY: currentY + 10,
      head: [checkTableHead],
      body: checkTableBody.length > 0 ? checkTableBody : [['Sin datos de check-out', '-', '-', '-', '-', 'OK']],
      theme: 'grid',
      headStyles: { fillColor: [11, 18, 32], textColor: [255, 255, 255], fontSize: 7, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7 },
      margin: { left: margin, right: margin }
    });

    // PAGE 4: TOP 3 PODIO DE PARÁMETROS
    doc.addPage('a4', 'l');
    drawHeaderRibbon(4, 6, 'PODIO TOP 3');

    currentY = 32;
    doc.setFillColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.rect(margin, currentY, 3, 7, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('3._ PODIO Y TOP 3 DE PARÁMETROS EN SUMATORIA DEL MICROCICLO', margin + 6, currentY + 5.5);

    const topTableHead = ['PARÁMETRO', 'LÍDER #1 (ORO)', 'SEGUNDO #2 (PLATA)', 'TERCERO #3 (BRONCE)'];
    const topTableBody = [
      [
        'DISTANCIA TOTAL (M)',
        top3Distancia[0] ? `${top3Distancia[0].name} (${top3Distancia[0].dist_total_m.toLocaleString()} m)` : '-',
        top3Distancia[1] ? `${top3Distancia[1].name} (${top3Distancia[1].dist_total_m.toLocaleString()} m)` : '-',
        top3Distancia[2] ? `${top3Distancia[2].name} (${top3Distancia[2].dist_total_m.toLocaleString()} m)` : '-'
      ],
      [
        'HSR >21 KM/H (M)',
        top3HSR[0] ? `${top3HSR[0].name} (${top3HSR[0].dist_mai_m_20_kmh.toLocaleString()} m)` : '-',
        top3HSR[1] ? `${top3HSR[1].name} (${top3HSR[1].dist_mai_m_20_kmh.toLocaleString()} m)` : '-',
        top3HSR[2] ? `${top3HSR[2].name} (${top3HSR[2].dist_mai_m_20_kmh.toLocaleString()} m)` : '-'
      ],
      [
        'SPRINT >25 KM/H (M)',
        top3Sprint[0] ? `${top3Sprint[0].name} (${top3Sprint[0].dist_sprint_m_25_kmh.toLocaleString()} m)` : '-',
        top3Sprint[1] ? `${top3Sprint[1].name} (${top3Sprint[1].dist_sprint_m_25_kmh.toLocaleString()} m)` : '-',
        top3Sprint[2] ? `${top3Sprint[2].name} (${top3Sprint[2].dist_sprint_m_25_kmh.toLocaleString()} m)` : '-'
      ],
      [
        'PLAYER LOAD (UA)',
        top3PlayerLoad[0] ? `${top3PlayerLoad[0].name} (${top3PlayerLoad[0].player_load} ua)` : '-',
        top3PlayerLoad[1] ? `${top3PlayerLoad[1].name} (${top3PlayerLoad[1].player_load} ua)` : '-',
        top3PlayerLoad[2] ? `${top3PlayerLoad[2].name} (${top3PlayerLoad[2].player_load} ua)` : '-'
      ],
      [
        'ACC / DEC (ALTA INTENSIDAD)',
        top3AccDec[0] ? `${top3AccDec[0].name} (${top3AccDec[0].acc_decc_ai_n} n)` : '-',
        top3AccDec[1] ? `${top3AccDec[1].name} (${top3AccDec[1].acc_decc_ai_n} n)` : '-',
        top3AccDec[2] ? `${top3AccDec[2].name} (${top3AccDec[2].acc_decc_ai_n} n)` : '-'
      ]
    ];

    autoTable(doc, {
      startY: currentY + 10,
      head: [topTableHead],
      body: topTableBody,
      theme: 'grid',
      headStyles: { fillColor: [11, 18, 32], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      margin: { left: margin, right: margin }
    });

    // PAGE 5: COMPARATIVA PRONÓSTICO VS REAL DÍA POR DÍA (TODOS LOS PARÁMETROS)
    doc.addPage('a4', 'l');
    drawHeaderRibbon(5, 6, 'PRONÓSTICO VS REAL POR DÍA');

    currentY = 32;
    doc.setFillColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.rect(margin, currentY, 3, 7, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('4._ COMPARATIVA PRONÓSTICO VS REAL LOGRADO POR DÍA (TODOS LOS PARÁMETROS)', margin + 6, currentY + 5.5);

    dailyForecastVsReal.forEach((dayData) => {
      if (currentY > pageHeight - 45) {
        doc.addPage('a4', 'l');
        drawHeaderRibbon(5, 6, 'PRONÓSTICO VS REAL POR DÍA');
        currentY = 32;
      }

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(11, 18, 32);
      doc.text(`${dayData.mdLabel} - ${dayData.dayName.toUpperCase()}`, margin, currentY + 10);

      const dayHead = ['PARÁMETRO', 'PRONÓSTICO (META)', 'VALOR REAL LOGRADO', 'EVALUACIÓN'];
      const dayRows = dayData.metricsList.map(m => [
        m.name,
        m.targetRange,
        m.realVal,
        m.status
      ]);

      autoTable(doc, {
        startY: currentY + 12,
        head: [dayHead],
        body: dayRows,
        theme: 'grid',
        headStyles: { fillColor: [11, 18, 32], textColor: [255, 255, 255], fontSize: 7, fontStyle: 'bold' },
        bodyStyles: { fontSize: 7 },
        margin: { left: margin, right: margin }
      });

      currentY = (doc as any).lastAutoTable.finalY + 4;
    });

    // PAGE 6: DESEMPEÑO GPS POR POSICIÓN TÁCTICA
    doc.addPage('a4', 'l');
    drawHeaderRibbon(6, 6, 'POSICIÓN TÁCTICA');

    currentY = 32;
    doc.setFillColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.rect(margin, currentY, 3, 7, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('5._ DESEMPEÑO GPS PROMEDIO POR POSICIÓN TÁCTICA', margin + 6, currentY + 5.5);

    const posTableHead = ['POSICIÓN TÁCTICA', 'JUGADORES', 'DIST. TOTAL (M)', 'M/MIN', 'AI (>15 KM/H)', 'HSR (>20 KM/H)', 'SPRINT (>25 KM/H)', 'VEL. MÁXIMA', 'ACC/DEC AI'];
    const posTableBody = positionAverages.map(p => [
      p.posicion,
      `${p.jugadores} Jugadores`,
      `${p.dist_total_m.toLocaleString()} m`,
      `${p.m_min}`,
      `${p.dist_ai_15} m`,
      `${p.dist_hsr_20} m`,
      `${p.dist_sprint_25} m`,
      `${p.vel_max} km/h`,
      `${p.acc_dec}`
    ]);

    autoTable(doc, {
      startY: currentY + 10,
      head: [posTableHead],
      body: posTableBody,
      theme: 'striped',
      headStyles: { fillColor: [11, 18, 32], textColor: [255, 255, 255], fontSize: 7, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7 },
      margin: { left: margin, right: margin }
    });

    doc.save(`Reporte_Tecnico_Microciclo_${selectedCategory}_MC${selectedMicrocycle.micro_number || selectedMicrocycle.id}.pdf`);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* HEADER CONTROL BAR */}
      <div className="bg-[#0b1220] rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-white/5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center text-white text-xl shrink-0 shadow-lg shadow-red-900/30">
            <i className="fa-solid fa-shield-halved"></i>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-lg md:text-xl font-black text-white tracking-tight uppercase italic leading-none">
                REPORTE TÉCNICO DE RENDIMIENTO DEL MICROCICLO
              </h1>
              <span className="text-[9px] bg-red-600 text-white font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-md">
                {CATEGORY_LABELS[selectedCategory]}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Monitoreo científico, control de cargas acumuladas y análisis ejecutivo del microciclo.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Selector Categoría */}
          <div className="flex flex-col">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Categoría</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as Category)}
              className="bg-slate-900 border border-white/10 text-white font-bold text-xs rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-red-500"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
              ))}
            </select>
          </div>

          {/* Selector Microciclo */}
          <div className="flex flex-col">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Microciclo</label>
            <select
              value={selectedMicrocycle?.id || ''}
              onChange={(e) => {
                const mc = microcycles.find(m => String(m.id) === e.target.value);
                setSelectedMicrocycle(mc || null);
              }}
              className="bg-slate-900 border border-white/10 text-white font-bold text-xs rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-red-500 min-w-[180px]"
            >
              {categoryMicrocycles.length === 0 ? (
                <option value="">Sin microciclos registrados</option>
              ) : (
                categoryMicrocycles.map(m => (
                  <option key={m.id} value={m.id}>
                    MC #{m.micro_number || m.id} ({m.start_date.split('T')[0]})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Export PDF */}
          <button
            onClick={handleExportPDF}
            disabled={!selectedMicrocycle}
            className="bg-red-600 hover:bg-red-700 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-lg shadow-red-900/30 transition-all flex items-center gap-2 disabled:opacity-50 mt-4 md:mt-0"
          >
            <i className="fa-solid fa-file-pdf text-white"></i>
            <span>Exportar PDF Oficial</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-4">
          <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cargando reporte técnico de rendimiento...</p>
        </div>
      ) : !selectedMicrocycle ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
          <p className="text-sm font-bold text-slate-600">No hay datos de microciclo disponibles para mostrar.</p>
        </div>
      ) : (
        <>
          {/* SECTION 1: SÍNTESIS EJECUTIVA & TEXTO NARRATIVO */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-2.5 h-7 bg-[#0b1220] rounded-r-md"></div>
              <div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                  1._ SÍNTESIS EJECUTIVA Y TEXTO NARRATIVO DEL MICROCICLO
                </h2>
                <p className="text-[10px] text-slate-400 font-medium">Análisis descriptivo consolidado de los datos del periodo</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-slate-800 font-medium text-xs md:text-sm leading-relaxed">
              {summaryNarrative}
            </div>
          </div>

          {/* SECTION 2: PROMEDIO WELLNESS CHECK-IN CON NOMBRES REALES */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-7 bg-[#0b1220] rounded-r-md"></div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                    2._ EVALUACIÓN DE BIENESTAR DIARIO (PROMEDIOS CHECK-IN WELLNESS)
                  </h2>
                  <p className="text-[10px] text-slate-400 font-medium">{wellnessAverages.totalReports} registros matutinos reportados</p>
                </div>
              </div>

              <div className="flex gap-4 text-right">
                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase block">Readiness Prom.</span>
                  <span className="text-lg font-black text-emerald-600 italic">{wellnessAverages.readinessAvg}%</span>
                </div>
                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase block">Sueño Prom.</span>
                  <span className="text-lg font-black text-slate-900 italic">{wellnessAverages.suenoAvg} / 10</span>
                </div>
              </div>
            </div>

            {/* Wellness Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#0b1220] text-white uppercase text-[9px] font-black tracking-wider">
                    <th className="p-3 rounded-l-xl">Atleta</th>
                    <th className="p-3 text-center">Fatiga</th>
                    <th className="p-3 text-center">Sueño</th>
                    <th className="p-3 text-center">Dolor</th>
                    <th className="p-3 text-center">Estrés</th>
                    <th className="p-3 text-center">Ánimo</th>
                    <th className="p-3 text-center">Promedio</th>
                    <th className="p-3 rounded-r-xl text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {wellnessData.map((w, idx) => {
                    const name = getPlayerName(w.player_id, w.jugador_nombre || w.nombre_jugador);
                    const prom = ((Number(w.fatiga || 3) + Number(w.sueño || 3) + Number(w.dolor || 3)) / 3).toFixed(1);
                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-bold text-slate-900">{name}</td>
                        <td className="p-3 text-center font-semibold">{w.fatiga || 4}</td>
                        <td className="p-3 text-center font-semibold">{w.sueño || 4}</td>
                        <td className="p-3 text-center font-semibold">{w.dolor || 4}</td>
                        <td className="p-3 text-center font-semibold">{w.estres || 4}</td>
                        <td className="p-3 text-center font-semibold">{w.animo || 4}</td>
                        <td className="p-3 text-center font-black text-slate-900">{prom}</td>
                        <td className="p-3 text-center">
                          <span className="bg-emerald-100 text-emerald-800 font-bold text-[9px] px-2 py-0.5 rounded-full">OK</span>
                        </td>
                      </tr>
                    );
                  })}
                  {wellnessData.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-slate-400 italic font-medium">
                        Sin registros de bienestar para este microciclo.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 3: CHECK-OUT PSE PROMEDIO CON NOMBRES REALES */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-7 bg-[#0b1220] rounded-r-md"></div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                    3._ CONTROL DE CARGA INTERNA DE LA SESIÓN (PROMEDIOS CHECK-OUT PSE)
                  </h2>
                  <p className="text-[10px] text-slate-400 font-medium">{checkoutAverages.totalReports} registros post-sesión</p>
                </div>
              </div>

              <div className="flex gap-4 text-right">
                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase block">RPE Promedio</span>
                  <span className="text-lg font-black text-blue-600 italic">{checkoutAverages.rpeAvg} / 10</span>
                </div>
                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase block">sRPE Carga</span>
                  <span className="text-lg font-black text-slate-900 italic">{checkoutAverages.sRpeTotalAvg} ua</span>
                </div>
              </div>
            </div>

            {/* Checkout Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#0b1220] text-white uppercase text-[9px] font-black tracking-wider">
                    <th className="p-3 rounded-l-xl">Atleta</th>
                    <th className="p-3 text-center">Sesión</th>
                    <th className="p-3 text-center">RPE Promedio</th>
                    <th className="p-3 text-center">Duración (Min)</th>
                    <th className="p-3 text-center">Carga (sRPE)</th>
                    <th className="p-3 rounded-r-xl text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {checkoutData.map((c, idx) => {
                    const name = getPlayerName(c.player_id, c.jugador_nombre || c.nombre_jugador);
                    const rpe = Number(c.pse || c.rpe || 4);
                    const dur = Number(c.duration_minutes || c.duracion_min || 75);
                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-bold text-slate-900">{name}</td>
                        <td className="p-3 text-center font-semibold">1</td>
                        <td className="p-3 text-center font-bold text-blue-600">{rpe.toFixed(1)}</td>
                        <td className="p-3 text-center font-semibold">{dur} min</td>
                        <td className="p-3 text-center font-black text-slate-900">{Math.round(rpe * dur)} ua</td>
                        <td className="p-3 text-center">
                          <span className="bg-emerald-100 text-emerald-800 font-bold text-[9px] px-2 py-0.5 rounded-full">OK</span>
                        </td>
                      </tr>
                    );
                  })}
                  {checkoutData.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400 italic font-medium">
                        Sin registros de check-out para este microciclo.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 4: PODIO TOP 3 EN SUMATORIA */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-2.5 h-7 bg-[#0b1220] rounded-r-md"></div>
              <div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                  4._ PODIO Y TOP 3 DE PARÁMETROS EN SUMATORIA DEL MICROCICLO
                </h2>
                <p className="text-[10px] text-slate-400 font-medium">Sumatorias totales acumuladas de todos los entrenamientos del periodo</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <PodioBox title="Distancia Total" icon="fa-route" color="blue" items={top3Distancia.map(i => ({ name: i.name, value: `${i.dist_total_m.toLocaleString()} m` }))} />
              <PodioBox title="HSR (>21 km/h)" icon="fa-bolt" color="emerald" items={top3HSR.map(i => ({ name: i.name, value: `${i.dist_mai_m_20_kmh} m` }))} />
              <PodioBox title="Sprint (>25 km/h)" icon="fa-gauge-high" color="red" items={top3Sprint.map(i => ({ name: i.name, value: `${i.dist_sprint_m_25_kmh} m` }))} />
              <PodioBox title="Player Load" icon="fa-weight-hanging" color="purple" items={top3PlayerLoad.map(i => ({ name: i.name, value: `${i.player_load} ua` }))} />
              <PodioBox title="Acc / Dec (Alta)" icon="fa-arrows-left-right" color="amber" items={top3AccDec.map(i => ({ name: i.name, value: `${i.acc_decc_ai_n} n` }))} />
            </div>
          </div>

          {/* SECTION 5: PROMEDIOS POR POSICIÓN TÁCTICA */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-2.5 h-7 bg-[#0b1220] rounded-r-md"></div>
              <div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                  5._ DESEMPEÑO GPS PROMEDIO POR POSICIÓN TÁCTICA
                </h2>
                <p className="text-[10px] text-slate-400 font-medium">Análisis agrupado por demarcación para evaluar comportamiento colectivo</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#0b1220] text-white uppercase text-[9px] font-black tracking-wider">
                    <th className="p-3 rounded-l-xl">Posición</th>
                    <th className="p-3 text-center">Jugadores</th>
                    <th className="p-3 text-right">Dist. Total (m)</th>
                    <th className="p-3 text-right">m/min</th>
                    <th className="p-3 text-right">AI (&gt;15 km/h)</th>
                    <th className="p-3 text-right">HSR (&gt;20 km/h)</th>
                    <th className="p-3 text-right">Sprint (&gt;25 km/h)</th>
                    <th className="p-3 text-right">Vel. Máxima</th>
                    <th className="p-3 rounded-r-xl text-center">Acc/Dec AI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {positionAverages.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-bold text-slate-900 uppercase">{p.posicion}</td>
                      <td className="p-3 text-center text-slate-500 font-semibold">{p.jugadores} Atletas</td>
                      <td className="p-3 text-right font-black text-slate-900">{p.dist_total_m.toLocaleString()} m</td>
                      <td className="p-3 text-right font-bold text-slate-600">{p.m_min}</td>
                      <td className="p-3 text-right font-bold text-blue-600">{p.dist_ai_15} m</td>
                      <td className="p-3 text-right font-bold text-emerald-600">{p.dist_hsr_20} m</td>
                      <td className="p-3 text-right font-bold text-red-600">{p.dist_sprint_25} m</td>
                      <td className="p-3 text-right font-bold text-slate-800">{p.vel_max} km/h</td>
                      <td className="p-3 text-center font-bold text-amber-600">{p.acc_dec}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 6: COMPARATIVA PRONÓSTICO VS REALIDAD DÍA POR DÍA EN TODOS LOS PARÁMETROS */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-slate-100 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-7 bg-[#0b1220] rounded-r-md"></div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                    6._ COMPARATIVA DE CARGA PRONOSTICADA VS. REALIZADA POR DÍA (TODOS LOS PARÁMETROS)
                  </h2>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Contraste día a día entre la meta planificada y el valor real logrado en la plantilla
                  </p>
                </div>
              </div>

              {/* Day filter pills */}
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-2xl">
                <button
                  onClick={() => setSelectedDayFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-wider transition-all ${
                    selectedDayFilter === 'ALL' ? 'bg-[#0b1220] text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Todos los Días
                </button>
                {dailyForecastVsReal.map((d, i) => (
                  <button
                    key={d.dateStr}
                    onClick={() => setSelectedDayFilter(d.dateStr)}
                    className={`px-2.5 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-wider transition-all ${
                      selectedDayFilter === d.dateStr ? 'bg-[#0b1220] text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {d.mdLabel}
                  </button>
                ))}
              </div>
            </div>

            {/* Render comparison per day */}
            <div className="space-y-6">
              {dailyForecastVsReal
                .filter(dayData => selectedDayFilter === 'ALL' || selectedDayFilter === dayData.dateStr)
                .map((dayData) => (
                  <div key={dayData.dateStr} className="p-5 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="bg-[#0b1220] text-white font-black text-xs px-3 py-1 rounded-xl uppercase italic">
                          {dayData.mdLabel}
                        </span>
                        <span className="font-black text-slate-900 text-xs uppercase tracking-wider">
                          {dayData.dayName}
                        </span>
                      </div>

                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Intensidad: <span className="font-black text-slate-700">{dayData.tier.toUpperCase()}</span>
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs bg-white rounded-xl overflow-hidden border border-slate-100 shadow-2xs">
                        <thead>
                          <tr className="bg-slate-900 text-white uppercase text-[9px] font-black tracking-wider">
                            <th className="p-3">Parámetro</th>
                            <th className="p-3 text-center">Pronóstico (Rango Óptimo)</th>
                            <th className="p-3 text-center">Valor Real Logrado</th>
                            <th className="p-3 text-center">Evaluación / Cumplimiento</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {dayData.metricsList.map((m) => (
                            <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="p-3 font-black text-slate-900 text-[11px]">{m.name}</td>
                              <td className="p-3 text-center font-bold text-slate-500">{m.targetRange}</td>
                              <td className="p-3 text-center font-black text-slate-900 italic text-xs">{m.realVal}</td>
                              <td className="p-3 text-center">
                                <span className={`font-black text-[9px] px-3 py-1 rounded-full uppercase tracking-wider ${m.badgeColor}`}>
                                  {m.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

function PodioBox({ title, icon, color, items }: { title: string; icon: string; color: string; items: { name: string; value: string }[] }) {
  const medals = ['bg-amber-400 text-slate-950', 'bg-slate-300 text-slate-900', 'bg-amber-700 text-white'];

  return (
    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
        <span className="text-[10px] font-black text-slate-900 uppercase">{title}</span>
        <i className={`fa-solid ${icon} text-slate-400 text-xs`}></i>
      </div>

      <div className="space-y-1.5">
        {items.map((it, idx) => (
          <div key={idx} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 truncate">
              <span className={`w-4 h-4 rounded flex items-center justify-center text-[9px] font-black ${medals[idx]}`}>
                {idx + 1}°
              </span>
              <span className="font-bold text-slate-800 truncate text-[11px]">{it.name}</span>
            </div>
            <span className="font-black text-slate-900 italic text-[11px] shrink-0">{it.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ReporteMicrocicloArea;
