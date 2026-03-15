
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Category, CATEGORY_ID_MAP, REVERSE_CATEGORY_ID_MAP } from '../types';

interface AnnualActivity {
  id: string;
  fecha: string;
  actividad: string;
  categoria?: number;
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
  'Gira': 'bg-indigo-600',
  'Desayuno': 'bg-amber-400',
  'Almuerzo': 'bg-orange-400',
  'Cena': 'bg-orange-600',
  'Charla': 'bg-cyan-600',
  'Video': 'bg-violet-600',
  'Gimnasio': 'bg-pink-600',
  'Wellness': 'bg-teal-500'
};

const PlanificacionAnual: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 1));
  const [activities, setActivities] = useState<AnnualActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [isCopying, setIsCopying] = useState(false);

  // Formulario para nueva actividad
  const [newActivity, setNewActivity] = useState({
    type: 'Entrenamiento',
    category: Category.SUB_16,
    observation: ''
  });

  const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
        categoria: CATEGORY_ID_MAP[newActivity.category],
        observacion: newActivity.observation
      };

      if (editingActivityId) {
        const { error } = await supabase
          .from('anual_activities')
          .update(payload)
          .eq('id', editingActivityId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('anual_activities')
          .insert([payload]);
        if (error) throw error;
      }

      fetchMonthActivities();
      setSuccessMessage(editingActivityId ? "Actividad actualizada" : "Actividad agregada");
      setNewActivity({ ...newActivity, observation: '' });
      setEditingActivityId(null);
    } catch (err: any) {
      setErrorMessage("Error al guardar: " + err.message);
      setTimeout(() => setErrorMessage(null), 5000);
    }
  };

  const handleDeleteActivity = async (id: string | number, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    setShowConfirmDelete(String(id));
  };

  const confirmDelete = async () => {
    if (!showConfirmDelete) return;
    const id = showConfirmDelete;
    
    try {
      const { error } = await supabase
        .from('anual_activities')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setSuccessMessage("Actividad eliminada");
      setActivities(prev => prev.filter(a => String(a.id) !== String(id)));
      await fetchMonthActivities();
      setShowConfirmDelete(null);
    } catch (err: any) {
      console.error("Error al eliminar:", err);
      setErrorMessage("Error al eliminar: " + err.message);
      setTimeout(() => setErrorMessage(null), 5000);
      setShowConfirmDelete(null);
    }
  };

  const getCategoryDisplay = (cat?: number | string) => {
    if (!cat) return '';
    if (typeof cat === 'number') {
      const entry = Object.entries(CATEGORY_ID_MAP).find(([_, val]) => val === cat);
      return entry ? entry[0].replace('_', ' ').toUpperCase() : `ID: ${cat}`;
    }
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
              (!filterType || a.actividad === filterType) &&
              (!selectedCategoryId || a.categoria === selectedCategoryId)
            )
          });
        }

    return days;
  }, [currentDate, activities, filterType]);

  const monthName = currentDate.toLocaleString('es-ES', { month: 'long' }).toUpperCase();

  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

  const handleCopyDay = async (targetDate: string) => {
    const sourceDate = window.prompt("Ingresa la fecha de origen para copiar (AAAA-MM-DD):", targetDate);
    if (!sourceDate || sourceDate === targetDate) return;

    setIsCopying(true);
    try {
      // 1. Obtener actividades del día origen
      const { data: sourceActivities, error: fetchError } = await supabase
        .from('anual_activities')
        .select('*')
        .eq('fecha', sourceDate);

      if (fetchError) throw fetchError;
      if (!sourceActivities || sourceActivities.length === 0) {
        alert("No se encontraron actividades en la fecha de origen.");
        return;
      }

      // 2. Preparar nuevas actividades para el día destino
      const newActivities = sourceActivities.map(act => ({
        fecha: targetDate,
        actividad: act.actividad,
        categoria: act.categoria,
        observacion: act.observacion
      }));

      // 3. Insertar
      const { error: insertError } = await supabase
        .from('anual_activities')
        .insert(newActivities);

      if (insertError) throw insertError;

      setSuccessMessage(`Se copiaron ${newActivities.length} actividades con éxito.`);
      fetchMonthActivities();
    } catch (err: any) {
      setErrorMessage("Error al copiar día: " + err.message);
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setIsCopying(false);
    }
  };

  const startEditing = (act: AnnualActivity) => {
    setEditingActivityId(act.id);
    const categoryEnum = typeof act.categoria === 'number' 
      ? REVERSE_CATEGORY_ID_MAP[act.categoria] 
      : (act.categoria as Category);
      
    setNewActivity({
      type: act.actividad,
      category: categoryEnum || Category.SUB_16,
      observation: act.observacion || ''
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 relative transform-gpu">
      {/* HEADER DE CALENDARIO */}
      {errorMessage && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[700] animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-red-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-red-500">
            <i className="fa-solid fa-circle-exclamation text-lg"></i>
            <p className="text-xs font-black uppercase tracking-widest">{errorMessage}</p>
            <button onClick={() => setErrorMessage(null)} className="hover:scale-110 transition-transform">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[700] animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-emerald-500">
            <i className="fa-solid fa-circle-check text-lg"></i>
            <p className="text-xs font-black uppercase tracking-widest">{successMessage}</p>
            <button onClick={() => setSuccessMessage(null)} className="hover:scale-110 transition-transform">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
      )}

      {showConfirmDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-[#0b1220]/80 backdrop-blur-md" onClick={() => setShowConfirmDelete(null)}></div>
          <div className="relative bg-white p-10 rounded-[40px] shadow-2xl max-w-sm w-full text-center space-y-6 animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto text-3xl">
              <i className="fa-solid fa-trash-can"></i>
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">¿ELIMINAR ACTIVIDAD?</h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Esta acción no se puede deshacer.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirmDelete(null)} className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all">
                CANCELAR
              </button>
              <button onClick={confirmDelete} className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-red-900/20 hover:bg-red-700 transition-all">
                ELIMINAR
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* FILTROS DE ACTIVIDAD */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-2 custom-scrollbar">
        <button
          onClick={() => setFilterType(null)}
          className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${!filterType ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}`}
        >
          TODOS LOS TIPOS
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

      {/* FILTROS DE CATEGORÍA */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 custom-scrollbar">
        <button
          onClick={() => setSelectedCategoryId(null)}
          className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${!selectedCategoryId ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}`}
        >
          TODAS LAS CATEGORÍAS
        </button>
        {Object.entries(CATEGORY_ID_MAP).map(([label, id]) => (
          <button
            key={id}
            onClick={() => setSelectedCategoryId(id === selectedCategoryId ? null : id)}
            className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${selectedCategoryId === id ? 'bg-red-600 text-white border-red-600 shadow-md' : 'bg-white text-slate-400 border-slate-200 opacity-60 hover:opacity-100 hover:bg-slate-50'}`}
          >
            {label.replace('_', ' ')}
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
                className={`relative rounded-[32px] border transition-all cursor-pointer p-4 group min-h-[110px] flex flex-col justify-between ${
                  isSelected ? 'border-red-500 ring-4 ring-red-500/5 shadow-xl bg-white' : `${dayStyle} hover:shadow-lg`
                }`}
                onClick={() => { setSelectedDay(dayObj.date); setIsDrawerOpen(true); }}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-lg font-black tracking-tighter ${isToday ? 'text-red-600' : 'text-slate-400'}`}>{dayObj.day}</span>
                  <div className="flex gap-1">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleCopyDay(dayObj.date); }}
                      className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg bg-slate-100 text-slate-400 hover:text-blue-600 transition-all flex items-center justify-center"
                      title="Copiar de otro día"
                    >
                      <i className="fa-solid fa-copy text-[10px]"></i>
                    </button>
                    {dayObj.activities.length > 0 && (
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                    )}
                  </div>
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
                        <span className="text-[7px] font-black text-white bg-slate-900 px-1.5 py-0.5 rounded uppercase tracking-tighter">
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
          <div className="absolute inset-0 bg-[#0b1220]/60 backdrop-blur-sm" onClick={() => { setIsDrawerOpen(false); setEditingActivityId(null); }}></div>
          <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 overflow-hidden">
            <div className="bg-[#0b1220] p-10 text-white relative">
              <button onClick={() => { setIsDrawerOpen(false); setEditingActivityId(null); }} className="absolute top-10 right-10 text-white/30 hover:text-white transition-colors">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
              <h3 className="text-2xl font-black uppercase italic tracking-tighter leading-none mb-1">
                {editingActivityId ? 'EDITAR ACTIVIDAD' : 'GESTIÓN DEL DÍA'}
              </h3>
              <p className="text-red-500 text-[10px] font-black uppercase tracking-[0.3em]">{selectedDay}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
              {/* Formulario rápido */}
              <section className="space-y-6">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
                  {editingActivityId ? 'Modificar Datos' : 'Programar Actividad'}
                </h4>
                <form onSubmit={handleAddActivity} className="space-y-4">
                  <div className="w-full">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Tipo</label>
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
                      className="w-full bg-slate-50 p-4 rounded-2xl font-black text-xs outline-none border-none shadow-inner min-h-[120px] resize-none"
                      value={newActivity.observation}
                      onChange={e => setNewActivity({...newActivity, observation: e.target.value})}
                    />
                  </div>

                  <div className="flex gap-3">
                    {editingActivityId && (
                      <button 
                        type="button"
                        onClick={() => { setEditingActivityId(null); setNewActivity({...newActivity, observation: ''}); }}
                        className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all"
                      >
                        CANCELAR
                      </button>
                    )}
                    <button type="submit" className="flex-[2] py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-red-900/20 hover:bg-red-700 transition-all active:scale-95">
                      {editingActivityId ? 'ACTUALIZAR DATOS' : 'AGREGAR AL CALENDARIO'}
                    </button>
                  </div>
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
                      <div 
                        key={act.id} 
                        className={`bg-slate-50 p-4 rounded-[24px] border flex items-center justify-between group cursor-pointer transition-all ${editingActivityId === act.id ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:bg-white hover:shadow-lg'}`}
                        onClick={() => startEditing(act)}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-2 h-10 rounded-full ${TIPO_COLORS[act.actividad]}`}></div>
                          <div>
                            <p className="text-[11px] font-black text-slate-900 uppercase italic tracking-tight">
                              {act.actividad}
                            </p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                              {getCategoryDisplay(act.categoria)}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); startEditing(act); }} 
                            className="w-8 h-8 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                            title="Editar"
                          >
                            <i className="fa-solid fa-pen text-[10px]"></i>
                          </button>
                          <button 
                            type="button"
                            onClick={(e) => handleDeleteActivity(act.id, e)} 
                            className="w-8 h-8 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all shadow-sm"
                            title="Eliminar"
                          >
                            <i className="fa-solid fa-trash-can text-[10px]"></i>
                          </button>
                        </div>
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
