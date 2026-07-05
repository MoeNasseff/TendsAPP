-- Core per-user data model for the 4 modules + shared reminders.
-- Every table is user-owned (user_id references auth.users) with RLS
-- restricting all operations to user_id = auth.uid().

create type public.dog_item_kind as enum ('vaccine', 'medicine');
create type public.schedule_type as enum ('once', 'recurring');
create type public.car_service_part as enum (
  'oil', 'oil_filter', 'air_filter', 'brake_pads', 'tires',
  'coolant', 'transmission', 'battery', 'other'
);
create type public.reminder_source_module as enum ('dog', 'car', 'meds', 'expense');
create type public.reminder_status as enum ('scheduled', 'sent', 'snoozed', 'cancelled', 'done');
create type public.reminder_channel as enum ('telegram', 'push', 'email', 'whatsapp');

-- ───────────────────────── Module 1: Expenses ─────────────────────────

create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color text,
  icon text,
  created_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid references public.expense_categories (id) on delete set null,
  amount numeric not null,
  currency text not null default 'EGP',
  note text,
  spent_at date not null default current_date,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Module 2: Dog Health ─────────────────────────

create table public.dogs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  breed text,
  birthdate date,
  photo_url text,
  created_at timestamptz not null default now()
);

create table public.dog_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  dog_id uuid not null references public.dogs (id) on delete cascade,
  kind public.dog_item_kind not null,
  name text not null,
  description text,
  image_url text,
  dose text,
  schedule_type public.schedule_type not null default 'once',
  due_at timestamptz,
  repeat_interval_days int,
  last_done_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Module 3: Car Maintenance ─────────────────────────

create table public.cars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  make text,
  model text,
  year int,
  current_odometer_km int not null default 0,
  photo_url text,
  created_at timestamptz not null default now()
);

create table public.car_services (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  car_id uuid not null references public.cars (id) on delete cascade,
  part public.car_service_part not null,
  label text,
  last_service_km int,
  last_service_date date,
  interval_km int,
  interval_days int,
  note text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.odometer_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  car_id uuid not null references public.cars (id) on delete cascade,
  reading_km int not null,
  logged_at date not null default current_date,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Module 4: My Meds ─────────────────────────

create table public.meds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  image_url text,
  dosage text,
  times_of_day text[] not null default '{}',
  days_of_week int[] not null default '{0,1,2,3,4,5,6}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.med_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  med_id uuid not null references public.meds (id) on delete cascade,
  scheduled_for timestamptz not null,
  taken boolean not null default false,
  taken_at timestamptz,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Shared reminders ─────────────────────────

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_module public.reminder_source_module not null,
  source_id uuid,
  title text not null,
  body text,
  image_url text,
  fire_at timestamptz not null,
  channels public.reminder_channel[] not null default '{}',
  status public.reminder_status not null default 'scheduled',
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index reminders_dispatch_idx on public.reminders (status, fire_at);

-- ───────────────────────── RLS ─────────────────────────

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'expense_categories', 'expenses',
    'dogs', 'dog_items',
    'cars', 'car_services', 'odometer_logs',
    'meds', 'med_logs',
    'reminders'
  ])
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create index %I_user_id_idx on public.%I (user_id)', t, t);
    execute format(
      'create policy "own_rows" on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t
    );
  end loop;
end $$;

-- ───────────────────────── Storage: per-user media bucket ─────────────────────────

insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do nothing;

create policy "media_select_own_folder" on storage.objects
  for select using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "media_insert_own_folder" on storage.objects
  for insert with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "media_update_own_folder" on storage.objects
  for update using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "media_delete_own_folder" on storage.objects
  for delete using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
