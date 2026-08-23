-- The signup form collects First Name / Last Name, but handle_new_user() only
-- ever inserted the id, so those values were written to auth.users metadata and
-- then dropped on the floor.
--
-- The name has to land on the profiles row from inside this trigger rather than
-- from the client: with email confirmation enabled, supabase.auth.signUp()
-- returns no session, so a follow-up update from the browser is an anonymous
-- request and the profiles_update_own policy (id = auth.uid()) rejects it.
--
-- Existing behaviour is preserved for every other signup path (OAuth, magic
-- link, the old form): when no display_name is present in the metadata, the
-- column stays null exactly as before.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 20260704000003 revoked execute from public/anon/authenticated because a
-- SECURITY DEFINER function in the public schema is otherwise callable over
-- /rest/v1/rpc. CREATE OR REPLACE resets the grants, so re-apply the lockdown.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
