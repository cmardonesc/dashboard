-- =========================================================================
-- SOLUCIÓN DEFINITIVA Y SEGURA PARA ERRORES DE PERMISOS (42501) Y TIPO UUID (22P02)
-- =========================================================================
-- Copia y ejecuta todo este script en el SQL Editor de tu panel de Supabase.
-- Este script resolverá:
--   1. El error de tipos "invalid input syntax for type uuid: '96'" al agendar.
--   2. El error de permisos (42501) de manera global y segura para todas las tablas.

-- -------------------------------------------------------------------------
-- PARTE 1: CORRECCIÓN GLOBAL DE PERMISOS Y PRIVILEGIOS DE ESCRITURA (Evita errores 42501 en otras tablas)
-- Conforme a la regla de seguridad del proyecto, el rol anon sólo lee, y authenticated tiene permisos completos.
-- -------------------------------------------------------------------------

-- Otorgar privilegios de lectura únicamente al rol anon (Anónimo/No autenticado)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;

-- Otorgar privilegios completos (lectura, inserción, actualización, eliminación) al rol authenticated
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;

-- -------------------------------------------------------------------------
-- PARTE 2: ELIMINACIÓN DE FUNCIONES CON PARÁMETRO UUID INCORRECTO
-- El ID de los microciclos en la base de datos real es de tipo ENTERO (INT), no UUID.
-- -------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.create_cronograma_safe(UUID, INT, DATE, TIME, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.update_cronograma_safe(UUID, UUID, INT, DATE, TIME, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.copy_cronograma_day_safe(UUID, INT, DATE, DATE);

-- -------------------------------------------------------------------------
-- PARTE 3: CREACIÓN DE FUNCIONES "SECURITY DEFINER" CORREGIDAS (Parámetro INT)
-- Estas funciones permiten realizar operaciones seguras y validan que el usuario esté autenticado.
-- -------------------------------------------------------------------------

-- A) Insertar Actividad en Cronograma Semanal
CREATE OR REPLACE FUNCTION public.create_cronograma_safe(
  p_id_microcycles INT,          -- Corregido de UUID a INT para coincidir con la DB real
  p_id_categoria INT,
  p_fecha DATE,
  p_hora TIME,
  p_actividad TEXT,
  p_lugar TEXT,
  p_otra TEXT DEFAULT NULL,
  p_grupo TEXT DEFAULT 'Todos'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- Ejecuta con permisos elevados para evadir políticas restrictivas del cliente
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Guarda de seguridad estricta: Sólo usuarios autenticados de la plataforma pueden escribir
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autorizado: Debes iniciar sesión en la plataforma.';
  END IF;

  INSERT INTO public.cronograma_semanal (
    id_microcycles, id_categoria, fecha, hora, actividad, lugar, otra, grupo
  ) VALUES (
    p_id_microcycles, p_id_categoria, p_fecha, p_hora, p_actividad, p_lugar, p_otra, p_grupo
  ) RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- B) Actualizar Actividad en Cronograma Semanal
CREATE OR REPLACE FUNCTION public.update_cronograma_safe(
  p_id UUID,
  p_id_microcycles INT,          -- Corregido de UUID a INT
  p_id_categoria INT,
  p_fecha DATE,
  p_hora TIME,
  p_actividad TEXT,
  p_lugar TEXT,
  p_otra TEXT,
  p_grupo TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Guarda de seguridad estricta: Sólo usuarios autenticados
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autorizado: Debes iniciar sesión en la plataforma.';
  END IF;

  UPDATE public.cronograma_semanal
  SET 
    id_microcycles = p_id_microcycles,
    id_categoria = p_id_categoria,
    fecha = p_fecha,
    hora = p_hora,
    actividad = p_actividad,
    lugar = p_lugar,
    otra = p_otra,
    grupo = p_grupo
  WHERE id = p_id;
END;
$$;

-- C) Copiar Actividades de un Día a Otro en Bloque
CREATE OR REPLACE FUNCTION public.copy_cronograma_day_safe(
  p_id_microcycles INT,          -- Corregido de UUID a INT
  p_id_categoria INT,
  p_source_fecha DATE,
  p_target_fecha DATE
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inserted_count INT;
BEGIN
  -- Guarda de seguridad estricta: Sólo usuarios autenticados
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autorizado: Debes iniciar sesión en la plataforma.';
  END IF;

  INSERT INTO public.cronograma_semanal (
    id_microcycles, id_categoria, fecha, hora, actividad, lugar, otra, grupo
  )
  SELECT 
    p_id_microcycles, p_id_categoria, p_target_fecha, hora, actividad, lugar, otra, grupo
  FROM public.cronograma_semanal
  WHERE id_microcycles = p_id_microcycles AND fecha = p_source_fecha;

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
  RETURN v_inserted_count;
END;
$$;
