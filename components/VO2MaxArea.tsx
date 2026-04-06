
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Category, CATEGORY_ID_MAP } from '../types';
import ClubBadge from './ClubBadge';

interface VO2MaxAreaProps {
  clubs?: any[];
}

export default function VO2MaxArea({ clubs = [] }: VO2MaxAreaProps) {
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState<any[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([Category.SUB_17]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vo2max_tests')
        .select(`
          *,
          players!inner (
            nombre,
            apellido1,
            apellido2,
            anio,
            club
          )
        `)
        .order('fecha', { ascending: false });

      if (error) throw error;
      setTests(data || []);
    } catch (err) {
      console.error('Error fetching VO2 tests:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTests = useMemo(() => {
    return tests.filter(t => {
      const fullName = `${t.players.nombre} ${t.players.apellido1} ${t.players.apellido2 || ''}`.toLowerCase();
      const matchesSearch = fullName.includes(searchTerm.toLowerCase());
      
      // Inferir categoría para filtrar
      let category = '';
      if (t.players.anio) {
        const age = 2026 - t.players.anio;
        if (age <= 13) category = Category.SUB_13;
        else if (age === 14) category = Category.SUB_14;
        else if (age === 15) category = Category.SUB_15;
        else if (age === 16) category = Category.SUB_16;
        else if (age === 17) category = Category.SUB_17;
        else if (age === 18) category = Category.SUB_18;
        else if (age <= 20) category = Category.SUB_20;
        else if (age <= 21) category = Category.SUB_21;
        else if (age <= 23) category = Category.SUB_23;
        else category = Category.ADULTA;
      } else {
        category = Category.SUB_17;
      }
      
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(category);
      
      return matchesSearch && matchesCategory;
    });
  }, [tests, searchTerm, selectedCategories]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">
            CONSUMO DE <span className="text-red-500">OXÍGENO</span>
          </h2>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest italic opacity-70">
            Historial de evaluaciones de capacidad aeróbica (VO2 Max)
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {Object.values(Category).map(cat => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategories(prev => 
                  prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
                );
              }}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                selectedCategories.includes(cat) 
                ? 'bg-slate-900 text-white shadow-lg' 
                : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
              }`}
            >
              {cat.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
        <div className="relative">
          <i className="fa-solid fa-magnifying-glass absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"></i>
          <input
            type="text"
            placeholder="Buscar atleta por nombre..."
            className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-6 py-4 text-xs font-black outline-none focus:ring-4 focus:ring-red-500/10 transition-all"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Tabla de Resultados */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-center min-w-[1200px]">
            <thead className="bg-[#0b1220] text-white font-black uppercase text-[10px]">
              <tr>
                <th className="px-6 py-5 text-left sticky left-0 bg-[#0b1220] z-10">Atleta</th>
                <th className="px-4 py-5">Fecha</th>
                <th className="px-4 py-5">Peso</th>
                <th className="px-4 py-5 bg-slate-800/50">VO2 Max</th>
                <th className="px-4 py-5">VAM</th>
                <th className="px-4 py-5">FC Máx</th>
                <th className="px-4 py-5">VT1 (Vel/FC)</th>
                <th className="px-4 py-5">VT2 (Vel/FC)</th>
                <th className="px-4 py-5">Nivel/Pasada</th>
                <th className="px-4 py-5">MTS</th>
                <th className="px-6 py-5 text-right">Observaciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-black italic uppercase text-xs">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-20">
                    <div className="w-10 h-10 border-4 border-slate-100 border-t-red-600 rounded-full animate-spin mx-auto"></div>
                  </td>
                </tr>
              ) : filteredTests.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-20 text-slate-400">No se encontraron evaluaciones</td>
                </tr>
              ) : (
                filteredTests.map((test, idx) => (
                  <tr key={test.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-5 text-left sticky left-0 bg-white group-hover:bg-slate-50 border-r border-slate-50">
                      <p className="font-black text-slate-900 uppercase italic text-[13px] leading-none mb-1 group-hover:text-red-600 transition-colors">
                        {test.players.nombre} {test.players.apellido1}
                      </p>
                      <ClubBadge clubName={test.players.club || 'Sin Club'} clubs={clubs} logoSize="w-3 h-3" className="text-[9px] font-bold text-slate-400 uppercase tracking-widest" />
                    </td>
                    <td className="px-4 py-5 text-slate-500">{new Date(test.fecha).toLocaleDateString()}</td>
                    <td className="px-4 py-5">{test.peso} kg</td>
                    <td className="px-4 py-5 bg-red-50 text-red-600 text-lg">{test.vo2_max}</td>
                    <td className="px-4 py-5">{test.vam} km/h</td>
                    <td className="px-4 py-5">{test.fc_max} bpm</td>
                    <td className="px-4 py-5 text-[10px]">
                      {test.vt1_vel} km/h | {test.vt1_fc} bpm
                    </td>
                    <td className="px-4 py-5 text-[10px]">
                      {test.vt2_vel} km/h | {test.vt2_fc} bpm
                    </td>
                    <td className="px-4 py-5">{test.nivel} / {test.pasada}</td>
                    <td className="px-4 py-5">{test.mts} m</td>
                    <td className="px-6 py-5 text-right text-[10px] text-slate-400 lowercase italic max-w-xs truncate">
                      {test.observaciones || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
