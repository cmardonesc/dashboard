-- Create anual_activities table (Simplified version)
create table if not exists public.anual_activities (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  fecha date not null,
  actividad text not null,
  categoria text,
  observacion text
);

-- Create lesionados table
create table if not exists public.lesionados (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  player_id int not null references public.players(id_del_jugador),
  microcycle_id uuid references public.microcycles(id),
  category_id int,
  fecha_inicio date not null,
  estado text default 'Activo',
  disponibilidad text default 'No Disponible',
  localizacion text,
  tipo_lesion text,
  momento_lesion text,
  lado text,
  mecanismo text,
  diagnostico_clinico text,
  diagnostico_funcional text,
  restricciones text,
  fecha_estimada_retorno date,
  fecha_alta date,
  observaciones text,
  ultimo_control date
);

-- Create medical_daily_reports table
create table if not exists public.medical_daily_reports (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  player_id int not null references public.players(id_del_jugador),
  category_id int,
  microcycle_id uuid references public.microcycles(id),
  report_date date default current_date,
  observation text not null,
  severity text default 'low'
);

-- Create medical_treatments table
create table if not exists public.medical_treatments (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  player_id int not null references public.players(id_del_jugador),
  category_id int,
  treatment_date date default current_date,
  description text not null
);

-- Create cronograma_semanal table
create table if not exists public.cronograma_semanal (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  id_microcycles uuid references public.microcycles(id),
  fecha date not null,
  hora time not null,
  actividad text not null,
  lugar text,
  id_categoria int
);

-- Create tareas_semanales table
create table if not exists public.tareas_semanales (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  id_microcycles uuid references public.microcycles(id),
  fecha date not null,
  dinamica text,
  jornada text default 'AM',
  nombre text not null,
  observacion text
);

-- Enable RLS for new tables
alter table public.anual_activities enable row level security;
alter table public.lesionados enable row level security;
alter table public.medical_daily_reports enable row level security;
alter table public.medical_treatments enable row level security;
alter table public.cronograma_semanal enable row level security;
alter table public.tareas_semanales enable row level security;

-- Create policies for new tables
create policy "Enable all access for anual_activities" on public.anual_activities for all using (true) with check (true);
create policy "Enable all access for lesionados" on public.lesionados for all using (true) with check (true);
create policy "Enable all access for medical_daily_reports" on public.medical_daily_reports for all using (true) with check (true);
create policy "Enable all access for medical_treatments" on public.medical_treatments for all using (true) with check (true);
create policy "Enable all access for cronograma_semanal" on public.cronograma_semanal for all using (true) with check (true);
create policy "Enable all access for tareas_semanales" on public.tareas_semanales for all using (true) with check (true);

-- Create annual_activities table
create table if not exists public.annual_activities (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  fecha date not null,
  hora_inicio time without time zone default '10:00:00',
  tipo_actividad text not null,
  categoria text,
  observacion text,
  lugar text default 'JUAN PINTO DURAN'
);

-- Create players table
create table if not exists public.players (
  id_del_jugador int primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  nombre text not null,
  apellido1 text not null,
  apellido2 text,
  fecha_nacimiento date,
  club text,
  id_club int,
  posicion text,
  categoria text,
  anio int
);

-- Create profiles table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  role text default 'player',
  id_del_jugador int references public.players(id_del_jugador),
  club_name text
);

-- Create clubes table
create table if not exists public.clubes (
  id_club int8 generated by default as identity primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  nombre text not null unique,
  codigo text not null unique,
  logo_url text,
  activo boolean default true
);

-- Create wellness_checkin table
create table if not exists public.wellness_checkin (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  id_del_jugador int not null references public.players(id_del_jugador),
  checkin_date date default current_date,
  fatigue int default 0,
  sleep_quality int default 0,
  stress int default 0,
  soreness int default 0,
  mood int default 0,
  molestias text,
  enfermedad text,
  unique(id_del_jugador, checkin_date)
);

-- Create internal_load table
create table if not exists public.internal_load (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  id_del_jugador int not null references public.players(id_del_jugador),
  session_date date default current_date,
  rpe int default 0,
  duration_min int default 0,
  srpe int,
  type text default 'FIELD',
  unique(id_del_jugador, session_date)
);

-- Create antropometria table
create table if not exists public.antropometria (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  id_del_jugador int not null references public.players(id_del_jugador),
  fecha_medicion date default current_date,
  peso float8,
  talla_cm float8,
  masa_muscular_pct float8,
  masa_adiposa_pct float8,
  sumatoria_6_pliegues float8,
  nombre_raw text,
  unique(id_del_jugador, fecha_medicion)
);

-- Create citaciones table
create table if not exists public.citaciones (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  id_del_jugador int not null references public.players(id_del_jugador),
  fecha date not null,
  motivo text,
  estado text default 'Pendiente'
);

-- Create microcycles table
create table if not exists public.microcycles (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  category_id int,
  type text,
  start_date date,
  end_date date,
  city text,
  country text,
  created_by uuid references auth.users,
  code text unique
);

-- Enable RLS for all tables
alter table public.annual_activities enable row level security;
alter table public.players enable row level security;
alter table public.profiles enable row level security;
alter table public.clubes enable row level security;
alter table public.wellness_checkin enable row level security;
alter table public.internal_load enable row level security;
alter table public.antropometria enable row level security;
alter table public.citaciones enable row level security;
alter table public.microcycles enable row level security;

-- Create policies to allow all access (for demo purposes)
create policy "Enable all access for all users" on public.annual_activities for all using (true) with check (true);
create policy "Enable all access for players" on public.players for all using (true) with check (true);
create policy "Enable all access for profiles" on public.profiles for all using (true) with check (true);
create policy "Enable all access for clubes" on public.clubes for all using (true) with check (true);
create policy "Enable all access for wellness_checkin" on public.wellness_checkin for all using (true) with check (true);
create policy "Enable all access for internal_load" on public.internal_load for all using (true) with check (true);
create policy "Enable all access for antropometria" on public.antropometria for all using (true) with check (true);
create policy "Enable all access for citaciones" on public.citaciones for all using (true) with check (true);
create policy "Enable all access for microcycles" on public.microcycles for all using (true) with check (true);

-- Create trigger for profile creation on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role, id_del_jugador, club_name)
  values (
    new.id, 
    coalesce(new.raw_user_meta_data->>'role', 'player'), 
    (new.raw_user_meta_data->>'id_del_jugador')::int,
    new.raw_user_meta_data->>'club_name'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create gps_import table (Totals)
create table if not exists public.gps_import (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  id_del_jugador int not null,
  fecha date not null,
  minutos float8,
  dist_total_m float8,
  m_por_min float8,
  dist_ai_m_15_kmh float8,
  dist_mai_m_20_kmh float8,
  dist_sprint_m_25_kmh float8,
  sprints_n float8,
  vel_max_kmh float8,
  acc_decc_ai_n float8,
  jugador text,
  unique(id_del_jugador, fecha)
);

alter table public.gps_import enable row level security;
create policy "Enable all access for gps_import" on public.gps_import for all using (true) with check (true);

-- Create gps_tareas table (Tasks)
create table if not exists public.gps_tareas (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  id_del_jugador int not null,
  fecha date not null,
  tarea text not null,
  bloque int,
  minutos float8,
  dist_total_m float8,
  m_por_min float8,
  dist_ai_m_15_kmh float8,
  dist_mai_m_20_kmh float8,
  dist_sprint_m_25_kmh float8,
  sprints_n float8,
  vel_max_kmh float8,
  acc_decc_ai_n float8,
  jugador_nombre text,
  unique(id_del_jugador, fecha, tarea)
);

alter table public.gps_tareas enable row level security;
create policy "Enable all access for gps_tareas" on public.gps_tareas for all using (true) with check (true);

-- Create physical_tests table
create table if not exists public.physical_tests (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  id_del_jugador int not null,
  fecha date not null,
  test_type text not null, -- 'IMTP', 'VELOCIDAD', 'ACELERACION', 'VO2MAX'
  value float8 not null,
  unit text,
  observation text,
  unique(id_del_jugador, fecha, test_type)
);

-- Create evaluaciones_imtp_salto table
create table if not exists public.evaluaciones_imtp_salto (
  id int8 generated by default as identity primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  jugador text,
  id_del_jugador int8 not null,
  fecha_test date not null,
  peso numeric,
  imtp_fuerza_n numeric,
  imtp_f_relativa_n_kg numeric,
  imtp_asimetria numeric,
  imtp_debil text,
  fuerza_cmj numeric,
  cmj_rsi_mod numeric,
  cmj_altura_salto_im numeric,
  cmj_salto_tv numeric,
  cmj_peak_pot_relativa numeric,
  cmj_asimetria_aterrizaje numeric,
  landing_n numeric,
  landing_relativo numeric,
  cmj_pierna_debil text,
  dsi_valor numeric,
  avk_peak_pot_relativa numeric,
  avk_indice_uso_brazos_tv numeric,
  avk_x_tv numeric,
  avk_x_im numeric,
  avk_indice_uso_brazos_im numeric,
  avk_indice_brazos_im numeric,
  slcmj_izq_altura_im numeric,
  slcmj_izq_altura_tv numeric,
  slcmj_der_altura_im numeric,
  slcmj_der_altura_tv numeric,
  slcmj_diferencia_pct_im numeric,
  slcmj_diferencia_pct_tv numeric,
  deficit_bilateral numeric,
  altura_x_rsi_mod numeric,
  unique(id_del_jugador, fecha_test)
);

-- Create velocidad_tests table
create table if not exists public.velocidad_tests (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  jugador text,
  id_del_jugador int not null,
  fecha date not null,
  tiempo_10m float8,
  vel_10m float8,
  tiempo_10_20m float8,
  vel_10_20m float8,
  tiempo_20_30m float8,
  vel_20_30m float8,
  vel_max_kmh float8,
  tiempo_total float8 not null,
  unique(id_del_jugador, fecha)
);

-- Create vo2max_tests table
create table if not exists public.vo2max_tests (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  jugador text,
  id_del_jugador int not null,
  fecha date not null,
  peso float8,
  vt1_vel float8,
  vt1_pct float8,
  vt1_fc float8,
  vt2_vel float8,
  vt2_pct float8,
  vt2_fc float8,
  vo2_max float8 not null,
  vam float8,
  fc_max float8,
  nivel float8,
  pasada float8,
  mts float8,
  vfa float8,
  observaciones text,
  unique(id_del_jugador, fecha)
);

-- Enable RLS for physical_tests
alter table public.physical_tests enable row level security;
create policy "Enable all access for physical_tests" on public.physical_tests for all using (true) with check (true);

-- Enable RLS for evaluaciones_imtp
alter table public.evaluaciones_imtp_salto enable row level security;
create policy "Enable all access for evaluaciones_imtp_salto" on public.evaluaciones_imtp_salto for all using (true) with check (true);

-- Enable RLS for velocidad_tests
alter table public.velocidad_tests enable row level security;
create policy "Enable all access for velocidad_tests" on public.velocidad_tests for all using (true) with check (true);

-- Enable RLS for vo2max_tests
alter table public.vo2max_tests enable row level security;
create policy "Enable all access for vo2max_tests" on public.vo2max_tests for all using (true) with check (true);

-- Create referencias_gps table
create table if not exists public.referencias_gps (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  "Tipo" text not null, -- 'PROMEDIO'
  "Categoria" text not null,
  "Posicion" text not null,
  dist_total_m float8 default 0,
  m_por_min float8 default 0,
  dist_ai_m_15_kmh float8 default 0,
  dist_mai_m_20_kmh float8 default 0,
  dist_sprint_m_25_kmh float8 default 0,
  acc_decc_ai_n float8 default 0
);

alter table public.referencias_gps enable row level security;
create policy "Enable all access for referencias_gps" on public.referencias_gps for all using (true) with check (true);

-- Create gps_pronosticos table
create table if not exists public.gps_pronosticos (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  microcycle_id uuid references public.microcycles(id) on delete cascade,
  fecha date not null,
  dist_total_min float8 default 0,
  dist_total_max float8 default 0,
  m_por_min_min float8 default 0,
  m_por_min_max float8 default 0,
  hms_min float8 default 0, -- dist_mai_m_20_kmh
  hms_max float8 default 0,
  sprint_min float8 default 0, -- dist_sprint_m_25_kmh
  sprint_max float8 default 0,
  sprints_count_min float8 default 0,
  sprints_count_max float8 default 0,
  acc_decc_min float8 default 0,
  acc_decc_max float8 default 0,
  observaciones text,
  unique(microcycle_id, fecha)
);

alter table public.gps_pronosticos enable row level security;
create policy "Enable all access for gps_pronosticos" on public.gps_pronosticos for all using (true) with check (true);

-- Seed some default references
insert into public.referencias_gps ("Tipo", "Categoria", "Posicion", dist_total_m, m_por_min, dist_ai_m_15_kmh, dist_mai_m_20_kmh, dist_sprint_m_25_kmh, acc_decc_ai_n)
values 
('PROMEDIO', 'SUB_13', 'DELANTERO', 3800, 60, 350, 60, 5, 70),
('PROMEDIO', 'SUB_13', 'MEDIO', 4200, 65, 400, 70, 3, 85),
('PROMEDIO', 'SUB_13', 'DEFENSA', 3500, 55, 300, 50, 4, 65),
('PROMEDIO', 'SUB_13', 'PORTERO', 1200, 20, 30, 5, 1, 20),
('PROMEDIO', 'SUB_14', 'DELANTERO', 4000, 62, 380, 70, 6, 80),
('PROMEDIO', 'SUB_14', 'MEDIO', 4400, 68, 450, 80, 4, 95),
('PROMEDIO', 'SUB_14', 'DEFENSA', 3800, 58, 330, 60, 5, 75),
('PROMEDIO', 'SUB_14', 'PORTERO', 1300, 22, 40, 8, 1, 25),
('PROMEDIO', 'SUB_15', 'DELANTERO', 4200, 65, 420, 80, 8, 90),
('PROMEDIO', 'SUB_15', 'MEDIO', 4600, 70, 500, 90, 5, 105),
('PROMEDIO', 'SUB_15', 'DEFENSA', 4000, 62, 360, 70, 6, 85),
('PROMEDIO', 'SUB_15', 'PORTERO', 1400, 24, 45, 10, 2, 28),
('PROMEDIO', 'SUB_16', 'DELANTERO', 4400, 68, 460, 90, 9, 95),
('PROMEDIO', 'SUB_16', 'MEDIO', 4800, 72, 550, 110, 5, 115),
('PROMEDIO', 'SUB_16', 'DEFENSA', 4100, 64, 380, 75, 7, 88),
('PROMEDIO', 'SUB_16', 'PORTERO', 1450, 24, 48, 10, 2, 29),
('PROMEDIO', 'SUB_17', 'DELANTERO', 4500, 70, 500, 100, 10, 100),
('PROMEDIO', 'SUB_17', 'MEDIO', 5000, 75, 600, 120, 5, 120),
('PROMEDIO', 'SUB_17', 'DEFENSA', 4200, 65, 400, 80, 8, 90),
('PROMEDIO', 'SUB_17', 'PORTERO', 1500, 25, 50, 10, 2, 30),
('PROMEDIO', 'SUB_20', 'DELANTERO', 4800, 75, 550, 110, 12, 110),
('PROMEDIO', 'SUB_20', 'MEDIO', 5300, 80, 650, 130, 6, 130),
('PROMEDIO', 'SUB_20', 'DEFENSA', 4500, 70, 450, 90, 10, 100),
('PROMEDIO', 'ADULTA', 'DELANTERO', 5000, 80, 600, 120, 15, 120),
('PROMEDIO', 'ADULTA', 'MEDIO', 5500, 85, 700, 140, 8, 140),
('PROMEDIO', 'ADULTA', 'DEFENSA', 4800, 75, 500, 100, 12, 110)
on conflict do nothing;

-- Seed clubs with logos
insert into public.clubes (nombre, codigo, logo_url, activo)
values 
('Federación', 'federacion', 'https://drive.google.com/file/d/1XreCc1WyUBNc7i6ezqS1IAB1OX8A_QTF/view?usp=sharing', true),
('Atlético Colina', 'colina', 'https://drive.google.com/file/d/1XreCc1WyUBNc7i6ezqS1IAB1OX8A_QTF/view?usp=sharing', true),
('Audax Italiano', 'audax', 'https://drive.google.com/file/d/1IkIO3ncMNX7m_EtENvRl_rhfXik05Gv4/view?usp=sharing', true),
('Brujas de Salamanca', 'brujas', 'https://drive.google.com/file/d/1hLbrL2P4S2ZoT1nnl85sMqGwe5DwWpz6/view?usp=sharing', true),
('Cobreloa', 'cobreloa', 'https://drive.google.com/file/d/1zQojlLXj6FpkY-ShbDao1-Tedtu0751c/view?usp=sharing', true),
('Cobresal', 'cobresal', 'https://drive.google.com/file/d/1SsY_tni1DMwTJR6C-o0Q6qTXkGWsudXN/view?usp=sharing', true),
('Colchagua', 'colchagua', 'https://drive.google.com/file/d/1flk-fQDuTQB0DA4qSc-OgQOFu6nKs5IS/view?usp=sharing', true),
('Colo-Colo', 'colocolo', 'https://drive.google.com/file/d/1co-5tVYtqe52Nn10kkGTBTKzEsYlApNw/view?usp=sharing', true),
('Concón National', 'concon', 'https://drive.google.com/file/d/1X3nhQFdumNPOd3waOYRg6dUqqt4WqdjF/view?usp=sharing', true),
('Coquimbo Unido', 'coquimbo', 'https://drive.google.com/file/d/1C3jDIcAGpZUI7x_b3q3o9MyQkEOdvy5w/view?usp=sharing', true),
('Curicó Unido', 'curico', 'https://drive.google.com/file/d/1_ugp9q_aNxbiy5MSDltys1q8xPssaCxV/view?usp=sharing', true),
('Deportes Antofagasta', 'antofagasta', 'https://drive.google.com/file/d/1tqeTXHob0aBCUL1PPuz7C6eKtAlO8JO9/view?usp=sharing', true),
('Deportes Concepción', 'concepcion', 'https://drive.google.com/file/d/1AhFIz-YbpgyDfEY_Nr5i3ZZh_uuPBBo6/view?usp=sharing', true),
('Deportes Copiapó', 'copiapo', 'https://drive.google.com/file/d/1KLnsILkqpOC_gUgljNPEqmf8nrfXIxEh/view?usp=sharing', true),
('Deportes Iquique', 'iquique', 'https://drive.google.com/file/d/1JpFW8NidSz7n9kJsHAqASvLc8RIjnRb3/view?usp=sharing', true),
('Deportes La Serena', 'serena', 'https://drive.google.com/file/d/1_9nqKVvWXY-kD65lBA6ErRXQ3YgfWbuZ/view?usp=sharing', true),
('Deportes Limache', 'limache', 'https://drive.google.com/file/d/13zpWlLytiwIGJsgudeBaNM1zqz3rxoNN/view?usp=sharing', true),
('Deportes Linares', 'linares', 'https://drive.google.com/file/d/1yfruBY-GqkE4izP6wpvSG5xDfHQyfSYl/view?usp=sharing', true),
('Deportes Recoleta', 'recoleta', 'https://drive.google.com/file/d/1XRFiFjmZRBKkRt4kBAGgb-DVHFfSHsd-/view?usp=sharing', true),
('Deportes Rengo', 'rengo', 'https://drive.google.com/file/d/1KvoA8s4j4i5fbFFvES8hbFiBQrzBXxej/view?usp=sharing', true),
('Deportes Santa Cruz', 'santacruz', 'https://drive.google.com/file/d/1STujZpx6Yc0L50GsjpyC2TsVsRPH6gxA/view?usp=sharing', true),
('Deportes Temuco', 'temuco', 'https://drive.google.com/file/d/1G3zTAk3Y97YiMSQ5taJ4ZIdQYua1eniE/view?usp=sharing', true),
('Everton', 'everton', 'https://drive.google.com/file/d/1dCcZssetKjyFV27Bg6dhw33FFoxJqUSM/view?usp=sharing', true),
('General Velásquez', 'generalvelasquez', 'https://drive.google.com/file/d/1pEA995FDJ1EACB1QgjoXB2Rt836cST-3/view?usp=sharing', true),
('Huachipato', 'huachipato', 'https://drive.google.com/file/d/1htmaRYkpwbVsKn2Lsq91AQKD70q7oKns/view?usp=sharing', true),
('Lota Schwager', 'lota', 'https://drive.google.com/file/d/1UF9euIBzCPjd4fR_6w95YGUe5kjfOkvw/view?usp=sharing', true),
('Magallanes', 'magallanes', 'https://drive.google.com/file/d/1olNayy4I8kF_7HyJtAa38N8gUEapZyVV/view?usp=sharing', true),
('Ñublense', 'nublense', 'https://drive.google.com/file/d/18s8oxImK3-BW7W45TJO4nnCPfhG1pMVI/view?usp=sharing', true),
('O''Higgins', 'ohiggins', 'https://drive.google.com/file/d/1fJejc6VEH_AQoKDGb6p4cG2-g72KBIka/view?usp=sharing', true),
('Palestino', 'palestino', 'https://drive.google.com/file/d/1OfGcu7KgdtCOSSOhifvZQjOhCyZutAUQ/view?usp=sharing', true),
('Provincial Osorno', 'osorno', 'https://drive.google.com/file/d/10XyGDYTNE1OR3Db0T9O4Ql9g-om2CPXV/view?usp=sharing', true),
('Provincial Ovalle', 'ovalle', 'https://drive.google.com/file/d/1of5C6Wbl0yc9gmCLVC7cT0B4ImagitmK/view?usp=sharing', true),
('Puerto Montt', 'puertomontt', 'https://drive.google.com/file/d/1eetaXWZ9L52L7bBlwxPVARe-nRh_2H_-/view?usp=sharing', true),
('Rangers de Talca', 'rangers', 'https://drive.google.com/file/d/1JhZCLVAgGC8AYFbiJnvYH9QbEDpCORwK/view?usp=sharing', true),
('Real San Joaquín', 'realsanjoaquin', 'https://drive.google.com/file/d/14-QZctnB4jR6TeuIte4SxZarTSVG6Dlv/view?usp=sharing', true),
('San Luis de Quillota', 'sanluis', 'https://drive.google.com/file/d/1vO2-auLXByRqXE9IF8PhZtLAi278rWPr/view?usp=sharing', true),
('San Marcos de Arica', 'sanmarcos', 'https://drive.google.com/file/d/1Of97TH33iAXFn7phF8mR9_U6RIZZgS3c/view?usp=sharing', true),
('Santiago City', 'santiagocity', 'https://drive.google.com/file/d/1ZAkKtAjvwgqtTyZgt2iqhixFpXMpHp-1/view?usp=sharing', true),
('Santiago Morning', 'santiagomorning', 'https://drive.google.com/file/d/1OmzxvOTxrDFvDHLCVnPROX3bwWq85WqB/view?usp=sharing', true),
('Santiago Wanderers', 'santiagowanderers', 'https://drive.google.com/file/d/1xVST7LALS5exStbFDDH9gPGloLIVwGwK/view?usp=sharing', true),
('Trasandino de Los Andes', 'trasandino', 'https://drive.google.com/file/d/1pMdD0_BC3yvv4WF-OoLi2MdpIMmzil9q/view?usp=sharing', true),
('Unión Española', 'unionespanola', 'https://drive.google.com/file/d/1VXU3ehA5V1d6dtT-20uD1OmAfR9yj0hG/view?usp=sharing', true),
('Unión La Calera', 'unionlacalera', 'https://drive.google.com/file/d/1WAA9Mo-wKemc3Fj694ySoZUhM9ICK8O7/view?usp=sharing', true),
('Unión San Felipe', 'unionsanfelipe', 'https://drive.google.com/file/d/1HXJw-elYvwJG1yn3DUaJGFl1hKmGClqf/view?usp=sharing', true),
('Universidad Católica', 'universidadcatolica', 'https://drive.google.com/file/d/1z5OO2cabtRy6qHigXumVJH_PCO7TMwTt/view?usp=sharing', true),
('Universidad de Chile', 'universidaddechile', 'https://drive.google.com/file/d/1Eqp8Cf4p--CcAZ43fFFnOfB06ztDPk_X/view?usp=sharing', true),
('Universidad de Concepción', 'universidaddeconcepcion', 'https://drive.google.com/file/d/1I5eQfDw0aaQysfZpbF_wmepx52BubEbm/view?usp=sharing', true)
on conflict (codigo) do update set 
  logo_url = excluded.logo_url,
  nombre = excluded.nombre;

-- Seed initial players
insert into public.players (id_del_jugador, nombre, apellido1, apellido2, club, posicion, categoria, anio)
values 
(1, 'Julian', 'Alvarez', '', 'Audax Italiano', 'Delantero Extremo', 'sub_20', 2006),
(2, 'Enzo', 'Fernandez', '', 'Audax Italiano', 'Volante', 'sub_20', 2006),
(3, 'Lionel', 'Messi', '', 'Cobreloa', 'Media Punta', 'sub_20', 2006),
(4, 'Cristian', 'Romero', '', 'Cobresal', 'Defensa Central', 'sub_20', 2006),
(5, 'Lisandro', 'Martinez', '', 'Colo-Colo', 'Defensa Central', 'sub_17', 2009),
(6, 'Nahuel', 'Molina', '', 'Colo-Colo', 'Defensa Lateral', 'sub_17', 2009),
(7, 'Rodrigo', 'De Paul', '', 'Coquimbo Unido', 'Volante', 'sub_17', 2009),
(8, 'Alexis', 'Mac Allister', '', 'Coquimbo Unido', 'Volante', 'sub_17', 2009),
(9, 'Eduardo', 'Vargas', '', 'Universidad de Chile', 'Centro Delantero', 'sub_17', 2009),
(10, 'Ben', 'Brereton', '', 'Universidad Católica', 'Delantero Extremo', 'sub_15', 2011),
(11, 'Gary', 'Medel', '', 'Universidad Católica', 'Defensa Central', 'sub_15', 2011),
(12, 'Arturo', 'Vidal', '', 'Colo-Colo', 'Volante', 'sub_15', 2011),
(13, 'Marcelino', 'Nuñez', '', 'Universidad Católica', 'Volante', 'sub_15', 2011),
(14, 'Darío', 'Osorio', '', 'Universidad de Chile', 'Delantero Extremo', 'sub_15', 2011)
on conflict (id_del_jugador) do nothing;

-- Function to safely create microcycles with unique code
create or replace function public.create_microcycle_safe(
  p_category_id int,
  p_type text,
  p_start_date date,
  p_end_date date,
  p_city text,
  p_country text,
  p_created_by uuid
)
returns void
language plpgsql
security definer
as $$
declare
  v_code text;
begin
  -- Generate a unique code: CAT-DATE-RANDOM
  v_code := 'MC-' || p_category_id || '-' || to_char(p_start_date, 'YYYYMMDD') || '-' || substring(md5(random()::text), 1, 5);
  
  -- Insert with the generated code
  insert into public.microcycles (
    category_id, type, start_date, end_date, city, country, created_by, code
  ) values (
    p_category_id, p_type, p_start_date, p_end_date, p_city, p_country, p_created_by, v_code
  );
end;
$$;

-- Tabla para reportes de competencia/partido
create table if not exists public.match_reports (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  id_del_jugador int not null references public.players(id_del_jugador),
  fecha date default current_date,
  rival text,
  resultado text,
  minutos_jugados int,
  rpe int,
  molestias text,
  enfermedad text,
  created_by uuid references auth.users
);

-- RLS para match_reports
alter table public.match_reports enable row level security;
create policy "Enable all access for match_reports" on public.match_reports for all using (true) with check (true);

