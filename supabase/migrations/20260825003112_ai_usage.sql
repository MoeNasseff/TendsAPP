-- Session 14: surfaces when a provider config was last used to satisfy an
-- AI call. Written server-side by the ai-proxy edge function on a
-- successful call -- never by the client, so the timestamp can't be
-- spoofed into looking "recently used" by an idle key.
alter table public.ai_provider_configs
  add column last_used_at timestamptz;

-- `created_at` is already in the authenticated select grant from
-- 20260816000002_ai_provider_configs.sql -- ApiKeysPage rendering
-- `new Date()` instead of the fetched value is a client bug, not a grants
-- gap. Nothing to add here for created_at.

-- Same column-level lockdown pattern as the rest of this table: a new
-- column is invisible to `authenticated` until explicitly granted, because
-- the table-level grant was revoked in 20260816000002_ai_provider_configs.sql.
-- Select only -- no update. The client must never set its own "last used"
-- timestamp; only the proxy (service_role, already covered by its blanket
-- `grant all` on this table) stamps it.
grant select (last_used_at) on public.ai_provider_configs to authenticated;
