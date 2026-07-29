-- Joining a class by code.
--
-- A student has no read access to `classes` before they are a member, so the
-- lookup can't happen client-side. This runs as the definer to resolve the
-- code and create the membership in one call.
--
-- Deliberately does the join rather than just resolving code -> id: a bare
-- lookup would be an oracle that confirms whether any given code exists,
-- which is strictly more information than a student needs.
--
-- Unlike the policy helpers in migration 0007, this one has to stay in
-- `public` — it is called over PostgREST as an RPC. Two things keep that
-- narrow: EXECUTE is revoked from anon, and the function acts only on
-- auth.uid(), so a caller can never add anyone but themselves.

create or replace function public.join_class_by_code(p_join_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class_id uuid;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select c.id into v_class_id
  from public.classes c
  where upper(c.join_code) = upper(btrim(p_join_code))
    and not c.archived;

  -- Null tells the caller "no such class" without revealing anything more.
  if v_class_id is null then
    return null;
  end if;

  insert into public.class_members (class_id, user_id, role)
  values (v_class_id, v_user_id, 'student')
  on conflict (class_id, user_id) do nothing;

  return v_class_id;
end;
$$;

revoke all on function public.join_class_by_code(text) from public, anon;
grant execute on function public.join_class_by_code(text) to authenticated;
