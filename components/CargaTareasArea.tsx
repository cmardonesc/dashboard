
import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AthletePerformanceRecord } from '../types';
import { normalizeClub } from '../lib/utils';

interface GpsTarea {
  id: number;
  fecha: string;
  id_del_jugador: number;
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
}

export default function CargaTareasArea({ performanceRecords, userRole, userClub }: CargaTareasAreaProps) {
  const [data, setData] = useState<GpsTarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedTask, setSelectedTask] = useState<string>('TODAS');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>({
    key: 'm_por_min',
    direction: 'desc'
  });

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
      const playerIds = Array.from(new Set(gpsData.map(d => d.id_del_jugador)));
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('id_del_jugador, nombre, apellido1, posicion, club, anio')
        .in('id_del_jugador', playerIds);
      
      if (playersError) throw playersError;

      // Join in memory
      const joinedData = gpsData.map(gps => {
        const player = playersData?.find(p => p.id_del_jugador === gps.id_del_jugador) as any;
        if (player && !player.categoria && player.anio) {
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
    if (userRole !== 'club' || !userClub) return data;
    
    const uClubNorm = normalizeClub(userClub);
    
    return data.map(row => {
      const player = row.players;
      const pClub = player?.club_name || player?.club || '';
      const pClubNorm = normalizeClub(pClub);
      
      if (pClubNorm !== uClubNorm) {
        return {
          ...row,
          jugador_nombre: 'Jugador',
          players: player ? {
            ...player,
            nombre: 'Jugador',
            apellido1: `[${row.id_del_jugador}]`,
            club: 'OTRO CLUB',
            club_name: 'OTRO CLUB'
          } : undefined
        };
      }
      return row;
    });
  }, [data, userRole, userClub]);

  const taskStats = useMemo(() => {
    if (!anonymizedData.length) return [];
    
    const tasksMap: Record<string, { 
      count: number, 
      totalInt: number, 
      maxInt: number, 
      maxVel: number,
      totalDist: number,
      totalDist15: number,
      totalDist20: number,
      totalDist25: number,
      totalAccDec: number
    }> = {};
    
    anonymizedData.forEach(row => {
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
          totalAccDec: 0
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
      count: stats.count
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  const uniqueTasks = useMemo(() => {
    return taskStats.map(t => t.name);
  }, [taskStats]);

  const filteredData = useMemo(() => {
    let items = [...anonymizedData];
    
    if (selectedTask !== 'TODAS') {
      items = items.filter(item => item.tarea === selectedTask);
    }

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      items = items.filter(item => 
        (item.players?.nombre || item.jugador_nombre || "").toLowerCase().includes(lowerSearch) ||
        (item.players?.apellido1 || "").toLowerCase().includes(lowerSearch) ||
        item.tarea.toLowerCase().includes(lowerSearch)
      );
    }

    // Agrupar por jugador y calcular promedios
    const playerMap: Record<number, any> = {};
    
    items.forEach(item => {
      const pid = item.id_del_jugador;
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
  }, [data, selectedTask, searchTerm, sortConfig]);

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
             <KPIMini label="AVG DIST (M)" value={groupKPIs.avgDist.toFixed(0)} icon="fa-arrows-left-right" color="text-blue-600" />
             <KPIMini label="AVG INT (M/M)" value={groupKPIs.avgInt.toFixed(1)} icon="fa-fire-flame-curved" color="text-red-600" />
             <KPIMini label="MAX VEL (KM/H)" value={groupKPIs.maxVel.toFixed(1)} icon="fa-bolt" color="text-amber-500" />
             <KPIMini label="AVG TIEMPO" value={`${groupKPIs.avgMin.toFixed(0)}m`} icon="fa-clock" color="text-indigo-500" />
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
                      {task.avgDist.toFixed(0)} <span className="text-[9px] not-italic font-bold opacity-50 uppercase">m</span>
                    </p>
                  </div>
                  <div>
                    <p className={`text-[8px] font-black uppercase mb-1 ${selectedTask === task.name ? 'text-slate-400' : 'text-slate-400'}`}>Acc/Dec</p>
                    <p className="text-xl font-black italic tracking-tighter leading-none">
                      {task.avgAccDec.toFixed(0)} <span className="text-[9px] not-italic font-bold opacity-50 uppercase">n</span>
                    </p>
                  </div>
                  <div>
                    <p className={`text-[8px] font-black uppercase mb-1 ${selectedTask === task.name ? 'text-slate-400' : 'text-slate-400'}`}>&gt;15 km/h</p>
                    <p className="text-xl font-black italic tracking-tighter leading-none">
                      {task.avgDist15.toFixed(0)} <span className="text-[9px] not-italic font-bold opacity-50 uppercase">m</span>
                    </p>
                  </div>
                  <div>
                    <p className={`text-[8px] font-black uppercase mb-1 ${selectedTask === task.name ? 'text-slate-400' : 'text-slate-400'}`}>&gt;20 km/h</p>
                    <p className="text-xl font-black italic tracking-tighter leading-none">
                      {task.avgDist20.toFixed(0)} <span className="text-[9px] not-italic font-bold opacity-50 uppercase">m</span>
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className={`text-[8px] font-black uppercase mb-1 ${selectedTask === task.name ? 'text-red-500' : 'text-red-600'}`}>Sprint (&gt;25 km/h)</p>
                    <p className="text-xl font-black italic tracking-tighter leading-none">
                      {task.avgDist25.toFixed(0)} <span className="text-[9px] not-italic font-bold opacity-50 uppercase">m</span>
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Tabla Expandida */}
      <div className="bg-white rounded-[48px] border border-slate-100 shadow-2xl overflow-hidden overflow-x-auto transform-gpu transition-all">
        <table className="w-full text-center border-collapse min-w-[1400px]">
          <thead className="bg-[#0b1220] text-white font-black uppercase tracking-[0.15em] text-[10px]">
            <tr>
              <th className="px-4 py-8 border-r border-white/5 cursor-pointer" onClick={() => handleSort('bloque')}>
                 B. <i className={`fa-solid ${getSortIcon('bloque')}`}></i>
              </th>
              <th className="px-6 py-8 border-r border-white/5 text-left">TAREA / BLOQUE</th>
              <th className="px-8 py-8 text-left border-r border-white/5">PARTICIPANTE</th>
              <th className="px-4 py-8 cursor-pointer border-r border-white/5 transition-colors" onClick={() => handleSort('minutos')}>
                TIEMPO <i className={`fa-solid ${getSortIcon('minutos')}`}></i>
              </th>
              <th className="px-4 py-8 cursor-pointer border-r border-white/5 transition-colors" onClick={() => handleSort('dist_total_m')}>
                DIST <i className={`fa-solid ${getSortIcon('dist_total_m')}`}></i>
              </th>
              <th className="px-4 py-8 cursor-pointer border-r border-white/5 transition-colors" onClick={() => handleSort('m_por_min')}>
                M/MIN <i className={`fa-solid ${getSortIcon('m_por_min')}`}></i>
              </th>
              <th className="px-4 py-8 cursor-pointer border-r border-white/5 transition-colors" onClick={() => handleSort('dist_mai_m_20_kmh')}>
                HSR (&gt;20) <i className={`fa-solid ${getSortIcon('dist_mai_m_20_kmh')}`}></i>
              </th>
              <th className="px-4 py-8 cursor-pointer border-r border-white/5 transition-colors" onClick={() => handleSort('dist_ai_m_15_kmh')}>
                AI (&gt;15) <i className={`fa-solid ${getSortIcon('dist_ai_m_15_kmh')}`}></i>
              </th>
              <th className="px-4 py-8 cursor-pointer border-r border-white/5 transition-colors" onClick={() => handleSort('dist_sprint_m_25_kmh')}>
                SPRINT (M) <i className={`fa-solid ${getSortIcon('dist_sprint_m_25_kmh')}`}></i>
              </th>
              <th className="px-4 py-8 cursor-pointer border-r border-white/5 transition-colors" onClick={() => handleSort('sprints_n')}>
                # SP <i className={`fa-solid ${getSortIcon('sprints_n')}`}></i>
              </th>
              <th className="px-4 py-8 cursor-pointer border-r border-white/5 transition-colors" onClick={() => handleSort('vel_max_kmh')}>
                VEL MAX <i className={`fa-solid ${getSortIcon('vel_max_kmh')}`}></i>
              </th>
              <th className="px-6 py-8 cursor-pointer transition-colors" onClick={() => handleSort('acc_decc_ai_n')}>
                ACC/DECC <i className={`fa-solid ${getSortIcon('acc_decc_ai_n')}`}></i>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={12} className="py-32 animate-pulse text-slate-300 font-black uppercase tracking-widest italic text-xs">Conectando...</td></tr>
            ) : filteredData.length === 0 ? (
              <tr><td colSpan={12} className="py-32 text-slate-400 font-black uppercase tracking-widest text-[10px] italic">No hay registros para {selectedDate}</td></tr>
            ) : (
              filteredData.map((row) => {
                const isOwnPlayer = row.player && normalizeClub(row.player.club_name || row.player.club || '') === normalizeClub(userClub || '');
                return (
                  <tr key={row.id} className={`hover:bg-slate-50 transition-colors group ${isOwnPlayer ? 'bg-slate-100/80' : ''}`}>
                    <td className="px-4 py-6 border-r border-slate-50 font-black text-slate-400 italic">
                      {Array.isArray(row.bloque) ? row.bloque.join(', ') : row.bloque || '-'}
                    </td>
                  <td className="px-6 py-6 border-r border-slate-50 text-left">
                    <span className="text-[10px] font-black px-4 py-1.5 rounded-xl bg-[#0b1220] text-white italic truncate inline-block max-w-[180px] shadow-sm">
                      {row.tarea}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-left border-r border-slate-50">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 font-black text-xs group-hover:bg-red-600 group-hover:text-white transition-all italic shadow-inner">
                          {(row.player?.nombre || row.jugador_nombre || "P").charAt(0)}
                       </div>
                       <div>
                          <p className="font-black text-slate-900 uppercase italic text-[13px] leading-none mb-1 group-hover:text-red-600 transition-colors">
                            {row.player?.nombre || row.jugador_nombre} {row.player?.apellido1 || ""}
                          </p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{row.player?.posicion || 'N/A'} | {row.player?.club || 'Sin Club'}</p>
                       </div>
                    </div>
                  </td>
                  <td className="px-4 py-6 font-black text-slate-900 italic text-sm border-r border-slate-50">
                    {Number(row.minutos).toFixed(0)} <span className="text-[9px] text-slate-400 not-italic font-bold">m</span>
                  </td>
                  <td className="px-4 py-6 font-black text-slate-900 italic text-sm border-r border-slate-50">
                    {Number(row.dist_total_m).toFixed(0)} <span className="text-[9px] text-slate-400 not-italic font-bold">m</span>
                  </td>
                  <td className="px-4 py-6 border-r border-slate-50">
                    <div className={`inline-flex items-center gap-3 px-4 py-1.5 rounded-xl font-black text-[12px] italic transition-transform group-hover:scale-110 shadow-sm ${getIntensityStyle(row.m_por_min)}`}>
                      {Number(row.m_por_min).toFixed(1)}
                    </div>
                  </td>
                  <td className="px-4 py-6 border-r border-slate-50 font-black text-slate-900 text-sm italic">
                    {Number(row.dist_mai_m_20_kmh).toFixed(0)} <span className="text-[9px] text-slate-400 not-italic font-bold">m</span>
                  </td>
                  <td className="px-4 py-6 border-r border-slate-50 font-black text-slate-400 text-sm italic">
                    {Number(row.dist_ai_m_15_kmh || 0).toFixed(0)} <span className="text-[9px] not-italic font-bold">m</span>
                  </td>
                  <td className="px-4 py-6 border-r border-slate-50 font-black text-red-600 text-sm italic">
                    {Number(row.dist_sprint_m_25_kmh || 0).toFixed(0)} <span className="text-[9px] text-slate-400 not-italic font-bold">m</span>
                  </td>
                  <td className="px-4 py-6 border-r border-slate-50">
                    <div className="inline-flex items-center gap-2 bg-slate-900 text-white px-3 py-1 rounded-lg font-black text-[11px] shadow-lg">
                      {Number(row.sprints_n).toFixed(1)} <i className="fa-solid fa-bolt text-[9px] text-yellow-400"></i>
                    </div>
                  </td>
                  <td className="px-4 py-6 border-r border-slate-50 font-black text-slate-900 text-sm italic">
                    {Number(row.vel_max_kmh || 0).toFixed(1)} <span className="text-[9px] text-slate-400 not-italic font-bold">km/h</span>
                  </td>
                  <td className="px-6 py-6 font-black text-slate-900 italic text-sm">
                    {Number(row.acc_decc_ai_n || 0).toFixed(0)} <span className="text-[9px] text-slate-400 not-italic font-bold">act.</span>
                  </td>
                </tr>
              );
            }))}
          </tbody>
        </table>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
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
