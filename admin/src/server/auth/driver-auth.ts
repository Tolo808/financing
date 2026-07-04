import { createClient } from "@supabase/supabase-js";
import { db } from "@/server/db";

export class AuthError extends Error {}

/**
 * Validates the caller's Supabase access token (the Expo app signs in directly against
 * Supabase, so this is the driver's own session token, not one we issue) and resolves it to
 * our internal Driver id via `authUserId`. Used only by `/api/driver/dashboard`, which stays
 * server-side to reuse the tested finance-aggregation logic rather than duplicating it client-side.
 */
export async function requireDriverAuth(request: Request): Promise<string> {
  const header = request.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    throw new AuthError("Missing or malformed Authorization header");
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    throw new AuthError("Invalid or expired token");
  }

  const driver = await db.driver.findUnique({ where: { authUserId: data.user.id } });
  if (!driver || !driver.active) {
    throw new AuthError("Driver not found");
  }

  return driver.id;
}
