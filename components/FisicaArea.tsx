
import React, { useState, useMemo, useEffect } from 'react';
import { AthletePerformanceRecord, Category, CATEGORY_ID_MAP } from '../types';
import { supabase } from '../lib/supabase';

interface FisicaAreaProps {
  performanceRecords: AthletePerformanceRecord[];
  view?: 'wellness' | 'pse' | 'external_total' | 'report';
}

type MainTab = 'carga_interna' | 'carga_externa' | 'reporte_diario';

export default function FisicaArea({ performanceRecords, view = 'wellness' }: FisicaAreaProps) {
  const activeMainTab: MainTab = useMemo(() => {
    if (view === 'external_total') return 'carga_externa';
    if (view === 'report') return 'reporte_diario';
    return 'carga_interna';
  }, [view]);
  
  // Filtros Globales
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([Category.SUB_17]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [athleteSearch, setAthleteSearch] = useState(''); 

  // Filtro de búsqueda interno específico del Reporte Diario
  const [reportPlayerSearch, setReportPlayerSearch] = useState('');

  // Filtro de minutos para Carga Externa
  const [minDuration, setMinDuration] = useState<number>(0);
  const [maxDuration, setMaxDuration] = useState<number>(120);

  // Estados de Contexto
  const [activeMicrocycle, setActiveMicrocycle] = useState<any>(null);
  const [citedPlayerIds, setCitedPlayerIds] = useState<number[]>([]);
  const [loadingContext, setLoadingContext] = useState(false);

  // Filtros específicos del Reporte Diario
  const [selectedPlayersReport, setSelectedPlayersReport] = useState<Set<number>>(new Set());
  const [dailyTaskGps, setDailyTaskGps] = useState<any[]>([]);

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
    return performanceRecords.filter(r => r.player.id_del_jugador && citedPlayerIds.includes(r.player.id_del_jugador));
  }, [performanceRecords, citedPlayerIds]);

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
      int: allGpsSessions.length ? allGpsSessions.reduce((acc, c) => acc + ((c as any).intensity || 0), 0) / allGpsSessions.length : 0
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

    return { wellnessList, loadList, gpsKPIs, taskSummary, athleteGpsTotals };
  }, [currentCitadosPlayers, selectedPlayersReport, selectedDate, dailyTaskGps]);

  // LOGICA DE PAGINACION Y CHUNKING PARA PDF
  const wellnessChunks = useMemo(() => {
    const list = reportData.wellnessList;
    const chunks = [];
    chunks.push(list.slice(0, 14));
    for (let i = 14; i < list.length; i += 22) {
      chunks.push(list.slice(i, i + 22));
    }
    return chunks;
  }, [reportData.wellnessList]);

  const loadChunks = useMemo(() => {
    const list = reportData.loadList;
    const chunks = [];
    for (let i = 0; i < list.length; i += 22) {
      chunks.push(list.slice(i, i + 22));
    }
    return chunks;
  }, [reportData.loadList]);

  const gpsChunks = useMemo(() => {
    const list = reportData.athleteGpsTotals;
    const chunks = [];
    for (let i = 0; i < list.length; i += 26) {
      chunks.push(list.slice(i, i + 26));
    }
    return chunks;
  }, [reportData.athleteGpsTotals]);

  const totalPages = wellnessChunks.length + loadChunks.length + gpsChunks.length + 1;

  const { reported, pending } = useMemo(() => {
    const reportedList: any[] = [];
    const pendingList: any[] = [];
    currentCitadosPlayers.forEach(record => {
      const dayWellness = record.wellness.find(w => w.date === selectedDate);
      const dayLoads = record.loads.filter(l => l.date === selectedDate);
      const matchesSearch = record.player.name.toLowerCase().includes(athleteSearch.toLowerCase());
      if (!matchesSearch) return;
      if (dayLoads.length > 0) {
        dayLoads.forEach((load, index) => {
          reportedList.push({ player: record.player, wellness: dayWellness, load: load, sessionIndex: index + 1 });
        });
      } else if (dayWellness) {
        reportedList.push({ player: record.player, wellness: dayWellness, load: null, sessionIndex: 1 });
      } else {
        pendingList.push(record);
      }
    });
    return { reported: reportedList, pending: pendingList };
  }, [currentCitadosPlayers, selectedDate, athleteSearch]);

  const gpsRows = useMemo(() => {
    const rows: any[] = [];
    currentCitadosPlayers.forEach(record => {
      const dayGpsEntries = record.gps.filter(g => g.date === selectedDate);
      const matchesSearch = record.player.name.toLowerCase().includes(athleteSearch.toLowerCase());
      if (!matchesSearch) return;
      dayGpsEntries.forEach((gps, idx) => {
        if (gps.duration < minDuration || gps.duration > maxDuration) return;
        const intensity = (gps as any).intensity || (gps.totalDistance / Math.max(gps.duration, 1));
        rows.push({ player: record.player, gps, intensity, sessionIndex: idx + 1 });
      });
    });
    return rows;
  }, [currentCitadosPlayers, selectedDate, athleteSearch, minDuration, maxDuration]);

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
          <button onClick={handleTriggerPrint} className="bg-[#0b1220] text-white px-8 py-4 rounded-[20px] text-xs font-black uppercase tracking-widest flex items-center gap-3 hover:bg-red-600 transition-all shadow-xl active:scale-95">
            <i className="fa-solid fa-file-pdf"></i> Exportar Reporte PDF
          </button>
        </div>
      </div>

      {/* 2. SELECTOR DE PESTAÑAS (Global) - REMOVIDO POR SIDEBAR */}
      {/* <div className="bg-white/50 p-1.5 rounded-[24px] border border-slate-100 flex items-center gap-2 max-w-fit shadow-sm overflow-x-auto print:hidden"> ... </div> */}

      {/* 3. BARRA DE FILTROS UNIFICADA (Global) */}
      <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-8 items-end print:hidden">
        <div className="md:col-span-2 space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 italic block">Selección de Fecha</label>
          <input 
            type="date" 
            className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-xs font-black outline-none focus:ring-4 focus:ring-red-500/10 shadow-inner transition-all appearance-none" 
            value={selectedDate} 
            onChange={e => setSelectedDate(e.target.value)} 
          />
        </div>
        <div className="md:col-span-3 space-y-2 relative">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 italic block">Categoría Oficial</label>
          <button 
            onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
            className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-xs font-black outline-none shadow-inner focus:ring-4 focus:ring-slate-100 transition-all flex justify-between items-center text-left"
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
        <div className="md:col-span-4 space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 italic block">Buscador Global de Atleta</label>
          <div className="relative">
            <i className="fa-solid fa-magnifying-glass absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 text-xs"></i>
            <input 
              type="text" 
              placeholder="Nombre, apellido, club..." 
              className="w-full bg-slate-50 border-none rounded-2xl px-12 py-4 text-xs font-black outline-none focus:ring-4 focus:ring-red-500/10 shadow-inner transition-all" 
              value={athleteSearch} 
              onChange={e => setAthleteSearch(e.target.value)} 
            />
          </div>
        </div>
        <div className="md:col-span-3">
          {activeMicrocycle ? (
            <div className="bg-[#0b1220] border border-white/5 p-4 rounded-3xl flex items-center justify-between shadow-xl h-[54px]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-600 rounded-xl flex items-center justify-center text-white text-[10px] shadow-lg">
                  <i className="fa-solid fa-calendar-check"></i>
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-0.5">MICROCICLO ACTIVO</p>
                  <p className="text-[11px] font-black text-white italic truncate w-32 uppercase leading-none">{activeMicrocycle.city}</p>
                </div>
              </div>
              <div className="text-right pr-2">
                <p className="text-[8px] font-bold text-red-500 uppercase tracking-widest leading-none mb-0.5">CITADOS</p>
                <p className="text-sm font-black text-white italic leading-none">{citedPlayerIds.length}</p>
              </div>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-100 p-4 rounded-3xl flex items-center gap-3 h-[54px] justify-center">
              <i className="fa-solid fa-triangle-exclamation text-red-500 text-xs"></i>
              <p className="text-[9px] font-black text-red-600 uppercase tracking-tight leading-none">SIN MICROCICLO ACTIVO</p>
            </div>
          )}
        </div>
      </div>

      {/* 4. CONTENIDO DINÁMICO SEGÚN PESTAÑA */}
      {activeMainTab === 'carga_interna' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-300 print:hidden">
           <div className="lg:col-span-4 space-y-4">
              <h3 className="text-sm font-black text-red-600 uppercase tracking-[0.2em] px-2 italic flex items-center gap-2">
                <i className="fa-solid fa-clock-rotate-left"></i> Pendientes de Reporte ({pending.length})
              </h3>
              <div className="bg-white rounded-[40px] border border-red-100 shadow-sm overflow-hidden divide-y divide-slate-50">
                {pending.map(record => (
                  <div key={record.player.id} className="p-5 flex items-center justify-between group hover:bg-red-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 font-black italic text-xs">{record.player.name.charAt(0)}</div>
                      <p className="text-[11px] font-black uppercase text-slate-900 italic tracking-tight">{record.player.name}</p>
                    </div>
                    <i className="fa-solid fa-bell text-red-200"></i>
                  </div>
                ))}
              </div>
           </div>
           <div className="lg:col-span-8 space-y-4">
              <h3 className="text-sm font-black text-emerald-600 uppercase tracking-[0.2em] px-2 italic flex items-center gap-2">
                <i className="fa-solid fa-circle-check"></i> Atletas Reportados ({reported.length})
              </h3>
              <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden">
                <table className="w-full text-center">
                  <thead className="bg-[#0b1220] text-white font-black uppercase text-[10px]">
                    <tr>
                      <th className="px-8 py-5 text-left">Atleta</th>
                      {(view === 'wellness' || view === 'report') && <th className="px-2 py-5">Wellness</th>}
                      {(view === 'wellness' || view === 'report') && <th className="px-4 py-5">Zona Molestia</th>}
                      {(view === 'wellness' || view === 'report') && <th className="px-4 py-5">Estado Salud</th>}
                      {(view === 'pse' || view === 'report') && <th className="px-2 py-5">RPE</th>}
                      {(view === 'pse' || view === 'report') && <th className="px-2 py-5">Carga</th>}
                      <th className="px-8 py-5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reported.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors font-black uppercase italic text-xs">
                        <td className="px-8 py-5 text-left">{row.player.name}</td>
                        {(view === 'wellness' || view === 'report') && (
                          <td className="px-2 py-5">{row.wellness ? <span className={`px-3 py-1 rounded-lg ${getScoreColor((row.wellness.fatigue + row.wellness.sleep + row.wellness.mood)/3)}`}>{((row.wellness.fatigue + row.wellness.sleep + row.wellness.mood)/3).toFixed(1)}</span> : '-'}</td>
                        )}
                        {(view === 'wellness' || view === 'report') && (
                          <td className="px-4 py-5">
                            {row.wellness?.soreness_areas && row.wellness.soreness_areas.length > 0 ? (
                              <div className="flex flex-wrap gap-1 justify-center">
                                {row.wellness.soreness_areas.map((area, i) => (
                                  <span key={i} className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[9px] font-bold uppercase">{area}</span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-300 text-[10px] font-bold uppercase">SIN DOLOR</span>
                            )}
                          </td>
                        )}
                        {(view === 'wellness' || view === 'report') && (
                          <td className="px-4 py-5">
                            {row.wellness?.illness_symptoms && row.wellness.illness_symptoms.length > 0 ? (
                              <div className="flex flex-wrap gap-1 justify-center">
                                {row.wellness.illness_symptoms.map((sym, i) => (
                                  <span key={i} className="bg-amber-100 text-amber-600 px-2 py-0.5 rounded text-[9px] font-bold uppercase">{sym}</span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-emerald-500 text-[10px] font-bold uppercase">SANO</span>
                            )}
                          </td>
                        )}
                        {(view === 'pse' || view === 'report') && (
                          <td className="px-2 py-5 text-lg">{row.load?.rpe || '-'}</td>
                        )}
                        {(view === 'pse' || view === 'report') && (
                          <td className="px-2 py-5">{row.load ? <span className="bg-slate-900 text-white px-3 py-1 rounded-lg">{row.load.load}</span> : '-'}</td>
                        )}
                        <td className="px-8 py-5 text-right text-emerald-500"><i className="fa-solid fa-check-double"></i> OK</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
           </div>
        </div>
      )}

      {activeMainTab === 'carga_externa' && (
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-2xl overflow-hidden animate-in fade-in duration-300 print:hidden">
           <table className="w-full text-center">
             <thead className="bg-[#0b1220] text-white font-black uppercase text-[10px]">
               <tr><th className="px-8 py-5 text-left">Atleta</th><th className="px-4 py-5">Tiempo</th><th className="px-4 py-5">Distancia</th><th className="px-4 py-5">HSR</th><th className="px-8 py-5 text-right">Intensidad</th></tr>
             </thead>
             <tbody className="divide-y divide-slate-100 font-black italic uppercase text-xs">
               {gpsRows.map((row, idx) => (
                 <tr key={idx} className="hover:bg-slate-50 transition-colors">
                   <td className="px-8 py-5 text-left">{row.player.name}</td>
                   <td className="px-4 py-5">{row.gps.duration} min</td>
                   <td className="px-4 py-5">{(row.gps.totalDistance / 1000).toFixed(2)} km</td>
                   <td className="px-4 py-5">{row.gps.hsrDistance} m</td>
                   <td className="px-8 py-5 text-right"><span className={`px-4 py-1.5 rounded-lg ${getIntensityStyle(row.intensity)}`}>{row.intensity.toFixed(1)}</span></td>
                 </tr>
               ))}
             </tbody>
           </table>
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
                <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-[32px] border border-slate-100 shadow-inner">
                  <button onClick={() => setSelectedPlayersReport(new Set(citedPlayerIds))} className="px-6 py-3 bg-[#0b1220] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-md">Seleccionar Todo</button>
                  <div className="h-8 w-px bg-slate-200 mx-2"></div>
                  <div className="pr-4">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Incluidos</span>
                    <span className="text-sm font-black text-[#0b1220] italic">{selectedPlayersReport.size}</span>
                  </div>
                  <button 
                    onClick={handleTriggerPrint} 
                    className="bg-red-600 text-white px-10 py-5 rounded-[24px] text-[11px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-red-700 transition-all shadow-xl active:scale-95"
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
                           className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm border-2 ${active ? 'bg-[#0b1220] border-[#0b1220] text-white' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}
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
          <div className="space-y-0 print:bg-white">
            {/* PÁGINAS DE WELLNESS (Chunked) */}
            {wellnessChunks.map((chunk, chunkIdx) => {
              currentPageNum++;
              return (
                <div key={`well-${chunkIdx}`} className="print-page-section print:p-12">
                  <PrintHeader 
                    selectedDate={selectedDate} 
                    selectedCategory={selectedCategories[0]} 
                    activeMicrocycle={activeMicrocycle} 
                    page={currentPageNum} 
                    total={totalPages} 
                  />
                  
                  {chunkIdx === 0 && (
                    <section className="mb-10">
                      <h3 className="text-xs font-black text-slate-900 border-l-4 border-red-600 pl-4 mb-6 uppercase tracking-widest italic">1. RESUMEN GRUPAL DE RENDIMIENTO</h3>
                      <div className="grid grid-cols-4 gap-4">
                        <KPIReportCard label="Distancia Media" value={`${reportData.gpsKPIs.dist.toFixed(0)}m`} icon="fa-arrows-left-right" />
                        <KPIReportCard label="HSR Promedio" value={`${reportData.gpsKPIs.hsr.toFixed(0)}m`} icon="fa-fire" />
                        <KPIReportCard label="Vel. Máxima" value={`${reportData.gpsKPIs.velMax.toFixed(1)}km/h`} icon="fa-bolt" />
                        <KPIReportCard label="Intensidad" value={`${reportData.gpsKPIs.int.toFixed(1)} m/m`} icon="fa-gauge-high" />
                      </div>
                    </section>
                  )}

                  <section>
                    <h3 className="text-xs font-black text-slate-900 border-l-4 border-[#0b1220] pl-4 mb-6 uppercase tracking-widest italic">
                      2. BIENESTAR INDIVIDUAL {chunkIdx > 0 ? '(CONTINUACIÓN)' : ''}
                    </h3>
                    <div className="overflow-hidden border border-slate-900">
                      <table className="w-full text-center border-collapse">
                        <thead className="bg-[#0b1220] text-white text-[8px] font-black uppercase tracking-tighter">
                          <tr className="border-b border-slate-700">
                            <th className="px-6 py-3 text-left border-r border-white/10">ATLETA</th>
                            <th className="px-2 py-3 border-r border-white/10">FATIGA</th>
                            <th className="px-2 py-3 border-r border-white/10">SUEÑO</th>
                            <th className="px-2 py-3 border-r border-white/10">DOLOR</th>
                            <th className="px-2 py-3 border-r border-white/10">ESTRÉS</th>
                            <th className="px-2 py-3 border-r border-white/10">ÁNIMO</th>
                            <th className="px-2 py-3">AVG</th>
                          </tr>
                        </thead>
                        <tbody className="text-[9px] font-bold text-slate-900">
                          {chunk.map(({ player, data }) => {
                            const avg = data ? (data.fatigue + data.sleep + data.mood) / 3 : 0;
                            return (
                              <tr key={player.id} className="border-b border-slate-200 h-10">
                                <td className="px-6 py-2 text-left border-r border-slate-200">
                                   <span className="uppercase block leading-none">{player.name}</span>
                                </td>
                                <td className="px-2 py-2 border-r border-slate-200"><span className={`inline-block w-8 py-1 rounded text-[8px] ${getScoreColor(data?.fatigue || 0)}`}>{data?.fatigue || '—'}</span></td>
                                <td className="px-2 py-2 border-r border-slate-200"><span className={`inline-block w-8 py-1 rounded text-[8px] ${getScoreColor(data?.sleep || 0)}`}>{data?.sleep || '—'}</span></td>
                                <td className="px-2 py-2 border-r border-slate-200"><span className={`inline-block w-8 py-1 rounded text-[8px] ${getScoreColor(data?.soreness || 0)}`}>{data?.soreness || '—'}</span></td>
                                <td className="px-2 py-2 border-r border-slate-200"><span className={`inline-block w-8 py-1 rounded text-[8px] ${getScoreColor(data?.stress || 0)}`}>{data?.stress || '—'}</span></td>
                                <td className="px-2 py-2 border-r border-slate-200"><span className={`inline-block w-8 py-1 rounded text-[8px] ${getScoreColor(data?.mood || 0)}`}>{data?.mood || '—'}</span></td>
                                <td className="px-2 py-2 font-black italic">{avg ? avg.toFixed(1) : '—'}</td>
                              </tr>
                            );
                          })}
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
                <div key={`load-${chunkIdx}`} className="print-page-section print:p-12">
                  <PrintHeader 
                    selectedDate={selectedDate} 
                    selectedCategory={selectedCategories[0]} 
                    activeMicrocycle={activeMicrocycle} 
                    page={currentPageNum} 
                    total={totalPages} 
                  />
                  <section>
                    <h3 className="text-xs font-black text-slate-900 border-l-4 border-[#0b1220] pl-4 mb-6 uppercase tracking-widest italic">
                      3. CONTROL DE CARGA INTERNA {chunkIdx > 0 ? '(CONTINUACIÓN)' : ''}
                    </h3>
                    <div className="border border-slate-900">
                      <table className="w-full text-center border-collapse">
                        <thead className="bg-[#0b1220] text-white text-[8px] font-black uppercase tracking-tighter">
                          <tr className="border-b border-slate-700">
                            <th className="px-8 py-4 text-left border-r border-white/10">ATLETA</th>
                            <th className="px-4 py-4 border-r border-white/10">SESIONES</th>
                            <th className="px-4 py-4 border-r border-white/10">RPE MEDIA</th>
                            <th className="px-4 py-4 border-r border-white/10">MINUTOS TOT</th>
                            <th className="px-4 py-4 border-r border-white/10">CARGA (UA)</th>
                            <th className="px-8 py-4 text-right">ESTADO</th>
                          </tr>
                        </thead>
                        <tbody className="text-[10px] font-bold text-slate-900">
                          {chunk.map(({ player, sessions }) => {
                            const rpeAvg = sessions.length ? sessions.reduce((acc, c) => acc + c.rpe, 0) / sessions.length : 0;
                            const totalMin = sessions.reduce((acc, c) => acc + c.duration, 0);
                            const totalLoad = sessions.reduce((acc, c) => acc + c.load, 0);
                            const status = getLoadStatus(totalLoad);
                            return (
                              <tr key={player.id} className="border-b border-slate-200 h-12">
                                <td className="px-8 py-2 text-left border-r border-slate-200 font-black uppercase italic">{player.name}</td>
                                <td className="px-4 py-2 border-r border-slate-200 text-slate-400">{sessions.length}</td>
                                <td className="px-4 py-2 border-r border-slate-200 font-black text-sm italic">{rpeAvg ? rpeAvg.toFixed(1) : '—'}</td>
                                <td className="px-4 py-2 border-r border-slate-200">{totalMin}'</td>
                                <td className="px-4 py-2 border-r border-slate-200 font-black italic">{totalLoad}</td>
                                <td className={`px-8 py-2 text-right font-black italic tracking-tighter ${status.color}`}>{status.label}</td>
                              </tr>
                            );
                          })}
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
                <div key={`gps-${chunkIdx}`} className="print-page-section print:p-12">
                  <PrintHeader 
                    selectedDate={selectedDate} 
                    selectedCategory={selectedCategories[0]} 
                    activeMicrocycle={activeMicrocycle} 
                    page={currentPageNum} 
                    total={totalPages} 
                  />
                  <section>
                    <h3 className="text-xs font-black text-slate-900 border-l-4 border-red-600 pl-4 mb-6 uppercase tracking-widest italic">
                      4. RENDIMIENTO INDIVIDUAL GPS {chunkIdx > 0 ? '(CONTINUACIÓN)' : ''}
                    </h3>
                    <div className="border border-slate-900 overflow-hidden">
                      <table className="w-full text-center border-collapse">
                        <thead className="bg-[#0b1220] text-white text-[7px] font-black uppercase tracking-tighter">
                          <tr className="border-b border-slate-700">
                            <th className="px-6 py-4 text-left border-r border-white/10">ATLETA</th>
                            <th className="px-2 py-4 border-r border-white/10">MIN</th>
                            <th className="px-2 py-4 border-r border-white/10">DIST (M)</th>
                            <th className="px-2 py-4 border-r border-white/10">M/MIN</th>
                            <th className="px-2 py-4 border-r border-white/10">HSR</th>
                            <th className="px-2 py-4 border-r border-white/10">AI</th>
                            <th className="px-2 py-4 border-r border-white/10">SPRINT</th>
                            <th className="px-2 py-4 border-r border-white/10">VEL MAX</th>
                            <th className="px-4 py-4 text-right">ACC/DECC</th>
                          </tr>
                        </thead>
                        <tbody className="text-[9px] font-mono font-black text-slate-900">
                          {chunk.map(({ player, stats }) => (
                            <tr key={player.id} className="border-b border-slate-200 h-10">
                              <td className="px-6 py-2 text-left border-r border-slate-200 font-sans italic truncate max-w-[150px] uppercase">{player.name}</td>
                              <td className="px-2 py-2 border-r border-slate-200">{stats ? stats.min.toFixed(0) : '0'}</td>
                              <td className="px-2 py-2 border-r border-slate-200">{stats ? stats.dist.toFixed(0) : '0'}</td>
                              <td className="px-2 py-2 border-r border-slate-200 text-red-600">{stats ? stats.mpm.toFixed(1) : '0.0'}</td>
                              <td className="px-2 py-2 border-r border-slate-200">{stats ? stats.hsr.toFixed(0) : '0'}</td>
                              <td className="px-2 py-2 border-r border-slate-200">{stats ? stats.ai.toFixed(0) : '0'}</td>
                              <td className="px-2 py-2 border-r border-slate-200 text-blue-600">{stats ? stats.sprint.toFixed(0) : '0'}</td>
                              <td className="px-2 py-2 border-r border-slate-200">{stats ? stats.vmax.toFixed(1) : '0.0'}</td>
                              <td className="px-4 py-2 text-right">{stats ? stats.acc.toFixed(1) : '0'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                  <PrintFooter page={currentPageNum} />
                </div>
              );
            })}

            {/* PÁGINA FINAL: TAREAS Y FIRMAS */}
            <div className="print-page-section print:p-12">
              {(() => { currentPageNum++; return null; })()}
              <PrintHeader 
                selectedDate={selectedDate} 
                selectedCategory={selectedCategories[0]} 
                activeMicrocycle={activeMicrocycle} 
                page={currentPageNum} 
                total={totalPages} 
              />
              <section className="mb-12">
                <h3 className="text-xs font-black text-slate-900 border-l-4 border-blue-500 pl-4 mb-6 uppercase tracking-widest italic">5. ANÁLISIS DE INTENSIDAD POR TAREA / BLOQUE</h3>
                <div className="border border-slate-900">
                  <table className="w-full text-center border-collapse">
                    <thead className="bg-[#0b1220] text-white text-[8px] font-black uppercase tracking-tighter">
                      <tr className="border-b border-slate-700">
                        <th className="px-6 py-4 text-left border-r border-white/10">TAREA</th>
                        <th className="px-4 py-4 border-r border-white/10">MINUTOS</th>
                        <th className="px-4 py-4 border-r border-white/10">DISTANCIA</th>
                        <th className="px-4 py-4 border-r border-white/10">INTENSIDAD (M/MIN)</th>
                        <th className="px-4 py-4 border-r border-white/10">HSR (&gt;20 KM/H)</th>
                        <th className="px-4 py-4 text-right">VEL MAX</th>
                      </tr>
                    </thead>
                    <tbody className="text-[10px] font-bold text-slate-900 italic uppercase">
                      {reportData.taskSummary.map((task, idx) => (
                        <tr key={idx} className="border-b border-slate-200 h-12">
                          <td className="px-6 py-2 text-left border-r border-slate-200 font-black">{task.name}</td>
                          <td className="px-4 py-2 border-r border-slate-200">{task.min.toFixed(0)}'</td>
                          <td className="px-4 py-2 border-r border-slate-200">{task.dist.toFixed(0)}m</td>
                          <td className="px-4 py-2 border-r border-slate-200">
                            <span className={`px-4 py-1 rounded text-[10px] font-black ${getIntensityStyle(task.mpm)}`}>
                              {task.mpm.toFixed(1)}
                            </span>
                          </td>
                          <td className="px-4 py-2 border-r border-slate-200">{task.hsr.toFixed(0)}m</td>
                          <td className="px-4 py-2 text-right font-black">{task.vmax.toFixed(1)} km/h</td>
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
            page-break-after: always !important;
            break-after: page !important;
            position: relative !important;
            min-height: 296mm !important;
            width: 210mm !important;
            margin: 0 auto !important;
            background: white !important;
            border: none !important;
            padding-top: 15mm !important;
            padding-bottom: 25mm !important;
            box-sizing: border-box !important;
          }

          .print-page-section:last-child { page-break-after: auto !important; break-after: auto !important; }
          
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

// Subcomponente de Encabezado para Impresión (Rediseñado FIFA-Style)
function PrintHeader({ selectedDate, selectedCategory, activeMicrocycle, page, total }: any) {
  const formatCategoryLabel = (idOrName: any) => {
    if (typeof idOrName === 'string' && isNaN(Number(idOrName))) return idOrName.toUpperCase().replace('_', ' ');
    const entry = Object.entries(CATEGORY_ID_MAP).find(([_, val]) => Number(val) === Number(idOrName));
    return entry ? entry[0].toUpperCase().replace('_', ' ') : 'N/A';
  };

  return (
    <div className="hidden print:block mb-8">
      <div className="flex justify-between items-center border-b-2 border-slate-900 pb-4">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 bg-slate-900 text-white flex items-center justify-center font-black text-2xl italic rounded-lg">LR</div>
          <div>
            <h1 className="text-lg font-black text-slate-900 leading-none uppercase tracking-tighter italic">REPORTE TÉCNICO DE RENDIMIENTO</h1>
            <p className="text-[7px] font-bold text-slate-500 uppercase tracking-[0.4em] mt-1">PERFORMANCE HUB • SELECCIÓN NACIONAL • ÁREA FÍSICA</p>
          </div>
        </div>
        <div className="bg-slate-50 p-3 rounded border border-slate-200 flex flex-col items-end min-w-[200px]">
           <span className="text-[7px] font-black text-slate-400 uppercase">Contexto de Proceso</span>
           <p className="text-[10px] font-black text-slate-900 uppercase italic tracking-tighter">FECHA: {selectedDate}</p>
           <p className="text-[9px] font-bold text-red-600 uppercase tracking-widest">CATEGORÍA: {formatCategoryLabel(selectedCategory)}</p>
        </div>
      </div>
      <div className="mt-3 flex justify-between items-center text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">
        <span>Sede: {activeMicrocycle?.city || 'SANTIAGO'} — {activeMicrocycle ? `Microciclo #${activeMicrocycle.id}` : 'SIN MICROCICLO'}</span>
        <span className="text-slate-900">HOJA {page} / {total}</span>
      </div>
    </div>
  );
}

function PrintFooter({ page }: { page: number }) {
  return (
    <div className="hidden print:block absolute bottom-8 left-8 right-8 border-t border-slate-100 pt-4">
      <div className="flex justify-between items-center">
        <p className="text-[7px] font-black text-slate-300 uppercase tracking-[0.3em]">Documento Confidencial • Área Física Selección Nacional • © 2026</p>
        <p className="text-[8px] font-black text-slate-900">Pág {page}</p>
      </div>
    </div>
  );
}

function KPIReportCard({ label, value, icon }: { label: string, value: string | number, icon: string }) {
  return (
    <div className="bg-white p-6 border border-slate-900 flex items-center gap-5 transition-all print:h-24">
      <div className="w-10 h-10 bg-slate-50 text-slate-900 rounded-lg flex items-center justify-center text-lg border border-slate-200">
        <i className={`fa-solid ${icon}`}></i>
      </div>
      <div>
        <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-2">{label}</p>
        <p className="text-lg font-black italic tracking-tighter text-slate-900">{value}</p>
      </div>
    </div>
  );
}
