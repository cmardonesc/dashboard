import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

const METRICS = [
  { id: 'dist_total', label: 'Distancia Total (m)', minKey: 'dist_total_min', maxKey: 'dist_total_max' },
  { id: 'm_por_min', label: 'Metros/min', minKey: 'm_por_min_min', maxKey: 'm_por_min_max' },
  { id: 'hms', label: 'HSR >20 km/h (m)', minKey: 'hms_min', maxKey: 'hms_max' },
  { id: 'sprint', label: 'Sprint >25 km/h (m)', minKey: 'sprint_min', maxKey: 'sprint_max' },
  { id: 'sprints_count', label: '# Sprints', minKey: 'sprints_count_min', maxKey: 'sprints_count_max' },
  { id: 'acc_decc', label: 'Acc + Decc AI', minKey: 'acc_decc_min', maxKey: 'acc_decc_max' },
];

export default function PronosticoCargas({ clubs }: { clubs: any[] }) {
  const [microcycles, setMicrocycles] = useState<any[]>([]);
  const [selectedMicrocycleId, setSelectedMicrocycleId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pronosticos, setPronosticos] = useState<any[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchMicrocycles();
  }, []);

  const fetchMicrocycles = async () => {
    const { data, error } = await supabase
      .from('microcycles')
      .select('*')
      .order('start_date', { ascending: false });
    if (data) setMicrocycles(data);
  };

  const selectedMicrocycle = useMemo(() => 
    microcycles.find(m => m.id === selectedMicrocycleId), 
    [selectedMicrocycleId, microcycles]
  );

  const microcycleDays = useMemo(() => {
    if (!selectedMicrocycle) return [];
    const days = [];
    const start = new Date(selectedMicrocycle.start_date);
    const end = new Date(selectedMicrocycle.end_date);
    const current = new Date(start);
    
    while (current <= end) {
      days.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, [selectedMicrocycle]);

  useEffect(() => {
    if (selectedMicrocycleId) {
      fetchPronosticos();
    }
  }, [selectedMicrocycleId]);

  const fetchPronosticos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('gps_pronosticos')
      .select('*')
      .eq('microcycle_id', selectedMicrocycleId);
    
    if (data) setPronosticos(data);
    setLoading(false);
  };

  const handleInputChange = (fecha: string, field: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setPronosticos(prev => {
      const existing = prev.find(p => p.fecha === fecha);
      if (existing) {
        return prev.map(p => p.fecha === fecha ? { ...p, [field]: numValue } : p);
      } else {
        return [...prev, { microcycle_id: selectedMicrocycleId, fecha, [field]: numValue }];
      }
    });
  };

  const savePronosticos = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const { error } = await supabase
        .from('gps_pronosticos')
        .upsert(pronosticos, { onConflict: 'microcycle_id,fecha' });
      
      if (error) throw error;
      setMessage({ type: 'success', text: 'Pronósticos guardados correctamente' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al guardar' });
    } finally {
      setSaving(false);
    }
  };

  const getDayValue = (fecha: string, field: string) => {
    const p = pronosticos.find(item => item.fecha === fecha);
    if (!p) return 0;
    const val = p[field];
    return val === null || val === undefined ? 0 : val;
  };

  return (
    <div className="p-8 space-y-8 bg-slate-950 min-h-screen text-slate-200">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900/50 p-8 rounded-[40px] border border-white/5 backdrop-blur-xl">
        <div className="space-y-1">
          <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none">
            Pronóstico de Cargas <span className="text-red-600">GPS</span>
          </h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.3em]">Planificación de Intensidades por Microciclo</p>
        </div>

        <div className="flex items-center gap-4">
          <select
            value={selectedMicrocycleId}
            onChange={(e) => setSelectedMicrocycleId(e.target.value)}
            className="bg-slate-800 text-white rounded-2xl px-6 py-4 text-sm font-bold border border-white/10 focus:ring-2 focus:ring-red-600 outline-none w-full md:w-64 appearance-none cursor-pointer"
          >
            <option value="">Seleccionar Microciclo</option>
            {microcycles.map(m => (
              <option key={m.id} value={m.id}>
                {m.type} ({m.start_date} / {m.end_date})
              </option>
            ))}
          </select>
          {selectedMicrocycleId && (
            <button
              onClick={savePronosticos}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-red-900/20 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-floppy-disk"></i>}
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`p-6 rounded-3xl text-sm font-bold uppercase tracking-widest text-center border ${
              message.type === 'success' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-500/30' : 'bg-red-900/30 text-red-400 border-red-500/30'
            }`}
          >
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {!selectedMicrocycleId ? (
        <div className="flex flex-col items-center justify-center py-32 bg-slate-900/30 rounded-[48px] border border-dashed border-white/10">
          <i className="fa-solid fa-calendar-days text-6xl text-slate-800 mb-6"></i>
          <p className="text-slate-500 font-bold uppercase tracking-widest">Selecciona un microciclo para comenzar el pronóstico</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-32">
          <i className="fa-solid fa-spinner fa-spin text-4xl text-red-600"></i>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {microcycleDays.map((day, index) => (
            <motion.div
              key={day}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="bg-slate-900 rounded-[40px] p-8 border border-white/5 shadow-2xl relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <span className="text-9xl font-black italic">{index + 1}</span>
              </div>
              
              <div className="relative z-10 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-black text-white uppercase italic leading-none">{new Date(day).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
                    <p className="text-red-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2">CONFIGURACIÓN DE CARGA DÍA {index + 1}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {METRICS.map(metric => (
                    <div key={metric.id} className="bg-black/20 p-6 rounded-3xl border border-white/5 hover:border-white/10 transition-all">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{metric.label}</span>
                        <div className="flex items-center gap-3">
                          <div className="bg-slate-800 rounded-xl p-3 border border-white/5 flex items-center gap-2">
                             <span className="text-[9px] text-slate-500 font-black uppercase">MIN</span>
                             <input 
                               type="number"
                               value={getDayValue(day, metric.minKey)}
                               onChange={(e) => handleInputChange(day, metric.minKey, e.target.value)}
                               className="bg-transparent text-white font-black text-xs w-20 outline-none text-right"
                             />
                          </div>
                          <div className="text-slate-600 font-bold">-</div>
                          <div className="bg-slate-800 rounded-xl p-3 border border-white/5 flex items-center gap-2">
                             <span className="text-[9px] text-slate-500 font-black uppercase">MAX</span>
                             <input 
                               type="number"
                               value={getDayValue(day, metric.maxKey)}
                               onChange={(e) => handleInputChange(day, metric.maxKey, e.target.value)}
                               className="bg-transparent text-white font-black text-xs w-20 outline-none text-right"
                             />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
