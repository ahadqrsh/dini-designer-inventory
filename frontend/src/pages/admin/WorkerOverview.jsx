import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { formatTime12, hoursBetween } from '../../lib/attendanceUtils';
import {
  History,
  Users,
  Loader2,
  Inbox,
  AlertCircle,
  CheckCircle2,
  Clock,
  Calendar,
  Filter,
  Wallet,
  ListChecks,
} from '../../components/Icons';

const STATUS_META = {
  'Present': { pill: 'pill-green', Icon: CheckCircle2 },
  'Absent': { pill: 'pill-red', Icon: AlertCircle },
  'Half Day': { pill: 'pill-amber', Icon: Clock },
  'Leave': { pill: 'pill-blue', Icon: Calendar },
};

export default function WorkerOverview() {
  const [employees, setEmployees] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [monthFilter, setMonthFilter] = useState('all');

  const [attendance, setAttendance] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [advances, setAdvances] = useState([]);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    const { data, error: err } = await supabase.rpc('get_staff_list');
    if (!err && data) {
      setEmployees(data.filter((p) => !p.role || p.role.trim().toLowerCase() !== 'admin'));
    }
  };

  const fetchOverview = useCallback(async (workerId) => {
    if (!workerId) return;
    setLoading(true);
    setError('');

    try {
      const [attRes, taskRes, advRes] = await Promise.all([
        supabase
          .from('attendance')
          .select('*')
          .eq('worker_id', workerId)
          .order('attendance_date', { ascending: false }),
        supabase
          .from('tasks')
          .select('*')
          .eq('assigned_to', workerId)
          .order('created_at', { ascending: false }),
        supabase
          .from('advances')
          .select('*')
          .eq('worker_id', workerId)
          .order('advance_date', { ascending: false }),
      ]);

      if (attRes.error) throw attRes.error;
      if (taskRes.error) throw taskRes.error;
      if (advRes.error) throw advRes.error;

      const pureTasks = (taskRes.data || []).filter(
        (t) => !t.task_details || !t.task_details.toLowerCase().startsWith('issued ')
      );

      setAttendance(attRes.data || []);
      setTasks(pureTasks);
      setAdvances(advRes.data || []);
    } catch (err) {
      console.error('Error fetching worker overview:', err.message);
      setError(err.message || 'Failed to load worker overview.');
      setAttendance([]);
      setTasks([]);
      setAdvances([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedWorker) {
      setMonthFilter('all');
      fetchOverview(selectedWorker);
    } else {
      setAttendance([]);
      setTasks([]);
      setAdvances([]);
    }
  }, [selectedWorker, fetchOverview]);

  const worker = employees.find((e) => e.id === selectedWorker);
  const workerDisplayName = worker
    ? worker.full_name && worker.full_name.trim() !== ''
      ? worker.full_name
      : worker.email
    : '';

  // Merge attendance + tasks + advances into one row per date.
  const dateMap = {};
  attendance.forEach((a) => {
    dateMap[a.attendance_date] = { ...(dateMap[a.attendance_date] || {}), attendance: a };
  });
  tasks.forEach((t) => {
    const d = (t.updated_at || t.created_at || '').slice(0, 10);
    if (!d) return;
    const bucket = dateMap[d] || {};
    dateMap[d] = { ...bucket, tasks: [...(bucket.tasks || []), t] };
  });
  advances.forEach((a) => {
    const bucket = dateMap[a.advance_date] || {};
    dateMap[a.advance_date] = { ...bucket, advances: [...(bucket.advances || []), a] };
  });

  const allRows = Object.entries(dateMap)
    .map(([date, v]) => ({ date, month_key: date.slice(0, 7), ...v }))
    .sort((a, b) => b.date.localeCompare(a.date));

  const availableMonths = Array.from(new Set(allRows.map((r) => r.month_key))).filter(Boolean);
  const rows = monthFilter === 'all' ? allRows : allRows.filter((r) => r.month_key === monthFilter);

  const monthLabel = (key) => {
    const [y, m] = key.split('-');
    return new Date(`${y}-${m}-01T00:00:00`).toLocaleDateString('en-IN', {
      month: 'long',
      year: 'numeric',
    });
  };

  // Summary counts, scoped to the current month filter
  const filteredAttendance = rows.map((r) => r.attendance).filter(Boolean);
  const counts = ['Present', 'Absent', 'Half Day', 'Leave'].reduce(
    (acc, s) => ({ ...acc, [s]: filteredAttendance.filter((a) => a.status === s).length }),
    {}
  );
  const totalAdvance = rows
    .flatMap((r) => r.advances || [])
    .reduce((acc, a) => acc + (parseFloat(a.amount) || 0), 0);
  const totalTasks = rows.reduce((acc, r) => acc + (r.tasks?.length || 0), 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header + worker picker */}
      <div className="card overflow-hidden">
        <div className="page-banner flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className="tile-gold h-11 w-11">
              <History className="h-5 w-5" strokeWidth={2} />
            </span>
            <div>
              <h1 className="page-title">Worker Overview</h1>
              <p className="subtle mt-1">
                Attendance, tasks, and advances for one worker across every date
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-stone-500">
              <Users className="h-3.5 w-3.5" strokeWidth={2.5} />
              Worker
            </label>
            <select
              value={selectedWorker}
              onChange={(e) => setSelectedWorker(e.target.value)}
              className="select w-auto py-2 text-xs font-bold"
            >
              <option value="">-- Choose Worker --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name && emp.full_name.trim() !== '' ? emp.full_name : emp.email}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedWorker && !loading && rows.length > 0 && (
          <div className="grid grid-cols-2 divide-stone-200 sm:grid-cols-3 lg:grid-cols-6 sm:divide-x">
            {Object.entries(STATUS_META).map(([status]) => (
              <div key={status} className="border-b border-stone-200 px-5 py-3.5 sm:border-b-0">
                <p className="eyebrow">{status}</p>
                <p className="mt-1 font-display text-xl font-extrabold text-stone-900">
                  {counts[status] ?? 0}
                </p>
              </div>
            ))}
            <div className="border-b border-stone-200 px-5 py-3.5 sm:border-b-0">
              <p className="eyebrow">Tasks</p>
              <p className="mt-1 font-display text-xl font-extrabold text-stone-900">{totalTasks}</p>
            </div>
            <div className="border-b border-stone-200 px-5 py-3.5 sm:border-b-0">
              <p className="eyebrow">Advances</p>
              <p className="mt-1 font-display text-xl font-extrabold text-amber-800">
                ₹{totalAdvance.toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="alert-error">
          <AlertCircle className="mt-px h-4 w-4 shrink-0" strokeWidth={2.5} />
          <span>{error}</span>
        </div>
      )}

      {/* Timeline */}
      {!selectedWorker ? (
        <div className="card empty-state">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-stone-100 text-stone-400">
            <Users className="h-5 w-5" strokeWidth={2} />
          </span>
          <p className="text-sm font-bold text-stone-700">Choose a worker to see their history.</p>
          <p className="subtle">Pick a name from the dropdown above.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="card-head flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-100 text-amber-800">
                <History className="h-[18px] w-[18px]" strokeWidth={2.2} />
              </span>
              <div>
                <h2 className="section-title">{workerDisplayName}'s Timeline</h2>
                <p className="subtle">Every date with an attendance mark, task, or advance</p>
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

          {loading ? (
            <div className="empty-state">
              <Loader2 className="h-6 w-6 animate-spin text-amber-800" strokeWidth={2.5} />
              <p className="text-sm font-semibold text-stone-500">Loading history...</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="empty-state">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-stone-100 text-stone-400">
                <Inbox className="h-5 w-5" strokeWidth={2} />
              </span>
              <p className="text-sm font-bold text-stone-700">Nothing recorded for this worker yet.</p>
              <p className="subtle">Attendance, tasks, and advances will appear here once logged.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Attendance</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Tasks</th>
                    <th>Advance</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const a = r.attendance;
                    const meta = a ? STATUS_META[a.status] || STATUS_META.Present : null;
                    const duration = a ? hoursBetween(a.check_in, a.check_out) : null;
                    const dayAdvanceTotal = (r.advances || []).reduce(
                      (acc, x) => acc + (parseFloat(x.amount) || 0),
                      0
                    );

                    return (
                      <tr key={r.date}>
                        <td className="whitespace-nowrap font-semibold text-stone-800">
                          {new Date(`${r.date}T00:00:00`).toLocaleDateString('en-IN', {
                            weekday: 'short',
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>

                        <td>
                          {a ? (
                            <span className={meta.pill}>
                              <meta.Icon className="h-3 w-3" strokeWidth={2.5} />
                              {a.status}
                            </span>
                          ) : (
                            <span className="pill-neutral">Unmarked</span>
                          )}
                        </td>

                        <td className="font-mono text-xs font-bold tabular-nums text-stone-800">
                          {a ? formatTime12(a.check_in) || <span className="text-stone-300">—</span> : <span className="text-stone-300">—</span>}
                        </td>
                        <td className="font-mono text-xs font-bold tabular-nums text-stone-800">
                          {a ? (
                            <span className="flex items-center gap-2">
                              {formatTime12(a.check_out) || <span className="text-stone-300">—</span>}
                              {duration && <span className="pill-neutral">{duration}</span>}
                            </span>
                          ) : (
                            <span className="text-stone-300">—</span>
                          )}
                        </td>

                        <td className="max-w-sm">
                          {!r.tasks || r.tasks.length === 0 ? (
                            <span className="text-xs text-stone-300">—</span>
                          ) : (
                            <div className="space-y-1">
                              <span className="pill-neutral">
                                <ListChecks className="h-3 w-3" strokeWidth={2.5} />
                                {r.tasks.length} {r.tasks.length === 1 ? 'task' : 'tasks'}
                              </span>
                              <ul className="space-y-0.5">
                                {r.tasks.map((t) => (
                                  <li key={t.id} className="whitespace-pre-wrap text-xs text-stone-600">
                                    {t.task_details}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </td>

                        <td className="font-mono text-xs font-bold tabular-nums text-stone-800">
                          {dayAdvanceTotal > 0 ? (
                            <span className="inline-flex items-center gap-1.5 text-amber-800">
                              <Wallet className="h-3 w-3" strokeWidth={2.5} />₹
                              {dayAdvanceTotal.toLocaleString('en-IN')}
                            </span>
                          ) : (
                            <span className="text-stone-300">—</span>
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
      )}
    </div>
  );
}
