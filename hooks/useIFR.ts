
import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface GPSData {
  dist_total_m: number;
  m_por_min: number;
  dist_ai_m_15_kmh: number;
  dist_mai_m_20_kmh: number;
  dist_sprint_m_25_kmh: number;
  acc_decc_ai_n: number;
}

export interface IFRResult {
  score: number;
  color: string;
}

export const useIFR = () => {
  const fetchReference = useCallback(async (category: string, position: string) => {
    try {
      const { data, error } = await supabase
        .from('referencias_gps')
        .select('*')
        .ilike('categoria', category)
        .ilike('posicion', position)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error fetching IFR reference:', err);
      return null;
    }
  }, []);

  const calcularIFR = useCallback((gpsData: GPSData, ref: any): IFRResult | null => {
    if (!ref) return null;

    // Weights: 0.2 Volumen, 0.3 Intensidad, 0.5 Neuromuscular
    
    // 1. Volumen (20%): Distancia Total y Metros/min
    const refDistTotal = ref['Total Distance (m)'] || ref.distancia_total || ref.dist_total_m || 1;
    const refMetrosMin = ref['Metros/min'] || ref.metros_minuto || ref.m_por_min || 1;
    
    const volDT = (gpsData.dist_total_m / refDistTotal) * 100;
    const volMM = (gpsData.m_por_min / refMetrosMin) * 100;
    const volumen = (volDT + volMM) / 2;

    // 2. Intensidad (30%): >15km/h (Dist. AI) y >20km/h (Dist. MAI)
    const refDistAI = ref['AInt >15 km/h'] || ref.distancia_ai || ref.dist_ai_m_15_kmh || 1;
    const refDistMAI = ref['MAInt >20km/h'] || ref.distancia_mai || ref.dist_mai_m_20_kmh || 1;
    
    const intAI = (gpsData.dist_ai_m_15_kmh / refDistAI) * 100;
    const intMAI = (gpsData.dist_mai_m_20_kmh / refDistMAI) * 100;
    const intensidad = (intAI + intMAI) / 2;

    // 3. Neuromuscular (50%): Sprint >25km/h y #Acc+Decc AI
    const refDistSprint = ref['Sprint >25 km/h'] || ref.distancia_sprint || ref.dist_sprint_m_25_kmh || 1;
    const refAccDecc = ref['#Acc+Decc AI'] || ref.acc_decc_ai || ref.acc_decc_ai_n || 1;
    
    const neuroSprint = (gpsData.dist_sprint_m_25_kmh / refDistSprint) * 100;
    const neuroAccDecc = (gpsData.acc_decc_ai_n / refAccDecc) * 100;
    const neuromuscular = (neuroSprint + neuroAccDecc) / 2;

    const ifr = (volumen * 0.2) + (intensidad * 0.3) + (neuromuscular * 0.5);

    const getIFRColor = (val: number) => {
      if (val < 50) return '#2ecc71'; // Verde
      if (val < 85) return '#f1c40f'; // Amarillo
      if (val < 110) return '#e67e22'; // Naranja
      return '#e74c3c'; // Rojo
    };

    return {
      score: ifr,
      color: getIFRColor(ifr)
    };
  }, []);

  return { fetchReference, calcularIFR };
};
