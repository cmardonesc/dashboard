
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { normalizeClub, sortClubsByChileFirst } from '../lib/utils';
import { getChartSummary, getAthleteFootprintSummary, askAthleteAiAssistant } from '../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';
import ClubBadge from './ClubBadge';
import Markdown from 'react-markdown';
import { ALL_METRIC_CONFIGS } from './FisicaResumenGrupal';
import { FichaOrientacionAtleta, FichaOrientacionGrupal } from './FichasOrientacion';
import { AthletePrescription } from './AthletePrescription';
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
  imtp_force_50ms?: number;
  imtp_rfd_100ms?: number;
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
  concentric_peak_force_n?: number;
  rsi_modified_m_s?: number;
  jump_height_impmom_cm?: number;
  peak_power_bm_w_kg?: number;
  peak_power_w?: number;
  observaciones?: string;
  countermovement_depth_cm?: number;
  concentric_duration_ms?: number;
  concentric_impulse_ns?: number;
  take_off_momentum_kg_m_s?: number;
}

interface CMJReboundData {
  id?: string;
  created_at?: string;
  player_id: number;
  jugador?: string;
  fecha_test: string;
  bw_kg?: number;
  reps?: number;
  rebound_rsi?: number;
  rebound_contact_time_ms?: number;
  rebound_flight_time_ms?: number;
  take_off_momentum_kg_m_s?: number;
  observaciones?: string;
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
  const [box2Metric, setBox2Metric] = useState<string>('concentric_peak_force_n');
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
  const [test505Data, setTest505Data] = useState<any[]>([]);
  const [cmjReboundData, setCmjReboundData] = useState<CMJReboundData[]>([]);
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
        let processedData = data;
        if (tableName === 'evaluaciones_imtp') {
          processedData = data.map((item: any) => {
            const newItem = { ...item };
            if (newItem['Peak Vertical Force [N]'] !== undefined && newItem['Peak Vertical Force [N]'] !== null) {
              newItem.imtp_fuerza_n = Number(newItem['Peak Vertical Force [N]']);
            } else if (newItem.imtp_fuerza_n !== undefined && newItem.imtp_fuerza_n !== null) {
              newItem['Peak Vertical Force [N]'] = newItem.imtp_fuerza_n;
            }
            if (newItem['Peak Vertical Force / BM [N/kg]'] !== undefined && newItem['Peak Vertical Force / BM [N/kg]'] !== null) {
              newItem.imtp_f_relativa_n_kg = Number(newItem['Peak Vertical Force / BM [N/kg]']);
            } else if (newItem.imtp_f_relativa_n_kg !== undefined && newItem.imtp_f_relativa_n_kg !== null) {
              newItem['Peak Vertical Force / BM [N/kg]'] = newItem.imtp_f_relativa_n_kg;
            }
            if (newItem['Force (Net of BW) at 50ms [N]'] !== undefined && newItem['Force (Net of BW) at 50ms [N]'] !== null) {
              newItem.imtp_force_50ms = Number(newItem['Force (Net of BW) at 50ms [N]']);
            } else if (newItem.imtp_force_50ms !== undefined && newItem.imtp_force_50ms !== null) {
              newItem['Force (Net of BW) at 50ms [N]'] = newItem.imtp_force_50ms;
            }
            if (newItem['RFD - 100ms [N/s]'] !== undefined && newItem['RFD - 100ms [N/s]'] !== null) {
              newItem.imtp_rfd_100ms = Number(newItem['RFD - 100ms [N/s]']);
            } else if (newItem.imtp_rfd_100ms !== undefined && newItem.imtp_rfd_100ms !== null) {
              newItem['RFD - 100ms [N/s]'] = newItem.imtp_rfd_100ms;
            }
            return newItem;
          });
        } else if (tableName === 'evaluaciones_cmj') {
          processedData = data.map((item: any) => {
            const newItem = { ...item };
            if (newItem.concentric_peak_force_n !== undefined && newItem.concentric_peak_force_n !== null) {
              newItem.fuerza_cmj = Number(newItem.concentric_peak_force_n);
            } else if (newItem.fuerza_cmj !== undefined && newItem.fuerza_cmj !== null) {
              newItem.concentric_peak_force_n = Number(newItem.fuerza_cmj);
            }
            if (newItem.rsi_modified_m_s !== undefined && newItem.rsi_modified_m_s !== null) {
              newItem.cmj_rsi_mod = Number(newItem.rsi_modified_m_s);
            } else if (newItem.cmj_rsi_mod !== undefined && newItem.cmj_rsi_mod !== null) {
              newItem.rsi_modified_m_s = Number(newItem.cmj_rsi_mod);
            }
            if (newItem.jump_height_impmom_cm !== undefined && newItem.jump_height_impmom_cm !== null) {
              newItem.cmj_altura_salto_im = Number(newItem.jump_height_impmom_cm);
            } else if (newItem.cmj_altura_salto_im !== undefined && newItem.cmj_altura_salto_im !== null) {
              newItem.jump_height_impmom_cm = Number(newItem.cmj_altura_salto_im);
            }
            if (newItem.peak_power_bm_w_kg !== undefined && newItem.peak_power_bm_w_kg !== null) {
              newItem.cmj_peak_pot_relativa = Number(newItem.peak_power_bm_w_kg);
            } else if (newItem.cmj_peak_pot_relativa !== undefined && newItem.cmj_peak_pot_relativa !== null) {
              newItem.peak_power_bm_w_kg = Number(newItem.cmj_peak_pot_relativa);
            }
            return newItem;
          });
        }
        allData = [...allData, ...processedData];
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
        mData,
        lData,
        t505Res,
        reboundRes
      ] = await Promise.all([
        fetchFullTable('players', 'player_id, nombre, apellido1, apellido2, anio, id_club, posicion'),
        fetchFullTable('evaluaciones_imtp'),
        fetchFullTable('evaluaciones_cmj'),
        fetchFullTable('velocidad_tests'),
        fetchFullTable('antropometria'),
        fetchFullTable('vo2max_tests'),
        fetchFullTable('lesionados'),
        fetchFullTable('medical_daily_reports'),
        fetchFullTable('internal_load'),
        fetchFullTable('test_505'),
        fetchFullTable('evaluaciones_cmj_rebound')
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
      if (mData) setMedicalReports(mData);
      if (lData) setInternalLoads(lData);
      if (t505Res) setTest505Data(t505Res);
      if (reboundRes) setCmjReboundData(reboundRes);
    } catch (err) {
      console.error("Error fetching sports science data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Load GPS data for the selected player dynamically on-demand
  useEffect(() => {
    if (!selectedPlayerId) {
      setGpsData([]);
      return;
    }

    const fetchGpsForPlayer = async () => {
      try {
        const { data, error } = await supabase
          .from('gps_import')
          .select('*')
          .eq('player_id', selectedPlayerId)
          .order('fecha', { ascending: false });

        if (error) {
          console.error(`Error fetching from gps_import for player ${selectedPlayerId}:`, error);
          return;
        }

        setGpsData(data || []);
      } catch (err) {
        console.error("Error fetching gps_import for player:", err);
      }
    };

    fetchGpsForPlayer();
  }, [selectedPlayerId]);

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

  const selectablePlayers = useMemo(() => {
    let basePlayers = filteredByClubScopePlayers;
    
    if (userRole === 'club' && (activeTab === 'huella' || activeTab === 'individual')) {
      basePlayers = anonymizedPlayers.filter(p => {
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

    return basePlayers.filter(p => {
      const pYear = (p as any).anio ? Number((p as any).anio) : new Date(p.fecha_nacimiento).getFullYear();
      const yearMatch = selectedAnios.length === 0 || selectedAnios.includes(pYear);
      const posMatch = selectedPosiciones.length === 0 || selectedPosiciones.includes(p.posicion);
      return yearMatch && posMatch;
    });
  }, [filteredByClubScopePlayers, anonymizedPlayers, userRole, activeTab, userClub, userClubId, selectedAnios, selectedPosiciones]);

  useEffect(() => {
    if (selectedPlayerId !== null && !selectablePlayers.some(p => p.player_id === selectedPlayerId)) {
      setSelectedPlayerId(null);
    }
  }, [selectedPlayerId, selectablePlayers]);

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
            <TabButton active={activeTab === 'categorias'} label="Categorías" icon="fa-layer-group" onClick={() => setActiveTab('categorias')} />
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
                {sortClubsByChileFirst(clubs).map(c => {
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
              {selectablePlayers
                .sort((a, b) => `${a.nombre} ${a.apellido1}`.localeCompare(`${b.nombre} ${b.apellido1}`))
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
            test505={test505Data.filter(d => d.player_id === selectedPlayerId)}
            medicalReports={medicalReports.filter(d => d.player_id === selectedPlayerId)}
            internalLoads={internalLoads.filter(d => d.player_id === selectedPlayerId)}
            gps={gpsData.filter(d => d.player_id === selectedPlayerId)}
            allImtp={imtpData}
            allSpeed={speedData}
            allAntro={antropometria}
            allVo2={vo2maxData}
            allTest505={test505Data}
            allPlayers={anonymizedPlayers}
            clubs={clubs}
            cmjRebound={cmjReboundData.filter(d => d.player_id === selectedPlayerId)}
            allCmjRebound={cmjReboundData}
          />
        )}
        {activeTab === 'individual' && (
          <IndividualDashboard 
            player={selectedPlayer} 
            imtp={imtpData.filter(d => d.player_id === selectedPlayerId)}
            speed={speedData.filter(d => d.player_id === selectedPlayerId)}
            antropometria={antropometria.filter(d => d.player_id === selectedPlayerId)}
            vo2max={vo2maxData.filter(d => d.player_id === selectedPlayerId)}
            test505={test505Data.filter(d => d.player_id === selectedPlayerId)}
            cmjRebound={cmjReboundData.filter(d => d.player_id === selectedPlayerId)}
            clubs={clubs}
            allPlayers={players}
            allImtp={imtpData}
            allSpeed={speedData}
            allVo2={vo2maxData}
            allTest505={test505Data}
            allCmjRebound={cmjReboundData}
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
            test505={test505Data}
            cmjRebound={cmjReboundData}
            selectedPlayerId={selectedPlayerId}
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
        {activeTab === 'categorias' && (
          <Categorias 
            players={anonymizedPlayers}
            imtp={imtpData}
            speed={speedData}
            vo2max={vo2maxData}
            antropometria={antropometria}
            selectedAnios={selectedAnios}
            selectedPosiciones={selectedPosiciones}
            cmjReboundData={cmjReboundData}
            test505Data={test505Data}
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
            test505={test505Data}
            cmjRebound={cmjReboundData}
            players={selectablePlayers} 
          />
        )}

        {activeTab === 'top10' && (
          <TopTenDashboard
            players={filteredByClubScopePlayers}
            imtpData={imtpData}
            speedData={speedData}
            vo2maxData={vo2maxData}
            cmjReboundData={cmjReboundData}
            test505Data={test505Data}
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
  // IMTP (Fuerza Máxima)
  { label: 'IMTP Fuerza (N)', key: 'imtp_fuerza_n', table: 'imtp' },
  { label: 'IMTP F. Relativa', key: 'imtp_f_relativa_n_kg', table: 'imtp' },
  { label: 'IMTP Fuerza 50ms (N)', key: 'imtp_force_50ms', table: 'imtp' },
  { label: 'IMTP Fuerza 100ms (N)', key: 'imtp_force_100ms', table: 'imtp' },
  { label: 'IMTP Fuerza 150ms (N)', key: 'imtp_force_150ms', table: 'imtp' },
  { label: 'IMTP Fuerza 200ms (N)', key: 'imtp_force_200ms', table: 'imtp' },
  { label: 'IMTP RFD 100ms (N/s)', key: 'imtp_rfd_100ms', table: 'imtp' },
  { label: 'IMTP RFD 150ms (N/s)', key: 'imtp_rfd_150ms', table: 'imtp' },
  { label: 'IMTP RFD 200ms (N/s)', key: 'imtp_rfd_200ms', table: 'imtp' },
  { label: 'IMTP Asimetría', key: 'imtp_asimetria', table: 'imtp' },
  { label: 'IMTP Débil', key: 'imtp_debil', table: 'imtp' },
  { label: 'Peso (IMTP)', key: 'peso', table: 'imtp' },

  // CMJ (Saltos)
  { label: 'Fuerza CMJ', key: 'fuerza_cmj', table: 'imtp' },
  { label: 'CMJ Fuerza Pico Conc (N)', key: 'concentric_peak_force_n', table: 'imtp' },
  { label: 'CMJ RSI Mod', key: 'cmj_rsi_mod', table: 'imtp' },
  { label: 'CMJ RSI Modificado', key: 'rsi_modified_m_s', table: 'imtp' },
  { label: 'CMJ Altura', key: 'cmj_altura_salto_im', table: 'imtp' },
  { label: 'CMJ Altura Salto (cm)', key: 'jump_height_impmom_cm', table: 'imtp' },
  { label: 'CMJ Peak Pot. Rel.', key: 'cmj_peak_pot_relativa', table: 'imtp' },
  { label: 'CMJ Pot. Pico Rel (W/kg)', key: 'peak_power_bm_w_kg', table: 'imtp' },
  { label: 'CMJ Pot. Pico Abs (W)', key: 'peak_power_w', table: 'imtp' },
  { label: 'CMJ Profundidad (cm)', key: 'countermovement_depth_cm', table: 'imtp' },
  { label: 'CMJ Duración Conc (ms)', key: 'concentric_duration_ms', table: 'imtp' },
  { label: 'CMJ Impulso Conc (Ns)', key: 'concentric_impulse_ns', table: 'imtp' },
  { label: 'CMJ Momento Despegue', key: 'take_off_momentum_kg_m_s', table: 'imtp' },
  { label: 'Peso (CMJ)', key: 'bw_kg', table: 'imtp' },

  // CMJ Rebound
  { label: 'CMJ Rebound RSI', key: 'rebound_rsi', table: 'rebound' },
  { label: 'T. Contacto Rebound (ms)', key: 'rebound_contact_time_ms', table: 'rebound' },
  { label: 'T. Vuelo Rebound (ms)', key: 'rebound_flight_time_ms', table: 'rebound' },
  { label: 'Peso Rebound (kg)', key: 'bw_kg', table: 'rebound' },
  { label: 'Reps Rebound', key: 'reps', table: 'rebound' },
  { label: 'Momento Despegue Rebound', key: 'take_off_momentum_kg_m_s', table: 'rebound' },

  // Agilidad (Test 505)
  { label: 'T. Acel 2m', key: 't_acel_2m', table: 'test505' },
  { label: 'Vel Acel (km/h)', key: 'vel_acel_kmh', table: 'test505' },
  { label: 'T. Desacel 2m', key: 't_desacel_2m', table: 'test505' },
  { label: 'Vel Desacel (km/h)', key: 'vel_desacel_kmh', table: 'test505' },
  { label: 'T. COD 2m', key: 't_cod_2m', table: 'test505' },
  { label: 'Vel COD (km/h)', key: 'vel_cod_kmh', table: 'test505' },
  { label: 'T. Reacel 1.2m', key: 't_reacel_1_2m', table: 'test505' },
  { label: 'Vel Reacel 1 (km/h)', key: 'vel_reacel_1_kmh', table: 'test505' },
  { label: 'T. Reacel 2.2m', key: 't_reacel_2_2m', table: 'test505' },
  { label: 'Vel Reacel 2 (km/h)', key: 'vel_reacel_2_kmh', table: 'test505' },
  { label: 'Z-Score Acel', key: 'z_score_acel', table: 'test505' },

  // Velocidad (Sprint)
  { label: 'Tiempo 10m', key: 'tiempo_10m', table: 'speed' },
  { label: 'Velocidad 10m', key: 'vel_10m', table: 'speed' },
  { label: 'Tiempo 10-20m', key: 'tiempo_10_20m', table: 'speed' },
  { label: 'Velocidad 10-20m', key: 'vel_10_20m', table: 'speed' },
  { label: 'Tiempo 20-30m', key: 'tiempo_20_30m', table: 'speed' },
  { label: 'Velocidad 20-30m', key: 'vel_20_30m', table: 'speed' },
  { label: 'Tiempo Total', key: 'tiempo_total', table: 'speed' },

  // VO2 Max
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

  // Antropometria
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
  outlier,
  referenceMax,
  personalMax,
  penultimateValue,
  swc,
  mdc
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
  referenceMax?: number;
  personalMax?: number;
  penultimateValue?: number;
  swc?: number;
  mdc?: number;
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

  const hasRefMax = referenceMax !== undefined && referenceMax > 0;
  const pctDiffMax = hasRefMax 
    ? (lowerIsBetter 
        ? ((referenceMax - safeVal) / referenceMax) * 100 
        : ((safeVal - referenceMax) / referenceMax) * 100
      )
    : 0;
  const isBetterThanMax = lowerIsBetter ? (safeVal < referenceMax) : (safeVal > referenceMax);
  const isEqualToMax = safeVal === referenceMax;

  const hasPersonalMax = personalMax !== undefined && personalMax > 0;
  const pctDiffPersonal = hasPersonalMax 
    ? (lowerIsBetter 
        ? ((personalMax - safeVal) / personalMax) * 100 
        : ((safeVal - personalMax) / personalMax) * 100
      )
    : 0;
  const isBetterThanPersonal = lowerIsBetter ? (safeVal < personalMax) : (safeVal > personalMax);
  const isEqualToPersonal = safeVal === personalMax;

  const hasPenultimate = penultimateValue !== undefined && penultimateValue > 0;
  let diffPrev = 0;
  let pctDiffPrev = 0;
  let isPrevBetter = false;
  let isPrevEqual = false;
  let displayPctPrev = 0;
  let changeClassification: 'mejora_real' | 'mejora_probable' | 'estable' | 'deterioro_probable' | 'deterioro_real' = 'estable';

  if (hasPenultimate && safeVal > 0) {
    const rawDiff = safeVal - penultimateValue;
    diffPrev = lowerIsBetter ? -rawDiff : rawDiff;
    isPrevBetter = diffPrev > 0;
    isPrevEqual = diffPrev === 0;
    displayPctPrev = lowerIsBetter 
      ? ((penultimateValue - safeVal) / penultimateValue) * 100 
      : ((safeVal - penultimateValue) / penultimateValue) * 100;

    const absDiff = Math.abs(rawDiff);
    const safeSwc = swc || 0;
    const safeMdc = mdc || 0;

    if (absDiff >= safeMdc) {
      changeClassification = isPrevBetter ? 'mejora_real' : 'deterioro_real';
    } else if (absDiff >= safeSwc) {
      changeClassification = isPrevBetter ? 'mejora_probable' : 'deterioro_probable';
    } else {
      changeClassification = 'estable';
    }
  }

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

      {hasRefMax && safeVal > 0 && (
        <div className="w-full flex justify-between items-center bg-white px-3 py-1 mt-1.5 rounded-xl border border-slate-100 z-10">
          <div className="text-left">
            <p className="text-[7px] font-black uppercase text-slate-400 tracking-wider">vs Récord Cat.</p>
            <p className={`text-[9px] font-black italic ${isEqualToMax ? 'text-amber-600' : (isBetterThanMax ? 'text-purple-600' : 'text-slate-500')}`}>
              {isEqualToMax ? '0.0%' : `${pctDiffMax > 0 ? '+' : ''}${pctDiffMax.toFixed(1)}%`}
            </p>
          </div>
          <div className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase border ${
            isEqualToMax 
              ? 'text-amber-600 bg-amber-50 border-amber-100 dark:border-amber-200/20' 
              : (isBetterThanMax 
                  ? 'text-purple-600 bg-purple-50 border-purple-100 dark:border-purple-200/20' 
                  : 'text-slate-500 bg-slate-50 border-slate-100')
          }`}>
            {isEqualToMax ? 'Récord Cat.' : (isBetterThanMax ? 'Supera Récord' : 'Del Récord')}
          </div>
        </div>
      )}

      {hasPersonalMax && safeVal > 0 && (
        <div className="w-full flex justify-between items-center bg-white px-3 py-1 mt-1.5 rounded-xl border border-slate-100 z-10">
          <div className="text-left">
            <p className="text-[7px] font-black uppercase text-slate-400 tracking-wider">vs Récord Atleta</p>
            <p className={`text-[9px] font-black italic ${isEqualToPersonal ? 'text-emerald-600 font-bold' : (isBetterThanPersonal ? 'text-purple-600' : 'text-slate-500')}`}>
              {isEqualToPersonal ? 'Récord Pers.' : `${pctDiffPersonal > 0 ? '+' : ''}${pctDiffPersonal.toFixed(1)}%`}
            </p>
          </div>
          <div className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase border ${
            isEqualToPersonal 
              ? 'text-emerald-600 bg-emerald-50 border-emerald-100 dark:border-emerald-200/20' 
              : (isBetterThanPersonal 
                  ? 'text-purple-600 bg-purple-50 border-purple-100 dark:border-purple-200/20' 
                  : 'text-slate-500 bg-slate-50 border-slate-100')
          }`}>
            {isEqualToPersonal ? 'Récord Atleta' : (isBetterThanPersonal ? 'Nuevo Récord' : 'Del Atleta')}
          </div>
        </div>
      )}

      {hasPenultimate && safeVal > 0 && (
        <div className="w-full flex flex-col gap-1.5 bg-white px-3 py-2 mt-1.5 rounded-xl border border-slate-100 z-10 text-left">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[7px] font-black uppercase text-slate-400 tracking-wider">vs Eval. Previa</p>
              <p className={`text-[9px] font-black italic ${isPrevEqual ? 'text-slate-500' : (isPrevBetter ? 'text-emerald-600' : 'text-red-500')}`}>
                {isPrevEqual ? 'Sin cambio' : `${displayPctPrev > 0 ? '+' : ''}${displayPctPrev.toFixed(1)}%`}
                <span className="text-[7px] text-slate-400 font-normal ml-1 lowercase">
                  (antes: {penultimateValue.toLocaleString('es-ES', { maximumFractionDigits: 1 })})
                </span>
              </p>
            </div>

            {changeClassification === 'mejora_real' && (
              <div className="px-2 py-0.5 rounded-full text-[7px] font-black uppercase bg-emerald-100 text-emerald-700 border border-emerald-200" title="Cambio mayor o igual al Cambio Mínimo Detectable (MDC). Indica una mejora real y no ruido de medición.">
                Mejora Real
              </div>
            )}
            {changeClassification === 'mejora_probable' && (
              <div className="px-2 py-0.5 rounded-full text-[7px] font-black uppercase bg-teal-50 text-teal-600 border border-teal-100" title="Cambio mayor o igual al Cambio Mínimo Rentable (SWC) pero menor que MDC.">
                Mejora Prob.
              </div>
            )}
            {changeClassification === 'estable' && (
              <div className="px-2 py-0.5 rounded-full text-[7px] font-black uppercase bg-slate-50 text-slate-400 border border-slate-100" title="El cambio está dentro del rango trivial de variación (menor al SWC). Es ruido.">
                Estable / Ruido
              </div>
            )}
            {changeClassification === 'deterioro_probable' && (
              <div className="px-2 py-0.5 rounded-full text-[7px] font-black uppercase bg-amber-50 text-amber-600 border border-amber-100" title="Disminución de rendimiento mayor al SWC pero menor al MDC.">
                Baja Prob.
              </div>
            )}
            {changeClassification === 'deterioro_real' && (
              <div className="px-2 py-0.5 rounded-full text-[7px] font-black uppercase bg-red-100 text-red-700 border border-red-200" title="Disminución de rendimiento mayor o igual al MDC. Indica un deterioro real.">
                Baja Real
              </div>
            )}
          </div>

          <div className="flex justify-between text-[6px] text-slate-400 font-bold uppercase tracking-wider pt-1.5 border-t border-slate-100/50">
            <span title="Smallest Worthwhile Change (Cambio Mínimo Rentable): 0.2 * SD del grupo">SWC: ±{(swc || 0).toLocaleString('es-ES', { maximumFractionDigits: 2 })} {unit}</span>
            <span title="Minimal Detectable Change (Cambio Mínimo Detectable): cambio real fuera de error con confianza del 95%">MDC: ±{(mdc || 0).toLocaleString('es-ES', { maximumFractionDigits: 2 })} {unit}</span>
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
  player, imtp, speed, antropometria, vo2max, test505 = [], medicalReports, internalLoads, gps,
  allImtp, allSpeed, allAntro, allVo2, allTest505 = [], allPlayers, clubs,
  cmjRebound = [], allCmjRebound = []
}: { 
  player?: PlayerData, 
  imtp: IMTPData[], 
  speed: SpeedTestData[], 
  antropometria: AntropometriaData[],
  vo2max: VO2MaxData[],
  test505?: any[],
  medicalReports: MedicalReport[],
  internalLoads: InternalLoadData[],
  gps: GPSData[],
  allImtp: IMTPData[],
  allSpeed: SpeedTestData[],
  allAntro: AntropometriaData[],
  allVo2: VO2MaxData[],
  allTest505?: any[],
  allPlayers: PlayerData[],
  clubs: any[],
  cmjRebound?: CMJReboundData[],
  allCmjRebound?: CMJReboundData[]
}) => {
  const [comparisonTarget, setComparisonTarget] = useState<'category' | '2010plus'>('category');
  const [excludeOutliers, setExcludeOutliers] = useState(false);

  // Dummy state & functions for the hidden AI block
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiTab, setAiTab] = useState<'perfil' | 'mejoras' | 'chat'>('perfil');
  const [goalStatuses, setGoalStatuses] = useState<Record<string, 'todo' | 'progress' | 'done'>>({});
  const [chatQuery, setChatQuery] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [chatSending, setChatSending] = useState(false);

  const [generalProfileFilter, setGeneralProfileFilter] = useState<string>('all');
  const [generalProfileSearch, setGeneralProfileSearch] = useState<string>('');
  const [generalProfileSort, setGeneralProfileSort] = useState<'percentile-desc' | 'percentile-asc' | 'area'>('percentile-desc');

  const generateAiSummary = async () => {};
  const handleConsultAssistant = async (customQuery?: string) => {};

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
    count += getCohortOutliersCount(allCmjRebound, 'rebound_rsi');
    count += getCohortOutliersCount(processedAllAntro, 'masa_muscular_pct');
    count += getCohortOutliersCount(processedAllAntro, 'masa_muscular_kg');
    count += getCohortOutliersCount(processedAllAntro, 'masa_adiposa_pct', true);
    count += getCohortOutliersCount(processedAllAntro, 'masa_adiposa_kg', true);
    count += getCohortOutliersCount(processedAllAntro, 'sum_pliegues_6_mm', true);
    count += getCohortOutliersCount(processedAllAntro, 'indice_imo');
    return count;
  }, [activeComparisonPlayerIds, allImtp, allSpeed, allVo2, allCmjRebound, processedAllAntro]);




  const latestImtp = player && imtp && imtp.length > 0 ? [...imtp].sort((a, b) => new Date(b.fecha_test).getTime() - new Date(a.fecha_test).getTime())[0] : undefined;
  const latestSpeed = player && speed && speed.length > 0 ? [...speed].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0] : undefined;
  const latestAntro = player ? getLatestCompositeAntro(processedAntro, player.player_id) : undefined;
  const latestVo2 = player && vo2max && vo2max.length > 0 ? [...vo2max].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0] : undefined;

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

  const latestCmjRebound = cmjRebound && cmjRebound.length > 0
    ? [...cmjRebound].sort((a, b) => new Date(b.fecha_test).getTime() - new Date(a.fecha_test).getTime())[0]
    : null;

  const bestReboundRsiVal = cmjRebound && cmjRebound.length > 0
    ? Math.max(...cmjRebound.map(d => Number(d.rebound_rsi)).filter(v => !isNaN(v) && v > 0))
    : 0;
  const bestReboundRsi = bestReboundRsiVal !== -Infinity && bestReboundRsiVal > 0 ? bestReboundRsiVal : 0;

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
  const avgReboundRsi = getAvg(allCmjRebound, 'rebound_rsi');

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

  const getCohortBest = (data: any[], key: string, lowerIsBetter: boolean = false) => {
    let targetPlayerIds = activeComparisonPlayerIds;
    let playerBestValues = targetPlayerIds.map(pId => {
      const pRows = data.filter(d => d.player_id === pId && d[key] != null && !isNaN(Number(d[key])));
      if (pRows.length === 0) return null;
      const numericVals = pRows.map(r => Number(r[key])).filter(v => v > 0);
      if (numericVals.length === 0) return null;
      return lowerIsBetter ? Math.min(...numericVals) : Math.max(...numericVals);
    }).filter((v): v is number => v !== null);

    // Fallback if not enough data
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

    if (playerBestValues.length === 0) return 0;

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

    if (playerBestValues.length === 0) return 0;
    return lowerIsBetter ? Math.min(...playerBestValues) : Math.max(...playerBestValues);
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

  const refMasaMuscularPct = getCohortBest(processedAllAntro, 'masa_muscular_pct');
  const refMasaMuscularKg = getCohortBest(processedAllAntro, 'masa_muscular_kg');
  const refMasaAdiposaPct = getCohortBest(processedAllAntro, 'masa_adiposa_pct', true);
  const refMasaAdiposaKg = getCohortBest(processedAllAntro, 'masa_adiposa_kg', true);
  const refSumPliegues6 = getCohortBest(processedAllAntro, 'sum_pliegues_6_mm', true);
  const refIndiceImo = getCohortBest(processedAllAntro, 'indice_imo');

  const bestAntroMasaMuscularPctVal = processedAntro && processedAntro.length > 0
    ? Math.max(...processedAntro.map(d => Number(d.masa_muscular_pct)).filter(v => !isNaN(v) && v > 0))
    : 0;
  const bestAntroMasaMuscularPct = bestAntroMasaMuscularPctVal !== -Infinity && bestAntroMasaMuscularPctVal > 0 ? bestAntroMasaMuscularPctVal : 0;

  const bestAntroMasaMuscularKgVal = processedAntro && processedAntro.length > 0
    ? Math.max(...processedAntro.map(d => Number(d.masa_muscular_kg)).filter(v => !isNaN(v) && v > 0))
    : 0;
  const bestAntroMasaMuscularKg = bestAntroMasaMuscularKgVal !== -Infinity && bestAntroMasaMuscularKgVal > 0 ? bestAntroMasaMuscularKgVal : 0;

  const bestAntroMasaAdiposaPctVal = processedAntro && processedAntro.length > 0
    ? Math.min(...processedAntro.map(d => Number(d.masa_adiposa_pct)).filter(v => !isNaN(v) && v > 0))
    : 0;
  const bestAntroMasaAdiposaPct = bestAntroMasaAdiposaPctVal !== Infinity && bestAntroMasaAdiposaPctVal > 0 ? bestAntroMasaAdiposaPctVal : 0;

  const bestAntroMasaAdiposaKgVal = processedAntro && processedAntro.length > 0
    ? Math.min(...processedAntro.map(d => Number(d.masa_adiposa_kg)).filter(v => !isNaN(v) && v > 0))
    : 0;
  const bestAntroMasaAdiposaKg = bestAntroMasaAdiposaKgVal !== Infinity && bestAntroMasaAdiposaKgVal > 0 ? bestAntroMasaAdiposaKgVal : 0;

  const bestAntroSumPliegues6Val = processedAntro && processedAntro.length > 0
    ? Math.min(...processedAntro.map(d => Number(d.sum_pliegues_6_mm)).filter(v => !isNaN(v) && v > 0))
    : 0;
  const bestAntroSumPliegues6 = bestAntroSumPliegues6Val !== Infinity && bestAntroSumPliegues6Val > 0 ? bestAntroSumPliegues6Val : 0;

  const bestAntroIndiceImoVal = processedAntro && processedAntro.length > 0
    ? Math.max(...processedAntro.map(d => Number(d.indice_imo)).filter(v => !isNaN(v) && v > 0))
    : 0;
  const bestAntroIndiceImo = bestAntroIndiceImoVal !== -Infinity && bestAntroIndiceImoVal > 0 ? bestAntroIndiceImoVal : 0;

  const calculateCohortSD = (list: any[], key: string): number => {
    if (!list || list.length === 0) return 0;
    const values = list
      .map(d => Number(d[key]))
      .filter(v => !isNaN(v) && v > 0);
    if (values.length <= 1) return 0;
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1);
    return Math.sqrt(variance);
  };

  const getGaugeData = (
    metricKey: string,
    dataList: any[],
    lowerIsBetter: boolean = false,
    title: string,
    unit: string,
    color: string,
    fillColor: string,
    fallbackMax: number = 100
  ) => {
    const playerRows = (dataList || [])
      .filter(d => Number(d.player_id) === Number(player?.player_id) && d[metricKey] != null && d[metricKey] !== '' && !isNaN(Number(d[metricKey])));
    
    const sortedPlayerRows = [...playerRows].sort((a, b) => {
      const dateA = a.fecha_test ? new Date(a.fecha_test).getTime() : (a.fecha ? new Date(a.fecha).getTime() : 0);
      const dateB = b.fecha_test ? new Date(b.fecha_test).getTime() : (b.fecha ? new Date(b.fecha).getTime() : 0);
      return dateB - dateA;
    });

    const latestValue = sortedPlayerRows.length > 0 ? Number(sortedPlayerRows[0][metricKey]) : 0;
    const penultimateValue = sortedPlayerRows.length >= 2 ? Number(sortedPlayerRows[1][metricKey]) : undefined;
    
    let bestValue = 0;
    if (playerRows.length > 0) {
      const numericVals = playerRows.map(d => Number(d[metricKey]));
      bestValue = lowerIsBetter ? Math.min(...numericVals) : Math.max(...numericVals);
    }
    
    const average = getAvg(dataList, metricKey);
    const globalMax = getGlobalMax(dataList, metricKey);
    const maxValue = Math.max(latestValue, bestValue, average, globalMax, fallbackMax) * 1.1;
    
    const percentile = calculatePercentile(latestValue, dataList, metricKey, lowerIsBetter);
    const outlier = checkOutlier(latestValue, dataList, metricKey, lowerIsBetter);
    const cohortBest = getCohortBest(dataList, metricKey, lowerIsBetter);

    const cohortSd = calculateCohortSD(dataList, metricKey);
    let swc = cohortSd * 0.2;
    let mdc = cohortSd * 0.88; // standard formula representing 1.96 * sqrt(2) * SEM with ICC assumed around 0.90
    
    // Safety fallback for extremely low/zero SD
    if (cohortSd === 0 && penultimateValue !== undefined && penultimateValue > 0) {
      swc = penultimateValue * 0.02; // 2% fallback
      mdc = penultimateValue * 0.05; // 5% fallback
    }
    
    return {
      value: latestValue,
      average,
      maxValue,
      title,
      unit,
      color,
      fillColor,
      lowerIsBetter,
      percentile,
      outlier: outlier as 'high' | 'low' | undefined,
      referenceMax: cohortBest,
      personalMax: bestValue,
      penultimateValue,
      swc,
      mdc
    };
  };

  const evaluatedMetrics = useMemo(() => {
    if (!player) return [];
    const list: {
      title: string;
      value: number;
      unit: string;
      percentile: number;
      level: 'Elite' | 'Sobresaliente' | 'Promedio' | 'Bajo Promedio' | 'Por Mejorar';
      area: string;
    }[] = [];

    const getPercentileLevel = (pct: number) => {
      if (pct >= 90) return 'Elite';
      if (pct >= 75) return 'Sobresaliente';
      if (pct >= 45) return 'Promedio';
      if (pct >= 20) return 'Bajo Promedio';
      return 'Por Mejorar';
    };

    const addStandardMetric = (metricKey: string, dataList: any[], lowerIsBetter: boolean, title: string, unit: string, area: string) => {
      const playerRows = (dataList || [])
        .filter(d => Number(d.player_id) === Number(player?.player_id) && d[metricKey] != null && d[metricKey] !== '' && !isNaN(Number(d[metricKey])));
      
      if (playerRows.length === 0) return;

      const sortedPlayerRows = [...playerRows].sort((a, b) => {
        const dateA = a.fecha_test ? new Date(a.fecha_test).getTime() : (a.fecha ? new Date(a.fecha).getTime() : 0);
        const dateB = b.fecha_test ? new Date(b.fecha_test).getTime() : (b.fecha ? new Date(b.fecha).getTime() : 0);
        return dateB - dateA;
      });

      const latestValue = Number(sortedPlayerRows[0][metricKey]);
      if (latestValue <= 0 || isNaN(latestValue)) return;

      const percentile = calculatePercentile(latestValue, dataList, metricKey, lowerIsBetter);
      const level = getPercentileLevel(percentile);

      list.push({
        title,
        value: latestValue,
        unit,
        percentile,
        level,
        area
      });
    };

    // Fuerza Máxima
    addStandardMetric('imtp_fuerza_n', allImtp, false, 'IMTP Fuerza Máxima', 'N', 'Fuerza Máxima');
    addStandardMetric('imtp_f_relativa_n_kg', allImtp, false, 'IMTP F. Relativa', 'N/kg', 'Fuerza Máxima');
    addStandardMetric('imtp_force_50ms', allImtp, false, 'Fuerza Net a 50ms', 'N', 'Fuerza Máxima');
    addStandardMetric('imtp_rfd_100ms', allImtp, false, 'RFD a 100ms', 'N/s', 'Fuerza Máxima');

    // Potencia y Saltabilidad
    addStandardMetric('concentric_peak_force_n', allImtp, false, 'Fuerza Pico Conc.', 'N', 'Potencia y Saltabilidad');
    addStandardMetric('rsi_modified_m_s', allImtp, false, 'CMJ RSI Modificado', 'm/s', 'Potencia y Saltabilidad');
    addStandardMetric('jump_height_impmom_cm', allImtp, false, 'Altura Salto (Imp-Mom)', 'cm', 'Potencia y Saltabilidad');
    addStandardMetric('peak_power_bm_w_kg', allImtp, false, 'Pot. Pico Relativa', 'W/kg', 'Potencia y Saltabilidad');
    addStandardMetric('peak_power_w', allImtp, false, 'Pot. Pico Absoluta', 'W', 'Potencia y Saltabilidad');

    // Reactividad y Rebote
    addStandardMetric('rebound_rsi', allCmjRebound, false, 'Rebound RSI', '', 'Reactividad y Rebote');
    addStandardMetric('rebound_contact_time_ms', allCmjRebound, true, 'Tiempo Contacto', 'ms', 'Reactividad y Rebote');
    addStandardMetric('rebound_flight_time_ms', allCmjRebound, false, 'Tiempo Vuelo', 'ms', 'Reactividad y Rebote');
    addStandardMetric('take_off_momentum_kg_m_s', allCmjRebound, false, 'Momentum Despegue', 'kg·m/s', 'Reactividad y Rebote');
    addStandardMetric('reps', allCmjRebound, false, 'Repeticiones', 'reps', 'Reactividad y Rebote');

    // Sprint y Aceleración
    addStandardMetric('tiempo_10m', allSpeed, true, 'Tiempo 10m', 's', 'Sprint y Aceleración');
    addStandardMetric('vel_10m', allSpeed, false, 'Velocidad 10m', 'm/s', 'Sprint y Aceleración');
    addStandardMetric('tiempo_10_20m', allSpeed, true, 'Tiempo 10-20m', 's', 'Sprint y Aceleración');
    addStandardMetric('tiempo_20_30m', allSpeed, true, 'Tiempo 20-30m', 's', 'Sprint y Aceleración');
    addStandardMetric('tiempo_total', allSpeed, true, 'Tiempo Total', 's', 'Sprint y Aceleración');

    // Consumo de Oxígeno
    addStandardMetric('vo2_max', allVo2, false, 'Consumo de Oxígeno', 'ml/kg/min', 'Consumo de Oxígeno');
    addStandardMetric('vam', allVo2, false, 'VMA', 'km/h', 'Consumo de Oxígeno');
    addStandardMetric('vt1_vel', allVo2, false, 'VT1 Vel', 'km/h', 'Consumo de Oxígeno');
    addStandardMetric('mts', allVo2, false, 'Distancia', 'm', 'Consumo de Oxígeno');
    addStandardMetric('vt2_vel', allVo2, false, 'VT2 Vel', 'km/h', 'Consumo de Oxígeno');

    // Cambio de Dirección
    addStandardMetric('t_acel_2m', allTest505, true, '505 T. Acel 2m', 's', 'Cambio de Dirección');
    addStandardMetric('t_desacel_2m', allTest505, true, '505 T. Desacel 2m', 's', 'Cambio de Dirección');
    addStandardMetric('t_cod_2m', allTest505, true, '505 T. COD 2m', 's', 'Cambio de Dirección');
    addStandardMetric('t_reacel_1_2m', allTest505, true, '505 T. Reacel 1 2m', 's', 'Cambio de Dirección');
    addStandardMetric('z_score_acel', allTest505, false, '505 Z-Score Acel', '', 'Cambio de Dirección');

    // Antropometría
    const addAntroMetric = (val: number, pct: number, title: string, unit: string) => {
      if (val <= 0 || isNaN(val)) return;
      list.push({
        title,
        value: val,
        unit,
        percentile: pct,
        level: getPercentileLevel(pct),
        area: 'Antropometría'
      });
    };

    addAntroMetric(valMasaMuscularPct, pctMasaMuscularPct, '% Masa Muscular', '%');
    addAntroMetric(valMasaMuscularKg, pctMasaMuscularKg, 'Kg Masa Muscular', 'kg');
    addAntroMetric(valMasaAdiposaPct, pctMasaAdiposaPct, '% Masa Grasa', '%');
    addAntroMetric(valMasaAdiposaKg, pctMasaAdiposaKg, 'Kg Masa Grasa', 'kg');
    addAntroMetric(valSumPliegues6, pctSumPliegues6, '6 Pliegues', 'mm');
    addAntroMetric(valIndiceImo, pctIndiceImo, 'Índice IMO', '');

    return list;
  }, [
    player,
    allImtp,
    allCmjRebound,
    allSpeed,
    allVo2,
    allTest505,
    valMasaMuscularPct, pctMasaMuscularPct,
    valMasaMuscularKg, pctMasaMuscularKg,
    valMasaAdiposaPct, pctMasaAdiposaPct,
    valMasaAdiposaKg, pctMasaAdiposaKg,
    valSumPliegues6, pctSumPliegues6,
    valIndiceImo, pctIndiceImo
  ]);

  const levelSummary = useMemo(() => {
    const counts = {
      Elite: 0,
      Sobresaliente: 0,
      Promedio: 0,
      'Bajo Promedio': 0,
      'Por Mejorar': 0,
    };
    evaluatedMetrics.forEach(m => {
      if (counts[m.level] !== undefined) {
        counts[m.level]++;
      }
    });
    return counts;
  }, [evaluatedMetrics]);

  const processedProfileMetrics = useMemo(() => {
    let result = [...evaluatedMetrics];

    // Filter by search query
    if (generalProfileSearch.trim()) {
      const q = generalProfileSearch.toLowerCase();
      result = result.filter(m => 
        m.title.toLowerCase().includes(q) || 
        m.area.toLowerCase().includes(q)
      );
    }

    // Filter by Level
    if (generalProfileFilter !== 'all') {
      if (generalProfileFilter === 'top') {
        result = result.filter(m => m.level === 'Elite' || m.level === 'Sobresaliente');
      } else if (generalProfileFilter === 'mid') {
        result = result.filter(m => m.level === 'Promedio');
      } else if (generalProfileFilter === 'low') {
        result = result.filter(m => m.level === 'Bajo Promedio' || m.level === 'Por Mejorar');
      } else {
        result = result.filter(m => m.level === generalProfileFilter);
      }
    }

    // Sort
    if (generalProfileSort === 'percentile-desc') {
      result.sort((a, b) => b.percentile - a.percentile);
    } else if (generalProfileSort === 'percentile-asc') {
      result.sort((a, b) => a.percentile - b.percentile);
    } else if (generalProfileSort === 'area') {
      result.sort((a, b) => a.area.localeCompare(b.area) || b.percentile - a.percentile);
    }

    return result;
  }, [evaluatedMetrics, generalProfileSearch, generalProfileFilter, generalProfileSort]);

  if (!player) return (
    <div className="bg-white rounded-[40px] p-20 text-center border border-dashed border-slate-200">
      <i className="fa-solid fa-user-magnifying-glass text-4xl text-slate-200 mb-4"></i>
      <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Selecciona un atleta para visualizar su huella digital</p>
    </div>
  );

  const getTScore = (
    playerValue: number,
    data: any[],
    key: string,
    lowerIsBetter: boolean = false
  ) => {
    if (isNaN(playerValue) || playerValue <= 0) return 50;

    let targetPlayerIds = activeComparisonPlayerIds;
    let values = data
      .filter(d => targetPlayerIds.includes(d.player_id) && d[key] != null && !isNaN(Number(d[key])))
      .map(d => Number(d[key]));

    if (values.length <= 1) {
      values = data
        .filter(d => d[key] != null && !isNaN(Number(d[key])))
        .map(d => Number(d[key]));
    }

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

    if (values.length === 0) return 50;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const sd = Math.sqrt(variance);

    if (sd === 0) return 50;

    let z = (playerValue - mean) / sd;
    if (lowerIsBetter) {
      z = (mean - playerValue) / sd;
    }

    const t = 50 + 10 * z;
    return Math.min(95, Math.max(5, t)); // Clip to standard [5, 95] to prevent overflow and keep standard aesthetic
  };

  const valPotencia = (bestImtpFuerza > 0) ? bestImtpFuerza : ((latestImtp?.imtp_fuerza_n != null && !isNaN(Number(latestImtp.imtp_fuerza_n))) ? Number(latestImtp.imtp_fuerza_n) : 0);
  const valVelocidad = (bestSpeed > 0) ? bestSpeed : ((latestSpeed?.vel_10m != null && !isNaN(Number(latestSpeed.vel_10m))) ? Number(latestSpeed.vel_10m) : 0);
  const valResistencia = (bestVo2 > 0) ? bestVo2 : ((latestVo2?.vo2_max != null && !isNaN(Number(latestVo2.vo2_max))) ? Number(latestVo2.vo2_max) : 0);
  const valReactividad = (bestReboundRsi > 0) ? bestReboundRsi : ((latestCmjRebound?.rebound_rsi != null && !isNaN(Number(latestCmjRebound.rebound_rsi))) ? Number(latestCmjRebound.rebound_rsi) : 0);
  const valMasaMusc = (latestAntro?.masa_muscular_pct != null && !isNaN(Number(latestAntro.masa_muscular_pct))) ? Number(latestAntro.masa_muscular_pct) : 0;
  const valMasaGrasa = (latestAntro?.masa_adiposa_pct != null && !isNaN(Number(latestAntro.masa_adiposa_pct))) ? Number(latestAntro.masa_adiposa_pct) : 0;

  const normalizedRadarData = [
    { subject: 'Potencia', A: getTScore(valPotencia, allImtp, 'imtp_fuerza_n'), B: 50 },
    { subject: 'Velocidad', A: getTScore(valVelocidad, allSpeed, 'vel_10m', true), B: 50 },
    { subject: 'Resistencia', A: getTScore(valResistencia, allVo2, 'vo2_max'), B: 50 },
    { subject: 'Reactividad', A: getTScore(valReactividad, allCmjRebound, 'rebound_rsi'), B: 50 },
    { subject: 'Masa Musc.', A: getTScore(valMasaMusc, processedAllAntro, 'masa_muscular_pct'), B: 50 },
    { subject: 'Masa Grasa', A: getTScore(valMasaGrasa, processedAllAntro, 'masa_adiposa_pct', true), B: 50 },
  ];

  return (
    <div className="space-y-8">
      {/* HEADER BENTO STYLE */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-2 bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
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

        {/* RADAR CHART BENTO CARD */}
        <div className="lg:col-span-1 bg-white rounded-[40px] p-6 shadow-sm border border-slate-100 flex flex-col items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-red-500"></div>
          <div className="text-center w-full pb-2">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Perfil de Rendimiento</p>
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mt-0.5">Huella del Atleta</h4>
          </div>
          
          <div className="w-full h-44 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={normalizedRadarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar 
                  name="Atleta" 
                  dataKey="A" 
                  stroke="#dc2626" 
                  fill="#dc2626" 
                  fillOpacity={0.4}
                />
                <Radar 
                  name="Media Cat" 
                  dataKey="B" 
                  stroke="#475569" 
                  fill="#475569" 
                  fillOpacity={0.1}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="flex items-center justify-center gap-4 text-[9px] font-black uppercase tracking-wider text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-red-600 rounded-xs"></span>
              <span>Jugador</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-slate-500 rounded-xs"></span>
              <span>Promedio</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[40px] p-6 shadow-sm border border-slate-100 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-red-500"></div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Perfil General</p>
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mt-0.5 mb-3">Distribución de Rendimiento</h4>
          </div>
          
          <div className="space-y-1.5 flex-1 flex flex-col justify-between">
            {/* ELITE */}
            <div 
              onClick={() => {
                setGeneralProfileFilter(generalProfileFilter === 'Elite' ? 'all' : 'Elite');
                const el = document.getElementById('perfil-multidimensional-card');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`px-3 py-1.5 rounded-2xl border transition-all duration-300 cursor-pointer ${
                generalProfileFilter === 'Elite' 
                  ? 'bg-purple-100 border-purple-300 shadow-sm' 
                  : 'bg-purple-50/40 hover:bg-purple-50/80 border-purple-100/60'
              }`}
            >
              <div className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
                  <span className="font-black uppercase text-purple-900 tracking-wider">Elite (≥90%)</span>
                </div>
                <span className="font-black text-purple-900 italic">{levelSummary.Elite}</span>
              </div>
              <div className="w-full bg-purple-100/50 h-1 rounded-full mt-1 overflow-hidden">
                <div 
                  className="bg-purple-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${evaluatedMetrics.length > 0 ? (levelSummary.Elite / evaluatedMetrics.length) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            {/* SOBRESALIENTE */}
            <div 
              onClick={() => {
                setGeneralProfileFilter(generalProfileFilter === 'Sobresaliente' ? 'all' : 'Sobresaliente');
                const el = document.getElementById('perfil-multidimensional-card');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`px-3 py-1.5 rounded-2xl border transition-all duration-300 cursor-pointer ${
                generalProfileFilter === 'Sobresaliente' 
                  ? 'bg-emerald-100 border-emerald-300 shadow-sm' 
                  : 'bg-emerald-50/40 hover:bg-emerald-50/80 border-emerald-100/60'
              }`}
            >
              <div className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  <span className="font-black uppercase text-emerald-900 tracking-wider">Sobresaliente (75-89%)</span>
                </div>
                <span className="font-black text-emerald-900 italic">{levelSummary.Sobresaliente}</span>
              </div>
              <div className="w-full bg-emerald-100/50 h-1 rounded-full mt-1 overflow-hidden">
                <div 
                  className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${evaluatedMetrics.length > 0 ? (levelSummary.Sobresaliente / evaluatedMetrics.length) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            {/* PROMEDIO */}
            <div 
              onClick={() => {
                setGeneralProfileFilter(generalProfileFilter === 'Promedio' ? 'all' : 'Promedio');
                const el = document.getElementById('perfil-multidimensional-card');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`px-3 py-1.5 rounded-2xl border transition-all duration-300 cursor-pointer ${
                generalProfileFilter === 'Promedio' 
                  ? 'bg-blue-100 border-blue-300 shadow-sm' 
                  : 'bg-blue-50/40 hover:bg-blue-50/80 border-blue-100/60'
              }`}
            >
              <div className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                  <span className="font-black uppercase text-blue-900 tracking-wider">Promedio (45-74%)</span>
                </div>
                <span className="font-black text-blue-900 italic">{levelSummary.Promedio}</span>
              </div>
              <div className="w-full bg-blue-100/50 h-1 rounded-full mt-1 overflow-hidden">
                <div 
                  className="bg-blue-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${evaluatedMetrics.length > 0 ? (levelSummary.Promedio / evaluatedMetrics.length) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            {/* BAJO PROMEDIO */}
            <div 
              onClick={() => {
                setGeneralProfileFilter(generalProfileFilter === 'Bajo Promedio' ? 'all' : 'Bajo Promedio');
                const el = document.getElementById('perfil-multidimensional-card');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`px-3 py-1.5 rounded-2xl border transition-all duration-300 cursor-pointer ${
                generalProfileFilter === 'Bajo Promedio' 
                  ? 'bg-orange-100 border-orange-300 shadow-sm' 
                  : 'bg-orange-50/40 hover:bg-orange-50/80 border-orange-100/60'
              }`}
            >
              <div className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-600"></span>
                  <span className="font-black uppercase text-orange-900 tracking-wider">Bajo Prom. (20-44%)</span>
                </div>
                <span className="font-black text-orange-900 italic">{levelSummary['Bajo Promedio']}</span>
              </div>
              <div className="w-full bg-orange-100/50 h-1 rounded-full mt-1 overflow-hidden">
                <div 
                  className="bg-orange-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${evaluatedMetrics.length > 0 ? (levelSummary['Bajo Promedio'] / evaluatedMetrics.length) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            {/* POR MEJORAR */}
            <div 
              onClick={() => {
                setGeneralProfileFilter(generalProfileFilter === 'Por Mejorar' ? 'all' : 'Por Mejorar');
                const el = document.getElementById('perfil-multidimensional-card');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`px-3 py-1.5 rounded-2xl border transition-all duration-300 cursor-pointer ${
                generalProfileFilter === 'Por Mejorar' 
                  ? 'bg-red-100 border-red-300 shadow-sm' 
                  : 'bg-red-50/40 hover:bg-red-50/80 border-red-100/60'
              }`}
            >
              <div className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                  <span className="font-black uppercase text-red-900 tracking-wider">Por Mejorar (&lt;20%)</span>
                </div>
                <span className="font-black text-red-900 italic">{levelSummary['Por Mejorar']}</span>
              </div>
              <div className="w-full bg-red-100/50 h-1 rounded-full mt-1 overflow-hidden">
                <div 
                  className="bg-red-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${evaluatedMetrics.length > 0 ? (levelSummary['Por Mejorar'] / evaluatedMetrics.length) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
          
          <p className="text-[7px] text-slate-400 font-bold uppercase tracking-wider mt-2.5 text-center leading-tight">
            * Haz clic en un rango para filtrar la tabla de abajo.
          </p>
        </div>
      </div>

      {/* PANEL DE CONTROL DE COMPARACIÓN */}
      <div className="bg-[#0b1220] text-white rounded-[32px] p-6 shadow-md border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-white">
            <i className="fa-solid fa-sliders text-red-500"></i>
            Comparativa de Rendimiento Físico vs Grupo de Referencia
          </h3>
          <p className="text-xs text-slate-400 font-semibold mt-1">
            Filtra la cohorte de referencia y la inclusión de valores atípicos para todas las evaluaciones físicas.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {/* Outliers Filter Toggle */}
          <button
            onClick={() => setExcludeOutliers(!excludeOutliers)}
            className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl border transition-all duration-200 flex items-center gap-2 ${
              excludeOutliers
                ? 'bg-amber-500/10 border-amber-500 text-amber-400 shadow-sm'
                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
            title={excludeOutliers ? "Haz clic para incluir valores atípicos" : "Haz clic para excluir valores atípicos"}
          >
            <i className={`fa-solid ${excludeOutliers ? 'fa-filter-circle-xmark text-amber-400' : 'fa-filter text-slate-400'}`}></i>
            {excludeOutliers ? 'Sin Atípicos' : 'Con Atípicos'}
            {totalCohortOutliers > 0 && (
              <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black ${
                excludeOutliers 
                  ? 'bg-amber-500 text-white animate-pulse' 
                  : 'bg-white/10 text-slate-300'
              }`}>
                {totalCohortOutliers} Atípicos
              </span>
            )}
          </button>

          <div className="bg-white/5 p-1 rounded-xl border border-white/10 flex items-center gap-1">
            <button
              onClick={() => setComparisonTarget('category')}
              className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all duration-200 ${
                comparisonTarget === 'category'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Su Categoría ({playerYear})
            </button>
            <button
              onClick={() => setComparisonTarget('2010plus')}
              className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all duration-200 ${
                comparisonTarget === '2010plus'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              2010 hacia arriba
            </button>
          </div>
        </div>
      </div>

      {/* 1. FUERZA MÁXIMA - IMTP */}
      <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
            <i className="fa-solid fa-dumbbell text-red-600 text-lg"></i>
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
              Evaluación de Fuerza Máxima - IMTP
            </h3>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              Valores pico e índices de fuerza isométrica y asimetría lateral
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <TachometerGauge {...getGaugeData('imtp_fuerza_n', allImtp, false, 'IMTP Fuerza Máxima', 'N', 'stroke-red-600', 'text-red-600', 5000)} />
          <TachometerGauge {...getGaugeData('imtp_f_relativa_n_kg', allImtp, false, 'IMTP F. Relativa', 'N/kg', 'stroke-orange-500', 'text-orange-500', 100)} />
          <TachometerGauge {...getGaugeData('imtp_force_50ms', allImtp, false, 'Fuerza Net a 50ms', 'N', 'stroke-amber-500', 'text-amber-500', 5000)} />
          <TachometerGauge {...getGaugeData('imtp_rfd_100ms', allImtp, false, 'RFD a 100ms', 'N/s', 'stroke-indigo-600', 'text-indigo-600', 20000)} />
        </div>

        {(() => {
          const imtpMax = getGaugeData('imtp_fuerza_n', allImtp, false, 'IMTP Fuerza Máxima', 'N', 'stroke-red-600', 'text-red-600', 5000);
          const imtpRel = getGaugeData('imtp_f_relativa_n_kg', allImtp, false, 'IMTP F. Relativa', 'N/kg', 'stroke-orange-500', 'text-orange-500', 100);
          const imtp50ms = getGaugeData('imtp_force_50ms', allImtp, false, 'Fuerza Net a 50ms', 'N', 'stroke-amber-500', 'text-amber-500', 5000);
          const imtpRfd = getGaugeData('imtp_rfd_100ms', allImtp, false, 'RFD a 100ms', 'N/s', 'stroke-indigo-600', 'text-indigo-600', 20000);

          if (imtpMax.value === 0 && imtpRel.value === 0) return null;

          return (
            <div className="bg-red-50 rounded-3xl p-6 border border-red-100 flex items-start gap-4 mt-6">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                <i className="fa-solid fa-dumbbell text-sm"></i>
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Ficha de Orientación: Fuerza Isométrica & Tasa de Fuerza (IMTP)</h4>
                <p className="text-[11px] text-slate-600 font-bold leading-relaxed">
                  {imtpRel.value < 30 && imtpRfd.value < 4000 ? (
                    `Déficit crítico tanto de fuerza relativa (${imtpRel.value} N/kg) como de tasa de desarrollo de fuerza (RFD 100ms: ${imtpRfd.value} N/s). El atleta presenta una baja capacidad de reclutamiento y tensión muscular absoluta. Se prescribe un ciclo prioritario de fuerza estructural y adaptaciones neuronales con cargas pesadas, combinado de manera secundaria con aceleraciones balísticas ligeras para romper la inercia.`
                  ) : imtpRel.value < 30 && imtpRfd.value >= 4000 ? (
                    `Nivel de fuerza relativa bajo (${imtpRel.value} N/kg) pero con una tasa de desarrollo de fuerza (RFD) relativamente eficiente. Esto indica que aunque el deportista es rápido para aplicar fuerza, carece de la masa muscular o la fuerza máxima de base para sostener altas tensiones. Se prescribe entrenamiento de hipertrofia funcional y fuerza máxima dinámica (cargas > 80% 1RM) para elevar su potencial de fuerza absoluta.`
                  ) : imtpRel.value >= 30 && imtpRfd.value < 4000 ? (
                    `Excelente nivel de fuerza relativa (${imtpRel.value} N/kg) pero con deficiente velocidad de aplicación (RFD 100ms bajo: ${imtpRfd.value} N/s). El atleta es sumamente fuerte pero "lento" en la ventana de tiempo crucial de un gesto deportivo (primeros 100-150ms). Se aconseja priorizar de inmediato el entrenamiento de potencia de alta velocidad, ejercicios balísticos, derivados de levantamiento olímpico desde el colgajo y saltos cargados ligeros (<30% 1RM) orientados a maximizar el RFD.`
                  ) : (
                    `Perfil de fuerza isométrica sobresaliente (Fuerza Relativa: ${imtpRel.value} N/kg) y fantástica velocidad de transmisión neural (RFD: ${imtpRfd.value} N/s). Demuestra una óptima capacidad para generar altos niveles de tensión y transmitirlos con extrema rapidez. Se prescribe entrenamiento de mantenimiento, prevención de lesiones y transferencia dinámica multidireccional específica al fútbol.`
                  )}
                </p>
              </div>
            </div>
          );
        })()}
      </div>

      {/* 2. POTENCIA Y SALTABILIDAD - CMJ */}
      <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <i className="fa-solid fa-compress text-emerald-600 text-lg"></i>
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
              Evaluación de Potencia y Saltabilidad - CMJ
            </h3>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              Capacidad de salto vertical, reactividad y potencia de despegue
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          <TachometerGauge {...getGaugeData('concentric_peak_force_n', allImtp, false, 'Fuerza Pico Conc.', 'N', 'stroke-emerald-600', 'text-emerald-600', 5000)} />
          <TachometerGauge {...getGaugeData('rsi_modified_m_s', allImtp, false, 'CMJ RSI Modificado', 'm/s', 'stroke-teal-600', 'text-teal-600', 2.0)} />
          <TachometerGauge {...getGaugeData('jump_height_impmom_cm', allImtp, false, 'Altura Salto (Imp-Mom)', 'cm', 'stroke-cyan-600', 'text-cyan-600', 60)} />
          <TachometerGauge {...getGaugeData('peak_power_bm_w_kg', allImtp, false, 'Pot. Pico Relativa', 'W/kg', 'stroke-sky-600', 'text-sky-600', 80)} />
          <TachometerGauge {...getGaugeData('peak_power_w', allImtp, false, 'Pot. Pico Absoluta', 'W', 'stroke-violet-600', 'text-violet-600', 6000)} />
        </div>

        {(() => {
          const cmjForce = getGaugeData('concentric_peak_force_n', allImtp, false, 'Fuerza Pico Conc.', 'N', 'stroke-emerald-600', 'text-emerald-600', 5000);
          const cmjRsi = getGaugeData('rsi_modified_m_s', allImtp, false, 'CMJ RSI Modificado', 'm/s', 'stroke-teal-600', 'text-teal-600', 2.0);
          const cmjHeight = getGaugeData('jump_height_impmom_cm', allImtp, false, 'Altura Salto (Imp-Mom)', 'cm', 'stroke-cyan-600', 'text-cyan-600', 60);
          const cmjPowerRel = getGaugeData('peak_power_bm_w_kg', allImtp, false, 'Pot. Pico Relativa', 'W/kg', 'stroke-sky-600', 'text-sky-600', 80);

          if (cmjHeight.value === 0 && cmjRsi.value === 0 && cmjForce.value === 0) return null;

          return (
            <div className="bg-emerald-50 rounded-3xl p-6 border border-emerald-100 flex items-start gap-4 mt-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <i className="fa-solid fa-compress text-sm"></i>
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Ficha de Orientación: Saltabilidad & Potencia (CMJ)</h4>
                <p className="text-[11px] text-slate-600 font-bold leading-relaxed">
                  {cmjHeight.value < 35 && cmjRsi.value < 0.45 ? (
                    `Déficit combinado de saltabilidad (${cmjHeight.value} cm) y reactividad neuromuscular (RSI Modificado: ${cmjRsi.value} m/s). El jugador produce fuerza con lentitud en la fase de amortiguación-despegue. Se prescribe entrenamiento de pliometría de estiramiento-acortamiento lento (SSC) y saltos balísticos descargados, enfocando el trabajo en acelerar la transición excéntrico-concéntrica.`
                  ) : cmjHeight.value >= 35 && cmjRsi.value < 0.45 ? (
                    `Nivel de saltabilidad aceptable (${cmjHeight.value} cm) pero con baja eficiencia reactiva (RSI Modificado bajo: ${cmjRsi.value} m/s). El atleta logra buena altura a costa de prolongar excesivamente la duración de las fases concéntrica y excéntrica del salto (patrón lento/pesado). Se recomienda priorizar el desarrollo de la tasa de desarrollo de fuerza (RFD) con contracciones rápidas, saltos con contramovimiento con acento concéntrico rápido y rebotes asistidos.`
                  ) : cmjHeight.value < 35 && cmjRsi.value >= 0.45 ? (
                    `Buena eficiencia de acoplamiento (RSI óptimo: ${cmjRsi.value} m/s), pero la altura final de salto (${cmjHeight.value} cm) está limitada por la fuerza concéntrica absoluta o potencia pico (${cmjPowerRel.value} W/kg). Se aconseja priorizar el incremento de la fuerza máxima dinámica en el gimnasio (Sentadillas, Cargadas de fuerza) para elevar el techo absoluto de fuerza concéntrica y transferir al salto vertical.`
                  ) : (
                    `Perfil de saltabilidad (${cmjHeight.value} cm) y potencia (${cmjPowerRel.value} W/kg) sobresaliente. Presenta una excelente transición excéntrico-concéntrica (RSI Modificado: ${cmjRsi.value} m/s) y altos niveles de potencia relativa por kilogramo de peso corporal. Continuar con el microciclo actual de mantenimiento, prevención y transferencia reactiva.`
                  )}
                </p>
              </div>
            </div>
          );
        })()}
      </div>

      {/* 6. REACTIVIDAD Y REBOTE - CMJ REBOUND */}
      <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
            <i className="fa-solid fa-arrow-trend-up text-violet-600 text-lg"></i>
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
              Evaluación de Reactividad y Rebote - CMJ Rebound
            </h3>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              Reactividad neuromuscular, tiempos de contacto, vuelo y momentum de despegue
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          <TachometerGauge {...getGaugeData('rebound_rsi', allCmjRebound, false, 'Rebound RSI', '', 'stroke-violet-600', 'text-violet-600', 3.0)} />
          <TachometerGauge {...getGaugeData('rebound_contact_time_ms', allCmjRebound, true, 'Tiempo Contacto', 'ms', 'stroke-indigo-600', 'text-indigo-600', 400)} />
          <TachometerGauge {...getGaugeData('rebound_flight_time_ms', allCmjRebound, false, 'Tiempo Vuelo', 'ms', 'stroke-purple-600', 'text-purple-600', 600)} />
          <TachometerGauge {...getGaugeData('take_off_momentum_kg_m_s', allCmjRebound, false, 'Momentum Despegue', 'kg·m/s', 'stroke-fuchsia-600', 'text-fuchsia-600', 400)} />
          <TachometerGauge {...getGaugeData('reps', allCmjRebound, false, 'Repeticiones', 'reps', 'stroke-pink-600', 'text-pink-600', 10)} />
        </div>

        {(() => {
          const rRsi = getGaugeData('rebound_rsi', allCmjRebound, false, 'Rebound RSI', '', 'stroke-violet-600', 'text-violet-600', 3.0);
          const rContact = getGaugeData('rebound_contact_time_ms', allCmjRebound, true, 'Tiempo Contacto', 'ms', 'stroke-indigo-600', 'text-indigo-600', 400);
          const rFlight = getGaugeData('rebound_flight_time_ms', allCmjRebound, false, 'Tiempo Vuelo', 'ms', 'stroke-purple-600', 'text-purple-600', 600);

          if (rRsi.value === 0 && rContact.value === 0) return null;

          return (
            <div className="bg-violet-50 rounded-3xl p-6 border border-violet-100 flex items-start gap-4 mt-6">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600 shrink-0">
                <i className="fa-solid fa-arrow-trend-up text-sm"></i>
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Ficha de Orientación: Reactividad & Rebote (CMJ Rebound)</h4>
                <p className="text-[11px] text-slate-600 font-bold leading-relaxed">
                  {rContact.value > 250 && rRsi.value < 2.0 ? (
                    `Déficit en la capacidad de reactividad rápida y falta de rigidez (stiffness) muscular (Tiempo de Contacto prolongado: ${rContact.value} ms, Rebound RSI: ${rRsi.value}). El deportista absorbe excesivamente la fuerza en lugar de devolverla elásticamente de forma veloz. Se prescribe entrenamiento de pliometría de contacto corto (tobillos rígidos, saltos repetidos sobre vallas bajas, skipping reactivo) y saltos continuos buscando minimizar el tiempo en el suelo.`
                  ) : rContact.value <= 250 && rRsi.value < 2.0 ? (
                    `Tiempo de contacto adecuado (${rContact.value} ms) pero con baja transferencia de energía vertical (Rebound RSI bajo: ${rRsi.value}). El atleta es rápido al despegar del suelo pero no logra generar suficiente altura en el rebote (Tiempo de Vuelo corto: ${rFlight.value} ms). Se recomienda enfatizar la aplicación de fuerza concéntrica explosiva reactiva y saltos continuos cargados con el objetivo de elevar el centro de masas en menor tiempo.`
                  ) : rContact.value > 250 && rRsi.value >= 2.0 ? (
                    `Buena potencia de salto y RSI aceptable (${rRsi.value}), pero con un tiempo de contacto lento (${rContact.value} ms). Esto refleja que el deportista depende de un acoplamiento más prolongado (tipo pliometría lenta) para generar su altura. Se recomienda orientar el entrenamiento hacia el desarrollo del ciclo de estiramiento-acortamiento rápido con multisaltos rápidos en cajón y saltos pliométricos asistidos.`
                  ) : (
                    `Excelente índice de fuerza reactiva en rebote (RSI: ${rRsi.value}) con un tiempo de contacto óptimo (${rContact.value} ms) y gran rigidez (stiffness) de tobillo. El atleta disipa un mínimo de energía elástica y demuestra una óptima transmisión de fuerzas reactivas en apoyos veloces. Mantener la carga actual y priorizar la especificidad multidireccional del fútbol.`
                  )}
                </p>
              </div>
            </div>
          );
        })()}
      </div>

      {/* 3. SPRINT Y ACELERACIÓN - VELOCIDAD */}
      <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <i className="fa-solid fa-gauge-high text-blue-600 text-lg"></i>
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
              Evaluación de Velocidad y Sprint Lineal
            </h3>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              Tiempos parciales, velocidades máximas y aceleración en sprint
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          <TachometerGauge {...getGaugeData('tiempo_10m', allSpeed, true, 'Tiempo 10m', 's', 'stroke-blue-600', 'text-blue-600', 3.0)} />
          <TachometerGauge {...getGaugeData('vel_10m', allSpeed, false, 'Velocidad 10m', 'm/s', 'stroke-indigo-600', 'text-indigo-600', 10.0)} />
          <TachometerGauge {...getGaugeData('tiempo_10_20m', allSpeed, true, 'Tiempo 10-20m', 's', 'stroke-purple-600', 'text-purple-600', 3.0)} />
          <TachometerGauge {...getGaugeData('tiempo_20_30m', allSpeed, true, 'Tiempo 20-30m', 's', 'stroke-fuchsia-600', 'text-fuchsia-600', 3.0)} />
          <TachometerGauge {...getGaugeData('tiempo_total', allSpeed, true, 'Tiempo Total', 's', 'stroke-pink-600', 'text-pink-600', 6.0)} />
        </div>

        {(() => {
          const s10 = getGaugeData('tiempo_10m', allSpeed, true, 'Tiempo 10m', 's', 'stroke-blue-600', 'text-blue-600', 3.0);
          const sTotal = getGaugeData('tiempo_total', allSpeed, true, 'Tiempo Total', 's', 'stroke-pink-600', 'text-pink-600', 6.0);

          if (s10.value === 0 && sTotal.value === 0) return null;

          return (
            <div className="bg-blue-50 rounded-3xl p-6 border border-blue-100 flex items-start gap-4 mt-6">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <i className="fa-solid fa-gauge-high text-sm"></i>
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Ficha de Orientación: Velocidad & Sprint Lineal</h4>
                <p className="text-[11px] text-slate-600 font-bold leading-relaxed">
                  {s10.value > 1.80 && sTotal.value > 4.25 ? (
                    `Déficit combinado en fase de aceleración inicial (${s10.value} s) y velocidad máxima (${sTotal.value} s). El jugador presenta debilidad en la aplicación de fuerza horizontal inicial y un perfil ineficiente de zancada. Se prescribe un bloque prioritario de fuerza máxima (empujes de trineo pesados) para mejorar la tracción de los primeros apoyos, junto con drills técnicos de sprint acelerado y arrastres resistidos ligeros.`
                  ) : s10.value > 1.80 && sTotal.value <= 4.25 ? (
                    `Déficit selectivo en aceleración inicial de 10m (${s10.value} s) pero con una óptima velocidad máxima de transición final (${sTotal.value} s). El atleta carece de la fuerza explosiva concéntrica o la proyección de ángulo bajo para la fase de aceleración de arranque. Se recomienda prescribir salidas de tres puntos, empujes/salidas resistidas pesadas (sled pushes a >50% peso corporal), y saltos horizontales de potencia para potenciar el impulso de los primeros 3 a 5 apoyos.`
                  ) : s10.value <= 1.80 && sTotal.value > 4.25 ? (
                    `Excelente aceleración inicial en 10m (${s10.value} s) pero con una pérdida notable de rendimiento en la velocidad máxima de transición final (${sTotal.value} s). El atleta tiene un potente arranque inicial pero decae rápidamente o muestra ineficiencia técnica en su postura erguida (zancada acortada o deficiente stiffness en apoyos). Se aconseja priorizar drills de velocidad máxima (flying sprints de 10-20m con entrada lanzada), sprints asistidos ligeros para sobrevelocidad, y pliometría de tobillo muy rápida.`
                  ) : (
                    `Perfil de sprint lineal excepcional. Posee una salida explosiva y reactiva en 10m (${s10.value} s) y una capacidad soberbia para mantener y desarrollar la velocidad máxima terminal (${sTotal.value} s). Se prescribe entrenamiento de mantenimiento con sprints específicos de fútbol con cambios de dirección o fatiga acumulada simulada, y fortalecimiento excéntrico del isquiotibial (ejercicio nórdico) para prevención de lesiones.`
                  )}
                </p>
              </div>
            </div>
          );
        })()}
      </div>

      {/* 4. CAPACIDAD AERÓBICA - VO2 MÁX */}
      <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
            <i className="fa-solid fa-heart-pulse text-purple-600 text-lg"></i>
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
              Evaluación Aeróbica (UNCATEST) - VO2 Máx
            </h3>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              Consumo máximo de oxígeno, velocidad de umbral anaeróbico y potencia aeróbica
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          <TachometerGauge {...getGaugeData('vo2_max', allVo2, false, 'Consumo de Oxígeno', 'ml/kg/min', 'stroke-purple-600', 'text-purple-600', 80)} />
          <TachometerGauge {...getGaugeData('vam', allVo2, false, 'VMA', 'km/h', 'stroke-fuchsia-600', 'text-fuchsia-600', 25)} />
          <TachometerGauge {...getGaugeData('vt1_vel', allVo2, false, 'VT1 Vel', 'km/h', 'stroke-rose-600', 'text-rose-600', 25)} />
          <TachometerGauge {...getGaugeData('mts', allVo2, false, 'Distancia', 'm', 'stroke-emerald-600', 'text-emerald-600', 3000)} />
          <TachometerGauge {...getGaugeData('vt2_vel', allVo2, false, 'VT2 Vel', 'km/h', 'stroke-amber-600', 'text-amber-600', 25)} />
        </div>

        {(() => {
          const vMax = getGaugeData('vo2_max', allVo2, false, 'Consumo de Oxígeno', 'ml/kg/min', 'stroke-purple-600', 'text-purple-600', 80);
          const vVam = getGaugeData('vam', allVo2, false, 'VMA', 'km/h', 'stroke-fuchsia-600', 'text-fuchsia-600', 25);
          const vVt1 = getGaugeData('vt1_vel', allVo2, false, 'VT1 Vel', 'km/h', 'stroke-rose-600', 'text-rose-600', 25);
          const vVt2 = getGaugeData('vt2_vel', allVo2, false, 'VT2 Vel', 'km/h', 'stroke-amber-600', 'text-amber-600', 25);

          if (vMax.value === 0 && vVam.value === 0) return null;

          return (
            <div className="bg-purple-50 rounded-3xl p-6 border border-purple-100 flex items-start gap-4 mt-6">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                <i className="fa-solid fa-heart-pulse text-sm"></i>
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Ficha de Orientación: Capacidad Aeróbica (UNCATEST)</h4>
                <p className="text-[11px] text-slate-600 font-bold leading-relaxed">
                  {vMax.value < 58 && vVt2.value < 13.5 ? (
                    `Déficit combinado de potencia aeróbica máxima (VO2 Máx: ${vMax.value} ml/kg/min) y capacidad de umbral (VT2: ${vVt2.value} km/h). El jugador presenta limitaciones tanto en su motor aeróbico absoluto como en su tolerancia al lactato. Se prescribe entrenamiento de intervalos de alta intensidad (HIIT largo/corto, e.g., 4x4 min al 90-95% FC Máx) para forzar adaptaciones centrales, alternando con carrera continua extensiva.`
                  ) : vMax.value >= 58 && vVt2.value < 13.5 ? (
                    `Techo aeróbico óptimo (VO2 Máx: ${vMax.value} ml/kg/min) pero con baja eficiencia metabólica de umbral anaeróbico (VT2 bajo: ${vVt2.value} km/h). El jugador tiene un excelente motor absoluto, pero acumula lactato prematuramente a velocidades moderadas. Se prescribe entrenamiento de fraccionados de umbral (Tempo runs, 3x10 min al VT2 o ligeramente superior) para desplazar la curva metabólica y mejorar el aclaramiento de lactato.`
                  ) : vMax.value < 58 && vVt2.value >= 13.5 ? (
                    `Excelente eficiencia de umbral (VT2 óptimo: ${vVt2.value} km/h) pero con un techo de potencia aeróbica limitado (VO2 Máx: ${vMax.value} ml/kg/min). El jugador está muy bien optimizado metabólicamente pero necesita empujar su límite superior absoluto. Se recomienda priorizar pasadas de corta duración a alta intensidad (intervalos VMA, e.g., 30s-30s a >100% VMA de ${vVam.value} km/h) y entrenamiento intermitente neuromuscular.`
                  ) : (
                    `Perfil aeróbico sobresaliente en el test UNCATEST. Presenta una elevada potencia aeróbica absoluta (VO2 Máx: ${vMax.value} ml/kg/min) y una alta velocidad de umbral anaeróbico (VT2: ${vVt2.value} km/h). Posee una excelente recuperación intermitente metabólica. Se prescribe mantener el volumen actual de acondicionamiento y priorizar la transferencia a situaciones reales de juego mediante juegos reducidos (Small Sided Games) de alta exigencia táctica.`
                  )}
                </p>
              </div>
            </div>
          );
        })()}
      </div>

      {/* 5. AGILIDAD Y COD - TEST 505 */}
      <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
            <i className="fa-solid fa-person-running text-orange-500 text-lg"></i>
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
              Evaluación de Cambio de Dirección - Test 505
            </h3>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              Tiempos de aceleración, desaceleración, COD y re-aceleración en test 505
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          <TachometerGauge {...getGaugeData('t_acel_2m', allTest505, true, '505 T. Acel 2m', 's', 'stroke-orange-500', 'text-orange-500', 5.0)} />
          <TachometerGauge {...getGaugeData('t_desacel_2m', allTest505, true, '505 T. Desacel 2m', 's', 'stroke-amber-500', 'text-amber-500', 5.0)} />
          <TachometerGauge {...getGaugeData('t_cod_2m', allTest505, true, '505 T. COD 2m', 's', 'stroke-red-500', 'text-red-500', 5.0)} />
          <TachometerGauge {...getGaugeData('t_reacel_1_2m', allTest505, true, '505 T. Reacel 1 2m', 's', 'stroke-yellow-500', 'text-yellow-500', 5.0)} />
          <TachometerGauge {...getGaugeData('z_score_acel', allTest505, false, '505 Z-Score Acel', '', 'stroke-lime-600', 'text-lime-600', 5.0)} />
        </div>

        {(() => {
          const tDesacel = getGaugeData('t_desacel_2m', allTest505, true, '505 T. Desacel 2m', 's', 'stroke-amber-500', 'text-amber-500', 5.0);
          const tCod = getGaugeData('t_cod_2m', allTest505, true, '505 T. COD 2m', 's', 'stroke-red-500', 'text-red-500', 5.0);

          if (tDesacel.value === 0 && tCod.value === 0) return null;

          return (
            <div className="bg-orange-50 rounded-3xl p-6 border border-orange-100 flex items-start gap-4 mt-6">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                <i className="fa-solid fa-person-running text-sm"></i>
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Ficha de Orientación: Cambio de Dirección (Test 505)</h4>
                <p className="text-[11px] text-slate-600 font-bold leading-relaxed">
                  {tDesacel.value > 0.55 && tCod.value > 0.55 ? (
                    `Déficit crítico tanto en la fase de desaceleración previa (${tDesacel.value} s) como en el tiempo neto de giro/cambio de dirección (${tCod.value} s). El atleta presenta dificultades para absorber la energía cinética en frenados excéntricos y reorientar el cuerpo eficientemente. Se prescribe un bloque priorizado de fuerza excéntrica (sentadillas excéntricas, caídas desde cajón bilaterales y unilaterales) y drills técnicos de frenado y desaceleración controlada a distancias progresivas.`
                  ) : tDesacel.value > 0.55 && tCod.value <= 0.55 ? (
                    `Déficit selectivo en la fase de desaceleración (${tDesacel.value} s) pero con un tiempo eficiente de giro/COD (${tCod.value} s). Esto indica que el deportista es capaz de girar rápido, pero carece de la fuerza excéntrica para frenar de manera segura y controlada con pocos apoyos. Se recomienda entrenar la fuerza de frenado mediante entrenamiento excéntrico acentuado y drills de desaceleración lineal y angular a intensidades crecientes.`
                  ) : tDesacel.value <= 0.55 && tCod.value > 0.55 ? (
                    `Excelente capacidad de desaceleración previa (${tDesacel.value} s) pero con lentitud en el tiempo neto de giro/COD (${tCod.value} s). El atleta frena de manera eficiente pero pierde fluidez y momentum al reorientar su cuerpo y centro de masa. Se aconseja priorizar drills técnicos de cambio de dirección cerrado, rotaciones de cadera, drills de agilidad de baja a alta velocidad, y pliometría multidireccional con énfasis en empuje lateral inmediato.`
                  ) : (
                    `Perfil de cambio de dirección excepcional en el test 505. Presenta una transición fluida y veloz en la desaceleración (${tDesacel.value} s) y un giro sumamente reactivo y eficiente (${tCod.value} s). Demuestra un óptimo equilibrio entre fuerza excéntrica de frenado y potencia concéntrica de salida lateral. Se prescribe mantener la carga actual de agilidad, incorporando toma de decisiones reactiva y estresores específicos de juego en fatiga.`
                  )}
                </p>
              </div>
            </div>
          );
        })()}
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
                referenceMax={refMasaMuscularPct}
                personalMax={bestAntroMasaMuscularPct}
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
                referenceMax={refMasaMuscularKg}
                personalMax={bestAntroMasaMuscularKg}
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
                referenceMax={refMasaAdiposaPct}
                personalMax={bestAntroMasaAdiposaPct}
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
                referenceMax={refMasaAdiposaKg}
                personalMax={bestAntroMasaAdiposaKg}
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
                referenceMax={refSumPliegues6}
                personalMax={bestAntroSumPliegues6}
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
                referenceMax={refIndiceImo}
                personalMax={bestAntroIndiceImo}
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
                    } else if (mVal < 1.0) {
                      maturationLabel = 'POST-PHV (Ventana de peligro y cuidado corporal)';
                      maturationColor = 'text-orange-600 bg-orange-50/60 border-orange-100/60';
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

      {/* RESUMEN DE PERFIL MULTIDIMENSIONAL Y TABLA GENERAL */}
      <div id="perfil-multidimensional-card" className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center">
              <i className="fa-solid fa-chart-bar text-white text-lg"></i>
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                Perfil General y Evaluación Multidimensional
              </h3>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                Consolidado de parámetros evaluados y distribución de rendimiento por rangos de percentil
              </p>
            </div>
          </div>
          
          <div className="text-right text-xs text-slate-500 font-bold">
            Total Parámetros Evaluados: <span className="text-slate-900 font-black text-sm">{evaluatedMetrics.length}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {/* Right Panel: Interactive Metrics Table */}
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                <input
                  type="text"
                  value={generalProfileSearch}
                  onChange={(e) => setGeneralProfileSearch(e.target.value)}
                  placeholder="Buscar parámetro o área..."
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 focus:border-slate-400 bg-slate-50/50 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-all duration-200"
                />
              </div>

              {/* Sort selector */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Ordenar por:</span>
                <select
                  value={generalProfileSort}
                  onChange={(e: any) => setGeneralProfileSort(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-bold focus:outline-none focus:border-slate-400 transition"
                >
                  <option value="percentile-desc">Mayor Percentil</option>
                  <option value="percentile-asc">Menor Percentil</option>
                  <option value="area">Por Área Funcional</option>
                </select>
              </div>
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap gap-1.5 pb-1">
              <button
                onClick={() => setGeneralProfileFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                  generalProfileFilter === 'all'
                    ? 'bg-slate-950 border-slate-950 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                Todos ({evaluatedMetrics.length})
              </button>
              <button
                onClick={() => setGeneralProfileFilter('top')}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                  generalProfileFilter === 'top'
                    ? 'bg-purple-950 border-purple-950 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300'
                }`}
              >
                Destacados ({levelSummary.Elite + levelSummary.Sobresaliente})
              </button>
              <button
                onClick={() => setGeneralProfileFilter('mid')}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                  generalProfileFilter === 'mid'
                    ? 'bg-blue-950 border-blue-950 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300'
                }`}
              >
                Promedio ({levelSummary.Promedio})
              </button>
              <button
                onClick={() => setGeneralProfileFilter('low')}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                  generalProfileFilter === 'low'
                    ? 'bg-red-950 border-red-950 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-red-600 hover:bg-red-50 hover:border-red-300'
                }`}
              >
                Por Mejorar ({levelSummary['Bajo Promedio'] + levelSummary['Por Mejorar']})
              </button>
            </div>

            {/* Table Container */}
            <div className="flex-1 min-h-[300px] max-h-[480px] overflow-y-auto border border-slate-100 rounded-3xl bg-slate-50/30 shadow-inner scrollbar-thin">
              {processedProfileMetrics.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <i className="fa-solid fa-chart-line text-slate-300 text-3xl mb-3"></i>
                  <p className="text-xs text-slate-500 font-bold">No se encontraron parámetros evaluados</p>
                  <p className="text-[10px] text-slate-400 mt-1">Prueba cambiando los filtros o la búsqueda</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {processedProfileMetrics.map((m) => {
                    let levelBadgeClass = '';
                    if (m.level === 'Elite') levelBadgeClass = 'bg-purple-50 border-purple-100 text-purple-700';
                    else if (m.level === 'Sobresaliente') levelBadgeClass = 'bg-emerald-50 border-emerald-100 text-emerald-700';
                    else if (m.level === 'Promedio') levelBadgeClass = 'bg-blue-50 border-blue-100 text-blue-700';
                    else if (m.level === 'Bajo Promedio') levelBadgeClass = 'bg-orange-50 border-orange-150 text-orange-700';
                    else levelBadgeClass = 'bg-red-50 border-red-100 text-red-600';

                    let areaBadgeClass = '';
                    if (m.area === 'Fuerza Máxima') areaBadgeClass = 'bg-red-50/60 text-red-700 border-red-100/40';
                    else if (m.area === 'Potencia y Saltabilidad') areaBadgeClass = 'bg-emerald-50/60 text-emerald-700 border-emerald-100/40';
                    else if (m.area === 'Reactividad y Rebote') areaBadgeClass = 'bg-violet-50/60 text-violet-700 border-violet-100/40';
                    else if (m.area === 'Sprint y Aceleración') areaBadgeClass = 'bg-pink-50/60 text-pink-700 border-pink-100/40';
                    else if (m.area === 'Consumo de Oxígeno') areaBadgeClass = 'bg-blue-50/60 text-blue-700 border-blue-100/40';
                    else if (m.area === 'Cambio de Dirección') areaBadgeClass = 'bg-amber-50/60 text-amber-700 border-amber-100/40';
                    else areaBadgeClass = 'bg-slate-100/60 text-slate-700 border-slate-200/40';

                    return (
                      <div key={m.title} className="p-4 bg-white hover:bg-slate-50/50 transition duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-slate-800">{m.title}</span>
                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase border ${areaBadgeClass}`}>
                              {m.area}
                            </span>
                          </div>
                          
                          {/* Percentile bar visualizer */}
                          <div className="flex items-center gap-2 max-w-xs">
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${
                                  m.level === 'Elite' ? 'bg-purple-600' :
                                  m.level === 'Sobresaliente' ? 'bg-emerald-500' :
                                  m.level === 'Promedio' ? 'bg-blue-500' :
                                  m.level === 'Bajo Promedio' ? 'bg-orange-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${m.percentile}%` }}
                              ></div>
                            </div>
                            <span className="text-[10px] font-black font-mono text-slate-400">P{Math.round(m.percentile)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 justify-between sm:justify-end">
                          <div className="text-right">
                            <span className="text-sm font-black text-slate-900 italic tracking-tight">
                              {m.value.toLocaleString('es-ES', { maximumFractionDigits: 1 })}
                            </span>
                            {m.unit && <span className="text-[9px] font-bold text-slate-400 uppercase ml-1">{m.unit}</span>}
                          </div>

                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase border ${levelBadgeClass} min-w-[100px] text-center`}>
                            {m.level}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI INSIGHTS BENTO - REMOVED */}
      <div className="hidden">
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

      {player && (
        <AthletePrescription
          player={player as any}
          latestVam={(() => {
            if (!vo2max || vo2max.length === 0) return null;
            const sorted = [...vo2max].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
            return sorted[0]?.vam || null;
          })()}
          latestImtp={(() => {
            if (!imtp || imtp.length === 0) return null;
            const sorted = [...imtp].sort((a, b) => new Date(b.fecha_test).getTime() - new Date(a.fecha_test).getTime());
            return sorted[0]?.imtp_fuerza_n || null;
          })()}
        />
      )}
    </div>
  );
};

const IndividualDashboard = ({ 
  player, imtp, speed, antropometria, vo2max, test505 = [], cmjRebound = [], clubs,
  allPlayers = [], allImtp = [], allSpeed = [], allVo2 = [], allTest505 = [], allCmjRebound = []
}: { 
  player?: PlayerData, 
  imtp: IMTPData[], 
  speed: SpeedTestData[], 
  antropometria: AntropometriaData[],
  vo2max: VO2MaxData[],
  test505?: any[],
  cmjRebound?: CMJReboundData[],
  clubs: any[],
  allPlayers?: any[],
  allImtp?: any[],
  allSpeed?: any[],
  allVo2?: any[],
  allTest505?: any[],
  allCmjRebound?: any[]
}) => {
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    'imtp_fuerza_n',
    'imtp_f_relativa_n_kg',
    'cmj_rsi_mod',
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

  const [selectedAgilityMetrics, setSelectedAgilityMetrics] = useState<string[]>([
    't_cod_2m',
    'vel_cod_kmh',
    't_acel_2m',
    't_desacel_2m'
  ]);

  const [selectedReboundMetrics, setSelectedReboundMetrics] = useState<string[]>([
    'rebound_rsi',
    'rebound_contact_time_ms',
    'rebound_flight_time_ms',
    'take_off_momentum_kg_m_s'
  ]);

  const imtpMetrics = METRICS_OPTIONS.filter(m => m.table === 'imtp');
  const speedMetrics = METRICS_OPTIONS.filter(m => m.table === 'speed');
  const vo2Metrics = METRICS_OPTIONS.filter(m => m.table === 'vo2max');
  const antroMetrics = METRICS_OPTIONS.filter(m => m.table === 'antropometria');
  const agilityMetrics = METRICS_OPTIONS.filter(m => m.table === 'test505');
  const reboundMetrics = METRICS_OPTIONS.filter(m => m.table === 'rebound');

  const latestImtpFuerza = useMemo(() => {
    if (!imtp || imtp.length === 0) return null;
    const sorted = [...imtp].sort((a, b) => new Date(b.fecha_test).getTime() - new Date(a.fecha_test).getTime());
    return sorted[0].imtp_fuerza_n || null;
  }, [imtp]);

  const latestCmjAltura = useMemo(() => {
    if (!imtp || imtp.length === 0) return null;
    const sorted = [...imtp].sort((a, b) => new Date(b.fecha_test).getTime() - new Date(a.fecha_test).getTime());
    return sorted[0].cmj_altura_salto_im || null;
  }, [imtp]);

  const latestSpeedTotal = useMemo(() => {
    if (!speed || speed.length === 0) return null;
    const sorted = [...speed].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    return sorted[0].tiempo_total || null;
  }, [speed]);

  const latestVo2Max = useMemo(() => {
    if (!vo2max || vo2max.length === 0) return null;
    const sorted = [...vo2max].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    return sorted[0].vo2_max || null;
  }, [vo2max]);

  const latestAgilityCod = useMemo(() => {
    if (!test505 || test505.length === 0) return null;
    const sorted = [...test505].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    return sorted[0].t_cod_2m || null;
  }, [test505]);

  const latestReboundRsi = useMemo(() => {
    if (!cmjRebound || cmjRebound.length === 0) return null;
    const sorted = [...cmjRebound].sort((a, b) => new Date(b.fecha_test).getTime() - new Date(a.fecha_test).getTime());
    return sorted[0].rebound_rsi || null;
  }, [cmjRebound]);

  const resolveMetricValue = (row: any, key: string): any => {
    if (!row) return undefined;
    let val = row[key];
    if (val === undefined || val === null || val === '') {
      if (key === 'imtp_fuerza_n') val = row['Peak Vertical Force [N]'];
      if (key === 'imtp_f_relativa_n_kg') val = row['Peak Vertical Force / BM'] || row['Peak Vertical Force / BM [N/kg]'];
      if (key === 'imtp_force_50ms') val = row['Force (Net of BW) at 50ms'] || row['Force (Net of BW) at 50ms [N]'];
      if (key === 'imtp_force_100ms') val = row['Force (Net of BW) at 100ms'] || row['Force (Net of BW) at 100ms [N]'];
      if (key === 'imtp_force_150ms') val = row['Force (Net of BW) at 150ms'] || row['Force (Net of BW) at 150ms [N]'];
      if (key === 'imtp_force_200ms') val = row['Force (Net of BW) at 200ms'] || row['Force (Net of BW) at 200ms [N]'];
      if (key === 'imtp_rfd_100ms') val = row['RFD - 100ms [N/s]'];
      if (key === 'imtp_rfd_150ms') val = row['RFD - 150ms [N/s]'];
      if (key === 'imtp_rfd_200ms') val = row['RFD - 200ms [N/s]'];

      if (key === 'concentric_peak_force_n') val = row.fuerza_cmj;
      if (key === 'fuerza_cmj') val = row.concentric_peak_force_n;
      if (key === 'rsi_modified_m_s') val = row.cmj_rsi_mod;
      if (key === 'cmj_rsi_mod') val = row.rsi_modified_m_s;
      if (key === 'jump_height_impmom_cm') val = row.cmj_altura_salto_im;
      if (key === 'cmj_altura_salto_im') val = row.jump_height_impmom_cm;
      if (key === 'peak_power_bm_w_kg') val = row.cmj_peak_pot_relativa;
      if (key === 'cmj_peak_pot_relativa') val = row.peak_power_bm_w_kg;
    }
    return val;
  };

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
      case 'rebound': sourceData = cmjRebound; dateKey = 'fecha_test'; break;
      case 'test505': sourceData = test505; dateKey = 'fecha'; break;
    }

    return sourceData
      .map(d => {
        const val = resolveMetricValue(d, metricKey);
        return {
          date: new Date(d[dateKey]).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
          value: val !== undefined && val !== null && val !== '' ? Number(val) : NaN,
          fullDate: new Date(d[dateKey]).getTime()
        };
      })
      .filter(d => !isNaN(d.value) && d.fullDate > 0)
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

  const updateAgilityMetric = (index: number, newKey: string) => {
    const newMetrics = [...selectedAgilityMetrics];
    newMetrics[index] = newKey;
    setSelectedAgilityMetrics(newMetrics);
  };

  const updateReboundMetric = (index: number, newKey: string) => {
    const newMetrics = [...selectedReboundMetrics];
    newMetrics[index] = newKey;
    setSelectedReboundMetrics(newMetrics);
  };

  const getEvaluationCategory = (metricKey: string, val: number) => {
    if (val === undefined || val === null || val === 0 || isNaN(val)) {
      return { label: 'S/D', bg: 'bg-slate-50 border-slate-100', text: 'text-slate-400' };
    }

    const config = ALL_METRIC_CONFIGS[metricKey];
    if (!config) {
      if (metricKey === 'masa_adiposa_pct') {
        if (val < 10) return { label: 'Excelente', bg: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-600' };
        if (val <= 14) return { label: 'Normal', bg: 'bg-amber-50 border-amber-100', text: 'text-amber-600' };
        return { label: 'Bajo', bg: 'bg-rose-50 border-rose-100', text: 'text-rose-600' };
      }
      return { label: 'Valor', bg: 'bg-slate-50 border-slate-200', text: 'text-slate-700' };
    }

    const { excellent, normal } = config.thresholds;
    if (config.lowerIsBetter) {
      if (val <= excellent) return { label: 'Excelente', bg: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-600' };
      if (val <= normal) return { label: 'Normal', bg: 'bg-amber-50 border-amber-100', text: 'text-amber-600' };
      return { label: 'Bajo', bg: 'bg-rose-50 border-rose-100', text: 'text-rose-600' };
    } else {
      if (val >= excellent) return { label: 'Excelente', bg: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-600' };
      if (val >= normal) return { label: 'Normal', bg: 'bg-amber-50 border-amber-100', text: 'text-amber-600' };
      return { label: 'Bajo', bg: 'bg-rose-50 border-rose-100', text: 'text-rose-600' };
    }
  };

  const parsedEvaluations = useMemo(() => {
    const list: {
      dateStr: string;
      rawDate: Date;
      area: string;
      metrics: { key: string; label: string; value: number; unit: string }[];
      observations: string;
    }[] = [];

    // IMTP & CMJ
    imtp.forEach((d) => {
      const dateVal = d.fecha_test ? new Date(d.fecha_test) : new Date();
      const metricsList = [
        { key: 'imtp_fuerza_n', label: 'Fuerza Máx IMTP', value: d.imtp_fuerza_n, unit: 'N' },
        { key: 'imtp_f_relativa_n_kg', label: 'F. Relativa IMTP', value: d.imtp_f_relativa_n_kg, unit: 'N/kg' },
        { key: 'fuerza_cmj', label: 'Fuerza CMJ', value: d.fuerza_cmj || d.concentric_peak_force_n, unit: 'N' },
        { key: 'cmj_rsi_mod', label: 'CMJ RSI Mod', value: d.cmj_rsi_mod || d.rsi_modified_m_s, unit: '' },
        { key: 'cmj_altura_salto_im', label: 'CMJ Altura', value: d.cmj_altura_salto_im || d.jump_height_impmom_cm, unit: 'cm' },
        { key: 'cmj_peak_pot_relativa', label: 'CMJ Peak Pot. Rel.', value: d.cmj_peak_pot_relativa || d.peak_power_bm_w_kg, unit: 'W/kg' }
      ].map(m => ({ ...m, value: m.value !== undefined ? Number(m.value) : NaN }))
       .filter(m => !isNaN(m.value) && m.value > 0);

      if (metricsList.length > 0) {
        list.push({
          dateStr: dateVal.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }),
          rawDate: dateVal,
          area: 'Fuerza & Saltabilidad',
          metrics: metricsList,
          observations: d.observaciones || ''
        });
      }
    });

    // Speed (Sprint)
    speed.forEach((d) => {
      const dateVal = d.fecha ? new Date(d.fecha) : new Date();
      const metricsList = [
        { key: 'tiempo_10m', label: 'Tiempo 10m', value: d.tiempo_10m, unit: 's' },
        { key: 'vel_10m', label: 'Velocidad 10m', value: d.vel_10m, unit: 'm/s' },
        { key: 'tiempo_10_20m', label: 'Tiempo 10-20m', value: d.tiempo_10_20m, unit: 's' },
        { key: 'tiempo_20_30m', label: 'Tiempo 20-30m', value: d.tiempo_20_30m, unit: 's' },
        { key: 'tiempo_total', label: 'Tiempo Total 30m', value: d.tiempo_total, unit: 's' }
      ].map(m => ({ ...m, value: m.value !== undefined ? Number(m.value) : NaN }))
       .filter(m => !isNaN(m.value) && m.value > 0);

      if (metricsList.length > 0) {
        list.push({
          dateStr: dateVal.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }),
          rawDate: dateVal,
          area: 'Velocidad (Sprint)',
          metrics: metricsList,
          observations: d.observaciones || ''
        });
      }
    });

    // VO2 Max
    vo2max.forEach((d) => {
      const dateVal = d.fecha ? new Date(d.fecha) : new Date();
      const metricsList = [
        { key: 'vo2_max', label: 'VO2 Max', value: d.vo2_max, unit: 'ml/kg/min' },
        { key: 'vam', label: 'VMA', value: d.vam, unit: 'km/h' },
        { key: 'vt1_vel', label: 'VT1 Vel', value: d.vt1_vel, unit: 'km/h' },
        { key: 'mts', label: 'Distancia VO2', value: d.mts, unit: 'm' },
        { key: 'vt2_vel', label: 'VT2 Vel', value: d.vt2_vel, unit: 'km/h' }
      ].map(m => ({ ...m, value: m.value !== undefined ? Number(m.value) : NaN }))
       .filter(m => !isNaN(m.value) && m.value > 0);

      if (metricsList.length > 0) {
        list.push({
          dateStr: dateVal.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }),
          rawDate: dateVal,
          area: 'Capacidad Aeróbica (VO2 Max)',
          metrics: metricsList,
          observations: d.observaciones || ''
        });
      }
    });

    // Antropometría
    antropometria.forEach((d) => {
      const dateVal = d.fecha_medicion ? new Date(d.fecha_medicion) : new Date();
      const metricsList = [
        { key: 'masa_corporal_kg', label: 'Masa Corporal', value: d.masa_corporal_kg, unit: 'kg' },
        { key: 'talla_cm', label: 'Talla', value: d.talla_cm, unit: 'cm' },
        { key: 'masa_muscular_pct', label: 'Masa Muscular', value: d.masa_muscular_pct, unit: '%' },
        { key: 'masa_adiposa_pct', label: 'Masa Adiposa', value: d.masa_adiposa_pct, unit: '%' },
        { key: 'sum_pliegues_6_mm', label: 'Suma 6 Pliegues', value: d.sum_pliegues_6_mm, unit: 'mm' }
      ].map(m => ({ ...m, value: m.value !== undefined ? Number(m.value) : NaN }))
       .filter(m => !isNaN(m.value) && m.value > 0);

      if (metricsList.length > 0) {
        list.push({
          dateStr: dateVal.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }),
          rawDate: dateVal,
          area: 'Antropometría',
          metrics: metricsList,
          observations: ''
        });
      }
    });

    // Test 505 (Agility)
    test505.forEach((d) => {
      const dateVal = d.fecha ? new Date(d.fecha) : new Date();
      const metricsList = [
        { key: 't_acel_2m', label: '505 T. Acel 2m', value: d.t_acel_2m, unit: 's' },
        { key: 't_desacel_2m', label: '505 T. Desacel 2m', value: d.t_desacel_2m, unit: 's' },
        { key: 't_cod_2m', label: '505 T. COD 2m', value: d.t_cod_2m, unit: 's' },
        { key: 't_reacel_1_2m', label: '505 T. Reacel 1.2m', value: d.t_reacel_1_2m, unit: 's' },
        { key: 'z_score_acel', label: '505 Z-Score Acel', value: d.z_score_acel, unit: '' }
      ].map(m => ({ ...m, value: m.value !== undefined ? Number(m.value) : NaN }))
       .filter(m => !isNaN(m.value) && m.value > 0);

      if (metricsList.length > 0) {
        list.push({
          dateStr: dateVal.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }),
          rawDate: dateVal,
          area: 'Agilidad (Test 505)',
          metrics: metricsList,
          observations: d.observaciones || ''
        });
      }
    });

    // CMJ Rebound
    cmjRebound.forEach((d) => {
      const dateVal = d.fecha_test ? new Date(d.fecha_test) : new Date();
      const metricsList = [
        { key: 'rebound_rsi', label: 'RSI Rebound', value: d.rebound_rsi, unit: '' },
        { key: 'rebound_contact_time_ms', label: 'T. Contacto Rebound', value: d.rebound_contact_time_ms, unit: 'ms' },
        { key: 'rebound_flight_time_ms', label: 'T. Vuelo Rebound', value: d.rebound_flight_time_ms, unit: 'ms' }
      ].map(m => ({ ...m, value: m.value !== undefined ? Number(m.value) : NaN }))
       .filter(m => !isNaN(m.value) && m.value > 0);

      if (metricsList.length > 0) {
        list.push({
          dateStr: dateVal.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }),
          rawDate: dateVal,
          area: 'Fuerza Reactiva (Rebound)',
          metrics: metricsList,
          observations: d.observaciones || ''
        });
      }
    });

    return list.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
  }, [imtp, speed, vo2max, antropometria, test505, cmjRebound]);

  if (!player) return (
    <div className="bg-white rounded-[40px] p-20 text-center border border-dashed border-slate-200">
      <i className="fa-solid fa-user-magnifying-glass text-4xl text-slate-200 mb-4"></i>
      <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Selecciona un atleta para visualizar su huella digital</p>
    </div>
  );

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

      {/* TABLA DE EVALUACIONES INDIVIDUALES */}
      <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">Resumen de Evaluaciones y Categorías</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Listado de evaluaciones individuales con códigos de color de su categoría de rendimiento</p>
          </div>
          
          <div className="flex gap-4 items-center">
            <div className="flex gap-2 text-[9px] font-black uppercase tracking-wider bg-slate-50 p-2 rounded-2xl border border-slate-100">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>Excelente</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>Normal</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>Bajo</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto -mx-8 px-8 max-h-96 overflow-y-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-100 pb-3">
                <th className="text-[10px] font-black text-slate-400 uppercase tracking-widest pb-3 w-32">Fecha</th>
                <th className="text-[10px] font-black text-slate-400 uppercase tracking-widest pb-3 w-48">Tipo de Evaluación</th>
                <th className="text-[10px] font-black text-slate-400 uppercase tracking-widest pb-3">Métricas Obtenidas & Categoría</th>
                <th className="text-[10px] font-black text-slate-400 uppercase tracking-widest pb-3 w-48">Observaciones</th>
              </tr>
            </thead>
            <tbody>
              {parsedEvaluations.length > 0 ? (
                parsedEvaluations.map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 text-xs font-black text-slate-900 uppercase tracking-tight">{row.dateStr}</td>
                    <td className="py-3">
                      <span className="bg-slate-100 text-slate-800 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border border-slate-200">
                        {row.area}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {row.metrics.map((m, mIdx) => {
                          const status = getEvaluationCategory(m.key, m.value);
                          return (
                            <span 
                              key={mIdx} 
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-xl text-[9px] font-black uppercase tracking-wider border ${status.bg} ${status.text}`}
                              title={`${m.label}: ${m.value} ${m.unit} (${status.label})`}
                            >
                              <span className="opacity-70">{m.label}:</span>
                              <span>{m.value}{m.unit}</span>
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="py-3 text-[10px] text-slate-500 font-bold truncate max-w-[200px]" title={row.observations}>
                      {row.observations || '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-300 font-bold uppercase text-xs tracking-widest">
                    No hay evaluaciones registradas para este atleta
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {player && (
        <FichaOrientacionAtleta
          player={player as any}
          imtp={imtp}
          speed={speed}
          vo2max={vo2max}
          test505={test505}
          cmjRebound={cmjRebound}
          allPlayers={allPlayers}
          allImtp={allImtp}
          allSpeed={allSpeed}
          allVo2={allVo2}
          allTest505={allTest505}
          allCmjRebound={allCmjRebound}
        />
      )}

      {/* BLOQUES DINÁMICOS IMTP */}
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">Fuerza Máxima (IMTP) & Saltabilidad (CMJ)</h3>
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

        {latestImtpFuerza !== null && (
          <div className="bg-red-50 rounded-3xl p-6 border border-red-100 flex items-start gap-4 mt-4">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600 shrink-0">
              <i className="fa-solid fa-dumbbell text-sm"></i>
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Ficha de Orientación: Fuerza & Potencia</h4>
              <p className="text-[11px] text-slate-600 font-bold leading-relaxed">
                {latestImtpFuerza < 2800 && (latestCmjAltura === null || latestCmjAltura < 35) ? (
                  "Déficit combinado en Fuerza Máxima y Potencia. Se prescribe priorizar una base de fuerza estructural y fuerza máxima en el gimnasio (Sentadillas, IMTP al 75-85% 1RM) antes de programar bloques dinámicos/balísticos."
                ) : latestImtpFuerza >= 2800 && (latestCmjAltura !== null && latestCmjAltura < 35) ? (
                  "Nivel de Fuerza Máxima óptimo pero con baja transferencia a Potencia. Enfoca el programa de gimnasio en la tasa de desarrollo de fuerza (RFD), velocidad-fuerza y pliometría con cargas medias a ligeras (30-50% 1RM) a máxima intención concéntrica."
                ) : (
                  "Perfil competitivo de fuerza y saltabilidad. Continuar con el microciclo actual enfocado en el mantenimiento de la potencia dinámica y prevención."
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* BLOQUES DINÁMICOS VELOCIDAD */}
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">Velocidad (Sprint)</h3>
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

        {latestSpeedTotal !== null && (
          <div className="bg-amber-50 rounded-3xl p-6 border border-amber-100 flex items-start gap-4 mt-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <i className="fa-solid fa-person-running text-sm"></i>
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Ficha de Orientación: Velocidad / Sprint Lineal</h4>
              <p className="text-[11px] text-slate-600 font-bold leading-relaxed">
                {latestSpeedTotal > 4.40 ? (
                  "Nivel de velocidad lineal y aceleración por debajo del promedio. Se aconseja integrar series de sprints cortos (10-30m) con recuperación completa al inicio de la sesión, complementado con fuerza horizontal y arrastres de trineo en gimnasio."
                ) : (
                  "Perfil competitivo de velocidad lineal. Sostener la calidad técnica y mecánica actual, alternando con trabajos de agilidad y deceleración reactiva."
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* BLOQUES DINÁMICOS VO2 MAX */}
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">Capacidad Aeróbica (VO2 Max)</h3>
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

        {latestVo2Max !== null && (
          <div className="bg-indigo-50 rounded-3xl p-6 border border-indigo-100 flex items-start gap-4 mt-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <i className="fa-solid fa-lungs text-sm"></i>
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Ficha de Orientación: Capacidad Aeróbica (VO2 Max)</h4>
              <p className="text-[11px] text-slate-600 font-bold leading-relaxed">
                {latestVo2Max < 52 ? (
                  "Capacidad aeróbica subóptima para alta competencia. Se prescribe entrenamiento interválico de alta intensidad (HIIT - e.g. pasadas intermitentes en cancha de 15s al 105% VAM con 15s de pausa pasiva) para aumentar la potencia aeróbica y acelerar la recuperación entre esfuerzos de alta intensidad."
                ) : (
                  "Resistencia aeróbica óptima. Mantener el volumen general de trabajo y el estímulo intermitente específico en cancha."
                )}
              </p>
            </div>
          </div>
        )}
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

      {/* BLOQUES DINÁMICOS AGILIDAD */}
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">Agilidad & Cambios de Dirección (Test 505)</h3>
          <div className="h-px flex-1 bg-slate-100"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {selectedAgilityMetrics.map((metricKey, idx) => {
            const data = getMetricData(metricKey);
            const metricLabel = METRICS_OPTIONS.find(m => m.key === metricKey)?.label;

            return (
              <div key={idx} className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                    <span className={`w-2 h-6 rounded-full ${idx % 2 === 0 ? 'bg-sky-500' : 'bg-indigo-500'}`}></span>
                    {metricLabel}
                  </h3>
                  <select 
                    value={metricKey}
                    onChange={(e) => updateAgilityMetric(idx, e.target.value)}
                    className="bg-slate-50 border-none rounded-xl px-3 py-1.5 text-[10px] font-black text-slate-500 outline-none focus:ring-2 focus:ring-red-500 uppercase tracking-widest"
                  >
                    {agilityMetrics.map(opt => (
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
                          itemStyle={{ color: idx % 2 === 0 ? '#0ea5e9' : '#6366f1' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke={idx % 2 === 0 ? '#0ea5e9' : '#6366f1'} 
                          strokeWidth={4} 
                          dot={{ r: 4, fill: idx % 2 === 0 ? '#0ea5e9' : '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                          activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                      <i className="fa-solid fa-person-running text-3xl opacity-20"></i>
                      <p className="text-[10px] font-black uppercase tracking-widest">Sin datos registrados</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {latestAgilityCod !== null && (
          <div className="bg-sky-50 rounded-3xl p-6 border border-sky-100 flex items-start gap-4 mt-4">
            <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center text-sky-600 shrink-0">
              <i className="fa-solid fa-person-running text-sm"></i>
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Ficha de Orientación: Cambio de Dirección & Agilidad</h4>
              <p className="text-[11px] text-slate-600 font-bold leading-relaxed">
                {latestAgilityCod > 1.60 ? (
                  "Tiempo de cambio de dirección deficiente. Enfocar el entrenamiento en sobrecarga excéntrica de frenado (polea cónica, frenadas excéntricas con cinturón ruso) y técnica de re-aceleración en el primer paso en cancha."
                ) : (
                  "Excelente agilidad y control motor lateral. Mantener driles abiertos con toma de decisión cognitiva y reactiva ante estímulos visuales."
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* BLOQUES DINÁMICOS CMJ REBOUND */}
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">Fuerza Reactiva (CMJ Rebound)</h3>
          <div className="h-px flex-1 bg-slate-100"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {selectedReboundMetrics.map((metricKey, idx) => {
            const data = getMetricData(metricKey);
            const metricLabel = METRICS_OPTIONS.find(m => m.key === metricKey)?.label;

            return (
              <div key={idx} className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                    <span className={`w-2 h-6 rounded-full ${idx % 2 === 0 ? 'bg-red-500' : 'bg-rose-500'}`}></span>
                    {metricLabel}
                  </h3>
                  <select 
                    value={metricKey}
                    onChange={(e) => updateReboundMetric(idx, e.target.value)}
                    className="bg-slate-50 border-none rounded-xl px-3 py-1.5 text-[10px] font-black text-slate-500 outline-none focus:ring-2 focus:ring-red-500 uppercase tracking-widest"
                  >
                    {reboundMetrics.map(opt => (
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
                          itemStyle={{ color: idx % 2 === 0 ? '#ef4444' : '#f43f5e' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke={idx % 2 === 0 ? '#ef4444' : '#f43f5e'} 
                          strokeWidth={4} 
                          dot={{ r: 4, fill: idx % 2 === 0 ? '#ef4444' : '#f43f5e', strokeWidth: 2, stroke: '#fff' }}
                          activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                      <i className="fa-solid fa-arrows-up-down text-3xl opacity-20"></i>
                      <p className="text-[10px] font-black uppercase tracking-widest">Sin datos registrados</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {latestReboundRsi !== null && (
          <div className="bg-rose-50 rounded-3xl p-6 border border-rose-100 flex items-start gap-4 mt-4">
            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
              <i className="fa-solid fa-arrows-up-down text-sm"></i>
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Ficha de Orientación: Fuerza Reactiva & Elasticidad</h4>
              <p className="text-[11px] text-slate-600 font-bold leading-relaxed">
                {latestReboundRsi < 1.50 ? (
                  "Capacidad elástica/reactiva (stiffness de tobillo) deficiente. Priorizar pliometría reactiva rápida (contacto < 250ms, e.g. pogo jumps de tobillo continuos, rebotes continuos en cajón bajo) para optimizar el ciclo de estiramiento-acortamiento rápido (SSC)."
                ) : (
                  "Excelente reactividad y elasticidad muscular-tendinosa. Mantener la dosis actual con drop jumps de mayor altura y aceleraciones de alta velocidad."
                )}
              </p>
            </div>
          </div>
        )}
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

const SquadAnalytics = ({ 
  anios, posiciones, players, gps, speed, imtp, vo2max, antropometria, test505 = [], cmjRebound = [], selectedPlayerId = null
}: { 
  anios: number[], 
  posiciones: string[], 
  players: PlayerData[], 
  gps: GPSData[], 
  speed: SpeedTestData[], 
  imtp: IMTPData[], 
  vo2max: VO2MaxData[], 
  antropometria: AntropometriaData[],
  test505?: any[],
  cmjRebound?: CMJReboundData[],
  selectedPlayerId?: number | null
}) => {
  const [selectedImtpMetrics, setSelectedImtpMetrics] = useState<string[]>(['imtp_fuerza_n', 'imtp_f_relativa_n_kg']);
  const [selectedCmjMetrics, setSelectedCmjMetrics] = useState<string[]>(['cmj_rsi_mod', 'fuerza_cmj']);
  const [selectedReboundMetrics, setSelectedReboundMetrics] = useState<string[]>(['rebound_rsi', 'rebound_contact_time_ms']);
  const [selectedSpeedMetrics, setSelectedSpeedMetrics] = useState<string[]>(['tiempo_total', 'vel_10m']);
  const [selectedVo2Metrics, setSelectedVo2Metrics] = useState<string[]>(['vo2_max', 'vam']);
  const [selectedAgilityMetrics, setSelectedAgilityMetrics] = useState<string[]>(['t_cod_2m', 'vel_cod_kmh']);
  const [selectedAntroMetrics, setSelectedAntroMetrics] = useState<string[]>(['masa_adiposa_pct', 'masa_muscular_pct']);
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
      case 'test505': sourceData = test505; break;
      case 'rebound': sourceData = cmjRebound; break;
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

  const GaussianBellChart = ({ 
    metricKey, 
    table, 
    color 
  }: { 
    metricKey: string; 
    table: string; 
    color: string; 
  }) => {
    let sourceData: any[] = [];
    switch (table) {
      case 'imtp': sourceData = imtp; break;
      case 'speed': sourceData = speed; break;
      case 'vo2max': sourceData = vo2max; break;
      case 'antropometria': sourceData = antropometria; break;
      case 'test505': sourceData = test505; break;
      case 'rebound': sourceData = cmjRebound; break;
    }

    const playerIds = filteredPlayers.map(p => p.player_id);
    const relevantValues = sourceData
      .filter(d => playerIds.includes(d.player_id))
      .map(d => Number(d[metricKey]))
      .filter(v => v != null && !isNaN(v) && v > 0);

    if (relevantValues.length <= 1) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs gap-1.5 p-4 text-center">
          <i className="fa-solid fa-chart-line text-lg text-slate-300"></i>
          <span>Sin datos suficientes para calcular la Campana de Gauss</span>
        </div>
      );
    }

    const mean = relevantValues.reduce((sum, val) => sum + val, 0) / relevantValues.length;
    const variance = relevantValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (relevantValues.length - 1);
    const sd = Math.sqrt(variance);
    const finalSd = sd || (mean * 0.05 || 1);
    const cv = (finalSd / mean) * 100;

    const numPoints = 80;
    const startX = mean - 3 * finalSd;
    const endX = mean + 3 * finalSd;
    const step = (endX - startX) / (numPoints - 1);

    const chartData = [];
    for (let i = 0; i < numPoints; i++) {
      const x = startX + i * step;
      const exponent = -0.5 * Math.pow((x - mean) / finalSd, 2);
      const y = (1 / (finalSd * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
      
      chartData.push({
        x: Number(x.toFixed(2)),
        y: y,
      });
    }

    const positionAverages = ORDERED_POSITIONS.map(pos => {
      const posPlayerIds = filteredPlayers.filter(p => p.posicion === pos).map(p => p.player_id);
      const posVals = sourceData
        .filter(d => posPlayerIds.includes(d.player_id))
        .map(d => Number(d[metricKey]))
        .filter(v => v != null && !isNaN(v) && v > 0);
      const posMean = posVals.length > 0 ? posVals.reduce((sum, v) => sum + v, 0) / posVals.length : 0;
      return { name: pos, mean: posMean };
    }).filter(p => p.mean > 0);

    let playerValue: number | undefined = undefined;
    if (selectedPlayerId) {
      const playerRows = sourceData
        .filter(d => d.player_id === selectedPlayerId)
        .sort((a, b) => new Date(b.fecha || b.fecha_evaluacion || 0).getTime() - new Date(a.fecha || a.fecha_evaluacion || 0).getTime());
      if (playerRows.length > 0 && playerRows[0][metricKey] != null) {
        playerValue = Number(playerRows[0][metricKey]);
      }
    }

    const selectedPlayer = players.find(p => p.player_id === selectedPlayerId);
    const gradientId = `gaussGradient-${metricKey}`;

    return (
      <div className="h-full flex flex-col justify-between">
        <div className="flex-1 h-44 relative">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 30, right: 15, left: 15, bottom: 5 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                  {/* < -3σ (Extremo Izquierdo): 0,1% */}
                  <stop offset="0%" stopColor={color} stopOpacity={0.03} />
                  <stop offset="7.14%" stopColor={color} stopOpacity={0.03} />
                  
                  {/* -3σ a -2σ (Externo Izquierdo): 2,1% */}
                  <stop offset="7.14%" stopColor={color} stopOpacity={0.15} />
                  <stop offset="21.43%" stopColor={color} stopOpacity={0.15} />
                  
                  {/* -2σ a -1σ (Medio Izquierdo): 13,6% */}
                  <stop offset="21.43%" stopColor={color} stopOpacity={0.4} />
                  <stop offset="35.71%" stopColor={color} stopOpacity={0.4} />
                  
                  {/* -1σ a μ (Interno Izquierdo): 34,1% */}
                  <stop offset="35.71%" stopColor={color} stopOpacity={0.75} />
                  <stop offset="50%" stopColor={color} stopOpacity={0.75} />
                  
                  {/* μ a 1σ (Interno Derecho): 34,1% */}
                  <stop offset="50%" stopColor={color} stopOpacity={0.75} />
                  <stop offset="64.29%" stopColor={color} stopOpacity={0.75} />
                  
                  {/* 1σ a 2σ (Medio Derecho): 13,6% */}
                  <stop offset="64.29%" stopColor={color} stopOpacity={0.4} />
                  <stop offset="78.57%" stopColor={color} stopOpacity={0.4} />
                  
                  {/* 2σ a 3σ (Externo Derecho): 2,1% */}
                  <stop offset="78.57%" stopColor={color} stopOpacity={0.15} />
                  <stop offset="92.86%" stopColor={color} stopOpacity={0.15} />
                  
                  {/* > 3σ (Extremo Derecho): 0,1% */}
                  <stop offset="92.86%" stopColor={color} stopOpacity={0.03} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="x" 
                type="number" 
                domain={[startX, endX]} 
                fontSize={9} 
                fontWeight={800} 
                stroke="#94a3b8"
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v.toLocaleString('es-ES', { maximumFractionDigits: 1 })}
              />
              <YAxis hide domain={[0, 'auto']} />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const xVal = payload[0].payload.x;
                    return (
                      <div className="bg-white p-3 rounded-xl shadow-xl border border-slate-100 text-[9px] font-black uppercase tracking-widest space-y-1">
                        <p className="text-slate-950 font-bold">Valor: {xVal.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</p>
                        <p className="text-slate-400">Densidad: {payload[0].value?.toLocaleString('es-ES', { maximumFractionDigits: 5 })}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area 
                type="monotone" 
                dataKey="y" 
                stroke={color} 
                strokeWidth={3} 
                fill={`url(#${gradientId})`} 
                isAnimationActive={false}
              />
              
              {/* Líneas de Desviación Estándar (Dashed White) */}
              <ReferenceLine 
                x={mean - 3 * finalSd} 
                stroke="#ffffff" 
                strokeWidth={1.5} 
                strokeDasharray="3 3"
                label={{ value: '-3σ', position: 'top', fill: '#94a3b8', fontSize: 9, fontWeight: 900 }} 
              />
              <ReferenceLine 
                x={mean - 2 * finalSd} 
                stroke="#ffffff" 
                strokeWidth={1.5} 
                strokeDasharray="3 3"
                label={{ value: '-2σ', position: 'top', fill: '#94a3b8', fontSize: 9, fontWeight: 900 }} 
              />
              <ReferenceLine 
                x={mean - finalSd} 
                stroke="#ffffff" 
                strokeWidth={1.5} 
                strokeDasharray="3 3"
                label={{ value: '-1σ', position: 'top', fill: '#64748b', fontSize: 9, fontWeight: 900 }} 
              />
              <ReferenceLine 
                x={mean} 
                stroke="#ffffff" 
                strokeWidth={2.5} 
                strokeDasharray="3 3"
                label={{ value: 'μ', position: 'top', fill: '#334155', fontSize: 11, fontWeight: 900 }} 
              />
              <ReferenceLine 
                x={mean + finalSd} 
                stroke="#ffffff" 
                strokeWidth={1.5} 
                strokeDasharray="3 3"
                label={{ value: '1σ', position: 'top', fill: '#64748b', fontSize: 9, fontWeight: 900 }} 
              />
              <ReferenceLine 
                x={mean + 2 * finalSd} 
                stroke="#ffffff" 
                strokeWidth={1.5} 
                strokeDasharray="3 3"
                label={{ value: '2σ', position: 'top', fill: '#94a3b8', fontSize: 9, fontWeight: 900 }} 
              />
              <ReferenceLine 
                x={mean + 3 * finalSd} 
                stroke="#ffffff" 
                strokeWidth={1.5} 
                strokeDasharray="3 3"
                label={{ value: '3σ', position: 'top', fill: '#94a3b8', fontSize: 9, fontWeight: 900 }} 
              />

              {/* Etiquetas de Porcentaje por Sector (Transparent anchors) */}
              <ReferenceLine 
                x={mean - 3.25 * finalSd} 
                stroke="none" 
                label={{ value: '0,1%', position: 'insideBottom', fill: '#64748b', fontSize: 8, fontWeight: 950 }} 
              />
              <ReferenceLine 
                x={mean - 2.5 * finalSd} 
                stroke="none" 
                label={{ value: '2,1%', position: 'insideBottom', fill: '#475569', fontSize: 8, fontWeight: 950 }} 
              />
              <ReferenceLine 
                x={mean - 1.5 * finalSd} 
                stroke="none" 
                label={{ value: '13,6%', position: 'insideBottom', fill: '#1e293b', fontSize: 8, fontWeight: 950 }} 
              />
              <ReferenceLine 
                x={mean - 0.5 * finalSd} 
                stroke="none" 
                label={{ value: '34,1%', position: 'insideBottom', fill: '#ffffff', fontSize: 8, fontWeight: 950 }} 
              />
              <ReferenceLine 
                x={mean + 0.5 * finalSd} 
                stroke="none" 
                label={{ value: '34,1%', position: 'insideBottom', fill: '#ffffff', fontSize: 8, fontWeight: 950 }} 
              />
              <ReferenceLine 
                x={mean + 1.5 * finalSd} 
                stroke="none" 
                label={{ value: '13,6%', position: 'insideBottom', fill: '#1e293b', fontSize: 8, fontWeight: 950 }} 
              />
              <ReferenceLine 
                x={mean + 2.5 * finalSd} 
                stroke="none" 
                label={{ value: '2,1%', position: 'insideBottom', fill: '#475569', fontSize: 8, fontWeight: 950 }} 
              />
              <ReferenceLine 
                x={mean + 3.25 * finalSd} 
                stroke="none" 
                label={{ value: '0,1%', position: 'insideBottom', fill: '#64748b', fontSize: 8, fontWeight: 950 }} 
              />
              {playerValue !== undefined && !isNaN(playerValue) && playerValue > 0 && (
                <ReferenceLine 
                  x={playerValue} 
                  stroke="#ef4444" 
                  strokeWidth={2.5}
                  label={{ 
                    value: selectedPlayer ? ((selectedPlayer as any).apodo || selectedPlayer.nombre).toUpperCase() : 'ATLETA', 
                    position: 'insideTop', 
                    fill: '#b91c1c', 
                    fontSize: 8, 
                    fontWeight: 950,
                  }} 
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-4 gap-1.5 bg-slate-50 p-2 rounded-2xl border border-slate-100/60 text-center mt-2">
          <div>
            <p className="text-[6px] font-black uppercase text-slate-400 tracking-wider">Media</p>
            <p className="text-[9px] font-black text-slate-700 italic">{mean.toLocaleString('es-ES', { maximumFractionDigits: 1 })}</p>
          </div>
          <div>
            <p className="text-[6px] font-black uppercase text-slate-400 tracking-wider">Desv. Est. (SD)</p>
            <p className="text-[9px] font-black text-slate-700 italic">±{finalSd.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="text-[6px] font-black uppercase text-slate-400 tracking-wider">CV (Homogen.)</p>
            <p className={`text-[9px] font-black italic ${cv < 10 ? 'text-emerald-600' : cv < 20 ? 'text-blue-600' : 'text-amber-600'}`}>
              {cv.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-[6px] font-black uppercase text-slate-400 tracking-wider">Rango Normal</p>
            <p className="text-[8px] font-black text-slate-500">
              {(mean - finalSd).toLocaleString('es-ES', { maximumFractionDigits: 0 })} - {(mean + finalSd).toLocaleString('es-ES', { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>
      </div>
    );
  };


  const imtpOptions = METRICS_OPTIONS.filter(m => m.table === 'imtp' && (m.key.startsWith('imtp_') || m.key === 'peso'));
  const cmjOptions = METRICS_OPTIONS.filter(m => m.table === 'imtp' && !m.key.startsWith('imtp_') && m.key !== 'peso');
  const reboundOptions = METRICS_OPTIONS.filter(m => m.table === 'rebound');
  const speedOptions = METRICS_OPTIONS.filter(m => m.table === 'speed');
  const vo2Options = METRICS_OPTIONS.filter(m => m.table === 'vo2max');
  const agilityOptions = METRICS_OPTIONS.filter(m => m.table === 'test505');
  const antroOptions = METRICS_OPTIONS.filter(m => m.table === 'antropometria');

  return (
    <div className="space-y-12">
      {/* 1. EVALUACIÓN DE FUERZA MÁXIMA - IMTP */}
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">Evaluación de Fuerza Máxima - IMTP</h3>
          <div className="h-px flex-1 bg-slate-100"></div>
        </div>
        <div className="grid grid-cols-1 gap-8">
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
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3">Distribución Normal (Campana de Gauss)</p>
                    <div className="h-72">
                      <GaussianBellChart metricKey={metricKey} table="imtp" color="#ef4444" />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3">Distribución por Posición (Gráfico de Caja)</p>
                    <div className="h-72">
                      <BoxPlotChart data={getBoxPlotData(metricKey, 'imtp')} color="#ef4444" />
                    </div>
                  </div>
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

      {/* 2. EVALUACIÓN DE POTENCIA Y SALTABILIDAD - CMJ */}
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">Evaluación de Potencia y Saltabilidad - CMJ</h3>
          <div className="h-px flex-1 bg-slate-100"></div>
        </div>
        <div className="grid grid-cols-1 gap-8">
          {selectedCmjMetrics.map((metricKey, idx) => {
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
                      className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${loadingSummaries[metricKey] ? 'bg-slate-100 text-slate-400 animate-pulse' : 'bg-pink-50 text-pink-500 hover:bg-pink-500 hover:text-white'}`}
                      title="Generar resumen con IA"
                    >
                      <i className={`fa-solid ${loadingSummaries[metricKey] ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'} text-[10px]`}></i>
                    </button>
                  </div>
                  <select 
                    value={metricKey}
                    onChange={(e) => {
                      const next = [...selectedCmjMetrics];
                      next[idx] = e.target.value;
                      setSelectedCmjMetrics(next);
                      if (summaries[metricKey]) {
                        const newSummaries = { ...summaries };
                        delete newSummaries[metricKey];
                        setSummaries(newSummaries);
                      }
                    }}
                    className="bg-slate-50 border-none rounded-xl px-3 py-1.5 text-[10px] font-black text-slate-500 outline-none focus:ring-2 focus:ring-pink-500 uppercase tracking-widest"
                  >
                    {cmjOptions.map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                  </select>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3">Distribución Normal (Campana de Gauss)</p>
                    <div className="h-72">
                      <GaussianBellChart metricKey={metricKey} table="imtp" color="#ec4899" />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3">Distribución por Posición (Gráfico de Caja)</p>
                    <div className="h-72">
                      <BoxPlotChart data={getBoxPlotData(metricKey, 'imtp')} color="#ec4899" />
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {summaries[metricKey] && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-1 h-full bg-pink-500"></div>
                      <div className="flex items-start gap-3">
                        <i className="fa-solid fa-robot text-pink-500 mt-1 text-xs"></i>
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

      {/* 3. EVALUACIÓN DE REACTIVIDAD Y REBOTE - CMJ REBOUND */}
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">Evaluación de Reactividad y Rebote - CMJ Rebound</h3>
          <div className="h-px flex-1 bg-slate-100"></div>
        </div>
        <div className="grid grid-cols-1 gap-8">
          {selectedReboundMetrics.map((metricKey, idx) => {
            const label = METRICS_OPTIONS.find(m => m.key === metricKey)?.label || '';
            return (
              <div key={idx} className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 relative group">
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {label}
                    </h4>
                    <button 
                      onClick={() => handleGenerateSummary(metricKey, 'rebound', label)}
                      disabled={loadingSummaries[metricKey]}
                      className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${loadingSummaries[metricKey] ? 'bg-slate-100 text-slate-400 animate-pulse' : 'bg-violet-50 text-violet-500 hover:bg-violet-500 hover:text-white'}`}
                      title="Generar resumen con IA"
                    >
                      <i className={`fa-solid ${loadingSummaries[metricKey] ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'} text-[10px]`}></i>
                    </button>
                  </div>
                  <select 
                    value={metricKey}
                    onChange={(e) => {
                      const next = [...selectedReboundMetrics];
                      next[idx] = e.target.value;
                      setSelectedReboundMetrics(next);
                      if (summaries[metricKey]) {
                        const newSummaries = { ...summaries };
                        delete newSummaries[metricKey];
                        setSummaries(newSummaries);
                      }
                    }}
                    className="bg-slate-50 border-none rounded-xl px-3 py-1.5 text-[10px] font-black text-slate-500 outline-none focus:ring-2 focus:ring-violet-500 uppercase tracking-widest"
                  >
                    {reboundOptions.map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                  </select>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3">Distribución Normal (Campana de Gauss)</p>
                    <div className="h-72">
                      <GaussianBellChart metricKey={metricKey} table="rebound" color="#8b5cf6" />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3">Distribución por Posición (Gráfico de Caja)</p>
                    <div className="h-72">
                      <BoxPlotChart data={getBoxPlotData(metricKey, 'rebound')} color="#8b5cf6" />
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {summaries[metricKey] && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-1 h-full bg-violet-500"></div>
                      <div className="flex items-start gap-3">
                        <i className="fa-solid fa-robot text-violet-500 mt-1 text-xs"></i>
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

      {/* 4. EVALUACIÓN DE VELOCIDAD Y SPRINT LINEAL */}
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">Evaluación de Velocidad y Sprint Lineal</h3>
          <div className="h-px flex-1 bg-slate-100"></div>
        </div>
        <div className="grid grid-cols-1 gap-8">
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
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3">Distribución Normal (Campana de Gauss)</p>
                    <div className="h-72">
                      <GaussianBellChart metricKey={metricKey} table="speed" color="#f59e0b" />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3">Distribución por Posición (Gráfico de Caja)</p>
                    <div className="h-72">
                      <BoxPlotChart data={getBoxPlotData(metricKey, 'speed')} color="#f59e0b" />
                    </div>
                  </div>
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

      {/* 5. EVALUACIÓN AERÓBICA - VO2 MÁX */}
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">Evaluación Aeróbica (UNCATEST) - VO2 Máx</h3>
          <div className="h-px flex-1 bg-slate-100"></div>
        </div>
        <div className="grid grid-cols-1 gap-8">
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
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3">Distribución Normal (Campana de Gauss)</p>
                    <div className="h-72">
                      <GaussianBellChart metricKey={metricKey} table="vo2max" color="#6366f1" />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3">Distribución por Posición (Gráfico de Caja)</p>
                    <div className="h-72">
                      <BoxPlotChart data={getBoxPlotData(metricKey, 'vo2max')} color="#6366f1" />
                    </div>
                  </div>
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

      {/* 6. EVALUACIÓN DE CAMBIO DE DIRECCIÓN - TEST 505 */}
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">Evaluación de Cambio de Dirección - Test 505</h3>
          <div className="h-px flex-1 bg-slate-100"></div>
        </div>
        <div className="grid grid-cols-1 gap-8">
          {selectedAgilityMetrics.map((metricKey, idx) => {
            const label = METRICS_OPTIONS.find(m => m.key === metricKey)?.label || '';
            return (
              <div key={idx} className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 relative group">
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {label}
                    </h4>
                    <button 
                      onClick={() => handleGenerateSummary(metricKey, 'test505', label)}
                      disabled={loadingSummaries[metricKey]}
                      className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${loadingSummaries[metricKey] ? 'bg-slate-100 text-slate-400 animate-pulse' : 'bg-cyan-50 text-cyan-500 hover:bg-cyan-500 hover:text-white'}`}
                      title="Generar resumen con IA"
                    >
                      <i className={`fa-solid ${loadingSummaries[metricKey] ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'} text-[10px]`}></i>
                    </button>
                  </div>
                  <select 
                    value={metricKey}
                    onChange={(e) => {
                      const next = [...selectedAgilityMetrics];
                      next[idx] = e.target.value;
                      setSelectedAgilityMetrics(next);
                      if (summaries[metricKey]) {
                        const newSummaries = { ...summaries };
                        delete newSummaries[metricKey];
                        setSummaries(newSummaries);
                      }
                    }}
                    className="bg-slate-50 border-none rounded-xl px-3 py-1.5 text-[10px] font-black text-slate-500 outline-none focus:ring-2 focus:ring-cyan-500 uppercase tracking-widest"
                  >
                    {agilityOptions.map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                  </select>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3">Distribución Normal (Campana de Gauss)</p>
                    <div className="h-72">
                      <GaussianBellChart metricKey={metricKey} table="test505" color="#06b6d4" />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3">Distribución por Posición (Gráfico de Caja)</p>
                    <div className="h-72">
                      <BoxPlotChart data={getBoxPlotData(metricKey, 'test505')} color="#06b6d4" />
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {summaries[metricKey] && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500"></div>
                      <div className="flex items-start gap-3">
                        <i className="fa-solid fa-robot text-cyan-500 mt-1 text-xs"></i>
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

      {/* 7. MÉTRICAS ANTROPOMÉTRICAS */}
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">Métricas Antropométricas</h3>
          <div className="h-px flex-1 bg-slate-100"></div>
        </div>
        <div className="grid grid-cols-1 gap-8">
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
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3">Distribución Normal (Campana de Gauss)</p>
                    <div className="h-72">
                      <GaussianBellChart metricKey={metricKey} table="antropometria" color="#10b981" />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3">Distribución por Posición (Gráfico de Caja)</p>
                    <div className="h-72">
                      <BoxPlotChart data={getBoxPlotData(metricKey, 'antropometria')} color="#10b981" />
                    </div>
                  </div>
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

const Categorias = ({ 
  players, 
  imtp, 
  speed, 
  vo2max, 
  antropometria, 
  selectedAnios, 
  selectedPosiciones,
  cmjReboundData = [],
  test505Data = []
}: { 
  players: PlayerData[], 
  imtp: IMTPData[], 
  speed: SpeedTestData[], 
  vo2max: VO2MaxData[], 
  antropometria: AntropometriaData[],
  selectedAnios: number[],
  selectedPosiciones: string[],
  cmjReboundData?: CMJReboundData[],
  test505Data?: any[]
}) => {
  const [metric1, setMetric1] = useState('imtp_fuerza_n');
  const [metric2, setMetric2] = useState('concentric_peak_force_n');
  const [metric3, setMetric3] = useState('tiempo_total');
  const [metric4, setMetric4] = useState('vo2_max');
  const [metric5, setMetric5] = useState('masa_adiposa_pct');

  const [mode1, setMode1] = useState<'estadisticos' | 'percentiles'>('estadisticos');
  const [mode2, setMode2] = useState<'estadisticos' | 'percentiles'>('estadisticos');
  const [mode3, setMode3] = useState<'estadisticos' | 'percentiles'>('estadisticos');
  const [mode4, setMode4] = useState<'estadisticos' | 'percentiles'>('estadisticos');
  const [mode5, setMode5] = useState<'estadisticos' | 'percentiles'>('estadisticos');

  const BOX1_METRICS = [
    { label: 'IMTP Fuerza Máxima (N)', key: 'imtp_fuerza_n' },
    { label: 'IMTP Fuerza Relativa (N/kg)', key: 'imtp_f_relativa_n_kg' },
    { label: 'IMTP Fuerza neta 50ms (N)', key: 'imtp_force_50ms' },
    { label: 'IMTP Fuerza neta 100ms (N)', key: 'imtp_force_100ms' },
    { label: 'IMTP Fuerza neta 150ms (N)', key: 'imtp_force_150ms' },
    { label: 'IMTP Fuerza neta 200ms (N)', key: 'imtp_force_200ms' },
    { label: 'IMTP RFD 100ms (N/s)', key: 'imtp_rfd_100ms' },
    { label: 'IMTP RFD 150ms (N/s)', key: 'imtp_rfd_150ms' },
    { label: 'IMTP RFD 200ms (N/s)', key: 'imtp_rfd_200ms' },
    { label: 'IMTP Asimetría (%)', key: 'imtp_asimetria', lowerIsBetter: true },
    { label: 'IMTP Débil', key: 'imtp_debil' }
  ];

  const BOX2_METRICS = [
    { label: 'CMJ Fuerza Pico Conc. (N)', key: 'concentric_peak_force_n' },
    { label: 'CMJ RSI Modificado (m/s)', key: 'rsi_modified_m_s' },
    { label: 'CMJ Altura Salto (cm)', key: 'jump_height_impmom_cm' },
    { label: 'CMJ Pot. Pico Relativa (W/kg)', key: 'peak_power_bm_w_kg' },
    { label: 'CMJ Profundidad (cm)', key: 'countermovement_depth_cm' },
    { label: 'CMJ Duración Conc. (ms)', key: 'concentric_duration_ms', lowerIsBetter: true },
    { label: 'CMJ Impulso Conc. (Ns)', key: 'concentric_impulse_ns' },
    { label: 'CMJ Momento Despegue (kg·m/s)', key: 'take_off_momentum_kg_m_s' },
    { label: 'CMJ Rebound RSI', key: 'rebound_rsi' },
    { label: 'T. Contacto Rebound (ms)', key: 'rebound_contact_time_ms', lowerIsBetter: true },
    { label: 'T. Vuelo Rebound (ms)', key: 'rebound_flight_time_ms' }
  ];

  const BOX3_METRICS = [
    { label: 'Velocidad Tiempo Total (s)', key: 'tiempo_total', lowerIsBetter: true },
    { label: 'Velocidad 10m Tiempo (s)', key: 'tiempo_10m', lowerIsBetter: true },
    { label: 'Velocidad 10m Promedio (km/h)', key: 'vel_10m' },
    { label: 'Velocidad 10-20m Tiempo (s)', key: 'tiempo_10_20m', lowerIsBetter: true },
    { label: 'Velocidad 10-20m Promedio (km/h)', key: 'vel_10_20m' },
    { label: 'Velocidad 20-30m Tiempo (s)', key: 'tiempo_20_30m', lowerIsBetter: true },
    { label: 'Velocidad 20-30m Promedio (km/h)', key: 'vel_20_30m' },
    { label: '505 Tiempo Acel. 2m (s)', key: 't_acel_2m', lowerIsBetter: true },
    { label: '505 Vel. Acel. (km/h)', key: 'vel_acel_kmh' },
    { label: '505 Tiempo Desacel. 2m (s)', key: 't_desacel_2m', lowerIsBetter: true },
    { label: '505 Vel. Desacel. (km/h)', key: 'vel_desacel_kmh' },
    { label: '505 Tiempo COD 2m (s)', key: 't_cod_2m', lowerIsBetter: true },
    { label: '505 Vel. COD (km/h)', key: 'vel_cod_kmh' },
    { label: '505 Tiempo Re-acel 1 (s)', key: 't_reacel_1_2m', lowerIsBetter: true },
    { label: '505 Vel. Re-acel 1 (km/h)', key: 'vel_reacel_1_kmh' },
    { label: '505 Tiempo Re-acel 2 (s)', key: 't_reacel_2_2m', lowerIsBetter: true },
    { label: '505 Vel. Re-acel 2 (km/h)', key: 'vel_reacel_2_kmh' },
    { label: '505 Z-Score Aceleración', key: 'z_score_acel' }
  ];

  const BOX4_METRICS = [
    { label: 'Consumo Máx Oxígeno (VO2)', key: 'vo2_max' },
    { label: 'Vel. Aeróbica Máx (VAM)', key: 'vam' },
    { label: 'Velocidad VT1 (km/h)', key: 'vt1_vel' },
    { label: 'Frec. Cardíaca VT1 (bpm)', key: 'vt1_fc' },
    { label: 'Velocidad VT2 (km/h)', key: 'vt2_vel' },
    { label: 'Frec. Cardíaca VT2 (bpm)', key: 'vt2_fc' },
    { label: 'Frec. Cardíaca Máx (bpm)', key: 'fc_max' },
    { label: 'Vel. Final de Prueba (VFA)', key: 'vfa' },
    { label: 'Nivel Alcanzado', key: 'nivel' },
    { label: 'Pasada Alcanzada', key: 'pasada' },
    { label: 'Metros Recorridos (m)', key: 'mts' }
  ];

  const BOX5_METRICS = [
    { label: '% Grasa Corporal', key: 'masa_adiposa_pct', lowerIsBetter: true },
    { label: '% Masa Muscular', key: 'masa_muscular_pct' },
    { label: '% Masa Ósea', key: 'masa_osea_pct' },
    { label: 'Suma 6 Pliegues (mm)', key: 'sum_pliegues_6_mm', lowerIsBetter: true },
    { label: 'Suma 8 Pliegues (mm)', key: 'sum_pliegues_8_mm', lowerIsBetter: true },
    { label: 'Peso Corporal (kg)', key: 'masa_corporal_kg' },
    { label: 'Talla (cm)', key: 'talla_cm' },
    { label: 'Talla Sentado (cm)', key: 'talla_sentada_cm' },
    { label: 'Masa Muscular (kg)', key: 'masa_muscular_kg' },
    { label: 'Masa Adiposa (kg)', key: 'masa_adiposa_kg', lowerIsBetter: true },
    { label: 'Masa Ósea (kg)', key: 'masa_osea_kg' },
    { label: 'Índice IMO', key: 'indice_imo' },
    { label: 'Índice IMC', key: 'indice_imc' },
    { label: 'Somatotipo Endomorfo', key: 'somatotipo_endo' },
    { label: 'Somatotipo Mesomorfo', key: 'somatotipo_meso' },
    { label: 'Somatotipo Ectomorfo', key: 'somatotipo_ecto' },
    { label: 'Maduración Media', key: 'maduracion_media' },
    { label: 'PHV Media', key: 'phv_media' },
    { label: 'Estatura Proyectada (cm)', key: 'estatura_proy_media_cm' }
  ];

  const ALL_METRICS_LIST = [...BOX1_METRICS, ...BOX2_METRICS, ...BOX3_METRICS, ...BOX4_METRICS, ...BOX5_METRICS];

  const getValueForPlayer = (playerId: number, metricKey: string) => {
    let records: any[] = [];
    let dateField = 'fecha';

    const isIMTP = [
      'imtp_fuerza_n', 'imtp_f_relativa_n_kg', 'imtp_asimetria', 'imtp_debil', 'imtp_force_50ms', 'imtp_force_100ms', 'imtp_force_150ms', 'imtp_force_200ms', 'imtp_rfd_100ms', 'imtp_rfd_150ms', 'imtp_rfd_200ms',
      'fuerza_cmj', 'cmj_rsi_mod', 'cmj_altura_salto_im', 'cmj_peak_pot_relativa',
      'concentric_peak_force_n', 'rsi_modified_m_s', 'jump_height_impmom_cm', 'peak_power_bm_w_kg', 'countermovement_depth_cm', 'concentric_duration_ms', 'concentric_impulse_ns', 'take_off_momentum_kg_m_s', 'peak_power_w'
    ].includes(metricKey);

    const isCmjRebound = [
      'rebound_rsi', 'rebound_contact_time_ms', 'rebound_flight_time_ms'
    ].includes(metricKey);

    const isSpeed = [
      'tiempo_10m', 'vel_10m', 'tiempo_10_20m', 'vel_10_20m', 'tiempo_20_30m', 'vel_20_30m', 'tiempo_total', 'vel_max_kmh'
    ].includes(metricKey);

    const is505 = [
      't_acel_2m', 'vel_acel_kmh', 't_desacel_2m', 'vel_desacel_kmh', 't_cod_2m', 'vel_cod_kmh', 't_reacel_1_2m', 'vel_reacel_1_kmh', 't_reacel_2_2m', 'vel_reacel_2_kmh', 'z_score_acel'
    ].includes(metricKey);

    const isVO2 = [
      'vo2_max', 'vam', 'fc_max', 'nivel', 'pasada', 'mts', 'vfa', 'vt1_vel', 'vt1_pct', 'vt1_fc', 'vt2_vel', 'vt2_pct', 'vt2_fc'
    ].includes(metricKey);

    const isAntro = [
      'masa_adiposa_pct', 'masa_corporal_kg', 'talla_cm', 'talla_sentada_cm', 'masa_muscular_pct', 'masa_osea_pct', 'sum_pliegues_6_mm', 'sum_pliegues_8_mm', 'indice_imo', 'indice_imc', 'masa_muscular_kg', 'masa_adiposa_kg', 'masa_osea_kg', 'somatotipo_endo', 'somatotipo_meso', 'somatotipo_ecto', 'maduracion_media', 'phv_media', 'estatura_proy_media_cm'
    ].includes(metricKey);

    if (isIMTP) {
      records = imtp;
      dateField = 'fecha_test';
    } else if (isCmjRebound) {
      records = cmjReboundData;
      dateField = 'fecha_test';
    } else if (isSpeed) {
      records = speed;
      dateField = 'fecha';
    } else if (is505) {
      records = test505Data;
      dateField = 'fecha';
    } else if (isVO2) {
      records = vo2max;
      dateField = 'fecha';
    } else if (isAntro) {
      records = antropometria;
      dateField = 'fecha_medicion';
    }

    const sorted = records
      .filter(r => Number(r.player_id) === Number(playerId))
      .sort((a, b) => new Date(b[dateField]).getTime() - new Date(a[dateField]).getTime());

    for (const r of sorted) {
      let val = r[metricKey];
      if (val === undefined || val === null || val === '') {
        if (metricKey === 'imtp_fuerza_n') val = r['Peak Vertical Force [N]'];
        if (metricKey === 'imtp_f_relativa_n_kg') val = r['Peak Vertical Force / BM'] || r['Peak Vertical Force / BM [N/kg]'];
        if (metricKey === 'imtp_force_50ms') val = r['Force (Net of BW) at 50ms'] || r['Force (Net of BW) at 50ms [N]'];
        if (metricKey === 'imtp_force_100ms') val = r['Force (Net of BW) at 100ms'] || r['Force (Net of BW) at 100ms [N]'];
        if (metricKey === 'imtp_force_150ms') val = r['Force (Net of BW) at 150ms'] || r['Force (Net of BW) at 150ms [N]'];
        if (metricKey === 'imtp_force_200ms') val = r['Force (Net of BW) at 200ms'] || r['Force (Net of BW) at 200ms [N]'];
        if (metricKey === 'imtp_rfd_100ms') val = r['RFD - 100ms [N/s]'];
        if (metricKey === 'imtp_rfd_150ms') val = r['RFD - 150ms [N/s]'];
        if (metricKey === 'imtp_rfd_200ms') val = r['RFD - 200ms [N/s]'];

        if (metricKey === 'concentric_peak_force_n') val = r.fuerza_cmj;
        if (metricKey === 'rsi_modified_m_s') val = r.cmj_rsi_mod;
        if (metricKey === 'jump_height_impmom_cm') val = r.cmj_altura_salto_im;
      }
      if (val !== null && val !== undefined && val !== '') {
        const valNum = Number(val);
        if (!isNaN(valNum)) {
          return valNum;
        }
      }
    }
    return undefined;
  };

  const calculateStats = (metricKey: string) => {
    const filteredPlayers = players.filter(p => {
      const pYear = (p as any).anio ? Number((p as any).anio) : new Date(p.fecha_nacimiento).getFullYear();
      const yearMatch = selectedAnios.length === 0 || selectedAnios.includes(pYear);
      const posMatch = selectedPosiciones.length === 0 || selectedPosiciones.includes(p.posicion);
      return yearMatch && posMatch;
    });

    const values = filteredPlayers.map(p => {
      const val = getValueForPlayer(p.player_id, metricKey);
      return val !== undefined ? Number(val) : null;
    }).filter((v): v is number => v !== null && !isNaN(v));

    if (values.length === 0) return null;

    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(values.map(x => Math.pow(x - avg, 2)).reduce((a, b) => a + b, 0) / values.length);

    const optionInfo = ALL_METRICS_LIST.find(o => o.key === metricKey) as { label: string; key: string; lowerIsBetter?: boolean } | undefined;
    const isInverted = optionInfo?.lowerIsBetter || [
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
      const val = getValueForPlayer(p.player_id, metricKey);
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

    const optionInfo = ALL_METRICS_LIST.find(o => o.key === metricKey) as { label: string; key: string; lowerIsBetter?: boolean } | undefined;
    const isInverted = optionInfo?.lowerIsBetter || [
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

  const renderUnifiedAnalysisBox = (
    metricKey: string,
    setMetric: (val: string) => void,
    title: string,
    subtitle: string,
    options: { label: string, key: string, lowerIsBetter?: boolean }[],
    mode: 'estadisticos' | 'percentiles',
    setMode: (m: 'estadisticos' | 'percentiles') => void,
    accentColorClass: string = 'bg-red-600'
  ) => {
    const stats = calculateStats(metricKey);
    const pStats = calculatePercentileStats(metricKey);
    const isPercentile = mode === 'percentiles';

    return (
      <div className="bg-white rounded-[40px] p-6 md:p-8 shadow-sm border border-slate-100 flex flex-col justify-between transition-all hover:shadow-md">
        <div>
          {/* HEADER */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3.5">
              <div className={`w-2.5 h-8 ${accentColorClass} rounded-full`}></div>
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tighter italic leading-none">{title}</h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{subtitle}</p>
              </div>
            </div>
            
            {/* TOGGLE MODE */}
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setMode('estadisticos')}
                className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all ${
                  !isPercentile 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Estadísticos
              </button>
              <button
                onClick={() => setMode('percentiles')}
                className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all ${
                  isPercentile 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Percentiles
              </button>
            </div>
          </div>

          {/* SELECT METRIC */}
          <div className="mb-8">
            <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Seleccionar Métrica</label>
            <select 
              value={metricKey}
              onChange={(e) => setMetric(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-black text-slate-600 outline-none focus:ring-2 focus:ring-red-500 uppercase tracking-widest transition-all"
            >
              {options.map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
            </select>
          </div>

          {/* DATA PRESENTATION */}
          {(!stats || !pStats) ? (
            <div className="flex flex-col items-center justify-center py-16 bg-slate-50 rounded-[32px] border border-dashed border-slate-200">
              <i className="fa-solid fa-chart-line text-slate-300 text-3xl mb-3"></i>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sin datos suficientes</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* RESUMEN METRICAS PRINCIPALES */}
              {!isPercentile ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900 rounded-3xl p-5 text-white">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Promedio (μ)</p>
                    <p className="text-2xl font-black italic tracking-tighter">
                      {(stats.avg != null && !isNaN(Number(stats.avg))) ? Number(stats.avg).toFixed(2) : '-'}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-3xl p-5 border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Desv. Estándar (σ)</p>
                    <p className="text-2xl font-black italic tracking-tighter text-slate-900">
                      ±{(stats.std != null && !isNaN(Number(stats.std))) ? Number(stats.std).toFixed(2) : '0.00'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900 rounded-3xl p-5 text-white">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Mediana (P50)</p>
                    <p className="text-2xl font-black italic tracking-tighter">
                      {(pStats.p50 != null && !isNaN(Number(pStats.p50))) ? Number(pStats.p50).toFixed(2) : '-'}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-3xl p-5 border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Élite (P90)</p>
                    <p className="text-2xl font-black italic tracking-tighter text-slate-900">
                      {(pStats.p90 != null && !isNaN(Number(pStats.p90))) ? Number(pStats.p90).toFixed(2) : '-'}
                    </p>
                  </div>
                </div>
              )}

              {/* MUESTRA TOTAL */}
              <div className="flex justify-center">
                <div className="bg-slate-100/50 px-3 py-1 rounded-full flex items-center gap-2">
                  <i className="fa-solid fa-users text-[8px] text-slate-400"></i>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    Muestra: {stats.count} Jugadores
                  </span>
                </div>
              </div>

              {/* DISTRIBUCIÓN POR NIVELES */}
              <div className="space-y-3">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Distribución por {!isPercentile ? 'Niveles' : 'Percentiles'}
                </p>

                <div className="space-y-2">
                  {/* ELITE */}
                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white shadow-md shadow-emerald-200">
                        <i className="fa-solid fa-crown text-xs"></i>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest leading-none">Élite</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {!isPercentile 
                            ? (stats.isInverted ? 'Inferior a -1σ' : 'Superior a +1σ')
                            : (pStats.isInverted ? 'Inferior a P10' : 'Superior a P90')
                          } ({!isPercentile ? stats.distribution.elite : pStats.distribution.elite} jug.)
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-emerald-700 italic tracking-tighter">
                        {!isPercentile 
                          ? `${stats.isInverted ? '<' : '>'} ${((stats.isInverted ? stats.avg - stats.std : stats.avg + stats.std) != null && !isNaN(Number(stats.isInverted ? stats.avg - stats.std : stats.avg + stats.std))) ? (stats.isInverted ? stats.avg - stats.std : stats.avg + stats.std).toFixed(2) : '-'}`
                          : `${pStats.isInverted ? '<=' : '>='} ${(pStats.isInverted ? pStats.p10 : pStats.p90).toFixed(2)}`
                        }
                      </p>
                    </div>
                  </div>

                  {/* COMPETITIVO */}
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white shadow-md shadow-blue-200">
                        <i className="fa-solid fa-bolt text-xs"></i>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest leading-none">Competitivo</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {!isPercentile 
                            ? (stats.isInverted ? 'Entre -1σ y Promedio' : 'Entre Promedio y +1σ')
                            : (pStats.isInverted ? 'Entre P10 y P25' : 'Entre P75 y P90')
                          } ({!isPercentile ? stats.distribution.competitive : pStats.distribution.competitive} jug.)
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-blue-700 italic tracking-tighter">
                        {!isPercentile 
                          ? (stats.isInverted 
                              ? `${(stats.avg - stats.std != null && !isNaN(Number(stats.avg - stats.std))) ? (stats.avg - stats.std).toFixed(2) : '-'} - ${(stats.avg != null && !isNaN(Number(stats.avg))) ? stats.avg.toFixed(2) : '-'}`
                              : `${(stats.avg != null && !isNaN(Number(stats.avg))) ? stats.avg.toFixed(2) : '-'} - ${(stats.avg + stats.std != null && !isNaN(Number(stats.avg + stats.std))) ? (stats.avg + stats.std).toFixed(2) : '-'}`
                            )
                          : (pStats.isInverted 
                              ? `${pStats.p10.toFixed(2)} - ${pStats.p25.toFixed(2)}`
                              : `${pStats.p75.toFixed(2)} - ${pStats.p90.toFixed(2)}`
                            )
                        }
                      </p>
                    </div>
                  </div>

                  {/* DESARROLLO */}
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white shadow-md shadow-amber-200">
                        <i className="fa-solid fa-seedling text-xs"></i>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest leading-none">En Desarrollo</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {!isPercentile 
                            ? (stats.isInverted ? 'Entre Promedio y +1σ' : 'Entre -1σ y Promedio')
                            : (pStats.isInverted ? 'Entre P25 y P50' : 'Entre P50 y P75')
                          } ({!isPercentile ? stats.distribution.development : pStats.distribution.development} jug.)
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-amber-700 italic tracking-tighter">
                        {!isPercentile 
                          ? (stats.isInverted
                              ? `${(stats.avg != null && !isNaN(Number(stats.avg))) ? stats.avg.toFixed(2) : '-'} - ${(stats.avg + stats.std != null && !isNaN(Number(stats.avg + stats.std))) ? (stats.avg + stats.std).toFixed(2) : '-'}`
                              : `${(stats.avg - stats.std != null && !isNaN(Number(stats.avg - stats.std))) ? (stats.avg - stats.std).toFixed(2) : '-'} - ${(stats.avg != null && !isNaN(Number(stats.avg))) ? stats.avg.toFixed(2) : '-'}`
                            )
                          : (pStats.isInverted
                              ? `${pStats.p25.toFixed(2)} - ${pStats.p50.toFixed(2)}`
                              : `${pStats.p50.toFixed(2)} - ${pStats.p75.toFixed(2)}`
                            )
                        }
                      </p>
                    </div>
                  </div>

                  {/* ATENCION */}
                  <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-red-200">
                        <i className="fa-solid fa-triangle-exclamation text-xs"></i>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-red-600 uppercase tracking-widest leading-none">Atención</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {!isPercentile 
                            ? (stats.isInverted ? 'Superior a +1σ' : 'Inferior a -1σ')
                            : (pStats.isInverted ? 'Superior a P50' : 'Inferior a P50')
                          } ({!isPercentile ? stats.distribution.attention : pStats.distribution.attention} jug.)
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-red-700 italic tracking-tighter">
                        {!isPercentile 
                          ? `${stats.isInverted ? '>' : '<'} ${((stats.isInverted ? stats.avg + stats.std : stats.avg - stats.std) != null && !isNaN(Number(stats.isInverted ? stats.avg + stats.std : stats.avg - stats.std))) ? (stats.isInverted ? stats.avg + stats.std : stats.avg - stats.std).toFixed(2) : '-'}`
                          : `${pStats.isInverted ? '>' : '<'} ${(pStats.p50 != null && !isNaN(Number(pStats.p50))) ? pStats.p50.toFixed(2) : '0.00'}`
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-12">
      <div className="bg-[#0b1220] rounded-[32px] p-8 text-white relative overflow-hidden shadow-lg border border-slate-800">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center justify-center p-8 pointer-events-none">
          <i className="fa-solid fa-layer-group text-[180px]"></i>
        </div>
        <div className="relative z-10 max-w-2xl">
          <span className="bg-red-600 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
            Módulo de Categorías por Evaluación
          </span>
          <h2 className="text-3xl font-black italic tracking-tighter uppercase mt-4 mb-3">
            Análisis de Benchmarks
          </h2>
          <p className="text-xs text-slate-300 font-medium leading-relaxed">
            Consulte la distribución del plantel nacional dividida por evaluaciones clave del laboratorio de ciencias del deporte. Compare métricas específicas utilizando estadísticas de campana de Gauss (μ/σ) o rangos de percentiles (P) para identificar talentos de nivel Élite o jugadores que requieren atención.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {renderUnifiedAnalysisBox(metric1, setMetric1, "Fuerza (IMTP)", "Estadísticas de Fuerza Máxima", BOX1_METRICS, mode1, setMode1, "bg-orange-500")}
        {renderUnifiedAnalysisBox(metric2, setMetric2, "Salto & Reactividad (CMJ)", "Reactividad de Miembro Inferior", BOX2_METRICS, mode2, setMode2, "bg-teal-500")}
        {renderUnifiedAnalysisBox(metric3, setMetric3, "Velocidad & Agilidad", "Pruebas de Esprint y COD 505", BOX3_METRICS, mode3, setMode3, "bg-blue-500")}
        {renderUnifiedAnalysisBox(metric4, setMetric4, "Resistencia Aeróbica", "Capacidad y Umbrales Cardiorrespiratorios", BOX4_METRICS, mode4, setMode4, "bg-purple-500")}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {renderUnifiedAnalysisBox(metric5, setMetric5, "Antropometría", "Composición Corporal y Maduración", BOX5_METRICS, mode5, setMode5, "bg-pink-500")}
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
                    {METRICS_OPTIONS.map(opt => <option key={`${opt.table}-${opt.key}`} value={opt.key}>{opt.label}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Variable Dependiente (Eje Y)</span>
                  <select 
                    value={axis.y}
                    onChange={(e) => updateAxis(idx, 'y', e.target.value)}
                    className="bg-slate-50 border-none rounded-2xl px-4 py-2.5 text-xs font-black text-slate-600 outline-none focus:ring-2 focus:ring-red-500 uppercase tracking-widest transition-all"
                  >
                    {METRICS_OPTIONS.map(opt => <option key={`${opt.table}-${opt.key}`} value={opt.key}>{opt.label}</option>)}
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

const DataTable = ({ imtp, speed, vo2max, antropometria, test505 = [], cmjRebound = [], players }: { imtp: IMTPData[], speed: SpeedTestData[], vo2max: VO2MaxData[], antropometria: AntropometriaData[], test505?: any[], cmjRebound?: CMJReboundData[], players: PlayerData[] }) => {
  const [tableType, setTableType] = useState<'imtp' | 'cmj' | 'rebound' | 'speed' | 'vo2max' | 'antropometria' | 'test505' | 'comparativa'>('imtp');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

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

  const [comparativeMetrics, setComparativeMetrics] = useState({
    fuerza: 'imtp_fuerza_n',
    velocidad: 'tiempo_total',
    resistencia: 'vo2_max',
    antropometria: 'masa_corporal_kg',
    agilidad: 't_cod_2m'
  });

  const isLowerIsBetter = (key: string): boolean => {
    return [
      'imtp_asimetria',
      'concentric_duration_ms',
      'rebound_contact_time_ms',
      'tiempo_total',
      'tiempo_10m',
      'tiempo_10_20m',
      'tiempo_20_30m',
      't_acel_2m',
      't_desacel_2m',
      't_cod_2m',
      't_reacel_1_2m',
      't_reacel_2_2m',
      'masa_adiposa_pct',
      'sum_pliegues_6_mm',
      'sum_pliegues_8_mm',
      'masa_adiposa_kg'
    ].includes(key);
  };

  const fuerzaMetrics = [
    { label: 'IMTP Fuerza Máxima (N)', key: 'imtp_fuerza_n' },
    { label: 'IMTP Fuerza Relativa (N/kg)', key: 'imtp_f_relativa_n_kg' },
    { label: 'IMTP Fuerza 50ms (N)', key: 'imtp_force_50ms' },
    { label: 'IMTP Fuerza 100ms (N)', key: 'imtp_force_100ms' },
    { label: 'IMTP Fuerza 150ms (N)', key: 'imtp_force_150ms' },
    { label: 'IMTP Fuerza 200ms (N)', key: 'imtp_force_200ms' },
    { label: 'IMTP RFD 100ms (N/s)', key: 'imtp_rfd_100ms' },
    { label: 'IMTP RFD 150ms (N/s)', key: 'imtp_rfd_150ms' },
    { label: 'IMTP RFD 200ms (N/s)', key: 'imtp_rfd_200ms' },
    { label: 'IMTP Asimetría (%)', key: 'imtp_asimetria' },
    { label: 'IMTP Débil', key: 'imtp_debil' },
    { label: 'CMJ Fuerza Pico Conc (N)', key: 'concentric_peak_force_n' },
    { label: 'CMJ RSI Modificado', key: 'rsi_modified_m_s' },
    { label: 'CMJ Altura Salto (cm)', key: 'jump_height_impmom_cm' },
    { label: 'CMJ Pot. Pico Rel (W/kg)', key: 'peak_power_bm_w_kg' },
    { label: 'CMJ Pot. Pico Abs (W)', key: 'peak_power_w' },
    { label: 'CMJ Profundidad (cm)', key: 'countermovement_depth_cm' },
    { label: 'CMJ Duración Conc (ms)', key: 'concentric_duration_ms' },
    { label: 'CMJ Impulso Conc (Ns)', key: 'concentric_impulse_ns' },
    { label: 'CMJ Momento Despegue', key: 'take_off_momentum_kg_m_s' },
    { label: 'CMJ Rebound RSI', key: 'rebound_rsi' },
    { label: 'T. Contacto Rebound (ms)', key: 'rebound_contact_time_ms' },
    { label: 'T. Vuelo Rebound (ms)', key: 'rebound_flight_time_ms' },
  ];

  const velocidadMetrics = [
    { label: 'Tiempo Total (s)', key: 'tiempo_total' },
    { label: 'Tiempo 10m (s)', key: 'tiempo_10m' },
    { label: 'Velocidad 10m (m/s)', key: 'vel_10m' },
    { label: 'Tiempo 10-20m (s)', key: 'tiempo_10_20m' },
    { label: 'Tiempo 20-30m (s)', key: 'tiempo_20_30m' },
  ];

  const resistenciaMetrics = [
    { label: 'VO2 Max (ml/kg/min)', key: 'vo2_max' },
    { label: 'VMA (km/h)', key: 'vam' },
    { label: 'FC Máxima (bpm)', key: 'fc_max' },
    { label: 'Distancia (m)', key: 'mts' },
    { label: 'VFA', key: 'vfa' },
    { label: 'VT1 Vel', key: 'vt1_vel' },
    { label: 'VT2 Vel', key: 'vt2_vel' },
  ];

  const antropometriaMetrics = [
    { label: 'Masa Corporal (kg)', key: 'masa_corporal_kg' },
    { label: 'Talla (cm)', key: 'talla_cm' },
    { label: 'Masa Muscular (%)', key: 'masa_muscular_pct' },
    { label: 'Masa Muscular (kg)', key: 'masa_muscular_kg' },
    { label: 'Masa Adiposa (%)', key: 'masa_adiposa_pct' },
    { label: 'Masa Adiposa (kg)', key: 'masa_adiposa_kg' },
    { label: 'Suma 6 Pliegues (mm)', key: 'sum_pliegues_6_mm' },
    { label: 'Índice IMO', key: 'indice_imo' },
  ];

  const agilidadMetrics = [
    { label: 'T. COD 2m (s)', key: 't_cod_2m' },
    { label: 'T. Acel 2m (s)', key: 't_acel_2m' },
    { label: 'T. Desacel 2m (s)', key: 't_desacel_2m' },
    { label: 'T. Reacel 1.2m (s)', key: 't_reacel_1_2m' },
    { label: 'Z-Score Acel', key: 'z_score_acel' },
  ];

  const playerMap = useMemo(() => {
    const map: Record<number, PlayerData> = {};
    players.forEach(p => { map[p.player_id] = p; });
    return map;
  }, [players]);

  const resolveMetricValue = (row: any, key: string): any => {
    if (!row) return undefined;
    let val = row[key];
    if (val === undefined || val === null || val === '') {
      if (key === 'imtp_fuerza_n') val = row['Peak Vertical Force [N]'];
      if (key === 'imtp_f_relativa_n_kg') val = row['Peak Vertical Force / BM'] || row['Peak Vertical Force / BM [N/kg]'];
      if (key === 'imtp_force_50ms') val = row['Force (Net of BW) at 50ms'] || row['Force (Net of BW) at 50ms [N]'];
      if (key === 'imtp_force_100ms') val = row['Force (Net of BW) at 100ms'] || row['Force (Net of BW) at 100ms [N]'];
      if (key === 'imtp_force_150ms') val = row['Force (Net of BW) at 150ms'] || row['Force (Net of BW) at 150ms [N]'];
      if (key === 'imtp_force_200ms') val = row['Force (Net of BW) at 200ms'] || row['Force (Net of BW) at 200ms [N]'];
      if (key === 'imtp_rfd_100ms') val = row['RFD - 100ms [N/s]'];
      if (key === 'imtp_rfd_150ms') val = row['RFD - 150ms [N/s]'];
      if (key === 'imtp_rfd_200ms') val = row['RFD - 200ms [N/s]'];

      if (key === 'concentric_peak_force_n') val = row.fuerza_cmj;
      if (key === 'fuerza_cmj') val = row.concentric_peak_force_n;
      if (key === 'rsi_modified_m_s') val = row.cmj_rsi_mod;
      if (key === 'cmj_rsi_mod') val = row.rsi_modified_m_s;
      if (key === 'jump_height_impmom_cm') val = row.cmj_altura_salto_im;
      if (key === 'cmj_altura_salto_im') val = row.jump_height_impmom_cm;
      if (key === 'peak_power_bm_w_kg') val = row.cmj_peak_pot_relativa;
      if (key === 'cmj_peak_pot_relativa') val = row.peak_power_bm_w_kg;
    }
    return val;
  };

  const latestEvaluationsMap = useMemo(() => {
    const map: Record<number, {
      imtp: any | null;
      speed: any | null;
      vo2max: any | null;
      antropometria: any | null;
      test505: any | null;
      rebound: any | null;
    }> = {};

    players.forEach(p => {
      map[p.player_id] = {
        imtp: null,
        speed: null,
        vo2max: null,
        antropometria: null,
        test505: null,
        rebound: null,
      };
    });

    imtp.forEach(row => {
      const pId = row.player_id;
      if (map[pId]) {
        const current = map[pId].imtp;
        if (!current || new Date(row.fecha_test).getTime() > new Date(current.fecha_test).getTime()) {
          map[pId].imtp = row;
        }
      }
    });

    speed.forEach(row => {
      const pId = row.player_id;
      if (map[pId]) {
        const current = map[pId].speed;
        if (!current || new Date(row.fecha).getTime() > new Date(current.fecha).getTime()) {
          map[pId].speed = row;
        }
      }
    });

    vo2max.forEach(row => {
      const pId = row.player_id;
      if (map[pId]) {
        const current = map[pId].vo2max;
        if (!current || new Date(row.fecha).getTime() > new Date(current.fecha).getTime()) {
          map[pId].vo2max = row;
        }
      }
    });

    antropometria.forEach(row => {
      const pId = row.player_id;
      if (map[pId]) {
        const current = map[pId].antropometria;
        if (!current || new Date(row.fecha_medicion).getTime() > new Date(current.fecha_medicion).getTime()) {
          map[pId].antropometria = row;
        }
      }
    });

    test505.forEach(row => {
      const pId = row.player_id;
      if (map[pId]) {
        const current = map[pId].test505;
        if (!current || new Date(row.fecha).getTime() > new Date(current.fecha).getTime()) {
          map[pId].test505 = row;
        }
      }
    });

    cmjRebound.forEach(row => {
      const pId = row.player_id;
      if (map[pId]) {
        const current = map[pId].rebound;
        if (!current || new Date(row.fecha_test).getTime() > new Date(current.fecha_test).getTime()) {
          map[pId].rebound = row;
        }
      }
    });

    return map;
  }, [players, imtp, speed, vo2max, antropometria, test505, cmjRebound]);

  const resolveComparativeValueAndDate = (evals: any, metricKey: string) => {
    let record = null;
    let dateField = 'fecha';

    const isIMTP = [
      'imtp_fuerza_n', 'imtp_f_relativa_n_kg', 'imtp_asimetria', 'imtp_debil', 'imtp_force_50ms', 'imtp_force_100ms', 'imtp_force_150ms', 'imtp_force_200ms', 'imtp_rfd_100ms', 'imtp_rfd_150ms', 'imtp_rfd_200ms',
      'fuerza_cmj', 'cmj_rsi_mod', 'cmj_altura_salto_im', 'cmj_peak_pot_relativa',
      'concentric_peak_force_n', 'rsi_modified_m_s', 'jump_height_impmom_cm', 'peak_power_bm_w_kg', 'countermovement_depth_cm', 'concentric_duration_ms', 'concentric_impulse_ns', 'take_off_momentum_kg_m_s', 'peak_power_w'
    ].includes(metricKey);

    const isCmjRebound = [
      'rebound_rsi', 'rebound_contact_time_ms', 'rebound_flight_time_ms'
    ].includes(metricKey);

    const isSpeed = [
      'tiempo_10m', 'vel_10m', 'tiempo_10_20m', 'vel_10_20m', 'tiempo_20_30m', 'vel_20_30m', 'tiempo_total', 'vel_max_kmh'
    ].includes(metricKey);

    const is505 = [
      't_acel_2m', 'vel_acel_kmh', 't_desacel_2m', 'vel_desacel_kmh', 't_cod_2m', 'vel_cod_kmh', 't_reacel_1_2m', 'vel_reacel_1_kmh', 't_reacel_2_2m', 'vel_reacel_2_kmh', 'z_score_acel'
    ].includes(metricKey);

    const isVO2 = [
      'vo2_max', 'vam', 'fc_max', 'nivel', 'pasada', 'mts', 'vfa', 'vt1_vel', 'vt1_pct', 'vt1_fc', 'vt2_vel', 'vt2_pct', 'vt2_fc'
    ].includes(metricKey);

    const isAntro = [
      'masa_adiposa_pct', 'masa_corporal_kg', 'talla_cm', 'talla_sentada_cm', 'masa_muscular_pct', 'masa_osea_pct', 'sum_pliegues_6_mm', 'sum_pliegues_8_mm', 'indice_imo', 'indice_imc', 'masa_muscular_kg', 'masa_adiposa_kg', 'masa_osea_kg', 'somatotipo_endo', 'somatotipo_meso', 'somatotipo_ecto', 'maduracion_media', 'phv_media', 'estatura_proy_media_cm'
    ].includes(metricKey);

    if (isIMTP) {
      record = evals.imtp;
      dateField = 'fecha_test';
    } else if (isCmjRebound) {
      record = evals.rebound;
      dateField = 'fecha_test';
    } else if (isSpeed) {
      record = evals.speed;
      dateField = 'fecha';
    } else if (is505) {
      record = evals.test505;
      dateField = 'fecha';
    } else if (isVO2) {
      record = evals.vo2max;
      dateField = 'fecha';
    } else if (isAntro) {
      record = evals.antropometria;
      dateField = 'fecha_medicion';
    }

    const value = record ? resolveMetricValue(record, metricKey) : null;
    const date = record ? record[dateField] : null;

    return { value, date };
  };

  const filteredPlayersList = useMemo(() => {
    let list = players;
    if (!searchTerm) return list;
    return list.filter(p => {
      const name = `${p.nombre} ${p.apellido1}`.toLowerCase();
      return name.includes(searchTerm.toLowerCase());
    });
  }, [players, searchTerm]);

  const sortedPlayersList = useMemo(() => {
    let list = [...filteredPlayersList];
    if (!sortConfig) return list;

    const { key, direction } = sortConfig;
    list.sort((a, b) => {
      let valA: any;
      let valB: any;

      if (key === 'jugador') {
        valA = `${a.nombre} ${a.apellido1}`.toLowerCase();
        valB = `${b.nombre} ${b.apellido1}`.toLowerCase();
      } else {
        let metricKey = key;
        if (key === 'fuerza') metricKey = comparativeMetrics.fuerza;
        else if (key === 'velocidad') metricKey = comparativeMetrics.velocidad;
        else if (key === 'resistencia') metricKey = comparativeMetrics.resistencia;
        else if (key === 'antropometria') metricKey = comparativeMetrics.antropometria;
        else if (key === 'agilidad') metricKey = comparativeMetrics.agilidad;

        const evalsA = latestEvaluationsMap[a.player_id] || { imtp: null, speed: null, vo2max: null, antropometria: null, test505: null, rebound: null };
        const evalsB = latestEvaluationsMap[b.player_id] || { imtp: null, speed: null, vo2max: null, antropometria: null, test505: null, rebound: null };

        valA = resolveComparativeValueAndDate(evalsA, metricKey).value;
        valB = resolveComparativeValueAndDate(evalsB, metricKey).value;
      }

      if (valA === undefined || valA === null || valA === '') return 1;
      if (valB === undefined || valB === null || valB === '') return -1;

      const numA = Number(valA);
      const numB = Number(valB);

      if (!isNaN(numA) && !isNaN(numB)) {
        return direction === 'asc' ? numA - numB : numB - numA;
      } else {
        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        if (strA < strB) return direction === 'asc' ? -1 : 1;
        if (strA > strB) return direction === 'asc' ? 1 : -1;
        return 0;
      }
    });

    return list;
  }, [filteredPlayersList, sortConfig, latestEvaluationsMap, comparativeMetrics]);

  const filteredData = useMemo(() => {
    let data: any[] = [];
    if (tableType === 'imtp') data = imtp;
    else if (tableType === 'cmj') data = imtp;
    else if (tableType === 'rebound') data = cmjRebound;
    else if (tableType === 'speed') data = speed;
    else if (tableType === 'vo2max') data = vo2max;
    else if (tableType === 'antropometria') data = antropometria;
    else if (tableType === 'test505') data = test505;
    else if (tableType === 'comparativa') return [];

    const validData = data.filter(d => !!playerMap[d.player_id]);

    if (!searchTerm) return validData;

    return validData.filter(d => {
      const player = playerMap[d.player_id];
      const name = player ? `${player.nombre} ${player.apellido1}`.toLowerCase() : '';
      return name.includes(searchTerm.toLowerCase());
    });
  }, [tableType, imtp, cmjRebound, speed, vo2max, antropometria, test505, searchTerm, playerMap]);

  const sortedData = useMemo(() => {
    let data = [...filteredData];
    if (!sortConfig) return data;

    const { key, direction } = sortConfig;
    data.sort((a, b) => {
      let valA: any;
      let valB: any;

      if (key === 'jugador') {
        const playerA = playerMap[a.player_id];
        const playerB = playerMap[b.player_id];
        valA = playerA ? `${playerA.nombre} ${playerA.apellido1}`.toLowerCase() : '';
        valB = playerB ? `${playerB.nombre} ${playerB.apellido1}`.toLowerCase() : '';
      } else {
        valA = resolveMetricValue(a, key);
        valB = resolveMetricValue(b, key);
      }

      if (valA === undefined || valA === null || valA === '') return 1;
      if (valB === undefined || valB === null || valB === '') return -1;

      if (key.includes('fecha')) {
        const timeA = new Date(valA).getTime();
        const timeB = new Date(valB).getTime();
        if (!isNaN(timeA) && !isNaN(timeB)) {
          return direction === 'asc' ? timeA - timeB : timeB - timeA;
        }
      }

      const numA = Number(valA);
      const numB = Number(valB);

      if (!isNaN(numA) && !isNaN(numB)) {
        return direction === 'asc' ? numA - numB : numB - numA;
      } else {
        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        if (strA < strB) return direction === 'asc' ? -1 : 1;
        if (strA > strB) return direction === 'asc' ? 1 : -1;
        return 0;
      }
    });

    return data;
  }, [filteredData, sortConfig, playerMap]);

  const columns = useMemo(() => {
    if (tableType === 'imtp') {
      return [
        { label: 'Fecha', key: 'fecha_test' },
        { label: 'Peso', key: 'peso' },
        { label: 'IMTP Fuerza (N)', key: 'imtp_fuerza_n' },
        { label: 'IMTP F. Relativa', key: 'imtp_f_relativa_n_kg' },
        { label: 'IMTP F. 50ms (N)', key: 'imtp_force_50ms' },
        { label: 'IMTP F. 100ms (N)', key: 'imtp_force_100ms' },
        { label: 'IMTP F. 150ms (N)', key: 'imtp_force_150ms' },
        { label: 'IMTP F. 200ms (N)', key: 'imtp_force_200ms' },
        { label: 'IMTP RFD 100ms', key: 'imtp_rfd_100ms' },
        { label: 'IMTP RFD 150ms', key: 'imtp_rfd_150ms' },
        { label: 'IMTP RFD 200ms', key: 'imtp_rfd_200ms' },
        { label: 'IMTP Asimetría %', key: 'imtp_asimetria' },
        { label: 'IMTP Débil', key: 'imtp_debil' },
        { label: 'Observaciones', key: 'observaciones' },
      ];
    } else if (tableType === 'cmj') {
      return [
        { label: 'Fecha', key: 'fecha_test' },
        { label: 'CMJ Fuerza Pico Conc', key: 'concentric_peak_force_n' },
        { label: 'CMJ RSI Mod', key: 'rsi_modified_m_s' },
        { label: 'CMJ Altura (IM)', key: 'jump_height_impmom_cm' },
        { label: 'CMJ Peak Pot Rel', key: 'peak_power_bm_w_kg' },
        { label: 'CMJ Peak Pot Abs', key: 'peak_power_w' },
        { label: 'CMJ Profundidad (cm)', key: 'countermovement_depth_cm' },
        { label: 'CMJ Duración (ms)', key: 'concentric_duration_ms' },
        { label: 'CMJ Impulso (Ns)', key: 'concentric_impulse_ns' },
        { label: 'CMJ Momento Despegue', key: 'take_off_momentum_kg_m_s' },
        { label: 'Observaciones', key: 'observaciones' },
      ];
    } else if (tableType === 'rebound') {
      return [
        { label: 'Fecha', key: 'fecha_test' },
        { label: 'BW (kg)', key: 'bw_kg' },
        { label: 'Repeticiones', key: 'reps' },
        { label: 'CMJ Rebound RSI', key: 'rebound_rsi' },
        { label: 'T. Contacto (ms)', key: 'rebound_contact_time_ms' },
        { label: 'T. Vuelo (ms)', key: 'rebound_flight_time_ms' },
        { label: 'Momento Despegue', key: 'take_off_momentum_kg_m_s' },
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
    } else if (tableType === 'test505') {
      return [
        { label: 'Fecha', key: 'fecha' },
        { label: 'T. Acel 2m', key: 't_acel_2m' },
        { label: 'Vel Acel (km/h)', key: 'vel_acel_kmh' },
        { label: 'T. Desacel 2m', key: 't_desacel_2m' },
        { label: 'Vel Desacel (km/h)', key: 'vel_desacel_kmh' },
        { label: 'T. COD 2m', key: 't_cod_2m' },
        { label: 'Vel COD (km/h)', key: 'vel_cod_kmh' },
        { label: 'T. Reacel 1.2m', key: 't_reacel_1_2m' },
        { label: 'Vel Reacel 1 (km/h)', key: 'vel_reacel_1_kmh' },
        { label: 'T. Reacel 2.2m', key: 't_reacel_2_2m' },
        { label: 'Vel Reacel 2 (km/h)', key: 'vel_reacel_2_kmh' },
        { label: 'Z-Score Acel', key: 'z_score_acel' },
        { label: 'Observaciones', key: 'observaciones' },
      ];
    } else if (tableType === 'comparativa') {
      return [];
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

  const allValuesMap = useMemo(() => {
    const map: Record<string, number[]> = {};
    columns.forEach(col => {
      map[col.key] = filteredData
        .map(row => Number(resolveMetricValue(row, col.key)))
        .filter(v => v !== null && v !== undefined && !isNaN(v) && v !== 0);
    });
    return map;
  }, [filteredData, columns]);

  const comparativeValuesMap = useMemo(() => {
    const map: Record<string, number[]> = {
      fuerza: [],
      velocidad: [],
      resistencia: [],
      antropometria: [],
      agilidad: []
    };

    filteredPlayersList.forEach(p => {
      const evals = latestEvaluationsMap[p.player_id] || { imtp: null, speed: null, vo2max: null, antropometria: null, test505: null, rebound: null };
      
      const fData = resolveComparativeValueAndDate(evals, comparativeMetrics.fuerza);
      if (fData.value !== null && fData.value !== undefined && !isNaN(Number(fData.value))) {
        map.fuerza.push(Number(fData.value));
      }

      const vData = resolveComparativeValueAndDate(evals, comparativeMetrics.velocidad);
      if (vData.value !== null && vData.value !== undefined && !isNaN(Number(vData.value))) {
        map.velocidad.push(Number(vData.value));
      }

      const rData = resolveComparativeValueAndDate(evals, comparativeMetrics.resistencia);
      if (rData.value !== null && rData.value !== undefined && !isNaN(Number(rData.value))) {
        map.resistencia.push(Number(rData.value));
      }

      const aData = resolveComparativeValueAndDate(evals, comparativeMetrics.antropometria);
      if (aData.value !== null && aData.value !== undefined && !isNaN(Number(aData.value))) {
        map.antropometria.push(Number(aData.value));
      }

      const agData = resolveComparativeValueAndDate(evals, comparativeMetrics.agilidad);
      if (agData.value !== null && agData.value !== undefined && !isNaN(Number(agData.value))) {
        map.agilidad.push(Number(agData.value));
      }
    });

    return map;
  }, [filteredPlayersList, latestEvaluationsMap, comparativeMetrics]);

  const getPerformanceColorFromCategorias = (metricKey: string, value: number, values: number[]) => {
    if (value === undefined || value === null || value === 0 || isNaN(value)) {
      return null;
    }
    if (values.length < 2) {
      return null;
    }

    if (['fecha', 'fecha_test', 'fecha_medicion', 'observaciones', 'jugador', 'player_id', 'id', 'bw_kg', 'peso', 'reps'].includes(metricKey)) {
      return null;
    }

    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(values.map(x => Math.pow(x - avg, 2)).reduce((a, b) => a + b, 0) / values.length);

    if (std === 0) return { bg: 'bg-slate-100', text: 'text-slate-600', label: 'MED' };

    const isInverted = isLowerIsBetter(metricKey);

    if (isInverted) {
      if (value < avg - std) {
        return { bg: 'bg-emerald-500', text: 'text-white', label: 'ELITE' };
      } else if (value >= avg - std && value < avg) {
        return { bg: 'bg-blue-500', text: 'text-white', label: 'COMP' };
      } else if (value >= avg && value <= avg + std) {
        return { bg: 'bg-amber-500', text: 'text-white', label: 'DESAR' };
      } else {
        return { bg: 'bg-red-500', text: 'text-white', label: 'ATENC' };
      }
    } else {
      if (value > avg + std) {
        return { bg: 'bg-emerald-500', text: 'text-white', label: 'ELITE' };
      } else if (value > avg && value <= avg + std) {
        return { bg: 'bg-blue-500', text: 'text-white', label: 'COMP' };
      } else if (value >= avg - std && value <= avg) {
        return { bg: 'bg-amber-500', text: 'text-white', label: 'DESAR' };
      } else {
        return { bg: 'bg-red-500', text: 'text-white', label: 'ATENC' };
      }
    }
  };

  const formatFecha = (fStr: string | null) => {
    if (!fStr) return '';
    try {
      const d = new Date(fStr);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-6">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'imtp', label: 'IMTP', icon: 'fa-bolt' },
            { id: 'cmj', label: 'CMJ', icon: 'fa-arrows-up-from-line' },
            { id: 'rebound', label: 'CMJ Rebound', icon: 'fa-arrows-spin' },
            { id: 'speed', label: 'Velocidad', icon: 'fa-gauge-high' },
            { id: 'vo2max', label: 'Resistencia', icon: 'fa-wind' },
            { id: 'antropometria', label: 'Antropometría', icon: 'fa-ruler-combined' },
            { id: 'test505', label: 'Agilidad (Test 505)', icon: 'fa-person-running' },
            { id: 'comparativa', label: 'Comparador de Evaluaciones', icon: 'fa-scale-balanced' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTableType(t.id as any)}
              className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
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
                <th 
                  onClick={() => requestSort('jugador')}
                  className="px-6 py-5 sticky left-0 bg-[#0b1220] z-10 cursor-pointer hover:bg-slate-800 transition-colors select-none"
                >
                  <div className="flex items-center gap-2">
                    <span>Jugador</span>
                    {sortConfig?.key === 'jugador' ? (
                      sortConfig.direction === 'asc' ? (
                        <i className="fa-solid fa-sort-up text-red-500"></i>
                      ) : (
                        <i className="fa-solid fa-sort-down text-red-500"></i>
                      )
                    ) : (
                      <i className="fa-solid fa-sort text-slate-500 hover:text-white opacity-40 hover:opacity-100 transition-opacity"></i>
                    )}
                  </div>
                </th>
                {tableType === 'comparativa' ? (
                  <>
                    <th className="px-4 py-5 whitespace-nowrap min-w-[200px]">
                      <div className="flex flex-col gap-1.5">
                        <div 
                          onClick={() => requestSort('fuerza')}
                          className="flex items-center justify-between cursor-pointer hover:text-red-500 transition-colors select-none"
                        >
                          <span className="text-slate-400 text-[8px] tracking-wider uppercase">Fuerza y Potencia</span>
                          {sortConfig?.key === 'fuerza' ? (
                            sortConfig.direction === 'asc' ? (
                              <i className="fa-solid fa-sort-up text-red-500 text-[10px]"></i>
                            ) : (
                              <i className="fa-solid fa-sort-down text-red-500 text-[10px]"></i>
                            )
                          ) : (
                            <i className="fa-solid fa-sort text-slate-500 hover:text-white text-[10px] opacity-40 hover:opacity-100 transition-opacity"></i>
                          )}
                        </div>
                        <select
                          value={comparativeMetrics.fuerza}
                          onChange={(e) => setComparativeMetrics(prev => ({ ...prev, fuerza: e.target.value }))}
                          className="bg-slate-800 text-white text-[10px] font-black uppercase border border-slate-700 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-red-500 w-full cursor-pointer"
                        >
                          {fuerzaMetrics.map(m => (
                            <option key={m.key} value={m.key}>{m.label}</option>
                          ))}
                        </select>
                      </div>
                    </th>
                    <th className="px-4 py-5 whitespace-nowrap min-w-[200px]">
                      <div className="flex flex-col gap-1.5">
                        <div 
                          onClick={() => requestSort('velocidad')}
                          className="flex items-center justify-between cursor-pointer hover:text-red-500 transition-colors select-none"
                        >
                          <span className="text-slate-400 text-[8px] tracking-wider uppercase">Velocidad</span>
                          {sortConfig?.key === 'velocidad' ? (
                            sortConfig.direction === 'asc' ? (
                              <i className="fa-solid fa-sort-up text-red-500 text-[10px]"></i>
                            ) : (
                              <i className="fa-solid fa-sort-down text-red-500 text-[10px]"></i>
                            )
                          ) : (
                            <i className="fa-solid fa-sort text-slate-500 hover:text-white text-[10px] opacity-40 hover:opacity-100 transition-opacity"></i>
                          )}
                        </div>
                        <select
                          value={comparativeMetrics.velocidad}
                          onChange={(e) => setComparativeMetrics(prev => ({ ...prev, velocidad: e.target.value }))}
                          className="bg-slate-800 text-white text-[10px] font-black uppercase border border-slate-700 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-red-500 w-full cursor-pointer"
                        >
                          {velocidadMetrics.map(m => (
                            <option key={m.key} value={m.key}>{m.label}</option>
                          ))}
                        </select>
                      </div>
                    </th>
                    <th className="px-4 py-5 whitespace-nowrap min-w-[200px]">
                      <div className="flex flex-col gap-1.5">
                        <div 
                          onClick={() => requestSort('resistencia')}
                          className="flex items-center justify-between cursor-pointer hover:text-red-500 transition-colors select-none"
                        >
                          <span className="text-slate-400 text-[8px] tracking-wider uppercase">Resistencia</span>
                          {sortConfig?.key === 'resistencia' ? (
                            sortConfig.direction === 'asc' ? (
                              <i className="fa-solid fa-sort-up text-red-500 text-[10px]"></i>
                            ) : (
                              <i className="fa-solid fa-sort-down text-red-500 text-[10px]"></i>
                            )
                          ) : (
                            <i className="fa-solid fa-sort text-slate-500 hover:text-white text-[10px] opacity-40 hover:opacity-100 transition-opacity"></i>
                          )}
                        </div>
                        <select
                          value={comparativeMetrics.resistencia}
                          onChange={(e) => setComparativeMetrics(prev => ({ ...prev, resistencia: e.target.value }))}
                          className="bg-slate-800 text-white text-[10px] font-black uppercase border border-slate-700 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-red-500 w-full cursor-pointer"
                        >
                          {resistenciaMetrics.map(m => (
                            <option key={m.key} value={m.key}>{m.label}</option>
                          ))}
                        </select>
                      </div>
                    </th>
                    <th className="px-4 py-5 whitespace-nowrap min-w-[200px]">
                      <div className="flex flex-col gap-1.5">
                        <div 
                          onClick={() => requestSort('antropometria')}
                          className="flex items-center justify-between cursor-pointer hover:text-red-500 transition-colors select-none"
                        >
                          <span className="text-slate-400 text-[8px] tracking-wider uppercase">Antropometría</span>
                          {sortConfig?.key === 'antropometria' ? (
                            sortConfig.direction === 'asc' ? (
                              <i className="fa-solid fa-sort-up text-red-500 text-[10px]"></i>
                            ) : (
                              <i className="fa-solid fa-sort-down text-red-500 text-[10px]"></i>
                            )
                          ) : (
                            <i className="fa-solid fa-sort text-slate-500 hover:text-white text-[10px] opacity-40 hover:opacity-100 transition-opacity"></i>
                          )}
                        </div>
                        <select
                          value={comparativeMetrics.antropometria}
                          onChange={(e) => setComparativeMetrics(prev => ({ ...prev, antropometria: e.target.value }))}
                          className="bg-slate-800 text-white text-[10px] font-black uppercase border border-slate-700 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-red-500 w-full cursor-pointer"
                        >
                          {antropometriaMetrics.map(m => (
                            <option key={m.key} value={m.key}>{m.label}</option>
                          ))}
                        </select>
                      </div>
                    </th>
                    <th className="px-4 py-5 whitespace-nowrap min-w-[200px]">
                      <div className="flex flex-col gap-1.5">
                        <div 
                          onClick={() => requestSort('agilidad')}
                          className="flex items-center justify-between cursor-pointer hover:text-red-500 transition-colors select-none"
                        >
                          <span className="text-slate-400 text-[8px] tracking-wider uppercase">Agilidad</span>
                          {sortConfig?.key === 'agilidad' ? (
                            sortConfig.direction === 'asc' ? (
                              <i className="fa-solid fa-sort-up text-red-500 text-[10px]"></i>
                            ) : (
                              <i className="fa-solid fa-sort-down text-red-500 text-[10px]"></i>
                            )
                          ) : (
                            <i className="fa-solid fa-sort text-slate-500 hover:text-white text-[10px] opacity-40 hover:opacity-100 transition-opacity"></i>
                          )}
                        </div>
                        <select
                          value={comparativeMetrics.agilidad}
                          onChange={(e) => setComparativeMetrics(prev => ({ ...prev, agilidad: e.target.value }))}
                          className="bg-slate-800 text-white text-[10px] font-black uppercase border border-slate-700 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-red-500 w-full cursor-pointer"
                        >
                          {agilidadMetrics.map(m => (
                            <option key={m.key} value={m.key}>{m.label}</option>
                          ))}
                        </select>
                      </div>
                    </th>
                  </>
                ) : (
                  columns.map(col => {
                    const isSorted = sortConfig?.key === col.key;
                    return (
                      <th 
                        key={col.key} 
                        onClick={() => requestSort(col.key)}
                        className="px-4 py-5 whitespace-nowrap cursor-pointer hover:bg-slate-800 transition-colors select-none"
                      >
                        <div className="flex items-center gap-2">
                          <span>{col.label}</span>
                          {isSorted ? (
                            sortConfig!.direction === 'asc' ? (
                              <i className="fa-solid fa-sort-up text-red-500"></i>
                            ) : (
                              <i className="fa-solid fa-sort-down text-red-500"></i>
                            )
                          ) : (
                            <i className="fa-solid fa-sort text-slate-500 hover:text-white opacity-40 hover:opacity-100 transition-opacity"></i>
                          )}
                        </div>
                      </th>
                    );
                  })
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {tableType === 'comparativa' ? (
                sortedPlayersList.map((player, idx) => {
                  const evals = latestEvaluationsMap[player.player_id] || { imtp: null, speed: null, vo2max: null, antropometria: null, test505: null, rebound: null };
                  
                  const fData = resolveComparativeValueAndDate(evals, comparativeMetrics.fuerza);
                  const valFuerza = fData.value;
                  const dateFuerza = fData.date;

                  const vData = resolveComparativeValueAndDate(evals, comparativeMetrics.velocidad);
                  const valVel = vData.value;
                  const dateVel = vData.date;

                  const rData = resolveComparativeValueAndDate(evals, comparativeMetrics.resistencia);
                  const valRes = rData.value;
                  const dateRes = rData.date;

                  const aData = resolveComparativeValueAndDate(evals, comparativeMetrics.antropometria);
                  const valAntro = aData.value;
                  const dateAntro = aData.date;

                  const agData = resolveComparativeValueAndDate(evals, comparativeMetrics.agilidad);
                  const valAgilidad = agData.value;
                  const dateAgilidad = agData.date;

                  const perfFuerza = getPerformanceColorFromCategorias(comparativeMetrics.fuerza, Number(valFuerza), comparativeValuesMap.fuerza);
                  const perfVel = getPerformanceColorFromCategorias(comparativeMetrics.velocidad, Number(valVel), comparativeValuesMap.velocidad);
                  const perfRes = getPerformanceColorFromCategorias(comparativeMetrics.resistencia, Number(valRes), comparativeValuesMap.resistencia);
                  const perfAntro = getPerformanceColorFromCategorias(comparativeMetrics.antropometria, Number(valAntro), comparativeValuesMap.antropometria);
                  const perfAgilidad = getPerformanceColorFromCategorias(comparativeMetrics.agilidad, Number(valAgilidad), comparativeValuesMap.agilidad);

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
                      {/* Fuerza */}
                      <td className="px-4 py-4 text-[11px] font-bold text-slate-600 whitespace-nowrap">
                        <div className="flex flex-col">
                          {perfFuerza ? (
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded-md min-w-[45px] text-center text-[9px] font-black uppercase tracking-tighter ${perfFuerza.bg} ${perfFuerza.text}`}>
                                {valFuerza !== undefined && valFuerza !== null && valFuerza !== '' ? String(valFuerza) : '-'}
                              </span>
                              <span className="text-[8px] font-black text-slate-300 uppercase tracking-tighter w-6">{perfFuerza.label}</span>
                            </div>
                          ) : (
                            <span className="text-slate-950 font-black">{valFuerza !== undefined && valFuerza !== null && valFuerza !== '' ? String(valFuerza) : '-'}</span>
                          )}
                          {dateFuerza && <span className="text-[8px] text-slate-400 font-black tracking-widest mt-0.5">{formatFecha(dateFuerza)}</span>}
                        </div>
                      </td>
                      {/* Velocidad */}
                      <td className="px-4 py-4 text-[11px] font-bold text-slate-600 whitespace-nowrap">
                        <div className="flex flex-col">
                          {perfVel ? (
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded-md min-w-[45px] text-center text-[9px] font-black uppercase tracking-tighter ${perfVel.bg} ${perfVel.text}`}>
                                {valVel !== undefined && valVel !== null && valVel !== '' ? String(valVel) : '-'}
                              </span>
                              <span className="text-[8px] font-black text-slate-300 uppercase tracking-tighter w-6">{perfVel.label}</span>
                            </div>
                          ) : (
                            <span className="text-slate-950 font-black">{valVel !== undefined && valVel !== null && valVel !== '' ? String(valVel) : '-'}</span>
                          )}
                          {dateVel && <span className="text-[8px] text-slate-400 font-black tracking-widest mt-0.5">{formatFecha(dateVel)}</span>}
                        </div>
                      </td>
                      {/* Resistencia */}
                      <td className="px-4 py-4 text-[11px] font-bold text-slate-600 whitespace-nowrap">
                        <div className="flex flex-col">
                          {perfRes ? (
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded-md min-w-[45px] text-center text-[9px] font-black uppercase tracking-tighter ${perfRes.bg} ${perfRes.text}`}>
                                {valRes !== undefined && valRes !== null && valRes !== '' ? String(valRes) : '-'}
                              </span>
                              <span className="text-[8px] font-black text-slate-300 uppercase tracking-tighter w-6">{perfRes.label}</span>
                            </div>
                          ) : (
                            <span className="text-slate-950 font-black">{valRes !== undefined && valRes !== null && valRes !== '' ? String(valRes) : '-'}</span>
                          )}
                          {dateRes && <span className="text-[8px] text-slate-400 font-black tracking-widest mt-0.5">{formatFecha(dateRes)}</span>}
                        </div>
                      </td>
                      {/* Antropometria */}
                      <td className="px-4 py-4 text-[11px] font-bold text-slate-600 whitespace-nowrap">
                        <div className="flex flex-col">
                          {perfAntro ? (
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded-md min-w-[45px] text-center text-[9px] font-black uppercase tracking-tighter ${perfAntro.bg} ${perfAntro.text}`}>
                                {valAntro !== undefined && valAntro !== null && valAntro !== '' ? String(valAntro) : '-'}
                              </span>
                              <span className="text-[8px] font-black text-slate-300 uppercase tracking-tighter w-6">{perfAntro.label}</span>
                            </div>
                          ) : (
                            <span className="text-slate-950 font-black">{valAntro !== undefined && valAntro !== null && valAntro !== '' ? String(valAntro) : '-'}</span>
                          )}
                          {dateAntro && <span className="text-[8px] text-slate-400 font-black tracking-widest mt-0.5">{formatFecha(dateAntro)}</span>}
                        </div>
                      </td>
                      {/* Agilidad */}
                      <td className="px-4 py-4 text-[11px] font-bold text-slate-600 whitespace-nowrap">
                        <div className="flex flex-col">
                          {perfAgilidad ? (
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded-md min-w-[45px] text-center text-[9px] font-black uppercase tracking-tighter ${perfAgilidad.bg} ${perfAgilidad.text}`}>
                                {valAgilidad !== undefined && valAgilidad !== null && valAgilidad !== '' ? String(valAgilidad) : '-'}
                              </span>
                              <span className="text-[8px] font-black text-slate-300 uppercase tracking-tighter w-6">{perfAgilidad.label}</span>
                            </div>
                          ) : (
                            <span className="text-slate-950 font-black">{valAgilidad !== undefined && valAgilidad !== null && valAgilidad !== '' ? String(valAgilidad) : '-'}</span>
                          )}
                          {dateAgilidad && <span className="text-[8px] text-slate-400 font-black tracking-widest mt-0.5">{formatFecha(dateAgilidad)}</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                sortedData.map((row, idx) => {
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
                        const rawValue = resolveMetricValue(row, col.key);
                        const isDate = col.key.includes('fecha');

                        const performanceStyle = getPerformanceColorFromCategorias(
                          col.key,
                          Number(rawValue),
                          allValuesMap[col.key] || []
                        );

                        return (
                          <td key={col.key} className="px-4 py-4 text-[11px] font-bold text-slate-600 whitespace-nowrap">
                            {performanceStyle ? (
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded-md min-w-[45px] text-center text-[9px] font-black uppercase tracking-tighter ${performanceStyle.bg} ${performanceStyle.text}`}>
                                  {rawValue !== undefined && rawValue !== null && rawValue !== '' ? String(rawValue) : '-'}
                                </span>
                                <span className="text-[8px] font-black text-slate-300 uppercase tracking-tighter w-6">{performanceStyle.label}</span>
                              </div>
                            ) : (
                              isDate 
                                ? formatFecha(rawValue)
                                : (rawValue !== undefined && rawValue !== null && rawValue !== '' ? String(rawValue) : '-')
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {((tableType === 'comparativa' && sortedPlayersList.length === 0) || (tableType !== 'comparativa' && sortedData.length === 0)) && (
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

interface MetricOption {
  label: string;
  key: string;
  unit: string;
  icon: string;
  colorClass: string;
  lowerIsBetter?: boolean;
}

const BOX1_METRIC_OPTIONS: MetricOption[] = [
  { label: 'IMTP Fuerza Máxima (N)', key: 'imtp_fuerza_n', unit: 'N', icon: 'fa-dumbbell', colorClass: 'text-orange-500 bg-orange-50 stroke-orange-500 border-orange-100' },
  { label: 'IMTP Fuerza Relativa (N/kg)', key: 'imtp_f_relativa_n_kg', unit: 'N/kg', icon: 'fa-bolt', colorClass: 'text-red-500 bg-red-50 stroke-red-500 border-red-100' },
  { label: 'IMTP Fuerza neta 50ms (N)', key: 'imtp_force_50ms', unit: 'N', icon: 'fa-gauge', colorClass: 'text-amber-500 bg-amber-50 stroke-amber-500 border-amber-100' },
  { label: 'IMTP Fuerza neta 100ms (N)', key: 'imtp_force_100ms', unit: 'N', icon: 'fa-gauge-high', colorClass: 'text-yellow-500 bg-yellow-50 stroke-yellow-500 border-yellow-100' },
  { label: 'IMTP Fuerza neta 150ms (N)', key: 'imtp_force_150ms', unit: 'N', icon: 'fa-bolt', colorClass: 'text-lime-500 bg-lime-50 stroke-lime-500 border-lime-100' },
  { label: 'IMTP Fuerza neta 200ms (N)', key: 'imtp_force_200ms', unit: 'N', icon: 'fa-fire', colorClass: 'text-emerald-500 bg-emerald-50 stroke-emerald-500 border-emerald-100' },
  { label: 'IMTP RFD 100ms (N/s)', key: 'imtp_rfd_100ms', unit: 'N/s', icon: 'fa-arrow-trend-up', colorClass: 'text-teal-500 bg-teal-50 stroke-teal-500 border-teal-100' },
  { label: 'IMTP RFD 150ms (N/s)', key: 'imtp_rfd_150ms', unit: 'N/s', icon: 'fa-angles-up', colorClass: 'text-cyan-500 bg-cyan-50 stroke-cyan-500 border-cyan-100' },
  { label: 'IMTP RFD 200ms (N/s)', key: 'imtp_rfd_200ms', unit: 'N/s', icon: 'fa-gauge-high', colorClass: 'text-sky-500 bg-sky-50 stroke-sky-500 border-sky-100' },
  { label: 'IMTP Asimetría (%)', key: 'imtp_asimetria', unit: '%', icon: 'fa-scale-unbalanced', colorClass: 'text-blue-500 bg-blue-50 stroke-blue-500 border-blue-100', lowerIsBetter: true }
];

const BOX2_METRIC_OPTIONS: MetricOption[] = [
  { label: 'CMJ Fuerza Pico Conc. (N)', key: 'concentric_peak_force_n', unit: 'N', icon: 'fa-compress', colorClass: 'text-emerald-500 bg-emerald-50 stroke-emerald-500 border-emerald-100' },
  { label: 'CMJ RSI Modificado (m/s)', key: 'rsi_modified_m_s', unit: 'm/s', icon: 'fa-bolt', colorClass: 'text-teal-500 bg-teal-50 stroke-teal-500 border-teal-100' },
  { label: 'CMJ Altura Salto (cm)', key: 'jump_height_impmom_cm', unit: 'cm', icon: 'fa-arrows-up-down', colorClass: 'text-cyan-500 bg-cyan-50 stroke-cyan-500 border-cyan-100' },
  { label: 'CMJ Pot. Pico Relativa (W/kg)', key: 'peak_power_bm_w_kg', unit: 'W/kg', icon: 'fa-gauge', colorClass: 'text-sky-500 bg-sky-50 stroke-sky-500 border-sky-100' },
  { label: 'CMJ Pot. Pico Absoluta (W)', key: 'peak_power_w', unit: 'W', icon: 'fa-fire', colorClass: 'text-violet-500 bg-violet-50 stroke-violet-500 border-violet-100' },
  { label: 'CMJ Profundidad (cm)', key: 'countermovement_depth_cm', unit: 'cm', icon: 'fa-arrow-down', colorClass: 'text-fuchsia-500 bg-fuchsia-50 stroke-fuchsia-500 border-fuchsia-100' },
  { label: 'CMJ Duración Conc. (ms)', key: 'concentric_duration_ms', unit: 'ms', icon: 'fa-clock', colorClass: 'text-pink-500 bg-pink-50 stroke-pink-500 border-pink-100', lowerIsBetter: true },
  { label: 'CMJ Impulso Conc. (Ns)', key: 'concentric_impulse_ns', unit: 'N s', icon: 'fa-gauge-high', colorClass: 'text-rose-500 bg-rose-50 stroke-rose-500 border-rose-100' },
  { label: 'CMJ Momento Despegue (kg·m/s)', key: 'take_off_momentum_kg_m_s', unit: 'kg·m/s', icon: 'fa-person-running', colorClass: 'text-indigo-500 bg-indigo-50 stroke-indigo-500 border-indigo-100' },
  { label: 'CMJ Rebound RSI', key: 'rebound_rsi', unit: 'Index', icon: 'fa-arrows-spin', colorClass: 'text-indigo-500 bg-indigo-50 stroke-indigo-500 border-indigo-100' },
  { label: 'T. Contacto Rebound (ms)', key: 'rebound_contact_time_ms', unit: 'ms', icon: 'fa-clock', colorClass: 'text-amber-500 bg-amber-50 stroke-amber-500 border-amber-100', lowerIsBetter: true },
  { label: 'T. Vuelo Rebound (ms)', key: 'rebound_flight_time_ms', unit: 'ms', icon: 'fa-plane-up', colorClass: 'text-lime-500 bg-lime-50 stroke-lime-500 border-lime-100' }
];

const BOX3_METRIC_OPTIONS: MetricOption[] = [
  { label: 'Velocidad Tiempo Total (s)', key: 'tiempo_total', unit: 's', icon: 'fa-gauge-high', colorClass: 'text-blue-500 bg-blue-50 stroke-blue-500 border-blue-100', lowerIsBetter: true },
  { label: 'Velocidad 10m Tiempo (s)', key: 'tiempo_10m', unit: 's', icon: 'fa-bolt', colorClass: 'text-indigo-500 bg-indigo-50 stroke-indigo-500 border-indigo-100', lowerIsBetter: true },
  { label: 'Velocidad 10m Promedio (km/h)', key: 'vel_10m', unit: 'km/h', icon: 'fa-gauge', colorClass: 'text-emerald-500 bg-emerald-50 stroke-emerald-500 border-emerald-100' },
  { label: 'Velocidad 10-20m Tiempo (s)', key: 'tiempo_10_20m', unit: 's', icon: 'fa-clock', colorClass: 'text-cyan-500 bg-cyan-50 stroke-cyan-500 border-cyan-100', lowerIsBetter: true },
  { label: 'Velocidad 10-20m Promedio (km/h)', key: 'vel_10_20m', unit: 'km/h', icon: 'fa-gauge', colorClass: 'text-sky-500 bg-sky-50 stroke-sky-500 border-sky-100' },
  { label: 'Velocidad 20-30m Tiempo (s)', key: 'tiempo_20_30m', unit: 's', icon: 'fa-clock', colorClass: 'text-fuchsia-500 bg-fuchsia-50 stroke-fuchsia-500 border-fuchsia-100', lowerIsBetter: true },
  { label: 'Velocidad 20-30m Promedio (km/h)', key: 'vel_20_30m', unit: 'km/h', icon: 'fa-gauge', colorClass: 'text-violet-500 bg-violet-50 stroke-violet-500 border-violet-100' },
  { label: '505 Tiempo Acel. 2m (s)', key: 't_acel_2m', unit: 's', icon: 'fa-clock', colorClass: 'text-orange-500 bg-orange-50 stroke-orange-500 border-orange-100', lowerIsBetter: true },
  { label: '505 Vel. Acel. (km/h)', key: 'vel_acel_kmh', unit: 'km/h', icon: 'fa-gauge', colorClass: 'text-amber-500 bg-amber-50 stroke-amber-500 border-amber-100' },
  { label: '505 Tiempo Desacel. 2m (s)', key: 't_desacel_2m', unit: 's', icon: 'fa-clock', colorClass: 'text-rose-500 bg-rose-50 stroke-rose-500 border-rose-100', lowerIsBetter: true },
  { label: '505 Vel. Desacel. (km/h)', key: 'vel_desacel_kmh', unit: 'km/h', icon: 'fa-gauge', colorClass: 'text-pink-500 bg-pink-50 stroke-pink-500 border-pink-100' },
  { label: '505 Tiempo COD 2m (s)', key: 't_cod_2m', unit: 's', icon: 'fa-clock', colorClass: 'text-teal-500 bg-teal-50 stroke-teal-500 border-teal-100', lowerIsBetter: true },
  { label: '505 Vel. COD (km/h)', key: 'vel_cod_kmh', unit: 'km/h', icon: 'fa-gauge', colorClass: 'text-emerald-500 bg-emerald-50 stroke-emerald-500 border-emerald-100' },
  { label: '505 Tiempo Re-acel 1 (s)', key: 't_reacel_1_2m', unit: 's', icon: 'fa-clock', colorClass: 'text-indigo-500 bg-indigo-50 stroke-indigo-500 border-indigo-100', lowerIsBetter: true },
  { label: '505 Vel. Re-acel 1 (km/h)', key: 'vel_reacel_1_kmh', unit: 'km/h', icon: 'fa-gauge', colorClass: 'text-violet-500 bg-violet-50 stroke-violet-500 border-violet-100' },
  { label: '505 Tiempo Re-acel 2 (s)', key: 't_reacel_2_2m', unit: 's', icon: 'fa-clock', colorClass: 'text-indigo-500 bg-indigo-50 stroke-indigo-500 border-indigo-100', lowerIsBetter: true },
  { label: '505 Vel. Re-acel 2 (km/h)', key: 'vel_reacel_2_kmh', unit: 'km/h', icon: 'fa-gauge', colorClass: 'text-violet-500 bg-violet-50 stroke-violet-500 border-violet-100' },
  { label: '505 Z-Score Aceleración', key: 'z_score_acel', unit: 'Score', icon: 'fa-chart-simple', colorClass: 'text-slate-500 bg-slate-50 stroke-slate-500 border-slate-100' }
];

const BOX4_METRIC_OPTIONS: MetricOption[] = [
  { label: 'Consumo Máx Oxígeno (VO2)', key: 'vo2_max', unit: 'ml/kg/min', icon: 'fa-wind', colorClass: 'text-purple-500 bg-purple-50 stroke-purple-500 border-purple-100' },
  { label: 'Vel. Aeróbica Máx (VAM)', key: 'vam', unit: 'km/h', icon: 'fa-gauge', colorClass: 'text-indigo-500 bg-indigo-50 stroke-indigo-500 border-indigo-100' },
  { label: 'Velocidad VT1 (km/h)', key: 'vt1_vel', unit: 'km/h', icon: 'fa-gauge-high', colorClass: 'text-blue-500 bg-blue-50 stroke-blue-500 border-blue-100' },
  { label: 'Frec. Cardíaca VT1 (bpm)', key: 'vt1_fc', unit: 'bpm', icon: 'fa-heartpulse', colorClass: 'text-red-500 bg-red-50 stroke-red-500 border-red-100' },
  { label: 'Velocidad VT2 (km/h)', key: 'vt2_vel', unit: 'km/h', icon: 'fa-gauge-high', colorClass: 'text-emerald-500 bg-emerald-50 stroke-emerald-500 border-emerald-100' },
  { label: 'Frec. Cardíaca VT2 (bpm)', key: 'vt2_fc', unit: 'bpm', icon: 'fa-heartpulse', colorClass: 'text-pink-500 bg-pink-50 stroke-pink-500 border-pink-100' },
  { label: 'Frec. Cardíaca Máx (bpm)', key: 'fc_max', unit: 'bpm', icon: 'fa-heart', colorClass: 'text-rose-500 bg-rose-50 stroke-rose-500 border-rose-100' },
  { label: 'Vel. Final de Prueba (VFA)', key: 'vfa', unit: 'km/h', icon: 'fa-gauge', colorClass: 'text-cyan-500 bg-cyan-50 stroke-cyan-500 border-cyan-100' },
  { label: 'Nivel Alcanzado', key: 'nivel', unit: 'Nivel', icon: 'fa-layer-group', colorClass: 'text-amber-500 bg-amber-50 stroke-amber-500 border-amber-100' },
  { label: 'Pasada Alcanzada', key: 'pasada', unit: 'Pasada', icon: 'fa-person-walking-arrow-right', colorClass: 'text-orange-500 bg-orange-50 stroke-orange-500 border-orange-100' },
  { label: 'Metros Recorridos (m)', key: 'mts', unit: 'm', icon: 'fa-route', colorClass: 'text-slate-500 bg-slate-50 stroke-slate-500 border-slate-100' }
];

interface TopTenDashboardProps {
  players: PlayerData[];
  imtpData: IMTPData[];
  speedData: SpeedTestData[];
  vo2maxData: VO2MaxData[];
  cmjReboundData: CMJReboundData[];
  test505Data?: any[];
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
  cmjReboundData,
  test505Data = [],
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

    const allOptions = [
      ...BOX1_METRIC_OPTIONS,
      ...BOX2_METRIC_OPTIONS,
      ...BOX3_METRIC_OPTIONS,
      ...BOX4_METRIC_OPTIONS
    ];
    const option = allOptions.find(o => o.key === metricKey);
    const isLowerBetter = option?.lowerIsBetter ?? false;

    const list: { player: PlayerData; value: number }[] = [];

    filtered.forEach(p => {
      let val: number | null = null;
      let rows: any[] = [];

      // Determine which dataset to search
      if (BOX1_METRIC_OPTIONS.some(o => o.key === metricKey)) {
        rows = imtpData.filter(d => d.player_id === p.player_id);
      } else if (BOX2_METRIC_OPTIONS.some(o => o.key === metricKey)) {
        if (['rebound_rsi', 'rebound_contact_time_ms', 'rebound_flight_time_ms'].includes(metricKey)) {
          rows = cmjReboundData.filter(d => d.player_id === p.player_id);
        } else {
          rows = imtpData.filter(d => d.player_id === p.player_id);
        }
      } else if (BOX3_METRIC_OPTIONS.some(o => o.key === metricKey)) {
        const is505Metric = ['t_acel_2m', 'vel_acel_kmh', 't_desacel_2m', 'vel_desacel_kmh', 't_cod_2m', 'vel_cod_kmh', 't_reacel_1_2m', 'vel_reacel_1_kmh', 't_reacel_2_2m', 'vel_reacel_2_kmh', 'z_score_acel'].includes(metricKey);
        if (is505Metric) {
          rows = test505Data.filter(d => d.player_id === p.player_id);
        } else {
          rows = speedData.filter(d => d.player_id === p.player_id);
        }
      } else if (BOX4_METRIC_OPTIONS.some(o => o.key === metricKey)) {
        rows = vo2maxData.filter(d => d.player_id === p.player_id);
      } else {
        rows = imtpData.filter(d => d.player_id === p.player_id);
      }

      if (rows.length > 0) {
        const vals = rows
          .map(r => {
            let v = r[metricKey];
            // Handle synced properties / alias keys
            if (v === undefined || v === null) {
              if (metricKey === 'imtp_fuerza_n') v = r['Peak Vertical Force [N]'];
              if (metricKey === 'imtp_f_relativa_n_kg') v = r['Peak Vertical Force / BM'] || r['Peak Vertical Force / BM [N/kg]'];
              if (metricKey === 'imtp_force_50ms') v = r['Force (Net of BW) at 50ms'] || r['Force (Net of BW) at 50ms [N]'];
              if (metricKey === 'imtp_force_100ms') v = r['Force (Net of BW) at 100ms'] || r['Force (Net of BW) at 100ms [N]'];
              if (metricKey === 'imtp_force_150ms') v = r['Force (Net of BW) at 150ms'] || r['Force (Net of BW) at 150ms [N]'];
              if (metricKey === 'imtp_force_200ms') v = r['Force (Net of BW) at 200ms'] || r['Force (Net of BW) at 200ms [N]'];
              if (metricKey === 'imtp_rfd_100ms') v = r['RFD - 100ms [N/s]'];
              if (metricKey === 'imtp_rfd_150ms') v = r['RFD - 150ms [N/s]'];
              if (metricKey === 'imtp_rfd_200ms') v = r['RFD - 200ms [N/s]'];

              if (metricKey === 'concentric_peak_force_n') v = r.fuerza_cmj;
              if (metricKey === 'rsi_modified_m_s') v = r.cmj_rsi_mod;
              if (metricKey === 'jump_height_impmom_cm') v = r.cmj_altura_salto_im;
              if (metricKey === 'peak_power_bm_w_kg') v = r.cmj_peak_pot_relativa;
            }
            return Number(v);
          })
          .filter(v => !isNaN(v) && (['z_score_acel', 'imtp_asimetria'].includes(metricKey) ? true : v > 0));

        if (vals.length > 0) {
          val = isLowerBetter ? Math.min(...vals) : Math.max(...vals);
        }
      }

      if (val !== null && val !== -Infinity && val !== Infinity) {
        list.push({ player: p, value: val });
      }
    });

    if (isLowerBetter) {
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
          title="Fuerza (IMTP)"
          boxNum={1}
          metricKey={box1Metric}
          setMetricKey={setBox1Metric}
          data={getRankData(box1Metric)}
          clubs={clubs}
          onSelectPlayer={onSelectPlayer}
          lowerIsBetter={BOX1_METRIC_OPTIONS.find(o => o.key === box1Metric)?.lowerIsBetter}
          metricOptions={BOX1_METRIC_OPTIONS}
        />
        <TopTenBox
          title="Salto & Reactividad (CMJ)"
          boxNum={2}
          metricKey={box2Metric}
          setMetricKey={setBox2Metric}
          data={getRankData(box2Metric)}
          clubs={clubs}
          onSelectPlayer={onSelectPlayer}
          lowerIsBetter={BOX2_METRIC_OPTIONS.find(o => o.key === box2Metric)?.lowerIsBetter}
          metricOptions={BOX2_METRIC_OPTIONS}
        />
        <TopTenBox
          title="Velocidad & Agilidad"
          boxNum={3}
          metricKey={box3Metric}
          setMetricKey={setBox3Metric}
          data={getRankData(box3Metric)}
          clubs={clubs}
          onSelectPlayer={onSelectPlayer}
          lowerIsBetter={BOX3_METRIC_OPTIONS.find(o => o.key === box3Metric)?.lowerIsBetter}
          metricOptions={BOX3_METRIC_OPTIONS}
        />
        <TopTenBox
          title="Resistencia Aeróbica"
          boxNum={4}
          metricKey={box4Metric}
          setMetricKey={setBox4Metric}
          data={getRankData(box4Metric)}
          clubs={clubs}
          onSelectPlayer={onSelectPlayer}
          lowerIsBetter={BOX4_METRIC_OPTIONS.find(o => o.key === box4Metric)?.lowerIsBetter}
          metricOptions={BOX4_METRIC_OPTIONS}
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
  metricOptions: { label: string; key: string; unit: string; icon: string; colorClass: string; lowerIsBetter?: boolean }[];
}

const TopTenBox: React.FC<TopTenBoxProps> = ({
  title,
  boxNum,
  metricKey,
  setMetricKey,
  data,
  clubs,
  onSelectPlayer,
  lowerIsBetter = false,
  metricOptions
}) => {
  const currentMetric = metricOptions.find(o => o.key === metricKey) || metricOptions[0];

  return (
    <div className="bg-white rounded-[32px] p-5 border border-slate-100 shadow-sm hover:border-slate-200 transition-all duration-300 flex flex-col justify-between h-[600px]">
      <div>
        <div className="flex justify-between items-start gap-2 mb-4">
          <div>
            <span className="text-[9px] font-black uppercase text-red-600 tracking-wider">Caja #{boxNum}</span>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight leading-none mt-0.5 whitespace-nowrap overflow-ellipsis">
              {title}
            </h3>
          </div>
          <div className="relative">
            <select
              value={metricKey}
              onChange={(e) => setMetricKey(e.target.value)}
              className="bg-slate-50 border-none rounded-xl px-2 py-1 text-[9px] font-black text-slate-600 uppercase tracking-tight outline-none focus:ring-1 focus:ring-red-500 max-w-[110px]"
            >
              {metricOptions.map(opt => (
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
            <p className="text-[7px] font-black uppercase text-slate-400 leading-none">Métrica Seleccionada</p>
            <p className="text-[10px] font-black text-slate-700 leading-tight mt-0.5 truncate">
              {currentMetric.label} {lowerIsBetter && <span className="text-[8px] font-bold text-blue-500 italic lowercase tracking-normal">(menor tiempo es mejor)</span>}
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
