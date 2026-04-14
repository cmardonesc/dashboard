
export enum UserRole {
  PLAYER = 'player',
  STAFF = 'staff',
  CLUB = 'club',
  ADMIN = 'admin'
}

export enum Category {
  SUB_13 = 'sub_13',
  SUB_14 = 'sub_14',
  SUB_15 = 'sub_15',
  SUB_16 = 'sub_16',
  SUB_17 = 'sub_17',
  SUB_18 = 'sub_18',
  SUB_20 = 'sub_20',
  SUB_21 = 'sub_21',
  SUB_23 = 'sub_23',
  ADULTA = 'adulta'
}

export enum CitacionEstado {
  CONVOCADO = 'CONVOCADO',
  BAJA = 'BAJA',
  DUDA = 'DUDA',
  RESERVA = 'RESERVA'
}

export const CATEGORY_ID_MAP: Record<string, number> = {
  [Category.SUB_13]: 1,
  [Category.SUB_14]: 2,
  [Category.SUB_15]: 3,
  [Category.SUB_16]: 4,
  [Category.SUB_17]: 5,
  [Category.SUB_18]: 6,
  [Category.SUB_20]: 7,
  [Category.SUB_21]: 8,
  [Category.SUB_23]: 9,
  [Category.ADULTA]: 10,
};

export const REVERSE_CATEGORY_ID_MAP: Record<number, Category> = Object.entries(CATEGORY_ID_MAP).reduce((acc, [key, value]) => {
  acc[value] = key as Category;
  return acc;
}, {} as Record<number, Category>);

export const CATEGORY_COLORS: Record<number, string> = {
  10: 'bg-red-600',
  9: 'bg-blue-800',
  8: 'bg-blue-700',
  7: 'bg-blue-600',
  6: 'bg-amber-600',
  5: 'bg-amber-500',
  4: 'bg-emerald-600',
  3: 'bg-emerald-500',
  2: 'bg-slate-600',
  1: 'bg-slate-500',
};

// --- Tipos de Base de Datos Real ---

export interface User {
  id: string; // auth.uid()
  id_del_jugador?: number; // Primary key real
  name: string;
  nombre?: string;
  apellido1?: string;
  apellido2?: string;
  role: UserRole;
  category?: string;
  position?: string;
  position_linea?: string;
  club?: string;
  club_name?: string;
  perfil_pierna?: string;
  fecha_nacimiento?: string;
  anio?: number; 
  celular?: string;
  foto_url?: string;
}

export type MenuId =
  | 'inicio'
  | 'planificacion_anual'
  | 'tecnica'
  | 'fisica_wellness'
  | 'fisica_pse'
  | 'fisica_carga_externa_total'
  | 'fisica_carga_externa_tareas'
  | 'fisica_gps_intelligence'
  | 'fisica_reporte'
  | 'fisica_vo2max'
  | 'medica'
  | 'nutricion_resumen_grupal'
  | 'nutricion_comparativo'
  | 'nutricion_individual'
  | 'nutricion_top10'
  | 'nutricion_maduracion'
  | 'competencia'
  | 'citaciones'
  | 'desconvocatoria'
  | 'logistica_jugadores'
  | 'usuarios'
  | 'logs'
  | 'importar_datos'
  | 'sports_science';

export interface CitacionDB {
  id: string;
  player_id: number;
  microcycle_id: number;
  fecha_citacion: string;
  observacion: string;
  created_at?: string;
  created_by?: string;
  updated_at?: string;
}

export interface AthletePerformanceRecord {
  player: User;
  wellness: WellnessData[];
  loads: TrainingLoadData[];
  gps: GPSData[];
  nutrition?: NutritionData[];
}

export interface MicrocicloDB {
  id?: number;
  category_id: number;
  type: string;
  start_date: string;
  end_date: string;
  country: string;
  city: string;
  created_by: string;
  micro_number?: number;
  code?: string;
}

export interface WellnessData {
  id?: string;
  playerId: string;
  date: string;
  fatigue: number; 
  sleep: number; 
  stress: number; 
  soreness: number; 
  mood: number;
  soreness_areas?: string[];
  illness_symptoms?: string[];
  created_at?: string;
}

export interface TrainingLoadData {
  id?: string;
  playerId: string;
  date: string;
  duration: number; 
  rpe: number; 
  load: number; 
  type: 'FIELD' | 'GYM' | 'MATCH';
  soreness_areas?: string[];
  illness_symptoms?: string[];
  created_at?: string;
}

export interface GPSData {
  id?: string;
  playerId: string;
  id_del_jugador?: number;
  date: string;
  duration: number; 
  totalDistance: number; 
  hsrDistance: number; 
  sprintCount: number;
  maxSpeed: number; 
  intensity: number;
  // Nuevos campos para IFR
  m_por_min?: number;
  dist_total_m?: number;
  vel_max_kmh?: number;
  dist_ai_m_15_kmh?: number;
  dist_mai_m_20_kmh?: number;
  dist_sprint_m_25_kmh?: number;
  acc_decc_ai_n?: number;
}

export interface NutritionData {
  id: string;
  id_del_jugador: number;
  nombre_raw?: string;
  fecha_medicion: string;
  edad_cronologica: number;
  masa_corporal_kg: number;
  talla_cm: number;
  talla_sentada_cm: number;
  masa_muscular_kg: number;
  masa_muscular_pct: number;
  masa_adiposa_kg: number;
  masa_adiposa_pct: number;
  masa_osea_kg?: number;
  masa_osea_pct?: number;
  indice_imo: number;
  indice_imc: number;
  sum_pliegues_6_mm: number;
  sum_pliegues_8_mm: number;
  somatotipo_endo?: number;
  somatotipo_meso?: number;
  somatotipo_ecto?: number;
  somatotipo_eje_x?: number;
  somatotipo_eje_y?: number;
  maduracion_mirwald?: number;
  maduracion_moore?: number;
  maduracion_media?: number;
  phv_mirwald?: number;
  phv_moore?: number;
  phv_media?: number;
  cm_por_crecer_mirwald?: number;
  cm_por_crecer_moore?: number;
  cm_por_crecer_media?: number;
  estatura_proy_mirwald_cm?: number;
  estatura_proy_moore_cm?: number;
  estatura_proy_media_cm?: number;
  created_at?: string;
}

export interface ItineraryActivity {
  id: string;
  time: string;
  type: string;
  location: string;
  emoji: string;
  grupo?: string;
  isCustom?: boolean;
}
