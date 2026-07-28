import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { INACTIVITY_TIMEOUT_MS, type Role } from '@/lib/constants';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  role: Role | null;
  loading: boolean;
  signIn: (email: string, password: string, expectedRole: Role) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function extractRole(user: User | null): Role | null {
  if (!user) return null;
  const meta = user.app_metadata?.role ?? user.user_metadata?.role;
  if (meta === 'admin' || meta === 'faculty' || meta === 'student') return meta;
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setRole(extractRole(data.session?.user ?? null));
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setRole(extractRole(newSession?.user ?? null));
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // Inactivity auto-logout
  useEffect(() => {
    if (!session) return;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        supabase.auth.signOut();
      }, INACTIVITY_TIMEOUT_MS);
    };
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [session]);

  const signIn = async (email: string, password: string, expectedRole: Role) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    const actualRole = extractRole(data.user);
    if (actualRole !== expectedRole) {
      // Wrong portal — sign out and reject
      await supabase.auth.signOut();
      return { error: `This account is not a ${expectedRole} account. Please use the correct login portal.` };
    }
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, role, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
