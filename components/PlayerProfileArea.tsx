
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { normalizeClub, getDriveDirectLink } from '../lib/utils';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, Legend, RadarChart, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, Radar, Cell 
} from 'recharts';
import ClubBadge from './ClubBadge';
import { UserRole, REVERSE_CATEGORY_ID_MAP, CATEGORY_COLORS, MatchDB, CATEGORY_ID_MAP } from '../types';
import { FALLBACK_CLUB_NAMES } from '../constants';

interface PlayerProfileAreaProps {
  userRole?: string;
  userClub?: string;
  userClubId?: number | null;
  clubs?: any[];
  initialPlayerId?: number | null;
  players?: any[];
}

const PlayerProfileArea: React.FC<PlayerProfileAreaProps> = ({ userRole, userClub, userClubId, clubs = [], initialPlayerId, players: initialPlayers }) => {
  const safeMax = (arr: number[]) => {
    const valid = arr.filter(v => typeof v === 'number' && !isNaN(v) && isFinite(v));
    return valid.length > 0 ? Math.max(...valid) : 0;
  };

  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(() => {
    if (userRole === 'player') {
      return initialPlayerId || null;
    }
    const saved = sessionStorage.getItem('selectedPlayerIdForProfile');
    return saved ? Number(saved) : (initialPlayerId || null);
  });

  useEffect(() => {
    if (userRole === 'player' && initialPlayerId) {
      setSelectedPlayerId(initialPlayerId);
    }
  }, [initialPlayerId, userRole]);
  const [players, setPlayers] = useState<any[]>(initialPlayers || []);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('evolucion'); 
  const [gpsChartMetric, setGpsChartMetric] = useState<'dist_total_m' | 'dist_mai_m_20_kmh' | 'm_por_min' | 'acc_decc_ai_n' | 'sprints_n' | 'dist_sprint_m_25_kmh'>('dist_total_m');

  useEffect(() => {
    const handleSelect = (e: any) => {
      if (e.detail?.playerId) {
        setSelectedPlayerId(Number(e.detail.playerId));
        setActiveTab('evolucion');
      }
    };
    window.addEventListener('navigate-to-profile', handleSelect);
    return () => {
      window.removeEventListener('navigate-to-profile', handleSelect);
    };
  }, []);
  
  // Filter States
  const [filterYear, setFilterYear] = useState<string>('');
  const [filterPosition, setFilterPosition] = useState<string>('');
  const [filterClubId, setFilterClubId] = useState<string>('');
  
  // Data States
  const [citations, setCitations] = useState<any[]>([]);
  const [trainingData, setTrainingData] = useState<any[]>([]);
  const [matchData, setMatchData] = useState<any[]>([]);
  const [gpsStats, setGpsStats] = useState<any[]>([]);
  const [wellnessData, setWellnessData] = useState<any[]>([]);
  const [categoryMatches, setCategoryMatches] = useState<MatchDB[]>([]);
  const [matchReports, setMatchReports] = useState<any[]>([]);
  
  // Slider & Dual Chart States
  const [sliderStart, setSliderStart] = useState<string>('');
  const [sliderEnd, setSliderEnd] = useState<string>('');
  const [leftMetric, setLeftMetric] = useState<string>('checkIn');
  const [rightMetric, setRightMetric] = useState<string>('checkOutRPE');
  const [draggingThumb, setDraggingThumb] = useState<'start' | 'end' | null>(null);
  
  const trackRef = React.useRef<HTMLDivElement>(null);

  // GPS Slider States
  const [gpsSliderStart, setGpsSliderStart] = useState<string>('');
  const [gpsSliderEnd, setGpsSliderEnd] = useState<string>('');
  const [gpsDraggingThumb, setGpsDraggingThumb] = useState<'start' | 'end' | null>(null);
  const gpsTrackRef = React.useRef<HTMLDivElement>(null);
  const [physicalData, setPhysicalData] = useState<{
    anthro: any[],
    vo2: any[],
    imtp: any[],
    speed: any[]
  }>({ anthro: [], vo2: [], imtp: [], speed: [] });

  const [medicalHistory, setMedicalHistory] = useState<{
    reports: any[];
    treatments: any[];
    injuries: any[];
  }>({ reports: [], treatments: [], injuries: [] });

  useEffect(() => {
    console.log("PlayerProfileArea: initialPlayers received:", initialPlayers?.length);
    if (!initialPlayers) {
      fetchPlayers();
    } else {
      setPlayers(initialPlayers);
    }
  }, [initialPlayers]);

  useEffect(() => {
    console.log("PlayerProfileArea: Current players in state:", players.length);
    if (players.length > 0) {
      console.log("PlayerProfileArea: Sample player:", JSON.stringify(players[0]));
    }
  }, [players]);

  useEffect(() => {
    if (selectedPlayerId) {
      fetchFullProfile(selectedPlayerId);
    }
  }, [selectedPlayerId]);

  const fetchPlayers = async () => {
    try {
      console.log("Fetching players in PlayerProfileArea (fallback)...");
      let query = supabase.from('players').select('player_id, nombre, apellido1, apellido2, id_club, posicion, anio, clubes!fk_players_clubes(nombre)');
      if (userRole === 'club') {
        if (userClubId) {
          query = query.eq('id_club', userClubId);
        } else if (userClub) {
          query = query.eq('clubes.nombre', userClub);
        }
      }
      const { data } = await query.order('apellido1', { ascending: true });
      if (data) setPlayers(data);
    } catch (err) {
      console.error("Error fetching players:", err);
    }
  };

  const fetchFullProfile = async (playerId: number) => {
    setLoading(true);
    try {
      // 1. Basic Player Info
      const { data: pData } = await supabase.from('players').select('player_id, nombre, apellido1, apellido2, anio, id_club, posicion, fecha_nacimiento').eq('player_id', playerId).single();
      setProfileData(pData);

      // 2. Citations & Microcycles
      const { data: citData, error: citError } = await supabase
        .from('citaciones')
        .select(`
          id,
          player_id,
          microcycle_id,
          fecha_citacion,
          observacion,
          microcycles!citaciones_microcycle_fk (
            id, category_id, micro_number, type, start_date, end_date, city
          )
        `)
        .eq('player_id', playerId)
        .order('fecha_citacion', { ascending: false });

      console.log('CIT ERROR:', JSON.stringify(citError));
      console.log('CIT DATA COUNT:', citData?.length);
      console.log('CIT DATA[0]:', JSON.stringify(citData?.[0], null, 2));

      setCitations(citData || []);

      // 3. Training & Matches (Internal Load)
      const { data: loadData } = await supabase
        .from('internal_load')
        .select('*')
        .eq('player_id', playerId)
        .order('session_date', { ascending: false });
      
      if (loadData) {
        setTrainingData(loadData.filter(l => l.type !== 'MATCH'));
        setMatchData(loadData.filter(l => l.type === 'MATCH'));
      }

      // 4. GPS Stats
      const { data: gps } = await supabase
        .from('gps_import')
        .select('*')
        .eq('player_id', playerId)
        .order('fecha', { ascending: false });
      setGpsStats(gps || []);

      // 5. Physical Evaluations
      const [anthro, vo2, imtpRes, cmjRes, speed] = await Promise.all([
        supabase.from('antropometria').select('*').eq('player_id', playerId).order('fecha_medicion', { ascending: true }),
        supabase.from('vo2max_tests').select('*').eq('player_id', playerId).order('fecha', { ascending: true }),
        supabase.from('evaluaciones_imtp').select('*').eq('player_id', playerId).order('fecha_test', { ascending: true }),
        supabase.from('evaluaciones_cmj').select('*').eq('player_id', playerId).order('fecha_test', { ascending: true }),
        supabase.from('velocidad_tests').select('*').eq('player_id', playerId).order('fecha', { ascending: true })
      ]);

      // Combine IMTP and CMJ data by date
      const mergedMap = new Map<string, any>();
      (imtpRes.data || []).forEach((item: any) => {
        mergedMap.set(item.fecha_test, { ...item });
      });
      (cmjRes.data || []).forEach((item: any) => {
        const existing = mergedMap.get(item.fecha_test);
        if (existing) {
          mergedMap.set(item.fecha_test, { ...existing, ...item });
        } else {
          mergedMap.set(item.fecha_test, { ...item });
        }
      });
      const combinedImtp = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(a.fecha_test).getTime() - new Date(b.fecha_test).getTime()
      );

      setPhysicalData({
        anthro: anthro.data || [],
        vo2: vo2.data || [],
        imtp: combinedImtp,
        speed: speed.data || []
      });

      // 6. Wellness Check-in data with fallback column name parsing
      let wellnessList: any[] = [];
      try {
        const { data: wellnessRaw } = await supabase
          .from('wellness_checkin')
          .select('*')
          .eq('player_id', playerId);
        
        if (wellnessRaw) {
          wellnessList = wellnessRaw.map(w => {
            const dateStr = w.checkin_date || w.checkin_dat || w.fecha || (w.created_at ? w.created_at.split('T')[0] : '');
            return {
              ...w,
              date: dateStr,
              fatiga: Number(w.fatigue) || Number(w.fatiga) || 0,
              sueno: Number(w.sleep_quality) || Number(w.sleep) || Number(w.sueno) || 0,
              dolor: Number(w.soreness) || Number(w.dolor) || 0,
              estres: Number(w.stress) || Number(w.estres) || 0,
              animo: Number(w.mood) || Number(w.animo) || 0
            };
          }).filter(w => w.date);
          
          wellnessList.sort((a, b) => a.date.localeCompare(b.date));
        }
      } catch (err) {
        console.error("Error loading wellness_checkin:", err);
      }
      setWellnessData(wellnessList);

      // 7. Matches from calendar for cross-referencing
      try {
        const { data: mData } = await supabase
          .from('matches')
          .select('*')
          .order('date', { ascending: false });
        setCategoryMatches(mData || []);
      } catch (err) {
        console.error("Error loading matches for cross-referencing:", err);
      }

      // 7b. Match reports specifically for this player
      try {
        const { data: mrData } = await supabase
          .from('match_reports')
          .select('*')
          .eq('player_id', playerId)
          .order('fecha', { ascending: false });
        setMatchReports(mrData || []);
      } catch (err) {
        console.error("Error loading match_reports for player:", err);
      }

      // 8. Medical History (reports, treatments, injuries)
      try {
        const [repRes, treatRes, injRes] = await Promise.all([
          supabase.from('medical_daily_reports').select('*').eq('player_id', playerId).order('report_date', { ascending: false }),
          supabase.from('medical_treatments').select('*').eq('player_id', playerId).order('treatment_date', { ascending: false }),
          supabase.from('lesionados').select('*').eq('player_id', playerId).order('fecha_inicio', { ascending: false })
        ]);

        setMedicalHistory({
          reports: repRes.data || [],
          treatments: treatRes.data || [],
          injuries: injRes.data || []
        });
      } catch (err) {
        console.error("Error loading medical history for athlete:", err);
      }

    } catch (err) {
      console.error("Error fetching full profile:", err);
    } finally {
      setLoading(false);
    }
  };

  // Combine wellness and load data by date
  const combinedChartData = useMemo(() => {
    const datesSet = new Set<string>();
    wellnessData.forEach(w => { if (w.date) datesSet.add(w.date); });
    trainingData.forEach(l => { if (l.session_date) datesSet.add(l.session_date); });
    matchData.forEach(l => { if (l.session_date) datesSet.add(l.session_date); });

    const sortedDates = Array.from(datesSet).sort((a, b) => a.localeCompare(b));

    return sortedDates.map(d => {
      const wellnessDay = wellnessData.find(w => w.date === d);
      const dayLoads = [...trainingData, ...matchData].filter(l => l.session_date === d);
      
      const fatigaVal = wellnessDay ? wellnessDay.fatiga : 0;
      const suenoVal = wellnessDay ? wellnessDay.sueno : 0;
      const dolorVal = wellnessDay ? wellnessDay.dolor : 0;
      const estresVal = wellnessDay ? wellnessDay.estres : 0;
      const animoVal = wellnessDay ? wellnessDay.animo : 0;
      
      const values = [fatigaVal, suenoVal, dolorVal, estresVal, animoVal].filter(v => v > 0);
      const checkInScore = values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;

      const rpeDay = dayLoads.length > 0 ? Math.max(...dayLoads.map(l => Number(l.rpe) || 0)) : 0;
      const srpeDay = dayLoads.length > 0 ? Math.max(...dayLoads.map(l => Number(l.srpe) || Number((l.rpe || 0) * (l.duration_min || 0)) || 0)) : 0;
      const durationDay = dayLoads.length > 0 ? dayLoads.reduce((sum, l) => sum + (Number(l.duration_min) || 0), 0) : 0;

      return {
        date: d,
        checkIn: checkInScore > 0 ? Number(checkInScore.toFixed(1)) : 0,
        fatiga: fatigaVal || 0,
        sueno: suenoVal || 0,
        dolor: dolorVal || 0,
        estres: estresVal || 0,
        animo: animoVal || 0,
        checkOutRPE: rpeDay || 0,
        checkOutSRPE: srpeDay || 0,
        checkOutDuration: durationDay || 0,
      };
    }).filter(item => item.checkIn > 0 || item.checkOutRPE > 0);
  }, [wellnessData, trainingData, matchData]);

  // All unique sorted dates with data for the slider values
  const availableDates = useMemo(() => {
    return combinedChartData.map(item => item.date);
  }, [combinedChartData]);

  // Sync range slider bounds when database data switches/refreshes
  useEffect(() => {
    if (availableDates.length > 0) {
      setSliderStart(availableDates[0]);
      setSliderEnd(availableDates[availableDates.length - 1]);
    } else {
      setSliderStart('');
      setSliderEnd('');
    }
  }, [availableDates]);

  // Handler for track clicking and dragging calculations
  const handleTrackInteraction = (clientX: number) => {
    if (!trackRef.current || availableDates.length < 2) return;
    const rect = trackRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const rawVal = (percent / 100) * (availableDates.length - 1);
    const index = Math.round(rawVal);
    
    if (draggingThumb === 'start') {
      const maxIdx = availableDates.indexOf(sliderEnd) - 1;
      const finalIdx = Math.min(index, maxIdx >= 0 ? maxIdx : 0);
      setSliderStart(availableDates[finalIdx]);
    } else if (draggingThumb === 'end') {
      const minIdx = availableDates.indexOf(sliderStart) + 1;
      const finalIdx = Math.max(index, minIdx < availableDates.length ? minIdx : availableDates.length - 1);
      setSliderEnd(availableDates[finalIdx]);
    }
  };

  // Wire dragging listeners
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (draggingThumb) handleTrackInteraction(e.clientX);
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (draggingThumb && e.touches.length > 0) handleTrackInteraction(e.touches[0].clientX);
    };
    const handleMouseUp = () => setDraggingThumb(null);

    if (draggingThumb) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [draggingThumb, sliderStart, sliderEnd, availableDates]);

  // Filter combinedChartData by selected range
  const filteredCombinedData = useMemo(() => {
    if (!sliderStart || !sliderEnd) return combinedChartData;
    return combinedChartData.filter(item => item.date >= sliderStart && item.date <= sliderEnd);
  }, [combinedChartData, sliderStart, sliderEnd]);

  // Values calculation for the slider track
  const startIdx = useMemo(() => availableDates.indexOf(sliderStart), [availableDates, sliderStart]);
  const endIdx = useMemo(() => availableDates.indexOf(sliderEnd), [availableDates, sliderEnd]);

  const startPercent = useMemo(() => {
    if (availableDates.length <= 1 || startIdx < 0) return 0;
    return (startIdx / (availableDates.length - 1)) * 100;
  }, [availableDates, startIdx]);

  const endPercent = useMemo(() => {
    if (availableDates.length <= 1 || endIdx < 0) return 100;
    return (endIdx / (availableDates.length - 1)) * 100;
  }, [availableDates, endIdx]);

  // GPS filter and calculation logic
  const gpsAvailableDates = useMemo(() => {
    const dates = gpsStats.map(g => g.fecha).filter(Boolean);
    return Array.from(new Set(dates)).sort((a, b) => a.localeCompare(b));
  }, [gpsStats]);

  useEffect(() => {
    if (gpsAvailableDates.length > 0) {
      setGpsSliderStart(gpsAvailableDates[0]);
      setGpsSliderEnd(gpsAvailableDates[gpsAvailableDates.length - 1]);
    } else {
      setGpsSliderStart('');
      setGpsSliderEnd('');
    }
  }, [gpsAvailableDates]);

  const handleGpsTrackInteraction = (clientX: number) => {
    if (!gpsTrackRef.current || gpsAvailableDates.length < 2) return;
    const rect = gpsTrackRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const rawVal = (percent / 100) * (gpsAvailableDates.length - 1);
    const index = Math.round(rawVal);
    
    if (gpsDraggingThumb === 'start') {
      const maxIdx = gpsAvailableDates.indexOf(gpsSliderEnd) - 1;
      const finalIdx = Math.min(index, maxIdx >= 0 ? maxIdx : 0);
      setGpsSliderStart(gpsAvailableDates[finalIdx]);
    } else if (gpsDraggingThumb === 'end') {
      const minIdx = gpsAvailableDates.indexOf(gpsSliderStart) + 1;
      const finalIdx = Math.max(index, minIdx < gpsAvailableDates.length ? minIdx : gpsAvailableDates.length - 1);
      setGpsSliderEnd(gpsAvailableDates[finalIdx]);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (gpsDraggingThumb) handleGpsTrackInteraction(e.clientX);
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (gpsDraggingThumb && e.touches.length > 0) handleGpsTrackInteraction(e.touches[0].clientX);
    };
    const handleMouseUp = () => setGpsDraggingThumb(null);

    if (gpsDraggingThumb) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [gpsDraggingThumb, gpsSliderStart, gpsSliderEnd, gpsAvailableDates]);

  const filteredGpsStats = useMemo(() => {
    if (!gpsSliderStart || !gpsSliderEnd) {
      return [...gpsStats].sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
    }
    return gpsStats
      .filter(item => item.fecha >= gpsSliderStart && item.fecha <= gpsSliderEnd)
      .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
  }, [gpsStats, gpsSliderStart, gpsSliderEnd]);

  const gpsStartIdx = useMemo(() => gpsAvailableDates.indexOf(gpsSliderStart), [gpsAvailableDates, gpsSliderStart]);
  const gpsEndIdx = useMemo(() => gpsAvailableDates.indexOf(gpsSliderEnd), [gpsAvailableDates, gpsSliderEnd]);

  const gpsStartPercent = useMemo(() => {
    if (gpsAvailableDates.length <= 1 || gpsStartIdx < 0) return 0;
    return (gpsStartIdx / (gpsAvailableDates.length - 1)) * 100;
  }, [gpsAvailableDates, gpsStartIdx]);

  const gpsEndPercent = useMemo(() => {
    if (gpsAvailableDates.length <= 1 || gpsEndIdx < 0) return 100;
    return (gpsEndIdx / (gpsAvailableDates.length - 1)) * 100;
  }, [gpsAvailableDates, gpsEndIdx]);

  const latestAnthro = useMemo(() => physicalData.anthro.length > 0 ? physicalData.anthro[physicalData.anthro.length - 1] : null, [physicalData.anthro]);
  const latestVo2 = useMemo(() => physicalData.vo2.length > 0 ? physicalData.vo2[physicalData.vo2.length - 1] : null, [physicalData.vo2]);
  const latestImtp = useMemo(() => physicalData.imtp.length > 0 ? physicalData.imtp[physicalData.imtp.length - 1] : null, [physicalData.imtp]);
  const latestSpeed = useMemo(() => physicalData.speed.length > 0 ? physicalData.speed[physicalData.speed.length - 1] : null, [physicalData.speed]);

  const inferredCategory = useMemo(() => {
    if (!profileData) return 'S/D';
    if (profileData.categoria) return profileData.categoria;
    // Walk back or look at the most recent citations to determine the actual category they were called up to
    if (citations && citations.length > 0) {
      const latestCit = citations[0];
      const categoryId = latestCit.microcycles?.category_id;
      if (categoryId !== undefined && categoryId !== null) {
        const catLabel = REVERSE_CATEGORY_ID_MAP[categoryId];
        if (catLabel) return catLabel;
      }
    }
    if (profileData.anio) {
      const year = Number(profileData.anio);
      if (year === 2011) return 'sub_15';
      if (year === 2009 || year === 2010) return 'sub_16';
      if (year === 2007 || year === 2008) return 'sub_17';
      if (year >= 2012) return 'sub_13';
    }
    return 'SUB 17'; // Default fallback
  }, [profileData, citations]);

  const filteredCitations = useMemo(() => {
    return citations;
  }, [citations]);

  const matchedParticipation = useMemo(() => {
    return categoryMatches
      .map(match => {
        const gpsRecord = gpsStats.find(g => g.fecha === match.date);
        const internalMatchRecord = matchData.find(m => m.session_date === match.date);
        
        // Match by microcycle citation or category citation covering the date
        const isCitedForThisMicrocycle = match.microcycle_id 
          ? filteredCitations.some(cit => cit.microcycles?.id === match.microcycle_id)
          : false;

        const isCitedForThisCategoryOnDate = filteredCitations.some(cit => {
          const mc = cit.microcycles;
          if (!mc) return false;
          if (Number(mc.category_id) !== Number(match.category_id)) return false;
          if (mc.start_date && mc.end_date) {
            return match.date >= mc.start_date && match.date <= mc.end_date;
          }
          return cit.fecha_citacion === match.date;
        });

        const hasActivity = !!gpsRecord || !!internalMatchRecord;

        const belongsToThisCategory = isCitedForThisMicrocycle || isCitedForThisCategoryOnDate;

        const participated = hasActivity && belongsToThisCategory;

        return {
          match,
          participated,
          gpsRecord,
          internalMatchRecord
        };
      })
      .filter(item => item.participated);
  }, [categoryMatches, gpsStats, matchData, filteredCitations]);

  const matchDatesSet = useMemo(() => {
    const dates = new Set<string>();
    
    // 1. Scheduled matches with active participation
    matchedParticipation.forEach(item => {
      if (item.match && item.match.date) {
        dates.add(item.match.date);
      }
    });

    // 2. Internal load sessions marked as MATCH
    matchData.forEach(item => {
      if (item.session_date) {
        dates.add(item.session_date);
      }
    });

    // 3. Match reports specifically registered for this player
    matchReports.forEach(item => {
      const d = item.fecha || item.date;
      if (d) {
        dates.add(d);
      }
    });

    return dates;
  }, [matchedParticipation, matchData, matchReports]);

  const stats = useMemo(() => {
    const totalCitations = citations.length;
    const totalTrainings = trainingData.length;
    const totalMatches = matchDatesSet.size;
    const totalMinGps = gpsStats.reduce((acc, curr) => acc + (Number(curr.minutos) || 0), 0);
    const totalDistGps = gpsStats.reduce((acc, curr) => acc + (Number(curr.dist_total_m) || 0), 0);
    const totalHsrGps = gpsStats.reduce((acc, curr) => acc + (Number(curr.dist_mai_m_20_kmh) || 0), 0);
    const totalSprints = gpsStats.reduce((acc, curr) => acc + (Number(curr.sprints_n) || 0), 0);
    const maxVel = Math.max(...gpsStats.map(g => Number(g.vel_max_kmh) || 0), 0);

    // Citations by Category
    const citByCategory: Record<string, number> = {};
    citations.forEach(cit => {
      const catId = cit.microcycles?.category_id;
      if (catId) {
        const catLabel = REVERSE_CATEGORY_ID_MAP[catId] || `CAT ${catId}`;
        citByCategory[catLabel] = (citByCategory[catLabel] || 0) + 1;
      }
    });

    return {
      citaciones: totalCitations,
      citByCategory,
      entrenamientos: gpsStats.length > 0 ? gpsStats.filter(g => !matchDatesSet.has(g.fecha)).length : totalTrainings,
      partidos: totalMatches,
      minutosGps: totalMinGps,
      distanciaGps: totalDistGps,
      sprints: totalSprints,
      velocidadMax: maxVel,
      hsr: totalHsrGps
    };
  }, [citations, trainingData, matchData, gpsStats, matchDatesSet]);

  const resolvedUserClubId = useMemo(() => {
    if (userClubId) return userClubId;
    if (userClub && clubs && clubs.length > 0) {
      const normUserClub = normalizeClub(userClub);
      const matchedClub = clubs.find(c => normalizeClub(c.nombre || c.nombre_corto || '') === normUserClub);
      if (matchedClub) return matchedClub.id_club;
    }
    return null;
  }, [userClubId, userClub, clubs]);

  const normalizedUserClubName = useMemo(() => {
    return userClub ? normalizeClub(userClub) : '';
  }, [userClub]);

  const clubPlayers = useMemo(() => {
    if (userRole !== 'club') return players;
    return players.filter(p => {
      const pClubId = p.id_club || p.club_id;
      
      // Look up by ID
      if (resolvedUserClubId && pClubId && Number(pClubId) === Number(resolvedUserClubId)) {
        return true;
      }
      
      // Fallback lookup by Name normalization
      const pClubName = p.club || p.club_name || (p.clubes && !Array.isArray(p.clubes) ? (p.clubes as any).nombre : null);
      if (normalizedUserClubName && pClubName) {
        return normalizeClub(pClubName) === normalizedUserClubName;
      }
      
      return false;
    });
  }, [players, userRole, resolvedUserClubId, normalizedUserClubName]);

  useEffect(() => {
    if (userRole === 'club' && clubPlayers.length > 0) {
      const isValid = selectedPlayerId && clubPlayers.some(p => Number(p.player_id) === Number(selectedPlayerId));
      if (!isValid) {
        setSelectedPlayerId(Number(clubPlayers[0].player_id));
      }
    }
  }, [clubPlayers, selectedPlayerId, userRole]);

  const uniqueYears = useMemo(() => {
    const years = clubPlayers.map(p => p.anio || p.year).filter(Boolean);
    return Array.from(new Set(years)).sort((a, b) => Number(b) - Number(a));
  }, [clubPlayers]);

  const uniqueClubs = useMemo(() => {
    const clubsMap = new Map();
    clubPlayers.forEach(p => {
      const clubId = p.id_club || p.club_id;
      // Support multiple possible field names for club name
      let clubName = p.club || p.club_name || (p.clubes && !Array.isArray(p.clubes) ? (p.clubes as any).nombre : null);
      
      // Fallback
      if (!clubName && clubId && FALLBACK_CLUB_NAMES[clubId]) {
        clubName = FALLBACK_CLUB_NAMES[clubId];
      }
      
      if (clubId !== undefined && clubId !== null && clubName) {
        clubsMap.set(clubId, clubName);
      }
    });
    return Array.from(clubsMap.entries()).map(([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [clubPlayers]);

  const uniquePositions = useMemo(() => {
    // Support both 'posicion' and 'position'
    const pos = clubPlayers.map(p => p.posicion || p.position).filter(Boolean);
    return Array.from(new Set(pos)).sort();
  }, [clubPlayers]);

  const filteredPlayers = useMemo(() => {
    return clubPlayers.filter(p => {
      const playerYear = p.anio || p.year;
      const playerPos = p.posicion || p.position;
      const playerClubId = p.id_club || p.club_id;

      const matchYear = !filterYear || String(playerYear) === filterYear;
      const matchPosition = !filterPosition || playerPos === filterPosition;
      const matchClub = !filterClubId || String(playerClubId) === filterClubId;
      
      return matchYear && matchPosition && matchClub;
    });
  }, [clubPlayers, filterYear, filterPosition, filterClubId]);

  const radarData = useMemo(() => {
    if (!profileData) return [];
    
    // Simplistic normalization for radar (0-100 scale)
    const power = latestImtp ? Math.min(100, (Number(latestImtp.imtp_fuerza_n) / 4500) * 100) : 0;
    const speedVal = latestSpeed ? Math.min(100, (10 / Number(latestSpeed.tiempo_total)) * 50) : 0; // Inverted since lower time is better
    const endurance = latestVo2 ? Math.min(100, (Number(latestVo2.vo2_max) / 70) * 100) : 0;
    const muscle = latestAnthro ? Math.min(100, (Number(latestAnthro.masa_muscular_pct) / 55) * 100) : 0;
    const fatBonus = latestAnthro ? Math.max(0, 100 - (Number(latestAnthro.masa_adiposa_pct) * 5)) : 0;

    return [
      { subject: 'Potencia', A: power, fullMark: 100 },
      { subject: 'Velocidad', A: speedVal, fullMark: 100 },
      { subject: 'Resistencia', A: endurance, fullMark: 100 },
      { subject: 'Masa Muscular', A: muscle, fullMark: 100 },
      { subject: 'Perfil Graso', A: fatBonus, fullMark: 100 },
    ];
  }, [profileData, latestImtp, latestSpeed, latestVo2, latestAnthro]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Search Header */}
      <div className="bg-white rounded-[40px] p-6 shadow-sm border border-slate-100 flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4 flex-1 min-w-[300px]">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shrink-0">
            <i className="fa-solid fa-id-card-clip text-xl"></i>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Perfil de Jugador</h2>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Hoja de Vida Deportiva Institucional</p>
          </div>
        </div>
        
        {userRole !== UserRole.PLAYER && (
          <div className="flex flex-wrap items-center gap-3">
             {/* Year Filter */}
             <select 
               value={filterYear} 
               onChange={(e) => setFilterYear(e.target.value)}
               className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-[10px] font-black text-slate-500 outline-none focus:ring-2 focus:ring-red-500/10 transition-all"
             >
               <option value="">Año (Todos)</option>
               {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
             </select>

             {/* Position Filter */}
             <select 
               value={filterPosition} 
               onChange={(e) => setFilterPosition(e.target.value)}
               className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-[10px] font-black text-slate-500 outline-none focus:ring-2 focus:ring-red-500/10 transition-all"
             >
               <option value="">Posición (Todas)</option>
               {uniquePositions.map(pos => <option key={pos} value={pos}>{pos}</option>)}
             </select>

             {/* Club Filter */}
             {userRole !== 'club' && (
               <select 
                 value={filterClubId} 
                 onChange={(e) => setFilterClubId(e.target.value)}
                 className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-[10px] font-black text-slate-500 outline-none focus:ring-2 focus:ring-red-500/10 transition-all"
               >
                 <option value="">Club (Todos)</option>
                 {uniqueClubs.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
               </select>
             )}

             <div className="h-8 w-px bg-slate-100 mx-2 hidden md:block"></div>

             <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 focus-within:ring-2 focus-within:ring-red-500/10 transition-all">
                <i className="fa-solid fa-user-check text-slate-300 text-xs"></i>
                <select 
                  value={selectedPlayerId || ''} 
                  onChange={(e) => setSelectedPlayerId(Number(e.target.value))}
                  className="bg-transparent border-none p-0 text-xs font-black text-slate-900 outline-none min-w-[200px]"
                >
                  <option value="">Seleccionar Atleta</option>
                  {filteredPlayers.map(p => (
                    <option key={p.player_id} value={p.player_id}>
                      {p.apellido1} {p.apellido2}, {p.nombre} ({p.player_id})
                    </option>
                  ))}
                </select>
             </div>
          </div>
        )}
      </div>

      {!selectedPlayerId || !profileData ? (
        <div className="bg-white rounded-[40px] py-32 text-center border border-dashed border-slate-200">
           <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
             <i className="fa-solid fa-user-gear text-4xl"></i>
           </div>
           <h3 className="text-xl font-black text-slate-900 uppercase italic">Buscador de Perfil</h3>
           <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Selecciona un jugador para ver su expediente completo</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Main Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* Left Column: Bio & Stats */}
            <div className="lg:col-span-1 space-y-8">
              {/* Bio Card */}
              <div className="bg-[#0b1220] rounded-[40px] p-8 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                <div className="relative z-10 text-center">
                  <div className="w-32 h-32 bg-slate-800 rounded-[32px] mx-auto mb-6 flex items-center justify-center border-4 border-white/5 relative shadow-2xl overflow-hidden">
                    {profileData.foto_url ? (
                      <img src={getDriveDirectLink(profileData.foto_url)} alt="Atleta" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-4xl font-black italic opacity-20">{profileData.nombre?.charAt(0)}{profileData.apellido1?.charAt(0)}</span>
                    )}
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter italic leading-none truncate">{profileData.nombre} {profileData.apellido1} {profileData.apellido2 || ''}</h3>
                  <p className="text-red-500 text-[10px] font-black uppercase tracking-widest mt-2">{profileData.posicion}</p>
                  
                  <div className="mt-8 pt-8 border-t border-white/5 flex justify-center items-center">
                    <ClubBadge clubName={profileData.club} idClub={profileData.id_club} clubs={clubs} logoSize="w-8 h-8" className="text-white text-xs font-black uppercase tracking-widest" />
                  </div>
                </div>

                <div className="mt-10 space-y-4">
                   <BioItem label="Clase" value={profileData.anio || 'N/A'} />
                   <BioItem label="Última Categoría" value={inferredCategory.toUpperCase().replace('_', ' ')} />
                   <BioItem label="Pierna" value={profileData.perfil_pierna || 'S/D'} />
                   <BioItem label="ID Unico" value={profileData.player_id} />
                </div>
              </div>

              {/* Counts Badge */}
              <div className="grid grid-cols-2 gap-4">
                <StatCard 
                  label="Citaciones" 
                  value={stats.citaciones} 
                  icon="fa-calendar-check" 
                  color="blue" 
                  extra={
                    <div className="flex flex-wrap gap-1 mt-2">
                       {Object.entries(stats.citByCategory).map(([cat, count]) => (
                         <span key={cat} className="text-[7px] font-black bg-white/20 px-1.5 py-0.5 rounded-full uppercase">
                           {cat.replace('sub_', '')}: {count}
                         </span>
                       ))}
                    </div>
                  }
                />
                <StatCard label="Entrenamientos" value={stats.entrenamientos} icon="fa-person-running" color="emerald" />
                <StatCard label="Partidos" value={stats.partidos} icon="fa-trophy" color="red" />
                <StatCard 
                  label="Distancia GPS" 
                  value={`${(stats.distanciaGps / 1000).toFixed(1)}km`} 
                  icon="fa-route" 
                  color="slate" 
                  extra={
                    <div className="text-[7px] font-black opacity-50 mt-1 uppercase">
                      {Math.round(stats.minutosGps)} MIN TOTALES
                    </div>
                  }
                />
              </div>

              {/* MÁXIMOS HISTÓRICOS GPS */}
              <div className="bg-white rounded-[40px] p-6 shadow-sm border border-slate-100">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-emerald-500 rounded-full"></span>
                  MÁXIMOS HISTÓRICOS GPS
                </h3>
                {gpsStats.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
                    {/* 1. DISTANCIA */}
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-emerald-200/60 hover:bg-emerald-50/10 transition-all">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-100/60 text-emerald-600 ring-2 ring-emerald-500/5 shadow-inner shrink-0">
                          <i className="fa-solid fa-route text-xs"></i>
                        </div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider truncate">Distancia</span>
                      </div>
                      <div className="text-right shrink-0 pl-2">
                        <span className="text-xs font-black text-slate-900 font-mono italic">
                          {safeMax(gpsStats.map(g => Number(g.dist_total_m) || 0)).toLocaleString('es-cl', { maximumFractionDigits: 0 })}
                        </span>
                        <span className="text-[7.5px] font-bold text-slate-400 ml-0.5 uppercase">m</span>
                      </div>
                    </div>

                    {/* 2. VELOCIDAD */}
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-rose-200/60 hover:bg-rose-50/10 transition-all">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-rose-100/60 text-rose-600 ring-2 ring-rose-500/5 shadow-inner shrink-0">
                          <i className="fa-solid fa-gauge-high text-xs"></i>
                        </div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider truncate">Velocidad</span>
                      </div>
                      <div className="text-right shrink-0 pl-2">
                        <span className="text-xs font-black text-slate-900 font-mono italic">
                          {safeMax(gpsStats.map(g => Number(g.vel_max_kmh) || Number(g.velocidad_max) || 0)).toFixed(1)}
                        </span>
                        <span className="text-[7.5px] font-bold text-slate-400 ml-0.5 uppercase">km/h</span>
                      </div>
                    </div>

                    {/* 3. METROS / MIN */}
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-200/60 hover:bg-blue-50/10 transition-all">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-blue-100/60 text-blue-600 ring-2 ring-blue-500/5 shadow-inner shrink-0">
                          <i className="fa-solid fa-bolt-lightning text-xs"></i>
                        </div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider truncate">Relativa</span>
                      </div>
                      <div className="text-right shrink-0 pl-2">
                        <span className="text-xs font-black text-slate-900 font-mono italic">
                          {safeMax(gpsStats.map(g => Number(g.m_por_min) || (Number(g.minutos) > 0 ? (Number(g.dist_total_m) / Number(g.minutos)) : 0))).toFixed(1)}
                        </span>
                        <span className="text-[7.5px] font-bold text-slate-400 ml-0.5 uppercase">m/min</span>
                      </div>
                    </div>

                    {/* 4. HSR */}
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-amber-200/60 hover:bg-amber-50/10 transition-all">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-amber-100/60 text-amber-600 ring-2 ring-amber-500/5 shadow-inner shrink-0">
                          <i className="fa-solid fa-wind text-xs"></i>
                        </div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider truncate">HSR ({">"}20)</span>
                      </div>
                      <div className="text-right shrink-0 pl-2">
                        <span className="text-xs font-black text-slate-900 font-mono italic">
                          {safeMax(gpsStats.map(g => Number(g.dist_mai_m_20_kmh) || 0)).toLocaleString('es-cl', { maximumFractionDigits: 0 })}
                        </span>
                        <span className="text-[7.5px] font-bold text-slate-400 ml-0.5 uppercase">m</span>
                      </div>
                    </div>

                    {/* 5. DIST. SPRINT */}
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-violet-200/60 hover:bg-violet-50/10 transition-all">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-violet-100/60 text-violet-600 ring-2 ring-violet-500/5 shadow-inner shrink-0">
                          <i className="fa-solid fa-rocket text-xs"></i>
                        </div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider truncate">Dist. Sprint</span>
                      </div>
                      <div className="text-right shrink-0 pl-2">
                        <span className="text-xs font-black text-slate-900 font-mono italic">
                          {safeMax(gpsStats.map(g => Number(g.dist_sprint_m_25_kmh) || 0)).toLocaleString('es-cl', { maximumFractionDigits: 0 })}
                        </span>
                        <span className="text-[7.5px] font-bold text-slate-400 ml-0.5 uppercase">m</span>
                      </div>
                    </div>

                    {/* 6. SPRINTS */}
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-fuchsia-200/60 hover:bg-fuchsia-50/10 transition-all">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-fuchsia-100/60 text-fuchsia-600 ring-2 ring-fuchsia-500/5 shadow-inner shrink-0">
                          <i className="fa-solid fa-fire text-xs"></i>
                        </div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider truncate">Sprints</span>
                      </div>
                      <div className="text-right shrink-0 pl-2">
                        <span className="text-xs font-black text-slate-900 font-mono italic">
                          {safeMax(gpsStats.map(g => Number(g.sprints_n) || 0))}
                        </span>
                        <span className="text-[7.5px] font-bold text-slate-400 ml-0.5 uppercase">n</span>
                      </div>
                    </div>

                    {/* 7. ACC/DEC */}
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-sky-200/60 hover:bg-sky-50/10 transition-all">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-sky-100/60 text-sky-600 ring-2 ring-sky-500/5 shadow-inner shrink-0">
                          <i className="fa-solid fa-arrows-left-right text-xs"></i>
                        </div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider truncate font-sans">A/D</span>
                      </div>
                      <div className="text-right shrink-0 pl-2">
                        <span className="text-xs font-black text-slate-900 font-mono italic">
                          {safeMax(gpsStats.map(g => Number(g.acc_decc_ai_n) || 0))}
                        </span>
                        <span className="text-[7.5px] font-bold text-slate-400 ml-0.5 uppercase font-sans">n</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-[10px] text-slate-400 uppercase font-black py-4">Sin datos GPS registrados</p>
                )}
              </div>

              {/* HISTORIAL DE ÁREA MÉDICA */}
              <div className="bg-white rounded-[40px] p-6 shadow-sm border border-slate-100 mt-6">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-red-600 rounded-full"></span>
                  HISTORIAL ÁREA MÉDICA
                </h3>

                {/* Micro Stat Grid */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 text-center">
                    <span className="block text-xs font-black text-slate-800 font-mono italic">
                      {medicalHistory.injuries.length}
                    </span>
                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-wider block">Lesiones</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 text-center">
                    <span className="block text-xs font-black text-slate-800 font-mono italic">
                      {medicalHistory.reports.length}
                    </span>
                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-wider block">Partes</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 text-center">
                    <span className="block text-xs font-black text-slate-800 font-mono italic">
                      {medicalHistory.treatments.length}
                    </span>
                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-wider block">Kinesio</span>
                  </div>
                </div>

                {/* Combined list of medical events */}
                <div className="space-y-2">
                  {(() => {
                    const events: { date: string; type: 'lesion' | 'report' | 'treatment'; title: string; subtitle: string; severity?: string; status?: string }[] = [];

                    medicalHistory.injuries.forEach(i => {
                      events.push({
                        date: i.fecha_inicio || '',
                        type: 'lesion',
                        title: i.tipo_lesion || i.diagnostico_clinico || 'Lesión',
                        subtitle: `${i.localizacion || ''} ${i.lado ? `(${i.lado})` : ''}`.trim(),
                        status: i.estado || 'Finalizado'
                      });
                    });

                    medicalHistory.reports.forEach(r => {
                      events.push({
                        date: r.report_date || '',
                        type: 'report',
                        title: r.diagnostico_medico || 'Evaluación médica',
                        subtitle: r.observation || '',
                        severity: r.severity
                      });
                    });

                    medicalHistory.treatments.forEach(t => {
                      events.push({
                        date: t.treatment_date || '',
                        type: 'treatment',
                        title: 'Atención Kinésica',
                        subtitle: t.description || ''
                      });
                    });

                    // Sort by date descending
                    const sortedEvents = events
                      .filter(e => e.date)
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .slice(0, 3);

                    if (sortedEvents.length === 0) {
                      return (
                        <p className="text-center text-[9px] text-slate-400 uppercase font-black py-4">Sin registros médicos</p>
                      );
                    }

                    return sortedEvents.map((evt, idx) => {
                      let typeLabel = '';
                      let typeColor = '';
                      let icon = '';

                      if (evt.type === 'lesion') {
                        typeLabel = evt.status === 'Activo' ? 'LESIONADO' : 'ALTA';
                        typeColor = evt.status === 'Activo' ? 'bg-red-50 text-red-500 border border-red-100' : 'bg-slate-50 text-slate-400 border border-slate-100';
                        icon = 'fa-user-injured';
                      } else if (evt.type === 'report') {
                        typeLabel = evt.severity === 'high' ? 'P. CRÍTICO' : evt.severity === 'medium' ? 'P. MEDIO' : 'P. DIARIO';
                        typeColor = evt.severity === 'high' ? 'bg-rose-50 text-rose-500 border border-rose-100' : 'bg-amber-50 text-amber-500 border border-amber-100';
                        icon = 'fa-file-medical';
                      } else {
                        typeLabel = 'KINESIO';
                        typeColor = 'bg-emerald-50 text-emerald-500 border border-emerald-100';
                        icon = 'fa-hand-holding-medical';
                      }

                      return (
                        <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-between hover:border-slate-200 transition-all">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[7.5px] font-bold text-slate-400 font-mono">{evt.date}</span>
                            <span className={`px-2 py-0.5 rounded-md text-[6.5px] font-black uppercase tracking-wider ${typeColor}`}>
                              {typeLabel}
                            </span>
                          </div>
                          <div className="flex items-start gap-2 mt-1">
                            <i className={`fa-solid ${icon} text-[10px] text-slate-400 mt-0.5`}></i>
                            <div className="min-w-0 flex-1">
                              <p className="text-[9px] font-black text-slate-800 uppercase tracking-tight truncate">
                                {evt.title}
                              </p>
                              {evt.subtitle && (
                                <p className="text-[8px] font-medium text-slate-400 uppercase tracking-wide truncate mt-0.5">
                                  {evt.subtitle}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>

            {/* Right Column: charts & tables */}
            <div className="lg:col-span-3 space-y-8">

              {/* GRÁFICO DUAL CHECK-IN vs CHECK-OUT CON FILTRO SLIDER */}
              <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
                 <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                    <span className="w-2 h-6 bg-indigo-600 rounded-full"></span>
                    Relación Diario: Check-In vs Check-Out (Carga Interna)
                 </h3>
                 
                 <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Left: Range Slider Controls */}
                    <div className="xl:col-span-1 border-r border-slate-100 pr-0 xl:pr-6">
                       <div className="bg-slate-50 border border-slate-100 rounded-3xl p-5 flex flex-col justify-between h-auto gap-4">
                          <div className="flex justify-between items-center">
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date / Rangos de Control</span>
                             {((sliderStart && sliderStart !== (availableDates[0] || '')) || (sliderEnd && sliderEnd !== (availableDates[availableDates.length - 1] || ''))) && (
                                <button 
                                   onClick={() => {
                                      if (availableDates.length > 0) {
                                         setSliderStart(availableDates[0]);
                                         setSliderEnd(availableDates[availableDates.length - 1]);
                                      }
                                   }}
                                   className="w-7 h-7 rounded-full bg-slate-200/55 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all shadow-sm"
                                   title="Restaurar filtro"
                                >
                                   <i className="fa-solid fa-eraser text-xs"></i>
                                </button>
                             )}
                          </div>

                          {/* Raw display bounds */}
                          <div className="flex flex-col gap-3">
                             <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-2xl shadow-sm text-xs font-bold text-slate-700 w-full justify-between">
                                <div className="flex items-center gap-1">
                                   <i className="fa-solid fa-clock-rotate-left text-slate-400 scale-75"></i>
                                   <span className="text-[8.5px] font-black text-slate-400 uppercase">Inicio</span>
                                </div>
                                <input 
                                   type="date" 
                                   value={sliderStart}
                                   max={sliderEnd || undefined}
                                   onChange={(e) => {
                                      if (e.target.value) setSliderStart(e.target.value);
                                   }}
                                   className="bg-transparent border-none p-0 outline-none w-24 text-right font-bold text-slate-800 text-[11px]"
                                />
                             </div>

                             <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-2xl shadow-sm text-xs font-bold text-slate-700 w-full justify-between">
                                <div className="flex items-center gap-1">
                                   <i className="fa-solid fa-hourglass-end text-slate-400 scale-75"></i>
                                   <span className="text-[8.5px] font-black text-slate-400 uppercase">Fin</span>
                                </div>
                                <input 
                                   type="date" 
                                   value={sliderEnd}
                                   min={sliderStart || undefined}
                                   onChange={(e) => {
                                      if (e.target.value) setSliderEnd(e.target.value);
                                   }}
                                   className="bg-transparent border-none p-0 outline-none w-24 text-right font-bold text-slate-800 text-[11px]"
                                />
                             </div>
                          </div>

                          {/* Interactive Range Track */}
                          {availableDates.length > 1 ? (
                             <div className="relative py-4 px-2 select-none">
                                <div 
                                   ref={trackRef}
                                   className="h-1 bg-slate-200 rounded-full w-full relative cursor-pointer"
                                   onClick={(e) => {
                                      if (!trackRef.current) return;
                                      const rect = trackRef.current.getBoundingClientRect();
                                      const clickX = e.clientX;
                                      const clickPercent = ((clickX - rect.left) / rect.width) * 100;
                                      
                                      const sIdx = availableDates.indexOf(sliderStart);
                                      const eIdx = availableDates.indexOf(sliderEnd);
                                      const pctS = (sIdx / (availableDates.length - 1)) * 100;
                                      const pctE = (eIdx / (availableDates.length - 1)) * 100;
                                      
                                      if (Math.abs(clickPercent - pctS) < Math.abs(clickPercent - pctE)) {
                                         const rIdx = (clickPercent / 100) * (availableDates.length - 1);
                                         setSliderStart(availableDates[Math.max(0, Math.min(Math.round(rIdx), eIdx - 1))]);
                                      } else {
                                         const rIdx = (clickPercent / 100) * (availableDates.length - 1);
                                         setSliderEnd(availableDates[Math.max(sIdx + 1, Math.min(availableDates.length - 1, Math.round(rIdx)))]);
                                      }
                                   }}
                                >
                                   <div 
                                      className="absolute h-1 bg-slate-900 rounded-full transition-all"
                                      style={{
                                         left: `${startPercent}%`,
                                         width: `${endPercent - startPercent}%`
                                      }}
                                   />
                                   <div 
                                      onMouseDown={(e) => { e.stopPropagation(); setDraggingThumb('start'); }}
                                      onTouchStart={(e) => { e.stopPropagation(); setDraggingThumb('start'); }}
                                      className={`absolute w-5 h-5 -top-2 bg-white border-[3px] border-slate-900 rounded-full shadow-lg -translate-x-1/2 cursor-grab active:cursor-grabbing hover:scale-110 active:scale-95 transition-all ${draggingThumb === 'start' ? 'scale-110 ring-4 ring-slate-900/10' : ''}`}
                                      style={{ left: `${startPercent}%` }}
                                   />
                                   <div 
                                      onMouseDown={(e) => { e.stopPropagation(); setDraggingThumb('end'); }}
                                      onTouchStart={(e) => { e.stopPropagation(); setDraggingThumb('end'); }}
                                      className={`absolute w-5 h-5 -top-2 bg-white border-[3px] border-slate-900 rounded-full shadow-lg -translate-x-1/2 cursor-grab active:cursor-grabbing hover:scale-110 active:scale-95 transition-all ${draggingThumb === 'end' ? 'scale-110 ring-4 ring-slate-900/10' : ''}`}
                                      style={{ left: `${endPercent}%` }}
                                   />
                                </div>
                                <div className="flex justify-between items-center mt-3 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                   <span>{sliderStart}</span>
                                   <span>{sliderEnd}</span>
                                </div>
                             </div>
                          ) : (
                             <div className="text-center py-4 text-[9px] font-black text-slate-300 uppercase tracking-widest">
                                Rango de Slider Deshabilitado
                             </div>
                          )}

                          {/* Metric Selectors */}
                          <div className="grid grid-cols-2 gap-4 mt-2 pt-4 border-t border-slate-100">
                             <div className="space-y-1.5">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                   <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full inline-block"></span>
                                   Check-In (Izquierdo)
                                </label>
                                <select
                                   value={leftMetric}
                                   onChange={(e) => setLeftMetric(e.target.value)}
                                   className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-[9px] font-black text-slate-700 outline-none shadow-sm cursor-pointer"
                                >
                                   <option value="checkIn">Promedio Wellness</option>
                                   <option value="fatiga">Fatiga</option>
                                   <option value="sueno">Calidad Sueño</option>
                                   <option value="dolor">Nivel Dolor</option>
                                   <option value="estres">Estrés</option>
                                   <option value="animo">Ánimo</option>
                                </select>
                             </div>

                             <div className="space-y-1.5">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                   <span className="w-1.5 h-1.5 bg-red-600 rounded-full inline-block"></span>
                                   Check-Out (Derecho)
                                </label>
                                <select
                                   value={rightMetric}
                                   onChange={(e) => setRightMetric(e.target.value)}
                                   className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-[9px] font-black text-slate-700 outline-none shadow-sm cursor-pointer"
                                >
                                   <option value="checkOutRPE">Esfuerzo RPE (1-10)</option>
                                   <option value="checkOutSRPE">Carga sRPE</option>
                                   <option value="checkOutDuration">Duración (min)</option>
                                </select>
                             </div>
                          </div>
                       </div>
                    </div>

                    {/* Right: Dual Axis LineChart */}
                    <div className="xl:col-span-2 h-[320px] w-full self-center flex items-center justify-center">
                       {filteredCombinedData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                             <LineChart data={filteredCombinedData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                   dataKey="date" 
                                   tickFormatter={(val) => {
                                      const parts = val.split('-');
                                      return parts.length === 3 ? `${parts[2]}/${parts[1]}` : val;
                                   }}
                                   tick={{fontSize: 9, fontWeight: 900, fill: '#94a3b8'}} 
                                   axisLine={false} 
                                   tickLine={false} 
                                />
                                <YAxis 
                                   yAxisId="left"
                                   tick={{fontSize: 9, fontWeight: 900, fill: '#4f46e5'}} 
                                   axisLine={false} 
                                   tickLine={false} 
                                   domain={[0, 10]}
                                />
                                <YAxis 
                                   yAxisId="right"
                                   orientation="right"
                                   tick={{fontSize: 9, fontWeight: 900, fill: '#CF1B2B'}} 
                                   axisLine={false} 
                                   tickLine={false} 
                                   domain={rightMetric === 'checkOutRPE' ? [0, 10] : ['auto', 'auto']}
                                />
                                <Tooltip 
                                   contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                   labelFormatter={(label) => `Fecha: ${label}`}
                                />
                                <Legend verticalAlign="top" align="right" iconType="circle" iconSize={8} wrapperStyle={{ paddingBottom: '20px', fontSize: '9px', fontWeight: '955', textTransform: 'uppercase' }} />
                                <Line 
                                   yAxisId="left"
                                   name={leftMetric === 'checkIn' ? 'Promedio Wellness' : leftMetric === 'fatiga' ? 'Fatiga' : leftMetric === 'sueno' ? 'Sueño' : leftMetric === 'dolor' ? 'Dolor' : leftMetric === 'estres' ? 'Estrés' : 'Ánimo'}
                                   type="monotone" 
                                   dataKey={leftMetric} 
                                   stroke="#4f46e5" 
                                   strokeWidth={4} 
                                   dot={{ r: 5, fill: '#4f46e5', strokeWidth: 0 }} 
                                   activeDot={{ r: 7 }} 
                                />
                                <Line 
                                   yAxisId="right"
                                   name={rightMetric === 'checkOutRPE' ? 'Carga RPE' : rightMetric === 'checkOutSRPE' ? 'Carga sRPE' : 'Duración Sesión'}
                                   type="monotone" 
                                   dataKey={rightMetric} 
                                   stroke="#CF1B2B" 
                                   strokeWidth={4} 
                                   dot={{ r: 5, fill: '#CF1B2B', strokeWidth: 0 }} 
                                   activeDot={{ r: 7 }} 
                                />
                             </LineChart>
                          </ResponsiveContainer>
                       ) : (
                          <div className="h-full w-full flex flex-col items-center justify-center p-8 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                             <i className="fa-solid fa-chart-line text-slate-300 text-3xl mb-3 animate-pulse"></i>
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Filtro de fechas sin registros diarios coincidiendo</p>
                             <p className="text-[8px] text-slate-400 text-center mt-1">Intente reajustar el rango del slider o seleccionar otro atleta.</p>
                          </div>
                       )}
                    </div>
                 </div>
              </div>

              {/* GPS History */}
              <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
                 <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                    <span className="w-2 h-6 bg-emerald-600 rounded-full"></span>
                    Desempeño Físico (GPS)
                 </h3>
                 
                 <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Left: Range Slider Controls */}
                    <div className="xl:col-span-1 border-r border-slate-100 pr-0 xl:pr-6">
                       <div className="bg-slate-50 border border-slate-100 rounded-3xl p-5 flex flex-col justify-between h-auto gap-4">
                          <div className="flex justify-between items-center">
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date / Rangos de Control</span>
                             {((gpsSliderStart && gpsSliderStart !== (gpsAvailableDates[0] || '')) || (gpsSliderEnd && gpsSliderEnd !== (gpsAvailableDates[gpsAvailableDates.length - 1] || ''))) && (
                                <button 
                                   onClick={() => {
                                      if (gpsAvailableDates.length > 0) {
                                         setGpsSliderStart(gpsAvailableDates[0]);
                                         setGpsSliderEnd(gpsAvailableDates[gpsAvailableDates.length - 1]);
                                      }
                                   }}
                                   className="w-7 h-7 rounded-full bg-slate-200/55 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all shadow-sm"
                                   title="Restaurar filtro"
                                >
                                   <i className="fa-solid fa-eraser text-xs"></i>
                                </button>
                             )}
                          </div>

                          {/* Raw display bounds */}
                          <div className="flex flex-col gap-3">
                             <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-2xl shadow-sm text-xs font-bold text-slate-700 w-full justify-between">
                                <div className="flex items-center gap-1">
                                   <i className="fa-solid fa-clock-rotate-left text-slate-400 scale-75"></i>
                                   <span className="text-[8.5px] font-black text-slate-400 uppercase">Inicio</span>
                                </div>
                                <input 
                                   type="date" 
                                   value={gpsSliderStart}
                                   max={gpsSliderEnd || undefined}
                                   onChange={(e) => {
                                      if (e.target.value) setGpsSliderStart(e.target.value);
                                   }}
                                   className="bg-transparent border-none p-0 outline-none w-24 text-right font-bold text-slate-800 text-[11px]"
                                />
                             </div>

                             <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-2xl shadow-sm text-xs font-bold text-slate-700 w-full justify-between">
                                <div className="flex items-center gap-1">
                                   <i className="fa-solid fa-hourglass-end text-slate-400 scale-75"></i>
                                   <span className="text-[8.5px] font-black text-slate-400 uppercase">Fin</span>
                                </div>
                                <input 
                                   type="date" 
                                   value={gpsSliderEnd}
                                   min={gpsSliderStart || undefined}
                                   onChange={(e) => {
                                      if (e.target.value) setGpsSliderEnd(e.target.value);
                                   }}
                                   className="bg-transparent border-none p-0 outline-none w-24 text-right font-bold text-slate-800 text-[11px]"
                                />
                             </div>
                          </div>

                          {/* Interactive Range Track */}
                          {gpsAvailableDates.length > 1 ? (
                             <div className="relative py-4 px-2 select-none">
                                <div 
                                   ref={gpsTrackRef}
                                   className="h-1 bg-slate-200 rounded-full w-full relative cursor-pointer"
                                   onClick={(e) => {
                                      if (!gpsTrackRef.current) return;
                                      const rect = gpsTrackRef.current.getBoundingClientRect();
                                      const clickX = e.clientX;
                                      const clickPercent = ((clickX - rect.left) / rect.width) * 100;
                                      
                                      const sIdx = gpsAvailableDates.indexOf(gpsSliderStart);
                                      const eIdx = gpsAvailableDates.indexOf(gpsSliderEnd);
                                      const pctS = (sIdx / (gpsAvailableDates.length - 1)) * 100;
                                      const pctE = (eIdx / (gpsAvailableDates.length - 1)) * 100;
                                      
                                      if (Math.abs(clickPercent - pctS) < Math.abs(clickPercent - pctE)) {
                                         const rIdx = (clickPercent / 100) * (gpsAvailableDates.length - 1);
                                         setGpsSliderStart(gpsAvailableDates[Math.max(0, Math.min(Math.round(rIdx), eIdx - 1))]);
                                      } else {
                                         const rIdx = (clickPercent / 100) * (gpsAvailableDates.length - 1);
                                         setGpsSliderEnd(gpsAvailableDates[Math.max(sIdx + 1, Math.min(gpsAvailableDates.length - 1, Math.round(rIdx)))]);
                                      }
                                   }}
                                >
                                   <div 
                                      className="absolute h-1 bg-emerald-600 rounded-full transition-all"
                                      style={{
                                         left: `${gpsStartPercent}%`,
                                         width: `${gpsEndPercent - gpsStartPercent}%`
                                      }}
                                   />
                                   <div 
                                      onMouseDown={(e) => { e.stopPropagation(); setGpsDraggingThumb('start'); }}
                                      onTouchStart={(e) => { e.stopPropagation(); setGpsDraggingThumb('start'); }}
                                      className={`absolute w-5 h-5 -top-2 bg-white border-[3px] border-emerald-600 rounded-full shadow-lg -translate-x-1/2 cursor-grab active:cursor-grabbing hover:scale-110 active:scale-95 transition-all ${gpsDraggingThumb === 'start' ? 'scale-110 ring-4 ring-emerald-600/10' : ''}`}
                                      style={{ left: `${gpsStartPercent}%` }}
                                   />
                                   <div 
                                      onMouseDown={(e) => { e.stopPropagation(); setGpsDraggingThumb('end'); }}
                                      onTouchStart={(e) => { e.stopPropagation(); setGpsDraggingThumb('end'); }}
                                      className={`absolute w-5 h-5 -top-2 bg-white border-[3px] border-emerald-600 rounded-full shadow-lg -translate-x-1/2 cursor-grab active:cursor-grabbing hover:scale-110 active:scale-95 transition-all ${gpsDraggingThumb === 'end' ? 'scale-110 ring-4 ring-emerald-600/10' : ''}`}
                                      style={{ left: `${gpsEndPercent}%` }}
                                   />
                                </div>
                                <div className="flex justify-between items-center mt-3 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                   <span>{gpsSliderStart}</span>
                                   <span>{gpsSliderEnd}</span>
                                </div>
                             </div>
                          ) : (
                             <div className="text-center py-4 text-[9px] font-black text-slate-300 uppercase tracking-widest">
                                Rango de Slider Deshabilitado
                             </div>
                          )}

                          {/* Metric Selector inside same card */}
                          <div className="grid grid-cols-1 gap-4 mt-2 pt-4 border-t border-slate-100">
                             <div className="space-y-1.5 flex flex-col justify-end">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                   <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full inline-block"></span>
                                   Métrica Desempeño (GPS)
                                </label>
                                <div className="grid grid-cols-3 bg-slate-50 p-1 rounded-2xl border border-slate-100 w-full gap-1">
                                   <button 
                                     type="button"
                                     onClick={() => setGpsChartMetric('dist_total_m')}
                                     className={`py-1.5 rounded-xl text-[8.5px] font-black uppercase transition-all text-center ${gpsChartMetric === 'dist_total_m' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                   >
                                     Distancia
                                   </button>
                                   <button 
                                     type="button"
                                     onClick={() => setGpsChartMetric('dist_mai_m_20_kmh')}
                                     className={`py-1.5 rounded-xl text-[8.5px] font-black uppercase transition-all text-center ${gpsChartMetric === 'dist_mai_m_20_kmh' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                   >
                                     HSR ({'>'}20)
                                   </button>
                                   <button 
                                     type="button"
                                     onClick={() => setGpsChartMetric('m_por_min')}
                                     className={`py-1.5 rounded-xl text-[8.5px] font-black uppercase transition-all text-center ${gpsChartMetric === 'm_por_min' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                   >
                                     Relativa
                                   </button>
                                   <button 
                                     type="button"
                                     onClick={() => setGpsChartMetric('acc_decc_ai_n')}
                                     className={`py-1.5 rounded-xl text-[8.5px] font-black uppercase transition-all text-center ${gpsChartMetric === 'acc_decc_ai_n' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                   >
                                     A/D
                                   </button>
                                   <button 
                                     type="button"
                                     onClick={() => setGpsChartMetric('sprints_n')}
                                     className={`py-1.5 rounded-xl text-[8.5px] font-black uppercase transition-all text-center ${gpsChartMetric === 'sprints_n' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                   >
                                     Sprints
                                   </button>
                                   <button 
                                     type="button"
                                     onClick={() => setGpsChartMetric('dist_sprint_m_25_kmh')}
                                     className={`py-1.5 rounded-xl text-[8.5px] font-black uppercase transition-all text-center ${gpsChartMetric === 'dist_sprint_m_25_kmh' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                   >
                                     Dist. Spt
                                   </button>
                                </div>
                                <div className="flex items-center gap-3 mt-1.5 px-1 justify-start">
                                   <div className="flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 bg-[#10b981] rounded-full inline-block"></span>
                                      <span className="text-[7.5px] font-black uppercase text-slate-400 tracking-wider">Entrenamiento</span>
                                   </div>
                                   <div className="flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 bg-[#ef4444] rounded-full inline-block"></span>
                                      <span className="text-[7.5px] font-black uppercase text-slate-400 tracking-wider">Partido</span>
                                   </div>
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>

                    {/* Right: BarChart Canvas */}
                    <div className="xl:col-span-2">
                       <div className="h-[250px]">
                          {filteredGpsStats.length > 0 ? (
                             <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={filteredGpsStats}>
                                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                   <XAxis dataKey="fecha" tick={{fontSize: 9, fontWeight: 900, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                                   <YAxis tick={{fontSize: 9, fontWeight: 900, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                                   <Tooltip 
                                     contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                     cursor={{fill: '#f8fafc'}}
                                   />
                                   <Bar 
                                     name={
                                       gpsChartMetric === 'dist_total_m' ? 'Distancia (m)' : 
                                       gpsChartMetric === 'dist_mai_m_20_kmh' ? 'HSR >20km/h (m)' : 
                                       gpsChartMetric === 'm_por_min' ? 'M/min' : 
                                       gpsChartMetric === 'acc_decc_ai_n' ? 'Acc/Decc (n)' :
                                       gpsChartMetric === 'sprints_n' ? 'Sprints (n)' :
                                       'Dist. Sprint >25km/h (m)'
                                     } 
                                     dataKey={gpsChartMetric} 
                                     radius={[8, 8, 0, 0]} 
                                     barSize={32} 
                                   >
                                      {filteredGpsStats.map((entry, index) => {
                                         const isMatchDay = matchDatesSet.has(entry.fecha);
                                         return (
                                            <Cell 
                                               key={`cell-${index}`} 
                                               fill={isMatchDay ? '#ef4444' : '#10b981'} 
                                            />
                                         );
                                      })}
                                   </Bar>
                                </BarChart>
                             </ResponsiveContainer>
                          ) : (
                             <div className="h-full w-full flex flex-col items-center justify-center p-8 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                <i className="fa-solid fa-chart-simple text-slate-300 text-3xl mb-3 animate-pulse"></i>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Filtro de fechas sin registros GPS coincidiendo</p>
                                <p className="text-[8px] text-slate-400 text-center mt-1">Intente reajustar el rango del slider o seleccionar otro atleta.</p>
                             </div>
                          )}
                       </div>
                    </div>
                 </div>
              </div>

              {/* MÁXIMOS HISTÓRICOS GPS - FULL WIDTH ON ITS OWN ROW */}
              <div className="hidden bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 mb-8 w-full col-span-1 md:col-span-2">
                 <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-emerald-500 rounded-full"></span>
                    MÁXIMOS HISTÓRICOS GPS
                 </h3>
                 {gpsStats.length > 0 ? (
                     <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
                        {/* 1. DISTANCE */}
                        <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/10 transition-all flex flex-col items-center text-center justify-between min-h-[170px]">
                           <div className="w-12 h-12 rounded-full flex items-center justify-center bg-emerald-100/60 text-emerald-600 ring-4 ring-emerald-500/10 mb-3 shadow-inner">
                              <i className="fa-solid fa-route text-base"></i>
                           </div>
                           <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-2">MÁX. DISTANCIA</span>
                           <div>
                              <span className="text-xl font-black text-slate-900 tracking-tight italic font-mono">
                                 {safeMax(gpsStats.map(g => Number(g.dist_total_m) || 0)).toLocaleString('es-cl', { maximumFractionDigits: 0 })}
                              </span>
                              <span className="text-[9px] font-bold text-slate-400 ml-1">m</span>
                           </div>
                        </div>

                        {/* 2. VELOCIDAD */}
                        <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 hover:border-rose-200 hover:bg-rose-50/10 transition-all flex flex-col items-center text-center justify-between min-h-[170px]">
                           <div className="w-12 h-12 rounded-full flex items-center justify-center bg-rose-100/60 text-rose-600 ring-4 ring-rose-500/10 mb-3 shadow-inner">
                              <i className="fa-solid fa-gauge-high text-base"></i>
                           </div>
                           <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-2">MÁX. VELOCIDAD</span>
                           <div>
                              <span className="text-xl font-black text-slate-900 tracking-tight italic font-mono">
                                 {safeMax(gpsStats.map(g => Number(g.vel_max_kmh) || Number(g.velocidad_max) || 0)).toFixed(1)}
                              </span>
                              <span className="text-[9px] font-bold text-slate-400 ml-1">km/h</span>
                           </div>
                        </div>

                        {/* 3. METROS POR MINUTO */}
                        <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/10 transition-all flex flex-col items-center text-center justify-between min-h-[170px]">
                           <div className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-100/60 text-blue-600 ring-4 ring-blue-500/10 mb-3 shadow-inner">
                              <i className="fa-solid fa-bolt-lightning text-base"></i>
                           </div>
                           <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-2">MÁX. METROS / MIN</span>
                           <div>
                              <span className="text-xl font-black text-slate-900 tracking-tight italic font-mono">
                                 {safeMax(gpsStats.map(g => Number(g.m_por_min) || (Number(g.minutos) > 0 ? (Number(g.dist_total_m) / Number(g.minutos)) : 0))).toFixed(1)}
                              </span>
                              <span className="text-[9px] font-bold text-slate-400 ml-1">m/min</span>
                           </div>
                        </div>

                        {/* 4. HSR */}
                        <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 hover:border-amber-200 hover:bg-amber-50/10 transition-all flex flex-col items-center text-center justify-between min-h-[170px]">
                           <div className="w-12 h-12 rounded-full flex items-center justify-center bg-amber-100/60 text-amber-600 ring-4 ring-amber-500/10 mb-3 shadow-inner">
                              <i className="fa-solid fa-wind text-base"></i>
                           </div>
                           <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-2">MÁX. HSR ({">"}20 km/h)</span>
                           <div>
                              <span className="text-xl font-black text-slate-900 tracking-tight italic font-mono">
                                 {safeMax(gpsStats.map(g => Number(g.dist_mai_m_20_kmh) || 0)).toLocaleString('es-cl', { maximumFractionDigits: 0 })}
                              </span>
                              <span className="text-[9px] font-bold text-slate-400 ml-1">m</span>
                           </div>
                        </div>

                        {/* 5. SPRINT DISTANCE */}
                        <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 hover:border-violet-200 hover:bg-violet-50/10 transition-all flex flex-col items-center text-center justify-between min-h-[170px]">
                           <div className="w-12 h-12 rounded-full flex items-center justify-center bg-violet-100/60 text-violet-600 ring-4 ring-violet-500/10 mb-3 shadow-inner">
                              <i className="fa-solid fa-rocket text-base"></i>
                           </div>
                           <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-2">MÁX. DIST. SPRINT</span>
                           <div>
                              <span className="text-xl font-black text-slate-900 tracking-tight italic font-mono">
                                 {safeMax(gpsStats.map(g => Number(g.dist_sprint_m_25_kmh) || 0)).toLocaleString('es-cl', { maximumFractionDigits: 0 })}
                              </span>
                              <span className="text-[9px] font-bold text-slate-400 ml-1">m</span>
                           </div>
                        </div>

                        {/* 6. SPRINTS COUNT */}
                        <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 hover:border-fuchsia-200 hover:bg-fuchsia-50/10 transition-all flex flex-col items-center text-center justify-between min-h-[170px]">
                           <div className="w-12 h-12 rounded-full flex items-center justify-center bg-fuchsia-100/60 text-fuchsia-600 ring-4 ring-fuchsia-500/10 mb-3 shadow-inner">
                              <i className="fa-solid fa-fire text-base"></i>
                           </div>
                           <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-2">MÁX. SPRINTS</span>
                           <div>
                              <span className="text-xl font-black text-slate-900 tracking-tight italic font-mono">
                                 {safeMax(gpsStats.map(g => Number(g.sprints_n) || 0))}
                              </span>
                              <span className="text-[9px] font-bold text-slate-400 ml-1">sprints</span>
                           </div>
                        </div>

                        {/* 7. ACC + DEC */}
                        <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 hover:border-sky-200 hover:bg-sky-50/10 transition-all flex flex-col items-center text-center justify-between min-h-[170px]">
                           <div className="w-12 h-12 rounded-full flex items-center justify-center bg-sky-100/60 text-sky-600 ring-4 ring-sky-500/10 mb-3 shadow-inner">
                              <i className="fa-solid fa-arrows-left-right text-base"></i>
                           </div>
                           <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-2">MÁX. ACC + DEC</span>
                           <div>
                              <span className="text-xl font-black text-slate-900 tracking-tight italic font-mono">
                                 {safeMax(gpsStats.map(g => Number(g.acc_decc_ai_n) || 0))}
                              </span>
                              <span className="text-[9px] font-bold text-slate-400 ml-1">acc/dec</span>
                           </div>
                        </div>
                     </div>
                 ) : (
                     <p className="text-center text-[10px] text-slate-400 uppercase font-black py-10">Sin datos GPS registrados</p>
                 )}
              </div>

              {/* Lists Section */}
              <div className="grid grid-cols-1 gap-8">
                 {/* Citaciones List */}
                 <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Historial de Citaciones</h3>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                       {citations.map((cit, i) => (
                         <div key={i} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:border-blue-200 transition-all flex items-center justify-between">
                            <div>
                               <p className="text-[10px] font-black uppercase text-slate-900">
                                 {cit.microcycles?.micro_number ? `MICROCICLO ${cit.microcycles.micro_number}` : 'MICROCICLO'} - <span className="text-red-600">{cit.microcycles?.category_id ? REVERSE_CATEGORY_ID_MAP[cit.microcycles.category_id]?.replace('sub_', 'SUB ') : 'S/D'}</span>
                               </p>
                               <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{cit.microcycles?.city || 'S/D'} • {cit.microcycles?.type || 'CIT'}</p>
                            </div>
                            <div className="text-right">
                               <p className="text-[9px] font-black text-slate-900 italic leading-none">{cit.fecha_citacion}</p>
                               <p className="text-[7px] font-bold text-red-500 uppercase mt-1 tracking-tighter">CONVOCADO</p>
                            </div>
                         </div>
                       ))}
                       {citations.length === 0 && <p className="text-center text-[10px] text-slate-400 uppercase font-black py-10">Sin citaciones registradas</p>}
                    </div>
                 </div>

                  {/* Historial de Competencia y Participación Real */}
                  <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
                     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                        <div>
                           <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3">
                              <span className="w-2 h-6 bg-red-600 rounded-full"></span>
                              Participación en Partidos (Sincronización GPS Calendario)
                           </h3>
                           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                              Cruza del calendario oficial ("matches") con telemetría GPS e informes de carga física ("gps_import")
                           </p>
                        </div>
                        <div className="flex gap-2 text-[9px] font-black uppercase text-slate-500 bg-slate-50 border border-slate-100 p-2 rounded-2xl shrink-0">
                           <div>Partidos Disputados: <span className="text-red-500 font-mono font-black">{matchedParticipation.length}</span></div>
                        </div>
                     </div>

                     <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {matchedParticipation.map(({ match, participated, gpsRecord, internalMatchRecord }) => {
                           const catName = match.category_id 
                             ? REVERSE_CATEGORY_ID_MAP[match.category_id]?.replace('sub_', 'SUB ').toUpperCase() 
                             : 'S/D';
                           
                           return (
                             <div key={match.id} className="p-6 rounded-3xl border border-slate-100 bg-slate-50 hover:border-red-200 shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-6">
                                {/* Match Details */}
                                <div className="space-y-1.5 flex-1">
                                   <div className="flex flex-wrap items-center gap-2">
                                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[8.5px] font-black uppercase tracking-wider">
                                         {catName}
                                      </span>
                                      <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest leading-none">
                                         {match.competition_type}
                                      </span>
                                      <span className="text-[10px] text-slate-400 font-black font-mono leading-none">
                                         {match.date}
                                      </span>
                                   </div>
                                   <h4 className="text-sm font-black text-slate-900 uppercase">
                                      VS. {match.opponent}
                                   </h4>
                                   {match.location && (
                                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                         📍 {match.location} {match.city ? `• ${match.city}` : ''}
                                      </p>
                                   )}
                                   {match.result && (
                                      <p className="text-[10px] font-black text-slate-600 uppercase">
                                         Resultado: <span className="text-red-600">{match.result}</span>
                                      </p>
                                   )}
                                   {match.observations && (
                                      <p className="text-[9px] text-slate-400 italic">
                                         {match.observations}
                                      </p>
                                   )}
                                </div>

                                {/* Participation Status & GPS Metrics */}
                                <div className="flex flex-col md:items-end justify-between gap-3 min-w-[240px]">
                                   {/* Status Badge */}
                                   <div>
                                      {participated ? (
                                         gpsRecord ? (
                                            <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 w-fit">
                                               <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                               Participó • GPS Activo
                                            </span>
                                         ) : (
                                            <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 w-fit">
                                               <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                               Participó • Carga Física Manual
                                            </span>
                                         )
                                      ) : (
                                         <span className="bg-slate-100 text-slate-400 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 w-fit">
                                            <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                                            No Participó
                                         </span>
                                      )}
                                   </div>

                                   {/* GPS Metrics if Participated with GPS */}
                                   {participated && gpsRecord && (
                                      <div className="grid grid-cols-4 gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm w-full divide-x divide-slate-100 text-center">
                                         <div className="px-1.5">
                                            <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">MINUTOS</p>
                                            <p className="text-xs font-black text-slate-900 font-mono">{Number(gpsRecord.minutos || gpsRecord.duration_mins || 0).toFixed(0)}'</p>
                                         </div>
                                         <div className="px-1.5">
                                            <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">DIST. (M)</p>
                                            <p className="text-xs font-black text-slate-900 font-mono">{(Number(gpsRecord.dist_total_m) || 0).toLocaleString('es-cl', { maximumFractionDigits: 0 })}m</p>
                                         </div>
                                         <div className="px-1.5">
                                            <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">HSR (M)</p>
                                            <p className="text-xs font-black text-slate-900 font-mono">{(Number(gpsRecord.dist_mai_m_20_kmh) || 0).toFixed(0)}m</p>
                                         </div>
                                         <div className="px-1.5">
                                            <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">VEL. MÁX</p>
                                            <p className="text-xs font-black text-red-600 font-mono">{(Number(gpsRecord.vel_max_kmh) || Number(gpsRecord.velocidad_max) || 0).toFixed(1)} <span className="text-[6.5px] font-bold text-slate-400">km/h</span></p>
                                         </div>
                                      </div>
                                   )}

                                   {/* Internal load details if no GPS */}
                                   {participated && !gpsRecord && internalMatchRecord && (
                                      <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm w-full text-left">
                                         <p className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest leading-none">RPE (Esfuerzo Percibido)</p>
                                         <p className="text-xs font-black text-slate-800 mt-1">Escala: <span className="text-red-500 font-mono">{internalMatchRecord.rpe_esfuerzo || 'S/D'}</span> / 10</p>
                                      </div>
                                   )}
                                </div>
                             </div>
                           );
                        })}

                        {matchedParticipation.length === 0 && (
                           <div className="text-center py-12 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                              <i className="fa-solid fa-circle-info text-slate-300 text-2xl mb-2"></i>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No hay partidos registrados para esta categoría aún</p>
                              <p className="text-[8px] text-slate-400 mt-1">Crea partidos de competencia desde el área técnica.</p>
                           </div>
                        )}
                     </div>
                  </div>

                 {/* GPS Detailed List */}
                 <div className="hidden bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
                     <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">MÁXIMOS HISTÓRICOS GPS</h3>
                     {gpsStats.length > 0 ? (
                         <div className="grid grid-cols-2 gap-4">
                            {/* 1. DISTANCE */}
                            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/10 transition-all flex flex-col justify-between">
                               <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-2">MÁX. DISTANCIA</span>
                               <div>
                                  <span className="text-2xl font-black text-slate-900 tracking-tight italic font-mono">
                                     {safeMax(gpsStats.map(g => Number(g.dist_total_m) || 0)).toLocaleString('es-cl', { maximumFractionDigits: 0 })}
                                  </span>
                                  <span className="text-[9px] font-bold text-slate-400 ml-1">m</span>
                                </div>
                            </div>

                            {/* 2. VELOCIDAD */}
                            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 hover:border-rose-200 hover:bg-rose-50/10 transition-all flex flex-col justify-between">
                               <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-2">MÁX. VELOCIDAD</span>
                               <div>
                                  <span className="text-2xl font-black text-slate-900 tracking-tight italic font-mono">
                                     {safeMax(gpsStats.map(g => Number(g.vel_max_kmh) || Number(g.velocidad_max) || 0)).toFixed(1)}
                                  </span>
                                  <span className="text-[9px] font-bold text-slate-400 ml-1">km/h</span>
                               </div>
                            </div>

                            {/* 3. METROS POR MINUTO */}
                            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/10 transition-all flex flex-col justify-between">
                               <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-2">MÁX. METROS / MIN</span>
                               <div>
                                  <span className="text-2xl font-black text-slate-900 tracking-tight italic font-mono">
                                     {safeMax(gpsStats.map(g => Number(g.m_por_min) || (Number(g.minutos) > 0 ? (Number(g.dist_total_m) / Number(g.minutos)) : 0))).toFixed(1)}
                                  </span>
                                  <span className="text-[9px] font-bold text-slate-400 ml-1">m/min</span>
                               </div>
                            </div>

                            {/* 4. HSR */}
                            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 hover:border-amber-200 hover:bg-amber-50/10 transition-all flex flex-col justify-between">
                               <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-2">MÁX. HSR ({">"}20 km/h)</span>
                               <div>
                                  <span className="text-2xl font-black text-slate-900 tracking-tight italic font-mono">
                                     {safeMax(gpsStats.map(g => Number(g.dist_mai_m_20_kmh) || 0)).toLocaleString('es-cl', { maximumFractionDigits: 0 })}
                                  </span>
                                  <span className="text-[9px] font-bold text-slate-400 ml-1">m</span>
                               </div>
                            </div>

                            {/* 5. SPRINT DISTANCE */}
                            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 hover:border-violet-200 hover:bg-violet-50/10 transition-all flex flex-col justify-between">
                               <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-2">MÁX. DIST. SPRINT ({">"}25 km/h)</span>
                               <div>
                                  <span className="text-2xl font-black text-slate-900 tracking-tight italic font-mono">
                                     {safeMax(gpsStats.map(g => Number(g.dist_sprint_m_25_kmh) || 0)).toLocaleString('es-cl', { maximumFractionDigits: 0 })}
                                  </span>
                                  <span className="text-[9px] font-bold text-slate-400 ml-1">m</span>
                               </div>
                            </div>

                            {/* 6. SPRINTS COUNT */}
                            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 hover:border-fuchsia-200 hover:bg-fuchsia-50/10 transition-all flex flex-col justify-between">
                               <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-2">MÁX. CANT. SPRINTS</span>
                               <div>
                                  <span className="text-2xl font-black text-slate-900 tracking-tight italic font-mono">
                                     {safeMax(gpsStats.map(g => Number(g.sprints_n) || 0))}
                                  </span>
                                  <span className="text-[9px] font-bold text-slate-400 ml-1">sprints</span>
                               </div>
                            </div>

                            {/* 7. ACC + DEC */}
                            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 hover:border-sky-200 hover:bg-sky-50/10 transition-all flex flex-col justify-between col-span-2">
                               <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-2">MÁX. ACC + DEC</span>
                               <div>
                                  <span className="text-2xl font-black text-slate-900 tracking-tight italic font-mono">
                                     {safeMax(gpsStats.map(g => Number(g.acc_decc_ai_n) || 0))}
                                  </span>
                                  <span className="text-[9px] font-bold text-slate-400 ml-1">acc/dec</span>
                               </div>
                            </div>
                         </div>
                      ) : (
                         <p className="text-center text-[10px] text-slate-400 uppercase font-black py-10">Sin datos GPS registrados</p>
                      )}
                 </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Helper Components ---

const BioItem = ({ label, value }: { label: string, value: any }) => (
  <div className="flex justify-between items-center py-2 border-b border-white/5">
    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
    <span className="text-xs font-bold">{value}</span>
  </div>
);

const StatCard = ({ label, value, icon, color, extra }: { label: string, value: any, icon: string, color: 'blue' | 'emerald' | 'red' | 'slate', extra?: React.ReactNode }) => {
  const colors = {
    blue: 'bg-blue-600 text-white border-blue-400 shadow-blue-500/20',
    emerald: 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-500/20',
    red: 'bg-red-600 text-white border-red-400 shadow-red-500/20',
    slate: 'bg-[#1e293b] text-white border-slate-700 shadow-slate-900/20'
  };
  return (
    <div className={`${colors[color]} p-4 rounded-[32px] border shadow-lg flex flex-col justify-between h-36 transition-transform hover:scale-[1.02] duration-300`}>
      <div className="flex justify-between items-start">
        <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
          <i className={`fa-solid ${icon} text-sm`}></i>
        </div>
      </div>
      <div>
        <p className="text-[8px] font-black uppercase tracking-[0.1em] opacity-80 mb-1">{label}</p>
        <p className="text-2xl font-black italic leading-none truncate">{value}</p>
        {extra}
      </div>
    </div>
  );
};

const LastEvalItem = ({ label, date, value }: { label: string, date?: string, value: string }) => (
  <div className="space-y-1">
    <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">{label}</p>
    <p className="text-sm font-black text-white italic">{value}</p>
    <p className="text-[7px] font-bold text-red-500 uppercase tracking-tighter">{date || 'SIN FECHA'}</p>
  </div>
);

export default PlayerProfileArea;
