-- Deskito: locked (end-to-end encrypted) data. Run this once in the Supabase SQL Editor,
-- after schema.sql and sharing.sql.
-- From now on all synced data is locked on the user's device, so this database only ever
-- stores unreadable text. Calendar sharing uses separate locked copies that only the two
-- people involved can open.

-- Each share request carries both people's public keys (public keys are safe to store)
alter table public.deskito_shares add column if not exists owner_public_key text;
alter table public.deskito_shares add column if not exists viewer_public_key text;

revoke update on public.deskito_shares from authenticated, anon;
grant update (status, viewer_id, viewer_public_key) on public.deskito_shares to authenticated;

-- The person you share with can read ONLY the locked copy made for them ("share:<id>"),
-- never your other data
drop policy if exists "Shared calendars can be read" on public.deskito_data;
create policy "Shared calendars can be read"
  on public.deskito_data for select
  to authenticated
  using (
    key like 'share:%'
    and exists (
      select 1 from public.deskito_shares s
      where deskito_data.key = 'share:' || s.id::text
        and s.owner_id = deskito_data.user_id
        and s.viewer_id = (select auth.uid())
        and s.status = 'accepted'
    )
  );
