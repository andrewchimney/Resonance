"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";

/**
 * Shape of the shared auth state.
 * - user: currently logged-in user (or null if logged out)
 * - supabase: shared Supabase client
 * - authLoading: true while we are checking session on app load
 */
type AuthContextValue = {
  user: User | null;
  supabase: SupabaseClient | null;
  authLoading: boolean;
};

/**
 * Default context value.
 * Real values are provided by <AuthProvider>.
 */
const AuthContext = createContext<AuthContextValue>({
  user: null,
  supabase: null,
  authLoading: true,
});

/**
 * AuthProvider wraps the app and keeps auth state in one place.
 * This prevents "logged in on one page, logged out on another" behavior.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Read env vars once per render cycle
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  /**
   * Create ONE shared Supabase client.
   * useMemo prevents recreating it every render.
   */
  const supabase = useMemo(() => {
    if (!supabaseUrl || !supabaseAnonKey) return null;
    return createClient(supabaseUrl, supabaseAnonKey);
  }, [supabaseUrl, supabaseAnonKey]);

  useEffect(() => {
    let isMounted = true;

    // If env config is missing, mark auth as done loading
    if (!supabase) {
      setUser(null);
      setAuthLoading(false);
      return;
    }

    // 1) Load current session on first mount
    supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return;

      if (error) {
        console.error("AuthProvider getSession error:", error.message);
        setUser(null);
        setAuthLoading(false);
        return;
      }

      setUser(data.session?.user ?? null);
      setAuthLoading(false);
    });

    // 2) Subscribe to login/logout/token refresh changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    // 3) Cleanup subscription on unmount
    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
}, [supabase]);

  return (
    <AuthContext.Provider value={{ user, supabase, authLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook used by pages/components to read shared auth state.
 */
export function useAuth() {
  return useContext(AuthContext);
}