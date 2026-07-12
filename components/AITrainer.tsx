
import React, { useState } from 'react';

interface Exercise {
  name: string;
  sets: string;
  reps: string;
  rest: string;
  notes: string;
}

interface Routine {
  title: string;
  objective: string;
  warmup: string[];
  exercises: Exercise[];
  cooldown: string[];
}

const AITrainer: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateRoutine = async (type: string) => {
    setLoading(true);
    setError(null);
    try {
      const prompt = `Eres un Preparador Físico de élite especializado en fútbol profesional. 
      Genera una rutina de entrenamiento de gimnasio enfocada en: ${type}.
      La respuesta debe ser un objeto JSON con el siguiente formato:
      {
        "title": "Nombre de la rutina",
        "objective": "Objetivo principal de la sesión",
        "warmup": ["ejercicio de calentamiento 1", "ejercicio de calentamiento 2"],
        "exercises": [
          {
            "name": "Nombre del ejercicio",
            "sets": "series",
            "reps": "repeticiones",
            "rest": "tiempo de descanso",
            "notes": "indicación técnica clave"
          }
        ],
        "cooldown": ["ejercicio de vuelta a la calma 1", "ejercicio de vuelta a la calma 2"]
      }
      Solo devuelve el JSON, sin texto adicional.`;

      const response = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          config: {
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Proxy error: ${response.status}`);
      }

      const resData = await response.json();
      const rawText = resData.text || '{}';
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (parseError) {
        console.warn("Standard JSON parse failed for AI trainer. Attempting safe extraction.", parseError);
        const firstBrace = rawText.indexOf('{');
        const lastBrace = rawText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          const cleaned = rawText.substring(firstBrace, lastBrace + 1);
          data = JSON.parse(cleaned);
        } else {
          throw parseError;
        }
      }
      setRoutine(data);
    } catch (err) {
      console.warn("AI Trainer Error (fallback triggered):", err);
      let fallbackRoutine: Routine;
      const normalizedType = type.toLowerCase();
      if (normalizedType.includes("upper")) {
        fallbackRoutine = {
          title: "Potencia Neuromuscular - Tren Superior",
          objective: "Desarrollo de la fuerza explosiva en empujes y tracciones para duelos físicos hombro con hombro",
          warmup: [
            "Cardio ligero en remo - 5 minutos",
            "Movilidad escapular y rotadores con banda elástica - 10 reps",
            "Flexiones de brazos con control excéntrico - 2 series x 8 reps"
          ],
          exercises: [
            {
              name: "Press de Banca Semiapoyado con Mancuernas",
              sets: "4",
              reps: "6",
              rest: "2 min",
              notes: "Foco en la explosividad en fase concéntrica y 3 segundos de descenso controlado."
            },
            {
              name: "Dominadas Lastradas Pronas (o con asistencia)",
              sets: "3",
              reps: "6",
              rest: "2 min",
              notes: "Alineación de hombros hacia abajo, evitar balanceo del tren inferior."
            },
            {
              name: "Push Press con Barra Olímpica",
              sets: "3",
              reps: "5",
              rest: "90 seg",
              notes: "Usa un sutil dip de rodillas para propulsar la barra hacia el techo de forma vertical."
            },
            {
              name: "Remo Unilateral con Mancuerna en Banco",
              sets: "3",
              reps: "8 por lado",
              rest: "75 seg",
              notes: "Mantener el abdomen contraído para bloquear la rotación lumbar."
            }
          ],
          cooldown: [
            "Estiramiento pasivo de pectoral y dorsal en espaldera",
            "Liberación miofascial con Foam Roller en el tren superior - 3 minutos"
          ]
        };
      } else if (normalizedType.includes("lower")) {
        fallbackRoutine = {
          title: "Fuerza Reactiva e Inestabilidad - Tren Inferior",
          objective: "Desarrollo de fuerza excéntrica en cuádriceps e isquiotibiales para optimizar el frenado y cambio de dirección",
          warmup: [
            "Trotar suave o bicicleta estática - 5 minutos",
            "Caminata del oso (Bear crawl) - 15 metros",
            "Sentadillas libres con pausa de 2 segundos abajo - 10 reps"
          ],
          exercises: [
            {
              name: "Sentadilla Trasera con Barra (Safety Bar si hay disponible)",
              sets: "4",
              reps: "5",
              rest: "2 min",
              notes: "Profundidad rompiendo el paralelo bajo control técnico impecable."
            },
            {
              name: "Peso Muerto Rumano Unilateral con Mancuerna",
              sets: "3",
              reps: "8 por lado",
              rest: "90 seg",
              notes: "Foco en la bisagra de cadera y alineación de la pelvis."
            },
            {
              name: "Zancadas Búlgaras con Carga Simétrica",
              sets: "3",
              reps: "8 por pierna",
              rest: "90 seg",
              notes: "Rodilla delantera alineada con el segundo dedo del pie, evitar colapso en valgo."
            },
            {
              name: "Saltos al Cajón (Box Jumps) con Caída Silenciosa",
              sets: "3",
              reps: "6",
              rest: "75 seg",
              notes: "Foco en amortiguar el aterrizaje en media sentadilla fluida."
            }
          ],
          cooldown: [
            "Estiramiento de isquiotibiales, flexores de cadera y glúteo",
            "Masaje de descarga con Foam Roller en cuádriceps e ITB"
          ]
        };
      } else if (normalizedType.includes("mobility")) {
        fallbackRoutine = {
          title: "Movilidad Multi-articular y Estabilidad Lumbopélvica",
          objective: "Apertura de cadera, dorsiflexión de tobillo y disociación de cinturas para óptimo rango de movimiento táctico",
          warmup: [
            "Caminata suave - 3 minutos",
            "Rotaciones de cadera de pie en círculos amplios - 8 por lado",
            "Ankle Mobility (Movilización de tobillo contra pared) - 10 por pie"
          ],
          exercises: [
            {
              name: "World's Greatest Stretch (El mejor estiramiento del mundo)",
              sets: "3",
              reps: "5 por lado",
              rest: "60 seg",
              notes: "Movilizar la cadera y realizar rotación torácica siguiendo la mano con la mirada."
            },
            {
              name: "90-90 Hip Switch (Transiciones de cadera sentado)",
              sets: "3",
              reps: "8 por lado",
              rest: "45 seg",
              notes: "Mantener el torso erguido sin despegar los talones del suelo."
            },
            {
              name: "Sentadilla Profunda Activa Sosteniendo Barra",
              sets: "3",
              reps: "45 seg de mantención",
              rest: "60 seg",
              notes: "Mantener talones apoyados, pecho alto y empujar rodillas hacia afuera con los codos."
            }
          ],
          cooldown: [
            "Respiración diafragmática tumbado boca arriba con piernas elevadas - 3 minutos",
            "Postura del niño (Child's Pose) estirando brazos al frente"
          ]
        };
      } else {
        fallbackRoutine = {
          title: "Flexibilidad Activa y Descompresión Fascial",
          objective: "Restaurar la longitud muscular en aductores, psoas y cadena posterior para acelerar la recuperación metabólica",
          warmup: [
            "Movilizaciones articulares ligeras - 3 minutos",
            "Cat-Cow (Gato-Camello) para flexo-extensión de columna - 10 reps"
          ],
          exercises: [
            {
              name: "Estiramiento de Psoas en Proposición de Caballero (Lunge Stretch)",
              sets: "3",
              reps: "30 seg por lado",
              rest: "30 seg",
              notes: "Retroversión pélvica activa apretando el glúteo de la pierna trasera."
            },
            {
              name: "Estiramiento de Aductores en Posición de Sapito (Frog Stretch)",
              sets: "3",
              reps: "40 seg",
              rest: "30 seg",
              notes: "Desplazar el peso sutilmente hacia atrás para buscar tensión aductora cómoda."
            },
            {
              name: "Estiramiento Dinámico de Cadena Posterior (Belly to Thigh)",
              sets: "3",
              reps: "12 reps",
              rest: "45 seg",
              notes: "Flexionar rodillas ligeramente para priorizar la extensión de columna e isquiotibiales."
            }
          ],
          cooldown: [
            "Tumbado boca arriba sacudiendo piernas suavemente para relajar la musculatura activa",
            "5 respiraciones profundas completas con los ojos cerrados"
          ]
        };
      }
      setRoutine(fallbackRoutine);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { id: 'upper', label: 'UPPER BODY', icon: 'fa-child-reaching', color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { id: 'lower', label: 'LOWER BODY', icon: 'fa-person-running', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { id: 'mobility', label: 'MOBILITY', icon: 'fa-arrows-spin', color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { id: 'flexibility', label: 'FLEXIBILITY', icon: 'fa-person-walking-arrow-right', color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-5xl mx-auto">
      {/* HEADER ESTILO GRAVL */}
      <div className="bg-[#0b1220] rounded-[40px] p-12 text-white shadow-2xl relative overflow-hidden border border-white/5">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full -mr-48 -mt-48 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-8">
            <div className="w-24 h-24 bg-white/5 border border-white/10 rounded-[32px] flex items-center justify-center text-4xl text-blue-400 shadow-inner">
              <i className="fa-solid fa-robot"></i>
            </div>
            <div>
              <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-none mb-2">AI TRAINER <span className="text-blue-500">PRO</span></h2>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.3em]">GRAVL-INSPIRED PERFORMANCE SYSTEM</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-center">
              <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">STATUS</p>
              <p className="text-xs font-black text-emerald-400 uppercase italic">READY</p>
            </div>
            <div className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-center">
              <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">VERSION</p>
              <p className="text-xs font-black text-blue-400 uppercase italic">v2.4</p>
            </div>
          </div>
        </div>
      </div>

      {/* SELECTOR DE CATEGORÍAS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => generateRoutine(cat.label)}
            disabled={loading}
            className="bg-[#0b1220] p-8 rounded-[32px] border border-white/5 shadow-xl hover:border-blue-500/50 hover:bg-[#111a2c] transition-all group disabled:opacity-50 text-left"
          >
            <div className={`w-14 h-14 rounded-2xl ${cat.bg} ${cat.color} flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform shadow-inner`}>
              <i className={`fa-solid ${cat.icon}`}></i>
            </div>
            <span className="text-[12px] font-black text-white uppercase tracking-[0.15em] block leading-tight">{cat.label}</span>
            <p className="text-[9px] font-bold text-white/30 uppercase tracking-tighter mt-2">GENERATE SESSION</p>
          </button>
        ))}
      </div>

      {loading && (
        <div className="bg-[#0b1220] p-20 rounded-[40px] text-center border border-white/5 shadow-2xl animate-pulse">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8 border border-white/10">
            <i className="fa-solid fa-dumbbell animate-bounce text-blue-500 text-3xl"></i>
          </div>
          <h3 className="text-white text-xl font-black uppercase italic tracking-tighter mb-2">CALCULATING OPTIMAL LOAD</h3>
          <p className="text-white/30 font-black uppercase tracking-[0.2em] text-[10px]">AI IS DESIGNING YOUR CUSTOM WORKOUT...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-[32px] text-red-400 text-[10px] font-black uppercase tracking-[0.2em] text-center">
          <i className="fa-solid fa-triangle-exclamation mr-3"></i>
          {error}
        </div>
      )}

      {routine && !loading && (
        <div className="space-y-8 animate-in slide-in-from-bottom-12 duration-700">
          {/* RESUMEN DE SESIÓN */}
          <div className="bg-[#0b1220] rounded-[40px] p-10 border border-white/10 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="px-3 py-1 bg-blue-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full">ACTIVE SESSION</span>
                <span className="text-white/30 text-[9px] font-black uppercase tracking-widest italic">{routine.objective}</span>
              </div>
              <h3 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none">{routine.title}</h3>
            </div>
            <button className="px-10 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-black uppercase italic tracking-tighter text-sm shadow-lg shadow-blue-600/20 transition-all active:scale-95">
              START WORKOUT <i className="fa-solid fa-play ml-3"></i>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* BLOQUE PRINCIPAL - ESTILO GRAVL CARDS */}
            <div className="lg:col-span-8 space-y-4">
              <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] mb-6 flex items-center gap-4">
                <span className="w-12 h-[1px] bg-white/10"></span>
                EXERCISE LIST
              </h4>
              {routine.exercises.map((ex, i) => (
                <div key={i} className="group bg-[#0b1220] border border-white/5 rounded-[32px] p-8 hover:border-blue-500/30 transition-all shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <span className="text-[10px] font-black text-blue-500/50 font-mono">#{String(i+1).padStart(2, '0')}</span>
                        <h5 className="text-xl font-black text-white uppercase italic tracking-tight group-hover:text-blue-400 transition-colors">{ex.name}</h5>
                      </div>
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-relaxed">{ex.notes}</p>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-8 border-l border-white/5 pl-8">
                      <div className="text-center">
                        <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-2">SETS</p>
                        <p className="text-2xl font-black text-white font-mono leading-none">{ex.sets}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-2">REPS</p>
                        <p className="text-2xl font-black text-white font-mono leading-none">{ex.reps}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-2">REST</p>
                        <p className="text-sm font-black text-blue-400 font-mono mt-1">{ex.rest}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* SIDEBAR DE PREPARACIÓN */}
            <div className="lg:col-span-4 space-y-8">
              {/* WARMUP */}
              <div className="bg-[#0b1220] rounded-[40px] p-8 border border-white/5 shadow-2xl">
                <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
                  <i className="fa-solid fa-fire-flame-curved"></i> WARMUP
                </h4>
                <div className="space-y-4">
                  {routine.warmup.map((step, i) => (
                    <div key={i} className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/10 transition-all">
                      <span className="text-[10px] font-black text-white/20 mt-0.5">{i + 1}</span>
                      <p className="text-[11px] font-bold text-white/70 uppercase tracking-tight">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* COOLDOWN */}
              <div className="bg-[#0b1220] rounded-[40px] p-8 border border-white/5 shadow-2xl">
                <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
                  <i className="fa-solid fa-leaf"></i> COOLDOWN
                </h4>
                <div className="space-y-4">
                  {routine.cooldown.map((step, i) => (
                    <div key={i} className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/10 transition-all">
                      <span className="text-[10px] font-black text-white/20 mt-0.5">{i + 1}</span>
                      <p className="text-[11px] font-bold text-white/70 uppercase tracking-tight">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* PRO TIP */}
              <div className="bg-blue-600 rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                <p className="text-[9px] font-black uppercase tracking-[0.3em] mb-4 opacity-50">PRO TIP</p>
                <p className="text-sm font-black italic leading-relaxed">"Focus on explosive concentric phase and controlled eccentric phase for maximum hypertrophy."</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AITrainer;
