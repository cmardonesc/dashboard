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

export interface MetricConfig {
  key: string;
  label: string;
  unit: string;
  lowerIsBetter: boolean;
  thresholds: {
    excellent: number;
    normal: number;
  };
}

export const ALL_METRIC_CONFIGS: Record<string, MetricConfig> = {
  // IMTP (Fuerza Máxima)
  imtp_fuerza_n: { key: 'imtp_fuerza_n', label: 'IMTP Fuerza Máxima', unit: 'N', lowerIsBetter: false, thresholds: { excellent: 3500, normal: 2800 } },
  imtp_f_relativa_n_kg: { key: 'imtp_f_relativa_n_kg', label: 'IMTP F. Relativa', unit: 'N/kg', lowerIsBetter: false, thresholds: { excellent: 45, normal: 35 } },
  imtp_asimetria: { key: 'imtp_asimetria', label: 'IMTP Asimetría', unit: '%', lowerIsBetter: true, thresholds: { excellent: 5, normal: 10 } },
  fuerza_cmj: { key: 'fuerza_cmj', label: 'Fuerza CMJ', unit: 'N', lowerIsBetter: false, thresholds: { excellent: 3500, normal: 2800 } },

  // CMJ (Potencia y Saltabilidad)
  cmj_rsi_mod: { key: 'cmj_rsi_mod', label: 'CMJ RSI Mod', unit: '', lowerIsBetter: false, thresholds: { excellent: 0.55, normal: 0.45 } },
  cmj_altura_salto_im: { key: 'cmj_altura_salto_im', label: 'CMJ Altura', unit: 'cm', lowerIsBetter: false, thresholds: { excellent: 42, normal: 35 } },
  cmj_peak_pot_relativa: { key: 'cmj_peak_pot_relativa', label: 'CMJ Peak Pot. Rel.', unit: 'W/kg', lowerIsBetter: false, thresholds: { excellent: 65, normal: 50 } },

  // Velocidad (Sprint)
  tiempo_10m: { key: 'tiempo_10m', label: 'Tiempo 10m', unit: 's', lowerIsBetter: true, thresholds: { excellent: 1.65, normal: 1.85 } },
  vel_10m: { key: 'vel_10m', label: 'Velocidad 10m', unit: 'm/s', lowerIsBetter: false, thresholds: { excellent: 7.5, normal: 6.5 } },
  tiempo_10_20m: { key: 'tiempo_10_20m', label: 'Tiempo 10-20m', unit: 's', lowerIsBetter: true, thresholds: { excellent: 1.10, normal: 1.30 } },
  tiempo_20_30m: { key: 'tiempo_20_30m', label: 'Tiempo 20-30m', unit: 's', lowerIsBetter: true, thresholds: { excellent: 1.10, normal: 1.30 } },
  tiempo_total: { key: 'tiempo_total', label: 'Tiempo Total 30m', unit: 's', lowerIsBetter: true, thresholds: { excellent: 4.10, normal: 4.40 } },

  // VO2 Max (Capacidad Aeróbica)
  vo2_max: { key: 'vo2_max', label: 'VO2 Max', unit: 'ml/kg/min', lowerIsBetter: false, thresholds: { excellent: 58, normal: 52 } },
  vam: { key: 'vam', label: 'VMA', unit: 'km/h', lowerIsBetter: false, thresholds: { excellent: 18, normal: 16 } },
  fc_max: { key: 'fc_max', label: 'FC Máxima', unit: 'bpm', lowerIsBetter: true, thresholds: { excellent: 185, normal: 195 } },
  mts: { key: 'mts', label: 'Distancia VO2', unit: 'm', lowerIsBetter: false, thresholds: { excellent: 2800, normal: 2400 } },
  vt2_fc: { key: 'vt2_fc', label: 'VT2 FC', unit: 'bpm', lowerIsBetter: true, thresholds: { excellent: 165, normal: 175 } },

  // Test 505 (Agilidad y COD)
  t_acel_2m: { key: 't_acel_2m', label: '505 T. Acel 2m', unit: 's', lowerIsBetter: true, thresholds: { excellent: 2.10, normal: 2.40 } },
  t_desacel_2m: { key: 't_desacel_2m', label: '505 T. Desacel 2m', unit: 's', lowerIsBetter: true, thresholds: { excellent: 2.10, normal: 2.40 } },
  t_cod_2m: { key: 't_cod_2m', label: '505 T. COD 2m', unit: 's', lowerIsBetter: true, thresholds: { excellent: 2.10, normal: 2.40 } },
  t_reacel_1_2m: { key: 't_reacel_1_2m', label: '505 T. Reacel 1.2m', unit: 's', lowerIsBetter: true, thresholds: { excellent: 2.10, normal: 2.40 } },
  z_score_acel: { key: 'z_score_acel', label: '505 Z-Score Acel', unit: '', lowerIsBetter: false, thresholds: { excellent: 1.5, normal: 0.5 } }
};

export const METRICS_IMTP = ['imtp_fuerza_n', 'imtp_f_relativa_n_kg', 'imtp_asimetria', 'fuerza_cmj'];
export const METRICS_CMJ = ['cmj_rsi_mod', 'cmj_altura_salto_im', 'cmj_peak_pot_relativa'];
export const METRICS_SPEED = ['tiempo_10m', 'vel_10m', 'tiempo_10_20m', 'tiempo_20_30m', 'tiempo_total'];
export const METRICS_VO2 = ['vo2_max', 'vam', 'fc_max', 'mts', 'vt2_fc'];
export const METRICS_TEST505 = ['t_acel_2m', 't_desacel_2m', 't_cod_2m', 't_reacel_1_2m', 'z_score_acel'];

const FisicaResumenGrupal: React.FC<FisicaResumenGrupalProps> = ({ userRole, userClub, userClubId, clubs = [] }) => {
  const [startDate, setStartDate] = useState<string>('2020-01-01');
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  });

  // Dynamic Selected Metric Column States
  const [imtpMetric, setImtpMetric] = useState<string>('imtp_fuerza_n');
  const [cmjMetric, setCmjMetric] = useState<string>('cmj_rsi_mod');
  const [speedMetric, setSpeedMetric] = useState<string>('tiempo_total');
  const [vo2Metric, setVo2Metric] = useState<string>('vo2_max');
  const [test505Metric, setTest505Metric] = useState<string>('t_cod_2m');

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
  const [test505Data, setTest505Data] = useState<any[]>([]);
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

  // Load physical evaluation thresholds dynamically based on metric config
  const getPhysicalStatusDynamic = (value: number, config: MetricConfig) => {
    if (value === 0 || value === undefined || isNaN(value)) {
      return { label: 'Sin Datos', color: 'bg-slate-100 text-slate-500 border-slate-200', hex: '#64748b' };
    }

    const { excellent, normal } = config.thresholds;
    if (config.lowerIsBetter) {
      if (value <= excellent) return { label: 'Excelente', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', hex: '#10b981' };
      if (value <= normal) return { label: 'Normal', color: 'bg-amber-100 text-amber-700 border-amber-200', hex: '#f59e0b' };
      return { label: 'Bajo', color: 'bg-rose-100 text-rose-700 border-rose-200', hex: '#ef4444' };
    } else {
      if (value >= excellent) return { label: 'Excelente', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', hex: '#10b981' };
      if (value >= normal) return { label: 'Normal', color: 'bg-amber-100 text-amber-700 border-amber-200', hex: '#f59e0b' };
      return { label: 'Bajo', color: 'bg-rose-100 text-rose-700 border-rose-200', hex: '#ef4444' };
    }
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
        let processedData = data;
        if (tableName === 'evaluaciones_imtp') {
          processedData = data.map((item: any) => {
            const newItem = { ...item };
            if (newItem['Peak Vertical Force [N]'] !== undefined && newItem['Peak Vertical Force [N]'] !== null) {
              newItem.imtp_fuerza_n = Number(newItem['Peak Vertical Force [N]']);
            } else if (newItem.imtp_fuerza_n !== undefined && newItem.imtp_fuerza_n !== null) {
              newItem['Peak Vertical Force [N]'] = newItem.imtp_fuerza_n;
            }
            if (newItem['Peak Vertical Force / BM [N/kg]'] !== undefined && newItem['Peak Vertical Force / BM [N/kg]'] !== null) {
              newItem.imtp_f_relativa_n_kg = Number(newItem['Peak Vertical Force / BM [N/kg]']);
            } else if (newItem.imtp_f_relativa_n_kg !== undefined && newItem.imtp_f_relativa_n_kg !== null) {
              newItem['Peak Vertical Force / BM [N/kg]'] = newItem.imtp_f_relativa_n_kg;
            }
            return newItem;
          });
        }
        allData = [...allData, ...processedData];
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
      const [pData, imtpRes, cmjRes, sData, vData, t505Res] = await Promise.all([
        fetchFullTable('players', 'player_id, nombre, apellido1, apellido2, anio, id_club, posicion'),
        fetchFullTable('evaluaciones_imtp'),
        fetchFullTable('evaluaciones_cmj'),
        fetchFullTable('velocidad_tests'),
        fetchFullTable('vo2max_tests'),
        fetchFullTable('test_505'),
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
      setTest505Data(t505Res || []);
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
      test505Data.forEach(item => {
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
  }, [imtpData, speedData, vo2maxData, test505Data]);

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

      const playerTest505 = test505Data.filter(t => {
        if (t.player_id !== player.player_id) return false;
        const d = t.fecha;
        return d && d >= startDate && d <= endDate;
      }).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

      // Grab latest in selected date range
      const latestImtp = playerImtps[0];
      const latestSpeed = playerSpeeds[0];
      const latestVo2 = playerVo2max[0];
      const latestTest505 = playerTest505[0];

      return {
        player_id: player.player_id,
        player_name: `${player.nombre || ''} ${player.apellido1 || ''} ${player.apellido2 || ''}`.trim(),
        player_raw: player,
        club_name: clubName,
        posicion: player.posicion || 'N/A',
        anio: player.anio || 'N/A',
        
        // IMTP Metrics
        imtp_fuerza_n: latestImtp?.imtp_fuerza_n || 0,
        imtp_f_relativa_n_kg: latestImtp?.imtp_f_relativa_n_kg || 0,
        imtp_asimetria: latestImtp?.imtp_asimetria || 0,
        fuerza_cmj: latestImtp?.fuerza_cmj || 0,

        // CMJ Metrics
        cmj_rsi_mod: latestImtp?.cmj_rsi_mod || 0,
        cmj_altura_salto_im: latestImtp?.cmj_altura_salto_im || 0,
        cmj_peak_pot_relativa: latestImtp?.cmj_peak_pot_relativa || 0,

        // Speed Metrics
        tiempo_10m: latestSpeed?.tiempo_10m || 0,
        vel_10m: latestSpeed?.vel_10m || 0,
        tiempo_10_20m: latestSpeed?.tiempo_10_20m || 0,
        tiempo_20_30m: latestSpeed?.tiempo_20_30m || 0,
        tiempo_total: latestSpeed?.tiempo_total || 0,

        // VO2 Max Metrics
        vo2_max: latestVo2?.vo2_max || 0,
        vam: latestVo2?.vam || 0,
        fc_max: latestVo2?.fc_max || 0,
        mts: latestVo2?.mts || 0,
        vt2_fc: latestVo2?.vt2_fc || 0,

        // Test 505 Metrics
        t_acel_2m: latestTest505?.t_acel_2m || 0,
        t_desacel_2m: latestTest505?.t_desacel_2m || 0,
        t_cod_2m: latestTest505?.t_cod_2m || 0,
        t_reacel_1_2m: latestTest505?.t_reacel_1_2m || 0,
        z_score_acel: latestTest505?.z_score_acel || 0,

        // Dates
        imtp_date: latestImtp?.fecha_test || 'N/A',
        speed_date: latestSpeed?.fecha || 'N/A',
        vo2_date: latestVo2?.fecha || 'N/A',
        test505_date: latestTest505?.fecha || 'N/A'
      };
    });
  }, [players, imtpData, speedData, vo2maxData, test505Data, startDate, endDate, clubs]);

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
      const hasEvaluations = 
        profile.imtp_fuerza_n > 0 || profile.imtp_f_relativa_n_kg > 0 || profile.imtp_asimetria > 0 || profile.fuerza_cmj > 0 ||
        profile.cmj_rsi_mod > 0 || profile.cmj_altura_salto_im > 0 || profile.cmj_peak_pot_relativa > 0 ||
        profile.tiempo_total > 0 || profile.tiempo_10m > 0 || profile.vel_10m > 0 || profile.tiempo_10_20m > 0 || profile.tiempo_20_30m > 0 ||
        profile.vo2_max > 0 || profile.vam > 0 || profile.fc_max > 0 || profile.mts > 0 || profile.vt2_fc > 0 ||
        profile.t_cod_2m > 0 || profile.t_acel_2m > 0 || profile.t_desacel_2m > 0 || profile.t_reacel_1_2m > 0 || profile.z_score_acel > 0;

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
        const hasEvaluations = 
          profile.imtp_fuerza_n > 0 || profile.imtp_f_relativa_n_kg > 0 || profile.imtp_asimetria > 0 || profile.fuerza_cmj > 0 ||
          profile.cmj_rsi_mod > 0 || profile.cmj_altura_salto_im > 0 || profile.cmj_peak_pot_relativa > 0 ||
          profile.tiempo_total > 0 || profile.tiempo_10m > 0 || profile.vel_10m > 0 || profile.tiempo_10_20m > 0 || profile.tiempo_20_30m > 0 ||
          profile.vo2_max > 0 || profile.vam > 0 || profile.fc_max > 0 || profile.mts > 0 || profile.vt2_fc > 0 ||
          profile.t_cod_2m > 0 || profile.t_acel_2m > 0 || profile.t_desacel_2m > 0 || profile.t_reacel_1_2m > 0 || profile.z_score_acel > 0;
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

      let metricKey = sortConfig.key;
      if (sortConfig.key === 'imtp') metricKey = imtpMetric;
      else if (sortConfig.key === 'cmj') metricKey = cmjMetric;
      else if (sortConfig.key === 'speed') metricKey = speedMetric;
      else if (sortConfig.key === 'vo2') metricKey = vo2Metric;
      else if (sortConfig.key === 'test505') metricKey = test505Metric;

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
        default: {
          const config = ALL_METRIC_CONFIGS[metricKey];
          if (config?.lowerIsBetter) {
            aVal = a[metricKey] || 999;
            if (aVal === 0) aVal = 999;
            bVal = b[metricKey] || 999;
            if (bVal === 0) bVal = 999;
          } else {
            aVal = a[metricKey] || 0;
            bVal = b[metricKey] || 0;
          }
          break;
        }
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return data;
  }, [filteredProfiles, sortConfig, imtpMetric, cmjMetric, speedMetric, vo2Metric, test505Metric]);

  const getAverageForMetric = (metricKey: string) => {
    const validProfiles = filteredProfiles.filter(p => p[metricKey] > 0);
    if (validProfiles.length === 0) return '0';
    const sum = validProfiles.reduce((acc, curr) => acc + curr[metricKey], 0);
    const avg = sum / validProfiles.length;
    
    if (metricKey.includes('asimetria') || metricKey.includes('rsi') || metricKey.includes('tiempo') || metricKey.startsWith('t_')) {
      return avg.toFixed(2);
    }
    if (metricKey.includes('fuerza') || metricKey.includes('distancia') || metricKey.includes('mts')) {
      return avg.toFixed(0);
    }
    return avg.toFixed(1);
  };

  // Aggregate stats averages
  const statsAverages = useMemo(() => {
    const validImtp = filteredProfiles.filter(p => p[imtpMetric] > 0);
    const validCmj = filteredProfiles.filter(p => p[cmjMetric] > 0);
    const validSpeed = filteredProfiles.filter(p => p[speedMetric] > 0);
    const validVo2 = filteredProfiles.filter(p => p[vo2Metric] > 0);
    const validTest505 = filteredProfiles.filter(p => p[test505Metric] > 0);

    return {
      totalEvaluated: filteredProfiles.length,
      avgImtp: getAverageForMetric(imtpMetric),
      avgCmj: getAverageForMetric(cmjMetric),
      avgSpeed: getAverageForMetric(speedMetric),
      avgVo2: getAverageForMetric(vo2Metric),
      avgTest505: getAverageForMetric(test505Metric)
    };
  }, [filteredProfiles, imtpMetric, cmjMetric, speedMetric, vo2Metric, test505Metric]);

  // Pie chart data distributions
  const chartData = useMemo(() => {
    if (filteredProfiles.length === 0) return null;

    const imtpDist = { Excelente: 0, Normal: 0, Bajo: 0 };
    const cmjDist = { Excelente: 0, Normal: 0, Bajo: 0 };
    const speedDist = { Excelente: 0, Normal: 0, Bajo: 0 };

    filteredProfiles.forEach(p => {
      const imtpStatus = getPhysicalStatusDynamic(p[imtpMetric], ALL_METRIC_CONFIGS[imtpMetric]);
      const cmjStatus = getPhysicalStatusDynamic(p[cmjMetric], ALL_METRIC_CONFIGS[cmjMetric]);
      const speedStatus = getPhysicalStatusDynamic(p[speedMetric], ALL_METRIC_CONFIGS[speedMetric]);

      if (imtpStatus.label !== 'Sin Datos' && imtpStatus.label in imtpDist) {
        imtpDist[imtpStatus.label as keyof typeof imtpDist]++;
      }
      if (cmjStatus.label !== 'Sin Datos' && cmjStatus.label in cmjDist) {
        cmjDist[cmjStatus.label as keyof typeof cmjDist]++;
      }
      if (speedStatus.label !== 'Sin Datos' && speedStatus.label in speedDist) {
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
      cmj: formatForPie(cmjDist),
      speed: formatForPie(speedDist)
    };
  }, [filteredProfiles, imtpMetric, cmjMetric, speedMetric]);

  // Generate AI Physical Performance Summary
  const generateAiSummary = async () => {
    if (filteredProfiles.length === 0) return;
    setIsGenerating(true);
    try {
      // Dynamic fallback is extremely precise and updates instantly when metric columns are toggled
      const imtpConfig = ALL_METRIC_CONFIGS[imtpMetric];
      const cmjConfig = ALL_METRIC_CONFIGS[cmjMetric];
      const speedConfig = ALL_METRIC_CONFIGS[speedMetric];
      const vo2Config = ALL_METRIC_CONFIGS[vo2Metric];
      const test505Config = ALL_METRIC_CONFIGS[test505Metric];

      const imtpEval = getPhysicalStatusDynamic(Number(statsAverages.avgImtp), imtpConfig).label;
      const cmjEval = getPhysicalStatusDynamic(Number(statsAverages.avgCmj), cmjConfig).label;
      const speedEval = getPhysicalStatusDynamic(Number(statsAverages.avgSpeed), speedConfig).label;
      const vo2Eval = getPhysicalStatusDynamic(Number(statsAverages.avgVo2), vo2Config).label;
      const test505Eval = getPhysicalStatusDynamic(Number(statsAverages.avgTest505), test505Config).label;

      setAiSummary(`### Diagnóstico de Rendimiento Físico del Plantel (Evaluaciones Personalizadas)
Se analizó el perfil neuromuscular, de sprint, agilidad y metabólico de un plantel de **${filteredProfiles.length} deportistas** basándose en los parámetros de evaluación seleccionados. 

- **${imtpConfig.label}:** El promedio es de **${statsAverages.avgImtp} ${imtpConfig.unit}** (Clasificación promedio: *${imtpEval}*).
- **${cmjConfig.label}:** El promedio es de **${statsAverages.avgCmj} ${cmjConfig.unit}** (Clasificación promedio: *${cmjEval}*).
- **${speedConfig.label}:** El promedio es de **${statsAverages.avgSpeed} ${speedConfig.unit}** (Clasificación promedio: *${speedEval}*).
- **${vo2Config.label}:** El promedio es de **${statsAverages.avgVo2} ${vo2Config.unit}** (Clasificación promedio: *${vo2Eval}*).
- **${test505Config.label}:** El promedio es de **${statsAverages.avgTest505} ${test505Config.unit}** (Clasificación promedio: *${test505Eval}*).

**Recomendación Metodológica y Planificación:**
Integrar sesiones enfocadas de fuerza y potencia neuromuscular para optimizar las asimetrías y perfiles de fuerza vertical. Con respecto a la agilidad, agendar bloques específicos de técnica de desaceleración y re-aceleración (cambios de dirección) según el Test 505. Continuar con los bloques aeróbicos según los perfiles metabólicos individuales de velocidad aeróbica máxima (VMA) para consolidar la resistencia.`);
    } catch (error) {
      console.error("AI Summary generation failed", error);
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
      const imtpConfig = ALL_METRIC_CONFIGS[imtpMetric];
      const cmjConfig = ALL_METRIC_CONFIGS[cmjMetric];
      const speedConfig = ALL_METRIC_CONFIGS[speedMetric];
      const vo2Config = ALL_METRIC_CONFIGS[vo2Metric];
      const test505Config = ALL_METRIC_CONFIGS[test505Metric];

      const cardWidth = 39;
      const cardHeight = 16;
      const cardY = 38;
      const spacing = 5;

      const cardData = [
        { title: 'JUGADORES EVALUADOS', val: `${filteredProfiles.length} JUG` },
        { title: `PROM. ${imtpConfig.label.toUpperCase()}`, val: `${statsAverages.avgImtp} ${imtpConfig.unit}` },
        { title: `PROM. ${cmjConfig.label.toUpperCase()}`, val: `${statsAverages.avgCmj} ${cmjConfig.unit}` },
        { title: `PROM. ${speedConfig.label.toUpperCase()}`, val: `${statsAverages.avgSpeed} ${speedConfig.unit}` },
        { title: `PROM. ${vo2Config.label.toUpperCase()}`, val: `${statsAverages.avgVo2} ${vo2Config.unit}` },
        { title: `PROM. ${test505Config.label.toUpperCase()}`, val: `${statsAverages.avgTest505} ${test505Config.unit}` },
      ];

      cardData.forEach((card, idx) => {
        const xPos = margin + idx * (cardWidth + spacing);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(xPos, cardY, cardWidth, cardHeight, 1.5, 1.5, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.5);
        doc.setTextColor(100, 116, 139);
        doc.text(card.title, xPos + 2.5, cardY + 5);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(11, 18, 32);
        doc.text(card.val, xPos + 2.5, cardY + 11);
      });

      // Data Table setup
      const tableHeaders = [
        'Jugador', 
        'Club', 
        'Posición', 
        'Categoría', 
        `${imtpConfig.label} (${imtpConfig.unit})`, 
        `${cmjConfig.label} (${cmjConfig.unit})`, 
        `${speedConfig.label} (${speedConfig.unit})`, 
        `${vo2Config.label} (${vo2Config.unit})`, 
        `${test505Config.label} (${test505Config.unit})`
      ];

      const tableRows = sortedFilteredData.map(row => [
        row.player_name,
        row.club_name,
        row.posicion,
        row.anio,
        row[imtpMetric] > 0 ? `${row[imtpMetric]} ${imtpConfig.unit}` : '-',
        row[cmjMetric] > 0 ? `${row[cmjMetric]} ${cmjConfig.unit}` : '-',
        row[speedMetric] > 0 ? `${row[speedMetric]} ${speedConfig.unit}` : '-',
        row[vo2Metric] > 0 ? `${row[vo2Metric]} ${vo2Config.unit}` : '-',
        row[test505Metric] > 0 ? `${row[test505Metric]} ${test505Config.unit}` : '-'
      ]);

      autoTable(doc, {
        head: [tableHeaders],
        body: tableRows,
        startY: 60,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2.5, halign: 'center' },
        headStyles: { fillColor: [11, 18, 32], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
          0: { halign: 'left', fontStyle: 'bold', cellWidth: 40 },
          1: { halign: 'left', cellWidth: 30 },
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
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest truncate" title={ALL_METRIC_CONFIGS[imtpMetric].label}>
            Prom. {ALL_METRIC_CONFIGS[imtpMetric].label}
          </span>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 leading-none">
              {statsAverages.avgImtp} <span className="text-xs font-bold text-slate-500">{ALL_METRIC_CONFIGS[imtpMetric].unit}</span>
            </div>
            <span className="text-[9px] text-slate-400 font-bold uppercase mt-1 inline-block">Fuerza (IMTP)</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest truncate" title={ALL_METRIC_CONFIGS[cmjMetric].label}>
            Prom. {ALL_METRIC_CONFIGS[cmjMetric].label}
          </span>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 leading-none">
              {statsAverages.avgCmj} <span className="text-xs font-bold text-slate-500">{ALL_METRIC_CONFIGS[cmjMetric].unit}</span>
            </div>
            <span className="text-[9px] text-slate-400 font-bold uppercase mt-1 inline-block">Potencia (CMJ)</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest truncate" title={ALL_METRIC_CONFIGS[speedMetric].label}>
            Prom. {ALL_METRIC_CONFIGS[speedMetric].label}
          </span>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 leading-none">
              {statsAverages.avgSpeed} <span className="text-xs font-bold text-slate-500">{ALL_METRIC_CONFIGS[speedMetric].unit}</span>
            </div>
            <span className="text-[9px] text-slate-400 font-bold uppercase mt-1 inline-block">Velocidad & Sprint</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest truncate" title={ALL_METRIC_CONFIGS[vo2Metric].label}>
            Prom. {ALL_METRIC_CONFIGS[vo2Metric].label}
          </span>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 leading-none">
              {statsAverages.avgVo2} <span className="text-xs font-bold text-slate-500">{ALL_METRIC_CONFIGS[vo2Metric].unit}</span>
            </div>
            <span className="text-[9px] text-slate-400 font-bold uppercase mt-1 inline-block">Capacidad Aeróbica</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest truncate" title={ALL_METRIC_CONFIGS[test505Metric].label}>
            Prom. {ALL_METRIC_CONFIGS[test505Metric].label}
          </span>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 leading-none">
              {statsAverages.avgTest505} <span className="text-xs font-bold text-slate-500">{ALL_METRIC_CONFIGS[test505Metric].unit}</span>
            </div>
            <span className="text-[9px] text-slate-400 font-bold uppercase mt-1 inline-block">Test 505 Agilidad</span>
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
                
                {/* 1. IMTP Evaluation Column (Customizable) */}
                <th className="px-6 py-3 text-left border-l border-slate-100 bg-red-50/5 min-w-[200px]">
                  <div className="flex flex-col gap-1">
                    <div 
                      onClick={() => requestSort('imtp')}
                      className="flex items-center justify-between text-[9px] text-red-600 font-extrabold uppercase tracking-widest cursor-pointer select-none hover:text-red-700 transition-all group"
                    >
                      <span>Fuerza Máxima (IMTP)</span>
                      <span>{getSortIcon('imtp')}</span>
                    </div>
                    <select
                      value={imtpMetric}
                      onChange={(e) => setImtpMetric(e.target.value)}
                      className="bg-transparent border-none p-0 pr-6 text-xs font-black text-slate-800 focus:ring-0 focus:outline-none cursor-pointer uppercase font-sans truncate"
                    >
                      {METRICS_IMTP.map(m => (
                        <option key={m} value={m} className="normal-case text-slate-700 bg-white font-semibold">
                          {ALL_METRIC_CONFIGS[m].label}
                        </option>
                      ))}
                    </select>
                  </div>
                </th>

                {/* 2. CMJ Evaluation Column (Customizable) */}
                <th className="px-6 py-3 text-left border-l border-slate-100 bg-slate-50/30 min-w-[200px]">
                  <div className="flex flex-col gap-1">
                    <div 
                      onClick={() => requestSort('cmj')}
                      className="flex items-center justify-between text-[9px] text-red-600 font-extrabold uppercase tracking-widest cursor-pointer select-none hover:text-red-700 transition-all group"
                    >
                      <span>Saltabilidad (CMJ)</span>
                      <span>{getSortIcon('cmj')}</span>
                    </div>
                    <select
                      value={cmjMetric}
                      onChange={(e) => setCmjMetric(e.target.value)}
                      className="bg-transparent border-none p-0 pr-6 text-xs font-black text-slate-800 focus:ring-0 focus:outline-none cursor-pointer uppercase font-sans truncate"
                    >
                      {METRICS_CMJ.map(m => (
                        <option key={m} value={m} className="normal-case text-slate-700 bg-white font-semibold">
                          {ALL_METRIC_CONFIGS[m].label}
                        </option>
                      ))}
                    </select>
                  </div>
                </th>

                {/* 3. Speed Evaluation Column (Customizable) */}
                <th className="px-6 py-3 text-left border-l border-slate-100 bg-slate-50/30 min-w-[200px]">
                  <div className="flex flex-col gap-1">
                    <div 
                      onClick={() => requestSort('speed')}
                      className="flex items-center justify-between text-[9px] text-red-600 font-extrabold uppercase tracking-widest cursor-pointer select-none hover:text-red-700 transition-all group"
                    >
                      <span>Velocidad & Sprint</span>
                      <span>{getSortIcon('speed')}</span>
                    </div>
                    <select
                      value={speedMetric}
                      onChange={(e) => setSpeedMetric(e.target.value)}
                      className="bg-transparent border-none p-0 pr-6 text-xs font-black text-slate-800 focus:ring-0 focus:outline-none cursor-pointer uppercase font-sans truncate"
                    >
                      {METRICS_SPEED.map(m => (
                        <option key={m} value={m} className="normal-case text-slate-700 bg-white font-semibold">
                          {ALL_METRIC_CONFIGS[m].label}
                        </option>
                      ))}
                    </select>
                  </div>
                </th>

                {/* 4. VO2 Max Evaluation Column (Customizable) */}
                <th className="px-6 py-3 text-left border-l border-slate-100 bg-slate-50/30 min-w-[200px]">
                  <div className="flex flex-col gap-1">
                    <div 
                      onClick={() => requestSort('vo2')}
                      className="flex items-center justify-between text-[9px] text-red-600 font-extrabold uppercase tracking-widest cursor-pointer select-none hover:text-red-700 transition-all group"
                    >
                      <span>Capacidad Aeróbica</span>
                      <span>{getSortIcon('vo2')}</span>
                    </div>
                    <select
                      value={vo2Metric}
                      onChange={(e) => setVo2Metric(e.target.value)}
                      className="bg-transparent border-none p-0 pr-6 text-xs font-black text-slate-800 focus:ring-0 focus:outline-none cursor-pointer uppercase font-sans truncate"
                    >
                      {METRICS_VO2.map(m => (
                        <option key={m} value={m} className="normal-case text-slate-700 bg-white font-semibold">
                          {ALL_METRIC_CONFIGS[m].label}
                        </option>
                      ))}
                    </select>
                  </div>
                </th>

                {/* 5. Test 505 Evaluation Column (Customizable) */}
                <th className="px-6 py-3 text-left border-l border-slate-100 bg-slate-50/30 min-w-[200px]">
                  <div className="flex flex-col gap-1">
                    <div 
                      onClick={() => requestSort('test505')}
                      className="flex items-center justify-between text-[9px] text-red-600 font-extrabold uppercase tracking-widest cursor-pointer select-none hover:text-red-700 transition-all group"
                    >
                      <span>Agilidad (Test 505)</span>
                      <span>{getSortIcon('test505')}</span>
                    </div>
                    <select
                      value={test505Metric}
                      onChange={(e) => setTest505Metric(e.target.value)}
                      className="bg-transparent border-none p-0 pr-6 text-xs font-black text-slate-800 focus:ring-0 focus:outline-none cursor-pointer uppercase font-sans truncate"
                    >
                      {METRICS_TEST505.map(m => (
                        <option key={m} value={m} className="normal-case text-slate-700 bg-white font-semibold">
                          {ALL_METRIC_CONFIGS[m].label}
                        </option>
                      ))}
                    </select>
                  </div>
                </th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-10">
                    <div className="flex items-center justify-center gap-2 text-slate-400">
                      <i className="fa-solid fa-spinner animate-spin text-lg text-red-500"></i>
                      <span>Cargando evaluaciones físicas...</span>
                    </div>
                  </td>
                </tr>
              ) : sortedFilteredData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400 text-xs">
                    Ninguna evaluación física coincide con los filtros de búsqueda establecidos.
                  </td>
                </tr>
              ) : (
                sortedFilteredData.map((profile) => {
                  const imtpConfig = ALL_METRIC_CONFIGS[imtpMetric];
                  const cmjConfig = ALL_METRIC_CONFIGS[cmjMetric];
                  const speedConfig = ALL_METRIC_CONFIGS[speedMetric];
                  const vo2Config = ALL_METRIC_CONFIGS[vo2Metric];
                  const test505Config = ALL_METRIC_CONFIGS[test505Metric];

                  const imtpStat = getPhysicalStatusDynamic(profile[imtpMetric], imtpConfig);
                  const cmjStat = getPhysicalStatusDynamic(profile[cmjMetric], cmjConfig);
                  const speedStat = getPhysicalStatusDynamic(profile[speedMetric], speedConfig);
                  const vo2Stat = getPhysicalStatusDynamic(profile[vo2Metric], vo2Config);
                  const test505Stat = getPhysicalStatusDynamic(profile[test505Metric], test505Config);

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
                      
                      {/* 1. IMTP Customizable Column */}
                      <td className="px-6 py-4 border-l border-slate-100 bg-red-50/5">
                        <div className="flex items-center gap-1.5">
                          {profile[imtpMetric] > 0 ? (
                            <>
                              <span className="text-xs font-black text-slate-900">
                                {imtpConfig.key.includes('asimetria') || imtpConfig.key.includes('rsi') || imtpConfig.key.includes('asimetria')
                                  ? profile[imtpMetric].toFixed(2)
                                  : profile[imtpMetric]} {imtpConfig.unit}
                              </span>
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md border ${imtpStat.color}`}>
                                {imtpStat.label}
                              </span>
                            </>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </div>
                        {profile[imtpMetric] > 0 && (
                          <div className="text-[8px] text-slate-400 font-bold mt-0.5">
                            Eval: {profile.imtp_date}
                          </div>
                        )}
                      </td>

                      {/* 2. CMJ Customizable Column */}
                      <td className="px-6 py-4 border-l border-slate-100">
                        <div className="flex items-center gap-1.5">
                          {profile[cmjMetric] > 0 ? (
                            <>
                              <span className="text-xs font-black text-slate-900">
                                {cmjConfig.key.includes('asimetria') || cmjConfig.key.includes('rsi') || cmjConfig.key.includes('asimetria')
                                  ? profile[cmjMetric].toFixed(2)
                                  : profile[cmjMetric]} {cmjConfig.unit}
                              </span>
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md border ${cmjStat.color}`}>
                                {cmjStat.label}
                              </span>
                            </>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </div>
                        {profile[cmjMetric] > 0 && (
                          <div className="text-[8px] text-slate-400 font-bold mt-0.5">
                            Eval: {profile.imtp_date}
                          </div>
                        )}
                      </td>

                      {/* 3. Speed Customizable Column */}
                      <td className="px-6 py-4 border-l border-slate-100">
                        <div className="flex items-center gap-1.5">
                          {profile[speedMetric] > 0 ? (
                            <>
                              <span className="text-xs font-black text-slate-900">
                                {profile[speedMetric].toFixed(2)} {speedConfig.unit}
                              </span>
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md border ${speedStat.color}`}>
                                {speedStat.label}
                              </span>
                            </>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </div>
                        {profile[speedMetric] > 0 && (
                          <div className="text-[8px] text-slate-400 font-bold mt-0.5">
                            Eval: {profile.speed_date}
                          </div>
                        )}
                      </td>

                      {/* 4. VO2 Max Customizable Column */}
                      <td className="px-6 py-4 border-l border-slate-100">
                        <div className="flex items-center gap-1.5">
                          {profile[vo2Metric] > 0 ? (
                            <>
                              <span className="text-xs font-black text-slate-900">
                                {profile[vo2Metric]} {vo2Config.unit}
                              </span>
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md border ${vo2Stat.color}`}>
                                {vo2Stat.label}
                              </span>
                            </>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </div>
                        {profile[vo2Metric] > 0 && (
                          <div className="text-[8px] text-slate-400 font-bold mt-0.5">
                            Eval: {profile.vo2_date}
                          </div>
                        )}
                      </td>

                      {/* 5. Test 505 Customizable Column */}
                      <td className="px-6 py-4 border-l border-slate-100">
                        <div className="flex items-center gap-1.5">
                          {profile[test505Metric] > 0 ? (
                            <>
                              <span className="text-xs font-black text-slate-900">
                                {profile[test505Metric].toFixed(2)} {test505Config.unit}
                              </span>
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md border ${test505Stat.color}`}>
                                {test505Stat.label}
                              </span>
                            </>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </div>
                        {profile[test505Metric] > 0 && (
                          <div className="text-[8px] text-slate-400 font-bold mt-0.5">
                            Eval: {profile.test505_date}
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
