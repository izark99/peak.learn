-- Core identity: profiles mirrored from auth.users, plus shared trigger helpers.

-- Keeps updated_at honest without application code having to remember.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  -- The language the learner already speaks, and the one they are learning.
  native_language text not null default 'en',
  target_language text not null default 'ko',
  -- Cards per day the learner is aiming for.
  daily_goal integer not null default 20 check (daily_goal between 5 and 500),
  streak_count integer not null default 0 check (streak_count >= 0),
  -- Calendar date of the last completed study session, for streak maths.
  last_studied_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy "profiles are readable by their owner"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

create policy "profiles are editable by their owner"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Insert is normally handled by the trigger below, but allow a self-insert so
-- an account created before this migration can backfill its own row.
create policy "profiles are insertable by their owner"
  on public.profiles for insert
  to authenticated
  with check (id = (select auth.uid()));

-- Every new auth user gets a profile. SECURITY DEFINER because the row is
-- created before the user has a session to authorise it with.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      split_part(new.email, '@', 1),
      ''
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
