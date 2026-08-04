-- =========================================================================
-- SCRIPT DE INSTALACIÓN PARA TEST SINGLE LEG JUMP (SLJ)
-- =========================================================================
-- Instrucciones de uso en Supabase:
-- 1. Ve a tu panel de control de Supabase (https://supabase.com).
-- 2. Entra en tu proyecto y selecciona la pestaña "SQL Editor" en la barra lateral.
-- 3. Crea una nueva consulta (New Query), pega el código de abajo y haz clic en "Run".
-- =========================================================================

-- Crear la tabla de evaluaciones para Single Leg Jump (SLJ)
CREATE TABLE IF NOT EXISTS public.evaluaciones_slj (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  player_id int4 NOT NULL REFERENCES public.players(player_id) ON DELETE CASCADE,
  jugador text,
  fecha_test date NOT NULL,
  bw_kg numeric,
  reps_l int4,
  reps_r int4,
  peak_power_w numeric,
  peak_power_l_w numeric,
  peak_power_r_w numeric,
  peak_power_asym_pct text,
  peak_power_bm_w_kg numeric,
  peak_power_bm_l_w_kg numeric,
  peak_power_bm_r_w_kg numeric,
  peak_power_bm_asym_pct text,
  concentric_peak_force_n numeric,
  concentric_peak_force_l_n numeric,
  concentric_peak_force_r_n numeric,
  concentric_peak_force_asym_pct text,
  rsi_modified_m_s numeric,
  rsi_modified_l_m_s numeric,
  rsi_modified_r_m_s numeric,
  rsi_modified_asym_pct text,
  takeoff_peak_force_n numeric,
  takeoff_peak_force_l_n numeric,
  takeoff_peak_force_r_n numeric,
  takeoff_peak_force_asym_pct text,
  jump_height_cm numeric,
  jump_height_l_cm numeric,
  jump_height_r_cm numeric,
  jump_height_asym_pct text,
  observaciones text,
  UNIQUE(player_id, fecha_test)
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.evaluaciones_slj ENABLE ROW LEVEL SECURITY;

-- Crear política para permitir todo el acceso público/anon/autenticado (como las demás tablas)
DROP POLICY IF EXISTS "Enable all access for evaluaciones_slj" ON public.evaluaciones_slj;
CREATE POLICY "Enable all access for evaluaciones_slj" 
ON public.evaluaciones_slj 
FOR ALL 
USING (true) 
WITH CHECK (true);
