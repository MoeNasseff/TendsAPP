-- handle_new_user() is a SECURITY DEFINER trigger function. Living in the
-- public schema means PostgREST auto-exposes it as a callable RPC
-- (/rest/v1/rpc/handle_new_user) to anon/authenticated roles, flagged by
-- Supabase's security linter. It's only meant to fire via the
-- on_auth_user_created trigger, so revoke direct EXECUTE access.

revoke execute on function public.handle_new_user() from public, anon, authenticated;
