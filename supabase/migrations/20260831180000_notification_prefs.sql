-- Per-user notification preferences: per-type on/off, plus the two
-- cross-cutting settings from tasks/s30-catalogue.md (quiet hours, digest
-- hour). Quiet hours and digest hour are user-level, not per-type, so they
-- live in their own singleton-per-user table rather than duplicated onto
-- every notification_prefs row.
--
-- The enum widening below must land in this migration's own transaction,
-- separate from 20260831180100_generate_reminders_v2.sql — the file that
-- actually uses these new values. Postgres will not let a new enum value be
-- used in the same transaction that added it.

alter type public.reminder_source_module add value 'bill';
alter type public.reminder_source_module add value 'card';
alter type public.reminder_source_module add value 'installment';
alter type public.reminder_source_module add value 'inbox';

-- Real dedupe key for generate_reminders(). Nullable and unique only where
-- present, so the existing dog/car/meds branches — which keep their own
-- created_at-window dedupe, unchanged — are unaffected. This is opt-in
-- infrastructure the next migration's new branches use via
-- `on conflict (dedupe_key) where dedupe_key is not null`.
alter table public.reminders add column dedupe_key text;
create unique index reminders_dedupe_key_idx on public.reminders (dedupe_key) where dedupe_key is not null;

-- `type` matches the catalogue's own row IDs ('A1'..'A3', 'B1'..'B9').
-- enabled = false means generate_reminders() skips the type entirely: no
-- row, not even a silent bell entry. That is a stronger statement than the
-- catalogue's own "Off" default channel, which still generates a
-- history-only row with no delivery channel.
create table public.notification_prefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, type)
);

-- One row per user, created lazily by the /notifications page (S30b) the
-- first time someone changes a setting. Absence of a row means "use the
-- catalogue's signed-off defaults" — callers coalesce against them rather
-- than requiring every user to have a row.
create table public.notification_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  quiet_hours_start time not null default '00:00',
  quiet_hours_end time not null default '08:00',
  digest_hour int not null default 20 check (digest_hour between 0 and 23),
  created_at timestamptz not null default now()
);

-- ───────────────────────── Indexes ─────────────────────────

create index notification_prefs_user_id_idx on public.notification_prefs (user_id);

-- ───────────────────────── RLS ─────────────────────────
-- Same pattern as 20260826120000_installments.sql.

do $$
declare
  t text;
begin
  for t in select unnest(array['notification_prefs', 'notification_settings'])
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "own_rows" on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t
    );
  end loop;
end $$;

-- ───────────────────────── Realtime ─────────────────────────
-- Without this, useRealtime() subscriptions on these tables never fire.

alter publication supabase_realtime add table
  notification_prefs,
  notification_settings;
