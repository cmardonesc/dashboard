
import React, { useState } from 'react';
import { BODY_PARTS } from '../constants';

interface WellnessFormProps {
  onSubmit: (data: any) => void;
}

type WellnessStep = 'fatigue' | 'sleep' | 'stress' | 'mood' | 'soreness' | 'illness';

const WellnessForm: React.FC<WellnessFormProps> = ({ onSubmit }) => {
  const [step, setStep] = useState<WellnessStep>('fatigue');
  const [view, setView] = useState<'ANTERIOR' | 'POSTERIOR'>('ANTERIOR');
  const [formData, setFormData] = useState({
    fatigue: 3,
    sleep: 3,
    stress: 3,
    mood: 3,
    sorenessAreas: [] as string[],
    illnessSymptoms: [] as string[]
  });

  const stepsOrder: WellnessStep[] = ['fatigue', 'sleep', 'stress', 'mood', 'soreness', 'illness'];

  const handleNext = () => {
    const currentIndex = stepsOrder.indexOf(step);
    if (currentIndex < stepsOrder.length - 1) {
      setStep(stepsOrder[currentIndex + 1]);
    } else {
      onSubmit(formData);
    }
  };

  const handleBack = () => {
    const currentIndex = stepsOrder.indexOf(step);
    if (currentIndex > 0) {
      setStep(stepsOrder[currentIndex - 1]);
    }
  };

  const selectValue = (key: keyof typeof formData, value: number) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setTimeout(handleNext, 300);
  };

  const toggleSorenessArea = (area: string) => {
    setFormData(prev => ({
      ...prev,
      sorenessAreas: prev.sorenessAreas.includes(area)
        ? prev.sorenessAreas.filter(a => a !== area)
        : [...prev.sorenessAreas, area]
    }));
  };

  const toggleIllness = (symptom: string) => {
    setFormData(prev => ({
      ...prev,
      illnessSymptoms: prev.illnessSymptoms.includes(symptom)
        ? prev.illnessSymptoms.filter(s => s !== symptom)
        : [...prev.illnessSymptoms, symptom]
    }));
  };

  const renderScaleStep = (title: string, question: string, currentVal: number, key: keyof typeof formData) => {
    const options = [
      { label: 'EXCELENTE', value: 5, emoji: '⚡' },
      { label: 'BIEN', value: 4, emoji: '🔋' },
      { label: 'NORMAL', value: 3, emoji: '😐' },
      { label: 'CANSADO', value: 2, emoji: '📉' },
      { label: 'AGOTADO', value: 1, emoji: '🪫' },
    ];

    return (
      <div className="animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-xl font-black italic uppercase tracking-tighter text-slate-900">{title}</h2>
          <button type="button" className="text-slate-400 hover:text-slate-900"><i className="fa-solid fa-xmark text-xl"></i></button>
        </div>
        
        <p className="text-slate-600 font-bold mb-8 text-lg">{question}</p>

        <div className="space-y-4">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => selectValue(key, opt.value)}
              className={`w-full flex items-center justify-between p-6 rounded-[24px] border-2 transition-all ${
                currentVal === opt.value 
                ? 'bg-slate-50 border-[#0b1220] shadow-md scale-[1.02]' 
                : 'bg-white border-slate-50 hover:border-slate-200'
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl">{opt.emoji}</span>
                <span className="text-sm font-black text-slate-900 italic tracking-tighter">{opt.label}</span>
              </div>
              <span className="text-sm font-black text-red-500">{opt.value}</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderSorenessStep = () => {
    const currentAreas = BODY_PARTS[view];

    return (
      <div className="animate-in fade-in slide-in-from-right-4 duration-300">
        <h2 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 text-center mb-6">
          ¿MOLESTIAS FÍSICAS? 🩹
        </h2>

        <div className="flex bg-slate-100 p-1 rounded-2xl mb-6">
          <button 
            type="button"
            onClick={() => setView('ANTERIOR')}
            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${view === 'ANTERIOR' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
          >
            FRENTE
          </button>
          <button 
            type="button"
            onClick={() => setView('POSTERIOR')}
            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${view === 'POSTERIOR' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
          >
            ESPALDA
          </button>
        </div>

        <div className="max-h-[380px] overflow-y-auto pr-2 custom-scrollbar space-y-6 mb-10">
          {['SUPERIOR', 'TRONCO', 'INFERIOR'].map(cat => {
            const catAreas = currentAreas.filter(a => a.category === cat);
            if (catAreas.length === 0) return null;
            
            return (
              <div key={cat} className="space-y-3">
                <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{cat}</h3>
                <div className="grid grid-cols-2 gap-2">
                  {catAreas.map((area) => (
                    <button
                      key={area.id}
                      type="button"
                      onClick={() => toggleSorenessArea(area.label)}
                      className={`py-4 px-3 rounded-[16px] border text-[9px] font-black uppercase tracking-tight transition-all text-center leading-none ${
                        formData.sorenessAreas.includes(area.label)
                        ? 'bg-[#0b1220] text-white border-[#0b1220] shadow-lg'
                        : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300'
                      }`}
                    >
                      {area.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
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

    return (
      <div className="animate-in fade-in slide-in-from-right-4 duration-300">
        <h2 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 text-center mb-10">
          ¿ESTADO DE SALUD? 🤒
        </h2>
        
        <p className="text-center text-slate-500 font-bold mb-8 text-sm italic">Marca si sientes algún síntoma:</p>

        <div className="grid grid-cols-2 gap-4 mb-10">
          {symptoms.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => toggleIllness(s.label)}
              className={`py-6 px-4 rounded-[32px] border-2 transition-all flex flex-col items-center gap-2 ${
                formData.illnessSymptoms.includes(s.label)
                ? 'bg-[#0b1220] text-white border-[#0b1220] shadow-xl scale-[1.02]'
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
          <button type="button" onClick={handleNext} className="flex-[2] py-6 bg-[#CF1B2B] text-white rounded-[24px] text-xs font-black uppercase tracking-widest shadow-xl">FINALIZAR 🏆</button>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white p-10 rounded-[48px] shadow-2xl border border-slate-100 w-full max-w-md mx-auto min-h-[600px] flex flex-col justify-center">
      {step === 'fatigue' && renderScaleStep('FATIGA', '¿Cómo te sientes de energía?', formData.fatigue, 'fatigue')}
      {step === 'sleep' && renderScaleStep('SUEÑO', '¿Cómo calificarías tu descanso?', formData.sleep, 'sleep')}
      {step === 'stress' && renderScaleStep('ESTRÉS', '¿Qué tan estresado te sientes hoy?', formData.stress, 'stress')}
      {step === 'mood' && renderScaleStep('ÁNIMO', '¿Cuál es tu estado de ánimo?', formData.mood, 'mood')}
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

export default WellnessForm;
