-- Deskito's storage in Supabase. Run this once in the Supabase SQL Editor.
-- Each row is one part of a user's data (entries, projects, tags, plans, settings...).

create table if not exists public.deskito_data (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  key text not null,
  value jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- Security: nobody can see or change anything unless it's their own data
alter table public.deskito_data enable row level security;

drop policy if exists "Users can read their own data" on public.deskito_data;
create policy "Users can read their own data"
  on public.deskito_data for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can add their own data" on public.deskito_data;
create policy "Users can add their own data"
  on public.deskito_data for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can change their own data" on public.deskito_data;
create policy "Users can change their own data"
  on public.deskito_data for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own data" on public.deskito_data;
create policy "Users can delete their own data"
  on public.deskito_data for delete
  to authenticated
  using ((select auth.uid()) = user_id);
