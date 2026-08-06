import { createClient } from '@supabase/supabase-js';

/**
 * Env values are baked in at build time by Vite. When they are pasted into a
 * hosting dashboard they often pick up stray whitespace, a trailing newline, or
 * wrapping quotes. Supabase puts these straight into request headers, and the
 * Fetch API rejects header values containing such characters with a very
 * unhelpful "Failed to execute 'fetch' on 'Window': Invalid value".
 *
 * Cleaning and validating here turns that into an obvious, actionable error.
 */
const clean = (value) =>
  String(value ?? '')
    .trim()
    .replace(/^["']|["']$/g, ''); // strip accidental wrapping quotes

const supabaseUrl = clean(import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = clean(import.meta.env.VITE_SUPABASE_ANON_KEY);

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase config missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY ' +
      'in your environment (and in your hosting provider settings), then rebuild.'
  );
}

// Catches whitespace that survived in the middle of a value — e.g. a JWT that
// was copied across a line break.
if (/\s/.test(supabaseAnonKey)) {
  throw new Error(
    'VITE_SUPABASE_ANON_KEY contains whitespace or a line break. Re-copy the key ' +
      'as a single unbroken line and redeploy.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
