
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User, UserRole } from '../types';

interface UserManagementAreaProps {
  onMenuChange?: (menu: any) => void;
}

const UserManagementArea: React.FC<UserManagementAreaProps> = () => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const [editingProfile, setEditingProfile] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: profs, error: pErr } = await supabase.from('profiles').select('*');
      const { data: plays, error: plErr } = await supabase.from('players').select('id_del_jugador, nombre, apellido1');
      
      if (pErr) throw pErr;
      setProfiles(profs || []);
      setPlayers(plays || []);
    } catch (err: any) {
      setMsg({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          role: editingProfile.role,
          id_del_jugador: editingProfile.id_del_jugador || null
        })
        .eq('id', editingProfile.id);

      if (error) throw error;
      setMsg({ text: 'Perfil actualizado correctamente.', type: 'success' });
      setEditingProfile(null);
      fetchData();
    } catch (err: any) {
      setMsg({ text: err.message, type: 'error' });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Gestión de Usuarios</h2>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Control de accesos y roles del sistema</p>
        </div>
        <button onClick={fetchData} className="p-3 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
          <i className="fa-solid fa-rotate text-slate-400"></i>
        </button>
      </div>

      {msg && (
        <div className={`p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-50 bg-slate-50/50">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Lista de Perfiles</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">ID Usuario (Auth)</th>
                  <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Rol</th>
                  <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Jugador Vinculado</th>
                  <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {profiles.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-4">
                      <p className="text-[10px] font-mono text-slate-400">{p.id}</p>
                    </td>
                    <td className="px-8 py-4">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${p.role === 'admin' ? 'bg-red-100 text-red-600' : p.role === 'staff' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                        {p.role}
                      </span>
                    </td>
                    <td className="px-8 py-4">
                      <p className="text-[10px] font-bold text-slate-600">
                        {p.id_del_jugador ? players.find(pl => pl.id_del_jugador === p.id_del_jugador)?.nombre || `ID: ${p.id_del_jugador}` : 'N/A'}
                      </p>
                    </td>
                    <td className="px-8 py-4 text-right">
                      <button onClick={() => setEditingProfile(p)} className="text-slate-400 hover:text-blue-600 transition-colors">
                        <i className="fa-solid fa-pen-to-square"></i>
                      </button>
                    </td>
                  </tr>
                ))}
                {profiles.length === 0 && !loading && (
                  <tr>
                    <td colSpan={4} className="px-8 py-12 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest">No hay perfiles registrados</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-8">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-8">
            {editingProfile ? 'Editar Perfil' : 'Información'}
          </h3>
          
          {editingProfile ? (
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Rol del Usuario</label>
                <select 
                  value={editingProfile.role} 
                  onChange={e => setEditingProfile({...editingProfile, role: e.target.value})}
                  className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="player">Jugador</option>
                  <option value="staff">Staff Técnico</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Vincular Jugador (Opcional)</label>
                <select 
                  value={editingProfile.id_del_jugador || ''} 
                  onChange={e => setEditingProfile({...editingProfile, id_del_jugador: e.target.value ? Number(e.target.value) : null})}
                  className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Ninguno</option>
                  {players.map(pl => (
                    <option key={pl.id_del_jugador} value={pl.id_del_jugador}>{pl.nombre} {pl.apellido1}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 py-4 bg-[#0b1220] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all">Guardar</button>
                <button type="button" onClick={() => setEditingProfile(null)} className="px-6 py-4 bg-slate-100 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
              </div>
            </form>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
                <i className="fa-solid fa-user-gear text-2xl"></i>
              </div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-relaxed">
                Selecciona un perfil de la lista para modificar su rol o vincularlo a un jugador de la base de datos.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserManagementArea;
