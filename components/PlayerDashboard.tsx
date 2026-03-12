
import React, { useState, useMemo } from 'react'
import { User, WellnessData, TrainingLoadData, GPSData } from '../types'
import { supabase } from '../lib/supabase'
import { logActivity } from '../lib/activityLogger'
import WellnessForm from './WellnessForm'
import TrainingLoadForm from './TrainingLoadForm'
import MatchReportForm from './MatchReportForm'
import NutritionReport from './NutritionReport'
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
  nutrition?: any[]
  onRefresh?: () => void
}

type AthleteView = 'menu' | 'wellness' | 'load' | 'match' | 'nutrition'

import PlayerSidebar, { PlayerMenuId } from './PlayerSidebar'
import ChefAssistant from './ChefAssistant'
import AITrainer from './AITrainer'

const PlayerDashboard: React.FC<PlayerDashboardProps> = ({
  player,
  wellness = [],
  loads = [],
  gps = [],
  nutrition = [],
  onRefresh
}) => {
  const [activeMenu, setActiveMenu] = useState<PlayerMenuId>('inicio')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [successModalConfig, setSuccessModalConfig] = useState<{ show: boolean, title: string, subtitle: string }>({
    show: false,
    title: '',
    subtitle: ''
  })
  const [profileData, setProfileData] = useState<Partial<User>>({})
  const [realActivities, setRealActivities] = useState<any[]>([])
  const [loadingActivities, setLoadingActivities] = useState(false)

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todayWellness = useMemo(() => wellness.find(w => w.date === todayStr), [wellness, todayStr]);
  const todayLoad = useMemo(() => loads.find(l => l.date === todayStr), [loads, todayStr]);

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '--:--';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '--:--';
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '--:--';
    }
  };

  const CLUBS = [
    'Colo-Colo', 'Universidad de Chile', 'Universidad Católica', 'Unión Española', 
    'Audax Italiano', 'Palestino', 'Everton', 'Santiago Wanderers', 'O\'Higgins', 
    'Huachipato', 'Coquimbo Unido', 'Cobresal', 'Cobreloa', 'Ñublense', 
    'Unión La Calera', 'Curicó Unido', 'Magallanes', 'Deportes Iquique', 
    'Deportes Antofagasta', 'Deportes Temuco', 'Rangers', 'San Luis', 
    'Santiago Morning', 'Recoleta', 'Limache', 'Barnechea', 'Santa Cruz', 
    'San Marcos', 'Universidad de Concepción', 'La Serena', 'Unión San Felipe', 
    'Puerto Montt', 'Concepción', 'Fernández Vial', 'San Antonio Unido', 
    'General Velásquez', 'Real San Joaquín', 'Lautaro de Buin', 'Trasandino', 
    'Melipilla', 'Provincial Osorno', 'Deportes Rengo', 'Concón National', 
    'Provincial Ovalle', 'Linares', 'Extranjero', 'S/C'
  ].sort();

  const POSITIONS = [
    'Portero', 'Defensa Central', 'Defensa Lateral', 'Volante', 
    'Delantero Extremo', 'Centro Delantero', 'Media Punta', 'Sin definir'
  ];

  React.useEffect(() => {
    if (player) {
      setProfileData({
        nombre: player.nombre,
        apellido1: player.apellido1,
        apellido2: player.apellido2,
        club: player.club,
        position: player.position,
        anio: player.anio,
        fecha_nacimiento: player.fecha_nacimiento,
        celular: player.celular
      });
      fetchRealActivities();
    }
  }, [player]);

  const fetchRealActivities = async () => {
    if (!player?.category) return;
    setLoadingActivities(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('annual_activities')
        .select('*')
        .eq('fecha', today)
        .eq('categoria', player.category)
        .order('hora_inicio', { ascending: true });

      if (error) throw error;
      setRealActivities(data || []);
    } catch (err) {
      console.error('Error fetching activities:', err);
    } finally {
      setLoadingActivities(false);
    }
  };

  const handleBack = () => setActiveMenu('inicio')

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

      const { error } = await supabase
        .from('wellness_checkin')
        .upsert(payload, { onConflict: 'id_del_jugador,checkin_date' });
      
      if (error) throw error;
      
      logActivity('Envío Wellness', { playerId: player.id_del_jugador, date: today });

      setSuccessModalConfig({
        show: true,
        title: 'Reporte Listo',
        subtitle: 'Tu información ha sido sincronizada correctamente.'
      });
      if (onRefresh) onRefresh();
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

      const { error } = await supabase
        .from('internal_load')
        .upsert(payload, { onConflict: 'id_del_jugador,session_date' });
      
      if (error) throw error;
      
      logActivity('Envío Carga Interna (PSE)', { playerId: player.id_del_jugador, date: today, rpe: data.rpe });

      setSuccessModalConfig({
        show: true,
        title: 'Reporte Listo',
        subtitle: 'Tu información ha sido sincronizada correctamente.'
      });
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert("❌ Error al guardar: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!player?.id_del_jugador) return;
    
    setSubmitting(true);
    try {
      const payload = {
        nombre: profileData.nombre,
        apellido1: profileData.apellido1,
        apellido2: profileData.apellido2,
        club: profileData.club,
        posicion: profileData.position,
        fecha_nacimiento: profileData.fecha_nacimiento,
        celular: profileData.celular
      };

      const { error } = await supabase
        .from('players')
        .update(payload)
        .eq('id_del_jugador', player.id_del_jugador);

      if (error) throw error;
      
      logActivity('Actualización Perfil Jugador', { playerId: player.id_del_jugador });

      setSuccessModalConfig({
        show: true,
        title: 'Datos Actualizados',
        subtitle: 'Tu perfil ha sido actualizado correctamente en el sistema.'
      });
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert("❌ Error al actualizar perfil: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };


  const performanceData = useMemo(() => {
    const last14Wellness = [...wellness].sort((a, b) => a.date.localeCompare(b.date)).slice(-14);
    const last14Loads = [...loads].sort((a, b) => a.date.localeCompare(b.date)).slice(-14);

    if (last14Wellness.length === 0 && last14Loads.length === 0) return [];

    // Combinar datos por fecha
    const dates = Array.from(new Set([...last14Wellness.map(w => w.date.substring(0, 10)), ...last14Loads.map(l => l.date.substring(0, 10))])).sort();

    return dates.map(date => {
      const w = last14Wellness.find(x => x.date.substring(0, 10) === date);
      const l = last14Loads.find(x => x.date.substring(0, 10) === date);
      return {
        date: new Date(date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase(),
        wellness: w ? (w.fatigue + w.sleep + w.mood) / 3 : 0,
        load: l ? l.load : 0
      };
    });
  }, [wellness, loads]);

  const renderContent = () => {
    switch (activeMenu) {
      case 'inicio':
        return (
          <div className="space-y-6 md:space-y-10 animate-in fade-in duration-500">
            {player?.isUnlinked && (
              <div className="bg-amber-50 border border-amber-200 p-4 md:p-6 rounded-[24px] md:rounded-[32px] flex items-center gap-4 md:gap-6 shadow-sm">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-500 rounded-xl md:rounded-2xl flex items-center justify-center text-white text-lg md:text-xl shrink-0">
                  <i className="fa-solid fa-triangle-exclamation"></i>
                </div>
                <div>
                  <p className="text-[8px] md:text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">Modo Previsualización</p>
                  <p className="text-[10px] md:text-xs font-bold text-amber-900 leading-tight italic">
                    "Tu cuenta aún no está vinculada a un ID de jugador en el sistema central. Los administradores deben asignar tu correo a una ficha técnica."
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
              <div className="md:col-span-12 bg-[#0b1220] rounded-[32px] md:rounded-[40px] p-6 md:p-10 flex items-center justify-between shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full -mr-16 -mt-16 group-hover:bg-red-600/20 transition-all duration-700"></div>
                <div className="relative z-10 flex flex-col gap-1">
                  <h2 className="text-white text-xl md:text-4xl font-black italic uppercase tracking-tighter leading-none">{player?.name || 'ATLETA DEMO'}</h2>
                  <p className="text-white/40 text-[8px] md:text-[10px] font-bold uppercase tracking-[0.1em] md:tracking-[0.2em]">
                    {player?.club || 'SIN CLUB'} | {player?.position || 'SIN POSICIÓN'} | {player?.anio ? (Number(player.anio) < 100 ? `CATEGORÍA SUB ${player.anio}` : `CLASE ${player.anio}`) : 'N/A'}
                  </p>
                  <div className="mt-3 md:mt-6 flex gap-3">
                    <div className="inline-flex items-center gap-2 bg-[#CF1B2B]/20 border border-[#CF1B2B]/30 px-3 md:px-4 py-1.5 md:py-2 rounded-full">
                      <i className={`fa-solid ${player?.isUnlinked ? 'fa-circle-dot animate-pulse' : 'fa-circle-check'} text-[#CF1B2B] text-[8px] md:text-[10px]`}></i>
                      <span className="text-white text-[7px] md:text-[9px] font-black uppercase tracking-widest">
                        {player?.isUnlinked ? 'PENDIENTE' : 'ACTIVO'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="hidden sm:flex w-16 md:w-24 h-16 md:h-24 bg-white/5 rounded-[20px] md:rounded-[32px] items-center justify-center text-white/10 text-4xl md:text-6xl group-hover:scale-105 transition-transform">
                  <i className="fa-solid fa-user"></i>
                </div>
              </div>
            </div>

            {/* Status Boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
              <div className={`p-5 md:p-6 rounded-[32px] border flex items-center justify-between transition-all duration-500 ${todayWellness ? 'bg-emerald-50/50 border-emerald-100 shadow-sm' : 'bg-slate-50/50 border-slate-100 shadow-sm'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center text-lg md:text-xl ${todayWellness ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                    <i className="fa-solid fa-sun"></i>
                  </div>
                  <div>
                    <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 md:mb-1">Check-in Wellness</p>
                    <p className={`text-[10px] md:text-xs font-black uppercase tracking-tighter ${todayWellness ? 'text-emerald-700' : 'text-slate-400'}`}>
                      {todayWellness ? `CONTESTADO (${formatTime(todayWellness.created_at)})` : 'NO CONTESTADO'}
                    </p>
                  </div>
                </div>
                <div className="text-right hidden xs:block">
                  <p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }).toUpperCase()}</p>
                </div>
              </div>

              <div className={`p-5 md:p-6 rounded-[32px] border flex items-center justify-between transition-all duration-500 ${todayLoad ? 'bg-emerald-50/50 border-emerald-100 shadow-sm' : 'bg-slate-50/50 border-slate-100 shadow-sm'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center text-lg md:text-xl ${todayLoad ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                    <i className="fa-solid fa-chart-line"></i>
                  </div>
                  <div>
                    <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 md:mb-1">Check-out Carga</p>
                    <p className={`text-[10px] md:text-xs font-black uppercase tracking-tighter ${todayLoad ? 'text-emerald-700' : 'text-slate-400'}`}>
                      {todayLoad ? `CONTESTADO (${formatTime(todayLoad.created_at)})` : 'NO CONTESTADO'}
                    </p>
                  </div>
                </div>
                <div className="text-right hidden xs:block">
                  <p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }).toUpperCase()}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
              <div className="lg:col-span-4 flex flex-col gap-6">
                <div className="bg-white rounded-[32px] md:rounded-[40px] p-6 md:p-8 shadow-sm border border-slate-100 flex-1">
                  <h3 className="text-[10px] md:text-sm font-black text-slate-900 uppercase tracking-[0.2em] mb-6 md:mb-8 flex items-center gap-3">
                    <span className="w-1.5 md:w-2 h-5 md:h-6 bg-red-600 rounded-full"></span>
                    Agenda de Hoy
                  </h3>
                  <div className="space-y-4 md:space-y-6">
                    {loadingActivities ? (
                      <div className="py-10 text-center">
                        <i className="fa-solid fa-spinner fa-spin text-slate-300"></i>
                      </div>
                    ) : realActivities.length > 0 ? (
                      realActivities.map((item, i) => (
                        <div key={i} className="flex gap-3 md:gap-4 group">
                          <div className="text-center w-10 md:w-12 pt-1">
                            <span className="text-[9px] md:text-xs font-black text-slate-900 block leading-none">
                              {item.hora_inicio.substring(0, 5)}
                            </span>
                          </div>
                          <div className="flex-1 bg-slate-50 p-3 md:p-4 rounded-xl md:rounded-2xl border border-transparent group-hover:border-slate-200 transition-all">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm md:text-base">
                                {item.tipo_actividad.toLowerCase().includes('entrenamiento') ? '⚽' : 
                                 item.tipo_actividad.toLowerCase().includes('almuerzo') ? '🍽️' :
                                 item.tipo_actividad.toLowerCase().includes('video') ? '📹' :
                                 item.tipo_actividad.toLowerCase().includes('wellness') ? '☀️' : '📋'}
                              </span>
                              <span className="text-[9px] md:text-[11px] font-black text-slate-900 uppercase italic tracking-tight">
                                {item.tipo_actividad}
                              </span>
                            </div>
                            <p className="text-[7px] md:text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                              {item.lugar} {item.observacion ? `| ${item.observacion}` : ''}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-10 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">No hay actividades programadas</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-8 space-y-6 md:space-y-8">
                <div className="bg-white rounded-[32px] md:rounded-[40px] p-6 md:p-8 shadow-sm border border-slate-100 min-h-[240px] md:min-h-[320px] flex flex-col">
                  <h3 className="text-[10px] md:text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3 mb-6 md:mb-8">
                    <span className="w-1.5 md:w-2 h-5 md:h-6 bg-blue-500 rounded-full"></span> Tendencia
                  </h3>
                  <div className="flex-1 w-full" style={{ height: 180 }}>
                    {performanceData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={performanceData}>
                          <defs>
                            <linearGradient id="colorWellness" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="date" stroke="#94a3b8" fontSize={8} fontWeight={900} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', fontWeight: '900', fontSize: '9px' }} />
                          <Area type="monotone" dataKey="wellness" stroke="#3b82f6" fillOpacity={1} fill="url(#colorWellness)" strokeWidth={3} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-300 font-bold uppercase text-[9px] italic">Sin datos históricos</div>
                    )}
                  </div>
                </div>
                <div className="bg-[#0b1220] rounded-[32px] md:rounded-[40px] p-6 md:p-8 shadow-2xl border border-white/5 min-h-[240px] md:min-h-[320px] flex flex-col">
                  <h3 className="text-[10px] md:text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-3 mb-6 md:mb-8">
                    <span className="w-1.5 md:w-2 h-5 md:h-6 bg-red-600 rounded-full"></span> Carga Acumulada
                  </h3>
                  <div className="flex-1 w-full" style={{ height: 180 }}>
                    {performanceData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={performanceData}>
                          <XAxis dataKey="date" stroke="#475569" fontSize={8} fontWeight={900} axisLine={false} tickLine={false} />
                          <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ borderRadius: '16px', border: 'none', fontWeight: '900', fontSize: '9px' }} />
                          <Bar dataKey="load" fill="#ef4444" radius={[8, 8, 8, 8]} barSize={16} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-700 font-bold uppercase text-[9px] italic">Esperando primer registro</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      case 'reportes_wellness':
        return <div className="w-full max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300"><WellnessForm onSubmit={handleWellnessSubmit} /></div>
      case 'reportes_load':
        return <div className="w-full max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300"><TrainingLoadForm onSubmit={handleLoadSubmit} /></div>
      case 'reportes_match':
        return (
          <div className="w-full max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
            <MatchReportForm onSubmit={() => setSuccessModalConfig({
              show: true,
              title: 'Reporte Listo',
              subtitle: 'Tu información ha sido sincronizada correctamente.'
            })} />
          </div>
        )
      case 'nutricion_antropometria':
        if (!player || nutrition.length === 0) {
          return (
            <div className="w-full max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="bg-white p-12 rounded-[40px] text-center border border-slate-100 shadow-sm">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300 text-3xl">
                  <i className="fa-solid fa-file-circle-exclamation"></i>
                </div>
                <h3 className="text-xl font-black text-slate-900 uppercase italic mb-2">Sin Evaluaciones</h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Aún no tienes registros antropométricos en el sistema central.</p>
              </div>
            </div>
          );
        }
        const latestNutrition = [...nutrition].sort((a, b) => new Date(b.fecha_medicion).getTime() - new Date(a.fecha_medicion).getTime())[0];
        return (
          <div className="w-full max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
            <NutritionReport data={latestNutrition} history={nutrition} player={player} onClose={handleBack} />
          </div>
        );
      case 'nutricion_recomendaciones':
        return (
          <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-[#0b1220] rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
              <div className="relative z-10">
                <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2">Pautas de Rendimiento</h2>
                <p className="text-white/50 text-xs font-bold uppercase tracking-widest">Optimización nutricional para el futbolista de élite</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <RecomendacionCard 
                  title="Hidratación" 
                  icon="fa-droplet" 
                  color="text-blue-500" 
                  bg="bg-blue-50"
                  items={["Beber 500ml de agua 2h antes del entrenamiento", "Consumir bebidas isotónicas durante sesiones > 60 min", "Pesar antes y después para calcular tasa de sudoración"]}
                />
                <RecomendacionCard 
                  title="Pre-Entrenamiento" 
                  icon="fa-bowl-rice" 
                  color="text-amber-500" 
                  bg="bg-amber-50"
                  items={["Carbohidratos de fácil digestión (pasta, arroz blanco)", "Evitar grasas y exceso de fibra 3h antes", "Fruta o barra de cereal 30 min antes"]}
                />
                <RecomendacionCard 
                  title="Recuperación" 
                  icon="fa-battery-full" 
                  color="text-emerald-500" 
                  bg="bg-emerald-50"
                  items={["Proteína de alta calidad (pollo, pescado, huevo) en los primeros 30 min", "Reponer glucógeno con carbohidratos complejos", "Consumir antioxidantes (frutos rojos)"]}
                />
                <RecomendacionCard 
                  title="Suplementación" 
                  icon="fa-pills" 
                  color="text-indigo-500" 
                  bg="bg-indigo-50"
                  items={["Creatina monohidratada (según pauta)", "Whey protein si no se llega al requerimiento proteico", "Vitamina D en meses de baja exposición solar"]}
                />
              </div>
              <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <i className="fa-solid fa-triangle-exclamation text-red-500"></i>
                  PROHIBIDOS 🚫
                </h3>
                <ul className="space-y-4">
                  {["Bebidas azucaradas y gaseosas", "Alimentos ultra-procesados", "Frituras y grasas trans", "Alcohol (afecta síntesis proteica)", "Exceso de cafeína post-18:00"].map((item, i) => (
                    <li key={i} className="flex gap-3 text-[11px] font-bold text-slate-400 uppercase tracking-tight">
                      <span className="text-red-500">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-10 p-6 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                  <p className="text-[10px] font-bold text-slate-500 italic leading-relaxed text-center">
                    "La nutrición es el entrenamiento invisible. Lo que comes hoy es tu energía de mañana."
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      case 'nutricion_formularios':
        return (
          <div className="w-full max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-white p-12 rounded-[40px] text-center border border-slate-100 shadow-sm">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300 text-3xl">
                <i className="fa-solid fa-clipboard-question"></i>
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase italic mb-2">Formularios de Nutrición</h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-8">Encuestas de hábitos y frecuencia de consumo</p>
              
              <div className="space-y-4">
                <NutritionFormButton 
                  title="Frecuencia de Consumo (FFQ)" 
                  description="Evaluación de hábitos semanales"
                  onClick={() => alert("Formulario FFQ próximamente disponible")}
                />
                <NutritionFormButton 
                  title="Encuesta de Hidratación" 
                  description="Control de ingesta de líquidos"
                  onClick={() => alert("Formulario de Hidratación próximamente disponible")}
                />
                <NutritionFormButton 
                  title="Recordatorio 24 Horas" 
                  description="Registro detallado de ingesta diaria"
                  onClick={() => alert("Formulario 24h próximamente disponible")}
                />
              </div>
            </div>
          </div>
        );
      case 'nutricion_chef':
        return <ChefAssistant />;
      case 'gym_trainer':
        return <AITrainer />;
      case 'perfil':
        return (
          <div className="w-full max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-white rounded-[32px] md:rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
              <div className="bg-[#0b1220] p-6 md:p-10 text-white">
                <h3 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter leading-none">Mi Perfil Técnico</h3>
                <p className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Gestiona tus datos personales y deportivos</p>
              </div>
              <form onSubmit={handleProfileUpdate} className="p-6 md:p-10 space-y-6 md:space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nombre</label>
                    <input 
                      required
                      type="text" 
                      value={profileData.nombre || ''}
                      onChange={e => setProfileData(prev => ({ ...prev, nombre: e.target.value }))}
                      className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl px-5 md:px-6 py-3.5 md:py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Apellido 1</label>
                    <input 
                      required
                      type="text" 
                      value={profileData.apellido1 || ''}
                      onChange={e => setProfileData(prev => ({ ...prev, apellido1: e.target.value }))}
                      className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl px-5 md:px-6 py-3.5 md:py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Apellido 2</label>
                    <input 
                      type="text" 
                      value={profileData.apellido2 || ''}
                      onChange={e => setProfileData(prev => ({ ...prev, apellido2: e.target.value }))}
                      className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl px-5 md:px-6 py-3.5 md:py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Club</label>
                    <select 
                      value={profileData.club || ''}
                      onChange={e => setProfileData(prev => ({ ...prev, club: e.target.value }))}
                      className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl px-5 md:px-6 py-3.5 md:py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="">Seleccionar Club</option>
                      {CLUBS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Posición</label>
                    <select 
                      value={profileData.position || ''}
                      onChange={e => setProfileData(prev => ({ ...prev, position: e.target.value }))}
                      className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl px-5 md:px-6 py-3.5 md:py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="">Seleccionar Posición</option>
                      {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Fecha Nacimiento</label>
                    <input 
                      type="date" 
                      value={profileData.fecha_nacimiento || ''}
                      onChange={e => setProfileData(prev => ({ ...prev, fecha_nacimiento: e.target.value }))}
                      className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl px-5 md:px-6 py-3.5 md:py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Celular</label>
                    <input 
                      type="text" 
                      placeholder="+5691234567"
                      value={profileData.celular || ''}
                      onChange={e => setProfileData(prev => ({ ...prev, celular: e.target.value }))}
                      className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl px-5 md:px-6 py-3.5 md:py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 md:py-5 rounded-xl md:rounded-2xl bg-[#CF1B2B] text-white font-black uppercase tracking-widest text-[10px] hover:bg-red-700 transition-all shadow-xl shadow-red-900/20 disabled:opacity-50"
                >
                  {submitting ? 'ACTUALIZANDO...' : 'ACTUALIZAR MI PERFIL'}
                </button>
              </form>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50 relative">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className={`${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 transition-transform duration-300`}>
        <PlayerSidebar 
          activeMenu={activeMenu} 
          onMenuChange={(id) => {
            setActiveMenu(id);
            setIsMobileMenuOpen(false);
          }} 
          isCollapsed={isSidebarCollapsed} 
          setIsCollapsed={setIsSidebarCollapsed} 
        />
      </div>
      
      <main className="flex-1 h-screen overflow-y-auto w-full">
        <div className="bg-white px-4 md:px-8 py-4 border-b border-slate-200 flex justify-between items-center sticky top-0 z-40 shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden w-10 h-10 flex items-center justify-center text-slate-500 hover:bg-slate-50 rounded-xl transition-all"
            >
              <i className="fa-solid fa-bars"></i>
            </button>
            {activeMenu !== 'inicio' && (
              <button onClick={handleBack} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-600 transition-all">
                <i className="fa-solid fa-arrow-left"></i>
              </button>
            )}
            <h2 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-widest truncate max-w-[150px] md:max-w-none">
              {activeMenu === 'inicio' ? 'Dashboard' : activeMenu.split('_').join(' ')}
            </h2>
          </div>
          <div className="flex items-center gap-3 md:gap-6">
            <button onClick={async () => { await supabase.auth.signOut() }} className="text-slate-500 hover:text-red-500 transition-colors p-2">
              <i className="fa-solid fa-arrow-right-from-bracket"></i>
            </button>
          </div>
        </div>

        <div className="p-4 md:p-8">
          {renderContent()}
        </div>
      </main>

      {/* Success Modal */}
      {successModalConfig.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#0b1220]/90 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-10 text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-inner">
              <i className="fa-solid fa-check"></i>
            </div>
            <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter mb-2">{successModalConfig.title}</h3>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-8">{successModalConfig.subtitle}</p>
            <button 
              onClick={() => {
                setSuccessModalConfig(prev => ({ ...prev, show: false }));
                setActiveMenu('inicio');
              }}
              className="w-full py-5 bg-[#0b1220] text-white rounded-[24px] text-xs font-black uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all active:scale-95"
            >
              Volver al Inicio
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function RecomendacionCard({ title, icon, color, bg, items }: { title: string, icon: string, color: string, bg: string, items: string[] }) {
  return (
    <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-xl transition-all">
      <div className="flex items-center gap-4 mb-6">
        <div className={`w-12 h-12 ${bg} ${color} rounded-2xl flex items-center justify-center text-xl shadow-inner`}>
          <i className={`fa-solid ${icon}`}></i>
        </div>
        <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tighter leading-none">{title}</h3>
      </div>
      <ul className="space-y-4">
        {items.map((item, i) => (
          <li key={i} className="flex gap-3 text-xs font-bold text-slate-500 leading-relaxed">
            <span className="text-red-500 mt-1">•</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ActionCard({ icon, iconColor, iconBg, title, subtitle, onClick }: { 
  icon: string, iconColor: string, iconBg: string, title: string, subtitle: string, onClick: () => void 
}) {
  return (
    <button onClick={onClick} className="w-full bg-white p-5 md:p-8 rounded-[28px] md:rounded-[40px] shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-2xl hover:scale-[1.02] transition-all group active:scale-[0.98]">
      <div className="flex items-center gap-4 md:gap-6">
        <div className={`w-10 h-10 md:w-14 md:h-14 ${iconBg} ${iconColor} rounded-xl md:rounded-[20px] flex items-center justify-center text-base md:text-xl shadow-inner`}><i className={`fa-solid ${icon}`}></i></div>
        <div className="text-left">
          <h4 className="text-[10px] md:text-sm font-black text-slate-900 uppercase italic tracking-tighter leading-none mb-1 group-hover:text-red-600 transition-colors">{title}</h4>
          <p className="text-[7px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest">{subtitle}</p>
        </div>
      </div>
      <i className="fa-solid fa-chevron-right text-[8px] md:text-xs text-slate-200 group-hover:text-slate-900 transition-all"></i>
    </button>
  )
}

function NutritionFormButton({ title, description, onClick }: { title: string, description: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="w-full p-4 md:p-6 bg-slate-50 rounded-xl md:rounded-2xl border border-slate-100 flex items-center justify-between group hover:bg-red-50 hover:border-red-100 transition-all"
    >
      <div className="text-left">
        <span className="text-xs md:text-sm font-black text-slate-900 uppercase italic group-hover:text-red-600 block mb-1">{title}</span>
        <span className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{description}</span>
      </div>
      <i className="fa-solid fa-arrow-right text-[10px] md:text-base text-slate-300 group-hover:text-red-500"></i>
    </button>
  );
}

export default PlayerDashboard;
