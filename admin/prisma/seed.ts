import "dotenv/config";
import { db } from "@/server/db";
import { createSupabaseServiceRoleClient } from "@/server/supabase/admin-client";
import { driverAuthEmail } from "@/lib/driver-auth-email";
import { recordOrCorrectSettlement } from "@/server/services/settlement-service";

function monthRange(year: number, month: number): { start: string; end: string } {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59));
  return { start: start.toISOString(), end: end.toISOString() };
}

const supabaseAdmin = createSupabaseServiceRoleClient();

/** Idempotent: creates the Supabase Auth user for this email/password, or reuses it if it already exists. */
async function getOrCreateAdminAuthUser(email: string, password: string): Promise<string> {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true });
  if (!error) return data.user.id;

  const { data: list } = await supabaseAdmin.auth.admin.listUsers();
  const existing = list.users.find((u) => u.email === email);
  if (existing) return existing.id;
  throw new Error(`Failed to create or find Supabase Auth user for ${email}: ${error.message}`);
}

/**
 * Idempotent: creates the Supabase Auth user for this phone/PIN (identified internally by a
 * synthetic email — see driverAuthEmail), or replaces it if a user for this phone already exists
 * (covers accounts created before the phone->email switch, or a PIN reset on re-seed).
 * Supabase's admin.updateUserById enforces a 6-character minimum password policy that
 * admin.createUser doesn't, so an existing account is deleted and recreated rather than
 * having its password updated in place — same reasoning as driver-service.ts's updateDriver.
 */
async function getOrCreateDriverAuthUser(phone: string, pin: string): Promise<string> {
  const email = driverAuthEmail(phone);
  const { data: list } = await supabaseAdmin.auth.admin.listUsers();
  const existing = list.users.find((u) => u.phone === phone.replace(/^\+/, "") || u.email === email);
  if (existing) {
    await supabaseAdmin.auth.admin.deleteUser(existing.id);
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: pin,
    email_confirm: true,
    phone,
  });
  if (error || !data.user) throw new Error(`Failed to create Supabase Auth user for ${phone}: ${error?.message}`);
  return data.user.id;
}

async function main() {
  await db.globalSettings.upsert({
    where: { id: "singleton" },
    update: { toloTargetBirr: 70000, toloRatePercent: 35 },
    create: { id: "singleton", toloTargetBirr: 70000, toloRatePercent: 35 },
  });

  const adminAuthUserId = await getOrCreateAdminAuthUser("admin@tolo.et", "ChangeMe123!");
  const admin = await db.adminUser.upsert({
    where: { email: "admin@tolo.et" },
    update: { authUserId: adminAuthUserId },
    create: {
      email: "admin@tolo.et",
      name: "Tolo Admin",
      authUserId: adminAuthUserId,
      role: "SUPER_ADMIN",
    },
  });

  const lender = await db.lender.upsert({
    where: { id: "demo-lender" },
    update: {},
    create: { id: "demo-lender", name: "Addis Credit & Savings SACCo", contactEmail: "ops@addiscredit.et" },
  });

  const mfiAuthUserId = await getOrCreateAdminAuthUser("mfi@addiscredit.et", "ChangeMe123!");
  await db.mfiUser.upsert({
    where: { email: "mfi@addiscredit.et" },
    update: { authUserId: mfiAuthUserId, lenderId: lender.id },
    create: {
      email: "mfi@addiscredit.et",
      name: "Addis Credit Portfolio Manager",
      authUserId: mfiAuthUserId,
      lenderId: lender.id,
    },
  });

  // PLACEHOLDER — these SACCo-financed totals are demo figures only.
  // Replace with each real driver's actual SACCo contract amount via the admin UI
  // before entering any real driver's data. See README "Verify against the real SACCo agreement".
  const driver1AuthUserId = await getOrCreateDriverAuthUser("+251911000001", "1234");
  const driver1 = await db.driver.upsert({
    where: { phone: "+251911000001" },
    update: { authUserId: driver1AuthUserId },
    create: {
      name: "Abebe Kebede",
      phone: "+251911000001",
      authUserId: driver1AuthUserId,
      saccoFinancedTotal: 60000, // PLACEHOLDER
      termMonths: 12,
      cadence: "MONTHLY",
      language: "en",
      lenderId: lender.id,
    },
  });

  const driver2AuthUserId = await getOrCreateDriverAuthUser("+251911000002", "5678");
  const driver2 = await db.driver.upsert({
    where: { phone: "+251911000002" },
    update: { authUserId: driver2AuthUserId },
    create: {
      name: "Selamawit Tesfaye",
      phone: "+251911000002",
      authUserId: driver2AuthUserId,
      saccoFinancedTotal: 90000, // PLACEHOLDER
      termMonths: 18,
      cadence: "MONTHLY",
      language: "am",
      lenderId: lender.id,
    },
  });

  // Driver 1: canonical example (29,000 earnings -> 10,150 Tolo cut, exactly 35%),
  // then a low-earnings period that creates SACCo arrears, then a period that clears them.
  const d1p1 = monthRange(2026, 4);
  await recordOrCorrectSettlement(
    { driverId: driver1.id, periodIndex: 1, periodStart: d1p1.start, periodEnd: d1p1.end, earnings: 29000 },
    admin.id
  );

  const d1p2 = monthRange(2026, 5);
  await recordOrCorrectSettlement(
    { driverId: driver1.id, periodIndex: 2, periodStart: d1p2.start, periodEnd: d1p2.end, earnings: 6000 },
    admin.id
  );

  const d1p3 = monthRange(2026, 6);
  await recordOrCorrectSettlement(
    { driverId: driver1.id, periodIndex: 3, periodStart: d1p3.start, periodEnd: d1p3.end, earnings: 20000 },
    admin.id
  );

  // Driver 2: same canonical example on an 18-month term.
  const d2p1 = monthRange(2026, 4);
  await recordOrCorrectSettlement(
    { driverId: driver2.id, periodIndex: 1, periodStart: d2p1.start, periodEnd: d2p1.end, earnings: 29000 },
    admin.id
  );

  console.log("Seed complete.");
  console.log(`Admin login: admin@tolo.et / ChangeMe123! (change this immediately)`);
  console.log(`MFI portal login: mfi@addiscredit.et / ChangeMe123! (change this immediately)`);
  console.log(`Driver 1: ${driver1.phone} / PIN 1234 (${driver1.name})`);
  console.log(`Driver 2: ${driver2.phone} / PIN 5678 (${driver2.name})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
