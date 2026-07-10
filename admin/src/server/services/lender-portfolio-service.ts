import { Decimal } from "@prisma/client-runtime-utils";
import { db } from "@/server/db";
import { getEffectiveConfig, getGlobalSettings } from "./effective-config";
import { computeMfiSummaryFromValues, type MfiSummary } from "./mfi-summary";

export type LoanStatus = "CURRENT" | "IN_ARREARS" | "CLEARED";

/**
 * Pure/DB-free so it's directly unit-testable. CLEARED is checked first: `totalObligation` is
 * recomputed from the driver's *current* term/rate fields, so percentPaid can cross 100 even
 * with old arrears still sitting on the ledger from before a correction — that isn't a bug, it
 * just means the loan is done regardless of arrears history. A driver with zero settlements yet
 * reads as CURRENT (not a 4th "no history" status) — a deliberate simplification.
 */
export function deriveLoanStatus(mfiSummary: MfiSummary, latestArrearsCarriedOut: Decimal): LoanStatus {
  if (mfiSummary.percentPaid >= 100) return "CLEARED";
  if (latestArrearsCarriedOut.greaterThan(0)) return "IN_ARREARS";
  return "CURRENT";
}

export async function assertDriverBelongsToLender(lenderId: string, driverId: string) {
  const driver = await db.driver.findUnique({ where: { id: driverId }, select: { lenderId: true } });
  if (!driver || driver.lenderId !== lenderId) {
    throw new Error("Not found");
  }
}

interface LoanRow {
  driverId: string;
  name: string;
  phone: string;
  active: boolean;
  status: LoanStatus;
  summary: MfiSummary;
}

// Two queries total regardless of portfolio size: one for the drivers, one batched settlement
// aggregate — avoids N+1 across a whole lender's portfolio (same batching approach already used
// in the driver dashboard API route).
async function getLoanRows(lenderId: string): Promise<LoanRow[]> {
  const [drivers, settings] = await Promise.all([
    db.driver.findMany({ where: { lenderId }, orderBy: { createdAt: "desc" } }),
    getGlobalSettings(),
  ]);
  if (drivers.length === 0) return [];

  const driverIds = drivers.map((d) => d.id);
  const settlements = await db.settlement.findMany({
    where: { driverId: { in: driverIds }, status: "ACTIVE" },
    select: { driverId: true, periodIndex: true, saccoPaymentPaid: true, arrearsCarriedOut: true },
    orderBy: [{ driverId: "asc" }, { periodIndex: "asc" }],
  });

  const byDriver = new Map<string, { paidSoFar: Decimal; latestArrearsCarriedOut: Decimal }>();
  for (const s of settlements) {
    const entry = byDriver.get(s.driverId) ?? { paidSoFar: new Decimal(0), latestArrearsCarriedOut: new Decimal(0) };
    entry.paidSoFar = entry.paidSoFar.plus(s.saccoPaymentPaid);
    entry.latestArrearsCarriedOut = new Decimal(s.arrearsCarriedOut); // last write wins (ascending periodIndex order)
    byDriver.set(s.driverId, entry);
  }

  return drivers.map((driver) => {
    const agg = byDriver.get(driver.id) ?? { paidSoFar: new Decimal(0), latestArrearsCarriedOut: new Decimal(0) };
    const config = getEffectiveConfig(driver, settings);
    const summary = computeMfiSummaryFromValues(driver, config, agg.paidSoFar);
    const status = deriveLoanStatus(summary, agg.latestArrearsCarriedOut);
    return {
      driverId: driver.id,
      name: driver.name,
      phone: driver.phone,
      active: driver.active,
      status,
      summary,
    };
  });
}

export interface PortfolioSummary {
  totalDisbursedBirr: string;
  totalCollectedBirr: string;
  totalOutstandingBirr: string;
  portfolioAtRiskPercent: number;
  loanCount: number;
  countByStatus: Record<LoanStatus, number>;
}

export async function getPortfolioSummary(lenderId: string): Promise<PortfolioSummary> {
  const rows = await getLoanRows(lenderId);

  let totalDisbursed = new Decimal(0);
  let totalCollected = new Decimal(0);
  let totalOutstanding = new Decimal(0);
  let atRiskOutstanding = new Decimal(0);
  const countByStatus: Record<LoanStatus, number> = { CURRENT: 0, IN_ARREARS: 0, CLEARED: 0 };

  for (const row of rows) {
    const outstanding = new Decimal(row.summary.remainingBirr);
    totalDisbursed = totalDisbursed.plus(row.summary.totalObligationBirr);
    totalCollected = totalCollected.plus(row.summary.paidSoFarBirr);
    totalOutstanding = totalOutstanding.plus(outstanding);
    countByStatus[row.status]++;
    if (row.status === "IN_ARREARS") atRiskOutstanding = atRiskOutstanding.plus(outstanding);
  }

  const portfolioAtRiskPercent = totalOutstanding.greaterThan(0)
    ? atRiskOutstanding.dividedBy(totalOutstanding).times(100).toDecimalPlaces(1).toNumber()
    : 0;

  return {
    totalDisbursedBirr: totalDisbursed.toFixed(2),
    totalCollectedBirr: totalCollected.toFixed(2),
    totalOutstandingBirr: totalOutstanding.toFixed(2),
    portfolioAtRiskPercent,
    loanCount: rows.length,
    countByStatus,
  };
}

export async function getLoanList(lenderId: string): Promise<LoanRow[]> {
  return getLoanRows(lenderId);
}

export interface LoanDetail {
  driverId: string;
  name: string;
  phone: string;
  active: boolean;
  termMonths: number;
  cadence: string;
  status: LoanStatus;
  summary: MfiSummary;
  ledger: LenderLedgerEntry[];
}

export interface LenderLedgerEntry {
  periodIndex: number;
  periodStart: Date;
  periodEnd: Date;
  saccoFixedInstallment: Decimal;
  saccoPaymentDue: Decimal;
  saccoPaymentPaid: Decimal;
  arrearsCarriedIn: Decimal;
  arrearsCarriedOut: Decimal;
}

// Explicit select — deliberately never reuses getDriverLedger (settlement-service.ts), which
// returns full rows including toloCut/earnings/takeHome. Selecting only these fields means the
// sensitive columns never exist in memory for an MFI-scoped request at all.
export function getLenderLedger(driverId: string): Promise<LenderLedgerEntry[]> {
  return db.settlement.findMany({
    where: { driverId, status: "ACTIVE" },
    select: {
      periodIndex: true,
      periodStart: true,
      periodEnd: true,
      saccoFixedInstallment: true,
      saccoPaymentDue: true,
      saccoPaymentPaid: true,
      arrearsCarriedIn: true,
      arrearsCarriedOut: true,
    },
    orderBy: { periodIndex: "asc" },
  });
}

export async function getLoanDetail(lenderId: string, driverId: string): Promise<LoanDetail> {
  await assertDriverBelongsToLender(lenderId, driverId);

  const [driver, settings, ledger] = await Promise.all([
    db.driver.findUniqueOrThrow({ where: { id: driverId } }),
    getGlobalSettings(),
    getLenderLedger(driverId),
  ]);

  const config = getEffectiveConfig(driver, settings);
  const paidSoFar = ledger.reduce((sum, s) => sum.plus(s.saccoPaymentPaid), new Decimal(0));
  const summary = computeMfiSummaryFromValues(driver, config, paidSoFar);
  const latestArrearsCarriedOut = ledger.length > 0 ? new Decimal(ledger.at(-1)!.arrearsCarriedOut) : new Decimal(0);
  const status = deriveLoanStatus(summary, latestArrearsCarriedOut);

  return {
    driverId: driver.id,
    name: driver.name,
    phone: driver.phone,
    active: driver.active,
    termMonths: driver.termMonths,
    cadence: driver.cadence,
    status,
    summary,
    ledger,
  };
}
