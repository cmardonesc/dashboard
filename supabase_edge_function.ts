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

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const payload = await req.json();
    const { table, record, title: manualTitle, body: manualBody, url: manualUrl } = payload;

    let title = manualTitle || "Nueva Notificación";
    let body = manualBody || "Tienes una nueva actualización en LA ROJA.";
    let url = manualUrl || "/";

    // 1. Si no hay título/cuerpo manual, intentar generar a partir de la tabla/registro
    if (!manualTitle && table && record) {
      if (table === "medical_daily_reports") {
        const { data: player } = await supabase
          .from("players")
          .select("nombre, apellido1")
          .eq("id_del_jugador", record.id_del_jugador)
          .single();
        const playerName = player ? `${player.nombre} ${player.apellido1}` : "Jugador";
        title = `Nuevo Reporte Médico: ${playerName}`;
        body = `${record.diagnostico_medico || "Sin diagnóstico"}. Gravedad: ${record.severity}`;
        url = "/medica";
      } 
      else if (table === "wellness_checkin") {
        const { data: player } = await supabase
          .from("players")
          .select("nombre, apellido1")
          .eq("id_del_jugador", record.id_del_jugador)
          .single();
        const playerName = player ? `${player.nombre} ${player.apellido1}` : "Jugador";
        title = `Check-in Completado: ${playerName}`;
        body = `Fatiga: ${record.fatigue}, Sueño: ${record.sleep_quality}, Estrés: ${record.stress}`;
        url = "/fisica_wellness";
      }
      else if (table === "internal_load") {
        const { data: player } = await supabase
          .from("players")
          .select("nombre, apellido1")
          .eq("id_del_jugador", record.id_del_jugador)
          .single();
        const playerName = player ? `${player.nombre} ${player.apellido1}` : "Jugador";
        title = `Check-out (RPE): ${playerName}`;
        body = `Esfuerzo: ${record.rpe}, Duración: ${record.duration_min} min.`;
        url = "/fisica_pse";
      }
      else if (table === "microcycles") {
        title = `Nuevo Microciclo Creado`;
        body = `Tipo: ${record.type}, Del ${record.start_date} al ${record.end_date}`;
        url = "/tecnica";
      }
    }

    // 2. Buscar suscripciones
    const { data: subscriptions } = await supabase
      .from("user_notifications")
      .select("subscription");

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ message: "No subscriptions found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 3. Enviar notificación (Simulación de envío)
    console.log(`Enviando notificación: [${title}] ${body}`);

    return new Response(JSON.stringify({ success: true, notified: subscriptions.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
