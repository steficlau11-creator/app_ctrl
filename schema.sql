-- =========================================================
-- ESQUEMA: Gestión de camioneros, viajes, descansos y notas
-- Ejecuta este script completo en Supabase → SQL Editor → New query
-- =========================================================

create extension if not exists "pgcrypto";

-- ---------- CAMIONEROS ----------
create table if not exists drivers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  license_number text,
  photo_url text,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------- VIAJES ----------
create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid references drivers(id) on delete set null,
  origin text not null,
  destination text not null,
  start_date date,
  end_date date,
  km_start numeric,
  km_end numeric,
  status text not null default 'planificado', -- planificado | en_curso | finalizado
  notes text,
  created_at timestamptz not null default now()
);

-- ---------- DESCANSOS / KM ----------
create table if not exists rests (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid references drivers(id) on delete set null,
  trip_id uuid references trips(id) on delete set null,
  rest_type text not null default 'descanso', -- descanso | comida | pernocta
  start_time timestamptz not null,
  end_time timestamptz,
  km_at_rest numeric,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------- NOTAS Y RECORDATORIOS ----------
create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid references drivers(id) on delete set null,
  title text not null,
  content text,
  reminder_at timestamptz,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- ENLACES DE INTERÉS ----------
create table if not exists links (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null,
  category text,
  notes text,
  created_at timestamptz not null default now()
);

-- =========================================================
-- ROW LEVEL SECURITY
-- Se habilita RLS y se permite acceso completo a la clave "anon".
-- Esto es válido para un panel interno/personal donde la propia
-- anon key ya actúa como "contraseña" del proyecto (no la compartas
-- públicamente). Si en el futuro esta app la va a usar más gente
-- y quieres separar quién ve qué, se añade Supabase Auth y se
-- sustituyen estas políticas por unas basadas en auth.uid().
-- =========================================================

alter table drivers enable row level security;
alter table trips   enable row level security;
alter table rests   enable row level security;
alter table notes   enable row level security;
alter table links   enable row level security;

create policy "anon full access drivers" on drivers for all using (true) with check (true);
create policy "anon full access trips"   on trips   for all using (true) with check (true);
create policy "anon full access rests"   on rests   for all using (true) with check (true);
create policy "anon full access notes"   on notes   for all using (true) with check (true);
create policy "anon full access links"   on links   for all using (true) with check (true);

-- Índices útiles
create index if not exists idx_trips_driver on trips(driver_id);
create index if not exists idx_rests_driver on rests(driver_id);
create index if not exists idx_rests_trip on rests(trip_id);
create index if not exists idx_notes_reminder on notes(reminder_at);
