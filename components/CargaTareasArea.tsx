
import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AthletePerformanceRecord } from '../types';
import { normalizeClub } from '../lib/utils';
import ClubBadge from './ClubBadge';

interface GpsTarea {
  id: number;
  fecha: string;
  player_id: number;
  tarea: string;
  bloque: number;
  minutos: number;
  dist_total_m: number;
  m_por_min: number;
  dist_ai_m_15_kmh: number;
  dist_mai_m_20_kmh: number;
  dist_sprint_m_25_kmh: number;
  sprints_n: number;
  vel_max_kmh: number;
  acc_decc_ai_n: number;
  jugador_nombre?: string;
  players?: {
    nombre: string;
    apellido1: string;
    posicion: string;
    club: string;
    club_name?: string;
    foto_url?: string;
    category?: string;
    categoria?: string;
  };
}

type SortKey = 
  | 'minutos' 
  | 'dist_total_m' 
  | 'm_por_min' 
  | 'dist_ai_m_15_kmh' 
  | 'dist_mai_m_20_kmh' 
  | 'dist_sprint_m_25_kmh' 
  | 'sprints_n' 
  | 'vel_max_kmh' 
  | 'acc_decc_ai_n'
  | 'bloque';

interface CargaTareasAreaProps {
  performanceRecords?: AthletePerformanceRecord[];
  userRole?: string;
  userClub?: string;
  userClubId?: number | null;
  clubs?: any[];
}

export default function CargaTareasArea({ performanceRecords, userRole, userClub, userClubId, clubs = [] }: CargaTareasAreaProps) {
  const [data, setData] = useState<GpsTarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  });
  const [selectedTask, setSelectedTask] = useState<string>('TODAS');
  const [selectedCategory, setSelectedCategory] = useState<string>('TODAS');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>({
    key: 'm_por_min',
    direction: 'desc'
  });
  const [activeMetric, setActiveMetric] = useState<SortKey>('m_por_min');
  const [hoveredPlayer, setHoveredPlayer] = useState<any | null>(null);

  const formatPlayerName = (nombre?: string, apellido?: string, rawFullName?: string) => {
    if (nombre && apellido) {
      const initial = nombre.trim().charAt(0).toUpperCase();
      return `${initial}. ${apellido}`;
    }
    if (nombre) {
      const parts = nombre.trim().split(/\s+/);
      if (parts.length >= 2) {
        const initial = parts[0].charAt(0).toUpperCase();
        return `${initial}. ${parts.slice(1).join(' ')}`;
      }
      return nombre;
    }
    if (rawFullName) {
      const parts = rawFullName.trim().split(/\s+/);
      if (parts.length >= 2) {
        const initial = parts[0].charAt(0).toUpperCase();
        return `${initial}. ${parts.slice(1).join(' ')}`;
      }
      return rawFullName;
    }
    return 'Atleta';
  };

  const normalizePositionGroup = (pos: string): string => {
    if (!pos) return 'VOLANTE';
    const p = pos.toUpperCase();
    if (p.includes('CENTRAL') || p.includes('ZAGUERO') || p.includes('DEFENSA CENTRAL')) return 'DEFENSOR CENTRAL';
    if (p.includes('LATERAL') || p.includes('BANDA') || p.includes('CARRILERO')) return 'LATERAL';
    if (p.includes('VOLANTE') || p.includes('MEDIOCAMPISTA') || p.includes('PIVOTE') || p.includes('ENGANCHE') || p.includes('MEDIO')) return 'VOLANTE';
    if (p.includes('EXTREMO') || p.includes('PUNTA') || p.includes('MEDIA PUNTA')) return 'EXTREMO';
    if (p.includes('DELANTERO') || p.includes('CENTRODELANTERO') || p.includes('ATACANTE') || p.includes('NUEVE')) return 'DELANTERO';
    return 'VOLANTE';
  };

  useEffect(() => {
    const fetchLatestAvailableDate = async () => {
      try {
        const { data: latest, error } = await supabase
          .from('gps_tareas')
          .select('fecha')
          .order('fecha', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (latest?.fecha) {
          setSelectedDate(latest.fecha);
        }
      } catch (err) {
        console.error("Error al buscar última fecha:", err);
      }
    };
    fetchLatestAvailableDate();
  }, []);

  useEffect(() => {
    fetchTasksForDate();
  }, [selectedDate]);

  const fetchTasksForDate = async () => {
    setLoading(true);
    try {
      // Fetch GPS tasks data
      const { data: gpsData, error: gpsError } = await supabase
        .from('gps_tareas')
        .select('*')
        .eq('fecha', selectedDate)
        .order('tarea', { ascending: true });

      if (gpsError) throw gpsError;
      
      if (!gpsData || gpsData.length === 0) {
        setData([]);
        return;
      }

      // Fetch Players data
      const playerIds = Array.from(new Set(gpsData.map(d => d.player_id)));
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('player_id, nombre, apellido1, posicion, anio, id_club, clubes!fk_players_clubes(nombre)')
        .in('player_id', playerIds);
      
      if (playersError) throw playersError;

      // Fetch active microcycles for selectedDate
      const { data: activeMicros } = await supabase
        .from('microcycles')
        .select('id, category_id')
        .lte('start_date', selectedDate)
        .gte('end_date', selectedDate);

      let citationsData: any[] = [];
      if (activeMicros && activeMicros.length > 0) {
        const microIds = activeMicros.map(m => m.id);
        const { data: citations } = await supabase
          .from('citaciones')
          .select('player_id, microcycle_id')
          .in('microcycle_id', microIds)
          .in('player_id', playerIds);
        
        if (citations) {
          citationsData = citations;
        }
      }

      const categoryMap: Record<number, string> = {
        1: 'sub_13',
        2: 'sub_14',
        3: 'sub_15',
        4: 'sub_16',
        5: 'sub_17',
        6: 'sub_18',
        7: 'sub_20',
        8: 'sub_21',
        9: 'sub_23',
        10: 'adulta'
      };

      // Join in memory
      const joinedData = gpsData.map(gps => {
        const player = playersData?.find(p => p.player_id === gps.player_id) as any;
        if (player) {
          player.category = '';
          
          // Try to match player's active microcycle citation first
          const citation = citationsData.find(c => c.player_id === player.player_id);
          if (citation) {
            const mc = activeMicros?.find(m => m.id === citation.microcycle_id);
            if (mc && categoryMap[mc.category_id]) {
              player.category = categoryMap[mc.category_id];
            }
          }
          
          // Fallback to birth year age-based calculation
          if (!player.category && player.anio) {
            const age = 2026 - player.anio;
            if (age <= 13) player.category = 'sub_13';
            else if (age === 14) player.category = 'sub_14';
            else if (age === 15) player.category = 'sub_15';
            else if (age === 16) player.category = 'sub_16';
            else if (age === 17) player.category = 'sub_17';
            else if (age === 18) player.category = 'sub_18';
            else if (age <= 20) player.category = 'sub_20';
            else if (age <= 21) player.category = 'sub_21';
            else if (age <= 23) player.category = 'sub_23';
            else player.category = 'adulta';
          }
        }
        return {
          ...gps,
          players: player || null
        };
      });

      setData(joinedData);
      const currentTasks = joinedData.map(t => t.tarea);
      if (selectedTask !== 'TODAS' && !currentTasks.includes(selectedTask)) {
        setSelectedTask('TODAS');
      }
    } catch (err: any) {
      console.error("Error en sincronización gps_tareas:", err);
    } finally {
      setLoading(false);
    }
  };

  const anonymizedData = useMemo(() => {
    if (userRole !== 'club') return data;
    
    return data.map(row => {
      const player = row.players;
      let isOwnClub = false;
      if (userClubId) {
        isOwnClub = (player as any)?.id_club === userClubId;
      } else if (userClub) {
        const uClubNorm = normalizeClub(userClub);
        const pClub = player?.club_name || player?.club || '';
        isOwnClub = normalizeClub(pClub) === uClubNorm;
      }
      
      if (!isOwnClub) {
        return {
          ...row,
          jugador_nombre: 'Jugador',
          players: player ? {
            ...player,
            nombre: 'Jugador',
            apellido1: `[${row.player_id}]`,
            club: 'OTRO CLUB',
            club_name: 'OTRO CLUB'
          } : undefined
        };
      }
      return row;
    });
  }, [data, userRole, userClub, userClubId]);

  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    anonymizedData.forEach(row => {
      const cat = row.players?.category;
      if (cat) {
        cats.add(cat.trim().toLowerCase());
      }
    });
    return Array.from(cats).sort();
  }, [anonymizedData]);

  const categoryFilteredData = useMemo(() => {
    if (selectedCategory === 'TODAS') return anonymizedData;
    return anonymizedData.filter(row => {
      const cat = row.players?.category;
      return cat && cat.trim().toLowerCase() === selectedCategory.toLowerCase();
    });
  }, [anonymizedData, selectedCategory]);

  const taskStats = useMemo(() => {
    if (!categoryFilteredData.length) return [];
    
    const tasksMap: Record<string, { 
      count: number, 
      totalInt: number, 
      maxInt: number, 
      maxVel: number,
      totalDist: number,
      totalDist15: number,
      totalDist20: number,
      totalDist25: number,
      totalAccDec: number,
      totalMin: number
    }> = {};
    
    categoryFilteredData.forEach(row => {
      if (!tasksMap[row.tarea]) {
        tasksMap[row.tarea] = { 
          count: 0, 
          totalInt: 0, 
          maxInt: 0, 
          maxVel: 0,
          totalDist: 0,
          totalDist15: 0,
          totalDist20: 0,
          totalDist25: 0,
          totalAccDec: 0,
          totalMin: 0
        };
      }
      const stats = tasksMap[row.tarea];
      const mpm = Number(row.m_por_min) || 0;
      const vmax = Number(row.vel_max_kmh) || 0;
      
      stats.count += 1;
      stats.totalInt += mpm;
      if (mpm > stats.maxInt) stats.maxInt = mpm;
      if (vmax > stats.maxVel) stats.maxVel = vmax;

      stats.totalDist += Number(row.dist_total_m) || 0;
      stats.totalDist15 += Number(row.dist_ai_m_15_kmh) || 0;
      stats.totalDist20 += Number(row.dist_mai_m_20_kmh) || 0;
      stats.totalDist25 += Number(row.dist_sprint_m_25_kmh) || 0;
      stats.totalAccDec += Number(row.acc_decc_ai_n) || 0;
      stats.totalMin += Number(row.minutos) || 0;
    });
    return Object.entries(tasksMap).map(([name, stats]) => ({
      name,
      avgInt: stats.totalInt / stats.count,
      maxInt: stats.maxInt,
      maxVel: stats.maxVel,
      avgDist: stats.totalDist / stats.count,
      avgDist15: stats.totalDist15 / stats.count,
      avgDist20: stats.totalDist20 / stats.count,
      avgDist25: stats.totalDist25 / stats.count,
      avgAccDec: stats.totalAccDec / stats.count,
      avgMin: stats.totalMin / stats.count,
      count: stats.count
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [categoryFilteredData]);

  const uniqueTasks = useMemo(() => {
    return taskStats.map(t => t.name);
  }, [taskStats]);

  const filteredData = useMemo(() => {
    let items = [...categoryFilteredData];
    
    if (selectedTask !== 'TODAS') {
      items = items.filter(item => item.tarea === selectedTask);
    }

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      items = items.filter(item => 
        (item.players?.nombre || item.jugador_nombre || "").toLowerCase().includes(lowerSearch) ||
        (item.players?.apellido1 || "").toLowerCase().includes(lowerSearch) ||
        (item.tarea || "").toLowerCase().includes(lowerSearch)
      );
    }

    // Agrupar por jugador y calcular promedios
    const playerMap: Record<number, any> = {};
    
    items.forEach(item => {
      const pid = item.player_id;
      if (!playerMap[pid]) {
        playerMap[pid] = {
          id: pid, // Usamos ID del jugador como key única para la fila
          player: item.players,
          jugador_nombre: item.jugador_nombre,
          count: 0,
          minutos: 0,
          dist_total_m: 0,
          m_por_min: 0,
          dist_ai_m_15_kmh: 0,
          dist_mai_m_20_kmh: 0,
          dist_sprint_m_25_kmh: 0,
          sprints_n: 0,
          vel_max_kmh: 0,
          acc_decc_ai_n: 0,
          bloques: []
        };
      }
      
      const p = playerMap[pid];
      p.count += 1;
      p.minutos += Number(item.minutos) || 0;
      p.dist_total_m += Number(item.dist_total_m) || 0;
      p.m_por_min += Number(item.m_por_min) || 0;
      p.dist_ai_m_15_kmh += Number(item.dist_ai_m_15_kmh) || 0;
      p.dist_mai_m_20_kmh += Number(item.dist_mai_m_20_kmh) || 0;
      p.dist_sprint_m_25_kmh += Number(item.dist_sprint_m_25_kmh) || 0;
      p.sprints_n += Number(item.sprints_n) || 0;
      p.vel_max_kmh = Math.max(p.vel_max_kmh, Number(item.vel_max_kmh) || 0); // Max velocity is absolute max, not average
      p.acc_decc_ai_n += Number(item.acc_decc_ai_n) || 0;
      if (item.bloque && !p.bloques.includes(item.bloque)) p.bloques.push(item.bloque);
    });

    const aggregatedItems = Object.values(playerMap).map((p: any) => ({
      ...p,
      // Calculamos promedios dividiendo por el conteo de tareas (p.count)
      minutos: p.minutos / p.count,
      dist_total_m: p.dist_total_m / p.count,
      m_por_min: p.m_por_min / p.count,
      dist_ai_m_15_kmh: p.dist_ai_m_15_kmh / p.count,
      dist_mai_m_20_kmh: p.dist_mai_m_20_kmh / p.count,
      dist_sprint_m_25_kmh: p.dist_sprint_m_25_kmh / p.count,
      sprints_n: p.sprints_n / p.count,
      acc_decc_ai_n: p.acc_decc_ai_n / p.count,
      // vel_max_kmh se mantiene como el máximo absoluto encontrado
      tarea: `PROMEDIO (${p.count} TAREAS)`, // Etiqueta para la columna Tarea
      bloque: p.bloques.sort().join(', ') // Lista de bloques
    }));

    if (sortConfig) {
      aggregatedItems.sort((a, b) => {
        const aVal = Number(a[sortConfig.key] || 0);
        const bVal = Number(b[sortConfig.key] || 0);
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return aggregatedItems;
  }, [categoryFilteredData, selectedTask, searchTerm, sortConfig]);

  const groupKPIs = useMemo(() => {
    if (filteredData.length === 0) return { avgDist: 0, avgInt: 0, avgMin: 0, maxVel: 0, count: 0 };
    
    const count = filteredData.length;
    const totalDist = filteredData.reduce((acc, curr) => acc + (Number(curr.dist_total_m) || 0), 0);
    const totalInt = filteredData.reduce((acc, curr) => acc + (Number(curr.m_por_min) || 0), 0);
    const totalMin = filteredData.reduce((acc, curr) => acc + (Number(curr.minutos) || 0), 0);
    const maxVel = Math.max(...filteredData.map(d => Number(d.vel_max_kmh) || 0));

    return {
      avgDist: totalDist / count,
      avgInt: totalInt / count,
      avgMin: totalMin / count,
      maxVel,
      count
    };
  }, [filteredData]);

  // --- NUEVOS HOOKS DE ANÁLISIS DE RENDIMIENTO ---
  const activeTaskStats = useMemo(() => {
    if (selectedTask === 'TODAS') return null;
    return taskStats.find(t => t.name === selectedTask) || null;
  }, [selectedTask, taskStats]);

  const topPerformers = useMemo(() => {
    if (filteredData.length === 0) return null;
    
    let highestIntensity = filteredData[0];
    let highestSpeed = filteredData[0];
    let highestAccDec = filteredData[0];
    
    filteredData.forEach(row => {
      if (Number(row.m_por_min || 0) > Number(highestIntensity.m_por_min || 0)) {
        highestIntensity = row;
      }
      if (Number(row.vel_max_kmh || 0) > Number(highestSpeed.vel_max_kmh || 0)) {
        highestSpeed = row;
      }
      if (Number(row.acc_decc_ai_n || 0) > Number(highestAccDec.acc_decc_ai_n || 0)) {
        highestAccDec = row;
      }
    });
    
    return {
      intensity: highestIntensity,
      speed: highestSpeed,
      accDec: highestAccDec
    };
  }, [filteredData]);

  const taskFocusClass = useMemo(() => {
    if (!activeTaskStats) return null;
    
    const { avgInt, avgAccDec, avgDist25, avgDist } = activeTaskStats;
    
    let focusTitle = "ESTÍMULO MIXTO / TÁCTICO";
    let focusDesc = "Ejercicio equilibrado con demanda coordinativa media-alta y distribución de carga uniforme.";
    let focusBadgeColor = "bg-amber-100 text-amber-800 border-amber-200";
    let focusIcon = "fa-diagram-project";
    
    if (avgInt > 95 && avgAccDec > 10 && avgDist25 < 12) {
      focusTitle = "ESPACIO REDUCIDO (FZA. TENSIÓN)";
      focusDesc = "Alta tasa de aceleraciones, giros y frenadas en espacios reducidos. Gran demanda neuromuscular excéntrica.";
      focusBadgeColor = "bg-red-50 text-red-600 border-red-100";
      focusIcon = "fa-compress-arrows-to-left";
    } else if (avgDist25 >= 12 || (avgDist > 400 && avgDist25 > 8)) {
      focusTitle = "ESPACIO AMPLIO (VELOCIDAD)";
      focusDesc = "Ejercicio de distancias largas que estimula la alta velocidad de carrera (>25 km/h) y desaceleraciones de gran inercia.";
      focusBadgeColor = "bg-sky-50 text-sky-600 border-sky-100";
      focusIcon = "fa-expand";
    } else if (avgInt > 105) {
      focusTitle = "ALTA INTENSIDAD (METABÓLICO)";
      focusDesc = "Nivel de exigencia cardiovascular y densidad de carrera extrema. Ideal para acondicionamiento intermitente.";
      focusBadgeColor = "bg-purple-50 text-purple-600 border-purple-100";
      focusIcon = "fa-heart-circle-bolt";
    }
    
    return {
      title: focusTitle,
      desc: focusDesc,
      badgeColor: focusBadgeColor,
      icon: focusIcon
    };
  }, [activeTaskStats]);

  const highSpeedExposures = useMemo(() => {
    return filteredData.filter(d => Number(d.vel_max_kmh || 0) >= 28.0);
  }, [filteredData]);

  const handleSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: SortKey) => {
    if (!sortConfig || sortConfig.key !== key) return 'fa-sort text-slate-500/30';
    return sortConfig.direction === 'desc' ? 'fa-sort-down text-red-500' : 'fa-sort-up text-red-500';
  };

  const getIntensityStyle = (val: number) => {
    if (val > 110) return 'bg-red-600 text-white shadow-red-900/30';
    if (val > 90) return 'bg-[#0b1220] text-white';
    return 'bg-slate-50 text-slate-600';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24 max-w-[1600px] mx-auto">
      {/* Panel de Control */}
      <div className="bg-white rounded-[48px] p-10 border border-slate-100 shadow-sm space-y-10">
        <div className="flex flex-col xl:flex-row items-center justify-between gap-10">
          <div className="flex items-center gap-8">
            <div className="w-20 h-20 bg-[#0b1220] rounded-[32px] flex items-center justify-center text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-red-600 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
              <i className="fa-solid fa-satellite-dish text-3xl relative z-10"></i>
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter leading-none mb-2">GPS TAREAS <span className="text-red-600">LIVE</span></h2>
              <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.3em] italic">Análisis táctico-físico multivariable</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
             <div className="relative flex-1 min-w-[200px]">
                <label className="absolute -top-2 left-5 px-2 bg-white text-[9px] font-black text-red-600 uppercase tracking-widest z-10">Fecha Sesión</label>
                <input 
                  type="date" 
                  className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 text-sm font-black text-slate-900 outline-none focus:ring-4 focus:ring-red-500/10 shadow-inner transition-all"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
             </div>
             <div className="relative flex-1 min-w-[200px]">
                <label className="absolute -top-2 left-5 px-2 bg-white text-[9px] font-black text-indigo-600 uppercase tracking-widest z-10">Categoría</label>
                <select 
                  className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 text-sm font-black text-slate-900 outline-none appearance-none cursor-pointer shadow-inner focus:ring-4 focus:ring-indigo-200 transition-all"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="TODAS">TODAS LAS CATEGORÍAS</option>
                  {uniqueCategories.map(cat => (
                    <option key={cat} value={cat}>{cat.replace('_', ' ').toUpperCase()}</option>
                  ))}
                </select>
                <i className="fa-solid fa-chevron-down absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"></i>
             </div>
             <div className="relative flex-[2] min-w-[280px]">
                <label className="absolute -top-2 left-5 px-2 bg-white text-[9px] font-black text-slate-400 uppercase tracking-widest z-10">Bloque Específico</label>
                <select 
                  className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 text-sm font-black text-slate-900 outline-none appearance-none cursor-pointer shadow-inner focus:ring-4 focus:ring-slate-200 transition-all"
                  value={selectedTask}
                  onChange={(e) => setSelectedTask(e.target.value)}
                >
                  <option value="TODAS">TODAS LAS TAREAS DEL DÍA</option>
                  {uniqueTasks.map(task => (
                    <option key={task} value={task}>{task.toUpperCase()}</option>
                  ))}
                </select>
                <i className="fa-solid fa-chevron-down absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"></i>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
             <KPIMini label="ATLETAS" value={groupKPIs.count} icon="fa-users" color="text-slate-900" />
             <KPIMini label="AVG DIST (M)" value={(groupKPIs.avgDist != null && !isNaN(Number(groupKPIs.avgDist))) ? groupKPIs.avgDist.toFixed(0) : '-'} icon="fa-arrows-left-right" color="text-blue-600" />
             <KPIMini label="AVG INT (M/M)" value={(groupKPIs.avgInt != null && !isNaN(Number(groupKPIs.avgInt))) ? groupKPIs.avgInt.toFixed(1) : '-'} icon="fa-fire-flame-curved" color="text-red-600" />
             <KPIMini label="MAX VEL (KM/H)" value={(groupKPIs.maxVel != null && !isNaN(Number(groupKPIs.maxVel))) ? groupKPIs.maxVel.toFixed(1) : '-'} icon="fa-bolt" color="text-amber-500" />
             <KPIMini label="AVG TIEMPO" value={(groupKPIs.avgMin != null && !isNaN(Number(groupKPIs.avgMin))) ? `${groupKPIs.avgMin.toFixed(0)}m` : '-'} icon="fa-clock" color="text-indigo-500" />
        </div>
      </div>

      {/* Task Summary Boxes Section */}
      <div className="space-y-4 px-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic">Promedios por Tarea</h3>
          <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Haz clic para filtrar</p>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
          {taskStats.length === 0 ? (
            <div className="py-10 w-full text-center bg-white rounded-[32px] border border-dashed border-slate-100 italic text-slate-300 font-black uppercase text-[10px] tracking-widest">
              No hay tareas registradas para esta fecha
            </div>
          ) : (
            taskStats.map((task) => (
              <button
                key={task.name}
                onClick={() => setSelectedTask(task.name === selectedTask ? 'TODAS' : task.name)}
                className={`min-w-[320px] p-6 rounded-[32px] border transition-all text-left flex flex-col justify-between group transform-gpu active:scale-95 ${
                  selectedTask === task.name 
                    ? 'bg-[#0b1220] border-[#0b1220] text-white shadow-2xl' 
                    : 'bg-white border-slate-100 text-slate-900 hover:shadow-xl hover:-translate-y-1'
                }`}
              >
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className={`text-[9px] font-black uppercase tracking-widest ${selectedTask === task.name ? 'text-red-500' : 'text-slate-400'}`}>
                      BLOQUE {task.count} ATLETAS
                    </p>
                    <i className={`fa-solid fa-fire-flame-curved text-xs ${selectedTask === task.name ? 'text-white' : 'text-red-600'}`}></i>
                  </div>
                  <h4 className="text-lg font-black italic uppercase tracking-tighter leading-none truncate">{task.name}</h4>
                </div>
                
                <div className="grid grid-cols-2 gap-y-4 gap-x-2 border-t border-dashed border-slate-100/10 pt-4">
                  <div>
                    <p className={`text-[8px] font-black uppercase mb-1 ${selectedTask === task.name ? 'text-slate-400' : 'text-slate-400'}`}>Dist Total</p>
                    <p className="text-xl font-black italic tracking-tighter leading-none">
                      {(task.avgDist != null && !isNaN(Number(task.avgDist))) ? task.avgDist.toFixed(0) : '-'} <span className="text-[9px] not-italic font-bold opacity-50 uppercase">m</span>
                    </p>
                  </div>
                  <div>
                    <p className={`text-[8px] font-black uppercase mb-1 ${selectedTask === task.name ? 'text-slate-400' : 'text-slate-400'}`}>Duración</p>
                    <p className="text-xl font-black italic tracking-tighter leading-none text-indigo-500">
                      {(task.avgMin != null && !isNaN(Number(task.avgMin))) ? task.avgMin.toFixed(0) : '-'} <span className="text-[9px] not-italic font-bold opacity-50 uppercase">min</span>
                    </p>
                  </div>
                  <div>
                    <p className={`text-[8px] font-black uppercase mb-1 ${selectedTask === task.name ? 'text-slate-400' : 'text-slate-400'}`}>Acc/Dec</p>
                    <p className="text-xl font-black italic tracking-tighter leading-none">
                      {(task.avgAccDec != null && !isNaN(Number(task.avgAccDec))) ? task.avgAccDec.toFixed(0) : '-'} <span className="text-[9px] not-italic font-bold opacity-50 uppercase">n</span>
                    </p>
                  </div>
                  <div>
                    <p className={`text-[8px] font-black uppercase mb-1 ${selectedTask === task.name ? 'text-red-500' : 'text-red-600'}`}>Sprint (&gt;25 km/h)</p>
                    <p className="text-xl font-black italic tracking-tighter leading-none">
                      {(task.avgDist25 != null && !isNaN(Number(task.avgDist25))) ? task.avgDist25.toFixed(0) : '-'} <span className="text-[9px] not-italic font-bold opacity-50 uppercase">m</span>
                    </p>
                  </div>
                  <div>
                    <p className={`text-[8px] font-black uppercase mb-1 ${selectedTask === task.name ? 'text-slate-400' : 'text-slate-400'}`}>&gt;15 km/h</p>
                    <p className="text-xl font-black italic tracking-tighter leading-none">
                      {(task.avgDist15 != null && !isNaN(Number(task.avgDist15))) ? task.avgDist15.toFixed(0) : '-'} <span className="text-[9px] not-italic font-bold opacity-50 uppercase">m</span>
                    </p>
                  </div>
                  <div>
                    <p className={`text-[8px] font-black uppercase mb-1 ${selectedTask === task.name ? 'text-slate-400' : 'text-slate-400'}`}>&gt;20 km/h</p>
                    <p className="text-xl font-black italic tracking-tighter leading-none">
                      {(task.avgDist20 != null && !isNaN(Number(task.avgDist20))) ? task.avgDist20.toFixed(0) : '-'} <span className="text-[9px] not-italic font-bold opacity-50 uppercase">m</span>
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Módulo de Inteligencia de Rendimiento y Focos Físicos (Bento Section) */}
      {filteredData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-2">
          
          {/* LADO IZQUIERDO: TOP PERFORMERS DE LA SESIÓN (LIDERAZGOS FÍSICOS) */}
          <div className="lg:col-span-7 bg-white rounded-[48px] p-8 border border-slate-100 shadow-sm flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="bg-red-50 text-red-600 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full">LIDERAZGO FÍSICO</span>
                <h3 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter">Podio de Rendimiento ({selectedTask})</h3>
              </div>
              <p className="text-slate-400 text-[10px] uppercase font-black tracking-wider leading-relaxed">
                Jugadores con el mayor esfuerzo físico e impacto metabólico registrado en esta selección de tareas.
              </p>
            </div>

            {topPerformers && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* 1. INTENSIDAD METABÓLICA (M/Min) */}
                <div className="bg-slate-50 rounded-[32px] p-6 border border-slate-100/50 flex flex-col justify-between relative overflow-hidden group hover:shadow-lg transition-all transform-gpu hover:-translate-y-1">
                  <div className="absolute top-4 right-4 text-slate-200 group-hover:text-red-500/10 transition-colors">
                    <i className="fa-solid fa-fire-flame-curved text-3xl"></i>
                  </div>
                  <div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-2">MÁS INTENSO</span>
                    <p className="text-sm font-black text-slate-900 uppercase italic tracking-tight truncate leading-none mb-1">
                      {topPerformers.intensity ? formatPlayerName(topPerformers.intensity.player?.nombre, topPerformers.intensity.player?.apellido1, topPerformers.intensity.jugador_nombre) : "N/A"}
                    </p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase truncate mb-4">
                      {topPerformers.intensity?.player?.posicion || "Jugador"}
                    </p>
                  </div>
                  <div>
                    <p className="text-3xl font-black italic tracking-tighter text-red-600 leading-none">
                      {Number(topPerformers.intensity?.m_por_min || 0).toFixed(1)}
                    </p>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">metros / minuto</span>
                  </div>
                </div>

                {/* 2. VELOCIDAD MÁXIMA (VMax) */}
                <div className="bg-slate-50 rounded-[32px] p-6 border border-slate-100/50 flex flex-col justify-between relative overflow-hidden group hover:shadow-lg transition-all transform-gpu hover:-translate-y-1">
                  <div className="absolute top-4 right-4 text-slate-200 group-hover:text-amber-500/10 transition-colors">
                    <i className="fa-solid fa-bolt text-3xl"></i>
                  </div>
                  <div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-2">MÁS VELOZ</span>
                    <p className="text-sm font-black text-slate-900 uppercase italic tracking-tight truncate leading-none mb-1">
                      {topPerformers.speed ? formatPlayerName(topPerformers.speed.player?.nombre, topPerformers.speed.player?.apellido1, topPerformers.speed.jugador_nombre) : "N/A"}
                    </p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase truncate mb-4">
                      {topPerformers.speed?.player?.posicion || "Jugador"}
                    </p>
                  </div>
                  <div>
                    <p className="text-3xl font-black italic tracking-tighter text-amber-500 leading-none">
                      {Number(topPerformers.speed?.vel_max_kmh || 0).toFixed(1)}
                    </p>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">km/h de pico</span>
                  </div>
                </div>

                {/* 3. ACC/DEC (Dinamismo excéntrico) */}
                <div className="bg-slate-50 rounded-[32px] p-6 border border-slate-100/50 flex flex-col justify-between relative overflow-hidden group hover:shadow-lg transition-all transform-gpu hover:-translate-y-1">
                  <div className="absolute top-4 right-4 text-slate-200 group-hover:text-indigo-500/10 transition-colors">
                    <i className="fa-solid fa-arrow-right-arrow-left text-3xl"></i>
                  </div>
                  <div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-2">MÁS DINÁMICO</span>
                    <p className="text-sm font-black text-slate-900 uppercase italic tracking-tight truncate leading-none mb-1">
                      {topPerformers.accDec ? formatPlayerName(topPerformers.accDec.player?.nombre, topPerformers.accDec.player?.apellido1, topPerformers.accDec.jugador_nombre) : "N/A"}
                    </p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase truncate mb-4">
                      {topPerformers.accDec?.player?.posicion || "Jugador"}
                    </p>
                  </div>
                  <div>
                    <p className="text-3xl font-black italic tracking-tighter text-indigo-600 leading-none">
                      {Number(topPerformers.accDec?.acc_decc_ai_n || 0).toFixed(0)}
                    </p>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">acciones acc/dec</span>
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* LADO DERECHO: FOCO TÁCTICO & EXPOSICIÓN A VELOCIDAD LÍMITE */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* CARD 1: Clasificación de Foco */}
            {taskFocusClass ? (
              <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm flex items-start gap-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl shrink-0 ${taskFocusClass.badgeColor}`}>
                  <i className={`fa-solid ${taskFocusClass.icon}`}></i>
                </div>
                <div>
                  <span className="text-[8px] font-black text-red-600 uppercase tracking-widest block mb-1">FOCO TÁCTICO CLASIFICADO</span>
                  <h4 className="text-base font-black italic uppercase tracking-tighter text-slate-900 leading-tight mb-2">
                    {taskFocusClass.title}
                  </h4>
                  <p className="text-[11px] font-bold text-slate-400 leading-relaxed uppercase">
                    {taskFocusClass.desc}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm flex items-start gap-5">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 text-xl shrink-0">
                  <i className="fa-solid fa-circle-info"></i>
                </div>
                <div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">CONSEJO METODOLÓGICO</span>
                  <h4 className="text-base font-black italic uppercase tracking-tighter text-slate-900 leading-tight mb-2">
                    SELECCIONA UN BLOQUE ESPECÍFICO
                  </h4>
                  <p className="text-[11px] font-bold text-slate-400 leading-relaxed uppercase">
                    Filtra una tarea individual arriba para obtener la clasificación automatizada de estímulo táctico-físico.
                  </p>
                </div>
              </div>
            )}

            {/* CARD 2: Semáforo de Exposición a Alta Velocidad (VMax) */}
            <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Estímulo Neuromuscular (&gt;28 km/h)</h4>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">
                  Jugadores expuestos a sprints de velocidad máxima alta para prevención de lesiones.
                </p>
              </div>

              {highSpeedExposures.length > 0 ? (
                <div className="flex flex-wrap gap-2 max-h-[110px] overflow-y-auto custom-scrollbar">
                  {highSpeedExposures.map((p, idx) => (
                    <span 
                      key={p.id || idx} 
                      className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight"
                    >
                      <i className="fa-solid fa-running"></i>
                      {formatPlayerName(p.player?.nombre, p.player?.apellido1, p.jugador_nombre)} ({Number(p.vel_max_kmh || 0).toFixed(1)} km/h)
                    </span>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center gap-3 text-slate-400">
                  <i className="fa-solid fa-shield-halved text-amber-500 text-sm"></i>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                    Estímulo neuromuscular submáximo (VMax &lt; 28 km/h).
                  </span>
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* Selector de Métricas para Box Plot (Capsule Tabs) */}
      <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm px-8">
        <div className="flex flex-col gap-4">
          <div>
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
              Filtro de Variable de Rendimiento (9 Parámetros)
            </h4>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mt-1">
              Selecciona la métrica física para visualizar las cajas de distribución por posición. El eje vertical se auto-ajustará para un análisis enfocado.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'm_por_min', label: 'Intensidad (M/Min)', icon: 'fa-fire-flame-curved' },
              { id: 'dist_total_m', label: 'Dist. Total (m)', icon: 'fa-arrows-left-right' },
              { id: 'vel_max_kmh', label: 'Vel. Máxima (km/h)', icon: 'fa-bolt' },
              { id: 'acc_decc_ai_n', label: 'Acel / Desaceleraciones', icon: 'fa-arrow-right-arrow-left' },
              { id: 'dist_ai_m_15_kmh', label: 'AI >15 km/h (m)', icon: 'fa-person-running' },
              { id: 'dist_mai_m_20_kmh', label: 'HSR >20 km/h (m)', icon: 'fa-gauge-high' },
              { id: 'dist_sprint_m_25_kmh', label: 'Sprint >25 (m)', icon: 'fa-wind' },
              { id: 'sprints_n', label: 'Sprints (Cant.)', icon: 'fa-bolt-lightning' },
              { id: 'minutos', label: 'Tiempo (min)', icon: 'fa-clock' }
            ].map(m => {
              const isActive = activeMetric === m.id;
              let activeColorClass = 'bg-[#0b1220] border-[#0b1220] text-white shadow-lg';
              return (
                <button
                  key={m.id}
                  onClick={() => setActiveMetric(m.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all flex items-center gap-1.5 active:scale-95 ${
                    isActive ? activeColorClass : 'bg-white text-slate-600 border-slate-100 hover:shadow-sm hover:border-slate-200'
                  }`}
                >
                  <i className={`fa-solid ${m.icon} text-[10px]`}></i>
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Box Plots por Dinámica */}
      <div className="space-y-12">
        {loading ? (
          <div className="bg-white rounded-[48px] border border-slate-100 p-24 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest italic">Cargando métricas de tareas...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="bg-white rounded-[48px] border border-slate-100 p-24 text-center">
            <i className="fa-solid fa-chart-bar text-slate-200 text-4xl mb-4"></i>
            <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest italic">No hay registros cargados para la fecha seleccionada ({selectedDate}).</p>
          </div>
        ) : (
          (selectedTask === 'TODAS' ? uniqueTasks : [selectedTask]).map((taskName) => {
            const taskRows = data.filter(d => d.tarea === taskName);
            if (taskRows.length === 0) return null;

            // Calcular rango dinámico para el eje Y de forma estrecha y enfocada ("achica el eje vertical")
            const mValues = taskRows.map(r => Number(r[activeMetric]) || 0);
            const rawMin = Math.min(...mValues);
            const rawMax = Math.max(...mValues);
            const diff = rawMax - rawMin;
            const padding = diff * 0.15 || 2;
            const minVal = Math.max(0, Math.floor(rawMin - padding));
            const maxVal = Math.ceil(rawMax + padding);

            const positionsList = ['DEFENSOR CENTRAL', 'LATERAL', 'VOLANTE', 'EXTREMO', 'DELANTERO'];

            // Dimensiones SVG compactas verticalmente ("achica el eje vertical")
            const svgWidth = 720;
            const svgHeight = 220; // Reducido de 340 a 220
            const marginTop = 20;
            const marginBottom = 40;
            const marginLeft = 60;
            const marginRight = 30;
            const plotWidth = svgWidth - marginLeft - marginRight;
            const plotHeight = svgHeight - marginTop - marginBottom;

            // Función para calcular coordenadas Y
            const getY = (val: number) => {
              if (maxVal === minVal) return marginTop + plotHeight / 2;
              return marginTop + plotHeight - ((val - minVal) / (maxVal - minVal)) * plotHeight;
            };

            // Estilos específicos según métrica
            let metricUnit = 'unidades';
            let metricLabel = 'Valor';
            if (activeMetric === 'm_por_min') { metricUnit = 'm/min'; metricLabel = 'Intensidad'; }
            else if (activeMetric === 'dist_total_m') { metricUnit = 'm'; metricLabel = 'Distancia Total'; }
            else if (activeMetric === 'vel_max_kmh') { metricUnit = 'km/h'; metricLabel = 'Velocidad Máxima'; }
            else if (activeMetric === 'acc_decc_ai_n') { metricUnit = 'act.'; metricLabel = 'Acel/Desacel'; }
            else if (activeMetric === 'dist_ai_m_15_kmh') { metricUnit = 'm'; metricLabel = 'AI (>15 km/h)'; }
            else if (activeMetric === 'dist_mai_m_20_kmh') { metricUnit = 'm'; metricLabel = 'HSR (>20 km/h)'; }
            else if (activeMetric === 'dist_sprint_m_25_kmh') { metricUnit = 'm'; metricLabel = 'Sprint (>25 km/h)'; }
            else if (activeMetric === 'sprints_n') { metricUnit = 'spr.'; metricLabel = 'Cant. Sprints'; }
            else if (activeMetric === 'minutos') { metricUnit = 'min'; metricLabel = 'Tiempo'; }

            let boxFillColor = 'rgba(99, 102, 241, 0.08)';
            let boxBorderColor = '#6366f1';
            if (activeMetric === 'm_por_min') { boxFillColor = 'rgba(239, 68, 68, 0.08)'; boxBorderColor = '#ef4444'; }
            else if (activeMetric === 'dist_total_m') { boxFillColor = 'rgba(14, 165, 233, 0.08)'; boxBorderColor = '#0ea5e9'; }
            else if (activeMetric === 'vel_max_kmh') { boxFillColor = 'rgba(245, 158, 11, 0.08)'; boxBorderColor = '#f59e0b'; }
            else if (activeMetric === 'acc_decc_ai_n') { boxFillColor = 'rgba(99, 102, 241, 0.08)'; boxBorderColor = '#6366f1'; }
            else if (activeMetric === 'dist_ai_m_15_kmh') { boxFillColor = 'rgba(16, 185, 129, 0.08)'; boxBorderColor = '#10b981'; }
            else if (activeMetric === 'dist_mai_m_20_kmh') { boxFillColor = 'rgba(139, 92, 246, 0.08)'; boxBorderColor = '#8b5cf6'; }
            else if (activeMetric === 'dist_sprint_m_25_kmh') { boxFillColor = 'rgba(244, 63, 94, 0.08)'; boxBorderColor = '#f43f5e'; }
            else if (activeMetric === 'sprints_n') { boxFillColor = 'rgba(217, 70, 239, 0.08)'; boxBorderColor = '#d946ef'; }
            else if (activeMetric === 'minutos') { boxFillColor = 'rgba(20, 184, 166, 0.08)'; boxBorderColor = '#14b8a6'; }

            return (
              <div key={taskName} className="bg-white rounded-[48px] border border-slate-100 p-8 shadow-sm relative group/card hover:shadow-lg transition-all">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="bg-[#0b1220] text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full italic">DINÁMICA</span>
                      <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">{taskName}</h3>
                    </div>
                    <p className="text-slate-400 text-[10px] uppercase font-black tracking-wider leading-relaxed">
                      Distribución física de {taskRows.length} jugadores agrupados por posición en campo. Eje ajustado estrechamente al rango físico actual.
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">MEDIANA GLOBAL</span>
                      <p className="text-xl font-black italic tracking-tighter text-slate-900 leading-none">
                        {(mValues.reduce((a,b)=>a+b,0)/mValues.length).toFixed(1)} <span className="text-[9px] not-italic font-bold text-slate-400">{metricUnit}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="relative overflow-x-auto custom-scrollbar">
                  <div className="min-w-[720px] max-w-full mx-auto relative">
                    <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width="100%" height={svgHeight} className="overflow-visible font-sans">
                      
                      {/* Eje Y - Líneas de Cuadrícula */}
                      {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
                        const val = minVal + p * (maxVal - minVal);
                        const y = getY(val);
                        return (
                          <g key={idx} className="opacity-40">
                            <line 
                              x1={marginLeft} 
                              y1={y} 
                              x2={svgWidth - marginRight} 
                              y2={y} 
                              stroke="#e2e8f0" 
                              strokeWidth="1" 
                              strokeDasharray="4 4" 
                            />
                            <text 
                              x={marginLeft - 12} 
                              y={y + 4} 
                              textAnchor="end" 
                              className="fill-slate-400 text-[10px] font-black tracking-tighter"
                            >
                              {val.toFixed(0)}
                            </text>
                          </g>
                        );
                      })}

                      {/* Renderizar cada posición y su Box Plot */}
                      {positionsList.map((posGroup, pIdx) => {
                        const xStep = plotWidth / (positionsList.length + 1);
                        const x = marginLeft + xStep * (pIdx + 1);

                        // Filtrar atletas de esta posición
                        const playersInPos = taskRows.filter(r => normalizePositionGroup(r.players?.posicion) === posGroup);

                        // Calcular estadísticas del Box Plot
                        const stats = computeBoxPlotForPosition(playersInPos, activeMetric);

                        return (
                          <g key={posGroup}>
                            {/* Etiqueta del Eje X */}
                            <text 
                              x={x} 
                              y={svgHeight - 12} 
                              textAnchor="middle" 
                              className="fill-slate-400 text-[10px] font-black uppercase tracking-wider"
                            >
                              {posGroup.split(' ')[0]}
                              {posGroup.split(' ')[1] ? ` ${posGroup.split(' ')[1].substring(0,3)}.` : ''}
                            </text>

                            {/* Línea guía vertical de fondo */}
                            <line 
                              x1={x} 
                              y1={marginTop} 
                              x2={x} 
                              y2={svgHeight - marginBottom} 
                              stroke="#f1f5f9" 
                              strokeWidth="2" 
                            />

                            {/* Dibujar la caja y bigotes si hay datos */}
                            {stats ? (
                              <>
                                {/* Línea vertical del bigote completo (Min a Max) */}
                                <line 
                                  x1={x} 
                                  y1={getY(stats.min)} 
                                  x2={x} 
                                  y2={getY(stats.max)} 
                                  stroke={boxBorderColor} 
                                  strokeWidth="2" 
                                  strokeLinecap="round"
                                />

                                {/* Barra T superior (Max) - Más larga horizontalmente */}
                                <line 
                                  x1={x - 20} 
                                  y1={getY(stats.max)} 
                                  x2={x + 20} 
                                  y2={getY(stats.max)} 
                                  stroke={boxBorderColor} 
                                  strokeWidth="2" 
                                  strokeLinecap="round"
                                />

                                {/* Barra T inferior (Min) - Más larga horizontalmente */}
                                <line 
                                  x1={x - 20} 
                                  y1={getY(stats.min)} 
                                  x2={x + 20} 
                                  y2={getY(stats.min)} 
                                  stroke={boxBorderColor} 
                                  strokeWidth="2" 
                                  strokeLinecap="round"
                                />

                                {/* La Caja Intercuartil (Q1 a Q3) - Más larga/ancha horizontalmente: width="72" */}
                                <rect 
                                  x={x - 36} 
                                  y={getY(stats.q3)} 
                                  width="72" 
                                  height={Math.max(4, getY(stats.q1) - getY(stats.q3))} 
                                  fill={boxFillColor} 
                                  stroke={boxBorderColor} 
                                  strokeWidth="2" 
                                  rx="8"
                                />

                                {/* Línea de Mediana (Q2) - Más larga horizontalmente */}
                                <line 
                                  x1={x - 36} 
                                  y1={getY(stats.median)} 
                                  x2={x + 36} 
                                  y2={getY(stats.median)} 
                                  stroke={boxBorderColor} 
                                  strokeWidth="4" 
                                  strokeLinecap="round"
                                />

                                {/* Indicador numérico de mediana al lado de la caja */}
                                <rect 
                                  x={x + 40} 
                                  y={getY(stats.median) - 8} 
                                  width="34" 
                                  height="16" 
                                  rx="4" 
                                  fill="#0b1220" 
                                  className="opacity-0 group-hover/card:opacity-90 transition-opacity"
                                />
                                <text 
                                  x={x + 57} 
                                  y={getY(stats.median) + 4} 
                                  textAnchor="middle" 
                                  fill="#ffffff" 
                                  className="text-[9px] font-black opacity-0 group-hover/card:opacity-100 transition-opacity pointer-events-none"
                                >
                                  {stats.median.toFixed(1)}
                                </text>
                              </>
                            ) : (
                              /* Estado vacío de la posición */
                              <circle 
                                cx={x} 
                                cy={marginTop + plotHeight / 2} 
                                r="4" 
                                className="fill-slate-200" 
                              />
                            )}

                            {/* Renderizar cada jugador como punto con Jitter */}
                            {playersInPos.map((row) => {
                              const val = Number(row[activeMetric]) || 0;
                              const yCoord = getY(val);
                              // Jitter estable basado en el ID del jugador
                              const stableJitter = getStableJitter(row.player_id);
                              const xCoord = x + stableJitter;

                              const isHovered = hoveredPlayer && hoveredPlayer.id === row.player_id && hoveredPlayer.tarea === taskName;

                              return (
                                <g 
                                  key={row.id}
                                  onMouseEnter={(e) => {
                                    setHoveredPlayer({
                                      id: row.player_id,
                                      tarea: taskName,
                                      nombre: formatPlayerName(row.players?.nombre, row.players?.apellido1, row.jugador_nombre),
                                      apellido: '',
                                      posicion: row.players?.posicion || 'Sin Posición',
                                      club: row.players?.club || 'Sin Club',
                                      value: val,
                                      posGroup,
                                      medianVal: stats?.median || val,
                                      x: xCoord,
                                      y: yCoord
                                    });
                                  }}
                                  onMouseLeave={() => setHoveredPlayer(null)}
                                  className="cursor-pointer"
                                >
                                  {/* Halo de hover */}
                                  <circle 
                                    cx={xCoord} 
                                    cy={yCoord} 
                                    r={isHovered ? "14" : "8"} 
                                    className="fill-slate-900/10 stroke-none transition-all duration-150"
                                  />
                                  {/* Punto del jugador */}
                                  <circle 
                                    cx={xCoord} 
                                    cy={yCoord} 
                                    r={isHovered ? "7" : "5.5"} 
                                    fill={isHovered ? "#0b1220" : boxBorderColor}
                                    stroke="#ffffff"
                                    strokeWidth="1.5"
                                    className="transition-all duration-150 shadow-md"
                                  />
                                </g>
                              );
                            })}
                          </g>
                        );
                      })}

                    </svg>

                    {/* Tooltip Absoluto Flotante */}
                    {hoveredPlayer && hoveredPlayer.tarea === taskName && (
                      <div 
                        className="absolute bg-[#0b1220] text-white p-4 rounded-3xl shadow-2xl border border-white/10 z-50 pointer-events-none transition-all duration-100 flex flex-col gap-2 min-w-[200px]"
                        style={{
                          left: `${(hoveredPlayer.x / svgWidth) * 100}%`,
                          top: `${hoveredPlayer.y - 120}px`,
                          transform: 'translateX(-50%)'
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center font-black text-xs text-red-500 italic">
                            {hoveredPlayer.nombre.charAt(0)}
                          </div>
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-tight italic">
                              {hoveredPlayer.nombre} {hoveredPlayer.apellido}
                            </p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                              {hoveredPlayer.posicion}
                            </p>
                          </div>
                        </div>
                        <div className="border-t border-white/5 pt-2 flex justify-between items-end">
                          <div>
                            <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block">RENDIMIENTO</span>
                            <span className="text-sm font-black italic tracking-tighter text-red-500">{hoveredPlayer.value.toFixed(1)}</span>
                            <span className="text-[8px] font-bold text-slate-300 ml-1">{metricUnit}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block">DIF MEDIANA</span>
                            <span className={`text-[10px] font-black italic ${hoveredPlayer.value >= hoveredPlayer.medianVal ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {hoveredPlayer.value >= hoveredPlayer.medianVal ? '+' : ''}
                              {(((hoveredPlayer.value - hoveredPlayer.medianVal) / (hoveredPlayer.medianVal || 1)) * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Leyenda y Notas del Gráfico */}
                <div className="mt-4 flex flex-wrap justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider gap-4">
                  <div className="flex items-center gap-6">
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded bg-slate-100 border border-slate-200 inline-block"></span>
                      Estructura Posicional (Caja IQR)
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: boxBorderColor }}></span>
                      Atleta Registrado (Jitter)
                    </span>
                  </div>
                  <div className="text-slate-300">
                    * Pasa el cursor sobre los puntos para identificar al jugador
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
}

// Función auxiliar para calcular estadísticas de Box Plot
function computeBoxPlotForPosition(playersInPos: any[], metric: string) {
  if (playersInPos.length === 0) return null;
  const values = playersInPos.map(p => Number(p[metric]) || 0).sort((a, b) => a - b);
  const min = values[0];
  const max = values[values.length - 1];

  const getPercentile = (arr: number[], p: number) => {
    if (arr.length === 0) return 0;
    if (arr.length === 1) return arr[0];
    const index = (arr.length - 1) * p;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    return arr[lower] * (1 - weight) + arr[upper] * weight;
  };

  const q1 = getPercentile(values, 0.25);
  const median = getPercentile(values, 0.5);
  const q3 = getPercentile(values, 0.75);

  return { min, q1, median, q3, max, count: values.length };
}

// Generador de Jitter estable basado en el player_id para evitar rebotes visuales
function getStableJitter(id: number) {
  const val = (id * 9301 + 49297) % 233280;
  return -12 + (val / 233280) * 24;
}

function KPIMini({ label, value, icon, color }: { label: string, value: string | number, icon: string, color: string }) {
  return (
    <div className="bg-white p-6 rounded-[32px] border border-slate-100 flex items-center gap-5 transition-all hover:bg-white hover:shadow-xl group transform-gpu hover:-translate-y-1">
      <div className={`w-12 h-12 rounded-[20px] flex items-center justify-center text-lg bg-white shadow-inner border border-slate-50 ${color} group-hover:scale-110 transition-transform`}>
        <i className={`fa-solid ${icon}`}></i>
      </div>
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-2">{label}</p>
        <p className={`text-xl font-black italic tracking-tighter ${color}`}>{value}</p>
      </div>
    </div>
  );
}
