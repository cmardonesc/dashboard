import React, { useMemo } from 'react';
import { NutritionData, User } from '../types';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, LabelList,
  ScatterChart, Scatter, ZAxis, Cell
} from 'recharts';

interface NutritionReportProps {
  data: NutritionData; // Latest data point (kept for compatibility, though we use history primarily)
  history: NutritionData[]; // Full history for charts
  player: User;
  onClose: () => void;
}

// Colors adapted to the App's Aesthetic
const COLORS = {
  BLUE_LINE: '#3b82f6', // Blue-500
  RED_LINE: '#ef4444', // Red-500
  DARK_BG: '#0b1220', // Main Dark Background
  CARD_BG: '#ffffff', // White cards
  TEXT_MAIN: '#0f172a', // Slate-900
  TEXT_MUTED: '#64748b', // Slate-500
};

export default function NutritionReport({ data, history, player, onClose }: NutritionReportProps) {
  
  // Sort history by date ascending for charts
  const sortedHistory = useMemo(() => {
    return [...history]
      .sort((a, b) => new Date(a.fecha_medicion).getTime() - new Date(b.fecha_medicion).getTime())
      .map(item => ({
        ...item,
        // Calculate IMO if missing or 0
        indice_imo: (item.indice_imo && Number(item.indice_imo) > 0) 
          ? Number(item.indice_imo) 
          : (Number(item.masa_muscular_kg) && Number(item.masa_osea_kg)) 
            ? (Number(item.masa_muscular_kg) / Number(item.masa_osea_kg)) 
            : 0
      }));
  }, [history]);

  // Format date for X-Axis
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CL', { month: 'short', year: '2-digit' });
  };

  // Helper for conditional cell coloring in table
  const getCellColor = (value: number, type: 'muscular' | 'adiposa' | 'pliegues' | 'imo') => {
    const birthYear = player.anio || 0;
    
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
      if (type === 'imo') {
        if (value > 4.5) return 'bg-emerald-100 text-emerald-700';
        if (value >= 4.0) return 'bg-amber-100 text-amber-700';
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
    if (type === 'imo') {
      if (value > 4.3) return 'bg-emerald-100 text-emerald-700';
      if (value >= 4.0) return 'bg-amber-100 text-amber-700';
      return 'bg-red-100 text-red-700';
    }
    return '';
  };

  const getSomatotypeClassification = (endo: number, meso: number, ecto: number) => {
    if (!endo || !meso || !ecto) return 'N/A';
    if (meso > endo && meso > ecto) {
      if (endo > ecto) return 'Mesomorfo-Endomorfo';
      if (ecto > endo) return 'Mesomorfo-Ectomorfo';
      return 'Mesomorfo Balanceado';
    }
    if (endo > meso && endo > ecto) {
      if (meso > ecto) return 'Endomorfo-Mesomorfo';
      if (ecto > meso) return 'Endomorfo-Ectomorfo';
      return 'Endomorfo Balanceado';
    }
    if (ecto > meso && ecto > endo) {
      if (meso > endo) return 'Ectomorfo-Mesomorfo';
      if (endo > meso) return 'Ectomorfo-Endomorfo';
      return 'Ectomorfo Balanceado';
    }
    return 'Central';
  };

  const somatoData = useMemo(() => {
    return sortedHistory
      .filter(h => h.somatotipo_eje_x !== undefined && h.somatotipo_eje_y !== undefined)
      .map((h, i) => ({
        x: h.somatotipo_eje_x,
        y: h.somatotipo_eje_y,
        date: formatDate(h.fecha_medicion),
        isLatest: i === sortedHistory.length - 1
      }));
  }, [sortedHistory]);

  const maturationStatus = useMemo(() => {
    if (!data.maduracion_media) return { label: 'N/A', color: 'text-slate-400', bg: 'bg-slate-50' };
    const val = data.maduracion_media;
    if (val < -0.5) return { label: 'PRE-PHV', color: 'text-blue-600', bg: 'bg-blue-50', desc: 'Fase de crecimiento lento pre-estirón.' };
    if (val <= 0.5) return { label: 'CIRCA-PHV', color: 'text-amber-600', bg: 'bg-amber-50', desc: 'Pico de crecimiento. Riesgo de lesiones.' };
    return { label: 'POST-PHV', color: 'text-emerald-600', bg: 'bg-emerald-50', desc: 'Crecimiento finalizado. Apto para fuerza.' };
  }, [data]);

  const nutritionActionStatus = useMemo(() => {
    const imo = (data.masa_muscular_kg && data.masa_osea_kg && Number(data.masa_osea_kg) > 0) 
      ? (Number(data.masa_muscular_kg) / Number(data.masa_osea_kg)) 
      : Number(data.indice_imo || 0);
    const pliegues = Number(data.sum_pliegues_6_mm || 0);

    if (imo === 0 || pliegues === 0) return { text: "PENDIENTE DE EVALUACIÓN", color: "text-slate-400" };

    // Lógica basada en la tabla ISAK
    if (imo > 4.4) {
      if (pliegues < 40) return { text: "MANTENER", color: "text-emerald-500" };
      if (pliegues <= 41.5) return { text: "AUMENTAR masa muscular", color: "text-blue-500" };
      if (pliegues > 42) return { text: "BAJAR masa grasa", color: "text-amber-500" };
    }
    
    if (imo >= 4.0 && imo <= 4.4) {
      if (pliegues < 40) return { text: "AUMENTAR masa muscular", color: "text-blue-500" };
      if (pliegues > 40) return { text: "AUMENTAR masa muscular, bajar masa grasa", color: "text-red-500" };
    }
    
    if (imo < 4.0) {
      if (pliegues < 40) return { text: "AUMENTAR masa muscular", color: "text-blue-500" };
      if (pliegues > 40) return { text: "AUMENTAR masa muscular, bajar masa grasa", color: "text-red-500" };
    }
    
    return { text: "ANÁLISIS EN CURSO", color: "text-slate-400" };
  }, [data]);

  return (
    <div className="w-full bg-white shadow-xl rounded-[32px] md:rounded-[48px] overflow-hidden flex flex-col relative border border-slate-100 animate-in fade-in slide-in-from-bottom-8 duration-700">
      
      {/* Print Button */}
      <button 
        onClick={() => window.print()}
        className="absolute top-4 right-4 md:top-8 md:right-8 z-50 bg-[#0b1220] text-white w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center hover:bg-red-600 transition-all shadow-xl print:hidden group"
      >
        <i className="fa-solid fa-print group-hover:scale-110 transition-transform"></i>
      </button>

      <div className="flex flex-col h-full">
        
        {/* HEADER SECTION */}
        <header className="bg-slate-50/50 p-6 md:p-10 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start gap-8">
          <div className="flex flex-col md:flex-row gap-8 w-full">
            
            {/* Player Avatar & Name */}
            <div className="flex items-center gap-4 md:gap-6">
               <div className="w-16 h-16 md:w-24 md:h-24 bg-[#0b1220] rounded-2xl md:rounded-[32px] flex items-center justify-center text-white font-black italic text-2xl md:text-4xl shadow-2xl relative overflow-hidden shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                  {player.name.charAt(0)}
               </div>
               <div>
                  <div className="flex items-center gap-2 md:gap-3 mb-1">
                    <span className="bg-red-600 text-white px-2 md:px-3 py-0.5 md:py-1 rounded-md md:rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-widest shadow-sm">
                      {player.category ? player.category.replace('_', ' ') : 'S/C'}
                    </span>
                    <span className="text-slate-400 text-[8px] md:text-[10px] font-black uppercase tracking-widest">{player.club || 'Selección Chile'}</span>
                  </div>
                  <h2 className="text-xl md:text-3xl font-black text-slate-900 uppercase italic tracking-tighter leading-none mb-1">{player.name}</h2>
                  <p className={`text-[9px] md:text-[11px] font-black uppercase tracking-[0.2em] italic ${nutritionActionStatus.color}`}>
                    {nutritionActionStatus.text}
                  </p>
               </div>
            </div>

            {/* Metadata Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-8 w-full md:w-auto md:ml-auto">
               <StatBox label="Edad" value={`${Number(data.edad_cronologica).toFixed(1)}`} unit="años" />
               <StatBox label="Altura" value={`${Number(data.talla_cm).toFixed(0)}`} unit="cm" />
               <StatBox label="Peso" value={`${Number(data.masa_corporal_kg).toFixed(1)}`} unit="kg" />
               <StatBox label="Última Eval." value={new Date(data.fecha_medicion).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })} unit={new Date(data.fecha_medicion).getFullYear().toString()} highlight />
            </div>

          </div>
        </header>

        {/* CONTENT GRID */}
        <div className="flex-1 overflow-hidden flex flex-col">
          
          {/* TOP: DATA TABLE */}
          <div className="w-full h-1/3 min-h-[250px] bg-slate-50 border-b border-slate-100 flex flex-col shrink-0">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
               <h3 className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest italic">Histórico de Mediciones</h3>
               <span className="text-[8px] md:text-[10px] font-bold text-slate-300 uppercase tracking-widest">{sortedHistory.length} Registros</span>
            </div>
            <div className="flex-1 overflow-x-auto custom-scrollbar p-2">
              <table className="w-full text-[9px] md:text-[10px] text-center border-collapse min-w-[800px] md:min-w-0">
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th className="p-3 bg-slate-50 font-black text-slate-400 uppercase tracking-wider text-[9px]">Fecha</th>
                    <th className="p-3 bg-slate-50 font-black text-slate-400 uppercase tracking-wider text-[9px]">Peso</th>
                    <th className="p-3 bg-slate-50 font-black text-slate-400 uppercase tracking-wider text-[9px]">Talla</th>
                    <th className="p-3 bg-slate-50 font-black text-slate-400 uppercase tracking-wider text-[9px]">MM kg</th>
                    <th className="p-3 bg-slate-50 font-black text-slate-400 uppercase tracking-wider text-[9px]">MA kg</th>
                    <th className="p-3 bg-slate-50 font-black text-slate-400 uppercase tracking-wider text-[9px]">MM%</th>
                    <th className="p-3 bg-slate-50 font-black text-slate-400 uppercase tracking-wider text-[9px]">MA%</th>
                    <th className="p-3 bg-slate-50 font-black text-slate-400 uppercase tracking-wider text-[9px]">6PL</th>
                    <th className="p-3 bg-slate-50 font-black text-slate-400 uppercase tracking-wider text-[9px]">IMO</th>
                    <th className="p-3 bg-slate-50 font-black text-slate-400 uppercase tracking-wider text-[9px]">ENDO</th>
                    <th className="p-3 bg-slate-50 font-black text-slate-400 uppercase tracking-wider text-[9px]">MESO</th>
                    <th className="p-3 bg-slate-50 font-black text-slate-400 uppercase tracking-wider text-[9px]">ECTO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...sortedHistory].reverse().map((row, i) => (
                    <tr key={i} className="hover:bg-white transition-colors group">
                      <td className="p-3 font-bold text-slate-500 whitespace-nowrap bg-white group-hover:bg-slate-50 rounded-l-xl my-1">{new Date(row.fecha_medicion).toLocaleDateString('es-CL')}</td>
                      <td className="p-3 font-black text-slate-700 bg-white group-hover:bg-slate-50">{Number(row.masa_corporal_kg).toFixed(1)}</td>
                      <td className="p-3 font-medium text-slate-500 bg-white group-hover:bg-slate-50">{Number(row.talla_cm).toFixed(0)}</td>
                      <td className="p-3 font-medium text-slate-500 bg-white group-hover:bg-slate-50">{Number(row.masa_muscular_kg).toFixed(1)}</td>
                      <td className="p-3 font-medium text-slate-500 bg-white group-hover:bg-slate-50">{Number(row.masa_adiposa_kg).toFixed(1)}</td>
                      
                      {/* Conditional Coloring Cells */}
                      <td className={`p-3 font-black rounded-lg mx-1 ${getCellColor(Number(row.masa_muscular_pct), 'muscular')}`}>
                        {Number(row.masa_muscular_pct).toFixed(1)}
                      </td>
                      <td className={`p-3 font-black rounded-lg mx-1 ${getCellColor(Number(row.masa_adiposa_pct), 'adiposa')}`}>
                        {Number(row.masa_adiposa_pct).toFixed(1)}
                      </td>
                      <td className={`p-3 font-black rounded-lg mx-1 ${getCellColor(Number(row.sum_pliegues_6_mm), 'pliegues')}`}>
                        {Number(row.sum_pliegues_6_mm).toFixed(0)}
                      </td>

                      <td className={`p-3 font-black rounded-lg mx-1 ${getCellColor(Number(row.masa_muscular_kg) / Number(row.masa_osea_kg), 'imo')}`}>
                        {(Number(row.masa_muscular_kg) / Number(row.masa_osea_kg)).toFixed(2)}
                      </td>

                      <td className="p-3 font-bold text-slate-500 bg-white group-hover:bg-slate-50">{row.somatotipo_endo?.toFixed(1) || '-'}</td>
                      <td className="p-3 font-bold text-slate-500 bg-white group-hover:bg-slate-50">{row.somatotipo_meso?.toFixed(1) || '-'}</td>
                      <td className="p-3 font-bold text-slate-500 bg-white group-hover:bg-slate-50 rounded-r-xl">{row.somatotipo_ecto?.toFixed(1) || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* BOTTOM: CHARTS */}
          <div className="flex-1 w-full bg-white p-4 md:p-8 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 custom-scrollbar">
            
            {/* Chart 1: Talla */}
            <ChartCard title="Evolución Talla (cm)">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sortedHistory} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="fecha_medicion" tickFormatter={formatDate} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 700}} axisLine={false} tickLine={false} dy={10} />
                  <YAxis domain={['auto', 'auto']} hide />
                  <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} labelStyle={{fontWeight: 900, color: '#0f172a'}} formatter={(val: number) => Number(val).toFixed(1)} />
                  <Line type="monotone" dataKey="talla_cm" stroke={COLORS.BLUE_LINE} strokeWidth={4} dot={{r: 4, fill: COLORS.BLUE_LINE, strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} isAnimationActive={true}>
                    <LabelList dataKey="talla_cm" position="top" offset={10} fontSize={10} fontWeight={900} fill="#0f172a" formatter={(val: number) => Number(val).toFixed(1)} />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Chart 2: Masa Corporal */}
            <ChartCard title="Evolución Masa Corporal (kg)">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sortedHistory} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="fecha_medicion" tickFormatter={formatDate} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 700}} axisLine={false} tickLine={false} dy={10} />
                  <YAxis domain={['auto', 'auto']} hide />
                  <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} labelStyle={{fontWeight: 900, color: '#0f172a'}} formatter={(val: number) => Number(val).toFixed(1)} />
                  <Line type="monotone" dataKey="masa_corporal_kg" stroke={COLORS.BLUE_LINE} strokeWidth={4} dot={{r: 4, fill: COLORS.BLUE_LINE, strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} isAnimationActive={true}>
                    <LabelList dataKey="masa_corporal_kg" position="top" offset={10} fontSize={10} fontWeight={900} fill="#0f172a" formatter={(val: number) => Number(val).toFixed(1)} />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Chart 3: Masas KG Comparison */}
            <ChartCard title="Masa Muscular vs Adiposa (kg)" legend>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sortedHistory} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="fecha_medicion" tickFormatter={formatDate} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 700}} axisLine={false} tickLine={false} dy={10} />
                  <YAxis domain={['auto', 'auto']} hide />
                  <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} labelStyle={{fontWeight: 900, color: '#0f172a'}} formatter={(val: number) => Number(val).toFixed(1)} />
                  <Line type="monotone" dataKey="masa_muscular_kg" stroke={COLORS.BLUE_LINE} strokeWidth={4} dot={{r: 4, fill: COLORS.BLUE_LINE, strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} isAnimationActive={true}>
                    <LabelList dataKey="masa_muscular_kg" position="top" offset={10} fontSize={10} fontWeight={900} fill={COLORS.BLUE_LINE} formatter={(val: number) => Number(val).toFixed(1)} />
                  </Line>
                  <Line type="monotone" dataKey="masa_adiposa_kg" stroke={COLORS.RED_LINE} strokeWidth={4} dot={{r: 4, fill: COLORS.RED_LINE, strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} isAnimationActive={true}>
                    <LabelList dataKey="masa_adiposa_kg" position="top" offset={10} fontSize={10} fontWeight={900} fill={COLORS.RED_LINE} formatter={(val: number) => Number(val).toFixed(1)} />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Chart 4: Masas % Comparison */}
            <ChartCard title="Masa Muscular vs Adiposa (%)" legend>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sortedHistory} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="fecha_medicion" tickFormatter={formatDate} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 700}} axisLine={false} tickLine={false} dy={10} />
                  <YAxis domain={['auto', 'auto']} hide />
                  <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} labelStyle={{fontWeight: 900, color: '#0f172a'}} formatter={(val: number) => Number(val).toFixed(1) + '%'} />
                  <Line type="monotone" dataKey="masa_muscular_pct" stroke={COLORS.BLUE_LINE} strokeWidth={4} dot={{r: 4, fill: COLORS.BLUE_LINE, strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} isAnimationActive={true}>
                    <LabelList dataKey="masa_muscular_pct" position="top" offset={10} fontSize={10} fontWeight={900} fill={COLORS.BLUE_LINE} formatter={(v: number) => Number(v).toFixed(1) + '%'} />
                  </Line>
                  <Line type="monotone" dataKey="masa_adiposa_pct" stroke={COLORS.RED_LINE} strokeWidth={4} dot={{r: 4, fill: COLORS.RED_LINE, strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} isAnimationActive={true}>
                    <LabelList dataKey="masa_adiposa_pct" position="top" offset={10} fontSize={10} fontWeight={900} fill={COLORS.RED_LINE} formatter={(v: number) => Number(v).toFixed(1) + '%'} />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Chart 5: IMO */}
            <ChartCard title="Índice Músculo-Óseo (IMO)">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sortedHistory} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="fecha_medicion" tickFormatter={formatDate} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 700}} axisLine={false} tickLine={false} dy={10} />
                  <YAxis domain={['auto', 'auto']} hide />
                  <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} labelStyle={{fontWeight: 900, color: '#0f172a'}} formatter={(val: number) => Number(val).toFixed(1)} />
                  <Line type="monotone" dataKey="indice_imo" stroke={COLORS.BLUE_LINE} strokeWidth={4} dot={{r: 4, fill: COLORS.BLUE_LINE, strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} isAnimationActive={true}>
                    <LabelList dataKey="indice_imo" position="top" offset={10} fontSize={10} fontWeight={900} fill="#0f172a" formatter={(val: number) => Number(val).toFixed(1)} />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Chart 6: 6 Pliegues */}
            <ChartCard title="Sumatoria 6 Pliegues (mm)">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sortedHistory} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="fecha_medicion" tickFormatter={formatDate} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 700}} axisLine={false} tickLine={false} dy={10} />
                  <YAxis domain={['auto', 'auto']} hide />
                  <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} labelStyle={{fontWeight: 900, color: '#0f172a'}} formatter={(val: number) => Number(val).toFixed(1)} />
                  <Line type="monotone" dataKey="sum_pliegues_6_mm" stroke={COLORS.BLUE_LINE} strokeWidth={4} dot={{r: 4, fill: COLORS.BLUE_LINE, strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} isAnimationActive={true}>
                    <LabelList dataKey="sum_pliegues_6_mm" position="top" offset={10} fontSize={10} fontWeight={900} fill="#0f172a" formatter={(val: number) => Number(val).toFixed(1)} />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Chart 7: Somatocarta */}
            <ChartCard title="Somatocarta (Trayectoria Morfológica)">
              <div className="absolute top-0 right-0 text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase">Clasificación Actual</p>
                <p className="text-xs font-black text-red-600 uppercase italic">
                  {getSomatotypeClassification(data.somatotipo_endo || 0, data.somatotipo_meso || 0, data.somatotipo_ecto || 0)}
                </p>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" dataKey="x" name="Eje X" domain={[-8, 8]} hide />
                  <YAxis type="number" dataKey="y" name="Eje Y" domain={[-10, 15]} hide />
                  <ZAxis type="number" range={[50, 200]} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                  
                  {/* Background Triangle Lines (Simplified Somatochart) */}
                  <ReferenceLine segment={[{ x: 0, y: 15 }, { x: -8, y: -10 }]} stroke="#e2e8f0" strokeWidth={1} />
                  <ReferenceLine segment={[{ x: 0, y: 15 }, { x: 8, y: -10 }]} stroke="#e2e8f0" strokeWidth={1} />
                  <ReferenceLine segment={[{ x: -8, y: -10 }, { x: 8, y: -10 }]} stroke="#e2e8f0" strokeWidth={1} />

                  <Scatter name="Trayectoria" data={somatoData} line={{ stroke: '#94a3b8', strokeWidth: 2, strokeDasharray: '5 5' }} shape="circle">
                    {somatoData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.isLatest ? '#ef4444' : '#3b82f6'} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
              <div className="mt-2 flex justify-center gap-4">
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Histórico</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500"></span> Actual</div>
              </div>
            </ChartCard>

            {/* Biological Maturation Profile */}
            <div className="col-span-full bg-slate-50/50 rounded-[32px] md:rounded-[40px] p-6 md:p-8 border border-slate-100">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                  <h3 className="text-xs md:text-sm font-black text-slate-900 uppercase italic flex items-center gap-2">
                    <i className="fa-solid fa-dna text-red-600"></i> Perfil de Maduración Biológica
                  </h3>
                  <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Análisis de Edad Biológica vs Cronológica</p>
                </div>
                <div className="flex gap-2">
                  <span className="px-2 md:px-3 py-1 bg-white rounded-full text-[8px] md:text-[9px] font-black text-slate-500 border border-slate-200 uppercase tracking-widest">Mirwald</span>
                  <span className="px-2 md:px-3 py-1 bg-white rounded-full text-[8px] md:text-[9px] font-black text-slate-500 border border-slate-200 uppercase tracking-widest">Moore</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                {/* PHV Status */}
                <div className={`${maturationStatus.bg} rounded-2xl md:rounded-[32px] p-5 md:p-6 border border-white shadow-sm flex flex-col justify-between`}>
                  <div>
                    <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Estado Madurativo</p>
                    <h4 className={`text-xl md:text-2xl font-black italic ${maturationStatus.color}`}>{maturationStatus.label}</h4>
                  </div>
                  <p className="text-[9px] md:text-[10px] font-bold text-slate-500 mt-4 leading-relaxed uppercase">{maturationStatus.desc}</p>
                </div>

                {/* Growth Stats */}
                <div className="bg-white rounded-2xl md:rounded-[32px] p-5 md:p-6 border border-slate-100 shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase">Años para PHV</span>
                    <span className="text-base md:text-lg font-black text-slate-900 italic">{data.maduracion_media?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase">Edad PHV (Pico)</span>
                    <span className="text-base md:text-lg font-black text-slate-900 italic">{data.phv_media?.toFixed(1) || '0.0'} <span className="text-[9px] md:text-[10px] opacity-30">años</span></span>
                  </div>
                </div>

                {/* Height Projection */}
                <div className="bg-[#0b1220] rounded-2xl md:rounded-[32px] p-5 md:p-6 text-white relative overflow-hidden sm:col-span-2 md:col-span-1">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                  <div className="relative z-10">
                    <p className="text-[8px] md:text-[9px] font-black text-red-500 uppercase tracking-widest mb-1">Proyección Estatura Final</p>
                    <h4 className="text-2xl md:text-3xl font-black italic">{data.estatura_proy_media_cm?.toFixed(1) || '0.0'} <span className="text-[10px] md:text-xs opacity-50">cm</span></h4>
                    
                    <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-white/10">
                      <div className="flex justify-between items-end">
                        <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase">Por crecer</span>
                        <span className="text-lg md:text-xl font-black text-emerald-400 italic">+{data.cm_por_crecer_media?.toFixed(1) || '0.0'} <span className="text-[9px] md:text-[10px] opacity-50">cm</span></span>
                      </div>
                      <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div 
                          className="bg-emerald-400 h-full rounded-full transition-all duration-1000" 
                          style={{ width: `${(data.talla_cm / (data.estatura_proy_media_cm || 1)) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, children, legend = false }: { title: string, children: React.ReactNode, legend?: boolean }) {
  return (
    <div className="bg-white rounded-2xl md:rounded-[32px] border border-slate-100 shadow-sm p-4 md:p-6 flex flex-col h-64 md:h-72 hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 md:mb-6 gap-2">
        <h3 className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest italic">{title}</h3>
        {legend && (
          <div className="flex gap-3 text-[8px] md:text-[9px] font-black uppercase tracking-wider">
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Muscular</div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500"></span> Adiposa</div>
          </div>
        )}
      </div>
      <div className="flex-1 w-full relative">
        {children}
      </div>
    </div>
  );
}

function StatBox({ label, value, unit, highlight = false }: { label: string, value: string, unit: string, highlight?: boolean }) {
  return (
    <div className={`p-3 md:p-4 rounded-xl md:rounded-2xl border ${highlight ? 'bg-[#0b1220] border-[#0b1220] text-white' : 'bg-slate-50 border-slate-100'}`}>
      <p className={`text-[8px] md:text-[9px] font-black uppercase tracking-widest mb-1 ${highlight ? 'text-slate-400' : 'text-slate-400'}`}>{label}</p>
      <p className="text-lg md:text-2xl font-black italic tracking-tighter leading-none">
        {value} <span className={`text-[8px] md:text-[10px] not-italic font-bold ${highlight ? 'text-slate-500' : 'text-slate-400'}`}>{unit}</span>
      </p>
    </div>
  );
}
