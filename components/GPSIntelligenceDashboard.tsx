
import React, { useMemo, useState, useEffect } from 'react';
import { AthletePerformanceRecord, User } from '../types';
import { supabase } from '../lib/supabase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, ScatterChart, Scatter, ZAxis, Cell, ReferenceLine, ComposedChart, Line
} from 'recharts';
import ClubBadge from './ClubBadge';

interface GPSIntelligenceDashboardProps {
  performanceRecords: AthletePerformanceRecord[];
  clubs?: any[];
  categoryName?: string | null;
}

const POSITIONS = ['DEFENSA', 'VOLANTE', 'DELANTERO'];

const METRICS_CONFIG = [
  { id: 'dist_total_m', name: 'Distancia Total', unit: 'm', color: '#3b82f6' },
  { id: 'dist_mai_m_20_kmh', name: 'HSR (20+ km/h)', unit: 'm', color: '#f59e0b' },
  { id: 'dist_sprint_m_25_kmh', name: 'Distancia Sprint', unit: 'm', color: '#ef4444' },
  { id: 'm_por_min', name: 'Intensidad', unit: 'm/min', color: '#10b981' },
  { id: 'vel_max_kmh', name: 'Velocidad Máxima', unit: 'km/h', color: '#8b5cf6' },
  { id: 'sprints_n', name: 'Cantidad Sprints', unit: 'n', color: '#64748b' }
];

export default function GPSIntelligenceDashboard({ performanceRecords, clubs = [], categoryName }: GPSIntelligenceDashboardProps) {
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [sessionData, setSessionData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('TODAS');
  
  // Chart metrics state
  const [barMetricId, setBarMetricId] = useState('dist_total_m');
  const [lineMetricId, setLineMetricId] = useState('m_por_min');

  // 1. Fetch available dates from gps_import
  useEffect(() => {
    const fetchDates = async () => {
      try {
        const { data, error } = await supabase
          .from('gps_import')
          .select('fecha')
          .order('fecha', { ascending: false });
        
        if (error) throw error;
        
        if (data) {
          const uniqueDates = Array.from(new Set(data.map(d => d.fecha))).sort().reverse();
          setAvailableDates(uniqueDates);
          if (uniqueDates.length > 0 && !selectedDate) {
            setSelectedDate(uniqueDates[0]);
          }
        }
      } catch (err) {
        console.error("Error fetching gps dates:", err);
      }
    };
    fetchDates();
  }, []);

  // 2. Fetch session data from gps_import for selected date
  useEffect(() => {
    if (!selectedDate) return;

    const fetchSessionData = async () => {
      setLoading(true);
      try {
        // Fetch GPS records for the date
        const { data: gpsRecords, error: gpsError } = await supabase
          .from('gps_import')
          .select(`
            *,
            players:id_del_jugador (
              id_del_jugador,
              nombre,
              apellido1,
              apellido2,
              club,
              posicion
            )
          `)
          .eq('fecha', selectedDate);
        
        if (gpsError) throw gpsError;

        if (gpsRecords) {
          // Fetch citations for these players on this date to get microcycle and category
          // We need to match player_id and date
          const playerIds = gpsRecords.map(r => r.id_del_jugador);
          
          const { data: citations, error: citError } = await supabase
            .from('citaciones')
            .select(`
              player_id,
              microcycles (
                category_id,
                categories (
                  name
                )
              )
            `)
            .in('player_id', playerIds)
            .eq('fecha_citacion', selectedDate);

          if (citError) console.error("Error fetching citations for categories:", citError);

          // Create a map for quick lookup: playerId -> categoryName
          const playerCategoryMap = new Map();
          citations?.forEach((cit: any) => {
            const catName = cit.microcycles?.categories?.name;
            if (catName) {
              playerCategoryMap.set(cit.player_id, catName.toUpperCase());
            }
          });

          const mapped = gpsRecords.map(d => {
            const p = d.players as any;
            const rawPos = p?.posicion?.toUpperCase() || 'S/D';
            const catName = playerCategoryMap.get(d.id_del_jugador) || 'SIN CATEGORÍA';
            
            return {
              ...d,
              player: {
                ...p,
                name: `${p?.nombre} ${p?.apellido1}`.trim(),
                id: `player-${p?.id_del_jugador}`
              },
              posicion: rawPos,
              categoria: catName,
              posGroup: rawPos.includes('DEF') ? 'DEFENSA' :
                        rawPos.includes('VOL') || rawPos.includes('MED') || rawPos.includes('VOL') ? 'VOLANTE' :
                        rawPos.includes('DEL') || rawPos.includes('EXT') || rawPos.includes('PUN') ? 'DELANTERO' : 'OTROS'
            };
          }).filter(d => !d.posicion.includes('POR') && !d.posicion.includes('ARQ'));
          setSessionData(mapped);
          
          // Reset category filter if it's not valid for the new data
          setSelectedCategory('TODAS');
        }
      } catch (err) {
        console.error("Error fetching gps session data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSessionData();
  }, [selectedDate]);

  const detectedCategories = useMemo(() => {
    const cats = new Set<string>();
    sessionData.forEach(d => {
      if (d.categoria) cats.add(d.categoria);
    });
    return Array.from(cats).sort();
  }, [sessionData]);

  const filteredSessionData = useMemo(() => {
    if (selectedCategory === 'TODAS') return sessionData;
    return sessionData.filter(d => d.categoria === selectedCategory);
  }, [sessionData, selectedCategory]);

  const teamKPIs = useMemo(() => {
    if (filteredSessionData.length === 0) return null;
    const count = filteredSessionData.length;
    return {
      count,
      avgDist: filteredSessionData.reduce((acc, curr) => acc + (Number(curr.dist_total_m) || 0), 0) / count,
      avgHSR: filteredSessionData.reduce((acc, curr) => acc + (Number(curr.dist_mai_m_20_kmh) || 0), 0) / count,
      avgSprint: filteredSessionData.reduce((acc, curr) => acc + (Number(curr.dist_sprint_m_25_kmh) || 0), 0) / count,
      avgInt: filteredSessionData.reduce((acc, curr) => acc + (Number(curr.m_por_min) || 0), 0) / count,
      maxVel: Math.max(...filteredSessionData.map(d => Number(d.vel_max_kmh) || 0))
    };
  }, [filteredSessionData]);

  const positionalData = useMemo(() => {
    const groups = ['DEFENSA', 'VOLANTE', 'DELANTERO'];
    return groups.map(group => {
      const groupPlayers = filteredSessionData.filter(d => d.posGroup === group);
      const count = groupPlayers.length;
      
      const res: any = { name: group };
      METRICS_CONFIG.forEach(m => {
        if (count === 0) {
          res[m.id] = 0;
        } else {
          res[m.id] = groupPlayers.reduce((acc, curr) => acc + (Number(curr[m.id]) || 0), 0) / count;
        }
      });
      return res;
    });
  }, [filteredSessionData]);

  const topPerformers = useMemo(() => {
    return {
      vel: [...filteredSessionData].sort((a, b) => (Number(b.vel_max_kmh) || 0) - (Number(a.vel_max_kmh) || 0)).slice(0, 3),
      sprint: [...filteredSessionData].sort((a, b) => (Number(b.dist_sprint_m_25_kmh) || 0) - (Number(a.dist_sprint_m_25_kmh) || 0)).slice(0, 3),
      sprints: [...filteredSessionData].sort((a, b) => (Number(b.sprints_n) || 0) - (Number(a.sprints_n) || 0)).slice(0, 3)
    };
  }, [filteredSessionData]);

  const currentBarMetric = METRICS_CONFIG.find(m => m.id === barMetricId)!;
  const currentLineMetric = METRICS_CONFIG.find(m => m.id === lineMetricId)!;

  if (loading || !selectedDate) {
    return (
      <div className="flex flex-col items-center justify-center py-40 bg-white rounded-[40px] border border-slate-100 shadow-sm">
        <i className="fa-solid fa-circle-notch fa-spin text-red-600 text-3xl mb-4"></i>
        <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Sincronizando con gps_import...</p>
      </div>
    );
  }

  if (sessionData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[40px] border border-dashed border-slate-200">
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
          <i className="fa-solid fa-satellite-dish text-slate-300 text-3xl animate-pulse"></i>
        </div>
        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">Sin datos en gps_import</h3>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Selecciona otra fecha para analizar</p>
        <input 
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="mt-8 bg-slate-100 border-none rounded-2xl px-6 py-3 text-sm font-black text-slate-900 outline-none"
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* HEADER & FILTERS */}
      <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 flex flex-wrap items-center justify-between gap-8">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic flex items-center gap-3">
            <i className="fa-solid fa-microchip text-red-600"></i>
            Inteligencia GPS {categoryName && <span className="text-red-600 ml-2">— {categoryName}</span>}
          </h2>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">
            {categoryName ? `Análisis de Rendimiento: Selección ${categoryName}` : 'Análisis de Rendimiento por Sesión'}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          {/* CATEGORY FILTER - Only show if more than one category exists */}
          {detectedCategories.length > 1 && (
            <div className="relative">
              <label className="absolute -top-2 left-4 px-2 bg-white text-[8px] font-black text-slate-400 uppercase tracking-widest z-10">Categoría</label>
              <select 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-black text-slate-900 outline-none pr-12 shadow-inner focus:ring-2 focus:ring-red-500 transition-all cursor-pointer"
              >
                <option value="TODAS">TODAS LAS SERIES</option>
                {detectedCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <i className="fa-solid fa-filter absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"></i>
            </div>
          )}

          <div className="relative">
            <label className="absolute -top-2 left-4 px-2 bg-white text-[8px] font-black text-slate-400 uppercase tracking-widest z-10">Fecha de Sesión</label>
            <input 
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-black text-slate-900 outline-none pr-10 shadow-inner focus:ring-2 focus:ring-red-500 transition-all cursor-pointer appearance-none min-w-[200px]"
            />
            <i className="fa-solid fa-calendar-days absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"></i>
          </div>
        </div>
      </div>

      {/* TEAM KPIS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
        <KPIBox label="Atletas" value={teamKPIs?.count || 0} icon="fa-users" color="text-slate-900" />
        <KPIBox label="Dist. Promedio" value={`${Math.round(teamKPIs?.avgDist || 0)}m`} icon="fa-arrows-left-right" color="text-blue-600" />
        <KPIBox label="HSR Promedio" value={`${Math.round(teamKPIs?.avgHSR || 0)}m`} icon="fa-fire-flame-curved" color="text-amber-500" />
        <KPIBox label="Sprint Promedio" value={`${Math.round(teamKPIs?.avgSprint || 0)}m`} icon="fa-bolt" color="text-red-600" />
        <KPIBox label="Intensidad" value={`${(teamKPIs?.avgInt || 0).toFixed(1)} m/m`} icon="fa-gauge-high" color="text-emerald-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* POSITIONAL BENCHMARKING - DYNAMIC COMPOSED CHART */}
        <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 flex flex-col h-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
              <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
              Rendimiento por Posición
            </h3>
            
            <div className="flex items-center gap-2">
              <div className="relative">
                <select 
                  value={barMetricId}
                  onChange={(e) => setBarMetricId(e.target.value)}
                  className="bg-slate-50 border-none rounded-xl px-3 py-2 text-[9px] font-black text-slate-600 outline-none pr-8 shadow-inner appearance-none border border-slate-100"
                >
                  {METRICS_CONFIG.map(m => (
                    <option key={m.id} value={m.id}>📊 {m.name}</option>
                  ))}
                </select>
                <i className="fa-solid fa-chevron-down absolute right-2 top-1/2 -translate-y-1/2 text-[8px] text-slate-300 pointer-events-none"></i>
              </div>
              <span className="text-[10px] font-black text-slate-300">vs</span>
              <div className="relative">
                <select 
                  value={lineMetricId}
                  onChange={(e) => setLineMetricId(e.target.value)}
                  className="bg-slate-50 border-none rounded-xl px-3 py-2 text-[9px] font-black text-slate-600 outline-none pr-8 shadow-inner appearance-none border border-slate-100"
                >
                  {METRICS_CONFIG.map(m => (
                    <option key={m.id} value={m.id}>📈 {m.name}</option>
                  ))}
                </select>
                <i className="fa-solid fa-chevron-down absolute right-2 top-1/2 -translate-y-1/2 text-[8px] text-slate-300 pointer-events-none"></i>
              </div>
            </div>
          </div>
          
          <div className="flex-1 min-h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={positionalData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} fontWeight={900} stroke="#94a3b8" />
                
                {/* Y Axis for Bars (Left) */}
                <YAxis yAxisId="left" axisLine={false} tickLine={false} fontSize={10} fontWeight={900} stroke="#94a3b8" />
                
                {/* Y Axis for Line (Right) */}
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} fontSize={10} fontWeight={900} stroke="#94a3b8" />
                
                <Tooltip 
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: '900', fontSize: '10px' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }} />
                
                <Bar 
                  yAxisId="left" 
                  dataKey={barMetricId} 
                  name={currentBarMetric.name} 
                  fill={currentBarMetric.color} 
                  radius={[6, 6, 0, 0]} 
                  barSize={30} 
                />
                
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey={lineMetricId} 
                  name={currentLineMetric.name} 
                  stroke={currentLineMetric.color} 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: currentLineMetric.color, strokeWidth: 2, stroke: '#fff' }} 
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* INTENSITY SCATTER PLOT */}
        <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-8 text-nowrap">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
              <span className="w-2 h-6 bg-emerald-500 rounded-full"></span>
              Eficiencia: Distancia vs Intensidad
            </h3>
          </div>
          <div className="flex-1 min-h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  type="number" 
                  dataKey="dist_total_m" 
                  name="Distancia" 
                  unit="m" 
                  axisLine={false} 
                  tickLine={false} 
                  fontSize={10} 
                  fontWeight={900} 
                  stroke="#94a3b8"
                  label={{ value: 'Distancia Total (m)', position: 'bottom', fontSize: 9, fontWeight: 900, offset: 0 }}
                />
                <YAxis 
                  type="number" 
                  dataKey="m_por_min" 
                  name="Intensidad" 
                  unit="m/m" 
                  axisLine={false} 
                  tickLine={false} 
                  fontSize={10} 
                  fontWeight={900} 
                  stroke="#94a3b8"
                  label={{ value: 'Metros/Min', angle: -90, position: 'left', fontSize: 9, fontWeight: 900 }}
                />
                <ZAxis type="number" range={[100, 100]} />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#0b1220] p-4 rounded-2xl text-white shadow-2xl border border-white/10">
                          <p className="text-[10px] font-black uppercase italic mb-2">{data.player.nombre} {data.player.apellido1}</p>
                          <div className="space-y-1">
                            <p className="text-[9px] font-bold opacity-60 uppercase">Distancia: {Math.round(data.dist_total_m)}m</p>
                            <p className="text-[9px] font-bold opacity-60 uppercase">Intensidad: {Number(data.m_por_min).toFixed(1)} m/m</p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter name="Jugadores" data={filteredSessionData}>
                  {filteredSessionData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.posGroup === 'DEFENSA' ? '#3b82f6' : entry.posGroup === 'VOLANTE' ? '#10b981' : entry.posGroup === 'DELANTERO' ? '#ef4444' : '#94a3b8'} 
                    />
                  ))}
                </Scatter>
                <ReferenceLine x={teamKPIs?.avgDist} stroke="#94a3b8" strokeDasharray="3 3" label={{ value: 'Avg Dist', position: 'top', fontSize: 8, fontWeight: 900 }} />
                <ReferenceLine y={teamKPIs?.avgInt} stroke="#94a3b8" strokeDasharray="3 3" label={{ value: 'Avg Int', position: 'right', fontSize: 8, fontWeight: 900 }} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-6">
            {['DEFENSA', 'VOLANTE', 'DELANTERO'].map(group => (
              <div key={group} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  group === 'DEFENSA' ? 'bg-blue-500' : 
                  group === 'VOLANTE' ? 'bg-emerald-500' : 
                  'bg-red-500'
                }`}></div>
                <span className="text-[8px] font-black uppercase text-slate-400">{group}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TOP PERFORMERS LEADERBOARD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <LeaderboardCard title="Velocidad Máxima" metric="vel_max_kmh" unit="km/h" data={topPerformers.vel} icon="fa-bolt" color="text-amber-500" bgColor="bg-amber-50" />
        <LeaderboardCard title="Distancia Sprint" metric="dist_sprint_m_25_kmh" unit="m" data={topPerformers.sprint} icon="fa-fire-flame-curved" color="text-red-500" bgColor="bg-red-50" />
        <LeaderboardCard title="Cantidad de Sprints" metric="sprints_n" unit="n" data={topPerformers.sprints} icon="fa-person-running" color="text-blue-500" bgColor="bg-blue-50" />
      </div>

      {/* INDIVIDUAL BREAKDOWN TABLE */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
            <span className="w-2 h-6 bg-slate-900 rounded-full"></span>
            Desglose Individual vs Promedio Posicional
          </h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Comparativa de Intensidad (m/m)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest">
              <tr>
                <th className="px-8 py-4">Jugador</th>
                <th className="px-8 py-4">Posición</th>
                <th className="px-8 py-4">Distancia</th>
                <th className="px-8 py-4">Intensidad</th>
                <th className="px-8 py-4 w-64">vs Promedio Posición</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {[...sessionData].sort((a, b) => (b.m_por_min || b.intensity) - (a.m_por_min || a.intensity)).map((row, idx) => {
                const currentInt = row.m_por_min || row.intensity;
                const posAvg = positionalData.find(p => p.name === row.posGroup)?.int || 0;
                const diff = currentInt - posAvg;
                const percent = posAvg > 0 ? (currentInt / posAvg) * 100 : 0;

                return (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black italic text-[10px] group-hover:bg-red-600 group-hover:text-white transition-all">
                          {row.player.nombre?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-[11px] font-black uppercase text-slate-900 italic leading-none mb-1">{row.player.nombre} {row.player.apellido1}</p>
                          <ClubBadge clubName={row.player.club} clubs={clubs} logoSize="w-3 h-3" className="text-[8px] font-bold text-slate-400 uppercase tracking-widest" />
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-lg">{row.posicion}</span>
                    </td>
                    <td className="px-8 py-4 font-black text-slate-900 text-xs italic">{Math.round(row.totalDistance || row.dist_total_m)}m</td>
                    <td className="px-8 py-4 font-black text-slate-900 text-xs italic">{Number(currentInt).toFixed(1)}</td>
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-1000 ${diff >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(percent, 100)}%` }}
                          ></div>
                        </div>
                        <span className={`text-[9px] font-black min-w-[40px] ${diff >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {diff >= 0 ? '+' : ''}{diff.toFixed(1)}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KPIBox({ label, value, icon, color }: { label: string, value: string | number, icon: string, color: string }) {
  return (
    <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm flex flex-col items-center text-center group hover:shadow-xl transition-all hover:-translate-y-1">
      <div className={`w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center ${color} mb-4 group-hover:scale-110 transition-transform`}>
        <i className={`fa-solid ${icon} text-lg`}></i>
      </div>
      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-xl font-black italic text-slate-900 tracking-tighter">{value}</p>
    </div>
  );
}

function LeaderboardCard({ title, metric, unit, data, icon, color, bgColor }: { title: string, metric: string, unit: string, data: any[], icon: string, color: string, bgColor: string }) {
  return (
    <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
      <div className="flex items-center gap-3 mb-8">
        <div className={`w-8 h-8 rounded-xl ${bgColor} ${color} flex items-center justify-center`}>
          <i className={`fa-solid ${icon} text-xs`}></i>
        </div>
        <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest italic">{title}</h3>
      </div>
      <div className="space-y-4">
        {data.map((player, idx) => (
          <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:bg-white hover:shadow-lg transition-all">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center text-[10px] font-black italic">
                {idx + 1}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-900 italic leading-none mb-1">{player.player.nombre} {player.player.apellido1}</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{player.posicion}</p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-sm font-black italic tracking-tighter ${color}`}>
                {Number(player[metric] || 0).toFixed(metric === 'sprints_n' ? 0 : 1)}
                <span className="text-[8px] not-italic font-bold ml-1 opacity-50">{unit}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
