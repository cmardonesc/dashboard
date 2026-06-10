
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MatchDB, Category, CATEGORY_ID_MAP } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface MatchesAreaProps {
  selectedCategoryId: number;
}

const MatchesArea: React.FC<MatchesAreaProps> = ({ selectedCategoryId }) => {
  const [matches, setMatches] = useState<MatchDB[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [microcycles, setMicrocycles] = useState<any[]>([]);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [form, setForm] = useState<Partial<MatchDB>>({
    date: format(new Date(), 'yyyy-MM-dd'),
    competition_type: 'Amistoso Nacional',
    opponent: '',
    location: '',
    city: '',
    result: '',
    observations: ''
  });

  const COMP_TYPES = [
    'Amistoso Nacional',
    'Amistoso Internacional',
    'Sudamericano',
    'Mundial',
    'Torneo Internacional',
    'Partido Nacional (Liga/Copa)',
    'Otro'
  ];

  useEffect(() => {
    fetchMatches();
  }, [selectedCategoryId]);

  const autoResolveMicrocycles = async (matchesList: MatchDB[], microsList: any[]) => {
    const unqualifiedMatches = matchesList.filter(m => !m.microcycle_id);
    if (unqualifiedMatches.length === 0) return;

    try {
      let updatedCount = 0;
      for (const match of unqualifiedMatches) {
        const matchTime = new Date(match.date + 'T00:00:00').getTime();
        
        const matched = microsList.find(mc => {
          const start = new Date(mc.start_date + 'T00:00:00').getTime();
          const end = new Date(mc.end_date + 'T00:00:00').getTime();
          return matchTime >= start && matchTime <= end;
        });

        if (matched) {
          const { error } = await supabase
            .from('matches')
            .update({ microcycle_id: matched.id })
            .eq('id', match.id);
          
          if (!error) {
            match.microcycle_id = matched.id;
            updatedCount++;
          }
        }
      }

      if (updatedCount > 0) {
        console.log(`Auto-asociados ${updatedCount} partidos a microciclos.`);
        setMatches([...matchesList]);
      }
    } catch (err) {
      console.error("Error auto-resolving matches:", err);
    }
  };

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const { data: matchesData, error } = await supabase
        .from('matches')
        .select('*')
        .eq('category_id', selectedCategoryId)
        .order('date', { ascending: false });

      if (error) throw error;

      const { data: mcData } = await supabase
        .from('microcycles')
        .select('*')
        .eq('category_id', selectedCategoryId);

      const microsList = mcData || [];
      setMicrocycles(microsList);

      const matchesList = matchesData || [];
      setMatches(matchesList);

      // Auto-asociar partidos huérfanos a microciclos en segundo plano
      if (matchesList.length > 0 && microsList.length > 0) {
        autoResolveMicrocycles(matchesList, microsList);
      }
    } catch (err) {
      console.error("Error fetching matches:", err);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (match: MatchDB) => {
    setEditingMatchId(match.id || null);
    setErrorMsg(null);
    setForm({
      date: match.date || format(new Date(), 'yyyy-MM-dd'),
      competition_type: match.competition_type || 'Amistoso Nacional',
      opponent: match.opponent || '',
      location: match.location || '',
      city: match.city || '',
      result: match.result || '',
      observations: match.observations || '',
      microcycle_id: match.microcycle_id || undefined
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    try {
      let finalMicrocycleId = form.microcycle_id;

      // Autodetectar microciclo si no se seleccionó manualmente
      if (!finalMicrocycleId && form.date) {
        const matchTime = new Date(form.date + 'T00:00:00').getTime();
        const matched = microcycles.find(mc => {
          const start = new Date(mc.start_date + 'T00:00:00').getTime();
          const end = new Date(mc.end_date + 'T00:00:00').getTime();
          return matchTime >= start && matchTime <= end;
        });
        if (matched) {
          finalMicrocycleId = matched.id;
        }
      }

      // Payload limpio con columnas explícitas compatibles con Supabase
      const payload = {
        date: form.date,
        competition_type: form.competition_type || 'Amistoso Nacional',
        opponent: form.opponent || '',
        location: form.location || null,
        city: form.city || '',
        result: form.result || null,
        observations: form.observations || null,
        category_id: selectedCategoryId,
        microcycle_id: finalMicrocycleId || null
      };

      if (editingMatchId) {
        const { error } = await supabase
          .from('matches')
          .update(payload)
          .eq('id', editingMatchId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('matches')
          .insert([payload]);
        if (error) throw error;
      }

      setShowModal(false);
      setEditingMatchId(null);
      setErrorMsg(null);
      setForm({
        date: format(new Date(), 'yyyy-MM-dd'),
        competition_type: 'Amistoso Nacional',
        opponent: '',
        location: '',
        city: '',
        result: '',
        observations: ''
      });
      fetchMatches();
    } catch (err: any) {
      console.error("Error saving match:", err);
      setErrorMsg(err?.message || "Error desconocido al guardar el partido");
    } finally {
      setSaving(false);
    }
  };

  const deleteMatch = async (id: string) => {
    if (!window.confirm("¿Estás seguro de eliminar este partido?")) return;
    try {
      const { error } = await supabase.from('matches').delete().eq('id', id);
      if (error) throw error;
      fetchMatches();
    } catch (err) {
      console.error("Error deleting match:", err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3">
          <span className="w-2 h-6 bg-red-600 rounded-full"></span>
          Registro de Partidos
        </h3>
        <button 
          onClick={() => {
            setEditingMatchId(null);
            setErrorMsg(null);
            setForm({
              date: format(new Date(), 'yyyy-MM-dd'),
              competition_type: 'Amistoso Nacional',
              opponent: '',
              location: '',
              city: '',
              result: '',
              observations: ''
            });
            setShowModal(true);
          }}
          className="bg-[#0b1220] text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl hover:bg-red-600 transition-all"
        >
          <i className="fa-solid fa-plus"></i> Nuevo Partido
        </button>
      </div>

      <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm">
        {loading ? (
          <div className="py-20 text-center animate-pulse text-slate-400 font-black uppercase tracking-widest">Cargando Partidos...</div>
        ) : matches.length === 0 ? (
          <div className="py-20 text-center text-slate-300 font-black uppercase italic tracking-widest border-2 border-dashed border-slate-50 rounded-[32px]">
            No hay partidos registrados para esta categoría
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha / Tipo</th>
                  <th className="pb-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rival</th>
                  <th className="pb-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sede</th>
                  <th className="pb-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Resultado</th>
                  <th className="pb-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {matches.map((match) => (
                  <tr key={match.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="py-6">
                      <p className="text-[11px] font-black text-slate-900 uppercase italic leading-none">{format(new Date(match.date + 'T12:00:00'), 'dd MMM yyyy', { locale: es })}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest leading-none">{match.competition_type}</span>
                        {match.microcycle_id && (() => {
                          const mc = microcycles.find(m => m.id === match.microcycle_id);
                          if (!mc) return null;
                          return (
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider leading-none">
                              MC #{mc.micro_number || mc.id.toString().slice(0, 5)}
                            </span>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="py-6">
                      <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight">VS {match.opponent}</p>
                    </td>
                    <td className="py-6">
                      <p className="text-[10px] font-bold text-slate-500 uppercase italic tracking-tight">{match.city}{match.location ? `, ${match.location}` : ''}</p>
                    </td>
                    <td className="py-6 text-center">
                      <span className="bg-[#0b1220] text-white px-4 py-1.5 rounded-xl text-[11px] font-black italic tracking-tighter">
                        {match.result || 'S/R'}
                      </span>
                    </td>
                    <td className="py-6">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => startEdit(match)}
                          className="w-8 h-8 rounded-lg bg-slate-50 text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center shadow-sm"
                          title="Editar"
                        >
                          <i className="fa-solid fa-pen text-xs"></i>
                        </button>
                        <button 
                          onClick={() => deleteMatch(match.id!)}
                          className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all flex items-center justify-center shadow-sm"
                          title="Eliminar"
                        >
                          <i className="fa-solid fa-trash-can text-xs"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-[#0b1220]/90 transform-gpu animate-in fade-in duration-300 backdrop-blur-sm">
          <div className="bg-white w-full max-w-xl rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 transform-gpu">
            <div className="bg-[#0b1220] p-10 text-white relative">
              <button 
                onClick={() => {
                  setShowModal(false);
                  setEditingMatchId(null);
                }} 
                className="absolute top-8 right-8 text-white/20 hover:text-white transition-colors"
              >
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
              <h3 className="text-2xl font-black uppercase italic tracking-tighter">
                {editingMatchId ? 'Editar Partido' : 'Nuevo Partido'}
              </h3>
              <p className="text-red-500 font-black uppercase text-[10px] tracking-[0.3em] mt-2">Expediente de Competición</p>
            </div>
            <form onSubmit={handleSubmit} className="p-10 space-y-5 max-h-[65vh] overflow-y-auto custom-scrollbar">
              {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-5 py-4 rounded-2xl text-[11px] font-black uppercase tracking-wider flex items-center gap-3">
                  <i className="fa-solid fa-triangle-exclamation text-sm text-red-500 animate-pulse"></i>
                  <span>{errorMsg}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Fecha</label>
                  <input required type="date" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Tipo de Competición</label>
                  <select className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold" value={form.competition_type} onChange={e => setForm({...form, competition_type: e.target.value})}>
                    {COMP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Microciclo Asociado (Opcional)</label>
                <select className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold" value={form.microcycle_id || ''} onChange={e => setForm({...form, microcycle_id: e.target.value ? e.target.value : undefined})}>
                  <option value="">-- Autodetectar según Fecha --</option>
                  {microcycles.map(mc => (
                    <option key={mc.id} value={mc.id}>
                      {mc.type || 'Microciclo'} - #{mc.micro_number || mc.id.toString().slice(0, 5)} ({mc.start_date} al {mc.end_date})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Rival</label>
                <input required type="text" placeholder="Nombre de la selección o equipo" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-black uppercase shadow-inner" value={form.opponent} onChange={e => setForm({...form, opponent: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Sede / Recinto (Opcional)</label>
                  <input type="text" placeholder="Ej: Complejo Juan Pinto Durán" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold" value={form.location || ''} onChange={e => setForm({...form, location: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Ciudad</label>
                  <input type="text" placeholder="Ej: Santiago" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold" value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Resultado / Score (Opcional)</label>
                <input type="text" placeholder="Ej: 2-1" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold" value={form.result} onChange={e => setForm({...form, result: e.target.value})} />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Observaciones y Notas (Opcional)</label>
                <textarea rows={2} placeholder="Detalles tácticos, incidencias..." className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-xs font-bold" value={form.observations || ''} onChange={e => setForm({...form, observations: e.target.value})} />
              </div>

              <button 
                type="submit" 
                disabled={saving}
                className="w-full py-6 rounded-[32px] bg-[#0b1220] text-white text-xs font-black uppercase tracking-widest shadow-2xl hover:bg-red-600 transition-all flex items-center justify-center gap-3"
              >
                {saving ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-floppy-disk"></i>}
                {saving ? 'Guardando...' : editingMatchId ? 'Guardar Cambios' : 'Registrar Partido'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchesArea;
