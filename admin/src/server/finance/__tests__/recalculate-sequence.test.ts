import { describe, expect, it } from "vitest";
import { Decimal } from "@prisma/client-runtime-utils";
import { recalculateSequence, type ExistingPeriod } from "../recalculate-sequence";
import type { PeriodConfig } from "../types";

const D = (v: number | string) => new Decimal(v);

const config: PeriodConfig = {
  toloRatePercent: D(35),
  toloTargetBirr: D(70000),
  saccoFixedInstallment: D(5000),
};

describe("recalculateSequence", () => {
  it("returns an empty sequence for no periods", () => {
    expect(recalculateSequence([], config)).toEqual([]);
  });

  it("chains cumulative recovered and arrears forward across periods in order, regardless of input order", () => {
    const periods: ExistingPeriod[] = [
      { periodIndex: 2, earnings: D(29000) },
      { periodIndex: 1, earnings: D(29000) },
      { periodIndex: 3, earnings: D(29000) },
    ];

    const results = recalculateSequence(periods, config);

    expect(results.map((r) => r.periodIndex)).toEqual([1, 2, 3]);
    expect(results[0].cumulativeToloRecoveredBefore.toNumber()).toBe(0);
    expect(results[0].cumulativeToloRecoveredAfter.toNumber()).toBe(10150);
    expect(results[1].cumulativeToloRecoveredBefore.toNumber()).toBe(10150);
    expect(results[1].cumulativeToloRecoveredAfter.toNumber()).toBe(20300);
    expect(results[2].cumulativeToloRecoveredBefore.toNumber()).toBe(20300);
    expect(results[2].cumulativeToloRecoveredAfter.toNumber()).toBe(30450);
  });

  it("propagates arrears across consecutive shortfall periods", () => {
    const periods: ExistingPeriod[] = [
      { periodIndex: 1, earnings: D(8000) }, // toloCut 2800, afterTolo 5200, sacco due 5000 -> paid in full, no arrears
      { periodIndex: 2, earnings: D(4000) }, // toloCut 1400, afterTolo 2600, sacco due 5000 -> paid 2600, arrears 2400
      { periodIndex: 3, earnings: D(10000) }, // toloCut 3500, afterTolo 6500, sacco due 5000+2400=7400 -> paid 6500, arrears 900
    ];

    const results = recalculateSequence(periods, config);

    expect(results[0].arrearsCarriedOut.toNumber()).toBe(0);
    expect(results[1].arrearsCarriedIn.toNumber()).toBe(0);
    expect(results[1].arrearsCarriedOut.toNumber()).toBe(2400);
    expect(results[2].arrearsCarriedIn.toNumber()).toBe(2400);
    expect(results[2].saccoPaymentDue.toNumber()).toBe(7400);
    expect(results[2].arrearsCarriedOut.toNumber()).toBe(900);
  });

  it("cascades a correction to an earlier period through all later periods, without altering their recorded earnings", () => {
    const original: ExistingPeriod[] = [
      { periodIndex: 1, earnings: D(8000) },
      { periodIndex: 2, earnings: D(29000) },
      { periodIndex: 3, earnings: D(29000) },
    ];
    const originalResults = recalculateSequence(original, config);
    expect(originalResults[0].arrearsCarriedOut.toNumber()).toBe(0);

    // Correct period 1's earnings down so it can no longer cover the full SACCo installment.
    const corrected: ExistingPeriod[] = [
      { periodIndex: 1, earnings: D(4000) },
      { periodIndex: 2, earnings: D(29000) }, // unchanged
      { periodIndex: 3, earnings: D(29000) }, // unchanged
    ];
    const correctedResults = recalculateSequence(corrected, config);

    // Later periods keep their original recorded earnings...
    expect(correctedResults[1].earnings.toNumber()).toBe(29000);
    expect(correctedResults[2].earnings.toNumber()).toBe(29000);

    // ...but their derived numbers change because period 1 now carries arrears forward.
    expect(correctedResults[0].arrearsCarriedOut.toNumber()).toBeGreaterThan(0);
    expect(correctedResults[1].arrearsCarriedIn.toNumber()).toBe(
      correctedResults[0].arrearsCarriedOut.toNumber()
    );
    expect(correctedResults[1].saccoPaymentDue.toNumber()).not.toBe(
      originalResults[1].saccoPaymentDue.toNumber()
    );
    expect(correctedResults[2].cumulativeToloRecoveredBefore.toNumber()).not.toBe(
      originalResults[2].cumulativeToloRecoveredBefore.toNumber()
    );
  });

  it("stops accruing Tolo cut once the target is reached mid-sequence and reflects that in later periods", () => {
    // Fixed installment 0 to isolate Tolo-only behavior; earnings large enough to hit 70,000 within 3 periods.
    const noSacco: PeriodConfig = { ...config, saccoFixedInstallment: D(0) };
    const periods: ExistingPeriod[] = [
      { periodIndex: 1, earnings: D(100000) }, // 35% = 35000
      { periodIndex: 2, earnings: D(100000) }, // 35% = 35000 -> cumulative would be 70000 exactly
      { periodIndex: 3, earnings: D(100000) }, // target already met, toloCut should be 0
    ];

    const results = recalculateSequence(periods, noSacco);

    expect(results[0].toloCut.toNumber()).toBe(35000);
    expect(results[1].toloCut.toNumber()).toBe(35000);
    expect(results[1].cumulativeToloRecoveredAfter.toNumber()).toBe(70000);
    expect(results[2].toloCut.toNumber()).toBe(0);
    expect(results[2].takeHome.toNumber()).toBe(100000);
  });
});
