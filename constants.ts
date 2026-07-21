
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
    { id: 'psoasiliaco_der', label: 'PSOASILIACO D.', category: 'INFERIOR' },
    { id: 'psoasiliaco_izq', label: 'PSOASILIACO I.', category: 'INFERIOR' },
    { id: 'aductores_der', label: 'ADUCTORES D.', category: 'INFERIOR' },
    { id: 'aductores_izq', label: 'ADUCTORES I.', category: 'INFERIOR' },
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
  'atleticocolina': 'https://drive.google.com/file/d/1XreCc1WyUBNc7i6ezqS1IAB1OX8A_QTF/view?usp=sharing',
  'audaxitaliano': 'https://drive.google.com/file/d/1IkIO3ncMNX7m_EtENvRl_rhfXik05Gv4/view?usp=sharing',
  'brujasdesalamanca': 'https://drive.google.com/file/d/1hLbrL2P4S2ZoT1nnl85sMqGwe5DwWpz6/view?usp=sharing',
  'cobreloa': 'https://drive.google.com/file/d/1zQojlLXj6FpkY-ShbDao1-Tedtu0751c/view?usp=sharing',
  'cobresal': 'https://drive.google.com/file/d/1SsY_tni1DMwTJR6C-o0Q6qTXkGWsudXN/view?usp=sharing',
  'colchagua': 'https://drive.google.com/file/d/1flk-fQDuTQB0DA4qSc-OgQOFu6nKs5IS/view?usp=sharing',
  'colocolo': 'https://drive.google.com/file/d/1co-5tVYtqe52Nn10kkGTBTKzEsYlApNw/view?usp=sharing',
  'conconnational': 'https://drive.google.com/file/d/1X3nhQFdumNPOd3waOYRg6dUqqt4WqdjF/view?usp=sharing',
  'coquimbounido': 'https://drive.google.com/file/d/1C3jDIcAGpZUI7x_b3q3o9MyQkEOdvy5w/view?usp=sharing',
  'curicounido': 'https://drive.google.com/file/d/1_ugp9q_aNxbiy5MSDltys1q8xPssaCxV/view?usp=sharing',
  'deportesantofagasta': 'https://drive.google.com/file/d/1tqeTXHob0aBCUL1PPuz7C6eKtAlO8JO9/view?usp=sharing',
  'antofagasta': 'https://drive.google.com/file/d/1tqeTXHob0aBCUL1PPuz7C6eKtAlO8JO9/view?usp=sharing',
  'argentinosjr': 'https://drive.google.com/file/d/1Ra2Dbe8J8YxL_u_3269_U1Uu8-oA7WEn/view?usp=sharing',
  'atleticomineiro': 'https://drive.google.com/file/d/1h7NshD0C6nS_XvO2x9D5k8gG7hG6u8m3/view?usp=sharing',
  'copenhague': 'https://drive.google.com/file/d/1jY8_3M9_Q2n1Z1_8kR8_9_9_9_9_9_9/view?usp=sharing',
  'deportesconcepcion': 'https://drive.google.com/file/d/1AhFIz-YbpgyDfEY_Nr5i3ZZh_uuPBBo6/view?usp=sharing',
  'deportescopiapo': 'https://drive.google.com/file/d/1KLnsILkqpOC_gUgljNPEqmf8nrfXIxEh/view?usp=sharing',
  'deportesiquique': 'https://drive.google.com/file/d/1JpFW8NidSz7n9kJsHAqASvLc8RIjnRb3/view?usp=sharing',
  'deporteslaserena': 'https://drive.google.com/file/d/1_9nqKVvWXY-kD65lBA6ErRXQ3YgfWbuZ/view?usp=sharing',
  'deporteslimache': 'https://drive.google.com/file/d/13zpWlLytiwIGJsgudeBaNM1zqz3rxoNN/view?usp=sharing',
  'deporteslinares': 'https://drive.google.com/file/d/1yfruBY-GqkE4izP6wpvSG5xDfHQyfSYl/view?usp=sharing',
  'deportesrecoleta': 'https://drive.google.com/file/d/1XRFiFjmZRBKkRt4kBAGgb-DVHFfSHsd-/view?usp=sharing',
  'deportesrengo': 'https://drive.google.com/file/d/1KvoA8s4j4i5fbFFvES8hbFiBQrzBXxej/view?usp=sharing',
  'deportessantacruz': 'https://drive.google.com/file/d/1STujZpx6Yc0L50GsjpyC2TsVsRPH6gxA/view?usp=sharing',
  'deportestemuco': 'https://drive.google.com/file/d/1G3zTAk3Y97YiMSQ5taJ4ZIdQYua1eniE/view?usp=sharing',
  'everton': 'https://drive.google.com/file/d/1dCcZssetKjyFV27Bg6dhw33FFoxJqUSM/view?usp=sharing',
  'generalvelasquez': 'https://drive.google.com/file/d/1pEA995FDJ1EACB1QgjoXB2Rt836cST-3/view?usp=sharing',
  'huachipato': 'https://drive.google.com/file/d/1htmaRYkpwbVsKn2Lsq91AQKD70q7oKns/view?usp=sharing',
  'lotaschwager': 'https://drive.google.com/file/d/1UF9euIBzCPjd4fR_6w95YGUe5kjfOkvw/view?usp=sharing',
  'magallanes': 'https://drive.google.com/file/d/1olNayy4I8kF_7HyJtAa38N8gUEapZyVV/view?usp=sharing',
  'nublense': 'https://drive.google.com/file/d/18s8oxImK3-BW7W45TJO4nnCPfhG1pMVI/view?usp=sharing',
  'ohiggins': 'https://drive.google.com/file/d/1fJejc6VEH_AQoKDGb6p4cG2-g72KBIka/view?usp=sharing',
  'palestino': 'https://drive.google.com/file/d/1OfGcu7KgdtCOSSOhifvZQjOhCyZutAUQ/view?usp=sharing',
  'provincialosorno': 'https://drive.google.com/file/d/10XyGDYTNE1OR3Db0T9O4Ql9g-om2CPXV/view?usp=sharing',
  'provincialovalle': 'https://drive.google.com/file/d/1of5C6Wbl0yc9gmCLVC7cT0B4ImagitmK/view?usp=sharing',
  'puertomontt': 'https://drive.google.com/file/d/1eetaXWZ9L52L7bBlwxPVARe-nRh_2H_-/view?usp=sharing',
  'rangersdetalca': 'https://drive.google.com/file/d/1JhZCLVAgGC8AYFbiJnvYH9QbEDpCORwK/view?usp=sharing',
  'realsanjoaquin': 'https://drive.google.com/file/d/14-QZctnB4jR6TeuIte4SxZarTSVG6Dlv/view?usp=sharing',
  'sanluisdequillota': 'https://drive.google.com/file/d/1vO2-auLXByRqXE9IF8PhZtLAi278rWPr/view?usp=sharing',
  'sanmarcosdearica': 'https://drive.google.com/file/d/1Of97TH33iAXFn7phF8mR9_U6RIZZgS3c/view?usp=sharing',
  'santiagocity': 'https://drive.google.com/file/d/1ZAkKtAjvwgqtTyZgt2iqhixFpXMpHp-1/view?usp=sharing',
  'santiagomorning': 'https://drive.google.com/file/d/1OmzxvOTxrDFvDHLCVnPROX3bwWq85WqB/view?usp=sharing',
  'santiagowanderers': 'https://drive.google.com/file/d/1xVST7LALS5exStbFDDH9gPGloLIVwGwK/view?usp=sharing',
  'trasandinodelosandes': 'https://drive.google.com/file/d/1pMdD0_BC3yvv4WF-OoLi2MdpIMmzil9q/view?usp=sharing',
  'unionespanola': 'https://drive.google.com/file/d/1VXU3ehA5V1d6dtT-20uD1OmAfR9yj0hG/view?usp=drive_link',
  'unionlacalera': 'https://drive.google.com/file/d/1WAA9Mo-wKemc3Fj694ySoZUhM9ICK8O7/view?usp=sharing',
  'unionsanfelipe': 'https://drive.google.com/file/d/1HXJw-elYvwJG1yn3DUaJGFl1hKmGClqf/view?usp=sharing',
  'universidadcatolica': 'https://drive.google.com/file/d/1z5OO2cabtRy6qHigXumVJH_PCO7TMwTt/view?usp=sharing',
  'universidaddechile': 'https://drive.google.com/file/d/1Eqp8Cf4p--CcAZ43fFFnOfB06ztDPk_X/view?usp=sharing',
  'universidaddeconcepcion': 'https://drive.google.com/file/d/1I5eQfDw0aaQysfZpbF_wmepx52BubEbm/view?usp=sharing',
  'rcdespanyol': 'https://upload.wikimedia.org/wikipedia/en/thumb/d/d6/R_C_D_Espanyol_Logo.svg/200px-R_C_D_Espanyol_Logo.svg.png'
};

/**
 * Logo de la Federación (puedes usar un enlace de Google Drive aquí)
 */
export const FEDERATION_LOGO = "https://drive.google.com/file/d/1dACZfh-DDxPKlH0bo5YLiuhhYAAEKy0s/view?usp=sharing";

export const FALLBACK_CLUB_NAMES: Record<number, string> = {
  1: 'Colo-Colo',
  2: 'Universidad de Chile',
  3: 'Universidad Católica',
  4: 'Palestino',
  5: 'Santiago Wanderers',
  6: 'O\'Higgins',
  7: 'Huachipato',
  8: 'Audax Italiano',
  9: 'Unión Española',
  10: 'Coquimbo Unido',
  11: 'Rangers de Talca',
  12: 'Santiago Morning',
  13: 'Magallanes',
  14: 'Antofagasta',
  15: 'Deportes Iquique',
  17: 'Deportes La Serena',
  18: 'Deportes Puerto Montt',
  19: 'Deportes Santa Cruz',
  20: 'Deportes Copiapó',
  22: 'Unión La Calera',
  23: 'San Luis de Quillota',
  24: 'Trasandino',
  25: 'Provincial Osorno',
  26: 'San Marcos de Arica',
  27: 'Atlético Colina',
  28: 'Deportes Concepción',
  29: 'Universidad de Concepción',
  30: 'Independiente de Avellaneda',
  31: 'San Marcos de Quillota',
  32: 'Deportes Valdivia',
  37: 'Sporting Cristal',
  38: 'Alianza Lima',
  39: 'Universitario',
  41: 'Bado de Querétaro',
  42: 'Pachuca FC',
  43: 'Monterrey FC',
  44: 'Atlético San Luis Potosí',
  45: 'Club América',
  46: 'León FC',
  47: 'FC Juárez',
  48: 'Toluca',
  49: 'Guadalajara',
  50: 'San Luis Potosí',
  51: 'Tigres UANL',
  52: 'Real Salt Lake',
  53: 'New York City FC',
  54: 'New York Red Bulls',
  55: 'Los Angeles FC',
  56: 'LA Galaxy',
  57: 'San Jose Earthquakes',
  58: 'Seattle Sounders',
  59: 'Portland Timbers',
  60: 'Colorado Rapids',
  61: 'Atlético Mineiro',
  62: 'Flamengo',
  63: 'Vasco da Gama',
  64: 'Fluminense',
  65: 'Corinthians',
  66: 'São Paulo FC',
  67: 'Palmeiras',
  68: 'Santos FC',
  69: 'Grêmio',
  70: 'Internacional',
  71: 'Benfica',
  72: 'Sporting CP',
  73: 'Porto',
  74: 'Lecce',
  75: 'Udinese',
  76: 'SC Braga',
  77: 'RCD Espanyol',
  78: 'Alcorcón',
  79: 'FC Barcelona',
  80: 'Real Madrid',
  81: 'Copenhague',
  82: 'Aalborg BK',
  83: 'Molde FK',
  84: 'Strømsgodset IF',
  85: 'Viking FK',
  86: 'FK Partizan',
  87: 'Dynamo Ceské Budějovice',
  88: 'Prague City FC',
  89: 'Everton',
  90: 'Cobreloa',
  91: 'S/C o Desconocido',
  92: 'Ñublense',
  93: 'Cobresal',
  94: 'Deportes Limache',
  95: 'Curicó Unido',
  96: 'Deportes Antofagasta',
  97: 'Deportes Recoleta',
  98: 'Deportes Temuco',
  99: 'Unión San Felipe',
  101: 'Brujas de Salamanca',
  102: 'Concón National',
  103: 'Provincial Ovalle',
  104: 'Real San Joaquín',
  105: 'Santiago City',
  107: 'Colchagua',
  108: 'Deportes Linares',
  109: 'Deportes Rengo',
  110: 'General Velásquez',
  111: 'Lota Schwager'
};

/**
 * Nota: Los siguientes cortes de bandas de clasificación de carga GPS (BAJO / MEDIO / ALTO)
 * están calculados utilizando percentiles internos (p25 y p75) sobre las sesiones históricas
 * de gps_import de la muestra histórica de la FFCh, no normas externas.
 * Deben recalcularse periódicamente.
 */
export const BANDAS_GPS: Record<string, Record<string, { p25: number; p75: number }>> = {
  GENERAL: { // n=3639
    minutos:              { p25: 50,    p75: 85 },
    dist_total_m:         { p25: 3857,  p75: 6577 },
    m_por_min:            { p25: 65.8,  p75: 90.0 },
    dist_ai_m_15_kmh:     { p25: 431,   p75: 1027 },
    dist_mai_m_20_kmh:    { p25: 91.1,  p75: 352.0 },
    dist_sprint_m_25_kmh: { p25: 1.2,   p75: 71.3 },
    sprints_n:            { p25: 0,     p75: 4 },
    vel_max_kmh:          { p25: 24.9,  p75: 29.0 },
    acc_decc_ai_n:        { p25: 44,    p75: 108 },
  },
  sub_15: { // n=902
    minutos:              { p25: 61,    p75: 92 },
    dist_total_m:         { p25: 4417,  p75: 8033 },
    m_por_min:            { p25: 63.5,  p75: 87.5 },
    dist_ai_m_15_kmh:     { p25: 461,   p75: 985 },
    dist_mai_m_20_kmh:    { p25: 105.2, p75: 310.3 },
    dist_sprint_m_25_kmh: { p25: 3.0,   p75: 64.5 },
    sprints_n:            { p25: 0,     p75: 3 },
    vel_max_kmh:          { p25: 25.1,  p75: 28.4 },
    acc_decc_ai_n:        { p25: 51,    p75: 111 },
  },
  sub_16: { // n=385
    minutos:              { p25: 64,    p75: 83 },
    dist_total_m:         { p25: 4776,  p75: 6168 },
    m_por_min:            { p25: 68.2,  p75: 81.8 },
    dist_ai_m_15_kmh:     { p25: 610,   p75: 1069 },
    dist_mai_m_20_kmh:    { p25: 166.5, p75: 464.8 },
    dist_sprint_m_25_kmh: { p25: 9.6,   p75: 97.2 },
    sprints_n:            { p25: 0,     p75: 5 },
    vel_max_kmh:          { p25: 25.8,  p75: 28.8 },
    acc_decc_ai_n:        { p25: 85,    p75: 136 },
  },
  sub_17: { // n=1334
    minutos:              { p25: 39,    p75: 76 },
    dist_total_m:         { p25: 3061,  p75: 6103 },
    m_por_min:            { p25: 68.0,  p75: 93.4 },
    dist_ai_m_15_kmh:     { p25: 346,   p75: 1048 },
    dist_mai_m_20_kmh:    { p25: 70.0,  p75: 356.4 },
    dist_sprint_m_25_kmh: { p25: 0,     p75: 73.1 },
    sprints_n:            { p25: 0,     p75: 4 },
    vel_max_kmh:          { p25: 24.6,  p75: 29.5 },
    acc_decc_ai_n:        { p25: 37,    p75: 93 },
  },
  sub_20: { // n=1018
    minutos:              { p25: 49,    p75: 86 },
    dist_total_m:         { p25: 3859,  p75: 6446 },
    m_por_min:            { p25: 63.4,  p75: 91.3 },
    dist_ai_m_15_kmh:     { p25: 426,   p75: 1004 },
    dist_mai_m_20_kmh:    { p25: 76.7,  p75: 338.5 },
    dist_sprint_m_25_kmh: { p25: 0,     p75: 70.4 },
    sprints_n:            { p25: 0,     p75: 4 },
    vel_max_kmh:          { p25: 24.7,  p75: 29.3 },
    acc_decc_ai_n:        { p25: 43,    p75: 107 },
  },
};

export function clasificarGPS(
  parametro: string, 
  valor: number | null | undefined, 
  categoria: string
): 'BAJO' | 'MEDIO' | 'ALTO' | 'SIN_DATO' {
  if (valor === null || valor === undefined) {
    return 'SIN_DATO';
  }

  // Normalizar categoría
  let catKey = 'GENERAL';
  if (categoria) {
    const normCat = categoria.toLowerCase().replace(/[\s-_]/g, '');
    if (normCat.includes('15') || normCat.includes('u15') || normCat.includes('sub15')) {
      catKey = 'sub_15';
    } else if (normCat.includes('16') || normCat.includes('u16') || normCat.includes('sub16')) {
      catKey = 'sub_16';
    } else if (normCat.includes('17') || normCat.includes('u17') || normCat.includes('sub17')) {
      catKey = 'sub_17';
    } else if (normCat.includes('20') || normCat.includes('u20') || normCat.includes('sub20')) {
      catKey = 'sub_20';
    }
  }

  const bounds = BANDAS_GPS[catKey];
  if (!bounds) {
    return 'SIN_DATO';
  }

  // Normalizar parámetro
  let paramKey = parametro;
  if (parametro === 'distancia_total' || parametro === 'distancia' || parametro === 'dist_total_m') {
    paramKey = 'dist_total_m';
  } else if (parametro === 'm_por_min' || parametro === 'm/min') {
    paramKey = 'm_por_min';
  } else if (parametro === 'dist_ai_m_15_kmh' || parametro === 'mai_15' || parametro === 'mai') {
    paramKey = 'dist_ai_m_15_kmh';
  } else if (parametro === 'dist_mai_m_20_kmh' || parametro === 'hsr_20' || parametro === 'hsr') {
    paramKey = 'dist_mai_m_20_kmh';
  } else if (parametro === 'dist_sprint_m_25_kmh' || parametro === 'sprint_25' || parametro === 'sprint') {
    paramKey = 'dist_sprint_m_25_kmh';
  } else if (parametro === 'sprints_n' || parametro === 'sprints') {
    paramKey = 'sprints_n';
  } else if (parametro === 'vel_max_kmh' || parametro === 'vel_max' || parametro === 'velocidad_maxima') {
    paramKey = 'vel_max_kmh';
  } else if (parametro === 'acc_decc_ai_n' || parametro === 'acc_dec' || parametro === 'acc/dec') {
    paramKey = 'acc_decc_ai_n';
  }

  const metricBounds = bounds[paramKey];
  if (!metricBounds) {
    // Si no coincide exactamente, buscamos una coincidencia parcial en las llaves del bounds
    const foundKey = Object.keys(bounds).find(k => 
      k.includes(paramKey) || paramKey.includes(k)
    );
    if (foundKey) {
      const mb = bounds[foundKey];
      if (valor <= mb.p25) return 'BAJO';
      if (valor <= mb.p75) return 'MEDIO';
      return 'ALTO';
    }
    return 'SIN_DATO';
  }

  if (valor <= metricBounds.p25) {
    return 'BAJO';
  } else if (valor <= metricBounds.p75) {
    return 'MEDIO';
  } else {
    return 'ALTO';
  }
}
