import type { Decimal } from "@prisma/client-runtime-utils";
import type { Prisma, NotificationType } from "@prisma/client";

const PERCENT_MILESTONES: { type: NotificationType; fraction: number }[] = [
  { type: "MILESTONE_25", fraction: 0.25 },
  { type: "MILESTONE_50", fraction: 0.5 },
  { type: "MILESTONE_75", fraction: 0.75 },
  { type: "MILESTONE_100", fraction: 1.0 },
];

function messageFor(type: NotificationType): string {
  switch (type) {
    case "MILESTONE_25":
      return "You've recovered 25% of Tolo's contribution.";
    case "MILESTONE_50":
      return "You've recovered 50% of Tolo's contribution.";
    case "MILESTONE_75":
      return "You've recovered 75% of Tolo's contribution.";
    case "MILESTONE_100":
      return "You've fully recovered Tolo's contribution!";
    case "TOLO_TARGET_REACHED":
      return "Tolo's target has been reached. Tolo will no longer take a cut from your earnings.";
    case "SETTLEMENT_PROCESSED":
      return "Your latest settlement has been processed.";
  }
}

/**
 * Fires only for thresholds newly crossed by this settlement (before -> after).
 * Corrections that lower a driver's cumulative recovered amount never retract
 * previously-sent notifications — history of what a driver was told stays intact.
 */
export async function detectAndCreateMilestoneNotifications(
  tx: Prisma.TransactionClient,
  driverId: string,
  toloTargetBirr: Decimal,
  before: Decimal,
  after: Decimal
) {
  const toCreate: { type: NotificationType; message: string }[] = [];

  for (const milestone of PERCENT_MILESTONES) {
    const threshold = toloTargetBirr.times(milestone.fraction);
    if (before.lessThan(threshold) && after.greaterThanOrEqualTo(threshold)) {
      toCreate.push({ type: milestone.type, message: messageFor(milestone.type) });
    }
  }

  if (before.lessThan(toloTargetBirr) && after.greaterThanOrEqualTo(toloTargetBirr)) {
    toCreate.push({ type: "TOLO_TARGET_REACHED", message: messageFor("TOLO_TARGET_REACHED") });
  }

  for (const notification of toCreate) {
    await tx.notification.create({
      data: { driverId, type: notification.type, message: notification.message },
    });
  }
}

export async function createSettlementProcessedNotification(
  tx: Prisma.TransactionClient,
  driverId: string
) {
  await tx.notification.create({
    data: {
      driverId,
      type: "SETTLEMENT_PROCESSED",
      message: messageFor("SETTLEMENT_PROCESSED"),
    },
  });
}
