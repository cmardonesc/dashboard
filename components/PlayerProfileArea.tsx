
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
import { FALLBACK_CLUB_NAMES, FEDERATION_LOGO } from '../constants';
import { AthleteHuella } from './SportsScienceArea';
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
      let query = supabase.from('players').select('player_id, nombre, apellido1, apellido2, id_club, posicion, anio, clubes!fk_players_clubes(nombre)');
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
      const { data: pData } = await supabase.from('players').select('player_id, nombre, apellido1, apellido2, anio, id_club, posicion, fecha_nacimiento').eq('player_id', playerId).single();
      if (pData) {
        const pDataWithClub = { ...pData } as any;
        if (pData.player_id === 355) {
          pDataWithClub.id_club = 89;
          pDataWithClub.club = 'Everton';
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
        supabase.from('test_505').select('*').eq('player_id', playerId).order('fecha_test', { ascending: true })
      ]);

      // Combine IMTP and CMJ data by date
      const mergedMap = new Map<string, any>();
      const processedImtpData = (imtpRes.data || []).map((item: any) => {
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
      processedImtpData.forEach((item: any) => {
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

      // Dynamic percentile calculator for physical benchmarks in PDF
      const getPDFPercentile = (val: number, list: any[], key: string, lowerIsBetter = false) => {
        const validVals = list
          .map(item => Number(item[key]))
          .filter(v => !isNaN(v) && v > 0);
        if (validVals.length === 0) {
          if (key === 'vo2_max') return val > 55 ? 92 : (val > 50 ? 78 : (val > 45 ? 50 : 25));
          if (key === 'imtp_f_relativa_n_kg') return val > 40 ? 92 : (val > 35 ? 78 : (val > 30 ? 50 : 25));
          if (key === 'tiempo_total') return val < 4.1 ? 92 : (val < 4.3 ? 78 : (val < 4.5 ? 50 : 25));
          if (key === 'masa_muscular_pct') return val > 50 ? 92 : (val > 47 ? 78 : (val > 44 ? 50 : 25));
          return 50;
        }
        const sorted = [...validVals].sort((a, b) => a - b);
        let count = 0;
        for (const v of sorted) {
          if (lowerIsBetter ? v > val : v < val) count++;
        }
        return (count / sorted.length) * 100;
      };

      const getPDFLevelInfo = (pct: number) => {
        if (pct >= 90) return { label: 'Élite', color: [147, 51, 234], textColor: [255, 255, 255] }; // Purple
        if (pct >= 75) return { label: 'Sobresaliente', color: [16, 185, 129], textColor: [255, 255, 255] }; // Emerald Green
        if (pct >= 45) return { label: 'Promedio', color: [59, 130, 246], textColor: [255, 255, 255] }; // Blue
        if (pct >= 20) return { label: 'Por Mejorar', color: [249, 115, 22], textColor: [255, 255, 255] }; // Orange
        return { label: 'Alerta', color: [239, 68, 68], textColor: [255, 255, 255] }; // Red
      };

      // Helper function to draw header on every page
      const drawHeader = (pageNum: number, titleText: string) => {
        // Draw Navy Blue Header Band
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(0, 0, pageWidth, 28, 'F');

        // Draw Accent Highlight Bar at the bottom of the band
        doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.rect(0, 26, pageWidth, 2, 'F');

        // Logo
        const logoUrl = getDriveDirectLink(FEDERATION_LOGO);
        try {
          doc.addImage(logoUrl, 'PNG', margin, 4, 18, 18);
        } catch (e) {
          console.error("Error loading logo for PDF:", e);
        }

        // Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(255, 255, 255);
        doc.text('LA ROJA PERFORMANCE', margin + 22, 12);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(200, 200, 200);
        doc.text('HOJA DE VIDA DEPORTIVA E HISTORIAL INTEGRAL', margin + 22, 18);

        // Section Title (Right Aligned)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(255, 255, 255);
        doc.text(titleText.toUpperCase(), pageWidth - margin, 15, { align: 'right' });
      };

      // Helper function to draw footer on every page
      const drawFooter = (pageNum: number, totalPages: number) => {
        doc.setFillColor(248, 250, 252); // slate-50
        doc.rect(0, pageHeight - 16, pageWidth, 16, 'F');

        doc.setDrawColor(226, 232, 240); // slate-200
        doc.setLineWidth(0.3);
        doc.line(0, pageHeight - 16, pageWidth, pageHeight - 16);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // slate-400
        
        const timestamp = new Date().toLocaleString('es-CL');
        doc.text(`Generado el: ${timestamp}`, margin, pageHeight - 8);
        doc.text(`La Roja Performance Hub — Confidencial`, pageWidth / 2, pageHeight - 8, { align: 'center' });
        doc.text(`Página ${pageNum} de ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
      };

      // Define some coordinates to place the content
      let yPos = 38;

      // ==========================================
      // PAGE 1: RESUMEN BIOGRÁFICO Y ESTADÍSTICO
      // ==========================================
      drawHeader(1, 'Expediente del Atleta');

      // Athlete Bio Box
      doc.setFillColor(248, 250, 252); // slate-50
      doc.roundedRect(margin, yPos, contentWidth, 54, 4, 4, 'F');
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.5);
      doc.roundedRect(margin, yPos, contentWidth, 54, 4, 4, 'S');

      // Left bar in Chile red
      doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.rect(margin, yPos, 4, 54, 'F');

      // Name & Position
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(`${profileData.nombre} ${profileData.apellido1} ${profileData.apellido2 || ''}`.toUpperCase(), margin + 10, yPos + 10);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.text(profileData.posicion ? profileData.posicion.toUpperCase() : 'S/D', margin + 10, yPos + 16);

      // Bio detail grid
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139); // slate-500

      // Column 1
      doc.text('Club de Origen:', margin + 10, yPos + 26);
      doc.text('Clase (Año):', margin + 10, yPos + 32);
      doc.text('Categoría Inferred:', margin + 10, yPos + 38);
      doc.text('ID Único de Atleta:', margin + 10, yPos + 44);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 65, 85); // slate-700
      doc.text(profileData.club || 'S/D', margin + 45, yPos + 26);
      doc.text(String(profileData.anio || 'N/A'), margin + 45, yPos + 32);
      doc.text((inferredCategory || 'S/D').toUpperCase().replace('_', ' '), margin + 45, yPos + 38);
      doc.text(String(profileData.player_id), margin + 45, yPos + 44);

      // Column 2
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text('F. Nacimiento:', margin + 100, yPos + 26);
      doc.text('Perfil de Pierna:', margin + 100, yPos + 32);
      doc.text('Estado de Salud:', margin + 100, yPos + 38);
      doc.text('Última Actualización:', margin + 100, yPos + 44);

      // Health status calculation
      const activeInjuries = medicalHistory.injuries.filter(i => (i.estado && i.estado.toLowerCase().includes('activo')) || i.estado === 'Vigente');
      const isLesionado = activeInjuries.length > 0;
      const healthStatus = isLesionado ? 'LESIONADO' : 'APTO / DISPONIBLE';

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(isLesionado ? accentColor[0] : 16, 185, 129); // red or green
      doc.text(healthStatus, margin + 138, yPos + 38);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 65, 85); // slate-700
      doc.text(profileData.fecha_nacimiento || 'S/D', margin + 138, yPos + 26);
      doc.text(profileData.perfil_pierna || 'S/D', margin + 138, yPos + 32);
      doc.text(new Date().toLocaleDateString('es-CL'), margin + 138, yPos + 44);

      yPos += 66;

      // Title Section: Resumen del Rendimiento
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('RESUMEN ESTADÍSTICO DE RENDIMIENTO', margin, yPos);
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.8);
      doc.line(margin, yPos + 2, margin + 45, yPos + 2);

      yPos += 8;

      // Stat Cards Grid
      const statsRows = [
        [
          { content: 'CONVOCATORIA', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
          { content: `${stats.citaciones} Citaciones`, styles: { fontStyle: 'bold' } },
          { content: 'HISTORIAL FÍSICO (GPS)', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
          { content: `${stats.entrenamientos} Entrenamientos`, styles: { fontStyle: 'bold' } }
        ],
        [
          { content: 'COMPETENCIA', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
          { content: `${stats.partidos} Partidos Jugados`, styles: { fontStyle: 'bold' } },
          { content: 'VOLUMEN TOTAL GPS', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
          { content: `${(stats.distanciaGps / 1000).toFixed(2)} km Recorridos`, styles: { fontStyle: 'bold' } }
        ],
        [
          { content: 'VELOCIDAD MÁXIMA', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
          { content: `${stats.velocidadMax.toFixed(1)} km/h`, styles: { fontStyle: 'bold', textColor: accentColor } },
          { content: 'INTENSIDAD (HSR)', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
          { content: `${stats.hsr.toLocaleString('es-CL')} metros (>20 km/h)`, styles: { fontStyle: 'bold' } }
        ],
        [
          { content: 'CANTIDAD SPRINTS', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
          { content: `${stats.sprints} Sprints registrados`, styles: { fontStyle: 'bold' } },
          { content: 'TIEMPO TOTAL EN CANCHA', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
          { content: `${stats.minutosGps} Minutos registrados`, styles: { fontStyle: 'bold' } }
        ]
      ];

      autoTable(doc, {
        startY: yPos,
        margin: { left: margin, right: margin },
        body: statsRows as any,
        theme: 'grid',
        styles: {
          fontSize: 8.5,
          cellPadding: 4,
          valign: 'middle',
          textColor: [51, 65, 85],
          lineColor: [226, 232, 240]
        },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 51 },
          2: { cellWidth: 40 },
          3: { cellWidth: 51 }
        }
      });

      yPos = (doc as any).lastAutoTable.finalY + 12;

      // Latest Physical Benchmarks Section
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('HUELLAS Y UMBRALES DE EVALUACIÓN FÍSICA', margin, yPos);
      doc.line(margin, yPos + 2, margin + 45, yPos + 2);

      yPos += 8;

      const latestAnthroRow = latestAnthro ? `${latestAnthro.masa_muscular_pct}% Muscular / ${latestAnthro.masa_adiposa_pct}% Adiposa` : 'No registrado';
      const latestVo2Row = latestVo2 ? `${latestVo2.vo2_max} ml/kg/min` : 'No registrado';
      const latestImtpRow = latestImtp ? `${latestImtp.imtp_fuerza_n} N (${latestImtp.imtp_f_relativa_n_kg} N/kg)` : 'No registrado';
      const latestSpeedRow = latestSpeed ? `${latestSpeed.tiempo_total} s (en ${latestSpeed.distancia_m}m)` : 'No registrado';

      // Calculate cohort levels for physical benchmarks
      const pctAnthro = latestAnthro ? getPDFPercentile(Number(latestAnthro.masa_muscular_pct), globalAntro, 'masa_muscular_pct') : 50;
      const lvlAnthro = getPDFLevelInfo(pctAnthro);

      const pctVo2 = latestVo2 ? getPDFPercentile(Number(latestVo2.vo2_max), globalVo2, 'vo2_max') : 50;
      const lvlVo2 = getPDFLevelInfo(pctVo2);

      const pctImtp = latestImtp ? getPDFPercentile(Number(latestImtp.imtp_f_relativa_n_kg), globalImtp, 'imtp_f_relativa_n_kg') : 50;
      const lvlImtp = getPDFLevelInfo(pctImtp);

      const pctSpeed = latestSpeed ? getPDFPercentile(Number(latestSpeed.tiempo_total), globalSpeed, 'tiempo_total', true) : 50;
      const lvlSpeed = getPDFLevelInfo(pctSpeed);

      const physicalBenchmarksBody = [
        ['EVALUACIÓN', 'MÉTRICA / VALOR', 'FECHA DE MEDICIÓN', 'NIVEL DE COHORTE'],
        [
          'Antropometría (Masa Corporal)', 
          latestAnthroRow, 
          latestAnthro?.fecha_medicion || 'N/A', 
          latestAnthro ? { content: lvlAnthro.label.toUpperCase(), styles: { fontStyle: 'bold', fillColor: lvlAnthro.color, textColor: lvlAnthro.textColor, halign: 'center' } } : 'S/D'
        ],
        [
          'Capacidad Aeróbica (VO2 Máx)', 
          latestVo2Row, 
          latestVo2?.fecha || 'N/A', 
          latestVo2 ? { content: lvlVo2.label.toUpperCase(), styles: { fontStyle: 'bold', fillColor: lvlVo2.color, textColor: lvlVo2.textColor, halign: 'center' } } : 'S/D'
        ],
        [
          'Fuerza Isométrica (IMTP)', 
          latestImtpRow, 
          latestImtp?.fecha_test || 'N/A', 
          latestImtp ? { content: lvlImtp.label.toUpperCase(), styles: { fontStyle: 'bold', fillColor: lvlImtp.color, textColor: lvlImtp.textColor, halign: 'center' } } : 'S/D'
        ],
        [
          'Velocidad Lineal (Sprint)', 
          latestSpeedRow, 
          latestSpeed?.fecha || 'N/A', 
          latestSpeed ? { content: lvlSpeed.label.toUpperCase(), styles: { fontStyle: 'bold', fillColor: lvlSpeed.color, textColor: lvlSpeed.textColor, halign: 'center' } } : 'S/D'
        ]
      ];

      autoTable(doc, {
        startY: yPos,
        margin: { left: margin, right: margin },
        head: [physicalBenchmarksBody[0]],
        body: physicalBenchmarksBody.slice(1),
        theme: 'striped',
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontSize: 8.5,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 8,
          cellPadding: 4,
          textColor: [51, 65, 85],
          lineColor: [226, 232, 240]
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 50 },
          1: { cellWidth: 55 },
          2: { cellWidth: 40 },
          3: { cellWidth: 37 }
        }
      });

      drawFooter(1, 6);

      // ==========================================
      // PAGE 2: CITACIONES Y MICROCICLOS
      // ==========================================
      doc.addPage();
      yPos = 38;
      drawHeader(2, 'Citaciones y Convocatorias');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('CONVOCATORIAS Y PARTICIPACIÓN DEL ATLETA', margin, yPos);
      doc.line(margin, yPos + 2, margin + 45, yPos + 2);

      yPos += 8;

      const citationRows = citations.map(c => [
        c.fecha_citacion || 'S/D',
        c.microcycles ? `Microciclo #${c.microcycles.micro_number} - ${c.microcycles.type || 'S/T'}` : 'S/D',
        c.microcycles?.category_id ? (REVERSE_CATEGORY_ID_MAP[c.microcycles.category_id] || `CAT ${c.microcycles.category_id}`).toUpperCase().replace('_', ' ') : 'S/D',
        c.microcycles ? `${c.microcycles.start_date || ''} al ${c.microcycles.end_date || ''}` : 'S/D',
        c.microcycles?.city || 'S/D',
        c.observacion || 'Sin observaciones'
      ]);

      autoTable(doc, {
        startY: yPos,
        margin: { left: margin, right: margin },
        head: [['FECHA CITACIÓN', 'MICROCICLO', 'CATEGORÍA', 'PERIODO', 'CIUDAD / SEDE', 'OBSERVACIÓN']],
        body: citationRows.length > 0 ? citationRows : [['-', 'No se registran convocatorias para este atleta', '-', '-', '-', '-']],
        theme: 'striped',
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontSize: 8.5,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 8,
          cellPadding: 4,
          textColor: [51, 65, 85],
          lineColor: [226, 232, 240]
        },
        columnStyles: {
          0: { cellWidth: 26 },
          1: { cellWidth: 38 },
          2: { cellWidth: 24 },
          3: { cellWidth: 34 },
          4: { cellWidth: 24 },
          5: { cellWidth: 36 }
        }
      });

      drawFooter(2, 6);

      // ==========================================
      // PAGE 3: RENDIMIENTO FÍSICO Y GPS
      // ==========================================
      doc.addPage();
      yPos = 38;
      drawHeader(3, 'Física y Datos GPS');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('MÁXIMOS HISTÓRICOS Y PUNTAS DE GPS', margin, yPos);
      doc.line(margin, yPos + 2, margin + 45, yPos + 2);

      yPos += 8;

      const maxDist = safeMax(gpsStats.map(g => Number(g.dist_total_m) || 0));
      const maxVelGPS = safeMax(gpsStats.map(g => Number(g.vel_max_kmh) || Number(g.velocidad_max) || 0));
      const maxMMin = safeMax(gpsStats.map(g => Number(g.m_por_min) || (Number(g.minutos) > 0 ? (Number(g.dist_total_m) / Number(g.minutos)) : 0)));
      const maxHsr = safeMax(gpsStats.map(g => Number(g.dist_mai_m_20_kmh) || 0));
      const maxSprintDist = safeMax(gpsStats.map(g => Number(g.dist_sprint_m_25_kmh) || 0));
      const maxSprints = safeMax(gpsStats.map(g => Number(g.sprints_n) || 0));
      const maxAccDec = safeMax(gpsStats.map(g => Number(g.acc_decc_ai_n) || 0));

      const gpsMaxRows = [
        ['DISTANCIA MÁXIMA EN SESIÓN', `${maxDist.toLocaleString('es-CL')} metros`, 'VELOCIDAD MÁXIMA (VEL. PUNTA)', `${maxVelGPS.toFixed(1)} km/h`],
        ['DENSIDAD MÁXIMA (M/MIN)', `${maxMMin.toFixed(1)} m/min`, 'HSR MÁXIMO (>20 KM/H)', `${maxHsr.toLocaleString('es-CL')} metros`],
        ['DIST. SPRINT MÁX (>25 KM/H)', `${maxSprintDist.toLocaleString('es-CL')} metros`, 'CANTIDAD DE SPRINTS SESIÓN', `${maxSprints} sprints`],
        ['ACEL/DECEL ALTA INTENSIDAD', `${maxAccDec} eventos`, 'ESTADO GENERAL DEL PERFIL', 'Mapeo completo de GPS']
      ];

      autoTable(doc, {
        startY: yPos,
        margin: { left: margin, right: margin },
        body: gpsMaxRows,
        theme: 'grid',
        styles: {
          fontSize: 8.5,
          cellPadding: 4,
          textColor: [51, 65, 85],
          lineColor: [226, 232, 240]
        },
        columnStyles: {
          0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 46 },
          1: { cellWidth: 45 },
          2: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 46 },
          3: { cellWidth: 45 }
        }
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('HISTORIAL DE REGISTROS DE SESIONES GPS', margin, yPos);
      doc.line(margin, yPos + 2, margin + 45, yPos + 2);

      yPos += 8;

      const gpsLogRows = gpsStats.slice(0, 15).map(g => [
        g.fecha || 'N/A',
        g.tipo_sesion || g.tipo || 'ENTRENAMIENTO',
        g.minutos ? `${g.minutos} min` : 'S/D',
        g.dist_total_m ? `${Number(g.dist_total_m).toLocaleString('es-CL')} m` : '-',
        g.m_por_min ? `${Number(g.m_por_min).toFixed(1)}` : (g.minutos && g.dist_total_m ? (Number(g.dist_total_m)/Number(g.minutos)).toFixed(1) : '-'),
        g.vel_max_kmh || g.velocidad_max ? `${(Number(g.vel_max_kmh) || Number(g.velocidad_max) || 0).toFixed(1)}` : '-',
        g.dist_mai_m_20_kmh ? `${Number(g.dist_mai_m_20_kmh).toLocaleString('es-CL')} m` : '-',
        g.sprints_n !== undefined ? String(g.sprints_n) : '-'
      ]);

      autoTable(doc, {
        startY: yPos,
        margin: { left: margin, right: margin },
        head: [['FECHA', 'TIPO', 'MINS', 'DISTANCIA', 'M/MIN', 'VEL MAX', 'HSR (>20)', 'SPRINTS']],
        body: gpsLogRows.length > 0 ? gpsLogRows : [['-', 'No se registran datos GPS en base para este jugador', '-', '-', '-', '-', '-', '-']],
        theme: 'striped',
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontSize: 8.5,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 8,
          cellPadding: 4,
          textColor: [51, 65, 85],
          lineColor: [226, 232, 240]
        },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 32 },
          2: { cellWidth: 15 },
          3: { cellWidth: 23 },
          4: { cellWidth: 20 },
          5: { cellWidth: 20 },
          6: { cellWidth: 25 },
          7: { cellWidth: 25 }
        }
      });

      drawFooter(3, 6);

      // ==========================================
      // PAGE 4: CONTROL DIARIO, BIENESTAR Y CARGA
      // ==========================================
      // PAGE 4: CONTROL DIARIO, BIENESTAR Y CARGA
      // ==========================================
      doc.addPage();
      yPos = 38;
      drawHeader(4, 'Bienestar y Cargas');

      // Draw beautiful dynamic vector chart of Check-In vs Check-Out
      const last8Entries = [...combinedChartData]
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-8); // take the latest 8 chronological days

      if (last8Entries.length > 0) {
        const chartHeight = 44;
        const chartWidth = contentWidth;
        
        // Background card
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(margin, yPos, chartWidth, chartHeight, 3, 3, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.roundedRect(margin, yPos, chartWidth, chartHeight, 3, 3, 'S');

        // Title & Legend in header of the card
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(51, 65, 85);
        doc.text('TENDENCIA DIARIA (ÚLTIMOS 8 REGISTROS)', margin + 6, yPos + 6);

        // Legend
        // Check-In (Blue)
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.circle(margin + 94, yPos + 5, 1.5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text('CHECK-IN (BIENESTAR)', margin + 97, yPos + 6);

        // Check-Out (Red)
        doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.rect(margin + 138, yPos + 3.8, 3, 3, 'F');
        doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.text('CHECK-OUT (RPE)', margin + 143, yPos + 6);

        // Draw Plot Area
        const px = margin + 12;
        const py = yPos + 11;
        const pw = chartWidth - 20;
        const ph = chartHeight - 20;

        // Draw Gridlines and Y-axis labels
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184); // slate-400
        
        const gridLevels = [2, 4, 6, 8, 10];
        gridLevels.forEach(lvl => {
          const gy = py + ph - ((lvl / 10) * ph);
          // Gridline
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.15);
          doc.line(px, gy, px + pw, gy);
          // Label
          doc.text(String(lvl), px - 4, gy + 1.5, { align: 'right' });
        });

        // Plot data lines
        const pointsCheckIn: {x: number, y: number, val: number}[] = [];
        const pointsCheckOut: {x: number, y: number, val: number}[] = [];
        const stepX = pw / (last8Entries.length - 1 || 1);

        last8Entries.forEach((entry, idx) => {
          const cx = px + (idx * stepX);
          
          // Check-In point
          const valIn = entry.checkIn || 0;
          const cyIn = py + ph - ((valIn / 10) * ph);
          if (valIn > 0) {
            pointsCheckIn.push({ x: cx, y: cyIn, val: valIn });
          }

          // Check-Out point
          const valOut = entry.checkOutRPE || 0;
          const cyOut = py + ph - ((valOut / 10) * ph);
          if (valOut > 0) {
            pointsCheckOut.push({ x: cx, y: cyOut, val: valOut });
          }

          // Draw X-axis Date label (e.g. "05/08")
          const dateStr = entry.date ? entry.date.split('-').slice(1, 3).reverse().join('/') : '';
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.5);
          doc.setTextColor(100, 116, 139);
          doc.text(dateStr, cx, py + ph + 6, { align: 'center' });
        });

        // Draw Check-In line
        if (pointsCheckIn.length > 1) {
          doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
          doc.setLineWidth(0.8);
          for (let i = 0; i < pointsCheckIn.length - 1; i++) {
            doc.line(pointsCheckIn[i].x, pointsCheckIn[i].y, pointsCheckIn[i + 1].x, pointsCheckIn[i + 1].y);
          }
        }
        // Draw Check-In dots
        pointsCheckIn.forEach(pt => {
          doc.setFillColor(255, 255, 255);
          doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
          doc.setLineWidth(1);
          doc.circle(pt.x, pt.y, 2, 'FD'); // filled circle with white center
          
          // Draw small value above dot
          doc.setFont('helvetica', 'black');
          doc.setFontSize(5.5);
          doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
          doc.text(pt.val.toFixed(1), pt.x, pt.y - 3, { align: 'center' });
        });

        // Draw Check-Out line
        if (pointsCheckOut.length > 1) {
          doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
          doc.setLineWidth(0.8);
          for (let i = 0; i < pointsCheckOut.length - 1; i++) {
            doc.line(pointsCheckOut[i].x, pointsCheckOut[i].y, pointsCheckOut[i + 1].x, pointsCheckOut[i + 1].y);
          }
        }
        // Draw Check-Out dots
        pointsCheckOut.forEach(pt => {
          doc.setFillColor(255, 255, 255);
          doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
          doc.setLineWidth(1);
          doc.rect(pt.x - 1.5, pt.y - 1.5, 3, 3, 'FD');
          
          // Draw small value below dot
          doc.setFont('helvetica', 'black');
          doc.setFontSize(5.5);
          doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
          doc.text(String(pt.val), pt.x, pt.y + 4.5, { align: 'center' });
        });

        yPos += chartHeight + 10;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('DETALLE DE BIENESTAR DIARIO (CHECK-IN)', margin, yPos);
      doc.line(margin, yPos + 2, margin + 45, yPos + 2);

      yPos += 8;

      const wellnessRows = wellnessData.slice(0, 5).map(w => {
        const score = [w.fatiga, w.sueno, w.dolor, w.estres, w.animo].filter(v => v > 0);
        const avg = score.length > 0 ? (score.reduce((sum, v) => sum + v, 0) / score.length).toFixed(1) : '-';
        return [
          w.date || 'S/D',
          avg,
          w.fatiga ? `${w.fatiga}/10` : '-',
          w.sueno ? `${w.sueno}/10` : '-',
          w.dolor ? `${w.dolor}/10` : '-',
          w.estres ? `${w.estres}/10` : '-',
          w.animo ? `${w.animo}/10` : '-'
        ];
      });

      autoTable(doc, {
        startY: yPos,
        margin: { left: margin, right: margin },
        head: [['FECHA', 'PROM. BIENESTAR', 'FATIGA', 'SUEÑO', 'DOLOR MUSCULAR', 'ESTRÉS', 'ÁNIMO']],
        body: wellnessRows.length > 0 ? wellnessRows : [['-', 'No se registran datos de Bienestar para este jugador', '-', '-', '-', '-', '-']],
        theme: 'striped',
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontSize: 8.5,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 8,
          cellPadding: 3.5,
          textColor: [51, 65, 85],
          lineColor: [226, 232, 240]
        },
        columnStyles: {
          0: { cellWidth: 26 },
          1: { cellWidth: 32, fontStyle: 'bold' },
          2: { cellWidth: 25 },
          3: { cellWidth: 25 },
          4: { cellWidth: 30 },
          5: { cellWidth: 22 },
          6: { cellWidth: 22 }
        }
      });

      yPos = (doc as any).lastAutoTable.finalY + 8;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('DETALLE DE ESFUERZO PERCIBIDO (CHECK-OUT)', margin, yPos);
      doc.line(margin, yPos + 2, margin + 45, yPos + 2);

      yPos += 8;

      const combinedLoads = [...trainingData, ...matchData]
        .sort((a, b) => (b.session_date || '').localeCompare(a.session_date || ''))
        .slice(0, 5);

      const loadRows = combinedLoads.map(l => [
        l.session_date || 'S/D',
        l.type === 'MATCH' ? 'PARTIDO' : 'ENTRENAMIENTO',
        l.duration_min ? `${l.duration_min} min` : 'S/D',
        l.rpe ? `${l.rpe}/10` : '-',
        l.srpe ? `${l.srpe} u.a.` : (l.rpe && l.duration_min ? `${Number(l.rpe) * Number(l.duration_min)} u.a.` : '-')
      ]);

      autoTable(doc, {
        startY: yPos,
        margin: { left: margin, right: margin },
        head: [['FECHA', 'TIPO DE SESIÓN', 'DURACIÓN', 'RPE', 'CARGA INTERNA (sRPE)']],
        body: loadRows.length > 0 ? loadRows : [['-', 'No se registran datos de Carga Interna para este jugador', '-', '-', '-']],
        theme: 'striped',
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontSize: 8.5,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 8,
          cellPadding: 3.5,
          textColor: [51, 65, 85],
          lineColor: [226, 232, 240]
        },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 40 },
          2: { cellWidth: 30 },
          3: { cellWidth: 25 },
          4: { cellWidth: 52, fontStyle: 'bold' }
        }
      });

      drawFooter(4, 6);

      // ==========================================
      // PAGE 5: COMPETENCIA Y PARTIDOS
      // ==========================================
      doc.addPage();
      yPos = 38;
      drawHeader(5, 'Partidos y Minutos');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('PARTIDOS JUGADOS Y MINUTOS DE COMPETENCIA', margin, yPos);
      doc.line(margin, yPos + 2, margin + 45, yPos + 2);

      yPos += 8;

      const competitorRows = matchReports.slice(0, 15).map(mr => {
        const rival = mr.rival || 'Rival no especificado';
        const matchTitle = mr.categoria_rival ? `${rival} (${mr.categoria_rival})` : rival;
        return [
          mr.fecha || mr.date || 'S/D',
          matchTitle,
          mr.minutos_jugados !== undefined ? `${mr.minutos_jugados} min` : 'S/D',
          mr.titular === true ? 'TITULAR' : (mr.titular === false ? 'SUPLENTE' : 'S/D'),
          mr.goles !== undefined ? String(mr.goles) : '0',
          mr.asistencias !== undefined ? String(mr.asistencias) : '0',
          mr.calificacion_rendimiento ? `${mr.calificacion_rendimiento}/10` : '-'
        ];
      });

      autoTable(doc, {
        startY: yPos,
        margin: { left: margin, right: margin },
        head: [['FECHA', 'PARTIDO / ENCUENTRO', 'MINS JUGADOS', 'ESTADO', 'GOLES', 'ASISTENCIAS', 'NOTA']],
        body: competitorRows.length > 0 ? competitorRows : [['-', 'No se registran informes de partido para este jugador', '-', '-', '-', '-', '-']],
        theme: 'striped',
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontSize: 8.5,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 8,
          cellPadding: 4,
          textColor: [51, 65, 85],
          lineColor: [226, 232, 240]
        },
        columnStyles: {
          0: { cellWidth: 24 },
          1: { cellWidth: 55 },
          2: { cellWidth: 26 },
          3: { cellWidth: 24 },
          4: { cellWidth: 16 },
          5: { cellWidth: 22 },
          6: { cellWidth: 15 }
        }
      });

      drawFooter(5, 6);

      // ==========================================
      // PAGE 6: HISTORIAL MÉDICO, LESIONES Y SALUD
      // ==========================================
      doc.addPage();
      yPos = 38;
      drawHeader(6, 'Historial Médico y Lesiones');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('HISTORIAL DE LESIONES REGISTRADAS', margin, yPos);
      doc.line(margin, yPos + 2, margin + 45, yPos + 2);

      yPos += 8;

      const injuryLogRows = medicalHistory.injuries.map(i => [
        i.fecha_inicio || 'S/D',
        i.tipo_lesion || i.diagnostico_clinico || 'Lesión',
        i.localizacion || 'General',
        i.lado ? String(i.lado).toUpperCase() : '-',
        i.gravedad ? String(i.gravedad).toUpperCase() : '-',
        i.estado ? String(i.estado).toUpperCase() : 'FINALIZADO',
        i.fecha_alta || '-'
      ]);

      autoTable(doc, {
        startY: yPos,
        margin: { left: margin, right: margin },
        head: [['FECHA INICIO', 'DIAGNÓSTICO CLINICO', 'LOCALIZACIÓN', 'LADO', 'GRAVEDAD', 'ESTADO', 'FECHA ALTA']],
        body: injuryLogRows.length > 0 ? injuryLogRows : [['-', 'No se registran lesiones para este atleta', '-', '-', '-', '-', '-']],
        theme: 'striped',
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontSize: 8.5,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 8,
          cellPadding: 4,
          textColor: [51, 65, 85],
          lineColor: [226, 232, 240]
        },
        columnStyles: {
          0: { cellWidth: 24 },
          1: { cellWidth: 44 },
          2: { cellWidth: 30 },
          3: { cellWidth: 16 },
          4: { cellWidth: 22 },
          5: { cellWidth: 22 },
          6: { cellWidth: 24 }
        }
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('ATENCIONES MÉDICAS, DIAGNÓSTICOS Y TRATAMIENTOS', margin, yPos);
      doc.line(margin, yPos + 2, margin + 45, yPos + 2);

      yPos += 8;

      // Combine daily medical reports and treatments
      const medicalEvents: any[] = [];
      medicalHistory.reports.forEach(r => {
        medicalEvents.push({
          date: r.report_date || '',
          type: 'Parte Médico',
          desc: r.diagnostico_medico || 'Evaluación médica',
          obs: r.observation || r.observacion || '-',
          sev: r.severity ? r.severity.toUpperCase() : 'LOW'
        });
      });
      medicalHistory.treatments.forEach(t => {
        medicalEvents.push({
          date: t.treatment_date || '',
          type: 'Kinesiología',
          desc: 'Tratamiento kinésico aplicado',
          obs: t.description || '-',
          sev: '-'
        });
      });

      // Sort by date descending
      medicalEvents.sort((a, b) => b.date.localeCompare(a.date));

      const eventRows = medicalEvents.slice(0, 12).map(e => [
        e.date || 'S/D',
        e.type,
        e.desc,
        e.obs,
        e.sev
      ]);

      autoTable(doc, {
        startY: yPos,
        margin: { left: margin, right: margin },
        head: [['FECHA', 'TIPO DE EVENTO', 'DESCRIPCIÓN / EVALUACIÓN', 'OBSERVACIÓN / DETALLE', 'SEVERIDAD']],
        body: eventRows.length > 0 ? eventRows : [['-', 'No se registran eventos médicos para este jugador', '-', '-', '-']],
        theme: 'striped',
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontSize: 8.5,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 8,
          cellPadding: 4,
          textColor: [51, 65, 85],
          lineColor: [226, 232, 240]
        },
        columnStyles: {
          0: { cellWidth: 24 },
          1: { cellWidth: 32 },
          2: { cellWidth: 50 },
          3: { cellWidth: 60 },
          4: { cellWidth: 16 }
        }
      });

      drawFooter(6, 6);

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
        if (newItem['Peak Vertical Force [N]'] !== undefined && newItem['Peak Vertical Force [N]'] !== null) {
          newItem.imtp_fuerza_n = Number(newItem['Peak Vertical Force [N]']);
        }
        if (newItem['Peak Vertical Force / BM [N/kg]'] !== undefined && newItem['Peak Vertical Force / BM [N/kg]'] !== null) {
          newItem.imtp_f_relativa_n_kg = Number(newItem['Peak Vertical Force / BM [N/kg]']);
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

      const matchYear = filterYear.length === 0 || filterYear.includes(String(playerYear));
      const matchPosition = filterPosition.length === 0 || filterPosition.includes(String(playerPos));
      const matchClub = filterClubId.length === 0 || filterClubId.includes(String(playerClubId));
      
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
