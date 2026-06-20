
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AthletePerformanceRecord, Category, User, MicrocicloDB, CATEGORY_ID_MAP, UserRole, REVERSE_CATEGORY_ID_MAP } from '../types';
import { supabase } from '../lib/supabase';
import { triggerPushNotification } from '../lib/notifications';
import { logActivity } from '../lib/activityLogger';
import { normalizeClub } from '../lib/utils';
import ClubBadge from './ClubBadge';

interface MedicaAreaProps {
  performanceRecords: AthletePerformanceRecord[];
  players?: any[];
  onMenuChange?: (id: any) => void;
  userRole?: string;
  userClub?: string;
  userClubId?: number | null;
  clubs?: any[];
}

type MedicaView = 'dashboard' | 'report_injury' | 'reintegro_gps' | 'calendar' | 'medical_attention';

interface DailyReport {
  id: string;
  player_id: number;
  anio: number;
  report_date: string;
  observation: string;
  diagnostico_medico?: string;
  treatments_applied?: string[];
  severity: 'low' | 'medium' | 'high' | 'sick';
  displayCategory?: string;
  staffName?: string;
  players?: {
    player_id?: number;
    nombre: string;
    apellido1: string;
    apellido2?: string;
    anio?: number;
    posicion?: string;
    id_club?: number;
    club?: string;
    clubes?: { nombre: string } | { nombre: string }[];
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
    apellido2?: string;
    posicion: string;
    id_club?: number;
    club?: string;
    clubes?: { nombre: string } | { nombre: string }[];
  };
}

interface MedicalExam {
  id: string;
  date: string;
  type: string;
  description: string;
}

const formatDateGlobal = (dateStr?: string) => {
  if (!dateStr) return 'Pendiente';
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
};

const MedicaArea: React.FC<MedicaAreaProps> = ({ performanceRecords, players, onMenuChange, userRole, userClub, userClubId, clubs = [] }) => {
  const formatDate = formatDateGlobal;
  const [view, setView] = useState<MedicaView>('medical_attention');
  const [reportingPlayer, setReportingPlayer] = useState<User | null>(null);
  const [editingInjuryId, setEditingInjuryId] = useState<string | null>(null);
  const [editingDailyReportId, setEditingDailyReportId] = useState<string | null>(null);
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
    severity: 'low' as 'low' | 'medium' | 'high' | 'sick'
  });

  const [availableTreatmentOptions, setAvailableTreatmentOptions] = useState<string[]>([
    'Vendaje', 'Masoterapia', 'Electroterapia', 'Tecarterapia', 'Hielo local', 
    'Crioconpresión', 'Compresa húmedo caliente', 'Terapia manual', 
    'Terapia invasiva', 'Ventosas', 'Curaciones', 'Ejercicios Terapéuticos', 'Otros'
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
  const [showConfirmDeleteReport, setShowConfirmDeleteReport] = useState<{ id: string, name: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [selectedGpsPlayer, setSelectedGpsPlayer] = useState<DBInjury | null>(null);

  const [currentStaffEmail, setCurrentStaffEmail] = useState<string>('');
  const [loggedStaffName, setLoggedStaffName] = useState<string>('');
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [dateQuery, setDateQuery] = useState('');

  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [selectedClubs, setSelectedClubs] = useState<string[]>([]);

  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [isPositionDropdownOpen, setIsPositionDropdownOpen] = useState(false);
  const [isClubDropdownOpen, setIsClubDropdownOpen] = useState(false);

  const formatStaffEmail = (email: string): string => {
    if (!email) return 'Staff';
    const namePart = email.split('@')[0];
    if (namePart.includes('.')) {
      const parts = namePart.split('.');
      const capParts = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1));
      if (email.toLowerCase().startsWith('mardones.camilo')) {
        return 'Camilo Mardones';
      }
      return capParts.join(' ');
    }
    return namePart.charAt(0).toUpperCase() + namePart.slice(1);
  };

  const filteredInjuries = useMemo(() => {
    if (!selectedCategoryId) return dbInjuries;
    return dbInjuries.filter(i => i.category_id === selectedCategoryId);
  }, [dbInjuries, selectedCategoryId]);

  const handleToggleDate = (date: string) => {
    setSelectedDates(prev =>
      prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]
    );
  };

  const filteredDailyReports = useMemo(() => {
    let filtered = dailyReports;
    if (selectedDates.length > 0) {
      filtered = filtered.filter(report => selectedDates.includes(report.report_date));
    }
    if (selectedYears.length > 0) {
      filtered = filtered.filter(report => report.players?.anio && selectedYears.includes(String(report.players.anio)));
    }
    if (selectedPositions.length > 0) {
      filtered = filtered.filter(report => report.players?.posicion && selectedPositions.includes(String(report.players.posicion)));
    }
    if (selectedClubs.length > 0) {
      filtered = filtered.filter(report => {
        const id = report.players?.id_club;
        const clubObj = Array.isArray(report.players?.clubes) ? report.players?.clubes[0] : report.players?.clubes;
        const dbClub = clubs?.find(c => Number(c.id_club) === Number(id) || Number(c.id) === Number(id));
        const name = dbClub?.nombre || clubObj?.nombre || report.players?.club || '';
        return (id && selectedClubs.includes(String(id))) || (name && selectedClubs.includes(name));
      });
    }
    return filtered;
  }, [dailyReports, selectedDates, selectedYears, selectedPositions, selectedClubs, clubs]);

  const availableDates = useMemo(() => {
    const dates = dailyReports.map(r => r.report_date).filter(Boolean);
    return Array.from(new Set(dates)).sort((a, b) => b.localeCompare(a));
  }, [dailyReports]);

  const availableYears = useMemo(() => {
    const years = dailyReports.map(r => r.players?.anio).filter(Boolean).map(y => String(y));
    return Array.from(new Set(years)).sort((a, b) => b.localeCompare(a));
  }, [dailyReports]);

  const availablePositions = useMemo(() => {
    const positions = dailyReports.map(r => r.players?.posicion).filter(Boolean).map(p => String(p));
    return Array.from(new Set(positions)).sort();
  }, [dailyReports]);

  const availableClubs = useMemo(() => {
    const clubsMap = new Map<string, string>();
    dailyReports.forEach(r => {
      const id = r.players?.id_club;
      const clubObj = Array.isArray(r.players?.clubes) ? r.players?.clubes[0] : r.players?.clubes;
      const dbClub = clubs?.find(c => Number(c.id_club) === Number(id) || Number(c.id) === Number(id));
      const name = dbClub?.nombre || clubObj?.nombre || r.players?.club || (id ? `Club #${id}` : 'Desconocido');
      if (id) {
        clubsMap.set(String(id), name);
      } else if (name && name !== 'Desconocido') {
        clubsMap.set(name, name);
      }
    });
    return Array.from(clubsMap.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [dailyReports, clubs]);

  const filteredDatesBySearch = useMemo(() => {
    if (!dateQuery) return availableDates;
    return availableDates.filter(date => {
      const formatted = formatDateGlobal(date).toLowerCase();
      return formatted.includes(dateQuery) || date.toLowerCase().includes(dateQuery);
    });
  }, [availableDates, dateQuery]);

  const previousReports = useMemo(() => {
    if (!reportingPlayer || !reportingPlayer.player_id) return [];
    return dailyReports
      .filter(r => r.player_id === reportingPlayer.player_id)
      .sort((a, b) => b.report_date.localeCompare(a.report_date));
  }, [dailyReports, reportingPlayer]);

  const handleUseReportAsTemplate = (report: DailyReport) => {
    const treatments = report.treatments_applied || [];
    setDailyReportForm({
      observation: report.observation || '',
      diagnostico_medico: report.diagnostico_medico || '',
      severity: report.severity || 'low'
    });
    setSelectedTreatments(treatments);
  };

  useEffect(() => {
    fetchInjuredPlayers();
    fetchDailyReports();

    const fetchSessionUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const email = session.user.email || '';
          setCurrentStaffEmail(email);
          
          // Fallback 1: Initial email formatting
          let resolvedDesc = formatStaffEmail(email);
          
          // Fallback 2: user metadata from Google / OAuth login
          const metaName = session.user.user_metadata?.full_name || session.user.user_metadata?.name;
          if (metaName) {
            resolvedDesc = metaName;
          }

          // Fallback 3: Query profiles for club name or specialized roles
          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('role, club_name')
              .eq('id', session.user.id)
              .maybeSingle();

            if (profileData) {
              if (profileData.role === 'club' && profileData.club_name) {
                resolvedDesc = `Club: ${profileData.club_name}`;
              }
            }
          } catch (pe) {
            console.warn("Could not query profiles for role mapping:", pe);
          }

          // Fallback 4: Query staff table display_name
          try {
            const { data, error } = await supabase
              .from('staff')
              .select('display_name, first_name, last_name')
              .eq('profile_id', session.user.id)
              .maybeSingle();
              
            if (!error && data) {
              const name = data.display_name || `${data.first_name || ''} ${data.last_name || ''}`.trim();
              if (name) {
                resolvedDesc = name;
              }
            }
          } catch (se) {
            console.warn("Could not query staff table:", se);
          }

          setLoggedStaffName(resolvedDesc);
        }
      } catch (e) {
        console.warn("Error fetching auth email and staff display_name in MedicaArea:", e);
      }
    };
    fetchSessionUser();
    
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
      
      const sourceList = (players && players.length > 0) 
        ? players 
        : performanceRecords.map(r => r.player);

      const filtered = sourceList
        .filter(p => {
          if (!p) return false;
          if (userRole === 'club') {
            if (userClubId) {
              if (p.id_club !== userClubId) return false;
            } else if (userClub) {
              const uClubNorm = normalizeClub(userClub);
              const pClub = p.club || p.club_name || '';
              if (normalizeClub(pClub) !== uClubNorm) return false;
            }
          }
          const fullName = `${p.nombre || ''} ${p.apellido1 || ''} ${p.apellido2 || ''} ${p.name || ''}`.toLowerCase();
          return parts.every(part => fullName.includes(part));
        })
        .map(p => {
          const pIdClub = p.id_club;
          const dbClub = clubs?.find(c => Number(c.id_club) === Number(pIdClub) || Number(c.id) === Number(pIdClub));
          const clubName = dbClub?.nombre || p.club || p.club_name || (p.clubes && (Array.isArray(p.clubes) ? p.clubes[0]?.nombre : p.clubes?.nombre)) || '';

          return {
            id: `p-${p.player_id}`,
            player_id: p.player_id,
            name: `${p.nombre || ''} ${p.apellido1 || ''} ${p.apellido2 || ''}`.trim() || p.name || 'Jugador',
            role: 'player',
            club: clubName,
            id_club: pIdClub,
            position: p.posicion || p.position || '',
            anio: p.anio || 0
          };
        })
        .slice(0, 8);

      setFoundPlayers(filtered as any);
      setHasSearched(true);
    } else {
      setFoundPlayers([]);
      setHasSearched(false);
    }
  }, [searchTerm, performanceRecords, players, userRole, userClub, userClubId]);

  const fetchInjuredPlayers = async () => {
    const possibleSchemas = [
      '*, players!lesionados_player_id_fkey(nombre, apellido1, apellido2, posicion, id_club, clubes!fk_players_clubes(nombre))',
      '*, players(nombre, apellido1, apellido2, posicion, id_club, clubes!fk_players_clubes(nombre))',
      '*, players!lesionados_id_del_jugador_fkey(nombre, apellido1, apellido2, posicion, id_club, clubes!fk_players_clubes(nombre))'
    ];

    let lastError = null;

    for (const schema of possibleSchemas) {
      try {
        let query = supabase
          .from('lesionados')
          .select(schema)
          .order('updated_at', { ascending: false });
        
        if (userRole === 'club') {
          if (userClubId) {
            query = query.eq('players.id_club', userClubId);
          } else if (userClub) {
            query = query.eq('players.clubes.nombre', userClub);
          }
        }

        const { data, error } = await query;
        if (error) {
          lastError = error;
          continue;
        }
        
        if (data) {
          setDbInjuries(data as any);
          return;
        }
      } catch (err) {
        lastError = err;
      }
    }

    // Fallback extremadamente robusto en memoria si fallan los joins
    if (lastError) {
      console.warn("⚠️ Error con joins, ejecutando fallback de carga de 'lesionados' sin join + mapeo en memoria...");
      try {
        const { data, error } = await supabase
          .from('lesionados')
          .select('*')
          .order('updated_at', { ascending: false });

        if (error) throw error;

        if (data) {
          const mappedData = data.map((injury: any) => {
            const matchingRecord = performanceRecords.find(r => r.player.player_id === injury.player_id);
            if (matchingRecord) {
              const p = matchingRecord.player;
              const clubName = p.club || (clubs && p.id_club ? clubs.find(c => c.id_club === p.id_club || c.id === p.id_club)?.nombre : undefined);
              return {
                ...injury,
                players: {
                  nombre: p.nombre || p.name || '',
                  apellido1: p.apellido1 || '',
                  apellido2: p.apellido2 || '',
                  posicion: p.position || '',
                  id_club: p.id_club,
                  club: clubName || '',
                  clubes: clubName ? { nombre: clubName } : undefined
                }
              };
            }
            return injury;
          });

          // Filtrar por rol de club si es necesario
          let filteredMapped = mappedData;
          if (userRole === 'club') {
            if (userClubId) {
              filteredMapped = mappedData.filter((i: any) => i.players?.id_club === userClubId);
            } else if (userClub) {
              filteredMapped = mappedData.filter((i: any) => i.players?.club === userClub);
            }
          }

          setDbInjuries(filteredMapped as any);
          return;
        }
      } catch (fallbackErr) {
        console.error("Fallo definitivo cargando lesionados con fallback sin join:", fallbackErr);
      }
    }
  };

  const fetchDailyReports = async () => {
    try {
      setLoading(true);
      // Fetch reports
      const possibleSchemas = [
        '*, players!fk_medical_daily_reports_players(player_id, nombre, apellido1, apellido2, anio, posicion, id_club, clubes!fk_players_clubes(nombre))',
        '*, players!medical_daily_reports_player_id_fkey(player_id, nombre, apellido1, apellido2, anio, posicion, id_club, clubes!fk_players_clubes(nombre))',
        '*, players(player_id, nombre, apellido1, apellido2, anio, posicion, id_club, clubes!fk_players_clubes(nombre))'
      ];

      let reports = null;
      let reportsError = null;

      for (const schema of possibleSchemas) {
        try {
          let query = supabase
            .from('medical_daily_reports')
            .select(schema)
            .order('report_date', { ascending: false });

          if (userRole === 'club') {
            if (userClubId) {
              query = query.eq('players.id_club', userClubId);
            } else if (userClub) {
              query = query.eq('players.clubes.nombre', userClub);
            }
          }

          const { data, error } = await query;
          if (error) {
            reportsError = error;
            continue;
          }
          reports = data;
          break;
        } catch (err) {
          reportsError = err;
        }
      }

      // Fallback extremadamente robusto en memoria si fallan los joins
      if (reportsError && !reports) {
        console.warn("⚠️ Error con joins en daily reports, intentando fallback sin join + mapeo en memoria...");
        try {
          const { data, error } = await supabase
            .from('medical_daily_reports')
            .select('*')
            .order('report_date', { ascending: false });

          if (error) throw error;
          
          if (data) {
            const mappedReports = data.map((report: any) => {
              const matchingRecord = performanceRecords.find(r => r.player.player_id === report.player_id);
              if (matchingRecord) {
                const p = matchingRecord.player;
                const clubName = p.club || (clubs && p.id_club ? clubs.find(c => c.id_club === p.id_club || c.id === p.id_club)?.nombre : undefined);
                return {
                  ...report,
                  players: {
                    player_id: p.player_id,
                    nombre: p.nombre || p.name || '',
                    apellido1: p.apellido1 || '',
                    apellido2: p.apellido2 || '',
                    anio: p.anio,
                    posicion: p.position || '',
                    id_club: p.id_club,
                    club: clubName || '',
                    clubes: clubName ? { nombre: clubName } : undefined
                  }
                };
              }
              return report;
            });

            // Filtrar por rol de club si es necesario
            let filteredMapped = mappedReports;
            if (userRole === 'club') {
              if (userClubId) {
                filteredMapped = mappedReports.filter((r: any) => r.players?.id_club === userClubId);
              } else if (userClub) {
                filteredMapped = mappedReports.filter((r: any) => r.players?.club === userClub);
              }
            }

            reports = filteredMapped;
          }
        } catch (fallbackErr) {
          console.error("Fallo definitivo cargando medical_daily_reports con fallback sin join:", fallbackErr);
        }
      }

      if (!reports || reports.length === 0) {
        setDailyReports([]);
        setLoading(false);
        return;
      }

      // Fetch citations to determine category at the time of report using Correct database column fecha_citacion
      const playerIds = reports.map(r => r.player_id);
      let citations: any[] | null = null;
      try {
        const { data, error } = await supabase
          .from('citaciones')
          .select(`
            player_id,
            microcycles!fk_citaciones_microcycles (
              category_id,
              start_date,
              end_date
            )
          `)
          .in('player_id', playerIds);
        if (!error) {
          citations = data;
        } else {
          const { data: fallbackData } = await supabase
            .from('citaciones')
            .select(`
              player_id,
              microcycles (
                category_id,
                start_date,
                end_date
              )
            `)
            .in('player_id', playerIds);
          citations = fallbackData;
        }
      } catch (e) {
        console.warn("Could not fetch citations for categories, falling back to player default category.", e);
      }

      const processedReports = reports.map(report => {
        // Find matching citation by date range of the microcycle and player
        const reportDate = report.report_date;
        const matchingCitation = citations?.find(c => {
          if (c.player_id !== report.player_id) return false;
          const mcObj = c.microcycles || c['microcycles!fk_citaciones_microcycles'] || c.microcycles_fk_citaciones_microcycles;
          const mc = Array.isArray(mcObj) ? mcObj[0] : mcObj;
          if (mc && mc.start_date && mc.end_date) {
            return reportDate >= mc.start_date && reportDate <= mc.end_date;
          }
          return false;
        });

        let categoryStr = report.players?.categoria || '-';
        if (matchingCitation) {
          const mcObj = matchingCitation.microcycles || matchingCitation['microcycles!fk_citaciones_microcycles'] || matchingCitation.microcycles_fk_citaciones_microcycles;
          const mc = Array.isArray(mcObj) ? mcObj[0] : mcObj;
          const catId = mc?.category_id;
          
          if (catId) {
            const category = REVERSE_CATEGORY_ID_MAP[catId];
            if (category) {
              categoryStr = category.replace('sub_', 'SUB ').toUpperCase();
            }
          }
        } else if (categoryStr) {
          categoryStr = categoryStr.replace('sub_', 'SUB ').toUpperCase();
        }

        // Parse staff name from observation if present
        let parsedObs = report.observation || '';
        let staffName = 'Staff';
        if (parsedObs.includes('\n\n[[ADDED_BY]]: ')) {
          const parts = parsedObs.split('\n\n[[ADDED_BY]]: ');
          parsedObs = parts[0];
          staffName = parts[1] || 'Staff';
        }

        return {
          ...report,
          observation: parsedObs,
          staffName: staffName,
          displayCategory: categoryStr
        };
      });

      setDailyReports(processedReports);
    } catch (err: any) {
      console.error("Error loading daily reports:", err);
      setErrorMessage("Error al cargar historial: " + err.message);
    } finally {
      setLoading(false);
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
      // Preferimos el campo anio directamente si existe en el objeto User
      const playerYear = reportingPlayer.anio || 0;

      // Stamp staff name onto the observation field securely
      let finalObservation = dailyReportForm.observation;
      const staffNameToUse = loggedStaffName || formatStaffEmail(currentStaffEmail);
      if (finalObservation.includes('\n\n[[ADDED_BY]]: ')) {
        finalObservation = finalObservation.split('\n\n[[ADDED_BY]]: ')[0];
      }
      finalObservation = `${finalObservation}\n\n[[ADDED_BY]]: ${staffNameToUse}`;

      const payload = {
        player_id: reportingPlayer.player_id,
        anio: playerYear,
        observation: finalObservation,
        diagnostico_medico: dailyReportForm.diagnostico_medico,
        severity: dailyReportForm.severity,
        treatments_applied: selectedTreatments
      };

      if (editingDailyReportId) {
        const { error } = await supabase
          .from('medical_daily_reports')
          .update(payload)
          .eq('id', editingDailyReportId);
        if (error) throw error;
        setSuccessMessage("REPORTE MÉDICO ACTUALIZADO.");
      } else {
        const { error } = await supabase.from('medical_daily_reports').insert([payload]);
        if (error) throw error;
        setSuccessMessage("REPORTE MÉDICO GUARDADO.");
      }

      // Disparar notificación push (vía Edge Function)
      if (!editingDailyReportId) {
        triggerPushNotification({
          title: `Nuevo Reporte Médico: ${reportingPlayer.name}`,
          body: `${dailyReportForm.diagnostico_medico || 'Sin diagnóstico'}. Gravedad: ${dailyReportForm.severity}`,
          url: '/medica'
        }).catch(err => console.error("Error disparando notificación:", err));
      }

      setDailyReportForm({ observation: '', diagnostico_medico: '', severity: 'low' });
      setSelectedTreatments([]);
      setReportingPlayer(null);
      setEditingDailyReportId(null);
      setSearchTerm('');
      setFoundPlayers([]);
      setHasSearched(false);
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

  const handleEditDailyReport = (report: DailyReport | any) => {
    const reportIdClub = report.players?.id_club;
    const dbClub = clubs?.find(c => Number(c.id_club) === Number(reportIdClub) || Number(c.id) === Number(reportIdClub));
    const resolvedClubName = dbClub?.nombre || (Array.isArray(report.players?.clubes) ? report.players?.clubes[0]?.nombre : report.players?.clubes?.nombre) || report.players?.club || '';

    setReportingPlayer({
      id: `p-${report.player_id}`,
      player_id: report.player_id,
      name: `${report.players?.nombre} ${report.players?.apellido1} ${report.players?.apellido2 || ''}`.trim(),
      role: UserRole.PLAYER,
      club: resolvedClubName,
      id_club: reportIdClub,
      position: report.players?.posicion || ''
    });
    setEditingDailyReportId(report.id);

    // Clean observation for edit representation
    let editObservation = report.observation || '';
    if (editObservation.includes('\n\n[[ADDED_BY]]: ')) {
      editObservation = editObservation.split('\n\n[[ADDED_BY]]: ')[0];
    }

    setDailyReportForm({
      observation: editObservation,
      diagnostico_medico: report.diagnostico_medico || '',
      severity: report.severity
    });
    setSelectedTreatments(report.treatments_applied || []);
    // Scroll automatically to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteDailyReport = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('medical_daily_reports').delete().eq('id', id);
      if (error) throw error;
      setSuccessMessage("REPORTE ELIMINADO.");
      
      if (editingDailyReportId === id) {
        setEditingDailyReportId(null);
        setDailyReportForm({ observation: '', diagnostico_medico: '', severity: 'low' });
        setSelectedTreatments([]);
      }
      
      fetchDailyReports();
      
      setTimeout(() => {
        setSuccessMessage(null);
      }, 2000);
    } catch (err: any) {
      setErrorMessage("Error al eliminar: " + err.message);
    } finally {
      setLoading(false);
      setShowConfirmDeleteReport(null);
    }
  };

  const handleSelectPlayerForReport = (player: User) => {
    setReportingPlayer(player);
    setEditingInjuryId(null);
    setEditingDailyReportId(null);
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

  const handleSelectPlayerForAttention = (player: User) => {
    setReportingPlayer(player);
    setEditingDailyReportId(null);
    setDailyReportForm({
      observation: '',
      diagnostico_medico: '',
      severity: 'low'
    });
    setSelectedTreatments([]);
    setSearchTerm('');
    setFoundPlayers([]);
    setHasSearched(false);
  };

  const handleEditClick = (injury: DBInjury) => {
    const injuryIdClub = injury.players?.id_club;
    const dbClub = clubs?.find(c => Number(c.id_club) === Number(injuryIdClub) || Number(c.id) === Number(injuryIdClub));
    const resolvedClubName = dbClub?.nombre || (Array.isArray(injury.players?.clubes) ? injury.players?.clubes[0]?.nombre : injury.players?.clubes?.nombre) || injury.players?.club || '';

    setReportingPlayer({
      id: `p-${injury.player_id}`,
      player_id: injury.player_id,
      name: `${injury.players?.nombre} ${injury.players?.apellido1} ${injury.players?.apellido2 || ''}`.trim(),
      role: UserRole.PLAYER,
      club: resolvedClubName,
      id_club: injuryIdClub,
      position: injury.players?.posicion || ''
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
    if (!reportingPlayer || !reportingPlayer.player_id) {
      setErrorMessage("Error: No se ha identificado correctamente al jugador.");
      return;
    }

    setLoading(true);
    try {
      const finalObs = injuryForm.observaciones + (exams.length > 0 ? '\n\n[[EXAMS_DATA]]\n' + JSON.stringify(exams) : '');

      const payload = {
        player_id: reportingPlayer.player_id,
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
        observaciones: finalObs,
        updated_at: new Date().toISOString()
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

      // Sincronizar también con la tabla players si es necesario (disponibilidad y estado)
      // Lo registramos en logs para trazabilidad completa
      logActivity(editingInjuryId ? 'UPDATE_MEDICAL_RECORD' : 'CREATE_MEDICAL_RECORD', {
        jugador: reportingPlayer.name,
        estado: injuryForm.estado,
        localización: injuryForm.localizacion
      });

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
            onClick={() => setView('medical_attention')}
            className={`flex-1 md:flex-none px-4 md:px-6 py-3 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${view === 'medical_attention' ? 'bg-[#0b1220] text-white shadow-xl' : 'bg-white text-slate-400 border border-slate-200'}`}
          >
            Atenciones Médicas
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
                                <div className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center">
                                  <ClubBadge clubName={p.club} idClub={p.id_club} clubs={clubs} logoSize="w-3 h-3" className="text-slate-400 font-bold uppercase text-[9px]" />
                                  <span className="text-slate-400 mx-1">•</span>
                                  <span className="text-slate-400 font-bold uppercase text-[9px]">{p.position}</span>
                                </div>
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
                      const athleteName = `${injury.players?.nombre} ${injury.players?.apellido1} ${injury.players?.apellido2 || ''}`.trim();
                      return (
                        <tr key={injury.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 md:px-10 py-4 md:py-6 text-left">
                            <p 
                              className="font-black text-slate-900 uppercase italic text-[11px] md:text-xs leading-none hover:text-emerald-600 hover:underline cursor-pointer transition-all duration-200"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (injury.player_id) {
                                  sessionStorage.setItem('selectedPlayerIdForProfile', String(injury.player_id));
                                  window.dispatchEvent(new CustomEvent('navigate-to-profile', { detail: { playerId: injury.player_id } }));
                                }
                              }}
                            >
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
            <div className="flex items-center justify-center gap-2 mt-3">
              <span className="text-white/70 font-bold uppercase text-[8px] md:text-[10px] tracking-[0.3em]">{reportingPlayer.name}</span>
              <span className="text-white/30">•</span>
              <ClubBadge clubName={reportingPlayer.club} idClub={reportingPlayer.id_club} clubs={clubs} logoSize="w-3 h-3" className="text-white/70 font-bold uppercase text-[8px] md:text-[10px] tracking-[0.3em]" />
            </div>
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
                  <label className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Pronóstico de Alta</label>
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
                const athleteName = `${injury.players?.nombre} ${injury.players?.apellido1} ${injury.players?.apellido2 || ''}`.trim();
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
                            <p className="text-[7px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Pronóstico Alta</p>
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
                            <p className={`text-[11px] font-black uppercase italic leading-none truncate ${selectedGpsPlayer?.id === injury.id ? 'text-white' : 'text-slate-900'}`}>{injury.players?.nombre} {injury.players?.apellido1} {injury.players?.apellido2 || ''}</p>
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
                          <h4 className="text-2xl md:text-3xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">{selectedGpsPlayer.players?.nombre} {selectedGpsPlayer.players?.apellido1} {selectedGpsPlayer.players?.apellido2 || ''}</h4>
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

      {view === 'medical_attention' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <section className="bg-white p-6 md:p-10 rounded-[32px] md:rounded-[48px] border border-slate-100 shadow-sm space-y-6">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3 italic">
              <span className="w-2 h-6 rounded-full bg-blue-600"></span>
              Atenciones Médicas (Kinesiología / Médica)
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
                            onClick={() => handleSelectPlayerForAttention(p)}
                            className="w-full flex items-center gap-4 p-4 hover:bg-red-50 rounded-2xl transition-all text-left group"
                          >
                            <div className="w-10 h-10 bg-[#0b1220] text-white rounded-xl flex items-center justify-center font-black italic text-xs group-hover:bg-red-600 transition-colors">
                              {p.name?.charAt(0)}
                            </div>
                            <div>
                              <p className="text-xs font-black text-slate-900 uppercase italic leading-none">{p.name}</p>
                              <div className="flex items-center gap-1 mt-1">
                                <ClubBadge clubName={p.club} idClub={p.id_club} clubs={clubs} logoSize="w-2.5 h-2.5" className="text-[9px] font-bold text-slate-400 uppercase tracking-widest" />
                                <span className="text-slate-300">•</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{p.position}</span>
                              </div>
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
                      <div className="flex items-center gap-1 mt-1">
                        <ClubBadge clubName={reportingPlayer.club} idClub={reportingPlayer.id_club} clubs={clubs} logoSize="w-3 h-3" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest" />
                        <span className="text-slate-300">•</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{reportingPlayer.position}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => { 
                    setReportingPlayer(null); 
                    setEditingDailyReportId(null); 
                    setDailyReportForm({ observation: '', diagnostico_medico: '', severity: 'low' });
                    setSelectedTreatments([]);
                  }} className="text-slate-400 hover:text-red-500 font-black uppercase text-[10px] tracking-widest">
                    {editingDailyReportId ? 'Cancelar Edición' : 'Cambiar Jugador'}
                  </button>
                </div>

                {/* HISTORIAL COMPACTO DE ATENCIONES ANTERIORES PARA EL RESPALDO DEL MÉDICO / KINESIÓLOGO */}
                <div className="mb-8 bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h5 className="text-[10px] md:text-[11px] font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-ping"></span>
                      <i className="fa-solid fa-clock-rotate-left text-blue-500 text-xs"></i>
                      Historial de Atenciones Anteriores ({reportingPlayer.name})
                    </h5>
                    <span className="text-[8px] md:text-[9.5px] font-black uppercase bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-100/50">
                      {previousReports.length} {previousReports.length === 1 ? 'Registro' : 'Registros'}
                    </span>
                  </div>

                  {previousReports.length === 0 ? (
                    <div className="text-center py-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                      <i className="fa-solid fa-folder-open text-slate-300 text-2xl mb-2 inline-block"></i>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sin registros de atenciones médicas previas para este atleta</p>
                      <p className="text-[8.5px] text-slate-400 font-bold uppercase tracking-wider mt-1">Las nuevas visitas que guardes aparecerán listadas aquí</p>
                    </div>
                  ) : (
                    <div className="overflow-hidden overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
                      <table className="w-full text-[9px] text-center border-collapse min-w-[650px]">
                        <thead className="bg-[#0b1220] text-white font-black uppercase tracking-widest text-[8.5px]">
                          <tr>
                            <th className="px-3 py-3.5 w-12 text-center">Gravedad</th>
                            <th className="px-4 py-3.5 w-24 text-center">Fecha</th>
                            <th className="px-4 py-3.5 text-left">Profesional</th>
                            <th className="px-4 py-3.5 text-left">Diagnóstico</th>
                            <th className="px-4 py-3.5 text-left">Observación</th>
                            <th className="px-4 py-3.5 text-center">Tratamiento</th>
                            <th className="px-4 py-3.5 text-right w-24">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-bold text-slate-600 bg-white">
                          {previousReports.map(report => (
                            <tr key={report.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="px-3 py-3">
                                <div className="flex justify-center">
                                  <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${
                                    report.severity === 'low' ? 'bg-emerald-500' : 
                                    report.severity === 'medium' ? 'bg-amber-500' : 
                                    report.severity === 'high' ? 'bg-red-500' : 
                                    'bg-purple-500'
                                  }`}></div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-slate-500 text-center font-extrabold">{formatDate(report.report_date)}</td>
                              <td className="px-4 py-3 text-left">
                                <span className="text-slate-800 font-bold uppercase text-[8px] bg-slate-50 border border-slate-100 rounded px-2 py-0.5 inline-flex items-center gap-1">
                                  <i className="fa-solid fa-user-doctor text-blue-500 scale-90"></i>
                                  {report.staffName || 'Staff'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-left font-black text-slate-900 uppercase italic truncate max-w-[140px]">{report.diagnostico_medico || '-'}</td>
                              <td className="px-4 py-3 text-left max-w-[200px]">
                                <p className="italic text-slate-500 truncate" title={report.observation}>"{report.observation}"</p>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-center gap-1 flex-wrap">
                                  {report.treatments_applied && report.treatments_applied.length > 0 ? (
                                    report.treatments_applied.slice(0, 3).map((t, i) => (
                                      <div key={i} className="inline-block h-4.5 px-2 rounded-md bg-blue-50 text-blue-600 border border-blue-100 text-[6.5px] font-black uppercase flex items-center justify-center">
                                        {t}
                                      </div>
                                    ))
                                  ) : (
                                    <span className="text-slate-300 italic text-[7px]">Sin tratamiento</span>
                                  )}
                                  {report.treatments_applied && report.treatments_applied.length > 3 && (
                                    <span className="text-[6.5px] font-black text-slate-400 bg-slate-50 px-1 hover:text-slate-600 rounded border border-slate-100">
                                      +{report.treatments_applied.length - 3}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleUseReportAsTemplate(report)}
                                    className="w-6 h-6 bg-slate-50 text-slate-500 rounded flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                    title="Cargar como Plantilla en Formulario"
                                  >
                                    <i className="fa-solid fa-copy text-[8px]"></i>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleEditDailyReport(report)}
                                    className="w-6 h-6 bg-slate-50 text-slate-400 rounded flex items-center justify-center hover:bg-[#0b1220] hover:text-white transition-all shadow-sm"
                                    title="Editar Reporte"
                                  >
                                    <i className="fa-solid fa-pen text-[8px]"></i>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setShowConfirmDeleteReport({ id: report.id, name: `${reportingPlayer.name}` })}
                                    className="w-6 h-6 bg-slate-50 text-slate-400 rounded flex items-center justify-center hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                    title="Eliminar Reporte"
                                  >
                                    <i className="fa-solid fa-trash-can text-[8px]"></i>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <form onSubmit={handleSaveDailyReport} className="space-y-6">

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Gravedad del Caso</label>
                    <div className="flex gap-3">
                      {(['low', 'medium', 'high', 'sick'] as const).map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setDailyReportForm({...dailyReportForm, severity: s})}
                          className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                            dailyReportForm.severity === s 
                              ? s === 'low' ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 
                                s === 'medium' ? 'bg-amber-50 border-amber-500 text-amber-600' : 
                                s === 'high' ? 'bg-red-50 border-red-500 text-red-600' :
                                'bg-purple-50 border-purple-500 text-purple-600'
                              : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                          }`}
                        >
                          {s === 'low' ? 'Leve (Verde)' : s === 'medium' ? 'Medio (Amarillo)' : s === 'high' ? 'Grave (Rojo)' : 'Enfermo (Morado)'}
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
                    {editingDailyReportId ? 'Actualizar Atención' : 'Guardar Atención Médica'}
                  </button>
                </form>
              </div>
            )}
          </section>

          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3 italic">
                <span className="w-2 h-6 rounded-full bg-blue-600"></span>
                Historial de Atenciones
              </h3>
            </div>

            {/* ADVANCED MULTI-SELECT FILTERS ROW */}
            {dailyReports.length > 0 && (
              <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-sliders text-blue-500 text-sm"></i>
                  <p className="text-[10px] font-black uppercase text-[#0b1220] tracking-wider">Filtros de Búsqueda Avanzada:</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Date Filter Dropdown */}
                  <div className="relative z-30">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Fecha de Atención</label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDateDropdownOpen(!isDateDropdownOpen);
                        setIsYearDropdownOpen(false);
                        setIsPositionDropdownOpen(false);
                        setIsClubDropdownOpen(false);
                      }}
                      className="w-full bg-white hover:bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase text-slate-700 tracking-wider transition-all shadow-sm flex items-center justify-between gap-2 focus:outline-none"
                    >
                      <span className="truncate">
                        {selectedDates.length === 0 ? 'Todas las Fechas' : `${selectedDates.length} Seleccionadas`}
                      </span>
                      <i className={`fa-solid fa-chevron-down text-[8px] text-slate-400 transition-transform ${isDateDropdownOpen ? 'rotate-180' : ''}`}></i>
                    </button>
                    {isDateDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsDateDropdownOpen(false)} />
                        <div className="absolute left-0 mt-1.5 w-72 bg-white rounded-xl shadow-xl border border-slate-100 z-50 p-3 max-h-60 overflow-y-auto">
                          <div className="flex items-center justify-between border-b border-slate-50 pb-2 mb-2">
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Fechas</span>
                            <div className="flex gap-1.5">
                              <button type="button" onClick={() => setSelectedDates(availableDates)} className="text-[8px] font-black uppercase text-blue-500">Todas</button>
                              <button type="button" onClick={() => setSelectedDates([])} className="text-[8px] font-black uppercase text-red-500">Limpiar</button>
                            </div>
                          </div>
                          {availableDates.map(date => {
                            const isChecked = selectedDates.includes(date);
                            return (
                              <label key={date} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg cursor-pointer text-[10px] font-bold text-slate-600 transition-all">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    setSelectedDates(prev => isChecked ? prev.filter(d => d !== date) : [...prev, date]);
                                  }}
                                  className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                                />
                                <span>{formatDate(date)}</span>
                              </label>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Year Filter Dropdown */}
                  <div className="relative z-30">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Año / Categoría</label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsYearDropdownOpen(!isYearDropdownOpen);
                        setIsDateDropdownOpen(false);
                        setIsPositionDropdownOpen(false);
                        setIsClubDropdownOpen(false);
                      }}
                      className="w-full bg-white hover:bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase text-slate-700 tracking-wider transition-all shadow-sm flex items-center justify-between gap-2 focus:outline-none"
                    >
                      <span className="truncate">
                        {selectedYears.length === 0 ? 'Todos los Años' : `${selectedYears.length} Seleccionados`}
                      </span>
                      <i className={`fa-solid fa-chevron-down text-[8px] text-slate-400 transition-transform ${isYearDropdownOpen ? 'rotate-180' : ''}`}></i>
                    </button>
                    {isYearDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsYearDropdownOpen(false)} />
                        <div className="absolute left-0 mt-1.5 w-60 bg-white rounded-xl shadow-xl border border-slate-100 z-50 p-3 max-h-60 overflow-y-auto">
                          <div className="flex items-center justify-between border-b border-slate-50 pb-2 mb-2">
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Años</span>
                            <div className="flex gap-1.5">
                              <button type="button" onClick={() => setSelectedYears(availableYears)} className="text-[8px] font-black uppercase text-blue-500">Todos</button>
                              <button type="button" onClick={() => setSelectedYears([])} className="text-[8px] font-black uppercase text-red-500">Limpiar</button>
                            </div>
                          </div>
                          {availableYears.map(year => {
                            const isChecked = selectedYears.includes(year);
                            return (
                              <label key={year} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg cursor-pointer text-[10px] font-bold text-slate-600 transition-all">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    setSelectedYears(prev => isChecked ? prev.filter(y => y !== year) : [...prev, year]);
                                  }}
                                  className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                                />
                                <span>Año {year}</span>
                              </label>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Position Filter Dropdown */}
                  <div className="relative z-20">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Posición</label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsPositionDropdownOpen(!isPositionDropdownOpen);
                        setIsDateDropdownOpen(false);
                        setIsYearDropdownOpen(false);
                        setIsClubDropdownOpen(false);
                      }}
                      className="w-full bg-white hover:bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase text-slate-700 tracking-wider transition-all shadow-sm flex items-center justify-between gap-2 focus:outline-none"
                    >
                      <span className="truncate">
                        {selectedPositions.length === 0 ? 'Todas las Posiciones' : `${selectedPositions.length} Seleccionadas`}
                      </span>
                      <i className={`fa-solid fa-chevron-down text-[8px] text-slate-400 transition-transform ${isPositionDropdownOpen ? 'rotate-180' : ''}`}></i>
                    </button>
                    {isPositionDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsPositionDropdownOpen(false)} />
                        <div className="absolute left-0 mt-1.5 w-60 bg-white rounded-xl shadow-xl border border-slate-100 z-50 p-3 max-h-60 overflow-y-auto">
                          <div className="flex items-center justify-between border-b border-slate-50 pb-2 mb-2">
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Posiciones</span>
                            <div className="flex gap-1.5">
                              <button type="button" onClick={() => setSelectedPositions(availablePositions)} className="text-[8px] font-black uppercase text-blue-500">Todas</button>
                              <button type="button" onClick={() => setSelectedPositions([])} className="text-[8px] font-black uppercase text-red-500">Limpiar</button>
                            </div>
                          </div>
                          {availablePositions.map(pos => {
                            const isChecked = selectedPositions.includes(pos);
                            return (
                              <label key={pos} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg cursor-pointer text-[10px] font-bold text-slate-600 transition-all">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    setSelectedPositions(prev => isChecked ? prev.filter(p => p !== pos) : [...prev, pos]);
                                  }}
                                  className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                                />
                                <span>{pos}</span>
                              </label>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Club Filter Dropdown */}
                  <div className="relative z-20">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Club</label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsClubDropdownOpen(!isClubDropdownOpen);
                        setIsDateDropdownOpen(false);
                        setIsYearDropdownOpen(false);
                        setIsPositionDropdownOpen(false);
                      }}
                      className="w-full bg-white hover:bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase text-slate-700 tracking-wider transition-all shadow-sm flex items-center justify-between gap-2 focus:outline-none"
                    >
                      <span className="truncate">
                        {selectedClubs.length === 0 ? 'Todos los Clubes' : `${selectedClubs.length} Seleccionados`}
                      </span>
                      <i className={`fa-solid fa-chevron-down text-[8px] text-slate-400 transition-transform ${isClubDropdownOpen ? 'rotate-180' : ''}`}></i>
                    </button>
                    {isClubDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsClubDropdownOpen(false)} />
                        <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-100 z-50 p-3 max-h-60 overflow-y-auto">
                          <div className="flex items-center justify-between border-b border-slate-50 pb-2 mb-2">
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Clubes</span>
                            <div className="flex gap-1.5">
                              <button type="button" onClick={() => setSelectedClubs(availableClubs.map(c => c.id))} className="text-[8px] font-black uppercase text-blue-500">Todos</button>
                              <button type="button" onClick={() => setSelectedClubs([])} className="text-[8px] font-black uppercase text-red-500">Limpiar</button>
                            </div>
                          </div>
                          {availableClubs.map(club => {
                            const isChecked = selectedClubs.includes(club.id);
                            return (
                              <label key={club.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg cursor-pointer text-[10px] font-bold text-slate-600 transition-all">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    setSelectedClubs(prev => isChecked ? prev.filter(c => c !== club.id) : [...prev, club.id]);
                                  }}
                                  className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                                />
                                <span className="truncate">{club.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <div className="bg-white rounded-[32px] md:rounded-[40px] border border-slate-100 shadow-xl overflow-hidden overflow-x-auto">
              <table className="w-full text-[10px] text-center border-collapse min-w-[600px]">
                <thead className="bg-[#0b1220] text-white font-black uppercase tracking-widest">
                  <tr>
                    <th className="px-4 py-4">Gravedad</th>
                    <th className="px-6 py-4 text-left">Atleta</th>
                    <th className="px-4 py-4 text-left">Club</th>
                    <th className="px-4 py-4">Año</th>
                    <th className="px-4 py-4">Categoría</th>
                    <th className="px-4 py-4">Fecha</th>
                    <th className="px-4 py-4 text-left">Profesional</th>
                    <th className="px-6 py-4 text-left">Diagnóstico</th>
                    <th className="px-6 py-4 text-left">Observación</th>
                    <th className="px-6 py-4">Tratamiento</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                  {filteredDailyReports.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-slate-300 font-black uppercase tracking-widest italic opacity-50">No hay reportes registrados</td>
                    </tr>
                  ) : (
                    filteredDailyReports.map(report => (
                      <tr key={report.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-4">
                          <div className="flex justify-center">
                            <div className={`w-3 h-3 rounded-full shadow-sm ${report.severity === 'low' ? 'bg-emerald-500' : report.severity === 'medium' ? 'bg-amber-500' : report.severity === 'high' ? 'bg-red-500' : 'bg-purple-500'}`}></div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-left">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center font-black italic text-[10px] text-slate-900">
                              {report.players?.nombre?.charAt(0)}
                            </div>
                            <div>
                              <p 
                                className="text-[10px] font-black text-slate-900 uppercase italic leading-none hover:text-emerald-600 hover:underline cursor-pointer transition-all duration-200"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (report.players?.player_id) {
                                    sessionStorage.setItem('selectedPlayerIdForProfile', String(report.players.player_id));
                                    window.dispatchEvent(new CustomEvent('navigate-to-profile', { detail: { playerId: report.players.player_id } }));
                                  }
                                }}
                              >
                                {report.players?.nombre} {report.players?.apellido1} {report.players?.apellido2 || ''}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-left">
                           {(() => {
                             const clubObj = Array.isArray(report.players?.clubes) ? report.players?.clubes[0] : report.players?.clubes;
                             return (
                               <ClubBadge 
                                 clubName={clubObj?.nombre || report.players?.club} 
                                 idClub={report.players?.id_club} 
                                 clubs={clubs} 
                                 logoSize="w-5 h-5" 
                                 showName={true}
                                 className="text-[9px] font-bold text-slate-500 uppercase tracking-tight"
                               />
                             );
                           })()}
                        </td>
                        <td className="px-4 py-4 text-slate-600 font-bold">{report.anio || report.players?.anio || '-'}</td>
                        <td className="px-4 py-4">
                          <span className="px-2 py-1 bg-slate-100 rounded-lg text-[8px] font-black uppercase text-slate-500 tracking-wider">
                            {report.displayCategory || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-slate-400">{formatDate(report.report_date)}</td>
                        <td className="px-4 py-4 text-left">
                          <span className="text-slate-900 font-bold uppercase text-[9px] bg-slate-50 border border-slate-100 rounded-md px-2 py-1 flex items-center gap-1.5 w-fit">
                            <i className="fa-solid fa-user-doctor text-blue-500"></i>
                            {report.staffName || 'Staff'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-left font-black text-slate-900 uppercase italic truncate max-w-[150px]">{report.diagnostico_medico || '-'}</td>
                        <td className="px-6 py-4 text-left max-w-md">
                          <p className="italic text-slate-500 truncate">"{report.observation}"</p>
                          {report.staffName && report.staffName !== 'Staff' && (
                            <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest mt-1 mr-auto flex items-center gap-1">
                              <i className="fa-solid fa-user-pen"></i>
                              Ingresado por: {report.staffName}
                            </p>
                          )}
                        </td>
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
                              <span className="text-slate-300 italic text-[8px]">Sin tratamiento</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleEditDailyReport(report)}
                              className="w-7 h-7 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center hover:bg-[#0b1220] hover:text-white transition-all shadow-sm"
                              title="Editar Reporte"
                            >
                              <i className="fa-solid fa-pen text-[9px]"></i>
                            </button>
                            <button
                              onClick={() => setShowConfirmDeleteReport({ id: report.id, name: `${report.players?.nombre} ${report.players?.apellido1} ${report.players?.apellido2 || ''}`.trim() })}
                              className="w-7 h-7 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center hover:bg-red-600 hover:text-white transition-all shadow-sm"
                              title="Eliminar Reporte"
                            >
                              <i className="fa-solid fa-trash-can text-[9px]"></i>
                            </button>
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

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN DE REPORTE DIARIO */}
      {showConfirmDeleteReport && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 mb-6 mx-auto">
              <i className="fa-solid fa-trash-can text-2xl"></i>
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2 uppercase italic">Eliminar Reporte</h3>
            <p className="text-slate-500 mb-8 text-sm">
              ¿Eliminar reporte de <span className="font-bold text-slate-900">{showConfirmDeleteReport.name}</span>?
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowConfirmDeleteReport(null)}
                className="flex-1 px-6 py-3 rounded-xl bg-slate-100 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all"
              >
                Cerrar
              </button>
              <button 
                onClick={() => handleDeleteDailyReport(showConfirmDeleteReport.id)}
                className="flex-1 px-6 py-3 rounded-xl bg-red-600 text-white font-black uppercase text-[10px] tracking-widest hover:bg-red-700 transition-all"
              >
                Eliminar
              </button>
            </div>
          </div>
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
