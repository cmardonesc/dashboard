
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { normalizeClub, getDriveDirectLink } from '../lib/utils';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, Legend, RadarChart, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, Radar, Cell 
} from 'recharts';
import ClubBadge from './ClubBadge';
import { UserRole, REVERSE_CATEGORY_ID_MAP, CATEGORY_COLORS, MatchDB, CATEGORY_ID_MAP, Category } from '../types';
import { FALLBACK_CLUB_NAMES, FEDERATION_LOGO, CLUB_LOGOS } from '../constants';
import { AthleteHuella } from './SportsScienceArea';
import { AvatarJugador } from './AvatarJugador';
import { getFotoUrl } from '../lib/fotos';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PlayerProfileAreaProps {
  userRole?: string;
  userClub?: string;
  userClubId?: number | null;
  clubs?: any[];
  initialPlayerId?: number | null;
  players?: any[];
  initialTab?: string;
}

const PlayerProfileArea: React.FC<PlayerProfileAreaProps> = ({ userRole, userClub, userClubId, clubs = [], initialPlayerId, players: initialPlayers, initialTab }) => {
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
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(initialTab || 'evolucion'); 
  const [gpsChartMetric, setGpsChartMetric] = useState<'dist_total_m' | 'dist_mai_m_20_kmh' | 'm_por_min' | 'acc_decc_ai_n' | 'sprints_n' | 'dist_sprint_m_25_kmh'>('dist_total_m');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

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
  const [filterYear, setFilterYear] = useState<string[]>([]);
  const [filterPosition, setFilterPosition] = useState<string[]>([]);
  const [filterClubId, setFilterClubId] = useState<string[]>([]);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showPositionDropdown, setShowPositionDropdown] = useState(false);
  const [showClubDropdown, setShowClubDropdown] = useState(false);
  
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

  const [cmjRebound, setCmjRebound] = useState<any[]>([]);
  const [test505, setTest505] = useState<any[]>([]);

  // Global physical references
  const [globalDataLoaded, setGlobalDataLoaded] = useState(false);
  const [globalImtp, setGlobalImtp] = useState<any[]>([]);
  const [globalSpeed, setGlobalSpeed] = useState<any[]>([]);
  const [globalAntro, setGlobalAntro] = useState<any[]>([]);
  const [globalVo2, setGlobalVo2] = useState<any[]>([]);
  const [globalCmjRebound, setGlobalCmjRebound] = useState<any[]>([]);
  const [globalTest505, setGlobalTest505] = useState<any[]>([]);

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
      let query = supabase.from('players').select('player_id, nombre, apellido1, apellido2, id_club, posicion, anio, foto_path, foto_updated_at, clubes!fk_players_clubes(nombre)');
      if (userRole === 'club') {
        if (userClubId) {
          query = query.eq('id_club', userClubId);
        } else if (userClub) {
          query = query.eq('clubes.nombre', userClub);
        }
      }
      const { data } = await query.order('apellido1', { ascending: true });
      if (data) {
        const mappedData = data.map((p: any) => {
          if (p.player_id === 355) {
            return { ...p, id_club: 89 };
          }
          return p;
        });
        setPlayers(mappedData);
      }
    } catch (err) {
      console.error("Error fetching players:", err);
    }
  };

  const fetchFullProfile = async (playerId: number) => {
    setLoading(true);
    try {
      // 1. Basic Player Info
      const { data: pData } = await supabase
        .from('players')
        .select('player_id, nombre, apellido1, apellido2, anio, id_club, posicion, fecha_nacimiento, foto_path, foto_updated_at, clubes!fk_players_clubes(nombre)')
        .eq('player_id', playerId)
        .single();
      if (pData) {
        const clubName = pData.clubes && !Array.isArray(pData.clubes) ? (pData.clubes as any).nombre : null;
        const pDataWithClub = { ...pData, club: clubName } as any;
        if (pData.player_id === 355) {
          pDataWithClub.id_club = 89;
          pDataWithClub.club = 'Everton';
        }
        
        if (userRole === 'club') {
          const targetClubId = userClubId;
          const targetClubNameNorm = userClub ? normalizeClub(userClub) : '';
          const playerClubId = pDataWithClub.id_club;
          const playerClubNameNorm = pDataWithClub.club ? normalizeClub(pDataWithClub.club) : '';
          
          let isOwn = false;
          if (targetClubId && playerClubId && Number(playerClubId) === Number(targetClubId)) {
            isOwn = true;
          } else if (targetClubNameNorm && playerClubNameNorm && playerClubNameNorm === targetClubNameNorm) {
            isOwn = true;
          }
          
          if (!isOwn) {
            pDataWithClub.nombre = 'Jugador';
            pDataWithClub.apellido1 = `[${pDataWithClub.player_id || 'EXT'}]`;
            pDataWithClub.apellido2 = '';
            pDataWithClub.club = 'OTRO CLUB';
          }
        }
        setProfileData(pDataWithClub);
      } else {
        setProfileData(null);
      }

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
      const [anthro, vo2, imtpRes, cmjRes, speed, cmjReboundRes, test505Res] = await Promise.all([
        supabase.from('antropometria').select('*').eq('player_id', playerId).order('fecha_medicion', { ascending: true }),
        supabase.from('vo2max_tests').select('*').eq('player_id', playerId).order('fecha', { ascending: true }),
        supabase.from('evaluaciones_imtp').select('*').eq('player_id', playerId).order('fecha_test', { ascending: true }),
        supabase.from('evaluaciones_cmj').select('*').eq('player_id', playerId).order('fecha_test', { ascending: true }),
        supabase.from('velocidad_tests').select('*').eq('player_id', playerId).order('fecha', { ascending: true }),
        supabase.from('evaluaciones_cmj_rebound').select('*').eq('player_id', playerId).order('fecha_test', { ascending: true }),
        supabase.from('test_505').select('*').eq('player_id', playerId).order('fecha', { ascending: true })
      ]);

      // Combine IMTP and CMJ data by date
      const mergedMap = new Map<string, any>();
      const processedImtpData = (imtpRes.data || []).map((item: any) => {
        const newItem = { ...item };
        
        // Force Abs fallbacks
        const fAbs = item['Peak Vertical Force [N]'] ?? item['Peak Vertical Force (N)'] ?? item.imtp_fuerza_n;
        if (fAbs !== undefined && fAbs !== null) {
          newItem.imtp_fuerza_n = Number(fAbs);
          newItem['Peak Vertical Force [N]'] = Number(fAbs);
        }

        // Force Rel fallbacks
        const fRel = item['Peak Vertical Force / BM'] ?? item['Peak Vertical Force / BM [N/kg]'] ?? item.imtp_f_relativa_n_kg;
        if (fRel !== undefined && fRel !== null) {
          newItem.imtp_f_relativa_n_kg = Number(fRel);
          newItem['Peak Vertical Force / BM [N/kg]'] = Number(fRel);
        }

        // Force Net 50ms fallbacks
        const fNet50 = item['Force (Net of BW) at 50ms [N]'] ?? item['Force (Net of BW) at 50ms'] ?? item.imtp_force_50ms;
        if (fNet50 !== undefined && fNet50 !== null) {
          newItem.imtp_force_50ms = Number(fNet50);
          newItem['Force (Net of BW) at 50ms [N]'] = Number(fNet50);
        }

        // RFD 100ms fallbacks
        const rfd100 = item['RFD - 100ms [N/s]'] ?? item['RFD - 100ms'] ?? item.imtp_rfd_100ms;
        if (rfd100 !== undefined && rfd100 !== null) {
          newItem.imtp_rfd_100ms = Number(rfd100);
          newItem['RFD - 100ms [N/s]'] = Number(rfd100);
        }

        return newItem;
      });
      processedImtpData.forEach((item: any) => {
        const cleanDate = (item.fecha_test || item.fecha || '').split('T')[0];
        mergedMap.set(cleanDate, { ...item });
      });
      (cmjRes.data || []).forEach((item: any) => {
        const cleanDate = (item.fecha_test || item.fecha || '').split('T')[0];
        const existing = mergedMap.get(cleanDate);
        if (existing) {
          mergedMap.set(cleanDate, { ...existing, ...item });
        } else {
          mergedMap.set(cleanDate, { ...item });
        }
      });
      const combinedImtp = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(a.fecha_test || a.fecha).getTime() - new Date(b.fecha_test || b.fecha).getTime()
      );

      setPhysicalData({
        anthro: anthro.data || [],
        vo2: vo2.data || [],
        imtp: combinedImtp,
        speed: speed.data || []
      });

      setCmjRebound(cmjReboundRes.data || []);
      setTest505(test505Res.data || []);

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

        const mappedReports = (repRes.data || []).map((r: any) => {
          let obs = r.observation || '';
          let sev = r.severity;
          if (obs.includes('[[SICK_CASE]]')) {
            sev = 'sick';
            obs = obs.replace('[[SICK_CASE]]', '').trim();
          }
          if (obs.includes('\n\n[[ADDED_BY]]: ')) {
            obs = obs.split('\n\n[[ADDED_BY]]: ')[0];
          }
          return {
            ...r,
            observation: obs,
            severity: sev
          };
        });

        setMedicalHistory({
          reports: mappedReports,
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

  const handleDownloadPDF = async () => {
    if (!profileData) return;
    setGeneratingPdf(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const primaryColor: [number, number, number] = [11, 45, 106]; // #0b2d6a (Deep Blue Theme)
      const accentColor: [number, number, number] = [207, 27, 43]; // #CF1B2B
      const textColor: [number, number, number] = [51, 65, 85]; // slate-700
      const margin = 14;
      const pageWidth = 210;
      const pageHeight = 297;
      const contentWidth = pageWidth - (margin * 2);

      const getBase64ImageFromUrl = async (url: string): Promise<string | null> => {
        try {
          const res = await fetch(url);
          if (!res.ok) return null;
          const blob = await res.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          console.error("Error converting image to base64:", e);
          return null;
        }
      };

      // Helper to get image natural dimensions for perfect aspect ratio calculations
      const getImageDimensions = (base64: string): Promise<{ width: number; height: number }> => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
          img.onerror = () => resolve({ width: 0, height: 0 });
          img.src = base64;
        });
      };

      const formatDateSpanish = (dateStr: string) => {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateStr;
      };

      // Fetch player category ID to filter microcycles
      const playerCategoryId = CATEGORY_ID_MAP[inferredCategory as Category] || null;

      // Fetch all microcycles for this player's category (or all if none inferred) for clean mapping
      let microQuery = supabase
        .from('microcycles')
        .select('id, micro_number, type, start_date, end_date, category_id');

      if (playerCategoryId) {
        microQuery = microQuery.eq('category_id', playerCategoryId);
      }

      const { data: allMicros } = await microQuery.order('micro_number', { ascending: true });

      const getMicrocycleInfoForDate = (dateStr: string) => {
        if (!dateStr || !allMicros) return null;
        return allMicros.find(m => {
          if (!m.start_date || !m.end_date) return false;
          return dateStr >= m.start_date && dateStr <= m.end_date;
        }) || null;
      };

      // Fetch images asynchronously
      const federationLogoUrl = getDriveDirectLink(FEDERATION_LOGO);
      const base64FederationLogo = federationLogoUrl ? await getBase64ImageFromUrl(federationLogoUrl) : null;

      let base64PlayerPhoto: string | null = null;
      if (profileData.foto_path) {
        try {
          const fullPhotoUrl = await getFotoUrl(profileData.foto_path, profileData.foto_updated_at);
          if (fullPhotoUrl) {
            base64PlayerPhoto = await getBase64ImageFromUrl(fullPhotoUrl);
          }
        } catch (e) {
          console.error("Error getting player photo:", e);
        }
      }

      let base64ClubLogo: string | null = null;
      if (profileData.club) {
        try {
          const normName = normalizeClub(profileData.club);
          let clubLogoUrl: string | null = null;
          const clubByName = clubs.find((c: any) => normalizeClub(c.nombre || c.club_name) === normName);
          if (clubByName?.logo_url) {
            clubLogoUrl = getDriveDirectLink(clubByName.logo_url);
          } else {
            const staticLogo = CLUB_LOGOS[normName];
            if (staticLogo) {
              clubLogoUrl = getDriveDirectLink(staticLogo);
            }
          }
          if (clubLogoUrl) {
            base64ClubLogo = await getBase64ImageFromUrl(clubLogoUrl);
          }
        } catch (e) {
          console.error("Error getting club logo:", e);
        }
      }

      let yPos = 32;

      // ==========================================
      // SECTION 1: DATOS DEL JUGADOR
      // ==========================================
      
      // Biography card container
      doc.setFillColor(248, 250, 252); // slate-50
      doc.roundedRect(margin, yPos, contentWidth, 48, 4, 4, 'F');
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.4);
      doc.roundedRect(margin, yPos, contentWidth, 48, 4, 4, 'S');

      // Left bar in Chile red for branding
      doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.rect(margin, yPos, 3.5, 48, 'F');

      // 1.1 Player photo placement with perfect aspect ratio centering
      const drawPhotoPlaceholder = () => {
        doc.setFillColor(241, 245, 249); // slate-100
        doc.rect(22, 38, 26, 36, 'F');
        doc.setDrawColor(203, 213, 225); // slate-300
        doc.setLineWidth(0.3);
        doc.rect(22, 38, 26, 36, 'S');
        
        // Initials as fallback
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(100, 116, 139);
        const initials = `${profileData.nombre?.[0] || ''}${profileData.apellido1?.[0] || ''}`.toUpperCase();
        doc.text(initials, 35, 58, { align: 'center' });
      };

      if (base64PlayerPhoto) {
        try {
          const imgSize = await getImageDimensions(base64PlayerPhoto);
          if (imgSize.width > 0 && imgSize.height > 0) {
            const containerW = 26;
            const containerH = 36;
            const imgAspect = imgSize.width / imgSize.height;
            const containerAspect = containerW / containerH;

            let drawW = containerW;
            let drawH = containerH;
            let drawX = 22;
            let drawY = 38;

            if (imgAspect > containerAspect) {
              drawW = containerW;
              drawH = containerW / imgAspect;
              drawY = 38 + (containerH - drawH) / 2;
            } else {
              drawH = containerH;
              drawW = containerH * imgAspect;
              drawX = 22 + (containerW - drawW) / 2;
            }

            doc.setFillColor(241, 245, 249);
            doc.rect(22, 38, 26, 36, 'F');
            doc.addImage(base64PlayerPhoto, 'JPEG', drawX, drawY, drawW, drawH);
            doc.setDrawColor(203, 213, 225);
            doc.setLineWidth(0.3);
            doc.rect(22, 38, 26, 36, 'S');
          } else {
            drawPhotoPlaceholder();
          }
        } catch (err) {
          console.error("Failed to add player photo to PDF:", err);
          drawPhotoPlaceholder();
        }
      } else {
        drawPhotoPlaceholder();
      }

      // 1.2 Text details
      const fullname = `${profileData.nombre} ${profileData.apellido1} ${profileData.apellido2 || ''}`.toUpperCase();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(fullname, 52, 41);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
      const positionAndCategory = `${profileData.posicion ? profileData.posicion.toUpperCase() : 'SIN POSICIÓN'} · CATEGORÍA ${(inferredCategory || 'S/D').toUpperCase().replace('_', ' ')}`;
      doc.text(positionAndCategory, 52, 46);

      // Divider line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(52, 49, margin + contentWidth - 6, 49);

      // Metadata details grid
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('CLUB DE ORIGEN:', 52, 55);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 65, 85);
      let clubNameX = 82;
      if (base64ClubLogo) {
        try {
          const logoSize = await getImageDimensions(base64ClubLogo);
          let drawW = 5;
          let drawH = 5;
          let drawX = 82;
          let drawY = 51.5;

          if (logoSize.width > 0 && logoSize.height > 0) {
            const aspect = logoSize.width / logoSize.height;
            if (aspect > 1) {
              drawW = 5;
              drawH = 5 / aspect;
              drawY = 51.5 + (5 - drawH) / 2;
            } else {
              drawH = 5;
              drawW = 5 * aspect;
              drawX = 82 + (5 - drawW) / 2;
            }
          }
          doc.addImage(base64ClubLogo, 'PNG', drawX, drawY, drawW, drawH);
          clubNameX = 82 + drawW + 2;
        } catch (e) {
          console.error("Failed to add club logo image to PDF:", e);
        }
      }
      doc.text(profileData.club || 'S/D', clubNameX, 55);

      // Row 2: Birth year / Birthday
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('CLASE / NACIMIENTO:', 52, 61);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 65, 85);
      doc.text(String(profileData.anio || 'N/A'), 82, 61);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('F. NACIMIENTO:', 116, 61);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 65, 85);
      doc.text(profileData.fecha_nacimiento || 'S/D', 142, 61);

      // Row 3: ID / Profile Leg
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('ID ÚNICO ATLETA:', 52, 67);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 65, 85);
      doc.text(String(profileData.player_id), 82, 67);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('PIERNA HÁBIL:', 116, 67);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 65, 85);
      doc.text(profileData.perfil_pierna ? profileData.perfil_pierna.toUpperCase() : 'S/D', 142, 67);

      yPos = 87;

      // ==========================================
      // SECTION 2: CONTROL DE CARGA INTERNO POR MICROCICLO
      // ==========================================
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('CONTROL DE CARGA INTERNA (CHECK-IN / CHECK-OUT) - RESUMEN POR MICROCICLO', margin, yPos);
      
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.6);
      doc.line(margin, yPos + 2, margin + contentWidth, yPos + 2);

      // Group wellness & load metrics by microcycle
      interface MicrocycleGroup {
        microNumber: number | string;
        type: string;
        startDate: string;
        endDate: string;
        checkIns: number[];
        checkOuts: number[];
      }

      const groupsMap = new Map<string, MicrocycleGroup>();

      // Pre-populate with all official microcycles of the player's category so empty ones are still listed
      if (allMicros) {
        allMicros.forEach(mc => {
          const groupKey = `mc_${mc.micro_number}`;
          groupsMap.set(groupKey, {
            microNumber: mc.micro_number,
            type: mc.type || '',
            startDate: mc.start_date || '',
            endDate: mc.end_date || '',
            checkIns: [],
            checkOuts: []
          });
        });
      }

      combinedChartData.forEach(item => {
        const mc = getMicrocycleInfoForDate(item.date);
        const groupKey = mc ? `mc_${mc.micro_number}` : 'no_mc';
        
        let group = groupsMap.get(groupKey);
        if (!group) {
          group = {
            microNumber: mc ? mc.micro_number : 'Otros / Fuera de MC',
            type: mc ? (mc.type || '') : '',
            startDate: mc ? mc.start_date : '',
            endDate: mc ? mc.end_date : '',
            checkIns: [],
            checkOuts: []
          };
          groupsMap.set(groupKey, group);
        }

        if (item.checkIn > 0) {
          group.checkIns.push(item.checkIn);
        }
        if (item.checkOutRPE > 0) {
          group.checkOuts.push(item.checkOutRPE);
        }
      });

      const groupedRows = Array.from(groupsMap.values())
        .map(g => {
          const minCheckIn = g.checkIns.length > 0 ? Math.min(...g.checkIns) : null;
          const maxCheckIn = g.checkIns.length > 0 ? Math.max(...g.checkIns) : null;
          const avgCheckIn = g.checkIns.length > 0 ? g.checkIns.reduce((sum, v) => sum + v, 0) / g.checkIns.length : null;

          const minCheckOut = g.checkOuts.length > 0 ? Math.min(...g.checkOuts) : null;
          const maxCheckOut = g.checkOuts.length > 0 ? Math.max(...g.checkOuts) : null;
          const avgCheckOut = g.checkOuts.length > 0 ? g.checkOuts.reduce((sum, v) => sum + v, 0) / g.checkOuts.length : null;

          return {
            microNumber: g.microNumber,
            type: g.type,
            minCheckIn,
            avgCheckIn,
            maxCheckIn,
            minCheckOut,
            avgCheckOut,
            maxCheckOut,
            sortVal: typeof g.microNumber === 'number' ? g.microNumber : 999999
          };
        })
        .filter(g => g.avgCheckIn !== null || g.avgCheckOut !== null)
        .sort((a, b) => a.sortVal - b.sortVal);

      const tableRows = groupedRows.map(g => {
        const mcLabel = typeof g.microNumber === 'number' 
          ? `MICROCICLO ${g.microNumber} ${g.type ? `(${g.type})` : ''}`.trim()
          : g.microNumber;
        
        // Only display the micro name/label, not the dates, per request
        const displayMC = mcLabel;

        return [
          displayMC,
          g.minCheckIn !== null ? `${g.minCheckIn.toFixed(1)}` : '-',
          g.avgCheckIn !== null ? `${g.avgCheckIn.toFixed(1)}` : '-',
          g.maxCheckIn !== null ? `${g.maxCheckIn.toFixed(1)}` : '-',
          g.minCheckOut !== null ? `${g.minCheckOut.toFixed(1)}` : '-',
          g.avgCheckOut !== null ? `${g.avgCheckOut.toFixed(1)}` : '-',
          g.maxCheckOut !== null ? `${g.maxCheckOut.toFixed(1)}` : '-'
        ];
      });

      autoTable(doc, {
        startY: yPos + 6,
        margin: { left: margin, right: margin, bottom: 18 },
        head: [['MICROCICLO', 'MÍN CHECK-IN\n(1-5)', 'PROM CHECK-IN\n(1-5)', 'MÁX CHECK-IN\n(1-5)', 'MÍN CHECK-OUT\n(1-10)', 'PROM CHECK-OUT\n(1-10)', 'MÁX CHECK-OUT\n(1-10)']],
        body: tableRows.length > 0 ? tableRows : [['-', '-', 'No se registran datos de carga para este atleta', '-', '-', '-', '-']],
        theme: 'striped',
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontSize: 7.0,
          fontStyle: 'bold',
          halign: 'center'
        },
        styles: {
          fontSize: 8,
          cellPadding: 4,
          textColor: [51, 65, 85],
          lineColor: [226, 232, 240],
          valign: 'middle'
        },
        columnStyles: {
          0: { cellWidth: 50, halign: 'left' },
          1: { cellWidth: 22, halign: 'center' },
          2: { cellWidth: 22, halign: 'center' },
          3: { cellWidth: 22, halign: 'center' },
          4: { cellWidth: 22, halign: 'center' },
          5: { cellWidth: 22, halign: 'center' },
          6: { cellWidth: 22, halign: 'center' }
        },
        didParseCell: function(data) {
          if (data.section === 'body') {
            const colIndex = data.column.index;
            if (colIndex >= 1 && colIndex <= 6) {
              const rawVal = data.cell.raw;
              const cellVal = parseFloat(String(rawVal));
              if (!isNaN(cellVal)) {
                let t = 0;
                if (colIndex >= 1 && colIndex <= 3) {
                  // Check-in (scale 1 to 5): 1 is Red, 5 is Green
                  t = Math.max(0, Math.min(1, (5 - cellVal) / 4));
                } else if (colIndex >= 4 && colIndex <= 6) {
                  // Check-out (scale 1 to 10): 1 is Green, 10 is Red
                  t = Math.max(0, Math.min(1, (cellVal - 1) / 9));
                } else {
                  return;
                }
                
                // Color scale interpolation (Light Green -> Light Yellow -> Light Red)
                let r = 255, g = 255, b = 255;
                if (t <= 0.5) {
                  const factor = t / 0.5;
                  r = Math.round(232 + (255 - 232) * factor);
                  g = Math.round(245 + (249 - 245) * factor);
                  b = Math.round(233 + (196 - 233) * factor);
                } else {
                  const factor = (t - 0.5) / 0.5;
                  r = Math.round(255 + (255 - 255) * factor);
                  g = Math.round(249 + (235 - 249) * factor);
                  b = Math.round(196 + (238 - 196) * factor);
                }
                data.cell.styles.fillColor = [r, g, b];
              }
            }
          }
        }
      });

      // ==========================================
      // SECTION 3: VALORES MÁXIMOS DE GPS
      // ==========================================
      const maxDistance = safeMax(gpsStats.map(g => Number(g.dist_total_m) || 0));
      const maxVelocity = safeMax(gpsStats.map(g => Number(g.vel_max_kmh) || Number(g.velocidad_max) || 0));
      const maxRelative = safeMax(gpsStats.map(g => Number(g.m_por_min) || (Number(g.minutos) > 0 ? (Number(g.dist_total_m) / Number(g.minutos)) : 0)));
      const maxHsr = safeMax(gpsStats.map(g => Number(g.dist_mai_m_20_kmh) || 0));
      const maxSprintDist = safeMax(gpsStats.map(g => Number(g.dist_sprint_m_25_kmh) || 0));
      const maxSprints = safeMax(gpsStats.map(g => Number(g.sprints_n) || 0));
      const maxAccDec = safeMax(gpsStats.map(g => Number(g.acc_decc_ai_n) || 0));

      let gpsYPos = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 12 : yPos + 100;
      const boxesHeight = gpsStats.length > 0 ? 44 : 20;

      // Page budget check: if it goes beyond page height minus margins, push to next page
      if (gpsYPos + boxesHeight + 10 > pageHeight - 16) {
        doc.addPage();
        gpsYPos = 32; // Reset Y position for page 2 (below the top brand banner header)
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('VALORES MÁXIMOS DE GPS (CARGA EXTERNA HISTÓRICA)', margin, gpsYPos);
      
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.6);
      doc.line(margin, gpsYPos + 2, margin + contentWidth, gpsYPos + 2);

      if (gpsStats.length > 0) {
        // Render 7 metrics in beautiful vector boxes
        const gpsCards = [
          {
            label: 'DISTANCIA TOTAL',
            value: maxDistance > 0 ? maxDistance.toLocaleString('es-cl', { maximumFractionDigits: 0 }) : '-',
            unit: 'm',
            accentColor: [16, 185, 129] // Emerald
          },
          {
            label: 'VELOCIDAD MÁXIMA',
            value: maxVelocity > 0 ? maxVelocity.toFixed(1) : '-',
            unit: 'km/h',
            accentColor: [244, 63, 94] // Rose
          },
          {
            label: 'DISTANCIA RELATIVA',
            value: maxRelative > 0 ? maxRelative.toFixed(1) : '-',
            unit: 'm/min',
            accentColor: [59, 130, 246] // Blue
          },
          {
            label: 'HSR (>20 KM/H)',
            value: maxHsr > 0 ? maxHsr.toLocaleString('es-cl', { maximumFractionDigits: 0 }) : '-',
            unit: 'm',
            accentColor: [245, 158, 11] // Amber
          },
          {
            label: 'DIST. SPRINT (>25)',
            value: maxSprintDist > 0 ? maxSprintDist.toLocaleString('es-cl', { maximumFractionDigits: 0 }) : '-',
            unit: 'm',
            accentColor: [139, 92, 246] // Violet
          },
          {
            label: 'SPRINTS',
            value: maxSprints > 0 ? String(maxSprints) : '-',
            unit: 'n',
            accentColor: [217, 70, 239] // Fuchsia
          },
          {
            label: 'ACC / DEC (A/D)',
            value: maxAccDec > 0 ? String(maxAccDec) : '-',
            unit: 'n',
            accentColor: [14, 165, 233] // Sky
          }
        ];

        const boxW = 42.5;
        const boxH = 18;
        const gap = 4;
        const row1Y = gpsYPos + 6;
        const row2Y = gpsYPos + 6 + boxH + gap;

        // Row 1: 4 cards
        for (let i = 0; i < 4; i++) {
          const card = gpsCards[i];
          const x = margin + i * (boxW + gap);
          
          doc.setFillColor(248, 250, 252);
          doc.roundedRect(x, row1Y, boxW, boxH, 2, 2, 'F');
          
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.35);
          doc.roundedRect(x, row1Y, boxW, boxH, 2, 2, 'S');
          
          doc.setFillColor(card.accentColor[0], card.accentColor[1], card.accentColor[2]);
          doc.rect(x, row1Y + 1.5, 2.5, boxH - 3, 'F');
          
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.0);
          doc.setTextColor(100, 116, 139);
          doc.text(card.label, x + 5, row1Y + 5.5);
          
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10.5);
          doc.setTextColor(15, 23, 42);
          doc.text(card.value, x + 5, row1Y + 12.5);
          
          const valW = doc.getTextWidth(card.value);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.0);
          doc.setTextColor(148, 163, 184);
          doc.text(card.unit, x + 5 + valW + 1.5, row1Y + 12.5);
        }

        // Row 2: 3 cards centered
        const groupWidth = 3 * boxW + 2 * gap;
        const startRow2X = margin + (contentWidth - groupWidth) / 2;
        
        for (let i = 0; i < 3; i++) {
          const card = gpsCards[4 + i];
          const x = startRow2X + i * (boxW + gap);
          
          doc.setFillColor(248, 250, 252);
          doc.roundedRect(x, row2Y, boxW, boxH, 2, 2, 'F');
          
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.35);
          doc.roundedRect(x, row2Y, boxW, boxH, 2, 2, 'S');
          
          doc.setFillColor(card.accentColor[0], card.accentColor[1], card.accentColor[2]);
          doc.rect(x, row2Y + 1.5, 2.5, boxH - 3, 'F');
          
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.0);
          doc.setTextColor(100, 116, 139);
          doc.text(card.label, x + 5, row2Y + 5.5);
          
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10.5);
          doc.setTextColor(15, 23, 42);
          doc.text(card.value, x + 5, row2Y + 12.5);
          
          const valW = doc.getTextWidth(card.value);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.0);
          doc.setTextColor(148, 163, 184);
          doc.text(card.unit, x + 5 + valW + 1.5, row2Y + 12.5);
        }
        
        (doc as any).lastAutoTable = { finalY: row2Y + boxH };
      } else {
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(margin, gpsYPos + 6, contentWidth, 16, 2, 2, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.35);
        doc.roundedRect(margin, gpsYPos + 6, contentWidth, 16, 2, 2, 'S');
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text('No se registran datos de GPS para este atleta', margin + contentWidth / 2, gpsYPos + 15, { align: 'center' });
        
        (doc as any).lastAutoTable = { finalY: gpsYPos + 22 };
      }

      // ==========================================
      // SECTION 4: PARTIDOS INTERNACIONALES (GPS)
      // ==========================================
      const internationalGpsMatches = categoryMatches
        .map(match => {
          const gpsRecord = gpsStats.find(g => g.fecha === match.date);
          const compType = (match.competition_type || '').toLowerCase();
          const isInternational = compType.includes('internacional') || compType.includes('mundial') || compType.includes('sudamericano');
          
          const isCitedForThisMicrocycle = match.microcycle_id 
            ? (citations || []).some((cit: any) => cit.microcycles?.id === match.microcycle_id)
            : false;

          const isCitedForThisCategoryOnDate = (citations || []).some((cit: any) => {
            const mc = cit.microcycles;
            if (!mc) return false;
            if (Number(mc.category_id) !== Number(match.category_id)) return false;
            if (mc.start_date && mc.end_date) {
              return match.date >= mc.start_date && match.date <= mc.end_date;
            }
            return cit.fecha_citacion === match.date;
          });

          const belongsToThisCategory = isCitedForThisMicrocycle || isCitedForThisCategoryOnDate;

          return {
            match,
            gpsRecord,
            isInternational,
            belongsToThisCategory
          };
        })
        .filter(item => item.isInternational && item.gpsRecord && item.belongsToThisCategory)
        .sort((a, b) => a.match.date.localeCompare(b.match.date));

      let intMatchesYPos = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 12 : yPos + 150;
      const tableHeightEstimate = 10 + (internationalGpsMatches.length > 0 ? (internationalGpsMatches.length * 10) + 12 : 20);

      if (intMatchesYPos + tableHeightEstimate > pageHeight - 16) {
        doc.addPage();
        intMatchesYPos = 32; // Reset Y position for new page (below top header banner)
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('PARTIDOS INTERNACIONALES', margin, intMatchesYPos);
      
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.6);
      doc.line(margin, intMatchesYPos + 2, margin + contentWidth, intMatchesYPos + 2);

      const intTableRows = internationalGpsMatches.map(item => {
        const rival = `VS. ${item.match.opponent || 'S/D'}`;
        const fecha = formatDateSpanish(item.match.date);
        const comp = item.match.competition_type || 'S/D';
        const mins = item.gpsRecord ? `${Number(item.gpsRecord.minutos || item.gpsRecord.duration_mins || 0).toFixed(0)}'` : '-';
        const dist = item.gpsRecord ? `${(Number(item.gpsRecord.dist_total_m) || 0).toLocaleString('es-cl', { maximumFractionDigits: 0 })} m` : '-';
        const velMax = item.gpsRecord ? `${(Number(item.gpsRecord.vel_max_kmh) || Number(item.gpsRecord.velocidad_max) || 0).toFixed(1)} km/h` : '-';
        const hsr = item.gpsRecord ? `${(Number(item.gpsRecord.dist_mai_m_20_kmh) || 0).toLocaleString('es-cl', { maximumFractionDigits: 0 })} m` : '-';
        const sprint = item.gpsRecord ? `${(Number(item.gpsRecord.dist_sprint_m_25_kmh) || 0).toLocaleString('es-cl', { maximumFractionDigits: 0 })} m` : '-';
        const sprintsN = item.gpsRecord ? `${Number(item.gpsRecord.sprints_n || 0).toFixed(0)}` : '-';
        const rel = item.gpsRecord ? `${(Number(item.gpsRecord.m_por_min) || (Number(item.gpsRecord.minutos) > 0 ? (Number(item.gpsRecord.dist_total_m) / Number(item.gpsRecord.minutos)) : 0)).toFixed(1)}` : '-';
        
        return [
          rival,
          fecha,
          comp,
          mins,
          dist,
          velMax,
          rel,
          hsr,
          sprint,
          sprintsN
        ];
      });

      autoTable(doc, {
        startY: intMatchesYPos + 6,
        margin: { left: margin, right: margin, bottom: 18 },
        head: [['PARTIDO / RIVAL', 'FECHA', 'COMPETICIÓN', 'MIN', 'DISTANCIA', 'VEL MÁX', 'M/MIN', 'HSR (>20)', 'SPRINT (>25)', 'SPRINTS']],
        body: intTableRows.length > 0 ? intTableRows : [['-', '-', 'No se registran partidos internacionales disputados con datos de GPS', '-', '-', '-', '-', '-', '-', '-']],
        theme: 'striped',
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontSize: 6.5,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle'
        },
        styles: {
          fontSize: 7.5,
          cellPadding: 3.5,
          textColor: [51, 65, 85],
          lineColor: [226, 232, 240],
          valign: 'middle'
        },
        columnStyles: {
          0: { cellWidth: 32, halign: 'left' },
          1: { cellWidth: 16, halign: 'center' },
          2: { cellWidth: 26, halign: 'left' },
          3: { cellWidth: 12, halign: 'center' },
          4: { cellWidth: 18, halign: 'center' },
          5: { cellWidth: 18, halign: 'center' },
          6: { cellWidth: 14, halign: 'center' },
          7: { cellWidth: 16, halign: 'center' },
          8: { cellWidth: 18, halign: 'center' },
          9: { cellWidth: 12, halign: 'center' }
        }
      });

      (doc as any).lastAutoTable = { finalY: (doc as any).lastAutoTable?.finalY || intMatchesYPos + 20 };

      // ==========================================
      // SECTION 5: HUELLA DEL ATLETA - EVALUACIÓN IMTP
      // ==========================================
      doc.addPage();
      const imtpYPos = 32;

      // Header of section
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('EVALUACIÓN DE FUERZA MÁXIMA - IMTP', margin, imtpYPos);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text('VALORES PICO E ÍNDICES DE FUERZA ISOMÉTRICA Y ASIMETRÍA LATERAL', margin, imtpYPos + 4);

      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.6);
      doc.line(margin, imtpYPos + 6, margin + contentWidth, imtpYPos + 6);

      // Fetch global reference data if not loaded yet so IMTP section has cohort comparison values
      let activeAllImtp = globalImtp;
      let activeAllPlayers = players;
      if (!globalDataLoaded) {
        try {
          console.log("Loading global reference data inside PDF generation...");
          const [imtpRes, cmjRes, pRes] = await Promise.all([
            supabase.from('evaluaciones_imtp').select('*'),
            supabase.from('evaluaciones_cmj').select('*'),
            supabase.from('players').select('player_id, nombre, apellido1, apellido2, anio, id_club, posicion, fecha_nacimiento')
          ]);
          
          const mergedMap = new Map<string, any>();
          (imtpRes.data || []).forEach((item: any) => {
            const newItem = { ...item };
            
            // Force Abs fallbacks
            const fAbs = item['Peak Vertical Force [N]'] ?? item['Peak Vertical Force (N)'] ?? item.imtp_fuerza_n;
            if (fAbs !== undefined && fAbs !== null) {
              newItem.imtp_fuerza_n = Number(fAbs);
              newItem['Peak Vertical Force [N]'] = Number(fAbs);
            }

            // Force Rel fallbacks
            const fRel = item['Peak Vertical Force / BM'] ?? item['Peak Vertical Force / BM [N/kg]'] ?? item.imtp_f_relativa_n_kg;
            if (fRel !== undefined && fRel !== null) {
              newItem.imtp_f_relativa_n_kg = Number(fRel);
              newItem['Peak Vertical Force / BM [N/kg]'] = Number(fRel);
            }

            // Force Net 50ms fallbacks
            const fNet50 = item['Force (Net of BW) at 50ms [N]'] ?? item['Force (Net of BW) at 50ms'] ?? item.imtp_force_50ms;
            if (fNet50 !== undefined && fNet50 !== null) {
              newItem.imtp_force_50ms = Number(fNet50);
              newItem['Force (Net of BW) at 50ms [N]'] = Number(fNet50);
            }

            // RFD 100ms fallbacks
            const rfd100 = item['RFD - 100ms [N/s]'] ?? item['RFD - 100ms'] ?? item.imtp_rfd_100ms;
            if (rfd100 !== undefined && rfd100 !== null) {
              newItem.imtp_rfd_100ms = Number(rfd100);
              newItem['RFD - 100ms [N/s]'] = Number(rfd100);
            }

            const key = `${item.player_id}_${item.fecha_test}`;
            mergedMap.set(key, newItem);
          });

          (cmjRes.data || []).forEach((item: any) => {
            const newItem = { ...item };
            if (newItem.concentric_peak_force_n !== undefined && newItem.concentric_peak_force_n !== null) {
              newItem.fuerza_cmj = Number(newItem.concentric_peak_force_n);
            } else if (newItem.fuerza_cmj !== undefined && newItem.fuerza_cmj !== null) {
              newItem.concentric_peak_force_n = Number(newItem.fuerza_cmj);
            }
            if (newItem.rsi_modified_m_s !== undefined && newItem.rsi_modified_m_s !== null) {
              newItem.cmj_rsi_mod = Number(newItem.rsi_modified_m_s);
            } else if (newItem.cmj_rsi_mod !== undefined && newItem.cmj_rsi_mod !== null) {
              newItem.rsi_modified_m_s = Number(newItem.cmj_rsi_mod);
            }
            if (newItem.jump_height_impmom_cm !== undefined && newItem.jump_height_impmom_cm !== null) {
              newItem.cmj_altura_salto_im = Number(newItem.jump_height_impmom_cm);
            } else if (newItem.cmj_altura_salto_im !== undefined && newItem.cmj_altura_salto_im !== null) {
              newItem.jump_height_impmom_cm = Number(newItem.cmj_altura_salto_im);
            }
            if (newItem.peak_power_bm_w_kg !== undefined && newItem.peak_power_bm_w_kg !== null) {
              newItem.cmj_peak_pot_relativa = Number(newItem.peak_power_bm_w_kg);
            } else if (newItem.cmj_peak_pot_relativa !== undefined && newItem.cmj_peak_pot_relativa !== null) {
              newItem.peak_power_bm_w_kg = Number(newItem.cmj_peak_pot_relativa);
            }

            const key = `${item.player_id}_${item.fecha_test}`;
            const existing = mergedMap.get(key);
            if (existing) {
              mergedMap.set(key, { ...existing, ...newItem });
            } else {
              mergedMap.set(key, newItem);
            }
          });

          activeAllImtp = Array.from(mergedMap.values());
          if (pRes.data) {
            activeAllPlayers = pRes.data;
          }
        } catch (e) {
          console.error("Error loading global data for PDF:", e);
        }
      }

      // Map activeAllImtp to always ensure they have normalized keys (imtp_fuerza_n, etc.)
      activeAllImtp = activeAllImtp.map((item: any) => {
        const newItem = { ...item };
        
        // Force Abs fallbacks
        const fAbs = item['Peak Vertical Force [N]'] ?? item['Peak Vertical Force (N)'] ?? item.imtp_fuerza_n;
        if (fAbs !== undefined && fAbs !== null) {
          newItem.imtp_fuerza_n = Number(fAbs);
          newItem['Peak Vertical Force [N]'] = Number(fAbs);
        }

        // Force Rel fallbacks
        const fRel = item['Peak Vertical Force / BM'] ?? item['Peak Vertical Force / BM [N/kg]'] ?? item.imtp_f_relativa_n_kg;
        if (fRel !== undefined && fRel !== null) {
          newItem.imtp_f_relativa_n_kg = Number(fRel);
          newItem['Peak Vertical Force / BM [N/kg]'] = Number(fRel);
        }

        // Force Net 50ms fallbacks
        const fNet50 = item['Force (Net of BW) at 50ms [N]'] ?? item['Force (Net of BW) at 50ms'] ?? item.imtp_force_50ms;
        if (fNet50 !== undefined && fNet50 !== null) {
          newItem.imtp_force_50ms = Number(fNet50);
          newItem['Force (Net of BW) at 50ms [N]'] = Number(fNet50);
        }

        // RFD 100ms fallbacks
        const rfd100 = item['RFD - 100ms [N/s]'] ?? item['RFD - 100ms'] ?? item.imtp_rfd_100ms;
        if (rfd100 !== undefined && rfd100 !== null) {
          newItem.imtp_rfd_100ms = Number(rfd100);
          newItem['RFD - 100ms [N/s]'] = Number(rfd100);
        }

        // CMJ keys
        if (item.concentric_peak_force_n !== undefined && item.concentric_peak_force_n !== null) {
          newItem.fuerza_cmj = Number(item.concentric_peak_force_n);
        } else if (item.fuerza_cmj !== undefined && item.fuerza_cmj !== null) {
          newItem.concentric_peak_force_n = Number(item.fuerza_cmj);
        }
        if (item.rsi_modified_m_s !== undefined && item.rsi_modified_m_s !== null) {
          newItem.cmj_rsi_mod = Number(item.rsi_modified_m_s);
        } else if (item.cmj_rsi_mod !== undefined && item.cmj_rsi_mod !== null) {
          newItem.rsi_modified_m_s = Number(item.cmj_rsi_mod);
        }
        if (item.jump_height_impmom_cm !== undefined && item.jump_height_impmom_cm !== null) {
          newItem.cmj_altura_salto_im = Number(item.jump_height_impmom_cm);
        } else if (item.cmj_altura_salto_im !== undefined && item.cmj_altura_salto_im !== null) {
          newItem.jump_height_impmom_cm = Number(item.cmj_altura_salto_im);
        }
        if (item.peak_power_bm_w_kg !== undefined && item.peak_power_bm_w_kg !== null) {
          newItem.cmj_peak_pot_relativa = Number(item.peak_power_bm_w_kg);
        } else if (item.cmj_peak_pot_relativa !== undefined && item.cmj_peak_pot_relativa !== null) {
          newItem.peak_power_bm_w_kg = Number(item.cmj_peak_pot_relativa);
        }

        return newItem;
      });

      const parseYearFromDate = (dateStr: string | null | undefined): number => {
        if (!dateStr) return NaN;
        const str = String(dateStr).trim();
        if (str.includes('/')) {
          const parts = str.split('/');
          if (parts.length === 3) {
            const yr = Number(parts[2]);
            if (!isNaN(yr) && yr > 1900) return yr;
            const yrFirst = Number(parts[0]);
            if (!isNaN(yrFirst) && yrFirst > 1900) return yrFirst;
          }
        }
        if (str.includes('-')) {
          const parts = str.split('-');
          if (parts.length === 3) {
            const yr = Number(parts[0]);
            if (!isNaN(yr) && yr > 1900) return yr;
            const yrLast = Number(parts[2]);
            if (!isNaN(yrLast) && yrLast > 1900) return yrLast;
          }
        }
        const parsed = new Date(str).getFullYear();
        return isNaN(parsed) ? NaN : parsed;
      };

      const playerYearRaw = profileData ? (profileData.anio ? Number(profileData.anio) : parseYearFromDate(profileData.fecha_nacimiento)) : NaN;
      const playerYear = isNaN(playerYearRaw) ? null : playerYearRaw;

      const activeComparisonPlayerIds = playerYear 
        ? activeAllPlayers.filter((p: any) => {
            const pYear = p.anio ? Number(p.anio) : parseYearFromDate(p.fecha_nacimiento);
            return pYear === playerYear;
          }).map((p: any) => p.player_id)
        : [];

      const resolveMetricValue = (row: any, key: string): any => {
        if (!row) return undefined;
        let val = row[key];
        if (val === undefined || val === null || val === '') {
          if (key === 'imtp_fuerza_n') val = row['Peak Vertical Force [N]'];
          if (key === 'imtp_f_relativa_n_kg') val = row['Peak Vertical Force / BM'] || row['Peak Vertical Force / BM [N/kg]'];
          if (key === 'imtp_force_50ms') val = row['Force (Net of BW) at 50ms'] || row['Force (Net of BW) at 50ms [N]'];
          if (key === 'imtp_rfd_100ms') val = row['RFD - 100ms [N/s]'];
        }
        return val;
      };

      const getAvg = (data: any[], key: string) => {
        let values = data
          .filter(d => activeComparisonPlayerIds.includes(d.player_id) && resolveMetricValue(d, key) != null && !isNaN(Number(resolveMetricValue(d, key))))
          .map(d => Number(resolveMetricValue(d, key)));

        if (values.length === 0) {
          values = data
            .filter(d => resolveMetricValue(d, key) != null && !isNaN(Number(resolveMetricValue(d, key))))
            .map(d => Number(resolveMetricValue(d, key)));
        }

        if (values.length === 0) return 0;
        const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
        return isNaN(avg) ? 0 : avg;
      };

      const calculatePercentile = (playerValue: number, data: any[], key: string, lowerIsBetter: boolean = false) => {
        if (isNaN(playerValue) || playerValue <= 0) return undefined;

        let playerBestValues = activeComparisonPlayerIds.map(pId => {
          const pRows = data.filter(d => d.player_id === pId && resolveMetricValue(d, key) != null && !isNaN(Number(resolveMetricValue(d, key))));
          if (pRows.length === 0) return null;
          const numericVals = pRows.map(r => Number(resolveMetricValue(r, key))).filter(v => v > 0);
          if (numericVals.length === 0) return null;
          return lowerIsBetter ? Math.min(...numericVals) : Math.max(...numericVals);
        }).filter((v): v is number => v !== null);

        if (playerBestValues.length <= 1) {
          const allPlayerIds = activeAllPlayers.map((p: any) => p.player_id);
          playerBestValues = allPlayerIds.map(pId => {
            const pRows = data.filter(d => d.player_id === pId && resolveMetricValue(d, key) != null && !isNaN(Number(resolveMetricValue(d, key))));
            if (pRows.length === 0) return null;
            const numericVals = pRows.map(r => Number(resolveMetricValue(r, key))).filter(v => v > 0);
            if (numericVals.length === 0) return null;
            return lowerIsBetter ? Math.min(...numericVals) : Math.max(...numericVals);
          }).filter((v): v is number => v !== null);
        }

        if (playerBestValues.length === 0) return undefined;
        if (playerBestValues.length === 1) return 50;

        let countWorse = 0;
        let countEqual = 0;

        playerBestValues.forEach(val => {
          if (lowerIsBetter) {
            if (val > playerValue) countWorse++;
            else if (val === playerValue) countEqual++;
          } else {
            if (val < playerValue) countWorse++;
            else if (val === playerValue) countEqual++;
          }
        });

        const rank = countWorse + (countEqual - 1) * 0.5;
        const pct = (rank / (playerBestValues.length - 1)) * 100;
        return Math.min(99, Math.max(1, Math.round(pct)));
      };

      const getCohortBest = (data: any[], key: string, lowerIsBetter: boolean = false) => {
        let playerBestValues = activeComparisonPlayerIds.map(pId => {
          const pRows = data.filter(d => d.player_id === pId && resolveMetricValue(d, key) != null && !isNaN(Number(resolveMetricValue(d, key))));
          if (pRows.length === 0) return null;
          const numericVals = pRows.map(r => Number(resolveMetricValue(r, key))).filter(v => v > 0);
          if (numericVals.length === 0) return null;
          return lowerIsBetter ? Math.min(...numericVals) : Math.max(...numericVals);
        }).filter((v): v is number => v !== null);

        if (playerBestValues.length <= 1) {
          const allPlayerIds = activeAllPlayers.map((p: any) => p.player_id);
          playerBestValues = allPlayerIds.map(pId => {
            const pRows = data.filter(d => d.player_id === pId && resolveMetricValue(d, key) != null && !isNaN(Number(resolveMetricValue(d, key))));
            if (pRows.length === 0) return null;
            const numericVals = pRows.map(r => Number(resolveMetricValue(r, key))).filter(v => v > 0);
            if (numericVals.length === 0) return null;
            return lowerIsBetter ? Math.min(...numericVals) : Math.max(...numericVals);
          }).filter((v): v is number => v !== null);
        }

        if (playerBestValues.length === 0) return 0;
        return lowerIsBetter ? Math.min(...playerBestValues) : Math.max(...playerBestValues);
      };

      const calculateCohortSD = (list: any[], key: string): number => {
        if (!list || list.length === 0) return 0;
        const values = list
          .map(d => Number(resolveMetricValue(d, key)))
          .filter(v => !isNaN(v) && v > 0);
        if (values.length <= 1) return 0;
        const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
        const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1);
        return Math.sqrt(variance);
      };

      const checkOutlier = (playerValue: number, data: any[], key: string, lowerIsBetter: boolean = false) => {
        if (isNaN(playerValue) || playerValue <= 0) return undefined;

        let playerBestValues = activeComparisonPlayerIds.map(pId => {
          const pRows = data.filter(d => d.player_id === pId && resolveMetricValue(d, key) != null && !isNaN(Number(resolveMetricValue(d, key))));
          if (pRows.length === 0) return null;
          const numericVals = pRows.map(r => Number(resolveMetricValue(r, key))).filter(v => v > 0);
          if (numericVals.length === 0) return null;
          return lowerIsBetter ? Math.min(...numericVals) : Math.max(...numericVals);
        }).filter((v): v is number => v !== null);

        if (playerBestValues.length < 4) {
          const allPlayerIds = activeAllPlayers.map((p: any) => p.player_id);
          playerBestValues = allPlayerIds.map(pId => {
            const pRows = data.filter(d => d.player_id === pId && resolveMetricValue(d, key) != null && !isNaN(Number(resolveMetricValue(d, key))));
            if (pRows.length === 0) return null;
            const numericVals = pRows.map(r => Number(resolveMetricValue(r, key))).filter(v => v > 0);
            if (numericVals.length === 0) return null;
            return lowerIsBetter ? Math.min(...numericVals) : Math.max(...numericVals);
          }).filter((v): v is number => v !== null);
        }

        if (playerBestValues.length < 4) return undefined;
        const sorted = [...playerBestValues].sort((a, b) => a - b);
        const getQuantile = (q: number) => {
          const pos = (sorted.length - 1) * q;
          const base = Math.floor(pos);
          const rest = pos - base;
          return sorted[base + 1] !== undefined
            ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
            : sorted[base];
        };
        const q1 = getQuantile(0.25);
        const q3 = getQuantile(0.75);
        const iqr = q3 - q1;
        const lowBoundary = q1 - 1.5 * iqr;
        const highBoundary = q3 + 1.5 * iqr;

        if (playerValue < lowBoundary) return 'low';
        else if (playerValue > highBoundary) return 'high';
        return undefined;
      };

      const getMetricPDFProps = (metricKey: string, title: string, unit: string, lowerIsBetter: boolean = false) => {
        const playerRows = (physicalData.imtp || [])
          .filter(d => {
            const resolved = resolveMetricValue(d, metricKey);
            return resolved !== undefined && resolved !== null && resolved !== '' && !isNaN(Number(resolved));
          });

        const sortedPlayerRows = [...playerRows].sort((a, b) => {
          const dateA = a.fecha_test ? new Date(a.fecha_test).getTime() : 0;
          const dateB = b.fecha_test ? new Date(b.fecha_test).getTime() : 0;
          return dateB - dateA;
        });

        const latestValue = sortedPlayerRows.length > 0 ? Number(resolveMetricValue(sortedPlayerRows[0], metricKey)) : 0;
        const penultimateValue = sortedPlayerRows.length >= 2 ? Number(resolveMetricValue(sortedPlayerRows[1], metricKey)) : undefined;

        let bestValue = 0;
        if (playerRows.length > 0) {
          const numericVals = playerRows.map(d => Number(resolveMetricValue(d, metricKey)));
          bestValue = lowerIsBetter ? Math.min(...numericVals) : Math.max(...numericVals);
        }

        const average = getAvg(activeAllImtp, metricKey);
        const percentile = calculatePercentile(latestValue, activeAllImtp, metricKey, lowerIsBetter);
        const outlier = checkOutlier(latestValue, activeAllImtp, metricKey, lowerIsBetter);
        const cohortBest = getCohortBest(activeAllImtp, metricKey, lowerIsBetter);

        const cohortSd = calculateCohortSD(activeAllImtp, metricKey);
        let swc = cohortSd * 0.2;
        let mdc = cohortSd * 0.88;

        if (cohortSd === 0 && penultimateValue !== undefined && penultimateValue > 0) {
          swc = penultimateValue * 0.02;
          mdc = penultimateValue * 0.05;
        }

        return {
          title,
          value: latestValue,
          unit,
          average,
          percentile,
          outlier,
          referenceMax: cohortBest,
          personalMax: bestValue,
          penultimateValue,
          swc,
          mdc,
          lowerIsBetter
        };
      };

      const getPercentileLevelShared = (pct: number | undefined) => {
        if (pct === undefined || isNaN(pct)) return 'Sin Datos';
        if (pct >= 90) return 'Élite';
        if (pct >= 75) return 'Sobresaliente';
        if (pct >= 45) return 'Promedio';
        if (pct >= 20) return 'Por Mejorar';
        return 'Alerta';
      };

      const imtpMaxProps = getMetricPDFProps('imtp_fuerza_n', 'IMTP Fuerza Máxima', 'N');
      const imtpRelProps = getMetricPDFProps('imtp_f_relativa_n_kg', 'IMTP F. Relativa', 'N/kg');
      const imtpRfdProps = getMetricPDFProps('imtp_rfd_100ms', 'RFD a 100ms', 'N/s');

      const drawMetricPDFCard = (x: number, y: number, w: number, h: number, props: any, accentColorRGB: [number, number, number]) => {
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(x, y, w, h, 3, 3, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.35);
        doc.roundedRect(x, y, w, h, 3, 3, 'S');

        doc.setFillColor(accentColorRGB[0], accentColorRGB[1], accentColorRGB[2]);
        doc.rect(x + 4, y, w - 8, 2, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.0);
        doc.setTextColor(100, 116, 139);
        doc.text(props.title.toUpperCase(), x + w/2, y + 8, { align: 'center' });

        const safeVal = props.value;
        const valStr = safeVal > 0 ? safeVal.toLocaleString('es-ES', { maximumFractionDigits: 1 }) : 'S/D';
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(15, 23, 42);
        
        let displayVal = valStr;
        if (safeVal > 0) {
          displayVal = `${valStr} ${props.unit}`;
        }
        doc.text(displayVal, x + w/2, y + 17, { align: 'center' });

        let outlierYOffset = 0;
        if (props.outlier && safeVal > 0) {
          doc.setFillColor(254, 243, 199);
          doc.roundedRect(x + w/2 - 14, y + 20, 28, 4, 1, 1, 'F');
          doc.setDrawColor(251, 191, 36);
          doc.setLineWidth(0.2);
          doc.roundedRect(x + w/2 - 14, y + 20, 28, 4, 1, 1, 'S');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(5);
          doc.setTextColor(180, 83, 9);
          doc.text(`▲ ATÍPICO ${props.outlier === 'high' ? 'ALTO' : 'BAJO'}`, x + w/2, y + 23, { align: 'center' });
          outlierYOffset = 5;
        }

        const safeAvg = props.average;
        const avgStr = safeAvg > 0 ? `${safeAvg.toLocaleString('es-ES', { maximumFractionDigits: 1 })} ${props.unit}` : 'S/D';
        const avgY = y + 23 + outlierYOffset;
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(x + 4, avgY, w - 8, 11, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(148, 163, 184);
        doc.text('PROMEDIO CATEGORÍA', x + w/2, avgY + 4, { align: 'center' });
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(51, 65, 85);
        doc.text(avgStr, x + w/2, avgY + 9, { align: 'center' });

        const isBetter = props.lowerIsBetter 
          ? (safeVal > 0 && safeAvg > 0 ? safeVal <= safeAvg : false) 
          : (safeVal >= safeAvg);
        const pctDiff = safeAvg > 0 
          ? (props.lowerIsBetter 
              ? ((safeAvg - safeVal) / safeAvg) * 100 
              : ((safeVal - safeAvg) / safeAvg) * 100
            )
          : 0;

        const vsAvgY = avgY + 14;
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(x + 4, vsAvgY, w - 8, 10, 2, 2, 'F');
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.3);
        doc.roundedRect(x + 4, vsAvgY, w - 8, 10, 2, 2, 'S');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.5);
        doc.setTextColor(148, 163, 184);
        doc.text('VS PROMEDIO', x + w/2, vsAvgY + 3.5, { align: 'center' });
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        if (safeVal > 0 && safeAvg > 0) {
          const diffColor = isBetter ? [16, 185, 129] : [239, 68, 68];
          doc.setTextColor(diffColor[0], diffColor[1], diffColor[2]);
          doc.text(`${isBetter ? '+' : ''}${pctDiff.toFixed(1)}%`, x + w/2, vsAvgY + 8.5, { align: 'center' });
        } else {
          doc.setTextColor(148, 163, 184);
          doc.text('—', x + w/2, vsAvgY + 8.5, { align: 'center' });
        }

        const pctY = vsAvgY + 12;
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(x + 4, pctY, w - 8, 11, 2, 2, 'F');
        doc.roundedRect(x + 4, pctY, w - 8, 11, 2, 2, 'S');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5);
        doc.setTextColor(100, 116, 139);
        doc.text('PERCENTIL', x + 8, pctY + 4.5);
        
        const pctVal = props.percentile;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(15, 23, 42);
        doc.text(pctVal !== undefined && safeVal > 0 ? `P${pctVal}` : 'S/D', x + 8, pctY + 9);

        if (pctVal !== undefined && safeVal > 0) {
          const levelLabel = getPercentileLevelShared(pctVal).toUpperCase();
          let badgeColors = { bg: [243, 244, 246], text: [100, 116, 139] };
          if (pctVal >= 90) badgeColors = { bg: [243, 232, 255], text: [126, 34, 206] };
          else if (pctVal >= 75) badgeColors = { bg: [209, 250, 229], text: [4, 120, 87] };
          else if (pctVal >= 45) badgeColors = { bg: [219, 234, 254], text: [29, 78, 216] };
          else if (pctVal >= 20) badgeColors = { bg: [255, 237, 213], text: [194, 65, 12] };
          else badgeColors = { bg: [254, 226, 226], text: [185, 28, 28] };

          doc.setFillColor(badgeColors.bg[0], badgeColors.bg[1], badgeColors.bg[2]);
          doc.roundedRect(x + w - 24, pctY + 3, 18, 5, 1, 1, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(5);
          doc.setTextColor(badgeColors.text[0], badgeColors.text[1], badgeColors.text[2]);
          doc.text(levelLabel, x + w - 15, pctY + 6.5, { align: 'center' });
        }

        const refMax = props.referenceMax;
        const hasRefMax = refMax !== undefined && refMax > 0;
        const isBetterThanMax = props.lowerIsBetter ? (safeVal < refMax) : (safeVal > refMax);
        const isEqualToMax = safeVal === refMax;
        const pctDiffMax = hasRefMax 
          ? (props.lowerIsBetter 
              ? ((refMax - safeVal) / refMax) * 100 
              : ((safeVal - refMax) / refMax) * 100
            )
          : 0;

        const recordY = pctY + 13;
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(x + 4, recordY, w - 8, 11, 2, 2, 'F');
        doc.roundedRect(x + 4, recordY, w - 8, 11, 2, 2, 'S');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5);
        doc.setTextColor(100, 116, 139);
        doc.text('VS RÉCORD CAT.', x + 8, recordY + 4.5);
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(15, 23, 42);
        if (hasRefMax && safeVal > 0) {
          doc.text(isEqualToMax ? '0.0%' : `${pctDiffMax > 0 ? '+' : ''}${pctDiffMax.toFixed(1)}%`, x + 8, recordY + 9);

          let badgeColors = { bg: [241, 245, 249], text: [100, 116, 139], label: 'DEL RÉCORD' };
          if (isEqualToMax) badgeColors = { bg: [254, 243, 199], text: [180, 83, 9], label: 'RÉCORD CAT.' };
          else if (isBetterThanMax) badgeColors = { bg: [243, 232, 255], text: [126, 34, 206], label: 'SUPERA RÉCORD' };

          doc.setFillColor(badgeColors.bg[0], badgeColors.bg[1], badgeColors.bg[2]);
          doc.roundedRect(x + w - 24, recordY + 3, 18, 5, 1, 1, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(4);
          doc.setTextColor(badgeColors.text[0], badgeColors.text[1], badgeColors.text[2]);
          doc.text(badgeColors.label, x + w - 15, recordY + 6.5, { align: 'center' });
        } else {
          doc.text('—', x + 8, recordY + 9);
        }

        const persMax = props.personalMax;
        const hasPersonalMax = persMax !== undefined && persMax > 0;
        const isBetterThanPersonal = props.lowerIsBetter ? (safeVal < persMax) : (safeVal > persMax);
        const isEqualToPersonal = safeVal === persMax;
        const pctDiffPersonal = hasPersonalMax 
          ? (props.lowerIsBetter 
              ? ((persMax - safeVal) / persMax) * 100 
              : ((safeVal - persMax) / persMax) * 100
            )
          : 0;

        const athleteY = recordY + 13;
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(x + 4, athleteY, w - 8, 11, 2, 2, 'F');
        doc.roundedRect(x + 4, athleteY, w - 8, 11, 2, 2, 'S');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5);
        doc.setTextColor(100, 116, 139);
        doc.text('VS RÉCORD ATLETA', x + 8, athleteY + 4.5);
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(15, 23, 42);
        if (hasPersonalMax && safeVal > 0) {
          doc.text(isEqualToPersonal ? '0.0%' : `${pctDiffPersonal > 0 ? '+' : ''}${pctDiffPersonal.toFixed(1)}%`, x + 8, athleteY + 9);

          let badgeColors = { bg: [241, 245, 249], text: [100, 116, 139], label: 'DEL ATLETA' };
          if (isEqualToPersonal) badgeColors = { bg: [209, 250, 229], text: [4, 120, 87], label: 'RÉCORD PERS.' };
          else if (isBetterThanPersonal) badgeColors = { bg: [243, 232, 255], text: [126, 34, 206], label: 'NUEVO RÉCORD' };

          doc.setFillColor(badgeColors.bg[0], badgeColors.bg[1], badgeColors.bg[2]);
          doc.roundedRect(x + w - 24, athleteY + 3, 18, 5, 1, 1, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(4);
          doc.setTextColor(badgeColors.text[0], badgeColors.text[1], badgeColors.text[2]);
          doc.text(badgeColors.label, x + w - 15, athleteY + 6.5, { align: 'center' });
        } else {
          doc.text('—', x + 8, athleteY + 9);
        }

        const penVal = props.penultimateValue;
        const hasPenultimate = penVal !== undefined && penVal > 0;
        let isPrevBetter = false;
        let isPrevEqual = false;
        let displayPctPrev = 0;
        let changeClassification: 'mejora_real' | 'mejora_probable' | 'estable' | 'deterioro_probable' | 'deterioro_real' = 'estable';

        if (hasPenultimate && safeVal > 0) {
          const rawDiff = safeVal - penVal;
          const diffPrev = props.lowerIsBetter ? -rawDiff : rawDiff;
          isPrevBetter = diffPrev > 0;
          isPrevEqual = diffPrev === 0;
          displayPctPrev = props.lowerIsBetter 
            ? ((penVal - safeVal) / penVal) * 100 
            : ((safeVal - penVal) / penVal) * 100;

          const absDiff = Math.abs(rawDiff);
          const swc = props.swc || 0;
          const mdc = props.mdc || 0;

          if (absDiff >= mdc) {
            changeClassification = isPrevBetter ? 'mejora_real' : 'deterioro_real';
          } else if (absDiff >= swc) {
            changeClassification = isPrevBetter ? 'mejora_probable' : 'deterioro_probable';
          } else {
            changeClassification = 'estable';
          }
        }

        const prevY = athleteY + 13;
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(x + 4, prevY, w - 8, 14, 2, 2, 'F');
        doc.roundedRect(x + 4, prevY, w - 8, 14, 2, 2, 'S');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5);
        doc.setTextColor(100, 116, 139);
        doc.text('VS EVAL. PREVIA', x + 8, prevY + 4.5);
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        if (hasPenultimate && safeVal > 0) {
          doc.text(isPrevEqual ? '0.0%' : `${displayPctPrev > 0 ? '+' : ''}${displayPctPrev.toFixed(1)}%`, x + 8, prevY + 9);
          
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(4.5);
          doc.setTextColor(148, 163, 184);
          doc.text(`(antes: ${penVal.toLocaleString('es-ES', { maximumFractionDigits: 1 })})`, x + 8, prevY + 12.5);

          let badgeColors = { bg: [241, 245, 249], text: [100, 116, 139], label: 'ESTABLE / RUIDO' };
          if (changeClassification === 'mejora_real') badgeColors = { bg: [209, 250, 229], text: [4, 120, 87], label: 'MEJORA REAL' };
          else if (changeClassification === 'mejora_probable') badgeColors = { bg: [204, 251, 241], text: [13, 148, 136], label: 'MEJORA PROB.' };
          else if (changeClassification === 'deterioro_probable') badgeColors = { bg: [254, 243, 199], text: [217, 119, 6], label: 'BAJA PROB.' };
          else if (changeClassification === 'deterioro_real') badgeColors = { bg: [254, 226, 226], text: [185, 28, 28], label: 'BAJA REAL' };

          doc.setFillColor(badgeColors.bg[0], badgeColors.bg[1], badgeColors.bg[2]);
          doc.roundedRect(x + w - 24, prevY + 3, 18, 5, 1, 1, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(4);
          doc.setTextColor(badgeColors.text[0], badgeColors.text[1], badgeColors.text[2]);
          doc.text(badgeColors.label, x + w - 15, prevY + 6.5, { align: 'center' });
        } else {
          doc.text('—', x + 8, prevY + 9);
        }

        const footY = prevY + 17;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(4.2);
        doc.setTextColor(148, 163, 184);
        doc.text(`SWC: ±${(props.swc || 0).toLocaleString('es-CL', { maximumFractionDigits: 1 })} ${props.unit}`, x + 5, footY);
        doc.text(`MDC: ±${(props.mdc || 0).toLocaleString('es-CL', { maximumFractionDigits: 1 })} ${props.unit}`, x + w - 5, footY, { align: 'right' });
      };

      const cardW = 58;
      const cardH = 118;
      const cardGap = 4;
      const cardsY = imtpYPos + 10;

      drawMetricPDFCard(margin, cardsY, cardW, cardH, imtpMaxProps, [220, 38, 38]); // red-600
      drawMetricPDFCard(margin + cardW + cardGap, cardsY, cardW, cardH, imtpRelProps, [249, 115, 22]); // orange-500
      drawMetricPDFCard(margin + 2 * (cardW + cardGap), cardsY, cardW, cardH, imtpRfdProps, [79, 70, 229]); // indigo-600

      const orientY = cardsY + cardH + 6;
      const orientH = 36;
      
      doc.setFillColor(254, 242, 242); // red-50
      doc.roundedRect(margin, orientY, contentWidth, orientH, 4, 4, 'F');
      
      doc.setDrawColor(254, 202, 202); // red-200
      doc.setLineWidth(0.35);
      doc.roundedRect(margin, orientY, contentWidth, orientH, 4, 4, 'S');

      doc.setFillColor(239, 68, 68); // red-500
      doc.roundedRect(margin + 4, orientY + 4, 8, 8, 2, 2, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5);
      doc.setTextColor(255, 255, 255);
      doc.text('IMTP', margin + 8, orientY + 9.2, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(153, 27, 27); // red-800
      doc.text('FICHA DE ORIENTACIÓN: FUERZA ISOMÉTRICA & TASA DE FUERZA (IMTP)', margin + 15, orientY + 9.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.0);
      doc.setTextColor(55, 65, 81); // slate-700
      
      let orientationText = '';
      const relPct = imtpRelProps.percentile || 0;
      const rfdPct = imtpRfdProps.percentile || 0;
      const relLevel = getPercentileLevelShared(relPct);
      const rfdLevel = getPercentileLevelShared(rfdPct);

      const isRelLow = relPct < 45;
      const isRfdLow = rfdPct < 45;

      if (imtpMaxProps.value === 0 && imtpRelProps.value === 0) {
        orientationText = 'No se registran suficientes datos históricos de evaluaciones de fuerza IMTP para generar una ficha de orientación dinámica para este atleta.';
      } else if (isRelLow && isRfdLow) {
        orientationText = `Déficit crítico tanto de fuerza relativa (Nivel: ${relLevel}, ${imtpRelProps.value} N/kg, Percentil: ${Math.round(relPct)}%) como de tasa de desarrollo de fuerza (RFD 100ms Nivel: ${rfdLevel}, ${imtpRfdProps.value} N/s, Percentil: ${Math.round(rfdPct)}%). El atleta presenta una baja capacidad de reclutamiento y tensión muscular absoluta. Se prescribe un ciclo prioritario de fuerza estructural y adaptaciones neuronales con cargas pesadas, combinado de manera secundaria con aceleraciones balísticas ligeras para romper la inercia.`;
      } else if (isRelLow && !isRfdLow) {
        orientationText = `Nivel de fuerza relativa bajo (Nivel: ${relLevel}, ${imtpRelProps.value} N/kg, Percentil: ${Math.round(relPct)}%) pero con una tasa de desarrollo de fuerza (RFD Nivel: ${rfdLevel}, ${imtpRfdProps.value} N/s, Percentil: ${Math.round(rfdPct)}%) relativamente eficiente. Esto indica que aunque el deportista es rápido para aplicar fuerza, carece de la masa muscular o la fuerza máxima de base para sostener altas tensiones. Se prescribe entrenamiento de hipertrofia funcional y fuerza máxima dinámica (cargas > 80% 1RM) para elevar su potencial de fuerza absoluta.`;
      } else if (!isRelLow && isRfdLow) {
        orientationText = `Adecuado nivel de fuerza relativa (Nivel: ${relLevel}, ${imtpRelProps.value} N/kg, Percentil: ${Math.round(relPct)}%) pero con deficiente velocidad de aplicación (RFD 100ms bajo, Nivel: ${rfdLevel}, ${imtpRfdProps.value} N/s, Percentil: ${Math.round(rfdPct)}%). El atleta es sumamente fuerte pero "lento" en la ventana de tiempo crucial de un gesto deportivo (primeros 100-150ms). Se aconseja priorizar de inmediato el entrenamiento de potencia de alta velocidad, ejercicios balísticos, derivados de levantamiento olímpico desde el colgajo y saltos cargados ligeros (<30% 1RM) orientados a maximizar el RFD.`;
      } else {
        orientationText = `Perfil de fuerza isométrica sobresaliente (Nivel: ${relLevel}, Fuerza Relativa: ${imtpRelProps.value} N/kg, Percentil: ${Math.round(relPct)}%) y fantástica velocidad de transmisión neural (RFD Nivel: ${rfdLevel}, ${imtpRfdProps.value} N/s, Percentil: ${Math.round(rfdPct)}%). Demuestra una óptima capacidad para generar altos niveles de tensión y transmitirlos con extrema rapidez. Se prescribe entrenamiento de mantenimiento, prevención de lesiones y transferencia dinámica multidireccional específica al fútbol.`;
      }

      const wrappedText = doc.splitTextToSize(orientationText, contentWidth - 8);
      doc.text(wrappedText, margin + 4, orientY + 14.5, { baseline: 'top' });

      // Draw dynamic header/footers on all pages
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        
        // 1. Header Band
        doc.setFillColor(11, 45, 106); // #0b2d6a
        doc.rect(0, 0, pageWidth, 24, 'F');
        
        // Accent Red strip
        doc.setFillColor(207, 27, 43); // #CF1B2B
        doc.rect(0, 22.5, pageWidth, 1.5, 'F');
        
        // Federation Logo with perfect aspect ratio centering
        if (base64FederationLogo) {
          try {
            const fedSize = await getImageDimensions(base64FederationLogo);
            let drawW = 15;
            let drawH = 15;
            let drawX = margin;
            let drawY = 4;

            if (fedSize.width > 0 && fedSize.height > 0) {
              const aspect = fedSize.width / fedSize.height;
              if (aspect > 1) {
                drawW = 15;
                drawH = 15 / aspect;
                drawY = 4 + (15 - drawH) / 2;
              } else {
                drawH = 15;
                drawW = 15 * aspect;
                drawX = margin + (15 - drawW) / 2;
              }
            }
            doc.addImage(base64FederationLogo, 'PNG', drawX, drawY, drawW, drawH);
          } catch (e) {
            console.error("Error drawing federation logo:", e);
          }
        }
        
        // Title Text
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(255, 255, 255);
        doc.text('LA ROJA PERFORMANCE', margin + 19, 11);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(200, 210, 230);
        doc.text('FICHA DE CONTROL INDIVIDUAL - SEGUIMIENTO DE CARGA', margin + 19, 16);
        
        // Right side header label
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(255, 255, 255);
        doc.text('REPORTE OFICIAL', pageWidth - margin, 13, { align: 'right' });
        
        // 2. Footer
        doc.setFillColor(248, 250, 252); // slate-50
        doc.rect(0, pageHeight - 12, pageWidth, 12, 'F');
        
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.setLineWidth(0.2);
        doc.line(0, pageHeight - 12, pageWidth, pageHeight - 12);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184); // slate-400
        
        const timestamp = new Date().toLocaleString('es-CL');
        doc.text(`Generado el: ${timestamp}`, margin, pageHeight - 5);
        doc.text(`La Roja Performance Hub — Confidencial`, pageWidth / 2, pageHeight - 5, { align: 'center' });
        doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
      }

      // Save document
      const cleanName = `${profileData.nombre}-${profileData.apellido1}`.toLowerCase().replace(/[^a-z0-9]/g, '-');
      doc.save(`Ficha-Deportiva-${cleanName}.pdf`);
    } catch (e) {
      console.error("Error generating PDF report:", e);
      alert("Hubo un error al generar el PDF. Por favor reintenta.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const fetchGlobalPhysicalData = async () => {
    if (globalDataLoaded) return;
    try {
      console.log("Loading global reference data for Athlete Huella...");
      const [imtpRes, speedRes, antroRes, vo2Res, cmjRes, cmjReboundRes, test505Res] = await Promise.all([
        supabase.from('evaluaciones_imtp').select('*'),
        supabase.from('velocidad_tests').select('*'),
        supabase.from('antropometria').select('*'),
        supabase.from('vo2max_tests').select('*'),
        supabase.from('evaluaciones_cmj').select('*'),
        supabase.from('evaluaciones_cmj_rebound').select('*'),
        supabase.from('test_505').select('*')
      ]);

      // Combine IMTP and CMJ data by player_id and date
      const mergedMap = new Map<string, any>();
      const processedImtpData = (imtpRes.data || []).map((item: any) => {
        const newItem = { ...item };
        
        // Force Abs fallbacks
        const fAbs = item['Peak Vertical Force [N]'] ?? item['Peak Vertical Force (N)'] ?? item.imtp_fuerza_n;
        if (fAbs !== undefined && fAbs !== null) {
          newItem.imtp_fuerza_n = Number(fAbs);
          newItem['Peak Vertical Force [N]'] = Number(fAbs);
        }

        // Force Rel fallbacks
        const fRel = item['Peak Vertical Force / BM'] ?? item['Peak Vertical Force / BM [N/kg]'] ?? item.imtp_f_relativa_n_kg;
        if (fRel !== undefined && fRel !== null) {
          newItem.imtp_f_relativa_n_kg = Number(fRel);
          newItem['Peak Vertical Force / BM [N/kg]'] = Number(fRel);
        }

        // Force Net 50ms fallbacks
        const fNet50 = item['Force (Net of BW) at 50ms [N]'] ?? item['Force (Net of BW) at 50ms'] ?? item.imtp_force_50ms;
        if (fNet50 !== undefined && fNet50 !== null) {
          newItem.imtp_force_50ms = Number(fNet50);
          newItem['Force (Net of BW) at 50ms [N]'] = Number(fNet50);
        }

        // RFD 100ms fallbacks
        const rfd100 = item['RFD - 100ms [N/s]'] ?? item['RFD - 100ms'] ?? item.imtp_rfd_100ms;
        if (rfd100 !== undefined && rfd100 !== null) {
          newItem.imtp_rfd_100ms = Number(rfd100);
          newItem['RFD - 100ms [N/s]'] = Number(rfd100);
        }

        return newItem;
      });
      processedImtpData.forEach((item: any) => {
        const key = `${item.player_id}_${item.fecha_test}`;
        mergedMap.set(key, { ...item });
      });
      (cmjRes.data || []).forEach((item: any) => {
        const key = `${item.player_id}_${item.fecha_test}`;
        const existing = mergedMap.get(key);
        if (existing) {
          mergedMap.set(key, { ...existing, ...item });
        } else {
          mergedMap.set(key, { ...item });
        }
      });
      const combinedImtp = Array.from(mergedMap.values());

      setGlobalImtp(combinedImtp);
      setGlobalSpeed(speedRes.data || []);
      setGlobalAntro(antroRes.data || []);
      setGlobalVo2(vo2Res.data || []);
      setGlobalCmjRebound(cmjReboundRes.data || []);
      setGlobalTest505(test505Res.data || []);
      setGlobalDataLoaded(true);
    } catch (err) {
      console.error("Error loading global physical data:", err);
    }
  };

  useEffect(() => {
    if (activeTab === 'huella' && selectedPlayerId) {
      fetchGlobalPhysicalData();
    }
  }, [activeTab, selectedPlayerId]);

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
      if (year === 2011 || year === 2012) return 'sub_15';
      if (year === 2009 || year === 2010) return 'sub_17';
      if (year <= 2008) return 'sub_20';
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

  const internationalGpsMatches = useMemo(() => {
    return categoryMatches
      .map(match => {
        const gpsRecord = gpsStats.find(g => g.fecha === match.date);
        const compType = (match.competition_type || '').toLowerCase();
        const isInternational = compType.includes('internacional') || compType.includes('mundial') || compType.includes('sudamericano');
        
        // Check if player actually belongs to this category / was cited for it
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

        const belongsToThisCategory = isCitedForThisMicrocycle || isCitedForThisCategoryOnDate;

        return {
          match,
          gpsRecord,
          isInternational,
          belongsToThisCategory
        };
      })
      .filter(item => item.isInternational && item.gpsRecord && item.belongsToThisCategory)
      .sort((a, b) => a.match.date.localeCompare(b.match.date));
  }, [categoryMatches, gpsStats, filteredCitations]);

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
    const filtered = clubPlayers.filter(p => {
      const playerYear = p.anio || p.year;
      const playerPos = p.posicion || p.position;
      const playerClubId = p.id_club || p.club_id;

      const matchYear = filterYear.length === 0 || filterYear.includes(String(playerYear));
      const matchPosition = filterPosition.length === 0 || filterPosition.includes(String(playerPos));
      const matchClub = filterClubId.length === 0 || filterClubId.includes(String(playerClubId));
      
      return matchYear && matchPosition && matchClub;
    });

    return [...filtered].sort((a, b) => {
      const nameA = `${a.apellido1 || ''} ${a.apellido2 || ''}, ${a.nombre || ''}`.trim().toLowerCase();
      const nameB = `${b.apellido1 || ''} ${b.apellido2 || ''}, ${b.nombre || ''}`.trim().toLowerCase();
      return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
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
             <div className="relative">
               <button 
                 type="button"
                 onClick={() => {
                   setShowYearDropdown(!showYearDropdown);
                   setShowPositionDropdown(false);
                   setShowClubDropdown(false);
                 }}
                 className="bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl px-4 py-2 text-[10px] font-black text-slate-500 outline-none focus:ring-2 focus:ring-red-500/10 transition-all flex items-center gap-2"
               >
                 <span>
                   {filterYear.length === 0 ? 'Año (Todos)' : `${filterYear.length} Años`}
                 </span>
                 <i className={`fa-solid fa-chevron-down text-[8px] transition-transform ${showYearDropdown ? 'rotate-180' : ''}`} />
               </button>
               {showYearDropdown && (
                 <>
                   <div className="fixed inset-0 z-10" onClick={() => setShowYearDropdown(false)} />
                   <div className="absolute left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-50 p-2 max-h-60 overflow-y-auto">
                     <div className="flex items-center justify-between border-b border-slate-50 pb-1.5 mb-1.5">
                       <span className="text-[9px] font-bold text-slate-400 uppercase">Años</span>
                       <button 
                         type="button" 
                         onClick={() => setFilterYear([])} 
                         className="text-[8px] font-black uppercase text-red-500"
                       >
                         Limpiar
                       </button>
                     </div>
                     {uniqueYears.map(y => {
                       const strY = String(y);
                       const isChecked = filterYear.includes(strY);
                       return (
                         <label key={strY} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg cursor-pointer text-[10px] font-bold text-slate-600 transition-all">
                           <input 
                             type="checkbox" 
                             checked={isChecked}
                             onChange={() => {
                               setFilterYear(prev => isChecked ? prev.filter(item => item !== strY) : [...prev, strY]);
                             }}
                             className="w-3.5 h-3.5 text-[#CF1B2B] rounded border-slate-300 focus:ring-red-500 cursor-pointer"
                           />
                           <span>{y}</span>
                         </label>
                       );
                     })}
                   </div>
                 </>
               )}
             </div>

             {/* Position Filter */}
             <div className="relative">
               <button 
                 type="button"
                 onClick={() => {
                   setShowPositionDropdown(!showPositionDropdown);
                   setShowYearDropdown(false);
                   setShowClubDropdown(false);
                 }}
                 className="bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl px-4 py-2 text-[10px] font-black text-slate-500 outline-none focus:ring-2 focus:ring-red-500/10 transition-all flex items-center gap-2"
               >
                 <span>
                   {filterPosition.length === 0 ? 'Posición (Todas)' : `${filterPosition.length} Pos.`}
                 </span>
                 <i className={`fa-solid fa-chevron-down text-[8px] transition-transform ${showPositionDropdown ? 'rotate-180' : ''}`} />
               </button>
               {showPositionDropdown && (
                 <>
                   <div className="fixed inset-0 z-10" onClick={() => setShowPositionDropdown(false)} />
                   <div className="absolute left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-50 p-2 max-h-60 overflow-y-auto">
                     <div className="flex items-center justify-between border-b border-slate-50 pb-1.5 mb-1.5">
                       <span className="text-[9px] font-bold text-slate-400 uppercase">Posición</span>
                       <button 
                         type="button" 
                         onClick={() => setFilterPosition([])} 
                         className="text-[8px] font-black uppercase text-red-500"
                       >
                         Limpiar
                       </button>
                     </div>
                     {uniquePositions.map(pos => {
                       const strPos = String(pos);
                       const isChecked = filterPosition.includes(strPos);
                       return (
                         <label key={strPos} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg cursor-pointer text-[10px] font-bold text-slate-600 transition-all">
                           <input 
                             type="checkbox" 
                             checked={isChecked}
                             onChange={() => {
                               setFilterPosition(prev => isChecked ? prev.filter(item => item !== strPos) : [...prev, strPos]);
                             }}
                             className="w-3.5 h-3.5 text-[#CF1B2B] rounded border-slate-300 focus:ring-red-500 cursor-pointer"
                           />
                           <span>{pos}</span>
                         </label>
                       );
                     })}
                   </div>
                 </>
               )}
             </div>

             {/* Club Filter */}
             {userRole !== 'club' && (
               <div className="relative">
                 <button 
                   type="button"
                   onClick={() => {
                     setShowClubDropdown(!showClubDropdown);
                     setShowYearDropdown(false);
                     setShowPositionDropdown(false);
                   }}
                   className="bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl px-4 py-2 text-[10px] font-black text-slate-500 outline-none focus:ring-2 focus:ring-red-500/10 transition-all flex items-center gap-2"
                 >
                   <span>
                     {filterClubId.length === 0 ? 'Club (Todos)' : `${filterClubId.length} Clubes`}
                   </span>
                   <i className={`fa-solid fa-chevron-down text-[8px] transition-transform ${showClubDropdown ? 'rotate-180' : ''}`} />
                 </button>
                 {showClubDropdown && (
                   <>
                     <div className="fixed inset-0 z-10" onClick={() => setShowClubDropdown(false)} />
                     <div className="absolute left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 z-50 p-2 max-h-60 overflow-y-auto">
                       <div className="flex items-center justify-between border-b border-slate-50 pb-1.5 mb-1.5">
                         <span className="text-[9px] font-bold text-slate-400 uppercase">Clubes</span>
                         <button 
                           type="button" 
                           onClick={() => setFilterClubId([])} 
                           className="text-[8px] font-black uppercase text-red-500"
                         >
                           Limpiar
                         </button>
                       </div>
                       {uniqueClubs.map(c => {
                         const strClubId = String(c.id);
                         const isChecked = filterClubId.includes(strClubId);
                         return (
                           <label key={strClubId} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg cursor-pointer text-[10px] font-bold text-slate-600 transition-all">
                             <input 
                               type="checkbox" 
                               checked={isChecked}
                               onChange={() => {
                                 setFilterClubId(prev => isChecked ? prev.filter(item => item !== strClubId) : [...prev, strClubId]);
                               }}
                               className="w-3.5 h-3.5 text-[#CF1B2B] rounded border-slate-300 focus:ring-red-500 cursor-pointer"
                             />
                             <span className="truncate">{c.nombre}</span>
                           </label>
                         );
                       })}
                     </div>
                   </>
                 )}
               </div>
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
              <div className="bg-[#0b2d6a] rounded-[40px] p-8 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                <div className="relative z-10 text-center">
                  <div className="flex justify-center mb-6">
                    <AvatarJugador
                      player={{
                        ...profileData,
                        signed_url: !profileData.foto_path && profileData.foto_url ? getDriveDirectLink(profileData.foto_url) : undefined
                      }}
                      size={112}
                      className="border-4 border-white/10 shadow-2xl"
                    />
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
                  label="Minutos Totales" 
                  value={`${Math.round(stats.minutosGps)}`} 
                  icon="fa-clock" 
                  color="slate" 
                  extra={
                    <div className="text-[7px] font-black opacity-50 mt-1 uppercase">
                      MINUTOS TOTALES
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
                        typeLabel = evt.severity === 'sick' ? 'ENFERMO' : evt.severity === 'high' ? 'P. CRÍTICO' : evt.severity === 'medium' ? 'P. MEDIO' : 'P. DIARIO';
                        typeColor = evt.severity === 'sick' ? 'bg-purple-50 text-purple-500 border border-purple-100' : evt.severity === 'high' ? 'bg-rose-50 text-rose-500 border border-rose-100' : evt.severity === 'medium' ? 'bg-amber-50 text-amber-500 border border-amber-100' : 'bg-emerald-50 text-emerald-500 border border-emerald-100';
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
              {/* Tab Selector & PDF Button for Player Profile Right Column */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex bg-slate-100/80 p-1.5 rounded-3xl items-center gap-1.5 shadow-inner">
                  <button
                    onClick={() => setActiveTab('evolucion')}
                    className={`px-6 py-3 text-xs font-black uppercase tracking-wider rounded-2xl transition-all duration-300 flex items-center gap-2 ${
                      activeTab === 'evolucion'
                        ? 'bg-[#0b2d6a] text-white shadow-lg'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                    }`}
                  >
                    <i className="fa-solid fa-clock-rotate-left"></i>
                    Evolución y Cargas
                  </button>
                  <button
                    onClick={() => setActiveTab('huella')}
                    className={`px-6 py-3 text-xs font-black uppercase tracking-wider rounded-2xl transition-all duration-300 flex items-center gap-2 ${
                      activeTab === 'huella'
                        ? 'bg-[#0b2d6a] text-white shadow-lg'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                    }`}
                  >
                    <i className="fa-solid fa-fingerprint"></i>
                    Huella del Atleta
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  disabled={generatingPdf}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-slate-400 text-white px-5 py-3 text-xs font-black uppercase tracking-wider rounded-2xl transition-all duration-300 flex items-center gap-2 shadow-lg shadow-red-600/15 active:scale-95 shrink-0"
                >
                  {generatingPdf ? (
                    <>
                      <i className="fa-solid fa-circle-notch animate-spin"></i>
                      Generando PDF...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-file-pdf text-sm"></i>
                      Descargar Ficha PDF
                    </>
                  )}
                </button>
              </div>

              {activeTab === 'evolucion' ? (
                <>
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

                  {/* Partidos Internacionales */}
                  <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
                     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                        <div>
                           <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3">
                              <span className="w-2 h-6 bg-red-600 rounded-full"></span>
                              Partidos Internacionales (Control GPS)
                           </h3>
                           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                              Historial de encuentros internacionales oficiales o amistosos disputados con telemetría de rendimiento GPS
                           </p>
                        </div>
                        <div className="flex gap-2 text-[9px] font-black uppercase text-slate-500 bg-slate-50 border border-slate-100 p-2 rounded-2xl shrink-0">
                           <div>Partidos Registrados: <span className="text-red-500 font-mono font-black">{internationalGpsMatches.length}</span></div>
                        </div>
                     </div>

                     <div className="overflow-x-auto rounded-3xl border border-slate-100 shadow-sm">
                        <table className="w-full text-left border-collapse bg-white">
                           <thead>
                              <tr className="bg-slate-50 border-b border-slate-100">
                                 <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-wider font-sans">Partido / Rival</th>
                                 <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-wider text-center font-sans">Fecha</th>
                                 <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-wider font-sans">Competición</th>
                                 <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-wider text-center font-sans">Min</th>
                                 <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-wider text-right font-sans">Distancia</th>
                                 <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-wider text-right font-sans">Vel Máx</th>
                                 <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-wider text-right font-sans">M/min</th>
                                 <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-wider text-right font-sans">HSR (&gt;20)</th>
                                 <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-wider text-right font-sans">Sprint (&gt;25)</th>
                                 <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-wider text-center font-sans">Sprints</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100 text-[11px] font-bold text-slate-700">
                              {internationalGpsMatches.map(({ match, gpsRecord }, idx) => {
                                 const relative = gpsRecord ? (Number(gpsRecord.m_por_min) || (Number(gpsRecord.minutos) > 0 ? (Number(gpsRecord.dist_total_m) / Number(gpsRecord.minutos)) : 0)) : 0;
                                 return (
                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                       <td className="px-5 py-4 font-black text-slate-900 uppercase">vs. {match.opponent}</td>
                                       <td className="px-5 py-4 text-center text-slate-500 font-mono italic">{match.date}</td>
                                       <td className="px-5 py-4 text-slate-500 uppercase text-[10px]">{match.competition_type}</td>
                                       <td className="px-5 py-4 text-center font-mono text-slate-900">{gpsRecord ? `${Number(gpsRecord.minutos || gpsRecord.duration_mins || 0).toFixed(0)}'` : '-'}</td>
                                       <td className="px-5 py-4 text-right font-mono text-slate-900">
                                          {gpsRecord ? `${(Number(gpsRecord.dist_total_m) || 0).toLocaleString('es-cl', { maximumFractionDigits: 0 })} m` : '-'}
                                       </td>
                                       <td className="px-5 py-4 text-right font-mono text-red-600">
                                          {gpsRecord ? `${(Number(gpsRecord.vel_max_kmh) || Number(gpsRecord.velocidad_max) || 0).toFixed(1)} km/h` : '-'}
                                       </td>
                                       <td className="px-5 py-4 text-right font-mono text-emerald-600">
                                          {gpsRecord ? `${relative.toFixed(1)}` : '-'}
                                       </td>
                                       <td className="px-5 py-4 text-right font-mono text-amber-600">
                                          {gpsRecord ? `${(Number(gpsRecord.dist_mai_m_20_kmh) || 0).toLocaleString('es-cl', { maximumFractionDigits: 0 })} m` : '-'}
                                       </td>
                                       <td className="px-5 py-4 text-right font-mono text-violet-600">
                                          {gpsRecord ? `${(Number(gpsRecord.dist_sprint_m_25_kmh) || 0).toLocaleString('es-cl', { maximumFractionDigits: 0 })} m` : '-'}
                                       </td>
                                       <td className="px-5 py-4 text-center font-mono text-fuchsia-600">
                                          {gpsRecord ? `${Number(gpsRecord.sprints_n || 0).toFixed(0)}` : '-'}
                                       </td>
                                    </tr>
                                 );
                              })}
                              {internationalGpsMatches.length === 0 && (
                                 <tr>
                                    <td colSpan={10} className="text-center py-12 text-slate-400 font-black uppercase text-[10px] tracking-wider">
                                       No se registran partidos internacionales disputados con datos de GPS para este atleta
                                    </td>
                                 </tr>
                              )}
                           </tbody>
                         </table>
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
                </>
              ) : (
                <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
                  <AthleteHuella
                    player={profileData}
                    imtp={physicalData.imtp}
                    speed={physicalData.speed}
                    antropometria={physicalData.anthro}
                    vo2max={physicalData.vo2}
                    test505={test505}
                    medicalReports={medicalHistory.reports}
                    internalLoads={wellnessData}
                    gps={gpsStats}
                    allImtp={globalImtp}
                    allSpeed={globalSpeed}
                    allAntro={globalAntro}
                    allVo2={globalVo2}
                    allTest505={globalTest505}
                    allPlayers={players}
                    clubs={clubs}
                    cmjRebound={cmjRebound}
                    allCmjRebound={globalCmjRebound}
                  />
                </div>
              )}

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
