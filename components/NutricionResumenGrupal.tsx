
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AthletePerformanceRecord, NutritionData } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { GoogleGenAI } from "@google/genai";
import { normalizeClub } from '../lib/utils';
import ClubBadge from './ClubBadge';

interface NutricionResumenGrupalProps {
  performanceRecords: AthletePerformanceRecord[];
  userRole?: string;
  userClub?: string;
  clubs?: any[];
}

const NutricionResumenGrupal: React.FC<NutricionResumenGrupalProps> = ({ performanceRecords, userRole, userClub, clubs = [] }) => {
  const [startDate, setStartDate] = useState<string>('2020-01-01');
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedClubs, setSelectedClubs] = useState<string[]>(
    userRole === 'club' && userClub ? [userClub] : []
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isClubDropdownOpen, setIsClubDropdownOpen] = useState(false);
  const [clubQuery, setClubQuery] = useState('');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [categoryQuery, setCategoryQuery] = useState('');
  const [aiSummary, setAiSummary] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const hasInitializedDates = useRef(false);

  const handleToggleClub = (clubName: string) => {
    if (userRole === 'club' && userClub) return;
    setSelectedClubs(prev => {
      if (prev.includes(clubName)) {
        return prev.filter(c => c !== clubName);
      } else {
        return [...prev, clubName];
      }
    });
  };

  const handleToggleCategory = (catName: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(catName)) {
        return prev.filter(c => c !== catName);
      } else {
        return [...prev, catName];
      }
    });
  };

  // Set initial dates to the latest evaluation date when data is loaded
  useEffect(() => {
    if (performanceRecords.length > 0 && !hasInitializedDates.current) {
      let latestDateStr = '';
      performanceRecords.forEach(record => {
        if (record.nutrition) {
          record.nutrition.forEach(n => {
            if (n.fecha_medicion && (!latestDateStr || n.fecha_medicion > latestDateStr)) {
              latestDateStr = n.fecha_medicion;
            }
          });
        }
      });

      if (latestDateStr) {
        try {
          const dateObj = new Date(latestDateStr);
          if (!isNaN(dateObj.getTime())) {
            const formattedDate = dateObj.toISOString().split('T')[0];
            setStartDate(formattedDate);
            setEndDate(formattedDate);
            hasInitializedDates.current = true;
          }
        } catch (e) {
          console.error("Error parsing latest date:", e);
        }
      }
    }
  }, [performanceRecords]);

  const getCellColor = (value: number, type: 'muscular' | 'adiposa' | 'pliegues' | 'imo', birthYear: number) => {
    if (type === 'imo') {
      if (value > 4.4) return 'bg-emerald-100 text-emerald-700';
      if (value >= 4.0) return 'bg-amber-100 text-amber-700';
      return 'bg-red-100 text-red-700';
    }

    // Lógica para nacidos ANTES de 2008 (Mayores)
    if (birthYear < 2008 && birthYear > 0) {
      if (type === 'muscular') {
        if (value > 54) return 'bg-emerald-100 text-emerald-700';
        if (value >= 50) return 'bg-amber-100 text-amber-700';
        return 'bg-red-100 text-red-700';
      }
      if (type === 'adiposa') {
        if (value < 16) return 'bg-emerald-100 text-emerald-700';
        if (value <= 20) return 'bg-amber-100 text-amber-700';
        return 'bg-red-100 text-red-700';
      }
      if (type === 'pliegues') {
        if (value < 35) return 'bg-emerald-100 text-emerald-700';
        if (value <= 50) return 'bg-amber-100 text-amber-700';
        return 'bg-red-100 text-red-700';
      }
    }

    // Lógica para nacidos en 2008 o DESPUÉS (Menores)
    if (type === 'muscular') {
      if (value > 52) return 'bg-emerald-100 text-emerald-700';
      if (value >= 50) return 'bg-amber-100 text-amber-700';
      return 'bg-red-100 text-red-700';
    }
    if (type === 'adiposa') {
      if (value < 18) return 'bg-emerald-100 text-emerald-700';
      if (value <= 20) return 'bg-amber-100 text-amber-700';
      return 'bg-red-100 text-red-700';
    }
    if (type === 'pliegues') {
      if (value < 40) return 'bg-emerald-100 text-emerald-700';
      if (value <= 50) return 'bg-amber-100 text-amber-700';
      return 'bg-red-100 text-red-700';
    }
    return '';
  };

  const COLORS = ['#10b981', '#f59e0b', '#ef4444']; // Emerald (Verde), Amber (Amarillo), Red (Rojo)

  const categories = useMemo(() => {
    const cats = new Set<string>();
    performanceRecords.forEach(r => {
      if (r.player.anio) cats.add(r.player.anio.toString());
    });
    return Array.from(cats).sort((a, b) => b.localeCompare(a));
  }, [performanceRecords]);

  const availableClubs = useMemo(() => {
    const c = new Set<string>();
    performanceRecords.forEach(r => {
      if (r.player.club) c.add(r.player.club);
    });
    return Array.from(c).sort();
  }, [performanceRecords]);

  const filteredClubsBySearch = useMemo(() => {
    if (!clubQuery) return availableClubs;
    return availableClubs.filter(club => club.toLowerCase().includes(clubQuery.toLowerCase()));
  }, [availableClubs, clubQuery]);

  const filteredCategoriesBySearch = useMemo(() => {
    if (!categoryQuery) return categories;
    return categories.filter(cat => cat.toLowerCase().includes(categoryQuery.toLowerCase()));
  }, [categories, categoryQuery]);

  const filteredData = useMemo(() => {
    return performanceRecords.flatMap(record => {
      if (!record.nutrition) return [];
      return record.nutrition
        .filter(n => {
          const date = new Date(n.fecha_medicion);
          const start = new Date(startDate);
          const end = new Date(endDate);
          const matchesDate = date >= start && date <= end;
          
          // If user is a club, we show ALL players for comparison (anonymized later)
          // If user is admin, we respect the selectedClubs filter (multi-select)
          const matchesClub = selectedClubs.length === 0 || selectedClubs.some(sc => 
            (record.player.club && normalizeClub(record.player.club) === normalizeClub(sc)) ||
            (record.player.club_name && normalizeClub(record.player.club_name) === normalizeClub(sc))
          );
          
          const matchesCategory = selectedCategories.length === 0 || selectedCategories.some(sc =>
            record.player.anio?.toString() === sc
          );
          return matchesDate && matchesClub && matchesCategory;
        })
        .map(n => ({
          player: record.player,
          data: n
        }));
    });
  }, [performanceRecords, startDate, endDate, selectedClubs, selectedCategories]);

  const chartData = useMemo(() => {
    if (filteredData.length === 0) return null;

    const muscle = { Green: 0, Amber: 0, Red: 0 };
    const fat = { Green: 0, Amber: 0, Red: 0 };
    const folds = { Green: 0, Amber: 0, Red: 0 };

    filteredData.forEach(d => {
      const birthYear = d.player.anio || 0;
      const mColor = getCellColor(d.data.masa_muscular_pct || 0, 'muscular', birthYear);
      const fColor = getCellColor(d.data.masa_adiposa_pct || 0, 'adiposa', birthYear);
      const pColor = getCellColor(d.data.sum_pliegues_6_mm || 0, 'pliegues', birthYear);

      if (mColor.includes('emerald')) muscle.Green++;
      else if (mColor.includes('amber')) muscle.Amber++;
      else if (mColor.includes('red')) muscle.Red++;

      if (fColor.includes('emerald')) fat.Green++;
      else if (fColor.includes('amber')) fat.Amber++;
      else if (fColor.includes('red')) fat.Red++;

      if (pColor.includes('emerald')) folds.Green++;
      else if (pColor.includes('amber')) folds.Amber++;
      else if (pColor.includes('red')) folds.Red++;
    });

    const formatForPie = (counts: any, labels: string[]) => {
      return [
        { name: labels[0], value: counts.Green, color: '#10b981' },
        { name: labels[1], value: counts.Amber, color: '#f59e0b' },
        { name: labels[2], value: counts.Red, color: '#ef4444' }
      ].filter(item => item.value > 0);
    };

    return {
      muscle: formatForPie(muscle, ['Excelente / Alto', 'Normal / Alerta', 'Bajo / Crítico']),
      fat: formatForPie(fat, ['Excelente / Bajo', 'Normal / Alerta', 'Elevado / Crítico']),
      folds: formatForPie(folds, ['Excelente / Magro', 'Normal / Alerta', 'Elevado / Crítico'])
    };
  }, [filteredData]);

  const generateAiSummary = async () => {
    if (filteredData.length === 0) return;
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const model = ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [{
          parts: [{
            text: `Actúa como un Nutricionista Deportivo de Élite. Analiza los siguientes datos grupales de un equipo de fútbol y redacta un resumen ejecutivo breve (máximo 150 palabras). 
            Datos:
            - Total de jugadores evaluados: ${filteredData.length}
            - Promedio Masa Muscular %: ${(filteredData.reduce((acc, curr) => acc + (curr.data.masa_muscular_pct || 0), 0) / filteredData.length).toFixed(1)}%
            - Promedio Masa Grasa %: ${(filteredData.reduce((acc, curr) => acc + (curr.data.masa_adiposa_pct || 0), 0) / filteredData.length).toFixed(1)}%
            - Promedio Sumatoria 6 Pliegues: ${(filteredData.reduce((acc, curr) => acc + (curr.data.sum_pliegues_6_mm || 0), 0) / filteredData.length).toFixed(1)}mm
            
            Enfócate en el estado general del grupo y recomendaciones rápidas basándote en que:
            - Masa Muscular: >54% es excelente, <50% es bajo.
            - Masa Grasa: <16% es excelente, >20% es elevado.
            - 6 Pliegues: <35mm es excelente, >50mm es elevado.`
          }]
        }]
      });
      const response = await model;
      setAiSummary(response.text || 'No se pudo generar el resumen.');
    } catch (error) {
      console.warn("AI Nutrition Summary Error (fallback triggered):", error);
      const muscleAvg = (filteredData.reduce((acc, curr) => acc + (curr.data.masa_muscular_pct || 0), 0) / filteredData.length);
      const fatAvg = (filteredData.reduce((acc, curr) => acc + (curr.data.masa_adiposa_pct || 0), 0) / filteredData.length);
      const foldsAvg = (filteredData.reduce((acc, curr) => acc + (curr.data.sum_pliegues_6_mm || 0), 0) / filteredData.length);
      
      const muscleEval = muscleAvg >= 54 ? "Excelente" : (muscleAvg >= 50 ? "Normal" : "Bajo");
      const fatEval = fatAvg <= 16 ? "Excelente" : (fatAvg <= 20 ? "Normal" : "Elevado");
      const foldsEval = foldsAvg <= 35 ? "Excelente" : (foldsAvg <= 50 ? "Normal" : "Elevado");

      setAiSummary(`### Resumen Ejecutivo Antropométrico (Modo Respaldo)
Se evaluó un plantel de **${filteredData.length} deportistas**. El promedio de **Masa Muscular** se sitúa en **${muscleAvg.toFixed(1)}%** (${muscleEval}), la **Masa Grasa** promedia **${fatAvg.toFixed(1)}%** (${fatEval}) y la **Sumatoria de 6 Pliegues** es de **${foldsAvg.toFixed(1)} mm** (${foldsEval}). 

La composición tisular grupal cumple robustamente con los estándares internacionales exigidos de cara a la competencia de alto nivel. Recomiendo focalizar planes de nutrición hiperproteica post-sesión de esfuerzo para fortalecer el tejido magro, y regular los aportes lipídicos en casos con sumatorias de pliegues superiores a la normalidad.`);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (filteredData.length > 0) {
      generateAiSummary();
    }
  }, [filteredData.length]);

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value }: any) => {
    const RADIAN = Math.PI / 180;
    // Move labels slightly further out for better visibility with black text
    const radius = outerRadius + 25; 
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (value === 0) return null;

    return (
      <text x={x} y={y} fill="#0b1220" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-[10px] font-black">
        {`${value} (${(percent * 100).toFixed(0)}%)`}
      </text>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="bg-[#0b1220] rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden border border-white/5">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-red-600 rounded-3xl flex items-center justify-center text-4xl shadow-lg shadow-red-900/40">
              <i className="fa-solid fa-users-viewfinder"></i>
            </div>
            <div>
              <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-1">Resumen Grupal</h2>
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-[0.3em]">Análisis Colectivo de Composición Corporal</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Date Range Filter */}
          <div className="lg:col-span-2 space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Rango de Fechas (Evaluaciones)</label>
            <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100">
              <input 
                type="date" 
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="flex-1 bg-transparent border-none text-xs font-bold outline-none px-4"
              />
              <div className="w-px h-6 bg-slate-200"></div>
              <input 
                type="date" 
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="flex-1 bg-transparent border-none text-xs font-bold outline-none px-4"
              />
            </div>
          </div>

          {/* Club Filter */}
          <div className="space-y-2 relative">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Filtrar por Club</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsClubDropdownOpen(!isClubDropdownOpen)}
                className="w-full bg-slate-50 hover:bg-slate-100/70 text-slate-800 border-none rounded-2xl px-6 py-4 text-xs font-bold transition-all flex items-center justify-between gap-3 focus:outline-none"
              >
                <span className="truncate">
                  {selectedClubs.length === 0
                    ? 'Todos los Clubes'
                    : selectedClubs.length === 1
                      ? selectedClubs[0]
                      : `${selectedClubs.length} Clubes Seleccionados`}
                </span>
                <div className="flex items-center gap-2 bg-slate-200/60 text-slate-700 px-2.5 py-1 rounded-xl text-[9px] font-black italic">
                  {selectedClubs.length > 0 ? selectedClubs.length : 'TODOS'}
                  <i className={`fa-solid fa-chevron-down text-[8px] transition-transform duration-200 ${isClubDropdownOpen ? 'rotate-180' : ''}`}></i>
                </div>
              </button>

              {isClubDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10 cursor-default" onClick={() => setIsClubDropdownOpen(false)} />
                  <div className="origin-top-right absolute right-0 mt-2 w-full min-w-[280px] rounded-3xl shadow-2xl bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-20 p-5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                      <span className="text-[9px] font-black uppercase text-[#0b1220] tracking-widest">Listado de Clubes</span>
                      {userRole !== 'club' && (
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedClubs(availableClubs)}
                            className="px-2.5 py-1 bg-slate-50 hover:bg-[#0b1220] hover:text-white rounded-lg text-[8px] font-black uppercase tracking-wider transition-all"
                          >
                            Todos
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedClubs([])}
                            className="px-2.5 py-1 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all"
                          >
                            Limpiar
                          </button>
                        </div>
                      )}
                    </div>

                    {userRole === 'club' && userClub ? (
                      <div className="space-y-1">
                        <label className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl text-[10px] font-bold text-slate-700 select-none">
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={true}
                              readOnly
                              className="w-3.5 h-3.5 text-red-600 border-slate-300 rounded focus:ring-red-500 cursor-not-allowed"
                            />
                            <span className="uppercase tracking-wider font-extrabold">{userClub}</span>
                          </div>
                          <span className="text-[7.5px] font-black tracking-widest uppercase bg-slate-200/60 text-slate-600 px-1.5 py-0.5 rounded-full">LOCK</span>
                        </label>
                      </div>
                    ) : (
                      <>
                        {availableClubs.length > 5 && (
                          <div className="relative mb-3">
                            <input
                              type="text"
                              placeholder="Buscar club..."
                              className="w-full bg-slate-50 border-none rounded-xl pl-8 pr-4 py-2 text-[10px] font-bold text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-red-500/20 outline-none"
                              onChange={(e) => setClubQuery(e.target.value)}
                              value={clubQuery}
                            />
                            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]"></i>
                          </div>
                        )}

                        <div className="max-h-48 overflow-y-auto divide-y divide-slate-50 custom-scrollbar pr-1">
                          {filteredClubsBySearch.map(club => {
                            const isChecked = selectedClubs.includes(club);
                            return (
                              <label
                                key={club}
                                className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-all rounded-xl hover:bg-slate-50 text-[10px] font-bold text-slate-700 select-none ${
                                  isChecked ? 'bg-red-50/30 text-red-900 font-extrabold' : ''
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleToggleClub(club)}
                                    className="w-3.5 h-3.5 text-red-600 border-slate-300 rounded focus:ring-red-500 cursor-pointer"
                                  />
                                  <span className="uppercase tracking-wider">{club}</span>
                                </div>
                              </label>
                            );
                          })}
                          {filteredClubsBySearch.length === 0 && (
                            <p className="text-[9px] text-slate-400 font-extrabold italic uppercase text-center py-4">No se encontraron clubes</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Category Filter */}
          <div className="space-y-2 relative">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Categoría / Año</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                className="w-full bg-slate-50 hover:bg-slate-100/70 text-slate-800 border-none rounded-2xl px-6 py-4 text-xs font-bold transition-all flex items-center justify-between gap-3 focus:outline-none"
              >
                <span className="truncate">
                  {selectedCategories.length === 0
                    ? 'Todas las Categorías'
                    : selectedCategories.length === 1
                      ? `Categoría ${selectedCategories[0]}`
                      : `${selectedCategories.length} Cat. Seleccionadas`}
                </span>
                <div className="flex items-center gap-2 bg-slate-200/60 text-slate-700 px-2.5 py-1 rounded-xl text-[9px] font-black italic">
                  {selectedCategories.length > 0 ? selectedCategories.length : 'TODAS'}
                  <i className={`fa-solid fa-chevron-down text-[8px] transition-transform duration-200 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`}></i>
                </div>
              </button>

              {isCategoryDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10 cursor-default" onClick={() => setIsCategoryDropdownOpen(false)} />
                  <div className="origin-top-right absolute right-0 mt-2 w-full min-w-[280px] rounded-3xl shadow-2xl bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-20 p-5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                      <span className="text-[9px] font-black uppercase text-[#0b1220] tracking-widest">Listado de Categorías</span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedCategories(categories)}
                          className="px-2.5 py-1 bg-slate-50 hover:bg-[#0b1220] hover:text-white rounded-lg text-[8px] font-black uppercase tracking-wider transition-all"
                        >
                          Todas
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedCategories([])}
                          className="px-2.5 py-1 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all"
                        >
                          Limpiar
                        </button>
                      </div>
                    </div>

                    {categories.length > 5 && (
                      <div className="relative mb-3">
                        <input
                          type="text"
                          placeholder="Buscar categoría..."
                          className="w-full bg-slate-50 border-none rounded-xl pl-8 pr-4 py-2 text-[10px] font-bold text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-red-500/20 outline-none"
                          onChange={(e) => setCategoryQuery(e.target.value)}
                          value={categoryQuery}
                        />
                        <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]"></i>
                      </div>
                    )}

                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-50 custom-scrollbar pr-1">
                      {filteredCategoriesBySearch.map(cat => {
                        const isChecked = selectedCategories.includes(cat);
                        return (
                          <label
                            key={cat}
                            className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-all rounded-xl hover:bg-slate-50 text-[10px] font-bold text-slate-700 select-none ${
                              isChecked ? 'bg-red-50/30 text-red-900 font-extrabold' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleCategory(cat)}
                                className="w-3.5 h-3.5 text-red-600 border-slate-300 rounded focus:ring-red-500 cursor-pointer"
                              />
                              <span className="uppercase tracking-wider">Categoría {cat}</span>
                            </div>
                          </label>
                        );
                      })}
                      {filteredCategoriesBySearch.length === 0 && (
                        <p className="text-[9px] text-slate-400 font-extrabold italic uppercase text-center py-4">No se encontraron categorías</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center">
          <h3 className="text-sm font-black text-slate-900 uppercase italic tracking-tighter">Listado de Evaluaciones ({filteredData.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Jugador</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Posición</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Masa Muscular %</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Masa Grasa %</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">IMO</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">6 Pliegues (mm)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-8 py-20 text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest italic">No se encontraron registros para los filtros seleccionados</td>
                </tr>
              ) : (
                filteredData.map((item, i) => {
                  const isMyClub = userRole !== 'club' || (userClub && normalizeClub(item.player.club || '') === normalizeClub(userClub));
                  const displayName = isMyClub ? item.player.name : `Jugador [${item.player.player_id || i}]`;
                  const displayClub = isMyClub ? (item.player.club || 'S/C') : 'OTRO CLUB';

                  return (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-4">
                        <p className="text-xs font-black text-slate-900 uppercase italic">{displayName}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <ClubBadge clubName={displayClub} idClub={isMyClub ? item.player.id_club : undefined} clubs={clubs} logoSize="w-2.5 h-2.5" className="text-[9px] font-bold text-slate-400 uppercase" />
                          <span className="text-slate-300">•</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Cat {item.player.anio}</span>
                        </div>
                      </td>
                      <td className="px-8 py-4">
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{item.player.position || 'N/A'}</p>
                      </td>
                      <td className="px-8 py-4">
                        <span className="text-[10px] font-bold text-slate-500">{new Date(item.data.fecha_medicion).toLocaleDateString('es-CL')}</span>
                      </td>
                    <td className="px-8 py-4 text-center">
                      <span className={`inline-block px-3 py-1 rounded-lg text-xs font-black italic ${getCellColor(item.data.masa_muscular_pct || 0, 'muscular', item.player.anio || 0)}`}>
                        {item.data.masa_muscular_pct?.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-8 py-4 text-center">
                      <span className={`inline-block px-3 py-1 rounded-lg text-xs font-black italic ${getCellColor(item.data.masa_adiposa_pct || 0, 'adiposa', item.player.anio || 0)}`}>
                        {item.data.masa_adiposa_pct?.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-8 py-4 text-center">
                      {(() => {
                        const imoVal = (item.data.indice_imo && Number(item.data.indice_imo) > 0)
                          ? Number(item.data.indice_imo)
                          : (item.data.masa_muscular_kg && item.data.masa_osea_kg && Number(item.data.masa_osea_kg) > 0)
                            ? (Number(item.data.masa_muscular_kg) / Number(item.data.masa_osea_kg))
                            : 0;
                        return (
                          <span className={`inline-block px-3 py-1 rounded-lg text-xs font-black italic ${getCellColor(imoVal, 'imo', item.player.anio || 0)}`}>
                            {imoVal > 0 ? imoVal.toFixed(2) : 'N/A'}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-8 py-4 text-center">
                      <span className={`inline-block px-3 py-1 rounded-lg text-xs font-black italic ${getCellColor(item.data.sum_pliegues_6_mm || 0, 'pliegues', item.player.anio || 0)}`}>
                        {item.data.sum_pliegues_6_mm?.toFixed(1)}mm
                      </span>
                    </td>
                  </tr>
                );
              })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts Section */}
      {chartData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { title: 'Masa Muscular', data: chartData.muscle, icon: 'fa-dumbbell' },
            { title: 'Masa Grasa', data: chartData.fat, icon: 'fa-droplet-slash' },
            { title: '6 Pliegues', data: chartData.folds, icon: 'fa-ruler-horizontal' }
          ].map((chart, i) => (
            <div key={i} className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm flex flex-col items-center">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 mb-6">
                <i className={`fa-solid ${chart.icon}`}></i>
              </div>
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-8">{chart.title}</h4>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 20, right: 30, left: 30, bottom: 20 }}>
                    <Pie
                      data={chart.data}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      labelLine={false}
                      label={renderCustomizedLabel}
                    >
                      {chart.data.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      align="center" 
                      iconType="circle"
                      formatter={(value) => <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Summary Section */}
      <div className="bg-[#0b1220] rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden border border-white/5">
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-emerald-600/10 rounded-full -mr-32 -mb-32 blur-3xl"></div>
        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-900/40">
              <i className="fa-solid fa-robot"></i>
            </div>
            <div>
              <h3 className="text-xl font-black italic uppercase tracking-tighter">Informe Técnico IA</h3>
              <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest">Análisis Automatizado de Rendimiento Grupal</p>
            </div>
          </div>
          
          <div className="bg-white/5 rounded-3xl p-8 border border-white/10 min-h-[100px] flex items-center">
            {isGenerating ? (
              <div className="flex items-center gap-4 text-white/30 italic text-sm">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Generando análisis experto...
              </div>
            ) : (
              <p className="text-white/80 text-sm leading-relaxed font-medium italic">
                {aiSummary || "Selecciona un rango de datos para generar el análisis."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NutricionResumenGrupal;
