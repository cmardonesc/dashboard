import React, { useState, useEffect } from 'react';

interface PlayerData {
  player_id: number;
  nombre: string;
  apellido1: string;
  apellido2: string;
  category_id: number;
  posicion: string;
  fecha_nacimiento: string;
}

interface AthletePrescriptionProps {
  player: PlayerData;
  latestVam?: number | null;
  latestImtp?: number | null;
}

export const AthletePrescription: React.FC<AthletePrescriptionProps> = ({
  player,
  latestVam,
  latestImtp,
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

        <button
          onClick={() => setIsJsonExpanded(!isJsonExpanded)}
          className="bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-2xl px-4 py-2 text-[10px] font-black text-slate-500 outline-none uppercase tracking-widest transition-colors flex items-center gap-2"
        >
          <i className="fa-solid fa-code"></i>
          {isJsonExpanded ? 'Ocultar JSON' : 'Ver/Importar JSON'}
        </button>
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
    </div>
  );
};
