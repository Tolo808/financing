import { NextRequest, NextResponse } from "next/server";
import { Decimal } from "@prisma/client-runtime-utils";
import { requireDriverAuth, AuthError } from "@/server/auth/driver-auth";
import { db } from "@/server/db";
import { getEffectiveConfig } from "@/server/services/effective-config";
import { computeMfiSummary } from "@/server/services/mfi-summary";

const CADENCE_DAYS: Record<string, number> = { DAILY: 1, WEEKLY: 7, MONTHLY: 30 };

export async function GET(request: NextRequest) {
  try {
    const driverId = await requireDriverAuth(request);
    const driver = await db.driver.findUniqueOrThrow({ where: { id: driverId } });
    const settings = await db.globalSettings.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton" },
    });
    const config = getEffectiveConfig(driver, settings);

    const recentSettlements = await db.settlement.findMany({
      where: { driverId, status: "ACTIVE" },
      orderBy: { periodIndex: "desc" },
      take: 6,
    });

    const latest = recentSettlements[0] ?? null;
    const recoveredAfter = latest ? new Decimal(latest.cumulativeToloRecoveredAfter) : new Decimal(0);
    const target = config.toloTargetBirr;
    const remaining = Decimal.max(new Decimal(0), target.minus(recoveredAfter));
    const percent = target.greaterThan(0)
      ? recoveredAfter.dividedBy(target).times(100).toDecimalPlaces(1).toNumber()
      : 100;

    const avgToloCut =
      recentSettlements.length > 0
        ? recentSettlements
            .reduce((sum, s) => sum.plus(s.toloCut), new Decimal(0))
            .dividedBy(recentSettlements.length)
        : new Decimal(0);

    const estimatedPeriodsRemaining = avgToloCut.greaterThan(0)
      ? remaining.dividedBy(avgToloCut).ceil().toNumber()
      : null;

    const cadenceDays = CADENCE_DAYS[driver.cadence];
    const estimatedCompletionDate =
      estimatedPeriodsRemaining !== null
        ? new Date(Date.now() + estimatedPeriodsRemaining * cadenceDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

    const mfi = await computeMfiSummary(driver, config);

    return NextResponse.json({
      recovery: {
        recoveredBirr: recoveredAfter.toFixed(2),
        targetBirr: target.toFixed(2),
        remainingBirr: remaining.toFixed(2),
        percent,
        estimatedPeriodsRemaining,
        estimatedCompletionDate,
      },
      mfi,
      currentPeriod: latest
        ? {
            periodIndex: latest.periodIndex,
            periodStart: latest.periodStart,
            periodEnd: latest.periodEnd,
            earnings: latest.earnings.toFixed(2),
            toloCut: latest.toloCut.toFixed(2),
            saccoPaymentPaid: latest.saccoPaymentPaid.toFixed(2),
            takeHome: latest.takeHome.toFixed(2),
            arrearsCarriedOut: latest.arrearsCarriedOut.toFixed(2),
          }
        : null,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    throw error;
  }
}
