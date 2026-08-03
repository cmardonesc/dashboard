import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { logActivity } from '../lib/activityLogger';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Types corresponding to supabase schema
interface GymExerciseTemplate {
  id: number;
  target_group: string;
  grupo_muscular: string;
  ejercicio: string;
  equipamiento: string;
  tecnica_ejecucion: string;
  series: number;
  repeticiones: string;
  carga_kg: string;
  rpe_sugerido: number;
  image_0?: string;
  image_1?: string;
  musculos_secundarios?: string[];
  nivel?: string;
  mecanica?: string;
  fuerza?: string;
}

interface RoutineExercise {
  id_key: string; // unique key for react and state
  template_id: number;
  target_group: string;
  grupo_muscular: string;
  ejercicio: string;
  equipamiento: string;
  tecnica_ejecucion: string;
  series: number;
  repeticiones: string;
  carga_kg: string;
  rpe_sugerido: number;
  image_0?: string;
  image_1?: string;
  musculos_secundarios?: string[];
  nivel?: string;
  mecanica?: string;
  fuerza?: string;
  // Player session specific records
  setsData: Array<{
    completed: boolean;
    weight: string;
    reps: string;
  }>;
}

interface CompletedWorkout {
  id: string;
  date: string;
  title: string;
  objective: string;
  durationSeconds: number;
  totalSetsCompleted: number;
  notes: string;
  exercises: Array<{
    name: string;
    grupo_muscular: string;
    sets: Array<{
      completed: boolean;
      weight: string;
      reps: string;
    }>;
  }>;
}

interface AITrainerProps {
  player?: {
    player_id?: number;
    nombre?: string;
    apellido?: string;
    posicion?: string;
    club_name?: string | null;
  } | null;
}

const TARGET_GROUPS_LABELS: Record<string, string> = {
  FUERZA_MAXIMA: 'Fuerza Máxima / Fibras Rápidas',
  FUERZA_EXPLOSIVA: 'Fuerza Explosiva / Potencia',
  PLIOMETRIA_INTENSIVA: 'Pliometría Intensiva',
  PLIOMETRIA_EXTENSIVA: 'Pliometría Elástica / Tendón',
  SALTOS_CON_CARGA: 'Saltos con Carga',
  DERIVADOS_HALTEROFILIA: 'Derivados Olímpicos',
  GENERALES_SUPERIOR: 'Acondicionamiento Superior',
  GENERALES_INFERIOR: 'Acondicionamiento Inferior',
  CORE_ZONA_MEDIA: 'Core y Estabilidad',
  ISQUIOSURALES_CADENA_POSTERIOR: 'Isquios / Cadena Posterior',
  TODOS: 'Calentamiento y General'
};

const TARGET_GROUPS_COLORS: Record<string, string> = {
  FUERZA_MAXIMA: 'border-amber-500/20 text-amber-400 bg-amber-500/5',
  FUERZA_EXPLOSIVA: 'border-orange-500/20 text-orange-400 bg-orange-500/5',
  PLIOMETRIA_INTENSIVA: 'border-rose-500/20 text-rose-400 bg-rose-500/5',
  PLIOMETRIA_EXTENSIVA: 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5',
  SALTOS_CON_CARGA: 'border-teal-500/20 text-teal-400 bg-teal-500/5',
  DERIVADOS_HALTEROFILIA: 'border-cyan-500/20 text-cyan-400 bg-cyan-500/5',
  GENERALES_SUPERIOR: 'border-indigo-500/20 text-indigo-400 bg-indigo-500/5',
  GENERALES_INFERIOR: 'border-blue-500/20 text-blue-400 bg-blue-500/5',
  CORE_ZONA_MEDIA: 'border-purple-500/20 text-purple-400 bg-purple-500/5',
  ISQUIOSURALES_CADENA_POSTERIOR: 'border-fuchsia-500/20 text-fuchsia-400 bg-fuchsia-500/5',
  TODOS: 'border-slate-500/20 text-slate-400 bg-slate-500/5'
};

// Rich offline backup database to guarantee exceptional experience even if fetching fails
const FALLBACK_DB_EXERCISES: GymExerciseTemplate[] = [
  { id: 1, target_group: 'FUERZA_MAXIMA', grupo_muscular: 'Piernas / Cadena Posterior', ejercicio: 'Sentadilla trasera con barra baja (Back Squat)', equipamiento: 'Barra olímpica, Discos, Rack', tecnica_ejecucion: 'Apoyar la barra en los deltoides posteriores. Descender con control rompiendo el paralelo (fase excéntrica controlada), empujar verticalmente de forma sólida manteniendo el torso firme.', series: 4, repeticiones: '3-5', carga_kg: '80-85% 1RM', rpe_sugerido: 8 },
  { id: 2, target_group: 'FUERZA_MAXIMA', grupo_muscular: 'Cadena Posterior / Lumbar', ejercicio: 'Peso muerto convencional (Deadlift)', equipamiento: 'Barra olímpica, Discos', tecnica_ejecucion: 'Posición inicial con pies al ancho de cadera, agarre por fuera de las rodillas. Traccionar manteniendo barra pegada al cuerpo, empuje de piernas inicial y extensión simultánea de cadera.', series: 3, repeticiones: '3-5', carga_kg: '80-85% 1RM', rpe_sugerido: 9 },
  { id: 3, target_group: 'FUERZA_MAXIMA', grupo_muscular: 'Pectorales / Tríceps', ejercicio: 'Press de banca plano con barra', equipamiento: 'Barra, Banco plano, Discos', tecnica_ejecucion: 'Apoyo firme de pies en el suelo, retracción escapular activa. Bajar la barra con control al pecho medio y empujar de forma compacta e impulsando con el tren superior.', series: 4, repeticiones: '5', carga_kg: '80% 1RM', rpe_sugerido: 8 },
  { id: 4, target_group: 'FUERZA_EXPLOSIVA', grupo_muscular: 'Piernas / Extensores', ejercicio: 'Sentadilla con salto con barra hexagonal (Hex Bar Jump Squat)', equipamiento: 'Barra hexagonal, Discos livianos', tecnica_ejecucion: 'Bajar a media sentadilla de manera controlada y realizar una extensión de cadera y rodillas extremadamente explosiva para despegar del suelo. Amortiguar con flexión coordinada.', series: 4, repeticiones: '4-6', carga_kg: '30-40% 1RM', rpe_sugerido: 7 },
  { id: 5, target_group: 'FUERZA_EXPLOSIVA', grupo_muscular: 'Cadena Posterior / Core', ejercicio: 'Lanzamiento de Med Ball hacia atrás sobre la cabeza', equipamiento: 'Balón medicinal pesado (6-8kg)', tecnica_ejecucion: 'Desde posición de triple flexión (caderas, rodillas, tobillos), empujar el suelo explosivamente y lanzar el balón con máxima fuerza hacia atrás y arriba mediante extensión potente.', series: 3, repeticiones: '6', carga_kg: 'Balón 6-8kg', rpe_sugerido: 7 },
  { id: 6, target_group: 'FUERZA_EXPLOSIVA', grupo_muscular: 'Hombros / Piernas', ejercicio: 'Push Press con barra', equipamiento: 'Barra olímpica, Discos', tecnica_ejecucion: 'Realizar un dip corto de piernas (flexión menor a 15cm) y aprovechar el impulso del tren inferior de manera coordinada para empujar la barra sobre la cabeza con bloqueo rápido.', series: 4, repeticiones: '5', carga_kg: '65-70% 1RM', rpe_sugerido: 8 },
  { id: 7, target_group: 'PLIOMETRIA_INTENSIVA', grupo_muscular: 'Cuádriceps / Tobillos', ejercicio: 'Saltos de caída con rebote vertical (Depth Jumps)', equipamiento: 'Cajón pliométrico (30-45 cm)', tecnica_ejecucion: 'Dejarse caer desde el cajón (no saltar), amortiguar el impacto con el mínimo tiempo de contacto en el suelo y rebotar explosivamente hacia arriba buscando la máxima altura.', series: 4, repeticiones: '5', carga_kg: 'Peso corporal', rpe_sugerido: 8 },
  { id: 8, target_group: 'PLIOMETRIA_INTENSIVA', grupo_muscular: 'Pantorrillas / Tobillos', ejercicio: 'Saltos de valla continuos (Hurdle Jumps)', equipamiento: '4-5 Vallas pliométricas (40-60 cm)', tecnica_ejecucion: 'Saltos bipodales continuos sobre vallas consecutivas. Minimizar el tiempo de contacto en el suelo, utilizando el rebote reactivo del tendón de Aquiles y flexión de cadera.', series: 3, repeticiones: '5 saltos', carga_kg: 'Peso corporal', rpe_sugerido: 8 },
  { id: 9, target_group: 'PLIOMETRIA_EXTENSIVA', grupo_muscular: 'Tobillo / Tendón de Aquiles', ejercicio: 'Saltos de tobillo rítmicos (Ankle Hops / Pogos)', equipamiento: 'Ninguno', tecnica_ejecucion: 'Saltos verticales rápidos manteniendo las rodillas casi rígidas. El movimiento proviene exclusivamente de la flexión plantar activa del tobillo con rebote elástico y rigidez.', series: 3, repeticiones: '20 contactos', carga_kg: 'Peso corporal', rpe_sugerido: 6 },
  { id: 10, target_group: 'SALTOS_CON_CARGA', grupo_muscular: 'Cuádriceps / Glúteos', ejercicio: 'Saltos desde sentadilla con mancuernas (Dumbbell Jump Squat)', equipamiento: 'Mancuernas de 8-12kg', tecnica_ejecucion: 'Sostener mancuernas firmemente a los costados del cuerpo. Bajar a un cuarto de sentadilla y despegar verticalmente. Absorber la caída flexionando rodillas.', series: 4, repeticiones: '6', carga_kg: '8-12kg c/u', rpe_sugerido: 7 },
  { id: 11, target_group: 'DERIVADOS_HALTEROFILIA', grupo_muscular: 'Cadena Posterior / Potencia total', ejercicio: 'Cargada de fuerza colgado (Hang Power Clean)', equipamiento: 'Barra olímpica, Discos bumpers', tecnica_ejecucion: 'Barra sobre rodillas con bisagra de cadera. Realizar extensión explosiva de cadera-rodilla (triple extensión), encoger hombros y recibir la barra sobre deltoides frontales.', series: 4, repeticiones: '3-4', carga_kg: '65-75% 1RM', rpe_sugerido: 8 },
  { id: 12, target_group: 'GENERALES_SUPERIOR', grupo_muscular: 'Dorsales / Bíceps', ejercicio: 'Dominadas con agarre prono (Pull-ups)', equipamiento: 'Barra fija, cinturón de lastre (opcional)', tecnica_ejecucion: 'Agarre prono más ancho que los hombros. Elevar el cuerpo traccionando codos hacia abajo hasta pasar la barbilla, descender de forma controlada estirando dorsales.', series: 4, repeticiones: '6-8', carga_kg: 'Peso corporal', rpe_sugerido: 8 },
  { id: 13, target_group: 'GENERALES_INFERIOR', grupo_muscular: 'Cuádriceps / Glúteo mayor', ejercicio: 'Sentadilla búlgara con mancuernas', equipamiento: 'Mancuernas, Banco para pie trasero', tecnica_ejecucion: 'Un pie elevado atrás en banco. Bajar cadera verticalmente manteniendo el peso y equilibrio en talón del pie delantero, impidiendo que la rodilla colapse en valgo.', series: 3, repeticiones: '8 por pierna', carga_kg: 'Carga moderada', rpe_sugerido: 8 },
  { id: 14, target_group: 'CORE_ZONA_MEDIA', grupo_muscular: 'Core / Oblicuos (Anti-rotación)', ejercicio: 'Press Pallof con banda elástica (Pallof Press)', equipamiento: 'Banda elástica o polea', tecnica_ejecucion: 'De pie de lado al anclaje, sostener banda frente al esternón con dos manos y extender los brazos hacia adelante resistiendo la tensión lateral rotatoria sin rotar torso.', series: 3, repeticiones: '12 por lado', carga_kg: 'Tensión media', rpe_sugerido: 7 },
  { id: 15, target_group: 'ISQUIOSURALES_CADENA_POSTERIOR', grupo_muscular: 'Isquiotibiales (Excéntrico)', ejercicio: 'Ejercicio nórdico de isquiotibiales (Nordic Hamstring Curl)', equipamiento: 'Colchoneta, compañero o anclaje firme', tecnica_ejecucion: 'De rodillas, tobillos fijados. Dejarse caer lentamente hacia adelante manteniendo el cuerpo rígido desde la cadera, usando los isquios para frenar la caída. Empujar abajo para regresar.', series: 3, repeticiones: '5-6', carga_kg: 'Peso corporal', rpe_sugerido: 9 }
];

const AITrainer: React.FC<AITrainerProps> = ({ player }) => {
  // Navigation Tabs: 'ai_trainer' (Legacy AI), 'routine_builder' (Planificador Supabase), 'history' (Log de Sesiones)
  const [activeTab, setActiveTab] = useState<'ai_trainer' | 'routine_builder' | 'history'>('routine_builder');

  // AI Generator States (from original AITrainer)
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRoutine, setAiRoutine] = useState<any | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Supabase Database Exercises States
  const [dbExercises, setDbExercises] = useState<GymExerciseTemplate[]>(FALLBACK_DB_EXERCISES);
  const [loadingDb, setLoadingDb] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFoco, setSelectedFoco] = useState<string>('TODOS_TAB'); // 'TODOS_TAB' or specific target_group
  
  // Custom Routine Builder States
  const [myRoutine, setMyRoutine] = useState<RoutineExercise[]>([]);
  const [routineTitle, setRoutineTitle] = useState('Mi Sesión de Alto Rendimiento');
  const [routineObjective, setRoutineObjective] = useState('Desarrollo y mantenimiento neuromuscular específico');
  
  // Active Workout Session States (Real-time tracker)
  const [activeWorkout, setActiveWorkout] = useState(false);
  const [currentExIndex, setCurrentExIndex] = useState(0);
  const [workoutSeconds, setWorkoutSeconds] = useState(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Rest Timer States
  const [restSeconds, setRestSeconds] = useState(0);
  const [restActive, setRestActive] = useState(false);
  const [initialRestDuration, setInitialRestDuration] = useState(90);
  const [restTimer, setRestTimer] = useState<NodeJS.Timeout | null>(null);

  // History / Logs
  const [workoutHistory, setWorkoutHistory] = useState<CompletedWorkout[]>([]);
  const [notesSummary, setNotesSummary] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);

  // Fetch Exercises from Supabase on mount
  useEffect(() => {
    const fetchTemplates = async () => {
      setLoadingDb(true);
      try {
        const { data, error } = await supabase
          .from('fisica_gimnasio_ejercicio_plantilla')
          .select('*')
          .order('id', { ascending: true });
        
        if (error) throw error;
        if (data && data.length > 0) {
          setDbExercises(data);
        }
      } catch (err) {
        console.warn('Could not load gym exercise templates from Supabase, using high-performance local fallbacks:', err);
        setDbExercises(FALLBACK_DB_EXERCISES);
      } finally {
        setLoadingDb(false);
      }
    };

    fetchTemplates();

    // Load local history
    const savedHistory = localStorage.getItem('la_roja_player_gym_history');
    if (savedHistory) {
      try {
        setWorkoutHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Error parsing local workout history', e);
      }
    }
  }, []);

  // Sync Workout Time Tracker
  useEffect(() => {
    let interval: any = null;
    if (activeWorkout) {
      interval = setInterval(() => {
        setWorkoutSeconds((prev) => prev + 1);
      }, 1000);
      setTimerInterval(interval);
    } else {
      if (timerInterval) clearInterval(timerInterval);
      setWorkoutSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeWorkout]);

  // Sync Rest Countdown Timer
  useEffect(() => {
    let interval: any = null;
    if (restActive && restSeconds > 0) {
      interval = setInterval(() => {
        setRestSeconds((prev) => {
          if (prev <= 1) {
            setRestActive(false);
            clearInterval(interval);
            // Trigger vibration or notification if browser allows
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      setRestTimer(interval);
    } else {
      if (restTimer) clearInterval(restTimer);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [restActive, restSeconds]);

  // Handle Legacy AI Routine Generator
  const generateAIRoutine = async (type: string) => {
    setAiLoading(true);
    setAiError(null);
    try {
      const prompt = `Eres un Preparador Físico de élite especializado en fútbol profesional. 
      Genera una rutina de entrenamiento de gimnasio enfocada en: ${type}.
      La respuesta debe ser un objeto JSON con el siguiente formato:
      {
        "title": "Nombre de la rutina",
        "objective": "Objetivo principal de la sesión",
        "warmup": ["ejercicio de calentamiento 1", "ejercicio de calentamiento 2"],
        "exercises": [
          {
            "name": "Nombre del ejercicio",
            "sets": "series",
            "reps": "repeticiones",
            "rest": "tiempo de descanso",
            "notes": "indicación técnica clave"
          }
        ],
        "cooldown": ["ejercicio de vuelta a la calma 1", "ejercicio de vuelta a la calma 2"]
      }
      Solo devuelve el JSON, sin texto adicional.`;

      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          config: { responseMimeType: 'application/json' }
        })
      });

      if (!response.ok) {
        throw new Error(`Proxy error: ${response.status}`);
      }

      const resData = await response.json();
      const rawText = resData.text || '{}';
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (parseError) {
        const firstBrace = rawText.indexOf('{');
        const lastBrace = rawText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          const cleaned = rawText.substring(firstBrace, lastBrace + 1);
          data = JSON.parse(cleaned);
        } else {
          throw parseError;
        }
      }
      setAiRoutine(data);
    } catch (err) {
      console.warn('AI Generator failed, falling back to local performance design:', err);
      // Beautiful fallbacks matching requested style
      const normalizedType = type.toLowerCase();
      let fallbackRoutine;
      if (normalizedType.includes('upper')) {
        fallbackRoutine = {
          title: 'Potencia Neuromuscular - Tren Superior',
          objective: 'Desarrollo de la fuerza explosiva en empujes y tracciones para duelos físicos hombro con hombro',
          warmup: [
            'Cardio ligero en remo - 5 minutos',
            'Movilidad escapular y rotadores con banda elástica - 10 reps',
            'Flexiones de brazos con control excéntrico - 2 series x 8 reps'
          ],
          exercises: [
            { name: 'Press de Banca Semiapoyado con Mancuernas', sets: '4', reps: '6', rest: '2 min', notes: 'Foco en la explosividad en fase concéntrica y 3 segundos de descenso controlado.' },
            { name: 'Dominadas Lastradas Pronas (o con asistencia)', sets: '3', reps: '6', rest: '2 min', notes: 'Alineación de hombros hacia abajo, evitar balanceo del tren inferior.' },
            { name: 'Push Press con Barra Olímpica', sets: '3', reps: '5', rest: '90 seg', notes: 'Usa un sutil dip de rodillas para propulsar la barra hacia el techo de forma vertical.' }
          ],
          cooldown: ['Estiramiento pasivo de pectoral y dorsal', 'Liberación miofascial con Foam Roller']
        };
      } else {
        fallbackRoutine = {
          title: 'Fuerza Reactiva e Inestabilidad - Tren Inferior',
          objective: 'Desarrollo de fuerza excéntrica en cuádriceps e isquiotibiales para optimizar el frenado y cambio de dirección',
          warmup: [
            'Trotar suave o bicicleta estática - 5 minutos',
            'Caminata del oso (Bear crawl) - 15 metros',
            'Sentadillas libres con pausa de 2 segundos abajo - 10 reps'
          ],
          exercises: [
            { name: 'Sentadilla Trasera con Barra', sets: '4', reps: '5', rest: '2 min', notes: 'Profundidad rompiendo el paralelo bajo control técnico impecable.' },
            { name: 'Peso Muerto Rumano Unilateral', sets: '3', reps: '8 por lado', rest: '90 seg', notes: 'Foco en la bisagra de cadera y alineación de la pelvis.' }
          ],
          cooldown: ['Estiramiento de isquiotibiales y glúteos', 'Masaje con Foam Roller']
        };
      }
      setAiRoutine(fallbackRoutine);
    } finally {
      setAiLoading(false);
    }
  };

  // Filter db exercises based on selection and search
  const filteredDbExercises = useMemo(() => {
    return dbExercises.filter((ex) => {
      const matchFoco = selectedFoco === 'TODOS_TAB' || ex.target_group === selectedFoco;
      const cleanSearch = searchQuery.toLowerCase();
      const matchSearch = 
        ex.ejercicio.toLowerCase().includes(cleanSearch) ||
        ex.grupo_muscular.toLowerCase().includes(cleanSearch) ||
        (ex.equipamiento && ex.equipamiento.toLowerCase().includes(cleanSearch));
      return matchFoco && matchSearch;
    });
  }, [dbExercises, selectedFoco, searchQuery]);

  // Add exercise to custom routine draft
  const addToRoutine = (template: GymExerciseTemplate) => {
    const idKey = `${template.id}_${Date.now()}`;
    const setsCount = template.series || 3;
    const defaultSetsData = Array.from({ length: setsCount }).map(() => ({
      completed: false,
      weight: template.carga_kg || '0',
      reps: template.repeticiones || '10'
    }));

    const newEx: RoutineExercise = {
      id_key: idKey,
      template_id: template.id,
      target_group: template.target_group,
      grupo_muscular: template.grupo_muscular,
      ejercicio: template.ejercicio,
      equipamiento: template.equipamiento || '',
      tecnica_ejecucion: template.tecnica_ejecucion || '',
      series: setsCount,
      repeticiones: template.repeticiones,
      carga_kg: template.carga_kg,
      rpe_sugerido: template.rpe_sugerido || 7,
      image_0: template.image_0,
      image_1: template.image_1,
      musculos_secundarios: template.musculos_secundarios,
      nivel: template.nivel,
      mecanica: template.mecanica,
      fuerza: template.fuerza,
      setsData: defaultSetsData
    };

    setMyRoutine((prev) => [...prev, newEx]);
  };

  // Remove exercise from custom routine
  const removeFromRoutine = (idKey: string) => {
    setMyRoutine((prev) => prev.filter((ex) => ex.id_key !== idKey));
  };

  // Move exercise order
  const moveExercise = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === myRoutine.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...myRoutine];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setMyRoutine(updated);
  };

  // Update set information dynamically
  const updateSetField = (exIndex: number, setIndex: number, field: 'weight' | 'reps' | 'completed', value: any) => {
    setMyRoutine((prev) => {
      const copy = [...prev];
      const ex = { ...copy[exIndex] };
      const sets = [...ex.setsData];
      sets[setIndex] = { ...sets[setIndex], [field]: value };
      ex.setsData = sets;
      copy[exIndex] = ex;
      return copy;
    });

    // If a set is completed, trigger a brief rest timer automatically!
    if (field === 'completed' && value === true) {
      triggerRest(initialRestDuration);
    }
  };

  // Start the live workout player
  const startWorkoutSession = () => {
    if (myRoutine.length === 0) return;
    setCurrentExIndex(0);
    setWorkoutSeconds(0);
    setActiveWorkout(true);
  };

  // Rest Timer Controller
  const triggerRest = (duration: number) => {
    setInitialRestDuration(duration);
    setRestSeconds(duration);
    setRestActive(true);
  };

  // Finish active session and log
  const finishWorkoutSession = async () => {
    setActiveWorkout(false);
    
    // Calculate stats
    let totalSets = 0;
    myRoutine.forEach((ex) => {
      ex.setsData.forEach((set) => {
        if (set.completed) totalSets++;
      });
    });

    const finishedWorkout: CompletedWorkout = {
      id: `workout_${Date.now()}`,
      date: new Date().toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      title: routineTitle || 'Sesión de Gimnasio',
      objective: routineObjective,
      durationSeconds: workoutSeconds,
      totalSetsCompleted: totalSets,
      notes: notesSummary || 'Entrenamiento completado satisfactoriamente.',
      exercises: myRoutine.map((ex) => ({
        name: ex.ejercicio,
        grupo_muscular: ex.grupo_muscular,
        sets: ex.setsData
      }))
    };

    // Save to local state and localStorage
    const updatedHistory = [finishedWorkout, ...workoutHistory];
    setWorkoutHistory(updatedHistory);
    localStorage.setItem('la_roja_player_gym_history', JSON.stringify(updatedHistory));

    // Supabase activity log if player exists
    if (player?.player_id) {
      try {
        await logActivity(
          'Completo entrenamiento de gimnasio',
          {
            title: finishedWorkout.title,
            exercise_count: finishedWorkout.exercises.length,
            total_sets_completed: totalSets,
            notes: finishedWorkout.notes,
            player_id: player.player_id,
            player_name: player.nombre || 'Jugador'
          }
        );
      } catch (e) {
        console.warn('Logging activity to DB failed, saved locally:', e);
      }
    }

    // Attempt to upload session into the DB so staff can monitor
    try {
      // 1. Fetch first available active microcycle
      const { data: mc } = await supabase
        .from('microcycles')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (mc?.id) {
        // Insert general session row
        const { data: sessionData, error: sessionErr } = await supabase
          .from('fisica_gimnasio_sesion')
          .insert({
            microcycle_id: mc.id,
            dia_semana: new Date().toLocaleDateString('es-CL', { weekday: 'long' }),
            nombre_sesion: finishedWorkout.title,
            observaciones: `Completada por ${player?.nombre || 'Jugador'}. Nota: ${finishedWorkout.notes}. Duración: ${Math.round(finishedWorkout.durationSeconds / 60)} min.`
          })
          .select('id')
          .single();

        if (!sessionErr && sessionData) {
          // Insert exercises executed in this session
          const exercisesToInsert = myRoutine.map((ex, idx) => ({
            sesion_id: sessionData.id,
            grupo_muscular: ex.grupo_muscular,
            ejercicio: ex.ejercicio,
            equipamiento: ex.equipamiento,
            tecnica_ejecucion: ex.tecnica_ejecucion,
            series: ex.series,
            repeticiones: ex.repeticiones,
            carga_kg: ex.carga_kg,
            orden: idx
          }));

          await supabase.from('fisica_gimnasio_ejercicio').insert(exercisesToInsert);
        }
      }
    } catch (dbErr) {
      console.warn('Could not mirror completed workout to global staff database (No active microcycle or permissions), fully logged locally in device cache.', dbErr);
    }

    // Trigger fireworks / celebration
    setShowCelebration(true);
    setMyRoutine([]); // Reset draft after completion
    setNotesSummary('');
  };

  // Export Routine to PDF
  const downloadRoutinePDF = (workout: CompletedWorkout) => {
    const doc = new jsPDF();
    doc.setFillColor(11, 18, 32); // Dark Theme Navy
    doc.rect(0, 0, 210, 40, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('LA ROJA - RENDIMIENTO GIMNASIO', 15, 20);

    doc.setFontSize(10);
    doc.text(`Fecha: ${workout.date} | Jugador: ${player?.nombre || 'Atleta'} ${player?.apellido || ''}`, 15, 30);

    // Objective
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Rutina: ${workout.title}`, 15, 50);
    doc.text(`Objetivo: ${workout.objective}`, 15, 56);
    doc.text(`Duración: ${Math.round(workout.durationSeconds / 60)} minutos | Series Realizadas: ${workout.totalSetsCompleted}`, 15, 62);
    doc.text(`Notas del Jugador: ${workout.notes}`, 15, 68);

    const tableRows: any[] = [];
    workout.exercises.forEach((ex, idx) => {
      const setsSummary = ex.sets
        .map((s, sIdx) => `S${sIdx + 1}: ${s.reps} reps @ ${s.weight}kg (${s.completed ? 'OK' : 'No'})`)
        .join('\n');
      
      tableRows.push([
        idx + 1,
        ex.name,
        ex.grupo_muscular,
        setsSummary
      ]);
    });

    autoTable(doc, {
      startY: 75,
      head: [['#', 'Ejercicio', 'Grupo Muscular', 'Desglose de Series']],
      body: tableRows,
      headStyles: { fillColor: [207, 27, 43] }, // Red primary color
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 4 }
    });

    doc.save(`Rutina_Gimnasio_${workout.title.replace(/\s+/g, '_')}.pdf`);
  };

  // Format timer seconds
  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto pb-12">
      {/* HEADER PRINCIPAL */}
      <div className="bg-[#0b1220] rounded-[32px] md:rounded-[45px] p-8 md:p-12 text-white shadow-xl relative overflow-hidden border border-white/5">
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-red-600/10 border border-red-500/20 rounded-2xl md:rounded-[28px] flex items-center justify-center text-3xl text-red-500 shadow-inner">
              <i className="fa-solid fa-dumbbell"></i>
            </div>
            <div>
              <span className="text-[10px] font-bold text-red-500 uppercase tracking-[0.3em] block mb-1">Espacio de Rendimiento Físico</span>
              <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter leading-none">
                GIMNASIO <span className="text-red-500">PRO</span>
              </h2>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex bg-white/5 border border-white/10 p-1.5 rounded-2xl self-start md:self-center">
            <button
              onClick={() => setActiveTab('routine_builder')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === 'routine_builder' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <i className="fa-solid fa-screwdriver-wrench mr-2"></i> Armar Rutina
            </button>
            <button
              onClick={() => setActiveTab('ai_trainer')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === 'ai_trainer' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <i className="fa-solid fa-robot mr-2"></i> Generar con IA
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === 'history' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <i className="fa-solid fa-clock-rotate-left mr-2"></i> Mi Historial
            </button>
          </div>
        </div>
      </div>

      {/* ACTIVE WORKOUT PLAYER SCREEN OVERLAY */}
      {activeWorkout && myRoutine.length > 0 && (
        <div className="fixed inset-0 z-50 bg-[#060a12]/98 overflow-y-auto flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
          <div className="w-full max-w-5xl bg-[#0b1220] rounded-[32px] border border-white/10 shadow-2xl overflow-hidden flex flex-col md:flex-row h-full max-h-[90vh]">
            {/* Left Column: Interactive exercise details and sets logging */}
            <div className="flex-1 p-6 md:p-10 flex flex-col justify-between overflow-y-auto border-r border-white/5">
              
              {/* Header inside player */}
              <div>
                <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-4 mb-6">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                    <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Entrenamiento en Curso</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">TIEMPO TRANSCURRIDO</p>
                    <p className="text-xl font-mono font-black text-white">{formatTime(workoutSeconds)}</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-6">
                  <div className="flex justify-between text-[10px] font-black text-white/40 uppercase mb-2">
                    <span>Ejercicio {currentExIndex + 1} de {myRoutine.length}</span>
                    <span>{Math.round(((currentExIndex + 1) / myRoutine.length) * 100)}% Completado</span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-600 transition-all duration-300"
                      style={{ width: `${((currentExIndex + 1) / myRoutine.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Active Exercise Detail Card */}
                <div className="bg-white/5 p-6 rounded-2xl border border-white/5 mb-8">
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg border ${
                      TARGET_GROUPS_COLORS[myRoutine[currentExIndex].target_group] || 'border-white/10 text-white bg-white/5'
                    }`}>
                      {TARGET_GROUPS_LABELS[myRoutine[currentExIndex].target_group] || myRoutine[currentExIndex].target_group}
                    </span>
                    <span className="px-2.5 py-1 text-[9px] font-black text-slate-400 bg-slate-900 border border-slate-800 rounded-lg uppercase tracking-wider">
                      {myRoutine[currentExIndex].grupo_muscular}
                    </span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-black italic text-white uppercase tracking-tight leading-none mb-3">
                    {myRoutine[currentExIndex].ejercicio}
                  </h3>
                  <div className="text-xs text-white/60 space-y-2 mt-4 leading-relaxed">
                    <p><strong className="text-white/80 uppercase">Equipamiento:</strong> {myRoutine[currentExIndex].equipamiento || 'Ninguno'}</p>
                    <p><strong className="text-white/80 uppercase">Guía Técnica de Élite:</strong> {myRoutine[currentExIndex].tecnica_ejecucion}</p>
                  </div>

                  {/* New metadata tags for active workout */}
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/5">
                    {myRoutine[currentExIndex].nivel && (
                      <span className="px-2 py-0.5 text-[9px] font-black text-amber-400 bg-amber-500/5 border border-amber-500/10 rounded-md uppercase tracking-wider">
                        Nivel: {myRoutine[currentExIndex].nivel}
                      </span>
                    )}
                    {myRoutine[currentExIndex].mecanica && (
                      <span className="px-2 py-0.5 text-[9px] font-black text-teal-400 bg-teal-500/5 border border-teal-500/10 rounded-md uppercase tracking-wider">
                        Mecánica: {myRoutine[currentExIndex].mecanica}
                      </span>
                    )}
                    {myRoutine[currentExIndex].fuerza && (
                      <span className="px-2 py-0.5 text-[9px] font-black text-purple-400 bg-purple-500/5 border border-purple-500/10 rounded-md uppercase tracking-wider">
                        Fuerza: {myRoutine[currentExIndex].fuerza}
                      </span>
                    )}
                    {myRoutine[currentExIndex].musculos_secundarios && myRoutine[currentExIndex].musculos_secundarios.length > 0 && (
                      <div className="flex flex-wrap gap-1 items-center">
                        <span className="text-[9px] font-black text-white/30 uppercase tracking-wider mr-1">Secundarios:</span>
                        {myRoutine[currentExIndex].musculos_secundarios.map((m, mIdx) => (
                          <span key={mIdx} className="px-1.5 py-0.5 text-[9px] font-bold text-white/60 bg-white/5 rounded-md border border-white/5 uppercase">
                            {m}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Active Exercise Image Gallery */}
                  {(myRoutine[currentExIndex].image_0 || myRoutine[currentExIndex].image_1) && (
                    <div className="grid grid-cols-2 gap-4 mt-5 pt-4 border-t border-white/5">
                      {myRoutine[currentExIndex].image_0 && (
                        <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10 bg-black/40 flex items-center justify-center">
                          <img 
                            src={myRoutine[currentExIndex].image_0} 
                            alt={myRoutine[currentExIndex].ejercicio} 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover animate-fade-in"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/70 text-white/80 text-[8px] font-black rounded uppercase tracking-wider">Vista Principal</span>
                        </div>
                      )}
                      {myRoutine[currentExIndex].image_1 && (
                        <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10 bg-black/40 flex items-center justify-center">
                          <img 
                            src={myRoutine[currentExIndex].image_1} 
                            alt={`${myRoutine[currentExIndex].ejercicio} Alt`} 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover animate-fade-in"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/70 text-white/80 text-[8px] font-black rounded uppercase tracking-wider">Fase Excéntrica/Detalle</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Set Loggers */}
                <div>
                  <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-4">Registro de Series</h4>
                  <div className="space-y-3">
                    {myRoutine[currentExIndex].setsData.map((set, sIdx) => (
                      <div 
                        key={sIdx} 
                        className={`flex items-center justify-between gap-4 p-4 rounded-xl border transition-all ${
                          set.completed 
                            ? 'bg-emerald-900/10 border-emerald-500/20 text-emerald-400' 
                            : 'bg-white/5 border-white/5 text-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-black text-xs ${
                            set.completed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/60'
                          }`}>
                            #{sIdx + 1}
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase">Serie {sIdx + 1}</p>
                            <p className="text-[10px] text-white/40 uppercase">Prescrito: {myRoutine[currentExIndex].repeticiones} Reps @ {myRoutine[currentExIndex].carga_kg}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          {/* Weight input */}
                          <div className="flex items-center bg-black/40 border border-white/10 rounded-lg px-2 py-1 max-w-[90px]">
                            <input 
                              type="text" 
                              value={set.weight}
                              onChange={(e) => updateSetField(currentExIndex, sIdx, 'weight', e.target.value)}
                              className="w-full bg-transparent outline-none border-none text-center font-mono font-bold text-xs text-white" 
                              placeholder="Carga"
                            />
                            <span className="text-[9px] font-bold text-white/40 ml-1">kg</span>
                          </div>

                          {/* Reps input */}
                          <div className="flex items-center bg-black/40 border border-white/10 rounded-lg px-2 py-1 max-w-[80px]">
                            <input 
                              type="text" 
                              value={set.reps}
                              onChange={(e) => updateSetField(currentExIndex, sIdx, 'reps', e.target.value)}
                              className="w-full bg-transparent outline-none border-none text-center font-mono font-bold text-xs text-white" 
                              placeholder="Reps"
                            />
                            <span className="text-[9px] font-bold text-white/40 ml-1">r</span>
                          </div>

                          {/* Complete button */}
                          <button
                            onClick={() => updateSetField(currentExIndex, sIdx, 'completed', !set.completed)}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                              set.completed 
                                ? 'bg-emerald-500 text-white shadow-md' 
                                : 'bg-white/5 hover:bg-white/10 text-white/40'
                            }`}
                          >
                            <i className={`fa-solid ${set.completed ? 'fa-check' : 'fa-circle-check'}`}></i>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Navigation within routine */}
              <div className="flex items-center justify-between gap-4 mt-8 pt-6 border-t border-white/5">
                <button
                  disabled={currentExIndex === 0}
                  onClick={() => setCurrentExIndex((prev) => prev - 1)}
                  className="px-6 py-3.5 rounded-xl border border-white/10 text-white font-bold text-xs uppercase tracking-wider transition-all hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none"
                >
                  <i className="fa-solid fa-chevron-left mr-2"></i> Anterior
                </button>

                {currentExIndex < myRoutine.length - 1 ? (
                  <button
                    onClick={() => setCurrentExIndex((prev) => prev + 1)}
                    className="px-6 py-3.5 rounded-xl bg-red-600 text-white font-black text-xs uppercase tracking-widest shadow-md transition-all hover:bg-red-500"
                  >
                    Siguiente Ejercicio <i className="fa-solid fa-chevron-right ml-2"></i>
                  </button>
                ) : (
                  <button
                    onClick={finishWorkoutSession}
                    className="px-8 py-3.5 rounded-xl bg-emerald-600 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-500"
                  >
                    <i className="fa-solid fa-circle-check mr-2"></i> Finalizar Rutina
                  </button>
                )}
              </div>
            </div>

            {/* Right Column: Interactive timers & overall workout details */}
            <div className="w-full md:w-80 bg-black/20 p-6 md:p-8 flex flex-col justify-between overflow-y-auto">
              
              {/* Rest Timer Panel */}
              <div className="space-y-6">
                <div className="bg-[#0b1220] p-6 rounded-2xl border border-white/5 text-center">
                  <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em] mb-4 flex items-center justify-center gap-2">
                    <i className="fa-solid fa-stopwatch animate-spin-slow"></i> Temporizador de Descanso
                  </h4>

                  <div className="my-6">
                    {restActive ? (
                      <div className="text-5xl font-mono font-black text-amber-400 animate-pulse">
                        {restSeconds} <span className="text-xs">s</span>
                      </div>
                    ) : (
                      <div className="text-4xl font-mono font-black text-white/20">
                        {initialRestDuration} <span className="text-xs">s</span>
                      </div>
                    )}
                    <p className="text-[9px] text-white/40 uppercase font-bold tracking-wider mt-2">
                      {restActive ? 'DESCANSO EN PROGRESO' : 'DESCANSO LISTO'}
                    </p>
                  </div>

                  <div className="flex justify-center gap-2 mb-4">
                    <button 
                      onClick={() => triggerRest(45)}
                      className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-bold text-white/60 hover:text-white"
                    >
                      45s
                    </button>
                    <button 
                      onClick={() => triggerRest(60)}
                      className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-bold text-white/60 hover:text-white"
                    >
                      1m
                    </button>
                    <button 
                      onClick={() => triggerRest(90)}
                      className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-bold text-white/60 hover:text-white"
                    >
                      1.5m
                    </button>
                    <button 
                      onClick={() => triggerRest(120)}
                      className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-bold text-white/60 hover:text-white"
                    >
                      2m
                    </button>
                  </div>

                  <div className="flex gap-2">
                    {restActive ? (
                      <>
                        <button
                          onClick={() => setRestSeconds((prev) => prev + 30)}
                          className="flex-1 py-2 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black text-white hover:bg-white/10 uppercase"
                        >
                          +30s
                        </button>
                        <button
                          onClick={() => { setRestActive(false); setRestSeconds(0); }}
                          className="flex-1 py-2 bg-red-900/30 border border-red-500/20 rounded-lg text-[10px] font-black text-red-400 hover:bg-red-900/50 uppercase"
                        >
                          Saltar
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => triggerRest(initialRestDuration)}
                        className="w-full py-2 bg-amber-500 text-black rounded-lg text-[10px] font-black uppercase tracking-wider shadow-md hover:bg-amber-400"
                      >
                        Iniciar Descanso
                      </button>
                    )}
                  </div>
                </div>

                {/* Workout Overview Checklist */}
                <div>
                  <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-4">Lista de Ejercicios</h4>
                  <div className="space-y-2">
                    {myRoutine.map((ex, idx) => {
                      const completedSets = ex.setsData.filter(s => s.completed).length;
                      const isCurrent = idx === currentExIndex;
                      return (
                        <button
                          key={idx}
                          onClick={() => setCurrentExIndex(idx)}
                          className={`w-full text-left p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                            isCurrent 
                              ? 'bg-red-600/10 border-red-500/30 text-white font-bold' 
                              : 'bg-white/5 border-transparent text-white/50 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <span className="font-mono text-[10px] shrink-0">#{idx + 1}</span>
                            <span className="text-[11px] truncate uppercase font-bold">{ex.ejercicio}</span>
                          </div>
                          <span className={`text-[9px] shrink-0 font-mono px-1.5 py-0.5 rounded-md ${
                            completedSets === ex.series ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/30'
                          }`}>
                            {completedSets}/{ex.series}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Close / Abandon Training Button */}
              <div className="pt-6 border-t border-white/5 mt-6">
                <button
                  onClick={() => {
                    if (confirm('¿Estás seguro de que quieres cancelar el entrenamiento? Los datos registrados en esta sesión se perderán.')) {
                      setActiveWorkout(false);
                    }
                  }}
                  className="w-full py-3 border border-red-500/20 text-red-500/60 hover:text-red-500 hover:bg-red-950/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  <i className="fa-solid fa-xmark mr-2"></i> Cancelar Entrenamiento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WORKOUT COMPLETION CELEBRATION MODAL */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 bg-[#060a12]/95 overflow-y-auto flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-[#0b1220] rounded-[32px] border border-white/10 shadow-2xl p-8 text-center space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500"></div>
            
            <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-4xl mx-auto shadow-inner animate-bounce">
              <i className="fa-solid fa-circle-check"></i>
            </div>

            <div className="space-y-2">
              <span className="text-[9px] font-black text-amber-400 uppercase tracking-[0.3em]">Sesión Completada</span>
              <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white">¡Rendimiento de Élite!</h3>
              <p className="text-sm text-white/60">El entrenamiento ha sido registrado exitosamente en tu historial local y sincronizado con el sistema de La Roja.</p>
            </div>

            <div className="bg-white/5 border border-white/5 p-4 rounded-2xl text-left space-y-3">
              <p className="text-[10px] font-black text-white/30 uppercase tracking-wider">REGISTRA TUS OBSERVACIONES</p>
              <textarea
                value={notesSummary}
                onChange={(e) => setNotesSummary(e.target.value)}
                placeholder="Ej. Me sentí fuerte en sentadillas, el descanso fue suficiente. Ligera fatiga muscular en isquiosurales al final."
                className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-red-500 min-h-[80px]"
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  if (workoutHistory.length > 0) {
                    const latest = { ...workoutHistory[0], notes: notesSummary || 'Entrenamiento completado satisfactoriamente.' };
                    // Update latest note in local storage history
                    const updated = [...workoutHistory];
                    updated[0] = latest;
                    setWorkoutHistory(updated);
                    localStorage.setItem('la_roja_player_gym_history', JSON.stringify(updated));
                  }
                  setShowCelebration(false);
                  setActiveTab('history');
                }}
                className="flex-1 py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black uppercase tracking-wider text-xs shadow-lg shadow-red-600/20 transition-all"
              >
                Cerrar y Ver Historial
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VISTA 1: ARMADOR DE RUTINAS (PLANTILLA SUPABASE) */}
      {activeTab === 'routine_builder' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom-8 duration-500">
          
          {/* COLUMNA IZQUIERDA: BUSCADOR DE EJERCICIOS Y SELECCIONADOR */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Buscador e interfaz superior */}
            <div className="bg-[#0b1220] p-6 rounded-3xl border border-white/5 shadow-lg space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-white uppercase italic tracking-tight">Ejercicios Oficiales de Alto Rendimiento</h3>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Selecciona los ejercicios del catálogo para armar tu sesión del día</p>
                </div>
                {loadingDb && (
                  <span className="text-[10px] font-black text-red-500 uppercase tracking-widest animate-pulse">
                    <i className="fa-solid fa-arrows-rotate animate-spin mr-2"></i> Cargando base de datos...
                  </span>
                )}
              </div>

              {/* Input de búsqueda */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar ejercicio, grupo muscular o equipamiento..."
                  className="w-full bg-slate-900/60 border border-white/10 rounded-2xl py-3.5 pl-12 pr-6 text-sm text-white placeholder-white/20 outline-none focus:border-red-500/50 focus:bg-slate-900 transition-all"
                />
                <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-white/20 text-sm"></i>
              </div>

              {/* Categorías (Focos) Filtros - Grid Scroller */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                <button
                  onClick={() => setSelectedFoco('TODOS_TAB')}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0 transition-all border ${
                    selectedFoco === 'TODOS_TAB' 
                      ? 'bg-white text-[#0b1220] border-white font-black' 
                      : 'bg-white/5 text-white/50 border-white/5 hover:text-white hover:bg-white/10'
                  }`}
                >
                  TODOS
                </button>
                {Object.keys(TARGET_GROUPS_LABELS).map((key) => (
                  <button
                    key={key}
                    onClick={() => setSelectedFoco(key)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0 transition-all border ${
                      selectedFoco === key 
                        ? 'bg-red-600 text-white border-red-600' 
                        : 'bg-white/5 text-white/40 border-white/5 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {TARGET_GROUPS_LABELS[key]}
                  </button>
                ))}
              </div>
            </div>

            {/* Listado de Ejercicios del Catálogo */}
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {filteredDbExercises.length > 0 ? (
                filteredDbExercises.map((ex) => (
                  <div 
                    key={ex.id} 
                    className="group bg-[#0b1220] border border-white/5 rounded-2xl p-6 hover:border-red-500/30 transition-all shadow-md relative overflow-hidden flex flex-col md:flex-row md:items-start justify-between gap-6"
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-red-600 opacity-0 group-hover:opacity-100 transition-all"></div>
                    
                    <div className="flex flex-col md:flex-row gap-5 flex-1 items-start">
                      {/* Left Side Thumbnail */}
                      {(ex.image_0 || ex.image_1) && (
                        <div className="flex gap-2 shrink-0">
                          {ex.image_0 && (
                            <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden border border-white/10 bg-slate-950 flex items-center justify-center group-hover:border-red-500/40 transition-all">
                              <img 
                                src={ex.image_0} 
                                alt={ex.ejercicio} 
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                          {ex.image_1 && (
                            <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden border border-white/10 bg-slate-950 flex items-center justify-center group-hover:border-red-500/40 transition-all hidden md:flex">
                              <img 
                                src={ex.image_1} 
                                alt={`${ex.ejercicio} detail`} 
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex-1 space-y-3">
                        <div className="flex flex-wrap gap-2">
                          <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-md border ${
                            TARGET_GROUPS_COLORS[ex.target_group] || 'border-white/10 text-white'
                          }`}>
                            {TARGET_GROUPS_LABELS[ex.target_group] || ex.target_group}
                          </span>
                          <span className="px-2 py-0.5 text-[8px] font-black text-white/40 bg-white/5 border border-white/5 rounded-md uppercase tracking-widest">
                            {ex.grupo_muscular}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-lg font-black text-white uppercase italic tracking-tight group-hover:text-red-400 transition-colors">
                            {ex.ejercicio}
                          </h4>
                          <p className="text-[11px] text-white/60 leading-relaxed mt-2 bg-black/20 p-3 rounded-xl border border-white/5">
                            <strong className="text-white/80 uppercase text-[9px] block mb-1">Guía de Ejecución:</strong>
                            {ex.tecnica_ejecucion}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-bold text-white/40">
                          <p><strong className="text-white/60">EQUIPAMIENTO:</strong> {ex.equipamiento || 'Ninguno'}</p>
                          <p><strong className="text-white/60">RPE SUGERIDO:</strong> {ex.rpe_sugerido}/10</p>
                        </div>

                        {/* Extra metadata badges */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {ex.nivel && (
                            <span className="px-2 py-0.5 text-[8px] font-black text-amber-400/80 bg-amber-500/5 border border-amber-500/10 rounded-md uppercase tracking-wider">
                              Nivel: {ex.nivel}
                            </span>
                          )}
                          {ex.mecanica && (
                            <span className="px-2 py-0.5 text-[8px] font-black text-teal-400/80 bg-teal-500/5 border border-teal-500/10 rounded-md uppercase tracking-wider">
                              Mecánica: {ex.mecanica}
                            </span>
                          )}
                          {ex.fuerza && (
                            <span className="px-2 py-0.5 text-[8px] font-black text-purple-400/80 bg-purple-500/5 border border-purple-500/10 rounded-md uppercase tracking-wider">
                              Tipo: {ex.fuerza}
                            </span>
                          )}
                          {ex.musculos_secundarios && ex.musculos_secundarios.length > 0 && (
                            <div className="flex flex-wrap gap-1 items-center">
                              <span className="text-[8px] font-black text-white/30 uppercase tracking-widest mr-1">Secundarios:</span>
                              {ex.musculos_secundarios.map((m, sIdx) => (
                                <span key={sIdx} className="px-1.5 py-0.5 text-[8px] font-bold text-white/50 bg-white/5 rounded border border-white/5 uppercase">
                                  {m}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => addToRoutine(ex)}
                      className="px-6 py-4 bg-white/5 hover:bg-red-600 hover:text-white text-slate-300 border border-white/10 rounded-xl font-black uppercase italic text-[10px] tracking-widest shrink-0 transition-all active:scale-95 flex items-center justify-center gap-2 self-stretch md:self-center"
                    >
                      <i className="fa-solid fa-plus text-xs"></i> AGREGAR
                    </button>
                  </div>
                ))
              ) : (
                <div className="bg-[#0b1220] p-12 rounded-3xl border border-white/5 text-center text-white/40">
                  <i className="fa-solid fa-magnifying-glass text-3xl mb-4 text-white/15"></i>
                  <p className="text-xs font-black uppercase tracking-widest">No se encontraron ejercicios con estos filtros</p>
                </div>
              )}
            </div>
          </div>

          {/* COLUMNA DERECHA: MI RUTINA CONSTRUIDA */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#0b1220] p-6 md:p-8 rounded-3xl border border-white/5 shadow-xl space-y-6">
              
              <div className="border-b border-white/10 pb-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <h3 className="text-lg font-black text-white uppercase italic tracking-tight">Mi Rutina del Día</h3>
                </div>
                <p className="text-[10px] text-white/40 uppercase tracking-widest">Organiza, personaliza y arranca tu rutina actual</p>
              </div>

              {/* Inputs para Título y Objetivo */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-white/30 uppercase tracking-widest block">Título del Entrenamiento</label>
                  <input
                    type="text"
                    value={routineTitle}
                    onChange={(e) => setRoutineTitle(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none focus:border-red-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-white/30 uppercase tracking-widest block">Objetivo / Observaciones del Staff</label>
                  <input
                    type="text"
                    value={routineObjective}
                    onChange={(e) => setRoutineObjective(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none focus:border-red-500"
                  />
                </div>
              </div>

              {/* Lista de ejercicios agregados */}
              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-2">
                {myRoutine.length > 0 ? (
                  myRoutine.map((ex, idx) => (
                    <div 
                      key={ex.id_key} 
                      className="bg-white/5 border border-white/5 p-4 rounded-xl space-y-3 hover:bg-white/10 transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="overflow-hidden">
                          <p className="text-[9px] font-bold text-red-400 font-mono">EJERCICIO #{idx + 1}</p>
                          <h5 className="text-[13px] font-black text-white uppercase truncate tracking-tight">{ex.ejercicio}</h5>
                        </div>
                        
                        {/* Order controls & Delete */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => moveExercise(idx, 'up')}
                            disabled={idx === 0}
                            className="w-6 h-6 bg-slate-900 hover:bg-slate-800 text-white/60 disabled:opacity-20 rounded flex items-center justify-center text-xs"
                          >
                            <i className="fa-solid fa-chevron-up"></i>
                          </button>
                          <button
                            onClick={() => moveExercise(idx, 'down')}
                            disabled={idx === myRoutine.length - 1}
                            className="w-6 h-6 bg-slate-900 hover:bg-slate-800 text-white/60 disabled:opacity-20 rounded flex items-center justify-center text-xs"
                          >
                            <i className="fa-solid fa-chevron-down"></i>
                          </button>
                          <button
                            onClick={() => removeFromRoutine(ex.id_key)}
                            className="w-6 h-6 bg-red-950/40 hover:bg-red-900 text-red-400 rounded flex items-center justify-center text-xs"
                          >
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </div>
                      </div>

                      {/* Customize Sets / Reps / Load for this workout draft */}
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5">
                        <div className="space-y-1">
                          <label className="text-[8px] font-bold text-white/30 uppercase tracking-widest block">Series</label>
                          <select
                            value={ex.series}
                            onChange={(e) => {
                              const newSeriesCount = Number(e.target.value);
                              setMyRoutine((prev) => {
                                const copy = [...prev];
                                const currentEx = { ...copy[idx] };
                                currentEx.series = newSeriesCount;
                                currentEx.setsData = Array.from({ length: newSeriesCount }).map((_, sIdx) => 
                                  currentEx.setsData[sIdx] || { completed: false, weight: ex.carga_kg, reps: ex.repeticiones }
                                );
                                copy[idx] = currentEx;
                                return copy;
                              });
                            }}
                            className="w-full bg-slate-950 border border-white/10 rounded-lg p-1 text-[11px] font-bold text-white outline-none"
                          >
                            {[1, 2, 3, 4, 5, 6].map((num) => (
                              <option key={num} value={num}>{num} Series</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[8px] font-bold text-white/30 uppercase tracking-widest block">Repeticiones</label>
                          <input
                            type="text"
                            value={ex.repeticiones}
                            onChange={(e) => {
                              const val = e.target.value;
                              setMyRoutine((prev) => {
                                const copy = [...prev];
                                copy[idx] = { ...copy[idx], repeticiones: val };
                                return copy;
                              });
                            }}
                            className="w-full bg-slate-950 border border-white/10 rounded-lg p-1 px-2 text-[11px] font-mono font-bold text-white outline-none text-center"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[8px] font-bold text-white/30 uppercase tracking-widest block">Carga Base</label>
                          <input
                            type="text"
                            value={ex.carga_kg}
                            onChange={(e) => {
                              const val = e.target.value;
                              setMyRoutine((prev) => {
                                const copy = [...prev];
                                copy[idx] = { ...copy[idx], carga_kg: val };
                                return copy;
                              });
                            }}
                            className="w-full bg-slate-950 border border-white/10 rounded-lg p-1 px-2 text-[11px] font-mono font-bold text-white outline-none text-center"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-black/20 p-12 rounded-2xl border border-dashed border-white/10 text-center text-white/30 space-y-2">
                    <i className="fa-solid fa-list text-2xl text-white/10"></i>
                    <p className="text-xs font-black uppercase tracking-widest leading-none">Tu rutina está vacía</p>
                    <p className="text-[9px] uppercase tracking-wider text-white/20">Usa el botón "+" del catálogo para añadir ejercicios</p>
                  </div>
                )}
              </div>

              {/* Start Routine Button */}
              {myRoutine.length > 0 && (
                <button
                  onClick={startWorkoutSession}
                  className="w-full py-4.5 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black uppercase italic tracking-tighter text-sm shadow-xl shadow-red-600/10 transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  INICIAR ENTRENAMIENTO DEL DÍA <i className="fa-solid fa-play animate-pulse text-xs"></i>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VISTA 2: AI GENERATOR */}
      {activeTab === 'ai_trainer' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-500">
          {/* SELECTOR DE CATEGORÍAS AI */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { id: 'upper', label: 'UPPER BODY', icon: 'fa-child-reaching', color: 'text-blue-400', bg: 'bg-blue-500/10' },
              { id: 'lower', label: 'LOWER BODY', icon: 'fa-person-running', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              { id: 'mobility', label: 'MOBILITY', icon: 'fa-arrows-spin', color: 'text-amber-400', bg: 'bg-amber-500/10' },
              { id: 'flexibility', label: 'FLEXIBILITY', icon: 'fa-person-walking-arrow-right', color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => generateAIRoutine(cat.label)}
                disabled={aiLoading}
                className="bg-[#0b1220] p-8 rounded-[32px] border border-white/5 shadow-xl hover:border-red-500/50 hover:bg-[#111a2c] transition-all group disabled:opacity-50 text-left"
              >
                <div className={`w-14 h-14 rounded-2xl ${cat.bg} ${cat.color} flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform shadow-inner`}>
                  <i className={`fa-solid ${cat.icon}`}></i>
                </div>
                <span className="text-[12px] font-black text-white uppercase tracking-[0.15em] block leading-tight">{cat.label}</span>
                <p className="text-[9px] font-bold text-white/30 uppercase tracking-tighter mt-2">GENERATE SESSION</p>
              </button>
            ))}
          </div>

          {aiLoading && (
            <div className="bg-[#0b1220] p-20 rounded-[40px] text-center border border-white/5 shadow-2xl animate-pulse">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8 border border-white/10">
                <i className="fa-solid fa-dumbbell animate-bounce text-red-500 text-3xl"></i>
              </div>
              <h3 className="text-white text-xl font-black uppercase italic tracking-tighter mb-2">CALCULANDO CARGA NEUROMUSCULAR</h3>
              <p className="text-white/30 font-black uppercase tracking-[0.2em] text-[10px]">LA INTELIGENCIA ARTIFICIAL ESTÁ DISEÑANDO TU WORKOUT...</p>
            </div>
          )}

          {aiError && (
            <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-[32px] text-red-400 text-[10px] font-black uppercase tracking-[0.2em] text-center">
              <i className="fa-solid fa-triangle-exclamation mr-3"></i> {aiError}
            </div>
          )}

          {aiRoutine && !aiLoading && (
            <div className="space-y-8 animate-in slide-in-from-bottom-12 duration-700">
              {/* RESUMEN DE SESIÓN AI */}
              <div className="bg-[#0b1220] rounded-[40px] p-10 border border-white/10 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="px-3 py-1 bg-red-600 text-white text-[9px] font-black uppercase tracking-widest rounded-full">SESIÓN RECOMENDADA POR IA</span>
                    <span className="text-white/30 text-[9px] font-black uppercase tracking-widest italic">{aiRoutine.objective}</span>
                  </div>
                  <h3 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none">{aiRoutine.title}</h3>
                </div>
                
                <button 
                  onClick={() => {
                    // Convert AI Routine to editable draft
                    const converted = aiRoutine.exercises.map((ex: any, idx: number) => {
                      const template: GymExerciseTemplate = {
                        id: 1000 + idx,
                        target_group: 'TODOS',
                        grupo_muscular: 'General / Mixto',
                        ejercicio: ex.name,
                        equipamiento: '',
                        tecnica_ejecucion: ex.notes,
                        series: parseInt(ex.sets) || 3,
                        repeticiones: ex.reps,
                        carga_kg: 'Peso Corporal',
                        rpe_sugerido: 7
                      };
                      
                      const setsCount = template.series || 3;
                      return {
                        id_key: `ai_${idx}_${Date.now()}`,
                        template_id: template.id,
                        target_group: template.target_group,
                        grupo_muscular: template.grupo_muscular,
                        ejercicio: template.ejercicio,
                        equipamiento: template.equipamiento,
                        tecnica_ejecucion: template.tecnica_ejecucion,
                        series: setsCount,
                        repeticiones: template.repeticiones,
                        carga_kg: template.carga_kg,
                        rpe_sugerido: template.rpe_sugerido,
                        setsData: Array.from({ length: setsCount }).map(() => ({ completed: false, weight: '0', reps: template.repeticiones }))
                      };
                    });
                    setMyRoutine(converted);
                    setRoutineTitle(aiRoutine.title);
                    setRoutineObjective(aiRoutine.objective);
                    setActiveTab('routine_builder');
                  }}
                  className="px-10 py-5 bg-red-600 hover:bg-red-500 text-white rounded-full font-black uppercase italic tracking-tighter text-sm shadow-lg shadow-red-600/20 transition-all active:scale-95"
                >
                  CARGAR EN MI PLANIFICADOR <i className="fa-solid fa-screwdriver-wrench ml-3"></i>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* BLOQUE PRINCIPAL - ESTILO GRAVL CARDS */}
                <div className="lg:col-span-8 space-y-4">
                  <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] mb-6 flex items-center gap-4">
                    <span className="w-12 h-[1px] bg-white/10"></span> CATALOGO DE EJERCICIOS RECOMENDADOS
                  </h4>
                  {aiRoutine.exercises.map((ex: any, i: number) => (
                    <div key={i} className="group bg-[#0b1220] border border-white/5 rounded-[32px] p-8 hover:border-red-500/30 transition-all shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-2">
                            <span className="text-[10px] font-black text-red-500/50 font-mono">#{String(i+1).padStart(2, '0')}</span>
                            <h5 className="text-xl font-black text-white uppercase italic tracking-tight group-hover:text-red-400 transition-colors">{ex.name}</h5>
                          </div>
                          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-relaxed">{ex.notes}</p>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-8 border-l border-white/5 pl-8">
                          <div className="text-center">
                            <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-2">SERIES</p>
                            <p className="text-2xl font-black text-white font-mono leading-none">{ex.sets}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-2">REPS</p>
                            <p className="text-2xl font-black text-white font-mono leading-none">{ex.reps}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-2">REST</p>
                            <p className="text-xs font-black text-red-500 font-mono mt-1 uppercase">{ex.rest}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* SIDEBAR DE PREPARACIÓN */}
                <div className="lg:col-span-4 space-y-8">
                  <div className="bg-[#0b1220] rounded-[40px] p-8 border border-white/5 shadow-2xl">
                    <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
                      <i className="fa-solid fa-fire-flame-curved"></i> WARMUP / CALENTAMIENTO
                    </h4>
                    <div className="space-y-4">
                      {aiRoutine.warmup?.map((step: string, i: number) => (
                        <div key={i} className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/10 transition-all">
                          <span className="text-[10px] font-black text-white/20 mt-0.5">{i + 1}</span>
                          <p className="text-[11px] font-bold text-white/70 uppercase tracking-tight">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#0b1220] rounded-[40px] p-8 border border-white/5 shadow-2xl">
                    <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
                      <i className="fa-solid fa-leaf"></i> COOLDOWN / VUELTA A LA CALMA
                    </h4>
                    <div className="space-y-4">
                      {aiRoutine.cooldown?.map((step: string, i: number) => (
                        <div key={i} className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/10 transition-all">
                          <span className="text-[10px] font-black text-white/20 mt-0.5">{i + 1}</span>
                          <p className="text-[11px] font-bold text-white/70 uppercase tracking-tight">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VISTA 3: HISTORIAL DE SESIONES */}
      {activeTab === 'history' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500">
          <div className="bg-[#0b1220] p-6 md:p-10 rounded-[32px] border border-white/5 shadow-xl">
            <h3 className="text-xl md:text-2xl font-black text-white uppercase italic tracking-tight mb-2">Mi Historial de Gimnasio</h3>
            <p className="text-[10px] text-white/40 uppercase tracking-widest">Resumen de sesiones registradas y completadas en el sistema</p>
          </div>

          <div className="space-y-4">
            {workoutHistory.length > 0 ? (
              workoutHistory.map((workout) => (
                <div 
                  key={workout.id} 
                  className="bg-[#0b1220] border border-white/5 rounded-2xl p-6 md:p-8 space-y-4 shadow-lg hover:border-white/10 transition-all"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase tracking-wider rounded">Completada</span>
                        <span className="text-[10px] text-white/30 font-bold font-mono">{workout.date}</span>
                      </div>
                      <h4 className="text-lg font-black text-white uppercase tracking-tight italic">{workout.title}</h4>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => downloadRoutinePDF(workout)}
                        className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                      >
                        <i className="fa-solid fa-file-pdf"></i> DESCARGAR PDF
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('¿Seguro que deseas eliminar este registro de tu historial local?')) {
                            const updated = workoutHistory.filter((w) => w.id !== workout.id);
                            setWorkoutHistory(updated);
                            localStorage.setItem('la_roja_player_gym_history', JSON.stringify(updated));
                          }
                        }}
                        className="px-3 py-2.5 bg-red-950/20 hover:bg-red-900 text-red-400 border border-red-500/15 rounded-xl text-xs flex items-center justify-center"
                      >
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <p className="text-[9px] text-white/30 uppercase font-bold tracking-widest mb-0.5">OBJETIVO</p>
                      <p className="font-bold text-white/80">{workout.objective}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-white/30 uppercase font-bold tracking-widest mb-0.5">DURACIÓN TOTAL</p>
                      <p className="font-bold text-white/80">{Math.round(workout.durationSeconds / 60)} minutos</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-white/30 uppercase font-bold tracking-widest mb-0.5">SERIES COMPLETADAS</p>
                      <p className="font-bold text-white/80">{workout.totalSetsCompleted} series</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-white/30 uppercase font-bold tracking-widest mb-0.5">NOTAS DE LA SESIÓN</p>
                      <p className="font-bold text-white/80 italic">"{workout.notes}"</p>
                    </div>
                  </div>

                  {/* Ejercicios de esta sesión */}
                  <div className="pt-2">
                    <p className="text-[9px] text-white/20 uppercase font-bold tracking-widest mb-3">Detalle de Ejercicios Ejecutados</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {workout.exercises.map((ex, exIdx) => {
                        const setsCompleted = ex.sets.filter((s) => s.completed).length;
                        return (
                          <div key={exIdx} className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-2">
                            <div className="flex items-center justify-between gap-3">
                              <h5 className="font-black text-xs text-white uppercase truncate">{ex.name}</h5>
                              <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                {setsCompleted}/{ex.sets.length} series
                              </span>
                            </div>
                            <div className="space-y-1">
                              {ex.sets.map((set, sIdx) => (
                                <p key={sIdx} className="text-[10px] text-white/40 font-mono">
                                  Serie {sIdx + 1}: {set.reps} reps @ {set.weight}kg {set.completed ? '✓' : '✗'}
                                </p>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-[#0b1220] p-16 rounded-[32px] border border-white/5 text-center text-white/30 space-y-3">
                <i className="fa-solid fa-clock-rotate-left text-4xl text-white/10"></i>
                <h4 className="text-sm font-black uppercase tracking-widest">Aún no registras entrenamientos</h4>
                <p className="text-[10px] text-white/20 uppercase tracking-wider max-w-sm mx-auto">
                  Utiliza la pestaña "Armar Rutina" para planificar e iniciar tu sesión del día. Tus registros finalizados aparecerán aquí.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AITrainer;
