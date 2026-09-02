import React, { useMemo, useState, useEffect } from 'react';
import { AthletePerformanceRecord, User } from '../types';
import { normalizeClub, getDriveDirectLink } from '../lib/utils';
import { CLUB_LOGOS } from '../constants';
import { supabase } from '../lib/supabase';

interface ClubHomeProps {
  performanceRecords: AthletePerformanceRecord[];
  userClub?: string;
  userClubId?: number | null;
  clubs?: any[];
}

interface DynamicTask {
  id: string;
  nombre: string;
  link_foto?: string;
  link_video?: string;
  tipo?: string;
  descripcion?: string;
  contenidos_ofensivos?: string[];
  contenidos_defensivos?: string[];
  consignas?: string[];
  reglas?: string[];
  variantes?: string[];
}

interface TareaSemanal {
  id: string;
  fecha: string;
  dinamica: string;
  nombre: string;
  jornada: string;
  observacion?: string;
  id_microcycles?: string | number;
}

interface Citacion {
  player_id: number;
  microcycle_id: number;
  fecha_citacion: string;
}

interface Microcycle {
  id: number;
  start_date: string;
  end_date: string;
  country?: string;
  city?: string;
  micro_number?: number;
  category_id?: number;
}

const ClubHome: React.FC<ClubHomeProps> = ({ performanceRecords, userClub, userClubId, clubs = [] }) => {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  
  // Date and Microcycle State
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [microcycles, setMicrocycles] = useState<Microcycle[]>([]);
  const [citations, setCitations] = useState<Citacion[]>([]);
  const [scheduledTasks, setScheduledTasks] = useState<TareaSemanal[]>([]);
  const [dynamicsLibrary, setDynamicsLibrary] = useState<DynamicTask[]>([]);
  
  // Evaluation States
  const [cmjEvaluations, setCmjEvaluations] = useState<any[]>([]);
  const [sljEvaluations, setSljEvaluations] = useState<any[]>([]);
  const [imtpEvaluations, setImtpEvaluations] = useState<any[]>([]);
  const [speedEvaluations, setSpeedEvaluations] = useState<any[]>([]);
  
  const [loading, setLoading] = useState<boolean>(false);

  // Get logo
  const getClubLogo = (clubName: string) => {
    if (!clubName) return null;
    const normName = normalizeClub(clubName);
    const club = clubs.find(c => normalizeClub(c.nombre) === normName);
    if (club?.logo_url) {
      return getDriveDirectLink(club.logo_url);
    }
    return CLUB_LOGOS[normName] || null;
  };

  const userClubLogo = useMemo(() => {
    return getClubLogo(userClub || '');
  }, [userClub, clubs]);

  // Fetch metadata, scheduled tasks, and physical evaluations
  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Microcycles
        const { data: mcData } = await supabase.from('microcycles').select('*').order('start_date', { ascending: false });
        if (mcData) setMicrocycles(mcData);

        // 2. Fetch Weekly Dynamics
        const { data: taskData } = await supabase.from('tareas_semanales').select('*');
        if (taskData) setScheduledTasks(taskData);

        // 3. Fetch Dynamics Library
        const { data: dynData } = await supabase.from('tareas').select('*');
        if (dynData) setDynamicsLibrary(dynData);

        // 4. Fetch Physical Evaluations
        const [cmjRes, sljRes, imtpRes, speedRes] = await Promise.all([
          supabase.from('evaluaciones_cmj').select('*'),
          supabase.from('evaluaciones_slj').select('*'),
          supabase.from('evaluaciones_imtp').select('*'),
          supabase.from('velocidad_tests').select('*')
        ]);

        if (cmjRes.data) setCmjEvaluations(cmjRes.data);
        if (sljRes.data) setSljEvaluations(sljRes.data);
        if (imtpRes.data) setImtpEvaluations(imtpRes.data);
        if (speedRes.data) setSpeedEvaluations(speedRes.data);

      } catch (err) {
        console.error("Error loading ClubHome dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // Determine active microcycle based on selectedDate
  const activeMicrocycle = useMemo(() => {
    if (microcycles.length === 0) return null;
    // Find microcycle containing selectedDate
    const containing = microcycles.find(mc => {
      return selectedDate >= mc.start_date && selectedDate <= mc.end_date;
    });
    // Fallback to the latest microcycle if none contains the selected date
    return containing || microcycles[0];
  }, [microcycles, selectedDate]);

  // Determine all microcycles active on the selectedDate (handles parallel microcycles)
  const activeMicrocycles = useMemo(() => {
    return microcycles.filter(mc => selectedDate >= mc.start_date && selectedDate <= mc.end_date);
  }, [microcycles, selectedDate]);

  // Fetch only the citations belonging to the active microcycles to avoid postgREST 1000-row limits
  useEffect(() => {
    if (microcycles.length === 0) return;

    const loadCitationsForActiveMicros = async () => {
      const activeMcIds = activeMicrocycles.map(mc => Number(mc.id));

      if (activeMcIds.length === 0 && activeMicrocycle) {
        activeMcIds.push(Number(activeMicrocycle.id));
      }

      if (activeMcIds.length > 0) {
        const { data: citData, error } = await supabase
          .from('citaciones')
          .select('*')
          .in('microcycle_id', activeMcIds);

        if (error) {
          console.error("Error fetching filtered citations:", error);
        } else if (citData) {
          setCitations(citData);
        }
      } else {
        setCitations([]);
      }
    };

    loadCitationsForActiveMicros();
  }, [selectedDate, microcycles, activeMicrocycles, activeMicrocycle]);

  // Filter players that belong to the user's club
  const clubPlayers = useMemo(() => {
    if (!userClub) return [];
    const uClubNorm = normalizeClub(userClub);
    return performanceRecords
      .map(r => r.player)
      .filter(p => {
        let isMyPlayer = false;
        if (userClubId && p.id_club) {
          isMyPlayer = Number(p.id_club) === Number(userClubId) || String(p.id_club) === String(userClubId);
        }
        if (!isMyPlayer) {
          const pClub = p.club_name || p.club || '';
          isMyPlayer = normalizeClub(pClub) === uClubNorm;
        }
        return isMyPlayer;
      });
  }, [performanceRecords, userClub, userClubId]);

  const clubPlayerIds = useMemo(() => {
    return new Set(clubPlayers.map(p => p.player_id ? Number(p.player_id) : null).filter(Boolean) as number[]);
  }, [clubPlayers]);

  // 1. DINÁMICAS DEL DÍA
  const [selectedJornada, setSelectedJornada] = useState<string>('AM');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('TODAS');

  // Automatically reset category filter to 'TODAS' when selected date changes
  useEffect(() => {
    setSelectedCategoryFilter('TODAS');
  }, [selectedDate]);

  // Get active categories of training on selected date
  const trainingCategories = useMemo(() => {
    const activeMcs = microcycles.filter(mc => selectedDate >= mc.start_date && selectedDate <= mc.end_date);
    const catIds = Array.from(new Set(activeMcs.map(mc => mc.category_id).filter(Boolean))) as number[];
    
    if (catIds.length === 0) {
      const scheduledToday = scheduledTasks.filter(t => t.fecha === selectedDate);
      scheduledToday.forEach(st => {
        const mc = microcycles.find(m => String(m.id) === String(st.id_microcycles));
        if (mc?.category_id) {
          catIds.push(mc.category_id);
        }
      });
    }

    return Array.from(new Set(catIds)).sort((a, b) => a - b);
  }, [microcycles, scheduledTasks, selectedDate]);

  const getCategoryLabel = (catId: number | string) => {
    const labels: Record<number, string> = {
      1: 'SUB-13',
      2: 'SUB-14',
      3: 'SUB-15',
      4: 'SUB-16',
      5: 'SUB-17',
      6: 'SUB-18',
      7: 'SUB-20',
      8: 'SUB-21',
      9: 'SUB-23',
      10: 'ADULTA'
    };
    return labels[Number(catId)] || `SUB-${catId}`;
  };

  const dailyDynamics = useMemo(() => {
    // Filter scheduled tasks for selectedDate
    const scheduledToday = scheduledTasks.filter(t => t.fecha === selectedDate);
    
    const mapped = scheduledToday.map(st => {
      // Find matching detailed dynamic in the seeded library
      const matchedLibrary = dynamicsLibrary.find(d => 
        normalizeClub(d.nombre) === normalizeClub(st.nombre) || 
        normalizeClub(d.nombre) === normalizeClub(st.dinamica)
      );

      // Find microcycle containing this task
      const mc = microcycles.find(m => String(m.id) === String(st.id_microcycles));

      return {
        id: st.id,
        nombre: st.nombre || st.dinamica,
        jornada: st.jornada || 'AM',
        observacion: st.observacion,
        categoryId: mc?.category_id,
        detail: matchedLibrary
      };
    });

    // Filter by selectedJornada (AM / PM)
    let filtered = mapped.filter(d => d.jornada === selectedJornada);

    // Filter by selectedCategoryFilter
    if (selectedCategoryFilter !== 'TODAS') {
      filtered = filtered.filter(d => d.categoryId !== undefined && String(d.categoryId) === String(selectedCategoryFilter));
    }

    return filtered;
  }, [scheduledTasks, dynamicsLibrary, microcycles, selectedDate, selectedJornada, selectedCategoryFilter]);

  // 2. JUGADORES EN EL MICROCICLO ACTIVO
  const activeMicrocyclePlayers = useMemo(() => {
    if (activeMicrocycles.length === 0) {
      if (!activeMicrocycle) return [];
      const citedIds = new Set(
        citations
          .filter(c => Number(c.microcycle_id) === Number(activeMicrocycle.id))
          .map(c => Number(c.player_id))
      );
      return clubPlayers.filter(p => p.player_id && citedIds.has(Number(p.player_id)));
    }

    const activeMcIds = new Set(activeMicrocycles.map(mc => Number(mc.id)));

    // Get player IDs cited for any active microcycles
    const citedPlayerIds = new Set(
      citations
        .filter(c => activeMcIds.has(Number(c.microcycle_id)))
        .map(c => Number(c.player_id))
    );

    // Filter club players who are cited in these microcycles
    return clubPlayers.filter(p => p.player_id && citedPlayerIds.has(Number(p.player_id)));
  }, [activeMicrocycles, activeMicrocycle, citations, clubPlayers]);

  // 3. TOP 3 PARÁMETROS FÍSICOS (GPS) - MÁXIMOS PARÁMETROS HISTÓRICOS DE JUGADORES DEL CLUB
  const physicalTopPerformers = useMemo(() => {
    const playerMaxGps: Record<number, { 
      player: User; 
      maxDistance: number; 
      maxHsr: number; 
      maxSprints: number;
    }> = {};

    performanceRecords.forEach(record => {
      const pId = record.player.player_id;
      if (!pId || !clubPlayerIds.has(pId)) return;

      let maxDistance = 0;
      let maxHsr = 0;
      let maxSprints = 0;

      // Scan all historical GPS logs for this player
      if (Array.isArray(record.gps)) {
        record.gps.forEach(g => {
          const dist = Number(g.totalDistance || 0);
          const hsr = Number(g.hsrDistance || 0);
          const spr = Number(g.sprintCount || 0);

          if (dist > maxDistance) maxDistance = dist;
          if (hsr > maxHsr) maxHsr = hsr;
          if (spr > maxSprints) maxSprints = spr;
        });
      }

      if (maxDistance > 0 || maxHsr > 0 || maxSprints > 0) {
        playerMaxGps[pId] = {
          player: record.player,
          maxDistance,
          maxHsr,
          maxSprints
        };
      }
    });

    const getTop3 = (metricKey: 'maxDistance' | 'maxHsr' | 'maxSprints') => {
      return Object.values(playerMaxGps)
        .filter(r => r[metricKey] > 0)
        .sort((a, b) => b[metricKey] - a[metricKey])
        .slice(0, 3)
        .map((r, index) => ({
          rank: index + 1,
          player: r.player,
          value: r[metricKey]
        }));
    };

    return {
      distancia: getTop3('maxDistance'),
      hsr: getTop3('maxHsr'),
      sprints: getTop3('maxSprints')
    };
  }, [performanceRecords, clubPlayerIds]);

  // 4. TOP 3 EN EVALUACIONES FÍSICAS (SOLO CMJ E IMTP)
  const evaluationsTopPerformers = useMemo(() => {
    const getTop3FromEvaluations = (
      dataList: any[],
      metricKey: string,
      playerKey: string = 'player_id',
      higherIsBetter: boolean = true
    ) => {
      const playerBestMap: Record<number, { player: User; score: number; date: string }> = {};

      dataList.forEach(item => {
        const pId = Number(item[playerKey]);
        if (!pId || !clubPlayerIds.has(pId)) return;

        const val = Number(item[metricKey]);
        if (isNaN(val) || val <= 0) return;

        const dateVal = item.fecha_test || item.fecha || '';

        if (!playerBestMap[pId]) {
          const matchedPlayer = clubPlayers.find(p => p.player_id && Number(p.player_id) === Number(pId));
          if (matchedPlayer) {
            playerBestMap[pId] = { player: matchedPlayer, score: val, date: dateVal };
          }
        } else {
          const currentBest = playerBestMap[pId].score;
          const shouldUpdate = higherIsBetter ? val > currentBest : val < currentBest;
          if (shouldUpdate) {
            playerBestMap[pId].score = val;
            playerBestMap[pId].date = dateVal;
          }
        }
      });

      return Object.values(playerBestMap)
        .sort((a, b) => higherIsBetter ? b.score - a.score : a.score - b.score)
        .slice(0, 3)
        .map((r, index) => ({
          rank: index + 1,
          player: r.player,
          value: r.score,
          date: r.date
        }));
    };

    return {
      cmj: getTop3FromEvaluations(cmjEvaluations, 'cmj_altura_salto_im'),
      imtp: getTop3FromEvaluations(imtpEvaluations, 'imtp_fuerza_n')
    };
  }, [cmjEvaluations, imtpEvaluations, clubPlayers, clubPlayerIds]);

  // Players grouped by Year (Original functionality preserved)
  const playersByYear = useMemo(() => {
    const groups: Record<number, User[]> = {};
    clubPlayers.forEach(player => {
      let year = player.anio;
      if (!year && player.fecha_nacimiento) {
        year = new Date(player.fecha_nacimiento).getFullYear();
      }
      if (year) {
        if (!groups[year]) groups[year] = [];
        groups[year].push(player);
      }
    });
    return groups;
  }, [clubPlayers]);

  const sortedYears = useMemo(() => {
    return Object.keys(playersByYear).map(Number).sort((a, b) => b - a);
  }, [playersByYear]);

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      
      {/* 1. CABECERA PRINCIPAL & CONTROL DE FECHA */}
      <div className="bg-[#0b1220] rounded-[40px] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full -mr-48 -mt-48 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {userClubLogo && (
                <img 
                  src={userClubLogo} 
                  alt={userClub} 
                  className="h-10 w-auto object-contain brightness-0 invert"
                  referrerPolicy="no-referrer"
                />
              )}
              <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase leading-none">
                {userClub ? `${userClub}` : "Mi Club"} <span className="text-red-600">INICIO</span>
              </h1>
            </div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">
              Panel de control y monitoreo de rendimiento
            </p>
          </div>

          {/* Selector de fecha y microciclo */}
          <div className="flex flex-wrap items-center gap-4 bg-white/5 backdrop-blur-md p-4 rounded-3xl border border-white/10">
            <div className="flex flex-col">
              <label className="text-[8px] font-black uppercase text-red-500 tracking-widest mb-1">Fecha de Análisis</label>
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-white font-black text-sm uppercase tracking-tight focus:outline-none cursor-pointer [color-scheme:dark]"
              />
            </div>
            <div className="w-[1px] h-8 bg-white/10 hidden sm:block"></div>
            <div className="flex flex-col">
              <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">Microciclo Activo</span>
              <span className="text-white font-black text-xs uppercase tracking-tight">
                {activeMicrocycle ? `Microciclo #${activeMicrocycle.micro_number || activeMicrocycle.id}` : "Cargando..."}
              </span>
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="py-12 text-center bg-white rounded-[32px] border border-slate-100 shadow-sm">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-red-600 border-t-transparent mb-4"></div>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Sincronizando información de la base de datos...</p>
        </div>
      )}

      {!loading && (
        <div className="space-y-10">
            
            {/* 1. DINÁMICAS DE LA CATEGORÍA */}
            <div className="bg-white rounded-[40px] p-6 md:p-8 border border-slate-100 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                    <i className="fa-solid fa-list-check text-lg"></i>
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 uppercase italic tracking-tighter leading-none mb-1">
                      Tareas de la Categoría
                    </h2>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      {dailyDynamics.length} Sesiones programadas
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {/* Toggle AM / PM */}
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/50">
                    <button 
                      onClick={() => setSelectedJornada('AM')}
                      className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all ${
                        selectedJornada === 'AM' 
                          ? 'bg-white text-red-600 shadow-sm font-black' 
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      AM
                    </button>
                    <button 
                      onClick={() => setSelectedJornada('PM')}
                      className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all ${
                        selectedJornada === 'PM' 
                          ? 'bg-white text-red-600 shadow-sm font-black' 
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      PM
                    </button>
                  </div>

                  {/* Link GESTIONAR */}
                  <button 
                    onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-menu', { detail: { menuId: 'tecnica' } }))}
                    className="text-red-600 text-[10px] font-black uppercase tracking-widest hover:underline shrink-0"
                  >
                    GESTIONAR &gt;
                  </button>
                </div>
              </div>

              {/* Categorías de entrenamiento activas */}
              <div className="flex flex-wrap items-center gap-2 pt-1 pb-2">
                <button
                  onClick={() => setSelectedCategoryFilter('TODAS')}
                  className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-xl border transition-all ${
                    selectedCategoryFilter === 'TODAS'
                      ? 'bg-red-600 border-red-600 text-white shadow-md'
                      : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'
                  }`}
                >
                  TODAS ({trainingCategories.length})
                </button>
                {trainingCategories.map(catId => {
                  const isSelected = String(selectedCategoryFilter) === String(catId);
                  return (
                    <button
                      key={catId}
                      onClick={() => setSelectedCategoryFilter(String(catId))}
                      className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-red-600 border-red-600 text-white shadow-md'
                          : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'
                      }`}
                    >
                      {getCategoryLabel(catId)}
                    </button>
                  );
                })}
              </div>

              {dailyDynamics.length === 0 ? (
                <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <i className="fa-solid fa-calendar-day text-slate-300 text-3xl mb-3 block"></i>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
                    No se han asignado dinámicas técnicas para esta categoría
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dailyDynamics.map(dyn => (
                    <div 
                      key={dyn.id} 
                      className="p-5 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col justify-between hover:shadow-md transition-all group"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-1 bg-red-50 text-red-600 text-[8px] font-black uppercase tracking-widest rounded-lg">
                            {dyn.categoryId ? getCategoryLabel(dyn.categoryId) : 'GENERAL'} {dyn.jornada}
                          </span>
                          {dyn.detail?.tipo && (
                            <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">
                              {dyn.detail.tipo}
                            </span>
                          )}
                        </div>

                        <div>
                          <h3 className="font-black text-slate-900 uppercase italic tracking-tight text-base group-hover:text-red-600 transition-colors">
                            {dyn.nombre}
                          </h3>
                          {dyn.detail?.descripcion && (
                            <p className="text-xs text-slate-500 line-clamp-2 mt-1 font-medium">
                              {dyn.detail.descripcion}
                            </p>
                          )}
                        </div>

                        {/* Contenidos tácticos de la dinámica oficial de la ANFP */}
                        {dyn.detail && (
                          <div className="pt-2 border-t border-slate-200/50 space-y-1">
                            {dyn.detail.contenidos_ofensivos && dyn.detail.contenidos_ofensivos.length > 0 && (
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                <span className="text-[9px] font-black uppercase text-slate-600 truncate">
                                  Ofensivo: {dyn.detail.contenidos_ofensivos[0]}
                                </span>
                              </div>
                            )}
                            {dyn.detail.contenidos_defensivos && dyn.detail.contenidos_defensivos.length > 0 && (
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                <span className="text-[9px] font-black uppercase text-slate-600 truncate">
                                  Defensivo: {dyn.detail.contenidos_defensivos[0]}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Enlaces multimedia oficiales */}
                      <div className="mt-4 pt-3 border-t border-slate-200/50 flex items-center justify-between">
                        <span className="text-[8px] text-slate-400 font-bold truncate pr-2">
                          {dyn.observacion || "Sin observaciones"}
                        </span>
                        
                        <div className="flex gap-2 shrink-0">
                          {dyn.detail?.link_foto && (
                            <a 
                              href={getDriveDirectLink(dyn.detail.link_foto)} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="w-7 h-7 rounded-lg bg-white shadow-sm border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                              title="Ver Gráfico/Foto"
                            >
                              <i className="fa-solid fa-image text-[10px]"></i>
                            </a>
                          )}
                          {dyn.detail?.link_video && (
                            <a 
                              href={dyn.detail.link_video} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="w-7 h-7 rounded-lg bg-white shadow-sm border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                              title="Ver Video Ejercicio"
                            >
                              <i className="fa-solid fa-play text-[10px]"></i>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. JUGADORES EN EL MICROCICLO */}
            <div className="bg-white rounded-[40px] p-6 md:p-8 border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-6 bg-blue-600 rounded-full"></div>
                  <h2 className="text-lg font-black text-slate-900 uppercase italic tracking-tighter">
                    Jugadores Citados en el Microciclo Activo
                  </h2>
                </div>
                <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[9px] font-black uppercase tracking-wider">
                  {activeMicrocyclePlayers.length} Convocados
                </span>
              </div>

              {activeMicrocyclePlayers.length === 0 ? (
                <div className="py-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <i className="fa-solid fa-users-slash text-slate-300 text-3xl mb-3 block"></i>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
                    No hay jugadores de tu club convocados para este microciclo
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {activeMicrocyclePlayers.map(player => (
                    <div 
                      key={player.player_id}
                      onClick={() => {
                        if (player.player_id) {
                          sessionStorage.setItem('selectedPlayerIdForProfile', String(player.player_id));
                          window.dispatchEvent(new CustomEvent('navigate-to-profile', { detail: { playerId: player.player_id } }));
                        }
                      }}
                      className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-transparent hover:border-slate-200 hover:bg-slate-100 transition-all cursor-pointer group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center font-black text-slate-400 text-[10px] shadow-sm overflow-hidden p-1 group-hover:bg-blue-600 group-hover:text-white transition-all">
                        {userClubLogo ? (
                          <img src={userClubLogo} alt={userClub} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                        ) : (
                          <span>{player.nombre?.[0]}{player.apellido1?.[0]}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-black text-slate-900 uppercase italic tracking-tight truncate group-hover:text-blue-600 transition-colors">
                          {player.nombre} {player.apellido1}
                        </h4>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate mt-0.5">
                          {player.position || 'S/D'} • {player.category || 'SELECCIÓN'}
                        </p>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
      )}

      {/* 5. SECCIÓN ORIGINAL: EXPLORACIÓN POR GENERACIONES */}
      <div className="space-y-6 pt-6 border-t border-slate-100">
        <div className="flex items-center gap-4 ml-4">
          <div className="w-2 h-8 bg-slate-800 rounded-full"></div>
          <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Categorías por Año</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {sortedYears.map(year => (
            <button
              key={year}
              onClick={() => setSelectedYear(selectedYear === year ? null : year)}
              className={`group relative p-8 rounded-[32px] border transition-all duration-300 ${
                selectedYear === year 
                  ? 'bg-[#0b1220] border-[#0b1220] text-white shadow-xl shadow-slate-900/40 scale-105' 
                  : 'bg-white border-slate-100 text-slate-900 hover:border-red-200 hover:shadow-lg'
              }`}
            >
              <div className={`text-4xl font-black italic tracking-tighter mb-2 ${selectedYear === year ? 'text-white' : 'text-slate-900'}`}>
                {year}
              </div>
              <div className={`text-[10px] font-black uppercase tracking-widest ${selectedYear === year ? 'text-white/60' : 'text-slate-400'}`}>
                {playersByYear[year].length} Jugadores
              </div>
              <div className={`absolute bottom-6 right-6 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                selectedYear === year ? 'bg-white text-[#0b1220] rotate-180' : 'bg-slate-50 text-slate-300 group-hover:bg-red-50 group-hover:text-red-500'
              }`}>
                <i className="fa-solid fa-chevron-down text-[10px]"></i>
              </div>
            </button>
          ))}
          {sortedYears.length === 0 && (
            <div className="col-span-full py-12 text-center bg-white rounded-[32px] border border-dashed border-slate-200">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">No se encontraron registros de generaciones</p>
            </div>
          )}
        </div>
      </div>

      {selectedYear && (
        <div className="bg-white rounded-[40px] p-8 md:p-12 border border-slate-100 shadow-sm animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">
              Jugadores Generación <span className="text-red-600">{selectedYear}</span>
            </h2>
            <div className="px-4 py-2 bg-slate-50 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {playersByYear[selectedYear].length} Registrados
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {playersByYear[selectedYear].map(player => {
              const pClub = player.club_name || player.club || '';
              const pLogo = getClubLogo(pClub);
              
              return (
                <div 
                  key={player.player_id}
                  onClick={() => {
                    if (player.player_id) {
                      sessionStorage.setItem('selectedPlayerIdForProfile', String(player.player_id));
                      window.dispatchEvent(new CustomEvent('navigate-to-profile', { detail: { playerId: player.player_id } }));
                    }
                  }}
                  className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-slate-200 hover:bg-slate-100 transition-all group cursor-pointer"
                >
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-400 font-black text-xs shadow-sm group-hover:bg-red-600 group-hover:text-white transition-all overflow-hidden p-1">
                    {pLogo ? (
                      <img src={pLogo} alt={pClub} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <span>{player.nombre?.[0]}{player.apellido1?.[0]}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase italic tracking-tight">
                      {player.nombre} {player.apellido1}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{player.position || 'S/D'}</span>
                      <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                      <span className="text-[9px] font-black text-red-600 uppercase tracking-widest">{pClub || 'S/D'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. TABLA DETALLADA DE TODOS LOS JUGADORES DEL CLUB */}
      {userClub && (
        <div className="space-y-6 pt-6 border-t border-slate-100">
          <div className="flex items-center gap-4 ml-4">
            <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
            <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">
              Todos los Jugadores de <span className="text-blue-600">{userClub}</span> en Selección
            </h2>
          </div>
          
          <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Jugador</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Posición</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Año</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {clubPlayers.map(player => (
                    <tr 
                      key={player.player_id} 
                      onClick={() => {
                        if (player.player_id) {
                          sessionStorage.setItem('selectedPlayerIdForProfile', String(player.player_id));
                          window.dispatchEvent(new CustomEvent('navigate-to-profile', { detail: { playerId: player.player_id } }));
                        }
                      }}
                      className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-black text-[10px] group-hover:bg-blue-600 group-hover:text-white transition-all overflow-hidden p-1">
                            {userClubLogo ? (
                              <img src={userClubLogo} alt={userClub} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                            ) : (
                              <span>{player.nombre?.[0]}{player.apellido1?.[0]}</span>
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-900 uppercase italic tracking-tight">{player.nombre} {player.apellido1}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{player.position || 'S/D'}</span>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                          {player.anio || (player.fecha_nacimiento ? new Date(player.fecha_nacimiento).getFullYear() : 'S/D')}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button className="w-8 h-8 rounded-lg bg-slate-50 text-slate-300 flex items-center justify-center hover:bg-blue-50 hover:text-blue-600 transition-all">
                          <i className="fa-solid fa-eye text-[10px]"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {clubPlayers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-8 py-12 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest">
                        No se encontraron jugadores de tu club en los registros actuales
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClubHome;
