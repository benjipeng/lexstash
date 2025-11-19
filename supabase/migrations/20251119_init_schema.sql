-- Create Prompts Table
create table public.prompts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null check (char_length(title) <= 150),
  description text check (char_length(description) <= 500),
  tags text[] default '{}',
  blocks jsonb default '[]'::jsonb,
  is_public boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create Indexes (Crucial for performance)
create index prompts_user_id_idx on public.prompts(user_id);
create index prompts_tags_idx on public.prompts using gin(tags);

-- Enable Row Level Security
alter table public.prompts enable row level security;

-- Policy 1: VIEW (Select)
-- Allow: Users seeing their own prompts OR anyone seeing public prompts
create policy "Users can view own or public prompts"
on public.prompts for select
to public
using (
  (select auth.uid()) = user_id or is_public = true
);

-- Policy 2: INSERT (Create)
-- Allow: Authenticated users creating prompts for themselves
create policy "Users can insert own prompts"
on public.prompts for insert
to authenticated
with check (
  (select auth.uid()) = user_id
);

-- Policy 3: UPDATE (Edit)
-- Allow: Authenticated users updating their own prompts
create policy "Users can update own prompts"
on public.prompts for update
to authenticated
using (
  (select auth.uid()) = user_id
);

-- Policy 4: DELETE (Remove)
-- Allow: Authenticated users deleting their own prompts
create policy "Users can delete own prompts"
on public.prompts for delete
to authenticated
using (
  (select auth.uid()) = user_id
);
