import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { toDateInput } from '../../lib/attendanceUtils';
import {
  Wallet,
  Plus,
  X,
  Loader2,
  Inbox,
  AlertCircle,
  CheckCircle2,
  Filter,
  Trash2,
  TrendingUp,
} from '../../components/Icons';

export default function AdvancePayments() {
  const today = toDateInput(new Date());

  const [employees, setEmployees] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [monthFilter, setMonthFilter] = useState('all');
  const [message, setMessage] = useState({ type: '', text: '' });

  // Form state
  const [selectedWorker, setSelectedWorker] = useState('');
  const [amount, setAmount] = useState('');
  const [advanceDate, setAdvanceDate] = useState(today);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchStaff();
    fetchAdvances();
  }, []);

  const fetchStaff = async () => {
    const { data, error } = await supabase.rpc('get_staff_list');
    if (!error && data) {
      setEmployees(data.filter((p) => !p.role || p.role.trim().toLowerCase() !== 'admin'));
    }
  };

  const fetchAdvances = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('advances')
        .select('*')
        .order('advance_date', { ascending: false });

      if (error) throw error;
      setAdvances(data || []);
    } catch (err) {
      console.error('Error fetching advances:', err.message);
      setMessage({ type: 'error', text: err.message || 'Failed to load advances.' });
    } finally {
      setLoading(false);
    }
  };

  const workerName = (id) => {
    const emp = employees.find((e) => e.id === id);
    if (!emp) return 'Unknown Worker';
    return emp.full_name && emp.full_name.trim() !== '' ? emp.full_name : emp.email;
  };

  const handleRecordAdvance = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!selectedWorker) {
      setMessage({ type: 'error', text: 'Please select a worker.' });
      return;
    }
    const numericAmount = parseFloat(amount);
    if (!numericAmount || numericAmount <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid amount.' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('advances').insert([
        {
          worker_id: selectedWorker,
          amount: numericAmount,
          advance_date: advanceDate,
          notes: notes.trim() || null,
        },
      ]);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Advance payment recorded.' });
      setSelectedWorker('');
      setAmount('');
      setAdvanceDate(today);
      setNotes('');
      setShowForm(false);
      fetchAdvances();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to record advance.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this advance payment record?')) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.from('advances').delete().eq('id', id);
      if (error) throw error;
      setAdvances((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const withMonthKey = advances.map((a) => ({ ...a, month_key: a.advance_date.slice(0, 7) }));
  const availableMonths = Array.from(new Set(withMonthKey.map((a) => a.month_key))).filter(Boolean);
  const filtered =
    monthFilter === 'all' ? withMonthKey : withMonthKey.filter((a) => a.month_key === monthFilter);

  const totalAll = advances.reduce((acc, a) => acc + (parseFloat(a.amount) || 0), 0);
  const totalThisMonth = withMonthKey
    .filter((a) => a.month_key === today.slice(0, 7))
    .reduce((acc, a) => acc + (parseFloat(a.amount) || 0), 0);

  const monthLabel = (key) => {
    const [y, m] = key.split('-');
    return new Date(`${y}-${m}-01T00:00:00`).toLocaleDateString('en-IN', {
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="card card-hover relative overflow-hidden p-5">
          <span
            className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-stone-700 to-stone-500"
            aria-hidden="true"
          />
          <div className="flex items-start justify-between gap-4 pl-2">
            <div className="min-w-0">
              <p className="eyebrow">Total Advances Paid</p>
              <p className="mt-2 font-display text-2xl sm:text-[28px] font-extrabold leading-none tracking-tight text-stone-900">
                ₹{totalAll.toLocaleString('en-IN')}
              </p>
            </div>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-stone-100 text-stone-500">
              <Wallet className="h-[18px] w-[18px]" strokeWidth={2.2} />
            </span>
          </div>
        </div>

        <div className="card card-hover relative overflow-hidden p-5">
          <span
            className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-amber-700 to-amber-500"
            aria-hidden="true"
          />
          <div className="flex items-start justify-between gap-4 pl-2">
            <div className="min-w-0">
              <p className="eyebrow">This Month</p>
              <p className="mt-2 font-display text-2xl sm:text-[28px] font-extrabold leading-none tracking-tight text-amber-900">
                ₹{totalThisMonth.toLocaleString('en-IN')}
              </p>
            </div>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-stone-100 text-stone-500">
              <TrendingUp className="h-[18px] w-[18px]" strokeWidth={2.2} />
            </span>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl chip-dark">
            <Wallet className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <div>
            <h1 className="page-title">Advance Payments</h1>
            <p className="subtle mt-0.5">Record and track salary advances given to workers</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={showForm ? 'btn-outline' : 'btn-primary'}
        >
          {showForm ? (
            <>
              <X className="h-3.5 w-3.5" strokeWidth={2.5} />
              Close Form
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
              Record Advance
            </>
          )}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card animate-rise-in">
          <div className="card-head">
            <h2 className="section-title">Record Advance Payment</h2>
            <p className="subtle mt-0.5">This will be visible to the worker on their own account</p>
          </div>

          <div className="card-body">
            {message.text && (
              <div className={`mb-4 ${message.type === 'error' ? 'alert-error' : 'alert-success'}`}>
                {message.type === 'error' ? (
                  <AlertCircle className="mt-px h-4 w-4 shrink-0" strokeWidth={2.5} />
                ) : (
                  <CheckCircle2 className="mt-px h-4 w-4 shrink-0" strokeWidth={2.5} />
                )}
                <span>{message.text}</span>
              </div>
            )}

            <form onSubmit={handleRecordAdvance} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="label">Select Worker *</label>
                  <select
                    value={selectedWorker}
                    onChange={(e) => setSelectedWorker(e.target.value)}
                    className="select"
                    required
                  >
                    <option value="">-- Choose Worker --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name && emp.full_name.trim() !== '' ? emp.full_name : emp.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Amount (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="e.g. 2000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="label">Date *</label>
                  <input
                    type="date"
                    value={advanceDate}
                    max={today}
                    onChange={(e) => setAdvanceDate(e.target.value)}
                    className="input"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label">Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Reason, repayment terms, etc."
                  className="input h-20 resize-y leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-stone-200 pt-4">
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.5} />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                      Save Advance
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History */}
      <div className="card overflow-hidden">
        <div className="card-head flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-100 text-amber-800">
              <Wallet className="h-[18px] w-[18px]" strokeWidth={2.2} />
            </span>
            <div>
              <h2 className="section-title">Payment History</h2>
              <p className="subtle">All recorded advances, most recent first</p>
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
            <p className="text-sm font-semibold text-stone-500">Loading advances...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-stone-100 text-stone-400">
              <Inbox className="h-5 w-5" strokeWidth={2} />
            </span>
            <p className="text-sm font-bold text-stone-700">
              {advances.length === 0 ? 'No advances recorded yet.' : 'Nothing recorded for this month.'}
            </p>
            <p className="subtle">Use "Record Advance" to log a payment.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Worker</th>
                  <th>Amount</th>
                  <th>Notes</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id}>
                    <td className="whitespace-nowrap font-semibold text-stone-800">
                      {new Date(`${a.advance_date}T00:00:00`).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="font-bold text-stone-900">{workerName(a.worker_id)}</td>
                    <td className="font-mono text-xs font-bold tabular-nums text-stone-800">
                      ₹{parseFloat(a.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="max-w-xs truncate text-stone-500">
                      {a.notes || <span className="text-stone-300">—</span>}
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => handleDelete(a.id)}
                        disabled={deletingId === a.id}
                        className="btn-danger btn-sm"
                      >
                        {deletingId === a.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.5} />
                        ) : (
                          <Trash2 className="h-3 w-3" strokeWidth={2.5} />
                        )}
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
