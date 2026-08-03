import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Dumbbell, Plus, Trash2, Save, X, Search, Sparkles, AlertTriangle, 
  CheckCircle2, Activity, ChevronRight, Calendar, Clock, User, Info, 
  Check, Lock, ShieldAlert, Heart, RefreshCw, AlertCircle
} from 'lucide-react';
import { GYM_EXERCISES_DATA } from './gymExercisesData';

interface PlayerInfo {
  player_id: number;
  name: string;
  position: string;
  id_club?: number;
}

interface LevelResumen {
  player_id: number;
  cualidad: string;
  nivel_cualidad: string; // 'BAJO' | 'MEDIO' | 'ALTO' | 'SIN_DATO'
  fecha_ultima?: string;
}

interface ImtpRecord {
  player_id: number;
  imtp_asimetria: number | null;
  imtp_debil: string | null;
  'Peak Vertical Force / BM [N/kg]'?: number;
}

interface LesionRecord {
  player_id: number;
  estado: string;
  disponibilidad: string;
  tipo_lesion?: string;
  diagnostico_clinico?: string;
}

interface WellnessRecord {
  player_id: number;
  fatigue: number;
  sleep_quality: number;
  soreness: number;
  stress: number;
  mood: number;
  checkin_date: string;
}

interface LoadRecord {
  player_id: number;
  session_date: string;
  rpe: number;
  duration_min: number;
}

interface AntroRecord {
  player_id: number;
  maduracion_media: number | null; // YPHV
}

interface ExerciseTemplate {
  id: number;
  target_group: string;
  grupo_muscular: string;
  ejercicio: string;
  equipamiento: string;
  tecnica_ejecucion: string;
}

interface DesignerExercise {
  id?: number | string;
  plantilla_id: number | null;
  bloque: 'BASE_GRUPAL' | 'INDIVIDUAL';
  player_id: number | null;
  cualidad_id: number; // 1-10 mapped to our qualities
  target_group: string; // matches target_group varchar
  grupo_muscular: string;
  ejercicio: string;
  equipamiento: string;
  tecnica_ejecucion: string;
  series: number;
  repeticiones: string;
  carga_kg: string;
  rpe_sugerido: number | null;
  orden: number;
  intensidad: string;
  tempo: string;
  descanso_seg: number;
  contactos: number;
  lado: 'BILATERAL' | 'IZQ' | 'DER' | 'AMBOS_ALTERNADO' | null;
  justificacion: string;
}

interface GymSessionDesignerProps {
  session: any | null; // Selected session to edit (null if creating)
  microcycle: any; // Current selected microcycle
  nominatedPlayers: PlayerInfo[];
  isDbMode: boolean;
  playerAssignments: Record<number, string>;
  individualPautas: Record<number, any>;
  onClose: () => void;
  onSave: (sessionPayload: any, exercises: any[]) => Promise<void>;
}

// 10 Qualities mapped exactly to those returned in the v_nivel_cualidad_resumen view
const CUALIDADES = [
  { id: 1, key: 'ACELERACION', label: 'Aceleración', targetGroups: ['FUERZA_EXPLOSIVA', 'PLIOMETRIA_INTENSIVA', 'DERIVADOS_HALTEROFILIA'] },
  { id: 2, key: 'COD', label: 'Cambio de Dirección', targetGroups: ['FUERZA_EXPLOSIVA', 'PLIOMETRIA_INTENSIVA'] },
  { id: 3, key: 'ESTRATEGIA', label: 'Estrategia / Prevención', targetGroups: ['PREVENCION', 'CORE', 'CONDICIONAMIENTO'] },
  { id: 4, key: 'EXCENTRICO', label: 'Excéntrico / Posterior', targetGroups: ['FUERZA_MAXIMA', 'PREVENCION'] },
  { id: 5, key: 'FZA_MAXIMA', label: 'Fuerza Máxima', targetGroups: ['FUERZA_MAXIMA'] },
  { id: 6, key: 'POTENCIA', label: 'Fuerza Explosiva / Potencia', targetGroups: ['FUERZA_EXPLOSIVA', 'DERIVADOS_HALTEROFILIA'] },
  { id: 7, key: 'REACTIVA', label: 'Fuerza Reactiva', targetGroups: ['PLIOMETRIA_INTENSIVA'] },
  { id: 8, key: 'RFD', label: 'Tasa Des. Fuerza (RFD)', targetGroups: ['FUERZA_EXPLOSIVA', 'DERIVADOS_HALTEROFILIA'] },
  { id: 9, key: 'RIGIDEZ', label: 'Rigidez Tobillo / Stiffness', targetGroups: ['PLIOMETRIA_EXTENSIVA'] },
  { id: 10, key: 'UNILATERAL', label: 'Fuerza Unilateral', targetGroups: [] }
];

// Equipments filters
const EQUIPAMIENTOS_OPCIONES = [
  'Barra', 'Mancuerna', 'Polea', 'Kettlebell', 'Banda', 'Peso corporal', 'Cajón', 'Balón medicinal'
];

export default function GymSessionDesigner({
  session,
  microcycle,
  nominatedPlayers,
  isDbMode,
  playerAssignments,
  individualPautas,
  onClose,
  onSave
}: GymSessionDesignerProps) {
  // --- States ---
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Database contexts
  const [vNivelResumen, setVNivelResumen] = useState<LevelResumen[]>([]);
  const [evalImtp, setEvalImtp] = useState<ImtpRecord[]>([]);
  const [lesionados, setLesionados] = useState<LesionRecord[]>([]);
  const [wellnessCheckins, setWellnessCheckins] = useState<WellnessRecord[]>([]);
  const [internalLoads, setInternalLoads] = useState<LoadRecord[]>([]);
  const [antropometria, setAntropometria] = useState<AntroRecord[]>([]);
  const [exerciseTemplates, setExerciseTemplates] = useState<ExerciseTemplate[]>([]);

  // Selection states
  const [selectedTargetQualities, setSelectedTargetQualities] = useState<string[]>([]);
  const [currentTab, setCurrentTab] = useState<'BASE_GRUPAL' | 'INDIVIDUAL'>('BASE_GRUPAL');
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);

  // Form states
  const [nombreSesion, setNombreSesion] = useState(session?.nombre_sesion || 'Sesión de Fuerza');
  const [diaSemana, setDiaSemana] = useState(session?.dia_semana || 'Lunes');
  const [fechaSesion, setFechaSesion] = useState(session?.fecha_sesion || '');
  const [diaMicrociclo, setDiaMicrociclo] = useState(session?.dia_microciclo || 'MD-4');
  const [duracionDisponible, setDuracionDisponible] = useState<number>(60);
  const [observaciones, setObservaciones] = useState(session?.observaciones || '');

  // Exercises states
  const [groupExercises, setGroupExercises] = useState<DesignerExercise[]>([]);
  const [individualExercises, setIndividualExercises] = useState<DesignerExercise[]>([]);

  // Filters for exercises search
  const [selectedEquipments, setSelectedEquipments] = useState<string[]>([]);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [showCatalogDropdown, setShowCatalogDropdown] = useState(false);

  // Single exercise input form
  const [selectedTemplate, setSelectedTemplate] = useState<ExerciseTemplate | null>(null);
  const [exerciseForm, setExerciseForm] = useState({
    series: 3,
    repeticiones: '10',
    carga_kg: '0',
    rpe_sugerido: 7,
    intensidad: 'Moderada',
    tempo: '2-0-2-0',
    descanso_seg: 90,
    contactos: 0,
    lado: 'BILATERAL' as 'BILATERAL' | 'IZQ' | 'DER' | 'AMBOS_ALTERNADO' | null,
    justificacion: ''
  });

  // Validation feedback
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [overrideJustification, setOverrideJustification] = useState('');

  // --- Initial Data Load ---
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const playerIds = nominatedPlayers.map(p => p.player_id);

      try {
        // 1. Fetch official templates from physical DB or fallback to local
        let dbTemplates: ExerciseTemplate[] = [];
        try {
          const { data: tmps } = await supabase
            .from('fisica_gimnasio_ejercicio_plantilla')
            .select('id, target_group, grupo_muscular, ejercicio, equipamiento, tecnica_ejecucion');
          if (tmps && tmps.length > 0) {
            dbTemplates = tmps as ExerciseTemplate[];
          }
        } catch (e) {
          console.warn('Error loading gym exercises plantilla, falling back to local list:', e);
        }

        // Merge DB templates with static GYM_EXERCISES_DATA ensuring unique exercise names
        const mergedTemplatesMap: Record<string, ExerciseTemplate> = {};
        dbTemplates.forEach(t => {
          mergedTemplatesMap[t.ejercicio.toLowerCase()] = t;
        });
        GYM_EXERCISES_DATA.forEach((t, index) => {
          const key = t.ejercicio.toLowerCase();
          if (!mergedTemplatesMap[key]) {
            mergedTemplatesMap[key] = {
              id: t.id || (1000 + index),
              target_group: t.target_group || 'TODOS',
              grupo_muscular: t.grupo_muscular || 'General',
              ejercicio: t.ejercicio,
              equipamiento: t.equipamiento || 'Ninguno',
              tecnica_ejecucion: t.tecnica_ejecucion || ''
            };
          }
        });
        setExerciseTemplates(Object.values(mergedTemplatesMap));

        // If playerIds list is empty, stop further heavy loads
        if (playerIds.length === 0) {
          setLoading(false);
          return;
        }

        const todayStr = new Date().toISOString().split('T')[0];
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const twentyEightDaysAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        // 2. Perform parallel DB Queries for context info
        const [
          resLevels,
          resImtp,
          resInjuries,
          resWellness,
          resLoads,
          resAntro
        ] = await Promise.all([
          supabase.from('v_nivel_cualidad_resumen').select('*').in('player_id', playerIds),
          supabase.from('evaluaciones_imtp').select('*').in('player_id', playerIds).order('fecha_test', { ascending: false }),
          supabase.from('lesionados').select('*').in('player_id', playerIds).eq('estado', 'En Rehabilitación'),
          supabase.from('wellness_checkin').select('*').in('player_id', playerIds).gte('checkin_date', sevenDaysAgo),
          supabase.from('internal_load').select('*').in('player_id', playerIds).gte('session_date', twentyEightDaysAgo),
          supabase.from('antropometria').select('player_id, maduracion_media, fecha_medicion').in('player_id', playerIds)
        ]);

        if (resLevels.data) setVNivelResumen(resLevels.data as LevelResumen[]);
        if (resImtp.data) setEvalImtp(resImtp.data as ImtpRecord[]);
        if (resInjuries.data) setLesionados(resInjuries.data as LesionRecord[]);
        if (resWellness.data) setWellnessCheckins(resWellness.data as WellnessRecord[]);
        if (resLoads.data) setInternalLoads(resLoads.data as LoadRecord[]);

        // Filter antropometria to latest per player
        if (resAntro.data) {
          const latestAntro: Record<number, AntroRecord> = {};
          resAntro.data.forEach((r: any) => {
            if (!latestAntro[r.player_id] || new Date(r.fecha_medicion).getTime() > new Date((latestAntro[r.player_id] as any).fecha_medicion).getTime()) {
              latestAntro[r.player_id] = {
                player_id: r.player_id,
                maduracion_media: r.maduracion_media
              };
            }
          });
          setAntropometria(Object.values(latestAntro));
        }

        // 3. Set initial session exercises if editing
        if (session && session.ejercicios) {
          const mappedExs: DesignerExercise[] = session.ejercicios.map((e: any, idx: number) => {
            // Find plantilla_id or match from name
            const matchingTemplate = Object.values(mergedTemplatesMap).find(t => t.ejercicio.toLowerCase() === e.ejercicio.toLowerCase());
            return {
              id: e.id || `edit-${Date.now()}-${idx}-${Math.random()}`,
              plantilla_id: e.plantilla_id || matchingTemplate?.id || null,
              bloque: e.bloque || 'BASE_GRUPAL',
              player_id: e.player_id || null,
              cualidad_id: e.cualidad_id || 5, // Default FZA_MAXIMA
              target_group: e.target_group || matchingTemplate?.target_group || 'FUERZA_MAXIMA',
              grupo_muscular: e.grupo_muscular,
              ejercicio: e.ejercicio,
              equipamiento: e.equipamiento || 'Ninguno',
              tecnica_ejecucion: e.tecnica_ejecucion || '',
              series: Number(e.series) || 3,
              repeticiones: String(e.repeticiones || '10'),
              carga_kg: String(e.carga_kg || '0'),
              rpe_sugerido: e.rpe_sugerido !== undefined ? Number(e.rpe_sugerido) : null,
              orden: e.orden || idx,
              intensidad: e.intensidad || 'Moderada',
              tempo: e.tempo || '2-0-2-0',
              descanso_seg: Number(e.descanso_seg) || 90,
              contactos: Number(e.contactos) || 0,
              lado: e.lado || null,
              justificacion: e.justificacion || ''
            };
          });

          // Separate group and individual blocks
          setGroupExercises(mappedExs.filter(e => e.bloque === 'BASE_GRUPAL'));
          setIndividualExercises(mappedExs.filter(e => e.bloque === 'INDIVIDUAL'));

          // Infer chosen target qualities based on existing exercises
          const uniqueQuals = Array.from(new Set(mappedExs.map(e => {
            const q = CUALIDADES.find(c => c.id === e.cualidad_id);
            return q?.key;
          }).filter(Boolean))) as string[];
          setSelectedTargetQualities(uniqueQuals.slice(0, 2));
        }

        // Extract available duration from observations if stored as metadata [DURACION: X MIN]
        if (session && session.observaciones) {
          const match = session.observaciones.match(/\[DURACION:\s*(\d+)\s*MIN\]/);
          if (match) {
            setDuracionDisponible(parseInt(match[1]));
            setObservaciones(session.observaciones.replace(/\[DURACION:\s*\d+\s*MIN\]\s*/, ''));
          }
        }

      } catch (err) {
        console.error('Error loading Gym Designer context:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [session, nominatedPlayers]);

  // --- Category Minimum PHV (Maturation Offset) calculation ---
  const catMinPHV = useMemo(() => {
    if (antropometria.length === 0) return 0.0; // Default
    const values = antropometria.map(a => a.maduracion_media).filter((v): v is number => v !== null);
    if (values.length === 0) return 0.0;
    return Math.min(...values);
  }, [antropometria]);

  // --- Player Health Profile & Risk Indices ---
  const playerHealthProfiles = useMemo(() => {
    const profiles: Record<number, {
      injured: boolean;
      injuryDesc?: string;
      wellnessAvg: number | null; // null if no data
      acwr: number | null; // null if no data
      yphv: number | null;
      wellnessStatus: 'GOOD' | 'CRITICAL' | 'NODATA';
      acwrStatus: 'GOOD' | 'CRITICAL' | 'NODATA';
      isHighRisk: boolean;
    }> = {};

    nominatedPlayers.forEach(p => {
      const pid = p.player_id;
      // 1. Injury Status
      const injury = lesionados.find(l => l.player_id === pid);
      const isInjured = !!injury;
      const injuryDesc = injury ? `${injury.tipo_lesion} - ${injury.diagnostico_clinico}` : undefined;

      // 2. Wellness score (avg of 7 days)
      const pCheckins = wellnessCheckins.filter(w => w.player_id === pid);
      let wellnessAvg: number | null = null;
      if (pCheckins.length > 0) {
        const totalScoreSum = pCheckins.reduce((sum, item) => {
          const daySum = (item.fatigue + item.sleep_quality + item.soreness + item.stress + item.mood) / 5;
          return sum + daySum;
        }, 0);
        wellnessAvg = totalScoreSum / pCheckins.length;
      }

      // 3. ACWR (Acute to Chronic workload Ratio)
      const pLoads = internalLoads.filter(l => l.player_id === pid);
      let acwr: number | null = null;
      if (pLoads.length > 0) {
        // Acute: last 7 days
        const acuteThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).getTime();
        const acuteLoads = pLoads.filter(l => new Date(l.session_date).getTime() >= acuteThreshold);
        const acuteVol = acuteLoads.reduce((sum, l) => sum + (l.rpe * l.duration_min), 0);
        const acuteAvg = acuteVol / 7;

        // Chronic: last 28 days
        const chronicVol = pLoads.reduce((sum, l) => sum + (l.rpe * l.duration_min), 0);
        const chronicAvg = chronicVol / 28;

        if (chronicAvg > 0) {
          acwr = acuteAvg / chronicAvg;
        }
      }

      // 4. YPHV
      const ant = antropometria.find(a => a.player_id === pid);
      const yphv = ant ? ant.maduracion_media : null;

      // Classify statuses
      const wellnessStatus = wellnessAvg === null ? 'NODATA' : (wellnessAvg < 5.0 ? 'CRITICAL' : 'GOOD');
      const acwrStatus = acwr === null ? 'NODATA' : (acwr > 1.3 ? 'CRITICAL' : 'GOOD');

      // High Risk Trigger: injured, critical wellness, high ACWR, or missing critical telemetry data
      const isHighRisk = isInjured || (wellnessStatus === 'CRITICAL') || (acwrStatus === 'CRITICAL') || (wellnessStatus === 'NODATA') || (acwrStatus === 'NODATA');

      profiles[pid] = {
        injured: isInjured,
        injuryDesc,
        wellnessAvg,
        acwr,
        yphv,
        wellnessStatus,
        acwrStatus,
        isHighRisk
      };
    });

    return profiles;
  }, [nominatedPlayers, lesionados, wellnessCheckins, internalLoads, antropometria]);

  // --- Category Profile Panel Level statistics ---
  const categoryStats = useMemo(() => {
    const stats: Record<string, {
      key: string;
      label: string;
      baixoPct: number;
      medioPct: number;
      altoPct: number;
      noDataPct: number;
      nWithData: number;
      nTotal: number;
    }> = {};

    CUALIDADES.forEach(c => {
      const qRows = vNivelResumen.filter(r => r.cualidad === c.key);
      let baixo = 0;
      let medio = 0;
      let alto = 0;
      let nodata = 0;

      nominatedPlayers.forEach(p => {
        const row = qRows.find(r => r.player_id === p.player_id);
        if (!row || row.nivel_cualidad === 'SIN_DATO' || !row.nivel_cualidad) {
          nodata++;
        } else if (row.nivel_cualidad === 'BAJO') {
          baixo++;
        } else if (row.nivel_cualidad === 'MEDIO') {
          medio++;
        } else if (row.nivel_cualidad === 'ALTO') {
          alto++;
        }
      });

      const total = nominatedPlayers.length || 1;
      const valid = baixo + medio + alto;

      stats[c.key] = {
        key: c.key,
        label: c.label,
        baixoPct: (baixo / total) * 100,
        medioPct: (medio / total) * 100,
        altoPct: (alto / total) * 100,
        noDataPct: (nodata / total) * 100,
        nWithData: valid,
        nTotal: total
      };
    });

    // Sort qualities by % BAJO descending
    return Object.values(stats).sort((a, b) => b.baixoPct - a.baixoPct);
  }, [vNivelResumen, nominatedPlayers]);

  // --- Live Live Volume & Duration Counters ---
  const liveCounters = useMemo(() => {
    // 1. Total Plyometric Contacts
    let plyoContacts = 0;
    const allExercises = [...groupExercises, ...individualExercises];
    allExercises.forEach(e => {
      if (e.target_group === 'PLIOMETRIA_INTENSIVA' || e.target_group === 'PLIOMETRIA_EXTENSIVA') {
        // Evaluate contacts. Use setcontacts value if specified, else parse from repeticiones
        const reps = parseInt(e.repeticiones) || 10;
        const c = e.contactos > 0 ? e.contactos : reps;
        plyoContacts += e.series * c;
      }
    });

    // Plyometric contact limit based on category minimum PHV (maturation)
    let plyoLimit = 100; // Default
    if (catMinPHV < -1.0) {
      plyoLimit = 60;
    } else if (catMinPHV >= -1.0 && catMinPHV <= 1.0) {
      plyoLimit = 100;
    } else if (catMinPHV > 1.0) {
      plyoLimit = 140;
    }

    // 2. Estimated Duration
    // Base Group Block duration: Sum of series * (90 seconds rest/execution + descanso_seg)
    let groupMinutes = 0;
    groupExercises.forEach(e => {
      const seriesVal = e.series || 3;
      const restVal = e.descanso_seg || 90;
      // Series takes about 60s execution + restVal
      groupMinutes += seriesVal * (1.0 + restVal / 60);
    });

    // Individual Blocks duration: Maximum duration among all individual player blocks
    const indDurations: Record<number, number> = {};
    individualExercises.forEach(e => {
      if (e.player_id) {
        const seriesVal = e.series || 3;
        const restVal = e.descanso_seg || 90;
        const mins = seriesVal * (1.0 + restVal / 60);
        indDurations[e.player_id] = (indDurations[e.player_id] || 0) + mins;
      }
    });
    const maxIndMinutes = Object.values(indDurations).length > 0 ? Math.max(...Object.values(indDurations)) : 0;

    const estimatedDuration = Math.round(groupMinutes + maxIndMinutes + 10); // +10 mins warm-up and transitions

    // 3. Covered target qualities
    const coveredQuals = Array.from(new Set(allExercises.map(e => {
      const q = CUALIDADES.find(c => c.id === e.cualidad_id);
      return q?.key;
    }).filter(Boolean))) as string[];

    const matchesTargets = selectedTargetQualities.every(q => coveredQuals.includes(q));

    return {
      plyoContacts,
      plyoLimit,
      estimatedDuration,
      isPlyoOverloaded: plyoContacts > plyoLimit,
      isDurationOverloaded: estimatedDuration > duracionDisponible,
      matchesTargets,
      coveredQuals
    };
  }, [groupExercises, individualExercises, catMinPHV, duracionDisponible, selectedTargetQualities]);

  // --- Intelligent Player Selection Suggestor for Individual Blocks ---
  const handleSuggestIndividuals = () => {
    if (selectedTargetQualities.length === 0) {
      alert('Por favor selecciona al menos una cualidad objetivo en el panel de perfil para poder generar sugerencias.');
      return;
    }

    // Rank players by highest need:
    // Count of 'BAJO' level inside the active target qualities.
    // If tie, sort by overall number of 'BAJO' qualities.
    const playerNeedScores = nominatedPlayers.map(p => {
      const pid = p.player_id;
      let targetBajoCount = 0;
      let overallBajoCount = 0;

      selectedTargetQualities.forEach(qKey => {
        const row = vNivelResumen.find(r => r.player_id === pid && r.cualidad === qKey);
        if (row && row.nivel_cualidad === 'BAJO') {
          targetBajoCount++;
        }
      });

      vNivelResumen.filter(r => r.player_id === pid).forEach(row => {
        if (row.nivel_cualidad === 'BAJO') {
          overallBajoCount++;
        }
      });

      // Boost score if has asymmetry or ACWR alert to prioritize them in individual adjustments
      const health = playerHealthProfiles[pid];
      const hasAsymmetry = (evalImtp.find(i => i.player_id === pid)?.imtp_asimetria || 0) > 15;
      const isFlagged = health?.isHighRisk;

      let score = targetBajoCount * 10 + overallBajoCount;
      if (hasAsymmetry) score += 15;
      if (isFlagged) score += 5;

      return {
        player_id: pid,
        score
      };
    });

    // Sort by score descending and take top 8
    const suggestedIds = playerNeedScores
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(item => item.player_id);

    if (suggestedIds.length === 0) {
      alert('No se encontraron jugadores que requieran prescripciones individuales adicionales.');
      return;
    }

    // Auto-select the first suggested player to focus on
    setSelectedPlayerId(suggestedIds[0]);
    setCurrentTab('INDIVIDUAL');
    alert(`Se han sugerido ${suggestedIds.length} jugadores con alta prioridad por déficit o asimetría. Revisa la lista de jugadores marcados.`);
  };

  // --- Quality Targets logic ---
  const handleToggleTargetQuality = (qKey: string) => {
    // If sample size < 15, we disable automatic target selection but allow manual toggles with warning
    const stats = categoryStats.find(s => s.key === qKey);
    if (stats && stats.nWithData < 15) {
      if (!window.confirm(`La cualidad ${qKey} tiene una muestra de datos insuficiente (n = ${stats.nWithData} < 15). Las directrices desaconsejan basar decisiones grupales automáticas en esto. ¿Deseas seleccionarla de todas formas?`)) {
        return;
      }
    }

    if (selectedTargetQualities.includes(qKey)) {
      setSelectedTargetQualities(prev => prev.filter(k => k !== qKey));
    } else {
      if (selectedTargetQualities.length >= 2) {
        alert('Solo puedes seleccionar un máximo de 2 cualidades objetivo por sesión.');
        return;
      }
      setSelectedTargetQualities(prev => [...prev, qKey]);
    }
  };

  // --- Dynamic exercise catalogue filter ---
  const filteredCatalog = useMemo(() => {
    // Collect all allowed target groups based on selected target qualities
    let allowedGroups: string[] = [];
    selectedTargetQualities.forEach(qKey => {
      const qual = CUALIDADES.find(c => c.key === qKey);
      if (qual) allowedGroups = [...allowedGroups, ...qual.targetGroups];
    });

    // If "Fuerza Unilateral" is selected, match anything
    const isUnilateralTarget = selectedTargetQualities.includes('UNILATERAL');

    return exerciseTemplates.filter(item => {
      // Filter by search text
      const matchesSearch = !exerciseSearch || 
        item.ejercicio.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
        item.grupo_muscular.toLowerCase().includes(exerciseSearch.toLowerCase());

      if (!matchesSearch) return false;

      // Filter by target qualities associated groups
      let matchesQuality = true;
      if (selectedTargetQualities.length > 0) {
        matchesQuality = allowedGroups.includes(item.target_group) || 
          (isUnilateralTarget && item.ejercicio.toLowerCase().includes('unilateral'));
      }

      // Filter by equipments checkboxes
      let matchesEquipment = true;
      if (selectedEquipments.length > 0) {
        matchesEquipment = selectedEquipments.some(eq => item.equipamiento.toLowerCase().includes(eq.toLowerCase()));
      }

      return matchesQuality && matchesEquipment;
    });
  }, [selectedTargetQualities, selectedEquipments, exerciseSearch, exerciseTemplates]);

  // --- Handle exercise selection ---
  const handleSelectTemplate = (item: ExerciseTemplate) => {
    setSelectedTemplate(item);
    setExerciseSearch(item.ejercicio);
    setShowCatalogDropdown(false);

    // Dynamic dosages based on target group rules
    let defaultSeries = 3;
    let defaultReps = '10';
    let defaultCarga = '0';
    let defaultIntensity = 'Moderada';
    let defaultTempo = '2-0-2-0';
    let defaultRest = 90;
    let defaultContacts = 0;

    switch (item.target_group) {
      case 'FUERZA_MAXIMA':
        defaultSeries = 4;
        defaultReps = '3-5';
        defaultCarga = '80% 1RM';
        defaultIntensity = 'Alta (80-90%)';
        defaultTempo = '3-0-X-0';
        defaultRest = 150;
        break;
      case 'FUERZA_EXPLOSIVA':
      case 'DERIVADOS_HALTEROFILIA':
        defaultSeries = 3;
        defaultReps = '4-6';
        defaultCarga = '40% 1RM';
        defaultIntensity = 'Explosiva (30-50%)';
        defaultTempo = 'X-0-X-0';
        defaultRest = 120;
        break;
      case 'PLIOMETRIA_INTENSIVA':
        defaultSeries = 3;
        defaultReps = '6';
        defaultCarga = 'Peso corporal';
        defaultIntensity = 'Máxima reactiva';
        defaultTempo = 'Rápido';
        defaultRest = 120;
        defaultContacts = 6;
        break;
      case 'PLIOMETRIA_EXTENSIVA':
        defaultSeries = 3;
        defaultReps = '12';
        defaultCarga = 'Peso corporal';
        defaultIntensity = 'Submáxima';
        defaultTempo = 'Rítmico';
        defaultRest = 90;
        defaultContacts = 12;
        break;
      case 'CORE':
      case 'PREVENCION':
        defaultSeries = 3;
        defaultReps = '12-15';
        defaultCarga = 'Controlado';
        defaultIntensity = 'Técnica';
        defaultTempo = '2-0-2-0';
        defaultRest = 60;
        break;
    }

    setExerciseForm({
      series: defaultSeries,
      repeticiones: defaultReps,
      carga_kg: defaultCarga,
      rpe_sugerido: 7,
      intensidad: defaultIntensity,
      tempo: defaultTempo,
      descanso_seg: defaultRest,
      contactos: defaultContacts,
      lado: 'BILATERAL',
      justificacion: ''
    });
  };

  // --- Add Exercise handler ---
  const handleAddExercise = () => {
    if (!selectedTemplate) {
      alert('Por favor selecciona un ejercicio del catálogo.');
      return;
    }

    const currentQual = CUALIDADES.find(c => c.targetGroups.includes(selectedTemplate.target_group)) || CUALIDADES[2]; // fallback to ESTRATEGIA

    // Build the exercise object
    const newEx: DesignerExercise = {
      id: `ex-${Date.now()}-${Math.random()}`,
      plantilla_id: selectedTemplate.id,
      bloque: currentTab,
      player_id: currentTab === 'INDIVIDUAL' ? selectedPlayerId : null,
      cualidad_id: currentQual.id,
      target_group: selectedTemplate.target_group,
      grupo_muscular: selectedTemplate.grupo_muscular,
      ejercicio: selectedTemplate.ejercicio,
      equipamiento: selectedTemplate.equipamiento,
      tecnica_ejecucion: selectedTemplate.tecnica_ejecucion,
      series: Number(exerciseForm.series) || 3,
      repeticiones: String(exerciseForm.repeticiones),
      carga_kg: String(exerciseForm.carga_kg),
      rpe_sugerido: Number(exerciseForm.rpe_sugerido) || 7,
      orden: currentTab === 'BASE_GRUPAL' ? groupExercises.length : individualExercises.filter(e => e.player_id === selectedPlayerId).length,
      intensidad: exerciseForm.intensidad,
      tempo: exerciseForm.tempo,
      descanso_seg: Number(exerciseForm.descanso_seg) || 90,
      contactos: Number(exerciseForm.contactos) || 0,
      lado: exerciseForm.lado,
      justificacion: exerciseForm.justificacion
    };

    if (currentTab === 'BASE_GRUPAL') {
      setGroupExercises(prev => [...prev, newEx]);
    } else {
      if (!selectedPlayerId) {
        alert('Por favor selecciona un jugador para prescribir este ejercicio individual.');
        return;
      }
      setIndividualExercises(prev => [...prev, newEx]);
    }

    // Reset exercise form
    setSelectedTemplate(null);
    setExerciseSearch('');
  };

  // --- Delete exercise ---
  const handleDeleteExercise = (id: string | number, isGroup: boolean) => {
    if (isGroup) {
      setGroupExercises(prev => prev.filter(e => e.id !== id));
    } else {
      setIndividualExercises(prev => prev.filter(e => e.id !== id));
    }
  };

  // --- Update exercise inline field ---
  const handleUpdateExerciseField = (id: string | number, field: keyof DesignerExercise, value: any, isGroup: boolean) => {
    const updateFn = (prev: DesignerExercise[]) => prev.map(e => {
      if (e.id === id) {
        return { ...e, [field]: value };
      }
      return e;
    });

    if (isGroup) {
      setGroupExercises(updateFn);
    } else {
      setIndividualExercises(updateFn);
    }
  };

  // --- Autofill individual asymmetry compensations ---
  const handleAutofillAsymmetry = (pid: number) => {
    const imtp = evalImtp.find(i => i.player_id === pid);
    if (!imtp || imtp.imtp_asimetria === null || imtp.imtp_asimetria <= 15) {
      alert('Este jugador no presenta una asimetría mayor al 15% en su última evaluación IMTP.');
      return;
    }

    const weakSide = imtp.imtp_debil === 'Izquierda' ? 'IZQ' : 'DER';
    const weakSideText = imtp.imtp_debil || 'Debil';

    // Auto find a unilateral strength exercise
    const unilateralTemplate = exerciseTemplates.find(t => 
      t.target_group === 'FUERZA_MAXIMA' && 
      (t.ejercicio.toLowerCase().includes('búlgara') || t.ejercicio.toLowerCase().includes('unilateral'))
    ) || exerciseTemplates.find(t => t.ejercicio.toLowerCase().includes('unilateral')) || exerciseTemplates[0];

    setSelectedTemplate(unilateralTemplate);
    setExerciseSearch(unilateralTemplate.ejercicio);

    // Populate dosage rules for asymmetry:
    // Unilateral quality, side set to weak leg, 1 extra series (4 instead of 3), custom justification
    setExerciseForm({
      series: 4, // +1 extra series for symmetry restoration
      repeticiones: '6-8',
      carga_kg: 'Controlado',
      rpe_sugerido: 8,
      intensidad: 'Alta Unilateral',
      tempo: '3-0-1-0',
      descanso_seg: 120,
      contactos: 0,
      lado: weakSide as any,
      justificacion: `Compensación de asimetría de ${imtp.imtp_asimetria}% en pierna ${weakSideText}. Enfoque unilateral excéntrico/fuerza.`
    });

    alert(`Se ha configurado la compensación automática para ${nominatedPlayers.find(p => p.player_id === pid)?.name}. Revisa los parámetros del formulario y agrégalo.`);
  };

  // --- Save & Complex Validations Flow ---
  const handleValidateAndSave = () => {
    const errs: string[] = [];
    const warns: string[] = [];

    // --- A. BLOCKING VALIDATIONS (Must resolve or abort) ---
    // 1. Session Name
    if (!nombreSesion.trim()) {
      errs.push('El nombre de la sesión es un campo requerido.');
    }

    // 2. Exercise templates integrity
    const allExercises = [...groupExercises, ...individualExercises];
    allExercises.forEach(e => {
      if (!e.plantilla_id) {
        errs.push(`El ejercicio "${e.ejercicio}" no está asociado a una plantilla oficial del catálogo.`);
      }
    });

    // 3. Unique order constraints
    const groupOrders = groupExercises.map(e => e.orden);
    if (new Set(groupOrders).size !== groupOrders.length) {
      errs.push('Existen ejercicios con órdenes de ejecución duplicados en el bloque Grupal.');
    }

    // 4. Individual players block validation
    individualExercises.forEach(e => {
      if (!e.player_id) {
        errs.push(`El ejercicio "${e.ejercicio}" en bloque individual no tiene un jugador asignado.`);
      }
    });

    // 5. PHV threshold safety locks
    allExercises.forEach(e => {
      // Find PHV threshold (e.g. pliometria intensiva requires min_phv 0.5)
      const isIntensivePlyo = e.target_group === 'PLIOMETRIA_INTENSIVA';
      if (isIntensivePlyo && catMinPHV < 0.5 && !e.justificacion) {
        errs.push(`El ejercicio pliométrico intenso "${e.ejercicio}" requiere maduración física PHV >= 0.5. El mínimo de la categoría es ${catMinPHV.toFixed(2)}. Justificación requerida para omitir.`);
      }
    });

    // 6. Mandatory justifications
    allExercises.forEach(e => {
      if (!e.justificacion.trim()) {
        errs.push(`El ejercicio "${e.ejercicio}" requiere una justificación técnica o médica obligatoria.`);
      }
    });

    // --- B. STRATEGIC WARNINGS (Bypassable with justification) ---
    // 1. Day of Microcycle training rules
    if (diaMicrociclo === 'MD-4') {
      const forbidden = allExercises.filter(e => !['FZA_MAXIMA', 'RFD', 'EXCENTRICO', 'ESTRATEGIA'].includes(e.target_group));
      if (forbidden.length > 0) {
        warns.push(`En MD-4 se recomiendan cualidades de desarrollo neuromuscular (Fuerza Máxima, RFD, Excéntrico). Tienes ejercicios de: ${Array.from(new Set(forbidden.map(f => f.target_group))).join(', ')}.`);
      }
    } else if (diaMicrociclo === 'MD-3') {
      const forbidden = allExercises.filter(e => !['POTENCIA', 'REACTIVA', 'RIGIDEZ', 'COD', 'ACELERACION', 'ESTRATEGIA'].includes(e.target_group));
      if (forbidden.length > 0) {
        warns.push(`En MD-3 se recomiendan cualidades dinámicas rápidas (Potencia, Reactiva, Rigidez, COD, Aceleración). Tienes ejercicios de: ${Array.from(new Set(forbidden.map(f => f.target_group))).join(', ')}.`);
      }
    } else if (diaMicrociclo === 'MD-2') {
      const forbidden = allExercises.filter(e => !['POTENCIA', 'REACTIVA', 'ESTRATEGIA'].includes(e.target_group));
      if (forbidden.length > 0) {
        warns.push(`En MD-2 se debe controlar el volumen. No se recomiendan trabajos pesados excéntricos o de fuerza máxima.`);
      }
    } else if (diaMicrociclo === 'MD-1') {
      const forbidden = allExercises.filter(e => !['ESTRATEGIA', 'RIGIDEZ'].includes(e.target_group));
      if (forbidden.length > 0) {
        warns.push(`En MD-1 solo se permiten activaciones cortas (Rigidez) y estrategias de prevención.`);
      }
    }

    // 2. Volume and duration alerts
    if (liveCounters.isPlyoOverloaded) {
      warns.push(`El volumen total de contactos pliométricos (${liveCounters.plyoContacts}) supera el límite seguro recomendado para esta categoría (${liveCounters.plyoLimit} contactos).`);
    }
    if (liveCounters.isDurationOverloaded) {
      warns.push(`La duración estimada del entrenamiento (${liveCounters.estimatedDuration} min) excede la disponibilidad declarada de la sesión (${duracionDisponible} min).`);
    }

    // 3. Player wellness risks and injuries
    nominatedPlayers.forEach(p => {
      const health = playerHealthProfiles[p.player_id];
      if (health) {
        if (health.injured) {
          warns.push(`El jugador ${p.name} figura como lesionado/en rehabilitación. Asegúrate de prescribir únicamente tareas regenerativas o kinesiología.`);
        }
        if (health.wellnessStatus === 'CRITICAL') {
          warns.push(`El jugador ${p.name} tiene un wellness promedio crítico (< 5.0). Debes aplicar el régimen conservador (reducir series 30% y evitar pliometría intensa).`);
        }
        if (health.acwrStatus === 'CRITICAL') {
          warns.push(`El jugador ${p.name} presenta un ACWR crítico (> 1.3). Riesgo alto de lesión. Se prohíben pliometrías intensas y cargas > 85% 1RM.`);
        }
        if (health.wellnessStatus === 'NODATA' || health.acwrStatus === 'NODATA') {
          warns.push(`El jugador ${p.name} carece de datos telemétricos (Wellness/ACWR). Aplicando régimen conservador preventivo.`);
        }
      }
    });

    setErrors(errs);
    setWarnings(warns);

    if (errs.length > 0 || warns.length > 0) {
      setShowValidationModal(true);
    } else {
      executeTransactionalSave('');
    }
  };

  const executeTransactionalSave = async (justificationText: string) => {
    setSaving(true);
    try {
      // Clean observations with duration metadata [DURACION: X MIN]
      const finalObservations = `[DURACION: ${duracionDisponible} MIN] ${observaciones} ${justificationText ? `| Justificación técnica de omisión: ${justificationText}` : ''}`.trim();

      // Format target qualities string (comma separated)
      const targetQualitiesStr = selectedTargetQualities.join(',');

      // 1. Session payload with our updated schema
      const sessionPayload = {
        microcycle_id: microcycle.id,
        dia_semana: diaSemana,
        fecha_sesion: fechaSesion || null,
        nombre_sesion: nombreSesion,
        observaciones: finalObservations,
        categoria: formatCategoryLabel(microcycle.category_id),
        dia_microciclo: diaMicrociclo,
        cualidades_objetivo: targetQualitiesStr,
        contactos_totales: liveCounters.plyoContacts,
        generado_por: session?.generado_por || 'AI Gym Designer'
      };

      // 2. Format exercises payload with updated schema columns
      const exercisesPayload = [...groupExercises, ...individualExercises].map((e, index) => {
        const matchingTemplate = exerciseTemplates.find(t => t.id === e.plantilla_id);
        const packedGM = packGrupoMuscular(e.grupo_muscular, e.target_group);

        return {
          plantilla_id: e.plantilla_id,
          bloque: e.bloque,
          player_id: e.player_id,
          cualidad_id: e.cualidad_id,
          target_group: e.target_group,
          grupo_muscular: packedGM,
          ejercicio: e.ejercicio,
          equipamiento: e.equipamiento,
          tecnica_ejecucion: e.tecnica_ejecucion,
          series: e.series,
          repeticiones: e.repeticiones,
          carga_kg: e.carga_kg,
          rpe_sugerido: e.rpe_sugerido,
          orden: index,
          intensidad: e.intensidad,
          tempo: e.tempo,
          descanso_seg: e.descanso_seg,
          contactos: e.contactos,
          lado: e.lado,
          justificacion: e.justificacion
        };
      });

      // Call original transactional save prop
      await onSave(sessionPayload, exercisesPayload);
      setShowValidationModal(false);
    } catch (err: any) {
      alert('Error al guardar sesión: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const packGrupoMuscular = (grupoMuscular: string, targetGroup: string) => {
    if (!targetGroup || targetGroup === 'TODOS') return grupoMuscular;
    return `[${targetGroup}] ${grupoMuscular}`;
  };

  const formatCategoryLabel = (catId: any) => {
    const catIdMap: Record<number, string> = {
      1: 'SUB 13', 2: 'SUB 14', 3: 'SUB 15', 4: 'SUB 16',
      5: 'SUB 17', 6: 'SUB 18', 7: 'SUB 20', 8: 'SUB 21',
      9: 'SUB 23', 10: 'ADULTA'
    };
    return catIdMap[catId] || `SUB ${catId}`;
  };

  const getWellnessScoreColor = (score: number | null) => {
    if (score === null) return 'text-slate-400 bg-slate-50 border-slate-100';
    if (score < 5.0) return 'text-rose-600 bg-rose-50 border-rose-100';
    if (score < 7.0) return 'text-amber-600 bg-amber-50 border-amber-100';
    return 'text-emerald-600 bg-emerald-50 border-emerald-100';
  };

  const getAcwrColor = (val: number | null) => {
    if (val === null) return 'text-slate-400 bg-slate-50 border-slate-100';
    if (val > 1.3 || val < 0.8) return 'text-rose-600 bg-rose-50 border-rose-100';
    return 'text-emerald-600 bg-emerald-50 border-emerald-100';
  };

  // Pre-selected player profile level
  const getPlayerLevelBadge = (pid: number, qKey: string) => {
    const row = vNivelResumen.find(r => r.player_id === pid && r.cualidad === qKey);
    if (!row || row.nivel_cualidad === 'SIN_DATO') {
      return <span className="bg-slate-100 text-slate-500 border border-slate-200 text-[9px] font-black uppercase px-2 py-0.5 rounded">SIN DATO</span>;
    }
    if (row.nivel_cualidad === 'BAJO') {
      return <span className="bg-rose-500 text-white border border-rose-600 text-[9px] font-black uppercase px-2 py-0.5 rounded">BAJO</span>;
    }
    if (row.nivel_cualidad === 'MEDIO') {
      return <span className="bg-amber-500 text-white border border-amber-600 text-[9px] font-black uppercase px-2 py-0.5 rounded">MEDIO</span>;
    }
    return <span className="bg-emerald-500 text-white border border-emerald-600 text-[9px] font-black uppercase px-2 py-0.5 rounded">ALTO</span>;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-[40px] w-full max-w-7xl h-[92vh] overflow-hidden shadow-2xl flex flex-col border border-slate-100">
        
        {/* --- Header & Workspace Status --- */}
        <div className="bg-[#0b1220] text-white px-8 py-5 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#CF1B2B] rounded-2xl flex items-center justify-center shadow-lg shadow-red-950/20">
              <Dumbbell className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black uppercase italic tracking-tight">
                  {session ? 'EDITAR SESIÓN DE ENTRENAMIENTO' : 'DISEÑADOR DE SESIÓN GIMNASIO'}
                </h3>
                <span className="bg-red-500/20 text-red-300 text-[9px] font-black uppercase px-2 py-0.5 rounded border border-red-500/30">
                  {formatCategoryLabel(microcycle.category_id)}
                </span>
              </div>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                Microciclo: {microcycle.name || `MC ${microcycle.micro_number || ''}`} ({microcycle.start_date} al {microcycle.end_date})
              </p>
            </div>
          </div>
          
          {/* Live volume & duration counters */}
          <div className="hidden lg:flex items-center gap-6 bg-white/5 rounded-2xl px-5 py-2 border border-white/5">
            <div className="text-center">
              <span className="block text-[8px] font-black text-white/40 uppercase tracking-widest">Contactos Pliomet.</span>
              <span className={`text-xs font-black ${liveCounters.isPlyoOverloaded ? 'text-rose-400' : 'text-emerald-400'}`}>
                {liveCounters.plyoContacts} / {liveCounters.plyoLimit}
              </span>
            </div>
            <div className="w-px h-6 bg-white/10" />
            <div className="text-center">
              <span className="block text-[8px] font-black text-white/40 uppercase tracking-widest">Duración Est.</span>
              <span className={`text-xs font-black ${liveCounters.isDurationOverloaded ? 'text-amber-400' : 'text-emerald-400'}`}>
                {liveCounters.estimatedDuration} min / {duracionDisponible}m
              </span>
            </div>
            <div className="w-px h-6 bg-white/10" />
            <div className="text-center">
              <span className="block text-[8px] font-black text-white/40 uppercase tracking-widest">Objetivos Cubiertos</span>
              <span className={`text-xs font-black ${liveCounters.matchesTargets ? 'text-emerald-400' : 'text-amber-400'}`}>
                {liveCounters.matchesTargets ? 'COMPLETO' : 'PENDIENTE'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* --- Workspace Layout --- */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row bg-slate-50/50">
          
          {/* --- LEFT PANEL: Context Selector & Category Profile --- */}
          <div className="w-full lg:w-80 bg-white border-r border-slate-100 flex flex-col overflow-y-auto p-5 space-y-6">
            
            {/* 1. Context Selector */}
            <div className="bg-slate-50 rounded-3xl p-4 border border-slate-100 space-y-4">
              <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-200/50 pb-2">
                <Calendar className="w-3.5 h-3.5 text-slate-600" /> CONTEXTO DE LA SESIÓN
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Nombre de la Sesión</label>
                  <input
                    type="text"
                    value={nombreSesion}
                    onChange={(e) => setNombreSesion(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#CF1B2B]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Día de la semana</label>
                    <select
                      value={diaSemana}
                      onChange={(e) => setDiaSemana(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                    >
                      {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Tipo de Día</label>
                    <select
                      value={diaMicrociclo}
                      onChange={(e) => setDiaMicrociclo(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                    >
                      {['MD-4', 'MD-3', 'MD-2', 'MD-1', 'MD+1', 'MD+2'].map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Fecha</label>
                    <input
                      type="date"
                      value={fechaSesion}
                      onChange={(e) => setFechaSesion(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Duración (min)</label>
                    <input
                      type="number"
                      value={duracionDisponible}
                      onChange={(e) => setDuracionDisponible(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Category Profile Panel */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-rose-500" /> PERFIL DE LA CATEGORÍA
                </h4>
                <span className="text-[9px] font-extrabold text-slate-400 uppercase">OBJETIVOS (MAX 2)</span>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
                </div>
              ) : (
                <div className="space-y-3.5">
                  {categoryStats.map(stats => {
                    const isSelected = selectedTargetQualities.includes(stats.key);
                    const isInsufficient = stats.nWithData < 15;

                    return (
                      <div 
                        key={stats.key}
                        className={`p-3 rounded-2xl border transition-all ${
                          isSelected 
                            ? 'bg-rose-50/40 border-rose-200 shadow-sm shadow-rose-100' 
                            : 'bg-white border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-black text-slate-800 uppercase tracking-tight truncate block">{stats.label}</span>
                            <span className="text-[8px] text-slate-400 font-bold block uppercase mt-0.5">Muestra: n={stats.nWithData} {isInsufficient && '(Insuficiente)'}</span>
                          </div>
                          
                          <button
                            onClick={() => handleToggleTargetQuality(stats.key)}
                            className={`px-2 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-rose-600 text-white shadow-md shadow-rose-900/10'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {isSelected ? 'OBJETIVO' : 'SELECCIONAR'}
                          </button>
                        </div>

                        {/* Stacked bar percentages */}
                        <div className="mt-2.5 space-y-1">
                          <div className="w-full h-2 rounded-full overflow-hidden bg-slate-100 flex">
                            <div className="h-full bg-rose-500" style={{ width: `${stats.baixoPct}%` }} title={`Bajo: ${stats.baixoPct.toFixed(0)}%`} />
                            <div className="h-full bg-amber-500" style={{ width: `${stats.medioPct}%` }} title={`Medio: ${stats.medioPct.toFixed(0)}%`} />
                            <div className="h-full bg-emerald-500" style={{ width: `${stats.altoPct}%` }} title={`Alto: ${stats.altoPct.toFixed(0)}%`} />
                            <div className="h-full bg-slate-300" style={{ width: `${stats.noDataPct}%` }} title={`Sin Dato: ${stats.noDataPct.toFixed(0)}%`} />
                          </div>
                          <div className="flex items-center justify-between text-[8px] text-slate-400 font-extrabold uppercase">
                            <span className="text-rose-600">B: {stats.baixoPct.toFixed(0)}%</span>
                            <span className="text-amber-600">M: {stats.medioPct.toFixed(0)}%</span>
                            <span className="text-emerald-600">A: {stats.altoPct.toFixed(0)}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* --- MAIN CENTER CONTAINER: Designer, Tabs & Tables --- */}
          <div className="flex-1 overflow-hidden flex flex-col p-6 space-y-6">
            
            {/* Navigation Tabs */}
            <div className="flex justify-between items-center bg-slate-100 p-1.5 rounded-2xl max-w-md">
              <button
                onClick={() => { setCurrentTab('BASE_GRUPAL'); setSelectedPlayerId(null); }}
                className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  currentTab === 'BASE_GRUPAL' 
                    ? 'bg-white text-[#0b1220] shadow' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Bloque BASE GRUPAL
              </button>
              <button
                onClick={() => { 
                  setCurrentTab('INDIVIDUAL'); 
                  if (nominatedPlayers.length > 0 && !selectedPlayerId) {
                    setSelectedPlayerId(nominatedPlayers[0].player_id);
                  }
                }}
                className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  currentTab === 'INDIVIDUAL' 
                    ? 'bg-white text-[#0b1220] shadow' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Bloques INDIVIDUALES
              </button>
            </div>

            {/* --- WORKSPACE INTERACTIVE AREA --- */}
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row gap-6">
              
              {/* Workspace Main Design Board */}
              <div className="flex-1 overflow-y-auto bg-white rounded-3xl border border-slate-100 p-6 space-y-6 flex flex-col justify-between">
                
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#CF1B2B]" /> 
                    {currentTab === 'BASE_GRUPAL' 
                      ? 'CONSTRUCTOR DE TAREAS: BASE GRUPAL DE CATEGORÍA' 
                      : `PRESCRIPCIÓN INDIVIDUAL: ${nominatedPlayers.find(p => p.player_id === selectedPlayerId)?.name || 'JUGADOR'}`
                    }
                  </h4>

                  {/* 1. Add Exercise Form */}
                  <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100/50 mt-4 space-y-4">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Buscador inteligente e inserción rápida</span>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      {/* Search Catalog */}
                      <div className="relative md:col-span-2">
                        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Nombre del Ejercicio (Filtros activos)</label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Buscar en catálogo oficial de ejercicios..."
                            value={exerciseSearch}
                            onChange={(e) => {
                              setExerciseSearch(e.target.value);
                              setShowCatalogDropdown(true);
                            }}
                            onFocus={() => setShowCatalogDropdown(true)}
                            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#CF1B2B]"
                          />
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        </div>

                        {/* Catalog results dropdown */}
                        {showCatalogDropdown && filteredCatalog.length > 0 && (
                          <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-56 overflow-y-auto z-40">
                            {filteredCatalog.map(item => {
                              // Verify PHV compliance
                              const isRestricted = item.target_group === 'PLIOMETRIA_INTENSIVA' && catMinPHV < 0.5;

                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => handleSelectTemplate(item)}
                                  className="w-full px-3 py-2.5 text-left hover:bg-slate-50 transition-colors flex flex-col border-b border-slate-100 last:border-none"
                                >
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                                      {item.ejercicio}
                                      {isRestricted && <Lock className="w-3.5 h-3.5 text-amber-500" />}
                                    </span>
                                    <span className="bg-slate-100 text-[8px] font-black uppercase text-slate-500 px-1.5 py-0.5 rounded">
                                      {item.target_group}
                                    </span>
                                  </div>
                                  <span className="text-[9px] text-slate-400 truncate mt-0.5">Técnica: {item.tecnica_ejecucion}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Muscle group */}
                      <div>
                        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Grupo Muscular / Equipamiento</label>
                        <input
                          type="text"
                          readOnly
                          value={selectedTemplate ? `${selectedTemplate.grupo_muscular} | ${selectedTemplate.equipamiento}` : 'Selecciona un ejercicio'}
                          className="w-full px-3 py-2 bg-slate-100 border border-slate-100 rounded-xl text-xs font-bold text-slate-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Equipments chips filter */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Filtrar por Equipamiento:</span>
                      {EQUIPAMIENTOS_OPCIONES.map(eq => {
                        const isSel = selectedEquipments.includes(eq);
                        return (
                          <button
                            key={eq}
                            onClick={() => {
                              setSelectedEquipments(prev => isSel ? prev.filter(x => x !== eq) : [...prev, eq]);
                            }}
                            className={`px-2 py-1 rounded-lg text-[8px] font-bold uppercase border cursor-pointer transition-all ${
                              isSel 
                                ? 'bg-[#0b1220] text-white border-[#0b1220]' 
                                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {eq}
                          </button>
                        );
                      })}
                    </div>

                    {/* Dosage selectors */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3.5 pt-2 border-t border-slate-100">
                      <div>
                        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Series</label>
                        <input
                          type="number"
                          value={exerciseForm.series}
                          onChange={(e) => setExerciseForm(prev => ({ ...prev, series: Number(e.target.value) }))}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 text-center focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Repeticiones</label>
                        <input
                          type="text"
                          value={exerciseForm.repeticiones}
                          onChange={(e) => setExerciseForm(prev => ({ ...prev, repeticiones: e.target.value }))}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 text-center focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Carga (kg/%)</label>
                        <input
                          type="text"
                          value={exerciseForm.carga_kg}
                          onChange={(e) => setExerciseForm(prev => ({ ...prev, carga_kg: e.target.value }))}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 text-center focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Rest (seg)</label>
                        <input
                          type="number"
                          value={exerciseForm.descanso_seg}
                          onChange={(e) => setExerciseForm(prev => ({ ...prev, descanso_seg: Number(e.target.value) }))}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 text-center focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Intensidad / Lado</label>
                        <select
                          value={exerciseForm.lado || 'BILATERAL'}
                          onChange={(e) => setExerciseForm(prev => ({ ...prev, lado: e.target.value as any }))}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 text-center focus:outline-none"
                        >
                          <option value="BILATERAL">BILATERAL</option>
                          <option value="IZQ">IZQ (UNILATERAL)</option>
                          <option value="DER">DER (UNILATERAL)</option>
                          <option value="AMBOS_ALTERNADO">AMBOS ALTERNADO</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Plio Contacts</label>
                        <input
                          type="number"
                          value={exerciseForm.contactos}
                          onChange={(e) => setExerciseForm(prev => ({ ...prev, contactos: Number(e.target.value) }))}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 text-center focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1">
                      <div className="md:col-span-3">
                        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Justificación Técnica u Médica Obligatoria (Indica por qué o para quién)</label>
                        <input
                          type="text"
                          placeholder="Ej: Estimular acople excéntrico en fase neuromuscular. Basado en déficit grupal."
                          value={exerciseForm.justificacion}
                          onChange={(e) => setExerciseForm(prev => ({ ...prev, justificacion: e.target.value }))}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={handleAddExercise}
                          className="w-full bg-[#0b1220] hover:bg-black text-white py-2 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                        >
                          <Plus className="w-4 h-4 text-rose-500" /> AGREGAR TAREA
                        </button>
                      </div>
                    </div>

                  </div>
                </div>

                {/* 2. Added Exercises Table Grid */}
                <div className="flex-1 overflow-y-auto mt-6">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-3">Ejercicios Prescritos en la lista actual</span>

                  {currentTab === 'BASE_GRUPAL' ? (
                    groupExercises.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-100 rounded-3xl text-slate-400">
                        <Dumbbell className="w-10 h-10 mb-2 opacity-30" />
                        <span className="text-[10px] font-black uppercase tracking-wider">No se han añadido tareas grupales</span>
                        <span className="text-[9px] font-medium text-slate-400 mt-1">Busca un ejercicio en el catálogo oficial de arriba y agrégalo.</span>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {groupExercises.map((e, index) => (
                          <div key={e.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-[#0b1220] uppercase">{e.ejercicio}</span>
                                <span className="bg-rose-100 text-rose-700 text-[8px] font-black uppercase px-2 py-0.5 rounded-lg">{e.target_group}</span>
                              </div>
                              <p className="text-[9px] text-slate-400 font-bold uppercase">Equipo: {e.equipamiento} | Grupo: {e.grupo_muscular}</p>
                              <p className="text-[9px] text-slate-500 font-medium italic">Téc: {e.tecnica_ejecucion}</p>
                              <div className="pt-1.5 flex items-center gap-1 text-[9px] text-slate-500">
                                <span className="font-extrabold text-slate-400 uppercase">Justificación:</span>
                                <span className="font-semibold text-[#CF1B2B]">{e.justificacion || 'Falta justificación'}</span>
                              </div>
                            </div>

                            {/* Inline dosage settings */}
                            <div className="flex flex-wrap items-center gap-2.5">
                              <div className="text-center">
                                <span className="block text-[8px] font-black text-slate-400 uppercase">Series</span>
                                <input
                                  type="number"
                                  value={e.series}
                                  onChange={(val) => handleUpdateExerciseField(e.id!, 'series', Number(val.target.value), true)}
                                  className="w-12 px-1 py-0.5 bg-white border border-slate-200 rounded text-center text-xs font-bold text-slate-800"
                                />
                              </div>
                              <div className="text-center">
                                <span className="block text-[8px] font-black text-slate-400 uppercase">Reps</span>
                                <input
                                  type="text"
                                  value={e.repeticiones}
                                  onChange={(val) => handleUpdateExerciseField(e.id!, 'repeticiones', val.target.value, true)}
                                  className="w-16 px-1 py-0.5 bg-white border border-slate-200 rounded text-center text-xs font-bold text-slate-800"
                                />
                              </div>
                              <div className="text-center">
                                <span className="block text-[8px] font-black text-slate-400 uppercase">Carga</span>
                                <input
                                  type="text"
                                  value={e.carga_kg}
                                  onChange={(val) => handleUpdateExerciseField(e.id!, 'carga_kg', val.target.value, true)}
                                  className="w-20 px-1 py-0.5 bg-white border border-slate-200 rounded text-center text-xs font-bold text-slate-800"
                                />
                              </div>
                              <div className="text-center">
                                <span className="block text-[8px] font-black text-slate-400 uppercase">Descanso</span>
                                <input
                                  type="number"
                                  value={e.descanso_seg}
                                  onChange={(val) => handleUpdateExerciseField(e.id!, 'descanso_seg', Number(val.target.value), true)}
                                  className="w-16 px-1 py-0.5 bg-white border border-slate-200 rounded text-center text-xs font-bold text-slate-800"
                                />
                              </div>
                              <div className="text-center">
                                <span className="block text-[8px] font-black text-slate-400 uppercase">Justificación</span>
                                <input
                                  type="text"
                                  value={e.justificacion}
                                  onChange={(val) => handleUpdateExerciseField(e.id!, 'justificacion', val.target.value, true)}
                                  className="w-28 px-1 py-0.5 bg-white border border-slate-200 rounded text-left text-xs font-bold text-slate-800"
                                />
                              </div>
                              <button
                                onClick={() => handleDeleteExercise(e.id!, true)}
                                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 flex items-center justify-center transition-all cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  ) : (
                    // Individual blocks current exercises
                    !selectedPlayerId ? (
                      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                        <User className="w-10 h-10 mb-2 opacity-30" />
                        <span className="text-[10px] font-black uppercase tracking-wider">Selecciona un jugador a la derecha</span>
                      </div>
                    ) : (
                      individualExercises.filter(e => e.player_id === selectedPlayerId).length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-100 rounded-3xl text-slate-400">
                          <Dumbbell className="w-10 h-10 mb-2 opacity-30" />
                          <span className="text-[10px] font-black uppercase tracking-wider">No hay tareas individuales para este jugador</span>
                          <span className="text-[9px] font-medium mt-1">Usa la compensación de asimetría o agrega ejercicios arriba.</span>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {individualExercises.filter(e => e.player_id === selectedPlayerId).map((e, index) => (
                            <div key={e.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black text-[#0b1220] uppercase">{e.ejercicio}</span>
                                  <span className="bg-rose-100 text-rose-700 text-[8px] font-black uppercase px-2 py-0.5 rounded-lg">{e.target_group}</span>
                                  {e.lado && <span className="bg-[#0b1220] text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-lg">LADO: {e.lado}</span>}
                                </div>
                                <p className="text-[9px] text-slate-400 font-bold uppercase">Equipo: {e.equipamiento} | Grupo: {e.grupo_muscular}</p>
                                <p className="text-[9px] text-slate-500 font-medium italic">Téc: {e.tecnica_ejecucion}</p>
                                <div className="pt-1.5 flex items-center gap-1 text-[9px] text-slate-500">
                                  <span className="font-extrabold text-slate-400 uppercase">Justificación:</span>
                                  <span className="font-semibold text-rose-600">{e.justificacion}</span>
                                </div>
                              </div>

                              {/* Inline dosage settings */}
                              <div className="flex flex-wrap items-center gap-2.5">
                                <div className="text-center">
                                  <span className="block text-[8px] font-black text-slate-400 uppercase">Series</span>
                                  <input
                                    type="number"
                                    value={e.series}
                                    onChange={(val) => handleUpdateExerciseField(e.id!, 'series', Number(val.target.value), false)}
                                    className="w-12 px-1 py-0.5 bg-white border border-slate-200 rounded text-center text-xs font-bold text-slate-800"
                                  />
                                </div>
                                <div className="text-center">
                                  <span className="block text-[8px] font-black text-slate-400 uppercase">Reps</span>
                                  <input
                                    type="text"
                                    value={e.repeticiones}
                                    onChange={(val) => handleUpdateExerciseField(e.id!, 'repeticiones', val.target.value, false)}
                                    className="w-16 px-1 py-0.5 bg-white border border-slate-200 rounded text-center text-xs font-bold text-slate-800"
                                  />
                                </div>
                                <div className="text-center">
                                  <span className="block text-[8px] font-black text-slate-400 uppercase">Carga</span>
                                  <input
                                    type="text"
                                    value={e.carga_kg}
                                    onChange={(val) => handleUpdateExerciseField(e.id!, 'carga_kg', val.target.value, false)}
                                    className="w-20 px-1 py-0.5 bg-white border border-slate-200 rounded text-center text-xs font-bold text-slate-800"
                                  />
                                </div>
                                <button
                                  onClick={() => handleDeleteExercise(e.id!, false)}
                                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 flex items-center justify-center transition-all cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    )
                  )}
                </div>

              </div>

              {/* RIGHT PANEL (ONLY IN INDIVIDUALS TAB): Telemetries & Asymmetries list */}
              {currentTab === 'INDIVIDUAL' && (
                <div className="w-full lg:w-96 bg-white rounded-3xl border border-slate-100 p-5 flex flex-col overflow-hidden">
                  
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                      <User className="w-4 h-4 text-slate-700" /> JUGADORES CITED
                    </span>
                    <button
                      onClick={handleSuggestIndividuals}
                      className="bg-indigo-50 hover:bg-indigo-600 hover:text-white border border-indigo-100 text-indigo-600 text-[8px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-xl transition-all cursor-pointer shadow-sm flex items-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> SUGERIR INDIV.
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {nominatedPlayers.map(p => {
                      const health = playerHealthProfiles[p.player_id];
                      const isSelected = selectedPlayerId === p.player_id;
                      const imtp = evalImtp.find(i => i.player_id === p.player_id);
                      const hasAsymmetry = imtp && imtp.imtp_asimetria !== null && imtp.imtp_asimetria > 15;

                      return (
                        <div
                          key={p.player_id}
                          onClick={() => setSelectedPlayerId(p.player_id)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 ${
                            isSelected 
                              ? 'bg-indigo-50/40 border-indigo-200' 
                              : 'bg-white border-slate-100 hover:border-slate-200'
                          }`}
                        >
                          <div className="flex items-start justify-between min-w-0 gap-2">
                            <div className="min-w-0 flex-1">
                              <h5 className="text-[11px] font-black text-slate-800 uppercase truncate">{p.name}</h5>
                              <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{p.position} | YPHV: {health?.yphv !== null ? health.yphv.toFixed(2) : 'S/D'}</p>
                            </div>
                            
                            {/* Level badges for first selected target quality */}
                            {selectedTargetQualities.length > 0 && (
                              <div className="flex flex-col gap-1 items-end shrink-0">
                                <span className="text-[7px] text-slate-400 font-black uppercase tracking-wider">{selectedTargetQualities[0]}</span>
                                {getPlayerLevelBadge(p.player_id, selectedTargetQualities[0])}
                              </div>
                            )}
                          </div>

                          {/* Health Risks Alert Panel */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {health?.injured && (
                              <span className="bg-red-100 text-red-700 text-[8px] font-black uppercase px-2 py-0.5 rounded border border-red-200">
                                LESIONADO
                              </span>
                            )}
                            
                            {/* Wellness info */}
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${getWellnessScoreColor(health?.wellnessAvg)}`}>
                              W: {health?.wellnessAvg !== null ? health.wellnessAvg.toFixed(1) : 'S/D'}
                            </span>

                            {/* ACWR info */}
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${getAcwrColor(health?.acwr)}`}>
                              ACWR: {health?.acwr !== null ? health.acwr.toFixed(2) : 'S/D'}
                            </span>

                            {/* IMTP Asymmetry */}
                            {hasAsymmetry && (
                              <span className="bg-amber-100 text-amber-800 text-[8px] font-black uppercase px-2 py-0.5 rounded border border-amber-200 flex items-center gap-0.5">
                                <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" /> ASIM: {imtp.imtp_asimetria?.toFixed(0)}% ({imtp.imtp_debil})
                              </span>
                            )}
                          </div>

                          {/* Autofill Compensations Button if asymmetric */}
                          {hasAsymmetry && isSelected && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleAutofillAsymmetry(p.player_id); }}
                              className="mt-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-[8px] font-black uppercase tracking-widest py-1.5 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                            >
                              <RefreshCw className="w-3 h-3 text-amber-600 animate-spin-slow" /> COMPENSACIÓN AUTOMÁTICA
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                </div>
              )}

            </div>

            {/* Save & Cancel Actions Bar */}
            <div className="flex justify-between items-center border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={onClose}
                className="bg-white text-slate-800 hover:bg-slate-100 border border-slate-200 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleValidateAndSave}
                disabled={saving}
                className="bg-[#CF1B2B] hover:bg-red-700 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg cursor-pointer flex items-center gap-2 disabled:opacity-55"
              >
                <Save className="w-4 h-4 text-white" />
                <span>{saving ? 'GUARDANDO...' : 'GUARDAR SESIÓN Y EJERCICIOS'}</span>
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* --- VALIDATIONS & SAFETY WARNINGS POPUP OVERLAY --- */}
      {showValidationModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-55">
          <div className="bg-white rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#0b1220] text-white px-6 py-4 flex items-center gap-3 border-b border-white/5">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
              <h3 className="text-sm font-black uppercase tracking-widest">CONTROL DE SEGURIDAD Y VALIDACIONES</h3>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
              
              {/* Blocking Errors */}
              {errors.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-2.5">
                  <h4 className="text-[10px] font-black text-rose-800 uppercase tracking-widest flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-600" /> ERRORES BLOQUEANTES (DEBES CORREGIR)
                  </h4>
                  <ul className="list-disc list-inside text-[11px] text-rose-700 font-semibold space-y-1 text-left">
                    {errors.map((e, idx) => (
                      <li key={idx}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Strategic Warnings */}
              {warnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2.5">
                  <h4 className="text-[10px] font-black text-amber-800 uppercase tracking-widest flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" /> ADVERTENCIAS CLÍNICAS / VOLUMETRÍA (REQUIEREN JUSTIFICACIÓN)
                  </h4>
                  <ul className="list-disc list-inside text-[11px] text-amber-700 font-semibold space-y-1 text-left">
                    {warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>

                  {/* Justification Text Area */}
                  {errors.length === 0 && (
                    <div className="mt-4 pt-4 border-t border-amber-200 space-y-2">
                      <label className="block text-[9px] font-black text-amber-900 uppercase tracking-widest">Justificación técnica de omisión de alertas de seguridad:</label>
                      <textarea
                        rows={3}
                        placeholder="Explica detalladamente por qué se omite o asume el riesgo volumétrico o clínico para este microciclo..."
                        value={overrideJustification}
                        onChange={(e) => setOverrideJustification(e.target.value)}
                        className="w-full p-3 bg-white border border-amber-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#CF1B2B]"
                      />
                    </div>
                  )}
                </div>
              )}

            </div>

            <div className="bg-slate-50 px-6 py-4 flex justify-between items-center border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowValidationModal(false)}
                className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer"
              >
                Volver al Workspace
              </button>
              
              {errors.length === 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (warnings.length > 0 && !overrideJustification.trim()) {
                      alert('Por favor escribe una justificación técnica obligatoria para omitir las advertencias de seguridad.');
                      return;
                    }
                    executeTransactionalSave(overrideJustification);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md shadow-emerald-950/10 cursor-pointer flex items-center gap-1"
                >
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>FORZAR GUARDADO</span>
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
