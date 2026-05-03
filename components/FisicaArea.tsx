
import React, { useState, useMemo, useEffect } from 'react';
import { AthletePerformanceRecord, Category, CATEGORY_ID_MAP } from '../types';
import { supabase } from '../lib/supabase';
import { normalizeClub, getDriveDirectLink } from '../lib/utils';
import { FEDERATION_LOGO } from '../constants';
import ClubBadge from './ClubBadge';

interface FisicaAreaProps {
  performanceRecords: AthletePerformanceRecord[];
  view?: 'wellness' | 'pse' | 'external_total' | 'report';
  userRole?: string;
  userClub?: string;
  highlightPlayerId?: number | null;
  clubs?: any[];
}

type MainTab = 'carga_interna' | 'carga_externa' | 'reporte_diario';

export default function FisicaArea({ performanceRecords, view = 'wellness', userRole, userClub, highlightPlayerId, clubs = [] }: FisicaAreaProps) {
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
  const [selectedCategories, setSelectedCategories] = useState<string[]>([Category.SUB_17]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [athleteSearch, setAthleteSearch] = useState(''); 

  // Filtro de búsqueda interno específico del Reporte Diario
  const [reportPlayerSearch, setReportPlayerSearch] = useState('');

  // Filtro de minutos para Carga Externa
  const [minDuration, setMinDuration] = useState<number>(0);
  const [maxDuration, setMaxDuration] = useState<number>(240);

  // Estados de Contexto
  const [activeMicrocycle, setActiveMicrocycle] = useState<any>(null);
  const [citedPlayerIds, setCitedPlayerIds] = useState<number[]>([]);
  const [loadingContext, setLoadingContext] = useState(false);

  // Filtros específicos del Reporte Diario
  const [selectedPlayersReport, setSelectedPlayersReport] = useState<Set<number>>(new Set());
  const [dailyTaskGps, setDailyTaskGps] = useState<any[]>([]);

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

  const getIFRColor = (ifr: number) => {
    if (ifr < 50) return '#2ecc71'; // Verde
    if (ifr < 85) return '#f1c40f'; // Amarillo
    if (ifr < 110) return '#e67e22'; // Naranja
    return '#e74c3c'; // Rojo
  };

  const calcularIFR = (gpsData: any, player: any) => {
    if (!gpsReferences.length || !player) return null;

    const normalizeStr = (str: string) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    // Find reference for player category and position
    let playerPos = (player.posicion || '').toUpperCase();
    if (playerPos.includes('DELANTERO') || playerPos.includes('EXTREMO') || playerPos.includes('PUNTA')) playerPos = 'DELANTERO';
    else if (playerPos.includes('VOLANTE') || playerPos.includes('MEDIO') || playerPos.includes('CENTRAL') && !playerPos.includes('DEFENSA')) playerPos = 'MEDIO';
    else if (playerPos.includes('DEFENSA') || playerPos.includes('LATERAL') || playerPos.includes('ZAGUERO')) playerPos = 'DEFENSA';
    else if (playerPos.includes('PORTERO') || playerPos.includes('ARQUERO')) playerPos = 'PORTERO';
    else playerPos = 'MEDIO';

    const pCat = normalizeStr(player.categoria || '');

    let ref = gpsReferences.find(r => {
      const rCat = normalizeStr(r.Categoria || r.categoria || '');
      const rPos = (r.Posicion || r.posicion || '').toUpperCase();
      return rCat === pCat && rPos === playerPos;
    });

    // Fallback: If no exact match for category + position, try position in any category
    if (!ref) {
      ref = gpsReferences.find(r => {
        const rPos = (r.Posicion || r.posicion || '').toUpperCase();
        return rPos === playerPos;
      });
    }

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
    const fetchContext = async () => {
      setLoadingContext(true);
      setActiveMicrocycle(null);
      setCitedPlayerIds([]);

      try {
        const allCitedIds = new Set<number>();
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

          if (mc) {
            if (!primaryMicro) primaryMicro = mc; // Keep the first one found as primary for display
            
            const { data: citaciones } = await supabase
              .from('citaciones')
              .select('player_id')
              .eq('microcycle_id', mc.id);

            if (citaciones) {
              citaciones.forEach(c => allCitedIds.add(c.player_id));
            }
          }
        }

        if (primaryMicro) {
          setActiveMicrocycle(primaryMicro);
          setCitedPlayerIds(Array.from(allCitedIds));
          setSelectedPlayersReport(allCitedIds);
        } else {
          setSelectedPlayersReport(new Set());
        }
      } catch (err) {
        console.error("Error context sync:", err);
      } finally {
        setLoadingContext(false);
      }
    };
    fetchContext();
  }, [selectedDate, selectedCategories]);

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
          const playerIds = Array.from(new Set(gpsData.map(d => d.id_del_jugador)));
          const { data: playersData, error: playersError } = await supabase
            .from('players')
            .select('id_del_jugador, nombre, apellido1, apellido2, club, posicion, anio')
            .in('id_del_jugador', playerIds);
          
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

          // Join in memory
          const joinedData = gpsData.map(gps => {
            const player = playersData?.find(p => p.id_del_jugador === gps.id_del_jugador) as any;
            if (player) {
              // Prioritize category from active citation
              if (playerCategoryMap[gps.id_del_jugador]) {
                player.categoria = playerCategoryMap[gps.id_del_jugador];
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
    if (userRole !== 'club' || !userClub) return gpsImportData;
    
    const uClubNorm = normalizeClub(userClub);
    
    return gpsImportData.map(row => {
      const player = row.players;
      const pClub = player?.club_name || player?.club || '';
      const pClubNorm = normalizeClub(pClub);
      
      if (pClubNorm !== uClubNorm) {
        return {
          ...row,
          players: {
            ...player,
            nombre: 'Jugador',
            apellido1: `[${row.id_del_jugador}]`,
            apellido2: '',
            club_name: 'OTRO CLUB',
            club: 'OTRO CLUB'
          }
        };
      }
      return row;
    });
  }, [gpsImportData, userRole, userClub]);

  const togglePlayerInReport = (id: number) => {
    const next = new Set(selectedPlayersReport);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedPlayersReport(next);
  };

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return 'bg-emerald-600 text-white';
    if (score >= 3.5) return 'bg-emerald-400 text-slate-900';
    if (score >= 2.5) return 'bg-amber-400 text-slate-900';
    return 'bg-red-600 text-white';
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

  // Lógica de Impresión Directa
  const handleTriggerPrint = () => {
    window.print();
  };

  // DERIVED DATA
  const currentCitadosPlayers = useMemo(() => {
    // 1. Jugadores citados (siempre visibles, para club de forma anonimizada)
    const cited = performanceRecords.filter(r => r.player.id_del_jugador && citedPlayerIds.includes(r.player.id_del_jugador));
    
    // 2. Si es CLUB, asegurar que sus propios jugadores estén incluidos, incluso si no hay microciclo
    if (userRole === 'club' && userClub) {
      const uClubNorm = normalizeClub(userClub);
      const myPlayers = performanceRecords.filter(r => {
        const pClub = r.player.club_name || r.player.club || '';
        const pClubNorm = normalizeClub(pClub);
        const isMyPlayer = pClubNorm === uClubNorm;
        
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
        if (!combined.some(c => c.player.id_del_jugador === p.player.id_del_jugador)) {
          combined.push(p);
        }
      });
      return combined;
    }

    return cited;
  }, [performanceRecords, citedPlayerIds, userRole, userClub, selectedCategories]);

  const reportData = useMemo(() => {
    const filteredRecords = currentCitadosPlayers.filter(r => selectedPlayersReport.has(r.player.id_del_jugador!));
    
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
    const filteredDailyTasks = dailyTaskGps.filter(t => selectedPlayersReport.has(t.id_del_jugador));

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
      const pid = t.id_del_jugador;
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
      const stats = athleteTotalsMap[r.player.id_del_jugador!];
      return {
        player: r.player,
        stats: stats ? { ...stats, mpm: stats.mpm / stats.count } : null
      };
    });

    // NUEVO: Datos de gps_import para el reporte (Totales Reales)
    const gpsImportReport = anonymizedGpsImport.filter(row => selectedPlayersReport.has(row.id_del_jugador));

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

  const stats = useMemo(() => {
    let checkInDone = 0;
    let checkOutDone = 0;
    let molestias = 0;
    
    currentCitadosPlayers.forEach(record => {
      const dayWellness = record.wellness.find(w => w.date === selectedDate);
      const dayLoads = record.loads.filter(l => l.date === selectedDate);
      
      if (dayWellness) {
        checkInDone++;
        if ((dayWellness.soreness !== undefined && dayWellness.soreness < 5) || 
            (dayWellness.soreness_areas && dayWellness.soreness_areas.length > 0) ||
            (dayWellness.illness_symptoms && dayWellness.illness_symptoms.length > 0)) {
          molestias++;
        }
      }
      if (dayLoads.length > 0) {
        checkOutDone++;
      }
    });

    return {
      checkInDone,
      checkInPending: currentCitadosPlayers.length - checkInDone,
      checkOutDone,
      checkOutPending: currentCitadosPlayers.length - checkOutDone,
      molestias
    };
  }, [currentCitadosPlayers, selectedDate]);

  const { reported, pending, unifiedList } = useMemo(() => {
    const reportedList: any[] = [];
    const pendingList: any[] = [];
    const fullList: any[] = [];

    currentCitadosPlayers.forEach(record => {
      const dayWellness = record.wellness.find(w => w.date === selectedDate);
      const dayLoads = record.loads.filter(l => l.date === selectedDate);
      const matchesSearch = record.player.name.toLowerCase().includes(athleteSearch.toLowerCase());
      if (!matchesSearch) return;

      if (dayLoads.length > 0) {
        dayLoads.forEach((load, index) => {
          const item = { player: record.player, wellness: dayWellness, load: load, sessionIndex: index + 1, hasReported: true };
          reportedList.push(item);
          fullList.push(item);
        });
      } else if (dayWellness) {
        const item = { player: record.player, wellness: dayWellness, load: null, sessionIndex: 1, hasReported: true };
        reportedList.push(item);
        fullList.push(item);
      } else {
        const item = { player: record.player, wellness: null, load: null, sessionIndex: 1, hasReported: false };
        pendingList.push(record);
        fullList.push(item);
      }
    });

    // Sort fullList: reported first, then pending
    const sortedFullList = [...fullList].sort((a, b) => {
      if (a.hasReported && !b.hasReported) return -1;
      if (!a.hasReported && b.hasReported) return 1;
      return 0;
    });

    return { reported: reportedList, pending: pendingList, unifiedList: sortedFullList };
  }, [currentCitadosPlayers, selectedDate, athleteSearch]);

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
    return anonymizedGpsImport.filter(row => {
      const player = row.players;
      
      // Filtro por Categoría
      if (selectedCategories.length > 0 && player?.categoria) {
        const matchesCategory = selectedCategories.some(cat => cat.toLowerCase() === player.categoria.toLowerCase());
        if (!matchesCategory) return false;
      }

      const playerName = player ? `${player.nombre} ${player.apellido1}`.trim().toLowerCase() : 'atleta desconocido';
      const matchesSearch = playerName.includes(athleteSearch.toLowerCase());
      const duration = row.minutos || 0;
      const matchesDuration = duration >= minDuration && duration <= maxDuration;
      return matchesSearch && matchesDuration;
    });
  }, [anonymizedGpsImport, athleteSearch, minDuration, maxDuration, selectedCategories]);

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
                }}
                className={`p-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-left transition-all flex justify-between items-center ${selectedCategories.length === Object.values(Category).length ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                TODAS LAS CATEGORÍAS
                {selectedCategories.length === Object.values(Category).length && <i className="fa-solid fa-check"></i>}
              </button>
              {Object.values(Category).map(cat => {
                const isSelected = selectedCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategories(prev => {
                        if (isSelected) {
                          const newSel = prev.filter(c => c !== cat);
                          return newSel.length === 0 ? [Category.SUB_17] : newSel;
                        } else {
                          return [...prev, cat];
                        }
                      });
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* CHECK-IN CARD */}
            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center text-xl shadow-inner">
                  <i className="fa-solid fa-sun"></i>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Check-in (Wellness)</p>
                  <p className="text-xl font-black text-slate-900 italic uppercase tracking-tighter">
                    {stats.checkInDone} / {currentCitadosPlayers.length}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-black text-amber-600 uppercase tracking-widest mb-1">Pendientes</p>
                <p className="text-lg font-black text-slate-300 italic leading-none">{stats.checkInPending}</p>
              </div>
            </div>

            {/* CHECK-OUT CARD */}
            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-xl shadow-inner">
                  <i className="fa-solid fa-moon"></i>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Check-out (RPE)</p>
                  <p className="text-xl font-black text-slate-900 italic uppercase tracking-tighter">
                    {stats.checkOutDone} / {currentCitadosPlayers.length}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest mb-1">Pendientes</p>
                <p className="text-lg font-black text-slate-300 italic leading-none">{stats.checkOutPending}</p>
              </div>
            </div>

            {/* MOLESTIAS CARD */}
            <div className={`p-6 rounded-[32px] border shadow-sm flex items-center justify-between group hover:shadow-md transition-all ${stats.molestias > 0 ? 'bg-red-50 border-red-100' : 'bg-white border-slate-100'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner ${stats.molestias > 0 ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-50 text-slate-300'}`}>
                  <i className="fa-solid fa-heart-pulse"></i>
                </div>
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-widest leading-none mb-1 ${stats.molestias > 0 ? 'text-red-600' : 'text-slate-400'}`}>Molestias Reportadas</p>
                  <p className="text-xl font-black text-slate-900 italic uppercase tracking-tighter">
                    {stats.molestias} ALERTAS
                  </p>
                </div>
              </div>
              {stats.molestias > 0 && (
                <div className="w-2 h-2 bg-red-600 rounded-full animate-ping"></div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] italic flex items-center gap-2">
              <i className="fa-solid fa-clipboard-list text-red-600"></i> CONTROL DETALLADO ({unifiedList.length})
            </h3>
          </div>

          <div className="bg-white rounded-[32px] md:rounded-[40px] border border-slate-100 shadow-xl overflow-hidden overflow-x-auto">
            <table className="w-full text-center min-w-[1000px]">
              <thead className="bg-[#0b1220] text-white font-black uppercase text-[9px] md:text-[10px]">
                <tr>
                  <th className="px-4 md:px-8 py-4 md:py-5 text-left">Atleta</th>
                  {(view === 'wellness' || view === 'report') && (
                    <>
                      <th className="px-2 py-4 md:py-5">Fatiga</th>
                      <th className="px-2 py-4 md:py-5">Sueño</th>
                      <th className="px-2 py-4 md:py-5">Dolor</th>
                      <th className="px-2 py-4 md:py-5">Estrés</th>
                      <th className="px-2 py-4 md:py-5">Ánimo</th>
                      <th className="px-2 py-4 md:py-5">Prom.</th>
                      <th className="px-2 md:px-4 py-4 md:py-5">Zona Molestia</th>
                      <th className="px-2 md:px-4 py-4 md:py-5">Estado Salud</th>
                    </>
                  )}
                  {(view === 'pse' || view === 'report') && (
                    <>
                      <th className="px-2 py-4 md:py-5">Duración</th>
                      <th className="px-2 py-4 md:py-5">RPE</th>
                      <th className="px-2 py-4 md:py-5">Carga</th>
                    </>
                  )}
                  <th className="px-4 md:px-8 py-4 md:py-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {unifiedList.map((row, idx) => {
                  const isPending = !row.hasReported;
                  const avg = row.wellness ? (row.wellness.fatigue + row.wellness.sleep + row.wellness.mood) / 3 : 0;
                  
                  const isHighlighted = highlightPlayerId && Number(row.player.id_del_jugador) === Number(highlightPlayerId);
                  
                  return (
                    <tr key={idx} className={`transition-colors font-black uppercase italic text-[10px] md:text-xs ${isHighlighted ? 'bg-blue-50 border-l-4 border-blue-500' : isPending ? 'bg-slate-50/50 text-slate-300' : (row.player && normalizeClub(row.player.club_name || row.player.club || '') === normalizeClub(userClub || '') ? 'bg-slate-100/80 hover:bg-slate-100' : 'hover:bg-slate-50 text-slate-900')}`}>
                      <td className={`px-4 md:px-8 py-4 md:py-5 text-left ${isHighlighted ? 'bg-blue-50' : ''}`}>
                        <div className="flex flex-col">
                          <span>{row.player.name}</span>
                          <ClubBadge 
                            clubName={row.player.club_name || row.player.club} 
                            clubs={clubs}
                            className="mt-0.5"
                            logoSize="w-3 h-3"
                            showName={true}
                          />
                        </div>
                      </td>
                      
                      {(view === 'wellness' || view === 'report') && (
                        <>
                          <td className="px-2 py-4 md:py-5">
                            {row.wellness ? <span className={`w-8 h-8 flex items-center justify-center mx-auto rounded-lg ${getScoreColor(row.wellness.fatigue)}`}>{row.wellness.fatigue}</span> : '-'}
                          </td>
                          <td className="px-2 py-4 md:py-5">
                            {row.wellness ? <span className={`w-8 h-8 flex items-center justify-center mx-auto rounded-lg ${getScoreColor(row.wellness.sleep)}`}>{row.wellness.sleep}</span> : '-'}
                          </td>
                          <td className="px-2 py-4 md:py-5">
                            {row.wellness ? <span className={`w-8 h-8 flex items-center justify-center mx-auto rounded-lg ${getScoreColor(row.wellness.soreness)}`}>{row.wellness.soreness}</span> : '-'}
                          </td>
                          <td className="px-2 py-4 md:py-5">
                            {row.wellness ? <span className={`w-8 h-8 flex items-center justify-center mx-auto rounded-lg ${getScoreColor(row.wellness.stress)}`}>{row.wellness.stress}</span> : '-'}
                          </td>
                          <td className="px-2 py-4 md:py-5">
                            {row.wellness ? <span className={`w-8 h-8 flex items-center justify-center mx-auto rounded-lg ${getScoreColor(row.wellness.mood)}`}>{row.wellness.mood}</span> : '-'}
                          </td>
                          <td className="px-2 py-4 md:py-5">
                            {row.wellness ? <span className="font-black text-slate-900">{avg.toFixed(1)}</span> : '-'}
                          </td>
                          <td className="px-2 md:px-4 py-4 md:py-5">
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
                          <td className="px-2 md:px-4 py-4 md:py-5">
                            {row.wellness?.illness_symptoms && row.wellness.illness_symptoms.length > 0 ? (
                              <div className="flex flex-wrap gap-1 justify-center">
                                {row.wellness.illness_symptoms.map((sym, i) => (
                                  <span key={i} className="bg-amber-100 text-amber-600 px-1.5 md:px-2 py-0.5 rounded text-[8px] md:text-[9px] font-bold uppercase">{sym}</span>
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
                          <td className="px-2 py-4 md:py-5 text-base md:text-lg">{row.load?.duration || '-'}</td>
                          <td className="px-2 py-4 md:py-5 text-base md:text-lg">{row.load?.rpe || '-'}</td>
                          <td className="px-2 py-4 md:py-5">{row.load ? <span className="bg-slate-900 text-white px-2 md:px-3 py-1 rounded-lg">{row.load.load}</span> : '-'}</td>
                        </>
                      )}

                      <td className="px-4 md:px-8 py-4 md:py-5 text-right">
                        {isPending ? (
                          <span className="text-slate-300 flex items-center justify-end gap-2"><i className="fa-solid fa-clock"></i> PENDIENTE</span>
                        ) : (
                          <span className="text-emerald-500 flex items-center justify-end gap-2"><i className="fa-solid fa-check-double"></i> OK</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
                   <th className="px-4 md:px-8 py-4 md:py-5 text-left sticky left-0 bg-[#0b1220] z-10">Atleta</th>
                   <th className="px-2 md:px-4 py-4 md:py-5">Minutos</th>
                   <th className="px-2 md:px-4 py-4 md:py-5">Dist. Total (m)</th>
                   <th className="px-2 md:px-4 py-4 md:py-5">m/min</th>
                   <th className="px-2 md:px-4 py-4 md:py-5">Dist. AI (&gt;15)</th>
                   <th className="px-2 md:px-4 py-4 md:py-5">Dist. MAI (&gt;20)</th>
                   <th className="px-2 md:px-4 py-4 md:py-5">Dist. Sprint (&gt;25)</th>
                   <th className="px-2 md:px-4 py-4 md:py-5">Sprints (n)</th>
                   <th className="px-2 md:px-4 py-4 md:py-5">Vel. Máx (km/h)</th>
                   <th className="px-2 md:px-4 py-4 md:py-5">Acc/Decc AI</th>
                   <th className="px-4 md:px-8 py-4 md:py-5 text-right">IFR (%)</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 font-black italic uppercase text-[10px] md:text-xs">
                 {filteredGpsImport.map((row, idx) => {
                   const player = row.players;
                   const playerName = player ? `${player.nombre} ${player.apellido1}`.trim() : `ID: ${row.id_del_jugador}`;
                   const isOwnPlayer = player && normalizeClub(player.club_name || player.club || '') === normalizeClub(userClub || '');
                   
                   const isHighlighted = highlightPlayerId && Number(row.id_del_jugador) === Number(highlightPlayerId);
                   const ifrValue = calcularIFR(row, player);
                   const ifrColor = ifrValue !== null ? getIFRColor(ifrValue) : null;
                   
                   return (
                     <tr 
                       key={idx} 
                       className={`hover:bg-slate-50 transition-colors ${isHighlighted ? 'bg-blue-50 border-l-4 border-blue-500' : isOwnPlayer ? 'bg-slate-100/80' : ''}`}
                       style={{ 
                         backgroundColor: ifrColor ? `${ifrColor}25` : undefined 
                       }}
                     >
                       <td className={`px-4 md:px-8 py-4 md:py-5 text-left sticky left-0 group-hover:bg-slate-50 border-r border-slate-50 ${isHighlighted ? 'bg-blue-50' : isOwnPlayer ? 'bg-slate-100/80' : 'bg-white'}`} style={{ backgroundColor: ifrColor ? `${ifrColor}25` : undefined }}>{playerName}</td>
                       <td className="px-2 md:px-4 py-4 md:py-5">{row.minutos?.toFixed(1) || '0.0'}</td>
                       <td className="px-2 md:px-4 py-4 md:py-5">{row.dist_total_m?.toFixed(0) || '0'}</td>
                       <td className="px-2 md:px-4 py-4 md:py-5">
                         <span className={`px-3 py-1 rounded-lg ${getIntensityStyle(row.m_por_min || 0)}`}>
                           {row.m_por_min?.toFixed(1) || '0.0'}
                         </span>
                       </td>
                       <td className="px-2 md:px-4 py-4 md:py-5">{row.dist_ai_m_15_kmh?.toFixed(0) || '0'}</td>
                       <td className="px-2 md:px-4 py-4 md:py-5">{row.dist_mai_m_20_kmh?.toFixed(0) || '0'}</td>
                       <td className="px-2 md:px-4 py-4 md:py-5 text-blue-600">{row.dist_sprint_m_25_kmh?.toFixed(0) || '0'}</td>
                       <td className="px-2 md:px-4 py-4 md:py-5">{row.sprints_n?.toFixed(0) || '0'}</td>
                       <td className="px-2 md:px-4 py-4 md:py-5 text-red-600 font-black">{row.vel_max_kmh?.toFixed(1) || '0.0'}</td>
                       <td className="px-2 md:px-4 py-4 md:py-5">{row.acc_decc_ai_n?.toFixed(0) || '0'}</td>
                       <td className="px-4 md:px-8 py-4 md:py-5 text-right">
                         {ifrValue !== null ? (
                           <div 
                             className="inline-block px-3 py-1 rounded-full text-white font-black text-[10px] shadow-sm"
                             style={{ backgroundColor: getIFRColor(ifrValue) }}
                           >
                             {ifrValue.toFixed(1)}%
                           </div>
                         ) : (
                           <span className="text-slate-300">-</span>
                         )}
                       </td>
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
                  <button onClick={() => setSelectedPlayersReport(new Set(citedPlayerIds))} className="px-8 py-3 bg-[#0b1220] text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-md">Seleccionar Todo</button>
                  <div className="h-8 w-px bg-slate-200 mx-2"></div>
                  <div className="pr-4">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Incluidos</span>
                    <span className="text-sm font-black text-[#0b1220] italic">{selectedPlayersReport.size}</span>
                  </div>
                  <button 
                    onClick={handleTriggerPrint} 
                    className="bg-red-600 text-white px-12 py-5 rounded-full text-[11px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-red-700 transition-all shadow-xl active:scale-95"
                  >
                    <i className="fa-solid fa-file-pdf"></i> GENERAR PDF / IMPRIMIR
                  </button>
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
                        const active = selectedPlayersReport.has(p.player.id_del_jugador!);
                        return (
                          <button 
                           key={p.player.id}
                           onClick={() => togglePlayerInReport(p.player.id_del_jugador!)}
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
             </div>
          </div>

          {/* VISTA PREVIA DEL PDF (Solo visible en pantalla o impresión) */}
          <div className="space-y-0 print:bg-white print:m-0 print:p-0">
            {/* PÁGINAS DE WELLNESS (Chunked) */}
            {wellnessChunks.map((chunk, chunkIdx) => {
              currentPageNum++;
              return (
                <div key={`well-${chunkIdx}`} className="print-page-section">
                  <PrintHeader 
                    selectedDate={selectedDate} 
                    selectedCategory={selectedCategories[0]} 
                    activeMicrocycle={activeMicrocycle} 
                    page={currentPageNum} 
                    total={totalPages} 
                  />
                  
                  <section>
                    <h3 className="text-[10px] font-black text-slate-900 border-l-4 border-[#0b1220] pl-4 mb-3 uppercase tracking-widest italic">
                      2. BIENESTAR INDIVIDUAL {chunkIdx > 0 ? '(CONTINUACIÓN)' : ''}
                    </h3>
                    <div className="overflow-hidden rounded-[30px] border border-slate-100 shadow-sm">
                      <table className="w-full text-center border-collapse bg-white">
                        <thead className="bg-[#0b1220] text-white text-[7px] font-black uppercase tracking-[0.2em]">
                          <tr>
                            <th className="px-4 py-2 text-left">ATLETA</th>
                            <th className="px-1 py-2">FATIGA</th>
                            <th className="px-1 py-2">SUEÑO</th>
                            <th className="px-1 py-2">DOLOR</th>
                            <th className="px-1 py-2">ESTRÉS</th>
                            <th className="px-1 py-2">ÁNIMO</th>
                            <th className="px-1 py-2">PROM.</th>
                            <th className="px-2 py-2">ZONA MOLESTIA</th>
                            <th className="px-2 py-2">ESTADO SALUD</th>
                            <th className="px-4 py-2 text-right">STATUS</th>
                          </tr>
                        </thead>
                        <tbody className="text-[8px] font-bold text-slate-900">
                          {chunk.map(({ player, data }) => {
                            const avg = data ? (data.fatigue + data.sleep + data.mood) / 3 : 0;
                            const isSano = !data?.illness_symptoms || data.illness_symptoms.length === 0;
                            const hasPain = data?.soreness_areas && data.soreness_areas.length > 0;
                            const isOwnPlayer = player && normalizeClub(player.club_name || player.club || '') === normalizeClub(userClub || '');

                            return (
                              <tr key={player.id} className={`border-b border-slate-50 h-10 hover:bg-slate-50/50 transition-colors ${isOwnPlayer ? 'bg-slate-100/50' : ''}`}>
                                <td className="px-4 py-0.5 text-left">
                                   <span className="text-[8px] font-black italic uppercase block leading-none text-[#0b1220]">{player.name}</span>
                                   <ClubBadge 
                                     clubName={player.club_name || player.club} 
                                     clubs={clubs}
                                     className="mt-0.5"
                                     logoSize="w-2.5 h-2.5"
                                     showName={true}
                                   />
                                </td>
                                <td className="px-1 py-0.5">
                                  {data ? <span className={`w-4 h-4 flex items-center justify-center mx-auto rounded-full text-white text-[7px] font-black shadow-sm ${getScoreColor(data.fatigue)}`}>{data.fatigue}</span> : '-'}
                                </td>
                                <td className="px-1 py-0.5">
                                  {data ? <span className={`w-4 h-4 flex items-center justify-center mx-auto rounded-full text-white text-[7px] font-black shadow-sm ${getScoreColor(data.sleep)}`}>{data.sleep}</span> : '-'}
                                </td>
                                <td className="px-1 py-0.5">
                                  {data ? <span className={`w-4 h-4 flex items-center justify-center mx-auto rounded-full text-white text-[7px] font-black shadow-sm ${getScoreColor(data.soreness)}`}>{data.soreness}</span> : '-'}
                                </td>
                                <td className="px-1 py-0.5">
                                  {data ? <span className={`w-4 h-4 flex items-center justify-center mx-auto rounded-full text-white text-[7px] font-black shadow-sm ${getScoreColor(data.stress)}`}>{data.stress}</span> : '-'}
                                </td>
                                <td className="px-1 py-0.5">
                                  {data ? <span className={`w-4 h-4 flex items-center justify-center mx-auto rounded-full text-white text-[7px] font-black shadow-sm ${getScoreColor(data.mood)}`}>{data.mood}</span> : '-'}
                                </td>
                                <td className="px-1 py-0.5 text-[8px] font-black italic text-[#0b1220]">{avg ? avg.toFixed(1) : '-'}</td>
                                <td className="px-2 py-0.5">
                                  <span className={`text-[6px] font-black italic uppercase px-1.5 py-0.5 rounded-full ${hasPain ? 'text-amber-600 bg-amber-50 border border-amber-100' : 'text-slate-300'}`}>
                                    {hasPain ? data?.soreness_areas?.join(', ') : 'SIN DOLOR'}
                                  </span>
                                </td>
                                <td className="px-2 py-0.5">
                                  <span className={`text-[6px] font-black italic uppercase px-1.5 py-0.5 rounded-full ${isSano ? 'text-emerald-600 bg-emerald-50 border border-emerald-100' : 'text-amber-600 bg-amber-50 border border-amber-100'}`}>
                                    {isSano ? 'SANO' : data?.illness_symptoms?.join(', ')}
                                  </span>
                                </td>
                                <td className="px-4 py-0.5 text-right">
                                  <div className="flex items-center justify-end gap-1 text-emerald-500 font-black italic">
                                    <div className="w-3 h-3 bg-emerald-50 rounded-full flex items-center justify-center">
                                      <i className="fa-solid fa-check text-[6px]"></i>
                                    </div>
                                    <span className="text-[7px] uppercase tracking-widest">OK</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          {/* FILA DE PROMEDIOS */}
                          {chunkIdx === wellnessChunks.length - 1 && reportData.wellAvg && (
                            <tr className="bg-[#0b1220] text-white font-black italic h-8">
                              <td className="px-4 py-0.5 text-left uppercase tracking-[0.2em] text-[8px]">Promedio Grupal</td>
                              <td className="px-1 py-0.5 text-emerald-400 text-sm">{reportData.wellAvg.fatigue.toFixed(1)}</td>
                              <td className="px-1 py-0.5 text-emerald-400 text-sm">{reportData.wellAvg.sleep.toFixed(1)}</td>
                              <td className="px-1 py-0.5 text-emerald-400 text-sm">{reportData.wellAvg.soreness.toFixed(1)}</td>
                              <td className="px-1 py-0.5 text-emerald-400 text-sm">{reportData.wellAvg.stress.toFixed(1)}</td>
                              <td className="px-1 py-0.5 text-emerald-400 text-sm">{reportData.wellAvg.mood.toFixed(1)}</td>
                              <td className="px-1 py-0.5 text-red-500 text-base">
                                {((reportData.wellAvg.fatigue + reportData.wellAvg.sleep + reportData.wellAvg.mood) / 3).toFixed(1)}
                              </td>
                              <td colSpan={3} className="bg-[#0b1220]"></td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>
                  <PrintFooter page={currentPageNum} />
                </div>
              );
            })}

            {/* PÁGINAS DE CARGA INTERNA (Chunked) */}
            {loadChunks.map((chunk, chunkIdx) => {
              currentPageNum++;
              return (
                <div key={`load-${chunkIdx}`} className="print-page-section">
                  <PrintHeader 
                    selectedDate={selectedDate} 
                    selectedCategory={selectedCategories[0]} 
                    activeMicrocycle={activeMicrocycle} 
                    page={currentPageNum} 
                    total={totalPages} 
                  />
                  <section>
                    <h3 className="text-[10px] font-black text-slate-900 border-l-4 border-[#0b1220] pl-4 mb-3 uppercase tracking-widest italic">
                      3. CONTROL DE CARGA INTERNA {chunkIdx > 0 ? '(CONTINUACIÓN)' : ''}
                    </h3>
                    <div className="overflow-hidden rounded-[30px] border border-slate-100 shadow-sm">
                      <table className="w-full text-center border-collapse bg-white">
                        <thead className="bg-[#0b1220] text-white text-[7px] font-black uppercase tracking-[0.2em]">
                          <tr>
                            <th className="px-4 py-2 text-left">ATLETA</th>
                            <th className="px-2 py-2">SESIONES</th>
                            <th className="px-2 py-2">RPE MEDIA</th>
                            <th className="px-2 py-2">MINUTOS TOT</th>
                            <th className="px-2 py-2">CARGA (UA)</th>
                            <th className="px-4 py-2 text-right">ESTADO</th>
                          </tr>
                        </thead>
                        <tbody className="text-[8px] font-bold text-slate-900">
                          {chunk.map(({ player, sessions }) => {
                            const rpeAvg = sessions.length ? sessions.reduce((acc, c) => acc + c.rpe, 0) / sessions.length : 0;
                            const totalMin = sessions.reduce((acc, c) => acc + c.duration, 0);
                            const totalLoad = sessions.reduce((acc, c) => acc + c.load, 0);
                            const status = getLoadStatus(totalLoad);
                            const isOwnPlayer = player && normalizeClub(player.club_name || player.club || '') === normalizeClub(userClub || '');
                            
                            return (
                              <tr key={player.id} className={`border-b border-slate-50 h-10 hover:bg-slate-50/50 transition-colors ${isOwnPlayer ? 'bg-slate-100/50' : ''}`}>
                                <td className="px-4 py-0.5 text-left">
                                   <span className="text-[8px] font-black italic uppercase block leading-none text-[#0b1220]">{player.name}</span>
                                   <ClubBadge 
                                     clubName={player.club_name || player.club} 
                                     clubs={clubs}
                                     className="mt-0.5"
                                     logoSize="w-2.5 h-2.5"
                                     showName={true}
                                   />
                                </td>
                                <td className="px-2 py-0.5 text-slate-400 font-black italic text-[8px]">{sessions.length}</td>
                                <td className="px-2 py-0.5 font-black text-[10px] italic text-[#0b1220]">{rpeAvg ? rpeAvg.toFixed(1) : '—'}</td>
                                <td className="px-2 py-0.5 text-slate-500 font-black italic text-[8px]">{totalMin}'</td>
                                <td className="px-2 py-0.5 font-black text-[10px] italic text-red-600">{totalLoad}</td>
                                <td className="px-4 py-0.5 text-right">
                                  <span className={`px-1.5 py-0.5 rounded-full text-[6px] font-black italic tracking-widest border ${status.color.replace('text-', 'border-').replace('600', '200')} ${status.color.replace('text-', 'bg-').replace('600', '50')} ${status.color}`}>
                                    {status.label}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                          {/* FILA DE PROMEDIOS */}
                          {chunkIdx === loadChunks.length - 1 && reportData.loadAvg && (
                            <tr className="bg-[#0b1220] text-white font-black italic h-8">
                              <td className="px-4 py-0.5 text-left uppercase tracking-[0.2em] text-[8px]">Promedio Grupal</td>
                              <td className="px-2 py-0.5">—</td>
                              <td className="px-2 py-0.5 text-emerald-400 text-sm">{reportData.loadAvg.rpe.toFixed(1)}</td>
                              <td className="px-2 py-0.5 text-emerald-400 text-xs">{reportData.loadAvg.duration.toFixed(0)}'</td>
                              <td className="px-2 py-0.5 text-red-500 text-sm">{reportData.loadAvg.load.toFixed(0)}</td>
                              <td className="px-4 py-0.5 text-right text-slate-400 text-[7px] tracking-widest bg-[#0b1220]">UA TOTAL</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>
                  <PrintFooter page={currentPageNum} />
                </div>
              );
            })}

            {/* PÁGINAS DE GPS (Chunked) */}
            {gpsChunks.map((chunk, chunkIdx) => {
              currentPageNum++;
              return (
                <div key={`gps-${chunkIdx}`} className="print-page-section">
                  <PrintHeader 
                    selectedDate={selectedDate} 
                    selectedCategory={selectedCategories[0]} 
                    activeMicrocycle={activeMicrocycle} 
                    page={currentPageNum} 
                    total={totalPages} 
                  />
                  <section>
                    <h3 className="text-[10px] font-black text-slate-900 border-l-4 border-red-600 pl-4 mb-3 uppercase tracking-widest italic">
                      4. RENDIMIENTO INDIVIDUAL GPS {chunkIdx > 0 ? '(CONTINUACIÓN)' : ''}
                    </h3>
                    <div className="overflow-hidden rounded-[30px] border border-slate-100 shadow-sm">
                      <table className="w-full text-center border-collapse bg-white">
                        <thead className="bg-[#0b1220] text-white text-[7px] font-black uppercase tracking-[0.2em]">
                          <tr>
                            <th className="px-4 py-2 text-left">ATLETA</th>
                            <th className="px-1 py-2">MIN</th>
                            <th className="px-1 py-2">DIST (M)</th>
                            <th className="px-1 py-2">M/MIN</th>
                            <th className="px-1 py-2">HSR</th>
                            <th className="px-1 py-2">AI</th>
                            <th className="px-1 py-2">SPRINT</th>
                            <th className="px-1 py-2">VEL MAX</th>
                            <th className="px-1 py-2">ACC/DECC</th>
                            <th className="px-4 py-2 text-right">IFR (%)</th>
                          </tr>
                        </thead>
                        <tbody className="text-[8px] font-mono font-black text-slate-900">
                          {chunk.map((row) => {
                            const player = row.players;
                            const playerName = player ? `${player.nombre} ${player.apellido1}`.trim() : `ID: ${row.id_del_jugador}`;
                            const isOwnPlayer = player && normalizeClub(player.club_name || player.club || '') === normalizeClub(userClub || '');
                            
                            // Use stored IFR if available, otherwise calculate it
                            const ifrValue = row.ifr !== undefined && row.ifr !== null ? row.ifr : calcularIFR(row, player);
                            const ifrColor = row.ifr_color || (ifrValue !== null ? getIFRColor(ifrValue) : null);
                            
                            return (
                              <tr 
                                key={row.id} 
                                className={`border-b border-slate-50 h-10 hover:bg-slate-50/50 transition-colors ${isOwnPlayer ? 'bg-slate-100/50' : ''}`}
                                style={{ backgroundColor: ifrColor ? `${ifrColor}25` : undefined }}
                              >
                                <td className="px-4 py-0.5 text-left font-sans" style={{ backgroundColor: ifrColor ? `${ifrColor}25` : undefined }}>
                                   <span className="text-[8px] font-black italic uppercase block leading-none text-[#0b1220]">{playerName}</span>
                                   <ClubBadge 
                                     clubName={player?.club_name || player?.club} 
                                     clubs={clubs}
                                     className="mt-0.5"
                                     logoSize="w-2.5 h-2.5"
                                     showName={true}
                                   />
                                </td>
                                <td className="px-1 py-0.5 text-slate-400 italic text-[8px]">{row.minutos?.toFixed(0) || '0'}</td>
                                <td className="px-1 py-0.5 text-[#0b1220] italic text-[8px]">{row.dist_total_m?.toFixed(0) || '0'}</td>
                                <td className="px-1 py-0.5">
                                  <span className={`px-1 py-0.5 rounded-full text-[7px] ${getIntensityStyle(row.m_por_min || 0)}`}>
                                    {row.m_por_min?.toFixed(1) || '0.0'}
                                  </span>
                                </td>
                                <td className="px-1 py-0.5 text-slate-500 italic text-[8px]">{row.dist_mai_m_20_kmh?.toFixed(0) || '0'}</td>
                                <td className="px-1 py-0.5 text-slate-500 italic text-[8px]">{row.dist_ai_m_15_kmh?.toFixed(0) || '0'}</td>
                                <td className="px-1 py-0.5 text-blue-600 italic text-[8px]">{row.dist_sprint_m_25_kmh?.toFixed(0) || '0'}</td>
                                <td className="px-1 py-0.5 text-red-600 text-[10px] italic">{row.vel_max_kmh?.toFixed(1) || '0.0'}</td>
                                <td className="px-1 py-0.5 text-[#0b1220] italic text-[8px]">{row.acc_decc_ai_n?.toFixed(0) || '0'}</td>
                                <td className="px-4 py-0.5 text-right">
                                  {ifrValue !== null ? (
                                    <div 
                                      className="inline-block px-2 py-0.5 rounded-full text-white font-black text-[7px] shadow-sm"
                                      style={{ backgroundColor: getIFRColor(ifrValue) }}
                                    >
                                      {ifrValue.toFixed(1)}%
                                    </div>
                                  ) : (
                                    <span className="text-slate-300">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                          {/* FILA DE PROMEDIOS */}
                          {chunkIdx === gpsChunks.length - 1 && reportData.gpsAvg && (
                            <tr className="bg-[#0b1220] text-white font-black italic h-8">
                              <td className="px-4 py-0.5 text-left uppercase font-sans tracking-[0.2em] text-[8px]">Promedio Grupal</td>
                              <td className="px-1 py-0.5 text-emerald-400 text-xs">{reportData.gpsAvg.minutos.toFixed(0)}</td>
                              <td className="px-1 py-0.5 text-emerald-400 text-xs">{reportData.gpsAvg.dist.toFixed(0)}</td>
                              <td className="px-1 py-0.5 text-red-500 text-sm">{reportData.gpsAvg.mpm.toFixed(1)}</td>
                              <td className="px-1 py-0.5 text-emerald-400 text-xs">{reportData.gpsAvg.hsr.toFixed(0)}</td>
                              <td className="px-1 py-0.5 text-emerald-400 text-xs">{reportData.gpsAvg.ai.toFixed(0)}</td>
                              <td className="px-1 py-0.5 text-emerald-400 text-xs">{reportData.gpsAvg.sprint.toFixed(0)}</td>
                              <td className="px-1 py-0.5 text-red-500 text-sm">{reportData.gpsAvg.vmax.toFixed(1)}</td>
                              <td className="px-4 py-0.5 text-right text-emerald-400 text-xs bg-[#0b1220]">{reportData.gpsAvg.acc.toFixed(1)}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>
                  <PrintFooter page={currentPageNum} />
                </div>
              );
            })}

            {/* PÁGINA FINAL: TAREAS Y FIRMAS */}
            <div className="print-page-section">
              {(() => { currentPageNum++; return null; })()}
              <PrintHeader 
                selectedDate={selectedDate} 
                selectedCategory={selectedCategories[0]} 
                activeMicrocycle={activeMicrocycle} 
                page={currentPageNum} 
                total={totalPages} 
              />
              <section className="mb-6">
                <h3 className="text-[10px] font-black text-slate-900 border-l-4 border-blue-500 pl-4 mb-3 uppercase tracking-widest italic">5. ANÁLISIS DE INTENSIDAD POR TAREA (MIN / AVG / MAX)</h3>
                <div className="overflow-hidden rounded-[30px] border border-slate-100 shadow-sm">
                  <table className="w-full text-center border-collapse bg-white">
                    <thead className="bg-[#0b1220] text-white text-[6px] font-black uppercase tracking-[0.1em]">
                      <tr>
                        <th className="px-4 py-2 text-left">TAREA / BLOQUE</th>
                        <th className="px-2 py-2">DISTANCIA (m)</th>
                        <th className="px-2 py-2">INTENSIDAD (m/min)</th>
                        <th className="px-2 py-2">HSR (&gt;20 km/h)</th>
                        <th className="px-2 py-2">VEL MAX (km/h)</th>
                        <th className="px-4 py-2 text-right">ACC/DECC AI</th>
                      </tr>
                    </thead>
                    <tbody className="text-[7px] font-bold text-slate-900 italic uppercase">
                      {reportData.taskSummary.map((task, idx) => (
                        <tr key={idx} className="border-b border-slate-50 h-9">
                          <td className="px-4 py-1 text-left font-black bg-slate-50/50 text-[#0b1220]">{task.name}</td>
                          <td className="px-2 py-1">
                            <div className="flex justify-between text-[5px] opacity-40 px-1"><span>{task.dist.min.toFixed(0)}</span><span>{task.dist.max.toFixed(0)}</span></div>
                            <div className="text-[9px] font-black">{task.dist.avg.toFixed(0)}</div>
                          </td>
                          <td className="px-2 py-1">
                            <div className="flex justify-between text-[5px] opacity-40 px-1"><span>{task.mpm.min.toFixed(1)}</span><span>{task.mpm.max.toFixed(1)}</span></div>
                            <div className={`text-[8px] font-black px-2 py-0.5 rounded-full inline-block shadow-sm ${getIntensityStyle(task.mpm.avg)}`}>{task.mpm.avg.toFixed(1)}</div>
                          </td>
                          <td className="px-2 py-1">
                            <div className="flex justify-between text-[5px] opacity-40 px-1"><span>{task.hsr.min.toFixed(0)}</span><span>{task.hsr.max.toFixed(0)}</span></div>
                            <div className="text-[9px] font-black">{task.hsr.avg.toFixed(0)}</div>
                          </td>
                          <td className="px-2 py-1">
                            <div className="flex justify-between text-[5px] opacity-40 px-1"><span>{task.vmax.min.toFixed(1)}</span><span>{task.vmax.max.toFixed(1)}</span></div>
                            <div className="text-[9px] font-black text-red-600">{task.vmax.avg.toFixed(1)}</div>
                          </td>
                          <td className="px-4 py-1 text-right">
                            <div className="flex justify-between text-[5px] opacity-40 px-1"><span>{task.acc.min.toFixed(1)}</span><span>{task.acc.max.toFixed(1)}</span></div>
                            <div className="text-[9px] font-black">{task.acc.avg.toFixed(1)}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="mt-20 pt-10 border-t-2 border-slate-100">
                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center mb-16">VALIDEZ TÉCNICA Y FIRMAS</h4>
                <div className="grid grid-cols-2 gap-20 px-10">
                  <div className="text-center">
                     <div className="h-px bg-slate-900 mb-4"></div>
                     <p className="text-[10px] font-black uppercase text-slate-900 tracking-tighter">PREPARADOR FÍSICO</p>
                     <p className="text-[8px] text-slate-400 uppercase">Área de Rendimiento La Roja</p>
                  </div>
                  <div className="text-center">
                     <div className="h-px bg-slate-900 mb-4"></div>
                     <p className="text-[10px] font-black uppercase text-slate-900 tracking-tighter">DIRECTOR TÉCNICO</p>
                     <p className="text-[8px] text-slate-400 uppercase">Selección Nacional de Fútbol</p>
                  </div>
                </div>
              </section>
              <PrintFooter page={currentPageNum} />
            </div>
          </div>
        </div>
      )}

      {/* ESTILOS GLOBALES DE IMPRESIÓN */}
      <style>{`
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
            break-after: page !important;
            position: relative !important;
            height: 280mm !important;
            width: 210mm !important;
            margin: 0 !important;
            padding: 10mm 15mm !important;
            background: white !important;
            border: none !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            display: block !important;
          }

          table { page-break-inside: avoid !important; }
          tr { page-break-inside: avoid !important; break-inside: avoid !important; }

          .print-page-section:last-child { 
            break-after: auto !important; 
          }
          
          * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
          
          @page { 
            size: A4 portrait; 
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

// Subcomponente de Encabezado para Impresión (Rediseñado FIFA-Style con Diagonales)
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
    <div className="hidden print:block mb-8 font-sans">
      {/* Top Graphic Bar */}
      <div className="flex items-center h-20 relative overflow-hidden">
        {/* Blue Segment */}
        <div className="bg-[#02428c] h-full flex items-center px-10 relative z-20 min-w-[380px]" style={{ clipPath: 'polygon(0 0, 92% 0, 100% 100%, 0% 100%)' }}>
          <span className="text-4xl font-black text-white uppercase italic tracking-tighter whitespace-nowrap">
            {dateDisplay}
          </span>
        </div>
        
        {/* Red Segment */}
        <div className="bg-[#e2231a] h-full w-24 -ml-12 relative z-10 shadow-lg" style={{ clipPath: 'polygon(25% 0, 100% 0, 75% 100%, 0% 100%)' }}></div>
        
        {/* Logo Section */}
        <div className="flex items-center gap-6 ml-12">
          <div className="w-20 h-20 flex items-center justify-center p-1 bg-white rounded-full shadow-md">
            <img 
              src={getDriveDirectLink(FEDERATION_LOGO)} 
              alt="Logo" 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="h-12 w-[2px] bg-slate-200"></div>
          <div className="flex flex-col">
            <h2 className="text-2xl font-black text-[#02428c] uppercase tracking-tighter leading-tight">
              SELECCIÓN NACIONAL
            </h2>
            <span className="text-2xl font-black text-red-600 uppercase tracking-tighter leading-none">
              {formatCategoryLabel(selectedCategory)}
            </span>
          </div>
        </div>
      </div>

      {/* Metadata Section */}
      <div className="mt-4 px-8 border-b-2 border-[#02428c] pb-2">
        <div className="grid grid-cols-3 gap-8">
          <div className="flex items-center gap-3">
             <div className="w-1.5 h-1.5 rounded-full bg-[#02428c]"></div>
             <span className="text-xs font-black text-slate-900 uppercase">MICROCICLO</span>
             <div className="h-4 w-px bg-slate-300"></div>
             <span className="text-sm font-black text-red-600">#{microNumber}</span>
          </div>
          <div className="flex items-center gap-3">
             <div className="w-1.5 h-1.5 rounded-full bg-[#02428c]"></div>
             <span className="text-xs font-black text-slate-900 uppercase">SESIÓN</span>
             <div className="h-4 w-px bg-slate-300"></div>
             <span className="text-sm font-black text-red-600">AM</span>
          </div>
          <div className="flex items-center gap-3">
             <div className="w-1.5 h-1.5 rounded-full bg-[#02428c]"></div>
             <span className="text-xs font-black text-slate-900 uppercase">LUGARES</span>
             <div className="h-4 w-px bg-slate-300"></div>
             <span className="text-sm font-black text-red-600 truncate">{location.toUpperCase()}</span>
          </div>
        </div>
      </div>
      
      <div className="mt-2 flex justify-end px-8">
         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
           HOJA {page} / {total} — GENERADO EL {new Date().toLocaleDateString()}
         </span>
      </div>
    </div>
  );
}

function PrintFooter({ page }: { page: number }) {
  return (
    <div className="hidden print:block absolute bottom-4 left-10 right-10 border-t border-slate-100 pt-1">
      <div className="flex justify-between items-center">
        <p className="text-[5px] font-black text-slate-300 uppercase tracking-[0.2em]">Documento Confidencial • Área Física Selección Nacional • © 2026</p>
        <p className="text-[6px] font-black text-slate-900">Pág {page}</p>
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
