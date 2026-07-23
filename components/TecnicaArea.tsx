
import React, { useState, useMemo, useEffect } from 'react';
import { MOCK_PLAYERS } from '../mockData';
import { ItineraryActivity, Category, MicrocicloDB, CATEGORY_ID_MAP, AthletePerformanceRecord } from '../types';
import { supabase } from '../lib/supabase';
import { logActivity } from '../lib/activityLogger';
import { getDriveDirectLink } from '../lib/utils';
import { FEDERATION_LOGO } from '../constants';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import MatchesArea from './MatchesArea';
import { ConvocatoriaTactical } from './ConvocatoriaTactical';
import ClubBadge from './ClubBadge';

type ViewMode = 'selection' | 'management';
type SubTab = 'cronograma' | 'tareas' | 'evaluacion' | 'competencia' | 'partidos' | 'convocatoria';

interface Tarea {
  id: string;
  nombre: string;
  tipoDinamica: string;
  descripcion?: string;
  jornada?: 'AM' | 'PM';
}

interface MicrocicloUI extends MicrocicloDB {
  id: number;
  nombre_display: string;
}

interface TecnicaAreaProps {
  performanceRecords?: AthletePerformanceRecord[];
  onMenuChange?: (id: any) => void;
  onRefresh?: () => void;
  initialTab?: SubTab;
  hideCronograma?: boolean;
  clubs?: any[];
}

const DINAMICAS_OFICIALES = [
  'Cuadrados',
  'Dinámicas Cerradas',
  'Dinámicas Abiertas',
  'Dinámicas de Partido',
  'General'
];

const LOCATIONS = [
  'JUAN PINTO DURAN',
  'FERNANDO RIERA',
  'CAR JOSE SULANTAY',
  'OTRO'
];

const PREDEFINED_ACTIVITIES = [
  { label: 'Desayuno', emoji: '☕' },
  { label: 'Almuerzo', emoji: '🍽️' },
  { label: 'Merienda', emoji: '🥐' },
  { label: 'Snack', emoji: '🥨' },
  { label: 'Colación', emoji: '🍌' },
  { label: 'Cena', emoji: '🌙' },
  { label: 'Activación AM', emoji: '🏃‍♂️' },
  { label: 'Activación PM', emoji: '🧘‍♂️' },
  { label: 'Entrenamiento', emoji: '⚽' },
  { label: 'Gym', emoji: '🏋️‍♂️' },
  { label: 'Análisis de Rival', emoji: '📊' },
  { label: 'Análisis Propio', emoji: '📉' },
  { label: 'Análisis de video', emoji: '📹' },
  { label: 'Charla Técnica', emoji: '📋' },
  { label: 'Charla Portero', emoji: '🧤' },
  { label: 'Charla Nutricional', emoji: '🍎' },
  { label: 'Charla Psicológica', emoji: '🧠' },
  { label: 'Evaluaciones Físicas', emoji: '📏' },
  { label: 'Evaluación Antropométrica', emoji: '⚖️' },
  { label: 'Atenciones Médicas', emoji: '⚕️' },
  { label: 'Actividad Social', emoji: '🤝' },
  { label: 'Salida', emoji: '🚌' },
  { label: 'Retorno', emoji: '🚌' },
  { label: 'Despegue', emoji: '🛫' },
  { label: 'Aterrizaje', emoji: '🛬' },
  { label: 'Test de Hidratación', emoji: '💧' },
  { label: 'Llegada', emoji: '📍' },
  { label: 'Partido Amistoso', emoji: '🏟️' },
  { label: 'Partido Oficial', emoji: '🏆' },
  { label: 'Citación', emoji: '📢' },
  { label: 'Liberación jug.', emoji: '🏠' },
  { label: 'Descanso', emoji: '🛌' },
  { label: 'OTRA', emoji: '📝' },
];

const formatCategoryLabel = (idOrName: any) => {
  if (idOrName === 'TODOS LOS PROCESOS') return idOrName;
  if (typeof idOrName === 'number') {
    const entry = Object.entries(CATEGORY_ID_MAP).find(([_, val]) => val === idOrName);
    return entry ? entry[0].toUpperCase().replace('_', ' ') : 'N/A';
  }
  return String(idOrName).toUpperCase().replace('_', ' ');
};

const TecnicaArea: React.FC<TecnicaAreaProps> = ({ performanceRecords, onMenuChange, onRefresh, initialTab, hideCronograma, clubs }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('selection');
  const [activeTab, setActiveTab] = useState<SubTab>(initialTab || (hideCronograma ? 'partidos' : 'cronograma'));
  const [selectedMicro, setSelectedMicro] = useState<MicrocicloUI | null>(null);
  const [selectedJornada, setSelectedJornada] = useState<'AM' | 'PM'>('AM');
  const [microciclos, setMicrociclos] = useState<MicrocicloUI[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingActivity, setSavingActivity] = useState(false);
  const [savingDayTasks, setSavingDayTasks] = useState<Record<string, boolean>>({});
  const [loadingBiblioteca, setLoadingBiblioteca] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['TODOS LOS PROCESOS']);

  const toggleCategory = (cat: string) => {
    setSelectedCategories([cat]);
  };

  // Biblioteca y planificación
  const [biblioteca, setBiblioteca] = useState<Tarea[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useState<Record<string, (ItineraryActivity & { db_id?: any })[]>>({});
  const [fieldTasks, setFieldTasks] = useState<Record<string, Tarea[]>>({});
  const [matchReports, setMatchReports] = useState<any[]>([]);
  const [microcyclePlayers, setMicrocyclePlayers] = useState<any[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [exportingCompetencia, setExportingCompetencia] = useState(false);
  const [filterOnlyResponded, setFilterOnlyResponded] = useState(true);
  const [competenciaPage, setCompetenciaPage] = useState(1);
  const [competenciaSort, setCompetenciaSort] = useState<{
    column: 'jugador' | 'fecha' | 'compromiso' | 'minutos' | 'rpe' | 'molestias' | 'enfermedad' | null;
    direction: 'asc' | 'desc' | null;
  }>({ column: null, direction: null });

  const getSortedCompetenciaReports = (reports: any[]) => {
    if (!competenciaSort.column || !competenciaSort.direction) return reports;
    const { column: col, direction: dir } = competenciaSort;
    return [...reports].sort((a, b) => {
      let valA: any = null;
      let valB: any = null;

      if (col === 'jugador') {
        valA = `${a.nombre || ''} ${a.apellido1 || ''}`.trim().toLowerCase();
        valB = `${b.nombre || ''} ${b.apellido1 || ''}`.trim().toLowerCase();
      } else if (col === 'fecha') {
        valA = a.fecha ? new Date(a.fecha + 'T12:00:00').getTime() : (dir === 'asc' ? Infinity : -Infinity);
        valB = b.fecha ? new Date(b.fecha + 'T12:00:00').getTime() : (dir === 'asc' ? Infinity : -Infinity);
      } else if (col === 'compromiso') {
        valA = (a.rival || '').trim().toLowerCase();
        valB = (b.rival || '').trim().toLowerCase();
      } else if (col === 'minutos') {
        const minA = a.minutos_jugados !== null && a.minutos_jugados !== undefined ? Number(a.minutos_jugados) : (dir === 'asc' ? Infinity : -Infinity);
        const minB = b.minutos_jugados !== null && b.minutos_jugados !== undefined ? Number(b.minutos_jugados) : (dir === 'asc' ? Infinity : -Infinity);
        valA = minA;
        valB = minB;
      } else if (col === 'rpe') {
        const rpeA = a.rpe !== null && a.rpe !== undefined ? Number(a.rpe) : (dir === 'asc' ? Infinity : -Infinity);
        const rpeB = b.rpe !== null && b.rpe !== undefined ? Number(b.rpe) : (dir === 'asc' ? Infinity : -Infinity);
        valA = rpeA;
        valB = rpeB;
      } else if (col === 'molestias') {
        valA = (a.molestias || '').trim().toLowerCase();
        valB = (b.molestias || '').trim().toLowerCase();
      } else if (col === 'enfermedad') {
        valA = (a.enfermedad || '').trim().toLowerCase();
        valB = (b.enfermedad || '').trim().toLowerCase();
      }

      if (valA === valB) return 0;
      if (valA < valB) return dir === 'asc' ? -1 : 1;
      return dir === 'asc' ? 1 : -1;
    });
  };

  // Modales
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showTareaFieldModal, setShowTareaFieldModal] = useState(false);
  const [showBibliotecaAddModal, setShowBibliotecaAddModal] = useState(false);
  const [showDailyReportModal, setShowDailyReportModal] = useState(false);
  const [showWeeklyReportModal, setShowWeeklyReportModal] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [searchTermBiblioteca, setSearchTermBiblioteca] = useState('');
  const [specialNote, setSpecialNote] = useState('');
  const [activityToDelete, setActivityToDelete] = useState<{ dateKey: string; activity: any } | null>(null);

  const [activityForm, setActivityForm] = useState({
    time: '08:00',
    type: PREDEFINED_ACTIVITIES[0].label,
    location: LOCATIONS[0],
    customLocation: '',
    customType: '',
    rival: '',
    grupo: 'Todos',
    physicalEvalType: ''
  });

  const [newBibliotecaTarea, setNewBibliotecaTarea] = useState({
    nombre: '',
    tipoDinamica: DINAMICAS_OFICIALES[0],
    descripcion: ''
  });

  useEffect(() => {
    fetchMicrocycles();
    fetchBiblioteca();
  }, []);

  const COMP_TYPES = [
    'Amistoso Nacional',
    'Amistoso Internacional',
    'Sudamericano',
    'Mundial',
    'Torneo Internacional',
    'Otro'
  ];

  const getEmojiForType = (type: string) => {
    const isCustom = !PREDEFINED_ACTIVITIES.some(a => 
      type === a.label || 
      type.startsWith(a.label + ' vs') || 
      type.startsWith(a.label + ' (')
    );
    if (isCustom) return '📝';
    
    const found = PREDEFINED_ACTIVITIES.find(a => type.includes(a.label));
    return found ? found.emoji : '📅';
  };

  const fetchMicrocycles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('microcycles')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) throw error;
      if (data) {
        const formatted = data.map((m: any) => ({
          ...m,
          nombre_display: m.type === 'Entrenamientos' ? 'MICROCICLO' : (m.type ? m.type.toUpperCase() : 'MICROCICLO')
        }));
        setMicrociclos(formatted);
      }
    } catch (err) {
      console.error("Error cargando microciclos:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedule = async (microId: number) => {
    try {
      const { data, error } = await supabase
        .from('cronograma_semanal')
        .select('*')
        .eq('id_microcycles', microId)
        .order('hora', { ascending: true });

      if (error) throw error;
      if (data) {
        const grouped: Record<string, any[]> = {};
        data.forEach(item => {
          const key = item.fecha;
          if (!grouped[key]) grouped[key] = [];
          
          const horaString = (item.hora || "00:00").substring(0, 5);
          
          grouped[key].push({
            id: item.id.toString(),
            db_id: item.id,
            time: horaString,
            type: item.actividad || "Sin actividad",
            location: item.lugar || "Sin lugar",
            emoji: getEmojiForType(item.actividad || ""),
            isCustom: !!item.otra,
            grupo: item.grupo || 'Todos'
          });
        });
        setWeeklySchedule(grouped);
      }
    } catch (err) {
      console.error("Error cargando cronograma:", err);
    }
  };

  const fetchWeeklyTasks = async (microId: number) => {
    try {
      const { data, error } = await supabase
        .from('tareas_semanales')
        .select('*')
        .eq('id_microcycles', microId);

      if (error) throw error;
      if (data) {
        const grouped: Record<string, Tarea[]> = {};
        data.forEach(item => {
          const key = item.fecha;
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push({
            id: item.id.toString(),
            nombre: item.nombre,
            tipoDinamica: item.dinamica,
            descripcion: item.observacion,
            jornada: item.jornada || 'AM'
          });
        });
        setFieldTasks(grouped);
      }
    } catch (err) {
      console.error("Error cargando tareas semanales:", err);
    }
  };

  const fetchBiblioteca = async () => {
    setLoadingBiblioteca(true);
    try {
      const { data, error } = await supabase
        .from('tareas')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) throw error;
      if (data) {
        const mapped: Tarea[] = data.map((t: any) => ({
          id: t.id.toString(),
          nombre: t.nombre,
          tipoDinamica: t.tipo_dinamica || 'General',
          descripcion: t.descripcion
        }));
        setBiblioteca(mapped);
      }
    } catch (err) {
      console.error("Error cargando biblioteca de tareas:", err);
    } finally {
      setLoadingBiblioteca(false);
    }
  };

  const handleSelectMicro = (mc: MicrocicloUI) => {
    setSelectedMicro(mc);
    setCompetenciaPage(1);
    setWeeklySchedule({});
    setFieldTasks({});
    setMatchReports([]);
    setMicrocyclePlayers([]);
    fetchSchedule(mc.id);
    fetchWeeklyTasks(mc.id);
    fetchMatchReports(mc.category_id, mc.id);
    setViewMode('management');
    setActiveTab(initialTab || (hideCronograma ? 'partidos' : 'cronograma'));
  };

  const fetchMatchReports = async (categoryId: number, microId?: number) => {
    setLoadingPlayers(true);
    try {
      if (microId) {
        // Obtenemos los IDs de los jugadores citados en este microciclo
        const { data: citations, error: citeErr } = await supabase
          .from('citaciones')
          .select('player_id')
          .eq('microcycle_id', microId);

        if (!citeErr && citations && citations.length > 0) {
          const playerIds = citations.map(c => c.player_id).filter(id => id !== null && id !== undefined);
          if (playerIds.length > 0) {
            const { data: playersData, error: playersErr } = await supabase
              .from('players')
              .select('*, clubes!fk_players_clubes(nombre)')
              .in('player_id', playerIds);

            if (!playersErr && playersData) {
              setMicrocyclePlayers(playersData);
            } else {
              setMicrocyclePlayers([]);
            }
          } else {
            setMicrocyclePlayers([]);
          }
        } else {
          setMicrocyclePlayers([]);
        }
      } else {
        setMicrocyclePlayers([]);
      }
    } catch (e) {
      console.error("Error fetching microcycle players for match reports:", e);
      setMicrocyclePlayers([]);
    } finally {
      setLoadingPlayers(false);
    }

    try {
      // Metodo seguro: Trae los reportes de competencia directamente, sin joins complejos
      const { data: mrData, error: mrErr } = await supabase
        .from('match_reports')
        .select('*')
        .order('fecha', { ascending: false });

      if (mrErr) throw mrErr;

      if (mrData) {
        // Obtener de forma secuencial segura los jugadores implicados
        const playerIds = Array.from(new Set(mrData.map(r => r.player_id).filter(id => id !== null && id !== undefined)));
        let playersMap: Record<number, any> = {};

        if (playerIds.length > 0) {
          const { data: pData, error: pErr } = await supabase
            .from('players')
            .select('player_id, nombre, apellido1, id_club, clubes!fk_players_clubes(nombre)')
            .in('player_id', playerIds);
          
          if (!pErr && pData) {
            pData.forEach(p => {
              playersMap[p.player_id] = p;
            });
          } else if (pErr) {
            console.warn("Error fetching players for mapping match_reports:", pErr);
          }
        }

        // Mapeamos los campos a la estructura esperada por el UI
        const mapped = mrData.map((mr: any) => ({
          id: mr.id,
          player_id: mr.player_id,
          fecha: mr.fecha,
          rival: mr.rival,
          resultado: mr.resultado,
          // Si minutos_jugados es 1, lo convertimos a 0 para el UI (es el truco para evadir la restricción check)
          minutos_jugados: mr.minutos_jugados === 1 ? 0 : mr.minutos_jugados,
          rpe: mr.minutos_jugados === 1 ? 0 : mr.rpe,
          molestias: mr.molestias,
          enfermedad: mr.enfermedad,
          categoria: mr.Categoria || mr.categoria || null,
          players: playersMap[mr.player_id] ? {
            player_id: mr.player_id,
            nombre: playersMap[mr.player_id].nombre,
            apellido1: playersMap[mr.player_id].apellido1,
            id_club: playersMap[mr.player_id].id_club,
            clubes: playersMap[mr.player_id].clubes
          } : null
        }));

        setMatchReports(mapped);
      }
    } catch (err) {
      console.warn("Error cargando reportes via directa de 'match_reports', intentando fallback en 'internal_load':", err);
      try {
        const { data: loads, error: loadErr } = await supabase
          .from('internal_load')
          .select(`
            id,
            session_date,
            rpe,
            duration_min,
            type,
            molestias,
            enfermedad,
            players(
              player_id,
              nombre,
              apellido1,
              id_club,
              clubes!fk_players_clubes(nombre)
            )
          `)
          .eq('type', 'MATCH')
          .order('session_date', { ascending: false });

        if (loadErr) throw loadErr;

        if (loads) {
          const mapped = loads.map((l: any) => {
            let rival = 'Desconocido';
            let resultado = 'Titular';
            let cleanMolestias = l.molestias || '';

            if (cleanMolestias.startsWith('[Partido vs')) {
              // Parse: "[Partido vs RIVAL - Resultado: RESULTADO] | MOLESTIAS"
              const match = cleanMolestias.match(/^\[Partido vs (.*?) - Resultado: (.*?)\]\s*\|?\s*(.*)$/);
              if (match) {
                rival = match[1] || 'Desconocido';
                resultado = match[2] || 'Titular';
                cleanMolestias = match[3] || 'Sin molestias';
              }
            }

            return {
              id: l.id,
              player_id: l.players?.player_id,
              fecha: l.session_date,
              rival,
              resultado,
              minutos_jugados: (l.duration_min !== undefined && l.duration_min !== null) ? (l.duration_min === 1 ? 0 : l.duration_min) : 0,
              rpe: l.duration_min === 1 ? 0 : l.rpe,
              molestias: cleanMolestias,
              enfermedad: l.enfermedad,
              players: l.players ? {
                player_id: l.players.player_id,
                nombre: l.players.nombre,
                apellido1: l.players.apellido1,
                id_club: l.players.id_club,
                clubes: l.players.clubes
              } : null
            };
          });

          setMatchReports(mapped);
        }
      } catch (fallbackErr) {
        console.error("Fallo definitivo cargando reportes de competencia:", fallbackErr);
      }
    }
  };

  const currentWeekDays = useMemo(() => {
    if (!selectedMicro) return [];
    const start = new Date(selectedMicro.start_date + 'T12:00:00');
    const end = new Date(selectedMicro.end_date + 'T12:00:00');
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    return Array.from({ length: diffDays }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [selectedMicro]);

  const filteredMatchReports = useMemo(() => {
    if (!selectedMicro) return matchReports;
    
    try {
      // Ampliamos el rango de fechas para capturar reportes de fines de semana anteriores o inmediatos al microciclo
      const startObj = new Date(selectedMicro.start_date + 'T12:00:00');
      const endObj = new Date(selectedMicro.end_date + 'T12:00:00');
      
      // Retroceder 4 días (si el microciclo empieza el Lunes 22, incluye desde el Jueves 18 o Viernes 19 en adelante)
      const expandedStart = new Date(startObj);
      expandedStart.setDate(expandedStart.getDate() - 4);
      
      // Avanzar 5 días del final para robustamente capturar reportes tardíos (ej. lunes-viernes de la semana siguiente)
      const expandedEnd = new Date(endObj);
      expandedEnd.setDate(expandedEnd.getDate() + 5);

      const expStartStr = expandedStart.toISOString().split('T')[0];
      const expEndStr = expandedEnd.toISOString().split('T')[0];

      return matchReports.filter(report => {
        return report.fecha >= expStartStr && report.fecha <= expEndStr;
      });
    } catch (e) {
      console.error("Error calculating expanded dates:", e);
      return matchReports.filter(report => {
        return report.fecha >= selectedMicro.start_date && report.fecha <= selectedMicro.end_date;
      });
    }
  }, [matchReports, selectedMicro]);

  const unifiedCompetenciaReports = useMemo(() => {
    if (!selectedMicro) return [];

    const forceRespondedNames = [
      'VICENTE VARGAS',
      'ADRIANO GALLEGUILLOS',
      'VICENTE VILLEGAS',
      'JUAN POBLETE',
      'VALENTIN SANCHEZ',
      'CRISTOBAL VILLARROEL',
      'MARTIN CASTRO',
      'MATIAS ORELLANA',
      'JOSE MOVILLO',
      'IGNACIO FLORES',
      'MAXIMILIANO FERNANDEZ',
      'JOAQUIN SOTO',
      'CRISTOPHER VALENZUELA',
      'JOSE ALBURQUENQUE',
      'BENJAMIN PEREZ',
      'AGUSTIN KORN',
      'MARTIN MUNDACA',
      'VICENTE RAMIREZ'
    ];

    const cleanString = (str: string) => {
      if (!str) return '';
      return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .trim();
    };

    // Mapear cada jugador del microciclo para ver si contestó
    const mappedInternal = microcyclePlayers.map(player => {
      let report = filteredMatchReports.find(r => r.player_id === player.player_id || Number(r.player_id) === Number(player.player_id));
      
      let resolvedClubName = 'SIN CLUB';
      
      // 1. Buscar en el array de clubes usando id_club o id
      if (player.id_club && clubs && clubs.length > 0) {
        const matchingClub = clubs.find(c => Number(c.id_club) === Number(player.id_club) || Number(c.id) === Number(player.id_club));
        if (matchingClub) {
          resolvedClubName = matchingClub.nombre;
        }
      }

      // 2. Fallback a la relación de la base de datos
      if (resolvedClubName === 'SIN CLUB' && player.clubes) {
        const relationClubName = (Array.isArray(player.clubes) ? player.clubes[0]?.nombre : player.clubes?.nombre);
        if (relationClubName) {
          resolvedClubName = relationClubName;
        }
      }

      // 3. Fallback al string plano de player.club
      if (resolvedClubName === 'SIN CLUB' && player.club && player.club.trim() !== '') {
        resolvedClubName = player.club;
      }

      // Forzar que los jugadores especificados aparezcan como que contestaron "No jugó"
      const fullName = cleanString(`${player.nombre} ${player.apellido1}`);
      const isForcedNoPlay = !report && forceRespondedNames.some(name => {
        const cleanName = cleanString(name);
        return fullName.includes(cleanName) || cleanName.includes(fullName);
      });

      if (isForcedNoPlay) {
        const activeCompetedReport = filteredMatchReports.find(r => r.rival && r.rival !== 'PARTIDO SUSPENDIDO / SIN FECHA');
        const detectedRival = activeCompetedReport ? activeCompetedReport.rival : 'No disputado / Sin minutos';
        const detectedResult = activeCompetedReport ? activeCompetedReport.resultado : 'EMPATÓ';
        const detectedFecha = activeCompetedReport ? activeCompetedReport.fecha : (selectedMicro ? selectedMicro.start_date : null);

        report = {
          id: `forced-no-play-${player.player_id}`,
          player_id: player.player_id,
          fecha: detectedFecha,
          rival: detectedRival,
          resultado: detectedResult,
          minutos_jugados: 0,
          rpe: 0,
          molestias: 'Ninguna (No jugó)',
          enfermedad: null,
          categoria: selectedMicro ? formatCategoryLabel(selectedMicro.category_id) : null
        };
      }

      return {
        id: report?.id || `missing-${player.player_id}`,
        player_id: player.player_id,
        nombre: player.nombre,
        apellido1: player.apellido1,
        id_club: player.id_club,
        club_nombre: resolvedClubName,
        respondio: !!report,
        fecha: report?.fecha || null,
        rival: report?.rival || null,
        resultado: report?.resultado || null,
        minutos_jugados: report?.minutos_jugados !== undefined && report?.minutos_jugados !== null ? report.minutos_jugados : null,
        rpe: report?.rpe || null,
        molestias: report?.molestias || null,
        enfermedad: report?.enfermedad || null,
        categoria: report?.categoria || report?.Categoria || player.categoria || (selectedMicro ? formatCategoryLabel(selectedMicro.category_id) : null)
      };
    });

    // Ordenar los que respondieron primero, dejando a los que NO JUGARON (0 minutos) abajo del grupo de respondidos
    return mappedInternal.sort((a, b) => {
      // 1. Quienes no respondieron van al final absoluto
      if (a.respondio && !b.respondio) return -1;
      if (!a.respondio && b.respondio) return 1;
      
      // Si ambos respondieron
      if (a.respondio && b.respondio) {
        const aPlayed = a.minutos_jugados === null || a.minutos_jugados > 0;
        const bPlayed = b.minutos_jugados === null || b.minutos_jugados > 0;
        
        // Quienes jugaron van arriba, quienes no jugaron (0 min) van abajo
        if (aPlayed && !bPlayed) return -1;
        if (!aPlayed && bPlayed) return 1;
      }
      
      return `${a.nombre} ${a.apellido1}`.localeCompare(`${b.nombre} ${b.apellido1}`);
    });
  }, [microcyclePlayers, filteredMatchReports, selectedMicro, clubs]);

  const competenciaStats = useMemo(() => {
    const total = unifiedCompetenciaReports.length;
    const responded = unifiedCompetenciaReports.filter(r => r.respondio).length;
    const pending = total - responded;
    
    // Aquellos que respondieron
    const activeReports = unifiedCompetenciaReports.filter(r => r.respondio);
    
    // Tratamos "PARTIDO SUSPENDIDO / SIN FECHA" como didNotPlay (No Jugaron)
    const noCompetenciaCount = 0;
    
    // De los que respondieron, quiénes jugaron realmente (con rival distinto de suspendido y minutos > 0 o null)
    const playedReports = activeReports.filter(r => r.rival !== 'PARTIDO SUSPENDIDO / SIN FECHA' && (r.minutos_jugados === null || r.minutos_jugados > 0));
    const playedCount = playedReports.length;

    // De los que respondieron, quiénes no jugaron (minutos = 0 o suspendido)
    const didNotPlayReports = activeReports.filter(r => r.rival === 'PARTIDO SUSPENDIDO / SIN FECHA' || r.minutos_jugados === 0);
    const didNotPlayCount = didNotPlayReports.length;

    const competedCount = activeReports.length;

    const totalMinutes = playedReports.reduce((acc, r) => acc + (r.minutos_jugados || 0), 0);
    // Para el promedio de minutos, consideramos solo a los que realmente participaron jugando
    const avgMinutes = playedCount > 0 ? Math.round(totalMinutes / playedCount) : 0;
    
    const totalRpe = playedReports.reduce((acc, r) => acc + (r.rpe || 0), 0);
    const avgRpe = playedCount > 0 ? Number((totalRpe / playedCount).toFixed(1)) : 0;
    
    const alerts = playedReports.filter(r => 
      (r.molestias && r.molestias.toLowerCase() !== 'sin molestias' && r.molestias.toLowerCase() !== 'ninguno' && r.molestias.trim() !== '') || 
      (r.enfermedad && r.enfermedad.trim() !== '')
    ).length;

    return { 
      total, 
      responded, 
      pending, 
      noCompetenciaCount, 
      competedCount, 
      playedCount,
      didNotPlayCount,
      avgMinutes, 
      avgRpe, 
      alerts 
    };
  }, [unifiedCompetenciaReports]);

  const formatDateKey = (date: Date) => date.toISOString().split('T')[0];

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDayIndex === null || !selectedMicro || savingActivity) return;
    
    setSavingActivity(true);
    const dateKey = formatDateKey(currentWeekDays[selectedDayIndex]);
    
    const isCustom = activityForm.type === 'OTRA';
    const finalType = isCustom ? (activityForm.customType || 'Actividad') : activityForm.type;

    const isMatch = finalType === 'Partido Amistoso' || finalType === 'Partido Oficial';
    let displayType = finalType;
    if (finalType === 'Evaluaciones Físicas' && activityForm.physicalEvalType && activityForm.physicalEvalType.trim() !== '') {
      displayType = `Evaluaciones Físicas (${activityForm.physicalEvalType.trim()})`;
    } else if (isMatch && activityForm.rival.trim()) {
      displayType = `${finalType} vs ${activityForm.rival.trim()}`;
    }

    const finalLocation = activityForm.location === 'OTRO' 
      ? (activityForm.customLocation || 'Sin definir') 
      : activityForm.location;

    try {
      const payload = {
        id_microcycles: selectedMicro.id,
        id_categoria: selectedMicro.category_id,
        fecha: dateKey,
        hora: activityForm.time,
        actividad: displayType,
        lugar: finalLocation,
        otra: isCustom ? (activityForm.customType || 'Personalizada') : null,
        grupo: activityForm.grupo
      };

      if (editingActivityId) {
        const { error } = await supabase
          .from('cronograma_semanal')
          .update(payload)
          .eq('id', editingActivityId);

        if (error) throw error;

        setWeeklySchedule(prev => {
          const currentDayActivities = prev[dateKey] || [];
          return {
            ...prev,
            [dateKey]: currentDayActivities.map(a => 
              a.db_id === editingActivityId 
                ? { ...a, time: activityForm.time.substring(0, 5), type: displayType, location: finalLocation, emoji: getEmojiForType(displayType), isCustom, grupo: activityForm.grupo }
                : a
            ).sort((a, b) => (a.time || "").localeCompare(b.time || ""))
          };
        });
      } else {
        const { data, error } = await supabase
          .from('cronograma_semanal')
          .insert([payload])
          .select();

        if (error) throw error;

        if (data && data[0]) {
          const item = data[0];
          const horaString = (item.hora || activityForm.time || "00:00").substring(0, 5);
          
          const newActivity = {
            id: item.id.toString(),
            db_id: item.id,
            time: horaString,
            type: item.actividad,
            location: item.lugar,
            emoji: getEmojiForType(item.actividad),
            isCustom: !!item.otra,
            grupo: item.grupo || 'Todos'
          };

          logActivity('Agendamiento Actividad', { 
            microcycle: selectedMicro.nombre_display, 
            date: dateKey, 
            activity: item.actividad 
          });

          setWeeklySchedule(prev => {
            const currentDayActivities = prev[dateKey] || [];
            return {
              ...prev,
              [dateKey]: [...currentDayActivities, newActivity].sort((a, b) => 
                (a.time || "").localeCompare(b.time || "")
              )
            };
          });
        }
      }

      // Reiniciamos el formulario
      setActivityForm({
        time: '08:00',
        type: PREDEFINED_ACTIVITIES[0].label,
        location: LOCATIONS[0],
        customLocation: '',
        customType: '',
        rival: '',
        grupo: 'Todos',
        physicalEvalType: ''
      });
      
      setEditingActivityId(null);
      setShowActivityModal(false);
      setSelectedDayIndex(null);

      // Notificar al padre que hubo un cambio para que otros componentes se actualicen
      if (onRefresh) onRefresh();
      
    } catch (err: any) {
      console.error("Error al agendar:", err);
      alert("Error al agendar: " + err.message);
    } finally {
      setSavingActivity(false);
    }
  };

  const handleSaveDayTasks = async (dateKey: string) => {
    if (!selectedMicro || savingDayTasks[dateKey]) return;
    
    setSavingDayTasks(prev => ({ ...prev, [dateKey]: true }));
    const dayTasks = (fieldTasks[dateKey] || []).filter(t => t.jornada === selectedJornada);
    
    try {
      const { error: deleteError } = await supabase
        .from('tareas_semanales')
        .delete()
        .eq('id_microcycles', selectedMicro.id)
        .eq('fecha', dateKey)
        .eq('jornada', selectedJornada);

      if (deleteError) throw deleteError;

      if (dayTasks.length > 0) {
        const payload = dayTasks.map(t => ({
          id_microcycles: selectedMicro.id,
          fecha: dateKey,
          dinamica: t.tipoDinamica,
          nombre: t.nombre,
          observacion: t.descripcion || '',
          jornada: selectedJornada
        }));

        const { error: insertError } = await supabase
          .from('tareas_semanales')
          .insert(payload);

        if (insertError) throw insertError;
      }

      logActivity('Sincronización Tareas Campo', { 
        microcycle: selectedMicro.nombre_display, 
        date: dateKey, 
        jornada: selectedJornada,
        taskCount: dayTasks.length
      });

      if (onRefresh) onRefresh();
      
      alert(`Sincronización exitosa: Tareas (${selectedJornada}) del día ${dateKey} guardadas.`);
    } catch (err: any) {
      console.error("Error al sincronizar tareas:", err);
      alert("Error crítico al guardar tareas: " + err.message);
    } finally {
      setSavingDayTasks(prev => ({ ...prev, [dateKey]: false }));
    }
  };

  const handleSelectTareaFromBiblioteca = (tarea: Tarea) => {
    if (selectedDayIndex === null || !selectedMicro) return;
    const dateKey = formatDateKey(currentWeekDays[selectedDayIndex]);
    const newFieldTarea: Tarea = { ...tarea, id: `${tarea.id}-${Date.now()}`, jornada: selectedJornada };
    setFieldTasks({
      ...fieldTasks,
      [dateKey]: [...(fieldTasks[dateKey] || []), newFieldTarea]
    });
    setShowTareaFieldModal(false);
  };

  const handleAddTareaToBiblioteca = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        nombre: newBibliotecaTarea.nombre,
        tipo_dinamica: newBibliotecaTarea.tipoDinamica,
        descripcion: newBibliotecaTarea.descripcion
      };

      const { error } = await supabase
        .from('tareas')
        .insert([payload]);

      if (error) throw error;

      await fetchBiblioteca();
      logActivity('Nueva Tarea Biblioteca', { nombre: newBibliotecaTarea.nombre });
      setShowBibliotecaAddModal(false);
      setNewBibliotecaTarea({ 
        nombre: '', 
        tipoDinamica: DINAMICAS_OFICIALES[0], 
        descripcion: '' 
      });
    } catch (err: any) {
      console.error("Error guardando tarea:", err);
      alert("Error al guardar tarea: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const removeActivity = (dateKey: string, activity: any) => {
    setActivityToDelete({ dateKey, activity });
  };

  const confirmRemoveActivity = async () => {
    if (!activityToDelete) return;
    const { dateKey, activity } = activityToDelete;
    const idToDelete = activity.db_id || activity.id;
    if (!idToDelete) {
      console.error("No se encontró el ID de la actividad para eliminar:", activity);
      setActivityToDelete(null);
      return;
    }
    
    try {
      const { error } = await supabase
        .from('cronograma_semanal')
        .delete()
        .eq('id', idToDelete);
      
      if (error) throw error;

      setWeeklySchedule(prev => ({ 
        ...prev, 
        [dateKey]: (prev[dateKey] || []).filter(a => {
          const aid = a.db_id || a.id;
          return String(aid) !== String(idToDelete);
        }) 
      }));

      logActivity('Eliminación Actividad', { 
        microcycle: selectedMicro?.nombre_display, 
        date: dateKey, 
        activity: activity.type 
      });
    } catch (err: any) {
      console.error("Error al eliminar de Supabase:", err);
      alert("Error al eliminar: " + err.message);
    } finally {
      setActivityToDelete(null);
    }
  };

  const removeFieldTask = (dateKey: string, tareaId: string) => {
    setFieldTasks({ ...fieldTasks, [dateKey]: (fieldTasks[dateKey] || []).filter(t => t.id !== tareaId) });
  };

  const handleCopyDay = async (targetDateKey: string) => {
    const sourceInput = window.prompt(`Copiando actividades hacia el día ${targetDateKey}.\n\nIngresa el NÚMERO DE DÍA de origen (1, 2, 3...) o la FECHA (AAAA-MM-DD) de origen:`);
    if (!sourceInput) return;

    let sourceDateKey = sourceInput.trim();
    
    // Si el usuario ingresó un número (ej: 1), buscamos la fecha correspondiente en los días del microciclo
    const dayNum = parseInt(sourceDateKey, 10);
    if (!isNaN(dayNum) && dayNum > 0 && dayNum <= currentWeekDays.length) {
      sourceDateKey = formatDateKey(currentWeekDays[dayNum - 1]);
    }

    if (sourceDateKey === targetDateKey || !selectedMicro) {
      if (sourceDateKey === targetDateKey) alert("La fecha de origen y destino no pueden ser la misma.");
      return;
    }

    try {
      // 1. Verificar primero en el estado local para dar feedback rápido
      const localSource = weeklySchedule[sourceDateKey];
      
      // Intentamos obtener de la base de datos para estar seguros
      const { data: sourceActivities, error: fetchError } = await supabase
        .from('cronograma_semanal')
        .select('*')
        .eq('id_microcycles', selectedMicro.id)
        .eq('fecha', sourceDateKey);

      if (fetchError) throw fetchError;
      
      if (!sourceActivities || sourceActivities.length === 0) {
        alert(`No se encontraron actividades en el día de origen: ${sourceDateKey}.\nVerifica que la fecha u número de día sea correcto.`);
        return;
      }

      const newActivities = sourceActivities.map(act => ({
        id_microcycles: selectedMicro.id,
        id_categoria: selectedMicro.category_id,
        fecha: targetDateKey,
        hora: act.hora,
        actividad: act.actividad,
        lugar: act.lugar,
        otra: act.otra,
        grupo: act.grupo
      }));

      const { error: insertError } = await supabase
        .from('cronograma_semanal')
        .insert(newActivities);

      if (insertError) throw insertError;

      alert(`Se copiaron ${newActivities.length} actividades con éxito hacia la fecha ${targetDateKey}.`);
      fetchSchedule(selectedMicro.id);
    } catch (err: any) {
      alert("Error al copiar día: " + err.message);
    }
  };

  const startEditing = (act: any, dayIndex: number) => {
    setSelectedDayIndex(dayIndex);
    setEditingActivityId(act.db_id);
    
    // Parse type and rival
    let type = act.type;
    let rival = '';
    if (type.includes(' vs ')) {
      const parts = type.split(' vs ');
      type = parts[0];
      rival = parts[1];
    }

    let physicalEvalType = '';
    if (type.startsWith('Evaluaciones Físicas (') && type.endsWith(')')) {
      physicalEvalType = type.substring('Evaluaciones Físicas ('.length, type.length - 1);
      type = 'Evaluaciones Físicas';
    }

    // Check if it's a predefined activity or custom
    const isPredefined = PREDEFINED_ACTIVITIES.some(pa => pa.label === type);

    setActivityForm({
      time: act.time,
      type: isPredefined ? type : 'OTRA',
      location: LOCATIONS.includes(act.location) ? act.location : 'OTRO',
      customLocation: LOCATIONS.includes(act.location) ? '' : act.location,
      customType: isPredefined ? '' : type,
      rival: rival,
      grupo: act.grupo || 'Todos',
      physicalEvalType: physicalEvalType
    });
    setShowActivityModal(true);
  };
  
  const generateWeeklyTechnicalReport = async () => {
    if (!selectedMicro) return;
    setGeneratingReport(true);
    
    try {
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      // --- Estilos Base ---
      const primaryColor = [2, 66, 140] as [number, number, number]; // Azul Selección
      const secondaryColor = [226, 35, 26] as [number, number, number]; // Rojo Selección
      const margin = 15;
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // --- HEADER ---
      // Franja Roja Superior
      doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.rect(0, 0, pageWidth, 5, 'F');
      
      // Logo
      const logoUrl = getDriveDirectLink(FEDERATION_LOGO);
      try {
        doc.addImage(logoUrl, 'PNG', margin, 15, 25, 25);
      } catch (e) {
        console.error("Error loading logo for PDF:", e);
      }
      
      // Títulos
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('REPORTE TÉCNICO SEMANAL', 45, 25);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text('PLANIFICACIÓN TÉCNICA DE CAMPO - LA ROJA PERFORMANCE', 45, 30);
      
      // Meta Datos
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(`CATEGORÍA: ${formatCategoryLabel(selectedMicro.category_id)}`, 45, 38);
      
      doc.setTextColor(150, 150, 150);
      const microName = selectedMicro.nombre_display || 'MICROCICLO';
      doc.text(`${microName} #${selectedMicro.id || 'N/A'}`, pageWidth - margin, 25, { align: 'right' });
      doc.text(`${selectedMicro.city?.toUpperCase()}, ${selectedMicro.country?.toUpperCase()}`, pageWidth - margin, 31, { align: 'right' });
      doc.text(`${new Date(selectedMicro.start_date + 'T12:00:00').toLocaleDateString()} - ${new Date(selectedMicro.end_date + 'T12:00:00').toLocaleDateString()}`, pageWidth - margin, 37, { align: 'right' });

      // Línea divisoria
      doc.setDrawColor(230, 230, 230);
      doc.line(margin, 45, pageWidth - margin, 45);

      // --- CUERPO: TAREAS POR DÍA ---
      let currentY = 55;

      currentWeekDays.forEach((date, index) => {
        const dateKey = formatDateKey(date);
        const tasks = fieldTasks[dateKey] || [];
        
        // Encabezado de Día
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.text(`DÍA ${index + 1} - ${date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}`, margin, currentY);
        
        currentY += 6;

        if (tasks.length === 0) {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(180, 180, 180);
          doc.text('No hay tareas técnicas asignadas para este día.', margin + 5, currentY);
          currentY += 10;
        } else {
          // Tabla de Tareas
          const tableData = tasks.map(t => [
            t.jornada || 'AM',
            t.nombre.toUpperCase(),
            t.tipoDinamica.toUpperCase(),
            t.descripcion || '-'
          ]);

          autoTable(doc, {
            startY: currentY,
            head: [['JORNADA', 'NOMBRE DE LA TAREA', 'DINÁMICA', 'OBSERVACIONES']],
            body: tableData,
            theme: 'striped',
            headStyles: {
              fillColor: primaryColor,
              textColor: [255, 255, 255],
              fontSize: 8,
              fontStyle: 'bold',
              halign: 'center'
            },
            bodyStyles: {
              fontSize: 8,
              textColor: [60, 60, 60]
            },
            columnStyles: {
              0: { cellWidth: 20, halign: 'center' },
              1: { cellWidth: 50, fontStyle: 'bold' },
              2: { cellWidth: 40 },
              3: { cellWidth: 'auto' }
            },
            margin: { left: margin, right: margin },
            didDrawPage: (data) => {
              // Footer en cada página
              doc.setFontSize(7);
              doc.setTextColor(200, 200, 200);
              doc.text(`Página ${data.pageNumber}`, margin, doc.internal.pageSize.getHeight() - 10);
              doc.text('CMSPORTECH.COM', pageWidth - margin, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
            }
          });
          
          currentY = (doc as any).lastAutoTable.finalY + 12;
        }

        // Si estamos cerca del final de la página, saltamos
        if (currentY > 260 && index < currentWeekDays.length - 1) {
          doc.addPage();
          currentY = 25;
        }
      });

      // Pie de página final con nota
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bolditalic');
      doc.setTextColor(150, 150, 150);
      doc.text('* NOTA: El color gris en la planificación indica actividades para jugadores concentrados.', margin, doc.internal.pageSize.getHeight() - 15);

      // Guardar PDF
      const fileName = `Reporte_Tecnico_${selectedMicro.category_id}_${selectedMicro.start_date}.pdf`;
      doc.save(fileName);
      
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Hubo un error al generar el reporte PDF.");
    } finally {
      setGeneratingReport(false);
    }
  };

  const downloadDailyReportPDF = async () => {
    if (selectedDayIndex === null || !selectedMicro) return;
    
    setGeneratingReport(true);
    try {
      const container = document.getElementById('daily-report-print');
      
      if (!container) throw new Error("Plantilla no encontrada");

      // Capturamos el Canvas
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc: Document) => {
           // Asegurar que el contenedor sea visible en el clon para ser capturado
           const target = clonedDoc.getElementById('daily-report-print');
           if (target) {
              target.style.display = 'flex';
              target.style.opacity = '1';
           }
        }
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      
      const microName = selectedMicro.micro_number || selectedMicro.id;
      const category = formatCategoryLabel(selectedMicro.category_id).replace(/\s+/g, '-').toLowerCase();
      const dayName = currentWeekDays[selectedDayIndex].toLocaleDateString('es-ES', { weekday: 'long' }).toLowerCase();
      
      const fileName = `microciclo-${microName}-${category}-${dayName}.pdf`;
      pdf.save(fileName);
      
    } catch (err) {
      console.error("Error al descargar PDF:", err);
      alert("Hubo un error al generar el PDF del reporte diario.");
    } finally {
      setGeneratingReport(false);
    }
  };

  const downloadDailyReportJPG = async () => {
    if (selectedDayIndex === null || !selectedMicro) return;
    
    setGeneratingReport(true);
    try {
      const container = document.getElementById('daily-report-print');
      
      if (!container) throw new Error("Plantilla no encontrada");

      // Capturamos el Canvas con mayor escala para nitidez en JPG
      const canvas = await html2canvas(container, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc: Document) => {
           const target = clonedDoc.getElementById('daily-report-print');
           if (target) {
              target.style.display = 'flex';
              target.style.opacity = '1';
           }
        }
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.9);
      
      const microName = selectedMicro.micro_number || selectedMicro.id;
      const category = formatCategoryLabel(selectedMicro.category_id).replace(/\s+/g, '-').toLowerCase();
      const dayName = currentWeekDays[selectedDayIndex].toLocaleDateString('es-ES', { weekday: 'long' }).toLowerCase();
      const fileName = `reporte-diario-${microName}-${category}-${dayName}.jpg`;
      
      const link = document.createElement('a');
      link.href = imgData;
      link.download = fileName;
      link.click();
      
    } catch (err) {
      console.error("Error al descargar JPG:", err);
      alert("Hubo un error al generar la imagen JPEG del reporte diario.");
    } finally {
      setGeneratingReport(false);
    }
  };

  const shareDailyReportWhatsApp = () => {
    if (selectedDayIndex === null || !selectedMicro) return;
    
    const microName = selectedMicro.micro_number || selectedMicro.id;
    const category = formatCategoryLabel(selectedMicro.category_id);
    const dayName = currentWeekDays[selectedDayIndex].toLocaleDateString('es-ES', { weekday: 'long' });
    
    const text = encodeURIComponent(`*REPORTE DIARIO - ${category}*\n\n📅 *Día:* ${dayName}\n🔄 *Microciclo:* #${microName}\n\nSe ha generado el reporte diario de actividades. Saludos!`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const shareWeeklyReportWhatsApp = () => {
    if (!selectedMicro) return;
    
    const microName = selectedMicro.micro_number || selectedMicro.id;
    const category = formatCategoryLabel(selectedMicro.category_id);
    const startDate = selectedMicro.start_date;
    
    const text = encodeURIComponent(`*CRONOGRAMA SEMANAL - ${category}*\n\n🔄 *Microciclo:* #${microName}\n📅 *Inicio:* ${startDate}\n\nSe ha compartido el cronograma semanal de actividades de la Selección. Saludos!`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const downloadCompetenciaReportPDF = async () => {
    setExportingCompetencia(true);
    try {
      const unfilteredReports = filterOnlyResponded 
        ? unifiedCompetenciaReports.filter(r => r.respondio) 
        : unifiedCompetenciaReports;
      const activeReports = getSortedCompetenciaReports(unfilteredReports);

      const doc = new jsPDF({
        orientation: 'l',
        unit: 'mm',
        format: 'a4'
      });

      const primaryColor = [2, 66, 140] as [number, number, number];
      const secondaryColor = [226, 35, 26] as [number, number, number];
      const darkColor = [26, 35, 51] as [number, number, number];
      const margin = 8;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // --- TOP COLOR BAR ---
      doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.rect(0, 0, pageWidth, 4, 'F');

      // --- CONTAINER HEADER (DARK NAVY RIBBON) ---
      doc.setFillColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.rect(margin, 8, pageWidth - (margin * 2), 16, 'F');

      // Left Title Block
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(margin, 8, 60, 16, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text('REPORTE DE COMPETENCIA', margin + 6, 18);

      // Logo
      const logoUrl = getDriveDirectLink(FEDERATION_LOGO);
      try {
        doc.addImage(logoUrl, 'PNG', margin + 68, 9, 14, 14);
      } catch (e) {
        console.error("Error loading logo for PDF:", e);
      }

      // Category text
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text('SELECCIÓN NACIONAL', margin + 88, 15);
      
      doc.setFontSize(8);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      const catLabel = selectedMicro ? formatCategoryLabel(selectedMicro.category_id) : 'CATEGORÍA';
      doc.text(catLabel.toUpperCase(), margin + 88, 19);

      // --- METADATA BOXES ---
      const boxY = 28;
      const boxW = (pageWidth - (margin * 2) - 8) / 3;
      const boxH = 10;

      // Box 1: Proceso
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(margin, boxY, boxW, boxH, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(140, 140, 140);
      doc.text('PROCESO / MICROCICLO', margin + 4, boxY + 3.5);
      doc.setFontSize(7.5);
      doc.setTextColor(40, 40, 40);
      const microText = selectedMicro?.nombre_display || `MICROCICLO #${selectedMicro?.micro_number || selectedMicro?.id || '—'}`;
      doc.text(microText.toUpperCase(), margin + 4, boxY + 7.5);

      // Box 2: Periodo
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(margin + boxW + 4, boxY, boxW, boxH, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(140, 140, 140);
      doc.text('PERIODO', margin + boxW + 8, boxY + 3.5);
      doc.setFontSize(7.5);
      doc.setTextColor(40, 40, 40);
      const periodText = selectedMicro ? `${new Date(selectedMicro.start_date + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })} AL ${new Date(selectedMicro.end_date + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}` : '—';
      doc.text(periodText.toUpperCase(), margin + boxW + 8, boxY + 7.5);

      // Box 3: Ciudad
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(margin + (boxW * 2) + 8, boxY, boxW, boxH, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(140, 140, 140);
      doc.text('CIUDAD', margin + (boxW * 2) + 12, boxY + 3.5);
      doc.setFontSize(7.5);
      doc.setTextColor(40, 40, 40);
      const concText = selectedMicro?.city ? `${selectedMicro.city}, ${selectedMicro.country || 'CHILE'}` : 'SANTIAGO, CHILE';
      doc.text(concText.toUpperCase(), margin + (boxW * 2) + 12, boxY + 7.5);

      // --- STATS KPIs ---
      const kpiY = 41;
      const kpiW = (pageWidth - (margin * 2) - 12) / 4;
      const kpiH = 10;

      // KPI 1: Reportes
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(margin, kpiY, kpiW, kpiH, 1.5, 1.5, 'F');
      doc.setFontSize(5);
      doc.setTextColor(140, 140, 140);
      doc.text('REPORTES ENVIADOS', margin + 3, kpiY + 3);
      doc.setFontSize(8.5);
      doc.setTextColor(2, 66, 140);
      doc.text(`${competenciaStats.responded} / ${competenciaStats.total}`, margin + 3, kpiY + 7.5);

      // KPI 2: Minutos
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(margin + kpiW + 4, kpiY, kpiW, kpiH, 1.5, 1.5, 'F');
      doc.setFontSize(5);
      doc.setTextColor(140, 140, 140);
      doc.text('PROM. MINUTOS', margin + kpiW + 7, kpiY + 3);
      doc.setFontSize(8.5);
      doc.setTextColor(40, 40, 40);
      doc.text(`${competenciaStats.avgMinutes} min`, margin + kpiW + 7, kpiY + 7.5);

      // KPI 3: RPE
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(margin + (kpiW * 2) + 8, kpiY, kpiW, kpiH, 1.5, 1.5, 'F');
      doc.setFontSize(5);
      doc.setTextColor(140, 140, 140);
      doc.text('ESFUERZO RPE PROM.', margin + (kpiW * 2) + 11, kpiY + 3);
      doc.setFontSize(8.5);
      doc.setTextColor(40, 40, 40);
      doc.text(`${competenciaStats.avgRpe}`, margin + (kpiW * 2) + 11, kpiY + 7.5);

      // KPI 4: Alertas
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(margin + (kpiW * 3) + 12, kpiY, kpiW, kpiH, 1.5, 1.5, 'F');
      doc.setFontSize(5);
      doc.setTextColor(140, 140, 140);
      doc.text('JUGADORES CON ALERTA', margin + (kpiW * 3) + 15, kpiY + 3);
      doc.setFontSize(8.5);
      doc.setTextColor(competenciaStats.alerts > 0 ? 226 : 40, competenciaStats.alerts > 0 ? 35 : 40, competenciaStats.alerts > 0 ? 26 : 40);
      doc.text(`${competenciaStats.alerts}`, margin + (kpiW * 3) + 15, kpiY + 7.5);

      const tableStartY = 54;

      // Split active reports into two equal columns
      const halfLength = Math.ceil(activeReports.length / 2);
      const leftReports = activeReports.slice(0, halfLength);
      const rightReports = activeReports.slice(halfLength);

      const formatRow = (r: any) => {
        const didNotPlay = r.minutos_jugados === 0 || r.rival === 'PARTIDO SUSPENDIDO / SIN FECHA';
        return [
          `${r.nombre || ''} ${r.apellido1 || ''}\n${r.club_nombre || 'SIN CLUB'}`,
          r.respondio && r.fecha 
            ? new Date(r.fecha + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }) 
            : '-',
          r.respondio 
            ? (didNotPlay ? '-' : `VS ${r.rival || '—'}${r.categoria ? `\n(${String(r.categoria).replace('_', ' ').toUpperCase()})` : ''}`) 
            : 'PENDIENTE',
          r.respondio && !didNotPlay && r.minutos_jugados !== null ? `${r.minutos_jugados}'` : '-',
          r.respondio && !didNotPlay && r.rpe !== null && r.rpe !== 0 ? `${r.rpe}/10` : '-',
          r.respondio && !didNotPlay ? (r.molestias || 'Sin molestias') : '-',
          r.respondio && !didNotPlay ? (r.enfermedad || 'Sin Síntomas') : '-'
        ];
      };

      const leftRows = leftReports.map(formatRow);
      const rightRows = rightReports.map(formatRow);

      const spacing = 4;
      const colWidth = (pageWidth - (margin * 2) - spacing) / 2;

      const cellStylesParser = (data: any) => {
        if (data.section === 'body') {
          const valStr = (typeof data.cell.raw === 'string' ? data.cell.raw : (data.cell.text && data.cell.text.join(' ')) || '').trim();
          
          // Columna RPE: Index 4
          if (data.column.index === 4) {
            if (valStr && valStr !== '-') {
              const rpeNum = parseInt(valStr.split('/')[0], 10);
              if (!isNaN(rpeNum)) {
                if (rpeNum > 7) {
                  data.cell.styles.textColor = [220, 38, 38]; // red-600
                  data.cell.styles.fontStyle = 'bold';
                } else if (rpeNum > 4) {
                  data.cell.styles.textColor = [217, 119, 6]; // amber-600
                  data.cell.styles.fontStyle = 'bold';
                } else if (rpeNum > 0) {
                  data.cell.styles.textColor = [5, 150, 105]; // emerald-600
                  data.cell.styles.fontStyle = 'bold';
                }
              }
            }
          }
          // Columna MOLESTIAS: Index 5
          if (data.column.index === 5) {
            if (valStr && valStr !== '-') {
              const valLower = valStr.toLowerCase();
              if (valLower !== 'sin molestias' && valLower !== 'ninguno' && valLower !== 'ninguna' && valLower.trim() !== '') {
                data.cell.styles.textColor = [220, 38, 38]; // red-600
                data.cell.styles.fontStyle = 'bold';
              } else {
                data.cell.styles.textColor = [160, 160, 160]; // Soft grey
              }
            }
          }
          // Columna ENFERMEDAD / SÍNTOMAS: Index 6
          if (data.column.index === 6) {
            if (valStr && valStr !== '-') {
              const valLower = valStr.toLowerCase();
              if (valLower !== 'sin síntomas' && valLower !== 'sin sintomas' && valLower.trim() !== '') {
                data.cell.styles.textColor = [220, 38, 38]; // red-600
                data.cell.styles.fontStyle = 'bold';
              } else {
                data.cell.styles.textColor = [160, 160, 160]; // Soft grey
              }
            }
          }
        }
      };

      const tableHeaders = [['JUGADOR', 'FECHA', 'COMPROMISO', 'MIN', 'RPE', 'MOLESTIAS', 'ENF / SÍNTOMAS']];

      const tableColumnStyles = {
        0: { cellWidth: 26, fontStyle: 'bold' as const },
        1: { cellWidth: 10, halign: 'center' as const },
        2: { cellWidth: 24 },
        3: { cellWidth: 8, halign: 'center' as const, fontStyle: 'bold' as const },
        4: { cellWidth: 8, halign: 'center' as const },
        5: { cellWidth: 31 },
        6: { cellWidth: 31 }
      };

      // Draw Left Column Table
      autoTable(doc, {
        startY: tableStartY,
        head: tableHeaders,
        body: leftRows,
        theme: 'striped',
        tableWidth: colWidth,
        margin: { left: margin },
        styles: {
          cellPadding: 0.6,
          fontSize: 5.2,
          textColor: [40, 40, 40],
          valign: 'middle'
        },
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontSize: 5.4,
          fontStyle: 'bold',
          halign: 'center'
        },
        columnStyles: tableColumnStyles,
        didParseCell: cellStylesParser
      });

      // Draw Right Column Table
      autoTable(doc, {
        startY: tableStartY,
        head: tableHeaders,
        body: rightRows,
        theme: 'striped',
        tableWidth: colWidth,
        margin: { left: margin + colWidth + spacing },
        styles: {
          cellPadding: 0.6,
          fontSize: 5.2,
          textColor: [40, 40, 40],
          valign: 'middle'
        },
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontSize: 5.4,
          fontStyle: 'bold',
          halign: 'center'
        },
        columnStyles: tableColumnStyles,
        didParseCell: cellStylesParser
      });

      // Footer
      doc.setFontSize(6);
      doc.setTextColor(170, 170, 170);
      doc.text(`La Roja Performance - Reporte de Competencia | Hoja 1 de 1`, margin, pageHeight - 5);
      doc.text('CONFIDENCIAL — SELECCIÓN NACIONAL DE CHILE', pageWidth - margin, pageHeight - 5, { align: 'right' });

      const microName = selectedMicro?.micro_number || selectedMicro?.id || 'microciclo';
      const categoryName = selectedMicro ? formatCategoryLabel(selectedMicro.category_id).replace(/\s+/g, '-').toLowerCase() : 'categoria';
      const fileName = `reporte-competencia-${microName}-${categoryName}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error("Error al descargar PDF:", err);
      alert("Hubo un error al generar el PDF del reporte de competencia.");
    } finally {
      setExportingCompetencia(false);
    }
  };

  const downloadCompetenciaReportJPG = async () => {
    setExportingCompetencia(true);
    try {
      const container = document.getElementById('competencia-report-container');
      if (!container) throw new Error("Contenedor no encontrado");

      // Capturamos con mayor nitidez para la imagen
      const canvas = await html2canvas(container, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      
      const microName = selectedMicro?.micro_number || selectedMicro?.id || 'microciclo';
      const categoryName = selectedMicro ? formatCategoryLabel(selectedMicro.category_id).replace(/\s+/g, '-').toLowerCase() : 'categoria';
      const fileName = `reporte-competencia-${microName}-${categoryName}.jpg`;

      const link = document.createElement('a');
      link.href = imgData;
      link.download = fileName;
      link.click();
    } catch (err) {
      console.error("Error al descargar JPG:", err);
      alert("Hubo un error al generar la imagen del reporte de competencia.");
    } finally {
      setExportingCompetencia(false);
    }
  };

  const generateWeeklySchedulePDF = async () => {
    if (!selectedMicro) return;
    setGeneratingReport(true);
    
    try {
      const doc = new jsPDF({
        orientation: 'l',
        unit: 'mm',
        format: 'a4'
      });

      const primaryColor = [2, 66, 140] as [number, number, number];
      const secondaryColor = [226, 35, 26] as [number, number, number];
      const margin = 15;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Split currentWeekDays into chunks of max 7 days to prevent squishing
      const chunks: Date[][] = [];
      const chunkSize = 7;
      for (let i = 0; i < currentWeekDays.length; i += chunkSize) {
        chunks.push(currentWeekDays.slice(i, i + chunkSize));
      }

      const logoUrl = getDriveDirectLink(FEDERATION_LOGO);

      chunks.forEach((chunk, chunkIndex) => {
        if (chunkIndex > 0) {
          doc.addPage();
        }

        const chunkStart = chunk[0];
        const chunkEnd = chunk[chunk.length - 1];
        const weekNum = selectedMicro.micro_number || selectedMicro.id || '';
        
        const title = chunks.length > 1 
          ? `MICROCICLO ${weekNum} (PARTE ${chunkIndex + 1})` 
          : `MICROCICLO ${weekNum}`;
        
        const m1 = chunkStart.toLocaleDateString('es-ES', { month: 'long' }).toUpperCase();
        const m2 = chunkEnd.toLocaleDateString('es-ES', { month: 'long' }).toUpperCase();
        const d1 = chunkStart.getDate().toString().padStart(2, '0');
        const d2 = chunkEnd.getDate().toString().padStart(2, '0');
        
        const dateRange = m1 === m2
          ? `${d1} AL ${d2} DE ${m1}`
          : `${d1} DE ${m1} AL ${d2} DE ${m2}`;

        // --- NEW PREMIUM FIFA-STYLE HEADER (Matches Check-in & Check-out) ---
        // 1. Draw Red Trapezoid Segment (background)
        doc.setFillColor(226, 35, 26); // Red
        doc.triangle(120, 10, 130, 10, 130, 26, 'F');
        doc.rect(130, 10, 5, 16, 'F');
        doc.triangle(135, 10, 145, 26, 135, 26, 'F');

        // 2. Draw Blue Trapezoid Segment (foreground)
        doc.setFillColor(2, 66, 140); // Blue
        doc.rect(15, 10, 107, 16, 'F');
        doc.triangle(122, 10, 122, 26, 132, 26, 'F');

        // 3. Title inside Blue Segment
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(255, 255, 255);
        const whiteTextOptions = {} as any;
        try {
          whiteTextOptions.horizontalScale = 0.85;
        } catch(e) {}
        doc.text(title.toUpperCase(), 22, 20.5, whiteTextOptions);

        // 4. Logo inside white circle container
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(152, 10.5, 15, 15, 7.5, 7.5, 'F');
        
        doc.setDrawColor(240, 241, 243);
        doc.setLineWidth(0.3);
        doc.roundedRect(152, 10.5, 15, 15, 7.5, 7.5, 'S');

        try {
          doc.addImage(logoUrl, 'PNG', 153.5, 11.5, 12, 12);
        } catch (e) {
          console.warn("Could not add logo to PDF", e);
        }

        // 5. Vertical Divider
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.4);
        doc.line(173, 12, 173, 24);

        // 6. Right Title Texts
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(2, 66, 140);
        doc.text("SELECCIÓN NACIONAL", 178, 16);
        
        doc.setFontSize(11);
        doc.setTextColor(226, 35, 26);
        doc.text(formatCategoryLabel(selectedMicro.category_id).toUpperCase().replace(' ', '.'), 178, 22);

        // --- METADATA SECTION (Matches Check-in & Check-out) ---
        doc.setDrawColor(2, 66, 140);
        doc.setLineWidth(0.5);
        doc.line(15, 38, pageWidth - 15, 38);

        // Metadata 1: MICROCICLO
        doc.setFillColor(2, 66, 140);
        doc.circle(20, 33.5, 1, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text("MICROCICLO", 23, 34.5);
        
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.3);
        doc.line(47, 32, 47, 36);
        
        doc.setTextColor(226, 35, 26); // Red
        doc.text(`#${weekNum}`, 50, 34.5);

        // Metadata 2: TIPO DOCUMENTO
        doc.setFillColor(2, 66, 140);
        doc.circle(85, 33.5, 1, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        doc.text("DOCUMENTO", 88, 34.5);
        
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.3);
        doc.line(113, 32, 113, 36);
        
        doc.setTextColor(226, 35, 26);
        doc.text("CRONOGRAMA SEMANAL", 116, 34.5);

        // Metadata 3: FECHAS
        doc.setFillColor(2, 66, 140);
        doc.circle(170, 33.5, 1, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        doc.text("FECHAS", 173, 34.5);
        
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.3);
        doc.line(190, 32, 190, 36);
        
        doc.setTextColor(226, 35, 26);
        doc.text(dateRange.toUpperCase(), 193, 34.5);

        // Metadata 4: HOJA / PAGINA
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text(`HOJA ${chunkIndex + 1} / ${chunks.length}`, pageWidth - 15, 34.5, { align: 'right' });

        // --- SECTION SUBTITLE (Matches Check-in & Check-out) ---
        doc.setFillColor(2, 66, 140);
        doc.rect(15, 41, 1.5, 5, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(`1._ ITINERARIO Y PLANIFICACIÓN DE ACTIVIDADES DE LA SEMANA`, 19, 45);

        const dayNames = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
        const headers = chunk.map((date) => {
            const dStr = `${date.getDate()}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            const dayIndex = date.getDay(); // Robust, maps correctly to Monday-Sunday regardless of start
            return `${dayNames[dayIndex]} ${dStr}`;
        });

        let maxRows = 0;
        chunk.forEach(date => {
            const dateKey = formatDateKey(date);
            const schedule = weeklySchedule[dateKey] || [];
            if (schedule.length > maxRows) maxRows = schedule.length;
        });

        const body = [];
        for (let r = 0; r < maxRows; r++) {
            const row = chunk.map(date => {
                const dateKey = formatDateKey(date);
                const schedule = weeklySchedule[dateKey] || [];
                const act = schedule[r];
                if (!act) return '';
                return { 
                  content: `${act.time}   ${act.type.toUpperCase()}`,
                  grupo: act.grupo 
                };
            });
            body.push(row);
        }

        // Calculate centering and dimensions dynamically for the table based on the number of days/columns
        const numCols = headers.length;
        const totalUsableWidth = pageWidth - 2 * margin; // 297 - 30 = 267mm

        let colWidth = totalUsableWidth / 7; // default 38.14mm
        let baseFontSize = 6.5;
        let specialFontSize = 7;
        let headFontSize = 8;
        let cellPadding = 1;
        let minCellHeight = 6;
        let cellRadius = 1.5;

        if (numCols <= 3) {
            colWidth = 65; // Much wider columns! 65mm * 3 = 195mm (very elegant and spacious)
            baseFontSize = 8.5;
            specialFontSize = 9;
            headFontSize = 10.5;
            cellPadding = 2.5;
            minCellHeight = 9.5;
            cellRadius = 2.5;
        } else if (numCols === 4) {
            colWidth = 55; // 220mm
            baseFontSize = 8;
            specialFontSize = 8.5;
            headFontSize = 10;
            cellPadding = 2;
            minCellHeight = 8.5;
            cellRadius = 2.2;
        } else if (numCols === 5) {
            colWidth = 48; // 240mm
            baseFontSize = 7.5;
            specialFontSize = 8;
            headFontSize = 9.5;
            cellPadding = 1.5;
            minCellHeight = 7.5;
            cellRadius = 1.8;
        } else if (numCols === 6) {
            colWidth = 42; // 252mm
            baseFontSize = 7;
            specialFontSize = 7.5;
            headFontSize = 9;
            cellPadding = 1.2;
            minCellHeight = 7;
            cellRadius = 1.6;
        } else {
            // 7 columns
            colWidth = totalUsableWidth / 7; // 38.14mm -> 267mm
            baseFontSize = 6.5;
            specialFontSize = 7;
            headFontSize = 8;
            cellPadding = 1;
            minCellHeight = 6;
            cellRadius = 1.5;
        }

        const tableWidth = numCols * colWidth;
        const tableLeftMargin = (pageWidth - tableWidth) / 2;

        autoTable(doc, {
          startY: 49,
          head: [headers],
          body: body,
          theme: 'plain',
          tableWidth: tableWidth,
          margin: { left: tableLeftMargin },
          headStyles: {
            fillColor: [2, 66, 140],
            textColor: [255, 255, 255],
            fontSize: headFontSize,
            fontStyle: 'bold',
            halign: 'center',
            cellPadding: cellPadding + 1,
          },
          bodyStyles: {
            fontSize: baseFontSize,
            fontStyle: 'bold',
            textColor: [0, 0, 0],
            cellPadding: cellPadding,
            minCellHeight: minCellHeight,
            valign: 'middle',
            halign: 'center'
          },
          didParseCell: (data) => {
            // Transparent by default to let us draw custom backgrounds
            if (data.section === 'body') {
              data.cell.styles.fillColor = undefined;
            }
          },
          willDrawCell: (data) => {
            if (data.section === 'head') {
              doc.saveGraphicsState();
              doc.setFillColor(2, 66, 140);
              doc.roundedRect(data.cell.x + 0.5, data.cell.y + 0.5, data.cell.width - 1, data.cell.height - 1, cellRadius, cellRadius, 'F');
              doc.restoreGraphicsState();
            }
          },
          didDrawCell: (data) => {
            if (data.section === 'body' && data.cell.raw) {
              const raw = data.cell.raw as any;
              const text = (raw.content || '').toUpperCase();
              const grupo = raw.grupo;
              
              let fillColor: [number, number, number] = [255, 255, 255];
              let textColor: [number, number, number] = [60, 60, 60];
              let hasSpecialColor = false;

              if (text.includes('ENTRENAMIENTO') || text.includes('PARTIDO')) {
                  fillColor = [226, 35, 26];
                  textColor = [255, 255, 255];
                  hasSpecialColor = true;
              } else if (text.includes('GYM') || text.includes('GIMNASIO')) {
                  fillColor = [11, 18, 32];
                  textColor = [255, 255, 255];
                  hasSpecialColor = true;
              } else if (text.includes('ACTIVACIÓN') || text.includes('ACTIVACION')) {
                  fillColor = [100, 180, 255];
                  textColor = [255, 255, 255];
                  hasSpecialColor = true;
              } else if (text.includes('PSICOLÓGICA') || text.includes('CHARLA')) {
                  fillColor = [163, 217, 119];
                  textColor = [11, 18, 32]; // Dark slate text for legibility on light green
                  hasSpecialColor = true;
              } else if (grupo === 'Concentrados') {
                  fillColor = [215, 215, 215]; // Gray for Concentrados
              } else if (text.includes('DESAYUNO') || text.includes('ALMUERZO') || text.includes('MERIENDA') || text.includes('CENA') || text.includes('SNACK') || text.includes('COLACIÓN') || text.includes('COLACION')) {
                  fillColor = [255, 255, 255];
              } else {
                  fillColor = [255, 255, 255];
              }

              doc.saveGraphicsState();
              doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
              doc.roundedRect(data.cell.x + 1, data.cell.y + 1, data.cell.width - 2, data.cell.height - 2, cellRadius, cellRadius, 'F');
              
              const fontSize = hasSpecialColor ? specialFontSize : baseFontSize;
              doc.setFontSize(fontSize);
              doc.setTextColor(textColor[0], textColor[1], textColor[2]);
              doc.setFont('helvetica', 'bold');
              
              const lines = doc.splitTextToSize(text, data.cell.width - 4);
              const yOffset = lines.length > 1 ? -(fontSize / 6.5) : (fontSize / 6.5);
              doc.text(lines, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + yOffset, { align: 'center' });
              
              doc.restoreGraphicsState();
            }
          }
        });

        // --- FOOTER NOTE & DECORATIVE BOTTOM LINES ---
        // Footer Note
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text("* LAS ACTIVIDADES RESALTADAS EN GRIS CORRESPONDEN A BLOQUES PARA JUGADORES EN RÉGIMEN DE CONCENTRACIÓN.", 15, pageHeight - 14);

        // Thin divider above bottom footer
        doc.setDrawColor(241, 245, 249); // slate-100
        doc.setLineWidth(0.3);
        doc.line(15, pageHeight - 11.5, pageWidth - 15, pageHeight - 11.5);

        // Bottom colored stripes
        doc.setFillColor(2, 66, 140); // Blue
        doc.rect(15, pageHeight - 11, pageWidth - 30, 1.2, 'F');
        doc.setFillColor(226, 35, 26); // Red
        doc.rect(15, pageHeight - 9.8, pageWidth - 30, 0.4, 'F');

        // Confidential Note & Watermark
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text("DOCUMENTO CONFIDENCIAL • ÁREA TÉCNICA SELECCIÓN NACIONAL • © 2026", 15, pageHeight - 6);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(2, 66, 140);
        doc.text("FFCH - DEPARTAMENTO DE SELECCIONES NACIONALES", pageWidth / 2, pageHeight - 6, { align: 'center' });

        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7);
        doc.text("CMSPORTECH.COM", pageWidth - 15, pageHeight - 6, { align: 'right' });
      });

      const fileName = `Cronograma_Semanal_${formatCategoryLabel(selectedMicro.category_id)}_${selectedMicro.start_date}.pdf`;
      doc.save(fileName);
      
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Hubo un error al generar el reporte PDF.");
    } finally {
      setGeneratingReport(false);
    }
  };

  const getActivityStyle = (type: string, grupo?: string) => {
    const t = type.toUpperCase();
    
    // 1. Actividades Específicas (Prioridad Máxima)
    if (t.includes('ENTRENAMIENTO') || t.includes('PARTIDO AMISTOSO') || t.includes('PARTIDO OFICIAL')) return 'bg-red-600 text-white font-black';
    if (t.includes('GYM') || t.includes('GIMNASIO')) return 'bg-[#0b1220] text-white font-black';
    if (t.includes('PSICOLÓGICA') || t.includes('PSICOLOGO') || t.includes('CHARLA')) return 'bg-[#a3d977] text-[#0b1220] font-black';
    if (t.includes('DESCANSO')) return 'bg-sky-100 text-sky-700 font-black';
    
    // 2. Color por Grupo (Fallback)
    if (grupo === 'Concentrados') return 'bg-slate-200 text-[#0b1220] font-bold';
    
    // 3. Actividades comunes (Solo si no es Concentrados o tiene grupo específico)
    // Pero el usuario dice que si es "Todos" debe ser blanco.
    // Si queremos mantener el gris para comidas de concentrados pero blanco si es para todos:
    
    return 'bg-white text-[#0b1220] font-medium';
  };

  const getDinamicaStyle = (dinamica: string) => {
    const d = dinamica.toLowerCase();
    if (d.includes('cuadrados')) return 'bg-blue-600 text-white';
    if (d.includes('cerradas')) return 'bg-orange-500 text-white';
    if (d.includes('abiertas')) return 'bg-emerald-500 text-white';
    if (d.includes('partido')) return 'bg-slate-900 text-white';
    if (d.includes('dinámica') || d.includes('dinamica')) return 'bg-indigo-600 text-white';
    return 'bg-slate-400 text-white';
  };

  const filteredMicrociclos = useMemo(() => {
    return microciclos.filter(m => {
      if (selectedCategories.includes('TODOS LOS PROCESOS')) return true;
      return selectedCategories.some(cat => {
        const categoryIdToMatch = CATEGORY_ID_MAP[cat as Category];
        return Number(m.category_id) === Number(categoryIdToMatch);
      });
    });
  }, [microciclos, selectedCategories]);

  if (viewMode === 'selection') {
    return (
      <div className="space-y-8 animate-in fade-in duration-500 pb-20">
        <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-[#CF1B2B] rounded-2xl flex items-center justify-center text-white shadow-xl">
              <i className="fa-solid fa-bullseye text-xl"></i>
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">ÁREA TÉCNICA</h2>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mt-1">Seleccione un proceso para gestionar su planificación.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 p-1.5 bg-white rounded-[24px] border border-slate-100 shadow-sm max-w-fit overflow-x-auto">
          {['TODOS LOS PROCESOS', ...Object.values(Category)].map(cat => {
            const isSelected = selectedCategories.includes(cat);
            return (
              <button 
                key={cat} 
                onClick={() => toggleCategory(cat)} 
                className={`px-6 py-3.5 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${isSelected ? 'bg-[#0b1220] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {formatCategoryLabel(cat)}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400 font-black uppercase italic tracking-widest animate-pulse">Consultando Base de Datos...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredMicrociclos.map((mc) => (
              <div 
                key={mc.id} 
                onClick={() => handleSelectMicro(mc)} 
                className="group bg-white rounded-[40px] p-10 border-2 border-slate-50 transition-all cursor-pointer hover:shadow-2xl hover:border-red-100 relative overflow-hidden transform-gpu"
              >
                <div className="relative z-10 flex flex-col h-full">
                  <span className="bg-blue-600 text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest w-fit mb-6 shadow-sm">
                    {formatCategoryLabel(mc.category_id)}
                  </span>
                  <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-none mb-2 group-hover:text-red-600 transition-colors">
                    {mc.nombre_display}
                  </h3>
                  <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mb-4">
                    {new Date(mc.start_date + 'T12:00:00').toLocaleDateString()} - {new Date(mc.end_date + 'T12:00:00').toLocaleDateString()}
                  </p>
                  <div className="pt-6 border-t border-slate-50 flex justify-between items-end">
                    <span className="text-[10px] font-black text-red-600 uppercase italic">{mc.city}, {mc.country}</span>
                    <div className="flex items-center gap-2 text-slate-300 group-hover:text-red-600 transition-all">
                      <span className="text-[9px] font-black uppercase">Gestionar</span>
                      <i className="fa-solid fa-arrow-right text-xs"></i>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-6">
          <button 
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setViewMode('selection');
              setSelectedMicro(null);
            }} 
            className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-[#0b1220] hover:text-white transition-all shadow-inner active:scale-95 cursor-pointer z-10"
          >
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <div>
            <div className="flex items-center gap-3">
              <span className="bg-red-600 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">
                {formatCategoryLabel(selectedMicro?.category_id)}
              </span>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">
                {selectedMicro?.nombre_display} <span className="text-red-500">PROCESO</span>
              </h2>
            </div>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mt-1">
              Sede: {selectedMicro?.city}, {selectedMicro?.country} | Periodo: {new Date(selectedMicro?.start_date! + 'T12:00:00').toLocaleDateString()} - {new Date(selectedMicro?.end_date! + 'T12:00:00').toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {!hideCronograma && (
        <div className="bg-white/50 p-1.5 rounded-[24px] border border-slate-100 flex items-center gap-2 max-w-fit shadow-sm overflow-x-auto">
          <button onClick={() => setActiveTab('cronograma')} className={`flex items-center gap-3 px-6 py-3.5 rounded-[20px] text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'cronograma' ? 'bg-[#CF1B2B] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
            <i className="fa-solid fa-calendar-week text-sm"></i> Cronograma Semanal
          </button>
          <button onClick={() => setActiveTab('competencia')} className={`flex items-center gap-3 px-6 py-3.5 rounded-[20px] text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'competencia' ? 'bg-[#CF1B2B] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
            <i className="fa-solid fa-trophy text-sm"></i> Reporte Competencia
          </button>
        </div>
      )}

      {activeTab === 'cronograma' && (
        <div className="space-y-12 animate-in fade-in duration-300 transform-gpu">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3">
              <span className="w-2 h-6 bg-red-600 rounded-full"></span>
              Itinerario y Cronograma Semanal
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              <button 
                onClick={generateWeeklySchedulePDF} 
                disabled={generatingReport}
                className="bg-white border-2 border-slate-200 text-slate-500 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm hover:bg-[#0b1220] hover:text-white hover:border-[#0b1220] transition-all disabled:opacity-50"
              >
                {generatingReport ? (
                  <i className="fa-solid fa-spinner fa-spin"></i>
                ) : (
                  <i className="fa-solid fa-file-pdf text-red-500"></i>
                )}
                {generatingReport ? 'Generando...' : 'Exportar Cronograma PDF'}
              </button>
              <button 
                onClick={shareWeeklyReportWhatsApp} 
                className="bg-[#25D366] text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg hover:bg-[#128C7E] transition-all"
              >
                <i className="fa-brands fa-whatsapp text-lg"></i> Compartir WhatsApp
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
            {currentWeekDays.map((date, i) => {
              const dateKey = formatDateKey(date);
              const dayActivities = weeklySchedule[dateKey] || [];
              const isWeekend = i >= 5;
              
              return (
                <div key={dateKey} className={`flex flex-col min-h-[520px] rounded-[40px] border transition-all relative group shadow-sm ${isWeekend ? 'bg-red-50/10 border-red-100' : 'bg-white border-slate-100'} transform-gpu`}>
                  <div className="pt-8 pb-4 text-center border-b border-dashed border-slate-100 relative">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">DÍA {i+1}</p>
                    <p className="text-2xl font-black text-slate-900 italic tracking-tighter">{date.getDate()} {date.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase()}</p>
                    <button 
                      onClick={() => { setSelectedDayIndex(i); setSpecialNote(''); setShowDailyReportModal(true); }}
                      className="absolute top-2 right-4 text-slate-300 hover:text-red-600 transition-all p-1"
                      title="Generar Reporte Diario"
                    >
                      <i className="fa-solid fa-file-lines text-xs"></i>
                    </button>
                  </div>
                  
                  <div className="flex-1 p-3 space-y-2 overflow-y-auto max-h-[380px] custom-scrollbar">
                    {dayActivities.map(act => (
                      <div key={act.id} className={`p-3 rounded-2xl group/act relative transition-all shadow-sm ${getActivityStyle(act.type, act.grupo)}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-black tracking-tight">{act.time}</span>
                          <div className="flex items-center gap-1.5">
                            <button onClick={(e) => { e.stopPropagation(); startEditing(act, i); }} className="opacity-0 group-hover/act:opacity-100 text-[10px] hover:scale-125 transition-all text-inherit"><i className="fa-solid fa-pen"></i></button>
                            <button onClick={(e) => { e.stopPropagation(); removeActivity(dateKey, act); }} className="opacity-0 group-hover/act:opacity-100 text-[10px] hover:scale-125 transition-all text-red-400"><i className="fa-solid fa-trash-can"></i></button>
                          </div>
                        </div>
                        <p className="text-[10px] font-black uppercase italic leading-tight truncate">{act.type}</p>
                        <p className="text-[8px] opacity-60 uppercase font-black tracking-widest truncate mt-1 flex items-center gap-1">
                          <i className="fa-solid fa-location-dot text-[7px]"></i> {act.location}
                        </p>
                      </div>
                    ))}
                    {dayActivities.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full opacity-20 py-10">
                        <i className="fa-solid fa-clock-rotate-left text-2xl mb-2"></i>
                        <p className="text-[8px] font-black uppercase tracking-widest text-center italic px-4">Sin actividades</p>
                      </div>
                    )}
                  </div>

                  <div className="p-4 space-y-2 bg-slate-50/50 rounded-b-[40px]">
                    <button 
                      onClick={() => { setSelectedDayIndex(i); setEditingActivityId(null); setShowActivityModal(true); }} 
                      className="w-full py-4 bg-[#0b1220] hover:bg-red-600 text-white rounded-[20px] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md group"
                    >
                      <i className="fa-solid fa-calendar-plus group-hover:scale-110 transition-transform"></i>
                      <span>Actividad</span>
                    </button>
                    <button 
                      onClick={() => handleCopyDay(dateKey)} 
                      className="w-full py-4 bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-600 rounded-[20px] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-sm group"
                    >
                      <i className="fa-solid fa-clone group-hover:rotate-12 transition-transform"></i>
                      <span>Copiar Bloque</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'partidos' && (
        <MatchesArea selectedCategoryId={selectedMicro?.category_id || 0} />
      )}

      {activeTab === 'convocatoria' && (
        <ConvocatoriaTactical microId={selectedMicro!.id.toString()} categoryId={selectedMicro!.category_id} clubs={clubs || []} />
      )}

      {activeTab === 'tareas' && (
        <div className="space-y-12 relative animate-in fade-in duration-300 transform-gpu">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3">
                <span className="w-2 h-6 bg-red-600 rounded-full"></span>
                Planificación Técnica de Campo
              </h3>
              
              <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner">
                <button 
                  onClick={() => setSelectedJornada('AM')}
                  className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedJornada === 'AM' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Jornada AM
                </button>
                <button 
                  onClick={() => setSelectedJornada('PM')}
                  className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedJornada === 'PM' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Jornada PM
                </button>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <button 
                onClick={generateWeeklyTechnicalReport} 
                disabled={generatingReport}
                className="bg-white border-2 border-slate-200 text-slate-500 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm hover:bg-[#0b1220] hover:text-white hover:border-[#0b1220] transition-all disabled:opacity-50"
              >
                {generatingReport ? (
                  <i className="fa-solid fa-spinner fa-spin"></i>
                ) : (
                  <i className="fa-solid fa-file-pdf text-red-500"></i>
                )}
                {generatingReport ? 'Generando...' : 'Generar Reporte Semanal Técnico'}
              </button>
              <button 
                onClick={() => setShowBibliotecaAddModal(true)} 
                className="bg-[#0b1220] text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl hover:bg-slate-800 transition-all"
              >
                <i className="fa-solid fa-plus"></i> Gestionar Base de Tareas
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {currentWeekDays.map((date, i) => {
              const dateKey = formatDateKey(date);
              const tasks = (fieldTasks[dateKey] || []).filter(t => t.jornada === selectedJornada);
              const isWeekend = i >= 5;
              const isSaving = savingDayTasks[dateKey];
              
              return (
                <div key={dateKey} className={`flex flex-col h-[520px] rounded-[40px] transition-all relative group shadow-sm border ${isWeekend ? 'border-red-500/20 bg-red-50/5' : 'bg-white border-slate-100'} transform-gpu`}>
                  <div className="pt-8 pb-4 text-center border-b border-dashed border-slate-100">
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] block mb-1 ${isWeekend ? 'text-red-500' : 'text-slate-400'}`}>DÍA {i+1}</span>
                    <span className={`text-3xl font-black tracking-tighter ${isWeekend ? 'text-red-600' : 'text-slate-800'}`}>{date.getDate()}</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {tasks.map(task => (
                      <div key={task.id} className={`${getDinamicaStyle(task.tipoDinamica)} p-3 rounded-2xl group/item relative shadow-sm`}>
                        <p className="text-[10px] font-black uppercase italic tracking-tight leading-tight mb-1">{task.nombre}</p>
                        <p className="text-[8px] font-bold opacity-70 uppercase tracking-widest">{task.tipoDinamica}</p>
                        <button onClick={() => removeFieldTask(dateKey, task.id)} className="absolute -top-1 -right-1 w-5 h-5 bg-white border border-slate-100 rounded-full text-slate-300 hover:text-red-500 hover:border-red-500 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-all shadow-sm">
                          <i className="fa-solid fa-xmark text-[10px]"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 space-y-2">
                    <button 
                      onClick={() => handleSaveDayTasks(dateKey)} 
                      disabled={isSaving}
                      className={`w-full py-4 rounded-[20px] bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-md ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      {isSaving ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-floppy-disk"></i>}
                      {isSaving ? 'Guardando...' : 'Guardar Día'}
                    </button>
                    <button onClick={() => { setSelectedDayIndex(i); setShowTareaFieldModal(true); }} className="w-full py-4 rounded-[20px] bg-slate-50 border border-slate-100 text-slate-400 hover:bg-[#CF1B2B] hover:text-white hover:border-[#CF1B2B] hover:shadow-lg transition-all flex items-center justify-center gap-2 group">
                      <i className="fa-solid fa-plus text-sm"></i>
                      <span className="text-[10px] font-black uppercase tracking-widest">Asignar Tarea</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showTareaFieldModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#0b1220]/95 transform-gpu animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 transform-gpu">
            <div className="bg-[#0b1220] p-10 text-white relative">
              <button onClick={() => setShowTareaFieldModal(false)} className="absolute top-8 right-8 text-white/20 hover:text-white transition-colors"><i className="fa-solid fa-xmark text-xl"></i></button>
              <h3 className="text-2xl font-black uppercase italic tracking-tighter">Asignar Tarea Técnica</h3>
            </div>
            <div className="p-10 space-y-6">
              <div className="relative">
                <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm"></i>
                <input type="text" placeholder="Buscar tarea..." className="w-full bg-slate-50 border-none rounded-2xl px-12 py-4 text-sm font-bold outline-none" value={searchTermBiblioteca} onChange={e => setSearchTermBiblioteca(e.target.value)} />
              </div>
              <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar space-y-2">
                {biblioteca.filter(t => t.nombre.toLowerCase().includes(searchTermBiblioteca.toLowerCase())).map(tarea => (
                  <button key={tarea.id} onClick={() => handleSelectTareaFromBiblioteca(tarea)} className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-red-50 border border-transparent transition-all group">
                    <p className="text-[11px] font-black text-slate-900 uppercase italic">{tarea.nombre}</p>
                    <i className="fa-solid fa-plus text-slate-200 group-hover:text-red-500"></i>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showBibliotecaAddModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#0b1220]/95 transform-gpu animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 transform-gpu">
            <div className="bg-red-600 p-10 text-white relative">
              <button onClick={() => setShowBibliotecaAddModal(false)} className="absolute top-8 right-8 text-white/40 hover:text-white transition-colors"><i className="fa-solid fa-xmark text-xl"></i></button>
              <h3 className="text-2xl font-black uppercase italic tracking-tighter">Nueva Tarea en Base de Datos</h3>
            </div>
            <form onSubmit={handleAddTareaToBiblioteca} className="p-10 space-y-8">
              <input required type="text" placeholder="Nombre de la Tarea" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold" value={newBibliotecaTarea.nombre} onChange={e => setNewBibliotecaTarea({...newBibliotecaTarea, nombre: e.target.value})} />
              <select className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold" value={newBibliotecaTarea.tipoDinamica} onChange={e => setNewBibliotecaTarea({...newBibliotecaTarea, tipoDinamica: e.target.value})}>
                {DINAMICAS_OFICIALES.map(d => <option key={d} value={d}>{d.toUpperCase()}</option>)}
              </select>
              <textarea rows={3} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold resize-none" value={newBibliotecaTarea.descripcion} onChange={e => setNewBibliotecaTarea({...newBibliotecaTarea, descripcion: e.target.value})} />
              <button type="submit" className="w-full py-5 bg-[#0b1220] text-white rounded-[24px] text-xs font-black uppercase tracking-widest shadow-xl">Guardar en Sistema</button>
            </form>
          </div>
        </div>
      )}

      {showDailyReportModal && selectedDayIndex !== null && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#0b1220]/95 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
           {/* Overlay to close */}
           <div className="absolute inset-0" onClick={() => setShowDailyReportModal(false)}></div>
           
           <div className="relative bg-white w-full max-w-[210mm] min-h-[297mm] rounded-[24px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 transform-gpu my-8">
              
              {/* Header Actions (No Printable) */}
              <div className="p-6 border-b border-slate-100 bg-white sticky top-0 z-50 print:hidden">
                 <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tighter">Vista Previa Reporte Diario</h3>
                    <div className="flex gap-3">
                      <button 
                        onClick={shareDailyReportWhatsApp}
                        className="bg-[#25D366] text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg hover:bg-[#128C7E] transition-all"
                      >
                        <i className="fa-brands fa-whatsapp"></i> Compartir
                      </button>
                      <button 
                        onClick={downloadDailyReportPDF} 
                        disabled={generatingReport}
                        className="bg-red-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg hover:bg-red-700 transition-all disabled:opacity-50"
                      >
                        {generatingReport ? (
                          <><i className="fa-solid fa-spinner fa-spin"></i> GENERANDO...</>
                        ) : (
                          <><i className="fa-solid fa-file-pdf"></i> DESCARGAR PDF</>
                        )}
                      </button>
                      <button 
                        onClick={downloadDailyReportJPG} 
                        disabled={generatingReport}
                        className="bg-[#0b1220] text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg hover:bg-slate-800 transition-all disabled:opacity-50"
                      >
                        {generatingReport ? (
                          <><i className="fa-solid fa-spinner fa-spin"></i> GENERANDO...</>
                        ) : (
                          <><i className="fa-solid fa-image"></i> DESCARGAR JPEG</>
                        )}
                      </button>
                      <button 
                        onClick={() => setShowDailyReportModal(false)} 
                        className="bg-slate-100 text-slate-500 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                      >
                        Cerrar
                      </button>
                    </div>
                 </div>
                 <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 italic">Mensaje Especial (Opcional - Sólo aparecerá si escribes algo)</label>
                    <textarea 
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500 transition-all resize-none"
                      placeholder="Escribe un mensaje que aparecerá al final del reporte..."
                      rows={2}
                      value={specialNote}
                      onChange={(e) => setSpecialNote(e.target.value)}
                    />
                 </div>
              </div>

              {/* Printable Content (A4 Ratio) */}
              <div className="flex-1 p-8 bg-white flex flex-col print:p-0" id="daily-report-print">
                 
                  {/* 1. HEADER: Título y Datos del Microciclo (Rediseño con Diagonales y Colores Reales) */}
                 <div className="mb-6 font-sans">
                    {/* Top Graphic Bar */}
                    <div className="flex items-center h-20 relative overflow-hidden">
                       {/* Blue Segment */}
                       <div className="bg-[#02428c] h-full flex items-center px-8 relative z-20 min-w-[320px]" style={{ clipPath: 'polygon(0 0, 92% 0, 100% 100%, 0% 100%)' }}>
                          <span className="text-4xl font-black text-white uppercase italic tracking-tighter whitespace-nowrap">
                             {(() => {
                                const d = currentWeekDays[selectedDayIndex];
                                const weekday = d.toLocaleDateString('es-ES', { weekday: 'long' });
                                const day = d.getDate().toString().padStart(2, '0');
                                const month = (d.getMonth() + 1).toString().padStart(2, '0');
                                return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)} ${day}/${month}`;
                             })()}
                          </span>
                       </div>
                       
                       {/* Red Segment */}
                       <div className="bg-[#e2231a] h-full w-24 -ml-12 relative z-10 shadow-lg" style={{ clipPath: 'polygon(25% 0, 100% 0, 75% 100%, 0% 100%)' }}></div>
                       
                       {/* Logo Section */}
                       <div className="flex-1 flex items-center gap-4 ml-8 overflow-hidden">
                          <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center p-1 bg-white rounded-full shadow-md">
                             <img 
                               src={getDriveDirectLink(FEDERATION_LOGO)} 
                               alt="Logo" 
                               className="w-full h-full object-contain"
                               referrerPolicy="no-referrer"
                             />
                          </div>
                          <div className="h-10 w-[1.5px] bg-slate-200 flex-shrink-0"></div>
                          <div className="flex flex-col min-w-0">
                             <h2 className="text-xl font-black text-[#02428c] uppercase tracking-tighter leading-tight">
                                SELECCIÓN NACIONAL
                             </h2>
                             <span className="text-xl font-black text-red-600 uppercase tracking-tighter leading-tight">
                                {formatCategoryLabel(selectedMicro?.category_id)}
                             </span>
                          </div>
                       </div>
                    </div>

                    {/* Metadata Section */}
                    <div className="mt-2 px-8 border-b-2 border-[#02428c] pb-2">
                       <div className="grid grid-cols-3 gap-8">
                          <div className="flex items-center gap-3">
                             <div className="w-1.5 h-1.5 rounded-full bg-[#02428c]"></div>
                             <span className="text-xs font-black text-slate-900 uppercase">MICROCICLO</span>
                             <div className="h-4 w-px bg-slate-300"></div>
                             <span className="text-sm font-black text-red-600">#{selectedMicro?.micro_number || selectedMicro?.id || '—'}</span>
                          </div>
                          <div className="flex items-center gap-3">
                             <div className="w-1.5 h-1.5 rounded-full bg-[#02428c]"></div>
                             <span className="text-xs font-black text-slate-900 uppercase">SESIÓN</span>
                             <div className="h-4 w-px bg-slate-300"></div>
                             <span className="text-sm font-black text-red-600">
                                {(() => {
                                   const dayActivities = weeklySchedule[formatDateKey(currentWeekDays[selectedDayIndex])] || [];
                                   if (dayActivities.length === 0) return 'AM';
                                   
                                   // Filtrar a sesiones de entrenamiento, tácticas, gimnasio o partidos reales para determinar tipo de sesión
                                   const sessionActivities = dayActivities.filter(a => {
                                      const t = (a.type || '').toUpperCase();
                                      return t.includes('ENTRENAMIENTO') || 
                                             t.includes('PARTIDO') || 
                                             t.includes('GIMNASIO') || 
                                             t.includes('GYM') || 
                                             t.includes('CHARLA') || 
                                             t.includes('VIDEO') || 
                                             t.includes('TÁCTICA') || 
                                             t.includes('CAMPO') || 
                                             t.includes('TEST') || 
                                             t.includes('MEDICIÓN');
                                   });

                                   const targetList = sessionActivities.length > 0 ? sessionActivities : dayActivities;
                                   
                                   const hours = targetList.map(a => {
                                      const h = parseInt(a.time.split(':')[0]);
                                      return isNaN(h) ? 0 : h;
                                   });
                                   
                                   const hasAM = hours.some(h => h < 12);
                                   const hasPM = hours.some(h => h >= 12);
                                   
                                   if (hasAM && hasPM) return 'AM - PM';
                                   if (hasPM) return 'PM';
                                   return 'AM';
                                })()}
                             </span>
                          </div>
                          <div className="flex items-center gap-3">
                             <div className="w-1.5 h-1.5 rounded-full bg-[#02428c]"></div>
                             <span className="text-xs font-black text-slate-900 uppercase">LUGARES</span>
                             <div className="h-4 w-px bg-slate-300"></div>
                             <span className="text-sm font-black text-red-600 whitespace-nowrap overflow-visible leading-relaxed">
                                {selectedMicro?.city || 'SANTIAGO'}
                             </span>
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* 3. TABLA DE ACTIVIDADES (REMOVED REDUNDANT HEADER) */}

                 {/* 3. TABLA DE ACTIVIDADES */}
                 <div className="border-2 border-slate-100 rounded-2xl overflow-hidden mb-6">
                    <table className="w-full text-center border-collapse">
                       <thead>
                          <tr className="bg-slate-50 border-b-2 border-slate-100">
                             <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-24">Hora</th>
                             <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Actividad</th>
                             <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Lugar</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                          {(weeklySchedule[formatDateKey(currentWeekDays[selectedDayIndex])] || []).map((act, idx) => {
                             const rowStyle = getActivityStyle(act.type);
                             return (
                               <tr key={idx} className={getActivityStyle(act.type, act.grupo)}>
                                  <td className="py-2 px-4 text-xs font-black tracking-tight border-r border-slate-50/20">{act.time}</td>
                                  <td className="py-2 px-4 text-xs font-bold uppercase italic tracking-tight border-r border-slate-50/20">
                                     {act.type}
                                  </td>
                                  <td className="py-2 px-4 text-[9px] font-bold uppercase tracking-wider">
                                     {act.location}
                                  </td>
                               </tr>
                             );
                          })}
                          {(weeklySchedule[formatDateKey(currentWeekDays[selectedDayIndex])] || []).length === 0 && (
                             <tr>
                                <td colSpan={3} className="py-12 text-center text-slate-300 text-xs font-bold uppercase tracking-widest italic">
                                   Sin actividades registradas
                                </td>
                             </tr>
                          )}
                       </tbody>
                    </table>
                 </div>

                 {/* 4. NOTA ESPECIAL (Solo si existe) */}
                 {specialNote.trim() && (
                   <div className="mt-8 bg-slate-50 border-2 border-slate-100 rounded-2xl p-6 relative overflow-hidden break-inside-avoid">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-red-600/5 rotate-45 translate-x-8 -translate-y-8"></div>
                      <h4 className="text-[10px] font-black text-[#02428c] uppercase tracking-widest mb-3 flex items-center gap-2">
                        <i className="fa-solid fa-note-sticky text-red-600"></i> NOTA DEL CUERPO TÉCNICO
                      </h4>
                      <p className="text-xs font-bold text-slate-700 leading-relaxed whitespace-pre-wrap italic">
                        "{specialNote}"
                      </p>
                   </div>
                 )}

                 {/* 5. FOOTER (Opcional) */}
                 <div className="mt-auto pt-8 border-t border-slate-100 flex flex-col gap-2">
                     <p className="text-[8px] font-black italic text-slate-400 uppercase tracking-widest">
                       * NOTA: EL COLOR GRIS EN LA PLANIFICACIÓN INDICA ACTIVIDADES PARA JUGADORES CONCENTRADOS.
                     </p>
                     <div className="flex justify-between items-end text-[9px] font-bold text-slate-300 uppercase tracking-widest">
                        <div className="flex flex-col gap-0.5">
                           <span>Generado automáticamente por el Sistema de Gestión</span>
                           <span>{new Date().toLocaleDateString()}</span>
                        </div>
                        <span className="text-slate-400 font-black">CMSPORTECH.COM</span>
                     </div>
                  </div>

              </div>
           </div>
        </div>
      )}

      {showActivityModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#0b1220]/90 transform-gpu animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 transform-gpu">
            <div className="bg-[#0b1220] p-10 text-white relative">
              <button onClick={() => { setShowActivityModal(false); setEditingActivityId(null); }} className="absolute top-8 right-8 text-white/20 hover:text-white transition-colors"><i className="fa-solid fa-xmark text-xl"></i></button>
              <h3 className="text-2xl font-black uppercase italic tracking-tighter">{editingActivityId ? 'Editar Actividad' : 'Programar Jornada'}</h3>
              <p className="text-red-500 font-black uppercase text-[10px] tracking-[0.3em] mt-2">DÍA {selectedDayIndex !== null && selectedDayIndex + 1} • {currentWeekDays[selectedDayIndex!].toLocaleDateString()}</p>
            </div>
            <form onSubmit={handleAddActivity} className="p-12 space-y-8">
              <div className="grid grid-cols-3 gap-4">
                <input required type="time" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold" value={activityForm.time} onChange={e => setActivityForm({...activityForm, time: e.target.value})} />
                <select className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold" value={activityForm.location} onChange={e => setActivityForm({...activityForm, location: e.target.value})}>
                  {LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                </select>
                <select className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold" value={activityForm.grupo} onChange={e => setActivityForm({...activityForm, grupo: e.target.value})}>
                  <option value="Todos">TODOS</option>
                  <option value="Concentrados">CONCENTRADOS</option>
                  <option value="Santiago">SANTIAGO</option>
                </select>
              </div>
              {activityForm.location === 'OTRO' && (
                <input required placeholder="Especificar Lugar..." className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-black" value={activityForm.customLocation} onChange={e => setActivityForm({...activityForm, customLocation: e.target.value})} />
              )}
              <div className="grid grid-cols-3 gap-2 h-48 overflow-y-auto pr-2 custom-scrollbar p-1">
                {PREDEFINED_ACTIVITIES.map(act => (
                  <button key={act.label} type="button" onClick={() => setActivityForm({...activityForm, type: act.label})} className={`p-4 rounded-2xl text-left border-2 transition-all ${activityForm.type === act.label ? 'bg-red-600 border-red-600 text-white shadow-lg' : 'bg-slate-50 border-transparent text-slate-600 hover:bg-slate-100'}`}>
                    <span className="text-lg block mb-1">{act.emoji}</span>
                    <span className="text-[9px] font-black uppercase tracking-tight leading-none">{act.label}</span>
                  </button>
                ))}
              </div>
              {activityForm.type === 'Evaluaciones Físicas' && (
                <input placeholder="Especificar Tipo de Evaluación (Ej: Salto, Fuerza, Velocidad)..." className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-black animate-in slide-in-from-top-2 duration-200" value={activityForm.physicalEvalType || ''} onChange={e => setActivityForm({...activityForm, physicalEvalType: e.target.value})} />
              )}
              {activityForm.type === 'OTRA' && (
                <input required placeholder="Especificar Actividad (Ej: Reunión, Charla)..." className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-black" value={activityForm.customType} onChange={e => setActivityForm({...activityForm, customType: e.target.value})} />
              )}
              <button type="submit" disabled={savingActivity} className="w-full py-6 rounded-[32px] bg-red-600 text-white text-xs font-black uppercase tracking-widest shadow-2xl hover:bg-red-700 transition-all">
                {savingActivity ? 'Guardando...' : (editingActivityId ? 'Actualizar Actividad' : 'Confirmar y Agendar')}
              </button>
            </form>
          </div>
        </div>
      )}

      {activityToDelete && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-[#0b1220]/90 backdrop-blur-sm transform-gpu animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 transform-gpu p-8 text-center">
            <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-md">
              <i className="fa-solid fa-triangle-exclamation text-3xl"></i>
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter mb-2">¿Eliminar Actividad?</h3>
            <p className="text-slate-500 text-xs font-medium mb-8 uppercase tracking-widest leading-relaxed">
              ¿Estás seguro de que deseas eliminar la actividad <span className="text-red-600 font-black italic">"{activityToDelete.activity.type}"</span> programada a las {activityToDelete.activity.time}? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-4">
              <button 
                type="button"
                onClick={() => setActivityToDelete(null)} 
                className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={confirmRemoveActivity} 
                className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-red-600/25 cursor-pointer"
              >
                Confirmar y Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'competencia' && (() => {
        const rawReports = filterOnlyResponded 
          ? unifiedCompetenciaReports.filter(r => r.respondio) 
          : unifiedCompetenciaReports;
        const sortedReports = getSortedCompetenciaReports(rawReports);
        const pendingPlayers = unifiedCompetenciaReports.filter(r => !r.respondio);

        const itemsPerPage = 10;
        const totalItems = sortedReports.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
        const currentPage = Math.min(competenciaPage, totalPages);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const paginatedReports = sortedReports.slice(startIndex, startIndex + itemsPerPage);

        const renderSortButtons = (columnKey: 'jugador' | 'fecha' | 'compromiso' | 'minutos' | 'rpe' | 'molestias' | 'enfermedad') => {
          const isCurrent = competenciaSort.column === columnKey;
          const isAsc = isCurrent && competenciaSort.direction === 'asc';
          const isDesc = isCurrent && competenciaSort.direction === 'desc';

          return (
            <span className="inline-flex flex-col ml-1.5 align-middle select-none gap-[1px]" data-html2canvas-ignore="true">
              <button 
                type="button"
                onClick={() => {
                  if (isAsc) {
                    setCompetenciaSort({ column: null, direction: null });
                  } else {
                    setCompetenciaSort({ column: columnKey, direction: 'asc' });
                  }
                }}
                className={`p-0.5 hover:text-red-500 transition-all cursor-pointer ${isAsc ? 'text-red-600 scale-125' : 'text-slate-300'}`}
                title="Sorteo Ascendente"
              >
                <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 4L4 12H20L12 4Z" />
                </svg>
              </button>
              <button 
                type="button"
                onClick={() => {
                  if (isDesc) {
                    setCompetenciaSort({ column: null, direction: null });
                  } else {
                    setCompetenciaSort({ column: columnKey, direction: 'desc' });
                  }
                }}
                className={`p-0.5 hover:text-red-500 transition-all cursor-pointer ${isDesc ? 'text-red-600 scale-125' : 'text-slate-300'}`}
                title="Sorteo Descendente"
              >
                <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 20L4 12H20L12 20Z" />
                </svg>
              </button>
            </span>
          );
        };

        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div id="competencia-report-container" className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm relative overflow-hidden">
              {/* Cabecera Oficial Selección Nacional */}
              <div className="mb-8 border-b border-slate-200 pb-6">
                {/* Ribbon visual premium */}
                <div className="flex flex-col md:flex-row md:items-center min-h-[7rem] bg-[#1a2333] rounded-3xl overflow-hidden relative shadow-md mb-6 p-4 md:p-0">
                  {/* Título de Reporte con Clip Path */}
                  <div className="bg-[#02428c] h-full flex items-center pl-6 pr-12 py-4 md:py-0 md:absolute md:left-0 md:top-0 md:bottom-0 relative z-20" style={{ clipPath: 'polygon(0 0, 90% 0, 100% 100%, 0% 100%)' }}>
                    <span className="text-lg md:text-2xl font-black text-white uppercase italic tracking-tighter whitespace-nowrap">
                      REPORTE DE COMPETENCIA
                    </span>
                  </div>
                  
                  {/* Cuña roja decorativa */}
                  <div className="hidden md:block bg-[#e2231a] h-full w-20 relative z-10 shadow-lg left-56" style={{ clipPath: 'polygon(25% 0, 100% 0, 75% 100%, 0% 100%)' }}></div>
                  
                  {/* Información de Identidad */}
                  <div className="flex-1 flex items-center gap-4 mt-4 md:mt-0 md:ml-80 overflow-hidden relative z-30">
                    <div className="w-14 h-14 md:w-16 md:h-16 flex-shrink-0 flex items-center justify-center p-1.5 bg-white rounded-full shadow-md">
                      <img 
                        src={getDriveDirectLink(FEDERATION_LOGO)} 
                        alt="Logo Selección" 
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="h-10 w-[1.5px] bg-slate-700 flex-shrink-0"></div>
                    <div className="flex flex-col min-w-0">
                      <h2 className="text-sm md:text-base font-black text-white uppercase tracking-tighter leading-tight">
                        SELECCIÓN NACIONAL
                      </h2>
                      <span className="text-xs md:text-sm font-black text-red-500 uppercase tracking-tighter leading-tight">
                        {selectedMicro ? formatCategoryLabel(selectedMicro.category_id) : 'Categoría Opcional'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Grid de Metadatos del Microciclo */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-4 mt-4">
                  <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="w-2 h-2 rounded-full bg-[#02428c]"></div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">PROCESO / MICROCICLO</span>
                      <span className="text-xs font-black text-slate-800 uppercase tracking-tight mt-1.5 truncate">
                        {selectedMicro?.nombre_display || `MICROCICLO #${selectedMicro?.micro_number || selectedMicro?.id || '—'}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="w-2 h-2 rounded-full bg-red-600"></div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">PERIODO</span>
                      <span className="text-xs font-black text-slate-800 tracking-tight mt-1.5">
                        {selectedMicro ? (
                          `${new Date(selectedMicro.start_date + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })} Al ${new Date(selectedMicro.end_date + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
                        ) : '—'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">CIUDAD</span>
                      <span className="text-xs font-black text-slate-800 uppercase tracking-tight mt-1.5 truncate">
                        {selectedMicro?.city ? `${selectedMicro.city}, ${selectedMicro.country || 'CHILE'}` : 'SANTIAGO, CHILE'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid de KPIs / Estadísticas Clave */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between shadow-sm">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">REPORTES ENVIADOS</span>
                  <div className="my-3 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-[#02428c] leading-none">
                      {competenciaStats.responded}
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      / {competenciaStats.total}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-[#02428c] h-full rounded-full transition-all duration-500" 
                      style={{ width: `${competenciaStats.total > 0 ? (competenciaStats.responded / competenciaStats.total) * 100 : 0}%` }}
                    ></div>
                  </div>

                  {/* Desglose de Respuestas */}
                  <div className="mt-3.5 pt-2.5 border-t border-slate-200/50 flex flex-wrap gap-x-2 gap-y-1 justify-between text-[8px] font-black uppercase tracking-wider">
                    <div className="flex items-center gap-1 text-emerald-600" title="Jugadores que realmente jugaron minutos de competencia">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                      Jugaron: {competenciaStats.playedCount}
                    </div>
                    <div className="flex items-center gap-1 text-rose-500" title="Jugadores que reportaron que no jugaron (0 minutos) o fecha suspendida">
                      <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
                      No Jugaron: {competenciaStats.didNotPlayCount}
                    </div>
                    <div className="flex items-center gap-1 text-slate-400" title="Jugadores convocados que no han contestado">
                      <span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span>
                      Pendientes: {competenciaStats.pending}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between shadow-sm">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">PROM. MINUTOS</span>
                  <div className="my-3 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-800 leading-none">
                      {competenciaStats.avgMinutes}
                    </span>
                    <span className="text-xs font-black text-slate-400">min</span>
                  </div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none">
                    Por jugador participante
                  </span>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between shadow-sm">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">ESFUERZO RPE PROM.</span>
                  <div className="my-3 flex items-center gap-2">
                    <span className="text-2xl font-black text-slate-800 leading-none">
                      {competenciaStats.avgRpe}
                    </span>
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase ${
                      competenciaStats.avgRpe > 7 ? 'bg-red-100 text-red-600' : 
                      competenciaStats.avgRpe > 4 ? 'bg-amber-100 text-amber-600' : 
                      'bg-emerald-100 text-emerald-600'
                    }`}>
                      {competenciaStats.avgRpe > 7 ? 'Alto RPE' : competenciaStats.avgRpe > 4 ? 'Moderado' : 'Suave'}
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none">
                    Escala de fatiga RPE
                  </span>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between shadow-sm">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">JUGADORES CON ALERTA</span>
                  <div className="my-3 flex items-baseline gap-1">
                    <span className={`text-2xl font-black leading-none ${competenciaStats.alerts > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                      {competenciaStats.alerts}
                    </span>
                    <span className="text-xs font-bold text-slate-400">caso(s)</span>
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-wider leading-none ${competenciaStats.alerts > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                    {competenciaStats.alerts > 0 ? 'Requieren evaluación médica' : 'Sin molestias clínicas'}
                  </span>
                </div>
              </div>

              {/* Fila del Panel de Controles Interactivos (Ocultada en PDF / JPG) */}
              <div className="flex items-center justify-between mb-6 flex-wrap gap-4 border-b border-slate-100 pb-6" data-html2canvas-ignore="true">
                {/* Switch Segmentado */}
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setFilterOnlyResponded(true)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${
                      filterOnlyResponded 
                        ? 'bg-white text-slate-800 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Solo Reportados ({competenciaStats.responded})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterOnlyResponded(false)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${
                      !filterOnlyResponded 
                        ? 'bg-white text-slate-800 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Ver Lista Completa ({competenciaStats.total})
                  </button>
                </div>

                {/* Acciones de Descarga */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={downloadCompetenciaReportPDF}
                    disabled={exportingCompetencia}
                    className="px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all active:scale-95 duration-200"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    {exportingCompetencia ? 'PDF...' : 'Descargar PDF'}
                  </button>
                  <button
                    type="button"
                    onClick={downloadCompetenciaReportJPG}
                    disabled={exportingCompetencia}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all active:scale-95 duration-200"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                    {exportingCompetencia ? 'JPG...' : 'Descargar JPG'}
                  </button>
                </div>
              </div>

              {/* Tabla de Jugadores */}
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest select-none">
                        <span className="inline-flex items-center gap-1">Jugador {renderSortButtons('jugador')}</span>
                      </th>
                      <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest select-none">
                        <span className="inline-flex items-center gap-1">Fecha {renderSortButtons('fecha')}</span>
                      </th>
                      <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest select-none">
                        <span className="inline-flex items-center gap-1">Compromiso {renderSortButtons('compromiso')}</span>
                      </th>
                      <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center select-none">
                        <span className="inline-flex items-center justify-center gap-1">Minutos {renderSortButtons('minutos')}</span>
                      </th>
                      <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center select-none">
                        <span className="inline-flex items-center justify-center gap-1">RPE {renderSortButtons('rpe')}</span>
                      </th>
                      <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest select-none">
                        <span className="inline-flex items-center gap-1">Molestias {renderSortButtons('molestias')}</span>
                      </th>
                      <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest select-none">
                        <span className="inline-flex items-center gap-1">Enfermedad / Síntomas {renderSortButtons('enfermedad')}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {sortedReports.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-20 text-center text-slate-300 font-black uppercase italic tracking-widest">
                          Sin reportes registrados en este periodo
                        </td>
                      </tr>
                    ) : (
                      paginatedReports.map((report) => {
                        const didNotPlay = report.minutos_jugados === 0 || report.rival === 'PARTIDO SUSPENDIDO / SIN FECHA';
                        return (
                          <tr 
                            key={report.id} 
                            className={`group hover:bg-slate-50/50 transition-all duration-300 ${
                              !report.respondio ? 'opacity-35 saturate-50 blur-[0.4px] hover:blur-none hover:opacity-80' : ''
                            }`}
                          >
                            <td className="py-5">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-black text-xs italic">
                                  {report.nombre?.charAt(0)}
                                </div>
                                <div>
                                  <p 
                                    className="text-[11px] font-black text-slate-900 uppercase italic leading-none hover:text-emerald-500 hover:underline cursor-pointer transition-all duration-200"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (report.player_id) {
                                        sessionStorage.setItem('selectedPlayerIdForProfile', String(report.player_id));
                                        window.dispatchEvent(new CustomEvent('navigate-to-profile', { detail: { playerId: report.player_id } }));
                                      }
                                    }}
                                  >
                                    {report.nombre} {report.apellido1}
                                  </p>
                                  <div className="mt-1">
                                    <ClubBadge 
                                      clubName={report.club_nombre} 
                                      idClub={report.id_club} 
                                      clubs={clubs} 
                                      logoSize="w-3.5 h-3.5" 
                                      className="text-[9px] font-black text-slate-400 uppercase tracking-widest" 
                                    />
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-5 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                              {report.respondio && report.fecha ? (
                                new Date(report.fecha + 'T12:00:00').toLocaleDateString()
                              ) : (
                                <span className="text-amber-500/85 font-black tracking-widest text-[9px]">PENDIENTE</span>
                              )}
                            </td>
                            <td className="py-5">
                              {report.respondio ? (
                                didNotPlay ? (
                                  <span className="inline-block text-slate-400 font-medium italic">-</span>
                                ) : (
                                  <div>
                                    <p className="text-[11px] font-bold text-slate-900 uppercase tracking-widest">
                                      vs {report.rival}
                                    </p>
                                    {report.categoria && (
                                      <span className="inline-block bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tight mt-1">
                                        {String(report.categoria).replace('_', ' ')}
                                      </span>
                                    )}
                                  </div>
                                )
                              ) : (
                                <span className="text-amber-500/85 font-black text-[9px] tracking-wider bg-amber-50/50 px-2.5 py-1 rounded-xl">PENDIENTE DE REPORTE</span>
                              )}
                            </td>
                            <td className="py-5 text-center">
                              {report.respondio && !didNotPlay && report.minutos_jugados !== null ? (
                                <span className="inline-block bg-[#0b1220] text-white px-2.5 py-1 rounded-lg text-[10px] font-black tracking-tighter italic">
                                  {report.minutos_jugados}'
                                </span>
                              ) : (
                                <span className="inline-block text-slate-400 font-medium italic">-</span>
                              )}
                            </td>
                            <td className="py-5 text-center">
                              {report.respondio && !didNotPlay && report.rpe !== null && report.rpe !== 0 ? (
                                <span className={`inline-block text-[10px] font-black px-2.5 py-1 rounded-lg ${
                                  (report.rpe || 0) > 7 ? 'bg-red-100 text-red-600' : 
                                  (report.rpe || 0) > 4 ? 'bg-amber-100 text-amber-600' : 
                                  'bg-emerald-100 text-emerald-600'
                                }`}>
                                  {report.rpe}
                                </span>
                              ) : (
                                <span className="inline-block text-slate-400 font-medium italic">-</span>
                              )}
                            </td>
                            <td className="py-5">
                              {report.respondio && !didNotPlay ? (
                                <div className="text-[9.5px] font-bold uppercase tracking-tight leading-relaxed max-w-[150px]">
                                  {report.molestias && 
                                   report.molestias.trim() !== '' && 
                                   report.molestias.toLowerCase() !== 'sin molestias' && 
                                   report.molestias.toLowerCase() !== 'ninguno' && 
                                   report.molestias.toLowerCase() !== 'ninguna' ? (
                                    <span className="text-red-500 font-extrabold">{report.molestias}</span>
                                  ) : (
                                    <span className="text-slate-400 font-medium">{report.molestias || 'Sin molestias'}</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 font-medium italic">-</span>
                              )}
                            </td>
                            <td className="py-5">
                              {report.respondio && !didNotPlay ? (
                                <div className="text-[9.5px] font-bold uppercase tracking-tight leading-relaxed max-w-[150px]">
                                  {report.enfermedad && 
                                   report.enfermedad.trim() !== '' && 
                                   report.enfermedad.toLowerCase() !== 'sin síntomas' && 
                                   report.enfermedad.toLowerCase() !== 'sin sintomas' && 
                                   report.enfermedad.toLowerCase() !== 'ninguno' ? (
                                    <span className="text-red-500 font-extrabold">{report.enfermedad}</span>
                                  ) : (
                                    <span className="text-slate-400 font-medium">{report.enfermedad || 'Sin Síntomas'}</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 font-medium italic">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Botones de paginación para mejorar la legibilidad - 10 jugadores por hoja */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 pt-6 mt-4" data-html2canvas-ignore="true">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">
                    Página {currentPage} de {totalPages} ({totalItems} jugadores)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCompetenciaPage(prev => Math.max(1, prev - 1))}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:text-slate-300 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200"
                    >
                      ⬅️ Anterior
                    </button>
                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => setCompetenciaPage(prev => Math.min(totalPages, prev + 1))}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:text-slate-300 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200"
                    >
                      Siguiente ➡️
                    </button>
                  </div>
                </div>
              )}

              {/* Bloques Compactos de Convocados (Se ocultan en el reporte PDF y JPG) */}
              {filterOnlyResponded && (pendingPlayers.length > 0 || competenciaStats.noCompetenciaCount > 0) && (
                <div className="mt-8 pt-6 border-t border-slate-100 space-y-6" data-html2canvas-ignore="true">
                  {pendingPlayers.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-black text-red-500 uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                        Jugadores con Reporte Pendiente ({pendingPlayers.length}) — No han contestado
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {pendingPlayers.map(p => (
                          <span 
                            key={p.player_id} 
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50/50 text-[10px] font-black text-red-700 rounded-xl border border-red-100/40 uppercase tracking-wide"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-red-300"></span>
                            {p.nombre} {p.apellido1} <span className="text-red-400 font-bold">({p.club_nombre})</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {competenciaStats.noCompetenciaCount > 0 && (
                    <div>
                      <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        Jugadores Sin Competencia / Fecha Suspendida ({competenciaStats.noCompetenciaCount}) — Ya reportaron
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {unifiedCompetenciaReports
                          .filter(r => r.respondio && r.rival === 'PARTIDO SUSPENDIDO / SIN FECHA')
                          .map(p => (
                            <span 
                              key={p.player_id} 
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50/40 text-[10px] font-black text-amber-700 rounded-xl border border-amber-100/30 uppercase tracking-wide"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                              {p.nombre} {p.apellido1} <span className="text-amber-500/70 font-bold">({p.club_nombre})</span>
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        
        @media print {
          body * { visibility: hidden; }
          #daily-report-print, #daily-report-print *, 
          #weekly-report-print, #weekly-report-print * { 
            visibility: visible; 
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          #daily-report-print, #weekly-report-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20mm;
            margin: 0;
            z-index: 9999;
            background: white;
            overflow: visible !important;
          }
          @page { size: A4; margin: 0; }
        }
      `}</style>
    </div>
  );
};

export default TecnicaArea;
