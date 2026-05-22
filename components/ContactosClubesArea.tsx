
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import ClubBadge from './ClubBadge';
import { FALLBACK_CLUBS } from '../lib/fallback_clubs';

interface ContactoClub {
  id: number;
  club: string;
  id_club?: number | null;
  nombres: string;
  presidente: string;
  cargo: string;
  correo: string;
}

export default function ContactosClubesArea() {
  const [activeTab, setActiveTab] = useState<'contactos' | 'clubes'>('contactos');
  const [contactos, setContactos] = useState<ContactoClub[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [expandedClubs, setExpandedClubs] = useState<Set<string>>(new Set());
  const [editingContacto, setEditingContacto] = useState<ContactoClub | null>(null);
  const [formData, setFormData] = useState({
    club: '',
    id_club: null as number | null,
    nombres: '',
    presidente: '',
    cargo: 'Presidente',
    correo: ''
  });

  // States for Club Management
  const [showClubModal, setShowClubModal] = useState(false);
  const [editingClub, setEditingClub] = useState<any | null>(null);
  const [submittingClub, setSubmittingClub] = useState(false);
  const [clubFormData, setClubFormData] = useState({
    nombre: '',
    codigo: '',
    nombre_corto: '',
    ciudad: '',
    region: '',
    pais: '',
    logo_url: '',
    activo: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch both contacts and clubs for logos
    const [contactosRes, clubsRes] = await Promise.all([
      supabase.from('contactos_solicitudes').select('*').order('club', { ascending: true }),
      supabase.from('clubes').select('*')
    ]);
    
    if (contactosRes.error) console.error('Error fetching contactos:', contactosRes.error);
    if (clubsRes.error) console.error('Error fetching clubs:', clubsRes.error);
    
    let fetchedClubs = clubsRes.data || [];
    if (fetchedClubs.length === 0) {
      fetchedClubs = [...FALLBACK_CLUBS];
    } else {
      const dbNames = new Set(fetchedClubs.map(c => (c.nombre || '').toUpperCase().trim()));
      const dbIds = new Set(fetchedClubs.map(c => c.id_club));
      
      FALLBACK_CLUBS.forEach(fc => {
        if (!dbIds.has(fc.id_club) && !dbNames.has((fc.nombre || '').toUpperCase().trim())) {
          fetchedClubs.push(fc);
        }
      });
      
      fetchedClubs = fetchedClubs.map(c => {
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

    fetchedClubs.sort((a: any, b: any) => {
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

    setContactos(contactosRes.data || []);
    setClubs(fetchedClubs);
    setLoading(false);
  };

  const fetchContactos = async () => {
    const { data, error } = await supabase
      .from('contactos_solicitudes')
      .select('*')
      .order('club', { ascending: true });
    
    if (error) {
      console.error('Error fetching contactos:', error);
    } else {
      console.log("📥 Contactos cargados:", (data || []).map(c => c.id));
      setContactos(data || []);
    }
  };

  const handleEdit = (contacto: ContactoClub) => {
    setEditingContacto(contacto);
    setFormData({
      club: contacto.club,
      id_club: contacto.id_club || null,
      nombres: contacto.nombres || '',
      presidente: contacto.presidente || '',
      cargo: contacto.cargo || 'Presidente',
      correo: contacto.correo || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Estás seguro de eliminar este contacto?')) return;
    
    const { error } = await supabase
      .from('contactos_solicitudes')
      .delete()
      .eq('id', id);
    
    if (error) {
      alert('Error al eliminar: ' + error.message);
    } else {
      fetchContactos();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    console.log("🚀 Iniciando handleSubmit en ContactosClubesArea...", { editing: !!editingContacto, formData });
    
    try {
      if (editingContacto) {
        console.log("📝 Intentando actualizar contacto ID:", editingContacto.id);
        
        // Verificamos si existe antes por si acaso
        const { data: currentData } = await supabase
          .from('contactos_solicitudes')
          .select('id')
          .eq('id', editingContacto.id)
          .maybeSingle();
        
        if (!currentData) {
          console.error("❌ El contacto con ID " + editingContacto.id + " no existe en la DB.");
          alert("Error: El registro que intenta editar ya no existe en la base de datos.");
          setSubmitting(false);
          setShowModal(false);
          fetchContactos();
          return;
        }

        const { data, error } = await supabase
          .from('contactos_solicitudes')
          .update({
            club: formData.club,
            id_club: formData.id_club,
            nombres: formData.nombres,
            presidente: formData.presidente,
            cargo: formData.cargo,
            correo: formData.correo
          })
          .eq('id', editingContacto.id)
          .select();
        
        if (error) {
          console.error('❌ Error Supabase al actualizar:', error);
          alert('Error al actualizar: ' + error.message);
        } else {
          console.log("✅ Respuesta de update:", data);
          // Si no hay error, consideramos éxito incluso si data es [] (aunque con select() no debería ser [])
          setShowModal(false);
          await fetchContactos();
          alert('Contacto actualizado exitosamente');
        }
      } else {
        console.log("➕ Creando nuevo contacto...");
        const { data, error } = await supabase
          .from('contactos_solicitudes')
          .insert([formData])
          .select();
        
        if (error) {
          console.error('❌ Error al crear contacto:', error);
          alert('Error al crear: ' + error.message);
        } else {
          console.log("✅ Nuevo contacto creado:", data);
          setShowModal(false);
          await fetchContactos();
          alert('Contacto creado exitosamente');
        }
      }
    } catch (err: any) {
      console.error("❌ Excepción en handleSubmit:", err);
      alert('Error inesperado: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClub = (club: any) => {
    setEditingClub(club);
    setClubFormData({
      nombre: club.nombre || '',
      codigo: club.codigo || '',
      nombre_corto: club.nombre_corto || '',
      ciudad: club.ciudad || '',
      region: club.region || '',
      pais: club.pais || '',
      logo_url: club.logo_url || '',
      activo: club.activo !== undefined ? club.activo : true
    });
    setShowClubModal(true);
  };

  const handleDeleteClub = async (id_club: number) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este club de la base de datos oficial? Esto puede causar inconsistencias si hay jugadores o informes asignados a él.')) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('clubes')
        .delete()
        .eq('id_club', id_club);
      
      if (error) {
        throw error;
      }
      alert('Club eliminado satisfactoriamente');
      await fetchData();
    } catch (err: any) {
      console.error('Error al eliminar club:', err);
      alert('Error al eliminar club: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClub = () => {
    setEditingClub(null);
    setClubFormData({
      nombre: '',
      codigo: '',
      nombre_corto: '',
      ciudad: '',
      region: '',
      pais: '',
      logo_url: '',
      activo: true
    });
    setShowClubModal(true);
  };

  const handleSaveClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubFormData.nombre || !clubFormData.codigo) return;

    setSubmittingClub(true);
    try {
      const payload = {
        nombre: clubFormData.nombre.toUpperCase(),
        codigo: clubFormData.codigo.toUpperCase(),
        nombre_corto: clubFormData.nombre_corto ? clubFormData.nombre_corto.toUpperCase() : null,
        ciudad: clubFormData.ciudad || null,
        region: clubFormData.region || null,
        pais: clubFormData.pais ? clubFormData.pais.toUpperCase() : null,
        activo: clubFormData.activo !== undefined ? clubFormData.activo : true,
        logo_url: clubFormData.logo_url || null
      };

      if (editingClub) {
        // Update
        const { error } = await supabase
          .from('clubes')
          .update(payload)
          .eq('id_club', editingClub.id_club);
        
        if (error) throw error;
        alert('Club actualizado correctamente');
      } else {
        // Insert
        const { error } = await supabase
          .from('clubes')
          .insert([payload]);
        
        if (error) throw error;
        alert('Club insertado correctamente');
      }

      setShowClubModal(false);
      setEditingClub(null);
      await fetchData();
    } catch (err: any) {
      console.error('Error al guardar el club:', err);
      alert('Error al guardar el club: ' + err.message);
    } finally {
      setSubmittingClub(false);
    }
  };

  const filteredContactos = contactos.filter(c => 
    (c.club?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (c.nombres?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (c.presidente?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  const groupedContactos = filteredContactos.reduce((acc, contacto) => {
    const clubName = contacto.club || 'SIN CLUB';
    if (!acc[clubName]) {
      acc[clubName] = {
        name: clubName,
        id_club: contacto.id_club,
        list: []
      };
    }
    acc[clubName].list.push(contacto);
    return acc;
  }, {} as Record<string, { name: string, id_club?: number | null, list: ContactoClub[] }>);

  const toggleClub = (clubName: string) => {
    const newExpanded = new Set(expandedClubs);
    if (newExpanded.has(clubName)) {
      newExpanded.delete(clubName);
    } else {
      newExpanded.add(clubName);
    }
    setExpandedClubs(newExpanded);
  };

  const sortedAndFilteredClubs = useMemo(() => {
    const cleanSearch = searchTerm.toLowerCase().trim();
    const filtered = clubs.filter(c => 
      (c.nombre || '').toLowerCase().includes(cleanSearch) || 
      (c.codigo || '').toLowerCase().includes(cleanSearch) ||
      (c.pais || '').toLowerCase().includes(cleanSearch) ||
      (c.ciudad || '').toLowerCase().includes(cleanSearch)
    );

    // Order by country, chile first, then alphabetical country, then alphabetical name
    return [...filtered].sort((a, b) => {
      const countryA = (a.pais || '').toLowerCase().trim();
      const countryB = (b.pais || '').toLowerCase().trim();

      const isChileA = countryA === 'chile';
      const isChileB = countryB === 'chile';

      if (isChileA && !isChileB) return -1;
      if (!isChileA && isChileB) return 1;

      if (countryA !== countryB) {
        return countryA.localeCompare(countryB);
      }

      const nameA = (a.nombre || '').toLowerCase().trim();
      const nameB = (b.nombre || '').toLowerCase().trim();
      return nameA.localeCompare(nameB);
    });
  }, [clubs, searchTerm]);

  const sortedClubNames = Object.keys(groupedContactos).sort();

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Tab Switching Headers */}
      <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 bg-[#0b1220] rounded-2xl flex items-center justify-center text-white shadow-xl">
            {activeTab === 'contactos' ? (
              <i className="fa-solid fa-address-book text-xl"></i>
            ) : (
              <i className="fa-solid fa-shield-halved text-xl"></i>
            )}
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">
              {activeTab === 'contactos' ? 'CONTACTOS DE CLUBES' : 'BASE DE DATOS DE CLUBES'}
            </h2>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mt-1">
              {activeTab === 'contactos' 
                ? 'Gestión de destinatarios para cartas y solicitudes oficiales.' 
                : 'Tabla maestra de clubes oficiales con clasificación e información país.'}
            </p>
          </div>
        </div>
        
        {activeTab === 'contactos' ? (
          <button 
            onClick={() => {
              setEditingContacto(null);
              setFormData({ club: '', id_club: null, nombres: '', presidente: '', cargo: 'Presidente', correo: '' });
              setShowModal(true);
            }}
            className="bg-[#CF1B2B] text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-red-700 transition-all flex items-center gap-2 transform active:scale-95 self-start md:self-auto"
          >
            <i className="fa-solid fa-plus"></i> NUEVO CONTACTO
          </button>
        ) : (
          <button 
            onClick={handleCreateClub}
            className="bg-[#0b1220] text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-[#CF1B2B] transition-all flex items-center gap-2 transform active:scale-95 self-start md:self-auto"
          >
            <i className="fa-solid fa-shield-halved"></i> NUEVO CLUB
          </button>
        )}
      </div>

      {/* Sub-tabs Toggle bar */}
      <div className="flex gap-2 p-1.5 bg-slate-100 rounded-3xl w-fit">
        <button 
          onClick={() => {
            setActiveTab('contactos');
            setSearchTerm('');
          }} 
          className={`px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
            activeTab === 'contactos' 
              ? 'bg-[#0b1220] text-white shadow-lg shadow-slate-900/10' 
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <i className="fa-solid fa-address-book mr-2"></i>
          Contactos de Envío
        </button>
        <button 
          onClick={() => {
            setActiveTab('clubes');
            setSearchTerm('');
          }} 
          className={`px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
            activeTab === 'clubes' 
              ? 'bg-[#0b1220] text-white shadow-lg shadow-slate-900/10' 
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <i className="fa-solid fa-shield-halved mr-2"></i>
          Listado de Clubes Maestra
        </button>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
        {/* Search & Refresh controller */}
        <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
            <input 
              type="text" 
              placeholder={activeTab === 'contactos' ? "Buscar por club o nombre..." : "Buscar club, código, ciudad o país..."}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#CF1B2B]/20 focus:border-[#CF1B2B] transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {activeTab === 'clubes' && (
            <button 
              onClick={fetchData} 
              disabled={loading}
              className="px-6 py-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm active:scale-95"
              title="Sincronizar base de datos de clubes de Supabase"
            >
              <i className={`fa-solid fa-rotate ${loading ? 'animate-spin text-red-500' : ''}`}></i>
              ACTUALIZAR TABLA
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="px-8 py-20 text-center flex flex-col items-center gap-3">
              <i className="fa-solid fa-circle-notch fa-spin text-[#CF1B2B] text-2xl"></i>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando con Supabase...</p>
            </div>
          ) : activeTab === 'contactos' ? (
            /* --- CONTACTS TAB VIEW --- */
            sortedClubNames.length === 0 ? (
              <div className="px-8 py-20 text-center">
                <p className="text-slate-400 text-sm font-medium">No se encontraron contactos registrados.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {sortedClubNames.map((clubName) => {
                  const group = groupedContactos[clubName];
                  const isExpanded = expandedClubs.has(clubName);
                  const clubContactos = group.list;
                  
                  return (
                    <div key={clubName} className="flex flex-col">
                      {/* Club Header */}
                      <button 
                        onClick={() => toggleClub(clubName)}
                        className="w-full px-8 py-6 flex items-center justify-between hover:bg-slate-50/80 transition-colors group text-left"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all bg-white border border-slate-100 shadow-sm ${isExpanded ? 'ring-2 ring-red-500/20' : ''}`}>
                            <ClubBadge 
                              clubName={clubName} 
                              idClub={group.id_club}
                              clubs={clubs} 
                              showName={false} 
                              logoSize="w-6 h-6"
                            />
                          </div>
                          <div>
                            <h3 className="text-sm font-black text-slate-900 uppercase italic tracking-tighter">{clubName}</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                              {clubContactos.length} {clubContactos.length === 1 ? 'Contacto' : 'Contactos'}
                            </p>
                          </div>
                        </div>
                        <i className={`fa-solid fa-chevron-down text-[10px] text-slate-300 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-red-500' : ''}`}></i>
                      </button>

                      {/* Contacts Sub-list */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="overflow-hidden bg-slate-50/30"
                          >
                            <div className="px-8 pb-6 space-y-3">
                              <div className="grid grid-cols-12 px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                <div className="col-span-4">Destinatario</div>
                                <div className="col-span-3">Cargo</div>
                                <div className="col-span-4">Email</div>
                                <div className="col-span-1 text-right">Acciones</div>
                              </div>
                              {clubContactos.map((contacto) => (
                                <div key={contacto.id} className="grid grid-cols-12 items-center px-4 py-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group/row">
                                  <div className="col-span-4">
                                    <span className="text-sm font-bold text-slate-700 italic uppercase">{contacto.nombres || contacto.presidente}</span>
                                  </div>
                                  <div className="col-span-3">
                                    <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 uppercase tracking-tight">
                                      {contacto.cargo || 'Presidente'}
                                    </span>
                                  </div>
                                  <div className="col-span-4">
                                    <span className="text-sm text-slate-500 truncate block mr-4">{contacto.correo || '-'}</span>
                                  </div>
                                  <div className="col-span-1 flex items-center justify-end gap-1">
                                    <button 
                                      onClick={() => handleEdit(contacto)}
                                      className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                      title="Editar"
                                    >
                                      <i className="fa-solid fa-pen-to-square text-xs"></i>
                                    </button>
                                    <button 
                                      onClick={() => handleDelete(contacto.id)}
                                      className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                      title="Eliminar"
                                    >
                                      <i className="fa-solid fa-trash text-xs"></i>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* --- MASTER CLUB LIST TAB VIEW --- */
            sortedAndFilteredClubs.length === 0 ? (
              <div className="px-8 py-20 text-center">
                <p className="text-slate-400 text-sm font-medium">No se encontraron clubes registrados en la base de datos maestro.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 font-black uppercase text-[9px] tracking-widest">
                    <th className="px-8 py-5">Escudo / Club</th>
                    <th className="px-8 py-5">Código</th>
                    <th className="px-8 py-5">Nombre Corto</th>
                    <th className="px-8 py-5 cursor-pointer hover:text-[#CF1B2B] select-none transition-colors group">
                      País <i className="fa-solid fa-sort-down ml-1 text-red-500 animate-pulse"></i>
                    </th>
                    <th className="px-8 py-5">Ciudad / Región</th>
                    <th className="px-8 py-5">Estado</th>
                    <th className="px-8 py-5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-700">
                  {sortedAndFilteredClubs.map((club) => {
                    const isChile = (club.pais || '').toLowerCase().trim() === 'chile';
                    return (
                      <tr key={club.id_club} className="hover:bg-slate-50/50 transition-colors animate-in fade-in duration-200">
                        <td className="px-8 py-4.5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl border border-slate-100 p-1 flex items-center justify-center bg-white shadow-sm">
                              <ClubBadge clubName={club.nombre} idClub={club.id_club} clubs={clubs} showName={false} logoSize="w-7 h-7" />
                            </div>
                            <div>
                              <p className="text-xs font-black text-slate-900 uppercase italic">{club.nombre}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">ID: {club.id_club}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-4.5 text-xs font-black tracking-widest text-[#0b1220]">
                          {club.codigo || '-'}
                        </td>
                        <td className="px-8 py-4.5 text-xs text-slate-500 uppercase font-bold">
                          {club.nombre_corto || '-'}
                        </td>
                        <td className="px-8 py-4.5">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider ${
                            isChile 
                              ? 'bg-red-50 text-[#CF1B2B] border border-red-100/50' 
                              : 'bg-emerald-50 text-emerald-600 border border-emerald-100/50'
                          }`}>
                            {isChile ? <i className="fa-solid fa-star text-[8px]"></i> : <i className="fa-solid fa-globe text-[8px]"></i>}
                            {club.pais || 'S/D'}
                          </span>
                        </td>
                        <td className="px-8 py-4.5 text-xs">
                          <p className="font-bold text-slate-600 uppercase">{club.ciudad || '-'}</p>
                          <p className="text-[9px] text-slate-400 font-medium uppercase">{club.region || '-'}</p>
                        </td>
                        <td className="px-8 py-4.5">
                          <span className={`px-3 py-1 rounded-full text-[8.5px] font-black uppercase tracking-widest leading-none ${
                            club.activo !== false ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/30' : 'bg-rose-50 text-rose-500 border border-rose-100/30'
                          } border`}>
                            {club.activo !== false ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-8 py-4.5 text-right animate-in fade-in">
                          <div className="flex justify-end gap-1">
                            <button 
                              onClick={() => handleEditClub(club)}
                              className="p-2 text-slate-300 hover:text-[#0b1220] hover:bg-slate-50 rounded-xl transition-all"
                              title="Editar Club"
                            >
                              <i className="fa-solid fa-pen-to-square text-xs"></i>
                            </button>
                            <button 
                              onClick={() => handleDeleteClub(club.id_club)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                              title="Eliminar Club"
                            >
                              <i className="fa-solid fa-trash-can text-xs"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-[#0b1220]/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-lg font-black text-[#0b1220] italic uppercase tracking-tighter">
                {editingContacto ? `EDITAR CONTACTO (ID: ${editingContacto.id})` : 'NUEVO CONTACTO'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre del Club</label>
                <input 
                  type="text" 
                  required
                  list="club-suggestions"
                  placeholder="Ej: Cobreloa"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-bold uppercase"
                  value={formData.club}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    const matchedClub = clubs.find(c => c.nombre.toUpperCase() === val);
                    setFormData({
                      ...formData, 
                      club: val,
                      id_club: matchedClub ? matchedClub.id_club : formData.id_club
                    });
                  }}
                />
                <datalist id="club-suggestions">
                  {clubs.map(c => (
                    <option key={c.id_club} value={c.nombre.toUpperCase()} />
                  ))}
                </datalist>
                {formData.id_club && (
                  <p className="text-[9px] font-bold text-emerald-500 uppercase ml-1">✓ Club vinculado (ID: {formData.id_club})</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Destinatario (Nombre Completo)</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej: Harry Robledo"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-bold"
                  value={formData.nombres}
                  onChange={(e) => setFormData({...formData, nombres: e.target.value, presidente: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cargo</label>
                  <input 
                    type="text" 
                    placeholder="Ej: Presidente"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-bold"
                    value={formData.cargo}
                    onChange={(e) => setFormData({...formData, cargo: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                  <input 
                    type="email" 
                    placeholder="ejemplo@club.cl"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                    value={formData.correo}
                    onChange={(e) => setFormData({...formData, correo: e.target.value})}
                  />
                </div>
              </div>
              <button 
                type="submit"
                disabled={submitting}
                className="w-full py-5 bg-[#CF1B2B] text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-red-700 transition-all flex items-center justify-center gap-2 transform active:scale-95 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <i className="fa-solid fa-spinner fa-spin"></i>
                ) : (
                  <i className="fa-solid fa-save"></i>
                )}
                {submitting ? 'GUARDANDO...' : (editingContacto ? 'GUARDAR CAMBIOS' : 'CREAR REGISTRO')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MASTER CLUB CREATOR/EDITOR MODAL --- */}
      {showClubModal && (
        <div className="fixed inset-0 bg-[#0b1220]/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-8">
            <div className="p-8 border-b border-slate-100 bg-[#0b1220] text-white flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black italic uppercase tracking-tighter">
                  {editingClub ? `EDITAR CLUB: ${editingClub.nombre}` : 'NUEVO CLUB OFICIAL'}
                </h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Soporte técnico para base de datos Supabase</p>
              </div>
              <button 
                onClick={() => {
                  setShowClubModal(false);
                  setEditingClub(null);
                }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
            
            <form onSubmit={handleSaveClub} className="p-8 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Oficial del Club <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ej: CLUB DE PORTES COLO-COLO"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-bold uppercase"
                    value={clubFormData.nombre}
                    onChange={(e) => setClubFormData({...clubFormData, nombre: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Código / Sigla <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    required
                    maxLength={10}
                    placeholder="Ej: COL, UCH, CCS"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-black uppercase tracking-widest"
                    value={clubFormData.codigo}
                    onChange={(e) => setClubFormData({...clubFormData, codigo: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Corto</label>
                  <input 
                    type="text" 
                    placeholder="Ej: COLO COLO"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-bold uppercase"
                    value={clubFormData.nombre_corto}
                    onChange={(e) => setClubFormData({...clubFormData, nombre_corto: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">País</label>
                  <input 
                    type="text" 
                    placeholder="Ej: CHILE, ARGENTINA, ESPAÑA"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-bold uppercase"
                    value={clubFormData.pais}
                    onChange={(e) => setClubFormData({...clubFormData, pais: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ciudad</label>
                  <input 
                    type="text" 
                    placeholder="Ej: SANTIAGO, CALAMA, VALPARAISO"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-bold uppercase"
                    value={clubFormData.ciudad}
                    onChange={(e) => setClubFormData({...clubFormData, ciudad: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Región</label>
                  <input 
                    type="text" 
                    placeholder="Ej: SANTIAGO METROPOLITANA"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-bold uppercase"
                    value={clubFormData.region}
                    onChange={(e) => setClubFormData({...clubFormData, region: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estado de Club</label>
                  <div className="flex items-center gap-3 px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                    <input 
                      type="checkbox"
                      id="club-activo"
                      className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                      checked={clubFormData.activo}
                      onChange={(e) => setClubFormData({...clubFormData, activo: e.target.checked})}
                    />
                    <label htmlFor="club-activo" className="text-xs font-bold text-slate-700 uppercase cursor-pointer select-none">
                      {clubFormData.activo ? 'CLUB ACTIVO' : 'CLUB INACTIVO'}
                    </label>
                  </div>
                </div>

                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">URL del Escudo/Logo (Google Drive o Web)</label>
                  <input 
                    type="text" 
                    placeholder="Ej: https://drive.google.com/file/d/xxxxxx"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                    value={clubFormData.logo_url}
                    onChange={(e) => setClubFormData({...clubFormData, logo_url: e.target.value})}
                  />
                  <p className="text-[9px] text-slate-400 font-bold uppercase ml-1">Si insertas un enlace de Google Drive, el sistema lo convertirá automáticamente para visualización directa.</p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => {
                    setShowClubModal(false);
                    setEditingClub(null);
                  }}
                  className="flex-1 py-4.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  CANCELAR
                </button>
                <button 
                  type="submit"
                  disabled={submittingClub}
                  className="flex-1 py-4.5 bg-[#CF1B2B] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submittingClub ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-save"></i>}
                  {submittingClub ? 'GUARDANDO...' : 'GUARDAR CLUB'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
