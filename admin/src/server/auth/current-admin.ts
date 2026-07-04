import { db } from "@/server/db";
import { createSupabaseServerClient } from "@/server/supabase/server-client";
import type { AdminRole } from "@prisma/client";

export interface CurrentAdmin {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
}

/** Resolves the signed-in admin from the Supabase session cookie, or null if unauthenticated. */
export async function getCurrentAdmin(): Promise<CurrentAdmin | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = await db.adminUser.findUnique({ where: { authUserId: user.id } });
  if (!admin || !admin.active) return null;

  return { id: admin.id, email: admin.email, name: admin.name, role: admin.role };
}
