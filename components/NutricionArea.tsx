
import React, { useState, useMemo } from 'react';
import { AthletePerformanceRecord, Category, User, NutritionData } from '../types';
import { supabase } from '../lib/supabase';
import NutritionReport from './NutritionReport';
import ClubBadge from './ClubBadge';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend
} from 'recharts';

interface NutricionAreaProps {
  performanceRecords: AthletePerformanceRecord[];
  players?: User[];
  initialTab?: TabId;
  userRole?: string;
  userClub?: string;
  userClubId?: number | null;
  clubs?: any[];
}

type TabId = 'general' | 'individual' | 'top10' | 'crecimiento';

const ORDERED_POSITIONS = [
  'Portero',
  'Defensa Central',
  'Defensa Lateral',
  'Volante',
  'Delantero Extremo',
  'Centro Delantero',
  'Media Punta',
  'Sin definir'
];

const POSITION_ABBR: { [key: string]: string } = {
  'Portero': 'POR',
  'Defensa Central': 'DEF C',
  'Defensa Lateral': 'DEF L',
  'Volante': 'VOL',
  'Delantero Extremo': 'EXT',
  'Centro Delantero': 'CEN',
  'Media Punta': 'M P',
  'Sin definir': 'S/D',
};

const NutricionArea: React.FC<NutricionAreaProps> = ({ performanceRecords, players = [], initialTab = 'general', userRole, userClub, userClubId, clubs = [] }) => {
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [selectedCategory, setSelectedCategory] = useState<string>('TODAS');
  const [searchTerm, setSearchTerm] = useState('');
  
  // State para Selección Individual
  const [selectedIndividual, setSelectedIndividual] = useState<User | null>(null);

  // Memo for ALL selectable players (even without nutrition data)
  const allSelectablePlayers = useMemo(() => {
    let base = players.length > 0 ? players : performanceRecords.map(r => r.player);
    if (userRole === 'club' && userClub) {
      base = base.filter(p => (p.club || p.club_name) === userClub);
    }
    return base;
  }, [players, performanceRecords, userRole, userClub]);

  const [showReport, setShowReport] = useState(false);

  // State para Filtros Top 10
  const [selectedBirthYears, setSelectedBirthYears] = useState<string[]>(['TODOS']);
  const [selectedPositions, setSelectedPositions] = useState<string[]>(['TODAS']);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showPosDropdown, setShowPosDropdown] = useState(false);

  // State para Dashboard Comparativo (Grupo A vs Grupo B)
  const [groupAYear, setGroupAYear] = useState<string>('2008');
  const [groupAPosition, setGroupAPosition] = useState<string>('Defensa Central');
  const [groupBYear, setGroupBYear] = useState<string>('2009');
  const [groupBPosition, setGroupBPosition] = useState<string>('Defensa Central');

  // State para el Drawer de Nuevo Registro
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedAthleteForm, setSelectedAthleteForm] = useState<User | null>(null);
  const [playerSearchTerm, setPlayerSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    fecha_medicion: new Date().toISOString().split('T')[0],
    edad_cronologica: 0,
    masa_corporal_kg: 0,
    talla_cm: 0,
    talla_sentada_cm: 0,
    masa_muscular_kg: 0,
    masa_muscular_pct: 0,
    masa_adiposa_kg: 0,
    masa_adiposa_pct: 0,
    masa_osea_kg: 0,
    masa_osea_pct: 0,
    indice_imo: 0,
    indice_imc: 0,
    sum_pliegues_6_mm: 0,
    sum_pliegues_8_mm: 0,
    somatotipo_endo: 0,
    somatotipo_meso: 0,
    somatotipo_ecto: 0,
    somatotipo_eje_x: 0,
    somatotipo_eje_y: 0,
    maduracion_mirwald: 0,
    maduracion_moore: 0,
    maduracion_media: 0,
    phv_mirwald: 0,
    phv_moore: 0,
    phv_media: 0,
    cm_por_crecer_mirwald: 0,
    cm_por_crecer_moore: 0,
    cm_por_crecer_media: 0,
    estatura_proy_mirwald: 0,
    estatura_proy_moore_cm: 0,
    estatura_proy_media_cm: 0
  });

  const nutritionList = useMemo(() => {
    let base = performanceRecords.filter(r => r.nutrition && r.nutrition.length > 0);
    
    // Si es rol club, solo mostramos sus propios jugadores en las listas
    if (userRole === 'club') {
      if (userClubId) {
        base = base.filter(r => r.player.id_club === userClubId);
      } else if (userClub) {
        base = base.filter(r => {
          const pClub = r.player.club || r.player.club_name;
          return pClub === userClub;
        });
      }
    }

    return base.map(r => ({
        player: r.player,
        data: r.nutrition![0], // El más reciente para tablas generales
        history: r.nutrition || [] // Todos los registros para individual
      }));
  }, [performanceRecords, userRole, userClub]);

  // Función para obtener IMO real (Calculado si es 0)
  const getIMORal = (data: NutritionData) => {
    if (data.indice_imo && Number(data.indice_imo) > 0) return Number(data.indice_imo);
    if (data.masa_muscular_kg && data.masa_osea_kg && Number(data.masa_osea_kg) > 0) {
      return Number(data.masa_muscular_kg) / Number(data.masa_osea_kg);
    }
    return 0;
  };

  // --- LÓGICA DASHBOARD COMPARATIVO ---

  // 1. Obtener última fecha de evaluación global
  const latestEvaluationInfo = useMemo(() => {
    if (nutritionList.length === 0) return { date: 'N/A', count: 0 };
    
    // Ordenar por fecha descendente
    const allDates = nutritionList.map(n => n.data.fecha_medicion).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    const latestDate = allDates[0];
    
    // Contar cuántos tienen esa fecha
    const count = nutritionList.filter(n => n.data.fecha_medicion === latestDate).length;
    
    return { 
      date: new Date(latestDate).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }), 
      count 
    };
  }, [nutritionList]);

  // 2. Filtrar Grupos A y B
  const getGroupStats = (year: string, position: string) => {
    const group = nutritionList.filter(item => {
      const matchYear = year === 'TODOS' || (item.player.anio && item.player.anio.toString() === year);
      const matchPos = position === 'TODAS' || item.player.position === position;
      return matchYear && matchPos;
    });

    const count = group.length;
    if (count === 0) return null;

    // Calcular promedios
    const avg = (field: keyof NutritionData) => {
      const sum = group.reduce((acc, curr) => acc + (Number(curr.data[field]) || 0), 0);
      return sum / count;
    };

    // Calcular IMO promedio (calculado individualmente y luego promediado)
    const avgIMO = group.reduce((acc, curr) => acc + getIMORal(curr.data), 0) / count;

    return {
      count,
      masa_muscular_pct: avg('masa_muscular_pct'),
      masa_adiposa_pct: avg('masa_adiposa_pct'),
      sum_pliegues_6_mm: avg('sum_pliegues_6_mm'),
      indice_imo: avgIMO,
      masa_corporal_kg: avg('masa_corporal_kg'),
      talla_cm: avg('talla_cm')
    };
  };

  const statsA = useMemo(() => getGroupStats(groupAYear, groupAPosition), [nutritionList, groupAYear, groupAPosition]);
  const statsB = useMemo(() => getGroupStats(groupBYear, groupBPosition), [nutritionList, groupBYear, groupBPosition]);

  // 3. Preparar Datos para Radar Chart
  const radarData = useMemo(() => {
    return [
      { subject: 'Masa Muscular %', A: statsA?.masa_muscular_pct || 0, B: statsB?.masa_muscular_pct || 0, fullMark: 60 },
      { subject: 'Masa Adiposa %', A: statsA?.masa_adiposa_pct || 0, B: statsB?.masa_adiposa_pct || 0, fullMark: 30 }, // Invertir lógica visualmente podría ser complejo, mantenemos valor real
      { subject: 'IMO', A: (statsA?.indice_imo || 0) * 10, B: (statsB?.indice_imo || 0) * 10, fullMark: 60 }, // Escalado x10 para que se vea en el gráfico
      { subject: '∑ 6 Pliegues', A: statsA?.sum_pliegues_6_mm || 0, B: statsB?.sum_pliegues_6_mm || 0, fullMark: 100 },
    ];
  }, [statsA, statsB]);


  // 3. TOP 10 DATA (Filtrado)
  const top10Data = useMemo(() => {
    let filtered = [...nutritionList];

    // Filtro por Año de Nacimiento (Usando columna 'anio')
    if (!selectedBirthYears.includes('TODOS')) {
      filtered = filtered.filter(item => {
        if (!item.player.anio) return false;
        return selectedBirthYears.includes(item.player.anio.toString());
      });
    }

    // Filtro por Posición
    if (!selectedPositions.includes('TODAS')) {
      filtered = filtered.filter(item => selectedPositions.includes(item.player.position));
    }

    return filtered;
  }, [nutritionList, selectedBirthYears, selectedPositions]);

  // Rankings (Filtrados)
  const top10MuscleKg = useMemo(() => [...top10Data].sort((a, b) => Number(b.data.masa_muscular_kg || 0) - Number(a.data.masa_muscular_kg || 0)).slice(0, 10), [top10Data]);
  const top10MusclePct = useMemo(() => [...top10Data].sort((a, b) => Number(b.data.masa_muscular_pct || 0) - Number(a.data.masa_muscular_pct || 0)).slice(0, 10), [top10Data]);
  const top10AdiposePct = useMemo(() => [...top10Data].sort((a, b) => Number(a.data.masa_adiposa_pct || 0) - Number(b.data.masa_adiposa_pct || 0)).slice(0, 10), [top10Data]);
  const top10Pliegues6 = useMemo(() => [...top10Data].sort((a, b) => Number(a.data.sum_pliegues_6_mm || 0) - Number(b.data.sum_pliegues_6_mm || 0)).slice(0, 10), [top10Data]);

  // Obtener años de nacimiento únicos para el filtro (Usando columna 'anio')
  const availableBirthYears = useMemo(() => {
    const years = new Set<string>();
    performanceRecords.forEach(record => {
      if (record.player.anio) {
        years.add(record.player.anio.toString());
      }
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [performanceRecords]);

  // Obtener posiciones únicas para el filtro
  const availablePositions = useMemo(() => {
    const positions = new Set<string>();
    performanceRecords.forEach(record => {
      if (record.player.position) {
        positions.add(record.player.position);
      }
    });
    return Array.from(positions).sort();
  }, [performanceRecords]);

  const handleSaveNutrition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAthleteForm) return alert("Selecciona un atleta primero.");
    
    setLoading(true);
    try {
      // Cálculo automático de IMO si el usuario no lo ingresó
      let finalIMO = formData.indice_imo;
      if (finalIMO === 0 && formData.masa_muscular_kg > 0 && formData.masa_osea_kg > 0) {
        finalIMO = formData.masa_muscular_kg / formData.masa_osea_kg;
      }

      const payload = {
        player_id: selectedAthleteForm.player_id,
        nombre_raw: selectedAthleteForm.name,
        ...formData,
        indice_imo: finalIMO
      };

      const { error } = await supabase.from('antropometria').upsert([payload], { onConflict: 'player_id,fecha_medicion' });
      if (error) throw error;

      alert("Ficha antropométrica sincronizada.");
      setIsDrawerOpen(false);
      setSelectedAthleteForm(null);
      window.location.reload(); 
    } catch (err: any) {
      alert("Error al guardar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAthleteForm = (p: User) => {
    setSelectedAthleteForm(p);
    setPlayerSearchTerm('');
  };

  const individualRecord = useMemo(() => {
    if (!selectedIndividual) return null;
    return nutritionList.find(n => {
      const nId = n.player.player_id?.toString();
      const sId = selectedIndividual.player_id?.toString();
      return nId && sId && nId === sId;
    });
  }, [selectedIndividual, nutritionList]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 md:p-8 rounded-[32px] md:rounded-[40px] border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tighter italic flex items-center gap-2">
            Nutrición & <span className="text-red-500">Antropometría</span>
          </h2>
          <p className="text-slate-500 text-[10px] md:text-sm font-medium">Departamento de Rendimiento • Federación de Fútbol de Chile</p>
        </div>
        <div className="flex gap-2 md:gap-3 items-center">
          <button 
            onClick={() => window.location.reload()} 
            className="w-10 h-10 md:w-12 md:h-12 bg-slate-50 border border-slate-100 rounded-xl md:rounded-2xl flex items-center justify-center text-slate-400 hover:text-red-600 transition-all shadow-sm"
            title="Recargar Datos"
          >
            <i className="fa-solid fa-rotate text-sm md:text-base"></i>
          </button>
          {userRole !== 'club' && (
            <button onClick={() => setIsDrawerOpen(true)} className="flex-1 md:flex-none bg-[#0b1220] text-white px-4 md:px-8 py-3 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-xl">
              <i className="fa-solid fa-plus"></i> Ingreso Manual ISAK
            </button>
          )}
        </div>
      </div>

      {/* Tabs Sub-Menu */}
      <div className="bg-white/50 p-1.5 rounded-[24px] border border-slate-100 flex items-center gap-2 max-w-fit shadow-sm overflow-x-auto">
        {[
          { id: 'general', label: 'Dashboard Comparativo', icon: 'fa-chart-pie' },
          { id: 'individual', label: 'Reporte Individual', icon: 'fa-user-tag' },
          { id: 'top10', label: 'Top 10 Rankings', icon: 'fa-trophy' },
          { id: 'crecimiento', label: 'Crecimiento & Maduración', icon: 'fa-dna' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabId)}
            className={`flex items-center gap-3 px-6 py-3.5 rounded-[20px] text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
              activeTab === tab.id ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <i className={`fa-solid ${tab.icon}`}></i>
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. DASHBOARD COMPARATIVO (Antigua Tabla General) */}
      {activeTab === 'general' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          
          {/* Tarjeta Informativa: Última Evaluación */}
          <div className="bg-[#0b1220] rounded-[32px] md:rounded-[40px] p-6 md:p-8 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
             <div className="absolute top-0 right-0 w-48 h-48 md:w-64 md:h-64 bg-red-600/20 rounded-full blur-3xl -mr-12 md:-mr-16 -mt-12 md:-mt-16 pointer-events-none"></div>
             
             <div className="relative z-10 flex items-center gap-4 md:gap-6">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-white/10 rounded-xl md:rounded-2xl flex items-center justify-center text-2xl md:text-3xl">
                  <i className="fa-solid fa-calendar-check text-red-500"></i>
                </div>
                <div>
                  <h3 className="text-2xl md:text-3xl font-black italic tracking-tighter leading-none mb-1">Última Evaluación</h3>
                  <p className="text-white/50 text-[10px] md:text-xs font-bold uppercase tracking-widest">Fecha de registro más reciente</p>
                </div>
             </div>

             <div className="relative z-10 text-center md:text-right">
                <p className="text-3xl md:text-4xl font-black italic tracking-tighter text-white mb-1">{latestEvaluationInfo.date}</p>
                <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                  <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-white/80">{latestEvaluationInfo.count} Atletas Evaluados</span>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* CONTROLES DE FILTRO (Columna Izquierda) */}
            <div className="space-y-6">
              
              {/* Grupo A (Azul) */}
              <div className="bg-white p-6 rounded-[32px] border border-blue-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50 rounded-bl-[32px] -mr-4 -mt-4"></div>
                <h4 className="text-blue-600 text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2 relative z-10">
                  <span className="w-3 h-3 bg-blue-500 rounded-full"></span> Grupo A (Azul)
                </h4>
                
                <div className="space-y-4 relative z-10">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">Año Nacimiento</label>
                    <select 
                      value={groupAYear} 
                      onChange={e => setGroupAYear(e.target.value)}
                      className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-black text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="TODOS">Todos</option>
                      {availableBirthYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">Posición</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <button
                        onClick={() => setGroupAPosition('TODAS')}
                        className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-tighter transition-all ${
                          groupAPosition === 'TODAS' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                        }`}
                      >
                        Todas
                      </button>
                      {ORDERED_POSITIONS.map(p => (
                        <button
                          key={p}
                          onClick={() => setGroupAPosition(p)}
                          className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-tighter transition-all ${
                            groupAPosition === p ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                          }`}
                          title={p}
                        >
                          {POSITION_ABBR[p] || p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Stats Resumen A */}
                {statsA && (
                  <div className="mt-6 pt-6 border-t border-slate-50 grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Peso Prom.</p>
                      <p className="text-lg font-black text-blue-600 italic">{statsA.masa_corporal_kg.toFixed(1)}<span className="text-[9px] text-slate-400">kg</span></p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Talla Prom.</p>
                      <p className="text-lg font-black text-blue-600 italic">{statsA.talla_cm.toFixed(0)}<span className="text-[9px] text-slate-400">cm</span></p>
                    </div>
                    <div className="col-span-2 text-center bg-blue-50 rounded-xl py-2">
                       <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Muestra: N={statsA.count}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Grupo B (Rojo) */}
              <div className="bg-white p-6 rounded-[32px] border border-red-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-red-50 rounded-bl-[32px] -mr-4 -mt-4"></div>
                <h4 className="text-red-600 text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2 relative z-10">
                  <span className="w-3 h-3 bg-red-500 rounded-full"></span> Grupo B (Rojo)
                </h4>
                
                <div className="space-y-4 relative z-10">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">Año Nacimiento</label>
                    <select 
                      value={groupBYear} 
                      onChange={e => setGroupBYear(e.target.value)}
                      className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-black text-slate-700 outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="TODOS">Todos</option>
                      {availableBirthYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">Posición</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <button
                        onClick={() => setGroupBPosition('TODAS')}
                        className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-tighter transition-all ${
                          groupBPosition === 'TODAS' ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                        }`}
                      >
                        Todas
                      </button>
                      {ORDERED_POSITIONS.map(p => (
                        <button
                          key={p}
                          onClick={() => setGroupBPosition(p)}
                          className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-tighter transition-all ${
                            groupBPosition === p ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                          }`}
                          title={p}
                        >
                          {POSITION_ABBR[p] || p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Stats Resumen B */}
                {statsB && (
                  <div className="mt-6 pt-6 border-t border-slate-50 grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Peso Prom.</p>
                      <p className="text-lg font-black text-red-600 italic">{statsB.masa_corporal_kg.toFixed(1)}<span className="text-[9px] text-slate-400">kg</span></p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Talla Prom.</p>
                      <p className="text-lg font-black text-red-600 italic">{statsB.talla_cm.toFixed(0)}<span className="text-[9px] text-slate-400">cm</span></p>
                    </div>
                    <div className="col-span-2 text-center bg-red-50 rounded-xl py-2">
                       <p className="text-[9px] font-black text-red-400 uppercase tracking-widest">Muestra: N={statsB.count}</p>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* GRÁFICO RADAR (Columna Derecha - Ocupa 2 espacios) */}
            <div className="lg:col-span-2 bg-white rounded-[32px] md:rounded-[40px] border border-slate-100 shadow-xl p-6 md:p-8 flex flex-col">
               <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 md:mb-4">
                 <div>
                   <h3 className="text-lg md:text-xl font-black text-slate-900 uppercase italic tracking-tighter">Comparativa Antropométrica</h3>
                   <p className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-widest">Análisis de Perfiles Promedio</p>
                 </div>
                 <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 md:w-3 md:h-3 bg-blue-500 rounded-full"></span>
                      <span className="text-[9px] md:text-[10px] font-black uppercase text-slate-500">Grupo A</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 md:w-3 md:h-3 bg-red-500 rounded-full"></span>
                      <span className="text-[9px] md:text-[10px] font-black uppercase text-slate-500">Grupo B</span>
                    </div>
                 </div>
               </div>

               <div className="flex-1 min-h-[300px] md:min-h-[400px] w-full relative">
                 {(!statsA && !statsB) ? (
                   <div className="absolute inset-0 flex items-center justify-center text-slate-300 font-black uppercase tracking-widest text-sm">
                     Selecciona filtros para visualizar datos
                   </div>
                 ) : (
                   <ResponsiveContainer width="100%" height="100%">
                     <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                       <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                       <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }} />
                       <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                       <Radar
                         name="Grupo A"
                         dataKey="A"
                         stroke="#3b82f6"
                         strokeWidth={3}
                         fill="#3b82f6"
                         fillOpacity={0.3}
                       />
                       <Radar
                         name="Grupo B"
                         dataKey="B"
                         stroke="#ef4444"
                         strokeWidth={3}
                         fill="#ef4444"
                         fillOpacity={0.3}
                       />
                       <Tooltip 
                         contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                         itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                         formatter={(value: number, name: string, props: any) => {
                            // Si es IMO, dividimos por 10 para mostrar el valor real en el tooltip
                            if (props.payload.subject === 'IMO') return [(value / 10).toFixed(2), name];
                            return [Number(value).toFixed(1), name];
                         }}
                       />
                     </RadarChart>
                   </ResponsiveContainer>
                 )}
               </div>
               
               <div className="mt-4 text-center">
                 <p className="text-[9px] text-slate-400 italic">* El valor de IMO en el gráfico está escalado (x10) para visualización.</p>
               </div>
            </div>

          </div>
        </div>
      )}

      {/* 2. TABLA INDIVIDUAL (REPORTE) */}
      {activeTab === 'individual' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="bg-white p-6 md:p-8 rounded-[32px] md:rounded-[40px] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 md:gap-6 items-center">
            <div className="flex-1 w-full relative">
              <i className="fa-solid fa-magnifying-glass absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 text-xs md:text-base"></i>
              <input 
                type="text" 
                placeholder="Buscar atleta para reporte individual..." 
                className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl px-12 md:px-14 py-3 md:py-4 text-[11px] md:text-sm font-black outline-none focus:ring-2 focus:ring-red-500"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              {searchTerm.length > 0 && !selectedIndividual && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden max-h-60 overflow-y-auto">
                   {performanceRecords
                    .filter(r => {
                      // Filtro por club si es necesario
                      if (userRole === 'club' && userClub) {
                        const pClub = r.player.club || r.player.club_name;
                        if (pClub !== userClub) return false;
                      }
                      
                      return r.player.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             r.player.player_id?.toString().includes(searchTerm);
                    })
                    .map(r => (
                      <button key={r.player.id} onClick={() => { setSelectedIndividual(r.player); setSearchTerm(''); }} className="w-full p-4 hover:bg-red-50 text-left border-b border-slate-50 flex items-center justify-between group">
                        <div>
                          <p className="text-xs font-black uppercase italic group-hover:text-red-600">{r.player.name}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">{r.nutrition && r.nutrition.length > 0 ? `${r.nutrition.length} registros` : 'Sin registros'}</p>
                        </div>
                        <i className="fa-solid fa-chevron-right text-slate-200 group-hover:text-red-500 transition-all"></i>
                      </button>
                    ))}
                </div>
              )}
            </div>
            {selectedIndividual && (
              <button onClick={() => setSelectedIndividual(null)} className="bg-slate-100 text-slate-400 px-6 py-4 rounded-2xl text-[10px] font-black uppercase hover:bg-slate-200">
                Cambiar Atleta
              </button>
            )}
          </div>

          {selectedIndividual && individualRecord ? (
            <NutritionReport 
              data={individualRecord.data} 
              history={individualRecord.history}
              player={selectedIndividual} 
              onClose={() => setSelectedIndividual(null)} 
              clubs={clubs}
            />
          ) : selectedIndividual ? (
            <div className="py-24 bg-white rounded-[48px] border border-slate-100 shadow-sm text-center">
               <i className="fa-solid fa-hourglass-start text-slate-100 text-6xl mb-6"></i>
               <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest italic mb-4">Sin registros históricos para este atleta.</p>
               <button onClick={() => setSelectedIndividual(null)} className="text-red-600 font-black uppercase text-[10px] tracking-widest hover:underline">Volver a la búsqueda</button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between px-8">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic">Atletas con Reportes Disponibles</h3>
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{nutritionList.length} Atletas</span>
              </div>
              
              {allSelectablePlayers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allSelectablePlayers.slice(0, 50).map((player, i) => (
                    <button 
                      key={i} 
                      onClick={() => setSelectedIndividual(player)}
                      className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all text-left flex items-center gap-4 group"
                    >
                      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 font-black italic text-lg group-hover:bg-[#0b1220] group-hover:text-white transition-all">
                        {player.name?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black uppercase text-slate-900 italic truncate">{player.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{player.club || 'S/C'}</span>
                        </div>
                      </div>
                      <i className="fa-solid fa-chevron-right text-slate-100 group-hover:text-red-500 transition-all"></i>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-32 bg-slate-900 rounded-[56px] text-center shadow-2xl relative overflow-hidden group">
                   <div className="absolute inset-0 bg-gradient-to-br from-red-600/5 to-transparent"></div>
                   <div className="relative z-10">
                     <h3 className="text-white text-3xl font-black uppercase italic tracking-tighter mb-4 leading-none">ANALISTA INDIVIDUAL <span className="text-red-500">PRO</span></h3>
                     <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em]">Use el buscador superior para seleccionar un perfil</p>
                   </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. TOP 10 RANKINGS */}
      {activeTab === 'top10' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          
          {/* FILTERS BAR */}
          <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-wrap gap-6 items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                <i className="fa-solid fa-filter"></i>
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Filtros de Ranking</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Personaliza la vista del Top 10</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              {/* Year Filter */}
              <div className="relative">
                <button 
                  onClick={() => setShowYearDropdown(!showYearDropdown)}
                  className="bg-slate-50 border border-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-xl py-3 pl-4 pr-10 focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer min-w-[180px] text-left flex justify-between items-center"
                >
                  <span className="truncate">
                    {selectedBirthYears.includes('TODOS') ? 'TODAS LAS CATEGORÍAS' : `CATEGORÍAS: ${selectedBirthYears.join(', ')}`}
                  </span>
                  <i className={`fa-solid fa-chevron-down text-slate-400 text-[10px] transition-transform ${showYearDropdown ? 'rotate-180' : ''}`}></i>
                </button>
                
                {showYearDropdown && (
                  <div className="absolute top-full left-0 mt-2 w-full min-w-[200px] bg-white rounded-xl shadow-xl border border-slate-100 z-50 max-h-60 overflow-y-auto p-1">
                    <button
                      onClick={() => {
                        setSelectedBirthYears(['TODOS']);
                        setShowYearDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-xs font-bold uppercase hover:bg-slate-50 rounded-lg flex justify-between items-center ${selectedBirthYears.includes('TODOS') ? 'text-red-600 bg-red-50' : 'text-slate-600'}`}
                    >
                      TODAS LAS CATEGORÍAS
                      {selectedBirthYears.includes('TODOS') && <i className="fa-solid fa-check"></i>}
                    </button>
                    {availableBirthYears.map(year => {
                      const isSelected = selectedBirthYears.includes(year);
                      return (
                        <button
                          key={year}
                          onClick={() => {
                            setSelectedBirthYears(prev => {
                              if (year === 'TODOS') return ['TODOS'];
                              const newSelection = prev.includes('TODOS') ? [] : [...prev];
                              
                              if (newSelection.includes(year)) {
                                const filtered = newSelection.filter(y => y !== year);
                                return filtered.length === 0 ? ['TODOS'] : filtered;
                              } else {
                                return [...newSelection, year];
                              }
                            });
                          }}
                          className={`w-full text-left px-4 py-2 text-xs font-bold uppercase hover:bg-slate-50 rounded-lg flex justify-between items-center ${isSelected ? 'text-red-600 bg-red-50' : 'text-slate-600'}`}
                        >
                          CATEGORÍA {year}
                          {isSelected && <i className="fa-solid fa-check"></i>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Position Filter */}
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">Filtrar por Posición</label>
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => {
                      setSelectedPositions(['TODAS']);
                    }}
                    className={`px-2 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-tighter transition-all ${
                      selectedPositions.includes('TODAS') ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    Todas
                  </button>
                  {ORDERED_POSITIONS.map(pos => {
                    const isSelected = selectedPositions.includes(pos);
                    return (
                      <button
                        key={pos}
                        onClick={() => {
                          setSelectedPositions(prev => {
                            if (pos === 'TODAS') return ['TODAS'];
                            const newSelection = prev.includes('TODAS') ? [] : [...prev];
                            
                            if (newSelection.includes(pos)) {
                              const filtered = newSelection.filter(p => p !== pos);
                              return filtered.length === 0 ? ['TODAS'] : filtered;
                            } else {
                              return [...newSelection, pos];
                            }
                          });
                        }}
                        className={`px-2 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-tighter transition-all ${
                          isSelected ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                        }`}
                        title={pos}
                      >
                        {POSITION_ABBR[pos] || pos}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 animate-in fade-in duration-500">
            <RankingCard title="Masa Muscular (kg)" data={top10MuscleKg} field="masa_muscular_kg" unit="kg" color="red" icon="fa-weight-hanging" clubs={clubs} />
            <RankingCard title="Masa Muscular (%)" data={top10MusclePct} field="masa_muscular_pct" unit="%" color="blue" icon="fa-dumbbell" clubs={clubs} />
            <RankingCard title="Masa Adiposa (%)" data={top10AdiposePct} field="masa_adiposa_pct" unit="%" color="emerald" icon="fa-droplet-slash" inverted clubs={clubs} />
            <RankingCard title="6 Pliegues (mm)" data={top10Pliegues6} field="sum_pliegues_6_mm" unit="mm" color="amber" icon="fa-ruler-horizontal" inverted clubs={clubs} />
          </div>
        </div>
      )}

      {/* DRAWER: NUEVO REGISTRO */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-end animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-[#0b1220]/60 backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)}></div>
          <div className="relative w-full max-w-2xl h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 transform-gpu">
            <div className="bg-[#CF1B2B] p-10 text-white relative">
              <button onClick={() => setIsDrawerOpen(false)} className="absolute top-10 right-10 text-white/30 hover:text-white transition-colors">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
              <h3 className="text-2xl font-black uppercase italic tracking-tighter leading-none mb-1">FICHA ANTROPOMÉTRICA</h3>
              <p className="text-white/70 text-[10px] font-black uppercase tracking-[0.3em]">Protocolo Oficial ISAK • LR Performance</p>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
              {!selectedAthleteForm ? (
                <section className="space-y-6">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Seleccionar Atleta</h4>
                  <div className="relative">
                    <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
                    <input 
                      type="text" placeholder="Buscar jugador..." 
                      className="w-full bg-slate-50 border-none rounded-2xl px-12 py-4 text-sm font-bold shadow-inner outline-none focus:ring-2 focus:ring-red-500"
                      value={playerSearchTerm}
                      onChange={e => setPlayerSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto p-1">
                    {performanceRecords
                      .filter(r => r.player.name.toLowerCase().includes(playerSearchTerm.toLowerCase()))
                      .map(r => (
                        <button key={r.player.id} onClick={() => handleSelectAthleteForm(r.player)} className="p-4 bg-slate-50 hover:bg-red-50 rounded-2xl text-left transition-all border border-transparent hover:border-red-100 group">
                          <p className="text-xs font-black uppercase italic text-slate-900 group-hover:text-red-600 transition-colors">{r.player.name}</p>
                          <div className="flex items-center gap-1">
                            <ClubBadge clubName={r.player.club || r.player.club_name} clubs={clubs} logoSize="w-2.5 h-2.5" className="text-[9px] font-bold text-slate-400 uppercase" />
                            <span className="text-slate-300">|</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">{r.player.position}</span>
                          </div>
                        </button>
                      ))}
                  </div>
                </section>
              ) : (
                <div className="bg-[#0b1220] p-6 rounded-[32px] flex items-center justify-between shadow-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center text-white font-black italic text-lg shadow-lg">{selectedAthleteForm.name?.charAt(0)}</div>
                    <div>
                      <p className="text-white text-sm font-black uppercase italic leading-none">{selectedAthleteForm.name}</p>
                      <ClubBadge clubName={selectedAthleteForm.club} clubs={clubs} logoSize="w-3 h-3" className="text-red-500 text-[9px] font-black uppercase tracking-widest mt-1" />
                    </div>
                  </div>
                  <button onClick={() => setSelectedAthleteForm(null)} className="text-white/20 hover:text-white transition-colors p-2"><i className="fa-solid fa-rotate-left"></i></button>
                </div>
              )}

              {selectedAthleteForm && (
                <form onSubmit={handleSaveNutrition} className="space-y-8 animate-in fade-in duration-300">
                  <div className="grid grid-cols-2 gap-4">
                    <InputGroup label="Fecha Medición" type="date" value={formData.fecha_medicion} onChange={v => setFormData({...formData, fecha_medicion: v})} />
                    <InputGroup label="Edad Cronol." type="number" value={formData.edad_cronologica} onChange={v => setFormData({...formData, edad_cronologica: Number(v)})} />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <InputGroup label="Masa Corp (kg)" type="number" value={formData.masa_corporal_kg} onChange={v => setFormData({...formData, masa_corporal_kg: Number(v)})} />
                    <InputGroup label="Talla (cm)" type="number" value={formData.talla_cm} onChange={v => setFormData({...formData, talla_cm: Number(v)})} />
                    <InputGroup label="Talla Sent (cm)" type="number" value={formData.talla_sentada_cm} onChange={v => setFormData({...formData, talla_sentada_cm: Number(v)})} />
                  </div>

                  <div className="space-y-4">
                    <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-1 italic">Fraccionamiento Masas</h5>
                    <div className="grid grid-cols-2 gap-4">
                      <InputGroup label="Masa Musc (kg)" type="number" value={formData.masa_muscular_kg} onChange={v => setFormData({...formData, masa_muscular_kg: Number(v)})} />
                      <InputGroup label="Masa Musc %" type="number" value={formData.masa_muscular_pct} onChange={v => setFormData({...formData, masa_muscular_pct: Number(v)})} />
                      <InputGroup label="Masa Adip (kg)" type="number" value={formData.masa_adiposa_kg} onChange={v => setFormData({...formData, masa_adiposa_kg: Number(v)})} />
                      <InputGroup label="Masa Adip %" type="number" value={formData.masa_adiposa_pct} onChange={v => setFormData({...formData, masa_adiposa_pct: Number(v)})} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-1 italic">Somatotipo e Índices</h5>
                    <div className="grid grid-cols-3 gap-4">
                      <InputGroup label="Endomorfía" type="number" value={formData.somatotipo_endo} onChange={v => setFormData({...formData, somatotipo_endo: Number(v)})} />
                      <InputGroup label="Mesomorfía" type="number" value={formData.somatotipo_meso} onChange={v => setFormData({...formData, somatotipo_meso: Number(v)})} />
                      <InputGroup label="Ectomorfía" type="number" value={formData.somatotipo_ecto} onChange={v => setFormData({...formData, somatotipo_ecto: Number(v)})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <InputGroup label="Somatotipo Eje X" type="number" value={formData.somatotipo_eje_x} onChange={v => setFormData({...formData, somatotipo_eje_x: Number(v)})} />
                      <InputGroup label="Somatotipo Eje Y" type="number" value={formData.somatotipo_eje_y} onChange={v => setFormData({...formData, somatotipo_eje_y: Number(v)})} />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <InputGroup label="IMO" type="number" value={formData.indice_imo} onChange={v => setFormData({...formData, indice_imo: Number(v)})} />
                      <InputGroup label="IMC" type="number" value={formData.indice_imc} onChange={v => setFormData({...formData, indice_imc: Number(v)})} />
                      <InputGroup label="∑ 6 Pliegues" type="number" value={formData.sum_pliegues_6_mm} onChange={v => setFormData({...formData, sum_pliegues_6_mm: Number(v)})} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-1 italic">Maduración y Proyección (Medias)</h5>
                    <div className="grid grid-cols-3 gap-4">
                      <InputGroup label="Maduración (Años)" type="number" value={formData.maduracion_media} onChange={v => setFormData({...formData, maduracion_media: Number(v)})} />
                      <InputGroup label="PHV (Años)" type="number" value={formData.phv_media} onChange={v => setFormData({...formData, phv_media: Number(v)})} />
                      <InputGroup label="Estatura Proy (cm)" type="number" value={formData.estatura_proy_media_cm} onChange={v => setFormData({...formData, estatura_proy_media_cm: Number(v)})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <InputGroup label="CM por Crecer" type="number" value={formData.cm_por_crecer_media} onChange={v => setFormData({...formData, cm_por_crecer_media: Number(v)})} />
                    </div>
                  </div>

                  <button type="submit" disabled={loading} className="w-full py-5 bg-[#0b1220] text-white rounded-[24px] text-xs font-black uppercase tracking-widest shadow-2xl hover:bg-red-600 transition-all flex items-center justify-center gap-3 active:scale-95 transform-gpu">
                    {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-cloud-arrow-up"></i>}
                    SINCRONIZAR EVALUACIÓN
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. CRECIMIENTO & MADURACIÓN */}
      {activeTab === 'crecimiento' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Filtros Multi-Selección */}
          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-wrap items-end gap-6">
            <div className="relative">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block italic">Año de Nacimiento</label>
              <button 
                onClick={() => setShowYearDropdown(!showYearDropdown)}
                className="bg-slate-50 px-6 py-3 rounded-2xl text-xs font-black text-slate-700 flex items-center gap-3 border border-slate-100 hover:bg-slate-100 transition-all min-w-[200px] justify-between"
              >
                {selectedBirthYears.includes('TODOS') ? 'Todos los Años' : `${selectedBirthYears.length} Seleccionados`}
                <i className={`fa-solid fa-chevron-down transition-transform ${showYearDropdown ? 'rotate-180' : ''}`}></i>
              </button>
              {showYearDropdown && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-3xl shadow-2xl border border-slate-100 p-4 z-50 grid grid-cols-2 gap-2 animate-in fade-in zoom-in duration-200">
                  <button 
                    onClick={() => setSelectedBirthYears(['TODOS'])}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedBirthYears.includes('TODOS') ? 'bg-red-600 text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                  >
                    Todos
                  </button>
                  {availableBirthYears.map(year => (
                    <button 
                      key={year}
                      onClick={() => {
                        const newYears = selectedBirthYears.includes('TODOS') ? [year] : 
                                       selectedBirthYears.includes(year) ? selectedBirthYears.filter(y => y !== year) : [...selectedBirthYears, year];
                        setSelectedBirthYears(newYears.length === 0 ? ['TODOS'] : newYears);
                      }}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedBirthYears.includes(year) ? 'bg-red-600 text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block italic">Posición</label>
              <button 
                onClick={() => setShowPosDropdown(!showPosDropdown)}
                className="bg-slate-50 px-6 py-3 rounded-2xl text-xs font-black text-slate-700 flex items-center gap-3 border border-slate-100 hover:bg-slate-100 transition-all min-w-[200px] justify-between"
              >
                {selectedPositions.includes('TODAS') ? 'Todas las Posiciones' : `${selectedPositions.length} Seleccionadas`}
                <i className={`fa-solid fa-chevron-down transition-transform ${showPosDropdown ? 'rotate-180' : ''}`}></i>
              </button>
              {showPosDropdown && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-3xl shadow-2xl border border-slate-100 p-4 z-50 flex flex-col gap-1 animate-in fade-in zoom-in duration-200">
                  <button 
                    onClick={() => setSelectedPositions(['TODAS'])}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-left ${selectedPositions.includes('TODAS') ? 'bg-red-600 text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                  >
                    Todas
                  </button>
                  {availablePositions.map(pos => (
                    <button 
                      key={pos}
                      onClick={() => {
                        const newPos = selectedPositions.includes('TODAS') ? [pos] : 
                                     selectedPositions.includes(pos) ? selectedPositions.filter(p => p !== pos) : [...selectedPositions, pos];
                        setSelectedPositions(newPos.length === 0 ? ['TODAS'] : newPos);
                      }}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-left ${selectedPositions.includes(pos) ? 'bg-red-600 text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Agrupación por PHV */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* PRE-PHV */}
            <GrowthGroup 
              title="PRE-PHV" 
              subtitle="Fase de crecimiento lento"
              color="blue"
              icon="fa-seedling"
              data={top10Data.filter(item => (item.data.maduracion_media || 0) < -0.5)}
            />

            {/* CIRCA-PHV */}
            <GrowthGroup 
              title="CIRCA-PHV" 
              subtitle="Pico de crecimiento (Crítico)"
              color="amber"
              icon="fa-bolt"
              data={top10Data.filter(item => (item.data.maduracion_media || 0) >= -0.5 && (item.data.maduracion_media || 0) <= 0.5)}
            />

            {/* POST-PHV */}
            <GrowthGroup 
              title="POST-PHV" 
              subtitle="Crecimiento finalizado"
              color="emerald"
              icon="fa-tree"
              data={top10Data.filter(item => (item.data.maduracion_media || 0) > 0.5)}
            />
          </div>
        </div>
      )}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
      {/* DEBUG INFO & TOOLS */}
      <div className="mt-20 p-8 bg-slate-100 rounded-[32px] flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
          Debug: {performanceRecords.length} atletas en sistema | {nutritionList.length} con reportes nutricionales
        </div>
        <button 
          onClick={() => console.log('DEBUG DATA:', { performanceRecords, nutritionList })}
          className="bg-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-red-600 transition-colors border border-slate-200 shadow-sm"
        >
          Inspeccionar Datos (Consola)
        </button>
      </div>
    </div>
  );
};

function MetricRow({ label, value, sub, color }: { label: string, value: string | number, sub: string, color: string }) {
  return (
    <div className="flex items-center justify-between group transition-colors hover:bg-slate-50 p-2 rounded-xl">
       <div>
         <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{label}</p>
         <p className="text-[9px] font-bold text-slate-400 uppercase italic opacity-60">{sub}</p>
       </div>
       <span className={`text-xl font-black italic tracking-tighter ${color}`}>{value}</span>
    </div>
  );
}

function DetailRow({ label, value }: { label: string, value: string | number }) {
  return (
    <div className="flex justify-between items-center border-b border-slate-50 pb-2">
      <span className="text-[10px] font-bold text-slate-500 uppercase italic">{label}</span>
      <span className="text-xs font-black text-slate-900 uppercase italic">{value}</span>
    </div>
  );
}

function InputGroup({ label, type, value, onChange }: { label: string, type: string, value: any, onChange: (v: any) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-2 italic">{label}</label>
      <input 
        type={type} 
        value={value || ''} 
        onChange={e => onChange(e.target.value)} 
        step="0.01"
        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-black outline-none focus:ring-2 focus:ring-red-500 shadow-inner" 
      />
    </div>
  );
}

function RankingCard({ title, data, field, unit, color, icon, clubs, inverted = false }: { title: string, data: any[], field: string, unit: string, color: string, icon: string, clubs: any[], inverted?: boolean }) {
  const colorMap: Record<string, string> = {
    red: 'bg-red-600 text-red-600',
    blue: 'bg-blue-600 text-blue-600',
    emerald: 'bg-emerald-600 text-emerald-600',
    amber: 'bg-amber-600 text-amber-600'
  };

  return (
    <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-fit transform-gpu transition-all hover:shadow-xl">
      <div className={`p-8 ${colorMap[color].split(' ')[0]} text-white relative`}>
        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10 blur-xl"></div>
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-2 relative z-10 italic">
          <i className={`fa-solid ${icon}`}></i> {title}
        </h3>
      </div>
      <div className="p-4 flex-1 space-y-2">
        {data.length === 0 ? (
          <p className="text-[10px] text-slate-300 p-10 text-center font-black uppercase">Sin datos</p>
        ) : (
          data.map((item, i) => (
            <div key={item.player.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-[24px] group transition-all hover:bg-[#0b1220] hover:scale-[1.02]">
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-black text-slate-300 w-4 group-hover:text-red-500">#{i + 1}</span>
                <div>
                  <p className="text-xs font-black text-slate-900 uppercase italic leading-none mb-1 group-hover:text-white">{item.player.name}</p>
                  <ClubBadge clubName={item.player.club} clubs={clubs} logoSize="w-2.5 h-2.5" className="text-[9px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-slate-500" />
                </div>
              </div>
              <span className={`text-sm font-black italic tracking-tighter ${colorMap[color].split(' ')[1]} group-hover:text-white`}>
                {Number(item.data[field] || 0).toFixed(1)}<span className="text-[8px] ml-0.5 not-italic opacity-40">{unit}</span>
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function GrowthGroup({ title, subtitle, color, icon, data }: { title: string, subtitle: string, color: 'blue' | 'amber' | 'emerald', icon: string, data: any[] }) {
  const colorMap = {
    blue: 'bg-blue-600 border-blue-100 text-blue-600',
    amber: 'bg-amber-600 border-amber-100 text-amber-600',
    emerald: 'bg-emerald-600 border-emerald-100 text-emerald-600'
  };

  return (
    <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-fit transform-gpu transition-all hover:shadow-xl">
      <div className={`p-8 ${colorMap[color].split(' ')[0]} text-white relative`}>
        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10 blur-xl"></div>
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-2 relative z-10 italic">
          <i className={`fa-solid ${icon}`}></i> {title}
        </h3>
        <p className="text-[9px] font-bold text-white/60 uppercase tracking-widest mt-1 relative z-10">{subtitle}</p>
      </div>
      <div className="p-4 flex-1 space-y-3">
        {data.length === 0 ? (
          <p className="text-[10px] text-slate-300 p-10 text-center font-black uppercase">Sin jugadores</p>
        ) : (
          data.map((item) => (
            <div key={item.player.id} className="p-4 bg-slate-50 rounded-[24px] group transition-all hover:bg-[#0b1220] hover:scale-[1.02]">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-black text-slate-900 uppercase italic leading-none mb-1 group-hover:text-white">{item.player.name}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-slate-500">{item.player.position} • {item.player.anio}</p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-black text-slate-400 uppercase group-hover:text-slate-500">Años para PHV</p>
                  <p className={`text-sm font-black italic ${colorMap[color].split(' ')[2]} group-hover:text-white`}>
                    {item.data.maduracion_media?.toFixed(2) || '0.00'}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 group-hover:border-white/10">
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Estatura Proy.</p>
                  <p className="text-xs font-black text-slate-700 group-hover:text-white italic">{item.data.estatura_proy_media_cm?.toFixed(1) || '0.0'} cm</p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Por crecer</p>
                  <p className="text-xs font-black text-emerald-500 italic">+{item.data.cm_por_crecer_media?.toFixed(1) || '0.0'} cm</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default NutricionArea;
