import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Category, CATEGORY_ID_MAP, CATEGORY_COLORS } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, ComposedChart
} from 'recharts';

interface GpsInternacionalDashboardProps {
  clubs?: any[];
  userRole?: string | null;
  userClub?: string | null;
}

const METRICS = [
  { id: 'dist_total_m', name: 'Distancia Total', unit: 'm', color: '#dc2626' }, // Rojo Chile
  { id: 'dist_mai_m_20_kmh', name: 'Distancia HSR (20+ km/h)', unit: 'm', color: '#f59e0b' }, // Amber
  { id: 'dist_sprint_m_25_kmh', name: 'Distancia Sprint (25+ km/h)', unit: 'm', color: '#ef4444' }, // Light red
  { id: 'm_por_min', name: 'Intensidad de Juego', unit: 'm/min', color: '#10b981' }, // Emerald
  { id: 'sprints_n', name: 'Cantidad de Sprints', unit: 'n', color: '#3b82f6' }, // Blue
  { id: 'vel_max_kmh', name: 'Velocidad Máxima', unit: 'km/h', color: '#8b5cf6' } // Purple
];

export default function GpsInternacionalDashboard({ clubs = [], userRole, userClub }: GpsInternacionalDashboardProps) {
  // Navigation & Filtering
  const [selectedCategory, setSelectedCategory] = useState<string>('TODAS');
  const [matches, setMatches] = useState<any[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');
  const [loadingMatches, setLoadingMatches] = useState(false);
  
  // GPS Data
  const [gpsData, setGpsData] = useState<any[]>([]);
  const [loadingGps, setLoadingGps] = useState(false);
  const [allPlayersGps, setAllPlayersGps] = useState<any[]>([]);

  // Historical International Match GPS averages for trend analysis
  const [historicalMatchAverages, setHistoricalMatchAverages] = useState<any[]>([]);

  // UI Tabs
  const [activeTab, setActiveTab] = useState<'TEAM' | 'INDIVIDUAL'>('TEAM');
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);

  // Selected Metrics for charts
  const [selectedMetricId, setSelectedMetricId] = useState<string>('dist_total_m');

  // Categories helper
  const categoryList = ['TODAS', ...Object.values(Category)];

  // 1. Fetch International Matches
  useEffect(() => {
    const fetchInternationalMatches = async () => {
      setLoadingMatches(true);
      try {
        let query = supabase
          .from('matches')
          .select('*')
          .or('competition_type.ilike.%internacional%,competition_type.ilike.%mundial%,competition_type.ilike.%sudamericano%')
          .order('date', { ascending: false });

        if (selectedCategory !== 'TODAS') {
          const categoryId = CATEGORY_ID_MAP[selectedCategory.toLowerCase()];
          if (categoryId) {
            query = query.eq('category_id', categoryId);
          }
        }

        const { data, error } = await query;
        if (error) throw error;

        setMatches(data || []);
        if (data && data.length > 0) {
          // Keep current if still available, else set first
          const exists = data.some(m => m.id === selectedMatchId);
          if (!exists) {
            setSelectedMatchId(data[0].id);
          }
        } else {
          setSelectedMatchId('');
        }
      } catch (err) {
        console.error('Error fetching international matches:', err);
      } finally {
        setLoadingMatches(false);
      }
    };

    fetchInternationalMatches();
  }, [selectedCategory]);

  const selectedMatch = useMemo(() => {
    return matches.find(m => m.id === selectedMatchId) || null;
  }, [matches, selectedMatchId]);

  // 2. Fetch GPS import data for the selected match date
  useEffect(() => {
    if (!selectedMatch) {
      setGpsData([]);
      setAllPlayersGps([]);
      return;
    }

    const fetchGpsDataForMatch = async () => {
      setLoadingGps(true);
      try {
        // Query gps_import records matching the match date
        const { data: gpsRaw, error: gpsError } = await supabase
          .from('gps_import')
          .select('*')
          .eq('fecha', selectedMatch.date);

        if (gpsError) throw gpsError;

        if (!gpsRaw || gpsRaw.length === 0) {
          setGpsData([]);
          setAllPlayersGps([]);
          setLoadingGps(false);
          return;
        }

        // Fetch player names and positions to join
        const playerIds = Array.from(new Set(gpsRaw.map(g => g.player_id)));
        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('player_id, nombre, apellido1, apellido2, posicion, club_name')
          .in('player_id', playerIds);

        if (playersError) throw playersError;

        // Map and clean records
        const mappedGps = gpsRaw.map(gps => {
          const p = playersData?.find(pl => pl.player_id === gps.player_id);
          const fullName = p ? `${p.nombre} ${p.apellido1}` : `ID: ${gps.player_id}`;
          const posicionGeneral = p?.posicion?.toUpperCase() || 'VOLANTE';
          
          // Categorize position into tactically meaningful buckets
          let tactica = 'VOLANTE';
          if (posicionGeneral.includes('DEF') || posicionGeneral.includes('ZAG') || posicionGeneral.includes('LAT') || posicionGeneral.includes('LÍB')) {
            tactica = 'DEFENSA';
          } else if (posicionGeneral.includes('DEL') || posicionGeneral.includes('EXT') || posicionGeneral.includes('PUN') || posicionGeneral.includes('CER')) {
            tactica = 'DELANTERO';
          } else if (posicionGeneral.includes('ARQ') || posicionGeneral.includes('POR')) {
            tactica = 'ARQUERO';
          }

          return {
            ...gps,
            fullName,
            posicion: p?.posicion || 'Volante',
            lineaTactica: tactica,
            club_name: p?.club_name || 'Selección',
            m_por_min: gps.minutos > 0 ? Number((gps.dist_total_m / gps.minutos).toFixed(1)) : 0
          };
        });

        // If a player has multiple segments in the same day (rare for matches, but handles aggregate), group them
        const aggregatedMap = new Map<number, any>();
        mappedGps.forEach((item) => {
          const pid = item.player_id;
          if (!aggregatedMap.has(pid)) {
            aggregatedMap.set(pid, { ...item });
          } else {
            const existing = aggregatedMap.get(pid);
            existing.minutos += item.minutos;
            existing.dist_total_m += item.dist_total_m;
            existing.dist_ai_m_15_kmh += item.dist_ai_m_15_kmh;
            existing.dist_mai_m_20_kmh += item.dist_mai_m_20_kmh;
            existing.dist_sprint_m_25_kmh += item.dist_sprint_m_25_kmh;
            existing.sprints_n += item.sprints_n;
            existing.acc_decc_ai_n += item.acc_decc_ai_n;
            existing.vel_max_kmh = Math.max(existing.vel_max_kmh, item.vel_max_kmh);
            existing.m_por_min = existing.minutos > 0 ? Number((existing.dist_total_m / existing.minutos).toFixed(1)) : 0;
          }
        });

        const finalGps = Array.from(aggregatedMap.values());
        setGpsData(finalGps);
        setAllPlayersGps(finalGps);

        if (finalGps.length > 0) {
          setSelectedPlayerId(finalGps[0].player_id);
        }
      } catch (err) {
        console.error('Error fetching GPS match data:', err);
      } finally {
        setLoadingGps(false);
      }
    };

    fetchGpsDataForMatch();
  }, [selectedMatch]);

  // 3. Fetch historical match averages for the selected category
  useEffect(() => {
    if (!selectedMatch) return;

    const fetchHistoricalAverages = async () => {
      try {
        // Fetch all international matches in the same category
        let matchQuery = supabase
          .from('matches')
          .select('id, date, opponent, competition_type')
          .or('competition_type.ilike.%internacional%,competition_type.ilike.%mundial%,competition_type.ilike.%sudamericano%')
          .eq('category_id', selectedMatch.category_id)
          .order('date', { ascending: true })
          .limit(8); // limit to last 8 games to keep chart readable

        const { data: catMatches, error: matchErr } = await matchQuery;
        if (matchErr) throw matchErr;

        if (!catMatches || catMatches.length === 0) return;

        const dates = catMatches.map(m => m.date);

        // Fetch gps records for those dates
        const { data: gpsHistory, error: gpsHistoryErr } = await supabase
          .from('gps_import')
          .select('fecha, dist_total_m, minutos, dist_sprint_m_25_kmh, vel_max_kmh')
          .in('fecha', dates);

        if (gpsHistoryErr) throw gpsHistoryErr;

        // Group by match date and calculate averages
        const matchStats = catMatches.map(m => {
          const matchGps = gpsHistory?.filter(g => g.fecha === m.date) || [];
          if (matchGps.length === 0) return null;

          const totalDistance = matchGps.reduce((acc, curr) => acc + (curr.dist_total_m || 0), 0);
          const totalMinutos = matchGps.reduce((acc, curr) => acc + (curr.minutos || 0), 0);
          const totalSprintsDist = matchGps.reduce((acc, curr) => acc + (curr.dist_sprint_m_25_kmh || 0), 0);
          const avgMaxSpeed = matchGps.reduce((acc, curr) => acc + (curr.vel_max_kmh || 0), 0) / matchGps.length;

          return {
            dateStr: `${m.opponent} (${m.date.slice(5)})`,
            opponent: m.opponent,
            avgDistance: Math.round(totalDistance / matchGps.length),
            avgIntensity: totalMinutos > 0 ? Number((totalDistance / totalMinutos).toFixed(1)) : 0,
            avgSprint: Math.round(totalSprintsDist / matchGps.length),
            maxSpeed: Number(avgMaxSpeed.toFixed(1))
          };
        }).filter(item => item !== null);

        setHistoricalMatchAverages(matchStats);
      } catch (err) {
        console.error('Error fetching historical international GPS averages:', err);
      }
    };

    fetchHistoricalAverages();
  }, [selectedMatch]);

  // 4. Team Level Stats & KPIs
  const teamKPIs = useMemo(() => {
    if (gpsData.length === 0) return null;

    const count = gpsData.length;
    const avgDistance = Math.round(gpsData.reduce((acc, cur) => acc + (cur.dist_total_m || 0), 0) / count);
    const avgSprint = Math.round(gpsData.reduce((acc, cur) => acc + (cur.dist_sprint_m_25_kmh || 0), 0) / count);
    const avgIntensity = Number((gpsData.reduce((acc, cur) => acc + (cur.m_por_min || 0), 0) / count).toFixed(1));
    const avgSprintsCount = Number((gpsData.reduce((acc, cur) => acc + (cur.sprints_n || 0), 0) / count).toFixed(1));

    // Peak stats
    const topSpeedPlayer = [...gpsData].sort((a, b) => (b.vel_max_kmh || 0) - (a.vel_max_kmh || 0))[0];
    const topDistancePlayer = [...gpsData].sort((a, b) => (b.dist_total_m || 0) - (a.dist_total_m || 0))[0];
    const topSprintPlayer = [...gpsData].sort((a, b) => (b.dist_sprint_m_25_kmh || 0) - (a.dist_sprint_m_25_kmh || 0))[0];

    return {
      avgDistance,
      avgSprint,
      avgIntensity,
      avgSprintsCount,
      topSpeed: topSpeedPlayer ? { name: topSpeedPlayer.fullName, value: topSpeedPlayer.vel_max_kmh } : null,
      topDistance: topDistancePlayer ? { name: topDistancePlayer.fullName, value: topDistancePlayer.dist_total_m } : null,
      topSprint: topSprintPlayer ? { name: topSprintPlayer.fullName, value: topSprintPlayer.dist_sprint_m_25_kmh } : null
    };
  }, [gpsData]);

  // 5. Line/Tactical Group Averages (Defensas vs Volantes vs Delanteros)
  const lineAverages = useMemo(() => {
    if (gpsData.length === 0) return [];

    const lines = ['DEFENSA', 'VOLANTE', 'DELANTERO'];
    return lines.map(line => {
      const linePlayers = gpsData.filter(g => g.lineaTactica === line);
      if (linePlayers.length === 0) return null;

      const count = linePlayers.length;
      return {
        line,
        'Distancia Total': Math.round(linePlayers.reduce((acc, cur) => acc + (cur.dist_total_m || 0), 0) / count),
        'HSR': Math.round(linePlayers.reduce((acc, cur) => acc + (cur.dist_mai_m_20_kmh || 0), 0) / count),
        'Sprint': Math.round(linePlayers.reduce((acc, cur) => acc + (cur.dist_sprint_m_25_kmh || 0), 0) / count),
        'Intensidad': Number((linePlayers.reduce((acc, cur) => acc + (cur.m_por_min || 0), 0) / count).toFixed(1)),
        'Velocidad Máxima': Number((linePlayers.reduce((acc, cur) => acc + (cur.vel_max_kmh || 0), 0) / count).toFixed(1))
      };
    }).filter(item => item !== null);
  }, [gpsData]);

  // 6. Selected Player Specific Computations
  const selectedPlayerGps = useMemo(() => {
    return gpsData.find(g => g.player_id === selectedPlayerId) || null;
  }, [gpsData, selectedPlayerId]);

  const playerRadarData = useMemo(() => {
    if (!selectedPlayerGps || gpsData.length === 0) return [];

    // Find position line averages
    const pLine = selectedPlayerGps.lineaTactica;
    const sameLinePlayers = gpsData.filter(g => g.lineaTactica === pLine);
    const lineCount = sameLinePlayers.length || 1;

    const lineAvg = {
      dist_total_m: sameLinePlayers.reduce((acc, cur) => acc + (cur.dist_total_m || 0), 0) / lineCount,
      dist_mai_m_20_kmh: sameLinePlayers.reduce((acc, cur) => acc + (cur.dist_mai_m_20_kmh || 0), 0) / lineCount,
      dist_sprint_m_25_kmh: sameLinePlayers.reduce((acc, cur) => acc + (cur.dist_sprint_m_25_kmh || 0), 0) / lineCount,
      m_por_min: sameLinePlayers.reduce((acc, cur) => acc + (cur.m_por_min || 0), 0) / lineCount,
      vel_max_kmh: sameLinePlayers.reduce((acc, cur) => acc + (cur.vel_max_kmh || 0), 0) / lineCount
    };

    // Normalized scores (from 0 to 100) based on player values divided by line averages
    const metricsForRadar = [
      { key: 'dist_total_m', label: 'Volumen (Distancia)' },
      { key: 'dist_mai_m_20_kmh', label: 'Alta Intensidad (HSR)' },
      { key: 'dist_sprint_m_25_kmh', label: 'Distancia Sprint' },
      { key: 'm_por_min', label: 'Intensidad (m/min)' },
      { key: 'vel_max_kmh', label: 'Pico Velocidad (Vmax)' }
    ];

    return metricsForRadar.map(m => {
      const val = selectedPlayerGps[m.key] || 0;
      const avg = lineAvg[m.key as keyof typeof lineAvg] || 1;
      
      // Calculate index relative to tactical group average (100 is equal to average)
      const playerIndex = Math.min(Math.round((val / avg) * 100), 160); // caps at 160% for viz limit

      return {
        subject: m.label,
        'Jugador (%)': playerIndex,
        'Media Posición (%)': 100,
        fullMark: 150
      };
    });
  }, [selectedPlayerGps, gpsData]);

  // Selected Metric Config
  const metricConfig = useMemo(() => {
    return METRICS.find(m => m.id === selectedMetricId) || METRICS[0];
  }, [selectedMetricId]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex flex-wrap items-center gap-3">
            <span className="w-2 h-6 bg-red-600 rounded-full animate-pulse"></span>
            <span>GPS Inteligencia - Partidos Internacionales</span>
            <span className="bg-amber-500/10 text-amber-600 text-[8px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-lg border border-amber-500/20">
              Módulo en Desarrollo
            </span>
          </h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1">
            Análisis de parámetros físicos de alta exigencia en selecciones nacionales
          </p>
        </div>

        {/* SELECTOR DE CATEGORÍA */}
        <div className="flex flex-wrap gap-1.5 bg-white p-1 rounded-2xl border border-slate-100 shadow-sm max-w-full overflow-x-auto">
          {categoryList.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${
                selectedCategory === cat 
                  ? 'bg-red-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-950 hover:bg-slate-50'
              }`}
            >
              {cat.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* RIVAL / MATCH SELECTOR */}
      <div className="bg-[#0b1220] rounded-[32px] p-6 md:p-8 text-white relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-600/5 rounded-full blur-3xl -ml-32 -mb-32"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left w-full md:w-auto">
            <div className="w-16 h-16 bg-red-600 rounded-3xl flex items-center justify-center shadow-lg shadow-red-600/20">
              <i className="fa-solid fa-earth-americas text-2xl text-white"></i>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500">Seleccionar Partido Internacional</p>
              
              {loadingMatches ? (
                <div className="h-8 w-48 bg-white/10 rounded animate-pulse"></div>
              ) : matches.length === 0 ? (
                <h4 className="text-xl font-black italic uppercase tracking-tighter text-slate-400">
                  Sin partidos registrados
                </h4>
              ) : (
                <select
                  value={selectedMatchId}
                  onChange={(e) => setSelectedMatchId(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-2xl px-4 py-2 text-white font-black italic uppercase tracking-tight text-base md:text-lg focus:outline-none focus:ring-2 focus:ring-red-600 cursor-pointer max-w-xs md:max-w-md truncate"
                >
                  {matches.map(m => (
                    <option key={m.id} value={m.id}>
                      VS {m.opponent.toUpperCase()} — {m.date} ({m.competition_type})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {selectedMatch && (
            <div className="flex flex-wrap gap-4 items-center justify-center md:justify-end text-center">
              <div className="px-4 py-3 bg-white/5 border border-white/5 rounded-2xl min-w-[100px]">
                <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider mb-1">Resultado</p>
                <p className="text-base font-black italic tracking-tighter text-white">
                  {selectedMatch.result || 'No disputado'}
                </p>
              </div>
              <div className="px-4 py-3 bg-white/5 border border-white/5 rounded-2xl min-w-[100px]">
                <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider mb-1">Ciudad</p>
                <p className="text-base font-black italic tracking-tighter text-white truncate max-w-[120px]">
                  {selectedMatch.city || 'Desconocida'}
                </p>
              </div>
              <div className="px-4 py-3 bg-white/5 border border-white/5 rounded-2xl min-w-[100px]">
                <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider mb-1">Sede</p>
                <p className="text-base font-black italic tracking-tighter text-red-500 truncate max-w-[140px]">
                  {selectedMatch.location || 'Complejo'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CORE DATA CONDITIONAL */}
      {loadingGps ? (
        <div className="py-32 text-center bg-white rounded-[40px] border border-slate-100 shadow-sm animate-pulse flex flex-col items-center justify-center gap-4">
          <i className="fa-solid fa-spinner animate-spin text-red-600 text-3xl"></i>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Procesando registros de satélite GPS...</p>
        </div>
      ) : gpsData.length === 0 ? (
        <div className="py-24 text-center bg-white rounded-[40px] border border-slate-100 shadow-sm px-6">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 text-xl">
            <i className="fa-solid fa-satellite-dish animate-bounce"></i>
          </div>
          <h4 className="text-slate-900 font-black uppercase tracking-widest text-xs mb-2">
            Sin datos GPS cargados para este encuentro
          </h4>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-tight max-w-md mx-auto leading-relaxed">
            No se registran datos de GPS importados para la fecha del partido ({selectedMatch?.date || 'N/A'}).
            Por favor, dirígete a la pestaña de <strong className="text-red-600">Importar Datos</strong> para cargar el archivo GPS del encuentro.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* TEAM SUMMARY CARDS (KPIs) */}
          {teamKPIs && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center text-lg shrink-0">
                  <i className="fa-solid fa-person-running"></i>
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider mb-0.5">Distancia Promedio</p>
                  <p className="text-xl font-black italic tracking-tighter text-slate-900">{teamKPIs.avgDistance.toLocaleString()} m</p>
                  <p className="text-[9px] text-slate-400 font-bold truncate">Max: {teamKPIs.topDistance?.name} ({teamKPIs.topDistance?.value.toLocaleString()}m)</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center text-lg shrink-0">
                  <i className="fa-solid fa-bolt"></i>
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider mb-0.5">Distancia Sprint ({'>'}25 km/h)</p>
                  <p className="text-xl font-black italic tracking-tighter text-slate-900">{teamKPIs.avgSprint.toLocaleString()} m</p>
                  <p className="text-[9px] text-slate-400 font-bold truncate">Max: {teamKPIs.topSprint?.name} ({teamKPIs.topSprint?.value}m)</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-lg shrink-0">
                  <i className="fa-solid fa-gauge-high"></i>
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider mb-0.5">Intensidad Media</p>
                  <p className="text-xl font-black italic tracking-tighter text-slate-900">{teamKPIs.avgIntensity} m/min</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Ritmo de alta competencia</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center text-lg shrink-0">
                  <i className="fa-solid fa-gauge"></i>
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider mb-0.5">Pico de Velocidad Máxima</p>
                  <p className="text-xl font-black italic tracking-tighter text-slate-900">{teamKPIs.topSpeed?.value} km/h</p>
                  <p className="text-[9px] text-slate-400 font-bold truncate">Líder: {teamKPIs.topSpeed?.name}</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB SELECTION */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('TEAM')}
              className={`pb-4 px-6 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
                activeTab === 'TEAM' 
                  ? 'border-red-600 text-red-600' 
                  : 'border-transparent text-slate-400 hover:text-slate-950'
              }`}
            >
              <i className="fa-solid fa-users mr-2"></i> Vista Grupal (Equipo)
            </button>
            <button
              onClick={() => setActiveTab('INDIVIDUAL')}
              className={`pb-4 px-6 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
                activeTab === 'INDIVIDUAL' 
                  ? 'border-red-600 text-red-600' 
                  : 'border-transparent text-slate-400 hover:text-slate-950'
              }`}
            >
              <i className="fa-solid fa-user mr-2"></i> Vista Individual (Jugador)
            </button>
          </div>

          {/* TEAM TAB VIEWS */}
          {activeTab === 'TEAM' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* PRIMARY METRIC CHART PANEL */}
              <div className="lg:col-span-2 bg-white rounded-[40px] p-6 md:p-8 border border-slate-100 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                      Desempeño Individual del Plantel
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">
                      Comparativa física para la métrica seleccionada
                    </p>
                  </div>

                  {/* METRIC CHANGER */}
                  <select
                    value={selectedMetricId}
                    onChange={(e) => setSelectedMetricId(e.target.value)}
                    className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5 text-slate-700 font-black uppercase tracking-wider text-[10px] focus:outline-none focus:ring-2 focus:ring-red-600 cursor-pointer"
                  >
                    {METRICS.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                    ))}
                  </select>
                </div>

                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={gpsData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="fullName" 
                        tick={{ fill: '#64748b', fontSize: 9, fontWeight: 'bold' }} 
                        axisLine={false}
                        tickLine={false}
                        angle={-30}
                        textAnchor="end"
                        interval={0}
                        height={60}
                      />
                      <YAxis 
                        tick={{ fill: '#64748b', fontSize: 9, fontWeight: 'bold' }} 
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0b1220', border: 'none', borderRadius: '16px', color: '#fff' }}
                        labelStyle={{ fontWeight: 'black', textTransform: 'uppercase', fontSize: '10px', color: '#ef4444' }}
                        itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                        formatter={(value: any) => [`${value} ${metricConfig.unit}`, metricConfig.name]}
                      />
                      <Bar 
                        dataKey={metricConfig.id} 
                        fill={metricConfig.color}
                        radius={[8, 8, 0, 0]}
                        maxBarSize={45}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* TACTICAL LINE PERFORMANCE AVERAGES */}
              <div className="bg-white rounded-[40px] p-6 md:p-8 border border-slate-100 shadow-sm flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                    Líneas Tácticas (Averages)
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5 mb-6">
                    Respuesta física media agrupada por zona de juego
                  </p>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={lineAverages}
                      margin={{ top: 10, right: 10, left: -10, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="line" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'black' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0b1220', border: 'none', borderRadius: '16px', color: '#fff' }}
                        itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="Intensidad" fill="#10b981" name="Intensidad (m/min)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Velocidad Máxima" fill="#8b5cf6" name="Vmax (km/h)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <p className="text-[9px] text-slate-400 font-semibold italic text-center mt-4">
                  * Permite verificar la asimilación del ritmo físico según requerimiento posicional
                </p>
              </div>

              {/* HISTORICAL TREND COMPOSITE */}
              <div className="lg:col-span-3 bg-white rounded-[40px] p-6 md:p-8 border border-slate-100 shadow-sm space-y-6">
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                    Evolución de Intensidad en Competencia Internacional
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">
                    Historial de rendimiento físico promedio del plantel chileno contra rivales mundiales
                  </p>
                </div>

                {historicalMatchAverages.length === 0 ? (
                  <div className="py-12 text-center text-slate-300 font-bold text-xs uppercase italic tracking-widest border border-dashed border-slate-100 rounded-2xl">
                    Se requieren múltiples registros de partidos internacionales para renderizar la línea de tendencia.
                  </div>
                ) : (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={historicalMatchAverages}
                        margin={{ top: 20, right: 20, left: -10, bottom: 10 }}
                      >
                        <CartesianGrid stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="dateStr" tick={{ fill: '#64748b', fontSize: 9, fontWeight: 'black' }} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="left" tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} label={{ value: 'Volumen Distancia (m)', angle: -90, position: 'insideLeft', style: {fontSize: 8, fill: '#64748b', fontWeight: 'black', textTransform: 'uppercase'} }} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} label={{ value: 'Intensidad (m/min)', angle: 90, position: 'insideRight', style: {fontSize: 8, fill: '#10b981', fontWeight: 'black'} }} />
                        <Tooltip contentStyle={{ backgroundColor: '#0b1220', border: 'none', borderRadius: '16px', color: '#fff' }} />
                        <Legend wrapperStyle={{ fontSize: 10, fontWeight: 'bold' }} />
                        <Bar yAxisId="left" dataKey="avgDistance" fill="#dc2626" name="Distancia Media (m)" radius={[4, 4, 0, 0]} maxBarSize={30} />
                        <Line yAxisId="right" type="monotone" dataKey="avgIntensity" stroke="#10b981" name="Intensidad Media (m/min)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* COMPLETE SQUAD COMPARATIVE TABLE */}
              <div className="lg:col-span-3 bg-white rounded-[40px] p-6 md:p-8 border border-slate-100 shadow-sm space-y-4">
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                    Planilla de Rendimiento de Plantel
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">
                    Detalle absoluto de parámetros físicos de todos los jugadores que sumaron minutos
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-black uppercase tracking-wider text-[9px]">
                        <th className="py-4">Jugador</th>
                        <th className="py-4">Posición</th>
                        <th className="py-4 text-center">Minutos</th>
                        <th className="py-4 text-center">Dist. Total (m)</th>
                        <th className="py-4 text-center">HSR Dist (m)</th>
                        <th className="py-4 text-center">Sprint Dist (m)</th>
                        <th className="py-4 text-center">Intensidad (m/min)</th>
                        <th className="py-4 text-center">Vmax (km/h)</th>
                        <th className="py-4 text-center">Acc/Dec</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-bold text-slate-700">
                      {gpsData.map((p, index) => (
                        <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 font-black text-slate-900">{p.fullName}</td>
                          <td className="py-4">
                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                              p.lineaTactica === 'DEFENSA' ? 'bg-amber-50 text-amber-600' :
                              p.lineaTactica === 'VOLANTE' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                            }`}>
                              {p.posicion}
                            </span>
                          </td>
                          <td className="py-4 text-center text-slate-500">{p.minutos} min</td>
                          <td className="py-4 text-center">{p.dist_total_m.toLocaleString()} m</td>
                          <td className="py-4 text-center text-amber-500">{p.dist_mai_m_20_kmh.toLocaleString()} m</td>
                          <td className="py-4 text-center text-red-500">{p.dist_sprint_m_25_kmh.toLocaleString()} m</td>
                          <td className="py-4 text-center text-emerald-600 italic">{p.m_por_min}</td>
                          <td className="py-4 text-center text-purple-600 font-black">{p.vel_max_kmh}</td>
                          <td className="py-4 text-center text-slate-400">{p.acc_decc_ai_n || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* INDIVIDUAL TAB VIEWS */}
          {activeTab === 'INDIVIDUAL' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* SELECT JUGADOR SIDEBAR / CONTROL */}
              <div className="bg-white rounded-[40px] p-6 md:p-8 border border-slate-100 shadow-sm space-y-6">
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                    Atleta de Análisis
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">
                    Selecciona al jugador para perfilar su esfuerzo internacional
                  </p>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                  {gpsData.map((p) => (
                    <button
                      key={p.player_id}
                      onClick={() => setSelectedPlayerId(p.player_id)}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left transition-all ${
                        selectedPlayerId === p.player_id 
                          ? 'bg-[#0b1220] text-white border-[#0b1220] shadow-lg' 
                          : 'bg-white border-slate-100 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <p className="font-black text-xs uppercase tracking-tight">{p.fullName}</p>
                        <p className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${selectedPlayerId === p.player_id ? 'text-red-400' : 'text-slate-400'}`}>{p.posicion}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-black italic text-sm">{p.m_por_min}</p>
                        <p className={`text-[8px] uppercase tracking-wider font-semibold ${selectedPlayerId === p.player_id ? 'text-slate-300' : 'text-slate-400'}`}>m/min</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* INDIVIDUAL RADAR - PROFILE VS POSITION STANDARD */}
              <div className="bg-white rounded-[40px] p-6 md:p-8 border border-slate-100 shadow-sm flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                    Perfil Físico de Competencia
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5 mb-2">
                    Superposición relativa del atleta (%) contra el estándar táctico de su puesto en partidos de selección
                  </p>
                </div>

                {selectedPlayerGps ? (
                  <div className="h-64 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={playerRadarData}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 8, fontWeight: 'bold' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 150]} tick={{ fill: '#94a3b8', fontSize: 7 }} />
                        <Radar name={selectedPlayerGps.fullName} dataKey="Jugador (%)" stroke="#dc2626" fill="#dc2626" fillOpacity={0.25} />
                        <Radar name={`Media ${selectedPlayerGps.lineaTactica}`} dataKey="Media Posición (%)" stroke="#64748b" fill="#64748b" fillOpacity={0.05} />
                        <Legend wrapperStyle={{ fontSize: 9, fontWeight: 'bold' }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-slate-300 italic text-xs font-bold uppercase">Selecciona un jugador</div>
                )}

                <p className="text-[9px] text-slate-400 font-semibold italic text-center">
                  * Un valor superior al 100% indica rendimiento físico superior al promedio táctico internacional de su puesto.
                </p>
              </div>

              {/* INDIVIDUAL CARD METRIC BREAKDOWNS */}
              <div className="bg-white rounded-[40px] p-6 md:p-8 border border-slate-100 shadow-sm flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                    Rendimiento Físico Absoluto
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5 mb-4">
                    Detalle de esfuerzo absoluto del atleta en este partido
                  </p>
                </div>

                {selectedPlayerGps ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                      <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Distancia Total</span>
                      <span className="font-black text-slate-900 text-sm">{selectedPlayerGps.dist_total_m.toLocaleString()} m</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                      <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Metros por Minuto</span>
                      <span className="font-black text-emerald-600 text-sm">{selectedPlayerGps.m_por_min} m/min</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                      <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Alta Intensidad (HSR)</span>
                      <span className="font-black text-amber-600 text-sm">{selectedPlayerGps.dist_mai_m_20_kmh.toLocaleString()} m</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                      <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Distancia Sprint</span>
                      <span className="font-black text-red-600 text-sm">{selectedPlayerGps.dist_sprint_m_25_kmh.toLocaleString()} m</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                      <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Sprints Realizados</span>
                      <span className="font-black text-blue-600 text-sm">{selectedPlayerGps.sprints_n} sprints</span>
                    </div>
                    <div className="flex justify-between items-center pb-1">
                      <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Velocidad Máxima</span>
                      <span className="font-black text-purple-600 text-sm">{selectedPlayerGps.vel_max_kmh} km/h</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-slate-300 italic text-xs font-bold uppercase">Selecciona un jugador</div>
                )}

                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center text-xs shrink-0"><i className="fa-solid fa-medal"></i></div>
                  <p className="text-[9px] text-slate-500 font-bold leading-tight">
                    Métricas calibradas contra intensidades reales exigidas en copas internacionales de selecciones.
                  </p>
                </div>
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
}
