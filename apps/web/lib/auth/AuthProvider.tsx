"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  apiBase,
  clearSession,
  getAccessToken,
  getStoredUser,
  googleLoginUrl,
  isGoogleConfigured,
  isLinkedInConfigured,
  isSsoConfigured,
  linkedInLoginUrl,
  setSession,
  type AuthUser,
} from "./session";

type AuthContextValue = {
  user: AuthUser | null;
  ready: boolean;
  /** True when at least one SSO provider is configured on the web app. */
  configured: boolean;
  googleConfigured: boolean;
  linkedInConfigured: boolean;
  busy: boolean;
  error: string | null;
  accessToken: string | null;
  /** Nest-owned Google OAuth redirect. */
  startGoogleLogin: () => void;
  /** Nest-owned LinkedIn OAuth redirect. */
  startLinkedInLogin: () => void;
  /** Finish login after Nest redirects back with a one-time code. */
  exchangeLoginCode: (code: string) => Promise<void>;
  signOut: () => void;
  clearError: () => void;
  setErrorMessage: (message: string) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const googleConfigured = isGoogleConfigured();
  const linkedInConfigured = isLinkedInConfigured();
  const configured = isSsoConfigured();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    const stored = getStoredUser();
    if (!token || !stored) {
      clearSession();
      setUser(null);
      setAccessToken(null);
      setReady(true);
      return;
    }

    void fetch(`${apiBase()}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          clearSession();
          setUser(null);
          setAccessToken(null);
          return;
        }
        const body = (await res.json()) as { user?: AuthUser };
        if (body.user?.id) {
          setUser(body.user);
          setAccessToken(token);
          setSession(token, body.user);
        } else {
          clearSession();
          setUser(null);
          setAccessToken(null);
        }
      })
      .catch(() => {
        setUser(stored);
        setAccessToken(token);
      })
      .finally(() => setReady(true));
  }, []);

  const startGoogleLogin = useCallback(() => {
    if (!googleConfigured) {
      setError(
        "Add NEXT_PUBLIC_GOOGLE_CLIENT_ID on the web app and GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET on the API."
      );
      return;
    }
    setBusy(true);
    setError(null);
    // Same-origin /api/auth/google → Nest /auth/google → Google redirect.
    window.location.assign(googleLoginUrl());
  }, [googleConfigured]);

  const startLinkedInLogin = useCallback(() => {
    if (!linkedInConfigured) {
      setError(
        "Add NEXT_PUBLIC_LINKEDIN_CLIENT_ID on the web app and LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET on the API."
      );
      return;
    }
    setBusy(true);
    setError(null);
    // Same-origin /api/auth/linkedin → Nest /auth/linkedin → LinkedIn redirect.
    window.location.assign(linkedInLoginUrl());
  }, [linkedInConfigured]);

  const exchangeLoginCode = useCallback(async (code: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase()}/auth/exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const body = (await res.json().catch(() => null)) as {
        accessToken?: string;
        user?: AuthUser;
        message?: string | string[];
      } | null;
      if (!res.ok || !body?.accessToken || !body.user) {
        const msg = Array.isArray(body?.message)
          ? body.message.join(", ")
          : body?.message;
        throw new Error(msg || "Login exchange failed");
      }
      setSession(body.accessToken, body.user);
      setAccessToken(body.accessToken);
      setUser(body.user);
    } catch (err) {
      // Do not wipe an already-established session (e.g. Strict Mode double-invoke).
      if (!getAccessToken()) {
        clearSession();
        setAccessToken(null);
        setUser(null);
      }
      setError(err instanceof Error ? err.message : "Sign-in failed");
      throw err;
    } finally {
      setBusy(false);
    }
  }, []);

  const signOut = useCallback(() => {
    clearSession();
    setAccessToken(null);
    setUser(null);
    setError(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      ready,
      configured,
      googleConfigured,
      linkedInConfigured,
      busy,
      error,
      accessToken,
      startGoogleLogin,
      startLinkedInLogin,
      exchangeLoginCode,
      signOut,
      clearError: () => setError(null),
      setErrorMessage: (message: string) => setError(message),
    }),
    [
      user,
      ready,
      configured,
      googleConfigured,
      linkedInConfigured,
      busy,
      error,
      accessToken,
      startGoogleLogin,
      startLinkedInLogin,
      exchangeLoginCode,
      signOut,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
