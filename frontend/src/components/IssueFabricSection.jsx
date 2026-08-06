import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function IssueFabricSection({ onStockUpdated }) {
  const [workers, setWorkers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [fabrics, setFabrics] = useState([]);

  // Selection States
  const [selectedWorker, setSelectedWorker] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [selectedFabric, setSelectedFabric] = useState(null);
  const [metersToIssue, setMetersToIssue] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      // 1. Fetch Workers
      const { data: profiles } = await supabase.from('profiles').select('id, email, role');
      if (profiles) {
        setWorkers(profiles.filter((p) => !p.role || p.role.trim().toLowerCase() !== 'admin'));
      }

      // 2. Fetch Available Fabrics (Stock > 0)
      const { data: fabricData } = await supabase.from('fabrics').select('*').gt('total_meters', 0);
      if (fabricData) {
        setFabrics(fabricData);
        const cats = Array.from(new Set(fabricData.map((f) => f.category))).filter(Boolean);
        setCategories(cats);
      }
    } catch (err) {
      console.error('Error fetching inventory allocation data:', err);
    }
  };

  const availableSubcategories = Array.from(
    new Set(
      fabrics
        .filter((f) => f.category === selectedCategory)
        .map((f) => f.subcategory)
    )
  ).filter(Boolean);

  const availableFabrics = fabrics.filter(
    (f) => f.category === selectedCategory && f.subcategory === selectedSubcategory
  );

  const handleIssueFabric = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    const meters = parseFloat(metersToIssue);

    if (!selectedWorker) {
      setMessage({ type: 'error', text: 'Select a worker receiving the fabric.' });
      return;
    }

    if (!selectedFabric || !meters || meters <= 0) {
      setMessage({ type: 'error', text: 'Select a fabric item and enter valid meters.' });
      return;
    }

    if (meters > selectedFabric.total_meters) {
      setMessage({
        type: 'error',
        text: `Stock insufficient! Only ${selectedFabric.total_meters}m remaining.`,
      });
      return;
    }

    setLoading(true);

    try {
      // 1. Deduct Fabric Stock in Inventory
      const { error: stockErr } = await supabase
        .from('fabrics')
        .update({
          total_meters: selectedFabric.total_meters - meters,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedFabric.id);

      if (stockErr) throw stockErr;

      // 2. Create a specific Fabric Task entry for the worker
      const { error: taskErr } = await supabase.from('tasks').insert([
        {
          assigned_to: selectedWorker,
          fabric_id: selectedFabric.id,
          meters_issued: meters,
          task_details: `Issued ${meters}m of ${selectedFabric.name} (${selectedCategory} - ${selectedSubcategory})`,
          status: 'In Progress',
        },
      ]);

      if (taskErr) throw taskErr;

      setMessage({ type: 'success', text: `Successfully issued ${meters}m to worker.` });

      // Reset selection
      setMetersToIssue('');
      setSelectedFabric(null);
      setSelectedSubcategory('');
      setSelectedCategory('');
      setSelectedWorker('');

      // Refresh Inventory data
      fetchInitialData();
      if (onStockUpdated) onStockUpdated();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Fabric assignment failed.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
      <div>
        <h2 className="text-lg font-black uppercase text-amber-950">Issue Stock To Worker</h2>
        <p className="text-xs text-gray-500">
          Deduct fabric stock directly from inventory and assign it to a worker.
        </p>
      </div>

      {message.text && (
        <div
          className={`p-3 rounded-lg text-xs font-bold ${
            message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleIssueFabric} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* 1. Worker Selection */}
        <div>
          <label className="block font-bold uppercase mb-1">Select Worker *</label>
          <select
            value={selectedWorker}
            onChange={(e) => setSelectedWorker(e.target.value)}
            className="w-full border p-2.5 rounded-lg bg-gray-50 font-medium"
            required
          >
            <option value="">-- Choose Worker --</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.email}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Category Selection */}
        <div>
          <label className="block font-bold uppercase mb-1">Category *</label>
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setSelectedSubcategory('');
              setSelectedFabric(null);
            }}
            className="w-full border p-2.5 rounded-lg bg-gray-50 font-medium"
            required
          >
            <option value="">-- Select Category --</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Subcategory Selection */}
        <div>
          <label className="block font-bold uppercase mb-1">Subcategory *</label>
          <select
            value={selectedSubcategory}
            onChange={(e) => {
              setSelectedSubcategory(e.target.value);
              setSelectedFabric(null);
            }}
            disabled={!selectedCategory}
            className="w-full border p-2.5 rounded-lg bg-gray-50 font-medium disabled:opacity-50"
            required
          >
            <option value="">-- Select Subcategory --</option>
            {availableSubcategories.map((sc) => (
              <option key={sc} value={sc}>
                {sc}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Fabric Item Selection */}
        <div>
          <label className="block font-bold uppercase mb-1">Fabric Item *</label>
          <select
            onChange={(e) => {
              const found = availableFabrics.find((f) => f.id === e.target.value);
              setSelectedFabric(found || null);
            }}
            disabled={!selectedSubcategory}
            className="w-full border p-2.5 rounded-lg bg-gray-50 font-medium disabled:opacity-50"
            required
          >
            <option value="">-- Select Specific Fabric --</option>
            {availableFabrics.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} (In Stock: {f.total_meters}m)
              </option>
            ))}
          </select>
        </div>

        {/* 5. Quantity (Meters) */}
        <div className="md:col-span-2">
          <label className="block font-bold uppercase mb-1">Meters To Issue *</label>
          <div className="flex gap-3">
            <input
              type="number"
              step="0.01"
              placeholder="Enter meters (e.g., 25.5)"
              value={metersToIssue}
              onChange={(e) => setMetersToIssue(e.target.value)}
              className="w-full border p-2.5 rounded-lg bg-gray-50 font-medium text-sm"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-amber-950 hover:bg-amber-900 text-white font-bold px-6 py-2.5 rounded-lg uppercase whitespace-nowrap transition-colors disabled:opacity-50"
            >
              {loading ? 'Deducting Stock...' : 'Confirm Issue'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}