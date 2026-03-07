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
