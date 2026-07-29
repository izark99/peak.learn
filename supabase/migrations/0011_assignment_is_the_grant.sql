-- Make a class assignment the single source of truth for deck access.
--
-- Before this, a student could read the *cards* of an assigned deck but not the
-- *deck row* itself, because the two policies disagreed:
--
--   cards: deck_shared_with_user(deck_id, uid)                        -- assignment alone
--   decks: visibility = 'class' AND deck_shared_with_user(id, uid)    -- assignment + a flag
--
-- The flag is set by a second, separate UPDATE in the assign action. Those two
-- writes aren't atomic, so any failure between them left students able to load
-- a deck's cards while the deck page 404'd.
--
-- The assignment already encodes the intent ("this deck was given to a class
-- I'm in"), so the extra flag check only created a way for the two to fall out
-- of step. `visibility` stays as a label for the owner's own UI; access no
-- longer depends on it.

drop policy if exists "class decks are readable by the class" on public.decks;

create policy "class decks are readable by the class"
  on public.decks for select
  to authenticated
  using (private.deck_shared_with_user(id, (select auth.uid())));
