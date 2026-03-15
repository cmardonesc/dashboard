import React, { useMemo, useState } from 'react';
import { AthletePerformanceRecord, User } from '../types';
import { normalizeClub } from '../lib/utils';
import { CLUB_LOGOS } from '../constants';

interface ClubHomeProps {
  performanceRecords: AthletePerformanceRecord[];
  userClub?: string;
}

const ClubHome: React.FC<ClubHomeProps> = ({ performanceRecords, userClub }) => {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const userClubLogo = useMemo(() => {
    if (!userClub) return null;
    return CLUB_LOGOS[normalizeClub(userClub)];
  }, [userClub]);

  const playersByYear = useMemo(() => {
    const groups: Record<number, User[]> = {};
    const uClubNorm = userClub ? normalizeClub(userClub) : null;

    performanceRecords.forEach(record => {
      const player = record.player;
      
      // Filter by club if userClub is provided
      if (uClubNorm) {
        const pClub = player.club_name || player.club || '';
        if (normalizeClub(pClub) !== uClubNorm) return;
      }

      let year = player.anio;
      
      if (!year && player.fecha_nacimiento) {
        year = new Date(player.fecha_nacimiento).getFullYear();
      }

      if (year) {
        if (!groups[year]) groups[year] = [];
        groups[year].push(player);
      }
    });
    return groups;
  }, [performanceRecords, userClub]);

  const clubPlayers = useMemo(() => {
    if (!userClub) return [];
    const uClubNorm = normalizeClub(userClub);
    return performanceRecords
      .map(r => r.player)
      .filter(p => normalizeClub(p.club_name || p.club || '') === uClubNorm);
  }, [performanceRecords, userClub]);

  const sortedYears = useMemo(() => {
    return Object.keys(playersByYear).map(Number).sort((a, b) => b - a);
  }, [playersByYear]);

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <div className="bg-[#0b1220] rounded-[40px] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full -mr-48 -mt-48 blur-3xl"></div>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase leading-none mb-2">
              Generaciones <span className="text-red-600">La Roja</span>
            </h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Explora los jugadores por año de nacimiento</p>
          </div>
          {userClubLogo && (
            <div className="hidden md:block">
              <img 
                src={userClubLogo} 
                alt={userClub} 
                className="h-24 w-auto object-contain brightness-0 invert opacity-50"
                referrerPolicy="no-referrer"
              />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-4 ml-4">
          <div className="w-2 h-8 bg-red-600 rounded-full"></div>
          <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Categorías por Año</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {sortedYears.map(year => (
            <button
              key={year}
              onClick={() => setSelectedYear(selectedYear === year ? null : year)}
              className={`group relative p-8 rounded-[32px] border transition-all duration-300 ${
                selectedYear === year 
                  ? 'bg-red-600 border-red-600 text-white shadow-xl shadow-red-900/40 scale-105' 
                  : 'bg-white border-slate-100 text-slate-900 hover:border-red-200 hover:shadow-lg'
              }`}
            >
              <div className={`text-4xl font-black italic tracking-tighter mb-2 ${selectedYear === year ? 'text-white' : 'text-slate-900'}`}>
                {year}
              </div>
              <div className={`text-[10px] font-black uppercase tracking-widest ${selectedYear === year ? 'text-white/60' : 'text-slate-400'}`}>
                {playersByYear[year].length} Jugadores
              </div>
              <div className={`absolute bottom-6 right-6 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                selectedYear === year ? 'bg-white text-red-600 rotate-180' : 'bg-slate-50 text-slate-300 group-hover:bg-red-50 group-hover:text-red-500'
              }`}>
                <i className="fa-solid fa-chevron-down text-[10px]"></i>
              </div>
            </button>
          ))}
          {sortedYears.length === 0 && (
            <div className="col-span-full py-12 text-center bg-white rounded-[32px] border border-dashed border-slate-200">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">No se encontraron registros de generaciones</p>
            </div>
          )}
        </div>
      </div>

      {selectedYear && (
        <div className="bg-white rounded-[40px] p-8 md:p-12 border border-slate-100 shadow-sm animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">
              Jugadores Generación <span className="text-red-600">{selectedYear}</span>
            </h2>
            <div className="px-4 py-2 bg-slate-50 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {playersByYear[selectedYear].length} Registrados
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {playersByYear[selectedYear].map(player => {
              const pClub = player.club_name || player.club || '';
              const pLogo = CLUB_LOGOS[normalizeClub(pClub)];
              
              return (
                <div 
                  key={player.id_del_jugador}
                  className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-slate-200 transition-all group"
                >
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-400 font-black text-xs shadow-sm group-hover:bg-red-600 group-hover:text-white transition-all overflow-hidden p-1">
                    {pLogo ? (
                      <img src={pLogo} alt={pClub} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <span>{player.nombre?.[0]}{player.apellido1?.[0]}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase italic tracking-tight">
                      {player.nombre} {player.apellido1} {player.apellido2}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{player.position || 'S/D'}</span>
                      <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                      <span className="text-[9px] font-black text-red-600 uppercase tracking-widest">{pClub || 'S/D'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {userClub && (
        <div className="space-y-6">
          <div className="flex items-center gap-4 ml-4">
            <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
            <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">
              Jugadores de <span className="text-blue-600">{userClub}</span> en Selección
            </h2>
          </div>
          
          <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Jugador</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Posición</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Año</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {clubPlayers.map(player => (
                    <tr key={player.id_del_jugador} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-black text-[10px] group-hover:bg-blue-600 group-hover:text-white transition-all overflow-hidden p-1">
                            {userClubLogo ? (
                              <img src={userClubLogo} alt={userClub} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                            ) : (
                              <span>{player.nombre?.[0]}{player.apellido1?.[0]}</span>
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-900 uppercase italic tracking-tight">{player.nombre} {player.apellido1}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{player.apellido2 || ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{player.position || 'S/D'}</span>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                          {player.anio || (player.fecha_nacimiento ? new Date(player.fecha_nacimiento).getFullYear() : 'S/D')}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button className="w-8 h-8 rounded-lg bg-slate-50 text-slate-300 flex items-center justify-center hover:bg-blue-50 hover:text-blue-600 transition-all">
                          <i className="fa-solid fa-eye text-[10px]"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {clubPlayers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-8 py-12 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest">
                        No se encontraron jugadores de tu club en los registros actuales
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

export default ClubHome;
