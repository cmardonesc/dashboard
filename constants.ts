
import { Category } from './types';

export const CATEGORIES = Object.values(Category);

export const WELLNESS_LABELS = {
  fatigue: 'Fatiga',
  sleep: 'Calidad del Sueño',
  stress: 'Nivel de Estrés',
  soreness: 'Dolor Muscular',
  mood: 'Estado de Ánimo'
};

export const RPE_SCALE = [
  { value: 1, label: 'Muy Suave' },
  { value: 2, label: 'Suave' },
  { value: 3, label: 'Moderado' },
  { value: 4, label: 'Algo Duro' },
  { value: 5, label: 'Duro' },
  { value: 6, label: 'Duro+' },
  { value: 7, label: 'Muy Duro' },
  { value: 8, label: 'Extremadamente Duro' },
  { value: 9, label: 'Casi Máximo' },
  { value: 10, label: 'Esfuerzo Máximo' }
];

export const WELLNESS_SCALE = [
  { value: 1, label: 'Pobre', color: 'bg-red-500' },
  { value: 2, label: 'Bajo Promedio', color: 'bg-orange-400' },
  { value: 3, label: 'Promedio', color: 'bg-yellow-400' },
  { value: 4, label: 'Bueno', color: 'bg-green-400' },
  { value: 5, label: 'Excelente', color: 'bg-emerald-600' }
];

export const BODY_PARTS = {
  ANTERIOR: [
    { id: 'cabeza', label: 'CABEZA / CARA', category: 'SUPERIOR' },
    { id: 'cuello_ant', label: 'CUELLO ANT.', category: 'SUPERIOR' },
    { id: 'hombro_der', label: 'HOMBRO DER.', category: 'SUPERIOR' },
    { id: 'hombro_izq', label: 'HOMBRO IZQ.', category: 'SUPERIOR' },
    { id: 'pectoral_der', label: 'PECTORAL DER.', category: 'SUPERIOR' },
    { id: 'pectoral_izq', label: 'PECTORAL IZQ.', category: 'SUPERIOR' },
    { id: 'biceps_der', label: 'BÍCEPS DER.', category: 'SUPERIOR' },
    { id: 'biceps_izq', label: 'BÍCEPS IZQ.', category: 'SUPERIOR' },
    { id: 'antebrazo_der', label: 'ANTEBRAZO DER.', category: 'SUPERIOR' },
    { id: 'antebrazo_izq', label: 'ANTEBRAZO IZQ.', category: 'SUPERIOR' },
    { id: 'mano_der', label: 'MANO DER.', category: 'SUPERIOR' },
    { id: 'mano_izq', label: 'MANO IZQ.', category: 'SUPERIOR' },
    { id: 'abdomen', label: 'ABDOMEN', category: 'TRONCO' },
    { id: 'oblicuo_der', label: 'OBLICUO DER.', category: 'TRONCO' },
    { id: 'oblicuo_izq', label: 'OBLICUO IZQ.', category: 'TRONCO' },
    { id: 'flexor_cadera_der', label: 'FLEXOR CADERA D.', category: 'INFERIOR' },
    { id: 'flexor_cadera_izq', label: 'FLEXOR CADERA I.', category: 'INFERIOR' },
    { id: 'cuadriceps_der', label: 'CUÁDRICEPS D.', category: 'INFERIOR' },
    { id: 'cuadriceps_izq', label: 'CUÁDRICEPS I.', category: 'INFERIOR' },
    { id: 'rodilla_der', label: 'RODILLA DER.', category: 'INFERIOR' },
    { id: 'rodilla_izq', label: 'RODILLA IZQ.', category: 'INFERIOR' },
    { id: 'tibial_der', label: 'TIBIAL DER.', category: 'INFERIOR' },
    { id: 'tibial_izq', label: 'TIBIAL IZQ.', category: 'INFERIOR' },
    { id: 'tobillo_pie_der', label: 'TOBILLO/PIE D.', category: 'INFERIOR' },
    { id: 'tobillo_pie_izq', label: 'TOBILLO/PIE I.', category: 'INFERIOR' },
  ],
  POSTERIOR: [
    { id: 'nuca', label: 'NUCA / CABEZA POST.', category: 'SUPERIOR' },
    { id: 'cuello_post', label: 'CUELLO / TRAPECIOS', category: 'SUPERIOR' },
    { id: 'hombro_post_der', label: 'HOMBRO POST. D.', category: 'SUPERIOR' },
    { id: 'hombro_post_izq', label: 'HOMBRO POST. I.', category: 'SUPERIOR' },
    { id: 'triceps_der', label: 'TRÍCEPS DER.', category: 'SUPERIOR' },
    { id: 'triceps_izq', label: 'TRÍCEPS IZQ.', category: 'SUPERIOR' },
    { id: 'dorsal_der', label: 'DORSAL DER.', category: 'TRONCO' },
    { id: 'dorsal_izq', label: 'DORSAL IZQ.', category: 'TRONCO' },
    { id: 'lumbar', label: 'ZONA LUMBAR', category: 'TRONCO' },
    { id: 'gluteo_der', label: 'GLÚTEO DER.', category: 'INFERIOR' },
    { id: 'gluteo_izq', label: 'GLÚTEO IZQ.', category: 'INFERIOR' },
    { id: 'isquio_der', label: 'ISQUIOTIBIAL D.', category: 'INFERIOR' },
    { id: 'isquio_izq', label: 'ISQUIOTIBIAL I.', category: 'INFERIOR' },
    { id: 'popliteo_der', label: 'HUECO POPLÍTEO D.', category: 'INFERIOR' },
    { id: 'popliteo_izq', label: 'HUECO POPLÍTEO I.', category: 'INFERIOR' },
    { id: 'gemelo_der', label: 'GEMELO DER.', category: 'INFERIOR' },
    { id: 'gemelo_izq', label: 'GEMELO IZQ.', category: 'INFERIOR' },
    { id: 'aquiles_der', label: 'TALÓN AQUILES D.', category: 'INFERIOR' },
    { id: 'aquiles_izq', label: 'TALÓN AQUILES I.', category: 'INFERIOR' },
  ]
};

export const CLUB_LOGOS: Record<string, string> = {
  'colo colo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Logo_Colo-Colo.svg/1200px-Logo_Colo-Colo.svg.png',
  'universidad de chile': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Logo_Universidad_de_Chile.svg/1200px-Logo_Universidad_de_Chile.svg.png',
  'universidad catolica': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Logo_Universidad_Cat%C3%B3lica.svg/1200px-Logo_Universidad_Cat%C3%B3lica.svg.png',
  'palestino': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Logo_Club_Deportivo_Palestino.svg/1200px-Logo_Club_Deportivo_Palestino.svg.png',
  'union espanola': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Logo_Uni%C3%B3n_Espa%C3%B1ola.svg/1200px-Logo_Uni%C3%B3n_Espa%C3%B1ola.svg.png',
  'audax italiano': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Logo_Audax_Italiano.svg/1200px-Logo_Audax_Italiano.svg.png',
  'everton': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Logo_Everton_de_Vi%C3%B1a_del_Mar.svg/1200px-Logo_Everton_de_Vi%C3%B1a_del_Mar.svg.png',
  'santiago wanderers': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Logo_Santiago_Wanderers.svg/1200px-Logo_Santiago_Wanderers.svg.png',
  'ohiggins': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Logo_O%27Higgins_FC.svg/1200px-Logo_O%27Higgins_FC.svg.png',
  'cobresal': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Logo_Cobresal.svg/1200px-Logo_Cobresal.svg.png',
  'coquimbo unido': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Logo_Coquimbo_Unido.svg/1200px-Logo_Coquimbo_Unido.svg.png',
  'huachipato': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Logo_Huachipato.svg/1200px-Logo_Huachipato.svg.png',
  'nublense': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Logo_Ñublense.svg/1200px-Logo_Ñublense.svg.png',
  'cobreloa': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Logo_Cobreloa.svg/1200px-Logo_Cobreloa.svg.png',
  'curico unido': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Logo_Curicó_Unido.svg/1200px-Logo_Curicó_Unido.svg.png',
  'deportes antofagasta': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Logo_Deportes_Antofagasta.svg/1200px-Logo_Deportes_Antofagasta.svg.png',
  'deportes iquique': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Logo_Deportes_Iquique.svg/1200px-Logo_Deportes_Iquique.svg.png',
  'deportes la serena': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Logo_Deportes_La_Serena.svg/1200px-Logo_Deportes_La_Serena.svg.png',
  'magallanes': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Logo_Club_Deportivo_Magallanes.svg/1200px-Logo_Club_Deportivo_Magallanes.svg.png',
  'union la calera': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Logo_Uni%C3%B3n_La_Calera.svg/1200px-Logo_Uni%C3%B3n_La_Calera.svg.png'
};

/**
 * Logo de la Federación (puedes usar un enlace de Google Drive aquí)
 */
export const FEDERATION_LOGO = "https://drive.google.com/file/d/1dACZfh-DDxPKlH0bo5YLiuhhYAAEKy0s/view?usp=drive_link";
