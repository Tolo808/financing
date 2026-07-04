import { Decimal } from "@prisma/client-runtime-utils";
import { db } from "@/server/db";
import { recordOrCorrectSettlement } from "./settlement-service";
import { writeAuditLog } from "./audit-service";
import { toJsonSafe } from "@/lib/decimal";

export interface RecordCashCollectionInput {
  driverId: string;
  date: string; // "YYYY-MM-DD"
  tierCounts: Record<string, number>;
  collectedBirr: number;
  depositStatus: "PENDING" | "DEPOSITED";
}

function parseDateOnly(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

/**
 * Records (or corrects) a driver's daily cash collection: computes TOTAL from the price-tier
 * order counts, feeds COLLECTED into the existing, already-tested settlement engine as that
 * day's `earnings` (via `recordOrCorrectSettlement`, unchanged), then links a CashCollectionEntry
 * row to the resulting settlement for the tier/deposit-status bookkeeping the split itself
 * doesn't need. UNCOLLECTED is tracked here only — it never feeds the Tolo/SACCo split.
 */
export async function recordCashCollection(input: RecordCashCollectionInput, actorAdminId: string) {
  const dateOnly = parseDateOnly(input.date);

  const settings = await db.globalSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
  const priceTiers = settings.priceTiers as unknown as number[];

  let totalBirr = new Decimal(0);
  for (const price of priceTiers) {
    const count = input.tierCounts[String(price)] ?? 0;
    totalBirr = totalBirr.plus(new Decimal(price).times(count));
  }

  const collectedBirr = new Decimal(input.collectedBirr);
  if (collectedBirr.greaterThan(totalBirr)) {
    throw new Error(
      `Collected amount (${collectedBirr.toFixed(2)} Birr) cannot exceed the computed total ` +
        `(${totalBirr.toFixed(2)} Birr) — check the order counts entered for each price tier.`
    );
  }
  const uncollectedBirr = totalBirr.minus(collectedBirr);

  const existingEntry = await db.cashCollectionEntry.findUnique({
    where: { driverId_date: { driverId: input.driverId, date: dateOnly } },
  });

  let periodIndex: number;
  if (existingEntry?.settlementId) {
    const settlement = await db.settlement.findUnique({ where: { id: existingEntry.settlementId } });
    if (!settlement) {
      throw new Error("Existing cash collection entry has no linked settlement");
    }
    periodIndex = settlement.periodIndex;
  } else {
    const latestEntry = await db.cashCollectionEntry.findFirst({
      where: { driverId: input.driverId },
      orderBy: { date: "desc" },
    });
    if (latestEntry && dateOnly.getTime() <= latestEntry.date.getTime()) {
      throw new Error(
        "Cannot add a date at or before this driver's most recent cash collection entry — correct that date instead, or add dates in chronological order."
      );
    }
    const maxPeriod = await db.settlement.aggregate({
      where: { driverId: input.driverId, status: "ACTIVE" },
      _max: { periodIndex: true },
    });
    periodIndex = (maxPeriod._max.periodIndex ?? 0) + 1;
  }

  const periodEnd = new Date(`${input.date}T23:59:59.999Z`);

  const ledger = await recordOrCorrectSettlement(
    {
      driverId: input.driverId,
      periodIndex,
      periodStart: dateOnly.toISOString(),
      periodEnd: periodEnd.toISOString(),
      earnings: collectedBirr.toNumber(),
    },
    actorAdminId
  );

  const activeSettlement = ledger.find((s) => s.periodIndex === periodIndex);
  if (!activeSettlement) {
    throw new Error("Failed to resolve the settlement created for this cash collection entry");
  }

  const entry = await db.cashCollectionEntry.upsert({
    where: { driverId_date: { driverId: input.driverId, date: dateOnly } },
    update: {
      tierCounts: input.tierCounts,
      totalBirr: totalBirr.toFixed(2),
      collectedBirr: collectedBirr.toFixed(2),
      uncollectedBirr: uncollectedBirr.toFixed(2),
      depositStatus: input.depositStatus,
      settlementId: activeSettlement.id,
    },
    create: {
      driverId: input.driverId,
      date: dateOnly,
      tierCounts: input.tierCounts,
      totalBirr: totalBirr.toFixed(2),
      collectedBirr: collectedBirr.toFixed(2),
      uncollectedBirr: uncollectedBirr.toFixed(2),
      depositStatus: input.depositStatus,
      settlementId: activeSettlement.id,
      createdByAdminId: actorAdminId,
    },
  });

  await writeAuditLog(db, {
    entityType: "CashCollectionEntry",
    entityId: entry.id,
    action: existingEntry ? "UPDATE" : "CREATE",
    beforeJson: existingEntry ? toJsonSafe(existingEntry) : null,
    afterJson: toJsonSafe(entry),
    actorType: "ADMIN",
    actorAdminId,
  });

  return entry;
}

export async function getCashCollectionEntriesForDate(date: string) {
  const dateOnly = parseDateOnly(date);
  return db.cashCollectionEntry.findMany({
    where: { date: dateOnly },
    include: { driver: { select: { id: true, name: true, phone: true } } },
    orderBy: { createdAt: "asc" },
  });
}
