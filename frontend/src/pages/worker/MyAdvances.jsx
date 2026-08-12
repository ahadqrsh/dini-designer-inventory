import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Wallet, Loader2, Inbox, AlertCircle, TrendingUp } from '../../components/Icons';

export default function MyAdvances() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMyAdvances = useCallback(async () => {
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

      // RLS restricts this table to the caller's own rows (worker_id = auth.uid()).
      const { data, error: fetchErr } = await supabase
        .from('advances')
        .select('*')
        .eq('worker_id', user.id)
        .order('advance_date', { ascending: false });

      if (fetchErr) throw fetchErr;

      setRecords(data || []);
    } catch (err) {
      console.error('Error fetching advances:', err.message);
      setError(err.message || 'Failed to load your advance payments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyAdvances();
  }, [fetchMyAdvances]);

  const total = records.reduce((acc, r) => acc + (parseFloat(r.amount) || 0), 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="card overflow-hidden">
        <div className="page-banner flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className="tile-gold h-11 w-11">
              <Wallet className="h-5 w-5" strokeWidth={2} />
            </span>
            <div>
              <h1 className="page-title">My Advances</h1>
              <p className="subtle mt-1">Advance payments recorded against your account</p>
            </div>
          </div>
        </div>

        {!loading && records.length > 0 && (
          <div className="px-5 py-3.5">
            <p className="eyebrow">Total Received</p>
            <p className="mt-1 flex items-center gap-2 font-display text-2xl font-extrabold text-stone-900">
              <TrendingUp className="h-5 w-5 text-amber-700" strokeWidth={2.2} />
              ₹{total.toLocaleString('en-IN')}
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="alert-error">
          <AlertCircle className="mt-px h-4 w-4 shrink-0" strokeWidth={2.5} />
          <span>{error}</span>
        </div>
      )}

      {/* History */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="empty-state">
            <Loader2 className="h-6 w-6 animate-spin text-amber-800" strokeWidth={2.5} />
            <p className="text-sm font-semibold text-stone-500">Loading your advances...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="empty-state">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-stone-100 text-stone-400">
              <Inbox className="h-5 w-5" strokeWidth={2} />
            </span>
            <p className="text-sm font-bold text-stone-700">No advances recorded yet.</p>
            <p className="subtle">Your studio admin records advances here when given.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap font-semibold text-stone-800">
                      {new Date(`${r.advance_date}T00:00:00`).toLocaleDateString('en-IN', {
                        weekday: 'short',
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="font-mono text-xs font-bold tabular-nums text-stone-800">
                      ₹{parseFloat(r.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="max-w-sm text-stone-500">
                      {r.notes || <span className="text-stone-300">—</span>}
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
