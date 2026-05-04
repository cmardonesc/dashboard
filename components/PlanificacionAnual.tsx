
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
  'ENTRENAMIENTO': 'bg-blue-600',
  'PARTIDO AMISTOSO': 'bg-red-500',
  'PARTIDO OFICIAL': 'bg-red-700',
  'EVALUACION FISICA': 'bg-emerald-600',
  'REUNION': 'bg-slate-700',
  'VISITA A CLUB': 'bg-amber-600',
  'VISITA PARTIDO CLUBES': 'bg-orange-500',
  'SUDAMERICANO': 'bg-yellow-500',
  'GIRA': 'bg-indigo-600',
  'MUNDIAL': 'bg-purple-700',
  'REGIONALES': 'bg-orange-600'
};

const MULTI_DAY_TYPES = ['SUDAMERICANO', 'GIRA', 'MUNDIAL', 'REGIONALES'];

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
    type: 'ENTRENAMIENTO',
    category: Category.SUB_16,
    observation: '',
    endDate: ''
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

    setLoading(true);
    try {
      const isMultiDay = MULTI_DAY_TYPES.includes(newActivity.type) && newActivity.endDate && newActivity.endDate > selectedDay;
      
      const basePayload = {
        actividad: newActivity.type,
        categoria: CATEGORY_ID_MAP[newActivity.category],
        observacion: newActivity.observation
      };

      if (editingActivityId) {
        const { error } = await supabase
          .from('anual_activities')
          .update({ ...basePayload, fecha: selectedDay })
          .eq('id', editingActivityId);
        if (error) throw error;
      } else if (isMultiDay) {
        // Generar rango de fechas
        const start = new Date(selectedDay + 'T12:00:00');
        const end = new Date(newActivity.endDate + 'T12:00:00');
        const payloads = [];
        
        let current = new Date(start);
        while (current <= end) {
          payloads.push({
            ...basePayload,
            fecha: current.toISOString().split('T')[0]
          });
          current.setDate(current.getDate() + 1);
        }

        const { error } = await supabase
          .from('anual_activities')
          .insert(payloads);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('anual_activities')
          .insert([{ ...basePayload, fecha: selectedDay }]);
        if (error) throw error;
      }

      await fetchMonthActivities();
      setSuccessMessage(editingActivityId ? "Actividad actualizada" : (isMultiDay ? "Evento multi-día programado" : "Actividad agregada"));
      setNewActivity({ ...newActivity, observation: '', endDate: '' });
      setEditingActivityId(null);
    } catch (err: any) {
      console.error("Error al guardar:", err);
      setErrorMessage("Error al guardar: " + err.message);
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setLoading(false);
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
    
    // Intentar convertir a número si es string
    const catNum = typeof cat === 'string' ? parseInt(cat, 10) : cat;
    
    if (typeof catNum === 'number' && !isNaN(catNum)) {
      const entry = Object.entries(CATEGORY_ID_MAP).find(([_, val]) => val === catNum);
      if (entry) return entry[0].replace('_', ' ').toUpperCase();
    }
    
    // Si no es un ID numérico conocido, devolver el string formateado
    return String(cat).replace('_', ' ').toUpperCase();
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
    const targetDateObj = new Date(targetDate + 'T12:00:00');
    const sourceInput = window.prompt(`Copiando hacia el ${targetDate}.\n\nIngresa el NÚMERO DE DÍA (1-31) del mes mostrado o la FECHA (AAAA-MM-DD) de origen:`);
    
    if (!sourceInput) return;

    let sourceDate = sourceInput.trim();
    const dayNum = parseInt(sourceDate, 10);
    
    // Si es un número entre 1 y 31, asumimos que es un día del mes que se está visualizando
    if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
      sourceDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    }

    if (sourceDate === targetDate) {
      alert("La fecha de origen y destino no pueden ser la misma.");
      return;
    }

    setIsCopying(true);
    try {
      // 1. Obtener actividades del día origen
      const { data: sourceActivities, error: fetchError } = await supabase
        .from('anual_activities')
        .select('*')
        .eq('fecha', sourceDate);

      if (fetchError) throw fetchError;
      if (!sourceActivities || sourceActivities.length === 0) {
        alert(`No se encontraron actividades en la fecha de origen: ${sourceDate}.\nVerifica que la fecha sea correcta.`);
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

      setSuccessMessage(`Se copiaron ${newActivities.length} actividades con éxito desde el día ${sourceDate}.`);
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
      observation: act.observacion || '',
      endDate: ''
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

      <div className="bg-white p-4 md:p-8 rounded-[32px] md:rounded-[40px] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto">
          <div className="w-12 h-12 md:w-14 md:h-14 bg-[#0b1220] rounded-2xl flex items-center justify-center text-white shadow-xl shrink-0">
            <i className="fa-solid fa-calendar-days text-lg md:text-xl"></i>
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase italic tracking-tighter">PLANIFICACIÓN <span className="text-red-600">{currentDate.getFullYear()}</span></h2>
            <p className="text-slate-400 text-[9px] md:text-xs font-bold uppercase tracking-widest mt-1">Gestión logística y técnica anual.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4 bg-slate-50 p-1.5 md:p-2 rounded-[20px] md:rounded-[24px] border border-slate-100 w-full md:w-auto justify-between md:justify-start">
          <button onClick={handlePrevMonth} className="w-8 h-8 md:w-10 md:h-10 rounded-xl hover:bg-white hover:shadow-sm text-slate-400 hover:text-red-600 transition-all">
            <i className="fa-solid fa-chevron-left text-[10px] md:text-xs"></i>
          </button>
          <div className="px-2 md:px-6 text-center min-w-[120px] md:min-w-[160px]">
            <span className="text-xs md:text-sm font-black text-[#0b1220] uppercase tracking-widest italic">{monthName}</span>
          </div>
          <button onClick={handleNextMonth} className="w-8 h-8 md:w-10 md:h-10 rounded-xl hover:bg-white hover:shadow-sm text-slate-400 hover:text-red-600 transition-all">
            <i className="fa-solid fa-chevron-right text-[10px] md:text-xs"></i>
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
      <div className="bg-white rounded-[32px] md:rounded-[48px] border border-slate-100 shadow-2xl overflow-hidden p-4 md:p-10">
        <div className="grid grid-cols-7 gap-1 md:gap-2 mb-4 md:mb-6">
          {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(d => (
            <div key={d} className="text-center py-1 md:py-2">
              <span className="hidden md:inline text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{d}</span>
              <span className="md:hidden text-[9px] font-black text-slate-400 uppercase tracking-widest">{d.substring(0, 1)}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 md:gap-2 min-h-[400px] md:min-h-[600px]">
          {calendarDays.map((dayObj, idx) => {
            if (!dayObj) return <div key={`empty-${idx}`} className="bg-slate-50/30 rounded-xl md:rounded-2xl"></div>;
            
            const isToday = dayObj.date === new Date().toISOString().split('T')[0];
            const isSelected = selectedDay === dayObj.date;
            
            // Detectar eventos especiales para dar estilo al día completo (independiente del filtro de tipo de actividad)
            const dayActivitiesForStyle = activities.filter(a => a.fecha === dayObj.date && (!selectedCategoryId || a.categoria === selectedCategoryId));
            const specialEvent = dayActivitiesForStyle.find(a => MULTI_DAY_TYPES.includes(a.actividad.toUpperCase()));
            
            let bgColor = 'bg-white';
            let borderColor = 'border-slate-50';
            let hoverBorder = 'hover:border-slate-200';
            
            if (specialEvent) {
              const type = specialEvent.actividad.toUpperCase();
              if (type === 'SUDAMERICANO') { bgColor = 'bg-yellow-50'; borderColor = 'border-yellow-200'; hoverBorder = 'hover:border-yellow-300'; }
              else if (type === 'GIRA') { bgColor = 'bg-indigo-50'; borderColor = 'border-indigo-200'; hoverBorder = 'hover:border-indigo-300'; }
              else if (type === 'MUNDIAL') { bgColor = 'bg-purple-50'; borderColor = 'border-purple-200'; hoverBorder = 'hover:border-purple-300'; }
              else if (type === 'REGIONALES') { bgColor = 'bg-orange-50'; borderColor = 'border-orange-200'; hoverBorder = 'hover:border-orange-300'; }
            } else if (isToday) {
              bgColor = 'bg-red-50/10';
            }

            return (
              <div 
                key={dayObj.date}
                className={`relative rounded-xl md:rounded-[32px] border transition-all cursor-pointer p-2 md:p-4 group min-h-[60px] md:min-h-[110px] flex flex-col justify-between ${
                  isSelected ? `border-red-500 ring-4 ring-red-500/5 shadow-xl ${bgColor}` : `${bgColor} ${borderColor} ${hoverBorder} hover:shadow-lg`
                }`}
                onClick={() => { setSelectedDay(dayObj.date); setIsDrawerOpen(true); }}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-sm md:text-lg font-black tracking-tighter ${isToday ? 'text-red-600' : 'text-slate-400'}`}>{dayObj.day}</span>
                  <div className="flex gap-1">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleCopyDay(dayObj.date); }}
                      className="hidden md:flex opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg bg-slate-100 text-slate-400 hover:text-blue-600 transition-all items-center justify-center"
                      title="Copiar de otro día"
                    >
                      <i className="fa-solid fa-copy text-[10px]"></i>
                    </button>
                    {dayObj.activities.length > 0 && (
                      <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-red-500 animate-pulse"></div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-0.5 md:gap-1 mt-1">
                  {dayObj.activities.slice(0, 5).map(act => (
                    <div key={act.id} className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full ${TIPO_COLORS[act.actividad.toUpperCase()] || 'bg-slate-300'}`} title={act.actividad}></div>
                  ))}
                  {dayObj.activities.length > 5 && (
                    <span className="text-[6px] md:text-[7px] font-black text-slate-400">+{dayObj.activities.length - 5}</span>
                  )}
                </div>

                <div className="hidden md:block mt-1.5 space-y-1 overflow-hidden">
                  {dayObj.activities.slice(0, 4).map(act => (
                    <div key={act.id} className="flex items-center justify-between gap-1">
                      <p className="text-[7px] font-black uppercase text-slate-800 italic truncate leading-none flex-1">
                        {act.actividad}
                      </p>
                      {act.categoria && (
                        <span className="text-[6px] font-black text-white bg-slate-900 px-1 py-0.5 rounded uppercase tracking-tighter shrink-0">
                          {getCategoryDisplay(act.categoria)}
                        </span>
                      )}
                    </div>
                  ))}
                  {dayObj.activities.length > 4 && (
                    <p className="text-[6px] font-black text-slate-400 uppercase tracking-widest text-center pt-1 border-t border-slate-50">
                      + {dayObj.activities.length - 4} más
                    </p>
                  )}
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
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Tipo de Actividad</label>
                    <select 
                      className="w-full bg-slate-50 p-4 rounded-2xl font-black text-xs outline-none border-none shadow-inner"
                      value={newActivity.type}
                      onChange={e => setNewActivity({...newActivity, type: e.target.value})}
                    >
                      <optgroup label="Actividades Diarias">
                        <option value="ENTRENAMIENTO">ENTRENAMIENTO</option>
                        <option value="PARTIDO AMISTOSO">PARTIDO AMISTOSO</option>
                        <option value="PARTIDO OFICIAL">PARTIDO OFICIAL</option>
                        <option value="EVALUACION FISICA">EVALUACION FISICA</option>
                        <option value="REUNION">REUNION</option>
                        <option value="VISITA A CLUB">VISITA A CLUB</option>
                        <option value="VISITA PARTIDO CLUBES">VISITA PARTIDO CLUBES</option>
                      </optgroup>
                      <optgroup label="Eventos Multi-día">
                        <option value="SUDAMERICANO">SUDAMERICANO</option>
                        <option value="GIRA">GIRA</option>
                        <option value="MUNDIAL">MUNDIAL</option>
                        <option value="REGIONALES">REGIONALES</option>
                      </optgroup>
                    </select>
                  </div>

                  {MULTI_DAY_TYPES.includes(newActivity.type) && !editingActivityId && (
                    <div className="w-full animate-in slide-in-from-top-2 duration-300">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Fecha de Término (Opcional)</label>
                      <input 
                        type="date"
                        min={selectedDay}
                        className="w-full bg-blue-50 p-4 rounded-2xl font-black text-xs outline-none border-none shadow-inner text-blue-600"
                        value={newActivity.endDate}
                        onChange={e => setNewActivity({...newActivity, endDate: e.target.value})}
                      />
                      <p className="text-[8px] font-bold text-blue-400 uppercase mt-2 px-2 italic">Se crearán registros automáticos para cada día del rango.</p>
                    </div>
                  )}

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
                          <div className={`w-2 h-10 rounded-full ${TIPO_COLORS[act.actividad.toUpperCase()] || 'bg-slate-300'}`}></div>
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
