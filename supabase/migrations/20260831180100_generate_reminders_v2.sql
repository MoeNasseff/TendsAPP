-- Extends generate_reminders() with the catalogue's B1-B9 rows
-- (tasks/s30-catalogue.md, signed off 2026-08-31). The existing dog/car/meds
-- branches from 20260705000001_reminders_generation_and_cron.sql are carried
-- over unchanged, including their own created_at-window dedupe — this
-- session adds a real dedupe key (previous migration) for the new branches
-- only, rather than retrofitting working code.
--
-- Every new branch is skipped for a user who has explicitly disabled that
-- type in notification_prefs. Absence of a prefs row means "use the
-- catalogue's default" (On for everything except B8, which defaults Off).

-- ───────────────────────── next_day_of_month ─────────────────────────
-- payment_methods.due_day / statement_day are ints 1-31, not dates. This
-- returns the next real calendar date on/after `base` that matches
-- day-of-month `dom`, clamped to the last real day of a short month — so
-- due_day=31 in February means the 28th (or 29th), never an error and never
-- rolling into March. Checked against this month and next month; whichever
-- clamped date is earliest while still >= base wins.
create or replace function public.next_day_of_month(base date, dom int)
returns date
language sql
immutable
as $$
  select min(occurrence) from (
    select least(
      date_trunc('month', base)::date + (dom - 1),
      (date_trunc('month', base) + interval '1 month - 1 day')::date
    ) as occurrence
    union all
    select least(
      date_trunc('month', base + interval '1 month')::date + (dom - 1),
      (date_trunc('month', base + interval '1 month') + interval '1 month - 1 day')::date
    )
  ) candidates
  where occurrence >= base
$$;

-- ───────────────────────── next_digest_instant ─────────────────────────
-- The next wall-clock occurrence of `digest_hour:00` in timezone `tz`, as a
-- UTC instant. Postgres carries the IANA tz database natively, so this is
-- exact through Cairo's DST switch without hand-rolled offset math.
create or replace function public.next_digest_instant(tz text, digest_hour int)
returns timestamptz
language sql
stable
as $$
  select case
    when (now() at time zone tz)::time < make_time(digest_hour, 0, 0)
      then ((now() at time zone tz)::date + make_time(digest_hour, 0, 0)) at time zone tz
    else (((now() at time zone tz)::date + 1) + make_time(digest_hour, 0, 0)) at time zone tz
  end
$$;

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

  -- ───────────────────────── B1: Recurring bill due (5 days before) ─────────────────────────
  insert into public.reminders (user_id, source_module, source_id, title, body, fire_at, channels, dedupe_key)
  select
    rb.user_id, 'bill', rb.id,
    'Bill due: ' || rb.name,
    case when rb.is_variable then 'Amount not set — check before paying' else 'EGP ' || rb.amount end,
    now(),
    '{push}'::public.reminder_channel[],
    'bill_due:' || rb.id || ':' || rb.next_due_on
  from public.recurring_bills rb
  where rb.active
    and rb.next_due_on between current_date and current_date + 5
    and not exists (
      select 1 from public.notification_prefs np
      where np.user_id = rb.user_id and np.type = 'B1' and np.enabled = false
    )
  on conflict (dedupe_key) where dedupe_key is not null do nothing;

  -- ───────────────────────── B2: Recurring bill overdue (day after, once) ─────────────────────────
  insert into public.reminders (user_id, source_module, source_id, title, body, fire_at, channels, dedupe_key)
  select
    rb.user_id, 'bill', rb.id,
    'Overdue: ' || rb.name,
    'Was due ' || to_char(rb.next_due_on, 'DD Mon'),
    now(),
    '{push}'::public.reminder_channel[],
    'bill_overdue:' || rb.id || ':' || rb.next_due_on
  from public.recurring_bills rb
  where rb.active
    and rb.next_due_on = current_date - 1
    and not exists (
      select 1 from public.notification_prefs np
      where np.user_id = rb.user_id and np.type = 'B2' and np.enabled = false
    )
  on conflict (dedupe_key) where dedupe_key is not null do nothing;

  -- ───────────────────────── B3: Credit card payment due (5 days before) ─────────────────────────
  insert into public.reminders (user_id, source_module, source_id, title, body, fire_at, channels, dedupe_key)
  select
    pm.user_id, 'card', pm.id,
    'Card payment due: ' || pm.label,
    'Due ' || to_char(o.occurrence, 'DD Mon'),
    now(),
    '{push}'::public.reminder_channel[],
    'card_due:' || pm.id || ':' || o.occurrence
  from public.payment_methods pm
  cross join lateral (select public.next_day_of_month(current_date, pm.due_day) as occurrence) o
  where pm.active
    and pm.kind = 'credit_card'
    and pm.due_day is not null
    and o.occurrence <= current_date + 5
    and not exists (
      select 1 from public.notification_prefs np
      where np.user_id = pm.user_id and np.type = 'B3' and np.enabled = false
    )
  on conflict (dedupe_key) where dedupe_key is not null do nothing;

  -- ───────────────────────── B4: Card statement issued (on the day, Bell) ─────────────────────────
  insert into public.reminders (user_id, source_module, source_id, title, body, fire_at, channels, dedupe_key)
  select
    pm.user_id, 'card', pm.id,
    'Statement issued: ' || pm.label,
    null,
    now(),
    '{}'::public.reminder_channel[],
    'card_statement:' || pm.id || ':' || o.occurrence
  from public.payment_methods pm
  cross join lateral (select public.next_day_of_month(current_date, pm.statement_day) as occurrence) o
  where pm.active
    and pm.kind = 'credit_card'
    and pm.statement_day is not null
    and o.occurrence = current_date
    and not exists (
      select 1 from public.notification_prefs np
      where np.user_id = pm.user_id and np.type = 'B4' and np.enabled = false
    )
  on conflict (dedupe_key) where dedupe_key is not null do nothing;

  -- ───────────────────────── B5: Instalment payment due (5 days before) ─────────────────────────
  insert into public.reminders (user_id, source_module, source_id, title, body, fire_at, channels, dedupe_key)
  select
    ip.user_id, 'installment', ip.id,
    'Instalment due: ' || plan.description,
    'EGP ' || ip.amount || ' — due ' || to_char(ip.due_on, 'DD Mon'),
    now(),
    '{push}'::public.reminder_channel[],
    'installment_due:' || ip.id
  from public.installment_payments ip
  join public.installment_plans plan on plan.id = ip.plan_id
  where ip.status = 'scheduled'
    and ip.due_on between current_date and current_date + 5
    and not exists (
      select 1 from public.notification_prefs np
      where np.user_id = ip.user_id and np.type = 'B5' and np.enabled = false
    )
  on conflict (dedupe_key) where dedupe_key is not null do nothing;

  -- ───────────────────────── B6: Instalment plan paid off (Bell) ─────────────────────────
  -- Detected from the data (every generated payment row is 'paid'), not from
  -- installment_plans.status — nothing in the codebase currently transitions
  -- that column, and this session does not add that transition either.
  insert into public.reminders (user_id, source_module, source_id, title, body, fire_at, channels, dedupe_key)
  select
    plan.user_id, 'installment', plan.id,
    'Instalment plan paid off: ' || plan.description,
    null,
    now(),
    '{}'::public.reminder_channel[],
    'installment_done:' || plan.id
  from public.installment_plans plan
  where plan.status <> 'cancelled'
    and exists (select 1 from public.installment_payments ip2 where ip2.plan_id = plan.id)
    and not exists (select 1 from public.installment_payments ip where ip.plan_id = plan.id and ip.status <> 'paid')
    and not exists (
      select 1 from public.notification_prefs np
      where np.user_id = plan.user_id and np.type = 'B6' and np.enabled = false
    )
  on conflict (dedupe_key) where dedupe_key is not null do nothing;

  -- ───────────────────────── B7: SMS pending review (digest, default On) ─────────────────────────
  -- Upsert, not insert-once: more messages can land after the digest row is
  -- first created, and the count must stay live until dispatch-reminders
  -- actually sends it at the digest hour.
  insert into public.reminders (user_id, source_module, source_id, title, body, fire_at, channels, dedupe_key)
  select
    p.id, 'inbox', null,
    'Bank texts waiting',
    cnt.n || ' message' || case when cnt.n = 1 then '' else 's' end || ' waiting in your inbox',
    public.next_digest_instant(p.timezone, coalesce(ns.digest_hour, 20)),
    '{push}'::public.reminder_channel[],
    'sms_pending_digest:' || p.id || ':' || (now() at time zone p.timezone)::date
  from public.profiles p
  left join public.notification_settings ns on ns.user_id = p.id
  cross join lateral (
    select count(*) as n from public.sms_inbox si where si.user_id = p.id and si.status = 'pending'
  ) cnt
  where cnt.n > 0
    and not exists (
      select 1 from public.notification_prefs np
      where np.user_id = p.id and np.type = 'B7' and np.enabled = false
    )
  on conflict (dedupe_key) where dedupe_key is not null
  do update set body = excluded.body, fire_at = excluded.fire_at;

  -- ───────────────────────── B8: SMS unparsed (digest, default OFF) ─────────────────────────
  -- Opposite guard from every other branch: only generated when the user has
  -- explicitly turned it ON, since the catalogue defaults it to Off.
  insert into public.reminders (user_id, source_module, source_id, title, body, fire_at, channels, dedupe_key)
  select
    p.id, 'inbox', null,
    'Bank texts could not be read',
    cnt.n || ' message' || case when cnt.n = 1 then '' else 's' end || ' need manual entry',
    public.next_digest_instant(p.timezone, coalesce(ns.digest_hour, 20)),
    '{push}'::public.reminder_channel[],
    'sms_unparsed_digest:' || p.id || ':' || (now() at time zone p.timezone)::date
  from public.profiles p
  left join public.notification_settings ns on ns.user_id = p.id
  cross join lateral (
    select count(*) as n from public.sms_inbox si where si.user_id = p.id and si.status = 'unparsed'
  ) cnt
  where cnt.n > 0
    and exists (
      select 1 from public.notification_prefs np
      where np.user_id = p.id and np.type = 'B8' and np.enabled = true
    )
  on conflict (dedupe_key) where dedupe_key is not null
  do update set body = excluded.body, fire_at = excluded.fire_at;

  -- ───────────────────────── B9: Salary landed (immediate) ─────────────────────────
  -- Nothing in sms_inbox flags "this is salary" versus a card-payment credit
  -- explicitly — both parse to direction='credit', merchant_raw=null. Matching
  -- the same phrase isSalaryCredit() (parsers/cib.ts) keys on, rather than a
  -- new column, keeps this in this session's file scope. If that phrase or
  -- CIB's wording changes, or sms_inbox retention clears raw_text, this check
  -- and isSalaryCredit() go stale together and must be updated in the same
  -- commit.
  insert into public.reminders (user_id, source_module, source_id, title, body, fire_at, channels, dedupe_key)
  select
    si.user_id, 'inbox', si.id,
    'Salary landed',
    case when si.parsed_amount is not null then 'EGP ' || si.parsed_amount else null end,
    si.received_at,
    '{push}'::public.reminder_channel[],
    'salary:' || si.id
  from public.sms_inbox si
  where si.parsed_direction = 'credit'
    and si.raw_text ~ 'من جهة العمل'
    and not exists (
      select 1 from public.notification_prefs np
      where np.user_id = si.user_id and np.type = 'B9' and np.enabled = false
    )
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
end;
$$;
