-- Grammar drills and AI speaking practice with pronunciation scoring.

create table public.grammar_exercises (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  deck_id uuid references public.decks (id) on delete cascade,
  kind text not null check (kind in ('translate', 'word_order', 'fill_blank')),
  -- What the learner is shown.
  prompt text not null,
  -- The accepted answer. Alternates live in accepted_answers.
  answer text not null,
  accepted_answers text[] not null default '{}',
  -- Shuffled tokens for word_order; the blanked sentence for fill_blank.
  tokens text[] not null default '{}',
  hint text not null default '',
  target_language text not null default 'ko',
  created_at timestamptz not null default now()
);

create index grammar_exercises_owner_idx on public.grammar_exercises (owner_id, created_at desc);
create index grammar_exercises_deck_idx on public.grammar_exercises (deck_id);

create table public.grammar_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id uuid not null references public.grammar_exercises (id) on delete cascade,
  response text not null default '',
  is_correct boolean not null default false,
  created_at timestamptz not null default now()
);

create index grammar_attempts_user_idx on public.grammar_attempts (user_id, created_at desc);

create table public.speaking_scenarios (
  id uuid primary key default gen_random_uuid(),
  -- Null owner means a built-in template available to everyone.
  owner_id uuid references auth.users (id) on delete cascade,
  title text not null,
  description text not null default '',
  setting text not null default '',
  ai_role text not null default '',
  user_role text not null default '',
  level text not null default 'beginner'
    check (level in ('beginner', 'intermediate', 'advanced')),
  target_language text not null default 'ko',
  -- Vocabulary the learner is expected to work into the conversation.
  required_card_ids uuid[] not null default '{}',
  is_template boolean not null default false,
  created_at timestamptz not null default now()
);

create index speaking_scenarios_owner_idx on public.speaking_scenarios (owner_id);
create index speaking_scenarios_template_idx on public.speaking_scenarios (is_template)
  where is_template;

create table public.speaking_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  scenario_id uuid not null references public.speaking_scenarios (id) on delete cascade,
  turn_count integer not null default 0 check (turn_count >= 0),
  vocab_used_count integer not null default 0 check (vocab_used_count >= 0),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create index speaking_sessions_user_idx on public.speaking_sessions (user_id, started_at desc);

create table public.speaking_turns (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.speaking_sessions (id) on delete cascade,
  speaker text not null check (speaker in ('user', 'ai')),
  text text not null default '',
  audio_duration_ms integer,
  -- { accuracy, fluency, completeness, prosody, overall, words: [...] }
  -- Prosody is an estimate derived from timing, not an acoustic measurement.
  pronunciation_score jsonb,
  created_at timestamptz not null default now()
);

create index speaking_turns_session_idx on public.speaking_turns (session_id, created_at);

alter table public.grammar_exercises enable row level security;
alter table public.grammar_attempts enable row level security;
alter table public.speaking_scenarios enable row level security;
alter table public.speaking_sessions enable row level security;
alter table public.speaking_turns enable row level security;

create policy "own grammar exercises" on public.grammar_exercises for all
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "own grammar attempts" on public.grammar_attempts for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own or template scenarios are readable" on public.speaking_scenarios for select
  to authenticated
  using (owner_id = (select auth.uid()) or is_template);

create policy "own scenarios are insertable" on public.speaking_scenarios for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

create policy "own scenarios are editable" on public.speaking_scenarios for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "own scenarios are deletable" on public.speaking_scenarios for delete
  to authenticated
  using (owner_id = (select auth.uid()));

create policy "own speaking sessions" on public.speaking_sessions for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Turns are reached through their session; a definer helper keeps the policy
-- from needing direct read access on speaking_sessions.
create or replace function public.owns_speaking_session(p_session_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.speaking_sessions s
    where s.id = p_session_id and s.user_id = p_user_id
  );
$$;

create policy "own speaking turns" on public.speaking_turns for all
  to authenticated
  using (public.owns_speaking_session(session_id, (select auth.uid())))
  with check (public.owns_speaking_session(session_id, (select auth.uid())));
