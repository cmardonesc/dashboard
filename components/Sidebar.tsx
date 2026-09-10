
import React, { useState } from 'react';
import { subscribeToNotifications } from '../lib/notifications';
import { FEDERATION_LOGO } from '../constants';
import { getDriveDirectLink } from '../lib/utils';
import { MenuId } from '../types';

interface SidebarProps {
  activeMenu: MenuId;
  onMenuChange: (id: MenuId) => void;
  userRole?: string | null;
  userEmail?: string | null;
  userClub?: string | null;
  clubs?: any[];
  allowedMenus?: string[] | null;
}

const Sidebar: React.FC<SidebarProps> = ({ activeMenu, onMenuChange, userRole, userEmail, userClub, clubs = [], allowedMenus }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [logisticsOpen, setLogisticsOpen] = useState(activeMenu === 'citaciones' || activeMenu === 'desconvocatoria' || activeMenu === 'logistica_jugadores');
  
  const getClubLogo = (clubName: string) => {
    if (!clubName) return null;
    const normName = clubName.toLowerCase().trim();
    const club = clubs.find(c => c.nombre.toLowerCase().trim() === normName);
    if (club?.logo_url) {
      return getDriveDirectLink(club.logo_url);
    }
    return null;
  };

  const currentClubLogo = userRole === 'club' && userClub ? getClubLogo(userClub) : null;
  const displayLogo = currentClubLogo || (FEDERATION_LOGO ? getDriveDirectLink(FEDERATION_LOGO) : null);

  // Estado para Diario y sus submenús
  const DIARIO_IDS = ['fisica_wellness', 'fisica_pse', 'fisica_carga_externa_total', 'fisica_carga_externa_tareas', 'fisica_gps_intelligence'];
  const isDiarioActive = DIARIO_IDS.includes(activeMenu);
  const [diarioOpen, setDiarioOpen] = useState(isDiarioActive);

  // Estado para Área Física y sus submenús
  const FISICA_IDS = ['fisica_reporte', 'fisica_pronostico', 'fisica_gimnasio', 'fisica_resumen_grupal'];
  const isFisicaActive = FISICA_IDS.includes(activeMenu);
  const [fisicaOpen, setFisicaOpen] = useState(isFisicaActive);

  // Estado para Nutrición y sus submenús
  const isNutricionActive = activeMenu.startsWith('nutricion_');
  const [nutricionOpen, setNutricionOpen] = useState(isNutricionActive);

  // Estado para Planificación y sus submenús
  const PLANIFICACION_IDS = ['planificacion_anual', 'planificacion_semanal'];
  const isPlanificacionActive = PLANIFICACION_IDS.includes(activeMenu);
  const [planificacionOpen, setPlanificacionOpen] = useState(isPlanificacionActive);

  // Estado para Área Técnica y sus submenús
  const TECNICA_IDS = ['tecnica', 'tecnica_biblioteca', 'tecnica_convocatoria', 'tecnica_competencia'];
  const isTecnicaActive = TECNICA_IDS.includes(activeMenu);
  const [tecnicaOpen, setTecnicaOpen] = useState(isTecnicaActive);

  // Estado para Competencia y sus submenús
  const COMPETENCIA_IDS = ['competencia', 'gps_internacional'];
  const isCompetenciaActive = COMPETENCIA_IDS.includes(activeMenu);
  const [competenciaOpen, setCompetenciaOpen] = useState(isCompetenciaActive);

  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);

  const menuItems = [
    { id: 'inicio', label: 'Inicio', icon: 'fa-solid fa-house' },
    { id: 'dinamicas', label: 'Dinámicas', icon: 'fa-solid fa-person-running' },
    { id: 'perfil_jugador', label: 'Perfil Jugador', icon: 'fa-solid fa-id-card' },
  ];

  const handleMenuClick = (id: MenuId) => {
    onMenuChange(id);
    if (id !== 'citaciones' && id !== 'desconvocatoria' && id !== 'logistica_jugadores' && id !== 'contactos_clubes') {
      setLogisticsOpen(false);
    }
    if (!DIARIO_IDS.includes(id)) {
      setDiarioOpen(false);
    }
    if (!FISICA_IDS.includes(id)) {
      setFisicaOpen(false);
    }
    if (!id.startsWith('nutricion_')) {
      setNutricionOpen(false);
    }
    if (!PLANIFICACION_IDS.includes(id)) {
      setPlanificacionOpen(false);
    }
    if (!TECNICA_IDS.includes(id)) {
      setTecnicaOpen(false);
    }
    if (!COMPETENCIA_IDS.includes(id)) {
      setCompetenciaOpen(false);
    }
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
    // Si colapsamos, cerramos los submenús para limpieza visual
    if (!isCollapsed) {
      setDiarioOpen(false);
      setFisicaOpen(false);
      setNutricionOpen(false);
      setLogisticsOpen(false);
      setPlanificacionOpen(false);
      setTecnicaOpen(false);
      setCompetenciaOpen(false);
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

  const isMenuAllowed = (menuId: string) => {
    if (userRole === 'admin') return true;
    if (userRole === 'club') {
      return [
        'inicio', 
        'perfil_jugador', 
        'dinamicas', 
        'sports_science',
        'fisica_wellness', 
        'fisica_pse', 
        'fisica_carga_externa_total', 
        'fisica_carga_externa_tareas', 
        'fisica_gps_intelligence'
      ].includes(menuId);
    }
    if (userRole === 'player') {
      return ['inicio', 'perfil_jugador'].includes(menuId);
    }
    // Para staff, verificar permisos de menú personalizados si están configurados
    if (userRole === 'staff' && allowedMenus) {
      if (allowedMenus.includes('*')) return true;
      
      // Mapeos de retrocompatibilidad y herencia de permisos
      if (allowedMenus.includes(menuId)) return true;
      if (allowedMenus.includes('planning') && menuId.startsWith('planificacion_')) return true;
      if (allowedMenus.includes('diario') && (
        menuId === 'fisica_wellness' || 
        menuId === 'fisica_pse' || 
        menuId === 'fisica_carga_externa_total' || 
        menuId === 'fisica_carga_externa_tareas' || 
        menuId === 'fisica_gps_intelligence'
      )) return true;
      if (allowedMenus.includes('fisica') && (
        menuId === 'fisica_resumen_grupal' || 
        menuId === 'fisica_reporte' || 
        menuId === 'fisica_pronostico' || 
        menuId === 'fisica_gimnasio'
      )) return true;
      if (allowedMenus.includes('nutricion') && (
        menuId === 'nutricion_resumen_grupal' || 
        menuId === 'nutricion_individual' || 
        menuId === 'nutricion_top10' || 
        menuId === 'nutricion_maduracion'
      )) return true;
      if (allowedMenus.includes('tecnica') && (
        menuId === 'tecnica_biblioteca' || 
        menuId === 'tecnica_competencia'
      )) return true;
      if (allowedMenus.includes('competencia') && (menuId === 'tecnica_competencia' || menuId === 'competencia' || menuId === 'gps_internacional')) return true;
      if (allowedMenus.includes('logistica') && (
        menuId === 'logistica_jugadores' || 
        menuId === 'citaciones' || 
        menuId === 'desconvocatoria' || 
        menuId === 'contactos_clubes'
      )) return true;

      return false;
    }
    return true; // Acceso total para staff por defecto si no está restringido
  };

  const filteredMenuItems = menuItems.filter(item => {
    if (!isMenuAllowed(item.id)) return false;
    if (userRole === 'club') {
      return item.id === 'inicio' || item.id === 'perfil_jugador' || item.id === 'dinamicas';
    }
    if (userRole === 'player') {
      return item.id === 'inicio' || item.id === 'perfil_jugador';
    }
    return true;
  });

  return (
    <aside 
      className={`${isCollapsed ? 'w-24' : 'w-80'} h-screen bg-[#0b1220] flex flex-col sticky top-0 shrink-0 border-r border-white/5 shadow-2xl overflow-y-auto transition-all duration-300 ease-in-out z-50`}
    >
      <div className={`p-6 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} gap-4 relative`}>
        <div 
          className={`flex items-center gap-4 ${isCollapsed ? 'justify-center w-full' : ''} cursor-pointer hover:opacity-80 transition-opacity`}
          onClick={() => onMenuChange('inicio')}
        >
          {displayLogo && !logoError ? (
            <div className="w-10 h-10 overflow-hidden flex items-center justify-center shrink-0">
              <img 
                src={displayLogo} 
                alt="Logo" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
                onError={() => setLogoError(true)}
              />
            </div>
          ) : (
            <div className="w-10 h-10 bg-[#CF1B2B] rounded-xl flex items-center justify-center shadow-lg shadow-red-900/20 shrink-0">
              <span className="text-white font-black text-xl tracking-tighter">LR</span>
            </div>
          )}
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
        {filteredMenuItems.map((item) => {
          const isActive = activeMenu === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleMenuClick(item.id as MenuId)}
              title={isCollapsed ? item.label : ''}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between gap-4 px-6'} py-4 rounded-2xl transition-all duration-200 group ${
                isActive 
                  ? 'bg-red-900/20 text-[#CF1B2B]' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-4'}`}>
                <i className={`${item.icon} text-xl ${isCollapsed ? '' : 'w-6'} ${
                  isActive 
                    ? 'text-[#CF1B2B]' 
                    : 'text-slate-500 group-hover:text-white'
                }`}></i>
                {!isCollapsed && <span className="font-bold text-sm tracking-tight">{item.label}</span>}
              </div>
            </button>
          );
        })}

        {/* MENÚ PLANIFICACIÓN COLLAPSIBLE */}
        {userRole !== 'club' && (isMenuAllowed('planificacion_anual') || isMenuAllowed('planificacion_semanal')) && (
          <div className="pt-2">
            <button
              onClick={() => handleSubmenuClick(setPlanificacionOpen, !planificacionOpen)}
              title={isCollapsed ? 'Planificación' : ''}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between gap-4 px-6'} py-4 rounded-2xl transition-all duration-200 ${
                planificacionOpen ? 'text-white bg-white/5' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-4'}`}>
                <i className={`fa-solid fa-calendar-check text-xl ${isCollapsed ? '' : 'w-6'} ${planificacionOpen ? 'text-red-500' : 'text-slate-500'}`}></i>
                {!isCollapsed && <span className="font-bold text-sm tracking-tight">Planificación</span>}
              </div>
              {!isCollapsed && <i className={`fa-solid fa-chevron-down text-[10px] transition-transform ${planificacionOpen ? 'rotate-180' : ''}`}></i>}
            </button>
            
            {planificacionOpen && !isCollapsed && (
              <div className="mt-2 ml-4 space-y-1 animate-in slide-in-from-top-2 duration-300 border-l border-white/10 pl-4">
                {isMenuAllowed('planificacion_anual') && (
                  <button
                    onClick={() => onMenuChange('planificacion_anual')}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-2 rounded-lg transition-all ${
                      activeMenu === 'planificacion_anual' ? 'text-red-400 bg-red-900/20' : 'text-red-500/80 hover:text-red-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-1.5 h-1.5 rounded-full ${activeMenu === 'planificacion_anual' ? 'bg-red-400' : 'bg-red-500/80'}`}></div>
                      <span className="text-[10px] font-bold">Planificación Anual</span>
                    </div>
                    <span className="text-[8px] bg-red-950/60 text-red-400 px-1 py-0.5 rounded-md font-bold border border-red-500/30">En Desarrollo</span>
                  </button>
                )}
                {isMenuAllowed('planificacion_semanal') && (
                  <button
                    onClick={() => onMenuChange('planificacion_semanal')}
                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                      activeMenu === 'planificacion_semanal' ? 'text-red-400 bg-red-900/20' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${activeMenu === 'planificacion_semanal' ? 'bg-red-400' : 'bg-slate-700'}`}></div>
                    <span className="text-[10px] font-bold">Cronograma Semanal</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* MENÚ DIARIO COLLAPSIBLE */}
        {(isMenuAllowed('fisica_wellness') || isMenuAllowed('fisica_pse') || isMenuAllowed('fisica_carga_externa_total') || isMenuAllowed('fisica_carga_externa_tareas') || isMenuAllowed('fisica_gps_intelligence')) && (
          <div className="pt-2">
            <button
              onClick={() => handleSubmenuClick(setDiarioOpen, !diarioOpen)}
              title={isCollapsed ? 'Diario' : ''}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between gap-4 px-6'} py-4 rounded-2xl transition-all duration-200 ${
                diarioOpen ? 'text-white bg-white/5' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-4'}`}>
                <i className={`fa-solid fa-calendar-day text-xl ${isCollapsed ? '' : 'w-6'} ${diarioOpen ? 'text-emerald-500' : 'text-slate-500'}`}></i>
                {!isCollapsed && <span className="font-bold text-sm tracking-tight uppercase tracking-widest">Diario</span>}
              </div>
              {!isCollapsed && <i className={`fa-solid fa-chevron-down text-[10px] transition-transform ${diarioOpen ? 'rotate-180' : ''}`}></i>}
            </button>
            
            {diarioOpen && !isCollapsed && (
              <div className="mt-2 ml-4 space-y-1 animate-in slide-in-from-top-2 duration-300 border-l border-white/10 pl-4">
                {isMenuAllowed('fisica_wellness') && (
                  <button
                    onClick={() => onMenuChange('fisica_wellness')}
                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                      activeMenu === 'fisica_wellness' ? 'text-emerald-400 bg-emerald-900/20' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${activeMenu === 'fisica_wellness' ? 'bg-emerald-400' : 'bg-slate-700'}`}></div>
                    <span className="text-[10px] font-bold">Wellness</span>
                  </button>
                )}
                {isMenuAllowed('fisica_pse') && (
                  <button
                    onClick={() => onMenuChange('fisica_pse')}
                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                      activeMenu === 'fisica_pse' ? 'text-emerald-400 bg-emerald-900/20' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${activeMenu === 'fisica_pse' ? 'bg-emerald-400' : 'bg-slate-700'}`}></div>
                    <span className="text-[10px] font-bold">PSE</span>
                  </button>
                )}
                {isMenuAllowed('fisica_carga_externa_total') && (
                  <button
                    onClick={() => onMenuChange('fisica_carga_externa_total')}
                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                      activeMenu === 'fisica_carga_externa_total' ? 'text-emerald-400 bg-emerald-900/20' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${activeMenu === 'fisica_carga_externa_total' ? 'bg-emerald-400' : 'bg-slate-700'}`}></div>
                    <span className="text-[10px] font-bold">Totales de Carga Externa</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ÁREA FÍSICA COLLAPSIBLE */}
        {userRole !== 'club' && (isMenuAllowed('fisica_resumen_grupal') || isMenuAllowed('fisica_reporte') || isMenuAllowed('fisica_pronostico') || isMenuAllowed('fisica_gimnasio')) && (
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
                {/* RESUMEN GRUPAL EVALUACIONES FISICAS */}
                {isMenuAllowed('fisica_resumen_grupal') && (
                  <button
                    onClick={() => onMenuChange('fisica_resumen_grupal')}
                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                      activeMenu === 'fisica_resumen_grupal' ? 'text-red-400 bg-red-900/20' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${activeMenu === 'fisica_resumen_grupal' ? 'bg-red-400' : 'bg-slate-700'}`}>
                    </div>
                    <span className="text-[10px] font-bold">Resumen Grupal</span>
                  </button>
                )}

                {userRole !== 'club' && (
                  <>
                    {/* REPORTE DE SESIÓN */}
                    {isMenuAllowed('fisica_reporte') && (
                      <button
                        onClick={() => onMenuChange('fisica_reporte')}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
                          activeMenu === 'fisica_reporte' ? 'text-red-400 bg-red-900/20' : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${activeMenu === 'fisica_reporte' ? 'bg-red-400' : 'bg-slate-700'}`}></div>
                        <span className="text-[10px] font-bold">Reporte Sesión</span>
                      </button>
                    )}

                    {/* POR TAREA */}
                    {isMenuAllowed('fisica_carga_externa_tareas') && (
                      <button
                        onClick={() => onMenuChange('fisica_carga_externa_tareas')}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
                          activeMenu === 'fisica_carga_externa_tareas' ? 'text-red-400 bg-red-900/20' : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${activeMenu === 'fisica_carga_externa_tareas' ? 'bg-red-400' : 'bg-slate-700'}`}></div>
                        <span className="text-[10px] font-bold">Por Tarea</span>
                      </button>
                    )}

                    {/* GPS INTELLIGENCE */}
                    {isMenuAllowed('fisica_gps_intelligence') && (
                      <button
                        onClick={() => onMenuChange('fisica_gps_intelligence')}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
                          activeMenu === 'fisica_gps_intelligence' ? 'text-red-400 bg-red-900/20' : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${activeMenu === 'fisica_gps_intelligence' ? 'bg-red-400' : 'bg-slate-700'}`}></div>
                        <span className="text-[10px] font-bold italic">GPS Intelligence</span>
                      </button>
                    )}

                    {/* PRONÓSTICO DE CARGAS */}
                    {isMenuAllowed('fisica_pronostico') && (
                      <button
                        onClick={() => onMenuChange('fisica_pronostico')}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
                          activeMenu === 'fisica_pronostico' ? 'text-red-400 bg-red-900/20' : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${activeMenu === 'fisica_pronostico' ? 'bg-red-400' : 'bg-slate-700'}`}></div>
                        <span className="text-[10px] font-bold">Pronóstico de Cargas</span>
                      </button>
                    )}

                    {/* GIMNASIO */}
                    {isMenuAllowed('fisica_gimnasio') && (
                      <button
                        onClick={() => onMenuChange('fisica_gimnasio')}
                        className={`w-full flex items-center justify-between gap-4 px-4 py-3 mt-1 rounded-xl transition-all ${
                          activeMenu === 'fisica_gimnasio' 
                            ? 'bg-red-950/40 text-red-400 border border-red-900/50 shadow-lg' 
                            : 'text-red-500/80 hover:text-red-400'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-1.5 h-1.5 rounded-full ${activeMenu === 'fisica_gimnasio' ? 'bg-red-400' : 'bg-red-500/80'}`}></div>
                          <span className="text-xs font-bold tracking-tight">Gimnasio</span>
                        </div>
                        <span className="text-[8px] bg-red-950/60 text-red-400 px-1 py-0.5 rounded-md font-bold border border-red-500/30">En Desarrollo</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {userRole !== 'club' && isMenuAllowed('medica') && (
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
        {(isMenuAllowed('nutricion_resumen_grupal') || isMenuAllowed('nutricion_individual') || isMenuAllowed('nutricion_top10') || isMenuAllowed('nutricion_maduracion')) && (
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
                {isMenuAllowed('nutricion_resumen_grupal') && (
                  <button
                    onClick={() => onMenuChange('nutricion_resumen_grupal')}
                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                      activeMenu === 'nutricion_resumen_grupal' ? 'text-red-400 bg-red-900/20' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${activeMenu === 'nutricion_resumen_grupal' ? 'bg-red-400' : 'bg-slate-700'}`}></div>
                    <span className="text-[10px] font-bold">Resumen Grupal</span>
                  </button>
                )}
                {isMenuAllowed('nutricion_individual') && (
                  <button
                    onClick={() => onMenuChange('nutricion_individual')}
                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                      activeMenu === 'nutricion_individual' ? 'text-red-400 bg-red-900/20' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${activeMenu === 'nutricion_individual' ? 'bg-red-400' : 'bg-slate-700'}`}></div>
                    <span className="text-[10px] font-bold">Reporte Individual</span>
                  </button>
                )}
                {userRole !== 'club' && (
                  <>
                    {isMenuAllowed('nutricion_top10') && (
                      <button
                        onClick={() => onMenuChange('nutricion_top10')}
                        className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                          activeMenu === 'nutricion_top10' ? 'text-red-400 bg-red-900/20' : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${activeMenu === 'nutricion_top10' ? 'bg-red-400' : 'bg-slate-700'}`}></div>
                        <span className="text-[10px] font-bold">Top 10 Rankings</span>
                      </button>
                    )}
                    {isMenuAllowed('nutricion_maduracion') && (
                      <button
                        onClick={() => onMenuChange('nutricion_maduracion')}
                        className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                          activeMenu === 'nutricion_maduracion' ? 'text-red-400 bg-red-900/20' : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${activeMenu === 'nutricion_maduracion' ? 'bg-red-400' : 'bg-slate-700'}`}></div>
                        <span className="text-[10px] font-bold">Crecimiento & Maduración</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* COMPETENCIA COLLAPSIBLE */}
        {userRole !== 'club' && (isMenuAllowed('competencia') || isMenuAllowed('gps_internacional')) && (
          <div className="pt-2">
            <button
              onClick={() => handleSubmenuClick(setCompetenciaOpen, !competenciaOpen)}
              title={isCollapsed ? 'Competencia' : ''}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between gap-4 px-6'} py-4 rounded-2xl transition-all duration-200 ${
                competenciaOpen ? 'text-white bg-white/5' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-4'}`}>
                <i className={`fa-solid fa-trophy text-xl ${isCollapsed ? '' : 'w-6'} ${competenciaOpen ? 'text-[#CF1B2B]' : 'text-slate-500'}`}></i>
                {!isCollapsed && <span className="font-bold text-sm tracking-tight">Competencia</span>}
              </div>
              {!isCollapsed && <i className={`fa-solid fa-chevron-down text-[10px] transition-transform ${competenciaOpen ? 'rotate-180' : ''}`}></i>}
            </button>
            
            {competenciaOpen && !isCollapsed && (
              <div className="mt-2 ml-4 space-y-1 animate-in slide-in-from-top-2 duration-300 border-l border-white/10 pl-4">
                {isMenuAllowed('competencia') && (
                  <button
                    onClick={() => handleMenuClick('competencia')}
                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                      activeMenu === 'competencia' ? 'text-red-500 bg-red-900/10' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${activeMenu === 'competencia' ? 'bg-red-500' : 'bg-slate-700'}`}></div>
                    <span className="text-[10px] font-bold italic">Gestor de Partidos</span>
                  </button>
                )}
                {isMenuAllowed('gps_internacional') && (
                  <button
                    onClick={() => handleMenuClick('gps_internacional')}
                    className={`w-full flex items-center justify-between px-4 py-2 rounded-lg transition-all ${
                      activeMenu === 'gps_internacional' ? 'text-red-500 bg-red-900/10' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-1.5 h-1.5 rounded-full ${activeMenu === 'gps_internacional' ? 'bg-red-500' : 'bg-slate-700'}`}></div>
                      <span className="text-[10px] font-bold italic">GPS Internacional</span>
                    </div>
                    <span className="text-[7px] font-black uppercase bg-amber-500/25 text-amber-500 px-1.5 py-0.5 rounded-md leading-none border border-amber-500/10 tracking-widest shrink-0">
                      DEV
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ÁREA TÉCNICA COLLAPSIBLE */}
        {userRole !== 'club' && (isMenuAllowed('tecnica_biblioteca') || isMenuAllowed('tecnica_competencia')) && (
          <div className="pt-2">
            <button
              onClick={() => handleSubmenuClick(setTecnicaOpen, !tecnicaOpen)}
              title={isCollapsed ? 'Área Técnica' : ''}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between gap-4 px-6'} py-4 rounded-2xl transition-all duration-200 ${
                tecnicaOpen ? 'text-white bg-white/5' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-4'}`}>
                <i className={`fa-solid fa-clipboard-list text-xl ${isCollapsed ? '' : 'w-6'} ${tecnicaOpen ? 'text-[#CF1B2B]' : 'text-slate-500'}`}></i>
                {!isCollapsed && <span className="font-bold text-sm tracking-tight">Área Técnica</span>}
              </div>
              {!isCollapsed && <i className={`fa-solid fa-chevron-down text-[10px] transition-transform ${tecnicaOpen ? 'rotate-180' : ''}`}></i>}
            </button>
            
            {tecnicaOpen && !isCollapsed && (
              <div className="mt-2 ml-4 space-y-1 animate-in slide-in-from-top-2 duration-300 border-l border-white/10 pl-4">
                {isMenuAllowed('tecnica_biblioteca') && (
                  <button
                    onClick={() => onMenuChange('tecnica_biblioteca')}
                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                      activeMenu === 'tecnica_biblioteca' ? 'text-red-400 bg-red-900/20' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${activeMenu === 'tecnica_biblioteca' ? 'bg-red-400' : 'bg-slate-700'}`}></div>
                    <span className="text-[10px] font-bold">Base de Tareas</span>
                  </button>
                )}
                {isMenuAllowed('tecnica_competencia') && (
                  <button
                    onClick={() => onMenuChange('tecnica_competencia')}
                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                      activeMenu === 'tecnica_competencia' ? 'text-red-400 bg-red-900/20' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${activeMenu === 'tecnica_competencia' ? 'bg-red-400' : 'bg-slate-700'}`}></div>
                    <span className="text-[10px] font-bold">Reporte Competencia</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* LOGÍSTICA COLLAPSIBLE */}
        {userRole !== 'club' && (isMenuAllowed('logistica_jugadores') || isMenuAllowed('citaciones') || isMenuAllowed('desconvocatoria') || isMenuAllowed('contactos_clubes')) && (
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
                {isMenuAllowed('logistica_jugadores') && (
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
                )}
                {isMenuAllowed('citaciones') && (
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
                )}
                {isMenuAllowed('desconvocatoria') && (
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
                )}
                {isMenuAllowed('contactos_clubes') && (
                  <button
                    onClick={() => onMenuChange('contactos_clubes')}
                    className={`w-full flex items-center gap-4 px-6 py-3 rounded-xl transition-all ${
                      activeMenu === 'contactos_clubes' 
                        ? 'bg-[#CF1B2B] text-white shadow-lg' 
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${activeMenu === 'contactos_clubes' ? 'bg-white' : 'bg-slate-700'}`}></div>
                    <span className="text-xs font-bold tracking-tight">Contactos de Clubes</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {isMenuAllowed('sports_science') && (
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
        )}



        {(userRole === 'admin' || userRole === 'staff') && isMenuAllowed('importar_datos') && (
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

        {userRole === 'admin' && isMenuAllowed('telegram_notifications') && (
          <button
            onClick={() => handleMenuClick('telegram_notifications')}
            title={isCollapsed ? 'Notificaciones Telegram' : ''}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'gap-4 px-6'} py-4 rounded-2xl transition-all duration-200 group ${
              activeMenu === 'telegram_notifications' ? 'bg-red-900/20 text-[#CF1B2B]' : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <i className={`fa-brands fa-telegram text-xl ${isCollapsed ? '' : 'w-6'} ${activeMenu === 'telegram_notifications' ? 'text-[#CF1B2B]' : 'text-slate-500 group-hover:text-white'}`}></i>
            {!isCollapsed && <span className="font-bold text-sm tracking-tight text-left">Alertas Telegram</span>}
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

        {userEmail === 'mardones.camilo@gmail.com' && isMenuAllowed('logs') && (
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

      <div className={`p-8 border-t border-white/5 ${isCollapsed ? 'hidden' : ''} flex flex-col gap-4`}>
        {notificationMsg && (
          <div className="bg-blue-600/20 text-blue-400 p-3 rounded-xl text-[9px] font-black uppercase text-center animate-pulse">
            {notificationMsg}
          </div>
        )}
        <button 
          onClick={async () => {
            const result = await subscribeToNotifications();
            if (result.success) {
              setNotificationMsg('¡Notificaciones activadas!');
              setTimeout(() => setNotificationMsg(null), 3000);
            } else {
              setNotificationMsg(result.message || 'Error al activar');
              setTimeout(() => setNotificationMsg(null), 5000);
            }
          }}
          className="w-full py-3 bg-blue-600/20 text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all border border-blue-600/30"
        >
          <i className="fa-solid fa-bell mr-2"></i>
          Activar Notificaciones
        </button>
        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">ANFP v2026.1</p>
      </div>
    </aside>
  );
};

export default Sidebar;
