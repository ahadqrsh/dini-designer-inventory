import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
  Search,
  Package,
  TrendingUp,
  Wallet,
  Ruler,
  Phone,
  Inbox,
  X,
  FileText,
  StickyNote,
  Loader2,
  CheckCircle2,
} from '../../components/Icons';

const STATUS_COLOURS = {
  'Pending': 'bg-amber-100 text-amber-800 border-amber-300',
  'In Cutting': 'bg-blue-100 text-blue-800 border-blue-300',
  'Stitching': 'bg-purple-100 text-purple-800 border-purple-300',
  'Ready': 'bg-emerald-100 text-emerald-800 border-emerald-300',
  'Delivered': 'bg-gray-100 text-gray-700 border-gray-300',
};

// Small accent used on the left edge of each stat card
const STAT_ACCENT = {
  amber: 'from-amber-700 to-amber-500',
  ink: 'from-stone-700 to-stone-500',
  red: 'from-red-700 to-red-500',
};

function StatCard({ label, value, suffix, Icon, tone = 'amber', valueClass }) {
  return (
    <div className="card card-hover relative overflow-hidden p-5">
      <span
        className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${STAT_ACCENT[tone]}`}
        aria-hidden="true"
      />
      <div className="flex items-start justify-between gap-4 pl-2">
        <div className="min-w-0">
          <p className="eyebrow">{label}</p>
          <p className={`mt-2 font-display text-2xl sm:text-[28px] font-extrabold leading-none tracking-tight ${valueClass}`}>
            {value}
            {suffix && (
              <span className="ml-1.5 text-xs font-semibold tracking-normal text-stone-400">
                {suffix}
              </span>
            )}
          </p>
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-stone-100 text-stone-500">
          <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
        </span>
      </div>
    </div>
  );
}

// One row of the measurement sheet in the modal
function MeasureRow({ index, label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-stone-200 py-1.5 last:border-b-0">
      <span className="flex items-baseline gap-2 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
        <span className="w-5 text-right font-mono text-[10px] text-stone-300">{index}</span>
        {label}
      </span>
      <span
        className={`font-mono text-sm font-bold tabular-nums ${
          value || value === 0 ? 'text-stone-900' : 'text-stone-300'
        }`}
      >
        {value || value === 0 ? value : '—'}
      </span>
    </div>
  );
}

export default function OrderList() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        customers (
          name,
          phone
        )
      `)
      .order('order_date', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      alert('Failed to update order status');
    } else {
      setOrders((prev) =>
        prev.map((ord) => (ord.id === orderId ? { ...ord, status: newStatus } : ord))
      );
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => ({ ...prev, status: newStatus }));
      }
    }
  };

  const filteredOrders = orders.filter((order) => {
    const custName = order.customers?.name?.toLowerCase() || '';
    const custPhone = order.customers?.phone || '';
    const query = search.toLowerCase();
    return custName.includes(query) || custPhone.includes(query) || order.sub_category?.toLowerCase().includes(query);
  });

  // Business Analytics Metrics
  const totalRevenue = orders.reduce((acc, curr) => acc + (parseFloat(curr.total_price) || 0), 0);
  // Delivered orders are treated as settled everywhere else in this page, so
  // they must not keep inflating the outstanding balance figure.
  const totalPendingBalance = orders.reduce(
    (acc, curr) =>
      curr.status === 'Delivered'
        ? acc
        : acc +
          Math.max(0, (parseFloat(curr.total_price) || 0) - (parseFloat(curr.advance_paid) || 0)),
    0
  );
  const activeOrdersCount = orders.filter((o) => o.status !== 'Delivered').length;

  const leftMeasurements = [
    ['CHEST', 'chest'],
    ['L CHEST', 'l_chest'],
    ['LENGTH', 'length'],
    ['WAIST', 'waist'],
    ['NECK FRONT', 'neck_front'],
    ['NECK BACK', 'neck_back'],
    ['ARMHOLE', 'armhole'],
    ['SHOULDER', 'shoulder'],
    ['DART POINT', 'dart_point'],
    ['SLEEVE', 'sleeve'],
  ];

  const rightMeasurements = [
    ['SLEEVE CIRCUM', 'sleeve_circum'],
    ['BICEP', 'bicep'],
    ['THIGHS', 'thighs'],
    ['B. LENGTH', 'b_length'],
    ['B. WAIST', 'b_waist'],
    ['HIPS', 'hips'],
    ['CROTCH', 'crotch'],
    ['KNEE', 'knee'],
    ['B. CIRCUM', 'b_circum'],
    ['OTHERS', 'others'],
  ];

  return (
    <div className="space-y-6">
      {/* Top Business Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Active Work In Progress"
          value={activeOrdersCount}
          suffix="Orders"
          Icon={Package}
          tone="amber"
          valueClass="text-amber-900"
        />
        <StatCard
          label="Total Sales Volume"
          value={`₹${totalRevenue.toLocaleString('en-IN')}`}
          Icon={TrendingUp}
          tone="ink"
          valueClass="text-stone-900"
        />
        <StatCard
          label="Outstanding Customer Balance"
          value={`₹${totalPendingBalance.toLocaleString('en-IN')}`}
          Icon={Wallet}
          tone="red"
          valueClass="text-red-600"
        />
      </div>

      {/* Main Table Container */}
      <div className="card overflow-hidden">
        <div className="card-head flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="page-title">Bespoke Orders Register</h2>
            <p className="subtle mt-1">
              Track production progress, payments, and body measurements
            </p>
          </div>
          <div className="relative w-full md:w-80">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
              strokeWidth={2.2}
            />
            <input
              type="text"
              placeholder="Search name, phone, or garment..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="empty-state">
            <Loader2 className="h-6 w-6 animate-spin text-amber-800" strokeWidth={2.5} />
            <p className="text-sm font-semibold text-stone-500">Fetching studio orders...</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Garment</th>
                  <th>Status</th>
                  <th>Financials</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr className="hover:bg-transparent">
                    <td colSpan="6">
                      <div className="empty-state">
                        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-stone-100 text-stone-400">
                          <Inbox className="h-5 w-5" strokeWidth={2} />
                        </span>
                        <p className="text-sm font-bold text-stone-700">No matching records found.</p>
                        <p className="subtle">
                          {search ? 'Try a different name, phone, or garment.' : 'New orders will appear here.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const balance = (order.total_price || 0) - (order.advance_paid || 0);
                    const isDelivered = order.status === 'Delivered';
                    return (
                      <tr key={order.id} className="group">
                        <td className="whitespace-nowrap font-mono text-xs text-stone-500">
                          {new Date(`${order.order_date || order.created_at.slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td>
                          <p className="font-bold text-stone-900">{order.customers?.name || 'N/A'}</p>
                          <p className="mt-0.5 font-mono text-xs text-stone-500">
                            {order.customers?.phone || 'N/A'}
                          </p>
                        </td>
                        <td>
                          <p className="font-semibold text-stone-800">{order.sub_category}</p>
                          <span className="text-xs text-stone-500">{order.main_category}</span>
                        </td>
                        <td>
                          <select
                            value={order.status || 'Pending'}
                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                            className={`pill-select ${STATUS_COLOURS[order.status || 'Pending']}`}
                          >
                            <option value="Pending">Pending</option>
                            <option value="In Cutting">In Cutting</option>
                            <option value="Stitching">Stitching</option>
                            <option value="Ready">Ready</option>
                            <option value="Delivered">Delivered</option>
                          </select>
                        </td>
                        <td className="whitespace-nowrap text-xs">
                          {isDelivered ? (
                            // Delivered orders are closed out — the money view is
                            // noise here. The register modal still holds the record.
                            <span className="pill-neutral">
                              <CheckCircle2 className="h-3 w-3" strokeWidth={2.5} />
                              Settled
                            </span>
                          ) : (
                            <>
                              <div className="font-semibold text-stone-600">
                                Total:{' '}
                                <span className="font-bold text-stone-900">₹{order.total_price}</span>
                              </div>
                              <div
                                className={`mt-1 font-bold ${
                                  balance > 0 ? 'text-red-600' : 'text-emerald-700'
                                }`}
                              >
                                {balance > 0 ? `Due: ₹${balance}` : 'Paid in Full'}
                              </div>
                            </>
                          )}
                        </td>
                        <td className="text-center">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="btn-primary btn-sm"
                          >
                            <Ruler className="h-3.5 w-3.5" strokeWidth={2.5} />
                            View Register
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Measurement Register Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="card max-h-[90vh] w-full max-w-3xl overflow-y-auto shadow-pop animate-pop-in">
            {/* Modal header */}
            <div className="page-banner sticky top-0 z-10 flex items-start justify-between gap-4 rounded-t-2xl p-6">
              <div className="min-w-0">
                <span className="pill-amber font-mono">
                  <FileText className="h-3 w-3" strokeWidth={2.5} />
                  Order Register
                </span>
                <h3 className="mt-2.5 truncate font-display text-2xl font-semibold tracking-tight text-stone-900">
                  {selectedOrder.customers?.name}
                </h3>
                <p className="mt-1.5 flex items-center gap-1.5 font-mono text-xs text-stone-500">
                  <Phone className="h-3 w-3" strokeWidth={2.5} />
                  {selectedOrder.customers?.phone}
                </p>
                <p className="mt-1 font-mono text-xs text-stone-400">
                  Ordered{' '}
                  {new Date(
                    `${selectedOrder.order_date || selectedOrder.created_at.slice(0, 10)}T00:00:00`
                  ).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                aria-label="Close register"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-stone-300 bg-white text-stone-500 shadow-sm transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700"
              >
                <X className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </div>

            <div className="space-y-6 p-6">
              {/* Garment Details & Status */}
              <div className="panel-warm grid grid-cols-2 gap-4 p-4 md:grid-cols-4">
                <div>
                  <p className="eyebrow">Garment Type</p>
                  <p className="mt-1 text-sm font-bold text-amber-950">{selectedOrder.sub_category}</p>
                </div>
                <div>
                  <p className="eyebrow">Category</p>
                  <p className="mt-1 text-sm font-bold text-amber-950">{selectedOrder.main_category}</p>
                </div>
                <div>
                  <p className="eyebrow">Colour Spec</p>
                  <p className="mt-1 text-sm font-bold text-amber-950">{selectedOrder.colour || 'N/A'}</p>
                </div>
                <div>
                  <p className="eyebrow">Production Status</p>
                  <span
                    className={`pill mt-1.5 ${STATUS_COLOURS[selectedOrder.status || 'Pending']}`}
                  >
                    {selectedOrder.status || 'Pending'}
                  </span>
                </div>
              </div>

              {/* 20-Point Measurement Sheet */}
              <div>
                <h4 className="eyebrow mb-3 flex items-center gap-2">
                  <Ruler className="h-3.5 w-3.5" strokeWidth={2.5} />
                  20-Point Tailoring Measurement Sheet
                </h4>
                <div className="panel-muted grid grid-cols-1 gap-x-8 p-4 sm:grid-cols-2">
                  <div className="sm:border-r sm:border-stone-200 sm:pr-6">
                    {leftMeasurements.map(([label, key], i) => (
                      <MeasureRow key={key} index={i + 1} label={label} value={selectedOrder[key]} />
                    ))}
                  </div>
                  <div className="sm:pl-2">
                    {rightMeasurements.map(([label, key], i) => (
                      <MeasureRow key={key} index={i + 11} label={label} value={selectedOrder[key]} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Special Instructions */}
              <div className="panel-muted p-4">
                <p className="eyebrow flex items-center gap-2">
                  <StickyNote className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Special Notes / Tailor Instructions
                </p>
                <p className="mt-2 text-sm italic leading-relaxed text-stone-600">
                  {selectedOrder.notes || 'No special instructions recorded.'}
                </p>
              </div>

              {/* Financial Summary.
                  An order counts as settled when the recorded payment covers the
                  total, OR when it has been delivered — handing the garment over
                  means the balance was collected. In both cases the Remaining
                  card is dropped and the payment reads as complete. */}
              {(() => {
                const total = parseFloat(selectedOrder.total_price) || 0;
                const recorded = parseFloat(selectedOrder.advance_paid) || 0;
                const delivered = selectedOrder.status === 'Delivered';
                const settled = total - recorded <= 0 || delivered;

                // When settled, never show less than the total as paid.
                const paid = settled ? Math.max(recorded, total) : recorded;
                const remaining = total - recorded;

                return (
                  <>
                    <div className={`grid gap-3 ${settled ? 'grid-cols-2' : 'grid-cols-3'}`}>
                      <div className="rounded-xl border border-stone-200 bg-white p-3.5 text-center">
                        <p className="eyebrow">Total</p>
                        <p className="mt-1.5 font-display text-lg font-semibold text-stone-900">
                          ₹{total.toLocaleString('en-IN')}
                        </p>
                      </div>

                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 text-center">
                        <p className="eyebrow text-emerald-700">{settled ? 'Paid' : 'Advance'}</p>
                        <p className="mt-1.5 font-display text-lg font-semibold text-emerald-700">
                          ₹{paid.toLocaleString('en-IN')}
                        </p>
                      </div>

                      {!settled && (
                        <div className="rounded-xl border border-red-200 bg-red-50/60 p-3.5 text-center">
                          <p className="eyebrow text-red-700">Remaining</p>
                          <p className="mt-1.5 font-display text-lg font-semibold text-red-600">
                            ₹{remaining.toLocaleString('en-IN')}
                          </p>
                        </div>
                      )}
                    </div>

                    {settled && (
                      <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-emerald-800">
                        <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} />
                        {delivered && remaining > 0
                          ? 'Settled on delivery'
                          : 'Paid in full — no balance due'}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            <div className="sticky bottom-0 rounded-b-2xl border-t border-stone-200 bg-stone-50/95 p-4 backdrop-blur">
              <button onClick={() => setSelectedOrder(null)} className="btn-primary btn-block">
                Close Register
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
