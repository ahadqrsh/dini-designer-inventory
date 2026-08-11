-- ============================================================================
-- ATTENDANCE — WORKER READ ACCESS
-- Run this once in the Supabase SQL Editor, after backend/sql/attendance.sql.
--
-- The original migration added a row-level security policy
-- (attendance_worker_read) so a worker can only ever see their own rows —
-- but a policy only narrows which rows are visible; it does not by itself
-- grant permission to query the table. Most Supabase projects grant broad
-- table privileges to the `authenticated` role by default, in which case
-- this is a no-op. This statement makes that grant explicit rather than
-- relying on an assumption, so the worker's "My Attendance" page (which
-- reads public.attendance directly, not through an RPC) is guaranteed to
-- work regardless of the project's default privileges.
--
-- Safe to run multiple times.
-- ============================================================================

grant select on public.attendance to authenticated;
