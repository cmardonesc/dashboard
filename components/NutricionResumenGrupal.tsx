
import React, { useState, useMemo, useEffect } from 'react';
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
  const [selectedClub, setSelectedClub] = useState<string>(userRole === 'club' && userClub ? userClub : 'TODOS');
  const [selectedCategory, setSelectedCategory] = useState<string>('TODAS');
  const [aiSummary, setAiSummary] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  const getCellColor = (value: number, type: 'muscular' | 'adiposa' | 'pliegues', birthYear: number) => {
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
          // If user is admin, we respect the selectedClub filter
          const matchesClub = selectedClub === 'TODOS' || record.player.club === selectedClub;
          
          const matchesCategory = selectedCategory === 'TODAS' || record.player.anio?.toString() === selectedCategory;
          return matchesDate && matchesClub && matchesCategory;
        })
        .map(n => ({
          player: record.player,
          data: n
        }));
    });
  }, [performanceRecords, startDate, endDate, selectedClub, selectedCategory]);

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
        model: "gemini-3-flash-preview",
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
      console.error("AI Error:", error);
      setAiSummary("Error al generar el resumen con IA.");
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
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Filtrar por Club</label>
            <select 
              value={selectedClub}
              onChange={e => setSelectedClub(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="TODOS">Todos los Clubes</option>
              {userRole === 'club' ? (
                userClub && <option value={userClub}>{userClub}</option>
              ) : (
                availableClubs.map(club => <option key={club} value={club}>{club}</option>)
              )}
            </select>
          </div>

          {/* Category Filter */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Categoría / Año</label>
            <select 
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="TODAS">Todas las Categorías</option>
              {categories.map(cat => <option key={cat} value={cat}>Categoría {cat}</option>)}
            </select>
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
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">6 Pliegues (mm)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest italic">No se encontraron registros para los filtros seleccionados</td>
                </tr>
              ) : (
                filteredData.map((item, i) => {
                  const isMyClub = userRole !== 'club' || (userClub && normalizeClub(item.player.club || '') === normalizeClub(userClub));
                  const displayName = isMyClub ? item.player.name : `Jugador [${item.player.id_del_jugador || i}]`;
                  const displayClub = isMyClub ? (item.player.club || 'S/C') : 'OTRO CLUB';

                  return (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-4">
                        <p className="text-xs font-black text-slate-900 uppercase italic">{displayName}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <ClubBadge clubName={displayClub} clubs={clubs} logoSize="w-2.5 h-2.5" className="text-[9px] font-bold text-slate-400 uppercase" />
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
