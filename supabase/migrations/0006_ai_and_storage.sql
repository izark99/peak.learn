-- AI usage log and the storage bucket backing photo-to-flashcard.

create table public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in (
    'vocab_from_text', 'vocab_from_image', 'grammar', 'scenario', 'conversation'
  )),
  -- Truncated description of the input, for the user's own history. Never the
  -- full source text, which can be long and is not needed after generation.
  input_summary text not null default '',
  model text not null default '',
  -- Null when the mock generator served the request.
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now()
);

create index ai_generations_user_idx on public.ai_generations (user_id, created_at desc);

alter table public.ai_generations enable row level security;

create policy "own ai generations" on public.ai_generations for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Private bucket: card images are reachable only through signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'card-images',
  'card-images',
  false,
  10485760, -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;

-- Objects are namespaced by user id: card-images/<uid>/<file>. The policies
-- below pin the first path segment to the caller so one learner cannot read or
-- overwrite another's uploads.
create policy "card images are readable by their owner"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'card-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "card images are uploadable by their owner"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'card-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "card images are deletable by their owner"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'card-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
