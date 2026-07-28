-- Move the SECURITY DEFINER helpers out of the PostgREST-exposed `public`
-- schema.
--
-- Every helper takes the user id as an argument, so while they lived in
-- `public` any client could call e.g.
--   POST /rest/v1/rpc/is_class_teacher {"p_class_id": ..., "p_user_id": ...}
-- and probe another account's class membership or deck ownership. The
-- functions are only ever meant to be called from inside RLS policies.
--
-- PostgREST only exposes schemas listed in its config, so a `private` schema is
-- unreachable over the API while remaining usable from policy expressions.
-- ALTER FUNCTION ... SET SCHEMA is used rather than drop/recreate because
-- policies reference functions by OID: moving one leaves every existing policy
-- pointing at it, with no policy rewrite needed.

create schema if not exists private;

-- RLS predicates are evaluated as the calling role, so it still needs USAGE on
-- the schema and EXECUTE on the functions. That is fine: neither is routable
-- over the REST API.
grant usage on schema private to authenticated;

alter function public.owns_deck(uuid, uuid) set schema private;
alter function public.owns_speaking_session(uuid, uuid) set schema private;
alter function public.is_class_teacher(uuid, uuid) set schema private;
alter function public.is_class_member(uuid, uuid) set schema private;
alter function public.can_read_assignment(uuid, uuid) set schema private;
alter function public.deck_shared_with_user(uuid, uuid) set schema private;
alter function public.shares_class_with(uuid, uuid) set schema private;
alter function public.handle_new_user() set schema private;

-- can_read_assignment calls is_class_member by name, and that name is resolved
-- at runtime rather than pinned by OID, so the body has to be rewritten to
-- point at the helper's new home.
create or replace function private.can_read_assignment(p_assignment_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.class_assignments a
    where a.id = p_assignment_id
      and private.is_class_member(a.class_id, p_user_id)
  );
$$;

-- handle_new_user is fired by the auth trigger and should never be callable by
-- a client, not even a signed-in one.
revoke all on function private.handle_new_user() from public, anon, authenticated;
