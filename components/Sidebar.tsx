
import React, { useState } from 'react';

type MenuId = 'inicio' | 'planificacion_anual' | 'tecnica' | 'fisica_wellness' | 'fisica_pse' | 'fisica_carga_externa_total' | 'fisica_carga_externa_tareas' | 'fisica_reporte' | 'fisica_vo2max' | 'medica' | 'nutricion_resumen_grupal' | 'nutricion_comparativo' | 'nutricion_individual' | 'nutricion_top10' | 'nutricion_maduracion' | 'competencia' | 'citaciones' | 'desconvocatoria' | 'logistica_jugadores' | 'usuarios' | 'logs' | 'importar_datos' | 'sports_science';

interface SidebarProps {
  activeMenu: MenuId;
  onMenuChange: (id: MenuId) => void;
  userRole?: string | null;
  userEmail?: string | null;
  userClub?: string | null;
}

const Sidebar: React.FC<SidebarProps> = ({ activeMenu, onMenuChange, userRole, userEmail, userClub }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [logisticsOpen, setLogisticsOpen] = useState(activeMenu === 'citaciones' || activeMenu === 'desconvocatoria' || activeMenu === 'logistica_jugadores');
  
  // Estado para Área Física y sus submenús
  const isFisicaActive = activeMenu.startsWith('fisica_');
  const [fisicaOpen, setFisicaOpen] = useState(isFisicaActive);

  // Estado para Nutrición y sus submenús
  const isNutricionActive = activeMenu.startsWith('nutricion_');
  const [nutricionOpen, setNutricionOpen] = useState(isNutricionActive);
  
  const [cargaInternaOpen, setCargaInternaOpen] = useState(activeMenu === 'fisica_wellness' || activeMenu === 'fisica_pse');
  const [cargaExternaOpen, setCargaExternaOpen] = useState(activeMenu === 'fisica_carga_externa_total' || activeMenu === 'fisica_carga_externa_tareas');

  const menuItems = [
    { id: 'inicio', label: 'Inicio', icon: 'fa-solid fa-house' },
    { id: 'planificacion_anual', label: 'Planificación Anual', icon: 'fa-solid fa-calendar-check' },
    { id: 'tecnica', label: 'Área Técnica', icon: 'fa-solid fa-bullseye' },
  ];

  const handleMenuClick = (id: MenuId) => {
    onMenuChange(id);
    if (id !== 'citaciones' && id !== 'desconvocatoria' && id !== 'logistica_jugadores') {
      setLogisticsOpen(false);
    }
    if (!id.startsWith('fisica_')) {
      setFisicaOpen(false);
    }
    if (!id.startsWith('nutricion_')) {
      setNutricionOpen(false);
    }
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
    // Si colapsamos, cerramos los submenús para limpieza visual
    if (!isCollapsed) {
      setFisicaOpen(false);
      setNutricionOpen(false);
      setLogisticsOpen(false);
    }
  };

  const handleSubmenuClick = (setter: React.Dispatch<React.SetStateAction<boolean>>, value: boolean) => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setter(true);
    } else {
      setter(value);
    }
  };

  return (
    <aside 
      className={`${isCollapsed ? 'w-24' : 'w-80'} h-screen bg-[#0b1220] flex flex-col sticky top-0 shrink-0 border-r border-white/5 shadow-2xl overflow-y-auto transition-all duration-300 ease-in-out z-50`}
    >
      <div className={`p-6 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} gap-4 relative`}>
        <div 
          className={`flex items-center gap-4 ${isCollapsed ? 'justify-center w-full' : ''} cursor-pointer hover:opacity-80 transition-opacity`}
          onClick={() => onMenuChange('inicio')}
        >
          <div className="w-10 h-10 bg-[#CF1B2B] rounded-xl flex items-center justify-center shadow-lg shadow-red-900/20 shrink-0">
            <span className="text-white font-black text-xl tracking-tighter">LR</span>
          </div>
          {!isCollapsed && (
            <div className="flex flex-col overflow-hidden whitespace-nowrap">
              {userRole === 'club' ? (
                <>
                  <h1 className="text-white font-black text-lg tracking-tighter leading-none uppercase">{userClub || 'CLUB'}</h1>
                  <span className="text-red-500 text-[10px] font-black uppercase tracking-widest mt-1">Perfil de Club</span>
                </>
              ) : (
                <>
                  <h1 className="text-white font-black text-lg tracking-tighter leading-none uppercase">LA ROJA Performance</h1>
                  <span className="text-slate-500 text-xs italic font-medium">Performance Hub</span>
                </>
              )}
            </div>
          )}
        </div>
        
        <button 
          onClick={toggleCollapse}
          className={`w-6 h-6 rounded-full bg-slate-800 text-slate-400 hover:text-white items-center justify-center transition-all absolute hidden lg:flex ${isCollapsed ? '-right-3 top-10 shadow-md border border-slate-700' : 'right-4'}`}
        >
          <i className={`fa-solid fa-chevron-${isCollapsed ? 'right' : 'left'} text-[10px]`}></i>
        </button>
      </div>

      <nav className="flex-1 px-3 space-y-2 mt-4">
        {menuItems.filter(item => {
          if (userRole === 'club') {
            return item.id === 'inicio'; // Only allow 'inicio' for club role in this section
          }
          return true;
        }).map((item) => {
          const isActive = activeMenu === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleMenuClick(item.id as MenuId)}
              title={isCollapsed ? item.label : ''}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'gap-4 px-6'} py-4 rounded-2xl transition-all duration-200 group ${
                isActive 
                  ? 'bg-red-900/20 text-[#CF1B2B]' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <i className={`${item.icon} text-xl ${isCollapsed ? '' : 'w-6'} ${isActive ? 'text-[#CF1B2B]' : 'text-slate-500 group-hover:text-white'}`}></i>
              {!isCollapsed && <span className="font-bold text-sm tracking-tight">{item.label}</span>}
            </button>
          );
        })}

        {/* ÁREA FÍSICA COLLAPSIBLE */}
        <div className="pt-2">
          <button
            onClick={() => handleSubmenuClick(setFisicaOpen, !fisicaOpen)}
            title={isCollapsed ? 'Área Física' : ''}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between gap-4 px-6'} py-4 rounded-2xl transition-all duration-200 ${
              fisicaOpen ? 'text-white bg-white/5' : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-4'}`}>
              <i className={`fa-solid fa-wave-square text-xl ${isCollapsed ? '' : 'w-6'} ${fisicaOpen ? 'text-blue-500' : 'text-slate-500'}`}></i>
              {!isCollapsed && <span className="font-bold text-sm tracking-tight">Área Física</span>}
            </div>
            {!isCollapsed && <i className={`fa-solid fa-chevron-down text-[10px] transition-transform ${fisicaOpen ? 'rotate-180' : ''}`}></i>}
          </button>
          
          {fisicaOpen && !isCollapsed && (
            <div className="mt-2 ml-4 space-y-1 animate-in slide-in-from-top-2 duration-300 border-l border-white/10 pl-4">
              
              {/* SUB-GRUPO: CARGA INTERNA */}
              <div>
                <button
                  onClick={() => setCargaInternaOpen(!cargaInternaOpen)}
                  className={`w-full flex items-center justify-between gap-4 px-4 py-3 rounded-xl transition-all ${
                    cargaInternaOpen ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <span className="text-xs font-bold tracking-tight">Carga interna</span>
                  <i className={`fa-solid fa-chevron-down text-[9px] transition-transform ${cargaInternaOpen ? 'rotate-180' : ''}`}></i>
                </button>
                
                {cargaInternaOpen && (
                  <div className="ml-4 mt-1 space-y-1 border-l border-white/5 pl-4">
                    <button
                      onClick={() => onMenuChange('fisica_wellness')}
                      className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                        activeMenu === 'fisica_wellness' ? 'text-blue-400 bg-blue-900/20' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${activeMenu === 'fisica_wellness' ? 'bg-blue-400' : 'bg-slate-700'}`}></div>
                      <span className="text-[10px] font-bold">Wellness</span>
                    </button>
                    <button
                      onClick={() => onMenuChange('fisica_pse')}
                      className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                        activeMenu === 'fisica_pse' ? 'text-blue-400 bg-blue-900/20' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${activeMenu === 'fisica_pse' ? 'bg-blue-400' : 'bg-slate-700'}`}></div>
                      <span className="text-[10px] font-bold">PSE</span>
                    </button>
                  </div>
                )}
              </div>

              {/* SUB-GRUPO: CARGA EXTERNA */}
              <div className="mt-2">
                <button
                  onClick={() => setCargaExternaOpen(!cargaExternaOpen)}
                  className={`w-full flex items-center justify-between gap-4 px-4 py-3 rounded-xl transition-all ${
                    cargaExternaOpen ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <span className="text-xs font-bold tracking-tight">Carga externa</span>
                  <i className={`fa-solid fa-chevron-down text-[9px] transition-transform ${cargaExternaOpen ? 'rotate-180' : ''}`}></i>
                </button>
                
                {cargaExternaOpen && (
                  <div className="ml-4 mt-1 space-y-1 border-l border-white/5 pl-4">
                    <button
                      onClick={() => onMenuChange('fisica_carga_externa_total')}
                      className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                        activeMenu === 'fisica_carga_externa_total' ? 'text-blue-400 bg-blue-900/20' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${activeMenu === 'fisica_carga_externa_total' ? 'bg-blue-400' : 'bg-slate-700'}`}></div>
                      <span className="text-[10px] font-bold">Totales</span>
                    </button>
                    <button
                      onClick={() => onMenuChange('fisica_carga_externa_tareas')}
                      className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                        activeMenu === 'fisica_carga_externa_tareas' ? 'text-blue-400 bg-blue-900/20' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${activeMenu === 'fisica_carga_externa_tareas' ? 'bg-blue-400' : 'bg-slate-700'}`}></div>
                      <span className="text-[10px] font-bold">Por Tarea</span>
                    </button>
                  </div>
                )}
              </div>

              {userRole !== 'club' && (
                <>
                  {/* REPORTE DE SESIÓN */}
                  <button
                    onClick={() => onMenuChange('fisica_reporte')}
                    className={`w-full flex items-center gap-4 px-4 py-3 mt-2 rounded-xl transition-all ${
                      activeMenu === 'fisica_reporte' 
                        ? 'bg-blue-600 text-white shadow-lg' 
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${activeMenu === 'fisica_reporte' ? 'bg-white' : 'bg-slate-700'}`}></div>
                    <span className="text-xs font-bold tracking-tight">Reporte Sesión</span>
                  </button>

                  {/* CONSUMO DE OXÍGENO */}
                  <button
                    onClick={() => onMenuChange('fisica_vo2max')}
                    className={`w-full flex items-center gap-4 px-4 py-3 mt-2 rounded-xl transition-all ${
                      activeMenu === 'fisica_vo2max' 
                        ? 'bg-red-600 text-white shadow-lg' 
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${activeMenu === 'fisica_vo2max' ? 'bg-white' : 'bg-slate-700'}`}></div>
                    <span className="text-xs font-bold tracking-tight">Consumo Oxígeno</span>
                  </button>
                </>
              )}

            </div>
          )}
        </div>

        {userRole !== 'club' && (
          <button
            onClick={() => handleMenuClick('medica')}
            title={isCollapsed ? 'Área Médica' : ''}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'gap-4 px-6'} py-4 rounded-2xl transition-all duration-200 group ${
              activeMenu === 'medica' ? 'bg-red-900/20 text-[#CF1B2B]' : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <i className={`fa-solid fa-stethoscope text-xl ${isCollapsed ? '' : 'w-6'} ${activeMenu === 'medica' ? 'text-[#CF1B2B]' : 'text-slate-500 group-hover:text-white'}`}></i>
            {!isCollapsed && <span className="font-bold text-sm tracking-tight">Área Médica</span>}
          </button>
        )}

        {/* NUTRICIÓN COLLAPSIBLE */}
        <div className="pt-2">
          <button
            onClick={() => handleSubmenuClick(setNutricionOpen, !nutricionOpen)}
            title={isCollapsed ? 'Nutrición' : ''}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between gap-4 px-6'} py-4 rounded-2xl transition-all duration-200 ${
              nutricionOpen ? 'text-white bg-white/5' : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-4'}`}>
              <i className={`fa-solid fa-utensils text-xl ${isCollapsed ? '' : 'w-6'} ${nutricionOpen ? 'text-red-500' : 'text-slate-500'}`}></i>
              {!isCollapsed && <span className="font-bold text-sm tracking-tight">Nutrición</span>}
            </div>
            {!isCollapsed && <i className={`fa-solid fa-chevron-down text-[10px] transition-transform ${nutricionOpen ? 'rotate-180' : ''}`}></i>}
          </button>
          
          {nutricionOpen && !isCollapsed && (
            <div className="mt-2 ml-4 space-y-1 animate-in slide-in-from-top-2 duration-300 border-l border-white/10 pl-4">
              <button
                onClick={() => onMenuChange('nutricion_resumen_grupal')}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                  activeMenu === 'nutricion_resumen_grupal' ? 'text-red-400 bg-red-900/20' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${activeMenu === 'nutricion_resumen_grupal' ? 'bg-red-400' : 'bg-slate-700'}`}></div>
                <span className="text-[10px] font-bold">Resumen Grupal</span>
              </button>
              {userRole !== 'club' && (
                <button
                  onClick={() => onMenuChange('nutricion_comparativo')}
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                    activeMenu === 'nutricion_comparativo' ? 'text-red-400 bg-red-900/20' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${activeMenu === 'nutricion_comparativo' ? 'bg-red-400' : 'bg-slate-700'}`}></div>
                  <span className="text-[10px] font-bold">Dashboard Comparativo</span>
                </button>
              )}
              <button
                onClick={() => onMenuChange('nutricion_individual')}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                  activeMenu === 'nutricion_individual' ? 'text-red-400 bg-red-900/20' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${activeMenu === 'nutricion_individual' ? 'bg-red-400' : 'bg-slate-700'}`}></div>
                <span className="text-[10px] font-bold">Reporte Individual</span>
              </button>
              {userRole !== 'club' && (
                <>
                  <button
                    onClick={() => onMenuChange('nutricion_top10')}
                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                      activeMenu === 'nutricion_top10' ? 'text-red-400 bg-red-900/20' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${activeMenu === 'nutricion_top10' ? 'bg-red-400' : 'bg-slate-700'}`}></div>
                    <span className="text-[10px] font-bold">Top 10 Rankings</span>
                  </button>
                  <button
                    onClick={() => onMenuChange('nutricion_maduracion')}
                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                      activeMenu === 'nutricion_maduracion' ? 'text-red-400 bg-red-900/20' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${activeMenu === 'nutricion_maduracion' ? 'bg-red-400' : 'bg-slate-700'}`}></div>
                    <span className="text-[10px] font-bold">Crecimiento & Maduración</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {userRole !== 'club' && (
          <button
            onClick={() => handleMenuClick('competencia')}
            title={isCollapsed ? 'Competencia' : ''}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'gap-4 px-6'} py-4 rounded-2xl transition-all duration-200 group ${
              activeMenu === 'competencia' ? 'bg-red-900/20 text-[#CF1B2B]' : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <i className={`fa-solid fa-trophy text-xl ${isCollapsed ? '' : 'w-6'} ${activeMenu === 'competencia' ? 'text-[#CF1B2B]' : 'text-slate-500 group-hover:text-white'}`}></i>
            {!isCollapsed && <span className="font-bold text-sm tracking-tight">Competencia</span>}
          </button>
        )}

        {userRole !== 'club' && (
          <div className="pt-2">
            <button
              onClick={() => handleSubmenuClick(setLogisticsOpen, !logisticsOpen)}
              title={isCollapsed ? 'Logística' : ''}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between gap-4 px-6'} py-4 rounded-2xl transition-all duration-200 ${
                logisticsOpen ? 'text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-4'}`}>
                <i className={`fa-solid fa-calendar-days text-xl ${isCollapsed ? '' : 'w-6'} text-slate-500`}></i>
                {!isCollapsed && <span className="font-bold text-sm tracking-tight">Logística</span>}
              </div>
              {!isCollapsed && <i className={`fa-solid fa-chevron-down text-[10px] transition-transform ${logisticsOpen ? 'rotate-180' : ''}`}></i>}
            </button>
            
            {logisticsOpen && !isCollapsed && (
              <div className="mt-2 ml-10 space-y-1 animate-in slide-in-from-top-2 duration-300">
                <button
                  onClick={() => onMenuChange('logistica_jugadores')}
                  className={`w-full flex items-center gap-4 px-6 py-3 rounded-xl transition-all ${
                    activeMenu === 'logistica_jugadores' 
                      ? 'bg-[#CF1B2B] text-white shadow-lg' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${activeMenu === 'logistica_jugadores' ? 'bg-white' : 'bg-slate-700'}`}></div>
                  <span className="text-xs font-bold tracking-tight">Gestión Jugadores</span>
                </button>
                <button
                  onClick={() => onMenuChange('citaciones')}
                  className={`w-full flex items-center gap-4 px-6 py-3 rounded-xl transition-all ${
                    activeMenu === 'citaciones' 
                      ? 'bg-[#CF1B2B] text-white shadow-lg' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${activeMenu === 'citaciones' ? 'bg-white' : 'bg-slate-700'}`}></div>
                  <span className="text-xs font-bold tracking-tight">Citas</span>
                </button>
                <button
                  onClick={() => onMenuChange('desconvocatoria')}
                  className={`w-full flex items-center gap-4 px-6 py-3 rounded-xl transition-all ${
                    activeMenu === 'desconvocatoria' 
                      ? 'bg-[#CF1B2B] text-white shadow-lg' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${activeMenu === 'desconvocatoria' ? 'bg-white' : 'bg-slate-700'}`}></div>
                  <span className="text-xs font-bold tracking-tight">Desconvocatoria</span>
                </button>
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => handleMenuClick('sports_science')}
          title={isCollapsed ? 'Sports Science' : ''}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'gap-4 px-6'} py-4 rounded-2xl transition-all duration-200 group ${
            activeMenu === 'sports_science' ? 'bg-red-900/20 text-[#CF1B2B]' : 'text-slate-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          <i className={`fa-solid fa-microscope text-xl ${isCollapsed ? '' : 'w-6'} ${activeMenu === 'sports_science' ? 'text-[#CF1B2B]' : 'text-slate-500 group-hover:text-white'}`}></i>
          {!isCollapsed && <span className="font-bold text-sm tracking-tight">Sports Science</span>}
        </button>

        {userRole === 'admin' && (
          <button
            onClick={() => handleMenuClick('importar_datos')}
            title={isCollapsed ? 'Importar Datos' : ''}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'gap-4 px-6'} py-4 rounded-2xl transition-all duration-200 group ${
              activeMenu === 'importar_datos' ? 'bg-red-900/20 text-[#CF1B2B]' : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <i className={`fa-solid fa-file-import text-xl ${isCollapsed ? '' : 'w-6'} ${activeMenu === 'importar_datos' ? 'text-[#CF1B2B]' : 'text-slate-500 group-hover:text-white'}`}></i>
            {!isCollapsed && <span className="font-bold text-sm tracking-tight">Importar Datos</span>}
          </button>
        )}

        {userRole === 'admin' && (
          <button
            onClick={() => handleMenuClick('usuarios')}
            title={isCollapsed ? 'Gestión Usuarios' : ''}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'gap-4 px-6'} py-4 rounded-2xl transition-all duration-200 group ${
              activeMenu === 'usuarios' ? 'bg-red-900/20 text-[#CF1B2B]' : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <i className={`fa-solid fa-user-gear text-xl ${isCollapsed ? '' : 'w-6'} ${activeMenu === 'usuarios' ? 'text-[#CF1B2B]' : 'text-slate-500 group-hover:text-white'}`}></i>
            {!isCollapsed && <span className="font-bold text-sm tracking-tight">Usuarios</span>}
          </button>
        )}

        {userEmail === 'mardones.camilo@gmail.com' && (
          <button
            onClick={() => handleMenuClick('logs')}
            title={isCollapsed ? 'Log de Actividad' : ''}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'gap-4 px-6'} py-4 rounded-2xl transition-all duration-200 group ${
              activeMenu === 'logs' ? 'bg-red-900/20 text-[#CF1B2B]' : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <i className={`fa-solid fa-clock-rotate-left text-xl ${isCollapsed ? '' : 'w-6'} ${activeMenu === 'logs' ? 'text-[#CF1B2B]' : 'text-slate-500 group-hover:text-white'}`}></i>
            {!isCollapsed && <span className="font-bold text-sm tracking-tight">Log de Actividad</span>}
          </button>
        )}
      </nav>

      <div className={`p-8 border-t border-white/5 ${isCollapsed ? 'hidden' : ''}`}>
        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">ANFP v2026.1</p>
      </div>
    </aside>
  );
};

export default Sidebar;
