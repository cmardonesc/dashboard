-- ====================================================================
-- SCRIPT DE CREACIÓN PARA TABLA DE EJERCICIOS POR FOCO DE TRABAJO
-- Ejecuta este script en el editor SQL (SQL Editor) de tu dashboard de Supabase
-- ====================================================================

-- 1. Crear tabla para almacenar las plantillas de ejercicios específicos por foco de trabajo (perfil neuromuscular)
CREATE TABLE IF NOT EXISTS fisica_gimnasio_ejercicio_plantilla (
  id BIGSERIAL PRIMARY KEY,
  target_group VARCHAR(50) NOT NULL, -- e.g. 'FUERZA_MAXIMA', 'PLIOMETRIA_INTENSIVA', etc.
  grupo_muscular VARCHAR(100) NOT NULL,
  ejercicio VARCHAR(255) NOT NULL,
  equipamiento VARCHAR(255),
  tecnica_ejecucion TEXT,
  series INT NOT NULL DEFAULT 3,
  repeticiones VARCHAR(50) NOT NULL DEFAULT '10',
  carga_kg VARCHAR(50) DEFAULT '0',
  rpe_sugerido INT DEFAULT 7,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS (Row Level Security) para la tabla de plantillas
ALTER TABLE fisica_gimnasio_ejercicio_plantilla ENABLE ROW LEVEL SECURITY;

-- Crear políticas de acceso para permitir que el cuerpo técnico gestione las plantillas libremente
CREATE POLICY "Permitir lectura para todos" ON fisica_gimnasio_ejercicio_plantilla
  FOR SELECT USING (true);

CREATE POLICY "Permitir inserción para todos" ON fisica_gimnasio_ejercicio_plantilla
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir actualización para todos" ON fisica_gimnasio_ejercicio_plantilla
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Permitir eliminación para todos" ON fisica_gimnasio_ejercicio_plantilla
  FOR DELETE USING (true);

-- 2. Limpiar datos previos si existieran para evitar duplicados en la reinicialización
TRUNCATE TABLE fisica_gimnasio_ejercicio_plantilla RESTART IDENTITY CASCADE;

-- 3. Insertar 3 ejercicios de alto rendimiento por cada uno de los 11 focos de trabajo (focos neuromusculares)

-- FOCO 1: FUERZA_MAXIMA (Fuerza Máxima / Reclutamiento de fibras rápidas)
INSERT INTO fisica_gimnasio_ejercicio_plantilla (target_group, grupo_muscular, ejercicio, equipamiento, tecnica_ejecucion, series, repeticiones, carga_kg, rpe_sugerido) VALUES
('FUERZA_MAXIMA', 'Piernas / Cadena Posterior', 'Sentadilla trasera con barra baja (Back Squat)', 'Barra olímpica, Discos, Rack', 'Apoyar la barra en los deltoides posteriores. Descender con control rompiendo el paralelo (fase excéntrica controlada), empujar verticalmente de forma sólida manteniendo el torso firme.', 4, '3-5', '80-85% 1RM', 8),
('FUERZA_MAXIMA', 'Cadena Posterior / Lumbar', 'Peso muerto convencional (Deadlift)', 'Barra olímpica, Discos', 'Posición inicial con pies al ancho de cadera, agarre por fuera de las rodillas. Traccionar manteniendo barra pegada al cuerpo, empuje de piernas inicial y extensión simultánea de cadera.', 3, '3-5', '80-85% 1RM', 9),
('FUERZA_MAXIMA', 'Pectorales / Tríceps', 'Press de banca plano con barra', 'Barra, Banco plano, Discos', 'Apoyo firme de pies en el suelo, retracción escapular activa. Bajar la barra con control al pecho medio y empujar de forma compacta e impulsando con el tren superior.', 4, '5', '80% 1RM', 8);

-- FOCO 2: FUERZA_EXPLOSIVA (Fuerza Explosiva / Potencia)
INSERT INTO fisica_gimnasio_ejercicio_plantilla (target_group, grupo_muscular, ejercicio, equipamiento, tecnica_ejecucion, series, repeticiones, carga_kg, rpe_sugerido) VALUES
('FUERZA_EXPLOSIVA', 'Piernas / Extensores', 'Sentadilla con salto con barra hexagonal (Hex Bar Jump Squat)', 'Barra hexagonal, Discos livianos', 'Bajar a media sentadilla de manera controlada y realizar una extensión de cadera y rodillas extremadamente explosiva para despegar del suelo. Amortiguar con flexión coordinada.', 4, '4-6', '30-40% 1RM', 7),
('FUERZA_EXPLOSIVA', 'Cadena Posterior / Core', 'Lanzamiento de Med Ball hacia atrás sobre la cabeza', 'Balón medicinal pesado (6-8kg)', 'Desde posición de triple flexión (caderas, rodillas, tobillos), empujar el suelo explosivamente y lanzar el balón con máxima fuerza hacia atrás y arriba mediante extensión potente.', 3, '6', 'Balón 6-8kg', 7),
('FUERZA_EXPLOSIVA', 'Hombros / Piernas', 'Push Press con barra', 'Barra olímpica, Discos', 'Realizar un dip corto de piernas (flexión menor a 15cm) y aprovechar el impulso del tren inferior de manera coordinada para empujar la barra sobre la cabeza con bloqueo rápido.', 4, '5', '65-70% 1RM', 8);

-- FOCO 3: PLIOMETRIA_INTENSIVA (Pliometría de alto impacto / Ciclo estiramiento-acortamiento rápido)
INSERT INTO fisica_gimnasio_ejercicio_plantilla (target_group, grupo_muscular, ejercicio, equipamiento, tecnica_ejecucion, series, repeticiones, carga_kg, rpe_sugerido) VALUES
('PLIOMETRIA_INTENSIVA', 'Cuádriceps / Tobillos', 'Saltos de caída con rebote vertical (Depth Jumps)', 'Cajón pliométrico (30-45 cm)', 'Dejarse caer desde el cajón (no saltar), amortiguar el impacto con el mínimo tiempo de contacto en el suelo y rebotar explosivamente hacia arriba buscando la máxima altura.', 4, '5', 'Peso corporal', 8),
('PLIOMETRIA_INTENSIVA', 'Pantorrillas / Tobillos', 'Saltos de valla continuos (Hurdle Jumps)', '4-5 Vallas pliométricas (40-60 cm)', 'Saltos bipodales continuos sobre vallas consecutivas. Minimizar el tiempo de contacto en el suelo, utilizando el rebote reactivo del tendón de Aquiles y flexión de cadera.', 3, '5 saltos', 'Peso corporal', 8),
('PLIOMETRIA_INTENSIVA', 'Extensores de Cadera', 'Saltos horizontales continuos alternados (Power Bounds)', 'Espacio libre de 15 metros', 'Zancadas pliométricas proyectando el cuerpo con la máxima distancia horizontal y vertical por salto. Coordinar activamente el braceo para la propulsión explosiva.', 3, '10-12 cont.', 'Peso corporal', 8);

-- FOCO 4: PLIOMETRIA_EXTENSIVA (Pliometría elástica de bajo-medio impacto / Acondicionamiento de tendones)
INSERT INTO fisica_gimnasio_ejercicio_plantilla (target_group, grupo_muscular, ejercicio, equipamiento, tecnica_ejecucion, series, repeticiones, carga_kg, rpe_sugerido) VALUES
('PLIOMETRIA_EXTENSIVA', 'Tobillo / Tendón de Aquiles', 'Saltos de tobillo rítmicos en el lugar (Ankle Hops / Pogos)', 'Ninguno', 'Saltos verticales rápidos manteniendo las rodillas casi rígidas. El movimiento proviene exclusivamente de la flexión plantar activa del tobillo con rebote elástico y rigidez.', 3, '20 contactos', 'Peso corporal', 6),
('PLIOMETRIA_EXTENSIVA', 'Estabilizadores / Tobillo', 'Saltos laterales rítmicos sobre línea (Lateral Line Hops)', 'Línea de suelo o banda elástica', 'Saltar lateralmente de lado a lado de forma rítmica y continua. Mantener el centro de masa estable y priorizar la elasticidad, rapidez y coordinación en la amortiguación.', 3, '30 segundos', 'Peso corporal', 6),
('PLIOMETRIA_EXTENSIVA', 'Piernas / Elasticidad base', 'Saltos en tijera continuos de bajo impacto (Split Hops)', 'Ninguno', 'En posición de zancada corta y alternando piernas de forma continua sin bajar demasiado la cadera. Buscar un rebote ligero, reactivo, elástico y de bajo impacto coordinado.', 3, '16 contactos', 'Peso corporal', 5);

-- FOCO 5: SALTOS_CON_CARGA (Saltos cargados / Fuerza potencia)
INSERT INTO fisica_gimnasio_ejercicio_plantilla (target_group, grupo_muscular, ejercicio, equipamiento, tecnica_ejecucion, series, repeticiones, carga_kg, rpe_sugerido) VALUES
('SALTOS_CON_CARGA', 'Cuádriceps / Glúteos', 'Saltos desde sentadilla con mancuernas (Dumbbell Jump Squat)', 'Mancuernas de 8-12kg', 'Sostener mancuernas firmemente a los costados del cuerpo. Bajar a un cuarto de sentadilla y despegar verticalmente. Absorber la caída flexionando rodillas.', 4, '6', '8-12kg c/u', 7),
('SALTOS_CON_CARGA', 'Tren inferior / Potencia', 'Saltos bipodales a cajón con chaleco lastrado (Weighted Box Jumps)', 'Chaleco lastrado (5-10kg), Cajón bajo', 'Con el chaleco colocado, realizar una flexión rápida y saltar arriba del cajón. Aterrizar suavemente y con amortiguación. Descender caminando un pie a la vez.', 3, '6', 'Chaleco 5-10k', 7),
('SALTOS_CON_CARGA', 'Glúteos / Estabilizadores', 'Saltos unipodales cargados (Weighted Single Leg Jumps)', 'Chaleco o mancuerna ligera en copa', 'Apoyo unipodal estable. Bajar levemente la cadera y saltar de forma vertical o de proyección hacia adelante, controlando rigurosamente la caída y rodilla alineada.', 3, '5 por pierna', '4-8kg', 7);

-- FOCO 6: DERIVADOS_HALTEROFILIA (Derivados olímpicos de levantamiento de pesas)
INSERT INTO fisica_gimnasio_ejercicio_plantilla (target_group, grupo_muscular, ejercicio, equipamiento, tecnica_ejecucion, series, repeticiones, carga_kg, rpe_sugerido) VALUES
('DERIVADOS_HALTEROFILIA', 'Cadena Posterior / Potencia total', 'Cargada de fuerza colgado (Hang Power Clean)', 'Barra olímpica, Discos bumpers', 'Barra sobre rodillas con bisagra de cadera. Realizar extensión explosiva de cadera-rodilla (triple extensión), encoger hombros y recibir la barra sobre deltoides frontales.', 4, '3-4', '65-75% 1RM', 8),
('DERIVADOS_HALTEROFILIA', 'Cadena Posterior / Hombros', 'Arrancada de potencia colgado (Hang Power Snatch)', 'Barra olímpica, Discos bumpers, agarre ancho', 'Barra sobre rodillas, extender explosivamente el cuerpo entero y proyectar la barra en un solo movimiento fluido sobre la cabeza, recibiéndola en flexión corta con brazos bloqueados.', 3, '3', '60-70% 1RM', 8),
('DERIVADOS_HALTEROFILIA', 'Trapecios / Glúteos', 'Jalón de cargada colgado (Hang Clean Pull)', 'Barra olímpica, Discos', 'Partiendo desde arriba de las rodillas, extender cadera y rodillas explosivamente buscando triple extensión máxima y encogimiento de hombros sin flexionar los brazos.', 4, '4-5', '85-95% Clean', 8);

-- FOCO 7: GENERALES_SUPERIOR (Acondicionamiento y balance del tren superior)
INSERT INTO fisica_gimnasio_ejercicio_plantilla (target_group, grupo_muscular, ejercicio, equipamiento, tecnica_ejecucion, series, repeticiones, carga_kg, rpe_sugerido) VALUES
('GENERALES_SUPERIOR', 'Dorsales / Bíceps', 'Dominadas con agarre prono (Pull-ups)', 'Barra fija, cinturón de lastre (opcional)', 'Agarre prono más ancho que los hombros. Elevar el cuerpo traccionando codos hacia abajo hasta pasar la barbilla, descender de forma controlada estirando dorsales.', 4, '6-8', 'Peso corporal / Lastre', 8),
('GENERALES_SUPERIOR', 'Deltoides / Tríceps', 'Press de hombros con mancuernas (Dumbbell Shoulder Press)', 'Mancuernas, Banco con respaldo', 'Sentado con espalda firme. Empujar mancuernas verticalmente desde la altura de las orejas hacia arriba de manera controlada e impidiendo arquear excesivamente la espalda.', 3, '8-10', 'Carga moderada', 7),
('GENERALES_SUPERIOR', 'Espalda Alta / Dorsales', 'Remo unilateral con mancuerna', 'Mancuerna, Banco plano', 'Un pie y mano del mismo lado apoyados en el banco. Traccionar la mancuerna con el brazo libre hacia la cadera baja manteniendo espalda neutra, alineada y firme.', 3, '8-10 por lado', 'Carga moderada-alta', 8);

-- FOCO 8: GENERALES_INFERIOR (Fuerza general de empuje y tracción del tren inferior)
INSERT INTO fisica_gimnasio_ejercicio_plantilla (target_group, grupo_muscular, ejercicio, equipamiento, tecnica_ejecucion, series, repeticiones, carga_kg, rpe_sugerido) VALUES
('GENERALES_INFERIOR', 'Cuádriceps / Glúteos', 'Zancadas caminando con mancuernas (Dumbbell Walking Lunges)', 'Mancuernas', 'Dar un paso largo bajando la cadera hasta que la rodilla trasera roce el suelo. Empujar con firmeza desde el talón delantero y avanzar con el otro pie de forma fluida.', 3, '8-10 por pierna', 'Carga moderada', 7),
('GENERALES_INFERIOR', 'Cuádriceps / Glúteo mayor', 'Sentadilla búlgara con mancuernas', 'Mancuernas, Banco para pie trasero', 'Un pie elevado atrás en banco. Bajar cadera verticalmente manteniendo el peso y equilibrio en talón del pie delantero, impidiendo que la rodilla colapse en valgo.', 3, '8 por pierna', 'Carga moderada', 8),
('GENERALES_INFERIOR', 'Cuádriceps / Recto Femoral', 'Extensión de cuádriceps en máquina (Leg Extension)', 'Máquina de leg extension', 'Sentado, extender las rodillas completamente de forma controlada, sostener la contracción arriba por 1 segundo y bajar de forma lenta aguantando el peso.', 3, '10-12', 'Carga moderada', 7);

-- FOCO 9: CORE_ZONA_MEDIA (Estabilidad lumbo-pélvica y transferencia de fuerzas)
INSERT INTO fisica_gimnasio_ejercicio_plantilla (target_group, grupo_muscular, ejercicio, equipamiento, tecnica_ejecucion, series, repeticiones, carga_kg, rpe_sugerido) VALUES
('CORE_ZONA_MEDIA', 'Core / Oblicuos (Anti-rotación)', 'Press Pallof con banda elástica (Pallof Press)', 'Banda elástica o polea', 'De pie de lado al anclaje, sostener banda frente al esternón con dos manos y extender los brazos hacia adelante resistiendo la tensión lateral rotatoria sin rotar torso.', 3, '12 por lado', 'Tensión media', 7),
('CORE_ZONA_MEDIA', 'Transverso / Oblicuos / Hombros', 'Plancha alta con arrastre de saco (Plank Pull-Through)', 'Saco de arena o mancuerna (5-10kg)', 'En posición de plancha alta (manos apoyadas). Con la mano contraria, jalar la carga por debajo del cuerpo de un lado al otro manteniendo caderas estables sin balanceos.', 3, '10-12 pasadas', 'Saco 5-10kg', 7),
('CORE_ZONA_MEDIA', 'Abdomen (Anti-extensión)', 'Rollout abdominal con rodillo (Ab Wheel Rollout)', 'Rueda abdominal', 'De rodillas, rodar hacia adelante extendiendo el cuerpo manteniendo el core y los glúteos fuertemente contraídos (evitando arquear la zona lumbar), regresar activando el core.', 3, '8-10', 'Peso corporal', 8);

-- FOCO 10: ISQUIOSURALES_CADENA_POSTERIOR (Fortalecimiento excéntrico y resiliencia de isquiotibiales)
INSERT INTO fisica_gimnasio_ejercicio_plantilla (target_group, grupo_muscular, ejercicio, equipamiento, tecnica_ejecucion, series, repeticiones, carga_kg, rpe_sugerido) VALUES
('ISQUIOSURALES_CADENA_POSTERIOR', 'Isquiotibiales (Excéntrico)', 'Ejercicio nórdico de isquiotibiales (Nordic Hamstring Curl)', 'Colchoneta, compañero o anclaje firme', 'De rodillas, tobillos fijados. Dejarse caer lentamente hacia adelante manteniendo el cuerpo rígido desde la cadera, usando los isquios para frenar la caída. Empujar abajo para regresar.', 3, '5-6', 'Peso corporal', 9),
('ISQUIOSURALES_CADENA_POSTERIOR', 'Isquiotibiales / Glúteos', 'Peso muerto unilateral con mancuernas (Single Leg RDL)', 'Mancuerna o kettlebell', 'Apoyo unipodal. Flexionar cadera empujándola hacia atrás mientras la pierna libre se eleva alineada con el torso. Traccionar desde el isquiosural y glúteo para subir.', 3, '8 por pierna', '12-20kg', 8),
('ISQUIOSURALES_CADENA_POSTERIOR', 'Isquiotibiales / Glúteos', 'Puente con deslizamiento de talones (Hamstring Slides)', 'Deslizadores o toalla en piso liso', 'Boca arriba, elevar pelvis en puente. Deslizar talones hacia adelante lentamente con cadera alta, y recogerlos de forma fluida contrayendo potentemente los isquiotibiales.', 3, '8-10', 'Peso corporal', 7);

-- FOCO 11: TODOS (Ejercicios generales para calentamiento o perfil básico sin déficits)
INSERT INTO fisica_gimnasio_ejercicio_plantilla (target_group, grupo_muscular, ejercicio, equipamiento, tecnica_ejecucion, series, repeticiones, carga_kg, rpe_sugerido) VALUES
('TODOS', 'Piernas / Glúteos', 'Sentadilla profunda con copa (Goblet Squat)', 'Kettlebell o mancuerna pesada', 'Sostener peso frente al pecho en copa. Bajar rompiendo paralelo con espalda erguida y rodillas apuntando en dirección de pies. Subir empujando el suelo.', 3, '10', 'Carga ligera', 6),
('TODOS', 'Espalda Alta / Dorsales', 'Remo invertido colgado en barra (Inverted Row)', 'Barra en rack o correas de suspensión', 'Colgado boca arriba debajo de la barra, cuerpo recto. Traccionar jalando el pecho hacia la barra apretando los omóplatos, bajar con control sin descolgar hombros.', 3, '10-12', 'Peso corporal', 7),
('TODOS', 'Pectorales / Tríceps', 'Flexiones de brazos clásicas (Push-ups)', 'Ninguno / Colchoneta', 'Apoyo de manos al ancho de hombros. Bajar el pecho al suelo manteniendo el abdomen tenso, caderas alineadas y codos a 45 grados, extender brazos con control.', 3, '12-15', 'Peso corporal', 6);
