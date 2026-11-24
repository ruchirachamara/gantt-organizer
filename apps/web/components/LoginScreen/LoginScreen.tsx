"use client";

import { useAuth } from "@/lib/auth/AuthProvider";

export const LoginScreen = () => {
  const {
    configured,
    googleConfigured,
    linkedInConfigured,
    busy,
    error,
    startGoogleLogin,
    startLinkedInLogin,
  } = useAuth();

  return (
    <div className="surface-atmosphere fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
      <div
        aria-hidden
        className="surface-atmosphere-grid pointer-events-none absolute inset-0"
      />

      <main className="relative z-10 mx-4 w-full max-w-[420px] rounded-[16px] border border-line bg-panel px-7 py-8 shadow-[0_1px_2px_#0000000a,0_28px_56px_-28px_#1a274066]">
        <p className="m-0 font-mono text-[11px] tracking-[0.08em] text-accent uppercase">
          Gantt Timelines
        </p>
        <h1 className="mt-2 mb-0 text-[26px] leading-tight tracking-[-0.03em] text-ink [font-weight:680]">
          Sign in to continue
        </h1>
        <p className="mt-2 mb-0 text-[14px] leading-relaxed text-muted">
          Continue with Google or LinkedIn. Sign-in is handled securely by the
          API with a full redirect — ready for public users.
        </p>

        <div className="mt-7 flex flex-col gap-2.5">
          <button
            type="button"
            className="btn btn-primary flex w-full items-center justify-center gap-2.5 py-3 text-[14px] disabled:cursor-not-allowed disabled:opacity-70"
            disabled={busy || !googleConfigured}
            onClick={() => startGoogleLogin()}
          >
            <GoogleMark />
            {busy ? "Redirecting…" : "Continue with Google"}
          </button>

          <button
            type="button"
            className="btn btn-ghost flex w-full items-center justify-center gap-2.5 border border-line py-3 text-[14px] disabled:cursor-not-allowed disabled:opacity-70"
            disabled={busy || !linkedInConfigured}
            onClick={() => startLinkedInLogin()}
          >
            <LinkedInMark />
            {busy ? "Redirecting…" : "Continue with LinkedIn"}
          </button>
        </div>

        {(error || !configured) && (
          <div className="mt-4 rounded-lg border border-[#e7b4b8] bg-[#fbeced] px-3 py-2.5 text-[12px] leading-snug text-[#8a2a32]">
            {error ? (
              <p className="m-0">{error}</p>
            ) : (
              <>
                <p className="m-0">
                  No SSO provider is configured yet. Add Google and/or LinkedIn
                  OAuth credentials, then restart{" "}
                  <code className="font-mono text-[11px]">npm run dev</code>.
                </p>
                <ol className="mb-0 mt-2 list-decimal pl-4">
                  <li>
                    Google: Web client + redirect{" "}
                    <code className="font-mono text-[11px]">
                      http://localhost:3001/auth/google/callback
                    </code>
                  </li>
                  <li>
                    LinkedIn: app + redirect{" "}
                    <code className="font-mono text-[11px]">
                      http://localhost:3010/api/auth/linkedin/callback
                    </code>
                  </li>
                  <li>
                    Web:{" "}
                    <code className="font-mono text-[11px]">
                      NEXT_PUBLIC_GOOGLE_CLIENT_ID
                    </code>
                    ,{" "}
                    <code className="font-mono text-[11px]">
                      NEXT_PUBLIC_LINKEDIN_CLIENT_ID
                    </code>
                  </li>
                  <li>
                    API: matching{" "}
                    <code className="font-mono text-[11px]">*_CLIENT_ID</code> /{" "}
                    <code className="font-mono text-[11px]">*_CLIENT_SECRET</code>{" "}
                    /{" "}
                    <code className="font-mono text-[11px]">*_REDIRECT_URI</code>
                  </li>
                </ol>
              </>
            )}
          </div>
        )}

        <p className="mt-6 mb-0 text-center text-[11px] text-muted">
          New here? Sign-in creates your account automatically.
        </p>
      </main>
    </div>
  );
};

const GoogleMark = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
    <path
      fill="#FFC107"
      d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
    />
    <path
      fill="#FF3D00"
      d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
    />
    <path
      fill="#4CAF50"
      d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
    />
    <path
      fill="#1976D2"
      d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.7-6.5 7.1l.1.1 6.2 5.2C36.7 39.2 44 34 44 24c0-1.3-.1-2.7-.4-3.5z"
    />
  </svg>
);

const LinkedInMark = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
    <path
      fill="#0A66C2"
      d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22 0H2C.9 0 0 .9 0 2v20c0 1.1.9 2 2 2h20c1.1 0 2-.9 2-2V2c0-1.1-.9-2-2-2z"
    />
  </svg>
);
