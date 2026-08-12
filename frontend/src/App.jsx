import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { GuestRoute } from './routes/GuestRoute';
import { LOGIN_PATH, panelPathFor } from './routes/paths';
import FullScreenLoader from './components/FullScreenLoader';
import Layout from './components/Layout';
import Login from './pages/Login';
import CreateOrder from './pages/admin/CreateOrder';
import OrderList from './pages/admin/OrderList';
import FabricInventory from './pages/admin/FabricInventory';
import TaskManagement from './pages/admin/TaskManagement';
import Attendance from './pages/admin/Attendance';
import AdvancePayments from './pages/admin/AdvancePayments';
import WorkerOverview from './pages/admin/WorkerOverview';
import MyTasks from './pages/worker/MyTasks';
import MyAttendance from './pages/worker/MyAttendance';
import MyAdvances from './pages/worker/MyAdvances';
import CreateEmployee from './pages/admin/CreateEmployee';

const Unauthorized = () => (
    <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card max-w-sm w-full p-8 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-50 text-red-600">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-6 w-6"
                    aria-hidden="true"
                >
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                </svg>
            </span>
            <p className="mt-5 font-display text-3xl font-extrabold tracking-tight text-stone-900">403</p>
            <p className="mt-1 text-sm font-bold uppercase tracking-[0.12em] text-red-600">
                Access Denied
            </p>
            <p className="mt-3 text-sm text-stone-500">
                You don't have permission to view this page.
            </p>
        </div>
    </div>
);

// Smart catch-all redirect based on role
function DefaultRedirect() {
    const { user, role, loading } = useAuth();

    // Wait for the session AND the role before choosing a destination,
    // otherwise an admin can land on the worker panel.
    if (loading || (user && !role)) {
        return <FullScreenLoader />;
    }

    if (!user) {
        return <Navigate to={LOGIN_PATH} replace />;
    }

    return <Navigate to={panelPathFor(role)} replace />;
}

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    {/* Login lives at the root. Signed-in users are bounced to their panel. */}
                    <Route element={<GuestRoute />}>
                        <Route path="/" element={<Login />} />
                    </Route>

                    {/* Old bookmarks and any stale links keep working */}
                    <Route path="/login" element={<Navigate to={LOGIN_PATH} replace />} />

                    <Route path="/unauthorized" element={<Unauthorized />} />

                    {/* Admin-only Routes */}
                    <Route element={<ProtectedRoute allowedRoles={['Admin', 'admin']} />}>
                        <Route element={<Layout />}>
                            <Route path="/admin/orders" element={<OrderList />} />
                            <Route path="/admin/orders/new" element={<CreateOrder />} />
                            <Route path="/admin/inventory" element={<FabricInventory />} />
                            <Route path="/admin/tasks" element={<TaskManagement />} />
                            <Route path="/admin/attendance" element={<Attendance />} />
                            <Route path="/admin/advances" element={<AdvancePayments />} />
                            <Route path="/admin/worker-overview" element={<WorkerOverview />} />
                            <Route path="/admin/employees/new" element={<CreateEmployee />} />
                        </Route>
                    </Route>

                    {/* Worker Routes */}
                    <Route element={<ProtectedRoute allowedRoles={['Admin', 'admin', 'Worker', 'worker', 'Tailor', 'Staff']} />}>
                        <Route element={<Layout />}>
                            <Route path="/my-tasks" element={<MyTasks />} />
                            <Route path="/my-attendance" element={<MyAttendance />} />
                            <Route path="/my-advances" element={<MyAdvances />} />
                        </Route>
                    </Route>

                    {/* Dynamic Fallback Route */}
                    <Route path="*" element={<DefaultRedirect />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}
