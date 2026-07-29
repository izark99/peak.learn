-- Study content: decks of vocabulary and the cards inside them.

create table public.decks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text not null default '',
  source_language text not null default 'en',
  target_language text not null default 'ko',
  visibility text not null default 'private'
    check (visibility in ('private', 'public', 'class')),
  -- Where the cards came from, for display only.
  origin text not null default 'manual'
    check (origin in ('manual', 'text', 'image', 'sample')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index decks_owner_idx on public.decks (owner_id, updated_at desc);
create index decks_public_idx on public.decks (visibility) where visibility = 'public';

create trigger decks_set_updated_at
  before update on public.decks
  for each row execute function public.set_updated_at();

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks (id) on delete cascade,
  term text not null check (char_length(term) between 1 and 500),
  translation text not null default '',
  -- Pronunciation guide: romanisation, pinyin, IPA, whatever suits the language.
  phonetic text not null default '',
  part_of_speech text not null default '',
  example_sentence text not null default '',
  example_translation text not null default '',
  synonyms text[] not null default '{}',
  -- Words learners commonly mix this one up with; used for test distractors.
  confusables text[] not null default '{}',
  image_url text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index cards_deck_idx on public.cards (deck_id, position);

alter table public.decks enable row level security;
alter table public.cards enable row level security;

-- SECURITY DEFINER helpers. Card policies need to consult decks, and deck
-- visibility needs to consult class membership; doing that inline would either
-- recurse or require the caller to hold read access on the table being checked.
create or replace function public.owns_deck(p_deck_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.decks d
    where d.id = p_deck_id and d.owner_id = p_user_id
  );
$$;

create policy "decks are readable by their owner"
  on public.decks for select
  to authenticated
  using (owner_id = (select auth.uid()));

create policy "public decks are readable by anyone signed in"
  on public.decks for select
  to authenticated
  using (visibility = 'public');

create policy "decks are insertable by their owner"
  on public.decks for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

create policy "decks are editable by their owner"
  on public.decks for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "decks are deletable by their owner"
  on public.decks for delete
  to authenticated
  using (owner_id = (select auth.uid()));

create policy "cards follow the readability of their deck"
  on public.cards for select
  to authenticated
  using (
    public.owns_deck(deck_id, (select auth.uid()))
    or exists (
      select 1 from public.decks d
      where d.id = cards.deck_id and d.visibility = 'public'
    )
  );

create policy "cards are writable by the deck owner"
  on public.cards for insert
  to authenticated
  with check (public.owns_deck(deck_id, (select auth.uid())));

create policy "cards are editable by the deck owner"
  on public.cards for update
  to authenticated
  using (public.owns_deck(deck_id, (select auth.uid())))
  with check (public.owns_deck(deck_id, (select auth.uid())));

create policy "cards are deletable by the deck owner"
  on public.cards for delete
  to authenticated
  using (public.owns_deck(deck_id, (select auth.uid())));
