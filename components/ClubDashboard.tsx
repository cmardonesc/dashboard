
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AthletePerformanceRecord } from '../types';
import FisicaArea from './FisicaArea';
import NutricionArea from './NutricionArea';
import MedicaArea from './MedicaArea';
import TecnicaArea from './TecnicaArea';
import CargaTareasArea from './CargaTareasArea';
import NutricionResumenGrupal from './NutricionResumenGrupal';

interface ClubDashboardProps {
  userClub?: string;
  performanceRecords: AthletePerformanceRecord[];
}

type ClubSection = 'carga' | 'nutricion' | 'medica' | 'tecnica' | 'evaluaciones';

const ClubDashboard: React.FC<ClubDashboardProps> = ({ userClub, performanceRecords }) => {
  const [activeSection, setActiveSection] = useState<ClubSection>('carga');
  const [subSection, setSubSection] = useState<string>('wellness');
  const [selectedClub, setSelectedClub] = useState<string>(userClub || 'Chile');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const clubs = useMemo(() => {
    const uniqueClubs = new Set<string>();
    performanceRecords.forEach(r => {
      if (r.player.club) uniqueClubs.add(r.player.club);
    });
    return Array.from(uniqueClubs).sort();
  }, [performanceRecords]);

  // Generar fechas para el slicer (últimos 14 días)
  const dates = useMemo(() => {
    const d = [];
    for (let i = 0; i < 14; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      d.push(date.toISOString().split('T')[0]);
    }
    return d;
  }, []);

  const clubRecords = useMemo(() => {
    if (!selectedClub || selectedClub === 'General') return performanceRecords;
    return performanceRecords.filter(r => 
      r.player.club?.toLowerCase() === selectedClub.toLowerCase() || 
      r.player.club_name?.toLowerCase() === selectedClub.toLowerCase()
    );
  }, [performanceRecords, selectedClub]);

  const renderCargaTables = () => {
    const filteredByDate = performanceRecords.filter(r => {
      const dateOnly = selectedDate.substring(0, 10);
      if (subSection === 'wellness') return r.wellness.some(w => w.date.substring(0, 10) === dateOnly);
      if (subSection === 'pse') return r.loads.some(l => l.date.substring(0, 10) === dateOnly);
      if (subSection === 'gps') return r.gps.some(g => g.date.substring(0, 10) === dateOnly);
      return false;
    });

    const getDisplayName = (player: any) => {
      const isSameClub = player.club?.toLowerCase() === selectedClub.toLowerCase();
      if (isSameClub) return player.name;
      return `Atleta Externo #${player.id_del_jugador || player.id?.split('-').pop()}`;
    };

    return (
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Jugador</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Club</th>
                {subSection === 'wellness' && (
                  <>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fatiga</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sueño</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estrés</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Dolor</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ánimo</th>
                  </>
                )}
                {subSection === 'pse' && (
                  <>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Minutos</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">RPE</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Carga (sRPE)</th>
                  </>
                )}
                {subSection === 'gps' && (
                  <>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Dist. Total (m)</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">HSR (&gt;20km/h)</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sprints</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vel. Max</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredByDate.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest italic">
                    No hay datos registrados para esta fecha
                  </td>
                </tr>
              ) : (
                filteredByDate.map((record, idx) => {
                  const isExternal = record.player.club?.toLowerCase() !== selectedClub.toLowerCase();
                  
                  return (
                    <tr key={idx} className={`hover:bg-slate-50/50 transition-colors ${isExternal ? 'opacity-60' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black italic border ${isExternal ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-red-50 text-red-600 border-red-100'}`}>
                            {record.player.name?.charAt(0)}
                          </div>
                          <span className={`text-xs font-bold ${isExternal ? 'text-slate-400 italic' : 'text-slate-900'}`}>
                            {getDisplayName(record.player)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          {record.player.club || 'S/D'}
                        </span>
                      </td>
                      {subSection === 'wellness' && (
                        <>
                          {(() => {
                            const dateOnly = selectedDate.substring(0, 10);
                            const w = record.wellness.find(x => x.date.substring(0, 10) === dateOnly);
                            return (
                              <>
                                <td className="px-6 py-4 text-xs font-bold text-slate-700">{w?.fatigue || '-'}</td>
                                <td className="px-6 py-4 text-xs font-bold text-slate-700">{w?.sleep || '-'}</td>
                                <td className="px-6 py-4 text-xs font-bold text-slate-700">{w?.stress || '-'}</td>
                                <td className="px-6 py-4 text-xs font-bold text-slate-700">{w?.soreness || '-'}</td>
                                <td className="px-6 py-4 text-xs font-bold text-slate-700">{w?.mood || '-'}</td>
                              </>
                            );
                          })()}
                        </>
                      )}
                      {subSection === 'pse' && (
                        <>
                          {(() => {
                            const dateOnly = selectedDate.substring(0, 10);
                            const l = record.loads.find(x => x.date.substring(0, 10) === dateOnly);
                            return (
                              <>
                                <td className="px-6 py-4 text-xs font-bold text-slate-700">{l?.duration || '-'}</td>
                                <td className="px-6 py-4 text-xs font-bold text-slate-700">{l?.rpe || '-'}</td>
                                <td className="px-6 py-4 text-xs font-bold text-slate-700">{l?.load || '-'}</td>
                              </>
                            );
                          })()}
                        </>
                      )}
                      {subSection === 'gps' && (
                        <>
                          {(() => {
                            const dateOnly = selectedDate.substring(0, 10);
                            const g = record.gps.find(x => x.date.substring(0, 10) === dateOnly);
                            return (
                              <>
                                <td className="px-6 py-4 text-xs font-bold text-slate-700">{g?.totalDistance || '-'}</td>
                                <td className="px-6 py-4 text-xs font-bold text-slate-700">{g?.hsrDistance || '-'}</td>
                                <td className="px-6 py-4 text-xs font-bold text-slate-700">{g?.sprintCount || '-'}</td>
                                <td className="px-6 py-4 text-xs font-bold text-slate-700">{g?.maxSpeed || '-'}</td>
                              </>
                            );
                          })()}
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'carga':
        return (
          <div className="space-y-8">
            {/* Date Slicer */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] italic">Seleccionar Fecha</h3>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{selectedDate}</span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar">
                {dates.map((date) => {
                  const d = new Date(date + 'T12:00:00');
                  const isActive = selectedDate === date;
                  return (
                    <button
                      key={date}
                      onClick={() => setSelectedDate(date)}
                      className={`flex flex-col items-center justify-center min-w-[70px] py-4 rounded-2xl border transition-all ${
                        isActive 
                          ? 'bg-[#0b1220] border-[#0b1220] text-white shadow-xl scale-105' 
                          : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-[8px] font-black uppercase tracking-widest mb-1">
                        {d.toLocaleDateString('es-ES', { weekday: 'short' })}
                      </span>
                      <span className="text-lg font-black italic tracking-tighter leading-none">
                        {d.getDate()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
                <button 
                  onClick={() => setSubSection('wellness')} 
                  className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${subSection === 'wellness' ? 'bg-[#0b1220] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Check-In (Wellness)
                </button>
                <button 
                  onClick={() => setSubSection('pse')} 
                  className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${subSection === 'pse' ? 'bg-[#0b1220] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Check-Out (RPE)
                </button>
                <button 
                  onClick={() => setSubSection('gps')} 
                  className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${subSection === 'gps' ? 'bg-[#0b1220] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  GPS (Carga Externa)
                </button>
              </div>

              {renderCargaTables()}
            </div>
          </div>
        );
      case 'nutricion':
        return (
          <div className="space-y-6">
            <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
              <button 
                onClick={() => setSubSection('individual')} 
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${subSection === 'individual' || subSection === 'default' ? 'bg-[#0b1220] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Informe Individual
              </button>
              <button 
                onClick={() => setSubSection('grupal')} 
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${subSection === 'grupal' ? 'bg-[#0b1220] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Informe Grupal
              </button>
              <button 
                onClick={() => setSubSection('resumen')} 
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${subSection === 'resumen' ? 'bg-[#0b1220] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Resumen Grupal
              </button>
            </div>
            {subSection === 'resumen' ? (
              <NutricionResumenGrupal performanceRecords={clubRecords} />
            ) : (
              <NutricionArea 
                performanceRecords={clubRecords} 
                initialTab={subSection === 'grupal' ? 'general' : 'individual'} 
              />
            )}
          </div>
        );
      case 'medica':
        return <MedicaArea performanceRecords={clubRecords} />;
      case 'tecnica':
        return (
          <div className="space-y-6">
            <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
              <button 
                onClick={() => setSubSection('cronograma')} 
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${subSection === 'cronograma' || subSection === 'default' ? 'bg-[#0b1220] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Cronograma Semanal
              </button>
              <button 
                onClick={() => setSubSection('tareas')} 
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${subSection === 'tareas' ? 'bg-[#0b1220] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Tareas Semanales
              </button>
            </div>
            {subSection === 'tareas' ? (
              <CargaTareasArea performanceRecords={clubRecords} />
            ) : (
              <TecnicaArea performanceRecords={clubRecords} />
            )}
          </div>
        );
      case 'evaluaciones':
        return (
          <div className="bg-white rounded-[40px] p-12 text-center border border-slate-100">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fa-solid fa-vial-circle-check text-blue-500 text-3xl"></i>
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter mb-2">Evaluaciones Físicas</h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Módulo de tests de campo y laboratorio en desarrollo.</p>
          </div>
        );
      default:
        return null;
    }
  };

  const navItems = [
    { id: 'carga', label: 'Control de Carga', icon: 'fa-gauge-high' },
    { id: 'nutricion', label: 'Nutrición', icon: 'fa-apple-whole' },
    { id: 'medica', label: 'Área Médica', icon: 'fa-house-medical' },
    { id: 'tecnica', label: 'Área Técnica', icon: 'fa-clipboard-list' },
    { id: 'evaluaciones', label: 'Evaluaciones Físicas', icon: 'fa-vial' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-[#0b1220] p-8 md:p-12 rounded-[40px] md:rounded-[56px] border border-white/5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>
        <div className="relative z-10">
          <h2 className="text-3xl md:text-5xl font-black text-white uppercase italic tracking-tighter leading-none mb-2">
            Panel de Club: <span className="text-red-600">{selectedClub}</span>
          </h2>
          <p className="text-slate-500 text-[10px] md:text-xs font-black uppercase tracking-[0.3em]">Gestión integral de rendimiento y salud</p>
        </div>

        <div className="relative z-10 w-full md:w-72">
          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Cambiar Visualización de Club</label>
          <div className="relative">
            <select 
              value={selectedClub}
              onChange={(e) => setSelectedClub(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold text-sm outline-none appearance-none cursor-pointer hover:bg-white/10 transition-all"
            >
              {clubs.map(club => (
                <option key={club} value={club} className="bg-[#0b1220] text-white">{club}</option>
              ))}
            </select>
            <i className="fa-solid fa-chevron-down absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-xs"></i>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActiveSection(item.id as ClubSection);
              setSubSection(item.id === 'carga' ? 'wellness' : 'default');
            }}
            className={`flex items-center gap-3 px-6 py-4 rounded-[24px] text-[11px] font-black uppercase tracking-widest transition-all shadow-sm border ${
              activeSection === item.id 
                ? 'bg-[#0b1220] text-white border-[#0b1220] shadow-xl scale-105' 
                : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
            }`}
          >
            <i className={`fa-solid ${item.icon} ${activeSection === item.id ? 'text-blue-400' : ''}`}></i>
            {item.label}
          </button>
        ))}
      </div>

      <div className="animate-in slide-in-from-bottom-4 duration-500">
        {renderSection()}
      </div>
    </div>
  );
};

export default ClubDashboard;

