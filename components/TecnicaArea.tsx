
import React, { useState, useMemo, useEffect } from 'react';
import { MOCK_PLAYERS } from '../mockData';
import { ItineraryActivity, Category, MicrocicloDB, CATEGORY_ID_MAP, AthletePerformanceRecord } from '../types';
import { supabase } from '../lib/supabase';
import { logActivity } from '../lib/activityLogger';
import { getDriveDirectLink } from '../lib/utils';
import { FEDERATION_LOGO } from '../constants';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import MatchesArea from './MatchesArea';

type ViewMode = 'selection' | 'management';
type SubTab = 'tareas' | 'evaluacion' | 'competencia' | 'partidos';

interface Tarea {
  id: string;
  nombre: string;
  tipoDinamica: string;
  descripcion?: string;
  jornada?: 'AM' | 'PM';
}

interface MicrocicloUI extends MicrocicloDB {
  id: number;
  nombre_display: string;
}

interface TecnicaAreaProps {
  performanceRecords?: AthletePerformanceRecord[];
  onMenuChange?: (id: any) => void;
  initialTab?: SubTab;
}

const DINAMICAS_OFICIALES = [
  'Cuadrados',
  'Dinámicas Cerradas',
  'Dinámicas Abiertas',
  'Dinámicas de Partido',
  'General'
];

const LOCATIONS = [
  'JUAN PINTO DURAN',
  'FERNANDO RIERA',
  'CAR JOSE SULANTAY',
  'OTRO'
];

const PREDEFINED_ACTIVITIES = [
  { label: 'Desayuno', emoji: '☕' },
  { label: 'Almuerzo', emoji: '🍽️' },
  { label: 'Merienda', emoji: '🥐' },
  { label: 'Snack', emoji: '🥨' },
  { label: 'Cena', emoji: '🌙' },
  { label: 'Activación AM', emoji: '🏃‍♂️' },
  { label: 'Activación PM', emoji: '🧘‍♂️' },
  { label: 'Entrenamiento', emoji: '⚽' },
  { label: 'Gym', emoji: '🏋️‍♂️' },
  { label: 'Análisis de Rival', emoji: '📊' },
  { label: 'Análisis Propio', emoji: '📉' },
  { label: 'Análisis de video', emoji: '📹' },
  { label: 'Charla Técnica', emoji: '📋' },
  { label: 'Charla Portero', emoji: '🧤' },
  { label: 'Charla Nutricional', emoji: '🍎' },
  { label: 'Charla Psicológica', emoji: '🧠' },
  { label: 'Evaluaciones Físicas', emoji: '📏' },
  { label: 'Evaluación Nutricional', emoji: '⚖️' },
  { label: 'Actividad Social', emoji: '🤝' },
  { label: 'Salida', emoji: '🛫' },
  { label: 'Retorno', emoji: '🛬' },
  { label: 'Partido Amistoso', emoji: '🏟️' },
  { label: 'Partido Oficial', emoji: '🏆' },
  { label: 'Citación', emoji: '📢' },
  { label: 'Liberación jug.', emoji: '🏠' },
  { label: 'Descanso', emoji: '🛌' },
  { label: 'OTRA', emoji: '📝' },
];

const TecnicaArea: React.FC<TecnicaAreaProps> = ({ performanceRecords, onMenuChange, initialTab }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('selection');
  const [activeTab, setActiveTab] = useState<SubTab>(initialTab || 'partidos');
  const [selectedMicro, setSelectedMicro] = useState<MicrocicloUI | null>(null);
  const [selectedJornada, setSelectedJornada] = useState<'AM' | 'PM'>('AM');
  const [microciclos, setMicrociclos] = useState<MicrocicloUI[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingActivity, setSavingActivity] = useState(false);
  const [savingDayTasks, setSavingDayTasks] = useState<Record<string, boolean>>({});
  const [loadingBiblioteca, setLoadingBiblioteca] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['TODOS LOS PROCESOS']);

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => {
      if (cat === 'TODOS LOS PROCESOS') return ['TODOS LOS PROCESOS'];
      const newSelection = prev.includes(cat)
        ? prev.filter(c => c !== cat)
        : [...prev.filter(c => c !== 'TODOS LOS PROCESOS'), cat];
      return newSelection.length === 0 ? ['TODOS LOS PROCESOS'] : newSelection;
    });
  };

  // Biblioteca y planificación
  const [biblioteca, setBiblioteca] = useState<Tarea[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useState<Record<string, (ItineraryActivity & { db_id?: any })[]>>({});
  const [fieldTasks, setFieldTasks] = useState<Record<string, Tarea[]>>({});
  const [matchReports, setMatchReports] = useState<any[]>([]);

  // Modales
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showTareaFieldModal, setShowTareaFieldModal] = useState(false);
  const [showBibliotecaAddModal, setShowBibliotecaAddModal] = useState(false);
  const [showDailyReportModal, setShowDailyReportModal] = useState(false);
  const [showWeeklyReportModal, setShowWeeklyReportModal] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [searchTermBiblioteca, setSearchTermBiblioteca] = useState('');
  const [specialNote, setSpecialNote] = useState('');

  const [activityForm, setActivityForm] = useState({
    time: '08:00',
    type: PREDEFINED_ACTIVITIES[0].label,
    location: LOCATIONS[0],
    customLocation: '',
    customType: '',
    rival: '',
    grupo: 'Todos'
  });

  const [newBibliotecaTarea, setNewBibliotecaTarea] = useState({
    nombre: '',
    tipoDinamica: DINAMICAS_OFICIALES[0],
    descripcion: ''
  });

  useEffect(() => {
    fetchMicrocycles();
    fetchBiblioteca();
  }, []);

  const COMP_TYPES = [
    'Amistoso Nacional',
    'Amistoso Internacional',
    'Sudamericano',
    'Mundial',
    'Torneo Internacional',
    'Otro'
  ];

  const getEmojiForType = (type: string) => {
    const isCustom = !PREDEFINED_ACTIVITIES.some(a => type === a.label || type.startsWith(a.label + ' vs'));
    if (isCustom) return '📝';
    
    const found = PREDEFINED_ACTIVITIES.find(a => type.includes(a.label));
    return found ? found.emoji : '📅';
  };

  const fetchMicrocycles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('microcycles')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) throw error;
      if (data) {
        const formatted = data.map((m: any) => ({
          ...m,
          nombre_display: m.type === 'Entrenamientos' ? 'MICROCICLO' : (m.type ? m.type.toUpperCase() : 'MICROCICLO')
        }));
        setMicrociclos(formatted);
      }
    } catch (err) {
      console.error("Error cargando microciclos:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedule = async (microId: number) => {
    try {
      const { data, error } = await supabase
        .from('cronograma_semanal')
        .select('*')
        .eq('id_microcycles', microId)
        .order('hora', { ascending: true });

      if (error) throw error;
      if (data) {
        const grouped: Record<string, any[]> = {};
        data.forEach(item => {
          const key = item.fecha;
          if (!grouped[key]) grouped[key] = [];
          
          const horaString = (item.hora || "00:00").substring(0, 5);
          
          grouped[key].push({
            id: item.id.toString(),
            db_id: item.id,
            time: horaString,
            type: item.actividad || "Sin actividad",
            location: item.lugar || "Sin lugar",
            emoji: getEmojiForType(item.actividad || ""),
            isCustom: !!item.otra,
            grupo: item.grupo || 'Todos'
          });
        });
        setWeeklySchedule(grouped);
      }
    } catch (err) {
      console.error("Error cargando cronograma:", err);
    }
  };

  const fetchWeeklyTasks = async (microId: number) => {
    try {
      const { data, error } = await supabase
        .from('tareas_semanales')
        .select('*')
        .eq('id_microcycles', microId);

      if (error) throw error;
      if (data) {
        const grouped: Record<string, Tarea[]> = {};
        data.forEach(item => {
          const key = item.fecha;
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push({
            id: item.id.toString(),
            nombre: item.nombre,
            tipoDinamica: item.dinamica,
            descripcion: item.observacion,
            jornada: item.jornada || 'AM'
          });
        });
        setFieldTasks(grouped);
      }
    } catch (err) {
      console.error("Error cargando tareas semanales:", err);
    }
  };

  const fetchBiblioteca = async () => {
    setLoadingBiblioteca(true);
    try {
      const { data, error } = await supabase
        .from('tareas')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) throw error;
      if (data) {
        const mapped: Tarea[] = data.map((t: any) => ({
          id: t.id.toString(),
          nombre: t.nombre,
          tipoDinamica: t.tipo_dinamica || 'General',
          descripcion: t.descripcion
        }));
        setBiblioteca(mapped);
      }
    } catch (err) {
      console.error("Error cargando biblioteca de tareas:", err);
    } finally {
      setLoadingBiblioteca(false);
    }
  };

  const handleSelectMicro = (mc: MicrocicloUI) => {
    setSelectedMicro(mc);
    setWeeklySchedule({});
    setFieldTasks({});
    setMatchReports([]);
    fetchSchedule(mc.id);
    fetchWeeklyTasks(mc.id);
    fetchMatchReports(mc.category_id);
    setViewMode('management');
    setActiveTab('partidos');
  };

  const fetchMatchReports = async (categoryId: number) => {
    try {
      // Primero obtener los IDs de los jugadores de esta categoría
      // En este sistema, la categoría está en el microciclo, pero los reportes están vinculados al jugador.
      // Así que buscamos los reportes de los jugadores que han sido citados en este microciclo o categoría.
      
      const { data, error } = await supabase
        .from('match_reports')
        .select('*, players(nombre, apellido1, club, id_del_jugador)')
        .order('fecha', { ascending: false });

      if (error) throw error;
      
      // Filtrar por categoría (esto es una simplificación, idealmente el reporte debería tener categoría)
      // Pero como no la tiene, mostramos todos los reportes por ahora o filtramos si tenemos performanceRecords.
      if (data) {
        setMatchReports(data);
      }
    } catch (err) {
      console.error("Error cargando reportes de competencia:", err);
    }
  };

  const currentWeekDays = useMemo(() => {
    if (!selectedMicro) return [];
    const start = new Date(selectedMicro.start_date + 'T12:00:00');
    const end = new Date(selectedMicro.end_date + 'T12:00:00');
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    return Array.from({ length: diffDays }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [selectedMicro]);

  const formatDateKey = (date: Date) => date.toISOString().split('T')[0];

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDayIndex === null || !selectedMicro || savingActivity) return;
    
    setSavingActivity(true);
    const dateKey = formatDateKey(currentWeekDays[selectedDayIndex]);
    
    const isCustom = activityForm.type === 'OTRA';
    const finalType = isCustom ? (activityForm.customType || 'Actividad') : activityForm.type;

    const isMatch = finalType === 'Partido Amistoso' || finalType === 'Partido Oficial';
    const displayType = (isMatch && activityForm.rival.trim()) 
      ? `${finalType} vs ${activityForm.rival.trim()}` 
      : finalType;

    const finalLocation = activityForm.location === 'OTRO' 
      ? (activityForm.customLocation || 'Sin definir') 
      : activityForm.location;

    try {
      const payload = {
        id_microcycles: selectedMicro.id,
        id_categoria: selectedMicro.category_id,
        fecha: dateKey,
        hora: activityForm.time,
        actividad: displayType,
        lugar: finalLocation,
        otra: isCustom ? (activityForm.customType || 'Personalizada') : null,
        grupo: activityForm.grupo
      };

      if (editingActivityId) {
        const { error } = await supabase
          .from('cronograma_semanal')
          .update(payload)
          .eq('id', editingActivityId);

        if (error) throw error;

        setWeeklySchedule(prev => {
          const currentDayActivities = prev[dateKey] || [];
          return {
            ...prev,
            [dateKey]: currentDayActivities.map(a => 
              a.db_id === editingActivityId 
                ? { ...a, time: activityForm.time.substring(0, 5), type: displayType, location: finalLocation, emoji: getEmojiForType(displayType), isCustom, grupo: activityForm.grupo }
                : a
            ).sort((a, b) => (a.time || "").localeCompare(b.time || ""))
          };
        });
      } else {
        const { data, error } = await supabase
          .from('cronograma_semanal')
          .insert([payload])
          .select();

        if (error) throw error;

        if (data && data[0]) {
          const item = data[0];
          const horaString = (item.hora || activityForm.time || "00:00").substring(0, 5);
          
          const newActivity = {
            id: item.id.toString(),
            db_id: item.id,
            time: horaString,
            type: item.actividad,
            location: item.lugar,
            emoji: getEmojiForType(item.actividad),
            isCustom: !!item.otra,
            grupo: item.grupo || 'Todos'
          };

          logActivity('Agendamiento Actividad', { 
            microcycle: selectedMicro.nombre_display, 
            date: dateKey, 
            activity: item.actividad 
          });

          setWeeklySchedule(prev => {
            const currentDayActivities = prev[dateKey] || [];
            return {
              ...prev,
              [dateKey]: [...currentDayActivities, newActivity].sort((a, b) => 
                (a.time || "").localeCompare(b.time || "")
              )
            };
          });
        }
      }

      // Reiniciamos el formulario
      setActivityForm({
        time: '08:00',
        type: PREDEFINED_ACTIVITIES[0].label,
        location: LOCATIONS[0],
        customLocation: '',
        customType: '',
        rival: '',
        grupo: 'Todos'
      });
      
      setEditingActivityId(null);
      setShowActivityModal(false);
      setSelectedDayIndex(null);
      
    } catch (err: any) {
      console.error("Error al agendar:", err);
      alert("Error al agendar: " + err.message);
    } finally {
      setSavingActivity(false);
    }
  };

  const handleSaveDayTasks = async (dateKey: string) => {
    if (!selectedMicro || savingDayTasks[dateKey]) return;
    
    setSavingDayTasks(prev => ({ ...prev, [dateKey]: true }));
    const dayTasks = (fieldTasks[dateKey] || []).filter(t => t.jornada === selectedJornada);
    
    try {
      const { error: deleteError } = await supabase
        .from('tareas_semanales')
        .delete()
        .eq('id_microcycles', selectedMicro.id)
        .eq('fecha', dateKey)
        .eq('jornada', selectedJornada);

      if (deleteError) throw deleteError;

      if (dayTasks.length > 0) {
        const payload = dayTasks.map(t => ({
          id_microcycles: selectedMicro.id,
          fecha: dateKey,
          dinamica: t.tipoDinamica,
          nombre: t.nombre,
          observacion: t.descripcion || '',
          jornada: selectedJornada
        }));

        const { error: insertError } = await supabase
          .from('tareas_semanales')
          .insert(payload);

        if (insertError) throw insertError;
      }

      logActivity('Sincronización Tareas Campo', { 
        microcycle: selectedMicro.nombre_display, 
        date: dateKey, 
        jornada: selectedJornada,
        taskCount: dayTasks.length
      });

      alert(`Sincronización exitosa: Tareas (${selectedJornada}) del día ${dateKey} guardadas.`);
    } catch (err: any) {
      console.error("Error al sincronizar tareas:", err);
      alert("Error crítico al guardar tareas: " + err.message);
    } finally {
      setSavingDayTasks(prev => ({ ...prev, [dateKey]: false }));
    }
  };

  const handleSelectTareaFromBiblioteca = (tarea: Tarea) => {
    if (selectedDayIndex === null || !selectedMicro) return;
    const dateKey = formatDateKey(currentWeekDays[selectedDayIndex]);
    const newFieldTarea: Tarea = { ...tarea, id: `${tarea.id}-${Date.now()}`, jornada: selectedJornada };
    setFieldTasks({
      ...fieldTasks,
      [dateKey]: [...(fieldTasks[dateKey] || []), newFieldTarea]
    });
    setShowTareaFieldModal(false);
  };

  const handleAddTareaToBiblioteca = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        nombre: newBibliotecaTarea.nombre,
        tipo_dinamica: newBibliotecaTarea.tipoDinamica,
        descripcion: newBibliotecaTarea.descripcion
      };

      const { error } = await supabase
        .from('tareas')
        .insert([payload]);

      if (error) throw error;

      await fetchBiblioteca();
      logActivity('Nueva Tarea Biblioteca', { nombre: newBibliotecaTarea.nombre });
      setShowBibliotecaAddModal(false);
      setNewBibliotecaTarea({ 
        nombre: '', 
        tipoDinamica: DINAMICAS_OFICIALES[0], 
        descripcion: '' 
      });
    } catch (err: any) {
      console.error("Error guardando tarea:", err);
      alert("Error al guardar tarea: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const removeActivity = async (dateKey: string, activity: any) => {
    if (!activity.db_id) return;
    if (!window.confirm("¿Estás seguro de que quieres eliminar esta actividad?")) return;
    try {
      const { error } = await supabase
        .from('cronograma_semanal')
        .delete()
        .eq('id', activity.db_id);
      
      if (error) throw error;

      setWeeklySchedule(prev => ({ 
        ...prev, 
        [dateKey]: (prev[dateKey] || []).filter(a => a.id !== activity.id) 
      }));
    } catch (err: any) {
      alert("Error al eliminar: " + err.message);
    }
  };

  const removeFieldTask = (dateKey: string, tareaId: string) => {
    setFieldTasks({ ...fieldTasks, [dateKey]: (fieldTasks[dateKey] || []).filter(t => t.id !== tareaId) });
  };

  const handleCopyDay = async (targetDateKey: string) => {
    const sourceInput = window.prompt(`Copiando actividades hacia el día ${targetDateKey}.\n\nIngresa el NÚMERO DE DÍA de origen (1, 2, 3...) o la FECHA (AAAA-MM-DD) de origen:`);
    if (!sourceInput) return;

    let sourceDateKey = sourceInput.trim();
    
    // Si el usuario ingresó un número (ej: 1), buscamos la fecha correspondiente en los días del microciclo
    const dayNum = parseInt(sourceDateKey, 10);
    if (!isNaN(dayNum) && dayNum > 0 && dayNum <= currentWeekDays.length) {
      sourceDateKey = formatDateKey(currentWeekDays[dayNum - 1]);
    }

    if (sourceDateKey === targetDateKey || !selectedMicro) {
      if (sourceDateKey === targetDateKey) alert("La fecha de origen y destino no pueden ser la misma.");
      return;
    }

    try {
      // 1. Verificar primero en el estado local para dar feedback rápido
      const localSource = weeklySchedule[sourceDateKey];
      
      // Intentamos obtener de la base de datos para estar seguros
      const { data: sourceActivities, error: fetchError } = await supabase
        .from('cronograma_semanal')
        .select('*')
        .eq('id_microcycles', selectedMicro.id)
        .eq('fecha', sourceDateKey);

      if (fetchError) throw fetchError;
      
      if (!sourceActivities || sourceActivities.length === 0) {
        alert(`No se encontraron actividades en el día de origen: ${sourceDateKey}.\nVerifica que la fecha u número de día sea correcto.`);
        return;
      }

      const newActivities = sourceActivities.map(act => ({
        id_microcycles: selectedMicro.id,
        id_categoria: selectedMicro.category_id,
        fecha: targetDateKey,
        hora: act.hora,
        actividad: act.actividad,
        lugar: act.lugar,
        otra: act.otra,
        grupo: act.grupo
      }));

      const { error: insertError } = await supabase
        .from('cronograma_semanal')
        .insert(newActivities);

      if (insertError) throw insertError;

      alert(`Se copiaron ${newActivities.length} actividades con éxito hacia la fecha ${targetDateKey}.`);
      fetchSchedule(selectedMicro.id);
    } catch (err: any) {
      alert("Error al copiar día: " + err.message);
    }
  };

  const startEditing = (act: any, dayIndex: number) => {
    setSelectedDayIndex(dayIndex);
    setEditingActivityId(act.db_id);
    
    // Parse type and rival
    let type = act.type;
    let rival = '';
    if (type.includes(' vs ')) {
      const parts = type.split(' vs ');
      type = parts[0];
      rival = parts[1];
    }

    // Check if it's a predefined activity or custom
    const isPredefined = PREDEFINED_ACTIVITIES.some(pa => pa.label === type);

    setActivityForm({
      time: act.time,
      type: isPredefined ? type : 'OTRA',
      location: LOCATIONS.includes(act.location) ? act.location : 'OTRO',
      customLocation: LOCATIONS.includes(act.location) ? '' : act.location,
      customType: isPredefined ? '' : type,
      rival: rival,
      grupo: act.grupo || 'Todos'
    });
    setShowActivityModal(true);
  };
  
  const generateWeeklyTechnicalReport = async () => {
    if (!selectedMicro) return;
    setGeneratingReport(true);
    
    try {
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      // --- Estilos Base ---
      const primaryColor = [2, 66, 140] as [number, number, number]; // Azul Selección
      const secondaryColor = [226, 35, 26] as [number, number, number]; // Rojo Selección
      const margin = 15;
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // --- HEADER ---
      // Franja Roja Superior
      doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.rect(0, 0, pageWidth, 5, 'F');
      
      // Logo
      const logoUrl = getDriveDirectLink(FEDERATION_LOGO);
      try {
        doc.addImage(logoUrl, 'PNG', margin, 15, 25, 25);
      } catch (e) {
        console.error("Error loading logo for PDF:", e);
      }
      
      // Títulos
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('REPORTE TÉCNICO SEMANAL', 45, 25);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text('PLANIFICACIÓN TÉCNICA DE CAMPO - LA ROJA PERFORMANCE', 45, 30);
      
      // Meta Datos
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(`CATEGORÍA: ${formatCategoryLabel(selectedMicro.category_id)}`, 45, 38);
      
      doc.setTextColor(150, 150, 150);
      const microName = selectedMicro.nombre_display || 'MICROCICLO';
      doc.text(`${microName} #${selectedMicro.id || 'N/A'}`, pageWidth - margin, 25, { align: 'right' });
      doc.text(`${selectedMicro.city?.toUpperCase()}, ${selectedMicro.country?.toUpperCase()}`, pageWidth - margin, 31, { align: 'right' });
      doc.text(`${new Date(selectedMicro.start_date + 'T12:00:00').toLocaleDateString()} - ${new Date(selectedMicro.end_date + 'T12:00:00').toLocaleDateString()}`, pageWidth - margin, 37, { align: 'right' });

      // Línea divisoria
      doc.setDrawColor(230, 230, 230);
      doc.line(margin, 45, pageWidth - margin, 45);

      // --- CUERPO: TAREAS POR DÍA ---
      let currentY = 55;

      currentWeekDays.forEach((date, index) => {
        const dateKey = formatDateKey(date);
        const tasks = fieldTasks[dateKey] || [];
        
        // Encabezado de Día
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.text(`DÍA ${index + 1} - ${date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}`, margin, currentY);
        
        currentY += 6;

        if (tasks.length === 0) {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(180, 180, 180);
          doc.text('No hay tareas técnicas asignadas para este día.', margin + 5, currentY);
          currentY += 10;
        } else {
          // Tabla de Tareas
          const tableData = tasks.map(t => [
            t.jornada || 'AM',
            t.nombre.toUpperCase(),
            t.tipoDinamica.toUpperCase(),
            t.descripcion || '-'
          ]);

          autoTable(doc, {
            startY: currentY,
            head: [['JORNADA', 'NOMBRE DE LA TAREA', 'DINÁMICA', 'OBSERVACIONES']],
            body: tableData,
            theme: 'striped',
            headStyles: {
              fillColor: primaryColor,
              textColor: [255, 255, 255],
              fontSize: 8,
              fontStyle: 'bold',
              halign: 'center'
            },
            bodyStyles: {
              fontSize: 8,
              textColor: [60, 60, 60]
            },
            columnStyles: {
              0: { cellWidth: 20, halign: 'center' },
              1: { cellWidth: 50, fontStyle: 'bold' },
              2: { cellWidth: 40 },
              3: { cellWidth: 'auto' }
            },
            margin: { left: margin, right: margin },
            didDrawPage: (data) => {
              // Footer en cada página
              doc.setFontSize(7);
              doc.setTextColor(200, 200, 200);
              doc.text(`Página ${data.pageNumber}`, margin, doc.internal.pageSize.getHeight() - 10);
              doc.text('CMSPORTECH.COM', pageWidth - margin, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
            }
          });
          
          currentY = (doc as any).lastAutoTable.finalY + 12;
        }

        // Si estamos cerca del final de la página, saltamos
        if (currentY > 260 && index < currentWeekDays.length - 1) {
          doc.addPage();
          currentY = 25;
        }
      });

      // Pie de página final con nota
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bolditalic');
      doc.setTextColor(150, 150, 150);
      doc.text('* NOTA: El color gris en la planificación indica actividades para jugadores concentrados.', margin, doc.internal.pageSize.getHeight() - 15);

      // Guardar PDF
      const fileName = `Reporte_Tecnico_${selectedMicro.category_id}_${selectedMicro.start_date}.pdf`;
      doc.save(fileName);
      
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Hubo un error al generar el reporte PDF.");
    } finally {
      setGeneratingReport(false);
    }
  };

  const downloadDailyReportPDF = async () => {
    if (selectedDayIndex === null || !selectedMicro) return;
    
    setGeneratingReport(true);
    try {
      const container = document.getElementById('daily-report-print');
      
      if (!container) throw new Error("Plantilla no encontrada");

      // Capturamos el Canvas
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc: Document) => {
           // Asegurar que el contenedor sea visible en el clon para ser capturado
           const target = clonedDoc.getElementById('daily-report-print');
           if (target) {
              target.style.display = 'flex';
              target.style.opacity = '1';
           }
        }
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      
      const microName = selectedMicro.micro_number || selectedMicro.id;
      const category = formatCategoryLabel(selectedMicro.category_id).replace(/\s+/g, '-').toLowerCase();
      const dayName = currentWeekDays[selectedDayIndex].toLocaleDateString('es-ES', { weekday: 'long' }).toLowerCase();
      
      const fileName = `microciclo-${microName}-${category}-${dayName}.pdf`;
      pdf.save(fileName);
      
    } catch (err) {
      console.error("Error al descargar PDF:", err);
      alert("Hubo un error al generar el PDF del reporte diario.");
    } finally {
      setGeneratingReport(false);
    }
  };

  const shareDailyReportWhatsApp = () => {
    if (selectedDayIndex === null || !selectedMicro) return;
    
    const microName = selectedMicro.micro_number || selectedMicro.id;
    const category = formatCategoryLabel(selectedMicro.category_id);
    const dayName = currentWeekDays[selectedDayIndex].toLocaleDateString('es-ES', { weekday: 'long' });
    
    const text = encodeURIComponent(`*REPORTE DIARIO - ${category}*\n\n📅 *Día:* ${dayName}\n🔄 *Microciclo:* #${microName}\n\nSe ha generado el reporte diario de actividades. Saludos!`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const shareWeeklyReportWhatsApp = () => {
    if (!selectedMicro) return;
    
    const microName = selectedMicro.micro_number || selectedMicro.id;
    const category = formatCategoryLabel(selectedMicro.category_id);
    const startDate = selectedMicro.start_date;
    
    const text = encodeURIComponent(`*CRONOGRAMA SEMANAL - ${category}*\n\n🔄 *Microciclo:* #${microName}\n📅 *Inicio:* ${startDate}\n\nSe ha compartido el cronograma semanal de actividades de la Selección. Saludos!`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const generateWeeklySchedulePDF = async () => {
    if (!selectedMicro) return;
    setGeneratingReport(true);
    
    try {
      const doc = new jsPDF({
        orientation: 'l',
        unit: 'mm',
        format: 'a4'
      });

      const primaryColor = [2, 66, 140] as [number, number, number];
      const secondaryColor = [226, 35, 26] as [number, number, number];
      const margin = 15;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Decorative Lines - Top
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(1.5);
      doc.line(margin, 10, pageWidth - margin, 10);
      
      doc.setDrawColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.setLineWidth(0.5);
      doc.line(margin, 11.5, pageWidth - margin, 11.5);

      // Logo (Upper Left)
      const logoUrl = getDriveDirectLink(FEDERATION_LOGO);
      try {
        doc.addImage(logoUrl, 'PNG', margin, 15, 25, 25);
      } catch (e) {
        console.warn("Could not add logo to PDF", e);
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(28);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      
      const startDate = new Date(selectedMicro.start_date + 'T12:00:00');
      const endDate = new Date(selectedMicro.end_date + 'T12:00:00');
      const weekNum = selectedMicro.micro_number || selectedMicro.id || '';
      
      const title = `MICROCICLO ${weekNum}`;
      const dateRange = `${startDate.getDate().toString().padStart(2, '0')} AL ${endDate.getDate().toString().padStart(2, '0')} DE ${startDate.toLocaleDateString('es-ES', { month: 'long' }).toUpperCase()}`;
      
      // Simulating the condensed font with horizontalScale if supported, otherwise generic bold
      const textOptions = { align: 'center' } as any;
      try {
        textOptions.horizontalScale = 0.75;
      } catch(e) {}

      doc.text(title, pageWidth / 2, 25, textOptions);
      doc.setFontSize(20);
      doc.text(dateRange, pageWidth / 2, 34, textOptions);

      doc.setFontSize(22);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text(formatCategoryLabel(selectedMicro.category_id).replace(' ', '.'), pageWidth / 2, 45, textOptions);

      const dayNames = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];
      const headers = currentWeekDays.map((date, i) => {
          const dStr = `${date.getDate()}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
          return `${dayNames[i]} ${dStr}`;
      });

      let maxRows = 0;
      currentWeekDays.forEach(date => {
          const dateKey = formatDateKey(date);
          const schedule = weeklySchedule[dateKey] || [];
          if (schedule.length > maxRows) maxRows = schedule.length;
      });

      const body = [];
      for (let r = 0; r < maxRows; r++) {
          const row = currentWeekDays.map(date => {
              const dateKey = formatDateKey(date);
              const schedule = weeklySchedule[dateKey] || [];
              const act = schedule[r];
              if (!act) return '';
              return { 
                content: `${act.time}   ${act.type.toUpperCase()}`,
                grupo: act.grupo 
              };
          });
          body.push(row);
      }

      // Calculate centering for the table
      const numCols = headers.length;
      const totalUsableWidth = pageWidth - 2 * margin;
      const colWidth = totalUsableWidth / 7;
      const tableWidth = numCols * colWidth;
      const tableLeftMargin = (pageWidth - tableWidth) / 2;

      autoTable(doc, {
        startY: 55,
        head: [headers],
        body: body,
        theme: 'plain',
        tableWidth: tableWidth,
        margin: { left: tableLeftMargin },
        headStyles: {
          fillColor: [2, 66, 140],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'center',
          cellPadding: 2,
        },
        bodyStyles: {
          fontSize: 6.5,
          fontStyle: 'bold',
          textColor: [0, 0, 0],
          cellPadding: 1,
          minCellHeight: 6,
          valign: 'middle',
          halign: 'center'
        },
        didParseCell: (data) => {
          // Transparent by default to let us draw custom backgrounds
          if (data.section === 'body') {
            data.cell.styles.fillColor = undefined;
          }
        },
        willDrawCell: (data) => {
          if (data.section === 'head') {
            doc.saveGraphicsState();
            doc.setFillColor(2, 66, 140);
            // Draw a rounded rectangle for the entire header if it's the first or last cell specifically
            // But simpler: just draw rounded rect for each header cell with small gap
            doc.roundedRect(data.cell.x + 0.5, data.cell.y + 0.5, data.cell.width - 1, data.cell.height - 1, 2, 2, 'F');
            doc.restoreGraphicsState();
          }
        },
        didDrawCell: (data) => {
          if (data.section === 'body' && data.cell.raw) {
            const raw = data.cell.raw as any;
            const text = (raw.content || '').toUpperCase();
            const grupo = raw.grupo;
            
            let fillColor: [number, number, number] = [255, 255, 255];
            let textColor: [number, number, number] = [60, 60, 60];
            let hasSpecialColor = false;

            if (text.includes('ENTRENAMIENTO') || text.includes('PARTIDO')) {
                fillColor = [226, 35, 26];
                textColor = [255, 255, 255];
                hasSpecialColor = true;
            } else if (text.includes('GYM') || text.includes('GIMNASIO')) {
                fillColor = [11, 18, 32];
                textColor = [255, 255, 255];
                hasSpecialColor = true;
            } else if (text.includes('ACTIVACIÓN') || text.includes('ACTIVACION')) {
                fillColor = [100, 180, 255];
                textColor = [255, 255, 255];
                hasSpecialColor = true;
            } else if (text.includes('PSICOLÓGICA') || text.includes('CHARLA')) {
                fillColor = [163, 217, 119];
                hasSpecialColor = true;
            } else if (grupo === 'Concentrados') {
                fillColor = [215, 215, 215]; // Gray for Concentrados
            } else if (text.includes('DESAYUNO') || text.includes('ALMUERZO') || text.includes('MERIENDA') || text.includes('CENA') || text.includes('SNACK')) {
                // For meals of non-concentrados, keep white (default) or light gray
                fillColor = [255, 255, 255];
            } else {
                fillColor = [255, 255, 255];
            }

            doc.saveGraphicsState();
            doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
            // Draw rounded "pill" or "card" for the activity
            doc.roundedRect(data.cell.x + 1, data.cell.y + 1, data.cell.width - 2, data.cell.height - 2, 1.5, 1.5, 'F');
            
            // Re-draw text because we cleared the cell earlier
            doc.setFontSize(hasSpecialColor ? 7 : 6.5);
            doc.setTextColor(textColor[0], textColor[1], textColor[2]);
            doc.setFont('helvetica', 'bold');
            
            const lines = doc.splitTextToSize(text, data.cell.width - 4);
            doc.text(lines, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + (lines.length > 1 ? -1 : 1), { align: 'center' });
            
            doc.restoreGraphicsState();
          }
        }
      });

      // Watermark CMSPORTECH - Small bottom right
      doc.saveGraphicsState();
      doc.setTextColor(240, 240, 240);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text("CMSPORTECH", pageWidth - margin, pageHeight - 5, { align: 'right' });
      doc.restoreGraphicsState();

      // Footer Note - Lowered
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.setFont('helvetica', 'italic');
      doc.text("* LAS ACTIVIDADES RESALTADAS EN GRIS CORRESPONDEN A BLOQUES PARA JUGADORES EN RÉGIMEN DE CONCENTRACIÓN.", margin, pageHeight - 15);

      // Decorative Lines - Bottom
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(1.5);
      doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);
      
      doc.setDrawColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.setLineWidth(0.5);
      doc.line(margin, pageHeight - 8.5, pageWidth - margin, pageHeight - 8.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text("FFCH - DEPARTAMENTO DE SELECCIONES NACIONALES", pageWidth / 2, pageHeight - 5, { align: 'center' });

      const fileName = `Cronograma_Semanal_${formatCategoryLabel(selectedMicro.category_id)}_${selectedMicro.start_date}.pdf`;
      doc.save(fileName);
      
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Hubo un error al generar el reporte PDF.");
    } finally {
      setGeneratingReport(false);
    }
  };

  const formatCategoryLabel = (idOrName: any) => {
    if (idOrName === 'TODOS LOS PROCESOS') return idOrName;
    if (typeof idOrName === 'number') {
      const entry = Object.entries(CATEGORY_ID_MAP).find(([_, val]) => val === idOrName);
      return entry ? entry[0].toUpperCase().replace('_', ' ') : 'N/A';
    }
    return String(idOrName).toUpperCase().replace('_', ' ');
  };

  const getActivityStyle = (type: string, grupo?: string) => {
    const t = type.toUpperCase();
    
    // 1. Actividades Específicas (Prioridad Máxima)
    if (t.includes('ENTRENAMIENTO') || t.includes('PARTIDO AMISTOSO') || t.includes('PARTIDO OFICIAL')) return 'bg-red-600 text-white font-black';
    if (t.includes('GYM') || t.includes('GIMNASIO')) return 'bg-[#0b1220] text-white font-black';
    if (t.includes('PSICOLÓGICA') || t.includes('PSICOLOGO') || t.includes('CHARLA')) return 'bg-[#a3d977] text-[#0b1220] font-black';
    if (t.includes('DESCANSO')) return 'bg-sky-100 text-sky-700 font-black';
    
    // 2. Color por Grupo (Fallback)
    if (grupo === 'Concentrados') return 'bg-slate-200 text-[#0b1220] font-bold';
    
    // 3. Actividades comunes (Solo si no es Concentrados o tiene grupo específico)
    // Pero el usuario dice que si es "Todos" debe ser blanco.
    // Si queremos mantener el gris para comidas de concentrados pero blanco si es para todos:
    
    return 'bg-white text-[#0b1220] font-medium';
  };

  const getDinamicaStyle = (dinamica: string) => {
    const d = dinamica.toLowerCase();
    if (d.includes('cuadrados')) return 'bg-blue-600 text-white';
    if (d.includes('cerradas')) return 'bg-orange-500 text-white';
    if (d.includes('abiertas')) return 'bg-emerald-500 text-white';
    if (d.includes('partido')) return 'bg-slate-900 text-white';
    if (d.includes('dinámica') || d.includes('dinamica')) return 'bg-indigo-600 text-white';
    return 'bg-slate-400 text-white';
  };

  const filteredMicrociclos = useMemo(() => {
    return microciclos.filter(m => {
      if (selectedCategories.includes('TODOS LOS PROCESOS')) return true;
      return selectedCategories.some(cat => {
        const categoryIdToMatch = CATEGORY_ID_MAP[cat as Category];
        return Number(m.category_id) === Number(categoryIdToMatch);
      });
    });
  }, [microciclos, selectedCategories]);

  if (viewMode === 'selection') {
    return (
      <div className="space-y-8 animate-in fade-in duration-500 pb-20">
        <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-[#CF1B2B] rounded-2xl flex items-center justify-center text-white shadow-xl">
              <i className="fa-solid fa-bullseye text-xl"></i>
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">ÁREA TÉCNICA</h2>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mt-1">Seleccione un proceso para gestionar su planificación.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 p-1.5 bg-white rounded-[24px] border border-slate-100 shadow-sm max-w-fit overflow-x-auto">
          {['TODOS LOS PROCESOS', ...Object.values(Category)].map(cat => {
            const isSelected = selectedCategories.includes(cat);
            return (
              <button 
                key={cat} 
                onClick={() => toggleCategory(cat)} 
                className={`px-6 py-3.5 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${isSelected ? 'bg-[#0b1220] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {formatCategoryLabel(cat)}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400 font-black uppercase italic tracking-widest animate-pulse">Consultando Base de Datos...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredMicrociclos.map((mc) => (
              <div 
                key={mc.id} 
                onClick={() => handleSelectMicro(mc)} 
                className="group bg-white rounded-[40px] p-10 border-2 border-slate-50 transition-all cursor-pointer hover:shadow-2xl hover:border-red-100 relative overflow-hidden transform-gpu"
              >
                <div className="relative z-10 flex flex-col h-full">
                  <span className="bg-blue-600 text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest w-fit mb-6 shadow-sm">
                    {formatCategoryLabel(mc.category_id)}
                  </span>
                  <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-none mb-2 group-hover:text-red-600 transition-colors">
                    {mc.nombre_display}
                  </h3>
                  <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mb-4">
                    {new Date(mc.start_date + 'T12:00:00').toLocaleDateString()} - {new Date(mc.end_date + 'T12:00:00').toLocaleDateString()}
                  </p>
                  <div className="pt-6 border-t border-slate-50 flex justify-between items-end">
                    <span className="text-[10px] font-black text-red-600 uppercase italic">{mc.city}, {mc.country}</span>
                    <div className="flex items-center gap-2 text-slate-300 group-hover:text-red-600 transition-all">
                      <span className="text-[9px] font-black uppercase">Gestionar</span>
                      <i className="fa-solid fa-arrow-right text-xs"></i>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-6">
          <button 
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setViewMode('selection');
              setSelectedMicro(null);
            }} 
            className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-[#0b1220] hover:text-white transition-all shadow-inner active:scale-95 cursor-pointer z-10"
          >
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <div>
            <div className="flex items-center gap-3">
              <span className="bg-red-600 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">
                {formatCategoryLabel(selectedMicro?.category_id)}
              </span>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">
                {selectedMicro?.nombre_display} <span className="text-red-500">PROCESO</span>
              </h2>
            </div>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mt-1">
              Sede: {selectedMicro?.city}, {selectedMicro?.country} | Periodo: {new Date(selectedMicro?.start_date! + 'T12:00:00').toLocaleDateString()} - {new Date(selectedMicro?.end_date! + 'T12:00:00').toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white/50 p-1.5 rounded-[24px] border border-slate-100 flex items-center gap-2 max-w-fit shadow-sm overflow-x-auto">
        <button onClick={() => setActiveTab('partidos')} className={`flex items-center gap-3 px-6 py-3.5 rounded-[20px] text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'partidos' ? 'bg-[#CF1B2B] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
          <i className="fa-solid fa-trophy text-sm"></i> Partidos
        </button>
        <button onClick={() => setActiveTab('tareas')} className={`flex items-center gap-3 px-6 py-3.5 rounded-[20px] text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'tareas' ? 'bg-[#CF1B2B] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
          <i className="fa-solid fa-futbol text-sm"></i> Tareas Semanales
        </button>
        <button onClick={() => setActiveTab('competencia')} className={`flex items-center gap-3 px-6 py-3.5 rounded-[20px] text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'competencia' ? 'bg-[#CF1B2B] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
          <i className="fa-solid fa-trophy text-sm"></i> Reportes Competición
        </button>
      </div>

      {activeTab === 'partidos' && (
        <MatchesArea selectedCategoryId={selectedMicro?.category_id || 0} />
      )}

      {activeTab === 'tareas' && (
        <div className="space-y-12 relative animate-in fade-in duration-300 transform-gpu">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3">
                <span className="w-2 h-6 bg-red-600 rounded-full"></span>
                Planificación Técnica de Campo
              </h3>
              
              <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner">
                <button 
                  onClick={() => setSelectedJornada('AM')}
                  className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedJornada === 'AM' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Jornada AM
                </button>
                <button 
                  onClick={() => setSelectedJornada('PM')}
                  className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedJornada === 'PM' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Jornada PM
                </button>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <button 
                onClick={generateWeeklyTechnicalReport} 
                disabled={generatingReport}
                className="bg-white border-2 border-slate-200 text-slate-500 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm hover:bg-[#0b1220] hover:text-white hover:border-[#0b1220] transition-all disabled:opacity-50"
              >
                {generatingReport ? (
                  <i className="fa-solid fa-spinner fa-spin"></i>
                ) : (
                  <i className="fa-solid fa-file-pdf text-red-500"></i>
                )}
                {generatingReport ? 'Generando...' : 'Generar Reporte Semanal Técnico'}
              </button>
              <button 
                onClick={() => setShowBibliotecaAddModal(true)} 
                className="bg-[#0b1220] text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl hover:bg-slate-800 transition-all"
              >
                <i className="fa-solid fa-plus"></i> Gestionar Base de Tareas
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {currentWeekDays.map((date, i) => {
              const dateKey = formatDateKey(date);
              const tasks = (fieldTasks[dateKey] || []).filter(t => t.jornada === selectedJornada);
              const isWeekend = i >= 5;
              const isSaving = savingDayTasks[dateKey];
              
              return (
                <div key={dateKey} className={`flex flex-col h-[520px] rounded-[40px] transition-all relative group shadow-sm border ${isWeekend ? 'border-red-500/20 bg-red-50/5' : 'bg-white border-slate-100'} transform-gpu`}>
                  <div className="pt-8 pb-4 text-center border-b border-dashed border-slate-100">
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] block mb-1 ${isWeekend ? 'text-red-500' : 'text-slate-400'}`}>DÍA {i+1}</span>
                    <span className={`text-3xl font-black tracking-tighter ${isWeekend ? 'text-red-600' : 'text-slate-800'}`}>{date.getDate()}</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {tasks.map(task => (
                      <div key={task.id} className={`${getDinamicaStyle(task.tipoDinamica)} p-3 rounded-2xl group/item relative shadow-sm`}>
                        <p className="text-[10px] font-black uppercase italic tracking-tight leading-tight mb-1">{task.nombre}</p>
                        <p className="text-[8px] font-bold opacity-70 uppercase tracking-widest">{task.tipoDinamica}</p>
                        <button onClick={() => removeFieldTask(dateKey, task.id)} className="absolute -top-1 -right-1 w-5 h-5 bg-white border border-slate-100 rounded-full text-slate-300 hover:text-red-500 hover:border-red-500 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-all shadow-sm">
                          <i className="fa-solid fa-xmark text-[10px]"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 space-y-2">
                    <button 
                      onClick={() => handleSaveDayTasks(dateKey)} 
                      disabled={isSaving}
                      className={`w-full py-4 rounded-[20px] bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-md ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      {isSaving ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-floppy-disk"></i>}
                      {isSaving ? 'Guardando...' : 'Guardar Día'}
                    </button>
                    <button onClick={() => { setSelectedDayIndex(i); setShowTareaFieldModal(true); }} className="w-full py-4 rounded-[20px] bg-slate-50 border border-slate-100 text-slate-400 hover:bg-[#CF1B2B] hover:text-white hover:border-[#CF1B2B] hover:shadow-lg transition-all flex items-center justify-center gap-2 group">
                      <i className="fa-solid fa-plus text-sm"></i>
                      <span className="text-[10px] font-black uppercase tracking-widest">Asignar Tarea</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showTareaFieldModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#0b1220]/95 transform-gpu animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 transform-gpu">
            <div className="bg-[#0b1220] p-10 text-white relative">
              <button onClick={() => setShowTareaFieldModal(false)} className="absolute top-8 right-8 text-white/20 hover:text-white transition-colors"><i className="fa-solid fa-xmark text-xl"></i></button>
              <h3 className="text-2xl font-black uppercase italic tracking-tighter">Asignar Tarea Técnica</h3>
            </div>
            <div className="p-10 space-y-6">
              <div className="relative">
                <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm"></i>
                <input type="text" placeholder="Buscar tarea..." className="w-full bg-slate-50 border-none rounded-2xl px-12 py-4 text-sm font-bold outline-none" value={searchTermBiblioteca} onChange={e => setSearchTermBiblioteca(e.target.value)} />
              </div>
              <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar space-y-2">
                {biblioteca.filter(t => t.nombre.toLowerCase().includes(searchTermBiblioteca.toLowerCase())).map(tarea => (
                  <button key={tarea.id} onClick={() => handleSelectTareaFromBiblioteca(tarea)} className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-red-50 border border-transparent transition-all group">
                    <p className="text-[11px] font-black text-slate-900 uppercase italic">{tarea.nombre}</p>
                    <i className="fa-solid fa-plus text-slate-200 group-hover:text-red-500"></i>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showBibliotecaAddModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#0b1220]/95 transform-gpu animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 transform-gpu">
            <div className="bg-red-600 p-10 text-white relative">
              <button onClick={() => setShowBibliotecaAddModal(false)} className="absolute top-8 right-8 text-white/40 hover:text-white transition-colors"><i className="fa-solid fa-xmark text-xl"></i></button>
              <h3 className="text-2xl font-black uppercase italic tracking-tighter">Nueva Tarea en Base de Datos</h3>
            </div>
            <form onSubmit={handleAddTareaToBiblioteca} className="p-10 space-y-8">
              <input required type="text" placeholder="Nombre de la Tarea" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold" value={newBibliotecaTarea.nombre} onChange={e => setNewBibliotecaTarea({...newBibliotecaTarea, nombre: e.target.value})} />
              <select className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold" value={newBibliotecaTarea.tipoDinamica} onChange={e => setNewBibliotecaTarea({...newBibliotecaTarea, tipoDinamica: e.target.value})}>
                {DINAMICAS_OFICIALES.map(d => <option key={d} value={d}>{d.toUpperCase()}</option>)}
              </select>
              <textarea rows={3} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold resize-none" value={newBibliotecaTarea.descripcion} onChange={e => setNewBibliotecaTarea({...newBibliotecaTarea, descripcion: e.target.value})} />
              <button type="submit" className="w-full py-5 bg-[#0b1220] text-white rounded-[24px] text-xs font-black uppercase tracking-widest shadow-xl">Guardar en Sistema</button>
            </form>
          </div>
        </div>
      )}

      {showDailyReportModal && selectedDayIndex !== null && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#0b1220]/95 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
           {/* Overlay to close */}
           <div className="absolute inset-0" onClick={() => setShowDailyReportModal(false)}></div>
           
           <div className="relative bg-white w-full max-w-[210mm] min-h-[297mm] rounded-[24px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 transform-gpu my-8">
              
              {/* Header Actions (No Printable) */}
              <div className="p-6 border-b border-slate-100 bg-white sticky top-0 z-50 print:hidden">
                 <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tighter">Vista Previa Reporte Diario</h3>
                    <div className="flex gap-3">
                      <button 
                        onClick={shareDailyReportWhatsApp}
                        className="bg-[#25D366] text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg hover:bg-[#128C7E] transition-all"
                      >
                        <i className="fa-brands fa-whatsapp"></i> Compartir
                      </button>
                      <button 
                        onClick={downloadDailyReportPDF} 
                        disabled={generatingReport}
                        className="bg-red-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg hover:bg-red-700 transition-all disabled:opacity-50"
                      >
                        {generatingReport ? (
                          <><i className="fa-solid fa-spinner fa-spin"></i> GENERANDO...</>
                        ) : (
                          <><i className="fa-solid fa-file-pdf"></i> DESCARGAR PDF</>
                        )}
                      </button>
                      <button 
                        onClick={() => setShowDailyReportModal(false)} 
                        className="bg-slate-100 text-slate-500 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                      >
                        Cerrar
                      </button>
                    </div>
                 </div>
                 <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 italic">Mensaje Especial (Opcional - Sólo aparecerá si escribes algo)</label>
                    <textarea 
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500 transition-all resize-none"
                      placeholder="Escribe un mensaje que aparecerá al final del reporte..."
                      rows={2}
                      value={specialNote}
                      onChange={(e) => setSpecialNote(e.target.value)}
                    />
                 </div>
              </div>

              {/* Printable Content (A4 Ratio) */}
              <div className="flex-1 p-8 bg-white flex flex-col print:p-0" id="daily-report-print">
                 
                  {/* 1. HEADER: Título y Datos del Microciclo (Rediseño con Diagonales y Colores Reales) */}
                 <div className="mb-6 font-sans">
                    {/* Top Graphic Bar */}
                    <div className="flex items-center h-20 relative overflow-hidden">
                       {/* Blue Segment */}
                       <div className="bg-[#02428c] h-full flex items-center px-8 relative z-20 min-w-[320px]" style={{ clipPath: 'polygon(0 0, 92% 0, 100% 100%, 0% 100%)' }}>
                          <span className="text-4xl font-black text-white uppercase italic tracking-tighter whitespace-nowrap">
                             {(() => {
                                const d = currentWeekDays[selectedDayIndex];
                                const weekday = d.toLocaleDateString('es-ES', { weekday: 'long' });
                                const day = d.getDate().toString().padStart(2, '0');
                                const month = (d.getMonth() + 1).toString().padStart(2, '0');
                                return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)} ${day}/${month}`;
                             })()}
                          </span>
                       </div>
                       
                       {/* Red Segment */}
                       <div className="bg-[#e2231a] h-full w-24 -ml-12 relative z-10 shadow-lg" style={{ clipPath: 'polygon(25% 0, 100% 0, 75% 100%, 0% 100%)' }}></div>
                       
                       {/* Logo Section */}
                       <div className="flex-1 flex items-center gap-4 ml-8 overflow-hidden">
                          <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center p-1 bg-white rounded-full shadow-md">
                             <img 
                               src={getDriveDirectLink(FEDERATION_LOGO)} 
                               alt="Logo" 
                               className="w-full h-full object-contain"
                               referrerPolicy="no-referrer"
                             />
                          </div>
                          <div className="h-10 w-[1.5px] bg-slate-200 flex-shrink-0"></div>
                          <div className="flex flex-col min-w-0">
                             <h2 className="text-xl font-black text-[#02428c] uppercase tracking-tighter leading-tight">
                                SELECCIÓN NACIONAL
                             </h2>
                             <span className="text-xl font-black text-red-600 uppercase tracking-tighter leading-tight">
                                {formatCategoryLabel(selectedMicro?.category_id)}
                             </span>
                          </div>
                       </div>
                    </div>

                    {/* Metadata Section */}
                    <div className="mt-2 px-8 border-b-2 border-[#02428c] pb-2">
                       <div className="grid grid-cols-3 gap-8">
                          <div className="flex items-center gap-3">
                             <div className="w-1.5 h-1.5 rounded-full bg-[#02428c]"></div>
                             <span className="text-xs font-black text-slate-900 uppercase">MICROCICLO</span>
                             <div className="h-4 w-px bg-slate-300"></div>
                             <span className="text-sm font-black text-red-600">#{selectedMicro?.micro_number || selectedMicro?.id || '—'}</span>
                          </div>
                          <div className="flex items-center gap-3">
                             <div className="w-1.5 h-1.5 rounded-full bg-[#02428c]"></div>
                             <span className="text-xs font-black text-slate-900 uppercase">SESIÓN</span>
                             <div className="h-4 w-px bg-slate-300"></div>
                             <span className="text-sm font-black text-red-600">
                                {(() => {
                                   const dayActivities = weeklySchedule[formatDateKey(currentWeekDays[selectedDayIndex])] || [];
                                   if (dayActivities.length === 0) return 'AM';
                                   
                                   const hours = dayActivities.map(a => {
                                     const h = parseInt(a.time.split(':')[0]);
                                     return isNaN(h) ? 0 : h;
                                   });
                                   
                                   const hasAM = hours.some(h => h < 12);
                                   const hasPM = hours.some(h => h >= 12);
                                   
                                   if (hasAM && hasPM) return 'AM - PM';
                                   if (hasPM) return 'PM';
                                   return 'AM';
                                })()}
                             </span>
                          </div>
                          <div className="flex items-center gap-3">
                             <div className="w-1.5 h-1.5 rounded-full bg-[#02428c]"></div>
                             <span className="text-xs font-black text-slate-900 uppercase">LUGARES</span>
                             <div className="h-4 w-px bg-slate-300"></div>
                             <span className="text-sm font-black text-red-600 truncate">
                                {selectedMicro?.city || 'SANTIAGO'}
                             </span>
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* 3. TABLA DE ACTIVIDADES (REMOVED REDUNDANT HEADER) */}

                 {/* 3. TABLA DE ACTIVIDADES */}
                 <div className="border-2 border-slate-100 rounded-2xl overflow-hidden mb-6">
                    <table className="w-full text-center border-collapse">
                       <thead>
                          <tr className="bg-slate-50 border-b-2 border-slate-100">
                             <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-24">Hora</th>
                             <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Actividad</th>
                             <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Lugar</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                          {(weeklySchedule[formatDateKey(currentWeekDays[selectedDayIndex])] || []).map((act, idx) => {
                             const rowStyle = getActivityStyle(act.type);
                             return (
                               <tr key={idx} className={getActivityStyle(act.type, act.grupo)}>
                                  <td className="py-2 px-4 text-xs font-black tracking-tight border-r border-slate-50/20">{act.time}</td>
                                  <td className="py-2 px-4 text-xs font-bold uppercase italic tracking-tight border-r border-slate-50/20">
                                     {act.type}
                                  </td>
                                  <td className="py-2 px-4 text-[9px] font-bold uppercase tracking-wider">
                                     {act.location}
                                  </td>
                               </tr>
                             );
                          })}
                          {(weeklySchedule[formatDateKey(currentWeekDays[selectedDayIndex])] || []).length === 0 && (
                             <tr>
                                <td colSpan={3} className="py-12 text-center text-slate-300 text-xs font-bold uppercase tracking-widest italic">
                                   Sin actividades registradas
                                </td>
                             </tr>
                          )}
                       </tbody>
                    </table>
                 </div>

                 {/* 4. NOTA ESPECIAL (Solo si existe) */}
                 {specialNote.trim() && (
                   <div className="mt-8 bg-slate-50 border-2 border-slate-100 rounded-2xl p-6 relative overflow-hidden break-inside-avoid">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-red-600/5 rotate-45 translate-x-8 -translate-y-8"></div>
                      <h4 className="text-[10px] font-black text-[#02428c] uppercase tracking-widest mb-3 flex items-center gap-2">
                        <i className="fa-solid fa-note-sticky text-red-600"></i> NOTA DEL CUERPO TÉCNICO
                      </h4>
                      <p className="text-xs font-bold text-slate-700 leading-relaxed whitespace-pre-wrap italic">
                        "{specialNote}"
                      </p>
                   </div>
                 )}

                 {/* 5. FOOTER (Opcional) */}
                 <div className="mt-auto pt-8 border-t border-slate-100 flex flex-col gap-2">
                     <p className="text-[8px] font-black italic text-slate-400 uppercase tracking-widest">
                       * NOTA: EL COLOR GRIS EN LA PLANIFICACIÓN INDICA ACTIVIDADES PARA JUGADORES CONCENTRADOS.
                     </p>
                     <div className="flex justify-between items-end text-[9px] font-bold text-slate-300 uppercase tracking-widest">
                        <div className="flex flex-col gap-0.5">
                           <span>Generado automáticamente por el Sistema de Gestión</span>
                           <span>{new Date().toLocaleDateString()}</span>
                        </div>
                        <span className="text-slate-400 font-black">CMSPORTECH.COM</span>
                     </div>
                  </div>

              </div>
           </div>
        </div>
      )}

      {showActivityModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#0b1220]/90 transform-gpu animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 transform-gpu">
            <div className="bg-[#0b1220] p-10 text-white relative">
              <button onClick={() => { setShowActivityModal(false); setEditingActivityId(null); }} className="absolute top-8 right-8 text-white/20 hover:text-white transition-colors"><i className="fa-solid fa-xmark text-xl"></i></button>
              <h3 className="text-2xl font-black uppercase italic tracking-tighter">{editingActivityId ? 'Editar Actividad' : 'Programar Jornada'}</h3>
              <p className="text-red-500 font-black uppercase text-[10px] tracking-[0.3em] mt-2">DÍA {selectedDayIndex !== null && selectedDayIndex + 1} • {currentWeekDays[selectedDayIndex!].toLocaleDateString()}</p>
            </div>
            <form onSubmit={handleAddActivity} className="p-12 space-y-8">
              <div className="grid grid-cols-3 gap-4">
                <input required type="time" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold" value={activityForm.time} onChange={e => setActivityForm({...activityForm, time: e.target.value})} />
                <select className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold" value={activityForm.location} onChange={e => setActivityForm({...activityForm, location: e.target.value})}>
                  {LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                </select>
                <select className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold" value={activityForm.grupo} onChange={e => setActivityForm({...activityForm, grupo: e.target.value})}>
                  <option value="Todos">TODOS</option>
                  <option value="Concentrados">CONCENTRADOS</option>
                  <option value="Santiago">SANTIAGO</option>
                </select>
              </div>
              {activityForm.location === 'OTRO' && (
                <input required placeholder="Especificar Lugar..." className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-black" value={activityForm.customLocation} onChange={e => setActivityForm({...activityForm, customLocation: e.target.value})} />
              )}
              <div className="grid grid-cols-3 gap-2 h-48 overflow-y-auto pr-2 custom-scrollbar p-1">
                {PREDEFINED_ACTIVITIES.map(act => (
                  <button key={act.label} type="button" onClick={() => setActivityForm({...activityForm, type: act.label})} className={`p-4 rounded-2xl text-left border-2 transition-all ${activityForm.type === act.label ? 'bg-red-600 border-red-600 text-white shadow-lg' : 'bg-slate-50 border-transparent text-slate-600 hover:bg-slate-100'}`}>
                    <span className="text-lg block mb-1">{act.emoji}</span>
                    <span className="text-[9px] font-black uppercase tracking-tight leading-none">{act.label}</span>
                  </button>
                ))}
              </div>
              <button type="submit" disabled={savingActivity} className="w-full py-6 rounded-[32px] bg-red-600 text-white text-xs font-black uppercase tracking-widest shadow-2xl hover:bg-red-700 transition-all">
                {savingActivity ? 'Guardando...' : (editingActivityId ? 'Actualizar Actividad' : 'Confirmar y Agendar')}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'competencia' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3">
                <span className="w-2 h-6 bg-red-600 rounded-full"></span>
                Reportes de Jugadores en Competencia
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="pb-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Jugador</th>
                    <th className="pb-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                    <th className="pb-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Compromiso</th>
                    <th className="pb-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Minutos</th>
                    <th className="pb-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">RPE</th>
                    <th className="pb-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Molestias</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {matchReports.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-20 text-center text-slate-300 font-black uppercase italic tracking-widest">
                        Sin reportes registrados en este periodo
                      </td>
                    </tr>
                  ) : (
                    matchReports.map((report) => (
                      <tr key={report.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="py-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-black text-xs italic">
                              {report.players?.nombre?.charAt(0)}
                            </div>
                            <div>
                              <p className="text-[11px] font-black text-slate-900 uppercase italic leading-none">{report.players?.nombre} {report.players?.apellido1}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{report.players?.club}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-6 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                          {new Date(report.fecha + 'T12:00:00').toLocaleDateString()}
                        </td>
                        <td className="py-6">
                          <p className="text-[10px] font-black text-red-600 uppercase italic tracking-tight">{report.resultado === 'Titular' ? 'TITULAR' : 'SUPLENTE'}</p>
                          <p className="text-[9px] font-bold text-slate-900 uppercase tracking-widest">vs {report.rival}</p>
                        </td>
                        <td className="py-6 text-center">
                          <span className="bg-[#0b1220] text-white px-3 py-1 rounded-lg text-[10px] font-black tracking-tighter italic">
                            {report.minutos_jugados || 0}'
                          </span>
                        </td>
                        <td className="py-6 text-center">
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${
                            (report.rpe || 0) > 7 ? 'bg-red-100 text-red-600' : 
                            (report.rpe || 0) > 4 ? 'bg-amber-100 text-amber-600' : 
                            'bg-emerald-100 text-emerald-600'
                          }`}>
                            {report.rpe || 0}
                          </span>
                        </td>
                        <td className="py-6">
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tight leading-relaxed max-w-[200px]">
                            {report.molestias || 'Sin molestias'}
                            {report.enfermedad && <span className="text-red-500 block">Síntomas: {report.enfermedad}</span>}
                          </p>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        
        @media print {
          body * { visibility: hidden; }
          #daily-report-print, #daily-report-print *, 
          #weekly-report-print, #weekly-report-print * { 
            visibility: visible; 
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          #daily-report-print, #weekly-report-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20mm;
            margin: 0;
            z-index: 9999;
            background: white;
            overflow: visible !important;
          }
          @page { size: A4; margin: 0; }
        }
      `}</style>
    </div>
  );
};

export default TecnicaArea;
