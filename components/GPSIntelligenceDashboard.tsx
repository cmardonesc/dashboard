
import React, { useMemo, useState } from 'react';
import { AthletePerformanceRecord } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, ScatterChart, Scatter, ZAxis, Cell, ReferenceLine
} from 'recharts';
import ClubBadge from './ClubBadge';

interface GPSIntelligenceDashboardProps {
  performanceRecords: AthletePerformanceRecord[];
  clubs?: any[];
  categoryName?: string | null;
}

const POSITIONS = ['DEFENSA', 'VOLANTE', 'DELANTERO', 'PORTERO'];

export default function GPSIntelligenceDashboard({ performanceRecords, clubs = [], categoryName }: GPSIntelligenceDashboardProps) {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Default to the most recent date in the GPS data
    const allDates = performanceRecords.flatMap(r => r.gps.map(g => g.date)).sort();
    return allDates.length > 0 ? allDates[allDates.length - 1] : new Date().toISOString().split('T')[0];
  });

  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    performanceRecords.forEach(r => r.gps.forEach(g => dates.add(g.date)));
    return Array.from(dates).sort().reverse();
  }, [performanceRecords]);

  // Sync selectedDate when availableDates changes (e.g. due to filtering)
  // This ensures that if the current date is no longer available, we pick the most recent one.
  React.useEffect(() => {
    if (availableDates.length > 0 && !availableDates.includes(selectedDate)) {
      setSelectedDate(availableDates[0]);
    }
  }, [availableDates, selectedDate]);

  const sessionData = useMemo(() => {
    const data: any[] = [];
    performanceRecords.forEach(record => {
      const gpsSession = record.gps.find(g => g.date === selectedDate);
      if (gpsSession) {
        data.push({
          ...gpsSession,
          player: record.player,
          posicion: record.player.position?.toUpperCase() || 'S/D',
          // Normalizar posición a categorías generales
          posGroup: record.player.position?.toUpperCase().includes('DEF') ? 'DEFENSA' :
                    record.player.position?.toUpperCase().includes('VOL') || record.player.position?.toUpperCase().includes('MED') ? 'VOLANTE' :
                    record.player.position?.toUpperCase().includes('DEL') || record.player.position?.toUpperCase().includes('EXT') ? 'DELANTERO' :
                    record.player.position?.toUpperCase().includes('POR') ? 'PORTERO' : 'OTROS'
        });
      }
    });
    return data;
  }, [performanceRecords, selectedDate]);

  const teamKPIs = useMemo(() => {
    if (sessionData.length === 0) return null;
    const count = sessionData.length;
    return {
      count,
      avgDist: sessionData.reduce((acc, curr) => acc + (Number(curr.totalDistance || curr.dist_total_m) || 0), 0) / count,
      avgHSR: sessionData.reduce((acc, curr) => acc + (Number(curr.dist_mai_m_20_kmh || curr.hsrDistance) || 0), 0) / count,
      avgSprint: sessionData.reduce((acc, curr) => acc + (Number(curr.dist_sprint_m_25_kmh || curr.sprintCount) || 0), 0) / count,
      avgInt: sessionData.reduce((acc, curr) => acc + (Number(curr.m_por_min || curr.intensity) || 0), 0) / count,
      maxVel: Math.max(...sessionData.map(d => Number(d.maxSpeed || d.vel_max_kmh) || 0))
    };
  }, [sessionData]);

  const positionalData = useMemo(() => {
    const groups = ['DEFENSA', 'VOLANTE', 'DELANTERO'];
    return groups.map(group => {
      const groupPlayers = sessionData.filter(d => d.posGroup === group);
      const count = groupPlayers.length;
      if (count === 0) return { name: group, dist: 0, hsr: 0, sprint: 0, int: 0 };
      return {
        name: group,
        dist: groupPlayers.reduce((acc, curr) => acc + (Number(curr.totalDistance || curr.dist_total_m) || 0), 0) / count,
        hsr: groupPlayers.reduce((acc, curr) => acc + (Number(curr.dist_mai_m_20_kmh || curr.hsrDistance) || 0), 0) / count,
        sprint: groupPlayers.reduce((acc, curr) => acc + (Number(curr.dist_sprint_m_25_kmh || curr.sprintCount) || 0), 0) / count,
        int: groupPlayers.reduce((acc, curr) => acc + (Number(curr.m_por_min || curr.intensity) || 0), 0) / count
      };
    });
  }, [sessionData]);

  const topPerformers = useMemo(() => {
    return {
      vel: [...sessionData].sort((a, b) => (Number(b.maxSpeed || b.vel_max_kmh) || 0) - (Number(a.maxSpeed || a.vel_max_kmh) || 0)).slice(0, 3),
      sprint: [...sessionData].sort((a, b) => (Number(b.dist_sprint_m_25_kmh || b.sprintCount) || 0) - (Number(a.dist_sprint_m_25_kmh || a.sprintCount) || 0)).slice(0, 3),
      volume: [...sessionData].sort((a, b) => (Number(b.totalDistance || b.dist_total_m) || 0) - (Number(a.totalDistance || a.dist_total_m) || 0)).slice(0, 3)
    };
  }, [sessionData]);

  if (sessionData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[40px] border border-dashed border-slate-200">
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
          <i className="fa-solid fa-satellite-dish text-slate-300 text-3xl animate-pulse"></i>
        </div>
        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">Sin datos de GPS</h3>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Selecciona otra fecha para analizar</p>
        <select 
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="mt-8 bg-slate-100 border-none rounded-2xl px-6 py-3 text-sm font-black text-slate-900 outline-none"
        >
          {availableDates.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
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
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <label className="absolute -top-2 left-4 px-2 bg-white text-[8px] font-black text-slate-400 uppercase tracking-widest z-10">Fecha de Sesión</label>
            <select 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-black text-slate-900 outline-none pr-12 shadow-inner focus:ring-2 focus:ring-red-500 transition-all cursor-pointer w-full"
            >
              {availableDates.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <i className="fa-solid fa-calendar absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"></i>
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
        {/* POSITIONAL BENCHMARKING */}
        <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
              <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
              Rendimiento por Posición
            </h3>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={positionalData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} fontWeight={900} stroke="#94a3b8" />
                <YAxis axisLine={false} tickLine={false} fontSize={10} fontWeight={900} stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: '900', fontSize: '10px' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }} />
                <Bar dataKey="dist" name="Distancia (m)" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={30} />
                <Bar dataKey="hsr" name="HSR (m)" fill="#f59e0b" radius={[6, 6, 0, 0]} barSize={30} />
                <Bar dataKey="sprint" name="Sprint (m)" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* INTENSITY SCATTER PLOT */}
        <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
              <span className="w-2 h-6 bg-emerald-500 rounded-full"></span>
              Eficiencia: Distancia vs Intensidad
            </h3>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  type="number" 
                  dataKey={(d) => d.totalDistance || d.dist_total_m} 
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
                  dataKey={(d) => d.m_por_min || d.intensity} 
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
                            <p className="text-[9px] font-bold opacity-60 uppercase">Distancia: {Math.round(data.totalDistance || data.dist_total_m)}m</p>
                            <p className="text-[9px] font-bold opacity-60 uppercase">Intensidad: {Number(data.m_por_min || data.intensity).toFixed(1)} m/m</p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter name="Jugadores" data={sessionData}>
                  {sessionData.map((entry, index) => (
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
          <div className="flex justify-center gap-6 mt-4">
            {['DEFENSA', 'VOLANTE', 'DELANTERO'].map(group => (
              <div key={group} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${group === 'DEFENSA' ? 'bg-blue-500' : group === 'VOLANTE' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                <span className="text-[8px] font-black uppercase text-slate-400">{group}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TOP PERFORMERS LEADERBOARD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <LeaderboardCard title="Velocidad Máxima" metric="maxSpeed" unit="km/h" data={topPerformers.vel} icon="fa-bolt" color="text-amber-500" bgColor="bg-amber-50" />
        <LeaderboardCard title="Distancia Sprint" metric="dist_sprint_m_25_kmh" unit="m" data={topPerformers.sprint} icon="fa-fire-flame-curved" color="text-red-500" bgColor="bg-red-50" />
        <LeaderboardCard title="Volumen Total" metric="totalDistance" unit="m" data={topPerformers.volume} icon="fa-arrows-left-right" color="text-blue-500" bgColor="bg-blue-50" />
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
                {Number(player[metric] || player.totalDistance || player.maxSpeed || player.dist_sprint_m_25_kmh).toFixed(metric === 'totalDistance' ? 0 : 1)}
                <span className="text-[8px] not-italic font-bold ml-1 opacity-50">{unit}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
