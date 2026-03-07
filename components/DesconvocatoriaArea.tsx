import React, { useState, useMemo, useEffect } from 'react'
import { User, UserRole, Category, CATEGORY_ID_MAP } from '../types'
import { supabase } from '../lib/supabase'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
  Legend
} from 'recharts'

type ViewMode = 'grid' | 'details' | 'report' | 'club_list' | 'club_print'

interface MicrocicloBajas {
  id: number
  micro_number?: number
  type: string
  nombre_display: string
  category_id: number
  start_date: string
  end_date: string
  city: string
  country: string
  jugadoresCount?: number
}

interface HistoricalData {
  wellness: any[]
  loads: any[]
}

interface ClubGroup {
  name: string
  players: User[]
}

export default function DesconvocatoriaArea() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedMicro, setSelectedMicro] = useState<MicrocicloBajas | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingPlayers, setLoadingPlayers] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilters, setCategoryFilters] = useState<string[]>(['TODOS'])

  const toggleCategoryFilter = (cat: string) => {
    setCategoryFilters(prev => {
      if (cat === 'TODOS') return ['TODOS'];
      const newSelection = prev.includes(cat)
        ? prev.filter(c => c !== cat)
        : [...prev.filter(c => c !== 'TODOS'), cat];
      return newSelection.length === 0 ? ['TODOS'] : newSelection;
    });
  };
  
  const [microciclos, setMicrociclos] = useState<MicrocicloBajas[]>([])
  const [citedPlayers, setCitedPlayers] = useState<User[]>([])

  const [processingBajaAtleta, setProcessingBajaAtleta] = useState<User | null>(null)
  const [selectedClubForPrint, setSelectedClubForPrint] = useState<ClubGroup | null>(null)
  const [historicalData, setHistoricalData] = useState<HistoricalData>({ wellness: [], loads: [] })
  
  // Para reporte por club: datos de todos los jugadores del club
  const [clubHistoryData, setClubHistoryData] = useState<Record<number, HistoricalData>>({})
  const [bajaReason, setBajaReason] = useState('Desgarro Isquiotibial izquierdo');

  useEffect(() => {
    fetchMicrocycles()
  }, [])

  const fetchMicrocycles = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('microcycles')
        .select('*')
        .order('start_date', { ascending: false })

      if (error) throw error

      if (data) {
        const { data: citCounts } = await supabase.from('citaciones').select('microcycle_id');
        const countsMap: Record<number, number> = {};
        citCounts?.forEach((c: any) => {
          countsMap[c.microcycle_id] = (countsMap[c.microcycle_id] || 0) + 1;
        });

        const mapped = data.map((m: any) => ({
          ...m,
          nombre_display: 'MICROCICLO',
          city: m.city || 'SANTIAGO',
          country: m.country || 'CHILE',
          jugadoresCount: countsMap[m.id] || 0
        }))
        setMicrociclos(mapped)
      }
    } catch (err) {
      console.error("Error cargando microciclos:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchCitedPlayers = async (microId: number) => {
    setLoadingPlayers(true)
    try {
      const { data, error } = await supabase
        .from('citaciones')
        .select(`
          player_id,
          players (
            id_del_jugador,
            nombre,
            apellido1,
            club,
            posicion
          )
        `)
      .eq('microcycle_id', microId)

      if (error) throw error
      if (data) {
        const mapped: User[] = data.map((d: any) => ({
          id: `p-${d.players.id_del_jugador}`,
          id_del_jugador: d.players.id_del_jugador,
          name: `${d.players.nombre} ${d.players.apellido1}`,
          role: UserRole.PLAYER,
          club: d.players.club || 'SIN CLUB',
          position: d.players.posicion || 'N/A'
        }))
        setCitedPlayers(mapped)
      }
    } catch (err) {
      console.error("Error cargando citados:", err)
    } finally {
      setLoadingPlayers(false)
    }
  }

  const fetchAthleteHistory = async (playerId: number, start: string, end: string) => {
    try {
      const { data: wellnessRaw } = await supabase
        .from('wellness_checkin')
        .select('*')
        .eq('id_del_jugador', playerId)
        .gte('checkin_date', start)
        .lte('checkin_date', end)
        .order('checkin_date', { ascending: true });

      const { data: loadsRaw } = await supabase
        .from('internal_load')
        .select('*')
        .eq('id_del_jugador', playerId)
        .gte('session_date', start)
        .lte('session_date', end)
        .order('session_date', { ascending: true });

      const mappedWellness = (wellnessRaw || []).map(w => ({
        date: w.checkin_date,
        fatigue: w.fatigue,
        sleep: w.sleep_quality,
        stress: w.stress,
        soreness: w.soreness,
        mood: w.mood
      }));

      const mappedLoads = (loadsRaw || []).map(l => ({
        date: l.session_date,
        rpe: l.rpe,
        duration: l.duration_min,
        srpe: l.srpe || (l.rpe * l.duration_min)
      }));

      return { wellness: mappedWellness, loads: mappedLoads };
    } catch (err) {
      console.error("Error en historia:", err);
      return { wellness: [], loads: [] };
    }
  };

  const handleOpenDetails = (mc: MicrocicloBajas) => {
    setSelectedMicro(mc)
    setViewMode('details')
    fetchCitedPlayers(mc.id)
  }

  const handleViewReport = async () => {
    if (processingBajaAtleta && selectedMicro) {
      setLoading(true);
      const history = await fetchAthleteHistory(processingBajaAtleta.id_del_jugador!, selectedMicro.start_date, selectedMicro.end_date);
      setHistoricalData(history);
      setViewMode('report')
      setLoading(false);
    }
  }

  const handleViewClubReport = async (club: ClubGroup) => {
    if (!selectedMicro) return;
    setLoading(true);
    setSelectedClubForPrint(club);
    const historyMap: Record<number, HistoricalData> = {};
    
    for (const p of club.players) {
      if (p.id_del_jugador) {
        historyMap[p.id_del_jugador] = await fetchAthleteHistory(p.id_del_jugador, selectedMicro.start_date, selectedMicro.end_date);
      }
    }
    
    setClubHistoryData(historyMap);
    setLoading(false);
    setViewMode('club_print');
  };

  const confirmDesconvocatoria = async () => {
    if (!processingBajaAtleta || !selectedMicro) return
    if (!window.confirm(`¿Estás seguro de oficializar la baja de ${processingBajaAtleta.name}? Esta acción lo eliminará de la citación.`)) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('citaciones')
        .delete()
        .match({ microcycle_id: selectedMicro.id, player_id: processingBajaAtleta.id_del_jugador });
      
      if (error) throw error;

      alert(`Baja oficial de ${processingBajaAtleta.name} procesada correctamente.`);
      setViewMode('details');
      fetchCitedPlayers(selectedMicro.id);
    } catch (err) {
      console.error(err);
      alert("Error al oficializar la baja.");
    } finally {
      setLoading(false)
    }
  }

  const confirmDesconvocatoriaClub = async (club: ClubGroup) => {
    if (!selectedMicro) return;
    if (!window.confirm(`¿Estás seguro de desconvocar a los ${club.players.length} jugadores de ${club.name}?`)) return;

    setLoading(true);
    try {
      const playerIds = club.players.map(p => p.id_del_jugador).filter(id => id !== undefined);
      
      const { error } = await supabase
        .from('citaciones')
        .delete()
        .eq('microcycle_id', selectedMicro.id)
        .in('player_id', playerIds);

      if (error) throw error;

      alert(`Se ha procesado la baja grupal de ${club.name} (${club.players.length} jugadores).`);
      setViewMode('details');
      fetchCitedPlayers(selectedMicro.id);
    } catch (err) {
      console.error(err);
      alert("Error al procesar la baja grupal.");
    } finally {
      setLoading(false);
    }
  };

  const formatCategoryLabel = (id: any) => {
    if (typeof id === 'string') return id.toUpperCase().replace('_', ' ');
    const entry = Object.entries(CATEGORY_ID_MAP).find(([_, val]) => Number(val) === Number(id));
    return entry ? entry[0].toUpperCase().replace('_', ' ') : 'N/A';
  };

  const formatDateShort = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    return `${parts[2]}/${parts[1]}`;
  };

  const getWellnessColor = (val: number) => {
    if (val >= 4.5) return 'bg-emerald-500 text-white';
    if (val >= 3.5) return 'bg-emerald-400 text-slate-900';
    if (val >= 2.5) return 'bg-amber-400 text-slate-900';
    return 'bg-red-500 text-white';
  };

  const clubGroups = useMemo(() => {
    const groups: Record<string, User[]> = {};
    citedPlayers.forEach(p => {
      const clubName = p.club || 'SIN CLUB';
      if (!groups[clubName]) groups[clubName] = [];
      groups[clubName].push(p);
    });
    return Object.entries(groups).map(([name, players]) => ({ name, players }));
  }, [citedPlayers]);

  const filteredMicros = useMemo(() => {
    return microciclos.filter(m => {
      if (categoryFilters.includes('TODOS')) return true;
      return categoryFilters.some(cat => m.category_id === CATEGORY_ID_MAP[cat as Category]);
    });
  }, [microciclos, categoryFilters]);

  // Fix: Explicitly typed PlayerReportSheet as React.FC to handle special React props like 'key' in sub-component render.
  // Componente Reutilizable para la Ficha del Jugador (Formato Oficial)
  const PlayerReportSheet: React.FC<{ player: User; history: HistoricalData }> = ({ player, history }) => {
    const wellnessChartData = history.wellness.map(w => ({
      fecha: formatDateShort(w.date),
      fatiga: w.fatigue,
      animo: w.mood,
      sueno: w.sleep,
      dolor: w.soreness,
      estres: w.stress
    }));

    const loadChartData = history.loads.map(l => ({
      fecha: formatDateShort(l.date),
      srpe: l.srpe
    }));

    const Header = () => (
      <div className="flex justify-between items-start mb-10 border-b-4 border-slate-900 pb-6">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-slate-900 text-white flex items-center justify-center font-black text-3xl italic rounded-xl">LR</div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 leading-none uppercase tracking-tighter italic">CERTIFICADO DE<br/><span className="text-red-600">DESCONVOCATORIA</span></h1>
            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-[0.4em] mt-1">DEPARTAMENTO DE SELECCIÓN • FFCH</p>
          </div>
        </div>
        <div className="text-right">
           <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">DOCUMENTO TÉCNICO RESERVADO</p>
           <p className="text-xs font-black text-slate-900 uppercase italic tracking-tighter">ID: {player.id.split('-')[1] || 'RA7Z98'}-{selectedMicro?.id || 'A00107'}</p>
        </div>
      </div>
    );

    return (
      <div className="flex flex-col font-sans text-slate-900">
        {/* PÁGINA 1: WELLNESS & FATIGA/DOLOR */}
        <div className="bg-white p-12 min-h-[297mm] flex flex-col break-after-page shadow-sm mb-8 print:shadow-none print:mb-0">
          <Header />

          {/* Atleta Info */}
          <div className="grid grid-cols-2 gap-10 mb-8 bg-slate-50 p-8 rounded-[32px]">
            <div>
               <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">IDENTIFICACIÓN DEL ATLETA:</p>
               <p className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter leading-none mb-2">{player.name}</p>
               <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest">{player.position} | {player.club}</p>
            </div>
            <div className="text-right">
               <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">PERÍODO SELECCIONADO:</p>
               <p className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">{formatCategoryLabel(selectedMicro?.category_id)}</p>
               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">MICROCICLO Nº {selectedMicro?.micro_number || selectedMicro?.id}</p>
            </div>
          </div>

          {/* Tabla Wellness */}
          <div className="space-y-6 mb-8">
            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em] flex items-center gap-2">
              <i className="fa-solid fa-moon text-blue-500"></i> MONITOREO CHECK-IN ( WELLNESS )
            </h3>
            <div className="rounded-[24px] overflow-hidden border border-slate-100 shadow-sm">
                <table className="w-full text-center text-[10px] border-collapse">
                  <thead className="bg-slate-50 text-slate-400 font-black uppercase tracking-widest border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-4 text-left pl-8">FECHA</th>
                      <th className="px-2 py-4">FATIGA</th>
                      <th className="px-2 py-4">SUEÑO</th>
                      <th className="px-2 py-4">DOLOR</th>
                      <th className="px-2 py-4">ESTRÉS</th>
                      <th className="px-2 py-4 pr-8">ÁNIMO</th>
                    </tr>
                  </thead>
                  <tbody className="font-black text-slate-700 uppercase italic">
                    {history.wellness.map((w, idx) => (
                      <tr key={idx} className="border-b border-slate-50">
                        <td className="px-4 py-3 text-left pl-8 font-bold">{formatDateShort(w.date)}</td>
                        <td className="px-2 py-3"><span className={`inline-block w-12 py-1.5 rounded-lg ${getWellnessColor(w.fatigue)}`}>{w.fatigue}</span></td>
                        <td className="px-2 py-3"><span className={`inline-block w-12 py-1.5 rounded-lg ${getWellnessColor(w.sleep)}`}>{w.sleep}</span></td>
                        <td className="px-2 py-3"><span className={`inline-block w-12 py-1.5 rounded-lg ${getWellnessColor(w.soreness)}`}>{w.soreness}</span></td>
                        <td className="px-2 py-3"><span className={`inline-block w-12 py-1.5 rounded-lg ${getWellnessColor(w.stress)}`}>{w.stress}</span></td>
                        <td className="px-2 py-3 pr-8"><span className={`inline-block w-12 py-1.5 rounded-lg ${getWellnessColor(w.mood)}`}>{w.mood}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
          </div>

          {/* Gráfico Fatiga y Dolor */}
          <div className="mt-auto">
            <h3 className="text-[9px] font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
              <i className="fa-solid fa-chart-line text-red-600"></i> EVOLUCIÓN FATIGA Y DOLOR
            </h3>
            <div className="h-64 w-full bg-slate-50/50 rounded-[32px] p-8">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={wellnessChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900, fill: '#94a3b8'}} />
                  <YAxis domain={[1, 5]} ticks={[1,2,3,4,5]} axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900, fill: '#94a3b8'}} />
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' }} />
                  <Line type="monotone" name="Dolor" dataKey="dolor" stroke="#0b1220" strokeWidth={4} dot={{ r: 4, fill: '#0b1220' }} activeDot={{ r: 6 }} />
                  <Line type="monotone" name="Fatiga" dataKey="fatiga" stroke="#ef4444" strokeWidth={4} dot={{ r: 4, fill: '#ef4444' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* PÁGINA 2: PERFIL PSICO-EMOCIONAL & PSE */}
        <div className="bg-white p-12 min-h-[297mm] flex flex-col break-after-page shadow-sm mb-8 print:shadow-none print:mb-0">
          <Header />
          
          <div className="mb-12">
            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
              <i className="fa-solid fa-brain text-purple-600"></i> PERFIL PSICO-EMOCIONAL
            </h3>
            <div className="h-64 w-full bg-slate-50/50 rounded-[32px] p-8">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={wellnessChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900, fill: '#94a3b8'}} />
                  <YAxis domain={[1, 5]} ticks={[1,2,3,4,5]} axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900, fill: '#94a3b8'}} />
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' }} />
                  <Line type="monotone" name="Estrés" dataKey="estres" stroke="#f59e0b" strokeWidth={4} dot={{ r: 4, fill: '#f59e0b' }} />
                  <Line type="monotone" name="Sueño" dataKey="sueno" stroke="#10b981" strokeWidth={4} dot={{ r: 4, fill: '#10b981' }} />
                  <Line type="monotone" name="Ánimo" dataKey="animo" stroke="#8b5cf6" strokeWidth={4} dot={{ r: 4, fill: '#8b5cf6' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-6 mb-12">
            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em] flex items-center gap-2">
              <i className="fa-solid fa-stopwatch text-red-600"></i> ANÁLISIS CHECK-OUT ( P S E )
            </h3>
            <div className="rounded-[24px] overflow-hidden border border-slate-100 shadow-sm">
                <table className="w-full text-center text-[10px] border-collapse">
                  <thead className="bg-slate-50 text-slate-400 font-black uppercase tracking-widest border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-left pl-8">FECHA</th>
                      <th className="px-4 py-4">RPE (BORG)</th>
                      <th className="px-4 py-4">MINUTOS</th>
                      <th className="px-6 py-4 text-right pr-8">CARGA (U.A)</th>
                    </tr>
                  </thead>
                  <tbody className="font-black text-slate-700 uppercase italic">
                    {history.loads.map((l, idx) => (
                      <tr key={idx} className="border-b border-slate-50">
                        <td className="px-6 py-4 text-left pl-8 font-bold">{formatDateShort(l.date)}</td>
                        <td className="px-4 py-4">{l.rpe}</td>
                        <td className="px-4 py-4">{l.duration}'</td>
                        <td className="px-6 py-4 text-right pr-8 text-red-600 font-black">{l.srpe}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
          </div>

          <div className="mt-auto">
            <h3 className="text-[9px] font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
              <i className="fa-solid fa-chart-area text-slate-900"></i> DINÁMICA DE CARGA (UA)
            </h3>
            <div className="h-64 w-full bg-[#0b1220] rounded-[32px] p-8">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={loadChartData}>
                  <defs>
                    <linearGradient id="colorSrpe" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#475569" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#475569" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900, fill: '#475569'}} />
                  <YAxis hide />
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', color: '#fff' }} />
                  <Area type="monotone" name="Carga (UA)" dataKey="srpe" stroke="#fff" fillOpacity={1} fill="url(#colorSrpe)" strokeWidth={4} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* PÁGINA 3: FIRMAS */}
        <div className="bg-white p-12 min-h-[297mm] flex flex-col shadow-sm print:shadow-none">
          <Header />

          <div className="flex-1 flex flex-col justify-center py-20">
            {/* Justificación técnica eliminada por solicitud */}
          </div>

          <div className="mt-auto">
            <div className="grid grid-cols-2 gap-24 mb-20">
               <div className="text-center">
                  <div className="h-px bg-slate-300 mb-6"></div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">F I R M A J E F E T É C N I C O</p>
               </div>
               <div className="text-center">
                  <div className="h-px bg-slate-300 mb-6"></div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">F I R M A Á R E A M É D I C A</p>
               </div>
            </div>
            
            <div className="text-center border-t border-slate-100 pt-8">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.6em] mb-2">L A R O J A P E R F O R M A N C E H U B</p>
               <p className="text-[8px] font-bold text-slate-300 uppercase">FEDERACIÓN DE FÚTBOL DE CHILE</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (viewMode === 'club_print' && selectedClubForPrint && selectedMicro) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300 pb-20 print:bg-white">
        <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm flex items-center justify-between print:hidden">
           <div className="flex items-center gap-6">
              <div className="w-14 h-14 bg-[#0b1220] rounded-2xl flex items-center justify-center text-white shadow-xl"><i className="fa-solid fa-file-pdf"></i></div>
              <h2 className="text-xl font-black uppercase tracking-tighter italic">REPORTE CONSOLIDADO: {selectedClubForPrint.name}</h2>
           </div>
           <div className="flex gap-4">
              <button onClick={() => window.print()} className="bg-red-600 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-red-700">IMPRIMIR TODO</button>
              <button onClick={() => setViewMode('club_list')} className="bg-slate-100 text-slate-400 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest">VOLVER</button>
           </div>
        </div>

        <div className="max-w-[850px] mx-auto space-y-10 print:space-y-0">
          {selectedClubForPrint.players.map(p => (
            <PlayerReportSheet key={p.id} player={p} history={clubHistoryData[p.id_del_jugador!] || { wellness: [], loads: [] }} />
          ))}
        </div>
      </div>
    )
  }

  if (viewMode === 'club_list' && selectedMicro) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300 pb-20">
        <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm flex items-center justify-between">
           <div className="flex items-center gap-6">
              <button onClick={() => setViewMode('details')} className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all shadow-inner"><i className="fa-solid fa-arrow-left"></i></button>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tighter italic">DESCONVOCATORIA POR EQUIPO</h2>
                <p className="text-slate-400 text-xs font-medium uppercase tracking-widest italic">{selectedMicro.nombre_display} #{selectedMicro.id}</p>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {clubGroups.map((group) => (
            <div key={group.name} className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm flex flex-col justify-between group hover:shadow-xl transition-all min-h-[280px]">
               <div>
                  <div className="flex justify-between items-start mb-6">
                     <span className="bg-slate-900 text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest">{group.players.length} JUGADORES</span>
                     <i className="fa-solid fa-shield-halved text-slate-100 text-3xl group-hover:text-red-100 transition-colors"></i>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-none mb-1 group-hover:text-red-600 transition-colors">{group.name}</h3>
                  <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">Atletas citados en este proceso</p>
               </div>
                <div className="flex gap-4">
                   <button 
                     onClick={() => handleViewClubReport(group)}
                     className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-[24px] text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-3"
                   >
                     <i className="fa-solid fa-file-pdf"></i> Reporte
                   </button>
                   <button 
                     onClick={() => confirmDesconvocatoriaClub(group)}
                     className="flex-1 py-4 bg-red-600 text-white rounded-[24px] text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-red-700 transition-all flex items-center justify-center gap-3"
                   >
                     <i className="fa-solid fa-user-xmark"></i> Desconvocar
                   </button>
                </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (viewMode === 'report' && processingBajaAtleta && selectedMicro) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300 pb-20 print:bg-white">
        <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm flex items-center justify-between print:hidden">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-xl"><i className="fa-solid fa-file-contract"></i></div>
            <h2 className="text-xl font-black uppercase tracking-tighter italic">Certificado Técnico: {processingBajaAtleta.name}</h2>
          </div>
          <div className="flex gap-4">
             <button onClick={() => window.print()} className="bg-[#0b1220] text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">IMPRIMIR PDF</button>
             <button onClick={confirmDesconvocatoria} className="bg-red-600 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-red-700">OFICIALIZAR BAJA</button>
             <button onClick={() => setViewMode('details')} className="bg-slate-100 text-slate-400 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest">VOLVER</button>
          </div>
        </div>

        <div id="report-printable" className="bg-white max-w-[850px] mx-auto shadow-2xl print:shadow-none print:p-0">
          <PlayerReportSheet player={processingBajaAtleta} history={historicalData} />
        </div>
      </div>
    )
  }

  if (viewMode === 'details' && selectedMicro) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300 transform-gpu">
         <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button onClick={() => setViewMode('grid')} className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all shadow-inner"><i className="fa-solid fa-arrow-left"></i></button>
            <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">
              NÓMINA OFICIAL: {selectedMicro.nombre_display} #{selectedMicro.micro_number || selectedMicro.id}
            </h2>
          </div>
          
          {/* Botón según referencia visual solicitada */}
          <button 
            onClick={() => setViewMode('club_list')}
            className="bg-[#0b1220] text-white px-10 py-5 rounded-[32px] text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-red-600 transition-all flex items-center gap-3 active:scale-95"
          >
            <i className="fa-solid fa-users-slash text-xs"></i> DESCONVOCAR POR EQUIPO
          </button>
        </div>

        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden min-h-[500px]">
          <div className="p-8 border-b border-slate-50 flex items-center justify-between">
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Jugadores Citados en Proceso</p>
             <div className="relative w-64">
               <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-xs"></i>
               <input type="text" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-slate-50 border-none rounded-2xl py-3 pl-10 pr-4 text-xs font-bold" />
             </div>
          </div>
          <div className="p-10">
            {loadingPlayers ? (
              <div className="py-20 text-center animate-pulse text-slate-400 font-black uppercase italic tracking-widest">Consultando Supabase...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {citedPlayers.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                  <div key={p.id} className="p-6 bg-slate-50 rounded-[32px] border border-transparent hover:border-red-500 hover:bg-white transition-all group flex items-center justify-between shadow-sm">
                    <div>
                      <p className="text-sm font-black text-slate-900 uppercase italic leading-none mb-1">{p.name}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{p.position} | {p.club}</p>
                    </div>
                    <button onClick={() => { setProcessingBajaAtleta(p); handleViewReport(); }} className="px-5 py-2.5 bg-red-600 text-white rounded-xl text-[9px] font-black uppercase shadow-sm hover:scale-105 active:scale-95 transition-all">Reportar Baja</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm flex items-center gap-6">
        <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-xl"><i className="fa-solid fa-user-minus"></i></div>
        <div>
          <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">DESCONVOCATORIAS OFICIALES</h2>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mt-1 italic">Gestión técnica de bajas en microciclos institucionales.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 p-1.5 bg-white rounded-[24px] border border-slate-100 shadow-sm max-w-fit overflow-x-auto">
        <button 
          onClick={() => toggleCategoryFilter('TODOS')} 
          className={`px-6 py-3.5 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${categoryFilters.includes('TODOS') ? 'bg-[#0b1220] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
        >
          TODOS
        </button>
        {Object.values(Category).map(cat => {
          const isSelected = categoryFilters.includes(cat);
          return (
            <button 
              key={cat} 
              onClick={() => toggleCategoryFilter(cat)} 
              className={`px-6 py-3.5 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${isSelected ? 'bg-[#0b1220] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {formatCategoryLabel(cat)}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="py-32 text-center animate-pulse">
          <i className="fa-solid fa-spinner fa-spin text-slate-200 text-5xl mb-6"></i>
          <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest italic">Sincronizando procesos...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredMicros.map((mc) => (
            <div key={mc.id} onClick={() => handleOpenDetails(mc)} className="group bg-white rounded-[40px] p-10 border-2 border-slate-50 transition-all cursor-pointer hover:shadow-2xl hover:border-red-200 relative overflow-hidden flex flex-col justify-between min-h-[360px]">
              <div className="flex justify-between items-start mb-6">
                <span className="bg-blue-600 text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm">
                  {formatCategoryLabel(mc.category_id)}
                </span>
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 shadow-inner">
                  <span className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">{mc.jugadoresCount} CITADOS</span>
                </div>
              </div>
              
              <div className="flex-1 space-y-1">
                <h3 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter leading-none group-hover:text-[#CF1B2B] transition-colors">
                  {mc.nombre_display} #{mc.micro_number || mc.id}
                </h3>
                <p className="text-slate-400 font-bold uppercase text-[12px] tracking-widest">
                  {mc.start_date} - {mc.end_date}
                </p>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">
                  {mc.type.toUpperCase()}
                </p>
              </div>

              <div className="pt-8 border-t border-slate-50 flex justify-between items-center">
                <span className="text-[11px] font-black text-[#CF1B2B] uppercase italic tracking-widest">
                  {mc.city.toUpperCase()}, {mc.country.toUpperCase()}
                </span>
                <div className="flex items-center gap-2 text-slate-200 group-hover:text-slate-900 transition-colors">
                  <span className="text-[9px] font-black uppercase tracking-widest">ABRIR</span>
                  <i className="fa-solid fa-chevron-right text-[8px]"></i>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
