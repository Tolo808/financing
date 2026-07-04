import { Decimal } from "@prisma/client-runtime-utils";
import type { Cadence, Driver, GlobalSettings } from "@prisma/client";
import type { PeriodConfig } from "@/server/finance/types";
import { db } from "@/server/db";

// The GlobalSettings singleton almost always already exists, so a plain read is enough —
// `upsert` (used everywhere this used to be inlined) always issues a write-capable
// INSERT ... ON CONFLICT even when nothing changes, which is needless extra DB round-trip
// cost on every single page load. Only falls back to creating the row on the rare cold-start
// case where it's genuinely missing (e.g. a fresh database that hasn't been seeded yet).
export async function getGlobalSettings(): Promise<GlobalSettings> {
  const existing = await db.globalSettings.findUnique({ where: { id: "singleton" } });
  if (existing) return existing;
  return db.globalSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
}

// A driver's SACCo installment is a static monthly figure; this converts it into the
// per-period amount actually charged, based on how often settlements are recorded.
// 30 is used as a flat days-per-month approximation rather than the real length of the
// current calendar month, so the daily rate stays constant all year instead of drifting
// between 28 and 31.
export const PERIODS_PER_MONTH: Record<Cadence, number> = {
  MONTHLY: 1,
  WEEKLY: 30 / 7,
  DAILY: 30,
};

type DriverFinanceFields = Pick<
  Driver,
  "toloRatePercentOverride" | "toloTargetBirrOverride" | "saccoFinancedTotal" | "termMonths" | "cadence"
>;

export function getEffectiveConfig(driver: DriverFinanceFields, settings: GlobalSettings): PeriodConfig {
  const toloRatePercent = driver.toloRatePercentOverride ?? settings.toloRatePercent;
  const toloTargetBirr = driver.toloTargetBirrOverride ?? settings.toloTargetBirr;
  const monthlyInstallment = new Decimal(driver.saccoFinancedTotal).dividedBy(driver.termMonths);
  const saccoFixedInstallment = monthlyInstallment
    .dividedBy(PERIODS_PER_MONTH[driver.cadence])
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  return { toloRatePercent, toloTargetBirr, saccoFixedInstallment };
}
