
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { normalizeClub } from '../lib/utils';
import { getChartSummary, getAthleteFootprintSummary, askAthleteAiAssistant } from '../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';
import ClubBadge from './ClubBadge';
import Markdown from 'react-markdown';
import { 
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, BarChart, Bar, LineChart, Line, Legend,
  ComposedChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ReferenceLine, ErrorBar, AreaChart
} from 'recharts';

type TabId = 'huella' | 'individual' | 'grupal' | 'laboratorio' | 'salud' | 'tabla' | 'categorias' | 'insights' | 'top10';

interface PlayerData {
  player_id: number;
  nombre: string;
  apellido1: string;
  apellido2: string;
  category_id: number;
  posicion: string;
  fecha_nacimiento: string;
  club?: string;
  club_name?: string;
  id_club?: number;
  phv_status?: 'Pre-Peak' | 'Peak' | 'Post-Peak';
  injury_status?: 'Disponible' | 'RTP' | 'Lesionado';
}

interface IMTPData {
  jugador: string;
  player_id: number;
  fecha_test: string;
  peso?: number;
  imtp_fuerza_n: number;
  imtp_f_relativa_n_kg?: number;
  imtp_asimetria?: number;
  imtp_debil?: string;
  fuerza_cmj?: number;
  cmj_rsi_mod?: number;
  cmj_altura_salto_im?: number;
  cmj_salto_tv?: number;
  cmj_peak_pot_relativa?: number;
  cmj_asimetria_aterrizaje?: number;
  landing_n?: number;
  landing_relativo?: number;
  cmj_pierna_debil?: string;
  dsi_valor?: number;
  avk_peak_pot_relativa?: number;
  avk_indice_uso_brazos_tv?: number;
  avk_x_tv?: number;
  avk_x_im?: number;
  avk_indice_uso_brazos_im?: number;
  avk_indice_brazos_im?: number;
  slcmj_izq_altura_im?: number;
  slcmj_izq_altura_tv?: number;
  slcmj_der_altura_im?: number;
  slcmj_der_altura_tv?: number;
  slcmj_diferencia_pct_im?: number;
  slcmj_diferencia_pct_tv?: number;
  deficit_bilateral?: number;
  altura_x_rsi_mod?: number;
}

interface SpeedTestData {
  player_id: number;
  fecha: string;
  tiempo_10m?: number;
  vel_10m?: number;
  tiempo_10_20m?: number;
  vel_10_20m?: number;
  tiempo_20_30m?: number;
  vel_20_30m?: number;
  tiempo_total: number;
  observaciones?: string;
}

interface AntropometriaData {
  player_id: number;
  fecha_medicion: string;
  masa_corporal_kg: number;
  talla_cm: number;
  talla_sentada_cm?: number;
  masa_muscular_kg?: number;
  masa_muscular_pct?: number;
  masa_adiposa_kg?: number;
  masa_adiposa_pct?: number;
  masa_osea_kg?: number;
  masa_osea_pct?: number;
  indice_imo?: number;
  indice_imc?: number;
  sum_pliegues_6_mm?: number;
  sum_pliegues_8_mm?: number;
  somatotipo_endo?: number;
  somatotipo_meso?: number;
  somatotipo_ecto?: number;
  maduracion_media?: number;
  phv_media?: number;
  estatura_proy_media_cm?: number;
}

interface InjuryData {
  player_id: number;
  estado: string;
  disponibilidad: string;
}

interface GPSData {
  player_id: number;
  fecha: string;
  dist_total_m: number;
  sprints_n: number;
  vel_max_kmh: number;
}

interface VO2MaxData {
  player_id: number;
  fecha: string;
  vo2_max: number;
  vam?: number;
  fc_max?: number;
  nivel?: number;
  pasada?: number;
  mts?: number;
  vt1_vel?: number;
  vt1_pct?: number;
  vt1_fc?: number;
  vt2_vel?: number;
  vt2_pct?: number;
  vt2_fc?: number;
  vfa?: number;
  peso?: number;
  observaciones?: string;
  jugador?: string;
}

interface MedicalReport {
  id: string;
  player_id: number;
  report_date: string;
  observation: string;
  diagnostico_medico?: string;
  severity: string;
  created_at: string;
}

interface InternalLoadData {
  player_id: number;
  session_date: string;
  load: number;
  rpe: number;
}

interface SportsScienceAreaProps {
  userRole?: string;
  userClub?: string;
  userClubId?: number | null;
  clubs?: any[];
}

const SportsScienceArea: React.FC<SportsScienceAreaProps> = ({ userRole, userClub, userClubId, clubs = [] }) => {
  const [activeTab, setActiveTab] = useState<TabId>('huella');
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [selectedAnios, setSelectedAnios] = useState<number[]>([]);
  const [selectedPosiciones, setSelectedPosiciones] = useState<string[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<number | null>(null);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showPosDropdown, setShowPosDropdown] = useState(false);
  const [showClubDropdown, setShowClubDropdown] = useState(false);
  const [highlightPlayerId, setHighlightPlayerId] = useState<number | null>(null);

  const [box1Metric, setBox1Metric] = useState<string>('imtp_fuerza_n');
  const [box2Metric, setBox2Metric] = useState<string>('imtp_f_relativa_n_kg');
  const [box3Metric, setBox3Metric] = useState<string>('tiempo_total');
  const [box4Metric, setBox4Metric] = useState<string>('vo2_max');

  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [imtpData, setImtpData] = useState<IMTPData[]>([]);
  const [speedData, setSpeedData] = useState<SpeedTestData[]>([]);
  const [antropometria, setAntropometria] = useState<AntropometriaData[]>([]);
  const [vo2maxData, setVo2maxData] = useState<VO2MaxData[]>([]);
  const [injuries, setInjuries] = useState<InjuryData[]>([]);
  const [gpsData, setGpsData] = useState<GPSData[]>([]);
  const [medicalReports, setMedicalReports] = useState<MedicalReport[]>([]);
  const [internalLoads, setInternalLoads] = useState<InternalLoadData[]>([]);
  const [loading, setLoading] = useState(false);
  const [clubFilterMode, setClubFilterMode] = useState<'all' | 'club'>('all');

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchFullTable = async (tableName: string, selectQuery: string = '*') => {
    let allData: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let keepFetching = true;

    while (keepFetching) {
      const { data, error } = await supabase
        .from(tableName)
        .select(selectQuery)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.error(`Error fetching from ${tableName}:`, error);
        break;
      }

      if (data && data.length > 0) {
        allData = [...allData, ...data];
        if (data.length < pageSize) {
          keepFetching = false;
        } else {
          page++;
        }
      } else {
        keepFetching = false;
      }
    }
    return allData;
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [
        pData,
        imtpRes,
        cmjRes,
        sData,
        aData,
        vData,
        injData,
        gData,
        mData,
        lData
      ] = await Promise.all([
        fetchFullTable('players', 'player_id, nombre, apellido1, apellido2, anio, id_club, posicion'),
        fetchFullTable('evaluaciones_imtp'),
        fetchFullTable('evaluaciones_cmj'),
        fetchFullTable('velocidad_tests'),
        fetchFullTable('antropometria'),
        fetchFullTable('vo2max_tests'),
        fetchFullTable('lesionados'),
        fetchFullTable('gps_import'),
        fetchFullTable('medical_daily_reports'),
        fetchFullTable('internal_load')
      ]);

      if (pData) {
        const mapped = pData.map((p: any) => {
          if (!p.categoria && p.anio) {
            const age = 2026 - p.anio;
            if (age <= 13) p.categoria = 'sub_13';
            else if (age === 14) p.categoria = 'sub_14';
            else if (age === 15) p.categoria = 'sub_15';
            else if (age === 16) p.categoria = 'sub_16';
            else if (age === 17) p.categoria = 'sub_17';
            else if (age === 18) p.categoria = 'sub_18';
            else if (age <= 20) p.categoria = 'sub_20';
            else if (age <= 21) p.categoria = 'sub_21';
            else if (age <= 23) p.categoria = 'sub_23';
            else p.categoria = 'adulta';
          }
          return p;
        });
        setPlayers(mapped);
      }
      if (imtpRes || cmjRes) {
        const mergedMap = new Map<string, any>();
        (imtpRes || []).forEach((item: any) => {
          const key = `${item.player_id}_${item.fecha_test}`;
          mergedMap.set(key, { ...item });
        });
        (cmjRes || []).forEach((item: any) => {
          const key = `${item.player_id}_${item.fecha_test}`;
          const existing = mergedMap.get(key);
          if (existing) {
            mergedMap.set(key, { ...existing, ...item });
          } else {
            mergedMap.set(key, { ...item });
          }
        });
        const combinedImtp = Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.fecha_test).getTime() - new Date(a.fecha_test).getTime()
        );
        setImtpData(combinedImtp);
      }
      if (sData) setSpeedData(sData);
      if (aData) setAntropometria(aData);
      if (vData) setVo2maxData(vData);
      if (injData) setInjuries(injData);
      if (gData) setGpsData(gData);
      if (mData) setMedicalReports(mData);
      if (lData) setInternalLoads(lData);
    } catch (err) {
      console.error("Error fetching sports science data:", err);
    } finally {
      setLoading(false);
    }
  };

  const availableAnios = useMemo(() => {
    let filteredPlayers = players;
    if (userRole === 'club') {
      if (userClubId) {
        filteredPlayers = players.filter(p => p.id_club === userClubId);
      } else if (userClub) {
        const uClubNorm = normalizeClub(userClub);
        filteredPlayers = players.filter(p => {
          const pClub = p.club || p.club_name || '';
          return pClub && normalizeClub(pClub) === uClubNorm;
        });
      }
    }

    const years = filteredPlayers
      .map(p => {
        if ((p as any).anio) return Number((p as any).anio);
        return p.fecha_nacimiento ? new Date(p.fecha_nacimiento).getFullYear() : null;
      })
      .filter((y): y is number => y !== null && !isNaN(y));
    return Array.from(new Set(years)).sort((a: number, b: number) => b - a);
  }, [players, userRole, userClub]);

  const anonymizedPlayers = useMemo(() => {
    if (userRole === 'club') {
      return players.map(p => {
        let isOwnClub = false;
        if (userClubId) {
          isOwnClub = p.id_club === userClubId;
        } else if (userClub) {
          const uClubNorm = normalizeClub(userClub);
          const pClub = (p as any).club || (p as any).club_name || '';
          isOwnClub = pClub && normalizeClub(pClub) === uClubNorm;
        }

        if (!isOwnClub) {
          return {
            ...p,
            nombre: 'Jugador',
            apellido1: `[${p.player_id}]`,
            apellido2: ''
          };
        }
        return p;
      });
    }
    return players;
  }, [players, userRole, userClub, userClubId]);

  const filteredByClubScopePlayers = useMemo(() => {
    let result = anonymizedPlayers;
    if (userRole === 'club' && clubFilterMode !== 'all') {
      result = anonymizedPlayers.filter(p => {
        if (userClubId) {
          return p.id_club === userClubId;
        } else if (userClub) {
          const uClubNorm = normalizeClub(userClub);
          const pClub = (p as any).club || (p as any).club_name || '';
          return pClub && normalizeClub(pClub) === uClubNorm;
        }
        return false;
      });
    }

    if (selectedClubId !== null) {
      result = result.filter(p => Number(p.id_club) === Number(selectedClubId));
    }

    return result;
  }, [anonymizedPlayers, userRole, clubFilterMode, userClub, userClubId, selectedClubId]);

  const selectedPlayer = useMemo(() => 
    anonymizedPlayers.find(p => p.player_id === selectedPlayerId), 
  [anonymizedPlayers, selectedPlayerId]);

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      {/* HEADER PROFESIONAL */}
      <div className="bg-[#0b1220] rounded-[40px] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full -mr-48 -mt-48 blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-900/40">
              <i className="fa-solid fa-microscope text-xl"></i>
            </div>
            <div>
              <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase leading-none">
                SPORT <span className="text-red-600">SCIENCE</span>
              </h1>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1">High Performance Data Hub</p>
            </div>
          </div>

          {/* TAB NAVIGATION */}
          <div className="flex flex-wrap gap-2 mt-10">
            <TabButton active={activeTab === 'huella'} label="Huella del Atleta" icon="fa-fingerprint" onClick={() => setActiveTab('huella')} />
            <TabButton active={activeTab === 'individual'} label="Reporte Individual" icon="fa-chart-line" onClick={() => setActiveTab('individual')} />
            <TabButton active={activeTab === 'grupal'} label="Análisis Grupal" icon="fa-users-rays" onClick={() => setActiveTab('grupal')} />
            <TabButton active={activeTab === 'laboratorio'} label="Laboratorio" icon="fa-flask-vial" onClick={() => setActiveTab('laboratorio')} />
            {userRole !== 'club' && (
              <>
                <TabButton active={activeTab === 'categorias'} label="Categorías" icon="fa-layer-group" onClick={() => setActiveTab('categorias')} />
                <TabButton active={activeTab === 'salud'} label="Salud y Carga" icon="fa-heart-pulse" onClick={() => setActiveTab('salud')} />
              </>
            )}
            <TabButton active={activeTab === 'tabla'} label="Tabla de Datos" icon="fa-table" onClick={() => setActiveTab('tabla')} />
            <TabButton active={activeTab === 'top10'} label="Top Ten" icon="fa-ranking-star" onClick={() => {
              setActiveTab('top10');
              setSelectedPlayerId(null);
            }} />
          </div>
        </div>
      </div>

      {/* FILTROS GLOBALES */}
      <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-3 relative">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Años:</label>
          <div className="relative">
            <button 
              onClick={() => setShowYearDropdown(!showYearDropdown)}
              className="bg-slate-50 border-none rounded-xl px-4 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-red-500 flex items-center gap-2 min-w-[120px] justify-between"
            >
              {selectedAnios.length === 0 ? 'Todos' : 
               selectedAnios.length === 1 ? selectedAnios[0] : 
               `${selectedAnios.length} seleccionados`}
              <i className={`fa-solid fa-chevron-down text-[10px] transition-transform ${showYearDropdown ? 'rotate-180' : ''}`}></i>
            </button>
            
            {showYearDropdown && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 p-2 max-h-60 overflow-y-auto">
                <button 
                  onClick={() => {
                    setSelectedAnios([]);
                    setShowYearDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 rounded-lg"
                >
                  Limpiar Selección
                </button>
                <div className="h-px bg-slate-50 my-2"></div>
                {availableAnios.map(year => (
                  <label key={year} className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={selectedAnios.includes(year)}
                      onChange={() => {
                        const newAnios = selectedAnios.includes(year)
                          ? selectedAnios.filter(y => y !== year)
                          : [...selectedAnios, year];
                        setSelectedAnios(newAnios);
                        setSelectedPlayerId(null);
                      }}
                      className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-xs font-bold text-slate-700">{year}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 relative">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Posición:</label>
          <div className="relative">
            <button 
              onClick={() => setShowPosDropdown(!showPosDropdown)}
              className="bg-slate-50 border-none rounded-xl px-4 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-red-500 flex items-center gap-2 min-w-[150px] justify-between"
            >
              {selectedPosiciones.length === 0 ? 'Todas' : 
               selectedPosiciones.length === 1 ? selectedPosiciones[0] : 
               `${selectedPosiciones.length} seleccionadas`}
              <i className={`fa-solid fa-chevron-down text-[10px] transition-transform ${showPosDropdown ? 'rotate-180' : ''}`}></i>
            </button>
            
            {showPosDropdown && (
              <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 p-2 max-h-60 overflow-y-auto">
                <button 
                  onClick={() => {
                    setSelectedPosiciones([]);
                    setShowPosDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 rounded-lg"
                >
                  Limpiar Selección
                </button>
                <div className="h-px bg-slate-100 my-2"></div>
                {ORDERED_POSITIONS.map(p => (
                  <label key={p} className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={selectedPosiciones.includes(p)}
                      onChange={() => {
                        const newPos = selectedPosiciones.includes(p)
                          ? selectedPosiciones.filter(pos => pos !== p)
                          : [...selectedPosiciones, p];
                        setSelectedPosiciones(newPos);
                      }}
                      className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-xs font-bold text-slate-700">{p}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 relative">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Club:</label>
          <div className="relative">
            <button 
              onClick={() => setShowClubDropdown(!showClubDropdown)}
              className="bg-slate-50 border-none rounded-xl px-4 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-red-500 flex items-center gap-2 min-w-[150px] justify-between"
            >
              {selectedClubId === null 
                ? 'Todos' 
                : (clubs.find(c => Number(c.id_club) === Number(selectedClubId) || Number(c.id) === Number(selectedClubId))?.nombre || 'Seleccionado')}
              <i className={`fa-solid fa-chevron-down text-[10px] transition-transform ${showClubDropdown ? 'rotate-180' : ''}`}></i>
            </button>
            
            {showClubDropdown && (
              <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 p-2 max-h-60 overflow-y-auto">
                <button 
                  onClick={() => {
                    setSelectedClubId(null);
                    setShowClubDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 rounded-lg"
                >
                  Limpiar Selección
                </button>
                <div className="h-px bg-slate-100 my-2"></div>
                {clubs.map(c => {
                  const cId = c.id_club || c.id;
                  const isSelected = selectedClubId === Number(cId);
                  return (
                    <button
                      key={cId}
                      onClick={() => {
                        setSelectedClubId(Number(cId));
                        setShowClubDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-xs rounded-lg transition-all ${
                        isSelected 
                          ? 'bg-red-50 text-red-600 font-bold' 
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {c.nombre}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        
        {userRole === 'club' && (activeTab === 'grupal' || activeTab === 'laboratorio' || activeTab === 'tabla' || activeTab === 'top10') && (
          <div className="flex items-center gap-3 animate-in fade-in zoom-in-95 duration-200">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ámbito:</label>
            <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
              <button
                type="button"
                onClick={() => setClubFilterMode('all')}
                className={`px-3 py-1.5 text-[10px] uppercase tracking-wider rounded-lg transition-all ${
                  clubFilterMode === 'all'
                    ? 'bg-red-600 text-white shadow-sm font-black'
                    : 'text-slate-400 hover:text-slate-600 font-bold'
                }`}
              >
                Todos los Clubes
              </button>
              <button
                type="button"
                onClick={() => setClubFilterMode('club')}
                className={`px-3 py-1.5 text-[10px] uppercase tracking-wider rounded-lg transition-all ${
                  clubFilterMode === 'club'
                    ? 'bg-red-600 text-white shadow-sm font-black'
                    : 'text-slate-400 hover:text-slate-600 font-bold'
                }`}
              >
                Solo mi Club
              </button>
            </div>
          </div>
        )}
        
        {(activeTab === 'individual' || activeTab === 'huella') && (
          <div className="flex items-center gap-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jugador:</label>
            <select 
              value={selectedPlayerId || ''} 
              onChange={(e) => setSelectedPlayerId(Number(e.target.value))}
              className="bg-slate-50 border-none rounded-xl px-4 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">Seleccionar Atleta</option>
              {anonymizedPlayers
                .filter(p => {
                  const pYear = (p as any).anio ? Number((p as any).anio) : new Date(p.fecha_nacimiento).getFullYear();
                  const yearMatch = selectedAnios.length === 0 || selectedAnios.includes(pYear);
                  const posMatch = selectedPosiciones.length === 0 || selectedPosiciones.includes(p.posicion);
                  
                  if (userRole === 'club') {
                    if (userClubId) {
                      return yearMatch && posMatch && p.id_club === userClubId;
                    } else if (userClub) {
                      const uClubNorm = normalizeClub(userClub);
                      const pClub = p.club || p.club_name || '';
                      return yearMatch && posMatch && pClub && normalizeClub(pClub) === uClubNorm;
                    }
                  }
                  return yearMatch && posMatch;
                })
                .map(p => (
                  <option key={p.player_id} value={p.player_id}>{p.nombre} {p.apellido1} {p.apellido2 || ''}</option>
                ))}
            </select>
          </div>
        )}

        {activeTab === 'laboratorio' && (
          <div className="flex items-center gap-3 animate-in fade-in zoom-in-95 duration-200">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre:</label>
            <select 
              value={highlightPlayerId || ''} 
              onChange={(e) => setHighlightPlayerId(e.target.value ? Number(e.target.value) : null)}
              className="bg-slate-50 border-none rounded-xl px-4 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-red-500 max-w-[200px]"
            >
              <option value="">Todos (Sin resaltar)</option>
              {filteredByClubScopePlayers
                .filter(p => {
                  const pYear = (p as any).anio ? Number((p as any).anio) : new Date(p.fecha_nacimiento).getFullYear();
                  const yearMatch = selectedAnios.length === 0 || selectedAnios.includes(pYear);
                  const posMatch = selectedPosiciones.length === 0 || selectedPosiciones.includes(p.posicion);
                  return yearMatch && posMatch;
                })
                .sort((a, b) => `${a.nombre} ${a.apellido1}`.localeCompare(`${b.nombre} ${b.apellido1}`))
                .map(p => (
                  <option key={p.player_id} value={p.player_id}>
                    {p.nombre} {p.apellido1}
                  </option>
                ))}
            </select>
          </div>
        )}
      </div>

      {/* CONTENIDO DINÁMICO */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'huella' && (
          <AthleteHuella 
            player={selectedPlayer} 
            imtp={imtpData.filter(d => d.player_id === selectedPlayerId)}
            speed={speedData.filter(d => d.player_id === selectedPlayerId)}
            antropometria={antropometria.filter(d => d.player_id === selectedPlayerId)}
            vo2max={vo2maxData.filter(d => d.player_id === selectedPlayerId)}
            medicalReports={medicalReports.filter(d => d.player_id === selectedPlayerId)}
            internalLoads={internalLoads.filter(d => d.player_id === selectedPlayerId)}
            gps={gpsData.filter(d => d.player_id === selectedPlayerId)}
            allImtp={imtpData}
            allSpeed={speedData}
            allAntro={antropometria}
            allVo2={vo2maxData}
            allPlayers={anonymizedPlayers}
            clubs={clubs}
          />
        )}
        {activeTab === 'individual' && (
          <IndividualDashboard 
            player={selectedPlayer} 
            imtp={imtpData.filter(d => d.player_id === selectedPlayerId)}
            speed={speedData.filter(d => d.player_id === selectedPlayerId)}
            antropometria={antropometria.filter(d => d.player_id === selectedPlayerId)}
            vo2max={vo2maxData.filter(d => d.player_id === selectedPlayerId)}
            clubs={clubs}
          />
        )}
        {activeTab === 'grupal' && (
          <SquadAnalytics 
            anios={selectedAnios} 
            posiciones={selectedPosiciones}
            players={filteredByClubScopePlayers}
            gps={gpsData}
            speed={speedData}
            imtp={imtpData}
            vo2max={vo2maxData}
            antropometria={antropometria}
          />
        )}
        {activeTab === 'laboratorio' && (
          <Laboratorio 
            players={filteredByClubScopePlayers}
            imtp={imtpData}
            speed={speedData}
            vo2max={vo2maxData}
            antropometria={antropometria}
            selectedAnios={selectedAnios}
            selectedPosiciones={selectedPosiciones}
            highlightPlayerId={highlightPlayerId}
          />
        )}
        {activeTab === 'categorias' && userRole !== 'club' && (
          <Categorias 
            players={anonymizedPlayers}
            imtp={imtpData}
            speed={speedData}
            vo2max={vo2maxData}
            antropometria={antropometria}
            selectedAnios={selectedAnios}
            selectedPosiciones={selectedPosiciones}
          />
        )}
        {activeTab === 'insights' && userRole !== 'club' && (
          <CorrelationsInsights 
            players={anonymizedPlayers}
            imtp={imtpData}
            speed={speedData}
            vo2max={vo2maxData}
            antropometria={antropometria}
            selectedAnios={selectedAnios}
            selectedPosiciones={selectedPosiciones}
          />
        )}
        {activeTab === 'salud' && userRole !== 'club' && (
          <HealthLoad 
            player={selectedPlayer} 
            injury={injuries.find(i => i.player_id === selectedPlayerId)}
            gps={gpsData.filter(d => d.player_id === selectedPlayerId)}
          />
        )}

        {activeTab === 'tabla' && (
          <DataTable 
            imtp={imtpData} 
            speed={speedData} 
            vo2max={vo2maxData} 
            antropometria={antropometria}
            players={filteredByClubScopePlayers} 
          />
        )}

        {activeTab === 'top10' && (
          <TopTenDashboard
            players={filteredByClubScopePlayers}
            imtpData={imtpData}
            speedData={speedData}
            vo2maxData={vo2maxData}
            selectedAnios={selectedAnios}
            selectedPosiciones={selectedPosiciones}
            selectedClubId={selectedClubId}
            clubs={clubs}
            userRole={userRole}
            clubFilterMode={clubFilterMode}
            userClub={userClub}
            userClubId={userClubId}
            box1Metric={box1Metric}
            setBox1Metric={setBox1Metric}
            box2Metric={box2Metric}
            setBox2Metric={setBox2Metric}
            box3Metric={box3Metric}
            setBox3Metric={setBox3Metric}
            box4Metric={box4Metric}
            setBox4Metric={setBox4Metric}
            onSelectPlayer={(id) => {
              setSelectedPlayerId(id);
              setActiveTab('huella');
            }}
          />
        )}
      </div>
    </div>
  );
};

// --- SUB-COMPONENTES ---

const METRICS_OPTIONS = [
  { label: 'IMTP Fuerza (N)', key: 'imtp_fuerza_n', table: 'imtp' },
  { label: 'IMTP F. Relativa', key: 'imtp_f_relativa_n_kg', table: 'imtp' },
  { label: 'IMTP Asimetría', key: 'imtp_asimetria', table: 'imtp' },
  { label: 'DSI Valor', key: 'dsi_valor', table: 'imtp' },
  { label: 'Fuerza CMJ', key: 'fuerza_cmj', table: 'imtp' },
  { label: 'CMJ RSI Mod', key: 'cmj_rsi_mod', table: 'imtp' },
  { label: 'CMJ Altura', key: 'cmj_altura_salto_im', table: 'imtp' },
  { label: 'CMJ Salto TV', key: 'cmj_salto_tv', table: 'imtp' },
  { label: 'CMJ Peak Pot. Rel.', key: 'cmj_peak_pot_relativa', table: 'imtp' },
  { label: 'CMJ Asim. Aterrizaje', key: 'cmj_asimetria_aterrizaje', table: 'imtp' },
  { label: 'Landing (N)', key: 'landing_n', table: 'imtp' },
  { label: 'Landing Relativo', key: 'landing_relativo', table: 'imtp' },
  { label: 'AVK Peak Pot. Rel.', key: 'avk_peak_pot_relativa', table: 'imtp' },
  { label: 'AVK Indice Brazos TV', key: 'avk_indice_uso_brazos_tv', table: 'imtp' },
  { label: 'AVK X TV', key: 'avk_x_tv', table: 'imtp' },
  { label: 'AVK X IM', key: 'avk_x_im', table: 'imtp' },
  { label: 'AVK Indice Brazos IM', key: 'avk_indice_uso_brazos_im', table: 'imtp' },
  { label: 'SLCMJ Izq Altura IM', key: 'slcmj_izq_altura_im', table: 'imtp' },
  { label: 'SLCMJ Izq Altura TV', key: 'slcmj_izq_altura_tv', table: 'imtp' },
  { label: 'SLCMJ Der Altura IM', key: 'slcmj_der_altura_im', table: 'imtp' },
  { label: 'SLCMJ Der Altura TV', key: 'slcmj_der_altura_tv', table: 'imtp' },
  { label: 'SLCMJ Dif % IM', key: 'slcmj_diferencia_pct_im', table: 'imtp' },
  { label: 'SLCMJ Dif % TV', key: 'slcmj_diferencia_pct_tv', table: 'imtp' },
  { label: 'Déficit Bilateral', key: 'deficit_bilateral', table: 'imtp' },
  { label: 'Altura x RSI Mod', key: 'altura_x_rsi_mod', table: 'imtp' },
  { label: 'Tiempo 10m', key: 'tiempo_10m', table: 'speed' },
  { label: 'Velocidad 10m', key: 'vel_10m', table: 'speed' },
  { label: 'Tiempo 10-20m', key: 'tiempo_10_20m', table: 'speed' },
  { label: 'Velocidad 10-20m', key: 'vel_10_20m', table: 'speed' },
  { label: 'Tiempo 20-30m', key: 'tiempo_20_30m', table: 'speed' },
  { label: 'Velocidad 20-30m', key: 'vel_20_30m', table: 'speed' },
  { label: 'Tiempo Total', key: 'tiempo_total', table: 'speed' },
  { label: 'VO2 Max', key: 'vo2_max', table: 'vo2max' },
  { label: 'VMA (km/h)', key: 'vam', table: 'vo2max' },
  { label: 'FC Máxima', key: 'fc_max', table: 'vo2max' },
  { label: 'Nivel', key: 'nivel', table: 'vo2max' },
  { label: 'Pasada', key: 'pasada', table: 'vo2max' },
  { label: 'Distancia (m)', key: 'mts', table: 'vo2max' },
  { label: 'VFA', key: 'vfa', table: 'vo2max' },
  { label: 'VT1 Vel', key: 'vt1_vel', table: 'vo2max' },
  { label: 'VT1 %', key: 'vt1_pct', table: 'vo2max' },
  { label: 'VT1 FC', key: 'vt1_fc', table: 'vo2max' },
  { label: 'VT2 Vel', key: 'vt2_vel', table: 'vo2max' },
  { label: 'VT2 %', key: 'vt2_pct', table: 'vo2max' },
  { label: 'VT2 FC', key: 'vt2_fc', table: 'vo2max' },
  { label: '% Grasa', key: 'masa_adiposa_pct', table: 'antropometria' },
  { label: 'Peso (kg)', key: 'masa_corporal_kg', table: 'antropometria' },
  { label: 'Talla (cm)', key: 'talla_cm', table: 'antropometria' },
  { label: 'Talla Sentada', key: 'talla_sentada_cm', table: 'antropometria' },
  { label: '% Muscular', key: 'masa_muscular_pct', table: 'antropometria' },
  { label: '% Óseo', key: 'masa_osea_pct', table: 'antropometria' },
  { label: 'Suma 6 Pliegues', key: 'sum_pliegues_6_mm', table: 'antropometria' },
  { label: 'Suma 8 Pliegues', key: 'sum_pliegues_8_mm', table: 'antropometria' },
  { label: 'Índice IMO', key: 'indice_imo', table: 'antropometria' },
  { label: 'Índice IMC', key: 'indice_imc', table: 'antropometria' },
  { label: 'Masa Muscular (kg)', key: 'masa_muscular_kg', table: 'antropometria' },
  { label: 'Masa Adiposa (kg)', key: 'masa_adiposa_kg', table: 'antropometria' },
  { label: 'Masa Ósea (kg)', key: 'masa_osea_kg', table: 'antropometria' },
  { label: 'Somatotipo Endo', key: 'somatotipo_endo', table: 'antropometria' },
  { label: 'Somatotipo Meso', key: 'somatotipo_meso', table: 'antropometria' },
  { label: 'Somatotipo Ecto', key: 'somatotipo_ecto', table: 'antropometria' },
  { label: 'Maduración Media', key: 'maduracion_media', table: 'antropometria' },
  { label: 'PHV Media', key: 'phv_media', table: 'antropometria' },
  { label: 'Estatura Proy (cm)', key: 'estatura_proy_media_cm', table: 'antropometria' },
];

const getLatestMetricValue = (
  playerId: number,
  metricKey: string,
  imtp: any[],
  speed: any[],
  vo2max: any[],
  antropometria: any[]
): number | undefined => {
  const option = METRICS_OPTIONS.find(o => o.key === metricKey);
  if (!option) return undefined;
  
  let records: any[] = [];
  let dateField = '';
  
  if (option.table === 'imtp') {
    records = imtp;
    dateField = 'fecha_test';
  } else if (option.table === 'speed') {
    records = speed;
    dateField = 'fecha';
  } else if (option.table === 'vo2max') {
    records = vo2max;
    dateField = 'fecha';
  } else if (option.table === 'antropometria') {
    records = antropometria;
    dateField = 'fecha_medicion';
  } else {
    return undefined;
  }
  
  const sorted = records
    .filter(r => Number(r.player_id) === Number(playerId))
    .sort((a, b) => new Date(b[dateField]).getTime() - new Date(a[dateField]).getTime());
    
  for (const r of sorted) {
    const val = r[metricKey];
    if (val !== null && val !== undefined && val !== '') {
      const valNum = Number(val);
      if (!isNaN(valNum)) {
        return valNum;
      }
    }
  }
  
  return undefined;
};

const TachometerGauge = ({ 
  value, 
  average, 
  maxValue, 
  title, 
  unit, 
  color = 'stroke-red-600',
  fillColor = 'text-red-600',
  lowerIsBetter = false,
  percentile,
  outlier
}: { 
  value: number; 
  average: number; 
  maxValue: number; 
  title: string; 
  unit: string; 
  color?: string;
  fillColor?: string;
  lowerIsBetter?: boolean;
  percentile?: number;
  outlier?: 'low' | 'high';
}) => {
  const safeVal = isNaN(value) || value < 0 ? 0 : value;
  const safeAvg = isNaN(average) || average < 0 ? 0 : average;
  const max = isNaN(maxValue) || maxValue <= 0 ? 100 : maxValue;
  
  const valuePct = Math.min(100, Math.max(0, (safeVal / max) * 100));
  const avgPct = Math.min(100, Math.max(0, (safeAvg / max) * 100));

  const r = 70;
  const cx = 100;
  const cy = 90;
  const circ = Math.PI * r; 
  const strokeDashoffset = circ - (valuePct / 100) * circ;

  const avgAngleRad = Math.PI - (avgPct / 100) * Math.PI;
  const avgX = cx + r * Math.cos(avgAngleRad);
  const avgY = cy - r * Math.sin(avgAngleRad);

  const valueAngleRad = Math.PI - (valuePct / 100) * Math.PI;
  const needleLen = r - 10;
  const needleX = cx + needleLen * Math.cos(valueAngleRad);
  const needleY = cy - needleLen * Math.sin(valueAngleRad);

  const isBetter = lowerIsBetter 
    ? (safeVal > 0 && safeAvg > 0 ? safeVal <= safeAvg : false) 
    : (safeVal >= safeAvg);

  const pctDiff = safeAvg > 0 
    ? (lowerIsBetter 
        ? ((safeAvg - safeVal) / safeAvg) * 100 
        : ((safeVal - safeAvg) / safeAvg) * 100
      )
    : 0;

  const getPercentileLevel = (pct: number) => {
    if (pct >= 90) return 'Elite';
    if (pct >= 75) return 'Sobresaliente';
    if (pct >= 45) return 'Promedio';
    if (pct >= 20) return 'Bajo Promedio';
    return 'Por Mejorar';
  };

  const getPercentileColorClass = (pct: number) => {
    if (pct >= 90) return 'text-purple-600 bg-purple-50 border-purple-100 dark:border-purple-200/20';
    if (pct >= 75) return 'text-emerald-600 bg-emerald-50 border-emerald-100 dark:border-emerald-200/20';
    if (pct >= 45) return 'text-blue-600 bg-blue-50 border-blue-100 dark:border-blue-200/20';
    if (pct >= 20) return 'text-orange-600 bg-orange-50 border-orange-100 dark:border-orange-200/20';
    return 'text-red-500 bg-red-50 border-red-100 dark:border-red-200/20';
  };

  return (
    <div key={title} className="bg-slate-50/50 rounded-3xl p-5 border border-slate-100 flex flex-col items-center justify-between shadow-xs hover:border-slate-200 hover:bg-slate-50/80 transition-all duration-300">
      <div className="text-center w-full">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">{title}</span>
        <div className="flex flex-col items-center justify-center">
          <div className="flex justify-center items-baseline gap-1">
            <span className="text-xl font-black text-slate-900 italic tracking-tight">
              {safeVal > 0 ? safeVal.toLocaleString('es-ES', { maximumFractionDigits: 1 }) : 'S/D'}
            </span>
            {safeVal > 0 && <span className="text-[9px] font-bold text-slate-400 uppercase">{unit}</span>}
          </div>
          {outlier && safeVal > 0 && (
            <div className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-[8px] font-black text-amber-700 px-2 py-0.5 mt-1 rounded-full uppercase tracking-wider animate-pulse">
              <i className="fa-solid fa-triangle-exclamation text-[7px]"></i> Atípico {outlier === 'high' ? 'Alto' : 'Bajo'}
            </div>
          )}
        </div>
      </div>

      <div className="relative w-full h-24 my-2 flex items-center justify-center overflow-hidden">
        <svg viewBox="0 0 200 110" className="w-36 h-24">
          <path 
            d="M 30 90 A 70 70 0 0 1 170 90" 
            fill="none" 
            stroke="#f1f5f9" 
            strokeWidth="12" 
            strokeLinecap="round"
          />
          {safeVal > 0 && (
            <path 
              d="M 30 90 A 70 70 0 0 1 170 90" 
              fill="none" 
              className={`${color} stroke-current`}
              strokeWidth="12" 
              strokeLinecap="round"
              strokeDasharray={`${circ} ${circ * 2}`}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
            />
          )}

          {safeAvg > 0 && (
            <circle 
              cx={avgX} 
              cy={avgY} 
              r="5" 
              fill="#0f172a" 
              stroke="#ffffff"
              strokeWidth="1.5"
            />
          )}

          <circle cx={cx} cy={cy} r="5" className={fillColor} fill="currentColor" />

          {safeVal > 0 && (
            <line 
              x1={cx} 
              y1={cy} 
              x2={needleX} 
              y2={needleY} 
              stroke="#0f172a" 
              strokeWidth="3.5" 
              strokeLinecap="round"
              style={{ transition: 'transform 0.8s ease-out', transformOrigin: `${cx}px ${cy}px` }}
            />
          )}
        </svg>

        <div className="absolute bottom-0 text-center">
          <p className="text-[7px] font-black uppercase text-slate-400 tracking-wider">Promedio Cat.</p>
          <p className="text-[10px] font-black text-slate-700">
            {safeAvg > 0 ? `${safeAvg.toLocaleString('es-ES', { maximumFractionDigits: 1 })} ${unit}` : 'S/D'}
          </p>
        </div>
      </div>

      <div className="w-full flex justify-between items-center bg-white px-3 py-1.5 rounded-xl border border-slate-100 z-10 mt-1">
        <div className="text-left">
          <p className="text-[7px] font-black uppercase text-slate-400 tracking-wider">vs Promedio</p>
          <p className={`text-[9px] font-black italic ${isBetter && safeVal > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {safeVal > 0 && safeAvg > 0 ? `${isBetter ? '+' : ''}${pctDiff.toFixed(1)}%` : '—'}
          </p>
        </div>
        <div className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase ${safeVal > 0 && safeAvg > 0 ? (isBetter ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500') : 'bg-slate-50 text-slate-400'}`}>
          {safeVal > 0 && safeAvg > 0 ? (isBetter ? 'Sobresaliente' : 'Bajo Promedio') : 'Sin Marcas'}
        </div>
      </div>

      {percentile !== undefined && safeVal > 0 && (
        <div className="w-full flex justify-between items-center bg-white px-3 py-1 mt-1.5 rounded-xl border border-slate-100 z-10">
          <div className="text-left">
            <p className="text-[7px] font-black uppercase text-slate-400 tracking-wider">Percentil</p>
            <p className="text-[9px] font-black italic text-slate-900">
              P{percentile}
            </p>
          </div>
          <div className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase border ${getPercentileColorClass(percentile)}`}>
            {getPercentileLevel(percentile)}
          </div>
        </div>
      )}
    </div>
  );
};

const parseAthleteAiSummary = (text: string | null) => {
  if (!text) return null;

  let capacities = "";
  let improvements: string[] = [];
  let conclusion = "";

  const lowerText = text.toLowerCase();
  
  // Find indicators of various possible sections
  const capIdx = Math.max(
    lowerText.indexOf("resumen de capacidades"), 
    lowerText.indexOf("1. resumen de capacidades"),
    lowerText.indexOf("capacidades")
  );
  const impIdx = Math.max(
    lowerText.indexOf("puntos de mejora"), 
    lowerText.indexOf("2. puntos de mejora"),
    lowerText.indexOf("puntos de mej"),
    lowerText.indexOf("aspectos a trabajar")
  );
  const conIdx = Math.max(
    lowerText.indexOf("conclusión técnica"), 
    lowerText.indexOf("3. conclusión técnica"),
    lowerText.indexOf("conclusion tec"),
    lowerText.indexOf("conclusión")
  );

  // Parse Capacities
  if (capIdx !== -1) {
    const start = text.indexOf("\n", capIdx);
    const end = impIdx !== -1 ? impIdx : (conIdx !== -1 ? conIdx : text.length);
    capacities = text.substring(start, end).trim();
    capacities = capacities.replace(/^(?:###|####|##|\*\*|:|-|\s)+/, "").trim();
  } else {
    if (impIdx !== -1) {
      capacities = text.substring(0, impIdx).trim();
    } else {
      capacities = text;
    }
  }

  // Parse Improvements
  if (impIdx !== -1) {
    const start = text.indexOf("\n", impIdx);
    const end = conIdx !== -1 ? conIdx : text.length;
    const impText = text.substring(start, end).trim();
    
    const lines = impText.split("\n");
    improvements = lines
      .map(line => line.trim())
      .filter(line => line.startsWith("-") || line.startsWith("*") || /^\d+\./.test(line))
      .map(line => line.replace(/^(?:-|\*|\d+\.)\s*/, "").trim());

    if (improvements.length === 0) {
      const cleanedImp = impText.replace(/^(?:###|####|##|\*\*|:|-|\s)+/, "").trim();
      if (cleanedImp) {
        improvements = [cleanedImp];
      }
    }
  }

  // Parse Conclusion
  if (conIdx !== -1) {
    const start = text.indexOf("\n", conIdx);
    conclusion = text.substring(start).trim();
    conclusion = conclusion.replace(/^(?:###|####|##|\*\*|:|-|\s)+/, "").trim();
  }

  return {
    capacities: capacities || "El jugador presenta un correcto perfil morfológico y neuromuscular, adaptado al microciclo.",
    improvements: improvements.length > 0 ? improvements : [
      "Optimizar la resistencia intermitente por medio de bloques anaeróbicos.",
      "Sesiones preventivas compensatorias para mitigar asimetrías bilaterales en salto vertical."
    ],
    conclusion: conclusion || "Deportista con alto valor atlético y proyección competitiva internacional."
  };
};

const getLatestCompositeAntro = (records: any[], playerId: number): any => {
  const sorted = records
    .filter(d => Number(d.player_id) === Number(playerId))
    .sort((a, b) => new Date(b.fecha_medicion).getTime() - new Date(a.fecha_medicion).getTime());
  if (sorted.length === 0) return undefined;
  
  const composite = { ...sorted[0] };
  const fieldsToMerge = [
    'talla_cm', 'talla_sentada_cm', 'masa_corporal_kg',
    'masa_muscular_kg', 'masa_muscular_pct', 
    'masa_adiposa_kg', 'masa_adiposa_pct',
    'masa_osea_kg', 'masa_osea_pct',
    'indice_imo', 'indice_imc',
    'somatotipo_endo', 'somatotipo_meso', 'somatotipo_ecto',
    'somatotipo_eje_x', 'somatotipo_eje_y',
    'maduracion_mirwald', 'maduracion_moore', 'maduracion_media',
    'phv_mirwald', 'phv_moore', 'phv_media',
    'sum_pliegues_6_mm', 'sum_pliegues_8_mm'
  ];
  
  fieldsToMerge.forEach(field => {
    const initialVal = composite[field];
    if (initialVal === null || initialVal === undefined || initialVal === '' || isNaN(Number(initialVal)) || Number(initialVal) <= 0) {
      for (const r of sorted) {
        const val = r[field];
        if (val !== null && val !== undefined && val !== '' && !isNaN(Number(val)) && Number(val) > 0) {
          composite[field] = val;
          break;
        }
      }
    }
  });
  
  return composite;
};

const AthleteHuella = ({ 
  player, imtp, speed, antropometria, vo2max, medicalReports, internalLoads, gps,
  allImtp, allSpeed, allAntro, allVo2, allPlayers, clubs 
}: { 
  player?: PlayerData, 
  imtp: IMTPData[], 
  speed: SpeedTestData[], 
  antropometria: AntropometriaData[],
  vo2max: VO2MaxData[],
  medicalReports: MedicalReport[],
  internalLoads: InternalLoadData[],
  gps: GPSData[],
  allImtp: IMTPData[],
  allSpeed: SpeedTestData[],
  allAntro: AntropometriaData[],
  allVo2: VO2MaxData[],
  allPlayers: PlayerData[],
  clubs: any[]
}) => {
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiTab, setAiTab] = useState<'perfil' | 'mejoras' | 'chat'>('perfil');
  const [goalStatuses, setGoalStatuses] = useState<Record<string, 'todo' | 'progress' | 'done'>>({});
  const [chatQuery, setChatQuery] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [chatSending, setChatSending] = useState(false);
  const [comparisonTarget, setComparisonTarget] = useState<'category' | '2010plus'>('category');
  const [excludeOutliers, setExcludeOutliers] = useState(false);

  useEffect(() => {
    if (player) {
      generateAiSummary();
      setGoalStatuses({});
      setChatHistory([]);
      setAiTab('perfil');
    }
  }, [player]);

  // Pre-process antropometria and allAntro arrays to calculate IMO dynamically if empty or 0
  const processedAntro = useMemo(() => {
    return (antropometria || []).map(d => {
      let imo = d.indice_imo;
      if (imo == null || isNaN(Number(imo)) || Number(imo) <= 0) {
        if (d.masa_muscular_kg != null && d.masa_osea_kg != null && Number(d.masa_osea_kg) > 0) {
          imo = Number(d.masa_muscular_kg) / Number(d.masa_osea_kg);
        } else {
          imo = 0;
        }
      }
      return {
        ...d,
        indice_imo: Math.round(Number(imo) * 100) / 100
      };
    });
  }, [antropometria]);

  const processedAllAntro = useMemo(() => {
    return (allAntro || []).map(d => {
      let imo = d.indice_imo;
      if (imo == null || isNaN(Number(imo)) || Number(imo) <= 0) {
        if (d.masa_muscular_kg != null && d.masa_osea_kg != null && Number(d.masa_osea_kg) > 0) {
          imo = Number(d.masa_muscular_kg) / Number(d.masa_osea_kg);
        } else {
          imo = 0;
        }
      }
      return {
        ...d,
        indice_imo: Math.round(Number(imo) * 100) / 100
      };
    });
  }, [allAntro]);

  const playerYearRaw = player ? ((player as any).anio ? Number((player as any).anio) : new Date(player.fecha_nacimiento).getFullYear()) : NaN;
  const playerYear = isNaN(playerYearRaw) ? '-' : playerYearRaw;

  const activeComparisonPlayerIds = useMemo(() => {
    if (!player) return [];
    if (comparisonTarget === '2010plus') {
      return allPlayers.filter(p => {
        const pYear = (p as any).anio ? Number((p as any).anio) : new Date(p.fecha_nacimiento).getFullYear();
        return !isNaN(pYear) && pYear <= 2010;
      }).map(p => p.player_id);
    } else {
      return allPlayers.filter(p => {
        const pYear = (p as any).anio ? Number((p as any).anio) : new Date(p.fecha_nacimiento).getFullYear();
        return pYear === playerYear;
      }).map(p => p.player_id);
    }
  }, [allPlayers, comparisonTarget, playerYear, player]);

  const getCohortOutliersCount = (data: any[], key: string, lowerIsBetter: boolean = false) => {
    let targetPlayerIds = activeComparisonPlayerIds;
    let playerBestValues = targetPlayerIds.map(pId => {
      const pRows = data.filter(d => d.player_id === pId && d[key] != null && !isNaN(Number(d[key])));
      if (pRows.length === 0) return null;
      const numericVals = pRows.map(r => Number(r[key])).filter(v => v > 0);
      if (numericVals.length === 0) return null;
      return lowerIsBetter ? Math.min(...numericVals) : Math.max(...numericVals);
    }).filter((v): v is number => v !== null);

    if (playerBestValues.length < 4) return 0;
    const sorted = [...playerBestValues].sort((a, b) => a - b);
    const getQuantile = (q: number) => {
      const pos = (sorted.length - 1) * q;
      const base = Math.floor(pos);
      const rest = pos - base;
      return sorted[base + 1] !== undefined
        ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
        : sorted[base];
    };
    const q1 = getQuantile(0.25);
    const q3 = getQuantile(0.75);
    const iqr = q3 - q1;
    const low = q1 - 1.5 * iqr;
    const high = q3 + 1.5 * iqr;

    const outliers = playerBestValues.filter(v => v < low || v > high);
    return outliers.length;
  };

  const totalCohortOutliers = useMemo(() => {
    let count = 0;
    count += getCohortOutliersCount(allImtp, 'imtp_fuerza_n');
    count += getCohortOutliersCount(allImtp, 'imtp_f_relativa_n_kg');
    count += getCohortOutliersCount(allSpeed, 'tiempo_total', true);
    count += getCohortOutliersCount(allImtp, 'cmj_rsi_mod');
    count += getCohortOutliersCount(allVo2, 'vo2_max');
    count += getCohortOutliersCount(processedAllAntro, 'masa_muscular_pct');
    count += getCohortOutliersCount(processedAllAntro, 'masa_muscular_kg');
    count += getCohortOutliersCount(processedAllAntro, 'masa_adiposa_pct', true);
    count += getCohortOutliersCount(processedAllAntro, 'masa_adiposa_kg', true);
    count += getCohortOutliersCount(processedAllAntro, 'sum_pliegues_6_mm', true);
    count += getCohortOutliersCount(processedAllAntro, 'indice_imo');
    return count;
  }, [activeComparisonPlayerIds, allImtp, allSpeed, allVo2, processedAllAntro]);

  const generateAiSummary = async () => {
    if (!player) return;
    setLoadingAi(true);
    try {
      const metrics = {
        imtp: imtp.slice(-1)[0],
        speed: speed.slice(-1)[0],
        antropometria: antropometria.slice(-1)[0],
        vo2max: vo2max.slice(-1)[0],
        recentMedical: medicalReports.slice(-3),
        recentLoads: internalLoads.slice(-7)
      };
      const summary = await getAthleteFootprintSummary(player, metrics);
      setAiSummary(summary);
    } catch (err) {
      console.error("Error generating AI summary:", err);
    } finally {
      setLoadingAi(false);
    }
  };

  const handleConsultAssistant = async (customQuery?: string) => {
    const query = customQuery || chatQuery;
    if (!query.trim() || !player) return;

    setChatSending(true);
    if (!customQuery) {
      setChatQuery('');
    }
    
    const userMessage = { role: 'user' as const, text: query };
    setChatHistory(prev => [...prev, userMessage]);

    try {
      const metrics = {
        imtp: imtp.slice(-1)[0],
        speed: speed.slice(-1)[0],
        antropometria: antropometria.slice(-1)[0],
        vo2max: vo2max.slice(-1)[0],
        recentLoads: internalLoads.slice(-5)
      };
      const currentHist = chatHistory.length > 0 ? chatHistory : [];
      const response = await askAthleteAiAssistant(player, metrics, query, [...currentHist, userMessage]);
      setChatHistory(prev => [...prev, { role: 'model' as const, text: response }]);
    } catch (err) {
      console.error("Error asking athlete AI assistant:", err);
      setChatHistory(prev => [...prev, { role: 'model' as const, text: "Error de conexión con la base del Director de Ciencias. Reintente." }]);
    } finally {
      setChatSending(false);
    }
  };


  if (!player) return (
    <div className="bg-white rounded-[40px] p-20 text-center border border-dashed border-slate-200">
      <i className="fa-solid fa-user-magnifying-glass text-4xl text-slate-200 mb-4"></i>
      <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Selecciona un atleta para visualizar su huella digital</p>
    </div>
  );

  const latestImtp = [...imtp].sort((a, b) => new Date(b.fecha_test).getTime() - new Date(a.fecha_test).getTime())[0];
  const latestSpeed = [...speed].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0];
  const latestAntro = getLatestCompositeAntro(processedAntro, player.player_id);
  const latestVo2 = [...vo2max].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0];

  // Personal Best Marks (Max values among player's records)
  const bestImtpFuerzaVal = imtp && imtp.length > 0 
    ? Math.max(...imtp.map(d => Number(d.imtp_fuerza_n)).filter(v => !isNaN(v) && v > 0)) 
    : 0;
  const bestImtpFuerza = bestImtpFuerzaVal !== -Infinity && bestImtpFuerzaVal > 0 ? bestImtpFuerzaVal : 0;

  const bestCmjHeightVal = imtp && imtp.length > 0 
    ? Math.max(...imtp.map(d => Number(d.cmj_altura_salto_im)).filter(v => !isNaN(v) && v > 0)) 
    : 0;
  const bestCmjHeight = bestCmjHeightVal !== -Infinity && bestCmjHeightVal > 0 ? bestCmjHeightVal : 0;

  const bestSpeedVal = speed && speed.length > 0
    ? Math.max(...speed.map(d => Number(d.vel_10m)).filter(v => !isNaN(v) && v > 0))
    : 0;
  const bestSpeed = bestSpeedVal !== -Infinity && bestSpeedVal > 0 ? bestSpeedVal : 0;

  const bestVo2Val = vo2max && vo2max.length > 0
    ? Math.max(...vo2max.map(d => Number(d.vo2_max)).filter(v => !isNaN(v) && v > 0))
    : 0;
  const bestVo2 = bestVo2Val !== -Infinity && bestVo2Val > 0 ? bestVo2Val : 0;

  const bestImtpRelativoVal = imtp && imtp.length > 0 
    ? Math.max(...imtp.map(d => Number(d.imtp_f_relativa_n_kg)).filter(v => !isNaN(v) && v > 0)) 
    : 0;
  const bestImtpRelativo = bestImtpRelativoVal !== -Infinity && bestImtpRelativoVal > 0 ? bestImtpRelativoVal : 0;

  const bestSpeedTimeVal = speed && speed.length > 0
    ? Math.min(...speed.map(d => Number(d.tiempo_total)).filter(v => !isNaN(v) && v > 0))
    : 0;
  const bestSpeedTime = bestSpeedTimeVal !== Infinity && bestSpeedTimeVal > 0 ? bestSpeedTimeVal : 0;

  const bestCmjRsiVal = imtp && imtp.length > 0
    ? Math.max(...imtp.map(d => Number(d.cmj_rsi_mod)).filter(v => !isNaN(v) && v > 0))
    : 0;
  const bestCmjRsi = bestCmjRsiVal !== -Infinity && bestCmjRsiVal > 0 ? bestCmjRsiVal : 0;

  const getAvg = (data: any[], key: string) => {
    let targetPlayerIds = activeComparisonPlayerIds;
    let values = data
      .filter(d => targetPlayerIds.includes(d.player_id) && d[key] != null && !isNaN(Number(d[key])))
      .map(d => Number(d[key]));

    if (values.length === 0) {
      values = data
        .filter(d => d[key] != null && !isNaN(Number(d[key])))
        .map(d => Number(d[key]));
    }

    if (values.length === 0) return 0;

    if (excludeOutliers && values.length >= 4) {
      const sorted = [...values].sort((a, b) => a - b);
      const getQuantile = (q: number) => {
        const pos = (sorted.length - 1) * q;
        const base = Math.floor(pos);
        const rest = pos - base;
        return sorted[base + 1] !== undefined
          ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
          : sorted[base];
      };
      const q1 = getQuantile(0.25);
      const q3 = getQuantile(0.75);
      const iqr = q3 - q1;
      const low = q1 - 1.5 * iqr;
      const high = q3 + 1.5 * iqr;
      values = values.filter(v => v >= low && v <= high);
    }

    if (values.length === 0) return 0;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return isNaN(avg) ? 0 : avg;
  };

  const getGlobalMax = (data: any[], key: string) => {
    const values = data
      .filter(d => d[key] != null && !isNaN(Number(d[key])))
      .map(d => Number(d[key]));
    if (values.length === 0) return 100;
    const maxVal = Math.max(...values);
    return isNaN(maxVal) ? 100 : maxVal;
  };

  const avgImtpFuerza = getAvg(allImtp, 'imtp_fuerza_n');
  const avgCmjHeight = getAvg(allImtp, 'cmj_altura_salto_im');
  const avgSpeed = getAvg(allSpeed, 'vel_10m');
  const avgVo2 = getAvg(allVo2, 'vo2_max');
  const avgMasaMuscular = getAvg(allAntro, 'masa_muscular_pct');

  const avgImtpRelativo = getAvg(allImtp, 'imtp_f_relativa_n_kg');
  const avgSpeedTime = getAvg(allSpeed, 'tiempo_total');
  const avgCmjRsi = getAvg(allImtp, 'cmj_rsi_mod');

  const latestMasaMuscular = (latestAntro?.masa_muscular_pct != null && !isNaN(Number(latestAntro.masa_muscular_pct)))
    ? Number(latestAntro.masa_muscular_pct)
    : 0;

  const maxScaleImtp = Math.max(bestImtpFuerza, avgImtpFuerza, getGlobalMax(allImtp, 'imtp_fuerza_n')) * 1.1;
  const maxScaleCmj = Math.max(bestCmjHeight, avgCmjHeight, getGlobalMax(allImtp, 'cmj_altura_salto_im')) * 1.1;
  const maxScaleSpeed = Math.max(bestSpeed, avgSpeed, getGlobalMax(allSpeed, 'vel_10m')) * 1.1;
  const maxScaleVo2 = Math.max(bestVo2, avgVo2, getGlobalMax(allVo2, 'vo2_max')) * 1.1;
  const maxScaleMasaMuscular = Math.max(latestMasaMuscular, avgMasaMuscular, getGlobalMax(allAntro, 'masa_muscular_pct')) * 1.1;

  const maxScaleImtpRelativo = Math.max(bestImtpRelativo, avgImtpRelativo, getGlobalMax(allImtp, 'imtp_f_relativa_n_kg'), 60) * 1.1;
  const maxScaleSpeedTime = Math.max(bestSpeedTime, avgSpeedTime, getGlobalMax(allSpeed, 'tiempo_total'), 6) * 1.1;
  const maxScaleCmjRsi = Math.max(bestCmjRsi, avgCmjRsi, getGlobalMax(allImtp, 'cmj_rsi_mod'), 1.5) * 1.1;

  const calculatePercentile = (playerValue: number, data: any[], key: string, lowerIsBetter: boolean = false) => {
    if (isNaN(playerValue) || playerValue <= 0) return undefined;

    let targetPlayerIds = activeComparisonPlayerIds;
    let playerBestValues = targetPlayerIds.map(pId => {
      const pRows = data.filter(d => d.player_id === pId && d[key] != null && !isNaN(Number(d[key])));
      if (pRows.length === 0) return null;
      const numericVals = pRows.map(r => Number(r[key])).filter(v => v > 0);
      if (numericVals.length === 0) return null;
      return lowerIsBetter ? Math.min(...numericVals) : Math.max(...numericVals);
    }).filter((v): v is number => v !== null);

    // Fallback: use all players if we don't have enough data in the specific age category
    if (playerBestValues.length <= 1) {
      const allPlayerIds = allPlayers.map(p => p.player_id);
      playerBestValues = allPlayerIds.map(pId => {
        const pRows = data.filter(d => d.player_id === pId && d[key] != null && !isNaN(Number(d[key])));
        if (pRows.length === 0) return null;
        const numericVals = pRows.map(r => Number(r[key])).filter(v => v > 0);
        if (numericVals.length === 0) return null;
        return lowerIsBetter ? Math.min(...numericVals) : Math.max(...numericVals);
      }).filter((v): v is number => v !== null);
    }

    if (playerBestValues.length === 0) return undefined;

    if (excludeOutliers && playerBestValues.length >= 4) {
      const sorted = [...playerBestValues].sort((a, b) => a - b);
      const getQuantile = (q: number) => {
        const pos = (sorted.length - 1) * q;
        const base = Math.floor(pos);
        const rest = pos - base;
        return sorted[base + 1] !== undefined
          ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
          : sorted[base];
      };
      const q1 = getQuantile(0.25);
      const q3 = getQuantile(0.75);
      const iqr = q3 - q1;
      const low = q1 - 1.5 * iqr;
      const high = q3 + 1.5 * iqr;
      playerBestValues = playerBestValues.filter(v => v >= low && v <= high);
    }

    if (playerBestValues.length === 0) return undefined;
    if (playerBestValues.length === 1) return 50;

    let countWorse = 0;
    let countEqual = 0;

    playerBestValues.forEach(val => {
      if (lowerIsBetter) {
        if (val > playerValue) {
          countWorse++;
        } else if (val === playerValue) {
          countEqual++;
        }
      } else {
        if (val < playerValue) {
          countWorse++;
        } else if (val === playerValue) {
          countEqual++;
        }
      }
    });

    const rank = countWorse + (countEqual - 1) * 0.5;
    const percentile = (rank / (playerBestValues.length - 1)) * 100;
    return Math.min(99, Math.max(1, Math.round(percentile)));
  };

  const checkOutlier = (playerValue: number, data: any[], key: string, lowerIsBetter: boolean = false) => {
    if (isNaN(playerValue) || playerValue <= 0) return undefined;

    let targetPlayerIds = activeComparisonPlayerIds;
    let playerBestValues = targetPlayerIds.map(pId => {
      const pRows = data.filter(d => d.player_id === pId && d[key] != null && !isNaN(Number(d[key])));
      if (pRows.length === 0) return null;
      const numericVals = pRows.map(r => Number(r[key])).filter(v => v > 0);
      if (numericVals.length === 0) return null;
      return lowerIsBetter ? Math.min(...numericVals) : Math.max(...numericVals);
    }).filter((v): v is number => v !== null);

    // Fallback if not enough data
    if (playerBestValues.length < 4) {
      const allPlayerIds = allPlayers.map(p => p.player_id);
      playerBestValues = allPlayerIds.map(pId => {
        const pRows = data.filter(d => d.player_id === pId && d[key] != null && !isNaN(Number(d[key])));
        if (pRows.length === 0) return null;
        const numericVals = pRows.map(r => Number(r[key])).filter(v => v > 0);
        if (numericVals.length === 0) return null;
        return lowerIsBetter ? Math.min(...numericVals) : Math.max(...numericVals);
      }).filter((v): v is number => v !== null);
    }

    if (playerBestValues.length < 4) return undefined;

    // Sort ascending
    const sorted = [...playerBestValues].sort((a, b) => a - b);
    
    // Function to calculate quantile
    const getQuantile = (q: number) => {
      const pos = (sorted.length - 1) * q;
      const base = Math.floor(pos);
      const rest = pos - base;
      if (sorted[base + 1] !== undefined) {
        return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
      } else {
        return sorted[base];
      }
    };

    const q1 = getQuantile(0.25);
    const q3 = getQuantile(0.75);
    const iqr = q3 - q1;

    // Outliers threshold: 1.5 * IQR
    const lowBoundary = q1 - 1.5 * iqr;
    const highBoundary = q3 + 1.5 * iqr;

    if (playerValue < lowBoundary) {
      return 'low';
    } else if (playerValue > highBoundary) {
      return 'high';
    }
    return undefined;
  };

  const pctImtp = calculatePercentile(bestImtpFuerza, allImtp, 'imtp_fuerza_n');
  const pctImtpRelativo = calculatePercentile(bestImtpRelativo, allImtp, 'imtp_f_relativa_n_kg');
  const pctSpeedTime = calculatePercentile(bestSpeedTime, allSpeed, 'tiempo_total', true);
  const pctCmjRsi = calculatePercentile(bestCmjRsi, allImtp, 'cmj_rsi_mod');
  const pctVo2 = calculatePercentile(bestVo2, allVo2, 'vo2_max');

  const outlierImtp = checkOutlier(bestImtpFuerza, allImtp, 'imtp_fuerza_n');
  const outlierImtpRelativo = checkOutlier(bestImtpRelativo, allImtp, 'imtp_f_relativa_n_kg');
  const outlierSpeedTime = checkOutlier(bestSpeedTime, allSpeed, 'tiempo_total', true);
  const outlierCmjRsi = checkOutlier(bestCmjRsi, allImtp, 'cmj_rsi_mod');
  const outlierVo2 = checkOutlier(bestVo2, allVo2, 'vo2_max');

  const avgMasaMuscularPct = getAvg(processedAllAntro, 'masa_muscular_pct');
  const avgMasaMuscularKg = getAvg(processedAllAntro, 'masa_muscular_kg');
  const avgMasaAdiposaPct = getAvg(processedAllAntro, 'masa_adiposa_pct');
  const avgMasaAdiposaKg = getAvg(processedAllAntro, 'masa_adiposa_kg');
  const avgSumPliegues6 = getAvg(processedAllAntro, 'sum_pliegues_6_mm');
  const avgIndiceImo = getAvg(processedAllAntro, 'indice_imo');

  const valMasaMuscularPct = (latestAntro?.masa_muscular_pct != null && !isNaN(Number(latestAntro.masa_muscular_pct))) ? Number(latestAntro.masa_muscular_pct) : 0;
  const valMasaMuscularKg = (latestAntro?.masa_muscular_kg != null && !isNaN(Number(latestAntro.masa_muscular_kg))) ? Number(latestAntro.masa_muscular_kg) : 0;
  const valMasaAdiposaPct = (latestAntro?.masa_adiposa_pct != null && !isNaN(Number(latestAntro.masa_adiposa_pct))) ? Number(latestAntro.masa_adiposa_pct) : 0;
  const valMasaAdiposaKg = (latestAntro?.masa_adiposa_kg != null && !isNaN(Number(latestAntro.masa_adiposa_kg))) ? Number(latestAntro.masa_adiposa_kg) : 0;
  const valSumPliegues6 = (latestAntro?.sum_pliegues_6_mm != null && !isNaN(Number(latestAntro.sum_pliegues_6_mm))) ? Number(latestAntro.sum_pliegues_6_mm) : 0;
  const valIndiceImo = (latestAntro?.indice_imo != null && !isNaN(Number(latestAntro.indice_imo))) ? Number(latestAntro.indice_imo) : 0;

  const maxScaleMasaMuscularPct = Math.max(valMasaMuscularPct, avgMasaMuscularPct, getGlobalMax(processedAllAntro, 'masa_muscular_pct'), 60) * 1.1;
  const maxScaleMasaMuscularKg = Math.max(valMasaMuscularKg, avgMasaMuscularKg, getGlobalMax(processedAllAntro, 'masa_muscular_kg'), 60) * 1.1;
  const maxScaleMasaAdiposaPct = Math.max(valMasaAdiposaPct, avgMasaAdiposaPct, getGlobalMax(processedAllAntro, 'masa_adiposa_pct'), 30) * 1.1;
  const maxScaleMasaAdiposaKg = Math.max(valMasaAdiposaKg, avgMasaAdiposaKg, getGlobalMax(processedAllAntro, 'masa_adiposa_kg'), 15) * 1.1;
  const maxScaleSumPliegues6 = Math.max(valSumPliegues6, avgSumPliegues6, getGlobalMax(processedAllAntro, 'sum_pliegues_6_mm'), 100) * 1.1;
  const maxScaleIndiceImo = Math.max(valIndiceImo, avgIndiceImo, getGlobalMax(processedAllAntro, 'indice_imo'), 5) * 1.1;

  const pctMasaMuscularPct = calculatePercentile(valMasaMuscularPct, processedAllAntro, 'masa_muscular_pct');
  const pctMasaMuscularKg = calculatePercentile(valMasaMuscularKg, processedAllAntro, 'masa_muscular_kg');
  const pctMasaAdiposaPct = calculatePercentile(valMasaAdiposaPct, processedAllAntro, 'masa_adiposa_pct', true);
  const pctMasaAdiposaKg = calculatePercentile(valMasaAdiposaKg, processedAllAntro, 'masa_adiposa_kg', true);
  const pctSumPliegues6 = calculatePercentile(valSumPliegues6, processedAllAntro, 'sum_pliegues_6_mm', true);
  const pctIndiceImo = calculatePercentile(valIndiceImo, processedAllAntro, 'indice_imo');

  const outlierMasaMuscularPct = checkOutlier(valMasaMuscularPct, processedAllAntro, 'masa_muscular_pct');
  const outlierMasaMuscularKg = checkOutlier(valMasaMuscularKg, processedAllAntro, 'masa_muscular_kg');
  const outlierMasaAdiposaPct = checkOutlier(valMasaAdiposaPct, processedAllAntro, 'masa_adiposa_pct', true);
  const outlierMasaAdiposaKg = checkOutlier(valMasaAdiposaKg, processedAllAntro, 'masa_adiposa_kg', true);
  const outlierSumPliegues6 = checkOutlier(valSumPliegues6, processedAllAntro, 'sum_pliegues_6_mm', true);
  const outlierIndiceImo = checkOutlier(valIndiceImo, processedAllAntro, 'indice_imo');

  const radarData = [
    { subject: 'Potencia', A: (bestImtpFuerza > 0) ? bestImtpFuerza : ((latestImtp?.imtp_fuerza_n != null && !isNaN(Number(latestImtp.imtp_fuerza_n))) ? Number(latestImtp.imtp_fuerza_n) : 0), B: avgImtpFuerza, fullMark: 5000 },
    { subject: 'Velocidad', A: (bestSpeed > 0) ? bestSpeed : ((latestSpeed?.vel_10m != null && !isNaN(Number(latestSpeed.vel_10m))) ? Number(latestSpeed.vel_10m) : 0), B: avgSpeed, fullMark: 10 },
    { subject: 'Resistencia', A: (bestVo2 > 0) ? bestVo2 : ((latestVo2?.vo2_max != null && !isNaN(Number(latestVo2.vo2_max))) ? Number(latestVo2.vo2_max) : 0), B: avgVo2, fullMark: 80 },
    { subject: 'Masa Musc.', A: (latestAntro?.masa_muscular_pct != null && !isNaN(Number(latestAntro.masa_muscular_pct))) ? Number(latestAntro.masa_muscular_pct) : 0, B: getAvg(processedAllAntro, 'masa_muscular_pct'), fullMark: 60 },
    { subject: 'Masa Grasa', A: (latestAntro?.masa_adiposa_pct != null && !isNaN(Number(latestAntro.masa_adiposa_pct))) ? 100 - Number(latestAntro.masa_adiposa_pct) : 0, B: 100 - getAvg(processedAllAntro, 'masa_adiposa_pct'), fullMark: 100 },
  ];

  const normalizedRadarData = radarData.map(d => ({
    subject: d.subject,
    A: (d.A / d.fullMark) * 100,
    B: (d.B / d.fullMark) * 100,
  }));

  return (
    <div className="space-y-8">
      {/* HEADER BENTO STYLE */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-50 rounded-full -mr-32 -mt-32 blur-3xl opacity-50"></div>
          <div className="w-40 h-40 bg-slate-900 rounded-[40px] flex items-center justify-center text-white border-4 border-white shadow-2xl relative z-10">
            <i className="fa-solid fa-user text-6xl opacity-20 absolute"></i>
            <span className="text-5xl font-black italic">{player.nombre.charAt(0)}{player.apellido1.charAt(0)}</span>
          </div>
          <div className="relative z-10 flex-1">
            <div className="flex items-center gap-3 mb-3">
               <span className="bg-red-600 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-red-200">Elite Performance</span>
               <span className="bg-slate-900 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">ID: {player.player_id}</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter italic leading-none mb-2">{player.nombre} {player.apellido1} {player.apellido2 || ''}</h2>
            <div className="flex items-center gap-3">
               <span className="text-slate-400 font-black text-sm uppercase tracking-widest">{player.posicion}</span>
               <span className="text-slate-200">|</span>
               <ClubBadge clubName={player.club || player.club_name} idClub={player.id_club} clubs={clubs} logoSize="w-5 h-5" className="text-slate-600 font-black text-sm uppercase tracking-widest" />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-8">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Año Nac.</p>
                <p className="text-xl font-black italic text-slate-900">{playerYear}</p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Talla (cm)</p>
                <p className="text-xl font-black italic text-slate-900">
                  {(latestAntro?.talla_cm != null && !isNaN(Number(latestAntro.talla_cm))) ? latestAntro.talla_cm : '-'}
                </p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Peso (kg)</p>
                <p className="text-xl font-black italic text-slate-900">
                  {(latestAntro?.masa_corporal_kg != null && !isNaN(Number(latestAntro.masa_corporal_kg))) ? latestAntro.masa_corporal_kg : '-'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-emerald-600 rounded-[40px] p-8 text-white shadow-xl shadow-emerald-100 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-2">Disponibilidad</p>
            <h3 className="text-3xl font-black italic uppercase leading-none tracking-tighter">Apto para<br/>Competición</h3>
          </div>
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
              <span className="text-xs font-black uppercase tracking-widest">Disponible 100%</span>
            </div>
            <div className="h-1 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white w-full"></div>
            </div>
          </div>
        </div>
      </div>

      {/* TACHOMETERS FULL WIDTH ROW UNDER HEADER */}
      <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
            <i className="fa-solid fa-gauge-high text-red-600"></i>
            Mejores Valores de Evaluaciones vs Promedio {comparisonTarget === 'category' ? `Categoría (${playerYear})` : 'Grupo Seleccionado (2010+)'}
          </h3>
          <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
            {/* Outliers Filter Toggle */}
            <button
              onClick={() => setExcludeOutliers(!excludeOutliers)}
              className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl border transition-all duration-200 flex items-center gap-2 ${
                excludeOutliers
                  ? 'bg-amber-100 border-amber-300 text-amber-700 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
              }`}
              title={excludeOutliers ? "Haz clic para incluir valores atípicos" : "Haz clic para excluir valores atípicos"}
            >
              <i className={`fa-solid ${excludeOutliers ? 'fa-filter-circle-xmark text-amber-600' : 'fa-filter text-slate-400'}`}></i>
              {excludeOutliers ? 'Sin Atípicos' : 'Con Atípicos'}
              {totalCohortOutliers > 0 && (
                <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black ${
                  excludeOutliers 
                    ? 'bg-amber-600 text-white animate-pulse' 
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {totalCohortOutliers} Atípicos
                </span>
              )}
            </button>

            <div className="bg-slate-50 p-1 rounded-xl border border-slate-150/60 flex items-center gap-1 shadow-inner">
              <button
                onClick={() => setComparisonTarget('category')}
                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all duration-200 ${
                  comparisonTarget === 'category'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Su Categoría ({playerYear})
              </button>
              <button
                onClick={() => setComparisonTarget('2010plus')}
                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all duration-200 ${
                  comparisonTarget === '2010plus'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                2010 hacia arriba
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          <TachometerGauge 
            value={bestImtpFuerza} 
            average={avgImtpFuerza} 
            maxValue={maxScaleImtp > 0 ? maxScaleImtp : 5000} 
            title="IMTP Máximo" 
            unit="N" 
            color="stroke-red-600"
            fillColor="text-red-600"
            percentile={pctImtp}
            outlier={outlierImtp}
          />
          <TachometerGauge 
            value={bestImtpRelativo} 
            average={avgImtpRelativo} 
            maxValue={maxScaleImtpRelativo > 0 ? maxScaleImtpRelativo : 100} 
            title="IMTP Relativo" 
            unit="N/kg" 
            color="stroke-orange-500"
            fillColor="text-orange-500"
            percentile={pctImtpRelativo}
            outlier={outlierImtpRelativo}
          />
          <TachometerGauge 
            value={bestSpeedTime} 
            average={avgSpeedTime} 
            maxValue={maxScaleSpeedTime > 0 ? maxScaleSpeedTime : 6.0} 
            title="Test de Velocidad (Tiempo Total)" 
            unit="s" 
            color="stroke-blue-600"
            fillColor="text-blue-600"
            lowerIsBetter={true}
            percentile={pctSpeedTime}
            outlier={outlierSpeedTime}
          />
          <TachometerGauge 
            value={bestCmjRsi} 
            average={avgCmjRsi} 
            maxValue={maxScaleCmjRsi > 0 ? maxScaleCmjRsi : 2.0} 
            title="RSI_mod CMJ" 
            unit="" 
            color="stroke-emerald-600"
            fillColor="text-emerald-600"
            percentile={pctCmjRsi}
            outlier={outlierCmjRsi}
          />
          <TachometerGauge 
            value={bestVo2} 
            average={avgVo2} 
            maxValue={maxScaleVo2 > 0 ? maxScaleVo2 : 80} 
            title="Consumo de Oxígeno" 
            unit="ml/kg/min" 
            color="stroke-purple-600"
            fillColor="text-purple-600"
            percentile={pctVo2}
            outlier={outlierVo2}
          />
        </div>
      </div>

      {/* METRICAS ANTROPOMETRICAS BENTO - FULL WIDTH SINGLE ROW */}
      <div className="w-full mb-8">
        {/* METRICAS ANTROPOMETRICAS BENTO */}
        <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <i className="fa-solid fa-arrows-up-down-left-right text-red-600"></i>
                Métricas Antropométricas vs Promedio {comparisonTarget === 'category' ? `Categoría (${playerYear})` : 'Grupo Seleccionado (2010+)'}
              </h3>
              <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
                {/* Outliers Filter Toggle */}
                <button
                  onClick={() => setExcludeOutliers(!excludeOutliers)}
                  className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl border transition-all duration-200 flex items-center gap-2 ${
                    excludeOutliers
                      ? 'bg-amber-100 border-amber-300 text-amber-700 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
                  }`}
                  title={excludeOutliers ? "Haz clic para incluir valores atípicos" : "Haz clic para excluir valores atípicos"}
                >
                  <i className={`fa-solid ${excludeOutliers ? 'fa-filter-circle-xmark text-amber-600' : 'fa-filter text-slate-400'}`}></i>
                  {excludeOutliers ? 'Sin Atípicos' : 'Con Atípicos'}
                  {totalCohortOutliers > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black ${
                      excludeOutliers 
                        ? 'bg-amber-600 text-white animate-pulse' 
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {totalCohortOutliers} Atípicos
                    </span>
                  )}
                </button>

                <div className="bg-slate-50 p-1 rounded-xl border border-slate-150/60 flex items-center gap-1 shadow-inner">
                  <button
                    onClick={() => setComparisonTarget('category')}
                    className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all duration-200 ${
                      comparisonTarget === 'category'
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Su Categoría ({playerYear})
                  </button>
                  <button
                    onClick={() => setComparisonTarget('2010plus')}
                    className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all duration-200 ${
                      comparisonTarget === '2010plus'
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    2010 hacia arriba
                  </button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <TachometerGauge 
                value={valMasaMuscularPct} 
                average={avgMasaMuscularPct} 
                maxValue={maxScaleMasaMuscularPct} 
                title="% Masa Muscular" 
                unit="%" 
                color="stroke-emerald-600"
                fillColor="text-emerald-600"
                percentile={pctMasaMuscularPct}
                outlier={outlierMasaMuscularPct}
              />
              <TachometerGauge 
                value={valMasaMuscularKg} 
                average={avgMasaMuscularKg} 
                maxValue={maxScaleMasaMuscularKg} 
                title="Kg Masa Muscular" 
                unit="kg" 
                color="stroke-teal-600"
                fillColor="text-teal-600"
                percentile={pctMasaMuscularKg}
                outlier={outlierMasaMuscularKg}
              />
              <TachometerGauge 
                value={valMasaAdiposaPct} 
                average={avgMasaAdiposaPct} 
                maxValue={maxScaleMasaAdiposaPct} 
                title="% Masa Grasa" 
                unit="%" 
                color="stroke-red-500"
                fillColor="text-red-500"
                lowerIsBetter={true}
                percentile={pctMasaAdiposaPct}
                outlier={outlierMasaAdiposaPct}
              />
              <TachometerGauge 
                value={valMasaAdiposaKg} 
                average={avgMasaAdiposaKg} 
                maxValue={maxScaleMasaAdiposaKg} 
                title="Kg Masa Grasa" 
                unit="kg" 
                color="stroke-orange-500"
                fillColor="text-orange-500"
                lowerIsBetter={true}
                percentile={pctMasaAdiposaKg}
                outlier={outlierMasaAdiposaKg}
              />
              <TachometerGauge 
                value={valSumPliegues6} 
                average={avgSumPliegues6} 
                maxValue={maxScaleSumPliegues6} 
                title="6 Pliegues" 
                unit="mm" 
                color="stroke-blue-600"
                fillColor="text-blue-600"
                lowerIsBetter={true}
                percentile={pctSumPliegues6}
                outlier={outlierSumPliegues6}
              />
              <TachometerGauge 
                value={valIndiceImo} 
                average={avgIndiceImo} 
                maxValue={maxScaleIndiceImo} 
                title="Índice IMO" 
                unit="" 
                color="stroke-purple-600"
                fillColor="text-purple-600"
                percentile={pctIndiceImo}
                outlier={outlierIndiceImo}
              />
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-100 space-y-4">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Diagnóstico Morfológico</p>
              <p className="text-xs text-slate-600 leading-relaxed mt-1">
                El somatotipo del atleta revela un predominio muscular alto con baja grasa adiposa, adecuado para alta explosividad.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-50/80">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Parámetros de Maduración (PHV)</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100/60 flex items-center justify-between">
                  <div>
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase block leading-none">Años para PHV</span>
                    <span className="text-xs font-black text-slate-700 mt-1 block">
                      {latestAntro?.maduracion_media != null && !isNaN(Number(latestAntro.maduracion_media)) 
                        ? `${Number(latestAntro.maduracion_media).toFixed(2)} años` 
                        : '-'}
                    </span>
                  </div>
                  <i className="fa-solid fa-clock text-slate-400/80 text-xs"></i>
                </div>
                
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100/60 flex items-center justify-between">
                  <div>
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase block leading-none">Edad PHV (Pico)</span>
                    <span className="text-xs font-black text-slate-700 mt-1 block">
                      {latestAntro?.phv_media != null && !isNaN(Number(latestAntro.phv_media)) 
                        ? `${Number(latestAntro.phv_media).toFixed(1)} años` 
                        : '-'}
                    </span>
                  </div>
                  <i className="fa-solid fa-chart-line text-slate-400/80 text-xs"></i>
                </div>
                
                {(() => {
                  const mVal = latestAntro?.maduracion_media != null ? Number(latestAntro.maduracion_media) : null;
                  let maturationLabel = '-';
                  let maturationColor = 'text-slate-600 bg-slate-50/50 border-slate-100/60';
                  
                  if (mVal !== null && !isNaN(mVal)) {
                    if (mVal < -0.5) {
                      maturationLabel = 'PRE-PHV';
                      maturationColor = 'text-blue-600 bg-blue-50/60 border-blue-100/60';
                    } else if (mVal <= 0.5) {
                      maturationLabel = 'CIRCA-PHV';
                      maturationColor = 'text-amber-600 bg-amber-50/60 border-amber-100/60';
                    } else {
                      maturationLabel = 'POST-PHV';
                      maturationColor = 'text-emerald-700 bg-emerald-50/60 border-emerald-150/60';
                    }
                  }
                  
                  return (
                    <div className={`rounded-2xl p-3 border flex items-center justify-between ${maturationColor}`}>
                      <div>
                        <span className="text-[9.5px] font-bold opacity-80 uppercase block leading-none">Estado Madurativo</span>
                        <span className="text-xs font-black mt-1 block tracking-wider uppercase">
                          {maturationLabel}
                        </span>
                      </div>
                      <i className="fa-solid fa-seedling text-current text-xs"></i>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI INSIGHTS BENTO - REDESIGNED TO TAKE FULL WIDTH */}
      <div className="w-full space-y-8 mb-8">
        <div className="bg-[#0b1220] rounded-[40px] text-white shadow-2xl relative overflow-hidden flex flex-col min-h-[480px]">
          {/* Top Glowing Header bar */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-600 via-amber-500 to-red-600"></div>
          
          {/* Background Light Ambient Effects */}
          <div className="absolute top-10 right-10 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-10 left-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="p-8 sm:p-10 flex-1 flex flex-col z-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2 py-0.5 bg-red-600/20 text-red-500 rounded-md text-[8px] font-black uppercase tracking-widest animate-pulse flex items-center gap-1">
                    <i className="fa-solid fa-sparkles text-[7px]"></i> Motor Gemini Activo
                  </span>
                  <span className="text-white/40 text-[10px] font-bold font-mono">Último análisis: Hoy</span>
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tight italic flex items-center gap-3 text-white">
                  <i className="fa-solid fa-robot text-red-500 text-xl"></i>
                  Perfil de Inteligencia Deportiva
                </h3>
              </div>

              {/* Sub-Tabs Switches */}
              <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 self-start sm:self-auto">
                <button
                  onClick={() => setAiTab('perfil')}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5 ${
                    aiTab === 'perfil' 
                      ? 'bg-red-600 text-white shadow-md shadow-red-600/30' 
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <i className="fa-solid fa-id-card"></i>
                  Perfil
                </button>
                <button
                  onClick={() => setAiTab('mejoras')}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5 ${
                    aiTab === 'mejoras' 
                      ? 'bg-red-600 text-white shadow-md shadow-red-600/30' 
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <i className="fa-solid fa-list-check"></i>
                  Tareas
                  {Object.values(goalStatuses).filter(v => v === 'done').length > 0 && (
                    <span className="ml-1 w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping"></span>
                  )}
                </button>
                <button
                  onClick={() => setAiTab('chat')}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5 ${
                    aiTab === 'chat' 
                      ? 'bg-red-600 text-white shadow-md shadow-red-600/30' 
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <i className="fa-solid fa-comment-dots"></i>
                  Consultar IA
                </button>
              </div>
            </div>

            {loadingAi ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-red-600/20 border-t-red-600 rounded-full animate-spin"></div>
                  <i className="fa-solid fa-brain text-red-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-lg animate-pulse"></i>
                </div>
                <div className="text-center">
                  <p className="text-[12px] font-black uppercase tracking-widest text-white/80">Sincronizando Huella Antropométrica...</p>
                  <p className="text-[10px] text-white/40 mt-1">Generando síntesis diagnóstica en tiempo real</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-between">
                <AnimatePresence mode="wait">
                  {aiTab === 'perfil' && (
                    <motion.div
                      key="perfil"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      className="space-y-6 flex-1 flex flex-col justify-between"
                    >
                      {/* Quick Player Summary Box (SANS CAT, MADUREZ, ESTADO BOXES AS REQUESTED) */}
                      <div className="bg-white/5 rounded-3xl p-5 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center text-white text-lg font-black italic shadow-lg animate-fade-in">
                            {player?.nombre?.charAt(0) || 'A'}{player?.apellido1?.charAt(0) || 'P'}
                          </div>
                          <div>
                            <p className="text-sm font-black text-white italic">{player?.nombre} {player?.apellido1} {player?.apellido2}</p>
                            <p className="text-[10px] font-black uppercase text-red-500 tracking-wider flex items-center gap-1.5 mt-0.5">
                              <i className="fa-solid fa-futbol text-[9px]"></i> {player?.posicion}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Joined Executive Summary Text Row - Occupying full horizontal width */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-black text-red-500 uppercase tracking-widest flex items-center gap-2">
                          <i className="fa-solid fa-compass-drafting"></i> Análisis de Capacidades Físicas y Conclusiones
                        </h4>
                        <div className="text-white/80 text-xs sm:text-sm bg-white/[0.02] border border-white/5 p-6 rounded-3xl space-y-4">
                          <div className="whitespace-pre-line leading-relaxed text-white/90">
                            {parseAthleteAiSummary(aiSummary)?.capacities}
                          </div>
                          <div className="pt-4 border-t border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1">
                              <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                <i className="fa-solid fa-circle-check text-red-500 text-[8px]"></i> Conclusión Técnico-Científica
                              </p>
                              <p className="text-xs text-white/90 italic font-semibold leading-relaxed">
                                "{parseAthleteAiSummary(aiSummary)?.conclusion || 'El jugador presenta un biotipo físico y motor aeróbico sobresalientes para su categoría.'}"
                              </p>
                            </div>
                            <div className="shrink-0 flex items-center gap-2.5 pt-2 md:pt-0 md:pl-4 border-t md:border-t-0 md:border-l border-white/10">
                              <div className="w-8 h-8 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center text-xs">
                                <i className="fa-solid fa-signature"></i>
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-white uppercase tracking-wider">Dirección de Ciencias</p>
                                <p className="text-[8px] text-white/40 font-bold uppercase">La Roja Performance Hub</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {aiTab === 'mejoras' && (
                    <motion.div
                      key="mejoras"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      className="space-y-6 flex-1 flex flex-col"
                    >
                      {/* Interactive Checklist Board description */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/5 p-5 rounded-3xl border border-white/5">
                        <div>
                          <p className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-1">
                            <i className="fa-solid fa-bullseye"></i> Objetivos Tácticos Individuales
                          </p>
                          <p className="text-[10px] text-white/60 mt-1">Haz clic sobre cada objetivo para actualizar el avance en este microciclo</p>
                        </div>
                        
                        {/* Realtime progress bar */}
                        <div className="w-full md:w-48">
                          <div className="flex justify-between text-[9px] font-black uppercase text-white/50 mb-1">
                            <span>Progreso Microciclo</span>
                            <span className="text-amber-400 font-mono">
                              {Math.round(
                                ((Object.values(goalStatuses).filter(v => v === 'done').length * 1.0 + 
                                  Object.values(goalStatuses).filter(v => v === 'progress').length * 0.5) / 
                                 Math.max(1, parseAthleteAiSummary(aiSummary)?.improvements.length || 1)) * 100
                              )}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-red-600 to-amber-500 transition-all duration-500 ease-out"
                              style={{
                                width: `${
                                  ((Object.values(goalStatuses).filter(v => v === 'done').length * 1.0 + 
                                    Object.values(goalStatuses).filter(v => v === 'progress').length * 0.5) / 
                                   Math.max(1, parseAthleteAiSummary(aiSummary)?.improvements.length || 1)) * 100
                                }%`
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      {/* Checklist layout */}
                      <div className="grid grid-cols-1 gap-3">
                        {parseAthleteAiSummary(aiSummary)?.improvements.map((imp, idx) => {
                          const status = goalStatuses[idx] || 'todo';
                          return (
                            <div
                              key={idx}
                              onClick={() => {
                                const nextStatus: 'todo' | 'progress' | 'done' = 
                                  status === 'todo' ? 'progress' : status === 'progress' ? 'done' : 'todo';
                                setGoalStatuses(prev => ({ ...prev, [idx]: nextStatus }));
                              }}
                              className={`p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between cursor-pointer group ${
                                status === 'done' 
                                  ? 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20' 
                                  : status === 'progress'
                                  ? 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 shadow-inner'
                                  : 'bg-white/5 border-white/5 hover:bg-white/10'
                              }`}
                            >
                              <div className="flex items-center gap-4 flex-1">
                                {/* Status indicator button */}
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                                  status === 'done' 
                                    ? 'bg-emerald-500/20 text-emerald-500' 
                                    : status === 'progress'
                                    ? 'bg-amber-400/20 text-amber-400 animate-pulse'
                                    : 'bg-white/10 text-white/50 group-hover:bg-white/20'
                                }`}>
                                  {status === 'done' && <i className="fa-solid fa-circle-check text-sm"></i>}
                                  {status === 'progress' && <i className="fa-solid fa-rotate text-xs animate-spin"></i>}
                                  {status === 'todo' && <i className="fa-solid fa-circle-notch text-xs"></i>}
                                </div>
                                <div className="flex-1">
                                  <p className={`text-xs font-semibold select-none leading-relaxed ${status === 'done' ? 'text-white/60 line-through' : 'text-white'}`}>
                                    {imp}
                                  </p>
                                </div>
                              </div>

                              {/* Status badge */}
                              <div className="ml-4">
                                <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-1 rounded-md ${
                                  status === 'done'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/10'
                                    : status === 'progress'
                                    ? 'bg-amber-400/20 text-amber-400 border border-amber-400/10'
                                    : 'bg-white/10 text-white/40'
                                }`}>
                                  {status === 'done' ? 'Superado' : status === 'progress' ? 'En Curso' : 'Pendiente'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {aiTab === 'chat' && (
                    <motion.div
                      key="chat"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      className="space-y-4 flex-1 flex flex-col h-[320px]"
                    >
                      {/* Conversation Board History */}
                      <div className="flex-1 bg-white/[0.02] rounded-3xl p-4 border border-white/5 overflow-y-auto space-y-3 max-h-[220px] scrollbar-thin scrollbar-thumb-white/10">
                        {chatHistory.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                            <i className="fa-solid fa-comments text-white/10 text-3xl mb-2 animate-bounce"></i>
                            <p className="text-[10px] uppercase font-black tracking-widest text-white/30">Consultas de Ciencias del Deporte</p>
                            <p className="text-xs text-white/55 mt-1 max-w-sm leading-relaxed">Pregúntale al Asistente IA sobre cargas semanales, adaptaciones de sprint, o directrices nutricionales personalizadas.</p>
                          </div>
                        ) : (
                          chatHistory.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                                msg.role === 'user' 
                                  ? 'bg-red-600 text-white rounded-tr-none' 
                                  : 'bg-white/10 text-white/90 rounded-tl-none border border-white/5 prose prose-invert prose-xs'
                              }`}>
                                {msg.role === 'user' ? (
                                  msg.text
                                ) : (
                                  <Markdown>{msg.text}</Markdown>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                        {chatSending && (
                          <div className="flex justify-start">
                            <div className="bg-white/5 text-white/55 rounded-2xl p-3 text-xs flex items-center gap-2">
                              <div className="w-2.5 h-2.5 border border-white/30 border-t-white rounded-full animate-spin"></div>
                              <span>Redactando recomendación fisiológica...</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Interactive quick pills */}
                      {chatHistory.length === 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[8px] font-black uppercase text-white/40 tracking-wider">Preguntas Rápidas Sugeridas</p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              disabled={chatSending}
                              onClick={() => handleConsultAssistant(`¿Qué recomendaciones preventivas específicas harías con respecto a su desempeño como ${player?.posicion}?`)}
                              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] text-white/80 font-semibold border border-white/5 transition text-left cursor-pointer"
                            >
                              ⚡ Prevenir lesiones en su posición
                            </button>
                            <button
                              disabled={chatSending}
                              onClick={() => handleConsultAssistant(`¿Cómo dosificar el volumen e intensidad de velocidad 10m y fuerza vertical para este microciclo de ${player?.nombre}?`)}
                              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] text-white/80 font-semibold border border-white/5 transition text-left cursor-pointer"
                            >
                              🎯 Dosificación fuerza/velocidad
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Input Row */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={chatQuery}
                          onChange={(e) => setChatQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleConsultAssistant();
                          }}
                          placeholder="Sugiéreme entrenamiento intermitente para asimetrías..."
                          className="flex-1 bg-white/5 focus:bg-white/10 border border-white/10 focus:border-red-600 rounded-xl px-4 py-2 text-xs text-white placeholder-white/30 focus:outline-none transition"
                          disabled={chatSending}
                        />
                        <button
                          onClick={() => handleConsultAssistant()}
                          disabled={chatSending || !chatQuery.trim()}
                          className="w-10 h-10 bg-red-600 hover:bg-red-500 disabled:bg-white/10 text-white rounded-xl flex items-center justify-center transition cursor-pointer"
                        >
                          <i className="fa-solid fa-arrow-up text-xs"></i>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Refresh bottom-action triggers */}
                <div className="mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest flex items-center gap-1.5">
                    <i className="fa-solid fa-code-branch text-red-500"></i> Integrado con la base de datos de entrenamiento La Roja
                  </p>
                  <button
                    onClick={generateAiSummary}
                    disabled={loadingAi}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/20 text-white/80 text-xs font-black uppercase tracking-wider transition-all border border-white/10 flex items-center justify-center gap-1.5 self-end sm:self-auto cursor-pointer"
                  >
                    <i className="fa-solid fa-arrows-rotate text-[10px]"></i>
                    Forzar Re-Análisis
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const IndividualDashboard = ({ 
  player, imtp, speed, antropometria, vo2max, clubs
}: { 
  player?: PlayerData, 
  imtp: IMTPData[], 
  speed: SpeedTestData[], 
  antropometria: AntropometriaData[],
  vo2max: VO2MaxData[],
  clubs: any[]
}) => {
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    'imtp_fuerza_n',
    'imtp_f_relativa_n_kg',
    'dsi_valor',
    'fuerza_cmj'
  ]);

  const [selectedSpeedMetrics, setSelectedSpeedMetrics] = useState<string[]>([
    'tiempo_total',
    'vel_10m',
    'tiempo_10m',
    'tiempo_20_30m'
  ]);

  const [selectedVO2Metrics, setSelectedVO2Metrics] = useState<string[]>([
    'vo2_max',
    'vam',
    'fc_max',
    'mts'
  ]);

  const [selectedAntroMetrics, setSelectedAntroMetrics] = useState<string[]>([
    'masa_adiposa_pct',
    'masa_muscular_pct',
    'sum_pliegues_6_mm',
    'masa_corporal_kg'
  ]);

  const imtpMetrics = METRICS_OPTIONS.filter(m => m.table === 'imtp');
  const speedMetrics = METRICS_OPTIONS.filter(m => m.table === 'speed');
  const vo2Metrics = METRICS_OPTIONS.filter(m => m.table === 'vo2max');
  const antroMetrics = METRICS_OPTIONS.filter(m => m.table === 'antropometria');

  if (!player) return (
    <div className="bg-white rounded-[40px] p-20 text-center border border-dashed border-slate-200">
      <i className="fa-solid fa-user-magnifying-glass text-4xl text-slate-200 mb-4"></i>
      <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Selecciona un atleta para visualizar su huella digital</p>
    </div>
  );

  const getMetricData = (metricKey: string) => {
    const config = METRICS_OPTIONS.find(m => m.key === metricKey);
    if (!config) return [];

    let sourceData: any[] = [];
    let dateKey = 'fecha';

    switch (config.table) {
      case 'imtp': sourceData = imtp; dateKey = 'fecha_test'; break;
      case 'speed': sourceData = speed; dateKey = 'fecha'; break;
      case 'vo2max': sourceData = vo2max; dateKey = 'fecha'; break;
      case 'antropometria': sourceData = antropometria; dateKey = 'fecha_medicion'; break;
    }

    return sourceData
      .filter(d => d[metricKey] !== undefined && d[metricKey] !== null && !isNaN(Number(d[metricKey])))
      .map(d => ({
        date: new Date(d[dateKey]).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
        value: d[metricKey],
        fullDate: new Date(d[dateKey]).getTime()
      }))
      .sort((a, b) => a.fullDate - b.fullDate);
  };

  const updateMetric = (index: number, newKey: string) => {
    const newMetrics = [...selectedMetrics];
    newMetrics[index] = newKey;
    setSelectedMetrics(newMetrics);
  };

  const updateSpeedMetric = (index: number, newKey: string) => {
    const newMetrics = [...selectedSpeedMetrics];
    newMetrics[index] = newKey;
    setSelectedSpeedMetrics(newMetrics);
  };

  const updateVO2Metric = (index: number, newKey: string) => {
    const newMetrics = [...selectedVO2Metrics];
    newMetrics[index] = newKey;
    setSelectedVO2Metrics(newMetrics);
  };

  const updateAntroMetric = (index: number, newKey: string) => {
    const newMetrics = [...selectedAntroMetrics];
    newMetrics[index] = newKey;
    setSelectedAntroMetrics(newMetrics);
  };

  return (
    <div className="space-y-8">
      {/* HEADER PERFIL ATLETA */}
      <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 flex flex-wrap items-center justify-between gap-8">
        <div className="flex items-center">
          <div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">{player.nombre} {player.apellido1} {player.apellido2}</h2>
            <div className="flex flex-wrap gap-4 mt-2">
              <span className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <i className="fa-solid fa-shield-halved text-red-500"></i>
                {player.posicion}
              </span>
              <span className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <i className="fa-solid fa-calendar text-blue-500"></i>
                Año: {player.fecha_nacimiento ? new Date(player.fecha_nacimiento).getFullYear() : ((player as any).anio ? Number((player as any).anio) : '-')}
              </span>
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <i className="fa-solid fa-building text-emerald-500"></i>
                <div className="flex items-center gap-1">
                  <span className="text-slate-500">Club:</span>
                  <ClubBadge clubName={player.club || player.club_name} idClub={player.id_club} clubs={clubs} logoSize="w-3 h-3" className="text-slate-900 font-bold" />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex gap-4">
          <div className="text-right">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Estado Físico</p>
            <span className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black uppercase">Disponible</span>
          </div>
        </div>
      </div>

      {/* BLOQUES DINÁMICOS IMTP */}
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">Fuerza y Potencia</h3>
          <div className="h-px flex-1 bg-slate-100"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {selectedMetrics.map((metricKey, idx) => {
            const data = getMetricData(metricKey);
            const metricLabel = METRICS_OPTIONS.find(m => m.key === metricKey)?.label;

            return (
              <div key={idx} className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                    <span className={`w-2 h-6 rounded-full ${idx % 2 === 0 ? 'bg-red-500' : 'bg-blue-500'}`}></span>
                    {metricLabel}
                  </h3>
                  <select 
                    value={metricKey}
                    onChange={(e) => updateMetric(idx, e.target.value)}
                    className="bg-slate-50 border-none rounded-xl px-3 py-1.5 text-[10px] font-black text-slate-500 outline-none focus:ring-2 focus:ring-red-500 uppercase tracking-widest"
                  >
                    {imtpMetrics.map(opt => (
                      <option key={opt.key} value={opt.key}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="h-64">
                  {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={9} fontWeight={900} axisLine={false} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={9} fontWeight={900} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '16px', border: 'none', fontWeight: '900', fontSize: '10px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          itemStyle={{ color: idx % 2 === 0 ? '#ef4444' : '#3b82f6' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke={idx % 2 === 0 ? '#ef4444' : '#3b82f6'} 
                          strokeWidth={4} 
                          dot={{ r: 4, fill: idx % 2 === 0 ? '#ef4444' : '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                          activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                      <i className="fa-solid fa-chart-line text-3xl opacity-20"></i>
                      <p className="text-[10px] font-black uppercase tracking-widest">Sin datos registrados</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* BLOQUES DINÁMICOS VELOCIDAD */}
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">Velocidad</h3>
          <div className="h-px flex-1 bg-slate-100"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {selectedSpeedMetrics.map((metricKey, idx) => {
            const data = getMetricData(metricKey);
            const metricLabel = METRICS_OPTIONS.find(m => m.key === metricKey)?.label;

            return (
              <div key={idx} className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                    <span className={`w-2 h-6 rounded-full ${idx % 2 === 0 ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                    {metricLabel}
                  </h3>
                  <select 
                    value={metricKey}
                    onChange={(e) => updateSpeedMetric(idx, e.target.value)}
                    className="bg-slate-50 border-none rounded-xl px-3 py-1.5 text-[10px] font-black text-slate-500 outline-none focus:ring-2 focus:ring-red-500 uppercase tracking-widest"
                  >
                    {speedMetrics.map(opt => (
                      <option key={opt.key} value={opt.key}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="h-64">
                  {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={9} fontWeight={900} axisLine={false} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={9} fontWeight={900} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '16px', border: 'none', fontWeight: '900', fontSize: '10px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          itemStyle={{ color: idx % 2 === 0 ? '#f59e0b' : '#10b981' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke={idx % 2 === 0 ? '#f59e0b' : '#10b981'} 
                          strokeWidth={4} 
                          dot={{ r: 4, fill: idx % 2 === 0 ? '#f59e0b' : '#10b981', strokeWidth: 2, stroke: '#fff' }}
                          activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                      <i className="fa-solid fa-bolt text-3xl opacity-20"></i>
                      <p className="text-[10px] font-black uppercase tracking-widest">Sin datos registrados</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* BLOQUES DINÁMICOS VO2 MAX */}
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">Consumo de Oxígeno</h3>
          <div className="h-px flex-1 bg-slate-100"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {selectedVO2Metrics.map((metricKey, idx) => {
            const data = getMetricData(metricKey);
            const metricLabel = METRICS_OPTIONS.find(m => m.key === metricKey)?.label;

            return (
              <div key={idx} className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                    <span className={`w-2 h-6 rounded-full ${idx % 2 === 0 ? 'bg-indigo-500' : 'bg-violet-500'}`}></span>
                    {metricLabel}
                  </h3>
                  <select 
                    value={metricKey}
                    onChange={(e) => updateVO2Metric(idx, e.target.value)}
                    className="bg-slate-50 border-none rounded-xl px-3 py-1.5 text-[10px] font-black text-slate-500 outline-none focus:ring-2 focus:ring-red-500 uppercase tracking-widest"
                  >
                    {vo2Metrics.map(opt => (
                      <option key={opt.key} value={opt.key}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="h-64">
                  {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={9} fontWeight={900} axisLine={false} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={9} fontWeight={900} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '16px', border: 'none', fontWeight: '900', fontSize: '10px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          itemStyle={{ color: idx % 2 === 0 ? '#6366f1' : '#8b5cf6' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke={idx % 2 === 0 ? '#6366f1' : '#8b5cf6'} 
                          strokeWidth={4} 
                          dot={{ r: 4, fill: idx % 2 === 0 ? '#6366f1' : '#8b5cf6', strokeWidth: 2, stroke: '#fff' }}
                          activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                      <i className="fa-solid fa-lungs text-3xl opacity-20"></i>
                      <p className="text-[10px] font-black uppercase tracking-widest">Sin datos registrados</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* BLOQUES DINÁMICOS ANTROPOMETRÍA */}
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">Antropometría & Composición</h3>
          <div className="h-px flex-1 bg-slate-100"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {selectedAntroMetrics.map((metricKey, idx) => {
            const data = getMetricData(metricKey);
            const metricLabel = METRICS_OPTIONS.find(m => m.key === metricKey)?.label;

            return (
              <div key={idx} className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                    <span className={`w-2 h-6 rounded-full ${idx % 2 === 0 ? 'bg-emerald-500' : 'bg-blue-500'}`}></span>
                    {metricLabel}
                  </h3>
                  <select 
                    value={metricKey}
                    onChange={(e) => updateAntroMetric(idx, e.target.value)}
                    className="bg-slate-50 border-none rounded-xl px-3 py-1.5 text-[10px] font-black text-slate-500 outline-none focus:ring-2 focus:ring-red-500 uppercase tracking-widest"
                  >
                    {antroMetrics.map(opt => (
                      <option key={opt.key} value={opt.key}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="h-64">
                  {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={9} fontWeight={900} axisLine={false} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={9} fontWeight={900} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '16px', border: 'none', fontWeight: '900', fontSize: '10px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          itemStyle={{ color: idx % 2 === 0 ? '#10b981' : '#3b82f6' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke={idx % 2 === 0 ? '#10b981' : '#3b82f6'} 
                          strokeWidth={4} 
                          dot={{ r: 4, fill: idx % 2 === 0 ? '#10b981' : '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                          activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                      <i className="fa-solid fa-ruler-combined text-3xl opacity-20"></i>
                      <p className="text-[10px] font-black uppercase tracking-widest">Sin datos registrados</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const POSITION_COLORS: { [key: string]: string } = {
  'Portero': '#6366f1',
  'Defensa Central': '#8b5cf6',
  'Defensa Lateral': '#ec4899',
  'Volante': '#f43f5e',
  'Delantero Extremo': '#f59e0b',
  'Centro Delantero': '#10b981',
  'Media Punta': '#06b6d4',
  'Sin definir': '#94a3b8',
};

const POSITION_ABBR: { [key: string]: string } = {
  'Portero': 'POR',
  'Defensa Central': 'DEF C',
  'Defensa Lateral': 'DEF L',
  'Volante': 'VOL',
  'Delantero Extremo': 'EXT',
  'Centro Delantero': 'CEN',
  'Media Punta': 'M P',
  'Sin definir': 'S/D',
};

const getPerformanceColor = (value: number, type: 'fuerza_peak' | 'fuerza_relativa' | 'altura_salto' | 'rsi_mod') => {
  if (value === undefined || value === null || value === 0 || isNaN(value)) return { bg: 'bg-slate-100', text: 'text-slate-400', label: '-' };

  const config = {
    fuerza_peak: [
      { min: 3496, bg: 'bg-emerald-800', text: 'text-white', label: 'EXC' },
      { min: 3178, bg: 'bg-emerald-600', text: 'text-white', label: 'M.B' },
      { min: 2859, bg: 'bg-emerald-500', text: 'text-white', label: 'BUE' },
      { min: 2670, bg: 'bg-lime-500', text: 'text-white', label: 'S.M' },
      { min: 2380, bg: 'bg-slate-100', text: 'text-slate-600', label: 'MED' },
      { min: 2220, bg: 'bg-yellow-400', text: 'text-black', label: 'B.M' },
      { min: 1901, bg: 'bg-orange-500', text: 'text-white', label: 'DEF' },
      { min: 1582, bg: 'bg-red-500', text: 'text-white', label: 'M.D' },
      { min: 0, bg: 'bg-red-800', text: 'text-white', label: 'E.D' },
    ],
    fuerza_relativa: [
      { min: 45, bg: 'bg-emerald-800', text: 'text-white', label: 'EXC' },
      { min: 41, bg: 'bg-emerald-600', text: 'text-white', label: 'M.B' },
      { min: 37, bg: 'bg-emerald-500', text: 'text-white', label: 'BUE' },
      { min: 35, bg: 'bg-lime-500', text: 'text-white', label: 'S.M' },
      { min: 31, bg: 'bg-slate-100', text: 'text-slate-600', label: 'MED' },
      { min: 29, bg: 'bg-yellow-400', text: 'text-black', label: 'B.M' },
      { min: 25, bg: 'bg-orange-500', text: 'text-white', label: 'DEF' },
      { min: 21, bg: 'bg-red-500', text: 'text-white', label: 'M.D' },
      { min: 0, bg: 'bg-red-800', text: 'text-white', label: 'E.D' },
    ],
    altura_salto: [
      { min: 52, bg: 'bg-emerald-800', text: 'text-white', label: 'EXC' },
      { min: 48, bg: 'bg-emerald-600', text: 'text-white', label: 'M.B' },
      { min: 44, bg: 'bg-emerald-500', text: 'text-white', label: 'BUE' },
      { min: 42, bg: 'bg-lime-500', text: 'text-white', label: 'S.M' },
      { min: 38, bg: 'bg-slate-100', text: 'text-slate-600', label: 'MED' },
      { min: 36, bg: 'bg-yellow-400', text: 'text-black', label: 'B.M' },
      { min: 32, bg: 'bg-orange-500', text: 'text-white', label: 'DEF' },
      { min: 28, bg: 'bg-red-500', text: 'text-white', label: 'M.D' },
      { min: 0, bg: 'bg-red-800', text: 'text-white', label: 'E.D' },
    ],
    rsi_mod: [
      { min: 0.78, bg: 'bg-emerald-800', text: 'text-white', label: 'EXC' },
      { min: 0.69, bg: 'bg-emerald-600', text: 'text-white', label: 'M.B' },
      { min: 0.60, bg: 'bg-emerald-500', text: 'text-white', label: 'BUE' },
      { min: 0.46, bg: 'bg-lime-500', text: 'text-white', label: 'S.M' },
      { min: 0.47, bg: 'bg-slate-100', text: 'text-slate-600', label: 'MED' }, // Note: 0.47-0.56 in image for Media
      { min: 0.42, bg: 'bg-yellow-400', text: 'text-black', label: 'B.M' },
      { min: 0.33, bg: 'bg-orange-500', text: 'text-white', label: 'DEF' },
      { min: 0.24, bg: 'bg-red-500', text: 'text-white', label: 'M.D' },
      { min: 0, bg: 'bg-red-800', text: 'text-white', label: 'E.D' },
    ],
  };

  const thresholds = config[type];
  const match = thresholds.find(t => value >= t.min);
  return match || thresholds[thresholds.length - 1];
};

const ORDERED_POSITIONS = [
  'Portero',
  'Defensa Central',
  'Defensa Lateral',
  'Volante',
  'Delantero Extremo',
  'Centro Delantero',
  'Media Punta'
];

const SquadAnalytics = ({ anios, posiciones, players, gps, speed, imtp, vo2max, antropometria }: { anios: number[], posiciones: string[], players: PlayerData[], gps: GPSData[], speed: SpeedTestData[], imtp: IMTPData[], vo2max: VO2MaxData[], antropometria: AntropometriaData[] }) => {
  const [selectedImtpMetrics, setSelectedImtpMetrics] = useState<string[]>(['imtp_fuerza_n', 'imtp_f_relativa_n_kg', 'dsi_valor', 'fuerza_cmj']);
  const [selectedSpeedMetrics, setSelectedSpeedMetrics] = useState<string[]>(['tiempo_total', 'vel_10m', 'tiempo_10m', 'tiempo_20_30m']);
  const [selectedVo2Metrics, setSelectedVo2Metrics] = useState<string[]>(['vo2_max', 'vam', 'fc_max', 'mts']);
  const [selectedAntroMetrics, setSelectedAntroMetrics] = useState<string[]>(['masa_adiposa_pct', 'masa_muscular_pct', 'sum_pliegues_6_mm', 'masa_corporal_kg']);
  const [selectedSquadPosiciones, setSelectedSquadPosiciones] = useState<string[]>([]);
  
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [loadingSummaries, setLoadingSummaries] = useState<Record<string, boolean>>({});

  const handleGenerateSummary = async (metricKey: string, table: string, label: string) => {
    if (loadingSummaries[metricKey]) return;
    setLoadingSummaries(prev => ({ ...prev, [metricKey]: true }));
    try {
      const data = getBoxPlotData(metricKey, table);
      const summary = await getChartSummary(label, data);
      setSummaries(prev => ({ ...prev, [metricKey]: summary }));
    } catch (error) {
      console.error("Error generating summary:", error);
    } finally {
      setLoadingSummaries(prev => ({ ...prev, [metricKey]: false }));
    }
  };

  const filteredPlayers = useMemo(() => 
    players.filter(p => {
      const pYear = (p as any).anio ? Number((p as any).anio) : new Date(p.fecha_nacimiento).getFullYear();
      const yearMatch = anios.length === 0 || anios.includes(pYear);
      const posMatch = posiciones.length === 0 || posiciones.includes(p.posicion);
      return yearMatch && posMatch;
    }),
  [players, anios, posiciones]);

  const getBoxPlotData = (metricKey: string, table: string) => {
    let sourceData: any[] = [];
    switch (table) {
      case 'imtp': sourceData = imtp; break;
      case 'speed': sourceData = speed; break;
      case 'vo2max': sourceData = vo2max; break;
      case 'antropometria': sourceData = antropometria; break;
    }

    const playerIds = filteredPlayers.map(p => p.player_id);
    const relevantData = sourceData.filter(d => playerIds.includes(d.player_id));

    const calculateStats = (values: number[]) => {
      if (values.length === 0) return null;
      const sorted = [...values].sort((a, b) => a - b);
      const q1 = sorted[Math.floor(sorted.length * 0.25)];
      const median = sorted[Math.floor(sorted.length * 0.5)];
      const q3 = sorted[Math.floor(sorted.length * 0.75)];
      const iqr = q3 - q1;
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;
      
      const outliers = values.filter(v => v < lowerBound || v > upperBound);
      const nonOutliers = values.filter(v => v >= lowerBound && v <= upperBound);
      
      const min = nonOutliers.length > 0 ? Math.min(...nonOutliers) : q1;
      const max = nonOutliers.length > 0 ? Math.max(...nonOutliers) : q3;
      
      return { min, q1, median, q3, max, outliers };
    };

    const statsByPosition = ORDERED_POSITIONS.map(pos => {
      const posPlayerIds = filteredPlayers.filter(p => p.posicion === pos).map(p => p.player_id);
      const posValues = relevantData
        .filter(d => posPlayerIds.includes(d.player_id))
        .map(d => d[metricKey])
        .filter(v => v != null && v > 0);
      return { name: pos, stats: calculateStats(posValues) };
    }).filter(p => p.stats !== null);

    return statsByPosition.map(p => ({
      name: p.name,
      min: p.stats!.min,
      q1: p.stats!.q1,
      median: p.stats!.median,
      q3: p.stats!.q3,
      max: p.stats!.max,
      outliers: p.stats!.outliers,
      range: [p.stats!.q1, p.stats!.q3],
      lowWhisker: [p.stats!.min, p.stats!.q1],
      highWhisker: [p.stats!.q3, p.stats!.max]
    }));
  };

  const BoxPlotChart = ({ data, color }: { data: any[], color: string }) => {
    const outlierData = data.flatMap(d => d.outliers.map((val: number) => ({ name: d.name, val })));

    return (
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart 
          layout="vertical"
          data={data} 
          margin={{ top: 10, right: 40, left: 20, bottom: 20 }}
          barCategoryGap="25%"
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
          <XAxis 
            type="number"
            stroke="#94a3b8" 
            fontSize={10} 
            fontWeight={900} 
            axisLine={false} 
            tickLine={false}
            domain={['auto', 'auto']}
            tickFormatter={(val) => val.toLocaleString()}
          />
          <YAxis 
            dataKey="name" 
            type="category"
            stroke="#94a3b8" 
            fontSize={9} 
            fontWeight={900} 
            axisLine={false} 
            tickLine={false}
            width={80}
            tickFormatter={(value) => POSITION_ABBR[value] || value}
            allowDuplicatedCategory={false}
          />
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload;
                // Si es un punto de outlier, buscamos el objeto de la posición
                const posData = data.find(p => p.name === d.name) || d;
                return (
                  <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-100 text-[10px] font-black uppercase tracking-widest space-y-1">
                    <p className="text-slate-900 border-b border-slate-50 pb-1 mb-1">{posData.name}</p>
                    <p className="text-slate-400">Max (Whisker): <span className="text-slate-900">{(posData.max != null && !isNaN(Number(posData.max))) ? Number(posData.max).toFixed(2) : '-'}</span></p>
                    <p className="text-slate-400">Q3: <span className="text-slate-900">{(posData.q3 != null && !isNaN(Number(posData.q3))) ? Number(posData.q3).toFixed(2) : '-'}</span></p>
                    <p className="text-red-600 font-bold">Mediana: <span>{(posData.median != null && !isNaN(Number(posData.median))) ? Number(posData.median).toFixed(2) : '-'}</span></p>
                    <p className="text-slate-400">Q1: <span className="text-slate-900">{(posData.q1 != null && !isNaN(Number(posData.q1))) ? Number(posData.q1).toFixed(2) : '-'}</span></p>
                    <p className="text-slate-400">Min (Whisker): <span className="text-slate-900">{(posData.min != null && !isNaN(Number(posData.min))) ? Number(posData.min).toFixed(2) : '-'}</span></p>
                    {posData.outliers.length > 0 && (
                      <p className="text-red-500 pt-1 border-t border-slate-50 mt-1">Outliers: {posData.outliers.length}</p>
                    )}
                  </div>
                );
              }
              return null;
            }}
          />
          
          {/* Whiskers Low */}
          <Scatter data={data} dataKey="min" shape={(props: any) => {
            const { cx, cy, payload, xAxis } = props;
            if (!payload || payload.min === undefined || !xAxis || !xAxis.scale) return null;
            const q1X = xAxis.scale(payload.q1);
            return (
              <g>
                <line x1={cx} y1={cy} x2={q1X} y2={cy} stroke="#94a3b8" strokeWidth={1.5} />
                <line x1={cx} y1={cy - 6} x2={cx} y2={cy + 6} stroke="#94a3b8" strokeWidth={1.5} />
              </g>
            );
          }} />

          {/* Whiskers High */}
          <Scatter data={data} dataKey="max" shape={(props: any) => {
            const { cx, cy, payload, xAxis } = props;
            if (!payload || payload.max === undefined || !xAxis || !xAxis.scale) return null;
            const q3X = xAxis.scale(payload.q3);
            return (
              <g>
                <line x1={cx} y1={cy} x2={q3X} y2={cy} stroke="#94a3b8" strokeWidth={1.5} />
                <line x1={cx} y1={cy - 6} x2={cx} y2={cy + 6} stroke="#94a3b8" strokeWidth={1.5} />
              </g>
            );
          }} />
          
          {/* Box (IQR) */}
          <Bar dataKey="range" barSize={20}>
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={POSITION_COLORS[entry.name] || color} 
                fillOpacity={0.6} 
                stroke={POSITION_COLORS[entry.name] || color}
                strokeWidth={1}
              />
            ))}
          </Bar>

          {/* Median Line */}
          <Scatter data={data} dataKey="median" shape={(props: any) => {
            const { cx, cy } = props;
            return (
              <line x1={cx} y1={cy - 10} x2={cx} y2={cy + 10} stroke="#fff" strokeWidth={2.5} />
            );
          }} />

          {/* Outliers */}
          <Scatter data={outlierData} dataKey="val" fill="#94a3b8" shape="circle" />
          
        </ComposedChart>
      </ResponsiveContainer>
    );
  };


  const imtpOptions = METRICS_OPTIONS.filter(m => m.table === 'imtp');
  const speedOptions = METRICS_OPTIONS.filter(m => m.table === 'speed');
  const vo2Options = METRICS_OPTIONS.filter(m => m.table === 'vo2max');
  const antroOptions = METRICS_OPTIONS.filter(m => m.table === 'antropometria');

  return (
    <div className="space-y-12">
      {/* SECCIÓN IMTP BOX PLOTS */}
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">Distribución Fuerza y Potencia por Posición</h3>
          <div className="h-px flex-1 bg-slate-100"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {selectedImtpMetrics.map((metricKey, idx) => {
            const label = METRICS_OPTIONS.find(m => m.key === metricKey)?.label || '';
            return (
              <div key={idx} className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 relative group">
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {label}
                    </h4>
                    <button 
                      onClick={() => handleGenerateSummary(metricKey, 'imtp', label)}
                      disabled={loadingSummaries[metricKey]}
                      className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${loadingSummaries[metricKey] ? 'bg-slate-100 text-slate-400 animate-pulse' : 'bg-red-50 text-red-500 hover:bg-red-500 hover:text-white'}`}
                      title="Generar resumen con IA"
                    >
                      <i className={`fa-solid ${loadingSummaries[metricKey] ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'} text-[10px]`}></i>
                    </button>
                  </div>
                  <select 
                    value={metricKey}
                    onChange={(e) => {
                      const next = [...selectedImtpMetrics];
                      next[idx] = e.target.value;
                      setSelectedImtpMetrics(next);
                      // Clear summary if metric changes
                      if (summaries[metricKey]) {
                        const newSummaries = { ...summaries };
                        delete newSummaries[metricKey];
                        setSummaries(newSummaries);
                      }
                    }}
                    className="bg-slate-50 border-none rounded-xl px-3 py-1.5 text-[10px] font-black text-slate-500 outline-none focus:ring-2 focus:ring-red-500 uppercase tracking-widest"
                  >
                    {imtpOptions.map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                  </select>
                </div>
                <div className="h-64">
                  <BoxPlotChart data={getBoxPlotData(metricKey, 'imtp')} color="#ef4444" />
                </div>

                <AnimatePresence>
                  {summaries[metricKey] && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                      <div className="flex items-start gap-3">
                        <i className="fa-solid fa-robot text-red-500 mt-1 text-xs"></i>
                        <p className="text-[11px] font-bold text-slate-600 leading-relaxed italic">
                          {summaries[metricKey]}
                        </p>
                      </div>
                      <button 
                        onClick={() => {
                          const newSummaries = { ...summaries };
                          delete newSummaries[metricKey];
                          setSummaries(newSummaries);
                        }}
                        className="absolute top-2 right-2 text-slate-300 hover:text-slate-500"
                      >
                        <i className="fa-solid fa-xmark text-[10px]"></i>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECCIÓN SPEED BOX PLOTS */}
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">Distribución Velocidad por Posición</h3>
          <div className="h-px flex-1 bg-slate-100"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {selectedSpeedMetrics.map((metricKey, idx) => {
            const label = METRICS_OPTIONS.find(m => m.key === metricKey)?.label || '';
            return (
              <div key={idx} className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 relative group">
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {label}
                    </h4>
                    <button 
                      onClick={() => handleGenerateSummary(metricKey, 'speed', label)}
                      disabled={loadingSummaries[metricKey]}
                      className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${loadingSummaries[metricKey] ? 'bg-slate-100 text-slate-400 animate-pulse' : 'bg-amber-50 text-amber-500 hover:bg-amber-500 hover:text-white'}`}
                      title="Generar resumen con IA"
                    >
                      <i className={`fa-solid ${loadingSummaries[metricKey] ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'} text-[10px]`}></i>
                    </button>
                  </div>
                  <select 
                    value={metricKey}
                    onChange={(e) => {
                      const next = [...selectedSpeedMetrics];
                      next[idx] = e.target.value;
                      setSelectedSpeedMetrics(next);
                      if (summaries[metricKey]) {
                        const newSummaries = { ...summaries };
                        delete newSummaries[metricKey];
                        setSummaries(newSummaries);
                      }
                    }}
                    className="bg-slate-50 border-none rounded-xl px-3 py-1.5 text-[10px] font-black text-slate-500 outline-none focus:ring-2 focus:ring-amber-500 uppercase tracking-widest"
                  >
                    {speedOptions.map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                  </select>
                </div>
                <div className="h-64">
                  <BoxPlotChart data={getBoxPlotData(metricKey, 'speed')} color="#f59e0b" />
                </div>

                <AnimatePresence>
                  {summaries[metricKey] && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                      <div className="flex items-start gap-3">
                        <i className="fa-solid fa-robot text-amber-500 mt-1 text-xs"></i>
                        <p className="text-[11px] font-bold text-slate-600 leading-relaxed italic">
                          {summaries[metricKey]}
                        </p>
                      </div>
                      <button 
                        onClick={() => {
                          const newSummaries = { ...summaries };
                          delete newSummaries[metricKey];
                          setSummaries(newSummaries);
                        }}
                        className="absolute top-2 right-2 text-slate-300 hover:text-slate-500"
                      >
                        <i className="fa-solid fa-xmark text-[10px]"></i>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECCIÓN VO2 BOX PLOTS */}
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">Distribución VO2 Max por Posición</h3>
          <div className="h-px flex-1 bg-slate-100"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {selectedVo2Metrics.map((metricKey, idx) => {
            const label = METRICS_OPTIONS.find(m => m.key === metricKey)?.label || '';
            return (
              <div key={idx} className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 relative group">
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {label}
                    </h4>
                    <button 
                      onClick={() => handleGenerateSummary(metricKey, 'vo2max', label)}
                      disabled={loadingSummaries[metricKey]}
                      className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${loadingSummaries[metricKey] ? 'bg-slate-100 text-slate-400 animate-pulse' : 'bg-indigo-50 text-indigo-500 hover:bg-indigo-500 hover:text-white'}`}
                      title="Generar resumen con IA"
                    >
                      <i className={`fa-solid ${loadingSummaries[metricKey] ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'} text-[10px]`}></i>
                    </button>
                  </div>
                  <select 
                    value={metricKey}
                    onChange={(e) => {
                      const next = [...selectedVo2Metrics];
                      next[idx] = e.target.value;
                      setSelectedVo2Metrics(next);
                      if (summaries[metricKey]) {
                        const newSummaries = { ...summaries };
                        delete newSummaries[metricKey];
                        setSummaries(newSummaries);
                      }
                    }}
                    className="bg-slate-50 border-none rounded-xl px-3 py-1.5 text-[10px] font-black text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500 uppercase tracking-widest"
                  >
                    {vo2Options.map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                  </select>
                </div>
                <div className="h-64">
                  <BoxPlotChart data={getBoxPlotData(metricKey, 'vo2max')} color="#6366f1" />
                </div>

                <AnimatePresence>
                  {summaries[metricKey] && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                      <div className="flex items-start gap-3">
                        <i className="fa-solid fa-robot text-indigo-500 mt-1 text-xs"></i>
                        <p className="text-[11px] font-bold text-slate-600 leading-relaxed italic">
                          {summaries[metricKey]}
                        </p>
                      </div>
                      <button 
                        onClick={() => {
                          const newSummaries = { ...summaries };
                          delete newSummaries[metricKey];
                          setSummaries(newSummaries);
                        }}
                        className="absolute top-2 right-2 text-slate-300 hover:text-slate-500"
                      >
                        <i className="fa-solid fa-xmark text-[10px]"></i>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECCIÓN ANTROPOMETRÍA BOX PLOTS */}
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">Distribución Antropometría por Posición</h3>
          <div className="h-px flex-1 bg-slate-100"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {selectedAntroMetrics.map((metricKey, idx) => {
            const label = METRICS_OPTIONS.find(m => m.key === metricKey)?.label || '';
            return (
              <div key={idx} className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 relative group">
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {label}
                    </h4>
                    <button 
                      onClick={() => handleGenerateSummary(metricKey, 'antropometria', label)}
                      disabled={loadingSummaries[metricKey]}
                      className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${loadingSummaries[metricKey] ? 'bg-slate-100 text-slate-400 animate-pulse' : 'bg-emerald-50 text-emerald-500 hover:bg-emerald-500 hover:text-white'}`}
                      title="Generar resumen con IA"
                    >
                      <i className={`fa-solid ${loadingSummaries[metricKey] ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'} text-[10px]`}></i>
                    </button>
                  </div>
                  <select 
                    value={metricKey}
                    onChange={(e) => {
                      const next = [...selectedAntroMetrics];
                      next[idx] = e.target.value;
                      setSelectedAntroMetrics(next);
                      if (summaries[metricKey]) {
                        const newSummaries = { ...summaries };
                        delete newSummaries[metricKey];
                        setSummaries(newSummaries);
                      }
                    }}
                    className="bg-slate-50 border-none rounded-xl px-3 py-1.5 text-[10px] font-black text-slate-500 outline-none focus:ring-2 focus:ring-emerald-500 uppercase tracking-widest"
                  >
                    {antroOptions.map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                  </select>
                </div>
                <div className="h-64">
                  <BoxPlotChart data={getBoxPlotData(metricKey, 'antropometria')} color="#10b981" />
                </div>

                <AnimatePresence>
                  {summaries[metricKey] && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                      <div className="flex items-start gap-3">
                        <i className="fa-solid fa-robot text-emerald-500 mt-1 text-xs"></i>
                        <p className="text-[11px] font-bold text-slate-600 leading-relaxed italic">
                          {summaries[metricKey]}
                        </p>
                      </div>
                      <button 
                        onClick={() => {
                          const newSummaries = { ...summaries };
                          delete newSummaries[metricKey];
                          setSummaries(newSummaries);
                        }}
                        className="absolute top-2 right-2 text-slate-300 hover:text-slate-500"
                      >
                        <i className="fa-solid fa-xmark text-[10px]"></i>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const CorrelationsInsights = ({ players, imtp, speed, vo2max, antropometria, selectedAnios, selectedPosiciones }: { 
  players: PlayerData[], 
  imtp: IMTPData[], 
  speed: SpeedTestData[], 
  vo2max: VO2MaxData[], 
  antropometria: AntropometriaData[],
  selectedAnios: number[],
  selectedPosiciones: string[]
}) => {
  const topCorrelations = useMemo(() => {
    const filteredPlayers = players.filter(p => {
      const pYear = (p as any).anio ? Number((p as any).anio) : new Date(p.fecha_nacimiento).getFullYear();
      const yearMatch = selectedAnios.length === 0 || selectedAnios.includes(pYear);
      const posMatch = selectedPosiciones.length === 0 || selectedPosiciones.includes(p.posicion);
      return yearMatch && posMatch;
    });

    const playersData = filteredPlayers.map(p => {
      const metricsData: Record<string, number | undefined> = {};
      METRICS_OPTIONS.forEach(opt => {
        metricsData[opt.key] = getLatestMetricValue(p.player_id, opt.key, imtp, speed, vo2max, antropometria);
      });
      return {
        ...metricsData
      };
    });

    const correlations: { m1: any, m2: any, r: number, count: number }[] = [];

    for (let i = 0; i < METRICS_OPTIONS.length; i++) {
      for (let j = i + 1; j < METRICS_OPTIONS.length; j++) {
        const m1 = METRICS_OPTIONS[i];
        const m2 = METRICS_OPTIONS[j];

        const pairs = playersData
          .map(p => ({ x: Number(p[m1.key as keyof typeof p]), y: Number(p[m2.key as keyof typeof p]) }))
          .filter(p => !isNaN(p.x) && !isNaN(p.y) && p.x !== null && p.y !== null);

        if (pairs.length > 5) {
          const n = pairs.length;
          let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
          for (const p of pairs) {
            sumX += p.x;
            sumY += p.y;
            sumXY += p.x * p.y;
            sumX2 += p.x * p.x;
            sumY2 += p.y * p.y;
          }
          const num = (n * sumXY - sumX * sumY);
          const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
          if (den !== 0) {
            correlations.push({ m1, m2, r: num / den, count: n });
          }
        }
      }
    }

    return correlations
      .sort((a, b) => Math.abs(b.r) - Math.abs(a.r))
      .slice(0, 10);
  }, [players, imtp, speed, vo2max, antropometria, selectedAnios, selectedPosiciones]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-sm border border-slate-100">
        <div className="flex items-center gap-4 mb-10">
          <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-200">
            <i className="fa-solid fa-wand-magic-sparkles text-xl"></i>
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Top 10 Correlaciones</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Descubrimientos automáticos basados en datos actuales</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {topCorrelations.map((corr, idx) => (
            <div key={idx} className="group bg-slate-50 hover:bg-white hover:shadow-xl hover:scale-[1.02] transition-all duration-300 rounded-[32px] p-6 border border-transparent hover:border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 font-black text-xs shadow-sm group-hover:bg-amber-500 group-hover:text-white transition-colors">
                  {idx + 1}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{corr.m1.label}</span>
                    <i className="fa-solid fa-link text-[8px] text-slate-300"></i>
                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{corr.m2.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 w-24 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${Math.abs(corr.r) > 0.7 ? 'bg-emerald-500' : Math.abs(corr.r) > 0.4 ? 'bg-amber-500' : 'bg-slate-400'}`}
                        style={{ width: `${Math.abs(corr.r) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">n={corr.count}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-xl font-black italic tracking-tighter ${Math.abs(corr.r) > 0.7 ? 'text-emerald-600' : Math.abs(corr.r) > 0.4 ? 'text-amber-600' : 'text-slate-600'}`}>
                  {corr.r.toFixed(3)}
                </p>
                <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Coef. Pearson (R)</p>
              </div>
            </div>
          ))}
        </div>

        {topCorrelations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-[32px] border border-dashed border-slate-200">
            <i className="fa-solid fa-magnifying-glass-chart text-slate-200 text-5xl mb-6"></i>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No hay datos suficientes para generar insights</p>
            <p className="text-[10px] text-slate-300 uppercase tracking-widest mt-2">Se requieren al menos 6 jugadores con datos cruzados</p>
          </div>
        )}
      </div>
    </div>
  );
};

const Categorias = ({ players, imtp, speed, vo2max, antropometria, selectedAnios, selectedPosiciones }: { 
  players: PlayerData[], 
  imtp: IMTPData[], 
  speed: SpeedTestData[], 
  vo2max: VO2MaxData[], 
  antropometria: AntropometriaData[],
  selectedAnios: number[],
  selectedPosiciones: string[]
}) => {
  const [metric1, setMetric1] = useState('imtp_fuerza_n');
  const [metric2, setMetric2] = useState('vel_10m');

  const calculateStats = (metricKey: string) => {
    const filteredPlayers = players.filter(p => {
      const pYear = (p as any).anio ? Number((p as any).anio) : new Date(p.fecha_nacimiento).getFullYear();
      const yearMatch = selectedAnios.length === 0 || selectedAnios.includes(pYear);
      const posMatch = selectedPosiciones.length === 0 || selectedPosiciones.includes(p.posicion);
      return yearMatch && posMatch;
    });

    const values = filteredPlayers.map(p => {
      const val = getLatestMetricValue(p.player_id, metricKey, imtp, speed, vo2max, antropometria);
      return val !== undefined ? Number(val) : null;
    }).filter((v): v is number => v !== null && !isNaN(v));

    if (values.length === 0) return null;

    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(values.map(x => Math.pow(x - avg, 2)).reduce((a, b) => a + b, 0) / values.length);

    const isInverted = [
      'masa_adiposa_kg', 
      'masa_adiposa_pct', 
      'tiempo_10m', 
      'tiempo_10_20m', 
      'tiempo_20_30m', 
      'tiempo_total',
      'sum_pliegues_6_mm',
      'sum_pliegues_8_mm'
    ].includes(metricKey);

    const distribution = isInverted ? {
      elite: values.filter(v => v < avg - std).length,
      competitive: values.filter(v => v >= avg - std && v < avg).length,
      development: values.filter(v => v >= avg && v <= avg + std).length,
      attention: values.filter(v => v > avg + std).length
    } : {
      elite: values.filter(v => v > avg + std).length,
      competitive: values.filter(v => v > avg && v <= avg + std).length,
      development: values.filter(v => v >= avg - std && v <= avg).length,
      attention: values.filter(v => v < avg - std).length
    };

    return { avg, std, count: values.length, distribution, isInverted };
  };

  const calculatePercentileStats = (metricKey: string) => {
    const filteredPlayers = players.filter(p => {
      const pYear = (p as any).anio ? Number((p as any).anio) : new Date(p.fecha_nacimiento).getFullYear();
      const yearMatch = selectedAnios.length === 0 || selectedAnios.includes(pYear);
      const posMatch = selectedPosiciones.length === 0 || selectedPosiciones.includes(p.posicion);
      return yearMatch && posMatch;
    });

    const values = filteredPlayers.map(p => {
      const val = getLatestMetricValue(p.player_id, metricKey, imtp, speed, vo2max, antropometria);
      return val !== undefined ? Number(val) : null;
    }).filter((v): v is number => v !== null && !isNaN(v));

    if (values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const getP = (p: number) => {
      const idx = Math.floor((p / 100) * (sorted.length - 1));
      return sorted[idx];
    };

    const p90 = getP(90);
    const p75 = getP(75);
    const p50 = getP(50);
    const p25 = getP(25);
    const p10 = getP(10);

    const isInverted = [
      'masa_adiposa_kg', 
      'masa_adiposa_pct', 
      'tiempo_10m', 
      'tiempo_10_20m', 
      'tiempo_20_30m', 
      'tiempo_total',
      'sum_pliegues_6_mm',
      'sum_pliegues_8_mm'
    ].includes(metricKey);

    const distribution = isInverted ? {
      elite: values.filter(v => v <= p10).length,
      competitive: values.filter(v => v > p10 && v <= p25).length,
      development: values.filter(v => v > p25 && v <= p50).length,
      attention: values.filter(v => v > p50).length
    } : {
      elite: values.filter(v => v >= p90).length,
      competitive: values.filter(v => v >= p75 && v < p90).length,
      development: values.filter(v => v >= p50 && v < p75).length,
      attention: values.filter(v => v < p50).length
    };

    return { p90, p75, p50, p25, p10, count: values.length, distribution, isInverted };
  };

  const renderCategoryBox = (metricKey: string, setMetric: (val: string) => void, title: string) => {
    const stats = calculateStats(metricKey);
    const label = METRICS_OPTIONS.find(m => m.key === metricKey)?.label;

    return (
      <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-sm border border-slate-100 flex flex-col">
        <div className="flex flex-wrap items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-4">
            <div className="w-3 h-10 bg-red-600 rounded-full"></div>
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">{title}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Benchmarks Estadísticos</p>
            </div>
          </div>
          <select 
            value={metricKey}
            onChange={(e) => setMetric(e.target.value)}
            className="bg-slate-50 border-none rounded-2xl px-6 py-3 text-xs font-black text-slate-600 outline-none focus:ring-2 focus:ring-red-500 uppercase tracking-widest transition-all"
          >
            {METRICS_OPTIONS.map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
          </select>
        </div>

        {!stats ? (
          <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-[32px] border border-dashed border-slate-200">
            <i className="fa-solid fa-chart-line text-slate-300 text-4xl mb-4"></i>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sin datos suficientes para calcular</p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* RESUMEN BASE */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900 rounded-3xl p-6 text-white">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Promedio (μ)</p>
                  <p className="text-3xl font-black italic tracking-tighter">
                    {(stats.avg != null && !isNaN(Number(stats.avg))) ? Number(stats.avg).toFixed(2) : '-'}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Desv. Estándar (σ)</p>
                  <p className="text-3xl font-black italic tracking-tighter text-slate-900">
                    ±{(stats.std != null && !isNaN(Number(stats.std))) ? Number(stats.std).toFixed(2) : '0.00'}
                  </p>
                </div>
              </div>
              <div className="flex justify-center">
                <div className="bg-slate-100/50 px-4 py-1.5 rounded-full flex items-center gap-2">
                  <i className="fa-solid fa-users text-[10px] text-slate-400"></i>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Muestra Total: {stats.count} Jugadores</span>
                </div>
              </div>
            </div>

            {/* CATEGORÍAS */}
            <div className="space-y-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Distribución por Niveles</p>
              
              <div className="grid grid-cols-1 gap-3">
                {/* ELITE */}
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                      <i className="fa-solid fa-crown text-sm"></i>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Nivel Élite</p>
                      <p className="text-xs font-bold text-slate-500">
                        {stats.isInverted ? 'Inferior a -1σ' : 'Superior a +1σ'} ({stats.distribution.elite} jug.)
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-emerald-700 italic tracking-tighter">
                      {stats.isInverted ? '<' : '>'} {((stats.isInverted ? stats.avg - stats.std : stats.avg + stats.std) != null && !isNaN(Number(stats.isInverted ? stats.avg - stats.std : stats.avg + stats.std))) ? (stats.isInverted ? stats.avg - stats.std : stats.avg + stats.std).toFixed(2) : '-'}
                    </p>
                  </div>
                </div>

                {/* COMPETITIVO */}
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                      <i className="fa-solid fa-bolt text-sm"></i>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Nivel Competitivo</p>
                      <p className="text-xs font-bold text-slate-500">
                        {stats.isInverted ? 'Entre -1σ y Promedio' : 'Entre Promedio y +1σ'} ({stats.distribution.competitive} jug.)
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-blue-700 italic tracking-tighter">
                      {stats.isInverted 
                        ? `${(stats.avg - stats.std != null && !isNaN(Number(stats.avg - stats.std))) ? (stats.avg - stats.std).toFixed(2) : '-'} - ${(stats.avg != null && !isNaN(Number(stats.avg))) ? stats.avg.toFixed(2) : '-'}`
                        : `${(stats.avg != null && !isNaN(Number(stats.avg))) ? stats.avg.toFixed(2) : '-'} - ${(stats.avg + stats.std != null && !isNaN(Number(stats.avg + stats.std))) ? (stats.avg + stats.std).toFixed(2) : '-'}`
                      }
                    </p>
                  </div>
                </div>

                {/* DESARROLLO */}
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-200">
                      <i className="fa-solid fa-seedling text-sm"></i>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Nivel en Desarrollo</p>
                      <p className="text-xs font-bold text-slate-500">
                        {stats.isInverted ? 'Entre Promedio y +1σ' : 'Entre -1σ y Promedio'} ({stats.distribution.development} jug.)
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-amber-700 italic tracking-tighter">
                      {stats.isInverted
                        ? `${(stats.avg != null && !isNaN(Number(stats.avg))) ? stats.avg.toFixed(2) : '-'} - ${(stats.avg + stats.std != null && !isNaN(Number(stats.avg + stats.std))) ? (stats.avg + stats.std).toFixed(2) : '-'}`
                        : `${(stats.avg - stats.std != null && !isNaN(Number(stats.avg - stats.std))) ? (stats.avg - stats.std).toFixed(2) : '-'} - ${(stats.avg != null && !isNaN(Number(stats.avg))) ? stats.avg.toFixed(2) : '-'}`
                      }
                    </p>
                  </div>
                </div>

                {/* ATENCION */}
                <div className="bg-red-50 border border-red-100 rounded-2xl p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-red-200">
                      <i className="fa-solid fa-triangle-exclamation text-sm"></i>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Nivel de Atención</p>
                      <p className="text-xs font-bold text-slate-500">
                        {stats.isInverted ? 'Superior a +1σ' : 'Inferior a -1σ'} ({stats.distribution.attention} jug.)
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-red-700 italic tracking-tighter">
                      {stats.isInverted ? '>' : '<'} {((stats.isInverted ? stats.avg + stats.std : stats.avg - stats.std) != null && !isNaN(Number(stats.isInverted ? stats.avg + stats.std : stats.avg - stats.std))) ? (stats.isInverted ? stats.avg + stats.std : stats.avg - stats.std).toFixed(2) : '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPercentileBox = (metricKey: string, title: string) => {
    const stats = calculatePercentileStats(metricKey);
    const label = METRICS_OPTIONS.find(m => m.key === metricKey)?.label;

    return (
      <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-sm border border-slate-100 flex flex-col">
        <div className="flex flex-wrap items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-4">
            <div className="w-3 h-10 bg-[#0b1220] rounded-full"></div>
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">{title}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Análisis por Percentiles</p>
            </div>
          </div>
          <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
            <i className="fa-solid fa-chart-bar"></i> {label}
          </div>
        </div>

        {!stats ? (
          <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-[32px] border border-dashed border-slate-200">
            <i className="fa-solid fa-chart-simple text-slate-300 text-4xl mb-4"></i>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sin datos suficientes para calcular percentiles</p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* RESUMEN PERCENTILES */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900 rounded-3xl p-6 text-white">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Mediana (P50)</p>
                  <p className="text-3xl font-black italic tracking-tighter">
                    {(stats.p50 != null && !isNaN(Number(stats.p50))) ? Number(stats.p50).toFixed(2) : '-'}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Elite (P90)</p>
                  <p className="text-3xl font-black italic tracking-tighter text-slate-900">
                    {(stats.p90 != null && !isNaN(Number(stats.p90))) ? Number(stats.p90).toFixed(2) : '-'}
                  </p>
                </div>
              </div>
              <div className="flex justify-center">
                <div className="bg-slate-100/50 px-4 py-1.5 rounded-full flex items-center gap-2">
                  <i className="fa-solid fa-users text-[10px] text-slate-400"></i>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Muestra Total: {stats.count} Jugadores</span>
                </div>
              </div>
            </div>

            {/* CATEGORÍAS PERCENTILES */}
            <div className="space-y-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Distribución por Percentiles</p>
              
              <div className="grid grid-cols-1 gap-3">
                {/* ELITE P90 */}
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                      <i className="fa-solid fa-crown text-sm"></i>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Rango Élite (Top 10%)</p>
                      <p className="text-xs font-bold text-slate-500">
                        {stats.isInverted ? `Inferior a P10` : `Superior a P90`} ({stats.distribution.elite} jug.)
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-emerald-700 italic tracking-tighter">
                      {stats.isInverted ? '<=' : '>='} {(stats.isInverted ? stats.p10 : stats.p90).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* COMPETITIVO P75 */}
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                      <i className="fa-solid fa-bolt text-sm"></i>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Rango Competitivo</p>
                      <p className="text-xs font-bold text-slate-500">
                        {stats.isInverted ? `Entre P10 y P25` : `Entre P75 y P90`} ({stats.distribution.competitive} jug.)
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-blue-700 italic tracking-tighter">
                      {stats.isInverted 
                        ? `${stats.p10.toFixed(2)} - ${stats.p25.toFixed(2)}`
                        : `${stats.p75.toFixed(2)} - ${stats.p90.toFixed(2)}`
                      }
                    </p>
                  </div>
                </div>

                {/* DESARROLLO P50 */}
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-200">
                      <i className="fa-solid fa-seedling text-sm"></i>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Rango en Desarrollo</p>
                      <p className="text-xs font-bold text-slate-500">
                        {stats.isInverted ? `Entre P25 y P50` : `Entre P50 y P75`} ({stats.distribution.development} jug.)
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-amber-700 italic tracking-tighter">
                      {stats.isInverted
                        ? `${stats.p25.toFixed(2)} - ${stats.p50.toFixed(2)}`
                        : `${stats.p50.toFixed(2)} - ${stats.p75.toFixed(2)}`
                      }
                    </p>
                  </div>
                </div>

                {/* ATENCION < P50 */}
                <div className="bg-red-50 border border-red-100 rounded-2xl p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-red-200">
                      <i className="fa-solid fa-triangle-exclamation text-sm"></i>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Rango de Atención</p>
                      <p className="text-xs font-bold text-slate-500">
                        {stats.isInverted ? `Superior a P50` : `Inferior a P50`} ({stats.distribution.attention} jug.)
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-red-700 italic tracking-tighter">
                      {stats.isInverted ? '>' : '<'} {stats.p50.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {renderCategoryBox(metric1, setMetric1, "Caja de Análisis 1")}
        {renderCategoryBox(metric2, setMetric2, "Caja de Análisis 2")}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {renderPercentileBox(metric1, "Caja de Análisis 3 (Percentiles)")}
        {renderPercentileBox(metric2, "Caja de Análisis 4 (Percentiles)")}
      </div>
    </div>
  );
};

const Laboratorio = ({ players, imtp, speed, vo2max, antropometria, selectedAnios, selectedPosiciones, highlightPlayerId }: { 
  players: PlayerData[], 
  imtp: IMTPData[], 
  speed: SpeedTestData[], 
  vo2max: VO2MaxData[], 
  antropometria: AntropometriaData[],
  selectedAnios: number[],
  selectedPosiciones: string[],
  highlightPlayerId: number | null
}) => {
  const [axes, setAxes] = useState([
    { x: 'imtp_fuerza_n', y: 'fuerza_cmj' },
    { x: 'masa_corporal_kg', y: 'imtp_f_relativa_n_kg' },
    { x: 'vel_10m', y: 'tiempo_total' },
    { x: 'vo2_max', y: 'vam' }
  ]);

  const mergedData = useMemo(() => {
    return players
      .filter(p => {
        const pYear = (p as any).anio ? Number((p as any).anio) : new Date(p.fecha_nacimiento).getFullYear();
        const yearMatch = selectedAnios.length === 0 || selectedAnios.includes(pYear);
        const posMatch = selectedPosiciones.length === 0 || selectedPosiciones.includes(p.posicion);
        return yearMatch && posMatch;
      })
      .map(p => {
        const metricsData: Record<string, number | undefined> = {};
        METRICS_OPTIONS.forEach(opt => {
          metricsData[opt.key] = getLatestMetricValue(p.player_id, opt.key, imtp, speed, vo2max, antropometria);
        });
        
        return {
          id: p.player_id,
          name: `${p.nombre} ${p.apellido1}`,
          posicion: p.posicion,
          ...metricsData
        };
      });
  }, [players, imtp, speed, vo2max, antropometria, selectedAnios, selectedPosiciones]);

  const updateAxis = (chartIdx: number, axis: 'x' | 'y', key: string) => {
    const newAxes = [...axes];
    newAxes[chartIdx] = { ...newAxes[chartIdx], [axis]: key };
    setAxes(newAxes);
  };

  const regressionData = useMemo(() => {
    return axes.map(axis => {
      const filtered = mergedData.filter(d => 
        d[axis.x] !== undefined && d[axis.y] !== undefined && 
        d[axis.x] !== null && d[axis.y] !== null &&
        !isNaN(d[axis.x]) && !isNaN(d[axis.y])
      );
      
      if (filtered.length < 2) return null;

      const n = filtered.length;
      let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

      for (const d of filtered) {
        const x = Number(d[axis.x]);
        const y = Number(d[axis.y]);
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
        sumY2 += y * y;
      }

      const denominator = (n * sumX2 - sumX * sumX);
      if (denominator === 0) return null;

      const slope = (n * sumXY - sumX * sumY) / denominator;
      const intercept = (sumY - slope * sumX) / n;
      
      const rNumerator = (n * sumXY - sumX * sumY);
      const rDenominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
      const r = rDenominator !== 0 ? rNumerator / rDenominator : 0;

      const xValues = filtered.map(d => Number(d[axis.x]));
      const minX = Math.min(...xValues);
      const maxX = Math.max(...xValues);
      
      const lineData = [
        { [axis.x]: minX, [axis.y]: slope * minX + intercept },
        { [axis.y]: slope * maxX + intercept, [axis.x]: maxX }
      ];

      return { slope, intercept, r, lineData };
    });
  }, [mergedData, axes]);

  return (
    <div className="grid grid-cols-1 gap-12">
      {axes.map((axis, idx) => {
        const stats = regressionData[idx];
        return (
          <div key={idx} className="bg-white rounded-[40px] p-8 md:p-12 shadow-sm border border-slate-100 flex flex-col relative overflow-hidden">
            
            <div className="flex flex-wrap items-center justify-between gap-6 mb-12">
              <div className="flex items-center gap-4">
                <div className="w-3 h-10 bg-red-600 rounded-full"></div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">
                    Gráfico de Correlación {idx + 1}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Laboratorio de Rendimiento</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Variable Independiente (Eje X)</span>
                  <select 
                    value={axis.x}
                    onChange={(e) => updateAxis(idx, 'x', e.target.value)}
                    className="bg-slate-50 border-none rounded-2xl px-4 py-2.5 text-xs font-black text-slate-600 outline-none focus:ring-2 focus:ring-red-500 uppercase tracking-widest transition-all"
                  >
                    {METRICS_OPTIONS.map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Variable Dependiente (Eje Y)</span>
                  <select 
                    value={axis.y}
                    onChange={(e) => updateAxis(idx, 'y', e.target.value)}
                    className="bg-slate-50 border-none rounded-2xl px-4 py-2.5 text-xs font-black text-slate-600 outline-none focus:ring-2 focus:ring-red-500 uppercase tracking-widest transition-all"
                  >
                    {METRICS_OPTIONS.map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                  </select>
                </div>

                {stats && (
                  <div className="bg-slate-50 border border-slate-100 p-2.5 px-4 rounded-2xl min-h-[46px] flex flex-col justify-center">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Análisis Estadístico</p>
                    <div className="flex gap-4 items-center">
                      <p className="text-xs font-black text-red-600 tracking-tighter">
                        y = {(stats.slope != null && !isNaN(Number(stats.slope))) ? stats.slope.toFixed(3) : '0.000'}x {stats.intercept >= 0 ? '+' : '-'} {(stats.intercept != null && !isNaN(Number(stats.intercept))) ? Math.abs(stats.intercept).toFixed(2) : '0.00'}
                      </p>
                      <p className="text-xs font-black text-slate-600 tracking-tighter">
                        R = {(stats.r != null && !isNaN(Number(stats.r))) ? stats.r.toFixed(3) : '0.000'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="h-[500px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 40, bottom: 40, left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    type="number" 
                    dataKey={axis.x} 
                    name={METRICS_OPTIONS.find(m => m.key === axis.x)?.label} 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    fontWeight={900} 
                    axisLine={false}
                    domain={['auto', 'auto']}
                    tick={{ fill: '#94a3b8' }}
                    label={{ value: METRICS_OPTIONS.find(m => m.key === axis.x)?.label, position: 'insideBottom', offset: -20, fontSize: 11, fontWeight: 900, fill: '#64748b' }}
                  />
                  <YAxis 
                    type="number" 
                    dataKey={axis.y} 
                    name={METRICS_OPTIONS.find(m => m.key === axis.y)?.label} 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    fontWeight={900} 
                    axisLine={false}
                    domain={['auto', 'auto']}
                    tick={{ fill: '#94a3b8' }}
                    label={{ value: METRICS_OPTIONS.find(m => m.key === axis.y)?.label, angle: -90, position: 'insideLeft', offset: 0, fontSize: 11, fontWeight: 900, fill: '#64748b' }}
                  />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3', stroke: '#cbd5e1' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        if (data.isTrendLine) return null;
                        return (
                          <div className="bg-white p-5 rounded-[32px] shadow-2xl border border-slate-100 min-w-[200px]">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-2 h-8 bg-red-600 rounded-full"></div>
                              <div>
                                <p className="text-xs font-black text-slate-900 uppercase italic leading-none">{data.name}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{data.posicion}</p>
                              </div>
                            </div>
                            <div className="h-px bg-slate-100 my-3"></div>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{METRICS_OPTIONS.find(m => m.key === axis.x)?.label}</span>
                                <span className="text-xs font-black text-red-600">{data[axis.x]}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{METRICS_OPTIONS.find(m => m.key === axis.y)?.label}</span>
                                <span className="text-xs font-black text-blue-600">{data[axis.y]}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Scatter name="Jugadores" data={mergedData} fill="#ef4444">
                    {mergedData.map((entry, index) => {
                      const baseColor = POSITION_COLORS[entry.posicion as keyof typeof POSITION_COLORS] || '#ef4444';
                      const hasHighlight = highlightPlayerId !== null;
                      const isHighlighted = hasHighlight && Number(entry.id) === Number(highlightPlayerId);
                      
                      const fill = hasHighlight 
                        ? (isHighlighted ? baseColor : '#cbd5e1') 
                        : baseColor;
                        
                      const stroke = hasHighlight 
                        ? (isHighlighted ? baseColor : '#e2e8f0') 
                        : baseColor;
                        
                      const fillOpacity = hasHighlight 
                        ? (isHighlighted ? 1.0 : 0.35) 
                        : 0.8;
                        
                      const strokeWidth = hasHighlight 
                        ? (isHighlighted ? 5 : 1) 
                        : 2;

                      return (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={fill} 
                          fillOpacity={fillOpacity}
                          strokeWidth={strokeWidth}
                          stroke={stroke}
                        />
                      );
                    })}
                  </Scatter>
                  {stats && (
                    <Scatter 
                      name="Tendencia" 
                      data={stats.lineData.map(d => ({ ...d, isTrendLine: true }))} 
                      line={{ stroke: '#ef4444', strokeWidth: 3, strokeDasharray: '8 8' }} 
                      shape={() => null}
                    />
                  )}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const HealthLoad = ({ player, injury, gps }: { player?: PlayerData, injury?: InjuryData, gps: GPSData[] }) => {
  const isInjured = injury?.estado === 'Activo';
  const statusLabel = injury ? (injury.disponibilidad === 'No Disponible' ? 'Lesionado' : 'RTP') : 'Disponible';

  const gpsSummary = useMemo(() => {
    if (gps.length === 0) return [
      { name: 'Sprint Dist', val: 450, avg: 380 },
      { name: 'HSR Dist', val: 1200, avg: 1100 },
      { name: 'Accels', val: 45, avg: 40 },
      { name: 'Decels', val: 38, avg: 42 },
    ];
    const lastGps = gps[gps.length - 1];
    return [
      { name: 'Sprint Dist', val: lastGps.sprints_n * 20, avg: 380 },
      { name: 'HSR Dist', val: lastGps.dist_total_m * 0.15, avg: 1100 },
      { name: 'Accels', val: 45, avg: 40 },
      { name: 'Decels', val: 38, avg: 42 },
    ];
  }, [gps]);

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center text-2xl ${isInjured ? 'bg-red-50 text-red-600' : statusLabel === 'RTP' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
            <i className={`fa-solid ${isInjured ? 'fa-user-injured' : statusLabel === 'RTP' ? 'fa-user-clock' : 'fa-user-check'}`}></i>
          </div>
          <div>
            <h3 className="text-xl font-black italic uppercase tracking-tighter leading-none">Estado de Alta Médica</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">
              {isInjured ? '⚠️ BLOQUEO DE ALTA INTENSIDAD ACTIVO' : statusLabel === 'RTP' ? '⏳ PROTOCOLO RTP EN CURSO' : '✅ APTO PARA COMPETENCIA'}
            </p>
          </div>
        </div>
        {isInjured && (
          <div className="flex flex-col items-end">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Progreso Rehabilitación</p>
            <div className="flex items-center gap-3">
              <div className="w-48 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: '65%' }}></div>
              </div>
              <span className="text-sm font-black text-blue-600 italic">65%</span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className={`bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 ${isInjured ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8">GPS High Intensity Metrics</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gpsSummary}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} fontWeight={900} axisLine={false} />
                <YAxis hide />
                <Tooltip />
                <Bar dataKey="val" fill="#ef4444" radius={[8, 8, 0, 0]} />
                <Bar dataKey="avg" fill="#f1f5f9" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#0b1220] rounded-[40px] p-8 text-white shadow-2xl">
          <h3 className="text-sm font-black uppercase tracking-widest mb-8">Protocolo de Retorno al Juego (RTP)</h3>
          <div className="space-y-6">
            {[
              { step: '1', label: 'Movilidad & Control Motor', status: 'completed' },
              { step: '2', label: 'Carga Aeróbica Lineal', status: 'completed' },
              { step: '3', label: 'Cambios de Dirección (COD)', status: statusLabel === 'RTP' ? 'active' : 'completed' },
              { step: '4', label: 'Integración Parcial Grupo', status: statusLabel === 'RTP' ? 'pending' : 'completed' },
              { step: '5', label: 'Alta Competitiva', status: statusLabel === 'RTP' ? 'pending' : 'completed' },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black ${
                  step.status === 'completed' ? 'bg-emerald-500 text-white' : 
                  step.status === 'active' ? 'bg-red-600 text-white animate-pulse' : 'bg-white/5 text-slate-500'
                }`}>
                  {step.status === 'completed' ? <i className="fa-solid fa-check"></i> : step.step}
                </div>
                <p className={`text-xs font-bold uppercase tracking-tight ${step.status === 'pending' ? 'text-slate-600' : 'text-white'}`}>
                  {step.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const DataTable = ({ imtp, speed, vo2max, antropometria, players }: { imtp: IMTPData[], speed: SpeedTestData[], vo2max: VO2MaxData[], antropometria: AntropometriaData[], players: PlayerData[] }) => {
  const [tableType, setTableType] = useState<'imtp' | 'speed' | 'vo2max' | 'antropometria'>('imtp');
  const [searchTerm, setSearchTerm] = useState('');

  const playerMap = useMemo(() => {
    const map: Record<number, PlayerData> = {};
    players.forEach(p => { map[p.player_id] = p; });
    return map;
  }, [players]);

  const filteredData = useMemo(() => {
    let data: any[] = [];
    if (tableType === 'imtp') data = imtp;
    else if (tableType === 'speed') data = speed;
    else if (tableType === 'vo2max') data = vo2max;
    else if (tableType === 'antropometria') data = antropometria;

    // Solo conservar registros cuyos jugadores estén presentes en la lista de jugadores actual (según el ámbito seleccionado)
    const validData = data.filter(d => !!playerMap[d.player_id]);

    if (!searchTerm) return validData;

    return validData.filter(d => {
      const player = playerMap[d.player_id];
      const name = player ? `${player.nombre} ${player.apellido1}`.toLowerCase() : '';
      return name.includes(searchTerm.toLowerCase());
    });
  }, [tableType, imtp, speed, vo2max, antropometria, searchTerm, playerMap]);

  const columns = useMemo(() => {
    if (tableType === 'imtp') {
      return [
        { label: 'Fecha', key: 'fecha_test' },
        { label: 'Peso', key: 'peso' },
        { label: 'IMTP Fuerza (N)', key: 'imtp_fuerza_n' },
        { label: 'IMTP F. Relativa', key: 'imtp_f_relativa_n_kg' },
        { label: 'IMTP Asimetría', key: 'imtp_asimetria' },
        { label: 'IMTP Débil', key: 'imtp_debil' },
        { label: 'Fuerza CMJ', key: 'fuerza_cmj' },
        { label: 'CMJ RSI Mod', key: 'cmj_rsi_mod' },
        { label: 'CMJ Altura (IM)', key: 'cmj_altura_salto_im' },
        { label: 'CMJ Salto (TV)', key: 'cmj_salto_tv' },
        { label: 'CMJ Peak Pot Rel', key: 'cmj_peak_pot_relativa' },
        { label: 'CMJ Asim Aterrizaje', key: 'cmj_asimetria_aterrizaje' },
        { label: 'Landing (N)', key: 'landing_n' },
        { label: 'Landing Relativo', key: 'landing_relativo' },
        { label: 'CMJ Pierna Débil', key: 'cmj_pierna_debil' },
        { label: 'DSI Valor', key: 'dsi_valor' },
        { label: 'AVK Peak Pot Rel', key: 'avk_peak_pot_relativa' },
        { label: 'AVK Brazo TV', key: 'avk_indice_uso_brazos_tv' },
        { label: 'AVK X TV', key: 'avk_x_tv' },
        { label: 'AVK X IM', key: 'avk_x_im' },
        { label: 'AVK Brazo IM', key: 'avk_indice_uso_brazos_im' },
        { label: 'SLCMJ Izq (IM)', key: 'slcmj_izq_altura_im' },
        { label: 'SLCMJ Izq (TV)', key: 'slcmj_izq_altura_tv' },
        { label: 'SLCMJ Der (IM)', key: 'slcmj_der_altura_im' },
        { label: 'SLCMJ Der (TV)', key: 'slcmj_der_altura_tv' },
        { label: 'SLCMJ Dif % (IM)', key: 'slcmj_diferencia_pct_im' },
        { label: 'SLCMJ Dif % (TV)', key: 'slcmj_diferencia_pct_tv' },
        { label: 'Déficit Bilateral', key: 'deficit_bilateral' },
        { label: 'Altura x RSI Mod', key: 'altura_x_rsi_mod' },
        { label: 'Observaciones', key: 'observaciones' },
      ];
    } else if (tableType === 'speed') {
      return [
        { label: 'Fecha', key: 'fecha' },
        { label: 'Tiempo 10m', key: 'tiempo_10m' },
        { label: 'Vel 10m', key: 'vel_10m' },
        { label: 'Tiempo 10-20m', key: 'tiempo_10_20m' },
        { label: 'Vel 10-20m', key: 'vel_10_20m' },
        { label: 'Tiempo 20-30m', key: 'tiempo_20_30m' },
        { label: 'Vel 20-30m', key: 'vel_20_30m' },
        { label: 'Tiempo Total', key: 'tiempo_total' },
        { label: 'Observaciones', key: 'observaciones' },
      ];
    } else if (tableType === 'vo2max') {
      return [
        { label: 'Fecha', key: 'fecha' },
        { label: 'VO2 Max', key: 'vo2_max' },
        { label: 'VMA', key: 'vam' },
        { label: 'FC Máx', key: 'fc_max' },
        { label: 'Nivel', key: 'nivel' },
        { label: 'Pasada', key: 'pasada' },
        { label: 'Distancia (m)', key: 'mts' },
        { label: 'VFA', key: 'vfa' },
        { label: 'VT1 Vel', key: 'vt1_vel' },
        { label: 'VT1 %', key: 'vt1_pct' },
        { label: 'VT1 FC', key: 'vt1_fc' },
        { label: 'VT2 Vel', key: 'vt2_vel' },
        { label: 'VT2 %', key: 'vt2_pct' },
        { label: 'VT2 FC', key: 'vt2_fc' },
        { label: 'Peso', key: 'peso' },
        { label: 'Observaciones', key: 'observaciones' },
      ];
    } else {
      return [
        { label: 'Fecha', key: 'fecha_medicion' },
        { label: 'Masa Corp (kg)', key: 'masa_corporal_kg' },
        { label: 'Talla (cm)', key: 'talla_cm' },
        { label: 'Talla Sentada', key: 'talla_sentada_cm' },
        { label: 'M. Adiposa %', key: 'masa_adiposa_pct' },
        { label: 'M. Muscular %', key: 'masa_muscular_pct' },
        { label: 'M. Osea %', key: 'masa_osea_pct' },
        { label: 'Índice IMO', key: 'indice_imo' },
        { label: 'Índice IMC', key: 'indice_imc' },
        { label: 'Suma 6 Pliegues', key: 'sum_pliegues_6_mm' },
        { label: 'Suma 8 Pliegues', key: 'sum_pliegues_8_mm' },
        { label: 'Somatotipo Endo', key: 'somatotipo_endo' },
        { label: 'Somatotipo Meso', key: 'somatotipo_meso' },
        { label: 'Somatotipo Ecto', key: 'somatotipo_ecto' },
        { label: 'Maduración Media', key: 'maduracion_media' },
        { label: 'PHV Media', key: 'phv_media' },
        { label: 'Estatura Proy (cm)', key: 'estatura_proy_media_cm' },
      ];
    }
  }, [tableType]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 flex flex-wrap items-center justify-between gap-6">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'imtp', label: 'Fuerza y Potencia & Saltos', icon: 'fa-bolt' },
            { id: 'speed', label: 'Velocidad', icon: 'fa-gauge-high' },
            { id: 'vo2max', label: 'Resistencia', icon: 'fa-wind' },
            { id: 'antropometria', label: 'Antropometría', icon: 'fa-ruler-combined' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTableType(t.id as any)}
              className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                tableType === t.id ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
              }`}
            >
              <i className={`fa-solid ${t.icon}`}></i>
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-md">
          <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
          <input
            type="text"
            placeholder="BUSCAR JUGADOR..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-6 py-3 bg-slate-50 border-none rounded-2xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-red-500 uppercase tracking-widest"
          />
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#0b1220] text-white font-black uppercase text-[10px] tracking-widest">
              <tr>
                <th className="px-6 py-5 sticky left-0 bg-[#0b1220] z-10">Jugador</th>
                {columns.map(col => (
                  <th key={col.key} className="px-4 py-5 whitespace-nowrap">{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredData.map((row, idx) => {
                const player = playerMap[row.player_id];
                return (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r border-slate-50">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-900 uppercase italic">
                          {player ? `${player.nombre} ${player.apellido1}` : 'DESCONOCIDO'}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
                          {player?.posicion || '-'} {player ? ` • AÑO: ${(player as any).anio || (player.fecha_nacimiento ? new Date(player.fecha_nacimiento).getFullYear() : '-')}` : ''}
                        </span>
                      </div>
                    </td>
                    {columns.map(col => {
                      const value = row[col.key];
                      let performanceStyle = null;
                      
                      if (tableType === 'imtp') {
                        if (col.key === 'imtp_fuerza_n') performanceStyle = getPerformanceColor(Number(value), 'fuerza_peak');
                        if (col.key === 'imtp_f_relativa_n_kg') performanceStyle = getPerformanceColor(Number(value), 'fuerza_relativa');
                        if (col.key === 'cmj_altura_salto_im') performanceStyle = getPerformanceColor(Number(value), 'altura_salto');
                        if (col.key === 'cmj_rsi_mod') performanceStyle = getPerformanceColor(Number(value), 'rsi_mod');
                      }

                      return (
                        <td key={col.key} className="px-4 py-4 text-[11px] font-bold text-slate-600 whitespace-nowrap">
                          {performanceStyle ? (
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded-md min-w-[45px] text-center text-[9px] font-black uppercase tracking-tighter ${performanceStyle.bg} ${performanceStyle.text}`}>
                                {value !== undefined && value !== null && !isNaN(Number(value)) ? value : '-'}
                              </span>
                              <span className="text-[8px] font-black text-slate-300 uppercase tracking-tighter w-6">{performanceStyle.label}</span>
                            </div>
                          ) : (
                            row[col.key] !== undefined && row[col.key] !== null && !isNaN(Number(row[col.key])) ? row[col.key] : '-'
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredData.length === 0 && (
          <div className="p-20 text-center">
            <i className="fa-solid fa-folder-open text-4xl text-slate-100 mb-4"></i>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">No se encontraron registros</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- TOP TEN DASHBOARD ---

const TOP_TEN_METRIC_OPTIONS = [
  { label: 'IMTP Máximo (N)', key: 'imtp_fuerza_n', unit: 'N', icon: 'fa-dumbbell', colorClass: 'text-orange-500 bg-orange-50 stroke-orange-500 border-orange-100' },
  { label: 'IMTP Relativo (N/kg)', key: 'imtp_f_relativa_n_kg', unit: 'N/kg', icon: 'fa-bolt', colorClass: 'text-red-500 bg-red-50 stroke-red-500 border-red-100' },
  { label: 'CMJ RSI Mod', key: 'cmj_rsi_mod', unit: 'Index', icon: 'fa-compress', colorClass: 'text-indigo-500 bg-indigo-50 stroke-indigo-500 border-indigo-100' },
  { label: 'Test de Velocidad (s)', key: 'tiempo_total', unit: 's', icon: 'fa-gauge-high', colorClass: 'text-blue-500 bg-blue-50 stroke-blue-500 border-blue-100' },
  { label: 'Consumo de Oxígeno (VO2)', key: 'vo2_max', unit: 'ml/kg/min', icon: 'fa-wind', colorClass: 'text-purple-500 bg-purple-50 stroke-purple-500 border-purple-100' },
];

interface TopTenDashboardProps {
  players: PlayerData[];
  imtpData: IMTPData[];
  speedData: SpeedTestData[];
  vo2maxData: VO2MaxData[];
  selectedAnios: number[];
  selectedPosiciones: string[];
  selectedClubId: number | null;
  clubs: any[];
  userRole?: string;
  clubFilterMode: 'all' | 'club';
  userClub?: string;
  userClubId?: number | null;
  box1Metric: string;
  setBox1Metric: (val: string) => void;
  box2Metric: string;
  setBox2Metric: (val: string) => void;
  box3Metric: string;
  setBox3Metric: (val: string) => void;
  box4Metric: string;
  setBox4Metric: (val: string) => void;
  onSelectPlayer: (id: number) => void;
}

const TopTenDashboard: React.FC<TopTenDashboardProps> = ({
  players,
  imtpData,
  speedData,
  vo2maxData,
  selectedAnios,
  selectedPosiciones,
  selectedClubId,
  clubs,
  userRole,
  clubFilterMode,
  userClub,
  userClubId,
  box1Metric,
  setBox1Metric,
  box2Metric,
  setBox2Metric,
  box3Metric,
  setBox3Metric,
  box4Metric,
  setBox4Metric,
  onSelectPlayer
}) => {

  const getRankData = (metricKey: string) => {
    const filtered = players.filter(p => {
      const pYear = (p as any).anio ? Number((p as any).anio) : new Date(p.fecha_nacimiento).getFullYear();
      const yearMatch = selectedAnios.length === 0 || selectedAnios.includes(pYear);
      const posMatch = selectedPosiciones.length === 0 || selectedPosiciones.includes(p.posicion);
      const clubMatch = selectedClubId === null || Number(p.id_club) === Number(selectedClubId);
      
      if (userRole === 'club' && clubFilterMode === 'club') {
        if (userClubId) {
          return yearMatch && posMatch && clubMatch && p.id_club === userClubId;
        } else if (userClub) {
          const uClubNorm = normalizeClub(userClub);
          const pClub = p.club || p.club_name || '';
          return yearMatch && posMatch && clubMatch && pClub && normalizeClub(pClub) === uClubNorm;
        }
      }
      return yearMatch && posMatch && clubMatch;
    });

    const list: { player: PlayerData; value: number }[] = [];

    filtered.forEach(p => {
      let val: number | null = null;
      if (metricKey === 'imtp_fuerza_n' || metricKey === 'imtp_f_relativa_n_kg' || metricKey === 'cmj_rsi_mod') {
        const rows = imtpData.filter(d => d.player_id === p.player_id);
        if (rows.length > 0) {
          const vals = rows.map(r => Number(r[metricKey as keyof IMTPData])).filter(v => !isNaN(v) && v > 0);
          if (vals.length > 0) {
            val = Math.max(...vals);
          }
        }
      } else if (metricKey === 'tiempo_total') {
        const rows = speedData.filter(d => d.player_id === p.player_id);
        if (rows.length > 0) {
          const vals = rows.map(r => Number(r.tiempo_total)).filter(v => !isNaN(v) && v > 0);
          if (vals.length > 0) {
            val = Math.min(...vals);
          }
        }
      } else if (metricKey === 'vo2_max') {
        const rows = vo2maxData.filter(d => d.player_id === p.player_id);
        if (rows.length > 0) {
          const vals = rows.map(r => Number(r.vo2_max)).filter(v => !isNaN(v) && v > 0);
          if (vals.length > 0) {
            val = Math.max(...vals);
          }
        }
      }

      if (val !== null && val !== -Infinity && val !== Infinity) {
        list.push({ player: p, value: val });
      }
    });

    if (metricKey === 'tiempo_total') {
      list.sort((a, b) => a.value - b.value);
    } else {
      list.sort((a, b) => b.value - a.value);
    }

    return list.slice(0, 10);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-[#0b1220] rounded-[32px] p-6 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black italic tracking-tight uppercase flex items-center gap-2">
            <i className="fa-solid fa-trophy text-amber-500"></i> RANKING DE RENDIMIENTO <span className="text-red-500">TOP 10</span>
          </h2>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mt-1">
            Visualización comparativa de mejores marcas acumuladas según los filtros seleccionados.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-300">
          <div className="bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
            <span className="text-slate-400 font-bold">Fórmula de Ranking:</span>
            <span>Récord Histórico Personal</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <TopTenBox
          title="Fuerza Máxima (IMTP)"
          boxNum={1}
          metricKey={box1Metric}
          setMetricKey={setBox1Metric}
          data={getRankData(box1Metric)}
          clubs={clubs}
          onSelectPlayer={onSelectPlayer}
        />
        <TopTenBox
          title="Fuerza Relativa (IMTP)"
          boxNum={2}
          metricKey={box2Metric}
          setMetricKey={setBox2Metric}
          data={getRankData(box2Metric)}
          clubs={clubs}
          onSelectPlayer={onSelectPlayer}
        />
        <TopTenBox
          title="Velocidad (10m / Total)"
          boxNum={3}
          metricKey={box3Metric}
          setMetricKey={setBox3Metric}
          data={getRankData(box3Metric)}
          clubs={clubs}
          onSelectPlayer={onSelectPlayer}
          lowerIsBetter={box3Metric === 'tiempo_total'}
        />
        <TopTenBox
          title="Consumo de Oxígeno o RSI"
          boxNum={4}
          metricKey={box4Metric}
          setMetricKey={setBox4Metric}
          data={getRankData(box4Metric)}
          clubs={clubs}
          onSelectPlayer={onSelectPlayer}
        />
      </div>
    </div>
  );
};

interface TopTenBoxProps {
  title: string;
  boxNum: number;
  metricKey: string;
  setMetricKey: (key: string) => void;
  data: { player: PlayerData; value: number }[];
  clubs: any[];
  onSelectPlayer: (id: number) => void;
  lowerIsBetter?: boolean;
}

const TopTenBox: React.FC<TopTenBoxProps> = ({
  title,
  boxNum,
  metricKey,
  setMetricKey,
  data,
  clubs,
  onSelectPlayer,
  lowerIsBetter = false
}) => {
  const currentMetric = TOP_TEN_METRIC_OPTIONS.find(o => o.key === metricKey) || TOP_TEN_METRIC_OPTIONS[0];

  return (
    <div className="bg-white rounded-[32px] p-5 border border-slate-100 shadow-sm hover:border-slate-200 transition-all duration-300 flex flex-col justify-between h-[600px]">
      <div>
        <div className="flex justify-between items-start gap-2 mb-4">
          <div>
            <span className="text-[9px] font-black uppercase text-red-600 tracking-wider">Caja #{boxNum}</span>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight leading-none mt-0.5 whitespace-nowrap overflow-ellipsis">
              {currentMetric.label.split(' (')[0]}
            </h3>
          </div>
          <div className="relative">
            <select
              value={metricKey}
              onChange={(e) => setMetricKey(e.target.value)}
              className="bg-slate-50 border-none rounded-xl px-2 py-1 text-[9px] font-black text-slate-600 uppercase tracking-tight outline-none focus:ring-1 focus:ring-red-500 max-w-[110px]"
            >
              {TOP_TEN_METRIC_OPTIONS.map(opt => (
                <option key={opt.key} value={opt.key}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-100/60 mb-3">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${currentMetric.colorClass}`}>
            <i className={`fa-solid ${currentMetric.icon} text-[11px]`}></i>
          </div>
          <div className="min-w-0">
            <p className="text-[7px] font-black uppercase text-slate-400 leading-none">Unidad</p>
            <p className="text-[10px] font-black text-slate-700 leading-tight mt-0.5 truncate">
              {currentMetric.unit ? currentMetric.unit : 'Índice'} {lowerIsBetter && <span className="text-[8px] font-bold text-blue-500 italic lowercase tracking-normal">(menor tiempo es mejor)</span>}
            </p>
          </div>
        </div>

        <div className="space-y-1.5 mt-2 overflow-y-auto max-h-[440px] pr-1">
          {data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-slate-50/50 rounded-2xl border border-slate-50 border-dashed">
              <i className="fa-solid fa-ranking-star text-slate-200 text-2xl mb-2"></i>
              <p className="text-slate-400 text-[9px] font-black uppercase tracking-wider">Sin atletas evaluados</p>
            </div>
          ) : (
            data.map((item, index) => {
              const rank = index + 1;
              const isFirst = rank === 1;
              const isSecond = rank === 2;
              const isThird = rank === 3;

              let badgeStyle = "bg-slate-100 text-slate-500 border border-slate-200/80";
              if (isFirst) badgeStyle = "bg-amber-100 text-amber-700 border-amber-205 shadow-xs shadow-amber-200/50";
              if (isSecond) badgeStyle = "bg-slate-200 text-slate-700 border-slate-300";
              if (isThird) badgeStyle = "bg-amber-50 text-amber-800 border-amber-150";

              return (
                <div
                  key={item.player.player_id}
                  onClick={() => onSelectPlayer(item.player.player_id)}
                  className="flex items-center justify-between p-2 rounded-2xl bg-white hover:bg-slate-50/80 border border-slate-50 hover:border-slate-150 transition-all duration-300 cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-5.5 h-5.5 rounded-lg ${badgeStyle} flex items-center justify-center shrink-0 font-black text-[9px]`}>
                      {rank}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-slate-800 uppercase italic truncate group-hover:text-red-600 transition-colors">
                        {item.player.nombre} {item.player.apellido1}
                      </p>
                       <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[7px] font-bold uppercase tracking-tight text-slate-400 bg-slate-50 px-1 py-0.2 rounded">
                          {item.player.posicion}
                        </span>
                        <span className="text-[7px] font-bold uppercase tracking-tight text-slate-400 bg-slate-50 px-1 py-0.2 rounded">
                          AÑO: {(item.player as any).anio || (item.player.fecha_nacimiento ? new Date(item.player.fecha_nacimiento).getFullYear() : '-')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] font-black italic text-slate-900 leading-none">
                      {item.value.toFixed(item.value % 1 === 0 ? 0 : 2)}
                    </p>
                    <p className="text-[6px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">
                      {currentMetric.unit}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

const TabButton = ({ active, label, icon, onClick }: { active: boolean, label: string, icon: string, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-3 px-6 py-3 rounded-2xl transition-all ${
      active ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
    }`}
  >
    <i className={`fa-solid ${icon} text-sm`}></i>
    <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

export default SportsScienceArea;
