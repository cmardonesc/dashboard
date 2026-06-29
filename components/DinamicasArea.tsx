import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';

interface DrillGpsRecord {
  id: number;
  drill_name: string;
  team_name: string;
  position_name: string;
  session_date: string;
  duration_min: number;
  total_distance_m: number;
  meters_per_min: number;
  dist_aint_15kmh: number;
  dist_maint_20kmh: number;
  dist_sprint_25kmh: number;
  num_sprints: number;
  max_vel_kmh: number;
  acc_decc_ai: number;
  created_at?: string;
}

type SortKey =
  | 'session_date'
  | 'drill_name'
  | 'team_name'
  | 'position_name'
  | 'duration_min'
  | 'total_distance_m'
  | 'meters_per_min'
  | 'dist_aint_15kmh'
  | 'dist_maint_20kmh'
  | 'dist_sprint_25kmh'
  | 'num_sprints'
  | 'max_vel_kmh'
  | 'acc_decc_ai';

// Función para calcular los estadísticos de un gráfico de cajas (Box Plot)
function calculateBoxPlotStats(values: number[]) {
  if (values.length === 0) {
    return { min: 0, q1: 0, median: 0, q3: 0, max: 0, avg: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  
  const getPercentile = (p: number) => {
    const pos = (sorted.length - 1) * p;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sorted[base + 1] !== undefined) {
      return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    } else {
      return sorted[base];
    }
  };

  const q1 = getPercentile(0.25);
  const median = getPercentile(0.5);
  const q3 = getPercentile(0.75);
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;

  return {
    min: Number(min.toFixed(1)),
    q1: Number(q1.toFixed(1)),
    median: Number(median.toFixed(1)),
    q3: Number(q3.toFixed(1)),
    max: Number(max.toFixed(1)),
    avg: Number(avg.toFixed(1))
  };
}

// Generador de datos fallback locales de dinámicas para robustez absoluta
function generateLocalFallbackData(): DrillGpsRecord[] {
  const sampleDrills = [
    { name: 'Rondo Transición 5v2', duration: 12, dist: 780, mpm: 65.0, a15: 140, a20: 35, a25: 5, sprints: 2, vmax: 26.5, acc: 22 },
    { name: 'Fútbol Reducido 4v4 +3C', duration: 15, dist: 1250, mpm: 83.3, a15: 280, a20: 85, a25: 12, sprints: 4, vmax: 28.1, acc: 38 },
    { name: 'Trabajo Táctico 11v0', duration: 20, dist: 1100, mpm: 55.0, a15: 180, a20: 40, a25: 2, sprints: 1, vmax: 24.2, acc: 15 },
    { name: 'Presión tras Pérdida 6v6', duration: 18, dist: 1480, mpm: 82.2, a15: 310, a20: 95, a25: 18, sprints: 5, vmax: 29.4, acc: 45 },
    { name: 'Fútbol Formal 11v11', duration: 25, dist: 2250, mpm: 90.0, a15: 550, a20: 160, a25: 35, sprints: 8, vmax: 31.8, acc: 52 },
    { name: 'Juegos de Posición 8v8', duration: 15, dist: 1150, mpm: 76.7, a15: 210, a20: 60, a25: 8, sprints: 3, vmax: 27.6, acc: 32 },
    { name: 'Ataque vs Defensa 6v4', duration: 14, dist: 950, mpm: 67.8, a15: 190, a20: 52, a25: 10, sprints: 3, vmax: 28.5, acc: 28 }
  ];

  const teams = ['Selección Sub-15', 'Selección Sub-16', 'Selección Sub-17', 'Selección Sub-20'];
  const positions = ['DEFENSA', 'MEDIO', 'DELANTERO'];
  const dates = ['2026-06-25', '2026-06-24', '2026-06-22', '2026-06-20'];

  const fallbackList: DrillGpsRecord[] = [];
  let idCounter = 1;

  dates.forEach((date) => {
    teams.forEach((team) => {
      sampleDrills.forEach((drill) => {
        positions.forEach((pos) => {
          const randSeed = (idCounter * 17) % 100;
          const factor = 0.85 + (randSeed / 100) * 0.3; // entre 0.85 y 1.15
          
          let posFactorDist = 1.0;
          let posFactorSprints = 1.0;
          let posFactorVmax = 1.0;
          let posFactorAcc = 1.0;

          if (pos === 'DEFENSA') {
            posFactorDist = 0.9;
            posFactorSprints = 0.8;
            posFactorVmax = 0.95;
            posFactorAcc = 1.1;
          } else if (pos === 'MEDIO') {
            posFactorDist = 1.15;
            posFactorSprints = 0.9;
            posFactorVmax = 0.9;
            posFactorAcc = 1.15;
          } else if (pos === 'DELANTERO') {
            posFactorDist = 0.95;
            posFactorSprints = 1.3;
            posFactorVmax = 1.12;
            posFactorAcc = 0.95;
          }

          const finalDuration = drill.duration;
          const finalDist = Math.round(drill.dist * factor * posFactorDist);
          const finalMpm = Number((finalDist / finalDuration).toFixed(1));
          const finalA15 = Math.round(drill.a15 * factor * posFactorDist);
          const finalA20 = Math.round(drill.a20 * factor * posFactorDist);
          const finalA25 = Math.round(drill.a25 * factor * posFactorSprints);
          const finalSprints = Math.round(drill.sprints * factor * posFactorSprints);
          const finalVmax = Number((drill.vmax * (0.95 + (randSeed / 200)) * posFactorVmax).toFixed(1));
          const finalAcc = Math.round(drill.acc * factor * posFactorAcc);

          fallbackList.push({
            id: idCounter++,
            drill_name: drill.name,
            team_name: team,
            position_name: pos,
            session_date: date,
            duration_min: finalDuration,
            total_distance_m: finalDist,
            meters_per_min: finalMpm,
            dist_aint_15kmh: finalA15,
            dist_maint_20kmh: finalA20,
            dist_sprint_25kmh: finalA25,
            num_sprints: finalSprints,
            max_vel_kmh: finalVmax,
            acc_decc_ai: finalAcc
          });
        });
      });
    });
  });

  return fallbackList;
}

// Componente interactivo y responsivo de Gráfico de Cajas (Box Plot) con SVG
interface BoxPlotProps {
  label: string;
  unit: string;
  values: number[];
  color?: string;
}

function BoxPlot({ label, unit, values, color = '#CF1B2B' }: BoxPlotProps) {
  const stats = useMemo(() => calculateBoxPlotStats(values), [values]);
  
  if (values.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-100 rounded-3xl p-8 text-center text-slate-400 text-xs italic">
        Sin datos suficientes para graficar {label}
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-all space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.15em] mb-1">{label}</h4>
          <p className="text-2xl font-black italic text-slate-900 leading-none">
            {stats.median} <span className="text-xs not-italic font-bold text-slate-400">{unit} <span className="text-[9px] uppercase tracking-wider">(Mediana)</span></span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider mb-0.5">Promedio</p>
          <span className="text-xs font-black text-[#0b1220] italic">{stats.avg} {unit}</span>
        </div>
      </div>

      <div className="relative">
        {/* Leyenda con valores exactos de los percentiles */}
        <div className="grid grid-cols-5 gap-1.5 text-center mt-2">
          <div className="bg-slate-50 p-2 rounded-2xl">
            <p className="text-[7px] font-black uppercase text-slate-400">Mínimo</p>
            <p className="text-xs font-black italic text-slate-800">{stats.min}</p>
          </div>
          <div className="bg-slate-50 p-2 rounded-2xl">
            <p className="text-[7px] font-black uppercase text-slate-400">P25 (Q1)</p>
            <p className="text-xs font-black italic text-slate-800">{stats.q1}</p>
          </div>
          <div className="bg-red-50/50 p-2 rounded-2xl border border-red-100/30">
            <p className="text-[7px] font-black uppercase text-red-500">Mediana</p>
            <p className="text-xs font-black italic text-red-600">{stats.median}</p>
          </div>
          <div className="bg-slate-50 p-2 rounded-2xl">
            <p className="text-[7px] font-black uppercase text-slate-400">P75 (Q3)</p>
            <p className="text-xs font-black italic text-slate-800">{stats.q3}</p>
          </div>
          <div className="bg-slate-50 p-2 rounded-2xl">
            <p className="text-[7px] font-black uppercase text-slate-400">Máximo</p>
            <p className="text-xs font-black italic text-slate-800">{stats.max}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DinamicasArea() {
  const [data, setData] = useState<DrillGpsRecord[]>([]);
  const [tareas, setTareas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Filtro ÚNICO de Dinámica y Pestañas de Posición
  const [selectedDrill, setSelectedDrill] = useState<string>('');
  const [selectedPosition, setSelectedPosition] = useState<string>('TODAS');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Ordenamiento de tabla
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>({
    key: 'meters_per_min',
    direction: 'desc'
  });

  // Cargar datos reales de Supabase con compatibilidad absoluta
  const fetchDrillData = async () => {
    setLoading(true);
    setMsg(null);
    try {
      // 1. Obtener jugadores para mapear categorías y posiciones
      const { data: playersData } = await supabase
        .from('players')
        .select('player_id, posicion, categoria');
      
      const playersMap = new Map<number, { posicion: string; categoria: string }>();
      if (playersData) {
        playersData.forEach(p => {
          playersMap.set(Number(p.player_id), {
            posicion: p.posicion || 'S/D',
            categoria: p.categoria || 'Sin equipo'
          });
        });
      }

      // Fetch the tareas table for video links
      try {
        const { data: tData } = await supabase
          .from('tareas')
          .select('id, nombre, dinamica, link_video, link_foto');
        if (tData) {
          setTareas(tData);
        }
      } catch (err) {
        console.error("Error fetching tareas:", err);
      }

      // 2. Obtener datos directamente de la tabla drill_gps_data con paginación de rangos para superar el límite de 1000 registros
      let drillsRecords: any[] = [];
      let fromRange = 0;
      let toRange = 999;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('drill_gps_data')
          .select('*')
          .range(fromRange, toRange);
        
        if (error) {
          throw error;
        }

        if (data && data.length > 0) {
          drillsRecords = drillsRecords.concat(data);
          if (data.length < 1000) {
            hasMore = false;
          } else {
            fromRange += 1000;
            toRange += 1000;
          }
        } else {
          hasMore = false;
        }
      }

      const allMergedRecords: DrillGpsRecord[] = [];
      let idCounter = 1;

      // Procesar registros obtenidos de drill_gps_data
      if (drillsRecords && drillsRecords.length > 0) {
        drillsRecords.forEach(r => {
          const playerInfo = r.player_id ? playersMap.get(Number(r.player_id)) : null;
          
          // Compatibilidad total de nombres de columnas como se muestra en la definición de la tabla drill_gps_data
          const drillName = r.drill_name || r.drills_name || r.tarea || r.drill || 'Sin nombre';
          const teamName = r.team_name || playerInfo?.categoria || r.categoria || r.grupo || 'Sin equipo';
          const positionName = r.position_name || playerInfo?.posicion || r.posicion || 'S/D';

          allMergedRecords.push({
            id: r.id ? Number(r.id) : idCounter++,
            drill_name: String(drillName),
            team_name: String(teamName),
            position_name: String(positionName),
            session_date: r.session_date || r.fecha || '',
            duration_min: Number(r.duration_min || r.minutos || r.duracion || 0),
            total_distance_m: Math.round(Number(r.total_distance_m || r.dist_total_m || r.distancia || 0)),
            meters_per_min: Number((r.meters_per_min || r.m_por_min || 0).toFixed(1)),
            dist_aint_15kmh: Math.round(Number(r.dist_aint_15kmh || r.dist_ai_m_15_kmh || 0)),
            dist_maint_20kmh: Math.round(Number(r.dist_maint_20kmh || r.dist_mai_m_20_kmh || 0)),
            dist_sprint_25kmh: Math.round(Number(r.dist_sprint_25kmh || r.dist_sprint_m_25_kmh || 0)),
            num_sprints: Math.round(Number(r.num_sprints || r.sprints_n || r.sprints || 0)),
            max_vel_kmh: Number((r.max_vel_kmh || r.vel_max_kmh || r.velocidad_maxima || 0).toFixed(1)),
            acc_decc_ai: Math.round(Number(r.acc_decc_ai || r.acc_decc_ai_n || 0)),
            created_at: r.created_at
          });
        });
      }

      if (allMergedRecords.length > 0) {
        // Ordenar por fecha descendente
        allMergedRecords.sort((a, b) => b.session_date.localeCompare(a.session_date));
        setData(allMergedRecords);

        // Seleccionar automáticamente la primera dinámica si está vacía o no existe
        if (selectedDrill === '' || !allMergedRecords.some(m => m.drill_name === selectedDrill)) {
          const firstDrill = allMergedRecords[0].drill_name;
          setSelectedDrill(firstDrill);
        }
      } else {
        // Si no hay datos, cargamos los datos fallback locales de inmediato
        const fallback = generateLocalFallbackData();
        setData(fallback);
        if (fallback.length > 0 && (selectedDrill === '' || !fallback.some(f => f.drill_name === selectedDrill))) {
          setSelectedDrill(fallback[0].drill_name);
        }
        setMsg({
          text: "La tabla 'drill_gps_data' está vacía. Mostrando datos de Dinámicas GPS de muestra.",
          type: 'success'
        });
      }
    } catch (err: any) {
      console.error("Error al cargar datos de drill_gps_data, cargando fallback:", err);
      const fallback = generateLocalFallbackData();
      setData(fallback);
      if (fallback.length > 0 && (selectedDrill === '' || !fallback.some(f => f.drill_name === selectedDrill))) {
        setSelectedDrill(fallback[0].drill_name);
      }
      setMsg({
        text: "Modo offline: Visualizando datos locales de Dinámicas GPS.",
        type: 'success'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrillData();
  }, []);

  // Lista de dinámicas únicas para el selector de filtro
  const uniqueDrills = useMemo(() => {
    const drills = data.map(r => r.drill_name).filter(Boolean);
    return Array.from(new Set(drills)).sort((a, b) => a.localeCompare(b));
  }, [data]);

  // Lista de posiciones únicas para las pestañas de filtro
  const uniquePositions = useMemo(() => {
    const positions = data.map(r => r.position_name).filter(Boolean);
    return Array.from(new Set(positions)).sort((a, b) => a.localeCompare(b));
  }, [data]);

  // Seeder de datos demo si la tabla está vacía
  const seedDemoData = async () => {
    setSeeding(true);
    setMsg(null);
    try {
      const sampleDrills = [
        { name: 'Rondo Transición 5v2', duration: 12, dist: 780, mpm: 65.0, a15: 140, a20: 35, a25: 5, sprints: 2, vmax: 26.5, acc: 22 },
        { name: 'Fútbol Reducido 4v4 +3C', duration: 15, dist: 1250, mpm: 83.3, a15: 280, a20: 85, a25: 12, sprints: 4, vmax: 28.1, acc: 38 },
        { name: 'Trabajo Táctico 11v0', duration: 20, dist: 1100, mpm: 55.0, a15: 180, a20: 40, a25: 2, sprints: 1, vmax: 24.2, acc: 15 },
        { name: 'Presión tras Pérdida 6v6', duration: 18, dist: 1480, mpm: 82.2, a15: 310, a20: 95, a25: 18, sprints: 5, vmax: 29.4, acc: 45 },
        { name: 'Fútbol Formal 11v11', duration: 25, dist: 2250, mpm: 90.0, a15: 550, a20: 160, a25: 35, sprints: 8, vmax: 31.8, acc: 52 },
        { name: 'Juegos de Posición 8v8', duration: 15, dist: 1150, mpm: 76.7, a15: 210, a20: 60, a25: 8, sprints: 3, vmax: 27.6, acc: 32 },
        { name: 'Ataque vs Defensa 6v4', duration: 14, dist: 950, mpm: 67.8, a15: 190, a20: 52, a25: 10, sprints: 3, vmax: 28.5, acc: 28 }
      ];

      const teams = ['Selección Sub-15', 'Selección Sub-16', 'Selección Sub-17', 'Selección Sub-20'];
      const positions = ['DEFENSA', 'MEDIO', 'DELANTERO'];
      const dates = ['2026-06-25', '2026-06-24', '2026-06-22', '2026-06-20'];

      const batchToInsert: any[] = [];

      dates.forEach((date) => {
        teams.forEach((team) => {
          sampleDrills.forEach((drill) => {
            positions.forEach((pos) => {
              const factor = 0.85 + Math.random() * 0.3; // +/- 15%
              
              let posFactorDist = 1.0;
              let posFactorSprints = 1.0;
              let posFactorVmax = 1.0;
              let posFactorAcc = 1.0;

              if (pos === 'DEFENSA') {
                posFactorDist = 0.9;
                posFactorSprints = 0.8;
                posFactorVmax = 0.95;
                posFactorAcc = 1.1;
              } else if (pos === 'MEDIO') {
                posFactorDist = 1.15;
                posFactorSprints = 0.9;
                posFactorVmax = 0.9;
                posFactorAcc = 1.15;
              } else if (pos === 'DELANTERO') {
                posFactorDist = 0.95;
                posFactorSprints = 1.3;
                posFactorVmax = 1.12;
                posFactorAcc = 0.95;
              }

              const finalDuration = drill.duration;
              const finalDist = Math.round(drill.dist * factor * posFactorDist);
              const finalMpm = Number((finalDist / finalDuration).toFixed(1));
              const finalA15 = Math.round(drill.a15 * factor * posFactorDist);
              const finalA20 = Math.round(drill.a20 * factor * posFactorDist);
              const finalA25 = Math.round(drill.a25 * factor * posFactorSprints);
              const finalSprints = Math.round(drill.sprints * factor * posFactorSprints);
              const finalVmax = Number((drill.vmax * (0.95 + Math.random() * 0.1) * posFactorVmax).toFixed(1));
              const finalAcc = Math.round(drill.acc * factor * posFactorAcc);

              batchToInsert.push({
                drill_name: drill.name,
                team_name: team,
                position_name: pos,
                session_date: date,
                duration_min: finalDuration,
                total_distance_m: finalDist,
                meters_per_min: finalMpm,
                dist_aint_15kmh: finalA15,
                dist_maint_20kmh: finalA20,
                dist_sprint_25kmh: finalA25,
                num_sprints: finalSprints,
                max_vel_kmh: finalVmax,
                acc_decc_ai: finalAcc
              });
            });
          });
        });
      });

      try {
        const { error } = await supabase
          .from('drill_gps_data')
          .insert(batchToInsert);
        if (error) throw error;
      } catch (err: any) {
        throw err;
      }

      setMsg({
        text: `¡Se insertaron exitosamente ${batchToInsert.length} registros de dinámicas en la base de datos!`,
        type: 'success'
      });
      fetchDrillData();
    } catch (err: any) {
      console.error("Error al sembrar datos demo:", err);
      setMsg({
        text: `Error al sembrar datos: ${err.message}.`,
        type: 'error'
      });
    } finally {
      setSeeding(false);
    }
  };

  // Filtrado de datos por el selector único de Dinámica y la pestaña de Posición
  const filteredData = useMemo(() => {
    return data.filter(record => {
      if (selectedDrill !== 'TODAS' && record.drill_name !== selectedDrill) return false;
      if (selectedPosition !== 'TODAS' && record.position_name !== selectedPosition) return false;
      
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        return (
          record.drill_name.toLowerCase().includes(query) ||
          record.team_name.toLowerCase().includes(query) ||
          record.position_name.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [data, selectedDrill, selectedPosition, searchTerm]);

  // Arreglos numéricos para alimentar el gráfico de cajas de la dinámica seleccionada
  const boxPlotData = useMemo(() => {
    return {
      volume: filteredData.map(r => r.total_distance_m),
      intensity: filteredData.map(r => r.meters_per_min),
      maxVel: filteredData.map(r => r.max_vel_kmh),
      sprints: filteredData.map(r => r.num_sprints),
      accel: filteredData.map(r => r.acc_decc_ai),
      dist15: filteredData.map(r => r.dist_aint_15kmh),
      dist20: filteredData.map(r => r.dist_maint_20kmh),
      duration: filteredData.map(r => r.duration_min),
      distSprintM: filteredData.map(r => r.dist_sprint_25kmh)
    };
  }, [filteredData]);

  // Encontrar la tarea correspondiente y su link de video
  const matchedTarea = useMemo(() => {
    if (!selectedDrill || selectedDrill === 'TODAS' || tareas.length === 0) return null;
    
    const cleanString = (str: string) => {
      if (!str) return '';
      return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove accents
        .replace(/\bdinamica\b/g, '')
        .replace(/\bvs\b/g, 'v')
        .replace(/\b1c\b/g, 'c')
        .replace(/\bcomodin\b/g, 'c')
        .replace(/[+_\s()-]/g, '')
        .trim();
    };

    const cleanGps = cleanString(selectedDrill);
    
    // 1. Intento de coincidencia exacta limpia
    for (const t of tareas) {
      const cleanDb = cleanString(t.nombre);
      if (cleanGps === cleanDb && cleanGps !== '') {
        return t;
      }
    }

    // 2. Intento de coincidencia de subcadena
    for (const t of tareas) {
      const cleanDb = cleanString(t.nombre);
      if (cleanGps.includes(cleanDb) || cleanDb.includes(cleanGps)) {
        if (cleanGps.length > 2 && cleanDb.length > 2) {
          return t;
        }
      }
    }

    // 3. Firma difusa (comparando números y banderas como 'c' y 'a')
    const getFuzzySignature = (s: string) => {
      let clean = s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      clean = clean.replace(/\b1c\b/g, 'c').replace(/(\d+)v(\d+)/g, '$1 $2').replace(/(\d+)vs(\d+)/g, '$1 $2');
      
      const numbers = clean.match(/\d+/g) || [];
      const hasC = clean.includes('c') || clean.includes('comodin');
      const hasA = clean.includes('a') || clean.includes('arco') || clean.includes('portil') || clean.includes('portico');
      
      return {
        numbers: Array.from(new Set(numbers)).sort(),
        hasC,
        hasA
      };
    };

    const gpsSig = getFuzzySignature(selectedDrill);
    
    for (const t of tareas) {
      const dbSig = getFuzzySignature(t.nombre);
      
      const numbersMatch = gpsSig.numbers.length > 0 && 
                           dbSig.numbers.length > 0 && 
                           gpsSig.numbers.every(num => dbSig.numbers.includes(num)) &&
                           dbSig.numbers.every(num => gpsSig.numbers.includes(num));
                           
      if (numbersMatch && gpsSig.hasC === dbSig.hasC && gpsSig.hasA === dbSig.hasA) {
        return t;
      }
    }

    return null;
  }, [selectedDrill, tareas]);

  const embedVideoUrl = useMemo(() => {
    if (!matchedTarea || !matchedTarea.link_video) return null;
    const url = matchedTarea.link_video;
    // Si es un link de Google Drive, lo convertimos a /preview para poder incrustarlo en iframe
    if (url.includes('drive.google.com')) {
      let cleanUrl = url.replace(/\/view\?usp=drive_link$/, '/preview')
                       .replace(/\/view$/, '/preview')
                       .replace(/\/view\?.*$/, '/preview');
      if (!cleanUrl.endsWith('/preview')) {
        cleanUrl = cleanUrl.replace('/view', '/preview');
      }
      return cleanUrl;
    }
    return url;
  }, [matchedTarea]);

  const imageUrl = useMemo(() => {
    if (!matchedTarea || !matchedTarea.link_foto) return null;
    const url = matchedTarea.link_foto;
    // Si es un link de Google Drive, extraemos el id para usar el render de alta velocidad lh3
    if (url.includes('drive.google.com')) {
      const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return `https://lh3.googleusercontent.com/d/${match[1]}`;
      }
    }
    return url;
  }, [matchedTarea]);

  // Estadísticas globales de resumen
  const stats = useMemo(() => {
    if (filteredData.length === 0) {
      return { count: 0, avgDist: 0, avgMpm: 0, avgDuration: 0, maxVmax: 0, avgAcc: 0, avgSprintDist: 0 };
    }
    
    const count = filteredData.length;
    let totalDist = 0;
    let totalMpm = 0;
    let totalDuration = 0;
    let maxVmax = 0;
    let totalAcc = 0;
    let totalSprintDist = 0;

    filteredData.forEach(r => {
      totalDist += r.total_distance_m;
      totalMpm += r.meters_per_min;
      totalDuration += r.duration_min;
      totalAcc += r.acc_decc_ai;
      totalSprintDist += r.dist_sprint_25kmh;
      if (r.max_vel_kmh > maxVmax) maxVmax = r.max_vel_kmh;
    });

    return {
      count,
      avgDist: Math.round(totalDist / count),
      avgMpm: Number((totalMpm / count).toFixed(1)),
      avgDuration: Math.round(totalDuration / count),
      maxVmax,
      avgAcc: Math.round(totalAcc / count),
      avgSprintDist: Math.round(totalSprintDist / count)
    };
  }, [filteredData]);

  // Datos ordenados de la tabla
  const sortedTableData = useMemo(() => {
    const tableData = [...filteredData];
    if (sortConfig) {
      tableData.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortConfig.direction === 'asc' 
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }
        
        const aNum = Number(aVal || 0);
        const bNum = Number(bVal || 0);
        
        return sortConfig.direction === 'asc'
          ? aNum - bNum
          : bNum - aNum;
      });
    }
    return tableData;
  }, [filteredData, sortConfig]);

  const handleSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: SortKey) => {
    if (!sortConfig || sortConfig.key !== key) return 'fa-sort text-slate-500/30';
    return sortConfig.direction === 'desc' ? 'fa-sort-down text-red-500' : 'fa-sort-up text-red-500';
  };

  const getMpmStyle = (val: number) => {
    if (val > 85) return 'bg-red-600 text-white shadow-red-900/30';
    if (val > 70) return 'bg-[#0b1220] text-white';
    return 'bg-slate-50 text-slate-600 border border-slate-100';
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-24 max-w-[1600px] mx-auto px-4 md:px-0">
      {/* HEADER DE CONTROL - ÚNICO FILTRO */}
      <div className="bg-white rounded-[48px] p-8 md:p-10 border border-slate-100 shadow-sm space-y-8">
        <div className="flex flex-col xl:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-[#0b1220] rounded-[24px] flex items-center justify-center text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-red-600 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
              <i className="fa-solid fa-person-running text-2xl relative z-10"></i>
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-none mb-1">
                Dinámicas <span className="text-red-600">GPS</span>
              </h2>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em] italic">
                Gráficos de Caja y Dispersión de Ejercicios
              </p>
            </div>
          </div>

          {/* Selector ÚNICO de Filtro solicitado */}
          <div className="w-full xl:w-96 relative">
            <label className="absolute -top-2 left-4 px-1.5 bg-white text-[8px] font-black text-red-600 uppercase tracking-widest z-10">
              Seleccionar Dinámica
            </label>
            <select
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-xs font-black text-slate-900 outline-none appearance-none cursor-pointer shadow-sm focus:ring-4 focus:ring-slate-100 transition-all uppercase"
              value={selectedDrill}
              onChange={(e) => setSelectedDrill(e.target.value)}
            >
              {uniqueDrills.map(d => (
                <option key={d} value={d}>{d.toUpperCase()}</option>
              ))}
            </select>
            <i className="fa-solid fa-chevron-down absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px]"></i>
          </div>
        </div>

        {/* PESTAÑAS DE POSICIONES (FILTRO DE DEMARCACIÓN) */}
        <div className="border-t border-slate-100 pt-6 space-y-3">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 italic">
            <i className="fa-solid fa-users text-red-600"></i>
            Filtrar por Demarcación / Posición de los Jugadores:
          </p>
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => setSelectedPosition('TODAS')}
              className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 transform active:scale-95 ${
                selectedPosition === 'TODAS'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-950/20'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              TODAS LAS POSICIONES
            </button>
            {uniquePositions.map((pos) => (
              <button
                key={pos}
                onClick={() => setSelectedPosition(pos)}
                className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 transform active:scale-95 ${
                  selectedPosition === pos
                    ? 'bg-[#0b1220] text-white shadow-lg shadow-slate-900/30'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>

        {/* FEEDBACK MENSAJES */}
        {msg && (
          <div className={`p-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-3 border ${
            msg.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'
          }`}>
            <i className={`fa-solid ${msg.type === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation'}`}></i>
            <span>{msg.text}</span>
          </div>
        )}

        {/* KPIs GLOBALES FILTRADOS */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KPIMini label="Sesiones GPS" value={stats.count} icon="fa-chart-line" color="text-slate-900" />
          <KPIMini label="Distancia Prom" value={`${stats.avgDist}m`} icon="fa-arrows-left-right" color="text-blue-600" />
          <KPIMini label="Intensidad Prom" value={`${stats.avgMpm} m/min`} icon="fa-fire-flame-curved" color="text-red-600" />
          <KPIMini label="Sprints Prom" value={`${stats.avgSprintDist}m`} icon="fa-bolt" color="text-amber-500" />
          <KPIMini label="Aceleraciones" value={stats.avgAcc} icon="fa-angles-up" color="text-emerald-600" />
        </div>
      </div>

      {/* SECCIÓN VACÍA CON SEEDER SI NO HAY DATOS */}
      {data.length === 0 && !loading && (
        <div className="bg-white rounded-[48px] p-12 text-center border border-slate-100 shadow-sm max-w-2xl mx-auto space-y-6">
          <div className="w-20 h-20 bg-slate-50 border border-slate-100 text-slate-300 rounded-full flex items-center justify-center mx-auto">
            <i className="fa-solid fa-database text-3xl"></i>
          </div>
          <div>
            <h3 className="text-lg font-black uppercase text-slate-900 tracking-tight">Módulo de Dinámicas GPS</h3>
            <p className="text-slate-400 text-xs mt-2 leading-relaxed">
              La tabla <code className="bg-slate-100 text-red-500 px-1.5 py-0.5 rounded font-mono">drill_gps_data</code> está vacía o pendiente de configuración. Haz clic en el botón de abajo para sembrar registros realistas de prueba para La Roja.
            </p>
          </div>
          <button
            onClick={seedDemoData}
            disabled={seeding}
            className="px-8 py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 shadow-lg shadow-red-900/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3 mx-auto"
          >
            {seeding ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i>
                <span>Creando Dinámicas...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-seedling"></i>
                <span>Sembrar Datos Demo</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* DASHBOARD DE DISTRIBUCIÓN DE PERCENTILES */}
      {filteredData.length > 0 && (
        <div className="space-y-8">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.25em] mb-1">
              Distribución Estadística
            </h3>
            <h4 className="text-xl font-black italic uppercase text-slate-900">
              Distribución de Percentiles de la Dinámica: <span className="text-red-600 font-black">{selectedDrill === 'TODAS' ? 'TODAS LAS DINÁMICAS' : selectedDrill}</span>
              {selectedPosition !== 'TODAS' && (
                <span className="text-slate-500 font-black"> - POSICIÓN: <span className="text-blue-600">{selectedPosition.toUpperCase()}</span></span>
              )}
            </h4>
          </div>

          {/* Grilla con la Distribución de Percentiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
            <BoxPlot
              label="Intensidad de Carrera"
              unit="m/min"
              values={boxPlotData.intensity}
              color="#CF1B2B"
            />
            <BoxPlot
              label="Volumen / Distancia Total"
              unit="m"
              values={boxPlotData.volume}
              color="#3b82f6"
            />
            <BoxPlot
              label="Velocidad Máxima Registrada"
              unit="km/h"
              values={boxPlotData.maxVel}
              color="#f59e0b"
            />
            <BoxPlot
              label="Acciones de Alta Intensidad (ACC/DEC)"
              unit="act."
              values={boxPlotData.accel}
              color="#10b981"
            />
            <BoxPlot
              label="Cantidad de Sprints"
              unit="spr."
              values={boxPlotData.sprints}
              color="#8b5cf6"
            />
            <BoxPlot
              label="Distancia > 15 km/h"
              unit="m"
              values={boxPlotData.dist15}
              color="#06b6d4"
            />
            <BoxPlot
              label="Distancia > 20 km/h"
              unit="m"
              values={boxPlotData.dist20}
              color="#ec4899"
            />
            <BoxPlot
              label="Duración"
              unit="min"
              values={boxPlotData.duration}
              color="#14b8a6"
            />
            <BoxPlot
              label="Sprint en Metros"
              unit="m"
              values={boxPlotData.distSprintM}
              color="#f43f5e"
            />
          </div>

          {/* Video de la Tarea en Google Drive */}
          {embedVideoUrl ? (
            <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 mt-8 space-y-4">
              <div className="flex items-center gap-3 pb-2">
                <div className="w-10 h-10 rounded-2xl bg-red-600 flex items-center justify-center text-white shadow-md shadow-red-600/10 animate-pulse">
                  <i className="fa-solid fa-video text-xs"></i>
                </div>
                <div>
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                    Video Animación de la Tarea / Dinámica
                  </h5>
                  <p className="text-sm font-black italic text-slate-900 uppercase tracking-tight">
                    {matchedTarea?.nombre}
                  </p>
                </div>
              </div>

              <div className="relative aspect-video w-full max-w-4xl mx-auto rounded-3xl overflow-hidden border border-slate-200 bg-slate-950 shadow-2xl">
                <iframe
                  src={embedVideoUrl}
                  className="absolute top-0 left-0 w-full h-full border-0"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                  title={`Video de la Tarea: ${matchedTarea?.nombre}`}
                />
              </div>
            </div>
          ) : selectedDrill !== 'TODAS' && (
            <div className="bg-slate-50/50 p-6 rounded-[32px] border border-dashed border-slate-200 mt-8 flex flex-col items-center justify-center text-center py-8">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                <i className="fa-solid fa-video-slash text-base"></i>
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Sin video disponible</p>
              <p className="text-[10px] font-medium text-slate-400 mt-1">No hay un enlace de Google Drive registrado en la biblioteca de tareas para la dinámica "{selectedDrill}".</p>
            </div>
          )}

          {/* Foto de la Tarea / Medidas de la Cancha */}
          {imageUrl ? (
            <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 mt-6 space-y-4">
              <div className="flex items-center gap-3 pb-2">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/10">
                  <i className="fa-solid fa-map text-xs"></i>
                </div>
                <div>
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                    Cancha y Medidas de la Tarea / Dinámica
                  </h5>
                  <p className="text-sm font-black italic text-slate-900 uppercase tracking-tight">
                    Dimensiones y Organización Espacial
                  </p>
                </div>
              </div>

              <div className="relative w-full max-w-4xl mx-auto rounded-3xl overflow-hidden border border-slate-200 bg-white shadow-xl p-2">
                <img
                  src={imageUrl}
                  alt={`Cancha y Medidas: ${matchedTarea?.nombre}`}
                  className="w-full h-auto rounded-2xl max-h-[550px] object-contain mx-auto"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (matchedTarea?.link_foto) {
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `
                          <iframe 
                            src="${matchedTarea.link_foto.replace('/view?usp=drive_link', '/preview').replace('/view', '/preview')}" 
                            class="w-full h-[450px] border-0 rounded-2xl"
                            allow="autoplay"
                          ></iframe>
                        `;
                      }
                    }
                  }}
                />
              </div>
            </div>
          ) : selectedDrill !== 'TODAS' && (
            <div className="bg-slate-50/50 p-6 rounded-[32px] border border-dashed border-slate-200 mt-6 flex flex-col items-center justify-center text-center py-8">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                <i className="fa-solid fa-image-slash text-base"></i>
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Sin gráfico de dimensiones disponible</p>
              <p className="text-[10px] font-medium text-slate-400 mt-1">No hay un gráfico o foto de la cancha cargado para la dinámica "{selectedDrill}".</p>
            </div>
          )}
        </div>
      )}


      {/* COMPORTAMIENTO SCROLLBAR CSS */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
}

function KPIMini({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) {
  return (
    <div className="bg-white p-5 rounded-[24px] border border-slate-100 flex items-center gap-4 transition-all hover:shadow-lg group transform-gpu hover:-translate-y-0.5">
      <div className={`w-10 h-10 rounded-[16px] flex items-center justify-center text-base bg-white shadow-inner border border-slate-50 ${color} group-hover:scale-110 transition-transform`}>
        <i className={`fa-solid ${icon}`}></i>
      </div>
      <div>
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1.5">{label}</p>
        <p className={`text-lg font-black italic tracking-tighter leading-none ${color}`}>{value}</p>
      </div>
    </div>
  );
}
