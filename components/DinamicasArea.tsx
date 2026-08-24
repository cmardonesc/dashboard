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
function generateLocalFallbackData(tareasList?: any[]): DrillGpsRecord[] {
  const listToUse = tareasList && tareasList.length > 0 ? tareasList : DEFAULT_TAREAS_FALLBACK;

  const sampleDrills = listToUse.map((t, idx) => {
    const name = t.nombre;
    const cleanName = name.toLowerCase();
    
    // Asignar parámetros realistas según el tipo/nombre del ejercicio
    let duration = 15;
    let dist = 1100;
    let vmax = 27.0;
    let sprints = 3;
    let acc = 30;

    const isFormal = cleanName.includes('11 vs 11') || cleanName.includes('formal') || t.tipo === 'partido';
    const isReducido = cleanName.includes('vs') || t.tipo === 'abierta' || t.tipo === 'cerrada';
    const isRondo = cleanName.includes('rondo') || cleanName.includes('cuadrado') || cleanName.includes('jaula');

    if (isFormal) {
      duration = 25;
      dist = 2250;
      vmax = 31.8;
      sprints = 8;
      acc = 52;
    } else if (isRondo) {
      duration = 12;
      dist = 780;
      vmax = 25.5;
      sprints = 1;
      acc = 22;
    } else if (isReducido) {
      duration = 15 + (idx % 5);
      dist = 1150 + (idx % 5) * 50;
      vmax = 27.5 + (idx % 3) * 0.5;
      sprints = 3 + (idx % 3);
      acc = 32 + (idx % 5) * 2;
    }

    const mpm = Number((dist / duration).toFixed(1));
    const a15 = Math.round(dist * 0.22);
    const a20 = Math.round(dist * 0.07);
    const a25 = Math.round(dist * 0.012);

    return {
      name,
      duration,
      dist,
      mpm,
      a15,
      a20,
      a25,
      sprints,
      vmax,
      acc
    };
  });

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

// Helpers para normalización y coincidencia difusa de nombres de tareas
function cleanStringForMatching(str: string) {
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
}

function getFuzzySignatureForMatching(s: string) {
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
}

function findMatchedTareaInList(drillName: string, tareasList: any[]) {
  if (!drillName || drillName === 'TODAS' || tareasList.length === 0) return null;

  const cleanGps = cleanStringForMatching(drillName);
  
  // 1. Intento de coincidencia exacta limpia
  for (const t of tareasList) {
    const cleanDb = cleanStringForMatching(t.nombre);
    if (cleanGps === cleanDb && cleanGps !== '') {
      return t;
    }
  }

  // 2. Intento de coincidencia de subcadena
  for (const t of tareasList) {
    const cleanDb = cleanStringForMatching(t.nombre);
    if (cleanGps.includes(cleanDb) || cleanDb.includes(cleanGps)) {
      if (cleanGps.length > 2 && cleanDb.length > 2) {
        return t;
      }
    }
  }

  // 3. Firma difusa (comparando números y banderas como 'c' y 'a')
  const gpsSig = getFuzzySignatureForMatching(drillName);
  
  for (const t of tareasList) {
    const dbSig = getFuzzySignatureForMatching(t.nombre);
    
    const numbersMatch = gpsSig.numbers.length > 0 && 
                         dbSig.numbers.length > 0 && 
                         gpsSig.numbers.every(num => dbSig.numbers.includes(num)) &&
                         dbSig.numbers.every(num => gpsSig.numbers.includes(num));
                         
    if (numbersMatch && gpsSig.hasC === dbSig.hasC && gpsSig.hasA === dbSig.hasA) {
      return t;
    }
  }

  return null;
}

const DEFAULT_TAREAS_FALLBACK = [
  {
    id: 9001,
    nombre: 'Rondo Transición 5v2',
    tipo: 'cerrada',
    descripcion: 'Rondo de posesión con transición rápida tras pérdida. Foco en líneas de pase y presión inmediata.',
    link_foto: 'https://nqdbqqmjyygopjnpqyvm.supabase.co/storage/v1/object/public/dinamicas/p06_Dinamica_4_vs_4_3_octagono_.jpg',
    contenidos_ofensivos: '["Continuidad", "Estar en línea de pase", "Mirar lejos"]',
    contenidos_defensivos: '["Presión pospérdida", "Cerrar líneas de pase"]',
    consignas: '["Dos toques máximo", "Buscar al tercer hombre"]',
    reglas: '["Si recupera el defensa, transición a miniportería"]',
    variantes: '["Limitar a un toque", "Ampliar el espacio de juego"]'
  },
  {
    id: 9002,
    nombre: 'Fútbol Reducido 4v4 +3C',
    tipo: 'cerrada',
    descripcion: 'Juego reducido con 3 comodines (2 exteriores y 1 central) para generar superioridad numérica en la posesión.',
    link_foto: 'https://nqdbqqmjyygopjnpqyvm.supabase.co/storage/v1/object/public/dinamicas/p05_Dinamica_4_vs_4_C_2A.jpg',
    contenidos_ofensivos: '["Atraer rivales", "Superioridad numérica", "Tercer hombre"]',
    contenidos_defensivos: '["Presión tras pérdida", "Defensa en bloque"]',
    consignas: '["Aprovechar comodines", "Cambiar de orientación rápido"]',
    reglas: '["Goles valen doble si asiste un comodín"]',
    variantes: '["Comodines a un toque", "Orientación de arcos variable"]'
  },
  {
    id: 9003,
    nombre: 'Trabajo Táctico 11v0',
    tipo: 'partido',
    descripcion: 'Circulación táctica formal sin oposición para afinar automatismos ofensivos, salidas y desmarques de ruptura.',
    link_foto: 'https://nqdbqqmjyygopjnpqyvm.supabase.co/storage/v1/object/public/dinamicas/p52_Dinamica_Salidas_largas_11_vs_11.jpg',
    contenidos_ofensivos: '["Estructura 4-3-3", "Salidas cortas", "Desmarques de ruptura"]',
    contenidos_defensivos: '["Repliegue ordenado", "Ajustes de línea"]',
    consignas: '["Pase firme al pie", "Sincronizar desmarques", "Máxima velocidad de balón"]',
    reglas: '["Completar secuencia de 10 pases antes de finalizar"]',
    variantes: '["Iniciar juego desde diferentes zonas", "Oposición pasiva de entrenadores"]'
  },
  {
    id: 9004,
    nombre: 'Presión tras Pérdida 6v6',
    tipo: 'cerrada',
    descripcion: 'Dinámica de posesión en espacio reducido enfocada en la transición defensiva inmediata ante pérdida del balón.',
    link_foto: 'https://nqdbqqmjyygopjnpqyvm.supabase.co/storage/v1/object/public/dinamicas/p22_Dinamica_6_vs_6_2C_2A.jpg',
    contenidos_ofensivos: '["Amplitud", "Sostener posesión", "Pase de seguridad"]',
    contenidos_defensivos: '["Presión inmediata", "Acortar distancias", "Acoso al poseedor"]',
    consignas: '["Reaccionar en menos de 3 segundos", "Cerrar líneas de pase internas"]',
    reglas: '["El equipo que recupera tiene 5 segundos para rematar"]',
    variantes: '["Espacio de juego hexagonal", "Comodín neutral central"]'
  },
  {
    id: 9005,
    nombre: 'Fútbol Formal 11v11',
    tipo: 'partido',
    descripcion: 'Partido de fútbol 11 contra 11 en dimensiones reglamentarias con consignas tácticas específicas de competencia.',
    link_foto: 'https://nqdbqqmjyygopjnpqyvm.supabase.co/storage/v1/object/public/dinamicas/p52_Dinamica_Salidas_largas_11_vs_11.jpg',
    contenidos_ofensivos: '["Amplitud y profundidad", "Ataque posicional", "Transición rápida"]',
    contenidos_defensivos: '["Bloque medio/bajo", "Defensa de área", "Vigilancias defensivas"]',
    consignas: '["Mantener el bloque compacto", "Atacar los pasillos laterales"]',
    reglas: '["Reglas de fútbol oficial de la FIFA"]',
    variantes: '["Limitar toques en zona de inicio", "Obligatorio finalizar de cabeza o volea"]'
  },
  {
    id: 9006,
    nombre: 'Juegos de Posición 8v8',
    tipo: 'abierta',
    descripcion: 'Estructura posicional donde los equipos mantienen sus posiciones reales para circular el balón ante una oposición organizada.',
    link_foto: 'https://nqdbqqmjyygopjnpqyvm.supabase.co/storage/v1/object/public/dinamicas/p30_Dinamica_8_vs_8_C_2A.jpg',
    contenidos_ofensivos: '["Juego de posición", "Orientación corporal", "Atraer para liberar"]',
    contenidos_defensivos: '["Orientar presión", "Cerrar pasillos interiores"]',
    consignas: '["No salir de la zona de influencia", "Mantener amplitud constante"]',
    reglas: '["Balón debe pasar por el mediocentro antes de progresar"]',
    variantes: '["Reducir dimensiones", "Añadir un mediocentro comodín"]'
  },
  {
    id: 9007,
    nombre: 'Ataque vs Defensa 6v4',
    tipo: 'abierta',
    descripcion: 'Acciones combinadas de ataque contra una línea defensiva en inferioridad para entrenar finalizaciones y coberturas.',
    link_foto: 'https://nqdbqqmjyygopjnpqyvm.supabase.co/storage/v1/object/public/dinamicas/p20_Dinamica_6_vs_4_2P_2A.jpg',
    contenidos_ofensivos: '["Ataque rápido", "Doblajes por banda", "Centros y remates"]',
    contenidos_defensivos: '["Coberturas recíprocas", "Basculación rápida", "Despejes orientados"]',
    consignas: '["Finalizar jugadas rápido", "Evitar el centro lateral", "Perfilamiento correcto"]',
    reglas: '["Defensa suma punto si despeja de cabeza"]',
    variantes: '["Añadir 2 defensores replegándose tarde", "Límites de tiempo para finalizar"]'
  }
];

export default function DinamicasArea() {
  const [data, setData] = useState<DrillGpsRecord[]>([]);
  const [tareas, setTareas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Filtro ÚNICO de Dinámica, Tipo de Tarea y Pestañas de Posición
  const [selectedDrill, setSelectedDrill] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('TODOS');
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
    let activeTareas = DEFAULT_TAREAS_FALLBACK;
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

      // Fetch the tareas table via server proxy with all dynamic details
      try {
        const res = await fetch('/api/tareas');
        if (res.ok) {
          const tData = await res.json();
          if (tData && tData.length > 0) {
            activeTareas = tData;
            setTareas(tData);
          } else {
            setTareas(DEFAULT_TAREAS_FALLBACK);
          }
        } else {
          console.warn("Proxy /api/tareas returned error, trying client direct as fallback");
          const { data: tData } = await supabase
            .from('tareas')
            .select('id, nombre, link_foto, link_video, tipo, descripcion, contenidos_ofensivos, contenidos_defensivos, consignas, reglas, variantes');
          if (tData && tData.length > 0) {
            activeTareas = tData;
            setTareas(tData);
          } else {
            setTareas(DEFAULT_TAREAS_FALLBACK);
          }
        }
      } catch (err) {
        console.error("Error fetching tareas via proxy:", err);
        // Fallback directly to client client in case of local offline development
        try {
          const { data: tData } = await supabase
            .from('tareas')
            .select('id, nombre, link_foto, link_video, tipo, descripcion, contenidos_ofensivos, contenidos_defensivos, consignas, reglas, variantes');
          if (tData && tData.length > 0) {
            activeTareas = tData;
            setTareas(tData);
          } else {
            setTareas(DEFAULT_TAREAS_FALLBACK);
          }
        } catch (clientErr) {
          console.error("Fallback client fetch failed:", clientErr);
          setTareas(DEFAULT_TAREAS_FALLBACK);
        }
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
      } else {
        // Si no hay datos, cargamos los datos fallback locales de inmediato
        const fallback = generateLocalFallbackData(activeTareas);
        setData(fallback);
        setMsg({
          text: "La tabla 'drill_gps_data' está vacía. Mostrando datos de Dinámicas GPS de muestra.",
          type: 'success'
        });
      }
    } catch (err: any) {
      console.error("Error al cargar datos de drill_gps_data, cargando fallback:", err);
      const fallback = generateLocalFallbackData(activeTareas);
      setData(fallback);
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

  // Lista de dinámicas únicas desde la columna 'nombre' de la tabla de tareas
  const uniqueDrills = useMemo(() => {
    let drills = tareas.map(t => t.nombre).filter(Boolean);
    
    // Si la tabla tareas está vacía o faltan dinámicas que existen en la data GPS cargada,
    // garantizamos que se incluyan para que la navegación por selector sea robusta
    const dataDrills = data.map(r => r.drill_name).filter(Boolean);
    dataDrills.forEach(d => {
      const exists = drills.some(tName => tName.trim().toLowerCase() === d.trim().toLowerCase());
      if (!exists) {
        drills.push(d);
      }
    });

    return Array.from(new Set(drills)).sort((a, b) => a.localeCompare(b));
  }, [tareas, data]);

  // Sincronizar la dinámica seleccionada desde el Área Técnica
  useEffect(() => {
    const handleDrillChange = (e: any) => {
      const name = e.detail?.name;
      if (name) {
        setSelectedType('TODOS');
        setSelectedDrill(name);
      }
    };

    const stored = localStorage.getItem('selected_drill_name');
    if (stored) {
      setSelectedType('TODOS');
      setSelectedDrill(stored);
      localStorage.removeItem('selected_drill_name');
    }

    window.addEventListener('selected_drill_changed', handleDrillChange);
    return () => {
      window.removeEventListener('selected_drill_changed', handleDrillChange);
    };
  }, [uniqueDrills]);

  // Lista de tipos de tareas únicas para el nuevo filtro de categoría
  const uniqueTypes = useMemo(() => {
    const types = tareas.map(t => t.tipo).filter(Boolean);
    return Array.from(new Set(types)).sort((a, b) => a.localeCompare(b));
  }, [tareas]);

  // Mapa que asocia cada dinámica con su respectivo tipo en la base de datos de tareas
  const drillToTypeMap = useMemo(() => {
    const map = new Map<string, string>();
    uniqueDrills.forEach(d => {
      const match = tareas.find(t => t.nombre === d);
      map.set(d, match && match.tipo ? match.tipo : 'sin tipo');
    });
    return map;
  }, [uniqueDrills, tareas]);

  // Lista de dinámicas filtradas según el tipo seleccionado
  const filteredDrillsForSelect = useMemo(() => {
    if (selectedType === 'TODOS') return uniqueDrills;
    return uniqueDrills.filter(d => drillToTypeMap.get(d) === selectedType);
  }, [uniqueDrills, selectedType, drillToTypeMap]);

  // Auto-ajuste de selectedDrill cuando cambia el tipo seleccionado
  useEffect(() => {
    if (filteredDrillsForSelect.length > 0) {
      if (!filteredDrillsForSelect.includes(selectedDrill)) {
        setSelectedDrill(filteredDrillsForSelect[0]);
      }
    }
  }, [filteredDrillsForSelect, selectedDrill]);

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

  // Filtrado de datos por el selector de Dinámica (desde tareas) y la pestaña de Posición
  const filteredData = useMemo(() => {
    if (!selectedDrill) return [];
    
    // Obtenemos la tarea actual correspondiente al selectedDrill para comparar los nombres en forma flexible/fuzzy
    const currentMatchedTarea = tareas.find(t => t.nombre === selectedDrill);
    
    return data.filter(record => {
      // Si tenemos la tarea, verificamos si este registro de GPS corresponde a ella usando coincidencia flexible/fuzzy
      if (currentMatchedTarea) {
        const isMatch = findMatchedTareaInList(record.drill_name, [currentMatchedTarea]);
        if (!isMatch) return false;
      } else {
        // Fallback si por alguna razón no se ha cargado/encontrado la tarea
        if (record.drill_name !== selectedDrill) return false;
      }

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
  }, [data, selectedDrill, tareas, selectedPosition, searchTerm]);

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
    if (!selectedDrill) return null;
    const raw = tareas.find(t => t.nombre === selectedDrill) || null;
    if (!raw) return null;

    // Helper to safely parse array-like fields
    const parseArray = (val: any): string[] => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) return parsed;
          } catch (e) {
            // ignore JSON parse error, proceed
          }
        }
        if (trimmed.includes(',')) {
          return trimmed.split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
        }
        return [trimmed];
      }
      return [];
    };

    return {
      ...raw,
      contenidos_ofensivos: parseArray(raw.contenidos_ofensivos),
      contenidos_defensivos: parseArray(raw.contenidos_defensivos),
      consignas: parseArray(raw.consignas),
      reglas: parseArray(raw.reglas),
      variantes: parseArray(raw.variantes),
    };
  }, [selectedDrill, tareas]);

  const videoDetails = useMemo(() => {
    if (!matchedTarea || !matchedTarea.link_video) return null;
    const url = matchedTarea.link_video.trim();
    
    // Check for Google Drive
    if (url.includes('drive.google.com')) {
      const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || 
                    url.match(/id=([a-zA-Z0-9_-]+)/) ||
                    url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      const id = match ? match[1] : null;
      if (id) {
        return {
          originalUrl: url,
          embedUrl: `https://drive.google.com/file/d/${id}/preview`,
          directUrl: `https://docs.google.com/uc?export=download&id=${id}`,
          type: 'drive' as const,
          id
        };
      }
      return { originalUrl: url, embedUrl: url, type: 'drive' as const };
    }
    
    // Check for YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      let id: string | null = null;
      if (url.includes('youtu.be/')) {
        id = url.split('youtu.be/')[1]?.split(/[?#]/)[0] || null;
      } else if (url.includes('embed/')) {
        id = url.split('embed/')[1]?.split(/[?#]/)[0] || null;
      } else {
        const match = url.match(/[?&]v=([^&#]+)/);
        id = match ? match[1] : null;
      }
      if (id) {
        return {
          originalUrl: url,
          embedUrl: `https://www.youtube.com/embed/${id}`,
          type: 'youtube' as const,
          id
        };
      }
    }

    // Check for Vimeo
    if (url.includes('vimeo.com')) {
      const match = url.match(/vimeo\.com\/(?:channels\/[^\/]+\/|groups\/[^\/]+\/|album\/[^\/]+\/video\/|showcase\/[^\/]+\/|video\/)?([0-9]+)/);
      const id = match ? match[1] : null;
      if (id) {
        return {
          originalUrl: url,
          embedUrl: `https://player.vimeo.com/video/${id}`,
          type: 'vimeo' as const,
          id
        };
      }
    }

    // Check for direct video extension
    const lower = url.toLowerCase();
    if (lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.ogg') || lower.endsWith('.mov') || lower.endsWith('.m4v') || url.includes('uc?export=download')) {
      return {
        originalUrl: url,
        embedUrl: url,
        directUrl: url,
        type: 'direct' as const
      };
    }

    return {
      originalUrl: url,
      embedUrl: url,
      type: 'other' as const
    };
  }, [matchedTarea]);

  const embedVideoUrl = useMemo(() => {
    return videoDetails?.embedUrl || null;
  }, [videoDetails]);

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
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-none mb-1">
                  Dinámicas
                </h2>
                <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-md font-black border border-red-200 uppercase tracking-wider">En Desarrollo</span>
              </div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em] italic mt-1">
                Gráficos de Caja y Dispersión de Ejercicios
              </p>
            </div>
          </div>

          {/* Selectores de Filtro de Tipo y Dinámica */}
          <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto xl:min-w-[600px]">
            {/* Filtro por Tipo de Tarea */}
            <div className="w-full md:w-1/2 relative">
              <label className="absolute -top-2 left-4 px-1.5 bg-white text-[8px] font-black text-red-600 uppercase tracking-widest z-10">
                Filtrar por Tipo de Tarea
              </label>
              <select
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-xs font-black text-slate-900 outline-none appearance-none cursor-pointer shadow-sm focus:ring-4 focus:ring-slate-100 transition-all uppercase"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="TODOS">TODOS LOS TIPOS</option>
                {uniqueTypes.map(t => (
                  <option key={t} value={t}>{t.toUpperCase()}</option>
                ))}
              </select>
              <i className="fa-solid fa-filter absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px]"></i>
            </div>

            {/* Selector de Dinámica */}
            <div className="w-full md:w-1/2 relative">
              <label className="absolute -top-2 left-4 px-1.5 bg-white text-[8px] font-black text-red-600 uppercase tracking-widest z-10">
                Seleccionar Dinámica
              </label>
              <select
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-xs font-black text-slate-900 outline-none appearance-none cursor-pointer shadow-sm focus:ring-4 focus:ring-slate-100 transition-all uppercase"
                value={selectedDrill}
                onChange={(e) => setSelectedDrill(e.target.value)}
              >
                {filteredDrillsForSelect.map(d => (
                  <option key={d} value={d}>{d.toUpperCase()}</option>
                ))}
              </select>
              <i className="fa-solid fa-chevron-down absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px]"></i>
            </div>
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

      {/* FICHA TÉCNICA DE LA DINÁMICA SELECCIONADA */}
      {selectedDrill && selectedDrill !== 'TODAS' && matchedTarea && (
        <div className="bg-white rounded-[48px] p-8 md:p-10 border border-slate-100 shadow-sm space-y-8 animate-in fade-in duration-300">
          <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.25em] mb-1">
                Ficha Técnica del Ejercicio
              </h3>
              <h4 className="text-2xl font-black italic uppercase text-slate-900 flex items-center gap-3">
                {matchedTarea.nombre}
                {matchedTarea.tipo && (
                  <span className={`text-[10px] not-italic font-black uppercase px-2.5 py-1 rounded-full border ${
                    matchedTarea.tipo === 'abierta' 
                      ? 'bg-blue-50 border-blue-200 text-blue-600' 
                      : matchedTarea.tipo === 'cerrada'
                      ? 'bg-amber-50 border-amber-200 text-amber-600'
                      : 'bg-purple-50 border-purple-200 text-purple-600'
                  }`}>
                    {matchedTarea.tipo}
                  </span>
                )}
              </h4>
            </div>
            {matchedTarea.updated_at && (
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Actualizado: {new Date(matchedTarea.updated_at).toLocaleDateString()}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* LADO IZQUIERDO: DIAGRAMA / IMAGEN */}
            <div className="lg:col-span-5 space-y-4">
              {matchedTarea.link_foto ? (
                <div className="rounded-[32px] overflow-hidden border border-slate-100 bg-slate-50 shadow-sm relative group aspect-[4/3] flex items-center justify-center">
                  <img
                    src={matchedTarea.link_foto}
                    alt={matchedTarea.nombre}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full">
                    <i className="fa-solid fa-camera mr-1.5 text-red-500"></i> Diagrama Táctico
                  </div>
                </div>
              ) : (
                <div className="rounded-[32px] border border-dashed border-slate-200 bg-slate-50/50 aspect-[4/3] flex flex-col items-center justify-center text-center p-6">
                  <i className="fa-solid fa-image text-slate-300 text-4xl mb-3"></i>
                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">Sin diagrama disponible</p>
                </div>
              )}

              {/* VIDEO INTEGRADO EN LA FICHA */}
              {videoDetails ? (
                <div className="rounded-[32px] p-5 bg-slate-50 border border-slate-100 space-y-3">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 italic">
                    <i className="fa-solid fa-circle-play text-red-600"></i>
                    Animación de la Tarea:
                  </p>
                  <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 shadow-md">
                    {videoDetails.type === 'direct' ? (
                      <video
                        src={videoDetails.directUrl}
                        controls
                        className="absolute top-0 left-0 w-full h-full border-0"
                        preload="metadata"
                      />
                    ) : (
                      <iframe
                        src={videoDetails.embedUrl}
                        className="absolute top-0 left-0 w-full h-full border-0"
                        allow="autoplay; encrypted-media; picture-in-picture"
                        allowFullScreen
                        title={`Video: ${matchedTarea.nombre}`}
                      />
                    )}
                  </div>
                  
                  {/* Floating Action/Info Bar below the video to make it fully bulletproof */}
                  <div className="flex flex-col gap-2 pt-1 bg-slate-50 rounded-2xl">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                        <i className="fa-solid fa-info-circle text-slate-400"></i>
                        {videoDetails.type === 'drive' ? 'Video en Google Drive' :
                         videoDetails.type === 'youtube' ? 'Video en YouTube' :
                         videoDetails.type === 'vimeo' ? 'Video en Vimeo' : 'Video del ejercicio'}
                      </p>
                      <a
                        href={videoDetails.originalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-wider transition-all duration-200 shadow-sm"
                      >
                        <i className="fa-solid fa-arrow-up-right-from-square"></i>
                        Ver video original
                      </a>
                    </div>
                    {videoDetails.type === 'drive' && (
                      <p className="text-[9px] text-slate-400 leading-normal">
                        Nota: Si tu navegador bloquea las cookies de Google Drive dentro del panel de la aplicación, el reproductor puede aparecer en blanco. Haz clic en <strong>Ver video original</strong> para reproducirlo en una pestaña nueva sin restricciones.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-[32px] p-5 bg-slate-50/50 border border-dashed border-slate-200 text-center py-6">
                  <i className="fa-solid fa-video-slash text-slate-300 text-base mb-1"></i>
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Sin video animado</p>
                </div>
              )}
            </div>

            {/* LADO DERECHO: DESCRIPCIÓN Y ASPECTOS TÉCNICOS */}
            <div className="lg:col-span-7 space-y-6">
              {matchedTarea.descripcion && (
                <div className="space-y-2">
                  <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Descripción del Ejercicio</h5>
                  <p className="text-sm font-medium text-slate-600 leading-relaxed bg-slate-50/80 p-5 rounded-3xl border border-slate-50">
                    {matchedTarea.descripcion}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Contenidos Ofensivos */}
                <div className="space-y-2.5">
                  <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    Contenidos Ofensivos
                  </h5>
                  {matchedTarea.contenidos_ofensivos && matchedTarea.contenidos_ofensivos.length > 0 ? (
                    <ul className="space-y-1.5">
                      {matchedTarea.contenidos_ofensivos.map((item: string, idx: number) => (
                        <li key={idx} className="text-xs font-bold text-slate-700 bg-blue-50/40 border border-blue-100/50 px-3.5 py-2 rounded-2xl flex items-start gap-2.5">
                          <i className="fa-solid fa-angles-right text-blue-500 text-[10px] mt-0.5"></i>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[10px] italic text-slate-400">No especificados</p>
                  )}
                </div>

                {/* Contenidos Defensivos */}
                <div className="space-y-2.5">
                  <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                    Contenidos Defensivos
                  </h5>
                  {matchedTarea.contenidos_defensivos && matchedTarea.contenidos_defensivos.length > 0 ? (
                    <ul className="space-y-1.5">
                      {matchedTarea.contenidos_defensivos.map((item: string, idx: number) => (
                        <li key={idx} className="text-xs font-bold text-slate-700 bg-red-50/40 border border-red-100/50 px-3.5 py-2 rounded-2xl flex items-start gap-2.5">
                          <i className="fa-solid fa-angles-left text-red-500 text-[10px] mt-0.5"></i>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[10px] italic text-slate-400">No especificados</p>
                  )}
                </div>
              </div>

              {/* Consignas & Reglas de provocación */}
              <div className="space-y-4 pt-2 border-t border-slate-100">
                {matchedTarea.consignas && matchedTarea.consignas.length > 0 && (
                  <div className="space-y-2.5">
                    <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                      <i className="fa-solid fa-bullhorn text-amber-500 text-xs"></i>
                      Consignas de los Entrenadores
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {matchedTarea.consignas.map((item: string, idx: number) => (
                        <div key={idx} className="text-xs font-bold text-slate-700 bg-amber-50/30 border border-amber-100/40 p-3 rounded-2xl flex items-start gap-3">
                          <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[9px] font-black shrink-0">
                            {idx + 1}
                          </span>
                          <span className="leading-relaxed">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Reglas de provocación */}
                  {matchedTarea.reglas && matchedTarea.reglas.length > 0 && (
                    <div className="space-y-2.5">
                      <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                        <i className="fa-solid fa-scale-balanced text-purple-500 text-xs"></i>
                        Reglas de Provocación
                      </h5>
                      <ul className="space-y-1.5">
                        {matchedTarea.reglas.map((item: string, idx: number) => (
                          <li key={idx} className="text-xs font-bold text-slate-700 bg-purple-50/30 border border-purple-100/40 px-3.5 py-2.5 rounded-2xl flex items-start gap-2.5">
                            <i className="fa-solid fa-check text-purple-500 text-xs mt-0.5"></i>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Variantes */}
                  {matchedTarea.variantes && matchedTarea.variantes.length > 0 && (
                    <div className="space-y-2.5">
                      <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                        <i className="fa-solid fa-code-fork text-emerald-500 text-xs"></i>
                        Variantes Progresivas
                      </h5>
                      <ul className="space-y-1.5">
                        {matchedTarea.variantes.map((item: string, idx: number) => (
                          <li key={idx} className="text-xs font-bold text-slate-700 bg-emerald-50/30 border border-emerald-100/40 px-3.5 py-2.5 rounded-2xl flex items-start gap-2.5">
                            <i className="fa-solid fa-arrow-right-long text-emerald-500 text-xs mt-0.5"></i>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* SECCIÓN VACÍA CON SEEDER SI NO HAY DATOS */}
      {data.length === 0 && !loading && (
        <div className="bg-white rounded-[48px] p-12 text-center border border-slate-100 shadow-sm max-w-2xl mx-auto space-y-6">
          <div className="w-20 h-20 bg-slate-50 border border-slate-100 text-slate-300 rounded-full flex items-center justify-center mx-auto">
            <i className="fa-solid fa-database text-3xl"></i>
          </div>
          <div>
            <h3 className="text-lg font-black uppercase text-slate-900 tracking-tight">Módulo de Dinámicas</h3>
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

      {/* DASHBOARD DE DISTRIBUCIÓN DE PERCENTILES O MENSAJE SIN DATOS */}
      {selectedDrill && (
        filteredData.length > 0 ? (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.25em] mb-1">
                Distribución Estadística
              </h3>
              <h4 className="text-xl font-black italic uppercase text-slate-900">
                Distribución de Percentiles de la Dinámica: <span className="text-red-600 font-black">{selectedDrill}</span>
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
          </div>
        ) : (
          <div className="bg-white rounded-[48px] p-12 text-center border border-slate-100 shadow-sm max-w-2xl mx-auto space-y-4 animate-in fade-in duration-500">
            <div className="w-16 h-16 bg-slate-50 border border-slate-100 text-slate-300 rounded-full flex items-center justify-center mx-auto">
              <i className="fa-solid fa-triangle-exclamation text-xl text-amber-500 animate-pulse"></i>
            </div>
            <div>
              <h4 className="text-sm font-black uppercase text-slate-900 tracking-tight">Sin Datos GPS Asociados</h4>
              <p className="text-slate-400 text-xs mt-1.5 leading-relaxed max-w-md mx-auto">
                La dinámica seleccionada ("{selectedDrill}") no cuenta con registros de rendimiento GPS asociados en la base de datos{selectedPosition !== 'TODAS' ? ` para la demarcación "${selectedPosition}"` : ''}.
              </p>
            </div>
          </div>
        )
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
