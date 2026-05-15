
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import ClubBadge from './ClubBadge';

interface PlayerOnField {
  player_id: number;
  nombre: string;
  apellido1: string;
  club: string;
  posicion_especifica: string;
  x: number;
  y: number;
}

interface ConvocatoriaTacticalProps {
  microId: string;
  categoryId: number;
  clubs: any[];
}

export const ConvocatoriaTactical: React.FC<ConvocatoriaTacticalProps> = ({ microId, categoryId, clubs }) => {
  const [players, setPlayers] = useState<any[]>([]);
  const [fieldPlayers, setFieldPlayers] = useState<PlayerOnField[]>([]);
  const [loading, setLoading] = useState(true);
  const fieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCitedPlayers();
    loadSavedConvocatoria();
  }, [microId]);

  const fetchCitedPlayers = async () => {
    setLoading(true);
    try {
      // Obtenemos los IDs de los jugadores citados en este microciclo
      const mId = parseInt(microId);
      const { data: citations, error: citeErr } = await supabase
        .from('citaciones')
        .select('player_id')
        .eq('microcycle_id', mId);

      if (citeErr) throw citeErr;

      const playerIds = citations?.map(c => c.player_id).filter(id => id !== null && id !== undefined);

      if (playerIds && playerIds.length > 0) {
        const { data: playersData, error: playersErr } = await supabase
          .from('players')
          .select('*')
          .in('player_id', playerIds);

        if (playersErr) throw playersErr;
        setPlayers(playersData || []);
      } else {
        setPlayers([]);
      }
    } catch (err) {
      console.error("Error fetching cited players:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadSavedConvocatoria = async () => {
    try {
      const mId = parseInt(microId);
      const { data, error } = await supabase
        .from('tactical_layout')
        .select('layout_json')
        .eq('microcycle_id', mId)
        .single();

      if (data) {
        setFieldPlayers(data.layout_json || []);
      }
    } catch (err) {
      // Si no hay layout guardado, no es un error fatal
      console.log("No saved layout found for this micro");
    }
  };

  const saveLayout = async () => {
    try {
      const mId = parseInt(microId);
      const { error } = await supabase
        .from('tactical_layout')
        .upsert({
          microcycle_id: mId,
          layout_json: fieldPlayers,
          updated_at: new Date().toISOString()
        }, { onConflict: 'microcycle_id' });

      if (error) throw error;
      alert("✅ Pizarra guardada correctamente");
    } catch (err: any) {
      console.error("Failed to save layout:", err);
      // Solo alertar si el error no es por falta de tabla (esto es para evitar ruidos si el usuario aún no corre el SQL)
      if (!err.message.includes('relation "tactical_layout" does not exist')) {
        alert("Error al guardar la pizarra: " + err.message);
      } else {
        alert("⚠️ El sistema de persistencia no está configurado en la base de datos aún.");
      }
    }
  };

  const addPlayerToField = (player: any) => {
    if (fieldPlayers.find(p => p.player_id === player.player_id)) return;

    const newPlayer: PlayerOnField = {
      player_id: player.player_id,
      nombre: player.nombre,
      apellido1: player.apellido1,
      club: player.club,
      posicion_especifica: player.posicion || 'N/A',
      x: 50, // Centro
      y: 80  // Parte baja (defensa por defecto)
    };

    setFieldPlayers([...fieldPlayers, newPlayer]);
  };

  const removePlayerFromField = (playerId: number) => {
    setFieldPlayers(fieldPlayers.filter(p => p.player_id !== playerId));
  };

  const updatePosition = (playerId: number, x: number, y: number) => {
    setFieldPlayers(prev => prev.map(p => 
      p.player_id === playerId ? { ...p, x, y } : p
    ));
  };

  // Convertir porcentaje a pixeles relativos
  const handleDragEnd = (playerId: number, info: any) => {
    if (!fieldRef.current) return;
    
    const rect = fieldRef.current.getBoundingClientRect();
    
    // Calculamos la posición del centro de la ficha relativa al contenedor
    // info.point.x es la posición absoluta del cursor en pantalla
    const xPercent = ((info.point.x - rect.left) / rect.width) * 100;
    const yPercent = ((info.point.y - rect.top) / rect.height) * 100;

    // Límites de seguridad (5% de margen del borde)
    const safeX = Math.max(5, Math.min(95, xPercent));
    const safeY = Math.max(5, Math.min(95, yPercent));

    updatePosition(playerId, safeX, safeY);
  };

  return (
    <div className="flex h-[calc(100vh-250px)] gap-6 animate-in fade-in duration-500">
      {/* Sidebar de Jugadores */}
      <div className="w-80 bg-white rounded-[32px] border border-slate-100 shadow-sm flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-50">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Citados</h3>
          <p className="text-sm font-black text-slate-900 italic uppercase">Convocatoria del Ciclo</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <i className="fa-solid fa-spinner fa-spin text-red-600"></i>
              <p className="text-[8px] font-black text-slate-400 uppercase">Cargando...</p>
            </div>
          ) : players.length > 0 ? (
            players.map(player => {
              const isOnField = fieldPlayers.some(p => p.player_id === player.player_id);
              return (
                <button
                  key={player.player_id}
                  onClick={() => isOnField ? removePlayerFromField(player.player_id) : addPlayerToField(player)}
                  className={`w-full p-4 rounded-3xl border-2 transition-all flex items-center justify-between group h-20 outline-none ${
                    isOnField 
                    ? 'bg-[#CF1B2B] border-[#CF1B2B] text-white shadow-lg shadow-red-200' 
                    : 'bg-white border-slate-50 hover:border-red-100 hover:bg-red-50/10 text-slate-900 shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${isOnField ? 'bg-white/20' : 'bg-slate-100'}`}>
                      <ClubBadge clubName={player.club} clubs={clubs} logoSize="w-8 h-8" showName={false} />
                    </div>
                    <div className="text-left overflow-hidden">
                      <p className={`text-[11px] font-black uppercase italic leading-tight truncate ${isOnField ? 'text-white' : 'text-slate-900'}`}>
                        {player.nombre} {player.apellido1}
                      </p>
                      <p className={`text-[8px] font-bold uppercase tracking-widest mt-0.5 ${isOnField ? 'text-white/60' : 'text-[#CF1B2B]'}`}>
                        {player.posicion || 'CAMPO'}
                      </p>
                      <p className={`text-[7px] font-bold uppercase tracking-tighter truncate ${isOnField ? 'text-white/40' : 'text-slate-400'}`}>
                        {player.club}
                      </p>
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${isOnField ? 'bg-white text-red-600' : 'bg-slate-50 text-slate-300'}`}>
                    <i className={`fa-solid ${isOnField ? 'fa-check text-[10px]' : 'fa-plus text-[8px]'}`}></i>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="text-center py-10 opacity-30 italic text-[10px] uppercase font-black">
              No hay citados para este microciclo
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50">
          <button 
            onClick={saveLayout}
            className="w-full bg-[#0b1220] text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-floppy-disk"></i> Guardar Pizarra
          </button>
        </div>
      </div>

      {/* Campo de Juego */}
      <div className="flex-1 bg-[#223e20] rounded-[40px] shadow-2xl relative overflow-hidden flex flex-col">
        {/* Cabecera del Campo */}
        <div className="absolute top-8 left-0 right-0 z-10 text-center pointer-events-none">
          <h2 className="text-white text-3xl font-black italic uppercase tracking-tighter drop-shadow-lg opacity-80">
            CONVOCATORIA CHILE
          </h2>
          <div className="flex justify-center gap-4 mt-2">
            <span className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-[8px] font-black text-white uppercase tracking-widest">
              ARQUEROS: {fieldPlayers.filter(p => p.posicion_especifica === 'ARQUERO').length}
            </span>
            <span className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-[8px] font-black text-white uppercase tracking-widest">
              CAMPO: {fieldPlayers.filter(p => p.posicion_especifica !== 'ARQUERO').length}
            </span>
          </div>
        </div>

        {/* Representación Visual del Campo */}
        <div 
          ref={fieldRef}
          className="flex-1 relative m-8 border-2 border-white/20 rounded-lg pointer-events-auto"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '10% 10%'
          }}
        >
          {/* Línea Central */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/20 -translate-y-1/2"></div>
          <div className="absolute top-1/2 left-1/2 w-48 h-48 border-2 border-white/20 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
          
          {/* Áreas Arriba */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 border-2 border-t-0 border-white/20 rounded-b-lg"></div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-12 border-2 border-t-0 border-white/20 rounded-b-md"></div>
          
          {/* Áreas Abajo */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-32 border-2 border-b-0 border-white/20 rounded-t-lg"></div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-12 border-2 border-b-0 border-white/20 rounded-t-md"></div>

          {/* Jugadores en el Campo */}
          <AnimatePresence>
            {fieldPlayers.map((p) => (
              <motion.div
                key={p.player_id}
                drag
                dragConstraints={fieldRef}
                dragElastic={0}
                dragMomentum={false}
                onDragEnd={(_, info) => handleDragEnd(p.player_id, info)}
                className="absolute z-20 cursor-move touch-none"
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  x: "-50%",
                  y: "-50%"
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1, x: "-50%", y: "-50%" }}
                exit={{ scale: 0, opacity: 0 }}
                whileHover={{ scale: 1.05, zIndex: 50 }}
                whileDrag={{ scale: 1.1, zIndex: 100, opacity: 0.9 }}
              >
                <div className="flex flex-col items-center">
                  <div className="bg-[#CF1B2B] text-white flex items-center gap-2.5 p-1.5 pr-4 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.4)] border border-white/50 backdrop-blur-md min-w-[140px]">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center p-1.5 shrink-0 overflow-hidden shadow-inner border border-white/20">
                      <ClubBadge clubName={p.club} clubs={clubs} logoSize="w-7 h-7" showName={false} />
                    </div>
                    <div className="flex flex-col">
                      <p className="text-[10px] font-black uppercase italic leading-none whitespace-nowrap tracking-tight">
                        {p.nombre.split(' ')[0]} {p.apellido1}
                      </p>
                      <p className="text-[7px] font-bold text-white/70 uppercase tracking-widest mt-0.5">
                        {p.posicion_especifica}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Marca de Agua Federativa */}
        <div className="absolute bottom-10 right-10 opacity-20 w-32 h-32 pointer-events-none grayscale invert contrast-200">
           {/* Logo circular placeholder */}
           <div className="w-full h-full border-4 border-white rounded-full flex items-center justify-center">
             <span className="text-white font-black italic text-center text-xs">FEDERACION<br/>DE CHILE</span>
           </div>
        </div>
      </div>
    </div>
  );
};
