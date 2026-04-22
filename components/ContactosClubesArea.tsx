
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface ContactoClub {
  id: number;
  club: string;
  presidente: string;
  cargo: string;
  email: string;
}

export default function ContactosClubesArea() {
  const [contactos, setContactos] = useState<ContactoClub[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingContacto, setEditingContacto] = useState<ContactoClub | null>(null);
  const [formData, setFormData] = useState({
    club: '',
    presidente: '',
    cargo: 'Presidente',
    email: ''
  });

  useEffect(() => {
    fetchContactos();
  }, []);

  const fetchContactos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('contactos_solicitudes')
      .select('*')
      .order('club', { ascending: true });
    
    if (error) {
      console.error('Error fetching contactos:', error);
    } else {
      setContactos(data || []);
    }
    setLoading(false);
  };

  const handleEdit = (contacto: ContactoClub) => {
    setEditingContacto(contacto);
    setFormData({
      club: contacto.club,
      presidente: contacto.presidente,
      cargo: contacto.cargo || 'Presidente',
      email: contacto.email || ''
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
    (c.presidente?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

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
            setFormData({ club: '', presidente: '', cargo: 'Presidente', email: '' });
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
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Club</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Destinatario</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Cargo</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <i className="fa-solid fa-circle-notch fa-spin text-red-600 text-2xl"></i>
                  </td>
                </tr>
              ) : filteredContactos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <p className="text-slate-400 text-sm font-medium">No se encontraron contactos registrados.</p>
                  </td>
                </tr>
              ) : (
                filteredContactos.map((contacto) => (
                  <tr key={contacto.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <span className="text-sm font-bold text-slate-900 uppercase">{contacto.club}</span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-sm font-medium text-slate-600">{contacto.presidente}</span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-xs font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-md uppercase tracking-tight">
                        {contacto.cargo || 'Presidente'}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-sm text-slate-500">{contacto.email || '-'}</span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEdit(contacto)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        >
                          <i className="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button 
                          onClick={() => handleDelete(contacto.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <i className="fa-solid fa-trash"></i>
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
                  placeholder="Ej: Cobreloa"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-bold uppercase"
                  value={formData.club}
                  onChange={(e) => setFormData({...formData, club: e.target.value.toUpperCase()})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Destinatario (Presidente/Gerente)</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej: Harry Robledo"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-bold"
                  value={formData.presidente}
                  onChange={(e) => setFormData({...formData, presidente: e.target.value})}
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
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
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
