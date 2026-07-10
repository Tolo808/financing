import { describe, expect, it } from "vitest";
import { Decimal } from "@prisma/client-runtime-utils";
import { deriveLoanStatus } from "../lender-portfolio-service";
import type { MfiSummary } from "../mfi-summary";

const D = (v: number | string) => new Decimal(v);

function fakeSummary(overrides: Partial<MfiSummary>): MfiSummary {
  return {
    totalObligationBirr: "60000.00",
    paidSoFarBirr: "0.00",
    remainingBirr: "60000.00",
    percentPaid: 0,
    termMonths: 12,
    monthsPaid: 0,
    monthsRemaining: 12,
    ...overrides,
  };
}

describe("deriveLoanStatus", () => {
  it("returns CLEARED once percentPaid reaches 100, even with old arrears still on the ledger", () => {
    // totalObligation is recomputed from current driver fields, so a correction can push
    // percentPaid to/above 100 while a stale arrears figure from before the correction remains —
    // CLEARED must win regardless, since the loan is genuinely paid off.
    const summary = fakeSummary({ percentPaid: 100 });
    expect(deriveLoanStatus(summary, D(500))).toBe("CLEARED");
  });

  it("returns CLEARED when percentPaid exceeds 100 (overpayment)", () => {
    const summary = fakeSummary({ percentPaid: 104.2 });
    expect(deriveLoanStatus(summary, D(0))).toBe("CLEARED");
  });

  it("returns IN_ARREARS when not cleared and arrears carried out is positive", () => {
    const summary = fakeSummary({ percentPaid: 40 });
    expect(deriveLoanStatus(summary, D(150))).toBe("IN_ARREARS");
  });

  it("returns CURRENT when not cleared and arrears carried out is zero", () => {
    const summary = fakeSummary({ percentPaid: 40 });
    expect(deriveLoanStatus(summary, D(0))).toBe("CURRENT");
  });

  it("returns CURRENT for a driver with zero settlements yet (no arrears, 0% paid)", () => {
    const summary = fakeSummary({ percentPaid: 0 });
    expect(deriveLoanStatus(summary, D(0))).toBe("CURRENT");
  });
});
