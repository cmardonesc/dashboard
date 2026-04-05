
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AthletePerformanceRecord, Category, User, MicrocicloDB, CATEGORY_ID_MAP, UserRole } from '../types';
import { supabase } from '../lib/supabase';
import { triggerPushNotification } from '../lib/notifications';

interface MedicaAreaProps {
  performanceRecords: AthletePerformanceRecord[];
  onMenuChange?: (id: any) => void;
}

type MedicaView = 'dashboard' | 'report_injury' | 'reintegro_gps' | 'calendar' | 'daily_report';

interface DailyReport {
  id: string;
  id_del_jugador: number;
  anio: number;
  report_date: string;
  observation: string;
  diagnostico_medico?: string;
  treatments_applied?: string[];
  severity: 'low' | 'medium' | 'high';
  players?: {
    nombre: string;
    apellido1: string;
  };
}

interface DBInjury {
  id: string;
  player_id: number;
  microcycle_id?: number;
  category_id?: number;
  fecha_inicio: string;
  estado: string;
  disponibilidad: string;
  localizacion: string;
  tipo_lesion: string;
  momento_lesion: string;
  lado: string;
  mecanismo: string;
  diagnostico_clinico: string;
  diagnostico_funcional: string;
  restricciones: string;
  fecha_estimada_retorno: string;
  fecha_alta: string;
  observaciones: string;
  ultimo_control: string;
  players?: {
    nombre: string;
    apellido1: string;
    posicion: string;
    club?: string;
  };
}

interface MedicalExam {
  id: string;
  date: string;
  type: string;
  description: string;
}

const MedicaArea: React.FC<MedicaAreaProps> = ({ performanceRecords, onMenuChange }) => {
  const [view, setView] = useState<MedicaView>('daily_report');
  const [reportingPlayer, setReportingPlayer] = useState<User | null>(null);
  const [editingInjuryId, setEditingInjuryId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [foundPlayers, setFoundPlayers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [dbInjuries, setDbInjuries] = useState<DBInjury[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [dailyReportForm, setDailyReportForm] = useState({
    observation: '',
    diagnostico_medico: '',
    severity: 'low' as 'low' | 'medium' | 'high'
  });

  const [availableTreatmentOptions, setAvailableTreatmentOptions] = useState<string[]>([
    'Vendaje', 'Masoterapia', 'Electroterapia', 'Tecarterapia', 'Hielo local', 
    'Crioconpresión', 'Compresa húmedo caliente', 'Terapia manual', 
    'Terapia invasiva', 'Ventosas', 'Otros'
  ]);
  const [selectedTreatments, setSelectedTreatments] = useState<string[]>([]);
  const [newTreatmentOption, setNewTreatmentOption] = useState('');

  const [exams, setExams] = useState<MedicalExam[]>([]);
  const [newExam, setNewExam] = useState<MedicalExam>({
    id: '',
    date: new Date().toISOString().split('T')[0],
    type: 'Resonancia',
    description: ''
  });

  const [injuryForm, setInjuryForm] = useState({
    fecha_inicio: new Date().toISOString().split('T')[0],
    momento_lesion: 'Entrenamiento',
    lado: 'Derecho',
    localizacion: '',
    tipo_lesion: 'Muscular',
    mecanismo: 'No Contacto',
    diagnostico_clinico: '',
    diagnostico_funcional: '',
    estado: 'Activo',
    disponibilidad: 'No Disponible',
    restricciones: '',
    fecha_estimada_retorno: '',
    fecha_alta: '',
    ultimo_control: new Date().toISOString().split('T')[0],
    observaciones: ''
  });

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState<{ id: string, name: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [selectedGpsPlayer, setSelectedGpsPlayer] = useState<DBInjury | null>(null);

  const filteredInjuries = useMemo(() => {
    if (!selectedCategoryId) return dbInjuries;
    return dbInjuries.filter(i => i.category_id === selectedCategoryId);
  }, [dbInjuries, selectedCategoryId]);

  useEffect(() => {
    fetchInjuredPlayers();
    fetchDailyReports();
    
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setFoundPlayers([]);
        setHasSearched(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchTerm.trim().length >= 2) {
      const term = searchTerm.toLowerCase();
      const parts = term.split(' ').filter(p => p.length > 0);
      
      const filtered = performanceRecords
        .map(r => r.player)
        .filter(p => {
          const fullName = p.name.toLowerCase();
          return parts.every(part => fullName.includes(part));
        })
        .slice(0, 8);

      setFoundPlayers(filtered);
      setHasSearched(true);
    } else {
      setFoundPlayers([]);
      setHasSearched(false);
    }
  }, [searchTerm, performanceRecords]);

  const fetchInjuredPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('lesionados')
        .select('*, players(nombre, apellido1, posicion, club)')
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      if (data) setDbInjuries(data);
    } catch (err) {
      console.error("Error cargando lesionados:", err);
    }
  };

  const fetchDailyReports = async () => {
    try {
      const { data, error } = await supabase
        .from('medical_daily_reports')
        .select('*, players(nombre, apellido1)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (data) setDailyReports(data);
    } catch (err) {
      console.error("Error cargando reportes diarios:", err);
    }
  };

  const uniqueDiagnoses = useMemo(() => {
    const diagnoses = dailyReports
      .map(r => r.diagnostico_medico)
      .filter((d): d is string => !!d && d.trim().length > 0);
    return Array.from(new Set(diagnoses)).sort();
  }, [dailyReports]);

  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredSuggestions = useMemo(() => {
    if (!dailyReportForm.diagnostico_medico) return uniqueDiagnoses;
    const term = dailyReportForm.diagnostico_medico.toLowerCase();
    return uniqueDiagnoses.filter(d => d.toLowerCase().includes(term));
  }, [uniqueDiagnoses, dailyReportForm.diagnostico_medico]);

  const handleToggleTreatment = (option: string) => {
    setSelectedTreatments(prev => 
      prev.includes(option) ? prev.filter(t => t !== option) : [...prev, option]
    );
  };

  const handleAddCustomTreatment = () => {
    if (newTreatmentOption.trim() && !availableTreatmentOptions.includes(newTreatmentOption.trim())) {
      setAvailableTreatmentOptions(prev => [...prev, newTreatmentOption.trim()]);
      setSelectedTreatments(prev => [...prev, newTreatmentOption.trim()]);
      setNewTreatmentOption('');
    }
  };

  const handleSaveDailyReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingPlayer || !dailyReportForm.observation) return;
    setLoading(true);
    try {
      // Extraemos el año del club (ej: "2008" -> 2008)
      const playerYear = parseInt(reportingPlayer.club || '0');

      const { error } = await supabase.from('medical_daily_reports').insert([{
        id_del_jugador: reportingPlayer.id_del_jugador,
        anio: playerYear,
        observation: dailyReportForm.observation,
        diagnostico_medico: dailyReportForm.diagnostico_medico,
        severity: dailyReportForm.severity,
        treatments_applied: selectedTreatments // Guardamos el arreglo de tratamientos
      }]);
      if (error) throw error;

      // Disparar notificación push (vía Edge Function)
      triggerPushNotification({
        title: `Nuevo Reporte Médico: ${reportingPlayer.name}`,
        body: `${dailyReportForm.diagnostico_medico || 'Sin diagnóstico'}. Gravedad: ${dailyReportForm.severity}`,
        url: '/medica'
      }).catch(err => console.error("Error disparando notificación:", err));

      setSuccessMessage("REPORTE MÉDICO GUARDADO.");
      setDailyReportForm({ observation: '', diagnostico_medico: '', severity: 'low' });
      setSelectedTreatments([]); // Limpiamos tratamientos seleccionados
      setReportingPlayer(null);
      setSearchTerm(''); // Limpiar término de búsqueda
      setFoundPlayers([]); // Limpiar jugadores encontrados
      setHasSearched(false); // Resetear estado de búsqueda
      fetchDailyReports();

      // Auto-ocultar mensaje de éxito a los 2 segundos
      setTimeout(() => {
        setSuccessMessage(null);
      }, 2000);
    } catch (err: any) {
      setErrorMessage("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlayerForReport = (player: User) => {
    setReportingPlayer(player);
    setEditingInjuryId(null);
    setExams([]);
    setNewExam({
      id: '',
      date: new Date().toISOString().split('T')[0],
      type: 'Resonancia',
      description: ''
    });
    setInjuryForm({
      fecha_inicio: new Date().toISOString().split('T')[0],
      momento_lesion: 'Entrenamiento',
      lado: 'Derecho',
      localizacion: '',
      tipo_lesion: 'Muscular',
      mecanismo: 'No Contacto',
      diagnostico_clinico: '',
      diagnostico_funcional: '',
      estado: 'Activo',
      disponibilidad: 'No Disponible',
      restricciones: '',
      fecha_estimada_retorno: '',
      fecha_alta: '',
      ultimo_control: new Date().toISOString().split('T')[0],
      observaciones: ''
    });
    setView('report_injury');
    setSearchTerm('');
    setFoundPlayers([]);
    setHasSearched(false);
  };

  const handleEditClick = (injury: DBInjury) => {
    setReportingPlayer({
      id: `p-${injury.player_id}`,
      id_del_jugador: injury.player_id,
      name: `${injury.players?.nombre} ${injury.players?.apellido1}`,
      role: UserRole.PLAYER,
      club: injury.players?.club,
      position: injury.players?.posicion
    });
    setEditingInjuryId(injury.id);

    const parts = (injury.observaciones || '').split('\n\n[[EXAMS_DATA]]\n');
    const obsText = parts[0];
    let loadedExams: MedicalExam[] = [];
    if (parts.length > 1) {
      try {
        loadedExams = JSON.parse(parts[1]);
      } catch (e) {
        console.error("Error parsing exams:", e);
      }
    }
    setExams(loadedExams);

    setInjuryForm({
      fecha_inicio: injury.fecha_inicio,
      momento_lesion: injury.momento_lesion,
      lado: injury.lado,
      localizacion: injury.localizacion,
      tipo_lesion: injury.tipo_lesion,
      mecanismo: injury.mecanismo,
      diagnostico_clinico: injury.diagnostico_clinico,
      diagnostico_funcional: injury.diagnostico_funcional,
      estado: injury.estado,
      disponibilidad: injury.disponibilidad,
      restricciones: injury.restricciones || '',
      fecha_estimada_retorno: injury.fecha_estimada_retorno || '',
      fecha_alta: injury.fecha_alta || '',
      ultimo_control: injury.ultimo_control || '',
      observaciones: obsText
    });
    setView('report_injury');
  };

  const handleDeleteInjury = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('lesionados').delete().eq('id', id);
      if (error) throw error;
      setSuccessMessage("REGISTRO CLÍNICO ELIMINADO.");
      fetchInjuredPlayers();

      // Auto-ocultar mensaje de éxito a los 2 segundos
      setTimeout(() => {
        setSuccessMessage(null);
      }, 2000);
    } catch (err: any) {
      setErrorMessage("Error al eliminar: " + err.message);
    } finally {
      setLoading(false);
      setShowConfirmDelete(null);
    }
  };

  const handleQuickAction = () => {
    if (foundPlayers.length > 0) {
      handleSelectPlayerForReport(foundPlayers[0]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleQuickAction();
    }
  };

  const handleSaveInjury = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingPlayer) return;

    setLoading(true);
    try {
      const finalObs = injuryForm.observaciones + (exams.length > 0 ? '\n\n[[EXAMS_DATA]]\n' + JSON.stringify(exams) : '');

      const payload = {
        player_id: reportingPlayer.id_del_jugador,
        fecha_inicio: injuryForm.fecha_inicio,
        momento_lesion: injuryForm.momento_lesion,
        lado: injuryForm.lado,
        localizacion: injuryForm.localizacion,
        tipo_lesion: injuryForm.tipo_lesion,
        mecanismo: injuryForm.mecanismo,
        diagnostico_clinico: injuryForm.diagnostico_clinico,
        diagnostico_funcional: injuryForm.diagnostico_funcional,
        estado: injuryForm.estado,
        disponibilidad: injuryForm.disponibilidad,
        restricciones: injuryForm.restricciones,
        fecha_estimada_retorno: injuryForm.fecha_estimada_retorno || null,
        fecha_alta: injuryForm.fecha_alta || null,
        ultimo_control: injuryForm.ultimo_control || null,
        observaciones: finalObs
      };

      if (editingInjuryId) {
        const { error } = await supabase.from('lesionados').update(payload).eq('id', editingInjuryId);
        if (error) throw error;
        setSuccessMessage("FICHA CLÍNICA ACTUALIZADA CON ÉXITO.");
      } else {
        const { error } = await supabase.from('lesionados').insert([payload]);
        if (error) throw error;
        setSuccessMessage("FICHA MÉDICA GUARDADA Y SINCRONIZADA.");
      }

      // Auto-ocultar mensaje de éxito a los 2 segundos
      setTimeout(() => {
        setSuccessMessage(null);
      }, 2000);

      fetchInjuredPlayers();
      setReportingPlayer(null);
      setEditingInjuryId(null);
      setView('dashboard');
    } catch (err: any) {
      setErrorMessage("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExam = () => {
    if (!newExam.description) return;
    setExams([...exams, { ...newExam, id: Date.now().toString() }]);
    setNewExam({
      id: '',
      date: new Date().toISOString().split('T')[0],
      type: 'Resonancia',
      description: ''
    });
  };

  const handleRemoveExam = (id: string) => {
    setExams(exams.filter(e => e.id !== id));
  };

  const getFaseColor = (fase: string) => {
    const f = fase.toLowerCase();
    if (f.includes('activo') || f.includes('lesionado')) return 'bg-red-100 text-red-600';
    if (f.includes('retorno') || f.includes('parcial')) return 'bg-amber-100 text-amber-600';
    if (f.includes('alta')) return 'bg-emerald-100 text-emerald-600';
    return 'bg-slate-100 text-slate-600';
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Pendiente';
    return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 transform-gpu">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 md:p-8 rounded-[32px] md:rounded-[40px] border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tighter italic flex items-center gap-2">
            Área Médica <span className="text-red-500">LR</span>
          </h2>
          <p className="text-slate-500 text-[10px] md:text-sm font-medium">Gestión clínica y disponibilidad de jugadores.</p>
        </div>
        
        <div className="flex flex-wrap gap-2 md:gap-3">
          <button 
            onClick={() => setView('dashboard')}
            className={`flex-1 md:flex-none px-4 md:px-6 py-3 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${view === 'dashboard' ? 'bg-[#0b1220] text-white shadow-xl' : 'bg-white text-slate-400 border border-slate-200'}`}
          >
            Tablero Lesiones
          </button>
          <button 
            onClick={() => setView('daily_report')}
            className={`flex-1 md:flex-none px-4 md:px-6 py-3 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${view === 'daily_report' ? 'bg-[#0b1220] text-white shadow-xl' : 'bg-white text-slate-400 border border-slate-200'}`}
          >
            Reporte Diario
          </button>
          <button 
            onClick={() => setView('calendar')}
            className={`flex-1 md:flex-none px-4 md:px-6 py-3 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${view === 'calendar' ? 'bg-[#0b1220] text-white shadow-xl' : 'bg-white text-slate-400 border border-slate-200'}`}
          >
            Calendario Lesiones
          </button>
          <button 
            onClick={() => setView('reintegro_gps')}
            className={`w-full md:w-auto px-4 md:px-6 py-3 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${view === 'reintegro_gps' ? 'bg-[#CF1B2B] text-white shadow-xl' : 'bg-white text-slate-400 border border-slate-200'}`}
          >
            Reintegro del GPS
          </button>
        </div>
      </div>

      {view === 'dashboard' && (
        <div className="space-y-8 md:space-y-12 animate-in fade-in duration-300">
          <section className="bg-white p-6 md:p-10 rounded-[32px] md:rounded-[48px] border border-slate-100 shadow-sm space-y-6 relative overflow-visible">
            <div className="flex items-center justify-between">
              <h3 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3 italic">
                <span className="w-2 h-5 md:h-6 bg-red-600 rounded-full"></span>
                Gestión Clínica: Buscar Atleta
              </h3>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4 relative" ref={searchRef}>
              <div className="relative flex-1 group">
                <i className="fa-solid fa-magnifying-glass absolute left-5 md:left-6 top-1/2 -translate-y-1/2 text-slate-300 text-base md:text-lg transition-colors group-focus-within:text-red-500"></i>
                <input 
                  type="text" 
                  placeholder="Escriba el nombre del jugador..."
                  className="w-full bg-slate-50 border-none rounded-2xl md:rounded-3xl px-12 md:px-16 py-4 md:py-6 text-[11px] md:text-sm font-black text-slate-900 outline-none focus:ring-4 focus:ring-red-500/10 shadow-inner transition-all"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoComplete="off"
                />
                
                {hasSearched && (
                  <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-[24px] md:rounded-[32px] shadow-[0_40px_100px_rgba(0,0,0,0.2)] border border-slate-100 overflow-hidden z-[999] animate-in slide-in-from-top-2 duration-200">
                    {foundPlayers.length > 0 ? (
                      <div className="p-2 md:p-3 space-y-1">
                        {foundPlayers.map((p, idx) => (
                          <button 
                            key={p.id}
                            onClick={() => handleSelectPlayerForReport(p)}
                            className={`w-full flex items-center justify-between p-3 md:p-4 hover:bg-red-50 rounded-xl md:rounded-2xl transition-all text-left group ${idx === 0 ? 'bg-slate-50/50' : ''}`}
                          >
                            <div className="flex items-center gap-3 md:gap-4">
                              <div className="w-8 h-8 md:w-10 md:h-10 bg-[#0b1220] text-white rounded-lg md:rounded-xl flex items-center justify-center font-black italic text-[10px] md:text-xs group-hover:bg-red-600 transition-colors shadow-sm">
                                {p.name?.charAt(0)}
                              </div>
                              <div>
                                <p className="text-[10px] md:text-xs font-black text-slate-900 uppercase italic leading-none">{p.name}</p>
                                <p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                  {p.club} • {p.position}
                                </p>
                              </div>
                            </div>
                            {idx === 0 && (
                              <span className="hidden sm:inline-block text-[8px] font-black bg-red-100 text-red-600 px-3 py-1 rounded-full uppercase tracking-tighter">Enter para seleccionar</span>
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 md:p-12 text-center bg-white">
                        <i className="fa-solid fa-user-slash text-slate-200 text-3xl md:text-4xl mb-4"></i>
                        <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest italic">Atleta no registrado</p>
                      </div>
                    )}
                    <div className="bg-slate-50 p-3 md:p-4 text-center border-t border-slate-100">
                       <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Fuente oficial: Tabla 'players' Supabase</p>
                    </div>
                  </div>
                )}
              </div>
              
              <button 
                onClick={handleQuickAction}
                disabled={foundPlayers.length === 0}
                className={`px-8 md:px-12 py-4 md:py-6 rounded-2xl md:rounded-3xl text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 ${foundPlayers.length > 0 ? 'bg-[#0b1220] text-white hover:bg-red-600' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
              >
                INGRESAR <i className="fa-solid fa-arrow-right-to-bracket"></i>
              </button>
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3 italic">
                <span className="w-2 h-6 bg-amber-500 rounded-full"></span>
                Atletas Lesionados (Sincronizado)
              </h3>
              <div className="bg-amber-50 px-5 py-2 rounded-full text-[9px] font-black text-amber-600 uppercase italic">
                {filteredInjuries.length} REGISTROS ACTIVOS
              </div>
            </div>
            
            <div className="bg-white rounded-[32px] md:rounded-[40px] border border-slate-100 shadow-xl overflow-hidden overflow-x-auto">
              <table className="w-full text-[9px] md:text-[10px] text-center border-collapse min-w-[800px] md:min-w-full">
                <thead className="bg-[#0b1220] text-white font-black uppercase tracking-widest">
                  <tr>
                    <th className="px-6 md:px-10 py-4 md:py-6 text-left">Atleta</th>
                    <th className="px-2 md:px-4 py-4 md:py-6 text-left">Localización</th>
                    <th className="px-2 md:px-4 py-4 md:py-6 text-left">Diagnóstico</th>
                    <th className="px-2 md:px-4 py-4 md:py-6">Estado</th>
                    <th className="px-2 md:px-4 py-4 md:py-6">Disponibilidad</th>
                    <th className="px-2 md:px-4 py-4 md:py-6">Inicio</th>
                    <th className="px-6 md:px-10 py-4 md:py-6 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                  {filteredInjuries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 md:py-24 text-slate-300 font-black uppercase tracking-widest italic opacity-50 text-center">
                        <i className="fa-solid fa-notes-medical text-3xl md:text-4xl mb-4 block"></i>
                        No hay reportes clínicos activos{selectedCategoryId ? ' para esta categoría' : ''}.
                      </td>
                    </tr>
                  ) : (
                    filteredInjuries.map(injury => {
                      const athleteName = `${injury.players?.nombre} ${injury.players?.apellido1}`;
                      return (
                        <tr key={injury.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 md:px-10 py-4 md:py-6 text-left">
                            <p className="font-black text-slate-900 uppercase italic text-[11px] md:text-xs leading-none group-hover:text-red-600 transition-colors">
                              {athleteName}
                            </p>
                            <p className="text-[7px] md:text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-1">{injury.players?.posicion}</p>
                          </td>
                          <td className="px-2 md:px-4 py-4 md:py-6 text-left">
                            <span className="text-slate-900 font-black uppercase tracking-tighter">{injury.localizacion}</span>
                            <p className="text-[7px] md:text-[8px] text-slate-400 uppercase">{injury.lado}</p>
                          </td>
                          <td className="px-2 md:px-4 py-4 md:py-6 text-left italic text-slate-500 max-w-[150px] md:max-w-xs truncate">{injury.diagnostico_clinico}</td>
                          <td className="px-2 md:px-4 py-4 md:py-6">
                            <span className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-[7px] md:text-[8px] font-black uppercase tracking-tighter ${getFaseColor(injury.estado)}`}>
                              {injury.estado === 'Activo' ? 'LESIONADO' : injury.estado}
                            </span>
                          </td>
                          <td className="px-2 md:px-4 py-4 md:py-6">
                             <span className={`text-[7px] md:text-[8px] font-black uppercase px-2 md:px-3 py-1 rounded-lg ${injury.disponibilidad.toLowerCase().includes('no') ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                               {injury.disponibilidad}
                             </span>
                          </td>
                          <td className="px-2 md:px-4 py-4 md:py-6 text-slate-400 font-black">
                             {new Date(injury.fecha_inicio).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                          </td>
                          <td className="px-6 md:px-10 py-4 md:py-6 text-right">
                             <div className="flex justify-end gap-1.5 md:gap-2">
                                <button 
                                  onClick={() => handleEditClick(injury)}
                                  className="w-8 h-8 md:w-10 md:h-10 bg-slate-100 text-slate-400 rounded-lg md:rounded-xl flex items-center justify-center hover:bg-[#0b1220] hover:text-white transition-all shadow-sm active:scale-90"
                                  title="Editar Ficha"
                                >
                                   <i className="fa-solid fa-pen-to-square text-[10px] md:text-xs"></i>
                                </button>
                                <button 
                                  onClick={() => setShowConfirmDelete({ id: injury.id, name: athleteName })}
                                  className="w-8 h-8 md:w-10 md:h-10 bg-slate-100 text-slate-400 rounded-lg md:rounded-xl flex items-center justify-center hover:bg-red-600 hover:text-white transition-all shadow-sm active:scale-90"
                                  title="Eliminar Registro"
                                >
                                   <i className="fa-solid fa-trash-can text-[10px] md:text-xs"></i>
                                </button>
                             </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {view === 'report_injury' && reportingPlayer && (
        <div className="max-w-5xl mx-auto bg-white rounded-[32px] md:rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 pb-8 md:pb-12">
          <div className={`${editingInjuryId ? 'bg-[#0b1220]' : 'bg-[#CF1B2B]'} p-8 md:p-12 text-white relative text-center transition-colors duration-500`}>
            <button onClick={() => setView('dashboard')} className="absolute top-6 md:top-10 left-6 md:left-10 text-white/50 hover:text-white transition-colors">
               <i className="fa-solid fa-arrow-left"></i>
            </button>
            <div className="w-16 h-16 md:w-20 md:h-20 bg-white/20 rounded-2xl md:rounded-[32px] flex items-center justify-center text-white font-black text-2xl md:text-3xl mb-4 mx-auto border border-white/20 shadow-xl">
              {reportingPlayer.name?.charAt(0)}
            </div>
            <h3 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter leading-none">
              {editingInjuryId ? 'Editar Ficha Clínica' : 'Nueva Ficha Clínica'}
            </h3>
            <p className="text-white/70 font-bold uppercase text-[8px] md:text-[10px] tracking-[0.3em] mt-3">{reportingPlayer.name} • {reportingPlayer.club}</p>
          </div>

          <form onSubmit={handleSaveInjury} className="p-6 md:p-12 space-y-8 md:space-y-12">
            <div className="space-y-6">
              <h4 className="text-[9px] md:text-[10px] font-black text-red-600 uppercase tracking-widest border-b border-red-100 pb-2">1. Identificación Cronológica y Anatómica</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                <div className="space-y-2">
                  <label className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Fecha de Inicio</label>
                  <input required type="date" className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-[11px] md:text-xs font-bold text-slate-700 shadow-inner" value={injuryForm.fecha_inicio} onChange={e => setInjuryForm({...injuryForm, fecha_inicio: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Momento</label>
                  <select className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-[11px] md:text-xs font-bold text-slate-700 shadow-inner" value={injuryForm.momento_lesion} onChange={e => setInjuryForm({...injuryForm, momento_lesion: e.target.value})}>
                    <option value="Entrenamiento">Entrenamiento</option>
                    <option value="Partido">Partido</option>
                    <option value="Gimnasio">Gimnasio</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Lado</label>
                  <select className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-[11px] md:text-xs font-bold text-slate-700 shadow-inner" value={injuryForm.lado} onChange={e => setInjuryForm({...injuryForm, lado: e.target.value})}>
                    <option value="Derecho">Derecho</option>
                    <option value="Izquierdo">Izquierdo</option>
                    <option value="Bilateral">Bilateral</option>
                    <option value="No Aplica">N/A</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Localización</label>
                  <input required placeholder="Ej: Isquiotibial" className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-[11px] md:text-xs font-bold text-slate-700 shadow-inner" value={injuryForm.localizacion} onChange={e => setInjuryForm({...injuryForm, localizacion: e.target.value})} />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h4 className="text-[9px] md:text-[10px] font-black text-red-600 uppercase tracking-widest border-b border-red-100 pb-2">2. Clasificación y Diagnóstico</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Tipo de Lesión</label>
                    <select className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-[11px] md:text-xs font-bold text-slate-700 shadow-inner" value={injuryForm.tipo_lesion} onChange={e => setInjuryForm({...injuryForm, tipo_lesion: e.target.value})}>
                      <option value="Muscular">Muscular</option>
                      <option value="Ligamentaria">Ligamentaria</option>
                      <option value="Tendinosa">Tendinosa</option>
                      <option value="Contusión">Contusión</option>
                      <option value="Fractura">Fractura</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Mecanismo</label>
                    <select className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-[11px] md:text-xs font-bold text-slate-700 shadow-inner" value={injuryForm.mecanismo} onChange={e => setInjuryForm({...injuryForm, mecanismo: e.target.value})}>
                      <option value="No Contacto">No Contacto</option>
                      <option value="Contacto">Contacto</option>
                      <option value="Sobrecarga">Sobrecarga</option>
                      <option value="Desconocido">Desconocido</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Diagnóstico Clínico</label>
                  <textarea rows={1} className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl p-4 text-[11px] md:text-xs font-bold text-slate-700 shadow-inner resize-none" value={injuryForm.diagnostico_clinico} onChange={e => setInjuryForm({...injuryForm, diagnostico_clinico: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Diagnóstico Funcional</label>
                <textarea rows={2} className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl p-4 text-[11px] md:text-xs font-bold text-slate-700 shadow-inner resize-none" value={injuryForm.diagnostico_funcional} onChange={e => setInjuryForm({...injuryForm, diagnostico_funcional: e.target.value})} />
              </div>
            </div>

            <div className="space-y-6">
              <h4 className="text-[10px] font-black text-red-600 uppercase tracking-widest border-b border-red-100 pb-2">3. Gestión de Disponibilidad y Seguimiento</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Estado</label>
                  <select className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-xs font-bold text-slate-700 shadow-inner" value={injuryForm.estado} onChange={e => setInjuryForm({...injuryForm, estado: e.target.value})}>
                    <option value="Activo">Lesionado</option>
                    <option value="Retorno Parcial">Retorno Parcial</option>
                    <option value="Alta Médica">Alta Médica</option>
                    <option value="Cerrado">Cerrado</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Disponibilidad</label>
                  <select className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-[11px] md:text-xs font-bold text-slate-700 shadow-inner" value={injuryForm.disponibilidad} onChange={e => setInjuryForm({...injuryForm, disponibilidad: e.target.value})}>
                    <option value="No Disponible">No Disponible</option>
                    <option value="Limitado">Limitado</option>
                    <option value="Disponible">Disponible</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2">
                  <label className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Último Control</label>
                  <input type="date" className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-[11px] md:text-xs font-bold text-slate-700 shadow-inner" value={injuryForm.ultimo_control} onChange={e => setInjuryForm({...injuryForm, ultimo_control: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Fecha de Alta</label>
                  <input type="date" className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-[11px] md:text-xs font-bold text-slate-700 shadow-inner" value={injuryForm.fecha_alta} onChange={e => setInjuryForm({...injuryForm, fecha_alta: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Restricciones / Observaciones</label>
                <textarea rows={3} className="w-full bg-slate-50 border-none rounded-[24px] md:rounded-[32px] p-4 md:p-6 text-[11px] md:text-xs font-bold text-slate-700 shadow-inner resize-none" value={injuryForm.observaciones} onChange={e => setInjuryForm({...injuryForm, observaciones: e.target.value})} placeholder="Detalles clínicos y limitaciones de carga..." />
              </div>
            </div>

            <div className="space-y-6">
              <h4 className="text-[9px] md:text-[10px] font-black text-red-600 uppercase tracking-widest border-b border-red-100 pb-2">4. Exámenes</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                <div className="space-y-2">
                  <label className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Fecha</label>
                  <input type="date" className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-[11px] md:text-xs font-bold text-slate-700 shadow-inner" value={newExam.date} onChange={e => setNewExam({...newExam, date: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Tipo de Examen</label>
                  <select className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-[11px] md:text-xs font-bold text-slate-700 shadow-inner" value={newExam.type} onChange={e => setNewExam({...newExam, type: e.target.value})}>
                    <option value="Resonancia">Resonancia</option>
                    <option value="Ecografía">Ecografía</option>
                    <option value="Radiografía">Radiografía</option>
                    <option value="TAC">TAC</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div className="space-y-2 sm:col-span-2 md:col-span-1">
                   <label className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Descripción</label>
                   <div className="flex gap-2">
                     <input type="text" placeholder="Breve descripción..." className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-[11px] md:text-xs font-bold text-slate-700 shadow-inner" value={newExam.description} onChange={e => setNewExam({...newExam, description: e.target.value})} />
                     <button type="button" onClick={handleAddExam} className="bg-[#0b1220] text-white rounded-xl md:rounded-2xl px-4 flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors">
                       <i className="fa-solid fa-plus"></i>
                     </button>
                   </div>
                </div>
              </div>

              {exams.length > 0 && (
                <div className="bg-slate-50 rounded-[24px] md:rounded-[32px] p-4 md:p-6 space-y-3">
                  {exams.map((exam) => (
                    <div key={exam.id} className="bg-white p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-3 md:gap-4">
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-50 text-blue-600 rounded-lg md:rounded-xl flex items-center justify-center">
                          <i className="fa-solid fa-file-medical text-sm md:text-base"></i>
                        </div>
                        <div>
                          <p className="text-[9px] md:text-[10px] font-black text-slate-900 uppercase tracking-wide">{exam.type} • {new Date(exam.date).toLocaleDateString()}</p>
                          <p className="text-[8px] md:text-[9px] text-slate-500 font-medium">{exam.description}</p>
                        </div>
                      </div>
                      <button type="button" onClick={() => handleRemoveExam(exam.id)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors">
                        <i className="fa-solid fa-trash-can text-xs"></i>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 pt-6">
              <button type="button" onClick={() => setView('dashboard')} className="order-2 sm:order-1 flex-1 py-4 md:py-5 rounded-xl md:rounded-[24px] bg-slate-100 text-slate-500 text-[11px] md:text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
              <button type="submit" disabled={loading} className={`order-1 sm:order-2 flex-1 py-4 md:py-5 rounded-xl md:rounded-[24px] ${editingInjuryId ? 'bg-[#0b1220]' : 'bg-[#CF1B2B]'} text-white text-[11px] md:text-xs font-black uppercase tracking-widest shadow-2xl hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-3`}>
                {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-cloud-arrow-up"></i>}
                {editingInjuryId ? 'Actualizar Registro' : 'Finalizar y Sincronizar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {view === 'calendar' && (
        <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300">
           <div className="bg-[#0b1220] rounded-[32px] md:rounded-[48px] p-8 md:p-12 shadow-2xl relative overflow-hidden text-white border border-white/5">
            <div className="absolute top-0 right-0 w-48 md:w-64 h-48 md:h-64 bg-blue-600/10 rounded-full -mr-24 md:-mr-32 -mt-24 md:-mt-32 blur-3xl"></div>
            <h3 className="text-2xl md:text-3xl font-black italic tracking-tighter uppercase mb-2 relative z-10">Calendario de <span className="text-blue-500">Evolución</span></h3>
            <p className="text-slate-400 text-[10px] md:text-xs font-medium uppercase tracking-[0.2em] relative z-10">Línea de tiempo desde lesión hasta alta médica.</p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:gap-6">
            {dbInjuries.length === 0 ? (
              <div className="bg-white rounded-[32px] md:rounded-[40px] p-12 md:p-20 text-center border border-slate-100 opacity-50">
                <i className="fa-solid fa-calendar-xmark text-4xl md:text-5xl mb-6 text-slate-200"></i>
                <p className="text-slate-400 font-black uppercase text-[9px] md:text-[10px] tracking-widest">No hay lesiones activas</p>
              </div>
            ) : (
              dbInjuries.map(injury => {
                const athleteName = `${injury.players?.nombre} ${injury.players?.apellido1}`;
                return (
                  <div key={injury.id} className="bg-white rounded-[24px] md:rounded-[32px] p-6 md:p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
                      <div className="flex items-center gap-3 md:gap-4">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-[#0b1220] text-white rounded-xl md:rounded-2xl flex items-center justify-center font-black italic text-xs md:text-sm shadow-lg">
                          {athleteName?.charAt(0)}
                        </div>
                        <div>
                          <h4 className="text-xs md:text-sm font-black text-slate-900 uppercase italic tracking-tight">{athleteName}</h4>
                          <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">{injury.diagnostico_clinico || 'Sin diagnóstico'}</p>
                        </div>
                      </div>
                      <span className={`self-start sm:self-center px-3 md:px-4 py-1.5 md:py-2 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest ${getFaseColor(injury.estado)}`}>
                        {injury.estado}
                      </span>
                    </div>

                    <div className="relative pt-8 md:pt-6 pb-2 px-2 md:px-4">
                      {/* Timeline Line */}
                      <div className="absolute top-[40px] md:top-1/2 left-0 right-0 h-1 bg-slate-100 -translate-y-1/2 rounded-full"></div>
                      
                      <div className="relative flex justify-between items-start md:items-center">
                        {/* Inicio */}
                        <div className="flex flex-col items-center gap-2 md:gap-3 relative z-10 w-1/3">
                          <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-red-500 border-2 md:border-4 border-white shadow-sm"></div>
                          <div className="text-center">
                            <p className="text-[7px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Inicio</p>
                            <p className="text-[10px] md:text-xs font-black text-slate-900">{formatDate(injury.fecha_inicio)}</p>
                          </div>
                        </div>

                        {/* Reintegro */}
                        <div className="flex flex-col items-center gap-2 md:gap-3 relative z-10 w-1/3">
                          <div className={`w-3 h-3 md:w-4 md:h-4 rounded-full border-2 md:border-4 border-white shadow-sm ${injury.fecha_estimada_retorno ? 'bg-amber-500' : 'bg-slate-200'}`}></div>
                          <div className="text-center">
                            <p className="text-[7px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Reintegro</p>
                            <p className={`text-[10px] md:text-xs font-black ${injury.fecha_estimada_retorno ? 'text-slate-900' : 'text-slate-300 italic'}`}>
                              {formatDate(injury.fecha_estimada_retorno)}
                            </p>
                          </div>
                        </div>

                        {/* Alta */}
                        <div className="flex flex-col items-center gap-2 md:gap-3 relative z-10 w-1/3">
                          <div className={`w-3 h-3 md:w-4 md:h-4 rounded-full border-2 md:border-4 border-white shadow-sm ${injury.fecha_alta ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
                          <div className="text-center">
                            <p className="text-[7px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Alta Médica</p>
                            <p className={`text-[10px] md:text-xs font-black ${injury.fecha_alta ? 'text-slate-900' : 'text-slate-300 italic'}`}>
                              {formatDate(injury.fecha_alta)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {view === 'reintegro_gps' && (
        <div className="space-y-6 md:space-y-8 animate-in zoom-in-95 duration-300">
           <div className="bg-[#0b1220] rounded-[32px] md:rounded-[48px] p-8 md:p-12 shadow-2xl relative overflow-hidden text-white">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
              <h3 className="text-2xl md:text-4xl font-black italic tracking-tighter uppercase mb-2 relative z-10">Monitoreo GPS <span className="text-blue-500">Reintegro</span></h3>
              <p className="text-slate-400 font-black uppercase tracking-widest text-[10px] md:text-xs mb-4 relative z-10">Módulo de seguimiento de carga en fase de retorno deportivo</p>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
              <div className="lg:col-span-1 space-y-6 bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">Jugadores en Fase de Reintegro</h4>
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {dbInjuries.filter(i => i.estado === 'Reintegro' || i.estado === 'Readaptación').length === 0 ? (
                    <div className="py-20 text-center">
                      <i className="fa-solid fa-user-clock text-4xl text-slate-100 mb-4"></i>
                      <p className="text-slate-400 text-[10px] font-black uppercase italic">Sin jugadores en esta fase</p>
                    </div>
                  ) : (
                    dbInjuries.filter(i => i.estado === 'Reintegro' || i.estado === 'Readaptación').map(injury => (
                      <div 
                        key={injury.id} 
                        onClick={() => setSelectedGpsPlayer(injury)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer group ${selectedGpsPlayer?.id === injury.id ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-900/20' : 'bg-slate-50 border-slate-100 hover:bg-white hover:shadow-md'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black italic text-xs ${selectedGpsPlayer?.id === injury.id ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'}`}>
                            {injury.players?.nombre?.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-[11px] font-black uppercase italic leading-none truncate ${selectedGpsPlayer?.id === injury.id ? 'text-white' : 'text-slate-900'}`}>{injury.players?.nombre} {injury.players?.apellido1}</p>
                            <p className={`text-[8px] font-bold uppercase tracking-widest mt-1 truncate ${selectedGpsPlayer?.id === injury.id ? 'text-blue-100' : 'text-slate-400'}`}>{injury.localizacion}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <button onClick={() => setView('dashboard')} className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all">
                  Volver al Dashboard
                </button>
              </div>

              <div className="lg:col-span-2 bg-white rounded-[32px] p-8 md:p-12 border border-slate-100 shadow-sm flex flex-col items-center justify-center min-h-[600px]">
                {!selectedGpsPlayer ? (
                  <div className="text-center">
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100">
                      <i className="fa-solid fa-satellite-dish text-4xl text-slate-200"></i>
                    </div>
                    <p className="text-slate-400 font-black uppercase tracking-widest italic text-xs">Selecciona un jugador para ver su progresión de carga</p>
                  </div>
                ) : (
                  <div className="w-full space-y-8 animate-in fade-in duration-500">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-8">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-blue-600 text-white rounded-[24px] flex items-center justify-center font-black italic text-2xl shadow-xl shadow-blue-900/20">
                          {selectedGpsPlayer.players?.nombre?.charAt(0)}
                        </div>
                        <div>
                          <h4 className="text-2xl md:text-3xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">{selectedGpsPlayer.players?.nombre} {selectedGpsPlayer.players?.apellido1}</h4>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="bg-blue-100 text-blue-600 font-black uppercase text-[8px] tracking-widest px-2 py-1 rounded-md">Fase: {selectedGpsPlayer.estado}</span>
                            <span className="text-slate-400 font-black uppercase text-[8px] tracking-widest">{selectedGpsPlayer.localizacion}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right hidden md:block">
                        <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest">Inicio Lesión</p>
                        <p className="text-slate-900 font-black">{formatDate(selectedGpsPlayer.fecha_inicio)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                        <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-2">Carga Actual vs Baseline</p>
                        <div className="flex items-end gap-2">
                          <p className="text-3xl font-black text-slate-900 italic tracking-tighter leading-none">65%</p>
                          <p className="text-[10px] font-bold text-slate-400 mb-1">/ 100%</p>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full mt-4 overflow-hidden">
                          <div className="bg-blue-600 h-full w-[65%]"></div>
                        </div>
                      </div>
                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                        <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-2">HSR (m) Última Sesión</p>
                        <p className="text-3xl font-black text-slate-900 italic tracking-tighter leading-none">420m</p>
                        <p className="text-[8px] font-bold text-emerald-500 uppercase mt-2 flex items-center gap-1">
                          <i className="fa-solid fa-arrow-trend-up"></i> +12% vs sesión anterior
                        </p>
                      </div>
                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                        <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-2">Días en Reintegro</p>
                        <p className="text-3xl font-black text-slate-900 italic tracking-tighter leading-none">12</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase mt-2">Est. Alta: 8 días</p>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-12 rounded-[40px] border border-slate-100 h-80 flex flex-col items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
                      <i className="fa-solid fa-chart-line text-5xl text-slate-200 mb-4 relative z-10"></i>
                      <p className="text-slate-400 font-black uppercase tracking-widest italic text-[10px] relative z-10">Gráfico de Progresión de Carga (Próximamente)</p>
                      <p className="text-slate-300 text-[8px] font-medium mt-2 relative z-10 max-w-xs text-center">Integración con API de Catapult / Wimu en desarrollo para sincronización automática.</p>
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sincronización en tiempo real activa</p>
                      </div>
                      <button className="w-full md:w-auto px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/20 active:scale-95">
                        Generar Reporte de Alta Deportiva
                      </button>
                    </div>
                  </div>
                )}
              </div>
           </div>
        </div>
      )}

      {view === 'daily_report' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <section className="bg-white p-6 md:p-10 rounded-[32px] md:rounded-[48px] border border-slate-100 shadow-sm space-y-6">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3 italic">
              <span className="w-2 h-6 rounded-full bg-blue-600"></span>
              Reporte Médico Diario (Doctor)
            </h3>

            {!reportingPlayer ? (
              <div className="relative" ref={searchRef}>
                <div className="relative group">
                  <i className="fa-solid fa-magnifying-glass absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 text-lg group-focus-within:text-red-500"></i>
                  <input 
                    type="text" 
                    placeholder="Seleccione un jugador para el registro..."
                    className="w-full bg-slate-50 border-none rounded-3xl px-16 py-6 text-sm font-black text-slate-900 outline-none focus:ring-4 focus:ring-red-500/10 shadow-inner transition-all"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    autoComplete="off"
                  />
                  {hasSearched && foundPlayers.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden z-50">
                      <div className="p-3 space-y-1">
                        {foundPlayers.map(p => (
                          <button 
                            key={p.id}
                            onClick={() => setReportingPlayer(p)}
                            className="w-full flex items-center gap-4 p-4 hover:bg-red-50 rounded-2xl transition-all text-left group"
                          >
                            <div className="w-10 h-10 bg-[#0b1220] text-white rounded-xl flex items-center justify-center font-black italic text-xs group-hover:bg-red-600 transition-colors">
                              {p.name?.charAt(0)}
                            </div>
                            <div>
                              <p className="text-xs font-black text-slate-900 uppercase italic leading-none">{p.name}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{p.club} • {p.position}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#0b1220] text-white rounded-2xl flex items-center justify-center font-black italic text-lg shadow-lg">
                      {reportingPlayer.name?.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-slate-900 uppercase italic tracking-tighter leading-none">{reportingPlayer.name}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{reportingPlayer.club} • {reportingPlayer.position}</p>
                    </div>
                  </div>
                  <button onClick={() => setReportingPlayer(null)} className="text-slate-400 hover:text-red-500 font-black uppercase text-[10px] tracking-widest">Cambiar Jugador</button>
                </div>

                <form onSubmit={handleSaveDailyReport} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Gravedad del Caso</label>
                    <div className="flex gap-3">
                      {(['low', 'medium', 'high'] as const).map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setDailyReportForm({...dailyReportForm, severity: s})}
                          className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                            dailyReportForm.severity === s 
                              ? s === 'low' ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : s === 'medium' ? 'bg-amber-50 border-amber-500 text-amber-600' : 'bg-red-50 border-red-500 text-red-600'
                              : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                          }`}
                        >
                          {s === 'low' ? 'Leve (Verde)' : s === 'medium' ? 'Medio (Amarillo)' : 'Grave (Rojo)'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2 relative">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Diagnóstico Médico (Autocomplete)</label>
                    <div className="relative">
                      <input 
                        type="text"
                        className="w-full bg-white border-none rounded-3xl px-6 py-4 text-sm font-bold text-slate-700 shadow-inner focus:ring-4 focus:ring-blue-500/10 transition-all"
                        placeholder="Escriba el diagnóstico..."
                        value={dailyReportForm.diagnostico_medico}
                        onChange={e => setDailyReportForm({...dailyReportForm, diagnostico_medico: e.target.value})}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      />
                      {showSuggestions && filteredSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-[100] max-h-48 overflow-y-auto animate-in slide-in-from-top-2 duration-200">
                          {filteredSuggestions.map((s, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setDailyReportForm({...dailyReportForm, diagnostico_medico: s});
                                setShowSuggestions(false);
                              }}
                              className="w-full text-left px-6 py-3 text-[11px] font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-colors border-b border-slate-50 last:border-none"
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Tratamientos Aplicados</label>
                    <div className="flex flex-wrap gap-2 p-4 bg-white rounded-3xl shadow-inner border border-slate-100">
                      {availableTreatmentOptions.map(option => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => handleToggleTreatment(option)}
                          className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${
                            selectedTreatments.includes(option)
                              ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                              : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-200'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                      <div className="flex gap-2 w-full mt-2">
                        <input 
                          type="text"
                          placeholder="Otro tratamiento..."
                          className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-2 text-[10px] font-bold text-slate-700 shadow-inner"
                          value={newTreatmentOption}
                          onChange={e => setNewTreatmentOption(e.target.value)}
                        />
                        <button 
                          type="button"
                          onClick={handleAddCustomTreatment}
                          className="px-4 py-2 bg-[#0b1220] text-white rounded-xl text-[9px] font-black uppercase tracking-widest"
                        >
                          Agregar
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Observación Médica</label>
                    <textarea 
                      required
                      rows={4}
                      className="w-full bg-white border-none rounded-3xl p-6 text-sm font-bold text-slate-700 shadow-inner resize-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                      placeholder="Escriba el diagnóstico o novedades del día..."
                      value={dailyReportForm.observation}
                      onChange={e => setDailyReportForm({...dailyReportForm, observation: e.target.value})}
                    />
                  </div>
                  <button type="submit" disabled={loading} className="w-full bg-[#0b1220] text-white py-6 rounded-3xl text-xs font-black uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all active:scale-95 flex items-center justify-center gap-3">
                    {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-cloud-arrow-up"></i>}
                    Guardar Reporte Diario
                  </button>
                </form>
              </div>
            )}
          </section>

          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3 italic">
                <span className="w-2 h-6 rounded-full bg-blue-600"></span>
                Historial Reciente
              </h3>
            </div>
            
            <div className="bg-white rounded-[32px] md:rounded-[40px] border border-slate-100 shadow-xl overflow-hidden overflow-x-auto">
              <table className="w-full text-[10px] text-center border-collapse min-w-[600px]">
                <thead className="bg-[#0b1220] text-white font-black uppercase tracking-widest">
                  <tr>
                    <th className="px-6 py-4 text-left">Atleta</th>
                    <th className="px-4 py-4">Fecha</th>
                    <th className="px-4 py-4">Gravedad</th>
                    <th className="px-6 py-4 text-left">Diagnóstico</th>
                    <th className="px-6 py-4 text-left">Observación</th>
                    <th className="px-6 py-4">Tratamiento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                  {dailyReports.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-slate-300 font-black uppercase tracking-widest italic opacity-50">No hay reportes registrados</td>
                    </tr>
                  ) : (
                    dailyReports.map(report => (
                      <tr key={report.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-left">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center font-black italic text-[10px] text-slate-900">
                              {report.players?.nombre?.charAt(0)}
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-slate-900 uppercase italic leading-none">{report.players?.nombre} {report.players?.apellido1}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-slate-400">{formatDate(report.report_date)}</td>
                        <td className="px-4 py-4">
                          <div className="flex justify-center">
                            <div className={`w-3 h-3 rounded-full shadow-sm ${report.severity === 'low' ? 'bg-emerald-500' : report.severity === 'medium' ? 'bg-amber-500' : 'bg-red-500'}`}></div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-left font-black text-slate-900 uppercase italic truncate max-w-[150px]">{report.diagnostico_medico || '-'}</td>
                        <td className="px-6 py-4 text-left italic text-slate-500 max-w-md truncate">"{report.observation}"</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            {report.treatments_applied && report.treatments_applied.length > 0 ? (
                              <div className="flex flex-wrap justify-center gap-1">
                                {report.treatments_applied.map((t, i) => (
                                  <div key={i} className="inline-block h-5 px-2 rounded-md bg-blue-50 text-blue-600 border border-blue-100 text-[7px] font-black uppercase flex items-center justify-center">
                                    {t}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-300 italic">Sin tratamiento</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 mb-6 mx-auto">
              <i className="fa-solid fa-triangle-exclamation text-2xl"></i>
            </div>
            <h3 className="text-xl font-black text-slate-900 text-center mb-2 uppercase italic tracking-tight">Confirmar Eliminación</h3>
            <p className="text-slate-500 text-center mb-8 text-sm">
              ¿Estás seguro de que deseas eliminar el registro médico de <span className="font-bold text-slate-900">{showConfirmDelete.name}</span>? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowConfirmDelete(null)}
                className="flex-1 px-6 py-3 rounded-xl bg-slate-100 text-slate-600 font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={() => handleDeleteInjury(showConfirmDelete.id)}
                className="flex-1 px-6 py-3 rounded-xl bg-red-600 text-white font-black uppercase text-[10px] tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-900/20"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ERROR */}
      {errorMessage && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[700] animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-red-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-red-500">
            <i className="fa-solid fa-circle-exclamation text-lg"></i>
            <p className="text-xs font-black uppercase tracking-widest">{errorMessage}</p>
            <button onClick={() => setErrorMessage(null)} className="hover:scale-110 transition-transform">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE ÉXITO */}
      {successMessage && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-white/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-emerald-600 text-white px-8 py-6 rounded-[32px] shadow-2xl flex items-center gap-6 border border-emerald-500 animate-in zoom-in-95 duration-300">
            <i className="fa-solid fa-circle-check text-2xl"></i>
            <p className="text-sm font-black uppercase tracking-widest italic">{successMessage}</p>
            <button onClick={() => setSuccessMessage(null)} className="hover:scale-110 transition-transform ml-4">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicaArea;
