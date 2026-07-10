import type { z } from "zod";
import { db, TX_OPTS } from "@/server/db";
import { createSupabaseServiceRoleClient } from "@/server/supabase/admin-client";
import { driverAuthEmail } from "@/lib/driver-auth-email";
import { writeAuditLog } from "./audit-service";
import type { createDriverSchema, updateDriverSchema } from "@/lib/validation";

type CreateDriverInput = z.infer<typeof createDriverSchema>;
type UpdateDriverInput = z.infer<typeof updateDriverSchema>;

// pinHash is legacy (pre-Supabase-Auth) and must never leave the server if present on an
// unmigrated row — strip it before returning a driver to any caller outside this file.
function omitPin<T extends { pinHash: string | null }>(driver: T): Omit<T, "pinHash"> {
  const { pinHash: _pinHash, ...rest } = driver;
  return rest;
}

export async function listDrivers(search?: string) {
  const drivers = await db.driver.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { phone: { contains: search } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
  });
  return drivers.map(omitPin);
}

export async function getDriver(id: string) {
  const driver = await db.driver.findUnique({ where: { id } });
  return driver ? omitPin(driver) : null;
}

export async function createDriver(input: CreateDriverInput, actorAdminId: string) {
  // The admin enters the static monthly SACCo payment directly (e.g. 15,100); the stored
  // `saccoFinancedTotal` is derived from it so the split engine's total/termMonths division
  // reproduces that exact monthly figure with no rounding drift.
  const saccoFinancedTotal = input.saccoMonthlyPayment * input.termMonths;

  // The driver's Supabase Auth account is the source of truth for login (phone + PIN in the UI).
  // Supabase's Phone provider requires a real SMS provider to even enable it (a hard blocker for
  // this project's "no SMS" requirement), so the underlying Supabase identity is a synthetic
  // email derived from the phone number instead — see driverAuthEmail. Created via the Admin API
  // with email_confirm so no confirmation email is ever sent. It's created outside the Prisma
  // transaction since Supabase isn't transactional with Postgres here — if the `Driver` row
  // insert below fails, the auth user is deleted to avoid leaving an orphaned account that would
  // block re-using that phone number.
  const supabaseAdmin = createSupabaseServiceRoleClient();
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: driverAuthEmail(input.phone),
    password: input.pin,
    email_confirm: true,
    phone: input.phone,
  });
  if (authError || !authUser.user) {
    throw new Error(authError?.message ?? "Failed to create driver auth account");
  }

  try {
    return await db.$transaction(async (tx) => {
      const created = await tx.driver.create({
        data: {
          name: input.name,
          phone: input.phone,
          authUserId: authUser.user.id,
          saccoFinancedTotal,
          termMonths: input.termMonths,
          cadence: input.cadence,
          toloTargetBirrOverride: input.toloTargetBirrOverride ?? null,
          toloRatePercentOverride: input.toloRatePercentOverride ?? null,
          language: input.language,
          lenderId: input.lenderId,
        },
      });

      await writeAuditLog(tx, {
        entityType: "Driver",
        entityId: created.id,
        action: "CREATE",
        afterJson: created,
        actorType: "ADMIN",
        actorAdminId,
      });

      return omitPin(created);
    }, TX_OPTS);
  } catch (error) {
    await supabaseAdmin.auth.admin.deleteUser(authUser.user.id).catch(() => {});
    throw error;
  }
}

export async function updateDriver(id: string, input: UpdateDriverInput, actorAdminId: string) {
  const before = await db.driver.findUniqueOrThrow({ where: { id } });

  // Keep the Supabase Auth account's email/phone/password in sync with what the admin just
  // changed — login goes through Supabase directly, so a stale synthetic email/PIN there would
  // silently lock the driver out (or let them log in with an old PIN) even though the `Driver`
  // row looks correct.
  let newAuthUserId: string | undefined;
  const phoneChanged = Boolean(input.phone && input.phone !== before.phone);
  if (before.authUserId && input.pin) {
    // Supabase's admin.updateUserById enforces a 6-character minimum password policy that
    // admin.createUser doesn't — since driver PINs are intentionally short (4-12 digits), a PIN
    // reset deletes and recreates the auth account (under the same/new email) instead of
    // updating the password in place.
    const supabaseAdmin = createSupabaseServiceRoleClient();
    const nextPhone = input.phone ?? before.phone;
    await supabaseAdmin.auth.admin.deleteUser(before.authUserId);
    const { data: recreated, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: driverAuthEmail(nextPhone),
      password: input.pin,
      email_confirm: true,
      phone: nextPhone,
    });
    if (createError || !recreated.user) {
      throw new Error(createError?.message ?? "Failed to reset driver auth account");
    }
    newAuthUserId = recreated.user.id;
  } else if (before.authUserId && phoneChanged) {
    const supabaseAdmin = createSupabaseServiceRoleClient();
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(before.authUserId, {
      email: driverAuthEmail(input.phone!),
      email_confirm: true,
      phone: input.phone,
    });
    if (authError) {
      throw new Error(authError.message);
    }
  }

  return db.$transaction(async (tx) => {
    const { pin: _pin, saccoMonthlyPayment, ...rest } = input;
    const data: Record<string, unknown> = { ...rest };
    if (newAuthUserId) data.authUserId = newAuthUserId;
    if (saccoMonthlyPayment !== undefined) {
      const termMonths = input.termMonths ?? before.termMonths;
      data.saccoFinancedTotal = saccoMonthlyPayment * termMonths;
    }

    const after = await tx.driver.update({ where: { id }, data });

    await writeAuditLog(tx, {
      entityType: "Driver",
      entityId: id,
      action: "UPDATE",
      beforeJson: before,
      afterJson: after,
      actorType: "ADMIN",
      actorAdminId,
    });

    return omitPin(after);
  }, TX_OPTS);
}
