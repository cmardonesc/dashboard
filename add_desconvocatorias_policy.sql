-- SOLUCIÓN AL ERROR RLS (42501) EN LA TABLA desconvocatorias
-- Copia y ejecuta este script en el SQL Editor de tu panel de Supabase para habilitar los permisos correctos.

-- 1. Crear la tabla desconvocatorias si por algún motivo no existe (con estructura exacta)
CREATE TABLE IF NOT EXISTS public.desconvocatorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    athlete_id TEXT NOT NULL,
    athlete_name TEXT,
    club_name TEXT,
    category_id TEXT,
    microciclo_id TEXT,
    motivo TEXT,
    fecha_desconvocatoria TEXT,
    staff_id UUID,
    observaciones_extra TEXT
);

-- 2. Asegurar que RLS está habilitado
ALTER TABLE public.desconvocatorias ENABLE ROW LEVEL SECURITY;

-- 3. Crear políticas para permitir lectura (SELECT) e inserción (INSERT) a usuarios anónimos y autenticados
DROP POLICY IF EXISTS "Enable all access for desconvocatorias" ON public.desconvocatorias;
CREATE POLICY "Enable all access for desconvocatorias" 
ON public.desconvocatorias 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- 4. Crear una función "Security Definer" para saltar RLS en caso de inserciones restringidas (RPC Fallback)
CREATE OR REPLACE FUNCTION public.create_desconvocatoria_safe(
    p_athlete_id TEXT,
    p_athlete_name TEXT,
    p_club_name TEXT,
    p_category_id TEXT,
    p_microciclo_id TEXT,
    p_motivo TEXT,
    p_fecha_desconvocatoria TEXT,
    p_staff_id TEXT DEFAULT NULL,
    p_observaciones_extra TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Esto hace que se ejecute con privilegios de administrador del sistema, saltando RLS
AS $$
BEGIN
    INSERT INTO public.desconvocatorias (
        athlete_id,
        athlete_name,
        club_name,
        category_id,
        microciclo_id,
        motivo,
        fecha_desconvocatoria,
        staff_id,
        observaciones_extra
    ) VALUES (
        p_athlete_id,
        p_athlete_name,
        p_club_name,
        p_category_id,
        p_microciclo_id,
        p_motivo,
        p_fecha_desconvocatoria,
        CASE WHEN p_staff_id IS NOT NULL AND p_staff_id <> '' THEN p_staff_id::UUID ELSE NULL END,
        p_observaciones_extra
    );
END;
$$;
