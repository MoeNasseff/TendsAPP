-- Profile fields for the cloned TailAdmin /profile page.
--
-- The clone shows First Name, Last Name, Phone, Bio, four social links, and an
-- Address block (Country, City/State, Postal Code, TAX ID). None of them
-- existed here: `profiles` carried display_name, avatar_url, timezone and the
-- notification channels, and nothing else.
--
-- These are real columns rather than hardcoded strings on purpose. A cloned
-- page whose fields cannot be edited is a screenshot, and demo values left in
-- place ("Musharof Chowdhury", "randomuser@pimjo.com") would look like real
-- user data in a personal finance app.
--
-- All nullable with no defaults: an empty profile is the correct starting
-- state, and the page renders a dash for anything unset. Nothing here is
-- required to use the app.
--
-- `first_name`/`last_name` sit alongside the existing `display_name` rather
-- than replacing it. display_name is what UserAvatar and the header already
-- render and is a single free-form string; splitting it would break both for
-- the sake of a template's two-field layout. The profile page shows all three.
alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists phone text,
  add column if not exists bio text,
  add column if not exists country text,
  add column if not exists city_state text,
  add column if not exists postal_code text,
  add column if not exists tax_id text,
  add column if not exists social_facebook text,
  add column if not exists social_x text,
  add column if not exists social_linkedin text,
  add column if not exists social_instagram text;

comment on column public.profiles.bio is
  'Free text shown under the name on /profile. The template calls this the '
  'user''s role ("Team Manager"); kept as the source''s field name.';

comment on column public.profiles.tax_id is
  'Cloned from the TailAdmin template''s Address card. Not used by any '
  'calculation in this app -- it is a place to note a number, nothing reads it.';

-- No RLS changes: profiles already has per-column-agnostic own-row policies
-- (select/insert/update/delete on id = auth.uid()) from 20260704000001, and a
-- policy covers the whole row, not a column list.
