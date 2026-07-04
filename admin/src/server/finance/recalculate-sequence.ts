import { Decimal } from "@prisma/client-runtime-utils";
import { calculatePeriod } from "./calculate-period";
import type { PeriodConfig, PeriodResult } from "./types";

export interface ExistingPeriod {
  periodIndex: number;
  earnings: Decimal;
}

export interface SequenceSeed {
  cumulativeToloRecoveredBefore: Decimal;
  arrearsCarriedIn: Decimal;
}

/**
 * Pure recalculation of a driver's period sequence, given:
 * - `periods`: every period that should be (re)computed, in ascending periodIndex order,
 *   each carrying its own (possibly newly-corrected) `earnings` value
 * - `config`: the currently-effective Tolo rate/target/SACCo installment for this driver
 * - `seed`: the running state to start from (defaults to zero/zero). Pass the prior period's
 *   post-state here to recompute only a tail of the sequence — periods strictly before the
 *   corrected one are mathematically unaffected and don't need recomputing.
 *
 * Corrections never change another period's recorded earnings — only this function's
 * derived outputs (cumulative recovered, arrears, take-home, etc.) cascade forward from
 * whichever period changed. Callers should pass the corrected period's new earnings in
 * `periods` and leave every other period's earnings untouched.
 */
export function recalculateSequence(
  periods: ExistingPeriod[],
  config: PeriodConfig,
  seed: SequenceSeed = { cumulativeToloRecoveredBefore: new Decimal(0), arrearsCarriedIn: new Decimal(0) }
): PeriodResult[] {
  const sorted = [...periods].sort((a, b) => a.periodIndex - b.periodIndex);

  let cumulativeToloRecoveredBefore = seed.cumulativeToloRecoveredBefore;
  let arrearsCarriedIn = seed.arrearsCarriedIn;
  const results: PeriodResult[] = [];

  for (const period of sorted) {
    const result = calculatePeriod(
      {
        periodIndex: period.periodIndex,
        earnings: period.earnings,
        cumulativeToloRecoveredBefore,
        arrearsCarriedIn,
      },
      config
    );
    results.push(result);
    cumulativeToloRecoveredBefore = result.cumulativeToloRecoveredAfter;
    arrearsCarriedIn = result.arrearsCarriedOut;
  }

  return results;
}
