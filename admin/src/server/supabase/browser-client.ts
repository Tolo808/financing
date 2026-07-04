import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for Client Components (e.g. the admin login form).
 * Not wired into any page yet (Phase A scaffolding) — see Phase B in the migration plan.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
