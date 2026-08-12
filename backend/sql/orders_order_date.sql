-- ============================================================================
-- ORDER DATE
-- Run this once in the Supabase SQL Editor (Dashboard > SQL Editor > New query).
--
-- orders only had created_at (an audit timestamp), with no explicit
-- business-facing "date of this order" the staff can reason about or
-- backdate. This adds a plain date column, mirroring the attendance_date /
-- created_at split already used on public.attendance.
-- ============================================================================

alter table public.orders add column if not exists order_date date;

-- Backfill existing rows from their creation timestamp before enforcing NOT NULL.
update public.orders
set order_date = coalesce(order_date, created_at::date, current_date)
where order_date is null;

alter table public.orders alter column order_date set default current_date;
alter table public.orders alter column order_date set not null;

create index if not exists orders_order_date_idx on public.orders (order_date desc);
