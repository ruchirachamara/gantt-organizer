"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { exchangeLoginCode, setErrorMessage, ready } = useAuth();
  const [message, setMessage] = useState("Finishing sign-in…");
  const ran = useRef(false);

  useEffect(() => {
    if (!ready || ran.current) return;
    ran.current = true;

    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    const code = params.get("code");

    // Strip secrets from the address bar immediately (history + referrer safety).
    window.history.replaceState({}, "", "/auth/callback");

    if (error) {
      setErrorMessage(error);
      setMessage("Sign-in failed. Redirecting…");
      window.setTimeout(() => router.replace("/"), 1200);
      return;
    }

    if (!code) {
      setErrorMessage("Missing login code from SSO callback.");
      setMessage("Sign-in failed. Redirecting…");
      window.setTimeout(() => router.replace("/"), 1200);
      return;
    }

    void exchangeLoginCode(code)
      .then(() => {
        setMessage("Signed in. Opening your timeline…");
        router.replace("/");
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : "Sign-in failed";
        setErrorMessage(msg);
        setMessage("Sign-in failed. Redirecting…");
        window.setTimeout(() => router.replace("/"), 1500);
      });
  }, [ready, exchangeLoginCode, setErrorMessage, router]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center text-[13px] text-muted">
      {message}
    </div>
  );
}
