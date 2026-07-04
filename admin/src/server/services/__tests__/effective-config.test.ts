import { describe, expect, it } from "vitest";
import { Decimal } from "@prisma/client-runtime-utils";
import type { Driver, GlobalSettings } from "@prisma/client";
import { getEffectiveConfig } from "../effective-config";
import { computeMfiSummaryFromValues } from "../mfi-summary";

const D = (v: number | string) => new Decimal(v);

const fakeSettings = {
  toloTargetBirr: D(70000),
  toloRatePercent: D(35),
} as GlobalSettings;

function fakeDriver(overrides: Partial<Driver>): Driver {
  return {
    toloRatePercentOverride: null,
    toloTargetBirrOverride: null,
    saccoFinancedTotal: D(181200),
    termMonths: 12,
    cadence: "MONTHLY",
    ...overrides,
  } as Driver;
}

describe("getEffectiveConfig cadence-aware SACCo installment", () => {
  it("monthly cadence charges the full static monthly amount per period (regression)", () => {
    const driver = fakeDriver({ saccoFinancedTotal: D(181200), termMonths: 12, cadence: "MONTHLY" });
    const config = getEffectiveConfig(driver, fakeSettings);
    expect(config.saccoFixedInstallment.toNumber()).toBe(15100);
  });

  it("daily cadence charges the monthly amount divided by 30", () => {
    const driver = fakeDriver({ saccoFinancedTotal: D(181200), termMonths: 12, cadence: "DAILY" });
    const config = getEffectiveConfig(driver, fakeSettings);
    // 15100 / 30 = 503.33...
    expect(config.saccoFixedInstallment.toNumber()).toBeCloseTo(503.33, 2);
  });

  it("daily cadence for the 18-month/10,600-monthly plan", () => {
    const driver = fakeDriver({ saccoFinancedTotal: D(190800), termMonths: 18, cadence: "DAILY" });
    const config = getEffectiveConfig(driver, fakeSettings);
    // 10600 / 30 = 353.33...
    expect(config.saccoFixedInstallment.toNumber()).toBeCloseTo(353.33, 2);
  });

  it("weekly cadence charges the monthly amount divided by ~4.2857", () => {
    const driver = fakeDriver({ saccoFinancedTotal: D(181200), termMonths: 12, cadence: "WEEKLY" });
    const config = getEffectiveConfig(driver, fakeSettings);
    // 15100 / (30/7) = 3523.33...
    expect(config.saccoFixedInstallment.toNumber()).toBeCloseTo(3523.33, 1);
  });
});

describe("computeMfiSummaryFromValues monthly reconstruction round-trips across cadences", () => {
  it("reconstructs a total obligation close to the true monthly total, within daily-rounding tolerance", () => {
    const driver = fakeDriver({ saccoFinancedTotal: D(181200), termMonths: 12, cadence: "DAILY" });
    const config = getEffectiveConfig(driver, fakeSettings);

    // 15100/30 rounds to 503.33/day, so reconstructing 503.33 x 30 x 12 accumulates a few
    // Birr of rounding drift vs the true 181200 total — expected, not a bug.
    const summary = computeMfiSummaryFromValues(driver, config, D(0));
    expect(Number(summary.totalObligationBirr)).toBeCloseTo(181200, -1);
  });

  it("counts whole months paid from accumulated daily payments, not whole days", () => {
    const driver = fakeDriver({ saccoFinancedTotal: D(181200), termMonths: 12, cadence: "DAILY" });
    const config = getEffectiveConfig(driver, fakeSettings);

    // 2.5 months' worth paid via many small daily installments
    const paidSoFar = D(15100 * 2.5);
    const summary = computeMfiSummaryFromValues(driver, config, paidSoFar);
    expect(summary.monthsPaid).toBe(2);
    expect(summary.monthsRemaining).toBe(10);
  });

  it("monthly cadence still behaves as before (regression)", () => {
    const driver = fakeDriver({ saccoFinancedTotal: D(60000), termMonths: 12, cadence: "MONTHLY" });
    const config = getEffectiveConfig(driver, fakeSettings);
    const summary = computeMfiSummaryFromValues(driver, config, D(15000));
    expect(summary.totalObligationBirr).toBe("60000.00");
    expect(summary.monthsPaid).toBe(3);
    expect(summary.monthsRemaining).toBe(9);
  });
});
