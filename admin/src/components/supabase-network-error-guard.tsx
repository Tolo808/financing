"use client";

import { useEffect } from "react";

// Supabase's client retries its own background session-refresh fetches (e.g. when the browser
// tab regains focus) and, only after those retries are exhausted, throws an
// AuthRetryableFetchError — as an unhandled promise rejection, since nothing awaits that
// internal call. Next's dev overlay treats any unhandled rejection as a crash, but this one is
// benign: the existing session is left intact and Supabase retries again on the next auth
// check. This suppresses only that specific, already-retried error class (identified by name,
// not just "Failed to fetch" generically) — anything else still surfaces normally.
export function SupabaseNetworkErrorGuard() {
  useEffect(() => {
    function handleRejection(event: PromiseRejectionEvent) {
      const reason = event.reason as { name?: string } | undefined;
      if (reason?.name === "AuthRetryableFetchError") {
        console.warn("Supabase background session refresh failed (network) — will retry automatically.", reason);
        event.preventDefault();
      }
    }
    window.addEventListener("unhandledrejection", handleRejection);
    return () => window.removeEventListener("unhandledrejection", handleRejection);
  }, []);

  return null;
}
