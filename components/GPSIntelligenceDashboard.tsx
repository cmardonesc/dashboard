
import React, { useMemo, useState, useEffect } from 'react';
import { AthletePerformanceRecord, User, REVERSE_CATEGORY_ID_MAP } from '../types';
import { supabase } from '../lib/supabase';
import { normalizeClub } from '../lib/utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, ScatterChart, Scatter, ZAxis, Cell, ReferenceLine, ComposedChart, Line,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import ClubBadge from './ClubBadge';

interface GPSIntelligenceDashboardProps {
  performanceRecords: AthletePerformanceRecord[];
  clubs?: any[];
  categoryName?: string | null;
  userRole?: string | null;
  userClub?: string | null;
  userClubId?: number | null;
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

export default function GPSIntelligenceDashboard({ performanceRecords, clubs = [], categoryName, userRole, userClub, userClubId }: GPSIntelligenceDashboardProps) {
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [sessionData, setSessionData] = useState<any[]>([]);
  const [referenceData, setReferenceData] = useState<any[]>([]);
  const [dayMatches, setDayMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('TODAS');
  
  // Active Tab state
  const [activeTab, setActiveTab] = useState<'TEAM' | 'INDIVIDUAL'>('TEAM');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  // Chart metrics state
  const [barMetricId, setBarMetricId] = useState('dist_total_m');
  const [lineMetricId, setLineMetricId] = useState('m_por_min');

  const [scatterXMetricId, setScatterXMetricId] = useState('dist_total_m');
  const [scatterYMetricId, setScatterYMetricId] = useState('m_por_min');

  // Leaderboard states
  const [leaderboard1MetricId, setLeaderboard1MetricId] = useState('vel_max_kmh');
  const [leaderboard2MetricId, setLeaderboard2MetricId] = useState('dist_sprint_m_25_kmh');
  const [leaderboard3MetricId, setLeaderboard3MetricId] = useState('sprints_n');

  // Distribution Analysis state
  const [distAnalysisMetricId, setDistAnalysisMetricId] = useState('m_por_min');

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
    
    // Fetch reference data
    const fetchReferences = async () => {
      try {
        const { data, error } = await supabase.from('referencias_gps').select('*');
        if (error) throw error;
        setReferenceData(data || []);
      } catch (err) {
        console.error("Error fetching reference data:", err);
      }
    };
    fetchReferences();
  }, []);

  // 2. Fetch session data from gps_import for selected date
  useEffect(() => {
    if (!selectedDate) return;

    const fetchSessionData = async () => {
      setLoading(true);
      try {
        // Fetch matches for the date
        const { data: matchesForDay, error: matchesErr } = await supabase
          .from('matches')
          .select('*')
          .eq('date', selectedDate);
        
        if (matchesErr) {
          console.error("Error fetching matches for date:", matchesErr);
        } else {
          setDayMatches(matchesForDay || []);
        }

        // Fetch GPS records for the date
        const { data: gpsRecordsRaw, error: gpsError } = await supabase
          .from('gps_import')
          .select('*')
          .eq('fecha', selectedDate);
        
        if (gpsError) throw gpsError;

        if (gpsRecordsRaw && gpsRecordsRaw.length > 0) {
          // Fetch players separately to avoid embedding issues
          const playerIdsForGps = Array.from(new Set(gpsRecordsRaw.map(d => d.player_id)));
          const { data: playersData, error: playersError } = await supabase
            .from('players')
            .select(`
              player_id,
              nombre,
              apellido1,
              apellido2,
              posicion,
              id_club,
              clubes!fk_players_clubes(nombre)
            `)
            .in('player_id', playerIdsForGps);
          
          if (playersError) throw playersError;

          const gpsRecords = gpsRecordsRaw.map(gps => ({
            ...gps,
            players: playersData?.find(p => p.player_id === gps.player_id) || null
          }));

          // Aggregate data by player_id to handle multiple sessions (AM/PM)
          const aggregatedMap = new Map<number, any>();
          gpsRecords.forEach((gps: any) => {
            const pid = gps.player_id;
            if (!aggregatedMap.has(pid)) {
              aggregatedMap.set(pid, { ...gps });
            } else {
              const existing = aggregatedMap.get(pid);
              existing.minutos = (existing.minutos || 0) + (gps.minutos || 0);
              existing.dist_total_m = (existing.dist_total_m || 0) + (gps.dist_total_m || 0);
              existing.dist_ai_m_15_kmh = (existing.dist_ai_m_15_kmh || 0) + (gps.dist_ai_m_15_kmh || 0);
              existing.dist_mai_m_20_kmh = (existing.dist_mai_m_20_kmh || 0) + (gps.dist_mai_m_20_kmh || 0);
              existing.dist_sprint_m_25_kmh = (existing.dist_sprint_m_25_kmh || 0) + (gps.dist_sprint_m_25_kmh || 0);
              existing.sprints_n = (existing.sprints_n || 0) + (gps.sprints_n || 0);
              existing.acc_decc_ai_n = (existing.acc_decc_ai_n || 0) + (gps.acc_decc_ai_n || 0);
              existing.vel_max_kmh = Math.max(existing.vel_max_kmh || 0, gps.vel_max_kmh || 0);
            }
          });

          const finalGpsRecords = Array.from(aggregatedMap.values()).map(gps => {
            if (gps.minutos > 0) {
              gps.m_por_min = gps.dist_total_m / gps.minutos;
            }
            return gps;
          });

          // Fetch citations for these players on this date to get microcycle and category
          const playerIds = finalGpsRecords.map(r => r.player_id);
          
          const { data: citations, error: citError } = await supabase
            .from('citaciones')
            .select(`
              player_id,
              microcycles (
                category_id
              )
            `)
            .in('player_id', playerIds)
            .eq('fecha', selectedDate);

          if (citError) console.error("Error fetching citations for categories:", citError);

          // Create a map for quick lookup: playerId -> categoryId
          const playerCategoryIdMap = new Map();
          citations?.forEach((cit: any) => {
            const catId = cit.microcycles?.category_id;
            if (catId) {
              playerCategoryIdMap.set(cit.player_id, catId);
            }
          });

          let resolvedUserClubId = userClubId;
          if (!resolvedUserClubId && userClub && clubs && clubs.length > 0) {
            const normUserClub = normalizeClub(userClub);
            const matchedClub = clubs.find(c => normalizeClub(c.nombre) === normUserClub);
            if (matchedClub) {
              resolvedUserClubId = matchedClub.id_club;
            }
          }

          const mapped = finalGpsRecords.map(d => {
            const p = d.players as any;
            const rawPos = p?.posicion?.toUpperCase() || 'S/D';
            
            // Priority: Citation Category (ID) > Player Record Category (Text)
            const citationCatId = playerCategoryIdMap.get(d.player_id);
            let catName = 'SIN CATEGORÍA';
            
            if (citationCatId && REVERSE_CATEGORY_ID_MAP[citationCatId]) {
              catName = REVERSE_CATEGORY_ID_MAP[citationCatId].toUpperCase().replace('_', ' ');
            } else if (p?.categoria) {
              catName = p.categoria.toUpperCase().replace('_', ' ');
            }
            
            let finalPlayer = {
              ...p,
              name: `${p?.nombre} ${p?.apellido1} ${p?.apellido2 || ''}`.trim(),
              id: `player-${p?.player_id}`
            };

            // Anonymization logic for club profile
            if (userRole === 'club') {
              let isOwnClub = false;
              if (resolvedUserClubId) {
                isOwnClub = Number(p?.id_club) === Number(resolvedUserClubId);
              } else if (userClub) {
                const clubObj = Array.isArray(p?.clubes) ? p?.clubes[0] : p?.clubes;
                const pClub = clubObj?.nombre || p?.club || '';
                const uClubNorm = normalizeClub(userClub);
                const pClubNorm = normalizeClub(pClub);
                isOwnClub = pClubNorm === uClubNorm;
              }

              if (!isOwnClub) {
                finalPlayer.name = `JUGADOR X [${p?.player_id || 'EXT'}]`;
                finalPlayer.nombre = 'JUGADOR X';
                finalPlayer.apellido1 = `[${p?.player_id || 'EXT'}]`;
                finalPlayer.apellido2 = '';
                finalPlayer.club = 'OTRO CLUB';
              }
            }
            
            return {
              ...d,
              player: finalPlayer,
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
    const getTop = (mId: string) => [...filteredSessionData].sort((a, b) => (Number(b[mId]) || 0) - (Number(a[mId]) || 0)).slice(0, 3);
    return {
      card1: getTop(leaderboard1MetricId),
      card2: getTop(leaderboard2MetricId),
      card3: getTop(leaderboard3MetricId)
    };
  }, [filteredSessionData, leaderboard1MetricId, leaderboard2MetricId, leaderboard3MetricId]);

  const distributionAnalysis = useMemo(() => {
    if (filteredSessionData.length === 0) return null;
    
    const values = filteredSessionData.map(d => Number(d[distAnalysisMetricId]) || 0);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length);

    return {
      mean,
      stdDev,
      elite: filteredSessionData.filter(d => (Number(d[distAnalysisMetricId]) || 0) > mean + stdDev),
      optimal: filteredSessionData.filter(d => {
        const val = Number(d[distAnalysisMetricId]) || 0;
        return val <= mean + stdDev && val > mean;
      }),
      base: filteredSessionData.filter(d => {
        const val = Number(d[distAnalysisMetricId]) || 0;
        return val <= mean && val >= mean - stdDev;
      }),
      critical: filteredSessionData.filter(d => (Number(d[distAnalysisMetricId]) || 0) < mean - stdDev)
    };
  }, [filteredSessionData, distAnalysisMetricId]);

  const currentBarMetric = METRICS_CONFIG.find(m => m.id === barMetricId)!;
  const currentLineMetric = METRICS_CONFIG.find(m => m.id === lineMetricId)!;
  const currentScatterX = METRICS_CONFIG.find(m => m.id === scatterXMetricId)!;
  const currentScatterY = METRICS_CONFIG.find(m => m.id === scatterYMetricId)!;

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
      <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-8">
          <div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic flex items-center gap-3">
              <i className="fa-solid fa-microchip text-red-600"></i>
              Inteligencia GPS {categoryName && <span className="text-red-600 ml-2">— {categoryName}</span>}
            </h2>
            <div className="flex items-center gap-4 mt-2">
              <button 
                onClick={() => setActiveTab('TEAM')}
                className={`text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-xl transition-all ${activeTab === 'TEAM' ? 'bg-red-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
              >
                Análisis de Equipo
              </button>
              <button 
                onClick={() => setActiveTab('INDIVIDUAL')}
                className={`text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-xl transition-all ${activeTab === 'INDIVIDUAL' ? 'bg-red-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
              >
                Visión Individual
              </button>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            {/* PLAYER SELECTOR (Only in Individual Tab) */}
            {activeTab === 'INDIVIDUAL' && (
              <div className="relative animate-in slide-in-from-right duration-300">
                <label className="absolute -top-2 left-4 px-2 bg-white text-[8px] font-black text-slate-400 uppercase tracking-widest z-10">Seleccionar Atleta</label>
                <select 
                  value={selectedPlayerId || ''}
                  onChange={(e) => setSelectedPlayerId(e.target.value)}
                  className="bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-black text-slate-900 outline-none pr-12 shadow-inner focus:ring-2 focus:ring-red-500 transition-all cursor-pointer min-w-[240px]"
                >
                  <option value="">ELIJA UN JUGADOR...</option>
                  {[...filteredSessionData]
                    .filter(d => {
                      if (userRole === 'club') {
                        return d.player && d.player.nombre !== 'JUGADOR X';
                      }
                      return true;
                    })
                    .sort((a, b) => a.player.name.localeCompare(b.player.name))
                    .map(d => (
                      <option key={d.player_id} value={d.player_id}>
                        {d.player.name.toUpperCase()}
                      </option>
                    ))}
                </select>
                <i className="fa-solid fa-user-tag absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"></i>
              </div>
            )}

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

        {/* Dynamic Match Information Banner */}
        {dayMatches.length > 0 && (
          <div className="border-t border-slate-100 pt-5 flex flex-col gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 rounded-full border border-red-100 shadow-sm shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                <span className="text-[8.5px] font-black uppercase tracking-widest">Día de Partido</span>
              </div>
              <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider">
                COINCIDE CON {dayMatches.length === 1 ? '1 PARTIDO PROGRAMADO' : `${dayMatches.length} PARTIDOS PROGRAMADOS`}
              </span>
            </div>
            
            <div className="flex flex-wrap gap-3">
              {dayMatches.map((m, idx) => {
                const catLabel = m.category_id && REVERSE_CATEGORY_ID_MAP[m.category_id]
                  ? REVERSE_CATEGORY_ID_MAP[m.category_id].toUpperCase().replace('SUB_', 'SUB ')
                  : null;
                return (
                  <div key={m.id || idx} className="flex items-center gap-3.5 bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 shadow-inner hover:border-red-100 hover:bg-red-50/5 transition-all">
                    {catLabel && (
                      <span className="text-[8.5px] font-black text-red-600 bg-red-50 border border-red-100 rounded-md px-2 py-0.5 shadow-sm uppercase shrink-0">
                        {catLabel}
                      </span>
                    )}
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wide">
                      {m.competition_type || 'Partido'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-300">vs</span>
                    <ClubBadge 
                      clubName={m.opponent} 
                      clubs={clubs} 
                      showName={true} 
                      logoSize="w-5 h-5" 
                      className="text-xs font-black text-slate-900 uppercase tracking-wider" 
                    />
                    {m.result && (
                      <div className="flex items-center gap-1 bg-slate-900 border border-slate-900 text-white rounded-lg px-2.5 py-1 shadow-inner shrink-0">
                        <span className="text-[7.5px] font-black uppercase tracking-widest text-slate-400">RES:</span>
                        <span className="font-mono text-xs font-black leading-none">{m.result}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {activeTab === 'TEAM' ? (
        <>
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                  <span className="w-2 h-6 bg-emerald-500 rounded-full"></span>
                  Eficiencia de Rendimiento
                </h3>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <select 
                      value={scatterXMetricId}
                      onChange={(e) => setScatterXMetricId(e.target.value)}
                      className="bg-slate-50 border-none rounded-xl px-3 py-2 text-[9px] font-black text-slate-600 outline-none pr-8 shadow-inner appearance-none border border-slate-100"
                    >
                      {METRICS_CONFIG.map(m => (
                        <option key={m.id} value={m.id}>X: {m.name}</option>
                      ))}
                    </select>
                    <i className="fa-solid fa-chevron-down absolute right-2 top-1/2 -translate-y-1/2 text-[8px] text-slate-300 pointer-events-none"></i>
                  </div>
                  <span className="text-[10px] font-black text-slate-300">vs</span>
                  <div className="relative">
                    <select 
                      value={scatterYMetricId}
                      onChange={(e) => setScatterYMetricId(e.target.value)}
                      className="bg-slate-50 border-none rounded-xl px-3 py-2 text-[9px] font-black text-slate-600 outline-none pr-8 shadow-inner appearance-none border border-slate-100"
                    >
                      {METRICS_CONFIG.map(m => (
                        <option key={m.id} value={m.id}>Y: {m.name}</option>
                      ))}
                    </select>
                    <i className="fa-solid fa-chevron-down absolute right-2 top-1/2 -translate-y-1/2 text-[8px] text-slate-300 pointer-events-none"></i>
                  </div>
                </div>
              </div>
              <div className="flex-1 min-h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 40, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      type="number" 
                      dataKey={scatterXMetricId} 
                      name={currentScatterX.name} 
                      unit={currentScatterX.unit} 
                      axisLine={false} 
                      tickLine={false} 
                      fontSize={10} 
                      fontWeight={900} 
                      stroke="#94a3b8"
                      label={{ value: `${currentScatterX.name} (${currentScatterX.unit})`, position: 'bottom', fontSize: 9, fontWeight: 900, offset: 0 }}
                    />
                    <YAxis 
                      type="number" 
                      dataKey={scatterYMetricId} 
                      name={currentScatterY.name} 
                      unit={currentScatterY.unit} 
                      axisLine={false} 
                      tickLine={false} 
                      fontSize={10} 
                      fontWeight={900} 
                      stroke="#94a3b8"
                      label={{ value: `${currentScatterY.name} (${currentScatterY.unit})`, angle: -90, position: 'left', fontSize: 9, fontWeight: 900 }}
                    />
                    <ZAxis type="number" range={[100, 100]} />
                    <Tooltip 
                      cursor={{ strokeDasharray: '3 3' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-[#0b1220] p-4 rounded-2xl text-white shadow-2xl border border-white/10">
                              <p className="text-[10px] font-black uppercase italic mb-2">{data.player.nombre} {data.player.apellido1} {data.player.apellido2 || ''}</p>
                              <div className="space-y-1">
                                <p className="text-[9px] font-bold opacity-60 uppercase">{currentScatterX.name}: {Math.round(data[scatterXMetricId])}{currentScatterX.unit}</p>
                                <p className="text-[9px] font-bold opacity-60 uppercase">{currentScatterY.name}: {Number(data[scatterYMetricId]).toFixed(1)}{currentScatterY.unit}</p>
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
                    <ReferenceLine 
                      x={filteredSessionData.reduce((acc, curr) => acc + (Number(curr[scatterXMetricId]) || 0), 0) / (filteredSessionData.length || 1)} 
                      stroke="#94a3b8" 
                      strokeDasharray="3 3" 
                      label={{ value: 'Avg X', position: 'top', fontSize: 8, fontWeight: 900 }} 
                    />
                    <ReferenceLine 
                      y={filteredSessionData.reduce((acc, curr) => acc + (Number(curr[scatterYMetricId]) || 0), 0) / (filteredSessionData.length || 1)} 
                      stroke="#94a3b8" 
                      strokeDasharray="3 3" 
                      label={{ value: 'Avg Y', position: 'right', fontSize: 8, fontWeight: 900 }} 
                    />
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
            <LeaderboardCard 
              title="Ranking #1" 
              metricId={leaderboard1MetricId} 
              onMetricChange={setLeaderboard1MetricId}
              data={topPerformers.card1} 
            />
            <LeaderboardCard 
              title="Ranking #2" 
              metricId={leaderboard2MetricId} 
              onMetricChange={setLeaderboard2MetricId}
              data={topPerformers.card2} 
            />
            <LeaderboardCard 
              title="Ranking #3" 
              metricId={leaderboard3MetricId} 
              onMetricChange={setLeaderboard3MetricId}
              data={topPerformers.card3} 
            />
          </div>

          {/* DISTRIBUTION ANALYSIS SECTION */}
          <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm flex flex-col gap-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic flex items-center gap-3">
                  <i className="fa-solid fa-chart-area text-red-600"></i>
                  Perfil de Distribución del Grupo
                </h3>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Análisis Estadístico por Desviación Estándar</p>
              </div>
              
              <div className="relative">
                <label className="absolute -top-2 left-4 px-2 bg-white text-[8px] font-black text-slate-400 uppercase tracking-widest z-10">Parámetro a Analizar</label>
                <select 
                  value={distAnalysisMetricId}
                  onChange={(e) => setDistAnalysisMetricId(e.target.value)}
                  className="bg-slate-50 border-none rounded-2xl px-6 py-4 text-xs font-black text-slate-900 outline-none pr-12 shadow-inner focus:ring-2 focus:ring-red-500 transition-all cursor-pointer min-w-[240px]"
                >
                  {METRICS_CONFIG.map(m => (
                    <option key={m.id} value={m.id}>{m.name.toUpperCase()}</option>
                  ))}
                </select>
                <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"></i>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <DistributionZone 
                title="Nivel Élite" 
                subtitle="> Promedio +1 DE"
                players={distributionAnalysis?.elite || []} 
                metricId={distAnalysisMetricId}
                color="text-emerald-600" 
                bgColor="bg-emerald-50"
                icon="fa-angles-up"
              />
              <DistributionZone 
                title="Rendimiento Óptimo" 
                subtitle="Promedio a +1 DE"
                players={distributionAnalysis?.optimal || []} 
                metricId={distAnalysisMetricId}
                color="text-blue-600" 
                bgColor="bg-blue-50"
                icon="fa-circle-check"
              />
              <DistributionZone 
                title="Rendimiento Base" 
                subtitle="-1 DE a Promedio"
                players={distributionAnalysis?.base || []} 
                metricId={distAnalysisMetricId}
                color="text-slate-500" 
                bgColor="bg-slate-100"
                icon="fa-minus"
              />
              <DistributionZone 
                title="Zona Crítica" 
                subtitle="< Promedio -1 DE"
                players={distributionAnalysis?.critical || []} 
                metricId={distAnalysisMetricId}
                color="text-red-600" 
                bgColor="bg-red-50"
                icon="fa-angles-down"
              />
            </div>
            
            <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 flex flex-wrap items-center justify-center gap-12">
                <div className="text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">PROMEDIO (μ)</p>
                    <p className="text-xl font-black text-slate-900 italic">
                        {(distributionAnalysis?.mean || 0).toFixed(1)}
                        <span className="text-[10px] ml-1 opacity-40">{METRICS_CONFIG.find(m => m.id === distAnalysisMetricId)?.unit}</span>
                    </p>
                </div>
                <div className="w-px h-8 bg-slate-200"></div>
                <div className="text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">DESVIACIÓN ESTÁNDAR (σ)</p>
                    <p className="text-xl font-black text-slate-900 italic">
                        ±{(distributionAnalysis?.stdDev || 0).toFixed(1)}
                        <span className="text-[10px] ml-1 opacity-40">{METRICS_CONFIG.find(m => m.id === distAnalysisMetricId)?.unit}</span>
                    </p>
                </div>
            </div>
          </div>
        </>
      ) : (
        <IndividualPerformanceView 
          playerId={selectedPlayerId} 
          sessionData={userRole === 'club'
            ? filteredSessionData.filter(d => d.player && d.player.nombre !== 'JUGADOR X')
            : filteredSessionData} 
          positionalAverages={positionalData}
          referenceData={referenceData}
          clubs={clubs}
        />
      )}

    </div>
  );
}

function IndividualPerformanceView({ playerId, sessionData, positionalAverages, referenceData, clubs }: { playerId: string | null, sessionData: any[], positionalAverages: any[], referenceData: any[], clubs: any[] }) {
  const playerData = useMemo(() => {
    if (!playerId) return null;
    return sessionData.find(d => String(d.player_id) === String(playerId));
  }, [playerId, sessionData]);

  const posAvg = useMemo(() => {
    if (!playerData) return null;
    return positionalAverages.find(a => a.name === playerData.posGroup);
  }, [playerData, positionalAverages]);

  const radarData = useMemo(() => {
    if (!playerData) return [];
    return METRICS_CONFIG.map(m => {
      const pValue = Number(playerData[m.id]) || 0;
      const aValue = Number(posAvg?.[m.id]) || 0;
      
      // Normalize values to 0-100 scale for radar
      const maxValue = Math.max(pValue, aValue, 1);
      
      return {
        name: m.name,
        player: pValue,
        average: aValue,
        playerPercent: (pValue / maxValue) * 100,
        avgPercent: (aValue / maxValue) * 100,
        fullMark: 100,
        unit: m.unit
      };
    });
  }, [playerData, posAvg]);

  const comparisonData = useMemo(() => {
    if (!playerData) return [];
    return METRICS_CONFIG.map(m => {
      const pValue = Number(playerData[m.id]) || 0;
      const aValue = Number(posAvg?.[m.id]) || 0;
      const diff = aValue > 0 ? ((pValue - aValue) / aValue) * 100 : 0;
      
      return {
        name: m.name,
        player: pValue,
        average: aValue,
        diff: diff,
        unit: m.unit,
        color: m.color
      };
    });
  }, [playerData, posAvg]);

  const irpData = useMemo(() => {
    if (!playerData) return null;
    
    const pos = playerData.posicion || '';
    const dist = Number(playerData.dist_total_m) || 0;
    const int = Number(playerData.m_por_min) || 0;
    const hsr = Number(playerData.dist_mai_m_20_kmh) || 0;
    const sprint = Number(playerData.dist_sprint_m_25_kmh) || 0;
    const maxVel = Number(playerData.vel_max_kmh) || 0;
    const accDec = Number(playerData.acc_decc_ai_n) || 0;

    const mins = Number(playerData.minutos) || 90;
    // Calculate a factor relative to a full 90-minute official match, capped at 1.0 (100%)
    const timeFactor = Math.min(Math.max(mins, 1) / 90, 1.0);

    // Ideal high performance targets (U15 to U20 standards for a full 90-minute match)
    const baseTargets = {
      dist: 11000,
      int: 120,    // already relative (m/min)
      hsr: 800,
      sprint: 300,
      maxVel: 32,  // peak velocity in km/h is not time-dependent
      accDec: 130
    };

    // Adjusted targets based on session duration
    const targets = {
      dist: baseTargets.dist * timeFactor,
      int: baseTargets.int,
      hsr: baseTargets.hsr * timeFactor,
      sprint: baseTargets.sprint * timeFactor,
      maxVel: baseTargets.maxVel,
      accDec: baseTargets.accDec * timeFactor
    };

    const ratio = (val: number, target: number) => Math.min(Math.max(val / target, 0), 1);
    const rawPos = pos.toUpperCase();

    let score = NaN;
    let profile = '';
    let focus = '';
    let tradeoff = '';
    let description = '';
    let dimensions: any[] = [];

    const isVolante = rawPos.includes('VOL') || rawPos.includes('MED');
    const isLateral = rawPos.includes('LAT') || rawPos.includes('BAND') || rawPos.includes('CARRIL');
    const isCentral = rawPos.includes('DEFENSA CENTRAL') || rawPos.includes('CENTRAL') || (rawPos.includes('DEFENSA') && !isLateral);
    const isExtremo = rawPos.includes('EXTREMO') || rawPos.includes('WINGER') || rawPos.includes('EXT');

    if (isVolante) {
      profile = 'Volante (Rodillo Aeróbico)';
      focus = 'Carga Total (45%) y Agilidad/Transición (30%)';
      tradeoff = 'Maximiza la cobertura box-to-box y recuperación; sacrifica explosividad defensiva fija central.';
      description = 'El motor del equipo. Su rol demanda un despliegue de cobertura total del campo de juego a ritmos sostenidos y constantes dirección/giro rápidos.';
      dimensions = [
        { 
          name: 'Carga Semanal (Volumen)', 
          weight: '45%', 
          weightVal: 45,
          value: ratio(dist, targets.dist) * 100,
          metricLabel: 'Distancia Total',
          metricVal: dist,
          unit: 'm',
          baseTarget: baseTargets.dist,
          adjustedTarget: targets.dist,
          isTimeAdjusted: true,
          scoreContribution: ratio(dist, targets.dist) * 45
        },
        { 
          name: 'Agilidad (Frenos/Acel)', 
          weight: '30%', 
          weightVal: 30,
          value: ratio(accDec, targets.accDec) * 100,
          metricLabel: 'Aceleraciones y Desaceleraciones AI (>3 m/s²)',
          metricVal: accDec,
          unit: 'acc/dec',
          baseTarget: baseTargets.accDec,
          adjustedTarget: targets.accDec,
          isTimeAdjusted: true,
          scoreContribution: ratio(accDec, targets.accDec) * 30
        },
        { 
          name: 'Intensidad de Juego (m/min)', 
          weight: '15%', 
          weightVal: 15,
          value: ratio(int, targets.int) * 100,
          metricLabel: 'Metros recorridos por Minuto',
          metricVal: int,
          unit: 'm/min',
          baseTarget: baseTargets.int,
          adjustedTarget: targets.int,
          isTimeAdjusted: false,
          scoreContribution: ratio(int, targets.int) * 15
        },
        { 
          name: 'Muy Alta Intensidad (HSR)', 
          weight: '10%', 
          weightVal: 10,
          value: ratio(hsr, targets.hsr) * 100,
          metricLabel: 'Carrera a Alta Velocidad (20-25 km/h)',
          metricVal: hsr,
          unit: 'm',
          baseTarget: baseTargets.hsr,
          adjustedTarget: targets.hsr,
          isTimeAdjusted: true,
          scoreContribution: ratio(hsr, targets.hsr) * 10
        }
      ];
      score = Math.round(ratio(dist, targets.dist) * 45 + ratio(accDec, targets.accDec) * 30 + ratio(int, targets.int) * 15 + ratio(hsr, targets.hsr) * 10);
    } else if (isLateral) {
      profile = 'Defensa Lateral (Explosivo Defensivo)';
      focus = 'Explosividad de Carrera (40%) e Intensidad de Ida/Vuelta (35%)';
      tradeoff = 'Maximiza transiciones verticales intensas; sacrifica anclaje posicional y conservación estática.';
      description = 'El velocista de banda. Exige capacidad para desdoblarse constantemente y sostener ritmos de juego y sprints de ida y vuelta lineales.';
      dimensions = [
        { 
          name: 'Explosividad (Sprints m)', 
          weight: '40%', 
          weightVal: 40,
          value: ratio(sprint, targets.sprint) * 100,
          metricLabel: 'Sprints de Alta Intensidad (>25 km/h)',
          metricVal: sprint,
          unit: 'm',
          baseTarget: baseTargets.sprint,
          adjustedTarget: targets.sprint,
          isTimeAdjusted: true,
          scoreContribution: ratio(sprint, targets.sprint) * 40
        },
        { 
          name: 'Intensidad Relativa (m/min)', 
          weight: '35%', 
          weightVal: 35,
          value: ratio(int, targets.int) * 100,
          metricLabel: 'Metros recorridos por Minuto',
          metricVal: int,
          unit: 'm/min',
          baseTarget: baseTargets.int,
          adjustedTarget: targets.int,
          isTimeAdjusted: false,
          scoreContribution: ratio(int, targets.int) * 35
        },
        { 
          name: 'Carga / Volumen de Apoyos', 
          weight: '15%', 
          weightVal: 15,
          value: ratio(dist, targets.dist) * 100,
          metricLabel: 'Distancia Total',
          metricVal: dist,
          unit: 'm',
          baseTarget: baseTargets.dist,
          adjustedTarget: targets.dist,
          isTimeAdjusted: true,
          scoreContribution: ratio(dist, targets.dist) * 15
        },
        { 
          name: 'Agilidad Reactiva (Acc)', 
          weight: '10%', 
          weightVal: 10,
          value: ratio(accDec, targets.accDec) * 100,
          metricLabel: 'Aceleraciones y Desaceleraciones AI (>3 m/s²)',
          metricVal: accDec,
          unit: 'acc/dec',
          baseTarget: baseTargets.accDec,
          adjustedTarget: targets.accDec,
          isTimeAdjusted: true,
          scoreContribution: ratio(accDec, targets.accDec) * 10
        }
      ];
      score = Math.round(ratio(sprint, targets.sprint) * 40 + ratio(int, targets.int) * 35 + ratio(dist, targets.dist) * 15 + ratio(accDec, targets.accDec) * 10);
    } else if (isCentral) {
      profile = 'Defensa Central (Guardián Reactivo)';
      focus = 'Velocidad de Respuesta (35%) y Picos Acelerativos (30%)';
      tradeoff = 'Maximiza respuesta de pánico a alta velocidad; sacrifica recorrido continuo de fondo (Carga de trote reducida).';
      description = 'El protector de área. Privilegia la velocidad de retroceso absoluto y picos de fuerza/frenada de emergencia sobre la distancia recorrida total.';
      dimensions = [
        { 
          name: 'Velocidad Máxima de Cierre', 
          weight: '35%', 
          weightVal: 35,
          value: ratio(maxVel, targets.maxVel) * 100,
          metricLabel: 'Velocidad Máxima Alcanzada',
          metricVal: maxVel,
          unit: 'km/h',
          baseTarget: baseTargets.maxVel,
          adjustedTarget: targets.maxVel,
          isTimeAdjusted: false,
          scoreContribution: ratio(maxVel, targets.maxVel) * 35
        },
        { 
          name: 'Picos Reactivos (Acc/Dec)', 
          weight: '30%', 
          weightVal: 30,
          value: ratio(accDec, targets.accDec) * 100,
          metricLabel: 'Aceleraciones y Desaceleraciones AI (>3 m/s²)',
          metricVal: accDec,
          unit: 'acc/dec',
          baseTarget: baseTargets.accDec,
          adjustedTarget: targets.accDec,
          isTimeAdjusted: true,
          scoreContribution: ratio(accDec, targets.accDec) * 30
        },
        { 
          name: 'Alta Intensidad HSR Cobertura', 
          weight: '20%', 
          weightVal: 20,
          value: ratio(hsr, targets.hsr) * 100,
          metricLabel: 'Carrera a Alta Velocidad (20-25 km/h)',
          metricVal: hsr,
          unit: 'm',
          baseTarget: baseTargets.hsr,
          adjustedTarget: targets.hsr,
          isTimeAdjusted: true,
          scoreContribution: ratio(hsr, targets.hsr) * 20
        },
        { 
          name: 'Carga de Resguardo Pasivo', 
          weight: '15%', 
          weightVal: 15,
          value: ratio(dist, targets.dist) * 100,
          metricLabel: 'Distancia Total',
          metricVal: dist,
          unit: 'm',
          baseTarget: baseTargets.dist,
          adjustedTarget: targets.dist,
          isTimeAdjusted: true,
          scoreContribution: ratio(dist, targets.dist) * 15
        }
      ];
      score = Math.round(ratio(maxVel, targets.maxVel) * 35 + ratio(accDec, targets.accDec) * 30 + ratio(hsr, targets.hsr) * 20 + ratio(dist, targets.dist) * 15);
    } else if (isExtremo) {
      profile = 'Delantero Extremo (Velocista)';
      focus = 'Fuerza de Sprint (40%) y Agilidad Drill (35%)';
      tradeoff = 'Maximiza desbordes reiterados en 1v1 con fatiga; sacrifica soporte táctico posicional replegado.';
      description = 'El rompedor de líneas. Su desempeño se mide por la cantidad y distancia de sprints a máxima velocidad en duelos 1c1 y desmarques de ruptura.';
      dimensions = [
        { 
          name: 'Sprints de Rompimiento (Sprint m)', 
          weight: '40%', 
          weightVal: 40,
          value: ratio(sprint, targets.sprint) * 100,
          metricLabel: 'Sprints de Alta Intensidad (>25 km/h)',
          metricVal: sprint,
          unit: 'm',
          baseTarget: baseTargets.sprint,
          adjustedTarget: targets.sprint,
          isTimeAdjusted: true,
          scoreContribution: ratio(sprint, targets.sprint) * 40
        },
        { 
          name: 'Agilidad / Cambios de Ritmo', 
          weight: '35%', 
          weightVal: 35,
          value: ratio(accDec, targets.accDec) * 100,
          metricLabel: 'Aceleraciones y Desaceleraciones AI (>3 m/s²)',
          metricVal: accDec,
          unit: 'acc/dec',
          baseTarget: baseTargets.accDec,
          adjustedTarget: targets.accDec,
          isTimeAdjusted: true,
          scoreContribution: ratio(accDec, targets.accDec) * 35
        },
        { 
          name: 'Intensidad en Repliegues', 
          weight: '15%', 
          weightVal: 15,
          value: ratio(int, targets.int) * 100,
          metricLabel: 'Metros recorridos por Minuto',
          metricVal: int,
          unit: 'm/min',
          baseTarget: baseTargets.int,
          adjustedTarget: targets.int,
          isTimeAdjusted: false,
          scoreContribution: ratio(int, targets.int) * 15
        },
        { 
          name: 'Volumen Acumulado', 
          weight: '10%', 
          weightVal: 10,
          value: ratio(dist, targets.dist) * 100,
          metricLabel: 'Distancia Total',
          metricVal: dist,
          unit: 'm',
          baseTarget: baseTargets.dist,
          adjustedTarget: targets.dist,
          isTimeAdjusted: true,
          scoreContribution: ratio(dist, targets.dist) * 10
        }
      ];
      score = Math.round(ratio(sprint, targets.sprint) * 40 + ratio(accDec, targets.accDec) * 35 + ratio(int, targets.int) * 15 + ratio(dist, targets.dist) * 10);
    } else {
      // Default / Delantero Centro
      profile = 'Delantero Centro (Finalizador Versátil)';
      focus = 'Intensidad de Presión (35%) y Sprints en Área (25%)';
      tradeoff = 'Maximiza explosión y remate en área chica; sacrifica distancias amplias y patrullaje defensivo.';
      description = 'El definidor del bloque. Exige un equilibrio entre m/min (presión y apoyos cortos) y sprints específicos dentro de la zona de finalización.';
      dimensions = [
        { 
          name: 'Intensidad de Trabajo (m/min)', 
          weight: '35%', 
          weightVal: 35,
          value: ratio(int, targets.int) * 100,
          metricLabel: 'Metros recorridos por Minuto',
          metricVal: int,
          unit: 'm/min',
          baseTarget: baseTargets.int,
          adjustedTarget: targets.int,
          isTimeAdjusted: false,
          scoreContribution: ratio(int, targets.int) * 35
        },
        { 
          name: 'Sprints Cortos de Definición', 
          weight: '25%', 
          weightVal: 25,
          value: ratio(sprint, targets.sprint) * 100,
          metricLabel: 'Sprints de Alta Intensidad (>21 km/h)',
          metricVal: sprint,
          unit: 'm',
          baseTarget: baseTargets.sprint,
          adjustedTarget: targets.sprint,
          isTimeAdjusted: true,
          scoreContribution: ratio(sprint, targets.sprint) * 25
        },
        { 
          name: 'Agilidad/Acción Rápida Acc', 
          weight: '20%', 
          weightVal: 20,
          value: ratio(accDec, targets.accDec) * 100,
          metricLabel: 'Aceleraciones y Desaceleraciones AI (>3 m/s²)',
          metricVal: accDec,
          unit: 'acc/dec',
          baseTarget: baseTargets.accDec,
          adjustedTarget: targets.accDec,
          isTimeAdjusted: true,
          scoreContribution: ratio(accDec, targets.accDec) * 20
        },
        { 
          name: 'Carga de Desmarques de Apoyo', 
          weight: '20%', 
          weightVal: 20,
          value: ratio(dist, targets.dist) * 100,
          metricLabel: 'Distancia Total',
          metricVal: dist,
          unit: 'm',
          baseTarget: baseTargets.dist,
          adjustedTarget: targets.dist,
          isTimeAdjusted: true,
          scoreContribution: ratio(dist, targets.dist) * 20
        }
      ];
      score = Math.round(ratio(int, targets.int) * 35 + ratio(sprint, targets.sprint) * 25 + ratio(accDec, targets.accDec) * 20 + ratio(dist, targets.dist) * 20);
    }

    // Force exact benchmark value if mapped in database rows (like the CSV values provided)
    if (playerData.irp_posicional !== undefined && playerData.irp_posicional !== null && !isNaN(Number(playerData.irp_posicional))) {
      score = Math.round(Number(playerData.irp_posicional));
    }

    // Determine level rating
    let level = 'S/D';
    let levelColor = 'text-slate-400 bg-slate-50 border-slate-200';
    let levelText = '';
    
    if (score >= 80) {
      level = 'Rendimiento Élite';
      levelColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
      levelText = 'El atleta se encuentra en el percentil superior del patrón del fútbol profesional. Cumple plenamente con la demanda fisiológica específica de su puesto.';
    } else if (score >= 50) {
      level = 'Rendimiento Competitivo';
      levelColor = 'text-blue-700 bg-blue-50 border-blue-200';
      levelText = 'Rendimiento aceptable y equilibrado. Se sugieren estímulos específicos en su dimensión de mayor ponderación para alcanzar el estándar de élite.';
    } else {
      level = 'Déficit Fisiológico';
      levelColor = 'text-amber-700 bg-amber-50 border-amber-200';
      levelText = 'Déficit de demanda posicional detectado en la sesión. Planifique microciclos de ajuste o acondicionamiento enfocado para elevar la capacidad adaptativa.';
    }

    return {
      score,
      profile,
      focus,
      tradeoff,
      description,
      dimensions,
      level,
      levelColor,
      levelText,
      mins,
      timeFactor
    };
  }, [playerData]);

  if (!playerId || !playerData) {
    return (
      <div className="bg-white rounded-[40px] p-20 border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
          <i className="fa-solid fa-user-magnifying-glass text-slate-300 text-4xl animate-bounce"></i>
        </div>
        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic">Selecciona un Atleta</h3>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Utiliza el buscador superior para analizar métricas individuales</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom duration-500">
      {/* PLAYER HEADER CARD */}
      <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-10">
        <div className="w-32 h-32 rounded-[48px] bg-slate-900 flex items-center justify-center text-5xl font-black italic text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-red-600 opacity-0 group-hover:opacity-20 transition-opacity"></div>
          {playerData.player.nombre?.charAt(0)}
        </div>
        
        <div className="flex-1 text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-2">
            <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">
              {playerData.player.name}
            </h2>
            <span className="bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border border-slate-200">
              {playerData.posicion}
            </span>
          </div>
          <ClubBadge clubName={playerData.player.club} idClub={playerData.player.id_club} clubs={clubs} logoSize="w-5 h-5" className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] italic mb-6 justify-center md:justify-start" />
          
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-12 border-t border-slate-50 pt-6">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">POSICIÓN GRUPAL</p>
              <p className="text-lg font-black text-slate-900">{playerData.posGroup}</p>
            </div>
            <div className="w-px h-8 bg-slate-100 hidden sm:block"></div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">DORSAL</p>
              <p className="text-lg font-black text-slate-900">#—</p>
            </div>
            <div className="w-px h-8 bg-slate-100 hidden sm:block"></div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">CATEGORÍA</p>
              <p className="text-lg font-black text-slate-900">{playerData.categoria}</p>
            </div>
          </div>
        </div>
      </div>

      {/* EVALUACIÓN POSICIONAL IRP (ÍNDICE REFERENCIAL POSICIONAL) */}
      {irpData && (
        <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm space-y-8">
          <div>
            <span className="bg-red-50 text-red-600 text-[9px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border border-red-100">
              Evaluación Posicional Avanzada
            </span>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic mt-3 flex items-center gap-3">
              <i className="fa-solid fa-gauge-simple-high text-red-600"></i>
              Índice Referencial Posicional (IRP)
            </h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>Desglose de demanda fisiológica y nivel adaptativo para {playerData.posicion}</span>
              <span className="inline-flex items-center gap-1 bg-sky-50 text-sky-700 text-[9px] px-2.5 py-0.5 rounded-full border border-sky-200 font-extrabold tracking-wide">
                <i className="fa-regular fa-clock text-[10px]"></i>
                AJUSTADO PROPORCIONALMENTE A LA SESIÓN ({irpData.mins} MINS / {Math.round(irpData.timeFactor * 100)}% VOL. PARTIDO)
              </span>
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* SCORE CIRCULAR CONTAINER */}
            <div className="bg-slate-50 rounded-[32px] p-8 border border-slate-100 flex flex-col items-center justify-center text-center space-y-6">
              <div className="relative flex items-center justify-center">
                {/* Simulated circle with simple radial borders */}
                <div className="w-32 h-32 rounded-full border-8 border-slate-200 flex items-center justify-center relative shadow-inner">
                  <div className="absolute inset-0 rounded-full border-8 border-red-600 animate-pulse" style={{ clipPath: `polygon(50% 50%, -50% -50%, ${irpData.score * 3.6}% -50%)`, transform: 'rotate(-90deg)' }}></div>
                  <span className="text-4xl font-black italic text-slate-900 tracking-tighter">
                    {irpData.score}
                    <span className="text-xs text-slate-400 not-italic ml-0.5">/100</span>
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <span className={`inline-block text-[9px] font-black uppercase tracking-widest px-4 py-1 rounded-full border ${irpData.levelColor}`}>
                  {irpData.level}
                </span>
                <p className="text-[10px] text-slate-500 font-bold leading-relaxed px-4 pt-2">
                  {irpData.levelText}
                </p>
              </div>
            </div>

            {/* DIMENSIONS BARS PROGRESS */}
            <div className="bg-slate-50 rounded-[32px] p-8 border border-slate-100 space-y-5">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                Dimensiones Específicas del Perfil
              </h4>
              <div className="space-y-4">
                {irpData.dimensions.map((dim: any, idx: number) => {
                  let barColor = 'bg-slate-400';
                  if (dim.value >= 80) barColor = 'bg-emerald-500';
                  else if (dim.value >= 50) barColor = 'bg-blue-500';
                  else barColor = 'bg-amber-500';

                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-[10px] font-black text-slate-700 uppercase">
                        <span>{dim.name} <span className="text-[8px] text-slate-400">({dim.weight})</span></span>
                        <span>{Math.round(dim.value)}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className={`h-full ${barColor} transition-all duration-1000`} style={{ width: `${dim.value}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CLINICAL SUMMARY & TRADEOFF */}
            <div className="bg-slate-50 rounded-[32px] p-8 border border-slate-100 flex flex-col justify-between space-y-6">
              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Perfil de Demanda Posicional
                </h4>
                <p className="text-xs font-black text-slate-900 uppercase tracking-tighter italic">
                  {irpData.profile}
                </p>
                <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
                  {irpData.description}
                </p>
              </div>

              <div className="border-t border-slate-200 pt-4 space-y-2">
                <h4 className="text-[10px] font-black text-red-600 uppercase tracking-[0.2em] flex items-center gap-2">
                  <i className="fa-solid fa-scale-unbalanced-flip"></i>
                  Compromiso Fisiológico (Trade-off)
                </h4>
                <p className="text-[10px] font-bold text-slate-500 leading-relaxed">
                  {irpData.tradeoff}
                </p>
              </div>
            </div>
          </div>

          {/* SECCIÓN DETALLADA DE DESGLOSE MATEMÁTICO DEL IRP */}
          <div className="border-t border-slate-100 pt-8 space-y-6">
            <div>
              <span className="bg-sky-50 text-sky-700 text-[9px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border border-sky-100">
                Transparencia Algorítmica
              </span>
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-tighter italic mt-3 flex items-center gap-2">
                <i className="fa-solid fa-calculator text-sky-600"></i>
                Desglose Matemático y Parámetros del IRP
              </h4>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                Fórmula general: <span className="text-slate-700 font-extrabold">IRP = Σ ( Dimensión Ratio × Peso )</span>. Máximo 100 puntos. Las metas volumétricas se reducen proporcionalmente si el tiempo de juego es menor a 90 minutos.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {irpData.dimensions.map((dim: any, idx: number) => {
                const isSatisfied = dim.metricVal >= dim.adjustedTarget;
                return (
                  <div key={idx} className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-[9px] font-black bg-slate-200/60 text-slate-700 px-2.5 py-0.5 rounded-md uppercase tracking-wide">
                          Dim {idx + 1} ({dim.weight})
                        </span>
                        <div className="text-right">
                          <span className="text-xs font-black text-slate-800">
                            +{Math.round(dim.scoreContribution * 10) / 10} pts
                          </span>
                        </div>
                      </div>
                      <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-tighter italic mt-2.5 leading-tight">
                        {dim.name}
                      </h5>
                      <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                        {dim.metricLabel}
                      </p>
                    </div>

                    <div className="border-t border-slate-200/50 pt-3 space-y-1.5">
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span className="font-medium">Estándar (90 Mins):</span>
                        <span className="font-bold text-slate-700">{Math.round(dim.baseTarget * 10) / 10} {dim.unit}</span>
                      </div>
                      
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span className="font-medium">Ajuste de Tiempo:</span>
                        <span className="font-bold text-slate-700">
                          {dim.isTimeAdjusted ? `× ${Math.round(irpData.timeFactor * 100)}% (Proporcional)` : 'Sin ajuste (Fisiológico)'}
                        </span>
                      </div>

                      <div className="flex justify-between text-[10px] text-slate-500 bg-sky-50/50 px-2 py-1 rounded">
                        <span className="font-bold text-sky-800">Meta Ajustada:</span>
                        <span className="font-black text-sky-900">{Math.round(dim.adjustedTarget * 10) / 10} {dim.unit}</span>
                      </div>

                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span className="font-medium">Valor Jugador:</span>
                        <span className={`font-black ${isSatisfied ? 'text-emerald-700 font-extrabold' : 'text-slate-800'}`}>
                          {Math.round(dim.metricVal * 10) / 10} {dim.unit}
                        </span>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl p-2.5 border border-slate-200/60 space-y-1">
                      <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none">CÁLCULO DEL RATIO</p>
                      <div className="flex justify-between items-baseline">
                        <span className="text-[9px] font-mono text-slate-400">
                          Min( {Math.round(dim.metricVal)} / {Math.round(dim.adjustedTarget)} , 1.0 )
                        </span>
                        <span className="text-[10px] font-black font-mono text-slate-800">
                          = {Math.round(dim.value)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* RADAR PROFILE CHART */}
        <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm flex flex-col h-full">
          <div className="mb-8">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
              <span className="w-2 h-6 bg-red-600 rounded-full"></span>
              Perfil de Rendimiento (Radar)
            </h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Comparativa Multivariable vs Promedio {playerData.posGroup}</p>
          </div>
          
          <div className="flex-1 min-h-[400px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="#f1f5f9" />
                <PolarAngleAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                   name="Atleta"
                   dataKey="playerPercent"
                   stroke="#ef4444"
                   fill="#ef4444"
                   fillOpacity={0.6}
                />
                <Radar
                   name="Promedio Equipo"
                   dataKey="avgPercent"
                   stroke="#94a3b8"
                   fill="#94a3b8"
                   fillOpacity={0.2}
                />
                <Tooltip 
                   contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: '900', fontSize: '10px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* METRIC CARDS GRID */}
        <div className="grid grid-cols-2 gap-4">
          {comparisonData.map((m, idx) => (
             <div key={idx} className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm flex flex-col justify-between group hover:shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{m.name}</p>
                   <div className={`text-[10px] font-black px-2 py-1 rounded-lg ${m.diff >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                      {m.diff >= 0 ? '+' : ''}{Math.round(m.diff)}%
                   </div>
                </div>
                <div>
                   <p className="text-3xl font-black text-slate-900 italic tracking-tighter">
                     {m.player.toFixed(1)}
                     <span className="text-xs ml-1 opacity-20 not-italic">{m.unit}</span>
                   </p>
                   <div className="w-full h-1 bg-slate-50 rounded-full mt-4 overflow-hidden relative">
                      <div 
                        className={`absolute h-full transition-all duration-1000 ${m.diff >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(Math.max((m.player / (Math.max(m.player, m.average) || 1)) * 100, 0), 100)}%` }}
                      ></div>
                      {/* Avg reference line */}
                      <div className="absolute top-0 bottom-0 w-0.5 bg-slate-300 left-[50%] z-10 opacity-50"></div>
                   </div>
                   <p className="text-[8px] font-bold text-slate-400 uppercase mt-2">Promedio Posicional: {m.average.toFixed(1)}{m.unit}</p>
                </div>
             </div>
          ))}
        </div>
      </div>

      {/* REFERENCE STANDARDS SECTION (Sub 15, 17, 20) */}
      <div className="bg-slate-900 rounded-[48px] p-10 border border-white/5 shadow-2xl space-y-10">
        <div className="flex flex-col items-center text-center">
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic flex items-center gap-4">
              <span className="w-12 h-px bg-red-600"></span>
              Puntos de Referencia Nacional 
              <span className="w-12 h-px bg-red-600"></span>
            </h3>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2 italic">Comparativa de Alto Rendimiento por Categoría</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           {['SUB 15', 'SUB 17', 'SUB 20'].map(category => (
             <ReferenceRadarSet 
                key={category} 
                category={category} 
                playerData={playerData}
                referenceData={referenceData}
             />
           ))}
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-8 bg-black/20 p-6 rounded-[32px] border border-white/5">
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                <span className="text-[9px] font-black text-white/60 uppercase tracking-widest">ATLETA</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full opacity-60"></div>
                <span className="text-[9px] font-black text-white/50 uppercase tracking-widest">PROMEDIO REF.</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 border border-white/20 rounded-full"></div>
                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">RANGO (MIN-MAX)</span>
            </div>
        </div>
      </div>
    </div>
  );
}

function ReferenceRadarSet({ category, playerData, referenceData }: { category: string, playerData: any, referenceData: any[] }) {
  const radarData = useMemo(() => {
    if (!playerData || referenceData.length === 0) return [];
    
    // Find references for this category and position
    // First, let's find the position match. 
    // Data posGroup is 'DEFENSA', 'VOLANTE', 'DELANTERO'
    const normalizedCategory = category.toUpperCase().replace(' ', '_');
    const displayCategory = category.toUpperCase(); // "SUB 15"
    
    const posRefs = referenceData.filter(r => {
        const rCat = (r['Categoria'] || r['Categoría'] || '').toUpperCase();
        const rPos = (r['Posicion'] || r['Posición'] || '').toUpperCase();
        const pGroup = playerData.posGroup.toUpperCase();
        
        // Categoría match (handle "SUB 15" vs "SUB_15")
        const catMatch = rCat === normalizedCategory || rCat === displayCategory;
        
        // Posicion match (map VOLANTE to MEDIO if needed)
        let posMatch = rPos === pGroup;
        if (!posMatch && pGroup === 'VOLANTE') posMatch = rPos === 'MEDIO';
        if (!posMatch && pGroup === 'DELANTERO') posMatch = rPos === 'ATACANTE';
        
        return catMatch && posMatch;
    });

    const findByTipo = (type: string) => posRefs.find(r => {
        const rTipo = (r['Tipo'] || '').toUpperCase();
        const search = type.toUpperCase();
        return rTipo.includes(search) || search.includes(rTipo);
    });

    const minRef = findByTipo('MIN');
    const avgRef = findByTipo('PROM');
    const maxRef = findByTipo('MAX');

    const MAPPING: Record<string, string> = {
      'dist_total_m': 'Total Distance (m)',
      'm_por_min': 'Metros/min',
      'dist_mai_m_20_kmh': 'MAInt >20km/h',
      'dist_sprint_m_25_kmh': 'Sprint >25 km/h',
      'sprints_n': '# SP',
      'vel_max_kmh': 'Max Vel (km/h)'
    };

    return METRICS_CONFIG.map(m => {
      const pValue = Number(playerData[m.id]) || 0;
      
      const refKey = MAPPING[m.id];
      const vMin = Number(minRef?.[refKey]) || 0;
      const vAvg = Number(avgRef?.[refKey]) || 0;
      const vMax = Number(maxRef?.[refKey]) || 0;

      // Normalization: 0-100 based on the maximum reference value + 10% buffer
      // This ensures the shapes are visible and not always at the edge
      const limit = Math.max(vMax, pValue, 1) * 1.1;

      return {
        name: m.name,
        player: (pValue / limit) * 100,
        min: (vMin / limit) * 100,
        avg: (vAvg / limit) * 100,
        max: (vMax / limit) * 100,
        rawPlayer: pValue,
        rawMin: vMin,
        rawAvg: vAvg,
        rawMax: vMax,
        unit: m.unit
      };
    });
  }, [category, playerData, referenceData]);

  if (radarData.length === 0) return null;

  return (
    <div className="bg-white/5 rounded-[40px] p-6 border border-white/5 flex flex-col h-full group hover:bg-white/10 transition-all">
      <div className="text-center mb-6">
        <h4 className="text-sm font-black text-white italic tracking-widest">{category}</h4>
        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-loose">Padrón Elites U. Católica / Chile</p>
      </div>

      <div className="flex-1 min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
            <PolarGrid stroke="rgba(255,255,255,0.1)" />
            <PolarAngleAxis 
              dataKey="name" 
              tick={{ fontSize: 7, fontWeight: 900, fill: 'rgba(255,255,255,0.4)' }} 
            />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            
            {/* REFERENCE AREA (MIN to MAX) */}
            <Radar
              name="Rango Referencia"
              dataKey="max"
              stroke="rgba(59, 130, 246, 0.3)"
              fill="rgba(59, 130, 246, 0.05)"
              fillOpacity={0.2}
              strokeDasharray="4 4"
            />
            
            <Radar
              name="Promedio Ref"
              dataKey="avg"
              stroke="rgba(59, 130, 246, 0.8)"
              fill="transparent"
              strokeWidth={2}
            />

            <Radar
              name="Atleta"
              dataKey="player"
              stroke="#ef4444"
              fill="#ef4444"
              fillOpacity={0.3}
              strokeWidth={3}
            />

            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-[#0b1220] p-4 rounded-2xl text-white shadow-2xl border border-white/10">
                      <p className="text-[10px] font-black uppercase mb-2">{data.name}</p>
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold text-red-400 uppercase">JUGADOR: {data.rawPlayer.toFixed(1)}{data.unit}</p>
                        <p className="text-[9px] font-bold text-blue-300 uppercase">PROM REF: {data.rawAvg.toFixed(1)}{data.unit}</p>
                        <p className="text-[9px] font-bold text-white/40 uppercase">MIN-MAX: {data.rawMin.toFixed(1)}-{data.rawMax.toFixed(1)}{data.unit}</p>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
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

function LeaderboardCard({ title, metricId, onMetricChange, data }: { title: string, metricId: string, onMetricChange: (m: string) => void, data: any[] }) {
  const metricConfig = METRICS_CONFIG.find(m => m.id === metricId)!;
  const color = metricConfig.color;
  const unit = metricConfig.unit;

  return (
    <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 flex flex-col h-full group hover:shadow-xl transition-all">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-900 shadow-sm">
            <i className="fa-solid fa-ranking-star text-xs"></i>
          </div>
          <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest italic">{title}</h3>
        </div>
        
        <div className="relative">
          <select 
            value={metricId}
            onChange={(e) => onMetricChange(e.target.value)}
            className="bg-slate-50 border-none rounded-xl px-3 py-1.5 text-[9px] font-black text-slate-500 outline-none pr-7 shadow-inner appearance-none border border-slate-100 cursor-pointer hover:bg-white transition-colors"
          >
            {METRICS_CONFIG.map(m => (
              <option key={m.id} value={m.id}>{m.name.toUpperCase()}</option>
            ))}
          </select>
          <i className="fa-solid fa-chevron-down absolute right-2 top-1/2 -translate-y-1/2 text-[8px] text-slate-300 pointer-events-none"></i>
        </div>
      </div>

      <div className="space-y-4 flex-1">
        {data.length === 0 ? (
          <div className="py-10 text-center opacity-20">
             <i className="fa-solid fa-user-slash text-2xl mb-2"></i>
             <p className="text-[8px] font-black uppercase">Sin datos</p>
          </div>
        ) : data.map((player, idx) => (
          <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-3xl border border-slate-100 group-hover:bg-white hover:shadow-lg transition-all border-l-4" style={{ borderLeftColor: color }}>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center text-[10px] font-black italic">
                {idx + 1}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-900 italic leading-none mb-1 truncate w-24 sm:w-auto">{player.player.nombre} {player.player.apellido1} {player.player.apellido2 || ''}</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{player.posicion}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-black italic tracking-tighter" style={{ color }}>
                {Number(player[metricId] || 0).toFixed(metricId === 'sprints_n' ? 0 : 1)}
                <span className="text-[8px] not-italic font-bold ml-1 opacity-50">{unit}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DistributionZone({ title, subtitle, players, metricId, color, bgColor, icon }: { title: string, subtitle: string, players: any[], metricId: string, color: string, bgColor: string, icon: string }) {
  const metricConfig = METRICS_CONFIG.find(m => m.id === metricId)!;
  
  return (
    <div className="bg-white rounded-[32px] border border-slate-100 p-6 flex flex-col h-full hover:shadow-lg transition-all overflow-hidden relative">
      <div className={`absolute top-0 right-0 w-24 h-24 ${bgColor} rounded-full rotate-45 -mr-12 -mt-12 opacity-50`}></div>
      
      <div className="flex items-start justify-between mb-6 relative z-10">
        <div>
          <h4 className={`text-[10px] font-black uppercase tracking-tighter ${color} mb-0.5`}>{title}</h4>
          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{subtitle}</p>
        </div>
        <div className={`w-8 h-8 rounded-xl ${bgColor} ${color} flex items-center justify-center`}>
          <i className={`fa-solid ${icon} text-xs`}></i>
        </div>
      </div>

      <div className="mb-4 relative z-10">
        <span className="text-2xl font-black text-slate-900 italic">{players.length}</span>
        <span className="text-[9px] font-black text-slate-400 uppercase ml-2">ATLETAS</span>
      </div>

      <div className="flex-1 space-y-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar relative z-10">
        {players.map((p, idx) => (
          <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 group">
             <span className="text-[9px] font-bold text-slate-600 uppercase truncate w-24">{p.player.nombre} {p.player.apellido1} {p.player.apellido2 || ''}</span>
             <span className="text-[9px] font-black text-slate-900 italic">
               {Number(p[metricId]).toFixed(metricId === 'sprints_n' ? 0 : 1)}
             </span>
          </div>
        ))}
        {players.length === 0 && <p className="text-[8px] font-bold text-slate-300 uppercase italic text-center py-4">Sin registros</p>}
      </div>
    </div>
  );
}
