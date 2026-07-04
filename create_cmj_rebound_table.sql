-- =========================================================================
-- SCRIPT DE INSTALACIÓN PARA TEST CMJ REBOUND
-- =========================================================================
-- Instrucciones de uso en Supabase:
-- 1. Ve a tu panel de control de Supabase (https://supabase.com).
-- 2. Entra en tu proyecto y selecciona la pestaña "SQL Editor" en la barra lateral.
-- 3. Crea una nueva consulta (New Query), pega el código de abajo y haz clic en "Run".
-- =========================================================================

-- Crear la tabla de evaluaciones para CMJ Rebound
CREATE TABLE IF NOT EXISTS public.evaluaciones_cmj_rebound (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  player_id int4 NOT NULL REFERENCES public.players(player_id) ON DELETE CASCADE,
  jugador text,
  fecha_test date NOT NULL,
  bw_kg numeric,
  reps int4,
  rebound_rsi numeric,
  rebound_contact_time_ms numeric,
  rebound_flight_time_ms numeric,
  take_off_momentum_kg_m_s numeric,
  observaciones text,
  UNIQUE(player_id, fecha_test)
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.evaluaciones_cmj_rebound ENABLE ROW LEVEL SECURITY;

-- Crear política para permitir todo el acceso público/anon/autenticado (como las demás tablas)
DROP POLICY IF EXISTS "Enable all access for evaluaciones_cmj_rebound" ON public.evaluaciones_cmj_rebound;
CREATE POLICY "Enable all access for evaluaciones_cmj_rebound" 
ON public.evaluaciones_cmj_rebound 
FOR ALL 
USING (true) 
WITH CHECK (true);
