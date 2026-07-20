import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { MicrocicloDB, Category, UserRole, REVERSE_CATEGORY_ID_MAP } from '../types'
import { GYM_EXERCISES_DATA, GymExerciseTemplate } from './gymExercisesData'
import { motion, AnimatePresence } from 'motion/react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface MicrocicloUI extends MicrocicloDB {
  id: number;
  micro_number?: number;
  nombre_display: string;
  session_count?: number;
}

interface GymExercise {
  id?: string | number;
  sesion_id?: string | number;
  grupo_muscular: string;
  ejercicio: string;
  equipamiento: string;
  tecnica_ejecucion: string;
  series: number;
  repeticiones: string;
  carga_kg: string;
  rpe_sugerido?: number;
  target_group?: string;
}

interface GymSession {
  id: string | number;
  microcycle_id: number;
  dia_semana: string;
  fecha_sesion?: string;
  nombre_sesion: string;
  observaciones?: string;
  ejercicios?: GymExercise[];
}

interface FisicaGimnasioAreaProps {
  clubs?: any[];
  userRole?: string;
  userClub?: string | null;
  userClubId?: number | null;
}

const DIAS_SEMANA = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo'
];

const TARGET_GROUPS_CONFIG = [
  { id: 'TODOS', label: 'TODOS / GENERAL', shortLabel: 'TODOS', colorClass: 'bg-slate-400' },
  { id: 'FUERZA_MAXIMA', label: 'FUERZA MÁXIMA', shortLabel: 'F. MÁXIMA', colorClass: 'bg-amber-500' },
  { id: 'FUERZA_EXPLOSIVA', label: 'FUERZA EXPLOSIVA (POTENCIA)', shortLabel: 'F. EXPLOSIVA', colorClass: 'bg-orange-500' },
  { id: 'PLIOMETRIA_INTENSIVA', label: 'PLIOMETRÍA INTENSIVA', shortLabel: 'PLIOM. INT.', colorClass: 'bg-rose-600' },
  { id: 'PLIOMETRIA_EXTENSIVA', label: 'PLIOMETRÍA EXTENSIVA', shortLabel: 'PLIOM. EXT.', colorClass: 'bg-emerald-600' },
  { id: 'SALTOS_CON_CARGA', label: 'SALTOS CON CARGA', shortLabel: 'S. CARGADOS', colorClass: 'bg-teal-600' },
  { id: 'DERIVADOS_HALTEROFILIA', label: 'DERIVADOS DE HALTEROFILIA', shortLabel: 'HALTEROFILIA', colorClass: 'bg-cyan-600' },
  { id: 'GENERALES_SUPERIOR', label: 'GENERALES DE SUPERIOR', shortLabel: 'T. SUPERIOR', colorClass: 'bg-indigo-600' },
  { id: 'GENERALES_INFERIOR', label: 'GENERALES DE INFERIOR', shortLabel: 'T. INFERIOR', colorClass: 'bg-blue-600' },
  { id: 'CORE_ZONA_MEDIA', label: 'CORE Y ZONA MEDIA', shortLabel: 'CORE / ZM', colorClass: 'bg-purple-600' },
  { id: 'ISQUIOSURALES_CADENA_POSTERIOR', label: 'ISQUIOSURALES / CADENA POSTERIOR EXCENT.', shortLabel: 'ISQUIOS/POST', colorClass: 'bg-fuchsia-600' }
];

const packGrupoMuscular = (grupoMuscular: string, targetGroup: string) => {
  if (!targetGroup || targetGroup === 'TODOS') return grupoMuscular;
  return `[${targetGroup}] ${grupoMuscular}`;
};

const unpackGrupoMuscular = (packed: string) => {
  if (!packed) return { targetGroup: 'TODOS', grupoMuscular: '' };
  
  const match = packed.match(/^\[([^\]]+)\]\s*(.*)$/);
  if (match) {
    return {
      targetGroup: match[1],
      grupoMuscular: match[2]
    };
  }
  return {
    targetGroup: 'TODOS',
    grupoMuscular: packed
  };
};

interface PredefinedExercise {
  target_group: string;
  grupo_muscular: string;
  ejercicio: string;
  equipamiento: string;
  tecnica_ejecucion: string;
  series: number;
  repeticiones: string;
  carga_kg: string;
  rpe_sugerido: number;
}

const PREDEFINED_FOCUS_EXERCISES: PredefinedExercise[] = [
  // FUERZA_MAXIMA
  {
    target_group: 'FUERZA_MAXIMA',
    grupo_muscular: 'Piernas / Cadena Posterior',
    ejercicio: 'Sentadilla trasera con barra baja (Back Squat)',
    equipamiento: 'Barra olímpica, Discos, Rack',
    tecnica_ejecucion: 'Apoyar la barra en los deltoides posteriores. Descender con control rompiendo el paralelo (fase excéntrica controlada), empujar verticalmente de forma sólida manteniendo el torso firme.',
    series: 4,
    repeticiones: '3-5',
    carga_kg: '80-85% 1RM',
    rpe_sugerido: 8
  },
  {
    target_group: 'FUERZA_MAXIMA',
    grupo_muscular: 'Cadena Posterior / Lumbar',
    ejercicio: 'Peso muerto convencional (Deadlift)',
    equipamiento: 'Barra olímpica, Discos',
    tecnica_ejecucion: 'Posición inicial con pies al ancho de cadera, agarre por fuera de las rodillas. Traccionar manteniendo barra pegada al cuerpo, empuje de piernas inicial y extensión simultánea de cadera.',
    series: 3,
    repeticiones: '3-5',
    carga_kg: '80-85% 1RM',
    rpe_sugerido: 9
  },
  {
    target_group: 'FUERZA_MAXIMA',
    grupo_muscular: 'Pectorales / Tríceps',
    ejercicio: 'Press de banca plano con barra',
    equipamiento: 'Barra, Banco plano, Discos',
    tecnica_ejecucion: 'Apoyo firme de pies en el suelo, retracción escapular activa. Bajar la barra con control al pecho medio y empujar de forma compacta e impulsando con el tren superior.',
    series: 4,
    repeticiones: '5',
    carga_kg: '80% 1RM',
    rpe_sugerido: 8
  },
  // FUERZA_EXPLOSIVA
  {
    target_group: 'FUERZA_EXPLOSIVA',
    grupo_muscular: 'Piernas / Extensores',
    ejercicio: 'Sentadilla con salto con barra hexagonal (Hex Bar Jump Squat)',
    equipamiento: 'Barra hexagonal, Discos livianos',
    tecnica_ejecucion: 'Bajar a media sentadilla de manera controlada y realizar una extensión de cadera y rodillas extremadamente explosiva para despegar del suelo. Amortiguar con flexión coordinada.',
    series: 4,
    repeticiones: '4-6',
    carga_kg: '30-40% 1RM',
    rpe_sugerido: 7
  },
  {
    target_group: 'FUERZA_EXPLOSIVA',
    grupo_muscular: 'Cadena Posterior / Core',
    ejercicio: 'Lanzamiento de Med Ball hacia atrás sobre la cabeza',
    equipamiento: 'Balón medicinal pesado (6-8kg)',
    tecnica_ejecucion: 'Desde posición de triple flexión (caderas, rodillas, tobillos), empujar el suelo explosivamente y lanzar el balón con máxima fuerza hacia atrás y arriba mediante extensión potente.',
    series: 3,
    repeticiones: '6',
    carga_kg: 'Balón 6-8kg',
    rpe_sugerido: 7
  },
  {
    target_group: 'FUERZA_EXPLOSIVA',
    grupo_muscular: 'Hombros / Piernas',
    ejercicio: 'Push Press con barra',
    equipamiento: 'Barra olímpica, Discos',
    tecnica_ejecucion: 'Realizar un dip corto de piernas (flexión menor a 15cm) y aprovechar el impulso del tren inferior de manera coordinada para empujar la barra sobre la cabeza con bloqueo rápido.',
    series: 4,
    repeticiones: '5',
    carga_kg: '65-70% 1RM',
    rpe_sugerido: 8
  },
  // PLIOMETRIA_INTENSIVA
  {
    target_group: 'PLIOMETRIA_INTENSIVA',
    grupo_muscular: 'Cuádriceps / Tobillos',
    ejercicio: 'Saltos de caída con rebote vertical (Depth Jumps)',
    equipamiento: 'Cajón pliométrico (30-45 cm)',
    tecnica_ejecucion: 'Dejarse caer desde el cajón (no saltar), amortiguar el impacto con el mínimo tiempo de contacto en el suelo y rebotar explosivamente hacia arriba buscando la máxima altura.',
    series: 4,
    repeticiones: '5',
    carga_kg: 'Peso corporal',
    rpe_sugerido: 8
  },
  {
    target_group: 'PLIOMETRIA_INTENSIVA',
    grupo_muscular: 'Pantorrillas / Tobillos',
    ejercicio: 'Saltos de valla continuos (Hurdle Jumps)',
    equipamiento: '4-5 Vallas pliométricas (40-60 cm)',
    tecnica_ejecucion: 'Saltos bipodales continuos sobre vallas consecutivas. Minimizar el tiempo de contacto en el suelo, utilizando el rebote reactivo del tendón de Aquiles y flexión de cadera.',
    series: 3,
    repeticiones: '5 saltos',
    carga_kg: 'Peso corporal',
    rpe_sugerido: 8
  },
  {
    target_group: 'PLIOMETRIA_INTENSIVA',
    grupo_muscular: 'Extensores de Cadera',
    ejercicio: 'Saltos horizontales continuos alternados (Power Bounds)',
    equipamiento: 'Espacio libre de 15 metros',
    tecnica_ejecucion: 'Zancadas pliométricas proyectando el cuerpo con la máxima distancia horizontal y vertical por salto. Coordinar activamente el braceo para la propulsión explosiva.',
    series: 3,
    repeticiones: '10-12 cont.',
    carga_kg: 'Peso corporal',
    rpe_sugerido: 8
  },
  // PLIOMETRIA_EXTENSIVA
  {
    target_group: 'PLIOMETRIA_EXTENSIVA',
    grupo_muscular: 'Tobillo / Tendón de Aquiles',
    ejercicio: 'Saltos de tobillo rítmicos en el lugar (Ankle Hops / Pogos)',
    equipamiento: 'Ninguno',
    tecnica_ejecucion: 'Saltos verticales rápidos manteniendo las rodillas casi rígidas. El movimiento proviene exclusivamente de la flexión plantar activa del tobillo con rebote elástico y rigidez.',
    series: 3,
    repeticiones: '20 contactos',
    carga_kg: 'Peso corporal',
    rpe_sugerido: 6
  },
  {
    target_group: 'PLIOMETRIA_EXTENSIVA',
    grupo_muscular: 'Estabilizadores / Tobillo',
    ejercicio: 'Saltos laterales rítmicos sobre línea (Lateral Line Hops)',
    equipamiento: 'Línea de suelo o banda elástica',
    tecnica_ejecucion: 'Saltar lateralmente de lado a lado de forma rítmica y continua. Mantener el centro de masa estable y priorizar la elasticidad, rapidez y coordinación en la amortiguación.',
    series: 3,
    repeticiones: '30 segundos',
    carga_kg: 'Peso corporal',
    rpe_sugerido: 6
  },
  {
    target_group: 'PLIOMETRIA_EXTENSIVA',
    grupo_muscular: 'Piernas / Elasticidad base',
    ejercicio: 'Saltos en tijera continuos de bajo impacto (Split Hops)',
    equipamiento: 'Ninguno',
    tecnica_ejecucion: 'En posición de zancada corta y alternando piernas de forma continua sin bajar demasiado la cadera. Buscar un rebote ligero, reactivo, elástico y de bajo impacto coordinado.',
    series: 3,
    repeticiones: '16 contactos',
    carga_kg: 'Peso corporal',
    rpe_sugerido: 5
  },
  // SALTOS_CON_CARGA
  {
    target_group: 'SALTOS_CON_CARGA',
    grupo_muscular: 'Cuádriceps / Glúteos',
    ejercicio: 'Saltos desde sentadilla con mancuernas (Dumbbell Jump Squat)',
    equipamiento: 'Mancuernas de 8-12kg',
    tecnica_ejecucion: 'Sostener mancuernas firmemente a los costados del cuerpo. Bajar a un cuarto de sentadilla y despegar verticalmente. Absorber la caída flexionando rodillas.',
    series: 4,
    repeticiones: '6',
    carga_kg: '8-12kg c/u',
    rpe_sugerido: 7
  },
  {
    target_group: 'SALTOS_CON_CARGA',
    grupo_muscular: 'Tren inferior / Potencia',
    ejercicio: 'Saltos bipodales a cajón con chaleco lastrado (Weighted Box Jumps)',
    equipamiento: 'Chaleco lastrado (5-10kg), Cajón bajo',
    tecnica_ejecucion: 'Con el chaleco colocado, realizar una flexión rápida y saltar arriba del cajón. Aterrizar suavemente y con amortiguación. Descender caminando un pie a la vez.',
    series: 3,
    repeticiones: '6',
    carga_kg: 'Chaleco 5-10kg',
    rpe_sugerido: 7
  },
  {
    target_group: 'SALTOS_CON_CARGA',
    grupo_muscular: 'Glúteos / Estabilizadores',
    ejercicio: 'Saltos unipodales cargados (Weighted Single Leg Jumps)',
    equipamiento: 'Chaleco o mancuerna ligera en copa',
    tecnica_ejecucion: 'Apoyo unipodal estable. Bajar levemente la cadera y saltar de forma vertical o de proyección hacia adelante, controlando rigurosamente la caída y rodilla alineada.',
    series: 3,
    repeticiones: '5 por pierna',
    carga_kg: '4-8kg',
    rpe_sugerido: 7
  },
  // DERIVADOS_HALTEROFILIA
  {
    target_group: 'DERIVADOS_HALTEROFILIA',
    grupo_muscular: 'Cadena Posterior / Potencia total',
    ejercicio: 'Cargada de fuerza colgado (Hang Power Clean)',
    equipamiento: 'Barra olímpica, Discos bumpers',
    tecnica_ejecucion: 'Barra sobre rodillas con bisagra de cadera. Realizar extensión explosiva de cadera-rodilla (triple extensión), encoger hombros y recibir la barra sobre deltoides frontales.',
    series: 4,
    repeticiones: '3-4',
    carga_kg: '65-75% 1RM',
    rpe_sugerido: 8
  },
  {
    target_group: 'DERIVADOS_HALTEROFILIA',
    grupo_muscular: 'Cadena Posterior / Hombros',
    ejercicio: 'Arrancada de potencia colgado (Hang Power Snatch)',
    equipamiento: 'Barra olímpica, Discos bumpers, agarre ancho',
    tecnica_ejecucion: 'Barra sobre rodillas, extender explosivamente el cuerpo entero y proyectar la barra en un solo movimiento fluido sobre la cabeza, recibiéndola en flexión corta con brazos bloqueados.',
    series: 3,
    repeticiones: '3',
    carga_kg: '60-70% 1RM',
    rpe_sugerido: 8
  },
  {
    target_group: 'DERIVADOS_HALTEROFILIA',
    grupo_muscular: 'Trapecios / Glúteos',
    ejercicio: 'Jalón de cargada colgado (Hang Clean Pull)',
    equipamiento: 'Barra olímpica, Discos',
    tecnica_ejecucion: 'Partiendo desde arriba de las rodillas, extender cadera y rodillas explosivamente buscando triple extensión máxima y encogimiento de hombros sin flexionar los brazos.',
    series: 4,
    repeticiones: '4-5',
    carga_kg: '85-95% Clean',
    rpe_sugerido: 8
  },
  // GENERALES_SUPERIOR
  {
    target_group: 'GENERALES_SUPERIOR',
    grupo_muscular: 'Dorsales / Bíceps',
    ejercicio: 'Dominadas con agarre prono (Pull-ups)',
    equipamiento: 'Barra fija, cinturón de lastre (opcional)',
    tecnica_ejecucion: 'Agarre prono más ancho que los hombros. Elevar el cuerpo traccionando codos hacia abajo hasta pasar la barbilla, descender de forma controlada estirando dorsales.',
    series: 4,
    repeticiones: '6-8',
    carga_kg: 'Peso corporal / Lastre',
    rpe_sugerido: 8
  },
  {
    target_group: 'GENERALES_SUPERIOR',
    grupo_muscular: 'Deltoides / Tríceps',
    ejercicio: 'Press de hombros con mancuernas (Dumbbell Shoulder Press)',
    equipamiento: 'Mancuernas, Banco con respaldo',
    tecnica_ejecucion: 'Sentado con espalda firme. Empujar mancuernas verticalmente desde la altura de las orejas hacia arriba de manera controlada e impidiendo arquear excesivamente la espalda.',
    series: 3,
    repeticiones: '8-10',
    carga_kg: 'Carga moderada',
    rpe_sugerido: 7
  },
  {
    target_group: 'GENERALES_SUPERIOR',
    grupo_muscular: 'Espalda Alta / Dorsales',
    ejercicio: 'Remo unilateral con mancuerna',
    equipamiento: 'Mancuerna, Banco plano',
    tecnica_ejecucion: 'Un pie y mano del mismo lado apoyados en el banco. Traccionar la mancuerna con el brazo libre hacia la cadera baja manteniendo espalda neutra, alineada y firme.',
    series: 3,
    repeticiones: '8-10 por lado',
    carga_kg: 'Carga moderada-alta',
    rpe_sugerido: 8
  },
  // GENERALES_INFERIOR
  {
    target_group: 'GENERALES_INFERIOR',
    grupo_muscular: 'Cuádriceps / Glúteos',
    ejercicio: 'Zancadas caminando con mancuernas (Dumbbell Walking Lunges)',
    equipamiento: 'Mancuernas',
    tecnica_ejecucion: 'Dar un paso largo bajando la cadera hasta que la rodilla trasera roce el suelo. Empujar con firmeza desde el talón delantero y avanzar con el otro pie de forma fluida.',
    series: 3,
    repeticiones: '8-10 por pierna',
    carga_kg: 'Carga moderada',
    rpe_sugerido: 7
  },
  {
    target_group: 'GENERALES_INFERIOR',
    grupo_muscular: 'Cuádriceps / Glúteo mayor',
    ejercicio: 'Sentadilla búlgara con mancuernas',
    equipamiento: 'Mancuernas, Banco para pie trasero',
    tecnica_ejecucion: 'Un pie elevado atrás en banco. Bajar cadera verticalmente manteniendo el peso y equilibrio en talón del pie delantero, impidiendo que la rodilla colapse en valgo.',
    series: 3,
    repeticiones: '8 por pierna',
    carga_kg: 'Carga moderada',
    rpe_sugerido: 8
  },
  {
    target_group: 'GENERALES_INFERIOR',
    grupo_muscular: 'Cuádriceps / Recto Femoral',
    ejercicio: 'Extensión de cuádriceps en máquina (Leg Extension)',
    equipamiento: 'Máquina de leg extension',
    tecnica_ejecucion: 'Sentado, extender las rodillas completamente de forma controlada, sostener la contracción arriba por 1 segundo y bajar de forma lenta aguantando el peso.',
    series: 3,
    repeticiones: '10-12',
    carga_kg: 'Carga moderada',
    rpe_sugerido: 7
  },
  // CORE_ZONA_MEDIA
  {
    target_group: 'CORE_ZONA_MEDIA',
    grupo_muscular: 'Core / Oblicuos (Anti-rotación)',
    ejercicio: 'Press Pallof con banda elástica (Pallof Press)',
    equipamiento: 'Banda elástica o polea',
    tecnica_ejecucion: 'De pie de lado al anclaje, sostener banda frente al esternón con dos manos y extender los brazos hacia adelante resistiendo la tensión lateral rotatoria sin rotar torso.',
    series: 3,
    repeticiones: '12 por lado',
    carga_kg: 'Tensión media',
    rpe_sugerido: 7
  },
  {
    target_group: 'CORE_ZONA_MEDIA',
    grupo_muscular: 'Transverso / Oblicuos / Hombros',
    ejercicio: 'Plancha alta con arrastre de saco (Plank Pull-Through)',
    equipamiento: 'Saco de arena o mancuerna (5-10kg)',
    tecnica_ejecucion: 'En posición de plancha alta (manos apoyadas). Con la mano contraria, jalar la carga por debajo del cuerpo de un lado al otro manteniendo caderas estables sin balanceos.',
    series: 3,
    repeticiones: '10-12 pasadas',
    carga_kg: 'Saco 5-10kg',
    rpe_sugerido: 7
  },
  {
    target_group: 'CORE_ZONA_MEDIA',
    grupo_muscular: 'Abdomen (Anti-extensión)',
    ejercicio: 'Rollout abdominal con rodillo (Ab Wheel Rollout)',
    equipamiento: 'Rueda abdominal',
    tecnica_ejecucion: 'De rodillas, rodar hacia adelante extendiendo el cuerpo manteniendo el core y los glúteos fuertemente contraídos (evitando arquear la zona lumbar), regresar activando el core.',
    series: 3,
    repeticiones: '8-10',
    carga_kg: 'Peso corporal',
    rpe_sugerido: 8
  },
  // ISQUIOSURALES_CADENA_POSTERIOR
  {
    target_group: 'ISQUIOSURALES_CADENA_POSTERIOR',
    grupo_muscular: 'Isquiotibiales (Excéntrico)',
    ejercicio: 'Ejercicio nórdico de isquiotibiales (Nordic Hamstring Curl)',
    equipamiento: 'Colchoneta, compañero o anclaje firme',
    tecnica_ejecucion: 'De rodillas, tobillos fijados. Dejarse caer lentamente hacia adelante manteniendo el cuerpo rígido desde la cadera, usando los isquios para frenar la caída. Empujar abajo para regresar.',
    series: 3,
    repeticiones: '5-6',
    carga_kg: 'Peso corporal',
    rpe_sugerido: 9
  },
  {
    target_group: 'ISQUIOSURALES_CADENA_POSTERIOR',
    grupo_muscular: 'Isquiotibiales / Glúteos',
    ejercicio: 'Peso muerto unilateral con mancuernas (Single Leg RDL)',
    equipamiento: 'Mancuerna o kettlebell',
    tecnica_ejecucion: 'Apoyo unipodal. Flexionar cadera empujándola hacia atrás mientras la pierna libre se eleva alineada con el torso. Traccionar desde el isquiosural y glúteo para subir.',
    series: 3,
    repeticiones: '8 por pierna',
    carga_kg: '12-20kg',
    rpe_sugerido: 8
  },
  {
    target_group: 'ISQUIOSURALES_CADENA_POSTERIOR',
    grupo_muscular: 'Isquiotibiales / Glúteos',
    ejercicio: 'Puente con deslizamiento de talones (Hamstring Slides)',
    equipamiento: 'Deslizadores o toalla en piso liso',
    tecnica_ejecucion: 'Boca arriba, elevar pelvis en puente. Deslizar talones hacia adelante lentamente con cadera alta, y recogerlos de forma fluida contrayendo potentemente los isquiotibiales.',
    series: 3,
    repeticiones: '8-10',
    carga_kg: 'Peso corporal',
    rpe_sugerido: 7
  },
  // TODOS
  {
    target_group: 'TODOS',
    grupo_muscular: 'Piernas / Glúteos',
    ejercicio: 'Sentadilla profunda con copa (Goblet Squat)',
    equipamiento: 'Kettlebell o mancuerna pesada',
    tecnica_ejecucion: 'Sostener peso frente al pecho en copa. Bajar rompiendo paralelo con espalda erguida y rodillas apuntando en dirección de pies. Subir empujando el suelo.',
    series: 3,
    repeticiones: '10',
    carga_kg: 'Carga ligera',
    rpe_sugerido: 6
  },
  {
    target_group: 'TODOS',
    grupo_muscular: 'Espalda Alta / Dorsales',
    ejercicio: 'Remo invertido colgado en barra (Inverted Row)',
    equipamiento: 'Barra en rack o correas de suspensión',
    tecnica_ejecucion: 'Colgado boca arriba debajo de la barra, cuerpo recto. Traccionar jalando el pecho hacia la barra apretando los omóplatos, bajar con control sin descolgar hombros.',
    series: 3,
    repeticiones: '10-12',
    carga_kg: 'Peso corporal',
    rpe_sugerido: 7
  },
  {
    target_group: 'TODOS',
    grupo_muscular: 'Pectorales / Tríceps',
    ejercicio: 'Flexiones de brazos clásicas (Push-ups)',
    equipamiento: 'Ninguno / Colchoneta',
    tecnica_ejecucion: 'Apoyo de manos al ancho de hombros. Bajar el pecho al suelo manteniendo el abdomen tenso, caderas alineadas y codos a 45 grados, extender brazos con control.',
    series: 3,
    repeticiones: '12-15',
    carga_kg: 'Peso corporal',
    rpe_sugerido: 6
  }
];

export default function FisicaGimnasioArea({
  clubs = [],
  userRole = 'staff',
  userClub = null,
  userClubId = null
}: FisicaGimnasioAreaProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'detail'>('grid')
  const [selectedMicro, setSelectedMicro] = useState<MicrocicloUI | null>(null)
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('TODOS')
  const [microciclos, setMicrociclos] = useState<MicrocicloUI[]>([])
  const [loadingMicros, setLoadingMicros] = useState(false)
  const [isDbMode, setIsDbMode] = useState(true) // Sincronizado vs Local
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Detail View State
  const [sessions, setSessions] = useState<GymSession[]>([])
  const [selectedDia, setSelectedDia] = useState<string>('Lunes')
  const [loadingSessions, setLoadingSessions] = useState(false)

  // Player needs grouping states
  const [nominatedPlayers, setNominatedPlayers] = useState<any[]>([])
  const [playerAssignments, setPlayerAssignments] = useState<Record<number, string>>({})
  const [loadingPlayers, setLoadingPlayers] = useState(false)
  const [selectedSubTab, setSelectedSubTab] = useState<'sessions' | 'groups'>('sessions')
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('TODOS')
  const [isPrescriptionsPanelOpen, setIsPrescriptionsPanelOpen] = useState(true)
  const [playerSearchQuery, setPlayerSearchQuery] = useState('')

  // Individual player prescriptions / kine pautas
  const [individualPautas, setIndividualPautas] = useState<Record<number, {
    activo: boolean;
    tipo: 'Kinesiología' | 'Trabajo Diferenciado' | 'Gimnasio Especial' | 'Otro';
    observaciones: string;
  }>>({})
  const [showIndividualPautaModal, setShowIndividualPautaModal] = useState(false)
  const [savingToDb, setSavingToDb] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Modals
  const [showSessionModal, setShowSessionModal] = useState(false)
  const [editingSession, setEditingSession] = useState<GymSession | null>(null)

  // New Session Form State
  const [sessionForm, setSessionForm] = useState({
    nombre_sesion: '',
    observaciones: '',
    dia_semana: 'Lunes',
    fecha_sesion: ''
  })
  const [tempExercises, setTempExercises] = useState<GymExercise[]>([])

  // Exercise Search / Suggestion States
  const [exerciseSearchTerm, setExerciseSearchTerm] = useState('')
  const [showExercisesDropdown, setShowExercisesDropdown] = useState(false)
  const [selectedExerciseTemplate, setSelectedExerciseTemplate] = useState<GymExerciseTemplate | null>(null)

  // Individual Exercise inputs in Form
  const [exerciseInput, setExerciseInput] = useState({
    grupo_muscular: '',
    ejercicio: '',
    equipamiento: '',
    tecnica_ejecucion: '',
    series: 3,
    repeticiones: '10',
    carga_kg: '0',
    rpe_sugerido: 7,
    target_group: 'TODOS'
  })

  // Quick Add Specific Exercise States
  const [showQuickAddModal, setShowQuickAddModal] = useState(false)
  const [quickAddTargetGroup, setQuickAddTargetGroup] = useState<string>('TODOS')
  const [quickAddSessionId, setQuickAddSessionId] = useState<string | number>('')
  const [quickAddExerciseForm, setQuickAddExerciseForm] = useState({
    grupo_muscular: '',
    ejercicio: '',
    equipamiento: '',
    tecnica_ejecucion: '',
    series: 3,
    repeticiones: '10',
    carga_kg: '0',
    rpe_sugerido: 7
  })
  const [quickAddSearchTerm, setQuickAddSearchTerm] = useState('')
  const [showQuickAddDropdown, setShowQuickAddDropdown] = useState(false)

  const filteredQuickAddTemplates = useMemo(() => {
    let baseList = GYM_EXERCISES_DATA;
    if (quickAddTargetGroup && quickAddTargetGroup !== 'TODOS') {
      baseList = baseList.filter(ex => ex.target_group === quickAddTargetGroup);
    }
    if (!quickAddSearchTerm) return baseList;
    return baseList.filter(ex => 
      ex.ejercicio.toLowerCase().includes(quickAddSearchTerm.toLowerCase()) ||
      ex.grupo_muscular.toLowerCase().includes(quickAddSearchTerm.toLowerCase())
    )
  }, [quickAddSearchTerm, quickAddTargetGroup])

  const handleSelectQuickAddTemplate = (template: GymExerciseTemplate) => {
    setQuickAddSearchTerm(template.ejercicio)
    setQuickAddExerciseForm(prev => ({
      ...prev,
      ejercicio: template.ejercicio,
      grupo_muscular: template.grupo_muscular,
      equipamiento: template.equipamiento,
      tecnica_ejecucion: template.tecnica_ejecucion
    }))
    setShowQuickAddDropdown(false)
  }

  // Manage Focus Group Exercises States
  const [showManageGroupModal, setShowManageGroupModal] = useState(false)
  const [manageGroupTarget, setManageGroupTarget] = useState<string | null>(null)
  const [manageGroupExercises, setManageGroupExercises] = useState<any[]>([])
  
  // View Player Exercises States
  const [showPlayerExercisesModal, setShowPlayerExercisesModal] = useState(false)
  const [selectedPlayerForExercises, setSelectedPlayerForExercises] = useState<any | null>(null)
  const [selectedPlayerForPauta, setSelectedPlayerForPauta] = useState<any | null>(null)
  
  // Quick-input form for adding exercises within the Manage Focus Group Modal
  const [manageGroupAddForm, setManageGroupAddForm] = useState({
    grupo_muscular: '',
    ejercicio: '',
    equipamiento: '',
    tecnica_ejecucion: '',
    series: 3,
    repeticiones: '10',
    carga_kg: '0',
    rpe_sugerido: 7
  })
  const [manageGroupSearchTerm, setManageGroupSearchTerm] = useState('')
  const [showManageGroupDropdown, setShowManageGroupDropdown] = useState(false)
  const [selectedManageGroupMuscle, setSelectedManageGroupMuscle] = useState('')
  const [selectedManageGroupExerciseId, setSelectedManageGroupExerciseId] = useState<number | string>('')

  const uniqueMuscleGroupsForCurrentTarget = useMemo(() => {
    if (!manageGroupTarget) return [];
    const baseList = GYM_EXERCISES_DATA.filter(ex => ex.target_group === manageGroupTarget);
    const groups = baseList.map(ex => ex.grupo_muscular).filter(Boolean);
    return Array.from(new Set(groups)).sort();
  }, [manageGroupTarget]);

  const exercisesForSelectedMuscleGroup = useMemo(() => {
    if (!manageGroupTarget || !selectedManageGroupMuscle) return [];
    return GYM_EXERCISES_DATA.filter(ex => 
      ex.target_group === manageGroupTarget && 
      ex.grupo_muscular === selectedManageGroupMuscle
    ).sort((a, b) => a.ejercicio.localeCompare(b.ejercicio));
  }, [manageGroupTarget, selectedManageGroupMuscle]);

  const handleManageGroupMuscleChange = (muscle: string) => {
    setSelectedManageGroupMuscle(muscle);
    setSelectedManageGroupExerciseId('');
    setManageGroupAddForm(prev => ({
      ...prev,
      grupo_muscular: muscle,
      ejercicio: '',
      equipamiento: '',
      tecnica_ejecucion: ''
    }));
  };

  const handleManageGroupExerciseChange = (exerciseIdStr: string) => {
    setSelectedManageGroupExerciseId(exerciseIdStr);
    if (!exerciseIdStr) {
      setManageGroupAddForm(prev => ({
        ...prev,
        ejercicio: '',
        equipamiento: '',
        tecnica_ejecucion: ''
      }));
      return;
    }
    
    const selectedEx = exercisesForSelectedMuscleGroup.find(ex => String(ex.id) === exerciseIdStr);
    if (selectedEx) {
      setManageGroupAddForm(prev => ({
        ...prev,
        ejercicio: selectedEx.ejercicio,
        equipamiento: selectedEx.equipamiento || '',
        tecnica_ejecucion: selectedEx.tecnica_ejecucion || ''
      }));
    }
  };

  const filteredManageGroupTemplates = useMemo(() => {
    let baseList = GYM_EXERCISES_DATA;
    if (manageGroupTarget && manageGroupTarget !== 'TODOS') {
      baseList = baseList.filter(ex => ex.target_group === manageGroupTarget);
    }
    if (!manageGroupSearchTerm) return baseList;
    return baseList.filter(ex => 
      ex.ejercicio.toLowerCase().includes(manageGroupSearchTerm.toLowerCase()) ||
      ex.grupo_muscular.toLowerCase().includes(manageGroupSearchTerm.toLowerCase())
    )
  }, [manageGroupSearchTerm, manageGroupTarget])

  const activeDaySessions = sessions.filter(s => s.dia_semana === selectedDia)

  const playerExercisesForActiveDay = useMemo(() => {
    if (!selectedPlayerForExercises) return [];
    const primaryGroup = selectedPlayerForExercises.recommendation?.group || 'TODOS';
    const secondaryGroup = selectedPlayerForExercises.recommendation?.secondaryGroup || 'CORE_ZONA_MEDIA';
    
    let dayExercises: any[] = [];
    if (activeDaySessions.length > 0) {
      dayExercises = activeDaySessions.flatMap(s => s.ejercicios || []);
    }

    // Filter primary group
    let primaryExs = dayExercises.filter(ex => {
      const exGroup = ex.target_group || 'TODOS';
      return exGroup === primaryGroup && exGroup !== 'TODOS';
    });

    // Filter secondary group
    let secondaryExs = dayExercises.filter(ex => {
      const exGroup = ex.target_group || 'TODOS';
      return exGroup === secondaryGroup && exGroup !== 'TODOS';
    });

    // Fallbacks if no exercises are assigned/found in activeDaySessions
    if (primaryExs.length === 0) {
      primaryExs = PREDEFINED_FOCUS_EXERCISES.filter(ex => ex.target_group === primaryGroup);
    }
    if (secondaryExs.length === 0) {
      secondaryExs = PREDEFINED_FOCUS_EXERCISES.filter(ex => ex.target_group === secondaryGroup);
    }

    // Map them to ensure correct labeling of group in display
    const mappedPrimary = primaryExs.map(ex => ({
      ...ex,
      assignment_type: 'PRIORITARIO',
      assigned_group: primaryGroup
    }));

    const mappedSecondary = secondaryExs.map(ex => ({
      ...ex,
      assignment_type: 'SECUNDARIO',
      assigned_group: secondaryGroup
    }));

    return [...mappedPrimary, ...mappedSecondary];
  }, [selectedPlayerForExercises, activeDaySessions])

  const handleSelectManageGroupTemplate = (template: GymExerciseTemplate) => {
    setManageGroupSearchTerm(template.ejercicio)
    setManageGroupAddForm(prev => ({
      ...prev,
      ejercicio: template.ejercicio,
      grupo_muscular: template.grupo_muscular,
      equipamiento: template.equipamiento,
      tecnica_ejecucion: template.tecnica_ejecucion
    }))
    setShowManageGroupDropdown(false)
  }

  const handleOpenManageGroupModal = (targetGroupId: string) => {
    if (!selectedMicro) return;
    setManageGroupTarget(targetGroupId);
    
    // Find exercises of this target group in activeDaySessions
    const dayExercises = activeDaySessions.flatMap(s => s.ejercicios || []);
    const groupExercises = dayExercises.filter(ex => ex.target_group === targetGroupId);
    
    // Copy them so they can be edited in memory
    setManageGroupExercises(JSON.parse(JSON.stringify(groupExercises)));
    
    // Reset add form
    const defaultMuscleGroup = TARGET_GROUPS_CONFIG.find(g => g.id === targetGroupId)?.shortLabel || 'General';
    setManageGroupAddForm({
      grupo_muscular: defaultMuscleGroup,
      ejercicio: '',
      equipamiento: '',
      tecnica_ejecucion: '',
      series: 3,
      repeticiones: '10',
      carga_kg: '0',
      rpe_sugerido: 7
    });
    setManageGroupSearchTerm('');
    setShowManageGroupDropdown(false);
    setSelectedManageGroupMuscle('');
    setSelectedManageGroupExerciseId('');
    setShowManageGroupModal(true);
  }

  const handleAddExerciseToManageGroup = () => {
    if (!manageGroupAddForm.ejercicio) return;
    const newEx = {
      id: 'TEMP_' + Date.now() + Math.random(), // Temporary local ID
      grupo_muscular: manageGroupAddForm.grupo_muscular || 'General',
      ejercicio: manageGroupAddForm.ejercicio,
      equipamiento: manageGroupAddForm.equipamiento || 'Ninguno',
      tecnica_ejecucion: manageGroupAddForm.tecnica_ejecucion || '',
      series: Number(manageGroupAddForm.series),
      repeticiones: manageGroupAddForm.repeticiones,
      carga_kg: manageGroupAddForm.carga_kg,
      rpe_sugerido: Number(manageGroupAddForm.rpe_sugerido),
      target_group: manageGroupTarget
    };
    
    setManageGroupExercises(prev => [...prev, newEx]);
    
    // Clear form
    const defaultMuscleGroup = TARGET_GROUPS_CONFIG.find(g => g.id === manageGroupTarget)?.shortLabel || 'General';
    setManageGroupAddForm({
      grupo_muscular: defaultMuscleGroup,
      ejercicio: '',
      equipamiento: '',
      tecnica_ejecucion: '',
      series: 3,
      repeticiones: '10',
      carga_kg: '0',
      rpe_sugerido: 7
    });
    setManageGroupSearchTerm('');
    setSelectedManageGroupMuscle('');
    setSelectedManageGroupExerciseId('');
  }

  const handleUpdateManageGroupExerciseField = (index: number, field: string, value: any) => {
    setManageGroupExercises(prev => prev.map((ex, idx) => {
      if (idx === index) {
        return { ...ex, [field]: value };
      }
      return ex;
    }));
  }

  const handleRemoveManageGroupExercise = (index: number) => {
    setManageGroupExercises(prev => prev.filter((_, idx) => idx !== index));
  }

  const handleSaveManageGroupExercises = async () => {
    if (!selectedMicro || !manageGroupTarget) return;

    try {
      // 1. Check if we have a session for the active day. If not, create one.
      let targetSessionId = activeDaySessions.length > 0 ? activeDaySessions[0].id : null;
      
      if (!targetSessionId) {
        const defaultSessionName = `Trabajo Específico - ${selectedDia}`;
        const sessionPayload = {
          microcycle_id: selectedMicro.id,
          dia_semana: selectedDia,
          fecha_sesion: null,
          nombre_sesion: defaultSessionName,
          observaciones: 'Sesión creada automáticamente para trabajo neuromuscular específico.'
        };

        if (isDbMode) { // Offline edit during session creation
          const { data, error } = await supabase
            .from('fisica_gimnasio_sesion')
            .insert([sessionPayload])
            .select()
            .single();

          if (error) throw error;
          targetSessionId = data.id;
        } else {
          const newSessionId = Date.now() + Math.random();
          const localSessions = [...sessions];
          const newLocalSession = {
            id: newSessionId,
            ...sessionPayload,
            ejercicios: []
          };
          localSessions.push(newLocalSession);
          targetSessionId = newSessionId;
          saveSessionsLocal(selectedMicro.id, localSessions);
          setSessions(localSessions);
        }
      }

      // 2. Now we save the exercises
      if (isDbMode) { // Offline edit during exercise saving
        // Fetch all current exercises of this session to identify the ones belonging to the target group
        const { data: existingExs, error: errFetch } = await supabase
          .from('fisica_gimnasio_ejercicio')
          .select('*')
          .eq('sesion_id', targetSessionId);

        if (errFetch) throw errFetch;

        // Find exercises belonging to manageGroupTarget
        const exercisesToDelete = (existingExs || []).filter(e => {
          const unpacked = unpackGrupoMuscular(e.grupo_muscular);
          return unpacked.targetGroup === manageGroupTarget;
        });

        const idsToDelete = exercisesToDelete.map(e => e.id);

        if (idsToDelete.length > 0) {
          const { error: errDel } = await supabase
            .from('fisica_gimnasio_ejercicio')
            .delete()
            .in('id', idsToDelete);

          if (errDel) throw errDel;
        }

        // Insert new exercises
        if (manageGroupExercises.length > 0) {
          const exercisesToInsert = manageGroupExercises.map((ex, index) => ({
            sesion_id: targetSessionId,
            grupo_muscular: packGrupoMuscular(ex.grupo_muscular, manageGroupTarget),
            ejercicio: ex.ejercicio,
            equipamiento: ex.equipamiento || 'Ninguno',
            tecnica_ejecucion: ex.tecnica_ejecucion || '',
            series: Number(ex.series),
            repeticiones: ex.repeticiones,
            carga_kg: ex.carga_kg,
            rpe_sugerido: Number(ex.rpe_sugerido),
            orden: index
          }));

          const { error: errIns } = await supabase
            .from('fisica_gimnasio_ejercicio')
            .insert(exercisesToInsert);

          if (errIns) throw errIns;
        }

        // Reload sessions from database
        await fetchSessionsForMicro(selectedMicro.id);
      } else {
        // Local fallback
        const localSessions = [...sessions];
        const sIndex = localSessions.findIndex(s => s.id === targetSessionId);
        if (sIndex !== -1) {
          if (!localSessions[sIndex].ejercicios) {
            localSessions[sIndex].ejercicios = [];
          }
          // Filter out existing exercises for this target group
          const otherExercises = localSessions[sIndex].ejercicios.filter(ex => {
            const unpacked = unpackGrupoMuscular(ex.grupo_muscular);
            return unpacked.targetGroup !== manageGroupTarget && ex.target_group !== manageGroupTarget;
          });

          // Map and clean up new exercises
          const updatedGroupExercises = manageGroupExercises.map(ex => ({
            ...ex,
            id: ex.id?.toString().startsWith('TEMP_') ? Date.now() + Math.random() : ex.id
          }));

          localSessions[sIndex].ejercicios = [...otherExercises, ...updatedGroupExercises];
          saveSessionsLocal(selectedMicro.id, localSessions);
          setSessions(localSessions);
          setHasUnsavedChanges(true);
        }
      }

      setShowManageGroupModal(false);
      setErrorMsg(null);
    } catch (err: any) {
      console.error("Error saving group exercises:", err);
      setErrorMsg("Error al guardar los ejercicios del foco.");
    }
  }

  const handleQuickAddExercise = async () => {
    if (!selectedMicro || !quickAddExerciseForm.ejercicio) return;

    let targetSessionId = quickAddSessionId;

    try {
      // 1. If we need to create a new session
      if (targetSessionId === 'NEW' || !targetSessionId) {
        const defaultSessionName = `Trabajo Específico - ${selectedDia}`;
        const sessionPayload = {
          microcycle_id: selectedMicro.id,
          dia_semana: selectedDia,
          fecha_sesion: null,
          nombre_sesion: defaultSessionName,
          observaciones: 'Sesión creada automáticamente para trabajo neuromuscular específico.'
        };

        if (isDbMode) { // Offline edit during quick-add session creation
          const { data, error } = await supabase
            .from('fisica_gimnasio_sesion')
            .insert([sessionPayload])
            .select()
            .single();

          if (error) throw error;
          targetSessionId = data.id;
        } else {
          // Local fallback
          const newSessionId = Date.now() + Math.random();
          const localSessions = [...sessions];
          const newLocalSession = {
            id: newSessionId,
            ...sessionPayload,
            ejercicios: []
          };
          localSessions.push(newLocalSession);
          targetSessionId = newSessionId;
          // Save local session
          localStorage.setItem(`lr-gym-sessions-${selectedMicro.id}`, JSON.stringify(localSessions));
          setSessions(localSessions);
        }
      }

      // 2. Insert the new exercise
      const newEx = {
        grupo_muscular: quickAddExerciseForm.grupo_muscular || 'General',
        ejercicio: quickAddExerciseForm.ejercicio,
        equipamiento: quickAddExerciseForm.equipamiento || 'Ninguno',
        tecnica_ejecucion: quickAddExerciseForm.tecnica_ejecucion || '',
        series: Number(quickAddExerciseForm.series),
        repeticiones: quickAddExerciseForm.repeticiones,
        carga_kg: quickAddExerciseForm.carga_kg,
        rpe_sugerido: Number(quickAddExerciseForm.rpe_sugerido),
        target_group: quickAddTargetGroup
      };

      if (isDbMode) { // Offline edit during quick-add exercise insertion
        // Fetch current exercises count to set orden
        const { data: existingExs } = await supabase
          .from('fisica_gimnasio_ejercicio')
          .select('id')
          .eq('sesion_id', targetSessionId);

        const orderIndex = existingExs ? existingExs.length : 0;

        const { error: errEx } = await supabase
          .from('fisica_gimnasio_ejercicio')
          .insert([{
            sesion_id: targetSessionId,
            grupo_muscular: packGrupoMuscular(newEx.grupo_muscular, newEx.target_group),
            ejercicio: newEx.ejercicio,
            equipamiento: newEx.equipamiento,
            tecnica_ejecucion: newEx.tecnica_ejecucion,
            series: newEx.series,
            repeticiones: newEx.repeticiones,
            carga_kg: newEx.carga_kg,
            rpe_sugerido: newEx.rpe_sugerido,
            orden: orderIndex
          }]);

        if (errEx) throw errEx;
      } else {
        // Local fallback
        const localSessions = [...sessions];
        const sIndex = localSessions.findIndex(s => s.id === targetSessionId);
        if (sIndex !== -1) {
          if (!localSessions[sIndex].ejercicios) {
            localSessions[sIndex].ejercicios = [];
          }
          localSessions[sIndex].ejercicios.push({
            id: Date.now() + Math.random(),
            ...newEx
          });
          saveSessionsLocal(selectedMicro.id, localSessions);
          setSessions(localSessions);
          setHasUnsavedChanges(true);
        }
      }

      // 3. Reload sessions
      if (isDbMode) {
        await fetchSessionsForMicro(selectedMicro.id);
      }
      setShowQuickAddModal(false);
      
      // Reset Quick Add Form
      setQuickAddExerciseForm({
        grupo_muscular: '',
        ejercicio: '',
        equipamiento: '',
        tecnica_ejecucion: '',
        series: 3,
        repeticiones: '10',
        carga_kg: '0',
        rpe_sugerido: 7
      });
      setQuickAddSearchTerm('');
    } catch (err: any) {
      console.error("Error adding specific exercise:", err);
      setErrorMsg("Error al guardar el ejercicio específico.");
    }
  };

  const ensureActiveSessionExist = async (): Promise<string | number | null> => {
    if (!selectedMicro) return null;
    let targetSessionId = activeDaySessions.length > 0 ? activeDaySessions[0].id : null;
    
    if (!targetSessionId) {
      const defaultSessionName = `Trabajo Gimnasio - ${selectedDia}`;
      const sessionPayload = {
        microcycle_id: selectedMicro.id,
        dia_semana: selectedDia,
        fecha_sesion: null,
        nombre_sesion: defaultSessionName,
        observaciones: 'Sesión creada automáticamente.'
      };

      if (isDbMode) {
        const { data, error } = await supabase
          .from('fisica_gimnasio_sesion')
          .insert([sessionPayload])
          .select()
          .single();

        if (error) throw error;
        targetSessionId = data.id;
      } else {
        const newSessionId = Date.now() + Math.random();
        const localSessions = [...sessions];
        const newLocalSession = {
          id: newSessionId,
          ...sessionPayload,
          ejercicios: []
        };
        localSessions.push(newLocalSession);
        targetSessionId = newSessionId;
        saveSessionsLocal(selectedMicro.id, localSessions);
        setSessions(localSessions);
      }
    }
    return targetSessionId;
  };

  const handleAddNextExerciseOfGroup = async (targetGroupId: string) => {
    if (!selectedMicro) return;
    try {
      const targetSessionId = await ensureActiveSessionExist();
      if (!targetSessionId) return;

      // Get predefined list
      let exercisesList = PREDEFINED_FOCUS_EXERCISES.filter(ex => ex.target_group === targetGroupId);
      if (exercisesList.length === 0) {
        // Fallback placeholder
        exercisesList = [{
          target_group: targetGroupId,
          grupo_muscular: 'General',
          ejercicio: 'Ejercicio adicional',
          equipamiento: 'Ninguno',
          tecnica_ejecucion: '',
          series: 3,
          repeticiones: '10',
          carga_kg: '0',
          rpe_sugerido: 7
        }];
      }

      // Count current exercises of this group
      const dayExercises = activeDaySessions.flatMap(s => s.ejercicios || []);
      const currentExCountForGroup = dayExercises.filter(ex => {
        const exGroup = ex.target_group || 'TODOS';
        return exGroup === targetGroupId;
      }).length;

      const templateEx = exercisesList[currentExCountForGroup % exercisesList.length];

      if (isDbMode) { // Offline edit during incremental exercise addition
        // Fetch current exercises count for order
        const { data: existingExs } = await supabase
          .from('fisica_gimnasio_ejercicio')
          .select('id')
          .eq('sesion_id', targetSessionId);
        
        const orderIndex = existingExs ? existingExs.length : 0;

        const { error } = await supabase
          .from('fisica_gimnasio_ejercicio')
          .insert([{
            sesion_id: targetSessionId,
            grupo_muscular: packGrupoMuscular(templateEx.grupo_muscular, targetGroupId),
            ejercicio: templateEx.ejercicio,
            equipamiento: templateEx.equipamiento || 'Ninguno',
            tecnica_ejecucion: templateEx.tecnica_ejecucion || '',
            series: Number(templateEx.series) || 3,
            repeticiones: templateEx.repeticiones || '10',
            carga_kg: templateEx.carga_kg || '0',
            rpe_sugerido: Number(templateEx.rpe_sugerido) || 7,
            orden: orderIndex
          }]);

        if (error) throw error;
        await fetchSessionsForMicro(selectedMicro.id);
      } else {
        // Local mode
        const localSessions = [...sessions];
        const sIndex = localSessions.findIndex(s => s.id === targetSessionId);
        if (sIndex !== -1) {
          if (!localSessions[sIndex].ejercicios) {
            localSessions[sIndex].ejercicios = [];
          }
          localSessions[sIndex].ejercicios.push({
            id: Date.now() + Math.random(),
            grupo_muscular: templateEx.grupo_muscular,
            ejercicio: templateEx.ejercicio,
            equipamiento: templateEx.equipamiento || 'Ninguno',
            tecnica_ejecucion: templateEx.tecnica_ejecucion || '',
            series: Number(templateEx.series) || 3,
            repeticiones: templateEx.repeticiones || '10',
            carga_kg: templateEx.carga_kg || '0',
            rpe_sugerido: Number(templateEx.rpe_sugerido) || 7,
            target_group: targetGroupId
          });
          saveSessionsLocal(selectedMicro.id, localSessions);
          setSessions(localSessions);
          setHasUnsavedChanges(true);
        }
      }
    } catch (err) {
      console.error("Error adding next exercise of group:", err);
      setErrorMsg("Error al agregar ejercicio.");
    }
  };

  const handleRemoveLastExerciseOfGroup = async (targetGroupId: string) => {
    if (!selectedMicro) return;
    const targetSessionId = activeDaySessions.length > 0 ? activeDaySessions[0].id : null;
    if (!targetSessionId) return;

    try {
      if (isDbMode) { // Offline edit during incremental exercise removal
        // Find exercises of this target group in this session
        const { data: existingExs, error: errFetch } = await supabase
          .from('fisica_gimnasio_ejercicio')
          .select('*')
          .eq('sesion_id', targetSessionId);

        if (errFetch) throw errFetch;

        const targetGroupExs = (existingExs || []).filter(e => {
          const unpacked = unpackGrupoMuscular(e.grupo_muscular);
          return unpacked.targetGroup === targetGroupId;
        });

        if (targetGroupExs.length > 0) {
          // Sort by order or id desc to remove the last one
          targetGroupExs.sort((a, b) => (b.orden || 0) - (a.orden || 0));
          const lastId = targetGroupExs[0].id;

          const { error: errDelete } = await supabase
            .from('fisica_gimnasio_ejercicio')
            .delete()
            .eq('id', lastId);

          if (errDelete) throw errDelete;
          await fetchSessionsForMicro(selectedMicro.id);
        }
      } else {
        // Local mode
        const localSessions = [...sessions];
        const sIndex = localSessions.findIndex(s => s.id === targetSessionId);
        if (sIndex !== -1 && localSessions[sIndex].ejercicios) {
          // Find last exercise of target_group === targetGroupId
          const exercises = localSessions[sIndex].ejercicios;
          let foundIndex = -1;
          for (let i = exercises.length - 1; i >= 0; i--) {
            if (exercises[i].target_group === targetGroupId) {
              foundIndex = i;
              break;
            }
          }
          if (foundIndex !== -1) {
            exercises.splice(foundIndex, 1);
            saveSessionsLocal(selectedMicro.id, localSessions);
            setSessions(localSessions);
            setHasUnsavedChanges(true);
          }
        }
      }
    } catch (err) {
      console.error("Error removing last exercise of group:", err);
      setErrorMsg("Error al quitar ejercicio.");
    }
  };

  const handleToggleFocusGroup = async (targetGroupId: string, currentlyHasExercises: boolean) => {
    if (!selectedMicro) return;
    
    if (currentlyHasExercises) {
      // "SACAR" - Remove all exercises of this target group
      const targetSessionId = activeDaySessions.length > 0 ? activeDaySessions[0].id : null;
      if (!targetSessionId) return;

      try {
        if (isDbMode) { // Offline edit during focus group removal
          const { data: existingExs, error: errFetch } = await supabase
            .from('fisica_gimnasio_ejercicio')
            .select('*')
            .eq('sesion_id', targetSessionId);

          if (errFetch) throw errFetch;

          const exercisesToDelete = (existingExs || []).filter(e => {
            const unpacked = unpackGrupoMuscular(e.grupo_muscular);
            return unpacked.targetGroup === targetGroupId;
          });

          const idsToDelete = exercisesToDelete.map(e => e.id);

          if (idsToDelete.length > 0) {
            const { error: errDel } = await supabase
              .from('fisica_gimnasio_ejercicio')
              .delete()
              .in('id', idsToDelete);
            
            if (errDel) throw errDel;
            await fetchSessionsForMicro(selectedMicro.id);
          }
        } else {
          // Local Mode
          const localSessions = [...sessions];
          const sIndex = localSessions.findIndex(s => s.id === targetSessionId);
          if (sIndex !== -1 && localSessions[sIndex].ejercicios) {
            localSessions[sIndex].ejercicios = localSessions[sIndex].ejercicios.filter(
              (ex: any) => ex.target_group !== targetGroupId
            );
            saveSessionsLocal(selectedMicro.id, localSessions);
            setSessions(localSessions);
            setHasUnsavedChanges(true);
          }
        }
      } catch (err) {
        console.error("Error removing focus group:", err);
        setErrorMsg("Error al desincorporar el foco.");
      }
    } else {
      // "INCORPORAR" - Add predefined exercises (auto-assign for this single group)
      try {
        const targetSessionId = await ensureActiveSessionExist();
        if (!targetSessionId) return;

        let exercisesToInsert: any[] = [];
        if (isDbMode) {
          try {
            const { data, error } = await supabase
              .from('fisica_gimnasio_ejercicio_plantilla')
              .select('*')
              .eq('target_group', targetGroupId);
            
            if (!error && data && data.length > 0) {
              exercisesToInsert = data;
            }
          } catch (dbErr) {
            console.warn(`Error loading templates for group ${targetGroupId}:`, dbErr);
          }
        }

        if (exercisesToInsert.length === 0) {
          exercisesToInsert = PREDEFINED_FOCUS_EXERCISES.filter(ex => ex.target_group === targetGroupId);
        }

        // Limit auto-assignment to a maximum of 2 exercises
        exercisesToInsert = exercisesToInsert.slice(0, 2);

        if (exercisesToInsert.length === 0) {
          // Add a single default exercise if none pre-defined
          exercisesToInsert = [{
            target_group: targetGroupId,
            grupo_muscular: 'General',
            ejercicio: 'Ejercicio base foco',
            equipamiento: 'Ninguno',
            tecnica_ejecucion: '',
            series: 3,
            repeticiones: '10',
            carga_kg: '0',
            rpe_sugerido: 7
          }];
        }

        if (isDbMode) { // Offline edit during focus group assignment
          // Fetch existing to get orderIndex
          const { data: existingExs } = await supabase
            .from('fisica_gimnasio_ejercicio')
            .select('id')
            .eq('sesion_id', targetSessionId);
          
          let orderIndex = existingExs ? existingExs.length : 0;

          const inserts = exercisesToInsert.map(ex => ({
            sesion_id: targetSessionId,
            grupo_muscular: packGrupoMuscular(ex.grupo_muscular, targetGroupId),
            ejercicio: ex.ejercicio,
            equipamiento: ex.equipamiento || 'Ninguno',
            tecnica_ejecucion: ex.tecnica_ejecucion || '',
            series: Number(ex.series) || 3,
            repeticiones: ex.repeticiones || '10',
            carga_kg: ex.carga_kg || '0',
            rpe_sugerido: Number(ex.rpe_sugerido) || 7,
            orden: orderIndex++
          }));

          const { error } = await supabase
            .from('fisica_gimnasio_ejercicio')
            .insert(inserts);

          if (error) throw error;
          await fetchSessionsForMicro(selectedMicro.id);
        } else {
          // Local mode
          const localSessions = [...sessions];
          const sIndex = localSessions.findIndex(s => s.id === targetSessionId);
          if (sIndex !== -1) {
            if (!localSessions[sIndex].ejercicios) {
              localSessions[sIndex].ejercicios = [];
            }
            exercisesToInsert.forEach(ex => {
              localSessions[sIndex].ejercicios.push({
                id: Date.now() + Math.random(),
                grupo_muscular: ex.grupo_muscular,
                ejercicio: ex.ejercicio,
                equipamiento: ex.equipamiento || 'Ninguno',
                tecnica_ejecucion: ex.tecnica_ejecucion || '',
                series: Number(ex.series) || 3,
                repeticiones: ex.repeticiones || '10',
                carga_kg: ex.carga_kg || '0',
                rpe_sugerido: Number(ex.rpe_sugerido) || 7,
                target_group: targetGroupId
              });
            });
            saveSessionsLocal(selectedMicro.id, localSessions);
            setSessions(localSessions);
            setHasUnsavedChanges(true);
          }
        }
      } catch (err) {
        console.error("Error incorporating focus group:", err);
        setErrorMsg("Error al incorporar el foco.");
      }
    }
  };

  const handleAutoAssignAllActiveFocusGroups = async () => {
    if (!selectedMicro) return;

    let targetSessionId: string | number = '';
    const daySessions = sessions.filter(s => s.dia_semana === selectedDia);

    try {
      // 1. Get all active focus groups
      const activeGroups = TARGET_GROUPS_CONFIG.filter(g => {
        // Only include specific focus group IDs (exclude general ones)
        if (['GENERALES_SUPERIOR', 'CORE_ZONA_MEDIA', 'GENERALES_INFERIOR'].includes(g.id)) return false;
        
        const primaryPlayers = nominatedPlayers.filter(p => p.recommendation?.group === g.id);
        const secondaryPlayers = nominatedPlayers.filter(p => p.recommendation?.secondaryGroup === g.id);
        const totalCount = primaryPlayers.length + secondaryPlayers.length;
        if (g.id !== 'TODOS' && totalCount === 0) return false;
        if (g.id === 'TODOS' && nominatedPlayers.length === 0) return false;
        return true;
      });

      if (activeGroups.length === 0) {
        setErrorMsg("No hay focos de trabajo activos con jugadores asignados en este microciclo.");
        return;
      }

      // 2. Check if there is an active session for today. If not, create one.
      let currentLocalSessions = [...sessions];
      if (daySessions.length > 0) {
        targetSessionId = daySessions[0].id;
      } else {
        const defaultSessionName = `Trabajo Específico - ${selectedDia}`;
        const sessionPayload = {
          microcycle_id: selectedMicro.id,
          dia_semana: selectedDia,
          fecha_sesion: null,
          nombre_sesion: defaultSessionName,
          observaciones: 'Sesión creada automáticamente para trabajo neuromuscular específico.'
        };

        if (isDbMode) { // Offline edit during auto-assign session creation
          const { data, error } = await supabase
            .from('fisica_gimnasio_sesion')
            .insert([sessionPayload])
            .select()
            .single();

          if (error) throw error;
          targetSessionId = data.id;
        } else {
          // Local fallback
          const newSessionId = Date.now() + Math.random();
          const newLocalSession = {
            id: newSessionId,
            ...sessionPayload,
            ejercicios: []
          };
          currentLocalSessions.push(newLocalSession);
          targetSessionId = newSessionId;
          saveSessionsLocal(selectedMicro.id, currentLocalSessions);
          setSessions(currentLocalSessions);
        }
      }

      // 3. For each active group, collect the 3 predefined exercises
      let allExercisesToInsert: any[] = [];

      for (const group of activeGroups) {
        let exercisesToInsert: any[] = [];
        const targetGroupId = group.id;

        if (isDbMode) {
          try {
            const { data, error } = await supabase
              .from('fisica_gimnasio_ejercicio_plantilla')
              .select('*')
              .eq('target_group', targetGroupId);
            
            if (!error && data && data.length > 0) {
              exercisesToInsert = data;
            }
          } catch (dbErr) {
            console.warn(`Error loading template exercises from Supabase for ${targetGroupId}, using local fallback:`, dbErr);
          }
        }

        // Fallback to local templates if empty or offline
        if (exercisesToInsert.length === 0) {
          exercisesToInsert = PREDEFINED_FOCUS_EXERCISES.filter(ex => ex.target_group === targetGroupId);
        }

        // Limit auto-assignment to a maximum of 2 exercises
        exercisesToInsert = exercisesToInsert.slice(0, 2);

        if (exercisesToInsert.length > 0) {
          allExercisesToInsert.push({
            targetGroupId,
            exercises: exercisesToInsert
          });
        }
      }

      if (allExercisesToInsert.length === 0) {
        setErrorMsg("No se encontraron ejercicios predefinidos para ningún foco activo.");
        return;
      }

      // 4. Batch Insert the exercises
      if (isDbMode) { // Offline edit during auto-assign exercise batch insertion
        // Fetch current exercises count to set orden
        const { data: existingExs } = await supabase
          .from('fisica_gimnasio_ejercicio')
          .select('id')
          .eq('sesion_id', targetSessionId);

        let orderIndex = existingExs ? existingExs.length : 0;
        const inserts: any[] = [];

        allExercisesToInsert.forEach(groupEx => {
          groupEx.exercises.forEach((ex: any) => {
            inserts.push({
              sesion_id: targetSessionId,
              grupo_muscular: packGrupoMuscular(ex.grupo_muscular, groupEx.targetGroupId),
              ejercicio: ex.ejercicio,
              equipamiento: ex.equipamiento || 'Ninguno',
              tecnica_ejecucion: ex.tecnica_ejecucion || '',
              series: Number(ex.series) || 3,
              repeticiones: ex.repeticiones || '10',
              carga_kg: ex.carga_kg || '0',
              rpe_sugerido: Number(ex.rpe_sugerido) || 7,
              orden: orderIndex++
            });
          });
        });

        if (inserts.length > 0) {
          const { error: errEx } = await supabase
            .from('fisica_gimnasio_ejercicio')
            .insert(inserts);

          if (errEx) throw errEx;
        }
      } else {
        // Local fallback
        const localSessions = [...currentLocalSessions];
        const sIndex = localSessions.findIndex(s => s.id === targetSessionId);
        if (sIndex !== -1) {
          if (!localSessions[sIndex].ejercicios) {
            localSessions[sIndex].ejercicios = [];
          }
          
          allExercisesToInsert.forEach(groupEx => {
            groupEx.exercises.forEach((ex: any) => {
              localSessions[sIndex].ejercicios.push({
                id: Date.now() + Math.random(),
                grupo_muscular: ex.grupo_muscular,
                ejercicio: ex.ejercicio,
                equipamiento: ex.equipamiento || 'Ninguno',
                tecnica_ejecucion: ex.tecnica_ejecucion || '',
                series: Number(ex.series) || 3,
                repeticiones: ex.repeticiones || '10',
                carga_kg: ex.carga_kg || '0',
                rpe_sugerido: Number(ex.rpe_sugerido) || 7,
                target_group: groupEx.targetGroupId
              });
            });
          });

          saveSessionsLocal(selectedMicro.id, localSessions);
          setSessions(localSessions);
          setHasUnsavedChanges(true);
        }
      }

      // 5. Reload sessions
      if (isDbMode) { // Offline edit bypasses reload
        await fetchSessionsForMicro(selectedMicro.id);
      }
      setErrorMsg(null); // Clear errors
    } catch (err: any) {
      console.error("Error auto-assigning all active focus groups:", err);
      setErrorMsg("Error al realizar la auto-asignación masiva.");
    }
  };

  const handleAutoAssignGeneralFocusGroups = async () => {
    if (!selectedMicro) return;

    let targetSessionId: string | number = '';
    const daySessions = sessions.filter(s => s.dia_semana === selectedDia);

    try {
      // 1. Get all general groups
      const generalGroups = TARGET_GROUPS_CONFIG.filter(g => 
        ['GENERALES_SUPERIOR', 'CORE_ZONA_MEDIA', 'GENERALES_INFERIOR'].includes(g.id)
      );

      // 2. Check if there is an active session for today. If not, create one.
      let currentLocalSessions = [...sessions];
      if (daySessions.length > 0) {
        targetSessionId = daySessions[0].id;
      } else {
        const defaultSessionName = `Trabajo General - ${selectedDia}`;
        const sessionPayload = {
          microcycle_id: selectedMicro.id,
          dia_semana: selectedDia,
          fecha_sesion: null,
          nombre_sesion: defaultSessionName,
          observaciones: 'Sesión creada automáticamente para trabajo general.'
        };

        if (isDbMode) { // Offline edit during auto-assign general session creation
          const { data, error } = await supabase
            .from('fisica_gimnasio_sesion')
            .insert([sessionPayload])
            .select()
            .single();

          if (error) throw error;
          targetSessionId = data.id;
        } else {
          const newSessionId = Date.now() + Math.random();
          const newLocalSession = {
            id: newSessionId,
            ...sessionPayload,
            ejercicios: []
          };
          currentLocalSessions.push(newLocalSession);
          targetSessionId = newSessionId;
          saveSessionsLocal(selectedMicro.id, currentLocalSessions);
          setSessions(currentLocalSessions);
        }
      }

      // 3. For each general group, collect predefined exercises
      let allExercisesToInsert: any[] = [];

      for (const group of generalGroups) {
        let exercisesToInsert: any[] = [];
        const targetGroupId = group.id;

        if (isDbMode) {
          try {
            const { data, error } = await supabase
              .from('fisica_gimnasio_ejercicio_plantilla')
              .select('*')
              .eq('target_group', targetGroupId);
            
            if (!error && data && data.length > 0) {
              exercisesToInsert = data;
            }
          } catch (dbErr) {
            console.warn(`Error loading template exercises for ${targetGroupId}, using fallback:`, dbErr);
          }
        }

        if (exercisesToInsert.length === 0) {
          exercisesToInsert = PREDEFINED_FOCUS_EXERCISES.filter(ex => ex.target_group === targetGroupId);
        }

        // Limit auto-assignment to a maximum of 2 exercises
        exercisesToInsert = exercisesToInsert.slice(0, 2);

        if (exercisesToInsert.length > 0) {
          allExercisesToInsert.push({
            targetGroupId,
            exercises: exercisesToInsert
          });
        }
      }

      if (allExercisesToInsert.length === 0) {
        setErrorMsg("No se encontraron ejercicios predefinidos para ningún foco general.");
        return;
      }

      // 4. Batch Insert
      if (isDbMode) { // Offline edit during auto-assign general exercise batch insertion
        const { data: existingExs } = await supabase
          .from('fisica_gimnasio_ejercicio')
          .select('id')
          .eq('sesion_id', targetSessionId);

        let orderIndex = existingExs ? existingExs.length : 0;
        const inserts: any[] = [];

        allExercisesToInsert.forEach(groupEx => {
          groupEx.exercises.forEach((ex: any) => {
            inserts.push({
              sesion_id: targetSessionId,
              grupo_muscular: packGrupoMuscular(ex.grupo_muscular, groupEx.targetGroupId),
              ejercicio: ex.ejercicio,
              equipamiento: ex.equipamiento || 'Ninguno',
              tecnica_ejecucion: ex.tecnica_ejecucion || '',
              series: Number(ex.series) || 3,
              repeticiones: ex.repeticiones || '10',
              carga_kg: ex.carga_kg || '0',
              rpe_sugerido: Number(ex.rpe_sugerido) || 7,
              orden: orderIndex++
            });
          });
        });

        if (inserts.length > 0) {
          const { error: errEx } = await supabase
            .from('fisica_gimnasio_ejercicio')
            .insert(inserts);

          if (errEx) throw errEx;
        }
      } else {
        const localSessions = [...currentLocalSessions];
        const sIndex = localSessions.findIndex(s => s.id === targetSessionId);
        if (sIndex !== -1) {
          if (!localSessions[sIndex].ejercicios) {
            localSessions[sIndex].ejercicios = [];
          }
          
          allExercisesToInsert.forEach(groupEx => {
            groupEx.exercises.forEach((ex: any) => {
              localSessions[sIndex].ejercicios.push({
                id: Date.now() + Math.random(),
                grupo_muscular: ex.grupo_muscular,
                ejercicio: ex.ejercicio,
                equipamiento: ex.equipamiento || 'Ninguno',
                tecnica_ejecucion: ex.tecnica_ejecucion || '',
                series: Number(ex.series) || 3,
                repeticiones: ex.repeticiones || '10',
                carga_kg: ex.carga_kg || '0',
                rpe_sugerido: Number(ex.rpe_sugerido) || 7,
                target_group: groupEx.targetGroupId
              });
            });
          });

          saveSessionsLocal(selectedMicro.id, localSessions);
          setSessions(localSessions);
          setHasUnsavedChanges(true);
        }
      }

      if (isDbMode) { // Offline edit bypasses reload
        await fetchSessionsForMicro(selectedMicro.id);
      }
      setErrorMsg(null);
    } catch (err: any) {
      console.error("Error auto-assigning general focus groups:", err);
      setErrorMsg("Error al realizar la auto-asignación general.");
    }
  };

  // Load Microcycles (simulated or Supabase)
  useEffect(() => {
    fetchMicrocycles()
  }, [])

  // Refetch sessions and nominated players when microcycle changes
  useEffect(() => {
    if (selectedMicro) {
      fetchSessionsForMicro(selectedMicro.id)
      fetchNominatedPlayers(selectedMicro.id)
      setHasUnsavedChanges(false)

      // Load individual pautas from localStorage
      const storedPautas = localStorage.getItem(`lr-gym-individual-pautas-${selectedMicro.id}`)
      if (storedPautas) {
        try {
          setIndividualPautas(JSON.parse(storedPautas))
        } catch (e) {
          setIndividualPautas({})
        }
      } else {
        setIndividualPautas({})
      }
    }
  }, [selectedMicro])

  const fetchNominatedPlayers = async (microId: number) => {
    setLoadingPlayers(true)
    let playerIds: number[] = []

    try {
      // 1. Fetch citations
      if (microId < 0) {
        // Local microcycle fallback
        const stored = localStorage.getItem(`lr-performance-local-citations-${microId}`)
        if (stored) {
          playerIds = JSON.parse(stored)
        }
      } else {
        const { data: citations, error: errCitations } = await supabase
          .from('citaciones')
          .select('player_id')
          .eq('microcycle_id', microId)
        
        if (!errCitations && citations) {
          playerIds = citations.map(c => c.player_id)
        }
      }

      // Fetch evaluations for these players
      let imtpRecords: any[] = []
      let cmjRecords: any[] = []
      let reboundRecords: any[] = []

      if (playerIds.length > 0) {
        try {
          const [imtpRes, cmjRes, reboundRes] = await Promise.all([
            supabase.from('evaluaciones_imtp').select('*').in('player_id', playerIds),
            supabase.from('evaluaciones_cmj').select('*').in('player_id', playerIds),
            supabase.from('evaluaciones_cmj_rebound').select('*').in('player_id', playerIds)
          ])

          if (imtpRes.data) imtpRecords = imtpRes.data
          if (cmjRes.data) cmjRecords = cmjRes.data
          if (reboundRes.data) reboundRecords = reboundRes.data
        } catch (evalErr) {
          console.warn("Error fetching physical evaluations for gym recommendation:", evalErr)
        }
      }

      // 2. Fetch players profiles
      const { data: players, error: errPlayers } = await supabase
        .from('players')
        .select('player_id, nombre, apellido1, apellido2, posicion, id_club')

      let filtered: any[] = []

      if (!errPlayers && players) {
        // Filter players that are nominated and attach evaluation recommendations
        filtered = players.filter(p => playerIds.includes(p.player_id)).map(p => {
          // Get player's individual evaluations
          const playerImtps = imtpRecords
            .filter((i: any) => i.player_id === p.player_id)
            .sort((a: any, b: any) => new Date(b.fecha_test || b.fecha || 0).getTime() - new Date(a.fecha_test || a.fecha || 0).getTime());

          const playerCmjs = cmjRecords
            .filter((c: any) => c.player_id === p.player_id)
            .sort((a: any, b: any) => new Date(b.fecha_test || b.fecha || 0).getTime() - new Date(a.fecha_test || a.fecha || 0).getTime());

          const playerRebounds = reboundRecords
            .filter((r: any) => r.player_id === p.player_id)
            .sort((a: any, b: any) => new Date(b.fecha_test || b.fecha || 0).getTime() - new Date(a.fecha_test || a.fecha || 0).getTime());

          const latestImtp = playerImtps[0] || null;
          const latestCmj = playerCmjs[0] || null;
          const latestRebound = playerRebounds[0] || null;

          // Normalize values
          let fRel = 0;
          if (latestImtp) {
            fRel = Number(latestImtp['Peak Vertical Force / BM [N/kg]'] || latestImtp.imtp_f_relativa_n_kg || 0);
          }
          let rsiMod = 0;
          if (latestCmj) {
            rsiMod = Number(latestCmj.rsi_modified_m_s || latestCmj.cmj_rsi_mod || 0);
          }
          let rsiRebound = 0;
          if (latestRebound) {
            rsiRebound = Number(latestRebound.rebound_rsi || 0);
          }

          // Evaluate recommendation: Principal and Secundario prescribed profiles
          let recGroup = 'TODOS';
          let secGroup = 'PLIOMETRIA_EXTENSIVA'; // Default plyometric secondary
          const reasons: string[] = [];

          const imtpBajo = fRel > 0 && fRel < 35;
          const cmjBajo = rsiMod > 0 && rsiMod < 0.45;
          const reboundBajo = rsiRebound > 0 && rsiRebound < 1.5;

          if (imtpBajo) reasons.push(`F. Relativa Baja (${fRel.toFixed(1)} N/kg)`);
          if (cmjBajo) reasons.push(`RSI Modificado Bajo (${rsiMod.toFixed(2)})`);
          if (reboundBajo) reasons.push(`RSI Reactivo Bajo (${rsiRebound.toFixed(2)})`);

          if (imtpBajo) {
            recGroup = 'FUERZA_MAXIMA';
            if (reboundBajo) {
              secGroup = 'PLIOMETRIA_INTENSIVA';
            } else {
              secGroup = 'PLIOMETRIA_EXTENSIVA';
            }
          } else if (cmjBajo) {
            recGroup = 'FUERZA_EXPLOSIVA';
            if (reboundBajo) {
              secGroup = 'PLIOMETRIA_INTENSIVA';
            } else {
              secGroup = 'SALTOS_CON_CARGA';
            }
          } else if (reboundBajo) {
            recGroup = 'PLIOMETRIA_INTENSIVA';
            secGroup = 'PLIOMETRIA_EXTENSIVA';
          } else {
            if (fRel > 0 || rsiMod > 0 || rsiRebound > 0) {
              recGroup = 'FUERZA_EXPLOSIVA';
              reasons.push('Fuerza base óptima (Mantenimiento)');
            } else {
              recGroup = 'TODOS';
              reasons.push('Sin evaluaciones registradas');
            }

            // Assign a suitable plyometric profile as secondary based on position or reactive power
            const pos = (p.posicion || '').toUpperCase();
            if (pos.includes('VOLANTE') || pos.includes('EXTREMO') || pos.includes('DELANTERO')) {
              secGroup = 'PLIOMETRIA_INTENSIVA';
            } else {
              secGroup = 'PLIOMETRIA_EXTENSIVA';
            }
          }

          return {
            player_id: p.player_id,
            name: `${p.nombre || ''} ${p.apellido1 || ''} ${p.apellido2 || ''}`.trim() || `Jugador #${p.player_id}`,
            position: p.posicion || 'N/A',
            id_club: p.id_club,
            recommendation: {
              group: recGroup,
              secondaryGroup: secGroup,
              reason: reasons.join(', '),
              metrics: { fRel, rsiMod, rsiRebound }
            }
          };
        });
        setNominatedPlayers(filtered)
      } else {
        setNominatedPlayers([])
      }

      // 3. Load player assignments or fall back to their auto-aligned evaluations group
      const storedAssignments = localStorage.getItem(`lr-gym-player-assignments-${microId}`)
      let assignments: Record<number, string> = {}
      if (storedAssignments) {
        assignments = JSON.parse(storedAssignments)
      }
      
      // Auto-assign/align every player according to their evaluation recommendation
      filtered.forEach(p => {
        assignments[p.player_id] = p.recommendation?.group || 'TODOS';
      });
      setPlayerAssignments(assignments)
    } catch (e) {
      console.error("Error loading nominated players:", e)
      setNominatedPlayers([])
    } finally {
      setLoadingPlayers(false)
    }
  }

  const savePlayerAssignment = (playerId: number, group: string) => {
    const updated = {
      ...playerAssignments,
      [playerId]: group
    }
    setPlayerAssignments(updated)
    if (selectedMicro) {
      localStorage.setItem(`lr-gym-player-assignments-${selectedMicro.id}`, JSON.stringify(updated))
    }
  }

  const saveIndividualPautas = (updated: Record<number, any>) => {
    setIndividualPautas(updated)
    if (selectedMicro) {
      localStorage.setItem(`lr-gym-individual-pautas-${selectedMicro.id}`, JSON.stringify(updated))
    }
  }

  const autoAssignAllPlayersByEvaluations = () => {
    if (nominatedPlayers.length === 0) return;
    if (!window.confirm("¿Estás seguro de asignar automáticamente a todos los jugadores según sus evaluaciones físicas más recientes?")) return;

    const updated = { ...playerAssignments };
    nominatedPlayers.forEach(p => {
      if (p.recommendation && p.recommendation.group && p.recommendation.group !== 'TODOS') {
        updated[p.player_id] = p.recommendation.group;
      }
    });

    setPlayerAssignments(updated);
    if (selectedMicro) {
      localStorage.setItem(`lr-gym-player-assignments-${selectedMicro.id}`, JSON.stringify(updated));
    }
  };

  const handleSaveToSupabase = async () => {
    if (!selectedMicro) return
    setSavingToDb(true)
    setErrorMsg(null)

    try {
      // 1. Delete all existing sessions for this microcycle in Supabase
      const { error: deleteErr } = await supabase
        .from('fisica_gimnasio_sesion')
        .delete()
        .eq('microcycle_id', selectedMicro.id)

      if (deleteErr) {
        console.warn("Error deleting previous sessions:", deleteErr.message)
      }

      // 2. For each session in our local state, insert it and its exercises
      for (const session of sessions) {
        const sessionPayload = {
          microcycle_id: selectedMicro.id,
          dia_semana: session.dia_semana,
          fecha_sesion: session.fecha_sesion || null,
          nombre_sesion: session.nombre_sesion,
          observaciones: session.observaciones
        }

        const { data: insertedSession, error: insertSessionErr } = await supabase
          .from('fisica_gimnasio_sesion')
          .insert([sessionPayload])
          .select()
          .single()

        if (insertSessionErr) throw insertSessionErr

        if (session.ejercicios && session.ejercicios.length > 0) {
          const exercisesPayload = session.ejercicios.map((e, index) => ({
            sesion_id: insertedSession.id,
            grupo_muscular: packGrupoMuscular(e.grupo_muscular, e.target_group || 'TODOS'),
            ejercicio: e.ejercicio,
            equipamiento: e.equipamiento || 'Ninguno',
            tecnica_ejecucion: e.tecnica_ejecucion || '',
            series: Number(e.series) || 3,
            repeticiones: e.repeticiones || '10',
            carga_kg: e.carga_kg || '0',
            rpe_sugerido: e.rpe_sugerido !== undefined && e.rpe_sugerido !== null ? Number(e.rpe_sugerido) : null,
            orden: index
          }))

          const { error: insertExercisesErr } = await supabase
            .from('fisica_gimnasio_ejercicio')
            .insert(exercisesPayload)

          if (insertExercisesErr) throw insertExercisesErr
        }
      }

      // 3. Reload sessions from database to have clean DB generated IDs
      await fetchSessionsForMicro(selectedMicro.id)
      
      // 4. Save to local storage as well to keep them in sync
      saveSessionsLocal(selectedMicro.id, sessions)

      setHasUnsavedChanges(false)
      alert("¡Cambios de sesión y ejercicios guardados exitosamente en Supabase!")
    } catch (err: any) {
      console.error("Error saving sessions to Supabase:", err)
      setErrorMsg(err.message || "Error al guardar los cambios en Supabase.")
      alert("Error al guardar en Supabase: " + (err.message || "Error desconocido."))
    } finally {
      setSavingToDb(false)
    }
  }

  const fetchMicrocycles = async () => {
    setLoadingMicros(true)
    setErrorMsg(null)
    let dbMicros: any[] = []

    try {
      const { data, error } = await supabase
        .from('microcycles')
        .select('*')
        .order('start_date', { ascending: false })

      if (!error && data) {
        dbMicros = data
      } else if (error) {
        console.warn("Error cargando microciclos desde Supabase:", error.message)
      }
    } catch (err: any) {
      console.error(err)
    }

    // Load from localStorage as fallback
    let localMicros: any[] = []
    try {
      const stored = localStorage.getItem('lr-performance-local-microcycles')
      if (stored) {
        localMicros = JSON.parse(stored)
      }
    } catch (e) {}

    // Combine and format
    const allMicrosMap = [...localMicros, ...dbMicros].map(m => ({
      ...m,
      nombre_display: m.type ? m.type.toUpperCase() : 'MICROCICLO',
      session_count: 0 // Will load count dynamically or keep static
    }))

    // Remove duplicates
    const seenIds = new Set()
    const uniqueMicros = allMicrosMap.filter(m => {
      if (seenIds.has(m.id)) return false
      seenIds.add(m.id)
      return true
    })

    setMicrociclos(uniqueMicros)
    setLoadingMicros(false)
  }

  // Load Sessions for Selected Microcycle
  const fetchSessionsForMicro = async (microId: number) => {
    setLoadingSessions(true)
    setErrorMsg(null)
    setIsDbMode(true)

    try {
      // Intentamos traer las sesiones de Supabase
      const { data: dbSessions, error: errSessions } = await supabase
        .from('fisica_gimnasio_sesion')
        .select('*')
        .eq('microcycle_id', microId)

      if (!errSessions && dbSessions) {
        // Traer los ejercicios de esas sesiones
        const sessionIds = dbSessions.map(s => s.id)
        if (sessionIds.length > 0) {
          const { data: dbExercises, error: errExercises } = await supabase
            .from('fisica_gimnasio_ejercicio')
            .select('*')
            .in('sesion_id', sessionIds)
            .order('orden', { ascending: true })

          const mapped: GymSession[] = dbSessions.map(s => ({
            ...s,
            ejercicios: (dbExercises || []).filter(e => e.sesion_id === s.id).map(e => {
              const unpacked = unpackGrupoMuscular(e.grupo_muscular);
              return {
                ...e,
                grupo_muscular: unpacked.grupoMuscular,
                target_group: unpacked.targetGroup
              }
            })
          }))
          setSessions(mapped)
        } else {
          setSessions([])
        }
      } else {
        // Si hay error en la tabla (ej: no existe), activamos fallback local
        if (errSessions?.message.includes('relation') || errSessions?.message.includes('does not exist')) {
          console.warn("La tabla no existe en Supabase. Usando Local Storage como fallback.");
          setIsDbMode(false)
          loadLocalSessions(microId)
        } else {
          setErrorMsg(errSessions?.message || "Error al conectar con la base de datos.")
          setIsDbMode(false)
          loadLocalSessions(microId)
        }
      }
    } catch (e: any) {
      console.warn("Falla de conexión Supabase, usando Local Storage:", e)
      setIsDbMode(false)
      loadLocalSessions(microId)
    } finally {
      setLoadingSessions(false)
    }
  }

  const loadLocalSessions = (microId: number) => {
    try {
      const stored = localStorage.getItem(`lr-gym-sessions-${microId}`)
      if (stored) {
        const parsed: GymSession[] = JSON.parse(stored)
        const unpacked = parsed.map(s => ({
          ...s,
          ejercicios: (s.ejercicios || []).map(e => {
            const unpackedGM = unpackGrupoMuscular(e.grupo_muscular);
            return {
              ...e,
              grupo_muscular: unpackedGM.grupoMuscular,
              target_group: unpackedGM.targetGroup
            }
          })
        }))
        setSessions(unpacked)
      } else {
        setSessions([])
      }
    } catch (e) {
      setSessions([])
    }
  }

  const saveSessionsLocal = (microId: number, updatedSessions: GymSession[]) => {
    try {
      const packedSessions = updatedSessions.map(s => ({
        ...s,
        ejercicios: (s.ejercicios || []).map(e => ({
          ...e,
          grupo_muscular: packGrupoMuscular(e.grupo_muscular, e.target_group || 'TODOS')
        }))
      }))
      localStorage.setItem(`lr-gym-sessions-${microId}`, JSON.stringify(packedSessions))
    } catch (e) {
      console.error("Error guardando localmente:", e)
    }
  }

  // Categories helper
  const formatCategoryLabel = (catId: any) => {
    if (typeof catId === 'number') {
      const categoryKey = REVERSE_CATEGORY_ID_MAP[catId];
      if (categoryKey) {
        return categoryKey.replace('_', ' ').toUpperCase();
      }
      return `SUB ${catId}`;
    }
    return String(catId).replace('_', ' ').toUpperCase()
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  // Filtered microcycles
  const filteredMicrociclos = useMemo(() => {
    return microciclos.filter((mc) => {
      if (selectedCategoryFilter === 'TODOS') return true
      
      const catIdMap: Record<string, number> = {
        'sub_13': 1, 'sub_14': 2, 'sub_15': 3, 'sub_16': 4,
        'sub_17': 5, 'sub_18': 6, 'sub_20': 7, 'sub_21': 8,
        'sub_23': 9, 'adulta': 10
      }
      
      const categoryIdTarget = catIdMap[selectedCategoryFilter]
      return mc.category_id === categoryIdTarget || String(mc.category_id) === selectedCategoryFilter
    })
  }, [microciclos, selectedCategoryFilter])

  // Select Microcycle
  const handleSelectMicro = (mc: MicrocicloUI) => {
    setSelectedMicro(mc)
    setViewMode('detail')
    setSelectedDia('Lunes')
  }

  // Filtered exercise suggestion
  const filteredExerciseTemplates = useMemo(() => {
    let baseList = GYM_EXERCISES_DATA;
    const currentTarget = exerciseInput.target_group || 'TODOS';
    if (currentTarget !== 'TODOS') {
      baseList = baseList.filter(ex => ex.target_group === currentTarget);
    }
    if (!exerciseSearchTerm) return baseList;
    return baseList.filter(ex => 
      ex.ejercicio.toLowerCase().includes(exerciseSearchTerm.toLowerCase()) ||
      ex.grupo_muscular.toLowerCase().includes(exerciseSearchTerm.toLowerCase())
    )
  }, [exerciseSearchTerm, exerciseInput.target_group])

  // Handle select exercise suggestion
  const handleSelectTemplate = (template: GymExerciseTemplate) => {
    setSelectedExerciseTemplate(template)
    setExerciseSearchTerm(template.ejercicio)
    setExerciseInput(prev => ({
      ...prev,
      ejercicio: template.ejercicio,
      grupo_muscular: template.grupo_muscular,
      equipamiento: template.equipamiento,
      tecnica_ejecucion: template.tecnica_ejecucion
    }))
    setShowExercisesDropdown(false)
  }

  // Add Exercise to Form list
  const handleAddExerciseToForm = () => {
    if (!exerciseInput.ejercicio) return

    const newEx: GymExercise = {
      id: Date.now() + Math.random(),
      grupo_muscular: exerciseInput.grupo_muscular || 'General',
      ejercicio: exerciseInput.ejercicio,
      equipamiento: exerciseInput.equipamiento || 'Ninguno',
      tecnica_ejecucion: exerciseInput.tecnica_ejecucion || '',
      series: Number(exerciseInput.series),
      repeticiones: exerciseInput.repeticiones,
      carga_kg: exerciseInput.carga_kg,
      rpe_sugerido: Number(exerciseInput.rpe_sugerido),
      target_group: exerciseInput.target_group || 'TODOS'
    }

    setTempExercises(prev => [...prev, newEx])

    // Reset input
    setExerciseInput({
      grupo_muscular: '',
      ejercicio: '',
      equipamiento: '',
      tecnica_ejecucion: '',
      series: 3,
      repeticiones: '10',
      carga_kg: '0',
      rpe_sugerido: 7,
      target_group: 'TODOS'
    })
    setExerciseSearchTerm('')
    setSelectedExerciseTemplate(null)
  }

  const handleRemoveExerciseFromForm = (exId: string | number) => {
    setTempExercises(prev => prev.filter(e => e.id !== exId))
  }

  // Save Session (Database or Local)
  const handleSaveSession = async () => {
    if (!sessionForm.nombre_sesion || !selectedMicro) return

    const sessionPayload: any = {
      microcycle_id: selectedMicro.id,
      dia_semana: sessionForm.dia_semana,
      fecha_sesion: sessionForm.fecha_sesion || null,
      nombre_sesion: sessionForm.nombre_sesion,
      observaciones: sessionForm.observaciones
    }

    if (isDbMode) { // Offline edit during session form saving
      try {
        let savedSessionId: number | string;

        if (editingSession) {
          // Actualización
          const { data, error } = await supabase
            .from('fisica_gimnasio_sesion')
            .update(sessionPayload)
            .eq('id', editingSession.id)
            .select()
            .single()

          if (error) throw error
          savedSessionId = editingSession.id
        } else {
          // Inserción de nueva sesión
          const { data, error } = await supabase
            .from('fisica_gimnasio_sesion')
            .insert([sessionPayload])
            .select()
            .single()

          if (error) throw error
          savedSessionId = data.id
        }

        // Borrar los ejercicios anteriores de esta sesión si editamos
        if (editingSession) {
          await supabase
            .from('fisica_gimnasio_ejercicio')
            .delete()
            .eq('sesion_id', savedSessionId)
        }

        // Insertar los nuevos ejercicios
        if (tempExercises.length > 0) {
          const exercisesPayload = tempExercises.map((e, index) => ({
            sesion_id: savedSessionId,
            grupo_muscular: packGrupoMuscular(e.grupo_muscular, e.target_group || 'TODOS'),
            ejercicio: e.ejercicio,
            equipamiento: e.equipamiento,
            tecnica_ejecucion: e.tecnica_ejecucion,
            series: e.series,
            repeticiones: e.repeticiones,
            carga_kg: e.carga_kg,
            rpe_sugerido: e.rpe_sugerido,
            orden: index
          }))

          const { error: errEx } = await supabase
            .from('fisica_gimnasio_ejercicio')
            .insert(exercisesPayload)

          if (errEx) throw errEx
        }

        // Recargar
        await fetchSessionsForMicro(selectedMicro.id)
        setShowSessionModal(false)
        resetSessionForm()
      } catch (err: any) {
        console.error("Error al guardar sesión en la DB:", err)
        setErrorMsg("Error de base de datos. Guardando localmente en este microciclo...")
        setIsDbMode(false)
        // Fallback inmediato a local
        saveLocalSessionFallback(sessionPayload)
      }
    } else {
      saveLocalSessionFallback(sessionPayload)
      setHasUnsavedChanges(true)
    }
  }

  const saveLocalSessionFallback = (sessionPayload: any) => {
    if (!selectedMicro) return
    let updatedSessions = [...sessions]

    if (editingSession) {
      updatedSessions = updatedSessions.map(s => {
        if (s.id === editingSession.id) {
          return {
            ...s,
            ...sessionPayload,
            ejercicios: tempExercises
          }
        }
        return s
      })
    } else {
      const newLocalSession: GymSession = {
        id: 'local-' + Date.now(),
        microcycle_id: selectedMicro.id,
        ...sessionPayload,
        ejercicios: tempExercises
      }
      updatedSessions.push(newLocalSession)
    }

    setSessions(updatedSessions)
    saveSessionsLocal(selectedMicro.id, updatedSessions)
    setShowSessionModal(false)
    resetSessionForm()
  }

  const handleDeleteSession = async (sessionId: string | number) => {
    if (!window.confirm("¿Estás seguro de eliminar esta sesión de gimnasio?")) return
    if (!selectedMicro) return

    if (isDbMode) { // Offline edit during session deletion
      try {
        const { error } = await supabase
          .from('fisica_gimnasio_sesion')
          .delete()
          .eq('id', sessionId)

        if (error) throw error
        await fetchSessionsForMicro(selectedMicro.id)
      } catch (err: any) {
        console.error("Error al borrar en la DB:", err)
        setErrorMsg(err.message || "Error al borrar de Supabase.")
      }
    } else {
      const updated = sessions.filter(s => s.id !== sessionId)
      setSessions(updated)
      saveSessionsLocal(selectedMicro.id, updated)
      setHasUnsavedChanges(true)
    }
  }

  const handleEditSession = (session: GymSession) => {
    setEditingSession(session)
    setSessionForm({
      nombre_sesion: session.nombre_sesion,
      observaciones: session.observaciones || '',
      dia_semana: session.dia_semana,
      fecha_sesion: session.fecha_sesion || ''
    })
    setTempExercises(session.ejercicios || [])
    setShowSessionModal(true)
  }

  const resetSessionForm = () => {
    setEditingSession(null)
    setSessionForm({
      nombre_sesion: '',
      observaciones: '',
      dia_semana: selectedDia,
      fecha_sesion: ''
    })
    setTempExercises([])
    setExerciseSearchTerm('')
  }

  const handleOpenCreateModal = () => {
    resetSessionForm()
    setSessionForm(prev => ({ ...prev, dia_semana: selectedDia }))
    setShowSessionModal(true)
  }

  // Get active session count per day
  const getDaySessionCount = (dia: string) => {
    return sessions.filter(s => s.dia_semana === dia).length
  }

  // Print PDF
  const handleExportPDF = (session: GymSession) => {
    if (!selectedMicro) return

    const doc = new jsPDF()

    // Title & Header info
    doc.setFillColor(11, 18, 32)
    doc.rect(0, 0, 210, 40, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(22)
    doc.text("PLANIFICACIÓN DE GIMNASIO", 15, 20)

    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text(`MICROCICLO #${selectedMicro.micro_number || selectedMicro.id} - ${formatCategoryLabel(selectedMicro.category_id)}`, 15, 32)

    // Body title
    doc.setTextColor(11, 18, 32)
    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.text(`${session.dia_semana.toUpperCase()} - ${session.nombre_sesion}`, 15, 55)

    if (session.observaciones) {
      doc.setFontSize(10)
      doc.setFont("helvetica", "italic")
      doc.setTextColor(100, 100, 100)
      doc.text(`Observaciones: ${session.observaciones}`, 15, 62)
    }

    // Exercises table
    const tableRows = (session.ejercicios || []).map((e, idx) => [
      idx + 1,
      e.grupo_muscular,
      e.ejercicio,
      e.equipamiento,
      `${e.series} x ${e.repeticiones}`,
      e.carga_kg ? `${e.carga_kg} kg` : 'N/A',
      e.rpe_sugerido ? `RPE ${e.rpe_sugerido}` : 'N/A',
      e.tecnica_ejecucion || 'N/A'
    ])

    autoTable(doc, {
      startY: session.observaciones ? 70 : 62,
      head: [['#', 'Grupo Muscular', 'Ejercicio', 'Equipamiento', 'Series x Reps', 'Peso', 'RPE', 'Técnica de Ejecución']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [207, 27, 43], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 25 },
        2: { cellWidth: 35 },
        3: { cellWidth: 25 },
        4: { cellWidth: 20 },
        5: { cellWidth: 15 },
        6: { cellWidth: 12 },
        7: { cellWidth: 50 }
      }
    })

    // Footer
    const footerY = (doc as any).lastAutoTable.finalY + 15
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text("Chile National Football Federation • Área Física", 15, footerY)

    doc.save(`Gimnasio_${session.dia_semana}_${session.nombre_sesion.replace(/\s+/g, '_')}.pdf`)
  }

  const alignedCount = useMemo(() => {
    return nominatedPlayers.filter(p => {
      const assigned = playerAssignments[p.player_id] || 'TODOS';
      const recommended = p.recommendation?.group || 'TODOS';
      return assigned === recommended;
    }).length;
  }, [nominatedPlayers, playerAssignments]);

  const filteredPlayersList = useMemo(() => {
    if (!playerSearchQuery) return nominatedPlayers;
    const q = playerSearchQuery.toLowerCase();
    return nominatedPlayers.filter(p => p.name.toLowerCase().includes(q));
  }, [nominatedPlayers, playerSearchQuery]);

  // Grid view of microcycles
  if (viewMode === 'grid') {
    return (
      <div className="space-y-8 animate-in fade-in duration-500 pb-20">
        <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-[#0b1220] rounded-2xl flex items-center justify-center text-white shadow-xl">
              <i className="fa-solid fa-dumbbell text-xl"></i>
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">ÁREA FÍSICA - GIMNASIO</h2>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mt-1">Planificación y dosificación de entrenamientos de fuerza.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchMicrocycles}
              className="bg-white text-slate-900 px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2 border border-slate-100"
              title="Sincronizar"
            >
              <i className={`fa-solid fa-rotate-right ${loadingMicros ? 'fa-spin' : ''}`}></i> Sincronizar
            </button>
          </div>
        </div>

        {/* Filtros de Categoría */}
        <div className="flex items-center gap-3 overflow-x-auto pb-4 custom-scrollbar">
          <button
            onClick={() => setSelectedCategoryFilter('TODOS')}
            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap shadow-sm ${
              selectedCategoryFilter === 'TODOS'
                ? 'bg-slate-900 text-white shadow-xl scale-105'
                : 'bg-white text-slate-400 hover:bg-slate-50 border border-slate-100'
            }`}
          >
            TODOS
          </button>
          {Object.values(Category).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategoryFilter(cat)}
              className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap shadow-sm ${
                selectedCategoryFilter === cat
                  ? 'bg-[#CF1B2B] text-white shadow-xl scale-105'
                  : 'bg-white text-slate-400 hover:bg-slate-50 border border-slate-100'
              }`}
            >
              {formatCategoryLabel(cat)}
            </button>
          ))}
        </div>

        {loadingMicros ? (
          <div className="py-32 text-center animate-pulse">
            <i className="fa-solid fa-spinner fa-spin text-slate-200 text-5xl mb-6"></i>
            <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest italic">Sincronizando procesos...</p>
          </div>
        ) : filteredMicrociclos.length === 0 ? (
          <div className="py-32 text-center opacity-40">
            <i className="fa-solid fa-dumbbell text-slate-300 text-6xl mb-6"></i>
            <p className="text-slate-500 font-black uppercase text-xs tracking-widest">No hay microciclos registrados</p>
            <p className="text-slate-400 text-[10px] mt-2">Crea un microciclo en el área de citaciones para comenzar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredMicrociclos.map((mc) => (
              <div
                key={mc.id}
                onClick={() => handleSelectMicro(mc)}
                className="group bg-white rounded-[40px] p-10 border-2 border-slate-50 transition-all cursor-pointer hover:shadow-2xl hover:border-red-200 relative overflow-hidden flex flex-col justify-between min-h-[300px]"
              >
                <div className="flex justify-between items-start mb-6">
                  <span className="bg-blue-600 text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm">
                    {formatCategoryLabel(mc.category_id)}
                  </span>
                  <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 shadow-inner">
                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">PLANIFICAR GIMNASIO</span>
                  </div>
                </div>

                <div className="flex-1 space-y-1">
                  <h3 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter leading-none group-hover:text-[#CF1B2B] transition-colors">
                    {mc.nombre_display} #{(mc as any).micro_number || mc.id}
                  </h3>
                  <p className="text-slate-400 font-bold uppercase text-[12px] tracking-widest">
                    {formatDate(mc.start_date)} - {formatDate(mc.end_date)}
                  </p>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ubicación: {mc.city || 'S/D'}, {mc.country || 'S/D'}</span>
                  <i className="fa-solid fa-arrow-right text-slate-300 group-hover:text-[#CF1B2B] group-hover:translate-x-2 transition-all"></i>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Detail view of selected microcycle
  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header Info */}
      <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setViewMode('grid')}
            className="w-12 h-12 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-all flex items-center justify-center border border-slate-100 text-slate-600"
          >
            <i className="fa-solid fa-chevron-left text-sm"></i>
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">
                {selectedMicro?.nombre_display} #{(selectedMicro as any)?.micro_number || selectedMicro?.id}
              </h2>
              <span className="bg-[#CF1B2B] text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">
                {formatCategoryLabel(selectedMicro?.category_id)}
              </span>
              <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${isDbMode ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                {isDbMode ? 'Sincronizado Supabase' : 'Modo Offline (LocalStorage)'}
              </span>
            </div>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mt-1">
              Rango: {formatDate(selectedMicro?.start_date || '')} - {formatDate(selectedMicro?.end_date || '')}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => selectedMicro && fetchSessionsForMicro(selectedMicro.id)}
            className="bg-white text-slate-900 px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2 border border-slate-100"
          >
            <i className={`fa-solid fa-rotate-right ${loadingSessions ? 'fa-spin' : ''}`}></i> Actualizar
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="bg-[#CF1B2B] text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-red-700 transition-all flex items-center gap-2 transform active:scale-95"
          >
            <i className="fa-solid fa-plus"></i> NUEVA SESIÓN
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-100 text-red-700 px-6 py-4 rounded-2xl flex justify-between items-center">
          <p className="text-xs font-medium">{errorMsg}</p>
          <button onClick={() => setErrorMsg(null)} className="text-xs font-bold underline">Cerrar</button>
        </div>
      )}

        <div className="space-y-8 animate-in fade-in duration-300">
          {/* SECTION: NOMINATED PLAYERS NEUROMUSCULAR PRESCRIPTIONS */}
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-50 pb-5">
              <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => setIsPrescriptionsPanelOpen(!isPrescriptionsPanelOpen)}>
                <div className="w-10 h-10 bg-red-50 text-[#CF1B2B] rounded-xl flex items-center justify-center">
                  <i className="fa-solid fa-users text-lg"></i>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight text-left">Prescripciones Neuromusculares del Microciclo</h3>
                    <span className="bg-slate-100 text-slate-800 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                      {nominatedPlayers.length} Convocados
                    </span>
                    {nominatedPlayers.length > 0 && (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <i className="fa-solid fa-circle-check text-[9px]"></i> 100% Alineados a Evaluación
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5 text-left">
                    Clasificación de cargas de fuerza y pliometría basadas en las últimas evaluaciones de plataforma de fuerza.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end md:self-auto">
                <button
                  onClick={() => setIsPrescriptionsPanelOpen(!isPrescriptionsPanelOpen)}
                  className="text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-50 transition-all flex items-center gap-1.5"
                >
                  <i className={`fa-solid ${isPrescriptionsPanelOpen ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  {isPrescriptionsPanelOpen ? 'Ocultar Nómina' : 'Mostrar Nómina'}
                </button>
              </div>
            </div>

            {isPrescriptionsPanelOpen && (
              <div className="space-y-4 animate-in fade-in duration-300">
                {/* Search and Quick Filters */}
                <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                  <div className="relative w-full sm:w-80">
                    <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                    <input
                      type="text"
                      placeholder="Buscar jugador por nombre..."
                      value={playerSearchQuery}
                      onChange={(e) => setPlayerSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#CF1B2B] focus:bg-white transition-all"
                    />
                  </div>
                  {loadingPlayers && (
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 animate-pulse flex items-center gap-1">
                      <i className="fa-solid fa-circle-notch fa-spin"></i> Cargando nómina...
                    </span>
                  )}
                </div>

                {filteredPlayersList.length === 0 ? (
                  <div className="border border-dashed border-slate-200 rounded-[24px] p-10 text-center text-slate-400">
                    <i className="fa-solid fa-user-slash text-2xl mb-2 text-slate-300"></i>
                    <p className="text-xs font-black uppercase tracking-wider">No se encontraron jugadores convocados</p>
                    <p className="text-[10px] text-slate-400 mt-1 font-semibold">Agrega convocados al microciclo desde la sección de Planificación o Citaciones</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[480px] overflow-y-auto pr-2 custom-scrollbar">
                    {filteredPlayersList.map((player) => {
                      const activePrescription = playerAssignments[player.player_id] || 'TODOS';
                      const recommendedPrescription = player.recommendation?.group || 'TODOS';
                      const secondaryPrescription = player.recommendation?.secondaryGroup || 'CORE_ZONA_MEDIA';
                      const isAligned = true;

                      const recommendedGroupConfig = TARGET_GROUPS_CONFIG.find(g => g.id === recommendedPrescription) || TARGET_GROUPS_CONFIG[0];
                      const secondaryGroupConfig = TARGET_GROUPS_CONFIG.find(g => g.id === secondaryPrescription) || TARGET_GROUPS_CONFIG[0];

                      const metrics = player.recommendation?.metrics || { fRel: 0, rsiMod: 0, rsiRebound: 0 };
                      const isFRelLow = metrics.fRel > 0 && metrics.fRel < 35;
                      const isRsiModLow = metrics.rsiMod > 0 && metrics.rsiMod < 0.45;
                      const isRsiReboundLow = metrics.rsiRebound > 0 && metrics.rsiRebound < 1.5;

                      const focusAreas: string[] = [];
                      if (isFRelLow) focusAreas.push('Fuerza Máxima (F.Rel < 35)');
                      if (isRsiModLow) focusAreas.push('Fuerza Explosiva (RSI M. < 0.45)');
                      if (isRsiReboundLow) focusAreas.push('Pliometría Reactiva (Reactivo < 1.5)');

                      if (focusAreas.length === 0) {
                        if (metrics.fRel > 0 || metrics.rsiMod > 0 || metrics.rsiRebound > 0) {
                          focusAreas.push('Fuerza Base / Mantenimiento');
                        } else {
                          focusAreas.push('General (Sin evaluaciones)');
                        }
                      }

                      // Get initials
                      const initials = player.name
                        ? player.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
                        : 'P';

                      return (
                        <div
                          key={player.player_id}
                          className="bg-white rounded-2xl p-4 border border-slate-100 hover:border-slate-200 transition-all flex flex-col justify-between gap-3 shadow-sm"
                        >
                          {/* Player Info */}
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#0b1220] text-white flex items-center justify-center font-black text-xs uppercase shadow-sm shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight truncate text-left" title={player.name}>
                                {player.name}
                              </h4>
                              <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 tracking-wider truncate text-left">
                                {player.position}
                              </p>
                              {individualPautas[player.player_id]?.activo && (
                                <div className="mt-1 inline-flex items-center gap-1 bg-amber-50 border border-amber-100 text-amber-700 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                                  <i className="fa-solid fa-user-doctor"></i>
                                  <span>{individualPautas[player.player_id].tipo}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Foco de Trabajo / Déficits */}
                          <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100/50 space-y-2">
                            <div className="flex justify-between items-center text-[8px] font-black text-slate-400 uppercase tracking-widest">
                              <span>Foco de Trabajo</span>
                              <span className="text-[#CF1B2B] font-extrabold">Prioridad</span>
                            </div>
                            <div className="space-y-1.5 text-left">
                              {focusAreas.map((area, index) => {
                                const isGeneral = area.includes('Fuerza Base') || area.includes('General');
                                return (
                                  <div key={index} className="flex items-center gap-1.5 text-[10px] text-slate-700 font-bold">
                                    {isGeneral ? (
                                      <i className="fa-solid fa-circle-check text-emerald-500 text-[8px]"></i>
                                    ) : (
                                      <i className="fa-solid fa-triangle-exclamation text-amber-500 text-[8px]"></i>
                                    )}
                                    <span className="truncate">{area}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Prescribed Profiles & Alignment Status */}
                          <div className="space-y-2 pt-2 border-t border-slate-100/70">
                            <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider text-slate-400">
                              <span>Prescripciones:</span>
                              <span className="text-emerald-600 font-black flex items-center gap-1 text-[8px] uppercase tracking-wide">
                                <i className="fa-solid fa-circle-check"></i> Alineado
                              </span>
                            </div>
                            <div className="flex flex-col gap-1.5 text-left">
                              <div className="flex items-center justify-between gap-1.5 bg-slate-50/50 p-1.5 rounded-lg border border-slate-100/40">
                                <span className="text-[8px] font-black uppercase text-slate-500 tracking-wide">Principal:</span>
                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase text-white ${recommendedGroupConfig.colorClass} truncate max-w-[120px]`} title={recommendedGroupConfig.label}>
                                  {recommendedGroupConfig.shortLabel}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-1.5 bg-slate-50/50 p-1.5 rounded-lg border border-slate-100/40">
                                <span className="text-[8px] font-black uppercase text-slate-500 tracking-wide">Secundario:</span>
                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase text-white ${secondaryGroupConfig.colorClass} truncate max-w-[120px]`} title={secondaryGroupConfig.label}>
                                  {secondaryGroupConfig.shortLabel}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedPlayerForExercises(player);
                                setShowPlayerExercisesModal(true);
                              }}
                              className="w-full bg-[#0b1220]/5 hover:bg-[#0b1220] hover:text-white border border-[#0b1220]/10 hover:border-[#0b1220] py-2.5 rounded-xl text-[10px] font-black text-[#0b1220] uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                            >
                              <i className="fa-solid fa-list-check text-[11px]"></i>
                              <span>Ver Tareas Asignadas</span>
                            </button>

                            <button
                              onClick={() => {
                                setSelectedPlayerForPauta(player);
                                setShowIndividualPautaModal(true);
                              }}
                              className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                                individualPautas[player.player_id]?.activo
                                  ? 'bg-[#CF1B2B] text-white hover:bg-[#CF1B2B]/90 border border-[#CF1B2B]'
                                  : 'bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white border border-indigo-100'
                              }`}
                            >
                              <i className="fa-solid fa-user-doctor text-[11px]"></i>
                              <span>Pauta Individual</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Days of the Week Filter */}
          <div className="bg-white rounded-[32px] p-4 border border-slate-100 shadow-sm overflow-x-auto custom-scrollbar">
            <div className="flex items-center gap-2 min-w-max">
              {DIAS_SEMANA.map((dia) => {
                const count = getDaySessionCount(dia)
                const isActive = selectedDia === dia

                return (
                  <button
                    key={dia}
                    onClick={() => setSelectedDia(dia)}
                    className={`flex-1 min-w-[120px] py-4 px-6 rounded-2xl flex flex-col items-center gap-1 transition-all ${
                      isActive
                        ? 'bg-[#0b1220] text-white shadow-xl scale-[1.02]'
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-100/50'
                    }`}
                  >
                    <span className="text-[11px] font-black uppercase tracking-wider">{dia}</span>
                    {count > 0 ? (
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${isActive ? 'bg-[#CF1B2B] text-white' : 'bg-slate-200 text-slate-700'}`}>
                        {count} {count === 1 ? 'SESIÓN' : 'SESIONES'}
                      </span>
                    ) : (
                      <span className="text-[8px] font-bold opacity-40">SIN SESIÓN</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* SECTION: TRABAJOS ESPECÍFICOS */}
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-50 pb-4">
              <div className="flex items-center gap-2.5 text-left">
                <div className="w-8 h-8 bg-slate-50 text-slate-800 rounded-lg flex items-center justify-center border border-slate-100/50">
                  <i className="fa-solid fa-list-check text-sm text-[#CF1B2B]"></i>
                </div>
                <div>
                  <h3 className="text-xs font-black text-[#0b1220] uppercase tracking-wider">TRABAJOS ESPECÍFICOS</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Focos de trabajo neuromusculares y asignaciones contabilizadas</p>
                </div>
              </div>
              {nominatedPlayers.length > 0 && (
                <button
                  onClick={handleAutoAssignAllActiveFocusGroups}
                  className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white border border-indigo-100 hover:border-indigo-600 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer text-[9px] font-black uppercase tracking-wider shadow-sm"
                  title="Auto-asignar un máximo de 2 ejercicios predefinidos para todos los focos activos con jugadores asignados"
                >
                  <i className="fa-solid fa-wand-magic-sparkles text-[10px]"></i>
                  <span>Auto-Asignar Todos los Focos</span>
                </button>
              )}
            </div>

            {nominatedPlayers.length === 0 ? (
              <p className="text-slate-400 text-xs font-semibold py-4 text-center">No hay jugadores convocados con evaluaciones en este microciclo.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-50 text-slate-400 text-[8px] font-black uppercase tracking-widest pb-3">
                      <th className="pb-3 pr-4 w-12 text-center">Inc.</th>
                      <th className="pb-3 pr-4">Foco de Trabajo (Perfil)</th>
                      <th className="pb-3 pr-4 text-center">Ejercicios Asignados</th>
                      <th className="pb-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-[11px] text-slate-700 font-semibold">
                    {TARGET_GROUPS_CONFIG.filter(g => !['GENERALES_SUPERIOR', 'CORE_ZONA_MEDIA', 'GENERALES_INFERIOR'].includes(g.id)).map((g) => {
                      const primaryPlayers = nominatedPlayers.filter(p => p.recommendation?.group === g.id);
                      const secondaryPlayers = nominatedPlayers.filter(p => p.recommendation?.secondaryGroup === g.id);
                      const totalCount = primaryPlayers.length + secondaryPlayers.length;

                      if (g.id !== 'TODOS' && totalCount === 0) return null;
                      if (g.id === 'TODOS' && nominatedPlayers.length === 0) return null;

                      const dayExercises = activeDaySessions.flatMap(s => s.ejercicios || []);
                      const exercisesForGroup = dayExercises.filter(ex => ex.target_group === g.id);
                      const exercisesCount = exercisesForGroup.length;

                      return (
                        <tr key={g.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="py-3 pr-4 text-center">
                            <input
                              type="checkbox"
                              checked={exercisesCount > 0}
                              onChange={() => handleToggleFocusGroup(g.id, exercisesCount > 0)}
                              className="w-4 h-4 rounded border-slate-300 text-[#CF1B2B] focus:ring-[#CF1B2B] cursor-pointer"
                              title={exercisesCount > 0 ? "Quitar foco de la sesión" : "Incorporar foco en la sesión"}
                            />
                          </td>
                          <td className="py-3 pr-4">
                            <span className={`px-2.5 py-1 rounded text-[8px] font-black uppercase text-white ${g.colorClass} inline-block`}>
                              {g.label}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Minus Button */}
                              <button
                                onClick={() => handleRemoveLastExerciseOfGroup(g.id)}
                                disabled={exercisesCount === 0}
                                className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold transition-all border ${
                                  exercisesCount > 0
                                    ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100 hover:border-red-300 cursor-pointer'
                                    : 'bg-slate-50 text-slate-300 border-slate-100 opacity-40 cursor-not-allowed'
                                }`}
                                title="Quitar un ejercicio de este foco"
                              >
                                <i className="fa-solid fa-minus text-[9px]"></i>
                              </button>

                              {/* Exercises Count / Details Pill with Tooltip */}
                              <div className="relative inline-block group">
                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border inline-block select-none ${
                                  exercisesCount > 0
                                    ? 'bg-indigo-50 border-indigo-100 text-indigo-600'
                                    : 'bg-slate-50 border-slate-100 text-slate-400 opacity-60'
                                }`}>
                                  {exercisesCount}
                                </span>
                                {exercisesCount > 0 && (
                                  <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-72 bg-[#0b1220] text-white rounded-xl shadow-xl p-3 text-left border border-slate-800 transition-all">
                                    <div className="text-[9px] font-black uppercase tracking-widest text-[#CF1B2B] mb-2 border-b border-slate-800 pb-1.5 flex items-center gap-1.5">
                                      <i className="fa-solid fa-dumbbell text-[10px]"></i>
                                      <span>Ejercicios Foco: {g.shortLabel}</span>
                                    </div>
                                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar font-medium">
                                      {exercisesForGroup.map((ex, idx) => (
                                        <div key={ex.id || idx} className="text-[10px] leading-relaxed border-b border-slate-800/40 last:border-0 pb-1.5 last:pb-0">
                                          <div className="font-bold text-slate-100 flex justify-between gap-2">
                                            <span>{idx + 1}. {ex.ejercicio}</span>
                                            <span className="text-[#CF1B2B] font-black text-[9px] shrink-0 bg-[#CF1B2B]/10 px-1 rounded">{ex.series}x{ex.repeticiones}</span>
                                          </div>
                                          {ex.equipamiento && ex.equipamiento !== 'Ninguno' && (
                                            <div className="text-[8.5px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider flex items-center gap-1">
                                              <i className="fa-solid fa-toolbox text-[8px]"></i>
                                              <span>{ex.equipamiento}</span>
                                            </div>
                                          )}
                                          {ex.tecnica_ejecucion && (
                                            <div className="text-[8.5px] text-slate-400 italic mt-0.5 line-clamp-1">{ex.tecnica_ejecucion}</div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-[#0b1220] rotate-45 border-r border-b border-slate-800"></div>
                                  </div>
                                )}
                              </div>

                              {/* Plus Button */}
                              <button
                                onClick={() => handleAddNextExerciseOfGroup(g.id)}
                                className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 hover:border-emerald-300 flex items-center justify-center text-xs font-bold transition-all cursor-pointer"
                                title="Agregar un ejercicio predefinido"
                              >
                                <i className="fa-solid fa-plus text-[9px]"></i>
                              </button>
                            </div>
                          </td>
                          <td className="py-3 text-right flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenManageGroupModal(g.id)}
                              className="px-2.5 py-1.5 bg-[#CF1B2B]/10 hover:bg-[#CF1B2B] text-[#CF1B2B] hover:text-white rounded-xl flex items-center gap-1.5 transition-all cursor-pointer text-[9px] font-black uppercase tracking-wider"
                              title={`Gestionar tareas asignadas de ${g.shortLabel}`}
                            >
                              <i className="fa-solid fa-pen-to-square text-[10px]"></i>
                              <span>Editar Tareas</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SECTION: TRABAJOS GENERALES */}
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-50 pb-4">
              <div className="flex items-center gap-2.5 text-left">
                <div className="w-8 h-8 bg-slate-50 text-slate-800 rounded-lg flex items-center justify-center border border-slate-100/50">
                  <i className="fa-solid fa-layer-group text-sm text-[#CF1B2B]"></i>
                </div>
                <div>
                  <h3 className="text-xs font-black text-[#0b1220] uppercase tracking-wider">TRABAJOS GENERALES</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Focos de trabajo generales de base y acondicionamiento</p>
                </div>
              </div>
              {nominatedPlayers.length > 0 && (
                <button
                  onClick={handleAutoAssignGeneralFocusGroups}
                  className="px-3.5 py-1.5 bg-indigo-50 hover:bg-[#CF1B2B] text-indigo-600 hover:text-white border border-indigo-100 hover:border-[#CF1B2B] rounded-xl flex items-center gap-1.5 transition-all cursor-pointer text-[9px] font-black uppercase tracking-wider shadow-sm"
                  title="Auto-asignar ejercicios predefinidos para los focos generales"
                >
                  <i className="fa-solid fa-wand-magic-sparkles text-[10px]"></i>
                  <span>Auto-Asignar Trabajos Generales</span>
                </button>
              )}
            </div>

            {nominatedPlayers.length === 0 ? (
              <p className="text-slate-400 text-xs font-semibold py-4 text-center">No hay jugadores convocados con evaluaciones en este microciclo.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-50 text-slate-400 text-[8px] font-black uppercase tracking-widest pb-3">
                      <th className="pb-3 pr-4 w-12 text-center">Inc.</th>
                      <th className="pb-3 pr-4">Foco General</th>
                      <th className="pb-3 pr-4 text-center">Ejercicios Asignados</th>
                      <th className="pb-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-[11px] text-slate-700 font-semibold">
                    {TARGET_GROUPS_CONFIG.filter(g => ['GENERALES_SUPERIOR', 'CORE_ZONA_MEDIA', 'GENERALES_INFERIOR'].includes(g.id)).map((g) => {
                      const dayExercises = activeDaySessions.flatMap(s => s.ejercicios || []);
                      const exercisesForGroup = dayExercises.filter(ex => ex.target_group === g.id);
                      const exercisesCount = exercisesForGroup.length;

                      let displayLabel = g.label;
                      if (g.id === 'GENERALES_SUPERIOR') displayLabel = 'TREN SUPERIOR';
                      if (g.id === 'CORE_ZONA_MEDIA') displayLabel = 'CORE Y ZONA MEDIA';
                      if (g.id === 'GENERALES_INFERIOR') displayLabel = 'TREN INFERIOR';

                      return (
                        <tr key={g.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="py-3 pr-4 text-center">
                            <input
                              type="checkbox"
                              checked={exercisesCount > 0}
                              onChange={() => handleToggleFocusGroup(g.id, exercisesCount > 0)}
                              className="w-4 h-4 rounded border-slate-300 text-[#CF1B2B] focus:ring-[#CF1B2B] cursor-pointer"
                              title={exercisesCount > 0 ? "Quitar foco de la sesión" : "Incorporar foco en la sesión"}
                            />
                          </td>
                          <td className="py-3 pr-4">
                            <span className={`px-2.5 py-1 rounded text-[8px] font-black uppercase text-white ${g.colorClass} inline-block`}>
                              {displayLabel}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Minus Button */}
                              <button
                                onClick={() => handleRemoveLastExerciseOfGroup(g.id)}
                                disabled={exercisesCount === 0}
                                className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold transition-all border ${
                                  exercisesCount > 0
                                    ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100 hover:border-red-300 cursor-pointer'
                                    : 'bg-slate-50 text-slate-300 border-slate-100 opacity-40 cursor-not-allowed'
                                }`}
                                title="Quitar un ejercicio de este foco"
                              >
                                <i className="fa-solid fa-minus text-[9px]"></i>
                              </button>

                              {/* Exercises Count / Details Pill with Tooltip */}
                              <div className="relative inline-block group">
                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border inline-block select-none ${
                                  exercisesCount > 0
                                    ? 'bg-indigo-50 border-indigo-100 text-indigo-600'
                                    : 'bg-slate-50 border-slate-100 text-slate-400 opacity-60'
                                }`}>
                                  {exercisesCount}
                                </span>
                                {exercisesCount > 0 && (
                                  <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-72 bg-[#0b1220] text-white rounded-xl shadow-xl p-3 text-left border border-slate-800 transition-all">
                                    <div className="text-[9px] font-black uppercase tracking-widest text-[#CF1B2B] mb-2 border-b border-slate-800 pb-1.5 flex items-center gap-1.5">
                                      <i className="fa-solid fa-dumbbell text-[10px]"></i>
                                      <span>Ejercicios Foco: {displayLabel}</span>
                                    </div>
                                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar font-medium">
                                      {exercisesForGroup.map((ex, idx) => (
                                        <div key={ex.id || idx} className="text-[10px] leading-relaxed border-b border-slate-800/40 last:border-0 pb-1.5 last:pb-0">
                                          <div className="font-bold text-slate-100 flex justify-between gap-2">
                                            <span>{idx + 1}. {ex.ejercicio}</span>
                                            <span className="text-[#CF1B2B] font-black text-[9px] shrink-0 bg-[#CF1B2B]/10 px-1 rounded">{ex.series}x{ex.repeticiones}</span>
                                          </div>
                                          {ex.equipamiento && ex.equipamiento !== 'Ninguno' && (
                                            <div className="text-[8.5px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider flex items-center gap-1">
                                              <i className="fa-solid fa-toolbox text-[8px]"></i>
                                              <span>{ex.equipamiento}</span>
                                            </div>
                                          )}
                                          {ex.tecnica_ejecucion && (
                                            <div className="text-[8.5px] text-slate-400 italic mt-0.5 line-clamp-1">{ex.tecnica_ejecucion}</div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-[#0b1220] rotate-45 border-r border-b border-slate-800"></div>
                                  </div>
                                )}
                              </div>

                              {/* Plus Button */}
                              <button
                                onClick={() => handleAddNextExerciseOfGroup(g.id)}
                                className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 hover:border-emerald-300 flex items-center justify-center text-xs font-bold transition-all cursor-pointer"
                                title="Agregar un ejercicio predefinido"
                              >
                                <i className="fa-solid fa-plus text-[9px]"></i>
                              </button>
                            </div>
                          </td>
                          <td className="py-3 text-right flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenManageGroupModal(g.id)}
                              className="px-2.5 py-1.5 bg-[#CF1B2B]/10 hover:bg-[#CF1B2B] text-[#CF1B2B] hover:text-white rounded-xl flex items-center gap-1.5 transition-all cursor-pointer text-[9px] font-black uppercase tracking-wider"
                              title={`Gestionar tareas asignadas de ${displayLabel}`}
                            >
                              <i className="fa-solid fa-pen-to-square text-[10px]"></i>
                              <span>Editar Tareas</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      {/* SHOW PLAYER EXERCISES MODAL */}
      <AnimatePresence>
        {showPlayerExercisesModal && selectedPlayerForExercises && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[40px] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col text-left"
            >
              {/* Modal Header */}
              <div className="bg-[#0b1220] text-white px-8 py-6 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20 animate-pulse-subtle">
                    <i className="fa-solid fa-clipboard-user text-white text-sm"></i>
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider">{selectedPlayerForExercises.name}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                      Demarcación: {selectedPlayerForExercises.position} • Rutina para el {selectedDia}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPlayerExercisesModal(false)}
                  className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all cursor-pointer"
                >
                  <i className="fa-solid fa-xmark text-sm"></i>
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                {/* Prescription Details Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col justify-center">
                    <span className="text-[8px] font-black uppercase tracking-widest text-amber-600 mb-1">Foco Principal (Prioritario - 2 Ejercicios)</span>
                    <span className="text-sm font-black text-slate-800 uppercase">
                      {TARGET_GROUPS_CONFIG.find(g => g.id === (selectedPlayerForExercises.recommendation?.group || 'TODOS'))?.label || 'TODOS'}
                    </span>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 flex flex-col justify-center">
                    <span className="text-[8px] font-black uppercase tracking-widest text-purple-600 mb-1">Foco Secundario (Secundario - 1 Ejercicio)</span>
                    <span className="text-sm font-black text-slate-800 uppercase">
                      {TARGET_GROUPS_CONFIG.find(g => g.id === (selectedPlayerForExercises.recommendation?.secondaryGroup || 'CORE_ZONA_MEDIA'))?.label || 'CORE Y ZONA MEDIA'}
                    </span>
                  </div>
                </div>

                {/* Exercises Table / List */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Ejercicios Prescritos ({playerExercisesForActiveDay.length})
                  </h4>

                  {playerExercisesForActiveDay.length === 0 ? (
                    <div className="text-center py-16 border-2 border-dashed border-slate-100 rounded-[32px] bg-slate-50/50">
                      <i className="fa-solid fa-dumbbell text-slate-200 text-4xl mb-3"></i>
                      <p className="text-slate-400 text-xs font-black uppercase tracking-wider">No hay ejercicios activos asignados para hoy</p>
                      <p className="text-slate-400 text-[10px] font-semibold mt-1 max-w-sm mx-auto">
                        Los focos de este jugador aún no tienen ejercicios planificados en las sesiones de gimnasio de hoy. Asegúrate de configurar la rutina o presionar "Auto-Asignar Todos los Focos" en el panel.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-100 rounded-[24px]">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[9px] font-black uppercase tracking-widest">
                            <th className="py-4 px-5">#</th>
                            <th className="py-4 px-3 text-left">Grupo / Foco</th>
                            <th className="py-4 px-3 text-left">Ejercicio</th>
                            <th className="py-4 px-3 text-center">Equipamiento</th>
                            <th className="py-4 px-3 text-center">Series x Reps</th>
                            <th className="py-4 px-3 text-center">Carga</th>
                            <th className="py-4 px-3 text-center">RPE</th>
                            <th className="py-4 px-5 text-left">Técnica / Ejecución</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-semibold">
                          {playerExercisesForActiveDay.map((ex, index) => {
                            const exGroup = ex.assigned_group || ex.target_group || 'TODOS';
                            const primaryGroup = selectedPlayerForExercises.recommendation?.group || 'TODOS';
                            const secondaryGroup = selectedPlayerForExercises.recommendation?.secondaryGroup || 'TODOS';

                            let typeLabel = "TODOS / GENERAL";
                            let typeColor = "bg-slate-100 text-slate-600 border border-slate-200/50";
                            
                            if (ex.assignment_type === 'PRIORITARIO' || exGroup === primaryGroup) {
                              typeLabel = "Prioritario";
                              typeColor = "bg-amber-100 text-amber-800 border border-amber-300";
                            } else if (ex.assignment_type === 'SECUNDARIO' || exGroup === secondaryGroup) {
                              typeLabel = "Secundario";
                              typeColor = "bg-purple-100 text-purple-800 border border-purple-300";
                            } else if (exGroup !== 'TODOS') {
                              typeLabel = TARGET_GROUPS_CONFIG.find(g => g.id === exGroup)?.shortLabel || exGroup;
                              typeColor = "bg-indigo-50 text-indigo-600 border border-indigo-200/50";
                            }

                            return (
                              <tr key={ex.id || index} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-4 px-5 font-bold text-slate-400">{index + 1}</td>
                                <td className="py-4 px-3">
                                  <div className="flex flex-col gap-1 text-left">
                                    <span className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-[8.5px] uppercase font-black w-max">
                                      {ex.grupo_muscular}
                                    </span>
                                    <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase font-black w-max ${typeColor}`}>
                                      {typeLabel}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-4 px-3 font-black text-slate-900 text-left">{ex.ejercicio}</td>
                                <td className="py-4 px-3 text-slate-500 text-center">{ex.equipamiento || 'Ninguno'}</td>
                                <td className="py-4 px-3 font-black text-slate-900 text-center">{ex.series} x {ex.repeticiones}</td>
                                <td className="py-4 px-3 text-slate-900 font-bold text-center">{ex.carga_kg ? `${ex.carga_kg}` : 'N/A'}</td>
                                <td className="py-4 px-3 text-center">
                                  {ex.rpe_sugerido ? (
                                    <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded font-black text-[10px]">
                                      RPE {ex.rpe_sugerido}
                                    </span>
                                  ) : 'N/A'}
                                </td>
                                <td className="py-4 px-5 text-slate-400 text-[11px] font-medium max-w-xs text-left" title={ex.tecnica_ejecucion}>
                                  {ex.tecnica_ejecucion || 'N/A'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 px-8 py-5 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowPlayerExercisesModal(false)}
                  className="bg-[#0b1220] hover:bg-slate-800 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-md"
                >
                  Entendido
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SHOW INDIVIDUAL PAUTA MODAL */}
      <AnimatePresence>
        {showIndividualPautaModal && selectedPlayerForPauta && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[40px] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col text-left"
            >
              {/* Modal Header */}
              <div className="bg-[#0b1220] text-white px-8 py-6 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <i className="fa-solid fa-user-doctor text-white text-sm"></i>
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider">Pauta Individual</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                      {selectedPlayerForPauta.name} • {selectedPlayerForPauta.position}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowIndividualPautaModal(false)}
                  className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all cursor-pointer"
                >
                  <i className="fa-solid fa-xmark text-sm"></i>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-8 space-y-6">
                {/* Active Checkbox/Toggle */}
                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="text-left">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wide block">¿Tiene Pauta Individual hoy?</span>
                    <span className="text-[10px] text-slate-400 font-bold">Actívala para eximir al jugador del trabajo general de gimnasio</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={individualPautas[selectedPlayerForPauta.player_id]?.activo || false}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        const currentPauta = individualPautas[selectedPlayerForPauta.player_id] || {
                          activo: false,
                          tipo: 'Kinesiología',
                          observaciones: ''
                        };
                        const updated = {
                          ...individualPautas,
                          [selectedPlayerForPauta.player_id]: {
                            ...currentPauta,
                            activo: isChecked
                          }
                        };
                        saveIndividualPautas(updated);
                        setHasUnsavedChanges(true);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#CF1B2B]"></div>
                  </label>
                </div>

                {/* Form fields - only visible if active */}
                {individualPautas[selectedPlayerForPauta.player_id]?.activo && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-left">Tipo de Trabajo</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['Kinesiología', 'Trabajo Diferenciado', 'Gimnasio Especial', 'Otro'] as const).map((tipoVal) => {
                          const isSelected = (individualPautas[selectedPlayerForPauta.player_id]?.tipo || 'Kinesiología') === tipoVal;
                          return (
                            <button
                              key={tipoVal}
                              type="button"
                              onClick={() => {
                                const currentPauta = individualPautas[selectedPlayerForPauta.player_id] || {
                                  activo: true,
                                  tipo: 'Kinesiología',
                                  observaciones: ''
                                };
                                const updated = {
                                  ...individualPautas,
                                  [selectedPlayerForPauta.player_id]: {
                                    ...currentPauta,
                                    tipo: tipoVal
                                  }
                                };
                                saveIndividualPautas(updated);
                                setHasUnsavedChanges(true);
                              }}
                              className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all text-center ${
                                isSelected
                                  ? 'bg-amber-500/10 text-amber-700 border-amber-500 shadow-sm'
                                  : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100'
                              }`}
                            >
                              {tipoVal}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-left">Observaciones / Detalles</label>
                      <textarea
                        value={individualPautas[selectedPlayerForPauta.player_id]?.observaciones || ''}
                        onChange={(e) => {
                          const currentPauta = individualPautas[selectedPlayerForPauta.player_id] || {
                            activo: true,
                            tipo: 'Kinesiología',
                            observaciones: ''
                          };
                          const updated = {
                            ...individualPautas,
                            [selectedPlayerForPauta.player_id]: {
                              ...currentPauta,
                              observaciones: e.target.value
                            }
                          };
                          saveIndividualPautas(updated);
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="Ej. Trabajo preventivo de rodilla con kinesiólogo..."
                        rows={4}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#CF1B2B] focus:bg-white transition-all text-left"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 px-8 py-5 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowIndividualPautaModal(false)}
                  className="bg-[#0b1220] hover:bg-slate-800 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-md"
                >
                  Guardar y Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MANAGE FOCUS GROUP EXERCISES MODAL */}
      <AnimatePresence>
        {showManageGroupModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[40px] w-full max-w-5xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col text-left"
            >
              {/* Modal Header */}
              <div className="bg-[#0b1220] text-white px-8 py-6 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#CF1B2B] rounded-2xl flex items-center justify-center shadow-lg shadow-[#CF1B2B]/20">
                    <i className="fa-solid fa-dumbbell text-white text-sm"></i>
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider">Gestionar Tareas Asignadas</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                      Foco: {TARGET_GROUPS_CONFIG.find(g => g.id === manageGroupTarget)?.label || manageGroupTarget} ({selectedDia})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowManageGroupModal(false)}
                  className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all cursor-pointer"
                >
                  <i className="fa-solid fa-xmark text-sm"></i>
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {/* 1. Add New Exercise Section */}
                <div className="bg-slate-50/50 rounded-3xl p-6 border border-slate-100 space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[#0b1220] flex items-center gap-2">
                    <i className="fa-solid fa-plus-circle text-[#CF1B2B]"></i> Agregar Nuevo Ejercicio a este Foco
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
                    {/* Muscle Group Select */}
                    <div>
                      <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">1. Grupo Muscular (Filtro)</label>
                      <select
                        value={selectedManageGroupMuscle}
                        onChange={(e) => handleManageGroupMuscleChange(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#CF1B2B]"
                      >
                        <option value="">Seleccionar Grupo Muscular...</option>
                        {uniqueMuscleGroupsForCurrentTarget.map((group) => (
                          <option key={group} value={group}>
                            {group}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Exercise Select */}
                    <div className="md:col-span-2">
                      <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">2. Seleccionar Ejercicio</label>
                      <select
                        value={selectedManageGroupExerciseId}
                        onChange={(e) => handleManageGroupExerciseChange(e.target.value)}
                        disabled={!selectedManageGroupMuscle}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#CF1B2B] disabled:bg-slate-100 disabled:opacity-50"
                      >
                        <option value="">
                          {selectedManageGroupMuscle 
                            ? "Seleccionar Ejercicio de la Lista..." 
                            : "Seleccione primero un grupo muscular..."}
                        </option>
                        {exercisesForSelectedMuscleGroup.map((item) => (
                          <option key={item.id} value={String(item.id)}>
                            {item.ejercicio}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Auto-populated read-only details */}
                    {manageGroupAddForm.ejercicio && (
                      <div className="md:col-span-3 bg-white border border-slate-100 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-semibold text-slate-600">
                        <div>
                          <span className="block text-[8px] font-black uppercase text-slate-400 tracking-wider mb-0.5">Equipamiento</span>
                          <span className="text-slate-800 font-bold">{manageGroupAddForm.equipamiento || 'Ninguno'}</span>
                        </div>
                        <div className="md:col-span-2">
                          <span className="block text-[8px] font-black uppercase text-slate-400 tracking-wider mb-0.5">Técnica de Ejecución</span>
                          <p className="text-slate-700 font-medium leading-relaxed">{manageGroupAddForm.tecnica_ejecucion || 'N/A'}</p>
                        </div>
                      </div>
                    )}

                    {/* Compact prescription input fields (Series, Reps, Peso) */}
                    <div className="grid grid-cols-3 gap-3 md:col-span-2">
                      <div>
                        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Series</label>
                        <input
                          type="number"
                          min={1}
                          value={manageGroupAddForm.series}
                          onChange={(e) => setManageGroupAddForm(prev => ({ ...prev, series: Number(e.target.value) }))}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#CF1B2B]"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Reps</label>
                        <input
                          type="text"
                          value={manageGroupAddForm.repeticiones}
                          onChange={(e) => setManageGroupAddForm(prev => ({ ...prev, repeticiones: e.target.value }))}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#CF1B2B]"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Peso (kg)</label>
                        <input
                          type="text"
                          value={manageGroupAddForm.carga_kg}
                          onChange={(e) => setManageGroupAddForm(prev => ({ ...prev, carga_kg: e.target.value }))}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#CF1B2B]"
                        />
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="md:col-span-1 flex items-end justify-end">
                      <button
                        type="button"
                        onClick={handleAddExerciseToManageGroup}
                        disabled={!manageGroupAddForm.ejercicio}
                        className="bg-[#0b1220] hover:bg-slate-800 disabled:opacity-40 text-white px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-sm w-full md:w-auto h-10 flex items-center justify-center gap-1.5"
                      >
                        <i className="fa-solid fa-plus text-[10px]"></i> Añadir Ejercicio
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. List of Exercises with inline editing */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Ejercicios en este Foco ({manageGroupExercises.length})
                  </h4>

                  {manageGroupExercises.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-3xl">
                      <i className="fa-solid fa-dumbbell text-slate-200 text-3xl mb-2"></i>
                      <p className="text-slate-400 text-xs font-semibold uppercase">No hay ejercicios asignados a este foco.</p>
                      <p className="text-slate-400 text-[10px] mt-1">Usa la sección superior para añadir un ejercicio o haz clic en "Auto-Asignar Todos los Focos" en la pantalla principal.</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[38vh] overflow-y-auto pr-2 custom-scrollbar">
                      {manageGroupExercises.map((ex, index) => (
                        <div
                          key={ex.id || index}
                          className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4 relative hover:border-[#CF1B2B]/20 transition-all text-left"
                        >
                          {/* Row Header */}
                          <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 bg-slate-50 text-slate-500 rounded-full flex items-center justify-center text-[10px] font-black border border-slate-100">
                                {index + 1}
                              </span>
                              <span className="bg-[#CF1B2B]/10 text-[#CF1B2B] px-2 py-0.5 rounded text-[8.5px] font-black uppercase">
                                {ex.grupo_muscular}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveManageGroupExercise(index)}
                              className="text-red-500 hover:text-white hover:bg-red-600 px-2 py-1 rounded-lg transition-colors text-[9px] font-black uppercase flex items-center gap-1 cursor-pointer border border-transparent hover:border-red-600"
                              title="Quitar ejercicio"
                            >
                              <i className="fa-solid fa-trash-can text-[10px]"></i>
                              <span>Quitar</span>
                            </button>
                          </div>

                          {/* Inputs Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            {/* Left: Read-only exercise details */}
                            <div className="md:col-span-8 space-y-2">
                              <div>
                                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Nombre del Ejercicio</span>
                                <span className="text-xs font-black text-slate-800">{ex.ejercicio}</span>
                              </div>
                              <div className="flex flex-wrap gap-4">
                                <div>
                                  <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Equipamiento</span>
                                  <span className="text-[10px] font-bold text-slate-600">{ex.equipamiento || 'Ninguno'}</span>
                                </div>
                                <div>
                                  <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Grupo Muscular</span>
                                  <span className="text-[10px] font-bold text-slate-600">{ex.grupo_muscular}</span>
                                </div>
                              </div>
                              {ex.tecnica_ejecucion && (
                                <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                                  <span className="block text-[7.5px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Técnica / Ejecución</span>
                                  <p className="text-[10px] text-slate-600 font-medium leading-relaxed">{ex.tecnica_ejecucion}</p>
                                </div>
                              )}
                            </div>

                            {/* Right: Editable prescription fields (Series, Reps, Peso) */}
                            <div className="md:col-span-4 grid grid-cols-3 gap-2 self-center">
                              <div>
                                <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center">Series</label>
                                <input
                                  type="number"
                                  min={1}
                                  value={ex.series}
                                  onChange={(e) => handleUpdateManageGroupExerciseField(index, 'series', Number(e.target.value))}
                                  className="w-full px-2 py-1.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs font-black text-center text-slate-800 focus:outline-none focus:border-[#CF1B2B]"
                                />
                              </div>
                              <div>
                                <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center">Reps</label>
                                <input
                                  type="text"
                                  value={ex.repeticiones}
                                  onChange={(e) => handleUpdateManageGroupExerciseField(index, 'repeticiones', e.target.value)}
                                  className="w-full px-2 py-1.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs font-bold text-center text-slate-800 focus:outline-none focus:border-[#CF1B2B]"
                                />
                              </div>
                              <div>
                                <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center">Peso (kg)</label>
                                <input
                                  type="text"
                                  value={ex.carga_kg}
                                  onChange={(e) => handleUpdateManageGroupExerciseField(index, 'carga_kg', e.target.value)}
                                  className="w-full px-2 py-1.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs font-bold text-center text-slate-800 focus:outline-none focus:border-[#CF1B2B]"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 px-8 py-6 border-t border-slate-100 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setShowManageGroupModal(false)}
                  className="bg-white text-slate-800 hover:bg-slate-100 border border-slate-200 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveManageGroupExercises}
                  className="bg-[#CF1B2B] hover:bg-red-700 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE / EDIT SESSION MODAL */}
      <AnimatePresence>
        {showSessionModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[40px] w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
            >
              {/* Modal Header */}
              <div className="bg-[#0b1220] text-white px-8 py-6 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#CF1B2B] rounded-xl flex items-center justify-center">
                    <i className="fa-solid fa-dumbbell text-sm"></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-black uppercase italic tracking-tight">
                      {editingSession ? 'EDITAR SESIÓN GIMNASIO' : 'NUEVA SESIÓN GIMNASIO'}
                    </h3>
                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                      Día: {sessionForm.dia_semana}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSessionModal(false)}
                  className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
                >
                  <i className="fa-solid fa-xmark text-sm"></i>
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {/* 1. Datos de Sesión */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nombre de la Sesión *</label>
                    <input
                      type="text"
                      placeholder="Ej: Fuerza Reactiva o RFD"
                      value={sessionForm.nombre_sesion}
                      onChange={(e) => setSessionForm(prev => ({ ...prev, nombre_sesion: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#CF1B2B]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Día de la semana</label>
                    <select
                      value={sessionForm.dia_semana}
                      onChange={(e) => setSessionForm(prev => ({ ...prev, dia_semana: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#CF1B2B]"
                    >
                      {DIAS_SEMANA.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Fecha (Opcional)</label>
                    <input
                      type="date"
                      value={sessionForm.fecha_sesion}
                      onChange={(e) => setSessionForm(prev => ({ ...prev, fecha_sesion: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#CF1B2B]"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Observaciones generales</label>
                    <input
                      type="text"
                      placeholder="Ej: Calentamiento específico de tobillos y caderas..."
                      value={sessionForm.observaciones}
                      onChange={(e) => setSessionForm(prev => ({ ...prev, observaciones: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#CF1B2B]"
                    />
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* 2. Buscador y Constructor de Ejercicios */}
                <div className="bg-slate-50/50 rounded-3xl p-6 border border-slate-100 space-y-6">
                  <h4 className="text-xs font-black uppercase tracking-widest text-[#0b1220] flex items-center gap-2">
                    <i className="fa-solid fa-plus-circle text-[#CF1B2B]"></i> AGREGAR EJERCICIOS A ESTA SESIÓN
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
                    {/* Búsqueda inteligente de Ejercicio */}
                    <div className="md:col-span-2 relative">
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Buscar Ejercicio en el Catálogo CSV</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Ej: Flexión, Sentadilla, Press..."
                          value={exerciseSearchTerm}
                          onChange={(e) => {
                            setExerciseSearchTerm(e.target.value);
                            setExerciseInput(prev => ({ ...prev, ejercicio: e.target.value }));
                            setShowExercisesDropdown(true);
                          }}
                          onFocus={() => setShowExercisesDropdown(true)}
                          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#CF1B2B]"
                        />
                        <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]"></i>
                      </div>

                      {/* Dropdown de sugerencias */}
                      {showExercisesDropdown && filteredExerciseTemplates.length > 0 && (
                        <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-56 overflow-y-auto z-50">
                          {filteredExerciseTemplates.map((item, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => handleSelectTemplate(item)}
                              className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors flex flex-col gap-0.5 border-b border-slate-50 last:border-none"
                            >
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-black text-slate-900">{item.ejercicio}</span>
                                <span className="bg-slate-100 text-[8px] font-black uppercase text-slate-500 px-1.5 py-0.5 rounded">
                                  {item.grupo_muscular}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-semibold truncate">Técnica: {item.tecnica_ejecucion}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Grupo Muscular</label>
                      <input
                        type="text"
                        placeholder="Ej: Piernas, Pecho"
                        value={exerciseInput.grupo_muscular}
                        onChange={(e) => setExerciseInput(prev => ({ ...prev, grupo_muscular: e.target.value }))}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Equipamiento</label>
                      <input
                        type="text"
                        placeholder="Ej: Barra, Mancuerna, Banda elástica"
                        value={exerciseInput.equipamiento}
                        onChange={(e) => setExerciseInput(prev => ({ ...prev, equipamiento: e.target.value }))}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Grupo Objetivo (Perfil)</label>
                      <select
                        value={exerciseInput.target_group || 'TODOS'}
                        onChange={(e) => setExerciseInput(prev => ({ ...prev, target_group: e.target.value }))}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#CF1B2B]"
                      >
                        {TARGET_GROUPS_CONFIG.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Técnica de Ejecución</label>
                      <textarea
                        rows={2}
                        placeholder="Instrucciones específicas sobre cómo realizar el ejercicio..."
                        value={exerciseInput.tecnica_ejecucion}
                        onChange={(e) => setExerciseInput(prev => ({ ...prev, tecnica_ejecucion: e.target.value }))}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none"
                      />
                    </div>

                    {/* Sets, Reps, Load, RPE */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:col-span-3">
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Series</label>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={exerciseInput.series}
                          onChange={(e) => setExerciseInput(prev => ({ ...prev, series: Number(e.target.value) }))}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Repeticiones</label>
                        <input
                          type="text"
                          placeholder="Ej: 10, 8-10, Al fallo"
                          value={exerciseInput.repeticiones}
                          onChange={(e) => setExerciseInput(prev => ({ ...prev, repeticiones: e.target.value }))}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Peso / Carga (kg)</label>
                        <input
                          type="text"
                          placeholder="Ej: 40, Banda fuerte"
                          value={exerciseInput.carga_kg}
                          onChange={(e) => setExerciseInput(prev => ({ ...prev, carga_kg: e.target.value }))}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">RPE Sugerido (1-10)</label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={exerciseInput.rpe_sugerido}
                          onChange={(e) => setExerciseInput(prev => ({ ...prev, rpe_sugerido: Number(e.target.value) }))}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-3 flex justify-end">
                      <button
                        type="button"
                        onClick={handleAddExerciseToForm}
                        disabled={!exerciseInput.ejercicio}
                        className="bg-[#0b1220] hover:bg-slate-800 disabled:opacity-40 text-white px-6 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        Añadir Ejercicio a la Lista
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. List of exercises currently inside the Form */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-900">
                    EJERCICIOS AGREGADOS ({tempExercises.length})
                  </h4>

                  {tempExercises.length === 0 ? (
                    <p className="text-slate-400 text-xs font-semibold py-6 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                      Aún no has agregado ejercicios a esta sesión. Completa los campos superiores para añadir tu primer ejercicio.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {tempExercises.map((e, idx) => (
                        <div
                          key={e.id || idx}
                          className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center text-[10px] font-black text-slate-500">
                                {idx + 1}
                              </span>
                              <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[8px] font-black uppercase">
                                {e.grupo_muscular}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase text-white ${
                                e.target_group === 'IMTP' ? 'bg-amber-500' :
                                e.target_group === 'CMJ' ? 'bg-blue-600' :
                                e.target_group === 'CMJ_REBOUND' ? 'bg-emerald-600' :
                                e.target_group === 'TREN_SUPERIOR' ? 'bg-indigo-600' :
                                'bg-slate-400'
                              }`}>
                                {e.target_group === 'IMTP' ? 'IMTP - Fuerza Máxima' :
                                 e.target_group === 'CMJ' ? 'CMJ - Potencia / Pliom. Ext.' :
                                 e.target_group === 'CMJ_REBOUND' ? 'CMJ REB - Drop Jump' :
                                 e.target_group === 'TREN_SUPERIOR' ? 'TREN SUPERIOR' :
                                 'TODOS'}
                              </span>
                              <h5 className="text-xs font-black text-slate-900">{e.ejercicio}</h5>
                            </div>
                            <p className="text-slate-400 text-[10px] font-bold uppercase mt-1">
                              Equipamiento: {e.equipamiento} • {e.series} x {e.repeticiones} reps • Carga: {e.carga_kg ? `${e.carga_kg} kg` : 'N/A'} • Sugerido: RPE {e.rpe_sugerido}
                            </p>
                            {e.tecnica_ejecucion && (
                              <p className="text-slate-500 text-[10px] mt-1 italic max-w-xl truncate">
                                Técnica: {e.tecnica_ejecucion}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => e.id && handleRemoveExerciseFromForm(e.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2.5 rounded-xl transition-colors text-xs font-bold flex items-center gap-1.5 self-end md:self-center"
                          >
                            <i className="fa-solid fa-trash"></i> Quitar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 px-8 py-6 border-t border-slate-100 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setShowSessionModal(false)}
                  className="bg-white text-slate-800 hover:bg-slate-100 border border-slate-200 px-6 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveSession}
                  disabled={!sessionForm.nombre_sesion || tempExercises.length === 0}
                  className="bg-[#CF1B2B] hover:bg-red-700 disabled:opacity-40 text-white px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg"
                >
                  {editingSession ? 'GUARDAR CAMBIOS' : 'CREAR SESIÓN'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QUICK ADD SPECIFIC EXERCISE MODAL */}
      <AnimatePresence>
        {showQuickAddModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[40px] w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col text-left"
            >
              {/* Modal Header */}
              <div className="bg-[#0b1220] text-white px-8 py-6 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#CF1B2B] rounded-2xl flex items-center justify-center shadow-lg shadow-[#CF1B2B]/20">
                    <i className="fa-solid fa-plus text-white text-sm"></i>
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider">Asignar Ejercicio Específico</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                      Foco: {TARGET_GROUPS_CONFIG.find(g => g.id === quickAddTargetGroup)?.label || quickAddTargetGroup}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowQuickAddModal(false)}
                  className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all cursor-pointer"
                >
                  <i className="fa-solid fa-xmark text-sm"></i>
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                {/* Session destination selection */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Sesión de Destino para el {selectedDia}</label>
                  {sessions.filter(s => s.dia_semana === selectedDia).length > 0 ? (
                    <select
                      value={quickAddSessionId}
                      onChange={(e) => setQuickAddSessionId(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#CF1B2B]"
                    >
                      {sessions.filter(s => s.dia_semana === selectedDia).map(s => (
                        <option key={s.id} value={s.id}>Añadir a: {s.nombre_sesion}</option>
                      ))}
                      <option value="NEW">+ Crear una nueva sesión automática</option>
                    </select>
                  ) : (
                    <div className="text-xs text-amber-600 font-bold flex items-center gap-2">
                      <i className="fa-solid fa-circle-info"></i>
                      <span>No hay sesiones creadas para el {selectedDia}. Se creará automáticamente la sesión "Trabajo Específico - {selectedDia}".</span>
                    </div>
                  )}
                </div>

                {/* Smart Exercise Finder */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
                  <div className="md:col-span-2 relative">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Buscar Ejercicio en el Catálogo CSV</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Ej: Flexión, Sentadilla, Press..."
                        value={quickAddSearchTerm}
                        onChange={(e) => {
                          setQuickAddSearchTerm(e.target.value);
                          setQuickAddExerciseForm(prev => ({ ...prev, ejercicio: e.target.value }));
                          setShowQuickAddDropdown(true);
                        }}
                        onFocus={() => setShowQuickAddDropdown(true)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#CF1B2B]"
                      />
                      <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]"></i>
                    </div>

                    {/* Suggestions Dropdown */}
                    {showQuickAddDropdown && filteredQuickAddTemplates.length > 0 && (
                      <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-52 overflow-y-auto z-50">
                        {filteredQuickAddTemplates.map((item, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleSelectQuickAddTemplate(item)}
                            className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors flex flex-col gap-0.5 border-b border-slate-50 last:border-none"
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-black text-slate-900">{item.ejercicio}</span>
                              <span className="bg-slate-100 text-[8px] font-black uppercase text-slate-500 px-1.5 py-0.5 rounded">
                                {item.grupo_muscular}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-semibold truncate">Técnica: {item.tecnica_ejecucion}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Grupo Muscular</label>
                    <input
                      type="text"
                      placeholder="Ej: Piernas, Pecho"
                      value={quickAddExerciseForm.grupo_muscular}
                      onChange={(e) => setQuickAddExerciseForm(prev => ({ ...prev, grupo_muscular: e.target.value }))}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Equipamiento</label>
                    <input
                      type="text"
                      placeholder="Ej: Barra, Mancuerna, Banda elástica"
                      value={quickAddExerciseForm.equipamiento}
                      onChange={(e) => setQuickAddExerciseForm(prev => ({ ...prev, equipamiento: e.target.value }))}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Técnica de Ejecución</label>
                    <textarea
                      rows={2}
                      placeholder="Instrucciones específicas sobre cómo realizar el ejercicio..."
                      value={quickAddExerciseForm.tecnica_ejecucion}
                      onChange={(e) => setQuickAddExerciseForm(prev => ({ ...prev, tecnica_ejecucion: e.target.value }))}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none"
                    />
                  </div>

                  {/* Sets, Reps, Load, RPE */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:col-span-3">
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Series</label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={quickAddExerciseForm.series}
                        onChange={(e) => setQuickAddExerciseForm(prev => ({ ...prev, series: Number(e.target.value) }))}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Repeticiones</label>
                      <input
                        type="text"
                        placeholder="Ej: 10, 8-10, Al fallo"
                        value={quickAddExerciseForm.repeticiones}
                        onChange={(e) => setQuickAddExerciseForm(prev => ({ ...prev, repeticiones: e.target.value }))}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Peso / Carga (kg)</label>
                      <input
                        type="text"
                        placeholder="Ej: 40, Banda fuerte"
                        value={quickAddExerciseForm.carga_kg}
                        onChange={(e) => setQuickAddExerciseForm(prev => ({ ...prev, carga_kg: e.target.value }))}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">RPE Sugerido (1-10)</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={quickAddExerciseForm.rpe_sugerido}
                        onChange={(e) => setQuickAddExerciseForm(prev => ({ ...prev, rpe_sugerido: Number(e.target.value) }))}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 px-8 py-6 border-t border-slate-100 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setShowQuickAddModal(false)}
                  className="bg-white text-slate-800 hover:bg-slate-100 border border-slate-200 px-6 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleQuickAddExercise}
                  disabled={!quickAddExerciseForm.ejercicio}
                  className="bg-[#CF1B2B] hover:bg-red-700 disabled:opacity-40 text-white px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg cursor-pointer"
                >
                  Asignar Ejercicio
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
