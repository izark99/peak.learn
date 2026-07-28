-- Two performance fixes flagged by the Supabase advisors.
--
-- 1. Covering indexes for foreign keys that had none. Without these, a cascade
--    delete (removing a deck, a class, an account) sequentially scans the
--    referencing table, and the joins these columns appear in do the same.
--
-- 2. Consolidated SELECT policies. Postgres evaluates every permissive policy
--    on a table for each row until one passes, so three policies on `decks`
--    meant up to three predicate evaluations per row. Folding them into a
--    single OR is semantically identical and evaluates once, with the cheap
--    column comparisons ordered ahead of the SECURITY DEFINER helpers so the
--    expensive branch is usually short-circuited away.

-- --- 1. Covering indexes -----------------------------------------------------

create index if not exists assignment_progress_user_idx
  on public.assignment_progress (user_id);
create index if not exists class_assignments_deck_idx
  on public.class_assignments (deck_id);
create index if not exists grammar_attempts_exercise_idx
  on public.grammar_attempts (exercise_id);
create index if not exists review_logs_card_idx
  on public.review_logs (card_id);
create index if not exists review_states_card_idx
  on public.review_states (card_id);
create index if not exists speaking_sessions_scenario_idx
  on public.speaking_sessions (scenario_id);
create index if not exists study_sessions_deck_idx
  on public.study_sessions (deck_id);

-- --- 2. One SELECT policy per table ------------------------------------------

-- decks: owner, or public, or shared with a class you're in.
drop policy if exists "decks are readable by their owner" on public.decks;
drop policy if exists "public decks are readable by anyone signed in" on public.decks;
drop policy if exists "class decks are readable by the class" on public.decks;

create policy "decks are readable by owner, public, or class"
  on public.decks for select
  to authenticated
  using (
    owner_id = (select auth.uid())
    or visibility = 'public'
    or private.deck_shared_with_user(id, (select auth.uid()))
  );

-- cards: follow the deck's readability.
drop policy if exists "cards follow the readability of their deck" on public.cards;
drop policy if exists "class deck cards are readable by the class" on public.cards;

create policy "cards follow the readability of their deck"
  on public.cards for select
  to authenticated
  using (
    private.owns_deck(deck_id, (select auth.uid()))
    or exists (
      select 1 from public.decks d
      where d.id = cards.deck_id and d.visibility = 'public'
    )
    or private.deck_shared_with_user(deck_id, (select auth.uid()))
  );

-- profiles: your own, or a student on a class you teach.
-- The direct id check stays first so INSERT ... RETURNING keeps working when a
-- profile row is backfilled (see migration 0010 for why that matters).
drop policy if exists "profiles are readable by their owner" on public.profiles;
drop policy if exists "teachers read their students' profiles" on public.profiles;

create policy "profiles are readable by their owner or their teacher"
  on public.profiles for select
  to authenticated
  using (
    id = (select auth.uid())
    or private.shares_class_with(id, (select auth.uid()))
  );
