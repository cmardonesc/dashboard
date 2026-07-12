import React, { useState, useMemo, useEffect } from 'react'
import { User, UserRole, Category, CATEGORY_ID_MAP } from '../types'
import { FEDERATION_LOGO, FALLBACK_CLUB_NAMES } from '../constants'
import { getDriveDirectLink, normalizeClub } from '../lib/utils'
import { supabase } from '../lib/supabase'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
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

interface DesconvocatoriaAreaProps {
  performanceRecords?: any[]
  onMenuChange?: (id: any) => void
  clubs?: any[]
  userRole?: string
  userClub?: string
  userClubId?: number | null
}

export default function DesconvocatoriaArea({ 
  performanceRecords, 
  onMenuChange, 
  clubs = [],
  userRole,
  userClub,
  userClubId
}: DesconvocatoriaAreaProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedMicro, setSelectedMicro] = useState<MicrocicloBajas | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingPlayers, setLoadingPlayers] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilters, setCategoryFilters] = useState<string[]>(['TODOS'])

  const toggleCategoryFilter = (cat: string) => {
    setCategoryFilters([cat]);
  };
  
  const [microciclos, setMicrociclos] = useState<MicrocicloBajas[]>([])
  const [citedPlayers, setCitedPlayers] = useState<User[]>([])

  const [processingBajaAtleta, setProcessingBajaAtleta] = useState<User | null>(null)
  const [selectedClubForPrint, setSelectedClubForPrint] = useState<ClubGroup | null>(null)
  const [historicalData, setHistoricalData] = useState<HistoricalData>({ wellness: [], loads: [], gps: [], medical: [] })
  
  // Para reporte por club: datos de todos los jugadores del club
  const [clubHistoryData, setClubHistoryData] = useState<Record<number, HistoricalData>>({})
  const [bajaReason, setBajaReason] = useState('Desgarro Isquiotibial izquierdo');
  const [bajaReasonInput, setBajaReasonInput] = useState('');
  const [showBajaModal, setShowBajaModal] = useState(false);
  const [showErrorSqlModal, setShowErrorSqlModal] = useState(false);
  const [zipProgress, setZipProgress] = useState<{current: number, total: number} | null>(null);
  const [bajaReasonsMap, setBajaReasonsMap] = useState<Record<number, string>>({});
  const [clubContacts, setClubContacts] = useState<any[]>([]);

  const [isGeneratingZip, setIsGeneratingZip] = useState(false);

  useEffect(() => {
    fetchMicrocycles()
    fetchClubContacts()
  }, [])

  const fetchClubContacts = async () => {
    const { data } = await supabase.from('contactos_solicitudes').select('*');
    if (data) setClubContacts(data);
  };

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

  const fetchBajaReasons = async (microId: number) => {
    const { data } = await supabase
      .from('desconvocatorias')
      .select('athlete_id, motivo')
      .eq('microciclo_id', String(microId));
    
    const map: Record<number, string> = {};
    if (data) {
      data.forEach((d: any) => {
        if (d.athlete_id) {
          map[Number(d.athlete_id)] = d.motivo || 'Baja';
        }
      });
    }

    // Combinar con localStorage
    try {
      const localData = localStorage.getItem('local_desconvocatorias');
      if (localData) {
        const parsed = JSON.parse(localData);
        if (Array.isArray(parsed)) {
          parsed.forEach((d: any) => {
            if (String(d.microciclo_id) === String(microId) && d.athlete_id) {
              map[Number(d.athlete_id)] = d.motivo || 'Baja';
            }
          });
        }
      }
    } catch (e) {
      console.error("Error leyendo desconvocatorias locales:", e);
    }

    setBajaReasonsMap(map);
  };

  const saveDesconvocatoriaLocally = (
    athleteId: string, 
    athleteName: string, 
    clubName: string, 
    categoryId: string, 
    microcicloId: string, 
    motivo: string
  ) => {
    try {
      const localData = localStorage.getItem('local_desconvocatorias');
      let arr = localData ? JSON.parse(localData) : [];
      if (!Array.isArray(arr)) arr = [];
      
      // Evitar duplicados
      arr = arr.filter((x: any) => !(String(x.athlete_id) === String(athleteId) && String(x.microciclo_id) === String(microcicloId)));
      
      arr.push({
        athlete_id: athleteId,
        athlete_name: athleteName,
        club_name: clubName,
        category_id: categoryId,
        microciclo_id: microcicloId,
        motivo: motivo,
        fecha_desconvocatoria: new Date().toISOString().split('T')[0]
      });
      
      localStorage.setItem('local_desconvocatorias', JSON.stringify(arr));
    } catch (e) {
      console.error("Error guardando desconvocatoria localmente:", e);
    }
  };

  const fetchCitedPlayers = async (microId: number) => {
    setLoadingPlayers(true)
    fetchBajaReasons(microId);
    try {
      const { data, error } = await supabase
        .from('citaciones')
        .select(`
          player_id,
          players!citaciones_player_fk (
            player_id,
            nombre,
            apellido1,
            apellido2,
            posicion,
            anio,
            id_club,
            clubes!fk_players_clubes (nombre)
          )
        `)
       .eq('microcycle_id', microId)

      if (error) throw error
      if (data) {
        // Cargar mapeos de clubes personalizados locales para jugadores
        let localPlayerClubs: Record<number, { id_club: number, nombre: string }> = {};
        try {
          const storedMapping = localStorage.getItem('lr-performance-custom-player-clubs');
          if (storedMapping) {
            localPlayerClubs = JSON.parse(storedMapping);
          }
        } catch (e) {
          console.error("DesconvocatoriaArea: Error parsing custom clubs:", e);
        }

        const mapped: User[] = data.filter((d: any) => d.players).map((d: any) => {
          const p = d.players;
          // Inferir categoría si falta
          let category = '';
          if (p.anio) {
            const age = 2026 - p.anio;
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

          let resolvedClubId = p.id_club;
          let resolvedClubName = '';

          if (p.player_id && localPlayerClubs[p.player_id]) {
            resolvedClubId = localPlayerClubs[p.player_id].id_club;
            resolvedClubName = localPlayerClubs[p.player_id].nombre;
          } else {
            const clubObj = (Array.isArray(p.clubes) ? p.clubes[0] : p.clubes);
            const clubNameFromProps = (clubs || []).find(c => (c.id_club && Number(c.id_club) === Number(p.id_club)) || (c.id && Number(c.id) === Number(p.id_club)))?.nombre;
            const fallbackClubName = p.id_club ? FALLBACK_CLUB_NAMES[Number(p.id_club)] : null;
            resolvedClubName = clubObj?.nombre || clubNameFromProps || fallbackClubName || 'SIN CLUB';
          }
          
          return {
            id: `p-${p.player_id}`,
            player_id: p.player_id,
            id_club: resolvedClubId,
            name: `${p.nombre || ''} ${p.apellido1 || ''} ${p.apellido2 || ''}`.trim() || `Atleta #${p.player_id}`,
            role: UserRole.PLAYER,
            club: resolvedClubName,
            position: p.posicion || 'N/A',
            category: category as Category,
            anio: p.anio
          };
        })
        
        let finalPlayers = mapped;
        if (userRole === 'club') {
          finalPlayers = mapped.filter(p => {
            if (userClubId) return Number(p.id_club) === Number(userClubId);
            if (userClub) {
              const uClubNorm = normalizeClub(userClub);
              const pClubNorm = normalizeClub(p.club || '');
              return pClubNorm === uClubNorm;
            }
            return true;
          });
        }
        setCitedPlayers(finalPlayers)
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
        .eq('player_id', playerId)
        .gte('checkin_date', start)
        .lte('checkin_date', end)
        .order('checkin_date', { ascending: true });

      const { data: loadsRaw } = await supabase
        .from('internal_load')
        .select('*')
        .eq('player_id', playerId)
        .gte('session_date', start)
        .lte('session_date', end)
        .order('session_date', { ascending: true });

      const { data: gpsRaw } = await supabase
        .from('gps_import')
        .select('*')
        .eq('player_id', playerId)
        .gte('fecha', start)
        .lte('fecha', end)
        .order('fecha', { ascending: true });

      const { data: medicalRaw } = await supabase
        .from('medical_daily_reports')
        .select('*')
        .eq('player_id', playerId)
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
        nombre_sesion: g.nombre_sesion || '',
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
      const history = await fetchAthleteHistory(processingBajaAtleta.player_id!, selectedMicro.start_date, selectedMicro.end_date);
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
      if (p.player_id) {
        historyMap[p.player_id] = await fetchAthleteHistory(p.player_id, selectedMicro.start_date, selectedMicro.end_date);
      }
    }
    
    setClubHistoryData(historyMap);
    setLoading(false);
    setViewMode('club_print');
  };

  const handleBajaClick = (player: User) => {
    setProcessingBajaAtleta(player);
    setBajaReasonInput(''); // Reset reason
    setShowBajaModal(true);
  };

  const handleIndividualReportClick = async (player: User) => {
    if (!selectedMicro) return;
    setLoading(true);
    setProcessingBajaAtleta(player);
    const existingReason = bajaReasonsMap[player.player_id!] || 'Desgarro Isquiotibial izquierdo';
    setBajaReason(existingReason);
    setBajaReasonInput(existingReason);
    try {
      const history = await fetchAthleteHistory(player.player_id!, selectedMicro.start_date, selectedMicro.end_date);
      setHistoricalData(history);
      setViewMode('report');
    } catch (err) {
      console.error(err);
      alert("Error al cargar la historia del atleta.");
    } finally {
      setLoading(false);
    }
  };

  const confirmDesconvocatoria = async () => {
    if (!processingBajaAtleta || !selectedMicro || !bajaReasonInput.trim()) return

    setLoading(true)
    let savedLocally = false;
    try {
      let saveError = null;

      // 1. Intentar primero con la función RPC segura para evitar RLS (42501)
      console.log("Intentando desconvocatoria mediante RPC seguro...");
      const { error: rpcError } = await supabase.rpc('create_desconvocatoria_safe', {
        p_athlete_id: String(processingBajaAtleta.player_id),
        p_athlete_name: processingBajaAtleta.name,
        p_club_name: processingBajaAtleta.club,
        p_category_id: String(selectedMicro.category_id),
        p_microciclo_id: String(selectedMicro.id),
        p_motivo: bajaReasonInput,
        p_fecha_desconvocatoria: new Date().toISOString().split('T')[0]
      });

      if (rpcError) {
        console.warn("RPC falló, reintentando inserción directa en 'desconvocatorias'...", rpcError);
        // Fallback: Inserción directa en tabla en caso de que no hayan creado el RPC aún
        const { error: insertError } = await supabase
          .from('desconvocatorias')
          .insert([{
            athlete_id: String(processingBajaAtleta.player_id),
            athlete_name: processingBajaAtleta.name,
            club_name: processingBajaAtleta.club,
            category_id: String(selectedMicro.category_id),
            microciclo_id: String(selectedMicro.id),
            motivo: bajaReasonInput,
            fecha_desconvocatoria: new Date().toISOString().split('T')[0]
          }]);

        if (insertError) saveError = insertError;
      }

      if (saveError) {
        console.warn("Error de guardado en Supabase, aplicando guardado local fallback:", saveError);
        saveDesconvocatoriaLocally(
          String(processingBajaAtleta.player_id),
          processingBajaAtleta.name,
          processingBajaAtleta.club,
          String(selectedMicro.category_id),
          String(selectedMicro.id),
          bajaReasonInput
        );
        savedLocally = true;
      }

      // Actualizar mapa local de motivos
      setBajaReasonsMap(prev => ({
        ...prev,
        [processingBajaAtleta.player_id!]: bajaReasonInput
      }));

      setBajaReason(bajaReasonInput); // Update for PDF report if needed
      
      if (savedLocally) {
        alert(`Baja de ${processingBajaAtleta.name} guardada localmente (Supabase RLS activo). ¡El sistema seguirá funcionando con normalidad!`);
      } else {
        alert(`Baja oficial de ${processingBajaAtleta.name} procesada y guardada correctamente.`);
      }
      
      setShowBajaModal(false);
      fetchCitedPlayers(selectedMicro.id);
    } catch (err) {
      console.error("Error en confirmDesconvocatoria:", err);
      // Fallback total
      try {
        saveDesconvocatoriaLocally(
          String(processingBajaAtleta.player_id),
          processingBajaAtleta.name,
          processingBajaAtleta.club,
          String(selectedMicro.category_id),
          String(selectedMicro.id),
          bajaReasonInput
        );
        setBajaReasonsMap(prev => ({
          ...prev,
          [processingBajaAtleta.player_id!]: bajaReasonInput
        }));
        setBajaReason(bajaReasonInput);
        alert(`Baja de ${processingBajaAtleta.name} guardada localmente (Bypass de seguridad activado).`);
        setShowBajaModal(false);
        fetchCitedPlayers(selectedMicro.id);
      } catch (localErr) {
        alert("Error al procesar la desconvocatoria.");
      }
    } finally {
      setLoading(false)
    }
  }

  const confirmDesconvocatoriaClub = async (club: ClubGroup) => {
    if (!selectedMicro) return;
    if (!window.confirm(`¿Estás seguro de desconvocar a los ${club.players.length} jugadores de ${club.name}?`)) return;

    setLoading(true);
    let savedLocally = false;
    try {
      for (const p of club.players) {
        if (p.player_id) {
          let pError = null;

          // Intentar RPC
          const { error: rpcError } = await supabase.rpc('create_desconvocatoria_safe', {
            p_athlete_id: String(p.player_id),
            p_athlete_name: p.name,
            p_club_name: p.club,
            p_category_id: String(selectedMicro.category_id),
            p_microciclo_id: String(selectedMicro.id),
            p_motivo: 'Desconvocatoria Grupal',
            p_fecha_desconvocatoria: new Date().toISOString().split('T')[0]
          });

          if (rpcError) {
            // Intentar inserción directa
            const { error: directError } = await supabase
              .from('desconvocatorias')
              .insert([{
                athlete_id: String(p.player_id),
                athlete_name: p.name,
                club_name: p.club,
                category_id: String(selectedMicro.category_id),
                microciclo_id: String(selectedMicro.id),
                motivo: 'Desconvocatoria Grupal',
                fecha_desconvocatoria: new Date().toISOString().split('T')[0]
              }]);
            
            if (directError) pError = directError;
          }

          if (pError) {
            console.warn(`Error en baja de jugador ${p.name} en Supabase, aplicando guardado local:`, pError);
            saveDesconvocatoriaLocally(
              String(p.player_id),
              p.name,
              p.club,
              String(selectedMicro.category_id),
              String(selectedMicro.id),
              'Desconvocatoria Grupal'
            );
            savedLocally = true;
          }
        }
      }

      if (savedLocally) {
        alert(`Baja grupal de ${club.name} (${club.players.length} jugadores) guardada localmente (Supabase RLS activo).`);
      } else {
        alert(`Se ha procesado la baja grupal de ${club.name} (${club.players.length} jugadores).`);
      }
      setViewMode('details');
      fetchCitedPlayers(selectedMicro.id);
    } catch (err) {
      console.error(err);
      // Fallback total
      try {
        for (const p of club.players) {
          if (p.player_id) {
            saveDesconvocatoriaLocally(
              String(p.player_id),
              p.name,
              p.club,
              String(selectedMicro.category_id),
              String(selectedMicro.id),
              'Desconvocatoria Grupal'
            );
          }
        }
        alert(`Baja grupal de ${club.name} guardada localmente (Bypass de seguridad activado).`);
        setViewMode('details');
        fetchCitedPlayers(selectedMicro.id);
      } catch (localErr) {
        alert("Error al procesar la baja grupal.");
      }
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
    if (!selectedMicro || loading || isGeneratingZip) return;
    
    const confirmZip = window.confirm(`Se generarán reportes COMPLETOS (Carta + Fichas Técnicas) para ${clubGroups.length} equipos. ¿Continuar?`);
    if (!confirmZip) return;

    setIsGeneratingZip(true);
    setZipProgress({ current: 0, total: clubGroups.length });
    
    const zip = new JSZip();
    const folder = zip.folder(`Reportes_Desconvocatoria_Micro_${selectedMicro.id}`);

    const originalViewMode = viewMode;
    const originalClub = selectedClubForPrint;
    const originalClubHistory = clubHistoryData;

    try {
      for (let i = 0; i < clubGroups.length; i++) {
        const group = clubGroups[i];
        setZipProgress({ current: i + 1, total: clubGroups.length });
        
        // 1. Preparar datos para este club
        setSelectedClubForPrint(group);
        const historyMap: Record<number, HistoricalData> = {};
        for (const p of group.players) {
          if (p.player_id) {
            historyMap[p.player_id] = await fetchAthleteHistory(p.player_id, selectedMicro.start_date, selectedMicro.end_date);
          }
        }
        setClubHistoryData(historyMap);
        
        // 2. Cambiar a modo impresión
        setViewMode('club_print');
        
        // 3. Esperar renderizado y estabilización de charts
        await new Promise(resolve => setTimeout(resolve, 1500));

        // 4. Capturar PDF con html2canvas
        const pdf = new jsPDF('p', 'mm', 'a4');
        const container = document.getElementById('club-report-container');
        
        if (container) {
          const reportPages = container.querySelectorAll('.player-report-page');
          const captureOptions = {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
          };

          for (let j = 0; j < reportPages.length; j++) {
            if (j > 0) pdf.addPage();
            const page = reportPages[j] as HTMLElement;
            const canvas = await html2canvas(page, captureOptions);
            const imgData = canvas.toDataURL('image/jpeg', 0.9);
            pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
          }
          
          const blob = pdf.output('blob');
          const fileName = `Reporte_${group.name.replace(/\s+/g, '_')}.pdf`;
          folder?.file(fileName, blob);
        }
      }

      const zipContent = await zip.generateAsync({ type: 'blob' });
      saveAs(zipContent, `Reportes_Desconvocatoria_Microciclo_${selectedMicro.id}.zip`);
      
      alert("ZIP generado y descargado correctamente.");
    } catch (err) {
      console.error("Error al generar ZIP:", err);
      alert("Hubo un problema al generar el archivo ZIP.");
    } finally {
      setViewMode(originalViewMode);
      setSelectedClubForPrint(originalClub);
      setClubHistoryData(originalClubHistory);
      setIsGeneratingZip(false);
      setZipProgress(null);
    }
  };

  const downloadIndividualZip = async () => {
    // ... logic for zip ...
  };

  const shareIndividualReportWhatsApp = () => {
    if (!processingBajaAtleta || !selectedMicro) return;
    const category = formatCategoryLabel(selectedMicro.category_id);
    const text = encodeURIComponent(`*REPORTE DE DESCONVOCATORIA*\n\n👤 *Atleta:* ${processingBajaAtleta.name}\n⚽ *Categoría:* ${category}\n🔄 *Microciclo:* #${selectedMicro.micro_number || selectedMicro.id}\n📍 *Motivo:* ${bajaReason}\n\nSe ha emitido el reporte técnico de la baja. Saludos!`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const shareClubReportWhatsApp = () => {
    if (!selectedClubForPrint || !selectedMicro) return;
    const category = formatCategoryLabel(selectedMicro.category_id);
    const text = encodeURIComponent(`*REPORTE CONSOLIDADO POR CLUB - ${selectedClubForPrint.name.toUpperCase()}*\n\n⚽ *Categoría:* ${category}\n🔄 *Microciclo:* #${selectedMicro.micro_number || selectedMicro.id}\n👥 *Jugadores:* ${selectedClubForPrint.players.length}\n\nSe adjunta reporte consolidado de los jugadores desconvocados. Saludos!`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
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
        <div 
          id={`player-report-page-1-${player.id}`}
          className="bg-white p-12 min-h-[297mm] flex flex-col break-after-page shadow-sm mb-8 print:shadow-none print:mb-0 player-report-page"
        >
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
            <div className="h-64 w-full bg-slate-50/50 rounded-[32px] p-8 flex items-center justify-center overflow-hidden">
              <LineChart width={700} height={200} data={wellnessChartData} margin={{ top: 30, right: 40, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900, fill: '#94a3b8'}} />
                <YAxis domain={[1, 5]} ticks={[1,2,3,4,5]} axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900, fill: '#94a3b8'}} padding={{ top: 20 }} />
                <Tooltip />
                <Legend verticalAlign="bottom" align="center" height={36} iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', paddingTop: '20px' }} />
                <Line isAnimationActive={false} type="monotone" name="Dolor" dataKey="dolor" stroke="#0038A8" strokeWidth={4} dot={{ r: 4, fill: '#0038A8' }} activeDot={{ r: 6 }}>
                  <LabelList dataKey="dolor" position="top" offset={10} formatter={formatNum} style={{ fontSize: '8px', fontWeight: '900', fill: '#0038A8' }} />
                </Line>
                <Line isAnimationActive={false} type="monotone" name="Fatiga" dataKey="fatiga" stroke="#CF1B2B" strokeWidth={4} dot={{ r: 4, fill: '#CF1B2B' }} activeDot={{ r: 6 }}>
                  <LabelList dataKey="fatiga" position="top" offset={10} formatter={formatNum} style={{ fontSize: '8px', fontWeight: '900', fill: '#CF1B2B' }} />
                </Line>
              </LineChart>
            </div>
          </div>
        </div>

        {/* PÁGINA 2: PERFIL PSICO-EMOCIONAL & PSE */}
        <div 
          id={`player-report-page-2-${player.id}`}
          className="bg-white p-12 min-h-[297mm] flex flex-col break-after-page shadow-sm mb-8 print:shadow-none print:mb-0 player-report-page"
        >
          <Header />
          
          <div className="mb-12">
            <h3 className="text-[10px] font-black text-[#0b1220] uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
              <i className="fa-solid fa-brain text-[#CF1B2B]"></i> PERFIL PSICO-EMOCIONAL
            </h3>
            <div className="h-64 w-full bg-slate-50/50 rounded-[32px] p-8 flex items-center justify-center overflow-hidden">
              <LineChart width={700} height={200} data={wellnessChartData} margin={{ top: 30, right: 40, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900, fill: '#94a3b8'}} />
                <YAxis domain={[1, 5]} ticks={[1,2,3,4,5]} axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900, fill: '#94a3b8'}} padding={{ top: 20 }} />
                <Tooltip />
                <Legend verticalAlign="bottom" align="center" height={36} iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', paddingTop: '20px' }} />
                <Line isAnimationActive={false} type="monotone" name="Estrés" dataKey="estres" stroke="#CF1B2B" strokeWidth={4} dot={{ r: 4, fill: '#CF1B2B' }}>
                  <LabelList dataKey="estres" position="top" offset={10} formatter={formatNum} style={{ fontSize: '8px', fontWeight: '900', fill: '#CF1B2B' }} />
                </Line>
                <Line isAnimationActive={false} type="monotone" name="Sueño" dataKey="sueno" stroke="#10b981" strokeWidth={4} dot={{ r: 4, fill: '#10b981' }}>
                  <LabelList dataKey="sueno" position="top" offset={10} formatter={formatNum} style={{ fontSize: '8px', fontWeight: '900', fill: '#10b981' }} />
                </Line>
                <Line isAnimationActive={false} type="monotone" name="Ánimo" dataKey="animo" stroke="#0038A8" strokeWidth={4} dot={{ r: 4, fill: '#0038A8' }}>
                  <LabelList dataKey="animo" position="top" offset={10} formatter={formatNum} style={{ fontSize: '8px', fontWeight: '900', fill: '#0038A8' }} />
                </Line>
              </LineChart>
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
            <div className="h-64 w-full bg-slate-50/50 rounded-[32px] p-8 flex items-center justify-center overflow-hidden">
              <LineChart width={700} height={200} data={loadChartData} margin={{ top: 30, right: 40, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900, fill: '#475569'}} />
                <YAxis hide />
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', paddingTop: '20px' }} />
                <Line isAnimationActive={false} type="monotone" name="Carga (UA)" dataKey="srpe" stroke="#0b1220" strokeWidth={4} dot={{ r: 4, fill: '#0b1220' }} activeDot={{ r: 6 }}>
                  <LabelList dataKey="srpe" position="top" offset={10} formatter={formatNum} style={{ fontSize: '8px', fontWeight: '900', fill: '#0b1220' }} />
                </Line>
              </LineChart>
            </div>
          </div>
        </div>

        {/* PÁGINA 3: CARGA EXTERNA (GPS) */}
        <div 
          id={`player-report-page-3-${player.id}`}
          className="bg-white p-12 min-h-[297mm] flex flex-col shadow-sm print:shadow-none player-report-page"
        >
          <Header />
          
          <div className="mb-4">
            <h3 className="text-[10px] font-black text-[#0b1220] uppercase tracking-[0.3em] flex items-center gap-2">
              <i className="fa-solid fa-satellite-dish text-[#CF1B2B]"></i> ANÁLISIS DE CARGA EXTERNA (GPS)
            </h3>
            <p className="text-slate-400 text-[9px] uppercase tracking-wider mt-1 font-bold">Monitoreo dinámico del rendimiento físico en el microciclo</p>
          </div>

          {gpsChartData.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-[32px] p-12 text-slate-400">
              <i className="fa-solid fa-triangle-exclamation text-4xl mb-4 text-slate-300"></i>
              <p className="text-xs font-black uppercase tracking-widest italic text-center">Sin registros de GPS cargados para este período</p>
            </div>
          ) : (
            <div className="space-y-5 flex-1 flex flex-col justify-between">
              {/* Gráfico 1: Distancia Total vs. Acc/Dec */}
              <div className="flex flex-col">
                <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 flex justify-between items-center border-b border-slate-100 pb-1">
                  <span>1. Distancia Total (m) vs. Aceleraciones y Deceleraciones</span>
                  <span className="text-slate-400 text-[8px] font-bold">BARRA: DIST. TOTAL (IZQ) | LÍNEA: ACC + DEC (DER)</span>
                </h4>
                <div className="h-[145px] w-full bg-slate-50/50 rounded-[24px] p-3 flex items-center justify-center overflow-hidden">
                  <ComposedChart width={700} height={135} data={gpsChartData} margin={{ top: 15, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{fontSize: 8, fontWeight: 900, fill: '#475569'}} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fontSize: 8, fontWeight: 900, fill: '#0038A8'}} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fontSize: 8, fontWeight: 900, fill: '#CF1B2B'}} />
                    <Tooltip />
                    <Legend verticalAlign="top" height={20} iconType="circle" wrapperStyle={{ fontSize: '8px', fontWeight: '900', textTransform: 'uppercase' }} />
                    <Bar yAxisId="left" isAnimationActive={false} name="Distancia Total (m)" dataKey="dist_total" fill="#0038A8" radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="dist_total" position="top" offset={5} formatter={formatNum} style={{ fontSize: '7px', fontWeight: '900', fill: '#0038A8' }} />
                    </Bar>
                    <Line yAxisId="right" isAnimationActive={false} type="monotone" name="Acc + Dec" dataKey="acc_dec" stroke="#CF1B2B" strokeWidth={3} dot={{ r: 3, fill: '#CF1B2B' }}>
                      <LabelList dataKey="acc_dec" position="top" offset={5} formatter={formatNum} style={{ fontSize: '7px', fontWeight: '900', fill: '#CF1B2B' }} />
                    </Line>
                  </ComposedChart>
                </div>
              </div>

              {/* Gráfico 2: Distancia > 15 vs. Distancia > 20 */}
              <div className="flex flex-col">
                <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 flex justify-between items-center border-b border-slate-100 pb-1">
                  <span>2. Distancia {" > "} 15 km/h (m) vs. Distancia {" > "} 20 km/h (m)</span>
                  <span className="text-slate-400 text-[8px] font-bold">BARRA: DIST {" > "} 15 (IZQ) | LÍNEA: DIST {" > "} 20 (DER)</span>
                </h4>
                <div className="h-[145px] w-full bg-slate-50/50 rounded-[24px] p-3 flex items-center justify-center overflow-hidden">
                  <ComposedChart width={700} height={135} data={gpsChartData} margin={{ top: 15, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{fontSize: 8, fontWeight: 900, fill: '#475569'}} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fontSize: 8, fontWeight: 900, fill: '#0b1220'}} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fontSize: 8, fontWeight: 900, fill: '#CF1B2B'}} />
                    <Tooltip />
                    <Legend verticalAlign="top" height={20} iconType="circle" wrapperStyle={{ fontSize: '8px', fontWeight: '900', textTransform: 'uppercase' }} />
                    <Bar yAxisId="left" isAnimationActive={false} name="Dist > 15 km/h" dataKey="dist_15" fill="#0b1220" radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="dist_15" position="top" offset={5} formatter={formatNum} style={{ fontSize: '7px', fontWeight: '900', fill: '#0b1220' }} />
                    </Bar>
                    <Line yAxisId="right" isAnimationActive={false} type="monotone" name="Dist > 20 km/h" dataKey="dist_20" stroke="#CF1B2B" strokeWidth={3} dot={{ r: 3, fill: '#CF1B2B' }}>
                      <LabelList dataKey="dist_20" position="top" offset={5} formatter={formatNum} style={{ fontSize: '7px', fontWeight: '900', fill: '#CF1B2B' }} />
                    </Line>
                  </ComposedChart>
                </div>
              </div>

              {/* Gráfico 3: Distancia > 25 vs. Sprints */}
              <div className="flex flex-col">
                <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 flex justify-between items-center border-b border-slate-100 pb-1">
                  <span>3. Distancia {" > "} 25 km/h (m) vs. Cantidad de Sprints</span>
                  <span className="text-slate-400 text-[8px] font-bold">BARRA: DIST {" > "} 25 (IZQ) | LÍNEA: SPRINTS (DER)</span>
                </h4>
                <div className="h-[145px] w-full bg-slate-50/50 rounded-[24px] p-3 flex items-center justify-center overflow-hidden">
                  <ComposedChart width={700} height={135} data={gpsChartData} margin={{ top: 15, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{fontSize: 8, fontWeight: 900, fill: '#475569'}} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fontSize: 8, fontWeight: 900, fill: '#eab308'}} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fontSize: 8, fontWeight: 900, fill: '#10b981'}} />
                    <Tooltip />
                    <Legend verticalAlign="top" height={20} iconType="circle" wrapperStyle={{ fontSize: '8px', fontWeight: '900', textTransform: 'uppercase' }} />
                    <Bar yAxisId="left" isAnimationActive={false} name="Dist > 25 km/h" dataKey="dist_25" fill="#eab308" radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="dist_25" position="top" offset={5} formatter={formatNum} style={{ fontSize: '7px', fontWeight: '900', fill: '#eab308' }} />
                    </Bar>
                    <Line yAxisId="right" isAnimationActive={false} type="monotone" name="Número Sprints" dataKey="sprints" stroke="#10b981" strokeWidth={3} dot={{ r: 3, fill: '#10b981' }}>
                      <LabelList dataKey="sprints" position="top" offset={5} formatter={formatNum} style={{ fontSize: '7px', fontWeight: '900', fill: '#10b981' }} />
                    </Line>
                  </ComposedChart>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderMainContent = () => {
    if (viewMode === 'club_print' && selectedClubForPrint && selectedMicro) {
      return (
        <div className="space-y-6 pb-20 print:bg-white">
          <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm flex items-center justify-between print:hidden">
             <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-[#0b1220] rounded-2xl flex items-center justify-center text-white shadow-xl"><i className="fa-solid fa-file-pdf"></i></div>
                <h2 className="text-xl font-black uppercase tracking-tighter italic">REPORTE CONSOLIDADO: {selectedClubForPrint.name}</h2>
             </div>
             <div className="flex gap-4">
                <button 
                  onClick={shareClubReportWhatsApp}
                  className="bg-[#25D366] text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-[#128C7E] flex items-center gap-3 transition-all"
                >
                  <i className="fa-brands fa-whatsapp text-lg"></i> COMPARTIR
                </button>
                <button 
                  onClick={async () => {
                    if (!selectedClubForPrint) return;
                    await downloadReportPDF('club-report-container', getClubFileName());
                  }} 
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
              <PlayerReportSheet 
                key={p.id} 
                player={p} 
                history={clubHistoryData[p.player_id!] || { wellness: [], loads: [], gps: [], medical: [] }} 
              />
            ))}
          </div>
        </div>
      );
    }

    if (viewMode === 'club_list' && selectedMicro) {
      return (
        <div className="space-y-6 pb-20 relative">
          {/* Progress Overlay for ZIP */}
          {zipProgress && (
            <div className="fixed inset-0 bg-[#0b1220]/90 backdrop-blur-md z-[100] flex flex-col items-center justify-center text-white">
              <div className="w-24 h-24 bg-red-600 rounded-3xl flex items-center justify-center mb-8 shadow-2xl">
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

             <div className="flex gap-4">
                <button 
                  onClick={() => {
                      if (!selectedMicro) return;
                      const category = formatCategoryLabel(selectedMicro.category_id);
                      const text = encodeURIComponent(`*NOTIFICACIÓN DE DESCONVOCATORIAS*\n\n⚽ *Categoría:* ${category}\n🔄 *Microciclo:* #${selectedMicro.micro_number || selectedMicro.id}\n\nSe han oficializado las desconvocatorias del proceso. Saludos!`);
                      window.open(`https://wa.me/?text=${text}`, '_blank');
                  }}
                  className="bg-[#25D366] text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-[#128C7E] flex items-center gap-3 transition-all transform active:scale-95"
                >
                  <i className="fa-brands fa-whatsapp text-lg"></i> COMPARTIR
                </button>
                <button 
                  onClick={downloadAllClubsZip}
                  disabled={loading || isGeneratingZip}
                  className="bg-red-600 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-red-700 disabled:opacity-50 flex items-center gap-3 transition-all transform active:scale-95"
                >
                  {(loading || isGeneratingZip) ? <><i className="fa-solid fa-spinner fa-spin"></i> GENERANDO...</> : <><i className="fa-solid fa-file-zipper"></i> DESCARGAR TODO (.ZIP)</>}
                </button>
             </div>
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
      );
    }

    if (viewMode === 'report' && processingBajaAtleta && selectedMicro) {
      const isDesconvocado = !!bajaReasonsMap[processingBajaAtleta.player_id!];
      return (
        <div className="space-y-6 pb-20 print:bg-white">
          <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm flex items-center justify-between print:hidden">
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-xl"><i className="fa-solid fa-file-contract"></i></div>
              <h2 className="text-xl font-black uppercase tracking-tighter italic">Certificado Técnico: {processingBajaAtleta.name}</h2>
            </div>
            <div className="flex gap-4">
               <button 
                 onClick={shareIndividualReportWhatsApp}
                 className="bg-[#25D366] text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-[#128C7E] flex items-center gap-3 transition-all"
               >
                 <i className="fa-brands fa-whatsapp text-lg"></i> COMPARTIR
               </button>
               <button 
                 onClick={async () => {
                   await downloadReportPDF('report-printable', getIndividualFileName());
                 }} 
                 className="bg-[#0b1220] text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-3 disabled:opacity-50"
                 disabled={loading}
               >
                 {loading ? <><i className="fa-solid fa-spinner fa-spin"></i> ...</> : <><i className="fa-solid fa-download"></i> DESCARGAR PDF</>}
               </button>

               {/* Botón de Dar de Baja posicionado al lado de Descargar PDF, como estaba antes */}
               {isDesconvocado ? (
                 <button 
                   disabled 
                   className="bg-slate-100 text-slate-400 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-slate-200 flex items-center gap-2 cursor-not-allowed"
                 >
                   <i className="fa-solid fa-circle-check text-green-500"></i> DADO DE BAJA
                 </button>
               ) : (
                 <button 
                   onClick={() => {
                     setBajaReasonInput('Desconvocado por el técnico');
                     setShowBajaModal(true);
                   }} 
                   className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 transform"
                 >
                   <i className="fa-solid fa-user-xmark"></i> DAR DE BAJA
                 </button>
               )}

               <button onClick={() => setViewMode('details')} className="bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">VOLVER</button>
            </div>
          </div>

          <div id="report-printable" className="bg-white max-w-[850px] mx-auto shadow-2xl print:shadow-none print:p-0">
            <PlayerReportSheet player={processingBajaAtleta} history={historicalData} />
          </div>
        </div>
      );
    }

    if (viewMode === 'details' && selectedMicro) {
      return (
        <div className="space-y-6">
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
                <div className="py-20 text-center text-slate-400 font-black uppercase italic tracking-widest">Consultando Supabase...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {citedPlayers.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => {
                    const isDesconvocado = !!bajaReasonsMap[p.player_id!];
                    return (
                      <div key={p.id} className="p-6 bg-slate-50 rounded-[32px] border border-transparent hover:border-red-500 hover:bg-white transition-all group flex items-center justify-between shadow-sm">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-black text-slate-900 uppercase italic leading-none">{p.name}</p>
                            {isDesconvocado && (
                              <span className="bg-red-100 text-red-600 px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">DESCONVOCADO</span>
                            )}
                          </div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{p.position} | {p.club}</p>
                        </div>
                        <button 
                          onClick={() => handleIndividualReportClick(p)} 
                          className="px-5 py-2.5 bg-slate-200 text-slate-700 rounded-xl text-[9px] font-black uppercase shadow-sm hover:bg-slate-900 hover:text-white transition-all flex items-center gap-2 active:scale-95 transform"
                        >
                          <i className="fa-solid fa-file-contract"></i> VER REPORTE
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-8">
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
          <div className="py-32 text-center">
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
    );
  };

  return (
    <>
      {renderMainContent()}

      {/* Modal de Confirmación de Desconvocatoria */}
      {showBajaModal && (
        <div className="fixed inset-0 bg-[#0b1220]/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-md p-10 shadow-2xl border border-slate-100">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
                <i className="fa-solid fa-triangle-exclamation text-2xl"></i>
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter leading-none mb-3">¿Confirmar Desconvocatoria?</h3>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">{processingBajaAtleta?.name}</p>
              <p className="text-slate-500 text-sm leading-relaxed mb-8">
                ¿Está seguro de que desea desconvocar a este jugador? Dejará de aparecer en los registros de check-in y check-out de este microciclo.
              </p>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setShowBajaModal(false)}
                className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                CANCELAR
              </button>
              <button 
                onClick={confirmDesconvocatoria}
                disabled={loading}
                className="flex-1 py-4 bg-red-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-red-700 transition-all disabled:opacity-50 active:scale-95 transform"
              >
                {loading ? <i className="fa-solid fa-spinner fa-spin mr-2"></i> : null}
                ACEPTAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configuración / Error de Permisos RLS (42501) */}
      {showErrorSqlModal && (
        <div className="fixed inset-0 bg-[#0b1220]/90 backdrop-blur-sm z-[110] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[40px] w-full max-w-2xl p-10 shadow-2xl border border-slate-100 my-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center">
                <i className="fa-solid fa-shield-halved text-xl"></i>
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Permisos RLS Requeridos</h3>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Error de inserción (42501) en Supabase</p>
              </div>
            </div>

            <p className="text-slate-600 text-sm mb-6 leading-relaxed">
              La tabla de <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-xs font-bold text-red-600">desconvocatorias</code> tiene activada la seguridad de filas (RLS) en Supabase, lo que impide inserciones desde el cliente de manera directa. 
              Hemos creado un script SQL con la política adecuada y una función segura (<code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-xs font-bold text-green-600">create_desconvocatoria_safe</code>) para solucionarlo.
            </p>

            <p className="text-slate-900 text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-2">
              <i className="fa-solid fa-terminal text-slate-400"></i> Copia y ejecuta esto en tu panel de Supabase SQL Editor:
            </p>

            <div className="bg-slate-950 rounded-2xl p-6 font-mono text-xs text-slate-200 overflow-x-auto max-h-[220px] mb-6 shadow-inner relative group">
              <button 
                onClick={() => {
                  const sqlCode = `-- Configurar políticas y RPC seguro para desconvocatorias
ALTER TABLE public.desconvocatorias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for desconvocatorias" ON public.desconvocatorias;
CREATE POLICY "Enable all access for desconvocatorias" ON public.desconvocatorias FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.create_desconvocatoria_safe(
  p_athlete_id text,
  p_athlete_name text,
  p_club_name text,
  p_category_id text,
  p_microciclo_id text,
  p_motivo text,
  p_fecha_desconvocatoria text,
  p_staff_id text default null,
  p_observaciones_extra text default null
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.desconvocatorias (
    athlete_id, athlete_name, club_name, category_id, microciclo_id, motivo, fecha_desconvocatoria, staff_id, observaciones_extra
  ) VALUES (
    p_athlete_id, p_athlete_name, p_club_name, p_category_id, p_microciclo_id, p_motivo, p_fecha_desconvocatoria, 
    CASE WHEN p_staff_id IS NOT NULL AND p_staff_id <> '' THEN p_staff_id::uuid ELSE NULL END,
    p_observaciones_extra
  );
END;
$$;`;
                  navigator.clipboard.writeText(sqlCode);
                  alert("¡Código SQL copiado al portapapeles con éxito!");
                }}
                className="absolute right-4 top-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
              >
                <i className="fa-solid fa-copy mr-1"></i> Copiar Código
              </button>
              <pre className="text-[11px] leading-relaxed text-left text-slate-300">
{`-- 1. Asegurar RLS en desconvocatorias
ALTER TABLE public.desconvocatorias ENABLE ROW LEVEL SECURITY;

-- 2. Crear Política de acceso completo
DROP POLICY IF EXISTS "Enable all access for desconvocatorias" ON public.desconvocatorias;
CREATE POLICY "Enable all access for desconvocatorias" 
ON public.desconvocatorias FOR ALL USING (true) WITH CHECK (true);

-- 3. Crear Función Segura (Bypass RLS)
CREATE OR REPLACE FUNCTION public.create_desconvocatoria_safe(
  p_athlete_id text,
  p_athlete_name text,
  p_club_name text,
  p_category_id text,
  p_microciclo_id text,
  p_motivo text,
  p_fecha_desconvocatoria text,
  p_staff_id text default null,
  p_observaciones_extra text default null
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.desconvocatorias (
    athlete_id, athlete_name, club_name, category_id, microciclo_id, motivo, fecha_desconvocatoria, staff_id, observaciones_extra
  ) VALUES (
    p_athlete_id, p_athlete_name, p_club_name, p_category_id, p_microciclo_id, p_motivo, p_fecha_desconvocatoria, 
    CASE WHEN p_staff_id IS NOT NULL AND p_staff_id <> '' THEN p_staff_id::uuid ELSE NULL END,
    p_observaciones_extra
  );
END;
$$;`}
              </pre>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setShowErrorSqlModal(false)}
                className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-red-600 transition-all active:scale-95 transform shadow-lg"
              >
                ENTENDIDO, VOLVER AL SISTEMA
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
