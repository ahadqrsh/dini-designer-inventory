import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
  ListChecks,
  RefreshCw,
  Send,
  CheckCircle2,
  Clock,
  Layers,
  Loader2,
  Inbox,
  Bell,
} from '../../components/Icons';

export default function MyTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    fetchWorkerTasks();
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      setNotifications(data || []);
    } catch (err) {
      console.error('Notification fetch error:', err);
    }
  };

  const markNotificationRead = async (id) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const fetchWorkerTasks = async () => {
    setLoading(true);
    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();

      if (authErr || !user) {
        console.error('User authentication error:', authErr);
        setLoading(false);
        return;
      }

      const { data: rawTasks, error: taskErr } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', user.id)
        .order('created_at', { ascending: false });

      if (taskErr) throw taskErr;

      // Fabric issuance is logged as a task row behind the scenes (see
      // IssueFabricSection.jsx) but isn't work for the worker to action —
      // keep it out of their task list.
      const pureTasks = (rawTasks || []).filter(
        (t) => !t.task_details || !t.task_details.toLowerCase().startsWith('issued ')
      );

      if (pureTasks.length === 0) {
        setTasks([]);
        return;
      }

      const { data: ordersData } = await supabase
        .from('orders')
        .select('id, sub_category, customers(name)');

      const orderMap = (ordersData || []).reduce((acc, o) => {
        const custName = o.customers?.name;
        acc[o.id] = custName
          ? `${custName}${o.sub_category ? ' — ' + o.sub_category : ''}`
          : `Order ${String(o.id).slice(0, 8)}`;
        return acc;
      }, {});

      const mappedTasks = pureTasks.map((t) => ({
        ...t,
        order_display: orderMap[t.order_id] || 'General Work',
      }));

      setTasks(mappedTasks);
    } catch (err) {
      console.error('Error fetching worker tasks:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkForReview = async (taskId, taskDetails = '') => {
    setUpdatingId(taskId);
    try {
      const { error: taskError } = await supabase
        .from('tasks')
        .update({
          status: 'Under Review',
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (taskError) throw taskError;

      const safeDetails = typeof taskDetails === 'string' ? taskDetails : '';
      const previewText = safeDetails ? safeDetails.slice(0, 40) : 'Task details updated';

      const { error: notifyError } = await supabase.from('notifications').insert([
        {
          user_role: 'admin',
          title: 'Task Marked for Review',
          message: `A worker submitted a task for review: "${previewText}..."`,
          is_read: false,
        },
      ]);
      if (notifyError) console.error('Failed to notify admin:', notifyError.message);

      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: 'Under Review' } : t))
      );
    } catch (err) {
      alert('Failed to update task: ' + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="card empty-state">
          <Loader2 className="h-6 w-6 animate-spin text-amber-800" strokeWidth={2.5} />
          <p className="text-sm font-semibold text-stone-500">Loading your tasks...</p>
        </div>
      </div>
    );
  }

  // Left accent + pill styling per status
  const statusMeta = (status) =>
    status === 'Completed'
      ? { pill: 'pill-green', accent: 'from-emerald-600 to-emerald-400', Icon: CheckCircle2 }
      : status === 'Under Review'
        ? { pill: 'pill-amber', accent: 'from-amber-600 to-amber-400', Icon: Clock }
        : { pill: 'pill-blue', accent: 'from-blue-600 to-blue-400', Icon: ListChecks };

  const activeCount = tasks.filter((t) => t.status !== 'Completed').length;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {/* New-task notifications */}
      {notifications.length > 0 && (
        <div className="panel-warm space-y-2.5 p-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-amber-900">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-600"></span>
              </span>
              <Bell className="h-3.5 w-3.5" strokeWidth={2.5} />
              Notifications ({notifications.length})
            </span>
          </div>
          <div className="space-y-1.5">
            {notifications.map((n) => (
              <div
                key={n.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-amber-200/80 bg-white px-3.5 py-2.5 text-xs shadow-sm"
              >
                <div className="min-w-0">
                  <span className="font-bold text-stone-900">{n.title}: </span>
                  <span className="text-stone-600">{n.message}</span>
                </div>
                <button
                  onClick={() => markNotificationRead(n.id)}
                  className="shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-900 transition-colors hover:bg-amber-100"
                >
                  Dismiss
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl chip-dark">
            <ListChecks className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <div>
            <h1 className="page-title">My Tasks</h1>
            <p className="subtle mt-0.5">
              {tasks.length === 0
                ? 'Nothing assigned right now'
                : `${activeCount} active · ${tasks.length} total`}
            </p>
          </div>
        </div>
        <button onClick={fetchWorkerTasks} className="btn-outline">
          <RefreshCw className="h-3.5 w-3.5" strokeWidth={2.5} />
          Refresh
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="card empty-state">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-stone-100 text-stone-400">
            <Inbox className="h-5 w-5" strokeWidth={2} />
          </span>
          <p className="text-sm font-bold text-stone-700">
            No tasks currently assigned to your account.
          </p>
          <p className="subtle">Your supervisor will assign work here.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {tasks.map((task) => {
            const { pill, accent, Icon } = statusMeta(task.status);

            return (
              <div
                key={task.id}
                className="card card-hover relative flex flex-col justify-between gap-4 overflow-hidden p-5"
              >
                <span
                  className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${accent}`}
                  aria-hidden="true"
                />

                <div className="pl-2">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="eyebrow">{task.order_display}</span>
                    <span className={pill}>
                      <Icon className="h-3 w-3" strokeWidth={2.5} />
                      {task.status}
                    </span>
                  </div>

                  <p className="whitespace-pre-wrap text-sm font-medium leading-relaxed text-stone-800">
                    {task.task_details}
                  </p>

                  {task.meters_issued > 0 && (
                    <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-900">
                      <Layers className="h-3.5 w-3.5" strokeWidth={2.5} />
                      Fabric Issued: {task.meters_issued} meters
                    </p>
                  )}
                </div>

                <div className="flex justify-end border-t border-stone-200 pt-3.5 pl-2">
                  {task.status === 'Pending' || task.status === 'In Progress' ? (
                    <button
                      onClick={() => handleMarkForReview(task.id, task.task_details)}
                      disabled={updatingId === task.id}
                      className="btn-primary btn-sm"
                    >
                      {updatingId === task.id ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.5} />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="h-3 w-3" strokeWidth={2.5} />
                          Mark Review
                        </>
                      )}
                    </button>
                  ) : task.status === 'Under Review' ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold italic text-amber-700">
                      <Clock className="h-3.5 w-3.5" strokeWidth={2.5} />
                      Awaiting Physical Inspection & Admin Approval
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                      Approved & Completed
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
