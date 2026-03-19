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
  enfermedad text
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
  type text default 'FIELD'
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
  nombre_raw text
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
  insert into public.profiles (id, role, id_del_jugador)
  values (new.id, coalesce(new.raw_user_meta_data->>'role', 'player'), (new.raw_user_meta_data->>'id_del_jugador')::int);
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
  observation text
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
  altura_x_rsi_mod numeric
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
  tiempo_total float8 not null
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
  observaciones text
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
