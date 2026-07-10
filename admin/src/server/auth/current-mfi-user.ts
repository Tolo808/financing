import { db } from "@/server/db";
import { createSupabaseServerClient } from "@/server/supabase/server-client";

export interface CurrentMfiUser {
  id: string;
  email: string;
  name: string;
  lenderId: string;
  lenderName: string;
}

/** Resolves the signed-in MFI/lender user from the Supabase session cookie, or null. */
export async function getCurrentMfiUser(): Promise<CurrentMfiUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const mfiUser = await db.mfiUser.findUnique({
    where: { authUserId: user.id },
    include: { lender: { select: { name: true } } },
  });
  if (!mfiUser || !mfiUser.active) return null;

  return {
    id: mfiUser.id,
    email: mfiUser.email,
    name: mfiUser.name,
    lenderId: mfiUser.lenderId,
    lenderName: mfiUser.lender.name,
  };
}
