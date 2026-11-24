"use client";

import { useAuth } from "@/lib/auth/AuthProvider";
import { displayName } from "@/lib/auth/session";

export const AuthControls = () => {
  const { user, busy, error, signOut } = useAuth();

  if (!user) return null;

  const label = displayName(user);
  const greeting = `Welcome ${label}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {user.picture && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.picture}
          alt=""
          className="h-6 w-6 rounded-full border border-line"
          referrerPolicy="no-referrer"
        />
      )}
      <span
        className="max-w-[240px] truncate text-[12.5px] font-medium text-ink"
        title={user.email ? `${greeting} · ${user.email}` : greeting}
      >
        {greeting}
      </span>
      <button
        type="button"
        className="btn btn-ghost min-h-0 px-2.5 py-1.5 text-[12px]"
        disabled={busy}
        onClick={() => signOut()}
      >
        Sign out
      </button>
      {error && (
        <span className="w-full text-[11px] text-[#c0303a]">{error}</span>
      )}
    </div>
  );
};
