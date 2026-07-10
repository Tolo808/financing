import type { z } from "zod";
import { db, TX_OPTS } from "@/server/db";
import { createSupabaseServiceRoleClient } from "@/server/supabase/admin-client";
import { writeAuditLog } from "./audit-service";
import type { createLenderSchema, createMfiUserSchema } from "@/lib/validation";

type CreateLenderInput = z.infer<typeof createLenderSchema>;
type CreateMfiUserInput = z.infer<typeof createMfiUserSchema>;

export async function listLenders() {
  return db.lender.findMany({ orderBy: { createdAt: "desc" } });
}

export async function createLender(input: CreateLenderInput, actorAdminId: string) {
  return db.$transaction(async (tx) => {
    const created = await tx.lender.create({
      data: { name: input.name, contactEmail: input.contactEmail ?? null },
    });

    await writeAuditLog(tx, {
      entityType: "Lender",
      entityId: created.id,
      action: "CREATE",
      afterJson: created,
      actorType: "ADMIN",
      actorAdminId,
    });

    return created;
  }, TX_OPTS);
}

// Real email + password, no synthetic-email transform needed (unlike drivers, who log in with
// phone + short PIN) — mirrors createDriver's create-outside-transaction-then-compensate pattern
// (driver-service.ts) since Supabase Auth isn't transactional with Postgres here.
export async function createMfiUser(input: CreateMfiUserInput, actorAdminId: string) {
  const supabaseAdmin = createSupabaseServiceRoleClient();
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  });
  if (authError || !authUser.user) {
    throw new Error(authError?.message ?? "Failed to create MFI user auth account");
  }

  try {
    return await db.$transaction(async (tx) => {
      const created = await tx.mfiUser.create({
        data: {
          name: input.name,
          email: input.email,
          authUserId: authUser.user.id,
          lenderId: input.lenderId,
        },
      });

      await writeAuditLog(tx, {
        entityType: "MfiUser",
        entityId: created.id,
        action: "CREATE",
        afterJson: created,
        actorType: "ADMIN",
        actorAdminId,
      });

      return created;
    }, TX_OPTS);
  } catch (error) {
    await supabaseAdmin.auth.admin.deleteUser(authUser.user.id).catch(() => {});
    throw error;
  }
}
