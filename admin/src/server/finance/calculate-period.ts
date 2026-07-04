import { Decimal } from "@prisma/client-runtime-utils";
import type { PeriodConfig, PeriodInput, PeriodResult } from "./types";

function round2(value: Decimal): Decimal {
  return value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function calculatePeriod(input: PeriodInput, config: PeriodConfig): PeriodResult {
  const zero = new Decimal(0);
  // Clamp defensively so the conservation identity (earnings = toloCut + saccoPaid + takeHome)
  // and the take-home-never-negative invariant hold even if a bad value ever slips past validation.
  const earnings = Decimal.max(input.earnings, zero);

  const remainingToloTarget = Decimal.max(
    zero,
    config.toloTargetBirr.minus(input.cumulativeToloRecoveredBefore)
  );

  const uncappedToloCut = round2(earnings.times(config.toloRatePercent).dividedBy(100));
  const toloCut = Decimal.min(uncappedToloCut, remainingToloTarget, earnings);

  const afterTolo = earnings.minus(toloCut);

  const saccoPaymentDue = round2(config.saccoFixedInstallment.plus(input.arrearsCarriedIn));
  const saccoPaymentPaid = Decimal.min(saccoPaymentDue, afterTolo);

  const arrearsCarriedOut = saccoPaymentDue.minus(saccoPaymentPaid);
  const takeHome = afterTolo.minus(saccoPaymentPaid);

  const cumulativeToloRecoveredAfter = input.cumulativeToloRecoveredBefore.plus(toloCut);

  return {
    periodIndex: input.periodIndex,
    earnings,
    toloRatePercentApplied: config.toloRatePercent,
    toloCut,
    saccoFixedInstallment: config.saccoFixedInstallment,
    saccoPaymentDue,
    saccoPaymentPaid,
    arrearsCarriedIn: input.arrearsCarriedIn,
    arrearsCarriedOut,
    cumulativeToloRecoveredBefore: input.cumulativeToloRecoveredBefore,
    cumulativeToloRecoveredAfter,
    takeHome,
  };
}
