import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Inbox,
  ListChecks,
  UserCheck,
} from '../../components/Icons';

const STATUSES = ['Present', 'Absent', 'Half Day', 'Leave'];

const STATUS_STYLES = {
  'Present': 'bg-emerald-50 text-emerald-800 border-emerald-300',
  'Absent': 'bg-red-50 text-red-800 border-red-300',
  'Half Day': 'bg-amber-50 text-amber-800 border-amber-300',
  'Leave': 'bg-blue-50 text-blue-800 border-blue-300',
  'Unmarked': 'bg-stone-100 text-stone-500 border-stone-300',
};

const SUMMARY_TONE = {
  'Present': 'text-emerald-700',
  'Absent': 'text-red-600',
  'Half Day': 'text-amber-700',
  'Leave': 'text-blue-700',
  'Unmarked': 'text-stone-400',
};

// yyyy-mm-dd for the local timezone (toISOString would shift the date)
const toDateInput = (d) => {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const shiftDate = (isoDate, days) => {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toDateInput(d);
};

// Postgres returns 'HH:MM:SS'; <input type="time"> wants 'HH:MM'
const toTimeInput = (t) => (t ? String(t).slice(0, 5) : '');

export default function Attendance() {
  const today = toDateInput(new Date());

  const [date, setDate] = useState(today);
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [savedId, setSavedId] = useState(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const fetchRoster = useCallback(async (forDate) => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    const { data, error } = await supabase.rpc('get_attendance_roster', {
      p_date: forDate,
    });

    if (error) {
      console.error('Error fetching roster:', error);
      setMessage({
        type: 'error',
        text:
          error.message?.includes('function')
            ? 'Attendance functions not found. Run backend/sql/attendance.sql in the Supabase SQL editor first.'
            : error.message || 'Failed to load attendance roster.',
      });
      setRoster([]);
    } else {
      setRoster(
        (data || []).map((r) => ({
          ...r,
          check_in: toTimeInput(r.check_in),
          check_out: toTimeInput(r.check_out),
        }))
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRoster(date);
  }, [date, fetchRoster]);

  // Persist one worker's row. Optimistic: the UI updates first, and reverts
  // only if the write actually fails.
  const persist = async (row, patch) => {
    const next = { ...row, ...patch };
    const previous = roster;

    setRoster((prev) => prev.map((r) => (r.worker_id === row.worker_id ? next : r)));
    setSavingId(row.worker_id);
    setSavedId(null);

    const { error } = await supabase.rpc('mark_attendance', {
      p_worker_id: row.worker_id,
      p_date: date,
      p_status: next.status || 'Present',
      p_check_in: next.check_in || null,
      p_check_out: next.check_out || null,
      p_notes: next.notes || null,
    });

    setSavingId(null);

    if (error) {
      console.error('Error saving attendance:', error);
      setRoster(previous);
      setMessage({ type: 'error', text: error.message || 'Failed to save attendance.' });
    } else {
      setSavedId(row.worker_id);
      setTimeout(() => setSavedId((id) => (id === row.worker_id ? null : id)), 1600);
    }
  };

  const markAllPresent = async () => {
    const unmarked = roster.filter((r) => !r.status);
    if (unmarked.length === 0) return;

    setBulkSaving(true);
    setMessage({ type: '', text: '' });

    const results = await Promise.all(
      unmarked.map((r) =>
        supabase.rpc('mark_attendance', {
          p_worker_id: r.worker_id,
          p_date: date,
          p_status: 'Present',
          p_check_in: r.check_in || null,
          p_check_out: r.check_out || null,
          p_notes: r.notes || null,
        })
      )
    );

    setBulkSaving(false);

    const failed = results.filter((r) => r.error);
    if (failed.length > 0) {
      setMessage({
        type: 'error',
        text: `${failed.length} of ${unmarked.length} could not be saved.`,
      });
    } else {
      setMessage({ type: 'success', text: `Marked ${unmarked.length} present.` });
    }
    fetchRoster(date);
  };

  const counts = STATUSES.reduce(
    (acc, s) => ({ ...acc, [s]: roster.filter((r) => r.status === s).length }),
    {}
  );
  counts.Unmarked = roster.filter((r) => !r.status).length;

  const isToday = date === today;
  const prettyDate = new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* ---------- Header + date navigation ---------- */}
      <div className="card overflow-hidden">
        <div className="page-banner flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className="tile-gold h-11 w-11">
              <CalendarCheck className="h-5 w-5" strokeWidth={2} />
            </span>
            <div>
              <h1 className="page-title">Daily Attendance</h1>
              <p className="subtle mt-1">{prettyDate}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setDate((d) => shiftDate(d, -1))}
              aria-label="Previous day"
              className="grid h-9 w-9 place-items-center rounded-xl border border-stone-300 bg-white text-stone-600 shadow-sm transition-colors hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
            </button>

            <input
              type="date"
              value={date}
              max={today}
              onChange={(e) => setDate(e.target.value || today)}
              className="input w-auto px-3 py-2 text-xs font-bold"
            />

            <button
              onClick={() => setDate((d) => shiftDate(d, 1))}
              disabled={isToday}
              aria-label="Next day"
              className="grid h-9 w-9 place-items-center rounded-xl border border-stone-300 bg-white text-stone-600 shadow-sm transition-colors hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-stone-300 disabled:hover:bg-white"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
            </button>

            {!isToday && (
              <button onClick={() => setDate(today)} className="btn-outline btn-sm">
                Today
              </button>
            )}
          </div>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-2 divide-stone-200 sm:grid-cols-5 sm:divide-x">
          {[...STATUSES, 'Unmarked'].map((s) => (
            <div key={s} className="border-b border-stone-200 px-5 py-3.5 sm:border-b-0">
              <p className="eyebrow">{s}</p>
              <p className={`mt-1 font-display text-xl font-extrabold ${SUMMARY_TONE[s]}`}>
                {counts[s] ?? 0}
              </p>
            </div>
          ))}
        </div>
      </div>

      {message.text && (
        <div className={message.type === 'error' ? 'alert-error' : 'alert-success'}>
          {message.type === 'error' ? (
            <AlertCircle className="mt-px h-4 w-4 shrink-0" strokeWidth={2.5} />
          ) : (
            <CheckCircle2 className="mt-px h-4 w-4 shrink-0" strokeWidth={2.5} />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* ---------- Roster ---------- */}
      <div className="card overflow-hidden">
        <div className="card-head flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-100 text-amber-800">
              <UserCheck className="h-[18px] w-[18px]" strokeWidth={2.2} />
            </span>
            <div>
              <h2 className="section-title">Staff Roster</h2>
              <p className="subtle">Changes save as you make them</p>
            </div>
          </div>

          {counts.Unmarked > 0 && !loading && (
            <button onClick={markAllPresent} disabled={bulkSaving} className="btn-outline btn-sm">
              {bulkSaving ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.5} />
                  Marking...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3 w-3" strokeWidth={2.5} />
                  Mark {counts.Unmarked} Present
                </>
              )}
            </button>
          )}
        </div>

        {loading ? (
          <div className="empty-state">
            <Loader2 className="h-6 w-6 animate-spin text-amber-800" strokeWidth={2.5} />
            <p className="text-sm font-semibold text-stone-500">Loading roster...</p>
          </div>
        ) : roster.length === 0 ? (
          <div className="empty-state">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-stone-100 text-stone-400">
              <Inbox className="h-5 w-5" strokeWidth={2} />
            </span>
            <p className="text-sm font-bold text-stone-700">No staff to show.</p>
            <p className="subtle">Create employee accounts to build the roster.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Worker</th>
                  <th>Status</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Tasks That Day</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {roster.map((row) => {
                  const status = row.status || 'Unmarked';
                  const off = row.status === 'Absent' || row.status === 'Leave';

                  return (
                    <tr key={row.worker_id}>
                      <td className="min-w-[180px]">
                        <p className="font-bold text-stone-900">{row.full_name}</p>
                        <p className="mt-0.5 text-xs text-stone-500">{row.email}</p>
                      </td>

                      <td>
                        <select
                          value={row.status || ''}
                          onChange={(e) => {
                            const nextStatus = e.target.value;
                            // Absent/Leave means no shift — drop any stale times
                            // rather than storing hours for a day not worked.
                            const clearsTimes =
                              nextStatus === 'Absent' || nextStatus === 'Leave';
                            persist(
                              row,
                              clearsTimes
                                ? { status: nextStatus, check_in: '', check_out: '' }
                                : { status: nextStatus }
                            );
                          }}
                          className={`pill-select ${STATUS_STYLES[status]}`}
                        >
                          <option value="" disabled>
                            Unmarked
                          </option>
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td>
                        <input
                          type="time"
                          value={row.check_in}
                          disabled={off}
                          onChange={(e) => persist(row, { check_in: e.target.value })}
                          className="input w-32 px-2.5 py-1.5 text-xs"
                        />
                      </td>

                      <td>
                        <input
                          type="time"
                          value={row.check_out}
                          disabled={off}
                          onChange={(e) => persist(row, { check_out: e.target.value })}
                          className="input w-32 px-2.5 py-1.5 text-xs"
                        />
                      </td>

                      <td className="max-w-xs">
                        {row.task_count === 0 ? (
                          <span className="text-xs text-stone-400">No tasks recorded</span>
                        ) : (
                          <div className="space-y-1">
                            <span className="pill-neutral">
                              <ListChecks className="h-3 w-3" strokeWidth={2.5} />
                              {row.task_count} {row.task_count === 1 ? 'task' : 'tasks'}
                            </span>
                            <ul className="space-y-0.5">
                              {(row.tasks || []).slice(0, 2).map((t) => (
                                <li key={t.id} className="truncate text-xs text-stone-600">
                                  {t.details}
                                </li>
                              ))}
                              {row.task_count > 2 && (
                                <li className="text-[11px] font-semibold text-stone-400">
                                  +{row.task_count - 2} more
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                      </td>

                      <td className="text-right">
                        {savingId === row.worker_id ? (
                          <Loader2
                            className="ml-auto h-3.5 w-3.5 animate-spin text-stone-400"
                            strokeWidth={2.5}
                          />
                        ) : savedId === row.worker_id ? (
                          <CheckCircle2
                            className="ml-auto h-3.5 w-3.5 text-emerald-600 animate-fade-in"
                            strokeWidth={2.5}
                          />
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-stone-200 bg-stone-50/60 px-5 py-3">
          <p className="flex items-center gap-1.5 text-[11px] text-stone-400">
            <Clock className="h-3 w-3" strokeWidth={2.5} />
            Clock times are disabled for Absent and Leave.
          </p>
        </div>
      </div>
    </div>
  );
}
