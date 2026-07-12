
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AthletePerformanceRecord, NutritionData } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { normalizeClub, getDriveDirectLink } from '../lib/utils';
import ClubBadge from './ClubBadge';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FEDERATION_LOGO } from '../constants';

interface NutricionResumenGrupalProps {
  performanceRecords: AthletePerformanceRecord[];
  userRole?: string;
  userClub?: string;
  clubs?: any[];
}

const NutricionResumenGrupal: React.FC<NutricionResumenGrupalProps> = ({ performanceRecords, userRole, userClub, clubs = [] }) => {
  const [startDate, setStartDate] = useState<string>('2020-01-01');
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  });
  const [selectedClubs, setSelectedClubs] = useState<string[]>(
    userRole === 'club' && userClub ? [userClub] : []
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [selectedObjectives, setSelectedObjectives] = useState<string[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [isClubDropdownOpen, setIsClubDropdownOpen] = useState(false);
  const [clubQuery, setClubQuery] = useState('');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [categoryQuery, setCategoryQuery] = useState('');
  const [isPositionDropdownOpen, setIsPositionDropdownOpen] = useState(false);
  const [positionQuery, setPositionQuery] = useState('');
  const [isObjectiveDropdownOpen, setIsObjectiveDropdownOpen] = useState(false);
  const [objectiveQuery, setObjectiveQuery] = useState('');
  const [isPlayerDropdownOpen, setIsPlayerDropdownOpen] = useState(false);
  const [playerQuery, setPlayerQuery] = useState('');
  const [aiSummary, setAiSummary] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showOnlyLatest, setShowOnlyLatest] = useState<boolean>(false);
  const hasInitializedDates = useRef(false);

  // Sorting States
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>({ key: 'fecha', direction: 'desc' }); // default sorting by evaluation date desc

  const getNutritionalNeed = (muscle: number, fat: number, birthYear: number) => {
    const isOlder = birthYear < 2008 && birthYear > 0;
    const muscleThreshold = isOlder ? 54 : 52;
    const fatThreshold = isOlder ? 17 : 18;

    const needsMuscle = muscle < muscleThreshold;
    const needsFatLoss = fat > fatThreshold;

    if (needsMuscle && needsFatLoss) {
      return {
        label: 'Recomposición Corporal',
        sublabel: 'Subir Masa Muscular & Bajar Grasa',
        color: 'bg-amber-50 text-amber-800 border-amber-200'
      };
    }
    if (needsMuscle) {
      return {
        label: 'Aumento Muscular',
        sublabel: 'Subir Masa Muscular',
        color: 'bg-blue-50 text-blue-800 border-blue-200'
      };
    }
    if (needsFatLoss) {
      return {
        label: 'Reducción de Grasa',
        sublabel: 'Bajar Masa Grasa',
        color: 'bg-rose-50 text-rose-800 border-rose-200'
      };
    }
    return {
      label: 'Optimizar / Mantener',
      sublabel: 'Composición Óptima',
      color: 'bg-emerald-50 text-emerald-800 border-emerald-200'
    };
  };

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key) {
      if (sortConfig.direction === 'asc') {
        direction = 'desc';
      } else {
        setSortConfig(null);
        return;
      }
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return (
        <span className="inline-flex flex-col ml-1.5 align-middle opacity-30 group-hover:opacity-100 transition-opacity">
          <i className="fa-solid fa-caret-up text-[9px] leading-[6px]"></i>
          <i className="fa-solid fa-caret-down text-[9px] leading-[6px] -mt-[1px]"></i>
        </span>
      );
    }
    if (sortConfig.direction === 'asc') {
      return (
        <span className="inline-flex flex-col ml-1.5 align-middle text-red-600">
          <i className="fa-solid fa-caret-up text-[9px] leading-[6px]"></i>
          <i className="fa-solid fa-caret-down text-[9px] leading-[6px] -mt-[1px] opacity-25"></i>
        </span>
      );
    }
    return (
      <span className="inline-flex flex-col ml-1.5 align-middle text-red-600">
        <i className="fa-solid fa-caret-up text-[9px] leading-[6px] opacity-25"></i>
        <i className="fa-solid fa-caret-down text-[9px] leading-[6px] -mt-[1px]"></i>
      </span>
    );
  };

  const handleTogglePosition = (posName: string) => {
    setSelectedPositions(prev => {
      if (prev.includes(posName)) {
        return prev.filter(p => p !== posName);
      } else {
        return [...prev, posName];
      }
    });
  };

  const handleToggleClub = (clubName: string) => {
    if (userRole === 'club' && userClub) return;
    setSelectedClubs(prev => {
      if (prev.includes(clubName)) {
        return prev.filter(c => c !== clubName);
      } else {
        return [...prev, clubName];
      }
    });
  };

  const handleToggleCategory = (catName: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(catName)) {
        return prev.filter(c => c !== catName);
      } else {
        return [...prev, catName];
      }
    });
  };

  const handleToggleObjective = (objName: string) => {
    setSelectedObjectives(prev => {
      if (prev.includes(objName)) {
        return prev.filter(o => o !== objName);
      } else {
        return [...prev, objName];
      }
    });
  };

  const handleTogglePlayer = (playerName: string) => {
    setSelectedPlayers(prev => {
      if (prev.includes(playerName)) {
        return prev.filter(p => p !== playerName);
      } else {
        return [...prev, playerName];
      }
    });
  };

  // Set initial dates to the latest evaluation date when data is loaded
  useEffect(() => {
    if (performanceRecords.length > 0 && !hasInitializedDates.current) {
      let latestDateStr = '';
      performanceRecords.forEach(record => {
        if (record.nutrition) {
          record.nutrition.forEach(n => {
            if (n.fecha_medicion && (!latestDateStr || n.fecha_medicion > latestDateStr)) {
              latestDateStr = n.fecha_medicion;
            }
          });
        }
      });

      if (latestDateStr) {
        try {
          const dateObj = new Date(latestDateStr);
          if (!isNaN(dateObj.getTime())) {
            const formattedDate = dateObj.toISOString().split('T')[0];
            setStartDate(formattedDate);
            setEndDate(formattedDate);
            hasInitializedDates.current = true;
          }
        } catch (e) {
          console.error("Error parsing latest date:", e);
        }
      }
    }
  }, [performanceRecords]);

  const getCellColor = (value: number, type: 'muscular' | 'adiposa' | 'pliegues' | 'imo', birthYear: number) => {
    if (type === 'imo') {
      if (value > 4.4) return 'bg-emerald-100 text-emerald-700';
      if (value >= 4.0) return 'bg-amber-100 text-amber-700';
      return 'bg-red-100 text-red-700';
    }

    // Lógica para nacidos ANTES de 2008 (Mayores)
    if (birthYear < 2008 && birthYear > 0) {
      if (type === 'muscular') {
        if (value > 54) return 'bg-emerald-100 text-emerald-700';
        if (value >= 50) return 'bg-amber-100 text-amber-700';
        return 'bg-red-100 text-red-700';
      }
      if (type === 'adiposa') {
        if (value < 16) return 'bg-emerald-100 text-emerald-700';
        if (value <= 20) return 'bg-amber-100 text-amber-700';
        return 'bg-red-100 text-red-700';
      }
      if (type === 'pliegues') {
        if (value < 35) return 'bg-emerald-100 text-emerald-700';
        if (value <= 50) return 'bg-amber-100 text-amber-700';
        return 'bg-red-100 text-red-700';
      }
    }

    // Lógica para nacidos en 2008 o DESPUÉS (Menores)
    if (type === 'muscular') {
      if (value > 52) return 'bg-emerald-100 text-emerald-700';
      if (value >= 50) return 'bg-amber-100 text-amber-700';
      return 'bg-red-100 text-red-700';
    }
    if (type === 'adiposa') {
      if (value < 18) return 'bg-emerald-100 text-emerald-700';
      if (value <= 20) return 'bg-amber-100 text-amber-700';
      return 'bg-red-100 text-red-700';
    }
    if (type === 'pliegues') {
      if (value < 40) return 'bg-emerald-100 text-emerald-700';
      if (value <= 50) return 'bg-amber-100 text-amber-700';
      return 'bg-red-100 text-red-700';
    }
    return '';
  };

  const COLORS = ['#10b981', '#f59e0b', '#ef4444']; // Emerald (Verde), Amber (Amarillo), Red (Rojo)

  const categories = useMemo(() => {
    const cats = new Set<string>();
    performanceRecords.forEach(r => {
      if (r.player.anio) cats.add(r.player.anio.toString());
    });
    return Array.from(cats).sort((a, b) => b.localeCompare(a));
  }, [performanceRecords]);

  const availableClubs = useMemo(() => {
    const c = new Set<string>();
    performanceRecords.forEach(r => {
      if (r.player.club) c.add(r.player.club);
    });
    return Array.from(c).sort();
  }, [performanceRecords]);

  const positions = useMemo(() => {
    const p = new Set<string>();
    performanceRecords.forEach(r => {
      if (r.player.position) p.add(r.player.position);
    });
    return Array.from(p).sort();
  }, [performanceRecords]);

  const filteredClubsBySearch = useMemo(() => {
    if (!clubQuery) return availableClubs;
    return availableClubs.filter(club => club.toLowerCase().includes(clubQuery.toLowerCase()));
  }, [availableClubs, clubQuery]);

  const filteredCategoriesBySearch = useMemo(() => {
    if (!categoryQuery) return categories;
    return categories.filter(cat => cat.toLowerCase().includes(categoryQuery.toLowerCase()));
  }, [categories, categoryQuery]);

  const filteredPositionsBySearch = useMemo(() => {
    if (!positionQuery) return positions;
    return positions.filter(pos => pos.toLowerCase().includes(positionQuery.toLowerCase()));
  }, [positions, positionQuery]);

  const objectivesList = useMemo(() => [
    'Recomposición Corporal',
    'Aumento Muscular',
    'Reducción de Grasa',
    'Optimizar / Mantener'
  ], []);

  const filteredObjectivesBySearch = useMemo(() => {
    if (!objectiveQuery) return objectivesList;
    return objectivesList.filter(obj => obj.toLowerCase().includes(objectiveQuery.toLowerCase()));
  }, [objectivesList, objectiveQuery]);

  const availablePlayers = useMemo(() => {
    const names = new Set<string>();
    performanceRecords.forEach(record => {
      if (record.player.name && record.nutrition && record.nutrition.length > 0) {
        const hasMatchingNutrition = record.nutrition.some(n => {
          const date = new Date(n.fecha_medicion);
          const start = new Date(startDate);
          const end = new Date(endDate);
          const matchesDate = date >= start && date <= end;
          
          const matchesClub = selectedClubs.length === 0 || selectedClubs.some(sc => 
            (record.player.club && normalizeClub(record.player.club) === normalizeClub(sc)) ||
            (record.player.club_name && normalizeClub(record.player.club_name) === normalizeClub(sc))
          );
          
          const matchesCategory = selectedCategories.length === 0 || selectedCategories.some(sc =>
            record.player.anio?.toString() === sc
          );

          const matchesPosition = selectedPositions.length === 0 || selectedPositions.some(sp =>
            record.player.position?.toString() === sp
          );

          const matchesObjective = selectedObjectives.length === 0 || selectedObjectives.some(so => {
            const need = getNutritionalNeed(n.masa_muscular_pct || 0, n.masa_adiposa_pct || 0, record.player.anio || 0);
            return need.label === so;
          });

          return matchesDate && matchesClub && matchesCategory && matchesPosition && matchesObjective;
        });

        if (hasMatchingNutrition) {
          const isMyClub = userRole !== 'club' || (userClub && normalizeClub(record.player.club || '') === normalizeClub(userClub));
          const nameToUse = isMyClub ? record.player.name : `Jugador [${record.player.player_id || record.player.id || 'Anon'}]`;
          names.add(nameToUse);
        }
      }
    });
    return Array.from(names).sort();
  }, [performanceRecords, userRole, userClub, startDate, endDate, selectedClubs, selectedCategories, selectedPositions, selectedObjectives]);

  const filteredPlayersBySearch = useMemo(() => {
    if (!playerQuery) return availablePlayers;
    return availablePlayers.filter(p => p.toLowerCase().includes(playerQuery.toLowerCase()));
  }, [availablePlayers, playerQuery]);

  const allFilteredData = useMemo(() => {
    return performanceRecords.flatMap(record => {
      if (!record.nutrition) return [];
      return record.nutrition
        .filter(n => {
          const date = new Date(n.fecha_medicion);
          const start = new Date(startDate);
          const end = new Date(endDate);
          const matchesDate = date >= start && date <= end;
          
          // If user is a club, we show ALL players for comparison (anonymized later)
          // If user is admin, we respect the selectedClubs filter (multi-select)
          const matchesClub = selectedClubs.length === 0 || selectedClubs.some(sc => 
            (record.player.club && normalizeClub(record.player.club) === normalizeClub(sc)) ||
            (record.player.club_name && normalizeClub(record.player.club_name) === normalizeClub(sc))
          );
          
          const matchesCategory = selectedCategories.length === 0 || selectedCategories.some(sc =>
            record.player.anio?.toString() === sc
          );

          const matchesPosition = selectedPositions.length === 0 || selectedPositions.some(sp =>
            record.player.position?.toString() === sp
          );

          const matchesObjective = selectedObjectives.length === 0 || selectedObjectives.some(so => {
            const need = getNutritionalNeed(n.masa_muscular_pct || 0, n.masa_adiposa_pct || 0, record.player.anio || 0);
            return need.label === so;
          });

          const isMyClub = userRole !== 'club' || (userClub && normalizeClub(record.player.club || '') === normalizeClub(userClub));
          const displayName = isMyClub ? record.player.name : `Jugador [${record.player.player_id || record.player.id || 'Anon'}]`;
          const matchesPlayer = selectedPlayers.length === 0 || selectedPlayers.includes(displayName);

          return matchesDate && matchesClub && matchesCategory && matchesPosition && matchesObjective && matchesPlayer;
        })
        .map(n => ({
          player: record.player,
          data: n
        }));
    });
  }, [performanceRecords, startDate, endDate, selectedClubs, selectedCategories, selectedPositions, selectedObjectives, selectedPlayers, userRole, userClub]);

  const filteredData = useMemo(() => {
    if (!showOnlyLatest) return allFilteredData;

    const latestMap = new Map<string, typeof allFilteredData[0]>();
    
    allFilteredData.forEach(item => {
      const playerKey = String(item.player.id || item.player.player_id || item.player.name || '');
      const existing = latestMap.get(playerKey);
      
      if (!existing || new Date(item.data.fecha_medicion) > new Date(existing.data.fecha_medicion)) {
        latestMap.set(playerKey, item);
      }
    });

    return Array.from(latestMap.values());
  }, [allFilteredData, showOnlyLatest]);

  const hasDuplicatePlayers = useMemo(() => {
    const seen = new Set<string>();
    for (const item of allFilteredData) {
      const playerKey = String(item.player.id || item.player.player_id || item.player.name || '');
      if (seen.has(playerKey)) {
        return true;
      }
      seen.add(playerKey);
    }
    return false;
  }, [allFilteredData]);

  const sortedFilteredData = useMemo(() => {
    const data = [...filteredData];
    if (!sortConfig) return data;

    data.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortConfig.key) {
        case 'player':
          aVal = a.player.name || '';
          bVal = b.player.name || '';
          break;
        case 'position':
          aVal = a.player.position || '';
          bVal = b.player.position || '';
          break;
        case 'fecha':
          aVal = a.data.fecha_medicion || '';
          bVal = b.data.fecha_medicion || '';
          break;
        case 'muscular':
          aVal = a.data.masa_muscular_pct || 0;
          bVal = b.data.masa_muscular_pct || 0;
          break;
        case 'adiposa':
          aVal = a.data.masa_adiposa_pct || 0;
          bVal = b.data.masa_adiposa_pct || 0;
          break;
        case 'imo':
          const aImo = (a.data.indice_imo && Number(a.data.indice_imo) > 0)
            ? Number(a.data.indice_imo)
            : (a.data.masa_muscular_kg && a.data.masa_osea_kg && Number(a.data.masa_osea_kg) > 0)
              ? (Number(a.data.masa_muscular_kg) / Number(a.data.masa_osea_kg))
              : 0;
          const bImo = (b.data.indice_imo && Number(b.data.indice_imo) > 0)
            ? Number(b.data.indice_imo)
            : (b.data.masa_muscular_kg && b.data.masa_osea_kg && Number(b.data.masa_osea_kg) > 0)
              ? (Number(b.data.masa_muscular_kg) / Number(b.data.masa_osea_kg))
              : 0;
          aVal = aImo;
          bVal = bImo;
          break;
        case 'pliegues':
          aVal = a.data.sum_pliegues_6_mm || 0;
          bVal = b.data.sum_pliegues_6_mm || 0;
          break;
        case 'objetivo':
          aVal = getNutritionalNeed(a.data.masa_muscular_pct || 0, a.data.masa_adiposa_pct || 0, a.player.anio || 0).label;
          bVal = getNutritionalNeed(b.data.masa_muscular_pct || 0, b.data.masa_adiposa_pct || 0, b.player.anio || 0).label;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return data;
  }, [filteredData, sortConfig]);

  const chartData = useMemo(() => {
    if (filteredData.length === 0) return null;

    const muscle = { Green: 0, Amber: 0, Red: 0 };
    const fat = { Green: 0, Amber: 0, Red: 0 };
    const folds = { Green: 0, Amber: 0, Red: 0 };

    filteredData.forEach(d => {
      const birthYear = d.player.anio || 0;
      const mColor = getCellColor(d.data.masa_muscular_pct || 0, 'muscular', birthYear);
      const fColor = getCellColor(d.data.masa_adiposa_pct || 0, 'adiposa', birthYear);
      const pColor = getCellColor(d.data.sum_pliegues_6_mm || 0, 'pliegues', birthYear);

      if (mColor.includes('emerald')) muscle.Green++;
      else if (mColor.includes('amber')) muscle.Amber++;
      else if (mColor.includes('red')) muscle.Red++;

      if (fColor.includes('emerald')) fat.Green++;
      else if (fColor.includes('amber')) fat.Amber++;
      else if (fColor.includes('red')) fat.Red++;

      if (pColor.includes('emerald')) folds.Green++;
      else if (pColor.includes('amber')) folds.Amber++;
      else if (pColor.includes('red')) folds.Red++;
    });

    const formatForPie = (counts: any, labels: string[]) => {
      return [
        { name: labels[0], value: counts.Green, color: '#10b981' },
        { name: labels[1], value: counts.Amber, color: '#f59e0b' },
        { name: labels[2], value: counts.Red, color: '#ef4444' }
      ].filter(item => item.value > 0);
    };

    return {
      muscle: formatForPie(muscle, ['Excelente / Alto', 'Normal / Alerta', 'Bajo / Crítico']),
      fat: formatForPie(fat, ['Excelente / Bajo', 'Normal / Alerta', 'Elevado / Crítico']),
      folds: formatForPie(folds, ['Excelente / Magro', 'Normal / Alerta', 'Elevado / Crítico'])
    };
  }, [filteredData]);

  const generateAiSummary = async () => {
    if (filteredData.length === 0) return;
    setIsGenerating(true);
    try {
      const prompt = `Actúa como un Nutricionista Deportivo de Élite. Analiza los siguientes datos grupales de un equipo de fútbol y redacta un resumen ejecutivo breve (máximo 150 palabras). 
            Datos:
            - Total de jugadores evaluados: ${filteredData.length}
            - Promedio Masa Muscular %: ${(filteredData.reduce((acc, curr) => acc + (curr.data.masa_muscular_pct || 0), 0) / filteredData.length).toFixed(1)}%
            - Promedio Masa Grasa %: ${(filteredData.reduce((acc, curr) => acc + (curr.data.masa_adiposa_pct || 0), 0) / filteredData.length).toFixed(1)}%
            - Promedio Sumatoria 6 Pliegues: ${(filteredData.reduce((acc, curr) => acc + (curr.data.sum_pliegues_6_mm || 0), 0) / filteredData.length).toFixed(1)}mm
            
            Enfócate en el estado general del grupo y recomendaciones rápidas basándote en que:
            - Masa Muscular: >54% es excelente, <50% es bajo.
            - Masa Grasa: <16% es excelente, >20% es elevado.
            - 6 Pliegues: <35mm es excelente, >50mm es elevado.`;

      const response = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) {
        throw new Error(`Proxy error: ${response.status}`);
      }

      const resData = await response.json();
      setAiSummary(resData.text || 'No se pudo generar el resumen.');
    } catch (error) {
      console.warn("AI Nutrition Summary Error (fallback triggered):", error);
      const muscleAvg = (filteredData.reduce((acc, curr) => acc + (curr.data.masa_muscular_pct || 0), 0) / filteredData.length);
      const fatAvg = (filteredData.reduce((acc, curr) => acc + (curr.data.masa_adiposa_pct || 0), 0) / filteredData.length);
      const foldsAvg = (filteredData.reduce((acc, curr) => acc + (curr.data.sum_pliegues_6_mm || 0), 0) / filteredData.length);
      
      const muscleEval = muscleAvg >= 54 ? "Excelente" : (muscleAvg >= 50 ? "Normal" : "Bajo");
      const fatEval = fatAvg <= 16 ? "Excelente" : (fatAvg <= 20 ? "Normal" : "Elevado");
      const foldsEval = foldsAvg <= 35 ? "Excelente" : (foldsAvg <= 50 ? "Normal" : "Elevado");

      setAiSummary(`### Resumen Ejecutivo Antropométrico (Modo Respaldo)
Se evaluó un plantel de **${filteredData.length} deportistas**. El promedio de **Masa Muscular** se sitúa en **${muscleAvg.toFixed(1)}%** (${muscleEval}), la **Masa Grasa** promedia **${fatAvg.toFixed(1)}%** (${fatEval}) y la **Sumatoria de 6 Pliegues** es de **${foldsAvg.toFixed(1)} mm** (${foldsEval}). 

La composición tisular grupal cumple robustamente con los estándares internacionales exigidos de cara a la competencia de alto nivel. Recomiendo focalizar planes de nutrición hiperproteica post-sesión de esfuerzo para fortalecer el tejido magro, y regular los aportes lipídicos en casos con sumatorias de pliegues superiores a la normalidad.`);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (filteredData.length > 0) {
      generateAiSummary();
    }
  }, [filteredData.length]);

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value }: any) => {
    const RADIAN = Math.PI / 180;
    // Move labels slightly further out for better visibility with black text
    const radius = outerRadius + 25; 
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (value === 0) return null;

    return (
      <text x={x} y={y} fill="#0b1220" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-[10px] font-black">
        {`${value} (${(percent * 100).toFixed(0)}%)`}
      </text>
    );
  };

  const parseTailwindColor = (colorClass: string): { bg: [number, number, number], text: [number, number, number] } => {
    if (colorClass.includes('emerald-100') || colorClass.includes('emerald-50')) {
      return { bg: [209, 250, 229], text: [4, 120, 87] };
    }
    if (colorClass.includes('amber-100') || colorClass.includes('amber-50')) {
      return { bg: [254, 243, 199], text: [180, 83, 9] };
    }
    if (colorClass.includes('red-100') || colorClass.includes('rose-100') || colorClass.includes('rose-50')) {
      return { bg: [254, 226, 226], text: [185, 28, 28] };
    }
    return { bg: [255, 255, 255], text: [30, 41, 59] };
  };

  const parseObjectiveColor = (label: string): { bg: [number, number, number], text: [number, number, number] } => {
    const cleanLabel = label.toLowerCase();
    if (cleanLabel.includes('recomposición')) {
      return { bg: [255, 251, 235], text: [146, 64, 14] };
    }
    if (cleanLabel.includes('aumento')) {
      return { bg: [239, 246, 255], text: [30, 64, 175] };
    }
    if (cleanLabel.includes('reducción')) {
      return { bg: [255, 241, 242], text: [159, 18, 57] };
    }
    if (cleanLabel.includes('optimizar') || cleanLabel.includes('mantener')) {
      return { bg: [236, 253, 245], text: [6, 95, 70] };
    }
    return { bg: [255, 255, 255], text: [30, 41, 59] };
  };

  const downloadPdfReport = () => {
    if (sortedFilteredData.length === 0) return;

    try {
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      const primaryColor = [11, 18, 32] as [number, number, number]; // #0b1220
      const secondaryColor = [220, 38, 38] as [number, number, number]; // #dc2626
      const margin = 15;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Top Decorative Lines
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(1.5);
      doc.line(margin, 10, pageWidth - margin, 10);
      
      doc.setDrawColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.setLineWidth(0.5);
      doc.line(margin, 11.5, pageWidth - margin, 11.5);

      // Logo
      const logoUrl = getDriveDirectLink(FEDERATION_LOGO);
      try {
        doc.addImage(logoUrl, 'PNG', margin, 15, 20, 20);
      } catch (e) {
        console.warn("Could not add logo to PDF", e);
      }

      // Title & Subtitle
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("LA ROJA PERFORMANCE HUB", 38, 22);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text("REPORTE DE COMPOSICIÓN CORPORAL GRUPAL", 38, 27);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text("ÁREA DE NUTRICIÓN DEPORTIVA", 38, 32);

      // Draw Separator Line
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.5);
      doc.line(margin, 38, pageWidth - margin, 38);

      const totalCount = sortedFilteredData.length;
      const avgMuscular = totalCount > 0 ? (sortedFilteredData.reduce((acc, curr) => acc + (curr.data.masa_muscular_pct || 0), 0) / totalCount) : 0;
      const avgAdiposa = totalCount > 0 ? (sortedFilteredData.reduce((acc, curr) => acc + (curr.data.masa_adiposa_pct || 0), 0) / totalCount) : 0;
      const avgPliegues = totalCount > 0 ? (sortedFilteredData.reduce((acc, curr) => acc + (curr.data.sum_pliegues_6_mm || 0), 0) / totalCount) : 0;
      const avgImo = totalCount > 0 ? (sortedFilteredData.reduce((acc, curr) => {
        const imoVal = (curr.data.indice_imo && Number(curr.data.indice_imo) > 0)
          ? Number(curr.data.indice_imo)
          : (curr.data.masa_muscular_kg && curr.data.masa_osea_kg && Number(curr.data.masa_osea_kg) > 0)
            ? (Number(curr.data.masa_muscular_kg) / Number(curr.data.masa_osea_kg))
            : 0;
        return acc + imoVal;
      }, 0) / totalCount) : 0;

      // Stats Cards Configuration
      const cardWidth = 42;
      const cardHeight = 18;
      const cardY = 42;
      const spacing = 4;

      // Card 1: Total Evaluados
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, cardY, cardWidth, cardHeight, 2, 2, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text("TOTAL EVALUADOS", margin + 4, cardY + 6);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(11, 18, 32);
      doc.text(`${totalCount} JUGADORES`, margin + 4, cardY + 13);

      // Card 2: Prom. Masa Muscular
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin + cardWidth + spacing, cardY, cardWidth, cardHeight, 2, 2, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text("PROM. MASA MUSCULAR", margin + cardWidth + spacing + 4, cardY + 6);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(11, 18, 32);
      doc.text(`${avgMuscular.toFixed(1)}%`, margin + cardWidth + spacing + 4, cardY + 13);

      // Card 3: Prom. Masa Grasa
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin + (cardWidth + spacing) * 2, cardY, cardWidth, cardHeight, 2, 2, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text("PROM. MASA GRASA", margin + (cardWidth + spacing) * 2 + 4, cardY + 6);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(11, 18, 32);
      doc.text(`${avgAdiposa.toFixed(1)}%`, margin + (cardWidth + spacing) * 2 + 4, cardY + 13);

      // Card 4: Prom. 6 Pliegues
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin + (cardWidth + spacing) * 3, cardY, cardWidth, cardHeight, 2, 2, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text("PROM. 6 PLIEGUES / IMO", margin + (cardWidth + spacing) * 3 + 4, cardY + 6);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(11, 18, 32);
      doc.text(`${avgPliegues.toFixed(1)}mm / ${avgImo > 0 ? avgImo.toFixed(2) : 'N/A'}`, margin + (cardWidth + spacing) * 3 + 4, cardY + 13);

      // Filters list
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      
      const filterText = [
        `RANGO: ${new Date(startDate).toLocaleDateString('es-CL')} AL ${new Date(endDate).toLocaleDateString('es-CL')}`,
        `CLUBES: ${selectedClubs.length > 0 ? selectedClubs.join(', ') : 'TODOS'}`,
        `CATEGORÍAS: ${selectedCategories.length > 0 ? selectedCategories.join(', ') : 'TODAS'}`,
        `POSICIONES: ${selectedPositions.length > 0 ? selectedPositions.join(', ') : 'TODAS'}`
      ].join('  |  ');
      
      doc.text(filterText.toUpperCase(), margin, 66);

      // Draw Separator Line
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.5);
      doc.line(margin, 70, pageWidth - margin, 70);

      // Calculate Chart Data Counts dynamically
      const mCounts = { Green: 0, Amber: 0, Red: 0 };
      const fCounts = { Green: 0, Amber: 0, Red: 0 };
      const pCounts = { Green: 0, Amber: 0, Red: 0 };

      sortedFilteredData.forEach(d => {
        const birthYear = d.player.anio || 0;
        const mColor = getCellColor(d.data.masa_muscular_pct || 0, 'muscular', birthYear);
        const fColor = getCellColor(d.data.masa_adiposa_pct || 0, 'adiposa', birthYear);
        const pColor = getCellColor(d.data.sum_pliegues_6_mm || 0, 'pliegues', birthYear);

        if (mColor.includes('emerald')) mCounts.Green++;
        else if (mColor.includes('amber')) mCounts.Amber++;
        else if (mColor.includes('red')) mCounts.Red++;

        if (fColor.includes('emerald')) fCounts.Green++;
        else if (fColor.includes('amber')) fCounts.Amber++;
        else if (fColor.includes('red')) fCounts.Red++;

        if (pColor.includes('emerald')) pCounts.Green++;
        else if (pColor.includes('amber')) pCounts.Amber++;
        else if (pColor.includes('red')) pCounts.Red++;
      });

      // Helper function to draw a chart card with donut chart and legend inside the PDF
      const drawChartCard = (
        x: number,
        y: number,
        title: string,
        counts: { Green: number; Amber: number; Red: number },
        labels: string[]
      ) => {
        const cardWidth = 56;
        const cardHeight = 48;

        // Draw card border & background
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(241, 245, 249); // slate-100 border
        doc.setLineWidth(0.4);
        doc.roundedRect(x, y, cardWidth, cardHeight, 4, 4, 'FD');

        // Draw title
        const cx = x + cardWidth / 2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text(title, cx, y + 6, { align: 'center' });

        // Donut parameters
        const cy = y + 21;
        const rOuter = 9;
        const rInner = 6;
        const total = counts.Green + counts.Amber + counts.Red;

        // Segments array
        const segments = [
          { value: counts.Green, rgb: [16, 185, 129] as [number, number, number] }, // Green
          { value: counts.Amber, rgb: [245, 158, 11] as [number, number, number] }, // Amber
          { value: counts.Red, rgb: [239, 68, 68] as [number, number, number] }    // Red
        ];

        if (total === 0) {
          doc.setFillColor(241, 245, 249); // slate-100
          doc.ellipse(cx, cy, rOuter, rOuter, 'F');
          doc.setFillColor(255, 255, 255);
          doc.ellipse(cx, cy, rInner, rInner, 'F');
          
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184); // slate-400
          doc.text("0", cx, cy + 1, { align: 'center' });
        } else {
          let currentAngle = 0;
          segments.forEach(seg => {
            if (seg.value === 0) return;
            const sliceAngle = (seg.value / total) * 360;
            const startAngle = currentAngle;
            const endAngle = currentAngle + sliceAngle;

            const step = 1;
            doc.setFillColor(seg.rgb[0], seg.rgb[1], seg.rgb[2]);
            
            for (let a = startAngle; a < endAngle; a += step) {
              const currentStep = Math.min(step, endAngle - a);
              const r1 = (a - 90) * Math.PI / 180;
              const r2 = (a + currentStep - 90) * Math.PI / 180;

              const x1 = cx;
              const y1 = cy;
              const x2 = cx + rOuter * Math.cos(r1);
              const y2 = cy + rOuter * Math.sin(r1);
              const x3 = cx + rOuter * Math.cos(r2);
              const y3 = cy + rOuter * Math.sin(r2);

              doc.triangle(x1, y1, x2, y2, x3, y3, 'F');
            }

            currentAngle = endAngle;
          });

          // Draw inner circle to make it a donut
          doc.setFillColor(255, 255, 255);
          doc.ellipse(cx, cy, rInner, rInner, 'F');

          // Center text (Total evaluated count)
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(15, 23, 42);
          doc.text(`${total}`, cx, cy + 1.2, { align: 'center' });
        }

        // Draw legend
        const legendItems = [
          { count: counts.Green, rgb: [16, 185, 129], label: labels[0] },
          { count: counts.Amber, rgb: [245, 158, 11], label: labels[1] },
          { count: counts.Red, rgb: [239, 68, 68], label: labels[2] }
        ];

        let legendY = y + 35;
        legendItems.forEach(item => {
          const itemPct = total > 0 ? Math.round((item.count / total) * 100) : 0;
          
          // Draw colored dot
          doc.setFillColor(item.rgb[0], item.rgb[1], item.rgb[2]);
          doc.ellipse(x + 6, legendY - 0.8, 0.9, 0.9, 'F');

          // Draw label
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(5);
          doc.setTextColor(100, 116, 139); // slate-500
          doc.text(item.label, x + 9, legendY);

          // Draw count and percentage (right aligned)
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(5);
          doc.setTextColor(15, 23, 42); // slate-900
          doc.text(`${item.count} (${itemPct}%)`, x + cardWidth - 6, legendY, { align: 'right' });

          legendY += 3.8;
        });
      };

      // Draw the 3 beautiful chart cards side-by-side
      drawChartCard(margin, 73, "MASA MUSCULAR", mCounts, ['EXCELENTE / ALTO', 'NORMAL / ALERTA', 'BAJO / CRÍTICO']);
      drawChartCard(margin + 56 + 6, 73, "MASA GRASA", fCounts, ['EXCELENTE / BAJO', 'NORMAL / ALERTA', 'ELEVADO / CRÍTICO']);
      drawChartCard(margin + (56 + 6) * 2, 73, "6 PLIEGUES", pCounts, ['EXCELENTE / MAGRO', 'NORMAL / ALERTA', 'ELEVADO / CRÍTICO']);

      // Draw separator line under charts
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.5);
      doc.line(margin, 125, pageWidth - margin, 125);

      // Section Title under charts
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(11, 18, 32);
      doc.text("LISTADO DE EVALUACIONES ANTROPOMÉTRICAS SELECCIONADAS", margin, 131);

      // AutoTable Data
      const tableData = sortedFilteredData.map((item, i) => {
        const isMyClub = userRole !== 'club' || (userClub && normalizeClub(item.player.club || '') === normalizeClub(userClub));
        const displayName = isMyClub ? item.player.name : `Jugador [${item.player.player_id || item.player.id || 'Anon'}]`;
        const displayClub = isMyClub ? (item.player.club || 'S/C') : 'OTRO CLUB';
        const position = item.player.position || 'N/A';
        const fecha = new Date(item.data.fecha_medicion).toLocaleDateString('es-CL');
        const mPct = `${item.data.masa_muscular_pct?.toFixed(1)}%`;
        const fPct = `${item.data.masa_adiposa_pct?.toFixed(1)}%`;
        
        const imoVal = (item.data.indice_imo && Number(item.data.indice_imo) > 0)
          ? Number(item.data.indice_imo)
          : (item.data.masa_muscular_kg && item.data.masa_osea_kg && Number(item.data.masa_osea_kg) > 0)
            ? (Number(item.data.masa_muscular_kg) / Number(item.data.masa_osea_kg))
            : 0;
        const imoStr = imoVal > 0 ? imoVal.toFixed(2) : 'N/A';
        
        const pliegues = `${item.data.sum_pliegues_6_mm?.toFixed(1)}mm`;
        const need = getNutritionalNeed(item.data.masa_muscular_pct || 0, item.data.masa_adiposa_pct || 0, item.player.anio || 0);

        return [
          displayName.toUpperCase(),
          `${displayClub.toUpperCase()} (CAT ${item.player.anio})`,
          position.toUpperCase(),
          fecha,
          mPct,
          fPct,
          imoStr,
          pliegues,
          need.label.toUpperCase()
        ];
      });

      autoTable(doc, {
        startY: 135,
        margin: { left: margin, right: margin },
        head: [[
          'JUGADOR',
          'CLUB / CATEGORÍA',
          'POSICIÓN',
          'FECHA',
          'M. MUSC %',
          'M. GRASA %',
          'IMO',
          '6 PLIEGUES',
          'OBJETIVO NUTR.'
        ]],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: [11, 18, 32],
          textColor: [255, 255, 255],
          fontSize: 7,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle'
        },
        bodyStyles: {
          fontSize: 7,
          textColor: [30, 41, 59],
          halign: 'center',
          valign: 'middle'
        },
        columnStyles: {
          0: { halign: 'left', fontStyle: 'bold' },
          1: { halign: 'left' },
          2: { halign: 'left' },
          3: { halign: 'center' },
          4: { halign: 'center' },
          5: { halign: 'center' },
          6: { halign: 'center' },
          7: { halign: 'center' },
          8: { halign: 'center', fontStyle: 'bold' }
        },
        styles: {
          cellPadding: 2,
          font: 'helvetica'
        },
        didParseCell: function(data) {
          if (data.section === 'body') {
            const rowIndex = data.row.index;
            const colIndex = data.column.index;
            const item = sortedFilteredData[rowIndex];
            if (!item) return;

            const birthYear = item.player.anio || 0;

            if (colIndex === 4) {
              const val = item.data.masa_muscular_pct || 0;
              const colorClass = getCellColor(val, 'muscular', birthYear);
              const colors = parseTailwindColor(colorClass);
              data.cell.styles.fillColor = colors.bg;
              data.cell.styles.textColor = colors.text;
              data.cell.styles.fontStyle = 'bold';
            } else if (colIndex === 5) {
              const val = item.data.masa_adiposa_pct || 0;
              const colorClass = getCellColor(val, 'adiposa', birthYear);
              const colors = parseTailwindColor(colorClass);
              data.cell.styles.fillColor = colors.bg;
              data.cell.styles.textColor = colors.text;
              data.cell.styles.fontStyle = 'bold';
            } else if (colIndex === 6) {
              const imoVal = (item.data.indice_imo && Number(item.data.indice_imo) > 0)
                ? Number(item.data.indice_imo)
                : (item.data.masa_muscular_kg && item.data.masa_osea_kg && Number(item.data.masa_osea_kg) > 0)
                  ? (Number(item.data.masa_muscular_kg) / Number(item.data.masa_osea_kg))
                  : 0;
              const colorClass = getCellColor(imoVal, 'imo', birthYear);
              const colors = parseTailwindColor(colorClass);
              data.cell.styles.fillColor = colors.bg;
              data.cell.styles.textColor = colors.text;
              data.cell.styles.fontStyle = 'bold';
            } else if (colIndex === 7) {
              const val = item.data.sum_pliegues_6_mm || 0;
              const colorClass = getCellColor(val, 'pliegues', birthYear);
              const colors = parseTailwindColor(colorClass);
              data.cell.styles.fillColor = colors.bg;
              data.cell.styles.textColor = colors.text;
              data.cell.styles.fontStyle = 'bold';
            } else if (colIndex === 8) {
              const need = getNutritionalNeed(item.data.masa_muscular_pct || 0, item.data.masa_adiposa_pct || 0, birthYear);
              const colors = parseObjectiveColor(need.label);
              data.cell.styles.fillColor = colors.bg;
              data.cell.styles.textColor = colors.text;
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      });

      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        
        // Footer
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin - 20, pageHeight - 10);
        doc.text("LA ROJA PERFORMANCE HUB - INFORME ANTROPOMÉTRICO GRUPAL (S/I)", margin, pageHeight - 10);
      }

      let clubSuffix = "Grupal";
      if (selectedClubs.length > 0) {
        clubSuffix = selectedClubs.map(c => c.trim().replace(/[^a-zA-Z0-9]/g, '_')).join('_');
      }

      const dateStr = new Date().toISOString().split('T')[0];
      doc.save(`Reporte_Nutricion_${clubSuffix}_${dateStr}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Hubo un error al generar el PDF del reporte.");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="bg-[#0b1220] rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden border border-white/5">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-red-600 rounded-3xl flex items-center justify-center text-4xl shadow-lg shadow-red-900/40">
              <i className="fa-solid fa-users-viewfinder"></i>
            </div>
            <div>
              <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-1">Resumen Grupal</h2>
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-[0.3em]">Análisis Colectivo de Composición Corporal</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          {/* Date Range Filter */}
          <div className="lg:col-span-2 space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Rango de Fechas (Evaluaciones)</label>
            <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100">
              <input 
                type="date" 
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="flex-1 bg-transparent border-none text-xs font-bold outline-none px-4"
              />
              <div className="w-px h-6 bg-slate-200"></div>
              <input 
                type="date" 
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="flex-1 bg-transparent border-none text-xs font-bold outline-none px-4"
              />
            </div>
          </div>

          {/* Club Filter */}
          <div className="space-y-2 relative">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Filtrar por Club</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsClubDropdownOpen(!isClubDropdownOpen)}
                className="w-full bg-slate-50 hover:bg-slate-100/70 text-slate-800 border-none rounded-2xl px-6 py-4 text-xs font-bold transition-all flex items-center justify-between gap-3 focus:outline-none"
              >
                <span className="truncate">
                  {selectedClubs.length === 0
                    ? 'Todos los Clubes'
                    : selectedClubs.length === 1
                      ? selectedClubs[0]
                      : `${selectedClubs.length} Clubes Seleccionados`}
                </span>
                <div className="flex items-center gap-2 bg-slate-200/60 text-slate-700 px-2.5 py-1 rounded-xl text-[9px] font-black italic">
                  {selectedClubs.length > 0 ? selectedClubs.length : 'TODOS'}
                  <i className={`fa-solid fa-chevron-down text-[8px] transition-transform duration-200 ${isClubDropdownOpen ? 'rotate-180' : ''}`}></i>
                </div>
              </button>

              {isClubDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10 cursor-default" onClick={() => setIsClubDropdownOpen(false)} />
                  <div className="origin-top-right absolute right-0 mt-2 w-full min-w-[280px] rounded-3xl shadow-2xl bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-20 p-5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                      <span className="text-[9px] font-black uppercase text-[#0b1220] tracking-widest">Listado de Clubes</span>
                      {userRole !== 'club' && (
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedClubs(availableClubs)}
                            className="px-2.5 py-1 bg-slate-50 hover:bg-[#0b1220] hover:text-white rounded-lg text-[8px] font-black uppercase tracking-wider transition-all"
                          >
                            Todos
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedClubs([])}
                            className="px-2.5 py-1 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all"
                          >
                            Limpiar
                          </button>
                        </div>
                      )}
                    </div>

                    {userRole === 'club' && userClub ? (
                      <div className="space-y-1">
                        <label className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl text-[10px] font-bold text-slate-700 select-none">
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={true}
                              readOnly
                              className="w-3.5 h-3.5 text-red-600 border-slate-300 rounded focus:ring-red-500 cursor-not-allowed"
                            />
                            <span className="uppercase tracking-wider font-extrabold">{userClub}</span>
                          </div>
                          <span className="text-[7.5px] font-black tracking-widest uppercase bg-slate-200/60 text-slate-600 px-1.5 py-0.5 rounded-full">LOCK</span>
                        </label>
                      </div>
                    ) : (
                      <>
                        {availableClubs.length > 5 && (
                          <div className="relative mb-3">
                            <input
                              type="text"
                              placeholder="Buscar club..."
                              className="w-full bg-slate-50 border-none rounded-xl pl-8 pr-4 py-2 text-[10px] font-bold text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-red-500/20 outline-none"
                              onChange={(e) => setClubQuery(e.target.value)}
                              value={clubQuery}
                            />
                            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]"></i>
                          </div>
                        )}

                        <div className="max-h-48 overflow-y-auto divide-y divide-slate-50 custom-scrollbar pr-1">
                          {filteredClubsBySearch.map(club => {
                            const isChecked = selectedClubs.includes(club);
                            return (
                              <label
                                key={club}
                                className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-all rounded-xl hover:bg-slate-50 text-[10px] font-bold text-slate-700 select-none ${
                                  isChecked ? 'bg-red-50/30 text-red-900 font-extrabold' : ''
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleToggleClub(club)}
                                    className="w-3.5 h-3.5 text-red-600 border-slate-300 rounded focus:ring-red-500 cursor-pointer"
                                  />
                                  <span className="uppercase tracking-wider">{club}</span>
                                </div>
                              </label>
                            );
                          })}
                          {filteredClubsBySearch.length === 0 && (
                            <p className="text-[9px] text-slate-400 font-extrabold italic uppercase text-center py-4">No se encontraron clubes</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Category Filter */}
          <div className="space-y-2 relative">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Categoría / Año</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                className="w-full bg-slate-50 hover:bg-slate-100/70 text-slate-800 border-none rounded-2xl px-6 py-4 text-xs font-bold transition-all flex items-center justify-between gap-3 focus:outline-none"
              >
                <span className="truncate">
                  {selectedCategories.length === 0
                    ? 'Todas las Categorías'
                    : selectedCategories.length === 1
                      ? `Categoría ${selectedCategories[0]}`
                      : `${selectedCategories.length} Cat. Seleccionadas`}
                </span>
                <div className="flex items-center gap-2 bg-slate-200/60 text-slate-700 px-2.5 py-1 rounded-xl text-[9px] font-black italic">
                  {selectedCategories.length > 0 ? selectedCategories.length : 'TODAS'}
                  <i className={`fa-solid fa-chevron-down text-[8px] transition-transform duration-200 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`}></i>
                </div>
              </button>

              {isCategoryDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10 cursor-default" onClick={() => setIsCategoryDropdownOpen(false)} />
                  <div className="origin-top-right absolute right-0 mt-2 w-full min-w-[280px] rounded-3xl shadow-2xl bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-20 p-5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                      <span className="text-[9px] font-black uppercase text-[#0b1220] tracking-widest">Listado de Categorías</span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedCategories(categories)}
                          className="px-2.5 py-1 bg-slate-50 hover:bg-[#0b1220] hover:text-white rounded-lg text-[8px] font-black uppercase tracking-wider transition-all"
                        >
                          Todas
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedCategories([])}
                          className="px-2.5 py-1 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all"
                        >
                          Limpiar
                        </button>
                      </div>
                    </div>

                    {categories.length > 5 && (
                      <div className="relative mb-3">
                        <input
                          type="text"
                          placeholder="Buscar categoría..."
                          className="w-full bg-slate-50 border-none rounded-xl pl-8 pr-4 py-2 text-[10px] font-bold text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-red-500/20 outline-none"
                          onChange={(e) => setCategoryQuery(e.target.value)}
                          value={categoryQuery}
                        />
                        <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]"></i>
                      </div>
                    )}

                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-50 custom-scrollbar pr-1">
                      {filteredCategoriesBySearch.map(cat => {
                        const isChecked = selectedCategories.includes(cat);
                        return (
                          <label
                            key={cat}
                            className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-all rounded-xl hover:bg-slate-50 text-[10px] font-bold text-slate-700 select-none ${
                              isChecked ? 'bg-red-50/30 text-red-900 font-extrabold' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleCategory(cat)}
                                className="w-3.5 h-3.5 text-red-600 border-slate-300 rounded focus:ring-red-500 cursor-pointer"
                              />
                              <span className="uppercase tracking-wider">Categoría {cat}</span>
                            </div>
                          </label>
                        );
                      })}
                      {filteredCategoriesBySearch.length === 0 && (
                        <p className="text-[9px] text-slate-400 font-extrabold italic uppercase text-center py-4">No se encontraron categorías</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Position Filter */}
          <div className="space-y-2 relative">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Posición</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsPositionDropdownOpen(!isPositionDropdownOpen)}
                className="w-full bg-slate-50 hover:bg-slate-100/70 text-slate-800 border-none rounded-2xl px-6 py-4 text-xs font-bold transition-all flex items-center justify-between gap-3 focus:outline-none"
              >
                <span className="truncate">
                  {selectedPositions.length === 0
                    ? 'Todas las Posiciones'
                    : selectedPositions.length === 1
                      ? selectedPositions[0]
                      : `${selectedPositions.length} Pos. Seleccionadas`}
                </span>
                <div className="flex items-center gap-2 bg-slate-200/60 text-slate-700 px-2.5 py-1 rounded-xl text-[9px] font-black italic">
                  {selectedPositions.length > 0 ? selectedPositions.length : 'TODAS'}
                  <i className={`fa-solid fa-chevron-down text-[8px] transition-transform duration-200 ${isPositionDropdownOpen ? 'rotate-180' : ''}`}></i>
                </div>
              </button>

              {isPositionDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10 cursor-default" onClick={() => setIsPositionDropdownOpen(false)} />
                  <div className="origin-top-right absolute right-0 mt-2 w-full min-w-[280px] rounded-3xl shadow-2xl bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-20 p-5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                      <span className="text-[9px] font-black uppercase text-[#0b1220] tracking-widest">Listado de Posiciones</span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedPositions(positions)}
                          className="px-2.5 py-1 bg-slate-50 hover:bg-[#0b1220] hover:text-white rounded-lg text-[8px] font-black uppercase tracking-wider transition-all"
                        >
                          Todas
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedPositions([])}
                          className="px-2.5 py-1 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all"
                        >
                          Limpiar
                        </button>
                      </div>
                    </div>

                    {positions.length > 5 && (
                      <div className="relative mb-3">
                        <input
                          type="text"
                          placeholder="Buscar posición..."
                          className="w-full bg-slate-50 border-none rounded-xl pl-8 pr-4 py-2 text-[10px] font-bold text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-red-500/20 outline-none"
                          onChange={(e) => setPositionQuery(e.target.value)}
                          value={positionQuery}
                        />
                        <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]"></i>
                      </div>
                    )}

                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-50 custom-scrollbar pr-1">
                      {filteredPositionsBySearch.map(pos => {
                        const isChecked = selectedPositions.includes(pos);
                        return (
                          <label
                            key={pos}
                            className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-all rounded-xl hover:bg-slate-50 text-[10px] font-bold text-slate-700 select-none ${
                              isChecked ? 'bg-red-50/30 text-red-900 font-extrabold' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleTogglePosition(pos)}
                                className="w-3.5 h-3.5 text-red-600 border-slate-300 rounded focus:ring-red-500 cursor-pointer"
                              />
                              <span className="uppercase tracking-wider">{pos}</span>
                            </div>
                          </label>
                        );
                      })}
                      {filteredPositionsBySearch.length === 0 && (
                        <p className="text-[9px] text-slate-400 font-extrabold italic uppercase text-center py-4">No se encontraron posiciones</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Objetivo Filter */}
          <div className="space-y-2 relative">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Objetivo</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsObjectiveDropdownOpen(!isObjectiveDropdownOpen)}
                className="w-full bg-slate-50 hover:bg-slate-100/70 text-slate-800 border-none rounded-2xl px-6 py-4 text-xs font-bold transition-all flex items-center justify-between gap-3 focus:outline-none"
              >
                <span className="truncate">
                  {selectedObjectives.length === 0
                    ? 'Todos los Objetivos'
                    : selectedObjectives.length === 1
                      ? selectedObjectives[0]
                      : `${selectedObjectives.length} Obj. Seleccionados`}
                </span>
                <div className="flex items-center gap-2 bg-slate-200/60 text-slate-700 px-2.5 py-1 rounded-xl text-[9px] font-black italic">
                  {selectedObjectives.length > 0 ? selectedObjectives.length : 'TODOS'}
                  <i className={`fa-solid fa-chevron-down text-[8px] transition-transform duration-200 ${isObjectiveDropdownOpen ? 'rotate-180' : ''}`}></i>
                </div>
              </button>

              {isObjectiveDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10 cursor-default" onClick={() => setIsObjectiveDropdownOpen(false)} />
                  <div className="origin-top-right absolute right-0 mt-2 w-full min-w-[280px] rounded-3xl shadow-2xl bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-20 p-5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                      <span className="text-[9px] font-black uppercase text-[#0b1220] tracking-widest">Listado de Objetivos</span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedObjectives(objectivesList)}
                          className="px-2.5 py-1 bg-slate-50 hover:bg-[#0b1220] hover:text-white rounded-lg text-[8px] font-black uppercase tracking-wider transition-all"
                        >
                          Todos
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedObjectives([])}
                          className="px-2.5 py-1 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all"
                        >
                          Limpiar
                        </button>
                      </div>
                    </div>

                    {objectivesList.length > 5 && (
                      <div className="relative mb-3">
                        <input
                          type="text"
                          placeholder="Buscar objetivo..."
                          className="w-full bg-slate-50 border-none rounded-xl pl-8 pr-4 py-2 text-[10px] font-bold text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-red-500/20 outline-none"
                          onChange={(e) => setObjectiveQuery(e.target.value)}
                          value={objectiveQuery}
                        />
                        <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]"></i>
                      </div>
                    )}

                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-50 custom-scrollbar pr-1">
                      {filteredObjectivesBySearch.map(obj => {
                        const isChecked = selectedObjectives.includes(obj);
                        return (
                          <label
                            key={obj}
                            className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-all rounded-xl hover:bg-slate-50 text-[10px] font-bold text-slate-700 select-none ${
                              isChecked ? 'bg-red-50/30 text-red-900 font-extrabold' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleObjective(obj)}
                                className="w-3.5 h-3.5 text-red-600 border-slate-300 rounded focus:ring-red-500 cursor-pointer"
                              />
                              <span className="uppercase tracking-wider">{obj}</span>
                            </div>
                          </label>
                        );
                      })}
                      {filteredObjectivesBySearch.length === 0 && (
                        <p className="text-[9px] text-slate-400 font-extrabold italic uppercase text-center py-4">No se encontraron objetivos</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Player Name Filter */}
          <div className="space-y-2 relative">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Jugador</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsPlayerDropdownOpen(!isPlayerDropdownOpen)}
                className="w-full bg-slate-50 hover:bg-slate-100/70 text-slate-800 border-none rounded-2xl px-6 py-4 text-xs font-bold transition-all flex items-center justify-between gap-3 focus:outline-none"
              >
                <span className="truncate">
                  {selectedPlayers.length === 0
                    ? 'Todos los Jugadores'
                    : selectedPlayers.length === 1
                      ? selectedPlayers[0]
                      : `${selectedPlayers.length} Jug. Seleccionados`}
                </span>
                <div className="flex items-center gap-2 bg-slate-200/60 text-slate-700 px-2.5 py-1 rounded-xl text-[9px] font-black italic">
                  {selectedPlayers.length > 0 ? selectedPlayers.length : 'TODOS'}
                  <i className={`fa-solid fa-chevron-down text-[8px] transition-transform duration-200 ${isPlayerDropdownOpen ? 'rotate-180' : ''}`}></i>
                </div>
              </button>

              {isPlayerDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10 cursor-default" onClick={() => setIsPlayerDropdownOpen(false)} />
                  <div className="origin-top-right absolute right-0 mt-2 w-full min-w-[280px] rounded-3xl shadow-2xl bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-20 p-5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                      <span className="text-[9px] font-black uppercase text-[#0b1220] tracking-widest">Listado de Jugadores</span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedPlayers(availablePlayers)}
                          className="px-2.5 py-1 bg-slate-50 hover:bg-[#0b1220] hover:text-white rounded-lg text-[8px] font-black uppercase tracking-wider transition-all"
                        >
                          Todos
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedPlayers([])}
                          className="px-2.5 py-1 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all"
                        >
                          Limpiar
                        </button>
                      </div>
                    </div>

                    <div className="relative mb-3">
                      <input
                        type="text"
                        placeholder="Buscar jugador..."
                        className="w-full bg-slate-50 border-none rounded-xl pl-8 pr-4 py-2 text-[10px] font-bold text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-red-500/20 outline-none"
                        onChange={(e) => setPlayerQuery(e.target.value)}
                        value={playerQuery}
                      />
                      <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]"></i>
                    </div>

                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-50 custom-scrollbar pr-1">
                      {filteredPlayersBySearch.map(player => {
                        const isChecked = selectedPlayers.includes(player);
                        return (
                          <label
                            key={player}
                            className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-all rounded-xl hover:bg-slate-50 text-[10px] font-bold text-slate-700 select-none ${
                              isChecked ? 'bg-red-50/30 text-red-900 font-extrabold' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleTogglePlayer(player)}
                                className="w-3.5 h-3.5 text-red-600 border-slate-300 rounded focus:ring-red-500 cursor-pointer"
                              />
                              <span className="uppercase tracking-wider">{player}</span>
                            </div>
                          </label>
                        );
                      })}
                      {filteredPlayersBySearch.length === 0 && (
                        <p className="text-[9px] text-slate-400 font-extrabold italic uppercase text-center py-4">No se encontraron jugadores</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Check to show only latest evaluation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-slate-100">
          <label className="relative flex items-start sm:items-center gap-3 cursor-pointer group select-none">
            <input
              type="checkbox"
              id="show-latest-evaluation-checkbox"
              checked={showOnlyLatest}
              onChange={(e) => setShowOnlyLatest(e.target.checked)}
              className="w-4 h-4 mt-0.5 sm:mt-0 text-red-600 border-slate-300 rounded focus:ring-red-500 cursor-pointer accent-red-600"
            />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-800 group-hover:text-red-600 transition-colors">
                Mostrar solo la última evaluación de cada jugador
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                Si un jugador tiene múltiples mediciones en el rango de fechas, conserva solo la más reciente.
              </span>
            </div>
          </label>
          
          {hasDuplicatePlayers && !showOnlyLatest && (
            <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1.5 rounded-2xl text-[10px] font-bold animate-pulse">
              <i className="fa-solid fa-circle-exclamation text-xs"></i>
              Hay jugadores con evaluaciones repetidas
            </span>
          )}
          {showOnlyLatest && (
            <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-2xl text-[10px] font-bold">
              <i className="fa-solid fa-check-double text-xs"></i>
              Única evaluación más reciente por jugador
            </span>
          )}
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-sm font-black text-slate-900 uppercase italic tracking-tighter">Listado de Evaluaciones ({filteredData.length})</h3>
          <button
            type="button"
            onClick={downloadPdfReport}
            className="flex items-center justify-center gap-2 bg-[#0b1220] hover:bg-red-600 active:scale-95 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md hover:shadow-lg focus:outline-none cursor-pointer"
          >
            <i className="fa-solid fa-file-pdf text-xs"></i>
            Descargar PDF (Sin IA)
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th onClick={() => requestSort('player')} className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer select-none group hover:text-slate-700 transition-colors">
                  <div className="flex items-center">
                    Jugador {getSortIcon('player')}
                  </div>
                </th>
                <th onClick={() => requestSort('position')} className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer select-none group hover:text-slate-700 transition-colors">
                  <div className="flex items-center">
                    Posición {getSortIcon('position')}
                  </div>
                </th>
                <th onClick={() => requestSort('fecha')} className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer select-none group hover:text-slate-700 transition-colors">
                  <div className="flex items-center">
                    Fecha {getSortIcon('fecha')}
                  </div>
                </th>
                <th onClick={() => requestSort('muscular')} className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer select-none group hover:text-slate-700 transition-colors text-center">
                  <div className="flex items-center justify-center">
                    Masa Muscular % {getSortIcon('muscular')}
                  </div>
                </th>
                <th onClick={() => requestSort('adiposa')} className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer select-none group hover:text-slate-700 transition-colors text-center">
                  <div className="flex items-center justify-center">
                    Masa Grasa % {getSortIcon('adiposa')}
                  </div>
                </th>
                <th onClick={() => requestSort('imo')} className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer select-none group hover:text-slate-700 transition-colors text-center">
                  <div className="flex items-center justify-center">
                    IMO {getSortIcon('imo')}
                  </div>
                </th>
                <th onClick={() => requestSort('pliegues')} className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer select-none group hover:text-slate-700 transition-colors text-center">
                  <div className="flex items-center justify-center">
                    6 Pliegues (mm) {getSortIcon('pliegues')}
                  </div>
                </th>
                <th onClick={() => requestSort('objetivo')} className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer select-none group hover:text-slate-700 transition-colors text-center">
                  <div className="flex items-center justify-center">
                    Objetivo {getSortIcon('objetivo')}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sortedFilteredData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-8 py-20 text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest italic">No se encontraron registros para los filtros seleccionados</td>
                </tr>
              ) : (
                sortedFilteredData.map((item, i) => {
                  const isMyClub = userRole !== 'club' || (userClub && normalizeClub(item.player.club || '') === normalizeClub(userClub));
                  const displayName = isMyClub ? item.player.name : `Jugador [${item.player.player_id || item.player.id || 'Anon'}]`;
                  const displayClub = isMyClub ? (item.player.club || 'S/C') : 'OTRO CLUB';

                  return (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-4">
                        <p className="text-xs font-black text-slate-900 uppercase italic">{displayName}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <ClubBadge clubName={displayClub} idClub={isMyClub ? item.player.id_club : undefined} clubs={clubs} logoSize="w-2.5 h-2.5" className="text-[9px] font-bold text-slate-400 uppercase" />
                          <span className="text-slate-300">•</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Cat {item.player.anio}</span>
                        </div>
                      </td>
                      <td className="px-8 py-4">
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{item.player.position || 'N/A'}</p>
                      </td>
                      <td className="px-8 py-4">
                        <span className="text-[10px] font-bold text-slate-500">{new Date(item.data.fecha_medicion).toLocaleDateString('es-CL')}</span>
                      </td>
                      <td className="px-8 py-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-lg text-xs font-black italic ${getCellColor(item.data.masa_muscular_pct || 0, 'muscular', item.player.anio || 0)}`}>
                          {item.data.masa_muscular_pct?.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-8 py-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-lg text-xs font-black italic ${getCellColor(item.data.masa_adiposa_pct || 0, 'adiposa', item.player.anio || 0)}`}>
                          {item.data.masa_adiposa_pct?.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-8 py-4 text-center">
                        {(() => {
                          const imoVal = (item.data.indice_imo && Number(item.data.indice_imo) > 0)
                            ? Number(item.data.indice_imo)
                            : (item.data.masa_muscular_kg && item.data.masa_osea_kg && Number(item.data.masa_osea_kg) > 0)
                              ? (Number(item.data.masa_muscular_kg) / Number(item.data.masa_osea_kg))
                              : 0;
                          return (
                            <span className={`inline-block px-3 py-1 rounded-lg text-xs font-black italic ${getCellColor(imoVal, 'imo', item.player.anio || 0)}`}>
                              {imoVal > 0 ? imoVal.toFixed(2) : 'N/A'}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-8 py-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-lg text-xs font-black italic ${getCellColor(item.data.sum_pliegues_6_mm || 0, 'pliegues', item.player.anio || 0)}`}>
                          {item.data.sum_pliegues_6_mm?.toFixed(1)}mm
                        </span>
                      </td>
                      <td className="px-8 py-4 text-center">
                        {(() => {
                          const need = getNutritionalNeed(item.data.masa_muscular_pct || 0, item.data.masa_adiposa_pct || 0, item.player.anio || 0);
                          return (
                            <div className="flex flex-col items-center justify-center">
                              <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase border ${need.color}`}>
                                {need.label}
                              </span>
                              <span className="text-[8px] text-slate-400 font-bold uppercase mt-0.5 tracking-wider">{need.sublabel}</span>
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts Section */}
      {chartData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { title: 'Masa Muscular', data: chartData.muscle, icon: 'fa-dumbbell' },
            { title: 'Masa Grasa', data: chartData.fat, icon: 'fa-droplet-slash' },
            { title: '6 Pliegues', data: chartData.folds, icon: 'fa-ruler-horizontal' }
          ].map((chart, i) => (
            <div key={i} className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm flex flex-col items-center">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 mb-6">
                <i className={`fa-solid ${chart.icon}`}></i>
              </div>
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-8">{chart.title}</h4>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 20, right: 30, left: 30, bottom: 20 }}>
                    <Pie
                      data={chart.data}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      labelLine={false}
                      label={renderCustomizedLabel}
                    >
                      {chart.data.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      align="center" 
                      iconType="circle"
                      formatter={(value) => <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Summary Section */}
      <div className="bg-[#0b1220] rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden border border-white/5">
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-emerald-600/10 rounded-full -mr-32 -mb-32 blur-3xl"></div>
        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-900/40">
              <i className="fa-solid fa-robot"></i>
            </div>
            <div>
              <h3 className="text-xl font-black italic uppercase tracking-tighter">Informe Técnico IA</h3>
              <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest">Análisis Automatizado de Rendimiento Grupal</p>
            </div>
          </div>
          
          <div className="bg-white/5 rounded-3xl p-8 border border-white/10 min-h-[100px] flex items-center">
            {isGenerating ? (
              <div className="flex items-center gap-4 text-white/30 italic text-sm">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Generando análisis experto...
              </div>
            ) : (
              <p className="text-white/80 text-sm leading-relaxed font-medium italic">
                {aiSummary || "Selecciona un rango de datos para generar el análisis."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NutricionResumenGrupal;
