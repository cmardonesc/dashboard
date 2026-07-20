import React, { useState, useEffect } from 'react';
import Markdown from 'react-markdown';

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
}

interface AthletePrescriptionProps {
  player: PlayerData;
  latestVam?: number | null;
  latestImtp?: number | null;
  aiSummary?: string | null;
}

const parseAthleteAiSummary = (text: string | null) => {
  if (!text) return null;

  let capacities = "";
  let improvements: string[] = [];
  let conclusion = "";

  const lowerText = text.toLowerCase();
  
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

  // Clean up trailing list headers or numbers like "2." or "2" left at the transition boundary
  capacities = capacities.replace(/\s*\d+[\.\-\:\s]*$/, "").trim();

  if (impIdx !== -1) {
    const start = text.indexOf("\n", impIdx);
    const end = conIdx !== -1 ? conIdx : text.length;
    const impText = text.substring(start, end).trim();
    
    const lines = impText.split("\n");
    improvements = lines
      .map(line => line.trim())
      .filter(line => line.startsWith("-") || line.startsWith("*") || /^\d+\./.test(line))
      .map(line => line.replace(/^(?:-|\*|\d+\.)\s*/, "").trim())
      .filter(line => line.length > 0 && !/^\d+[\.\s]*$/.test(line));

    if (improvements.length === 0) {
      const cleanedImp = impText.replace(/^(?:###|####|##|\*\*|:|-|\s)+/, "").trim();
      if (cleanedImp) {
        improvements = [cleanedImp];
      }
    }
  }

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

export const AthletePrescription: React.FC<AthletePrescriptionProps> = ({
  player,
  latestVam,
  latestImtp,
  aiSummary,
}) => {
  // Local storage key per player
  const storageKey = `athlete_prescription_${player.player_id}`;

  // Form State
  const [gymCelda, setGymCelda] = useState<string>('SIN_DATOS');
  const [gymGates, setGymGates] = useState<string[]>([]);
  const [gymFlags, setGymFlags] = useState<string[]>([]);

  const [canchaCelda, setCanchaCelda] = useState<string>('SIN_DATOS');

  const [aerobicoCelda, setAerobicoCelda] = useState<string>('SIN_DATOS');
  const [vamValue, setVamValue] = useState<string>('');
  const [vamPercentage, setVamPercentage] = useState<number>(105);

  const [isJsonExpanded, setIsJsonExpanded] = useState<boolean>(false);
  const [jsonInput, setJsonInput] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [copiedFullReport, setCopiedFullReport] = useState<boolean>(false);

  // Map values
  const GIMNASIO_TEXTS: Record<string, string> = {
    MANTENER: 'Mantención del nivel actual de fuerza y potencia; no es prioridad de énfasis este ciclo.',
    POTENCIA: 'Saltos con carga, contrastes, trabajo balístico. Tiene base de fuerza; el foco es convertirla en aplicación rápida.',
    FUERZA_MAXIMA: 'Gimnasio con cargas altas (sentadilla, empuje de cadera). Aplica rápido lo que tiene; el foco es subir el techo de fuerza.',
    FUERZA_PLIO_EXTENSIVA: 'Fuerza basal en gimnasio + pliometría extensiva. Foco en absorción de fuerza y stiffness.',
    HIIT_BICI: 'Estímulo en bicicleta estática (HIIT aeróbico) para mitigar impacto articular.',
    SIN_DATOS: 'Sin evaluación de fuerza registrada.',
  };

  const CANCHA_TEXTS: Record<string, string> = {
    DESARROLLO_ACELERACION_Y_COGNITIVO: 'Énfasis en aceleración lineal técnica (empujes) y agilidad reactiva.',
    AGILIDAD: 'Driles coordinativos, cambios de dirección mecánicos y agilidad con estímulo cognitivo en campo.',
    ACELERACION: 'Énfasis en aceleración lineal técnica (empujes) y velocidad máxima en distancias cortas.',
    PREVENCION_Y_CONTROL_MOTOR: 'Fuerza isométrica, excéntrica y control de frenado; foco en salud articular y muscular.',
    VELOCIDAD_MAXIMA: 'Sprint lineal en distancias medias/largas (20-40m); foco en mecánica de carrera erecta.',
    SIN_DATOS: 'Sin evaluación en cancha registrada.',
  };

  const AEROBICO_TEXTS: Record<string, string> = {
    HIIT_CARRERA_O_SSG: 'Fraccionados (e.g. 15"x15") o juegos reducidos intensos en cancha para desarrollo de VO2 Máx.',
    INTERMITENTE_FUERA_DE_CANCHA: 'Trabajo intermitente en bicicleta, elíptica o remo (sin impacto) para optimizar consumo de oxígeno.',
    HIIT_BICI: 'Estímulo en bicicleta estática (HIIT aeróbico) para mitigar impacto articular.',
    HIIT_CARRERA: 'Pasadas e intervalos de carrera a pie; foco en potencia y capacidad aeróbica.',
    SIN_DATOS: 'Sin evaluación de resistencia registrada.',
  };

  // Load saved state or set defaults
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setGymCelda(parsed.bloque_gimnasio?.celda || 'SIN_DATOS');
        setGymGates(parsed.bloque_gimnasio?.gates || []);
        setGymFlags(parsed.bloque_gimnasio?.flags || []);
        setCanchaCelda(parsed.bloque_cancha?.celda || 'SIN_DATOS');
        setAerobicoCelda(parsed.bloque_aerobico?.celda || 'SIN_DATOS');
        setVamValue(parsed.bloque_aerobico?.vam?.toString() || '');
        setVamPercentage(parsed.bloque_aerobico?.porcentaje || 105);
        setJsonError(null);
        return;
      } catch (e) {
        console.error('Error loading prescription from localStorage', e);
      }
    }

    // Set Defaults based on Athlete metrics if no saved prescription
    if (latestImtp && latestImtp > 0) {
      setGymCelda(latestImtp < 2800 ? 'FUERZA_MAXIMA' : 'FUERZA_PLIO_EXTENSIVA');
    } else {
      setGymCelda('SIN_DATOS');
    }
    setGymGates([]);
    setGymFlags([]);

    setCanchaCelda('SIN_DATOS');

    if (latestVam && latestVam > 0) {
      setAerobicoCelda('HIIT_CARRERA_O_SSG');
      setVamValue(latestVam.toFixed(1));
    } else {
      setAerobicoCelda('SIN_DATOS');
      setVamValue('');
    }
    setVamPercentage(105);
    setJsonError(null);
  }, [player.player_id, storageKey, latestVam, latestImtp]);

  // Save changes to localStorage
  const savePrescription = (
    gCelda: string,
    gGates: string[],
    gFlags: string[],
    cCelda: string,
    aCelda: string,
    vVal: string,
    vPct: number
  ) => {
    const dataObj = {
      jugador: `${player.nombre} ${player.apellido1}`,
      categoria: player.category_id ? `Sub-${player.category_id + 12}` : 'Sub-16', // reasonable fallback
      bloque_gimnasio: {
        celda: gCelda,
        gates: gGates,
        flags: gFlags,
      },
      bloque_cancha: {
        celda: cCelda,
      },
      bloque_aerobico: {
        celda: aCelda,
        vam: vVal ? parseFloat(vVal) : undefined,
        porcentaje: vPct,
      },
    };
    localStorage.setItem(storageKey, JSON.stringify(dataObj));
  };

  // Generated Outputs
  const generatedText = React.useMemo(() => {
    // 1. Gimnasio
    let gymText = GIMNASIO_TEXTS[gymCelda] || GIMNASIO_TEXTS.SIN_DATOS;
    if (gymCelda !== 'SIN_DATOS') {
      if (gymGates.includes('UNILATERAL')) {
        gymText += ' Tiene carácter asimétrico o déficit unilateral identificado; se sugiere priorizar variantes a una pierna (e.g. estocadas, subidas al cajón) para corregir desbalances.';
      }
      if (gymFlags.includes('IMTP_NO_FAMILIARIZADO')) {
        gymText += ' ⚠️ ADVERTENCIA: Atleta no familiarizado con el test de IMTP; los valores de fuerza máxima podrían estar subestimados y deben interpretarse con precaución.';
      }
      if (gymFlags.includes('QC_REVISAR_EJECUCION')) {
        gymText += ' 🚨 ALERTA DE CONTROL DE CALIDAD: Curva de fuerza-tiempo con artefacto o meseta atípica; se sugiere revisar el video de ejecución antes de validar la marca.';
      }
    } else {
      gymText = 'Sin evaluación de fuerza registrada.';
    }

    // 2. Cancha
    let canchaText = CANCHA_TEXTS[canchaCelda] || CANCHA_TEXTS.SIN_DATOS;
    if (canchaCelda === 'SIN_DATOS') {
      canchaText = 'Sin evaluación en cancha registrada.';
    }

    // 3. Aeróbico
    let aerobicoText = AEROBICO_TEXTS[aerobicoCelda] || AEROBICO_TEXTS.SIN_DATOS;
    if (aerobicoCelda !== 'SIN_DATOS') {
      if (vamValue) {
        const vamNum = parseFloat(vamValue);
        if (!isNaN(vamNum) && vamNum > 0) {
          const calculatedSpeed = (vamNum * (vamPercentage / 100)).toFixed(1);
          aerobicoText += ` Se sugiere realizar el trabajo a una intensidad sugerida del ${vamPercentage}% VAM (${calculatedSpeed} km/h).`;
        }
      }
    } else {
      aerobicoText = 'Sin evaluación de resistencia registrada.';
    }

    return `GIMNASIO: ${gymText}\nCANCHA: ${canchaText}\nAERÓBICO: ${aerobicoText}`;
  }, [gymCelda, gymGates, gymFlags, canchaCelda, aerobicoCelda, vamValue, vamPercentage]);

  // Generated JSON
  const generatedJson = React.useMemo(() => {
    const catName = player.category_id ? `Sub-${player.category_id + 12}` : 'Sub-16';
    return JSON.stringify(
      {
        jugador: `${player.nombre} ${player.apellido1}`,
        categoria: catName,
        bloque_gimnasio: {
          celda: gymCelda,
          gates: gymCelda !== 'SIN_DATOS' ? gymGates : [],
          flags: gymCelda !== 'SIN_DATOS' ? gymFlags : [],
        },
        bloque_cancha: {
          celda: canchaCelda,
        },
        bloque_aerobico: {
          celda: aerobicoCelda,
          ...(aerobicoCelda !== 'SIN_DATOS' && vamValue ? { vam: parseFloat(vamValue) } : {}),
        },
      },
      null,
      2
    );
  }, [player, gymCelda, gymGates, gymFlags, canchaCelda, aerobicoCelda, vamValue]);

  // Handle manual JSON paste
  const handleImportJson = () => {
    try {
      if (!jsonInput.trim()) {
        setJsonError('El JSON de entrada está vacío.');
        return;
      }
      const parsed = JSON.parse(jsonInput);
      
      // Update states
      if (parsed.bloque_gimnasio) {
        setGymCelda(parsed.bloque_gimnasio.celda || 'SIN_DATOS');
        setGymGates(parsed.bloque_gimnasio.gates || []);
        setGymFlags(parsed.bloque_gimnasio.flags || []);
      }
      if (parsed.bloque_cancha) {
        setCanchaCelda(parsed.bloque_cancha.celda || 'SIN_DATOS');
      }
      if (parsed.bloque_aerobico) {
        setAerobicoCelda(parsed.bloque_aerobico.celda || 'SIN_DATOS');
        if (parsed.bloque_aerobico.vam != null) {
          setVamValue(parsed.bloque_aerobico.vam.toString());
        }
      }
      setJsonError(null);
      
      // Save
      savePrescription(
        parsed.bloque_gimnasio?.celda || 'SIN_DATOS',
        parsed.bloque_gimnasio?.gates || [],
        parsed.bloque_gimnasio?.flags || [],
        parsed.bloque_cancha?.celda || 'SIN_DATOS',
        parsed.bloque_aerobico?.celda || 'SIN_DATOS',
        parsed.bloque_aerobico?.vam?.toString() || '',
        parsed.bloque_aerobico?.porcentaje || 105
      );
    } catch (e: any) {
      setJsonError(`JSON Inválido: ${e.message}`);
    }
  };

  const copyToClipboard = (text: string, isJson: boolean) => {
    navigator.clipboard.writeText(text);
    if (isJson) {
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    } else {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  const handleGateToggle = (gate: string) => {
    const updated = gymGates.includes(gate)
      ? gymGates.filter((g) => g !== gate)
      : [...gymGates, gate];
    setGymGates(updated);
    savePrescription(gymCelda, updated, gymFlags, canchaCelda, aerobicoCelda, vamValue, vamPercentage);
  };

  const handleFlagToggle = (flag: string) => {
    const updated = gymFlags.includes(flag)
      ? gymFlags.filter((f) => f !== flag)
      : [...gymFlags, flag];
    setGymFlags(updated);
    savePrescription(gymCelda, gymGates, updated, canchaCelda, aerobicoCelda, vamValue, vamPercentage);
  };

  return (
    <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 space-y-8 mt-8">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic flex items-center gap-2">
            <i className="fa-solid fa-file-invoice text-red-500"></i>
            Prescripción Metodológica Individualizada
          </h3>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
            Configuración y sugerencias de entrenamiento basadas en el perfil de {player.nombre}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="bg-red-600 hover:bg-red-500 text-white rounded-2xl px-5 py-2.5 text-[10px] font-black outline-none uppercase tracking-widest transition-all shadow-md shadow-red-600/20 flex items-center gap-2 cursor-pointer"
          >
            <i className="fa-solid fa-file-invoice"></i>
            Exportar Ficha Completa
          </button>

          <button
            onClick={() => setIsJsonExpanded(!isJsonExpanded)}
            className="bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-2xl px-4 py-2 text-[10px] font-black text-slate-500 outline-none uppercase tracking-widest transition-colors flex items-center gap-2 cursor-pointer"
          >
            <i className="fa-solid fa-code"></i>
            {isJsonExpanded ? 'Ocultar JSON' : 'Ver/Importar JSON'}
          </button>
        </div>
      </div>

      {/* EXPANDABLE JSON AREA */}
      {isJsonExpanded && (
        <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 space-y-4 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Pegar JSON para Importar</span>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder='{\n  "bloque_gimnasio": {\n    "celda": "FUERZA_PLIO_EXTENSIVA",\n    "gates": ["UNILATERAL"],\n    "flags": ["IMTP_NO_FAMILIARIZADO"]\n  }\n}'
                className="w-full h-44 bg-white border border-slate-100 rounded-2xl p-4 font-mono text-xs text-slate-700 outline-none focus:ring-2 focus:ring-red-500 resize-none"
              />
              <div className="flex items-center justify-between">
                <button
                  onClick={handleImportJson}
                  className="bg-red-500 hover:bg-red-600 rounded-2xl px-4 py-2 text-[10px] font-black text-white uppercase tracking-widest transition-colors"
                >
                  Importar Datos
                </button>
                {jsonError && <span className="text-[10px] font-bold text-red-500">{jsonError}</span>}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">JSON Generado</span>
                <button
                  onClick={() => copyToClipboard(generatedJson, true)}
                  className="text-red-500 hover:text-red-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-copy"></i>
                  {copiedJson ? '¡Copiado!' : 'Copiar JSON'}
                </button>
              </div>
              <pre className="w-full h-44 bg-slate-900 text-slate-200 rounded-2xl p-4 font-mono text-[11px] overflow-y-auto border border-slate-800">
                {generatedJson}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE FORM BUILDER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* BLOQUE GIMNASIO */}
        <div className="bg-slate-50/50 rounded-3xl p-6 border border-slate-100/60 space-y-5">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-red-100 text-red-500 flex items-center justify-center">
              <i className="fa-solid fa-dumbbell text-sm"></i>
            </span>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Bloque Gimnasio</h4>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Énfasis (Celda)</label>
              <select
                value={gymCelda}
                onChange={(e) => {
                  setGymCelda(e.target.value);
                  savePrescription(e.target.value, gymGates, gymFlags, canchaCelda, aerobicoCelda, vamValue, vamPercentage);
                }}
                className="w-full bg-white border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-red-500 uppercase tracking-wider"
              >
                {Object.keys(GIMNASIO_TEXTS).map((key) => (
                  <option key={key} value={key}>
                    {key.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            {gymCelda !== 'SIN_DATOS' && (
              <>
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Asimetrías / Gates</span>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={gymGates.includes('UNILATERAL')}
                      onChange={() => handleGateToggle('UNILATERAL')}
                      className="rounded border-slate-200 text-red-500 focus:ring-red-500 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Déficit Unilateral</span>
                  </label>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Flags / Alertas de Test</span>
                  <div className="space-y-2">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={gymFlags.includes('IMTP_NO_FAMILIARIZADO')}
                        onChange={() => handleFlagToggle('IMTP_NO_FAMILIARIZADO')}
                        className="rounded border-slate-200 text-red-500 focus:ring-red-500 w-4 h-4 mt-0.5 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                        ⚠️ No Familiarizado
                      </span>
                    </label>

                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={gymFlags.includes('QC_REVISAR_EJECUCION')}
                        onChange={() => handleFlagToggle('QC_REVISAR_EJECUCION')}
                        className="rounded border-slate-200 text-red-500 focus:ring-red-500 w-4 h-4 mt-0.5 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                        🚨 Revisar Ejecución
                      </span>
                    </label>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* BLOQUE CANCHA */}
        <div className="bg-slate-50/50 rounded-3xl p-6 border border-slate-100/60 space-y-5">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-500 flex items-center justify-center">
              <i className="fa-solid fa-person-running text-sm"></i>
            </span>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Bloque Cancha</h4>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Énfasis (Celda)</label>
              <select
                value={canchaCelda}
                onChange={(e) => {
                  setCanchaCelda(e.target.value);
                  savePrescription(gymCelda, gymGates, gymFlags, e.target.value, aerobicoCelda, vamValue, vamPercentage);
                }}
                className="w-full bg-white border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-red-500 uppercase tracking-wider"
              >
                {Object.keys(CANCHA_TEXTS).map((key) => (
                  <option key={key} value={key}>
                    {key.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* BLOQUE AERÓBICO */}
        <div className="bg-slate-50/50 rounded-3xl p-6 border border-slate-100/60 space-y-5">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-500 flex items-center justify-center">
              <i className="fa-solid fa-lungs text-sm"></i>
            </span>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Bloque Aeróbico</h4>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Énfasis (Celda)</label>
              <select
                value={aerobicoCelda}
                onChange={(e) => {
                  setAerobicoCelda(e.target.value);
                  savePrescription(gymCelda, gymGates, gymFlags, canchaCelda, e.target.value, vamValue, vamPercentage);
                }}
                className="w-full bg-white border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-red-500 uppercase tracking-wider"
              >
                {Object.keys(AEROBICO_TEXTS).map((key) => (
                  <option key={key} value={key}>
                    {key.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            {aerobicoCelda !== 'SIN_DATOS' && (
              <div className="space-y-3 pt-2 border-t border-slate-100 grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">VAM (km/h)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="10"
                    max="25"
                    value={vamValue}
                    onChange={(e) => {
                      setVamValue(e.target.value);
                      savePrescription(gymCelda, gymGates, gymFlags, canchaCelda, aerobicoCelda, e.target.value, vamPercentage);
                    }}
                    placeholder="e.g. 17.2"
                    className="w-full bg-white border border-slate-100 rounded-xl px-3 py-1.5 text-xs font-black text-slate-700 outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Intensidad (%)</label>
                  <input
                    type="number"
                    step="1"
                    min="50"
                    max="150"
                    value={vamPercentage}
                    onChange={(e) => {
                      const p = parseInt(e.target.value) || 105;
                      setVamPercentage(p);
                      savePrescription(gymCelda, gymGates, gymFlags, canchaCelda, aerobicoCelda, vamValue, p);
                    }}
                    className="w-full bg-white border border-slate-100 rounded-xl px-3 py-1.5 text-xs font-black text-slate-700 outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FINAL RENDERED OUTPUT AREA */}
      <div className="bg-slate-50 rounded-[32px] p-6 border border-slate-100 space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Texto de Prescripción Resultante</span>
          <button
            onClick={() => copyToClipboard(generatedText, false)}
            className="text-red-500 hover:text-red-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors"
          >
            <i className="fa-solid fa-copy"></i>
            {copiedText ? '¡Copiado!' : 'Copiar Prescripción'}
          </button>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-100/80 shadow-inner font-sans text-xs text-slate-800 leading-relaxed whitespace-pre-line space-y-4">
          <div>
            <span className="font-black text-slate-900 tracking-wider">GIMNASIO:</span>{' '}
            {generatedText.split('\n')[0].replace('GIMNASIO: ', '')}
          </div>
          <div>
            <span className="font-black text-slate-900 tracking-wider">CANCHA:</span>{' '}
            {generatedText.split('\n')[1].replace('CANCHA: ', '')}
          </div>
          <div>
            <span className="font-black text-slate-900 tracking-wider">AERÓBICO:</span>{' '}
            {generatedText.split('\n')[2].replace('AERÓBICO: ', '')}
          </div>
        </div>
      </div>

      {/* EXPORT MODAL FOR FICHA DE RENDIMIENTO COMPLETA */}
      {isExportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 z-50 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 no-print">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-red-600/10 text-red-600 flex items-center justify-center">
                  <i className="fa-solid fa-file-invoice text-lg"></i>
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight italic">Ficha Deportiva de Rendimiento</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Reporte Integrado y Prescripción Metodológica</p>
                </div>
              </div>
              <button 
                onClick={() => setIsExportModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="p-8 overflow-y-auto space-y-8 flex-1" id="print-area">
              {/* PRINT STYLE INJECTION */}
              <style dangerouslySetInnerHTML={{__html: `
                @media print {
                  body * {
                    visibility: hidden !important;
                  }
                  #print-area, #print-area * {
                    visibility: visible !important;
                  }
                  #print-area {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    background: white !important;
                    color: black !important;
                  }
                  .no-print {
                    display: none !important;
                  }
                }
              `}} />

              {/* Official Branding Header for Print */}
              <div className="border-b-4 border-red-600 pb-4 flex justify-between items-end gap-4">
                <div>
                  <p className="text-[9px] font-black tracking-widest text-red-600 uppercase">La Roja Performance Hub</p>
                  <h2 className="text-xl font-black uppercase text-slate-900 tracking-tighter italic">Ficha de Evaluación y Planificación</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Departamento de Ciencias Aplicadas al Fútbol - FFCH</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-800 font-mono">FECHA: {new Date().toLocaleDateString('es-ES')}</p>
                  <p className="text-[8px] text-slate-400 font-bold uppercase">Sincronización en Tiempo Real con Motor Gemini</p>
                </div>
              </div>

              {/* Player Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Atleta</span>
                  <span className="text-xs font-black text-slate-800 uppercase italic">{player.nombre} {player.apellido1} {player.apellido2}</span>
                </div>
                <div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Posición</span>
                  <span className="text-xs font-bold text-slate-700">{player.posicion}</span>
                </div>
                <div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Categoría</span>
                  <span className="text-xs font-bold text-slate-700">{player.category_id ? `Sub-${player.category_id + 12}` : 'Sub-16'}</span>
                </div>
                <div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Club</span>
                  <span className="text-xs font-bold text-slate-700">{player.club || player.club_name || 'N/A'}</span>
                </div>
              </div>

              {/* Section 1: AI Smart Profile */}
              <div className="space-y-4">
                <h4 className="text-[11px] font-black text-red-600 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                  <i className="fa-solid fa-brain mr-1.5"></i>
                  I. Perfil de Inteligencia Deportiva (Análisis IA)
                </h4>
                
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Análisis de Capacidades Físicas</span>
                    <div className="text-xs text-slate-700 leading-relaxed bg-slate-50/50 p-4 rounded-xl border border-slate-100/50 whitespace-pre-line prose max-w-none">
                      {parseAthleteAiSummary(aiSummary)?.capacities}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Objetivos Tácticos y de Mejora</span>
                      <ul className="text-xs text-slate-700 space-y-2 bg-slate-50/50 p-4 rounded-xl border border-slate-100/50">
                        {parseAthleteAiSummary(aiSummary)?.improvements.map((imp, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-red-500 mt-0.5">•</span>
                            <span className="font-semibold leading-relaxed">{imp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Conclusión Técnico-Científica</span>
                      <div className="bg-red-50/40 border border-red-100/60 p-4 rounded-xl text-xs text-red-900 leading-relaxed font-medium italic">
                        "{parseAthleteAiSummary(aiSummary)?.conclusion || 'El jugador presenta un biotipo físico y motor aeróbico sobresalientes para su categoría.'}"
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Methodological Prescription */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="text-[11px] font-black text-red-600 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                  <i className="fa-solid fa-rectangle-list mr-1.5"></i>
                  II. Prescripción Metodológica y Planificación
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Gym Block */}
                  <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-100 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-red-100 text-red-500 flex items-center justify-center text-xs">
                        <i className="fa-solid fa-dumbbell"></i>
                      </span>
                      <span className="text-[10px] font-black uppercase text-slate-800 tracking-wider">Gimnasio</span>
                    </div>
                    <div>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Énfasis</span>
                      <span className="text-xs font-black text-slate-800 uppercase italic">{gymCelda.replace(/_/g, ' ')}</span>
                    </div>
                    <div>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Detalle de Trabajo</span>
                      <p className="text-[10px] text-slate-600 leading-relaxed font-semibold">
                        {GIMNASIO_TEXTS[gymCelda]}
                        {gymCelda !== 'SIN_DATOS' && gymGates.includes('UNILATERAL') && ' (Requiere priorizar variantes a una pierna).'}
                        {gymCelda !== 'SIN_DATOS' && gymFlags.includes('IMTP_NO_FAMILIARIZADO') && ' [⚠️ No familiarizado con IMTP].'}
                        {gymCelda !== 'SIN_DATOS' && gymFlags.includes('QC_REVISAR_EJECUCION') && ' [🚨 Revisar ejecución de test].'}
                      </p>
                    </div>
                  </div>

                  {/* Pitch Block */}
                  <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-100 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-500 flex items-center justify-center text-xs">
                        <i className="fa-solid fa-person-running"></i>
                      </span>
                      <span className="text-[10px] font-black uppercase text-slate-800 tracking-wider">Cancha</span>
                    </div>
                    <div>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Énfasis</span>
                      <span className="text-xs font-black text-slate-800 uppercase italic">{canchaCelda.replace(/_/g, ' ')}</span>
                    </div>
                    <div>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Detalle de Trabajo</span>
                      <p className="text-[10px] text-slate-600 leading-relaxed font-semibold">{CANCHA_TEXTS[canchaCelda]}</p>
                    </div>
                  </div>

                  {/* Aerobic Block */}
                  <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-100 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-500 flex items-center justify-center text-xs">
                        <i className="fa-solid fa-lungs"></i>
                      </span>
                      <span className="text-[10px] font-black uppercase text-slate-800 tracking-wider">Aeróbico</span>
                    </div>
                    <div>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Énfasis</span>
                      <span className="text-xs font-black text-slate-800 uppercase italic">{aerobicoCelda.replace(/_/g, ' ')}</span>
                    </div>
                    <div>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Objetivo</span>
                      <p className="text-[10px] text-slate-600 leading-relaxed font-semibold">
                        {AEROBICO_TEXTS[aerobicoCelda]}
                        {aerobicoCelda !== 'SIN_DATOS' && vamValue && ` Intensidad sugerida del ${vamPercentage}% VAM (${(parseFloat(vamValue) * (vamPercentage / 100)).toFixed(1)} km/h).`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Signatures Section */}
              <div className="pt-12 grid grid-cols-2 gap-12 text-center">
                <div className="space-y-1">
                  <div className="border-t border-slate-300 w-48 mx-auto"></div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Preparador Físico Responsable</p>
                  <p className="text-[8px] text-slate-400">La Roja Femenina / Masculina</p>
                </div>
                <div className="space-y-1">
                  <div className="border-t border-slate-300 w-48 mx-auto"></div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Departamento de Ciencias</p>
                  <p className="text-[8px] text-slate-400">Federación de Fútbol de Chile</p>
                </div>
              </div>
            </div>

            {/* Modal Footer (Actions) */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-wrap justify-between items-center gap-4 no-print">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <i className="fa-solid fa-circle-info text-red-500 mr-1"></i>
                Este reporte combina análisis automatizado de IA y métricas fisiológicas reales.
              </span>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const mdReport = `
# FICHA DE EVALUACIÓN Y RENDIMIENTO - LA ROJA PERFORMANCE HUB
**FECHA:** ${new Date().toLocaleDateString('es-ES')}

## DATOS DEL ATLETA
- **Nombre:** ${player.nombre} ${player.apellido1} ${player.apellido2}
- **Posición:** ${player.posicion}
- **Categoría:** ${player.category_id ? `Sub-${player.category_id + 12}` : 'Sub-16'}
- **Club:** ${player.club || player.club_name || 'N/A'}

## I. PERFIL DE INTELIGENCIA DEPORTIVA (ANÁLISIS IA)
### Análisis de Capacidades Físicas:
${parseAthleteAiSummary(aiSummary)?.capacities}

### Objetivos Tácticos:
${parseAthleteAiSummary(aiSummary)?.improvements.map(imp => `- ${imp}`).join('\n')}

### Conclusión Técnico-Científica:
"${parseAthleteAiSummary(aiSummary)?.conclusion}"

## II. PLANIFICACIÓN Y PRESCRIPCIÓN METODOLÓGICA
### 1. Bloque Gimnasio:
- **Énfasis:** ${gymCelda.replace(/_/g, ' ')}
- **Detalle:** ${GIMNASIO_TEXTS[gymCelda]}
- **Asimetrías/Gates:** ${gymCelda !== 'SIN_DATOS' && gymGates.includes('UNILATERAL') ? 'Requiere variante a una pierna para corregir déficit' : 'Sin asimetrías registradas'}
- **Alertas:** ${gymCelda !== 'SIN_DATOS' ? gymFlags.join(', ') : 'Ninguna'}

### 2. Bloque Cancha:
- **Énfasis:** ${canchaCelda.replace(/_/g, ' ')}
- **Detalle:** ${CANCHA_TEXTS[canchaCelda]}

### 3. Bloque Aeróbico:
- **Énfasis:** ${aerobicoCelda.replace(/_/g, ' ')}
- **Detalle:** ${AEROBICO_TEXTS[aerobicoCelda]} ${aerobicoCelda !== 'SIN_DATOS' && vamValue ? `(VAM: ${vamValue} km/h al ${vamPercentage}%)` : ''}
                    `.trim();
                    navigator.clipboard.writeText(mdReport);
                    setCopiedFullReport(true);
                    setTimeout(() => setCopiedFullReport(false), 2500);
                  }}
                  className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-2xl px-5 py-2.5 text-[10px] font-black uppercase tracking-widest transition flex items-center gap-2 cursor-pointer animate-fade-in"
                >
                  <i className="fa-solid fa-copy"></i>
                  {copiedFullReport ? '¡Reporte Copiado!' : 'Copiar Reporte'}
                </button>

                <button
                  onClick={() => window.print()}
                  className="bg-red-600 hover:bg-red-500 text-white rounded-2xl px-5 py-2.5 text-[10px] font-black uppercase tracking-widest transition shadow-md shadow-red-600/20 flex items-center gap-2 cursor-pointer"
                >
                  <i className="fa-solid fa-print"></i>
                  Imprimir / PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
