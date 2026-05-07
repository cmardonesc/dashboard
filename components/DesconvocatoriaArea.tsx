import React, { useState, useMemo, useEffect } from 'react'
import { User, UserRole, Category, CATEGORY_ID_MAP } from '../types'
import { FEDERATION_LOGO } from '../constants'
import { getDriveDirectLink } from '../lib/utils'
import { supabase } from '../lib/supabase'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import JSZip from 'jszip'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  ComposedChart,
  LabelList
} from 'recharts'

type ViewMode = 'grid' | 'details' | 'report' | 'club_list' | 'club_print'

interface MicrocicloBajas {
  id: number
  micro_number?: number
  type: string
  nombre_display: string
  category_id: number
  start_date: string
  end_date: string
  city: string
  country: string
  jugadoresCount?: number
}

interface HistoricalData {
  wellness: any[]
  loads: any[]
  gps: any[]
  medical: any[]
}

interface ClubGroup {
  name: string
  players: User[]
}

export default function DesconvocatoriaArea() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedMicro, setSelectedMicro] = useState<MicrocicloBajas | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingPlayers, setLoadingPlayers] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilters, setCategoryFilters] = useState<string[]>(['TODOS'])

  const toggleCategoryFilter = (cat: string) => {
    setCategoryFilters(prev => {
      if (cat === 'TODOS') return ['TODOS'];
      const newSelection = prev.includes(cat)
        ? prev.filter(c => c !== cat)
        : [...prev.filter(c => c !== 'TODOS'), cat];
      return newSelection.length === 0 ? ['TODOS'] : newSelection;
    });
  };
  
  const [microciclos, setMicrociclos] = useState<MicrocicloBajas[]>([])
  const [citedPlayers, setCitedPlayers] = useState<User[]>([])

  const [processingBajaAtleta, setProcessingBajaAtleta] = useState<User | null>(null)
  const [selectedClubForPrint, setSelectedClubForPrint] = useState<ClubGroup | null>(null)
  const [historicalData, setHistoricalData] = useState<HistoricalData>({ wellness: [], loads: [], gps: [], medical: [] })
  
  // Para reporte por club: datos de todos los jugadores del club
  const [clubHistoryData, setClubHistoryData] = useState<Record<number, HistoricalData>>({})
  const [bajaReason, setBajaReason] = useState('Desgarro Isquiotibial izquierdo');
  const [zipProgress, setZipProgress] = useState<{current: number, total: number} | null>(null);

  useEffect(() => {
    fetchMicrocycles()
  }, [])

  const fetchMicrocycles = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('microcycles')
        .select('*')
        .order('start_date', { ascending: false })

      if (error) throw error

      if (data) {
        const { data: citCounts } = await supabase.from('citaciones').select('microcycle_id');
        const countsMap: Record<number, number> = {};
        citCounts?.forEach((c: any) => {
          countsMap[c.microcycle_id] = (countsMap[c.microcycle_id] || 0) + 1;
        });

        const mapped = data.map((m: any) => ({
          ...m,
          nombre_display: 'MICROCICLO',
          city: m.city || 'SANTIAGO',
          country: m.country || 'CHILE',
          jugadoresCount: countsMap[m.id] || 0
        }))
        setMicrociclos(mapped)
      }
    } catch (err) {
      console.error("Error cargando microciclos:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchCitedPlayers = async (microId: number) => {
    setLoadingPlayers(true)
    try {
      const { data, error } = await supabase
        .from('citaciones')
        .select(`
          player_id,
          players (
            id_del_jugador,
            nombre,
            apellido1,
            club,
            posicion,
            anio
          )
        `)
      .eq('microcycle_id', microId)

      if (error) throw error
      if (data) {
        const mapped: User[] = data.map((d: any) => {
          // Inferir categoría si falta
          let category = '';
          if (d.players.anio) {
            const age = 2026 - d.players.anio;
            if (age <= 13) category = Category.SUB_13;
            else if (age === 14) category = Category.SUB_14;
            else if (age === 15) category = Category.SUB_15;
            else if (age === 16) category = Category.SUB_16;
            else if (age === 17) category = Category.SUB_17;
            else if (age === 18) category = Category.SUB_18;
            else if (age <= 20) category = Category.SUB_20;
            else if (age <= 21) category = Category.SUB_21;
            else if (age <= 23) category = Category.SUB_23;
            else category = Category.ADULTA;
          } else {
            category = Category.SUB_17;
          }

          return {
            id: `p-${d.players.id_del_jugador}`,
            id_del_jugador: d.players.id_del_jugador,
            name: `${d.players.nombre} ${d.players.apellido1}`,
            role: UserRole.PLAYER,
            club: d.players.club || 'SIN CLUB',
            position: d.players.posicion || 'N/A',
            category: category,
            anio: d.players.anio
          };
        })
        setCitedPlayers(mapped)
      }
    } catch (err) {
      console.error("Error cargando citados:", err)
    } finally {
      setLoadingPlayers(false)
    }
  }

  const fetchAthleteHistory = async (playerId: number, start: string, end: string) => {
    try {
      const { data: wellnessRaw } = await supabase
        .from('wellness_checkin')
        .select('*')
        .eq('id_del_jugador', playerId)
        .gte('checkin_date', start)
        .lte('checkin_date', end)
        .order('checkin_date', { ascending: true });

      const { data: loadsRaw } = await supabase
        .from('internal_load')
        .select('*')
        .eq('id_del_jugador', playerId)
        .gte('session_date', start)
        .lte('session_date', end)
        .order('session_date', { ascending: true });

      const { data: gpsRaw } = await supabase
        .from('gps_import')
        .select('*')
        .eq('id_del_jugador', playerId)
        .gte('fecha', start)
        .lte('fecha', end)
        .order('fecha', { ascending: true });

      const { data: medicalRaw } = await supabase
        .from('medical_daily_reports')
        .select('*')
        .eq('id_del_jugador', playerId)
        .gte('report_date', start)
        .lte('report_date', end)
        .order('report_date', { ascending: true });

      const mappedWellness = (wellnessRaw || []).map(w => ({
        date: w.checkin_date,
        fatigue: w.fatigue,
        sleep: w.sleep_quality,
        stress: w.stress,
        soreness: w.soreness,
        mood: w.mood
      }));

      const mappedLoads = (loadsRaw || []).map(l => ({
        date: l.session_date,
        rpe: l.rpe,
        duration: l.duration_min,
        srpe: l.srpe || (l.rpe * l.duration_min)
      }));

      const mappedGps = (gpsRaw || []).map(g => ({
        date: g.fecha,
        minutos: g.minutos || 0,
        dist_total_m: g.dist_total_m || 0,
        m_por_min: g.m_por_min || 0,
        dist_ai_m_15_kmh: g.dist_ai_m_15_kmh || 0,
        dist_mai_m_20_kmh: g.dist_mai_m_20_kmh || 0,
        dist_sprint_m_25_kmh: g.dist_sprint_m_25_kmh || 0,
        sprints_n: g.sprints_n || 0,
        vel_max_kmh: g.vel_max_kmh || 0,
        acc_decc_ai_n: g.acc_decc_ai_n || 0,
        // Assuming columns for max acc/decel if we decide to add them later
        max_acc: g.max_acc || 0, 
        max_decel: g.max_decel || 0
      }));

      const mappedMedical = (medicalRaw || []).map(m => ({
        date: m.report_date,
        observation: m.observation,
        diagnosis: m.diagnostico_medico,
        severity: m.severity
      }));

      return { wellness: mappedWellness, loads: mappedLoads, gps: mappedGps, medical: mappedMedical };
    } catch (err) {
      console.error("Error en historia:", err);
      return { wellness: [], loads: [], gps: [], medical: [] };
    }
  };

  const handleOpenDetails = (mc: MicrocicloBajas) => {
    setSelectedMicro(mc)
    setViewMode('details')
    fetchCitedPlayers(mc.id)
  }

  const handleViewReport = async () => {
    if (processingBajaAtleta && selectedMicro) {
      setLoading(true);
      const history = await fetchAthleteHistory(processingBajaAtleta.id_del_jugador!, selectedMicro.start_date, selectedMicro.end_date);
      setHistoricalData(history);
      setViewMode('report')
      setLoading(false);
    }
  }

  const handleViewClubReport = async (club: ClubGroup) => {
    if (!selectedMicro) return;
    setLoading(true);
    setSelectedClubForPrint(club);
    const historyMap: Record<number, HistoricalData> = {};
    
    for (const p of club.players) {
      if (p.id_del_jugador) {
        historyMap[p.id_del_jugador] = await fetchAthleteHistory(p.id_del_jugador, selectedMicro.start_date, selectedMicro.end_date);
      }
    }
    
    setClubHistoryData(historyMap);
    setLoading(false);
    setViewMode('club_print');
  };

  const confirmDesconvocatoria = async () => {
    if (!processingBajaAtleta || !selectedMicro) return
    if (!window.confirm(`¿Estás seguro de oficializar la baja de ${processingBajaAtleta.name}? Esta acción lo eliminará de la citación.`)) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('citaciones')
        .delete()
        .match({ microcycle_id: selectedMicro.id, player_id: processingBajaAtleta.id_del_jugador });
      
      if (error) throw error;

      alert(`Baja oficial de ${processingBajaAtleta.name} procesada correctamente.`);
      setViewMode('details');
      fetchCitedPlayers(selectedMicro.id);
    } catch (err) {
      console.error(err);
      alert("Error al oficializar la baja.");
    } finally {
      setLoading(false)
    }
  }

  const confirmDesconvocatoriaClub = async (club: ClubGroup) => {
    if (!selectedMicro) return;
    if (!window.confirm(`¿Estás seguro de desconvocar a los ${club.players.length} jugadores de ${club.name}?`)) return;

    setLoading(true);
    try {
      const playerIds = club.players.map(p => p.id_del_jugador).filter(id => id !== undefined);
      
      const { error } = await supabase
        .from('citaciones')
        .delete()
        .eq('microcycle_id', selectedMicro.id)
        .in('player_id', playerIds);

      if (error) throw error;

      alert(`Se ha procesado la baja grupal de ${club.name} (${club.players.length} jugadores).`);
      setViewMode('details');
      fetchCitedPlayers(selectedMicro.id);
    } catch (err) {
      console.error(err);
      alert("Error al procesar la baja grupal.");
    } finally {
      setLoading(false);
    }
  };

  const formatCategoryLabel = (id: any) => {
    if (typeof id === 'string') return id.toUpperCase().replace('_', ' ');
    const entry = Object.entries(CATEGORY_ID_MAP).find(([_, val]) => Number(val) === Number(id));
    return entry ? entry[0].toUpperCase().replace('_', ' ') : 'N/A';
  };

  const downloadReportPDF = async (containerId: string, fileName: string) => {
    if (loading) return;
    setLoading(true);

    const originalScrollPos = window.scrollY;
    window.scrollTo(0, 0);

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const container = document.getElementById(containerId);
      
      if (!container) {
        window.scrollTo(0, originalScrollPos);
        setLoading(false);
        return;
      }

      // Stabilization delay
      await new Promise(resolve => setTimeout(resolve, 800));

      const reportPages = container.querySelectorAll('.player-report-page');
      
      const captureOptions = {
        scale: 2.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 20000,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 1400, // Increased width for breathing room
        onclone: (clonedDoc: Document) => {
          // Force chart visibility and fixed size with internal padding
          const charts = clonedDoc.querySelectorAll('.recharts-responsive-container');
          charts.forEach(c => {
            const el = c as HTMLElement;
            el.style.width = '1000px'; // Larger internal width for the clone
            el.style.height = '400px';
            el.style.visibility = 'visible';
            el.style.display = 'block';
            el.style.padding = '20px';
          });

          // Ensure container is found in the clone
          const target = clonedDoc.getElementById(containerId);
          if (target) {
            target.style.display = 'block';
            target.style.opacity = '1';
          }
        }
      };

      if (reportPages.length === 0) {
        const canvas = await html2canvas(container, captureOptions);
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, Math.min(imgHeight, 297));
      } else {
        for (let i = 0; i < reportPages.length; i++) {
          if (i > 0) pdf.addPage();
          
          const page = reportPages[i] as HTMLElement;
          // Ensure page is "visible" for the browser before capture
          page.scrollIntoView();
          await new Promise(resolve => setTimeout(resolve, 300));

          const canvas = await html2canvas(page, captureOptions);
          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          const imgWidth = 210;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, Math.min(imgHeight, 297));
        }
      }

      pdf.save(fileName);
    } catch (err) {
      console.error("Error al generar PDF:", err);
      alert("No se pudo generar el PDF por un error de renderizado. Por favor intente de nuevo.");
    } finally {
      window.scrollTo(0, originalScrollPos);
      setLoading(false);
    }
  };

  const downloadAllClubsZip = async () => {
    if (!selectedMicro || loading) return;
    
    const confirmZip = window.confirm(`Se generarán reportes ZIP para ${clubGroups.length} equipos. Este proceso puede tardar un minuto. ¿Continuar?`);
    if (!confirmZip) return;

    setLoading(true);
    setZipProgress({ current: 0, total: clubGroups.length });
    
    const zip = new JSZip();
    const originalViewMode = viewMode;
    
    const originalScrollPos = window.scrollY;
    window.scrollTo(0, 0);

    try {
      // Configuraciones de captura (mismas que downloadReportPDF)
      const captureOptions = {
        scale: 2.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 20000,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 1400, 
        onclone: (clonedDoc: Document) => {
          const charts = clonedDoc.querySelectorAll('.recharts-responsive-container');
          charts.forEach(c => {
            const el = c as HTMLElement;
            el.style.width = '1000px';
            el.style.height = '400px';
            el.style.visibility = 'visible';
            el.style.display = 'block';
            el.style.padding = '20px';
          });
          const target = clonedDoc.getElementById('club-report-container');
          if (target) {
            target.style.display = 'block';
            target.style.opacity = '1';
          }
        }
      };

      for (let i = 0; i < clubGroups.length; i++) {
        const group = clubGroups[i];
        setZipProgress({ current: i + 1, total: clubGroups.length });
        
        // 1. Preparar datos
        setSelectedClubForPrint(group);
        const historyMap: Record<number, HistoricalData> = {};
        for (const p of group.players) {
          if (p.id_del_jugador) {
            historyMap[p.id_del_jugador] = await fetchAthleteHistory(p.id_del_jugador, selectedMicro.start_date, selectedMicro.end_date);
          }
        }
        setClubHistoryData(historyMap);
        
        // 2. Cambiar a modo impresión para que el DOM se genere
        setViewMode('club_print');
        
        // 3. Esperar a que React renderice y Recharts se estabilicen
        await new Promise(resolve => setTimeout(resolve, 1500));

        // 4. Capturar PDF en memoria
        const pdf = new jsPDF('p', 'mm', 'a4');
        const container = document.getElementById('club-report-container');
        
        if (container) {
          const reportPages = container.querySelectorAll('.player-report-page');
          
          if (reportPages.length === 0) {
            const canvas = await html2canvas(container, captureOptions);
            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            pdf.addImage(imgData, 'JPEG', 0, 0, 210, Math.min((canvas.height * 210) / canvas.width, 297));
          } else {
            for (let j = 0; j < reportPages.length; j++) {
              if (j > 0) pdf.addPage();
              const page = reportPages[j] as HTMLElement;
              page.scrollIntoView();
              await new Promise(resolve => setTimeout(resolve, 300));
              const canvas = await html2canvas(page, captureOptions);
              const imgData = canvas.toDataURL('image/jpeg', 0.95);
              pdf.addImage(imgData, 'JPEG', 0, 0, 210, Math.min((canvas.height * 210) / canvas.width, 297));
            }
          }
          
          const clubFileName = `${group.name.replace(/\s+/g, '-').toLowerCase()}.pdf`;
          zip.file(clubFileName, pdf.output('blob'));
        }
      }

      // 5. Generar y descargar ZIP
      const zipContent = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipContent);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reportes-clubes-micro-${selectedMicro.id}.zip`;
      link.click();
      URL.revokeObjectURL(url);
      
      alert("ZIP generado y descargado correctamente.");
    } catch (err) {
      console.error("Error al generar ZIP:", err);
      alert("Hubo un problema al generar el archivo ZIP. Intente descargar los reportes individualmente.");
    } finally {
      window.scrollTo(0, originalScrollPos);
      setViewMode(originalViewMode);
      setLoading(false);
      setZipProgress(null);
    }
  };

  const getClubFileName = () => {
    if (!selectedMicro || !selectedClubForPrint) return "reporte-club.pdf";
    const category = formatCategoryLabel(selectedMicro.category_id).replace(/\s+/g, '-').toLowerCase();
    const micro = selectedMicro.micro_number || selectedMicro.id;
    const club = selectedClubForPrint.name.replace(/\s+/g, '-').toLowerCase();
    return `${category}-micro-${micro}-${club}.pdf`;
  };

  const getIndividualFileName = () => {
    if (!selectedMicro || !processingBajaAtleta) return "reporte-individual.pdf";
    const category = formatCategoryLabel(selectedMicro.category_id).replace(/\s+/g, '-').toLowerCase();
    const micro = selectedMicro.micro_number || selectedMicro.id;
    const player = processingBajaAtleta.name.replace(/\s+/g, '-').toLowerCase();
    return `${category}-micro-${micro}-${player}.pdf`;
  };

  const formatDateShort = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    return `${parts[2]}/${parts[1]}`;
  };

  const getWellnessColor = (val: number) => {
    if (val >= 4.5) return 'bg-emerald-500 text-white';
    if (val >= 3.5) return 'bg-emerald-400 text-slate-900';
    if (val >= 2.5) return 'bg-amber-400 text-slate-900';
    return 'bg-red-500 text-white';
  };

  const clubGroups = useMemo(() => {
    const groups: Record<string, User[]> = {};
    citedPlayers.forEach(p => {
      const clubName = p.club || 'SIN CLUB';
      if (!groups[clubName]) groups[clubName] = [];
      groups[clubName].push(p);
    });
    return Object.entries(groups).map(([name, players]) => ({ name, players }));
  }, [citedPlayers]);

  const filteredMicros = useMemo(() => {
    return microciclos.filter(m => {
      if (categoryFilters.includes('TODOS')) return true;
      return categoryFilters.some(cat => m.category_id === CATEGORY_ID_MAP[cat as Category]);
    });
  }, [microciclos, categoryFilters]);

  // Fix: Explicitly typed PlayerReportSheet as React.FC to handle special React props like 'key' in sub-component render.
  // Componente Reutilizable para la Ficha del Jugador (Formato Oficial)
  const PlayerReportSheet: React.FC<{ player: User; history: HistoricalData }> = ({ player, history }) => {
    const wellnessChartData = history.wellness.map(w => ({
      fecha: formatDateShort(w.date),
      fatiga: w.fatigue,
      animo: w.mood,
      sueno: w.sleep,
      dolor: w.soreness,
      estres: w.stress
    }));

    const loadChartData = history.loads.map(l => ({
      fecha: formatDateShort(l.date),
      srpe: l.srpe
    }));

    const gpsChartData = history.gps.map(g => ({
      fecha: formatDateShort(g.date),
      dist_total: g.dist_total_m,
      dist_15: g.dist_ai_m_15_kmh,
      dist_20: g.dist_mai_m_20_kmh,
      dist_25: g.dist_sprint_m_25_kmh,
      sprints: g.sprints_n,
      acc_dec: g.acc_decc_ai_n
    }));

    const formatNum = (val: any) => {
      if (val === undefined || val === null || isNaN(val)) return '-';
      return Number(val).toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
    };

    const Header = () => (
      <div className="flex justify-between items-start mb-10 border-b-4 border-[#0b1220] pb-6">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 overflow-hidden flex items-center justify-center shrink-0">
            <img 
              src={getDriveDirectLink(FEDERATION_LOGO)} 
              alt="ANFP Logo" 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#0b1220] leading-none uppercase tracking-tighter italic">CERTIFICADO DE<br/><span className="text-[#CF1B2B]">DESCONVOCATORIA</span></h1>
            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-[0.4em] mt-1">DEPARTAMENTO DE SELECCIÓN • FFCH</p>
          </div>
        </div>
        <div className="text-right">
           <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">DOCUMENTO TÉCNICO RESERVADO</p>
           <p className="text-xs font-black text-[#0b1220] uppercase italic tracking-tighter">ID: {player.id.split('-')[1] || 'RA7Z98'}-{selectedMicro?.id || 'A00107'}</p>
        </div>
      </div>
    );

    return (
      <div className="flex flex-col font-sans text-slate-900 player-report-sheet">
        {/* PÁGINA 1: WELLNESS & FATIGA/DOLOR */}
        <div className="bg-white p-12 min-h-[297mm] flex flex-col break-after-page shadow-sm mb-8 print:shadow-none print:mb-0 player-report-page">
          <Header />

          {/* Atleta Info */}
          <div className="grid grid-cols-2 gap-10 mb-8 bg-slate-50 p-8 rounded-[32px]">
            <div>
               <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">IDENTIFICACIÓN DEL ATLETA:</p>
               <p className="text-3xl font-black text-[#0b1220] uppercase italic tracking-tighter leading-none mb-2">{player.name}</p>
               <p className="text-[10px] font-bold text-[#CF1B2B] uppercase tracking-widest">{player.position} | {player.club}</p>
            </div>
            <div className="text-right">
               <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">PERÍODO SELECCIONADO:</p>
               <p className="text-2xl font-black text-[#0b1220] uppercase italic tracking-tighter leading-none">{formatCategoryLabel(selectedMicro?.category_id)}</p>
               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">MICROCICLO Nº {selectedMicro?.micro_number || selectedMicro?.id}</p>
            </div>
          </div>

          {/* Tabla Wellness */}
          <div className="space-y-6 mb-8">
            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em] flex items-center gap-2">
              <i className="fa-solid fa-moon text-blue-500"></i> MONITOREO CHECK-IN ( WELLNESS )
            </h3>
            <div className="rounded-[24px] overflow-hidden border border-slate-100 shadow-sm">
                <table className="w-full text-center text-[10px] border-collapse">
                  <thead className="bg-slate-50 text-slate-400 font-black uppercase tracking-widest border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-4 text-left pl-8">FECHA</th>
                      <th className="px-2 py-4">FATIGA</th>
                      <th className="px-2 py-4">SUEÑO</th>
                      <th className="px-2 py-4">DOLOR</th>
                      <th className="px-2 py-4">ESTRÉS</th>
                      <th className="px-2 py-4 pr-8">ÁNIMO</th>
                    </tr>
                  </thead>
                  <tbody className="font-black text-slate-700 uppercase italic">
                    {history.wellness.map((w, idx) => (
                      <tr key={idx} className="border-b border-slate-50">
                        <td className="px-4 py-3 text-left pl-8 font-bold">{formatDateShort(w.date)}</td>
                        <td className="px-2 py-3"><span className={`inline-block w-12 py-1.5 rounded-lg ${getWellnessColor(w.fatigue)}`}>{formatNum(w.fatigue)}</span></td>
                        <td className="px-2 py-3"><span className={`inline-block w-12 py-1.5 rounded-lg ${getWellnessColor(w.sleep)}`}>{formatNum(w.sleep)}</span></td>
                        <td className="px-2 py-3"><span className={`inline-block w-12 py-1.5 rounded-lg ${getWellnessColor(w.soreness)}`}>{formatNum(w.soreness)}</span></td>
                        <td className="px-2 py-3"><span className={`inline-block w-12 py-1.5 rounded-lg ${getWellnessColor(w.stress)}`}>{formatNum(w.stress)}</span></td>
                        <td className="px-2 py-3 pr-8"><span className={`inline-block w-12 py-1.5 rounded-lg ${getWellnessColor(w.mood)}`}>{formatNum(w.mood)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
          </div>

          {/* Gráfico Fatiga y Dolor */}
          <div className="mt-auto">
            <h3 className="text-[9px] font-black text-[#0b1220] uppercase tracking-widest mb-4 flex items-center gap-2">
              <i className="fa-solid fa-chart-line text-[#CF1B2B]"></i> EVOLUCIÓN FATIGA Y DOLOR
            </h3>
            <div className="h-64 w-full bg-slate-50/50 rounded-[32px] p-8">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={wellnessChartData} margin={{ top: 30, right: 40, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900, fill: '#94a3b8'}} />
                  <YAxis domain={[1, 5]} ticks={[1,2,3,4,5]} axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900, fill: '#94a3b8'}} padding={{ top: 20 }} />
                  <Tooltip />
                  <Legend verticalAlign="bottom" align="center" height={36} iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', paddingTop: '20px' }} />
                  <Line type="monotone" name="Dolor" dataKey="dolor" stroke="#0038A8" strokeWidth={4} dot={{ r: 4, fill: '#0038A8' }} activeDot={{ r: 6 }}>
                    <LabelList dataKey="dolor" position="top" offset={10} formatter={formatNum} style={{ fontSize: '8px', fontWeight: '900', fill: '#0038A8' }} />
                  </Line>
                  <Line type="monotone" name="Fatiga" dataKey="fatiga" stroke="#CF1B2B" strokeWidth={4} dot={{ r: 4, fill: '#CF1B2B' }} activeDot={{ r: 6 }}>
                    <LabelList dataKey="fatiga" position="top" offset={10} formatter={formatNum} style={{ fontSize: '8px', fontWeight: '900', fill: '#CF1B2B' }} />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* PÁGINA 2: PERFIL PSICO-EMOCIONAL & PSE */}
        <div className="bg-white p-12 min-h-[297mm] flex flex-col break-after-page shadow-sm mb-8 print:shadow-none print:mb-0 player-report-page">
          <Header />
          
          <div className="mb-12">
            <h3 className="text-[10px] font-black text-[#0b1220] uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
              <i className="fa-solid fa-brain text-[#CF1B2B]"></i> PERFIL PSICO-EMOCIONAL
            </h3>
            <div className="h-64 w-full bg-slate-50/50 rounded-[32px] p-8">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={wellnessChartData} margin={{ top: 30, right: 40, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900, fill: '#94a3b8'}} />
                  <YAxis domain={[1, 5]} ticks={[1,2,3,4,5]} axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900, fill: '#94a3b8'}} padding={{ top: 20 }} />
                  <Tooltip />
                  <Legend verticalAlign="bottom" align="center" height={36} iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', paddingTop: '20px' }} />
                  <Line type="monotone" name="Estrés" dataKey="estres" stroke="#CF1B2B" strokeWidth={4} dot={{ r: 4, fill: '#CF1B2B' }}>
                    <LabelList dataKey="estres" position="top" offset={10} formatter={formatNum} style={{ fontSize: '8px', fontWeight: '900', fill: '#CF1B2B' }} />
                  </Line>
                  <Line type="monotone" name="Sueño" dataKey="sueno" stroke="#10b981" strokeWidth={4} dot={{ r: 4, fill: '#10b981' }}>
                    <LabelList dataKey="sueno" position="top" offset={10} formatter={formatNum} style={{ fontSize: '8px', fontWeight: '900', fill: '#10b981' }} />
                  </Line>
                  <Line type="monotone" name="Ánimo" dataKey="animo" stroke="#0038A8" strokeWidth={4} dot={{ r: 4, fill: '#0038A8' }}>
                    <LabelList dataKey="animo" position="top" offset={10} formatter={formatNum} style={{ fontSize: '8px', fontWeight: '900', fill: '#0038A8' }} />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-6 mb-12">
            <h3 className="text-[10px] font-black text-[#0b1220] uppercase tracking-[0.3em] flex items-center gap-2">
              <i className="fa-solid fa-stopwatch text-[#CF1B2B]"></i> ANÁLISIS CHECK-OUT ( P S E )
            </h3>
            <div className="rounded-[24px] overflow-hidden border border-slate-100 shadow-sm">
                <table className="w-full text-center text-[10px] border-collapse">
                  <thead className="bg-slate-50 text-slate-400 font-black uppercase tracking-widest border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-left pl-8">FECHA</th>
                      <th className="px-4 py-4">RPE (BORG)</th>
                      <th className="px-4 py-4">MINUTOS</th>
                      <th className="px-6 py-4 text-right pr-8">CARGA (U.A)</th>
                    </tr>
                  </thead>
                  <tbody className="font-black text-slate-700 uppercase italic">
                    {history.loads.map((l, idx) => (
                      <tr key={idx} className="border-b border-slate-50">
                        <td className="px-6 py-4 text-left pl-8 font-bold">{formatDateShort(l.date)}</td>
                        <td className="px-4 py-4">{formatNum(l.rpe)}</td>
                        <td className="px-4 py-4">{formatNum(l.duration)}'</td>
                        <td className="px-6 py-4 text-right pr-8 text-red-600 font-black">{formatNum(l.srpe)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
          </div>

          <div className="mt-auto">
            <h3 className="text-[9px] font-black text-[#0b1220] uppercase tracking-widest mb-4 flex items-center gap-2">
              <i className="fa-solid fa-chart-area text-[#0b1220]"></i> DINÁMICA DE CARGA (UA)
            </h3>
            <div className="h-64 w-full bg-slate-50/50 rounded-[32px] p-8">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={loadChartData} margin={{ top: 30, right: 40, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900, fill: '#475569'}} />
                  <YAxis hide />
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', paddingTop: '20px' }} />
                  <Line type="monotone" name="Carga (UA)" dataKey="srpe" stroke="#0b1220" strokeWidth={4} dot={{ r: 4, fill: '#0b1220' }} activeDot={{ r: 6 }}>
                    <LabelList dataKey="srpe" position="top" offset={10} formatter={formatNum} style={{ fontSize: '8px', fontWeight: '900', fill: '#0b1220' }} />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* PÁGINA 3: CARGA EXTERNA (GPS) */}
        <div className="bg-white p-12 min-h-[297mm] flex flex-col break-after-page shadow-sm mb-8 print:shadow-none print:mb-0 player-report-page">
          <Header />

          <div className="space-y-6 mb-8">
            <h3 className="text-[10px] font-black text-[#0b1220] uppercase tracking-[0.3em] flex items-center gap-2">
              <i className="fa-solid fa-satellite-dish text-[#CF1B2B]"></i> CARGA EXTERNA ( G P S )
            </h3>
            <div className="rounded-[24px] overflow-hidden border border-slate-100 shadow-sm">
                <table className="w-full text-center text-[8px] border-collapse">
                  <thead className="bg-[#0b1220] text-white font-black uppercase tracking-widest">
                    <tr>
                      <th className="px-2 py-3 text-left pl-4">FECHA</th>
                      <th className="px-1 py-3">MIN</th>
                      <th className="px-1 py-3">TOT DIST (M)</th>
                      <th className="px-1 py-3">M/MIN</th>
                      <th className="px-1 py-3">AINT {">"}15</th>
                      <th className="px-1 py-3">MAINT {">"}20</th>
                      <th className="px-1 py-3">SPR {">"}25</th>
                      <th className="px-1 py-3"># SP</th>
                      <th className="px-1 py-3">VEL MAX</th>
                      <th className="px-1 py-3 pr-4">#ACC+DEC AI</th>
                    </tr>
                  </thead>
                  <tbody className="font-black text-slate-700 uppercase italic">
                    {history.gps.map((g, idx) => (
                      <tr key={idx} className="border-b border-slate-50">
                        <td className="px-2 py-2 text-left pl-4 font-bold">{formatDateShort(g.date)}</td>
                        <td className="px-1 py-2">{formatNum(g.minutos)}</td>
                        <td className="px-1 py-2 font-bold">{formatNum(g.dist_total_m)}</td>
                        <td className="px-1 py-2">{formatNum(g.m_por_min)}</td>
                        <td className="px-1 py-2">{formatNum(g.dist_ai_m_15_kmh)}</td>
                        <td className="px-1 py-2">{formatNum(g.dist_mai_m_20_kmh)}</td>
                        <td className="px-1 py-2">{formatNum(g.dist_sprint_m_25_kmh)}</td>
                        <td className="px-1 py-2">{formatNum(g.sprints_n)}</td>
                        <td className="px-1 py-2">{formatNum(g.vel_max_kmh)}</td>
                        <td className="px-1 py-2 pr-4">{formatNum(g.acc_decc_ai_n)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 mt-auto">
            {/* Chart 1: Total Distance (Line) & Distances >15 and >20 (Bars) */}
            <div className="h-52 w-full bg-slate-50/50 rounded-[32px] p-6">
              <h4 className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 px-2">VOLUMEN E INTENSIDAD (TOT DIST, &gt;15, &gt;20 KM/H)</h4>
              <ResponsiveContainer width="100%" height="85%">
                <ComposedChart data={gpsChartData} margin={{ top: 25, right: 30, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{fontSize: 7, fontWeight: 900, fill: '#475569'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 7, fontWeight: 900, fill: '#475569'}} width={40} />
                  <Tooltip />
                  <Legend verticalAlign="top" align="right" height={30} iconType="square" wrapperStyle={{ fontSize: '7px', fontWeight: '900', textTransform: 'uppercase', paddingBottom: '10px' }} />
                  <Bar name="Dist. >15 km/h" dataKey="dist_15" fill="#CF1B2B" radius={[4, 4, 0, 0]} barSize={12}>
                    <LabelList dataKey="dist_15" position="top" formatter={formatNum} style={{ fontSize: '6px', fontWeight: '900', fill: '#CF1B2B' }} />
                  </Bar>
                  <Bar name="Dist. >20 km/h" dataKey="dist_20" fill="#0038A8" radius={[4, 4, 0, 0]} barSize={12}>
                    <LabelList dataKey="dist_20" position="top" formatter={formatNum} style={{ fontSize: '6px', fontWeight: '900', fill: '#0038A8' }} />
                  </Bar>
                  <Line type="monotone" name="Dist. Total (m)" dataKey="dist_total" stroke="#0038A8" strokeWidth={3} dot={{ r: 3, fill: '#0038A8' }}>
                    <LabelList dataKey="dist_total" position="top" offset={10} formatter={formatNum} style={{ fontSize: '6px', fontWeight: '900', fill: '#0038A8' }} />
                  </Line>
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Chart 2: Dist >25, Acc+Dec (Bars) and Efforts >25 (Line) */}
            <div className="h-52 w-full bg-slate-50/50 rounded-[32px] p-6">
              <h4 className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 px-2">ALTA VELOCIDAD Y ACCIONES EXPLOSIVAS (&gt;25 KM/H, ACC+DEC)</h4>
              <ResponsiveContainer width="100%" height="85%">
                <ComposedChart data={gpsChartData} margin={{ top: 25, right: 30, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{fontSize: 7, fontWeight: 900, fill: '#475569'}} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fontSize: 7, fontWeight: 900, fill: '#475569'}} width={35} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fontSize: 7, fontWeight: 900, fill: '#475569'}} width={35} />
                  <Tooltip />
                  <Legend verticalAlign="top" align="right" height={30} iconType="square" wrapperStyle={{ fontSize: '7px', fontWeight: '900', textTransform: 'uppercase', paddingBottom: '10px' }} />
                  <Bar yAxisId="left" name="Dist. >25 km/h" dataKey="dist_25" fill="#CF1B2B" radius={[4, 4, 0, 0]} barSize={12}>
                    <LabelList dataKey="dist_25" position="top" formatter={formatNum} style={{ fontSize: '6px', fontWeight: '900', fill: '#CF1B2B' }} />
                  </Bar>
                  <Bar yAxisId="left" name="Acc + Dec (AI)" dataKey="acc_dec" fill="#0038A8" radius={[4, 4, 0, 0]} barSize={12}>
                    <LabelList dataKey="acc_dec" position="top" formatter={formatNum} style={{ fontSize: '6px', fontWeight: '900', fill: '#0038A8' }} />
                  </Bar>
                  <Line yAxisId="right" type="monotone" name="Esfuerzos >25 km/h" dataKey="sprints" stroke="#10b981" strokeWidth={3} dot={{ r: 3, fill: '#10b981' }}>
                    <LabelList dataKey="sprints" position="top" offset={10} formatter={formatNum} style={{ fontSize: '6px', fontWeight: '900', fill: '#10b981' }} />
                  </Line>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* PÁGINA 4: FIRMAS */}
        <div className="bg-white p-12 min-h-[297mm] flex flex-col shadow-sm print:shadow-none player-report-page">
          <Header />
          
          <div className="mb-8">
            <h3 className="text-[10px] font-black text-[#0b1220] uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
              <i className="fa-solid fa-stethoscope text-[#CF1B2B]"></i> INFORME MÉDICO INSTITUCIONAL
            </h3>
            <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100 italic relative overflow-hidden">
               {/* Decorative background element */}
               <div className="absolute top-0 right-0 p-4 opacity-[0.03]">
                 <i className="fa-solid fa-staff-aesculapius text-8xl"></i>
               </div>
               
               <p className="text-[10px] font-bold text-slate-800 leading-relaxed relative z-10">
                 Se certifica que el deportista <span className="text-[#0b1220] font-black">{player.name}</span> ha sido sometido a seguimiento clínico y fisioterapéutico permanente durante el transcurso del actual periodo de citación. 
                 Basado en el registro diario del Área Médica y el Departamento de Ciencias del Deporte, se informa lo siguiente:
               </p>
               
               <div className="mt-4 pt-4 border-t border-slate-200 relative z-10">
                 {history.medical && history.medical.length > 0 ? (
                   <div className="space-y-3">
                     {history.medical.map((m: any, idx: number) => (
                       <div key={idx} className="flex gap-4">
                         <div className="text-[9px] font-black text-slate-400 shrink-0 mt-0.5">{formatDateShort(m.date)}</div>
                         <div>
                           <p className="text-[11px] font-black text-[#0b1220] leading-none mb-1">
                             {m.diagnosis || 'CONTROL CLÍNICO RUTINARIO'}
                           </p>
                           <p className="text-[10px] font-medium text-slate-600">
                             {m.observation}
                           </p>
                         </div>
                       </div>
                     ))}
                   </div>
                 ) : (
                   <p className="text-xs font-black text-[#0b1220] uppercase tracking-tight">
                     "EL DEPORTISTA COMPLETÓ EL MICROCICLO DE ENTRENAMIENTO SIN PRESENTAR HALLAZGOS CLÍNICOS DE SIGNIFICANCIA, NOVEDADES MÉDICAS NI LIMITACIONES FÍSICAS QUE CONDICIONEN SU RENDIMIENTO DEPORTIVO HABITUAL O REQUIERAN TRATAMIENTO ESPECÍFICO POST-CONVOCATORIA."
                   </p>
                 )}
               </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center py-2">
            {/* Justificación técnica eliminada por solicitud */}
          </div>

          <div className="mt-auto">
            <div className="grid grid-cols-2 gap-24 mb-20">
               <div className="text-center">
                  <div className="h-px bg-slate-300 mb-6"></div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">F I R M A J E F E T É C N I C O</p>
               </div>
               <div className="text-center">
                  <div className="h-px bg-slate-300 mb-6"></div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">F I R M A Á R E A M É D I C A</p>
               </div>
            </div>
            
            <div className="text-center border-t border-slate-100 pt-8 relative">
               <p className="text-[10px] font-black text-[#0b1220] uppercase tracking-[0.6em] mb-2">L A R O J A P E R F O R M A N C E H U B</p>
               <p className="text-[8px] font-bold text-slate-300 uppercase italic">FEDERACIÓN DE FÚTBOL DE CHILE</p>
               
               {/* Watermark */}
               <div className="absolute bottom-0 right-0 text-[8px] font-black text-slate-200 italic tracking-widest">
                 CMSPORTECH.COM
               </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (viewMode === 'club_print' && selectedClubForPrint && selectedMicro) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300 pb-20 print:bg-white">
        <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm flex items-center justify-between print:hidden">
           <div className="flex items-center gap-6">
              <div className="w-14 h-14 bg-[#0b1220] rounded-2xl flex items-center justify-center text-white shadow-xl"><i className="fa-solid fa-file-pdf"></i></div>
              <h2 className="text-xl font-black uppercase tracking-tighter italic">REPORTE CONSOLIDADO: {selectedClubForPrint.name}</h2>
           </div>
           <div className="flex gap-4">
              <button 
                onClick={() => downloadReportPDF('club-report-container', getClubFileName())} 
                disabled={loading}
                className="bg-red-600 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-red-700 disabled:opacity-50 flex items-center gap-3"
              >
                {loading ? <><i className="fa-solid fa-spinner fa-spin"></i> GENERANDO...</> : <><i className="fa-solid fa-download"></i> DESCARGAR PDF</>}
              </button>
              <button onClick={() => setViewMode('club_list')} className="bg-slate-100 text-slate-400 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest">VOLVER</button>
           </div>
        </div>

        <div id="club-report-container" className="max-w-[850px] mx-auto space-y-10 print:space-y-0">
          {selectedClubForPrint.players.map(p => (
            <PlayerReportSheet key={p.id} player={p} history={clubHistoryData[p.id_del_jugador!] || { wellness: [], loads: [], gps: [], medical: [] }} />
          ))}
        </div>
      </div>
    )
  }

  if (viewMode === 'club_list' && selectedMicro) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300 pb-20 relative">
        {/* Progress Overlay for ZIP */}
        {zipProgress && (
          <div className="fixed inset-0 bg-[#0b1220]/90 backdrop-blur-md z-[100] flex flex-col items-center justify-center text-white">
            <div className="w-24 h-24 bg-red-600 rounded-3xl flex items-center justify-center mb-8 shadow-2xl animate-bounce">
              <i className="fa-solid fa-file-zipper text-4xl"></i>
            </div>
            <h2 className="text-3xl font-black italic tracking-tighter uppercase mb-2">Generando Reportes</h2>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-10 italic">Por favor no cierre esta ventana</p>
            
            <div className="w-full max-w-md bg-slate-800 h-2 rounded-full overflow-hidden mb-4">
              <div 
                className="bg-red-600 h-full transition-all duration-500" 
                style={{ width: `${(zipProgress.current / zipProgress.total) * 100}%` }}
              ></div>
            </div>
            <p className="text-sm font-black text-white uppercase italic tracking-widest">
              Procesando: {zipProgress.current} de {zipProgress.total} clubes
            </p>
          </div>
        )}

        <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm flex items-center justify-between">
           <div className="flex items-center gap-6">
              <button onClick={() => setViewMode('details')} className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all shadow-inner"><i className="fa-solid fa-arrow-left"></i></button>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tighter italic">DESCONVOCATORIA POR EQUIPO</h2>
                <p className="text-slate-400 text-xs font-medium uppercase tracking-widest italic">{selectedMicro.nombre_display} #{selectedMicro.id}</p>
              </div>
           </div>

           <button 
             onClick={downloadAllClubsZip}
             disabled={loading}
             className="bg-red-600 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-red-700 disabled:opacity-50 flex items-center gap-3 transition-all transform active:scale-95"
           >
             {loading ? <><i className="fa-solid fa-spinner fa-spin"></i> GENERANDO...</> : <><i className="fa-solid fa-file-zipper"></i> DESCARGAR TODO (.ZIP)</>}
           </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {clubGroups.map((group) => (
            <div key={group.name} className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm flex flex-col justify-between group hover:shadow-xl transition-all min-h-[280px]">
               <div>
                  <div className="flex justify-between items-start mb-6">
                     <span className="bg-slate-900 text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest">{group.players.length} JUGADORES</span>
                     <i className="fa-solid fa-shield-halved text-slate-100 text-3xl group-hover:text-red-100 transition-colors"></i>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-none mb-1 group-hover:text-red-600 transition-colors">{group.name}</h3>
                  <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">Atletas citados en este proceso</p>
               </div>
                <div className="flex gap-4">
                   <button 
                     onClick={() => handleViewClubReport(group)}
                     className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-[24px] text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-3"
                   >
                     <i className="fa-solid fa-file-pdf"></i> Reporte
                   </button>
                   <button 
                     onClick={() => confirmDesconvocatoriaClub(group)}
                     className="flex-1 py-4 bg-red-600 text-white rounded-[24px] text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-red-700 transition-all flex items-center justify-center gap-3"
                   >
                     <i className="fa-solid fa-user-xmark"></i> Desconvocar
                   </button>
                </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (viewMode === 'report' && processingBajaAtleta && selectedMicro) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300 pb-20 print:bg-white">
        <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm flex items-center justify-between print:hidden">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-xl"><i className="fa-solid fa-file-contract"></i></div>
            <h2 className="text-xl font-black uppercase tracking-tighter italic">Certificado Técnico: {processingBajaAtleta.name}</h2>
          </div>
          <div className="flex gap-4">
             <button 
               onClick={() => downloadReportPDF('report-printable', getIndividualFileName())} 
               className="bg-[#0b1220] text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-3 disabled:opacity-50"
               disabled={loading}
             >
               {loading ? <><i className="fa-solid fa-spinner fa-spin"></i> ...</> : <><i className="fa-solid fa-download"></i> DESCARGAR PDF</>}
             </button>
             <button onClick={confirmDesconvocatoria} className="bg-red-600 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-red-700">OFICIALIZAR BAJA</button>
             <button onClick={() => setViewMode('details')} className="bg-slate-100 text-slate-400 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest">VOLVER</button>
          </div>
        </div>

        <div id="report-printable" className="bg-white max-w-[850px] mx-auto shadow-2xl print:shadow-none print:p-0">
          <PlayerReportSheet player={processingBajaAtleta} history={historicalData} />
        </div>
      </div>
    )
  }

  if (viewMode === 'details' && selectedMicro) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300 transform-gpu">
         <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button onClick={() => setViewMode('grid')} className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all shadow-inner"><i className="fa-solid fa-arrow-left"></i></button>
            <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">
              NÓMINA OFICIAL: {selectedMicro.nombre_display} #{selectedMicro.micro_number || selectedMicro.id}
            </h2>
          </div>
          
          {/* Botón según referencia visual solicitada */}
          <button 
            onClick={() => setViewMode('club_list')}
            className="bg-[#0b1220] text-white px-10 py-5 rounded-[32px] text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-red-600 transition-all flex items-center gap-3 active:scale-95"
          >
            <i className="fa-solid fa-users-slash text-xs"></i> DESCONVOCAR POR EQUIPO
          </button>
        </div>

        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden min-h-[500px]">
          <div className="p-8 border-b border-slate-50 flex items-center justify-between">
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Jugadores Citados en Proceso</p>
             <div className="relative w-64">
               <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-xs"></i>
               <input type="text" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-slate-50 border-none rounded-2xl py-3 pl-10 pr-4 text-xs font-bold" />
             </div>
          </div>
          <div className="p-10">
            {loadingPlayers ? (
              <div className="py-20 text-center animate-pulse text-slate-400 font-black uppercase italic tracking-widest">Consultando Supabase...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {citedPlayers.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                  <div key={p.id} className="p-6 bg-slate-50 rounded-[32px] border border-transparent hover:border-red-500 hover:bg-white transition-all group flex items-center justify-between shadow-sm">
                    <div>
                      <p className="text-sm font-black text-slate-900 uppercase italic leading-none mb-1">{p.name}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{p.position} | {p.club}</p>
                    </div>
                    <button onClick={() => { setProcessingBajaAtleta(p); handleViewReport(); }} className="px-5 py-2.5 bg-red-600 text-white rounded-xl text-[9px] font-black uppercase shadow-sm hover:scale-105 active:scale-95 transition-all">Reportar Baja</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm flex items-center gap-6">
        <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-xl"><i className="fa-solid fa-user-minus"></i></div>
        <div>
          <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">DESCONVOCATORIAS OFICIALES</h2>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mt-1 italic">Gestión técnica de bajas en microciclos institucionales.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 p-1.5 bg-white rounded-[24px] border border-slate-100 shadow-sm max-w-fit overflow-x-auto">
        <button 
          onClick={() => toggleCategoryFilter('TODOS')} 
          className={`px-6 py-3.5 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${categoryFilters.includes('TODOS') ? 'bg-[#0b1220] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
        >
          TODOS
        </button>
        {Object.values(Category).map(cat => {
          const isSelected = categoryFilters.includes(cat);
          return (
            <button 
              key={cat} 
              onClick={() => toggleCategoryFilter(cat)} 
              className={`px-6 py-3.5 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${isSelected ? 'bg-[#0b1220] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {formatCategoryLabel(cat)}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="py-32 text-center animate-pulse">
          <i className="fa-solid fa-spinner fa-spin text-slate-200 text-5xl mb-6"></i>
          <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest italic">Sincronizando procesos...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredMicros.map((mc) => (
            <div key={mc.id} onClick={() => handleOpenDetails(mc)} className="group bg-white rounded-[40px] p-10 border-2 border-slate-50 transition-all cursor-pointer hover:shadow-2xl hover:border-red-200 relative overflow-hidden flex flex-col justify-between min-h-[360px]">
              <div className="flex justify-between items-start mb-6">
                <span className="bg-blue-600 text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm">
                  {formatCategoryLabel(mc.category_id)}
                </span>
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 shadow-inner">
                  <span className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">{mc.jugadoresCount} CITADOS</span>
                </div>
              </div>
              
              <div className="flex-1 space-y-1">
                <h3 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter leading-none group-hover:text-[#CF1B2B] transition-colors">
                  {mc.nombre_display} #{mc.micro_number || mc.id}
                </h3>
                <p className="text-slate-400 font-bold uppercase text-[12px] tracking-widest">
                  {mc.start_date} - {mc.end_date}
                </p>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">
                  {mc.type.toUpperCase()}
                </p>
              </div>

              <div className="pt-8 border-t border-slate-50 flex justify-between items-center">
                <span className="text-[11px] font-black text-[#CF1B2B] uppercase italic tracking-widest">
                  {mc.city.toUpperCase()}, {mc.country.toUpperCase()}
                </span>
                <div className="flex items-center gap-2 text-slate-200 group-hover:text-slate-900 transition-colors">
                  <span className="text-[9px] font-black uppercase tracking-widest">ABRIR</span>
                  <i className="fa-solid fa-chevron-right text-[8px]"></i>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
