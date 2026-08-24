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
        // 1. Fetch Microcycles and Citations
        const { data: mcData } = await supabase.from('microcycles').select('*').order('start_date', { ascending: false });
        if (mcData) setMicrocycles(mcData);

        const { data: citData } = await supabase.from('citaciones').select('*');
        if (citData) setCitations(citData);

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
  const dailyDynamics = useMemo(() => {
    // Filter scheduled tasks for selectedDate
    const scheduledToday = scheduledTasks.filter(t => t.fecha === selectedDate);
    
    return scheduledToday.map(st => {
      // Find matching detailed dynamic in the seeded library
      const matchedLibrary = dynamicsLibrary.find(d => 
        normalizeClub(d.nombre) === normalizeClub(st.nombre) || 
        normalizeClub(d.nombre) === normalizeClub(st.dinamica)
      );

      return {
        id: st.id,
        nombre: st.nombre || st.dinamica,
        jornada: st.jornada,
        observacion: st.observacion,
        detail: matchedLibrary
      };
    });
  }, [scheduledTasks, dynamicsLibrary, selectedDate]);

  // 2. JUGADORES EN EL MICROCICLO ACTIVO
  const activeMicrocyclePlayers = useMemo(() => {
    if (!activeMicrocycle) return [];
    
    // Get player IDs cited for this microcycle
    const citedPlayerIds = new Set(
      citations
        .filter(c => Number(c.microcycle_id) === Number(activeMicrocycle.id))
        .map(c => Number(c.player_id))
    );

    // Filter club players who are cited
    const filtered = clubPlayers.filter(p => p.player_id && (citedPlayerIds.has(Number(p.player_id)) || citedPlayerIds.has(p.player_id)));

    console.log("ClubHome Diagnostic Log:", {
      userClub,
      userClubId,
      performanceRecordsCount: performanceRecords.length,
      clubPlayersCount: clubPlayers.length,
      activeMicrocycleId: activeMicrocycle.id,
      citationsCountForActiveMicrocycle: citations.filter(c => Number(c.microcycle_id) === Number(activeMicrocycle.id)).length,
      citedPlayerIdsList: Array.from(citedPlayerIds),
      activeMicrocyclePlayersCount: filtered.length
    });

    return filtered;
  }, [activeMicrocycle, citations, clubPlayers, performanceRecords, userClub, userClubId]);

  // 3. TOP 3 PARÁMETROS FÍSICOS (GPS) PARA LA FECHA SELECCIONADA
  const physicalTopPerformers = useMemo(() => {
    const dailyGpsRecords: { player: User; gps: any }[] = [];

    performanceRecords.forEach(record => {
      const isMyPlayer = record.player.player_id && clubPlayerIds.has(record.player.player_id);
      if (!isMyPlayer) return;

      // Find GPS log for selectedDate
      const gpsLog = record.gps.find(g => g.date === selectedDate);
      if (gpsLog) {
        dailyGpsRecords.push({ player: record.player, gps: gpsLog });
      }
    });

    const getTop3 = (metricKey: 'totalDistance' | 'hsrDistance' | 'sprintCount' | 'maxSpeed') => {
      return [...dailyGpsRecords]
        .filter(r => r.gps[metricKey] !== undefined && r.gps[metricKey] !== null && r.gps[metricKey] > 0)
        .sort((a, b) => b.gps[metricKey] - a.gps[metricKey])
        .slice(0, 3)
        .map((r, index) => ({
          rank: index + 1,
          player: r.player,
          value: r.gps[metricKey]
        }));
    };

    return {
      distancia: getTop3('totalDistance'),
      hsr: getTop3('hsrDistance'),
      sprints: getTop3('sprintCount'),
      velocidad: getTop3('maxSpeed')
    };
  }, [performanceRecords, clubPlayerIds, selectedDate]);

  // 4. TOP 3 EN EVALUACIONES FÍSICAS (CMJ, SLJ, IMTP, Velocidad)
  const evaluationsTopPerformers = useMemo(() => {
    const getTop3FromEvaluations = (
      dataList: any[],
      metricKey: string,
      playerKey: string = 'player_id',
      higherIsBetter: boolean = true
    ) => {
      // Find maximum score per player in the entire history
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
      slj: getTop3FromEvaluations(sljEvaluations, 'jump_height_cm'),
      imtp: getTop3FromEvaluations(imtpEvaluations, 'imtp_fuerza_n'),
      speed: getTop3FromEvaluations(speedEvaluations, 'vel_max_kmh')
    };
  }, [cmjEvaluations, sljEvaluations, imtpEvaluations, speedEvaluations, clubPlayers, clubPlayerIds]);

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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* COLUMNA IZQUIERDA: DINÁMICAS Y MICROCICLO */}
          <div className="lg:col-span-2 space-y-10">
            
            {/* 1. DINÁMICAS DEL DÍA */}
            <div className="bg-white rounded-[40px] p-6 md:p-8 border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-6 bg-red-600 rounded-full"></div>
                  <h2 className="text-lg font-black text-slate-900 uppercase italic tracking-tighter">
                    Dinámicas de la Jornada
                  </h2>
                </div>
                <span className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-[9px] font-black uppercase tracking-wider">
                  {dailyDynamics.length} Sesiones
                </span>
              </div>

              {dailyDynamics.length === 0 ? (
                <div className="py-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <i className="fa-solid fa-calendar-day text-slate-300 text-3xl mb-3 block"></i>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
                    No se han asignado dinámicas técnicas para esta fecha
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
                          <span className="px-2.5 py-1 bg-[#0b1220] text-white text-[8px] font-black uppercase tracking-widest rounded-lg">
                            {dyn.jornada}
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

          {/* COLUMNA DERECHA: PARÁMETROS GPS & EVALUACIONES FÍSICAS */}
          <div className="space-y-10">
            
            {/* 3. VALORES TOP 3 EN PARÁMETROS FÍSICOS (GPS) */}
            <div className="bg-[#0b1220] rounded-[40px] p-6 md:p-8 text-white shadow-xl space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 rounded-full -mr-32 -mt-32 blur-2xl"></div>
              
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <div className="w-2 h-6 bg-red-600 rounded-full"></div>
                <h2 className="text-base font-black uppercase italic tracking-tighter">
                  Top 3 GPS ({selectedDate})
                </h2>
              </div>

              <div className="space-y-5">
                
                {/* METRICA 1: DISTANCIA */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                    <span>Distancia Total (m)</span>
                    <i className="fa-solid fa-road text-red-500"></i>
                  </div>
                  <div className="space-y-1.5">
                    {physicalTopPerformers.distancia.map(perf => (
                      <div key={perf.rank} className="flex items-center justify-between bg-white/5 p-2 rounded-xl text-xs">
                        <span className="font-black text-red-500 w-4">{perf.rank}°</span>
                        <span className="font-bold uppercase truncate flex-1 px-2">{perf.player.nombre} {perf.player.apellido1}</span>
                        <span className="font-black text-white">{Math.round(perf.value)} m</span>
                      </div>
                    ))}
                    {physicalTopPerformers.distancia.length === 0 && (
                      <p className="text-[9px] text-slate-500 font-bold uppercase italic">Sin datos cargados para hoy</p>
                    )}
                  </div>
                </div>

                {/* METRICA 2: HSR */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                    <span>HSR Alta Intensidad (&gt;20 km/h)</span>
                    <i className="fa-solid fa-bolt text-amber-500"></i>
                  </div>
                  <div className="space-y-1.5">
                    {physicalTopPerformers.hsr.map(perf => (
                      <div key={perf.rank} className="flex items-center justify-between bg-white/5 p-2 rounded-xl text-xs">
                        <span className="font-black text-amber-500 w-4">{perf.rank}°</span>
                        <span className="font-bold uppercase truncate flex-1 px-2">{perf.player.nombre} {perf.player.apellido1}</span>
                        <span className="font-black text-white">{Math.round(perf.value)} m</span>
                      </div>
                    ))}
                    {physicalTopPerformers.hsr.length === 0 && (
                      <p className="text-[9px] text-slate-500 font-bold uppercase italic">Sin datos cargados para hoy</p>
                    )}
                  </div>
                </div>

                {/* METRICA 3: SPRINTS */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                    <span>Sprints Ejecutados (&gt;25 km/h)</span>
                    <i className="fa-solid fa-gauge-high text-emerald-500"></i>
                  </div>
                  <div className="space-y-1.5">
                    {physicalTopPerformers.sprints.map(perf => (
                      <div key={perf.rank} className="flex items-center justify-between bg-white/5 p-2 rounded-xl text-xs">
                        <span className="font-black text-emerald-500 w-4">{perf.rank}°</span>
                        <span className="font-bold uppercase truncate flex-1 px-2">{perf.player.nombre} {perf.player.apellido1}</span>
                        <span className="font-black text-white">{perf.value}</span>
                      </div>
                    ))}
                    {physicalTopPerformers.sprints.length === 0 && (
                      <p className="text-[9px] text-slate-500 font-bold uppercase italic">Sin datos cargados para hoy</p>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* 4. VALORES TOP 3 EN EVALUACIONES FÍSICAS */}
            <div className="bg-white rounded-[40px] p-6 md:p-8 border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-2 h-6 bg-red-600 rounded-full"></div>
                <h2 className="text-base font-black text-slate-900 uppercase italic tracking-tighter">
                  Top 3 Evaluaciones Históricas
                </h2>
              </div>

              <div className="space-y-6">
                
                {/* CMJ HEIGHT */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                    <span>Salto Vertical (CMJ - Altura cm)</span>
                    <i className="fa-solid fa-arrows-up-down text-blue-500"></i>
                  </div>
                  <div className="space-y-1.5">
                    {evaluationsTopPerformers.cmj.map(perf => (
                      <div key={perf.rank} className="flex items-center justify-between bg-slate-50 p-2 rounded-xl text-xs">
                        <span className="font-black text-slate-400 w-4">{perf.rank}°</span>
                        <span className="font-bold text-slate-800 uppercase truncate flex-1 px-2">{perf.player.nombre} {perf.player.apellido1}</span>
                        <span className="font-black text-slate-900">{perf.value.toFixed(1)} cm</span>
                      </div>
                    ))}
                    {evaluationsTopPerformers.cmj.length === 0 && (
                      <p className="text-[9px] text-slate-400 font-bold uppercase italic">Sin registros de CMJ</p>
                    )}
                  </div>
                </div>

                {/* SLJ */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                    <span>Single Leg Jump (SLJ - Distancia cm)</span>
                    <i className="fa-solid fa-arrow-right-arrow-left text-emerald-500"></i>
                  </div>
                  <div className="space-y-1.5">
                    {evaluationsTopPerformers.slj.map(perf => (
                      <div key={perf.rank} className="flex items-center justify-between bg-slate-50 p-2 rounded-xl text-xs">
                        <span className="font-black text-slate-400 w-4">{perf.rank}°</span>
                        <span className="font-bold text-slate-800 uppercase truncate flex-1 px-2">{perf.player.nombre} {perf.player.apellido1}</span>
                        <span className="font-black text-slate-900">{perf.value.toFixed(0)} cm</span>
                      </div>
                    ))}
                    {evaluationsTopPerformers.slj.length === 0 && (
                      <p className="text-[9px] text-slate-400 font-bold uppercase italic">Sin registros de SLJ</p>
                    )}
                  </div>
                </div>

                {/* IMTP */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                    <span>Isométrica Muslo Medio (IMTP - Fuerza Máx N)</span>
                    <i className="fa-solid fa-weight-hanging text-amber-500"></i>
                  </div>
                  <div className="space-y-1.5">
                    {evaluationsTopPerformers.imtp.map(perf => (
                      <div key={perf.rank} className="flex items-center justify-between bg-slate-50 p-2 rounded-xl text-xs">
                        <span className="font-black text-slate-400 w-4">{perf.rank}°</span>
                        <span className="font-bold text-slate-800 uppercase truncate flex-1 px-2">{perf.player.nombre} {perf.player.apellido1}</span>
                        <span className="font-black text-slate-900">{perf.value.toLocaleString()} N</span>
                      </div>
                    ))}
                    {evaluationsTopPerformers.imtp.length === 0 && (
                      <p className="text-[9px] text-slate-400 font-bold uppercase italic">Sin registros de IMTP</p>
                    )}
                  </div>
                </div>

                {/* SPEED */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                    <span>Velocidad Sprint Máxima (km/h)</span>
                    <i className="fa-solid fa-running text-red-500"></i>
                  </div>
                  <div className="space-y-1.5">
                    {evaluationsTopPerformers.speed.map(perf => (
                      <div key={perf.rank} className="flex items-center justify-between bg-slate-50 p-2 rounded-xl text-xs">
                        <span className="font-black text-slate-400 w-4">{perf.rank}°</span>
                        <span className="font-bold text-slate-800 uppercase truncate flex-1 px-2">{perf.player.nombre} {perf.player.apellido1}</span>
                        <span className="font-black text-slate-900">{perf.value.toFixed(1)} km/h</span>
                      </div>
                    ))}
                    {evaluationsTopPerformers.speed.length === 0 && (
                      <p className="text-[9px] text-slate-400 font-bold uppercase italic">Sin registros de Velocidad</p>
                    )}
                  </div>
                </div>

              </div>
            </div>

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
