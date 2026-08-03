
import React, { useState, useMemo, useEffect } from 'react'
import { User, WellnessData, TrainingLoadData, GPSData, Category, CATEGORY_ID_MAP } from '../types'
import { supabase } from '../lib/supabase'
import { logActivity } from '../lib/activityLogger'
import WellnessForm from './WellnessForm'
import TrainingLoadForm from './TrainingLoadForm'
import MatchReportForm from './MatchReportForm'
import NutritionReport from './NutritionReport'
import ClubBadge from './ClubBadge'
import { useClubs } from '../lib/useClubs'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar
} from 'recharts'

interface PlayerDashboardProps {
  player?: User & { isUnlinked?: boolean }
  wellness?: WellnessData[]
  loads?: TrainingLoadData[]
  gps?: GPSData[]
  nutrition?: any[]
  onRefresh?: () => void
  refreshing?: boolean
  onSignOut?: () => void
}

type AthleteView = 'menu' | 'wellness' | 'load' | 'match' | 'nutrition'

import PlayerSidebar, { PlayerMenuId } from './PlayerSidebar'
import ChefAssistant from './ChefAssistant'
import AITrainer from './AITrainer'
import PlayerProfileArea from './PlayerProfileArea'
import { triggerPushNotification } from '../lib/notifications'

const getLocalDateString = (d: Date = new Date()) => {
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

interface TachometerGaugeProps {
  value: number;
  average: number;
  maxValue: number;
  title: string;
  unit: string;
  color?: string;
  fillColor?: string;
  lowerIsBetter?: boolean;
  percentile?: number;
  outlier?: 'low' | 'high';
  referenceMax?: number;
  personalMax?: number;
  penultimateValue?: number;
  swc?: number;
  mdc?: number;
}

const TachometerGauge: React.FC<TachometerGaugeProps> = ({ 
  value, 
  average, 
  maxValue, 
  title, 
  unit, 
  color = 'stroke-red-600',
  fillColor = 'text-red-600',
  lowerIsBetter = false,
  percentile,
}) => {
  const safeVal = isNaN(value) || value < 0 ? 0 : value;
  const safeAvg = isNaN(average) || average < 0 ? 0 : average;
  const max = isNaN(maxValue) || maxValue <= 0 ? 100 : maxValue;
  
  const valuePct = Math.min(100, Math.max(0, (safeVal / max) * 100));
  const avgPct = Math.min(100, Math.max(0, (safeAvg / max) * 100));

  const r = 70;
  const cx = 100;
  const cy = 90;
  const circ = Math.PI * r; 
  const strokeDashoffset = circ - (valuePct / 100) * circ;

  const avgAngleRad = Math.PI - (avgPct / 100) * Math.PI;
  const avgX = cx + r * Math.cos(avgAngleRad);
  const avgY = cy - r * Math.sin(avgAngleRad);

  const valueAngleRad = Math.PI - (valuePct / 100) * Math.PI;
  const needleLen = r - 10;
  const needleX = cx + needleLen * Math.cos(valueAngleRad);
  const needleY = cy - needleLen * Math.sin(valueAngleRad);

  const isBetter = lowerIsBetter 
    ? (safeVal > 0 && safeAvg > 0 ? safeVal <= safeAvg : false) 
    : (safeVal >= safeAvg);

  const pctDiff = safeAvg > 0 
    ? (lowerIsBetter 
        ? ((safeAvg - safeVal) / safeAvg) * 100 
        : ((safeVal - safeAvg) / safeAvg) * 100
      )
    : 0;

  const getPercentileLevel = (pct: number) => {
    if (pct >= 90) return 'Élite';
    if (pct >= 75) return 'Sobresaliente';
    if (pct >= 45) return 'Promedio';
    if (pct >= 20) return 'Por Mejorar';
    return 'Alerta';
  };

  const getPercentileColorClass = (pct: number) => {
    if (pct >= 90) return 'text-purple-600 bg-purple-50 border-purple-100';
    if (pct >= 75) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    if (pct >= 45) return 'text-blue-600 bg-blue-50 border-blue-100';
    if (pct >= 20) return 'text-orange-600 bg-orange-50 border-orange-100';
    return 'text-red-500 bg-red-50 border-red-100';
  };

  return (
    <div key={title} className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 flex flex-col items-center justify-between hover:border-slate-200 hover:bg-slate-50 transition-all duration-300 w-full">
      <div className="text-center w-full">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">{title}</span>
        <div className="flex justify-center items-baseline gap-1">
          <span className="text-base font-black text-slate-900 italic tracking-tight">
            {safeVal > 0 ? safeVal.toLocaleString('es-ES', { maximumFractionDigits: 1 }) : 'S/D'}
          </span>
          {safeVal > 0 && <span className="text-[8px] font-bold text-slate-400 uppercase">{unit}</span>}
        </div>
      </div>

      <div className="relative w-full h-20 my-1 flex items-center justify-center overflow-hidden">
        <svg viewBox="0 0 200 110" className="w-28 h-20">
          <path 
            d="M 30 90 A 70 70 0 0 1 170 90" 
            fill="none" 
            stroke="#f1f5f9" 
            strokeWidth="10" 
            strokeLinecap="round"
          />
          {safeVal > 0 && (
            <path 
              d="M 30 90 A 70 70 0 0 1 170 90" 
              fill="none" 
              className={`${color} stroke-current`}
              strokeWidth="10" 
              strokeLinecap="round"
              strokeDasharray={`${circ} ${circ * 2}`}
              strokeDashoffset={strokeDashoffset}
            />
          )}

          {safeAvg > 0 && (
            <circle 
              cx={avgX} 
              cy={avgY} 
              r="4" 
              fill="#0f172a" 
              stroke="#ffffff"
              strokeWidth="1"
            />
          )}

          <circle cx={cx} cy={cy} r="4" className={fillColor} fill="currentColor" />

          {safeVal > 0 && (
            <line 
              x1={cx} 
              y1={cy} 
              x2={needleX} 
              y2={needleY} 
              stroke="#0f172a" 
              strokeWidth="3" 
              strokeLinecap="round"
            />
          )}
        </svg>

        <div className="absolute bottom-0 text-center">
          <p className="text-[7px] font-black uppercase text-slate-400 tracking-wider">Prom. Cat</p>
          <p className="text-[9px] font-black text-slate-700">
            {safeAvg > 0 ? `${safeAvg.toLocaleString('es-ES', { maximumFractionDigits: 1 })} ${unit}` : 'S/D'}
          </p>
        </div>
      </div>

      <div className="w-full flex flex-col items-center justify-center bg-white py-1 rounded-xl border border-slate-100 z-10 mt-1">
        <p className="text-[6px] font-black uppercase text-slate-400 tracking-wider">vs Promedio</p>
        <p className={`text-[8px] font-black italic ${isBetter && safeVal > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          {safeVal > 0 && safeAvg > 0 ? `${isBetter ? '+' : ''}${pctDiff.toFixed(1)}%` : '—'}
        </p>
      </div>

      {percentile !== undefined && safeVal > 0 && (
        <div className="w-full flex justify-between items-center bg-white px-2 py-0.5 mt-1 rounded-xl border border-slate-100 z-10">
          <div className="text-left">
            <p className="text-[6px] font-black uppercase text-slate-400 tracking-wider">Percentil</p>
            <p className="text-[8px] font-black italic text-slate-900">
              P{percentile}
            </p>
          </div>
          <div className={`px-1.5 py-0.5 rounded-full text-[6px] font-black uppercase border ${getPercentileColorClass(percentile)}`}>
            {getPercentileLevel(percentile)}
          </div>
        </div>
      )}
    </div>
  );
};

const PlayerDashboard: React.FC<PlayerDashboardProps> = ({
  player,
  wellness = [],
  loads = [],
  gps = [],
  nutrition = [],
  onRefresh,
  refreshing,
  onSignOut
}) => {
  const [activeMenu, setActiveMenu] = useState<PlayerMenuId>('inicio')
  const [visitedMenus, setVisitedMenus] = useState<Record<string, boolean>>({
    inicio: true,
    [activeMenu]: true,
  })

  useEffect(() => {
    setVisitedMenus(prev => {
      if (prev[activeMenu]) return prev;
      return { ...prev, [activeMenu]: true };
    });
  }, [activeMenu])
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [linkingId, setLinkingId] = useState('')
  const [isLinking, setIsLinking] = useState(false)
  const [successModalConfig, setSuccessModalConfig] = useState<{ show: boolean, title: string, subtitle: string }>({
    show: false,
    title: '',
    subtitle: ''
  })
  const [profileData, setProfileData] = useState<Partial<User>>({})
  const [customClub, setCustomClub] = useState('')
  const [isOtherClub, setIsOtherClub] = useState(false)
  const [realActivities, setRealActivities] = useState<any[]>([])
  const [loadingActivities, setLoadingActivities] = useState(false)

  // Physical Evaluations States
  const [evalImtp, setEvalImtp] = useState<any[]>([])
  const [evalCmj, setEvalCmj] = useState<any[]>([])
  const [evalCmjRebound, setEvalCmjRebound] = useState<any[]>([])
  const [allPlayers, setAllPlayers] = useState<any[]>([])
  const [loadingEvals, setLoadingEvals] = useState(false)

  const playerYearRaw = useMemo(() => {
    return player ? ((player as any).anio ? Number((player as any).anio) : (player.fecha_nacimiento ? new Date(player.fecha_nacimiento).getFullYear() : NaN)) : NaN;
  }, [player]);
  const playerYear = useMemo(() => isNaN(playerYearRaw) ? '-' : playerYearRaw, [playerYearRaw]);

  const activeComparisonPlayerIds = useMemo(() => {
    if (!player) return [];
    return allPlayers.filter(p => {
      const pYear = (p as any).anio ? Number((p as any).anio) : (p.fecha_nacimiento ? new Date(p.fecha_nacimiento).getFullYear() : NaN);
      return pYear === playerYear;
    }).map(p => p.player_id);
  }, [allPlayers, playerYear, player]);

  const getAvg = (data: any[], key: string) => {
    if (!data || data.length === 0) return 0;
    const values = data
      .map(d => Number(d[key]))
      .filter(v => !isNaN(v) && v > 0);
    if (values.length === 0) return 0;
    return Number((values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(1));
  };

  const getGlobalMax = (data: any[], key: string) => {
    if (!data || data.length === 0) return 0;
    const values = data
      .map(d => Number(d[key]))
      .filter(v => !isNaN(v) && v > 0);
    if (values.length === 0) return 0;
    return Math.max(...values);
  };

  const calculatePercentile = (playerValue: number, data: any[], key: string, lowerIsBetter: boolean = false) => {
    if (isNaN(playerValue) || playerValue <= 0) return undefined;

    let targetPlayerIds = activeComparisonPlayerIds;
    let playerBestValues = targetPlayerIds.map(pId => {
      const pRows = data.filter(d => Number(d.player_id) === Number(pId) && d[key] != null && !isNaN(Number(d[key])));
      if (pRows.length === 0) return null;
      const numericVals = pRows.map(r => Number(r[key])).filter(v => v > 0);
      if (numericVals.length === 0) return null;
      return lowerIsBetter ? Math.min(...numericVals) : Math.max(...numericVals);
    }).filter((v): v is number => v !== null);

    // Fallback: use all players if we don't have enough data in the specific age category
    if (playerBestValues.length <= 1) {
      const allPlayerIds = allPlayers.map(p => p.player_id);
      playerBestValues = allPlayerIds.map(pId => {
        const pRows = data.filter(d => Number(d.player_id) === Number(pId) && d[key] != null && !isNaN(Number(d[key])));
        if (pRows.length === 0) return null;
        const numericVals = pRows.map(r => Number(r[key])).filter(v => v > 0);
        if (numericVals.length === 0) return null;
        return lowerIsBetter ? Math.min(...numericVals) : Math.max(...numericVals);
      }).filter((v): v is number => v !== null);
    }

    if (playerBestValues.length === 0) return undefined;
    if (playerBestValues.length === 1) return 50;

    let countWorse = 0;
    let countEqual = 0;

    playerBestValues.forEach(val => {
      if (lowerIsBetter) {
        if (val > playerValue) {
          countWorse++;
        } else if (val === playerValue) {
          countEqual++;
        }
      } else {
        if (val < playerValue) {
          countWorse++;
        } else if (val === playerValue) {
          countEqual++;
        }
      }
    });

    const rank = countWorse + (countEqual - 1) * 0.5;
    const percentile = (rank / (playerBestValues.length - 1)) * 100;
    return Math.min(99, Math.max(1, Math.round(percentile)));
  };

  const checkOutlier = (playerValue: number, data: any[], key: string, lowerIsBetter: boolean = false) => {
    if (isNaN(playerValue) || playerValue <= 0) return undefined;

    let targetPlayerIds = activeComparisonPlayerIds;
    let playerBestValues = targetPlayerIds.map(pId => {
      const pRows = data.filter(d => Number(d.player_id) === Number(pId) && d[key] != null && !isNaN(Number(d[key])));
      if (pRows.length === 0) return null;
      const numericVals = pRows.map(r => Number(r[key])).filter(v => v > 0);
      if (numericVals.length === 0) return null;
      return lowerIsBetter ? Math.min(...numericVals) : Math.max(...numericVals);
    }).filter((v): v is number => v !== null);

    // Fallback if not enough data
    if (playerBestValues.length < 4) {
      const allPlayerIds = allPlayers.map(p => p.player_id);
      playerBestValues = allPlayerIds.map(pId => {
        const pRows = data.filter(d => Number(d.player_id) === Number(pId) && d[key] != null && !isNaN(Number(d[key])));
        if (pRows.length === 0) return null;
        const numericVals = pRows.map(r => Number(r[key])).filter(v => v > 0);
        if (numericVals.length === 0) return null;
        return lowerIsBetter ? Math.min(...numericVals) : Math.max(...numericVals);
      }).filter((v): v is number => v !== null);
    }

    if (playerBestValues.length < 4) return undefined;

    const sorted = [...playerBestValues].sort((a, b) => a - b);
    
    const getQuantile = (q: number) => {
      const pos = (sorted.length - 1) * q;
      const base = Math.floor(pos);
      const rest = pos - base;
      if (sorted[base + 1] !== undefined) {
        return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
      } else {
        return sorted[base];
      }
    };

    const q1 = getQuantile(0.25);
    const q3 = getQuantile(0.75);
    const iqr = q3 - q1;

    const lowBoundary = q1 - 1.5 * iqr;
    const highBoundary = q3 + 1.5 * iqr;

    if (playerValue < lowBoundary) {
      return 'low';
    } else if (playerValue > highBoundary) {
      return 'high';
    }
    return undefined;
  };

  const getCohortBest = (data: any[], key: string, lowerIsBetter: boolean = false) => {
    let targetPlayerIds = activeComparisonPlayerIds;
    let playerBestValues = targetPlayerIds.map(pId => {
      const pRows = data.filter(d => Number(d.player_id) === Number(pId) && d[key] != null && !isNaN(Number(d[key])));
      if (pRows.length === 0) return null;
      const numericVals = pRows.map(r => Number(r[key])).filter(v => v > 0);
      if (numericVals.length === 0) return null;
      return lowerIsBetter ? Math.min(...numericVals) : Math.max(...numericVals);
    }).filter((v): v is number => v !== null);

    if (playerBestValues.length === 0) {
      const allPlayerIds = allPlayers.map(p => p.player_id);
      playerBestValues = allPlayerIds.map(pId => {
        const pRows = data.filter(d => Number(d.player_id) === Number(pId) && d[key] != null && !isNaN(Number(d[key])));
        if (pRows.length === 0) return null;
        const numericVals = pRows.map(r => Number(r[key])).filter(v => v > 0);
        if (numericVals.length === 0) return null;
        return lowerIsBetter ? Math.min(...numericVals) : Math.max(...numericVals);
      }).filter((v): v is number => v !== null);
    }

    if (playerBestValues.length === 0) return 0;
    return lowerIsBetter ? Math.min(...playerBestValues) : Math.max(...playerBestValues);
  };

  const calculateCohortSD = (list: any[], key: string): number => {
    if (!list || list.length === 0) return 0;
    const values = list
      .map(d => Number(d[key]))
      .filter(v => !isNaN(v) && v > 0);
    if (values.length <= 1) return 0;
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1);
    return Math.sqrt(variance);
  };

  const getGaugeData = (
    metricKey: string,
    dataList: any[],
    lowerIsBetter: boolean = false,
    title: string,
    unit: string,
    color: string,
    fillColor: string,
    fallbackMax: number = 100
  ) => {
    const playerRows = (dataList || [])
      .filter(d => Number(d.player_id) === Number(player?.player_id) && d[metricKey] != null && d[metricKey] !== '' && !isNaN(Number(d[metricKey])));
    
    const sortedPlayerRows = [...playerRows].sort((a, b) => {
      const dateA = a.fecha_test ? new Date(a.fecha_test).getTime() : (a.fecha ? new Date(a.fecha).getTime() : 0);
      const dateB = b.fecha_test ? new Date(b.fecha_test).getTime() : (b.fecha ? new Date(b.fecha).getTime() : 0);
      return dateB - dateA;
    });

    const latestValue = sortedPlayerRows.length > 0 ? Number(sortedPlayerRows[0][metricKey]) : 0;
    const penultimateValue = sortedPlayerRows.length >= 2 ? Number(sortedPlayerRows[1][metricKey]) : undefined;
    
    let bestValue = 0;
    if (playerRows.length > 0) {
      const numericVals = playerRows.map(d => Number(d[metricKey]));
      bestValue = lowerIsBetter ? Math.min(...numericVals) : Math.max(...numericVals);
    }
    
    const average = getAvg(dataList, metricKey);
    const globalMax = getGlobalMax(dataList, metricKey);
    const maxValue = Math.max(latestValue, bestValue, average, globalMax, fallbackMax) * 1.1;
    
    const percentile = calculatePercentile(latestValue, dataList, metricKey, lowerIsBetter);
    const outlier = checkOutlier(latestValue, dataList, metricKey, lowerIsBetter);
    const cohortBest = getCohortBest(dataList, metricKey, lowerIsBetter);

    const cohortSd = calculateCohortSD(dataList, metricKey);
    let swc = cohortSd * 0.2;
    let mdc = cohortSd * 0.88;
    
    if (cohortSd === 0 && penultimateValue !== undefined && penultimateValue > 0) {
      swc = penultimateValue * 0.02;
      mdc = penultimateValue * 0.05;
    }
    
    return {
      value: latestValue,
      average,
      maxValue,
      title,
      unit,
      color,
      fillColor,
      lowerIsBetter,
      percentile,
      outlier: outlier as 'high' | 'low' | undefined,
      referenceMax: cohortBest,
      personalMax: bestValue,
      penultimateValue,
      swc,
      mdc
    };
  };

  const prescriptionData = useMemo(() => {
    if (loadingEvals) return null;
    
    const imtpRel = getGaugeData('imtp_f_relativa_n_kg', evalImtp, false, '', '', '', '', 30);
    const cmjHeight = getGaugeData('cmj_altura_salto_im', evalCmj, false, '', '', '', '', 40);
    const reboundRsi = getGaugeData('rebound_rsi', evalCmjRebound, false, '', '', '', '', 2.0);

    const imtpRelVal = imtpRel.value || 0;
    const imtpRelAvg = imtpRel.average || 0;
    const cmjHeightVal = cmjHeight.value || 0;
    const cmjHeightAvg = cmjHeight.average || 0;
    const reboundRsiVal = reboundRsi.value || 0;
    const reboundRsiAvg = reboundRsi.average || 0;

    let profileTitle = 'Perfil Equilibrado';
    let profileDesc = 'El atleta muestra una relación balanceada entre fuerza base, fuerza reactiva de ciclo lento (CMJ) y elasticidad de ciclo rápido (Rebound). Se sugiere continuar con el microciclo estándar de potencia mixta.';
    let recommendationList: string[] = [];
    let priorityTag = 'Mantener Potencia Mixta';
    let priorityColor = 'bg-slate-50 text-slate-700 border-slate-100';

    if (imtpRelVal > 0 && cmjHeightVal > 0 && reboundRsiVal > 0) {
      const fRatio = imtpRelAvg > 0 ? imtpRelVal / imtpRelAvg : 1;
      const cRatio = cmjHeightAvg > 0 ? cmjHeightVal / cmjHeightAvg : 1;
      const rRatio = reboundRsiAvg > 0 ? reboundRsiVal / reboundRsiAvg : 1;

      if (fRatio > 1.05 && cRatio < 0.95 && rRatio < 0.95) {
        profileTitle = 'Perfil Fuerza-Dominante (Déficit Elástico)';
        profileDesc = 'Excelente capacidad de producción de fuerza concéntrica máxima, pero con transferencia elástica ineficiente y tiempos de contacto prolongados. Requiere re-entrenamiento neuromuscular.';
        priorityTag = 'Pliometría & Reactividad Rápida';
        priorityColor = 'bg-blue-50 text-blue-700 border-blue-200';
      } else if (fRatio < 0.95 && (cRatio > 1.05 || rRatio > 1.05)) {
        profileTitle = 'Perfil Velocidad-Elástico Dominante (Déficit de Fuerza)';
        profileDesc = 'Excelente reactividad de tobillo y altura de vuelo relativa, pero limitado por bajos niveles de fuerza estructural base. Su potencial elástico está limitado por su fuerza máxima.';
        priorityTag = 'Fuerza Máxima & Hipertrofia Funcional';
        priorityColor = 'bg-red-50 text-red-700 border-red-200';
      } else if (fRatio < 0.95 && cRatio < 0.95 && rRatio < 0.95) {
        profileTitle = 'Perfil de Capacidad Condicional Baja (Déficit Concurrente)';
        profileDesc = 'El atleta se encuentra por debajo del promedio de su categoría en todas las áreas de fuerza e impacto elástico. Se recomienda un microciclo de acondicionamiento general de base.';
        priorityTag = 'Acondicionamiento General Concurrente';
        priorityColor = 'bg-amber-50 text-amber-700 border-amber-200';
      } else if (fRatio > 1.05 && cRatio > 1.05 && rRatio > 1.05) {
        profileTitle = 'Perfil Élite de Alto Rendimiento';
        profileDesc = 'Excelente desempeño neuromuscular concurrente. Niveles de fuerza absoluta, reactividad de ciclo corto y capacidad de salto por encima de la media. Enfoque en mantenimiento preventivo.';
        priorityTag = 'Optimización Fina & Prevención';
        priorityColor = 'bg-purple-50 text-purple-700 border-purple-200';
      }
    }

    // Generate dynamic prescriptions based on performance compared to averages
    if (imtpRelVal > 0) {
      if (imtpRelVal < imtpRelAvg) {
        recommendationList.push('Fuerza Máxima: Déficit de Fuerza Máxima Dinámica y Estructural. Prescribir protocolo de sobrecarga progresiva orientado al desarrollo de la fuerza general de base. Utilizar pautas de intensidad media-alta con velocidad concéntrica máxima intencional, asegurando pausas de recuperación completas para optimizar la adaptación neuromuscular.');
      } else {
        recommendationList.push('Fuerza Máxima: Mantenimiento y Optimización de la Fuerza de Base. Prescribir estímulos dinámicos orientados a la potencia y velocidad de ejecución. Mantener volumen bajo y foco en la calidad técnica, incorporando variaciones unilaterales para favorecer la simetría y estabilidad del miembro inferior.');
      }
    } else {
      recommendationList.push('Fuerza Máxima: Fuerza Máxima (Sin Datos). Pauta pendiente. Se requiere completar evaluación de fuerza isométrica (IMTP) para caracterizar la capacidad de producción de fuerza concéntrica máxima.');
    }

    if (cmjHeightVal > 0) {
      if (cmjHeightVal < cmjHeightAvg) {
        recommendationList.push('Potencia de Salto (CMJ): Déficit de Potencia y Eficiencia del Ciclo Estiramiento-Acortamiento Lento. Prescribir estímulo neuromuscular de potencia mecánica vertical. Foco en pautas de transferencia de aceleración, utilizando saltos balísticos de baja a moderada carga externa que estimulen la máxima velocidad de salida del centro de gravedad.');
      } else {
        recommendationList.push('Potencia Exclusiva (CMJ): Potencia Exclusiva y Optimización de la Saltoabilidad. Prescribir estímulo dinámico reactivo asistido o balístico puro. Utilizar pautas de velocidad supra-máxima e impulsión explosiva para potenciar el componente elástico y de triple extensión del miembro inferior.');
      }
    } else {
      recommendationList.push('Neuromuscular (CMJ): Neuromuscular CMJ (Sin Datos). Pauta pendiente. Se requiere registro de evaluación de salto vertical con contramovimiento (CMJ) para caracterizar la eficiencia del ciclo de estiramiento-acortamiento lento.');
    }

    if (reboundRsiVal > 0) {
      if (reboundRsiVal < reboundRsiAvg) {
        recommendationList.push('Reactividad Rápida (SSC): Déficit de Rigidez Activa y Ciclo Estiramiento-Acortamiento Rápido. Prescribir estímulos de pliometría de baja a moderada intensidad. Foco en la reducción drástica de los tiempos de contacto con el suelo y en la rigidez del complejo tobillo-pie mediante pautas de rebote reactivo continuo.');
      } else {
        recommendationList.push('Rigidez (Fast SSC Avanzado): Optimización de Rigidez Activa y Fast-SSC Avanzado. Prescribir pautas pliométricas de alta intensidad y reactividad unilateral. Foco en maximizar la transmisión de energía elástica y soportar altas cargas de impacto excéntrico con deformación mínima en fase de amortiguación.');
      }
    } else {
      recommendationList.push('Reactividad Rápida: Reactividad Rápida Rebound (Sin Datos). Pauta pendiente. Se requiere registro de evaluación de rebotes continuos (Rebound) para programar volumen e intensidad de pliometría de ciclo rápido.');
    }

    return {
      profileTitle,
      profileDesc,
      recommendationList,
      priorityTag,
      priorityColor
    };
  }, [evalImtp, evalCmj, evalCmjRebound, loadingEvals]);

  useEffect(() => {
    const fetchEvaluations = async () => {
      if (!player?.player_id) return;
      setLoadingEvals(true);
      try {
        const { data: pData } = await supabase.from('players').select('*');
        if (pData) setAllPlayers(pData);

        const { data: imtpData } = await supabase.from('evaluaciones_imtp').select('*');
        if (imtpData) {
          const processed = imtpData.map((item: any) => {
            const newItem = { ...item };
            if (newItem['Peak Vertical Force [N]'] !== undefined && newItem['Peak Vertical Force [N]'] !== null) {
              newItem.imtp_fuerza_n = Number(newItem['Peak Vertical Force [N]']);
            } else if (newItem.imtp_fuerza_n !== undefined && newItem.imtp_fuerza_n !== null) {
              newItem['Peak Vertical Force [N]'] = newItem.imtp_fuerza_n;
            }
            if (newItem['Peak Vertical Force / BM [N/kg]'] !== undefined && newItem['Peak Vertical Force / BM [N/kg]'] !== null) {
              newItem.imtp_f_relativa_n_kg = Number(newItem['Peak Vertical Force / BM [N/kg]']);
            } else if (newItem.imtp_f_relativa_n_kg !== undefined && newItem.imtp_f_relativa_n_kg !== null) {
              newItem['Peak Vertical Force / BM [N/kg]'] = newItem.imtp_f_relativa_n_kg;
            }
            return newItem;
          });
          setEvalImtp(processed);
        }

        const { data: cmjData } = await supabase.from('evaluaciones_cmj').select('*');
        if (cmjData) {
          const processed = cmjData.map((item: any) => {
            const newItem = { ...item };
            if (newItem.concentric_peak_force_n !== undefined && newItem.concentric_peak_force_n !== null) {
              newItem.fuerza_cmj = Number(newItem.concentric_peak_force_n);
            } else if (newItem.fuerza_cmj !== undefined && newItem.fuerza_cmj !== null) {
              newItem.concentric_peak_force_n = Number(newItem.fuerza_cmj);
            }
            if (newItem.rsi_modified_m_s !== undefined && newItem.rsi_modified_m_s !== null) {
              newItem.cmj_rsi_mod = Number(newItem.rsi_modified_m_s);
            } else if (newItem.cmj_rsi_mod !== undefined && newItem.cmj_rsi_mod !== null) {
              newItem.rsi_modified_m_s = Number(newItem.cmj_rsi_mod);
            }
            if (newItem.jump_height_impmom_cm !== undefined && newItem.jump_height_impmom_cm !== null) {
              newItem.cmj_altura_salto_im = Number(newItem.jump_height_impmom_cm);
            } else if (newItem.cmj_altura_salto_im !== undefined && newItem.cmj_altura_salto_im !== null) {
              newItem.jump_height_impmom_cm = Number(newItem.cmj_altura_salto_im);
            }
            return newItem;
          });
          setEvalCmj(processed);
        }

        const { data: cmjReboundData } = await supabase.from('evaluaciones_cmj_rebound').select('*');
        if (cmjReboundData) setEvalCmjRebound(cmjReboundData);
      } catch (err) {
        console.error('Error fetching evaluations in PlayerDashboard:', err);
      } finally {
        setLoadingEvals(false);
      }
    };
    fetchEvaluations();
  }, [player?.player_id]);

  const todayStr = useMemo(() => getLocalDateString(), []);
  const todayWellness = useMemo(() => wellness.find(w => w.date === todayStr), [wellness, todayStr]);
  const todayLoads = useMemo(() => loads.filter(l => l.date === todayStr), [loads, todayStr]);
  const todayLoadS1 = useMemo(() => todayLoads.find(l => l.session_index === 1), [todayLoads]);
  const todayLoadS2 = useMemo(() => todayLoads.find(l => l.session_index === 2), [todayLoads]);

  const handleLinkAccount = async () => {
    if (!linkingId || !player?.id) return;
    setIsLinking(true);
    try {
      const pid = parseInt(linkingId);
      if (isNaN(pid)) {
        alert("❌ El ID debe ser un número válido.");
        return;
      }

      // Verificar si el jugador existe
      const { data: pData, error: pErr } = await supabase
        .from('players')
        .select('player_id, nombre, apellido1, id_club')
        .eq('player_id', pid)
        .maybeSingle();
      
      if (pErr) throw pErr;
      if (!pData) {
        alert("❌ ID NO ENCONTRADO: Verifica que tu ID sea el correcto (consulta a tu preparador físico).");
        return;
      }

      let clubName: string | null = null;
      if (pData.id_club) {
        try {
          const { data: cData } = await supabase
            .from('clubes')
            .select('nombre')
            .eq('id_club', pData.id_club)
            .maybeSingle();
          if (cData) {
            clubName = cData.nombre;
          }
        } catch (clubErr) {
          console.warn("No se pudo obtener el nombre del club:", clubErr);
        }
      }

      // Intentar actualizar el perfil
      if (player.id.startsWith('mock-user-')) {
        alert(`✅ VÍNCULO TEMPORAL: Detectado como ${pData.nombre} ${pData.apellido1}. Como estás usando el acceso de respaldo (Master Password), los cambios son solo para esta sesión. Para un vínculo permanente, regístrate con tu correo real.`);
        if (onRefresh) onRefresh(); // Esto debería actualizar el estado en App.tsx si lo manejamos allá
        // En App.tsx, tendríamos que manejar el refresh para mock users... un poco complejo.
        // Por ahora, recarguemos la app o simplemente mostremos éxito.
        window.location.reload(); 
        return;
      }

      // Usar upsert en lugar de update para ser robustos ante cuentas creadas con master-bypass (mock ID)
      const { error: upError } = await supabase
        .from('profiles')
        .upsert({
          id: player.id,
          player_id: pid,
          role: 'player',
          club_name: clubName
        });
      
      if (upError) throw upError;

      // Persistir también en metadata de Supabase Auth para recuperación en login
      try {
        await supabase.auth.updateUser({
          data: { player_id: pid }
        });
      } catch (authErr) {
        console.warn("No se pudo actualizar metadata de Auth, pero el perfil se guardó:", authErr);
      }

      alert(`✅ VÍNCULO EXITOSO: Tu cuenta ha sido asociada a ${pData.nombre} ${pData.apellido1}.`);
      if (onRefresh) onRefresh();
      window.location.reload();
    } catch (err: any) {
      alert("❌ Error vinculando cuenta: " + err.message);
    } finally {
      setIsLinking(false);
    }
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '--:--';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '--:--';
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '--:--';
    }
  };

  const { clubs: dbClubs, loading: loadingClubs } = useClubs();

  const CLUBS = useMemo(() => {
    if (loadingClubs) return [];
    // Ensure unique club names
    const names = Array.from(new Set(dbClubs.map(c => c.nombre).filter(Boolean)));
    if (!names.includes('Extranjero')) names.push('Extranjero');
    if (!names.includes('S/C')) names.push('S/C');
    return names.sort();
  }, [dbClubs, loadingClubs]);

  const POSITIONS = [
    'Portero', 'Defensa Central', 'Defensa Lateral', 'Volante', 
    'Delantero Extremo', 'Centro Delantero', 'Media Punta', 'Sin definir'
  ];

  React.useEffect(() => {
    if (player) {
      setProfileData({
        nombre: player.nombre,
        apellido1: player.apellido1,
        apellido2: player.apellido2,
        club: player.club,
        position: player.position,
        anio: player.anio,
        fecha_nacimiento: player.fecha_nacimiento,
        celular: player.celular
      });
      
      // Verificar si el club actual está en la lista oficial
      if (player.club && !CLUBS.includes(player.club) && player.club !== 'Extranjero' && player.club !== 'S/C') {
        setIsOtherClub(true);
        setCustomClub(player.club);
      } else {
        setIsOtherClub(false);
        setCustomClub('');
      }

      fetchRealActivities();
    }
  }, [player]);

  const fetchRealActivities = async () => {
    if (!player?.category) return;
    setLoadingActivities(true);
    try {
      const today = getLocalDateString();
      const { data, error } = await supabase
        .from('anual_activities')
        .select('*')
        .eq('fecha', today)
        .eq('categoria', player.category);

      if (error) throw error;
      setRealActivities(data || []);
    } catch (err) {
      console.error('Error fetching activities:', err);
    } finally {
      setLoadingActivities(false);
    }
  };

  const handleBack = () => setActiveMenu('inicio')

  const handleWellnessSubmit = async (data: any) => {
    if (player?.isUnlinked || !player?.player_id) {
      alert("⚠️ CUENTA NO VINCULADA: Tu usuario no está asociado a un perfil de jugador oficial en la base de datos.");
      return;
    }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const today = getLocalDateString();

      const playerCategory = player?.category || (player as any)?.categoria || Category.SUB_17;
      let categoryId = 5; // Default to Sub 17
      if (playerCategory) {
        if (typeof playerCategory === 'number') {
          categoryId = playerCategory;
        } else if (typeof playerCategory === 'string') {
          const lowerCat = playerCategory.toLowerCase().trim().replace(' ', '_');
          if (CATEGORY_ID_MAP[playerCategory as Category] !== undefined) {
            categoryId = CATEGORY_ID_MAP[playerCategory as Category];
          } else {
            const matchedKey = Object.values(Category).find(catVal => catVal.toLowerCase() === lowerCat);
            if (matchedKey && CATEGORY_ID_MAP[matchedKey] !== undefined) {
              categoryId = CATEGORY_ID_MAP[matchedKey];
            } else {
              const match = playerCategory.match(/\d+/);
              if (match) {
                const num = parseInt(match[0]);
                const foundCatVal = Object.values(Category).find(catVal => {
                  const valMatch = catVal.match(/\d+/);
                  return valMatch && parseInt(valMatch[0]) === num;
                });
                if (foundCatVal && CATEGORY_ID_MAP[foundCatVal] !== undefined) {
                  categoryId = CATEGORY_ID_MAP[foundCatVal];
                }
              }
            }
          }
        }
      }

      const { data: activeMC } = await supabase
        .from('microcycles')
        .select('id')
        .eq('category_id', categoryId)
        .lte('start_date', today)
        .gte('end_date', today)
        .maybeSingle();
      
      let maxEva = null;
      if (data.sorenessAreas && data.sorenessAreas.length > 0) {
        const scores = data.sorenessAreas.map((area: string) => data.evaScores?.[area] || 5);
        maxEva = Math.max(...scores);
      }

      const payload = {
        player_id: player.player_id,
        microcycle_id: activeMC?.id || null,
        checkin_date: today,
        sleep_quality: data.sleep,
        fatigue: data.fatigue,
        stress: data.stress,
        mood: data.mood,
        soreness: data.soreness,
        molestias: data.sorenessAreas.length > 0 
          ? data.sorenessAreas.map((area: string) => `${area} (EVA: ${data.evaScores?.[area] || 5})`).join(', ')
          : '',
        enfermedad: data.illnessSymptoms.join(', '),
        created_by: user?.id,
        eva: maxEva
      };

      const { error } = await supabase
        .from('wellness_checkin')
        .upsert(payload, { onConflict: 'player_id,checkin_date' });
      
      if (error) throw error;
      
      logActivity('Envío Wellness', { playerId: player.player_id, date: today });

      // Disparar notificación push
      triggerPushNotification({
        title: `Check-in Wellness: ${player.nombre} ${player.apellido1}`,
        body: `Fatiga: ${data.fatigue}, Sueño: ${data.sleep}, Estrés: ${data.stress}`,
        url: '/fisica_wellness'
      }).catch(err => console.error("Error disparando notificación:", err));

      setSuccessModalConfig({
        show: true,
        title: 'Reporte Listo',
        subtitle: 'Tu información ha sido sincronizada correctamente.'
      });
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert("❌ Error de Sistema: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoadSubmit = async (data: any) => {
    if (player?.isUnlinked || !player?.player_id) {
      alert("⚠️ CUENTA NO VINCULADA: No se detectó un vínculo oficial con la base de datos.");
      return;
    }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const today = getLocalDateString();

      const playerCategory = player?.category || (player as any)?.categoria || Category.SUB_17;
      let categoryId = 5; // Default to Sub 17
      if (playerCategory) {
        if (typeof playerCategory === 'number') {
          categoryId = playerCategory;
        } else if (typeof playerCategory === 'string') {
          const lowerCat = playerCategory.toLowerCase().trim().replace(' ', '_');
          if (CATEGORY_ID_MAP[playerCategory as Category] !== undefined) {
            categoryId = CATEGORY_ID_MAP[playerCategory as Category];
          } else {
            const matchedKey = Object.values(Category).find(catVal => catVal.toLowerCase() === lowerCat);
            if (matchedKey && CATEGORY_ID_MAP[matchedKey] !== undefined) {
              categoryId = CATEGORY_ID_MAP[matchedKey];
            } else {
              const match = playerCategory.match(/\d+/);
              if (match) {
                const num = parseInt(match[0]);
                const foundCatVal = Object.values(Category).find(catVal => {
                  const valMatch = catVal.match(/\d+/);
                  return valMatch && parseInt(valMatch[0]) === num;
                });
                if (foundCatVal && CATEGORY_ID_MAP[foundCatVal] !== undefined) {
                  categoryId = CATEGORY_ID_MAP[foundCatVal];
                }
              }
            }
          }
        }
      }

      const { data: activeMC } = await supabase
        .from('microcycles')
        .select('id')
        .eq('category_id', categoryId)
        .lte('start_date', today)
        .gte('end_date', today)
        .maybeSingle();

      const payloadWithoutIndex: any = {
        player_id: player.player_id,
        microcycle_id: activeMC?.id || null,
        session_date: today,
        rpe: data.rpe,
        duration_min: data.duration,
        srpe: Number(data.rpe) * Number(data.duration),
        molestias: data.sorenessAreas.join(', '),
        enfermedad: data.illnessSymptoms.join(', '),
        created_by: user?.id
      };

      const payloadWithIndex: any = {
        ...payloadWithoutIndex,
        session_index: data.session_index || 1
      };

      let saveError;
      let wasConsolidated = false;
      let isSrpeColumnGenerated = false;
      
      try {
        // Primero intentamos con session_index (requerido por la especificación más reciente)
        let { error } = await supabase
          .from('internal_load')
          .upsert(payloadWithIndex, { onConflict: 'player_id,session_date,session_index' });
        
        if (error && (error.message?.includes('srpe') || error.message?.includes('non-DEFAULT value') || JSON.stringify(error).includes('srpe'))) {
          console.warn("⚠️ Error de columna generada 'srpe' detectado. Reintentando insertar sin 'srpe'...");
          isSrpeColumnGenerated = true;
          delete payloadWithIndex.srpe;
          delete payloadWithoutIndex.srpe;
          const { error: retryError } = await supabase
            .from('internal_load')
            .upsert(payloadWithIndex, { onConflict: 'player_id,session_date,session_index' });
          error = retryError;
        }
        
        saveError = error;
      } catch (err: any) {
        saveError = err;
      }

      // Si el error es por restricción única antigua en player_id y session_date
      const isUniqueConstraintViolation = saveError && (
        String(saveError.code) === '23505' ||
        saveError.message?.includes('internal_load_player_id_session_date_key') ||
        saveError.details?.includes('internal_load_player_id_session_date_key') ||
        saveError.message?.includes('duplicate key value violates unique constraint') ||
        JSON.stringify(saveError).includes('internal_load_player_id_session_date_key')
      );

      if (isUniqueConstraintViolation) {
        console.warn("⚠️ Detectada restricción única antigua (player_id, session_date). Consolidando sesión de doble jornada...");
        wasConsolidated = true;
        try {
          // Obtener la carga existente del día
          const { data: existingLoad, error: fetchErr } = await supabase
            .from('internal_load')
            .select('*')
            .eq('player_id', player.player_id)
            .eq('session_date', today)
            .maybeSingle();

          if (fetchErr) throw fetchErr;

          if (existingLoad) {
            // Consolidación inteligente de doble jornada (Sports Science sRPE ponderado)
            const rpe1 = existingLoad.rpe || 0;
            const dur1 = existingLoad.duration_min || 0;
            const rpe2 = data.rpe || 0;
            const dur2 = data.duration || 0;

            const totalDuration = dur1 + dur2;
            const totalSRPE = (rpe1 * dur1) + (rpe2 * dur2);
            const consolidatedRPE = totalDuration > 0 ? Math.round(totalSRPE / totalDuration) : rpe2;

            // Combinar molestias sin duplicados
            const molestiasSet = new Set<string>();
            if (existingLoad.molestias) {
              existingLoad.molestias.split(',').forEach((m: string) => {
                const trimmed = m.trim();
                if (trimmed) molestiasSet.add(trimmed);
              });
            }
            data.sorenessAreas.forEach((m: string) => {
              const trimmed = m.trim();
              if (trimmed) molestiasSet.add(trimmed);
            });
            const combinedMolestias = Array.from(molestiasSet).join(', ');

            // Combinar enfermedad sin duplicados
            const enfermedadSet = new Set<string>();
            if (existingLoad.enfermedad) {
              existingLoad.enfermedad.split(',').forEach((e: string) => {
                const trimmed = e.trim();
                if (trimmed) enfermedadSet.add(trimmed);
              });
            }
            data.illnessSymptoms.forEach((e: string) => {
              const trimmed = e.trim();
              if (trimmed) enfermedadSet.add(trimmed);
            });
            const combinedEnfermedad = Array.from(enfermedadSet).join(', ');

            // Actualizar la fila única existente
            const updatePayload: any = {
              rpe: consolidatedRPE,
              duration_min: totalDuration,
              molestias: combinedMolestias || null,
              enfermedad: combinedEnfermedad || null,
              session_index: 1, // Mantenemos 1 para compatibilidad
            };

            if (!isSrpeColumnGenerated) {
              updatePayload.srpe = totalSRPE;
            }

            // Actualizar la fila única existente
            let { error: updateErr } = await supabase
              .from('internal_load')
              .update(updatePayload)
              .eq('id', existingLoad.id);

            if (updateErr && (updateErr.message?.includes('srpe') || updateErr.message?.includes('non-DEFAULT value') || JSON.stringify(updateErr).includes('srpe'))) {
              console.warn("⚠️ Reintentando actualizar sin la columna 'srpe' debido a restricción de columna generada...");
              isSrpeColumnGenerated = true;
              delete updatePayload.srpe;
              const { error: retryUpdateErr } = await supabase
                .from('internal_load')
                .update(updatePayload)
                .eq('id', existingLoad.id);
              updateErr = retryUpdateErr;
            }

            if (updateErr) throw updateErr;
            saveError = null; // Error resuelto con éxito
            console.log("✅ Carga consolidada con éxito en registro único existente para doble jornada.");
          } else {
            // Si por alguna razón no se encontró, intentamos un upsert simple reemplazando
            let { error: upsertErr } = await supabase
              .from('internal_load')
              .upsert(payloadWithoutIndex, { onConflict: 'player_id,session_date' });
            
            if (upsertErr && (upsertErr.message?.includes('srpe') || upsertErr.message?.includes('non-DEFAULT value') || JSON.stringify(upsertErr).includes('srpe'))) {
              console.warn("⚠️ Error de columna generada 'srpe' en upsert de consolidación. Reintentando sin 'srpe'...");
              isSrpeColumnGenerated = true;
              delete payloadWithoutIndex.srpe;
              const { error: retryUpsertErr } = await supabase
                .from('internal_load')
                .upsert(payloadWithoutIndex, { onConflict: 'player_id,session_date' });
              upsertErr = retryUpsertErr;
            }

            if (upsertErr) throw upsertErr;
            saveError = null;
          }
        } catch (consolidationErr: any) {
          console.error("Error consolidando doble jornada:", consolidationErr);
          // Si falla la consolidación, lanzamos el error original
          throw saveError;
        }
      } else if (saveError && (
        saveError.message?.includes('session_index') || 
        saveError.details?.includes('session_index') ||
        saveError.message?.includes('ON CONFLICT') ||
        saveError.message?.includes('on conflict') ||
        saveError.message?.includes('specification') ||
        JSON.stringify(saveError).includes('session_index') ||
        JSON.stringify(saveError).includes('on_conflict') ||
        JSON.stringify(saveError).includes('ON CONFLICT') ||
        JSON.stringify(saveError).includes('specification')
      )) {
        console.warn("⚠️ Columna 'session_index' o restricción múltiple no encontrada en base de datos. Cayendo en modo compatible (sin session_index)...");
        let { error: retryError } = await supabase
          .from('internal_load')
          .upsert(payloadWithoutIndex, { onConflict: 'player_id,session_date' });
        
        if (retryError && (retryError.message?.includes('srpe') || retryError.message?.includes('non-DEFAULT value') || JSON.stringify(retryError).includes('srpe'))) {
          console.warn("⚠️ Error de columna generada 'srpe' detectado en reintento compatible. Reintentando sin 'srpe'...");
          isSrpeColumnGenerated = true;
          delete payloadWithoutIndex.srpe;
          const { error: retryError2 } = await supabase
            .from('internal_load')
            .upsert(payloadWithoutIndex, { onConflict: 'player_id,session_date' });
          retryError = retryError2;
        }

        if (retryError) throw retryError;
      } else if (saveError) {
        throw saveError;
      }
      
      logActivity('Envío Carga Interna (PSE)', { playerId: player.player_id, date: today, rpe: data.rpe });

      // Disparar notificación push
      triggerPushNotification({
        title: `Check-out (RPE): ${player.nombre} ${player.apellido1}`,
        body: `Esfuerzo: ${data.rpe}, Duración: ${data.duration} min.`,
        url: '/fisica_pse'
      }).catch(err => console.error("Error disparando notificación:", err));

      if (wasConsolidated) {
        setSuccessModalConfig({
          show: true,
          title: 'Reporte Consolidado',
          subtitle: 'Se ha unificado tu esfuerzo en un único registro diario debido a una restricción antigua en la base de datos. Para registrar las sesiones de manera independiente, solicita al administrador de Supabase ejecutar la actualización de base de datos.'
        });
      } else {
        setSuccessModalConfig({
          show: true,
          title: 'Reporte Listo',
          subtitle: `Tu Sesión ${data.session_index || 1} ha sido sincronizada correctamente.`
        });
      }
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert("❌ Error al guardar: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMatchSubmit = async (data: any) => {
    if (player?.isUnlinked || !player?.player_id) {
      alert("⚠️ CUENTA NO VINCULADA: No se detectó un vínculo oficial con la base de datos.");
      return;
    }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const selectedDate = data.date || getLocalDateString();

      const matchResultValue = data.resultado || data.result || 'GANÓ';
      const matchMinutesValue = data.minutos !== undefined ? data.minutos : (data.minutes !== undefined ? data.minutes : 90);

      // Si minutos o RPE son 0 o menores, los guardamos como 1 en la base de datos
      // para evitar violar la restricción CHECK de 'internal_load' que tiene un disparador (trigger) en Supabase
      const dbMinutes = Math.max(1, Number(matchMinutesValue) || 0);
      const dbRpe = Math.max(1, Number(data.rpe) || 0);

      const payload = {
        player_id: player.player_id,
        fecha: selectedDate,
        rival: data.rival,
        resultado: matchResultValue,
        minutos_jugados: dbMinutes,
        rpe: dbRpe,
        molestias: data.sorenessAreas.join(', '),
        enfermedad: data.illnessSymptoms.join(', '),
        created_by: user?.id,
        Categoria: data.category || data.categoria || null
      };

      console.log('Sending match report payload to Supabase:', payload);

      let saveError;
      try {
        // Consultar si ya existe un reporte de competencia para este jugador en esta fecha
        const { data: existingReport, error: checkError } = await supabase
          .from('match_reports')
          .select('id')
          .eq('player_id', player.player_id)
          .eq('fecha', selectedDate)
          .maybeSingle();

        if (checkError) {
          console.error("Error comprobando reporte de competencia existente:", checkError);
        }

        if (existingReport?.id) {
          console.log(`📝 Sincronizando reporte de competencia: actualizando fila existente ${existingReport.id}`);
          const { error } = await supabase
            .from('match_reports')
            .update(payload)
            .eq('id', existingReport.id);
          saveError = error;
        } else {
          console.log(`➕ Sincronizando reporte de competencia: insertando nuevo registro`);
          const { error } = await supabase
            .from('match_reports')
            .insert(payload);
          saveError = error;
        }
      } catch (err: any) {
        saveError = err;
      }

      if (saveError) {
        const errorMsg = saveError.message || JSON.stringify(saveError);
        // Si no se encuentra la tabla match_reports o falta en cache, hacemos fallback a internal_load de tipo MATCH
        if (errorMsg.includes('match_reports') || errorMsg.includes('schema cache') || errorMsg.includes('relation "public.match_reports" does not exist')) {
          console.warn("⚠️ Tabla 'match_reports' no encontrada. Utilizando fallback robusto en 'internal_load'...");
          
          const fallbackPayload = {
            player_id: player.player_id,
            session_date: selectedDate,
            rpe: dbRpe, // Garantiza un mínimo de 1 para cumplir la restricción check de internal_load
            duration_min: dbMinutes, // Garantiza un mínimo de 1 para cumplir la restricción check de internal_load
            type: 'MATCH',
            molestias: `[Partido vs ${data.rival || 'Desconocido'} - Resultado: ${matchResultValue || 'Titular'}] | ` + (data.sorenessAreas.join(', ') || 'Sin molestias'),
            enfermedad: data.illnessSymptoms.join(', ') || null,
            session_index: 2, // Se registra con session_index 2 para no chocar si ya envió un check-out previo en index 1
            created_by: user?.id
          };

          const fallbackPayloadWithoutIndex = { ...fallbackPayload };
          delete (fallbackPayloadWithoutIndex as any).session_index;

          // Hacemos una consulta previa para verificar la existencia del registro en internal_load de manera agnóstica de constraints
          const { data: existingLoads, error: selectErr } = await supabase
            .from('internal_load')
            .select('*')
            .eq('player_id', player.player_id)
            .eq('session_date', selectedDate);

          if (selectErr) {
            console.error("Error consultando internal_load previo en fallback:", selectErr);
          }

          // Intentar ubicar un registro candidato para actualizar
          const targetLoad = existingLoads?.find(ld => ld.session_index === 2) ||
                             existingLoads?.find(ld => ld.type === 'MATCH') ||
                             existingLoads?.[0];

          if (targetLoad) {
            console.log("📝 Encontrado registro existente en fallback de MATCH. Actualizando fila ID:", targetLoad.id);
            const updatePayload: any = {
              rpe: fallbackPayload.rpe,
              duration_min: fallbackPayload.duration_min,
              type: 'MATCH',
              molestias: fallbackPayload.molestias,
              enfermedad: fallbackPayload.enfermedad
            };
            
            const { error: updErr } = await supabase
              .from('internal_load')
              .update(updatePayload)
              .eq('id', targetLoad.id);

            if (updErr) throw updErr;
          } else {
            console.log("➕ No se encontró registro previo. Insertando nueva carga en fallback de MATCH...");
            // Intentamos insertar con session_index primero
            const { error: insErr } = await supabase
              .from('internal_load')
              .insert(fallbackPayload);

            if (insErr) {
              const insErrMsg = insErr.message || JSON.stringify(insErr);
              // Si falla porque no existe la columna session_index, intentamos insertar sin session_index
              if (insErrMsg.includes('session_index') || insErrMsg.includes('column') || insErr.code === '42703') {
                console.warn("⚠️ Columna 'session_index' no encontrada al insertar fallback. Reintentando sin ella...");
                const { error: insErr2 } = await supabase
                  .from('internal_load')
                  .insert(fallbackPayloadWithoutIndex);
                if (insErr2) throw insErr2;
              } else {
                throw insErr;
              }
            }
          }
        } else {
          throw saveError;
        }
      }
      
      logActivity('Envío Reporte de Competencia', { playerId: player.player_id, date: selectedDate, rival: data.rival });

      setSuccessModalConfig({
        show: true,
        title: 'Reporte de Partido Listo',
        subtitle: 'Tu información de competencia ha sido sincronizada correctamente.'
      });
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert("❌ Error al guardar reporte: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!player?.player_id) {
      alert("❌ Error: No se pudo identificar tu ID de jugador. Contacta al Staff técnico.");
      return;
    }
    
    setSubmitting(true);
    console.log("Iniciando actualización de perfil para ID:", player.player_id);
    
    try {
      const finalClub = isOtherClub ? customClub : profileData.club;
      
      // Buscar id_club equivalente
      let idClubToAssign = null;
      if (isOtherClub) {
        // Buscar si existe un club con el mismo nombre en base de datos
        const foundClub = dbClubs.find(c => c.nombre.toLowerCase() === customClub.trim().toLowerCase());
        idClubToAssign = foundClub ? foundClub.id_club : 91; // 91 is Desconocido/SC fallback
      } else if (profileData.club) {
        const foundClub = dbClubs.find(c => c.nombre === profileData.club);
        if (foundClub) idClubToAssign = foundClub.id_club;
      }

      const payload = {
        nombre: profileData.nombre?.trim() || null,
        apellido1: profileData.apellido1?.trim() || null,
        apellido2: profileData.apellido2?.trim() || null,
        id_club: idClubToAssign,
        posicion: profileData.position || null,
        fecha_nacimiento: profileData.fecha_nacimiento || null,
        celular: profileData.celular?.trim() || null
      };

      console.log("Enviando payload de actualización:", payload);

      const { error, data, count } = await supabase
        .from('players')
        .update(payload)
        .eq('player_id', Number(player.player_id))
        .select();

      if (error) {
        console.error("Error de Supabase al actualizar:", error);
        throw error;
      }
      
      console.log("Respuesta de actualización exitosa:", { data, count });
      
      try {
        logActivity('Actualización Perfil Jugador', { 
          playerId: player.player_id,
          fields: Object.keys(payload).filter(k => (payload as any)[k] !== null)
        });
      } catch (logErr) {
        console.warn("Actividad no registrada en el log, pero el perfil sí se actualizó.");
      }

      // Mostramos mensaje de éxito con el modal que ya existe
      setSuccessModalConfig({
        show: true,
        title: '¡Cambios Guardados!',
        subtitle: 'Tu información técnica ha sido actualizada con éxito en el sistema central.'
      });
      
      if (onRefresh) {
        onRefresh();
      }
    } catch (err: any) {
      console.error("Error capturado en handleProfileUpdate:", err);
      // Alerta de fallback si el modal falla o para visibilidad inmediata de error
      alert("❌ HUBO UN PROBLEMA: " + (err.message || "No se pudieron guardar los cambios. Inténtalo de nuevo."));
    } finally {
      setSubmitting(false);
    }
  };


  const performanceData = useMemo(() => {
    const last14Wellness = [...wellness].sort((a, b) => a.date.localeCompare(b.date)).slice(-14);
    const last14Loads = [...loads].sort((a, b) => a.date.localeCompare(b.date)).slice(-14);

    if (last14Wellness.length === 0 && last14Loads.length === 0) return [];

    // Combinar datos por fecha
    const dates = Array.from(new Set([...last14Wellness.map(w => w.date.substring(0, 10)), ...last14Loads.map(l => l.date.substring(0, 10))])).sort();

    return dates.map(date => {
      const w = last14Wellness.find(x => x.date.substring(0, 10) === date);
      const dayLoads = last14Loads.filter(x => x.date.substring(0, 10) === date);
      const totalLoad = dayLoads.reduce((acc, curr) => acc + (curr.load || 0), 0);
      
      return {
        date: new Date(date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase(),
        wellness: w ? (w.fatigue + w.sleep + w.mood) / 3 : 0,
        load: totalLoad
      };
    });
  }, [wellness, loads]);

  const renderComponentById = (menuId: PlayerMenuId) => {
    switch (menuId) {
      case 'inicio':
        return (
          <div className="space-y-6 md:space-y-10 animate-in fade-in duration-500">
            {player?.isUnlinked && (
              <div className="bg-amber-50 border border-amber-200 p-6 md:p-8 rounded-[32px] md:rounded-[40px] shadow-sm animate-in fade-in slide-in-from-top-4 duration-700">
                <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-amber-500 rounded-[24px] md:rounded-[32px] flex items-center justify-center text-white text-2xl md:text-3xl shrink-0 shadow-lg shadow-amber-500/20">
                    <i className="fa-solid fa-link-slash"></i>
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <p className="text-[10px] md:text-[12px] font-black text-amber-700 uppercase tracking-[0.2em] mb-2">Cuenta no vinculada</p>
                    <p className="text-xs md:text-sm font-bold text-amber-900 leading-relaxed mb-4 italic">
                      "Tu usuario no está asociado a un perfil de jugador oficial. Para reportar bienestar y cargas, debes vincular tu ID único asignado por el Staff."
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto md:mx-0">
                      <input 
                        type="text" 
                        value={linkingId}
                        onChange={(e) => setLinkingId(e.target.value)}
                        placeholder="Ingresa tu ID (ej: 14)"
                        className="flex-1 px-5 py-3 bg-white border border-amber-200 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                      />
                      <button 
                        onClick={handleLinkAccount}
                        disabled={isLinking || !linkingId}
                        className="px-6 py-3 bg-[#0b1220] text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-black transition-all disabled:opacity-50"
                      >
                        {isLinking ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Vincular Ahora'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
              <div className="md:col-span-12 bg-[#0b1220] rounded-[28px] md:rounded-[40px] p-5 md:p-10 flex items-center justify-between shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full -mr-16 -mt-16 group-hover:bg-red-600/20 transition-all duration-700"></div>
                <div className="relative z-10 flex flex-col gap-1">
                  <h2 className="text-white text-lg md:text-4xl font-black italic uppercase tracking-tighter leading-none">{player?.name || 'ATLETA DEMO'}</h2>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-white/40 text-[7px] md:text-[10px] font-bold uppercase tracking-[0.1em] md:tracking-[0.2em]">
                    <ClubBadge clubName={player?.club} idClub={player?.id_club} clubs={dbClubs} logoSize="w-3 h-3" className="text-white/40 font-bold uppercase" />
                    <span className="text-white/20">|</span>
                    <span>{player?.position || 'SIN POSICIÓN'}</span>
                    <span className="text-white/20">|</span>
                    <span>{player?.anio ? (Number(player.anio) < 100 ? `CATEGORÍA SUB ${player.anio}` : `CLASE ${player.anio}`) : 'N/A'}</span>
                  </div>
                  <div className="mt-3 md:mt-6 flex gap-3">
                    <div className="inline-flex items-center gap-2 bg-[#CF1B2B]/20 border border-[#CF1B2B]/30 px-3 md:px-4 py-1.5 md:py-2 rounded-full">
                      <i className={`fa-solid ${player?.isUnlinked ? 'fa-circle-dot animate-pulse' : 'fa-circle-check'} text-[#CF1B2B] text-[8px] md:text-[10px]`}></i>
                      <span className="text-white text-[7px] md:text-[9px] font-black uppercase tracking-widest">
                        {player?.isUnlinked ? 'PENDIENTE' : 'ACTIVO'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="hidden sm:flex w-16 md:w-24 h-16 md:h-24 bg-white/5 rounded-[20px] md:rounded-[32px] items-center justify-center text-white/10 text-4xl md:text-6xl group-hover:scale-105 transition-transform">
                  <i className="fa-solid fa-user"></i>
                </div>
              </div>
            </div>

            {/* Quick Actions Shortcuts */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
              <button 
                onClick={() => setActiveMenu('reportes_wellness' as PlayerMenuId)}
                className="bg-[#CF1B2B] text-white p-4 rounded-[20px] md:rounded-[24px] shadow-lg shadow-red-500/10 hover:bg-black transition-all flex flex-col items-center gap-2 group border border-red-500/20"
              >
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-base group-hover:scale-110 transition-transform">
                  <i className="fa-solid fa-sun"></i>
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-black uppercase tracking-widest leading-none mb-1">Check-in Wellness</p>
                  <p className="text-[7px] font-bold opacity-60 uppercase tracking-tighter">Reporte Matutino</p>
                </div>
              </button>
              
              <button 
                onClick={() => setActiveMenu('reportes_load' as PlayerMenuId)}
                className="bg-blue-600 text-white p-4 rounded-[20px] md:rounded-[24px] shadow-xl hover:bg-blue-700 transition-all flex flex-col items-center gap-2 group border border-white/5"
              >
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-base group-hover:scale-110 transition-transform">
                  <i className="fa-solid fa-chart-line"></i>
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-black uppercase tracking-widest leading-none mb-1">Check-out Carga</p>
                  <p className="text-[7px] font-bold opacity-60 uppercase tracking-tighter">Post-Entrenamiento</p>
                </div>
              </button>

              <button 
                onClick={() => setActiveMenu('reportes_match' as PlayerMenuId)}
                className="bg-white border-2 border-slate-100 text-slate-900 p-4 rounded-[20px] md:rounded-[24px] shadow-sm hover:border-[#CF1B2B] hover:text-[#CF1B2B] transition-all flex flex-col items-center gap-2 group"
              >
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-base group-hover:scale-110 transition-transform">
                  <i className="fa-solid fa-trophy"></i>
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-black uppercase tracking-widest leading-none mb-1">Competición</p>
                  <p className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter">Reporte de Partido</p>
                </div>
              </button>
            </div>

            {/* Status Boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className={`p-4 md:p-6 rounded-[24px] md:rounded-[32px] border flex items-center justify-between transition-all duration-500 ${todayWellness ? 'bg-emerald-50/50 border-emerald-100 shadow-sm' : 'bg-slate-50/50 border-slate-100 shadow-sm'}`}>
                <div className="flex items-center gap-3 md:gap-4">
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center text-lg md:text-xl ${todayWellness ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                    <i className="fa-solid fa-sun"></i>
                  </div>
                  <div>
                    <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 md:mb-1">Wellness</p>
                    <p className={`text-[9px] md:text-xs font-black uppercase tracking-tighter ${todayWellness ? 'text-emerald-700' : 'text-slate-400'}`}>
                      {todayWellness ? `LISTO` : 'PENDIENTE'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">{todayWellness ? formatTime(todayWellness.created_at) : '-'}</p>
                </div>
              </div>

              <div className={`p-4 md:p-6 rounded-[24px] md:rounded-[32px] border flex items-center justify-between transition-all duration-500 ${(todayLoadS1 || todayLoadS2) ? 'bg-emerald-50/50 border-emerald-100 shadow-sm' : 'bg-slate-50/50 border-slate-100 shadow-sm'}`}>
                <div className="flex items-center gap-3 md:gap-4">
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center text-lg md:text-xl ${(todayLoadS1 || todayLoadS2) ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                    <i className="fa-solid fa-chart-line"></i>
                  </div>
                  <div>
                    <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 md:mb-1">Carga</p>
                    <div className="flex flex-col">
                      <p className={`text-[8px] md:text-[9px] font-black uppercase tracking-tighter ${todayLoadS1 ? 'text-emerald-700' : 'text-slate-400 opacity-50'}`}>
                        S1: {todayLoadS1 ? `OK` : 'PEND'}
                      </p>
                      <p className={`text-[8px] md:text-[9px] font-black uppercase tracking-tighter ${todayLoadS2 ? 'text-emerald-700' : 'text-slate-400 opacity-50'}`}>
                        S2: {todayLoadS2 ? `OK` : 'PEND'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">
                    {todayLoadS1 ? `S1: ${formatTime(todayLoadS1.created_at)}` : ''}
                    {todayLoadS1 && todayLoadS2 ? <br /> : ''}
                    {todayLoadS2 ? `S2: ${formatTime(todayLoadS2.created_at)}` : ''}
                    {!todayLoadS1 && !todayLoadS2 ? '-' : ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Últimas Evaluaciones Físicas */}
            <div className="bg-white rounded-[32px] md:rounded-[40px] p-6 md:p-8 shadow-sm border border-slate-100">
              <h3 className="text-[10px] md:text-sm font-black text-slate-900 uppercase tracking-[0.2em] mb-4 md:mb-6 flex items-center gap-3">
                <span className="w-1.5 md:w-2 h-5 md:h-6 bg-red-600 rounded-full"></span>
                Últimas Evaluaciones Físicas
              </h3>
              {loadingEvals ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <div className="w-8 h-8 border-4 border-[#CF1B2B] border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Cargando evaluaciones...</span>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* IMTP */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                      <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-700">Fuerza Isométrica - IMTP</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <TachometerGauge {...getGaugeData('imtp_fuerza_n', evalImtp, false, 'Fuerza Máxima (IMTP)', 'N', 'stroke-red-600', 'text-red-600', 3000)} />
                      <TachometerGauge {...getGaugeData('imtp_f_relativa_n_kg', evalImtp, false, 'Fuerza Relativa (IMTP)', 'N/kg', 'stroke-red-600', 'text-red-600', 30)} />
                    </div>
                  </div>

                  {/* CMJ */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-700">Neuromuscular - CMJ</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <TachometerGauge {...getGaugeData('cmj_rsi_mod', evalCmj, false, 'RSI Modificado (CMJ)', 'm/s', 'stroke-blue-600', 'text-blue-600', 1.5)} />
                      <TachometerGauge {...getGaugeData('cmj_altura_salto_im', evalCmj, false, 'Altura Salto (CMJ)', 'cm', 'stroke-blue-600', 'text-blue-600', 40)} />
                    </div>
                  </div>

                  {/* CMJ Rebound */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                      <div className="w-2 h-2 bg-emerald-600 rounded-full animate-pulse"></div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-700">Reactividad - Rebound</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <TachometerGauge {...getGaugeData('rebound_rsi', evalCmjRebound, false, 'RSI Rebound', 'm/s', 'stroke-emerald-600', 'text-emerald-600', 2.0)} />
                      <TachometerGauge {...getGaugeData('rebound_contact_time_ms', evalCmjRebound, true, 'Tiempo Contacto', 'ms', 'stroke-emerald-600', 'text-emerald-600', 300)} />
                    </div>
                  </div>
                </div>

                {/* Sección de Prescripción de Entrenamiento Individualizada */}
                <div className="mt-8 pt-6 border-t border-slate-100">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <i className="fa-solid fa-clipboard-list text-red-600 text-sm"></i>
                      <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-500">
                        Prescripción de Entrenamiento Individualizada
                      </span>
                    </div>
                    {prescriptionData && (
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase border ${prescriptionData.priorityColor}`}>
                        Foco: {prescriptionData.priorityTag}
                      </span>
                    )}
                  </div>

                  {prescriptionData ? (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50/50 rounded-2xl p-4 md:p-6 border border-slate-100">
                      {/* Diagnóstico */}
                      <div className="lg:col-span-5 space-y-2">
                        <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">Diagnóstico de Perfil</p>
                        <h4 className="text-base font-black italic text-slate-900 tracking-tight leading-snug">
                          {prescriptionData.profileTitle}
                        </h4>
                        <p className="text-[11px] leading-relaxed text-slate-600 font-medium">
                          {prescriptionData.profileDesc}
                        </p>
                      </div>

                      {/* Directrices de Trabajo */}
                      <div className="lg:col-span-7 space-y-3">
                        <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">Directrices de Trabajo Recomendadas</p>
                        <div className="space-y-2.5">
                          {prescriptionData.recommendationList.map((rec, index) => {
                            let icon = 'fa-dumbbell';
                            let iconColor = 'text-red-500 bg-red-50';
                            if (rec.includes('CMJ')) {
                              icon = 'fa-person-running';
                              iconColor = 'text-blue-500 bg-blue-50';
                            } else if (rec.includes('Rebound') || rec.includes('Reactividad')) {
                              icon = 'fa-bolt';
                              iconColor = 'text-emerald-500 bg-emerald-50';
                            }

                            return (
                              <div key={index} className="flex gap-3 items-start bg-white p-3 rounded-xl border border-slate-100/80 shadow-sm hover:border-slate-200 transition-all">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${iconColor}`}>
                                  <i className={`fa-solid ${icon} text-xs`}></i>
                                </div>
                                <div className="space-y-0.5">
                                  <p className="text-[11px] font-semibold leading-relaxed text-slate-800">
                                    {rec.split(':')[0]}:
                                  </p>
                                  <p className="text-[11px] leading-relaxed text-slate-600 font-medium">
                                    {rec.split(':').slice(1).join(':').trim()}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 uppercase font-bold text-center py-4">No hay datos de evaluación disponibles para generar la prescripción.</p>
                  )}
                </div>
                </>
              )}
            </div>

            <div className="max-w-xl mx-auto w-full flex flex-col gap-6">
              <div className="bg-white rounded-[32px] md:rounded-[40px] p-6 md:p-8 shadow-sm border border-slate-100 flex-1">
                <h3 className="text-[10px] md:text-sm font-black text-slate-900 uppercase tracking-[0.2em] mb-6 md:mb-8 flex items-center gap-3">
                  <span className="w-1.5 md:w-2 h-5 md:h-6 bg-red-600 rounded-full"></span>
                  Agenda de Hoy
                </h3>
                <div className="space-y-4 md:space-y-6">
                  {loadingActivities ? (
                    <div className="py-10 text-center">
                      <i className="fa-solid fa-spinner fa-spin text-slate-300"></i>
                    </div>
                  ) : realActivities.length > 0 ? (
                    realActivities.map((item, i) => (
                      <div key={i} className="flex gap-3 md:gap-4 group">
                        <div className="flex-1 bg-slate-50 p-3 md:p-4 rounded-xl md:rounded-2xl border border-transparent group-hover:border-slate-200 transition-all">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm md:text-base">
                              {item.actividad.toLowerCase().includes('entrenamiento') ? '⚽' : 
                               item.actividad.toLowerCase().includes('almuerzo') ? '🍽️' :
                               item.actividad.toLowerCase().includes('video') ? '📹' :
                               item.actividad.toLowerCase().includes('wellness') ? '☀️' : '📋'}
                            </span>
                            <span className="text-[9px] md:text-[11px] font-black text-slate-900 uppercase italic tracking-tight">
                              {item.actividad}
                            </span>
                          </div>
                          <p className="text-[7px] md:text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                            {item.observacion || 'Sin observaciones'}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-10 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">No hay actividades programadas</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      case 'reportes_wellness':
        return <div className="w-full max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300"><WellnessForm onSubmit={handleWellnessSubmit} onClose={() => setActiveMenu('inicio')} submitting={submitting} /></div>
      case 'reportes_load':
        return <div className="w-full max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300"><TrainingLoadForm onSubmit={handleLoadSubmit} onClose={() => setActiveMenu('inicio')} submitting={submitting} /></div>
      case 'reportes_match':
        return (
          <div className="w-full max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
            <MatchReportForm onSubmit={handleMatchSubmit} onClose={() => setActiveMenu('inicio')} defaultCategory={player?.category as Category} />
          </div>
        )
      case 'nutricion_antropometria':
        if (!player || nutrition.length === 0) {
          return (
            <div className="w-full max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="bg-white p-12 rounded-[40px] text-center border border-slate-100 shadow-sm">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300 text-3xl">
                  <i className="fa-solid fa-file-circle-exclamation"></i>
                </div>
                <h3 className="text-xl font-black text-slate-900 uppercase italic mb-2">Sin Evaluaciones</h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Aún no tienes registros antropométricos en el sistema central.</p>
              </div>
            </div>
          );
        }
        const latestNutrition = [...nutrition].sort((a, b) => new Date(b.fecha_medicion).getTime() - new Date(a.fecha_medicion).getTime())[0];
        return (
          <div className="w-full max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
            <NutritionReport data={latestNutrition} history={nutrition} player={player} onClose={handleBack} />
          </div>
        );
      case 'nutricion_recomendaciones':
        return (
          <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-[#0b1220] rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
              <div className="relative z-10">
                <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2">Pautas de Rendimiento</h2>
                <p className="text-white/50 text-xs font-bold uppercase tracking-widest">Optimización nutricional para el futbolista de élite</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <RecomendacionCard 
                  title="Hidratación" 
                  icon="fa-droplet" 
                  color="text-blue-500" 
                  bg="bg-blue-50"
                  items={["Beber 500ml de agua 2h antes del entrenamiento", "Consumir bebidas isotónicas durante sesiones > 60 min", "Pesar antes y después para calcular tasa de sudoración"]}
                />
                <RecomendacionCard 
                  title="Pre-Entrenamiento" 
                  icon="fa-bowl-rice" 
                  color="text-amber-500" 
                  bg="bg-amber-50"
                  items={["Carbohidratos de fácil digestión (pasta, arroz blanco)", "Evitar grasas y exceso de fibra 3h antes", "Fruta o barra de cereal 30 min antes"]}
                />
                <RecomendacionCard 
                  title="Recuperación" 
                  icon="fa-battery-full" 
                  color="text-emerald-500" 
                  bg="bg-emerald-50"
                  items={["Proteína de alta calidad (pollo, pescado, huevo) en los primeros 30 min", "Reponer glucógeno con carbohidratos complejos", "Consumir antioxidantes (frutos rojos)"]}
                />
                <RecomendacionCard 
                  title="Suplementación" 
                  icon="fa-pills" 
                  color="text-indigo-500" 
                  bg="bg-indigo-50"
                  items={["Creatina monohidratada (según pauta)", "Whey protein si no se llega al requerimiento proteico", "Vitamina D en meses de baja exposición solar"]}
                />
              </div>
              <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <i className="fa-solid fa-triangle-exclamation text-red-500"></i>
                  PROHIBIDOS 🚫
                </h3>
                <ul className="space-y-4">
                  {["Bebidas azucaradas y gaseosas", "Alimentos ultra-procesados", "Frituras y grasas trans", "Alcohol (afecta síntesis proteica)", "Exceso de cafeína post-18:00"].map((item, i) => (
                    <li key={i} className="flex gap-3 text-[11px] font-bold text-slate-400 uppercase tracking-tight">
                      <span className="text-red-500">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-10 p-6 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                  <p className="text-[10px] font-bold text-slate-500 italic leading-relaxed text-center">
                    "La nutrición es el entrenamiento invisible. Lo que comes hoy es tu energía de mañana."
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      case 'nutricion_formularios':
        return (
          <div className="w-full max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-white p-12 rounded-[40px] text-center border border-slate-100 shadow-sm">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300 text-3xl">
                <i className="fa-solid fa-clipboard-question"></i>
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase italic mb-2">Formularios de Nutrición</h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-8">Encuestas de hábitos y frecuencia de consumo</p>
              
              <div className="space-y-4">
                <NutritionFormButton 
                  title="Frecuencia de Consumo (FFQ)" 
                  description="Evaluación de hábitos semanales"
                  onClick={() => alert("Formulario FFQ próximamente disponible")}
                />
                <NutritionFormButton 
                  title="Encuesta de Hidratación" 
                  description="Control de ingesta de líquidos"
                  onClick={() => alert("Formulario de Hidratación próximamente disponible")}
                />
                <NutritionFormButton 
                  title="Recordatorio 24 Horas" 
                  description="Registro detallado de ingesta diaria"
                  onClick={() => alert("Formulario 24h próximamente disponible")}
                />
              </div>
            </div>
          </div>
        );
      case 'nutricion_chef':
        return <ChefAssistant />;
      case 'perfil_jugador':
        return (
          <div className="w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
            <PlayerProfileArea 
              userRole="player"
              initialPlayerId={player?.player_id}
              clubs={dbClubs}
            />
          </div>
        );
      case 'huella_atleta':
        return (
          <div className="w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
            <PlayerProfileArea 
              userRole="player"
              initialPlayerId={player?.player_id}
              clubs={dbClubs}
              initialTab="huella"
            />
          </div>
        );
      case 'gym_trainer':
        return <AITrainer player={player} />;
      case 'perfil':
        return (
          <div className="w-full max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-white rounded-[32px] md:rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
              <div className="bg-[#0b1220] p-6 md:p-10 text-white">
                <h3 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter leading-none">Mi Perfil Técnico</h3>
                <p className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Gestiona tus datos personales y deportivos</p>
              </div>
              <form onSubmit={handleProfileUpdate} className="p-6 md:p-10 space-y-6 md:space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nombre</label>
                    <input 
                      required
                      type="text" 
                      value={profileData.nombre || ''}
                      onChange={e => setProfileData(prev => ({ ...prev, nombre: e.target.value }))}
                      className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl px-5 md:px-6 py-3.5 md:py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Apellido 1</label>
                    <input 
                      required
                      type="text" 
                      value={profileData.apellido1 || ''}
                      onChange={e => setProfileData(prev => ({ ...prev, apellido1: e.target.value }))}
                      className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl px-5 md:px-6 py-3.5 md:py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Apellido 2</label>
                    <input 
                      type="text" 
                      value={profileData.apellido2 || ''}
                      onChange={e => setProfileData(prev => ({ ...prev, apellido2: e.target.value }))}
                      className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl px-5 md:px-6 py-3.5 md:py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Club</label>
                    <select 
                      value={isOtherClub ? 'OTRO' : (profileData.club || '')}
                      onChange={e => {
                        if (e.target.value === 'OTRO') {
                          setIsOtherClub(true);
                        } else {
                          setIsOtherClub(false);
                          setProfileData(prev => ({ ...prev, club: e.target.value }));
                        }
                      }}
                      className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl px-5 md:px-6 py-3.5 md:py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="">Seleccionar Club</option>
                      {CLUBS.map(c => <option key={c} value={c}>{c}</option>)}
                      <option value="OTRO">+ OTRO / NO APARECE</option>
                    </select>
                  </div>
                  {isOtherClub && (
                    <div className="space-y-1.5 md:space-y-2 animate-in slide-in-from-top-2 duration-300">
                      <label className="text-[9px] md:text-[10px] font-black text-red-500 uppercase tracking-widest ml-2">Escribe el nombre de tu Club</label>
                      <input 
                        required
                        type="text" 
                        placeholder="Ej: Universidad de Concepción"
                        value={customClub}
                        onChange={e => setCustomClub(e.target.value)}
                        className="w-full bg-red-50 border border-red-100 rounded-xl md:rounded-2xl px-5 md:px-6 py-3.5 md:py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  )}
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Posición</label>
                    <select 
                      value={profileData.position || ''}
                      onChange={e => setProfileData(prev => ({ ...prev, position: e.target.value }))}
                      className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl px-5 md:px-6 py-3.5 md:py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="">Seleccionar Posición</option>
                      {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Fecha Nacimiento</label>
                    <input 
                      type="date" 
                      value={profileData.fecha_nacimiento || ''}
                      onChange={e => setProfileData(prev => ({ ...prev, fecha_nacimiento: e.target.value }))}
                      className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl px-5 md:px-6 py-3.5 md:py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Celular</label>
                    <input 
                      type="text" 
                      placeholder="+5691234567"
                      value={profileData.celular || ''}
                      onChange={e => setProfileData(prev => ({ ...prev, celular: e.target.value }))}
                      className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl px-5 md:px-6 py-3.5 md:py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 md:py-5 rounded-xl md:rounded-2xl bg-[#CF1B2B] text-white font-black uppercase tracking-widest text-[10px] hover:bg-red-700 transition-all shadow-xl shadow-red-900/20 disabled:opacity-50"
                >
                  {submitting ? 'ACTUALIZANDO...' : 'ACTUALIZAR MI PERFIL'}
                </button>
              </form>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50 relative">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className={`${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 transition-transform duration-300`}>
        <PlayerSidebar 
          activeMenu={activeMenu} 
          onMenuChange={(id) => {
            setActiveMenu(id);
            setIsMobileMenuOpen(false);
          }} 
          isCollapsed={isSidebarCollapsed} 
          setIsCollapsed={setIsSidebarCollapsed} 
          onRefresh={onRefresh}
          refreshing={refreshing}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />
      </div>
      
      <main className="flex-1 min-h-screen overflow-y-auto w-full bg-slate-50">
        <div className="bg-white px-4 md:px-8 py-3 md:py-4 border-b border-slate-200 flex justify-between items-center sticky top-0 z-[60] shadow-sm">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden w-10 h-10 flex items-center justify-center text-white bg-[#0b1220] rounded-xl transition-all shadow-lg active:scale-95"
            >
              <i className="fa-solid fa-bars"></i>
            </button>
            {activeMenu !== 'inicio' && (
              <button onClick={handleBack} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-600 transition-all">
                <i className="fa-solid fa-arrow-left"></i>
              </button>
            )}
            <h2 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-widest truncate max-w-[150px] md:max-w-none">
              {activeMenu === 'inicio' ? 'Dashboard' : activeMenu.split('_').join(' ')}
            </h2>
          </div>
          <div className="flex items-center gap-3 md:gap-6">
            {onRefresh && (
              <button 
                onClick={onRefresh}
                disabled={refreshing}
                title="Sincronizar datos"
                className={`w-10 h-10 flex lg:hidden items-center justify-center rounded-xl transition-all ${refreshing ? 'bg-slate-100 text-slate-400' : 'bg-slate-50 text-[#CF1B2B] hover:bg-[#0b1220] hover:text-white shadow-sm'}`}
              >
                <i className={`fa-solid fa-arrows-rotate ${refreshing ? 'animate-spin' : ''}`}></i>
              </button>
            )}
            <button onClick={async () => { if (onSignOut) { onSignOut(); } else { await supabase.auth.signOut(); } }} className="text-slate-500 hover:text-red-500 transition-colors p-2 text-xl" title="Cerrar sesión">
              <i className="fa-solid fa-arrow-right-from-bracket"></i>
            </button>
          </div>
        </div>

        <div className="p-4 md:p-8">
          {Object.keys(visitedMenus).map((menuId) => {
            const isVisible = activeMenu === menuId;
            return (
              <div
                key={menuId}
                style={{ display: isVisible ? 'block' : 'none' }}
              >
                {renderComponentById(menuId as PlayerMenuId)}
              </div>
            );
          })}
        </div>
      </main>

      {/* Success Modal */}
      {successModalConfig.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#0b1220]/90 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-10 text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-inner">
              <i className="fa-solid fa-check"></i>
            </div>
            <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter mb-2">{successModalConfig.title}</h3>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-8">{successModalConfig.subtitle}</p>
            <button 
              onClick={() => {
                setSuccessModalConfig(prev => ({ ...prev, show: false }));
                setActiveMenu('inicio');
              }}
              className="w-full py-5 bg-[#0b1220] text-white rounded-[24px] text-xs font-black uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all active:scale-95"
            >
              Volver al Inicio
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function RecomendacionCard({ title, icon, color, bg, items }: { title: string, icon: string, color: string, bg: string, items: string[] }) {
  return (
    <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-xl transition-all">
      <div className="flex items-center gap-4 mb-6">
        <div className={`w-12 h-12 ${bg} ${color} rounded-2xl flex items-center justify-center text-xl shadow-inner`}>
          <i className={`fa-solid ${icon}`}></i>
        </div>
        <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tighter leading-none">{title}</h3>
      </div>
      <ul className="space-y-4">
        {items.map((item, i) => (
          <li key={i} className="flex gap-3 text-xs font-bold text-slate-500 leading-relaxed">
            <span className="text-red-500 mt-1">•</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ActionCard({ icon, iconColor, iconBg, title, subtitle, onClick }: { 
  icon: string, iconColor: string, iconBg: string, title: string, subtitle: string, onClick: () => void 
}) {
  return (
    <button onClick={onClick} className="w-full bg-white p-5 md:p-8 rounded-[28px] md:rounded-[40px] shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-2xl hover:scale-[1.02] transition-all group active:scale-[0.98]">
      <div className="flex items-center gap-4 md:gap-6">
        <div className={`w-10 h-10 md:w-14 md:h-14 ${iconBg} ${iconColor} rounded-xl md:rounded-[20px] flex items-center justify-center text-base md:text-xl shadow-inner`}><i className={`fa-solid ${icon}`}></i></div>
        <div className="text-left">
          <h4 className="text-[10px] md:text-sm font-black text-slate-900 uppercase italic tracking-tighter leading-none mb-1 group-hover:text-red-600 transition-colors">{title}</h4>
          <p className="text-[7px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest">{subtitle}</p>
        </div>
      </div>
      <i className="fa-solid fa-chevron-right text-[8px] md:text-xs text-slate-200 group-hover:text-slate-900 transition-all"></i>
    </button>
  )
}

function NutritionFormButton({ title, description, onClick }: { title: string, description: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="w-full p-4 md:p-6 bg-slate-50 rounded-xl md:rounded-2xl border border-slate-100 flex items-center justify-between group hover:bg-red-50 hover:border-red-100 transition-all"
    >
      <div className="text-left">
        <span className="text-xs md:text-sm font-black text-slate-900 uppercase italic group-hover:text-red-600 block mb-1">{title}</span>
        <span className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{description}</span>
      </div>
      <i className="fa-solid fa-arrow-right text-[10px] md:text-base text-slate-300 group-hover:text-red-500"></i>
    </button>
  );
}

export default PlayerDashboard;
