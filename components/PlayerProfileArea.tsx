
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { normalizeClub, getDriveDirectLink } from '../lib/utils';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, Legend, RadarChart, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, Radar 
} from 'recharts';
import ClubBadge from './ClubBadge';
import { UserRole } from '../types';

interface PlayerProfileAreaProps {
  userRole?: string;
  userClub?: string;
  userClubId?: number | null;
  clubs?: any[];
  initialPlayerId?: number | null;
  players?: any[];
}

const PlayerProfileArea: React.FC<PlayerProfileAreaProps> = ({ userRole, userClub, userClubId, clubs = [], initialPlayerId, players: initialPlayers }) => {
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(initialPlayerId || null);
  const [players, setPlayers] = useState<any[]>(initialPlayers || []);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  
  // Data States
  const [citations, setCitations] = useState<any[]>([]);
  const [trainingData, setTrainingData] = useState<any[]>([]);
  const [matchData, setMatchData] = useState<any[]>([]);
  const [gpsStats, setGpsStats] = useState<any[]>([]);
  const [physicalData, setPhysicalData] = useState<{
    anthro: any[],
    vo2: any[],
    imtp: any[],
    speed: any[]
  }>({ anthro: [], vo2: [], imtp: [], speed: [] });

  useEffect(() => {
    console.log("PlayerProfileArea: initialPlayers received:", initialPlayers?.length);
    if (!initialPlayers) {
      fetchPlayers();
    } else {
      setPlayers(initialPlayers);
    }
  }, [initialPlayers]);

  useEffect(() => {
    console.log("PlayerProfileArea: Current players in state:", players.length);
    if (players.length > 0) {
      console.log("PlayerProfileArea: Sample player:", JSON.stringify(players[0]));
    }
  }, [players]);

  useEffect(() => {
    if (selectedPlayerId) {
      fetchFullProfile(selectedPlayerId);
    }
  }, [selectedPlayerId]);

  const fetchPlayers = async () => {
    try {
      console.log("Fetching players in PlayerProfileArea (fallback)...");
      let query = supabase.from('players').select('player_id, nombre, apellido1, apellido2, club, id_club, posicion, anio');
      if (userRole === 'club') {
        if (userClubId) {
          query = query.eq('id_club', userClubId);
        } else if (userClub) {
          query = query.eq('club', userClub);
        }
      }
      const { data } = await query.order('apellido1', { ascending: true });
      if (data) setPlayers(data);
    } catch (err) {
      console.error("Error fetching players:", err);
    }
  };

  const fetchFullProfile = async (playerId: number) => {
    setLoading(true);
    try {
      // 1. Basic Player Info
      const { data: pData } = await supabase.from('players').select('*').eq('player_id', playerId).single();
      setProfileData(pData);

      // 2. Citations & Microcycles
      const { data: citData } = await supabase
        .from('citaciones')
        .select(`
          id,
          fecha_citacion,
          observacion,
          microcycles (
            id,
            type,
            start_date,
            end_date,
            city
          )
        `)
        .eq('player_id', playerId)
        .order('fecha_citacion', { ascending: false });
      setCitations(citData || []);

      // 3. Training & Matches (Internal Load)
      const { data: loadData } = await supabase
        .from('internal_load')
        .select('*')
        .eq('player_id', playerId)
        .order('session_date', { ascending: false });
      
      if (loadData) {
        setTrainingData(loadData.filter(l => l.type !== 'MATCH'));
        setMatchData(loadData.filter(l => l.type === 'MATCH'));
      }

      // 4. GPS Stats
      const { data: gps } = await supabase
        .from('gps_import')
        .select('*')
        .eq('player_id', playerId)
        .order('fecha', { ascending: false });
      setGpsStats(gps || []);

      // 5. Physical Evaluations
      const [anthro, vo2, imtp, speed] = await Promise.all([
        supabase.from('antropometria').select('*').eq('player_id', playerId).order('fecha_medicion', { ascending: true }),
        supabase.from('vo2max_tests').select('*').eq('player_id', playerId).order('fecha', { ascending: true }),
        supabase.from('evaluaciones_imtp_salto').select('*').eq('player_id', playerId).order('fecha_test', { ascending: true }),
        supabase.from('velocidad_tests').select('*').eq('player_id', playerId).order('fecha', { ascending: true })
      ]);

      setPhysicalData({
        anthro: anthro.data || [],
        vo2: vo2.data || [],
        imtp: imtp.data || [],
        speed: speed.data || []
      });

    } catch (err) {
      console.error("Error fetching full profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const latestAnthro = useMemo(() => physicalData.anthro.length > 0 ? physicalData.anthro[physicalData.anthro.length - 1] : null, [physicalData.anthro]);
  const latestVo2 = useMemo(() => physicalData.vo2.length > 0 ? physicalData.vo2[physicalData.vo2.length - 1] : null, [physicalData.vo2]);
  const latestImtp = useMemo(() => physicalData.imtp.length > 0 ? physicalData.imtp[physicalData.imtp.length - 1] : null, [physicalData.imtp]);
  const latestSpeed = useMemo(() => physicalData.speed.length > 0 ? physicalData.speed[physicalData.speed.length - 1] : null, [physicalData.speed]);

  const stats = useMemo(() => {
    return {
      citaciones: citations.length,
      entrenamientos: trainingData.length,
      partidos: matchData.length,
      minutosGps: gpsStats.reduce((acc, curr) => acc + (Number(curr.minutos) || 0), 0)
    };
  }, [citations, trainingData, matchData, gpsStats]);

  const radarData = useMemo(() => {
    if (!profileData) return [];
    
    // Simplistic normalization for radar (0-100 scale)
    const power = latestImtp ? Math.min(100, (Number(latestImtp.imtp_fuerza_n) / 4500) * 100) : 0;
    const speedVal = latestSpeed ? Math.min(100, (10 / Number(latestSpeed.tiempo_total)) * 50) : 0; // Inverted since lower time is better
    const endurance = latestVo2 ? Math.min(100, (Number(latestVo2.vo2_max) / 70) * 100) : 0;
    const muscle = latestAnthro ? Math.min(100, (Number(latestAnthro.masa_muscular_pct) / 55) * 100) : 0;
    const fatBonus = latestAnthro ? Math.max(0, 100 - (Number(latestAnthro.masa_adiposa_pct) * 5)) : 0;

    return [
      { subject: 'Potencia', A: power, fullMark: 100 },
      { subject: 'Velocidad', A: speedVal, fullMark: 100 },
      { subject: 'Resistencia', A: endurance, fullMark: 100 },
      { subject: 'Masa Muscular', A: muscle, fullMark: 100 },
      { subject: 'Perfil Graso', A: fatBonus, fullMark: 100 },
    ];
  }, [profileData, latestImtp, latestSpeed, latestVo2, latestAnthro]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Search Header */}
      <div className="bg-white rounded-[40px] p-6 shadow-sm border border-slate-100 flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4 flex-1 min-w-[300px]">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shrink-0">
            <i className="fa-solid fa-id-card-clip text-xl"></i>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Perfil de Jugador</h2>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Hoja de Vida Deportiva Institucional</p>
          </div>
        </div>
        
        {userRole !== UserRole.PLAYER && (
          <div className="flex items-center gap-3">
             <i className="fa-solid fa-magnifying-glass text-slate-300"></i>
             <select 
               value={selectedPlayerId || ''} 
               onChange={(e) => setSelectedPlayerId(Number(e.target.value))}
               className="bg-slate-50 border-none rounded-xl px-6 py-3 text-xs font-black text-slate-900 outline-none focus:ring-4 focus:ring-red-500/10 transition-all min-w-[250px]"
             >
               <option value="">Seleccionar Atleta</option>
               {players.map(p => (
                 <option key={p.player_id} value={p.player_id}>
                   {p.apellido1} {p.apellido2}, {p.nombre} ({p.player_id})
                 </option>
               ))}
             </select>
          </div>
        )}
      </div>

      {!selectedPlayerId || !profileData ? (
        <div className="bg-white rounded-[40px] py-32 text-center border border-dashed border-slate-200">
           <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
             <i className="fa-solid fa-user-gear text-4xl"></i>
           </div>
           <h3 className="text-xl font-black text-slate-900 uppercase italic">Buscador de Perfil</h3>
           <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Selecciona un jugador para ver su expediente completo</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Main Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* Left Column: Bio & Stats */}
            <div className="lg:col-span-1 space-y-8">
              {/* Bio Card */}
              <div className="bg-[#0b1220] rounded-[40px] p-8 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                <div className="relative z-10 text-center">
                  <div className="w-32 h-32 bg-slate-800 rounded-[32px] mx-auto mb-6 flex items-center justify-center border-4 border-white/5 relative shadow-2xl overflow-hidden">
                    {profileData.foto_url ? (
                      <img src={getDriveDirectLink(profileData.foto_url)} alt="Atleta" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-4xl font-black italic opacity-20">{profileData.nombre?.charAt(0)}{profileData.apellido1?.charAt(0)}</span>
                    )}
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter italic leading-none truncate">{profileData.nombre} {profileData.apellido1}</h3>
                  <p className="text-red-500 text-[10px] font-black uppercase tracking-widest mt-2">{profileData.posicion}</p>
                  
                  <div className="mt-8 pt-8 border-t border-white/5 flex justify-center items-center">
                    <ClubBadge clubName={profileData.club} clubs={clubs} logoSize="w-8 h-8" className="text-white text-xs font-black uppercase tracking-widest" />
                  </div>
                </div>

                <div className="mt-10 space-y-4">
                   <BioItem label="Clase" value={profileData.anio || 'N/A'} />
                   <BioItem label="Categoría" value={profileData.categoria?.toUpperCase().replace('_', ' ') || 'S/D'} />
                   <BioItem label="Pierna" value={profileData.perfil_pierna || 'S/D'} />
                   <BioItem label="ID Unico" value={profileData.player_id} />
                </div>
              </div>

              {/* Counts Badge */}
              <div className="grid grid-cols-2 gap-4">
                <StatCard label="Citaciones" value={stats.citaciones} icon="fa-calendar-check" color="blue" />
                <StatCard label="Entrenamientos" value={stats.entrenamientos} icon="fa-person-running" color="emerald" />
                <StatCard label="Partidos" value={stats.partidos} icon="fa-trophy" color="red" />
                <StatCard label="Minutos GPS" value={Math.round(stats.minutosGps)} icon="fa-clock" color="slate" />
              </div>
            </div>

            {/* Right Column: charts & tables */}
            <div className="lg:col-span-3 space-y-8">
              
              {/* Radar & Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 flex flex-col items-center">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8 text-center self-start">Perfil de Capacidades</h3>
                  <div className="w-full h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                        <PolarGrid stroke="#f1f5f9" />
                        <PolarAngleAxis dataKey="subject" tick={{fontSize: 9, fontWeight: 900, fill: '#64748b'}} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name={profileData.nombre} dataKey="A" stroke="#CF1B2B" fill="#CF1B2B" fillOpacity={0.6} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-[#0b1220] rounded-[40px] p-8 text-white shadow-2xl h-full flex flex-col justify-between">
                    <div>
                      <h3 className="text-xl font-black italic uppercase tracking-tighter mb-6 flex items-center gap-3">
                        <span className="w-2 h-6 bg-red-600 rounded-full"></span>
                        Estado de Evaluación
                      </h3>
                      <div className="grid grid-cols-2 gap-6">
                        <LastEvalItem label="Antropometría" date={latestAnthro?.fecha_medicion} value={latestAnthro ? `${latestAnthro.masa_adiposa_pct}% grasa` : 'Pendiente'} />
                        <LastEvalItem label="VO2 Max" date={latestVo2?.fecha} value={latestVo2 ? `${latestVo2.vo2_max} ml/kg/min` : 'Pendiente'} />
                        <LastEvalItem label="IMTP (Fuerza)" date={latestImtp?.fecha_test} value={latestImtp ? `${latestImtp.imtp_fuerza_n} N` : 'Pendiente'} />
                        <LastEvalItem label="Velocidad 30m" date={latestSpeed?.fecha} value={latestSpeed ? `${latestSpeed.tiempo_total}s` : 'Pendiente'} />
                      </div>
                    </div>
                    <div className="mt-8 pt-8 border-t border-white/5">
                       <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-4">Última Citación</p>
                       {citations.length > 0 ? (
                         <div className="flex justify-between items-center bg-white/5 p-4 rounded-3xl">
                            <span className="text-xs font-bold">{citations[0].microcycles?.city || 'S/D'} - {citations[0].microcycles?.type || 'S/D'}</span>
                            <span className="text-[10px] font-black text-red-500">{citations[0].fecha_citacion}</span>
                         </div>
                       ) : (
                         <div className="bg-white/5 p-4 rounded-3xl text-center">
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Sin registros de citación</span>
                         </div>
                       )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Physical History Charts */}
              <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
                 <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] mb-10 flex items-center gap-3">
                   <span className="w-2 h-6 bg-blue-600 rounded-full"></span>
                   Evolución Antropométrica
                 </h3>
                 <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                       <LineChart data={physicalData.anthro}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="fecha_medicion" tick={{fontSize: 9, fontWeight: 900, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                          <YAxis tick={{fontSize: 9, fontWeight: 900, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                          <Legend verticalAlign="top" align="right" />
                          <Line name="% Adiposo" type="monotone" dataKey="masa_adiposa_pct" stroke="#CF1B2B" strokeWidth={4} dot={{r: 6}} activeDot={{r: 8}} />
                          <Line name="% Muscular" type="monotone" dataKey="masa_muscular_pct" stroke="#0b1220" strokeWidth={4} dot={{r: 6}} activeDot={{r: 8}} />
                       </LineChart>
                    </ResponsiveContainer>
                 </div>
              </div>

              {/* GPS History */}
              <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
                 <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] mb-10 flex items-center gap-3">
                   <span className="w-2 h-6 bg-emerald-600 rounded-full"></span>
                   Volumen de Carga Externa (GPS)
                 </h3>
                 <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={gpsStats.slice(0, 20).reverse()}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="fecha" tick={{fontSize: 9, fontWeight: 900, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                          <YAxis tick={{fontSize: 9, fontWeight: 900, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                          <Bar name="Distancia Total (m)" dataKey="dist_total_m" fill="#10b981" radius={[8, 8, 0, 0]} barSize={24} />
                       </BarChart>
                    </ResponsiveContainer>
                 </div>
              </div>

              {/* Lists Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 {/* Citaciones List */}
                 <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Historial de Citaciones</h3>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                       {citations.map((cit, i) => (
                         <div key={i} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:border-blue-200 transition-all flex items-center justify-between">
                            <div>
                               <p className="text-[10px] font-black uppercase text-slate-900">{cit.microcycles?.city || 'S/D'} ({cit.microcycles?.type || 'CIT' })</p>
                               <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{cit.fecha_citacion}</p>
                            </div>
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                               <i className="fa-solid fa-check text-[10px]"></i>
                            </div>
                         </div>
                       ))}
                       {citations.length === 0 && <p className="text-center text-[10px] text-slate-400 uppercase font-black py-10">Sin citaciones registradas</p>}
                    </div>
                 </div>

                 {/* GPS Detailed List */}
                 <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Detalle GPS (Últimos 10)</h3>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                       {gpsStats.slice(0, 10).map((gps, i) => (
                         <div key={i} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:border-emerald-200 transition-all">
                            <div className="flex justify-between items-center mb-2">
                               <span className="text-[9px] font-black uppercase text-slate-900">{gps.fecha}</span>
                               <span className="text-[11px] font-black text-emerald-600 italic">{Math.round(gps.dist_total_m)}m</span>
                            </div>
                            <div className="flex gap-4">
                               <div className="flex flex-col">
                                  <span className="text-[7px] font-black text-slate-400 uppercase leading-none">V. MAX</span>
                                  <span className="text-[10px] font-bold text-slate-600">{gps.vel_max_kmh} <span className="text-[7px]">km/h</span></span>
                               </div>
                               <div className="flex flex-col">
                                  <span className="text-[7px] font-black text-slate-400 uppercase leading-none">MAI {">"}20</span>
                                  <span className="text-[10px] font-bold text-slate-600">{gps.dist_mai_m_20_kmh}m</span>
                               </div>
                               <div className="flex flex-col">
                                  <span className="text-[7px] font-black text-slate-400 uppercase leading-none">AC+DC</span>
                                  <span className="text-[10px] font-bold text-slate-600">{gps.acc_decc_ai_n}</span>
                               </div>
                            </div>
                         </div>
                       ))}
                       {gpsStats.length === 0 && <p className="text-center text-[10px] text-slate-400 uppercase font-black py-10">Sin datos GPS registrados</p>}
                    </div>
                 </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Helper Components ---

const BioItem = ({ label, value }: { label: string, value: any }) => (
  <div className="flex justify-between items-center py-2 border-b border-white/5">
    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
    <span className="text-xs font-bold">{value}</span>
  </div>
);

const StatCard = ({ label, value, icon, color }: { label: string, value: number, icon: string, color: 'blue' | 'emerald' | 'red' | 'slate' }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    slate: 'bg-slate-50 text-slate-600 border-slate-100 shadow-inner'
  };
  return (
    <div className={`${colors[color]} p-4 rounded-3xl border shadow-sm flex flex-col justify-between h-28`}>
      <i className={`fa-solid ${icon} text-lg`}></i>
      <div>
        <p className="text-[7px] font-black uppercase tracking-widest mb-1 opacity-70">{label}</p>
        <p className="text-xl font-black italic leading-none">{value}</p>
      </div>
    </div>
  );
};

const LastEvalItem = ({ label, date, value }: { label: string, date?: string, value: string }) => (
  <div className="space-y-1">
    <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">{label}</p>
    <p className="text-sm font-black text-white italic">{value}</p>
    <p className="text-[7px] font-bold text-red-500 uppercase tracking-tighter">{date || 'SIN FECHA'}</p>
  </div>
);

export default PlayerProfileArea;
