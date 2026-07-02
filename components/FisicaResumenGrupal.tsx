import React, { useState, useMemo, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { normalizeClub, getDriveDirectLink } from '../lib/utils';
import ClubBadge from './ClubBadge';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FEDERATION_LOGO } from '../constants';

interface FisicaResumenGrupalProps {
  userRole?: string;
  userClub?: string;
  userClubId?: number | null;
  clubs?: any[];
}

const FisicaResumenGrupal: React.FC<FisicaResumenGrupalProps> = ({ userRole, userClub, userClubId, clubs = [] }) => {
  const [startDate, setStartDate] = useState<string>('2020-01-01');
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  });

  // Filter States
  const [selectedClubs, setSelectedClubs] = useState<string[]>(
    userRole === 'club' && userClub ? [userClub] : []
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);

  // Search Queries for Dropdowns
  const [isClubDropdownOpen, setIsClubDropdownOpen] = useState(false);
  const [clubQuery, setClubQuery] = useState('');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [categoryQuery, setCategoryQuery] = useState('');
  const [isPositionDropdownOpen, setIsPositionDropdownOpen] = useState(false);
  const [positionQuery, setPositionQuery] = useState('');
  const [isPlayerDropdownOpen, setIsPlayerDropdownOpen] = useState(false);
  const [playerQuery, setPlayerQuery] = useState('');

  // Data States
  const [players, setPlayers] = useState<any[]>([]);
  const [imtpData, setImtpData] = useState<any[]>([]);
  const [speedData, setSpeedData] = useState<any[]>([]);
  const [vo2maxData, setVo2maxData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // AI & UI States
  const [aiSummary, setAiSummary] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showOnlyLatest, setShowOnlyLatest] = useState<boolean>(true);
  const hasInitializedDates = useRef(false);

  // Dropdown Refs for Click Outside
  const clubDropdownRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const positionDropdownRef = useRef<HTMLDivElement>(null);
  const playerDropdownRef = useRef<HTMLDivElement>(null);

  // Sorting State
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>({ key: 'player_name', direction: 'asc' });

  // Load physical evaluation thresholds (Elite Standards)
  const getPhysicalStatus = (value: number, metric: 'imtp' | 'cmj_rsi' | 'cmj_height' | 'speed' | 'vo2max') => {
    if (value === 0 || value === undefined || isNaN(value)) {
      return { label: 'Sin Datos', color: 'bg-slate-100 text-slate-500 border-slate-200', hex: '#64748b' };
    }

    if (metric === 'imtp') {
      if (value >= 3500) return { label: 'Excelente', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', hex: '#10b981' };
      if (value >= 2800) return { label: 'Normal', color: 'bg-amber-100 text-amber-700 border-amber-200', hex: '#f59e0b' };
      return { label: 'Bajo', color: 'bg-rose-100 text-rose-700 border-rose-200', hex: '#ef4444' };
    }
    if (metric === 'cmj_rsi') {
      if (value >= 0.55) return { label: 'Excelente', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', hex: '#10b981' };
      if (value >= 0.45) return { label: 'Normal', color: 'bg-amber-100 text-amber-700 border-amber-200', hex: '#f59e0b' };
      return { label: 'Bajo', color: 'bg-rose-100 text-rose-700 border-rose-200', hex: '#ef4444' };
    }
    if (metric === 'cmj_height') {
      if (value >= 42) return { label: 'Excelente', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', hex: '#10b981' };
      if (value >= 35) return { label: 'Normal', color: 'bg-amber-100 text-amber-700 border-amber-200', hex: '#f59e0b' };
      return { label: 'Bajo', color: 'bg-rose-100 text-rose-700 border-rose-200', hex: '#ef4444' };
    }
    if (metric === 'speed') {
      // Speed time: lower is better!
      if (value <= 4.10) return { label: 'Excelente', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', hex: '#10b981' };
      if (value <= 4.40) return { label: 'Normal', color: 'bg-amber-100 text-amber-700 border-amber-200', hex: '#f59e0b' };
      return { label: 'Bajo', color: 'bg-rose-100 text-rose-700 border-rose-200', hex: '#ef4444' };
    }
    if (metric === 'vo2max') {
      if (value >= 58) return { label: 'Excelente', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', hex: '#10b981' };
      if (value >= 52) return { label: 'Normal', color: 'bg-amber-100 text-amber-700 border-amber-200', hex: '#f59e0b' };
      return { label: 'Bajo', color: 'bg-rose-100 text-rose-700 border-rose-200', hex: '#ef4444' };
    }

    return { label: 'Sin Datos', color: 'bg-slate-100 text-slate-500 border-slate-200', hex: '#64748b' };
  };

  const fetchFullTable = async (tableName: string, selectQuery: string = '*') => {
    let allData: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let keepFetching = true;

    while (keepFetching) {
      const { data, error } = await supabase
        .from(tableName)
        .select(selectQuery)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.error(`Error fetching from ${tableName}:`, error);
        break;
      }

      if (data && data.length > 0) {
        allData = [...allData, ...data];
        if (data.length < pageSize) {
          keepFetching = false;
        } else {
          page++;
        }
      } else {
        keepFetching = false;
      }
    }
    return allData;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [pData, imtpRes, cmjRes, sData, vData] = await Promise.all([
        fetchFullTable('players', 'player_id, nombre, apellido1, apellido2, anio, id_club, posicion'),
        fetchFullTable('evaluaciones_imtp'),
        fetchFullTable('evaluaciones_cmj'),
        fetchFullTable('velocidad_tests'),
        fetchFullTable('vo2max_tests'),
      ]);

      setPlayers(pData || []);

      // Merge IMTP and CMJ datasets (both have player_id and fecha_test)
      const mergedMap = new Map<string, any>();
      (imtpRes || []).forEach((item: any) => {
        const key = `${item.player_id}_${item.fecha_test}`;
        mergedMap.set(key, { ...item });
      });
      (cmjRes || []).forEach((item: any) => {
        const key = `${item.player_id}_${item.fecha_test}`;
        const existing = mergedMap.get(key);
        if (existing) {
          mergedMap.set(key, { ...existing, ...item });
        } else {
          mergedMap.set(key, { ...item });
        }
      });
      setImtpData(Array.from(mergedMap.values()));
      setSpeedData(sData || []);
      setVo2maxData(vData || []);
    } catch (e) {
      console.error("Error loading physical evaluations data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (clubDropdownRef.current && !clubDropdownRef.current.contains(target)) {
        setIsClubDropdownOpen(false);
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(target)) {
        setIsCategoryDropdownOpen(false);
      }
      if (positionDropdownRef.current && !positionDropdownRef.current.contains(target)) {
        setIsPositionDropdownOpen(false);
      }
      if (playerDropdownRef.current && !playerDropdownRef.current.contains(target)) {
        setIsPlayerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Initialize Dates
  useEffect(() => {
    if (imtpData.length > 0 && !hasInitializedDates.current) {
      let latestDateStr = '';
      imtpData.forEach(item => {
        const dStr = item.fecha_test || item.fecha;
        if (dStr && (!latestDateStr || dStr > latestDateStr)) {
          latestDateStr = dStr;
        }
      });
      speedData.forEach(item => {
        const dStr = item.fecha;
        if (dStr && (!latestDateStr || dStr > latestDateStr)) {
          latestDateStr = dStr;
        }
      });
      vo2maxData.forEach(item => {
        const dStr = item.fecha;
        if (dStr && (!latestDateStr || dStr > latestDateStr)) {
          latestDateStr = dStr;
        }
      });

      if (latestDateStr) {
        try {
          const dateObj = new Date(latestDateStr);
          if (!isNaN(dateObj.getTime())) {
            const formattedDate = dateObj.toISOString().split('T')[0];
            setStartDate('2020-01-01');
            setEndDate(formattedDate);
            hasInitializedDates.current = true;
          }
        } catch (e) {
          console.error("Error parsing physical evaluations date:", e);
        }
      }
    }
  }, [imtpData, speedData, vo2maxData]);

  // Unique filters data lists
  const availableClubs = useMemo(() => {
    const set = new Set<string>();
    players.forEach(p => {
      const clubName = clubs.find(c => Number(c.id_club) === Number(p.id_club) || Number(c.id) === Number(p.id_club))?.nombre || p.club || p.club_name;
      if (clubName) set.add(clubName);
    });
    return Array.from(set).sort();
  }, [players, clubs]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    players.forEach(p => {
      if (p.anio) set.add(p.anio.toString());
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [players]);

  const positions = useMemo(() => {
    const set = new Set<string>();
    players.forEach(p => {
      if (p.posicion) set.add(p.posicion);
    });
    return Array.from(set).sort();
  }, [players]);

  // Filter lists by search query
  const filteredClubsBySearch = useMemo(() => {
    if (!clubQuery) return availableClubs;
    return availableClubs.filter(c => c.toLowerCase().includes(clubQuery.toLowerCase()));
  }, [availableClubs, clubQuery]);

  const filteredCategoriesBySearch = useMemo(() => {
    if (!categoryQuery) return categories;
    return categories.filter(c => c.toLowerCase().includes(categoryQuery.toLowerCase()));
  }, [categories, categoryQuery]);

  const filteredPositionsBySearch = useMemo(() => {
    if (!positionQuery) return positions;
    return positions.filter(p => p.toLowerCase().includes(positionQuery.toLowerCase()));
  }, [positions, positionQuery]);

  // Unified athletes physical profiles list
  const unifiedAthletesProfiles = useMemo(() => {
    return players.map(player => {
      const clubName = clubs.find(c => Number(c.id_club) === Number(player.id_club) || Number(c.id) === Number(player.id_club))?.nombre || player.club || player.club_name || 'N/A';
      
      // Filter evaluations for this player within date range
      const playerImtps = imtpData.filter(i => {
        if (i.player_id !== player.player_id) return false;
        const d = i.fecha_test || i.fecha;
        return d && d >= startDate && d <= endDate;
      }).sort((a, b) => new Date(b.fecha_test || b.fecha).getTime() - new Date(a.fecha_test || a.fecha).getTime());

      const playerSpeeds = speedData.filter(s => {
        if (s.player_id !== player.player_id) return false;
        const d = s.fecha;
        return d && d >= startDate && d <= endDate;
      }).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

      const playerVo2max = vo2maxData.filter(v => {
        if (v.player_id !== player.player_id) return false;
        const d = v.fecha;
        return d && d >= startDate && d <= endDate;
      }).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

      // Grab latest in selected date range
      const latestImtp = playerImtps[0];
      const latestSpeed = playerSpeeds[0];
      const latestVo2 = playerVo2max[0];

      return {
        player_id: player.player_id,
        player_name: `${player.nombre || ''} ${player.apellido1 || ''} ${player.apellido2 || ''}`.trim(),
        player_raw: player,
        club_name: clubName,
        posicion: player.posicion || 'N/A',
        anio: player.anio || 'N/A',
        
        // Metrics
        imtp_fuerza_n: latestImtp?.imtp_fuerza_n || 0,
        cmj_rsi_mod: latestImtp?.cmj_rsi_mod || 0,
        cmj_altura_salto_im: latestImtp?.cmj_altura_salto_im || 0,
        tiempo_total: latestSpeed?.tiempo_total || 0,
        vo2_max: latestVo2?.vo2_max || 0,

        // Dates
        imtp_date: latestImtp?.fecha_test || 'N/A',
        speed_date: latestSpeed?.fecha || 'N/A',
        vo2_date: latestVo2?.fecha || 'N/A'
      };
    });
  }, [players, imtpData, speedData, vo2maxData, startDate, endDate, clubs]);

  // Apply Sidebar / Dropdown Filters
  const filteredProfiles = useMemo(() => {
    return unifiedAthletesProfiles.filter(profile => {
      // Club filter
      const matchesClub = selectedClubs.length === 0 || selectedClubs.some(sc =>
        normalizeClub(profile.club_name) === normalizeClub(sc)
      );

      // Category / Year filter
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.some(sc =>
        profile.anio?.toString() === sc
      );

      // Position filter
      const matchesPosition = selectedPositions.length === 0 || selectedPositions.some(sp =>
        profile.posicion?.toString() === sp
      );

      // Player filter
      const isMyClub = userRole !== 'club' || (userClub && normalizeClub(profile.club_name) === normalizeClub(userClub));
      const displayName = isMyClub ? profile.player_name : `Jugador [${profile.player_id}]`;
      const matchesPlayer = selectedPlayers.length === 0 || selectedPlayers.includes(displayName);

      // Check if athlete has at least one test recorded in selected range
      const hasEvaluations = profile.imtp_fuerza_n > 0 || profile.cmj_rsi_mod > 0 || profile.cmj_altura_salto_im > 0 || profile.tiempo_total > 0 || profile.vo2_max > 0;

      return matchesClub && matchesCategory && matchesPosition && matchesPlayer && hasEvaluations;
    });
  }, [unifiedAthletesProfiles, selectedClubs, selectedCategories, selectedPositions, selectedPlayers, userRole, userClub]);

  // Populate players multi-select list dynamically
  const availablePlayers = useMemo(() => {
    const list = unifiedAthletesProfiles
      .filter(profile => {
        const matchesClub = selectedClubs.length === 0 || selectedClubs.some(sc =>
          normalizeClub(profile.club_name) === normalizeClub(sc)
        );
        const matchesCategory = selectedCategories.length === 0 || selectedCategories.some(sc =>
          profile.anio?.toString() === sc
        );
        const matchesPosition = selectedPositions.length === 0 || selectedPositions.some(sp =>
          profile.posicion?.toString() === sp
        );
        const hasEvaluations = profile.imtp_fuerza_n > 0 || profile.cmj_rsi_mod > 0 || profile.cmj_altura_salto_im > 0 || profile.tiempo_total > 0 || profile.vo2_max > 0;
        return matchesClub && matchesCategory && matchesPosition && hasEvaluations;
      })
      .map(p => {
        const isMyClub = userRole !== 'club' || (userClub && normalizeClub(p.club_name) === normalizeClub(userClub));
        return isMyClub ? p.player_name : `Jugador [${p.player_id}]`;
      });
    return Array.from(new Set(list)).sort();
  }, [unifiedAthletesProfiles, selectedClubs, selectedCategories, selectedPositions, userRole, userClub]);

  const filteredPlayersBySearch = useMemo(() => {
    if (!playerQuery) return availablePlayers;
    return availablePlayers.filter(p => p.toLowerCase().includes(playerQuery.toLowerCase()));
  }, [availablePlayers, playerQuery]);

  // Sorting Handler
  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key) {
      if (sortConfig.direction === 'asc') {
        direction = 'desc';
      } else {
        setSortConfig(null);
        return;
      }
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return (
        <span className="inline-flex flex-col ml-1.5 align-middle opacity-30 group-hover:opacity-100 transition-opacity">
          <i className="fa-solid fa-caret-up text-[9px] leading-[6px]"></i>
          <i className="fa-solid fa-caret-down text-[9px] leading-[6px] -mt-[1px]"></i>
        </span>
      );
    }
    if (sortConfig.direction === 'asc') {
      return (
        <span className="inline-flex flex-col ml-1.5 align-middle text-red-600">
          <i className="fa-solid fa-caret-up text-[9px] leading-[6px]"></i>
          <i className="fa-solid fa-caret-down text-[9px] leading-[6px] -mt-[1px] opacity-25"></i>
        </span>
      );
    }
    return (
      <span className="inline-flex flex-col ml-1.5 align-middle text-red-600">
        <i className="fa-solid fa-caret-up text-[9px] leading-[6px] opacity-25"></i>
        <i className="fa-solid fa-caret-down text-[9px] leading-[6px]"></i>
      </span>
    );
  };

  const sortedFilteredData = useMemo(() => {
    const data = [...filteredProfiles];
    if (!sortConfig) return data;

    data.sort((a, b) => {
      let aVal: any = 0;
      let bVal: any = 0;

      switch (sortConfig.key) {
        case 'player_name':
          aVal = a.player_name || '';
          bVal = b.player_name || '';
          break;
        case 'club_name':
          aVal = a.club_name || '';
          bVal = b.club_name || '';
          break;
        case 'posicion':
          aVal = a.posicion || '';
          bVal = b.posicion || '';
          break;
        case 'imtp_fuerza_n':
          aVal = a.imtp_fuerza_n || 0;
          bVal = b.imtp_fuerza_n || 0;
          break;
        case 'cmj_rsi_mod':
          aVal = a.cmj_rsi_mod || 0;
          bVal = b.cmj_rsi_mod || 0;
          break;
        case 'cmj_altura_salto_im':
          aVal = a.cmj_altura_salto_im || 0;
          bVal = b.cmj_altura_salto_im || 0;
          break;
        case 'tiempo_total':
          aVal = a.tiempo_total || 999; // Lower is better, so treat 0 as 999
          if (aVal === 0) aVal = 999;
          bVal = b.tiempo_total || 999;
          if (bVal === 0) bVal = 999;
          break;
        case 'vo2_max':
          aVal = a.vo2_max || 0;
          bVal = b.vo2_max || 0;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return data;
  }, [filteredProfiles, sortConfig]);

  // Aggregate stats averages
  const statsAverages = useMemo(() => {
    const validImtp = filteredProfiles.filter(p => p.imtp_fuerza_n > 0);
    const validRsi = filteredProfiles.filter(p => p.cmj_rsi_mod > 0);
    const validHeight = filteredProfiles.filter(p => p.cmj_altura_salto_im > 0);
    const validSpeed = filteredProfiles.filter(p => p.tiempo_total > 0);
    const validVo2 = filteredProfiles.filter(p => p.vo2_max > 0);

    return {
      totalEvaluated: filteredProfiles.length,
      avgImtpForce: validImtp.length > 0 ? (validImtp.reduce((acc, curr) => acc + curr.imtp_fuerza_n, 0) / validImtp.length).toFixed(0) : '0',
      avgCmjRsi: validRsi.length > 0 ? (validRsi.reduce((acc, curr) => acc + curr.cmj_rsi_mod, 0) / validRsi.length).toFixed(2) : '0.00',
      avgCmjHeight: validHeight.length > 0 ? (validHeight.reduce((acc, curr) => acc + curr.cmj_altura_salto_im, 0) / validHeight.length).toFixed(1) : '0.0',
      avgSpeedTime: validSpeed.length > 0 ? (validSpeed.reduce((acc, curr) => acc + curr.tiempo_total, 0) / validSpeed.length).toFixed(2) : '0.00',
      avgVo2Max: validVo2.length > 0 ? (validVo2.reduce((acc, curr) => acc + curr.vo2_max, 0) / validVo2.length).toFixed(1) : '0.0',
    };
  }, [filteredProfiles]);

  // Pie chart data distributions
  const chartData = useMemo(() => {
    if (filteredProfiles.length === 0) return null;

    const imtpDist = { Excelente: 0, Normal: 0, Bajo: 0 };
    const cmjHeightDist = { Excelente: 0, Normal: 0, Bajo: 0 };
    const speedDist = { Excelente: 0, Normal: 0, Bajo: 0 };

    filteredProfiles.forEach(p => {
      const imtpStatus = getPhysicalStatus(p.imtp_fuerza_n, 'imtp');
      const heightStatus = getPhysicalStatus(p.cmj_altura_salto_im, 'cmj_height');
      const speedStatus = getPhysicalStatus(p.tiempo_total, 'speed');

      if (imtpStatus.label !== 'Sin Datos') {
        imtpDist[imtpStatus.label as keyof typeof imtpDist]++;
      }
      if (heightStatus.label !== 'Sin Datos') {
        cmjHeightDist[heightStatus.label as keyof typeof cmjHeightDist]++;
      }
      if (speedStatus.label !== 'Sin Datos') {
        speedDist[speedStatus.label as keyof typeof speedDist]++;
      }
    });

    const formatForPie = (counts: any) => {
      return [
        { name: 'Excelente', value: counts.Excelente, color: '#10b981' },
        { name: 'Normal', value: counts.Normal, color: '#f59e0b' },
        { name: 'Bajo', value: counts.Bajo, color: '#ef4444' }
      ].filter(item => item.value > 0);
    };

    return {
      imtp: formatForPie(imtpDist),
      cmj: formatForPie(cmjHeightDist),
      speed: formatForPie(speedDist)
    };
  }, [filteredProfiles]);

  // Generate AI Physical Performance Summary
  const generateAiSummary = async () => {
    if (filteredProfiles.length === 0) return;
    setIsGenerating(true);
    try {
      const response = await fetch('/api/gemini/summarize-physical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            totalPlayers: filteredProfiles.length,
            avgImtpForce: statsAverages.avgImtpForce,
            avgCmjRsi: statsAverages.avgCmjRsi,
            avgCmjHeight: statsAverages.avgCmjHeight,
            avgSpeedTime: statsAverages.avgSpeedTime,
            avgVo2Max: statsAverages.avgVo2Max
          }
        })
      });

      if (!response.ok) {
        throw new Error("HTTP error while summarizing physical data");
      }

      const resData = await response.json();
      setAiSummary(resData.text || 'No se pudo generar el resumen.');
    } catch (error) {
      console.warn("AI Physical Summary Error (using client fallback):", error);
      
      // Fallback local report generators
      const imtpEval = Number(statsAverages.avgImtpForce) >= 3500 ? "Excelente" : (Number(statsAverages.avgImtpForce) >= 2800 ? "Normal" : "Bajo");
      const heightEval = Number(statsAverages.avgCmjHeight) >= 42 ? "Excelente" : (Number(statsAverages.avgCmjHeight) >= 35 ? "Normal" : "Bajo");
      const speedEval = Number(statsAverages.avgSpeedTime) <= 4.10 ? "Excelente" : (Number(statsAverages.avgSpeedTime) <= 4.40 ? "Normal" : "Bajo");
      const vo2Eval = Number(statsAverages.avgVo2Max) >= 58 ? "Excelente" : (Number(statsAverages.avgVo2Max) >= 52 ? "Normal" : "Bajo");

      setAiSummary(`### Resumen Ejecutivo de Evaluaciones Físicas (Modo de Respaldo)
Se analizó el perfil neuromuscular y metabólico de un plantel de **${filteredProfiles.length} deportistas**. 

El promedio de **Fuerza IMTP** se registra en **${statsAverages.avgImtpForce} N** (${imtpEval}), demostrando niveles generales de base de fuerza. En potencia vertical, la **Altura CMJ** promedio se sitúa en **${statsAverages.avgCmjHeight} cm** (${heightEval}) con un **RSI Mod** de **${statsAverages.avgCmjRsi}**. El **Test de Velocidad 30m** promedia **${statsAverages.avgSpeedTime} s** (${speedEval}), indicando capacidad de aceleración. Finalmente, la **Potencia Aeróbica (VO2 Max)** alcanza un promedio de **${statsAverages.avgVo2Max} ml/kg/min** (${vo2Eval}).

**Recomendación de Planificación:**
Focalizar microdosis de entrenamiento de fuerza excéntrica y pliometría horizontal para elevar el índice de fuerza reactiva (RSI) en jugadores en zona de alerta. Continuar con bloques de intervalado de alta intensidad (HIIT) para consolidar el perfil de resistencia aeróbica metabólica.`);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (filteredProfiles.length > 0) {
      generateAiSummary();
    }
  }, [filteredProfiles.length]);

  // Multi-select toggle helpers
  const handleToggleClub = (clubName: string) => {
    if (userRole === 'club' && userClub) return;
    setSelectedClubs(prev => prev.includes(clubName) ? prev.filter(c => c !== clubName) : [...prev, clubName]);
  };

  const handleToggleCategory = (catName: string) => {
    setSelectedCategories(prev => prev.includes(catName) ? prev.filter(c => c !== catName) : [...prev, catName]);
  };

  const handleTogglePosition = (posName: string) => {
    setSelectedPositions(prev => prev.includes(posName) ? prev.filter(p => p !== posName) : [...prev, posName]);
  };

  const handleTogglePlayer = (playerName: string) => {
    setSelectedPlayers(prev => prev.includes(playerName) ? prev.filter(p => p !== playerName) : [...prev, playerName]);
  };

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, value }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 20;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (value === 0) return null;

    return (
      <text x={x} y={y} fill="#1e293b" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-[10px] font-black">
        {`${value} (${(percent * 100).toFixed(0)}%)`}
      </text>
    );
  };

  // Export PDF Report with exact matches
  const downloadPdfReport = () => {
    if (sortedFilteredData.length === 0) return;

    try {
      const doc = new jsPDF({
        orientation: 'l', // Landscape layout for wider table
        unit: 'mm',
        format: 'a4'
      });

      const primaryColor = [11, 18, 32] as [number, number, number];
      const secondaryColor = [220, 38, 38] as [number, number, number];
      const margin = 15;
      const pageWidth = doc.internal.pageSize.getWidth();

      // Top Header
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(1.5);
      doc.line(margin, 10, pageWidth - margin, 10);
      
      doc.setDrawColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.setLineWidth(0.5);
      doc.line(margin, 11.5, pageWidth - margin, 11.5);

      // Logo
      const logoUrl = getDriveDirectLink(FEDERATION_LOGO);
      try {
        doc.addImage(logoUrl, 'PNG', margin, 15, 18, 18);
      } catch (e) {
        console.warn("Could not add federation logo", e);
      }

      // Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("LA ROJA PERFORMANCE HUB", 38, 22);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text("REPORTE DE EVALUACIONES FÍSICAS GRUPALES (DEPARTAMENTO DE PREPARACIÓN FÍSICA)", 38, 27);

      // Cards Grid
      const cardWidth = 50;
      const cardHeight = 16;
      const cardY = 38;
      const spacing = 5;

      const cardData = [
        { title: 'JUGADORES EVALUADOS', val: `${filteredProfiles.length} JUG` },
        { title: 'PROM. IMTP FUERZA PEAK', val: `${statsAverages.avgImtpForce} N` },
        { title: 'PROM. CMJ RSI MOD', val: statsAverages.avgCmjRsi },
        { title: 'PROM. CMJ ALTURA', val: `${statsAverages.avgCmjHeight} cm` },
        { title: 'PROM. VELOCIDAD 30M', val: `${statsAverages.avgSpeedTime} s` },
      ];

      cardData.forEach((card, idx) => {
        const xPos = margin + idx * (cardWidth + spacing);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(xPos, cardY, cardWidth, cardHeight, 1.5, 1.5, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(100, 116, 139);
        doc.text(card.title, xPos + 3, cardY + 5);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(11, 18, 32);
        doc.text(card.val, xPos + 3, cardY + 11);
      });

      // Data Table setup
      const tableHeaders = [
        'Jugador', 
        'Club', 
        'Posición', 
        'Categoría', 
        'IMTP Fuerza Peak (N)', 
        'CMJ RSI Mod', 
        'CMJ Altura Salto (cm)', 
        'Velocidad 30m (s)', 
        'VO2 Max (ml/kg/min)'
      ];

      const tableRows = sortedFilteredData.map(row => [
        row.player_name,
        row.club_name,
        row.posicion,
        row.anio,
        row.imtp_fuerza_n > 0 ? `${row.imtp_fuerza_n} N` : '-',
        row.cmj_rsi_mod > 0 ? row.cmj_rsi_mod.toFixed(2) : '-',
        row.cmj_altura_salto_im > 0 ? `${row.cmj_altura_salto_im} cm` : '-',
        row.tiempo_total > 0 ? `${row.tiempo_total.toFixed(2)} s` : '-',
        row.vo2_max > 0 ? `${row.vo2_max} ml/kg` : '-'
      ]);

      autoTable(doc, {
        head: [tableHeaders],
        body: tableRows,
        startY: 60,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2.5, halign: 'center' },
        headStyles: { fillColor: [11, 18, 32], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
          0: { halign: 'left', fontStyle: 'bold', cellWidth: 45 },
          1: { halign: 'left', cellWidth: 35 },
        }
      });

      doc.save(`Resumen_Grupal_Evaluaciones_Fisicas_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error("Error creating physical evaluation PDF:", err);
    }
  };

  return (
    <div id="physical-resumen-grupal" className="flex flex-col gap-6 p-6 max-w-[1600px] mx-auto animate-fade-in">
      
      {/* Title Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-red-600 text-white font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
              Área Física
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 mt-1 uppercase">
            Evaluaciones Físicas Grupal
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-0.5">
            Diagnóstico físico transversal y perfiles de fuerza, potencia y capacidad aeróbica.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={downloadPdfReport}
            disabled={sortedFilteredData.length === 0}
            className="flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed px-5 py-3 rounded-xl text-xs font-black tracking-widest uppercase transition-all shadow-md shadow-slate-900/10"
          >
            <i className="fa-solid fa-file-pdf"></i>
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Control Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        
        {/* Date From */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Fecha Inicio</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:border-red-500 transition-all"
          />
        </div>

        {/* Date To */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Fecha Fin</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:border-red-500 transition-all"
          />
        </div>

        {/* Clubs Dropdown */}
        <div ref={clubDropdownRef} className="flex flex-col gap-1.5 relative">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Clubes</label>
          <button
            onClick={() => setIsClubDropdownOpen(!isClubDropdownOpen)}
            disabled={userRole === 'club'}
            className="w-full flex items-center justify-between bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2.5 hover:bg-slate-100/50 transition-all text-left min-h-[38px]"
          >
            <div className="flex items-center gap-1.5 truncate max-w-[90%]">
              {selectedClubs.length === 0 ? (
                <span className="text-slate-500">Todos los Clubes</span>
              ) : selectedClubs.length === 1 ? (
                <>
                  <ClubBadge clubName={selectedClubs[0]} logoSize="w-4 h-4" showName={false} />
                  <span className="truncate text-slate-900 font-extrabold">{selectedClubs[0]}</span>
                </>
              ) : selectedClubs.length === 2 ? (
                <span className="truncate text-slate-900 font-extrabold">{selectedClubs[0]}, {selectedClubs[1]}</span>
              ) : (
                <span className="text-red-700 font-black bg-red-50 px-2 py-0.5 rounded-md border border-red-100 text-[10px]">
                  {selectedClubs.length} Clubes
                </span>
              )}
            </div>
            <i className="fa-solid fa-chevron-down text-[10px] opacity-70"></i>
          </button>
          
          {isClubDropdownOpen && (
            <div className="absolute top-[105%] left-0 w-[280px] sm:w-[320px] bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-3 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="relative mb-2">
                <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400"></i>
                <input
                  type="text"
                  placeholder="Buscar club..."
                  value={clubQuery}
                  onChange={(e) => setClubQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs pl-7 pr-2.5 py-1.5 rounded-lg focus:outline-none focus:border-red-500 transition-all"
                />
              </div>

              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Opciones</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedClubs(availableClubs)}
                    type="button"
                    className="text-[9px] font-black text-red-600 hover:text-red-700 transition-colors uppercase tracking-wider"
                  >
                    Todos
                  </button>
                  <span className="text-slate-300 text-[10px]">|</span>
                  <button
                    onClick={() => setSelectedClubs([])}
                    type="button"
                    className="text-[9px] font-black text-slate-500 hover:text-slate-700 transition-colors uppercase tracking-wider"
                  >
                    Ninguno
                  </button>
                </div>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                {filteredClubsBySearch.length === 0 ? (
                  <div className="text-center py-4 text-slate-400 text-xs font-bold">No se encontraron clubes</div>
                ) : (
                  filteredClubsBySearch.map(club => {
                    const isSelected = selectedClubs.includes(club);
                    return (
                      <button
                        key={club}
                        onClick={() => handleToggleClub(club)}
                        className={`w-full flex items-center justify-between text-left px-2 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          isSelected
                            ? 'bg-red-50 text-red-700 border-l-2 border-red-600'
                            : 'hover:bg-slate-50 text-slate-700 border-l-2 border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <ClubBadge clubName={club} logoSize="w-4 h-4" showName={false} />
                          <span className="truncate">{club}</span>
                        </div>
                        {isSelected ? (
                          <i className="fa-solid fa-circle-check text-red-600 text-xs"></i>
                        ) : (
                          <div className="w-3 h-3 rounded-full border border-slate-300"></div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Categories Dropdown */}
        <div ref={categoryDropdownRef} className="flex flex-col gap-1.5 relative">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Categoría (Año)</label>
          <button
            onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
            className="w-full flex items-center justify-between bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2.5 hover:bg-slate-100/50 transition-all text-left min-h-[38px]"
          >
            <span className="truncate">
              {selectedCategories.length === 0 ? 'Todas las Categorías' : `${selectedCategories.length} seleccionada(s)`}
            </span>
            <i className="fa-solid fa-chevron-down text-[10px] opacity-70"></i>
          </button>
          
          {isCategoryDropdownOpen && (
            <div className="absolute top-[105%] left-0 w-[220px] bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-3 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="relative mb-2">
                <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400"></i>
                <input
                  type="text"
                  placeholder="Buscar año..."
                  value={categoryQuery}
                  onChange={(e) => setCategoryQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs pl-7 pr-2.5 py-1.5 rounded-lg focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Opciones</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedCategories(categories)}
                    type="button"
                    className="text-[9px] font-black text-red-600 hover:text-red-700 transition-colors uppercase tracking-wider"
                  >
                    Todos
                  </button>
                  <span className="text-slate-300 text-[10px]">|</span>
                  <button
                    onClick={() => setSelectedCategories([])}
                    type="button"
                    className="text-[9px] font-black text-slate-500 hover:text-slate-700 transition-colors uppercase tracking-wider"
                  >
                    Ninguno
                  </button>
                </div>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                {filteredCategoriesBySearch.map(cat => {
                  const isSelected = selectedCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      onClick={() => handleToggleCategory(cat)}
                      className={`w-full flex items-center justify-between text-left px-2 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-red-50 text-red-700 border-l-2 border-red-600'
                          : 'hover:bg-slate-50 text-slate-700 border-l-2 border-transparent'
                      }`}
                    >
                      <span>{cat}</span>
                      {isSelected ? (
                        <i className="fa-solid fa-circle-check text-red-600 text-xs"></i>
                      ) : (
                        <div className="w-3 h-3 rounded-full border border-slate-300"></div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Positions Dropdown */}
        <div ref={positionDropdownRef} className="flex flex-col gap-1.5 relative">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Posición</label>
          <button
            onClick={() => setIsPositionDropdownOpen(!isPositionDropdownOpen)}
            className="w-full flex items-center justify-between bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2.5 hover:bg-slate-100/50 transition-all text-left min-h-[38px]"
          >
            <span className="truncate">
              {selectedPositions.length === 0 ? 'Todas las Posiciones' : `${selectedPositions.length} seleccionada(s)`}
            </span>
            <i className="fa-solid fa-chevron-down text-[10px] opacity-70"></i>
          </button>
          
          {isPositionDropdownOpen && (
            <div className="absolute top-[105%] left-0 w-[220px] bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-3 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="relative mb-2">
                <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400"></i>
                <input
                  type="text"
                  placeholder="Buscar posición..."
                  value={positionQuery}
                  onChange={(e) => setPositionQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs pl-7 pr-2.5 py-1.5 rounded-lg focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Opciones</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedPositions(positions)}
                    type="button"
                    className="text-[9px] font-black text-red-600 hover:text-red-700 transition-colors uppercase tracking-wider"
                  >
                    Todos
                  </button>
                  <span className="text-slate-300 text-[10px]">|</span>
                  <button
                    onClick={() => setSelectedPositions([])}
                    type="button"
                    className="text-[9px] font-black text-slate-500 hover:text-slate-700 transition-colors uppercase tracking-wider"
                  >
                    Ninguno
                  </button>
                </div>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                {filteredPositionsBySearch.map(pos => {
                  const isSelected = selectedPositions.includes(pos);
                  return (
                    <button
                      key={pos}
                      onClick={() => handleTogglePosition(pos)}
                      className={`w-full flex items-center justify-between text-left px-2 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-red-50 text-red-700 border-l-2 border-red-600'
                          : 'hover:bg-slate-50 text-slate-700 border-l-2 border-transparent'
                      }`}
                    >
                      <span className="truncate">{pos}</span>
                      {isSelected ? (
                        <i className="fa-solid fa-circle-check text-red-600 text-xs"></i>
                      ) : (
                        <div className="w-3 h-3 rounded-full border border-slate-300"></div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Individual Player Selection */}
        <div ref={playerDropdownRef} className="flex flex-col gap-1.5 relative">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Deportistas</label>
          <button
            onClick={() => setIsPlayerDropdownOpen(!isPlayerDropdownOpen)}
            className="w-full flex items-center justify-between bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2.5 hover:bg-slate-100/50 transition-all text-left min-h-[38px]"
          >
            <span className="truncate">
              {selectedPlayers.length === 0 ? 'Todos los Jugadores' : `${selectedPlayers.length} seleccionado(s)`}
            </span>
            <i className="fa-solid fa-chevron-down text-[10px] opacity-70"></i>
          </button>
          
          {isPlayerDropdownOpen && (
            <div className="absolute top-[105%] left-0 w-[240px] bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-3 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="relative mb-2">
                <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400"></i>
                <input
                  type="text"
                  placeholder="Buscar deportista..."
                  value={playerQuery}
                  onChange={(e) => setPlayerQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs pl-7 pr-2.5 py-1.5 rounded-lg focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Opciones</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedPlayers(availablePlayers)}
                    type="button"
                    className="text-[9px] font-black text-red-600 hover:text-red-700 transition-colors uppercase tracking-wider"
                  >
                    Todos
                  </button>
                  <span className="text-slate-300 text-[10px]">|</span>
                  <button
                    onClick={() => setSelectedPlayers([])}
                    type="button"
                    className="text-[9px] font-black text-slate-500 hover:text-slate-700 transition-colors uppercase tracking-wider"
                  >
                    Ninguno
                  </button>
                </div>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                {filteredPlayersBySearch.map(name => {
                  const isSelected = selectedPlayers.includes(name);
                  return (
                    <button
                      key={name}
                      onClick={() => handleTogglePlayer(name)}
                      className={`w-full flex items-center justify-between text-left px-2 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-red-50 text-red-700 border-l-2 border-red-600'
                          : 'hover:bg-slate-50 text-slate-700 border-l-2 border-transparent'
                      }`}
                    >
                      <span className="truncate">{name}</span>
                      {isSelected ? (
                        <i className="fa-solid fa-circle-check text-red-600 text-xs"></i>
                      ) : (
                        <div className="w-3 h-3 rounded-full border border-slate-300"></div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* AI Summary Box Card */}
      {filteredProfiles.length > 0 && (
        <div className="bg-[#0b1220] text-white p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-start gap-6 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-red-600/10 blur-[100px] pointer-events-none rounded-full"></div>
          <div className="flex items-center justify-center bg-red-600/10 border border-red-500/30 p-4 rounded-2xl shrink-0">
            <i className="fa-solid fa-wand-magic-sparkles text-2xl text-red-500 animate-pulse"></i>
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-widest text-red-500">Resumen Ejecutivo de Rendimiento Físico</h2>
              {isGenerating && (
                <span className="text-[10px] font-black uppercase tracking-widest bg-red-950/60 text-red-400 px-2 py-0.5 rounded border border-red-500/20 flex items-center gap-1.5">
                  <i className="fa-solid fa-spinner animate-spin"></i>
                  Sincronizando
                </span>
              )}
            </div>
            
            <div className="prose prose-sm prose-invert max-w-none text-slate-300 text-xs leading-relaxed font-medium">
              {aiSummary ? (
                aiSummary.split('\n').map((line, idx) => {
                  if (line.startsWith('###')) {
                    return <h3 key={idx} className="text-white font-black text-sm uppercase tracking-wide mt-3 mb-1">{line.replace('###', '').trim()}</h3>;
                  }
                  if (line.startsWith('**')) {
                    return <p key={idx} className="mt-2 text-white font-black">{line}</p>;
                  }
                  return <p key={idx} className="mt-1">{line}</p>;
                })
              ) : (
                <div className="h-20 flex items-center justify-center">
                  <span className="text-slate-400 text-xs">Preparando diagnóstico de rendimiento...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bento Grid Stats Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Plantel</span>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 leading-none">{statsAverages.totalEvaluated}</div>
            <span className="text-[9px] text-slate-400 font-bold uppercase mt-1 inline-block">Deportistas</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Prom. IMTP Peak</span>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 leading-none">{statsAverages.avgImtpForce} N</div>
            <span className="text-[9px] text-slate-400 font-bold uppercase mt-1 inline-block">Fuerza Máxima</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Prom. RSI Mod</span>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 leading-none">{statsAverages.avgCmjRsi}</div>
            <span className="text-[9px] text-slate-400 font-bold uppercase mt-1 inline-block">Índice Reactivo</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Prom. Altura CMJ</span>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 leading-none">{statsAverages.avgCmjHeight} cm</div>
            <span className="text-[9px] text-slate-400 font-bold uppercase mt-1 inline-block">Capacidad Salto</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Prom. Tiempo 30m</span>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 leading-none">{statsAverages.avgSpeedTime} s</div>
            <span className="text-[9px] text-slate-400 font-bold uppercase mt-1 inline-block">Sprint Aceleración</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Prom. VO2 Max</span>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 leading-none">{statsAverages.avgVo2Max}</div>
            <span className="text-[9px] text-slate-400 font-bold uppercase mt-1 inline-block">ml / kg / min</span>
          </div>
        </div>

      </div>

      {/* Interactive Pie Charts Grid */}
      {chartData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest mb-4">
              Distribución Fuerza Máxima (IMTP)
            </h3>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.imtp}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={65}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.imtp.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} iconSize={8} className="text-[10px]" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest mb-4">
              Distribución Potencia Salto (CMJ)
            </h3>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.cmj}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={65}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.cmj.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} iconSize={8} className="text-[10px]" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest mb-4">
              Distribución Velocidad (30m)
            </h3>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.speed}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={65}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.speed.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} iconSize={8} className="text-[10px]" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* Main Grid Table Area with 5 Physical Evaluation Columns */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th 
                  onClick={() => requestSort('player_name')}
                  className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider cursor-pointer group hover:bg-slate-100 transition-all select-none"
                >
                  Jugador {getSortIcon('player_name')}
                </th>
                <th 
                  onClick={() => requestSort('club_name')}
                  className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider cursor-pointer group hover:bg-slate-100 transition-all select-none"
                >
                  Club {getSortIcon('club_name')}
                </th>
                <th 
                  onClick={() => requestSort('posicion')}
                  className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider cursor-pointer group hover:bg-slate-100 transition-all select-none"
                >
                  Posición {getSortIcon('posicion')}
                </th>
                {/* EXACTLY 5 COLUMNS OF PHYSICAL EVALUATION DATA POINTS */}
                <th 
                  onClick={() => requestSort('imtp_fuerza_n')}
                  className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-wider cursor-pointer group hover:bg-slate-100 transition-all select-none border-l border-slate-100 bg-red-50/10"
                >
                  IMTP Fuerza Peak (N) {getSortIcon('imtp_fuerza_n')}
                </th>
                <th 
                  onClick={() => requestSort('cmj_rsi_mod')}
                  className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-wider cursor-pointer group hover:bg-slate-100 transition-all select-none"
                >
                  CMJ RSI Mod {getSortIcon('cmj_rsi_mod')}
                </th>
                <th 
                  onClick={() => requestSort('cmj_altura_salto_im')}
                  className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-wider cursor-pointer group hover:bg-slate-100 transition-all select-none"
                >
                  CMJ Altura Salto (cm) {getSortIcon('cmj_altura_salto_im')}
                </th>
                <th 
                  onClick={() => requestSort('tiempo_total')}
                  className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-wider cursor-pointer group hover:bg-slate-100 transition-all select-none"
                >
                  Velocidad 30m (s) {getSortIcon('tiempo_total')}
                </th>
                <th 
                  onClick={() => requestSort('vo2_max')}
                  className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-wider cursor-pointer group hover:bg-slate-100 transition-all select-none"
                >
                  VO2 Max (ml/kg/min) {getSortIcon('vo2_max')}
                </th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-10">
                    <div className="flex items-center justify-center gap-2 text-slate-400">
                      <i className="fa-solid fa-spinner animate-spin text-lg text-red-500"></i>
                      <span>Cargando evaluaciones físicas...</span>
                    </div>
                  </td>
                </tr>
              ) : sortedFilteredData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400 text-xs">
                    Ninguna evaluación física coincide con los filtros de búsqueda establecidos.
                  </td>
                </tr>
              ) : (
                sortedFilteredData.map((profile) => {
                  const imtpStat = getPhysicalStatus(profile.imtp_fuerza_n, 'imtp');
                  const rsiStat = getPhysicalStatus(profile.cmj_rsi_mod, 'cmj_rsi');
                  const cmjStat = getPhysicalStatus(profile.cmj_altura_salto_im, 'cmj_height');
                  const speedStat = getPhysicalStatus(profile.tiempo_total, 'speed');
                  const vo2Stat = getPhysicalStatus(profile.vo2_max, 'vo2max');

                  const isMyClub = userRole !== 'club' || (userClub && normalizeClub(profile.club_name) === normalizeClub(userClub));
                  const nameToDisplay = isMyClub ? profile.player_name : `Jugador [${profile.player_id}]`;

                  return (
                    <tr key={profile.player_id} className="hover:bg-slate-50/50 transition-all">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-950 truncate max-w-[200px]">
                            {nameToDisplay}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold mt-0.5">
                            ID: #{profile.player_id} | Cat {profile.anio}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-700">
                        <div className="flex items-center gap-2">
                          <ClubBadge clubName={profile.club_name} logoSize="w-4 h-4" showName={false} />
                          <span className="truncate max-w-[120px]">{profile.club_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-500">
                        {profile.posicion}
                      </td>
                      
                      {/* 1. IMTP Fuerza Peak Column */}
                      <td className="px-6 py-4 border-l border-slate-100 bg-red-50/5">
                        <div className="flex items-center gap-1.5">
                          {profile.imtp_fuerza_n > 0 ? (
                            <>
                              <span className="text-xs font-black text-slate-900">{profile.imtp_fuerza_n} N</span>
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md border ${imtpStat.color}`}>
                                {imtpStat.label}
                              </span>
                            </>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </div>
                        {profile.imtp_fuerza_n > 0 && (
                          <div className="text-[8px] text-slate-400 font-bold mt-0.5">
                            Eval: {profile.imtp_date}
                          </div>
                        )}
                      </td>

                      {/* 2. CMJ RSI Mod Column */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          {profile.cmj_rsi_mod > 0 ? (
                            <>
                              <span className="text-xs font-black text-slate-900">{profile.cmj_rsi_mod.toFixed(2)}</span>
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md border ${rsiStat.color}`}>
                                {rsiStat.label}
                              </span>
                            </>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </div>
                        {profile.cmj_rsi_mod > 0 && (
                          <div className="text-[8px] text-slate-400 font-bold mt-0.5">
                            Eval: {profile.imtp_date}
                          </div>
                        )}
                      </td>

                      {/* 3. CMJ Altura Column */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          {profile.cmj_altura_salto_im > 0 ? (
                            <>
                              <span className="text-xs font-black text-slate-900">{profile.cmj_altura_salto_im} cm</span>
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md border ${cmjStat.color}`}>
                                {cmjStat.label}
                              </span>
                            </>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </div>
                        {profile.cmj_altura_salto_im > 0 && (
                          <div className="text-[8px] text-slate-400 font-bold mt-0.5">
                            Eval: {profile.imtp_date}
                          </div>
                        )}
                      </td>

                      {/* 4. Speed Test Column */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          {profile.tiempo_total > 0 ? (
                            <>
                              <span className="text-xs font-black text-slate-900">{profile.tiempo_total.toFixed(2)} s</span>
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md border ${speedStat.color}`}>
                                {speedStat.label}
                              </span>
                            </>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </div>
                        {profile.tiempo_total > 0 && (
                          <div className="text-[8px] text-slate-400 font-bold mt-0.5">
                            Eval: {profile.speed_date}
                          </div>
                        )}
                      </td>

                      {/* 5. VO2 Max Column */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          {profile.vo2_max > 0 ? (
                            <>
                              <span className="text-xs font-black text-slate-900">{profile.vo2_max} ml/kg</span>
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md border ${vo2Stat.color}`}>
                                {vo2Stat.label}
                              </span>
                            </>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </div>
                        {profile.vo2_max > 0 && (
                          <div className="text-[8px] text-slate-400 font-bold mt-0.5">
                            Eval: {profile.vo2_date}
                          </div>
                        )}
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default FisicaResumenGrupal;
