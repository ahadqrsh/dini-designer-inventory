import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = async (sessionUser) => {
    if (!sessionUser) {
      setRole(null);
      setLoading(false);
      return;
    }

    // 1. Check if user is admin by email convention
    if (sessionUser.email?.toLowerCase().includes('admin')) {
      setRole('Admin');
      setLoading(false);
      return;
    }

    try {
      // 2. Query public profile table safely
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', sessionUser.id)
        .maybeSingle();

      if (error) {
        console.warn('Role fetch warning:', error.message);
      }

      setRole(data?.role || 'Worker');
    } catch (err) {
      console.error('Error fetching user role:', err.message);
      setRole('Worker');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user);
      } else {
        setLoading(false);
      }
    });

    // Reactive listener for sign-in/sign-out events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user);
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Accepts explicit email and password strings
  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: String(email).trim().toLowerCase(),
      password: String(password),
    });

    if (error) throw error;
    return data;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);