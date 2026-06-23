"use client";

/**
 * Session/auth context.
 *
 * Replaces the hardcoded `maxteravakyan` identity that the pages used to assume.
 * On mount it calls `/api/me` once to bootstrap the session from the Flask-Login
 * cookie; a 401 simply means "logged out" (user = null). Pages and the Navbar
 * read `user` from here instead of carrying their own mock user object.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { api, ApiError, type Me } from "../lib/api";

interface AuthContextValue {
  user: Me | null;
  /** True until the initial /api/me bootstrap resolves. */
  loading: boolean;
  /** Re-fetch the current user (e.g. after editing the profile). */
  refresh: () => Promise<void>;
  login: (identifier: string, password: string) => Promise<void>;
  signup: (
    username: string,
    email: string,
    password: string,
    confirm: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  /** Locally apply an updated user (after a successful profile edit). */
  setUser: (user: Me | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await api.me();
      setUser(me);
    } catch (err) {
      // 401 => not logged in; anything else we also treat as "no session"
      if (!(err instanceof ApiError) || err.status !== 401) {
        // Unexpected error — log for debugging, still fall back to logged-out.
        console.error("auth bootstrap failed", err);
      }
      setUser(null);
    }
  }, []);

  // Bootstrap once on mount.
  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const login = useCallback(async (identifier: string, password: string) => {
    const me = await api.login(identifier, password);
    setUser(me);
  }, []);

  const signup = useCallback(
    async (username: string, email: string, password: string, confirm: string) => {
      const me = await api.signup(username, email, password, confirm);
      setUser(me);
    },
    []
  );

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, refresh, login, signup, logout, setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
