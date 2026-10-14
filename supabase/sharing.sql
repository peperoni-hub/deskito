-- Deskito calendar sharing. Run this once in the Supabase SQL Editor (after schema.sql).
-- Someone sends a request to one email address; only the person who owns that (confirmed)
-- email can accept it. After that they can READ the sender's calendar plans and name,
-- and nothing else. Nobody can ever change someone else's data.

create table if not exists public.deskito_shares (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  owner_email text not null,
  viewer_email text not null,
  viewer_id uuid references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now()
);

create unique index if not exists deskito_shares_once
  on public.deskito_shares (owner_id, lower(viewer_email));

alter table public.deskito_shares enable row level security;

-- See requests you sent, and requests sent to your email
drop policy if exists "See your own share requests" on public.deskito_shares;
create policy "See your own share requests"
  on public.deskito_shares for select
  to authenticated
  using (
    owner_id = (select auth.uid())
    or lower(viewer_email) = lower((select auth.jwt() ->> 'email'))
  );

-- Send a request, only in your own name, and only as "waiting"
drop policy if exists "Send share requests" on public.deskito_shares;
create policy "Send share requests"
  on public.deskito_shares for insert
  to authenticated
  with check (
    owner_id = (select auth.uid())
    and lower(owner_email) = lower((select auth.jwt() ->> 'email'))
    and status = 'pending'
    and viewer_id is null
  );

-- Accept a request sent to your email (only the status and your id can change)
drop policy if exists "Accept share requests" on public.deskito_shares;
create policy "Accept share requests"
  on public.deskito_shares for update
  to authenticated
  using (lower(viewer_email) = lower((select auth.jwt() ->> 'email')))
  with check (viewer_id = (select auth.uid()) and status = 'accepted');

revoke update on public.deskito_shares from authenticated, anon;
grant update (status, viewer_id) on public.deskito_shares to authenticated;

-- Stop sharing (the sender) or decline / remove (the receiver)
drop policy if exists "Remove share requests" on public.deskito_shares;
create policy "Remove share requests"
  on public.deskito_shares for delete
  to authenticated
  using (
    owner_id = (select auth.uid())
    or lower(viewer_email) = lower((select auth.jwt() ->> 'email'))
  );

-- People you have accepted can READ your calendar plans and your name. Nothing else,
-- and there is no rule that lets them change anything.
drop policy if exists "Shared calendars can be read" on public.deskito_data;
create policy "Shared calendars can be read"
  on public.deskito_data for select
  to authenticated
  using (
    key in ('plans', 'profile')
    and exists (
      select 1 from public.deskito_shares s
      where s.owner_id = deskito_data.user_id
        and s.viewer_id = (select auth.uid())
        and s.status = 'accepted'
    )
  );
