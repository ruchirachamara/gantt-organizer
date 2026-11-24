"use client";

import { useAuth } from "@/lib/auth/AuthProvider";
import { LoginScreen } from "@/components/LoginScreen";
import Timeline from "@/components/Timeline/Timeline";

export const AppShell = () => {
  const { user, ready } = useAuth();

  if (!ready) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-[13px] text-muted">
        Checking session…
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1320px]">
      <Timeline />
    </div>
  );
};
