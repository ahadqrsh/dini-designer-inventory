import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
  CalendarCheck,
  Filter,
  Loader2,
  Inbox,
  AlertCircle,
  CheckCircle2,
  Clock,
  Calendar,
} from '../../components/Icons';
import { formatTime12, hoursBetween } from '../../lib/attendanceUtils';

const STATUS_META = {
  'Present': { pill: 'pill-green', Icon: CheckCircle2 },
  'Absent': { pill: 'pill-red', Icon: AlertCircle },
  'Half Day': { pill: 'pill-amber', Icon: Clock },
  'Leave': { pill: 'pill-blue', Icon: Calendar },
};

export default function MyAttendance() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [monthFilter, setMonthFilter] = useState('all');

  const fetchMyAttendance = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const {
        data: { user },
        error: authErr,
      } = await supabase.auth.getUser();

      if (authErr || !user) {
        console.error('User authentication error:', authErr);
        setError('Could not verify your session. Try refreshing the page.');
        setRecords([]);
        return;
      }

      // RLS restricts this table to the caller's own rows (worker_id = auth.uid()),
      // so this query can never surface another worker's attendance record.
      const { data, error: fetchErr } = await supabase
        .from('attendance')
        .select('*')
        .eq('worker_id', user.id)
        .order('attendance_date', { ascending: false });

      if (fetchErr) throw fetchErr;

      setRecords(
        (data || []).map((r) => ({
          ...r,
          month_key: r.attendance_date.slice(0, 7),
        }))
      );
    } catch (err) {
      console.error('Error fetching attendance:', err.message);
      setError(err.message || 'Failed to load your attendance.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyAttendance();
  }, [fetchMyAttendance]);

  const availableMonths = Array.from(new Set(records.map((r) => r.month_key))).filter(Boolean);

  const filtered =
    monthFilter === 'all' ? records : records.filter((r) => r.month_key === monthFilter);

  const counts = ['Present', 'Absent', 'Half Day', 'Leave'].reduce(
    (acc, s) => ({ ...acc, [s]: filtered.filter((r) => r.status === s).length }),
    {}
  );

  const monthLabel = (key) => {
    const [y, m] = key.split('-');
    return new Date(`${y}-${m}-01T00:00:00`).toLocaleDateString('en-IN', {
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* ---------- Header ---------- */}
      <div className="card overflow-hidden">
        <div className="page-banner flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className="tile-gold h-11 w-11">
              <CalendarCheck className="h-5 w-5" strokeWidth={2} />
            </span>
            <div>
              <h1 className="page-title">My Attendance</h1>
              <p className="subtle mt-1">Your own check-in and check-out history</p>
            </div>
          </div>

          {availableMonths.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-stone-500">
                <Filter className="h-3.5 w-3.5" strokeWidth={2.5} />
                Month
              </label>
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="select w-auto py-2 text-xs font-bold"
              >
                <option value="all">All Time</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {monthLabel(m)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Summary strip */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-2 divide-stone-200 sm:grid-cols-4 sm:divide-x">
            {Object.entries(STATUS_META).map(([status]) => (
              <div key={status} className="border-b border-stone-200 px-5 py-3.5 sm:border-b-0">
                <p className="eyebrow">{status}</p>
                <p className="mt-1 font-display text-xl font-extrabold text-stone-900">
                  {counts[status] ?? 0}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="alert-error">
          <AlertCircle className="mt-px h-4 w-4 shrink-0" strokeWidth={2.5} />
          <span>{error}</span>
        </div>
      )}

      {/* ---------- History ---------- */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="empty-state">
            <Loader2 className="h-6 w-6 animate-spin text-amber-800" strokeWidth={2.5} />
            <p className="text-sm font-semibold text-stone-500">Loading your attendance...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-stone-100 text-stone-400">
              <Inbox className="h-5 w-5" strokeWidth={2} />
            </span>
            <p className="text-sm font-bold text-stone-700">
              {records.length === 0
                ? 'No attendance recorded yet.'
                : 'Nothing recorded for this month.'}
            </p>
            <p className="subtle">Your studio admin marks attendance each day.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Hours</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const meta = STATUS_META[r.status] || STATUS_META.Present;
                  const { pill, Icon } = meta;
                  const duration = hoursBetween(r.check_in, r.check_out);

                  return (
                    <tr key={r.id}>
                      <td className="whitespace-nowrap font-semibold text-stone-800">
                        {new Date(`${r.attendance_date}T00:00:00`).toLocaleDateString('en-IN', {
                          weekday: 'short',
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td>
                        <span className={pill}>
                          <Icon className="h-3 w-3" strokeWidth={2.5} />
                          {r.status}
                        </span>
                      </td>
                      <td className="font-mono text-xs font-bold tabular-nums text-stone-800">
                        {formatTime12(r.check_in) || <span className="text-stone-300">—</span>}
                      </td>
                      <td className="font-mono text-xs font-bold tabular-nums text-stone-800">
                        {formatTime12(r.check_out) || <span className="text-stone-300">—</span>}
                      </td>
                      <td>
                        {duration ? (
                          <span className="pill-neutral">{duration}</span>
                        ) : (
                          <span className="text-xs text-stone-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
