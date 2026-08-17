-- BYOK provider credentials, and nothing else. The *managed* AI path does
-- not read this table at all -- it uses the GEMINI_API_KEY function secret.
-- This table exists only so a user can supply their own key.
create table public.ai_provider_configs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null,
  model text,
  api_key text,
  -- So the client can render "configured" without ever reading the key.
  -- Generated/stored, therefore not writable and not spoofable.
  has_key boolean generated always as (api_key is not null and api_key <> '') stored,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  -- One config per provider per user, so the settings UI upserts.
  unique (user_id, provider)
);

create index ai_provider_configs_user_id_idx on public.ai_provider_configs (user_id);

-- Same blanket own-rows pattern as 20260704000002_core_schema.sql and
-- 20260816000001_receipts.sql.
alter table public.ai_provider_configs enable row level security;

create policy "own_rows" on public.ai_provider_configs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Deliberately NOT added to the supabase_realtime publication, unlike every
-- table in 20260816000001_receipts.sql. A row here holds an API key; it does
-- not get broadcast over a websocket. This omission is intentional.

-- Column-level lockdown -- the reason this migration looks different from
-- the others. `api_key` is write-only from the browser's point of view: a
-- user can save a key and can see `has_key`, but nothing client-side can
-- ever read the value back. Only service_role -- i.e. the `ai-proxy` edge
-- function -- can select it.
--
-- Supabase's default privileges hand anon and authenticated a *table-level*
-- SELECT, which implies every column, and a column-level REVOKE cannot
-- carve a hole in a table-level grant. So the table-level grant is dropped
-- first and re-granted column by column, omitting `api_key`.
revoke all on public.ai_provider_configs from anon, authenticated;

grant select (id, user_id, provider, model, has_key, enabled, created_at)
  on public.ai_provider_configs to authenticated;
grant insert (user_id, provider, model, api_key, enabled)
  on public.ai_provider_configs to authenticated;
grant update (provider, model, api_key, enabled)
  on public.ai_provider_configs to authenticated;
grant delete on public.ai_provider_configs to authenticated;

-- anon gets nothing, on purpose -- it is not re-granted above.

-- The proxy, and only the proxy, reads the key.
grant all on public.ai_provider_configs to service_role;

-- Note for the settings UI (Packet 5c): a bare `.insert(...).select()` asks
-- PostgREST for `*`, which now includes a column `authenticated` cannot
-- read, and will fail. Always name the columns:
--   .select('id, provider, model, has_key, enabled, created_at')
