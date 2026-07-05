-- Perf fixes flagged by Supabase's own advisors after the core schema migration:
--
-- 1. auth_rls_initplan: policies referencing auth.uid() directly get
--    re-evaluated per row instead of once per query. Wrapping as
--    `(select auth.uid())` lets Postgres treat it as an initplan.
-- 2. unindexed_foreign_keys: a few secondary FK columns had no covering
--    index (user_id was already indexed by the previous migration).

-- ── Re-create RLS policies with (select auth.uid()) ──

drop policy "profiles_select_own" on public.profiles;
drop policy "profiles_insert_own" on public.profiles;
drop policy "profiles_update_own" on public.profiles;
drop policy "profiles_delete_own" on public.profiles;

create policy "profiles_select_own" on public.profiles
  for select using (id = (select auth.uid()));
create policy "profiles_insert_own" on public.profiles
  for insert with check (id = (select auth.uid()));
create policy "profiles_update_own" on public.profiles
  for update using (id = (select auth.uid()));
create policy "profiles_delete_own" on public.profiles
  for delete using (id = (select auth.uid()));

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
    execute format('drop policy "own_rows" on public.%I', t);
    execute format(
      'create policy "own_rows" on public.%I for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t
    );
  end loop;
end $$;

drop policy "media_select_own_folder" on storage.objects;
drop policy "media_insert_own_folder" on storage.objects;
drop policy "media_update_own_folder" on storage.objects;
drop policy "media_delete_own_folder" on storage.objects;

create policy "media_select_own_folder" on storage.objects
  for select using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "media_insert_own_folder" on storage.objects
  for insert with check (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "media_update_own_folder" on storage.objects
  for update using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "media_delete_own_folder" on storage.objects
  for delete using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ── Missing covering indexes on secondary foreign keys ──

create index car_services_car_id_idx on public.car_services (car_id);
create index dog_items_dog_id_idx on public.dog_items (dog_id);
create index expenses_category_id_idx on public.expenses (category_id);
create index med_logs_med_id_idx on public.med_logs (med_id);
create index odometer_logs_car_id_idx on public.odometer_logs (car_id);
