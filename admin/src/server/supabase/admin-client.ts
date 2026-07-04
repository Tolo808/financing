import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — bypasses RLS and can call the Admin API
 * (supabase.auth.admin.*). Server-only: this key must never reach the browser.
 * Used to create/update admin and driver Supabase Auth accounts (driver-service.ts,
 * the seed script) without needing SMS/email OTP — accounts are pre-confirmed here.
 * Not wired into any service yet (Phase A scaffolding) — see Phase B in the migration plan.
 */
export function createSupabaseServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase service role credentials are not configured (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
