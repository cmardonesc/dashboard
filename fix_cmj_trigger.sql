-- =========================================================================
-- SOLUCIÓN AL ERROR DE IMPORTACIÓN EN TABLA "evaluaciones_cmj"
-- =========================================================================
-- Este script elimina de manera segura cualquier disparador (trigger) antiguo
-- en la tabla "evaluaciones_cmj" que intente buscar la columna inexistente
-- "jugador" o "fuerza_cmj" y lo reemplaza con un trigger moderno que utiliza
-- los nuevos nombres de columnas del nuevo formato CSV de CMJ.
--
-- INSTRUCCIONES:
-- 1. Copia todo este código SQL.
-- 2. Ve a tu panel de Supabase -> SQL Editor.
-- 3. Crea una nueva consulta (New Query), pega el código y haz clic en "Run".
-- =========================================================================

-- Asegurar que la tabla unificada "evaluaciones_imtp_salto" tenga todas las columnas del formato moderno de CMJ
ALTER TABLE public.evaluaciones_imtp_salto ADD COLUMN IF NOT EXISTS cmj_altura_salto_im numeric;
ALTER TABLE public.evaluaciones_imtp_salto ADD COLUMN IF NOT EXISTS cmj_salto_tv numeric;
ALTER TABLE public.evaluaciones_imtp_salto ADD COLUMN IF NOT EXISTS cmj_asimetria_aterrizaje numeric;
ALTER TABLE public.evaluaciones_imtp_salto ADD COLUMN IF NOT EXISTS avk_indice_uso_brazos_tv numeric;
ALTER TABLE public.evaluaciones_imtp_salto ADD COLUMN IF NOT EXISTS avk_indice_brazos_im numeric;

DO $$
DECLARE
    r RECORD;
BEGIN
    -- 1. Buscar y eliminar dinámicamente todos los disparadores (triggers) en evaluaciones_cmj
    FOR r IN (
        SELECT tgname 
        FROM pg_trigger 
        JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid 
        WHERE pg_class.relname = 'evaluaciones_cmj' AND NOT tgisinternal
    ) LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.tgname) || ' ON public.evaluaciones_cmj;';
    END LOOP;
END $$;

-- 2. Crear o reemplazar la función de sincronización usando las nuevas columnas de CMJ
CREATE OR REPLACE FUNCTION public.sync_cmj_to_salto()
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
  -- mapeando los campos nuevos de CMJ a los campos tradicionales correspondientes.
  INSERT INTO public.evaluaciones_imtp_salto (
    player_id, 
    jugador,
    fecha_test, 
    peso, 
    fuerza_cmj, 
    cmj_rsi_mod, 
    cmj_altura_salto_im, 
    cmj_peak_pot_relativa,
    observaciones
  ) VALUES (
    NEW.player_id, 
    v_jugador,
    NEW.fecha_test, 
    NEW.bw_kg, 
    NEW.concentric_peak_force_n, 
    NEW.rsi_modified_m_s, 
    NEW.jump_height_impmom_cm, 
    NEW.peak_power_bm_w_kg,
    NEW.observaciones
  ) ON CONFLICT (player_id, fecha_test) DO UPDATE SET
    jugador = EXCLUDED.jugador,
    peso = COALESCE(EXCLUDED.peso, evaluaciones_imtp_salto.peso),
    fuerza_cmj = EXCLUDED.fuerza_cmj,
    cmj_rsi_mod = EXCLUDED.cmj_rsi_mod,
    cmj_altura_salto_im = EXCLUDED.cmj_altura_salto_im,
    cmj_peak_pot_relativa = EXCLUDED.cmj_peak_pot_relativa,
    observaciones = COALESCE(EXCLUDED.observaciones, evaluaciones_imtp_salto.observaciones);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Crear el nuevo disparador (trigger) en la tabla evaluaciones_cmj
CREATE TRIGGER trg_sync_cmj_to_salto
AFTER INSERT OR UPDATE ON public.evaluaciones_cmj
FOR EACH ROW EXECUTE FUNCTION public.sync_cmj_to_salto();

-- 4. Opcional: Re-asociar también el trigger de notificaciones de Telegram si lo tenías activo
DROP TRIGGER IF EXISTS trg_telegram_cmj ON public.evaluaciones_cmj;
CREATE TRIGGER trg_telegram_cmj
AFTER INSERT ON public.evaluaciones_cmj
FOR EACH ROW EXECUTE FUNCTION public.notify_telegram();
