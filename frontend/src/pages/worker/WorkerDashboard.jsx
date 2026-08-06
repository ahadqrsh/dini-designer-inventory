import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function WorkerDashboard() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    fetchWorkerTasks();
  }, []);

  const fetchWorkerTasks = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error("No active user session found.");

      // Fetch tasks assigned strictly to the logged-in worker
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id,
          task_details,
          status,
          created_at,
          orders ( order_number, customer_name )
        `)
        .eq('assigned_to', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (err) {
      console.error('Error loading worker tasks:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkForReview = async (taskId) => {
    setUpdatingId(taskId);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: 'Under Review',
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) throw error;

      // Update UI state locally
      setTasks(prev =>
        prev.map(t => t.id === taskId ? { ...t, status: 'Under Review' } : t)
      );
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) return <div className="p-6 text-xs font-bold">Loading tasks...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-black uppercase text-amber-950">My Tasks</h1>

      {tasks.length === 0 ? (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500">
          No tasks assigned to you right now.
        </div>
      ) : (
        <div className="grid gap-4">
          {tasks.map((task) => (
            <div key={task.id} className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    {task.orders?.order_number ? `Order #${task.orders.order_number}` : 'General Work'}
                  </span>
                  <span className={`text-xs font-black uppercase px-2.5 py-1 rounded-full ${
                    task.status === 'Completed' ? 'bg-green-100 text-green-800' :
                    task.status === 'Under Review' ? 'bg-amber-100 text-amber-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {task.status}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-800 whitespace-pre-wrap">{task.task_details}</p>
              </div>

              <div className="border-t border-gray-100 pt-3 flex justify-end">
                {task.status !== 'Completed' && task.status !== 'Under Review' ? (
                  <button
                    onClick={() => handleMarkForReview(task.id)}
                    disabled={updatingId === task.id}
                    className="bg-amber-950 hover:bg-amber-900 text-white font-bold text-xs uppercase px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {updatingId === task.id ? 'Updating...' : 'Mark for Review'}
                  </button>
                ) : task.status === 'Under Review' ? (
                  <span className="text-xs font-bold text-amber-700 italic">
                    Awaiting Admin Approval
                  </span>
                ) : (
                  <span className="text-xs font-bold text-green-700">
                    Approved
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}