import { Decimal } from "@prisma/client-runtime-utils";
import type { Driver } from "@prisma/client";
import type { PeriodConfig } from "@/server/finance/types";
import { PERIODS_PER_MONTH } from "./effective-config";

export interface MfiSummary {
  totalObligationBirr: string;
  paidSoFarBirr: string;
  remainingBirr: string;
  percentPaid: number;
  termMonths: number;
  monthsPaid: number;
  monthsRemaining: number;
}

type DriverTermCadence = Pick<Driver, "termMonths" | "cadence">;

/**
 * `config.saccoFixedInstallment` is the PER-PERIOD amount (daily/weekly/monthly depending on
 * the driver's cadence) — reconstruct the static monthly figure from it before computing
 * months-based stats, so a daily-cadence driver's "months paid" still counts whole months
 * rather than whole days.
 *
 * monthsPaid counts whole installments' worth of payment accumulated (paidSoFar / monthly
 * installment, floored), independent of arrears timing — a driver who has paid 2.5 months'
 * worth across uneven periods shows 2 months paid, not a fractional month.
 *
 * Pure / DB-free so it's directly unit-testable — callers fetch `paidSoFar` themselves
 * (usually already have it on hand from a ledger query they needed anyway).
 */
export function computeMfiSummaryFromValues(
  driver: DriverTermCadence,
  config: PeriodConfig,
  paidSoFar: Decimal
): MfiSummary {
  const monthlyInstallment = config.saccoFixedInstallment.times(PERIODS_PER_MONTH[driver.cadence]);
  const totalObligation = monthlyInstallment.times(driver.termMonths);

  const remaining = Decimal.max(new Decimal(0), totalObligation.minus(paidSoFar));
  const percentPaid = totalObligation.greaterThan(0)
    ? paidSoFar.dividedBy(totalObligation).times(100).toDecimalPlaces(1).toNumber()
    : 100;

  const monthsPaid = monthlyInstallment.greaterThan(0)
    ? Math.min(driver.termMonths, paidSoFar.dividedBy(monthlyInstallment).floor().toNumber())
    : driver.termMonths;
  const monthsRemaining = Math.max(0, driver.termMonths - monthsPaid);

  return {
    totalObligationBirr: totalObligation.toFixed(2),
    paidSoFarBirr: paidSoFar.toFixed(2),
    remainingBirr: remaining.toFixed(2),
    percentPaid,
    termMonths: driver.termMonths,
    monthsPaid,
    monthsRemaining,
  };
}
