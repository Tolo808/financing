import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client for Server Components / Server Actions / Route Handlers.
 * Not wired into any route yet (Phase A scaffolding) — see Phase B in the migration plan.
 * `setAll` is best-effort: Server Components can't write cookies, only the proxy (middleware)
 * can persist a refreshed session — that's why proxy.ts must also run this same pattern.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component render — expected, proxy.ts handles session refresh.
        }
      },
    },
  });
}
