-- ============================================================================
-- WORKER ADVANCE PAYMENTS
-- Run this once in the Supabase SQL Editor (Dashboard > SQL Editor > New query).
--
-- Same pattern as backend/sql/attendance.sql: a table with RLS (admin manages
-- everything, a worker may read only their own rows) PLUS an explicit GRANT,
-- since RLS policies only narrow which rows are visible — they don't by
-- themselves grant permission to query the table. Skipping the grant is what
-- caused "permission denied for table attendance" on the worker's attendance
-- page, so it's included here from the start.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. Table
-- ---------------------------------------------------------------------------
create table if not exists public.advances (
  id            uuid primary key default gen_random_uuid(),
  worker_id     uuid not null references auth.users (id) on delete cascade,
  amount        numeric(10,2) not null check (amount > 0),
  advance_date  date not null default current_date,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists advances_worker_idx on public.advances (worker_id);
create index if not exists advances_date_idx   on public.advances (advance_date desc);


-- ---------------------------------------------------------------------------
-- 2. Keep updated_at honest
-- ---------------------------------------------------------------------------
create or replace function public.touch_advances_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists advances_set_updated_at on public.advances;
create trigger advances_set_updated_at
  before update on public.advances
  for each row execute function public.touch_advances_updated_at();


-- ---------------------------------------------------------------------------
-- 3. Admin check
--    Defined here too (identical to attendance.sql's version) so this script
--    also works standalone on a project that hasn't run attendance.sql.
--    create or replace makes re-running either script safe.
-- ---------------------------------------------------------------------------
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


-- ---------------------------------------------------------------------------
-- 4. Row level security
--    Admins manage everything; a worker may read only their own rows.
-- ---------------------------------------------------------------------------
alter table public.advances enable row level security;

drop policy if exists advances_admin_all  on public.advances;
drop policy if exists advances_worker_read on public.advances;

create policy advances_admin_all
  on public.advances
  for all
  using (public.is_admin())
  with check (public.is_admin());

create policy advances_worker_read
  on public.advances
  for select
  using (worker_id = auth.uid());


-- ---------------------------------------------------------------------------
-- 5. Grants
--    The admin UI reads/writes this table directly (same pattern as
--    orders/tasks/fabrics), so `authenticated` needs full table privileges —
--    RLS is what actually stops a worker from writing or reading anyone
--    else's row.
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.advances to authenticated;
grant execute on function public.is_admin() to authenticated;
