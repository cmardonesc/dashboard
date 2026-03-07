
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
