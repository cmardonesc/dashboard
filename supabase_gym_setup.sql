-- ====================================================================
-- SCRIPT DE INSTALACIÓN PARA ÁREA FÍSICA - GIMNASIO (SUPABASE)
-- Ejecuta este script en el editor SQL (SQL Editor) de tu dashboard de Supabase
-- ====================================================================

-- 1. Tabla para las Sesiones de Gimnasio por Microciclo y Día de la semana
CREATE TABLE IF NOT EXISTS fisica_gimnasio_sesion (
  id BIGSERIAL PRIMARY KEY,
  microcycle_id INT NOT NULL REFERENCES microcycles(id) ON DELETE CASCADE,
  dia_semana VARCHAR(20) NOT NULL, -- 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'
  fecha_sesion DATE,
  nombre_sesion VARCHAR(100) NOT NULL DEFAULT 'Sesión General',
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(255)
);

-- Habilitar RLS (Row Level Security) para las sesiones
ALTER TABLE fisica_gimnasio_sesion ENABLE ROW LEVEL SECURITY;

-- Crear políticas para permitir acceso libre/autenticado según la configuración
CREATE POLICY "Permitir lectura para todos" ON fisica_gimnasio_sesion
  FOR SELECT USING (true);

CREATE POLICY "Permitir inserción para todos" ON fisica_gimnasio_sesion
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir actualización para todos" ON fisica_gimnasio_sesion
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Permitir eliminación para todos" ON fisica_gimnasio_sesion
  FOR DELETE USING (true);


-- 2. Tabla para los Ejercicios de cada Sesión de Gimnasio
CREATE TABLE IF NOT EXISTS fisica_gimnasio_ejercicio (
  id BIGSERIAL PRIMARY KEY,
  sesion_id BIGINT NOT NULL REFERENCES fisica_gimnasio_sesion(id) ON DELETE CASCADE,
  grupo_muscular VARCHAR(100) NOT NULL,
  ejercicio VARCHAR(255) NOT NULL,
  equipamiento VARCHAR(255),
  tecnica_ejecucion TEXT,
  series INT NOT NULL DEFAULT 3,
  repeticiones VARCHAR(50) NOT NULL DEFAULT '10',
  carga_kg VARCHAR(50) DEFAULT '0',
  rpe_sugerido INT,
  orden INT DEFAULT 0
);

-- Habilitar RLS para los ejercicios
ALTER TABLE fisica_gimnasio_ejercicio ENABLE ROW LEVEL SECURITY;

-- Crear políticas para los ejercicios
CREATE POLICY "Permitir lectura para todos" ON fisica_gimnasio_ejercicio
  FOR SELECT USING (true);

CREATE POLICY "Permitir inserción para todos" ON fisica_gimnasio_ejercicio
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir actualización para todos" ON fisica_gimnasio_ejercicio
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Permitir eliminación para todos" ON fisica_gimnasio_ejercicio
  FOR DELETE USING (true);


-- 3. Índices para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_gym_sesion_micro ON fisica_gimnasio_sesion(microcycle_id);
CREATE INDEX IF NOT EXISTS idx_gym_ejercicio_sesion ON fisica_gimnasio_ejercicio(sesion_id);
