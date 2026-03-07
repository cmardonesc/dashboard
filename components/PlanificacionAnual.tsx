
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Category } from '../types';

interface AnnualActivity {
  id: string;
  fecha: string;
  actividad: 'Entrenamiento' | 'Partido' | 'Evaluación' | 'Viaje' | 'Reunión' | 'Evento' | 'Regional' | 'Sudamericano' | 'Gira';
  categoria?: string;
  observacion?: string;
}

const TIPO_COLORS: Record<string, string> = {
  'Entrenamiento': 'bg-blue-600',
  'Partido': 'bg-red-600',
  'Evaluación': 'bg-emerald-600',
  'Viaje': 'bg-amber-500',
  'Reunión': 'bg-slate-700',
  'Evento': 'bg-purple-600',
  'Regional': 'bg-orange-500',
  'Sudamericano': 'bg-yellow-500',
  'Gira': 'bg-indigo-600'
};

const PlanificacionAnual: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 1));
  const [activities, setActivities] = useState<AnnualActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [filterType, setFilterType] = useState<string | null>(null);

  // Formulario para nueva actividad
  const [newActivity, setNewActivity] = useState({
    type: 'Entrenamiento' as AnnualActivity['actividad'],
    category: Category.SUB_16,
    observation: ''
  });

  useEffect(() => {
    fetchMonthActivities();
  }, [currentDate]);

  const fetchMonthActivities = async () => {
    setLoading(true);
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];

    try {
      const { data, error } = await supabase
        .from('anual_activities')
        .select('*')
        .gte('fecha', start)
        .lte('fecha', end);

      if (error) throw error;
      setActivities(data || []);
    } catch (err) {
      console.error("Error al cargar planificación:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDay) return;

    try {
      const payload = {
        fecha: selectedDay,
        actividad: newActivity.type,
        categoria: newActivity.category,
        observacion: newActivity.observation
      };

      const { error } = await supabase.from('anual_activities').insert([payload]);
      if (error) throw error;

      fetchMonthActivities();
      setNewActivity({ ...newActivity, observation: '' });
    } catch (err: any) {
      alert("Error al guardar: " + err.message);
    }
  };

  const handleDeleteActivity = async (id: string | number, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log("Intentando borrar actividad ID:", id);

    if (!window.confirm("¿Estás seguro de que quieres eliminar esta actividad?")) return;
    
    try {
      const { error } = await supabase
        .from('anual_activities')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Actualizar estado localmente (comparando como string para seguridad)
      setActivities(prev => prev.filter(a => String(a.id) !== String(id)));
      
      // Recargar datos
      await fetchMonthActivities();
    } catch (err: any) {
      console.error("Error al eliminar:", err);
      alert("Error al eliminar: " + err.message);
    }
  };

  const getCategoryDisplay = (cat?: string) => {
    if (!cat) return '';
    return cat.replace('_', ' ').toUpperCase();
  };

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Ajustar primer día (Lunes = 1, Domingo = 0 -> Lunes = 0, Domingo = 6)
    const offset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    const days = [];

    // Relleno días mes anterior
    for (let i = 0; i < offset; i++) days.push(null);

    // Días mes actual
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        day: i,
        date: dateStr,
        activities: activities.filter(a => 
          a.fecha === dateStr && 
          (!filterType || a.actividad === filterType)
        )
      });
    }

    return days;
  }, [currentDate, activities, filterType]);

  const monthName = currentDate.toLocaleString('es-ES', { month: 'long' }).toUpperCase();

  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 relative transform-gpu">
      {/* HEADER DE CALENDARIO */}
      <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 bg-[#0b1220] rounded-2xl flex items-center justify-center text-white shadow-xl">
            <i className="fa-solid fa-calendar-days text-xl"></i>
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">PLANIFICACIÓN <span className="text-red-600">{currentDate.getFullYear()}</span></h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Gestión logística y técnica anual.</p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-[24px] border border-slate-100">
          <button onClick={handlePrevMonth} className="w-10 h-10 rounded-xl hover:bg-white hover:shadow-sm text-slate-400 hover:text-red-600 transition-all">
            <i className="fa-solid fa-chevron-left text-xs"></i>
          </button>
          <div className="px-6 text-center min-w-[160px]">
            <span className="text-sm font-black text-[#0b1220] uppercase tracking-widest italic">{monthName}</span>
          </div>
          <button onClick={handleNextMonth} className="w-10 h-10 rounded-xl hover:bg-white hover:shadow-sm text-slate-400 hover:text-red-600 transition-all">
            <i className="fa-solid fa-chevron-right text-xs"></i>
          </button>
        </div>
      </div>

      {/* FILTROS DE CATEGORÍA */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 custom-scrollbar">
        <button
          onClick={() => setFilterType(null)}
          className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${!filterType ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}`}
        >
          TODOS
        </button>
        {Object.entries(TIPO_COLORS).map(([type, colorClass]) => (
          <button
            key={type}
            onClick={() => setFilterType(type === filterType ? null : type)}
            className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 whitespace-nowrap ${filterType === type ? 'bg-white border-slate-900 text-slate-900 shadow-md' : 'bg-white text-slate-400 border-slate-200 opacity-60 hover:opacity-100 hover:bg-slate-50'}`}
          >
            <div className={`w-2 h-2 rounded-full ${colorClass}`}></div>
            {type}
          </button>
        ))}
      </div>

      {/* GRID DE CALENDARIO */}
      <div className="bg-white rounded-[48px] border border-slate-100 shadow-2xl overflow-hidden p-10">
        <div className="grid grid-cols-7 gap-2 mb-6">
          {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(d => (
            <div key={d} className="text-center py-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{d}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2 min-h-[600px]">
          {calendarDays.map((dayObj, idx) => {
            if (!dayObj) return <div key={`empty-${idx}`} className="bg-slate-50/30 rounded-2xl"></div>;
            
            const isToday = dayObj.date === new Date().toISOString().split('T')[0];
            const isSelected = selectedDay === dayObj.date;
            
            // Detectar eventos especiales para dar estilo al día completo
            const specialEvent = dayObj.activities.find(a => a.actividad === 'Sudamericano' || a.actividad === 'Gira');
            let dayStyle = 'bg-white border-slate-50 hover:border-slate-200';
            
            if (specialEvent?.actividad === 'Sudamericano') {
              dayStyle = 'bg-yellow-50 border-yellow-200 hover:border-yellow-300';
            } else if (specialEvent?.actividad === 'Gira') {
              dayStyle = 'bg-indigo-50 border-indigo-200 hover:border-indigo-300';
            } else if (isToday) {
              dayStyle = 'bg-red-50/10 border-slate-50';
            }

            return (
              <div 
                key={dayObj.date}
                onClick={() => { setSelectedDay(dayObj.date); setIsDrawerOpen(true); }}
                className={`relative rounded-[32px] border transition-all cursor-pointer p-4 group min-h-[110px] flex flex-col justify-between ${
                  isSelected ? 'border-red-500 ring-4 ring-red-500/5 shadow-xl bg-white' : `${dayStyle} hover:shadow-lg`
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-lg font-black tracking-tighter ${isToday ? 'text-red-600' : 'text-slate-400'}`}>{dayObj.day}</span>
                  {dayObj.activities.length > 0 && (
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-1 mt-2">
                  {dayObj.activities.slice(0, 3).map(act => (
                    <div key={act.id} className={`w-1.5 h-1.5 rounded-full ${TIPO_COLORS[act.actividad] || 'bg-slate-300'}`} title={act.actividad}></div>
                  ))}
                  {dayObj.activities.length > 3 && (
                    <span className="text-[7px] font-black text-slate-400">+{dayObj.activities.length - 3}</span>
                  )}
                </div>

                <div className="mt-2 space-y-1 overflow-hidden">
                  {dayObj.activities.slice(0, 2).map(act => (
                    <div key={act.id} className="flex items-center justify-between gap-1">
                      <p className="text-[8px] font-black uppercase text-slate-800 italic truncate leading-none flex-1">
                        {act.actividad}
                      </p>
                      {act.categoria && (
                        <span className="text-[7px] font-black text-slate-400 bg-slate-100 px-1 rounded uppercase">
                          {getCategoryDisplay(act.categoria)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PANEL LATERAL (DRAWER) */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-end animate-in fade-in duration-300 transform-gpu">
          <div className="absolute inset-0 bg-[#0b1220]/60 backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)}></div>
          <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 overflow-hidden">
            <div className="bg-[#0b1220] p-10 text-white relative">
              <button onClick={() => setIsDrawerOpen(false)} className="absolute top-10 right-10 text-white/30 hover:text-white transition-colors">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
              <h3 className="text-2xl font-black uppercase italic tracking-tighter leading-none mb-1">GESTIÓN DEL DÍA</h3>
              <p className="text-red-500 text-[10px] font-black uppercase tracking-[0.3em]">{selectedDay}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
              {/* Formulario rápido */}
              <section className="space-y-6">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Programar Actividad</h4>
                <form onSubmit={handleAddActivity} className="space-y-4">
                  <div className="w-full">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Tipo de Actividad</label>
                    <select 
                      className="w-full bg-slate-50 p-4 rounded-2xl font-black text-xs outline-none border-none shadow-inner"
                      value={newActivity.type}
                      onChange={e => setNewActivity({...newActivity, type: e.target.value as any})}
                    >
                      {Object.keys(TIPO_COLORS).map(tipo => <option key={tipo} value={tipo}>{tipo.toUpperCase()}</option>)}
                    </select>
                  </div>

                  <div className="w-full">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Categoría</label>
                    <select 
                      className="w-full bg-slate-50 p-4 rounded-2xl font-black text-xs outline-none border-none shadow-inner"
                      value={newActivity.category}
                      onChange={e => setNewActivity({...newActivity, category: e.target.value as any})}
                    >
                      {Object.values(Category).map(cat => <option key={cat} value={cat}>{cat.toUpperCase().replace('_', ' ')}</option>)}
                    </select>
                  </div>

                  <div className="w-full">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Observación</label>
                    <textarea 
                      placeholder="Escribe una observación..." 
                      className="w-full bg-slate-50 p-4 rounded-2xl font-black text-xs outline-none border-none shadow-inner min-h-[100px] resize-none"
                      value={newActivity.observation}
                      onChange={e => setNewActivity({...newActivity, observation: e.target.value})}
                    />
                  </div>

                  <button type="submit" className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-red-900/20 hover:bg-red-700 transition-all active:scale-95">
                    AGREGAR AL CALENDARIO
                  </button>
                </form>
              </section>

              {/* Lista de actividades del día */}
              <section className="space-y-6">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Cronograma del Día</h4>
                <div className="space-y-3">
                  {calendarDays.find(d => d?.date === selectedDay)?.activities.length === 0 ? (
                    <p className="text-[10px] text-slate-300 font-bold uppercase italic text-center py-10">Sin actividades agendadas.</p>
                  ) : (
                    calendarDays.find(d => d?.date === selectedDay)?.activities.map(act => (
                      <div key={act.id} className="bg-slate-50 p-4 rounded-[24px] border border-slate-100 flex items-center justify-between group hover:bg-white hover:shadow-lg transition-all">
                        <div className="flex items-center gap-4">
                          <div className={`w-2 h-10 rounded-full ${TIPO_COLORS[act.actividad]}`}></div>
                          <div>
                            <p className="text-[11px] font-black text-slate-900 uppercase italic tracking-tight">{act.actividad} - {act.categoria?.toUpperCase().replace('_', ' ')}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{act.observacion || 'Sin observación'}</p>
                          </div>
                        </div>
                        <button 
                          type="button"
                          onClick={(e) => handleDeleteActivity(act.id, e)} 
                          className="w-8 h-8 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all shadow-sm"
                          title="Eliminar actividad"
                        >
                          <i className="fa-solid fa-trash-can text-[10px]"></i>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default PlanificacionAnual;
