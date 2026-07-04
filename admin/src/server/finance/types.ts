import { Decimal } from "@prisma/client-runtime-utils";

export interface PeriodConfig {
  /** e.g. 35.00 meaning 35% — resolved as driver override ?? global default */
  toloRatePercent: Decimal;
  /** e.g. 70000 — resolved as driver override ?? global default */
  toloTargetBirr: Decimal;
  /** driver.saccoFinancedTotal / driver.termMonths, precomputed by the caller */
  saccoFixedInstallment: Decimal;
}

export interface PeriodInput {
  periodIndex: number;
  earnings: Decimal;
  /** running Tolo-recovered total BEFORE this period is applied */
  cumulativeToloRecoveredBefore: Decimal;
  /** SACCo arrears carried in from the previous period */
  arrearsCarriedIn: Decimal;
}

export interface PeriodResult {
  periodIndex: number;
  earnings: Decimal;
  toloRatePercentApplied: Decimal;
  toloCut: Decimal;
  saccoFixedInstallment: Decimal;
  saccoPaymentDue: Decimal;
  saccoPaymentPaid: Decimal;
  arrearsCarriedIn: Decimal;
  arrearsCarriedOut: Decimal;
  cumulativeToloRecoveredBefore: Decimal;
  cumulativeToloRecoveredAfter: Decimal;
  takeHome: Decimal;
}
