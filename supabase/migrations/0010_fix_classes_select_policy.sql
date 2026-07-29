-- Fix: creating a class failed with "new row violates row-level security
-- policy for table classes" (42501).
--
-- `INSERT ... RETURNING` — which is what supabase-js emits for
-- `.insert().select()` — makes Postgres apply the SELECT policy to the new row
-- as well as the INSERT policy. The SELECT policy was:
--
--   using (private.is_class_member(id, (select auth.uid())))
--
-- `is_class_member` is STABLE SECURITY DEFINER, so it runs against the calling
-- query's snapshot. The row being inserted by that very command isn't in that
-- snapshot, so the teacher branch of the helper found nothing, the policy
-- returned false, and the insert was rejected — even though the INSERT policy
-- had already passed.
--
-- Checking `teacher_id` directly fixes it: that column is read straight off the
-- new row, with no snapshot involved. The helper is kept as a second branch so
-- enrolled students can still read the class.
--
-- A plain INSERT with no RETURNING was unaffected, which is why this only
-- showed up once the app's real query shape was exercised.

drop policy if exists "classes are readable by members" on public.classes;

create policy "classes are readable by members"
  on public.classes for select
  to authenticated
  using (
    -- Direct column check: works for RETURNING on a freshly inserted row.
    teacher_id = (select auth.uid())
    -- Membership for everyone else. Safe here because a student's
    -- class_members row always predates the read.
    or private.is_class_member(id, (select auth.uid()))
  );
