export type AuthUser = {
  id: string;
  email?: string;
  name?: string;
  givenName?: string;
  familyName?: string;
  picture?: string;
};

/** Prefer first + last, then first, then full name, then email. */
export const displayName = (user: AuthUser): string => {
  const first = user.givenName?.trim();
  const last = user.familyName?.trim();
  if (first && last) return `${first} ${last}`;
  if (first) return first;
  const full = user.name?.trim();
  if (full) return full;
  return user.email ?? "Signed in";
};

const TOKEN_KEY = "gantt-access-token";
const USER_KEY = "gantt-auth-user";

export const getAccessToken = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const getStoredUser = (): AuthUser | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUser;
    return parsed?.id ? parsed : null;
  } catch {
    return null;
  }
};

export const setSession = (accessToken: string, user: AuthUser): void => {
  window.localStorage.setItem(TOKEN_KEY, accessToken);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearSession = (): void => {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  } catch {
    /* ignore */
  }
};

/** Client ID present means the product expects Google SSO (Nest still needs secret). */
export const isGoogleConfigured = (): boolean =>
  Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim());

/** Client ID present means the product expects LinkedIn SSO (Nest still needs secret). */
export const isLinkedInConfigured = (): boolean =>
  Boolean(process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID?.trim());

/** At least one SSO provider is advertised on the web app. */
export const isSsoConfigured = (): boolean =>
  isGoogleConfigured() || isLinkedInConfigured();

/**
 * Browser → Next rewrite prefix only. Always same-origin `/api/...`
 * so Nest receives `/auth/...` (never `localhost:3001/api/...`).
 */
export const apiBase = (): string => {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim() || "/api";
  // If someone set an absolute Nest URL, still force the proxy path.
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return "/api";
  }
  return raw.replace(/\/$/, "") || "/api";
};

/** Nest-owned Google OAuth entry (via Next proxy). */
export const googleLoginUrl = (): string => `${apiBase()}/auth/google`;

/** Nest-owned LinkedIn OAuth entry (via Next proxy). */
export const linkedInLoginUrl = (): string => `${apiBase()}/auth/linkedin`;
