import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
  Layers,
  Send,
  PackagePlus,
  Boxes,
  History,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Inbox,
  ChevronDown,
} from '../../components/Icons';

const CATEGORY_MAP = {
  Indian: ['Sarees', 'Blouses', 'Anarkali', 'Gowns', 'Kaftaan'],
  Western: ['Jumpsuit', 'Dresses', 'Tunics', 'Jackets', 'Quadsets'],
  'Indo-western': [],
};

// Shared section header so every block on this long page reads the same
function SectionHead({ Icon, title, subtitle, right }) {
  return (
    <div className="card-head flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-100 text-amber-800">
          <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
        </span>
        <div>
          <h3 className="section-title">{title}</h3>
          {subtitle && <p className="subtle">{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

/**
 * Same header, but the whole bar is a button that expands the section.
 * Forms start collapsed so the page opens on the reference data (logs and
 * stock) rather than two long forms.
 */
function CollapsibleHead({ Icon, title, subtitle, open, onToggle, controls }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={controls}
      className={`card-head flex w-full flex-wrap items-center justify-between gap-3 text-left transition-colors ${
        open ? 'bg-amber-50/50' : 'hover:bg-stone-50'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-100 text-amber-800">
          <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
        </span>
        <div>
          <h3 className="section-title">{title}</h3>
          {subtitle && <p className="subtle">{subtitle}</p>}
        </div>
      </div>

      <span className="flex items-center gap-2.5">
        <span className="hidden text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500 sm:inline">
          {open ? 'Hide' : 'Open'}
        </span>
        <span
          className={`grid h-8 w-8 place-items-center rounded-lg border transition-all duration-200 ${
            open
              ? 'rotate-180 border-amber-200 bg-amber-50 text-amber-700'
              : 'border-stone-300 bg-white text-stone-500'
          }`}
        >
          <ChevronDown className="h-4 w-4" strokeWidth={2.5} />
        </span>
      </span>
    </button>
  );
}

function Alert({ state }) {
  if (!state.text) return null;
  const isError = state.type === 'error';
  const Icon = isError ? AlertCircle : CheckCircle2;
  return (
    <div className={isError ? 'alert-error' : 'alert-success'}>
      <Icon className="mt-px h-4 w-4 shrink-0" strokeWidth={2.5} />
      <span>{state.text}</span>
    </div>
  );
}

function EmptyRow({ colSpan, title, hint }) {
  return (
    <tr className="hover:bg-transparent">
      <td colSpan={colSpan}>
        <div className="empty-state">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-stone-100 text-stone-400">
            <Inbox className="h-5 w-5" strokeWidth={2} />
          </span>
          <p className="text-sm font-bold text-stone-700">{title}</p>
          {hint && <p className="subtle">{hint}</p>}
        </div>
      </td>
    </tr>
  );
}

export default function FabricInventory() {
  const [fabrics, setFabrics] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [assignedHistory, setAssignedHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [issueMessage, setIssueMessage] = useState({ type: '', text: '' });

  // Both forms start collapsed — the page leads with the logs and stock table
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Add Fabric Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [colour, setColour] = useState('');
  const [availableMeters, setAvailableMeters] = useState('');
  const [costPerMeter, setCostPerMeter] = useState('');

  // Issue Fabric Form State
  const [selectedWorker, setSelectedWorker] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedColour, setSelectedColour] = useState('');
  const [selectedFabric, setSelectedFabric] = useState(null);
  const [metersToIssue, setMetersToIssue] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    await Promise.all([fetchFabrics(), fetchWorkers(), fetchAssignedHistory()]);
    setLoading(false);
  };

  const fetchFabrics = async () => {
    const { data, error } = await supabase
      .from('fabrics')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setFabrics(data || []);
    }
  };

  // Uses RPC 'get_staff_list' to guarantee access to full names
  const fetchWorkers = async () => {
    try {
      const { data, error } = await supabase.rpc('get_staff_list');
      if (error) throw error;

      if (data) {
        const activeWorkers = data.filter(
          (p) => !p.role || p.role.trim().toLowerCase() !== 'admin'
        );
        setWorkers(activeWorkers);
      }
    } catch (err) {
      console.error('Error fetching workers via RPC:', err.message);
    }
  };

  // Uses RPC 'get_staff_list' to match worker IDs with names in logs
  const fetchAssignedHistory = async () => {
    try {
      const { data: taskData, error: taskErr } = await supabase
        .from('tasks')
        .select('*')
        .gt('meters_issued', 0)
        .order('created_at', { ascending: false });

      if (taskErr) throw taskErr;
      if (!taskData || taskData.length === 0) {
        setAssignedHistory([]);
        return;
      }

      // Fetch workers using the working RPC function and fabrics via select
      const [{ data: staffList, error: staffErr }, { data: fabricList }] = await Promise.all([
        supabase.rpc('get_staff_list'),
        supabase.from('fabrics').select('id, code, name, type, colour'),
      ]);

      if (staffErr) console.error('Staff fetch error:', staffErr.message);

      const workerMap = (staffList || []).reduce((acc, p) => {
        // Prioritize full_name, fallback to email only if missing
        acc[p.id] = p.full_name && p.full_name.trim() !== '' ? p.full_name : p.email;
        return acc;
      }, {});

      const fabricMap = (fabricList || []).reduce((acc, f) => {
        acc[f.id] = f;
        return acc;
      }, {});

      const mapped = taskData.map((t) => {
        const fabricInfo = fabricMap[t.fabric_id] || {};
        return {
          id: t.id,
          worker_name: workerMap[t.assigned_to] || 'Unknown Worker',
          fabric_code: fabricInfo.code || 'N/A',
          fabric_name: fabricInfo.name || 'Unspecified',
          category: fabricInfo.type || 'N/A',
          subcategory: fabricInfo.colour || 'N/A',
          meters_issued: t.meters_issued,
          assigned_at: new Date(t.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
        };
      });

      setAssignedHistory(mapped);
    } catch (err) {
      console.error('Error fetching assigned history:', err.message);
    }
  };

  const handleAddFabric = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    const { error } = await supabase.from('fabrics').insert([
      {
        code,
        name,
        type,
        colour,
        available_meters: parseFloat(availableMeters),
        cost_per_meter: parseFloat(costPerMeter),
      },
    ]);

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Fabric added successfully!' });
      setCode('');
      setName('');
      setType('');
      setColour('');
      setAvailableMeters('');
      setCostPerMeter('');
      fetchFabrics();
    }
    setLoading(false);
  };

  const availableSubcategories = selectedType ? CATEGORY_MAP[selectedType] || [] : [];

  const availableFabrics = fabrics.filter((f) => {
    const matchCategory = f.type === selectedType;
    if (selectedType === 'Indo-western') return matchCategory && f.available_meters > 0;
    return matchCategory && f.colour === selectedColour && f.available_meters > 0;
  });

  const handleIssueFabric = async (e) => {
    e.preventDefault();
    setIssueMessage({ type: '', text: '' });

    const meters = parseFloat(metersToIssue);

    if (!selectedWorker) {
      setIssueMessage({ type: 'error', text: 'Please select a worker.' });
      return;
    }

    if (!selectedFabric || !meters || meters <= 0) {
      setIssueMessage({ type: 'error', text: 'Select a fabric item and valid meters.' });
      return;
    }

    if (meters > selectedFabric.available_meters) {
      setIssueMessage({
        type: 'error',
        text: `Insufficient stock! Only ${selectedFabric.available_meters}m available.`,
      });
      return;
    }

    setIssuing(true);

    try {
      const { error } = await supabase.rpc('issue_fabric_to_worker', {
        p_worker_id: selectedWorker,
        p_fabric_id: selectedFabric.id,
        p_meters: meters,
      });

      if (error) throw error;

      setIssueMessage({
        type: 'success',
        text: `Successfully assigned ${meters}m of ${selectedFabric.name} to worker.`,
      });

      setSelectedWorker('');
      setSelectedType('');
      setSelectedColour('');
      setSelectedFabric(null);
      setMetersToIssue('');

      fetchFabrics();
      fetchAssignedHistory();
    } catch (err) {
      setIssueMessage({ type: 'error', text: err.message || 'Failed to issue fabric.' });
    } finally {
      setIssuing(false);
    }
  };

  // Headline figures for the summary strip
  const totalMeters = fabrics.reduce((acc, f) => acc + (parseFloat(f.available_meters) || 0), 0);
  const lowStockCount = fabrics.filter((f) => f.available_meters < 5).length;
  const stockValue = fabrics.reduce(
    (acc, f) => acc + (parseFloat(f.available_meters) || 0) * (parseFloat(f.cost_per_meter) || 0),
    0
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* ---------- Page header + summary ---------- */}
      <div className="card overflow-hidden">
        <div className="page-banner flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className="tile-gold h-11 w-11">
              <Layers className="h-5 w-5" strokeWidth={2} />
            </span>
            <div>
              <h2 className="page-title">Fabric Stock &amp; Allocation</h2>
              <p className="subtle mt-1">
                Issue material to workers and keep the roll register current
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 divide-y divide-stone-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="px-6 py-4">
            <p className="eyebrow">Total Stock On Hand</p>
            <p className="mt-1.5 font-display text-xl font-extrabold text-stone-900">
              {totalMeters.toLocaleString('en-IN')}
              <span className="ml-1 text-xs font-semibold text-stone-400">meters</span>
            </p>
          </div>
          <div className="px-6 py-4">
            <p className="eyebrow">Estimated Stock Value</p>
            <p className="mt-1.5 font-display text-xl font-extrabold text-amber-900">
              ₹{Math.round(stockValue).toLocaleString('en-IN')}
            </p>
          </div>
          <div className="px-6 py-4">
            <p className="eyebrow">Low Stock Items</p>
            <p
              className={`mt-1.5 font-display text-xl font-extrabold ${
                lowStockCount > 0 ? 'text-red-600' : 'text-emerald-700'
              }`}
            >
              {lowStockCount}
              <span className="ml-1 text-xs font-semibold text-stone-400">under 5m</span>
            </p>
          </div>
        </div>
      </div>

      {/* ---------- 1. ISSUE FABRIC FORM ---------- */}
      <section className="card overflow-hidden">
        <CollapsibleHead
          Icon={Send}
          title="Issue Fabric To Worker"
          subtitle="Assign stock to workers based on category and subcategory."
          open={showIssueForm}
          onToggle={() => setShowIssueForm((v) => !v)}
          controls="issue-fabric-form"
        />

        <div
          id="issue-fabric-form"
          hidden={!showIssueForm}
          className="card-body space-y-4"
        >
          <Alert state={issueMessage} />

          <form
            onSubmit={handleIssueFabric}
            className="panel-warm grid grid-cols-1 gap-4 p-4 md:grid-cols-3"
          >
            {/* Worker Dropdown */}
            <div>
              <label className="label">Select Worker *</label>
              <select
                value={selectedWorker}
                onChange={(e) => setSelectedWorker(e.target.value)}
                className="select"
                required
              >
                <option value="">-- Select Worker --</option>
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.full_name || w.email}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Dropdown */}
            <div>
              <label className="label">Category *</label>
              <select
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value);
                  setSelectedColour('');
                  setSelectedFabric(null);
                }}
                className="select"
                required
              >
                <option value="">-- Select Category --</option>
                {Object.keys(CATEGORY_MAP).map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Subcategory Dropdown */}
            <div>
              <label className="label">Subcategory</label>
              <select
                value={selectedColour}
                onChange={(e) => {
                  setSelectedColour(e.target.value);
                  setSelectedFabric(null);
                }}
                disabled={!selectedType || availableSubcategories.length === 0}
                className="select"
                required={availableSubcategories.length > 0}
              >
                <option value="">
                  {availableSubcategories.length === 0 ? 'N/A (No Subcategory)' : '-- Select Subcategory --'}
                </option>
                {availableSubcategories.map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>

            {/* Select Fabric Item */}
            <div className="md:col-span-2">
              <label className="label">Select Fabric Item *</label>
              <select
                onChange={(e) => {
                  const found = availableFabrics.find((f) => f.id === e.target.value);
                  setSelectedFabric(found || null);
                }}
                disabled={!selectedType || (availableSubcategories.length > 0 && !selectedColour)}
                className="select"
                required
              >
                <option value="">-- Select Fabric Stock Item --</option>
                {availableFabrics.map((f) => (
                  <option key={f.id} value={f.id}>
                    [{f.code}] {f.name} (Available: {f.available_meters}m)
                  </option>
                ))}
              </select>
            </div>

            {/* Meters to Issue */}
            <div>
              <label className="label">Meters To Issue *</label>
              <input
                type="number"
                step="0.1"
                placeholder="0.00"
                value={metersToIssue}
                onChange={(e) => setMetersToIssue(e.target.value)}
                className="input font-bold"
                required
              />
            </div>

            {selectedFabric && (
              <div className="md:col-span-3 flex flex-wrap items-center gap-2 rounded-xl border border-amber-200/70 bg-white/70 px-4 py-3">
                <span className="pill-amber">{selectedFabric.code}</span>
                <span className="text-sm font-bold text-stone-800">{selectedFabric.name}</span>
                <span className="text-xs text-stone-400">·</span>
                <span className="text-xs font-semibold text-stone-500">
                  {selectedFabric.available_meters}m in stock
                </span>
                {parseFloat(metersToIssue) > 0 && (
                  <span className="ml-auto text-xs font-bold text-amber-900">
                    Remaining after issue:{' '}
                    {(selectedFabric.available_meters - parseFloat(metersToIssue || 0)).toFixed(2)}m
                  </span>
                )}
              </div>
            )}

            <div className="md:col-span-3">
              <button type="submit" disabled={issuing} className="btn-primary btn-block">
                {issuing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.5} />
                    Assigning...
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" strokeWidth={2.5} />
                    Confirm Fabric Assignment
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* ---------- 2. ASSIGNED FABRIC LOG TABLE ---------- */}
      <section className="card overflow-hidden">
        <SectionHead
          Icon={History}
          title="Assigned Fabric Log"
          subtitle="Every meter issued, and to whom"
          right={
            assignedHistory.length > 0 && (
              <span className="pill-neutral">{assignedHistory.length} entries</span>
            )
          }
        />

        <div className="table-wrap">
          <table className="table table-dark">
            <thead>
              <tr>
                <th>Worker Name</th>
                <th>Fabric Code</th>
                <th>Fabric Name</th>
                <th>Category</th>
                <th>Subcategory</th>
                <th>Issued Meters</th>
                <th>Assigned Date</th>
              </tr>
            </thead>
            <tbody>
              {assignedHistory.length === 0 ? (
                <EmptyRow
                  colSpan="7"
                  title="No fabric assignments logged yet."
                  hint="Issue fabric above and it will appear here."
                />
              ) : (
                assignedHistory.map((item) => (
                  <tr key={item.id}>
                    <td className="font-semibold text-stone-900">{item.worker_name}</td>
                    <td>
                      <span className="pill-amber font-mono">{item.fabric_code}</span>
                    </td>
                    <td className="text-stone-800">{item.fabric_name}</td>
                    <td className="text-xs font-medium text-stone-600">{item.category}</td>
                    <td className="text-xs font-medium text-stone-600">
                      {item.subcategory || 'N/A'}
                    </td>
                    <td className="whitespace-nowrap font-display font-extrabold text-amber-900">
                      {item.meters_issued} m
                    </td>
                    <td className="whitespace-nowrap text-xs text-stone-500">{item.assigned_at}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------- 3. ADD NEW FABRIC STOCK FORM ---------- */}
      <section className="card overflow-hidden">
        <CollapsibleHead
          Icon={PackagePlus}
          title="Add New Fabric Stock"
          subtitle="Register a new roll into inventory"
          open={showAddForm}
          onToggle={() => setShowAddForm((v) => !v)}
          controls="add-fabric-form"
        />

        <div
          id="add-fabric-form"
          hidden={!showAddForm}
          className="card-body space-y-4"
        >
          <Alert state={message} />

          <form
            onSubmit={handleAddFabric}
            className="panel-muted grid grid-cols-1 gap-4 p-4 md:grid-cols-3"
          >
            <div>
              <label className="label">Fabric Code</label>
              <input
                type="text"
                placeholder="e.g. FAB-101"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="input font-mono"
                required
              />
            </div>

            <div>
              <label className="label">Fabric Name</label>
              <input
                type="text"
                placeholder="e.g. Silk Fabric"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                required
              />
            </div>

            <div>
              <label className="label">Category</label>
              <select
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  setColour('');
                }}
                className="select"
                required
              >
                <option value="">-- Select Category --</option>
                {Object.keys(CATEGORY_MAP).map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Subcategory</label>
              <select
                value={colour}
                onChange={(e) => setColour(e.target.value)}
                disabled={!type || (CATEGORY_MAP[type] && CATEGORY_MAP[type].length === 0)}
                className="select"
              >
                <option value="">
                  {type && CATEGORY_MAP[type]?.length === 0 ? 'N/A' : '-- Select Subcategory --'}
                </option>
                {(CATEGORY_MAP[type] || []).map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Stock (Meters)</label>
              <input
                type="number"
                step="0.1"
                placeholder="0.00"
                value={availableMeters}
                onChange={(e) => setAvailableMeters(e.target.value)}
                className="input"
                required
              />
            </div>

            <div>
              <label className="label">Cost / Meter (₹)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={costPerMeter}
                onChange={(e) => setCostPerMeter(e.target.value)}
                className="input"
                required
              />
            </div>

            <div className="md:col-span-3">
              <button type="submit" disabled={loading} className="btn-accent btn-block">
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.5} />
                    Adding...
                  </>
                ) : (
                  <>
                    <PackagePlus className="h-3.5 w-3.5" strokeWidth={2.5} />
                    Add Fabric to Stock
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* ---------- 4. INVENTORY TABLE ---------- */}
      <section className="card overflow-hidden">
        <SectionHead
          Icon={Boxes}
          title="Current Fabric Inventory"
          subtitle="Rolls on hand, with cost basis"
          right={fabrics.length > 0 && <span className="pill-neutral">{fabrics.length} items</span>}
        />

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Category</th>
                <th>Subcategory</th>
                <th>Stock (Meters)</th>
                <th>Cost / Meter</th>
              </tr>
            </thead>
            <tbody>
              {fabrics.length === 0 ? (
                <EmptyRow
                  colSpan="6"
                  title="No fabric inventory recorded yet."
                  hint="Add your first roll using the form above."
                />
              ) : (
                fabrics.map((item) => {
                  const low = item.available_meters < 5;
                  return (
                    <tr key={item.id}>
                      <td>
                        <span className="font-mono text-xs font-bold text-amber-900">
                          {item.code}
                        </span>
                      </td>
                      <td className="font-semibold text-stone-800">{item.name}</td>
                      <td className="text-stone-600">{item.type || '-'}</td>
                      <td className="text-stone-600">{item.colour || 'N/A'}</td>
                      <td>
                        <span className={low ? 'pill-red' : 'pill-green'}>
                          {low && <AlertCircle className="h-3 w-3" strokeWidth={2.5} />}
                          {item.available_meters} m
                        </span>
                      </td>
                      <td className="font-semibold text-stone-700">₹{item.cost_per_meter}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
