
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import ClubBadge from './ClubBadge';

interface ContactoClub {
  id: number;
  club: string;
  nombres: string;
  presidente: string;
  cargo: string;
  correo: string;
}

export default function ContactosClubesArea() {
  const [contactos, setContactos] = useState<ContactoClub[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [expandedClubs, setExpandedClubs] = useState<Set<string>>(new Set());
  const [editingContacto, setEditingContacto] = useState<ContactoClub | null>(null);
  const [formData, setFormData] = useState({
    club: '',
    nombres: '',
    presidente: '',
    cargo: 'Presidente',
    correo: ''
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
    
    setContactos(contactosRes.data || []);
    setClubs(clubsRes.data || []);
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
      setContactos(data || []);
    }
  };

  const handleEdit = (contacto: ContactoClub) => {
    setEditingContacto(contacto);
    setFormData({
      club: contacto.club,
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
    if (editingContacto) {
      const { error } = await supabase
        .from('contactos_solicitudes')
        .update(formData)
        .eq('id', editingContacto.id);
      
      if (error) {
        alert('Error al actualizar: ' + error.message);
      } else {
        setShowModal(false);
        fetchContactos();
      }
    } else {
      const { error } = await supabase
        .from('contactos_solicitudes')
        .insert([formData]);
      
      if (error) {
        alert('Error al crear: ' + error.message);
      } else {
        setShowModal(false);
        fetchContactos();
      }
    }
  };

  const filteredContactos = contactos.filter(c => 
    (c.club?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (c.nombres?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (c.presidente?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  const groupedContactos = filteredContactos.reduce((acc, contacto) => {
    const clubName = contacto.club || 'SIN CLUB';
    if (!acc[clubName]) acc[clubName] = [];
    acc[clubName].push(contacto);
    return acc;
  }, {} as Record<string, ContactoClub[]>);

  const toggleClub = (clubName: string) => {
    const newExpanded = new Set(expandedClubs);
    if (newExpanded.has(clubName)) {
      newExpanded.delete(clubName);
    } else {
      newExpanded.add(clubName);
    }
    setExpandedClubs(newExpanded);
  };

  const sortedClubs = Object.keys(groupedContactos).sort();

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 bg-[#0b1220] rounded-2xl flex items-center justify-center text-white shadow-xl">
            <i className="fa-solid fa-address-book text-xl"></i>
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">CONTACTOS DE CLUBES</h2>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mt-1">Gestión de destinatarios para cartas oficiales.</p>
          </div>
        </div>
        <button 
          onClick={() => {
            setEditingContacto(null);
            setFormData({ club: '', nombres: '', presidente: '', cargo: 'Presidente', correo: '' });
            setShowModal(true);
          }}
          className="bg-[#CF1B2B] text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-red-700 transition-all flex items-center gap-2 transform active:scale-95"
        >
          <i className="fa-solid fa-plus"></i> NUEVO CONTACTO
        </button>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
        <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
            <input 
              type="text" 
              placeholder="Buscar por club o nombre..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="px-8 py-20 text-center">
              <i className="fa-solid fa-circle-notch fa-spin text-red-600 text-2xl"></i>
            </div>
          ) : sortedClubs.length === 0 ? (
            <div className="px-8 py-20 text-center">
              <p className="text-slate-400 text-sm font-medium">No se encontraron contactos registrados.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {sortedClubs.map((clubName) => {
                const isExpanded = expandedClubs.has(clubName);
                const clubContactos = groupedContactos[clubName];
                
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
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-[#0b1220]/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-lg font-black text-[#0b1220] italic uppercase tracking-tighter">
                {editingContacto ? 'EDITAR CONTACTO' : 'NUEVO CONTACTO'}
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
                  onChange={(e) => setFormData({...formData, club: e.target.value.toUpperCase()})}
                />
                <datalist id="club-suggestions">
                  {clubs.map(c => (
                    <option key={c.id} value={c.nombre.toUpperCase()} />
                  ))}
                </datalist>
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
                className="w-full py-5 bg-[#CF1B2B] text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-red-700 transition-all flex items-center justify-center gap-2 transform active:scale-95 mt-4"
              >
                <i className="fa-solid fa-save"></i> {editingContacto ? 'GUARDAR CAMBIOS' : 'CREAR REGISTRO'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
