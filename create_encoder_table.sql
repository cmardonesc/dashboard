-- =========================================================================
-- SCRIPT DE INSTALACIÓN PARA EVALUACIONES ENCODER LINEAL 1RM
-- =========================================================================
-- Instrucciones de uso en Supabase:
-- 1. Ve a tu panel de control de Supabase (https://supabase.com).
-- 2. Entra en tu proyecto y selecciona la pestaña "SQL Editor" en la barra lateral.
-- 3. Crea una nueva consulta (New Query), pega el código de abajo y haz clic en "Run".
-- =========================================================================

-- Crear tabla de evaluaciones para el Encoder Lineal 1RM
CREATE TABLE IF NOT EXISTS public.evaluaciones_encoder (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  player_id int4 NOT NULL REFERENCES public.players(player_id) ON DELETE CASCADE,
  jugador text,
  fecha date NOT NULL,
  repeticion text NOT NULL,
  series text NOT NULL,
  ejercicio text,
  lateralidad text,
  peso_adicional_kg numeric,
  peso_total_kg numeric,
  inicio_ms numeric,
  duracion_ms numeric,
  distancia_mm numeric,
  v_m_s numeric,
  vmax_m_s numeric,
  t_to_vmax_ms numeric,
  rvd_m_s2 numeric,
  p_w numeric,
  pmax_w numeric,
  t_to_pmax_ms numeric,
  rpd_w_s numeric,
  f_n numeric,
  fmax_n numeric,
  t_to_fmax_ms numeric,
  rfd_n_s numeric,
  trabajo_kcal numeric,
  impulso_n_s numeric,
  UNIQUE(player_id, fecha, series, repeticion)
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.evaluaciones_encoder ENABLE ROW LEVEL SECURITY;

-- Crear política de acceso público
DROP POLICY IF EXISTS "Enable all access for evaluaciones_encoder" ON public.evaluaciones_encoder;
CREATE POLICY "Enable all access for evaluaciones_encoder" 
ON public.evaluaciones_encoder 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- =========================================================================
-- OPCIONAL: CONFIGURACIÓN PARA TABLA ALTERNATIVA "encoder_1rm_reports"
-- =========================================================================
-- Si ya existe la tabla "encoder_1rm_reports" en tu proyecto, habilitamos
-- RLS y añadimos políticas permisivas para evitar el error de violación de políticas.
ALTER TABLE public.encoder_1rm_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for encoder_1rm_reports" ON public.encoder_1rm_reports;
CREATE POLICY "Enable all access for encoder_1rm_reports" 
ON public.encoder_1rm_reports 
FOR ALL 
USING (true) 
WITH CHECK (true);

