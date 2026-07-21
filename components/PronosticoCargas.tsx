import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Category, CATEGORY_ID_MAP } from '../types';
import jsPDF from 'jspdf';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { FEDERATION_LOGO, BANDAS_GPS, clasificarGPS } from '../constants';
import { getDriveDirectLink } from '../lib/utils';

// Defined metrics for the table
interface MetricDef {
  id: string;
  label: string;
  unit: string;
  fallback: {
    Baja: [number, number, number]; // [P25, P50, P75]
    Media: [number, number, number];
    Alta: [number, number, number];
  };
}

const METRICS: MetricDef[] = [
  {
    id: 'dist_total_m',
    label: 'Distancia Total',
    unit: 'm',
    fallback: {
      Baja: [3000, 4000, 5000],
      Media: [5000, 6500, 8000],
      Alta: [8000, 10000, 12000]
    }
  },
  {
    id: 'dist_ai_m_15_kmh',
    label: 'MAI >15 km/h',
    unit: 'm',
    fallback: {
      Baja: [100, 200, 300],
      Media: [300, 500, 700],
      Alta: [700, 1000, 1400]
    }
  },
  {
    id: 'dist_mai_m_20_kmh',
    label: 'HSR >20 km/h',
    unit: 'm',
    fallback: {
      Baja: [20, 50, 80],
      Media: [80, 120, 180],
      Alta: [180, 250, 350]
    }
  },
  {
    id: 'dist_sprint_m_25_kmh',
    label: 'Sprint >25 km/h',
    unit: 'm',
    fallback: {
      Baja: [0, 10, 20],
      Media: [20, 40, 60],
      Alta: [60, 100, 150]
    }
  },
  {
    id: 'acc_decc_ai_n',
    label: 'Acc / Dec',
    unit: 'n',
    fallback: {
      Baja: [40, 60, 80],
      Media: [80, 110, 140],
      Alta: [140, 180, 220]
    }
  }
];

const CATEGORY_LABELS: Record<Category, string> = {
  [Category.SUB_13]: 'Sub 13',
  [Category.SUB_14]: 'Sub 14',
  [Category.SUB_15]: 'Sub 15',
  [Category.SUB_16]: 'Sub 16',
  [Category.SUB_17]: 'Sub 17',
  [Category.SUB_18]: 'Sub 18',
  [Category.SUB_20]: 'Sub 20',
  [Category.SUB_21]: 'Sub 21',
  [Category.SUB_23]: 'Sub 23',
  [Category.ADULTA]: 'Adulta / Absoluta',
};

const METRIC_MAX_VALUES: Record<string, number> = {
  dist_total_m: 13301.0,
  dist_ai_m_15_kmh: 3049.4,
  dist_mai_m_20_kmh: 1490.8,
  dist_sprint_m_25_kmh: 499.8,
  acc_decc_ai_n: 294
};

const METRIC_STEPS: Record<string, number> = {
  dist_total_m: 50,
  dist_ai_m_15_kmh: 10,
  dist_mai_m_20_kmh: 5,
  dist_sprint_m_25_kmh: 1,
  acc_decc_ai_n: 1
};

const METRIC_THREE_VALS: Record<string, number[]> = {
  dist_total_m: [1500, 2000, 3000],
  dist_ai_m_15_kmh: [100, 200, 500],
  dist_mai_m_20_kmh: [50, 150, 300],
  dist_sprint_m_25_kmh: [30, 50, 150],
  acc_decc_ai_n: [30, 40, 50]
};

type Intensity = 'Baja' | 'Media' | 'Alta';

export const getRangeForMetric = (metricId: string, baseP50: number, factor: number = 1, intensity: 'Baja' | 'Media' | 'Alta' = 'Media') => {
  const mid = baseP50 * factor;
  let D = 2000;
  
  const normId = metricId.toLowerCase().trim();
  const isTotal = normId.includes('dist_total') || normId === 'dist_total_m' || normId === 'distancia total' || normId.includes('distancia total');
  const isAi15 = normId.includes('dist_ai_m_15_kmh') || normId === 'dist_ai_m_15_kmh' || normId.includes('15 km/h') || normId.includes('15km/h') || normId.includes('mai >15');
  const isMai20 = normId.includes('dist_mai_m_20_kmh') || normId === 'dist_mai_m_20_kmh' || normId.includes('20 km/h') || normId.includes('20km/h') || normId.includes('hsr >20');
  const isSprint25 = normId.includes('dist_sprint_m_25_kmh') || normId === 'dist_sprint_m_25_kmh' || normId.includes('25 km/h') || normId.includes('25km/h') || normId.includes('sprint >25');
  const isAccDec = normId.includes('acc_decc_ai_n') || normId === 'acc_decc_ai_n' || normId.includes('acc/dec') || normId.includes('acc / dec') || normId.includes('acc') || normId.includes('dec');

  if (intensity === 'Baja') {
    if (isTotal) D = 1500;
    else if (isAi15) D = 100;
    else if (isMai20) D = 50;
    else if (isSprint25) D = 30;
    else if (isAccDec) D = 30;
  } else if (intensity === 'Alta') {
    if (isTotal) D = 3000;
    else if (isAi15) D = 500;
    else if (isMai20) D = 300;
    else if (isSprint25) D = 150;
    else if (isAccDec) D = 50;
  } else { // Media (or default)
    if (isTotal) D = 2000;
    else if (isAi15) D = 200;
    else if (isMai20) D = 150;
    else if (isSprint25) D = 50;
    else if (isAccDec) D = 40;
  }

  if (D % 50 === 0) {
    const min = Math.max(0, Math.round((mid - D / 2) / 50) * 50);
    const max = min + D;
    const p50 = Math.round(mid / 50) * 50;
    return { min, max, p50 };
  } else {
    const min = Math.max(0, Math.round(mid - D / 2));
    const max = min + D;
    const p50 = Math.round(mid);
    return { min, max, p50 };
  }
};

export default function PronosticoCargas({ 
  clubs,
  selectedCategoryId,
  onCategoryChange
}: { 
  clubs: any[];
  selectedCategoryId?: number | null;
  onCategoryChange?: (categoryId: number | null) => void;
}) {
  // Selectors State
  const [selectedCategory, setSelectedCategory] = useState<Category | ''>('');
  const [selectedMicrocycle, setSelectedMicrocycle] = useState<any | null>(null);
  
  // Historical data states
  const [gpsImportRows, setGpsImportRows] = useState<any[]>([]);
  const [microcycles, setMicrocycles] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'warning' | 'error'; text: string } | null>(null);

  // Per-day user planning data
  const [dayIntensities, setDayIntensities] = useState<{ [dayIdx: number]: Intensity }>({});
  // Key format: "dayIdx_metricId" => value
  const [plannedValues, setPlannedValues] = useState<{ [key: string]: number }>({});

  // 1. Fetch historical GPS records & Microcycles on load
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch gps_import
      const { data: gpsData, error: gpsError } = await supabase
        .from('gps_import')
        .select('*');
      if (gpsError) throw gpsError;
      setGpsImportRows(gpsData || []);

      // Fetch microcycles
      const { data: microData, error: microError } = await supabase
        .from('microcycles')
        .select('*');
      if (microError) throw microError;
      setMicrocycles(microData || []);
    } catch (err: any) {
      console.error("Error loading historical reference data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Pre-select category and microcycle on data load
  useEffect(() => {
    if (microcycles.length > 0) {
      // Filter categories that have microcycles registered
      const availableCategories = Object.values(Category).filter(cat => {
        const catId = CATEGORY_ID_MAP[cat];
        return microcycles.some(m => m.category_id === catId);
      });

      if (availableCategories.length > 0) {
        const todayStr = new Date().toISOString().split('T')[0];
        let initialCat = availableCategories[0];
        let initialMc = null;

        if (selectedCategoryId) {
          const catEntry = Object.entries(CATEGORY_ID_MAP).find(([_, val]) => val === selectedCategoryId);
          if (catEntry && availableCategories.includes(catEntry[0] as Category)) {
            initialCat = catEntry[0] as Category;
          }
        } else {
          // Try to find if there is an active microcycle today
          const activeTodayMc = microcycles.find(m => todayStr >= m.start_date && todayStr <= m.end_date);
          if (activeTodayMc) {
            const foundCat = Object.entries(CATEGORY_ID_MAP).find(([_, val]) => val === activeTodayMc.category_id)?.[0] as Category | undefined;
            if (foundCat) {
              initialCat = foundCat;
              initialMc = activeTodayMc;
            }
          }
        }

        setSelectedCategory(initialCat);
        if (initialMc) {
          setSelectedMicrocycle(initialMc);
        } else {
          // Default to the most recent microcycle of that category
          const catId = CATEGORY_ID_MAP[initialCat];
          const sortedMicros = microcycles
            .filter(m => m.category_id === catId)
            .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
          if (sortedMicros.length > 0) {
            setSelectedMicrocycle(sortedMicros[0]);
          }
        }
      }
    }
  }, [microcycles, selectedCategoryId]);

  // Sincronizar selección del padre cuando cambia dinámicamente
  useEffect(() => {
    if (selectedCategoryId && microcycles.length > 0) {
      const catEntry = Object.entries(CATEGORY_ID_MAP).find(([_, val]) => val === selectedCategoryId);
      if (catEntry) {
        const cat = catEntry[0] as Category;
        if (cat !== selectedCategory) {
          setSelectedCategory(cat);
          const catId = CATEGORY_ID_MAP[cat];
          const categoryMicros = microcycles
            .filter(m => m.category_id === catId)
            .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
          
          if (categoryMicros.length > 0) {
            setSelectedMicrocycle(categoryMicros[0]);
          } else {
            setSelectedMicrocycle(null);
          }
        }
      }
    }
  }, [selectedCategoryId, microcycles, selectedCategory]);

  // List of microcycles filtered by category
  const filteredMicrocycles = useMemo(() => {
    if (!selectedCategory) return [];
    const catId = CATEGORY_ID_MAP[selectedCategory];
    return microcycles
      .filter(m => m.category_id === catId)
      .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
  }, [microcycles, selectedCategory]);

  // Calculate dynamic days based on selected microcycle
  const daysCount = useMemo(() => {
    if (!selectedMicrocycle) return 0;
    const start = new Date(selectedMicrocycle.start_date + 'T00:00:00');
    const end = new Date(selectedMicrocycle.end_date + 'T00:00:00');
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [selectedMicrocycle]);

  // Helper to determine exact date & label for each day
  const getDayDetails = (dayIdx: number) => {
    if (!selectedMicrocycle) return { label: `Día ${dayIdx + 1}`, dateStr: '' };
    const date = new Date(selectedMicrocycle.start_date + 'T00:00:00');
    date.setDate(date.getDate() + dayIdx);
    
    // Timezone-safe date string format
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    const weekdays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const weekday = weekdays[date.getDay()];
    const formattedDate = date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
    
    return {
      label: `${weekday} ${formattedDate}`,
      dateStr
    };
  };

  // Category and Microcycle Change Handlers
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cat = e.target.value as Category;
    setSelectedCategory(cat);
    
    const catId = CATEGORY_ID_MAP[cat];
    if (onCategoryChange) {
      onCategoryChange(catId);
    }
    
    const categoryMicros = microcycles
      .filter(m => m.category_id === catId)
      .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
    
    if (categoryMicros.length > 0) {
      setSelectedMicrocycle(categoryMicros[0]);
    } else {
      setSelectedMicrocycle(null);
    }
  };

  const handleMicrocycleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const mcId = e.target.value;
    const mc = microcycles.find(m => String(m.id) === mcId);
    setSelectedMicrocycle(mc || null);
  };

  // Helper for percentiles
  const getPercentile = (sorted: number[], percentile: number): number => {
    if (sorted.length === 0) return 0;
    const index = (sorted.length - 1) * percentile;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
  };

  // 2. Compute references for ALL intensities (Baja, Media, Alta) using Terciles from historical records
  const { referencesByIntensity, nMicros, confidenceState } = useMemo(() => {
    if (gpsImportRows.length === 0 || !selectedCategory) {
      return {
        referencesByIntensity: null,
        nMicros: 0,
        confidenceState: 'insuficiente' as 'robust' | 'aviso' | 'insuficiente'
      };
    }

    const catId = CATEGORY_ID_MAP[selectedCategory];

    // A. Group by date to find daily squad averages
    const uniqueDates = Array.from(new Set(
      gpsImportRows
        .filter(r => {
          const matchingMicro = microcycles.find(m => r.fecha >= m.start_date && r.fecha <= m.end_date);
          return matchingMicro && matchingMicro.category_id === catId;
        })
        .map(r => r.fecha)
    ));

    const dailyAverages: {
      fecha: string;
      dist_total_m: number;
      dist_ai_m_15_kmh: number;
      dist_mai_m_20_kmh: number;
      dist_sprint_m_25_kmh: number;
      acc_decc_ai_n: number;
    }[] = [];

    const uniqueMicrocycleIdsWithGps = new Set<string>();

    uniqueDates.forEach(fecha => {
      const recordsForDate = gpsImportRows.filter(r => r.fecha === fecha);
      if (recordsForDate.length === 0) return;

      const matchingMicro = microcycles.find(m => fecha >= m.start_date && fecha <= m.end_date);
      if (matchingMicro && matchingMicro.category_id === catId) {
        uniqueMicrocycleIdsWithGps.add(matchingMicro.id);
      }

      const count = recordsForDate.length;
      dailyAverages.push({
        fecha,
        dist_total_m: recordsForDate.reduce((sum, r) => sum + (Number(r.dist_total_m) || 0), 0) / count,
        dist_ai_m_15_kmh: recordsForDate.reduce((sum, r) => sum + (Number(r.dist_ai_m_15_kmh) || 0), 0) / count,
        dist_mai_m_20_kmh: recordsForDate.reduce((sum, r) => sum + (Number(r.dist_mai_m_20_kmh) || 0), 0) / count,
        dist_sprint_m_25_kmh: recordsForDate.reduce((sum, r) => sum + (Number(r.dist_sprint_m_25_kmh) || 0), 0) / count,
        acc_decc_ai_n: recordsForDate.reduce((sum, r) => sum + (Number(r.acc_decc_ai_n) || 0), 0) / count,
      });
    });

    const calculatedNMicros = uniqueMicrocycleIdsWithGps.size;

    // B. Classify days by overall volume (intensity tier) using terciles of dist_total_m
    const sortedDailyAverages = [...dailyAverages].sort((a, b) => a.dist_total_m - b.dist_total_m);
    const L = sortedDailyAverages.length;

    const bajaLimit = Math.floor(L / 3);
    const mediaLimit = Math.floor((2 * L) / 3);

    const classifiedAverages = dailyAverages.map(avg => {
      const sortedIndex = sortedDailyAverages.findIndex(s => s.fecha === avg.fecha);
      let intensity: Intensity = 'Media';
      if (sortedIndex < bajaLimit) {
        intensity = 'Baja';
      } else if (sortedIndex >= mediaLimit) {
        intensity = 'Alta';
      }
      return { ...avg, intensity };
    });

    // C. Group metrics for EACH intensity level and calculate P25, Mediana (P50), P75
    const computedRefs: Record<Intensity, Record<string, { p25: number; p50: number; p75: number }>> = {
      Baja: {},
      Media: {},
      Alta: {}
    };

    (['Baja', 'Media', 'Alta'] as const).forEach(intensity => {
      const filteredDays = classifiedAverages.filter(d => d.intensity === intensity);
      
      METRICS.forEach(metric => {
        const values = filteredDays
          .map(d => d[metric.id as keyof typeof d] as number)
          .filter(v => v !== undefined && !isNaN(v));

        if (values.length > 0) {
          const sorted = [...values].sort((a, b) => a - b);
          computedRefs[intensity][metric.id] = {
            p25: Math.round(getPercentile(sorted, 0.25)),
            p50: Math.round(getPercentile(sorted, 0.50)),
            p75: Math.round(getPercentile(sorted, 0.75)),
          };
        }
      });
    });

    // Confidence status based on number of unique microcycles with data
    let conf: 'robust' | 'aviso' | 'insuficiente' = 'robust';
    if (calculatedNMicros < 3) {
      conf = 'insuficiente';
    } else if (calculatedNMicros >= 3 && calculatedNMicros <= 7) {
      conf = 'aviso';
    }

    return {
      referencesByIntensity: computedRefs,
      nMicros: calculatedNMicros,
      confidenceState: conf
    };
  }, [gpsImportRows, microcycles, selectedCategory]);

  // Helper to retrieve recommended range for a specific day and metric
  const getRecommendation = (dayIdx: number, metricId: string) => {
    const intensity = dayIntensities[`${dayIdx}_${metricId}`] || dayIntensities[dayIdx] || 'Media';

    // If we have calculated references and confidence is NOT insufficient, use calculated
    if (
      referencesByIntensity &&
      referencesByIntensity[intensity] &&
      referencesByIntensity[intensity][metricId] &&
      confidenceState !== 'insuficiente'
    ) {
      const calculated = referencesByIntensity[intensity][metricId];
      return {
        p25: calculated.p25,
        p50: calculated.p50,
        p75: calculated.p75,
        source: 'Histórica'
      };
    }

    // Fallback to presets
    const fallbackRange = METRICS.find(m => m.id === metricId)?.fallback[intensity];
    return {
      p25: fallbackRange ? fallbackRange[0] : 0,
      p50: fallbackRange ? fallbackRange[1] : 0,
      p75: fallbackRange ? fallbackRange[2] : 0,
      source: 'Modelo'
    };
  };

  // Selector de métricas para el gráfico semanal
  const [selectedChartMetric, setSelectedChartMetric] = useState<string>('dist_total_m');

  // Preparar datos para el gráfico
  const chartData = useMemo(() => {
    if (!selectedMicrocycle) return [];
    return Array.from({ length: daysCount }).map((_, dIdx) => {
      const dayInfo = getDayDetails(dIdx);
      const row: any = {
        name: `Día ${dIdx + 1}`,
        fullLabel: dayInfo.label,
      };
      
      METRICS.forEach(metric => {
        const rec = getRecommendation(dIdx, metric.id);
        const currentVal = plannedValues[`${dIdx}_${metric.id}`] !== undefined 
          ? plannedValues[`${dIdx}_${metric.id}`] 
          : rec.p50;
        
        const classified = clasificarGPS(metric.id, currentVal, selectedCategory);
        let currentIntensity: Intensity = 'Media';
        if (classified === 'BAJO') currentIntensity = 'Baja';
        else if (classified === 'ALTO') currentIntensity = 'Alta';

        const range = getRangeForMetric(metric.id, currentVal, 1, currentIntensity);
        const pct = rec.p50 > 0 ? Math.round(((currentVal - rec.p50) / rec.p50) * 100) : 0;

        row[metric.id] = currentVal;
        row[`${metric.id}_min`] = range.min;
        row[`${metric.id}_max`] = range.max;
        row[`${metric.id}_pct`] = pct;
        row[`${metric.id}_rel`] = rec.p50 > 0 ? Math.round((currentVal / rec.p50) * 100) : 100;
        row[`${metric.id}_rec`] = rec.p50;
      });
      
      return row;
    });
  }, [daysCount, selectedMicrocycle, plannedValues, dayIntensities, referencesByIntensity, confidenceState, selectedCategory]);

  // Función para descargar PDF de Planificación y Pronóstico
  const handleDownloadPDF = () => {
    if (!selectedMicrocycle) return;
    
    const doc = new jsPDF('p', 'mm', 'a4');
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    const margin = 15;

    // Colores corporativos (idénticos a FisicaArea / check-in check-out)
    const primaryColor = [2, 66, 140] as [number, number, number];
    const secondaryColor = [226, 35, 26] as [number, number, number];
    const darkColor = [26, 35, 51] as [number, number, number];
    
    // --- TOP COLOR BAR ---
    doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.rect(0, 0, width, 4, 'F');
    
    // --- CONTAINER HEADER (DARK NAVY RIBBON) ---
    doc.setFillColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.rect(margin, 8, width - (margin * 2), 16, 'F');
    
    // Left Title Block
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(margin, 8, 70, 16, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('REPORTE DE PLANIFICACIÓN DE CARGAS', margin + 4, 18);

    // Logo
    const logoUrl = getDriveDirectLink(FEDERATION_LOGO);
    try {
      doc.addImage(logoUrl, 'PNG', margin + 76, 9, 14, 14);
    } catch (e) {
      console.error("Error loading logo for PDF:", e);
    }

    // Category text / Selection name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text('SELECCIÓN NACIONAL', margin + 96, 15);
    
    doc.setFontSize(8);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    const catLabelStr = selectedCategory 
      ? CATEGORY_LABELS[selectedCategory].toUpperCase() 
      : 'LA ROJA';
    doc.text(catLabelStr, margin + 96, 19);

    // --- METADATA BOXES ---
    const boxY = 28;
    const boxW = (width - (margin * 2) - 4) / 2;
    const boxH = 10;

    // Box 1: Proceso / Microciclo
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(margin, boxY, boxW, boxH, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(140, 140, 140);
    doc.text('PROCESO / MICROCICLO', margin + 4, boxY + 3.5);
    doc.setFontSize(7);
    doc.setTextColor(40, 40, 40);
    const microText = `MICROCICLO #${selectedMicrocycle.micro_number || selectedMicrocycle.id}`;
    doc.text(microText.toUpperCase(), margin + 4, boxY + 7.5);

    // Box 2: Periodo / Fecha
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(margin + boxW + 4, boxY, boxW, boxH, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(140, 140, 140);
    doc.text('PERIODO DE TRABAJO', margin + boxW + 4, boxY + 3.5);
    doc.setFontSize(7);
    doc.setTextColor(40, 40, 40);
    const rangeText = `DEL ${new Date(selectedMicrocycle.start_date + 'T12:00:00').toLocaleDateString('es-ES')} AL ${new Date(selectedMicrocycle.end_date + 'T12:00:00').toLocaleDateString('es-ES')}`;
    doc.text(rangeText.toUpperCase(), margin + boxW + 4, boxY + 7.5);

    // --- TABLE ---
    const tableYStart = 44;
    doc.setFillColor(11, 18, 32);
    doc.rect(margin, tableYStart, width - (margin * 2), 8, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("FECHA", margin + 3, tableYStart + 5.5);
    doc.text("INTENSIDAD", margin + 30, tableYStart + 5.5);
    doc.text("DISTANCIA (M)", margin + 75, tableYStart + 5.5, { align: 'right' });
    doc.text("HSR (M)", margin + 105, tableYStart + 5.5, { align: 'right' });
    doc.text("MAI (M)", margin + 130, tableYStart + 5.5, { align: 'right' });
    doc.text("SPRINT (M)", margin + 155, tableYStart + 5.5, { align: 'right' });
    doc.text("ACC/DEC", margin + 180, tableYStart + 5.5, { align: 'right' });
    
    let currentY = tableYStart + 8;
    
    chartData.forEach((row, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, currentY, width - (margin * 2), 7.5, 'F');
      }
      
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, currentY + 7.5, width - margin, currentY + 7.5);
      
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      const dayInfo = getDayDetails(idx);
      const compactLabel = dayInfo.label
        .replace('Domingo', 'Dom')
        .replace('Lunes', 'Lun')
        .replace('Martes', 'Mar')
        .replace('Miércoles', 'Mié')
        .replace('Jueves', 'Jue')
        .replace('Viernes', 'Vie')
        .replace('Sábado', 'Sáb');
      doc.text(compactLabel, margin + 3, currentY + 5);
      
      const intensity = dayIntensities[idx] || 'Media';
      doc.setFont("helvetica", "normal");
      
      if (intensity === 'Alta') {
        doc.setTextColor(220, 38, 38);
        doc.setFont("helvetica", "bold");
      } else if (intensity === 'Baja') {
        doc.setTextColor(217, 119, 6);
      } else {
        doc.setTextColor(5, 150, 105);
      }
      doc.text(intensity.toUpperCase(), margin + 30, currentY + 5);
      
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "normal");
      
      const distMin = row['dist_total_m_min'] || 0;
      const distMax = row['dist_total_m_max'] || 0;
      const maiMin = row['dist_ai_m_15_kmh_min'] || 0;
      const maiMax = row['dist_ai_m_15_kmh_max'] || 0;
      const hsrMin = row['dist_mai_m_20_kmh_min'] || 0;
      const hsrMax = row['dist_mai_m_20_kmh_max'] || 0;
      const sprintMin = row['dist_sprint_m_25_kmh_min'] || 0;
      const sprintMax = row['dist_sprint_m_25_kmh_max'] || 0;
      const accMin = row['acc_decc_ai_n_min'] || 0;
      const accMax = row['acc_decc_ai_n_max'] || 0;
      
      const distText = `${distMin.toLocaleString()} - ${distMax.toLocaleString()}`;
      const hsrText = `${hsrMin.toLocaleString()} - ${hsrMax.toLocaleString()}`;
      const maiText = `${maiMin.toLocaleString()} - ${maiMax.toLocaleString()}`;
      const sprintText = `${sprintMin.toLocaleString()} - ${sprintMax.toLocaleString()}`;
      const accText = `${accMin.toLocaleString()} - ${accMax.toLocaleString()}`;
      
      doc.text(distText, margin + 75, currentY + 5, { align: 'right' });
      doc.text(hsrText, margin + 105, currentY + 5, { align: 'right' });
      doc.text(maiText, margin + 130, currentY + 5, { align: 'right' });
      doc.text(sprintText, margin + 155, currentY + 5, { align: 'right' });
      doc.text(accText, margin + 180, currentY + 5, { align: 'right' });
      
      currentY += 7.5;
    });

    // --- FIVE SEPARATE COMPACT CHARTS GRID (3x2 GRID) ---
    const chartYStart = currentY + 6;
    
    // Modern brand color variants map for [Min, Max]
    const metricColorsMap: Record<string, { min: [number, number, number], max: [number, number, number] }> = {
      "dist_total_m": { min: [112, 163, 227], max: [2, 66, 140] },       // Dist Total (Blue)
      "dist_ai_m_15_kmh": { min: [110, 231, 183], max: [16, 185, 129] },  // MAI >15 (Green/Verde)
      "dist_mai_m_20_kmh": { min: [254, 215, 170], max: [245, 158, 11] }, // HSR >20 (Orange/Naranjo)
      "dist_sprint_m_25_kmh": { min: [255, 143, 138], max: [226, 35, 26] },// Sprint >25 (Red/Rojo)
      "acc_decc_ai_n": { min: [192, 132, 252], max: [139, 92, 246] }     // Acc/Dec (Purple)
    };

    const drawSmallChart = (
      x: number,
      y: number,
      w: number,
      h: number,
      title: string,
      metricId: string,
      unit: string
    ) => {
      const colors = metricColorsMap[metricId] || { min: [200, 200, 200], max: [100, 100, 100] };

      // 1. Background Bento Card with a subtle border
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.roundedRect(x, y, w, h, 2, 2, 'D');

      // 2. Premium left vertical border accent strip matching the metric color
      doc.setFillColor(colors.max[0], colors.max[1], colors.max[2]);
      doc.rect(x, y + 0.1, 1.5, h - 0.2, 'F');

      // 3. Title
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.text(title.toUpperCase(), x + 4.5, y + 6);

      // 4. Subtle Mini Legend inside each bento box (Min vs Max)
      const legendX = x + w - 24;
      const legendY = y + 6;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(5);

      // Min Legend
      doc.setFillColor(colors.min[0], colors.min[1], colors.min[2]);
      doc.rect(legendX, legendY - 1.6, 2, 1.8, 'F');
      doc.setTextColor(100, 116, 139);
      doc.text("Mín", legendX + 2.5, legendY - 0.2);

      // Max Legend
      doc.setFillColor(colors.max[0], colors.max[1], colors.max[2]);
      doc.rect(legendX + 10, legendY - 1.6, 2, 1.8, 'F');
      doc.setTextColor(15, 23, 42);
      doc.text("Máx", legendX + 12.5, legendY - 0.2);

      // Inner chart coordinates
      const cX = x + 11;
      const cY = y + 10;
      const cW = w - 16;
      const cH = h - 17;

      // Find max value in both min and max to auto-scale the chart correctly
      const maxVals = chartData.map(r => r[`${metricId}_max`] as number || r[metricId] as number || 0);
      const maxVal = Math.max(...maxVals, 1);
      const scaleMax = Math.ceil(maxVal * 1.30); // 30% headroom for text labels above bars

      // Y axis grid lines (0, 50%, 100%)
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.15);
      for (let i = 0; i <= 2; i++) {
        const gridY = cY + cH - (i * (cH / 2));
        doc.line(cX, gridY, cX + cW, gridY);
        const tickVal = Math.round((scaleMax / 2) * i);
        doc.setTextColor(148, 163, 184);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.8);
        let displayVal = tickVal.toLocaleString();
        if (metricId === 'dist_total_m') {
          displayVal = (tickVal / 1000).toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
        }
        doc.text(`${displayVal}${unit ? ' ' + unit : ''}`, cX - 2.5, gridY + 0.8, { align: 'right' });
      }

      // Draw dual bars and top labels for each day
      const totalDays = chartData.length;
      const daySpacing = cW / totalDays;
      const groupW = daySpacing * 0.72; // width of the dual-bar group
      const barW = (groupW - 0.8) / 2;  // width of each individual bar

      chartData.forEach((row, idx) => {
        const valMin = row[`${metricId}_min`] as number || 0;
        const valMax = row[`${metricId}_max`] as number || 0;

        const barHMin = (valMin / scaleMax) * cH;
        const barHMax = (valMax / scaleMax) * cH;

        const dayCenter = cX + (idx * daySpacing) + (daySpacing / 2);
        const barXMin = dayCenter - barW - 0.4;
        const barXMax = dayCenter + 0.4;

        const barYMin = cY + cH - barHMin;
        const barYMax = cY + cH - barHMax;

        // Draw Min Bar (Softened capsule layout)
        doc.setFillColor(colors.min[0], colors.min[1], colors.min[2]);
        doc.roundedRect(barXMin, barYMin, barW, barHMin, 0.4, 0.4, 'F');

        // Draw Max Bar
        doc.setFillColor(colors.max[0], colors.max[1], colors.max[2]);
        doc.roundedRect(barXMax, barYMax, barW, barHMax, 0.4, 0.4, 'F');

        // Draw Value Label on top of Min Bar (fine/clean styling)
        doc.setTextColor(100, 116, 139);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.5);
        let displayMin = valMin.toLocaleString();
        if (metricId === 'dist_total_m') {
          displayMin = (valMin / 1000).toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
        }
        doc.text(displayMin, barXMin + (barW / 2), barYMin - 0.8, { align: 'center' });

        // Draw Value Label on top of Max Bar (bold, high-contrast)
        doc.setTextColor(15, 23, 42);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(4.8);
        let displayMax = valMax.toLocaleString();
        if (metricId === 'dist_total_m') {
          displayMax = (valMax / 1000).toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
        }
        doc.text(displayMax, barXMax + (barW / 2), barYMax - 0.8, { align: 'center' });

        // Draw Day Indicator (centered below the group)
        doc.setTextColor(148, 163, 184);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(5.5);
        const dayInfo = getDayDetails(idx);
        const parts = dayInfo.label.split(' ');
        const compactLabel = parts[1] && parts[2] ? `${parts[1]} ${parts[2]}` : `D${idx + 1}`; // e.g. "20 Jul"
        doc.text(compactLabel, dayCenter, cY + cH + 4.2, { align: 'center' });
      });
    };

    const drawRecommendationsBox = (x: number, y: number, w: number, h: number) => {
      doc.setFillColor(250, 252, 254);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(x, y, w, h, 2, 2, 'FD');

      // Bento matching vertical ribbon
      doc.setFillColor(2, 66, 140);
      doc.rect(x, y + 0.1, 1.5, h - 0.2, 'F');

      doc.setTextColor(2, 66, 140);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.text("ORIENTACIONES METODOLÓGICAS", x + 5, y + 6);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(5.5);
      doc.setTextColor(71, 85, 105);

      const bulletPoints = [
        "Las referencias se adaptan según el porcentaje objetivo.",
        "Los valores Mín/Máx definen la ventana óptima de trabajo.",
        "Controlar la fatiga del jugador mediante la escala PSE diaria.",
        "Monitorear asimetrías y cargas acumuladas preventivas."
      ];

      bulletPoints.forEach((text, bIdx) => {
        // Draw elegant circular bullet
        doc.setFillColor(226, 35, 26); // La Roja Red for bullets
        doc.ellipse(x + 6, y + 13 + (bIdx * 5), 0.5, 0.5, 'F');

        doc.setTextColor(71, 85, 105);
        doc.text(text, x + 9, y + 14.5 + (bIdx * 5));
      });
    };

    const chartW = 86;
    const chartH = 36;
    const col2X = margin + chartW + 8; // 15 + 86 + 8 = 109

    // Row 1
    drawSmallChart(margin, chartYStart, chartW, chartH, "Distancia Total", "dist_total_m", "km");
    drawSmallChart(col2X, chartYStart, chartW, chartH, "MAI >15 km/h", "dist_ai_m_15_kmh", "m");

    // Row 2
    drawSmallChart(margin, chartYStart + 40, chartW, chartH, "HSR >20 km/h", "dist_mai_m_20_kmh", "m");
    drawSmallChart(col2X, chartYStart + 40, chartW, chartH, "Sprint >25 km/h", "dist_sprint_m_25_kmh", "m");

    // Row 3
    drawSmallChart(margin, chartYStart + 80, chartW, chartH, "Acc / Dec", "acc_decc_ai_n", "");
    drawRecommendationsBox(col2X, chartYStart + 80, chartW, chartH);

    const noteY = chartYStart + 120;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, noteY, width - (margin * 2), 16, 2, 2, 'F');
    
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.text("Nota de Confidencialidad: Este documento contiene pronósticos y planificaciones internas para la Selección Chilena de Fútbol. Las referencias de carga", margin + 5, noteY + 5.5);
    doc.text("están basadas en percentiles históricos reales de rendimiento y deben ser consideradas con carácter consultivo y preventivo.", margin + 5, noteY + 10);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("LA ROJA PERFORMANCE PRO © 2026", margin, height - 10);
    doc.text("PÁG 1 / 1", width - margin, height - 10, { align: 'right' });
    
    const sanitizedCat = selectedCategory ? CATEGORY_LABELS[selectedCategory].replace(/\s+/g, '_') : 'La_Roja';
    doc.save(`Planificacion_Cargas_${sanitizedCat}_MC${selectedMicrocycle.micro_number || selectedMicrocycle.id}.pdf`);
  };

  // 3. Load / Persist planned values & daily intensities from localStorage and Supabase on config changes
  useEffect(() => {
    if (!selectedMicrocycle) {
      setPlannedValues({});
      setDayIntensities({});
      return;
    }

    const loadData = async () => {
      // Load values & intensities from localStorage immediately for fast responsive UI
      const valuesKey = `gps_planning_mc_values_${selectedMicrocycle.id}`;
      const intensitiesKey = `gps_planning_mc_intensities_${selectedMicrocycle.id}`;
      
      let localValues = {};
      let localIntensities = {};

      const storedValues = localStorage.getItem(valuesKey);
      if (storedValues) {
        try {
          localValues = JSON.parse(storedValues);
        } catch (e) {
          console.error(e);
        }
      }

      const storedIntensities = localStorage.getItem(intensitiesKey);
      if (storedIntensities) {
        try {
          localIntensities = JSON.parse(storedIntensities);
        } catch (e) {
          console.error(e);
        }
      }

      setPlannedValues(localValues);
      setDayIntensities(localIntensities);

      // Try fetching from Supabase for sync
      try {
        const { data, error } = await supabase
          .from('gps_planificaciones')
          .select('planned_data, intensities_data')
          .eq('microcycle_id', selectedMicrocycle.id)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          const vals = data.planned_data || {};
          const ints = data.intensities_data || {};
          setPlannedValues(vals);
          setDayIntensities(ints);
          localStorage.setItem(valuesKey, JSON.stringify(vals));
          localStorage.setItem(intensitiesKey, JSON.stringify(ints));
        }
      } catch (err: any) {
        console.log("Supabase planning load bypassed (using offline local state):", err?.message || err);
      }
    };

    loadData();
  }, [selectedMicrocycle]);

  // Handle individual day's intensity change (bypassed since intensity is auto-calculated now)
  const handleDayIntensityChange = (dayIdx: number, intensity: Intensity) => {
    // Left empty or bypassed intentionally as day intensity is now auto-determined based on dist_total_m
  };

  // Handle individual metric intensity change (bypassed since intensity is auto-calculated now)
  const handleMetricIntensityChange = (dayIdx: number, metricId: string, intensity: Intensity) => {
    // Left empty or bypassed intentionally as metric intensity is now auto-determined based on the slider value
  };

  // Handle plan inputs safely (now slider values represent direct absolute values)
  const handlePlanChange = (dayIndex: number, metricId: string, value: string) => {
    if (!selectedMicrocycle) return;
    const num = parseFloat(value) || 0;
    const key = `${dayIndex}_${metricId}`;
    
    setPlannedValues(prev => {
      const updatedValues = { ...prev, [key]: num };
      const valuesKey = `gps_planning_mc_values_${selectedMicrocycle.id}`;
      localStorage.setItem(valuesKey, JSON.stringify(updatedValues));
      
      // Update intensities dynamically
      setDayIntensities(prevInts => {
        const updatedInts = { ...prevInts };
        
        // Calculate intensity for this specific metric
        const classified = clasificarGPS(metricId, num, selectedCategory);
        let metricInt: Intensity = 'Media';
        if (classified === 'BAJO') metricInt = 'Baja';
        else if (classified === 'ALTO') metricInt = 'Alta';
        updatedInts[`${dayIndex}_${metricId}`] = metricInt;
        
        // Calculate overall day intensity based on dist_total_m
        const dayDistVal = updatedValues[`${dayIndex}_dist_total_m`] !== undefined 
          ? updatedValues[`${dayIndex}_dist_total_m`] 
          : getRecommendation(dayIndex, 'dist_total_m').p50;
        const dayClassified = clasificarGPS('dist_total_m', dayDistVal, selectedCategory);
        let dayInt: Intensity = 'Media';
        if (dayClassified === 'BAJO') dayInt = 'Baja';
        else if (dayClassified === 'ALTO') dayInt = 'Alta';
        updatedInts[dayIndex] = dayInt;

        const intensitiesKey = `gps_planning_mc_intensities_${selectedMicrocycle.id}`;
        localStorage.setItem(intensitiesKey, JSON.stringify(updatedInts));
        return updatedInts;
      });

      return updatedValues;
    });
  };

  // Helper to determine indicator color based on user input vs recommended range
  const getInputIndicator = (value: number | undefined, range: { p25: number; p50: number; p75: number }) => {
    if (value === undefined || value === null || value === 0) return { color: 'neutral', text: 'Sin programar', border: 'border-slate-100 text-slate-400 bg-slate-50' };
    
    if (value >= range.p25 && value <= range.p75) {
      return {
        color: 'green',
        text: 'En Rango Óptimo',
        border: 'border-emerald-200 text-emerald-700 bg-emerald-50'
      };
    } else if (value < range.p25) {
      return {
        color: 'amber',
        text: 'Carga Baja',
        border: 'border-amber-200 text-amber-700 bg-amber-50'
      };
    } else {
      return {
        color: 'red',
        text: 'Sobrecarga',
        border: 'border-red-200 text-red-700 bg-red-50'
      };
    }
  };

  // 4. Save handler
  const savePlanification = async () => {
    if (!selectedMicrocycle) return;
    setSaving(true);
    setMessage(null);

    // Save locally
    const valuesKey = `gps_planning_mc_values_${selectedMicrocycle.id}`;
    const intensitiesKey = `gps_planning_mc_intensities_${selectedMicrocycle.id}`;
    localStorage.setItem(valuesKey, JSON.stringify(plannedValues));
    localStorage.setItem(intensitiesKey, JSON.stringify(dayIntensities));

    // Despachar evento personalizado para notificar a otros componentes (como el Reporte de Sesión) que la planificación fue actualizada
    window.dispatchEvent(new CustomEvent('gps-planning-updated', { detail: { microcycleId: selectedMicrocycle.id } }));

    try {
      // Prepare payload to attempt Supabase write
      const payload = {
        microcycle_id: selectedMicrocycle.id,
        days_count: daysCount,
        planned_data: plannedValues,
        intensities_data: dayIntensities,
        n_micros: nMicros,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('gps_planificaciones')
        .upsert(payload, { onConflict: 'microcycle_id' });

      if (error) throw error;

      setMessage({
        type: 'success',
        text: 'Planificación guardada con éxito en la plataforma.'
      });
    } catch (err: any) {
      console.log("Supabase save bypassed (table pending database migration). Saved locally.", err.message);
      setMessage({
        type: 'warning',
        text: 'Planificación guardada localmente de manera segura para este microciclo.'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div id="pronostico-carga-root" className="space-y-8 text-slate-900">
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-[#0b1220] rounded-[24px] flex items-center justify-center text-white shadow-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-red-600 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
            <i className="fa-solid fa-chart-bar text-2xl relative z-10"></i>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <span className="bg-red-50 text-red-600 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest border border-red-100">PLANNER</span>
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Área Física</span>
            </div>
            <h2 className="text-3xl font-black text-slate-900 italic tracking-tighter uppercase leading-none mt-2">
              Pronóstico de <span className="text-red-600">Carga</span>
            </h2>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mt-1">
              Planifique de forma granular definiendo la intensidad para cada día de forma independiente
            </p>
          </div>
        </div>

        {/* Action Button */}
        {selectedMicrocycle && (
          <div className="flex items-center">
            <button
              onClick={savePlanification}
              disabled={saving}
              className="w-full lg:w-auto bg-red-600 hover:bg-red-700 active:scale-95 text-white px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-red-900/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 border border-red-500/20 h-[48px]"
            >
              {saving ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-floppy-disk"></i>
                  <span>Guardar planificación</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* FILTER PANEL */}
      <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category selector */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Categoría</label>
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={handleCategoryChange}
              className="w-full bg-slate-50 border border-slate-100 text-slate-900 rounded-xl px-4 py-3 text-sm outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-slate-100 focus:border-red-500 transition-all font-semibold uppercase"
            >
              <option value="" disabled>Seleccionar Categoría</option>
              {Object.values(Category).map(cat => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat].toUpperCase()}
                </option>
              ))}
            </select>
            <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs"></i>
          </div>
        </div>

        {/* Microcycle selector */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Microciclo</label>
          <div className="relative">
            <select
              value={selectedMicrocycle?.id || ''}
              onChange={handleMicrocycleChange}
              disabled={!selectedCategory || filteredMicrocycles.length === 0}
              className="w-full bg-slate-50 border border-slate-100 text-slate-900 rounded-xl px-4 py-3 text-sm outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-slate-100 focus:border-red-500 transition-all disabled:opacity-50 font-semibold uppercase"
            >
              {!selectedCategory ? (
                <option value="">Seleccione primero una categoría</option>
              ) : filteredMicrocycles.length === 0 ? (
                <option value="">No hay microciclos registrados</option>
              ) : (
                <>
                  <option value="" disabled>Seleccionar Microciclo</option>
                  {filteredMicrocycles.map(mc => (
                    <option key={mc.id} value={mc.id}>
                      MC #{mc.micro_number || mc.id} ({mc.type.toUpperCase()}): {new Date(mc.start_date + 'T12:00:00').toLocaleDateString('es-CL', {day: '2-digit', month: '2-digit'})} al {new Date(mc.end_date + 'T12:00:00').toLocaleDateString('es-CL', {day: '2-digit', month: '2-digit', year: 'numeric'})}
                    </option>
                  ))}
                </>
              )}
            </select>
            <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs"></i>
          </div>
        </div>
      </div>

      {/* CONFIDENCE & RECENT ALERTS */}
      <AnimatePresence mode="wait">
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-5 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center justify-between gap-4 border ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : message.type === 'warning'
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <i className={`fa-solid ${message.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'} text-lg`}></i>
              <span>{message.text}</span>
            </div>
            <button onClick={() => setMessage(null)} className="opacity-60 hover:opacity-100 font-bold p-1">
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DETAILED PLANNING GRID/TABULAR WORKSPACE */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <i className="fa-solid fa-circle-notch fa-spin text-5xl text-red-500"></i>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Sincronizando Base de Datos...</p>
        </div>
      ) : !selectedMicrocycle ? (
        <div className="bg-white border border-slate-100 shadow-sm rounded-[32px] p-12 text-center flex flex-col items-center justify-center space-y-6">
          <div className="w-20 h-20 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-center text-slate-400 shadow-inner">
            <i className="fa-solid fa-calendar-days text-3xl"></i>
          </div>
          <div className="max-w-md space-y-2">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Planificador de Carga por Microciclo</h3>
            <p className="text-slate-500 text-xs font-semibold leading-relaxed">
              Seleccione una categoría y un microciclo activo en la parte superior. El sistema determinará automáticamente la cantidad de días del microciclo y le sugerirá rangos óptimos basados en datos históricos reales de esa categoría.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* SECCIÓN DE GRÁFICO DE CONTROL Y DESCARGA DE REPORTE */}
          <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-100 pb-6">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">
                  Ondulación de la Carga Semanal
                </h3>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">
                  Gráfico del pronóstico de cargas del microciclo seleccionado en valores absolutos de todas las métricas
                </p>
              </div>

              {/* Botón PDF */}
              <div className="flex flex-wrap items-center gap-4">
                {/* Botón de Descarga de Reporte PDF */}
                <button
                  onClick={handleDownloadPDF}
                  className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-md shadow-red-900/10 hover:shadow-lg border border-red-500/10 h-[40px]"
                >
                  <i className="fa-solid fa-file-pdf text-white text-sm"></i>
                  <span>Descargar PDF</span>
                </button>
              </div>
            </div>

            {/* Contenedor del Gráfico de Columnas */}
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="fullLabel" 
                    tickFormatter={(val) => {
                      const parts = val.split(' ');
                      return parts[0] ? `${parts[0].slice(0, 3)} ${parts[1] || ''}`.toUpperCase() : val;
                    }}
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <YAxis 
                    tickFormatter={(val) => val.toLocaleString()}
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    domain={[0, 'auto']}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(15, 23, 42, 0.03)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-[#0b1220] text-white p-4 rounded-2xl border border-slate-800 text-xs shadow-2xl space-y-2.5 font-sans min-w-[260px]">
                            <p className="font-black uppercase tracking-widest text-red-500 border-b border-slate-800 pb-1.5">{data.fullLabel.toUpperCase()}</p>
                            <div className="space-y-2">
                              {METRICS.map(m => {
                                const val = data[m.id] || 0;
                                const pct = data[`${m.id}_pct`] || 0;
                                return (
                                  <div key={m.id} className="flex items-center justify-between gap-4">
                                    <span className="text-slate-400 font-bold">{m.label}:</span>
                                    <div className="text-right flex items-center gap-1.5">
                                      <span className="font-black text-white">{val.toLocaleString()} {m.unit}</span>
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-black ${pct >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                        {pct >= 0 ? '+' : ''}{pct}%
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="text-[9px] text-slate-500 border-t border-slate-800 pt-1.5 leading-relaxed">
                              * El % indica el ajuste de carga respecto al valor recomendado base (100%).
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="dist_total_m" name="Distancia Total" fill="#02428C" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="dist_ai_m_15_kmh" name="MAI >15 km/h" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="dist_mai_m_20_kmh" name="HSR >20 km/h" fill="#E2231A" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="dist_sprint_m_25_kmh" name="Sprint >25 km/h" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="acc_decc_ai_n" name="Acc / Dec" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Leyenda e Información rápida */}
            <div className="flex flex-wrap items-center justify-between gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400 border-t border-slate-100 pt-4">
              <div className="flex flex-wrap items-center gap-5">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-[#02428C] inline-block"></span>
                  <span className="text-slate-900 font-black">Distancia Total</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-[#F59E0B] inline-block"></span>
                  <span className="text-slate-900 font-black">{"MAI >15 km/h"}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-[#E2231A] inline-block"></span>
                  <span className="text-slate-900 font-black">{"HSR >20 km/h"}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-[#10B981] inline-block"></span>
                  <span className="text-slate-900 font-black">{"Sprint >25 km/h"}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-[#8B5CF6] inline-block"></span>
                  <span className="text-slate-900 font-black">Acc / Dec</span>
                </span>
              </div>
              <div className="text-slate-500">
                * Las barras representan los <span className="text-[#0b1220] font-black">valores absolutos programados</span> de todas las métricas de rendimiento.
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8">
            {/* Each day is a dedicated, stylish module containing its planning table */}
            {Array.from({ length: daysCount }).map((_, dIdx) => {
              const dayNum = dIdx + 1;
              const dayInfo = getDayDetails(dIdx);
              
              // Calculate Day load classification automatically based on programmed dist_total_m
              const dayDistVal = plannedValues[`${dIdx}_dist_total_m`] !== undefined 
                ? plannedValues[`${dIdx}_dist_total_m`] 
                : getRecommendation(dIdx, 'dist_total_m').p50;
              const dayClassified = clasificarGPS('dist_total_m', dayDistVal, selectedCategory);
              
              // Calculate Day total range adjustment (using dist_total_m percentage difference from P50 as a proxy)
              const distRec = getRecommendation(dIdx, 'dist_total_m');
              const distAdj = distRec.p50 > 0 ? Math.round(((dayDistVal - distRec.p50) / distRec.p50) * 100) : 0;

              return (
                <div
                  key={dIdx}
                  className="bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm relative"
                >
                  {/* Day title & summary strip */}
                  <div className="bg-[#0b1220] px-8 py-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center">
                        <span className="text-[9px] font-black text-slate-400 uppercase leading-none">DÍA</span>
                        <span className="text-lg font-black text-white leading-none mt-0.5">{dayNum}</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-white uppercase tracking-tight">{dayInfo.label.toUpperCase()}</h3>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Planificación individual de carga por sesión</p>
                      </div>
                    </div>

                    {/* Granular day configuration (Day intensity indicator & total planned distance percentage) */}
                    <div className="flex flex-wrap items-center gap-6">
                      {/* Day intensity indicator (non-clickable badge) */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Intensidad Objetivo</label>
                        <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border text-center min-w-[90px] h-[38px] flex items-center justify-center ${
                          dayClassified === 'BAJO'
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                            : dayClassified === 'MEDIO'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : dayClassified === 'ALTO'
                            ? 'bg-red-600 text-white shadow-md shadow-red-950/30 border-red-600 font-black'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {dayClassified === 'SIN_DATO' ? 'SIN DATO' : dayClassified}
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block">Ajuste Distancia</span>
                          <span className="text-sm font-black text-white">{distAdj > 0 ? `+${distAdj}` : distAdj}%</span>
                        </div>
                        {distAdj !== 0 && (
                          <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border whitespace-nowrap ${
                            distAdj > 0 ? 'border-emerald-500/20 text-emerald-400 bg-emerald-500/10' : 'border-amber-500/20 text-amber-400 bg-amber-500/10'
                          }`}>
                            {distAdj > 0 ? 'Aumento Carga' : 'Reducción Carga'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Metrics planning table for this day */}
                  <div className="overflow-x-auto bg-white">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50">
                          <th className="px-8 py-4 w-1/4">Métrica de Rendimiento</th>
                          <th className="px-8 py-4 w-[66%]">Rango Recomendado y Ajuste (P25 - P75)</th>
                          <th className="px-8 py-4 text-center w-24">Soporte</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {METRICS.map(metric => {
                          const rec = getRecommendation(dIdx, metric.id);
                          const currentVal = plannedValues[`${dIdx}_${metric.id}`] !== undefined 
                            ? plannedValues[`${dIdx}_${metric.id}`] 
                            : rec.p50;
                          
                          // Determine dynamic intensity classification based on the selected value
                          const classified = clasificarGPS(metric.id, currentVal, selectedCategory);
                          let currentIntensity: Intensity = 'Media';
                          if (classified === 'BAJO') currentIntensity = 'Baja';
                          else if (classified === 'ALTO') currentIntensity = 'Alta';

                          // Range widths for the dynamic view
                          const range = getRangeForMetric(metric.id, currentVal, 1, currentIntensity);
                          const adjP25 = range.min;
                          const adjP75 = range.max;

                          // Percentage adjustment compared to base recommendation P50
                          const pct = rec.p50 > 0 ? Math.round(((currentVal - rec.p50) / rec.p50) * 100) : 0;

                          // Retrieve category thresholds for showing in helper text
                          let catKey = 'GENERAL';
                          if (selectedCategory) {
                            const normCat = selectedCategory.toLowerCase().replace(/[\s-_]/g, '');
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
                          const currentBounds = BANDAS_GPS[catKey]?.[metric.id] || BANDAS_GPS['GENERAL'][metric.id];

                          const maxVal = METRIC_MAX_VALUES[metric.id] || 1000;
                          const stepVal = METRIC_STEPS[metric.id] || 1;
                          const threeVals = METRIC_THREE_VALS[metric.id] || [0, 0, 0];

                          return (
                            <tr key={metric.id} className="hover:bg-slate-50/50 transition-colors">
                              {/* Metric Name */}
                              <td className="px-8 py-5">
                                <div className="font-black text-slate-900 text-sm uppercase tracking-tight">{metric.label}</div>
                                <div className="text-slate-400 text-[9px] uppercase font-black tracking-widest mt-0.5">{metric.unit}</div>
                                
                                {/* Granular Target Intensity Auto-Indicator */}
                                <div className="mt-3 flex flex-col gap-1 w-[120px]">
                                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Carga Calculada</span>
                                  <span className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border text-center ${
                                    classified === 'BAJO'
                                      ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                      : classified === 'MEDIO'
                                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                      : classified === 'ALTO'
                                      ? 'bg-red-500/10 text-red-500 border-red-500/20 font-black'
                                      : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                                  }`}>
                                    {classified}
                                  </span>
                                </div>
                              </td>

                              {/* Recommended Range + Slider */}
                              <td className="px-8 py-5">
                                <div className="space-y-3">
                                  {/* Range Numbers */}
                                  <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                      <div className="flex items-baseline gap-1.5">
                                        <span className="text-xs text-slate-400 font-black uppercase tracking-wider">Rango sugerido:</span>
                                        <span className="text-xl font-black text-[#0b1220]">{adjP25.toLocaleString()} a {adjP75.toLocaleString()}</span>
                                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider ml-1">{metric.unit}</span>
                                      </div>
                                      
                                      {/* Ventanas (B/M/A) compact underneath */}
                                      <div className="flex items-center gap-4 mt-1.5 text-[10px] font-bold text-slate-400">
                                        <span className="uppercase text-[9px] font-black tracking-wider">Ventanas de Referencia:</span>
                                        <div className="flex items-center gap-3">
                                          <span className="text-amber-600 font-black">Bajo: <strong className="font-mono text-xs">{threeVals[0].toLocaleString()} {metric.unit}</strong></span>
                                          <span className="text-emerald-600 font-black">Medio: <strong className="font-mono text-xs">{threeVals[1].toLocaleString()} {metric.unit}</strong></span>
                                          <span className="text-red-600 font-black">Alto: <strong className="font-mono text-xs">{threeVals[2].toLocaleString()} {metric.unit}</strong></span>
                                        </div>
                                      </div>
                                    </div>
                                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider ${
                                      pct > 0 
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                        : pct < 0 
                                        ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                                        : 'bg-slate-50 text-slate-600 border border-slate-100'
                                    }`}>
                                      {pct === 0 ? 'Sin Ajustar' : `${pct > 0 ? '+' : ''}${pct}%`}
                                    </span>
                                  </div>

                                  {/* Slider Component */}
                                  <div className="flex items-center gap-4">
                                    <span className="text-[10px] font-bold text-slate-400 w-12">0 {metric.unit}</span>
                                    <input
                                      type="range"
                                      min="0"
                                      max={maxVal}
                                      step={stepVal}
                                      value={currentVal}
                                      onChange={(e) => handlePlanChange(dIdx, metric.id, e.target.value)}
                                      className="flex-1 accent-red-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <span className="text-[10px] font-bold text-slate-400 w-20 text-right">{maxVal.toLocaleString()} {metric.unit}</span>
                                  </div>

                                  {/* Additional helper metadata */}
                                  {(() => {
                                    const baseRange = getRangeForMetric(metric.id, rec.p50, 1, currentIntensity);
                                    return (
                                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest pt-1 border-t border-slate-50">
                                        <span>Base original: <strong className="text-slate-500 font-black">{baseRange.min.toLocaleString()} - {baseRange.max.toLocaleString()} {metric.unit}</strong></span>
                                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                        <span>Mediana Base (P50): <strong className="text-slate-500 font-black">{baseRange.p50.toLocaleString()} {metric.unit}</strong></span>
                                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                        <span>Umbrales ({catKey}): <strong className="text-slate-500 font-black">Bajo &lt;= {currentBounds.p25.toLocaleString()} | Medio &lt;= {currentBounds.p75.toLocaleString()} | Alto &gt; {currentBounds.p75.toLocaleString()}</strong></span>
                                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                        <span>Origen: <strong className="text-red-600 font-black">{rec.source.toUpperCase()}</strong></span>
                                      </div>
                                    );
                                  })()}
                                </div>
                              </td>

                              {/* Backed microcycles count (n_micros) display */}
                              <td className="px-8 py-5 text-center">
                                <div className="inline-flex flex-col items-center bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 min-w-[56px]">
                                  <span className="text-[14px] font-black text-slate-900 leading-none">{nMicros}</span>
                                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">micros</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FIXED LEGAL/CONFIDENCE NOTE FOOTER */}
      <div id="pronostico-footer-note" className="bg-white p-6 rounded-2xl border border-slate-100 flex items-start gap-3.5 shadow-sm">
        <i className="fa-solid fa-circle-info text-slate-400 text-lg mt-0.5"></i>
        <p className="text-slate-500 text-xs font-semibold leading-relaxed">
          Nota fija: Los rangos describen cómo se distribuyó la carga históricamente, no la 
          carga óptima. Son una referencia de planificación, no una prescripción.
        </p>
      </div>
    </div>
  );
}
