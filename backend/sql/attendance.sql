-- ============================================================================
-- ATTENDANCE FEATURE
-- Run this once in the Supabase SQL Editor (Dashboard > SQL Editor > New query).
--
-- Follows the same pattern as the app's existing RPCs (get_staff_list,
-- issue_fabric_to_worker): SECURITY DEFINER functions with an explicit admin
-- guard, so the frontend never needs the service-role key.
--
-- ASSUMPTION: public.profiles has columns (id uuid, full_name text, email text,
-- role text) — this matches what get_staff_list already returns. If your column
-- names differ, adjust the SELECT in get_attendance_roster only.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 0. Adapt an attendance table that already exists
--
--    "CREATE TABLE IF NOT EXISTS" silently does nothing when the table is
--    already present, so a table left over from an earlier attempt would make
--    every later statement fail with 42703 (undefined column). This block
--    renames the common legacy spellings so the rest of the script applies
--    cleanly. It is a no-op on a fresh database.
-- ---------------------------------------------------------------------------
do $$
declare
  has_table boolean;
begin
  select exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'attendance'
  ) into has_table;

  if not has_table then
    return;
  end if;

  -- date column: "date" or "day" -> attendance_date
  if not exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='attendance'
                   and column_name='attendance_date') then
    if exists (select 1 from information_schema.columns
               where table_schema='public' and table_name='attendance'
                 and column_name='date') then
      alter table public.attendance rename column "date" to attendance_date;
    elsif exists (select 1 from information_schema.columns
                  where table_schema='public' and table_name='attendance'
                    and column_name='day') then
      alter table public.attendance rename column "day" to attendance_date;
    end if;
  end if;

  -- worker column: user_id / employee_id / staff_id -> worker_id
  if not exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='attendance'
                   and column_name='worker_id') then
    if exists (select 1 from information_schema.columns
               where table_schema='public' and table_name='attendance'
                 and column_name='user_id') then
      alter table public.attendance rename column user_id to worker_id;
    elsif exists (select 1 from information_schema.columns
                  where table_schema='public' and table_name='attendance'
                    and column_name='employee_id') then
      alter table public.attendance rename column employee_id to worker_id;
    elsif exists (select 1 from information_schema.columns
                  where table_schema='public' and table_name='attendance'
                    and column_name='staff_id') then
      alter table public.attendance rename column staff_id to worker_id;
    end if;
  end if;
end $$;


-- ---------------------------------------------------------------------------
-- 1. Table
-- ---------------------------------------------------------------------------
create table if not exists public.attendance (
  id              uuid primary key default gen_random_uuid(),
  worker_id       uuid not null references auth.users (id) on delete cascade,
  attendance_date date not null default current_date,
  status          text not null default 'Present'
                    check (status in ('Present', 'Absent', 'Half Day', 'Leave')),
  check_in        time,
  check_out       time,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- One record per worker per day. This is what makes the upsert below work.
  constraint attendance_worker_date_key unique (worker_id, attendance_date)
);


-- ---------------------------------------------------------------------------
-- 2. Backfill any columns missing from a pre-existing table
--    Added nullable on purpose: forcing NOT NULL would fail if the table
--    already holds rows. The app always supplies these values.
-- ---------------------------------------------------------------------------
alter table public.attendance add column if not exists worker_id       uuid;
alter table public.attendance add column if not exists attendance_date date default current_date;
alter table public.attendance add column if not exists status          text default 'Present';
alter table public.attendance add column if not exists check_in        time;
alter table public.attendance add column if not exists check_out       time;
alter table public.attendance add column if not exists notes           text;
alter table public.attendance add column if not exists created_at      timestamptz default now();
alter table public.attendance add column if not exists updated_at      timestamptz default now();


-- ---------------------------------------------------------------------------
-- 3. Constraints the upsert depends on
-- ---------------------------------------------------------------------------
do $$
begin
  -- ON CONFLICT (worker_id, attendance_date) requires this unique constraint
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.attendance'::regclass
      and conname  = 'attendance_worker_date_key'
  ) then
    alter table public.attendance
      add constraint attendance_worker_date_key unique (worker_id, attendance_date);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.attendance'::regclass
      and conname  = 'attendance_status_check'
  ) then
    alter table public.attendance
      add constraint attendance_status_check
      check (status in ('Present', 'Absent', 'Half Day', 'Leave'));
  end if;
end $$;

create index if not exists attendance_date_idx   on public.attendance (attendance_date desc);
create index if not exists attendance_worker_idx on public.attendance (worker_id);


-- ---------------------------------------------------------------------------
-- 4. Keep updated_at honest
-- ---------------------------------------------------------------------------
create or replace function public.touch_attendance_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists attendance_set_updated_at on public.attendance;
create trigger attendance_set_updated_at
  before update on public.attendance
  for each row execute function public.touch_attendance_updated_at();


-- ---------------------------------------------------------------------------
-- 5. Admin check
--    Mirrors the frontend AuthContext rule: role = 'Admin' on the profile, or
--    an email containing 'admin'.
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
-- 6. Row level security
--    Admins manage everything; a worker may read only their own rows.
-- ---------------------------------------------------------------------------
alter table public.attendance enable row level security;

drop policy if exists attendance_admin_all   on public.attendance;
drop policy if exists attendance_worker_read on public.attendance;

create policy attendance_admin_all
  on public.attendance
  for all
  using (public.is_admin())
  with check (public.is_admin());

create policy attendance_worker_read
  on public.attendance
  for select
  using (worker_id = auth.uid());


-- ---------------------------------------------------------------------------
-- 7. Daily roster
--    Returns every non-admin staff member for the given date, their attendance
--    record (null if not yet marked), and the tasks they touched that day.
--    Fabric-issue log rows are excluded, matching the filter TaskManagement.jsx
--    already applies on the client.
-- ---------------------------------------------------------------------------
create or replace function public.get_attendance_roster(p_date date default current_date)
returns table (
  worker_id  uuid,
  full_name  text,
  email      text,
  status     text,
  check_in   time,
  check_out  time,
  notes      text,
  task_count integer,
  tasks      jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin privilege required';
  end if;

  return query
    select
      p.id,
      coalesce(nullif(btrim(p.full_name), ''), p.email)  as full_name,
      p.email,
      a.status,
      a.check_in,
      a.check_out,
      a.notes,
      coalesce(t.cnt, 0)                                 as task_count,
      coalesce(t.items, '[]'::jsonb)                     as tasks
    from public.profiles p
    left join public.attendance a
      on a.worker_id = p.id
     and a.attendance_date = p_date
    left join lateral (
      select
        count(*)::integer as cnt,
        jsonb_agg(
          jsonb_build_object(
            'id',      tk.id,
            'details', tk.task_details,
            'status',  tk.status
          )
          order by tk.created_at desc
        ) as items
      from public.tasks tk
      where tk.assigned_to = p.id
        and (
          tk.created_at::date = p_date
          or coalesce(tk.updated_at, tk.created_at)::date = p_date
        )
        -- exclude fabric issuance log rows
        and coalesce(tk.task_details, '') !~* '^issued '
    ) t on true
    where coalesce(p.role, '') !~* '^\s*admin\s*$'
    order by 2;
end;
$$;


-- ---------------------------------------------------------------------------
-- 8. Mark / update one worker's day
--    Upsert on (worker_id, attendance_date), so re-marking simply overwrites.
-- ---------------------------------------------------------------------------
create or replace function public.mark_attendance(
  p_worker_id uuid,
  p_date      date,
  p_status    text,
  p_check_in  time default null,
  p_check_out time default null,
  p_notes     text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin privilege required';
  end if;

  if p_status not in ('Present', 'Absent', 'Half Day', 'Leave') then
    raise exception 'Invalid status: %', p_status;
  end if;

  insert into public.attendance (
    worker_id, attendance_date, status, check_in, check_out, notes
  )
  values (
    p_worker_id, p_date, p_status, p_check_in, p_check_out, p_notes
  )
  on conflict (worker_id, attendance_date) do update
    set status    = excluded.status,
        check_in  = excluded.check_in,
        check_out = excluded.check_out,
        notes     = excluded.notes;
end;
$$;


-- ---------------------------------------------------------------------------
-- 9. Grants
-- ---------------------------------------------------------------------------
grant execute on function public.is_admin()                             to authenticated;
grant execute on function public.get_attendance_roster(date)            to authenticated;
grant execute on function public.mark_attendance(uuid, date, text, time, time, text) to authenticated;
