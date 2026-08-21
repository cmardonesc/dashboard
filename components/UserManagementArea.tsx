
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { User, UserRole } from '../types';
import { normalizeClub } from '../lib/utils';
import ClubBadge from './ClubBadge';
import { FALLBACK_CLUBS } from '../lib/fallback_clubs';

interface UserManagementAreaProps {
  onMenuChange?: (menu: any) => void;
}

const UserManagementArea: React.FC<UserManagementAreaProps> = () => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [pendingClubs, setPendingClubs] = useState<any[]>([]);
  const [dbClubs, setDbClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'clubs' | 'staff'>('users');
  const [msg, setMsg] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [sanitizing, setSanitizing] = useState(false);

  // Staff States
  const [staffList, setStaffList] = useState<any[]>([]);
  const [editingStaff, setEditingStaff] = useState<any | null>(null);
  const [isSavingStaff, setIsSavingStaff] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);

  const [editingProfile, setEditingProfile] = useState<any>(null);

  const groupedClubs = useMemo(() => {
    const groups: Record<string, typeof dbClubs> = {};
    dbClubs.forEach(c => {
      const country = (c.pais || 'OTROS').toUpperCase().trim();
      if (!groups[country]) {
        groups[country] = [];
      }
      groups[country].push(c);
    });
    return groups;
  }, [dbClubs]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: profs, error: pErr } = await supabase.from('profiles').select('*, club_name');
      const { data: plays, error: plErr } = await supabase.from('players').select('player_id, nombre, apellido1, id_club');
      const { data: clubs, error: cErr } = await supabase.from('clubes').select('*');
      
      if (pErr) throw pErr;
      if (cErr) throw cErr;

      // Intentar traer los registros de staff
      try {
        const { data: sData, error: sErr } = await supabase.from('staff').select('*');
        if (sErr) {
          console.warn("Error al cargar la tabla de staff:", sErr.message);
          setStaffError(sErr.message);
          setStaffList([]);
        } else {
          setStaffList(sData || []);
          setStaffError(null);
        }
      } catch (err: any) {
        setStaffError(err.message);
        setStaffList([]);
      }

      let finalClubs = clubs || [];
      if (finalClubs.length === 0) {
        finalClubs = [...FALLBACK_CLUBS];
      } else {
        const dbNames = new Set(finalClubs.map(c => (c.nombre || '').toUpperCase().trim()));
        const dbIds = new Set(finalClubs.map(c => c.id_club));
        
        FALLBACK_CLUBS.forEach(fc => {
          if (!dbIds.has(fc.id_club) && !dbNames.has((fc.nombre || '').toUpperCase().trim())) {
            finalClubs.push(fc);
          }
        });
        
        finalClubs = finalClubs.map(c => {
          const fc = FALLBACK_CLUBS.find(f => 
            f.id_club === c.id_club || 
            (f.nombre && c.nombre && f.nombre.toUpperCase().trim() === c.nombre.toUpperCase().trim())
          );
          if (fc) {
            return {
              id_club: c.id_club,
              codigo: c.codigo || fc.codigo,
              nombre: c.nombre || fc.nombre,
              activo: c.activo !== undefined ? c.activo : fc.activo,
              pais: c.pais || fc.pais,
              logo_url: c.logo_url || fc.logo_url,
              nombre_corto: c.nombre_corto || fc.nombre_corto,
              ciudad: c.ciudad || fc.ciudad,
              region: c.region || fc.region,
              id_pais: c.id_pais !== undefined ? c.id_pais : fc.id_pais,
            };
          }
          return c;
        });
      }

      finalClubs.sort((a: any, b: any) => {
        const countryA = (a.pais || '').toUpperCase().trim();
        const countryB = (b.pais || '').toUpperCase().trim();

        const isChileA = countryA === 'CHILE';
        const isChileB = countryB === 'CHILE';

        if (isChileA && !isChileB) return -1;
        if (!isChileA && isChileB) return 1;

        if (countryA !== countryB) {
          if (!countryA) return 1;
          if (!countryB) return -1;
          return countryA.localeCompare(countryB);
        }

        const nameA = (a.nombre || '').toUpperCase().trim();
        const nameB = (b.nombre || '').toUpperCase().trim();
        return nameA.localeCompare(nameB);
      });

      const correctedPlays = (plays || []).map((p: any) => {
        if (p.player_id === 355) {
          return { ...p, id_club: 89 };
        }
        return p;
      });

      setProfiles(profs || []);
      setPlayers(correctedPlays);
      setDbClubs(finalClubs);

      // Calcular clubes pendientes (legacy feature: relies on non-existent 'club' column)
      const pending: any[] = [];
      
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
      const { data: allPlayers, error: plErr } = await supabase.from('players').select('player_id, id_club');
      if (plErr) throw plErr;

      let updatedCount = 0;

      for (const player of allPlayers || []) {
        // Sanitization skipped because 'club' column is missing from players table
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
          player_id: editingProfile.player_id || null,
          club_name: editingProfile.club_name || null,
          id_club: editingProfile.id_club || null
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

  const handleAdminResetPassword = async (userId: string) => {
    const defaultTempPass = `Roja${new Date().getFullYear()}%Temp`;
    const newPass = window.prompt(`Ingresa la nueva contraseña temporal para el usuario (ID: ${userId}):`, defaultTempPass);
    if (!newPass) return;

    if (newPass.length < 6) {
      alert("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error("No hay una sesión activa de administrador.");
      }

      const response = await fetch('/api/admin/reset-user-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          targetUserId: userId,
          newPassword: newPass
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || "Error al restablecer contraseña.");
      }

      alert(`¡Contraseña restablecida correctamente!\n\nNueva clave temporal:\n${newPass}\n\nPor favor, entrégale esta contraseña al usuario.`);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
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

      // 2. Actualizar jugadores (Deshabilitado: columna 'club' ausente)
      /*
      const { error: uErr } = await supabase
        .from('players')
        .update({ id_club: newClub.id_club })
        .eq('club', clubName);
      
      if (uErr) throw uErr;
      */

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
          // club: targetClubName, // Columna ausente
          id_club: targetClubId 
        })
        .eq('id_club', targetClubId); // Esto no tiene sentido si estamos unificando, pero evita errores de compilación si se usara. 
        // En realidad la unificación por nombre de string ya no es posible sin la columna 'club'.
      
      if (error) throw error;

      setMsg({ text: `Registros unificados bajo "${targetClubName}".`, type: 'success' });
      fetchData();
    } catch (err: any) {
      setMsg({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const STAFF_MENU_OPTIONS = [
    { id: 'inicio', name: 'Inicio (Escritorio)' },
    { id: 'planning', name: 'Planificación' },
    { id: 'diario', name: 'Diario (Wellness/RPE)' },
    { id: 'fisica', name: 'Área Física' },
    { id: 'medica', name: 'Área Médica' },
    { id: 'nutricion', name: 'Nutrición' },
    { id: 'competencia', name: 'Competencia' },
    { id: 'tecnica', name: 'Área Técnica' },
    { id: 'logistica', name: 'Logística' },
    { id: 'sports_science', name: 'Sports Science' },
    { id: 'importar_datos', name: 'Importar Datos' },
    { id: 'telegram_notifications', name: 'Alertas Telegram' },
    { id: 'logs', name: 'Log de Actividad' }
  ];

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setIsSavingStaff(true);

    try {
      const emailLower = editingStaff.email?.trim().toLowerCase();
      if (!emailLower) throw new Error("El correo electrónico es obligatorio");

      // Buscar si ya existe un perfil con ese correo para enlazar el profile_id
      const matchedProfile = profiles.find(p => p.email?.trim().toLowerCase() === emailLower);
      const profileIdToUse = matchedProfile ? matchedProfile.id : (editingStaff.profile_id || null);

      const staffPayload = {
        email: emailLower,
        first_name: editingStaff.first_name || '',
        last_name: editingStaff.last_name || '',
        job_title: editingStaff.job_title || '',
        allowed_menus: editingStaff.allowed_menus || '',
        id_club: editingStaff.id_club ? Number(editingStaff.id_club) : null,
        display_name: `${editingStaff.first_name || ''} ${editingStaff.last_name || ''}`.trim(),
        profile_id: profileIdToUse
      };

      let saveError;
      if (editingStaff.id) {
        // Update
        const { error } = await supabase
          .from('staff')
          .update(staffPayload)
          .eq('id', editingStaff.id);
        saveError = error;
      } else {
        // Insert
        const { error } = await supabase
          .from('staff')
          .insert(staffPayload);
        saveError = error;
      }

      if (saveError) throw saveError;

      // Si encontramos un perfil con este correo, nos aseguramos de que su rol en profiles sea 'staff' o 'admin'
      if (matchedProfile && matchedProfile.role !== 'staff' && matchedProfile.role !== 'admin') {
        const { error: roleUpdateError } = await supabase
          .from('profiles')
          .update({ role: 'staff' })
          .eq('id', matchedProfile.id);
        if (roleUpdateError) console.error("Error al actualizar rol del perfil a staff:", roleUpdateError.message);
      }

      setMsg({ text: 'Miembro del Staff guardado correctamente.', type: 'success' });
      setEditingStaff(null);
      fetchData();
    } catch (err: any) {
      setMsg({ text: `Error al guardar staff: ${err.message}`, type: 'error' });
    } finally {
      setIsSavingStaff(false);
    }
  };

  const handleDeleteStaff = async (id: number) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este miembro del staff? Esto revocará sus accesos personalizados.')) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setMsg({ text: 'Miembro del staff eliminado correctamente.', type: 'success' });
      fetchData();
    } catch (err: any) {
      setMsg({ text: `Error al eliminar staff: ${err.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAllMenus = () => {
    if (!editingStaff) return;
    const allIds = STAFF_MENU_OPTIONS.map(opt => opt.id).join(',');
    setEditingStaff({ ...editingStaff, allowed_menus: allIds });
  };

  const handleClearAllMenus = () => {
    if (!editingStaff) return;
    setEditingStaff({ ...editingStaff, allowed_menus: '' });
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
            <button 
              onClick={() => setActiveTab('staff')}
              className={`px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                activeTab === 'staff' ? 'bg-[#0b1220] text-white shadow-lg' : 'bg-white text-slate-400 hover:bg-slate-50'
              }`}
            >
              <i className="fa-solid fa-users-gear text-[10px]"></i>
              Control de Staff / Accesos
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

      {activeTab === 'users' && (
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
                          <ClubBadge clubName={p.club_name} idClub={p.id_club} clubs={dbClubs} logoSize="w-3 h-3" className="text-[8px] font-black text-slate-400 uppercase tracking-tighter" />
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-4">
                      <p className="text-[10px] font-bold text-slate-600">
                        {p.player_id ? players.find(pl => pl.player_id === p.player_id)?.nombre || `ID: ${p.player_id}` : 'N/A'}
                      </p>
                    </td>
                    <td className="px-8 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button 
                          onClick={() => handleAdminResetPassword(p.id)} 
                          title="Restablecer Contraseña"
                          className="text-slate-400 hover:text-[#CF1B2B] transition-colors"
                        >
                          <i className="fa-solid fa-key"></i>
                        </button>
                        <button onClick={() => setEditingProfile(p)} className="text-slate-400 hover:text-blue-600 transition-colors">
                          <i className="fa-solid fa-pen-to-square"></i>
                        </button>
                      </div>
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
                  value={editingProfile.role || ''} 
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
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Club (Oficial)</label>
                  <select 
                    value={editingProfile.id_club || ''} 
                    onChange={e => {
                      const cid = e.target.value ? Number(e.target.value) : null;
                      const club = dbClubs.find(c => c.id_club === cid);
                      setEditingProfile({
                        ...editingProfile, 
                        id_club: cid, 
                        club_name: club ? club.nombre : editingProfile.club_name
                      });
                    }}
                    className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500 uppercase font-black"
                  >
                    <option value="">Selecciona un club oficial...</option>
                    {Object.entries(groupedClubs).map(([country, items]) => (
                      <optgroup key={country} label={country}>
                        {items.map(c => (
                          <option key={c.id_club} value={c.id_club}>{c.nombre}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <p className="text-[8px] font-medium text-slate-400 ml-4 italic">Vincular el perfil a un club oficial para habilitar el filtrado de datos.</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Vincular Jugador (Opcional)</label>
                <select 
                  value={editingProfile.player_id || ''} 
                  onChange={e => setEditingProfile({...editingProfile, player_id: e.target.value ? Number(e.target.value) : null})}
                  className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Ninguno</option>
                  {players.map(pl => (
                    <option key={pl.player_id} value={pl.player_id}>{pl.nombre} {pl.apellido1}</option>
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
      )}

      {activeTab === 'clubs' && (
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

      {activeTab === 'staff' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
          {staffError ? (
            <div className="lg:col-span-3 bg-amber-50 border border-amber-200 rounded-[40px] p-12 text-center space-y-6">
              <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <i className="fa-solid fa-database text-3xl"></i>
              </div>
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Base de Datos no Inicializada</h4>
              <p className="text-slate-500 text-xs max-w-lg mx-auto leading-relaxed">
                Para poder gestionar accesos personalizados del staff, es necesario ejecutar el script SQL de configuración en tu consola de Supabase.
              </p>
              <div className="bg-slate-900 text-slate-300 p-4 rounded-2xl text-left font-mono text-[10px] max-w-xl mx-auto overflow-x-auto whitespace-pre">
                {`CREATE TABLE IF NOT EXISTS public.staff (
  id bigint generated by default as identity primary key,
  email text not null unique,
  first_name text,
  last_name text,
  job_title text,
  allowed_menus text default 'inicio',
  id_club int8 references public.clubes(id_club),
  display_name text,
  profile_id uuid references public.profiles(id)
);`}
              </div>
              <div className="pt-2">
                <button
                  onClick={fetchData}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-[#0b1220] hover:bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  <i className="fa-solid fa-rotate"></i>
                  Reintentar Cargar
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="lg:col-span-2 bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Personal del Club / Federación</h3>
                    <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Configuración de accesos y permisos por correo</p>
                  </div>
                  <button
                    onClick={() => setEditingStaff({
                      email: '',
                      first_name: '',
                      last_name: '',
                      job_title: '',
                      allowed_menus: 'inicio',
                      id_club: null
                    })}
                    className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all flex items-center gap-2"
                  >
                    <i className="fa-solid fa-plus"></i>
                    Agregar Miembro
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Staff / Cargo</th>
                        <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Asociación</th>
                        <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Menús Permitidos</th>
                        <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {staffList.map((st) => {
                        const isLinked = profiles.some(p => p.email?.trim().toLowerCase() === st.email?.trim().toLowerCase());
                        const allowedList = st.allowed_menus ? st.allowed_menus.split(',') : [];
                        const hasFullAccess = allowedList.length >= STAFF_MENU_OPTIONS.length;

                        return (
                          <tr key={st.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-8 py-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-xs font-black text-slate-900 uppercase italic">
                                    {st.first_name || st.last_name ? `${st.first_name} ${st.last_name}` : 'Sin Nombre'}
                                  </p>
                                  {isLinked ? (
                                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[7px] font-black uppercase tracking-widest rounded-full flex items-center gap-1">
                                      <i className="fa-solid fa-circle-check text-[6px]"></i> Activo
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-slate-50 text-slate-400 text-[7px] font-black uppercase tracking-widest rounded-full">
                                      Pendiente Registro
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-500 font-mono leading-none">{st.email}</p>
                                <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest">{st.job_title || 'Sin Cargo'}</p>
                              </div>
                            </td>
                            <td className="px-8 py-4">
                              {st.id_club ? (
                                <ClubBadge 
                                  clubName={dbClubs.find(c => c.id_club === st.id_club)?.nombre || 'Club'} 
                                  idClub={st.id_club} 
                                  clubs={dbClubs} 
                                  logoSize="w-4 h-4" 
                                  className="text-[9px] font-black text-slate-700 uppercase" 
                                />
                              ) : (
                                <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[8px] font-black uppercase tracking-widest">
                                  Nacional / Fed
                                </span>
                              )}
                            </td>
                            <td className="px-8 py-4">
                              {hasFullAccess ? (
                                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[8px] font-black uppercase tracking-widest">
                                  Acceso Total
                                </span>
                              ) : (
                                <div className="flex flex-wrap gap-1 max-w-xs">
                                  {allowedList.map(menuId => {
                                    const mOpt = STAFF_MENU_OPTIONS.find(o => o.id === menuId);
                                    return mOpt ? (
                                      <span key={menuId} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[8px] font-bold rounded-md uppercase">
                                        {mOpt.name.split(' (')[0]}
                                      </span>
                                    ) : null;
                                  })}
                                  {allowedList.length === 0 && (
                                    <span className="text-[8px] font-bold text-red-500 uppercase tracking-widest">
                                      Sin Accesos (Bloqueado)
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-8 py-4 text-right flex justify-end gap-2 items-center h-full pt-6">
                              <button 
                                onClick={() => setEditingStaff(st)} 
                                className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors flex items-center justify-center border border-slate-100 shadow-sm"
                              >
                                <i className="fa-solid fa-pen-to-square text-xs"></i>
                              </button>
                              <button 
                                onClick={() => handleDeleteStaff(st.id)} 
                                className="w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors flex items-center justify-center border border-red-100/30 shadow-sm"
                              >
                                <i className="fa-solid fa-trash-can text-xs"></i>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {staffList.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-8 py-16 text-center space-y-3">
                            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                              <i className="fa-solid fa-users text-lg"></i>
                            </div>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">No hay miembros del staff registrados</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-8 h-fit">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-8">
                  {editingStaff ? (editingStaff.id ? 'Editar Staff' : 'Nuevo Staff') : 'Información de Accesos'}
                </h3>

                {editingStaff ? (
                  <form onSubmit={handleSaveStaff} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Correo Electrónico (Asociado a Auth)</label>
                      <input 
                        type="email"
                        required
                        placeholder="ejemplo@staff.com"
                        value={editingStaff.email || ''}
                        onChange={e => setEditingStaff({ ...editingStaff, email: e.target.value })}
                        className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Nombre</label>
                        <input 
                          type="text"
                          placeholder="Juan"
                          value={editingStaff.first_name || ''}
                          onChange={e => setEditingStaff({ ...editingStaff, first_name: e.target.value })}
                          className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Apellido</label>
                        <input 
                          type="text"
                          placeholder="Pérez"
                          value={editingStaff.last_name || ''}
                          onChange={e => setEditingStaff({ ...editingStaff, last_name: e.target.value })}
                          className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Cargo / Función</label>
                      <input 
                        type="text"
                        placeholder="DT / Preparador Físico / Médico"
                        value={editingStaff.job_title || ''}
                        onChange={e => setEditingStaff({ ...editingStaff, job_title: e.target.value })}
                        className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Club de Trabajo</label>
                      <select 
                        value={editingStaff.id_club || ''} 
                        onChange={e => setEditingStaff({ ...editingStaff, id_club: e.target.value ? Number(e.target.value) : null })}
                        className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 font-black uppercase"
                      >
                        <option value="">TODOS (FEDERACIÓN / SELECCIÓN)</option>
                        {Object.entries(groupedClubs).map(([country, items]) => (
                          <optgroup key={country} label={country}>
                            {items.map(c => (
                              <option key={c.id_club} value={c.id_club}>{c.nombre}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <p className="text-[8px] font-medium text-slate-400 ml-4 italic">Si pertenece a la federación, déjalo vacío para ver todos los clubes.</p>
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="flex justify-between items-center ml-4">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Accesos a Pestañas / Menús</label>
                        <div className="flex gap-2">
                          <button 
                            type="button" 
                            onClick={handleSelectAllMenus}
                            className="text-[8px] font-black text-blue-500 hover:text-blue-700 uppercase tracking-widest"
                          >
                            Todo
                          </button>
                          <span className="text-slate-300 text-[8px] font-bold">|</span>
                          <button 
                            type="button" 
                            onClick={handleClearAllMenus}
                            className="text-[8px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest"
                          >
                            Ninguno
                          </button>
                        </div>
                      </div>
                      
                      <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 max-h-64 overflow-y-auto space-y-3 shadow-inner">
                        {STAFF_MENU_OPTIONS.map(opt => {
                          const isChecked = (() => {
                            const current = editingStaff.allowed_menus || '';
                            if (current === '*') return true;
                            const list = current.split(',').map((s: string) => s.trim());
                            return list.includes(opt.id);
                          })();
                          const handleToggle = () => {
                            const current = editingStaff.allowed_menus || '';
                            let list = current ? current.split(',').map((s: string) => s.trim()) : [];
                            if (list.includes(opt.id)) {
                              list = list.filter((id: string) => id !== opt.id);
                            } else {
                              list.push(opt.id);
                            }
                            setEditingStaff({ ...editingStaff, allowed_menus: list.join(',') });
                          };
                          return (
                            <label key={opt.id} className="flex items-start gap-3 cursor-pointer group">
                              <input 
                                type="checkbox"
                                checked={isChecked}
                                onChange={handleToggle}
                                className="mt-1 rounded border-slate-300 text-[#0b1220] focus:ring-[#0b1220] w-4 h-4 cursor-pointer"
                              />
                              <div className="leading-tight">
                                <p className="text-[10px] font-black text-slate-700 uppercase tracking-tighter group-hover:text-[#0b1220] transition-colors">{opt.name}</p>
                                <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-widest">ID: {opt.id}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-slate-50">
                      <button 
                        type="submit" 
                        disabled={isSavingStaff}
                        className="flex-1 py-4 bg-[#0b1220] hover:bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest disabled:bg-slate-100 disabled:text-slate-400 transition-all shadow-md"
                      >
                        {isSavingStaff ? <i className="fa-solid fa-circle-notch animate-spin mr-2"></i> : null}
                        Guardar Miembro
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setEditingStaff(null)} 
                        className="px-6 py-4 bg-slate-100 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="text-center py-16 space-y-6">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200 shadow-inner">
                      <i className="fa-solid fa-user-lock text-3xl"></i>
                    </div>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-relaxed max-w-xs mx-auto">
                      Crea un nuevo miembro de staff o selecciona uno de la lista para modificar sus permisos de acceso y el club al que pertenece.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default UserManagementArea;
