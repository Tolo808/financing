import { describe, expect, it } from "vitest";
import { Decimal } from "@prisma/client-runtime-utils";
import { calculatePeriod } from "../calculate-period";
import type { PeriodConfig, PeriodInput } from "../types";

const D = (v: number | string) => new Decimal(v);

const defaultConfig: PeriodConfig = {
  toloRatePercent: D(35),
  toloTargetBirr: D(70000),
  saccoFixedInstallment: D(5000),
};

function makeInput(overrides: Partial<PeriodInput> = {}): PeriodInput {
  return {
    periodIndex: 1,
    earnings: D(0),
    cumulativeToloRecoveredBefore: D(0),
    arrearsCarriedIn: D(0),
    ...overrides,
  };
}

describe("calculatePeriod", () => {
  it("applies the plain 35% Tolo cut and fixed SACCo installment (the canonical example)", () => {
    const result = calculatePeriod(
      makeInput({ earnings: D(29000) }),
      defaultConfig
    );

    expect(result.toloCut.toNumber()).toBe(10150);
    expect(result.saccoPaymentDue.toNumber()).toBe(5000);
    expect(result.saccoPaymentPaid.toNumber()).toBe(5000);
    expect(result.arrearsCarriedOut.toNumber()).toBe(0);
    expect(result.takeHome.toNumber()).toBe(29000 - 10150 - 5000);
    expect(result.cumulativeToloRecoveredAfter.toNumber()).toBe(10150);
  });

  it("clamps the Tolo cut to exactly the remaining target when 35% would overshoot", () => {
    // Only 5,000 left to recover; 35% of 20,000 (=7,000) would overshoot it.
    const result = calculatePeriod(
      makeInput({ earnings: D(20000), cumulativeToloRecoveredBefore: D(65000) }),
      defaultConfig
    );

    expect(result.toloCut.toNumber()).toBe(5000);
    expect(result.cumulativeToloRecoveredAfter.toNumber()).toBe(70000);
    // afterTolo = 15,000, well over the fixed SACCo installment of 5,000
    expect(result.saccoPaymentPaid.toNumber()).toBe(5000);
    expect(result.takeHome.toNumber()).toBe(20000 - 5000 - 5000);
  });

  it("takes the Tolo cut fully, pays partial SACCo, and carries the shortfall as arrears", () => {
    const result = calculatePeriod(
      makeInput({ earnings: D(8000) }),
      { ...defaultConfig, saccoFixedInstallment: D(6000) }
    );

    // toloCut = 35% of 8000 = 2800; afterTolo = 5200; sacco due 6000, only 5200 available
    expect(result.toloCut.toNumber()).toBe(2800);
    expect(result.saccoPaymentDue.toNumber()).toBe(6000);
    expect(result.saccoPaymentPaid.toNumber()).toBe(5200);
    expect(result.arrearsCarriedOut.toNumber()).toBe(800);
    expect(result.takeHome.toNumber()).toBe(0);
  });

  it("carries arrears into the next period and adds them on top of the fixed installment", () => {
    const config: PeriodConfig = { ...defaultConfig, saccoFixedInstallment: D(6000) };

    const result = calculatePeriod(
      makeInput({ periodIndex: 2, earnings: D(10000), arrearsCarriedIn: D(800) }),
      config
    );

    // toloCut = 3500; afterTolo = 6500; saccoDue = 6000 + 800 = 6800; paid = 6500; arrears = 300
    expect(result.toloCut.toNumber()).toBe(3500);
    expect(result.saccoPaymentDue.toNumber()).toBe(6800);
    expect(result.saccoPaymentPaid.toNumber()).toBe(6500);
    expect(result.arrearsCarriedOut.toNumber()).toBe(300);
    expect(result.takeHome.toNumber()).toBe(0);
  });

  it("takes nothing for Tolo once the 70,000 target has already been fully recovered", () => {
    const result = calculatePeriod(
      makeInput({ earnings: D(29000), cumulativeToloRecoveredBefore: D(70000) }),
      defaultConfig
    );

    expect(result.toloCut.toNumber()).toBe(0);
    expect(result.cumulativeToloRecoveredAfter.toNumber()).toBe(70000);
    expect(result.saccoPaymentPaid.toNumber()).toBe(5000);
    expect(result.takeHome.toNumber()).toBe(29000 - 5000);
  });

  it("never lets take-home go negative and preserves the earnings conservation identity (fuzzed)", () => {
    for (let i = 0; i < 500; i++) {
      const earnings = D(Math.round(Math.random() * 50000 * 100) / 100);
      const cumulativeBefore = D(Math.round(Math.random() * 70000 * 100) / 100);
      const arrearsIn = D(Math.round(Math.random() * 10000 * 100) / 100);
      const saccoFixedInstallment = D(Math.round(Math.random() * 8000 * 100) / 100);

      const config: PeriodConfig = { ...defaultConfig, saccoFixedInstallment };
      const result = calculatePeriod(
        makeInput({ earnings, cumulativeToloRecoveredBefore: cumulativeBefore, arrearsCarriedIn: arrearsIn }),
        config
      );

      expect(result.takeHome.greaterThanOrEqualTo(0)).toBe(true);
      expect(result.toloCut.greaterThanOrEqualTo(0)).toBe(true);
      expect(result.toloCut.lessThanOrEqualTo(earnings)).toBe(true);
      expect(result.saccoPaymentPaid.greaterThanOrEqualTo(0)).toBe(true);
      expect(result.saccoPaymentPaid.lessThanOrEqualTo(result.saccoPaymentDue)).toBe(true);
      expect(result.arrearsCarriedOut.greaterThanOrEqualTo(0)).toBe(true);
      expect(
        result.cumulativeToloRecoveredAfter.lessThanOrEqualTo(defaultConfig.toloTargetBirr)
      ).toBe(true);

      const reconstructed = result.toloCut.plus(result.saccoPaymentPaid).plus(result.takeHome);
      expect(reconstructed.toDecimalPlaces(6).toNumber()).toBeCloseTo(earnings.toNumber(), 6);
    }
  });
});
