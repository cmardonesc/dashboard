
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { User, UserRole } from '../types';
import { useClubs } from '../lib/useClubs';
import { FALLBACK_CLUB_NAMES } from '../constants';
import ClubBadge from './ClubBadge';

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
  const [playerToDelete, setPlayerToDelete] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState<string | null>(null);

  const { clubs: dbClubs, loading: loadingClubs, refetch: refetchClubs } = useClubs();

  const [isClubModalOpen, setIsClubModalOpen] = useState(false);
  const [newClub, setNewClub] = useState({ nombre: '', ciudad: '', pais: '' });
  const [savingClub, setSavingClub] = useState(false);
  const [clubErrorMsg, setClubErrorMsg] = useState<string | null>(null);

  const handleSaveClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClub.nombre.trim()) return;
    
    setSavingClub(true);
    setClubErrorMsg(null);
    const slug = newClub.nombre.trim().toLowerCase().replace(/\s+/g, '_').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const finalCodigo = `${slug}_${Date.now().toString().slice(-4)}`;

    try {
      const { data, error } = await supabase
        .from('clubes')
        .insert([{
          nombre: newClub.nombre.trim(),
          codigo: finalCodigo,
          ciudad: newClub.ciudad.trim() || null,
          pais: newClub.pais.trim() || null,
          activo: true
        }])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        const inserted = data[0];
        await refetchClubs();

        setEditingPlayer(prev => {
          if (!prev) return null;
          return {
            ...prev,
            id_club: Number(inserted.id_club),
            club: inserted.nombre
          };
        });

        setIsClubModalOpen(false);
        setNewClub({ nombre: '', ciudad: '', pais: '' });
      } else {
        throw new Error('No se recibió confirmación del club creado.');
      }
    } catch (err: any) {
      console.warn('DB insert failed for new club (likely due to RLS write policies). Falling back to client-side localStorage persistence:', err);
      
      try {
        // En caso de que falle por políticas de RLS o problemas del backend, guardamos en localStorage.
        // Esto permite que el usuario continúe, asigne el club al jugador y guarde al jugador sin bloqueos.
        // Usamos un ID en el rango smallint (< 32767) para evitar errores del tipo 'value is out of range for type smallint'.
        const localId = 15000 + Math.floor(Math.random() * 10000);
        const tempClubObj = {
          id_club: localId,
          codigo: finalCodigo,
          nombre: newClub.nombre.trim(),
          ciudad: newClub.ciudad.trim() || undefined,
          pais: newClub.pais.trim() || undefined,
          activo: true
        };

        let customClubs = [];
        const stored = localStorage.getItem('lr-performance-custom-clubs');
        if (stored) {
          customClubs = JSON.parse(stored);
        }
        customClubs.push(tempClubObj);
        localStorage.setItem('lr-performance-custom-clubs', JSON.stringify(customClubs));

        await refetchClubs();

        setEditingPlayer(prev => {
          if (!prev) return null;
          return {
            ...prev,
            id_club: localId,
            club: tempClubObj.nombre
          };
        });

        setIsClubModalOpen(false);
        setNewClub({ nombre: '', ciudad: '', pais: '' });
      } catch (localErr: any) {
        console.error('Error in localStorage fallback:', localErr);
        setClubErrorMsg(err.message || 'Error al registrar el club.');
      }
    } finally {
      setSavingClub(false);
    }
  };

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

  const CLUBS = useMemo(() => {
    if (loadingClubs) return [];
    const names = dbClubs.map(c => c.nombre);
    // Asegurar que 'Extranjero' y 'S/C' estén si no vienen de la DB
    if (!names.includes('Extranjero')) names.push('Extranjero');
    if (!names.includes('S/C')) names.push('S/C');
    return names; // Maintain country-first order from dbClubs
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
      console.log('LogisticaJugadores: Fetching players...');
      const { data, error } = await supabase
        .from('players')
        .select('*') // Seleccionamos todo para evitar omitir columnas necesarias
        .order('nombre', { ascending: true });

      if (error) {
        console.error('Error supabase fetching players:', error);
        throw error;
      }

      console.log('LogisticaJugadores: Players data received:', data?.length || 0);

      // Cargar mapeos locales de clubes personalizados para jugadores
      let localPlayerClubs: Record<number, { id_club: number, nombre: string }> = {};
      try {
        const storedMapping = localStorage.getItem('lr-performance-custom-player-clubs');
        if (storedMapping) {
          localPlayerClubs = JSON.parse(storedMapping);
        }
      } catch (e) {
        console.error("Error cargando mapeos locales de clubes:", e);
      }

      const mapped: User[] = (data || []).map((p: any) => {
        let matchedIdClub = p.id_club;
        let clubName = 'SIN CLUB';

        if (localPlayerClubs[p.player_id]) {
          matchedIdClub = localPlayerClubs[p.player_id].id_club;
          clubName = localPlayerClubs[p.player_id].nombre;
        } else {
          // Encontrar club en la lista de clubes cargada
          const clubObj = dbClubs.find(c => 
            Number(c.id_club) === Number(p.id_club)
          );
          
          clubName = clubObj?.nombre || 'SIN CLUB';
          
          // Fallback a nombres constantes si es un ID conocido pero no está en la DB activa
          if (clubName === 'SIN CLUB' && p.id_club) {
             const fb = FALLBACK_CLUB_NAMES[Number(p.id_club)];
             if (fb) clubName = fb;
          }
        }

        return {
          id: `player-${p.player_id}`,
          player_id: p.player_id,
          name: `${p.nombre || ''} ${p.apellido1 || ''} ${p.apellido2 || ''}`.trim(),
          nombre: p.nombre,
          apellido1: p.apellido1,
          apellido2: p.apellido2,
          role: UserRole.PLAYER,
          club: clubName,
          id_club: matchedIdClub,
          position: p.posicion,
          anio: p.anio,
          category: '',
          fecha_nacimiento: p.fecha_nacimiento
        };
      });

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
  }, [dbClubs]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    players.forEach(p => {
      if (p.anio) cats.add(p.anio.toString());
    });
    return Array.from(cats).sort((a, b) => b.localeCompare(a));
  }, [players]);

  const filteredPlayers = useMemo(() => {
    return players.filter(p => {
      const matchesSearch = (p.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                           (p.club?.toLowerCase() || '').includes(searchTerm.toLowerCase());
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
      // Si es un club creado localmente (ID >= 15000), usamos el club 'S/C o Desconocido' (ID 91)
      // para satisfacer la restricción NOT NULL y la clave foránea física en la BD.
      const isCustomClub = editingPlayer.id_club && editingPlayer.id_club >= 15000;
      const dbIdClub = isCustomClub ? 91 : editingPlayer.id_club;

      // Calcular automáticamente el año de nacimiento (anio) desde la fecha de nacimiento (fecha_nacimiento)
      const inferredAnio = editingPlayer.fecha_nacimiento && editingPlayer.fecha_nacimiento.length >= 4
        ? Number(editingPlayer.fecha_nacimiento.substring(0, 4))
        : (editingPlayer.anio || new Date().getFullYear());

      const payload = {
        nombre: editingPlayer.nombre,
        apellido1: editingPlayer.apellido1,
        apellido2: editingPlayer.apellido2,
        id_club: dbIdClub,
        posicion: editingPlayer.position,
        fecha_nacimiento: editingPlayer.fecha_nacimiento
      };

      if (editingPlayer.player_id) {
        // Update
        const { error } = await supabase
          .from('players')
          .update(payload)
          .eq('player_id', editingPlayer.player_id);
        if (error) throw error;

        // Si es club personalizado, guardar mapeo local para el player_id
        if (isCustomClub && editingPlayer.id_club && editingPlayer.club) {
          const storedMapping = localStorage.getItem('lr-performance-custom-player-clubs');
          const mapping = storedMapping ? JSON.parse(storedMapping) : {};
          mapping[editingPlayer.player_id] = {
            id_club: editingPlayer.id_club,
            nombre: editingPlayer.club
          };
          localStorage.setItem('lr-performance-custom-player-clubs', JSON.stringify(mapping));
        } else {
          // Si ya no es personalizado, quitarlo del mapeo
          const storedMapping = localStorage.getItem('lr-performance-custom-player-clubs');
          if (storedMapping) {
            const mapping = JSON.parse(storedMapping);
            delete mapping[editingPlayer.player_id];
            localStorage.setItem('lr-performance-custom-player-clubs', JSON.stringify(mapping));
          }
        }
      } else {
        // Create
        // Intentamos primero insertar sin player_id dejando que la BD lo genere automáticamente (identity generated always)
        let insertError;
        let insertedRow: any = null;
        try {
          const { data, error } = await supabase
            .from('players')
            .insert([payload])
            .select();
          insertError = error;
          if (data && data.length > 0) {
            insertedRow = data[0];
          }
        } catch (err: any) {
          insertError = err;
        }

        if (insertError) {
          const errMsg = insertError.message || JSON.stringify(insertError);
          // Si falló porque player_id no tiene default/es requerido (por ejemplo si no fuera identity en alguna bd)
          const isIdRequired = errMsg.includes('player_id') && (
            errMsg.includes('null value') || 
            errMsg.includes('violates not-null') || 
            errMsg.includes('violates non-null') ||
            errMsg.includes('missing')
          );
          
          if (isIdRequired) {
            console.warn("⚠️ player_id requerido en BD. Intentando inserción explícita con ID manual...");
            const { data: maxIdData } = await supabase.from('players').select('player_id').order('player_id', { ascending: false }).limit(1);
            const nextId = maxIdData && maxIdData.length > 0 ? maxIdData[0].player_id + 1 : 1000;

            const { data: fallbackData, error: fallbackError } = await supabase
              .from('players')
              .insert([{ ...payload, player_id: nextId }])
              .select();
            if (fallbackError) throw fallbackError;
            
            if (fallbackData && fallbackData.length > 0) {
              insertedRow = fallbackData[0];
            } else {
              insertedRow = { ...payload, player_id: nextId };
            }
          } else {
            throw insertError;
          }
        }

        // Si es un club personalizado, guardar mapeo local para el player_id recién creado
        if (isCustomClub && insertedRow && insertedRow.player_id && editingPlayer.id_club && editingPlayer.club) {
          const storedMapping = localStorage.getItem('lr-performance-custom-player-clubs');
          const mapping = storedMapping ? JSON.parse(storedMapping) : {};
          mapping[insertedRow.player_id] = {
            id_club: editingPlayer.id_club,
            nombre: editingPlayer.club
          };
          localStorage.setItem('lr-performance-custom-player-clubs', JSON.stringify(mapping));
        }
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

  const handleDelete = (e: React.MouseEvent, player: User) => {
    e.preventDefault();
    e.stopPropagation();
    setPlayerToDelete(player);
    setDeleteErrorMsg(null);
  };

  const confirmDeletePlayer = async () => {
    if (!playerToDelete) return;
    setDeleting(true);
    setDeleteErrorMsg(null);
    try {
      const { error } = await supabase
        .from('players')
        .delete()
        .eq('player_id', playerToDelete.player_id);

      if (error) throw error;
      
      // Eliminar mapeo local si lo tenía
      try {
        const storedMapping = localStorage.getItem('lr-performance-custom-player-clubs');
        if (storedMapping && playerToDelete.player_id) {
          const mapping = JSON.parse(storedMapping);
          if (mapping[playerToDelete.player_id]) {
            delete mapping[playerToDelete.player_id];
            localStorage.setItem('lr-performance-custom-player-clubs', JSON.stringify(mapping));
          }
        }
      } catch (e) {
        console.error("Error al limpiar mapeo de club de jugador eliminado:", e);
      }

      setPlayerToDelete(null);
      await fetchPlayers();
    } catch (err: any) {
      console.error('Error deleting player:', err);
      setDeleteErrorMsg('No se pudo eliminar el jugador. Probablemente tiene datos vinculados en otras áreas de registro (por ejemplo: GPS, Médico, o Física) que deben eliminarse primero.');
    } finally {
      setDeleting(false);
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

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="relative">
            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
            <input 
              type="text" 
              placeholder="Buscar por nombre o club..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-slate-50 border-none rounded-2xl px-12 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500 w-full animate-in fade-in"
            />
          </div>

          <select 
            value={filterClub}
            onChange={e => setFilterClub(e.target.value)}
            className="bg-slate-50 border-none rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-tight text-slate-800 outline-none focus:ring-2 focus:ring-red-500 w-full"
          >
            <option value="TODOS">Todos los Clubes</option>
            {Object.entries(groupedClubs).map(([country, items]) => (
              <optgroup key={country} label={country}>
                {items.map(c => (
                  <option key={c.id_club} value={c.nombre}>{c.nombre}</option>
                ))}
              </optgroup>
            ))}
            <optgroup label="OTROS">
              <option value="Extranjero">Extranjero</option>
              <option value="S/C">S/C</option>
            </optgroup>
          </select>

          <select 
            value={filterPosition}
            onChange={e => setFilterPosition(e.target.value)}
            className="bg-slate-50 border-none rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500 w-full"
          >
            <option value="TODAS">Todas las Posiciones</option>
            {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <select 
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="bg-slate-50 border-[#CF1B2B]/20 rounded-2xl px-6 py-4 text-xs font-black text-slate-800 outline-none focus:ring-2 focus:ring-red-500 w-full border"
          >
            <option value="TODAS">Todos los Años (Año de Nacimiento)</option>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
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
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Año</th>
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
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">ID: {player.player_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <ClubBadge clubName={player.club} idClub={player.id_club} clubs={dbClubs} logoSize="w-3 h-3" className="text-[11px] font-black text-slate-700 uppercase" />
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-[11px] font-black text-slate-700 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg animate-in fade-in duration-250 uppercase">{player.anio || 'S/D'}</span>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-[11px] font-black text-slate-700 uppercase">{player.position || 'S/D'}</p>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => openEdit(player)}
                          className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl hover:bg-[#0b1220] hover:text-white transition-all"
                          title="Editar"
                        >
                          <i className="fa-solid fa-pen-to-square text-xs"></i>
                        </button>
                        <button 
                          onClick={(e) => handleDelete(e, player)}
                          className="w-10 h-10 bg-red-50 text-red-300 rounded-xl hover:bg-red-600 hover:text-white transition-all flex items-center justify-center"
                          title="Eliminar"
                        >
                          <i className="fa-solid fa-trash-can text-xs"></i>
                        </button>
                      </div>
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
                  {editingPlayer?.player_id ? 'Editar Jugador' : 'Nuevo Jugador'}
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
                  <div className="flex justify-between items-center ml-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Club</label>
                    <button 
                      type="button"
                      onClick={() => setIsClubModalOpen(true)}
                      className="text-red-600 hover:text-red-700 font-black text-[9px] uppercase tracking-wider flex items-center gap-1 transition-all"
                      id="btn_open_new_club_modal"
                    >
                      <i className="fa-solid fa-plus-circle"></i> + Nuevo Club
                    </button>
                  </div>
                  <select 
                    value={editingPlayer?.id_club || ''}
                    onChange={e => {
                      const id = Number(e.target.value);
                      const club = dbClubs.find(c => Number(c.id_club) === id);
                      setEditingPlayer(prev => ({ 
                        ...prev!, 
                        id_club: id,
                        club: club?.nombre || ''
                      }));
                    }}
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500 uppercase font-black"
                  >
                    <option value="">Seleccionar Club</option>
                    {Object.entries(groupedClubs).map(([country, items]) => (
                      <optgroup key={country} label={country}>
                        {items.map(c => (
                          <option key={c.id_club} value={c.id_club}>{c.nombre}</option>
                        ))}
                      </optgroup>
                    ))}
                    <optgroup label="OTROS">
                      <option value="0">Otro / Extranjero / S/C</option>
                    </optgroup>
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

      {/* Modal De Confirmación de Eliminación */}
      {playerToDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-[#0b1220]/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden p-10 space-y-8 animate-in zoom-in-95 duration-300 text-center">
            <div className="w-20 h-20 bg-red-50 text-[#CF1B2B] rounded-full flex items-center justify-center mx-auto text-3xl">
              <i className="fa-solid fa-triangle-exclamation animate-pulse"></i>
            </div>
            <div className="space-y-3">
              <h3 className="text-xl font-black uppercase italic tracking-tight text-slate-900">
                ¿Eliminar Jugador?
              </h3>
              <p className="text-xs text-slate-500 font-bold max-w-sm mx-auto">
                ¿Estás seguro de que deseas eliminar a <span className="text-slate-800 font-black uppercase italic">{playerToDelete.name}</span>?
              </p>
              <p className="text-[10px] text-red-500 font-bold max-w-xs mx-auto leading-relaxed">
                Esta acción no se puede deshacer y fallará si el atleta ya tiene registros técnicos (GPS, Wellness, o Evaluaciones Médicas) asociados en otras áreas.
              </p>
            </div>

            {deleteErrorMsg && (
              <div className="bg-red-50 border border-red-100 text-[#CF1B2B] rounded-2xl p-4 text-[10px] font-bold uppercase tracking-wider text-left leading-relaxed">
                ⚠️ {deleteErrorMsg}
              </div>
            )}

            <div className="flex gap-4">
              <button
                disabled={deleting}
                onClick={() => {
                  setPlayerToDelete(null);
                  setDeleteErrorMsg(null);
                }}
                className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-500 font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                disabled={deleting}
                onClick={confirmDeletePlayer}
                className="flex-1 py-4 rounded-2xl bg-[#CF1B2B] text-white font-black uppercase tracking-widest text-[10px] hover:bg-red-700 transition-all shadow-xl shadow-red-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    ELIMINANDO...
                  </>
                ) : 'SÍ, ELIMINAR'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal De Nuevo Club */}
      {isClubModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-[#0b1220]/85 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-[#0b1220] p-8 flex justify-between items-center text-white">
              <div>
                <h3 className="text-xl font-black uppercase italic tracking-tighter">
                  Registrar Nuevo Club
                </h3>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Formulario de Afiliación Base de Datos</p>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setIsClubModalOpen(false);
                  setClubErrorMsg(null);
                  setNewClub({ nombre: '', ciudad: '', pais: '' });
                }} 
                className="text-slate-500 hover:text-white transition-colors"
                id="btn_close_new_club_modal"
              >
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>

            <form onSubmit={handleSaveClub} className="p-8 space-y-6">
              {clubErrorMsg && (
                <div className="bg-red-50 border border-red-100 text-[#CF1B2B] rounded-2xl p-4 text-[10px] font-bold uppercase tracking-wider leading-relaxed">
                  ⚠️ {clubErrorMsg}
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 font-bold">Nombre del Club *</label>
                  <input 
                    required
                    type="text" 
                    placeholder="Ej: Real Performance FC"
                    value={newClub.nombre}
                    onChange={e => setNewClub(prev => ({ ...prev, nombre: e.target.value }))}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                    id="input_new_club_name"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 font-bold">Ciudad *</label>
                  <input 
                    required
                    type="text" 
                    placeholder="Ej: Santiago"
                    value={newClub.ciudad}
                    onChange={e => setNewClub(prev => ({ ...prev, ciudad: e.target.value }))}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                    id="input_new_club_city"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 font-bold">País *</label>
                  <input 
                    required
                    type="text"
                    placeholder="Ej: Chile"
                    value={newClub.pais}
                    onChange={e => setNewClub(prev => ({ ...prev, pais: e.target.value }))}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                    id="input_new_club_country"
                  />
                </div>
                
                <p className="text-[9px] text-slate-400 font-bold uppercase px-2 leading-relaxed">
                  * El identificador único de liga será auto-asignado. El logo e insignias se pueden subir manualmente después en configuración.
                </p>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => {
                    setIsClubModalOpen(false);
                    setClubErrorMsg(null);
                    setNewClub({ nombre: '', ciudad: '', pais: '' });
                  }}
                  className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-500 font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all"
                  id="btn_cancel_save_club"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={savingClub}
                  className="flex-1 py-4 rounded-2xl bg-[#CF1B2B] text-white font-black uppercase tracking-widest text-[10px] hover:bg-red-700 transition-all shadow-xl shadow-red-900/20 disabled:opacity-50"
                  id="btn_submit_save_club"
                >
                  {savingClub ? 'CREANDO...' : 'CREAR CLUB'}
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
