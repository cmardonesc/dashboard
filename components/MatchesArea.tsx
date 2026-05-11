
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

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('category_id', selectedCategoryId)
        .order('date', { ascending: false });

      if (error) throw error;
      setMatches(data || []);
    } catch (err) {
      console.error("Error fetching matches:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        category_id: selectedCategoryId
      };

      const { error } = await supabase.from('matches').insert([payload]);
      if (error) throw error;

      setShowModal(false);
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
    } catch (err) {
      console.error("Error saving match:", err);
      alert("Error al guardar el partido");
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
          onClick={() => setShowModal(true)}
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
                      <p className="text-[9px] font-bold text-red-500 uppercase tracking-widest mt-1">{match.competition_type}</p>
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
                      <button 
                        onClick={() => deleteMatch(match.id!)}
                        className="w-8 h-8 rounded-lg bg-slate-50 text-slate-300 hover:text-red-600 hover:bg-red-50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100"
                      >
                        <i className="fa-solid fa-trash-can text-sm"></i>
                      </button>
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
              <button onClick={() => setShowModal(false)} className="absolute top-8 right-8 text-white/20 hover:text-white transition-colors"><i className="fa-solid fa-xmark text-xl"></i></button>
              <h3 className="text-2xl font-black uppercase italic tracking-tighter">Nuevo Partido</h3>
              <p className="text-red-500 font-black uppercase text-[10px] tracking-[0.3em] mt-2">Expediente de Competición</p>
            </div>
            <form onSubmit={handleSubmit} className="p-10 space-y-6">
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
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Rival</label>
                <input required type="text" placeholder="Nombre de la selección o equipo" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-black uppercase shadow-inner" value={form.opponent} onChange={e => setForm({...form, opponent: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Ciudad</label>
                  <input type="text" placeholder="Ej: Santiago" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold" value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Resultado (Opcional)</label>
                  <input type="text" placeholder="Ej: 2-1" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold" value={form.result} onChange={e => setForm({...form, result: e.target.value})} />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={saving}
                className="w-full py-6 rounded-[32px] bg-[#0b1220] text-white text-xs font-black uppercase tracking-widest shadow-2xl hover:bg-red-600 transition-all flex items-center justify-center gap-3"
              >
                {saving ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-floppy-disk"></i>}
                {saving ? 'Guardando...' : 'Registrar Partido'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchesArea;
