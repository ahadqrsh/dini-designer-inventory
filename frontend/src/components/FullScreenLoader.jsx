import { Loader2 } from './Icons';

/**
 * Shown while the auth session and role are still resolving. Rendering this
 * instead of guessing prevents a brief wrong-panel flash on login.
 */
export default function FullScreenLoader({ label = 'Loading' }) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-amber-800" strokeWidth={2.5} />
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-stone-400">{label}</p>
        </div>
    );
}
