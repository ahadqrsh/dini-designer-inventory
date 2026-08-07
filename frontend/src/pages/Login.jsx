import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  Lock,
  AlertCircle,
  ArrowRight,
  Loader2,
  Eye,
  EyeOff,
} from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPassword = String(password || '');

    if (!cleanEmail || !cleanPassword) {
      setError('Please fill in both email and password.');
      setLoading(false);
      return;
    }

    try {
      // Delegates authentication directly to AuthContext using primitive strings
      await login(cleanEmail, cleanPassword);

      // Hard navigation to dashboard upon successful authentication
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Invalid login credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* ---------- Brand panel (desktop only) ---------- */}
      <div className="relative hidden lg:flex flex-col justify-between bg-brass-sheen p-12 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, #fff 0 1px, transparent 1px 14px), repeating-linear-gradient(-45deg, #fff 0 1px, transparent 1px 14px)',
          }}
        />
        <div
          className="pointer-events-none absolute -top-28 -right-28 h-96 w-96 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(176,141,87,0.35), transparent 70%)' }}
        />

        <div className="relative flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-100/10 ring-1 ring-amber-200/25 backdrop-blur">
            <img src={logo} alt="Dini Designers" className="h-7 w-7 object-contain" />
          </span>
          <div>
            <p className="font-display text-[21px] font-semibold tracking-tight text-amber-50 leading-none">
              Dini Designers
            </p>
            <p className="mt-1.5 text-[9px] font-bold uppercase tracking-[0.24em] text-amber-200/60 leading-none">
              Atelier Management
            </p>
          </div>
        </div>

        <div className="relative max-w-md">
          <h1 className="font-display text-[42px] font-semibold leading-[1.12] tracking-tight text-amber-50">
            Every stitch,
            <br />
            <span className="text-amber-300">accounted for.</span>
          </h1>
          <p className="mt-5 text-sm leading-relaxed text-amber-100/70">
            Bespoke orders, twenty-point measurements, fabric allocation, and workshop tasks —
            managed in one register.
          </p>

          <div className="mt-9 flex flex-wrap gap-2">
            {['Orders', 'Measurements', 'Fabric Stock', 'Tasks'].map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-amber-200/20 bg-amber-100/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-100/90 backdrop-blur"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>

        <p className="relative text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200/40">
          Smart Apparel Business Management
        </p>
      </div>

      {/* ---------- Form panel ---------- */}
      <div className="flex items-center justify-center p-5 sm:p-8">
        <div className="w-full max-w-md animate-rise-in">
          {/* Mobile brand */}
          <div className="lg:hidden mb-8 flex flex-col items-center text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brass-sheen shadow-card">
              <img src={logo} alt="Dini Designers" className="h-8 w-8 object-contain" />
            </span>
            <p className="mt-4 font-display text-xl font-semibold tracking-tight text-stone-900">
              Dini Designers
            </p>
            <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.22em] text-stone-400">
              Atelier Management
            </p>
          </div>

          <div className="card p-7 sm:p-9">
            <div className="mb-7">
              <p className="eyebrow">Secure Access</p>
              <h2 className="mt-2 font-display text-[26px] font-semibold tracking-tight text-stone-900">
                Welcome back
              </h2>
              <p className="mt-1.5 text-sm text-stone-500">
                Sign in to your studio account to continue.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <div className="alert-error">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-px" strokeWidth={2.5} />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="label">Email</label>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
                    strokeWidth={2.2}
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input pl-10"
                    placeholder="worker@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
                    strokeWidth={2.2}
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input pl-10 pr-11"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary btn-block btn-lg">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  <>
                    Login
                    <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-[11px] font-medium text-stone-400">
            Trouble signing in? Contact your studio administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
