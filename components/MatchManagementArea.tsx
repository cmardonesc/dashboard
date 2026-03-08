
import React, { useState, useMemo } from 'react';
import { AthletePerformanceRecord } from '../types';

interface OpponentPlayer {
  number: string;
  name: string;
}

interface MatchEvent {
  type: 'goal' | 'sub' | 'card_yellow' | 'card_red';
  minute: number;
  playerId?: string; // Our player ID
  opponentPlayerNumber?: string;
  detail?: string;
}

interface MatchSession {
  id: string;
  opponentName: string;
  date: string;
  type: 'Amistoso' | 'Oficial';
  starters: string[]; // Player IDs
  reserves: string[]; // Player IDs
  captainId: string;
  opponentLineup: OpponentPlayer[];
  scoreHome: number;
  scoreAway: number;
  events: MatchEvent[];
  status: 'scheduled' | 'live' | 'finished';
}

interface MatchManagementAreaProps {
  performanceRecords: AthletePerformanceRecord[];
}

const MatchManagementArea: React.FC<MatchManagementAreaProps> = ({ performanceRecords }) => {
  const [matches, setMatches] = useState<MatchSession[]>([]);
  const [activeView, setActiveView] = useState<'list' | 'create' | 'live'>('list');
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(null);

  // Form State for new match
  const [newMatch, setNewMatch] = useState<Partial<MatchSession>>({
    opponentName: '',
    date: new Date().toISOString().split('T')[0],
    type: 'Amistoso',
    starters: [],
    reserves: [],
    captainId: '',
    opponentLineup: Array(11).fill(null).map(() => ({ number: '', name: '' })),
    scoreHome: 0,
    scoreAway: 0,
    events: [],
    status: 'scheduled'
  });

  const activeMatch = useMemo(() => 
    matches.find(m => m.id === currentMatchId), 
  [matches, currentMatchId]);

  const handleCreateMatch = () => {
    const match: MatchSession = {
      ...newMatch as MatchSession,
      id: Math.random().toString(36).substr(2, 9),
    };
    setMatches([...matches, match]);
    setActiveView('list');
  };

  const handleStartLive = (id: string) => {
    setMatches(matches.map(m => m.id === id ? { ...m, status: 'live' } : m));
    setCurrentMatchId(id);
    setActiveView('live');
  };

  const handleAddEvent = (matchId: string, event: MatchEvent) => {
    setMatches(matches.map(m => {
      if (m.id === matchId) {
        let newScoreHome = m.scoreHome;
        let newScoreAway = m.scoreAway;
        if (event.type === 'goal') {
          if (event.playerId) newScoreHome++;
          else newScoreAway++;
        }
        return { 
          ...m, 
          events: [...m.events, event],
          scoreHome: newScoreHome,
          scoreAway: newScoreAway
        };
      }
      return m;
    }));
  };

  const handleSubstitution = (matchId: string, outId: string, inId: string, minute: number) => {
    setMatches(matches.map(m => {
      if (m.id === matchId) {
        const newStarters = m.starters.filter(id => id !== outId);
        const newReserves = m.reserves.filter(id => id !== inId);
        return {
          ...m,
          starters: [...newStarters, inId],
          reserves: [...newReserves, outId],
          events: [...m.events, { type: 'sub', minute, detail: `Sale: ${getPlayerName(outId)} / Entra: ${getPlayerName(inId)}` }]
        };
      }
      return m;
    }));
  };

  const getPlayerName = (id: string) => performanceRecords.find(r => r.player.id === id)?.player.name || 'Desconocido';

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* HEADER */}
      <div className="bg-[#0b1220] rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden border border-white/5">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-red-600 rounded-3xl flex items-center justify-center text-4xl shadow-lg shadow-red-900/40">
              <i className="fa-solid fa-trophy"></i>
            </div>
            <div>
              <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-1">Competencia</h2>
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-[0.3em]">Gestión de Partidos y Rendimiento en Vivo</p>
            </div>
          </div>
          <div className="flex gap-4">
            {activeView !== 'list' && (
              <button 
                onClick={() => setActiveView('list')}
                className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
              >
                Volver al Listado
              </button>
            )}
            {activeView === 'list' && (
              <button 
                onClick={() => setActiveView('create')}
                className="px-8 py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-900/20"
              >
                Programar Partido
              </button>
            )}
          </div>
        </div>
      </div>

      {/* VIEW: LIST */}
      {activeView === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {matches.length === 0 ? (
            <div className="col-span-full bg-white rounded-[40px] p-20 text-center border border-slate-100 shadow-sm">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200 text-3xl">
                <i className="fa-solid fa-calendar-xmark"></i>
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase italic mb-2">No hay partidos programados</h3>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Comienza por programar el primer encuentro del microciclo</p>
            </div>
          ) : (
            matches.map(match => (
              <div key={match.id} className="bg-white rounded-[40px] border border-slate-100 shadow-sm hover:shadow-xl transition-all overflow-hidden group">
                <div className="bg-[#0b1220] p-8 text-white">
                  <div className="flex justify-between items-start mb-6">
                    <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${match.status === 'live' ? 'bg-red-600 animate-pulse' : 'bg-white/10'}`}>
                      {match.status}
                    </span>
                    <span className="text-white/30 text-[9px] font-black uppercase tracking-widest">{match.date}</span>
                  </div>
                  <h4 className="text-2xl font-black italic uppercase tracking-tighter mb-1">vs {match.opponentName}</h4>
                  <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">{match.type}</p>
                </div>
                <div className="p-8">
                  <div className="flex justify-between items-center mb-8">
                    <div className="text-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Local</p>
                      <p className="text-3xl font-black text-slate-900 italic">{match.scoreHome}</p>
                    </div>
                    <div className="text-slate-200 text-xl font-black italic">-</div>
                    <div className="text-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Rival</p>
                      <p className="text-3xl font-black text-slate-900 italic">{match.scoreAway}</p>
                    </div>
                  </div>
                  {match.status === 'scheduled' && (
                    <button 
                      onClick={() => handleStartLive(match.id)}
                      className="w-full py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all"
                    >
                      Iniciar Partido
                    </button>
                  )}
                  {match.status === 'live' && (
                    <button 
                      onClick={() => { setCurrentMatchId(match.id); setActiveView('live'); }}
                      className="w-full py-4 bg-[#0b1220] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
                    >
                      Ver Dashboard Vivo
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* VIEW: CREATE */}
      {activeView === 'create' && (
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
          <div className="bg-[#0b1220] p-10 text-white">
            <h3 className="text-2xl font-black italic uppercase tracking-tighter">Configuración de Encuentro</h3>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">Define la alineación y el equipo rival</p>
          </div>
          
          <div className="p-10 space-y-12">
            {/* BASIC INFO */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Nombre del Rival</label>
                <input 
                  type="text" 
                  value={newMatch.opponentName}
                  onChange={e => setNewMatch({...newMatch, opponentName: e.target.value})}
                  className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Ej: Argentina Sub-20"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Fecha</label>
                <input 
                  type="date" 
                  value={newMatch.date}
                  onChange={e => setNewMatch({...newMatch, date: e.target.value})}
                  className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Tipo de Partido</label>
                <select 
                  value={newMatch.type}
                  onChange={e => setNewMatch({...newMatch, type: e.target.value as any})}
                  className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="Amistoso">Amistoso</option>
                  <option value="Oficial">Oficial</option>
                </select>
              </div>
            </div>

            {/* LINEUP SELECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* TITULARES */}
              <div className="space-y-6">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-red-600 rounded-full"></span>
                  Titulares (11)
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  {Array(11).fill(null).map((_, i) => (
                    <select
                      key={i}
                      value={newMatch.starters?.[i] || ''}
                      onChange={e => {
                        const newStarters = [...(newMatch.starters || [])];
                        newStarters[i] = e.target.value;
                        setNewMatch({...newMatch, starters: newStarters});
                      }}
                      className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-[10px] font-bold outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="">Seleccionar Jugador {i+1}</option>
                      {performanceRecords.map(r => (
                        <option key={r.player.id} value={r.player.id}>{r.player.name}</option>
                      ))}
                    </select>
                  ))}
                </div>
              </div>

              {/* RIVAL LINEUP */}
              <div className="space-y-6">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-slate-900 rounded-full"></span>
                  Equipo Rival
                </h4>
                <div className="space-y-2">
                  {newMatch.opponentLineup?.map((p, i) => (
                    <div key={i} className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="N°"
                        value={p.number}
                        onChange={e => {
                          const newList = [...(newMatch.opponentLineup || [])];
                          newList[i] = { ...p, number: e.target.value };
                          setNewMatch({...newMatch, opponentLineup: newList});
                        }}
                        className="w-16 bg-slate-50 border-none rounded-xl px-4 py-3 text-[10px] font-bold outline-none focus:ring-2 focus:ring-slate-900"
                      />
                      <input 
                        type="text" 
                        placeholder="Nombre del Jugador"
                        value={p.name}
                        onChange={e => {
                          const newList = [...(newMatch.opponentLineup || [])];
                          newList[i] = { ...p, name: e.target.value };
                          setNewMatch({...newMatch, opponentLineup: newList});
                        }}
                        className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-[10px] font-bold outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-10 border-t border-slate-100 flex justify-end">
              <button 
                onClick={handleCreateMatch}
                className="px-12 py-5 bg-[#0b1220] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-xl"
              >
                Confirmar y Guardar Partido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: LIVE DASHBOARD */}
      {activeView === 'live' && activeMatch && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* SCOREBOARD */}
          <div className="bg-[#0b1220] rounded-[48px] p-12 text-white shadow-2xl relative overflow-hidden border border-white/5">
            <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
              <div className="text-center md:text-left">
                <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center mb-4 mx-auto md:mx-0 shadow-lg shadow-red-900/40">
                  <span className="text-2xl font-black italic">CHL</span>
                </div>
                <h3 className="text-3xl font-black italic uppercase tracking-tighter">Chile Sub-20</h3>
              </div>

              <div className="flex items-center gap-12">
                <span className="text-8xl font-black italic tracking-tighter">{activeMatch.scoreHome}</span>
                <div className="flex flex-col items-center gap-2">
                  <span className="px-4 py-1.5 bg-red-600 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">LIVE</span>
                  <span className="text-white/30 text-xl font-black italic">VS</span>
                </div>
                <span className="text-8xl font-black italic tracking-tighter">{activeMatch.scoreAway}</span>
              </div>

              <div className="text-center md:text-right">
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-4 mx-auto md:ml-auto shadow-lg">
                  <span className="text-2xl font-black italic">{activeMatch.opponentName.substring(0, 3).toUpperCase()}</span>
                </div>
                <h3 className="text-3xl font-black italic uppercase tracking-tighter">{activeMatch.opponentName}</h3>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* LIVE ACTIONS */}
            <div className="lg:col-span-8 space-y-8">
              {/* GOAL BUTTONS */}
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => handleAddEvent(activeMatch.id, { type: 'goal', minute: 45, playerId: activeMatch.starters[0] })}
                  className="bg-emerald-500 p-8 rounded-[32px] text-white flex flex-col items-center gap-3 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-900/20"
                >
                  <i className="fa-solid fa-futbol text-3xl"></i>
                  <span className="text-[10px] font-black uppercase tracking-widest">Gol Chile</span>
                </button>
                <button 
                  onClick={() => handleAddEvent(activeMatch.id, { type: 'goal', minute: 45, opponentPlayerNumber: '10' })}
                  className="bg-slate-800 p-8 rounded-[32px] text-white flex flex-col items-center gap-3 hover:bg-slate-900 transition-all shadow-lg"
                >
                  <i className="fa-solid fa-futbol text-3xl"></i>
                  <span className="text-[10px] font-black uppercase tracking-widest">Gol Rival</span>
                </button>
              </div>

              {/* LINEUP & SUBS */}
              <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-red-600 rounded-full"></span>
                  Gestión de Alineación
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {/* TITULARES */}
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">En Cancha</p>
                    <div className="space-y-2">
                      {activeMatch.starters.map(id => (
                        <div key={id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                          <span className="text-[10px] font-bold text-slate-700">{getPlayerName(id)}</span>
                          <button 
                            onClick={() => {
                              const subIn = activeMatch.reserves[0];
                              if (subIn) handleSubstitution(activeMatch.id, id, subIn, 60);
                              else alert("No hay reservas disponibles");
                            }}
                            className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-black uppercase tracking-widest"
                          >
                            Cambio <i className="fa-solid fa-right-left ml-1"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* RESERVAS */}
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Banca</p>
                    <div className="space-y-2">
                      {activeMatch.reserves.map(id => (
                        <div key={id} className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 italic">{getPlayerName(id)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* MATCH TIMELINE */}
            <div className="lg:col-span-4 bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-blue-500 rounded-full"></span>
                Cronología
              </h4>
              <div className="space-y-6">
                {activeMatch.events.length === 0 ? (
                  <p className="text-[10px] font-bold text-slate-300 italic text-center py-10">Esperando eventos...</p>
                ) : (
                  activeMatch.events.slice().reverse().map((event, i) => (
                    <div key={i} className="flex gap-4 items-start">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                        {event.type === 'goal' && <i className="fa-solid fa-futbol text-emerald-500"></i>}
                        {event.type === 'sub' && <i className="fa-solid fa-right-left text-blue-500"></i>}
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-900 italic">{event.minute}' - {event.type.toUpperCase()}</p>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">{event.detail || (event.playerId ? getPlayerName(event.playerId) : `Rival N°${event.opponentPlayerNumber}`)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchManagementArea;
