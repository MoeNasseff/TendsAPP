-- Body measurements: attributes that belong to the person go on profiles, and
-- one row per measuring session goes in body_measurements.
--
-- Every length is stored in centimetres and every weight in kilograms. Imperial
-- is a display conversion only. Storing whatever unit happened to be selected
-- would corrupt the history the moment someone switched units mid-series, and
-- there would be no way to tell afterwards which rows were which.

alter table public.profiles
  add column if not exists sex text check (sex in ('male', 'female')),
  add column if not exists unit_system text not null default 'metric'
    check (unit_system in ('metric', 'imperial')),
  add column if not exists height_cm numeric(5, 1),
  add column if not exists birth_date date;

create table if not exists public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  taken_at date not null default current_date,
  weight_kg numeric(5, 2),

  -- All sites nullable: a session records whatever was actually measured
  -- rather than forcing a full set every time.
  neck numeric(5, 1),
  shoulder numeric(5, 1),
  chest numeric(5, 1),      -- male figure
  bust numeric(5, 1),       -- female figure
  underbust numeric(5, 1),  -- female figure
  waist numeric(5, 1),
  belly numeric(5, 1),
  hips numeric(5, 1),
  thigh numeric(5, 1),
  calf numeric(5, 1),
  upper_arm numeric(5, 1),
  forearm numeric(5, 1),
  wrist numeric(5, 1),
  inseam numeric(5, 1),

  note text,
  created_at timestamptz not null default now()
);

alter table public.body_measurements enable row level security;

create index if not exists body_measurements_user_id_idx
  on public.body_measurements (user_id);

-- The history chart always reads one user's rows in date order, so the index
-- matches that access pattern rather than indexing taken_at on its own.
create index if not exists body_measurements_user_taken_idx
  on public.body_measurements (user_id, taken_at desc);

-- Matches the own_rows policy shape used by every other table, including the
-- (select auth.uid()) wrapping that keeps it an initplan instead of a per-row
-- re-evaluation. See 20260704000004_perf_fixes.sql.
create policy "own_rows" on public.body_measurements
  for all using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter publication supabase_realtime add table public.body_measurements;
