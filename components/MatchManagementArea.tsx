import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { AthletePerformanceRecord, CATEGORY_ID_MAP, REVERSE_CATEGORY_ID_MAP, MatchDB, Category } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ClubBadge from './ClubBadge';

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
  players?: any[];
  clubs?: any[];
  userRole?: string;
  userClub?: string;
  userClubId?: number | null;
  selectedCategoryId?: number | null;
}

const MatchManagementArea: React.FC<MatchManagementAreaProps> = ({ 
  performanceRecords, 
  players = [], 
  clubs = [],
  userRole,
  userClub,
  userClubId,
  selectedCategoryId
}) => {
  // Database states
  const [dbMatches, setDbMatches] = useState<any[]>([]);
  const [microcycles, setMicrocycles] = useState<any[]>([]);
  const [dbPlayers, setDbPlayers] = useState<any[]>([]);
  const [citations, setCitations] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [selectedCategoryState, setSelectedCategoryState] = useState<number | string>('TODAS');

  // View switches
  const [activeView, setActiveView] = useState<'list' | 'create' | 'live'>('list');
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);

  // Form State for edit/create
  const [form, setForm] = useState({
    id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    competition_type: 'Amistoso Nacional',
    opponent: '',
    location: '',
    city: '',
    category_id: 7, // Default to Sub-20
    microcycle_id: '',
    result: '',
    observations: ''
  });

  // Live session state
  const [liveSession, setLiveSession] = useState<MatchSession | null>(null);
  
  // Live session configuration
  const [liveConfig, setLiveConfig] = useState<{
    starters: string[];
    reserves: string[];
    opponentLineup: OpponentPlayer[];
  }>({
    starters: Array(11).fill(''),
    reserves: Array(7).fill(''),
    opponentLineup: Array(11).fill(null).map(() => ({ number: '', name: '' }))
  });

  const COMP_TYPES = [
    'Amistoso Nacional',
    'Amistoso Internacional',
    'Sudamericano',
    'Mundial',
    'Torneo Internacional',
    'Partido Nacional (Liga/Copa)',
    'Otro'
  ];

  // Sync category state with parent if provided
  useEffect(() => {
    if (selectedCategoryId) {
      setSelectedCategoryState(selectedCategoryId);
    }
  }, [selectedCategoryId]);

  // Load matches, microcycles and players
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch matches
      const { data: matchesData, error: matchesErr } = await supabase
        .from('matches')
        .select('*')
        .order('date', { ascending: false });
      
      if (matchesErr) throw matchesErr;

      // 2. Fetch microcycles
      const { data: mcData, error: mcErr } = await supabase
        .from('microcycles')
        .select('*')
        .order('micro_number', { ascending: true });
        
      if (mcErr) throw mcErr;

      // 3. Fetch players
      const { data: playersData, error: playersErr } = await supabase
        .from('players')
        .select('*')
        .order('nombre', { ascending: true });
        
      if (playersErr) throw playersErr;

      const mappedPlayers = (playersData || []).map((p: any) => {
        let categoryVal = p.category;
        if (!categoryVal && p.anio) {
          const age = 2026 - p.anio;
          if (age <= 13) categoryVal = Category.SUB_13;
          else if (age === 14) categoryVal = Category.SUB_14;
          else if (age === 15) categoryVal = Category.SUB_15;
          else if (age === 16) categoryVal = Category.SUB_16;
          else if (age === 17) categoryVal = Category.SUB_17;
          else if (age === 18) categoryVal = Category.SUB_18;
          else if (age <= 20) categoryVal = Category.SUB_20;
          else if (age <= 21) categoryVal = Category.SUB_21;
          else if (age <= 23) categoryVal = Category.SUB_23;
          else categoryVal = Category.ADULTA;
        } else if (!categoryVal) {
          categoryVal = Category.SUB_17;
        }
        return {
          ...p,
          category: categoryVal
        };
      });

      // 4. Fetch citations
      const { data: citData, error: citErr } = await supabase
        .from('citaciones')
        .select('player_id, microcycle_id');
        
      if (citErr) throw citErr;

      setDbMatches(matchesData || []);
      setMicrocycles(mcData || []);
      setDbPlayers(mappedPlayers);
      setCitations(citData || []);
    } catch (err) {
      console.error("Error loading matches & metadata in Competencia:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter matches based on selected category state
  const filteredMatches = useMemo(() => {
    if (selectedCategoryState === 'TODAS') return dbMatches;
    return dbMatches.filter(m => Number(m.category_id) === Number(selectedCategoryState));
  }, [dbMatches, selectedCategoryState]);

  // Microcycles filtered for the active form category
  const filteredMicrocyclesForForm = useMemo(() => {
    return microcycles.filter(mc => Number(mc.category_id) === Number(form.category_id));
  }, [microcycles, form.category_id]);

  // Players candidates filtered for active form category & selected microcycle citations
  const matchCandidates = useMemo(() => {
    const categoryPlayers = dbPlayers.filter(p => {
      const pCatId = p.category ? CATEGORY_ID_MAP[p.category.toLowerCase()] : null;
      return Number(pCatId) === Number(form.category_id);
    });
    
    if (form.microcycle_id) {
      const citedPlayerIdsInMicro = citations
        .filter(c => String(c.microcycle_id) === String(form.microcycle_id))
        .map(c => Number(c.player_id));
      
      const filteredByMicro = dbPlayers.filter(p => citedPlayerIdsInMicro.includes(Number(p.player_id)));
      
      // Fallback: if no players are cited, show all category players to ensure robustness.
      return filteredByMicro.length > 0 ? filteredByMicro : categoryPlayers;
    }
    
    return categoryPlayers.length > 0 ? categoryPlayers : dbPlayers;
  }, [dbPlayers, form.category_id, form.microcycle_id, citations]);

  // Helper to translate player ID to human name
  const getPlayerName = (id: string | number) => {
    const pl = dbPlayers.find(p => String(p.player_id) === String(id) || String(p.id) === String(id));
    if (!pl) return 'Desconocido';
    return `${pl.nombre} ${pl.apellido1 || ''}`.toUpperCase().trim();
  };

  // Helper to format match date
  const formatMatchDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr + 'T12:00:00'), 'dd MMMM, yyyy', { locale: es }).toUpperCase();
    } catch (err) {
      return dateStr;
    }
  };

  // Action to init new match
  const handleOpenCreate = () => {
    const currentCatId = selectedCategoryState !== 'TODAS' ? Number(selectedCategoryState) : 7;
    setForm({
      id: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      competition_type: 'Amistoso Nacional',
      opponent: '',
      location: '',
      city: '',
      category_id: currentCatId,
      microcycle_id: '',
      result: '',
      observations: ''
    });
    setEditingMatchId(null);
    
    // Reset live lineups as well
    setLiveConfig({
      starters: Array(11).fill(''),
      reserves: Array(7).fill(''),
      opponentLineup: Array(11).fill(null).map(() => ({ number: '', name: '' }))
    });

    setActiveView('create');
  };

  // Action to edit existing match
  const handleOpenEdit = (match: any) => {
    setForm({
      id: match.id,
      date: match.date,
      competition_type: match.competition_type || 'Amistoso Nacional',
      opponent: match.opponent,
      location: match.location || '',
      city: match.city || '',
      category_id: match.category_id || 7,
      microcycle_id: match.microcycle_id || '',
      result: match.result || '',
      observations: match.observations || ''
    });
    setEditingMatchId(match.id);
    setActiveView('create');
  };

  // Save/Create Match database record
  const handleSaveMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        date: form.date,
        opponent: form.opponent,
        competition_type: form.competition_type,
        location: form.location || null,
        city: form.city || null,
        category_id: Number(form.category_id),
        microcycle_id: form.microcycle_id ? form.microcycle_id : null,
        result: form.result || null,
        observations: form.observations || null,
      };

      if (editingMatchId) {
        const { error } = await supabase
          .from('matches')
          .update(payload)
          .eq('id', editingMatchId);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('matches')
          .insert([payload]);
        if (error) throw error;
      }

      setActiveView('list');
      fetchData();
    } catch (err) {
      console.error("Error saving match:", err);
      alert("Error al registrar el enfrentamiento");
    } finally {
      setSaving(false);
    }
  };

  // Delete match record
  const handleDeleteMatch = async (id: string) => {
    if (!window.confirm("¿Estás seguro de eliminar este partido permanentemente?")) return;
    try {
      const { error } = await supabase
        .from('matches')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error("Error deleting match:", err);
      alert("No se pudo eliminar el partido");
    }
  };

  // Initialize interactive live dashboard for a specific match
  const handleStartLive = (matchFromDb: any) => {
    // Populate form with this match to know the category
    setForm({
      id: matchFromDb.id,
      date: matchFromDb.date,
      competition_type: matchFromDb.competition_type || 'Amistoso Nacional',
      opponent: matchFromDb.opponent,
      location: matchFromDb.location || '',
      city: matchFromDb.city || '',
      category_id: matchFromDb.category_id || 7,
      microcycle_id: matchFromDb.microcycle_id || '',
      result: matchFromDb.result || '',
      observations: matchFromDb.observations || ''
    });

    const initialSession: MatchSession = {
      id: matchFromDb.id,
      opponentName: matchFromDb.opponent,
      date: matchFromDb.date,
      type: matchFromDb.competition_type.includes('Oficial') ? 'Oficial' : 'Amistoso',
      starters: liveConfig.starters.filter(id => id !== ''),
      reserves: liveConfig.reserves.filter(id => id !== ''),
      captainId: liveConfig.starters[0] || '',
      opponentLineup: liveConfig.opponentLineup,
      scoreHome: 0,
      scoreAway: 0,
      events: [],
      status: 'live'
    };

    setLiveSession(initialSession);
    setActiveView('live');
  };

  // Live operations
  const handleAddLiveEvent = (event: MatchEvent) => {
    if (!liveSession) return;
    
    let newScoreHome = liveSession.scoreHome;
    let newScoreAway = liveSession.scoreAway;
    
    if (event.type === 'goal') {
      if (event.playerId) {
        newScoreHome++;
      } else {
        newScoreAway++;
      }
    }

    setLiveSession({
      ...liveSession,
      scoreHome: newScoreHome,
      scoreAway: newScoreAway,
      events: [...liveSession.events, event]
    });
  };

  // Substitution tracker
  const handleLiveSubstitution = (outId: string, inId: string, minute: number) => {
    if (!liveSession) return;

    const updatedStarters = liveSession.starters.filter(id => id !== outId);
    const updatedReserves = liveSession.reserves.filter(id => id !== inId);

    setLiveSession({
      ...liveSession,
      starters: [...updatedStarters, inId],
      reserves: [...updatedReserves, outId],
      events: [...liveSession.events, { 
        type: 'sub', 
        minute, 
        detail: `SALE: ${getPlayerName(outId)} / ENTRA: ${getPlayerName(inId)}` 
      }]
    });
  };

  // Finish game and post summary details onto observations & score to results
  const handleFinishLiveSession = async () => {
    if (!liveSession) return;
    setSaving(true);
    try {
      const finalScore = `${liveSession.scoreHome}-${liveSession.scoreAway}`;
      
      const sessionEventsText = liveSession.events.map(ev => {
        const actor = ev.playerId ? getPlayerName(ev.playerId) : `RIVAL N°${ev.opponentPlayerNumber || 'S/N'}`;
        return `[MIN ${ev.minute}'] ${ev.type.toUpperCase()}: ${actor} ${ev.detail ? `(${ev.detail})` : ''}`;
      }).join('\n');

      const fullObservations = `ALINEACIÓN DE PARTIDO:\n` +
        `TITULARES: ${liveSession.starters.map(id => getPlayerName(id)).join(', ') || 'Sin asigar'}\n` +
        `RESERVAS: ${liveSession.reserves.map(id => getPlayerName(id)).join(', ') || 'Sin asignar'}\n\n` +
        `CRONOLOGÍA DE EVENTOS:\n${sessionEventsText || 'Sin incidencias en vivo.'}\n\n` +
        (form.observations ? `OBSERVACIONES GENERALES:\n${form.observations}` : '');

      const { error } = await supabase
        .from('matches')
        .update({
          result: finalScore,
          observations: fullObservations
        })
        .eq('id', liveSession.id);

      if (error) throw error;

      alert("¡Incidencias y resultado en vivo guardados con éxito en la Base de Datos!");
      setActiveView('list');
      fetchData();
    } catch (err) {
      console.error("Error saving live feedback:", err);
      alert("Error al archivar el partido");
    } finally {
      setSaving(false);
      setLiveSession(null);
    }
  };

  const currentCategoryLabel = useMemo(() => {
    if (selectedCategoryState === 'TODAS') return 'TODAS LAS SERIES';
    const catEnumName = REVERSE_CATEGORY_ID_MAP[Number(selectedCategoryState)];
    return catEnumName ? catEnumName.replace('_', ' ').toUpperCase() : 'CATEGORÍA ';
  }, [selectedCategoryState]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* HEADER */}
      <div className="bg-[#0b1220] rounded-[32px] md:rounded-[40px] p-6 md:p-10 text-white shadow-2xl relative overflow-hidden border border-white/5">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 md:gap-6">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-red-600 rounded-2xl md:rounded-3xl flex items-center justify-center text-3xl md:text-4xl shadow-lg shadow-red-900/40">
              <i className="fa-solid fa-trophy animate-bounce"></i>
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter mb-1">Competencia</h2>
              <p className="text-white/50 text-[8px] md:text-[10px] font-bold uppercase tracking-[0.2em] md:tracking-[0.3em]">
                {currentCategoryLabel} — Gestor de Enfrentamientos Reales
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
            {activeView !== 'list' && (
              <button 
                onClick={() => setActiveView('list')}
                className="w-full sm:w-auto px-6 md:px-8 py-3 md:py-4 bg-white/5 border border-white/10 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-arrow-left"></i> Volver al Listado
              </button>
            )}
            {activeView === 'list' && (
              <button 
                onClick={handleOpenCreate}
                className="w-full sm:w-auto px-6 md:px-8 py-3 md:py-4 bg-red-600 text-white rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-900/20 flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-plus"></i> Programar Partido
              </button>
            )}
          </div>
        </div>
      </div>

      {/* VIEW: LIST (Matches table database list) */}
      {activeView === 'list' && (
        <div className="space-y-6">
          {/* CATEGORY BAR FILTER */}
          <div className="bg-white rounded-2xl md:rounded-3xl p-4 border border-slate-100 shadow-sm flex flex-wrap gap-2 items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-4">Filtrar por Serie:</span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setSelectedCategoryState('TODAS')}
                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${
                  selectedCategoryState === 'TODAS'
                    ? 'bg-red-600 text-white shadow-xl shadow-red-900/10'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
              >
                Todas
              </button>
              {Object.entries(CATEGORY_ID_MAP).map(([catKey, catVal]) => (
                <button
                  key={catVal}
                  onClick={() => setSelectedCategoryState(catVal)}
                  className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${
                    Number(selectedCategoryState) === Number(catVal)
                      ? 'bg-red-600 text-white shadow-xl shadow-red-900/10'
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {catKey.replace('SUB_', 'SUB ')}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="py-24 text-center animate-pulse text-slate-400 text-sm font-black uppercase tracking-[0.2em]">
              <i className="fa-solid fa-spinner fa-spin text-red-600 text-2xl mb-4 block"></i>
              Sincronizando Partidos del Plan de Microciclos...
            </div>
          ) : filteredMatches.length === 0 ? (
            <div className="bg-white rounded-[32px] md:rounded-[40px] p-10 md:p-20 text-center border border-slate-100 shadow-sm">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300 text-2xl md:text-3xl">
                <i className="fa-solid fa-calendar-xmark"></i>
              </div>
              <h3 className="text-lg md:text-xl font-black text-slate-900 uppercase italic mb-2">No hay partidos registrados</h3>
              <p className="text-slate-400 text-[9px] md:text-[10px] font-bold uppercase tracking-widest max-w-sm mx-auto">
                No se encontraron encuentros en esta serie. Puedes agregar partidos directamente en la planificación de Microciclos, o programar un encuentro aquí.
              </p>
              <button 
                onClick={handleOpenCreate}
                className="mt-6 inline-flex items-center gap-2 bg-[#0b1220] hover:bg-red-600 text-white text-[10px] uppercase font-black tracking-widest px-6 py-3.5 rounded-xl transition-all"
              >
                <i className="fa-solid fa-plus"></i> Registrar Primer Partido
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMatches.map(match => {
                const matchCategory = REVERSE_CATEGORY_ID_MAP[match.category_id];
                const categoryLabel = matchCategory ? matchCategory.replace('_', ' ').toUpperCase() : `SUB ${match.category_id}`;
                const mc = microcycles.find(m => m.id === match.microcycle_id);
                
                return (
                  <div 
                    key={match.id} 
                    className="bg-white rounded-[32px] md:rounded-[40px] border border-slate-100 shadow-sm hover:shadow-xl transition-all overflow-hidden flex flex-col justify-between group h-full"
                  >
                    <div className="bg-[#0b1220] p-6 md:p-8 text-white relative">
                      <div className="flex justify-between items-start mb-4 md:mb-6">
                        <span className="px-3 py-1 bg-red-600 text-white rounded-full text-[8.5px] font-black uppercase tracking-widest shadow-sm">
                          {categoryLabel}
                        </span>
                        <div className="flex flex-col items-end">
                          <span className="text-white/40 text-[9px] font-black uppercase tracking-widest">{match.date}</span>
                          <span className="text-red-500 text-[8px] font-black uppercase tracking-wider">{match.competition_type}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <ClubBadge 
                          clubName={match.opponent} 
                          clubs={clubs} 
                          showName={false} 
                          logoSize="w-8 h-8"
                        />
                        <div>
                          <h4 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter leading-tight">
                            VS {match.opponent.toUpperCase()}
                          </h4>
                          {mc && (
                            <span className="text-white/40 text-[9px] font-black uppercase tracking-widest">
                              MICROCICLO #{mc.micro_number}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-6 md:p-8 flex flex-col justify-between flex-1 gap-6">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                          <div>
                            <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">Sede / Recinto</p>
                            <p className="text-xs font-black text-slate-800 uppercase italic">
                              {match.location || 'No Especificada'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">Ciudad</p>
                            <p className="text-xs font-bold text-slate-600 uppercase">
                              {match.city || '—'}
                            </p>
                          </div>
                        </div>

                        {match.observations && (
                          <div className="bg-slate-50 rounded-2xl p-4 text-[10px] font-bold text-slate-500 max-h-32 overflow-y-auto uppercase tracking-wide leading-relaxed">
                            <span className="block font-black text-slate-800 text-[8.5px] tracking-widest uppercase mb-1">Notas del Encuentro:</span>
                            {match.observations}
                          </div>
                        )}
                      </div>

                      <div className="space-y-3 pt-2">
                        {/* RESULT BOX */}
                        <div className="flex justify-between items-center bg-[#0b1220]/5 rounded-2xl p-4 border border-slate-100">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Resultado</span>
                          <span className="bg-[#0b1220] text-white px-4 py-1.5 rounded-xl text-sm font-black italic tracking-tight font-mono">
                            {match.result || 'PTE'}
                          </span>
                        </div>

                        {/* GAME MANAGEMENT ACTIONS */}
                        <div className="grid grid-cols-2 gap-2">
                          <button 
                            onClick={() => handleStartLive(match)}
                            className="w-full py-2.5 bg-red-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-700 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-red-900/10"
                            title="Llevar incidencias del partido en vivo"
                          >
                            <i className="fa-solid fa-gamepad"></i> En Vivo
                          </button>
                          <button 
                            onClick={() => handleOpenEdit(match)}
                            className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-1.5 shadow-md"
                            title="Llenar resultado, observaciones y sedes"
                          >
                            <i className="fa-solid fa-pen-to-square"></i> Llenar Datos
                          </button>
                        </div>
                        
                        <div className="flex justify-end opacity-20 hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleDeleteMatch(match.id)}
                            className="text-[8px] font-black text-red-500 uppercase tracking-widest hover:underline flex items-center gap-1"
                          >
                            <i className="fa-solid fa-trash"></i> Eliminar Partido
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW: CREATE/EDIT FORM */}
      {activeView === 'create' && (
        <div className="bg-white rounded-[32px] md:rounded-[40px] border border-slate-100 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
          <div className="bg-[#0b1220] p-6 md:p-10 text-white relative">
            <h3 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter">
              {editingMatchId ? 'Llenar & Editar Información del Encuentro' : 'Programar Nuevo Partido del Plan'}
            </h3>
            <p className="text-white/40 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mt-1">
              Guarda y asocia este partido a las series y microciclos activos
            </p>
          </div>
          
          <form onSubmit={handleSaveMatch} className="p-6 md:p-10 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* DATE */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Fecha del Partido</label>
                <input 
                  required
                  type="date" 
                  value={form.date}
                  onChange={e => setForm({...form, date: e.target.value})}
                  className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* RIVAL */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Rival</label>
                <input 
                  required
                  type="text" 
                  value={form.opponent}
                  onChange={e => setForm({...form, opponent: e.target.value})}
                  className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Ej: ARGENTINA SUB-20"
                />
              </div>

              {/* TYPE OF COMPETITION */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Tipo de Partido</label>
                <select 
                  value={form.competition_type}
                  onChange={e => setForm({...form, competition_type: e.target.value})}
                  className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                >
                  {COMP_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* LOCATION/RECINTO */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Sede / Recinto (Opcional)</label>
                <input 
                  type="text" 
                  value={form.location}
                  onChange={e => setForm({...form, location: e.target.value})}
                  className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Ej: Complejo Juan Pinto Durán"
                />
              </div>

              {/* CITY */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Ciudad (Opcional)</label>
                <input 
                  type="text" 
                  value={form.city}
                  onChange={e => setForm({...form, city: e.target.value})}
                  className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Ej: Santiago"
                />
              </div>

              {/* RESULT SCORE */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Resultado / Score (Opcional)</label>
                <input 
                  type="text" 
                  value={form.result}
                  onChange={e => setForm({...form, result: e.target.value})}
                  className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-xs font-black outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Ej: 2-1"
                />
              </div>

              {/* CATEGORY SELECTOR */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Serie / Categoría</label>
                <select 
                  value={form.category_id}
                  onChange={e => setForm({...form, category_id: Number(e.target.value), microcycle_id: ''})}
                  className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                >
                  {Object.entries(CATEGORY_ID_MAP).map(([catKey, catVal]) => (
                    <option key={catVal} value={catVal}>{catKey.replace('SUB_', 'SUB ')}</option>
                  ))}
                </select>
              </div>

              {/* ASSOCIATED MICROCICLE */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Microciclo Asociado (Opcional)</label>
                <select 
                  value={form.microcycle_id}
                  onChange={e => setForm({...form, microcycle_id: e.target.value})}
                  className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">-- No Asociar / Seleccione Microciclo --</option>
                  {filteredMicrocyclesForForm.map(mc => (
                    <option key={mc.id} value={mc.id}>
                      MICROCICLO #{mc.micro_number} — {mc.type || 'TRABAJO'} ({mc.start_date} al {mc.end_date})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* OBSERVATIONS AND NOTES */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Observaciones, Tácticas, Notas</label>
              <textarea 
                rows={4}
                value={form.observations}
                onChange={e => setForm({...form, observations: e.target.value})}
                className="w-full bg-slate-50 border-none rounded-3xl px-6 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Ingresar detalles generales sobre el partido, incidencias, clima, u observaciones de rendimiento..."
              />
            </div>

            {/* LIVE LINEUP SETUP (Optional layout) */}
            <div className="bg-slate-50 rounded-[32px] p-6 space-y-6">
              <div>
                <h4 className="text-xs font-black uppercase tracking-[0.1em] flex items-center gap-2 text-slate-800">
                  <i className="fa-solid fa-people-group text-red-600"></i>
                  Preparar Formación Inicial (Para Dashboard En Vivo)
                </h4>
                <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                  Configura de antemano los 11 jugadores titulares que disputarán el partido
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* SELECT STARTERS (11) */}
                <div className="space-y-3">
                  <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Alineación Inicial Titular:</h5>
                  <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-2">
                    {Array(11).fill(null).map((_, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-white rounded-xl p-2 border border-slate-100">
                        <span className="text-[9px] font-black text-slate-400 w-5 text-right">{idx + 1}.</span>
                        {(() => {
                          const val = liveConfig.starters[idx] || '';
                          const isManual = val === 'MANUAL' || (val && !dbPlayers.some(p => String(p.player_id) === String(val)));
                          
                          if (isManual) {
                            return (
                              <div className="flex-1 flex gap-2">
                                <input
                                  type="text"
                                  placeholder="Nombre del Jugador Manual..."
                                  value={val === 'MANUAL' ? '' : val}
                                  onChange={e => {
                                    const copy = [...liveConfig.starters];
                                    copy[idx] = e.target.value;
                                    setLiveConfig({...liveConfig, starters: copy});
                                  }}
                                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-[10px] font-bold outline-none uppercase"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const copy = [...liveConfig.starters];
                                    copy[idx] = '';
                                    setLiveConfig({...liveConfig, starters: copy});
                                  }}
                                  className="text-slate-400 hover:text-red-500 font-bold px-1.5 py-0.5 rounded text-[8px] bg-slate-100 uppercase"
                                >
                                  ✕ Borrar
                                </button>
                              </div>
                            );
                          }

                          return (
                            <select
                              value={val}
                              onChange={e => {
                                const copy = [...liveConfig.starters];
                                copy[idx] = e.target.value;
                                setLiveConfig({...liveConfig, starters: copy});
                              }}
                              className="flex-1 bg-slate-50 border-none rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none"
                            >
                              <option value="">Seleccionar Jugador...</option>
                              {matchCandidates.map(p => (
                                <option key={p.player_id} value={p.player_id}>
                                  {`${p.nombre} ${p.apellido1 || ''}`.toUpperCase().trim()} — {p.posicion || 'S/D'}
                                </option>
                              ))}
                              <option value="MANUAL flex">✏️ OTRO (ESCRIBIR MANUALMENTE...)</option>
                            </select>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                </div>

                {/* SELECT RESERVES (7) */}
                <div className="space-y-3">
                  <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Banca de Suplentes:</h5>
                  <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-2">
                    {Array(7).fill(null).map((_, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-white rounded-xl p-2 border border-slate-100">
                        <span className="text-[9px] font-black text-slate-400 w-5 text-right">SUPL.</span>
                        {(() => {
                          const val = liveConfig.reserves[idx] || '';
                          const isManual = val === 'MANUAL' || (val && !dbPlayers.some(p => String(p.player_id) === String(val)));
                          
                          if (isManual) {
                            return (
                              <div className="flex-1 flex gap-2">
                                <input
                                  type="text"
                                  placeholder="Nombre del Suplente Manual..."
                                  value={val === 'MANUAL' ? '' : val}
                                  onChange={e => {
                                    const copy = [...liveConfig.reserves];
                                    copy[idx] = e.target.value;
                                    setLiveConfig({...liveConfig, reserves: copy});
                                  }}
                                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-[10px] font-bold outline-none uppercase"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const copy = [...liveConfig.reserves];
                                    copy[idx] = '';
                                    setLiveConfig({...liveConfig, reserves: copy});
                                  }}
                                  className="text-slate-400 hover:text-red-500 font-bold px-1.5 py-0.5 rounded text-[8px] bg-slate-100 uppercase"
                                >
                                  ✕ Borrar
                                </button>
                              </div>
                            );
                          }

                          return (
                            <select
                              value={val}
                              onChange={e => {
                                const copy = [...liveConfig.reserves];
                                copy[idx] = e.target.value;
                                setLiveConfig({...liveConfig, reserves: copy});
                              }}
                              className="flex-1 bg-slate-50 border-none rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none"
                            >
                              <option value="">Seleccionar Jugador...</option>
                              {matchCandidates.map(p => (
                                <option key={p.player_id} value={p.player_id}>
                                  {`${p.nombre} ${p.apellido1 || ''}`.toUpperCase().trim()} — {p.posicion || 'S/D'}
                                </option>
                              ))}
                              <option value="MANUAL">✏️ OTRO (ESCRIBIR MANUALMENTE...)</option>
                            </select>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6 flex justify-end gap-4">
              <button 
                type="button"
                onClick={() => setActiveView('list')}
                className="px-6 py-4 bg-slate-100 font-black uppercase text-[10px] tracking-widest text-slate-500 rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={saving}
                className="px-8 py-4 bg-[#0b1220] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-xl disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i> Guardando...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-floppy-disk"></i> Guardar Configuración
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW: LIVE TRACKING DASHBOARD */}
      {activeView === 'live' && liveSession && (
        <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
          {/* SCOREBOARD */}
          <div className="bg-[#0b1220] rounded-[32px] md:rounded-[48px] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden border border-white/5">
            <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12">
              <div className="text-center md:text-left">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-red-600 rounded-xl md:rounded-2xl flex items-center justify-center mb-3 md:mb-4 mx-auto md:mx-0 shadow-lg shadow-red-900/40">
                  <span className="text-lg md:text-xl font-black italic">CHL</span>
                </div>
                <h3 className="text-xl md:text-3xl font-black italic uppercase tracking-tighter">La Roja Performance</h3>
              </div>

              <div className="flex items-center gap-6 md:gap-12">
                <span className="text-5xl md:text-8xl font-black italic tracking-tighter">{liveSession.scoreHome}</span>
                <div className="flex flex-col items-center gap-1 md:gap-2">
                  <span className="px-3 md:px-4 py-1 md:py-1.5 bg-red-600 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest animate-pulse">LIVE</span>
                  <span className="text-white/30 text-lg md:text-xl font-black italic">VS</span>
                </div>
                <span className="text-5xl md:text-8xl font-black italic tracking-tighter">{liveSession.scoreAway}</span>
              </div>

              <div className="text-center md:text-right">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-white/10 rounded-xl md:rounded-2xl flex items-center justify-center mb-3 md:mb-4 mx-auto md:ml-auto shadow-lg">
                  <span className="text-lg md:text-xl font-black italic">
                    {liveSession.opponentName.substring(0, 3).toUpperCase()}
                  </span>
                </div>
                <h3 className="text-xl md:text-3xl font-black italic uppercase tracking-tighter">
                  {liveSession.opponentName}
                </h3>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
            {/* LIVE ACTIONS */}
            <div className="lg:col-span-8 space-y-6 md:space-y-8">
              {/* GOAL BUTTONS */}
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => {
                    const goalScorer = liveSession.starters[0];
                    const min = Number(prompt("Ingrese el minuto del Gol de Chile:", "45") || "45");
                    handleAddLiveEvent({ type: 'goal', minute: min, playerId: goalScorer });
                  }}
                  className="bg-emerald-500 p-6 md:p-8 rounded-[24px] md:rounded-[32px] text-white flex flex-col items-center gap-2 md:gap-3 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-900/20"
                >
                  <i className="fa-solid fa-futbol text-2xl md:text-3xl"></i>
                  <span className="text-[10px] font-black uppercase tracking-widest">Gol Chile (+)</span>
                </button>
                <button 
                  onClick={() => {
                    const rivalNum = prompt("Ingrese el número de camiseta del anotador:", "10") || "10";
                    const min = Number(prompt("Ingrese el minuto del Gol del Rival:", "45") || "45");
                    handleAddLiveEvent({ type: 'goal', minute: min, opponentPlayerNumber: rivalNum });
                  }}
                  className="bg-slate-800 p-6 md:p-8 rounded-[24px] md:rounded-[32px] text-white flex flex-col items-center gap-2 md:gap-3 hover:bg-slate-900 transition-all shadow-lg"
                >
                  <i className="fa-solid fa-futbol text-2xl md:text-3xl"></i>
                  <span className="text-[10px] font-black uppercase tracking-widest">Gol Rival (+)</span>
                </button>
              </div>

              {/* LINEUP & SUBS */}
              <div className="bg-white rounded-[32px] md:rounded-[40px] p-6 md:p-10 border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                  <h4 className="text-[10px] md:text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-red-600 rounded-full"></span>
                    Gestión de Alineación
                  </h4>
                  <span className="text-[8.5px] font-black text-blue-500 bg-blue-50 px-2 py-1 rounded-md uppercase tracking-wider">
                    Sustitución Interactiva En Caliente
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                  {/* TITULARES */}
                  <div>
                    <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest mb-3">En Cancha ({liveSession.starters.length})</p>
                    <div className="space-y-2">
                      {liveSession.starters.map(id => (
                        <div key={id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 group">
                          <span className="text-[10px] font-black text-slate-850">{getPlayerName(id)}</span>
                          <button 
                            onClick={() => {
                              if (liveSession.reserves.length === 0) {
                                alert("No hay jugadores de reserva configurados en el banco");
                                return;
                              }
                              const replaceWith = prompt(
                                `¿Por quién reemplazarás a ${getPlayerName(id)}?\n\nSuplentes Disponibles:\n` +
                                liveSession.reserves.map((s, i) => `${i+1}. ${getPlayerName(s)}`).join('\n') +
                                `\n\nIngrese el número de la opción:`, "1"
                              );
                              if (replaceWith === null) return;
                              const idx = Number(replaceWith) - 1;
                              const selectedReserve = liveSession.reserves[idx];
                              if (selectedReserve) {
                                const min = Number(prompt("Ingrese el minuto de la sustitución:", "60") || "60");
                                handleLiveSubstitution(id, selectedReserve, min);
                              } else {
                                alert("Opción de suplente inválida");
                              }
                            }}
                            className="bg-blue-500 text-white px-2.5 py-1 rounded-lg text-[8.5px] font-black uppercase tracking-wider"
                          >
                            Reemplazar <i className="fa-solid fa-right-left ml-1"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* RESERVAS */}
                  <div>
                    <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest mb-3">Banca / Suplentes ({liveSession.reserves.length})</p>
                    <div className="space-y-2">
                      {liveSession.reserves.length === 0 ? (
                        <p className="text-[10px] text-slate-300 italic py-4">No se configuraron suplentes previos.</p>
                      ) : (
                        liveSession.reserves.map(id => (
                          <div key={id} className="p-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                            <span className="text-[10px] font-bold text-slate-400 italic">
                              {getPlayerName(id)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* MATCH TIMELINE */}
            <div className="lg:col-span-4 bg-white rounded-[32px] md:rounded-[40px] p-6 md:p-10 border border-slate-100 shadow-sm flex flex-col justify-between h-full">
              <div className="space-y-6">
                <h4 className="text-[10px] md:text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-blue-500 rounded-full"></span>
                  Minuto a Minuto
                </h4>
                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
                  {liveSession.events.length === 0 ? (
                    <p className="text-[9px] md:text-[10px] font-bold text-slate-300 italic text-center py-10 uppercase tracking-wider">
                      Esperando registro de goles o sustituciones...
                    </p>
                  ) : (
                    liveSession.events.slice().reverse().map((event, i) => (
                      <div key={i} className="flex gap-3 items-start animate-in fade-in-50">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                          {event.type === 'goal' && <i className="fa-solid fa-futbol text-emerald-500 text-sm"></i>}
                          {event.type === 'sub' && <i className="fa-solid fa-right-left text-blue-500 text-sm"></i>}
                        </div>
                        <div>
                          <p className="text-[9.5px] font-black text-slate-900 italic">
                            {event.minute}' — {event.type.toUpperCase()}
                          </p>
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                            {event.detail || (event.playerId ? getPlayerName(event.playerId) : `RIVAL N° ${event.opponentPlayerNumber}`)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* SAVE FINISH BTN */}
              <div className="pt-6 border-t border-slate-100 mt-6">
                <button 
                  onClick={handleFinishLiveSession}
                  disabled={saving}
                  className="w-full py-4 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/10 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i> Guardando...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-circle-check"></i> Finalizar y Sincronizar Match
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchManagementArea;
