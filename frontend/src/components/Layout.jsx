import { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
    ClipboardList,
    PlusCircle,
    Layers,
    ListChecks,
    UserPlus,
    LogOut,
    Menu,
    X,
    Scissors,
    CalendarCheck,
} from './Icons';
import { useAuth } from '../context/AuthContext';
import { LOGIN_PATH } from '../routes/paths';

export default function Layout() {
    const { role, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);

    // Close the drawer whenever the route changes, so a tap doesn't leave it open
    useEffect(() => {
        setMobileOpen(false);
    }, [location.pathname]);

    const handleLogout = async () => {
        await logout();
        navigate(LOGIN_PATH);
    };

    // Case-insensitive check
    const isAdmin = role?.toLowerCase() === 'admin';

    // Strictly ADMIN ONLY links
    const adminLinks = [
        { to: '/admin/orders', label: 'All Orders', Icon: ClipboardList },
        { to: '/admin/orders/new', label: 'New Order', Icon: PlusCircle },
        { to: '/admin/inventory', label: 'Fabric Stock', Icon: Layers },
        { to: '/admin/tasks', label: 'Assign Tasks', Icon: ListChecks },
        { to: '/admin/attendance', label: 'Attendance', Icon: CalendarCheck },
        { to: '/admin/employees/new', label: 'Create Employee', Icon: UserPlus },
    ];

    // Strictly WORKER ONLY links
    const workerLinks = [{ to: '/my-tasks', label: 'My Tasks', Icon: ListChecks }];

    const links = isAdmin ? adminLinks : workerLinks;

    const sidebarContent = (
        <div className="sidebar">
            {/* Brand — full width, no truncation */}
            <div className="border-b border-stone-200 px-5 py-6">
                <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl chip-dark shadow-sm">
                        <Scissors className="h-[18px] w-[18px]" strokeWidth={2} />
                    </span>
                    <div className="min-w-0">
                        <p className="font-display text-[19px] font-semibold leading-none tracking-tight text-stone-900">
                            Dini Designers
                        </p>
                        <p className="mt-1.5 text-[9px] font-bold uppercase tracking-[0.24em] leading-none text-amber-600">
                            Atelier Management
                        </p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-3 py-5">
                <p className="eyebrow px-3.5 pb-2.5">
                    {isAdmin ? 'Studio' : 'Workshop'}
                </p>
                <div className="space-y-1">
                    {links.map(({ to, label, Icon }) => {
                        const active = location.pathname === to;
                        return (
                            <Link
                                key={to}
                                to={to}
                                aria-current={active ? 'page' : undefined}
                                className={`side-link ${active ? 'side-link-active' : 'side-link-idle'}`}
                            >
                                <Icon
                                    className={`h-[17px] w-[17px] shrink-0 ${
                                        active ? 'text-amber-600' : 'text-stone-400'
                                    }`}
                                    strokeWidth={2}
                                />
                                {label}
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* Account */}
            <div className="border-t border-stone-200 p-3">
                <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-amber-200 bg-amber-50 text-[11px] font-bold uppercase text-amber-700">
                        {(role || 'U').slice(0, 2)}
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-stone-800">{role || 'User'}</p>
                        <p className="flex items-center gap-1.5 text-[10px] text-stone-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                            Signed in
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleLogout}
                    className="mt-1 flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-[12px] font-semibold tracking-wide text-stone-500 transition-colors hover:bg-red-50 hover:text-red-700"
                >
                    <LogOut className="h-[17px] w-[17px] shrink-0" strokeWidth={2} />
                    Log out
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen font-body antialiased">
            {/* Fixed sidebar on desktop */}
            <aside className="fixed inset-y-0 left-0 z-40 hidden lg:block">
                {sidebarContent}
            </aside>

            {/* Off-canvas drawer on mobile */}
            {mobileOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div
                        className="absolute inset-0 bg-stone-950/40 backdrop-blur-sm animate-fade-in"
                        onClick={() => setMobileOpen(false)}
                        aria-hidden="true"
                    />
                    <div className="absolute inset-y-0 left-0 animate-slide-in shadow-pop">
                        {sidebarContent}
                    </div>
                    <button
                        onClick={() => setMobileOpen(false)}
                        aria-label="Close navigation"
                        className="absolute left-[17rem] top-4 grid h-10 w-10 place-items-center rounded-xl bg-white/90 text-stone-700 shadow-card"
                    >
                        <X className="h-4 w-4" strokeWidth={2.5} />
                    </button>
                </div>
            )}

            <div className="lg:pl-64">
                {/* Slim top bar — mobile trigger, and breathing room on desktop */}
                <header className="sticky top-0 z-30 border-b border-stone-200 bg-sand/80 backdrop-blur-md lg:hidden">
                    <div className="flex h-14 items-center gap-3 px-4">
                        <button
                            onClick={() => setMobileOpen(true)}
                            aria-label="Open navigation"
                            className="grid h-9 w-9 place-items-center rounded-xl border border-stone-200 bg-white text-stone-700 shadow-sm"
                        >
                            <Menu className="h-4 w-4" strokeWidth={2.5} />
                        </button>
                        <span className="grid h-8 w-8 place-items-center rounded-lg chip-dark">
                            <Scissors className="h-3.5 w-3.5" strokeWidth={2} />
                        </span>
                        <p className="font-display text-base font-semibold tracking-tight text-stone-900">
                            Dini Designers
                        </p>
                    </div>
                </header>

                <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
                    <div key={location.pathname} className="animate-rise-in">
                        <Outlet />
                    </div>
                </main>

                <footer className="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-10">
                    <div className="gold-rule mb-4" />
                    <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">
                            Dini Designers · Bespoke Tailoring
                        </p>
                        <p className="text-[11px] text-stone-400">
                            Smart Apparel Business Management
                        </p>
                    </div>
                </footer>
            </div>
        </div>
    );
}
