-- ============================================================================
-- NOTIFICATIONS
-- Run this once in the Supabase SQL Editor (Dashboard > SQL Editor > New query).
--
-- The app already had code that reads/writes public.notifications (a worker
-- marking a task for review inserts a row for the admin; the admin page
-- lists/dismisses them). Both directions were failing with "new row violates
-- row-level security policy" — the table has RLS enabled with no policies at
-- all, which denies every row unconditionally regardless of GRANTs. This
-- script adds the missing policies. Safe to run whether the table already
-- exists, is missing entirely, or is missing only some columns/policies.
--
-- Columns:
--   recipient_id  targets ONE specific user (e.g. "you were assigned a task").
--   user_role     broadcasts to a role's shared inbox (e.g. 'admin') when
--                 recipient_id is left null.
-- ============================================================================

create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid references auth.users (id) on delete cascade,
  user_role    text,
  title        text not null default '',
  message      text,
  is_read      boolean not null default false,
  created_at   timestamptz not null default now()
);

alter table public.notifications add column if not exists recipient_id uuid references auth.users (id) on delete cascade;
alter table public.notifications add column if not exists user_role    text;
alter table public.notifications add column if not exists title       text default '';
alter table public.notifications add column if not exists message     text;
alter table public.notifications add column if not exists is_read     boolean default false;
alter table public.notifications add column if not exists created_at  timestamptz default now();

create index if not exists notifications_recipient_idx    on public.notifications (recipient_id);
create index if not exists notifications_role_unread_idx  on public.notifications (user_role, is_read);

-- Reused from attendance.sql/advances.sql; redefined here too so this script
-- also works standalone. create or replace makes re-running any of them safe.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(
      (select p.role ilike 'admin' from public.profiles p where p.id = auth.uid()),
      false
    )
    or
    coalesce(
      (select u.email ilike '%admin%' from auth.users u where u.id = auth.uid()),
      false
    );
$$;

alter table public.notifications enable row level security;

drop policy if exists notifications_insert_any    on public.notifications;
drop policy if exists notifications_select_scoped on public.notifications;
drop policy if exists notifications_update_scoped on public.notifications;
drop policy if exists notifications_delete_scoped on public.notifications;

-- Any signed-in staff member may create a notification — a worker notifying
-- admin, or admin notifying a worker. Who can SEE it is what's restricted.
create policy notifications_insert_any
  on public.notifications
  for insert
  to authenticated
  with check (true);

-- Visible if it's aimed at you personally, or it's a broadcast to your role.
create policy notifications_select_scoped
  on public.notifications
  for select
  to authenticated
  using (
    recipient_id = auth.uid()
    or (recipient_id is null and user_role = 'admin' and public.is_admin())
    or (recipient_id is null and user_role = 'worker' and not public.is_admin())
  );

-- Dismissing (is_read) follows the same visibility rule.
create policy notifications_update_scoped
  on public.notifications
  for update
  to authenticated
  using (
    recipient_id = auth.uid()
    or (recipient_id is null and user_role = 'admin' and public.is_admin())
  )
  with check (
    recipient_id = auth.uid()
    or (recipient_id is null and user_role = 'admin' and public.is_admin())
  );

create policy notifications_delete_scoped
  on public.notifications
  for delete
  to authenticated
  using (
    recipient_id = auth.uid()
    or (recipient_id is null and user_role = 'admin' and public.is_admin())
  );

grant select, insert, update, delete on public.notifications to authenticated;
grant execute on function public.is_admin() to authenticated;
