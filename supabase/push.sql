-- Notifications that arrive even when Deskito is closed.
-- Run this once in Supabase: SQL Editor → New query → paste → Run.
--
-- deskito_push_devices: where to send notifications (one row per browser/phone that allowed them)
-- deskito_push_jobs:    upcoming notifications (reminders, alarms, automatic timer starts).
--                       Their text and time are stored unlocked so the server can send them;
--                       everything else in Deskito stays locked.

create table if not exists public.deskito_push_devices (
  endpoint text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.deskito_push_jobs (
  user_id uuid not null references auth.users (id) on delete cascade,
  job_key text not null,
  send_at timestamptz not null,
  title text not null,
  body text not null default '',
  sticky boolean not null default false,
  sent boolean not null default false,
  primary key (user_id, job_key)
);

create index if not exists deskito_push_jobs_due on public.deskito_push_jobs (send_at) where not sent;

alter table public.deskito_push_devices enable row level security;
alter table public.deskito_push_jobs enable row level security;

drop policy if exists "own push devices" on public.deskito_push_devices;
create policy "own push devices" on public.deskito_push_devices
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own push jobs" on public.deskito_push_jobs;
create policy "own push jobs" on public.deskito_push_jobs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Every minute, ask the send-push function to send what's due.
-- Before running this part, replace PASTE-YOUR-CRON-SECRET with the CRON_SECRET you chose.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('deskito-send-push') where exists (select 1 from cron.job where jobname = 'deskito-send-push');
select cron.schedule(
  'deskito-send-push',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://udhmreajsncijlxzpvkm.supabase.co/functions/v1/send-push',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "PASTE-YOUR-CRON-SECRET"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
