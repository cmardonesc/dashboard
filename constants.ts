
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
  'unionespanola': 'https://drive.google.com/file/d/1VXU3ehA5V1d6dtT-20uD1OmAfR9yj0hG/view?usp=sharing',
  'unionlacalera': 'https://drive.google.com/file/d/1WAA9Mo-wKemc3Fj694ySoZUhM9ICK8O7/view?usp=sharing',
  'unionsanfelipe': 'https://drive.google.com/file/d/1HXJw-elYvwJG1yn3DUaJGFl1hKmGClqf/view?usp=sharing',
  'universidadcatolica': 'https://drive.google.com/file/d/1z5OO2cabtRy6qHigXumVJH_PCO7TMwTt/view?usp=sharing',
  'universidaddechile': 'https://drive.google.com/file/d/1Eqp8Cf4p--CcAZ43fFFnOfB06ztDPk_X/view?usp=sharing',
  'universidaddeconcepcion': 'https://drive.google.com/file/d/1I5eQfDw0aaQysfZpbF_wmepx52BubEbm/view?usp=sharing'
};

/**
 * Logo de la Federación (puedes usar un enlace de Google Drive aquí)
 */
export const FEDERATION_LOGO = "https://drive.google.com/file/d/1dACZfh-DDxPKlH0bo5YLiuhhYAAEKy0s/view?usp=sharing";
