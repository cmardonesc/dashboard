
import React, { useMemo, useState, useEffect, useRef } from 'react'
import { AthletePerformanceRecord, Category, CATEGORY_ID_MAP, CATEGORY_COLORS } from '../types'
import { supabase } from '../lib/supabase'
import ClubBadge from './ClubBadge'
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
import { Reorder } from 'framer-motion'

type MenuId = 'inicio' | 'planificacion_anual' | 'tecnica' | 'fisica_wellness' | 'fisica_pse' | 'fisica_carga_externa_total' | 'fisica_carga_externa_tareas' | 'fisica_reporte' | 'fisica_vo2max' | 'medica' | 'nutricion_resumen_grupal' | 'nutricion_comparativo' | 'nutricion_individual' | 'nutricion_top10' | 'nutricion_maduracion' | 'competencia' | 'citaciones' | 'desconvocatoria' | 'logistica_jugadores' | 'usuarios' | 'logs' | 'importar_datos' | 'sports_science';

interface StaffDashboardProps {
  performanceRecords: AthletePerformanceRecord[];
  activeMenu: MenuId;
  onMenuChange: (id: MenuId) => void;
  userClub?: string;
  userRole?: string;
  userId_del_jugador?: number | null;
  clubs?: any[];
}

const StaffDashboard: React.FC<StaffDashboardProps> = ({ performanceRecords, activeMenu, onMenuChange, userClub, userRole, userId_del_jugador, clubs = [] }) => {
  const [realMicrocycles, setRealMicrocycles] = useState<any[]>([]);
  const [citData, setCitData] = useState<any[]>([]);
  const [dailyActivities, setDailyActivities] = useState<any[]>([]);
  const [medicalReportsToday, setMedicalReportsToday] = useState<any[]>([]);
  const [kinesicTreatmentsToday, setKinesicTreatmentsToday] = useState<any[]>([]);
  const [activeTasks, setActiveTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [selectedJornada, setSelectedJornada] = useState<'AM' | 'PM'>('AM');
  
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [visibleWidgets, setVisibleWidgets] = useState<string[]>(() => {
    const saved = localStorage.getItem('visibleWidgets');
    return saved ? JSON.parse(saved) : ['weather', 'tasks', 'checkin', 'discomfort', 'schedule', 'ai_summary'];
  });

  useEffect(() => {
    localStorage.setItem('visibleWidgets', JSON.stringify(visibleWidgets));
  }, [visibleWidgets]);

  const availableWidgets = [
    { id: 'weather', label: 'Clima en Complejo', icon: 'fa-cloud-sun', description: 'Estado del tiempo y pronóstico para el entrenamiento.' },
    { id: 'ai_summary', label: 'Resumen IA', icon: 'fa-sparkles', description: 'Insights clave generados por inteligencia artificial.' },
    { id: 'tasks', label: 'Tareas del Día', icon: 'fa-list-check', description: 'Listado de tareas técnicas y físicas programadas.' },
    { id: 'checkin', label: 'Check-in', icon: 'fa-user-check', description: 'Seguimiento de reportes de bienestar matutinos.' },
    { id: 'checkout', label: 'Check-out', icon: 'fa-user-clock', description: 'Seguimiento de reportes de carga post-sesión.' },
    { id: 'discomfort', label: 'Alertas Médicas', icon: 'fa-heart-pulse', description: 'Reportes de molestias y síntomas de jugadores.' },
    { id: 'schedule', label: 'Cronograma', icon: 'fa-calendar-day', description: 'Actividades y horarios de la semana.' },
    { id: 'medical', label: 'Atenciones Médicas', icon: 'fa-user-md', description: 'Registro de atenciones del cuerpo médico.' },
    { id: 'kinesic', label: 'Kinesiología', icon: 'fa-hand-holding-medical', description: 'Tratamientos y recuperaciones kinésicas.' },
    { id: 'quick_stats', label: 'Estado de Carga', icon: 'fa-chart-simple', description: 'Resumen visual del cumplimiento de la jornada.' },
  ];

  const toggleWidget = (id: string) => {
    setVisibleWidgets(prev => 
      prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]
    );
  };

  const moveWidget = (id: string, direction: 'up' | 'down') => {
    const index = visibleWidgets.indexOf(id);
    if (index === -1) return;
    const newWidgets = [...visibleWidgets];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newWidgets.length) return;
    [newWidgets[index], newWidgets[newIndex]] = [newWidgets[newIndex], newWidgets[index]];
    setVisibleWidgets(newWidgets);
  };

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

      // 4. Fetch Medical and Kinesic data
      const { data: medData } = await supabase
        .from('medical_daily_reports')
        .select('*, players(nombre, apellido1)')
        .eq('report_date', todayStr);
      if (medData) setMedicalReportsToday(medData);

      const { data: kinData } = await supabase
        .from('medical_treatments')
        .select('*, players(nombre, apellido1)')
        .eq('treatment_date', todayStr);
      if (kinData) setKinesicTreatmentsToday(kinData);

      // 5. Fetch Weather
      try {
        const weatherRes = await getWeatherForecast('Santiago', 'Chile');
        if (weatherRes.data) setWeather(weatherRes.data);
      } catch (e) {
        console.error('Error fetching weather:', e);
      }

      // 6. Generate AI Insight if not present
      if (!aiInsight && performanceRecords.length > 0) {
        handleGenerateAiInsight();
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
    return activeTasks.filter(t => (t.jornada || 'AM') === selectedJornada);
  }, [activeTasks, selectedJornada]);

  const filteredPending = useMemo(() => {
    return pendingCheckins;
  }, [pendingCheckins]);

  const filteredDiscomfort = useMemo(() => {
    return discomfortReports;
  }, [discomfortReports]);

  const filteredCheckouts = useMemo(() => {
    return pendingCheckouts;
  }, [pendingCheckouts]);

  const filteredActivities = useMemo(() => {
    return dailyActivities;
  }, [dailyActivities]);

  const filteredMedical = useMemo(() => {
    return medicalReportsToday;
  }, [medicalReportsToday]);

  const filteredKinesic = useMemo(() => {
    return kinesicTreatmentsToday;
  }, [kinesicTreatmentsToday]);

  const renderContent = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const activeMicrocycles = realMicrocycles.filter(m => todayStr >= m.start_date.substring(0, 10) && todayStr <= m.end_date.substring(0, 10));

    const widgetMap: Record<string, React.ReactNode> = {
      weather: (
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-[32px] md:rounded-[48px] p-6 md:p-8 text-white shadow-lg shadow-blue-500/20 flex flex-col h-full relative overflow-hidden animate-in fade-in zoom-in-95 duration-500">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-location-dot text-[10px] opacity-70"></i>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Juan Pinto Durán</p>
            </div>
            <i className="fa-solid fa-cloud-sun text-xl"></i>
          </div>
          
          <div className="flex-1 flex flex-col justify-center relative z-10">
            <div className="flex items-end gap-2 mb-1">
              <h2 className="text-4xl font-black italic leading-none">{weather?.currentTemp || '--'}°</h2>
              <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-80">{weather?.condition || 'Despejado'}</p>
            </div>
            <p className="text-[10px] font-medium opacity-70">Humedad: {weather?.humidity || '--'} • Viento: {weather?.wind || '--'}</p>
          </div>

          <div className="mt-4 pt-4 border-t border-white/10 flex justify-between relative z-10">
            <div className="text-center">
              <p className="text-[8px] font-black uppercase opacity-60 mb-1">Mañana</p>
              <p className="text-[10px] font-bold">14°</p>
            </div>
            <div className="text-center">
              <p className="text-[8px] font-black uppercase opacity-60 mb-1">Tarde</p>
              <p className="text-[10px] font-bold">26°</p>
            </div>
            <div className="text-center">
              <p className="text-[8px] font-black uppercase opacity-60 mb-1">Noche</p>
              <p className="text-[10px] font-bold">18°</p>
            </div>
          </div>
        </div>
      ),
      ai_summary: (
        <div className="bg-[#0b1220] rounded-[32px] md:rounded-[48px] p-6 md:p-8 text-white border border-white/5 shadow-2xl flex flex-col h-full relative overflow-hidden animate-in fade-in zoom-in-95 duration-500">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="w-8 h-8 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-900/40">
              <i className="fa-solid fa-sparkles text-xs"></i>
            </div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] italic">AI Insight Diario</h3>
          </div>
          
          <div className="flex-1 relative z-10">
            {loadingAi ? (
              <div className="flex items-center gap-3 py-4">
                <i className="fa-solid fa-spinner fa-spin text-red-500"></i>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 animate-pulse">Analizando datos...</p>
              </div>
            ) : aiInsight ? (
              <p className="text-[11px] font-medium leading-relaxed text-slate-300 italic line-clamp-5">
                "{aiInsight.split('.')[0]}."
              </p>
            ) : (
              <button 
                onClick={(e) => { e.stopPropagation(); handleGenerateAiInsight(); }}
                className="w-full py-4 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all"
              >
                Generar Resumen
              </button>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between relative z-10">
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Gemini 3.1 Pro</span>
            <button 
              onClick={(e) => { e.stopPropagation(); setChatOpen(true); }}
              className="text-[9px] font-black text-red-500 uppercase tracking-widest hover:text-white transition-colors"
            >
              Consultar <i className="fa-solid fa-chevron-right text-[7px] ml-1"></i>
            </button>
          </div>
        </div>
      ),
      quick_stats: (
        <div className="bg-white rounded-[32px] md:rounded-[48px] p-6 md:p-8 border border-slate-100 shadow-sm flex flex-col h-full animate-in fade-in zoom-in-95 duration-500">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] italic">Estado de Carga</h3>
            <i className="fa-solid fa-chart-simple text-slate-200"></i>
          </div>
          
          <div className="flex-1 grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-3xl p-4 border border-slate-100 flex flex-col justify-center">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Check-in</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black italic text-slate-900">
                  {performanceRecords.length > 0 ? Math.round(((performanceRecords.length - filteredPending.length) / performanceRecords.length) * 100) : 0}%
                </span>
              </div>
              <div className="w-full h-1 bg-slate-200 rounded-full mt-2 overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-1000" 
                  style={{ width: `${performanceRecords.length > 0 ? ((performanceRecords.length - filteredPending.length) / performanceRecords.length) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-3xl p-4 border border-slate-100 flex flex-col justify-center">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Check-out</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black italic text-slate-900">
                  {performanceRecords.length > 0 ? Math.round(((performanceRecords.length - filteredCheckouts.length) / performanceRecords.length) * 100) : 0}%
                </span>
              </div>
              <div className="w-full h-1 bg-slate-200 rounded-full mt-2 overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-1000" 
                  style={{ width: `${performanceRecords.length > 0 ? ((performanceRecords.length - filteredCheckouts.length) / performanceRecords.length) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2">
            <div className="flex -space-x-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[8px] font-black text-slate-400">
                  <i className="fa-solid fa-user"></i>
                </div>
              ))}
            </div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              {performanceRecords.length - filteredPending.length} reportes hoy
            </p>
          </div>
        </div>
      ),
      tasks: (
        <div className="bg-white rounded-[32px] md:rounded-[48px] p-6 md:p-10 border border-slate-100 shadow-sm flex flex-col h-full animate-in fade-in zoom-in-95 duration-500">
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-600/20 flex items-center justify-center text-red-500">
                <i className="fa-solid fa-list-check text-xs"></i>
              </div>
              <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] italic">Tareas de la Categoría</h3>
            </div>
            
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button 
                onClick={(e) => { e.stopPropagation(); setSelectedJornada('AM'); }}
                className={`px-3 py-1 rounded-md text-[7px] font-black uppercase tracking-widest transition-all ${selectedJornada === 'AM' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400'}`}
              >
                AM
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setSelectedJornada('PM'); }}
                className={`px-3 py-1 rounded-md text-[7px] font-black uppercase tracking-widest transition-all ${selectedJornada === 'PM' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400'}`}
              >
                PM
              </button>
            </div>

            <button 
              onClick={(e) => { e.stopPropagation(); onMenuChange('fisica_carga_externa_tareas'); }}
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
      ),
      checkin: (
        <div className="bg-white rounded-[32px] md:rounded-[48px] p-6 md:p-10 border border-slate-100 shadow-sm flex flex-col h-full animate-in fade-in zoom-in-95 duration-500">
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
                      {p.foto_url ? <img src={p.foto_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : p.nombre?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-900 italic tracking-tight">{p.nombre} {p.apellido1}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{p.posicion}</p>
                        <ClubBadge clubName={p.club} clubs={clubs} logoSize="w-3 h-3" className="text-[8px] font-bold text-slate-400 uppercase tracking-widest" />
                      </div>
                    </div>
                  </div>
                  <button onClick={(e) => e.stopPropagation()} className="text-amber-500 hover:scale-110 transition-transform"><i className="fa-solid fa-bell"></i></button>
                </div>
              ))
            )}
          </div>
        </div>
      ),
      checkout: (
        <div className="bg-white rounded-[32px] md:rounded-[48px] p-6 md:p-10 border border-slate-100 shadow-sm flex flex-col h-full animate-in fade-in zoom-in-95 duration-500">
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
                      {p.foto_url ? <img src={p.foto_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : p.nombre?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-900 italic tracking-tight">{p.nombre} {p.apellido1}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{p.posicion}</p>
                        <ClubBadge clubName={p.club} clubs={clubs} logoSize="w-3 h-3" className="text-[8px] font-bold text-slate-400 uppercase tracking-widest" />
                      </div>
                    </div>
                  </div>
                  <button onClick={(e) => e.stopPropagation()} className="text-blue-500 hover:scale-110 transition-transform"><i className="fa-solid fa-bell"></i></button>
                </div>
              ))
            )}
          </div>
        </div>
      ),
      discomfort: (
        <div className="bg-white rounded-[32px] md:rounded-[48px] p-6 md:p-10 border border-red-100 shadow-sm flex flex-col h-full animate-in fade-in zoom-in-95 duration-500">
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
                      {w.players?.foto_url ? <img src={w.players.foto_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : w.players?.nombre?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-900 italic tracking-tight">{w.players?.nombre} {w.players?.apellido1}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-[8px] font-bold text-red-500 uppercase tracking-widest">
                          {w.illness_symptoms && w.illness_symptoms.length > 0 ? `Enfermedad: ${w.illness_symptoms.join(', ')}` : `Estado: ${w.soreness}/5 • ${w.soreness_areas?.join(', ') || 'Sin molestias'}`}
                        </p>
                        <ClubBadge clubName={w.players?.club} clubs={clubs} logoSize="w-3 h-3" className="text-[8px] font-bold text-red-500 uppercase tracking-widest" />
                      </div>
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); onMenuChange('medica'); }} className="text-red-600 hover:scale-110 transition-transform"><i className="fa-solid fa-suitcase-medical"></i></button>
                </div>
              ))
            )}
          </div>
        </div>
      ),
      schedule: (
        <div className="bg-white rounded-[32px] md:rounded-[48px] p-6 md:p-10 border border-slate-100 shadow-sm flex flex-col h-full relative overflow-hidden animate-in fade-in zoom-in-95 duration-500">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          <div className="flex items-center justify-between mb-6 md:mb-8 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-600/20 flex items-center justify-center text-red-500">
                <i className="fa-solid fa-calendar-day text-xs"></i>
              </div>
              <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] italic">Cronograma Semanal</h3>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); onMenuChange('planificacion_anual'); }}
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
      ),
      medical: (
        <div className="bg-white rounded-[32px] md:rounded-[48px] p-6 md:p-10 border border-slate-100 shadow-sm flex flex-col h-full animate-in fade-in zoom-in-95 duration-500">
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-500">
                <i className="fa-solid fa-user-md text-xs"></i>
              </div>
              <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] italic">Atenciones Médicas Diarias</h3>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); onMenuChange('medica'); }}
              className="text-[9px] font-black text-blue-500 uppercase tracking-widest hover:text-slate-900 transition-colors flex items-center gap-1"
            >
              Ver Área <i className="fa-solid fa-chevron-right text-[7px]"></i>
            </button>
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
            {filteredMedical.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-slate-400 text-[10px] font-black uppercase">Sin reportes hoy</p>
              </div>
            ) : (
              filteredMedical.map((report, i) => (
                <div key={i} className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-blue-600 font-black italic text-[10px] border border-slate-100">
                      {report.players?.nombre?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-900 italic tracking-tight">{report.players?.nombre} {report.players?.apellido1}</p>
                      <span className={`text-[7px] font-black px-1.5 py-0.5 rounded uppercase ${report.severity === 'high' ? 'bg-red-100 text-red-600' : report.severity === 'medium' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        {report.severity}
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-600 text-[9px] font-medium line-clamp-2 italic">"{report.observation}"</p>
                </div>
              ))
            )}
          </div>
        </div>
      ),
      kinesic: (
        <div className="bg-white rounded-[32px] md:rounded-[48px] p-6 md:p-10 border border-slate-100 shadow-sm flex flex-col h-full animate-in fade-in zoom-in-95 duration-500">
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-600/20 flex items-center justify-center text-emerald-500">
                <i className="fa-solid fa-hand-holding-medical text-xs"></i>
              </div>
              <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] italic">Atenciones Kinésicas</h3>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); onMenuChange('medica'); }}
              className="text-[9px] font-black text-emerald-500 uppercase tracking-widest hover:text-slate-900 transition-colors flex items-center gap-1"
            >
              Ver Área <i className="fa-solid fa-chevron-right text-[7px]"></i>
            </button>
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
            {filteredKinesic.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-slate-400 text-[10px] font-black uppercase">Sin atenciones hoy</p>
              </div>
            ) : (
              filteredKinesic.map((treatment, i) => (
                <div key={i} className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-emerald-600 font-black italic text-[10px] border border-slate-100">
                      {treatment.players?.nombre?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-900 italic tracking-tight">{treatment.players?.nombre} {treatment.players?.apellido1}</p>
                    </div>
                  </div>
                  <p className="text-slate-600 text-[9px] font-medium line-clamp-2 italic">"{treatment.description}"</p>
                </div>
              ))
            )}
          </div>
        </div>
      ),
    };

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

                  <div className="flex flex-wrap gap-4">
                    <button 
                      onClick={() => setIsCustomizing(!isCustomizing)}
                      className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg ${
                        isCustomizing 
                          ? 'bg-white text-red-600 scale-105' 
                          : 'bg-red-600 text-white hover:bg-red-700 hover:scale-105'
                      }`}
                    >
                      <i className={`fa-solid ${isCustomizing ? 'fa-check' : 'fa-gear'} ${isCustomizing ? '' : 'animate-spin-slow'}`}></i>
                      {isCustomizing ? 'Finalizar Personalización' : 'Personalizar Inicio'}
                    </button>
                    
                    {isCustomizing && (
                      <button 
                        onClick={() => {
                          const defaults = ['tasks', 'checkin', 'checkout', 'discomfort', 'schedule', 'medical', 'kinesic'];
                          setVisibleWidgets(defaults);
                        }}
                        className="px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/10 text-white hover:bg-white/20 transition-all flex items-center gap-2"
                      >
                        <i className="fa-solid fa-rotate-left"></i>
                        Restablecer
                      </button>
                    )}
                  </div>
                </div>

                <div className="w-full lg:w-80 bg-white/5 backdrop-blur-md border border-white/10 rounded-[32px] md:rounded-[40px] p-6 md:p-8 space-y-4 md:space-y-6">
                   <div className="flex items-center justify-between border-b border-white/5 pb-3 md:pb-4">
                     <p className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest">Series Activas</p>
                   </div>
                   <div className="space-y-2">
                     {activeMicrocycles.length === 0 ? (
                       <p className="text-slate-400 text-xs italic">No hay microciclos activos hoy.</p>
                     ) : (
                       activeMicrocycles.map((mc, idx) => {
                         const categoryEntry = Object.entries(CATEGORY_ID_MAP).find(([_, val]) => val === mc.category_id);
                         const categoryLabel = categoryEntry ? categoryEntry[0].replace('_', ' ').toUpperCase() : 'Selección';
                         
                         return (
                           <div 
                             key={idx} 
                             className={`flex items-center justify-between group/mc p-3 rounded-2xl transition-all border bg-white/5 border-transparent hover:bg-white/10`}
                           >
                             <div>
                               <div className="flex items-center gap-2 mb-1">
                                 <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest bg-red-600/20 text-red-500`}>
                                   {categoryLabel}
                                 </span>
                                 <p className="text-white text-sm font-black italic tracking-tighter leading-none uppercase">{mc.name}</p>
                               </div>
                               <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{mc.city}, {mc.country}</p>
                             </div>
                             <div className={`w-2 h-2 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)] bg-emerald-500 animate-pulse`}></div>
                           </div>
                         );
                       })
                     )}
                   </div>
                </div>
              </div>
            </div>

            {isCustomizing && (
              <div className="fixed inset-x-0 bottom-0 z-[400] bg-[#0b1220]/95 backdrop-blur-2xl border-t border-white/10 p-8 md:p-12 animate-in slide-in-from-bottom-full duration-500 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
                <div className="max-w-7xl mx-auto">
                  <div className="flex items-center justify-between mb-8 md:mb-12">
                    <div>
                      <h3 className="text-white text-2xl md:text-3xl font-black italic uppercase tracking-tighter mb-2">Galería de Widgets</h3>
                      <p className="text-slate-500 text-[10px] md:text-[12px] font-bold uppercase tracking-widest">Personaliza tu centro de mando seleccionando los módulos que necesitas.</p>
                    </div>
                    <button 
                      onClick={() => setIsCustomizing(false)}
                      className="w-12 h-12 md:w-16 md:h-16 bg-white text-red-600 rounded-full flex items-center justify-center text-xl md:text-2xl hover:scale-110 transition-transform shadow-xl"
                    >
                      <i className="fa-solid fa-check"></i>
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                    {availableWidgets.map(w => {
                      const isActive = visibleWidgets.includes(w.id);
                      return (
                        <button
                          key={w.id}
                          onClick={() => toggleWidget(w.id)}
                          className={`group relative flex flex-col p-6 rounded-[32px] md:rounded-[40px] border transition-all text-left h-full ${
                            isActive
                              ? 'bg-red-600 border-red-600 text-white shadow-2xl shadow-red-900/40'
                              : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:bg-white/10'
                          }`}
                        >
                          <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center mb-4 transition-all ${
                            isActive ? 'bg-white text-red-600' : 'bg-white/10 text-white group-hover:scale-110'
                          }`}>
                            <i className={`fa-solid ${w.icon} text-lg md:text-xl`}></i>
                          </div>
                          <h4 className="text-[11px] md:text-[12px] font-black uppercase tracking-widest mb-2 italic">{w.label}</h4>
                          <p className={`text-[9px] md:text-[10px] font-medium leading-relaxed opacity-60 ${isActive ? 'text-white' : 'text-slate-500'}`}>
                            {w.description}
                          </p>
                          
                          <div className={`absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                            isActive ? 'bg-white text-red-600' : 'bg-white/10 text-transparent'
                          }`}>
                            <i className={`fa-solid ${isActive ? 'fa-check' : 'fa-plus'} text-[10px]`}></i>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-12 flex justify-center">
                    <button 
                      onClick={() => {
                        const defaults = ['weather', 'tasks', 'checkin', 'discomfort', 'schedule', 'ai_summary'];
                        setVisibleWidgets(defaults);
                      }}
                      className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] hover:text-white transition-colors flex items-center gap-3"
                    >
                      <i className="fa-solid fa-rotate-left"></i>
                      Restablecer Configuración de Fábrica
                    </button>
                  </div>
                </div>
              </div>
            )}

            <Reorder.Group 
              axis="y" 
              values={visibleWidgets} 
              onReorder={setVisibleWidgets}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8"
            >
              {visibleWidgets.map((widgetId) => (
                <Reorder.Item 
                  key={widgetId} 
                  value={widgetId}
                  dragListener={isCustomizing}
                  className={`relative group/item ${isCustomizing ? 'cursor-grab active:cursor-grabbing animate-jiggle' : ''}`}
                >
                  {isCustomizing && (
                    <div className="absolute -top-3 -right-3 z-50">
                      <button 
                        onClick={() => toggleWidget(widgetId)}
                        className="bg-white text-red-600 w-10 h-10 rounded-full flex items-center justify-center shadow-2xl hover:bg-red-50 transition-colors border-2 border-red-600/10"
                      >
                        <i className="fa-solid fa-minus text-sm"></i>
                      </button>
                    </div>
                  )}
                  {widgetMap[widgetId]}
                </Reorder.Item>
              ))}
              
              {isCustomizing && (
                <button 
                  onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
                  className="bg-white/5 border-2 border-dashed border-white/10 rounded-[48px] p-10 flex flex-col items-center justify-center gap-4 text-slate-500 hover:border-white/20 hover:bg-white/10 transition-all group"
                >
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <i className="fa-solid fa-plus text-2xl"></i>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest">Añadir Widget</p>
                </button>
              )}
            </Reorder.Group>

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
        return <FisicaArea performanceRecords={performanceRecords} view="wellness" userRole={userRole} userClub={userClub} highlightPlayerId={userId_del_jugador} clubs={clubs} />;
      case 'fisica_pse':
        return <FisicaArea performanceRecords={performanceRecords} view="pse" userRole={userRole} userClub={userClub} highlightPlayerId={userId_del_jugador} clubs={clubs} />;
      case 'fisica_carga_externa_total':
        return <FisicaArea performanceRecords={performanceRecords} view="external_total" userRole={userRole} userClub={userClub} highlightPlayerId={userId_del_jugador} clubs={clubs} />;
      case 'fisica_carga_externa_tareas':
        return <CargaTareasArea performanceRecords={performanceRecords} userRole={userRole} userClub={userClub} clubs={clubs} />;
      case 'fisica_reporte':
        return <FisicaArea performanceRecords={performanceRecords} view="report" userRole={userRole} userClub={userClub} highlightPlayerId={userId_del_jugador} clubs={clubs} />;
      case 'fisica_vo2max':
        return <VO2MaxArea clubs={clubs} />;
      case 'nutricion_resumen_grupal':
        return <NutricionResumenGrupal performanceRecords={performanceRecords} userRole={userRole} userClub={userClub} clubs={clubs} />;
      case 'nutricion_comparativo':
        return <NutricionArea performanceRecords={performanceRecords} initialTab="general" userRole={userRole} userClub={userClub} clubs={clubs} />;
      case 'nutricion_individual':
        return <NutricionArea performanceRecords={performanceRecords} initialTab="individual" userRole={userRole} userClub={userClub} clubs={clubs} />;
      case 'nutricion_top10':
        return <NutricionArea performanceRecords={performanceRecords} initialTab="top10" userRole={userRole} userClub={userClub} clubs={clubs} />;
      case 'nutricion_maduracion':
        return <NutricionArea performanceRecords={performanceRecords} initialTab="crecimiento" userRole={userRole} userClub={userClub} clubs={clubs} />;
      case 'logistica_jugadores':
        return <LogisticaJugadores />;
      case 'logs':
        return <ActivityLogArea />;
      case 'importar_datos':
        return <DataImportArea />;
      case 'sports_science':
        return <SportsScienceArea userRole={userRole} userClub={userClub} clubs={clubs} />;
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
        
        return ContentComponent ? <ContentComponent performanceRecords={performanceRecords} onMenuChange={onMenuChange} clubs={clubs} /> : null;
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
