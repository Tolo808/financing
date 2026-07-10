import { Decimal } from "@prisma/client-runtime-utils";
import { db, TX_OPTS } from "@/server/db";
import { getEffectiveConfig } from "./effective-config";
import { recalculateSequence, type ExistingPeriod } from "@/server/finance/recalculate-sequence";
import { writeAuditLog } from "./audit-service";
import {
  detectAndCreateMilestoneNotifications,
  createSettlementProcessedNotification,
} from "./notification-service";
import { toJsonSafe } from "@/lib/decimal";

export interface RecordSettlementInput {
  driverId: string;
  periodIndex: number;
  periodStart: string;
  periodEnd: string;
  earnings: number;
}

export async function recordOrCorrectSettlement(input: RecordSettlementInput, actorAdminId: string) {
  return db.$transaction(async (tx) => {
    const driver = await tx.driver.findUniqueOrThrow({ where: { id: input.driverId } });
    const settings = await tx.globalSettings.findUniqueOrThrow({ where: { id: "singleton" } });
    const config = getEffectiveConfig(driver, settings);

    const existingActive = await tx.settlement.findMany({
      where: { driverId: input.driverId, status: "ACTIVE" },
      orderBy: { periodIndex: "asc" },
    });
    const existingByPeriod = new Map(existingActive.map((s) => [s.periodIndex, s]));
    const isCorrection = existingByPeriod.has(input.periodIndex);

    const priorPeriod = existingActive
      .filter((s) => s.periodIndex < input.periodIndex)
      .at(-1);
    const seed = priorPeriod
      ? {
          cumulativeToloRecoveredBefore: new Decimal(priorPeriod.cumulativeToloRecoveredAfter),
          arrearsCarriedIn: new Decimal(priorPeriod.arrearsCarriedOut),
        }
      : { cumulativeToloRecoveredBefore: new Decimal(0), arrearsCarriedIn: new Decimal(0) };

    const tailPeriods: ExistingPeriod[] = existingActive
      .filter((s) => s.periodIndex >= input.periodIndex)
      .map((s) => ({
        periodIndex: s.periodIndex,
        earnings: s.periodIndex === input.periodIndex ? new Decimal(input.earnings) : new Decimal(s.earnings),
      }));
    if (!isCorrection) {
      tailPeriods.push({ periodIndex: input.periodIndex, earnings: new Decimal(input.earnings) });
      tailPeriods.sort((a, b) => a.periodIndex - b.periodIndex);
    }

    const results = recalculateSequence(tailPeriods, config, seed);

    for (const result of results) {
      const existing = existingByPeriod.get(result.periodIndex);
      const isTarget = result.periodIndex === input.periodIndex;

      const periodStart = isTarget ? new Date(input.periodStart) : existing!.periodStart;
      const periodEnd = isTarget ? new Date(input.periodEnd) : existing!.periodEnd;

      if (existing) {
        await tx.settlement.update({ where: { id: existing.id }, data: { status: "SUPERSEDED" } });
      }

      const created = await tx.settlement.create({
        data: {
          driverId: input.driverId,
          lenderId: driver.lenderId,
          periodIndex: result.periodIndex,
          periodStart,
          periodEnd,
          earnings: result.earnings,
          toloRatePercentApplied: result.toloRatePercentApplied,
          toloCut: result.toloCut,
          saccoFixedInstallment: result.saccoFixedInstallment,
          saccoPaymentDue: result.saccoPaymentDue,
          saccoPaymentPaid: result.saccoPaymentPaid,
          arrearsCarriedIn: result.arrearsCarriedIn,
          arrearsCarriedOut: result.arrearsCarriedOut,
          cumulativeToloRecoveredBefore: result.cumulativeToloRecoveredBefore,
          cumulativeToloRecoveredAfter: result.cumulativeToloRecoveredAfter,
          takeHome: result.takeHome,
          status: "ACTIVE",
          supersedesId: existing?.id ?? null,
          createdByAdminId: actorAdminId,
        },
      });

      await writeAuditLog(tx, {
        entityType: "Settlement",
        entityId: created.id,
        action: !existing ? "CREATE" : isTarget ? "CORRECT" : "CASCADE_RECALC",
        beforeJson: existing ? toJsonSafe(existing) : null,
        afterJson: toJsonSafe(created),
        actorType: "ADMIN",
        actorAdminId,
      });

      await detectAndCreateMilestoneNotifications(
        tx,
        input.driverId,
        config.toloTargetBirr,
        result.cumulativeToloRecoveredBefore,
        result.cumulativeToloRecoveredAfter
      );
    }

    await createSettlementProcessedNotification(tx, input.driverId);

    return tx.settlement.findMany({
      where: { driverId: input.driverId, status: "ACTIVE" },
      orderBy: { periodIndex: "asc" },
    });
  }, TX_OPTS);
}

// Only the latest period can be deleted — removing a middle period would require re-deriving
// every later period's cumulative/arrears figures (the same cascade recalculateSequence does for
// corrections), which isn't well-defined for a hole in the sequence. The row itself is never
// physically deleted, just marked SUPERSEDED (with no replacement), so it stays in the audit
// trail — consistent with the rest of the ledger's append-only design.
export async function deleteLatestSettlement(driverId: string, actorAdminId: string) {
  return db.$transaction(async (tx) => {
    const latest = await tx.settlement.findFirst({
      where: { driverId, status: "ACTIVE" },
      orderBy: { periodIndex: "desc" },
    });
    if (!latest) {
      throw new Error("No settlement to delete");
    }

    const updated = await tx.settlement.update({
      where: { id: latest.id },
      data: { status: "SUPERSEDED" },
    });

    await writeAuditLog(tx, {
      entityType: "Settlement",
      entityId: latest.id,
      action: "DELETE",
      beforeJson: toJsonSafe(latest),
      afterJson: toJsonSafe(updated),
      actorType: "ADMIN",
      actorAdminId,
    });

    return updated;
  }, TX_OPTS);
}

export function getDriverLedger(driverId: string, includeSuperseded = false) {
  return db.settlement.findMany({
    where: includeSuperseded ? { driverId } : { driverId, status: "ACTIVE" },
    orderBy: [{ periodIndex: "asc" }, { createdAt: "asc" }],
  });
}
