import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Category, CATEGORY_ID_MAP, CATEGORY_COLORS, REVERSE_CATEGORY_ID_MAP } from '../types';
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
  
  // Master GPS & Player preloaded cache
  const [allGpsHistory, setAllGpsHistory] = useState<any[]>([]);
  const [allPlayers, setAllPlayers] = useState<any[]>([]);
  const [loadingMaster, setLoadingMaster] = useState(true);
  const [allMicrocycles, setAllMicrocycles] = useState<any[]>([]);
  const [allCitaciones, setAllCitaciones] = useState<any[]>([]);

  // UI Tabs
  const [activeTab, setActiveTab] = useState<'TEAM' | 'INDIVIDUAL'>('TEAM');
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);

  // Selected Metrics for charts
  const [selectedMetricId, setSelectedMetricId] = useState<string>('dist_total_m');

  // Cascading Filter States
  const [filterYear, setFilterYear] = useState<string>('TODOS');
  const [filterCategory, setFilterCategory] = useState<string>('TODAS');
  const [filterPosition, setFilterPosition] = useState<string>('TODAS');
  const [filterClub, setFilterClub] = useState<string>('TODAS');
  const [filterPlayerId, setFilterPlayerId] = useState<number | null>(null);

  // Player history for selected player
  const [playerHistory, setPlayerHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Categories helper
  const categoryList = ['TODAS', ...Object.values(Category)];

  // Keep filterCategory in sync with selectedCategory
  useEffect(() => {
    setFilterCategory(selectedCategory);
  }, [selectedCategory]);

  // Reset dependent filters when year changes
  useEffect(() => {
    setFilterPosition('TODAS');
    setFilterClub('TODAS');
    setFilterPlayerId(null);
  }, [filterYear]);

  // Reset dependent filters when category changes
  useEffect(() => {
    setFilterPosition('TODAS');
    setFilterClub('TODAS');
    setFilterPlayerId(null);
  }, [filterCategory]);

  // Reset dependent filters when position changes
  useEffect(() => {
    setFilterClub('TODAS');
    setFilterPlayerId(null);
  }, [filterPosition]);

  // Reset dependent filters when club changes
  useEffect(() => {
    setFilterPlayerId(null);
  }, [filterClub]);

  // 1. Fetch Master Data on Mount
  useEffect(() => {
    const loadAllMasterData = async () => {
      setLoadingMaster(true);
      try {
        // Fetch ALL matches that look international/mundial/sudamericano
        const { data: matchesData, error: matchesError } = await supabase
          .from('matches')
          .select('*')
          .or('competition_type.ilike.%internacional%,competition_type.ilike.%mundial%,competition_type.ilike.%sudamericano%')
          .order('date', { ascending: true });

        if (matchesError) throw matchesError;
        setMatches(matchesData || []);

        const matchDates = matchesData?.map(m => m.date) || [];
        if (matchDates.length === 0) {
          setLoadingMaster(false);
          return;
        }

        // Fetch ALL GPS records matching those dates
        const { data: gpsRaw, error: gpsError } = await supabase
          .from('gps_import')
          .select('*')
          .in('fecha', matchDates);

        if (gpsError) throw gpsError;
        setAllGpsHistory(gpsRaw || []);

        // Fetch players for those GPS records
        const playerIds = Array.from(new Set(gpsRaw?.map(g => g.player_id) || []));
        if (playerIds.length > 0) {
          const { data: playersData, error: playersError } = await supabase
            .from('players')
            .select('player_id, nombre, apellido1, apellido2, posicion, id_club, anio, clubes!fk_players_clubes(nombre)')
            .in('player_id', playerIds);

          if (playersError) throw playersError;
          setAllPlayers(playersData || []);
        }

        // Fetch microcycles and citations for precise filtering
        const { data: microcyclesData } = await supabase.from('microcycles').select('id, category_id');
        const { data: citacionesData } = await supabase.from('citaciones').select('player_id, microcycle_id');
        setAllMicrocycles(microcyclesData || []);
        setAllCitaciones(citacionesData || []);
      } catch (err) {
        console.error('Error loading master GPS performance data:', err);
      } finally {
        setLoadingMaster(false);
      }
    };

    loadAllMasterData();
  }, []);

  // Fetch full GPS history for the selected player
  useEffect(() => {
    if (!selectedPlayerId) {
      setPlayerHistory([]);
      return;
    }

    const fetchPlayerHistory = async () => {
      setLoadingHistory(true);
      try {
        const { data, error } = await supabase
          .from('gps_import')
          .select('*')
          .eq('player_id', selectedPlayerId)
          .order('fecha', { ascending: true });

        if (error) throw error;
        setPlayerHistory(data || []);
      } catch (err) {
        console.error('Error fetching player history:', err);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchPlayerHistory();
  }, [selectedPlayerId]);

  // Helper to map player to their convocated categories
  const playerCategoryMap = useMemo(() => {
    const map = new Map<number, Set<string>>();
    allCitaciones.forEach(c => {
      const micro = allMicrocycles.find(m => m.id === c.microcycle_id);
      if (micro) {
        const catString = REVERSE_CATEGORY_ID_MAP[micro.category_id];
        if (catString) {
          if (!map.has(c.player_id)) {
            map.set(c.player_id, new Set());
          }
          map.get(c.player_id)!.add(catString);
        }
      }
    });
    return map;
  }, [allCitaciones, allMicrocycles]);

  // Master fully-mapped GPS records with joined player metrics, positions, and categories
  const masterGpsData = useMemo(() => {
    if (allGpsHistory.length === 0 || allPlayers.length === 0) return [];

    const getPlayerCategories = (p: any) => {
      const citedCats = playerCategoryMap.get(p.player_id);
      if (citedCats && citedCats.size > 0) {
        return Array.from(citedCats);
      }
      if (p?.anio) {
        const currentYear = new Date().getFullYear();
        const age = currentYear - Number(p.anio);
        let fallbackCat = 'sub_17';
        if (age <= 13) fallbackCat = 'sub_13';
        else if (age === 14) fallbackCat = 'sub_14';
        else if (age === 15) fallbackCat = 'sub_15';
        else if (age === 16) fallbackCat = 'sub_16';
        else if (age === 17) fallbackCat = 'sub_17';
        else if (age === 18) fallbackCat = 'sub_18';
        else if (age <= 20) fallbackCat = 'sub_20';
        else if (age <= 21) fallbackCat = 'sub_21';
        else if (age <= 23) fallbackCat = 'sub_23';
        else fallbackCat = 'adulta';
        return [fallbackCat];
      }
      return ['sub_17'];
    };

    return allGpsHistory.map(gps => {
      const p = allPlayers.find(pl => pl.player_id === gps.player_id);
      const fullName = p ? `${p.nombre} ${p.apellido1}` : `ID: ${gps.player_id}`;
      const posicionGeneral = p?.posicion?.toUpperCase() || 'VOLANTE';
      
      let category = 'sub_17'; // default
      const playerCats = p ? getPlayerCategories(p) : ['sub_17'];

      // Find all matches on this specific date
      const matchesOnThisDate = matches.filter(m => m.date === gps.fecha);
      
      // 1. Try to find a match where the player was officially cited in its microcycle
      const matchForPlayer = matchesOnThisDate.find(m => {
        if (!m.microcycle_id) return false;
        return allCitaciones.some(c => c.player_id === gps.player_id && c.microcycle_id === m.microcycle_id);
      });

      if (matchForPlayer) {
        const catString = REVERSE_CATEGORY_ID_MAP[matchForPlayer.category_id];
        if (catString) {
          category = catString;
        }
      } else {
        // 2. Try to find a match on this date that matches one of the player's categories (either cited or age-based)
        const matchOfPlayerCategory = matchesOnThisDate.find(m => {
          const catString = REVERSE_CATEGORY_ID_MAP[m.category_id];
          return playerCats.includes(catString);
        });

        if (matchOfPlayerCategory) {
          const catString = REVERSE_CATEGORY_ID_MAP[matchOfPlayerCategory.category_id];
          if (catString) {
            category = catString;
          }
        } else if (matchesOnThisDate.length > 0) {
          // 3. Younger players brought up without explicit match-day citation mapping in DB,
          // but we have a single match on this date (e.g. Sub-20 match for Bruno Torres).
          // If the player's age/citation is younger, but there's a match, we map to that match's category
          // only if they don't have other matching categories on this date.
          const catString = REVERSE_CATEGORY_ID_MAP[matchesOnThisDate[0].category_id];
          if (catString) {
            category = catString;
          }
        } else {
          // 4. Default fallback: use the player's first listed/assigned category
          category = playerCats[0] || 'sub_17';
        }
      }
      
      // Categorize position into tactically meaningful buckets
      let tactica = 'VOLANTE';
      if (posicionGeneral.includes('DEF') || posicionGeneral.includes('ZAG') || posicionGeneral.includes('LAT') || posicionGeneral.includes('LÍB')) {
        tactica = 'DEFENSA';
      } else if (posicionGeneral.includes('DEL') || posicionGeneral.includes('EXT') || posicionGeneral.includes('PUN') || posicionGeneral.includes('CER')) {
        tactica = 'DELANTERO';
      } else if (posicionGeneral.includes('ARQ') || posicionGeneral.includes('POR')) {
        tactica = 'ARQUERO';
      }

      const clubObj = Array.isArray(p?.clubes) ? p?.clubes[0] : p?.clubes;
      const clubName = (clubObj as any)?.nombre || 'Selección';

      return {
        ...gps,
        fullName,
        posicion: p?.posicion || 'Volante',
        lineaTactica: tactica,
        category,
        club_name: clubName,
        m_por_min: gps.minutos > 0 ? Number((gps.dist_total_m / gps.minutos).toFixed(1)) : 0
      };
    });
  }, [allGpsHistory, allPlayers, matches, allCitaciones, allMicrocycles, playerCategoryMap]);

  // Filter matches based on the main category selector and year filter
  const filteredMatches = useMemo(() => {
    let result = matches;
    if (selectedCategory !== 'TODAS') {
      const categoryId = CATEGORY_ID_MAP[selectedCategory.toLowerCase()];
      if (categoryId) {
        result = result.filter(m => m.category_id === categoryId);
      }
    }
    if (filterYear !== 'TODOS') {
      result = result.filter(m => m.date.startsWith(filterYear));
    }
    return result;
  }, [matches, selectedCategory, filterYear]);

  const selectedMatch = useMemo(() => {
    return filteredMatches.find(m => m.id === selectedMatchId) || filteredMatches[filteredMatches.length - 1] || null;
  }, [filteredMatches, selectedMatchId]);

  // Keep selectedMatchId valid and updated when category or matches change
  useEffect(() => {
    if (filteredMatches.length > 0) {
      const exists = filteredMatches.some(m => m.id === selectedMatchId);
      if (!exists) {
        setSelectedMatchId(filteredMatches[filteredMatches.length - 1].id);
      }
    } else {
      setSelectedMatchId('');
    }
  }, [filteredMatches, selectedMatchId]);

  // GPS data for the currently selected match
  const gpsData = useMemo(() => {
    if (!selectedMatch) return [];
    
    // Filter masterGpsData for the selected match date
    const matchGps = masterGpsData.filter(g => g.fecha === selectedMatch.date);
    
    // Aggregate by player in case of multiple sessions
    const aggregatedMap = new Map<number, any>();
    matchGps.forEach((item) => {
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
    
    return Array.from(aggregatedMap.values());
  }, [masterGpsData, selectedMatch]);

  // 1. Available Categories from loaded GPS players
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    masterGpsData.forEach(p => {
      if (p.category) cats.add(p.category);
    });
    return ['TODAS', ...Array.from(cats).sort()];
  }, [masterGpsData]);

  // 1.5. Available Years from loaded GPS players
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    masterGpsData.forEach(p => {
      if (p.fecha) {
        years.add(p.fecha.slice(0, 4));
      }
    });
    return ['TODOS', ...Array.from(years).sort().reverse()];
  }, [masterGpsData]);

  // 2. Available Positions based on selected category and year
  const availablePositions = useMemo(() => {
    const positions = new Set<string>();
    masterGpsData.forEach(p => {
      const matchCategory = filterCategory === 'TODAS' || p.category === filterCategory;
      const matchYear = filterYear === 'TODOS' || p.fecha?.startsWith(filterYear);
      if (matchCategory && matchYear && p.posicion) {
        positions.add(p.posicion);
      }
    });
    return ['TODAS', ...Array.from(positions).sort()];
  }, [masterGpsData, filterCategory, filterYear]);

  // 3. Available Clubs based on category, year and position
  const availableClubs = useMemo(() => {
    const clubsList = new Set<string>();
    masterGpsData.forEach(p => {
      const matchCategory = filterCategory === 'TODAS' || p.category === filterCategory;
      const matchYear = filterYear === 'TODOS' || p.fecha?.startsWith(filterYear);
      const matchPosition = filterPosition === 'TODAS' || p.posicion === filterPosition || p.lineaTactica === filterPosition;
      if (matchCategory && matchYear && matchPosition && p.club_name) {
        clubsList.add(p.club_name);
      }
    });
    return ['TODAS', ...Array.from(clubsList).sort()];
  }, [masterGpsData, filterCategory, filterYear, filterPosition]);

  // 4. Available Players based on category, year, position, and club
  const availablePlayers = useMemo(() => {
    const seen = new Set<number>();
    const list: any[] = [];
    masterGpsData.forEach(p => {
      const matchCategory = filterCategory === 'TODAS' || p.category === filterCategory;
      const matchYear = filterYear === 'TODOS' || p.fecha?.startsWith(filterYear);
      const matchPosition = filterPosition === 'TODAS' || p.posicion === filterPosition || p.lineaTactica === filterPosition;
      const matchClub = filterClub === 'TODAS' || p.club_name === filterClub;
      
      if (matchCategory && matchYear && matchPosition && matchClub) {
        if (!seen.has(p.player_id)) {
          seen.add(p.player_id);
          list.push(p);
        }
      }
    });
    return list.sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [masterGpsData, filterCategory, filterYear, filterPosition, filterClub]);

  // Auto-select first player in list if none selected
  useEffect(() => {
    if (availablePlayers.length > 0) {
      const exists = availablePlayers.some(p => p.player_id === filterPlayerId);
      if (!exists) {
        setFilterPlayerId(availablePlayers[0].player_id);
      }
    } else {
      setFilterPlayerId(null);
    }
  }, [availablePlayers, filterPlayerId]);

  // Synchronize with selectedPlayerId for radar chart & breakdowns
  useEffect(() => {
    if (filterPlayerId) {
      setSelectedPlayerId(filterPlayerId);
    }
  }, [filterPlayerId]);

  const playerMatchHistory = useMemo(() => {
    if (!selectedPlayerId || playerHistory.length === 0 || filteredMatches.length === 0) return [];

    const dailyMap = new Map<string, any>();
    playerHistory.forEach(gps => {
      const date = gps.fecha;
      const match = filteredMatches.find(m => m.date === date);
      if (!match) return; // Only keep dates with matches in active filter category

      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          ...gps,
          matchName: `${match.opponent.toUpperCase()} (${date.slice(5)})`,
          matchDate: date,
          minutos: gps.minutos || 0,
          dist_total_m: gps.dist_total_m || 0,
          dist_ai_m_15_kmh: gps.dist_ai_m_15_kmh || 0,
          dist_mai_m_20_kmh: gps.dist_mai_m_20_kmh || 0,
          dist_sprint_m_25_kmh: gps.dist_sprint_m_25_kmh || 0,
          sprints_n: gps.sprints_n || 0,
          acc_decc_ai_n: gps.acc_decc_ai_n || 0,
          vel_max_kmh: gps.vel_max_kmh || 0,
        });
      } else {
        const existing = dailyMap.get(date);
        existing.minutos += (gps.minutos || 0);
        existing.dist_total_m += (gps.dist_total_m || 0);
        existing.dist_ai_m_15_kmh += (gps.dist_ai_m_15_kmh || 0);
        existing.dist_mai_m_20_kmh += (gps.dist_mai_m_20_kmh || 0);
        existing.dist_sprint_m_25_kmh += (gps.dist_sprint_m_25_kmh || 0);
        existing.sprints_n += (gps.sprints_n || 0);
        existing.acc_decc_ai_n += (gps.acc_decc_ai_n || 0);
        existing.vel_max_kmh = Math.max(existing.vel_max_kmh, gps.vel_max_kmh || 0);
      }
    });

    return Array.from(dailyMap.values()).map(item => ({
      ...item,
      m_por_min: item.minutos > 0 ? Number((item.dist_total_m / item.minutos).toFixed(1)) : 0
    })).sort((a, b) => a.matchDate.localeCompare(b.matchDate));
  }, [selectedPlayerId, playerHistory, filteredMatches]);

  // Dynamic Average/Peak values per match for the active team/category/position/club filters
  const filteredGroupMatchData = useMemo(() => {
    if (filteredMatches.length === 0) return [];
    
    // Sort matches chronologically for timeline display
    const sortedMatches = [...filteredMatches].sort((a, b) => a.date.localeCompare(b.date));

    return sortedMatches.map(m => {
      // Find all master GPS records for this match date
      const matchRecords = masterGpsData.filter(gps => {
        if (gps.fecha !== m.date) return false;
        
        const matchCategory = filterCategory === 'TODAS' || gps.category === filterCategory;
        const matchPosition = filterPosition === 'TODAS' || gps.posicion === filterPosition || gps.lineaTactica === filterPosition;
        const matchClub = filterClub === 'TODAS' || gps.club_name === filterClub;
        
        return matchCategory && matchPosition && matchClub;
      });

      if (matchRecords.length === 0) {
        return null;
      }

      // Calculate average for the selected metric
      const sum = matchRecords.reduce((acc, curr) => {
        const val = curr[selectedMetricId] || 0;
        return acc + val;
      }, 0);
      const avgValue = Number((sum / matchRecords.length).toFixed(1));

      const sumDistance = matchRecords.reduce((acc, curr) => acc + (curr.dist_total_m || 0), 0);
      const avgMinutos = Math.round(matchRecords.reduce((acc, curr) => acc + (curr.minutos || 0), 0) / matchRecords.length);
      const sumAiDist = matchRecords.reduce((acc, curr) => acc + (curr.dist_ai_m_15_kmh || 0), 0);
      const sumHsrDist = matchRecords.reduce((acc, curr) => acc + (curr.dist_mai_m_20_kmh || 0), 0);
      const sumSprint = matchRecords.reduce((acc, curr) => acc + (curr.dist_sprint_m_25_kmh || 0), 0);
      const sumSprintsCount = matchRecords.reduce((acc, curr) => acc + (curr.sprints_n || 0), 0);
      const maxSpeed = Number(Math.max(...matchRecords.map(curr => curr.vel_max_kmh || 0)).toFixed(1));
      const sumAcDc = matchRecords.reduce((acc, curr) => acc + (curr.acc_decc_ai_n || 0), 0);
      const avgIntensity = Number((matchRecords.reduce((acc, curr) => acc + (curr.m_por_min || 0), 0) / matchRecords.length).toFixed(1));

      return {
        id: m.id,
        matchDate: m.date,
        opponent: m.opponent,
        displayName: `VS ${m.opponent.toUpperCase()} (${m.date.slice(5)})`,
        avgValue,
        count: matchRecords.length,
        sumDistance,
        avgMinutos,
        sumAiDist,
        sumHsrDist,
        sumSprint,
        sumSprintsCount,
        maxSpeed,
        sumAcDc,
        avgIntensity
      };
    }).filter(item => item !== null);
  }, [filteredMatches, masterGpsData, filterCategory, filterPosition, filterClub, selectedMetricId]);

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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
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

        <div className="flex flex-wrap items-center gap-3">
          {/* SELECTOR DE CATEGORÍA */}
          <div className="flex flex-wrap gap-1 bg-white p-1 rounded-2xl border border-slate-100 shadow-sm max-w-full overflow-x-auto">
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
      </div>

      {/* CORE DATA CONDITIONAL */}
      {loadingMaster ? (
        <div className="py-32 text-center bg-white rounded-[40px] border border-slate-100 shadow-sm animate-pulse flex flex-col items-center justify-center gap-4">
          <i className="fa-solid fa-spinner animate-spin text-red-600 text-3xl animate-infinite"></i>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Procesando registros de satélite GPS...</p>
        </div>
      ) : matches.length === 0 ? (
        <div className="py-24 text-center bg-white rounded-[40px] border border-slate-100 shadow-sm px-6">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 text-xl">
            <i className="fa-solid fa-satellite-dish animate-bounce"></i>
          </div>
          <h4 className="text-slate-900 font-black uppercase tracking-widest text-xs mb-2">
            Sin encuentros registrados
          </h4>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-tight max-w-md mx-auto leading-relaxed">
            No se registran datos de GPS importados para encuentros internacionales.
            Por favor, dirígete a la pestaña de <strong className="text-red-600">Importar Datos</strong> para cargar el archivo GPS.
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
            <div className="space-y-6">
              
              {/* CHART 1: Distancia Total y Minutos */}
              <div className="bg-white rounded-[32px] p-6 md:p-8 border border-slate-100 shadow-sm space-y-4">
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <i className="fa-solid fa-chart-bar text-red-600"></i> 1. Volumen de Esfuerzo Grupal
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">
                    Distancia Total (Bar, Izq.) vs. Promedio de Minutos (Line, Der.)
                  </p>
                </div>
                {filteredGroupMatchData.length === 0 ? (
                  <div className="py-12 text-center text-slate-300 font-bold text-xs uppercase italic tracking-widest border border-dashed border-slate-100 rounded-2xl">
                    No se registran datos para esta categoría.
                  </div>
                ) : (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={filteredGroupMatchData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="displayName" tick={{ fill: '#64748b', fontSize: 8, fontWeight: 'bold' }} />
                        <YAxis yAxisId="left" tick={{ fill: '#ef4444', fontSize: 8, fontWeight: 'bold' }} unit="m" />
                        <YAxis yAxisId="right" orientation="right" tick={{ fill: '#10b981', fontSize: 8, fontWeight: 'bold' }} unit="min" />
                        <Tooltip contentStyle={{ fontSize: 9, borderRadius: 8, fontWeight: 'bold' }} />
                        <Legend wrapperStyle={{ fontSize: 9, fontWeight: 'bold' }} />
                        <Bar yAxisId="left" dataKey="sumDistance" name="Distancia Total" fill="#fca5a5" radius={[4, 4, 0, 0]} maxBarSize={30} />
                        <Line yAxisId="right" type="monotone" dataKey="avgMinutos" name="Promedio de Minutos" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* CHART 2: AI > 15 y HSR > 20 */}
              <div className="bg-white rounded-[32px] p-6 md:p-8 border border-slate-100 shadow-sm space-y-4">
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <i className="fa-solid fa-bolt text-amber-500"></i> 2. Alta Intensidad Grupal (AI & HSR)
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">
                    Metros en Alta Intensidad &gt; 15 km/h (Bar) vs. High-Speed Running (HSR) &gt; 20 km/h (Line)
                  </p>
                </div>
                {filteredGroupMatchData.length === 0 ? (
                  <div className="py-12 text-center text-slate-300 font-bold text-xs uppercase italic tracking-widest border border-dashed border-slate-100 rounded-2xl">
                    No se registran datos para esta categoría.
                  </div>
                ) : (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={filteredGroupMatchData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="displayName" tick={{ fill: '#64748b', fontSize: 8, fontWeight: 'bold' }} />
                        <YAxis tick={{ fill: '#64748b', fontSize: 8, fontWeight: 'bold' }} unit="m" />
                        <Tooltip contentStyle={{ fontSize: 9, borderRadius: 8, fontWeight: 'bold' }} />
                        <Legend wrapperStyle={{ fontSize: 9, fontWeight: 'bold' }} />
                        <Bar dataKey="sumAiDist" name="AI > 15 km/h" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={30} />
                        <Line type="monotone" dataKey="sumHsrDist" name="HSR > 20 km/h" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* CHART 3: Sprint Dist y Cantidad de Sprints */}
              <div className="bg-white rounded-[32px] p-6 md:p-8 border border-slate-100 shadow-sm space-y-4">
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <i className="fa-solid fa-gauge-high text-blue-600"></i> 3. Capacidad Explosiva del Plantel (Sprint)
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">
                    Metros de Sprint (Bar, Izq.) vs. Cantidad de Sprints (Line, Der.)
                  </p>
                </div>
                {filteredGroupMatchData.length === 0 ? (
                  <div className="py-12 text-center text-slate-300 font-bold text-xs uppercase italic tracking-widest border border-dashed border-slate-100 rounded-2xl">
                    No se registran datos para esta categoría.
                  </div>
                ) : (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={filteredGroupMatchData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="displayName" tick={{ fill: '#64748b', fontSize: 8, fontWeight: 'bold' }} />
                        <YAxis yAxisId="left" tick={{ fill: '#1d4ed8', fontSize: 8, fontWeight: 'bold' }} unit="m" />
                        <YAxis yAxisId="right" orientation="right" tick={{ fill: '#ea580c', fontSize: 8, fontWeight: 'bold' }} />
                        <Tooltip contentStyle={{ fontSize: 9, borderRadius: 8, fontWeight: 'bold' }} />
                        <Legend wrapperStyle={{ fontSize: 9, fontWeight: 'bold' }} />
                        <Bar yAxisId="left" dataKey="sumSprint" name="Distancia de Sprint" fill="#93c5fd" radius={[4, 4, 0, 0]} maxBarSize={30} />
                        <Line yAxisId="right" type="monotone" dataKey="sumSprintsCount" name="Cantidad de Sprints" stroke="#ea580c" strokeWidth={2.5} dot={{ r: 4 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* CHART 4: Velocidad Máxima y AC/DC */}
              <div className="bg-white rounded-[32px] p-6 md:p-8 border border-slate-100 shadow-sm space-y-4">
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <i className="fa-solid fa-circle-nodes text-purple-600"></i> 4. Velocidad y Aceleración del Equipo
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">
                    Velocidad Máxima del Partido (Line, Izq.) vs. AC/DC (Bar, Der.)
                  </p>
                </div>
                {filteredGroupMatchData.length === 0 ? (
                  <div className="py-12 text-center text-slate-300 font-bold text-xs uppercase italic tracking-widest border border-dashed border-slate-100 rounded-2xl">
                    No se registran datos para esta categoría.
                  </div>
                ) : (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={filteredGroupMatchData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="displayName" tick={{ fill: '#64748b', fontSize: 8, fontWeight: 'bold' }} />
                        <YAxis yAxisId="left" tick={{ fill: '#8b5cf6', fontSize: 8, fontWeight: 'bold' }} unit="km/h" />
                        <YAxis yAxisId="right" orientation="right" tick={{ fill: '#3b82f6', fontSize: 8, fontWeight: 'bold' }} />
                        <Tooltip contentStyle={{ fontSize: 9, borderRadius: 8, fontWeight: 'bold' }} />
                        <Legend wrapperStyle={{ fontSize: 9, fontWeight: 'bold' }} />
                        <Bar yAxisId="right" dataKey="sumAcDc" name="AC/DC" fill="#93c5fd" radius={[4, 4, 0, 0]} maxBarSize={30} />
                        <Line yAxisId="left" type="monotone" dataKey="maxSpeed" name="Velocidad Máxima" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 4 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* INDIVIDUAL TAB VIEWS */}
          {activeTab === 'INDIVIDUAL' && (
            <div className="space-y-6">
              
              {/* CASCADING FILTER SELECTIONS FOR PLAYER */}
              <div className="bg-white rounded-[32px] p-6 md:p-8 border border-slate-100 shadow-sm space-y-4">
                <div className="border-b border-slate-50 pb-3">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <i className="fa-solid fa-sliders text-red-600"></i> Filtros de Selección de Jugador
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">
                    Filtra la nómina de atletas por año de partido, club, posición y nombre para visualizar su evolución física
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* FILTRO AÑO */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Temporada (Año)</label>
                    <select
                      value={filterYear}
                      onChange={(e) => setFilterYear(e.target.value)}
                      className="bg-slate-50 border border-slate-100 rounded-2xl px-3 py-2.5 text-slate-700 font-black uppercase tracking-wider text-[10px] focus:outline-none focus:ring-2 focus:ring-red-600 cursor-pointer w-full"
                    >
                      {availableYears.map(year => (
                        <option key={year} value={year}>{year === 'TODOS' ? 'TODOS LOS AÑOS' : year}</option>
                      ))}
                    </select>
                  </div>

                  {/* FILTRO POSICION */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Posición Táctica</label>
                    <select
                      value={filterPosition}
                      onChange={(e) => setFilterPosition(e.target.value)}
                      className="bg-slate-50 border border-slate-100 rounded-2xl px-3 py-2.5 text-slate-700 font-black uppercase tracking-wider text-[10px] focus:outline-none focus:ring-2 focus:ring-red-600 cursor-pointer w-full"
                    >
                      {availablePositions.map(pos => (
                        <option key={pos} value={pos}>{pos === 'TODAS' ? 'TODAS LAS POSICIONES' : pos.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>

                  {/* FILTRO CLUB */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Club de Procedencia</label>
                    <select
                      value={filterClub}
                      onChange={(e) => setFilterClub(e.target.value)}
                      className="bg-slate-50 border border-slate-100 rounded-2xl px-3 py-2.5 text-slate-700 font-black uppercase tracking-wider text-[10px] focus:outline-none focus:ring-2 focus:ring-red-600 cursor-pointer w-full"
                    >
                      {availableClubs.map(club => (
                        <option key={club} value={club}>{club === 'TODAS' ? 'TODOS LOS CLUBES' : club.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>

                  {/* SELECTOR NOMBRE */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Seleccionar Jugador</label>
                    <select
                      value={selectedPlayerId || ''}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : null;
                        setFilterPlayerId(val);
                        setSelectedPlayerId(val);
                      }}
                      className="bg-slate-50 border border-slate-100 rounded-2xl px-3 py-2.5 text-slate-700 font-black uppercase tracking-wider text-[10px] focus:outline-none focus:ring-2 focus:ring-red-600 cursor-pointer w-full"
                    >
                      {availablePlayers.length === 0 ? (
                        <option value="">Sin jugadores coincidentes</option>
                      ) : (
                        availablePlayers.map(p => (
                          <option key={p.player_id} value={p.player_id}>
                            {p.fullName} ({p.posicion.toUpperCase()})
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>
              </div>

              {/* 4 STACKED VERTICAL EVOLUTIVE CHARTS */}
              <div className="space-y-6">
                
                {/* CHART 1: Volumen de Esfuerzo */}
                <div className="bg-white rounded-[32px] p-6 md:p-8 border border-slate-100 shadow-sm space-y-4">
                  <div>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <i className="fa-solid fa-chart-bar text-red-600"></i> 1. Volumen de Esfuerzo Individual
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">
                      Distancia Total (Bar, Izq.) vs. Minutos Jugados (Line, Der.)
                    </p>
                  </div>
                  {loadingHistory ? (
                    <div className="h-72 flex flex-col items-center justify-center gap-3 animate-pulse">
                      <i className="fa-solid fa-spinner animate-spin text-red-600 text-xl"></i>
                      <p className="text-[9px] font-black uppercase text-slate-400">Cargando...</p>
                    </div>
                  ) : playerMatchHistory.length === 0 ? (
                    <div className="py-12 text-center text-slate-300 font-bold text-xs uppercase italic tracking-widest border border-dashed border-slate-100 rounded-2xl">
                      No se registran datos para este jugador.
                    </div>
                  ) : (
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={playerMatchHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="matchName" tick={{ fill: '#64748b', fontSize: 8, fontWeight: 'bold' }} />
                          <YAxis yAxisId="left" tick={{ fill: '#ef4444', fontSize: 8, fontWeight: 'bold' }} unit="m" />
                          <YAxis yAxisId="right" orientation="right" tick={{ fill: '#10b981', fontSize: 8, fontWeight: 'bold' }} unit="min" />
                          <Tooltip contentStyle={{ fontSize: 9, borderRadius: 8, fontWeight: 'bold' }} />
                          <Legend wrapperStyle={{ fontSize: 9, fontWeight: 'bold' }} />
                          <Bar yAxisId="left" dataKey="dist_total_m" name="Distancia Total" fill="#fca5a5" radius={[4, 4, 0, 0]} maxBarSize={30} />
                          <Line yAxisId="right" type="monotone" dataKey="minutos" name="Minutos Jugados" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* CHART 2: Alta Intensidad */}
                <div className="bg-white rounded-[32px] p-6 md:p-8 border border-slate-100 shadow-sm space-y-4">
                  <div>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <i className="fa-solid fa-bolt text-amber-500"></i> 2. Alta Intensidad Individual (AI & HSR)
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">
                      Metros en Alta Intensidad &gt; 15 km/h (Bar) vs. High-Speed Running (HSR) &gt; 20 km/h (Line)
                    </p>
                  </div>
                  {loadingHistory ? (
                    <div className="h-72 flex flex-col items-center justify-center gap-3 animate-pulse">
                      <i className="fa-solid fa-spinner animate-spin text-amber-500 text-xl"></i>
                      <p className="text-[9px] font-black uppercase text-slate-400">Cargando...</p>
                    </div>
                  ) : playerMatchHistory.length === 0 ? (
                    <div className="py-12 text-center text-slate-300 font-bold text-xs uppercase italic tracking-widest border border-dashed border-slate-100 rounded-2xl">
                      No se registran datos para este jugador.
                    </div>
                  ) : (
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={playerMatchHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="matchName" tick={{ fill: '#64748b', fontSize: 8, fontWeight: 'bold' }} />
                          <YAxis tick={{ fill: '#64748b', fontSize: 8, fontWeight: 'bold' }} unit="m" />
                          <Tooltip contentStyle={{ fontSize: 9, borderRadius: 8, fontWeight: 'bold' }} />
                          <Legend wrapperStyle={{ fontSize: 9, fontWeight: 'bold' }} />
                          <Bar dataKey="dist_ai_m_15_kmh" name="AI > 15 km/h" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={30} />
                          <Line type="monotone" dataKey="dist_mai_m_20_kmh" name="HSR > 20 km/h" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* CHART 3: Capacidad Explosiva */}
                <div className="bg-white rounded-[32px] p-6 md:p-8 border border-slate-100 shadow-sm space-y-4">
                  <div>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <i className="fa-solid fa-gauge-high text-blue-600"></i> 3. Capacidad Explosiva Individual (Sprint)
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">
                      Metros de Sprint (Bar, Izq.) vs. Cantidad de Sprints (Line, Der.)
                    </p>
                  </div>
                  {loadingHistory ? (
                    <div className="h-72 flex flex-col items-center justify-center gap-3 animate-pulse">
                      <i className="fa-solid fa-spinner animate-spin text-blue-600 text-xl"></i>
                      <p className="text-[9px] font-black uppercase text-slate-400">Cargando...</p>
                    </div>
                  ) : playerMatchHistory.length === 0 ? (
                    <div className="py-12 text-center text-slate-300 font-bold text-xs uppercase italic tracking-widest border border-dashed border-slate-100 rounded-2xl">
                      No se registran datos para este jugador.
                    </div>
                  ) : (
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={playerMatchHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="matchName" tick={{ fill: '#64748b', fontSize: 8, fontWeight: 'bold' }} />
                          <YAxis yAxisId="left" tick={{ fill: '#1d4ed8', fontSize: 8, fontWeight: 'bold' }} unit="m" />
                          <YAxis yAxisId="right" orientation="right" tick={{ fill: '#ea580c', fontSize: 8, fontWeight: 'bold' }} />
                          <Tooltip contentStyle={{ fontSize: 9, borderRadius: 8, fontWeight: 'bold' }} />
                          <Legend wrapperStyle={{ fontSize: 9, fontWeight: 'bold' }} />
                          <Bar yAxisId="left" dataKey="dist_sprint_m_25_kmh" name="Distancia de Sprint" fill="#93c5fd" radius={[4, 4, 0, 0]} maxBarSize={30} />
                          <Line yAxisId="right" type="monotone" dataKey="sprints_n" name="Cantidad de Sprints" stroke="#ea580c" strokeWidth={2.5} dot={{ r: 4 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* CHART 4: Velocidad y Aceleración */}
                <div className="bg-white rounded-[32px] p-6 md:p-8 border border-slate-100 shadow-sm space-y-4">
                  <div>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <i className="fa-solid fa-circle-nodes text-purple-600"></i> 4. Velocidad y Aceleración del Atleta
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">
                      Velocidad Máxima del Partido (Line, Izq.) vs. AC/DC (Bar, Der.)
                    </p>
                  </div>
                  {loadingHistory ? (
                    <div className="h-72 flex flex-col items-center justify-center gap-3 animate-pulse">
                      <i className="fa-solid fa-spinner animate-spin text-purple-600 text-xl"></i>
                      <p className="text-[9px] font-black uppercase text-slate-400">Cargando...</p>
                    </div>
                  ) : playerMatchHistory.length === 0 ? (
                    <div className="py-12 text-center text-slate-300 font-bold text-xs uppercase italic tracking-widest border border-dashed border-slate-100 rounded-2xl">
                      No se registran datos para este jugador.
                    </div>
                  ) : (
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={playerMatchHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="matchName" tick={{ fill: '#64748b', fontSize: 8, fontWeight: 'bold' }} />
                          <YAxis yAxisId="left" tick={{ fill: '#8b5cf6', fontSize: 8, fontWeight: 'bold' }} unit="km/h" />
                          <YAxis yAxisId="right" orientation="right" tick={{ fill: '#3b82f6', fontSize: 8, fontWeight: 'bold' }} />
                          <Tooltip contentStyle={{ fontSize: 9, borderRadius: 8, fontWeight: 'bold' }} />
                          <Legend wrapperStyle={{ fontSize: 9, fontWeight: 'bold' }} />
                          <Bar yAxisId="right" dataKey="acc_decc_ai_n" name="AC/DC" fill="#93c5fd" radius={[4, 4, 0, 0]} maxBarSize={30} />
                          <Line yAxisId="left" type="monotone" dataKey="vel_max_kmh" name="Velocidad Máxima" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 4 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

              </div>

              {/* DETAILED RADAR & ABSOLUTE STATS CARD ROW */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* INDIVIDUAL RADAR - PROFILE VS POSITION STANDARD */}
                <div className="bg-white rounded-[32px] p-6 md:p-8 border border-slate-100 shadow-sm flex flex-col justify-between">
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

                  <p className="text-[9px] text-slate-400 font-semibold italic text-center mt-2">
                    * Un valor superior al 100% indica rendimiento físico superior al promedio táctico internacional de su puesto.
                  </p>
                </div>

                {/* INDIVIDUAL CARD METRIC BREAKDOWNS */}
                <div className="bg-white rounded-[32px] p-6 md:p-8 border border-slate-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                      Rendimiento Físico Absoluto (Último Partido)
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5 mb-4">
                      Detalle de esfuerzo absoluto del atleta en el último partido registrado
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

            </div>
          )}
        </div>
      )}
    </div>
  );
}
