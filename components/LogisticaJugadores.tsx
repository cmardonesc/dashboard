
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { User, UserRole } from '../types';
import { useClubs } from '../lib/useClubs';

const LogisticaJugadores: React.FC = () => {
  const [players, setPlayers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('TODAS');
  const [filterClub, setFilterClub] = useState<string>('TODOS');
  const [filterPosition, setFilterPosition] = useState<string>('TODAS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Partial<User> | null>(null);
  const [saving, setSaving] = useState(false);

  const { clubs: dbClubs, loading: loadingClubs } = useClubs();

  const CLUBS = useMemo(() => {
    if (loadingClubs) return [];
    const names = dbClubs.map(c => c.nombre);
    // Asegurar que 'Extranjero' y 'S/C' estén si no vienen de la DB
    if (!names.includes('Extranjero')) names.push('Extranjero');
    if (!names.includes('S/C')) names.push('S/C');
    return names.sort();
  }, [dbClubs, loadingClubs]);

  const POSITIONS = [
    'Portero', 
    'Defensa Central', 
    'Defensa Lateral', 
    'Volante', 
    'Delantero Extremo', 
    'Centro Delantero', 
    'Media Punta', 
    'Sin definir'
  ];

  const fetchPlayers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) throw error;

      const mapped: User[] = (data || []).map((p: any) => ({
        id: `player-${p.id_del_jugador}`,
        id_del_jugador: p.id_del_jugador,
        name: `${p.nombre || ''} ${p.apellido1 || ''} ${p.apellido2 || ''}`.trim(),
        nombre: p.nombre,
        apellido1: p.apellido1,
        apellido2: p.apellido2,
        role: UserRole.PLAYER,
        club: p.club,
        position: p.posicion,
        anio: p.anio,
        category: '',
        fecha_nacimiento: p.fecha_nacimiento
      }));

      // Inferir categorías si es necesario
      const finalMapped = mapped.map(p => {
        if (!p.category && p.anio) {
          const age = 2026 - p.anio;
          if (age <= 13) p.category = 'sub_13';
          else if (age === 14) p.category = 'sub_14';
          else if (age === 15) p.category = 'sub_15';
          else if (age === 16) p.category = 'sub_16';
          else if (age === 17) p.category = 'sub_17';
          else if (age === 18) p.category = 'sub_18';
          else if (age <= 20) p.category = 'sub_20';
          else if (age <= 21) p.category = 'sub_21';
          else if (age <= 23) p.category = 'sub_23';
          else p.category = 'adulta';
        }
        return p;
      });

      setPlayers(finalMapped);
    } catch (err) {
      console.error('Error fetching players:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    players.forEach(p => {
      if (p.anio) cats.add(p.anio.toString());
    });
    return Array.from(cats).sort((a, b) => b.localeCompare(a));
  }, [players]);

  const filteredPlayers = useMemo(() => {
    return players.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (p.club || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'TODAS' || p.anio?.toString() === filterCategory;
      const matchesClub = filterClub === 'TODOS' || p.club === filterClub;
      const matchesPosition = filterPosition === 'TODAS' || p.position === filterPosition;
      
      return matchesSearch && matchesCategory && matchesClub && matchesPosition;
    });
  }, [players, searchTerm, filterCategory, filterClub, filterPosition]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer?.nombre || !editingPlayer?.apellido1) return;
    
    setSaving(true);
    try {
      const payload = {
        nombre: editingPlayer.nombre,
        apellido1: editingPlayer.apellido1,
        apellido2: editingPlayer.apellido2,
        club: editingPlayer.club,
        posicion: editingPlayer.position,
        fecha_nacimiento: editingPlayer.fecha_nacimiento
      };

      if (editingPlayer.id_del_jugador) {
        // Update
        const { error } = await supabase
          .from('players')
          .update(payload)
          .eq('id_del_jugador', editingPlayer.id_del_jugador);
        if (error) throw error;
      } else {
        // Create
        const { error } = await supabase
          .from('players')
          .insert([payload]);
        if (error) throw error;
      }

      setIsModalOpen(false);
      setEditingPlayer(null);
      fetchPlayers();
    } catch (err) {
      console.error('Error saving player:', err);
      alert('Error al guardar el jugador. Revisa la consola.');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (player: User) => {
    setEditingPlayer(player);
    setIsModalOpen(true);
  };

  const openCreate = () => {
    setEditingPlayer({
      nombre: '',
      apellido1: '',
      apellido2: '',
      club: '',
      position: '',
      anio: new Date().getFullYear(),
      fecha_nacimiento: ''
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Gestión de Jugadores</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Base de Datos Central • Supabase Sync</p>
          </div>
          <button 
            onClick={openCreate}
            className="bg-[#0b1220] text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-slate-900/10 flex items-center gap-2 self-start md:self-auto"
          >
            <i className="fa-solid fa-plus"></i>
            Nuevo Jugador
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
            <input 
              type="text" 
              placeholder="Buscar por nombre..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-slate-50 border-none rounded-2xl px-12 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500 w-full"
            />
          </div>

          <select 
            value={filterClub}
            onChange={e => setFilterClub(e.target.value)}
            className="bg-slate-50 border-none rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500 w-full md:col-span-2"
          >
            <option value="TODOS">Todos los Clubes</option>
            {CLUBS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select 
            value={filterPosition}
            onChange={e => setFilterPosition(e.target.value)}
            className="bg-slate-50 border-none rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500 w-full md:col-span-2"
          >
            <option value="TODAS">Todas las Posiciones</option>
            {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Jugador</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Club</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Posición</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <i className="fa-solid fa-circle-notch animate-spin text-red-600 text-2xl"></i>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cargando base de datos...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredPlayers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No se encontraron jugadores</p>
                  </td>
                </tr>
              ) : (
                filteredPlayers.map((player) => (
                  <tr key={player.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 font-black italic text-xs group-hover:bg-red-50 group-hover:text-red-600 transition-colors">
                          {player.nombre?.charAt(0)}{player.apellido1?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900 uppercase italic">{player.name}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">ID: {player.id_del_jugador}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-[11px] font-black text-slate-700 uppercase">{player.club || 'S/C'}</p>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-[11px] font-black text-slate-700 uppercase">{player.position || 'S/D'}</p>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button 
                        onClick={() => openEdit(player)}
                        className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl hover:bg-[#0b1220] hover:text-white transition-all"
                      >
                        <i className="fa-solid fa-pen-to-square text-xs"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Section */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#0b1220]/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-[#0b1220] p-10 flex justify-between items-center text-white">
              <div>
                <h3 className="text-2xl font-black uppercase italic tracking-tighter">
                  {editingPlayer?.id_del_jugador ? 'Editar Jugador' : 'Nuevo Jugador'}
                </h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Formulario de Registro Técnico</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <i className="fa-solid fa-xmark text-2xl"></i>
              </button>
            </div>

            <form onSubmit={handleSave} className="p-10 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nombre</label>
                  <input 
                    required
                    type="text" 
                    value={editingPlayer?.nombre || ''}
                    onChange={e => setEditingPlayer(prev => ({ ...prev!, nombre: e.target.value }))}
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Apellido 1</label>
                  <input 
                    required
                    type="text" 
                    value={editingPlayer?.apellido1 || ''}
                    onChange={e => setEditingPlayer(prev => ({ ...prev!, apellido1: e.target.value }))}
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Apellido 2</label>
                  <input 
                    type="text" 
                    value={editingPlayer?.apellido2 || ''}
                    onChange={e => setEditingPlayer(prev => ({ ...prev!, apellido2: e.target.value }))}
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Club</label>
                  <select 
                    value={editingPlayer?.club || ''}
                    onChange={e => setEditingPlayer(prev => ({ ...prev!, club: e.target.value }))}
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Seleccionar Club</option>
                    {CLUBS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Posición</label>
                  <select 
                    value={editingPlayer?.position || ''}
                    onChange={e => setEditingPlayer(prev => ({ ...prev!, position: e.target.value }))}
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Seleccionar Posición</option>
                    {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Fecha Nacimiento</label>
                  <input 
                    type="date" 
                    value={editingPlayer?.fecha_nacimiento || ''}
                    onChange={e => setEditingPlayer(prev => ({ ...prev!, fecha_nacimiento: e.target.value }))}
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-5 rounded-2xl bg-slate-100 text-slate-500 font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-5 rounded-2xl bg-[#CF1B2B] text-white font-black uppercase tracking-widest text-[10px] hover:bg-red-700 transition-all shadow-xl shadow-red-900/20 disabled:opacity-50"
                >
                  {saving ? 'GUARDANDO...' : 'GUARDAR JUGADOR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogisticaJugadores;
