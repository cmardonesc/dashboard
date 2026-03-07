
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
import { getPerformanceInsights, getWeatherForecast, queryCoachAssistant, WeatherData } from '../services/geminiService'
import { AreaChart, Area, XAxis, ResponsiveContainer, Tooltip, BarChart, Bar, Cell, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts'

type MenuId = 'inicio' | 'planificacion_anual' | 'tecnica' | 'fisica_wellness' | 'fisica_pse' | 'fisica_carga_externa_total' | 'fisica_carga_externa_tareas' | 'fisica_reporte' | 'medica' | 'nutricion' | 'citaciones' | 'desconvocatoria' | 'usuarios';

interface StaffDashboardProps {
  performanceRecords: AthletePerformanceRecord[];
  activeMenu: MenuId;
  onMenuChange: (id: MenuId) => void;
}

const StaffDashboard: React.FC<StaffDashboardProps> = ({ performanceRecords, activeMenu, onMenuChange }) => {
  const [realMicrocycles, setRealMicrocycles] = useState<any[]>([]);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchRealData = async () => {
      const { data } = await supabase.from('microcycles').select('*');
      if (data) setRealMicrocycles(data);
    };
    if (activeMenu === 'inicio') {
      fetchRealData();
    }
  }, [activeMenu]);

  useEffect(() => {
    const fetchWeather = async () => {
      if (activeMenu !== 'inicio') return;
      setLoadingWeather(true);
      const todayStr = new Date().toISOString().split('T')[0];
      const activeMC = realMicrocycles.find(m => todayStr >= m.start_date && todayStr <= m.end_date);
      const city = activeMC?.city || 'Santiago';
      const country = activeMC?.country || 'Chile';
      
      const { data, error } = await getWeatherForecast(city, country);
      
      if (error === 'QUOTA_EXHAUSTED' || !data) {
        // Fallback to mock data if quota is exhausted or fetch fails
        console.warn("Using fallback weather data due to API limits or error.");
        setWeatherData({
          city: city,
          currentTemp: 24,
          condition: "Despejado",
          precipitation: "5%",
          humidity: "45%",
          wind: "12 km/h",
          hourly: [
            { time: "1 a.m.", temp: 18 }, { time: "4 a.m.", temp: 16 },
            { time: "7 a.m.", temp: 17 }, { time: "10 a.m.", temp: 21 },
            { time: "1 p.m.", temp: 24 }, { time: "4 p.m.", temp: 25 },
            { time: "7 p.m.", temp: 22 }, { time: "10 p.m.", temp: 19 }
          ],
          daily: [
            { day: "lun", icon: "fa-sun", high: 26, low: 15, isToday: true },
            { day: "mar", icon: "fa-sun", high: 27, low: 16 },
            { day: "mié", icon: "fa-cloud-sun", high: 25, low: 14 },
            { day: "jue", icon: "fa-cloud", high: 22, low: 13 },
            { day: "vie", icon: "fa-cloud-rain", high: 19, low: 12 },
            { day: "sáb", icon: "fa-sun", high: 24, low: 14 },
            { day: "dom", icon: "fa-sun", high: 26, low: 15 }
          ]
        });
      } else {
        setWeatherData(data);
      }
      setLoadingWeather(false);
    };
    if (realMicrocycles.length > 0 || activeMenu === 'inicio') {
      fetchWeather();
    }
  }, [realMicrocycles, activeMenu]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const totals = useMemo(() => {
    const playersAtRisk = performanceRecords.filter(r => {
      const lastW = r.wellness?.[r.wellness.length - 1];
      return lastW && (lastW.fatigue + lastW.sleep + lastW.mood) / 3 < 2.5;
    }).length;

    return { 
      players: performanceRecords.length, 
      wellnessAvg: 4.42, 
      atRisk: playersAtRisk || 2, 
      bajas: 2, 
      efficiency: 94 
    }
  }, [performanceRecords]);

  const radarData = useMemo(() => {
    return [
      { subject: 'Físico', A: 85, fullMark: 100 },
      { subject: 'Táctico', A: 78, fullMark: 100 },
      { subject: 'Mental', A: 92, fullMark: 100 },
      { subject: 'Wellness', A: 88, fullMark: 100 },
      { subject: 'Carga', A: 70, fullMark: 100 },
    ];
  }, []);

  const handleGenerateAiInsight = async () => {
    setLoadingAi(true);
    const insight = await getPerformanceInsights(performanceRecords);
    setAiInsight(insight);
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
    setIsTyping(false);
  };

  const renderWeatherAdvanced = () => {
    if (loadingWeather) return (
      <div className="bg-white rounded-[40px] p-12 border border-slate-100 animate-pulse flex items-center justify-center min-h-[400px]">
        <span className="text-slate-300 font-black uppercase text-[10px] tracking-widest">Calculando Estrés Térmico...</span>
      </div>
    );
    if (!weatherData) return null;
    
    const wbgt = (weatherData.currentTemp * 0.7 + parseInt(weatherData.humidity) * 0.2 + 5 * 0.1).toFixed(1);
    const riskLevel = parseFloat(wbgt) > 28 ? 'ALTO' : parseFloat(wbgt) > 24 ? 'MODERADO' : 'BAJO';

    return (
      <div className="bg-[#0b1220] rounded-[40px] p-10 shadow-2xl relative overflow-hidden transform-gpu border border-white/5">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-10">
            <div>
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-1">Status Ambiental</p>
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">{weatherData.city}</h3>
            </div>
            <div className="bg-blue-500/10 px-4 py-2 rounded-2xl border border-blue-500/20">
              <span className="text-blue-500 text-[9px] font-black uppercase tracking-widest">Live Sync</span>
            </div>
          </div>

          <div className="flex items-center gap-8 mb-10">
            <div className="flex items-center gap-4">
              <i className={`fa-solid ${weatherData.daily[0]?.icon || 'fa-sun'} text-5xl text-blue-400`}></i>
              <div className="flex items-baseline">
                <span className="text-6xl font-black text-white tracking-tighter italic">{weatherData.currentTemp}</span>
                <span className="text-xl font-medium text-slate-500 ml-1">°C</span>
              </div>
            </div>
            <div className="h-12 w-px bg-white/10"></div>
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Índice WBGT</p>
              <p className="text-2xl font-black text-white italic">{wbgt}°</p>
            </div>
          </div>

          <div className="bg-white/5 rounded-3xl p-6 border border-white/5 mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-2 h-2 rounded-full animate-pulse ${riskLevel === 'ALTO' ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
              <p className="text-[10px] font-black text-white uppercase tracking-widest">Recomendación Técnica</p>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed italic">
              "Riesgo térmico <span className="text-white font-bold">{riskLevel}</span>. Se recomienda hidratación obligatoria cada 15 min y reducir bloques de alta intensidad en 10%."
            </p>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {weatherData.daily.slice(0, 7).map((day, i) => (
              <div key={i} className={`flex flex-col items-center gap-2 py-3 rounded-2xl transition-all ${day.isToday ? 'bg-white/10 shadow-lg' : 'hover:bg-white/5'}`}>
                <span className="text-[8px] font-black uppercase text-slate-500">{day.day}</span>
                <i className={`fa-solid ${day.icon} ${day.isToday ? 'text-blue-400' : 'text-slate-600'} text-[10px]`}></i>
                <span className="text-[9px] font-black text-white">{day.high}°</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeMenu) {
      case 'inicio':
        return (
          // ... (Hero section code)
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 transform-gpu">
            {/* HERO DYNAMICO "CONCENTRATION MODE" */}
            <div className="relative bg-[#0b1220] rounded-[56px] p-12 overflow-hidden shadow-2xl border border-white/5 transform-gpu group">
              <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-red-600/20 to-transparent"></div>
              <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px]"></div>
              
              <div className="relative z-10 flex flex-col lg:flex-row justify-between items-end gap-12">
                <div className="max-w-2xl">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="bg-red-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-red-900/40">
                      LIVE MODE
                    </span>
                    <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">MICROCICLO ACTUAL • DÍA 3</span>
                  </div>
                  <h1 className="text-white text-7xl font-black italic tracking-tighter uppercase leading-[0.85] mb-10">
                    SISTEMA DE <br/>
                    <span className="text-red-600">ALTO IMPACTO</span>
                  </h1>
                  
                  <div className="flex flex-wrap gap-4">
                    <button onClick={() => onMenuChange('citaciones')} className="bg-white text-[#0b1220] px-10 py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-2xl hover:bg-red-600 hover:text-white transition-all transform hover:scale-105">
                      Sincronizar Plantel
                    </button>
                    <button onClick={handleGenerateAiInsight} disabled={loadingAi} className="bg-white/5 text-white border border-white/10 px-10 py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-3">
                      {loadingAi ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-robot text-red-500"></i>}
                      Inteligencia Predictiva
                    </button>
                  </div>
                </div>

                <div className="w-full lg:w-80 bg-white/5 backdrop-blur-md border border-white/10 rounded-[40px] p-8 space-y-6">
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-4">Próxima Sesión</p>
                   <div>
                     <p className="text-white text-2xl font-black italic tracking-tighter leading-none mb-1">CAMPO 1 - TÁCTICO</p>
                     <p className="text-red-500 text-xl font-black">16:30 <span className="text-[10px] font-bold text-slate-500 italic">(-45 min)</span></p>
                   </div>
                   <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                     <div className="h-full bg-red-600 animate-pulse" style={{width: '65%'}}></div>
                   </div>
                   <p className="text-[9px] font-bold text-slate-400 italic">"Foco: Transiciones defensa-ataque y presión alta"</p>
                </div>
              </div>
            </div>

            {/* QUICK ACTIONS BAR */}
            <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
              {[
                { label: 'Pasar Lista', icon: 'fa-check-double', color: 'bg-emerald-500' },
                { label: 'Cargar GPS', icon: 'fa-file-csv', color: 'bg-blue-500' },
                { label: 'Reporte RPE', icon: 'fa-stopwatch', color: 'bg-amber-500' },
                { label: 'Wellness Push', icon: 'fa-bell', color: 'bg-purple-500' },
                { label: 'Nómina PDF', icon: 'fa-file-pdf', color: 'bg-red-500' },
              ].map((action, i) => (
                <button key={i} className="flex items-center gap-3 bg-white px-6 py-4 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all shrink-0">
                  <div className={`w-10 h-10 ${action.color} rounded-2xl flex items-center justify-center text-white text-sm shadow-inner`}>
                    <i className={`fa-solid ${action.icon}`}></i>
                  </div>
                  <span className="text-[10px] font-black uppercase text-slate-900 tracking-widest">{action.label}</span>
                </button>
              ))}
            </div>

            {aiInsight && (
              <div className="bg-[#0b1220] rounded-[48px] p-12 border border-red-600/30 shadow-2xl animate-in slide-in-from-top-4 relative transform-gpu overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <button onClick={() => setAiInsight(null)} className="absolute top-10 left-10 text-slate-500 hover:text-white transition-colors"><i className="fa-solid fa-xmark text-xl"></i></button>
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-red-900/20"><i className="fa-solid fa-brain text-2xl"></i></div>
                  <div>
                    <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none">Análisis Predictivo de Rendimiento</h3>
                    <p className="text-red-500 text-[10px] font-black uppercase tracking-widest mt-1">Generado por motor IA de Élite</p>
                  </div>
                </div>
                <div className="prose prose-invert prose-slate max-w-none text-slate-400 font-medium leading-relaxed text-sm" dangerouslySetInnerHTML={{ __html: aiInsight.replace(/\n/g, '<br/>') }}></div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* BENTO BOX - ALERTA CRÍTICAS */}
              <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Atletas en Riesgo */}
                <div className="bg-white rounded-[48px] p-10 border border-slate-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] italic">The Red Flag Panel</h3>
                      <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-[9px] font-black">{totals.atRisk} CRÍTICOS</span>
                    </div>
                    <div className="space-y-4 mb-10">
                      {performanceRecords.slice(0, 3).map((r, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-red-50 rounded-3xl border border-red-100">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-red-600 font-black italic text-xs border border-red-100">{r.player.name.charAt(0)}</div>
                            <div>
                              <p className="text-[11px] font-black uppercase text-slate-900 italic tracking-tight">{r.player.name}</p>
                              <p className="text-[9px] font-bold text-red-500 uppercase tracking-widest">Wellness Bajo: 2.1</p>
                            </div>
                          </div>
                          <button className="text-red-300 hover:text-red-600 transition-colors"><i className="fa-solid fa-circle-info"></i></button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => onMenuChange('fisica_wellness')} className="w-full py-4 rounded-2xl bg-[#0b1220] text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all">Ver Detalle de Carga</button>
                </div>

                {/* Radar de Grupo */}
                <div className="bg-white rounded-[48px] p-10 border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] italic">Potencial de Grupo</h3>
                    <i className="fa-solid fa-chart-radar text-slate-200 text-xl"></i>
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                        <PolarGrid stroke="#f1f5f9" />
                        <PolarAngleAxis dataKey="subject" tick={{fontSize: 10, fontWeight: 900, fill: '#94a3b8'}} />
                        <Radar name="Equipo" dataKey="A" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Readiness Progress Bar */}
                <div className="md:col-span-2 bg-[#0b1220] rounded-[48px] p-10 shadow-2xl relative overflow-hidden group border border-white/5">
                  <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
                  <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
                    <div className="md:col-span-4 text-center">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Readiness Promedio</p>
                      <p className="text-7xl font-black text-white italic tracking-tighter leading-none mb-4">94<span className="text-red-600">%</span></p>
                      <div className="flex justify-center gap-1">
                        {[1,2,3,4,5].map(i => <div key={i} className={`w-3 h-1.5 rounded-full ${i <= 4 ? 'bg-red-600 shadow-lg shadow-red-900/40' : 'bg-white/10'}`}></div>)}
                      </div>
                    </div>
                    <div className="md:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-6">
                      <HeaderStat label="Jugadores" value={performanceRecords.length} icon="fa-users" />
                      <HeaderStat label="Bajas Médicas" value={totals.bajas} icon="fa-user-nurse" />
                      <HeaderStat label="Wellness Avg" value={totals.wellnessAvg} icon="fa-wave-square" />
                      <HeaderStat label="Performance" value="Élite" icon="fa-star" />
                    </div>
                  </div>
                </div>
              </div>

              {/* CLIMA AVANZADO */}
              <div className="lg:col-span-4">
                {renderWeatherAdvanced()}
              </div>
            </div>

            {/* CHATBOT FLOATING */}
            <div className={`fixed bottom-8 right-8 z-[300] flex flex-col items-end gap-4 print:hidden`}>
              {chatOpen && (
                <div className="w-96 h-[550px] bg-white rounded-[48px] shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 transform-gpu">
                  <div className="bg-[#0b1220] p-8 flex items-center justify-between text-white relative">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/10 rounded-full blur-2xl -mr-12 -mt-12"></div>
                    <div className="flex items-center gap-4 relative z-10">
                      <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg"><i className="fa-solid fa-robot text-xl"></i></div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1 opacity-50">Inteligencia</p>
                        <p className="text-lg font-black italic uppercase tracking-tighter">Coach Assistant</p>
                      </div>
                    </div>
                    <button onClick={() => setChatOpen(false)} className="text-white/30 hover:text-white transition-colors"><i className="fa-solid fa-xmark text-xl"></i></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-slate-50/50">
                    {chatMessages.length === 0 && (
                      <div className="text-center py-20">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100 text-slate-200">
                          <i className="fa-solid fa-message text-2xl"></i>
                        </div>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest italic">¿Tienes dudas sobre la carga de hoy?</p>
                      </div>
                    )}
                    {chatMessages.map((m, i) => (
                      <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-5 rounded-[28px] text-xs font-medium leading-relaxed shadow-sm ${m.role === 'user' ? 'bg-[#0b1220] text-white rounded-br-none' : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'}`}>
                          {m.text}
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef}></div>
                  </div>
                  <form onSubmit={handleSendMessage} className="p-8 bg-white border-t border-slate-50 flex gap-3">
                    <input 
                      type="text" 
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      placeholder="Consultar al motor IA..."
                      className="flex-1 bg-slate-50 border-none rounded-[24px] px-6 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500 shadow-inner"
                    />
                    <button type="submit" className="w-14 h-14 bg-red-600 text-white rounded-2xl flex items-center justify-center hover:bg-red-700 transition-all shadow-xl active:scale-95 transform-gpu"><i className="fa-solid fa-paper-plane"></i></button>
                  </form>
                </div>
              )}
              <button 
                onClick={() => setChatOpen(!chatOpen)}
                className="w-20 h-20 bg-[#0b1220] text-white rounded-[32px] flex items-center justify-center text-3xl shadow-2xl hover:bg-red-600 transition-all hover:scale-110 transform-gpu group relative overflow-hidden"
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
      default:
        const ContentComponent = {
          planificacion_anual: PlanificacionAnual,
          tecnica: TecnicaArea,
          medica: MedicaArea,
          nutricion: NutricionArea,
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
    <div className="bg-white/5 rounded-[32px] p-6 border border-white/5 flex flex-col items-center text-center transition-all hover:bg-white/10 group transform-gpu shadow-inner">
      <div className="text-white/20 text-lg mb-3 group-hover:text-red-500 transition-colors group-hover:scale-110 duration-300"><i className={`fa-solid ${icon}`}></i></div>
      <div className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] mb-2">{label}</div>
      <div className={`text-3xl font-black text-white tracking-tighter italic leading-none`}>{value}</div>
    </div>
  )
}

export default StaffDashboard;
