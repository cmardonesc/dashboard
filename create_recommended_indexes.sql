-- ====================================================================
-- SCRIPT DE OPTIMIZACIÓN DE ÍNDICES PARA EL PERFORMANCE HUB (SUPABASE)
-- ====================================================================
--
-- ¿Cómo usar este script?
-- 1. Copia todo el contenido de este archivo.
-- 2. Ve a tu consola de Supabase (https://supabase.com).
-- 3. Entra en tu proyecto y navega a la sección "SQL Editor".
-- 4. Crea una nueva consulta (New Query), pega el código y haz clic en "Run".
--
-- ¿Por qué son importantes estos índices?
-- Al igual que el índice de un libro, aceleran las consultas recurrentes
-- que el frontend realiza (por ejemplo, para filtrar registros por jugador 
-- y ordenarlos de forma descendente por fecha), evitando escaneos completos 
-- de tablas grandes (Seq Scan) y reduciendo drásticamente la carga de CPU.

-- 1. Tabla: players (Jugadores)
-- Optimiza búsquedas rápidas por ID de club y listados de categorías.
CREATE INDEX IF NOT EXISTS idx_players_id_club ON public.players(id_club);
CREATE INDEX IF NOT EXISTS idx_players_anio ON public.players(anio);

-- 2. Tabla: wellness_checkin (Encuestas de bienestar)
-- El frontend consulta regularmente los últimos 90 días ordenando por fecha de forma descendente.
-- Un índice compuesto por (player_id, checkin_date DESC) es ideal para esta consulta.
CREATE INDEX IF NOT EXISTS idx_wellness_checkin_player_date 
ON public.wellness_checkin(player_id, checkin_date DESC);

-- También indexamos 'checkin_dat' en caso de que se use la columna alternativa.
CREATE INDEX IF NOT EXISTS idx_wellness_checkin_player_dat
ON public.wellness_checkin(player_id, checkin_dat DESC);

-- 3. Tabla: internal_load (Carga de entrenamientos)
-- Optimiza consultas filtradas por jugador y ordenadas por fecha de entrenamiento.
CREATE INDEX IF NOT EXISTS idx_internal_load_player_date 
ON public.internal_load(player_id, session_date DESC);

-- 4. Tabla: antropometria (Nutrición / Antropometría)
-- Optimiza consultas históricas de composición corporal del jugador.
CREATE INDEX IF NOT EXISTS idx_antropometria_player_date 
ON public.antropometria(player_id, fecha_medicion DESC);

-- 5. Tabla: gps_tareas (Datos de GPS detallados de tareas)
-- Esta tabla suele acumular gran volumen de registros; un índice es crítico aquí.
CREATE INDEX IF NOT EXISTS idx_gps_tareas_player_date 
ON public.gps_tareas(player_id, fecha DESC);

-- 6. Tabla: citaciones (Convocatorias / Citaciones)
-- Acelera la carga de citaciones del jugador e histórico por microciclo.
CREATE INDEX IF NOT EXISTS idx_citaciones_player_date ON public.citaciones(player_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_citaciones_microcycle_id ON public.citaciones(microcycle_id) WHERE microcycle_id IS NOT NULL;

-- 7. Tabla: microcycles (Planificación de microciclos)
-- Optimiza búsquedas de microciclos por categoría y fechas de inicio/fin.
CREATE INDEX IF NOT EXISTS idx_microcycles_category_date 
ON public.microcycles(category_id, start_date DESC, end_date DESC);

-- 8. Tabla: lesionados (Registro médico de lesiones)
-- Optimiza el listado médico de control de jugadores lesionados.
CREATE INDEX IF NOT EXISTS idx_lesionados_player_status 
ON public.lesionados(player_id, estado);

-- 9. Tabla: medical_daily_reports (Reporte diario de kinesiología)
-- Optimiza el registro diario de reportes.
CREATE INDEX IF NOT EXISTS idx_medical_daily_reports_player_date 
ON public.medical_daily_reports(player_id, report_date DESC);

-- ====================================================================
-- Verificación: Puedes correr la siguiente consulta para verificar que 
-- los índices se hayan creado de forma correcta:
--
-- SELECT tablename, indexname, indexdef 
-- FROM pg_indexes 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename;
-- ====================================================================
