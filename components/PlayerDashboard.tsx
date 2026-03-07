
import React, { useState, useMemo } from 'react'
import { User, WellnessData, TrainingLoadData, GPSData } from '../types'
import { supabase } from '../lib/supabase'
import WellnessForm from './WellnessForm'
import TrainingLoadForm from './TrainingLoadForm'
import MatchReportForm from './MatchReportForm'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar
} from 'recharts'

interface PlayerDashboardProps {
  player?: User & { isUnlinked?: boolean }
  wellness?: WellnessData[]
  loads?: TrainingLoadData[]
  gps?: GPSData[]
  onRefresh?: () => void
}

type AthleteView = 'menu' | 'wellness' | 'load' | 'match'

const PlayerDashboard: React.FC<PlayerDashboardProps> = ({
  player,
  wellness = [],
  loads = [],
  gps = [],
  onRefresh
}) => {
  const [activeView, setActiveView] = useState<AthleteView>('menu')
  const [submitting, setSubmitting] = useState(false)

  const handleBack = () => setActiveView('menu')

  const handleWellnessSubmit = async (data: any) => {
    if (player?.isUnlinked || !player?.id_del_jugador) {
      alert("⚠️ CUENTA NO VINCULADA: Tu usuario no está asociado a un perfil de jugador oficial en la base de datos.");
      return;
    }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const today = new Date().toISOString().split('T')[0];

      const { data: activeMC } = await supabase
        .from('microcycles')
        .select('id')
        .lte('start_date', today)
        .gte('end_date', today)
        .maybeSingle();
      
      const payload = {
        id_del_jugador: player.id_del_jugador,
        microcycle_id: activeMC?.id || null,
        checkin_date: today,
        sleep_quality: data.sleep,
        fatigue: data.fatigue,
        stress: data.stress,
        mood: data.mood,
        soreness: data.sorenessAreas.length > 0 ? 2 : 5,
        molestias: data.sorenessAreas.join(', '),
        enfermedad: data.illnessSymptoms.join(', '),
        created_by: user?.id
      };

      const { error } = await supabase.from('wellness_checkin').insert([payload]);
      
      if (error) throw error;
      
      alert("✅ Bienestar guardado correctamente.");
      if (onRefresh) onRefresh();
      setActiveView('menu');
    } catch (err: any) {
      alert("❌ Error de Sistema: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoadSubmit = async (data: any) => {
    if (player?.isUnlinked || !player?.id_del_jugador) {
      alert("⚠️ CUENTA NO VINCULADA: No se detectó un vínculo oficial con la base de datos.");
      return;
    }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const today = new Date().toISOString().split('T')[0];

      const { data: activeMC } = await supabase
        .from('microcycles')
        .select('id')
        .lte('start_date', today)
        .gte('end_date', today)
        .maybeSingle();

      const payload = {
        id_del_jugador: player.id_del_jugador,
        microcycle_id: activeMC?.id || null,
        session_date: today,
        rpe: data.rpe,
        duration_min: data.duration,
        molestias: data.sorenessAreas.join(', '),
        enfermedad: data.illnessSymptoms.join(', '),
        created_by: user?.id
      };

      const { error } = await supabase.from('internal_load').insert([payload]);
      
      if (error) throw error;
      
      alert("✅ Reporte de carga guardado correctamente.");
      if (onRefresh) onRefresh();
      setActiveView('menu');
    } catch (err: any) {
      alert("❌ Error al guardar: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const todaySchedule = [
    { time: '08:30', activity: 'Check-in Wellness', location: 'App Mobile', emoji: '☀️' },
    { time: '10:30', activity: 'Entrenamiento Campo', location: 'Campo 1 JPD', emoji: '⚽' },
    { time: '13:00', activity: 'Almuerzo Nutricional', location: 'Comedor', emoji: '🍽️' },
    { time: '16:30', activity: 'Sesión Video Rival', location: 'Sala Prensa', emoji: '📹' },
  ];

  const performanceData = useMemo(() => {
    const last14Wellness = [...wellness].sort((a, b) => a.date.localeCompare(b.date)).slice(-14);
    const last14Loads = [...loads].sort((a, b) => a.date.localeCompare(b.date)).slice(-14);

    if (last14Wellness.length === 0 && last14Loads.length === 0) return [];

    // Combinar datos por fecha
    const dates = Array.from(new Set([...last14Wellness.map(w => w.date), ...last14Loads.map(l => l.date)])).sort();

    return dates.map(date => {
      const w = last14Wellness.find(x => x.date === date);
      const l = last14Loads.find(x => x.date === date);
      return {
        date: new Date(date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase(),
        wellness: w ? (w.fatigue + w.sleep + w.mood) / 3 : 0,
        load: l ? l.load : 0
      };
    });
  }, [wellness, loads]);

  if (activeView === 'wellness') return <div className="w-full max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300 px-4"><button onClick={handleBack} className="mb-6 text-[10px] font-black uppercase text-slate-400 flex items-center gap-2 hover:text-slate-900"><i className="fa-solid fa-arrow-left"></i> Volver al Menú</button><WellnessForm onSubmit={handleWellnessSubmit} /></div>
  if (activeView === 'load') return <div className="w-full max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300 px-4"><button onClick={handleBack} className="mb-6 text-[10px] font-black uppercase text-slate-400 flex items-center gap-2 hover:text-slate-900"><i className="fa-solid fa-arrow-left"></i> Volver al Menú</button><TrainingLoadForm onSubmit={handleLoadSubmit} /></div>
  if (activeView === 'match') return <div className="w-full max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300 px-4"><button onClick={handleBack} className="mb-6 text-[10px] font-black uppercase text-slate-400 flex items-center gap-2 hover:text-slate-900"><i className="fa-solid fa-arrow-left"></i> Volver al Menú</button><MatchReportForm onSubmit={() => setActiveView('menu')} /></div>

  return (
    <div className="w-full max-w-4xl mx-auto space-y-10 pb-20 px-4 sm:px-0 animate-in fade-in duration-500">
      {player?.isUnlinked && (
        <div className="bg-amber-50 border border-amber-200 p-6 rounded-[32px] flex items-center gap-6 shadow-sm">
          <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white text-xl">
            <i className="fa-solid fa-triangle-exclamation"></i>
          </div>
          <div>
            <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">Modo Previsualización</p>
            <p className="text-xs font-bold text-amber-900 leading-tight italic">
              "Tu cuenta aún no está vinculada a un ID de jugador en el sistema central. Los administradores deben asignar tu correo a una ficha técnica."
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-8 bg-[#0b1220] rounded-[40px] p-10 flex items-center justify-between shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full -mr-16 -mt-16 group-hover:bg-red-600/20 transition-all duration-700"></div>
          <div className="relative z-10 flex flex-col gap-1">
            <h2 className="text-white text-4xl font-black italic uppercase tracking-tighter leading-none">{player?.name || 'ATLETA DEMO'}</h2>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em]">
              {player?.club || 'SIN CLUB'} | {player?.position || 'SIN POSICIÓN'} | {player?.anio ? (Number(player.anio) < 100 ? `CATEGORÍA SUB ${player.anio}` : `CLASE ${player.anio}`) : 'N/A'}
            </p>
            <div className="mt-6 flex gap-3">
              <div className="inline-flex items-center gap-2 bg-[#CF1B2B]/20 border border-[#CF1B2B]/30 px-4 py-2 rounded-full">
                <i className={`fa-solid ${player?.isUnlinked ? 'fa-circle-dot animate-pulse' : 'fa-circle-check'} text-[#CF1B2B] text-[10px]`}></i>
                <span className="text-white text-[9px] font-black uppercase tracking-widest">
                  {player?.isUnlinked ? 'ESTADO: PENDIENTE VÍNCULO' : 'ESTADO: ACTIVO'}
                </span>
              </div>
            </div>
          </div>
          <div className="hidden sm:flex w-24 h-24 bg-white/5 rounded-[32px] items-center justify-center text-white/10 text-6xl group-hover:scale-105 transition-transform">
            <i className="fa-solid fa-user"></i>
          </div>
        </div>
        <div className="md:col-span-4 bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm flex flex-col justify-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 italic">FOCO DE HOY 🛡️</p>
          <p className="text-sm font-bold text-slate-800 italic leading-relaxed">"Mantener la intensidad aeróbica. Hidratación constante por temperatura ambiente."</p>
          <p className="mt-4 text-[9px] font-black text-red-500 uppercase tracking-tighter">— PERFORMANCE STAFF</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 flex-1">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
              <span className="w-2 h-6 bg-red-600 rounded-full"></span>
              Agenda de Hoy
            </h3>
            <div className="space-y-6">
              {todaySchedule.map((item, i) => (
                <div key={i} className="flex gap-4 group">
                  <div className="text-center w-12 pt-1"><span className="text-xs font-black text-slate-900 block leading-none">{item.time}</span></div>
                  <div className="flex-1 bg-slate-50 p-4 rounded-2xl border border-transparent group-hover:border-slate-200 transition-all">
                    <div className="flex items-center gap-2 mb-1"><span className="text-base">{item.emoji}</span><span className="text-[11px] font-black text-slate-900 uppercase italic tracking-tight">{item.activity}</span></div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{item.location}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 min-h-[320px] flex flex-col">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3 mb-8">
              <span className="w-2 h-6 bg-blue-500 rounded-full"></span> Tendencia de Bienestar
            </h3>
            <div className="flex-1 w-full" style={{ height: 240 }}>
              {performanceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={performanceData}>
                    <defs>
                      <linearGradient id="colorWellness" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={9} fontWeight={900} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', fontWeight: '900', fontSize: '10px' }} />
                    <Area type="monotone" dataKey="wellness" stroke="#3b82f6" fillOpacity={1} fill="url(#colorWellness)" strokeWidth={4} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-300 font-bold uppercase text-[10px] italic">Sin datos históricos</div>
              )}
            </div>
          </div>
          <div className="bg-[#0b1220] rounded-[40px] p-8 shadow-2xl border border-white/5 min-h-[320px] flex flex-col">
            <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-3 mb-8">
              <span className="w-2 h-6 bg-red-600 rounded-full"></span> Carga Acumulada (srpe)
            </h3>
            <div className="flex-1 w-full" style={{ height: 240 }}>
              {performanceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performanceData}>
                    <XAxis dataKey="date" stroke="#475569" fontSize={9} fontWeight={900} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ borderRadius: '20px', border: 'none', fontWeight: '900', fontSize: '10px' }} />
                    <Bar dataKey="load" fill="#ef4444" radius={[10, 10, 10, 10]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-700 font-bold uppercase text-[10px] italic">Esperando primer registro</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6">
        <ActionCard icon="fa-sun" iconColor="text-red-500" iconBg="bg-red-50" title="CHECK-IN MAÑANA" subtitle="REPORTE DIARIO" onClick={() => setActiveView('wellness')} />
        <ActionCard icon="fa-stopwatch" iconColor="text-blue-600" iconBg="bg-blue-50" title="CHECK-OUT TARDE" subtitle="CARGA & RPE" onClick={() => setActiveView('load')} />
        <ActionCard icon="fa-trophy" iconColor="text-emerald-500" iconBg="bg-emerald-50" title="REPORTE PARTIDO" subtitle="POST-COMPETENCIA" onClick={() => setActiveView('match')} />
      </div>
    </div>
  )
}

function ActionCard({ icon, iconColor, iconBg, title, subtitle, onClick }: { 
  icon: string, iconColor: string, iconBg: string, title: string, subtitle: string, onClick: () => void 
}) {
  return (
    <button onClick={onClick} className="w-full bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-2xl hover:scale-[1.02] transition-all group active:scale-[0.98]">
      <div className="flex items-center gap-6">
        <div className={`w-14 h-14 ${iconBg} ${iconColor} rounded-[20px] flex items-center justify-center text-xl shadow-inner`}><i className={`fa-solid ${icon}`}></i></div>
        <div className="text-left">
          <h4 className="text-sm font-black text-slate-900 uppercase italic tracking-tighter leading-none mb-1 group-hover:text-red-600 transition-colors">{title}</h4>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{subtitle}</p>
        </div>
      </div>
      <i className="fa-solid fa-chevron-right text-xs text-slate-200 group-hover:text-slate-900 transition-all"></i>
    </button>
  )
}

export default PlayerDashboard;
