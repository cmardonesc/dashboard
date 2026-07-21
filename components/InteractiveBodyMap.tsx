import React, { useState } from 'react';
import { BODY_PARTS } from '../constants';

interface InteractiveBodyMapProps {
  selectedAreas: string[];
  onToggleArea: (areaLabel: string) => void;
  view: 'ANTERIOR' | 'POSTERIOR';
}

export const InteractiveBodyMap: React.FC<InteractiveBodyMapProps> = ({
  selectedAreas,
  onToggleArea,
  view
}) => {
  const [hoveredArea, setHoveredArea] = useState<string | null>(null);

  // Precise SVG dimensions
  const width = 220;
  const height = 480;

  // Let's obtain the list of parts for the active view to validate and match labels
  const partsList = BODY_PARTS[view];

  // Map the body parts to SVG elements
  const renderBodyPart = (part: { id: string; label: string; category: string }) => {
    const isSelected = selectedAreas.includes(part.label);
    const isHovered = hoveredArea === part.label;

    // Default SVG Path Coordinates mapping
    let pathD = '';
    
    if (view === 'ANTERIOR') {
      switch (part.id) {
        case 'cabeza':
          // Head / Face
          pathD = 'M110,20 C124,20 134,28 134,42 C134,56 122,66 110,66 C98,66 86,56 86,42 C86,28 96,20 110,20 Z';
          break;
        case 'cuello_ant':
          // Neck front
          pathD = 'M102,65 L118,65 L116,84 L104,84 Z';
          break;
        case 'hombro_der':
          // Right Shoulder (Viewer's Left)
          pathD = 'M92,84 C84,84 72,90 68,102 C64,114 74,124 82,124 C86,124 90,116 96,102 Z';
          break;
        case 'hombro_izq':
          // Left Shoulder (Viewer's Right)
          pathD = 'M128,84 C136,84 148,90 152,102 C156,114 146,124 138,124 C134,124 130,116 124,102 Z';
          break;
        case 'pectoral_der':
          // Right Pectoral (Viewer's Left)
          pathD = 'M78,102 L110,102 L110,135 L78,135 Z';
          break;
        case 'pectoral_izq':
          // Left Pectoral (Viewer's Right)
          pathD = 'M110,102 L142,102 L142,135 L110,135 Z';
          break;
        case 'biceps_der':
          // Right Biceps (Viewer's Left)
          pathD = 'M64,112 L76,122 L70,165 L58,155 Z';
          break;
        case 'biceps_izq':
          // Left Biceps (Viewer's Right)
          pathD = 'M156,112 L144,122 L150,165 L162,155 Z';
          break;
        case 'antebrazo_der':
          // Right Forearm (Viewer's Left)
          pathD = 'M57,160 L68,168 L57,225 L47,212 Z';
          break;
        case 'antebrazo_izq':
          // Left Forearm (Viewer's Right)
          pathD = 'M163,160 L152,168 L163,225 L173,212 Z';
          break;
        case 'mano_der':
          // Right Hand (Viewer's Left)
          pathD = 'M46,215 C42,222 36,232 36,242 C36,252 46,257 50,249 L52,222 Z';
          break;
        case 'mano_izq':
          // Left Hand (Viewer's Right)
          pathD = 'M174,215 C178,222 184,232 184,242 C184,252 174,257 170,249 L168,222 Z';
          break;
        case 'abdomen':
          // Abdomen
          pathD = 'M84,137 L136,137 L128,195 L92,195 Z';
          break;
        case 'oblicuo_der':
          // Right Oblique (Viewer's Left)
          pathD = 'M76,135 L84,137 L92,195 L84,195 Z';
          break;
        case 'oblicuo_izq':
          // Left Oblique (Viewer's Right)
          pathD = 'M144,135 L136,137 L128,195 L136,195 Z';
          break;
        case 'flexor_cadera_der':
          // Right Hip Flexor (Viewer's Left)
          pathD = 'M76,198 L94,198 L86,225 L74,225 Z';
          break;
        case 'flexor_cadera_izq':
          // Left Hip Flexor (Viewer's Right)
          pathD = 'M144,198 L126,198 L134,225 L146,225 Z';
          break;
        case 'psoasiliaco_der':
          // Right Psoas
          pathD = 'M94,198 L106,198 L101,225 L88,225 Z';
          break;
        case 'psoasiliaco_izq':
          // Left Psoas
          pathD = 'M126,198 L114,198 L119,225 L132,225 Z';
          break;
        case 'aductores_der':
          // Right Adductors (Viewer's Left)
          pathD = 'M95,228 L109,228 L101,295 L91,295 Z';
          break;
        case 'aductores_izq':
          // Left Adductors (Viewer's Right)
          pathD = 'M125,228 L111,228 L119,295 L129,295 Z';
          break;
        case 'cuadriceps_der':
          // Right Quadriceps (Viewer's Left)
          pathD = 'M74,228 L94,228 L88,320 L70,305 Z';
          break;
        case 'cuadriceps_izq':
          // Left Quadriceps (Viewer's Right)
          pathD = 'M146,228 L126,228 L132,320 L150,305 Z';
          break;
        case 'rodilla_der':
          // Right Knee (Viewer's Left)
          pathD = 'M70,323 L86,323 L86,341 L70,341 Z';
          break;
        case 'rodilla_izq':
          // Left Knee (Viewer's Right)
          pathD = 'M134,323 L150,323 L150,341 L134,341 Z';
          break;
        case 'tibial_der':
          // Right Shin (Viewer's Left)
          pathD = 'M70,343 L84,343 L76,435 L66,435 Z';
          break;
        case 'tibial_izq':
          // Left Shin (Viewer's Right)
          pathD = 'M150,343 L136,343 L144,435 L154,435 Z';
          break;
        case 'tobillo_pie_der':
          // Right Foot (Viewer's Left)
          pathD = 'M66,438 L76,438 L72,475 L56,475 Z';
          break;
        case 'tobillo_pie_izq':
          // Left Foot (Viewer's Right)
          pathD = 'M154,438 L144,438 L148,475 L164,475 Z';
          break;
      }
    } else {
      // POSTERIOR
      switch (part.id) {
        case 'nuca':
          // Nape of neck / Back of head
          pathD = 'M110,20 C124,20 134,28 134,42 C134,56 122,66 110,66 C98,66 86,56 86,42 C86,28 96,20 110,20 Z';
          break;
        case 'cuello_post':
          // Traps / back neck
          pathD = 'M96,65 L124,65 L126,88 L94,88 Z';
          break;
        case 'hombro_post_der':
          // Right Shoulder Back (Viewer's Right from back view)
          pathD = 'M128,84 C136,84 148,90 152,102 C156,114 146,124 138,124 C134,124 130,116 124,102 Z';
          break;
        case 'hombro_post_izq':
          // Left Shoulder Back (Viewer's Left from back view)
          pathD = 'M92,84 C84,84 72,90 68,102 C64,114 74,124 82,124 C86,124 90,116 96,102 Z';
          break;
        case 'triceps_der':
          // Right Triceps (Viewer's Right)
          pathD = 'M156,112 L144,122 L150,165 L162,155 Z';
          break;
        case 'triceps_izq':
          // Left Triceps (Viewer's Left)
          pathD = 'M64,112 L76,122 L70,165 L58,155 Z';
          break;
        case 'dorsal_der':
          // Right Lat (Viewer's Right)
          pathD = 'M110,88 L142,88 L136,145 L110,145 Z';
          break;
        case 'dorsal_izq':
          // Left Lat (Viewer's Left)
          pathD = 'M78,88 L110,88 L110,145 L84,145 Z';
          break;
        case 'lumbar':
          // Lumbar
          pathD = 'M84,146 L136,146 L130,195 L90,195 Z';
          break;
        case 'gluteo_der':
          // Right Glute (Viewer's Right)
          pathD = 'M110,196 L138,196 L132,245 L110,245 Z';
          break;
        case 'gluteo_izq':
          // Left Glute (Viewer's Left)
          pathD = 'M82,196 L110,196 L110,245 L88,245 Z';
          break;
        case 'isquio_der':
          // Right Hamstring (Viewer's Right)
          pathD = 'M110,246 L132,246 L124,320 L110,320 Z';
          break;
        case 'isquio_izq':
          // Left Hamstring (Viewer's Left)
          pathD = 'M88,246 L110,246 L110,320 L96,320 Z';
          break;
        case 'popliteo_der':
          // Right back knee (Viewer's Right)
          pathD = 'M110,322 L124,322 L120,344 L110,344 Z';
          break;
        case 'popliteo_izq':
          // Left back knee (Viewer's Left)
          pathD = 'M96,322 L110,322 L110,344 L100,344 Z';
          break;
        case 'gemelo_der':
          // Right Calf (Viewer's Right)
          pathD = 'M110,346 L124,346 L118,438 L110,438 Z';
          break;
        case 'gemelo_izq':
          // Left Calf (Viewer's Left)
          pathD = 'M96,346 L110,346 L110,438 L102,438 Z';
          break;
        case 'aquiles_der':
          // Right Achilles (Viewer's Right)
          pathD = 'M110,440 L118,440 L116,475 L110,475 Z';
          break;
        case 'aquiles_izq':
          // Left Achilles (Viewer's Left)
          pathD = 'M102,440 L110,440 L110,475 L104,475 Z';
          break;
      }
    }

    if (!pathD) return null;

    return (
      <g key={part.id}>
        <path
          d={pathD}
          onClick={() => onToggleArea(part.label)}
          onMouseEnter={() => setHoveredArea(part.label)}
          onMouseLeave={() => setHoveredArea(null)}
          className={`cursor-pointer transition-all duration-300 stroke-white stroke-[1.5] ${
            isSelected
              ? 'fill-[#CF1B2B] hover:fill-red-700 filter drop-shadow-[0_0_4px_rgba(207,27,43,0.6)]'
              : isHovered
              ? 'fill-slate-400 opacity-80'
              : 'fill-slate-300 hover:fill-slate-400'
          }`}
        />
      </g>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center p-2 bg-slate-50 rounded-[32px] border border-slate-100 shadow-inner relative select-none">
      {/* Dynamic Tooltip */}
      <div className="h-6 mb-2 flex items-center justify-center">
        {hoveredArea ? (
          <span className="text-[10px] font-black uppercase tracking-widest text-[#CF1B2B] bg-red-50 px-3 py-1 rounded-full border border-red-100 animate-in fade-in zoom-in-95 duration-150">
            👉 {hoveredArea}
          </span>
        ) : (
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
            Toca el cuerpo para marcar dolor/molestia
          </span>
        )}
      </div>

      <div className="relative w-full max-w-[210px] aspect-[220/480] flex items-center justify-center">
        {/* Soft Background Human Silhouette for complete visual aesthetic */}
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="absolute inset-0 w-full h-full pointer-events-none opacity-20"
        >
          {/* Symmetrical body outline */}
          <path
            d="M110,15 C130,15 136,30 136,45 C136,55 124,65 124,75 C132,75 156,80 160,95 C164,110 156,130 156,150 C156,170 172,210 172,225 C172,240 186,245 186,255 C186,260 178,265 172,250 L164,225 C160,215 152,210 148,210 L148,225 C148,245 138,310 134,330 L152,330 C152,340 148,435 148,445 L166,450 C166,465 152,485 144,485 C136,485 134,460 130,455 L124,440 L110,440 L96,440 L90,455 C86,460 84,485 76,485 C68,485 54,465 54,450 L72,445 C72,435 68,340 68,330 L86,330 C82,310 72,245 72,225 L72,210 C68,210 60,215 56,225 L48,250 C42,265 34,260 34,255 C34,245 48,240 48,225 C48,210 64,170 64,150 C64,130 56,110 60,95 C64,80 88,75 96,75 C96,65 84,55 84,45 C84,30 90,15 110,15 Z"
            fill="#94a3b8"
          />
        </svg>

        {/* Interactive SVG Layer */}
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full relative z-10"
        >
          {partsList.map((part) => renderBodyPart(part))}
        </svg>
      </div>

      {/* Quick selection status list underneath body map */}
      {selectedAreas.length > 0 && (
        <div className="w-full mt-4 bg-white/80 border border-slate-100 rounded-2xl p-3 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar animate-in fade-in duration-300">
          {selectedAreas.map((area) => (
            <button
              key={area}
              type="button"
              onClick={() => onToggleArea(area)}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-[9px] font-black text-[#CF1B2B] rounded-full border border-red-100 hover:bg-red-100 transition-colors uppercase leading-none"
            >
              <span>{area}</span>
              <span className="text-xs font-light">&times;</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
