import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Category, CATEGORY_ID_MAP } from '../types';

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
    label: 'HSR ≥15 km/h',
    unit: 'm',
    fallback: {
      Baja: [100, 200, 300],
      Media: [300, 500, 700],
      Alta: [700, 1000, 1400]
    }
  },
  {
    id: 'dist_mai_m_20_kmh',
    label: 'MAI ≥20 km/h',
    unit: 'm',
    fallback: {
      Baja: [20, 50, 80],
      Media: [80, 120, 180],
      Alta: [180, 250, 350]
    }
  },
  {
    id: 'dist_sprint_m_25_kmh',
    label: 'Sprint ≥25 km/h',
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

type Intensity = 'Baja' | 'Media' | 'Alta';

export default function PronosticoCargas({ clubs }: { clubs: any[] }) {
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

        // Try to find if there is an active microcycle today
        const activeTodayMc = microcycles.find(m => todayStr >= m.start_date && todayStr <= m.end_date);
        if (activeTodayMc) {
          const foundCat = Object.entries(CATEGORY_ID_MAP).find(([_, val]) => val === activeTodayMc.category_id)?.[0] as Category | undefined;
          if (foundCat) {
            initialCat = foundCat;
            initialMc = activeTodayMc;
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
  }, [microcycles]);

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

  // 3. Load / Persist planned values & daily intensities from localStorage on config changes
  useEffect(() => {
    if (!selectedMicrocycle) {
      setPlannedValues({});
      setDayIntensities({});
      return;
    }

    // Load values
    const valuesKey = `gps_planning_mc_values_${selectedMicrocycle.id}`;
    const storedValues = localStorage.getItem(valuesKey);
    if (storedValues) {
      try {
        setPlannedValues(JSON.parse(storedValues));
      } catch (e) {
        setPlannedValues({});
      }
    } else {
      setPlannedValues({});
    }

    // Load intensities
    const intensitiesKey = `gps_planning_mc_intensities_${selectedMicrocycle.id}`;
    const storedIntensities = localStorage.getItem(intensitiesKey);
    if (storedIntensities) {
      try {
        setDayIntensities(JSON.parse(storedIntensities));
      } catch (e) {
        setDayIntensities({});
      }
    } else {
      setDayIntensities({});
    }
  }, [selectedMicrocycle]);

  // Handle individual day's intensity change
  const handleDayIntensityChange = (dayIdx: number, intensity: Intensity) => {
    if (!selectedMicrocycle) return;
    setDayIntensities(prev => {
      const updated = { ...prev, [dayIdx]: intensity };
      const intensitiesKey = `gps_planning_mc_intensities_${selectedMicrocycle.id}`;
      localStorage.setItem(intensitiesKey, JSON.stringify(updated));
      return updated;
    });
  };

  // Handle plan inputs safely
  const handlePlanChange = (dayIndex: number, metricId: string, value: string) => {
    if (!selectedMicrocycle) return;
    const num = Math.max(0, parseFloat(value) || 0);
    const key = `${dayIndex}_${metricId}`;
    setPlannedValues(prev => {
      const updated = { ...prev, [key]: num };
      const valuesKey = `gps_planning_mc_values_${selectedMicrocycle.id}`;
      localStorage.setItem(valuesKey, JSON.stringify(updated));
      return updated;
    });
  };

  // Helper to retrieve recommended range for a specific day and metric
  const getRecommendation = (dayIdx: number, metricId: string) => {
    const intensity = dayIntensities[dayIdx] || 'Media';

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
          <div className="grid grid-cols-1 gap-8">
            {/* Each day is a dedicated, stylish module containing its planning table */}
            {Array.from({ length: daysCount }).map((_, dIdx) => {
              const dayNum = dIdx + 1;
              const dayInfo = getDayDetails(dIdx);
              const dayIntensity = dayIntensities[dIdx] || 'Media';
              
              // Calculate Day total planned distance to show a summary status indicator
              const dayDistPlanned = plannedValues[`${dIdx}_dist_total_m`] || 0;
              const distRecommendation = getRecommendation(dIdx, 'dist_total_m');
              const distStatus = getInputIndicator(dayDistPlanned, distRecommendation);

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

                    {/* Granular day configuration (Day intensity selector & total planned distance) */}
                    <div className="flex flex-wrap items-center gap-6">
                      {/* Day intensity selector */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Intensidad Objetivo</label>
                        <div className="flex bg-slate-950/60 p-1 rounded-xl border border-white/5 gap-1 h-[40px] items-center">
                          {(['Baja', 'Media', 'Alta'] as const).map(tier => (
                            <button
                              key={tier}
                              type="button"
                              onClick={() => handleDayIntensityChange(dIdx, tier)}
                              className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-200 ${
                                dayIntensity === tier
                                  ? tier === 'Baja'
                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                    : tier === 'Media'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-red-600 text-white shadow-md shadow-red-950/30'
                                  : 'text-slate-400 hover:bg-[#0b1220]/50 hover:text-white'
                              }`}
                            >
                              {tier}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block">Distancia Total Planificada</span>
                          <span className="text-sm font-black text-white">{dayDistPlanned.toLocaleString()} m</span>
                        </div>
                        {dayDistPlanned > 0 && (
                          <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border whitespace-nowrap ${distStatus.border}`}>
                            {distStatus.text}
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
                          <th className="px-8 py-4 w-1/3">Rango Recomendado (P25 - P75)</th>
                          <th className="px-8 py-4 w-1/3">Carga Planificada</th>
                          <th className="px-8 py-4 text-center w-12">Soporte</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {METRICS.map(metric => {
                          const rec = getRecommendation(dIdx, metric.id);
                          const userVal = plannedValues[`${dIdx}_${metric.id}`] || 0;
                          const status = getInputIndicator(userVal, rec);

                          return (
                            <tr key={metric.id} className="hover:bg-slate-50/50 transition-colors">
                              {/* Metric Name */}
                              <td className="px-8 py-5">
                                <div className="font-black text-slate-900 text-sm uppercase tracking-tight">{metric.label}</div>
                                <div className="text-slate-400 text-[9px] uppercase font-black tracking-widest mt-0.5">{metric.unit}</div>
                              </td>

                              {/* Recommended Range (P25–P75 and median) */}
                              <td className="px-8 py-5">
                                <div>
                                  <div className="flex items-baseline gap-1.5">
                                    <span className="text-lg font-black text-slate-800">{rec.p25.toLocaleString()}</span>
                                    <span className="text-xs text-slate-400 font-bold">a</span>
                                    <span className="text-lg font-black text-slate-800">{rec.p75.toLocaleString()}</span>
                                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider ml-1">{metric.unit}</span>
                                  </div>
                                  <div className="flex items-center gap-3 mt-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                    <span>Mediana (P50): <strong className="text-slate-700 font-black">{rec.p50.toLocaleString()} {metric.unit}</strong></span>
                                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                    <span>Origen: <strong className="text-red-600 font-black">{rec.source.toUpperCase()}</strong></span>
                                  </div>
                                </div>
                              </td>

                              {/* Plan Input editable field */}
                              <td className="px-8 py-5">
                                <div className="flex items-center gap-4">
                                  <div className="relative flex-1 max-w-[200px]">
                                    <input
                                      type="number"
                                      min="0"
                                      placeholder="0"
                                      value={userVal || ''}
                                      onChange={(e) => handlePlanChange(dIdx, metric.id, e.target.value)}
                                      className="w-full bg-slate-50 border border-slate-100 hover:border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 rounded-xl px-4 py-3 text-sm font-black text-slate-900 outline-none transition-all text-right pr-12"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 uppercase select-none">
                                      {metric.unit}
                                    </span>
                                  </div>

                                  <AnimatePresence mode="wait">
                                    {userVal > 0 && (
                                      <motion.span
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border whitespace-nowrap min-w-[110px] text-center ${status.border}`}
                                      >
                                        {status.text}
                                      </motion.span>
                                    )}
                                  </AnimatePresence>
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
