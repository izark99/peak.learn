-- Spaced repetition state, review history, and study session records.

create table public.review_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  card_id uuid not null references public.cards (id) on delete cascade,
  -- SM-2 fields. ease_factor is the classic 1.3 floor / 2.5 default.
  ease_factor real not null default 2.5 check (ease_factor >= 1.3),
  interval_days real not null default 0 check (interval_days >= 0),
  repetitions integer not null default 0 check (repetitions >= 0),
  lapses integer not null default 0 check (lapses >= 0),
  -- Index into the learning/relearning step ladder; ignored once in review.
  learning_step integer not null default 0 check (learning_step >= 0),
  state text not null default 'new'
    check (state in ('new', 'learning', 'review', 'relearning')),
  due_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  unique (user_id, card_id)
);

-- The hot path: "what does this user owe me right now".
create index review_states_due_idx on public.review_states (user_id, due_at);

create table public.review_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  card_id uuid not null references public.cards (id) on delete cascade,
  -- 1 again, 2 hard, 3 good, 4 easy.
  rating smallint not null check (rating between 1 and 4),
  previous_interval real not null default 0,
  new_interval real not null default 0,
  mode text not null default 'flashcards',
  reviewed_at timestamptz not null default now()
);

create index review_logs_user_idx on public.review_logs (user_id, reviewed_at desc);

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  deck_id uuid references public.decks (id) on delete set null,
  mode text not null
    check (mode in ('flashcards', 'learn', 'dictation', 'test', 'match', 'review')),
  cards_studied integer not null default 0 check (cards_studied >= 0),
  correct_count integer not null default 0 check (correct_count >= 0),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create index study_sessions_user_idx on public.study_sessions (user_id, started_at desc);

alter table public.review_states enable row level security;
alter table public.review_logs enable row level security;
alter table public.study_sessions enable row level security;

-- All three tables are strictly private to the learner. Written out per table
-- rather than via a helper because the predicate is the same trivial check.
create policy "own review states" on public.review_states for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own review logs" on public.review_logs for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own study sessions" on public.study_sessions for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
