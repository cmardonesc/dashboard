
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User, UserRole } from '../types';
import { normalizeClub } from '../lib/utils';
import ClubBadge from './ClubBadge';

interface UserManagementAreaProps {
  onMenuChange?: (menu: any) => void;
}

const UserManagementArea: React.FC<UserManagementAreaProps> = () => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [pendingClubs, setPendingClubs] = useState<any[]>([]);
  const [dbClubs, setDbClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'clubs'>('users');
  const [msg, setMsg] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [sanitizing, setSanitizing] = useState(false);

  const [editingProfile, setEditingProfile] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: profs, error: pErr } = await supabase.from('profiles').select('*, club_name');
      const { data: plays, error: plErr } = await supabase.from('players').select('id_del_jugador, nombre, apellido1, club, id_club');
      const { data: clubs, error: cErr } = await supabase.from('clubes').select('*').order('nombre', { ascending: true });
      
      if (pErr) throw pErr;
      if (cErr) throw cErr;

      setProfiles(profs || []);
      setPlayers(plays || []);
      setDbClubs(clubs || []);

      // Calcular clubes pendientes (nombres en players que no tienen id_club)
      const pending = (plays || [])
        .filter(p => p.club && !p.id_club)
        .reduce((acc: any[], curr) => {
          const existing = acc.find(a => a.nombre === curr.club);
          if (existing) {
            existing.count++;
          } else {
            acc.push({ nombre: curr.club, count: 1 });
          }
          return acc;
        }, []);
      
      setPendingClubs(pending);
    } catch (err: any) {
      setMsg({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSanitizeClubs = async () => {
    if (!window.confirm('¿Deseas normalizar los nombres de los clubes en la tabla de jugadores para que coincidan con la tabla maestra?')) return;
    
    setSanitizing(true);
    setMsg({ text: 'Iniciando sanitización de clubes...', type: 'success' });

    try {
      // 1. Obtener clubes oficiales
      const { data: dbClubs, error: cErr } = await supabase.from('clubes').select('nombre').eq('activo', true);
      if (cErr) throw cErr;

      // 2. Obtener todos los jugadores
      const { data: allPlayers, error: plErr } = await supabase.from('players').select('id_del_jugador, club');
      if (plErr) throw plErr;

      let updatedCount = 0;

      for (const player of allPlayers || []) {
        if (!player.club) continue;

        const currentNorm = normalizeClub(player.club);
        
        // Buscar coincidencia en clubes oficiales
        const match = dbClubs?.find(c => normalizeClub(c.nombre) === currentNorm);

        if (match && match.nombre !== player.club) {
          // Actualizar si el nombre normalizado coincide pero el string es diferente
          const { error: uErr } = await supabase
            .from('players')
            .update({ club: match.nombre })
            .eq('id_del_jugador', player.id_del_jugador);
          
          if (!uErr) updatedCount++;
        }
      }

      setMsg({ text: `Sanitización completada. ${updatedCount} jugadores actualizados.`, type: 'success' });
      fetchData();
    } catch (err: any) {
      setMsg({ text: `Error en sanitización: ${err.message}`, type: 'error' });
    } finally {
      setSanitizing(false);
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
          id_del_jugador: editingProfile.id_del_jugador || null,
          club_name: editingProfile.club_name || null
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

  const handleApproveClub = async (clubName: string) => {
    if (!window.confirm(`¿Deseas crear "${clubName}" como un club oficial?`)) return;
    
    setLoading(true);
    try {
      const codigo = clubName.toLowerCase().replace(/\s+/g, '_').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      
      // 1. Crear en tabla clubes
      const { data: newClub, error: iErr } = await supabase
        .from('clubes')
        .insert({ nombre: clubName, codigo, activo: true })
        .select()
        .single();
      
      if (iErr) throw iErr;

      // 2. Actualizar jugadores
      const { error: uErr } = await supabase
        .from('players')
        .update({ id_club: newClub.id_club })
        .eq('club', clubName);
      
      if (uErr) throw uErr;

      setMsg({ text: `Club "${clubName}" oficializado correctamente.`, type: 'success' });
      fetchData();
    } catch (err: any) {
      setMsg({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleMergeClub = async (pendingName: string, targetClubId: number, targetClubName: string) => {
    if (!window.confirm(`¿Deseas unificar todos los registros de "${pendingName}" bajo el club oficial "${targetClubName}"?`)) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('players')
        .update({ 
          club: targetClubName,
          id_club: targetClubId 
        })
        .eq('club', pendingName);
      
      if (error) throw error;

      setMsg({ text: `Registros unificados bajo "${targetClubName}".`, type: 'success' });
      fetchData();
    } catch (err: any) {
      setMsg({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Panel de Gestión</h2>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Control de accesos y calidad de datos</p>
          
          <div className="flex gap-2 mt-6">
            <button 
              onClick={() => setActiveTab('users')}
              className={`px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
                activeTab === 'users' ? 'bg-[#0b1220] text-white shadow-lg' : 'bg-white text-slate-400 hover:bg-slate-50'
              }`}
            >
              Usuarios y Perfiles
            </button>
            <button 
              onClick={() => setActiveTab('clubs')}
              className={`px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                activeTab === 'clubs' ? 'bg-[#0b1220] text-white shadow-lg' : 'bg-white text-slate-400 hover:bg-slate-50'
              }`}
            >
              Clubes Pendientes
              {pendingClubs.length > 0 && (
                <span className="w-4 h-4 bg-red-600 text-white rounded-full flex items-center justify-center text-[8px] animate-pulse">
                  {pendingClubs.length}
                </span>
              )}
            </button>
          </div>
        </div>
        <div className="flex gap-4 mb-1">
          {activeTab === 'users' && (
            <button 
              onClick={handleSanitizeClubs} 
              disabled={sanitizing}
              className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                sanitizing ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-100'
              }`}
            >
              <i className={`fa-solid ${sanitizing ? 'fa-circle-notch animate-spin' : 'fa-wand-magic-sparkles'}`}></i>
              Sanitizar Clubes
            </button>
          )}
          <button onClick={fetchData} className="p-3 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
            <i className="fa-solid fa-rotate text-slate-400"></i>
          </button>
        </div>
      </div>

      {msg && (
        <div className={`p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
          {msg.text}
        </div>
      )}

      {activeTab === 'users' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ... existing user management UI ... */}
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
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        p.role === 'admin' ? 'bg-red-100 text-red-600' : 
                        p.role === 'staff' ? 'bg-blue-100 text-blue-600' : 
                        p.role === 'club' ? 'bg-emerald-100 text-emerald-600' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {p.role}
                      </span>
                      {p.role === 'club' && p.club_name && (
                        <div className="mt-1">
                          <ClubBadge clubName={p.club_name} clubs={dbClubs} logoSize="w-3 h-3" className="text-[8px] font-black text-slate-400 uppercase tracking-tighter" />
                        </div>
                      )}
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
                  <option value="club">Club (Visualizador)</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              {editingProfile.role === 'club' && (
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Nombre del Club</label>
                  <input 
                    type="text"
                    value={editingProfile.club_name || ''} 
                    onChange={e => setEditingProfile({...editingProfile, club_name: e.target.value})}
                    placeholder="Ej: Colo-Colo, U. de Chile..."
                    className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[8px] font-medium text-slate-400 ml-4 italic">Este nombre debe coincidir exactamente con el campo 'club' en la tabla de jugadores.</p>
                </div>
              )}

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
      ) : (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
          <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Sugerencias de Jugadores</h3>
                <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Clubes escritos manualmente que no están en la lista oficial</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Nombre Sugerido</th>
                    <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Jugadores</th>
                    <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {pendingClubs.map((c, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-4">
                        <p className="text-xs font-black text-slate-900 uppercase italic">{c.nombre}</p>
                      </td>
                      <td className="px-8 py-4">
                        <span className="px-3 py-1 bg-slate-100 rounded-full text-[9px] font-black text-slate-600 uppercase">
                          {c.count} {c.count === 1 ? 'Jugador' : 'Jugadores'}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-right flex justify-end gap-2">
                        <div className="relative group">
                          <button className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all">
                            Fusionar con...
                          </button>
                          <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-100 shadow-2xl rounded-2xl z-50 hidden group-hover:block p-2 max-h-60 overflow-y-auto">
                            <p className="text-[8px] font-black text-slate-400 uppercase p-2 border-b border-slate-50">Seleccionar Club Oficial</p>
                            {dbClubs.map(dc => (
                              <button 
                                key={dc.id_club}
                                onClick={() => handleMergeClub(c.nombre, dc.id_club, dc.nombre)}
                                className="w-full text-left px-3 py-2 text-[9px] font-bold text-slate-600 hover:bg-slate-50 rounded-lg transition-colors uppercase"
                              >
                                {dc.nombre}
                              </button>
                            ))}
                          </div>
                        </div>
                        <button 
                          onClick={() => handleApproveClub(c.nombre)}
                          className="px-4 py-2 bg-[#0b1220] text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all"
                        >
                          Oficializar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {pendingClubs.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-8 py-12 text-center">
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                          <i className="fa-solid fa-check"></i>
                        </div>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">No hay clubes pendientes de aprobación</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementArea;
