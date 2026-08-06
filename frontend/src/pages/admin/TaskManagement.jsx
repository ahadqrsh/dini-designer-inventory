import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
    Bell,
    Plus,
    X,
    ChevronDown,
    ChevronUp,
    ListChecks,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Users,
    Filter,
    Inbox,
} from '../../components/Icons';

export default function TaskManagement() {
    const [employees, setEmployees] = useState([]);
    const [orders, setOrders] = useState([]);
    const [taskList, setTaskList] = useState([]);
    const [notifications, setNotifications] = useState([]);

    // UI State
    const [showAssignForm, setShowAssignForm] = useState(false);
    const [expandedWorkers, setExpandedWorkers] = useState({});
    const [selectedMonthFilter, setSelectedMonthFilter] = useState('all');

    // Form State
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [selectedOrder, setSelectedOrder] = useState('');
    const [taskDetails, setTaskDetails] = useState('');

    const [loading, setLoading] = useState(false);
    const [fetchingTasks, setFetchingTasks] = useState(true);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchInitialData();
        fetchAllTasks();
        fetchNotifications();
    }, []);

    // 1. Fetch worker list for dropdowns using RPC
    const fetchInitialData = async () => {
        try {
            const { data: profiles, error: empErr } = await supabase.rpc('get_staff_list');

            if (!empErr && profiles) {
                const workers = profiles.filter(
                    (p) => !p.role || p.role.trim().toLowerCase() !== 'admin'
                );
                setEmployees(workers);
            }

            const { data: ordData } = await supabase.from('orders').select('*');
            setOrders(ordData || []);
        } catch (err) {
            console.error('Fetch exception:', err);
        }
    };

    // 2. Fetch tasks and map worker names using RPC
    const fetchAllTasks = async () => {
        setFetchingTasks(true);
        try {
            const { data: rawTasks, error: taskErr } = await supabase
                .from('tasks')
                .select('*')
                .order('created_at', { ascending: false });

            if (taskErr) throw taskErr;
            if (!rawTasks || rawTasks.length === 0) {
                setTaskList([]);
                return;
            }

            // 1. FILTER OUT FABRIC ISSUANCE LOGS HERE
            const pureTasks = rawTasks.filter(
                (t) => !t.task_details || !t.task_details.toLowerCase().startsWith('issued ')
            );

            const { data: staffList } = await supabase.rpc('get_staff_list');

            const profileMap = (staffList || []).reduce((acc, p) => {
                acc[p.id] = (p.full_name && p.full_name.trim() !== '') ? p.full_name : p.email;
                return acc;
            }, {});

            const { data: ordersData } = await supabase.from('orders').select('*');
            const orderMap = (ordersData || []).reduce((acc, o) => {
                acc[o.id] = o.order_number ? `#${o.order_number}` : o.customer_name || o.id;
                return acc;
            }, {});

            const mapped = pureTasks.map((t) => ({
                ...t,
                worker_name: profileMap[t.assigned_to] || 'Unknown Worker',
                order_display: orderMap[t.order_id] || 'General Task',
                formatted_date: new Date(t.updated_at || t.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                }),
                month_key: new Date(t.updated_at || t.created_at).toISOString().slice(0, 7),
            }));

            setTaskList(mapped);
        } catch (err) {
            console.error('Error fetching tasks:', err.message);
        } finally {
            setFetchingTasks(false);
        }
    };

    const fetchNotifications = async () => {
        try {
            const { data } = await supabase
                .from('notifications')
                .select('*')
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

    const handleAssignTask = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        if (!selectedEmployee) {
            setMessage({ type: 'error', text: 'Please select a worker.' });
            return;
        }

        if (!taskDetails.trim()) {
            setMessage({ type: 'error', text: 'Please enter task details.' });
            return;
        }

        setLoading(true);

        try {
            const payload = {
                assigned_to: selectedEmployee,
                order_id: selectedOrder || null,
                task_details: taskDetails.trim(),
                status: 'Pending',
            };

            const { error } = await supabase.from('tasks').insert([payload]);

            if (error) throw error;

            setMessage({ type: 'success', text: 'Task assigned successfully!' });
            setTaskDetails('');
            setSelectedOrder('');
            setSelectedEmployee('');
            setShowAssignForm(false);
            fetchAllTasks();
        } catch (err) {
            setMessage({
                type: 'error',
                text: err.message || 'Failed to assign task.',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleApproveTask = async (taskId) => {
        try {
            const { error } = await supabase
                .from('tasks')
                .update({
                    status: 'Completed',
                    updated_at: new Date().toISOString(),
                })
                .eq('id', taskId);

            if (error) throw error;

            setTaskList((prev) =>
                prev.map((t) => (t.id === taskId ? { ...t, status: 'Completed', updated_at: new Date().toISOString() } : t))
            );
        } catch (err) {
            alert('Failed to approve task: ' + err.message);
        }
    };

    const toggleWorkerAccordion = (workerId) => {
        setExpandedWorkers((prev) => ({
            ...prev,
            [workerId]: !prev[workerId],
        }));
    };

    const tasksByWorker = employees.map((emp) => {
        const workerTasks = taskList.filter((t) => {
            const matchesWorker = t.assigned_to === emp.id;
            const matchesMonth = selectedMonthFilter === 'all' || t.month_key === selectedMonthFilter;
            return matchesWorker && matchesMonth;
        });

        const displayName = (emp.full_name && emp.full_name.trim() !== '')
            ? emp.full_name
            : emp.email || 'Unnamed Worker';

        return {
            workerId: emp.id,
            fullName: displayName,
            tasks: workerTasks,
            totalCount: workerTasks.length,
            activeCount: workerTasks.filter((t) => t.status !== 'Completed').length,
            completedCount: workerTasks.filter((t) => t.status === 'Completed').length,
        };
    });

    const availableMonths = Array.from(new Set(taskList.map((t) => t.month_key))).filter(Boolean);

    // Status pill styling shared by the table
    const statusPillClass = (status) =>
        status === 'Completed'
            ? 'pill-green'
            : status === 'Under Review'
                ? 'pill-amber'
                : 'pill-blue';

    // Initials avatar for each worker row
    const initials = (fullName) =>
        fullName
            .split(/[\s@._-]+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((w) => w[0]?.toUpperCase())
            .join('');

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            {/* IN-APP NOTIFICATIONS */}
            {notifications.length > 0 && (
                <div className="panel-warm space-y-2.5 p-4">
                    <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-amber-900">
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75"></span>
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-600"></span>
                            </span>
                            <Bell className="h-3.5 w-3.5" strokeWidth={2.5} />
                            Admin Notifications ({notifications.length})
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

            {/* TOP HEADER */}
            <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
                <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl chip-dark">
                        <ListChecks className="h-5 w-5" strokeWidth={2.2} />
                    </span>
                    <div>
                        <h1 className="page-title">Task Operations</h1>
                        <p className="subtle mt-0.5">Manage worker assignments and audits</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowAssignForm(!showAssignForm)}
                    className={showAssignForm ? 'btn-outline' : 'btn-primary'}
                >
                    {showAssignForm ? (
                        <>
                            <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                            Close Form
                        </>
                    ) : (
                        <>
                            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                            Assign New Task
                        </>
                    )}
                </button>
            </div>

            {/* COLLAPSIBLE ASSIGN TASK FORM */}
            {showAssignForm && (
                <div className="card animate-rise-in">
                    <div className="card-head">
                        <h2 className="section-title">Assign New Task</h2>
                        <p className="subtle mt-0.5">Link work to a worker, and optionally to an order</p>
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

                        <form onSubmit={handleAssignTask} className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <label className="label">Select Worker *</label>
                                    <select
                                        value={selectedEmployee}
                                        onChange={(e) => setSelectedEmployee(e.target.value)}
                                        className="select"
                                        required
                                    >
                                        <option value="">-- Choose Worker --</option>
                                        {employees.map((emp) => (
                                            <option key={emp.id} value={emp.id}>
                                                {(emp.full_name && emp.full_name.trim() !== '') ? emp.full_name : emp.email}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="label">Select Order (Optional)</label>
                                    <select
                                        value={selectedOrder}
                                        onChange={(e) => setSelectedOrder(e.target.value)}
                                        className="select"
                                    >
                                        <option value="">-- No Order Linked --</option>
                                        {orders.map((ord) => (
                                            <option key={ord.id} value={ord.id}>
                                                {ord.order_number ? `#${ord.order_number} - ` : ''}
                                                {ord.customer_name || ord.client_name || `Order ${ord.id.slice(0, 8)}`}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="label">Task Details *</label>
                                <textarea
                                    value={taskDetails}
                                    onChange={(e) => setTaskDetails(e.target.value)}
                                    placeholder="Describe the work to be done..."
                                    className="input h-24 resize-y leading-relaxed"
                                    required
                                />
                            </div>

                            <div className="flex justify-end gap-3 border-t border-stone-200 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAssignForm(false)}
                                    className="btn-ghost"
                                >
                                    Cancel
                                </button>
                                <button type="submit" disabled={loading} className="btn-primary">
                                    {loading ? (
                                        <>
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.5} />
                                            Assigning Task...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                                            Confirm Assignment
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* WORKER-GROUPED TASK HISTORY */}
            <div className="card">
                <div className="card-head flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-100 text-amber-800">
                            <Users className="h-[18px] w-[18px]" strokeWidth={2.2} />
                        </span>
                        <div>
                            <h2 className="section-title">Worker Work History</h2>
                            <p className="subtle mt-0.5">
                                Click a worker to view or approve their assigned tasks.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-stone-500">
                            <Filter className="h-3.5 w-3.5" strokeWidth={2.5} />
                            Month
                        </label>
                        <select
                            value={selectedMonthFilter}
                            onChange={(e) => setSelectedMonthFilter(e.target.value)}
                            className="select w-auto py-2 text-xs font-bold"
                        >
                            <option value="all">All Time</option>
                            {availableMonths.map((m) => (
                                <option key={m} value={m}>
                                    {m}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="card-body">
                    {fetchingTasks ? (
                        <div className="empty-state">
                            <Loader2 className="h-6 w-6 animate-spin text-amber-800" strokeWidth={2.5} />
                            <p className="text-sm font-semibold text-stone-500">Loading workers...</p>
                        </div>
                    ) : tasksByWorker.length === 0 ? (
                        <div className="empty-state">
                            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-stone-100 text-stone-400">
                                <Inbox className="h-5 w-5" strokeWidth={2} />
                            </span>
                            <p className="text-sm font-bold text-stone-700">No registered workers found.</p>
                            <p className="subtle">Create an employee account to start assigning tasks.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {tasksByWorker.map((group) => {
                                const isExpanded = !!expandedWorkers[group.workerId];

                                return (
                                    <div
                                        key={group.workerId}
                                        className={`overflow-hidden rounded-2xl border transition-all ${
                                            isExpanded
                                                ? 'border-amber-200 shadow-card'
                                                : 'border-stone-200 shadow-sm hover:border-stone-300'
                                        }`}
                                    >
                                        <button
                                            onClick={() => toggleWorkerAccordion(group.workerId)}
                                            className={`flex w-full items-center justify-between gap-4 p-4 text-left transition-colors ${
                                                isExpanded ? 'bg-amber-50/70' : 'bg-stone-50 hover:bg-stone-100'
                                            }`}
                                        >
                                            <div className="flex min-w-0 items-center gap-3">
                                                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl chip-dark text-[11px] font-extrabold tracking-wide">
                                                    {initials(group.fullName)}
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-bold text-stone-900">
                                                        {group.fullName}
                                                    </p>
                                                    <p className="subtle mt-0.5">
                                                        {group.totalCount} {group.totalCount === 1 ? 'Task' : 'Tasks'} Total
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex shrink-0 items-center gap-3">
                                                <div className="hidden gap-2 sm:flex">
                                                    {group.activeCount > 0 && (
                                                        <span className="pill-amber">{group.activeCount} Active</span>
                                                    )}
                                                    <span className="pill-green">{group.completedCount} Verified</span>
                                                </div>
                                                <span
                                                    className={`grid h-8 w-8 place-items-center rounded-lg transition-colors ${
                                                        isExpanded
                                                            ? 'bg-amber-100 text-amber-900'
                                                            : 'bg-white text-stone-400'
                                                    }`}
                                                >
                                                    {isExpanded ? (
                                                        <ChevronUp className="h-4 w-4" strokeWidth={2.5} />
                                                    ) : (
                                                        <ChevronDown className="h-4 w-4" strokeWidth={2.5} />
                                                    )}
                                                </span>
                                            </div>
                                        </button>

                                        {isExpanded && (
                                            <div className="border-t border-stone-200 bg-white animate-fade-in">
                                                {group.tasks.length === 0 ? (
                                                    <p className="px-4 py-6 text-center text-xs font-medium text-stone-400">
                                                        No tasks recorded for this period.
                                                    </p>
                                                ) : (
                                                    <div className="table-wrap">
                                                        <table className="table">
                                                            <thead>
                                                                <tr>
                                                                    <th>Worker Name</th>
                                                                    <th>Order</th>
                                                                    <th>Task Details</th>
                                                                    <th>Status</th>
                                                                    <th className="text-right">Action</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="text-xs">
                                                                {group.tasks.map((task) => (
                                                                    <tr key={task.id}>
                                                                        <td className="whitespace-nowrap font-bold text-stone-900">
                                                                            {task.worker_name}
                                                                        </td>
                                                                        <td className="whitespace-nowrap font-semibold text-stone-600">
                                                                            {task.order_display}
                                                                        </td>
                                                                        <td className="max-w-sm font-medium text-stone-800">
                                                                            {task.task_details}
                                                                        </td>
                                                                        <td>
                                                                            <span className={statusPillClass(task.status)}>
                                                                                {task.status}
                                                                            </span>
                                                                        </td>
                                                                        <td className="text-right">
                                                                            {task.status === 'Under Review' ? (
                                                                                <button
                                                                                    onClick={() => handleApproveTask(task.id)}
                                                                                    className="btn-success btn-sm"
                                                                                >
                                                                                    <CheckCircle2 className="h-3 w-3" strokeWidth={2.5} />
                                                                                    Approve
                                                                                </button>
                                                                            ) : task.status === 'Completed' ? (
                                                                                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-stone-400">
                                                                                    <CheckCircle2 className="h-3 w-3" strokeWidth={2.5} />
                                                                                    Verified
                                                                                </span>
                                                                            ) : (
                                                                                <span className="text-[10px] font-bold uppercase tracking-wide text-blue-700">
                                                                                    {task.status}
                                                                                </span>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
