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

-- Enable RLS
alter table public.annual_activities enable row level security;

-- Create policy to allow all access (for demo purposes)
create policy "Enable all access for all users" on public.annual_activities
for all using (true) with check (true);

-- Enable RLS and policies for other tables (Attempt to fix visibility)
alter table public.microcycles enable row level security;
create policy "Enable all access for microcycles" on public.microcycles for all using (true) with check (true);

alter table public.citaciones enable row level security;
create policy "Enable all access for citaciones" on public.citaciones for all using (true) with check (true);

alter table public.players enable row level security;
create policy "Enable all access for players" on public.players for all using (true) with check (true);

alter table public.wellness_checkin enable row level security;
create policy "Enable all access for wellness_checkin" on public.wellness_checkin for all using (true) with check (true);

alter table public.internal_load enable row level security;
create policy "Enable all access for internal_load" on public.internal_load for all using (true) with check (true);

alter table public.gps_tareas enable row level security;
create policy "Enable all access for gps_tareas" on public.gps_tareas for all using (true) with check (true);

alter table public.antropometria enable row level security;
create policy "Enable all access for antropometria" on public.antropometria for all using (true) with check (true);

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
  acc_decc_ai_n float8
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

-- Enable RLS for physical_tests
alter table public.physical_tests enable row level security;
create policy "Enable all access for physical_tests" on public.physical_tests for all using (true) with check (true);

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
