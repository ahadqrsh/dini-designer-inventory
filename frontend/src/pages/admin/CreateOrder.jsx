import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { toDateInput } from '../../lib/attendanceUtils';
import {
  Search,
  User,
  Phone,
  Shirt,
  Palette,
  Ruler,
  Receipt,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Info,
  History,
} from '../../components/Icons';

export default function CreateOrder() {
  const today = toDateInput(new Date());

  const [phone, setPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [existingCustomerId, setExistingCustomerId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Every lookup creates a new order row (a new dress) rather than
  // overwriting the customer's earlier ones — this just shows what's
  // already on file so staff aren't guessing whether it stacked.
  const [previousOrders, setPreviousOrders] = useState([]);

  // Order Header Details
  const [orderDate, setOrderDate] = useState(today);
  const [mainCategory, setMainCategory] = useState('Indian');
  const [subCategory, setSubCategory] = useState('');
  const [colour, setColour] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [advancePaid, setAdvancePaid] = useState('');
  const [notes, setNotes] = useState('');

  // Complete 20 Body Measurements
  const [measurements, setMeasurements] = useState({
    chest: '', l_chest: '', length: '', waist: '', neck_front: '',
    neck_back: '', armhole: '', shoulder: '', dart_point: '', sleeve: '',
    sleeve_circum: '', bicep: '', thighs: '', b_length: '', b_waist: '',
    hips: '', crotch: '', knee: '', b_circum: '', others: ''
  });

  // Search Customer & Auto-fill Latest Measurements
  const handleSearchCustomer = async () => {
    if (!phone) return;
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const { data, error } = await supabase.rpc('get_latest_customer_measurements', {
        cust_phone: phone
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const record = data[0];
        setExistingCustomerId(record.customer_id);
        setCustomerName(record.customer_name);

        // Show what this customer already has on file, so it's clear a new
        // submission adds another dress rather than replacing the last one.
        const { data: pastOrders } = await supabase
          .from('orders')
          .select('id, sub_category, colour, status, order_date, created_at')
          .eq('customer_id', record.customer_id)
          .order('order_date', { ascending: false });
        setPreviousOrders(pastOrders || []);

        // Populate previous 20 measurements if available
        setMeasurements({
          chest: record.chest ?? '',
          l_chest: record.l_chest ?? '',
          length: record.length ?? '',
          waist: record.waist ?? '',
          neck_front: record.neck_front ?? '',
          neck_back: record.neck_back ?? '',
          armhole: record.armhole ?? '',
          shoulder: record.shoulder ?? '',
          dart_point: record.dart_point ?? '',
          sleeve: record.sleeve ?? '',
          sleeve_circum: record.sleeve_circum ?? '',
          bicep: record.bicep ?? '',
          thighs: record.thighs ?? '',
          b_length: record.b_length ?? '',
          b_waist: record.b_waist ?? '',
          hips: record.hips ?? '',
          crotch: record.crotch ?? '',
          knee: record.knee ?? '',
          b_circum: record.b_circum ?? '',
          others: record.others ?? ''
        });

        setMessage({
          type: 'success',
          text: 'Existing customer found! Latest 20-point measurements auto-filled.'
        });
      } else {
        setExistingCustomerId(null);
        setPreviousOrders([]);
        setMessage({
          type: 'info',
          text: 'New customer phone number. Enter name and measurements.'
        });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to search customer data.' });
    } finally {
      setLoading(false);
    }
  };

  const handleMeasurementChange = (e) => {
    setMeasurements({ ...measurements, [e.target.name]: e.target.value });
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (!customerName || !phone) {
      setMessage({ type: 'error', text: 'Please enter both Customer Name and Phone Number.' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      let customerId = existingCustomerId;

      // Ensure customer exists in database
      if (!customerId) {
        const { data: foundCust } = await supabase
          .from('customers')
          .select('id')
          .eq('phone', phone)
          .maybeSingle();

        if (foundCust) {
          customerId = foundCust.id;
        } else {
          const { data: newCust, error: custError } = await supabase
            .from('customers')
            .insert([{ name: customerName, phone }])
            .select()
            .single();

          if (custError) throw custError;
          customerId = newCust.id;
        }
      }

      // Format numerical measurements
      const formattedMeasurements = Object.keys(measurements).reduce((acc, key) => {
        acc[key] = measurements[key] !== '' && measurements[key] !== null ? parseFloat(measurements[key]) : null;
        return acc;
      }, {});

      // Insert Order — always a new row, even for a customer who already has
      // orders on file, so each dress gets its own measurement record.
      const { error: orderError } = await supabase.from('orders').insert([
        {
          customer_id: customerId,
          order_date: orderDate,
          main_category: mainCategory,
          sub_category: subCategory,
          colour,
          ...formattedMeasurements,
          total_price: parseFloat(totalPrice),
          advance_paid: advancePaid ? parseFloat(advancePaid) : 0.0,
          notes
        }
      ]);

      if (orderError) throw orderError;

      setMessage({ type: 'success', text: 'Order saved as a new record!' });

      // Reset Form
      setCustomerName('');
      setPhone('');
      setExistingCustomerId(null);
      setPreviousOrders([]);
      setOrderDate(today);
      setSubCategory('');
      setColour('');
      setTotalPrice('');
      setAdvancePaid('');
      setNotes('');
      setMeasurements(
        Object.keys(measurements).reduce((acc, key) => ({ ...acc, [key]: '' }), {})
      );
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Failed to submit order' });
    } finally {
      setLoading(false);
    }
  };

  const balanceDue = (parseFloat(totalPrice) || 0) - (parseFloat(advancePaid) || 0);

  const leftColumnFields = [
    { id: 1, label: 'CHEST', name: 'chest' },
    { id: 2, label: 'L CHEST', name: 'l_chest' },
    { id: 3, label: 'LENGTH', name: 'length' },
    { id: 4, label: 'WAIST', name: 'waist' },
    { id: 5, label: 'NECK FRONT', name: 'neck_front' },
    { id: 6, label: 'NECK BACK', name: 'neck_back' },
    { id: 7, label: 'ARMHOLE', name: 'armhole' },
    { id: 8, label: 'SHOULDER', name: 'shoulder' },
    { id: 9, label: 'DART POINT', name: 'dart_point' },
    { id: 10, label: 'SLEEVE', name: 'sleeve' }
  ];

  const rightColumnFields = [
    { id: 11, label: 'SLEEVE CIRCUM', name: 'sleeve_circum' },
    { id: 12, label: 'BICEP', name: 'bicep' },
    { id: 13, label: 'THIGHS', name: 'thighs' },
    { id: 14, label: 'B. LENGTH', name: 'b_length' },
    { id: 15, label: 'B. WAIST', name: 'b_waist' },
    { id: 16, label: 'HIPS', name: 'hips' },
    { id: 17, label: 'CROTCH', name: 'crotch' },
    { id: 18, label: 'KNEE', name: 'knee' },
    { id: 19, label: 'B. CIRCUM', name: 'b_circum' },
    { id: 20, label: 'OTHERS', name: 'others' }
  ];

  const filledCount = Object.values(measurements).filter((v) => v !== '' && v !== null).length;

  const MessageIcon =
    message.type === 'error' ? AlertCircle : message.type === 'success' ? CheckCircle2 : Info;

  const renderMeasureField = (field) => (
    <div key={field.name} className="flex items-center gap-3">
      <span className="w-6 shrink-0 text-right font-mono text-[11px] font-bold text-stone-300">
        {field.id}
      </span>
      <label
        htmlFor={`m-${field.name}`}
        className="w-32 shrink-0 text-[11px] font-bold uppercase tracking-wide text-stone-600 sm:w-36"
      >
        {field.label}
      </label>
      <input
        id={`m-${field.name}`}
        type="number"
        step="0.25"
        name={field.name}
        value={measurements[field.name]}
        onChange={handleMeasurementChange}
        placeholder="—"
        className="input input-numeric px-2 py-2"
      />
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Page header */}
      <div className="card overflow-hidden">
        <div className="page-banner py-8 text-center">
          <span className="pill-amber">
            <Ruler className="h-3 w-3" strokeWidth={2.5} />
            New Entry
          </span>
          <h1 className="mt-3.5 font-display text-[26px] font-semibold tracking-tight text-stone-900">
            New Body Measurement Entry
          </h1>
          <p className="subtle mx-auto mt-2 max-w-md">
            Look up an existing client to auto-fill their last recorded measurements.
          </p>
        </div>
      </div>

      {message.text && (
        <div
          className={
            message.type === 'error'
              ? 'alert-error'
              : message.type === 'success'
              ? 'alert-success'
              : 'alert-info'
          }
        >
          <MessageIcon className="mt-px h-4 w-4 shrink-0" strokeWidth={2.5} />
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmitOrder} className="space-y-6">
        {/* ---------- Customer Lookup ---------- */}
        <section className="card">
          <div className="card-head flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-100 text-amber-800">
              <User className="h-[18px] w-[18px]" strokeWidth={2.2} />
            </span>
            <div>
              <h2 className="section-title">Customer Details</h2>
              <p className="subtle">Search by phone to reuse an existing register</p>
            </div>
          </div>

          <div className="card-body">
            <div className="panel-warm grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
              <div>
                <label className="label">Customer Phone *</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Phone
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
                      strokeWidth={2.2}
                    />
                    <input
                      type="text"
                      placeholder="Enter 10-digit number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="input pl-10"
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSearchCustomer}
                    disabled={loading}
                    className="btn-accent shrink-0"
                  >
                    {loading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.5} />
                    ) : (
                      <Search className="h-3.5 w-3.5" strokeWidth={2.5} />
                    )}
                    Lookup
                  </button>
                </div>
              </div>

              <div>
                <label className="label">Customer Name *</label>
                <div className="relative">
                  <User
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
                    strokeWidth={2.2}
                  />
                  <input
                    type="text"
                    placeholder="Enter customer name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="input pl-10"
                    required
                  />
                </div>
              </div>
            </div>

            {previousOrders.length > 0 && (
              <div className="panel-muted mt-4 p-4">
                <p className="eyebrow mb-2.5 flex items-center gap-2">
                  <History className="h-3.5 w-3.5" strokeWidth={2.5} />
                  {previousOrders.length} Previous {previousOrders.length === 1 ? 'Order' : 'Orders'} On File
                </p>
                <ul className="space-y-1.5">
                  {previousOrders.map((o) => (
                    <li
                      key={o.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs"
                    >
                      <span className="font-semibold text-stone-800">
                        {o.sub_category || 'Garment'}
                        {o.colour ? ` · ${o.colour}` : ''}
                      </span>
                      <span className="flex items-center gap-3 text-stone-500">
                        {new Date(`${o.order_date || o.created_at.slice(0, 10)}T00:00:00`).toLocaleDateString(
                          'en-IN',
                          { day: '2-digit', month: 'short', year: 'numeric' }
                        )}
                        <span className="pill-neutral">{o.status || 'Pending'}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2.5 text-[11px] text-stone-400">
                  Submitting below adds a new order for this customer — it won't overwrite these.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ---------- Garment Options ---------- */}
        <section className="card">
          <div className="card-head flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-100 text-amber-800">
              <Shirt className="h-[18px] w-[18px]" strokeWidth={2.2} />
            </span>
            <div>
              <h2 className="section-title">Garment Specification</h2>
              <p className="subtle">What is being made, and in what colour</p>
            </div>
          </div>

          <div className="card-body grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <label className="label">Order Date *</label>
              <input
                type="date"
                value={orderDate}
                max={today}
                onChange={(e) => setOrderDate(e.target.value)}
                className="input"
                required
              />
            </div>

            <div>
              <label className="label">Category</label>
              <select
                value={mainCategory}
                onChange={(e) => setMainCategory(e.target.value)}
                className="select"
              >
                <option value="Indian">Indian</option>
                <option value="Western">Western</option>
                <option value="Indo-western">Indo-western</option>
              </select>
            </div>

            <div>
              <label className="label">Sub-Category (Garment) *</label>
              <input
                type="text"
                placeholder="e.g. Kurti, Suit, Lehenga"
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                className="input"
                required
              />
            </div>

            <div>
              <label className="label">Colour</label>
              <div className="relative">
                <Palette
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
                  strokeWidth={2.2}
                />
                <input
                  type="text"
                  placeholder="e.g. Royal Blue"
                  value={colour}
                  onChange={(e) => setColour(e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ---------- 20 Measurement Sheet ---------- */}
        <section className="card">
          <div className="card-head flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-100 text-amber-800">
                <Ruler className="h-[18px] w-[18px]" strokeWidth={2.2} />
              </span>
              <div>
                <h2 className="section-title">20 Body Measurements</h2>
                <p className="subtle">Values in inches · quarter-inch increments</p>
              </div>
            </div>
            <span className={filledCount === 20 ? 'pill-green' : 'pill-neutral'}>
              {filledCount} / 20 filled
            </span>
          </div>

          <div className="card-body grid grid-cols-1 gap-x-10 gap-y-3 lg:grid-cols-2">
            <div className="space-y-3 lg:border-r lg:border-stone-200 lg:pr-8">
              {leftColumnFields.map(renderMeasureField)}
            </div>
            <div className="space-y-3">{rightColumnFields.map(renderMeasureField)}</div>
          </div>
        </section>

        {/* ---------- Billing ---------- */}
        <section className="card">
          <div className="card-head flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-100 text-amber-800">
              <Receipt className="h-[18px] w-[18px]" strokeWidth={2.2} />
            </span>
            <div>
              <h2 className="section-title">Billing & Instructions</h2>
              <p className="subtle">Balance is calculated automatically</p>
            </div>
          </div>

          <div className="card-body space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="label">Total Price (₹) *</label>
                <input
                  type="number"
                  value={totalPrice}
                  onChange={(e) => setTotalPrice(e.target.value)}
                  className="input font-bold"
                  placeholder="0"
                  required
                />
              </div>

              <div>
                <label className="label">Advance Paid (₹)</label>
                <input
                  type="number"
                  value={advancePaid}
                  onChange={(e) => setAdvancePaid(e.target.value)}
                  className="input font-bold"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="label">Balance Remaining (₹)</label>
                <input
                  type="number"
                  value={balanceDue >= 0 ? balanceDue : 0}
                  disabled
                  className="input font-extrabold text-amber-950"
                />
              </div>
            </div>

            <div>
              <label className="label">Special Instructions / Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input resize-y leading-relaxed"
                placeholder="Anything the tailor should know — finish, lining, fit preference..."
                rows="3"
              ></textarea>
            </div>
          </div>
        </section>

        <button type="submit" disabled={loading} className="btn-primary btn-block btn-lg">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
              Processing...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" strokeWidth={2.5} />
              Save Order Record
            </>
          )}
        </button>
      </form>
    </div>
  );
}
