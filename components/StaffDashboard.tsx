
import React, { useMemo, useState, useEffect, useRef } from 'react'
import { AthletePerformanceRecord, Category, CATEGORY_ID_MAP, CATEGORY_COLORS } from '../types'
import { supabase } from '../lib/supabase'
import CitacionesArea from './CitacionesArea'
import DesconvocatoriaArea from './DesconvocatoriaArea'
import TecnicaArea from './TecnicaArea'
import FisicaArea from './FisicaArea'
import CargaTareasArea from './CargaTareasArea'
import NutricionArea from './NutricionArea'
import MedicaArea from './MedicaArea'
import PlanificacionAnual from './PlanificacionAnual'
import UserManagementArea from './UserManagementArea'
import MatchManagementArea from './MatchManagementArea'
import NutricionResumenGrupal from './NutricionResumenGrupal'
import LogisticaJugadores from './LogisticaJugadores'
import ActivityLogArea from './ActivityLogArea'
import DataImportArea from './DataImportArea'
import VO2MaxArea from './VO2MaxArea'
import SportsScienceArea from './SportsScienceArea'
import ClubDashboard from './ClubDashboard'
import { logActivity } from '../lib/activityLogger'
import { getPerformanceInsights, getWeatherForecast, queryCoachAssistant, WeatherData } from '../services/geminiService'
import { AreaChart, Area, XAxis, ResponsiveContainer, Tooltip, BarChart, Bar, Cell, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts'

type MenuId = 'inicio' | 'planificacion_anual' | 'tecnica' | 'fisica_wellness' | 'fisica_pse' | 'fisica_carga_externa_total' | 'fisica_carga_externa_tareas' | 'fisica_reporte' | 'fisica_vo2max' | 'medica' | 'nutricion_resumen_grupal' | 'nutricion_comparativo' | 'nutricion_individual' | 'nutricion_top10' | 'nutricion_maduracion' | 'competencia' | 'citaciones' | 'desconvocatoria' | 'logistica_jugadores' | 'usuarios' | 'logs' | 'importar_datos' | 'sports_science';

interface StaffDashboardProps {
  performanceRecords: AthletePerformanceRecord[];
  activeMenu: MenuId;
  onMenuChange: (id: MenuId) => void;
  userClub?: string;
}

const StaffDashboard: React.FC<StaffDashboardProps> = ({ performanceRecords, activeMenu, onMenuChange, userClub }) => {
  const [realMicrocycles, setRealMicrocycles] = useState<any[]>([]);
  const [citData, setCitData] = useState<any[]>([]);
  const [dailyActivities, setDailyActivities] = useState<any[]>([]);
  const [activeTasks, setActiveTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [selectedJornada, setSelectedJornada] = useState<'AM' | 'PM'>('AM');
  
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const playerToCategory = useMemo(() => {
    const map = new Map();
    citData.forEach((c: any) => {
      const mc = realMicrocycles.find(m => m.id === c.microcycle_id);
      if (mc) {
        map.set(c.player_id, mc.category_id);
      }
    });
    return map;
  }, [citData, realMicrocycles]);

  const wellnessDataToday = useMemo(() => {
    return performanceRecords
      .map(r => {
        const todayW = r.wellness.find(w => w.date.substring(0, 10) === todayStr);
        if (!todayW) return null;
        return {
          ...todayW,
          id_del_jugador: r.player.id_del_jugador,
          players: r.player
        };
      })
      .filter((w): w is any => w !== null);
  }, [performanceRecords, todayStr]);

  const discomfortReports = useMemo(() => {
    const discomfort = wellnessDataToday.filter(w => 
      (w.soreness !== undefined && w.soreness < 5) || 
      (w.illness_symptoms && w.illness_symptoms.length > 0) || 
      (w.soreness_areas && w.soreness_areas.length > 0)
    );
    
    return discomfort.map(w => {
      const citedCat = playerToCategory.get(w.id_del_jugador);
      return { ...w, players: { ...w.players, category_id: citedCat } };
    });
  }, [wellnessDataToday, playerToCategory]);

  const pendingCheckins = useMemo(() => {
    const answeredIds = new Set(wellnessDataToday.map(w => w.id_del_jugador?.toString()));
    return performanceRecords
      .filter(r => r.player.id_del_jugador && playerToCategory.has(r.player.id_del_jugador))
      .filter(r => !answeredIds.has(r.player.id_del_jugador?.toString()))
      .map(r => ({
        ...r.player,
        category_id: playerToCategory.get(r.player.id_del_jugador)
      }));
  }, [performanceRecords, wellnessDataToday, playerToCategory]);

  const pendingCheckouts = useMemo(() => {
    const answeredIds = new Set();
    performanceRecords.forEach(r => {
      const todayL = r.loads.find(l => l.date === todayStr);
      if (todayL) answeredIds.add(r.player.id_del_jugador?.toString());
    });

    return performanceRecords
      .filter(r => r.player.id_del_jugador && playerToCategory.has(r.player.id_del_jugador))
      .filter(r => !answeredIds.has(r.player.id_del_jugador?.toString()))
      .map(r => ({
        ...r.player,
        category_id: playerToCategory.get(r.player.id_del_jugador)
      }));
  }, [performanceRecords, todayStr, playerToCategory]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      // 1. Fetch Microcycles
      const { data: mcData } = await supabase.from('microcycles').select('*');
      
      if (mcData) {
        setRealMicrocycles(mcData);
        const active = mcData.filter(m => todayStr >= m.start_date.substring(0, 10) && todayStr <= m.end_date.substring(0, 10));
        
        if (active.length > 0) {
          setLoadingTasks(true);
          const { data: tasksData } = await supabase
            .from('tareas_semanales')
            .select('*')
            .in('id_microcycles', active.map(m => m.id))
            .eq('fecha', todayStr);
          
          if (tasksData) {
            setActiveTasks(tasksData);
          }
          setLoadingTasks(false);
        } else {
          setActiveTasks([]);
        }
      }

      // 2. Fetch Citaciones for pending logic
      const activeMcIds = (mcData || [])
        .filter(m => todayStr >= m.start_date.substring(0, 10) && todayStr <= m.end_date.substring(0, 10))
        .map(m => m.id);
      
      if (activeMcIds.length > 0) {
        const { data: citRes } = await supabase
          .from('citaciones')
          .select('player_id, microcycle_id')
          .in('microcycle_id', activeMcIds);
        
        if (citRes) setCitData(citRes);
      }

      // 3. Fetch Weekly Activities (Cronograma from Area Tecnica)
      if (activeMcIds.length > 0) {
        const { data: activities } = await supabase
          .from('cronograma_semanal')
          .select('*')
          .in('id_microcycles', activeMcIds)
          .order('fecha', { ascending: true })
          .order('hora', { ascending: true });
        
        if (activities) {
          setDailyActivities(activities);
        }
      } else {
        setDailyActivities([]);
      }
    };

    if (activeMenu === 'inicio') {
      fetchDashboardData();
    }
  }, [activeMenu, todayStr]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleGenerateAiInsight = async () => {
    setLoadingAi(true);
    const insight = await getPerformanceInsights(performanceRecords);
    setAiInsight(insight);
    logActivity('Generación AI Insight Global');
    setLoadingAi(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    const userMsg = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    const aiResponse = await queryCoachAssistant(userMsg, performanceRecords);
    setChatMessages(prev => [...prev, { role: 'ai', text: aiResponse }]);
    logActivity('Consulta Coach Assistant (IA)', { query: userMsg });
    setIsTyping(false);
  };

  const filteredTasks = useMemo(() => {
    let tasks = activeTasks;
    if (selectedCategoryId) {
      tasks = tasks.filter(t => {
        const mc = realMicrocycles.find(m => m.id === t.id_microcycles);
        return mc && mc.category_id === selectedCategoryId;
      });
    }
    return tasks.filter(t => (t.jornada || 'AM') === selectedJornada);
  }, [activeTasks, selectedCategoryId, realMicrocycles, selectedJornada]);

  const filteredPending = useMemo(() => {
    if (!selectedCategoryId) return pendingCheckins;
    return pendingCheckins.filter(p => p.category_id === selectedCategoryId);
  }, [pendingCheckins, selectedCategoryId]);

  const filteredDiscomfort = useMemo(() => {
    if (!selectedCategoryId) return discomfortReports;
    return discomfortReports.filter(w => w.players?.category_id === selectedCategoryId);
  }, [discomfortReports, selectedCategoryId]);

  const filteredCheckouts = useMemo(() => {
    if (!selectedCategoryId) return pendingCheckouts;
    return pendingCheckouts.filter(p => p.category_id === selectedCategoryId);
  }, [pendingCheckouts, selectedCategoryId]);

  const filteredActivities = useMemo(() => {
    if (!selectedCategoryId) return dailyActivities;
    return dailyActivities.filter(a => a.id_categoria === selectedCategoryId);
  }, [dailyActivities, selectedCategoryId]);

  const renderContent = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const activeMicrocycles = realMicrocycles.filter(m => todayStr >= m.start_date.substring(0, 10) && todayStr <= m.end_date.substring(0, 10));

    switch (activeMenu) {
      case 'inicio':
        return (
          <div className="space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 transform-gpu">
            {/* HERO DYNAMICO "CONCENTRATION MODE" */}
            <div className="relative bg-[#0b1220] rounded-[32px] md:rounded-[56px] p-6 md:p-12 overflow-hidden shadow-2xl border border-white/5 transform-gpu group">
              <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-red-600/20 to-transparent"></div>
              <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px]"></div>
              
              <div className="relative z-10 flex flex-col lg:flex-row justify-between items-end gap-8 md:gap-12">
                <div className="max-w-2xl">
                  <div className="flex items-center gap-3 mb-4 md:mb-6">
                    <span className="bg-red-600 text-white px-3 md:px-4 py-1 md:py-1.5 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-red-900/40">
                      LIVE DASHBOARD
                    </span>
                    <span className="text-slate-500 text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em]">SISTEMA CENTRALIZADO DE ÉLITE</span>
                  </div>
                  <h1 className="text-white text-4xl md:text-6xl font-black italic tracking-tighter uppercase leading-[0.85] mb-6 md:mb-10">
                    DASHBOARD <br/>
                    <span className="text-red-600">SELECCIONES JUVENILES DE CHILE</span>
                  </h1>
                </div>

                <div className="w-full lg:w-80 bg-white/5 backdrop-blur-md border border-white/10 rounded-[32px] md:rounded-[40px] p-6 md:p-8 space-y-4 md:space-y-6">
                   <div className="flex items-center justify-between border-b border-white/5 pb-3 md:pb-4">
                     <p className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest">Series Activas</p>
                     {selectedCategoryId && (
                       <button 
                         onClick={() => setSelectedCategoryId(null)}
                         className="text-[8px] font-black text-red-500 uppercase tracking-widest hover:text-white transition-colors"
                       >
                         Limpiar Filtro
                       </button>
                     )}
                   </div>
                   <div className="space-y-2">
                     {activeMicrocycles.length === 0 ? (
                       <p className="text-slate-400 text-xs italic">No hay microciclos activos hoy.</p>
                     ) : (
                       activeMicrocycles.map((mc, idx) => {
                         const categoryEntry = Object.entries(CATEGORY_ID_MAP).find(([_, val]) => val === mc.category_id);
                         const categoryLabel = categoryEntry ? categoryEntry[0].replace('_', ' ').toUpperCase() : 'Selección';
                         const isActive = selectedCategoryId === mc.category_id;
                         
                         return (
                           <div 
                             key={idx} 
                             onClick={() => setSelectedCategoryId(isActive ? null : mc.category_id)}
                             className={`flex items-center justify-between group/mc cursor-pointer p-3 rounded-2xl transition-all border ${isActive ? 'bg-red-600/20 border-red-500/50 shadow-[0_0_15px_rgba(220,38,38,0.2)]' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                           >
                             <div>
                               <div className="flex items-center gap-2 mb-1">
                                 <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest ${isActive ? 'bg-red-600 text-white' : 'bg-red-600/20 text-red-500'}`}>
                                   {categoryLabel}
                                 </span>
                                 <p className="text-white text-sm font-black italic tracking-tighter leading-none uppercase">{mc.name}</p>
                               </div>
                               <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{mc.city}, {mc.country}</p>
                             </div>
                             <div className={`w-2 h-2 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)] ${isActive ? 'bg-white animate-ping' : 'bg-emerald-500 animate-pulse'}`}></div>
                           </div>
                         );
                       })
                     )}
                   </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {/* Tareas de la Categoría */}
              <div className="bg-white rounded-[32px] md:rounded-[48px] p-6 md:p-10 border border-slate-100 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-6 md:mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-600/20 flex items-center justify-center text-red-500">
                      <i className="fa-solid fa-list-check text-xs"></i>
                    </div>
                    <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] italic">Tareas de la Categoría</h3>
                  </div>
                  
                  <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button 
                      onClick={() => setSelectedJornada('AM')}
                      className={`px-3 py-1 rounded-md text-[7px] font-black uppercase tracking-widest transition-all ${selectedJornada === 'AM' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400'}`}
                    >
                      AM
                    </button>
                    <button 
                      onClick={() => setSelectedJornada('PM')}
                      className={`px-3 py-1 rounded-md text-[7px] font-black uppercase tracking-widest transition-all ${selectedJornada === 'PM' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400'}`}
                    >
                      PM
                    </button>
                  </div>

                  <button 
                    onClick={() => onMenuChange('fisica_carga_externa_tareas')}
                    className="text-[9px] font-black text-red-500 uppercase tracking-widest hover:text-slate-900 transition-colors flex items-center gap-1"
                  >
                    Gestionar <i className="fa-solid fa-chevron-right text-[7px]"></i>
                  </button>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar pr-2 max-h-[300px]">
                  {loadingTasks ? (
                    <div className="flex items-center justify-center h-full py-10">
                      <i className="fa-solid fa-spinner fa-spin text-slate-200"></i>
                    </div>
                  ) : filteredTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-10">
                      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest italic">Sin tareas adjuntas</p>
                    </div>
                  ) : (
                    filteredTasks.map((task, idx) => (
                      <div key={idx} className="bg-slate-50 rounded-xl p-4 border border-slate-100 group hover:bg-slate-100 transition-all">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] font-black text-red-500 uppercase tracking-widest">{task.dinamica}</span>
                            <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest bg-slate-200 px-1.5 py-0.5 rounded-md">
                              {task.jornada || 'AM'}
                            </span>
                          </div>
                          <i className="fa-solid fa-futbol text-[8px] text-slate-200 group-hover:text-slate-400 transition-colors"></i>
                        </div>
                        <p className="text-slate-900 text-[11px] font-black italic uppercase tracking-tight leading-none">{task.nombre}</p>
                        {task.observacion && (
                          <p className="text-slate-500 text-[9px] font-medium mt-2 line-clamp-2">{task.observacion}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* PENDIENTES CHECK-IN */}
              <div className="bg-white rounded-[32px] md:rounded-[48px] p-6 md:p-10 border border-slate-100 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-6 md:mb-8">
                  <h3 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-[0.2em] italic">Check-in Pendiente</h3>
                  <span className="bg-amber-100 text-amber-600 px-2.5 md:px-3 py-1 rounded-full text-[8px] md:text-[9px] font-black">{filteredPending.length} JUGADORES</span>
                </div>
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                  {filteredPending.length === 0 ? (
                    <div className="text-center py-10">
                      <i className="fa-solid fa-circle-check text-emerald-500 text-3xl mb-3"></i>
                      <p className="text-slate-400 text-[10px] font-black uppercase">Todo al día</p>
                    </div>
                  ) : (
                    filteredPending.map((p, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-slate-400 font-black italic text-[10px] border border-slate-100 overflow-hidden">
                            {p.foto_url ? <img src={p.foto_url} alt="" className="w-full h-full object-cover" /> : p.nombre.charAt(0)}
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase text-slate-900 italic tracking-tight">{p.nombre} {p.apellido1}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{p.posicion}</p>
                          </div>
                        </div>
                        <button className="text-amber-500 hover:scale-110 transition-transform"><i className="fa-solid fa-bell"></i></button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* PENDIENTES CHECK-OUT */}
              <div className="bg-white rounded-[32px] md:rounded-[48px] p-6 md:p-10 border border-slate-100 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-6 md:mb-8">
                  <h3 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-[0.2em] italic">Check-out Pendiente</h3>
                  <span className="bg-blue-100 text-blue-600 px-2.5 md:px-3 py-1 rounded-full text-[8px] md:text-[9px] font-black">{filteredCheckouts.length} JUGADORES</span>
                </div>
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                  {filteredCheckouts.length === 0 ? (
                    <div className="text-center py-10">
                      <i className="fa-solid fa-circle-check text-emerald-500 text-3xl mb-3"></i>
                      <p className="text-slate-400 text-[10px] font-black uppercase">Todo al día</p>
                    </div>
                  ) : (
                    filteredCheckouts.map((p, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-slate-400 font-black italic text-[10px] border border-slate-100 overflow-hidden">
                            {p.foto_url ? <img src={p.foto_url} alt="" className="w-full h-full object-cover" /> : p.nombre.charAt(0)}
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase text-slate-900 italic tracking-tight">{p.nombre} {p.apellido1}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{p.posicion}</p>
                          </div>
                        </div>
                        <button className="text-blue-500 hover:scale-110 transition-transform"><i className="fa-solid fa-bell"></i></button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* ALERTAS DE MOLESTIAS */}
              <div className="bg-white rounded-[32px] md:rounded-[48px] p-6 md:p-10 border border-red-100 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-6 md:mb-8">
                  <h3 className="text-xs md:text-sm font-black text-red-600 uppercase tracking-[0.2em] italic">Molestias Reportadas</h3>
                  <span className={`px-2.5 md:px-3 py-1 rounded-full text-[8px] md:text-[9px] font-black ${filteredDiscomfort.length > 0 ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
                    {filteredDiscomfort.length} ALERTAS
                  </span>
                </div>
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                  {filteredDiscomfort.length === 0 ? (
                    <div className="text-center py-10">
                      <i className="fa-solid fa-heart-pulse text-slate-200 text-3xl mb-3"></i>
                      <p className="text-slate-400 text-[10px] font-black uppercase">Sin alertas hoy</p>
                    </div>
                  ) : (
                    filteredDiscomfort.map((w, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-red-50 rounded-2xl border border-red-100">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-red-600 font-black italic text-[10px] border border-red-100 overflow-hidden">
                            {w.players?.foto_url ? <img src={w.players.foto_url} alt="" className="w-full h-full object-cover" /> : w.players?.nombre.charAt(0)}
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase text-slate-900 italic tracking-tight">{w.players?.nombre} {w.players?.apellido1}</p>
                            <p className="text-[8px] font-bold text-red-500 uppercase tracking-widest">
                              {w.illness_symptoms && w.illness_symptoms.length > 0 ? `Enfermedad: ${w.illness_symptoms.join(', ')}` : `Estado: ${w.soreness}/5 • ${w.soreness_areas?.join(', ') || 'Sin molestias'}`}
                            </p>
                          </div>
                        </div>
                        <button onClick={() => onMenuChange('medica')} className="text-red-600 hover:scale-110 transition-transform"><i className="fa-solid fa-suitcase-medical"></i></button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* CRONOGRAMA DEL DÍA */}
              <div className="bg-white rounded-[32px] md:rounded-[48px] p-6 md:p-10 border border-slate-100 shadow-sm flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                <div className="flex items-center justify-between mb-6 md:mb-8 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-600/20 flex items-center justify-center text-red-500">
                      <i className="fa-solid fa-calendar-day text-xs"></i>
                    </div>
                    <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] italic">Cronograma Semanal</h3>
                  </div>
                  <button 
                    onClick={() => onMenuChange('planificacion_anual')}
                    className="text-[9px] font-black text-red-500 uppercase tracking-widest hover:text-slate-900 transition-colors flex items-center gap-1"
                  >
                    Ver Todo <i className="fa-solid fa-chevron-right text-[7px]"></i>
                  </button>
                </div>
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar relative z-10">
                  {filteredActivities.length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-slate-400 text-[10px] font-black uppercase">Sin actividades programadas</p>
                    </div>
                  ) : (
                    filteredActivities.map((act, i) => {
                      const actDate = new Date(act.fecha + 'T12:00:00');
                      const isToday = act.fecha === new Date().toISOString().split('T')[0];
                      
                      return (
                        <div key={i} className={`flex items-center gap-4 p-3 rounded-2xl border transition-all group ${isToday ? 'bg-red-50 border-red-100 shadow-sm' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'}`}>
                          <div className={`flex flex-col items-center justify-center min-w-[50px] py-1 border-r ${isToday ? 'border-red-200' : 'border-slate-200'}`}>
                            <p className={`text-[10px] font-black leading-none ${isToday ? 'text-red-600' : 'text-slate-900'}`}>{act.hora?.substring(0, 5)}</p>
                            <p className="text-[7px] font-bold text-slate-400 uppercase mt-1">
                              {actDate.toLocaleDateString('es-ES', { weekday: 'short' })}
                            </p>
                          </div>
                          <div className="flex-1">
                            <p className={`text-[10px] font-black uppercase italic tracking-tight leading-none mb-1 ${isToday ? 'text-red-700' : 'text-slate-900'}`}>{act.actividad}</p>
                            <div className="flex items-center gap-2">
                              <i className={`fa-solid fa-location-dot text-[8px] ${isToday ? 'text-red-500' : 'text-slate-400'}`}></i>
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest truncate">{act.lugar || 'Juan Pinto Durán'}</p>
                            </div>
                          </div>
                          {act.id_categoria && (
                            <span className={`text-[7px] font-black px-1.5 py-0.5 rounded uppercase ${isToday ? 'bg-red-600 text-white' : 'bg-red-600/10 text-red-600'}`}>
                              {Object.entries(CATEGORY_ID_MAP).find(([_, val]) => val === act.id_categoria)?.[0].replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* CHATBOT FLOATING */}
            <div className={`fixed bottom-4 md:bottom-8 right-4 md:right-8 z-[300] flex flex-col items-end gap-4 print:hidden`}>
              {chatOpen && (
                <div className="w-[calc(100vw-32px)] md:w-96 h-[450px] md:h-[550px] bg-white rounded-[32px] md:rounded-[48px] shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 transform-gpu">
                  <div className="bg-[#0b1220] p-6 md:p-8 flex items-center justify-between text-white relative">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/10 rounded-full blur-2xl -mr-12 -mt-12"></div>
                    <div className="flex items-center gap-3 md:gap-4 relative z-10">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-red-600 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg"><i className="fa-solid fa-robot text-lg md:text-xl"></i></div>
                      <div>
                        <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest leading-none mb-1 opacity-50">Inteligencia</p>
                        <p className="text-base md:text-lg font-black italic uppercase tracking-tighter">Coach Assistant</p>
                      </div>
                    </div>
                    <button onClick={() => setChatOpen(false)} className="text-white/30 hover:text-white transition-colors"><i className="fa-solid fa-xmark text-lg md:text-xl"></i></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-4 md:space-y-6 custom-scrollbar bg-slate-50/50">
                    {chatMessages.length === 0 && (
                      <div className="text-center py-12 md:py-20">
                        <div className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-sm border border-slate-100 text-slate-200">
                          <i className="fa-solid fa-message text-xl md:text-2xl"></i>
                        </div>
                        <p className="text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest italic">¿Tienes dudas sobre la carga de hoy?</p>
                      </div>
                    )}
                    {chatMessages.map((m, i) => (
                      <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[90%] md:max-w-[85%] p-4 md:p-5 rounded-2xl md:rounded-[28px] text-[11px] md:text-xs font-medium leading-relaxed shadow-sm ${m.role === 'user' ? 'bg-[#0b1220] text-white rounded-br-none' : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'}`}>
                          {m.text}
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef}></div>
                  </div>
                  <form onSubmit={handleSendMessage} className="p-4 md:p-8 bg-white border-t border-slate-50 flex gap-2 md:gap-3">
                    <input 
                      type="text" 
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      placeholder="Consultar..."
                      className="flex-1 bg-slate-50 border-none rounded-xl md:rounded-[24px] px-4 md:px-6 py-3 md:py-4 text-[11px] md:text-xs font-bold outline-none focus:ring-2 focus:ring-red-500 shadow-inner"
                    />
                    <button type="submit" className="w-12 h-12 md:w-14 md:h-14 bg-red-600 text-white rounded-xl md:rounded-2xl flex items-center justify-center hover:bg-red-700 transition-all shadow-xl active:scale-95 transform-gpu"><i className="fa-solid fa-paper-plane text-sm md:text-base"></i></button>
                  </form>
                </div>
              )}
              <button 
                onClick={() => setChatOpen(!chatOpen)}
                className="w-16 h-16 md:w-20 md:h-20 bg-[#0b1220] text-white rounded-2xl md:rounded-[32px] flex items-center justify-center text-2xl md:text-3xl shadow-2xl hover:bg-red-600 transition-all hover:scale-110 transform-gpu group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-red-600 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                <i className={`fa-solid ${chatOpen ? 'fa-xmark' : 'fa-robot'} relative z-10`}></i>
              </button>
            </div>
          </div>
        );
      case 'fisica_wellness':
        return <FisicaArea performanceRecords={performanceRecords} view="wellness" />;
      case 'fisica_pse':
        return <FisicaArea performanceRecords={performanceRecords} view="pse" />;
      case 'fisica_carga_externa_total':
        return <FisicaArea performanceRecords={performanceRecords} view="external_total" />;
      case 'fisica_carga_externa_tareas':
        return <CargaTareasArea />;
      case 'fisica_reporte':
        return <FisicaArea performanceRecords={performanceRecords} view="report" />;
      case 'fisica_vo2max':
        return <VO2MaxArea />;
      case 'nutricion_resumen_grupal':
        return <NutricionResumenGrupal performanceRecords={performanceRecords} />;
      case 'nutricion_comparativo':
        return <NutricionArea performanceRecords={performanceRecords} initialTab="general" />;
      case 'nutricion_individual':
        return <NutricionArea performanceRecords={performanceRecords} initialTab="individual" />;
      case 'nutricion_top10':
        return <NutricionArea performanceRecords={performanceRecords} initialTab="top10" />;
      case 'nutricion_maduracion':
        return <NutricionArea performanceRecords={performanceRecords} initialTab="crecimiento" />;
      case 'logistica_jugadores':
        return <LogisticaJugadores />;
      case 'logs':
        return <ActivityLogArea />;
      case 'importar_datos':
        return <DataImportArea />;
      case 'sports_science':
        return <SportsScienceArea />;
      default:
        const ContentComponent = {
          planificacion_anual: PlanificacionAnual,
          tecnica: TecnicaArea,
          medica: MedicaArea,
          competencia: MatchManagementArea,
          citaciones: CitacionesArea,
          desconvocatoria: DesconvocatoriaArea,
          usuarios: UserManagementArea
        }[activeMenu as any] as any;
        
        return ContentComponent ? <ContentComponent performanceRecords={performanceRecords} onMenuChange={onMenuChange} /> : null;
    }
  };

  return <div className="max-w-7xl mx-auto">{renderContent()}</div>
}

function HeaderStat({ label, value, icon }: { label: string, value: string | number, icon: string }) {
  return (
    <div className="bg-white/5 rounded-2xl md:rounded-[32px] p-4 md:p-6 border border-white/5 flex flex-col items-center text-center transition-all hover:bg-white/10 group transform-gpu shadow-inner">
      <div className="text-white/20 text-base md:text-lg mb-2 md:mb-3 group-hover:text-red-500 transition-colors group-hover:scale-110 duration-300"><i className={`fa-solid ${icon}`}></i></div>
      <div className="text-[8px] md:text-[9px] font-black text-white/30 uppercase tracking-[0.3em] mb-1.5 md:mb-2">{label}</div>
      <div className={`text-xl md:text-3xl font-black text-white tracking-tighter italic leading-none`}>{value}</div>
    </div>
  )
}

export default StaffDashboard;
