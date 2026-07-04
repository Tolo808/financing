import { Decimal } from "@prisma/client-runtime-utils";
import type { Cadence, Driver, GlobalSettings } from "@prisma/client";
import type { PeriodConfig } from "@/server/finance/types";

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
