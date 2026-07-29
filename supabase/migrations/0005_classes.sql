-- Teacher classes, rosters, deck assignments and student progress.

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '',
  -- Short code students type to join. Unambiguous alphabet: no O/0/I/1.
  join_code text not null unique,
  target_language text not null default 'ko',
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index classes_teacher_idx on public.classes (teacher_id, created_at desc);

create trigger classes_set_updated_at
  before update on public.classes
  for each row execute function public.set_updated_at();

create table public.class_members (
  class_id uuid not null references public.classes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'student' check (role in ('teacher', 'student')),
  joined_at timestamptz not null default now(),
  primary key (class_id, user_id)
);

create index class_members_user_idx on public.class_members (user_id);

create table public.class_assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  deck_id uuid not null references public.decks (id) on delete cascade,
  title text not null default '',
  due_at timestamptz,
  created_at timestamptz not null default now()
);

create index class_assignments_class_idx on public.class_assignments (class_id, created_at desc);

create table public.assignment_progress (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.class_assignments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  cards_completed integer not null default 0 check (cards_completed >= 0),
  accuracy real not null default 0 check (accuracy between 0 and 1),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (assignment_id, user_id)
);

create trigger assignment_progress_set_updated_at
  before update on public.assignment_progress
  for each row execute function public.set_updated_at();

-- SECURITY DEFINER membership helpers. A policy on class_members that queried
-- class_members directly would recurse infinitely; running the lookup as the
-- definer sidesteps RLS on the inner read.
create or replace function public.is_class_teacher(p_class_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.classes c
    where c.id = p_class_id and c.teacher_id = p_user_id
  );
$$;

create or replace function public.is_class_member(p_class_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.class_members m
    where m.class_id = p_class_id and m.user_id = p_user_id
  ) or exists (
    select 1 from public.classes c
    where c.id = p_class_id and c.teacher_id = p_user_id
  );
$$;

create or replace function public.can_read_assignment(p_assignment_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.class_assignments a
    where a.id = p_assignment_id
      and public.is_class_member(a.class_id, p_user_id)
  );
$$;

alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.class_assignments enable row level security;
alter table public.assignment_progress enable row level security;

create policy "classes are readable by members" on public.classes for select
  to authenticated
  using (public.is_class_member(id, (select auth.uid())));

create policy "classes are created by their teacher" on public.classes for insert
  to authenticated
  with check (teacher_id = (select auth.uid()));

create policy "classes are editable by their teacher" on public.classes for update
  to authenticated
  using (teacher_id = (select auth.uid()))
  with check (teacher_id = (select auth.uid()));

create policy "classes are deletable by their teacher" on public.classes for delete
  to authenticated
  using (teacher_id = (select auth.uid()));

create policy "roster is readable by members" on public.class_members for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_class_teacher(class_id, (select auth.uid()))
  );

-- Students add themselves (having found the class by join code); teachers may
-- also add rows directly.
create policy "students join themselves" on public.class_members for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    or public.is_class_teacher(class_id, (select auth.uid()))
  );

create policy "members leave, teachers remove" on public.class_members for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_class_teacher(class_id, (select auth.uid()))
  );

create policy "assignments are readable by members" on public.class_assignments for select
  to authenticated
  using (public.is_class_member(class_id, (select auth.uid())));

create policy "assignments are written by the teacher" on public.class_assignments for insert
  to authenticated
  with check (public.is_class_teacher(class_id, (select auth.uid())));

create policy "assignments are edited by the teacher" on public.class_assignments for update
  to authenticated
  using (public.is_class_teacher(class_id, (select auth.uid())))
  with check (public.is_class_teacher(class_id, (select auth.uid())));

create policy "assignments are deleted by the teacher" on public.class_assignments for delete
  to authenticated
  using (public.is_class_teacher(class_id, (select auth.uid())));

-- A student sees only their own progress; the teacher sees the whole class.
create policy "progress readable by owner and teacher" on public.assignment_progress for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.can_read_assignment(assignment_id, (select auth.uid()))
  );

create policy "progress written by the student" on public.assignment_progress for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "progress updated by the student" on public.assignment_progress for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Now that classes exist, decks shared with a class become readable by that
-- class, and teachers can see the profiles of students on their roster.
create or replace function public.deck_shared_with_user(p_deck_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.class_assignments a
    join public.class_members m on m.class_id = a.class_id
    where a.deck_id = p_deck_id and m.user_id = p_user_id
  );
$$;

create policy "class decks are readable by the class" on public.decks for select
  to authenticated
  using (
    visibility = 'class'
    and public.deck_shared_with_user(id, (select auth.uid()))
  );

create policy "class deck cards are readable by the class" on public.cards for select
  to authenticated
  using (public.deck_shared_with_user(deck_id, (select auth.uid())));

create or replace function public.shares_class_with(p_profile_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.class_members m
    join public.classes c on c.id = m.class_id
    where m.user_id = p_profile_id and c.teacher_id = p_user_id
  );
$$;

create policy "teachers read their students' profiles" on public.profiles for select
  to authenticated
  using (public.shares_class_with(id, (select auth.uid())));
