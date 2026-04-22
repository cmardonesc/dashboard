
import React, { useState, useMemo, useEffect } from 'react'
import { User, Category, CATEGORY_ID_MAP, MicrocicloDB, UserRole } from '../types'
import { supabase } from '../lib/supabase'
import { triggerPushNotification } from '../lib/notifications'
import { FEDERATION_LOGO } from '../constants'
import { getDriveDirectLink } from '../lib/utils'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

type ViewMode = 'grid' | 'selection' | 'clubs'

interface MicrocicloUI extends MicrocicloDB {
  id: number;
  micro_number?: number;
  nombre_display: string;
  player_count?: number;
}

const TIPO_PROCESO_OPTIONS = [
  'Entrenamiento',
  'Gira',
  'Torneo amistoso',
  'Sudamericano',
  'Mundial'
];

export default function CitacionesArea() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedMicro, setSelectedMicro] = useState<MicrocicloUI | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedYear, setSelectedYear] = useState('TODOS')
  const [selectedCategoryPlayer, setSelectedCategoryPlayer] = useState<string>('TODOS')
  const [selectedPositions, setSelectedPositions] = useState<string[]>(['TODAS'])
  const [showPosDropdown, setShowPosDropdown] = useState(false)
  
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('TODOS')
  
  const [loadingMicros, setLoadingMicros] = useState(false)
  const [loadingPlayers, setLoadingPlayers] = useState(false)
  const [loadingCitados, setLoadingCitados] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [creating, setCreating] = useState(false)

  const [microciclos, setMicrociclos] = useState<MicrocicloUI[]>([])
  const [allPlayers, setAllPlayers] = useState<User[]>([])
  const [citadosIds, setCitadosIds] = useState<number[]>([])
  const [clubContacts, setClubContacts] = useState<any[]>([])

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newMicroForm, setNewMicroForm] = useState({
    category: Category.SUB_17,
    type: TIPO_PROCESO_OPTIONS[0],
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    city: 'Santiago',
    country: 'Chile'
  })
  const [copyLastNomina, setCopyLastNomina] = useState(true)

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchMicrocycles();
    fetchAllPlayers();
    fetchClubContacts();
  }, []);

  const fetchClubContacts = async () => {
    const { data } = await supabase.from('contactos_solicitudes').select('*');
    if (data) setClubContacts(data);
  };

  const fetchMicrocycles = async () => {
    setLoadingMicros(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase
        .from('microcycles')
        .select('*')
        .order('start_date', { ascending: false });
      
      if (error) throw error;
      
      if (data) {
        console.log("Microciclos cargados desde DB:", data.length);
        const { data: citCounts } = await supabase.from('citaciones').select('microcycle_id');
        const countsMap: Record<number, number> = {};
        citCounts?.forEach((c: any) => {
          countsMap[c.microcycle_id] = (countsMap[c.microcycle_id] || 0) + 1;
        });

        const formatted = data.map(m => ({
          ...m,
          nombre_display: 'MICROCICLO',
          player_count: countsMap[m.id] || 0
        }));
        setMicrociclos(formatted);
      } else {
        setMicrociclos([]);
      }
    } catch (err: any) {
      console.error("Error al cargar microciclos:", err);
      setErrorMsg(err.message || "Error desconocido al cargar microciclos.");
    } finally {
      setLoadingMicros(false);
    }
  };

  const fetchAllPlayers = async () => {
    setLoadingPlayers(true);
    try {
      const { data, error } = await supabase
        .from('players')
        .select(`id_del_jugador, nombre, apellido1, club, posicion, anio`);
      
      if (error) throw error;
      
      if (data) {
        const mapped = data.map((p: any) => {
          // Inferir categoría si falta
          let category = '';
          if (p.anio) {
            const age = 2026 - p.anio;
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

          return {
            id: `p-${p.id_del_jugador}`,
            id_del_jugador: p.id_del_jugador,
            name: `${p.nombre} ${p.apellido1}`,
            role: UserRole.PLAYER, 
            anio: p.anio,
            club: p.club || 'SIN CLUB',
            position: p.posicion || 'N/A',
            category: category
          };
        });
        setAllPlayers(mapped);
      }
    } catch (err) {
      console.error("Error crítico cargando jugadores:", err);
    } finally {
      setLoadingPlayers(false);
    }
  };

  const fetchCitadosIds = async (microId: number) => {
    setLoadingCitados(true);
    try {
      const { data, error } = await supabase
        .from('citaciones')
        .select('player_id')
        .eq('microcycle_id', microId);
      
      if (error) throw error;
      if (data) {
        setCitadosIds(data.map(d => d.player_id));
      }
    } catch (err) {
      console.error("Error cargando IDs de citados:", err);
    } finally {
      setLoadingCitados(false);
    }
  };

  const handleCreateMicrocycle = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setErrorMsg(null);
    try {
      console.log("Iniciando creación de microciclo para categoría:", newMicroForm.category);
      const { data: { session } } = await supabase.auth.getSession();
      const catId = CATEGORY_ID_MAP[newMicroForm.category];
      
      if (!catId) {
        throw new Error(`Categoría no válida: ${newMicroForm.category}`);
      }

      // 0. Verificar si ya existe un microciclo para esta categoría y fecha de inicio
      console.log("Verificando si ya existe microciclo para catId:", catId, "y fecha:", newMicroForm.start_date);
      const { data: existing, error: checkError } = await supabase
        .from('microcycles')
        .select('id, micro_number')
        .eq('category_id', catId)
        .eq('start_date', newMicroForm.start_date)
        .maybeSingle();

      if (checkError) {
        console.error("Error al verificar microciclo existente:", checkError);
      }

      if (existing) {
        alert(`⚠️ ATENCIÓN: Ya existe el Microciclo #${existing.micro_number || existing.id} para esta categoría y fecha de inicio. No es necesario crearlo de nuevo.`);
        setShowCreateModal(false);
        setCreating(false);
        return;
      }

      // 1. Calcular el siguiente micro_number para esta categoría
      let nextNumber = 1;
      const { data: lastMicrosForNum, error: numError } = await supabase
        .from('microcycles')
        .select('micro_number')
        .eq('category_id', catId)
        .order('micro_number', { ascending: false })
        .limit(1);
      
      if (!numError && lastMicrosForNum && lastMicrosForNum.length > 0) {
        nextNumber = (lastMicrosForNum[0].micro_number || 0) + 1;
      } else if (numError) {
        console.warn("No se pudo obtener el último micro_number, usando 1 por defecto:", numError);
      }

      // 2. Generar un código único extremadamente robusto
      const generateCode = () => {
        const timestamp = Date.now().toString(36).toUpperCase();
        const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
        return `MC-${catId}-${newMicroForm.start_date.replace(/-/g, '')}-${timestamp}-${randomStr}`;
      };
      let uniqueCode = generateCode();

      // 3. Buscar jugadores para copiar si está habilitado
      let playersToCopy: number[] = [];
      if (copyLastNomina) {
        const { data: lastMicros } = await supabase
          .from('microcycles')
          .select('id')
          .eq('category_id', catId)
          .order('start_date', { ascending: false })
          .limit(1);
        
        if (lastMicros && lastMicros.length > 0) {
          const lastId = lastMicros[0].id;
          const { data: citations } = await supabase
            .from('citaciones')
            .select('player_id')
            .eq('microcycle_id', lastId);
          
          if (citations) {
            playersToCopy = citations.map(c => c.player_id);
          }
        }
      }

      const payload: any = {
        category_id: catId,
        type: `${newMicroForm.type} (${newMicroForm.city})`,
        start_date: newMicroForm.start_date,
        end_date: newMicroForm.end_date,
        city: newMicroForm.city,
        country: newMicroForm.country,
        created_by: session?.user?.id,
        micro_number: nextNumber,
        code: uniqueCode
      };
      console.log("Payload final con código:", uniqueCode);

      // Intentamos insertar con reintentos para colisiones de código
      let newMicro = null;
      let error = null;
      let attempts = 0;
      const maxAttempts = 2;

      while (attempts < maxAttempts) {
        console.log(`Intento de creación ${attempts + 1} con código:`, uniqueCode);
        const { data, error: insertError } = await supabase
          .from('microcycles')
          .insert([payload])
          .select()
          .single();
        
        if (!insertError) {
          newMicro = data;
          error = null;
          break;
        }

        error = insertError;
        console.error("Error en intento de inserción:", error);

        // Si es error de duplicado, reintentamos con nuevo código
        if (error.code === '23505' || error.message?.includes('microcycles_code_key')) {
          console.warn("Colisión de código detectada, generando nuevo código...");
          uniqueCode = generateCode();
          payload.code = uniqueCode;
          attempts++;
        } else if (error.code === 'PGRST204' || error.message?.includes('column "code"')) {
          // Si la columna no existe en el cache, no tiene sentido reintentar el bucle
          break;
        } else {
          break;
        }
      }
        
      // FALLBACK AGRESIVO: Si sigue fallando por duplicado o columnas inexistentes
      if (error && (
        error.code === '23505' || 
        error.code === 'PGRST204' ||
        error.message?.includes('microcycles_code_key') ||
        error.message?.includes('column "code"') || 
        error.message?.includes('column "micro_number"') ||
        error.code === '42703' ||
        error.code === 'PGRST200'
      )) {
        console.warn("⚠️ Activando fallback de emergencia: intentando creación simplificada...");
        
        // Intentamos primero quitando solo 'code'
        const fallback1 = { ...payload };
        delete fallback1.code;
        
        const retry1 = await supabase.from('microcycles').insert([fallback1]).select().single();
        
        if (!retry1.error) {
          console.log("✅ Creación exitosa en fallback 1 (sin 'code')");
          newMicro = retry1.data;
          error = null;
        } else {
          console.warn("❌ Fallback 1 falló, intentando fallback 2 (mínimo)...", retry1.error);
          // Si falla, intentamos quitando ambos
          const fallback2 = { ...payload };
          delete fallback2.code;
          delete fallback2.micro_number;
          
          const retry2 = await supabase.from('microcycles').insert([fallback2]).select().single();
          
          if (!retry2.error) {
            console.log("✅ Creación exitosa en fallback 2 (mínimo)");
            newMicro = retry2.data;
            error = null;
          } else {
            error = retry2.error;
            console.error("❌ Fallback de emergencia falló completamente:", error);
          }
        }
      }

      if (error) throw error;

      // Disparar notificación push
      if (newMicro) {
        triggerPushNotification({
          title: `Nuevo Microciclo Creado`,
          body: `Tipo: ${newMicro.type}, Del ${newMicro.start_date} al ${newMicro.end_date}`,
          url: '/tecnica'
        }).catch(err => console.error("Error disparando notificación:", err));
      }

      // 4. Copiar jugadores si hay
      if (playersToCopy.length > 0 && newMicro) {
        console.log(`Copiando ${playersToCopy.length} jugadores al nuevo microciclo...`);
        const bulkData = playersToCopy.map(pid => ({
          microcycle_id: newMicro.id,
          player_id: pid,
          fecha_citacion: new Date().toISOString().split('T')[0],
          created_by: session?.user?.id
        }));
        const { error: copyError } = await supabase.from('citaciones').insert(bulkData);
        if (copyError) {
          console.error("Error al copiar jugadores:", copyError);
          alert("El microciclo se creó, pero hubo un error al copiar los jugadores: " + copyError.message);
        }
      }

      alert(`Microciclo #${newMicro?.micro_number || ''} creado correctamente.${playersToCopy.length > 0 ? ` Se copiaron ${playersToCopy.length} jugadores del proceso anterior.` : ''}`);
      setShowCreateModal(false);
      fetchMicrocycles();
    } catch (err: any) {
      console.error("Error creating microcycle:", err);
      if (err.message?.includes('microcycles_code_key') || err.code === '23505') {
        alert("⚠️ AVISO: Ya existe un registro con este código único. Intente nuevamente.");
      } else {
        alert(`Error al crear microciclo [${err.code || 'S/C'}]: ${err.message}`);
      }
    } finally {
      setCreating(false);
    }
  };

  const currentCitados = useMemo(() => {
    return allPlayers.filter(p => p.id_del_jugador && citadosIds.includes(p.id_del_jugador));
  }, [allPlayers, citadosIds]);

  const availableYears = useMemo(() => {
    const years = allPlayers
      .map(p => p.anio)
      .filter((anio): anio is number => typeof anio === 'number' && anio > 0);
    return Array.from(new Set(years)).sort((a: number, b: number) => b - a);
  }, [allPlayers]);

  const sortedCitados = useMemo(() => {
    return [...currentCitados].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [currentCitados]);

  const togglePosition = (pos: string) => {
    setSelectedPositions(prev => {
      if (pos === 'TODAS') return ['TODAS'];
      const newSelection = prev.includes(pos)
        ? prev.filter(p => p !== pos)
        : [...prev.filter(p => p !== 'TODAS'), pos];
      return newSelection.length === 0 ? ['TODAS'] : newSelection;
    });
  };

  const filteredPlayers = useMemo(() => {
    return allPlayers.filter(p => {
      const matchesSearch = (p.name || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesYear = selectedYear === 'TODOS' || p.anio?.toString() === selectedYear;
      const matchesPos = selectedPositions.includes('TODAS') || selectedPositions.some(pos => (p.position || "").includes(pos));
      const matchesCat = selectedCategoryPlayer === 'TODOS' || p.category === selectedCategoryPlayer;
      return matchesSearch && matchesYear && matchesPos && matchesCat;
    });
  }, [allPlayers, searchTerm, selectedYear, selectedPositions, selectedCategoryPlayer]);

  const filteredMicrociclos = useMemo(() => {
    if (selectedCategoryFilter === 'TODOS') return microciclos;
    const catId = CATEGORY_ID_MAP[selectedCategoryFilter as Category];
    return microciclos.filter(mc => mc.category_id === catId);
  }, [microciclos, selectedCategoryFilter]);

  const handleCite = (playerId: number) => {
    if (citadosIds.includes(playerId)) return;
    setCitadosIds(prev => [...prev, playerId]);
  };

  const handleUncite = (playerId: number) => {
    setCitadosIds(prev => prev.filter(id => id !== playerId));
  };

  const handleConfirmNomina = async () => {
    if (!selectedMicro?.id) return;
    setConfirming(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await supabase.from('citaciones').delete().eq('microcycle_id', selectedMicro.id);

      if (citadosIds.length > 0) {
        const bulkData = citadosIds.map(id => ({
          microcycle_id: selectedMicro.id,
          player_id: id,
          fecha_citacion: new Date().toISOString().split('T')[0],
          created_by: session?.user?.id
        }));
        const { error } = await supabase.from('citaciones').insert(bulkData);
        if (error) throw error;
      }

      alert("Nómina oficializada con éxito.");
      setViewMode('grid');
      fetchMicrocycles();
    } catch (err: any) {
      alert("Error al oficializar: " + err.message);
    } finally {
      setConfirming(false);
    }
  };

  const handleSelectMicro = (mc: MicrocicloUI) => {
    setSelectedMicro(mc);
    setCitadosIds([]);
    fetchCitadosIds(mc.id);
    
    const catEntry = Object.entries(CATEGORY_ID_MAP).find(([_, val]) => val === mc.category_id);
    if (catEntry) {
      setSelectedCategoryPlayer(catEntry[0]);
    } else {
      setSelectedCategoryPlayer('TODOS');
    }
    
    setViewMode('selection');
  };

  const formatCategoryLabel = (id: any) => {
    if (typeof id === 'string') return id.toUpperCase().replace('_', ' ');
    const entry = Object.entries(CATEGORY_ID_MAP).find(([_, val]) => val === id);
    return entry ? entry[0].toUpperCase().replace('_', ' ') : 'N/A';
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}-${month}-${year}`;
  };

  const citadosByClub = useMemo(() => {
    const groups: Record<string, User[]> = {};
    sortedCitados.forEach(p => {
      const club = p.club || 'SIN CLUB';
      if (!groups[club]) groups[club] = [];
      groups[club].push(p);
    });
    return groups;
  }, [sortedCitados]);

  const generatePDFBlob = (clubName: string, players: User[]) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(24);
    doc.setTextColor(207, 27, 43); // #CF1B2B
    doc.setFont("helvetica", "bold");
    doc.text("LA ROJA PERFORMANCE", 105, 25, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(51, 65, 85); // Slate 700
    doc.text(`CITACIÓN OFICIAL DE JUGADORES - ${clubName.toUpperCase()}`, 105, 35, { align: 'center' });
    
    doc.setDrawColor(207, 27, 43);
    doc.setLineWidth(1);
    doc.line(20, 40, 190, 40);
    
    // Proceso Info
    doc.setFontSize(11);
    doc.setTextColor(11, 18, 32); // #0b1220
    doc.setFont("helvetica", "bold");
    doc.text("DETALLES DEL PROCESO", 20, 52);
    
    doc.setFont("helvetica", "normal");
    doc.text(`Proceso: ${selectedMicro?.type?.toUpperCase()}`, 20, 60);
    doc.text(`Periodo: Del ${formatDate(selectedMicro?.start_date || '')} al ${formatDate(selectedMicro?.end_date || '')}`, 20, 67);
    doc.text(`Sede: ${selectedMicro?.city?.toUpperCase()}, ${selectedMicro?.country?.toUpperCase()}`, 20, 74);
    
    // Table
    const tableData = players.map((p, idx) => [
      idx + 1,
      p.name.toUpperCase(),
      p.position.toUpperCase(),
      formatCategoryLabel(p.category)
    ]);
    
    autoTable(doc, {
      startY: 85,
      head: [['#', 'JUGADOR', 'POSICIÓN', 'CATEGORÍA']],
      body: tableData,
      headStyles: { 
        fillColor: [11, 18, 32],
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'center'
      },
      styles: { 
        fontSize: 10,
        cellPadding: 4
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        2: { halign: 'center' },
        3: { halign: 'center' }
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { top: 85 }
    });
    
    // Footer
    const finalY = (doc as any).lastAutoTable?.finalY || 85;
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // Slate 400
    doc.text("Generado por La Roja Performance Hub - Centro de Inteligencia Deportiva", 105, finalY + 20, { align: 'center' });
    doc.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-CL')}`, 105, finalY + 26, { align: 'center' });
    
    return doc.output('blob');
  };

  const generateFormalLetterPDF = (clubName: string, players: User[]) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const contact = clubContacts.find(c => 
      (c.club?.toLowerCase() || "").includes(clubName.toLowerCase()) || 
      clubName.toLowerCase().includes(c.club?.toLowerCase() || "")
    );

    const presidentName = contact?.presidente || 'Presidente';
    const recipientCargo = contact?.cargo || 'Presidente';
    const recipientClub = clubName.toUpperCase();
    
    // Header Logo & Signature
    const logoUrl = getDriveDirectLink(FEDERATION_LOGO);
    const signatureUrl = getDriveDirectLink("https://drive.google.com/file/d/1ymLFGskIutsx2PpVJJQtjfGshSW5ul3R/view?usp=drive_link");
    
    let logoLoaded = false;
    let signatureLoaded = false;
    const logoImg = new Image();
    const signatureImg = new Image();
    
    const checkAllLoaded = () => {
      if (logoLoaded && signatureLoaded) {
        finishPDF();
      }
    };

    logoImg.crossOrigin = "anonymous";
    logoImg.src = logoUrl;
    logoImg.onload = () => {
      logoLoaded = true;
      checkAllLoaded();
    };
    logoImg.onerror = () => {
      logoLoaded = true;
      checkAllLoaded();
    };

    signatureImg.crossOrigin = "anonymous";
    signatureImg.src = signatureUrl;
    signatureImg.onload = () => {
      signatureLoaded = true;
      checkAllLoaded();
    };
    signatureImg.onerror = () => {
      signatureLoaded = true;
      checkAllLoaded();
    };

    const finishPDF = () => {
      // Add Logo if loaded correctly
      if (logoImg.complete && logoImg.naturalWidth !== 0) {
        doc.addImage(logoImg, 'PNG', 91, 12, 28, 28); 
      } else {
        // Fallback
        doc.setDrawColor(30, 58, 138);
        doc.setLineWidth(0.5);
        doc.circle(105, 26, 14);
      }

      // Page Border - A4 is 210x297
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);
      doc.rect(10, 10, 190, 277); 

      // Date
      const today = new Date();
      const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      const formattedToday = `Santiago de Chile, ${today.getDate()} de ${months[today.getMonth()]} de ${today.getFullYear()}`;
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(formattedToday, 180, 55, { align: 'right' });

      // Recipient
      doc.setFont("helvetica", "bold");
      doc.text("Señor", 25, 65);
      doc.text(presidentName, 25, 71);
      doc.text(recipientCargo, 25, 77);
      doc.text(`Club ${recipientClub}`, 25, 83);
      doc.setLineWidth(0.3);
      doc.line(25, 84, 45, 84);
      doc.text("Presente", 25, 89);
      
      // Ref
      doc.setFont("helvetica", "bold");
      const categoryName = formatCategoryLabel(selectedMicro?.category_id);
      const refText = `Ref.: Carta Convocatoria Selección Nacional ${categoryName}.`;
      doc.text(refText, 25, 105);
      const refWidth = doc.getTextWidth(refText);
      doc.setLineWidth(0.2);
      doc.line(25, 106, 25 + refWidth, 106);

      // Salutation
      doc.setFont("helvetica", "normal");
      const salutation = recipientCargo.toLowerCase().includes('presidente') ? "Estimado presidente," : "Estimado señor,";
      doc.text(salutation, 25, 118);

      // Body (Continuous Text Paragraph)
      const startDate = new Date(selectedMicro?.start_date + 'T12:00:00');
      const startDay = startDate.getDate();
      const endDay = new Date(selectedMicro?.end_date + 'T12:00:00').getDate();
      const monthName = months[startDate.getMonth()];
      const year = startDate.getFullYear();

      const text1 = `El Cuerpo Técnico de la Selección Chilena de Fútbol, junto con la Gerencia de Selecciones Nacionales, tiene el agrado de convocar al jugador de sus registros, `;
      const playerNamesStr = players.map(p => p.name).join(', ');
      const text2 = `, al Microciclo que se desarrollará entre los días ${startDay} al ${endDay} de ${monthName} del ${year}.`;
      
      const marginX = 25;
      const textMaxWidth = 160;
      let currentY = 130;
      const lineHeight = 6;

      const fullParagraph = text1 + playerNamesStr + text2;
      const lines1 = doc.splitTextToSize(fullParagraph, textMaxWidth);
      doc.text(lines1, marginX, currentY, { align: 'justify', maxWidth: textMaxWidth });
      currentY += lines1.length * lineHeight + 8;

      const text3 = `El jugador debe presentarse en el CAR José Sulantay el día ${startDay} de ${monthName} en horario por confirmar.`;
      const lines3 = doc.splitTextToSize(text3, textMaxWidth);
      doc.text(lines3, marginX, currentY, { align: 'justify', maxWidth: textMaxWidth });
      currentY += lines3.length * lineHeight + 10;

      const text4 = `Asimismo, queremos recordar que, en el marco de la formación integral de nuestros futbolistas, se solicita que los jugadores mantengan una presentación acorde a los lineamientos establecidos. Por ello, queda prohibido el uso de aros, piercings, cortes en la ceja, cabello teñido u otros elementos que no se ajusten a la imagen profesional que buscamos proyectar en nuestros seleccionados.`;
      const lines4 = doc.splitTextToSize(text4, textMaxWidth);
      doc.text(lines4, marginX, currentY, { align: 'justify', maxWidth: textMaxWidth });
      currentY += lines4.length * lineHeight + 10;

      const text5 = `Aprovechamos la ocasión para agradecer desde ya la buena disposición de su club para con nuestra Selección Nacional, y esperamos una favorable acogida.`;
      const lines5 = doc.splitTextToSize(text5, textMaxWidth);
      doc.text(lines5, marginX, currentY, { align: 'justify', maxWidth: textMaxWidth });
      currentY += lines5.length * lineHeight + 15;

      doc.text("Le saluda cordialmente,", marginX, currentY);

      // Signature (Image + Text)
      if (signatureImg.complete && signatureImg.naturalWidth !== 0) {
        // Adjust values for size/position as needed. Centered above the text.
        doc.addImage(signatureImg, 'PNG', 85, 240, 40, 20); 
      }

      doc.setFont("helvetica", "bold");
      doc.text("Felipe Correa", 105, 265, { align: 'center' });
      doc.setFontSize(9);
      doc.text("Gerente de Selecciones Nacionales", 105, 270, { align: 'center' });

      // Save
      doc.save(`Carta_Convocatoria_${clubName.replace(/\s+/g, '_')}.pdf`);
    };
  };

  const generatePDFByClub = (clubName: string, players: User[]) => {
    try {
      const blob = generatePDFBlob(clubName, players);
      const fileName = `Citacion_${clubName.replace(/\s+/g, '_')}_Microciclo_${selectedMicro?.id}.pdf`;
      saveAs(blob, fileName);
    } catch (err) {
      console.error("Error generating individual PDF:", err);
      alert("Hubo un error al generar el PDF del club.");
    }
  };

  const generateAllClubsPDF = async () => {
    const zip = new JSZip();
    const folder = zip.folder(`Citaciones_Microciclo_${selectedMicro?.id}`);
    
    const entries = Object.entries(citadosByClub);
    
    if (entries.length === 0) {
      alert("No hay jugadores citados para este proceso.");
      return;
    }

    try {
      entries.forEach(([clubName, players]) => {
        const blob = generatePDFBlob(clubName, players);
        folder?.file(`Citacion_${clubName.replace(/\s+/g, '_')}.pdf`, blob);
      });
      
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `Nóminas_Completas_Microciclo_${selectedMicro?.id}.zip`);
    } catch (err) {
      console.error("Error generating ZIP:", err);
      alert("Hubo un error al generar el archivo comprimido.");
    }
  };

  if (viewMode === 'grid') {
    return (
      <div className="space-y-8 animate-in fade-in duration-500 pb-20">
        <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-[#0b1220] rounded-2xl flex items-center justify-center text-white shadow-xl">
              <i className="fa-solid fa-clipboard-list text-xl"></i>
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">CITACIONES OFICIALES</h2>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mt-1">Gestión y oficialización de convocatorias.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => { fetchMicrocycles(); fetchAllPlayers(); }}
              className="bg-white text-slate-900 px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2"
              title="Recargar datos"
            >
              <i className={`fa-solid fa-rotate-right ${loadingMicros ? 'fa-spin' : ''}`}></i>
            </button>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-[#CF1B2B] text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-red-700 transition-all flex items-center gap-2 transform active:scale-95"
            >
              <i className="fa-solid fa-plus"></i> NUEVO MICROCICLO
            </button>
          </div>
        </div>

        {/* Filtros de Categoría */}
        <div className="flex items-center gap-3 overflow-x-auto pb-4 custom-scrollbar">
          <button
            onClick={() => setSelectedCategoryFilter('TODOS')}
            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap shadow-sm ${
              selectedCategoryFilter === 'TODOS'
                ? 'bg-slate-900 text-white shadow-xl scale-105'
                : 'bg-white text-slate-400 hover:bg-slate-50 border border-slate-100'
            }`}
          >
            TODOS
          </button>
          {Object.values(Category).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategoryFilter(cat)}
              className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap shadow-sm ${
                selectedCategoryFilter === cat
                  ? 'bg-[#CF1B2B] text-white shadow-xl scale-105'
                  : 'bg-white text-slate-400 hover:bg-slate-50 border border-slate-100'
              }`}
            >
              {formatCategoryLabel(cat)}
            </button>
          ))}
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl mb-6">
            <p className="font-bold text-sm">Error: {errorMsg}</p>
            <p className="text-xs mt-1">Verifica tu conexión o permisos.</p>
          </div>
        )}

        {loadingMicros ? (
          <div className="py-32 text-center animate-pulse">
            <i className="fa-solid fa-spinner fa-spin text-slate-200 text-5xl mb-6"></i>
            <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest italic">Sincronizando procesos...</p>
          </div>
        ) : filteredMicrociclos.length === 0 ? (
          <div className="py-32 text-center opacity-40">
            <i className="fa-solid fa-folder-open text-slate-300 text-6xl mb-6"></i>
            <p className="text-slate-500 font-black uppercase text-xs tracking-widest">No hay microciclos registrados</p>
            <p className="text-slate-400 text-[10px] mt-2">Crea uno nuevo o cambia el filtro para comenzar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredMicrociclos.map((mc) => (
              <div key={mc.id} onClick={() => handleSelectMicro(mc)} className="group bg-white rounded-[40px] p-10 border-2 border-slate-50 transition-all cursor-pointer hover:shadow-2xl hover:border-red-200 relative overflow-hidden flex flex-col justify-between min-h-[360px]">
                <div className="flex justify-between items-start mb-6">
                  <span className="bg-blue-600 text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm">
                    {formatCategoryLabel(mc.category_id)}
                  </span>
                  <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 shadow-inner">
                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">{mc.player_count} CITADOS</span>
                  </div>
                </div>
                
                <div className="flex-1 space-y-1">
                  <h3 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter leading-none group-hover:text-[#CF1B2B] transition-colors">
                    {mc.nombre_display} #{(mc as any).micro_number || mc.id}
                  </h3>
                  <p className="text-slate-400 font-bold uppercase text-[12px] tracking-widest">
                    {formatDate(mc.start_date)} - {formatDate(mc.end_date)}
                  </p>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">
                    {mc.type.toUpperCase()}
                  </p>
                </div>

                <div className="pt-8 border-t border-slate-50 flex justify-between items-center">
                  <span className="text-[11px] font-black text-[#CF1B2B] uppercase italic tracking-widest">
                    {mc.city.toUpperCase()}, {mc.country.toUpperCase()}
                  </span>
                  <div className="flex items-center gap-2 text-slate-200 group-hover:text-slate-900 transition-colors">
                    <span className="text-[9px] font-black uppercase tracking-widest">ABRIR</span>
                    <i className="fa-solid fa-chevron-right text-[8px]"></i>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal de Creación */}
        {showCreateModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#0b1220]/90 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-xl rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="bg-[#0b1220] p-10 text-white relative">
                <button onClick={() => setShowCreateModal(false)} className="absolute top-8 right-8 text-white/20 hover:text-white transition-colors">
                  <i className="fa-solid fa-xmark text-xl"></i>
                </button>
                <h3 className="text-2xl font-black uppercase italic tracking-tighter">CONFIGURAR NUEVO PROCESO</h3>
                <p className="text-[#CF1B2B] font-black uppercase text-[10px] tracking-[0.3em] mt-2">ALTA DE MICROCICLO OFICIAL</p>
              </div>
              <form onSubmit={handleCreateMicrocycle} className="p-10 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Categoría</label>
                    <select 
                      className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                      value={newMicroForm.category}
                      onChange={e => setNewMicroForm({...newMicroForm, category: e.target.value as Category})}
                    >
                      {Object.values(Category).map(cat => (
                        <option key={cat} value={cat}>{formatCategoryLabel(cat)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Tipo de Proceso</label>
                    <select 
                      className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                      value={newMicroForm.type}
                      onChange={e => setNewMicroForm({...newMicroForm, type: e.target.value})}
                    >
                      {TIPO_PROCESO_OPTIONS.map(opt => <option key={opt} value={opt}>{opt.toUpperCase()}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Fecha Inicio</label>
                    <input 
                      required type="date" 
                      className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                      value={newMicroForm.start_date}
                      onChange={e => setNewMicroForm({...newMicroForm, start_date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Fecha Término</label>
                    <input 
                      required type="date" 
                      className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                      value={newMicroForm.end_date}
                      onChange={e => setNewMicroForm({...newMicroForm, end_date: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Ciudad</label>
                    <input 
                      required type="text" 
                      className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                      value={newMicroForm.city}
                      onChange={e => setNewMicroForm({...newMicroForm, city: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">País</label>
                    <input 
                      required type="text" 
                      className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                      value={newMicroForm.country}
                      onChange={e => setNewMicroForm({...newMicroForm, country: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <input 
                    type="checkbox" 
                    id="copyNomina"
                    className="w-5 h-5 rounded-md text-red-600 focus:ring-red-500 border-gray-300"
                    checked={copyLastNomina}
                    onChange={e => setCopyLastNomina(e.target.checked)}
                  />
                  <label htmlFor="copyNomina" className="text-[10px] font-black uppercase text-slate-600 tracking-widest cursor-pointer select-none">
                    Copiar nómina del último microciclo
                  </label>
                </div>

                <button 
                  type="submit" 
                  disabled={creating}
                  className="w-full mt-4 py-5 bg-[#CF1B2B] text-white rounded-[24px] text-xs font-black uppercase tracking-widest shadow-xl hover:bg-red-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {creating ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-cloud-arrow-up"></i>}
                  {creating ? 'PROCESANDO...' : 'CONFIRMAR Y CREAR'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (viewMode === 'clubs') {
    return (
      <div className="space-y-8 animate-in fade-in duration-500 pb-20">
        <div className="bg-[#0b1220] rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full -mr-48 -mt-48 blur-3xl"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <button 
                onClick={() => setViewMode('selection')}
                className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-white/40 hover:text-white hover:bg-red-600 transition-all border border-white/10"
              >
                <i className="fa-solid fa-arrow-left text-xl"></i>
              </button>
              <div>
                <h2 className="text-4xl font-black uppercase italic tracking-tighter leading-none">NÓMINA <span className="text-red-600">POR CLUB</span></h2>
                <div className="flex items-center gap-3 mt-2">
                   <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{selectedMicro?.type}</span>
                   <span className="text-red-600 text-[10px] font-black uppercase tracking-widest">|</span>
                   <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{formatCategoryLabel(selectedMicro?.category_id)}</span>
                </div>
              </div>
            </div>
            
            <button 
              onClick={generateAllClubsPDF}
              className="bg-white text-slate-900 px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-slate-50 transition-all flex items-center gap-3 transform active:scale-95"
            >
              <i className="fa-solid fa-file-zipper text-lg text-[#CF1B2B]"></i> DESCARGAR TODO (.ZIP)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {Object.entries(citadosByClub).sort((a,b) => a[0].localeCompare(b[0])).map(([clubName, players]) => (
            <div key={clubName} className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden flex flex-col group hover:shadow-xl transition-all">
              <div className="p-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-900 font-black italic border border-slate-200">
                    {clubName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-tighter leading-none mb-1">{clubName}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{players.length} JUGADORES</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => generateFormalLetterPDF(clubName, players)}
                    className="w-10 h-10 bg-[#CF1B2B]/5 border border-[#CF1B2B]/20 text-[#CF1B2B] hover:bg-[#CF1B2B] hover:text-white rounded-xl flex items-center justify-center transition-all shadow-sm"
                    title="Generar Carta Formal de Convocatoria"
                  >
                    <i className="fa-solid fa-file-invoice"></i>
                  </button>
                  <button 
                    onClick={() => generatePDFByClub(clubName, players)}
                    className="w-10 h-10 bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 rounded-xl flex items-center justify-center transition-all shadow-sm"
                    title="Descargar Nómina (Lista)"
                  >
                    <i className="fa-solid fa-download"></i>
                  </button>
                </div>
              </div>
              
              <div className="p-6 flex-1 space-y-3">
                {players.sort((a,b) => a.name.localeCompare(b.name)).map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-[10px] font-black italic">
                        {p.name.charAt(0)}
                      </div>
                      <span className="text-[11px] font-bold text-slate-700 uppercase">{p.name}</span>
                    </div>
                    <span className="text-[9px] font-black text-red-600 uppercase tracking-widest bg-red-50 px-2.5 py-1 rounded-full">{p.position}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-160px)] gap-6 animate-in fade-in transform-gpu">
      <div className="w-full lg:w-[380px] bg-[#0b1220] rounded-[48px] flex flex-col overflow-hidden shadow-2xl border border-white/5">
        <div className="p-10 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => setViewMode('grid')} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-[#CF1B2B] transition-all">
              <i className="fa-solid fa-arrow-left"></i>
            </button>
            <button 
              onClick={() => setViewMode('clubs')}
              className="bg-red-600/20 text-red-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all flex items-center gap-2 border border-red-600/30 shadow-lg shadow-red-900/20"
            >
              <i className="fa-solid fa-file-pdf"></i> Nómina por Club
            </button>
          </div>
          <h3 className="text-white text-xl font-black uppercase italic tracking-tighter leading-none mb-1">NÓMINA OFICIAL</h3>
          <p className="text-[#CF1B2B] text-[10px] font-black uppercase tracking-[0.2em]">MICROCICLO #{selectedMicro?.id}</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {loadingCitados ? (
             <div className="py-24 text-center animate-pulse opacity-40">
                <i className="fa-solid fa-spinner fa-spin text-white text-4xl mb-4"></i>
                <p className="text-white text-[10px] font-black uppercase tracking-widest">Cargando...</p>
             </div>
          ) : sortedCitados.length === 0 ? (
            <div className="py-24 text-center opacity-20">
              <i className="fa-solid fa-user-plus text-white text-5xl mb-6"></i>
              <p className="text-white text-[10px] font-black uppercase tracking-widest">NÓMINA VACÍA</p>
              <p className="text-white text-[8px] font-medium uppercase mt-2">Agregue jugadores del panel derecho</p>
            </div>
          ) : (
            sortedCitados.map(p => (
              <div key={p.id} className="bg-white/5 p-5 rounded-[28px] border border-white/5 group hover:bg-white/10 transition-all border-l-4 border-l-[#CF1B2B]">
                <div className="flex items-center justify-between text-white">
                  <div>
                    <p className="text-[11px] font-black uppercase italic leading-none mb-1">{p.name}</p>
                    <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest truncate w-48">
                      <span className="text-[#CF1B2B]">{p.position}</span> | {p.club}
                    </p>
                  </div>
                  <button onClick={() => p.id_del_jugador && handleUncite(p.id_del_jugador)} className="w-8 h-8 rounded-lg bg-[#CF1B2B]/10 text-[#CF1B2B] flex items-center justify-center hover:bg-[#CF1B2B] hover:text-white transition-all">
                    <i className="fa-solid fa-user-minus text-[10px]"></i>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-8 border-t border-white/5">
          <div className="flex justify-between items-center mb-6 px-2">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Citados:</span>
            <span className="text-xl font-black text-white italic">{citadosIds.length}</span>
          </div>
          <button onClick={handleConfirmNomina} disabled={confirming} className="w-full py-5 bg-[#CF1B2B] text-white rounded-[24px] font-black uppercase tracking-widest shadow-xl hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-3">
            {confirming ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-cloud-arrow-up"></i>}
            {confirming ? 'PROCESANDO...' : 'OFICIALIZAR NÓMINA'}
          </button>
        </div>
      </div>

      <div className="flex-1 bg-[#f8fafc] rounded-[48px] border border-slate-200 shadow-sm flex flex-col overflow-hidden relative">
        <div className="p-10 bg-white border-b border-slate-200">
           <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
             <div className="md:col-span-4 relative">
               <i className="fa-solid fa-magnifying-glass absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 text-sm"></i>
               <input type="text" placeholder="BUSCAR ATLETA..." className="w-full bg-slate-50 p-5 pl-14 rounded-[24px] font-black text-[11px] uppercase tracking-widest outline-none focus:ring-4 focus:ring-red-500/10 border-none transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
             </div>
             <div className="md:col-span-3">
               <select className="w-full bg-slate-50 p-5 rounded-[24px] font-black text-[10px] uppercase tracking-widest outline-none appearance-none cursor-pointer border-none shadow-sm" value={selectedCategoryPlayer} onChange={e => setSelectedCategoryPlayer(e.target.value)}>
                 <option value="TODOS">CAT: TODAS</option>
                 {Object.values(Category).map(cat => (
                   <option key={cat} value={cat}>{formatCategoryLabel(cat)}</option>
                 ))}
               </select>
             </div>
             <div className="md:col-span-2">
               <select className="w-full bg-slate-50 p-5 rounded-[24px] font-black text-[10px] uppercase tracking-widest outline-none appearance-none cursor-pointer border-none shadow-sm" value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
                 <option value="TODOS">CLASE: TODAS</option>
                 {availableYears.map(y => <option key={y} value={y.toString()}>{y}</option>)}
               </select>
             </div>
              <div className="md:col-span-3 relative">
                <button 
                  onClick={() => setShowPosDropdown(!showPosDropdown)}
                  className="w-full bg-slate-50 p-5 rounded-[24px] font-black text-[10px] uppercase tracking-widest outline-none border-none shadow-sm flex justify-between items-center text-left"
                >
                  <span className="truncate">POS: {selectedPositions.includes('TODAS') ? 'TODAS' : selectedPositions.join(', ')}</span>
                  <i className={`fa-solid fa-chevron-down text-slate-400 transition-transform ${showPosDropdown ? 'rotate-180' : ''}`}></i>
                </button>
                
                {showPosDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-[24px] shadow-xl border border-slate-100 p-2 z-50 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-200">
                    <button
                      onClick={() => {
                        setSelectedPositions(['TODAS']);
                        setShowPosDropdown(false);
                      }}
                      className={`p-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-left transition-all flex justify-between items-center ${selectedPositions.includes('TODAS') ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                      TODAS
                      {selectedPositions.includes('TODAS') && <i className="fa-solid fa-check"></i>}
                    </button>
                    {['ARQ', 'DEF', 'VOL', 'DEL'].map(pos => {
                      const isSelected = selectedPositions.includes(pos);
                      return (
                        <button
                          key={pos}
                          onClick={() => togglePosition(pos)}
                          className={`p-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-left transition-all flex justify-between items-center ${isSelected ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                          {pos}
                          {isSelected && <i className="fa-solid fa-check"></i>}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto relative p-8">
          {loadingPlayers ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-20 backdrop-blur-sm">
              <i className="fa-solid fa-spinner fa-spin text-[#CF1B2B] text-5xl mb-6"></i>
              <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest italic animate-pulse">Sincronizando...</p>
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-10">
              <i className="fa-solid fa-users-slash text-slate-200 text-4xl mb-4"></i>
              <p className="text-slate-900 font-black uppercase text-xs tracking-widest italic mb-2">SIN COINCIDENCIAS</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-12 gap-y-10 pr-6">
              {filteredPlayers.map(p => {
                const isCited = p.id_del_jugador && citadosIds.includes(p.id_del_jugador);
                return (
                  <div key={p.id} className={`group relative bg-white p-6 rounded-[36px] border transition-all flex items-center justify-between shadow-sm hover:shadow-xl hover:-translate-y-1 ${isCited ? 'border-emerald-200 bg-emerald-50/10' : 'border-slate-100'}`}>
                    
                    {/* Botón Citación (Más pequeño y abajo para no superponer nombre) */}
                    <button 
                      onClick={() => p.id_del_jugador && (isCited ? handleUncite(p.id_del_jugador) : handleCite(p.id_del_jugador))}
                      className={`absolute right-[-1px] bottom-4 w-[24px] h-[32px] rounded-l-[10px] flex flex-col items-center justify-center transition-all border-y border-l shadow-sm active:scale-95 z-10 ${
                        isCited 
                          ? 'bg-emerald-600 text-white border-emerald-500' 
                          : 'bg-[#f8fafc] text-slate-300 hover:bg-[#CF1B2B] hover:text-white border-slate-200'
                      }`}
                    >
                      <i className={`fa-solid ${isCited ? 'fa-check' : 'fa-plus'} text-[10px] font-black`}></i>
                    </button>

                    <div className="flex items-center gap-5">
                      {/* Avatar Bubble */}
                      <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center text-2xl font-black italic transition-all shadow-inner ${isCited ? 'bg-emerald-500 text-white' : 'bg-[#0b1220] text-white'}`}>
                        {p.name?.charAt(0)}
                      </div>
                      <div className="overflow-hidden pr-4">
                        <p className={`text-[11px] font-black uppercase italic tracking-tighter leading-none mb-1 truncate ${isCited ? 'text-emerald-700' : 'text-slate-900'}`}>
                          {p.name}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate flex items-center gap-1.5 opacity-90">
                          {p.club} <span className="text-slate-200">|</span> <span className={isCited ? 'text-emerald-500' : 'text-slate-500'}>{p.position}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }`}</style>
    </div>
  )
}
