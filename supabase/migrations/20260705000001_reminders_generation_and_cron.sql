-- Derives `reminders` rows from the source tables (dog vaccines/meds due
-- soon, car services near/at their km threshold, missed med doses).
-- Each branch is guarded so a re-run within the same day doesn't create
-- duplicate reminders for the same source item.
create or replace function public.generate_reminders()
returns void
language plpgsql
as $$
begin
  -- Dog items due within the next 24h (or already overdue).
  insert into public.reminders (user_id, source_module, source_id, title, body, image_url, fire_at, channels)
  select di.user_id, 'dog', di.id, di.name, di.description, di.image_url, di.due_at, '{push}'::public.reminder_channel[]
  from public.dog_items di
  where di.active
    and di.due_at is not null
    and di.due_at <= now() + interval '1 day'
    and not exists (
      select 1 from public.reminders r
      where r.source_module = 'dog' and r.source_id = di.id and r.created_at > now() - interval '1 day'
    );

  -- Car services within 1000 km of due (or already overdue).
  insert into public.reminders (user_id, source_module, source_id, title, body, fire_at, channels)
  select
    cs.user_id,
    'car',
    cs.id,
    'Service due: ' || coalesce(cs.label, cs.part::text),
    case
      when (cs.last_service_km + cs.interval_km - c.current_odometer_km) <= 0
        then 'Overdue by ' || abs(cs.last_service_km + cs.interval_km - c.current_odometer_km) || ' km'
      else (cs.last_service_km + cs.interval_km - c.current_odometer_km) || ' km remaining'
    end,
    now(),
    '{push}'::public.reminder_channel[]
  from public.car_services cs
  join public.cars c on c.id = cs.car_id
  where cs.active
    and cs.interval_km is not null
    and cs.last_service_km is not null
    and (cs.last_service_km + cs.interval_km - c.current_odometer_km) <= 1000
    and not exists (
      select 1 from public.reminders r
      where r.source_module = 'car' and r.source_id = cs.id and r.created_at > now() - interval '1 day'
    );

  -- Missed med doses: a dose slot today whose time has passed with no
  -- matching taken=true log. (Times are treated as UTC for this MVP —
  -- no per-profile timezone conversion yet.)
  insert into public.reminders (user_id, source_module, source_id, title, body, fire_at, channels)
  select
    m.user_id,
    'meds',
    m.id,
    'Missed dose: ' || m.name,
    coalesce(m.dosage, ''),
    (current_date + t.time_slot::time) at time zone 'UTC',
    '{push}'::public.reminder_channel[]
  from public.meds m
  cross join lateral unnest(m.times_of_day) as t(time_slot)
  where m.active
    and extract(dow from now()) = any(m.days_of_week)
    and (current_date + t.time_slot::time) at time zone 'UTC' <= now()
    and not exists (
      select 1 from public.med_logs l
      where l.med_id = m.id and l.taken = true
        and l.scheduled_for = (current_date + t.time_slot::time) at time zone 'UTC'
    )
    and not exists (
      select 1 from public.reminders r
      where r.source_module = 'meds' and r.source_id = m.id
        and r.fire_at = (current_date + t.time_slot::time) at time zone 'UTC'
    );
end;
$$;

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.schedule('generate-reminders', '*/15 * * * *', $$select public.generate_reminders()$$);

-- CRON_SECRET is read from Supabase Vault at execution time (never a
-- literal in this file) — see supabase/README.md for the one-time
-- `select vault.create_secret(...)` setup step this depends on.
select cron.schedule(
  'dispatch-reminders',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://xlvpuagnzukdcxywizzi.supabase.co/functions/v1/dispatch-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
