
import React, { useState } from 'react';

interface TrainingLoadFormProps {
  onSubmit: (data: any) => void;
}

type LoadStep = 'details' | 'rpe' | 'soreness' | 'illness';

const TrainingLoadForm: React.FC<TrainingLoadFormProps> = ({ onSubmit }) => {
  const [step, setStep] = useState<LoadStep>('details');
  const [formData, setFormData] = useState({
    type: 'FIELD' as 'FIELD' | 'GYM' | 'MATCH',
    duration: 90,
    rpe: 5,
    sorenessAreas: [] as string[],
    illnessSymptoms: [] as string[]
  });

  const handleNext = () => {
    if (step === 'details') setStep('rpe');
    else if (step === 'rpe') setStep('soreness');
    else if (step === 'soreness') setStep('illness');
    else onSubmit(formData);
  };

  const handleBack = () => {
    if (step === 'rpe') setStep('details');
    else if (step === 'soreness') setStep('rpe');
    else if (step === 'illness') setStep('soreness');
  };

  const rpeOptions = [
    { val: 1, label: 'Muy Suave', emoji: '😌', color: 'bg-emerald-500' },
    { val: 2, label: 'Suave', emoji: '😊', color: 'bg-emerald-400' },
    { val: 3, label: 'Moderado', emoji: '🙂', color: 'bg-emerald-300' },
    { val: 4, label: 'Algo Duro', emoji: '😐', color: 'bg-yellow-400' },
    { val: 5, label: 'Duro', emoji: '🤨', color: 'bg-amber-500' },
    { val: 6, label: 'Duro+', emoji: '😫', color: 'bg-orange-500' },
    { val: 7, label: 'Muy Duro', emoji: '🥵', color: 'bg-orange-600' },
    { val: 8, label: 'Extenuante', emoji: '🤢', color: 'bg-red-500' },
    { val: 9, label: 'Casi Máximo', emoji: '💀', color: 'bg-red-700' },
    { val: 10, label: 'Esfuerzo Máximo', emoji: '🌋', color: 'bg-slate-900' },
  ];

  const renderDetailsStep = () => (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex justify-between items-center mb-10">
        <h2 className="text-xl font-black italic uppercase tracking-tighter text-slate-900">DATOS SESIÓN ⏱️</h2>
        <button type="button" className="text-slate-400 hover:text-slate-900"><i className="fa-solid fa-xmark text-xl"></i></button>
      </div>

      <div className="space-y-8">
        <div>
          <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Tipo de Entrenamiento</label>
          <div className="grid grid-cols-3 gap-3">
            {['FIELD', 'GYM', 'MATCH'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFormData({ ...formData, type: t as any })}
                className={`py-6 rounded-[24px] border-2 transition-all flex flex-col items-center gap-2 ${
                  formData.type === t ? 'bg-[#0b1220] text-white border-[#0b1220] shadow-xl' : 'bg-white text-slate-400 border-slate-50'
                }`}
              >
                <i className={`fa-solid ${t === 'FIELD' ? 'fa-futbol' : t === 'GYM' ? 'fa-dumbbell' : 'fa-trophy'} text-xl`}></i>
                <span className="text-[9px] font-black uppercase tracking-widest">{t === 'FIELD' ? 'CAMPO' : t === 'GYM' ? 'GYM' : 'MATCH'}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Duración (Minutos)</label>
          <input 
            type="number"
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
            className="w-full bg-slate-50 border-none rounded-[24px] px-8 py-5 text-lg font-black text-slate-900 outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
      </div>

      <button 
        type="button" 
        onClick={handleNext}
        className="w-full mt-10 py-6 bg-[#0b1220] text-white rounded-[24px] text-xs font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2"
      >
        CONTINUAR AL RPE ➡️
      </button>
    </div>
  );

  const renderRPEStep = () => (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex justify-between items-center mb-10">
        <h2 className="text-xl font-black italic uppercase tracking-tighter text-slate-900">ESFUERZO (RPE) 🔋</h2>
        <button type="button" onClick={handleBack} className="text-slate-400 hover:text-slate-900"><i className="fa-solid fa-arrow-left"></i></button>
      </div>

      <p className="text-slate-600 font-bold mb-8 text-lg text-center italic">¿Cómo calificarías la intensidad de hoy?</p>

      <div className="grid grid-cols-2 gap-3 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar p-1">
        {rpeOptions.map((opt) => (
          <button
            key={opt.val}
            type="button"
            onClick={() => setFormData({ ...formData, rpe: opt.val })}
            className={`flex flex-col items-center justify-center p-5 rounded-[28px] border-2 transition-all relative overflow-hidden group ${
              formData.rpe === opt.val ? 'border-[#0b1220] bg-slate-50 shadow-md scale-[1.02]' : 'border-slate-50 bg-white hover:border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-2 px-1">
              <span className="text-2xl">{opt.emoji}</span>
              <span className={`text-lg font-black ${formData.rpe === opt.val ? 'text-[#0b1220]' : 'text-slate-300'}`}>{opt.val}</span>
            </div>
            <div className={`h-1.5 w-full rounded-full ${opt.color} mb-2`}></div>
            <span className="text-[10px] font-black text-slate-900 uppercase italic tracking-tighter leading-none">{opt.label}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-4 mt-8">
        <button type="button" onClick={handleBack} className="flex-1 py-6 bg-slate-50 text-slate-400 rounded-[24px] text-xs font-black uppercase tracking-widest">ATRÁS</button>
        <button type="button" onClick={handleNext} className="flex-[2] py-6 bg-[#0b1220] text-white rounded-[24px] text-xs font-black uppercase tracking-widest shadow-xl">CONTINUAR ➡️</button>
      </div>
    </div>
  );

  const renderSorenessStep = () => {
    const areas = [
      "CABEZA", "CUELLO ANT.", "HOMBRO IZQ.", "HOMBRO DER.",
      "PECTORAL IZQ.", "PECTORAL DER.", "BÍCEPS IZQ.", "BÍCEPS DER.",
      "ANTEBRAZO IZQ.", "ANTEBRAZO DER.", "ABDOMEN", "OBLICUOS",
      "FLEXOR CADERA I.", "FLEXOR CADERA D.", "CUÁDRICEPS I.", "CUÁDRICEPS D.",
      "GEMELOS I.", "GEMELOS D.", "ISQUIOS I.", "ISQUIOS D."
    ];

    const toggleArea = (area: string) => {
      setFormData(prev => ({
        ...prev,
        sorenessAreas: prev.sorenessAreas.includes(area)
          ? prev.sorenessAreas.filter(a => a !== area)
          : [...prev.sorenessAreas, area]
      }));
    };

    return (
      <div className="animate-in fade-in slide-in-from-right-4 duration-300">
        <h2 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 text-center mb-10">
          ¿MOLESTIAS FÍSICAS? 🩹
        </h2>

        <div className="max-h-[420px] overflow-y-auto pr-2 custom-scrollbar grid grid-cols-2 gap-3 mb-10">
          {areas.map((area) => (
            <button
              key={area}
              type="button"
              onClick={() => toggleArea(area)}
              className={`py-5 px-4 rounded-[20px] border text-[10px] font-black uppercase tracking-tight transition-all text-center leading-none ${
                formData.sorenessAreas.includes(area)
                ? 'bg-[#0b1220] text-white border-[#0b1220] shadow-lg scale-[1.02]'
                : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300'
              }`}
            >
              {area}
            </button>
          ))}
        </div>

        <div className="flex gap-4">
          <button type="button" onClick={handleBack} className="flex-1 py-6 bg-slate-50 text-slate-400 rounded-[24px] text-xs font-black uppercase tracking-widest">ATRÁS</button>
          <button type="button" onClick={handleNext} className="flex-[2] py-6 bg-[#0b1220] text-white rounded-[24px] text-xs font-black uppercase tracking-widest shadow-xl">CONTINUAR ➡️</button>
        </div>
      </div>
    );
  };

  const renderIllnessStep = () => {
    const symptoms = [
      { id: 'tos', label: 'TOS', emoji: '😷' },
      { id: 'fiebre', label: 'FIEBRE', emoji: '🤒' },
      { id: 'vomitos', label: 'VÓMITOS', emoji: '🤢' },
      { id: 'garganta', label: 'DOLOR GARGANTA', emoji: '🧣' },
      { id: 'congestion', label: 'CONGESTIÓN', emoji: '🤧' },
      { id: 'otros', label: 'OTROS', emoji: '❓' }
    ];

    const toggleIllness = (symptom: string) => {
      setFormData(prev => ({
        ...prev,
        illnessSymptoms: prev.illnessSymptoms.includes(symptom)
          ? prev.illnessSymptoms.filter(s => s !== symptom)
          : [...prev.illnessSymptoms, symptom]
      }));
    };

    return (
      <div className="animate-in fade-in slide-in-from-right-4 duration-300">
        <h2 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 text-center mb-10">
          ¿SÍNTOMAS DE SALUD? 🤒
        </h2>

        <div className="grid grid-cols-2 gap-4 mb-10">
          {symptoms.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => toggleIllness(s.label)}
              className={`py-6 px-4 rounded-[32px] border-2 transition-all flex flex-col items-center gap-2 ${
                formData.illnessSymptoms.includes(s.label)
                ? 'bg-[#0b1220] text-white border-[#0b1220] shadow-xl'
                : 'bg-white text-slate-400 border-slate-50 hover:border-slate-200'
              }`}
            >
              <span className="text-2xl">{s.emoji}</span>
              <span className="text-[10px] font-black uppercase tracking-widest">{s.label}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-4">
          <button type="button" onClick={handleBack} className="flex-1 py-6 bg-slate-50 text-slate-400 rounded-[24px] text-xs font-black uppercase tracking-widest">ATRÁS</button>
          <button type="button" onClick={handleNext} className="flex-[2] py-6 bg-[#CF1B2B] text-white rounded-[24px] text-xs font-black uppercase tracking-widest shadow-xl">FINALIZAR REPORTE ✅</button>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white p-10 rounded-[48px] shadow-2xl border border-slate-100 w-full max-w-md mx-auto min-h-[650px] flex flex-col justify-center">
      {step === 'details' && renderDetailsStep()}
      {step === 'rpe' && renderRPEStep()}
      {step === 'soreness' && renderSorenessStep()}
      {step === 'illness' && renderIllnessStep()}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default TrainingLoadForm;
