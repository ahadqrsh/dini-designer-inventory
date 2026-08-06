import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
    UserPlus,
    Users,
    User,
    Mail,
    Lock,
    Trash2,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Inbox,
} from '../../components/Icons';

export default function CreateEmployee() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            const { data, error } = await supabase.rpc('get_staff_list');
            if (error) throw error;
            setEmployees(data || []);
        } catch (err) {
            console.error('Error fetching employees:', err.message);
        }
    };

    const handleCreateEmployee = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const cleanEmail = email.trim().toLowerCase();

            const { error } = await supabase.rpc('create_new_employee', {
                employee_email: cleanEmail,
                employee_password: password,
                employee_name: name.trim(),
            });

            if (error) throw error;

            setMessage({ type: 'success', text: `Employee account created for ${name}` });
            setName('');
            setEmail('');
            setPassword('');
            fetchEmployees();
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteEmployee = async (id, empName) => {
        if (!window.confirm(`Are you sure you want to delete ${empName}?`)) return;

        try {
            const { error } = await supabase.rpc('delete_employee', { user_id: id });
            if (error) throw error;

            setMessage({ type: 'success', text: `Employee ${empName} deleted.` });
            fetchEmployees();
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        }
    };

    // Initials avatar for the staff table
    const initials = (fullName) =>
        String(fullName || '?')
            .split(/[\s@._-]+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((w) => w[0]?.toUpperCase())
            .join('');

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            {message && (
                <div className={message.type === 'success' ? 'alert-success' : 'alert-error'}>
                    {message.type === 'success' ? (
                        <CheckCircle2 className="mt-px h-4 w-4 shrink-0" strokeWidth={2.5} />
                    ) : (
                        <AlertCircle className="mt-px h-4 w-4 shrink-0" strokeWidth={2.5} />
                    )}
                    <span>{message.text}</span>
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                {/* ---------- Create form ---------- */}
                <div className="lg:col-span-2">
                    <div className="card overflow-hidden lg:sticky lg:top-24">
                        <div className="page-banner">
                            <span className="tile-gold h-11 w-11">
                                <UserPlus className="h-5 w-5" strokeWidth={2} />
                            </span>
                            <h1 className="mt-3.5 font-display text-xl font-semibold tracking-tight text-stone-900">
                                Create Employee Account
                            </h1>
                            <p className="subtle mt-1.5">
                                New staff can sign in immediately with these credentials.
                            </p>
                        </div>

                        <div className="card-body">
                            <form onSubmit={handleCreateEmployee} className="space-y-4">
                                <div>
                                    <label className="label">Employee Name *</label>
                                    <div className="relative">
                                        <User
                                            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
                                            strokeWidth={2.2}
                                        />
                                        <input
                                            type="text"
                                            placeholder="e.g. John Doe"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="input pl-10"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="label">Employee Email *</label>
                                    <div className="relative">
                                        <Mail
                                            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
                                            strokeWidth={2.2}
                                        />
                                        <input
                                            type="email"
                                            placeholder="worker@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="input pl-10"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="label">Password *</label>
                                    <div className="relative">
                                        <Lock
                                            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
                                            strokeWidth={2.2}
                                        />
                                        <input
                                            type="password"
                                            placeholder="Minimum 6 characters"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="input pl-10"
                                            required
                                            minLength={6}
                                        />
                                    </div>
                                </div>

                                <button type="submit" disabled={loading} className="btn-primary btn-block">
                                    {loading ? (
                                        <>
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.5} />
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus className="h-3.5 w-3.5" strokeWidth={2.5} />
                                            Create Account
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* ---------- Existing employees ---------- */}
                <div className="lg:col-span-3">
                    <div className="card overflow-hidden">
                        <div className="card-head flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-100 text-amber-800">
                                    <Users className="h-[18px] w-[18px]" strokeWidth={2.2} />
                                </span>
                                <div>
                                    <h2 className="section-title">Existing Employees</h2>
                                    <p className="subtle">Studio staff with account access</p>
                                </div>
                            </div>
                            {employees.length > 0 && (
                                <span className="pill-neutral">{employees.length} staff</span>
                            )}
                        </div>

                        {employees.length === 0 ? (
                            <div className="empty-state">
                                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-stone-100 text-stone-400">
                                    <Inbox className="h-5 w-5" strokeWidth={2} />
                                </span>
                                <p className="text-sm font-bold text-stone-700">No employees found.</p>
                                <p className="subtle">Create the first account using the form.</p>
                            </div>
                        ) : (
                            <div className="table-wrap">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Email</th>
                                            <th className="text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {employees.map((emp) => (
                                            <tr key={emp.id}>
                                                <td>
                                                    <div className="flex items-center gap-3">
                                                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl chip-dark text-[11px] font-extrabold tracking-wide">
                                                            {initials(emp.full_name || emp.email)}
                                                        </span>
                                                        <span className="font-semibold text-stone-900">
                                                            {emp.full_name}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="text-stone-600">{emp.email}</td>
                                                <td className="text-right">
                                                    <button
                                                        onClick={() => handleDeleteEmployee(emp.id, emp.full_name)}
                                                        className="btn-danger btn-sm"
                                                    >
                                                        <Trash2 className="h-3 w-3" strokeWidth={2.5} />
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
            </div>
        </div>
    );
}
