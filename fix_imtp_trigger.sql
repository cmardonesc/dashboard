-- =========================================================================
-- SOLUCIÓN AL ERROR DE IMPORTACIÓN EN TABLA "evaluaciones_imtp"
-- =========================================================================
-- Este script elimina de manera segura cualquier disparador (trigger) antiguo
-- en la tabla "evaluaciones_imtp" que intente buscar la columna inexistente
-- "imtp_f_relativa_n_kg" y lo reemplaza con un trigger moderno que utiliza
-- los nuevos nombres de columnas provenientes de la plataforma VALD.
--
-- También asegura que la columna "observaciones" exista en la tabla unificada
-- "evaluaciones_imtp_salto" para evitar cualquier error de base de datos.
--
-- INSTRUCCIONES:
-- 1. Copia todo este código SQL.
-- 2. Ve a tu panel de Supabase -> SQL Editor.
-- 3. Crea una nueva consulta (New Query), pega el código y haz clic en "Run".
-- =========================================================================

-- Asegurar que la columna "observaciones" exista en la tabla consolidada
ALTER TABLE public.evaluaciones_imtp_salto ADD COLUMN IF NOT EXISTS observaciones text;

DO $$
DECLARE
    r RECORD;
BEGIN
    -- 1. Buscar y eliminar dinámicamente todos los disparadores (triggers) en evaluaciones_imtp
    FOR r IN (
        SELECT tgname 
        FROM pg_trigger 
        JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid 
        WHERE pg_class.relname = 'evaluaciones_imtp' AND NOT tgisinternal
    ) LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.tgname) || ' ON public.evaluaciones_imtp;';
    END LOOP;
END $$;

-- 2. Crear o reemplazar la función de sincronización usando las nuevas columnas VALD
CREATE OR REPLACE FUNCTION public.sync_imtp_vald_to_salto()
RETURNS TRIGGER AS $$
DECLARE
  v_jugador text;
BEGIN
  -- Intentar obtener el nombre del jugador desde la tabla players
  SELECT COALESCE(nombre, '') || ' ' || COALESCE(apellido1, '')
  INTO v_jugador
  FROM public.players
  WHERE player_id = NEW.player_id;

  -- Si no se encuentra, usar un valor de fallback que no sea NULL para cumplir la restricción NOT NULL
  IF v_jugador IS NULL OR trim(v_jugador) = '' THEN
    v_jugador := 'Jugador ID ' || NEW.player_id;
  END IF;

  -- Insertar o actualizar en la tabla unificada "evaluaciones_imtp_salto"
  -- mapeando los campos nuevos de VALD a los campos tradicionales correspondientes.
  INSERT INTO public.evaluaciones_imtp_salto (
    player_id, 
    jugador,
    fecha_test, 
    peso, 
    imtp_fuerza_n, 
    imtp_f_relativa_n_kg, 
    imtp_asimetria, 
    imtp_debil,
    observaciones
  ) VALUES (
    NEW.player_id, 
    v_jugador,
    NEW.fecha_test, 
    NEW.peso, 
    NEW."Peak Vertical Force [N]", 
    NEW."Peak Vertical Force / BM [N/kg]", 
    NEW.imtp_asimetria, 
    NEW.imtp_debil,
    NEW.observaciones
  ) ON CONFLICT (player_id, fecha_test) DO UPDATE SET
    jugador = EXCLUDED.jugador,
    peso = EXCLUDED.peso,
    imtp_fuerza_n = EXCLUDED.imtp_fuerza_n,
    imtp_f_relativa_n_kg = EXCLUDED.imtp_f_relativa_n_kg,
    imtp_asimetria = EXCLUDED.imtp_asimetria,
    imtp_debil = EXCLUDED.imtp_debil,
    observaciones = EXCLUDED.observaciones;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Crear el nuevo disparador (trigger) en la tabla evaluaciones_imtp
CREATE TRIGGER trg_sync_imtp_vald_to_salto
AFTER INSERT OR UPDATE ON public.evaluaciones_imtp
FOR EACH ROW EXECUTE FUNCTION public.sync_imtp_vald_to_salto();

-- 4. Opcional: Re-asociar también el trigger de notificaciones de Telegram si lo tenías activo
-- (Este trigger genérico no causa problemas ya que serializa el registro a JSON)
DROP TRIGGER IF EXISTS trg_telegram_imtp ON public.evaluaciones_imtp;
CREATE TRIGGER trg_telegram_imtp
AFTER INSERT ON public.evaluaciones_imtp
FOR EACH ROW EXECUTE FUNCTION public.notify_telegram();
