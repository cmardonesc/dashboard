
import React, { useState } from 'react';
import { Category } from '../types';
import { BODY_PARTS } from '../constants';

interface MatchReportFormProps {
  onSubmit: (data: any) => void;
}

type MatchStep = 'context' | 'load' | 'soreness' | 'illness';

const MatchReportForm: React.FC<MatchReportFormProps> = ({ onSubmit }) => {
  const [step, setStep] = useState<MatchStep>('context');
  const [view, setView] = useState<'ANTERIOR' | 'POSTERIOR'>('ANTERIOR');
  const [formData, setFormData] = useState({
    rival: '',
    category: 'Sub-20' as Category,
    result: 'GANÓ' as 'GANÓ' | 'EMPATÓ' | 'PERDIÓ',
    minutes: 90,
    rpe: 7,
    sorenessAreas: [] as string[],
    illnessSymptoms: [] as string[]
  });

  const handleNext = () => {
    if (step === 'context') setStep('load');
    else if (step === 'load') setStep('soreness');
    else if (step === 'soreness') setStep('illness');
    else onSubmit(formData);
  };

  const handleBack = () => {
    if (step === 'load') setStep('context');
    else if (step === 'soreness') setStep('load');
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

  const renderContextStep = () => (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex justify-between items-center mb-10">
        <h2 className="text-xl font-black italic uppercase tracking-tighter text-slate-900">DATOS PARTIDO 🏟️</h2>
        <button type="button" className="text-slate-400 hover:text-slate-900"><i className="fa-solid fa-xmark text-xl"></i></button>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">🛡️ RIVAL</label>
          <input 
            type="text"
            placeholder="Ej: Argentina, Colo Colo..."
            value={formData.rival}
            onChange={(e) => setFormData({ ...formData, rival: e.target.value })}
            className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-black text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">📋 CATEGORÍA</label>
          <select 
            className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-black text-slate-900 appearance-none outline-none focus:ring-2 focus:ring-emerald-500"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value as Category })}
          >
            {Object.values(Category).map(cat => <option key={cat} value={cat}>{cat.toUpperCase()}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">🏁 RESULTADO</label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'GANÓ', emoji: '🏆', label: 'GANÓ', color: 'text-emerald-500', bg: 'bg-emerald-50' },
              { id: 'EMPATÓ', emoji: '🤝', label: 'EMPATE', color: 'text-amber-500', bg: 'bg-amber-50' },
              { id: 'PERDIÓ', emoji: '❌', label: 'PERDIÓ', color: 'text-red-500', bg: 'bg-red-50' },
            ].map((res) => (
              <button
                key={res.id}
                type="button"
                onClick={() => setFormData({ ...formData, result: res.id as any })}
                className={`py-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-2 ${
                  formData.result === res.id ? 'bg-[#0b1220] border-[#0b1220] text-white' : `bg-white border-slate-50 ${res.color}`
                }`}
              >
                <span className="text-2xl">{res.emoji}</span>
                <span className="text-[9px] font-black uppercase tracking-widest">{res.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <button 
        type="button" 
        onClick={handleNext}
        className="w-full mt-10 py-6 bg-[#0b1220] text-white rounded-[28px] text-xs font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2"
      >
        CONTINUAR RENDIMIENTO ➡️
      </button>
    </div>
  );

  const renderLoadStep = () => (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex justify-between items-center mb-10">
        <h2 className="text-xl font-black italic uppercase tracking-tighter text-slate-900">RENDIMIENTO 🏃‍♂️</h2>
        <button type="button" onClick={handleBack} className="text-slate-400 hover:text-slate-900"><i className="fa-solid fa-arrow-left"></i></button>
      </div>

      <div className="space-y-8">
        <div>
          <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">⏱️ MINUTOS JUGADOS</label>
          <input 
            type="number"
            value={formData.minutes}
            onChange={(e) => setFormData({ ...formData, minutes: parseInt(e.target.value) || 0 })}
            className="w-full bg-slate-50 border-none rounded-2xl px-8 py-5 text-xl font-black text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">📈 PERCEPCIÓN DEL ESFUERZO (RPE)</label>
          <div className="grid grid-cols-2 gap-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
            {rpeOptions.map((opt) => (
              <button
                key={opt.val}
                type="button"
                onClick={() => setFormData({ ...formData, rpe: opt.val })}
                className={`flex flex-col items-center justify-center p-5 rounded-[28px] border-2 transition-all relative overflow-hidden group ${
                  formData.rpe === opt.val ? 'border-[#0b1220] bg-slate-50 shadow-md' : 'border-slate-50 bg-white hover:border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2 px-1">
                  <span className="text-2xl">{opt.emoji}</span>
                  <span className={`text-lg font-black ${formData.rpe === opt.val ? 'text-[#0b1220]' : 'text-slate-300'}`}>{opt.val}</span>
                </div>
                <div className={`h-1 w-full rounded-full ${opt.color} mb-2 opacity-50`}></div>
                <span className="text-[9px] font-black text-slate-900 uppercase italic tracking-tighter leading-none">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-4 mt-8">
        <button type="button" onClick={handleBack} className="flex-1 py-6 bg-slate-50 text-slate-400 rounded-3xl text-xs font-black uppercase tracking-widest">ATRÁS</button>
        <button type="button" onClick={handleNext} className="flex-[2] py-6 bg-[#0b1220] text-white rounded-3xl text-xs font-black uppercase tracking-widest shadow-xl">CONTINUAR ➡️</button>
      </div>
    </div>
  );

  const renderSorenessStep = () => {
    const currentAreas = BODY_PARTS[view];

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
                      onClick={() => toggleArea(area.label)}
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
          <button type="button" onClick={handleBack} className="flex-1 py-6 bg-slate-50 text-slate-400 rounded-3xl text-xs font-black uppercase tracking-widest">ATRÁS</button>
          <button type="button" onClick={handleNext} className="flex-[2] py-6 bg-[#0b1220] text-white rounded-3xl text-xs font-black uppercase tracking-widest shadow-xl">CONTINUAR ➡️</button>
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
          ¿SÍNTOMAS MÉDICOS? 🤒
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
          <button type="button" onClick={handleBack} className="flex-1 py-6 bg-slate-50 text-slate-400 rounded-3xl text-xs font-black uppercase tracking-widest">ATRÁS</button>
          <button type="button" onClick={handleNext} className="flex-[2] py-6 bg-emerald-600 text-white rounded-3xl text-xs font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2">
            FINALIZAR REPORTE 🏆
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white p-10 rounded-[48px] shadow-2xl border border-slate-100 w-full max-w-md mx-auto min-h-[650px] flex flex-col justify-center">
      {step === 'context' && renderContextStep()}
      {step === 'load' && renderLoadStep()}
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

export default MatchReportForm;
