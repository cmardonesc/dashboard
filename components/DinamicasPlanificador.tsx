import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { logActivity } from '../lib/activityLogger';
import { FEDERATION_LOGO } from '../constants';
import { getDriveDirectLink } from '../lib/utils';
import ClubBadge from './ClubBadge';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface Player {
  player_id: number;
  nombre: string;
  apellido1: string;
  apellido2?: string;
  posicion?: string;
  id_club?: number;
  clubes?: { nombre: string };
  foto_url?: string;
}

interface CatalogDinamica {
  id: string;
  nombre: string;
  tipo: string; // cerrada, abierta, partido
  descripcion?: string;
  contenidos_ofensivos?: string; // JSON array string or comma separated
  contenidos_defensivos?: string;
  consignas?: string;
  reglas?: string;
  variantes?: string;
  link_foto?: string;
  link_video?: string;
}

interface DinamicasPlanificadorProps {
  microcycle: {
    id: number;
    nombre_display: string;
    start_date: string;
    end_date: string;
    category_id: number;
  };
  dateKey: string;
  dayNumber: number;
  citedPlayers: Player[];
  dayTasks?: { id: string; nombre: string; tipoDinamica: string; descripcion?: string }[];
  onBack: () => void;
  onRefreshParent?: () => void;
}

interface PlanningSession {
  dinamicaId: string;
  nombre: string;
  order: number;
  observaciones: string;
  targetA: number;
  targetB: number;
  targetComodines: number;
  targetArqueros: number;
  assignments: { [playerId: string]: string }; // playerId -> role
  teams?: { id: string; nombre: string; color: string; target: number }[];
  teamOrders?: { [teamId: string]: number[] }; // teamId -> playerIds in order
}

const ROLES = [
  { id: 'none', label: 'Sin Asignar', color: 'bg-slate-100 text-slate-500' },
  { id: 'A', label: 'Equipo A', color: 'bg-red-100 text-red-700 border-red-200' },
  { id: 'B', label: 'Equipo B', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'C', label: 'Comodín', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { id: 'GK', label: 'Arquero', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { id: 'GKC', label: 'Arq. Comodín', color: 'bg-teal-100 text-teal-700 border-teal-200' },
  { id: 'EXT', label: 'Exterior', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: 'PROF', label: 'Profundo', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { id: 'FIN', label: 'Finalizador', color: 'bg-pink-100 text-pink-700 border-pink-200' }
];

export const DinamicasPlanificador: React.FC<DinamicasPlanificadorProps> = ({
  microcycle,
  dateKey,
  dayNumber,
  citedPlayers: propCitedPlayers,
  dayTasks,
  onBack,
  onRefreshParent
}) => {
  const [catalog, setCatalog] = useState<CatalogDinamica[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [loadingPlanning, setLoadingPlanning] = useState(true);
  const [sessions, setSessions] = useState<PlanningSession[]>([]);
  const [activeSessionIndex, setActiveSessionIndex] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [catalogFilter, setCatalogFilter] = useState('');
  const [catalogTypeFilter, setCatalogTypeFilter] = useState('todos');
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [downloadingJPG, setDownloadingJPG] = useState(false);
  const [showImagePopover, setShowImagePopover] = useState(false);
  const [selectedPlayerForStatus, setSelectedPlayerForStatus] = useState<Player | null>(null);

  const parseFieldToArray = (val: any): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {
          // fallback
        }
      }
      if (trimmed.includes(',')) {
        return trimmed.split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
      }
      return [trimmed];
    }
    return [];
  };

  // Filtrar arqueros/porteros para dinámicas de campo
  const citedPlayers = useMemo(() => {
    return (propCitedPlayers || []).filter(p => {
      const pos = (p.posicion || '').toLowerCase().trim();
      const isArquero = pos.includes('arq') || pos.includes('por') || pos.includes('gua');
      return !isArquero;
    });
  }, [propCitedPlayers]);

  // Cargar catálogo de dinámicas desde la tabla tareas
  useEffect(() => {
    const fetchCatalog = async () => {
      setLoadingCatalog(true);
      try {
        const { data, error } = await supabase
          .from('tareas')
          .select('*')
          .order('nombre', { ascending: true });

        if (error) throw error;
        if (data) {
          const mapped: CatalogDinamica[] = data.map((t: any) => ({
            id: t.id.toString(),
            nombre: t.nombre,
            tipo: t.tipo || 'cerrada',
            descripcion: t.descripcion,
            contenidos_ofensivos: t.contenidos_ofensivos,
            contenidos_defensivos: t.contenidos_defensivos,
            consignas: t.consignas,
            reglas: t.reglas,
            variantes: t.variantes,
            link_foto: t.link_foto,
            link_video: t.link_video
          }));
          setCatalog(mapped);
        }
      } catch (err) {
        console.error("Error loading dynamics catalog:", err);
      } finally {
        setLoadingCatalog(false);
      }
    };

    fetchCatalog();
  }, []);

  // Intentar deducir cuotas de jugadores basado en el nombre de la dinámica
  const parseTargetQuotas = (name: string) => {
    let targetA = 4;
    let targetB = 4;
    let targetComodines = 0;
    let targetArqueros = 0;

    const lowerName = name.toLowerCase();

    // Ej: "Dinámica 4 vs 4 + C + 2A"
    const vsMatch = name.match(/(\d+)\s*vs\s*(\d+)/i);
    if (vsMatch) {
      targetA = parseInt(vsMatch[1], 10);
      targetB = parseInt(vsMatch[2], 10);
    }

    if (lowerName.includes('+ c') || lowerName.includes('+ 1c') || lowerName.includes('comodín')) {
      targetComodines = 1;
    } else if (lowerName.includes('+ 2c')) {
      targetComodines = 2;
    } else if (lowerName.includes('+ 3c') || lowerName.includes('+ 3 comodines')) {
      targetComodines = 3;
    } else if (lowerName.includes('+ 4c')) {
      targetComodines = 4;
    }

    if (lowerName.includes('2a') || lowerName.includes('2 porteros') || lowerName.includes('2ac')) {
      targetArqueros = 2;
    } else if (lowerName.includes('1a') || lowerName.includes('1 portero')) {
      targetArqueros = 1;
    }

    return { targetA, targetB, targetComodines, targetArqueros };
  };

  // Cargar planificación guardada para este día o inicializar desde dayTasks con alineación inteligente
  useEffect(() => {
    if (loadingCatalog) return;

    const normalizeStringForMatch = (str: string) => {
      return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
    };

    const findMatchedCatalog = (taskName: string) => {
      const normTask = normalizeStringForMatch(taskName);
      // 1. Coincidencia exacta normalizada
      let matched = catalog.find(c => normalizeStringForMatch(c.nombre) === normTask);
      if (matched) return matched;
      
      // 2. Coincidencia parcial
      matched = catalog.find(c => {
        const normCatalog = normalizeStringForMatch(c.nombre);
        return normCatalog.includes(normTask) || normTask.includes(normCatalog);
      });
      return matched;
    };

    const fetchSavedPlanning = async () => {
      setLoadingPlanning(true);
      try {
        const res = await fetch(`/api/dinamicas-planificaciones?microcycleId=${microcycle.id}&dateKey=${dateKey}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            // Sincronizar sesiones guardadas con las tareas actuales del calendario (dayTasks)
            let alignedSessions = [...data];
            
            if (dayTasks && dayTasks.length > 0) {
              alignedSessions = data.map((session, idx) => {
                const currentTask = dayTasks[idx];
                if (currentTask) {
                  const sessionNameNorm = session.nombre.toLowerCase().trim();
                  const taskNameNorm = currentTask.nombre.toLowerCase().trim();
                  
                  if (sessionNameNorm !== taskNameNorm) {
                    // Desajuste detectado. Sincronizar el nombre y propiedades de la sesión con la tarea de la agenda actual
                    const matchedCatalog = findMatchedCatalog(currentTask.nombre);
                    const nameToUse = matchedCatalog ? matchedCatalog.nombre : currentTask.nombre;
                    const idToUse = matchedCatalog ? matchedCatalog.id : currentTask.id;
                    const { targetA, targetB, targetComodines, targetArqueros } = parseTargetQuotas(nameToUse);
                    
                    return {
                      ...session,
                      dinamicaId: idToUse,
                      nombre: nameToUse,
                      targetA,
                      targetB,
                      targetComodines,
                      targetArqueros,
                    };
                  }
                }
                return session;
              });

              // Si hay más tareas en dayTasks que sesiones guardadas, agregamos las que faltan
              if (dayTasks.length > data.length) {
                for (let i = data.length; i < dayTasks.length; i++) {
                  const task = dayTasks[i];
                  const matchedCatalog = findMatchedCatalog(task.nombre);
                  const nameToUse = matchedCatalog ? matchedCatalog.nombre : task.nombre;
                  const idToUse = matchedCatalog ? matchedCatalog.id : task.id;
                  const { targetA, targetB, targetComodines, targetArqueros } = parseTargetQuotas(nameToUse);
                  
                  alignedSessions.push({
                    dinamicaId: idToUse,
                    nombre: nameToUse,
                    order: i + 1,
                    observaciones: '',
                    targetA,
                    targetB,
                    targetComodines,
                    targetArqueros,
                    assignments: {}
                  });
                }
              }

              // Si hay más sesiones guardadas que las de dayTasks actual, recortar al número correcto de la agenda
              if (alignedSessions.length > dayTasks.length) {
                alignedSessions = alignedSessions.slice(0, dayTasks.length);
              }
            }
            
            setSessions(alignedSessions);
            setActiveSessionIndex(0);
          } else if (dayTasks && dayTasks.length > 0) {
            // No hay planificación previa de roles, pre-poblar usando las dinámicas ya agendadas
            const initialSessions: PlanningSession[] = dayTasks.map((task, idx) => {
              const matchedCatalog = findMatchedCatalog(task.nombre);
              const nameToUse = matchedCatalog ? matchedCatalog.nombre : task.nombre;
              const idToUse = matchedCatalog ? matchedCatalog.id : task.id;
              const { targetA, targetB, targetComodines, targetArqueros } = parseTargetQuotas(nameToUse);

              return {
                dinamicaId: idToUse,
                nombre: nameToUse,
                order: idx + 1,
                observaciones: '',
                targetA,
                targetB,
                targetComodines,
                targetArqueros,
                assignments: {}
              };
            });
            setSessions(initialSessions);
            setActiveSessionIndex(0);
          } else {
            // Si dayTasks está vacío, auto-inicializar con catalog[0] por defecto para ir directo al diseñador sin "Workspace Vacío"
            if (catalog && catalog.length > 0) {
              const defaultDyn = catalog[0];
              const { targetA, targetB, targetComodines, targetArqueros } = parseTargetQuotas(defaultDyn.nombre);
              setSessions([{
                dinamicaId: defaultDyn.id,
                nombre: defaultDyn.nombre,
                order: 1,
                observaciones: '',
                targetA,
                targetB,
                targetComodines,
                targetArqueros,
                assignments: {}
              }]);
              setActiveSessionIndex(0);
            } else {
              setSessions([]);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching saved planning:", err);
      } finally {
        setLoadingPlanning(false);
      }
    };

    fetchSavedPlanning();
  }, [microcycle.id, dateKey, catalog, loadingCatalog, dayTasks]);

  // Añadir una dinámica a la planificación actual
  const handleAddDinamica = (dinamica: CatalogDinamica) => {
    const { targetA, targetB, targetComodines, targetArqueros } = parseTargetQuotas(dinamica.nombre);
    
    const newSession: PlanningSession = {
      dinamicaId: dinamica.id,
      nombre: dinamica.nombre,
      order: sessions.length + 1,
      observaciones: '',
      targetA,
      targetB,
      targetComodines,
      targetArqueros,
      assignments: {}
    };

    setSessions([...sessions, newSession]);
    setActiveSessionIndex(sessions.length);
  };

  // Remover dinámica de la planificación
  const handleRemoveDinamica = (index: number) => {
    const updated = sessions.filter((_, i) => i !== index).map((s, idx) => ({ ...s, order: idx + 1 }));
    setSessions(updated);
    if (activeSessionIndex >= updated.length) {
      setActiveSessionIndex(Math.max(0, updated.length - 1));
    }
  };

  // Reordenar dinámica (subir)
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...sessions];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    
    // Ajustar orden
    updated.forEach((s, idx) => s.order = idx + 1);
    setSessions(updated);
    setActiveSessionIndex(index - 1);
  };

  // Reordenar dinámica (bajar)
  const handleMoveDown = (index: number) => {
    if (index === sessions.length - 1) return;
    const updated = [...sessions];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;

    // Ajustar orden
    updated.forEach((s, idx) => s.order = idx + 1);
    setSessions(updated);
    setActiveSessionIndex(index + 1);
  };

  // Actualizar asignación de jugador
  const handleAssignPlayer = (playerId: number, roleId: string) => {
    if (sessions.length === 0) return;
    const updated = [...sessions];
    const active = { ...updated[activeSessionIndex] };
    const assignments = { ...active.assignments };
    const teamOrders = active.teamOrders ? { ...active.teamOrders } : {};

    const oldRole = assignments[String(playerId)] || 'none';

    if (roleId === 'none') {
      delete assignments[String(playerId)];
    } else {
      assignments[String(playerId)] = roleId;
    }

    if (oldRole !== 'none' && teamOrders[oldRole]) {
      teamOrders[oldRole] = teamOrders[oldRole].filter(id => id !== playerId);
    }

    if (roleId !== 'none') {
      if (!teamOrders[roleId]) {
        teamOrders[roleId] = [];
      }
      teamOrders[roleId] = teamOrders[roleId].filter(id => id !== playerId);
      teamOrders[roleId].push(playerId);
    }

    active.assignments = assignments;
    active.teamOrders = teamOrders;
    updated[activeSessionIndex] = active;
    setSessions(updated);
  };

  // Auto-completar asignaciones de forma inteligente (distribuir equitativamente)
  const handleAutoAssign = () => {
    if (sessions.length === 0) return;
    const updated = [...sessions];
    const active = { ...updated[activeSessionIndex] };
    const assignments = { ...active.assignments };
    const teamOrders: { [teamId: string]: number[] } = {};

    // Limpiar asignaciones anteriores
    const playersToAssign = [...citedPlayers];
    
    // Primero, arqueros (posicion === 'ARQUERO' o 'Portero')
    const gks = playersToAssign.filter(p => p.posicion?.toUpperCase().includes('ARQ') || p.posicion?.toUpperCase().includes('PORT'));
    const fieldPlayers = playersToAssign.filter(p => !p.posicion?.toUpperCase().includes('ARQ') && !p.posicion?.toUpperCase().includes('PORT'));

    let assignedGKs = 0;
    gks.forEach(gk => {
      if (assignedGKs < active.targetArqueros) {
        assignments[String(gk.player_id)] = 'GK';
        if (!teamOrders['GK']) teamOrders['GK'] = [];
        teamOrders['GK'].push(gk.player_id);
        assignedGKs++;
      } else {
        assignments[String(gk.player_id)] = 'none';
      }
    });

    // Dividir jugadores de campo equitativamente
    let assignedA = 0;
    let assignedB = 0;
    let assignedC = 0;

    fieldPlayers.forEach(p => {
      if (assignedA < active.targetA) {
        assignments[String(p.player_id)] = 'A';
        if (!teamOrders['A']) teamOrders['A'] = [];
        teamOrders['A'].push(p.player_id);
        assignedA++;
      } else if (assignedB < active.targetB) {
        assignments[String(p.player_id)] = 'B';
        if (!teamOrders['B']) teamOrders['B'] = [];
        teamOrders['B'].push(p.player_id);
        assignedB++;
      } else if (assignedC < active.targetComodines) {
        assignments[String(p.player_id)] = 'C';
        if (!teamOrders['C']) teamOrders['C'] = [];
        teamOrders['C'].push(p.player_id);
        assignedC++;
      } else {
        assignments[String(p.player_id)] = 'none';
      }
    });

    active.assignments = assignments;
    active.teamOrders = teamOrders;
    updated[activeSessionIndex] = active;
    setSessions(updated);
  };

  // Limpiar asignaciones de la dinámica activa
  const handleClearAssignments = () => {
    if (sessions.length === 0) return;
    const updated = [...sessions];
    const active = { ...updated[activeSessionIndex] };
    active.assignments = {};
    active.teamOrders = {};
    updated[activeSessionIndex] = active;
    setSessions(updated);
  };

  // Guardar planificación en el servidor
  const handleSavePlanning = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/dinamicas-planificaciones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          microcycleId: microcycle.id,
          dateKey,
          assignments: sessions
        })
      });

      if (res.ok) {
        // Guardar participación de jugadores en Supabase
        try {
          const dinamicaIds = sessions.map(s => s.dinamicaId);
          
          // 1. Eliminar registros anteriores para estas dinámicas en esta fecha
          const { error: deleteError } = await supabase
            .from('participacion_dinamicas')
            .delete()
            .eq('fecha', dateKey)
            .in('dinamica_id', dinamicaIds);

          if (deleteError) {
            console.error("Error al eliminar participaciones antiguas:", deleteError);
          }

          // 2. Construir los nuevos registros de participación
          const participaciones: any[] = [];
          
          sessions.forEach((session) => {
            citedPlayers.forEach((player) => {
              const roleId = session.assignments[String(player.player_id)] || 'none';
              
              let equipoVal = 'NO_PARTICIPA';
              if (roleId === 'A') equipoVal = 'EQUIPO_A';
              else if (roleId === 'B') equipoVal = 'EQUIPO_B';
              else if (roleId === 'C') equipoVal = 'COMODIN';
              else if (roleId !== 'none') equipoVal = roleId.toUpperCase();

              const roleLabel = ROLES.find(r => r.id === roleId)?.label || 'Sin Asignar';

              participaciones.push({
                player_id: player.player_id,
                dinamica_id: session.dinamicaId,
                fecha: dateKey,
                session_title: microcycle.nombre_display,
                jornada: `DÍA ${dayNumber}`,
                equipo: equipoVal,
                posicion_rol: roleLabel,
                observaciones: session.observaciones || ''
              });
            });
          });

          // 3. Insertar registros en lote si hay alguno
          if (participaciones.length > 0) {
            const { error: insertError } = await supabase
              .from('participacion_dinamicas')
              .insert(participaciones);

            if (insertError) {
              console.error("Error al insertar participaciones en Supabase:", insertError);
            } else {
              console.log("Participaciones de jugadores guardadas en Supabase exitosamente:", participaciones.length);
            }
          }
        } catch (dbErr) {
          console.error("Error en flujo de base de datos de participación:", dbErr);
        }

        logActivity('Planificación Dinámicas Guardada', {
          microcycle: microcycle.nombre_display,
          dateKey,
          dynamicsCount: sessions.length
        });
        alert('Planificación de dinámicas guardada exitosamente.');
        if (onRefreshParent) onRefreshParent();
      } else {
        throw new Error('Response error');
      }
    } catch (err: any) {
      console.error("Error saving dynamics planning:", err);
      alert('Error al guardar la planificación en el servidor: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Duplicar planificación a otro día de la semana
  const handleDuplicateToDay = async () => {
    const targetDayStr = window.prompt(`Duplicar esta planificación de hoy (${dateKey}) a otro día de la semana.\nIngresa la fecha de destino (AAAA-MM-DD):`);
    if (!targetDayStr) return;

    setDuplicating(true);
    try {
      const res = await fetch('/api/dinamicas-planificaciones/duplicate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          microcycleId: microcycle.id,
          sourceDateKey: dateKey,
          targetDateKey: targetDayStr.trim()
        })
      });

      if (res.ok) {
        logActivity('Planificación Dinámicas Duplicada', {
          microcycle: microcycle.nombre_display,
          source: dateKey,
          target: targetDayStr.trim()
        });
        alert(`Planificación duplicada con éxito al día ${targetDayStr.trim()}.`);
        if (onRefreshParent) onRefreshParent();
      } else {
        throw new Error('Response error');
      }
    } catch (err: any) {
      console.error("Error duplicating planning:", err);
      alert('Error al duplicar la planificación: ' + err.message);
    } finally {
      setDuplicating(false);
    }
  };

  // Cambiar observaciones de la dinámica activa
  const handleUpdateObservaciones = (text: string) => {
    if (sessions.length === 0) return;
    const updated = [...sessions];
    const active = { ...updated[activeSessionIndex] };
    active.observaciones = text;
    updated[activeSessionIndex] = active;
    setSessions(updated);
  };

  // Filtrar catálogo de dinámicas
  const filteredCatalog = useMemo(() => {
    return catalog.filter(item => {
      const matchesSearch = item.nombre.toLowerCase().includes(catalogFilter.toLowerCase()) || 
                            (item.descripcion || '').toLowerCase().includes(catalogFilter.toLowerCase());
      const matchesType = catalogTypeFilter === 'todos' || item.tipo === catalogTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [catalog, catalogFilter, catalogTypeFilter]);

  // Contadores reales para la sesión activa
  const activeSession = sessions[activeSessionIndex];
  const roleCounters = useMemo(() => {
    if (!activeSession) return { A: 0, B: 0, C: 0, GK: 0, total: 0 };
    const counts = { A: 0, B: 0, C: 0, GK: 0, total: 0 };
    Object.values(activeSession.assignments).forEach(role => {
      if (role === 'A') counts.A++;
      if (role === 'B') counts.B++;
      if (role === 'C') counts.C++;
      if (role === 'GK' || role === 'GKC') counts.GK++;
      counts.total++;
    });
    return counts;
  }, [activeSession]);

  const activeCatalogDetail = useMemo(() => {
    if (!activeSession) return null;
    return catalog.find(c => c.id === activeSession.dinamicaId) || null;
  }, [activeSession, catalog]);

  const [activeSlotSelection, setActiveSlotSelection] = useState<{ teamId: string; slotIndex?: number } | null>(null);
  const [playerSearch, setPlayerSearch] = useState('');

  const getPlayerGroup = (posicion: string = '') => {
    const pos = posicion.toLowerCase().trim();
    if (pos.includes('arq') || pos.includes('por') || pos.includes('gua')) return 'Arqueros';
    if (pos.includes('media punta') || pos.includes('mediapunta') || pos.includes('mp') || pos.includes('media_punta')) return 'Volantes';
    if (pos.includes('ext') || pos.includes('punte') || pos.includes('wing')) return 'Delanteros Extremos';
    if (pos.includes('del') || pos.includes('punta') || pos.includes('9') || pos.includes('ariete')) return 'Delanteros';
    if (pos.includes('vol') || pos.includes('med') || pos.includes('cont') || pos.includes('mix') || pos.includes('crea') || pos.includes('eng')) return 'Volantes';
    if (pos.includes('lat') || pos.includes('carri') || pos.includes('banda') || pos.includes('carrilero')) return 'Laterales';
    if (pos.includes('def') || pos.includes('cent') || pos.includes('zag') || pos.includes('back') || pos.includes('stopp') || pos.includes('lib')) return 'Defensas';
    return 'Otros';
  };

  const getSessionTeams = (session: PlanningSession) => {
    const list = [];
    
    // Default Teams
    list.push({ id: 'A', nombre: 'Equipo A', color: 'red', target: session.targetA || 4 });
    list.push({ id: 'B', nombre: 'Equipo B', color: 'blue', target: session.targetB || 4 });
    
    // Comodines: Always available so that users can increase their slot count if needed.
    list.push({ id: 'C', nombre: 'Comodines', color: 'amber', target: session.targetComodines || 0 });

    // Custom Teams
    if (session.teams && session.teams.length > 0) {
      session.teams.forEach(t => {
        if (!['A', 'B', 'C', 'GK'].includes(t.id)) {
          list.push(t);
        }
      });
    }

    return list;
  };

  const handleUpdateTeamTarget = (teamId: string, delta: number) => {
    if (sessions.length === 0) return;
    const updated = [...sessions];
    const active = { ...updated[activeSessionIndex] };
    
    if (teamId === 'A') {
      active.targetA = Math.max(1, (active.targetA || 4) + delta);
    } else if (teamId === 'B') {
      active.targetB = Math.max(1, (active.targetB || 4) + delta);
    } else if (teamId === 'C') {
      active.targetComodines = Math.max(0, (active.targetComodines || 0) + delta);
    } else if (teamId === 'GK') {
      active.targetArqueros = Math.max(1, (active.targetArqueros || 2) + delta);
    } else {
      const currentTeams = active.teams || [];
      const updatedTeams = currentTeams.map(t => {
        if (t.id === teamId) {
          return { ...t, target: Math.max(1, (t.target || 4) + delta) };
        }
         return t;
      });
      active.teams = updatedTeams;
    }
    
    updated[activeSessionIndex] = active;
    setSessions(updated);
  };

  const handleAddTeamSubmit = (name: string) => {
    if (sessions.length === 0) return;
    const finalName = name.trim();
    if (!finalName) return;

    const updated = [...sessions];
    const active = { ...updated[activeSessionIndex] };
    
    const currentTeams = active.teams || [];
    const teamId = `team_${Date.now()}`;
    const colors = ['purple', 'orange', 'pink', 'indigo', 'teal'];
    const chosenColor = colors[currentTeams.length % colors.length];

    const newTeam = {
      id: teamId,
      nombre: finalName,
      color: chosenColor,
      target: 4
    };

    active.teams = [...currentTeams, newTeam];
    updated[activeSessionIndex] = active;
    setSessions(updated);
    setShowAddTeamModal(false);
    setNewTeamName('');
  };

  const handleDownloadPDF = async () => {
    if (sessions.length === 0) return;
    setDownloadingPDF(true);
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pages = document.querySelectorAll('.session-pdf-page');
      
      for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i] as HTMLElement;
        
        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 297; // Landscape A4 is 297mm wide
        const pageHeight = 210; // Landscape A4 is 210mm high
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        if (i > 0) {
          doc.addPage('a4', 'landscape');
        }
        
        const yOffset = imgHeight < pageHeight ? (pageHeight - imgHeight) / 2 : 0;
        doc.addImage(imgData, 'PNG', 0, yOffset, imgWidth, Math.min(imgHeight, pageHeight));
      }

      const fileName = `Planificacion_Campo_${dateKey}_Dia_${dayNumber}.pdf`;
      doc.save(fileName);

      try {
        await logActivity('Descargó Planificación PDF', {
          microcycle: microcycle.nombre_display,
          dayNumber,
          dateKey,
          dynamicsCount: sessions.length
        });
      } catch (logErr) {
        console.warn('Logging activity failed:', logErr);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleDownloadJPG = async () => {
    if (sessions.length === 0) return;
    setDownloadingJPG(true);
    try {
      const pages = document.querySelectorAll('.session-pdf-page');
      
      for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i] as HTMLElement;
        
        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const link = document.createElement('a');
        link.download = `Planificacion_Campo_${dateKey}_Dia_${dayNumber}_Pagina_${i + 1}.jpg`;
        link.href = imgData;
        link.click();
      }

      try {
        await logActivity('Descargó Planificación JPG', {
          microcycle: microcycle.nombre_display,
          dayNumber,
          dateKey,
          dynamicsCount: sessions.length
        });
      } catch (logErr) {
        console.warn('Logging activity failed:', logErr);
      }
    } catch (error) {
      console.error('Error generating JPG:', error);
    } finally {
      setDownloadingJPG(false);
    }
  };

  const getTeamColors = (color: string) => {
    switch (color) {
      case 'red':
        return {
          bg: 'bg-red-50/40',
          border: 'border-red-100',
          text: 'text-red-700',
          badge: 'bg-[#CF1B2B] text-white',
          accent: 'text-[#CF1B2B]',
          iconColor: 'bg-red-100 text-red-700'
        };
      case 'blue':
        return {
          bg: 'bg-blue-50/40',
          border: 'border-blue-100',
          text: 'text-blue-700',
          badge: 'bg-blue-600 text-white',
          accent: 'text-blue-600',
          iconColor: 'bg-blue-100 text-blue-700'
        };
      case 'amber':
        return {
          bg: 'bg-amber-50/40',
          border: 'border-amber-100',
          text: 'text-amber-700',
          badge: 'bg-amber-500 text-white',
          accent: 'text-amber-600',
          iconColor: 'bg-amber-100 text-amber-700'
        };
      case 'emerald':
        return {
          bg: 'bg-emerald-50/40',
          border: 'border-emerald-100',
          text: 'text-emerald-700',
          badge: 'bg-emerald-600 text-white',
          accent: 'text-emerald-600',
          iconColor: 'bg-emerald-100 text-emerald-700'
        };
      case 'purple':
        return {
          bg: 'bg-purple-50/40',
          border: 'border-purple-100',
          text: 'text-purple-700',
          badge: 'bg-purple-600 text-white',
          accent: 'text-purple-600',
          iconColor: 'bg-purple-100 text-purple-700'
        };
      case 'orange':
        return {
          bg: 'bg-orange-50/40',
          border: 'border-orange-100',
          text: 'text-orange-700',
          badge: 'bg-orange-600 text-white',
          accent: 'text-orange-600',
          iconColor: 'bg-orange-100 text-orange-700'
        };
      case 'pink':
        return {
          bg: 'bg-pink-50/40',
          border: 'border-pink-100',
          text: 'text-pink-700',
          badge: 'bg-pink-600 text-white',
          accent: 'text-pink-600',
          iconColor: 'bg-pink-100 text-pink-700'
        };
      case 'indigo':
        return {
          bg: 'bg-indigo-50/40',
          border: 'border-indigo-100',
          text: 'text-indigo-700',
          badge: 'bg-indigo-600 text-white',
          accent: 'text-indigo-600',
          iconColor: 'bg-indigo-100 text-indigo-700'
        };
      case 'teal':
        return {
          bg: 'bg-teal-50/40',
          border: 'border-teal-100',
          text: 'text-teal-700',
          badge: 'bg-teal-600 text-white',
          accent: 'text-teal-600',
          iconColor: 'bg-teal-100 text-teal-700'
        };
      default:
        return {
          bg: 'bg-slate-50/40',
          border: 'border-slate-100',
          text: 'text-slate-700',
          badge: 'bg-slate-600 text-white',
          accent: 'text-slate-600',
          iconColor: 'bg-slate-100 text-slate-700'
        };
    }
  };

  const getPositionColors = (posicion: string = '') => {
    const group = getPlayerGroup(posicion);
    switch (group) {
      case 'Defensas':
        return {
          text: 'text-blue-600 font-extrabold',
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          dot: 'bg-blue-500'
        };
      case 'Laterales':
        return {
          text: 'text-cyan-600 font-extrabold',
          bg: 'bg-cyan-50',
          border: 'border-cyan-200',
          dot: 'bg-cyan-500'
        };
      case 'Volantes':
        return {
          text: 'text-emerald-600 font-extrabold',
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          dot: 'bg-emerald-500'
        };
      case 'Delanteros Extremos':
        return {
          text: 'text-purple-600 font-extrabold',
          bg: 'bg-purple-50',
          border: 'border-purple-200',
          dot: 'bg-purple-500'
        };
      case 'Delanteros':
        return {
          text: 'text-rose-600 font-extrabold',
          bg: 'bg-rose-50',
          border: 'border-rose-200',
          dot: 'bg-rose-500'
        };
      case 'Arqueros':
        return {
          text: 'text-amber-600 font-extrabold',
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          dot: 'bg-amber-500'
        };
      default:
        return {
          text: 'text-slate-500 font-bold',
          bg: 'bg-slate-50',
          border: 'border-slate-200',
          dot: 'bg-slate-400'
        };
    }
  };

  const groupedCitedPlayers = useMemo(() => {
    const groups: { [key: string]: Player[] } = {
      'Defensas': [],
      'Laterales': [],
      'Volantes': [],
      'Delanteros Extremos': [],
      'Delanteros': [],
      'Arqueros': [],
      'Otros': []
    };

    // Only show unassigned/free players in the main list
    const unassigned = activeSession
      ? citedPlayers.filter(p => !activeSession.assignments[String(p.player_id)] || activeSession.assignments[String(p.player_id)] === 'none')
      : citedPlayers;

    unassigned.forEach(p => {
      const g = getPlayerGroup(p.posicion);
      if (groups[g]) {
        groups[g].push(p);
      } else {
        groups['Otros'].push(p);
      }
    });

    return groups;
  }, [citedPlayers, activeSession]);

  const unassignedPlayers = useMemo(() => {
    if (!activeSession) return [];
    return citedPlayers.filter(p => !activeSession.assignments[String(p.player_id)] || activeSession.assignments[String(p.player_id)] === 'none');
  }, [citedPlayers, activeSession]);

  const unassignedGroupedPlayers = useMemo(() => {
    const groups: { [key: string]: Player[] } = {
      'Defensas': [],
      'Laterales': [],
      'Volantes': [],
      'Delanteros Extremos': [],
      'Delanteros': [],
      'Arqueros': [],
      'Otros': []
    };

    unassignedPlayers.forEach(p => {
      const g = getPlayerGroup(p.posicion);
      if (groups[g]) {
        groups[g].push(p);
      } else {
        groups['Otros'].push(p);
      }
    });

    return groups;
  }, [unassignedPlayers]);

  const getFormattedName = (nombre: string, apellido: string) => {
    if (!nombre) return apellido || '';
    const initial = nombre.trim().charAt(0).toUpperCase();
    const cleanApellido = (apellido || '').trim().toUpperCase();
    return `${initial}. ${cleanApellido}`;
  };

  const getTeamSlots = (teamId: string, target: number, session: PlanningSession) => {
    const assignments = session.assignments || {};
    const teamOrders = session.teamOrders || {};
    const orderedIds = teamOrders[teamId] || [];

    const assigned = citedPlayers.filter(p => assignments[String(p.player_id)] === teamId);

    const sortedAssigned = [...assigned].sort((a, b) => {
      const indexA = orderedIds.indexOf(a.player_id);
      const indexB = orderedIds.indexOf(b.player_id);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return 0;
    });

    const slots = [];
    sortedAssigned.forEach(p => {
      slots.push({ type: 'player', player: p });
    });

    const emptyCount = Math.max(1, target - sortedAssigned.length);
    for (let i = 0; i < emptyCount; i++) {
      slots.push({ type: 'empty', id: i });
    }
    return slots;
  };

  // Drag and Drop Helpers
  const handleDragStart = (e: React.DragEvent, player: Player, sourceTeamId: string) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ playerId: player.player_id, sourceTeamId }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnTeam = (e: React.DragEvent, targetTeamId: string) => {
    e.preventDefault();
    try {
      const rawData = e.dataTransfer.getData('text/plain');
      if (!rawData) return;
      const { playerId, sourceTeamId } = JSON.parse(rawData);
      
      if (sourceTeamId === targetTeamId) return;

      handleMovePlayerToTeam(playerId, sourceTeamId, targetTeamId);
    } catch (err) {
      console.error("Drop on team error:", err);
    }
  };

  const handleDropOnPlayer = (e: React.DragEvent, targetPlayer: Player, targetTeamId: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const rawData = e.dataTransfer.getData('text/plain');
      if (!rawData) return;
      const { playerId, sourceTeamId } = JSON.parse(rawData);
      
      handleMovePlayerTargeted(playerId, sourceTeamId, targetPlayer.player_id, targetTeamId);
    } catch (err) {
      console.error("Drop on player error:", err);
    }
  };

  const handleDropOnUnassigned = (e: React.DragEvent) => {
    e.preventDefault();
    try {
      const rawData = e.dataTransfer.getData('text/plain');
      if (!rawData) return;
      const { playerId, sourceTeamId } = JSON.parse(rawData);
      if (sourceTeamId === 'none') return;

      handleMovePlayerToTeam(playerId, sourceTeamId, 'none');
    } catch (err) {
      console.error("Drop on unassigned error:", err);
    }
  };

  const handleMovePlayerToTeam = (playerId: number, sourceTeamId: string, targetTeamId: string) => {
    if (sessions.length === 0) return;
    const updated = [...sessions];
    const active = { ...updated[activeSessionIndex] };
    const assignments = { ...active.assignments };
    const teamOrders = active.teamOrders ? { ...active.teamOrders } : {};

    assignments[String(playerId)] = targetTeamId;

    if (sourceTeamId !== 'none' && teamOrders[sourceTeamId]) {
      teamOrders[sourceTeamId] = teamOrders[sourceTeamId].filter(id => id !== playerId);
    }

    if (targetTeamId !== 'none') {
      if (!teamOrders[targetTeamId]) {
        teamOrders[targetTeamId] = [];
      }
      teamOrders[targetTeamId] = teamOrders[targetTeamId].filter(id => id !== playerId);
      teamOrders[targetTeamId].push(playerId);
    }

    active.assignments = assignments;
    active.teamOrders = teamOrders;
    updated[activeSessionIndex] = active;
    setSessions(updated);
  };

  const handleMovePlayerTargeted = (playerId: number, sourceTeamId: string, targetPlayerId: number, targetTeamId: string) => {
    if (sessions.length === 0) return;
    const updated = [...sessions];
    const active = { ...updated[activeSessionIndex] };
    const assignments = { ...active.assignments };
    const teamOrders = active.teamOrders ? { ...active.teamOrders } : {};

    assignments[String(playerId)] = targetTeamId;

    if (sourceTeamId !== 'none' && teamOrders[sourceTeamId]) {
      teamOrders[sourceTeamId] = teamOrders[sourceTeamId].filter(id => id !== playerId);
    }

    if (!teamOrders[targetTeamId]) {
      const assigned = citedPlayers.filter(p => assignments[String(p.player_id)] === targetTeamId && p.player_id !== playerId);
      teamOrders[targetTeamId] = assigned.map(p => p.player_id);
    } else {
      teamOrders[targetTeamId] = teamOrders[targetTeamId].filter(id => id !== playerId);
    }

    const targetIdx = teamOrders[targetTeamId].indexOf(targetPlayerId);
    if (targetIdx !== -1) {
      teamOrders[targetTeamId].splice(targetIdx, 0, playerId);
    } else {
      teamOrders[targetTeamId].push(playerId);
    }

    active.assignments = assignments;
    active.teamOrders = teamOrders;
    updated[activeSessionIndex] = active;
    setSessions(updated);
  };

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 flex flex-col font-sans relative">
      {/* HEADER */}
      <header className="bg-white border-b border-slate-100 px-8 py-5 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-5">
          <button 
            onClick={onBack}
            className="w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full flex items-center justify-center transition-all shadow-inner"
          >
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <div>
            <div className="flex items-center gap-3">
              <span className="bg-red-600 text-white font-black text-[9px] uppercase tracking-wider px-2 py-0.5 rounded">LA ROJA DASHBOARD</span>
              <h1 className="text-xl font-black italic tracking-tight text-[#0b1220]">DISEÑADOR DE DINÁMICAS</h1>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {microcycle.nombre_display} #{microcycle.id} &bull; <span className="font-bold text-slate-700">DÍA {dayNumber}</span> ({dateKey}) &bull; {citedPlayers.length} Citados
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleDuplicateToDay}
            disabled={sessions.length === 0 || duplicating}
            className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2"
          >
            {duplicating ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-clone"></i>}
            Duplicar Sesión
          </button>
          <button 
            onClick={() => setShowPrintPreview(true)}
            disabled={sessions.length === 0}
            className="px-5 py-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2"
          >
            <i className="fa-solid fa-file-pdf"></i>
            Descargar PDF
          </button>
          <button 
            onClick={handleSavePlanning}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg hover:shadow-emerald-200"
          >
            {saving ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-floppy-disk"></i>}
            Guardar Planificación
          </button>
        </div>
      </header>

      {/* HORIZONTAL STEPPER DE ORDEN DE SESIÓN */}
      {sessions.length > 0 && (
        <div className="bg-white border-b border-slate-100 px-8 py-3 flex items-center gap-4 overflow-x-auto custom-scrollbar shadow-xs shrink-0">
          <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">
            <i className="fa-solid fa-route text-red-600"></i>
            <span>Orden de Sesión ({sessions.length}):</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto py-0.5 custom-scrollbar">
            {sessions.map((session, index) => (
              <div 
                key={index}
                onClick={() => setActiveSessionIndex(index)}
                className={`px-4 py-2 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all shrink-0 ${
                  index === activeSessionIndex 
                    ? 'bg-slate-900 border-slate-900 text-white shadow-md' 
                    : 'bg-slate-50 border-slate-100 hover:bg-slate-100 text-slate-800'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                  index === activeSessionIndex ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {session.order}
                </span>
                <div className="min-w-0">
                  <h4 className="text-xs font-black uppercase italic tracking-tight truncate max-w-[150px]">{session.nombre}</h4>
                  <p className={`text-[9px] font-bold mt-0.5 ${index === activeSessionIndex ? 'text-slate-300' : 'text-slate-500'}`}>
                    A: {session.targetA} vs B: {session.targetB} {session.targetComodines > 0 ? `+ ${session.targetComodines}C` : ''}
                  </p>
                </div>

                {/* Quick Controls */}
                <div className="flex items-center gap-1 border-l border-slate-200 pl-2 ml-1">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleMoveUp(index); }}
                    disabled={index === 0}
                    className={`w-4.5 h-4.5 rounded-full text-[9px] flex items-center justify-center transition-all ${
                      index === activeSessionIndex ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200'
                    }`}
                    title="Mover arriba"
                  >
                    <i className="fa-solid fa-chevron-left"></i>
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleMoveDown(index); }}
                    disabled={index === sessions.length - 1}
                    className={`w-4.5 h-4.5 rounded-full text-[9px] flex items-center justify-center transition-all ${
                      index === activeSessionIndex ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200'
                    }`}
                    title="Mover abajo"
                  >
                    <i className="fa-solid fa-chevron-right"></i>
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleRemoveDinamica(index); }}
                    className={`w-4.5 h-4.5 rounded-full text-[9px] flex items-center justify-center transition-all ${
                      index === activeSessionIndex ? 'text-red-400 hover:text-red-200 hover:bg-slate-800' : 'text-red-500 hover:text-red-100'
                    }`}
                    title="Eliminar de sesión"
                  >
                    <i className="fa-solid fa-xmark text-sm"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MAIN WORKSPACE */}
      <div className="flex-1 overflow-hidden">
        {loadingPlanning ? (
          <div className="h-full flex flex-col items-center justify-center p-8">
            <i className="fa-solid fa-circle-notch fa-spin text-red-600 text-3xl mb-3"></i>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Cargando Diseñador...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="h-full flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-100 bg-white">
            {/* Left/Middle: Info & Instructions */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-xl mx-auto space-y-4">
              <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500">
                <i className="fa-solid fa-triangle-exclamation text-2xl"></i>
              </div>
              <div>
                <h3 className="text-lg font-black uppercase italic tracking-tight text-[#0b1220]">Sin Dinámicas Asignadas</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed max-w-md">
                  No hay dinámicas asignadas en la agenda para este día. Selecciona una dinámica del catálogo a la derecha para iniciar la planificación directamente, o regresa y asigna una tarea en el calendario.
                </p>
              </div>
              <button
                onClick={onBack}
                className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer"
              >
                <i className="fa-solid fa-chevron-left"></i>
                <span>Volver al Calendario</span>
              </button>
            </div>

            {/* Right: Inline Catalog Selector to initialize */}
            <div className="w-full md:w-[480px] shrink-0 bg-slate-50/50 flex flex-col overflow-hidden h-full">
              <div className="p-6 border-b border-slate-100 bg-white shrink-0">
                <div className="flex items-center gap-2.5 mb-3">
                  <i className="fa-solid fa-book-open text-[#CF1B2B] text-sm"></i>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Catálogo de Dinámicas</h3>
                </div>
                
                {/* Search & Filters */}
                <div className="space-y-2">
                  <div className="relative">
                    <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                    <input
                      type="text"
                      placeholder="Buscar dinámica..."
                      value={catalogFilter}
                      onChange={(e) => setCatalogFilter(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs font-bold text-slate-700 placeholder-slate-400 outline-none focus:border-red-500/50 transition-all"
                    />
                  </div>
                  
                  {/* Tipo filter badges */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full custom-scrollbar">
                    {['todos', 'cerrada', 'abierta', 'partido'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setCatalogTypeFilter(type)}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                          catalogTypeFilter === type
                            ? 'bg-[#CF1B2B] text-white'
                            : 'bg-white border border-slate-100 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        {type === 'todos' ? 'TODAS' : type === 'cerrada' ? 'CERRADAS' : type === 'abierta' ? 'ABIERTAS' : 'PARTIDOS'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* List of dynamics */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
                {filteredCatalog.length === 0 ? (
                  <div className="py-12 text-center">
                    <i className="fa-solid fa-folder-open text-slate-300 text-xl mb-1.5 block"></i>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">No se encontraron dinámicas</span>
                  </div>
                ) : (
                  filteredCatalog.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleAddDinamica(item)}
                      className="p-3 bg-white rounded-2xl border border-slate-100 hover:border-red-500/40 hover:scale-[1.01] transition-all cursor-pointer shadow-xs hover:shadow-sm flex items-start gap-3"
                    >
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                        {item.link_foto ? (
                          <img
                            src={getDriveDirectLink(item.link_foto)}
                            alt={item.nombre}
                            className="w-full h-full object-cover rounded-xl"
                          />
                        ) : (
                          <i className="fa-solid fa-person-running text-slate-400 text-xs"></i>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded ${
                            item.tipo === 'cerrada' 
                              ? 'bg-red-50 text-red-600 border border-red-100/45' 
                              : item.tipo === 'abierta'
                                ? 'bg-blue-50 text-blue-600 border border-blue-100/45'
                                : 'bg-emerald-50 text-emerald-600 border border-emerald-100/45'
                          }`}>
                            {item.tipo === 'cerrada' ? 'Cerrada' : item.tipo === 'abierta' ? 'Abierta' : 'Partido'}
                          </span>
                        </div>
                        <h4 className="text-[11px] font-black uppercase italic text-slate-800 leading-tight mt-1">{item.nombre}</h4>
                        {item.descripcion && (
                          <p className="text-[9px] text-slate-400 mt-0.5 line-clamp-2 leading-tight">{item.descripcion}</p>
                        )}
                      </div>
                      <button className="w-6 h-6 rounded-full bg-red-50 text-[#CF1B2B] hover:bg-red-100 flex items-center justify-center transition-all shrink-0 cursor-pointer">
                        <i className="fa-solid fa-plus text-[10px]"></i>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto w-full space-y-6 p-8 overflow-y-auto h-[calc(100vh-140px)] custom-scrollbar">
            
            {/* 1. DINÁMICA SELECCIONADA */}
            <div className="bg-white rounded-3xl border border-slate-100 p-4 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {activeCatalogDetail?.link_foto ? (
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex-shrink-0 relative group">
                      <img 
                        src={getDriveDirectLink(activeCatalogDetail.link_foto)} 
                        alt={activeSession.nombre} 
                        className="w-full h-full object-cover rounded-2xl overflow-hidden transition-transform group-hover:scale-110" 
                      />
                      
                      {/* Detailed Hover Popover Box */}
                      <div className="absolute left-16 top-0 z-50 w-[480px] max-w-[calc(100vw-120px)] max-h-[500px] overflow-y-auto bg-white border border-slate-100 rounded-3xl p-5 shadow-2xl pointer-events-none hidden group-hover:block transition-all duration-200 animate-in fade-in zoom-in-95 custom-scrollbar text-left">
                        <div className="space-y-4">
                          {/* Image */}
                          <div className="w-full bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 flex items-center justify-center p-2">
                            <img 
                              src={getDriveDirectLink(activeCatalogDetail.link_foto)} 
                              alt={activeSession.nombre} 
                              className="max-h-64 w-auto object-contain rounded-xl" 
                            />
                          </div>
                          
                          {/* Title & Type */}
                          <div>
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                                activeCatalogDetail.tipo === 'cerrada' 
                                  ? 'bg-red-50 text-red-600 border border-red-200/50' 
                                  : activeCatalogDetail.tipo === 'abierta'
                                    ? 'bg-blue-50 text-blue-600 border border-blue-200/50'
                                    : 'bg-emerald-50 text-emerald-600 border border-emerald-200/50'
                              }`}>
                                {activeCatalogDetail.tipo === 'cerrada' ? 'CERRADA' : activeCatalogDetail.tipo === 'abierta' ? 'ABIERTA' : 'PARTIDO'}
                              </span>
                              <span className="text-[8px] font-bold text-slate-400">ID: #{activeCatalogDetail.id}</span>
                            </div>
                            <h3 className="text-xs sm:text-sm font-black uppercase text-slate-800 leading-tight tracking-tight">{activeCatalogDetail.nombre}</h3>
                          </div>

                          {/* Description */}
                          {activeCatalogDetail.descripcion && (
                            <div className="border-t border-slate-100/60 pt-2">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Descripción</span>
                              <p className="text-[9px] text-slate-600 font-bold leading-relaxed">{activeCatalogDetail.descripcion}</p>
                            </div>
                          )}

                          {/* Contenidos Ofensivos / Defensivos */}
                          {(() => {
                            const of = parseFieldToArray(activeCatalogDetail.contenidos_ofensivos);
                            const df = parseFieldToArray(activeCatalogDetail.contenidos_defensivos);
                            if (of.length === 0 && df.length === 0) return null;
                            return (
                              <div className="border-t border-slate-100/60 pt-2 space-y-2">
                                {of.length > 0 && (
                                  <div>
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Contenidos Ofensivos</span>
                                    <div className="flex flex-wrap gap-1">
                                      {of.map((item, idx) => (
                                        <span key={`of_${idx}`} className="bg-red-50/50 text-[#CF1B2B] text-[8px] font-bold px-2 py-0.5 rounded border border-red-100/30">{item}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {df.length > 0 && (
                                  <div>
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Contenidos Defensivos</span>
                                    <div className="flex flex-wrap gap-1">
                                      {df.map((item, idx) => (
                                        <span key={`df_${idx}`} className="bg-blue-50/50 text-blue-600 text-[8px] font-bold px-2 py-0.5 rounded border border-blue-100/30">{item}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {/* Consignas */}
                          {(() => {
                            const cons = parseFieldToArray(activeCatalogDetail.consignas);
                            if (cons.length === 0) return null;
                            return (
                              <div className="border-t border-slate-100/60 pt-2">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Consignas</span>
                                <ul className="space-y-1">
                                  {cons.map((item, idx) => (
                                    <li key={`cons_${idx}`} className="text-[8.5px] text-slate-600 font-bold flex items-start gap-1.5 leading-tight">
                                      <span className="w-1 h-1 rounded-full bg-red-500 mt-1.5 shrink-0" />
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            );
                          })()}

                          {/* Reglas */}
                          {(() => {
                            const regl = parseFieldToArray(activeCatalogDetail.reglas);
                            if (regl.length === 0) return null;
                            return (
                              <div className="border-t border-slate-100/60 pt-2">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Reglas</span>
                                <ul className="space-y-1">
                                  {regl.map((item, idx) => (
                                    <li key={`regl_${idx}`} className="text-[8.5px] text-slate-600 font-bold flex items-start gap-1.5 leading-tight">
                                      <span className="w-1.5 h-1.5 border border-slate-400 rounded-sm mt-1 shrink-0" />
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            );
                          })()}

                          {/* Variantes */}
                          {(() => {
                            const vars = parseFieldToArray(activeCatalogDetail.variantes);
                            if (vars.length === 0) return null;
                            return (
                              <div className="border-t border-slate-100/60 pt-2">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Variantes</span>
                                <ul className="space-y-1">
                                  {vars.map((item, idx) => (
                                    <li key={`vars_${idx}`} className="text-[8.5px] text-slate-600 font-bold flex items-start gap-1.5 leading-tight">
                                      <span className="text-slate-400 mt-0.5 shrink-0">→</span>
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 text-slate-400">
                      <i className="fa-solid fa-image text-lg"></i>
                    </div>
                  )}
                  <div>
                    <span className="bg-slate-100 text-slate-700 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded">DINÁMICA SELECCIONADA</span>
                    <h2 className="text-lg font-black italic tracking-tighter uppercase text-[#0b1220] mt-0.5">{activeSession.nombre}</h2>
                    <button 
                      onClick={() => {
                        localStorage.setItem('selected_drill_name', activeSession.nombre);
                        window.dispatchEvent(new CustomEvent('selected_drill_changed', { detail: { name: activeSession.nombre } }));
                        window.dispatchEvent(new CustomEvent('navigate-to-menu', { detail: { menuId: 'dinamicas' } }));
                      }}
                      className="text-[9px] font-black uppercase text-red-600 hover:text-red-700 hover:underline mt-1.5 flex items-center gap-1.5 transition-all tracking-wider"
                    >
                      <span>Ver Ficha en Catálogo</span>
                      <i className="fa-solid fa-person-running"></i>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => { setNewTeamName(''); setShowAddTeamModal(true); }}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm"
                  >
                    <i className="fa-solid fa-plus-circle"></i>
                    Sumar Equipo
                  </button>
                  <button 
                    onClick={handleAutoAssign}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-blue-600 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2"
                  >
                    <i className="fa-solid fa-magic"></i>
                    Asignación Auto
                  </button>
                  <button 
                    onClick={handleClearAssignments}
                    className="px-4 py-2 rounded-xl bg-slate-50 hover:bg-red-50 hover:text-red-600 text-slate-500 border border-slate-100 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2"
                  >
                    <i className="fa-solid fa-eraser"></i>
                    Limpiar Todo
                  </button>
                </div>
              </div>
            </div>

            {/* 2. CITADOS POR POSICIÓN */}
            <div 
              onDragOver={handleDragOver}
              onDrop={handleDropOnUnassigned}
              className={`bg-white rounded-3xl border p-6 shadow-sm flex flex-col transition-all duration-300 ${
                activeSlotSelection 
                  ? 'ring-2 ring-red-500/20 border-red-200 bg-red-50/5' 
                  : 'border-slate-100 hover:border-slate-200'
              }`}
            >
              <h3 className="text-[11px] font-black uppercase tracking-wider text-[#0b1220] border-b border-slate-100 pb-2.5 flex items-center justify-between mb-3 shrink-0">
                <span>{activeSlotSelection ? 'SELECCIONA EL JUGADOR' : 'CITADOS POR POSICIÓN'}</span>
                {activeSlotSelection ? (
                  <button 
                    onClick={() => setActiveSlotSelection(null)}
                    className="bg-red-600 text-white hover:bg-red-700 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider flex items-center gap-1 transition-all"
                  >
                    <span>Cancelar</span>
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                ) : (
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[9px] font-black">
                    {citedPlayers.filter(p => !activeSession?.assignments[String(p.player_id)] || activeSession.assignments[String(p.player_id)] === 'none').length} Libres
                  </span>
                )}
              </h3>

              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {Object.entries(groupedCitedPlayers).map(([groupName, players]) => {
                  if (players.length === 0) return null;
                  return (
                    <div key={groupName} className="space-y-2">
                      <h4 className="text-[9px] font-black uppercase tracking-wider text-slate-400 bg-slate-50 px-2.5 py-1.5 rounded-lg flex items-center justify-between">
                        <span>{groupName}</span>
                        <span>{players.length}</span>
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        {players.map((player, pIdx) => {
                          const currentRole = activeSession.assignments[String(player.player_id)] || 'none';
                          const isAssigned = currentRole !== 'none';
                          const activeTeam = getSessionTeams(activeSession).find(t => t.id === currentRole);
                          const teamColors = activeTeam ? getTeamColors(activeTeam.color) : null;
                          const posColors = getPositionColors(player.posicion);

                          return (
                            <div 
                              key={`cited_${player.player_id}_${pIdx}`}
                              draggable={!isAssigned}
                              onDragStart={(e) => handleDragStart(e, player, 'none')}
                              onClick={() => {
                                if (activeSlotSelection) {
                                  handleAssignPlayer(player.player_id, activeSlotSelection.teamId);
                                  setActiveSlotSelection(null);
                                } else {
                                  setSelectedPlayerForStatus(player);
                                }
                              }}
                              className={`p-2 rounded-xl flex items-center justify-between transition-all border ${
                                isAssigned ? '' : 'cursor-grab active:cursor-grabbing'
                              } ${
                                activeSlotSelection 
                                  ? 'cursor-pointer border-red-300 bg-red-50/10 hover:border-red-500 hover:bg-red-50/30 hover:scale-[1.02]' 
                                  : isAssigned 
                                    ? 'bg-slate-50/50 border-slate-100 opacity-60 cursor-pointer hover:opacity-100 hover:border-slate-300' 
                                    : `${posColors.bg} ${posColors.border} hover:scale-[1.01] hover:shadow-xs`
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center relative flex-shrink-0">
                                  {player.foto_url ? (
                                    <img src={player.foto_url} alt={player.nombre} className="w-full h-full object-cover" />
                                  ) : (
                                    <i className="fa-solid fa-user text-slate-400 text-[8px]"></i>
                                  )}
                                  <div className="absolute -bottom-1 -right-1">
                                    <ClubBadge idClub={player.id_club} showName={false} logoSize="w-3.5 h-3.5" />
                                  </div>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[9px] font-black uppercase tracking-tight text-[#0b1220] truncate">
                                    {getFormattedName(player.nombre, player.apellido1)}
                                  </p>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <span className={`w-1 h-1 rounded-full ${posColors.dot}`}></span>
                                    <span className={`text-[7px] font-bold uppercase truncate ${posColors.text}`}>
                                      {player.posicion || 'Campo'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                {isAssigned ? (
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleAssignPlayer(player.player_id, 'none'); }}
                                    title="Remover"
                                    className={`px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-wider flex items-center gap-1 transition-all ${teamColors?.badge} hover:bg-red-600 hover:text-white`}
                                  >
                                    <span>{activeTeam?.nombre.split(' ')[1] || activeTeam?.nombre}</span>
                                    <i className="fa-solid fa-xmark text-[7px]"></i>
                                  </button>
                                ) : (
                                  activeSlotSelection ? (
                                    <span className="text-[7px] font-black uppercase tracking-wider text-red-600 bg-red-100 px-1.5 py-0.5 rounded-md animate-pulse">
                                      Asignar
                                    </span>
                                  ) : (
                                    <span className="text-[7px] font-black uppercase tracking-wider text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-md border border-dashed border-slate-200">
                                      Libre
                                    </span>
                                  )
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 2.5 NO PARTICIPAN (Lesionados / Control de carga) */}
              {(() => {
                const nonParticipants = citedPlayers.filter(
                  p => activeSession?.assignments[String(p.player_id)] === 'lesionado' || 
                       activeSession?.assignments[String(p.player_id)] === 'carga'
                );
                if (nonParticipants.length === 0) return null;
                return (
                  <div className="mt-4 border-t border-dashed border-slate-100 pt-4 space-y-2 shrink-0">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-red-600">
                        <i className="fa-solid fa-triangle-exclamation"></i>
                        <span>No Participan de esta Tarea (Lesión / Control Carga)</span>
                      </span>
                      <span className="bg-white/80 text-slate-600 px-2 py-0.5 rounded-full text-[9px] font-black border border-slate-100">
                        {nonParticipants.length}
                      </span>
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {nonParticipants.map((player, pIdx) => {
                        const currentRole = activeSession.assignments[String(player.player_id)];
                        const isLesion = currentRole === 'lesionado';
                        return (
                          <div 
                            key={`non_part_${player.player_id}_${pIdx}`}
                            onClick={() => setSelectedPlayerForStatus(player)}
                            className={`p-2 rounded-xl flex items-center justify-between transition-all border cursor-pointer hover:scale-[1.01] hover:shadow-xs ${
                              isLesion 
                                ? 'bg-red-50/10 border-red-100 hover:bg-red-50/20' 
                                : 'bg-amber-50/10 border-amber-100 hover:bg-amber-50/20'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center relative flex-shrink-0">
                                {player.foto_url ? (
                                  <img src={player.foto_url} alt={player.nombre} className="w-full h-full object-cover" />
                                ) : (
                                  <i className="fa-solid fa-user text-slate-400 text-[10px]"></i>
                                )}
                                <div className="absolute -bottom-1 -right-1">
                                  <ClubBadge idClub={player.id_club} showName={false} logoSize="w-4 h-4" />
                                </div>
                              </div>
                              <div className="min-w-0">
                                <p className="text-[9px] font-black uppercase tracking-tight text-[#0b1220] truncate">
                                  {player.nombre} {player.apellido1}
                                </p>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <span className={`w-1 h-1 rounded-full ${isLesion ? 'bg-red-500' : 'bg-amber-500'}`}></span>
                                  <span className={`text-[7px] font-bold uppercase truncate ${isLesion ? 'text-red-500' : 'text-amber-500'}`}>
                                    {isLesion ? 'Lesionado' : 'Ctrl Carga'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${isLesion ? 'bg-red-100/55 text-red-700' : 'bg-amber-100/55 text-amber-700'}`}>
                              {isLesion ? 'LES' : 'CC'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* 3. ROSTERS OF TEAMS (Equipo A, Equipo B, Equipos, Comodin) */}
            <div className="space-y-4">
              {(() => {
                const activeTeams = getSessionTeams(activeSession);
                const orderedActiveTeams = [
                  ...activeTeams.filter(t => t.id === 'A'),
                  ...activeTeams.filter(t => t.id === 'B'),
                  ...activeTeams.filter(t => t.id !== 'A' && t.id !== 'B' && t.id !== 'C'),
                  ...activeTeams.filter(t => t.id === 'C'),
                ];

                return orderedActiveTeams.map(team => {
                  const colors = getTeamColors(team.color);
                  const slots = getTeamSlots(team.id, team.target, activeSession);

                  return (
                    <div 
                      key={team.id} 
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDropOnTeam(e, team.id)}
                      className={`bg-white rounded-3xl border ${colors.border} p-5 shadow-sm flex flex-col md:flex-row md:items-center gap-5 transition-all duration-200`}
                    >
                      {/* Left: Team Config */}
                      <div className="w-full md:w-56 shrink-0 md:border-r md:border-dashed md:border-slate-200 md:pr-5 flex items-center md:items-start justify-between md:flex-col md:gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-3.5 h-3.5 rounded-full ${team.color === 'red' ? 'bg-[#CF1B2B]' : team.color === 'blue' ? 'bg-blue-600' : team.color === 'amber' ? 'bg-amber-500' : team.color === 'emerald' ? 'bg-emerald-500' : 'bg-purple-500'}`}></span>
                          <h4 className="text-xs font-black uppercase italic tracking-tight text-slate-800">{team.nombre}</h4>
                        </div>

                        {/* Slot Adjuster */}
                        <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Slots:</span>
                          <span className="text-xs font-black text-slate-700">{team.target}</span>
                          <div className="flex items-center gap-1 ml-1">
                            <button 
                              onClick={() => handleUpdateTeamTarget(team.id, -1)}
                              className="w-4 h-4 rounded bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-[8px]"
                            >
                              <i className="fa-solid fa-minus"></i>
                            </button>
                            <button 
                              onClick={() => handleUpdateTeamTarget(team.id, 1)}
                              className="w-4 h-4 rounded bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-[8px]"
                            >
                              <i className="fa-solid fa-plus"></i>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Right: Slots Grid */}
                      <div className="flex-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
                          {slots.map((slot, sIdx) => {
                            if (slot.type === 'player' && slot.player) {
                              const player = slot.player;
                              const posColors = getPositionColors(player.posicion);
                              return (
                                <div 
                                  key={`filled_${player.player_id}_${sIdx}`}
                                  draggable={true}
                                  onDragStart={(e) => handleDragStart(e, player, team.id)}
                                  onDragOver={handleDragOver}
                                  onDrop={(e) => handleDropOnPlayer(e, player, team.id)}
                                  onClick={() => setSelectedPlayerForStatus(player)}
                                  className={`p-2 rounded-xl flex items-center justify-between border ${posColors.border} ${posColors.bg} transition-all shadow-xs cursor-grab active:cursor-grabbing hover:scale-[1.01] hover:shadow-sm`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center relative flex-shrink-0">
                                      {player.foto_url ? (
                                        <img src={player.foto_url} alt={player.nombre} className="w-full h-full object-cover" />
                                      ) : (
                                        <i className="fa-solid fa-user text-slate-400 text-[8px]"></i>
                                      )}
                                      <div className="absolute -bottom-1 -right-1">
                                        <ClubBadge idClub={player.id_club} showName={false} logoSize="w-3.5 h-3.5" />
                                      </div>
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-[9px] font-black uppercase tracking-tight text-[#0b1220] truncate">
                                        {getFormattedName(player.nombre, player.apellido1)}
                                      </p>
                                      <div className="flex items-center gap-1 mt-0.5">
                                        <span className={`w-1.5 h-1.5 rounded-full ${posColors.dot}`}></span>
                                        <span className={`text-[7px] font-bold uppercase truncate ${posColors.text}`}>
                                          {player.posicion || 'Campo'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAssignPlayer(player.player_id, 'none');
                                    }}
                                    className="w-6 h-6 rounded-full hover:bg-red-50 text-slate-300 hover:text-red-500 flex items-center justify-center transition-all border border-transparent hover:border-red-100 cursor-pointer"
                                    title="Quitar jugador"
                                  >
                                    <i className="fa-solid fa-trash-can text-[10px]"></i>
                                  </button>
                                </div>
                              );
                            } else {
                              const isThisSlotSelected = activeSlotSelection && activeSlotSelection.teamId === team.id && activeSlotSelection.slotIndex === sIdx;
                              return (
                                <button
                                  key={`empty_${team.id}_${sIdx}`}
                                  onDragOver={handleDragOver}
                                  onDrop={(e) => handleDropOnTeam(e, team.id)}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isThisSlotSelected) {
                                      setActiveSlotSelection(null);
                                    } else {
                                      setActiveSlotSelection({ teamId: team.id, slotIndex: sIdx });
                                    }
                                  }}
                                  className={`w-full p-2 rounded-xl border border-dashed hover:scale-[1.01] transition-all text-left flex items-center justify-center gap-1.5 cursor-pointer ${
                                    isThisSlotSelected 
                                      ? 'border-red-500 bg-red-50/20 text-red-600 shadow-inner animate-pulse' 
                                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/20 hover:bg-slate-50 text-slate-400 hover:text-slate-600'
                                  }`}
                                >
                                  {isThisSlotSelected ? (
                                    <>
                                      <i className="fa-solid fa-spinner animate-spin text-red-500 text-[9px]"></i>
                                      <span className="text-[8px] font-black uppercase tracking-widest text-red-600">Selecciona arriba...</span>
                                    </>
                                  ) : (
                                    <>
                                      <i className="fa-solid fa-circle-plus text-slate-300 text-[10px]"></i>
                                      <span className="text-[8px] font-black uppercase tracking-widest">Presiona para asignar</span>
                                    </>
                                  )}
                                </button>
                              );
                            }
                          })}
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* OBSERVACIONES DE SESIÓN */}
            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-3">
              <label className="text-[9px] font-black uppercase tracking-widest text-[#0b1220]">OBSERVACIONES METODOLÓGICAS</label>
              <textarea 
                placeholder="Consignas, variantes u observaciones para esta tarea..."
                value={activeSession.observaciones}
                onChange={(e) => handleUpdateObservaciones(e.target.value)}
                className="w-full h-20 bg-white border border-slate-100 rounded-xl p-3 text-[10px] font-bold outline-none placeholder-slate-400 resize-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* SLOT ASSIGNMENT OVERLAY MODAL REMOVED - Inline assign used instead */}

      {/* ADD CUSTOM TEAM MODAL */}
      {showAddTeamModal && (
        <div className="fixed inset-0 bg-[#0b1220]/80 z-[100] flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden flex flex-col border border-slate-100">
            {/* Header */}
            <div className="bg-[#0b1220] p-6 text-white flex items-center justify-between">
              <div>
                <span className="text-[8px] font-black text-red-500 uppercase tracking-wider block">PLANILLA TÁCTICA</span>
                <h3 className="text-base font-black uppercase tracking-tight italic mt-0.5">Sumar Nuevo Equipo</h3>
              </div>
              <button 
                onClick={() => setShowAddTeamModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Input body */}
            <form onSubmit={(e) => { e.preventDefault(); handleAddTeamSubmit(newTeamName); }} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Nombre del Equipo</label>
                <input 
                  type="text"
                  placeholder="Ej: Equipo C, Grupo de Apoyo..."
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none placeholder-slate-400 focus:bg-white focus:border-slate-300 transition-all"
                  autoFocus
                  required
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTeamModal(false)}
                  className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!newTeamName.trim()}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GESTIÓN DE PARTICIPACIÓN / ESTADO JUGADOR MODAL */}
      {selectedPlayerForStatus && (
        <div className="fixed inset-0 bg-[#0b1220]/80 z-[100] flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden flex flex-col border border-slate-100 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-[#0b1220] p-6 text-white flex items-center justify-between">
              <div>
                <span className="text-[8px] font-black text-red-500 uppercase tracking-wider block">GESTIÓN DE PARTICIPACIÓN</span>
                <h3 className="text-base font-black uppercase tracking-tight italic mt-0.5">Estado de Jugador</h3>
              </div>
              <button 
                onClick={() => setSelectedPlayerForStatus(null)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center relative flex-shrink-0">
                  {selectedPlayerForStatus.foto_url ? (
                    <img src={selectedPlayerForStatus.foto_url} alt={selectedPlayerForStatus.nombre} className="w-full h-full object-cover" />
                  ) : (
                    <i className="fa-solid fa-user text-slate-400 text-xl"></i>
                  )}
                  <div className="absolute -bottom-1 -right-1">
                    <ClubBadge idClub={selectedPlayerForStatus.id_club} showName={false} logoSize="w-5 h-5" />
                  </div>
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-black uppercase tracking-tight text-[#0b1220]">
                    {selectedPlayerForStatus.nombre} {selectedPlayerForStatus.apellido1}
                  </h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    {selectedPlayerForStatus.posicion || 'Jugador de Campo'}
                  </p>
                  
                  {/* Status Badge */}
                  <div className="mt-2">
                    {(() => {
                      const currentRole = activeSession?.assignments[String(selectedPlayerForStatus.player_id)] || 'none';
                      if (currentRole === 'none') {
                        return <span className="text-[8px] font-black uppercase px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200/50">Participa: Libre</span>;
                      }
                      if (currentRole === 'lesionado') {
                        return <span className="text-[8px] font-black uppercase px-2.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-200/50">No Participa: Lesionado ⚠️</span>;
                      }
                      if (currentRole === 'carga') {
                        return <span className="text-[8px] font-black uppercase px-2.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200/50">No Participa: Control Carga ⚡</span>;
                      }
                      const activeTeams = getSessionTeams(activeSession);
                      const activeTeam = activeTeams.find(t => t.id === currentRole);
                      return <span className="text-[8px] font-black uppercase px-2.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200/50">Asignado: {activeTeam?.nombre || currentRole}</span>;
                    })()}
                  </div>
                </div>
              </div>

              {/* Options */}
              <div className="space-y-3">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Definir Disponibilidad para Tarea</span>
                
                {/* 1. PARTICIPAR */}
                <button
                  type="button"
                  onClick={() => {
                    handleAssignPlayer(selectedPlayerForStatus.player_id, 'none');
                    setSelectedPlayerForStatus(null);
                  }}
                  className="w-full flex items-center justify-between p-4 rounded-2xl border border-emerald-200 bg-emerald-50/10 hover:bg-emerald-50/25 transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                      <i className="fa-solid fa-circle-check text-sm"></i>
                    </div>
                    <div>
                      <span className="text-xs font-black text-emerald-800 uppercase block">🟢 Participa (Activo / Libre)</span>
                      <span className="text-[9.5px] font-semibold text-slate-400 block leading-tight">Estará disponible para asignación y rotaciones tácticas.</span>
                    </div>
                  </div>
                  <i className="fa-solid fa-chevron-right text-slate-400 text-xs"></i>
                </button>

                {/* 2. LESIONADO */}
                <button
                  type="button"
                  onClick={() => {
                    handleAssignPlayer(selectedPlayerForStatus.player_id, 'lesionado');
                    setSelectedPlayerForStatus(null);
                  }}
                  className="w-full flex items-center justify-between p-4 rounded-2xl border border-red-200 bg-red-50/10 hover:bg-red-50/25 transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0">
                      <i className="fa-solid fa-user-injured text-sm"></i>
                    </div>
                    <div>
                      <span className="text-xs font-black text-red-800 uppercase block">🔴 No Participa: Lesionado</span>
                      <span className="text-[9.5px] font-semibold text-slate-400 block leading-tight">Excluido de la tarea actual por recomendación médica.</span>
                    </div>
                  </div>
                  <i className="fa-solid fa-chevron-right text-slate-400 text-xs"></i>
                </button>

                {/* 3. CONTROL DE CARGA */}
                <button
                  type="button"
                  onClick={() => {
                    handleAssignPlayer(selectedPlayerForStatus.player_id, 'carga');
                    setSelectedPlayerForStatus(null);
                  }}
                  className="w-full flex items-center justify-between p-4 rounded-2xl border border-amber-200 bg-amber-50/10 hover:bg-amber-50/25 transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                      <i className="fa-solid fa-battery-half text-sm"></i>
                    </div>
                    <div>
                      <span className="text-xs font-black text-amber-800 uppercase block">🟡 No Participa: Control de Cargas</span>
                      <span className="text-[9.5px] font-semibold text-slate-400 block leading-tight">Excluido de la tarea actual para dosificación física.</span>
                    </div>
                  </div>
                  <i className="fa-solid fa-chevron-right text-slate-400 text-xs"></i>
                </button>
              </div>

              {/* Action cancel */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedPlayerForStatus(null)}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
                >
                  Volver / Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRINT PREVIEW / PDF GENERATION MODAL */}
      {showPrintPreview && (
        <div className="fixed inset-0 bg-[#0b1220]/95 z-[100] flex items-center justify-center p-6 overflow-y-auto">
          <div className="bg-slate-900 rounded-[32px] w-full max-w-7xl shadow-2xl overflow-hidden flex flex-col h-[90vh] border border-slate-800">
            {/* Header Controls */}
            <div className="bg-[#0b1220] p-6 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <i className="fa-solid fa-file-pdf text-xl text-red-500 animate-pulse"></i>
                <div>
                  <h3 className="text-base font-black uppercase tracking-tight italic">Exportar Planificación PDF</h3>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 block">Documento de Campo Horizontal: {sessions.length} página{sessions.length > 1 ? 's' : ''} (1 Dinámica por página)</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleDownloadPDF}
                  disabled={downloadingPDF || downloadingJPG}
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-red-900/30"
                >
                  {downloadingPDF ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin text-white"></i> Compilando PDF...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-file-pdf"></i> Descargar PDF
                    </>
                  )}
                </button>
                <button 
                  onClick={handleDownloadJPG}
                  disabled={downloadingPDF || downloadingJPG}
                  className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-sky-950/30"
                >
                  {downloadingJPG ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin text-white"></i> Creando JPG...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-image"></i> Descargar JPG
                    </>
                  )}
                </button>
                <button 
                  onClick={() => setShowPrintPreview(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
                >
                  Cerrar
                </button>
              </div>
            </div>

            {/* Printable Area - Render a preview of each page (1 task per page, landscape) */}
            <div className="flex-1 overflow-y-auto bg-slate-950 p-12 space-y-12 flex flex-col items-center custom-scrollbar">
              {(() => {
                const chunks = [];
                for (let i = 0; i < sessions.length; i += 1) {
                  chunks.push(sessions.slice(i, i + 1));
                }
                return chunks.map((chunk, pageIndex) => {
                  return (
                    <div 
                      key={pageIndex} 
                      className="session-pdf-page bg-white text-slate-900 p-8 shadow-2xl rounded-[24px] space-y-4 w-[1123px] h-[794px] min-h-[794px] max-h-[794px] relative flex flex-col justify-between border border-slate-100 transform hover:scale-[1.01] transition-all overflow-hidden"
                      style={{ pageBreakAfter: 'always' }}
                    >
                      {/* Page Header */}
                      <div className="flex items-center justify-between border-b-2 border-red-600 pb-3 shrink-0">
                        <div className="flex items-center gap-4">
                          <img src={getDriveDirectLink(FEDERATION_LOGO)} className="w-10 h-10 object-contain" alt="Federación Logo" />
                          <div>
                            <h2 className="text-sm font-black italic tracking-tight text-[#0b1220] uppercase">PLANIFICACIÓN TÁCTICA</h2>
                            <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">LA ROJA PERFORMANCE &bull; SELECCIÓN CHILENA</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <h3 className="text-xs font-black text-red-600 uppercase tracking-wider">{microcycle.nombre_display}</h3>
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-0.5">FECHA: {dateKey} &bull; PÁGINA {pageIndex + 1} DE {chunks.length}</p>
                        </div>
                      </div>

                      {/* Tasks Container */}
                      <div className="flex-1 flex flex-col justify-start py-1 gap-4 overflow-hidden">
                        {chunk.map((session, sIdx) => {
                          const sDetail = catalog.find(c => c.id === session.dinamicaId);
                          return (
                            <div key={`${session.dinamicaId}_${sIdx}`} className="space-y-4">
                              {/* Session Title Bar */}
                              <div className="flex items-center justify-between bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-2xl shrink-0">
                                <div className="flex items-center gap-3">
                                  <span className="w-7 h-7 rounded-full bg-red-600 text-white font-black text-xs flex items-center justify-center">{session.order}</span>
                                  <h3 className="text-xs font-black uppercase italic tracking-tight text-[#0b1220]">{session.nombre}</h3>
                                </div>
                                <span className="bg-red-50 text-red-600 text-[8px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border border-red-100">
                                  TIPO: {sDetail?.tipo.toUpperCase() || 'CERRADA'}
                                </span>
                              </div>

                              {/* Trainer Notes */}
                              {session.observaciones && (
                                <div className="bg-red-50/10 rounded-xl p-3 border border-red-50/20 shrink-0">
                                  <h4 className="text-[8px] font-black uppercase tracking-widest text-red-600 mb-0.5">Consignas del Entrenador</h4>
                                  <p className="text-[10px] text-slate-700 font-bold leading-normal italic">
                                    &ldquo;{session.observaciones}&rdquo;
                                  </p>
                                </div>
                              )}

                              {/* Teams/Rosters */}
                              <div className="space-y-2 shrink-0">
                                <h4 className="text-[8px] font-black uppercase tracking-widest text-red-600 border-b border-slate-100 pb-1">Distribución de Equipos y Roles</h4>
                                <div className="space-y-2">
                                  {(() => {
                                    const allTeams = getSessionTeams(session);
                                    const orderedTeams = [
                                      ...allTeams.filter(t => t.id === 'A'),
                                      ...allTeams.filter(t => t.id === 'B'),
                                      ...allTeams.filter(t => t.id !== 'A' && t.id !== 'B' && t.id !== 'C'),
                                      ...allTeams.filter(t => t.id === 'C')
                                    ];

                                    const unassignedPlayers = citedPlayers.filter(p => {
                                      const role = session.assignments[String(p.player_id)];
                                      return !role || role === 'none' || role === 'lesionado' || role === 'carga' || !orderedTeams.some(t => t.id === role);
                                    });
                                    if (unassignedPlayers.length > 0) {
                                      orderedTeams.push({
                                        id: 'UNASSIGNED',
                                        nombre: 'SIN EQUIPO',
                                        color: 'slate',
                                        target: unassignedPlayers.length
                                      });
                                    }

                                    const filteredTeams = orderedTeams.filter(team => {
                                      if (team.id === 'C') {
                                        const playersInC = citedPlayers.filter(p => session.assignments[String(p.player_id)] === 'C');
                                        return team.target > 0 || playersInC.length > 0;
                                      }
                                      return true;
                                    });

                                    return filteredTeams.map(team => {
                                      const teamColors = getTeamColors(team.color);
                                      const playersInTeam = team.id === 'UNASSIGNED'
                                        ? unassignedPlayers
                                        : citedPlayers.filter(p => session.assignments[String(p.player_id)] === team.id);
                                      
                                      return (
                                        <div key={team.id} className={`${teamColors.bg} border ${teamColors.border} rounded-xl p-2 flex items-center gap-4`}>
                                          {/* Team Identity Column (Full width left side) */}
                                          <div className="w-28 shrink-0 border-r border-slate-200/40 pr-2">
                                            <h5 className={`text-[9px] font-black ${teamColors.accent} uppercase tracking-wider flex flex-col`}>
                                              <span>{team.nombre}</span>
                                              <span className="text-[7.5px] font-bold text-slate-400 normal-case mt-0.5">
                                                {team.id === 'UNASSIGNED' ? `(${playersInTeam.length})` : `(${playersInTeam.length} / ${team.target})`}
                                              </span>
                                            </h5>
                                          </div>
                                          
                                          {/* Players Grid Column */}
                                          <div className="flex-1">
                                            <div className="grid grid-cols-6 gap-2">
                                              {playersInTeam.map((p, pIdx) => {
                                                const posColors = getPositionColors(p.posicion);
                                                return (
                                                  <div 
                                                    key={`print_${p.player_id}_${pIdx}`} 
                                                    className={`h-8 px-1.5 rounded-lg text-[8px] font-black uppercase tracking-wide border text-center block truncate ${posColors.bg} ${posColors.border} ${posColors.text}`}
                                                    style={{ lineHeight: '30px' }}
                                                  >
                                                    {p.nombre} {p.apellido1}
                                                  </div>
                                                );
                                              })}
                                              {playersInTeam.length === 0 && (
                                                <div className="text-[8px] text-slate-400 font-normal italic py-1 col-span-6">Sin jugadores asignados</div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    });
                                  })()}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Page Footer */}
                      <div className="border-t border-slate-100 pt-3 flex items-center justify-between shrink-0 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                        <span>ELITE FOOTBALL PERFORMANCE PRO &bull; SELECCIÓN CHILENA</span>
                        <span>PÁGINA {pageIndex + 1} DE {chunks.length}</span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
