
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { normalizeClub } from '../lib/utils';
import { 
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, BarChart, Bar, LineChart, Line, Legend,
  ComposedChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ReferenceLine, ErrorBar
} from 'recharts';

type TabId = 'individual' | 'grupal' | 'laboratorio' | 'salud' | 'tabla' | 'categorias' | 'insights';

interface PlayerData {
  id_del_jugador: number;
  nombre: string;
  apellido1: string;
  apellido2: string;
  category_id: number;
  posicion: string;
  fecha_nacimiento: string;
  club?: string;
  club_name?: string;
  phv_status?: 'Pre-Peak' | 'Peak' | 'Post-Peak';
  injury_status?: 'Disponible' | 'RTP' | 'Lesionado';
}

interface IMTPData {
  jugador: string;
  id_del_jugador: number;
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
  id_del_jugador: number;
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
  id_del_jugador: number;
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
  id_del_jugador: number;
  fecha: string;
  dist_total_m: number;
  sprints_n: number;
  vel_max_kmh: number;
}

interface VO2MaxData {
  id_del_jugador: number;
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

interface SportsScienceAreaProps {
  userRole?: string;
  userClub?: string;
}

const SportsScienceArea: React.FC<SportsScienceAreaProps> = ({ userRole, userClub }) => {
  const [activeTab, setActiveTab] = useState<TabId>('individual');
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [selectedAnios, setSelectedAnios] = useState<number[]>([]);
  const [selectedPosiciones, setSelectedPosiciones] = useState<string[]>([]);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showPosDropdown, setShowPosDropdown] = useState(false);
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [imtpData, setImtpData] = useState<IMTPData[]>([]);
  const [speedData, setSpeedData] = useState<SpeedTestData[]>([]);
  const [antropometria, setAntropometria] = useState<AntropometriaData[]>([]);
  const [vo2maxData, setVo2maxData] = useState<VO2MaxData[]>([]);
  const [injuries, setInjuries] = useState<InjuryData[]>([]);
  const [gpsData, setGpsData] = useState<GPSData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [
        { data: pData },
        { data: iData },
        { data: sData },
        { data: aData },
        { data: vData },
        { data: injData },
        { data: gData }
      ] = await Promise.all([
        supabase.from('players').select('*'),
        supabase.from('evaluaciones_imtp_salto').select('*'),
        supabase.from('velocidad_tests').select('*'),
        supabase.from('antropometria').select('*'),
        supabase.from('vo2max_tests').select('*'),
        supabase.from('lesionados').select('*'),
        supabase.from('gps_import').select('*')
      ]);

      if (pData) setPlayers(pData);
      if (iData) setImtpData(iData);
      if (sData) setSpeedData(sData);
      if (aData) setAntropometria(aData);
      if (vData) setVo2maxData(vData);
      if (injData) setInjuries(injData);
      if (gData) setGpsData(gData);
    } catch (err) {
      console.error("Error fetching sports science data:", err);
    } finally {
      setLoading(false);
    }
  };

  const availableAnios = useMemo(() => {
    let filteredPlayers = players;
    if (userRole === 'club' && userClub) {
      const uClubNorm = normalizeClub(userClub);
      filteredPlayers = players.filter(p => {
        const pClub = p.club || p.club_name || '';
        return pClub && normalizeClub(pClub) === uClubNorm;
      });
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
    if (userRole === 'club' && userClub) {
      const uClubNorm = normalizeClub(userClub);
      return players.map(p => {
        const pClub = (p as any).club || (p as any).club_name || '';
        if (pClub && normalizeClub(pClub) !== uClubNorm) {
          return {
            ...p,
            nombre: 'Jugador',
            apellido1: `[${p.id_del_jugador}]`,
            apellido2: ''
          };
        }
        return p;
      });
    }
    return players;
  }, [players, userRole, userClub]);

  const selectedPlayer = useMemo(() => 
    anonymizedPlayers.find(p => p.id_del_jugador === selectedPlayerId), 
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
            <TabButton active={activeTab === 'individual'} label="Huella del Atleta" icon="fa-fingerprint" onClick={() => setActiveTab('individual')} />
            <TabButton active={activeTab === 'grupal'} label="Análisis Grupal" icon="fa-users-rays" onClick={() => setActiveTab('grupal')} />
            <TabButton active={activeTab === 'laboratorio'} label="Laboratorio" icon="fa-flask-vial" onClick={() => setActiveTab('laboratorio')} />
            {userRole !== 'club' && (
              <>
                <TabButton active={activeTab === 'categorias'} label="Categorías" icon="fa-layer-group" onClick={() => setActiveTab('categorias')} />
                <TabButton active={activeTab === 'insights'} label="Insights" icon="fa-lightbulb" onClick={() => setActiveTab('insights')} />
                <TabButton active={activeTab === 'salud'} label="Salud y Carga" icon="fa-heart-pulse" onClick={() => setActiveTab('salud')} />
              </>
            )}
            <TabButton active={activeTab === 'tabla'} label="Tabla de Datos" icon="fa-table" onClick={() => setActiveTab('tabla')} />
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
        
        {activeTab === 'individual' && (
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
                  
                  if (userRole === 'club' && userClub) {
                    const uClubNorm = normalizeClub(userClub);
                    const pClub = p.club || p.club_name || '';
                    return yearMatch && posMatch && pClub && normalizeClub(pClub) === uClubNorm;
                  }
                  return yearMatch && posMatch;
                })
                .map(p => (
                  <option key={p.id_del_jugador} value={p.id_del_jugador}>{p.nombre} {p.apellido1}</option>
                ))}
            </select>
          </div>
        )}
      </div>

      {/* CONTENIDO DINÁMICO */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'individual' && (
          <IndividualDashboard 
            player={selectedPlayer} 
            imtp={imtpData.filter(d => d.id_del_jugador === selectedPlayerId)}
            speed={speedData.filter(d => d.id_del_jugador === selectedPlayerId)}
            antropometria={antropometria.filter(d => d.id_del_jugador === selectedPlayerId)}
            vo2max={vo2maxData.filter(d => d.id_del_jugador === selectedPlayerId)}
          />
        )}
        {activeTab === 'grupal' && (
          <SquadAnalytics 
            anios={selectedAnios} 
            posiciones={selectedPosiciones}
            players={anonymizedPlayers}
            gps={gpsData}
            speed={speedData}
            imtp={imtpData}
            vo2max={vo2maxData}
            antropometria={antropometria}
          />
        )}
        {activeTab === 'laboratorio' && (
          <Laboratorio 
            players={anonymizedPlayers}
            imtp={imtpData}
            speed={speedData}
            vo2max={vo2maxData}
            antropometria={antropometria}
            selectedAnios={selectedAnios}
            selectedPosiciones={selectedPosiciones}
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
            gps={gpsData.filter(d => d.id_del_jugador === selectedPlayerId)}
          />
        )}

        {activeTab === 'tabla' && (
          <DataTable 
            imtp={imtpData} 
            speed={speedData} 
            vo2max={vo2maxData} 
            antropometria={antropometria}
            players={anonymizedPlayers} 
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

const IndividualDashboard = ({ 
  player, imtp, speed, antropometria, vo2max
}: { 
  player?: PlayerData, 
  imtp: IMTPData[], 
  speed: SpeedTestData[], 
  antropometria: AntropometriaData[],
  vo2max: VO2MaxData[]
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
    'sumatoria_6_pliegues',
    'peso'
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
      .filter(d => d[metricKey] !== undefined && d[metricKey] !== null)
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
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-slate-50 rounded-[24px] flex items-center justify-center text-slate-300 border border-slate-100">
            <i className="fa-solid fa-user text-3xl"></i>
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">{player.nombre} {player.apellido1} {player.apellido2}</h2>
            <div className="flex flex-wrap gap-4 mt-2">
              <span className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <i className="fa-solid fa-shield-halved text-red-500"></i>
                {player.posicion}
              </span>
              <span className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <i className="fa-solid fa-calendar text-blue-500"></i>
                Año: {new Date(player.fecha_nacimiento).getFullYear()}
              </span>
              <span className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <i className="fa-solid fa-building text-emerald-500"></i>
                Club: {player.club || player.club_name || 'S/D'}
              </span>
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
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">IMTP</h3>
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
  if (value === undefined || value === null || value === 0) return { bg: 'bg-slate-100', text: 'text-slate-400', label: '-' };

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
  const [selectedAntroMetrics, setSelectedAntroMetrics] = useState<string[]>(['masa_adiposa_pct', 'masa_muscular_pct', 'sumatoria_6_pliegues', 'peso']);
  const [selectedSquadPosiciones, setSelectedSquadPosiciones] = useState<string[]>([]);

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

    const playerIds = filteredPlayers.map(p => p.id_del_jugador);
    const relevantData = sourceData.filter(d => playerIds.includes(d.id_del_jugador));

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
      const posPlayerIds = filteredPlayers.filter(p => p.posicion === pos).map(p => p.id_del_jugador);
      const posValues = relevantData
        .filter(d => posPlayerIds.includes(d.id_del_jugador))
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
                    <p className="text-slate-400">Max (Whisker): <span className="text-slate-900">{posData.max.toFixed(2)}</span></p>
                    <p className="text-slate-400">Q3: <span className="text-slate-900">{posData.q3.toFixed(2)}</span></p>
                    <p className="text-red-600 font-bold">Mediana: <span>{posData.median.toFixed(2)}</span></p>
                    <p className="text-slate-400">Q1: <span className="text-slate-900">{posData.q1.toFixed(2)}</span></p>
                    <p className="text-slate-400">Min (Whisker): <span className="text-slate-900">{posData.min.toFixed(2)}</span></p>
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
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">Distribución IMTP por Posición</h3>
          <div className="h-px flex-1 bg-slate-100"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {selectedImtpMetrics.map((metricKey, idx) => (
            <div key={idx} className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-8">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {METRICS_OPTIONS.find(m => m.key === metricKey)?.label}
                </h4>
                <select 
                  value={metricKey}
                  onChange={(e) => {
                    const next = [...selectedImtpMetrics];
                    next[idx] = e.target.value;
                    setSelectedImtpMetrics(next);
                  }}
                  className="bg-slate-50 border-none rounded-xl px-3 py-1.5 text-[10px] font-black text-slate-500 outline-none focus:ring-2 focus:ring-red-500 uppercase tracking-widest"
                >
                  {imtpOptions.map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                </select>
              </div>
              <div className="h-64">
                <BoxPlotChart data={getBoxPlotData(metricKey, 'imtp')} color="#ef4444" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECCIÓN SPEED BOX PLOTS */}
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">Distribución Velocidad por Posición</h3>
          <div className="h-px flex-1 bg-slate-100"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {selectedSpeedMetrics.map((metricKey, idx) => (
            <div key={idx} className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-8">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {METRICS_OPTIONS.find(m => m.key === metricKey)?.label}
                </h4>
                <select 
                  value={metricKey}
                  onChange={(e) => {
                    const next = [...selectedSpeedMetrics];
                    next[idx] = e.target.value;
                    setSelectedSpeedMetrics(next);
                  }}
                  className="bg-slate-50 border-none rounded-xl px-3 py-1.5 text-[10px] font-black text-slate-500 outline-none focus:ring-2 focus:ring-amber-500 uppercase tracking-widest"
                >
                  {speedOptions.map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                </select>
              </div>
              <div className="h-64">
                <BoxPlotChart data={getBoxPlotData(metricKey, 'speed')} color="#f59e0b" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECCIÓN VO2 BOX PLOTS */}
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">Distribución VO2 Max por Posición</h3>
          <div className="h-px flex-1 bg-slate-100"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {selectedVo2Metrics.map((metricKey, idx) => (
            <div key={idx} className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-8">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {METRICS_OPTIONS.find(m => m.key === metricKey)?.label}
                </h4>
                <select 
                  value={metricKey}
                  onChange={(e) => {
                    const next = [...selectedVo2Metrics];
                    next[idx] = e.target.value;
                    setSelectedVo2Metrics(next);
                  }}
                  className="bg-slate-50 border-none rounded-xl px-3 py-1.5 text-[10px] font-black text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500 uppercase tracking-widest"
                >
                  {vo2Options.map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                </select>
              </div>
              <div className="h-64">
                <BoxPlotChart data={getBoxPlotData(metricKey, 'vo2max')} color="#6366f1" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECCIÓN ANTROPOMETRÍA BOX PLOTS */}
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">Distribución Antropometría por Posición</h3>
          <div className="h-px flex-1 bg-slate-100"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {selectedAntroMetrics.map((metricKey, idx) => (
            <div key={idx} className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-8">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {METRICS_OPTIONS.find(m => m.key === metricKey)?.label}
                </h4>
                <select 
                  value={metricKey}
                  onChange={(e) => {
                    const next = [...selectedAntroMetrics];
                    next[idx] = e.target.value;
                    setSelectedAntroMetrics(next);
                  }}
                  className="bg-slate-50 border-none rounded-xl px-3 py-1.5 text-[10px] font-black text-slate-500 outline-none focus:ring-2 focus:ring-emerald-500 uppercase tracking-widest"
                >
                  {antroOptions.map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                </select>
              </div>
              <div className="h-64">
                <BoxPlotChart data={getBoxPlotData(metricKey, 'antropometria')} color="#10b981" />
              </div>
            </div>
          ))}
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
      const pImtp = imtp.filter(d => d.id_del_jugador === p.id_del_jugador).sort((a, b) => new Date(b.fecha_test).getTime() - new Date(a.fecha_test).getTime())[0];
      const pSpeed = speed.filter(d => d.id_del_jugador === p.id_del_jugador).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0];
      const pVo2 = vo2max.filter(d => d.id_del_jugador === p.id_del_jugador).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0];
      const pAntro = antropometria.filter(d => d.id_del_jugador === p.id_del_jugador).sort((a, b) => new Date(b.fecha_medicion).getTime() - new Date(a.fecha_medicion).getTime())[0];
      
      return {
        ...pImtp,
        ...pSpeed,
        ...pVo2,
        ...pAntro
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
      let val: any = null;
      if (metricKey === 'imtp_fuerza_n') val = imtp.filter(d => d.id_del_jugador === p.id_del_jugador).sort((a, b) => new Date(b.fecha_test).getTime() - new Date(a.fecha_test).getTime())[0]?.imtp_fuerza_n;
      else if (metricKey === 'vel_10m') val = speed.filter(d => d.id_del_jugador === p.id_del_jugador).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0]?.vel_10m;
      else {
        const option = METRICS_OPTIONS.find(o => o.key === metricKey);
        if (option?.table === 'imtp') val = imtp.filter(d => d.id_del_jugador === p.id_del_jugador).sort((a, b) => new Date(b.fecha_test).getTime() - new Date(a.fecha_test).getTime())[0]?.[metricKey as keyof IMTPData];
        else if (option?.table === 'speed') val = speed.filter(d => d.id_del_jugador === p.id_del_jugador).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0]?.[metricKey as keyof SpeedTestData];
        else if (option?.table === 'vo2max') val = vo2max.filter(d => d.id_del_jugador === p.id_del_jugador).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0]?.[metricKey as keyof VO2MaxData];
        else if (option?.table === 'antropometria') val = antropometria.filter(d => d.id_del_jugador === p.id_del_jugador).sort((a, b) => new Date(b.fecha_medicion).getTime() - new Date(a.fecha_medicion).getTime())[0]?.[metricKey as keyof AntropometriaData];
      }
      return Number(val);
    }).filter(v => v !== null && !isNaN(v));

    if (values.length === 0) return null;

    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(values.map(x => Math.pow(x - avg, 2)).reduce((a, b) => a + b, 0) / values.length);

    const distribution = {
      elite: values.filter(v => v > avg + std).length,
      competitive: values.filter(v => v > avg && v <= avg + std).length,
      development: values.filter(v => v >= avg - std && v <= avg).length,
      attention: values.filter(v => v < avg - std).length
    };

    return { avg, std, count: values.length, distribution };
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
                  <p className="text-3xl font-black italic tracking-tighter">{stats.avg.toFixed(2)}</p>
                </div>
                <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Desv. Estándar (σ)</p>
                  <p className="text-3xl font-black italic tracking-tighter text-slate-900">±{stats.std.toFixed(2)}</p>
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
                      <p className="text-xs font-bold text-slate-500">Superior a +1σ ({stats.distribution.elite} jug.)</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-emerald-700 italic tracking-tighter">
                      {'>'} {(stats.avg + stats.std).toFixed(2)}
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
                      <p className="text-xs font-bold text-slate-500">Entre Promedio y +1σ ({stats.distribution.competitive} jug.)</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-blue-700 italic tracking-tighter">
                      {stats.avg.toFixed(2)} - {(stats.avg + stats.std).toFixed(2)}
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
                      <p className="text-xs font-bold text-slate-500">Entre -1σ y Promedio ({stats.distribution.development} jug.)</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-amber-700 italic tracking-tighter">
                      {(stats.avg - stats.std).toFixed(2)} - {stats.avg.toFixed(2)}
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
                      <p className="text-xs font-bold text-slate-500">Inferior a -1σ ({stats.distribution.attention} jug.)</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-red-700 italic tracking-tighter">
                      {'<'} {(stats.avg - stats.std).toFixed(2)}
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
      {renderCategoryBox(metric1, setMetric1, "Caja de Análisis 1")}
      {renderCategoryBox(metric2, setMetric2, "Caja de Análisis 2")}
    </div>
  );
};

const Laboratorio = ({ players, imtp, speed, vo2max, antropometria, selectedAnios, selectedPosiciones }: { 
  players: PlayerData[], 
  imtp: IMTPData[], 
  speed: SpeedTestData[], 
  vo2max: VO2MaxData[], 
  antropometria: AntropometriaData[],
  selectedAnios: number[],
  selectedPosiciones: string[]
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
        const pImtp = imtp.filter(d => d.id_del_jugador === p.id_del_jugador).sort((a, b) => new Date(b.fecha_test).getTime() - new Date(a.fecha_test).getTime())[0];
        const pSpeed = speed.filter(d => d.id_del_jugador === p.id_del_jugador).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0];
        const pVo2 = vo2max.filter(d => d.id_del_jugador === p.id_del_jugador).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0];
        const pAntro = antropometria.filter(d => d.id_del_jugador === p.id_del_jugador).sort((a, b) => new Date(b.fecha_medicion).getTime() - new Date(a.fecha_medicion).getTime())[0];
        
        return {
          id: p.id_del_jugador,
          name: `${p.nombre} ${p.apellido1}`,
          posicion: p.posicion,
          ...pImtp,
          ...pSpeed,
          ...pVo2,
          ...pAntro
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
            {stats && (
              <div className="absolute top-32 right-12 z-10 bg-slate-900/5 backdrop-blur-md p-4 rounded-2xl border border-white/20 shadow-sm">
                <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2">Análisis Estadístico</p>
                <div className="space-y-1">
                  <p className="text-xs font-black text-red-600 tracking-tighter">
                    y = {stats.slope.toFixed(3)}x {stats.intercept >= 0 ? '+' : '-'} {Math.abs(stats.intercept).toFixed(2)}
                  </p>
                  <p className="text-xs font-black text-slate-600 tracking-tighter">
                    R = {stats.r.toFixed(3)}
                  </p>
                </div>
              </div>
            )}
            
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
              <div className="flex flex-wrap gap-4">
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
                    label={{ value: METRICS_OPTIONS.find(m => m.key === axis.x)?.label, position: 'insideBottom', offset: -20, fontSize: 11, fontWeight: 900, fill: '#64748b', textTransform: 'uppercase' }}
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
                    label={{ value: METRICS_OPTIONS.find(m => m.key === axis.y)?.label, angle: -90, position: 'insideLeft', offset: 0, fontSize: 11, fontWeight: 900, fill: '#64748b', textTransform: 'uppercase' }}
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
                    {mergedData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={POSITION_COLORS[entry.posicion as keyof typeof POSITION_COLORS] || '#ef4444'} 
                        fillOpacity={0.8}
                        strokeWidth={2}
                        stroke={POSITION_COLORS[entry.posicion as keyof typeof POSITION_COLORS] || '#ef4444'}
                      />
                    ))}
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
    players.forEach(p => { map[p.id_del_jugador] = p; });
    return map;
  }, [players]);

  const filteredData = useMemo(() => {
    let data: any[] = [];
    if (tableType === 'imtp') data = imtp;
    else if (tableType === 'speed') data = speed;
    else if (tableType === 'vo2max') data = vo2max;
    else if (tableType === 'antropometria') data = antropometria;

    if (!searchTerm) return data;

    return data.filter(d => {
      const player = playerMap[d.id_del_jugador];
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
            { id: 'imtp', label: 'IMTP & Saltos', icon: 'fa-bolt' },
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
                const player = playerMap[row.id_del_jugador];
                return (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r border-slate-50">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-900 uppercase italic">
                          {player ? `${player.nombre} ${player.apellido1}` : 'DESCONOCIDO'}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
                          {player?.posicion || '-'}
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
                                {value !== undefined && value !== null ? value : '-'}
                              </span>
                              <span className="text-[8px] font-black text-slate-300 uppercase tracking-tighter w-6">{performanceStyle.label}</span>
                            </div>
                          ) : (
                            row[col.key] !== undefined && row[col.key] !== null ? row[col.key] : '-'
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
