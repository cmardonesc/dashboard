-- 1. Habilitar la extensión de webhooks si no está habilitada
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- 2. Crear una función genérica en PostgreSQL que llame a nuestra Edge Function
CREATE OR REPLACE FUNCTION public.notify_app_event()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  table_name TEXT;
BEGIN
  table_name := TG_TABLE_NAME;
  
  -- Construir el payload con el nombre de la tabla y el nuevo registro
  payload := jsonb_build_object(
    'table', table_name,
    'record', row_to_json(NEW)
  );

  -- Llamar a la Edge Function de Supabase de manera segura
  -- Envolvemos en un bloque de excepción para que errores de DNS/Red/Configuración no bloqueen ni cancelen la transacción
  BEGIN
    PERFORM
      net.http_post(
        'https://TU_URL_DE_PROYECTO.supabase.co/functions/v1/send-notification'::text,
        payload::jsonb,
        '{}'::jsonb,
        jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || 'TU_SERVICE_ROLE_KEY'
        )::jsonb,
        5000::integer
      );
  EXCEPTION WHEN OTHERS THEN
    -- Mantenemos la transacción viva ignorando errores de red externos
    RAISE WARNING 'Fallo de red en disparar notificación remota: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Crear disparadores (Triggers) para cada tabla relevante

-- Reportes Médicos
DROP TRIGGER IF EXISTS on_medical_report_inserted ON public.medical_daily_reports;
CREATE TRIGGER on_medical_report_inserted
AFTER INSERT ON public.medical_daily_reports
FOR EACH ROW EXECUTE FUNCTION public.notify_app_event();

-- Wellness Check-in
DROP TRIGGER IF EXISTS on_wellness_inserted ON public.wellness_checkin;
CREATE TRIGGER on_wellness_inserted
AFTER INSERT ON public.wellness_checkin
FOR EACH ROW EXECUTE FUNCTION public.notify_app_event();

-- Carga Interna (Check-out)
DROP TRIGGER IF EXISTS on_load_inserted ON public.internal_load;
CREATE TRIGGER on_load_inserted
AFTER INSERT ON public.internal_load
FOR EACH ROW EXECUTE FUNCTION public.notify_app_event();

-- Microciclos
DROP TRIGGER IF EXISTS on_microcycle_inserted ON public.microcycles;
CREATE TRIGGER on_microcycle_inserted
AFTER INSERT ON public.microcycles
FOR EACH ROW EXECUTE FUNCTION public.notify_app_event();
