
import React from 'react';

export type PlayerMenuId = 'inicio' | 'reportes_wellness' | 'reportes_load' | 'reportes_match' | 'nutricion_antropometria' | 'nutricion_recomendaciones' | 'nutricion_formularios' | 'nutricion_chef' | 'gym_trainer' | 'perfil';

interface PlayerSidebarProps {
  activeMenu: PlayerMenuId;
  onMenuChange: (id: PlayerMenuId) => void;
  isCollapsed: boolean;
  setIsCollapsed: (val: boolean) => void;
}

const PlayerSidebar: React.FC<PlayerSidebarProps> = ({ activeMenu, onMenuChange, isCollapsed, setIsCollapsed }) => {
  
  const [reportesOpen, setReportesOpen] = React.useState(activeMenu.startsWith('reportes_'));
  const [nutricionOpen, setNutricionOpen] = React.useState(activeMenu.startsWith('nutricion_'));

  const handleMenuClick = (id: PlayerMenuId) => {
    onMenuChange(id);
    if (!id.startsWith('reportes_')) setReportesOpen(false);
    if (!id.startsWith('nutricion_')) setNutricionOpen(false);
  };

  return (
    <aside className={`${isCollapsed ? 'w-20' : 'w-72'} h-screen bg-[#0b1220] flex flex-col sticky top-0 shrink-0 border-r border-white/5 shadow-2xl transition-all duration-300 z-50`}>
      <div className="p-6 flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-900/20">
              <span className="text-white font-black text-sm tracking-tighter">LR</span>
            </div>
            <h1 className="text-white font-black text-sm uppercase tracking-tighter">Espacio Atleta</h1>
          </div>
        )}
        <button onClick={() => setIsCollapsed(!isCollapsed)} className="text-slate-500 hover:text-white transition-colors mx-auto">
          <i className={`fa-solid fa-${isCollapsed ? 'indent' : 'outdent'}`}></i>
        </button>
      </div>

      <nav className="flex-1 px-3 space-y-2 mt-4 overflow-y-auto custom-scrollbar">
        <button
          onClick={() => handleMenuClick('inicio')}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-4 px-6'} py-4 rounded-2xl transition-all ${
            activeMenu === 'inicio' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          <i className="fa-solid fa-house text-lg"></i>
          {!isCollapsed && <span className="font-bold text-sm">Inicio</span>}
        </button>

        <button
          onClick={() => handleMenuClick('perfil')}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-4 px-6'} py-4 rounded-2xl transition-all ${
            activeMenu === 'perfil' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          <i className="fa-solid fa-user-gear text-lg"></i>
          {!isCollapsed && <span className="font-bold text-sm">Mi Perfil</span>}
        </button>

        {/* REPORTES */}
        <div>
          <button
            onClick={() => { setReportesOpen(!reportesOpen); if (isCollapsed) setIsCollapsed(false); }}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-between px-6'} py-4 rounded-2xl transition-all ${
              reportesOpen ? 'text-white bg-white/5' : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-4">
              <i className="fa-solid fa-clipboard-list text-lg"></i>
              {!isCollapsed && <span className="font-bold text-sm">Reportes</span>}
            </div>
            {!isCollapsed && <i className={`fa-solid fa-chevron-down text-[10px] transition-transform ${reportesOpen ? 'rotate-180' : ''}`}></i>}
          </button>
          {reportesOpen && !isCollapsed && (
            <div className="mt-2 ml-4 space-y-1 border-l border-white/10 pl-4 animate-in slide-in-from-top-2 duration-200">
              <SubmenuButton active={activeMenu === 'reportes_wellness'} label="Check-in Mañana" onClick={() => onMenuChange('reportes_wellness')} />
              <SubmenuButton active={activeMenu === 'reportes_load'} label="Check-out Tarde" onClick={() => onMenuChange('reportes_load')} />
              <SubmenuButton active={activeMenu === 'reportes_match'} label="Reporte Partido" onClick={() => onMenuChange('reportes_match')} />
            </div>
          )}
        </div>

        {/* NUTRICIÓN */}
        <div>
          <button
            onClick={() => { setNutricionOpen(!nutricionOpen); if (isCollapsed) setIsCollapsed(false); }}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-between px-6'} py-4 rounded-2xl transition-all ${
              nutricionOpen ? 'text-white bg-white/5' : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-4">
              <i className="fa-solid fa-utensils text-lg"></i>
              {!isCollapsed && <span className="font-bold text-sm">Nutrición</span>}
            </div>
            {!isCollapsed && <i className={`fa-solid fa-chevron-down text-[10px] transition-transform ${nutricionOpen ? 'rotate-180' : ''}`}></i>}
          </button>
          {nutricionOpen && !isCollapsed && (
            <div className="mt-2 ml-4 space-y-1 border-l border-white/10 pl-4 animate-in slide-in-from-top-2 duration-200">
              <SubmenuButton active={activeMenu === 'nutricion_antropometria'} label="Antropometría" onClick={() => onMenuChange('nutricion_antropometria')} />
              <SubmenuButton active={activeMenu === 'nutricion_recomendaciones'} label="Recomendaciones" onClick={() => onMenuChange('nutricion_recomendaciones')} />
              <SubmenuButton active={activeMenu === 'nutricion_formularios'} label="Formularios" onClick={() => onMenuChange('nutricion_formularios')} />
              <SubmenuButton active={activeMenu === 'nutricion_chef'} label="Chef Assistant" onClick={() => onMenuChange('nutricion_chef')} />
            </div>
          )}
        </div>

        {/* GYM */}
        <button
          onClick={() => handleMenuClick('gym_trainer')}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-4 px-6'} py-4 rounded-2xl transition-all ${
            activeMenu === 'gym_trainer' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          <i className="fa-solid fa-dumbbell text-lg"></i>
          {!isCollapsed && <span className="font-bold text-sm">Gym</span>}
        </button>
      </nav>

      <div className="p-6 border-t border-white/5">
        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">ANFP v2026.1</p>
      </div>
    </aside>
  );
};

function SubmenuButton({ active, label, onClick }: { active: boolean, label: string, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl transition-all ${
        active ? 'text-red-500 bg-red-900/10' : 'text-slate-500 hover:text-slate-300'
      }`}
    >
      <div className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-red-500' : 'bg-slate-700'}`}></div>
      <span className="text-[11px] font-bold text-left">{label}</span>
    </button>
  );
}

export default PlayerSidebar;
