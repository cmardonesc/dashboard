import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { AthletePerformanceRecord, Category } from '../types';

interface TelegramNotificationsAreaProps {
  performanceRecords: AthletePerformanceRecord[];
}

type EventType =
  | 'wellness_checkin'
  | 'internal_load'
  | 'lesion_insert'
  | 'lesion_update'
  | 'medical_report'
  | 'new_player'
  | 'desconvocatorias'
  | 'tareas_semanales'
  | 'citaciones'
  | 'match_reports'
  | 'cronograma'
  | 'profiles_insert';

export const TelegramNotificationsArea: React.FC<TelegramNotificationsAreaProps> = ({ performanceRecords }) => {
  const [activeTab, setActiveTab] = useState<'monitor' | 'sql' | 'function'>('monitor');
  const [selectedEvent, setSelectedEvent] = useState<EventType>('wellness_checkin');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // --- Real Players for Selecting in Simulator ---
  const playersList = useMemo(() => {
    return performanceRecords
      .map((r) => r.player)
      .filter((p) => p.player_id !== undefined);
  }, [performanceRecords]);

  // --- State for Sandbox Simulator Fields ---
  const [selectedPlayerId, setSelectedPlayerId] = useState<number>(() => {
    return playersList[0]?.player_id || 1;
  });

  const selectedPlayerObj = useMemo<any>(() => {
    return playersList.find((p) => p.player_id === Number(selectedPlayerId)) || playersList[0] || {
      nombre: 'Julian',
      apellido1: 'Alvarez',
      club: 'Audax Italiano',
      posicion: 'Delantero',
      categoria: 'sub_20',
      anio: 2006
    };
  }, [playersList, selectedPlayerId]);

  // Wellness State Fields
  const [fatigue, setFatigue] = useState(4);
  const [sleep, setSleep] = useState(3);
  const [stress, setStress] = useState(2);
  const [soreness, setSoreness] = useState(1);
  const [wellnessNotes, setWellnessNotes] = useState('Leve sobrecarga isquios');
  const [wellnessEnfermedad, setWellnessEnfermedad] = useState('Ninguna (Sano)');

  // Internal Load Fields
  const [rpe, setRpe] = useState(7);
  const [duration, setDuration] = useState(75);
  const [sessionType, setSessionType] = useState('FIELD');
  const [loadNotes, setLoadNotes] = useState('Sesión táctica alta intensidad');
  const [loadEnfermedad, setLoadEnfermedad] = useState('Ninguna (Sano)');

  // Injury Fields
  const [diagnostico, setDiagnostico] = useState('Esguince tobillo grado II');
  const [injuryLocation, setInjuryLocation] = useState('Tobillo Izquierdo');
  const [injurySeverity, setInjurySeverity] = useState('Medio');
  const [injuryStatus, setInjuryStatus] = useState('Duda para Finde');
  const [injuryControlDate, setInjuryControlDate] = useState('2026-06-10');

  // Medical Report Fields
  const [medicalObservation, setMedicalObservation] = useState('Kinesiología dos jornadas diarias');
  const [medicalDiagnostic, setMedicalDiagnostic] = useState('Desgarro miofascial aductor corto');
  const [medicalSeverity, setMedicalSeverity] = useState('Alta');
  const [medicalTreatment, setMedicalTreatment] = useState('Crioterapia + Fortalecimiento excéntrico');

  // New Player Fields
  const [newPlayerName, setNewPlayerName] = useState('Benjamín');
  const [newPlayerLastName, setNewPlayerLastName] = useState('Villanueva');
  const [newPlayerBirthYear, setNewPlayerBirthYear] = useState(2008);
  const [newPlayerPosition, setNewPlayerPosition] = useState('Mediocampista');
  const [newPlayerClub, setNewPlayerClub] = useState('Colo-Colo');

  // Desconvocatoria Fields
  const [desconvocatoriaReason, setDesconvocatoriaReason] = useState('Desgarro de bíceps femoral derecho');
  const [desconvocatoriaDate, setDesconvocatoriaDate] = useState('2026-06-05');

  // Tarea Semanal Fields
  const [tareaNombre, setTareaNombre] = useState('Estabilidad & Transiciones 3vs3');
  const [tareaDinamica, setTareaDinamica] = useState('Bloques de 4 minutos intermitente');
  const [tareaJornada, setTareaJornada] = useState('AM');
  const [tareaObservacion, setTareaObservacion] = useState('Controlar tiempo de pausa estricto');

  // Citacion Fields
  const [citacionDate, setCitacionDate] = useState('2026-06-08');
  const [citacionMicrocycle, setCitacionMicrocycle] = useState('MC-Sub17-2026-02');
  const [citacionCategory, setCitacionCategory] = useState('SUB_17');

  // Match Report Fields
  const [matchRival, setMatchRival] = useState('O\'Higgins Sub-17');
  const [matchResult, setMatchResult] = useState('Chile 2 - 1 O\'Higgins');
  const [matchMinsPlayed, setMatchMinsPlayed] = useState(90);
  const [matchRpe, setMatchRpe] = useState(8);
  const [matchMolestias, setMatchMolestias] = useState('Ninguna');
  const [matchEnfermedad, setMatchEnfermedad] = useState('Ninguna (Sano)');

  // Cronograma Fields
  const [cronoFecha, setCronoFecha] = useState('2026-06-06');
  const [cronoHora, setCronoHora] = useState('09:30');
  const [cronoActividad, setCronoActividad] = useState('Video Análisis Técnico');
  const [cronoLugar, setCronoLugar] = useState('Auditorio Principal JPD');

  // New Profile Fields
  const [newProfileEmail, setNewProfileEmail] = useState('cpozo@anfpchile.cl');
  const [newProfileRole, setNewProfileRole] = useState('staff');
  const [newProfileClub, setNewProfileClub] = useState('Federación');

  // Simulated Log Console for developers
  const [simulationLogs, setSimulationLogs] = useState<string[]>([
    'Iniciando consola de logs de simulación para Telegram notifications API...',
    'Listo para recibir peticiones.'
  ]);

  const handleCopy = (text: string, title: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(title);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const addLog = (msg: string) => {
    setSimulationLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 15));
  };

  // --- Simulate Triggers and Edge Function execution ---
  const triggerSimulation = () => {
    addLog(`POST a /functions/v1/telegram-notifications con payload de evento: ${selectedEvent}`);
    addLog(`Identificando jugador ID: ${selectedPlayerId} (${selectedPlayerObj.nombre} ${selectedPlayerObj.apellido1 || ''}) ...`);
    
    setTimeout(() => {
      addLog(`API Telegram Bot responde exitosamente [200 OK]`);
      addLog(`Mensaje enviado al grupo Chat ID -5131882686 ("La Roja Performance")`);
    }, 850);
  };

  // --- Compute Exact Telegram Format HTML based on Selected Option ---
  const telegramMessageHtml = useMemo(() => {
    const pName = `${selectedPlayerObj.nombre || ''} ${selectedPlayerObj.apellido1 || ''}`.trim();
    const pClub = selectedPlayerObj.club || selectedPlayerObj.club_name || 'Sin Club';

    switch (selectedEvent) {
      case 'wellness_checkin':
        return `✅ <b>Check-in Wellness de Selección</b>\n\n👤 <b>Jugador:</b> ${pName}\n🛡️ <b>Club:</b> ${pClub}\n📊 <b>Fatiga:</b> ${fatigue}/5\n💤 <b>Sueño:</b> ${sleep}/5\n⚡ <b>Estrés:</b> ${stress}/5\n🤕 <b>Soreness/Dolor:</b> ${soreness}/5\n🩹 <b>Zonas Molestias:</b> ${wellnessNotes || 'Ninguna'}\n🤒 <b>Estado de Salud / Síntomas:</b> ${wellnessEnfermedad || 'Ninguno (Sano)'}\n\n📍 <i>Complejo Juan Pinto Durán</i>`;
      
      case 'internal_load':
        const sRPE = Number(rpe) * Number(duration);
        return `📊 <b>Nuevo Checkout - Carga Interna</b>\n\n👤 <b>Jugador:</b> ${pName}\n🏃‍♂️ <b>Sesión:</b> ${sessionType}\n⏱️ <b>Duración:</b> ${duration} minutos\n📈 <b>RPE Esfuerzo:</b> ${rpe}/10\n🔋 <b>Carga (sRPE):</b> ${sRPE} u.a.\n🩹 <b>Zonas Molestias:</b> ${loadNotes || 'Ninguna'}\n🤒 <b>Estado de Salud / Síntomas:</b> ${loadEnfermedad || 'Ninguno (Sano)'}`;
      
      case 'lesion_insert':
        return `🚨 <b>Nueva Lesión Diagnosticada</b>\n\n👤 <b>Jugador:</b> ${pName}\n🩺 <b>Diagnóstico:</b> ${diagnostico}\n🩹 <b>Localización:</b> ${injuryLocation}\n⚠️ <b>Gravedad:</b> ${injurySeverity}\n🚫 <b>Disponibilidad:</b> No Disponible 🔴`;
      
      case 'lesion_update':
        return `🔄 <b>Actualización de Lesión en Curso</b>\n\n👤 <b>Jugador:</b> ${pName}\n📈 <b>Estado clínico:</b> ${injuryStatus}\n🗓️ <b>Fecha Estimada Retorno:</b> ${injuryControlDate}\n🩹 <b>Diagnóstico:</b> ${diagnostico}`;
      
      case 'medical_report':
        return `🩺 <b>Atención Médica Diaria Solicitada</b>\n\n👤 <b>Jugador:</b> ${pName}\n🏥 <b>Diagnóstico Médico:</b> ${medicalDiagnostic}\n🩹 <b>Gravedad:</b> ${medicalSeverity}\n🛠️ <b>Tratamiento aplicado:</b> ${medicalTreatment}\n📝 <b>Observación:</b> ${medicalObservation}`;
      
      case 'new_player':
        return `🆕 <b>Nuevo Jugador Registrado en Sistema</b>\n\n👤 <b>Nombre completo:</b> ${newPlayerName} ${newPlayerLastName}\n📅 <b>Año Nacimiento:</b> ${newPlayerBirthYear}\n🏃‍♂️ <b>Posición:</b> ${newPlayerPosition}\n🏢 <b>Club procedencia:</b> ${newPlayerClub}`;
      
      case 'desconvocatorias':
        return `🔴 <b>Jugador Desconvocado de la Nómina</b>\n\n👤 <b>Jugador:</b> ${pName}\n🚫 <b>Motivo:</b> ${desconvocatoriaReason}\n📅 <b>Fecha efectiva:</b> ${desconvocatoriaDate}`;
      
      case 'tareas_semanales':
        return `📋 <b>Ficha de Tarea Semanal Creada</b>\n\n🎯 <b>Tarea:</b> ${tareaNombre}\n📊 <b>Dinámica:</b> ${tareaDinamica}\n🗓️ <b>Jornada:</b> ${tareaJornada}\n📝 <b>Notas:</b> ${tareaObservacion}`;
      
      case 'citaciones':
        return `📣 <b>Nueva Citación al Microciclo Generada</b>\n\n👤 <b>Jugador:</b> ${pName}\n🔰 <b>Categoría SBS:</b> ${citacionCategory}\n⚙️ <b>Microciclo ID:</b> ${citacionMicrocycle}\n📅 <b>Fecha citación:</b> ${citacionDate}`;
      
      case 'match_reports':
        return `🏆 <b>Reporte de Competencia Finalizado</b>\n\n👤 <b>Jugador:</b> ${pName}\n⚔️ <b>Rival:</b> ${matchRival}\n📊 <b>Resultado:</b> ${matchResult}\n⏱️ <b>Minutos en cancha:</b> ${matchMinsPlayed} min\n📈 <b>RPE:</b> ${matchRpe}/10\n🩹 <b>Zonas Molestias:</b> ${matchMolestias || 'Ninguna'}\n🤒 <b>Estado de Salud / Síntomas:</b> ${matchEnfermedad || 'Ninguno (Sano)'}`;
      
      case 'cronograma':
        return `🗓️ <b>Actividad Añadida al Cronograma Técnico</b>\n\n📅 <b>Día:</b> ${cronoFecha}\n⏰ <b>Hora:</b> ${cronoHora} horas\n⚡ <b>Actividad:</b> ${cronoActividad}\n🏢 <b>Lugar:</b> ${cronoLugar}`;
      
      case 'profiles_insert':
        return `👤 <b>Nuevo Perfil de Usuario con Acceso</b>\n\n📧 <b>Email:</b> ${newProfileEmail}\n🔑 <b>Rol Asignado:</b> ${newProfileRole.toUpperCase()}\n🏢 <b>Enlace de Club:</b> ${newProfileClub}\n⏰ <i>Registrado y autenticado vía Supabase Auth</i>`;
      
      default:
        return 'Notificación no especificada';
    }
  }, [
    selectedEvent,
    selectedPlayerObj,
    fatigue,
    sleep,
    stress,
    soreness,
    wellnessNotes,
    wellnessEnfermedad,
    rpe,
    duration,
    sessionType,
    loadNotes,
    loadEnfermedad,
    diagnostico,
    injuryLocation,
    injurySeverity,
    injuryStatus,
    injuryControlDate,
    medicalObservation,
    medicalDiagnostic,
    medicalSeverity,
    medicalTreatment,
    newPlayerName,
    newPlayerLastName,
    newPlayerBirthYear,
    newPlayerPosition,
    newPlayerClub,
    desconvocatoriaReason,
    desconvocatoriaDate,
    tareaNombre,
    tareaDinamica,
    tareaJornada,
    tareaObservacion,
    citacionDate,
    citacionMicrocycle,
    citacionCategory,
    matchRival,
    matchResult,
    matchMinsPlayed,
    matchRpe,
    matchMolestias,
    matchEnfermedad,
    cronoFecha,
    cronoHora,
    cronoActividad,
    cronoLugar,
    newProfileEmail,
    newProfileRole,
    newProfileClub
  ]);

  // --- SQL TRIGGER SCRIPT ---
  const sqlTriggerScript = `-- ==========================================
-- DISPARADOR GENÉRICO DE TELEGRAM NOTIFICATIONS
-- PLATAFORMA: larojaperformance.com
-- PROYECTO: nqdbqqmjyygopjnpqyvm
-- ==========================================

-- 1. Asegurar extensión pg_net habilitada para llamadas HTTP
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- 2. Función dispatcher para llamar la Edge function de Supabase
CREATE OR REPLACE FUNCTION public.notify_telegram()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  table_name TEXT;
  event_type TEXT;
  record_data JSONB;
BEGIN
  table_name := TG_TABLE_NAME;
  event_type := TG_OP;
  
  IF (event_type = 'DELETE') THEN
    record_data := row_to_json(OLD)::jsonb;
  ELSE
    record_data := row_to_json(NEW)::jsonb;
  END IF;

  payload := jsonb_build_object(
    'type', event_type,
    'table', table_name,
    'record', record_data
  );

  BEGIN
    PERFORM
      net.http_post(
        'https://nqdbqqmjyygopjnpqyvm.supabase.co/functions/v1/telegram-notifications'::text,
        payload::jsonb,
        '{}'::jsonb,
        jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || 'TU_ANON_KEY_O_SERVICE_ROLE'
        )::jsonb,
        5000::integer
      );
  EXCEPTION WHEN OTHERS THEN
    -- Resiliencia: Que un error de red o timeout no desmorone la transacción en curso
    RAISE WARNING 'La Roja Telegram dispatch falló: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Crear disparadores SQL para cada una de las 11 tablas

-- Evento 1: Check-in Wellness (wellness_checkin)
DROP TRIGGER IF EXISTS trg_telegram_wellness ON public.wellness_checkin;
DROP TRIGGER IF EXISTS on_wellness_inserted ON public.wellness_checkin;
CREATE TRIGGER trg_telegram_wellness
AFTER INSERT ON public.wellness_checkin
FOR EACH ROW EXECUTE FUNCTION public.notify_telegram();

-- Evento 2: Carga Interna (internal_load)
DROP TRIGGER IF EXISTS trg_telegram_internal_load ON public.internal_load;
DROP TRIGGER IF EXISTS on_load_inserted ON public.internal_load;
CREATE TRIGGER trg_telegram_internal_load
AFTER INSERT ON public.internal_load
FOR EACH ROW EXECUTE FUNCTION public.notify_telegram();

-- Evento 3: Lesiones (lesionados)
DROP TRIGGER IF EXISTS trg_telegram_lesionADOS ON public.lesionados;
DROP TRIGGER IF EXISTS trg_telegram_lesionados ON public.lesionados;
CREATE TRIGGER trg_telegram_lesionADOS
AFTER INSERT OR UPDATE ON public.lesionados
FOR EACH ROW EXECUTE FUNCTION public.notify_telegram();

-- Evento 4: Atención Médica (medical_daily_reports)
DROP TRIGGER IF EXISTS trg_telegram_medical ON public.medical_daily_reports;
DROP TRIGGER IF EXISTS on_medical_report_inserted ON public.medical_daily_reports;
CREATE TRIGGER trg_telegram_medical
AFTER INSERT ON public.medical_daily_reports
FOR EACH ROW EXECUTE FUNCTION public.notify_telegram();

-- Evento 5: Nuevo Jugador (players)
DROP TRIGGER IF EXISTS trg_telegram_players ON public.players;
CREATE TRIGGER trg_telegram_players
AFTER INSERT ON public.players
FOR EACH ROW EXECUTE FUNCTION public.notify_telegram();

-- Evento 6: Jugador Desconvocado (desconvocatorias)
DROP TRIGGER IF EXISTS trg_telegram_desconvocatorias ON public.desconvocatorias;
CREATE TRIGGER trg_telegram_desconvocatorias
AFTER INSERT ON public.desconvocatorias
FOR EACH ROW EXECUTE FUNCTION public.notify_telegram();

-- Evento 7: Tarea Semanal (tareas_semanales)
DROP TRIGGER IF EXISTS trg_telegram_tareas ON public.tareas_semanales;
CREATE TRIGGER trg_telegram_tareas
AFTER INSERT ON public.tareas_semanales
FOR EACH ROW EXECUTE FUNCTION public.notify_telegram();

-- Evento 8: Jugador Citado (citaciones)
DROP TRIGGER IF EXISTS trg_telegram_citaciones ON public.citaciones;
CREATE TRIGGER trg_telegram_citaciones
AFTER INSERT ON public.citaciones
FOR EACH ROW EXECUTE FUNCTION public.notify_telegram();

-- Evento 9: Reporte Competencia (match_reports)
DROP TRIGGER IF EXISTS trg_telegram_match_reports ON public.match_reports;
CREATE TRIGGER trg_telegram_match_reports
AFTER INSERT ON public.match_reports
FOR EACH ROW EXECUTE FUNCTION public.notify_telegram();

-- Evento 10: Cronograma Diario (cronograma_semanal)
DROP TRIGGER IF EXISTS trg_telegram_crono ON public.cronograma_semanal;
CREATE TRIGGER trg_telegram_crono
AFTER INSERT ON public.cronograma_semanal
FOR EACH ROW EXECUTE FUNCTION public.notify_telegram();

-- Evento 11: Nuevo Usuario (profiles)
DROP TRIGGER IF EXISTS trg_telegram_profiles ON public.profiles;
CREATE TRIGGER trg_telegram_profiles
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.notify_telegram();
`;

  // --- DENO EDGE FUNCTION CODE ---
  const edgeFunctionSource = `// ==========================================
// SUPABASE EDGE FUNCTION: "telegram-notifications"
// ubicaciòn: /functions/telegram-notifications/index.ts
// Runtime: Deno / TypeScript
// ==========================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID") || "-5131882686";

  if (!BOT_TOKEN) {
    return new Response(JSON.stringify({ error: "Missing TELEGRAM_BOT_TOKEN secret" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { type, table, record } = await req.json();

    let text = "";
    let playerName = "Atleta";
    let playerClub = "Origen";

    // Lookup de jugador si tiene player_id
    if (record && record.player_id) {
      const { data: player } = await supabase
        .from("players")
        .select("nombre, apellido1, club")
        .eq("player_id", record.player_id)
        .maybeSingle();

      if (player) {
         playerName = \`\${player.nombre} \${player.apellido1}\`;
         playerClub = player.club || "Sin Club";
      }
    }

    if (table === "wellness_checkin" && type === "INSERT") {
      text = \`✅ <b>Check-in Wellness de Selección</b>\\n\\n👤 <b>Jugador:</b> \${playerName}\\n🛡️ <b>Club:</b> \${playerClub}\\n📊 <b>Fatiga:</b> \·\${record.fatigue || 0}/5\\n💤 <b>Sueño:</b> \·\${record.sleep_quality || 0}/5\\n⚡ <b>Estrés:</b> \·\${record.stress || 0}/5\\n🤕 <b>Dolor:</b> \·\${record.soreness || 0}/5\\n🩹 <b>Zonas Molestias:</b> \·\${record.molestias || "Ninguna"}\\n🤒 <b>Estado de Salud / Síntomas:</b> \·\${record.enfermedad || "Ninguno (Sano)"}\\n\\n📍 <i>Complejo Juan Pinto Durán</i>\`;
    } 
    else if (table === "internal_load" && type === "INSERT") {
      const sRpe = (record.rpe || 0) * (record.duration_min || 0);
      text = \`📊 <b>Nuevo Checkout - Carga Interna</b>\\n\\n👤 <b>Jugador:</b> \·\${playerName}\\n🏃‍♂️ <b>Sesión:</b> \·\${record.type || "FIELD"}\\n⏱️ <b>Duración:</b> \·\${record.duration_min || 0} minutos\\n📈 <b>RPE:</b> \·\${record.rpe || 0}/10\\n🔋 <b>Carga:</b> \·\${sRpe} u.a.\\n🩹 <b>Zonas Molestias:</b> \·\${record.molestias || "Ninguna"}\\n🤒 <b>Estado de Salud / Síntomas:</b> \·\${record.enfermedad || "Ninguno (Sano)"}\`;
    } 
    else if (table === "lesionados" && type === "INSERT") {
      text = \`🚨 <b>Nueva Lesión Diagnosticada</b>\\n\\n👤 <b>Jugador:</b> \${playerName}\\n🩺 <b>Diagnóstico:</b> \${record.diagnostico_clinico || "S/D"}\\n🩹 <b>Localización:</b> \${record.localizacion || "S/D"}\\n⚠️ <b>Gravedad:</b> \${record.disponibilidad || "Moderado"}\\n🚫 <b>Disponibilidad:</b> No Disponible 🔴\`;
    }
    else if (table === "lesionados" && type === "UPDATE") {
      text = \`🔄 <b>Actualización de Lesión en Curso</b>\\n\\n👤 <b>Jugador:</b> \${playerName}\\n📈 <b>Estado clínico:</b> \${record.estado || "Baja"}\\n🗓️ <b>Fecha Estimada Retorno:</b> \${record.fecha_estimada_retorno || "A confirmar"}\\n🩹 <b>Diagnóstico:</b> \${record.diagnostico_clinico || "S/D"}\`;
    }
    else if (table === "medical_daily_reports" && type === "INSERT") {
      text = \`🩺 <b>Atención Médica Diaria Solicitada</b>\\n\\n👤 <b>Jugador:</b> \${playerName}\\n🏥 <b>Diagnóstico Médico:</b> \${record.diagnostico_medico || "S/D"}\\n🩹 <b>Gravedad:</b> \${record.severity || "Media"}\\n📝 <b>Observación:</b> \${record.observation || ""}\`;
    }
    else if (table === "players" && type === "INSERT") {
      text = \`🆕 <b>Nuevo Jugador Registrado en Sistema</b>\\n\\n👤 <b>Nombre completo:</b> \·\${record.nombre} \${record.apellido1}\\n📅 <b>Año Nacimiento:</b> \${record.anio || "S/A"}\\n🏃‍♂️ <b>Posición:</b> \${record.posicion || "S/D"}\\n🏢 <b>Club procedencia:</b> \${record.club || ""}\`;
    }
    else if (table === "desconvocatorias" && type === "INSERT") {
       text = \`🔴 <b>Jugador Desconvocado de la Nómina</b>\\n\\n👤 <b>Jugador:</b> \${playerName}\\n🚫 <b>Motivo:</b> \${record.motivo || "Decisión técnica"}\\n📅 <b>Fecha efectiva:</b> \${record.fecha || ""}\`;
    }
    else if (table === "tareas_semanales" && type === "INSERT") {
       text = \`📋 <b>Ficha de Tarea Semanal Creada</b>\\n\\n🎯 <b>Tarea:</b> \${record.nombre}\\n📊 <b>Dinámica:</b> \${record.dinamica || ""}\\n🗓️ <b>Jornada:</b> \${record.jornada || "AM"}\\n📝 <b>Notas:</b> \${record.observacion || ""}\`;
    }
    else if (table === "citaciones" && type === "INSERT") {
       text = \`📣 <b>Nueva Citación al Microciclo Generada</b>\\n\\n👤 <b>Jugador:</b> \${playerName}\\n⚙️ <b>Fecha citación:</b> \${record.fecha || ""}\\n📋 <b>Motivo:</b> \${record.motivo || "Entrenamiento"}\`;
    }
    else if (table === "match_reports" && type === "INSERT") {
       text = \`🏆 <b>Reporte de Competencia Finalizado</b>\\n\\n👤 <b>Jugador:</b> \${playerName}\\n⚔️ <b>Rival:</b> \${record.rival || "S/D"}\\n📊 <b>Resultado:</b> \${record.resultado || "A cargo"}\\n⏱️ <b>Minutos en cancha:</b> \${record.minutos_jugados || 0} min\\n📈 <b>RPE:</b> \${record.rpe || 0}/10\\n🩹 <b>Zonas Molestias:</b> \${record.molestias || "Ninguna"}\\n🤒 <b>Estado de Salud / Síntomas:</b> \·\${record.enfermedad || "Ninguno (Sano)"}\`;
    }
    else if (table === "cronograma_semanal" && type === "INSERT") {
       text = \`🗓️ <b>Actividad Añadida al Cronograma Técnico</b>\\n\\n📅 <b>Día:</b> \${record.fecha}\\n⏰ <b>Hora:</b> \·\${record.hora} horas\\n⚡ <b>Actividad:</b> \${record.actividad}\\n🏢 <b>Lugar:</b> \${record.lugar || "Pinto Durán"}\`;
    }
    else if (table === "profiles" && type === "INSERT") {
       text = \`👤 <b>Nuevo Perfil de Usuario con Acceso</b>\\n\\n📧 <b>Email:</b> \${record.email}\\n🔑 <b>Rol Asignado:</b> \${(record.role || "").toUpperCase()}\\n🏢 <b>Enlace de Club:</b> \${record.club_name || "Federación"}\\n⏰ <i>Registrado vía Supabase Auth</i>\`;
    }

    if (!text) {
       text = \`📦 <b>Cambio en base de datos</b>\\n\\n<b>Tabla:</b> \${table}\\n<b>Operación:</b> \${type}\`;
    }

    // Petición POST a la API de Telegram
    const telegramUrl = \`https://api.telegram.org/bot\${BOT_TOKEN}/sendMessage\`;
    const response = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: text,
        parse_mode: "HTML",
        disable_web_page_preview: true
      })
    });

    const resJson = await response.json();
    return new Response(JSON.stringify({ success: resJson.ok, info: resJson }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: response.status,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
`;

  return (
    <div className="space-y-8 animate-in fade-in duration-550">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">
            Telegram <span className="text-red-600">Notifications Control Room</span>
          </h2>
          <p className="text-slate-500 text-sm font-medium">
            Supervisa, simula y despliega el motor de alertas instantáneas para el cuerpo técnico de La Roja
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-3 py-2 rounded-xl">
            Bot Status: Online
          </span>
        </div>
      </div>

      {/* QUICK STATS & CONFIG DATA */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 border border-slate-100 rounded-3xl shadow-sm">
          <div className="text-slate-400 text-sm mb-2"><i className="fa-brands fa-telegram text-blue-500 text-lg"></i> Bot Username</div>
          <div className="text-xl font-bold text-slate-800">@LaRojaPerformance_bot</div>
        </div>
        <div className="bg-white p-6 border border-slate-100 rounded-3xl shadow-sm">
          <div className="text-slate-400 text-sm mb-2"><i className="fa-solid fa-users text-red-500 text-lg"></i> Grupo Destino</div>
          <div className="text-xl font-bold text-slate-800">Cuerpo Técnico</div>
        </div>
        <div className="bg-white p-6 border border-slate-100 rounded-3xl shadow-sm">
          <div className="text-slate-400 text-sm mb-2"><i className="fa-solid fa-hashtag text-slate-500 text-lg"></i> Chat ID</div>
          <div className="text-xl font-bold text-slate-800">-5131882686</div>
        </div>
        <div className="bg-white p-6 border border-slate-100 rounded-3xl shadow-sm">
          <div className="text-slate-400 text-sm mb-2"><i className="fa-solid fa-server text-emerald-500 text-lg"></i> Edge Function</div>
          <div className="text-xl font-bold text-slate-800">telegram-notifications</div>
        </div>
      </div>

      {/* COMPONENT NAVIGATION TABS */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('monitor')}
          className={`px-6 py-4 font-black transition-all text-xs uppercase tracking-widest ${
            activeTab === 'monitor'
              ? 'border-b-2 border-red-600 text-red-600 bg-red-50/10'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <i className="fa-solid fa-vial mr-2"></i> Monitoreo & Sandbox
        </button>
        <button
          onClick={() => setActiveTab('sql')}
          className={`px-6 py-4 font-black transition-all text-xs uppercase tracking-widest ${
            activeTab === 'sql'
              ? 'border-b-2 border-red-600 text-red-600 bg-red-50/10'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <i className="fa-solid fa-database mr-2"></i> Triggers SQL (11 Tablas)
        </button>
        <button
          onClick={() => setActiveTab('function')}
          className={`px-6 py-4 font-black transition-all text-xs uppercase tracking-widest ${
            activeTab === 'function'
              ? 'border-b-2 border-red-600 text-red-600 bg-red-50/10'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <i className="fa-solid fa-code mr-2"></i> Deno Edge Function
        </button>
      </div>

      {copiedText && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0b1220] border border-red-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
          <i className="fa-solid fa-circle-check text-red-500"></i>
          <span className="text-xs font-black uppercase tracking-widest">¡Copiado: {copiedText}!</span>
        </div>
      )}

      {/* TAB CONTENT: MONITORING AND SANDBOX */}
      {activeTab === 'monitor' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* SANDBOX FORM - Left Side */}
          <div className="lg:col-span-7 bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-800 uppercase italic">
                <i className="fa-solid fa-sliders text-red-600 mr-2"></i> Variables del Simulador
              </h3>
              <p className="text-xs text-slate-400">Escoge un disparador y ajusta datos para probar los formatos de salida</p>
            </div>

            {/* EVENT DISPATCHER TYPE */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Seleccionar Evento</label>
              <select
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value as EventType)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs"
              >
                <optgroup label="Wellness & Cargas">
                  <option value="wellness_checkin">✅ Evento 1 - Check-in Wellness (INSERT)</option>
                  <option value="internal_load">📊 Evento 2 - Carga Interna (INSERT)</option>
                </optgroup>
                <optgroup label="Parte Médico & Lesión">
                  <option value="lesion_insert">🚨 Evento 3a - Nueva Lesión (INSERT)</option>
                  <option value="lesion_update">🔄 Evento 3b - Actualización Lesión (UPDATE)</option>
                  <option value="medical_report">🩺 Evento 4 - Atención Médica (INSERT)</option>
                </optgroup>
                <optgroup label="Jugadores & Nóminas">
                  <option value="new_player">🆕 Evento 5 - Nuevo Jugador (INSERT)</option>
                  <option value="desconvocatorias">🔴 Evento 6 - Jugador Desconvocado (INSERT)</option>
                  <option value="tareas_semanales">📋 Evento 7 - Tarea Semanal (INSERT)</option>
                  <option value="citaciones">📣 Evento 8 - Jugador Citado (INSERT)</option>
                  <option value="match_reports">🏆 Evento 9 - Reporte Competencia (INSERT)</option>
                </optgroup>
                <optgroup label="Cronograma & Usuarios">
                  <option value="cronograma">🗓️ Evento 10 - Cronograma Diario (INSERT)</option>
                  <option value="profiles_insert">👤 Evento 11 - Nuevo Usuario (INSERT)</option>
                </optgroup>
              </select>
            </div>

            {/* CONDITIONAL EXTRA CONTROLS */}
            {selectedEvent !== 'new_player' && selectedEvent !== 'tareas_semanales' && selectedEvent !== 'cronograma' && selectedEvent !== 'profiles_insert' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Vincular a Jugador Real</label>
                <select
                  value={selectedPlayerId}
                  onChange={(e) => setSelectedPlayerId(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                >
                  {playersList.map((player) => (
                    <option key={player.player_id} value={player.player_id}>
                      {player.name} ({player.club})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* EVENT-SPECIFIC CONTROLS */}
            {selectedEvent === 'wellness_checkin' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Fatiga ({fatigue}/5)</label>
                  <input type="range" min="1" max="5" value={fatigue} onChange={(e) => setFatigue(Number(e.target.value))} className="w-full accent-red-600" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Sueño ({sleep}/5)</label>
                  <input type="range" min="1" max="5" value={sleep} onChange={(e) => setSleep(Number(e.target.value))} className="w-full accent-red-600" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Estrés ({stress}/5)</label>
                  <input type="range" min="1" max="5" value={stress} onChange={(e) => setStress(Number(e.target.value))} className="w-full accent-red-600" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Dolor/Soreness ({soreness}/5)</label>
                  <input type="range" min="1" max="5" value={soreness} onChange={(e) => setSoreness(Number(e.target.value))} className="w-full accent-red-600" />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Molestias Específicas</label>
                  <input
                    type="text"
                    value={wellnessNotes}
                    onChange={(e) => setWellnessNotes(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-red-500"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Estado de Salud / Síntomas</label>
                  <input
                    type="text"
                    value={wellnessEnfermedad}
                    onChange={(e) => setWellnessEnfermedad(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-red-500"
                  />
                </div>
              </div>
            )}

            {selectedEvent === 'internal_load' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">RPE (1-10)</label>
                  <input type="number" min="1" max="10" value={rpe} onChange={(e) => setRpe(Number(e.target.value))} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Duración (minutos)</label>
                  <input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Tipo Sesión</label>
                  <select value={sessionType} onChange={(e) => setSessionType(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs outline-none">
                    <option value="FIELD">Campo (FIELD)</option>
                    <option value="GYM">Gimnasio (GYM)</option>
                    <option value="MATCH">Partido (MATCH)</option>
                  </select>
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Molestias / Zonas</label>
                  <input type="text" value={loadNotes} onChange={(e) => setLoadNotes(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs outline-none" />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Estado de Salud / Síntomas</label>
                  <input type="text" value={loadEnfermedad} onChange={(e) => setLoadEnfermedad(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs outline-none" />
                </div>
              </div>
            )}

            {selectedEvent === 'lesion_insert' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Diagnóstico Clínico</label>
                  <input type="text" value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Localización</label>
                  <input type="text" value={injuryLocation} onChange={(e) => setInjuryLocation(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Gravedad o Disponibilidad</label>
                  <select value={injurySeverity} onChange={(e) => setInjurySeverity(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs outline-none">
                    <option value="Leve">Sujeto a Evaluación (Leve)</option>
                    <option value="Medio">Duda para partido (Medio)</option>
                    <option value="Grave">No Disponible (Baja médica)</option>
                  </select>
                </div>
              </div>
            )}

            {selectedEvent === 'lesion_update' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Estado de Lesión</label>
                  <input type="text" value={injuryStatus} onChange={(e) => setInjuryStatus(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Próximo Control</label>
                  <input type="date" value={injuryControlDate} onChange={(e) => setInjuryControlDate(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Diagnóstico Asociado</label>
                  <input type="text" value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs outline-none" />
                </div>
              </div>
            )}

            {selectedEvent === 'medical_report' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Diagnóstico Médico</label>
                  <input type="text" value={medicalDiagnostic} onChange={(e) => setMedicalDiagnostic(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Gravedad</label>
                  <select value={medicalSeverity} onChange={(e) => setMedicalSeverity(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs outline-none">
                    <option value="Baja">Leve (Baja)</option>
                    <option value="Media">Moderada (Media)</option>
                    <option value="Alta">Urgente/Alta (Alta)</option>
                  </select>
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Tratamiento Aplicado</label>
                  <input type="text" value={medicalTreatment} onChange={(e) => setMedicalTreatment(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs outline-none" />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Motivo extra / Observación</label>
                  <input type="text" value={medicalObservation} onChange={(e) => setMedicalObservation(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs outline-none" />
                </div>
              </div>
            )}

            {selectedEvent === 'new_player' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Nombres</label>
                  <input type="text" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Apellidos</label>
                  <input type="text" value={newPlayerLastName} onChange={(e) => setNewPlayerLastName(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Año de Nacimiento</label>
                  <input type="number" value={newPlayerBirthYear} onChange={(e) => setNewPlayerBirthYear(Number(e.target.value))} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Posición de Juego</label>
                  <input type="text" value={newPlayerPosition} onChange={(e) => setNewPlayerPosition(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs outline-none" />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Club Origen</label>
                  <input type="text" value={newPlayerClub} onChange={(e) => setNewPlayerClub(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs outline-none" />
                </div>
              </div>
            )}

            {selectedEvent === 'desconvocatorias' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Motivo Desconvocatoria</label>
                  <input type="text" value={desconvocatoriaReason} onChange={(e) => setDesconvocatoriaReason(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Fecha Efectiva</label>
                  <input type="date" value={desconvocatoriaDate} onChange={(e) => setDesconvocatoriaDate(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs outline-none" />
                </div>
              </div>
            )}

            {selectedEvent === 'tareas_semanales' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Nombre de la Tarea</label>
                  <input type="text" value={tareaNombre} onChange={(e) => setTareaNombre(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Dinámica de Trabajo</label>
                  <input type="text" value={tareaDinamica} onChange={(e) => setTareaDinamica(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Jornada</label>
                  <select value={tareaJornada} onChange={(e) => setTareaJornada(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs outline-none">
                    <option value="AM">Mañana (AM)</option>
                    <option value="PM">Tarde (PM)</option>
                  </select>
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Observaciones Técnicas</label>
                  <input type="text" value={tareaObservacion} onChange={(e) => setTareaObservacion(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs outline-none" />
                </div>
              </div>
            )}

            {selectedEvent === 'citaciones' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Identificador Microciclo</label>
                  <input type="text" value={citacionMicrocycle} onChange={(e) => setCitacionMicrocycle(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Categoría Citada</label>
                  <input type="text" value={citacionCategory} onChange={(e) => setCitacionCategory(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Fecha Límite Citación</label>
                  <input type="date" value={citacionDate} onChange={(e) => setCitacionDate(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs outline-none" />
                </div>
              </div>
            )}

            {selectedEvent === 'match_reports' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Rival Competente</label>
                  <input type="text" value={matchRival} onChange={(e) => setMatchRival(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Resultado Final</label>
                  <input type="text" value={matchResult} onChange={(e) => setMatchResult(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Minutos Jugados</label>
                  <input type="number" value={matchMinsPlayed} onChange={(e) => setMatchMinsPlayed(Number(e.target.value))} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Percepción de Esfuerzo (RPE)</label>
                  <input type="number" min="1" max="10" value={matchRpe} onChange={(e) => setMatchRpe(Number(e.target.value))} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs outline-none" />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Molestias / Zonas</label>
                  <input type="text" value={matchMolestias} onChange={(e) => setMatchMolestias(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs outline-none" />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Estado de Salud / Síntomas</label>
                  <input type="text" value={matchEnfermedad} onChange={(e) => setMatchEnfermedad(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs outline-none" />
                </div>
              </div>
            )}

            {selectedEvent === 'cronograma' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Fecha de Actividad</label>
                  <input type="date" value={cronoFecha} onChange={(e) => setCronoFecha(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Hora</label>
                  <input type="text" value={cronoHora} onChange={(e) => setCronoHora(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs outline-none" />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Detalle Actividad</label>
                  <input type="text" value={cronoActividad} onChange={(e) => setCronoActividad(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs outline-none" />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Lugar Físico</label>
                  <input type="text" value={cronoLugar} onChange={(e) => setCronoLugar(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs outline-none" />
                </div>
              </div>
            )}

            {selectedEvent === 'profiles_insert' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Email del Usuario</label>
                  <input type="email" value={newProfileEmail} onChange={(e) => setNewProfileEmail(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Rol Sistema</label>
                  <select value={newProfileRole} onChange={(e) => setNewProfileRole(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs outline-none">
                    <option value="player">Jugador (PLAYER)</option>
                    <option value="staff">Cuerpo Técnico (STAFF)</option>
                    <option value="club">Club Afiliado (CLUB)</option>
                    <option value="admin">Administrador (ADMIN)</option>
                  </select>
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Club Asociado</label>
                  <input type="text" value={newProfileClub} onChange={(e) => setNewProfileClub(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs outline-none" />
                </div>
              </div>
            )}

            {/* ACTION TRIGGERS */}
            <div className="pt-4 border-t border-slate-100 flex gap-3">
              <button
                onClick={triggerSimulation}
                className="flex-1 py-4 bg-[#CF1B2B] text-white rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-red-900/20"
              >
                <i className="fa-solid fa-play"></i>
                Simular Inserción / Disparar Alerta
              </button>
              <button
                onClick={() => handleCopy(telegramMessageHtml, 'Texto de Mensaje')}
                className="px-6 py-4 bg-slate-950 text-white rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-slate-800 transition-all flex items-center gap-2 shadow-sm"
              >
                <i className="fa-solid fa-copy"></i>
                Copiar
              </button>
            </div>
            
            {/* DEVELOPER LIVE CONSOLE */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                <i className="fa-solid fa-terminal mr-1"></i> Consola de Simulación Local
              </label>
              <div className="p-4 bg-[#0a0f1d] rounded-2xl font-mono text-[11px] text-emerald-400 h-32 overflow-y-auto space-y-1 select-all border border-slate-800">
                {simulationLogs.map((logStr, lIdx) => (
                  <div key={lIdx} className="leading-relaxed opacity-90">{logStr}</div>
                ))}
              </div>
            </div>
          </div>

          {/* TELEGRAM PREVIEW - Right Side */}
          <div className="lg:col-span-5 flex flex-col justify-start">
            <div className="sticky top-6 space-y-4">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                <i className="fa-brands fa-telegram text-blue-500 mr-2 text-sm"></i> Vista Previa en App de Telegram
              </label>

              {/* HIGH FIDELITY TELEGRAM SMARTPHONE MOCKUP */}
              <div className="bg-[#182533] border border-[#2b394a] rounded-[44px] shadow-2xl p-4 overflow-hidden relative w-full aspect-[9/16] max-w-[360px] mx-auto flex flex-col text-white font-sans">
                {/* Smartphone notches & camera */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-full z-20 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-slate-900 mr-8"></div>
                  <div className="w-12 h-1 bg-slate-900 rounded-full"></div>
                </div>

                {/* Telegram Header */}
                <div className="pt-8 pb-3 px-3 bg-[#24313f] border-b border-[#182533] flex items-center gap-3 relative z-10 shrink-0">
                  <div className="text-slate-300 text-sm"><i className="fa-solid fa-arrow-left"></i></div>
                  <div className="w-9 h-9 rounded-full bg-red-600 font-bold text-xs flex items-center justify-center text-white shrink-0">
                    LR
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="font-extrabold text-xs tracking-tight truncate">La Roja Performance (Cuerpo Técnico)</div>
                    <div className="text-[9px] text-[#2f6da4] font-medium mt-0.5">36 miembros, 1 bot</div>
                  </div>
                  <div className="text-slate-300 text-xs"><i className="fa-solid fa-ellipsis-vertical"></i></div>
                </div>

                {/* Chat Background / Bubble Area */}
                <div className="flex-1 overflow-y-auto p-3 space-y-4 bg-[#0e1621] relative flex flex-col justify-end">
                  {/* Backdrop artwork details */}
                  <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]"></div>

                  {/* Date Badge */}
                  <div className="self-center bg-[#1c2c31] text-[10px] px-3 py-1 rounded-full text-slate-300 font-bold opacity-80 uppercase tracking-widest leading-none">
                    Hoy
                  </div>

                  {/* Bot Message Speech Bubble */}
                  <div className="self-start max-w-[90%] bg-[#182533] rounded-2xl p-3.5 relative shadow-md border-l-4 border-red-600 animate-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-red-500 font-black tracking-widest uppercase">@LaRojaPerformance_bot</span>
                      <span className="text-[9px] text-slate-400 bg-slate-700/30 px-1 py-0.5 rounded uppercase">bot</span>
                    </div>

                    <div className="text-xs text-slate-100 whitespace-pre-line leading-relaxed leading-medium break-all font-medium selection:bg-red-900">
                      {telegramMessageHtml}
                    </div>

                    <div className="text-[9px] text-slate-400 text-right mt-1 font-bold">
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ✓✓
                    </div>
                  </div>
                </div>

                {/* Input box footer mockup */}
                <div className="bg-[#24313f] p-3 flex items-center gap-3 shrink-0 relative z-10 rounded-b-[24px]">
                  <div className="text-slate-400 text-base"><i className="fa-regular fa-face-smile"></i></div>
                  <div className="flex-1 bg-[#182533] rounded-full px-4 py-2 text-[11px] text-slate-400 select-none">
                    Solo lectura para miembros...
                  </div>
                  <div className="text-slate-400 text-base"><i className="fa-solid fa-paperclip"></i></div>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB CONTENT: SQL TRIGGER BASE */}
      {activeTab === 'sql' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between col-span-2">
              <div>
                <h3 className="text-lg font-black text-slate-800 uppercase italic">
                  <i className="fa-solid fa-terminal text-red-600 mr-2"></i> Scripts SQL para Supabase Dashboard
                </h3>
                <p className="text-xs text-slate-400">Ejecuta esto en tu editor SQL de Supabase para enlazar las 11 tablas con la Edge Function</p>
              </div>
              <button
                onClick={() => handleCopy(sqlTriggerScript, 'Código SQL de Triggers')}
                className="px-5 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all flex items-center gap-2 shadow"
              >
                <i className="fa-solid fa-copy"></i>
                Copiar Todo el Script SQL
              </button>
            </div>

            <div className="relative">
              <pre className="p-6 bg-[#0a0f1d] border border-slate-800 text-slate-200 rounded-2xl overflow-x-auto text-xs font-mono max-h-[500px] leading-relaxed break-all select-all">
                <code>{sqlTriggerScript}</code>
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: DENO EDGE FUNCTION SOURCE */}
      {activeTab === 'function' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between col-span-2">
              <div>
                <h3 className="text-lg font-black text-slate-800 uppercase italic">
                  <i className="fa-solid fa-laptop-code text-red-600 mr-2"></i> Código de Edge Function "telegram-notifications"
                </h3>
                <p className="text-xs text-slate-400">Implementación limpia en Deno/TypeScript, con resolución en tiempo real de nombres de jugadores</p>
              </div>
              <button
                onClick={() => handleCopy(edgeFunctionSource, 'Código TypeScript Edge Function')}
                className="px-5 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all flex items-center gap-2 shadow"
              >
                <i className="fa-solid fa-copy"></i>
                Copiar Código TS
              </button>
            </div>

            <div className="relative">
              <pre className="p-6 bg-[#0a0f1d] border border-slate-800 text-slate-200 rounded-2xl overflow-x-auto text-xs font-mono max-h-[500px] leading-relaxed break-all select-all">
                <code>{edgeFunctionSource}</code>
              </pre>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
