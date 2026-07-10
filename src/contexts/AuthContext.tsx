import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { authService } from '../services/auth';
import type { ProfileRecord } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type AuthContextValue = {
  session: Session | null;
  profile: ProfileRecord | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshSession: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession]   = useState<Session | null>(null);
  const [profile, setProfile]   = useState<ProfileRecord | null>(null);
  const [isLoading, setLoading] = useState(true);

  // ── Fetch / refresh profile for the current user ──────────────────
  const refreshProfile = useCallback(async () => {
    try {
      const p = await authService.getCurrentProfile();
      setProfile(p);
    } catch {
      setProfile(null);
    }
  }, []);

  // ── Full session restore (called on app start + after sign-in) ────
  const refreshSession = useCallback(async () => {
    setLoading(true);
    try {
      const currentSession = await authService.getSession();
      setSession(currentSession);
      if (currentSession) {
        await refreshProfile();
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.warn('[AuthContext] refreshSession error:', err);
      setSession(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [refreshProfile]);

  // ── Bootstrap: restore session from AsyncStorage on app start ─────
  useEffect(() => {
    refreshSession();

    // Subscribe to Supabase auth state changes so the context stays
    // in sync with sign-in, sign-out, token refresh, etc.
    const subscription = authService.onAuthStateChange(async (event, nextSession) => {
      setSession(nextSession ?? null);

      if (nextSession) {
        // New session — load profile (non-blocking; failure is silent)
        authService
          .getCurrentProfile()
          .then(setProfile)
          .catch(() => setProfile(null));
      } else {
        // Session ended (signed out or token expired)
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [refreshSession]);

  // ── Sign-out: clear everything locally ────────────────────────────
  const signOut = useCallback(async () => {
    try {
      await authService.signOut();
    } finally {
      setSession(null);
      setProfile(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      isLoading,
      isAuthenticated: !!session,
      refreshSession,
      refreshProfile,
      signOut,
    }),
    [session, profile, isLoading, refreshSession, refreshProfile, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>.');
  return ctx;
}


